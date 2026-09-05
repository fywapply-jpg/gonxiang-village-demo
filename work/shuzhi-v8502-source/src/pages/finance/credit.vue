<script setup lang="ts">
import { computed } from "vue";
import { creditDetail as c } from "@/mock";
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const view = computed(() => productionBuild ? { score: "—", level: "后台评定", dims: [], benefits: [] } : c);
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <view class="ring"><text class="score">{{ view.score }}</text><text class="lvl">信用等级 {{ view.level }}</text></view>
      <text class="hs">企业经营信用 · 基于KYB、合同、交付、验收、支付开票和争议判责事实</text>
    </view>

    <view class="sg-card">
      <text class="st">信用维度明细</text>
      <view class="dim" v-for="d in view.dims" :key="d.name">
        <view class="sg-between"><text class="dn">{{ d.name }}</text><text class="dv">{{ d.score }} 分 · 权重 {{ d.weight }}</text></view>
        <view class="bar"><view class="fill" :style="{ width: d.score + '%' }"></view></view>
      </view>
    </view>

    <view class="sg-card">
      <text class="st">对应权益</text>
      <view class="benefits">
      <view class="b" v-for="b in view.benefits" :key="b"><text class="bi">✔</text><text>{{ b }}</text></view>
      </view>
    </view>
    <view class="tip">本页为企业平台履约参考，不是人民银行征信或金融机构授信结果。社会贡献值、法人个人荣誉和行政组织背书均不直接换算企业信用分。</view>
    <view class="fin-lic">🏛️ 企业明确授权后，平台可向银行或持牌机构提交真实交易事实包；放款、额度、利率和结算决定均由机构独立作出，平台不承诺审批结果。</view>
    <view v-if="productionBuild" class="backend-note">当前未展示内置信用分；请登录并完成主体授权，待后台信用接口返回后显示。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, $sg-gold, #c8871f); padding: 50rpx 28rpx; display: flex; flex-direction: column; align-items: center; color: #fff; }
.ring { width: 240rpx; height: 240rpx; border-radius: 50%; border: 12rpx solid rgba(255,255,255,0.4); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.score { font-size: 76rpx; font-weight: 800; line-height: 1; }
.lvl { font-size: 24rpx; margin-top: 8rpx; }
.hs { font-size: 22rpx; opacity: 0.9; text-align: center; margin-top: 24rpx; }
.st { font-size: 28rpx; font-weight: 700; display: block; margin-bottom: 16rpx; }
.dim { margin-bottom: 20rpx; }
.dn { font-size: 26rpx; }
.dv { font-size: 22rpx; color: $sg-text-3; }
.bar { height: 14rpx; background: $sg-border; border-radius: 7rpx; margin-top: 8rpx; overflow: hidden; }
.fill { height: 100%; background: linear-gradient(90deg, $sg-gold, $sg-primary); }
.benefits { display: flex; flex-wrap: wrap; }
.b { width: 50%; display: flex; align-items: center; padding: 10rpx 0; font-size: 25rpx; }
.bi { color: $sg-primary; margin-right: 10rpx; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
.backend-note { margin: 0 24rpx 24rpx; padding: 18rpx 20rpx; border-radius: $sg-radius; background: #fff8e8; border: 2rpx solid #f0dcae; color: #8a641f; font-size: 22rpx; line-height: 1.6; }
</style>
