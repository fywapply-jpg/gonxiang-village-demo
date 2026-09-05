<script setup lang="ts">
import { ref } from "vue";
const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

// 出口订单示例
const order = { no: "EX-2027-0451", goods: "赣南脐橙 特级", qty: "3 × 40尺冷柜 · 约 84 吨", buyer: "新加坡 FreshMart Pte", hub: "海南自贸港枢纽", incoterm: "CIF 新加坡", amount: "US$ 92,400", settle: "数字人民币结汇" };

// 出口全流程（8 步，可核验）
const steps = [
  { t: "海外询盘", d: "海外采购商发布需求，平台 AI 匹配国内货源", who: "海外买家 · 平台" },
  { t: "出口报价 · 签约", d: "报 CIF/FOB 价，在线议价，电子合同上链", who: "出口商 · 买家" },
  { t: "报关 · 商检", d: "海关单一窗口一次申报，出境货物检验检疫", who: "出口商 · 海关" },
  { t: "跨境冷链", d: "产地冷链装柜，全程温控 + GPS 上链", who: "冷链承运" },
  { t: "国际运输", d: "海运 / 中欧班列，船期/柜号可追踪", who: "船公司 · 平台" },
  { t: "数字人民币结汇", d: "买家付款，数币跨境实时清算，结汇入账", who: "银行 · 出口商" },
  { t: "出口退税", d: "凭报关单/发票，线上申报出口退税", who: "出口商 · 税务" },
  { t: "海外仓分销", d: "落地海外仓，本地分销、售后", who: "海外仓" },
];
const cur = ref(0);
const running = ref(false);
function run() {
  if (productionBuild) return uni.showModal({ title: "需要跨境机构接入", content: "正式环境的出口报关、商检、国际物流、结汇和退税必须由已接入机构返回真实回执，当前未播放本地流程。", showCancel: false });
  running.value = true; cur.value = 0; const t = setInterval(() => { cur.value++; if (cur.value >= steps.length) clearInterval(t); }, 480);
}

// 出口保障 / 风险规避
const safe = [
  { icon: "🏦", t: "出口信用保险", d: "买家违约/拒付，信保赔付" },
  { icon: "💵", t: "出口信用增信 + 订单融资", d: "凭出口订单融资，缓解备货资金" },
  { icon: "💱", t: "汇率锁定", d: "数币结算 + 远期锁汇，规避汇率波动" },
  { icon: "📋", t: "合规单证", d: "原产地证/植检证/单一窗口，单证合规" },
];

function settleModal() {
  uni.showModal({ title: "数字人民币跨境结汇", showCancel: false, confirmText: "了解",
    content: "买家以数字人民币付款，基于 Conflux 链实时清算，出口商 T+0 结汇入账，替代传统电汇 T+3，汇率锁定、可追溯、合规。" });
}
</script>

<template>
  <view class="sg-page">
    <view class="hd">
      <text class="hd-t">出口订单全流程</text>
      <text class="hd-s">询盘 → 报价签约 → 报关商检 → 跨境冷链 → 结汇 → 退税 → 海外仓</text>
    </view>

    <!-- 出口订单 -->
    <view class="sg-card">
      <view class="sg-between"><text class="ct">出口订单</text><text class="dir">出口</text></view>
      <view class="r"><text class="k">订单号</text><text class="v">{{ order.no }}</text></view>
      <view class="r"><text class="k">货物</text><text class="v">{{ order.goods }} · {{ order.qty }}</text></view>
      <view class="r"><text class="k">海外买家</text><text class="v">{{ order.buyer }}</text></view>
      <view class="r"><text class="k">出口枢纽</text><text class="v">{{ order.hub }}</text></view>
      <view class="r"><text class="k">贸易术语</text><text class="v">{{ order.incoterm }}</text></view>
      <view class="r"><text class="k">金额 / 结算</text><text class="v sg-price">{{ order.amount }} · {{ order.settle }}</text></view>
    </view>

    <!-- 全流程 -->
    <view class="sec-row"><text class="ct2">出口全流程</text><text class="demo" @tap="run">查看流程</text></view>
    <view class="sg-card">
      <view class="fl" v-for="(s, i) in steps" :key="i" :class="{ on: running && cur > i }">
        <view class="fl-ax"><view class="fl-dot" :class="{ on: running && cur > i }">{{ running && cur > i ? '✓' : i + 1 }}</view><view v-if="i < steps.length - 1" class="fl-line" :class="{ on: running && cur > i + 1 }"></view></view>
        <view class="fl-i"><text class="fl-t">{{ s.t }}</text><text class="fl-d">{{ s.d }}</text><text class="fl-w">👥 {{ s.who }}</text></view>
      </view>
      <view v-if="running && cur >= steps.length" class="fl-done">✅ 出口闭环完成：买全球卖全球，全程上链、数币结汇、合规可控</view>
    </view>

    <!-- 结汇亮点 -->
    <view class="cny" @tap="settleModal">
      <text class="cny-ic">💴</text>
      <view class="cny-i"><text class="cny-t">数字人民币跨境结汇</text><text class="cny-d">T+0 到账 · 汇率锁定 · 替代电汇 T+3</text></view>
      <text class="cny-go">详情 ›</text>
    </view>

    <!-- 出口保障 -->
    <view class="sec">出口保障 · 风险规避</view>
    <view class="safe">
      <view class="sf" v-for="s in safe" :key="s.t"><text class="sf-ic">{{ s.icon }}</text><view class="sf-i"><text class="sf-t">{{ s.t }}</text><text class="sf-d">{{ s.d }}</text></view></view>
    </view>

    <view class="tip">🔗 出口全链单证、物流、结汇上链存证；依托五大枢纽 + 海关单一窗口 + 100 个海外仓，打通"买全球、卖全球"。</view>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, #1e5fa8, #133f73); padding: 36rpx 28rpx; color: #fff; }
