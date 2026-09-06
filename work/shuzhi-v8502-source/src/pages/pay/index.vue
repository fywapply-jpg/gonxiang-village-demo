<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { payMethods, requestPay } from "@/utils/pay";
import { useAuthStore } from "@/store/auth";
import { useUserStore } from "@/store/user";
import { useTradeStore } from "@/store/trade";
import { createEscrowPayment, recordPlatformEvent } from "@/services/localApi";
const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const auth = useAuthStore();
const user = useUserStore();
const trade = useTradeStore();

type PlanKey = "advance" | "custody" | "cod" | "credit";
const STEP_UP_AMOUNT = 30000; // 增强核验提示参数，不是法定统一阈值；正式阈值由合作金融机构与企业权限规则配置
const order = ref({ title: "订单支付", amount: 0, no: "" });
const scene = ref("general");
const method = ref("wechat");
const planKey = ref<PlanKey>("custody");
onLoad((q) => {
  scene.value = q?.scene || "general";
  method.value = scene.value === "b2b" ? "bank" : "wechat";
  const term = q?.term || "";
  if (["advance", "custody", "cod", "credit"].includes(term)) planKey.value = term as PlanKey;
  const raw = Number(q?.amount);
  order.value = {
    title: q?.title ? decodeURIComponent(q.title) : "订单支付",
    amount: Number.isFinite(raw) ? raw : NaN,
    no: q?.no || ("O" + Date.now()),
  };
});

// 金额校验：必须为正、有限、且不超过单笔上限（防篡改/溢出）
const validAmount = computed(() => Number.isFinite(order.value.amount) && order.value.amount > 0 && order.value.amount <= 100000000);
const isB2B = computed(() => scene.value === "b2b");
const plans = [
  { key: "advance" as PlanKey, name: "30%预付款", ratio: 0.3, action: "支付预付款", desc: "签约后支付30%，验收后支付70%尾款；退款与用途按合同" },
  { key: "custody" as PlanKey, name: "机构监管结算", ratio: 1, action: "查看机构结算指引", desc: "采购方按已签约机构付款指引支付，机构按合同验收节点执行结算" },
  { key: "cod" as PlanKey, name: "验收即付", ratio: 0, action: "生成到货付款计划", desc: "现在不扣款；验收合格当日或合同约定T+2内付款" },
  { key: "credit" as PlanKey, name: "授信账期", ratio: 0, action: "提交账期审批", desc: "现在不扣款；先审批买方额度，再确定起算日和具体到期日" },
];
const plan = computed(() => plans.find((item) => item.key === planKey.value) || plans[1]);
const payableNow = computed(() => Math.round(order.value.amount * plan.value.ratio * 100) / 100);
const isDeferred = computed(() => isB2B.value && payableNow.value === 0);
const usesSettlementSimulator = computed(() => isB2B.value && planKey.value === "custody");
const isBig = computed(() => payableNow.value >= STEP_UP_AMOUNT);
const availableMethods = computed(() =>
  isB2B.value ? payMethods.filter((m) => m.key === "bank" || m.key === "dcep") : payMethods,
);
const paying = ref(false);
const faceIntent = ref(false);

// 大额人脸核验后返回自动续付
onShow(() => { if (faceIntent.value && auth.consumeFace("pay")) { faceIntent.value = false; doPay(); } });

