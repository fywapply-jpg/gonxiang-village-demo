<script setup lang="ts">
import { waybill as w } from "@/mock";
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="sg-card unavailable">
      <text class="unavailable-title">运单详情暂不可用</text>
      <text class="unavailable-text">正式环境只展示订单绑定且经第三方物流签名回传的运单、轨迹和温控数据；当前页面不使用内置演示运单。</text>
    </view>
    <template v-else>
    <view class="map">
      <text class="map-ic">🗺️</text>
      <text class="map-t">车辆实时位置（腾讯位置服务）</text>
      <view class="truck" :style="{ left: w.progress + '%' }">🚚</view>
    </view>

    <view class="sg-card">
      <view class="r"><text class="k">运单号</text><text class="v">{{ w.no }}</text></view>
      <view class="r"><text class="k">货物</text><text class="v">{{ w.cargo }}</text></view>
      <view class="r"><text class="k">路线</text><text class="v">{{ w.from }} → {{ w.to }}</text></view>
      <view class="r"><text class="k">预计到达</text><text class="v">{{ w.eta }}</text></view>
    </view>

    <view class="sg-card temp">
      <view class="sg-between"><text class="tt">🧊 冷链温湿度实时监控</text><text class="tnow ok">{{ w.temp }}℃</text></view>
      <text class="trange">设定区间 {{ w.tempRange }} · 状态正常</text>
    </view>

    <view class="sg-card">
      <text class="st">运输轨迹</text>
      <view class="node" v-for="(n, i) in w.nodes" :key="i">
        <view class="dot" :class="{ on: n.done }"></view>
        <view class="line" v-if="i < w.nodes.length - 1" :class="{ on: n.done }"></view>
        <view class="ninfo"><text class="nn" :class="{ on: n.done }">{{ n.name }}</text><text class="nt">{{ n.time }}</text></view>
      </view>
    </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.map { height: 300rpx; background: linear-gradient(160deg, #dcefe3, #eef6ff); margin: 24rpx; border-radius: $sg-radius-lg; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.map-ic { font-size: 80rpx; }
.map-t { font-size: 22rpx; color: $sg-text-3; margin-top: 10rpx; }
.truck { position: absolute; bottom: 40rpx; font-size: 44rpx; transition: left 0.5s; }
.r { display: flex; padding: 14rpx 0; border-bottom: 2rpx solid $sg-border; }
.k { width: 160rpx; color: $sg-text-3; font-size: 26rpx; }
.v { flex: 1; font-size: 26rpx; }
.temp { background: linear-gradient(135deg, #eef6ff, #fff); }
.tt { font-size: 27rpx; font-weight: 700; color: $sg-blue; }
.tnow { font-size: 40rpx; font-weight: 800; }
.tnow.ok { color: $sg-primary; }
.trange { font-size: 22rpx; color: $sg-text-3; margin-top: 6rpx; display: block; }
.st { font-size: 28rpx; font-weight: 700; display: block; margin-bottom: 16rpx; }
.node { position: relative; padding-left: 40rpx; padding-bottom: 30rpx; }
.dot { position: absolute; left: 0; top: 6rpx; width: 24rpx; height: 24rpx; border-radius: 50%; background: $sg-border; }
.dot.on { background: $sg-primary; }
.line { position: absolute; left: 11rpx; top: 30rpx; bottom: 0; width: 4rpx; background: $sg-border; }
.line.on { background: $sg-primary; }
.ninfo { display: flex; flex-direction: column; }
.nn { font-size: 26rpx; color: $sg-text-3; }
.nn.on { color: $sg-text; font-weight: 600; }
.nt { font-size: 22rpx; color: $sg-text-3; margin-top: 4rpx; }
.unavailable { margin-top: 28rpx; text-align: center; padding: 54rpx 28rpx; }
.unavailable-title { display: block; font-size: 30rpx; font-weight: 800; color: $sg-text; }
.unavailable-text { display: block; margin-top: 14rpx; font-size: 23rpx; line-height: 1.6; color: $sg-text-3; }
</style>
