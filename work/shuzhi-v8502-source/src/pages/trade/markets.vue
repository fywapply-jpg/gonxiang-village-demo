<script setup lang="ts">
import { computed } from "vue";
import { marketProvinces, cityMarkets } from "@/mock/citymarket";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const totalMarkets = computed(() => cityMarkets.length);
function open(mkey: string) { if (productionBuild) return uni.showModal({ title: "需要后台市场数据", showCancel: false, content: "正式环境农批市场名录和服务半径由后台区域服务返回。" }); uni.navigateTo({ url: `/pages/trade/citymarket?mkey=${mkey}` }); }
function promo() { if (productionBuild) return uni.showModal({ title: "需要后台推广数据", showCancel: false, content: "正式环境市场推广组织由后台审核和合同服务返回。" }); uni.navigateTo({ url: "/pages/promo/index" }); }
</script>

<template>
  <view class="sg-page">
    <view v-if="!productionBuild" class="hero">
      <text class="ht">🗺️ 全国农批市场清单</text>
      <text class="hs">分省录入 · 一级农批市场为枢纽 · 每市场匹配周边 100 公里八类小端</text>
      <view class="stat">
        <view class="st"><text class="sn">{{ marketProvinces.length }}</text><text class="sl">省 / 区</text></view>
        <view class="st"><text class="sn">{{ totalMarkets }}</text><text class="sl">农批市场</text></view>
        <view class="st"><text class="sn">8</text><text class="sl">类下游小端</text></view>
      </view>
    </view>

    <view v-if="!productionBuild" class="promo-entry" @tap="promo">
      <text class="pe-ic">🤝</text>
      <view class="pe-i"><text class="pe-t">小B端推广服务体系</text><text class="pe-s">村社集体控股组织提供服务 · 费用与考核按生效合同执行</text></view>
      <text class="pe-go">进入 ›</text>
    </view>

    <view v-if="!productionBuild" class="prov" v-for="p in marketProvinces" :key="p.province">
      <view class="prov-hd"><text class="prov-n">{{ p.province }}</text><text class="prov-c">{{ p.markets.length }} 个市场</text></view>
      <view class="mk" v-for="m in p.markets" :key="m.key" @tap="open(m.key)">
        <view class="mk-l">
          <text class="mk-name">{{ m.hub }}</text>
          <text class="mk-note">{{ m.city }} · {{ m.note }}</text>
          <view class="mk-tags">
            <text class="mk-grade">{{ m.hubGrade }}</text>
            <text class="mk-ends">周边小端 {{ m.kpi.ends }}</text>
          </view>
        </view>
        <text class="mk-go">进入 ›</text>
      </view>
    </view>

    <view v-if="!productionBuild" class="tip">🔗 各市场以企业法人 / 合作社主体入驻，上联产地合作社、下达周边八类小端，交易全链上链闭环。清单持续扩省扩点。</view>
    <view v-else class="backend-note">正式环境农批市场、服务半径和周边门店数据由后台区域服务实时返回；当前未配置真实名录，已隐藏演示市场。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #2f9e5b, $sg-primary-deep); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 36rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; line-height: 1.5; }
.stat { display: flex; margin-top: 22rpx; }
.st { flex: 1; text-align: center; }
.sn { font-size: 40rpx; font-weight: 800; display: block; }
.sl { font-size: 20rpx; opacity: 0.9; }
.promo-entry { display: flex; align-items: center; margin: 20rpx 24rpx 0; padding: 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); box-shadow: 0 8rpx 20rpx rgba(15,107,59,0.28); }
.pe-ic { font-size: 44rpx; margin-right: 14rpx; }
.pe-i { flex: 1; display: flex; flex-direction: column; }
.pe-t { font-size: 27rpx; font-weight: 800; color: #fff; }
.pe-s { font-size: 19rpx; color: rgba(255,255,255,0.85); margin-top: 4rpx; line-height: 1.4; }
.pe-go { font-size: 23rpx; color: #fff; background: rgba(255,255,255,0.2); padding: 8rpx 18rpx; border-radius: 999rpx; }
.prov { margin-top: 20rpx; }
.prov-hd { display: flex; align-items: baseline; justify-content: space-between; padding: 6rpx 28rpx 12rpx; }
.prov-n { font-size: 30rpx; font-weight: 800; }
.prov-c { font-size: 21rpx; color: $sg-text-3; }
.mk { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 14rpx; padding: 22rpx; }
.mk-l { flex: 1; display: flex; flex-direction: column; }
.mk-name { font-size: 27rpx; font-weight: 700; }
.mk-note { font-size: 21rpx; color: $sg-text-3; margin-top: 4rpx; }
.mk-tags { display: flex; align-items: center; gap: 12rpx; margin-top: 10rpx; }
.mk-grade { font-size: 19rpx; color: $sg-primary; background: $sg-primary-light; padding: 4rpx 14rpx; border-radius: 6rpx; }
.mk-ends { font-size: 19rpx; color: $sg-gold; background: $sg-gold-light; padding: 4rpx 14rpx; border-radius: 6rpx; }
.mk-go { font-size: 23rpx; color: $sg-primary; margin-left: 12rpx; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.backend-note { margin: 40rpx 28rpx; padding: 28rpx; border-radius: 24rpx; background: #fff8e8; color: #8a5a00; line-height: 1.6; font-size: 24rpx; }
</style>