.hd-t { font-size: 34rpx; font-weight: 800; }
.hd-s { font-size: 21rpx; opacity: 0.9; margin-top: 8rpx; display: block; }
.ct { font-size: 28rpx; font-weight: 700; }
.dir { font-size: 20rpx; color: #fff; background: $sg-primary; padding: 2rpx 14rpx; border-radius: 999rpx; }
.r { display: flex; padding: 12rpx 0; border-top: 2rpx solid $sg-border; }
.r:first-of-type { border-top: none; }
.k { width: 150rpx; font-size: 24rpx; color: $sg-text-3; }
.v { flex: 1; font-size: 24rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding: 26rpx 28rpx 12rpx; }
.ct2 { font-size: 30rpx; font-weight: 700; }
.demo { font-size: 24rpx; color: #1e5fa8; background: #eef5ff; padding: 8rpx 22rpx; border-radius: 999rpx; }
.fl { display: flex; opacity: 0.5; transition: opacity 0.3s; }
.fl.on { opacity: 1; }
.fl-ax { display: flex; flex-direction: column; align-items: center; margin-right: 20rpx; }
.fl-dot { width: 46rpx; height: 46rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; }
.fl-dot.on { background: #1e5fa8; }
.fl-line { flex: 1; width: 4rpx; background: $sg-border; min-height: 24rpx; margin: 4rpx 0; }
.fl-line.on { background: #1e5fa8; }
.fl-i { flex: 1; display: flex; flex-direction: column; padding-bottom: 22rpx; }
.fl-t { font-size: 26rpx; font-weight: 600; }
.fl-d { font-size: 21rpx; color: $sg-text-3; margin-top: 2rpx; }
.fl-w { font-size: 20rpx; color: #1e5fa8; margin-top: 2rpx; }
.fl-done { font-size: 23rpx; color: #1e5fa8; background: #eef5ff; padding: 16rpx; border-radius: $sg-radius; }
.cny { display: flex; align-items: center; margin: 20rpx 24rpx 0; padding: 22rpx; background: linear-gradient(135deg, #eef5ff, #fff); border: 2rpx solid #cadff2; border-radius: $sg-radius-lg; }
.cny-ic { font-size: 50rpx; margin-right: 16rpx; }
.cny-i { flex: 1; display: flex; flex-direction: column; }
.cny-t { font-size: 27rpx; font-weight: 700; color: #1e5fa8; }
.cny-d { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }
.cny-go { font-size: 22rpx; color: #1e5fa8; }
.sec { font-size: 30rpx; font-weight: 700; padding: 26rpx 28rpx 12rpx; }
.safe { margin: 0 24rpx; }
.sf { display: flex; align-items: center; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 20rpx; margin-bottom: 14rpx; }
.sf-ic { font-size: 44rpx; margin-right: 16rpx; }
.sf-i { flex: 1; display: flex; flex-direction: column; }
.sf-t { font-size: 26rpx; font-weight: 600; }
.sf-d { font-size: 21rpx; color: $sg-text-3; margin-top: 2rpx; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
</style>
