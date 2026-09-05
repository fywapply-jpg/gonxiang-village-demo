<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { villageProducts, type VillageProduct } from "@/mock/products";
import { starOf, starName } from "@/mock/merchant";
import { useUserStore } from "@/store/user";
import { createTradeOrder, getProducts, type LocalProduct } from "@/services/localApi";

const user = useUserStore();
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const s = ref<VillageProduct>(productionBuild ? {} as VillageProduct : villageProducts[0]);
const remoteProduct = ref<LocalProduct | null>(null);
const ready = ref(!productionBuild);
const loading = ref(false);
const loadError = ref("");
function mapProduct(product: LocalProduct): VillageProduct {
  const price = Number(product.price) || 0;
  return { id: product.id, merchant_id: product.merchant_id, name: product.name, cat: product.category, origin: product.origin || "产地待确认", spec: product.spec || "标准规格", price, priceText: `¥${price.toFixed(2)}`, unit: product.unit || "件", supplier: product.merchant_name || "已核验供货商", pic: product.media?.find((item) => item.media_type === "image")?.url || "/static/products/p12.jpg", tags: ["后台已审核"], sold: 0, stock: `库存 ${Number(product.stock) || 0}`, rating: 4.8 };
}
onLoad(async (q) => {
  if (!productionBuild) { const f = villageProducts.find((x) => x.id === q?.id); if (f) s.value = f; return; }
  loading.value = true;
  try {
    const rows = await getProducts();
    const found = rows.find((x) => x.id === String(q?.id || ""));
    if (!found) throw new Error("该货源不存在、未审核或已下架");
    remoteProduct.value = found;
    s.value = mapProduct(found);
    ready.value = true;
  } catch (error: any) {
    loadError.value = error?.message || "后台货源暂不可读，请先登录授权";
  } finally { loading.value = false; }
});

// 产品多图（3-7 张，附标签）
const cur = ref(0);
const galLabels = ["主图", "产地实拍", "细节特写", "分级包装", "溯源标签", "仓储冷链", "质检报告"];
const gallery = computed(() => {
  if (productionBuild) {
    const urls = (remoteProduct.value?.media || []).filter((item) => item.media_type === "image" && String(item.url || "").trim()).sort((a, b) => Number(a.sort_no || 0) - Number(b.sort_no || 0)).map((item) => item.url);
    return urls.length ? urls : (s.value.pic ? [s.value.pic] : []);
  }
  const idx = villageProducts.findIndex((x) => x.id === s.value.id);
  const n = 4 + (idx % 4); // 4~7 张
  const arr = [s.value.pic];
  for (let k = 1; k < n; k++) arr.push(villageProducts[(idx + k * 3 + 1) % villageProducts.length].pic);
  return arr;
});
function onSwipe(e: any) { cur.value = e.detail.current; }
function preview(i: number) { uni.previewImage({ current: i, urls: gallery.value }); }
function playVideo() {
  uni.showModal({ title: "产品介绍视频", showCancel: false, confirmText: "知道了",
    content: `播放《${s.value.name}》产品介绍视频：产地环境、种植管理、分级包装与冷链发货全流程实拍，时长 00:48。` });
}

const star = () => starOf(s.value.rating || 4.5);
function merchantStar() { uni.navigateTo({ url: "/pages/merchant/star" }); }
function shop() { uni.navigateTo({ url: `/pages/trade/shop?name=${encodeURIComponent(s.value.supplier)}${s.value.merchant_id ? `&merchant_id=${encodeURIComponent(s.value.merchant_id)}` : ""}` }); }

