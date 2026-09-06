<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { getTradeConfig } from "@/services/localApi";

const props = defineProps<{ side: "supply" | "demand" }>();
type PlanKey = "advance" | "custody" | "cod" | "credit";
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const step = ref(-1);
const planKey = ref<PlanKey>("custody");
let timer: ReturnType<typeof setInterval> | undefined;

const supplySteps = [
  { t: "主体准入", d: "供货主体、经办授权、经营范围、品类许可、同名对公账户" },
  { t: "真实供给", d: "批次、可供量、产地、质量等级、交期、库存或产能凭证" },
  { t: "报价响应", d: "含税单价、运费、损耗、验收、付款方式和报价有效期一次写清" },
  { t: "订单复核", d: "防重复锁货、异常价格、关联交易和超能力承诺" },
  { t: "CA签约", d: "数量浮动、分批交付、抽检复检、发票、资金释放与违约责任固化" },
  { t: "交付验收", d: "锁批次、称重、温控、签收、共同取样；异常只隔离受影响批次" },
  { t: "收款结案", d: "无争议货款按期直达供方对公户；争议金额单列，回单与信用同步" },
];
const demandSteps = [
  { t: "采购授权", d: "采购主体、经办权限、预算科目、内部审批和同名付款账户" },
  { t: "需求定稿", d: "品名、数量、质量、用途、交期、交货地、预算和验收方法可量化" },
  { t: "询价定标", d: "同口径比价；保留报价版本、评审依据、关联披露和授权记录" },
  { t: "订单复核", d: "校验供应能力、价格偏离、重复采购、预算余额和收货能力" },
  { t: "CA签约", d: "选定付款模型、账期起算点、到期日、开票、担保和逾期责任" },
  { t: "收货验收", d: "到货复磅、抽检、留样和异议时限；买方不得临时单方提高标准" },
  { t: "付款对账", d: "依合同节点付款；逾期预警、暂停新增赊销，争议款和正常款分开" },
];
const steps = computed(() => props.side === "supply" ? supplySteps : demandSteps);

const plans = ref([
  {
    key: "advance" as PlanKey, name: "预付款 + 尾款", badge: "适合定制/备产",
    pay: "签约后30%预付款；验收后70%尾款", risk: "预付款由合同约定用途、退款条件和履约保障；不得直接打入平台自有账户",
  },
  {
    key: "custody" as PlanKey, name: "机构监管结算", badge: "推荐大宗标准单",
    pay: "买方按已签约银行/持牌支付机构付款指引，从同名对公账户付款；机构按验收节点执行结算", risk: "必须明确具体机构、产品、账户、回单和结算条件；平台不自称资金托管方",
  },
  {
    key: "cod" as PlanKey, name: "货到/验收即付", badge: "适合短链现货",
    pay: "到货验收合格后当日或T+2内对公付款", risk: "必须定义验收时限、异议方式和逾期后果；不得用拖延验收变相占用货款",
  },
  {
    key: "credit" as PlanKey, name: "授信账期", badge: "审批后才能使用",
    pay: "示例：验收合格次日起30天，到期日精确到日期", risk: "先核买方额度、期限和增信；平台不是放贷人，也不承诺兜底回款",
  },
]);
const amounts = ref(productionBuild ? [] : [
  { n: "货物价款", v: "¥275,644", note: "本单验收合格商品净额，计入订单金额" },
  { n: "合同服务费用", v: "¥356", note: "包装、物流、检测等按实际服务逐项列示，计入订单金额" },
  { n: "平台技术服务", v: "¥11,025.76", note: "验收合格商品净额 ¥275,644 × 4%，结算时单独列示，不计入订单金额" },
]);

onMounted(async () => {
  try {
    const config = await getTradeConfig();
    if (Array.isArray(config.settlement_models) && config.settlement_models.length) plans.value = config.settlement_models;
    if (!productionBuild && Array.isArray(config.amount_items) && config.amount_items.length) amounts.value = config.amount_items;
  } catch { /* 前台保留本地默认配置，后台不可用时仍可本地联调 */ }
});

