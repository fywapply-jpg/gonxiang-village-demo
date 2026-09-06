<script setup lang="ts">
import { ref, computed } from "vue";
import { mainBankOf } from "@/mock/mainbank";
const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const bank = mainBankOf("保理");
function viewBid() { uni.navigateTo({ url: "/pages/finance/bankbid" }); }

// 应收账款（可保理）
const ars = ref([
  { id: "AR001", buyer: "沪上团餐中央厨房", amount: 68, days: 60, left: 42, status: "可保理" },
  { id: "AR002", buyer: "锦华连锁生鲜", amount: 32, days: 45, left: 20, status: "保理中" },
  { id: "AR003", buyer: "京客隆商贸", amount: 120, days: 90, left: 75, status: "可保理" },
  { id: "AR004", buyer: "盒马鲜生天津仓", amount: 45, days: 30, left: 0, status: "已结清" },
]);
const totalAR = computed(() => ars.value.filter((a) => a.status !== "已结清").reduce((s, a) => s + a.amount, 0));
const financed = 32;
const statusColor: Record<string, string> = { 可保理: "#16884c", 保理中: "#d99a2b", 已结清: "#9aa0aa" };

// 保理类型
const types = [
  { n: "正向保理", d: "供应商转让应收账款，快速回款", icon: "➡️" },
  { n: "反向保理", d: "核心买方增信，上游批量融资", icon: "⬅️" },
  { n: "池保理", d: "多笔应收账款打包融资", icon: "🗂️" },
];

// 保理流程
const flow = [
  { t: "上传应收账款", d: "合同/发票/签收单上链核验" },
  { t: "买方对账确认", d: "确认基础交易、验收、金额和到期日；不替代保理机构独立审查" },
  { t: "保理机构审查核额", d: "按买方信用、债权质量和追索安排核定额度，示例上限80%" },
  { t: "融资放款", d: "审批通过并签署书面保理合同后，按机构时效放款至供应商账户" },
  { t: "转让通知与到期付款", d: "依法依约通知买方，买方付款至保理合同指定账户，不进入平台账户" },
  { t: "合同结算", d: "由保理机构按合同处理融资本息、费用和剩余款项，形成回单" },
];
const cur = ref(0);
const running = ref(false);
function runFlow() { running.value = true; cur.value = 0; const t = setInterval(() => { cur.value++; if (cur.value >= flow.length) clearInterval(t); }, 500); }

