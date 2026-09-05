<script setup lang="ts">
import { messages } from "@/mock";
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const color: Record<string, string> = { 订单: "#16884c", 询盘: "#2b6cb0", 金融: "#d99a2b", 物流: "#2b6cb0", 公告: "#9aa0aa" };
const routeMap: Record<string, string> = {
  物流: "/pages/logistics/waybill",
  金融: "/pages/finance/apply?name=%E8%AE%A2%E5%8D%95%E8%B4%B7",
  订单: "/pages/trade/order-detail?id=O240701",
  询盘: "/pages/trade/chat?to=%E9%94%A6%E5%8D%8E%E8%BF%9E%E9%94%81%E7%94%9F%E9%B2%9C",
  公告: "/pages/home/emergency",
};
function open(t: string) {
  if (productionBuild) return uni.showModal({ title: "需要后台消息", showCancel: false, content: "正式环境消息由后台通知中心和微信订阅消息接口返回。" });
  const url = routeMap[t];
  if (url) uni.navigateTo({ url });
  else uni.showToast({ title: "已读", icon: "none" });
}
</script>

<template>
  <view class="sg-page">
    <view v-if="!productionBuild" class="cats">
      <view class="c" v-for="c in ['订单','询盘','金融','物流','公告']" :key="c"><text class="ci" :style="{ background: color[c] }">{{ c[0] }}</text><text>{{ c }}</text></view>
    </view>
    <view v-if="!productionBuild" class="msg" v-for="m in messages" :key="m.id" @tap="open(m.type)">
      <view class="badge" :style="{ background: color[m.type] }">{{ m.type[0] }}</view>
      <view class="body">
        <view class="sg-between"><text class="t">{{ m.title }}</text><text class="tm">{{ m.time }}</text></view>
        <text class="d">{{ m.desc }}</text>
      </view>
      <view v-if="m.unread" class="dot"></view>
    </view>
    <view v-if="!productionBuild" class="tip">🔔 重要信息通过微信订阅消息强制推送，替代短信降低成本</view>
    <view v-else class="backend-note">正式环境消息由后台通知中心实时返回；当前未配置真实消息服务，已隐藏演示消息。</view>
  </view>
</template>

<style lang="scss" scoped>
.cats { display: flex; background: #fff; padding: 24rpx 0; margin-bottom: 12rpx; }
.c { flex: 1; display: flex; flex-direction: column; align-items: center; font-size: 22rpx; color: $sg-text-2; }
.ci { width: 64rpx; height: 64rpx; border-radius: 50%; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 28rpx; margin-bottom: 8rpx; }
.msg { display: flex; align-items: center; background: #fff; padding: 24rpx; border-bottom: 2rpx solid $sg-border; position: relative; }
.badge { width: 72rpx; height: 72rpx; border-radius: 20rpx; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 700; margin-right: 20rpx; }
.body { flex: 1; }
.t { font-size: 28rpx; font-weight: 600; }
.tm { font-size: 22rpx; color: $sg-text-3; }
.d { font-size: 24rpx; color: $sg-text-3; margin-top: 6rpx; display: block; }
.dot { position: absolute; top: 24rpx; right: 24rpx; width: 16rpx; height: 16rpx; background: $sg-red; border-radius: 50%; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; }
.backend-note { margin: 40rpx 28rpx; padding: 28rpx; border-radius: 24rpx; background: #fff8e8; color: #8a5a00; line-height: 1.6; font-size: 24rpx; }
</style>
