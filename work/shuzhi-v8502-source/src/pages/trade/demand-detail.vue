<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { villageDemands } from "@/mock/products";
import { useUserStore } from "@/store/user";
import { useTradeStore } from "@/store/trade";
import { acceptDemandQuote, createTradeOrder, getPurchaseDemands, type LocalPurchaseDemand } from "@/services/localApi";

const user = useUserStore();
const trade = useTradeStore();
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const d = ref<any>(productionBuild ? {} : villageDemands[0]);
const isMine = ref(false);
const remoteDemand = ref(false);
const ready = ref(!productionBuild);
const loading = ref(false);
const loadError = ref("");

function mapRemoteDemand(item: LocalPurchaseDemand) {
  return {
    ...item,
    addr: item.destination,
    deadline: item.delivery_window,
    qty: `${item.qty} ${item.unit}`,
    budget: item.budget_max == null ? "按需求议价" : `≤ ${item.budget_max} 元/${item.unit}`,
    quotes: item.quote_count,
    pic: "/static/products/p12.jpg",
    items: [],
    quotes_detail: item.quotes || [],
  };
}

onLoad(async (q) => {
  if (productionBuild) {
    loading.value = true;
    try {
      const rows = await getPurchaseDemands();
      const found = rows.find((item) => item.id === String(q?.id || ""));
      if (!found) throw new Error("该采购需求不存在、已关闭或当前主体无权查看");
      d.value = mapRemoteDemand(found);
      remoteDemand.value = true;
      isMine.value = user.roleKey === "buyer";
      ready.value = true;
    } catch (error: any) { loadError.value = error?.message || "后台采购需求暂不可读，请先登录授权"; }
    finally { loading.value = false; }
    return;
  }
  const mine = trade.findDemand(q?.id || "");
  if (mine) { d.value = mine; isMine.value = true; return; }
  const f = villageDemands.find((x) => x.id === q?.id); if (f) d.value = f;
  try {
    const rows = await getPurchaseDemands();
    const found = rows.find((item) => item.id === q?.id);
    if (found) {
      d.value = mapRemoteDemand(found);
      remoteDemand.value = true;
      // 后台已按主体过滤需求；采购角色看到的即为可操作采购需求。
      isMine.value = user.roleKey === "buyer";
    }
  } catch {
    // 离线演示保留内置需求；正式环境不伪造后台报价。
  }
});

// 我发布的需求：按清单生成三家供应商报价
const baseAmount = computed(() => {
  const sub = (d.value.items || []).reduce((s: number, i: any) => s + (i.sub || 0), 0);
  return sub || 52000;
});
const quotes = computed(() => {
  if (remoteDemand.value) return (d.value.quotes_detail || []).map((q: any) => ({
    ...q,
    supplier: q.supplier_name || "已核验供货主体",
    star: 5,
    factor: 1,
    note: q.note || "后台已核验商品 · 报价已留痕",
    amount: Number(q.amount || 0),
  }));
  if (productionBuild) return [];
  return [
  { supplier: "红旗农批直供联营体", star: 5, factor: 1.0, note: "一级农批直采 · A级溯源" },
  { supplier: "武清蔬菜产销合作社", star: 5, factor: 0.97, note: "产地直供 · 保底品质" },
  { supplier: "冀农优选供应链", star: 4, factor: 1.04, note: "省级龙头 · 冷链配送" },
  ].map((q) => ({ ...q, amount: Math.round(baseAmount.value * q.factor) }));
});

async function order(qt: any) {
  if (!user.ensureTradeRole("选定报价并下单", "purchase")) return;
  uni.showModal({
    title: "确认下单", confirmText: "确认下单",
    content: `供应商：${qt.supplier}\n成交金额：¥${qt.amount.toLocaleString()}\n收货地：${d.value.addr}\n\n下单后生成电子合同并上链存证。`,
    success: async (r) => {
      if (!r.confirm) return;
      if (remoteDemand.value && qt.id) {
        try {
          if (qt.status === "submitted") await acceptDemandQuote(String(qt.id));
          const created = await createTradeOrder({ quote_id: String(qt.id), scene: "supplierDemand", items: [], delivery_window: d.value.deadline, settlement_model: "持牌机构条件结算（验收后分账）", invoice_type: "增值税专用发票" });
          d.value.ordered = true;
          d.value.status = "closed";
          uni.showModal({ title: "正式订单已生成", showCancel: false, confirmText: "查看订单", content: `订单 ${created.id} 已由后台生成，合同、支付、物流、验收、发票和结算将按状态闸门继续。`, success: () => uni.navigateTo({ url: `/pages/trade/order-detail?id=${encodeURIComponent(created.id)}` }) });
        } catch (error: any) {
          uni.showModal({ title: "后台未放行", showCancel: false, content: error?.message || "报价确认或正式下单失败，请检查主体授权和库存" });
        }
        return;
      }
      const oid = trade.placeOrder(d.value, qt.supplier, qt.amount);
      uni.showModal({
        title: "下单成功 · 待人工复核", showCancel: false, confirmText: "查看订单",
        content: `订单 ${oid} 已生成。\n⚠️ 自动生成订单需人工复核通过后，方可生成合同、付款、流转。\n去订单里点「人工复核通过」继续。`,
        success: () => uni.navigateTo({ url: `/pages/trade/order-detail?id=${oid}` }),
      });
    },
  });
}