function run() {
  if (timer) clearInterval(timer);
  step.value = -1;
  timer = setInterval(() => {
    step.value += 1;
    if (step.value >= steps.value.length - 1 && timer) {
      clearInterval(timer);
      timer = undefined;
      uni.showToast({ title: "业务节点已更新", icon: "success" });
    }
  }, 460);
}
function openSettle() {
  uni.navigateTo({ url: "/pages/finance/fourflow" });
}
onUnmounted(() => { if (timer) clearInterval(timer); });
</script>

<template>
  <view class="flow-panel" :class="{ buyer: side === 'demand' }">
    <view class="flow-head">
      <view>
        <text class="flow-k">数智供社 v8533 · {{ side === "supply" ? "供货方" : "采购方" }}视角</text>
        <text class="flow-t">{{ side === "supply" ? "从真实货源到安全收款" : "从真实需求到合规付款" }}</text>
      </view>
      <view class="run" @tap="run">查看节点</view>
    </view>

    <scroll-view scroll-x class="step-scroll">
      <view class="step-row">
        <view v-for="(item, i) in steps" :key="item.t" class="step" :class="{ done: step >= i, current: step === i }">
          <view class="step-no">{{ step >= i ? "✓" : i + 1 }}</view>
          <text class="step-t">{{ item.t }}</text>
          <view v-if="i < steps.length - 1" class="step-arrow">›</view>
        </view>
      </view>
    </scroll-view>

    <view class="sub-head">
      <view><text class="sub-t">选择结算模型</text></view>
      <text class="detail-go" @tap="openSettle">交易结算 ›</text>
    </view>
    <scroll-view scroll-x class="plan-scroll">
      <view class="plan-row">
        <view v-for="item in plans" :key="item.key" class="plan-chip" :class="{ on: planKey === item.key }" @tap="planKey = item.key">
          <text>{{ item.name }}</text><text>{{ item.badge }}</text>
        </view>
      </view>
    </scroll-view>
    <view v-if="planKey === 'credit'" class="credit-compact">需机构授信审批</view>

    <view v-if="productionBuild" class="production-amount-empty">订单金额、服务费和平台技术服务费以后台正式订单明细及机构回执为准</view>
    <view v-else class="amount-box">
      <view class="amount-head"><text>订单金额拆开算</text><text>应付 ¥276,000 · 平台费另计</text></view>
      <view v-for="item in amounts" :key="item.n" class="amount-row">
        <text>{{ item.n }}</text><text>{{ item.v }}</text><text>{{ item.note }}</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.flow-panel { margin: 14rpx 24rpx 18rpx; overflow: hidden; border-radius: 22rpx; background: #fff; box-shadow: 0 8rpx 26rpx rgba(16,64,43,.09); }
.flow-head { display: flex; align-items: center; gap: 16rpx; padding: 24rpx; color: #fff; background: linear-gradient(135deg, #0f6b3b, #183b2e); }
.buyer .flow-head { background: linear-gradient(135deg, #1e5f91, #173b59); }
.flow-head > view:first-child { flex: 1; display: flex; flex-direction: column; }
.flow-k { font-size: 18rpx; color: #ffe2a1; font-weight: 700; }
.flow-t { margin-top: 4rpx; font-size: 28rpx; font-weight: 900; }
.flow-s { margin-top: 5rpx; font-size: 19rpx; opacity: .86; line-height: 1.4; }
.run { flex: none; padding: 12rpx 16rpx; border-radius: 999rpx; background: rgba(255,255,255,.16); font-size: 19rpx; font-weight: 750; }
.step-scroll, .plan-scroll { white-space: nowrap; }
.step-row { display: inline-flex; padding: 20rpx 20rpx 14rpx; gap: 12rpx; }
.step { position: relative; width: 228rpx; min-height: 174rpx; padding: 17rpx; box-sizing: border-box; border-radius: 16rpx; background: #f4f6f7; opacity: .62; white-space: normal; }
.step.done { opacity: 1; background: #edf8f2; border: 2rpx solid #c7ead5; }
.buyer .step.done { background: #eff7fd; border-color: #cfe4f3; }
.step.current { box-shadow: 0 0 0 6rpx rgba(217,154,43,.13); }
.step-no { width: 40rpx; height: 40rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; background: #9da8a2; font-size: 18rpx; font-weight: 800; }
.step.done .step-no { background: #16884c; }
.buyer .step.done .step-no { background: #2b6cb0; }
.step-t { display: block; margin-top: 9rpx; font-size: 23rpx; font-weight: 800; }
.step-d { display: block; margin-top: 5rpx; color: #667085; font-size: 18rpx; line-height: 1.45; }
.step-arrow { position: absolute; right: -19rpx; top: 70rpx; z-index: 2; color: #98a2b3; font-size: 32rpx; }
.sub-head { display: flex; align-items: center; padding: 8rpx 22rpx 0; }
.sub-head > view { flex: 1; display: flex; flex-direction: column; }
.sub-t { font-size: 25rpx; font-weight: 850; }
.sub-s { margin-top: 2rpx; color: #7a8490; font-size: 17rpx; line-height: 1.4; }
.detail-go { color: #16884c; font-size: 19rpx; font-weight: 700; }
.buyer .detail-go { color: #2b6cb0; }
.plan-row { display: inline-flex; gap: 10rpx; padding: 14rpx 22rpx; }
.plan-chip { min-width: 196rpx; padding: 13rpx 16rpx; border-radius: 14rpx; background: #f2f4f5; display: inline-flex; flex-direction: column; }
.plan-chip text:first-child { font-size: 21rpx; font-weight: 800; }
.plan-chip text:last-child { margin-top: 3rpx; color: #7b8580; font-size: 16rpx; }
.plan-chip.on { color: #fff; background: #16884c; }
.buyer .plan-chip.on { background: #2b6cb0; }
.plan-chip.on text:last-child { color: rgba(255,255,255,.82); }
.credit-compact { margin: 0 22rpx 18rpx; padding: 12rpx 16rpx; border-radius: 12rpx; color: #8a5a16; background: #fff8e8; border: 2rpx solid #f0dcae; font-size: 18rpx; }
.production-amount-empty { margin: 0 22rpx 22rpx; padding: 18rpx; border-radius: 16rpx; color: #667085; background: #f7faf8; border: 2rpx solid #dfebe3; font-size: 18rpx; line-height: 1.5; }
.term-example { display: flex; flex-wrap: wrap; gap: 7rpx; margin-top: 12rpx; padding: 12rpx; border-radius: 10rpx; background: #fff; }
.term-example text { font-size: 17rpx; color: #5f5849; }
.term-example text:first-child { width: 100%; color: #9a6410; font-weight: 800; }
.amount-box { margin: 0 22rpx 22rpx; padding: 17rpx; border-radius: 16rpx; background: #f7faf8; border: 2rpx solid #dfebe3; }
.amount-head { display: flex; justify-content: space-between; padding-bottom: 10rpx; border-bottom: 2rpx solid #e7eee9; }
.amount-head text:first-child { font-size: 22rpx; font-weight: 850; }
.amount-head text:last-child { color: #16884c; font-size: 20rpx; font-weight: 800; }
.amount-row { display: grid; grid-template-columns: 1fr .8fr 1.8fr; gap: 7rpx; padding: 10rpx 0; border-bottom: 1rpx dashed #dfe7e2; }
.amount-row text { font-size: 17rpx; color: #5f6c65; line-height: 1.4; }
.amount-row text:nth-child(2) { text-align: right; color: #1f2d26; font-weight: 750; }
</style>
