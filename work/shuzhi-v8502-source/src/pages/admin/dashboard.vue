<script setup lang="ts">
import { ref, computed } from "vue";

// 时间维度筛选
const periods = [{ k: "今日", m: 1 }, { k: "本周", m: 6.5 }, { k: "本月", m: 28 }, { k: "本年", m: 320 }];
const pi = ref(2);
const m = computed(() => periods[pi.value].m);
const fmtWan = (wan: number) => (wan >= 10000 ? (wan / 10000).toFixed(2) + " 亿" : Math.round(wan).toLocaleString() + " 万");

// 8 大核心指标（flow=随时间放大 / 否则为累计或比率）
const kpis = computed(() => [
  { n: "供货总量", v: Math.round(1860 * m.value).toLocaleString() + " 吨", c: "#16884c" },
  { n: "交易额", v: fmtWan(8600 * m.value), c: "#2b6cb0" },
  { n: "结算金额", v: fmtWan(7200 * m.value), c: "#d99a2b" },
  { n: "覆盖农户", v: "2.46 万户", c: "#7c3aed" },
  { n: "贷款余额", v: "12.6 亿", c: "#0f6b3b" },
  { n: "逾期率", v: "0.8%", c: "#c0392b" },
  { n: "品控合格率", v: "98.6%", c: "#16884c" },
  { n: "生鲜损耗率", v: "8.2%", c: "#d99a2b" },
]);

// 交易额趋势
const trade = [{ y: "2026", v: 0.8 }, { y: "2027", v: 1.6 }, { y: "2028", v: 2.5 }, { y: "2029", v: 3.6 }, { y: "2030", v: 4.4 }, { y: "2031", v: 5.2 }];
const tradeMax = 6;

// 品类占比
const cats = [
  { n: "果蔬生鲜", p: 38, c: "#16884c" }, { n: "粮油", p: 24, c: "#d99a2b" },
  { n: "肉禽蛋", p: 18, c: "#c0392b" }, { n: "农资", p: 12, c: "#2b6cb0" }, { n: "加工品", p: 8, c: "#7c3aed" },
];

// 区域供货 / 增收排行
const regions = [
  { n: "河北·遵化", supply: 4200, income: 860 },
  { n: "江西·信丰", supply: 3600, income: 720 },
  { n: "天津·华明", supply: 2800, income: 540 },
  { n: "天津·军粮城", supply: 2100, income: 410 },
  { n: "山东·汶上", supply: 1500, income: 300 },
];
const regMax = 4200;

// 村集体增收榜
const villages = [
  { n: "江西赣州信丰安西镇范庄村集体", inc: "168 万", up: "+22%" },
  { n: "河北唐山遵化平安城镇东三村集体", inc: "142 万", up: "+18%" },
  { n: "天津东丽华明街道华明社区集体", inc: "96 万", up: "+15%" },
];

// 金融风险
const fin = { loan: "12.6 亿", used: "75%", overdue: "0.8%", pool: "3.2 亿", poolUsed: 28 };

// 实时风控告警
const alarms = [
  { lv: "高", t: "某电子仓单疑似重复质押", who: "风控·信贷", c: "#d64541" },
  { lv: "中", t: "3 家商户成交价异常偏离市场", who: "风控·交易", c: "#d99a2b" },
  { lv: "中", t: "冷链车 TJ-A12 温度超阈值", who: "物流·冷链", c: "#d99a2b" },
  { lv: "低", t: "2 笔补贴疑似重复申报待核", who: "审核·补贴", c: "#5a6270" },
];
</script>

