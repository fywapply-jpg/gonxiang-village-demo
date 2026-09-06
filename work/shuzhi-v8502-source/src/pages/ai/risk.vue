<script setup lang="ts">
import { ref } from "vue";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const productionBlocked = () => uni.showModal({ title: "需后台风控服务", content: "正式环境的风险评估必须由后台风控引擎返回可审计结果，当前未执行本地扫描。", showCancel: false });

const kpis = [
  { n: "8,642", l: "今日评估(笔)" },
  { n: "37", l: "拦截(笔)" },
  { n: "99.2%", l: "识别准确率" },
  { n: "2,160 万", l: "挽回损失" },
];

// 五维风控能力
const dims = [
  { n: "虚假贸易识别", v: 98 },
  { n: "重复质押防控", v: 99 },
  { n: "异常价格监测", v: 95 },
  { n: "关联交易穿透", v: 92 },
  { n: "骗补套现拦截", v: 96 },
];

// 待风控评估的交易/信贷
const items = ref([
  { type: "订单贷申请", who: "赣南脐橙合作社", amount: "52 万", risk: 12, verdict: "通过", reason: "链上订单真实、履约良好、信用 AA" },
  { type: "大额交易", who: "某贸易公司 → 某加工厂", amount: "128 万", risk: 66, verdict: "预警", reason: "成交价偏离市场 22%、疑似关联交易" },
  { type: "仓单质押", who: "某粮商", amount: "80 万", risk: 89, verdict: "拦截", reason: "该电子仓单疑似重复质押（已在他行融资）" },
  { type: "补贴申领", who: "某农户", amount: "3.2 万", risk: 74, verdict: "预警", reason: "同一地块重复申报、种植数据缺失" },
]);
const running = ref(false);
const shown = ref(0);
function vColor(v: string) { return v === "通过" ? "#16884c" : v === "预警" ? "#d99a2b" : "#d64541"; }
function scan() { if (productionBuild) return productionBlocked(); running.value = true; shown.value = 0; const t = setInterval(() => { shown.value++; if (shown.value >= items.value.length) { clearInterval(t); running.value = false; } }, 600); }
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🛡️ AI 智能风控</text>
      <text class="hs">对信贷与每笔交易实时反欺诈评分 · 风险自动拦截 + 上链留痕</text>
      <view class="kpis">
        <view class="k" v-for="x in kpis" :key="x.l"><text class="kn">{{ x.n }}</text><text class="kl">{{ x.l }}</text></view>
      </view>
    </view>

    <!-- 五维能力 -->
    <view class="sec">五维风控能力</view>
    <view class="sg-card">
      <view class="dim" v-for="d in dims" :key="d.n">
        <view class="d-top"><text class="d-n">{{ d.n }}</text><text class="d-v">{{ d.v }}%</text></view>
        <view class="d-bar"><view class="d-fill" :style="{ width: d.v + '%' }"></view></view>
      </view>
    </view>

    <!-- 实时评估 -->
    <view class="sec-row"><text class="sec">实时风控评估</text><text class="scan-btn" :class="{ run: running }" @tap="scan">{{ running ? '扫描中…' : '▶ 一键风控扫描' }}</text></view>
    <view class="item" v-for="(it, i) in items" :key="i" :class="{ show: shown > i }">
      <view class="it-top">
        <view class="it-l"><text class="it-type">{{ it.type }}</text><text class="it-who">{{ it.who }} · {{ it.amount }}</text></view>
        <view class="it-verdict" :style="{ background: vColor(it.verdict) }">{{ shown > i ? it.verdict : '…' }}</view>
      </view>
      <view v-if="shown > i" class="it-body">
        <view class="risk-bar"><view class="risk-fill" :style="{ width: it.risk + '%', background: vColor(it.verdict) }"></view></view>
        <text class="it-risk">风险分 {{ it.risk }} / 100</text>
        <text class="it-reason">{{ it.reason }}</text>
      </view>
    </view>

    <view class="tip">🔗 风控基于链上真实交易 + 隐私计算联合建模，命中即自动拦截并上链留痕；预警转人工复核，拦截同步冻结相关授信。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #6d28d9, #4c1d95); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 36rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.9; margin-top: 8rpx; display: block; line-height: 1.5; }
.kpis { display: flex; margin-top: 22rpx; }
.k { flex: 1; text-align: center; }
.kn { font-size: 30rpx; font-weight: 800; display: block; }
.kl { font-size: 18rpx; opacity: 0.9; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 24rpx; }
.scan-btn { font-size: 23rpx; color: #fff; background: linear-gradient(135deg, #7c3aed, #6d28d9); padding: 10rpx 22rpx; border-radius: 999rpx; font-weight: 700; }
.scan-btn.run { opacity: 0.6; }
.sg-card { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.dim { padding: 10rpx 0; }
.d-top { display: flex; justify-content: space-between; align-items: baseline; }
.d-n { font-size: 23rpx; font-weight: 600; }
.d-v { font-size: 22rpx; color: #6d28d9; font-weight: 700; }
.d-bar { height: 12rpx; background: $sg-bg; border-radius: 999rpx; margin-top: 6rpx; overflow: hidden; }
.d-fill { height: 100%; background: linear-gradient(90deg, #a78bfa, #6d28d9); border-radius: 999rpx; }
.item { margin: 0 24rpx 12rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; opacity: 0.5; transition: opacity 0.3s; }
.item.show { opacity: 1; }
.it-top { display: flex; align-items: center; justify-content: space-between; }
.it-l { display: flex; flex-direction: column; }
.it-type { font-size: 25rpx; font-weight: 700; }
.it-who { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.it-verdict { font-size: 22rpx; color: #fff; font-weight: 700; padding: 6rpx 20rpx; border-radius: 999rpx; }
.it-body { margin-top: 12rpx; }
.risk-bar { height: 14rpx; background: $sg-bg; border-radius: 999rpx; overflow: hidden; }
.risk-fill { height: 100%; border-radius: 999rpx; }
.it-risk { font-size: 20rpx; color: $sg-text-2; margin: 6rpx 0 4rpx; display: block; }
.it-reason { font-size: 21rpx; color: $sg-text-2; line-height: 1.5; display: block; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 20rpx; color: $sg-text-3; line-height: 1.6; }
</style>
