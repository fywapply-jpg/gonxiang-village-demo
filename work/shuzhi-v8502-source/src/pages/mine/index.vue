<script setup lang="ts">
import { useUserStore } from "@/store/user";
import { recordPlatformEvent } from "@/services/localApi";
const user = useUserStore();
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
function nav(url: string) { void recordPlatformEvent("mine", "OPEN_ACCOUNT_LINK", { url }).catch(() => {}); uni.navigateTo({ url }); }
function msg() { void recordPlatformEvent("mine", "OPEN_MESSAGES", {}).catch(() => {}); uni.navigateTo({ url: "/pages/message/index" }); }
function demo(t: string, c: string) { void recordPlatformEvent("mine", "OPEN_ACCOUNT_NOTICE", { title: t }).catch(() => {}); uni.showModal({ title: t, content: c, showCancel: false, confirmText: "知道了" }); }
</script>

<template>
  <view class="sg-page">
    <view class="hd">
      <view class="avatar">{{ user.role.short }}</view>
      <view class="info">
        <text class="name">{{ user.certOrg }}</text>
        <text class="role">{{ user.isVisitor ? '游客 · 未登录' : user.role.name }}</text>
      </view>
      <view v-if="user.did" class="did" @tap="nav('/pages/mine/did')">🔗 DID</view>
    </view>

    <!-- 企业主体认证状态 -->
    <view class="cert" :class="user.certStatus">
      <block v-if="user.certStatus === 'approved'">
        <view class="cert-l"><text class="cert-ic">🏢</text></view>
        <view class="cert-m">
          <view class="cert-row"><text class="cert-t">企业法人主体</text><text class="cert-badge ok">✔ 已认证</text></view>
          <text class="cert-did">{{ user.did }}</text>
        </view>
        <text class="cert-go" @tap="nav('/pages/mine/did')">查看 ›</text>
      </block>
      <block v-else-if="user.certStatus === 'pending'">
        <view class="cert-l"><text class="cert-ic">⏳</text></view>
        <view class="cert-m">
          <view class="cert-row"><text class="cert-t">{{ user.certOrg }}</text><text class="cert-badge pending">审核中</text></view>
          <text class="cert-did">入驻资质审核中 · 1-3 个工作日 · 通过后生成链上 DID</text>
        </view>
      </block>
      <block v-else>
        <view class="cert-l"><text class="cert-ic">📝</text></view>
        <view class="cert-m">
          <view class="cert-row"><text class="cert-t">企业主体入驻</text></view>
          <text class="cert-did">以企业法人身份认证后，即可交易 / 融资 / 溯源</text>
        </view>
        <view class="cert-btn" @tap="nav('/pages/register/index')">去认证</view>
      </block>
    </view>

    <view v-if="!user.isVisitor" class="wallet sg-card" @tap="nav('/pages/mine/wallet')">
      <view class="w"><text class="wn">{{ productionBuild ? '—' : '¥ 24,860' }}</text><text class="wl">账户余额</text></view>
      <view class="w"><text class="wn">{{ productionBuild ? '—' : user.role.creditScore }}</text><text class="wl">信用分</text></view>
      <view class="w"><text class="wn">{{ productionBuild ? '—' : '¥ 1,286' }}</text><text class="wl">累计分红</text></view>
    </view>

    <view class="ally-entry" @tap="nav('/pages/alliance/index')">
      <text class="al-ic">🤝</text>
      <view class="al-i"><text class="al-t">我的一份 · 利益共同体</text><text class="al-s">{{ user.isVisitor ? '登录后查看本月到手 / 分红榜 / 贡献值' : '按你的身份 · 本月到手 · 村里分红榜 · 贡献值排名' }}</text></view>
      <text class="al-go">查看 ›</text>
    </view>

    <view class="grid sg-card">
      <view class="g" @tap="nav('/pages/trade/orders')"><text class="gi">📋</text><text>我的订单</text></view>
      <view class="g" @tap="nav('/pages/mine/wallet')"><text class="gi">💳</text><text>我的钱包</text></view>
      <view class="g" @tap="nav('/pages/finance/credit')"><text class="gi">🏅</text><text>信用资产</text></view>
      <view class="g" @tap="nav('/pages/merchant/star')"><text class="gi">🌟</text><text>商户星级</text></view>
      <view class="g" @tap="nav('/pages/logistics/receipt')"><text class="gi">📦</text><text>电子仓单</text></view>
      <view class="g" @tap="nav('/pages/mine/did')"><text class="gi">🆔</text><text>链上身份</text></view>
      <view class="g" @tap="msg"><text class="gi">🔔</text><text>消息通知</text></view>
      <view class="g" @tap="nav('/pages/mine/favorites')"><text class="gi">⭐</text><text>收藏关注</text></view>
      <view class="g" @tap="nav('/pages/aftersale/ticket')"><text class="gi">🎧</text><text>售后投诉</text></view>
    </view>

    <view v-if="!user.isVisitor" class="admin-entry" @tap="nav('/pages/admin/index')">
      <view class="ae-ic">🛠️</view>
      <view class="ae-info"><text class="ae-t">管理中心</text><text class="ae-s">平台管理角色 · 权限分配 · 审核/运营/财务/客服</text></view>
      <text class="ae-go">进入 ›</text>
    </view>

    <view class="list sg-card">
      <view class="li" @tap="nav('/pages/mine/settings')"><text>⚙️ 系统设置</text><text class="ar">›</text></view>
      <view class="li" @tap="nav('/pages/mine/invoice')"><text>📄 发票管理</text><text class="ar">›</text></view>
      <view class="li" @tap="nav('/pages/mine/privacy')"><text>🛡️ 隐私授权管理</text><text class="ar">›</text></view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.hd { display: flex; align-items: center; padding: 80rpx 28rpx 30rpx; background: linear-gradient(160deg, $sg-primary, $sg-primary-deep); }
