<script setup lang="ts">
import { merchantProfile as m, starLevels } from "@/mock/merchant";
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
</script>

<template>
  <view class="sg-page">
    <!-- 当前星级 -->
    <view v-if="!productionBuild" class="hero">
      <text class="org">{{ m.org }}</text>
      <view class="stars">
        <text v-for="i in 5" :key="i" class="star" :class="{ on: i <= m.star }">★</text>
      </view>
      <text class="level">{{ m.levelName }} · 综合 {{ m.score }} 分</text>
      <text class="tips">仅具备独立法人资格的企事业单位/机构可成为商户并参与评级</text>
    </view>

    <!-- 评定维度 -->
    <view v-if="!productionBuild" class="sg-card">
      <text class="ct">评定维度</text>
      <view class="dim" v-for="d in m.dims" :key="d.name">
        <view class="d-top"><text class="d-n">{{ d.name }}</text><text class="d-w">权重 {{ d.weight }} · {{ d.score }}分</text></view>
        <view class="bar"><view class="fill" :style="{ width: d.score + '%' }"></view></view>
        <text class="d-d">{{ d.desc }}</text>
      </view>
      <text class="next">🎯 {{ m.next }}</text>
    </view>

    <!-- 星级体系与权益 -->
    <view v-if="!productionBuild" class="sg-card">
      <text class="ct">星级体系与权益</text>
      <view class="lv" v-for="l in starLevels" :key="l.star" :class="{ cur: l.star === m.star }">
        <view class="lv-top">
          <view class="lv-stars"><text v-for="i in l.star" :key="i" class="ls" :style="{ color: l.color }">★</text></view>
          <text class="lv-n" :style="{ color: l.color }">{{ l.name }}</text>
          <text v-if="l.star === m.star" class="lv-cur">当前</text>
        </view>
        <view class="lv-b"><text class="b" v-for="b in l.benefits" :key="b">{{ b }}</text></view>
      </view>
    </view>
    <view v-if="!productionBuild" class="tip">🔗 口碑评价、成交额、信用、履约数据全程上链，星级动态评定、公开可查，越优质越享政策与流量倾斜</view>
    <view v-else class="backend-note">正式环境商户星级、信用和履约评分由后台风控服务实时计算；当前未配置真实商户档案，已隐藏演示评分。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #d99a2b, #c8871f); padding: 40rpx 28rpx 34rpx; color: #fff; display: flex; flex-direction: column; align-items: center; }
.org { font-size: 32rpx; font-weight: 800; }
.stars { margin: 14rpx 0 8rpx; }
.star { font-size: 48rpx; color: rgba(255,255,255,0.4); }
.star.on { color: #fff; }
.level { font-size: 24rpx; }
.tips { font-size: 20rpx; opacity: 0.85; margin-top: 14rpx; text-align: center; }
.ct { font-size: 28rpx; font-weight: 700; display: block; margin-bottom: 16rpx; }
.dim { margin-bottom: 18rpx; }
.d-top { display: flex; align-items: center; justify-content: space-between; }
.d-n { font-size: 26rpx; font-weight: 600; }
.d-w { font-size: 21rpx; color: $sg-text-3; }
.bar { height: 14rpx; background: $sg-bg; border-radius: 7rpx; margin: 8rpx 0; overflow: hidden; }
.fill { height: 100%; background: linear-gradient(90deg, $sg-gold, $sg-primary); }
.d-d { font-size: 21rpx; color: $sg-text-3; }
.next { font-size: 22rpx; color: $sg-gold; background: $sg-gold-light; padding: 14rpx 18rpx; border-radius: $sg-radius; display: block; margin-top: 8rpx; }
.lv { padding: 16rpx; border-radius: $sg-radius; margin-bottom: 12rpx; background: $sg-bg; }
.lv.cur { background: $sg-gold-light; border: 2rpx solid #f0dcae; }
.lv-top { display: flex; align-items: center; }
.lv-stars { margin-right: 10rpx; }
.ls { font-size: 24rpx; }
.lv-n { font-size: 26rpx; font-weight: 700; }
.lv-cur { font-size: 19rpx; color: #fff; background: $sg-gold; padding: 2rpx 12rpx; border-radius: 999rpx; margin-left: 12rpx; }
.lv-b { display: flex; flex-wrap: wrap; margin-top: 8rpx; }
.b { font-size: 20rpx; color: $sg-text-2; background: #fff; padding: 4rpx 14rpx; border-radius: 6rpx; margin: 4rpx 8rpx 0 0; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
.backend-note { margin: 40rpx 28rpx; padding: 28rpx; border-radius: 24rpx; background: #fff8e8; color: #8a5a00; line-height: 1.6; font-size: 24rpx; }
</style>
