<script setup lang="ts">
import { ref, computed } from "vue";
import { promoOrgs, COEF, coefOf, ORG_ALLOC } from "@/mock/promo";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const idx = ref(0);
const o = computed(() => promoOrgs[idx.value]);
const tier = computed(() => coefOf(o.value.score));
const actual = computed(() => Math.round(o.value.baseComm * tier.value.k)); // 组织实发
const adjust = computed(() => actual.value - o.value.baseComm); // 平台激励让利(+) / 折减留存(-)
const promoterAmt = computed(() => Math.round(actual.value * ORG_ALLOC.promoter / 100));
const opsAmt = computed(() => Math.round(actual.value * ORG_ALLOC.ops / 100));
const collectiveAmt = computed(() => Math.round(actual.value * ORG_ALLOC.collective / 100));
const perHousehold = computed(() => Math.round(collectiveAmt.value / o.value.members));
const perYear = computed(() => perHousehold.value * 12);
const money = (n: number) => n.toLocaleString();
</script>

<template>
  <view class="sg-page">
    <view v-if="!productionBuild" class="hero">
      <view class="hero-top">
        <text class="ht">🧧 考核系数 · 集体分红反哺</text>
        <picker :range="promoOrgs.map(p => p.name)" @change="idx = Number($event.detail.value)">
          <text class="switch">切换组织 ▾</text>
        </picker>
      </view>
      <text class="hs">{{ o.name }} · {{ o.type }} {{ o.holding }}%</text>
    </view>

    <!-- 考核系数计算 -->
    <view v-if="!productionBuild" class="sec">① 考核评级 → 佣金系数</view>
    <view v-if="!productionBuild" class="sg-card">
      <view class="grade-row">
        <view class="g-badge" :class="'g-' + tier.grade">{{ tier.grade }}</view>
        <view class="g-i"><text class="g-score">考核 {{ o.score }} 分</text><text class="g-label">{{ tier.label }}</text></view>
        <text class="g-k">×{{ tier.k }}</text>
      </view>
      <view class="calc">
        <view class="cl"><text class="cl-k">基础组织分成（6成）</text><text class="cl-v">¥{{ money(o.baseComm) }}</text></view>
        <view class="cl"><text class="cl-k">考核系数</text><text class="cl-v">×{{ tier.k }}（{{ tier.grade }} 级）</text></view>
        <view class="cl hi"><text class="cl-k">组织实发</text><text class="cl-v big">¥{{ money(actual) }}</text></view>
        <view class="cl"><text class="cl-k">平台激励调节</text><text class="cl-v" :class="adjust >= 0 ? 'up' : 'down'">{{ adjust >= 0 ? '+' : '' }}¥{{ money(adjust) }}{{ adjust >= 0 ? '（让利）' : '（折减留存）' }}</text></view>
      </view>
    </view>

    <!-- 系数档位 -->
    <view v-if="!productionBuild" class="tiers">
      <view class="tier" v-for="t in COEF" :key="t.grade" :class="{ on: t.grade === tier.grade }">
        <text class="t-g">{{ t.grade }}</text><text class="t-k">×{{ t.k }}</text>
      </view>
    </view>

    <!-- 组织实发三分配 -->
    <view v-if="!productionBuild" class="sec">② 组织实发 · 三分配</view>
    <view v-if="!productionBuild" class="sg-card">
      <view class="al"><text class="al-ic">🧑‍🌾</text><view class="al-i"><text class="al-n">推广员提成 {{ ORG_ALLOC.promoter }}%</text></view><text class="al-v">¥{{ money(promoterAmt) }}</text></view>
      <view class="al"><text class="al-ic">🏢</text><view class="al-i"><text class="al-n">组织运营成本 {{ ORG_ALLOC.ops }}%</text></view><text class="al-v">¥{{ money(opsAmt) }}</text></view>
      <view class="al hi"><text class="al-ic">🧧</text><view class="al-i"><text class="al-n">集体经济分红反哺 {{ ORG_ALLOC.collective }}%</text></view><text class="al-v red">¥{{ money(collectiveAmt) }}</text></view>
    </view>

    <!-- 集体分红反哺 -->
    <view v-if="!productionBuild" class="sec">③ 分红反哺集体经济</view>
    <view v-if="!productionBuild" class="fb">
      <text class="fb-t">🏘️ 反哺对象：{{ o.collective }}</text>
      <view class="fb-kpis">
        <view class="fk"><text class="fkn">¥{{ money(collectiveAmt) }}</text><text class="fkl">本月集体分红</text></view>
        <view class="fk"><text class="fkn">{{ o.members }}</text><text class="fkl">集体成员(户)</text></view>
        <view class="fk"><text class="fkn">¥{{ money(perHousehold) }}</text><text class="fkl">户均/月</text></view>
      </view>
      <text class="fb-s">按集体成员 {{ o.members }} 户 / {{ o.people }} 人分配，户均月分红 ¥{{ money(perHousehold) }}、约 ¥{{ money(perYear) }}/年。分红方案经集体成员大会表决、上链公示。</text>
    </view>

    <view v-if="!productionBuild" class="tip">🔗 干得好（A 级 ×1.1）组织多拿、集体多分；干得差（C/D 级）折减。收益 6 成归集体组织、其中 4 成反哺集体经济，真正“取之于村社、用之于村社”。</view>
    <view v-else class="backend-note">正式环境考核系数和分红金额由后台依据合同、业绩和集体决议计算；当前未配置真实结算数据，已隐藏演示金额。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #c0392b, #922b21); padding: 32rpx 28rpx 26rpx; color: #fff; }
