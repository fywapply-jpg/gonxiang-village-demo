<script setup lang="ts">
import { recordPlatformEvent } from "@/services/localApi";
const routes = [
  { icon: "🔐", t: "主体认证", d: "企业法人、经办授权、角色权限先核验", url: "/pages/register/index", tab: false },
  { icon: "🛒", t: "供需交易", d: "供货、采购、报价、交易包从交易大厅进入", url: "/pages/trade/index", tab: true },
  { icon: "💳", t: "资金与对账", d: "合同、物流、发票、资金四流一致后办理", url: "/pages/finance/fourflow", tab: false },
  { icon: "🔍", t: "扫码溯源", d: "按批次查看生产、检测、流通和签收证据", url: "/pages/trace/scan", tab: true },
  { icon: "📑", t: "订单农业", d: "需求归集、产能匹配、合同履约与验收", url: "/pages/agri/contract", tab: false },
  { icon: "💰", t: "供应链金融", d: "金融产品信息、申请入口和持牌机构办理", url: "/pages/finance/index", tab: true },
  { icon: "🌐", t: "跨境贸易", d: "准入、单证、物流、结算和售后协同", url: "/pages/crossborder/index", tab: false },
  { icon: "🏘️", t: "民生终端", d: "数智供社民生服务和本地协同入口", url: "/pages/village/index", tab: false },
  { icon: "🛠️", t: "管理中心", d: "授权账号按岗位处理审核、运营、财务和客服", url: "/pages/admin/index", tab: false },
];
function go(r: any) { void recordPlatformEvent("mine", "OPEN_SERVICE_GUIDE", { title: r.title, url: r.url }).catch(() => {}); r.tab ? uni.switchTab({ url: r.url }) : uni.navigateTo({ url: r.url }); }
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="name">数智供社</text>
      <text class="ver">企业供应链 + 金融服务</text>
      <text class="sub">数智供社企业端与民生终端能力</text>
    </view>

    <view class="sg-card">
      <text class="ct">🧭 服务导览</text>
      <text class="cs">按真实业务顺序进入，不同身份看到不同权限</text>
      <view class="r" v-for="(r, i) in routes" :key="i" @tap="go(r)">
        <text class="r-no">{{ i + 1 }}</text>
        <text class="r-ic">{{ r.icon }}</text>
        <view class="r-i"><text class="r-t">{{ r.t }}</text><text class="r-d">{{ r.d }}</text></view>
        <text class="r-go">›</text>
      </view>
    </view>

    <view class="sg-card">
      <text class="ct">ℹ️ 关于数智供社</text>
      <view class="li"><text class="k">形态</text><text class="v">uni-app 一套代码 → H5 + 微信小程序</text></view>
      <view class="li"><text class="k">定位</text><text class="v">数智供社企业采购、供货、履约和金融服务能力</text></view>
      <view class="li"><text class="k">数据</text><text class="v">企业主体、授权、订单、合同、物流、发票和资金证据协同</text></view>
      <view class="li"><text class="k">合规</text><text class="v">金融仅提供信息与申请入口，资金由持牌机构办理</text></view>
    </view>
    <view class="tip">平台不自营支付清算、不设资金池、不承诺收益；具体交易、融资、保险和结算以合同、机构回单和服务端审核结果为准。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, $sg-primary, $sg-primary-deep); padding: 44rpx 28rpx 34rpx; display: flex; flex-direction: column; align-items: center; color: #fff; }
.logo { width: 130rpx; height: 130rpx; background: #fff; border-radius: 28rpx; padding: 12rpx; }
.name { font-size: 38rpx; font-weight: 800; letter-spacing: 4rpx; margin-top: 18rpx; }
.ver { font-size: 24rpx; opacity: 0.95; margin-top: 8rpx; }
.sub { font-size: 21rpx; opacity: 0.82; margin-top: 6rpx; }
.ct { font-size: 28rpx; font-weight: 700; display: block; }
.cs { font-size: 21rpx; color: $sg-text-3; display: block; margin: 6rpx 0 12rpx; }
.r { display: flex; align-items: center; padding: 16rpx 0; border-top: 2rpx solid $sg-border; }
.r-no { width: 40rpx; height: 40rpx; border-radius: 50%; background: $sg-primary-light; color: $sg-primary; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 700; margin-right: 14rpx; }
.r-ic { font-size: 34rpx; margin-right: 14rpx; }
.r-i { flex: 1; display: flex; flex-direction: column; }
.r-t { font-size: 27rpx; font-weight: 600; }
.r-d { font-size: 21rpx; color: $sg-text-3; margin-top: 2rpx; }
.r-go { font-size: 30rpx; color: $sg-text-3; }
.li { display: flex; padding: 12rpx 0; border-top: 2rpx solid $sg-border; }
.li:first-of-type { border-top: none; }
.k { width: 100rpx; color: $sg-text-3; font-size: 25rpx; }
.v { flex: 1; font-size: 25rpx; }
.tip { margin: 24rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
</style>
