<script setup lang="ts">
import { ref, computed } from "vue";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

// 待定标的供应链金融业务包
const pkg = {
  name: "赣南脐橙供应链金融包",
  core: "赣南脐橙合作社（★金牌商户）",
  need: "5000 万",
  term: "12 个月",
  stages: ["生产·订单贷", "仓储·仓单质押", "流通·应收保理", "销售·采购账期"],
};

// 参与竞标的银行（综合评分：利率越低、额度越足、放款越快、服务越优 → 分越高）
const bids = ref([
  { s: "农行", name: "中国农业银行", rate: "3.85%", limit: "5000 万", speed: "T+0", extra: "数币结算 · 全链服务", score: 95 },
  { s: "农发", name: "农业发展银行", rate: "3.50%", limit: "5000 万", speed: "T+2", extra: "政策贴息", score: 92 },
  { s: "邮储", name: "邮政储蓄银行", rate: "4.00%", limit: "4500 万", speed: "T+1", extra: "县域网点广", score: 90 },
  { s: "农信", name: "省农村信用社", rate: "4.20%", limit: "3000 万", speed: "T+0", extra: "本地响应快", score: 85 },
]);

const decided = ref(false);
const winner = computed(() => bids.value.slice().sort((a, b) => b.score - a.score)[0]);
const ranked = computed(() => bids.value.slice().sort((a, b) => b.score - a.score));

function decide() {
  if (productionBuild) return uni.showModal({ title: "需要银行联调", content: "正式环境的银行竞标、授信和定标结果必须由参与银行返回并留痕，当前未执行定标或授信。", showCancel: false });
  uni.showLoading({ title: "综合评标中…" });
  setTimeout(() => { uni.hideLoading(); decided.value = true; uni.showToast({ title: "已择优定标", icon: "success" }); }, 900);
}

// 中标后：该笔业务全流程在主办行行内闭环
const loop = [
  "行内授信审批（基于链上真实交易数据）",
  "放款至主办银行监管专户（非平台账户、专款专用）",
  "由银行受托支付上游供应商",
  "货款回流至同行监管专户",
  "自动偿贷、利息结算",
  "额度释放、单笔结清",
];

const rules = [
  "公开竞标：符合资质的银行平等参与，链上数据向各行同等开放",
  "统一评标：利率/额度/时效/服务综合打分，规则公开透明",
  "择优定标：一笔业务一家主办行，资金流转与风控行内闭环",
  "轮候防垄断：单行承接额度设上限，防止一家独大",
  "监管备案：定标结果报监管节点存证，可追溯可审计",
];
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">主办银行制 · 银行竞标</text>
      <text class="hs">一笔业务一家主办行 · 行内闭环 · 多行公平有序竞争</text>
    </view>

    <!-- 概念 -->
    <view class="concept sg-card">
      <text class="cc">💡 单一业务闭环 = 单一主办银行</text>
      <text class="cd">同一笔供应链金融业务的所有环节（授信→放款→受托支付→回款→偿贷→结清）由「一家主办银行」在行内完成，资金不出行、风险统一管控；平台引入多家银行公开竞标、择优定标，公平有序竞争。</text>
    </view>

    <!-- 业务包 -->
    <view class="sec">待定标业务包</view>
    <view class="sg-card">
      <view class="sg-between"><text class="pk-n">{{ pkg.name }}</text><text class="pk-need">授信需求 {{ pkg.need }}</text></view>
      <view class="r"><text class="k">核心企业</text><text class="v">{{ pkg.core }}</text></view>
      <view class="r"><text class="k">期限</text><text class="v">{{ pkg.term }}</text></view>
      <view class="r"><text class="k">覆盖环节</text><text class="v"><text class="chip" v-for="s in pkg.stages" :key="s">{{ s }}</text></text></view>
    </view>

    <!-- 银行竞标 -->
    <view class="sec-row"><text class="sec">主办银行竞标</text><text v-if="!decided" class="demo" @tap="decide">▶ 择优定标</text><text v-else class="demo done">已定标</text></view>
    <view class="bid" v-for="(b, i) in ranked" :key="b.s" :class="{ win: decided && i === 0, dim: decided && i > 0 }">
      <view class="b-badge">{{ b.s }}</view>
      <view class="b-i">
        <view class="b-top"><text class="b-n">{{ b.name }}</text><text v-if="decided && i === 0" class="b-win">✔ 中标主办行</text><text v-else class="b-score">评分 {{ b.score }}</text></view>
        <view class="b-meta"><text class="bm">利率 {{ b.rate }}</text><text class="bm">额度 {{ b.limit }}</text><text class="bm">放款 {{ b.speed }}</text></view>
        <text class="b-extra">{{ b.extra }}</text>
      </view>
    </view>

    <!-- 中标后行内闭环 -->
    <view v-if="decided">
      <view class="sec">{{ winner.name }} · 行内资金闭环</view>
      <view class="sg-card">
        <view class="lp" v-for="(l, i) in loop" :key="i">
          <view class="lp-axis"><view class="lp-dot">{{ i + 1 }}</view><view v-if="i < loop.length - 1" class="lp-line"></view></view>
          <text class="lp-t">{{ l }}</text>
        </view>
        <view class="lp-done">✅ 全流程在「{{ winner.name }}」行内闭环：资金不出行、风险统一管控、单笔结清</view>
      </view>
    </view>

    <!-- 公平竞争机制 -->
    <view class="sec">公平有序竞争机制</view>
    <view class="sg-card">
      <view class="rule" v-for="(r, i) in rules" :key="i"><text class="ru-no">{{ i + 1 }}</text><text class="ru-t">{{ r }}</text></view>
    </view>
    <view class="tip">🔒 平台不触碰资金，仅提供链上数据与撮合定标；放款、风控、结清由中标主办银行行内闭环完成</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, $sg-gold, #c8871f); padding: 40rpx 28rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 22rpx; opacity: 0.95; margin-top: 8rpx; display: block; }
