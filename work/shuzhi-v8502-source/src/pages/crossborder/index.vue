<script setup lang="ts">
import { computed } from "vue";
import { cbHubs, cbFuncs } from "@/mock/crossborder";
import { useUserStore } from "@/store/user";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const user = useUserStore();
const settledHub = computed(() => cbHubs.find((x) => x.key === user.hubKey));

const deals = [
  { dir: "出口", emoji: "🍊", title: "赣南脐橙 → 东南亚", qty: "80 吨", route: "海南枢纽", cny: "数字人民币结算" },
  { dir: "进口", emoji: "🥥", title: "泰国椰青 → 上海分销", qty: "12 柜", route: "上海枢纽", cny: "数字人民币结算" },
  { dir: "出口", emoji: "🌰", title: "新疆巴旦木 → 中亚五国", qty: "45 吨", route: "新疆枢纽", cny: "数字人民币结算" },
];

function blocked() { uni.showModal({ title: "跨境服务未接入", content: "正式环境跨境业务必须接入海关、物流、结算和合规审核后台，当前未开放本地示例流程。", showCancel: false }); }
function hub(key: string) { if (productionBuild) return blocked(); uni.navigateTo({ url: `/pages/crossborder/hub?key=${key}` }); }
function compare() { if (productionBuild) return blocked(); uni.navigateTo({ url: "/pages/crossborder/compare" }); }
function func(key: string) { if (productionBuild) return blocked(); uni.navigateTo({ url: `/pages/crossborder/func?key=${key}` }); }
function workflow(url: string) { if (productionBuild) return blocked(); uni.navigateTo({ url }); }
function settle() {
  if (productionBuild) return blocked();
  uni.showModal({
    title: "数字人民币跨境结算", showCancel: false, confirmText: "了解",
    content: "基于 Conflux 树图链，跨境货款以数字人民币实时清算，汇率锁定、全程可追溯、合规可控，替代传统电汇 T+3 到账。",
  });
}
</script>

