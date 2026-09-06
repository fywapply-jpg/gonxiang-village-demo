<script setup lang="ts">
import { ref, computed } from "vue";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const dir = ref<"import" | "export">("import");

// 进口商品（关税/消费税/增值税率，%）——农产品多为低税率
const importGoods = [
  { n: "冻牛肉", hs: "0202", duty: 12, consume: 0, vat: 9 },
  { n: "进口鲜橙/樱桃", hs: "0805", duty: 11, consume: 0, vat: 9 },
  { n: "带壳坚果", hs: "0802", duty: 10, consume: 0, vat: 9 },
  { n: "乳制品", hs: "0402", duty: 10, consume: 0, vat: 9 },
  { n: "冰鲜水产", hs: "0303", duty: 7, consume: 0, vat: 9 },
  { n: "葡萄酒", hs: "2204", duty: 14, consume: 10, vat: 13 },
];
// 出口商品（出口退税率，%）
const exportGoods = [
  { n: "赣南脐橙", hs: "0805", refund: 9 },
  { n: "绿茶/乌龙茶", hs: "0902", refund: 13 },
  { n: "预制菜/肉制品", hs: "1602", refund: 13 },
  { n: "大蒜/蔬菜", hs: "0703", refund: 9 },
  { n: "蜂蜜", hs: "0409", refund: 9 },
  { n: "山茶油", hs: "1515", refund: 13 },
];

const gi = ref(0);
const amount = ref(1000000); // 进口=完税价(CIF)；出口=采购含税金额
const goods = computed(() => (dir.value === "import" ? importGoods[gi.value] : exportGoods[gi.value]));
const importGood = computed(() => importGoods[gi.value] || importGoods[0]);
const exportGood = computed(() => exportGoods[gi.value] || exportGoods[0]);
const money = (n: number) => Math.round(n).toLocaleString();

function switchDir(d: "import" | "export") { dir.value = d; gi.value = 0; }

// 进口测算
const imp = computed(() => {
  const g = importGoods[gi.value]; const P = amount.value;
  const tariff = P * g.duty / 100;
  const consume = g.consume > 0 ? (P + tariff) / (1 - g.consume / 100) * (g.consume / 100) : 0;
  const vat = (P + tariff + consume) * g.vat / 100;
  const total = tariff + consume + vat;
  return { tariff, consume, vat, total, landed: P + total, rate: (total / P * 100).toFixed(1) };
});
// 出口退税测算（按不含税采购额 × 退税率）
const exp = computed(() => {
  const g = exportGoods[gi.value]; const A = amount.value;
  const exVat = A / 1.13;              // 不含税采购额
  const refund = exVat * g.refund / 100;
  return { exVat, refund, net: A - refund, rate: (refund / A * 100).toFixed(1) };
});
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🧮 跨境税费测算</text>
      <text class="hs">进口关税 + 增值税 + 消费税 · 出口退税 · 一键测成本</text>
    </view>

    <view v-if="productionBuild" class="backend-note">正式环境税率、HS 归类、协定优惠、报关和退税结果必须由后台及海关/税务机构接口实时返回；当前未配置真实跨境接口，不展示本地测算样例。</view>

    <template v-else>

    <!-- 进出口切换 -->
    <view class="tabs">
      <text class="tab" :class="{ on: dir === 'import' }" @tap="switchDir('import')">📥 进口测算</text>
      <text class="tab" :class="{ on: dir === 'export' }" @tap="switchDir('export')">📤 出口退税</text>
    </view>

    <!-- 商品 -->
    <view class="sec">选择商品（HS 编码）</view>
    <scroll-view scroll-x class="goods">
      <view class="g" :class="{ on: gi === i }" v-for="(g, i) in (dir === 'import' ? importGoods : exportGoods)" :key="g.hs + i" @tap="gi = i">
        <text class="g-n">{{ g.n }}</text>
        <text class="g-hs">HS {{ g.hs }}</text>
      </view>
    </scroll-view>

    <!-- 金额输入 -->
    <view class="amt-card">
      <text class="amt-l">{{ dir === 'import' ? '完税价格（CIF，元）' : '出口采购金额（含13%进项，元）' }}</text>
      <input class="amt-in" type="number" v-model.number="amount" placeholder="输入金额" />
    </view>

    <!-- 进口结果 -->
    <view v-if="dir === 'import'" class="result">
      <view class="rows">
        <view class="row"><text class="rk">关税（{{ importGood.duty }}%）</text><text class="rv">¥{{ money(imp.tariff) }}</text></view>
        <view class="row" v-if="importGood.consume > 0"><text class="rk">消费税（{{ importGood.consume }}%）</text><text class="rv">¥{{ money(imp.consume) }}</text></view>
        <view class="row"><text class="rk">增值税（{{ importGood.vat }}%）</text><text class="rv">¥{{ money(imp.vat) }}</text></view>
        <view class="row hi"><text class="rk">合计税费</text><text class="rv big">¥{{ money(imp.total) }}</text></view>
        <view class="row"><text class="rk">综合税负率</text><text class="rv">{{ imp.rate }}%</text></view>
      </view>
      <view class="landed">
        <text class="ld-l">到岸总成本（完税价 + 税费）</text>
        <text class="ld-v">¥{{ money(imp.landed) }}</text>
      </view>
      <text class="formula">📐 关税=完税价×关税率；消费税=(完税价+关税)/(1−消费税率)×消费税率；增值税=(完税价+关税+消费税)×增值税率</text>
    </view>

    <!-- 出口结果 -->
    <view v-else class="result">
      <view class="rows">
        <view class="row"><text class="rk">不含税采购额</text><text class="rv">¥{{ money(exp.exVat) }}</text></view>
        <view class="row"><text class="rk">出口退税率</text><text class="rv">{{ exportGood.refund }}%</text></view>
        <view class="row hi"><text class="rk">可退税额</text><text class="rv big green">¥{{ money(exp.refund) }}</text></view>
        <view class="row"><text class="rk">退税/采购比</text><text class="rv">{{ exp.rate }}%</text></view>
      </view>
      <view class="landed green-bg">
        <text class="ld-l">退税后实际出口成本</text>
        <text class="ld-v">¥{{ money(exp.net) }}</text>
      </view>
      <text class="formula">📐 出口退税额 = 采购金额 ÷ (1+13%) × 出口退税率（免抵退，凭报关单/发票申报）</text>
    </view>

    <view class="tip">🔗 税率随海关税则 / 自贸协定（RCEP 等可享优惠税率）动态调整；测算仅供参考，实际以海关归类与税务核定为准。依托五大枢纽 + 单一窗口一键报关退税。</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #1e5fa8, #133f73); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 36rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; }
