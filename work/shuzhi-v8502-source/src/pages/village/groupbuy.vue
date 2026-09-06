<script setup lang="ts">
import { ref } from "vue";
import { villageProducts } from "@/mock/products";
import { recordPlatformEvent } from "@/services/localApi";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const productionBlocked = (action: string) => uni.showModal({ title: "需后台社区团购", content: `正式环境${action}必须先创建后台团购订单、核验团长和收款条件，当前不会生成本地支付订单。`, showCancel: false });

// 团长
const leader = { name: "龙南镇 · 数智供社 3 号店", captain: "王阿姨（团长）", members: 128, self: "门店自提" };

// 产地合作社（社区团购 · 产地直采，区别于 B2B 枢纽货源）
const coops = ["赣南脐橙合作社", "寿光设施蔬菜合作社", "五常稻花香合作社", "烟台苹果合作社", "潜江小龙虾合作社", "赤峰杂粮合作社"];

// 在团商品（产地直采、预售集单）
const groups = ref(villageProducts.slice(0, 6).map((p, i) => ({
  id: p.id, name: p.name, pic: p.pic, price: p.price, group: Math.max(1, Math.round(p.price * 0.85)),
  need: 20, joined: [8, 15, 19, 6, 12, 17][i], deadline: ["今晚 20:00", "明日 10:00", "今晚 21:00", "明日 12:00", "今晚 20:00", "明日 09:00"][i],
  origin: p.origin || "产地直采", coop: coops[i % coops.length], presale: i % 2 === 0,
})));

// 预售集单流程
const presaleFlow = ["社区预售下单", "满量截单", "产地合作社现采", "冷链直发到店", "次日到店自提"];
function trace(g: any) {
  if (productionBuild) return productionBlocked("溯源查询");
  uni.showModal({ title: "产地直采溯源", showCancel: false, confirmText: "知道了",
    content: `${g.name}\n产地：${g.origin}\n合作社：${g.coop}（社员直供）\n采摘 → 分级 → 冷链 → 到店，全程上链\n溯源码：0x${(0x7a10 + g.name.length * 3).toString(16)}…c${g.joined}` });
}
function toLeader() { uni.navigateTo({ url: "/pages/village/leader" }); }

function joinGroup(g: any) {
  if (productionBuild) return productionBlocked("拼团下单");
  if (g.joined >= g.need) return uni.showToast({ title: "已成团", icon: "none" });
  void recordPlatformEvent("village", "JOIN_GROUPBUY", { product_id: g.id, name: g.name, amount: g.group }).catch(() => {});
  uni.showModal({ title: "参与拼团", content: `拼团价 ¥${g.group}/份（原价 ¥${g.price}）\n${g.name}\n满 ${g.need} 份成团，${leader.self}。`,
    confirmText: "去支付", success: (r) => { if (r.confirm) uni.navigateTo({ url: `/pages/pay/index?title=${encodeURIComponent(g.name + ' 社区拼团')}&amount=${g.group}&no=GB${Date.now()}` }); } });
}
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty"><text class="production-empty-title">暂无后台社区团购</text><text class="production-empty-text">正式环境只展示后台团长、商品、库存、收款和履约状态；本地团购样例不会生成真实订单。</text></view>
    <template v-else>
    <view class="hd">
      <view class="hd-top"><text class="hd-t">🛒 社区团购</text><text class="b2c">B2C · 面向社区居民</text></view>
      <text class="hd-s">{{ leader.name }} · {{ leader.captain }}</text>
      <view class="hd-meta"><text>👥 {{ leader.members }} 位邻居</text><text>📍 {{ leader.self }}</text></view>
    </view>

    <view class="leader-entry" @tap="toLeader">
      <text class="le-ic">🧑‍🌾</text>
      <view class="le-i"><text class="le-t">社区团长中心 · 开团带货赚佣金</text><text class="le-s">团长赋能 · 产地直采货盘 · 社群工具 · 佣金结算</text></view>
      <text class="le-go">进入 ›</text>
    </view>

    <view class="flow">
      <view class="fw"><text class="fw-n">①</text><text>团长开团</text></view>
      <text class="fw-a">→</text>
      <view class="fw"><text class="fw-n">②</text><text>邻居拼单</text></view>
      <text class="fw-a">→</text>
      <view class="fw"><text class="fw-n">③</text><text>满量成团</text></view>
      <text class="fw-a">→</text>
      <view class="fw"><text class="fw-n">④</text><text>门店自提</text></view>
    </view>

    <!-- 预售集单 · 产地直采 -->
    <view class="presale">
      <text class="ps-t">🌱 预售集单 · 产地直采</text>
      <view class="ps-flow">
        <view class="psf" v-for="(s, i) in presaleFlow" :key="s"><text class="psf-d">{{ i + 1 }}</text><text class="psf-t">{{ s }}</text><text v-if="i < presaleFlow.length - 1" class="psf-a">›</text></view>
      </view>
      <text class="ps-s">社区先预售集单、产地合作社按单备货，以销定采，降低库存和损耗，价格、品质与溯源按实际批次展示。</text>
    </view>

    <view class="grid">
      <view class="card" v-for="g in groups" :key="g.id">
        <view class="pic-wrap">
          <image class="pic" :src="g.pic" mode="aspectFill" />
          <text v-if="g.presale" class="presale-tag">预售</text>
        </view>
        <view class="body">
          <text class="nm">{{ g.name }}</text>
          <view class="coop" @tap.stop="trace(g)"><text class="coop-t">🌱 {{ g.coop }}</text><text class="coop-tr">溯源 ›</text></view>
          <view class="price"><text class="gp">¥{{ g.group }}</text><text class="op">¥{{ g.price }}</text></view>
          <view class="prog"><view class="fill" :style="{ width: Math.min(100, g.joined / g.need * 100) + '%' }"></view></view>
          <view class="pmeta"><text class="jn">已拼 {{ g.joined }}/{{ g.need }}</text><text class="dl">{{ g.deadline }}</text></view>
          <view class="btn" :class="{ done: g.joined >= g.need }" @tap="joinGroup(g)">{{ g.joined >= g.need ? '已成团' : '去拼团' }}</view>
        </view>
      </view>
    </view>

    <view class="tip">🔗 产地直供、团长代提，社区最后一公里；成团价低于超市，货源全链路溯源。</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, #c0392b, #a5281c); padding: 36rpx 28rpx; color: #fff; }