<template>
  <view class="sg-page">
    <view class="hd">
      <view class="hd-row"><text class="globe">🌐</text><text class="brand">买全球 · 卖全球</text></view>
      <text class="hd-title">跨境贸易专区</text>
      <text class="hd-sub">五大区域枢纽 · 数字人民币跨境结算 · 一带一路</text>
      <view v-if="!productionBuild" class="stats">
        <view class="st"><text class="sn">5</text><text class="sl">区域枢纽</text></view>
        <view class="st"><text class="sn">100</text><text class="sl">海外仓</text></view>
        <view class="st"><text class="sn">30</text><text class="sl">一带一路国</text></view>
      </view>
    </view>

    <!-- 进驻状态 -->
    <view class="settle-banner" :class="{ done: settledHub }" @tap="settledHub ? hub(settledHub.key) : hub('hainan')">
      <text class="sb-ic">{{ settledHub ? '🏛️' : '📌' }}</text>
      <view class="sb-m">
        <text class="sb-t">{{ settledHub ? ('已进驻 · ' + settledHub.name) : '国际贸易须先进驻区域枢纽' }}</text>
        <text class="sb-s">{{ settledHub ? '享政策红利 · 遵管理制度 · 可开展跨境业务' : '进驻后享政策红利与管理制度，方可开展跨境业务' }}</text>
      </view>
      <text class="sb-go">{{ settledHub ? '查看 ›' : '去进驻 ›' }}</text>
    </view>

    <view class="cny-card" @tap="settle">
      <view class="cny-l"><text class="cny-ic">💴</text></view>
      <view class="cny-m">
        <text class="cny-t">数字人民币跨境结算</text>
        <text class="cny-s">基于 Conflux 链 · 实时清算 · 汇率锁定 · 合规可控</text>
      </view>
      <text class="cny-go">详情 ›</text>
    </view>

    <view class="export-entry" @tap="workflow('/pages/crossborder/export')">
      <text class="ee-ic">📦</text>
      <view class="ee-i"><text class="ee-t">出口订单全流程</text><text class="ee-d">询盘→报价→报关→冷链→结汇→退税→海外仓</text></view>
      <text class="ee-go">进入 ›</text>
    </view>

    <view class="export-entry import" @tap="workflow('/pages/crossborder/import')">
      <text class="ee-ic">📥</text>
      <view class="ee-i"><text class="ee-t">进口分销全流程</text><text class="ee-d">海外选品→物流→报关检疫→保税入仓→数币结算→国内分销</text></view>
      <text class="ee-go">进入 ›</text>
    </view>

    <view class="export-entry tax" @tap="workflow('/pages/crossborder/tax')">
      <text class="ee-ic">🧮</text>
      <view class="ee-i"><text class="ee-t">跨境税费测算</text><text class="ee-d">进口关税+增值税+消费税·到岸成本 / 出口退税额，一键算</text></view>
      <text class="ee-go">测算 ›</text>
    </view>

    <view v-if="!productionBuild" class="sec-t">五大区域枢纽<text class="sec-more" @tap.stop="compare">五大枢纽对比 ›</text></view>
    <view v-if="!productionBuild" class="hub" v-for="h in cbHubs" :key="h.key" @tap="hub(h.key)">
      <view class="hub-badge" :class="{ core: h.core }">{{ h.short }}</view>
      <view class="hub-i">
        <view class="hub-top"><text class="hub-n">{{ h.name }}</text><text v-if="h.core" class="hub-core">核心</text></view>
        <text class="hub-r">{{ h.region }} · {{ h.channel }}</text>
      </view>
      <view class="hub-right"><text class="hub-flow">{{ h.flow }}</text><text class="hub-go">›</text></view>
    </view>

    <view v-if="!productionBuild" class="sec-t">核心功能<text class="sec-hint">点击体验流程</text></view>
    <view v-if="!productionBuild" class="funcs">
      <view class="f" v-for="f in cbFuncs" :key="f.key" @tap="func(f.key)">
        <view class="f-ic">{{ f.icon }}</view><text class="f-lb">{{ f.name }}</text>
      </view>
    </view>

    <view v-if="!productionBuild" class="sec-t">跨境交易动态</view>
    <view v-if="!productionBuild" class="deal" v-for="d in deals" :key="d.title" @tap="func('customs')">
      <text class="d-emoji">{{ d.emoji }}</text>
      <view class="d-i">
        <view class="d-top"><text class="d-dir" :class="d.dir === '出口' ? 'out' : 'in'">{{ d.dir }}</text><text class="d-t">{{ d.title }}</text></view>
        <text class="d-m">{{ d.qty }} · {{ d.route }} · {{ d.cny }}</text>
      </view>
    </view>

    <view v-if="productionBuild" class="backend-note">正式环境跨境枢纽、订单动态、税费和结算数据由后台及合作机构接口返回；未完成联调前，已隐藏本地示例数据。</view>

    <view class="tip">🔗 依托海南、上海、新疆、东北、河南五大枢纽，海关单一窗口对接，跨境数据全程上链存证</view>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, #1e5fa8, #133f73); padding: 40rpx 28rpx 30rpx; color: #fff; }
.hd-row { display: flex; align-items: center; }
.globe { font-size: 32rpx; margin-right: 10rpx; }
.brand { font-size: 24rpx; opacity: 0.92; }
.hd-title { font-size: 36rpx; font-weight: 800; display: block; margin-top: 14rpx; }
.hd-sub { font-size: 22rpx; opacity: 0.88; margin-top: 8rpx; display: block; }
.stats { display: flex; margin-top: 26rpx; }
.st { flex: 1; text-align: center; }
.sn { font-size: 44rpx; font-weight: 800; display: block; }
.sl { font-size: 20rpx; opacity: 0.85; }

