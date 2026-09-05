<script setup lang="ts">
import { warehouseReceipts as list } from "@/mock";
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const color: Record<string, string> = { 正常: "#16884c", 质押中: "#d99a2b", 已核销: "#9aa0aa" };
function pledge(status: string) {
  if (productionBuild) return uni.showModal({ title: "需要后台仓单数据", showCancel: false, content: "正式环境仓单须由仓储和持牌金融机构核验后才能申请质押。" });
  if (status !== "正常") return uni.showToast({ title: "该仓单不可质押", icon: "none" });
  uni.navigateTo({ url: "/pages/finance/product?id=F2" });
}
</script>

<template>
  <view class="sg-page">
    <view v-if="!productionBuild" class="tip">电子仓单可作为「仓单质押贷」融资凭证，货押不押钱</view>
    <view v-if="!productionBuild" class="card" v-for="w in list" :key="w.id">
      <view class="sg-between"><text class="id">仓单 {{ w.id }}</text><text class="st" :style="{ color: color[w.status] }">{{ w.status }}</text></view>
      <text class="cargo">{{ w.cargo }} · {{ w.qty }}</text>
      <view class="sg-between meta"><text class="wh">{{ w.warehouse }}</text><text class="val">估值 ¥{{ w.value }}</text></view>
      <view class="btn" :class="{ dis: w.status !== '正常' }" @tap="pledge(w.status)">仓单质押申请</view>
    </view>
    <view v-else class="backend-note">正式环境仓单、库存、估值及质押状态由后台仓储和持牌金融机构接口实时返回；当前未配置真实数据，已隐藏演示仓单。</view>
  </view>
</template>

<style lang="scss" scoped>
.tip { margin: 24rpx; font-size: 23rpx; color: $sg-text-2; }
.card { background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 20rpx; padding: 24rpx; }
.id { font-size: 24rpx; color: $sg-text-3; }
.st { font-size: 26rpx; font-weight: 700; }
.cargo { font-size: 30rpx; font-weight: 700; display: block; margin: 12rpx 0; }
.meta { margin-bottom: 16rpx; }
.wh { font-size: 22rpx; color: $sg-text-3; }
.val { font-size: 26rpx; color: $sg-red; font-weight: 600; }
.btn { text-align: center; padding: 18rpx 0; border-radius: 999rpx; background: $sg-primary-light; color: $sg-primary; font-size: 26rpx; font-weight: 600; }
.btn.dis { background: $sg-bg; color: $sg-text-3; }
.backend-note { margin: 40rpx 28rpx; padding: 28rpx; border-radius: $sg-radius-lg; background: #fff8e8; color: #8a5a00; line-height: 1.6; font-size: 24rpx; }
</style>