const traceId = () => "TJ2026" + s.value.id;
function trace() { uni.navigateTo({ url: `/pages/trace/detail?id=${traceId()}` }); }
function chat() { uni.navigateTo({ url: `/pages/trade/chat?to=${encodeURIComponent(s.value.supplier)}` }); }
function control() { uni.navigateTo({ url: "/pages/trade/control" }); }
function order() {
  if (!user.ensureTradeRole("批量采购下单", "purchase")) return;
  const qty = 1000; // 默认批量：1000 单位
  const amount = Math.round((s.value.price || 0) * qty);
  uni.showModal({
    title: "批量下单",
    content: `向「${s.value.supplier}」采购 ${s.value.name} ×${qty}${s.value.unit}\n应付 ¥${amount.toLocaleString()}，去支付？`,
    confirmText: "去支付",
    success: async (r) => {
      if (!r.confirm) return;
      if (productionBuild) {
        try {
          const created = await createTradeOrder({ scene: "buyerSupply", supplier_id: s.value.merchant_id, items: [{ product_id: s.value.id, qty }], settlement_model: "持牌机构条件结算（验收后分账）", invoice_type: "增值税专用发票" });
          uni.navigateTo({ url: `/pages/pay/index?scene=b2b&title=${encodeURIComponent(s.value.name + ' 批量采购')}&amount=${created.amount || amount}&no=${encodeURIComponent(created.id)}&term=custody` });
        } catch (error: any) {
          uni.showModal({ title: "后台未放行", showCancel: false, content: error?.message || "订单创建失败，请检查主体授权、库存和结算条件" });
        }
        return;
      }
      uni.navigateTo({ url: `/pages/pay/index?scene=b2b&title=${encodeURIComponent(s.value.name + ' 批量采购')}&amount=${amount}&no=O${Date.now()}` });
    },
  });
}
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild && !ready" class="sg-card unavailable">
      <text class="unavailable-title">{{ loading ? '正在读取后台货源…' : '货源暂不可用' }}</text>
      <text class="unavailable-text">{{ loadError || '请从供货大厅选择已审核货源，或先完成登录授权。' }}</text>
    </view>
    <template v-else>
    <!-- 多图轮播 -->
    <view class="gal-wrap">
      <swiper class="gal" circular @change="onSwipe">
        <swiper-item v-for="(img, i) in gallery" :key="i" @tap="preview(i)">
          <image class="gimg" :src="img" mode="aspectFill" />
        </swiper-item>
      </swiper>
      <text class="gal-count">{{ cur + 1 }}/{{ gallery.length }} · {{ galLabels[cur] || '实拍' }}</text>
    </view>

    <view class="sg-card identity-card" @tap="control">
      <view class="sg-between">
        <view class="identity-head">
          <text class="identity-badge">供货方身份通行证</text>
          <text class="identity-org">{{ s.supplier }}</text>
        </view>
        <text class="identity-go">查看准入档案 ›</text>
      </view>
      <view class="identity-checks">
        <text>✓ 工商存续</text>
        <text>✓ 法人DID</text>
        <text>✓ 对公账户一致</text>
        <text>✓ 经营许可有效</text>
      </view>
      <text class="identity-note">下单时固化主体、经办人权限、收款账户、许可范围和信用等级；后续不得替换收款主体。</text>
    </view>

    <!-- 缩略图 + 视频 -->
    <scroll-view scroll-x class="thumbs">
      <view class="thumb video" @tap="playVideo">
        <image class="tv-img" :src="s.pic" mode="aspectFill" />
        <view class="tv-mask"><text class="tv-play">▶</text></view>
        <text class="tv-t">视频</text>
      </view>
      <view class="thumb" v-for="(img, i) in gallery" :key="i" :class="{ on: cur === i }" @tap="cur = i">
        <image class="th-img" :src="img" mode="aspectFill" />
      </view>
    </scroll-view>

    <!-- 视频介绍卡 -->
    <view class="video-card" @tap="playVideo">
      <image class="vc-poster" :src="s.pic" mode="aspectFill" />
      <view class="vc-mask">
        <view class="vc-play">▶</view>
        <text class="vc-t">产品介绍视频</text>
        <text class="vc-s">产地 · 种植 · 分级包装 · 冷链发货 全流程实拍 · 00:48</text>
      </view>
    </view>

    <view class="sg-card">
      <view class="sg-between">
        <text class="title">{{ s.name }}</text>
        <text class="sg-price big">{{ s.priceText }}</text>
      </view>
      <view class="statline">
        <text class="stat"><text class="stat-n gold">★ {{ s.rating }}</text> 评分</text>
        <text v-if="s.sold" class="stat"><text class="stat-n">{{ s.sold }}+</text> 已售</text>
        <text class="stat"><text class="stat-n green">{{ s.stock }}</text></text>
      </view>
      <view class="tags"><text class="tag" v-for="t in s.tags" :key="t">{{ t }}</text></view>
      <view class="rows">
        <view class="r"><text class="k">产地</text><text class="v">{{ s.origin }}</text></view>
        <view class="r"><text class="k">规格</text><text class="v">{{ s.spec }}</text></view>
        <view class="r"><text class="k">品类</text><text class="v">{{ s.cat }}</text></view>
        <view class="r" @tap="shop"><text class="k">供应商</text><text class="v">{{ s.supplier }} <text class="ok">✔ 法人认证</text> <text class="shoplk">企业店铺 ›</text></text></view>
        <view class="r star-row" @tap="merchantStar">
          <text class="k">商户星级</text>
          <text class="v"><text class="stars"><text v-for="i in star()" :key="i" class="st">★</text></text> {{ starName(star()) }} ›</text>
        </view>
      </view>
    </view>

    <view class="sg-card link" @tap="trace">
      <view class="sg-between">
        <view class="sg-row"><text class="lk-ic">🔗</text><text class="lk-t">全链路可信溯源</text></view>
        <text class="lk-arrow">溯源码 {{ traceId() }} ›</text>
      </view>
      <text class="lk-s">种植 → 加工 → 流通 → 销售 全程上链，一键验真</text>
    </view>

    <view class="sg-card">
      <view class="sg-row qc">
        <text class="qc-ic">📋</text>
        <view class="sg-between" style="flex:1">
          <text class="qc-t">质检报告</text>
          <text class="qc-v ok">农残/重金属 全项合格 ✔</text>
        </view>
      </view>
    </view>

    <view class="bar">
      <view class="bar-btn ghost" @tap="chat">💬 一键询盘</view>
      <view class="bar-btn" @tap="order">批量下单</view>
    </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.gal-wrap { position: relative; }
