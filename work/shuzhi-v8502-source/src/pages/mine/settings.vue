<script setup lang="ts">
import { useAppStore } from "@/store/app";
import { useUserStore } from "@/store/user";
import { clearSessionToken, logoutSession, recordPlatformEvent } from "@/services/localApi";
const app = useAppStore();
const user = useUserStore();

function nav(url: string) { void recordPlatformEvent("mine", "OPEN_SETTINGS_LINK", { url }).catch(() => {}); uni.navigateTo({ url }); }
function clearCache() {
  void recordPlatformEvent("mine", "CLEAR_LOCAL_CACHE", {}).catch(() => {});
  uni.showModal({ title: "清除缓存", content: "清除本地图片、页面缓存（不影响账户与订单数据）？",
    confirmText: "清除", success: (r) => { if (r.confirm) uni.showToast({ title: "已清除 12.6 MB", icon: "success" }); } });
}
function feedback() { nav("/pages/mine/feedback"); }
function logout() {
  void recordPlatformEvent("mine", "LOGOUT", {}).catch(() => {});
  uni.showModal({ title: "退出登录", content: "确认退出当前账号？", confirmText: "退出", confirmColor: "#d64541",
    success: async (r) => { if (r.confirm) { await logoutSession().catch(() => undefined); clearSessionToken(); user.switchRole("visitor"); uni.reLaunch({ url: "/pages/login/index" }); } } });
}
</script>

<template>
  <view class="sg-page">
    <view class="sg-card">
      <text class="gt">无障碍</text>
      <view class="row">
        <view class="ri"><text class="rt">大字模式</text><text class="rs">适配县域、中老年用户，放大全局字号</text></view>
        <switch :checked="app.elderMode" color="#16884c" @change="app.toggleElder()" />
      </view>
    </view>

    <view class="sg-card">
      <text class="gt">消息通知</text>
      <view class="row"><text class="rt">订单状态通知</text><switch :checked="app.notifyOrder" color="#16884c" @change="app.notifyOrder = !app.notifyOrder" /></view>
      <view class="row"><text class="rt">金融进度通知</text><switch :checked="app.notifyFinance" color="#16884c" @change="app.notifyFinance = !app.notifyFinance" /></view>
      <view class="row"><text class="rt">物流异常告警</text><switch :checked="app.notifyLogistics" color="#16884c" @change="app.notifyLogistics = !app.notifyLogistics" /></view>
    </view>

    <view class="sg-card">
      <text class="gt">账号与隐私</text>
      <view class="row" @tap="nav('/pages/mine/security')"><text class="rt">账号安全管理</text><text class="ar">›</text></view>
      <view class="row" @tap="nav('/pages/mine/privacy')"><text class="rt">隐私授权管理</text><text class="ar">›</text></view>
      <view class="row" @tap="nav('/pages/mine/compliance')"><text class="rt">🛡️ 合规公示中心</text><text class="ar">依法合规 ›</text></view>
      <view class="row" @tap="nav('/pages/mine/about')"><text class="rt">关于 · 服务导览</text><text class="ar">服务中心 ›</text></view>
    </view>

    <view class="sg-card">
      <text class="gt">通用</text>
      <view class="row" @tap="clearCache"><text class="rt">清除缓存</text><text class="ar">12.6 MB ›</text></view>
      <view class="row" @tap="feedback"><text class="rt">意见反馈</text><text class="ar">›</text></view>
    </view>

    <view class="logout" @tap="logout">退出登录</view>
  </view>
</template>

<style lang="scss" scoped>
.gt { font-size: 24rpx; color: $sg-text-3; display: block; margin-bottom: 8rpx; }
.row { display: flex; align-items: center; justify-content: space-between; padding: 22rpx 0; border-top: 2rpx solid $sg-border; }
.row:first-of-type { border-top: none; }
.ri { display: flex; flex-direction: column; flex: 1; }
.rt { font-size: 28rpx; }
.rs { font-size: 22rpx; color: $sg-text-3; margin-top: 4rpx; }
.ar { color: $sg-text-3; font-size: 26rpx; }
.logout { margin: 30rpx 24rpx; text-align: center; padding: 26rpx 0; background: #fff; border-radius: $sg-radius-lg; color: $sg-red; font-size: 30rpx; font-weight: 600; box-shadow: $sg-shadow; }
</style>