.concept { background: linear-gradient(135deg, $sg-gold-light, #fff); border: 2rpx solid #f0dcae; }
.cc { font-size: 27rpx; font-weight: 700; display: block; margin-bottom: 8rpx; }
.cd { font-size: 23rpx; color: $sg-text-2; line-height: 1.6; }
.sec { padding: 26rpx 28rpx 12rpx; font-size: 28rpx; font-weight: 700; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 24rpx; }
.demo { font-size: 24rpx; color: $sg-gold; background: $sg-gold-light; padding: 8rpx 22rpx; border-radius: 999rpx; }
.demo.done { color: $sg-primary; background: $sg-primary-light; }
.pk-n { font-size: 28rpx; font-weight: 700; }
.pk-need { font-size: 24rpx; color: $sg-red; font-weight: 600; }
.r { display: flex; padding: 12rpx 0; border-top: 2rpx solid $sg-border; margin-top: 8rpx; }
.r:first-of-type { border-top: none; margin-top: 10rpx; }
.k { width: 130rpx; color: $sg-text-3; font-size: 25rpx; }
.v { flex: 1; font-size: 25rpx; display: flex; flex-wrap: wrap; }
.chip { font-size: 20rpx; color: $sg-gold; background: $sg-gold-light; padding: 2rpx 12rpx; border-radius: 6rpx; margin: 0 8rpx 6rpx 0; }
.bid { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 16rpx; padding: 22rpx; border: 3rpx solid transparent; }
.bid.win { border-color: $sg-gold; background: linear-gradient(135deg, $sg-gold-light, #fff); }
.bid.dim { opacity: 0.6; }
.b-badge { width: 72rpx; height: 72rpx; border-radius: 20rpx; background: linear-gradient(135deg, $sg-gold, #c8871f); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 800; margin-right: 18rpx; }
.b-i { flex: 1; }
.b-top { display: flex; align-items: center; justify-content: space-between; }
.b-n { font-size: 27rpx; font-weight: 700; }
.b-win { font-size: 21rpx; color: #fff; background: $sg-gold; padding: 3rpx 14rpx; border-radius: 999rpx; }
.b-score { font-size: 22rpx; color: $sg-text-3; }
.b-meta { display: flex; gap: 20rpx; margin: 8rpx 0 4rpx; }
.bm { font-size: 22rpx; color: $sg-text-2; }
.b-extra { font-size: 21rpx; color: $sg-gold; }
.lp { display: flex; }
.lp-axis { display: flex; flex-direction: column; align-items: center; margin-right: 18rpx; }
.lp-dot { width: 44rpx; height: 44rpx; border-radius: 50%; background: $sg-gold; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 700; }
.lp-line { flex: 1; width: 4rpx; background: #f0dcae; min-height: 22rpx; margin: 4rpx 0; }
.lp-t { flex: 1; font-size: 24rpx; padding-bottom: 22rpx; }
.lp-done { font-size: 23rpx; color: #c8871f; background: $sg-gold-light; padding: 16rpx; border-radius: $sg-radius; margin-top: 6rpx; }
.rule { display: flex; align-items: flex-start; padding: 12rpx 0; border-bottom: 2rpx solid $sg-border; }
.rule:last-child { border-bottom: none; }
.ru-no { width: 40rpx; height: 40rpx; border-radius: 50%; background: $sg-primary; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 700; margin-right: 16rpx; flex-shrink: 0; }
.ru-t { flex: 1; font-size: 24rpx; color: $sg-text-2; line-height: 1.5; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
</style>