.hero-top { display: flex; align-items: center; justify-content: space-between; }
.ht { font-size: 32rpx; font-weight: 800; }
.switch { font-size: 24rpx; background: rgba(255,255,255,0.2); padding: 8rpx 20rpx; border-radius: 999rpx; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.sg-card { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.grade-row { display: flex; align-items: center; padding-bottom: 16rpx; border-bottom: 2rpx solid $sg-border; }
.g-badge { width: 64rpx; height: 64rpx; border-radius: 16rpx; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 34rpx; font-weight: 800; margin-right: 16rpx; }
.g-A { background: #16884c; } .g-B { background: #d99a2b; } .g-C { background: #e07b39; } .g-D { background: #d64541; }
.g-i { flex: 1; display: flex; flex-direction: column; }
.g-score { font-size: 26rpx; font-weight: 700; }
.g-label { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.g-k { font-size: 40rpx; font-weight: 800; color: #c0392b; }
.calc { padding-top: 12rpx; }
.cl { display: flex; justify-content: space-between; align-items: baseline; padding: 10rpx 0; }
.cl.hi { border-top: 2rpx dashed #eee; border-bottom: 2rpx dashed #eee; margin: 6rpx 0; padding: 14rpx 0; }
.cl-k { font-size: 23rpx; color: $sg-text-2; }
.cl-v { font-size: 24rpx; font-weight: 600; }
.cl-v.big { font-size: 34rpx; font-weight: 800; color: $sg-red; }
.cl-v.up { color: #16884c; }
.cl-v.down { color: #d64541; }
.tiers { display: flex; gap: 12rpx; margin: 16rpx 24rpx 0; }
.tier { flex: 1; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 14rpx 0; display: flex; flex-direction: column; align-items: center; border: 3rpx solid transparent; }
.tier.on { border-color: #c0392b; }
.t-g { font-size: 26rpx; font-weight: 800; }
.t-k { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }
.al { display: flex; align-items: center; padding: 16rpx 0; border-top: 2rpx solid $sg-bg; }
.al:first-child { border-top: none; }
.al.hi { background: $sg-primary-light; border-radius: $sg-radius; padding: 16rpx 14rpx; margin-top: 8rpx; }
.al-ic { font-size: 34rpx; margin-right: 14rpx; }
.al-i { flex: 1; }
.al-n { font-size: 24rpx; font-weight: 600; }
.al-v { font-size: 27rpx; font-weight: 800; }
.al-v.red { color: $sg-red; }
.fb { margin: 0 24rpx; background: linear-gradient(135deg, #eafaf0, #fff); border: 2rpx solid #c6ecd5; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.fb-t { font-size: 26rpx; font-weight: 800; color: $sg-primary-deep; }
.fb-kpis { display: flex; margin: 18rpx 0; }
.fk { flex: 1; text-align: center; }
.fkn { font-size: 30rpx; font-weight: 800; color: $sg-primary-deep; display: block; }
.fkl { font-size: 19rpx; color: $sg-text-3; }
.fb-s { font-size: 21rpx; color: $sg-text-2; line-height: 1.6; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.backend-note { margin: 40rpx 28rpx; padding: 28rpx; border-radius: $sg-radius-lg; background: #fff8e8; color: #8a5a00; line-height: 1.6; font-size: 24rpx; }
</style>
