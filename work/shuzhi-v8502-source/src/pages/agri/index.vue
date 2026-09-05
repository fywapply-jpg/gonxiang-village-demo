<script setup lang="ts">
import { ref, computed } from "vue";
import { agriProducts, agriCats } from "@/mock";

const cat = ref("全部");
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const cats = ["全部", ...agriCats];
const list = computed(() => (cat.value === "全部" ? agriProducts : agriProducts.filter((p) => p.cat === cat.value)));
function detail(id: string) { uni.navigateTo({ url: `/pages/agri/detail?id=${id}` }); }
function contract() { uni.navigateTo({ url: "/pages/agri/contract" }); }
function inputs() { uni.navigateTo({ url: "/pages/agri/inputs" }); }
function credit() { uni.navigateTo({ url: "/pages/agri/credit" }); }
</script>

<template>
  <view class="sg-page">
    <view class="banner">
      <view class="bn-l"><text class="bn-t">农资集采商城</text><text class="bn-s">化肥 · 种子 · 农药 · 农机 厂商直供</text></view>
      <view class="bn-btn" @tap="contract">📑 订单农业合约</view>
    </view>

    <view class="credit-entry" @tap="credit">
      <text class="ce-ic">🚩</text>
      <view class="ce-i"><text class="ce-t">村支书信用背书 · 白名单准入</text><text class="ce-s">农户信用 A/B/C 评级 · 白名单方可签保底订单/授信</text></view>
      <text class="ce-go">进入 ›</text>
    </view>

    <view class="inputs-entry" @tap="inputs">
      <text class="ie-ic">🔥</text>
      <view class="ie-i"><text class="ie-t">集采拼团 · 厂家直供比价 · 赊销到田</text><text class="ie-s">量大价降阶梯拼团 · 农资贷先用后付 · 扫码验真接溯源</text></view>
      <text class="ie-go">进入 ›</text>
    </view>
    <view v-if="productionBuild" class="backend-note">正式环境不展示内置农资商品；请先完成农资商家资质审核，前台仅呈现后台已审核、许可范围匹配且库存有效的 SKU。</view>

    <scroll-view scroll-x class="cats">
      <text v-for="c in cats" :key="c" class="cat" :class="{ on: cat === c }" @tap="cat = c">{{ c }}</text>
    </scroll-view>

    <view v-if="!productionBuild" class="grid">
      <view class="card" v-for="p in list" :key="p.id" @tap="detail(p.id)">
        <view class="emoji">{{ p.emoji }}</view>
        <text class="nm">{{ p.name }}</text>
        <text class="br">{{ p.brand }} · {{ p.spec }}</text>
        <view class="pr">
          <text class="sg-price">¥{{ p.price }}</text><text class="u">/{{ p.unit }}</text>
        </view>
        <view v-if="p.groupPrice" class="group">拼团 ¥{{ p.groupPrice }} 起 · 满{{ p.groupCount }}降价</view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.banner { margin: 24rpx; padding: 28rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; display: flex; align-items: center; justify-content: space-between; }
.credit-entry { display: flex; align-items: center; margin: 0 24rpx 8rpx; padding: 20rpx 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #fdeceb, #fff); border: 2rpx solid #f3c9c5; box-shadow: $sg-shadow; }
.ce-ic { font-size: 42rpx; margin-right: 14rpx; }
.ce-i { flex: 1; display: flex; flex-direction: column; }
.ce-t { font-size: 26rpx; font-weight: 800; color: #c0392b; }
.ce-s { font-size: 18rpx; color: $sg-text-3; margin-top: 4rpx; }
.ce-go { font-size: 23rpx; color: #c0392b; }
.bn-t { font-size: 32rpx; font-weight: 800; }
.bn-s { font-size: 22rpx; opacity: 0.85; margin-top: 6rpx; display: block; }
.bn-btn { background: rgba(255,255,255,0.2); padding: 12rpx 20rpx; border-radius: 999rpx; font-size: 24rpx; }
.inputs-entry { display: flex; align-items: center; margin: 0 24rpx 20rpx; padding: 20rpx 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #fff6e6, #fff); border: 2rpx solid #f0dcae; box-shadow: $sg-shadow; }
.ie-ic { font-size: 40rpx; margin-right: 14rpx; }
.ie-i { flex: 1; display: flex; flex-direction: column; }
.ie-t { font-size: 25rpx; font-weight: 800; color: #b5791b; }
.ie-s { font-size: 18rpx; color: $sg-text-3; margin-top: 4rpx; line-height: 1.4; }
.ie-go { font-size: 23rpx; color: #c8871f; }
.cats { white-space: nowrap; padding: 0 24rpx 20rpx; }
.cat { display: inline-block; padding: 10rpx 30rpx; font-size: 26rpx; color: $sg-text-2; background: #fff; border-radius: 999rpx; margin-right: 14rpx; }
.cat.on { background: $sg-primary; color: #fff; }
.grid { display: flex; flex-wrap: wrap; padding: 0 16rpx; }
.card { width: calc(50% - 32rpx); margin: 0 16rpx 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; display: flex; flex-direction: column; }
.emoji { font-size: 72rpx; align-self: center; }
.nm { font-size: 27rpx; font-weight: 600; margin-top: 10rpx; }
.br { font-size: 22rpx; color: $sg-text-3; margin: 6rpx 0; }
.pr { margin-top: auto; }
.sg-price { font-size: 34rpx; }
.u { font-size: 20rpx; color: $sg-text-3; }
.group { margin-top: 10rpx; font-size: 20rpx; color: $sg-gold; background: $sg-gold-light; padding: 6rpx 12rpx; border-radius: 6rpx; }
.backend-note { margin: 0 24rpx 20rpx; padding: 18rpx 20rpx; border-radius: $sg-radius; background: #fff8e8; border: 2rpx solid #f0dcae; color: #8a641f; font-size: 22rpx; line-height: 1.6; }
</style>
