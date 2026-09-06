<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { acceptTrade, getTrade, settleTrade } from "@/services/localApi";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const productionBlocked = (action: string) => uni.showModal({ title: "需后台履约接口", content: `正式环境${action}必须由后台写入订单、批次和证据，并由相应岗位授权；当前页面不会在本地推进状态。`, showCancel: false });

const contract = {
  no: "HT-2026-0781",
  pack: "CP-HT-2026-0781-V8533",
  supplier: "赣南脐橙合作社",
  buyer: "华中商贸采购中心",
  category: "脐橙 · 特级 · 70—80mm",
  amount: 276000,
  qty: 60,
  settleMode: "机构监管结算（本单示例）",
};

const milestones = [
  { n: 1, t: "合同包生效", owner: "买卖双方", proof: "主合同、质量附件及本单适用的支付授权完成CA签署", fund: "未入金", gate: "14份模板按业务触发，并非每笔订单机械签满；本单应签项必须完整" },
  { n: 2, t: "机构付款确认", owner: "采购方 + 主办银行", proof: "采购方同名对公账户付款，取得银行电子回单", fund: "¥276,000 由机构按本单产品保持待结算", gate: "第三方代付、个人账户、金额不一致全部拦截" },
  { n: 3, t: "锁货与出库", owner: "供货方 + 仓储质检", proof: "批次锁定、复检、称重、包装、出库影像", fund: "本单监管款按约保持待释放", gate: "换批、短装、检测不合格不得出库" },
  { n: 4, t: "运输交付", owner: "承运方 + 收货方", proof: "运单、轨迹、温控、交接人与到货时间", fund: "本单监管款按约保持待释放", gate: "失温、偏航、超时、异常开箱触发暂停和报案" },
  { n: 5, t: "验收与对账", owner: "采购方 + 供货方", proof: "复磅、抽检、影像、差异单、发票与对账单", fund: "正常部分待释放 / 差异部分冻结", gate: "采购方超时只催办，不自动视为无条件验收" },
  { n: 6, t: "银行结算闭环", owner: "资金指令岗 + 主办银行", proof: "四流核验、结算清单、分账指令和各方银行回单", fund: "银行直分 / 争议款持续冻结", gate: "合计不平、账户变更、无验收证据不得出款" },
];

const batches = ref([
  { no: "P01", weight: 22, status: "已验收", quality: "合格", temp: "达标", amount: 101200 },
  { no: "P02", weight: 20, status: "已验收", quality: "合格", temp: "达标", amount: 92000 },
  { no: "P03", weight: 18, status: "待验收", quality: "待抽检", temp: "达标", amount: 82800 },
]);
const current = ref(2);
const orderId = ref("SO-2026-08504");
const backendSync = ref("");
const backendReady = ref(!productionBuild);
const backendItems = ref<Array<{ id: number; qty: number }>>([]);
const settling = ref(false);
const normalAmount = computed(() => batches.value.filter((b) => b.status === "已验收").reduce((sum, b) => sum + b.amount, 0));
const frozenAmount = computed(() => contract.amount - normalAmount.value);
const percent = computed(() => Math.round((current.value / milestones.length) * 100));
const active = computed(() => milestones[current.value - 1]);

onLoad((q) => {
  if (q?.order) orderId.value = String(q.order);
  if (orderId.value.startsWith("SZGS-")) {
    getTrade(orderId.value).then((data) => {
      backendReady.value = true;
      backendItems.value = Array.isArray(data?.items) ? data.items.map((item: any) => ({ id: Number(item.id), qty: Number(item.qty) })) : [];
      backendSync.value = `后台订单：${data.status} · 资金：${data.payment_status} · 发票：${data.invoice_status}`;
    }).catch(() => { backendReady.value = false; backendSync.value = "后台状态暂不可读，请先完成登录授权"; });
  }
});

