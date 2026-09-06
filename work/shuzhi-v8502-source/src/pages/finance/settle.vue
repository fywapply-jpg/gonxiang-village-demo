<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import {
  createSimulation,
  demoTransaction,
  scenarioOptions,
  type LedgerState,
  type ScenarioKey,
  type SimulationSession,
} from "@/services/settlementEngine";
import { recordPlatformEvent } from "@/services/localApi";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const productionBlocked = () => uni.showModal({ title: "需后台机构结算", content: "正式环境结算进度只能来自持牌机构回调和后台对账结果；当前页面为流程展示，不会推进资金状态。", showCancel: false });

const STORAGE_KEY = "shuzhi-settlement-v8533";
const session = ref<SimulationSession>(createSimulation("normal"));
let timer: ReturnType<typeof setInterval> | undefined;

const emptyLedger: LedgerState = {
  buyerPaid: 0,
  institutionPending: 0,
  released: 0,
  disputed: 0,
  refunded: 0,
  platformBalance: 0,
};
const active = computed(() => session.value.cursor >= 0 ? session.value.steps[session.value.cursor] : null);
const ledger = computed(() => active.value?.ledger || emptyLedger);
const progress = computed(() => Math.round(((session.value.cursor + 1) / session.value.steps.length) * 100));
const finished = computed(() => session.value.cursor >= session.value.steps.length - 1);
const logs = computed(() => session.value.steps.slice(0, session.value.cursor + 1).map((item, index) => ({
  ...item,
  time: `15:${String(40 + index).padStart(2, "0")}:${String((index * 7) % 60).padStart(2, "0")}`,
})).reverse());
const reconciliationOk = computed(() =>
  ledger.value.buyerPaid === ledger.value.institutionPending + ledger.value.released + ledger.value.refunded
  && ledger.value.platformBalance === 0,
);

const lineItems = [
  { name: "农产品货款", amount: 275644, receiver: "供货方", invoice: "农产品销售" },
  { name: "合同服务费用", amount: 356, receiver: "实际服务方（按合同拆分）", invoice: "包装/物流/检测服务" },
  { name: "平台技术服务", amount: 11025.76, receiver: "平台运营方", invoice: "商品净额×4%，单独结算" },
];

const accountChecks = [
  ["采购主体", demoTransaction.buyer, "已核验"],
  ["付款账户", demoTransaction.buyerAccount, "同名"],
  ["供货主体", demoTransaction.supplier, "已核验"],
  ["收款账户", demoTransaction.supplierAccount, "同名"],
  ["机构产品", demoTransaction.institution, "待生产接入"],
  ["平台货款账户", "不设置", "余额 ¥0"],
];

function persist() {
  uni.setStorageSync(STORAGE_KEY, {
    scenario: session.value.scenario,
    cursor: session.value.cursor,
  });
}
function selectScenario(key: ScenarioKey) {
  if (productionBuild) return productionBlocked();
  stop();
  session.value = createSimulation(key);
  persist();
  void recordPlatformEvent("finance", "SELECT_SETTLEMENT_SCENARIO", { scenario: key }).catch(() => {});
}
function next() {
  if (productionBuild) return productionBlocked();
  if (finished.value) return uni.showToast({ title: "本笔交易已经关账", icon: "none" });
  session.value.cursor += 1;
  void recordPlatformEvent("finance", "ADVANCE_SETTLEMENT", { scenario: session.value.scenario, step: session.value.cursor }).catch(() => {});
  persist();
  if (finished.value) uni.showToast({ title: "交易与资金对账完成", icon: "success" });
}
function runAll() {
  if (productionBuild) return productionBlocked();
  if (session.value.running) return stop();
  if (finished.value) session.value.cursor = -1;
  session.value.running = true;
  timer = setInterval(() => {
    if (finished.value) {
      stop();
      uni.showToast({ title: "结算核验已完成", icon: "success" });
      return;
    }
    session.value.cursor += 1;
    persist();
  }, 620);
}
function stop() {
  if (timer) clearInterval(timer);
  timer = undefined;
  session.value.running = false;
}
function reset() {
  if (productionBuild) return productionBlocked();
  stop();
  session.value = createSimulation(session.value.scenario);
  persist();
  void recordPlatformEvent("finance", "RESET_SETTLEMENT", { scenario: session.value.scenario }).catch(() => {});
}
function money(value: number) {
  return "¥" + value.toLocaleString();
}
function copyReceipt() {
  const text = [
    `数智供社 v8533 交易回单摘要`,
    `订单：${demoTransaction.orderNo}`,
    `合同：${demoTransaction.contractNo}`,
    `机构交易号：${demoTransaction.institutionTradeNo}`,
    `订单金额：${money(demoTransaction.amount)}`,
    `机构待处理：${money(ledger.value.institutionPending)}`,
    `已结算：${money(ledger.value.released)}`,
    `已退款：${money(ledger.value.refunded)}`,
    `平台货款余额：${money(ledger.value.platformBalance)}`,
    `状态：${active.value?.businessStatus || "尚未开始"}`,
  ].join("\n");
  uni.setClipboardData({ data: text, success: () => uni.showToast({ title: "回单摘要已复制", icon: "success" }) });
}

