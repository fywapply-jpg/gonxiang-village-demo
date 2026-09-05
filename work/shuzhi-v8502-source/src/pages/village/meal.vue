<script setup lang="ts">
import { ref } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

const store = { name: "龙南镇 · 数智供社长者食堂", subsidy: "已对接民政养老补贴" };

// 就餐人身份 → 价格
const identities = [
  { key: "a", name: "60-79 岁长者", price: 8, tag: "政府补贴价" },
  { key: "b", name: "80 岁以上", price: 0, tag: "免费" },
  { key: "c", name: "普通居民", price: 15, tag: "平价" },
];
const identity = ref("a");
function price() { return identities.find((i) => i.key === identity.value)!.price; }

// 今日菜单
const menu = [
  { name: "红烧肉套餐", emoji: "🍚", desc: "红烧肉 + 时蔬 + 米饭 + 汤", soft: false },
  { name: "三菜一汤 · 营养餐", emoji: "🥗", desc: "荤素搭配 · 低盐低油", soft: false },
  { name: "软食营养餐", emoji: "🥣", desc: "软烂易嚼 · 适合高龄", soft: true },
  { name: "糖尿病友好餐", emoji: "🍲", desc: "低糖控碳水 · 营养师配", soft: false },
];
const pick = ref("红烧肉套餐");

// 用餐方式
const ways = ["堂食", "预约取餐", "长者送餐上门"];
const way = ref("堂食");

function care() { uni.navigateTo({ url: "/pages/village/care" }); }
function order() {
  const p = price();
  if (productionBuild && p === 0) return uni.showModal({ title: "需后台助餐核验", content: "正式环境免费助餐必须由后台核验老人身份、补贴额度、门店库存和取餐记录；当前未创建本地订单。", showCancel: false });
  uni.showModal({
    title: "预订助餐",
    content: `${pick.value} · ${identities.find(i=>i.key===identity.value)!.name}\n${way.value} · 应付 ¥${p}${p === 0 ? '（免费）' : ''}`,
    confirmText: p === 0 ? "确认预订" : "去支付",
    success: (r) => {
      if (!r.confirm) return;
      if (p === 0) return uni.showToast({ title: "预订成功", icon: "success" });
      uni.navigateTo({ url: `/pages/pay/index?title=${encodeURIComponent(pick.value + ' 助餐')}&amount=${p}&no=ML${Date.now()}` });
    },
  });
}
</script>

<template>
  <view class="sg-page">
    <view class="hd">
      <text class="hd-t">🍚 老年助餐 · 订餐</text>
      <text class="hd-s">{{ store.name }}</text>
      <text class="hd-b">{{ store.subsidy }}</text>
    </view>

    <view class="care-entry" @tap="care">
      <text class="ce-ic">❤️</text>
      <view class="ce-i"><text class="ce-t">银发关怀 · 助餐公益</text><text class="ce-s">送餐即探访独居老人 · 爱心认捐 · 补贴透明公示</text></view>
      <text class="ce-go">进入 ›</text>
    </view>

    <!-- 就餐身份 -->
    <view class="sg-card">
      <text class="ct">就餐人身份</text>
      <view class="ids">
        <view class="id" :class="{ on: identity === i.key }" v-for="i in identities" :key="i.key" @tap="identity = i.key">
          <text class="id-n">{{ i.name }}</text>
          <text class="id-p" :class="{ free: i.price === 0 }">{{ i.price === 0 ? '免费' : '¥' + i.price }}</text>
          <text class="id-tag">{{ i.tag }}</text>
        </view>
      </view>
    </view>

    <!-- 今日菜单 -->
    <view class="sg-card">
      <text class="ct">今日菜单</text>
      <view class="meal" :class="{ on: pick === m.name }" v-for="m in menu" :key="m.name" @tap="pick = m.name">
        <text class="m-e">{{ m.emoji }}</text>
        <view class="m-i"><text class="m-n">{{ m.name }}<text v-if="m.soft" class="soft">软食</text></text><text class="m-d">{{ m.desc }}</text></view>
        <view class="m-rd" :class="{ on: pick === m.name }">{{ pick === m.name ? '●' : '' }}</view>
      </view>
    </view>

    <!-- 用餐方式 -->
    <view class="sg-card">
      <text class="ct">用餐方式</text>
      <view class="ways">
        <text class="way" :class="{ on: way === w }" v-for="w in ways" :key="w" @tap="way = w">{{ w }}</text>
      </view>
    </view>

    <view class="tip">🔗 助餐消费与政府养老补贴自动核销、链上留痕；送餐上门由服务站专员/志愿者配送。</view>

    <view class="bar">
      <view class="bar-l"><text class="bl-1">应付</text><text class="bl-2" :class="{ free: price() === 0 }">{{ price() === 0 ? '免费' : '¥' + price() }}</text></view>
      <view class="bar-btn" @tap="order">预订助餐</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, #c0392b, #a5281c); padding: 36rpx 28rpx; color: #fff; }
