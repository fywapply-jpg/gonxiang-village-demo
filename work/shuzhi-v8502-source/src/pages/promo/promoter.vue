<script setup lang="ts">
import { ref, computed } from "vue";
import { promoters, promoTickets } from "@/mock/promo";
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const idx = ref(0);
const me = computed(() => promoters[idx.value]);
const myTickets = computed(() => promoTickets.filter((t) => t.promoter === me.value.name));
function opinion() { if (productionBuild) return uni.showModal({ title: "需要后台工单数据", showCancel: false, content: "正式环境推广工单和舆情任务由后台派发，当前未配置真实数据。" }); uni.navigateTo({ url: "/pages/promo/opinion" }); }
function commission() { if (productionBuild) return uni.showModal({ title: "需要后台佣金数据", showCancel: false, content: "正式环境佣金由后台合同、验收和结算数据计算，当前未配置真实数据。" }); uni.navigateTo({ url: "/pages/promo/commission" }); }
</script>

<template>
  <view class="sg-page">
    <view v-if="!productionBuild" class="hero">
      <view class="hero-top">
        <text class="ht">🧑‍🌾 推广员工作台</text>
        <picker :range="promoters.map(p => p.name)" @change="idx = Number($event.detail.value)">
          <text class="switch">{{ me.name }} ▾</text>
        </picker>
      </view>
      <text class="hs">{{ me.org }} · 考核 {{ me.score }} 分</text>
      <view class="hkpis">
        <view class="hk"><text class="hkn">{{ me.ends }}</text><text class="hkl">我的小端</text></view>
        <view class="hk"><text class="hkn">{{ me.active }}</text><text class="hkl">活跃</text></view>
        <view class="hk"><text class="hkn">¥{{ me.month }}</text><text class="hkl">本月佣金</text></view>
        <view class="hk"><text class="hkn">{{ me.score }}</text><text class="hkl">考核分</text></view>
      </view>
    </view>

    <!-- 待办 -->
    <view v-if="!productionBuild" class="todos">
      <view class="td" @tap="opinion">
        <text class="td-ic">🤝</text>
        <view class="td-i"><text class="td-n">{{ me.pending }}</text><text class="td-l">待维护关系</text></view>
      </view>
      <view class="td alert" @tap="opinion">
        <text class="td-ic">📣</text>
        <view class="td-i"><text class="td-n">{{ me.opinion }}</text><text class="td-l">待处理舆情</text></view>
      </view>
      <view class="td" @tap="commission">
        <text class="td-ic">💰</text>
        <view class="td-i"><text class="td-n">4:6</text><text class="td-l">佣金台账</text></view>
      </view>
    </view>

    <!-- 我的工单 -->
    <view v-if="!productionBuild" class="sec">我的关系 / 舆情工单</view>
    <view v-if="!productionBuild" class="tk" v-for="t in myTickets" :key="t.id">
      <view class="tk-top">
        <text class="tk-type" :class="{ hot: t.type.includes('舆情') || t.type.includes('投诉') }">{{ t.type }}</text>
        <text class="tk-lv" :class="'lv-' + t.level">{{ t.level }}优先</text>
        <text class="tk-st">{{ t.status }}</text>
      </view>
      <text class="tk-end">{{ t.end }}</text>
      <text class="tk-c">{{ t.content }}</text>
    </view>
    <view v-if="!productionBuild && !myTickets.length" class="empty">暂无待办工单 👍</view>

    <view v-if="!productionBuild" class="tip">🔗 推广员由集体推广组织认证派驻，实名 + 人脸认证；拉新、维护、舆情处理均计入考核，考核定佣金系数。</view>
    <view v-else class="backend-note">正式环境推广员、工单和佣金数据由后台组织认证与结算服务实时返回；当前未配置真实数据，已隐藏演示数据。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #2f9e5b, $sg-primary-deep); padding: 32rpx 28rpx 26rpx; color: #fff; }
.hero-top { display: flex; align-items: center; justify-content: space-between; }
.ht { font-size: 32rpx; font-weight: 800; }
.switch { font-size: 24rpx; background: rgba(255,255,255,0.2); padding: 8rpx 20rpx; border-radius: 999rpx; }
.hs { font-size: 21rpx; opacity: 0.9; margin-top: 8rpx; display: block; }
.hkpis { display: flex; margin-top: 20rpx; }
.hk { flex: 1; text-align: center; }
.hkn { font-size: 32rpx; font-weight: 800; display: block; }
.hkl { font-size: 19rpx; opacity: 0.9; }
.todos { display: flex; gap: 14rpx; margin: 16rpx 24rpx 0; }
.td { flex: 1; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx; display: flex; align-items: center; }
.td.alert { border: 2rpx solid #f5c6c2; }
.td-ic { font-size: 34rpx; margin-right: 10rpx; }
.td-i { display: flex; flex-direction: column; }
.td-n { font-size: 30rpx; font-weight: 800; color: $sg-primary-deep; }
.td-l { font-size: 18rpx; color: $sg-text-3; }
.sec { font-size: 30rpx; font-weight: 700; padding: 26rpx 28rpx 12rpx; }
.tk { margin: 0 24rpx 14rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; }
.tk-top { display: flex; align-items: center; gap: 12rpx; }
.tk-type { font-size: 20rpx; color: $sg-primary; background: $sg-primary-light; padding: 3rpx 12rpx; border-radius: 6rpx; }
.tk-type.hot { color: #fff; background: $sg-red; }
.tk-lv { font-size: 19rpx; padding: 3rpx 12rpx; border-radius: 6rpx; }
.lv-高 { color: #fff; background: $sg-red; }
.lv-中 { color: #c8871f; background: $sg-gold-light; }
.lv-低 { color: $sg-text-3; background: $sg-bg; }
.tk-st { font-size: 20rpx; color: $sg-text-3; margin-left: auto; }
.tk-end { font-size: 25rpx; font-weight: 700; margin: 10rpx 0 4rpx; display: block; }
.tk-c { font-size: 21rpx; color: $sg-text-2; line-height: 1.5; display: block; }
.empty { text-align: center; font-size: 24rpx; color: $sg-text-3; padding: 40rpx 0; }
.tip { margin: 16rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.backend-note { margin: 40rpx 28rpx; padding: 28rpx; border-radius: $sg-radius-lg; background: #fff8e8; color: #8a5a00; line-height: 1.6; font-size: 24rpx; }
</style>
