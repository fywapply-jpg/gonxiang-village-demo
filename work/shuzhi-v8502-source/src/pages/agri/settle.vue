<script setup lang="ts">
import { ref, computed } from "vue";

// 合约参数（与 contract.vue 的脐橙订单一致）
const C = {
  crop: "赣南脐橙",
  no: "OA-2026-0781",
  buyer: "沪上团餐中央厨房",
  seller: "赣南脐橙合作社",
  lockQty: 600,        // 锁定量（吨）
  floor: 4.2,          // 保底价（元/斤）
  jinPerTon: 2000,     // 斤/吨
  claimRate: 0.8,      // 减产理赔：按保底价赔付缺口的比例（履约险）
  premium: 0.8,        // 终端销售溢价（元/斤）
  dividendPct: 30,     // 二次分红：终端溢价返还比例 30%（= 0.24 元/斤）
  marginPct: 5,        // 履约保证金比例
};

// 市场价情形（产地收购市场价）
const priceCases = [
  { key: "down", name: "价格暴跌", price: 3.6, note: "行情崩盘" },
  { key: "flat", name: "价格持平", price: 4.3, note: "略高保底" },
  { key: "up", name: "价格上涨", price: 5.2, note: "行情大好" },
];
// 交付情形
const qtyCases = [
  { key: "full", name: "足额交付", qty: 600, note: "风调雨顺" },
  { key: "short", name: "旱灾减产", qty: 450, note: "缺口 150 吨" },
];

const pi = ref(0);
const qi = ref(1); // 默认减产，最能体现价值
const mkt = computed(() => priceCases[pi.value].price);
const qty = computed(() => qtyCases[qi.value].qty);

const wan = (n: number) => (n / 10000).toFixed(1);

// 结算：收购单价 = max(保底, 市场价)（随行就市，就高不就低）
const settlePrice = computed(() => Math.max(C.floor, mkt.value));
const goods = computed(() => settlePrice.value * qty.value * C.jinPerTon);           // 收购货款
const claim = computed(() => qty.value < C.lockQty
  ? (C.lockQty - qty.value) * C.floor * C.jinPerTon * C.claimRate : 0);              // 减产理赔（履约险）
const dividend = computed(() => C.premium * C.dividendPct / 100 * qty.value * C.jinPerTon); // 二次分红=终端溢价×返还比例
const total = computed(() => goods.value + claim.value + dividend.value);            // 农户实收合计
// 对照：不签订单农业，直接按市场价裸卖（减产就少卖、无兜底无理赔无分红）
const bare = computed(() => mkt.value * qty.value * C.jinPerTon);
const gap = computed(() => total.value - bare.value);
const margin = computed(() => C.floor * C.lockQty * C.jinPerTon * C.marginPct / 100);

const usedFloor = computed(() => mkt.value < C.floor); // 是否触发保底兜底

