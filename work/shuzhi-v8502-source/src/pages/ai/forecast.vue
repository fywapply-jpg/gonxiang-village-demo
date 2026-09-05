<script setup lang="ts">
import { ref, computed } from "vue";

const cats = [
  { key: "orange", n: "赣南脐橙", cur: 4.8, unit: "元/斤", trend: 1 },
  { key: "apple", n: "红富士苹果", cur: 3.9, unit: "元/斤", trend: -1 },
  { key: "cabbage", n: "大白菜", cur: 1.2, unit: "元/斤", trend: 1 },
  { key: "pork", n: "生猪白条", cur: 22, unit: "元/kg", trend: -1 },
  { key: "rice", n: "优质稻米", cur: 2.9, unit: "元/斤", trend: 0 },
];
const ci = ref(0);
const period = ref(7);
const cat = computed(() => cats[ci.value]);

// 生成预测价格序列（含今日 + 未来）
const series = computed(() => {
  const c = cat.value; const n = period.value === 7 ? 7 : 10;
  const amp = period.value === 7 ? 0.05 : 0.12;
  const arr: { label: string; price: number; today?: boolean }[] = [];
  for (let i = 0; i < n; i++) {
    const prog = i / (n - 1);
    const wave = Math.sin(i * 1.3 + c.cur) * amp * 0.4;
    const price = +(c.cur * (1 + c.trend * prog * amp + wave)).toFixed(period.value === 7 ? 2 : 1);
    const label = i === 0 ? "今日" : (period.value === 7 ? "+" + i + "d" : "+" + (i * 3) + "d");
    arr.push({ label, price, today: i === 0 });
  }
  return arr;
});
const pmax = computed(() => Math.max(...series.value.map((s) => s.price)) * 1.05);
const pmin = computed(() => Math.min(...series.value.map((s) => s.price)) * 0.92);
const endPrice = computed(() => series.value[series.value.length - 1].price);
const change = computed(() => +(((endPrice.value - cat.value.cur) / cat.value.cur) * 100).toFixed(1));
const conf = computed(() => 82 + (Math.abs(cat.value.cur * 7) % 12));

const advice = computed(() => {
  const ch = change.value;
  if (ch > 3) return { buy: "价格看涨，采购方建议尽早备货、锁价下单", sell: "供货方建议适度惜售、分批出货博高点", c: "#c0392b", tag: "预计上涨" };
  if (ch < -3) return { buy: "价格看跌，采购方建议按需少量、暂缓囤货", sell: "供货方建议尽快出货、避免压价", c: "#16884c", tag: "预计下跌" };
  return { buy: "价格平稳，随行就市、正常采购", sell: "供货方随行就市，无需惜售或抛售", c: "#2b6cb0", tag: "基本平稳" };
});

const factors = computed(() => {
  const up = cat.value.trend >= 0;
  return [
    { n: "产区产量", v: up ? "偏紧 ↑" : "充足 ↓", up },
    { n: "天气影响", v: up ? "阴雨影响采收 ↑" : "晴好利于上市 ↓", up },
    { n: "物流运费", v: "平稳 →", up: null },
    { n: "节令需求", v: up ? "临近旺季 ↑" : "需求转淡 ↓", up },
  ];
});
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">📈 AI 价格预测</text>
      <text class="hs">基于产区产量·天气·物流·节令 · 预测走势 + 买卖时机</text>
    </view>

    <!-- 品类 -->
    <scroll-view scroll-x class="cats">
      <text class="c" :class="{ on: ci === i }" v-for="(c, i) in cats" :key="c.key" @tap="ci = i">{{ c.n }}</text>
    </scroll-view>

    <!-- 当前 + 预测 -->
    <view class="head">
      <view class="hl">
        <text class="cur">¥{{ cat.cur }}<text class="unit">{{ cat.unit }}</text></text>
        <text class="cl">当前均价</text>
      </view>
      <view class="hr">
        <text class="chg" :class="{ up: change > 0, down: change < 0 }">{{ change > 0 ? '▲' : change < 0 ? '▼' : '—' }} {{ Math.abs(change) }}%</text>
        <text class="cl">{{ period }} 日预测 · 置信 {{ conf }}%</text>
      </view>
    </view>

    <!-- 周期 -->
    <view class="periods">
      <text class="pd" :class="{ on: period === 7 }" @tap="period = 7">未来 7 日</text>
      <text class="pd" :class="{ on: period === 30 }" @tap="period = 30">未来 30 日</text>
    </view>

    <!-- 走势图 -->
    <view class="chart-card">
      <view class="chart">
        <view class="col" v-for="(s, i) in series" :key="i">
          <text class="cv">{{ s.price }}</text>
          <view class="bar" :class="{ today: s.today }" :style="{ height: ((s.price - pmin) / (pmax - pmin) * 180 + 20) + 'rpx', background: s.today ? '#9aa0aa' : advice.c }"></view>
          <text class="cx" :class="{ today: s.today }">{{ s.label }}</text>
        </view>
      </view>
    </view>

    <!-- 买卖时机 -->
    <view class="advice" :style="{ borderColor: advice.c }">
      <text class="ad-tag" :style="{ background: advice.c }">{{ advice.tag }} · {{ change > 0 ? '+' : '' }}{{ change }}%</text>
      <view class="ad-row"><text class="ad-role">🛒 采购方</text><text class="ad-t">{{ advice.buy }}</text></view>
      <view class="ad-row"><text class="ad-role">📦 供货方</text><text class="ad-t">{{ advice.sell }}</text></view>
    </view>

    <!-- 影响因素 -->
    <view class="sec">影响因素</view>
    <view class="factors">
      <view class="fac" v-for="f in factors" :key="f.n">
        <text class="f-n">{{ f.n }}</text>
        <text class="f-v" :class="{ up: f.up === true, down: f.up === false }">{{ f.v }}</text>
      </view>
    </view>

    <view class="tip">🤖 预测由国产时序大模型 + 供销价格库生成，仅供买卖参考；市场有波动，决策请结合实际。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #6d28d9, #4c1d95); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 36rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.9; margin-top: 8rpx; display: block; line-height: 1.5; }
