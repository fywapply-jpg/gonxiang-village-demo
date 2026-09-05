<script setup lang="ts">
import { ref, computed } from "vue";
import { aiKpis, aiCaps, forecasts, picks } from "@/mock/ai";

// 正式环境不展示本地演示指标，必须由后台 AI 服务返回并带审计时间戳。
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

// 价格预测
const fi = ref(0);
const f = computed(() => forecasts[fi.value]);
const allVals = computed(() => [...f.value.hist, ...f.value.fore]);
const fmax = computed(() => Math.max(...allVals.value) * 1.1);
const fmin = computed(() => Math.min(...allVals.value) * 0.9);
function barH(v: number) { return Math.max(8, Math.round((v - fmin.value) / (fmax.value - fmin.value) * 150) + 10); }

// 智能选品
const pi = ref(0);
const p = computed(() => picks[pi.value]);

function capDemo(key: string, n: string) {
  if (key === "qa") return uni.navigateTo({ url: "/pages/ai/qa" });
  if (key === "quality") return uni.navigateTo({ url: "/pages/ai/quality" });
  if (key === "pick") return uni.navigateTo({ url: "/pages/ai/pick" });
  if (key === "price") return uni.navigateTo({ url: "/pages/ai/forecast" });
  if (key === "risk") return uni.navigateTo({ url: "/pages/ai/risk" });
  if (key === "match") return uni.navigateTo({ url: "/pages/ai/match" });
  const txt: Record<string, string> = {
    pick: "输入你的店型与位置，AI 结合周边动销榜、季节、毛利，一键生成进货清单与建议量——不用凭感觉进货。",
    price: "基于历史价、天气、产区产量、物流与节令，预测未来 7/30 日价格走势与置信度，辅助买卖时机决策。",
    risk: "对信贷申请与每笔交易做实时反欺诈评分，识别虚假贸易、重复质押、异常价格，风险自动拦截 + 上链留痕。",
    match: "供货信息与采购需求自动语义匹配，按就近、时效、价格、信用综合排序，秒级撮合、一键约谈。",
    quality: "上传农产品照片，AI 识别品类、成色分级、缺陷与病虫害，辅助定级定价、进入溯源档案。",
    qa: "农技、政策、平台操作问题 7×24 智能应答，接入国产大模型 + 供销专业知识库，答不了转人工。",
  };
  uni.showModal({ title: "AI · " + n, showCancel: false, confirmText: "知道了", content: txt[key] || "" });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🧠 AI 智能中枢</text>
      <text class="hs">「数智供社」的智能大脑 · 选品 / 预测 / 风控 / 撮合 / 识别 / 问答</text>
      <view v-if="!productionBuild" class="kpis">
        <view class="k" v-for="x in aiKpis" :key="x.l"><text class="kn">{{ x.n }}</text><text class="kl">{{ x.l }}</text></view>
      </view>
    </view>

    <!-- AI 农技问答入口 -->
    <view class="qa-entry" @tap="uni.navigateTo({ url: '/pages/ai/qa' })">
      <text class="qe-ic">💬</text>
      <view class="qe-i"><text class="qe-t">AI 农技智能问答 · 7×24 在线</text><text class="qe-s">种植 / 病虫害 / 补贴 / 贷款 / 行情，一问一答</text></view>
      <text class="qe-go">去问问 ›</text>
    </view>

    <!-- 六大能力 -->
    <view class="sec">六大 AI 能力</view>
    <view class="caps">
      <view class="cap" v-for="c in aiCaps" :key="c.key" @tap="capDemo(c.key, c.n)">
        <text class="cap-ic">{{ c.icon }}</text>
        <view class="cap-i"><text class="cap-n">{{ c.n }}</text><text class="cap-d">{{ c.d }}</text></view>
      </view>
    </view>

    <view v-if="productionBuild" class="backend-note">正式环境 AI 指标、预测和推荐由后台模型服务实时返回；当前未配置 AI 服务，已隐藏演示数据。</view>

    <!-- AI 价格预测（可交互）-->
    <view v-if="!productionBuild" class="sec">📈 AI 价格预测</view>
    <view v-if="!productionBuild" class="fcard">
      <view class="tabs">
        <text v-for="(x, i) in forecasts" :key="x.n" class="tab" :class="{ on: fi === i }" @tap="fi = i">{{ x.n }}</text>
      </view>
      <view class="f-head">
        <view><text class="f-cur">¥{{ f.fore[f.fore.length - 1] }}</text><text class="f-unit">{{ f.unit }} · 7日后预测</text></view>
        <view class="f-tr" :class="{ up: f.trend.includes('↑'), down: f.trend.includes('↓') }">{{ f.trend }}</view>
      </view>
      <!-- 图：7历史 + 7预测 -->
      <view class="chart">
        <view class="col" v-for="(v, i) in allVals" :key="i">
          <view class="cbar" :class="{ fore: i >= f.hist.length }" :style="{ height: barH(v) + 'rpx' }"></view>
        </view>
      </view>
      <view class="chart-x"><text>← 近 7 日实际</text><text class="conf">{{ f.conf }}</text><text>未来 7 日预测 →</text></view>
      <view class="advice">🤖 {{ f.advice }}</view>
    </view>

    <!-- AI 智能选品（可交互）-->
    <view v-if="!productionBuild" class="sec">🎯 AI 智能选品荐货</view>
    <view v-if="!productionBuild" class="pcard">
      <view class="tabs">
        <text v-for="(x, i) in picks" :key="x.store" class="tab" :class="{ on: pi === i }" @tap="pi = i">{{ x.icon }} {{ x.store }}</text>
      </view>
      <view class="pi" v-for="it in p.items" :key="it.n">
        <view class="pi-l"><text class="pi-n">{{ it.n }}</text><text class="pi-r">{{ it.reason }}</text></view>
        <text class="pi-q">{{ it.qty }}</text>
      </view>
      <text class="p-note">🤖 AI 依据周边动销、季节、毛利与你的店型推荐，进货不再凭感觉。</text>
    </view>

    <!-- 自主可控 -->
    <view class="model">
      <text class="m-t">🇨🇳 国产大模型底座</text>
      <text class="m-s">基于国产大模型 + 供销产业知识库训练，数据不出境、可信可控；预测与建议仅供参考，不构成投资/交易承诺。</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #6d28d9, #4c1d95); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 36rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.9; margin-top: 8rpx; display: block; line-height: 1.5; }
.kpis { display: flex; margin-top: 20rpx; }
.k { flex: 1; text-align: center; }
.kn { font-size: 30rpx; font-weight: 800; display: block; color: #d6bcfa; }
.kl { font-size: 18rpx; opacity: 0.85; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.qa-entry { display: flex; align-items: center; margin: 20rpx 24rpx 0; padding: 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #7c3aed, #6d28d9); box-shadow: 0 8rpx 20rpx rgba(124,58,237,0.3); }
.qe-ic { font-size: 44rpx; margin-right: 14rpx; }
.qe-i { flex: 1; display: flex; flex-direction: column; }
.qe-t { font-size: 26rpx; font-weight: 800; color: #fff; }
.qe-s { font-size: 18rpx; color: rgba(255,255,255,0.85); margin-top: 4rpx; }
.qe-go { font-size: 23rpx; color: #fff; background: rgba(255,255,255,0.2); padding: 8rpx 18rpx; border-radius: 999rpx; }
.caps { display: flex; flex-wrap: wrap; gap: 14rpx; padding: 0 24rpx; }
.cap { width: calc(50% - 7rpx); box-sizing: border-box; display: flex; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx; }
.cap-ic { font-size: 40rpx; margin-right: 12rpx; }
.cap-i { flex: 1; display: flex; flex-direction: column; }
.cap-n { font-size: 24rpx; font-weight: 700; }
.cap-d { font-size: 18rpx; color: $sg-text-3; margin-top: 4rpx; line-height: 1.4; }
.fcard, .pcard { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.tabs { display: flex; gap: 10rpx; margin-bottom: 16rpx; flex-wrap: wrap; }
.tab { font-size: 22rpx; color: $sg-text-2; background: $sg-bg; padding: 8rpx 20rpx; border-radius: 999rpx; }
.tab.on { background: #6d28d9; color: #fff; font-weight: 700; }
.f-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 14rpx; }
.f-cur { font-size: 44rpx; font-weight: 800; color: #6d28d9; }
.f-unit { font-size: 19rpx; color: $sg-text-3; margin-left: 8rpx; }
.f-tr { font-size: 24rpx; font-weight: 700; padding: 6rpx 16rpx; border-radius: 999rpx; background: $sg-bg; }
.f-tr.up { color: #fff; background: $sg-red; }
.f-tr.down { color: #fff; background: $sg-primary; }
.chart { display: flex; align-items: flex-end; justify-content: space-between; height: 180rpx; padding: 0 2rpx; }
.col { flex: 1; display: flex; align-items: flex-end; justify-content: center; }
.cbar { width: 20rpx; border-radius: 5rpx 5rpx 0 0; background: linear-gradient(180deg, #a78bfa, #7c3aed); }
.cbar.fore { background: repeating-linear-gradient(135deg, #d6bcfa, #d6bcfa 6rpx, #ede4fd 6rpx, #ede4fd 12rpx); }
.chart-x { display: flex; justify-content: space-between; align-items: center; margin-top: 8rpx; font-size: 18rpx; color: $sg-text-3; }
.conf { color: #6d28d9; font-weight: 700; }
.advice { margin-top: 14rpx; font-size: 21rpx; color: #5b21b6; background: #f3ecfe; padding: 14rpx; border-radius: $sg-radius; line-height: 1.5; }
.pi { display: flex; align-items: center; justify-content: space-between; padding: 14rpx 0; border-top: 2rpx solid $sg-bg; }
.pi:first-of-type { border-top: none; }
.pi-l { flex: 1; display: flex; flex-direction: column; }
.pi-n { font-size: 26rpx; font-weight: 700; }
.pi-r { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; }
.pi-q { font-size: 24rpx; font-weight: 700; color: #6d28d9; }
.p-note { display: block; margin-top: 12rpx; font-size: 20rpx; color: $sg-text-3; line-height: 1.5; }
.model { margin: 20rpx 24rpx 30rpx; background: linear-gradient(135deg, #f3ecfe, #fff); border: 2rpx solid #ddd0f7; border-radius: $sg-radius-lg; padding: 22rpx; }
.backend-note { margin: 20rpx 24rpx; padding: 22rpx; border-radius: $sg-radius-lg; background: #fff7ed; border: 2rpx solid #fed7aa; color: #9a3412; font-size: 23rpx; line-height: 1.6; }
.m-t { font-size: 25rpx; font-weight: 800; color: #5b21b6; }
.m-s { font-size: 20rpx; color: $sg-text-2; margin-top: 8rpx; display: block; line-height: 1.6; }
</style>
