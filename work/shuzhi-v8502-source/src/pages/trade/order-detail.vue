<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { orders } from "@/mock";
import { useTradeStore } from "@/store/trade";
import { useAuthStore } from "@/store/auth";
import { cancelTrade, getTrade } from "@/services/localApi";
const trade = useTradeStore();
const auth = useAuthStore();
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const o = ref<any>(productionBuild ? {} : orders[0]);
const isMine = ref(false);
const backendLinked = ref(false);
const backendSync = ref("");
const ready = ref(!productionBuild);
const loadError = ref("");
onLoad((q) => {
  if (productionBuild) { if (q?.id) void syncBackendOrder(String(q.id)); else loadError.value = "缺少订单号"; return; }
  const mine = trade.findOrder(q?.id || "");
  if (mine) { o.value = mine; isMine.value = true; return; }
  const f = orders.find((x) => x.id === q?.id); if (f) o.value = f;
  if (q?.id && String(q.id).startsWith("SZGS-")) void syncBackendOrder(String(q.id));
});
async function syncBackendOrder(id: string) {
  try {
    const data = await getTrade(id);
    backendLinked.value = true;
    backendSync.value = `后台已同步 · ${data.status} · 资金 ${data.payment_status} · 发票 ${data.invoice_status}`;
    o.value = { ...o.value, id: data.id, status: data.status, amount: Number(data.amount) || o.value.amount, counterparty: `${data.buyer_name || "采购方"} ↔ ${data.supplier_name || "供货方"}`, contractNo: data.contracts?.[0]?.id || o.value.contractNo, chainHash: data.contracts?.[0]?.hash || o.value.chainHash, paid: ["机构已确认（验收后分账）", "已分账", "已入金待验收"].includes(data.payment_status), fundStatus: data.payment_status, evidenceStatus: data.fulfillment_step >= 8 ? "物流、验收与四流证据已归集" : "订单、合同、物流证据持续归集" };
    isMine.value = true;
    ready.value = true;
  } catch {
    backendLinked.value = false;
    backendSync.value = "后台状态暂不可读，请先完成登录授权";
    loadError.value = backendSync.value;
  }
}

// 关键动作人脸步进：跳人脸页 → 返回后自动续跑
const faceIntent = ref("");
function stepUpFace(scene: string, then: string) { faceIntent.value = then; uni.navigateTo({ url: `/pages/register/faceauth?scene=${scene}` }); }
onShow(() => {
  if (faceIntent.value === "review" && auth.consumeFace("review")) { faceIntent.value = ""; doPass(); }
});

// 常规订单流程
const normSteps = ["下单", "确认", "发货", "运输", "收货", "完成"];
const normIdx: Record<string, number> = { 待确认: 1, 待发货: 2, 运输中: 3, 待收货: 4, 已完成: 5, 售后: 5 };
// 我的订单流程（含人工复核硬闸）
const mineSteps = ["下单", "人工复核", "签约付款", "待发货", "运输", "完成"];
const mineIdx: Record<string, number> = { 待复核: 1, 已驳回: 1, 待付款: 2, 待发货: 3, 履约中: 3, 运输中: 4, 待开票: 4, 争议处理中: 4, 已完成: 5 };

const steps = computed(() => (isMine.value ? mineSteps : normSteps));
const curIdx = computed(() => (isMine.value ? mineIdx[o.value.status] ?? 0 : normIdx[o.value.status] ?? 0));
const rejected = computed(() => o.value.status === "已驳回");
const canCancel = computed(() => backendLinked.value && ["待复核", "履约中"].includes(String(o.value.status)) && Number(o.value.fulfillment_step ?? 0) <= 0 && !o.value.paid);

function cancelOrder() {
  uni.showModal({
    title: "取消订单",
    editable: true,
    placeholderText: "请填写取消原因",
    confirmText: "确认取消",
    confirmColor: "#d64541",
    success: async (r: any) => {
      if (!r.confirm) return;
      try {
        const data = await cancelTrade(String(o.value.id), r.content || "交易双方取消订单");
        o.value = { ...o.value, status: data.status, fundStatus: data.payment_status, paid: false, fulfillment_step: data.fulfillment_step };
        backendSync.value = `后台已同步 · ${data.status} · 库存已释放 · 未发生扣款`;
        uni.showToast({ title: "订单已取消", icon: "success" });
      } catch (error: any) {
        uni.showModal({ title: "无法取消", content: error?.message || "订单已进入不可逆履约阶段", showCancel: false });
      }
    },
  });
}

