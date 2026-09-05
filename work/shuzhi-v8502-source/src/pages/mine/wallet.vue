<script setup lang="ts">
import { recordPlatformEvent } from "@/services/localApi";
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const flows = [
  { t: "订单货款到账 O240620", a: 11200, time: "06-18 14:20" },
  { t: "Q2 全民分红", a: 806.5, time: "06-30 00:05" },
  { t: "农资集采支付", a: -11200, time: "06-15 09:41" },
  { t: "融资放款 订单贷", a: 138000, time: "06-12 16:30" },
];
function withdraw() {
  if (productionBuild) return uni.showModal({ title: "暂不可提现", content: "余额、可提现金额和收款账户必须由后台及持牌机构返回，正式环境不会使用演示流水。", showCancel: false });
  void recordPlatformEvent("mine", "REQUEST_WITHDRAWAL", {}).catch(() => {});
  uni.showModal({ title: "提现", content: "可提现余额 ¥24,860.00\n提现至已绑定的对公账户 / 数字人民币钱包，T+1 到账、免手续费。", confirmText: "确认提现",
    success: (r) => { if (r.confirm) uni.showToast({ title: "提现申请已提交", icon: "success" }); } });
}
function recharge() {
  if (productionBuild) return uni.showModal({ title: "暂不支持充值", content: "平台不提供储值充值；交易货款须按订单合同由同名对公账户进入监管结算，具体以后台支付指令为准。", showCancel: false });
  void recordPlatformEvent("mine", "OPEN_RECHARGE_GUIDE", {}).catch(() => {});
  uni.showModal({ title: "付款说明", content: "B2B货款及保证金须由交易主体同名对公账户支付至主办银行监管专户或持牌机构备付金账户。平台不提供储值充值、不接收交易货款。", confirmText: "知道了",
    success: (r) => { if (r.confirm) uni.showToast({ title: "已生成充值单", icon: "success" }); } });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="hl">账户余额（元）</text>
      <text class="amt">{{ productionBuild ? '—' : '24,860.00' }}</text>
      <view class="btns"><view class="b" @tap="withdraw">提现</view><view class="b ghost" @tap="recharge">充值</view></view>
    </view>
    <view class="pay sg-card">
      <text class="pt">结算方式</text>
      <view class="pms"><text class="pm">💴 数字人民币</text><text class="pm">🟢 微信支付</text><text class="pm">🏦 对公转账</text></view>
    </view>
    <view class="sg-card">
      <text class="st">交易流水</text>
      <view v-if="!productionBuild" class="fl" v-for="(f, i) in flows" :key="i">
        <view class="fi"><text class="ft">{{ f.t }}</text><text class="ftm">{{ f.time }}</text></view>
        <text class="fa" :class="{ pos: f.a > 0 }">{{ f.a > 0 ? '+' : '' }}{{ f.a.toLocaleString() }}</text>
      </view>
      <view v-if="productionBuild" class="empty">暂无后台资金流水；订单货款、监管入金和分账结果须由持牌机构回传。</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, $sg-primary, $sg-primary-deep); padding: 50rpx 28rpx; color: #fff; display: flex; flex-direction: column; align-items: center; }
.hl { font-size: 24rpx; opacity: 0.9; }
.amt { font-size: 76rpx; font-weight: 800; }
.btns { display: flex; gap: 24rpx; margin-top: 20rpx; }
.b { background: #fff; color: $sg-primary; padding: 16rpx 60rpx; border-radius: 999rpx; font-size: 28rpx; font-weight: 700; }
.b.ghost { background: rgba(255,255,255,0.2); color: #fff; }
.pt { font-size: 26rpx; font-weight: 700; display: block; margin-bottom: 14rpx; }
.pms { display: flex; gap: 16rpx; }
.pm { font-size: 24rpx; background: $sg-bg; padding: 12rpx 20rpx; border-radius: 999rpx; }
.st { font-size: 28rpx; font-weight: 700; display: block; margin-bottom: 10rpx; }
.fl { display: flex; justify-content: space-between; align-items: center; padding: 18rpx 0; border-top: 2rpx solid $sg-border; }
.fi { display: flex; flex-direction: column; }
.ft { font-size: 26rpx; }
.ftm { font-size: 21rpx; color: $sg-text-3; margin-top: 4rpx; }
.fa { font-size: 28rpx; font-weight: 700; color: $sg-text; }
.fa.pos { color: $sg-primary; }
</style>