onLoad((query) => {
  const requested = query?.scenario as ScenarioKey | undefined;
  if (requested && scenarioOptions.some((item) => item.key === requested)) {
    session.value = createSimulation(requested);
    return;
  }
  const saved = uni.getStorageSync(STORAGE_KEY);
  if (saved?.scenario && scenarioOptions.some((item) => item.key === saved.scenario)) {
    session.value = createSimulation(saved.scenario);
    const cursor = Number(saved.cursor);
    if (Number.isInteger(cursor)) session.value.cursor = Math.max(-1, Math.min(cursor, session.value.steps.length - 1));
  }
});
onUnmounted(stop);
</script>

<template>
  <view class="sg-page settle-page">
    <view v-if="productionBuild" class="production-empty">
      <text class="production-empty-title">暂无后台结算流水</text>
      <text class="production-empty-text">正式环境的订单、CA 合同、托管入金、验收、发票、退款和三账对账结果，只能由后台及持牌机构回执返回。本页不展示本地演示订单，也不会在前台推进资金状态。</text>
    </view>
    <template v-else>
    <view class="hero">
      <view class="hero-top">
        <view class="live"><text></text><text>机构结算接入</text></view>
        <text>数智供社 v8533</text>
      </view>
      <text class="hero-title">交易支付与机构结算</text>
      <text class="hero-sub">按订单、CA合同、机构支付、履约验收、结算退款和三账对账核验业务条件。未接入生产机构前只生成办理准备，不会扣款。</text>
      <view class="hero-kpis">
        <view><text>订单金额</text><text>{{ money(demoTransaction.amount) }}</text></view>
        <view><text>执行进度</text><text>{{ progress }}%</text></view>
        <view><text>平台货款</text><text>¥0</text></view>
      </view>
      <view class="progress"><view :style="{ width: progress + '%' }"></view></view>
      <view class="hero-actions">
        <view class="primary" @tap="runAll">{{ session.running ? "暂停核验" : finished ? "重新核验本单" : "开始结算核验" }}</view>
        <view class="secondary" @tap="next">执行下一步</view>
      </view>
    </view>

    <view class="notice">
      <text>机构接入边界</text>
      <text>正式上线必须使用已签约机构真实API、证书、回调地址和产品协议；未签约、未验签、未对账前不得展示为真实监管账户或付款成功。</text>
    </view>

    <view class="section-head">
      <view><text>选择交易场景</text><text>按正常流程和三类高风险异常核验结算条件</text></view>
      <text @tap="reset">重置本场景</text>
    </view>
    <scroll-view scroll-x class="scenario-scroll">
      <view class="scenario-row">
        <view v-for="item in scenarioOptions" :key="item.key" class="scenario"
          :class="{ on: session.scenario === item.key }" @tap="selectScenario(item.key)">
          <text>{{ item.name }}</text><text>{{ item.desc }}</text>
        </view>
      </view>
    </scroll-view>

    <view class="order-card">
      <view class="order-head">
        <view><text>实时交易单</text><text>{{ demoTransaction.orderNo }}</text></view>
        <text>{{ active?.businessStatus || "待开始核验" }}</text>
      </view>
      <view class="order-grid">
        <view><text>CA合同</text><text>{{ demoTransaction.contractNo }}</text></view>
        <view><text>支付指令</text><text>{{ demoTransaction.instructionNo }}</text></view>
        <view><text>采购方</text><text>{{ demoTransaction.buyer }}</text></view>
        <view><text>供货方</text><text>{{ demoTransaction.supplier }}</text></view>
      </view>
      <view class="current" :class="active?.level">
        <view class="current-no">{{ session.cursor < 0 ? "—" : session.cursor + 1 }}</view>
        <view>
          <text>{{ active?.title || "点击“开始结算核验”办理" }}</text>
          <text>{{ active?.response || "系统将逐步生成真实形态的请求、回调、回单、台账和证据编号。" }}</text>
        </view>
      </view>
    </view>

    <view class="section-head">
      <view><text>实时资金台账</text><text>金额守恒：采购方付款 = 机构待处理 + 已结算 + 已退款</text></view>
      <text :class="{ bad: !reconciliationOk }">{{ reconciliationOk ? "账平" : "待核" }}</text>
    </view>
    <view class="ledger">
      <view><text>采购方已付</text><text>{{ money(ledger.buyerPaid) }}</text></view>
      <view><text>机构待处理</text><text class="blue">{{ money(ledger.institutionPending) }}</text></view>
      <view><text>已结算</text><text class="green">{{ money(ledger.released) }}</text></view>
      <view><text>争议金额</text><text class="orange">{{ money(ledger.disputed) }}</text></view>
      <view><text>已原路退款</text><text>{{ money(ledger.refunded) }}</text></view>
      <view class="platform"><text>平台货款余额</text><text>{{ money(ledger.platformBalance) }}</text></view>
    </view>

    <view class="section-head">
      <view><text>机构网关请求与响应</text><text>展示生产接入时后端真正需要校验的内容</text></view>
    </view>
    <view class="gateway">
      <view class="gateway-head">
        <view><text></text><text>机构结算通道</text></view>
        <text>{{ active ? "200 / 已处理" : "等待请求" }}</text>
      </view>
      <view class="gateway-row"><text>执行主体</text><text>{{ active?.actor || "—" }}</text></view>
      <view class="gateway-row"><text>请求摘要</text><text>{{ active?.request || "—" }}</text></view>
      <view class="gateway-row"><text>响应结果</text><text>{{ active?.response || "—" }}</text></view>
      <view class="gateway-row"><text>资金状态</text><text>{{ active?.fundStatus || "未发生资金" }}</text></view>
      <view class="gateway-row"><text>证据编号</text><text class="mono">{{ active?.evidence || "—" }}</text></view>
      <view class="gateway-control"><text>控制校验</text><text>{{ active?.control || "等待执行后显示本步骤控制点" }}</text></view>
    </view>

    <view class="section-head">
      <view><text>主体与账户白名单</text><text>付款、收款、结算和账户变更都受同一身份快照约束</text></view>
    </view>
    <view class="checks">
      <view v-for="item in accountChecks" :key="item[0]">
        <text>{{ item[0] }}</text><text>{{ item[1] }}</text><text>{{ item[2] }}</text>
      </view>
    </view>

    <view class="section-head">
      <view><text>订单金额与真实收款主体</text><text>每一项费用都有合同依据、服务事实和票据口径</text></view>
    </view>
    <view class="items">
      <view v-for="item in lineItems" :key="item.name">
        <view><text>{{ item.name }}</text><text>{{ item.receiver }}</text></view>
        <view><text>{{ money(item.amount) }}</text><text>{{ item.invoice }}</text></view>
      </view>
      <view class="items-total"><text>订单应付合计（不含平台技术服务）</text><text>{{ money(demoTransaction.amount) }}</text></view>
      <view class="items-total fee-total"><text>平台技术服务（结算单列）</text><text>{{ money(11025.76) }}</text></view>
    </view>

    <view class="section-head">
      <view><text>不可篡改的业务事件日志</text><text>事件按发生顺序记录，失败和拦截也必须保留</text></view>
    </view>
    <view v-if="logs.length" class="logs">
      <view v-for="item in logs" :key="item.key" class="log" :class="item.level">
        <view><text>{{ item.time }}</text><text>{{ item.title }}</text><text>{{ item.level === "blocked" ? "已拦截" : item.level === "warning" ? "需关注" : "通过" }}</text></view>
        <text>{{ item.response }}</text>
        <text>{{ item.evidence }}</text>
      </view>
    </view>
    <view v-else class="empty">尚未生成事件。选择场景后点击“开始结算核验”。</view>

    <view class="receipt" @tap="copyReceipt">
      <view><text>交易回单摘要</text><text>{{ finished ? "交易已经关账，可复制结果" : "随核验进度实时更新" }}</text></view>
      <text>复制 ›</text>
    </view>

    <view class="prod-note">
      <text>接入真实银行/持牌机构的四个条件</text>
      <view><text>1</text><text>将仿真通道替换为合作机构生产 API 和双向证书</text></view>
      <view><text>2</text><text>机构独立完成商户尽调、账户开立/绑定和支付服务协议</text></view>
      <view><text>3</text><text>生产回调进入平台后端消息队列，验签、查单、幂等后才更新订单</text></view>
      <view><text>4</text><text>每日自动三账对账，差异进入人工复核，任何系统不得自动补扣</text></view>
    </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.settle-page { padding-bottom: 42rpx; background: #eef2f5; }
.production-empty { margin: 40rpx 24rpx; padding: 34rpx 28rpx; border: 2rpx solid #d8e7de; border-radius: 22rpx; background: #f7fbf8; }
.production-empty-title { display: block; color: #145d3c; font-size: 32rpx; font-weight: 900; }
.production-empty-text { display: block; margin-top: 16rpx; color: #5e7167; font-size: 24rpx; line-height: 1.7; }
.hero { padding: 30rpx 24rpx 27rpx; color: #fff; background: linear-gradient(145deg, #092f49, #0c4d6c 54%, #146a4a); border-radius: 0 0 30rpx 30rpx; }
.hero-top { display: flex; align-items: center; justify-content: space-between; font-size: 18rpx; opacity: .9; }
.live { display: flex; align-items: center; gap: 8rpx; padding: 6rpx 12rpx; border-radius: 999rpx; background: rgba(255,255,255,.12); }
.live text:first-child { width: 12rpx; height: 12rpx; border-radius: 50%; background: #64e79b; box-shadow: 0 0 0 6rpx rgba(100,231,155,.14); }
.hero-title { display: block; margin-top: 17rpx; font-size: 38rpx; font-weight: 900; }
.hero-sub { display: block; margin-top: 8rpx; font-size: 20rpx; line-height: 1.6; opacity: .9; }
.hero-kpis { display: grid; grid-template-columns: 1.35fr 1fr 1fr; gap: 9rpx; margin-top: 19rpx; }
.hero-kpis view { padding: 13rpx; border-radius: 13rpx; background: rgba(255,255,255,.1); display: flex; flex-direction: column; }
.hero-kpis text:first-child { font-size: 16rpx; opacity: .7; }
.hero-kpis text:last-child { margin-top: 3rpx; font-size: 25rpx; font-weight: 900; }
.progress { height: 8rpx; margin-top: 15rpx; border-radius: 99rpx; overflow: hidden; background: rgba(255,255,255,.14); }
.progress view { height: 100%; background: linear-gradient(90deg, #f4c75b, #72e5a3); transition: width .3s; }
.hero-actions { display: flex; gap: 10rpx; margin-top: 17rpx; }
.hero-actions view { padding: 16rpx; border-radius: 999rpx; text-align: center; font-size: 21rpx; font-weight: 800; }
.hero-actions .primary { flex: 1.4; color: #103d53; background: #fff; }
.hero-actions .secondary { flex: 1; border: 2rpx solid rgba(255,255,255,.35); background: rgba(255,255,255,.08); }
.notice { margin: 16rpx 24rpx 0; padding: 16rpx 18rpx; border: 2rpx solid #f0d494; border-radius: 16rpx; background: #fff8e6; }
.notice text:first-child { display: block; color: #9a6410; font-size: 20rpx; font-weight: 850; }
.notice text:last-child { display: block; margin-top: 4rpx; color: #735f3c; font-size: 18rpx; line-height: 1.55; }
.section-head { display: flex; align-items: center; padding: 23rpx 24rpx 11rpx; }
.section-head > view { flex: 1; display: flex; flex-direction: column; }
.section-head > view text:first-child { color: #172b3a; font-size: 27rpx; font-weight: 900; }
.section-head > view text:last-child { margin-top: 2rpx; color: #77848d; font-size: 17rpx; line-height: 1.4; }
.section-head > text { padding: 7rpx 12rpx; border-radius: 999rpx; color: #176a4b; background: #e4f4eb; font-size: 17rpx; font-weight: 750; }
.section-head > text.bad { color: #a6382e; background: #fde8e5; }
.scenario-scroll { white-space: nowrap; }
.scenario-row { display: inline-flex; gap: 10rpx; padding: 0 24rpx; }
.scenario { width: 190rpx; padding: 15rpx 16rpx; border: 2rpx solid transparent; border-radius: 15rpx; background: #fff; display: inline-flex; flex-direction: column; }
.scenario text:first-child { color: #253947; font-size: 21rpx; font-weight: 850; }
.scenario text:last-child { margin-top: 3rpx; color: #7b8790; font-size: 16rpx; }
.scenario.on { border-color: #2b7a9b; background: #eaf6fb; }
.scenario.on text:first-child { color: #155a78; }
.order-card, .gateway, .checks, .items, .logs { margin: 15rpx 24rpx 0; border-radius: 18rpx; background: #fff; box-shadow: 0 7rpx 22rpx rgba(32,56,70,.05); }
.order-card { padding: 18rpx; }
.order-head { display: flex; justify-content: space-between; gap: 12rpx; align-items: center; }
.order-head > view { display: flex; flex-direction: column; }
.order-head > view text:first-child { font-size: 23rpx; font-weight: 900; }
.order-head > view text:last-child { margin-top: 2rpx; color: #6c7b84; font-size: 17rpx; }
.order-head > text { padding: 6rpx 10rpx; border-radius: 999rpx; color: #176a4b; background: #e6f6ed; font-size: 17rpx; }
.order-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rpx; margin-top: 15rpx; overflow: hidden; border: 1rpx solid #e7ecef; border-radius: 12rpx; background: #e7ecef; }
.order-grid view { padding: 12rpx; background: #f9fbfc; display: flex; flex-direction: column; }
.order-grid text:first-child { color: #849099; font-size: 16rpx; }
.order-grid text:last-child { margin-top: 3rpx; color: #344955; font-size: 17rpx; line-height: 1.35; }
.current { display: flex; gap: 12rpx; margin-top: 15rpx; padding: 15rpx; border-radius: 13rpx; background: #edf7f2; }
.current.warning { background: #fff6df; }
.current.blocked { background: #fdeceb; }
.current-no { flex: none; width: 43rpx; height: 43rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; background: #176a4b; font-size: 18rpx; font-weight: 850; }
.current.warning .current-no { background: #c98717; }
.current.blocked .current-no { background: #c9453c; }
.current > view:last-child { display: flex; flex-direction: column; }
.current > view:last-child text:first-child { color: #20382f; font-size: 21rpx; font-weight: 850; }
.current > view:last-child text:last-child { margin-top: 4rpx; color: #617069; font-size: 17rpx; line-height: 1.45; }
.ledger { display: grid; grid-template-columns: 1fr 1fr; gap: 9rpx; margin: 0 24rpx; }
.ledger view { padding: 15rpx; border-radius: 14rpx; background: #fff; display: flex; flex-direction: column; }
.ledger text:first-child { color: #7b8790; font-size: 17rpx; }
.ledger text:last-child { margin-top: 4rpx; color: #273a46; font-size: 27rpx; font-weight: 900; }
.ledger text.blue { color: #2b6cb0; }
.ledger text.green { color: #16884c; }
.ledger text.orange { color: #c47a12; }
.ledger .platform { border: 2rpx solid #a9dfbf; background: #edf9f2; }
.ledger .platform text:last-child { color: #0f6b3b; }
.gateway { padding: 0 18rpx 18rpx; overflow: hidden; color: #dcecf4; background: #122b39; }
.gateway-head { display: flex; justify-content: space-between; align-items: center; padding: 15rpx 0; border-bottom: 1rpx solid rgba(255,255,255,.1); }
.gateway-head > view { display: flex; align-items: center; gap: 8rpx; }
.gateway-head > view text:first-child { width: 10rpx; height: 10rpx; border-radius: 50%; background: #69e29d; }
.gateway-head > view text:last-child { font-size: 19rpx; font-weight: 800; }
.gateway-head > text { color: #78e2a4; font-size: 16rpx; }
.gateway-row { display: grid; grid-template-columns: 110rpx 1fr; gap: 9rpx; padding: 10rpx 0; border-bottom: 1rpx solid rgba(255,255,255,.06); }
.gateway-row text:first-child { color: #8fa7b4; font-size: 16rpx; }
.gateway-row text:last-child { font-size: 17rpx; line-height: 1.45; }
.gateway-row .mono { color: #92d6f3; font-family: Menlo, monospace; }
.gateway-control { margin-top: 12rpx; padding: 12rpx; border-radius: 10rpx; background: rgba(86,194,145,.1); }
.gateway-control text:first-child { display: block; color: #70dba2; font-size: 16rpx; font-weight: 800; }
.gateway-control text:last-child { display: block; margin-top: 3rpx; font-size: 17rpx; line-height: 1.45; }
.checks { margin-top: 0; padding: 8rpx 18rpx; }
.checks > view { display: grid; grid-template-columns: 118rpx 1fr 92rpx; gap: 8rpx; padding: 12rpx 0; border-bottom: 1rpx solid #edf0f2; }
.checks > view:last-child { border-bottom: 0; }
.checks text { font-size: 17rpx; line-height: 1.4; }
.checks text:first-child { color: #7b8790; }
.checks text:nth-child(2) { color: #344955; }
.checks text:last-child { color: #16884c; text-align: right; font-weight: 800; }
.items { margin-top: 0; padding: 8rpx 18rpx; }
.items > view { display: flex; justify-content: space-between; gap: 10rpx; padding: 12rpx 0; border-bottom: 1rpx dashed #e2e7ea; }
.items > view > view { display: flex; flex-direction: column; }
.items > view > view:last-child { text-align: right; }
.items > view > view text:first-child { color: #344955; font-size: 18rpx; font-weight: 800; }
.items > view > view text:last-child { margin-top: 2rpx; color: #7b8790; font-size: 16rpx; }
.items .items-total { border-bottom: 0; color: #0f6b3b; font-size: 22rpx; font-weight: 900; }
.items .fee-total { color: #a8651c; }
.logs { margin-top: 0; padding: 8rpx 18rpx; }
.log { padding: 13rpx 0; border-bottom: 1rpx solid #edf0f2; }
.log:last-child { border-bottom: 0; }
.log > view { display: grid; grid-template-columns: 92rpx 1fr 75rpx; gap: 8rpx; }
.log > view text:first-child { color: #8a969d; font-size: 16rpx; font-family: Menlo, monospace; }
.log > view text:nth-child(2) { color: #263d49; font-size: 18rpx; font-weight: 850; }
.log > view text:last-child { color: #16884c; font-size: 16rpx; text-align: right; }
.log.warning > view text:last-child { color: #b37312; }
.log.blocked > view text:last-child { color: #c33f37; }
.log > text { display: block; margin: 5rpx 0 0 100rpx; color: #687780; font-size: 16rpx; line-height: 1.4; }
.log > text:last-child { color: #2b6cb0; font-family: Menlo, monospace; }
.empty { margin: 0 24rpx; padding: 28rpx 20rpx; border-radius: 16rpx; color: #859098; background: #fff; font-size: 18rpx; text-align: center; }
.receipt { display: flex; align-items: center; margin: 20rpx 24rpx 0; padding: 18rpx; border-radius: 17rpx; color: #fff; background: linear-gradient(135deg, #234f69, #176a4b); }
.receipt > view { flex: 1; display: flex; flex-direction: column; }
.receipt > view text:first-child { font-size: 22rpx; font-weight: 850; }
.receipt > view text:last-child { margin-top: 3rpx; font-size: 16rpx; opacity: .75; }
.receipt > text { font-size: 19rpx; font-weight: 800; }
.prod-note { margin: 19rpx 24rpx 0; padding: 18rpx; border: 2rpx solid #d5e5ec; border-radius: 17rpx; background: #f8fcfd; }
.prod-note > text { display: block; color: #214d62; font-size: 23rpx; font-weight: 900; }
.prod-note > view { display: flex; gap: 10rpx; margin-top: 11rpx; }
.prod-note > view text:first-child { flex: none; width: 32rpx; height: 32rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; background: #2b7a9b; font-size: 15rpx; }
.prod-note > view text:last-child { color: #586d78; font-size: 17rpx; line-height: 1.5; }
</style>
