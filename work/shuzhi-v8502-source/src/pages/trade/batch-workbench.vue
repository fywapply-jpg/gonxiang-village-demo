<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onUnload } from "@dcloudio/uni-app";
import { useTradeStore } from "@/store/trade";
import { acceptTrade, advanceLocalTrade, createTradeOrder, getLocalHealth, getPurchaseDemands, getTrade, issueTradeInvoice, recordPlatformEvent, resetLocalTrade, settleTrade, signTradeContract, submitDemandQuote } from "@/services/localApi";

const trade = useTradeStore();
trade.hydrateBatchCase();
const tx = computed(() => trade.batchCase);
const running = ref(false);
const backendLinked = ref(false);
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const backendMode = ref<"local-demo" | "production">(productionBuild ? "production" : "local-demo");
const backendOrderAmount = ref<number | null>(null);
const backendGoodsNet = ref<number | null>(null);
const backendPlatformFee = ref<number | null>(null);
const advancing = ref(false);
let timer: ReturnType<typeof setInterval> | null = null;
const demoBackendOrderId = "SZGS-2026-850901";
function chooseDeliveryLocation() {
  uni.chooseLocation({
    success: (location: any) => {
      if (!tx.value) return;
      tx.value.deliveryAddress = String(location.name || location.address || "").trim();
      tx.value.deliveryLat = Number(location.latitude);
      tx.value.deliveryLng = Number(location.longitude);
      trade.saveBatchCase();
    },
    fail: () => uni.showToast({ title: "地图选点不可用，请重试", icon: "none" }),
  });
}

async function submitSupplierQuotes() {
  const currentTx = tx.value;
  if (!currentTx || currentTx.scene !== "supplierDemand") return [];
  const existing = currentTx.quoteIds || [];
  if (existing.length === currentTx.items.length) return existing;
  const buyerIds = [...new Set(currentTx.items.map((item) => item.buyerId).filter(Boolean))];
  if (buyerIds.length !== 1) throw new Error("批量报价必须来自同一已核验采购主体；跨采购方需求需拆成多个报价包");
  if (currentTx.items.some((item) => !item.demandId || !item.productId)) throw new Error("采购需求尚未绑定后台需求号和已审核供货商品，不能提交报价");
  // 网络重试或页面重载时先复用后台已有报价，避免同一需求重复报价。
  const remote = await getPurchaseDemands();
  const remoteQuotes = remote.flatMap((demand) => [...(demand.my_quotes || []), ...(demand.quotes || [])]);
  const ids: string[] = [];
  for (const item of currentTx.items) {
    const existingQuote = remoteQuotes.find((quote) => quote.demand_id === item.demandId && quote.product_id === item.productId && ["submitted", "accepted", "ordered"].includes(quote.status));
    if (existingQuote) ids.push(String(existingQuote.id));
    else {
      const quote = await submitDemandQuote(item.demandId!, { product_id: item.productId!, qty: item.qty, unit_price: item.price });
      ids.push(String(quote.id));
    }
  }
  currentTx.quoteIds = ids;
  trade.saveBatchCase();
  return ids;
}

const buyerFlow = [
  { title: "批量清单拆单", actor: "采购经办人", action: "校验多品类、多供应商、数量、含税单价和交付地，生成主交易包及子订单", evidence: "BATCH-ORD" },
  { title: "采购主体与授权核验", actor: "平台准入服务", action: "核验采购企业、经办岗位、采购额度、对公付款账户及食品经营许可", evidence: "KYB-BUYER" },
  { title: "供应商逐户确认", actor: "供应商 + 平台", action: "逐户核验经营范围、产能库存、检测资质、收款账户并完成锁货", evidence: "SUP-CHECK" },
  { title: "订单复核与成交", actor: "交易复核岗", action: "复核价格偏差、关联交易、交期和收货能力，形成各子订单成交快照", evidence: "ORDER-REVIEW" },
  { title: "CA合同包双签", actor: "采购方 + 各供应商", action: "批量签署主框架、子订单、质量标准、履约计划、发票与结算授权", evidence: "CA-PACK" },
  { title: "机构支付授权", actor: "采购付款岗 + 持牌机构", action: "付款与复核岗位分离，同名对公账户付款；平台只传支付指令、不接触货款", evidence: "PAY-INST" },
  { title: "分仓备货与出库", actor: "供应商 + WMS + 检测机构", action: "按子订单锁定批次、称重、抽检、生成合格证并绑定出库单", evidence: "WMS-OUT" },
  { title: "多运单在途协同", actor: "承运商 + TMS", action: "生成多段运单，采集司机、车辆、温控、轨迹、异常开箱与预计到达", evidence: "TMS-ROUTE" },
  { title: "到货复磅与验收", actor: "采购验收岗", action: "逐子订单核对数量、等级、温控、检测和影像；不合格部分自动转争议", evidence: "ACCEPT" },
  { title: "批量开票与验真", actor: "各供应商 + 税务服务", action: "按验收合格净额开票，自动核对抬头、税号、货物名称、金额和订单号", evidence: "INVOICE" },
  { title: "机构条件分账结算", actor: "持牌机构", action: "货款直达供应商；物流、检测、平台技术服务费分别结算到真实服务主体", evidence: "SETTLE" },
  { title: "四流三账对账关账", actor: "平台财务 + 机构 + 双方", action: "核对合同流、订单流、物流、发票流与订单账、机构账、商户账，生成归档包", evidence: "RECON" },
];

