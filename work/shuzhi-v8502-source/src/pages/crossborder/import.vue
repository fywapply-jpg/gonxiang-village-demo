<script setup lang="ts">
import { ref } from "vue";
const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

const kpis = [
  { n: "86 亿", l: "年进口额" }, { n: "320", l: "进口品类" },
  { n: "45", l: "来源国" }, { n: "100", l: "保税/海外仓" },
];

// 进口分销全流程
const flow = [
  { t: "海外选品签约", d: "对接海外产地/海外仓，签约锁价、备货" },
  { t: "跨境物流", d: "海运 / 中欧班列 / 空运，全程温控 GPS" },
  { t: "口岸报关", d: "海关单一窗口申报、缴纳关税增值税" },
  { t: "检验检疫", d: "海关查验、动植物检疫、加贴中文标" },
  { t: "保税入仓", d: "入保税仓 / 完税入境内仓，电子仓单上链" },
  { t: "数币跨境结算", d: "货款以数字人民币实时清算、汇率锁定" },
  { t: "国内分销", d: "枢纽分拨 → 商超 / 央厨 / 八类小端" },
];
const step = ref(0);
const running = ref(false);
function run() {
  if (productionBuild) return uni.showModal({ title: "需要跨境机构接入", content: "正式环境的报关、检疫、保税入仓和跨境结算必须由已接入机构返回真实回执，当前未播放本地流程。", showCancel: false });
  running.value = true; step.value = 0; const t = setInterval(() => { step.value++; if (step.value >= flow.length) clearInterval(t); }, 480);
}

// 保税/贸易模式
const modes = [
  { n: "保税备货", d: "先囤保税仓，下单后清关出仓——时效快、占资金少", tag: "1210" },
  { n: "跨境电商 B2B", d: "企业间跨境直采、清单核放、枢纽分拨给下游——品类全", tag: "9710/9810" },
  { n: "一般贸易", d: "整批完税进口、国内自由分销——适合大宗", tag: "0110" },
];

// 在架进口好货
const goods = [
  { emoji: "🥥", n: "泰国椰青", from: "🇹🇭 泰国", mode: "跨境电商 B2B", price: "¥6.8/个" },
  { emoji: "🥝", n: "新西兰奇异果", from: "🇳🇿 新西兰", mode: "保税备货", price: "¥88/箱" },
  { emoji: "🌾", n: "俄罗斯面粉", from: "🇷🇺 俄罗斯", mode: "一般贸易", price: "¥3.2/kg" },
  { emoji: "🍒", n: "智利车厘子", from: "🇨🇱 智利", mode: "空运直采", price: "¥168/箱" },
];
function trace() { uni.showModal({ title: "进口溯源验真", showCancel: false, confirmText: "知道了", content: "扫码可查：原产国、报关单号、检验检疫证、入境货物检验检疫证明、冷链温度曲线——全程上链、防伪防串货。" }); }
function order(g: any) {
  if (productionBuild) return uni.showModal({ title: "需要后台进口货源", content: "正式环境只能展示后台审核、海关/检疫和库存回执通过的进口 SKU，当前未创建采购意向。", showCancel: false });
  uni.showModal({ title: g.n, confirmText: "去采购", content: `来源：${g.from}\n模式：${g.mode}\n价格：${g.price}\n海关查验合格、中文标齐全、数字人民币结算。`, success: (r) => { if (r.confirm) uni.switchTab({ url: "/pages/trade/index" }); } });
}
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty">
      <text class="production-empty-title">暂无跨境机构回执</text>
      <text class="production-empty-text">正式环境的进口 SKU、报关、检疫、保税库存和跨境结算必须由后台及海关、物流、支付机构返回。本页面不展示静态进口货源或价格。</text>
    </view>
    <template v-else>
    <view class="hero">
      <text class="ht">📥 进口分销全流程</text>
      <text class="hs">海外选品 → 跨境物流 → 报关检疫 → 保税入仓 → 数币结算 → 国内分销</text>
      <view class="kpis">
        <view class="k" v-for="x in kpis" :key="x.l"><text class="kn">{{ x.n }}</text><text class="kl">{{ x.l }}</text></view>
      </view>
    </view>

    <!-- 全流程 -->
    <view class="sec-row"><text class="sec">跨境进口全流程</text><text class="demo" @tap="run">查看流程</text></view>
    <view class="sg-card">
      <view class="fl" v-for="(f, i) in flow" :key="i" :class="{ on: running && step > i }">
        <view class="fl-axis"><view class="fl-dot" :class="{ on: running && step > i }">{{ running && step > i ? '✓' : i + 1 }}</view><view v-if="i < flow.length - 1" class="fl-line" :class="{ on: running && step > i + 1 }"></view></view>
        <view class="fl-i"><text class="fl-t">{{ f.t }}</text><text class="fl-d">{{ f.d }}</text></view>
      </view>
      <view v-if="running && step >= flow.length" class="fl-done">✅ 进口货物完税/保税入境、检疫合格、数币结算，经枢纽分拨直达商超与八类小端，全程上链可溯源。</view>
    </view>

    <!-- 贸易模式 -->
    <view class="sec">进口贸易模式</view>
    <view class="mode" v-for="m in modes" :key="m.n">
      <view class="m-l"><text class="m-n">{{ m.n }}</text><text class="m-d">{{ m.d }}</text></view>
      <text class="m-tag">监管码 {{ m.tag }}</text>
    </view>

    <!-- 在架进口好货 -->
    <view class="sec">在架进口好货</view>
    <view class="goods">
      <view class="g" v-for="g in goods" :key="g.n" @tap="order(g)">
        <text class="g-e">{{ g.emoji }}</text>
        <view class="g-i"><text class="g-n">{{ g.n }}</text><text class="g-m">{{ g.from }} · {{ g.mode }}</text></view>
        <text class="g-p">{{ g.price }}</text>
      </view>
    </view>

    <view class="trace-btn" @tap="trace">🔍 扫码验进口溯源（报关单/检疫证/冷链）</view>
    <view class="tip">🔗 依托五大枢纽保税仓 + 海关单一窗口，进口全链数据上链；数字人民币跨境结算替代传统电汇，实时清算、汇率锁定、合规可控。</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #1e5fa8, #133f73); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 36rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.9; margin-top: 8rpx; display: block; line-height: 1.5; }
