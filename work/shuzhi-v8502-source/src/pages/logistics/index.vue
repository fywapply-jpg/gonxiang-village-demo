<script setup lang="ts">
import { waybill } from "@/mock";
import { recordPlatformEvent } from "@/services/localApi";
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
function nav(url: string) { uni.navigateTo({ url }); }
function demo(t: string, c: string) {
  void recordPlatformEvent("logistics", "OPEN_LOGISTICS_SERVICE", { title: t }).catch(() => {});
  uni.showModal({ title: t, content: c, confirmText: "预约 / 下单",
    success: (r) => { if (r.confirm) uni.showToast({ title: "已提交", icon: "success" }); } });
}
</script>

<template>
  <view class="sg-page">
    <view class="dispatch-entry" @tap="nav('/pages/logistics/dispatch')">
      <text class="de-ic">🚚</text>
      <view class="de-i"><text class="de-t">统仓统配 · 冷链配送调度</text><text class="de-s">枢纽仓→城市卫星仓→冷链落地配到店/到厨房/到铺号</text></view>
      <text class="de-go">进入 ›</text>
    </view>

    <view class="quick">
      <view class="q" @tap="nav('/pages/logistics/wms')"><text class="qi">🏬</text><text>智慧仓储</text></view>
      <view class="q" @tap="nav('/pages/logistics/warehouse')"><text class="qi">📥</text><text>仓容预约</text></view>
      <view class="q" @tap="nav('/pages/logistics/waybill')"><text class="qi">🚚</text><text>运单追踪</text></view>
      <view class="q" @tap="nav('/pages/logistics/receipt')"><text class="qi">📦</text><text>电子仓单</text></view>
      <view class="q" @tap="nav('/pages/logistics/capacity')"><text class="qi">🧊</text><text>运力竞价</text></view>
    </view>

    <view v-if="!productionBuild" class="sech">在途运单</view>
    <view v-if="!productionBuild" class="sg-card way" @tap="nav('/pages/logistics/waybill')">
      <view class="sg-between"><text class="wn">{{ waybill.no }}</text><text class="st">运输中</text></view>
      <text class="route">{{ waybill.from }} → {{ waybill.to }}</text>
      <view class="bar"><view class="fill" :style="{ width: waybill.progress + '%' }"></view></view>
      <view class="sg-between meta">
        <text class="temp">🧊 冷链 {{ waybill.temp }}℃（{{ waybill.tempRange }}）</text>
        <text class="eta">预计 {{ waybill.eta.slice(5) }} 到达</text>
      </view>
    </view>
    <view v-if="productionBuild" class="backend-note">正式环境不展示内置运单；请从订单详情进入已授权的第三方物流回传，运单、轨迹和温控数据以后台回执为准。</view>

    <view class="alert">⚠️ 物流异常告警：超温、延误将自动推送微信订阅消息提醒</view>
  </view>
</template>

<style lang="scss" scoped>
.dispatch-entry { display: flex; align-items: center; margin: 24rpx 24rpx 0; padding: 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #2b6cb0, #1e4e8c); box-shadow: 0 8rpx 20rpx rgba(43,108,176,0.28); }
.de-ic { font-size: 44rpx; margin-right: 14rpx; }
.de-i { flex: 1; display: flex; flex-direction: column; }
.de-t { font-size: 27rpx; font-weight: 800; color: #fff; }
.de-s { font-size: 18rpx; color: rgba(255,255,255,0.85); margin-top: 4rpx; line-height: 1.4; }
.de-go { font-size: 23rpx; color: #fff; background: rgba(255,255,255,0.2); padding: 8rpx 18rpx; border-radius: 999rpx; }
.quick { display: flex; background: #fff; margin: 24rpx; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx 0; }
.q { flex: 1; display: flex; flex-direction: column; align-items: center; font-size: 24rpx; color: $sg-text-2; }
.qi { font-size: 52rpx; margin-bottom: 8rpx; }
.sech { padding: 6rpx 28rpx 12rpx; font-size: 30rpx; font-weight: 700; }
.way { }
.wn { font-size: 24rpx; color: $sg-text-3; }
.st { font-size: 26rpx; color: $sg-blue; font-weight: 700; }
.route { font-size: 28rpx; font-weight: 600; display: block; margin: 12rpx 0; }
.bar { height: 14rpx; background: $sg-border; border-radius: 7rpx; overflow: hidden; }
.fill { height: 100%; background: linear-gradient(90deg, $sg-primary, $sg-blue); }
.meta { margin-top: 12rpx; }
.temp { font-size: 23rpx; color: $sg-blue; }
.eta { font-size: 23rpx; color: $sg-text-3; }
.alert { margin: 24rpx; padding: 20rpx; background: $sg-gold-light; border-radius: $sg-radius; font-size: 23rpx; color: #a8791b; }
.backend-note { margin: 24rpx; padding: 20rpx; background: #fff8e8; border: 2rpx solid #f0dcae; border-radius: $sg-radius; color: #8a641f; font-size: 22rpx; line-height: 1.6; }
</style>