const supplierFlow = [
  { title: "批量响应采购需求", actor: "供货经办人", action: "合并多个采购需求，填报可供数量、含税报价、批次、交期并生成供货订单包", evidence: "BATCH-SUPPLY" },
  { title: "供货主体与授权核验", actor: "平台准入服务", action: "核验合作社、法人及经办授权、品类经营范围、对公收款账户和生产许可", evidence: "KYB-SUPPLIER" },
  { title: "产能库存与质量预检", actor: "合作社 + 仓储质检", action: "核验在田/在栏/在库数量、预检报告、合格证和历史履约能力，完成批次预占", evidence: "CAPACITY" },
  { title: "采购方逐单确认", actor: "各采购方 + 交易复核岗", action: "逐单确认报价、账期、收货窗口和验收标准，超授权或异常价格转人工审核", evidence: "BUYER-CONFIRM" },
  { title: "CA合同包双签", actor: "供货方 + 各采购方", action: "批量签署供货框架、子订单、质量附件、物流责任、发票和结算条件", evidence: "CA-PACK" },
  { title: "付款/授信条件确认", actor: "采购方 + 持牌机构", action: "核验预付款、验收即付或合规账期；未获得机构付款确认不得出库", evidence: "PAY-CONFIRM" },
  { title: "分批生产备货出库", actor: "产地供货商 + WMS", action: "按合同锁定产地批次，完成采收/出栏、检测、分级、包装、称重和装车", evidence: "ORIGIN-OUT" },
  { title: "多目的地物流履约", actor: "承运商 + TMS", action: "按采购方拆分线路和运单，连续回传位置、温控、签封与预计到达", evidence: "TMS-MULTI" },
  { title: "采购方分别验收", actor: "各采购验收岗", action: "各采购方提交复磅、抽检、签收和异常证据；合格与争议金额分别处理", evidence: "MULTI-ACCEPT" },
  { title: "按实收批量开票", actor: "供货方财务", action: "根据各采购方验收合格净额分别开票并完成五要素验真，禁止提前虚开", evidence: "MULTI-INVOICE" },
  { title: "机构批量结算到账", actor: "持牌机构", action: "正常货款直达供货方对公账户，争议款暂停；服务费用直接结算给对应服务商", evidence: "MULTI-SETTLE" },
  { title: "回单归档与信用回写", actor: "平台对账服务", action: "归集订单、合同、物流、验收、发票和银行回单，关账并回写履约信用", evidence: "CLOSE-PACK" },
];

const steps = computed(() => tx.value?.scene === "supplierDemand" ? supplierFlow : buyerFlow);
const current = computed(() => tx.value?.currentStep ?? -1);
const nextStep = computed(() => steps.value[current.value + 1]);
const progress = computed(() => Math.round(((current.value + 1) / steps.value.length) * 100));
const goodsAmount = computed(() => tx.value?.items.reduce((sum, item) => sum + item.qty * item.price, 0) ?? 0);
const logisticsFee = computed(() => Math.round(goodsAmount.value * 0.02));
const testingFee = computed(() => new Set(tx.value?.items.map((x) => x.counterparty)).size * 380);
const platformFee = computed(() => Math.round(goodsAmount.value * 0.04));
const totalAmount = computed(() => goodsAmount.value + logisticsFee.value + testingFee.value + platformFee.value);
const displayGoodsAmount = computed(() => backendLinked.value && backendGoodsNet.value != null ? backendGoodsNet.value : goodsAmount.value);
const displayPlatformFee = computed(() => backendLinked.value && backendPlatformFee.value != null ? backendPlatformFee.value : platformFee.value);
const displayTotalAmount = computed(() => backendLinked.value && backendOrderAmount.value != null ? backendOrderAmount.value : totalAmount.value);
const displayServiceTotal = computed(() => Math.max(0, displayTotalAmount.value - displayGoodsAmount.value - displayPlatformFee.value));
const isBuyer = computed(() => tx.value?.scene === "buyerSupply");
const orderCount = computed(() => tx.value?.items.length ?? 0);
const invoiceCount = computed(() => current.value >= 9 ? orderCount.value : 0);
const settledAmount = computed(() => current.value >= 10 ? displayTotalAmount.value : 0);

