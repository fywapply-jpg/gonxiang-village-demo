<script setup lang="ts">
import { computed } from "vue";
import { commRows, SPLIT } from "@/mock/promo";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const rows = computed(() => commRows.map((r) => ({
  ...r,
  plat: Math.round(r.base * SPLIT.platform / 100),
  org: Math.round(r.base * SPLIT.org / 100),
})));
const totalBase = computed(() => rows.value.reduce((s, r) => s + r.base, 0));
const totalOrg = computed(() => rows.value.reduce((s, r) => s + r.org, 0));
const totalPlat = computed(() => rows.value.reduce((s, r) => s + r.plat, 0));

function settle() {
  if (productionBuild) return uni.showModal({ title: "需要后台结算数据", showCancel: false, content: "正式环境佣金必须由后台依据生效合同、验收、发票和持牌结算回单计算后展示。" });
  uni.showModal({ title: "月度佣金结算", showCancel: false, confirmText: "知道了",
    content: `本月推广服务费示例基数 ¥${totalBase.value.toLocaleString()}\n平台 40% = ¥${totalPlat.value.toLocaleString()}\n推广组织 60% = ¥${totalOrg.value.toLocaleString()}\n\n仅在独立服务合同、验收、发票和持牌结算回单齐全后执行；已按示例规则上链存证。` });
}
</script>

<template>
  <view class="sg-page">
    <view v-if="!productionBuild" class="hero">
      <text class="ht">💰 佣金结算台账</text>
      <text class="hs">平台 4 : 推广组织 6 · 按月结算 · 上链存证</text>
      <view class="sum">
        <view class="su"><text class="sun">¥{{ (totalBase/10000).toFixed(1) }}万</text><text class="sul">佣金基数</text></view>
        <view class="su"><text class="sun plat">¥{{ (totalPlat/10000).toFixed(1) }}万</text><text class="sul">平台 40%</text></view>
        <view class="su"><text class="sun org">¥{{ (totalOrg/10000).toFixed(1) }}万</text><text class="sul">组织 60%</text></view>
      </view>
    </view>

    <view v-if="!productionBuild" class="sec">分成明细（本月）</view>
    <view v-if="!productionBuild" class="tbl">
      <view class="row hd"><text class="c-end">小端 / 类型</text><text class="c-base">基数</text><text class="c-plat">平台4</text><text class="c-org">组织6</text></view>
      <view class="row" v-for="r in rows" :key="r.end">
        <view class="c-end"><text class="ce-n">{{ r.end }}</text><text class="ce-t">{{ r.endType }}</text></view>
        <text class="c-base">¥{{ r.base.toLocaleString() }}</text>
        <text class="c-plat">¥{{ r.plat.toLocaleString() }}</text>
        <text class="c-org">¥{{ r.org.toLocaleString() }}</text>
      </view>
    </view>

    <view v-if="!productionBuild" class="note">💡 基数 = 小端本月在平台产生的服务费 / 交易佣金；平台得 4 成用于系统与风控，推广组织得 6 成用于推广、维护、舆情与集体分红。</view>
    <view v-if="!productionBuild" class="cta" @tap="settle">按生效合同结算并上链 ›</view>
    <view v-else class="backend-note">正式环境佣金台账由后台合同、验收、发票和持牌结算数据实时生成；当前未配置真实结算接口，已隐藏演示金额。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #d99a2b, #b5791b); padding: 32rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.95; margin-top: 8rpx; display: block; }
.sum { display: flex; margin-top: 22rpx; }
.su { flex: 1; text-align: center; }
.sun { font-size: 32rpx; font-weight: 800; display: block; }
.sun.plat { color: #e2e8f0; }
.sun.org { color: #d5f5e3; }
.sul { font-size: 19rpx; opacity: 0.9; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.tbl { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 8rpx 20rpx; }
.row { display: flex; align-items: center; padding: 16rpx 0; border-top: 2rpx solid $sg-bg; }
.row.hd { border-top: none; }
.row.hd text { font-size: 20rpx; color: $sg-text-3; }
.c-end { flex: 1.8; display: flex; flex-direction: column; }
.ce-n { font-size: 23rpx; font-weight: 600; }
.ce-t { font-size: 18rpx; color: $sg-text-3; margin-top: 2rpx; }
.c-base { flex: 1; font-size: 22rpx; text-align: right; color: $sg-text-2; }
.c-plat { flex: 1; font-size: 22rpx; text-align: right; color: #64748b; }
.c-org { flex: 1; font-size: 23rpx; text-align: right; color: $sg-primary; font-weight: 700; }
.note { margin: 20rpx 24rpx 0; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.cta { margin: 20rpx 24rpx; text-align: center; padding: 26rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #d99a2b, #b5791b); color: #fff; font-size: 27rpx; font-weight: 700; box-shadow: 0 8rpx 20rpx rgba(217,154,43,0.3); }
.backend-note { margin: 40rpx 28rpx; padding: 28rpx; border-radius: $sg-radius-lg; background: #fff8e8; color: #8a5a00; line-height: 1.6; font-size: 24rpx; }
</style>
