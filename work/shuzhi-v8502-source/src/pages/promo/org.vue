<script setup lang="ts">
import { promoOrgs, coefOf } from "@/mock/promo";
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const gradeColor: Record<string, string> = { A: "#16884c", B: "#d99a2b", C: "#e07b39", D: "#d64541" };
function grade(o: any) { return coefOf(o.score).grade; }
function actual(o: any) { return Math.round(o.baseComm * coefOf(o.score).k); }
function detail(o: any) {
  if (productionBuild) return uni.showModal({ title: "需要后台组织数据", showCancel: false, content: "正式环境组织资质、控股比例和业绩考核由后台审核服务返回。" });
  const t = coefOf(o.score);
  uni.showModal({ title: o.name, showCancel: false, confirmText: "知道了",
    content: `类型：${o.type}（集体持股 ${o.holding}%）\n推广区域：${o.region}\n推广员 ${o.promoters} 人 · 小端 ${o.ends} 家（活跃 ${o.active}）\n考核 ${o.score} 分 · ${t.grade} 级 · 系数 ×${t.k}\n基础分成 ¥${o.baseComm.toLocaleString()} → 实发 ¥${actual(o).toLocaleString()}` });
}
function dividend() { if (productionBuild) return uni.showModal({ title: "需要后台分红数据", showCancel: false, content: "正式环境分红方案须经后台合同、结算和集体决议核验后展示。" }); uni.navigateTo({ url: "/pages/promo/dividend" }); }
function join() { if (productionBuild) return uni.showModal({ title: "需要后台审核", showCancel: false, content: "正式环境请通过后台商户准入接口提交集体组织法人材料。" }); uni.navigateTo({ url: "/pages/register/faceauth?scene=legal&name=集体组织法人" }); }
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🏘️ 推广组织</text>
      <text class="hs">必须为村 / 社区 / 企业集体控股企业 · 属地化推广</text>
    </view>

    <view v-if="!productionBuild" class="tipbar">📌 准入硬门槛：集体持股 ≥ 51%，收益反哺集体经济，一村/一社区一组织。</view>

    <view v-if="!productionBuild" class="org" v-for="o in promoOrgs" :key="o.id" @tap="detail(o)">
      <view class="o-top">
        <view class="o-l">
          <text class="o-n">{{ o.name }}</text>
          <view class="o-tags"><text class="o-type">{{ o.type }}</text><text class="o-hold">集体控股 {{ o.holding }}%</text></view>
        </view>
        <view class="o-grade" :style="{ background: gradeColor[grade(o)] }">{{ grade(o) }}</view>
      </view>
      <text class="o-region">📍 {{ o.region }}</text>
      <view class="o-kpis">
        <view class="ok"><text class="okn">{{ o.promoters }}</text><text class="okl">推广员</text></view>
        <view class="ok"><text class="okn">{{ o.ends }}</text><text class="okl">推广小端</text></view>
        <view class="ok"><text class="okn">{{ o.active }}</text><text class="okl">活跃</text></view>
        <view class="ok"><text class="okn">{{ o.score }}</text><text class="okl">考核分</text></view>
      </view>
      <view class="o-foot">
        <text class="of-gmv">系数 ×{{ coefOf(o.score).k }} · 实发 ¥{{ actual(o).toLocaleString() }}</text>
        <text class="of-comm">带动 {{ o.gmv }}</text>
      </view>
    </view>

    <view v-if="!productionBuild" class="div-entry" @tap="dividend">
      <text class="de-ic">🧧</text>
      <view class="de-i"><text class="de-t">考核系数 · 集体分红反哺账</text><text class="de-s">评级定系数 · 组织实发三分配 · 反哺村社集体</text></view>
      <text class="de-go">查看 ›</text>
    </view>

    <view v-if="!productionBuild" class="join" @tap="join">＋ 集体组织申报入驻（需集体控股核验 + 法人认证）</view>
    <view v-if="!productionBuild" class="tip">🔗 组织资质、集体控股、推广区域、业绩考核全程上链，公开透明、可监督。</view>
    <view v-else class="backend-note">正式环境组织名录、资质、控股比例和分红数据由后台审核服务实时返回；当前未配置真实组织数据，已隐藏演示数据。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #2f9e5b, $sg-primary-deep); padding: 32rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; }
.tipbar { margin: 20rpx 24rpx 0; padding: 16rpx 20rpx; background: $sg-primary-light; border-radius: $sg-radius; font-size: 21rpx; color: $sg-primary-deep; line-height: 1.5; }
.org { margin: 16rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.o-top { display: flex; align-items: flex-start; justify-content: space-between; }
.o-l { flex: 1; }
.o-n { font-size: 28rpx; font-weight: 800; }
.o-tags { display: flex; gap: 10rpx; margin-top: 8rpx; }
.o-type { font-size: 19rpx; color: $sg-primary; background: $sg-primary-light; padding: 3rpx 12rpx; border-radius: 6rpx; }
.o-hold { font-size: 19rpx; color: $sg-red; background: #fdecea; padding: 3rpx 12rpx; border-radius: 6rpx; }
.o-grade { width: 52rpx; height: 52rpx; border-radius: 14rpx; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 800; }
.o-region { font-size: 21rpx; color: $sg-text-3; margin: 12rpx 0; display: block; }
.o-kpis { display: flex; border-top: 2rpx solid $sg-border; padding-top: 14rpx; }
.ok { flex: 1; text-align: center; }
.okn { font-size: 30rpx; font-weight: 800; color: $sg-primary-deep; display: block; }
.okl { font-size: 19rpx; color: $sg-text-3; }
.o-foot { display: flex; justify-content: space-between; margin-top: 14rpx; padding-top: 12rpx; border-top: 2rpx solid $sg-bg; }
.of-gmv { font-size: 22rpx; color: $sg-text-2; }
.of-comm { font-size: 23rpx; color: $sg-red; font-weight: 700; }
.div-entry { display: flex; align-items: center; margin: 20rpx 24rpx 0; padding: 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #fdecec, #fff); border: 2rpx solid #f3c6c6; box-shadow: $sg-shadow; }
.de-ic { font-size: 42rpx; margin-right: 14rpx; }
.de-i { flex: 1; display: flex; flex-direction: column; }
.de-t { font-size: 26rpx; font-weight: 800; color: #c0392b; }
.de-s { font-size: 19rpx; color: $sg-text-3; margin-top: 4rpx; }
.de-go { font-size: 23rpx; color: #c0392b; }
.join { margin: 24rpx; text-align: center; padding: 26rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; font-size: 26rpx; font-weight: 700; box-shadow: 0 8rpx 20rpx rgba(15,107,59,0.3); }
.tip { margin: 0 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.backend-note { margin: 40rpx 28rpx; padding: 28rpx; border-radius: $sg-radius-lg; background: #fff8e8; color: #8a5a00; line-height: 1.6; font-size: 24rpx; }
</style>