function quote() {
  if (!user.ensureTradeRole("响应采购需求并报价", "supply")) return;
  if (remoteDemand.value) {
    uni.showModal({ title: "请在采购大厅批量报价", content: "正式采购需求必须先绑定已审核商品、库存和供货主体，再从采购大厅勾选需求提交报价。", showCancel: false });
    return;
  }
  uni.showModal({ title: "一键报价", content: `向「${d.value.buyer}」提交报价？`, confirmText: "提交报价",
    success: (r) => { if (r.confirm) uni.showToast({ title: "报价已提交", icon: "success" }); } });
}
function chat() { uni.navigateTo({ url: `/pages/trade/chat?to=${encodeURIComponent(d.value.buyer)}` }); }
function control() { uni.navigateTo({ url: "/pages/trade/control" }); }
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild && !ready" class="sg-card unavailable">
      <text class="unavailable-title">{{ loading ? '正在读取后台采购需求…' : '采购需求暂不可用' }}</text>
      <text class="unavailable-text">{{ loadError || '请从采购大厅选择已审核需求，或先完成登录授权。' }}</text>
    </view>
    <template v-else>
    <image class="hero" :src="d.pic" mode="aspectFill" />
    <view class="sg-card">
      <view class="tt-row"><text v-if="isMine" class="mine-tag">{{ d.ordered ? '已下单' : '我发布' }}</text><text class="title">{{ d.title }}</text></view>
      <view class="tags"><text class="tag">{{ d.category }}</text><text class="tag">{{ isMine ? (d.ordered ? '已成交' : quotes.length + ' 家报价') : d.quotes + ' 人报价' }}</text></view>
      <view class="rows">
        <view class="r"><text class="k">采购数量</text><text class="v">{{ d.qty }}</text></view>
        <view class="r"><text class="k">收货地</text><text class="v">{{ d.addr }}</text></view>
        <view class="r"><text class="k">截止时间</text><text class="v">{{ d.deadline }}</text></view>
        <view class="r"><text class="k">预算</text><text class="v sg-price">{{ d.budget }}</text></view>
        <view class="r"><text class="k">采购方</text><text class="v">{{ d.buyer }} <text class="ok">✔ 已认证</text></text></view>
      </view>
    </view>

    <view class="sg-card buyer-pass" @tap="control">
      <view class="sg-between">
        <view class="bp-head">
          <text class="bp-badge">采购方身份通行证</text>
          <text class="bp-org">{{ d.buyer }}</text>
        </view>
        <text class="bp-go">查看授权边界 ›</text>
      </view>
      <view class="bp-checks">
        <text>✓ 工商主体</text>
        <text>✓ 采购经办人授权</text>
        <text>✓ 对公付款账户</text>
        <text>✓ 额度未超限</text>
      </view>
      <text class="bp-note">采购需求固化采购范围、预算额度、收货主体、验收人和发票信息；选标人与付款复核人分岗。</text>
    </view>

    <!-- 我发布的：采购清单 -->
    <view v-if="isMine && d.items && d.items.length" class="sg-card">
      <text class="sec-t">📋 采购清单（{{ d.items.length }} 项）</text>
      <view class="li" v-for="i in d.items" :key="i.name">
        <text class="li-n">{{ i.name }}</text>
        <text class="li-s">{{ i.spec }}</text>
        <text v-if="i.sub" class="li-v">¥{{ i.sub.toLocaleString() }}</text>
      </view>
    </view>

    <!-- 我发布的：收到报价 → 下单闭环 -->
    <view v-if="isMine && !d.ordered" class="sg-card">
      <text class="sec-t">💬 收到供应商报价（择优下单）</text>
      <view class="q" v-for="qt in quotes" :key="qt.supplier">
        <view class="q-l">
          <text class="q-n">{{ qt.supplier }}</text>
          <text class="q-note">{{ '★'.repeat(qt.star) }} · {{ qt.note }}</text>
        </view>
        <view class="q-r">
          <text class="q-amt">¥{{ qt.amount.toLocaleString() }}</text>
          <view v-if="qt.status !== 'ordered'" class="q-btn" @tap="order(qt)">{{ qt.status === 'accepted' ? '确认生成订单' : '选此报价下单' }}</view>
          <text v-else class="q-state">已生成订单</text>
        </view>
      </view>
    </view>

    <view v-if="isMine && d.ordered" class="done">✅ 该需求已下单成交，可在「我的订单」查看闭环状态。</view>

    <!-- 供应商视角：报价 -->
    <view v-if="!isMine" class="bar">
      <view class="bar-btn ghost" @tap="chat">💬 联系采购方</view>
      <view class="bar-btn" @tap="quote">一键报价</view>
    </view>
    <view v-else class="pad"></view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hero { width: 100%; height: 380rpx; display: block; background: $sg-primary-light; }