.hd-top { display: flex; align-items: center; justify-content: space-between; }
.b2c { font-size: 19rpx; background: rgba(255,255,255,0.2); padding: 4rpx 14rpx; border-radius: 999rpx; }
.hd-t { font-size: 34rpx; font-weight: 800; }
.leader-entry { display: flex; align-items: center; margin: 24rpx 24rpx 0; padding: 20rpx 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #fdeceb, #fff); border: 2rpx solid #f3c9c5; box-shadow: $sg-shadow; }
.le-ic { font-size: 40rpx; margin-right: 14rpx; }
.le-i { flex: 1; display: flex; flex-direction: column; }
.le-t { font-size: 25rpx; font-weight: 800; color: #c0392b; }
.le-s { font-size: 18rpx; color: $sg-text-3; margin-top: 4rpx; }
.le-go { font-size: 23rpx; color: #c0392b; }
.presale { margin: 16rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx 22rpx; }
.ps-t { font-size: 26rpx; font-weight: 800; color: $sg-primary-deep; }
.ps-flow { display: flex; flex-wrap: wrap; align-items: center; margin: 12rpx 0 8rpx; }
.psf { display: flex; align-items: center; }
.psf-d { width: 32rpx; height: 32rpx; border-radius: 50%; background: $sg-primary-light; color: $sg-primary; font-size: 18rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.psf-t { font-size: 20rpx; margin: 0 4rpx 0 6rpx; }
.psf-a { color: $sg-text-3; margin-right: 6rpx; }
.ps-s { font-size: 20rpx; color: $sg-text-3; line-height: 1.5; display: block; }
.pic-wrap { position: relative; }
.presale-tag { position: absolute; top: 10rpx; left: 10rpx; font-size: 18rpx; color: #fff; background: $sg-primary; padding: 3rpx 12rpx; border-radius: 6rpx; }
.coop { display: flex; align-items: center; justify-content: space-between; margin: 6rpx 0; }
.coop-t { font-size: 19rpx; color: $sg-primary; }
.coop-tr { font-size: 18rpx; color: $sg-text-3; }
.hd-s { font-size: 22rpx; opacity: 0.92; margin-top: 6rpx; display: block; }
.hd-meta { display: flex; gap: 30rpx; margin-top: 12rpx; font-size: 21rpx; opacity: 0.9; }
.flow { display: flex; align-items: center; justify-content: center; background: #fff; margin: 24rpx; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx 10rpx; }
.fw { display: flex; flex-direction: column; align-items: center; font-size: 21rpx; color: $sg-text-2; }
.fw-n { font-size: 26rpx; font-weight: 800; color: #c0392b; }
.fw-a { color: $sg-text-3; margin: 0 8rpx; }
.grid { display: flex; flex-wrap: wrap; padding: 0 16rpx; }
.card { width: calc(50% - 32rpx); margin: 0 16rpx 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; overflow: hidden; }
.pic { width: 100%; height: 240rpx; display: block; background: $sg-primary-light; }
.body { padding: 14rpx 16rpx 18rpx; }
.nm { font-size: 25rpx; font-weight: 600; display: block; height: 68rpx; overflow: hidden; line-height: 1.35; }
.price { display: flex; align-items: baseline; }
.gp { font-size: 32rpx; font-weight: 800; color: #c0392b; }
.op { font-size: 20rpx; color: $sg-text-3; text-decoration: line-through; margin-left: 8rpx; }
.prog { height: 12rpx; background: $sg-bg; border-radius: 6rpx; overflow: hidden; margin: 8rpx 0 6rpx; }
.fill { height: 100%; background: linear-gradient(90deg, #e57373, #c0392b); }
.pmeta { display: flex; justify-content: space-between; }
.jn { font-size: 19rpx; color: #c0392b; }
.dl { font-size: 19rpx; color: $sg-text-3; }
.btn { margin-top: 10rpx; text-align: center; padding: 14rpx 0; border-radius: 999rpx; background: #c0392b; color: #fff; font-size: 24rpx; font-weight: 600; }
.btn.done { background: $sg-bg; color: $sg-text-3; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
</style>
