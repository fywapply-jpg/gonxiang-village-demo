<script setup lang="ts">
import { useUserStore } from "@/store/user";
import { recordPlatformEvent } from "@/services/localApi";
const user = useUserStore();
const did = user.did || "did:sg:0x7f3a9cb3c50a";
function copy() { void recordPlatformEvent("mine", "COPY_DID", { did }).catch(() => {}); uni.setClipboardData({ data: did, success: () => uni.showToast({ title: "已复制", icon: "none" }) }); }
</script>

<template>
  <view class="sg-page">
    <view class="card">
      <text class="chip">星火·链网 BID 体系</text>
      <text class="org">{{ user.role.org }}</text>
      <text class="role">{{ user.role.name }}</text>
      <view class="didrow" @tap="copy">
        <text class="did">{{ did }}</text>
        <text class="copy">复制</text>
      </view>
      <view class="qr">
        <view class="qr-box">▦▦▦<br/>▦ ▦<br/>▦▦▦</view>
      </view>
      <text class="qh">DID 分布式身份 · 全链路唯一凭证</text>
    </view>

    <view class="sg-card">
      <text class="st">已绑定凭证</text>
      <view class="cred"><text>✔ 营业执照（链上存证）</text></view>
      <view class="cred"><text>✔ 供销体系资质认证</text></view>
      <view class="cred"><text>✔ 实名认证（微信授权）</text></view>
      <view class="cred"><text>✔ 信用资产确权凭证</text></view>
    </view>
    <view class="tip">🔗 DID 身份贯穿交易、金融、溯源全链路，企业/合作社/农户唯一链上身份</view>
  </view>
</template>

<style lang="scss" scoped>
.card { margin: 24rpx; padding: 40rpx 28rpx; border-radius: $sg-radius-lg; background: linear-gradient(160deg, #143a2a, #16884c); color: #fff; display: flex; flex-direction: column; align-items: center; }
.chip { font-size: 22rpx; background: rgba(255,255,255,0.2); padding: 6rpx 18rpx; border-radius: 999rpx; }
.org { font-size: 34rpx; font-weight: 800; margin-top: 20rpx; }
.role { font-size: 24rpx; opacity: 0.9; margin-top: 6rpx; }
.didrow { display: flex; align-items: center; background: rgba(0,0,0,0.2); padding: 16rpx 24rpx; border-radius: 999rpx; margin-top: 24rpx; }
.did { font-size: 22rpx; word-break: break-all; }
.copy { font-size: 22rpx; margin-left: 16rpx; opacity: 0.9; }
.qr { margin-top: 30rpx; background: #fff; padding: 24rpx; border-radius: $sg-radius; }
.qr-box { color: $sg-primary; font-size: 40rpx; line-height: 1.4; letter-spacing: 6rpx; text-align: center; }
.qh { font-size: 22rpx; opacity: 0.85; margin-top: 20rpx; }
.st { font-size: 28rpx; font-weight: 700; display: block; margin-bottom: 12rpx; }
.cred { padding: 14rpx 0; font-size: 26rpx; color: $sg-primary; border-bottom: 2rpx solid $sg-border; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
</style>