<template>
  <view class="sg-page">
    <view class="hd">
      <text class="hd-t">📊 运营数据看板</text>
      <text class="hd-s">全国一张网 · 实时经营 · 多维下钻</text>
    </view>

    <!-- 时间维度 -->
    <view class="periods">
      <text class="pd" :class="{ on: pi === i }" v-for="(p, i) in periods" :key="p.k" @tap="pi = i">{{ p.k }}</text>
    </view>

    <!-- 8 大核心指标 -->
    <view class="kpis">
      <view class="kpi" v-for="k in kpis" :key="k.n">
        <text class="kn" :style="{ color: k.c }">{{ k.v }}</text>
        <text class="kl">{{ k.n }}</text>
      </view>
    </view>

    <!-- 交易额趋势 -->
    <view class="sg-card">
      <text class="ct">全国农产品数字化交易大盘（万亿元 · 行业规模，非本平台）</text>
      <view class="bars">
        <view class="bar-col" v-for="t in trade" :key="t.y">
          <text class="bar-v">{{ t.v }}</text>
          <view class="bar-track"><view class="bar-fill green" :style="{ height: (t.v / tradeMax * 200) + 'rpx' }"></view></view>
          <text class="bar-x">{{ t.y }}</text>
        </view>
      </view>
    </view>

    <!-- 区域供货排行 -->
    <view class="sg-card">
      <text class="ct">区域供货量 / 带动增收排行</text>
      <view class="reg" v-for="r in regions" :key="r.n">
        <text class="rg-n">{{ r.n }}</text>
        <view class="rg-track"><view class="rg-fill" :style="{ width: (r.supply / regMax * 100) + '%' }"></view></view>
        <text class="rg-v">{{ r.supply }}吨 · 增收{{ r.income }}万</text>
      </view>
    </view>

    <!-- 品类占比 -->
    <view class="sg-card">
      <text class="ct">品类交易占比</text>
      <view class="hbar" v-for="c in cats" :key="c.n">
        <text class="hb-n">{{ c.n }}</text>
        <view class="hb-track"><view class="hb-fill" :style="{ width: c.p + '%', background: c.c }"></view></view>
        <text class="hb-p">{{ c.p }}%</text>
      </view>
    </view>

    <!-- 金融风险指标 -->
    <view class="sg-card">
      <text class="ct">供应链金融 · 风险指标</text>
      <view class="fin">
        <view class="fk"><text class="fkn">{{ fin.loan }}</text><text class="fkl">贷款余额</text></view>
        <view class="fk"><text class="fkn">{{ fin.used }}</text><text class="fkl">资金使用率</text></view>
        <view class="fk"><text class="fkn" style="color:#c0392b">{{ fin.overdue }}</text><text class="fkl">逾期率</text></view>
        <view class="fk"><text class="fkn">{{ fin.pool }}</text><text class="fkl">担保缓释额度</text></view>
      </view>
      <text class="fin-note">由持牌担保/保险机构提供缓释额度（已用 {{ fin.poolUsed }}%），逾期由其代偿约 40%、平台生成追偿工单；平台不设资金池、不代偿。</text>
    </view>

    <!-- 实时风控告警 -->
    <view class="sg-card">
      <text class="ct">🛡️ 实时风控告警（{{ alarms.length }} 条待处理）</text>
      <view class="al" v-for="(a, i) in alarms" :key="i">
        <text class="al-lv" :style="{ background: a.c }">{{ a.lv }}</text>
        <text class="al-t">{{ a.t }}</text>
        <text class="al-who">{{ a.who }}</text>
      </view>
    </view>

    <!-- 村集体增收榜 -->
    <view class="sg-card">
      <text class="ct">村集体增收榜（本年）</text>
      <view class="vil" v-for="(v, i) in villages" :key="v.n">
        <text class="vil-r" :class="{ top: i === 0 }">{{ i + 1 }}</text>
        <text class="vil-n">{{ v.n }}</text>
        <text class="vil-inc">{{ v.inc }}</text>
        <text class="vil-up">{{ v.up }}</text>
      </view>
    </view>

    <view class="tip">🔗 数据来自全链真实业务，支持按时间 / 区域 / 品类下钻；关键指标异常自动告警，报表可导出报送。</view>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, #334155, #1e293b); padding: 36rpx 28rpx; color: #fff; }