// 履约兑现流程
const steps = [
  { t: "交付验收", d: "分批到货 · 品控分级 · 过磅复磅上链" },
  { t: "点价结算", d: "按 max(保底价, 市场价) 锁定收购单价" },
  { t: "货款到账", d: "监管账户放款至合作社对公户（T+7）" },
  { t: "履约险理赔", d: "减产经核灾定损，按保底价赔付缺口" },
  { t: "保证金退还", d: "双方履约完成，各自 5% 保证金原路退还" },
  { t: "二次分红", d: "终端销售溢价 30% 返还，成员大会表决分配" },
];
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">💰 订单农业 · 履约兑现结算</text>
      <text class="hs">以销定产的最后一环——到期真能算出农户拿多少钱：保底兜底 · 随行就市 · 减产理赔 · 二次分红</text>
    </view>

    <!-- 合约摘要 -->
    <view class="sum">
      <view class="sg-between"><text class="s-no">{{ C.no }}</text><text class="s-crop">{{ C.crop }}</text></view>
      <view class="s-row"><text>{{ C.seller }}</text><text class="s-arrow">⇄</text><text>{{ C.buyer }}</text></view>
      <view class="s-chips">
        <text class="s-chip">锁定 {{ C.lockQty }} 吨</text>
        <text class="s-chip">保底 {{ C.floor }} 元/斤</text>
        <text class="s-chip">溢价二次分红 30%</text>
      </view>
    </view>

    <!-- 交互1：市场价情形 -->
    <view class="sec">① 到期时产地市场价</view>
    <view class="cases">
      <view class="cs" :class="{ on: pi === i }" v-for="(c, i) in priceCases" :key="c.key" @tap="pi = i">
        <text class="cs-n">{{ c.name }}</text>
        <text class="cs-p">{{ c.price }} 元/斤</text>
        <text class="cs-note">{{ c.note }}</text>
      </view>
    </view>

    <!-- 交互2：交付情形 -->
    <view class="sec">② 实际交付量</view>
    <view class="cases">
      <view class="cs half" :class="{ on: qi === i }" v-for="(c, i) in qtyCases" :key="c.key" @tap="qi = i">
        <text class="cs-n">{{ c.name }}</text>
        <text class="cs-p">{{ c.qty }} 吨</text>
        <text class="cs-note">{{ c.note }}</text>
      </view>
    </view>

    <!-- 结算明细 -->
    <view class="sec">③ 结算明细</view>
    <view class="bill">
      <view class="bl">
        <view class="bl-i"><text class="bl-t">收购货款</text><text class="bl-d">按 {{ settlePrice }} 元/斤 × {{ qty }} 吨
          <text v-if="usedFloor" class="tag floor">保底兜底</text>
          <text v-else class="tag mkt">随行就市</text>
        </text></view>
        <text class="bl-v">¥{{ wan(goods) }} 万</text>
      </view>
      <view class="bl" v-if="claim > 0">
        <view class="bl-i"><text class="bl-t">减产理赔</text><text class="bl-d">履约险按保底价赔缺口 {{ C.lockQty - qty }} 吨 × 80%</text></view>
        <text class="bl-v claim">+¥{{ wan(claim) }} 万</text>
      </view>
      <view class="bl">
        <view class="bl-i"><text class="bl-t">二次分红</text><text class="bl-d">终端溢价 {{ C.premium }} 元/斤 × 返还 {{ C.dividendPct }}%（= 0.24 元/斤）× {{ qty }} 吨</text></view>
        <text class="bl-v div">+¥{{ wan(dividend) }} 万</text>
      </view>
      <view class="bl total">
        <text class="bl-t big">农户实收合计</text>
        <text class="bl-v big">¥{{ wan(total) }} 万</text>
      </view>
    </view>

    <!-- 对照：订单农业 vs 裸卖 -->
    <view class="sec">④ 有订单农业 vs 不签裸卖市场</view>
    <view class="cmp">
      <view class="cmp-row">
        <text class="cmp-l">✅ 签订单农业实收</text>
        <text class="cmp-v good">¥{{ wan(total) }} 万</text>
      </view>
      <view class="cmp-bar"><view class="cb-fill good" :style="{ width: '100%' }"></view></view>
      <view class="cmp-row">
        <text class="cmp-l">❌ 裸卖市场价</text>
        <text class="cmp-v bad">¥{{ wan(bare) }} 万</text>
      </view>
      <view class="cmp-bar"><view class="cb-fill bad" :style="{ width: (bare / total * 100) + '%' }"></view></view>
      <view class="cmp-gap">
        订单农业多保住 <text class="gap-v">¥{{ wan(gap) }} 万</text>
        <text class="gap-d">（{{ usedFloor ? '保底兜底' : '' }}{{ usedFloor && claim>0 ? ' + ' : '' }}{{ claim>0 ? '减产理赔' : '' }}{{ (usedFloor||claim>0) ? ' + ' : '' }}二次分红）</text>
      </view>
    </view>

    <!-- 保证金 -->
    <view class="margin-note">
      🔐 履约保证金：买卖双方各缴 {{ C.marginPct }}%（约 ¥{{ wan(margin) }} 万）进监管账户；如约履约原路退还，违约方扣付守约方。
    </view>

    <!-- 履约兑现流程 -->
    <view class="sec">⑤ 履约兑现流程（全程上链）</view>
    <view class="steps">
      <view class="stp" v-for="(s, i) in steps" :key="i">
        <view class="stp-n">{{ i + 1 }}</view>
        <view class="stp-i"><text class="stp-t">{{ s.t }}</text><text class="stp-d">{{ s.d }}</text></view>
      </view>
    </view>

    <view class="tip">🔗 结算单价、理赔、分红全部按链上履约数据（交付验收/过磅/核灾定损/终端销售）自动核算；保底价兜住"价格跌"，履约险兜住"减产", 随行就市保证"价格涨不吃亏", 二次分红让农户共享终端溢价——把"以销定产"从签约做到兑现闭环。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, $sg-gold, #c8871f); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.95; margin-top: 8rpx; display: block; line-height: 1.5; }