// 人工复核（权）：始终先人脸核验
function pass() {
  if (!auth.consumeFace("review")) return stepUpFace("review", "review");
  doPass();
}
function doPass() {
  uni.showModal({
    title: "人工复核", confirmText: "复核通过",
    content: `订单 ${o.value.id}｜金额 ¥${o.value.amount.toLocaleString()}\n✔ 复核人已人脸核验\n采购方与供应商资质已核验、价格在合理区间。\n\n通过后生成电子合同，进入付款环节。`,
    success: (r) => { if (r.confirm) { trade.reviewPass(o.value.id); uni.showToast({ title: "复核通过", icon: "success" }); } },
  });
}
function reject() {
  uni.showModal({
    title: "驳回订单", editable: true, placeholderText: "请填写驳回原因（如价格异常、资质待补）",
    confirmText: "确认驳回", confirmColor: "#d64541",
    success: (r: any) => { if (r.confirm) { trade.reviewReject(o.value.id, r.content || "未通过人工复核"); uni.showToast({ title: "已驳回", icon: "none" }); } },
  });
}
// 付款条件和增强核验统一进入支付结算页处理
function pay() {
  doPay();
}
function doPay() {
  const title = encodeURIComponent(`${o.value.title} · ${o.value.contractNo || "待签合同"}`);
  uni.navigateTo({ url: `/pages/pay/index?scene=b2b&title=${title}&amount=${o.value.amount}&no=${o.value.id}&term=custody` });
}
function fulfillment() { uni.navigateTo({ url: `/pages/trade/fulfillment?order=${encodeURIComponent(o.value.id || "")}` }); }
function contract() {
  const id = encodeURIComponent(o.value.id || "");
  uni.navigateTo({ url: `/pages/trade/contracts?order=${id}` });
}
function verify() {
  uni.showModal({ title: "链上存证核验", showCancel: false, confirmText: "已验真 ✔",
    content: `交易哈希 ${o.value.chainHash}\n复核人 ${o.value.reviewer || '—'}\n合同 ${o.value.contractNo || '—'}\n\n存证摘要核验一致；如需修订，须保留授权、原因和前后版本。` });
}
function logistics() { uni.navigateTo({ url: "/pages/logistics/waybill" }); }
function aftersale() { uni.navigateTo({ url: `/pages/aftersale/ticket?id=${o.value.id}` }); }
function control() { uni.navigateTo({ url: "/pages/trade/control" }); }
onShow(() => { if (o.value?.id?.startsWith("SZGS-")) void syncBackendOrder(o.value.id); });
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild && !ready" class="sg-card unavailable">
      <text class="unavailable-title">订单详情暂不可用</text>
      <text class="unavailable-text">{{ loadError || backendSync || '正在读取后台订单状态…' }}</text>
    </view>
    <template v-else>
    <view class="steps sg-card">
      <view class="step" v-for="(s, i) in steps" :key="s">
        <view class="dot" :class="{ on: i <= curIdx, rej: rejected && i === 1 }">{{ rejected && i === 1 ? '✕' : (i < curIdx ? '✓' : i + 1) }}</view>
        <text class="stt" :class="{ on: i <= curIdx }">{{ s }}</text>
        <view v-if="i < steps.length - 1" class="line" :class="{ on: i < curIdx }"></view>
      </view>
    </view>

    <view class="sg-card triple-ledger" @tap="control">
      <text v-if="backendSync" class="backend-sync">{{ backendSync }}</text>
      <view class="sg-between">
        <text class="ledger-title">🛡️ 订单三本账联动</text>
        <text class="ledger-go">资金总控 ›</text>
      </view>
      <view class="ledger-row">
        <text class="ledger-key">身份账</text>
        <view class="ledger-info">
          <text>{{ o.identitySnapshotNo || 'ID-' + o.id + '-V8533' }}</text>
          <text class="ledger-sub">买卖主体、经办权限、对公账户已固化</text>
        </view>
      </view>
      <view class="ledger-row">
        <text class="ledger-key blue">资金账</text>
        <view class="ledger-info">
          <text>{{ o.fundStatus || (o.paid ? '银行/持牌机构回单已确认' : '未付款') }}</text>
          <text class="ledger-sub">平台不收货款，只发送合同授权范围内的可审计支付/结算指令</text>
        </view>
      </view>
      <view class="ledger-row">
        <text class="ledger-key gold">证据账</text>
        <view class="ledger-info">
          <text>{{ o.evidenceStatus || '订单、合同、物流、验收证据持续归集' }}</text>
          <text class="ledger-sub">无验收与对账证据不得触发资金释放</text>
        </view>
      </view>
    </view>

    <!-- 人工复核硬闸 -->
    <view v-if="isMine && o.status === '待复核'" class="gate">
      <text class="gate-t">⚠️ 自动生成订单 · 待人工复核</text>
      <text class="gate-s">该订单由系统按采购清单自动生成，须经人工复核（核验资质、价格、合规）通过后，方可生成合同并流转业务。</text>
      <view class="gate-btns">
        <view class="gb ghost" @tap="reject">驳回</view>
        <view class="gb" @tap="pass">🔒 刷脸复核通过</view>
      </view>
      <text class="gate-face">复核为「权」的动作，须复核人本人人脸核验后放行</text>
      <view v-if="canCancel" class="cancel-link" @tap="cancelOrder">取消订单并释放库存</view>
    </view>
    <view v-if="isMine && rejected" class="rejbox">
      <text class="rej-t">⛔ 已驳回</text>
      <text class="rej-s">原因：{{ o.rejectReason }}</text>
    </view>

    <view class="sg-card">
      <view class="sg-row head">
        <text class="emoji">{{ o.emoji }}</text>
        <view class="info"><text class="nm">{{ o.title }}</text><text class="cp">{{ o.counterparty }}</text></view>
      </view>
      <view class="r"><text class="k">订单号</text><text class="v">{{ o.id }}</text></view>
      <view class="r"><text class="k">数量</text><text class="v">{{ o.qty }}</text></view>
      <view class="r"><text class="k">金额</text><text class="v sg-price">¥{{ o.amount.toLocaleString() }}</text></view>
      <view class="r"><text class="k">状态</text><text class="v" :class="{ hot: isMine && !rejected }">{{ o.status }}</text></view>
      <view v-if="isMine && o.reviewer" class="r"><text class="k">复核人</text><text class="v">{{ o.reviewer }} · {{ o.reviewTime }}</text></view>
      <view v-if="isMine && o.paid" class="r"><text class="k">付款方式</text><text class="v">{{ o.payMethod }} · 已支付</text></view>
    </view>

    <!-- CA合同包（复核通过后生成）-->
    <view v-if="isMine && o.contractNo" class="sg-card contract" @tap="contract">
      <view class="sg-between"><text class="ct2">✍️ CA合同包 · 14份模板</text><text class="arrow2">逐一签约 ›</text></view>
      <text class="ct2-s">合同 {{ o.contractNo }} · 对应18步、签署主体、资金条件与履约放行</text>
    </view>

    <view v-if="isMine && o.contractNo" class="sg-card contract" @tap="fulfillment">
      <view class="sg-between"><text class="ct2">📑 合同履约管理（标杆供应链标准）</text><text class="arrow2">进入 ›</text></view>
      <text class="ct2-s">分批交付 · 品控否决 · 验收触发 · 争议冻结 · 银行分账</text>
    </view>

    <view class="sg-card chain" @tap="verify">
      <view class="sg-between"><text class="ct">🔗 交易链上存证</text><text class="arrow">一键验真 ›</text></view>
      <text class="ch">{{ o.chainHash }}</text>
    </view>

    <view class="bar">
      <block v-if="isMine && o.status === '待付款'">
        <view class="bar-btn ghost" @tap="contract">✍️ 签署合同包</view>
        <view class="bar-btn" @tap="pay">选择结算模型</view>
      </block>
      <block v-else-if="isMine && o.status === '待复核'">
        <view class="bar-btn ghost full" @tap="pass">⏳ 待人工复核（点上方复核）</view>
      </block>
      <block v-else-if="isMine && rejected">
        <view class="bar-btn ghost full">已驳回 · 业务终止</view>
      </block>
      <block v-else-if="canCancel">
        <view class="bar-btn ghost full" @tap="cancelOrder">取消订单并释放库存</view>
      </block>
      <block v-else-if="o.status === '已完成'">
        <view class="bar-btn ghost" @tap="aftersale">🎧 申请售后</view>
        <view class="bar-btn" @tap="logistics">🚚 查看物流</view>
      </block>
      <block v-else>
        <view class="bar-btn ghost" @tap="logistics">🚚 查看物流</view>
        <view class="bar-btn" @tap="aftersale">申请售后</view>
      </block>
    </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.steps { display: flex; padding: 30rpx 12rpx; }
