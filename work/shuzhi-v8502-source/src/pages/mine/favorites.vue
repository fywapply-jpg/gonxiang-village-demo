<script setup lang="ts">
import { ref, computed } from "vue";
import { villageProducts } from "@/mock/products";
import { recordPlatformEvent } from "@/services/localApi";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const tab = ref<"goods" | "demand" | "shop">("goods");
const favGoods = ref(villageProducts.slice(0, 5).map((p) => p.id));
const goods = computed(() => villageProducts.filter((p) => favGoods.value.includes(p.id)));

const favDemands = [
  { id: "RD001", title: "求购 蓟州柳子口黑猪肉", buyer: "锦华连锁生鲜", budget: "≤ 300 元" },
  { id: "RD003", title: "求购 五常稻花香米 100 吨", buyer: "京客隆商贸", budget: "≤ 7.2 元/斤" },
];
const favShops = [
  { name: "赣南脐橙合作社", star: 5, cat: "水果 · 金牌商户" },
  { name: "五常金穗米业合作社", star: 4, cat: "粮油 · 优质商户" },
];

function unfav(id: string) {
  if (productionBuild) return uni.showModal({ title: "需要后台收藏数据", showCancel: false, content: "正式环境收藏关系由后台用户中心保存，当前未配置真实接口。" });
  void recordPlatformEvent("mine", "REMOVE_FAVORITE", { id }).catch(() => {});
  favGoods.value = favGoods.value.filter((x) => x !== id);
  uni.showToast({ title: "已取消收藏", icon: "none" });
}
function goSupply(id: string) { if (productionBuild) return uni.showModal({ title: "需要后台收藏数据", showCancel: false, content: "正式环境收藏货源由后台用户中心返回。" }); void recordPlatformEvent("mine", "OPEN_FAVORITE_SUPPLY", { id }).catch(() => {}); uni.navigateTo({ url: `/pages/trade/supply-detail?id=${id}` }); }
function goDemand(id: string) { if (productionBuild) return uni.showModal({ title: "需要后台收藏数据", showCancel: false, content: "正式环境收藏需求由后台用户中心返回。" }); void recordPlatformEvent("mine", "OPEN_FAVORITE_DEMAND", { id }).catch(() => {}); uni.navigateTo({ url: `/pages/trade/demand-detail?id=${id}` }); }
</script>

<template>
  <view class="sg-page">
    <view v-if="!productionBuild" class="tabs">
      <view class="tab" :class="{ on: tab === 'goods' }" @tap="tab = 'goods'">货源 {{ goods.length }}</view>
      <view class="tab" :class="{ on: tab === 'demand' }" @tap="tab = 'demand'">采购 {{ favDemands.length }}</view>
      <view class="tab" :class="{ on: tab === 'shop' }" @tap="tab = 'shop'">店铺 {{ favShops.length }}</view>
    </view>

    <!-- 收藏货源 -->
    <block v-if="!productionBuild && tab === 'goods'">
      <view v-if="!goods.length" class="empty">还没有收藏的货源</view>
      <view class="gcard" v-for="p in goods" :key="p.id" @tap="goSupply(p.id)">
        <image class="gimg" :src="p.pic" mode="aspectFill" />
        <view class="gbody">
          <text class="gname">{{ p.name }}</text>
          <text class="gmeta">{{ p.origin }} · {{ p.spec }}</text>
          <view class="gfoot"><text class="sg-price">{{ p.priceText }}</text><text class="unfav" @tap.stop="unfav(p.id)">取消收藏</text></view>
        </view>
      </view>
    </block>

    <!-- 收藏采购需求 -->
    <block v-else-if="!productionBuild && tab === 'demand'">
      <view class="dcard" v-for="d in favDemands" :key="d.id" @tap="goDemand(d.id)">
        <view class="d-i"><text class="d-t">{{ d.title }}</text><text class="d-m">{{ d.buyer }}</text></view>
        <text class="sg-price">{{ d.budget }}</text>
      </view>
    </block>

    <!-- 关注店铺 -->
    <block v-else-if="!productionBuild">
      <view class="scard" v-for="s in favShops" :key="s.name">
        <view class="s-badge">{{ s.name[0] }}</view>
        <view class="s-i"><text class="s-n">{{ s.name }}</text><text class="s-c">{{ s.cat }}</text></view>
        <text class="s-star">{{ '★'.repeat(s.star) }}</text>
      </view>
    </block>
    <view v-if="productionBuild" class="backend-note">正式环境收藏货源、采购需求和店铺由后台用户中心实时返回；当前未配置真实收藏接口，已隐藏演示数据。</view>
  </view>
</template>

<style lang="scss" scoped>
.tabs { display: flex; background: #fff; }
.tab { flex: 1; text-align: center; padding: 26rpx 0; font-size: 27rpx; color: $sg-text-2; position: relative; }
.tab.on { color: $sg-primary; font-weight: 700; }
.tab.on::after { content: ""; position: absolute; bottom: 8rpx; left: 50%; transform: translateX(-50%); width: 44rpx; height: 6rpx; border-radius: 3rpx; background: $sg-primary; }
.empty { text-align: center; color: $sg-text-3; font-size: 26rpx; padding: 100rpx; }
.gcard { display: flex; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 20rpx 24rpx 0; padding: 20rpx; }
.gimg { width: 150rpx; height: 150rpx; border-radius: $sg-radius; margin-right: 20rpx; background: $sg-primary-light; }
.gbody { flex: 1; display: flex; flex-direction: column; }
.gname { font-size: 27rpx; font-weight: 600; }
.gmeta { font-size: 21rpx; color: $sg-text-3; margin: 6rpx 0; }
.gfoot { display: flex; align-items: center; justify-content: space-between; margin-top: auto; }
.sg-price { font-size: 30rpx; }
.unfav { font-size: 22rpx; color: $sg-text-3; border: 2rpx solid $sg-border; padding: 6rpx 18rpx; border-radius: 999rpx; }
.dcard { display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 20rpx 24rpx 0; padding: 24rpx; }
.d-i { display: flex; flex-direction: column; }
.d-t { font-size: 27rpx; font-weight: 600; }
.d-m { font-size: 21rpx; color: $sg-text-3; margin-top: 4rpx; }
.scard { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 20rpx 24rpx 0; padding: 24rpx; }
.s-badge { width: 72rpx; height: 72rpx; border-radius: 50%; background: $sg-primary-light; color: $sg-primary; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 800; margin-right: 18rpx; }
.s-i { flex: 1; display: flex; flex-direction: column; }
.s-n { font-size: 27rpx; font-weight: 600; }
.s-c { font-size: 21rpx; color: $sg-text-3; margin-top: 4rpx; }
.s-star { color: $sg-gold; font-size: 24rpx; }
.backend-note { margin: 40rpx 28rpx; padding: 28rpx; border-radius: 24rpx; background: #fff8e8; color: #8a5a00; line-height: 1.6; font-size: 24rpx; }
</style>
