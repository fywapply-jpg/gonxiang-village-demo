<script setup lang="ts">
import { ref, computed } from "vue";
import { agriProducts } from "@/mock";
import { villageProducts } from "@/mock/products";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const kw = ref("");
const hot = ["黑猪肉", "沙窝萝卜", "香油", "红糖", "葡萄酒", "鸡蛋"];
const results = computed(() => {
  if (!kw.value) return [];
  const k = kw.value;
  const a = villageProducts
    .filter((s) => s.name.includes(k) || s.origin.includes(k) || s.cat.includes(k) || s.supplier.includes(k))
    .map((s) => ({ t: s.name + " · " + s.origin, u: `/pages/trade/supply-detail?id=${s.id}`, pic: s.pic, e: "" }));
  const b = agriProducts
    .filter((p) => p.name.includes(k))
    .map((p) => ({ t: p.name, u: `/pages/agri/detail?id=${p.id}`, pic: "", e: p.emoji }));
  return [...a, ...b];
});
function go(u: string) { if (productionBuild) return uni.showModal({ title: "需要后台搜索数据", showCancel: false, content: "正式环境搜索结果由后台商品、采购需求和运单接口返回。" }); uni.navigateTo({ url: u }); }
</script>

<template>
  <view class="sg-page">
    <view class="sbar">
      <text class="si">🔎</text>
      <input class="ip" v-model="kw" placeholder="搜货源 / 采购需求 / 农资 / 运单号" focus />
    </view>
    <view v-if="!productionBuild && !kw" class="hot">
      <text class="ht">热门搜索</text>
      <view class="tags"><text class="tag" v-for="h in hot" :key="h" @tap="kw = h.replace(/ .*/, '')">{{ h }}</text></view>
    </view>
    <view v-else-if="!productionBuild">
      <view v-if="results.length" class="res" v-for="(r, i) in results" :key="i" @tap="go(r.u)">
        <image v-if="r.pic" class="rpic" :src="r.pic" mode="aspectFill" />
        <text v-else class="re">{{ r.e }}</text>
        <text class="rt">{{ r.t }}</text><text class="rgo">›</text>
      </view>
      <view v-if="!results.length" class="empty">未找到「{{ kw }}」相关结果</view>
    </view>
    <view v-if="productionBuild" class="backend-note">正式环境搜索必须接入后台商品、采购需求和运单索引；当前未配置真实搜索接口，已隐藏本地演示结果。</view>
  </view>
</template>

<style lang="scss" scoped>
.sbar { display: flex; align-items: center; background: #fff; margin: 24rpx; padding: 18rpx 26rpx; border-radius: 999rpx; }
.si { margin-right: 12rpx; }
.ip { flex: 1; font-size: 27rpx; }
.hot { padding: 0 24rpx; }
.ht { font-size: 26rpx; font-weight: 700; }
.tags { display: flex; flex-wrap: wrap; margin-top: 16rpx; }
.tag { font-size: 25rpx; background: #fff; color: $sg-text-2; padding: 12rpx 26rpx; border-radius: 999rpx; margin: 0 14rpx 14rpx 0; }
.res { display: flex; align-items: center; background: #fff; padding: 24rpx; border-bottom: 2rpx solid $sg-border; }
.re { font-size: 40rpx; margin-right: 18rpx; }
.rpic { width: 72rpx; height: 72rpx; border-radius: 12rpx; margin-right: 18rpx; background: $sg-primary-light; }
.rt { flex: 1; font-size: 27rpx; }
.rgo { color: $sg-text-3; }
.empty { text-align: center; color: $sg-text-3; font-size: 26rpx; padding: 80rpx; }
.backend-note { margin: 40rpx 28rpx; padding: 28rpx; border-radius: 24rpx; background: #fff8e8; color: #8a5a00; line-height: 1.6; font-size: 24rpx; }
</style>