.tt-row { display: flex; align-items: center; }
.mine-tag { font-size: 19rpx; color: #fff; background: $sg-primary; padding: 3rpx 14rpx; border-radius: 6rpx; margin-right: 12rpx; flex-shrink: 0; }
.title { font-size: 32rpx; font-weight: 700; }
.tags { display: flex; margin: 12rpx 0; }
.tag { font-size: 20rpx; color: $sg-primary; background: $sg-primary-light; padding: 4rpx 14rpx; border-radius: 6rpx; margin-right: 10rpx; }
.r { display: flex; padding: 16rpx 0; border-top: 2rpx solid $sg-border; }
.k { width: 160rpx; color: $sg-text-3; font-size: 26rpx; }
.v { flex: 1; font-size: 26rpx; }
.ok { color: $sg-primary; }
.buyer-pass { background: linear-gradient(135deg, #eef6ff, #fff); border: 2rpx solid #d6e8fb; }
.bp-head { display: flex; flex-direction: column; }
.bp-badge { font-size: 19rpx; color: #fff; background: $sg-blue; padding: 4rpx 12rpx; border-radius: 6rpx; align-self: flex-start; }
.bp-org { font-size: 27rpx; font-weight: 800; margin-top: 8rpx; }
.bp-go { font-size: 21rpx; color: $sg-blue; }
.bp-checks { display: flex; flex-wrap: wrap; gap: 9rpx; margin-top: 15rpx; }
.bp-checks text { font-size: 19rpx; color: #244d6d; background: #eef6ff; padding: 6rpx 11rpx; border-radius: 6rpx; }
.bp-note { display: block; margin-top: 13rpx; font-size: 20rpx; color: $sg-text-2; line-height: 1.55; }
.sec-t { font-size: 28rpx; font-weight: 700; display: block; margin-bottom: 12rpx; }
.li { display: flex; align-items: center; padding: 12rpx 0; border-top: 2rpx solid $sg-bg; }
.li-n { flex: 1.2; font-size: 25rpx; font-weight: 600; }
.li-s { flex: 1; font-size: 23rpx; color: $sg-text-2; }
.li-v { font-size: 23rpx; color: $sg-red; }
.q { display: flex; align-items: center; justify-content: space-between; padding: 18rpx 0; border-top: 2rpx solid $sg-border; }
.q-l { flex: 1; display: flex; flex-direction: column; }
.q-n { font-size: 26rpx; font-weight: 700; }
.q-note { font-size: 20rpx; color: $sg-gold; margin-top: 4rpx; }
.q-r { display: flex; flex-direction: column; align-items: flex-end; }
.q-amt { font-size: 28rpx; font-weight: 800; color: $sg-red; }
.q-btn { margin-top: 8rpx; padding: 12rpx 24rpx; border-radius: 999rpx; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; font-size: 22rpx; font-weight: 600; }
.q-state { margin-top: 12rpx; color: $sg-primary; font-size: 22rpx; }
.done { margin: 20rpx 24rpx; padding: 22rpx; background: $sg-primary-light; border-radius: $sg-radius; font-size: 24rpx; color: $sg-primary-deep; text-align: center; }
.pad { height: 40rpx; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; display: flex; gap: 20rpx; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.05); }
.bar-btn { flex: 1; text-align: center; padding: 24rpx 0; border-radius: 999rpx; font-size: 30rpx; font-weight: 700; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; }
.bar-btn.ghost { flex: 0 0 42%; background: $sg-primary-light; color: $sg-primary; }
.unavailable { margin-top: 28rpx; text-align: center; padding: 54rpx 28rpx; }
.unavailable-title { display: block; font-size: 30rpx; font-weight: 800; color: $sg-text; }
.unavailable-text { display: block; margin-top: 14rpx; font-size: 23rpx; line-height: 1.6; color: $sg-text-3; }
</style>