.sum { margin: 20rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.s-no { font-size: 23rpx; color: $sg-text-3; }
.s-crop { font-size: 26rpx; font-weight: 800; color: $sg-primary; }
.s-row { display: flex; align-items: center; justify-content: space-between; margin: 12rpx 0; font-size: 24rpx; font-weight: 600; }
.s-arrow { color: $sg-gold; font-size: 30rpx; }
.s-chips { display: flex; flex-wrap: wrap; gap: 10rpx; }
.s-chip { font-size: 20rpx; color: $sg-primary; background: $sg-primary-light; padding: 4rpx 14rpx; border-radius: 999rpx; }
.sec { font-size: 27rpx; font-weight: 700; padding: 22rpx 28rpx 12rpx; }
.cases { display: flex; gap: 14rpx; padding: 0 24rpx; }
.cs { flex: 1; display: flex; flex-direction: column; align-items: center; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 18rpx 8rpx; border: 3rpx solid transparent; }
.cs.on { border-color: $sg-gold; background: $sg-gold-light; }
.cs-n { font-size: 23rpx; font-weight: 700; }
.cs-p { font-size: 26rpx; font-weight: 800; color: $sg-red; margin-top: 6rpx; }
.cs-note { font-size: 18rpx; color: $sg-text-3; margin-top: 4rpx; }
.bill { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 10rpx 22rpx; }
.bl { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 0; border-top: 2rpx solid $sg-bg; }
.bl:first-child { border-top: none; }
.bl-i { flex: 1; display: flex; flex-direction: column; }
.bl-t { font-size: 25rpx; font-weight: 600; }
.bl-d { font-size: 19rpx; color: $sg-text-3; margin-top: 3rpx; line-height: 1.4; }
.tag { font-size: 17rpx; padding: 2rpx 10rpx; border-radius: 6rpx; margin-left: 8rpx; }
.tag.floor { color: #fff; background: #d64541; }
.tag.mkt { color: #fff; background: #16884c; }
.bl-v { font-size: 26rpx; font-weight: 700; margin-left: 12rpx; flex: none; }
.bl-v.claim { color: #d99a2b; }
.bl-v.div { color: #16884c; }
.bl.total { border-top: 3rpx dashed #e2c98a; }
.bl-t.big { font-size: 28rpx; font-weight: 800; }
.bl-v.big { font-size: 36rpx; font-weight: 800; color: $sg-red; }
.cmp { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.cmp-row { display: flex; align-items: center; justify-content: space-between; }
.cmp-l { font-size: 24rpx; font-weight: 600; }
.cmp-v { font-size: 28rpx; font-weight: 800; }
.cmp-v.good { color: #16884c; }
.cmp-v.bad { color: $sg-text-3; }
.cmp-bar { height: 22rpx; background: $sg-bg; border-radius: 999rpx; overflow: hidden; margin: 8rpx 0 18rpx; }
.cb-fill { height: 100%; border-radius: 999rpx; }
.cb-fill.good { background: linear-gradient(90deg, #2fae6b, #16884c); }
.cb-fill.bad { background: #c2c7cf; }
.cmp-gap { margin-top: 4rpx; font-size: 23rpx; font-weight: 600; text-align: center; padding: 14rpx; background: $sg-primary-light; border-radius: $sg-radius; }
.gap-v { color: #d64541; font-size: 28rpx; font-weight: 800; }
.gap-d { display: block; font-size: 18rpx; color: $sg-text-3; font-weight: 400; margin-top: 4rpx; }
.margin-note { margin: 16rpx 24rpx 0; font-size: 21rpx; color: $sg-text-2; background: #f7f9fc; border: 2rpx solid #e6ebf2; border-radius: $sg-radius; padding: 16rpx 18rpx; line-height: 1.6; }
.steps { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 22rpx; }
.stp { display: flex; align-items: flex-start; padding: 12rpx 0; border-top: 2rpx solid $sg-bg; }
.stp:first-child { border-top: none; }
.stp-n { width: 40rpx; height: 40rpx; flex: none; border-radius: 50%; background: $sg-gold; color: #fff; font-size: 22rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-right: 14rpx; }
.stp-i { flex: 1; display: flex; flex-direction: column; }
.stp-t { font-size: 24rpx; font-weight: 600; }
.stp-d { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; line-height: 1.4; }
.tip { margin: 20rpx 24rpx 40rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
</style>
