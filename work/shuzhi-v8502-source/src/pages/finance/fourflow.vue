<script setup lang="ts">
import { ref, computed } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const productionBlocked = () => uni.showModal({ title: "需后台四流核验", content: "正式环境四流一致性必须由后台核验真实凭证，当前未执行本地核验。", showCancel: false });

// 一笔交易的四流数据
const flows = [
  { key: "contract", icon: "📄", n: "合同流（商流）", items: ["采购订单 PO-2026-0782", "买方 沪上团餐中央厨房", "卖方 赣南脐橙合作社", "标的 脐橙特级 60 吨 · ¥55.2 万"] },
  { key: "goods", icon: "🚚", n: "货物流（物流）", items: ["出库单+运单 WL-3391", "发货 60 吨 · 冷链 GPS 全程", "央厨仓已签收 · 溯源上链", "过磅/温控数据留痕"] },
  { key: "fund", icon: "💰", n: "资金流", items: ["买方同名对公账户付款 ¥55.2 万", "持牌机构监管冻结", "验收证据触发银行直分至卖方对公户", "回款闭环 ✔"] },
  { key: "invoice", icon: "🧾", n: "发票流（票据流）", items: ["增值税专票 4 张", "购销方与合同一致", "金额 ¥55.2 万 · 税局验真通过", "品名/数量与合同一致"] },
];

// 五维一致性校验
const dims = [
  { n: "主体一致", d: "合同买卖方 = 付/收款方 = 发票购销方 = 收/发货方" },
  { n: "标的一致", d: "品名 / 规格 / HS 编码 四流一致" },
  { n: "数量一致", d: "合同量 = 发货量 = 发票量 = 结算量（允许合理磅差）" },
  { n: "金额一致", d: "合同额 = 发票额 = 付款额（允许尾差）" },
  { n: "时间逻辑", d: "签约 → 发货 → 收货 → 开票 → 付款/回款 时序合理" },
];

// 风险案例开关：融资性贸易风险（走单走票不走货）
const risk = ref(false);
const checked = ref(false);
const running = ref(false);
const step = ref(0);
// 有风险时命中的维度（无物流 → 主体/数量/时间异常）
const failDims = computed(() => (risk.value ? [0, 2, 4] : []));
function isFail(i: number) { return failDims.value.includes(i); }
const passAll = computed(() => failDims.value.length === 0);

function verify() {
  if (productionBuild) return productionBlocked();
  checked.value = false; running.value = true; step.value = 0;
  const t = setInterval(() => { step.value++; if (step.value >= dims.length) { clearInterval(t); running.value = false; checked.value = true; } }, 400);
}
function toggleRisk() { risk.value = !risk.value; checked.value = false; step.value = 0; }

// 实施流程
const proc = [
  { t: "触发核验", d: "融资申请 / 大额付款 / 仓单质押 时自动触发" },
  { t: "调取四流", d: "系统归集该笔交易的合同、物流、发票、资金四流数据" },
  { t: "五维交叉比对", d: "主体/标的/数量/金额/时间 逐项交叉核验" },
  { t: "放行 或 拦截", d: "四流合一→放款/付款并上链；不一致→拦截+风险工单+人工核查" },
  { t: "回款闭环监控", d: "持续跟踪资金回款，'有借有还'闭环，异常预警" },
];

// 风险场景
const scenes = [
  "走单走票不走货：有合同发票、无真实物流",
  "自我交易 / 关联方循环空转贸易",
  "同一货物 / 仓单多头重复质押融资",
  "发票虚增：开票金额 > 合同/物流金额",
  "无真实回款：资金不闭环、借新还旧",
];
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty">
      <text class="production-empty-title">暂无后台四流交易</text>
      <text class="production-empty-text">正式环境只展示后台返回的合同、物流、资金和发票凭证；本地四流案例不会作为真实交易展示。</text>
    </view>
    <template v-else>
    <view class="hero">
      <text class="ht">🔗 四流合一 · 融资贸易风控</text>
      <text class="hs">合同流 · 物流 · 资金流 · 发票流 四流一致，才放款/付款——防走单走票不走货、空转、重复质押</text>
    </view>

    <!-- 四流卡片 -->
    <view class="sec">交易四流（同一笔业务）</view>
    <view class="flows">
      <view class="flow" v-for="f in flows" :key="f.key" :class="{ bad: risk && f.key === 'goods' }">
        <view class="fw-hd"><text class="fw-ic">{{ f.icon }}</text><text class="fw-n">{{ f.n }}</text><text v-if="risk && f.key === 'goods'" class="fw-miss">⚠️ 缺失/异常</text></view>
        <text class="fw-it" v-for="it in f.items" :key="it">· {{ risk && f.key === 'goods' ? '（无真实物流单据）' : it }}</text>
      </view>
    </view>

    <!-- 核验 -->
    <view class="sec-row">
      <text class="sec">五维一致性核验</text>
      <text class="risk-btn" :class="{ on: risk }" @tap="toggleRisk">{{ risk ? '⚠️ 风险案例' : '切换风险案例' }}</text>
    </view>
    <view class="sg-card">
      <view class="dim" v-for="(d, i) in dims" :key="d.n" :class="{ show: !running || step > i }">
        <view class="dm-l">
          <text class="dm-n">{{ d.n }}</text>
          <text class="dm-d">{{ d.d }}</text>
        </view>
        <text class="dm-r" v-if="checked" :class="isFail(i) ? 'fail' : 'pass'">{{ isFail(i) ? '✗ 不符' : '✓ 一致' }}</text>
        <text class="dm-r wait" v-else-if="running && step > i">…</text>
      </view>
      <view v-if="checked" class="verdict" :class="{ pass: passAll }">
        {{ passAll ? '✅ 四流合一 · 交易真实 → 放行放款/付款，全程上链存证' : '⛔ 四流不一致（疑似走单走票不走货）→ 拦截融资/付款，形成风险工单转人工' }}
      </view>
      <view class="verify-btn" @tap="verify">开始四流核验</view>
    </view>

    <!-- 实施流程 -->
    <view class="sec">实施流程（融资/支付环节）</view>
    <view class="sg-card">
      <view class="pr" v-for="(p, i) in proc" :key="i">
        <view class="pr-n">{{ i + 1 }}</view>
        <view class="pr-i"><text class="pr-t">{{ p.t }}</text><text class="pr-d">{{ p.d }}</text></view>
      </view>
    </view>

    <!-- 风险场景 -->
    <view class="sec">重点拦截的融资贸易风险</view>
    <view class="scenes">
      <text class="scene" v-for="(s, i) in scenes" :key="i">🚫 {{ s }}</text>
    </view>

    <view class="tip">🔗 四流数据（合同/物流/发票/资金）全程上链、交叉存证，隐私计算联合银行/税务/海关核验；四流合一是放款与大额付款的前置硬条件，杜绝虚假贸易骗取融资。</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #2b6cb0, #1e4e8c); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; line-height: 1.5; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 24rpx; }
