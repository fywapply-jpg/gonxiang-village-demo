<script setup lang="ts">
import { dividend as d } from "@/mock";
const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
function withdraw() {
  if (productionBuild) return uni.showModal({ title: "需要持牌结算服务", content: "正式环境的收益提现必须由后台审核并由银行/支付机构返回受理结果，当前未提交提现。", showCancel: false });
  uni.showModal({ title: "收益提现", content: `提现 ¥${d.total} 至数字人民币钱包 / 微信钱包？`,
    confirmText: "确认提现", success: (r) => { if (r.confirm) uni.showToast({ title: "提现申请已提交", icon: "success" }); } });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="hl">全民分红 · 累计收益（元）</text>
      <text class="amt">{{ d.total.toFixed(2) }}</text>
      <view class="wbtn" @tap="withdraw">一键提现</view>
    </view>

    <view class="rule sg-card">
      <text class="rt">💡 分红规则</text>
      <text class="rc">{{ d.rule }}</text>
    </view>

    <view class="sg-card">
      <text class="st">到账记录</text>
      <view class="rec" v-for="(r, i) in d.records" :key="i">
        <view class="ri"><text class="rp">{{ r.period }} · {{ r.type }}</text><text class="rtm">{{ r.time }} · 链上 {{ r.hash }}</text></view>
        <text class="ra">+{{ r.amount.toFixed(2) }}</text>
      </view>
    </view>
    <view class="tip">🔗 分红资金按规则自动发放至链上账户，全程可追溯。</view>
    <view class="tip">⚠️ 合规说明：分红来源于<text style="font-weight:700">平台经营盈余按章分配</text>，金额随经营情况浮动；<text style="font-weight:700">不承诺固定收益、不保本、非投资理财产品，也不构成任何存款或集资</text>。</view>
    <view class="fin-lic">🏛️ 分红发放、提现等资金业务由持牌支付/金融机构办理，平台不吸收存款、不放贷、不触碰资金、不设资金池。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, $sg-red, #b5322e); padding: 50rpx 28rpx; display: flex; flex-direction: column; align-items: center; color: #fff; }
.hl { font-size: 24rpx; opacity: 0.9; }
.amt { font-size: 88rpx; font-weight: 800; line-height: 1.2; }
.wbtn { background: #fff; color: $sg-red; font-weight: 700; padding: 18rpx 70rpx; border-radius: 999rpx; font-size: 28rpx; margin-top: 20rpx; }
.rule { background: linear-gradient(135deg, $sg-gold-light, #fff); }
.rt { font-size: 27rpx; font-weight: 700; display: block; margin-bottom: 10rpx; }
.rc { font-size: 24rpx; color: $sg-text-2; line-height: 1.6; }
.st { font-size: 28rpx; font-weight: 700; display: block; margin-bottom: 10rpx; }
.rec { display: flex; justify-content: space-between; align-items: center; padding: 18rpx 0; border-top: 2rpx solid $sg-border; }
.ri { display: flex; flex-direction: column; }
.rp { font-size: 26rpx; font-weight: 600; }
.rtm { font-size: 21rpx; color: $sg-text-3; margin-top: 4rpx; }
.ra { font-size: 30rpx; font-weight: 700; color: $sg-primary; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; }
</style>
