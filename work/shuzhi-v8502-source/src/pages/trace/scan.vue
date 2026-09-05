<script setup lang="ts">
import { traceBatch } from "@/mock";
import { recordPlatformEvent } from "@/services/localApi";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

function scan() {
  if (productionBuild) {
    uni.showModal({ title: "溯源服务未接入", content: "正式环境扫码必须连接后台溯源服务，待配置接口、数据权限和审计留痕后开放。", showCancel: false });
    return;
  }
  void recordPlatformEvent("trace", "SCAN_TRACE_CODE", { trace_id: traceBatch.traceId }).catch(() => {});
  // #ifdef MP-WEIXIN || APP-PLUS
  uni.scanCode({ success: () => go(), fail: () => go() });
  return;
  // #endif
  // H5 无原生扫码，预览环境直接进入
  go();
}
function go() { uni.navigateTo({ url: "/pages/trace/fullchain" }); }
function goDetail() {
  if (productionBuild) {
    uni.showModal({ title: "溯源服务未接入", content: "正式环境溯源明细由后台按批次权限返回，当前未配置服务。", showCancel: false });
    return;
  }
  uni.navigateTo({ url: `/pages/trace/detail?id=${traceBatch.traceId}` });
}
</script>

<template>
  <view class="sg-page scan">
    <view class="scanner">
      <view class="frame">
        <view class="corner tl"></view><view class="corner tr"></view>
        <view class="corner bl"></view><view class="corner br"></view>
        <view class="laser"></view>
      </view>
      <text class="tip">将二维码 / 溯源码放入框内</text>
      <view class="scan-btn" @tap="scan">📷 扫一扫溯源</view>
      <text class="hint">游客无需登录即可查询 · 微信原生扫码能力</text>
    </view>

    <view v-if="!productionBuild" class="recent">
      <text class="rt">最近扫描</text>
      <view class="rc" @tap="go">
        <text class="re">{{ traceBatch.emoji }}</text>
        <view class="ri"><text class="rn">{{ traceBatch.product }}</text><text class="rid">溯源码 {{ traceBatch.traceId }}</text></view>
        <text class="rgo">全链路 ›</text>
      </view>
      <view class="links">
        <text class="lk" @tap="go">🔗 全链路 9 环节总览</text>
        <text class="lk" @tap="goDetail">📑 生产溯源明细</text>
      </view>
    </view>
    <view v-else class="backend-note">正式环境不展示本地示例批次。扫码结果、批次明细和监管留痕需由后台溯源服务返回。</view>
  </view>
</template>

<style lang="scss" scoped>
.scan { padding: 0; }
.scanner { background: linear-gradient(180deg, #0f3d26, #16884c); padding: 80rpx 40rpx 60rpx; display: flex; flex-direction: column; align-items: center; }
.frame { width: 420rpx; height: 420rpx; position: relative; }
.corner { position: absolute; width: 44rpx; height: 44rpx; border: 6rpx solid #7fe3a8; }
.tl { top: 0; left: 0; border-right: none; border-bottom: none; }
.tr { top: 0; right: 0; border-left: none; border-bottom: none; }
.bl { bottom: 0; left: 0; border-right: none; border-top: none; }
.br { bottom: 0; right: 0; border-left: none; border-top: none; }
.laser { position: absolute; left: 10rpx; right: 10rpx; top: 50%; height: 4rpx; background: #7fe3a8; box-shadow: 0 0 20rpx #7fe3a8; }
.tip { color: rgba(255,255,255,0.85); font-size: 24rpx; margin-top: 30rpx; }
.scan-btn { margin-top: 40rpx; background: #fff; color: $sg-primary; font-weight: 700; font-size: 30rpx; padding: 22rpx 80rpx; border-radius: 999rpx; }
.hint { color: rgba(255,255,255,0.7); font-size: 22rpx; margin-top: 20rpx; }
.recent { padding: 30rpx 24rpx; }
.rt { font-size: 28rpx; font-weight: 700; }
.rc { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; margin-top: 18rpx; }
.re { width: 88rpx; height: 88rpx; border-radius: $sg-radius; background: $sg-primary-light; display: flex; align-items: center; justify-content: center; font-size: 48rpx; margin-right: 18rpx; }
.ri { flex: 1; display: flex; flex-direction: column; }
.rn { font-size: 28rpx; font-weight: 600; }
.rid { font-size: 22rpx; color: $sg-text-3; }
.rgo { font-size: 24rpx; color: $sg-primary; }
.links { display: flex; gap: 16rpx; margin-top: 16rpx; }
.lk { flex: 1; text-align: center; font-size: 22rpx; color: $sg-blue; background: #eef6ff; padding: 16rpx 0; border-radius: $sg-radius; }
.backend-note { margin: 24rpx; padding: 22rpx; border-radius: $sg-radius-lg; background: #fff7ed; border: 2rpx solid #fed7aa; color: #9a3412; font-size: 23rpx; line-height: 1.6; }
</style>