function money(value: number) {
  return value.toLocaleString();
}
function nextMilestone() {
  if (productionBuild) return productionBlocked("履约节点推进");
  if (current.value < milestones.length) {
    current.value += 1;
    uni.showToast({ title: `已推进至第${current.value}节点`, icon: "success" });
    return;
  }
  current.value = 1;
}
function checkBatch(batch: any) {
  if (batch.status === "已验收") {
    uni.showToast({ title: "该批证据已归档", icon: "none" });
    return;
  }
  uni.showModal({
    title: `到货验收 · ${batch.no}`,
    confirmText: "提交验收",
    content: `到货 ${batch.weight} 吨\n质量：${batch.quality}\n温控：${batch.temp}\n\n系统将归集复磅、抽检、温控、影像和签收证据。验收仅影响本批正常金额；发现差异时只冻结争议部分。`,
    success: (r) => {
      if (!r.confirm) return;
      const sync = orderId.value.startsWith("SZGS-");
      if (productionBuild && !sync) return productionBlocked("到货验收");
      if (sync) {
        const evidence = `批次 ${batch.no} 复磅+抽检+签收影像`;
        const allBatchesReady = batches.value.every((item) => item.no === batch.no || item.status === "已验收");
        if (!allBatchesReady) {
          batch.status = "已验收";
          batch.quality = "合格";
          backendSync.value = "本批证据已记录；待全部批次完成后一次性提交逐项验收";
          uni.showToast({ title: "本批证据已记录", icon: "success" });
          return;
        }
        if (!backendItems.value.length) {
          uni.showModal({ title: "验收未完成", content: "后台未返回订单明细，无法按商品明细逐项验收；请先刷新订单。", showCancel: false });
          return;
        }
        acceptTrade(orderId.value, evidence, undefined, backendItems.value.map((item) => ({ order_item_id: item.id, accepted_qty: item.qty, evidence }))).then(() => {
          batch.status = "已验收";
          batch.quality = "合格";
          backendSync.value = "后台状态：逐项验收合格，等待发票与结算";
          uni.showToast({ title: "后台已记录逐项验收", icon: "success" });
        }).catch((error: Error) => uni.showModal({ title: "验收未完成", content: error.message || "后台未接受验收", showCancel: false }));
        return;
      }
      batch.status = "已验收";
      batch.quality = "合格";
      uni.showToast({ title: "本批验收证据已归集", icon: "success" });
    },
  });
}
function settle() {
  if (orderId.value.startsWith("SZGS-")) {
    if (settling.value) return;
    settling.value = true;
    settleTrade(orderId.value).then((data: any) => {
      settling.value = false;
      backendSync.value = `后台状态：${data?.order?.status || "已完成"} · 资金已分账 · 四流三账已关账`;
      uni.showToast({ title: "后台已完成结算", icon: "success" });
    }).catch((error: Error) => {
      settling.value = false;
      uni.showModal({ title: "结算未放行", content: error.message || "请先完成合同、验收、发票和托管资金条件", showCancel: false });
    });
    return;
  }
  uni.showModal({
    title: "银行结算指令预校验",
    showCancel: false,
    confirmText: "知道了",
    content: `合同金额：¥${money(contract.amount)}\n当前正常待结：¥${money(normalAmount.value)}\n当前冻结：¥${money(frozenAmount.value)}\n\n放款前还需同时满足：合同有效、验收成立、发票合规、费用逐项可查、收款账户同名、分账合计等于本期应结金额。平台不接收交易货款。`,
  });
}
function contracts() {
  uni.navigateTo({ url: `/pages/trade/contracts?order=${encodeURIComponent(orderId.value)}` });
}
</script>