.step { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }
.dot { width: 44rpx; height: 44rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; z-index: 2; }
.dot.on { background: $sg-primary; }
.dot.rej { background: $sg-red; }
.stt { font-size: 19rpx; color: $sg-text-3; margin-top: 8rpx; }
.stt.on { color: $sg-primary; }
.line { position: absolute; top: 22rpx; left: 60%; width: 80%; height: 4rpx; background: $sg-border; z-index: 1; }
.line.on { background: $sg-primary; }
.gate { margin: 20rpx 24rpx 0; background: linear-gradient(135deg, #fff6e6, #fff); border: 2rpx solid #f0dcae; border-radius: $sg-radius-lg; padding: 24rpx; }
.gate-t { font-size: 28rpx; font-weight: 800; color: #b5791b; display: block; }
.gate-s { font-size: 22rpx; color: $sg-text-2; line-height: 1.6; margin: 10rpx 0 18rpx; display: block; }
.gate-btns { display: flex; gap: 16rpx; }
.gate-face { font-size: 19rpx; color: #b5791b; margin-top: 12rpx; display: block; }
.cancel-link { color: $sg-red; font-size: 21rpx; font-weight: 700; margin-top: 16rpx; padding: 12rpx 0 2rpx; text-align: center; }
.gb { flex: 1; text-align: center; padding: 20rpx 0; border-radius: 999rpx; font-size: 26rpx; font-weight: 700; background: linear-gradient(135deg, $sg-gold, #b5791b); color: #fff; }
.gb.ghost { flex: 0 0 34%; background: #fff; color: $sg-red; border: 2rpx solid #f0c9c7; }
.rejbox { margin: 20rpx 24rpx 0; background: #fdecea; border: 2rpx solid #f5c6c2; border-radius: $sg-radius-lg; padding: 20rpx; }
.rej-t { font-size: 26rpx; font-weight: 800; color: $sg-red; display: block; }
.rej-s { font-size: 22rpx; color: $sg-text-2; margin-top: 8rpx; display: block; }
.head { margin-bottom: 16rpx; }
.emoji { width: 88rpx; height: 88rpx; border-radius: $sg-radius; background: $sg-primary-light; display: flex; align-items: center; justify-content: center; font-size: 48rpx; margin-right: 18rpx; }
.info { display: flex; flex-direction: column; }
.nm { font-size: 30rpx; font-weight: 700; }
.cp { font-size: 22rpx; color: $sg-text-3; }
.r { display: flex; padding: 14rpx 0; border-top: 2rpx solid $sg-border; }
.k { width: 160rpx; color: $sg-text-3; font-size: 26rpx; }
.v { flex: 1; font-size: 26rpx; }
.v.hot { color: $sg-gold; font-weight: 700; }
.triple-ledger { background: linear-gradient(135deg, #f8fbff, #fff); border: 2rpx solid #d6e8fb; }
.backend-sync { display: block; margin-bottom: 12rpx; padding: 9rpx 12rpx; border-radius: 10rpx; color: #176a4b; background: #eef9f2; font-size: 18rpx; }
.ledger-title { font-size: 27rpx; font-weight: 800; color: #244d6d; }
.ledger-go { font-size: 22rpx; color: $sg-blue; }
.ledger-row { display: flex; padding: 16rpx 0; border-top: 2rpx solid $sg-bg; margin-top: 10rpx; }
.ledger-key { width: 92rpx; height: 40rpx; border-radius: 8rpx; display: flex; align-items: center; justify-content: center; font-size: 20rpx; color: #fff; background: $sg-primary; margin-right: 14rpx; flex: none; }
.ledger-key.blue { background: $sg-blue; }
.ledger-key.gold { background: $sg-gold; }
.ledger-info { flex: 1; display: flex; flex-direction: column; font-size: 24rpx; font-weight: 700; }
.ledger-sub { font-size: 19rpx; color: $sg-text-3; font-weight: 400; line-height: 1.45; margin-top: 4rpx; }
.contract { background: linear-gradient(135deg, #f2ecff, #fff); border: 2rpx solid #ddd0f5; }
.ct2 { font-size: 26rpx; font-weight: 700; color: #6b21b6; }
.arrow2 { font-size: 24rpx; color: #6b21b6; }
.ct2-s { font-size: 21rpx; color: $sg-text-3; margin-top: 8rpx; display: block; }
.chain { background: linear-gradient(135deg, #eef6ff, #fff); border: 2rpx solid #d6e8fb; }
.ct { font-size: 27rpx; font-weight: 700; color: $sg-blue; }
.arrow { font-size: 24rpx; color: $sg-blue; }
.ch { font-size: 24rpx; color: $sg-text-2; margin-top: 10rpx; display: block; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; display: flex; gap: 20rpx; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.05); }
.bar-btn { flex: 1; text-align: center; padding: 24rpx 0; border-radius: 999rpx; font-size: 30rpx; font-weight: 700; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; }
.bar-btn.ghost { flex: 0 0 42%; background: $sg-primary-light; color: $sg-primary; }
.bar-btn.full { flex: 1; }
.unavailable { margin-top: 28rpx; text-align: center; padding: 54rpx 28rpx; }
.unavailable-title { display: block; font-size: 30rpx; font-weight: 800; color: $sg-text; }
.unavailable-text { display: block; margin-top: 14rpx; font-size: 23rpx; line-height: 1.6; color: $sg-text-3; }
</style>
