<script setup lang="ts">
import { ref } from "vue";
import { armyPlan, armyChecks } from "@/mock/endtools";
import { useTradeStore } from "@/store/trade";
const trade = useTradeStore();
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const week = ref(1);
function order() {
  if (productionBuild) return uni.showModal({ title: "需要后台军供服务", content: "正式环境的涉敏军供计划必须由授权后台创建、审核和签约，不能使用本地样例生成采购单。", showCancel: false });
  const items = armyPlan.map((p) => ({ name: `${p.day} · ${p.cat}`, spec: `${p.qty} → ${p.point}` }));
  const id = trade.addDemand({
    title: `军供 定点定量周配送计划（第${week.value}周）`, category: "团餐食材",
    qty: `${armyPlan.length} 项 · 定点定量`, addr: "涉军 · 脱敏", deadline: "计划配送",
    buyer: "后勤保障配送中心（脱敏）", budget: "计划结算 · 专账", pic: "/static/products/p8.jpg", items,
  });
  uni.showModal({ title: "军供计划单已生成", showCancel: false, confirmText: "去采购大厅",
    content: `需求单 ${id}｜第 ${week.value} 周计划配送\n军供名录准入、双人双锁、全程冷链 GPS、A 级检测，优先保障、专账结算。`,
    success: () => (uni.setStorageSync('tradeTab','demand'), uni.switchTab({ url: '/pages/trade/index' })) });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🎖️ 军供计划配送</text>
      <text class="hs">定点 · 定量 · 定时 · 优先保障 · 全程可追</text>
    </view>

    <view class="note">⚠️ 军供涉敏感信息，本页机构与数据均已脱敏。</view>

    <view class="wk">
      <text class="wk-l">保障周次</text>
      <view class="wk-tabs"><text v-for="n in 4" :key="n" class="wk-t" :class="{ on: week===n }" @tap="week=n">第{{ n }}周</text></view>
    </view>

    <view class="sec">周配送计划</view>
    <view class="sg-card">
      <view class="pl-hd"><text class="p-d">日</text><text class="p-c">品类</text><text class="p-q">数量</text><text class="p-p">配送点</text></view>
      <view class="pl" v-for="p in armyPlan" :key="p.day">
        <text class="p-d">{{ p.day }}</text>
        <text class="p-c">{{ p.cat }}</text>
        <text class="p-q">{{ p.qty }}</text>
        <text class="p-p">{{ p.point }}</text>
      </view>
    </view>

    <view class="sec">合规核验状态</view>
    <view class="checks">
      <text class="chk" v-for="c in armyChecks" :key="c">{{ c }}</text>
    </view>

    <view class="cta" @tap="order">确认计划 · 生成军供配送单 ›</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #3f5140, #263528); padding: 32rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; }
.note { margin: 20rpx 24rpx 0; padding: 16rpx 20rpx; background: $sg-gold-light; border-left: 8rpx solid $sg-gold; border-radius: $sg-radius; font-size: 21rpx; color: #9a6a12; line-height: 1.5; }
.wk { margin: 20rpx 24rpx 0; }
.wk-l { font-size: 24rpx; color: $sg-text-2; }
.wk-tabs { display: flex; gap: 12rpx; margin-top: 12rpx; }
.wk-t { flex: 1; text-align: center; font-size: 23rpx; padding: 14rpx 0; border-radius: 999rpx; background: #fff; color: $sg-text-2; box-shadow: $sg-shadow; }
.wk-t.on { background: #3f5140; color: #fff; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.sg-card { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 8rpx 20rpx; }
.pl-hd { display: flex; padding: 14rpx 0; border-bottom: 2rpx solid $sg-border; }
.pl-hd text { font-size: 20rpx; color: $sg-text-3; }
.pl { display: flex; align-items: center; padding: 16rpx 0; border-top: 2rpx solid $sg-bg; }
.pl:first-of-type { border-top: none; }
.p-d { flex: 0.7; font-size: 23rpx; font-weight: 600; }
.p-c { flex: 1.6; font-size: 23rpx; }
.p-q { flex: 1; font-size: 22rpx; color: $sg-red; }
.p-p { flex: 1.2; font-size: 21rpx; color: $sg-text-2; }
.checks { display: flex; flex-wrap: wrap; gap: 14rpx; padding: 0 24rpx; }
.chk { font-size: 22rpx; color: #263528; background: #e6efe9; padding: 12rpx 20rpx; border-radius: 999rpx; }
.cta { margin: 24rpx; text-align: center; padding: 26rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #3f5140, #263528); color: #fff; font-size: 27rpx; font-weight: 700; box-shadow: 0 8rpx 20rpx rgba(38,53,40,0.3); }
</style>