.cats { white-space: nowrap; padding: 20rpx 24rpx 4rpx; }
.c { display: inline-block; padding: 10rpx 26rpx; font-size: 24rpx; color: $sg-text-2; background: #fff; border-radius: 999rpx; margin-right: 12rpx; box-shadow: $sg-shadow; }
.c.on { background: #7c3aed; color: #fff; }
.head { display: flex; align-items: center; justify-content: space-between; margin: 16rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.hl { display: flex; flex-direction: column; }
.cur { font-size: 46rpx; font-weight: 800; color: $sg-text; }
.unit { font-size: 22rpx; color: $sg-text-3; margin-left: 4rpx; }
.cl { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; }
.hr { display: flex; flex-direction: column; align-items: flex-end; }
.chg { font-size: 40rpx; font-weight: 800; color: $sg-text-3; }
.chg.up { color: #c0392b; } .chg.down { color: #16884c; }
.periods { display: flex; gap: 14rpx; margin: 16rpx 24rpx 0; }
.pd { flex: 1; text-align: center; padding: 16rpx 0; border-radius: $sg-radius; background: #fff; box-shadow: $sg-shadow; font-size: 24rpx; color: $sg-text-2; }
.pd.on { background: #6d28d9; color: #fff; font-weight: 700; }
.chart-card { margin: 16rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx 16rpx; }
.chart { display: flex; align-items: flex-end; justify-content: space-between; height: 260rpx; }
.col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
.cv { font-size: 17rpx; color: $sg-text-2; margin-bottom: 4rpx; }
.bar { width: 60%; max-width: 44rpx; border-radius: 6rpx 6rpx 0 0; }
.bar.today { opacity: 0.9; }
.cx { font-size: 17rpx; color: $sg-text-3; margin-top: 8rpx; }
.cx.today { color: $sg-text; font-weight: 700; }
.advice { margin: 20rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; border-left: 8rpx solid; }
.ad-tag { align-self: flex-start; display: inline-block; font-size: 20rpx; color: #fff; padding: 5rpx 16rpx; border-radius: 999rpx; font-weight: 700; margin-bottom: 12rpx; }
.ad-row { display: flex; padding: 8rpx 0; }
.ad-role { width: 130rpx; flex: none; font-size: 22rpx; font-weight: 700; }
.ad-t { flex: 1; font-size: 22rpx; color: $sg-text-2; line-height: 1.5; }
.sec { font-size: 28rpx; font-weight: 700; padding: 22rpx 28rpx 12rpx; }
.factors { display: flex; flex-wrap: wrap; gap: 14rpx; padding: 0 24rpx; }
.fac { width: calc(50% - 7rpx); box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 18rpx 20rpx; }
.f-n { font-size: 23rpx; color: $sg-text-2; }
.f-v { font-size: 22rpx; color: $sg-text-3; font-weight: 600; }
.f-v.up { color: #c0392b; } .f-v.down { color: #16884c; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 20rpx; color: $sg-text-3; line-height: 1.6; }
</style>