.hd-t { font-size: 34rpx; font-weight: 800; }
.hd-s { font-size: 22rpx; opacity: 0.92; margin-top: 6rpx; display: block; }
.hd-b { font-size: 20rpx; opacity: 0.85; margin-top: 6rpx; display: inline-block; border: 2rpx solid rgba(255,255,255,0.4); padding: 4rpx 16rpx; border-radius: 999rpx; }
.care-entry { display: flex; align-items: center; margin: 24rpx 24rpx 0; padding: 20rpx 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #fdeceb, #fff); border: 2rpx solid #f3c9c5; box-shadow: $sg-shadow; }
.ce-ic { font-size: 40rpx; margin-right: 14rpx; }
.ce-i { flex: 1; display: flex; flex-direction: column; }
.ce-t { font-size: 26rpx; font-weight: 800; color: #c0392b; }
.ce-s { font-size: 18rpx; color: $sg-text-3; margin-top: 4rpx; }
.ce-go { font-size: 23rpx; color: #c0392b; }
.ct { font-size: 28rpx; font-weight: 700; display: block; margin-bottom: 14rpx; }
.ids { display: flex; gap: 16rpx; }
.id { flex: 1; border: 3rpx solid $sg-border; border-radius: $sg-radius; padding: 18rpx 8rpx; display: flex; flex-direction: column; align-items: center; }
.id.on { border-color: #c0392b; background: #fdeceb; }
.id-n { font-size: 22rpx; font-weight: 600; text-align: center; }
.id-p { font-size: 32rpx; font-weight: 800; color: #c0392b; margin: 6rpx 0; }
.id-p.free { color: $sg-primary; }
.id-tag { font-size: 18rpx; color: $sg-text-3; }
.meal { display: flex; align-items: center; padding: 16rpx 0; border-top: 2rpx solid $sg-border; }
.meal:first-of-type { border-top: none; }
.m-e { font-size: 48rpx; margin-right: 16rpx; }
.m-i { flex: 1; display: flex; flex-direction: column; }
.m-n { font-size: 27rpx; font-weight: 600; }
.soft { font-size: 18rpx; color: #fff; background: $sg-gold; padding: 2rpx 10rpx; border-radius: 6rpx; margin-left: 10rpx; }
.m-d { font-size: 21rpx; color: $sg-text-3; margin-top: 2rpx; }
.m-rd { width: 40rpx; height: 40rpx; border-radius: 50%; border: 2rpx solid $sg-border; color: #c0392b; display: flex; align-items: center; justify-content: center; font-size: 28rpx; }
.m-rd.on { border-color: #c0392b; }
.ways { display: flex; gap: 16rpx; }
.way { flex: 1; text-align: center; padding: 18rpx 0; border-radius: $sg-radius; background: $sg-bg; font-size: 25rpx; }
.way.on { background: #c0392b; color: #fff; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; padding-bottom: 120rpx; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; display: flex; align-items: center; gap: 20rpx; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.05); }
.bar-l { flex: 1; display: flex; align-items: baseline; }
.bl-1 { font-size: 24rpx; color: $sg-text-3; margin-right: 8rpx; }
.bl-2 { font-size: 40rpx; font-weight: 800; color: #c0392b; }
.bl-2.free { color: $sg-primary; }
.bar-btn { flex: 0 0 44%; text-align: center; padding: 26rpx 0; border-radius: 999rpx; font-size: 30rpx; font-weight: 700; background: linear-gradient(135deg, #c0392b, #a5281c); color: #fff; }
</style>