function apply(a: any) {
  if (productionBuild) return uni.showModal({ title: "需要保理机构接入", content: "正式环境的应收账款保理必须由持牌机构完成确权、授信、签约和放款回执，当前未提交保理申请。", showCancel: false });
  if (a.status !== "可保理") return uni.showToast({ title: a.status === "保理中" ? "该笔已在保理中" : "该笔已结清", icon: "none" });
  uni.showModal({
    title: "申请应收账款保理",
    content: `买方「${a.buyer}」\n应收 ¥${a.amount} 万 · 账期剩 ${a.left} 天\n参考额度上限：¥${(a.amount * 0.8).toFixed(1)} 万\n参考综合费率 4.5%~6.5%\n\n最终额度、费率、放款时效及有无追索权，以保理机构审查和书面合同为准。`,
    confirmText: "确认申请",
    success: (r) => { if (r.confirm) { a.status = "保理中"; uni.showToast({ title: "保理申请已提交", icon: "success" }); } },
  });
}
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty"><text class="production-empty-title">暂无后台保理档案</text><text class="production-empty-text">正式环境只展示持牌保理机构返回的应收账款、确权、授信和放款状态；本地保理案例不会混入生产数据。</text></view>
    <template v-else>
    <view class="hero">
      <text class="ht">应收账款保理</text>
      <text class="hs">转让应收账款 · 提前回款 · 缓解账期压力</text>
      <view class="kpis">
        <view class="k"><text class="kn">¥{{ totalAR }}万</text><text class="kl">可保理应收</text></view>
        <view class="k"><text class="kn">¥{{ financed }}万</text><text class="kl">已融资</text></view>
        <view class="k"><text class="kn">4.5%起</text><text class="kl">综合费率</text></view>
      </view>
    </view>

    <view class="mainbank" @tap="viewBid">
      <view class="mb-badge">{{ bank.short }}</view>
      <view class="mb-i"><text class="mb-t">本业务由「{{ bank.name }}」主办行承接</text><text class="mb-s">经银行竞标择优 · 授信/放款/回款/风控行内闭环</text></view>
      <text class="mb-go">竞标详情 ›</text>
    </view>

    <!-- 保理类型 -->
    <view class="sec">保理业务类型</view>
    <view class="types">
      <view class="type" v-for="t in types" :key="t.n">
        <text class="ty-ic">{{ t.icon }}</text>
        <text class="ty-n">{{ t.n }}</text>
        <text class="ty-d">{{ t.d }}</text>
      </view>
    </view>

    <!-- 我的应收账款 -->
    <view class="sec">我的应收账款</view>
    <view class="ar" v-for="a in ars" :key="a.id">
      <view class="ar-top">
        <text class="ar-buyer">{{ a.buyer }}</text>
        <text class="ar-st" :style="{ color: statusColor[a.status] }">{{ a.status }}</text>
      </view>
      <view class="ar-mid">
        <view class="ar-amt"><text class="ar-n">¥{{ a.amount }}</text><text class="ar-u">万</text></view>
        <text class="ar-days">账期 {{ a.days }} 天{{ a.left > 0 ? ' · 剩 ' + a.left + ' 天' : ' · 已到期' }}</text>
      </view>
      <view class="ar-foot">
        <text class="ar-can">可融资 ¥{{ (a.amount * 0.8).toFixed(1) }} 万（80%）</text>
        <view class="ar-btn" :class="{ dis: a.status !== '可保理' }" @tap="apply(a)">{{ a.status === '可保理' ? '申请保理' : a.status }}</view>
      </view>
    </view>

    <!-- 保理业务流程 -->
    <view class="sec-row"><text class="sec">保理业务流程</text><text class="demo" @tap="runFlow">核验流程</text></view>
    <view class="sg-card">
      <view class="fl" v-for="(f, i) in flow" :key="i" :class="{ on: running && cur > i }">
        <view class="fl-axis"><view class="fl-dot" :class="{ on: running && cur > i }">{{ running && cur > i ? '✓' : i + 1 }}</view><view v-if="i < flow.length - 1" class="fl-line" :class="{ on: running && cur > i + 1 }"></view></view>
        <view class="fl-i"><text class="fl-t">{{ f.t }}</text><text class="fl-d">{{ f.d }}</text></view>
      </view>
      <view v-if="running && cur >= flow.length" class="fl-done">✅ 保理流程核验完成：应收账款获得融资安排；是否有追索、坏账由谁承担，以保理合同为准</view>
    </view>

    <view class="tip">🔗 平台归集合同、验收、发票、对账和转让通知等证据，辅助识别重复融资与虚假贸易，但不作融资承诺；保理合同、放款、回款和追索由依法开展业务的机构办理，平台不触碰资金。</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.mainbank { display: flex; align-items: center; margin: 20rpx 24rpx 0; padding: 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #fff6e6, #fff); border: 2rpx solid #f0dcae; box-shadow: $sg-shadow; }
.mb-badge { width: 68rpx; height: 68rpx; border-radius: 18rpx; background: linear-gradient(135deg, #d99a2b, #c8871f); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 800; margin-right: 16rpx; }
.mb-i { flex: 1; display: flex; flex-direction: column; }
.mb-t { font-size: 25rpx; font-weight: 700; }
.mb-s { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.mb-go { font-size: 22rpx; color: #c8871f; }
.hero { background: linear-gradient(160deg, $sg-gold, #c8871f); padding: 40rpx 28rpx 30rpx; color: #fff; }
.ht { font-size: 36rpx; font-weight: 800; }
.hs { font-size: 22rpx; opacity: 0.95; margin-top: 8rpx; display: block; }
.kpis { display: flex; margin-top: 26rpx; }
.k { flex: 1; text-align: center; }
.kn { font-size: 36rpx; font-weight: 800; display: block; }
.kl { font-size: 20rpx; opacity: 0.9; }
.sec { font-size: 30rpx; font-weight: 700; padding: 26rpx 28rpx 12rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 24rpx; }
.demo { font-size: 24rpx; color: $sg-gold; background: $sg-gold-light; padding: 8rpx 22rpx; border-radius: 999rpx; }
.types { display: flex; gap: 16rpx; padding: 0 24rpx; }
.type { flex: 1; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx 14rpx; display: flex; flex-direction: column; align-items: center; }
.ty-ic { font-size: 40rpx; }
.ty-n { font-size: 24rpx; font-weight: 700; margin-top: 8rpx; }
.ty-d { font-size: 19rpx; color: $sg-text-3; text-align: center; margin-top: 6rpx; }
.ar { background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 16rpx; padding: 24rpx; }
.ar-top { display: flex; align-items: center; justify-content: space-between; }
.ar-buyer { font-size: 28rpx; font-weight: 700; }
.ar-st { font-size: 24rpx; font-weight: 700; }
.ar-mid { display: flex; align-items: baseline; justify-content: space-between; margin: 12rpx 0; }
.ar-amt { display: flex; align-items: baseline; }
.ar-n { font-size: 40rpx; font-weight: 800; color: $sg-red; }
.ar-u { font-size: 22rpx; color: $sg-text-3; }
.ar-days { font-size: 22rpx; color: $sg-text-3; }
.ar-foot { display: flex; align-items: center; justify-content: space-between; padding-top: 14rpx; border-top: 2rpx solid $sg-border; }
.ar-can { font-size: 22rpx; color: $sg-gold; }
.ar-btn { padding: 14rpx 30rpx; border-radius: 999rpx; background: $sg-gold; color: #fff; font-size: 25rpx; font-weight: 600; }
.ar-btn.dis { background: $sg-bg; color: $sg-text-3; }
.fl { display: flex; opacity: 0.5; transition: opacity 0.3s; }
.fl.on { opacity: 1; }
.fl-axis { display: flex; flex-direction: column; align-items: center; margin-right: 20rpx; }
.fl-dot { width: 46rpx; height: 46rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; }
.fl-dot.on { background: $sg-gold; }
.fl-line { flex: 1; width: 4rpx; background: $sg-border; min-height: 26rpx; margin: 4rpx 0; }
.fl-line.on { background: $sg-gold; }
.fl-i { flex: 1; display: flex; flex-direction: column; padding-bottom: 24rpx; }
.fl-t { font-size: 26rpx; font-weight: 600; }
.fl-d { font-size: 21rpx; color: $sg-text-3; margin-top: 2rpx; }
.fl-done { font-size: 23rpx; color: #c8871f; background: $sg-gold-light; padding: 16rpx; border-radius: $sg-radius; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
</style>