function money(v: number) {
  return "¥" + v.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

async function executeNext(showToast = true) {
  if (!tx.value || tx.value.completed) return;
  if (advancing.value) return;
  const index = tx.value.currentStep + 1;
  const step = steps.value[index];
  if (!step) return;
  const evidence = `${step.evidence}-${tx.value.id.slice(-8)}-${String(index + 1).padStart(2, "0")}`;
  const backendOrderId = tx.value.backendOrderId || (backendMode.value === "production" ? "" : demoBackendOrderId);
  if (!backendLinked.value && backendMode.value === "production") {
    uni.showModal({ title: "生产后台未连接", content: "生产交易必须先完成订单创建和后台状态同步，当前节点不会在前台本地推进。", showCancel: false });
    return;
  }
  if (backendLinked.value) {
    advancing.value = true;
    try {
      if (index === 4) await signTradeContract(backendOrderId, isBuyer.value ? "buyer" : "supplier", `CA-${isBuyer.value ? "BUYER" : "SUPPLIER"}-V8533`);
      else if (index === 8) await acceptTrade(backendOrderId, evidence);
      else if (index === 9) await issueTradeInvoice(backendOrderId, `V8533-${Date.now().toString().slice(-8)}`, backendOrderAmount.value ?? displayTotalAmount.value);
      else if (index === 10) await settleTrade(backendOrderId, `SETTLE-V8533-${Date.now().toString().slice(-8)}`);
      else await recordPlatformEvent("trade", step.title, { reference_id: backendOrderId, evidence, batch_id: tx.value.id });
    } catch (error: any) {
      uni.showModal({ title: "后台未放行", content: error?.message || "当前节点未满足后台条件，前台不会继续推进", showCancel: false });
      advancing.value = false;
      return;
    }
    advancing.value = false;
  }
  if (backendMode.value === "production" && !isBuyer.value && !backendOrderId) {
    if (index === 0) {
      try {
        const ids = await submitSupplierQuotes();
        trade.recordBatchStep(0, step.title, `已提交 ${ids.length} 份后台报价，等待采购方逐份确认；报价确认后才生成正式订单`);
        uni.showModal({ title: "报价已提交", content: "采购需求不是成交订单。报价已绑定供货主体、审核商品和采购方，待采购方确认后才会生成正式订单、合同与支付流程。", showCancel: false });
      } catch (error: any) {
        uni.showModal({ title: "报价未提交", content: error?.message || "需求主体或供货商品尚未完成后台绑定", showCancel: false });
      }
    } else {
      uni.showModal({ title: "等待采购方确认", content: "当前批量报价尚未转成正式订单；采购方确认报价并生成订单后，才能继续合同、支付、物流、验收和结算。", showCancel: false });
    }
    return;
  }
  trade.recordBatchStep(index, step.title, evidence);
  // 未连接后台时仅允许离线体验；连接后台后必须以上方真实动作成功为前置。
  if (!backendLinked.value) void advanceLocalTrade(backendOrderId).catch(() => undefined);
  if (showToast) uni.showToast({ title: `第${index + 1}步已完成`, icon: "success" });
}

async function syncBackendTrade() {
  const currentTx = tx.value;
  if (!currentTx) return;
  try {
    const health = await getLocalHealth();
    backendMode.value = health.runtime_mode === "production" ? "production" : "local-demo";
    let backendOrderId = currentTx.backendOrderId || (backendMode.value === "production" ? "" : demoBackendOrderId);
    if (backendMode.value === "production" && !currentTx.backendOrderId) {
      if (currentTx.scene === "supplierDemand") {
        const quoteIds = currentTx.quoteIds || [];
        if (!quoteIds.length) throw new Error("供货方批量响应需先提交报价，等待采购方确认");
        const demands = await getPurchaseDemands();
        const ordered = demands.flatMap((demand) => [...(demand.my_quotes || [])]).filter((quote) => quoteIds.includes(String(quote.id)) && quote.status === "ordered" && quote.order_id);
        const orderIds = [...new Set(ordered.map((quote) => String(quote.order_id)))];
        if (orderIds.length !== 1 || ordered.length !== quoteIds.length) throw new Error("采购方尚未确认全部报价，正式订单尚未生成");
        backendOrderId = orderIds[0];
        currentTx.backendOrderId = backendOrderId;
        trade.saveBatchCase();
      } else {
        const supplierIds = [...new Set(currentTx.items.map((item) => item.supplierId).filter(Boolean))];
        if (supplierIds.length !== 1) throw new Error("生产批量建单必须来自同一已核验供货主体");
        if (!currentTx.deliveryAddress || !Number.isFinite(Number(currentTx.deliveryLat)) || !Number.isFinite(Number(currentTx.deliveryLng))) throw new Error("生产批量建单必须先选择收货地址和坐标");
        const created = await createTradeOrder({
          scene: currentTx.scene,
          supplier_id: supplierIds[0] as string,
          items: currentTx.items.map((item) => ({ product_id: item.id, qty: item.qty })),
          delivery_address: currentTx.deliveryAddress,
          delivery_lat: currentTx.deliveryLat,
          delivery_lng: currentTx.deliveryLng,
          delivery_window: currentTx.deliveryWindow,
          settlement_model: currentTx.settlementModel,
          invoice_type: currentTx.invoiceType,
        });
        backendOrderId = String(created.id);
        currentTx.backendOrderId = backendOrderId;
        trade.saveBatchCase();
      }
    }
    if (!backendOrderId) throw new Error("尚未形成可同步的正式订单");
    const backend = await getTrade(backendOrderId);
    backendLinked.value = true;
    const backendGoods = (backend?.items || []).reduce((sum: number, item: any) => sum + Number(item.subtotal || 0), 0);
    backendOrderAmount.value = Number(backend?.amount || 0) || null;
    backendGoodsNet.value = backendGoods > 0 ? Math.round(backendGoods * 100) / 100 : null;
    const recordedPlatformFee = Number(backend?.settlement?.platform_fee || 0);
    backendPlatformFee.value = recordedPlatformFee > 0
      ? Math.round(recordedPlatformFee * 100) / 100
      : backendGoodsNet.value == null ? null : Math.round(backendGoodsNet.value * 0.04 * 100) / 100;
    const step = Number(backend?.fulfillment_step);
    if (Number.isInteger(step) && step >= -1 && step <= 11 && trade.batchCase) {
      trade.batchCase.currentStep = step;
      trade.batchCase.completed = step >= 11 || backend?.status === "已完成";
      trade.saveBatchCase();
    }
  } catch {
    backendLinked.value = false;
    // 后台暂不可用时明确进入离线体验，不冒充真实交易成功。
  }
}

function runAll() {
  if (running.value) {
    if (timer) clearInterval(timer);
    timer = null;
    running.value = false;
    return;
  }
  if (tx.value?.completed) {
    if (backendLinked.value && backendMode.value === "production") {
      uni.showModal({ title: "生产交易不可重置", content: "生产环境不允许重置真实订单；请由后台按授权流程处理撤销或售后。", showCancel: false });
      return;
    }
    trade.resetBatchCase();
    void resetLocalTrade(tx.value.backendOrderId || demoBackendOrderId).catch(() => undefined);
  }
  running.value = true;
  timer = setInterval(() => {
    executeNext(false);
    if (tx.value?.completed) {
      if (timer) clearInterval(timer);
      timer = null;
      running.value = false;
      uni.showToast({ title: "全流程已经关账", icon: "success" });
    }
  }, 430);
}

function reset() {
  if (timer) clearInterval(timer);
  timer = null;
  running.value = false;
  if (backendMode.value === "production") {
    uni.showModal({ title: "生产交易不可重置", content: "生产环境不允许重置真实订单；请由后台按授权流程处理撤销或售后。", showCancel: false });
    return;
  }
  trade.resetBatchCase();
  void resetLocalTrade(tx.value?.backendOrderId || demoBackendOrderId).catch(() => undefined);
}

function choose(key: "deliveryWindow" | "settlementModel" | "invoiceType", values: string[]) {
  uni.showActionSheet({
    itemList: values,
    success: (r) => trade.setBatchOption(key, values[r.tapIndex]),
  });
}

function documentDetail(type: "contract" | "logistics" | "invoice" | "settlement") {
  if (!tx.value) return;
  const map = {
    contract: {
      title: "CA电子合同包",
      gate: 4,
      content: `主合同 CA-${tx.value.id}\n子订单合同 ${orderCount.value} 份\n质量附件 ${orderCount.value} 份\n结算授权 1 份\n双方签章、时间戳与合同哈希完整。`,
    },
    logistics: {
      title: "多运单履约",
      gate: 7,
      content: `运输任务 ${orderCount.value} 条\n在途车辆 ${orderCount.value} 辆\n温控与轨迹连续\n预计按约定窗口到达：${tx.value.deliveryWindow}`,
    },
    invoice: {
      title: "发票台账",
      gate: 9,
      content: `应开票 ${orderCount.value} 张\n已验真 ${invoiceCount.value} 张\n开票基数：验收合格商品净额\n抬头、税号、品名、金额、订单号五项一致。`,
    },
    settlement: {
      title: "机构结算回单",
      gate: 10,
      content: `订单支付总额 ${money(displayTotalAmount.value)}\n商品货款 ${money(displayGoodsAmount.value)}\n平台技术服务费 ${money(displayPlatformFee.value)}\n平台货款余额 ¥0.00\n${current.value >= 10 ? "持牌机构已按真实收款主体完成分账。" : "尚未达到结算条件。"}`,
    },
  };
  const doc = map[type];
  uni.showModal({
    title: current.value >= doc.gate ? `${doc.title} · 已生成` : `${doc.title} · 未生成`,
    content: current.value >= doc.gate ? doc.content : `请先执行到第${doc.gate + 1}步，系统将根据前序业务证据自动生成。`,
    showCancel: false,
    confirmText: "知道了",
  });
}

onLoad(() => {
  trade.hydrateBatchCase();
  void syncBackendTrade();
  if (!trade.batchCase) {
    uni.showModal({
      title: "请从交易大厅开始",
      content: "进入供货大厅或采购大厅，勾选多项后生成批量交易包。",
      showCancel: false,
      success: () => uni.switchTab({ url: "/pages/trade/index" }),
    });
  }
});
onUnload(() => { if (timer) clearInterval(timer); });
</script>

<template>
  <view v-if="tx" class="workbench">
    <view class="hero">
      <view class="hero-top"><text>数智供社 v8533 · 批量交易工作台</text><text>{{ tx.roleName }}</text></view>
      <text class="hero-title">{{ isBuyer ? "采购商批量采购工作台" : "产地供货商批量接单工作台" }}</text>
      <text class="hero-sub">{{ tx.org }} · {{ tx.id }}</text>
      <text class="hero-sync">{{ backendLinked ? `后台已同步 · ${backendMode === 'production' ? '生产模式' : '本地联调'}` : "离线体验 · 未写入后台" }}</text>
      <view class="hero-kpi">
        <view><text>合同总额</text><text>{{ money(displayTotalAmount) }}</text></view>
        <view><text>完成进度</text><text>{{ progress }}%</text></view>
        <view><text>平台货款</text><text>¥0</text></view>
      </view>
      <view class="progress"><view :style="{ width: progress + '%' }"></view></view>
      <view class="hero-actions">
        <view class="primary" @tap="runAll">{{ running ? "暂停执行" : tx.completed ? "重新核验全单" : "批量核验全单" }}</view>
        <view class="secondary" @tap="executeNext">{{ advancing ? "等待后台" : (tx.completed ? "已关账" : "执行下一步") }}</view>
      </view>
    </view>

    <view class="identity">
      <text>交易身份已锁定</text>
      <view><text>{{ tx.roleName }}</text><text>{{ tx.org }}</text><text>企业认证通过</text></view>
    </view>

    <view class="section-head">
      <view><text>批量交易清单</text></view>
      <text>{{ orderCount }} 单</text>
    </view>
    <view class="lines">
      <view v-for="item in tx.items" :key="item.id" class="line">
        <image v-if="item.pic" :src="item.pic" mode="aspectFill" />
        <view class="line-main">
          <text>{{ item.name }}</text>
          <text>{{ item.counterparty }} · {{ item.origin }}</text>
          <text>{{ item.spec }}</text>
        </view>
        <view class="line-right">
          <text>{{ money(item.price) }}/{{ item.unit }}</text>
          <view class="qty">
            <text @tap="current < 0 && trade.updateBatchQty(item.id, -1)">−</text>
            <text>{{ item.qty }}</text>
            <text @tap="current < 0 && trade.updateBatchQty(item.id, 1)">＋</text>
          </view>
          <text>{{ money(item.qty * item.price) }}</text>
        </view>
      </view>
    </view>

    <view class="section-head">
      <view><text>交易条件</text></view>
    </view>
    <view class="options">
      <view v-if="productionBuild" @tap="chooseDeliveryLocation"><text>收货地址</text><text>{{ tx.deliveryAddress || "正式建单前必须地图选点" }} ›</text></view>
      <view @tap="choose('deliveryWindow', ['2026-08-03 08:00—12:00', '2026-08-04 13:00—17:00', '按子订单分批到货'])"><text>交付窗口</text><text>{{ tx.deliveryWindow }} ›</text></view>
      <view @tap="choose('settlementModel', ['持牌机构条件结算（验收后分账）', '银行对公直付（验收即付）', '机构授信账期（30日）'])"><text>结算模型</text><text>{{ tx.settlementModel }} ›</text></view>
      <view @tap="choose('invoiceType', ['增值税专用发票', '增值税普通发票', '农产品销售发票'])"><text>发票类型</text><text>{{ tx.invoiceType }} ›</text></view>
    </view>

    <view class="section-head">
      <view><text>履约状态</text></view>
      <text @tap="reset">重置</text>
    </view>
    <view class="flow-card">
      <view v-for="(step, i) in steps" :key="step.title" class="step" :class="{ done: current >= i, active: current + 1 === i }" @tap="current + 1 === i && executeNext()">
        <view class="step-no">{{ current >= i ? "✓" : i + 1 }}</view>
        <view class="step-main">
          <view><text>{{ step.title }}</text><text>{{ current >= i ? "已完成" : current + 1 === i ? "待执行" : "前序未完成" }}</text></view>
          <text v-if="current >= i">证据：{{ step.evidence }}-{{ tx.id.slice(-8) }}-{{ String(i + 1).padStart(2, "0") }}</text>
        </view>
      </view>
    </view>

    <view class="section-head">
      <view><text>业务单据</text></view>
    </view>
    <view class="docs">
      <view @tap="documentDetail('contract')" :class="{ ready: current >= 4 }"><text>✍️</text><text>CA合同包</text><text>{{ current >= 4 ? orderCount + "份已签" : "待签署" }} ›</text></view>
      <view @tap="documentDetail('logistics')" :class="{ ready: current >= 7 }"><text>🚚</text><text>物流运单</text><text>{{ current >= 7 ? orderCount + "条在途" : "待出库" }} ›</text></view>
      <view @tap="documentDetail('invoice')" :class="{ ready: current >= 9 }"><text>🧾</text><text>发票台账</text><text>{{ invoiceCount }}张验真 ›</text></view>
      <view @tap="documentDetail('settlement')" :class="{ ready: current >= 10 }"><text>🏦</text><text>机构结算</text><text>{{ current >= 10 ? "已分账" : "待触发" }} ›</text></view>
    </view>

    <view class="section-head">
      <view><text>金额与收款主体</text></view>
      <text>账平</text>
    </view>
    <view class="ledger">
      <view><text>商品货款</text><text>{{ isBuyer ? "各产地供应商" : "当前供货商" }}</text><text>{{ money(displayGoodsAmount) }}</text></view>
      <view v-if="!backendLinked"><text>物流服务费</text><text>实际承运商</text><text>{{ money(logisticsFee) }}</text></view>
      <view v-if="!backendLinked"><text>检验检测费</text><text>实际检测机构</text><text>{{ money(testingFee) }}</text></view>
      <view v-else><text>物流/包装/检测等合同服务</text><text>按后台合同明细分项结算</text><text>{{ money(displayServiceTotal) }}</text></view>
      <view class="platform"><text>平台技术服务费</text><text>商品净额 × 4%</text><text>{{ money(displayPlatformFee) }}</text></view>
      <view class="total"><text>订单支付总额</text><text>{{ tx.settlementModel }}</text><text>{{ money(displayTotalAmount) }}</text></view>
      <view class="settled"><text>机构已结算</text><text>平台不沉淀货款</text><text>{{ money(settledAmount) }}</text></view>
    </view>

    <view class="section-head">
      <view><text>业务事件日志</text><text>所有成功、失败、人工复核和证据编号均按时间保留</text></view>
    </view>
    <view v-if="tx.logs.length" class="logs">
      <view v-for="log in tx.logs" :key="log.step">
        <text>{{ log.time }}</text>
        <view><text>{{ log.title }}</text><text>{{ log.evidence }}</text></view>
        <text>通过</text>
      </view>
    </view>
    <view v-else class="empty">尚未产生事件，点击“批量核验全单”或“执行下一步”开始办理准备。</view>

    <view class="boundary">
      <text>机构接入边界</text>
      <text>本页用于交易包核验、单据准备和权限门禁检查；未接入真实银行、税务、CA、物流及监管接口前，不会扣款、开票或发货。正式交易必须完成机构签约、验签和回执核验后才推进状态。</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.workbench { min-height: 100vh; padding-bottom: 44rpx; background: #eef2f5; }
.hero { padding: 30rpx 24rpx 28rpx; color: #fff; background: linear-gradient(145deg, #092f49, #0c4d6c 54%, #146a4a); border-radius: 0 0 30rpx 30rpx; }
.hero-top { display: flex; justify-content: space-between; font-size: 18rpx; opacity: .82; }
.hero-top text:last-child { padding: 5rpx 12rpx; border-radius: 999rpx; background: rgba(255,255,255,.13); }
.hero-title { display: block; margin-top: 14rpx; font-size: 37rpx; font-weight: 900; }
.hero-sub { display: block; margin-top: 6rpx; font-size: 18rpx; line-height: 1.5; opacity: .85; }
.hero-sync { display: block; margin-top: 6rpx; color: #c9f5de; font-size: 18rpx; }
.hero-kpi { display: grid; grid-template-columns: 1.4fr 1fr .8fr; gap: 8rpx; margin-top: 18rpx; }
.hero-kpi view { padding: 12rpx; border-radius: 13rpx; background: rgba(255,255,255,.1); display: flex; flex-direction: column; }
.hero-kpi text:first-child { font-size: 16rpx; opacity: .68; }
.hero-kpi text:last-child { margin-top: 3rpx; font-size: 23rpx; font-weight: 900; }
.progress { height: 8rpx; margin-top: 15rpx; overflow: hidden; border-radius: 999rpx; background: rgba(255,255,255,.14); }
.progress view { height: 100%; background: linear-gradient(90deg, #f6c85f, #6fe1a0); transition: width .3s; }
.hero-actions { display: flex; gap: 10rpx; margin-top: 17rpx; }
.hero-actions view { padding: 16rpx; border-radius: 999rpx; text-align: center; font-size: 21rpx; font-weight: 850; }
.primary { flex: 1.4; color: #103d53; background: #fff; }
.secondary { flex: 1; border: 2rpx solid rgba(255,255,255,.35); }
.identity { margin: 16rpx 24rpx 0; padding: 17rpx; border: 2rpx solid #cce6d7; border-radius: 16rpx; background: #f0faf4; }
.identity > text:first-child { color: #176a4b; font-size: 20rpx; font-weight: 900; }
.identity > view { display: flex; gap: 8rpx; margin-top: 8rpx; align-items: center; }
.identity > view text { padding: 5rpx 10rpx; border-radius: 7rpx; color: #176a4b; background: #dff3e7; font-size: 17rpx; }
.identity > view text:nth-child(2) { flex: 1; color: #263f34; background: transparent; font-weight: 800; }
.identity > text:last-child { display: block; margin-top: 8rpx; color: #64776d; font-size: 17rpx; line-height: 1.5; }
.section-head { display: flex; align-items: center; padding: 23rpx 24rpx 10rpx; }
.section-head > view { flex: 1; display: flex; flex-direction: column; }
.section-head > view text:first-child { color: #172b3a; font-size: 27rpx; font-weight: 900; }
.section-head > view text:last-child { margin-top: 2rpx; color: #77848d; font-size: 17rpx; line-height: 1.4; }
.section-head > text { padding: 6rpx 11rpx; border-radius: 999rpx; color: #176a4b; background: #e4f4eb; font-size: 17rpx; font-weight: 800; }
.lines, .options, .flow-card, .ledger, .logs { margin: 0 24rpx; border-radius: 18rpx; background: #fff; box-shadow: 0 6rpx 22rpx rgba(35,56,67,.05); overflow: hidden; }
.line { display: flex; gap: 12rpx; padding: 15rpx; border-bottom: 1rpx solid #edf0f2; }
.line:last-child { border-bottom: 0; }
.line image { flex: none; width: 82rpx; height: 82rpx; border-radius: 12rpx; background: #edf5ef; }
.line-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.line-main text:first-child { font-size: 20rpx; font-weight: 850; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.line-main text:nth-child(2) { margin-top: 2rpx; color: #6f7d85; font-size: 16rpx; }
.line-main text:last-child { margin-top: 2rpx; color: #8b969c; font-size: 15rpx; }
.line-right { flex: none; width: 175rpx; display: flex; flex-direction: column; align-items: flex-end; }
.line-right > text:first-child { color: #687780; font-size: 16rpx; }
.line-right > text:last-child { margin-top: 3rpx; color: #b43e34; font-size: 19rpx; font-weight: 900; }
.qty { display: flex; align-items: center; margin-top: 5rpx; overflow: hidden; border: 1rpx solid #dae1e5; border-radius: 8rpx; }
.qty text { min-width: 43rpx; padding: 2rpx 5rpx; text-align: center; font-size: 17rpx; }
.qty text:nth-child(2) { border-left: 1rpx solid #dae1e5; border-right: 1rpx solid #dae1e5; }
.options > view { display: grid; grid-template-columns: 125rpx 1fr; gap: 10rpx; padding: 15rpx 17rpx; border-bottom: 1rpx solid #edf0f2; }
.options > view:last-child { border-bottom: 0; }
.options text:first-child { color: #7b8790; font-size: 17rpx; }
.options text:last-child { color: #29404d; font-size: 18rpx; text-align: right; }
.step { display: flex; gap: 12rpx; padding: 15rpx 16rpx; border-bottom: 1rpx solid #edf0f2; opacity: .48; }
.step:last-child { border-bottom: 0; }
.step.done, .step.active { opacity: 1; }
.step.active { background: #fff8e8; }
.step.done { background: #f3faf6; }
.step-no { flex: none; width: 43rpx; height: 43rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; background: #95a2a9; font-size: 17rpx; font-weight: 900; }
.step.done .step-no { background: #16884c; }
.step.active .step-no { background: #d39222; }
.step-main { flex: 1; display: flex; flex-direction: column; }
.step-main > view { display: flex; justify-content: space-between; gap: 8rpx; }
.step-main > view text:first-child { color: #243b47; font-size: 20rpx; font-weight: 900; }
.step-main > view text:last-child { color: #738087; font-size: 16rpx; }
.step.active .step-main > view text:last-child { color: #b97912; font-weight: 800; }
.step.done .step-main > view text:last-child { color: #16884c; }
.step-main > text { margin-top: 4rpx; color: #65747c; font-size: 16rpx; line-height: 1.45; }
.step-main > text:last-child { color: #2b6cb0; font-family: Menlo, monospace; }
.docs { display: grid; grid-template-columns: 1fr 1fr; gap: 10rpx; margin: 0 24rpx; }
.docs > view { padding: 17rpx; border: 2rpx solid transparent; border-radius: 16rpx; background: #fff; display: grid; grid-template-columns: 43rpx 1fr; }
.docs > view.ready { border-color: #b8e1c8; background: #f1faf5; }
.docs > view > text:first-child { grid-row: 1 / 3; font-size: 29rpx; }
.docs > view > text:nth-child(2) { color: #293f4b; font-size: 19rpx; font-weight: 900; }
.docs > view > text:last-child { color: #7a878e; font-size: 16rpx; }
.ledger > view { display: grid; grid-template-columns: 1.2fr 1.5fr 1fr; gap: 8rpx; padding: 14rpx 17rpx; border-bottom: 1rpx dashed #e4e8ea; }
.ledger > view text { font-size: 17rpx; }
.ledger > view text:nth-child(2) { color: #7b8790; }
.ledger > view text:last-child { text-align: right; color: #263d49; font-weight: 900; }
.ledger .platform { background: #eef8f2; }
.ledger .platform text:first-child, .ledger .platform text:last-child { color: #176a4b; font-weight: 900; }
.ledger .total { background: #f2f7fa; }
.ledger .total text:first-child, .ledger .total text:last-child { font-size: 20rpx; font-weight: 900; }
.ledger .settled { border-bottom: 0; background: #102f3d; }
.ledger .settled text { color: #fff; }
.logs > view { display: grid; grid-template-columns: 86rpx 1fr 55rpx; gap: 8rpx; padding: 13rpx 16rpx; border-bottom: 1rpx solid #edf0f2; }
.logs > view > text:first-child { color: #89949a; font-size: 15rpx; font-family: Menlo, monospace; }
.logs > view > view { display: flex; flex-direction: column; }
.logs > view > view text:first-child { color: #263d49; font-size: 18rpx; font-weight: 850; }
.logs > view > view text:last-child { margin-top: 2rpx; color: #2b6cb0; font-size: 15rpx; font-family: Menlo, monospace; }
.logs > view > text:last-child { color: #16884c; font-size: 16rpx; font-weight: 800; text-align: right; }
.empty { margin: 0 24rpx; padding: 28rpx 18rpx; border-radius: 17rpx; color: #829097; background: #fff; text-align: center; font-size: 18rpx; }
.boundary { margin: 20rpx 24rpx 0; padding: 17rpx; border: 2rpx solid #efd494; border-radius: 16rpx; background: #fff8e7; }
.boundary text:first-child { display: block; color: #946210; font-size: 20rpx; font-weight: 900; }
.boundary text:last-child { display: block; margin-top: 4rpx; color: #735f3c; font-size: 17rpx; line-height: 1.55; }
</style>