function pay() {
  void recordPlatformEvent("finance", "SUBMIT_PAYMENT_INTENT", { order_no: order.value.no, scene: scene.value, plan: planKey.value, amount: order.value.amount }).catch(() => {});
  if (!validAmount.value) return uni.showToast({ title: "支付金额异常，已拦截", icon: "none" });
  if (isB2B.value && !user.ensureTradeRole("B2B采购付款", "purchase")) return;
  if (productionBuild && usesSettlementSimulator.value) return submitProductionEscrow();
  if (productionBuild && isDeferred.value) {
    return uni.showModal({ title: "需后台支付结算", content: "正式环境验收付款计划和授信账期必须由后台按合同、机构产品和授权额度创建；当前未生成本地计划，也未执行扣款。", showCancel: false });
  }
  if (usesSettlementSimulator.value) {
    return uni.navigateTo({ url: `/pages/finance/settle?scenario=normal&order=${encodeURIComponent(order.value.no)}` });
  }
  if (isDeferred.value) return submitDeferred();
  if (isBig.value && !auth.consumeFace("pay")) {
    faceIntent.value = true;
    return uni.navigateTo({ url: "/pages/register/faceauth?scene=pay" });
  }
  doPay();
}
async function submitProductionEscrow() {
  if (!/^SZGS-/.test(order.value.no)) return uni.showModal({ title: "需正式订单", content: "请从后台已创建的正式订单进入托管入金，演示编号不能发起真实支付。", showCancel: false });
  if (paying.value) return;
  paying.value = true;
  try {
    await createEscrowPayment(order.value.no);
    uni.showModal({ title: "支付指令已提交", content: "持牌支付机构已受理托管入金指令，当前不是支付成功。请等待机构回调后在订单详情查看入金状态。", showCancel: false, confirmText: "知道了" });
  } catch (error) {
    uni.showModal({ title: "未执行扣款", content: (error as Error)?.message || "支付机构暂不可用，未执行扣款。", showCancel: false });
  } finally {
    paying.value = false;
  }
}
async function doPay() {
  if (paying.value) return; // 防重复提交
  paying.value = true;
  const r = await requestPay(method.value, { ...order.value, amount: payableNow.value });
  paying.value = false;
  if (r.ok) {
    trade.payOrder(order.value.no, plan.value.name);
    uni.redirectTo({
      url: `/pages/pay/result?ok=1&method=${r.method}&amount=${payableNow.value}&no=${order.value.no}&trade=${r.tradeNo}`,
    });
  } else {
    uni.showToast({ title: r.msg || "支付失败", icon: "none" });
  }
}
function submitDeferred() {
  const isCredit = planKey.value === "credit";
  uni.showModal({
    title: isCredit ? "提交账期审批" : "生成验收付款计划",
    confirmText: "确认提交",
    content: isCredit
      ? "本动作不代表付款成功，也不代表平台担保。系统将核验买方授信额度、账期天数、起算事件、到期日、增信方式和逾期责任；审批通过并写入CA合同后才可赊销。"
      : "本动作现在不扣款。合同须明确验收时限、异议方式和付款截止日；验收合格后由采购方同名对公账户按授权指令付款。",
    success: (r) => { if (r.confirm) { void recordPlatformEvent("finance", isCredit ? "SUBMIT_CREDIT_TERM" : "CREATE_DEFERRED_PAYMENT_PLAN", { order_no: order.value.no, amount: order.value.amount }).catch(() => {}); uni.showToast({ title: isCredit ? "已提交授信审批" : "付款计划已生成", icon: "success" }); } },
  });
}
</script>