<template>
  <view class="sg-page fulfill-page">
    <view v-if="productionBuild && !backendReady" class="production-empty">
      <text class="production-empty-title">等待后台履约订单</text>
      <text class="production-empty-text">正式环境需要后台返回真实订单、批次和资金状态后才展示履约计划；本地履约示例不会混入生产数据。</text>
    </view>
    <template v-else>
    <view class="hero">
      <text class="hero-k">数智供社 v8533 · 合同 {{ contract.no }}</text>
      <text class="hero-t">合同履约计划与资金放行</text>
      <text class="hero-s">合同不是签完就结束：每个交付节点都要有责任人、时限、证据、异常闸门和资金结果。本页以“机构监管结算”订单为例，其他订单按所选模型执行。</text>
      <text v-if="backendSync" class="hero-sync">{{ backendSync }}</text>
      <view class="hero-progress">
        <view class="progress-text"><text>当前 {{ current }}/6 · {{ active.t }}</text><text>{{ percent }}%</text></view>
        <view class="progress-bar"><view :style="{ width: percent + '%' }"></view></view>
      </view>
      <view class="hero-btn" @tap="nextMilestone">{{ current === 6 ? "重新核验履约" : "推进下一履约节点" }}</view>
    </view>

    <view class="pack-entry" @tap="contracts">
      <view class="pack-icon">✍️</view>
      <view class="pack-main">
        <text class="pack-t">CA合同包 {{ contract.pack }}</text>
        <text class="pack-s">14份模板 · 18步映射 · 签署证据与放行条件完整</text>
      </view>
      <text class="pack-go">查看 ›</text>
    </view>

    <view class="sec">合同与履约基线</view>
    <view class="sg-card base-card">
      <view class="row"><text>买方</text><text>{{ contract.buyer }}</text></view>
      <view class="row"><text>卖方</text><text>{{ contract.supplier }}</text></view>
      <view class="row"><text>标的</text><text>{{ contract.category }} · {{ contract.qty }}吨</text></view>
      <view class="row"><text>合同金额</text><text class="amount">¥{{ money(contract.amount) }}</text></view>
      <view class="row"><text>结算模型</text><text>{{ contract.settleMode }}</text></view>
      <view class="row"><text>履约口径</text><text>分批交付、逐批验收、正常款释放、争议款冻结</text></view>
      <view class="row"><text>签约状态</text><text class="ok">企业CA验签通过 · 附件哈希一致</text></view>
    </view>

    <view class="sec">6个履约节点 · 逐项放行</view>
    <view class="timeline">
      <view v-for="item in milestones" :key="item.n" class="mile" :class="{ done: item.n < current, active: item.n === current }">
        <view class="mile-left">
          <view class="mile-dot">{{ item.n < current ? "✓" : item.n }}</view>
          <view v-if="item.n < milestones.length" class="mile-line"></view>
        </view>
        <view class="mile-card">
          <view class="mile-head"><text>{{ item.t }}</text><text>{{ item.n < current ? "已完成" : item.n === current ? "执行中" : "待前置" }}</text></view>
          <text class="mile-owner">责任主体：{{ item.owner }}</text>
          <view class="mile-box proof"><text>证据</text><text>{{ item.proof }}</text></view>
          <view class="mile-box fund"><text>资金</text><text>{{ item.fund }}</text></view>
          <view class="mile-gate">风险闸门：{{ item.gate }}</view>
        </view>
      </view>
    </view>

    <view class="sec">分批交付与验收</view>
    <view v-for="batch in batches" :key="batch.no" class="batch" @tap="checkBatch(batch)">
      <view class="batch-no">{{ batch.no }}</view>
      <view class="batch-main">
        <view class="batch-top"><text>{{ batch.weight }}吨 · ¥{{ money(batch.amount) }}</text><text :class="{ ok: batch.status === '已验收', wait: batch.status !== '已验收' }">{{ batch.status }}</text></view>
        <text class="batch-sub">质量 {{ batch.quality }} · 温控 {{ batch.temp }} · 点此查看/提交验收证据</text>
      </view>
    </view>

    <view class="fund-card">
      <text class="fund-title">本期资金状态</text>
      <view class="fund-grid">
        <view><text>合同总额</text><text>¥{{ money(contract.amount) }}</text></view>
        <view><text>正常待结</text><text class="green">¥{{ money(normalAmount) }}</text></view>
        <view><text>待验/争议冻结</text><text class="orange">¥{{ money(frozenAmount) }}</text></view>
        <view><text>平台资金池</text><text class="blue">¥0</text></view>
      </view>
      <view class="fund-rule">放款金额 = 验收合格金额 − 合同约定且已核验的费用/扣款；各收款方金额合计必须严格等于本期应结金额。收益分配方案只在适用的利益共同体合同中启用，不作为所有B2B订单的统一比例。</view>
      <view class="settle-btn" @tap="settle">{{ settling ? "正在向后台提交…" : (orderId.startsWith('SZGS-') ? "提交后台结算指令" : "预校验银行结算指令") }}</view>
    </view>

    <view class="boundary">
      <text class="boundary-t">履约与签约衔接原则</text>
      <text>合同模板只定义权利义务；业务事件生成真实证据；系统校验条件后只向持牌机构发送资金指令。时间戳、哈希与链上存证补强证据，但不替代主体CA签章、授权和真实履约事实。</text>
    </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.fulfill-page { padding-bottom: 38rpx; background: #f3f6f5; }
.production-empty { margin: 48rpx 24rpx; padding: 34rpx 28rpx; border: 2rpx solid #d8e7de; border-radius: 22rpx; background: #f7fbf8; }
.production-empty-title { display: block; color: #145d3c; font-size: 32rpx; font-weight: 900; }
.production-empty-text { display: block; margin-top: 16rpx; color: #5e7167; font-size: 24rpx; line-height: 1.7; }
.hero { padding: 32rpx 26rpx 28rpx; color: #fff; background: linear-gradient(145deg, #0c5737, #16884c 58%, #1e6d85); border-radius: 0 0 32rpx 32rpx; }
.hero-k { display: block; font-size: 20rpx; opacity: .8; }
.hero-t { display: block; margin-top: 12rpx; font-size: 36rpx; font-weight: 900; }
.hero-s { display: block; margin-top: 10rpx; font-size: 21rpx; line-height: 1.6; opacity: .9; }
.hero-sync { display: block; margin-top: 10rpx; color: #d9f9e6; font-size: 20rpx; }
.hero-progress { margin-top: 20rpx; }
.progress-text { display: flex; justify-content: space-between; font-size: 19rpx; }
.progress-bar { height: 8rpx; margin-top: 8rpx; overflow: hidden; border-radius: 999rpx; background: rgba(255,255,255,.18); }
.progress-bar>view { height: 100%; border-radius: 999rpx; background: #f4c75b; transition: width .35s; }
.hero-btn { margin-top: 18rpx; padding: 17rpx; border-radius: 999rpx; color: #145c3b; background: #fff; text-align: center; font-size: 23rpx; font-weight: 800; }
.pack-entry { display: flex; align-items: center; gap: 14rpx; margin: 20rpx 24rpx 0; padding: 19rpx; border: 2rpx solid #ded4f4; border-radius: 20rpx; background: linear-gradient(135deg, #f6f1ff, #fff); }
.pack-icon { flex: none; width: 58rpx; height: 58rpx; display: flex; align-items: center; justify-content: center; border-radius: 15rpx; background: #ebe0ff; font-size: 31rpx; }
.pack-main { flex: 1; display: flex; flex-direction: column; }
.pack-t { color: #6b21b6; font-size: 24rpx; font-weight: 800; }
.pack-s { margin-top: 4rpx; color: $sg-text-3; font-size: 18rpx; }
.pack-go { color: #6b21b6; font-size: 21rpx; }
.sec { padding: 24rpx 26rpx 12rpx; color: $sg-text; font-size: 29rpx; font-weight: 900; }
.sg-card { margin: 0 24rpx; padding: 21rpx; border-radius: 20rpx; background: #fff; box-shadow: 0 8rpx 28rpx rgba(30,50,40,.06); }
.row { display: flex; gap: 14rpx; padding: 13rpx 0; border-bottom: 2rpx solid #f0f2f1; }
.row:last-child { border-bottom: 0; }
.row>text:first-child { flex: 0 0 116rpx; color: $sg-text-3; font-size: 20rpx; }
.row>text:last-child { flex: 1; color: $sg-text-2; font-size: 21rpx; line-height: 1.5; }
.row .amount { color: $sg-red !important; font-size: 27rpx !important; font-weight: 900; }
.row .ok { color: $sg-primary !important; font-weight: 700; }
.timeline { margin: 0 24rpx; }
.mile { display: flex; gap: 14rpx; }
.mile-left { position: relative; flex: none; width: 44rpx; display: flex; justify-content: center; }
.mile-dot { z-index: 1; width: 40rpx; height: 40rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: $sg-text-3; background: #e6eae7; font-size: 18rpx; font-weight: 800; }
.mile-line { position: absolute; top: 38rpx; bottom: -4rpx; width: 3rpx; background: #dfe5e1; }
.mile.done .mile-dot, .mile.active .mile-dot { color: #fff; background: $sg-primary; }
.mile.done .mile-line { background: $sg-primary; }
.mile-card { flex: 1; margin-bottom: 14rpx; padding: 18rpx; border-radius: 18rpx; background: #fff; box-shadow: 0 6rpx 20rpx rgba(30,50,40,.05); }
.mile.active .mile-card { border: 2rpx solid #8fd2ad; background: #f7fffa; }
.mile-head { display: flex; justify-content: space-between; gap: 10rpx; }
.mile-head>text:first-child { color: $sg-text; font-size: 24rpx; font-weight: 900; }
.mile-head>text:last-child { color: $sg-primary; font-size: 18rpx; }
.mile-owner { display: block; margin: 7rpx 0; color: $sg-text-3; font-size: 18rpx; }
.mile-box { display: flex; gap: 10rpx; padding: 10rpx 12rpx; border-radius: 10rpx; font-size: 18rpx; line-height: 1.45; }
.mile-box text:first-child { flex: none; font-weight: 800; }
.mile-box.proof { color: #315b76; background: #eef7ff; }
.mile-box.fund { margin-top: 7rpx; color: #8a631a; background: #fff7e8; }
.mile-gate { margin-top: 9rpx; color: $sg-text-3; font-size: 18rpx; line-height: 1.5; }
.batch { display: flex; gap: 14rpx; margin: 0 24rpx 12rpx; padding: 18rpx; border-radius: 18rpx; background: #fff; box-shadow: 0 6rpx 20rpx rgba(30,50,40,.05); }
.batch-no { flex: none; width: 56rpx; height: 56rpx; display: flex; align-items: center; justify-content: center; border-radius: 14rpx; color: #fff; background: #385e72; font-size: 19rpx; font-weight: 800; }
.batch-main { flex: 1; display: flex; flex-direction: column; }
.batch-top { display: flex; justify-content: space-between; gap: 10rpx; color: $sg-text; font-size: 22rpx; font-weight: 800; }
.batch-top .ok { color: $sg-primary; }
.batch-top .wait { color: #b5791b; }
.batch-sub { margin-top: 6rpx; color: $sg-text-3; font-size: 18rpx; line-height: 1.5; }
.fund-card { margin: 20rpx 24rpx 0; padding: 22rpx; border-radius: 22rpx; color: #fff; background: linear-gradient(135deg, #253e50, #376b75); }
.fund-title { display: block; font-size: 28rpx; font-weight: 900; }
.fund-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10rpx; margin-top: 15rpx; }
.fund-grid>view { display: flex; flex-direction: column; gap: 5rpx; padding: 14rpx; border-radius: 12rpx; background: rgba(255,255,255,.09); }
.fund-grid text:first-child { font-size: 17rpx; opacity: .7; }
.fund-grid text:last-child { font-size: 25rpx; font-weight: 900; }
.fund-grid .green { color: #8ff0b5; }
.fund-grid .orange { color: #ffd47b; }
.fund-grid .blue { color: #a9dcff; }
.fund-rule { margin-top: 15rpx; font-size: 18rpx; line-height: 1.6; opacity: .85; }
.settle-btn { margin-top: 17rpx; padding: 18rpx; border-radius: 999rpx; color: #27545d; background: #fff; text-align: center; font-size: 22rpx; font-weight: 800; }
.boundary { margin: 18rpx 24rpx 0; padding: 20rpx; border: 2rpx solid #d9e8ff; border-radius: 18rpx; color: #4f6c82; background: #f7fbff; font-size: 19rpx; line-height: 1.6; }
.boundary-t { display: block; margin-bottom: 6rpx; color: #245177; font-size: 23rpx; font-weight: 900; }
</style>