.settle-banner { display: flex; align-items: center; margin: -16rpx 24rpx 0; background: linear-gradient(135deg, #fff4e0, #fff); border: 2rpx solid #f0dcae; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.settle-banner.done { background: linear-gradient(135deg, #e9f9f1, #fff); border-color: #bfe9d4; }
.sb-ic { font-size: 44rpx; margin-right: 16rpx; }
.sb-m { flex: 1; display: flex; flex-direction: column; }
.sb-t { font-size: 26rpx; font-weight: 700; }
.sb-s { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.sb-go { font-size: 23rpx; color: $sg-gold; }
.settle-banner.done .sb-go { color: $sg-primary; }

.cny-card { display: flex; align-items: center; margin: 20rpx 24rpx 0; background: linear-gradient(135deg, #fff, #eef5ff); border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.export-entry { display: flex; align-items: center; margin: 20rpx 24rpx 0; padding: 22rpx; background: linear-gradient(135deg, #1e5fa8, #133f73); border-radius: $sg-radius-lg; box-shadow: $sg-shadow; }
.export-entry.import { background: linear-gradient(135deg, #2f9e5b, #0f6b3b); }
.ee-ic { font-size: 44rpx; margin-right: 16rpx; }
.ee-i { flex: 1; display: flex; flex-direction: column; }
.ee-t { font-size: 27rpx; font-weight: 700; color: #fff; }
.ee-d { font-size: 20rpx; color: rgba(255,255,255,0.82); margin-top: 2rpx; }
.ee-go { font-size: 22rpx; color: #fff; }
.cny-ic { font-size: 56rpx; margin-right: 18rpx; }
.cny-m { flex: 1; display: flex; flex-direction: column; }
.cny-t { font-size: 28rpx; font-weight: 700; color: #1e5fa8; }
.cny-s { font-size: 21rpx; color: $sg-text-3; margin-top: 4rpx; }
.cny-go { font-size: 24rpx; color: #1e5fa8; }

.sec-t { font-size: 30rpx; font-weight: 700; padding: 30rpx 28rpx 14rpx; }
.sec-hint { font-size: 20rpx; color: $sg-text-3; font-weight: 400; margin-left: 14rpx; }
.sec-more { font-size: 22rpx; color: #1e5fa8; font-weight: 600; float: right; }
.hub { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 16rpx; padding: 22rpx; }
.hub-badge { width: 72rpx; height: 72rpx; border-radius: 20rpx; background: #dbeafe; color: #1e5fa8; display: flex; align-items: center; justify-content: center; font-size: 34rpx; font-weight: 800; margin-right: 20rpx; }
.hub-badge.core { background: linear-gradient(135deg, #1e5fa8, #133f73); color: #fff; }
.hub-i { flex: 1; display: flex; flex-direction: column; }
.hub-top { display: flex; align-items: center; }
.hub-n { font-size: 28rpx; font-weight: 700; }
.hub-core { font-size: 19rpx; color: #fff; background: $sg-gold; padding: 2rpx 12rpx; border-radius: 999rpx; margin-left: 12rpx; }
.hub-r { font-size: 22rpx; color: $sg-text-3; margin-top: 4rpx; }
.hub-right { display: flex; align-items: center; }
.hub-flow { font-size: 21rpx; color: #1e5fa8; }
.hub-go { font-size: 30rpx; color: $sg-text-3; margin-left: 10rpx; }

.funcs { display: flex; flex-wrap: wrap; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx; padding: 20rpx 8rpx; }
.f { width: 33.33%; display: flex; flex-direction: column; align-items: center; padding: 18rpx 0; }
.f-ic { width: 84rpx; height: 84rpx; border-radius: 24rpx; background: #eef5ff; display: flex; align-items: center; justify-content: center; font-size: 44rpx; }
.f-lb { font-size: 22rpx; color: $sg-text-2; margin-top: 10rpx; }

.deal { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 16rpx; padding: 20rpx; }
.d-emoji { width: 84rpx; height: 84rpx; border-radius: $sg-radius; background: #eef5ff; display: flex; align-items: center; justify-content: center; font-size: 48rpx; margin-right: 18rpx; }
.d-i { flex: 1; display: flex; flex-direction: column; }
.d-top { display: flex; align-items: center; }
.d-dir { font-size: 19rpx; color: #fff; padding: 2rpx 12rpx; border-radius: 6rpx; margin-right: 10rpx; }
.d-dir.out { background: $sg-primary; }
.d-dir.in { background: #1e5fa8; }
.d-t { font-size: 26rpx; font-weight: 600; }
.d-m { font-size: 21rpx; color: $sg-text-3; margin-top: 4rpx; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
.backend-note { margin: 24rpx; padding: 22rpx; border-radius: $sg-radius-lg; background: #fff7ed; border: 2rpx solid #fed7aa; color: #9a3412; font-size: 23rpx; line-height: 1.6; }
</style>