.risk-btn { font-size: 21rpx; color: #c0392b; background: #fdeceb; padding: 8rpx 20rpx; border-radius: 999rpx; font-weight: 700; }
.risk-btn.on { color: #fff; background: #c0392b; }
.flows { display: flex; flex-wrap: wrap; gap: 14rpx; padding: 0 24rpx; }
.flow { width: calc(50% - 7rpx); box-sizing: border-box; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx; border: 2rpx solid transparent; }
.flow.bad { border-color: #f5c6c2; background: #fdeceb; }
.fw-hd { display: flex; align-items: center; margin-bottom: 8rpx; flex-wrap: wrap; }
.fw-ic { font-size: 30rpx; margin-right: 8rpx; }
.fw-n { font-size: 22rpx; font-weight: 800; }
.fw-miss { font-size: 17rpx; color: #fff; background: #c0392b; padding: 2rpx 8rpx; border-radius: 6rpx; margin-left: 6rpx; }
.fw-it { font-size: 18rpx; color: $sg-text-2; display: block; line-height: 1.5; }
.sg-card { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.dim { display: flex; align-items: center; padding: 14rpx 0; border-top: 2rpx solid $sg-bg; opacity: 0.45; transition: opacity 0.3s; }
.dim:first-child { border-top: none; }
.dim.show { opacity: 1; }
.dm-l { flex: 1; display: flex; flex-direction: column; }
.dm-n { font-size: 24rpx; font-weight: 700; }
.dm-d { font-size: 18rpx; color: $sg-text-3; margin-top: 2rpx; line-height: 1.4; }
.dm-r { font-size: 24rpx; font-weight: 800; flex: none; margin-left: 12rpx; }
.dm-r.pass { color: #16884c; }
.dm-r.fail { color: #d64541; }
.dm-r.wait { color: $sg-text-3; }
.verdict { margin-top: 14rpx; padding: 16rpx 18rpx; border-radius: $sg-radius; background: #fdeceb; color: #c0392b; font-size: 22rpx; line-height: 1.5; font-weight: 600; }
.verdict.pass { background: $sg-primary-light; color: $sg-primary-deep; }
.verify-btn { margin-top: 14rpx; text-align: center; padding: 22rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #2b6cb0, #1e4e8c); color: #fff; font-size: 26rpx; font-weight: 700; }
.pr { display: flex; align-items: flex-start; padding: 12rpx 0; border-top: 2rpx solid $sg-bg; }
.pr:first-child { border-top: none; }
.pr-n { width: 40rpx; height: 40rpx; flex: none; border-radius: 50%; background: #2b6cb0; color: #fff; font-size: 22rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-right: 14rpx; }
.pr-i { flex: 1; display: flex; flex-direction: column; }
.pr-t { font-size: 24rpx; font-weight: 600; }
.pr-d { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; line-height: 1.4; }
.scenes { padding: 0 24rpx; }
.scene { display: block; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 16rpx 18rpx; margin-bottom: 10rpx; font-size: 22rpx; color: $sg-text-2; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.production-empty { margin: 48rpx 24rpx; padding: 34rpx 28rpx; border: 2rpx solid #d8e7de; border-radius: 22rpx; background: #f7fbf8; }
.production-empty-title { display: block; color: #145d3c; font-size: 32rpx; font-weight: 900; }
.production-empty-text { display: block; margin-top: 16rpx; color: #5e7167; font-size: 24rpx; line-height: 1.7; }
</style>