.avatar { width: 110rpx; height: 110rpx; border-radius: 50%; background: rgba(255,255,255,0.25); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 48rpx; font-weight: 800; margin-right: 24rpx; }
.info { flex: 1; display: flex; flex-direction: column; color: #fff; }
.name { font-size: 32rpx; font-weight: 800; }
.role { font-size: 24rpx; opacity: 0.9; margin-top: 6rpx; }
.did { background: rgba(255,255,255,0.2); color: #fff; padding: 10rpx 20rpx; border-radius: 999rpx; font-size: 24rpx; }

.cert { display: flex; align-items: center; margin: -20rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; position: relative; }
.cert.approved { border-left: 8rpx solid $sg-primary; }
.cert.pending { border-left: 8rpx solid $sg-gold; }
.cert.none { border-left: 8rpx solid $sg-text-3; }
.cert-ic { font-size: 48rpx; margin-right: 18rpx; }
.cert-m { flex: 1; display: flex; flex-direction: column; }
.cert-row { display: flex; align-items: center; }
.cert-t { font-size: 28rpx; font-weight: 700; }
.cert-badge { font-size: 20rpx; padding: 2rpx 14rpx; border-radius: 999rpx; margin-left: 12rpx; color: #fff; }
.cert-badge.ok { background: $sg-primary; }
.cert-badge.pending { background: $sg-gold; }
.cert-did { font-size: 21rpx; color: $sg-text-3; margin-top: 6rpx; word-break: break-all; }
.cert-go { font-size: 24rpx; color: $sg-primary; }
.cert-btn { padding: 14rpx 30rpx; border-radius: 999rpx; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; font-size: 26rpx; font-weight: 600; }
.wallet { display: flex; margin-top: 20rpx; }
.w { flex: 1; text-align: center; }
.wn { font-size: 34rpx; font-weight: 800; color: $sg-primary; display: block; }
.wl { font-size: 22rpx; color: $sg-text-3; }
.ally-entry { display: flex; align-items: center; margin: 20rpx 24rpx 0; padding: 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #fff6e6, #fff); border: 2rpx solid #f0dcae; box-shadow: $sg-shadow; }
.al-ic { font-size: 44rpx; margin-right: 14rpx; }
.al-i { flex: 1; display: flex; flex-direction: column; }
.al-t { font-size: 26rpx; font-weight: 800; color: #b5791b; }
.al-s { font-size: 19rpx; color: $sg-text-3; margin-top: 4rpx; line-height: 1.4; }
.al-go { font-size: 23rpx; color: #c8871f; }
.grid { display: flex; flex-wrap: wrap; padding: 20rpx 0; }
.g { width: 25%; display: flex; flex-direction: column; align-items: center; padding: 20rpx 0; font-size: 23rpx; color: $sg-text-2; }
.gi { font-size: 50rpx; margin-bottom: 8rpx; }
.admin-entry { display: flex; align-items: center; margin: 20rpx 24rpx; padding: 24rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #334155, #1e293b); box-shadow: $sg-shadow; }
.ae-ic { width: 72rpx; height: 72rpx; border-radius: 20rpx; background: rgba(255,255,255,0.16); display: flex; align-items: center; justify-content: center; font-size: 40rpx; margin-right: 18rpx; }
.ae-info { flex: 1; display: flex; flex-direction: column; }
.ae-t { font-size: 28rpx; font-weight: 700; color: #fff; }
.ae-s { font-size: 20rpx; color: rgba(255,255,255,0.75); margin-top: 4rpx; }
.ae-go { font-size: 24rpx; color: $sg-gold; }
.list { padding: 0 24rpx; }
.li { display: flex; justify-content: space-between; padding: 28rpx 0; border-bottom: 2rpx solid $sg-border; font-size: 28rpx; }
.li:last-child { border-bottom: none; }
.ar { color: $sg-text-3; }
</style>