<template>
  <view class="sg-page">
    <!-- 金额 -->
    <view class="amount-box" :class="{ bad: !validAmount }">
      <text class="a-t">{{ order.title }}</text>
      <text class="a-amt">{{ validAmount ? '¥' + order.amount.toLocaleString() : '金额异常' }}</text>
      <text class="a-no">订单号 {{ order.no }}</text>
    </view>
    <view v-if="!validAmount" class="err">⛔ 支付金额非法（非正数 / 非数字 / 超限），已拦截，请返回重新下单。</view>
    <view v-else-if="isBig" class="big">🔒 单次实际支付≥¥3万元将进入增强核验提示；这不是法定统一阈值，正式规则以合作金融机构风控和企业授权额度为准。</view>

    <view v-if="isB2B" class="corp-box">
      <view class="corp-row"><text class="corp-k">付款主体</text><text class="corp-v">{{ user.certOrg }} · 对公户名已匹配</text></view>
      <view class="corp-row"><text class="corp-k">资金通道</text><text class="corp-v">依合作银行/持牌支付机构实际产品、账户结构和协议执行</text></view>
      <view class="corp-row"><text class="corp-k">资金指令</text><text class="corp-v">合同号 + 订单号 + 身份快照号唯一绑定</text></view>
    </view>

    <view v-if="isB2B" class="sg-card plan-card">
      <text class="ct">先选合同结算模型</text>
      <view class="plan-list">
        <view v-for="item in plans" :key="item.key" class="plan" :class="{ on: planKey === item.key }" @tap="planKey = item.key">
          <view><text>{{ item.name }}</text><text>{{ item.desc }}</text></view>
          <view class="pm-radio" :class="{ on: planKey === item.key }">{{ planKey === item.key ? '●' : '' }}</view>
        </view>
      </view>
      <view class="pay-summary">
        <view><text>订单总额</text><text>¥{{ order.amount.toLocaleString() }}</text></view>
        <view><text>本次实际支付</text><text>¥{{ payableNow.toLocaleString() }}</text></view>
        <text>{{ plan.desc }}</text>
      </view>
    </view>

    <!-- 支付方式 -->
    <view v-if="!isDeferred" class="sg-card">
      <text class="ct">选择支付方式</text>
      <view class="pm" v-for="m in availableMethods" :key="m.key" @tap="method = m.key">
        <text class="pm-ic" :style="{ color: m.color }">{{ m.icon }}</text>
        <view class="pm-i"><text class="pm-n">{{ m.name }}</text><text class="pm-d">{{ m.desc }}</text></view>
        <view class="pm-radio" :class="{ on: method === m.key }">{{ method === m.key ? '●' : '' }}</view>
      </view>
    </view>

    <view class="safe">🔒 平台不接收货款、不设资金池、不做二清。直接对公付款、银行监管安排或支付机构服务，均须按对应持牌机构实际产品和协议执行；平台只提供订单信息、条件校验和经授权指令。</view>

    <view class="bar">
      <view class="bar-l"><text class="bl-1">{{ isDeferred ? '现在不扣款' : '本次应付' }}</text><text class="bl-2">{{ validAmount ? '¥' + payableNow.toLocaleString() : '—' }}</text></view>
      <view class="bar-btn" :class="{ dis: !validAmount || paying }" @tap="pay">{{ paying ? '处理中…' : usesSettlementSimulator ? '查看机构结算指引' : (isBig ? '🔒 增强核验后支付' : plan.action) }}</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.amount-box { background: linear-gradient(160deg, $sg-primary, $sg-primary-deep); padding: 50rpx 28rpx; display: flex; flex-direction: column; align-items: center; color: #fff; }
.amount-box.bad { background: linear-gradient(160deg, #d64541, #a5281c); }
.err { margin: 24rpx 24rpx 0; padding: 18rpx 20rpx; background: #fdeceb; border-left: 8rpx solid $sg-red; border-radius: $sg-radius; font-size: 22rpx; color: #a5281c; line-height: 1.5; }
.big { margin: 24rpx 24rpx 0; padding: 18rpx 20rpx; background: $sg-gold-light; border-left: 8rpx solid $sg-gold; border-radius: $sg-radius; font-size: 22rpx; color: #9a6a12; line-height: 1.5; }
.corp-box { margin: 24rpx 24rpx 0; padding: 8rpx 20rpx; background: #eef6ff; border: 2rpx solid #d6e8fb; border-radius: $sg-radius-lg; }
.corp-row { display: flex; padding: 14rpx 0; border-top: 2rpx solid rgba(43,108,176,.09); }
.corp-row:first-child { border-top: 0; }
.corp-k { width: 132rpx; font-size: 22rpx; color: $sg-text-3; }
.corp-v { flex: 1; font-size: 22rpx; color: #244d6d; line-height: 1.5; }
.plan-card { margin-top: 24rpx; }
.plan-list { margin-top: 8rpx; }
.plan { display: flex; align-items: center; padding: 18rpx 0; border-top: 2rpx solid $sg-border; }
.plan:first-child { border-top: 0; }
.plan > view:first-child { flex: 1; display: flex; flex-direction: column; }
.plan > view:first-child text:first-child { font-size: 25rpx; font-weight: 750; }
.plan > view:first-child text:last-child { margin-top: 3rpx; color: $sg-text-3; font-size: 19rpx; line-height: 1.45; }
.plan.on > view:first-child text:first-child { color: $sg-primary; }
.pay-summary { margin-top: 12rpx; padding: 16rpx; border-radius: $sg-radius; background: $sg-primary-light; }
.pay-summary view { display: flex; justify-content: space-between; margin-top: 7rpx; font-size: 22rpx; }
.pay-summary view:first-child { margin-top: 0; }
.pay-summary view text:last-child { font-weight: 800; color: $sg-primary; }
.pay-summary > text { display: block; margin-top: 10rpx; font-size: 18rpx; color: $sg-text-3; line-height: 1.5; }
.bar-btn.dis { opacity: 0.45; }
.a-t { font-size: 26rpx; opacity: 0.9; }
.a-amt { font-size: 72rpx; font-weight: 800; margin: 10rpx 0; }
.a-no { font-size: 21rpx; opacity: 0.8; }
.ct { font-size: 28rpx; font-weight: 700; display: block; margin-bottom: 8rpx; }
.pm { display: flex; align-items: center; padding: 24rpx 0; border-top: 2rpx solid $sg-border; }
.pm-ic { font-size: 44rpx; margin-right: 20rpx; }
.pm-i { flex: 1; display: flex; flex-direction: column; }
.pm-n { font-size: 28rpx; font-weight: 600; }
.pm-d { font-size: 21rpx; color: $sg-text-3; margin-top: 4rpx; }
.pm-radio { width: 42rpx; height: 42rpx; border-radius: 50%; border: 2rpx solid $sg-border; color: $sg-primary; display: flex; align-items: center; justify-content: center; font-size: 30rpx; }
.pm-radio.on { border-color: $sg-primary; }
.safe { margin: 24rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; display: flex; align-items: center; gap: 20rpx; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.05); }
.bar-l { flex: 1; display: flex; align-items: baseline; }
.bl-1 { font-size: 24rpx; color: $sg-text-3; margin-right: 8rpx; }
.bl-2 { font-size: 40rpx; font-weight: 800; color: $sg-red; }
.bar-btn { flex: 0 0 44%; text-align: center; padding: 26rpx 0; border-radius: 999rpx; font-size: 30rpx; font-weight: 700; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; }
</style>