.gal { width: 100%; height: 520rpx; }
.gimg { width: 100%; height: 520rpx; display: block; background: $sg-primary-light; }
.gal-count { position: absolute; right: 20rpx; bottom: 20rpx; background: rgba(0,0,0,0.5); color: #fff; font-size: 22rpx; padding: 6rpx 18rpx; border-radius: 999rpx; }
.thumbs { white-space: nowrap; background: #fff; padding: 16rpx 20rpx; }
.thumb { display: inline-block; width: 110rpx; height: 110rpx; border-radius: 12rpx; overflow: hidden; margin-right: 14rpx; position: relative; border: 3rpx solid transparent; vertical-align: top; }
.thumb.on { border-color: $sg-primary; }
.th-img { width: 100%; height: 100%; display: block; }
.thumb.video .tv-img { width: 100%; height: 100%; display: block; }
.tv-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.35); display: flex; align-items: center; justify-content: center; }
.tv-play { color: #fff; font-size: 34rpx; }
.tv-t { position: absolute; bottom: 2rpx; left: 0; right: 0; text-align: center; color: #fff; font-size: 18rpx; }
.video-card { position: relative; margin: 24rpx; height: 300rpx; border-radius: $sg-radius-lg; overflow: hidden; }
.vc-poster { width: 100%; height: 100%; display: block; }
.vc-mask { position: absolute; inset: 0; background: rgba(0,0,0,0.35); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.vc-play { width: 96rpx; height: 96rpx; border-radius: 50%; background: rgba(255,255,255,0.9); color: $sg-primary; font-size: 44rpx; display: flex; align-items: center; justify-content: center; }
.vc-t { color: #fff; font-size: 28rpx; font-weight: 700; margin-top: 14rpx; }
.vc-s { color: rgba(255,255,255,0.9); font-size: 20rpx; margin-top: 6rpx; padding: 0 40rpx; text-align: center; }
.title { font-size: 32rpx; font-weight: 700; flex: 1; }
.sg-price.big { font-size: 42rpx; }
.statline { display: flex; align-items: center; gap: 30rpx; margin: 14rpx 0 4rpx; padding: 14rpx 0; border-top: 2rpx solid $sg-border; border-bottom: 2rpx solid $sg-border; }
.stat { font-size: 22rpx; color: $sg-text-3; }
.stat-n { font-size: 28rpx; font-weight: 700; color: $sg-text; }
.stat-n.gold { color: $sg-gold; }
.stat-n.green { color: $sg-primary; }
.tags { display: flex; margin: 12rpx 0; }
.tag { font-size: 20rpx; color: $sg-primary; background: $sg-primary-light; padding: 4rpx 14rpx; border-radius: 6rpx; margin-right: 10rpx; }
.rows { margin-top: 6rpx; }
.r { display: flex; padding: 14rpx 0; border-top: 2rpx solid $sg-border; }
.k { width: 140rpx; color: $sg-text-3; font-size: 26rpx; }
.v { flex: 1; font-size: 26rpx; }
.star-row .v { color: $sg-gold; font-weight: 600; }
.stars { color: $sg-gold; }
.st { font-size: 24rpx; }
.ok { color: $sg-primary; }
.shoplk { color: $sg-gold; font-weight: 600; font-size: 22rpx; }
.identity-card { background: linear-gradient(135deg, #f2fbf5, #fff); border: 2rpx solid #c6ecd5; }
.identity-head { display: flex; flex-direction: column; }
.identity-badge { font-size: 19rpx; color: #fff; background: $sg-primary; padding: 4rpx 12rpx; border-radius: 6rpx; align-self: flex-start; }
.identity-org { font-size: 27rpx; font-weight: 800; margin-top: 8rpx; }
.identity-go { font-size: 21rpx; color: $sg-primary; }
.identity-checks { display: flex; flex-wrap: wrap; gap: 9rpx; margin-top: 15rpx; }
.identity-checks text { font-size: 19rpx; color: $sg-primary-deep; background: $sg-primary-light; padding: 6rpx 11rpx; border-radius: 6rpx; }
.identity-note { display: block; margin-top: 13rpx; font-size: 20rpx; color: $sg-text-2; line-height: 1.55; }
.link { background: linear-gradient(135deg, #eef6ff, #fff); border: 2rpx solid #d6e8fb; }
.lk-ic { margin-right: 10rpx; }
.lk-t { font-size: 28rpx; font-weight: 700; color: $sg-blue; }
.lk-arrow { font-size: 24rpx; color: $sg-blue; }
.lk-s { font-size: 22rpx; color: $sg-text-3; margin-top: 10rpx; display: block; }
.qc-ic { font-size: 40rpx; margin-right: 16rpx; }
.qc-t { font-size: 28rpx; font-weight: 600; }
.qc-v { font-size: 24rpx; }
.qc-v.ok { color: $sg-primary; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; display: flex; gap: 20rpx; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.05); }
.bar-btn { flex: 1; text-align: center; padding: 24rpx 0; border-radius: 999rpx; font-size: 30rpx; font-weight: 700; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; }
.bar-btn.ghost { flex: 0 0 40%; background: $sg-primary-light; color: $sg-primary; }
.unavailable { margin-top: 28rpx; text-align: center; padding: 54rpx 28rpx; }
.unavailable-title { display: block; font-size: 30rpx; font-weight: 800; color: $sg-text; }
.unavailable-text { display: block; margin-top: 14rpx; font-size: 23rpx; line-height: 1.6; color: $sg-text-3; }
</style>
