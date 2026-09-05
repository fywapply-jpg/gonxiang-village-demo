<script setup lang="ts">
import { ref } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

const zones = ["全部", "冷冻 -18℃", "冷藏 0~4℃", "恒温 10~15℃", "常温"];
const zone = ref("全部");

const stores = [
  { name: "赣州产地冷链中心", dist: "2.1km", zoneType: "冷藏 0~4℃", free: "1200 m³", total: "8000 m³", price: "1.2 元/m³·天", multi: ["冷冻", "冷藏", "恒温"] },
  { name: "潍坊蔬菜前置仓", dist: "5.6km", zoneType: "恒温 10~15℃", free: "600 m³", total: "3000 m³", price: "0.9 元/m³·天", multi: ["冷藏", "恒温", "常温"] },
  { name: "深圳销地卫星仓", dist: "8.3km", zoneType: "冷冻 -18℃", free: "300 m³", total: "5000 m³", price: "1.8 元/m³·天", multi: ["冷冻", "冷藏"] },
  { name: "郑州中转保税仓", dist: "12km", zoneType: "冷藏 0~4℃", free: "900 m³", total: "6000 m³", price: "1.1 元/m³·天", multi: ["冷冻", "冷藏", "恒温", "常温"] },
];
const list = () => zone.value === "全部" ? stores : stores.filter((s) => s.zoneType.includes(zone.value.slice(0, 2)));

function book(name: string) {
  if (productionBuild) return uni.showModal({ title: "需后台仓储预约", content: "正式环境仓容预约必须校验仓库实时容量、温区、合同和计费账户；当前未创建本地预约。", showCancel: false });
  uni.showModal({ title: "仓容预约", content: `预约「${name}」冷库仓容，就近入仓、按日计费、温区可选。`,
    confirmText: "确认预约", success: (r) => { if (r.confirm) uni.showToast({ title: "预约成功", icon: "success" }); } });
}
</script>

<template>
  <view class="sg-page">
    <view class="hd">
      <text class="hd-t">仓容预约 · 多温区冷库</text>
      <text class="hd-s">周边冷库实时仓容 · 就近入仓 · 按日计费 · 温区可选</text>
    </view>
    <scroll-view scroll-x class="zones">
      <text v-for="z in zones" :key="z" class="z" :class="{ on: zone === z }" @tap="zone = z">{{ z }}</text>
    </scroll-view>

    <view class="card" v-for="s in list()" :key="s.name">
      <view class="sg-between">
        <text class="nm">{{ s.name }}</text>
        <text class="dist">📍 {{ s.dist }}</text>
      </view>
      <view class="multi"><text class="mz" v-for="m in s.multi" :key="m">{{ m }}</text></view>
      <view class="cap">
        <view class="cap-l"><text class="cap-free">可用 {{ s.free }}</text><text class="cap-total">/ {{ s.total }}</text></view>
        <text class="price">{{ s.price }}</text>
      </view>
      <view class="book" @tap="book(s.name)">预约仓容</view>
    </view>
    <view class="tip">🔗 入仓生成电子仓单、温区温湿度实时上链，可用于仓单质押融资</view>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, $sg-blue, #1e4f80); padding: 36rpx 28rpx; color: #fff; }
.hd-t { font-size: 32rpx; font-weight: 800; }
.hd-s { font-size: 21rpx; opacity: 0.9; margin-top: 8rpx; display: block; }
.zones { white-space: nowrap; padding: 20rpx 24rpx 8rpx; }
.z { display: inline-block; padding: 10rpx 26rpx; font-size: 24rpx; background: #fff; color: $sg-text-2; border-radius: 999rpx; margin-right: 14rpx; }
.z.on { background: $sg-blue; color: #fff; }
.card { background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 20rpx; padding: 24rpx; }
.nm { font-size: 28rpx; font-weight: 700; }
.dist { font-size: 22rpx; color: $sg-text-3; }
.multi { display: flex; margin: 12rpx 0; }
.mz { font-size: 20rpx; color: $sg-blue; background: #eef5ff; padding: 4rpx 14rpx; border-radius: 6rpx; margin-right: 10rpx; }
.cap { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16rpx; }
.cap-free { font-size: 30rpx; font-weight: 800; color: $sg-primary; }
.cap-total { font-size: 22rpx; color: $sg-text-3; }
.price { font-size: 24rpx; color: $sg-red; font-weight: 600; }
.book { text-align: center; padding: 18rpx 0; border-radius: 999rpx; background: $sg-blue; color: #fff; font-size: 27rpx; font-weight: 600; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
</style>
