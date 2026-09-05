<script setup lang="ts">
import { ref } from "vue";
import { SPLIT, promoEligibility, promoDuties, promoKpis, promoFlow, promoOrgs } from "@/mock/promo";
const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
function nav(u: string) { uni.navigateTo({ url: u }); }
const step = ref(0);
const running = ref(false);
function run() {
  if (productionBuild) return uni.showModal({ title: "需要后台推广服务", content: "正式环境的推广组织、服务验收、佣金台账和结算回单必须由后台及持牌机构返回，当前未播放本地流程。", showCancel: false });
  running.value = true; step.value = 0; const t = setInterval(() => { step.value++; if (step.value >= promoFlow.length) clearInterval(t); }, 460);
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🤝 小B端推广服务体系</text>
      <text class="hs">村社集体控股组织推广 · 独立推广服务费按生效合同结算 · 关系维护 + 舆情处理 + 考核</text>
    </view>

    <!-- 4:6 分成图示 -->
    <view class="split">
      <text class="sp-t">推广服务费示例 · 平台 4 : 推广组织 6</text>
      <view class="sp-bar">
        <view class="sp-plat" :style="{ flex: SPLIT.platform }"><text>平台 {{ SPLIT.platform }}%</text></view>
        <view class="sp-org" :style="{ flex: SPLIT.org }"><text>推广组织 {{ SPLIT.org }}%</text></view>
      </view>
      <text class="sp-s">仅在单独签署推广服务合同、服务验收、开票并取得持牌结算回单后，才按约定比例结算；4:6 仅为当前演示示例，不代表所有订单统一规则。</text>
      <text class="sp-compliance">✅ 合规底线：佣金仅结算给<text style="font-weight:700">直接推广的组织（一级）</text>，<text style="font-weight:700">基于小端真实交易额</text>计算；<text style="font-weight:700">不发展下线、不逐级返利、不收取任何入门费</text>——与传销划清界限。</text>
    </view>

    <!-- 快捷入口 -->
    <view class="entries">
      <view class="en" @tap="nav('/pages/promo/org')"><text class="en-ic">🏘️</text><text class="en-t">推广组织</text></view>
      <view class="en" @tap="nav('/pages/promo/promoter')"><text class="en-ic">🧑‍🌾</text><text class="en-t">推广员工作台</text></view>
      <view class="en" @tap="nav('/pages/promo/commission')"><text class="en-ic">💰</text><text class="en-t">佣金台账</text></view>
      <view class="en" @tap="nav('/pages/promo/dividend')"><text class="en-ic">🧧</text><text class="en-t">系数·分红</text></view>
      <view class="en" @tap="nav('/pages/promo/opinion')"><text class="en-ic">📣</text><text class="en-t">关系·舆情</text></view>
    </view>

    <!-- 资质门槛 -->
    <view class="sec">谁能做推广组织（资质门槛）</view>
    <view class="sg-card">
      <view class="badge-row"><text class="req-badge">必须 · 集体控股</text></view>
      <view class="el" v-for="(e, i) in promoEligibility" :key="i"><text class="el-n">{{ i + 1 }}</text><text class="el-t">{{ e }}</text></view>
    </view>

    <!-- 六大职责 -->
    <view class="sec">推广组织六大职责</view>
    <view class="duties">
      <view class="duty" v-for="d in promoDuties" :key="d.t">
        <text class="d-ic">{{ d.icon }}</text>
        <view class="d-i"><text class="d-t">{{ d.t }}</text><text class="d-d">{{ d.d }}</text></view>
      </view>
    </view>

    <!-- 考核指标 -->
    <view class="sec">考核指标（对组织 / 推广员）</view>
    <view class="sg-card">
      <view class="kpi" v-for="k in promoKpis" :key="k.name">
        <view class="k-top"><text class="k-n">{{ k.name }}</text><text class="k-w">权重 {{ k.weight }}%</text></view>
        <view class="k-bar"><view class="k-fill" :style="{ width: k.weight * 3 + '%' }"></view></view>
        <text class="k-t">目标：{{ k.target }}</text>
      </view>
      <text class="k-note">考核结果 → 定佣金系数、评级（A/B/C/D）、续约或退出。</text>
    </view>

    <!-- 完整流程 -->
    <view class="sec-row"><text class="sec">完整推广流程</text><text class="demo" @tap="run">查看流程</text></view>
    <view class="sg-card">
      <view class="fl" v-for="(f, i) in promoFlow" :key="i" :class="{ on: running && step > i }">
        <view class="fl-axis"><view class="fl-dot" :class="{ on: running && step > i }">{{ running && step > i ? '✓' : i + 1 }}</view><view v-if="i < promoFlow.length - 1" class="fl-line" :class="{ on: running && step > i + 1 }"></view></view>
        <view class="fl-i"><text class="fl-t">{{ f.t }}</text><text class="fl-d">{{ f.d }}</text></view>
      </view>
      <view v-if="running && step >= promoFlow.length" class="fl-done">✅ 推广服务合同、服务验收、开票、结算回单与考核评级形成闭环；比例以项目台账为准。</view>
    </view>

    <view class="tip">🔗 推荐关系、佣金分成、考核、舆情工单全程上链存证；推广组织须为村 / 社区 / 企业集体控股企业，收益反哺集体经济。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #2f9e5b, $sg-primary-deep); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 36rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; line-height: 1.5; }
.split { margin: 20rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.sp-t { font-size: 27rpx; font-weight: 800; }
.sp-bar { display: flex; height: 64rpx; border-radius: 14rpx; overflow: hidden; margin: 16rpx 0; }
.sp-plat { background: linear-gradient(135deg, #90a4b8, #64748b); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 24rpx; font-weight: 700; }
.sp-org { background: linear-gradient(135deg, #2fae6b, #16884c); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 24rpx; font-weight: 700; }
.sp-s { font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.sp-compliance { display: block; margin-top: 12rpx; padding: 12rpx 14rpx; background: $sg-primary-light; border-radius: $sg-radius; font-size: 20rpx; color: $sg-primary-deep; line-height: 1.6; }
.entries { display: flex; gap: 14rpx; margin: 16rpx 24rpx 0; }
.en { flex: 1; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 6rpx; display: flex; flex-direction: column; align-items: center; }
.en-ic { font-size: 40rpx; }
.en-t { font-size: 20rpx; margin-top: 6rpx; font-weight: 600; text-align: center; }
.sec { font-size: 30rpx; font-weight: 700; padding: 26rpx 28rpx 12rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 24rpx; }
.demo { font-size: 24rpx; color: $sg-primary; background: $sg-primary-light; padding: 8rpx 22rpx; border-radius: 999rpx; }
.sg-card { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.badge-row { margin-bottom: 12rpx; }
.req-badge { font-size: 21rpx; color: #fff; background: $sg-red; padding: 5rpx 18rpx; border-radius: 999rpx; font-weight: 700; }
.el { display: flex; align-items: flex-start; padding: 12rpx 0; border-top: 2rpx solid $sg-bg; }
.el:first-of-type { border-top: none; }
.el-n { width: 36rpx; height: 36rpx; flex-shrink: 0; border-radius: 50%; background: $sg-primary-light; color: $sg-primary; font-size: 20rpx; display: flex; align-items: center; justify-content: center; margin-right: 14rpx; font-weight: 700; }
.el-t { font-size: 23rpx; color: $sg-text-2; flex: 1; line-height: 1.5; }
.duties { display: flex; flex-wrap: wrap; gap: 14rpx; padding: 0 24rpx; }
.duty { width: calc(50% - 7rpx); box-sizing: border-box; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx; display: flex; }
.d-ic { font-size: 34rpx; margin-right: 12rpx; }
.d-i { flex: 1; display: flex; flex-direction: column; }
.d-t { font-size: 24rpx; font-weight: 700; }
.d-d { font-size: 18rpx; color: $sg-text-3; margin-top: 4rpx; line-height: 1.4; }
.kpi { padding: 14rpx 0; border-top: 2rpx solid $sg-bg; }
.kpi:first-child { border-top: none; }
.k-top { display: flex; justify-content: space-between; align-items: baseline; }
.k-n { font-size: 24rpx; font-weight: 600; }
.k-w { font-size: 21rpx; color: $sg-primary; font-weight: 700; }
.k-bar { height: 12rpx; background: $sg-bg; border-radius: 999rpx; margin: 8rpx 0; overflow: hidden; }
.k-fill { height: 100%; background: linear-gradient(90deg, #2fae6b, #16884c); border-radius: 999rpx; }
.k-t { font-size: 20rpx; color: $sg-text-3; }
.k-note { font-size: 21rpx; color: $sg-primary; background: $sg-primary-light; padding: 12rpx; border-radius: $sg-radius; margin-top: 12rpx; display: block; }
.fl { display: flex; opacity: 0.5; transition: opacity 0.3s; }
.fl.on { opacity: 1; }
.fl-axis { display: flex; flex-direction: column; align-items: center; margin-right: 20rpx; }
.fl-dot { width: 46rpx; height: 46rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; }
.fl-dot.on { background: $sg-primary; }
.fl-line { flex: 1; width: 4rpx; background: $sg-border; min-height: 22rpx; margin: 4rpx 0; }
.fl-line.on { background: $sg-primary; }
.fl-i { flex: 1; display: flex; flex-direction: column; padding-bottom: 22rpx; }
.fl-t { font-size: 25rpx; font-weight: 600; }
.fl-d { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; line-height: 1.4; }
.fl-done { font-size: 22rpx; color: $sg-primary; background: $sg-primary-light; padding: 16rpx; border-radius: $sg-radius; line-height: 1.6; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
</style>