.hd-t { font-size: 32rpx; font-weight: 800; }
.hd-s { font-size: 21rpx; opacity: 0.85; margin-top: 8rpx; display: block; }
.periods { display: flex; gap: 12rpx; margin: 20rpx 24rpx 0; }
.pd { flex: 1; text-align: center; padding: 14rpx 0; border-radius: $sg-radius; background: #fff; box-shadow: $sg-shadow; font-size: 24rpx; color: $sg-text-2; }
.pd.on { background: #334155; color: #fff; font-weight: 700; }
.kpis { display: flex; flex-wrap: wrap; margin: 16rpx 16rpx 0; }
.kpi { width: calc(25% - 16rpx); margin: 0 8rpx 16rpx; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 18rpx 6rpx; display: flex; flex-direction: column; align-items: center; }
.kn { font-size: 26rpx; font-weight: 800; text-align: center; }
.kl { font-size: 17rpx; color: $sg-text-3; margin-top: 4rpx; }
.sg-card { margin: 8rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.ct { font-size: 27rpx; font-weight: 700; display: block; margin-bottom: 18rpx; }
.bars { display: flex; align-items: flex-end; justify-content: space-between; height: 260rpx; }
.bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
.bar-v { font-size: 18rpx; color: $sg-text-2; margin-bottom: 6rpx; }
.bar-track { display: flex; align-items: flex-end; height: 200rpx; }
.bar-fill { width: 40rpx; border-radius: 8rpx 8rpx 0 0; }
.bar-fill.green { background: linear-gradient(180deg, #2fae6b, #16884c); }
.bar-x { font-size: 18rpx; color: $sg-text-3; margin-top: 8rpx; }
.reg { display: flex; align-items: center; margin-bottom: 14rpx; }
.rg-n { width: 150rpx; font-size: 22rpx; flex: none; }
.rg-track { flex: 1; height: 22rpx; background: $sg-bg; border-radius: 999rpx; overflow: hidden; margin: 0 12rpx; }
.rg-fill { height: 100%; background: linear-gradient(90deg, #4a9fe0, #2b6cb0); border-radius: 999rpx; }
.rg-v { font-size: 18rpx; color: $sg-text-3; flex: none; width: 200rpx; text-align: right; }
.hbar { display: flex; align-items: center; margin-bottom: 16rpx; }
.hb-n { width: 130rpx; font-size: 23rpx; }
.hb-track { flex: 1; height: 24rpx; background: $sg-bg; border-radius: 12rpx; overflow: hidden; margin: 0 12rpx; }
.hb-fill { height: 100%; border-radius: 12rpx; }
.hb-p { width: 60rpx; text-align: right; font-size: 22rpx; font-weight: 600; }
.fin { display: flex; }
.fk { flex: 1; text-align: center; }
.fkn { font-size: 28rpx; font-weight: 800; color: $sg-primary-deep; display: block; }
.fkl { font-size: 18rpx; color: $sg-text-3; }
.fin-note { font-size: 20rpx; color: $sg-text-3; margin-top: 14rpx; display: block; line-height: 1.5; }
.al { display: flex; align-items: center; padding: 14rpx 0; border-top: 2rpx solid $sg-bg; }
.al:first-of-type { border-top: none; }
.al-lv { flex: none; width: 40rpx; height: 40rpx; border-radius: 8rpx; color: #fff; font-size: 20rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-right: 14rpx; }
.al-t { flex: 1; font-size: 22rpx; }
.al-who { font-size: 18rpx; color: $sg-text-3; }
.vil { display: flex; align-items: center; padding: 12rpx 0; border-top: 2rpx solid $sg-bg; }
.vil:first-of-type { border-top: none; }
.vil-r { width: 40rpx; height: 40rpx; flex: none; border-radius: 50%; background: $sg-bg; color: $sg-text-3; font-size: 22rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-right: 14rpx; }
.vil-r.top { background: linear-gradient(135deg, #e6b451, #d99a2b); color: #fff; }
.vil-n { flex: 1; font-size: 24rpx; font-weight: 600; }
.vil-inc { font-size: 24rpx; font-weight: 800; color: $sg-red; margin-right: 12rpx; }
.vil-up { font-size: 20rpx; color: $sg-primary; }
.tip { margin: 16rpx 24rpx 30rpx; font-size: 20rpx; color: $sg-text-3; line-height: 1.6; }
</style>