.tabs { display: flex; gap: 14rpx; margin: 20rpx 24rpx 0; }
.tab { flex: 1; text-align: center; padding: 20rpx 0; border-radius: $sg-radius-lg; background: #fff; box-shadow: $sg-shadow; font-size: 26rpx; font-weight: 700; color: $sg-text-2; }
.tab.on { background: #1e5fa8; color: #fff; }
.sec { font-size: 27rpx; font-weight: 700; padding: 22rpx 28rpx 12rpx; }
.goods { white-space: nowrap; padding: 0 24rpx; }
.g { display: inline-flex; flex-direction: column; align-items: center; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 16rpx 22rpx; margin-right: 14rpx; border: 3rpx solid transparent; }
.g.on { border-color: #1e5fa8; background: #eef5ff; }
.g-n { font-size: 24rpx; font-weight: 700; }
.g-hs { font-size: 18rpx; color: $sg-text-3; margin-top: 2rpx; }
.amt-card { margin: 16rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.amt-l { font-size: 22rpx; color: $sg-text-3; }
.amt-in { font-size: 44rpx; font-weight: 800; color: $sg-text; margin-top: 8rpx; border-bottom: 2rpx solid $sg-border; padding-bottom: 8rpx; }
.result { margin-top: 16rpx; }
.rows { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 8rpx 22rpx; }
.row { display: flex; justify-content: space-between; align-items: baseline; padding: 14rpx 0; border-top: 2rpx solid $sg-bg; }
.row:first-child { border-top: none; }
.row.hi { border-top: 2rpx dashed #ddd; border-bottom: 2rpx dashed #ddd; }
.rk { font-size: 23rpx; color: $sg-text-2; }
.rv { font-size: 25rpx; font-weight: 600; }
.rv.big { font-size: 34rpx; font-weight: 800; color: $sg-red; }
.rv.green { color: #16884c; }
.landed { margin: 14rpx 24rpx 0; background: linear-gradient(135deg, #eef5ff, #fff); border: 2rpx solid #cadff2; border-radius: $sg-radius-lg; padding: 22rpx; display: flex; align-items: center; justify-content: space-between; }
.landed.green-bg { background: linear-gradient(135deg, #eaf7ef, #fff); border-color: #b6e0c6; }
.ld-l { font-size: 23rpx; color: $sg-text-2; }
.ld-v { font-size: 38rpx; font-weight: 800; color: #1e5fa8; }
.landed.green-bg .ld-v { color: #16884c; }
.formula { display: block; margin: 14rpx 24rpx 0; font-size: 19rpx; color: $sg-text-3; line-height: 1.6; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.backend-note { margin: 24rpx; padding: 24rpx; border-radius: $sg-radius-lg; background: #fff8e8; color: #8a5a00; line-height: 1.6; font-size: 24rpx; }
</style>