.kpis { display: flex; margin-top: 22rpx; }
.k { flex: 1; text-align: center; }
.kn { font-size: 32rpx; font-weight: 800; display: block; }
.kl { font-size: 18rpx; opacity: 0.9; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 24rpx; }
.demo { font-size: 24rpx; color: #1e5fa8; background: #eef5ff; padding: 8rpx 22rpx; border-radius: 999rpx; }
.sg-card { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.fl { display: flex; opacity: 0.5; transition: opacity 0.3s; }
.fl.on { opacity: 1; }
.fl-axis { display: flex; flex-direction: column; align-items: center; margin-right: 20rpx; }
.fl-dot { width: 46rpx; height: 46rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; }
.fl-dot.on { background: #1e5fa8; }
.fl-line { flex: 1; width: 4rpx; background: $sg-border; min-height: 22rpx; margin: 4rpx 0; }
.fl-line.on { background: #1e5fa8; }
.fl-i { flex: 1; display: flex; flex-direction: column; padding-bottom: 22rpx; }
.fl-t { font-size: 25rpx; font-weight: 600; }
.fl-d { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; line-height: 1.4; }
.fl-done { font-size: 22rpx; color: #1e5fa8; background: #eef5ff; padding: 16rpx; border-radius: $sg-radius; line-height: 1.6; }
.mode { display: flex; align-items: center; margin: 0 24rpx 12rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; }
.m-l { flex: 1; display: flex; flex-direction: column; }
.m-n { font-size: 26rpx; font-weight: 700; }
.m-d { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; line-height: 1.4; }
.m-tag { font-size: 19rpx; color: #1e5fa8; background: #eef5ff; padding: 5rpx 14rpx; border-radius: 6rpx; flex: none; }
.goods { padding: 0 24rpx; }
.g { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx; margin-bottom: 12rpx; }
.g-e { font-size: 44rpx; margin-right: 16rpx; }
.g-i { flex: 1; display: flex; flex-direction: column; }
.g-n { font-size: 26rpx; font-weight: 700; }
.g-m { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.g-p { font-size: 26rpx; font-weight: 800; color: $sg-red; }
.trace-btn { margin: 8rpx 24rpx 0; text-align: center; padding: 24rpx 0; border-radius: 999rpx; background: #fff; border: 2rpx solid #1e5fa8; color: #1e5fa8; font-size: 25rpx; font-weight: 700; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 20rpx; color: $sg-text-3; line-height: 1.6; }
.production-empty { margin: 48rpx 24rpx; padding: 34rpx 28rpx; border: 2rpx solid #d8e7de; border-radius: 22rpx; background: #f7fbf8; }
.production-empty-title { display: block; color: #145d3c; font-size: 32rpx; font-weight: 900; }
.production-empty-text { display: block; margin-top: 16rpx; color: #5e7167; font-size: 24rpx; line-height: 1.7; }
</style>
