<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { payMethods } from "@/utils/pay";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const r = ref({ ok: true, method: "wechat", amount: 0, no: "", trade: "" });
onLoad((q) => {
  if (productionBuild) {
    // 生产环境不能信任 URL 上的 ok、amount 或 trade 参数；支付事实必须来自后台/持牌机构回执。
    r.value = { ok: false, method: "bank", amount: 0, no: String(q?.no || ""), trade: "" };
    return;
  }
  r.value = {
    ok: q?.ok === "1",
    method: q?.method || "wechat",
    amount: q?.amount ? Number(q.amount) : 0,
    no: q?.no || "",
    trade: q?.trade || "",
  };
});
const methodName = () => (payMethods.find((m) => m.key === r.value.method) || payMethods[0]).name;

function orders() { uni.redirectTo({ url: "/pages/trade/orders" }); }
function home() { uni.switchTab({ url: "/pages/home/index" }); }
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty">
      <text class="production-empty-title">支付结果待后台回执</text>
      <text class="production-empty-text">正式环境不会根据页面参数显示“支付成功”。请返回订单详情，等待银行/持牌支付机构异步回调、流水核对和后台状态更新；未收到回执前不视为已付款。</text>
      <text v-if="r.no" class="production-empty-order">订单号：{{ r.no }}</text>
      <view class="production-empty-btn" @tap="orders">查看订单状态</view>
    </view>
    <template v-else>
    <view class="head" :class="{ fail: !r.ok }">
      <text class="ic">{{ r.ok ? '✅' : '❌' }}</text>
      <text class="t">{{ r.ok ? '支付成功' : '支付失败' }}</text>
      <text class="amt">¥{{ r.amount.toLocaleString() }}</text>
    </view>

    <view class="sg-card">
      <view class="row"><text class="k">支付方式</text><text class="v">{{ methodName() }}</text></view>
      <view class="row"><text class="k">订单号</text><text class="v">{{ r.no }}</text></view>
      <view class="row"><text class="k">交易单号</text><text class="v">{{ r.trade }}</text></view>
      <view class="row"><text class="k">资金通道</text><text class="v">依所选银行/持牌支付机构实际产品和回单确认</text></view>
      <view class="row"><text class="k">交易存证</text><text class="v link">支付结果已记录 · 可核验</text></view>
    </view>

    <view class="tip">🔒 本页展示支付机构返回结果。正式系统必须以后端异步回调、银行/支付机构回单和对账结果为准，不能只凭手机前端“支付成功”改变订单状态。平台不接收货款、不设资金池、不做二清。</view>

    <view class="btns">
      <view class="btn ghost" @tap="home">返回首页</view>
      <view class="btn" @tap="orders">查看订单</view>
    </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.head { background: linear-gradient(160deg, $sg-primary, $sg-primary-deep); padding: 70rpx 28rpx 50rpx; display: flex; flex-direction: column; align-items: center; color: #fff; }
.head.fail { background: linear-gradient(160deg, $sg-red, #b5322e); }
.ic { font-size: 100rpx; }
.t { font-size: 36rpx; font-weight: 800; margin-top: 16rpx; }
.amt { font-size: 56rpx; font-weight: 800; margin-top: 10rpx; }
.row { display: flex; padding: 16rpx 0; border-top: 2rpx solid $sg-border; }
.row:first-child { border-top: none; }
.k { width: 160rpx; color: $sg-text-3; font-size: 26rpx; }
.v { flex: 1; font-size: 26rpx; }
.v.link { color: $sg-blue; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
.btns { display: flex; gap: 20rpx; margin: 10rpx 24rpx; }
.btn { flex: 1; text-align: center; padding: 24rpx 0; border-radius: 999rpx; font-size: 30rpx; font-weight: 700; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; }
.btn.ghost { background: $sg-primary-light; color: $sg-primary; }
.production-empty { margin: 40rpx 24rpx; padding: 34rpx 28rpx; border: 2rpx solid #d8e7de; border-radius: 22rpx; background: #f7fbf8; }
.production-empty-title { display: block; color: #145d3c; font-size: 32rpx; font-weight: 900; }
.production-empty-text { display: block; margin-top: 16rpx; color: #5e7167; font-size: 24rpx; line-height: 1.7; }
.production-empty-order { display: block; margin-top: 14rpx; color: #496458; font-size: 23rpx; }
.production-empty-btn { margin-top: 24rpx; padding: 20rpx; border-radius: 999rpx; background: #16884c; color: #fff; text-align: center; font-size: 27rpx; font-weight: 700; }
</style>
