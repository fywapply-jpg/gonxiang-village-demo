<script setup lang="ts">
const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const products = [
  { name: "种植保险", icon: "🌾", desc: "自然灾害/病虫害减产保障", premium: "8 元/亩起" },
  { name: "货运险", icon: "🚚", desc: "运输途中货损、冷链失温保障", premium: "0.3% 货值" },
  { name: "质量责任险", icon: "🛡️", desc: "农产品质量安全责任保障", premium: "面议" },
];
function insure(n: string) {
  if (productionBuild) return uni.showModal({ title: "需要保险机构接入", content: "正式环境的投保必须由持牌保险机构返回保单号、保费和承保状态，当前未提交投保。", showCancel: false });
  uni.showModal({ title: "在线投保", content: `投保「${n}」，跳转持牌保险机构办理？`,
    success: (r) => { if (r.confirm) uni.showToast({ title: "投保申请已提交", icon: "success" }); } });
}
function claim() {
  if (productionBuild) return uni.showModal({ title: "需要保险理赔接口", content: "正式环境的理赔必须绑定保单、定损证据和保险机构回执，当前未提交理赔。", showCancel: false });
  uni.showModal({ title: "申请理赔", content: "选择出险保单，上传定损凭证（灾情/价格触发数据自动核验），跳转持牌保险机构办理理赔？",
    confirmText: "提交理赔", success: (r) => { if (r.confirm) uni.showToast({ title: "理赔申请已提交", icon: "success" }); } });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero"><text class="ht">农业保险服务</text><text class="hs">在线投保 · 快速理赔 · 保单进度可查</text></view>
    <view class="card" v-for="p in products" :key="p.name">
      <text class="ic">{{ p.icon }}</text>
      <view class="body"><text class="nm">{{ p.name }}</text><text class="desc">{{ p.desc }}</text><text class="pm">保费 {{ p.premium }}</text></view>
      <view class="btn" @tap="insure(p.name)">投保</view>
    </view>
    <view class="sg-card claim">
      <view class="sg-between"><text class="ct">我的保单 · 理赔</text><text class="cbtn" @tap="claim">申请理赔 ›</text></view>
      <view class="policy"><text>种植保险 · 320 亩脐橙</text><text class="ps ok">保障中</text></view>
      <view class="policy"><text>货运险 · 运单 …0781</text><text class="ps ok">保障中</text></view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, $sg-blue, #1e4f80); padding: 40rpx 28rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 22rpx; opacity: 0.9; margin-top: 6rpx; display: block; }
.card { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 24rpx 24rpx 0; padding: 24rpx; }
.ic { font-size: 60rpx; margin-right: 20rpx; }
.body { flex: 1; display: flex; flex-direction: column; }
.nm { font-size: 28rpx; font-weight: 700; }
.desc { font-size: 22rpx; color: $sg-text-3; margin: 4rpx 0; }
.pm { font-size: 24rpx; color: $sg-red; }
.btn { padding: 16rpx 32rpx; background: $sg-blue; color: #fff; border-radius: 999rpx; font-size: 26rpx; }
.claim { margin-top: 24rpx; }
.ct { font-size: 28rpx; font-weight: 700; }
.cbtn { font-size: 24rpx; color: $sg-blue; }
.policy { display: flex; justify-content: space-between; padding: 16rpx 0; border-top: 2rpx solid $sg-border; font-size: 25rpx; }
.ps.ok { color: $sg-primary; }
</style>
