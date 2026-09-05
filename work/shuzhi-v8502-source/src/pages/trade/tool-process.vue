<script setup lang="ts">
import { ref, computed } from "vue";
import { procMats } from "@/mock/endtools";
import { useTradeStore } from "@/store/trade";
const trade = useTradeStore();
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const monthly = ref(500); // 月加工成品量（吨）
function setM(n: number) { monthly.value = Math.max(0, n); }
function onMonthlyInput(event: any) { setM(Number(event.detail.value)); }

// 年度原料需求 = 每吨成品原料 × 月量 × 12
const rows = computed(() => procMats.map((m) => {
  const need = +(m.perTon * monthly.value * 12).toFixed(0);
  const spotCost = need * m.spot;
  const lockCost = need * m.lock;
  return { ...m, need, spotCost, lockCost, save: spotCost - lockCost };
}));
const totalLock = computed(() => rows.value.reduce((s, r) => s + r.lockCost, 0));
const totalSave = computed(() => rows.value.reduce((s, r) => s + r.save, 0));

function order() {
  if (productionBuild) return uni.showModal({ title: "需要后台年单服务", content: "正式环境的年度原料框架单必须经过后台需求审核、供应商报价、合同和结算条件核验，不能使用本地样例生成采购单。", showCancel: false });
  const items = rows.value.map((r) => ({ name: r.name, spec: `${r.need.toLocaleString()} ${r.unit}/年`, price: r.lock, sub: r.lockCost }));
  const id = trade.addDemand({
    title: `年单 加工原料年度框架（${rows.value.length}种·锁价）`, category: "粮油调味",
    qty: `${rows.value.length} 种 · 分批交付`, addr: "枢纽 · 产地基地直采", deadline: "年度框架",
    buyer: "食品加工企业（本厂）", budget: `≤ ${(totalLock.value / 10000).toFixed(0)} 万元/年`, pic: "/static/products/p8.jpg", items,
  });
  uni.showModal({ title: "年度框架单已生成", showCancel: false, confirmText: "去采购大厅",
    content: `需求单 ${id}｜锁价年采 ¥${(totalLock.value / 10000).toFixed(0)} 万\n期货年单锁价，较现价预计省 ¥${(totalSave.value / 10000).toFixed(1)} 万/年，分批交付、以销定产。`,
    success: () => (uni.setStorageSync('tradeTab','demand'), uni.switchTab({ url: '/pages/trade/index' })) });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🏭 原料年单锁价</text>
      <text class="hs">按产能反算年度原料 · 期货年单锁价避波动</text>
    </view>

    <view class="sg-card">
      <view class="pt-row">
        <text class="lbl">月加工成品量</text>
        <view class="stepper">
          <text class="stp" @tap="setM(monthly - 100)">－</text>
          <input class="pin" type="number" :value="String(monthly)" @input="onMonthlyInput" />
          <text class="unit">吨/月</text>
          <text class="stp" @tap="setM(monthly + 100)">＋</text>
        </view>
      </view>
      <view class="quick"><text v-for="n in [200,500,1000,2000]" :key="n" class="qb" :class="{ on: monthly===n }" @tap="setM(n)">{{ n }}吨</text></view>
    </view>

    <view class="sec">年度原料需求与锁价</view>
    <view class="sg-card">
      <view class="mat" v-for="r in rows" :key="r.name">
        <view class="m-top"><text class="m-n">{{ r.name }}</text><text class="m-need">{{ r.need.toLocaleString() }} {{ r.unit }}/年</text></view>
        <view class="m-price">
          <text class="m-spot">现价 ¥{{ r.spot }}</text>
          <text class="m-lock">锁价 ¥{{ r.lock }}</text>
          <text class="m-save">省 ¥{{ (r.save/10000).toFixed(1) }}万</text>
        </view>
      </view>
      <view class="sum">
        <view class="sum-l"><text class="sum-k">锁价年采总额</text><text class="sum-save">较现价省 ¥{{ (totalSave/10000).toFixed(1) }} 万/年</text></view>
        <text class="sum-v">¥{{ (totalLock/10000).toFixed(0) }}万</text>
      </view>
    </view>

    <view class="tip">📈 以期货年单锁定价格，规避原料波动；产地基地直采、分批交付、以销定产不压库。</view>
    <view class="cta" @tap="order">签年度框架单 · 生成采购需求 ›</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #c0392b, #922b21); padding: 32rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; }
.sg-card { margin: 20rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.pt-row { display: flex; align-items: center; justify-content: space-between; }
.lbl { font-size: 28rpx; font-weight: 700; }
.stepper { display: flex; align-items: center; }
.stp { width: 56rpx; height: 56rpx; border-radius: 12rpx; background: #fdecea; color: #c0392b; font-size: 32rpx; display: flex; align-items: center; justify-content: center; }
.pin { width: 110rpx; text-align: center; font-size: 32rpx; font-weight: 800; color: #922b21; }
.unit { font-size: 22rpx; color: $sg-text-3; margin: 0 8rpx; }
.quick { display: flex; gap: 14rpx; margin-top: 18rpx; }
.qb { flex: 1; text-align: center; font-size: 23rpx; padding: 14rpx 0; border-radius: 999rpx; background: $sg-bg; color: $sg-text-2; }
.qb.on { background: #c0392b; color: #fff; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.mat { padding: 16rpx 0; border-top: 2rpx solid $sg-bg; }
.mat:first-child { border-top: none; }
.m-top { display: flex; justify-content: space-between; }
.m-n { font-size: 26rpx; font-weight: 700; }
.m-need { font-size: 23rpx; color: $sg-text-2; }
.m-price { display: flex; gap: 18rpx; margin-top: 8rpx; }
.m-spot { font-size: 21rpx; color: $sg-text-3; text-decoration: line-through; }
.m-lock { font-size: 22rpx; color: #c0392b; font-weight: 700; }
.m-save { font-size: 21rpx; color: $sg-primary; margin-left: auto; }
.sum { display: flex; justify-content: space-between; align-items: center; margin-top: 16rpx; padding-top: 16rpx; border-top: 2rpx solid $sg-border; }
.sum-l { display: flex; flex-direction: column; }
.sum-k { font-size: 25rpx; font-weight: 700; }
.sum-save { font-size: 20rpx; color: $sg-primary; margin-top: 2rpx; }
.sum-v { font-size: 38rpx; font-weight: 800; color: #c0392b; }
.tip { margin: 20rpx 24rpx 0; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.cta { margin: 20rpx 24rpx; text-align: center; padding: 26rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #c0392b, #922b21); color: #fff; font-size: 27rpx; font-weight: 700; box-shadow: 0 8rpx 20rpx rgba(192,57,43,0.3); }
</style>
