<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { getTrade, signTradeContract } from "@/services/localApi";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const productionBlocked = () => uni.showModal({ title: "需 CA 合同服务", content: "正式环境合同包必须由 CA/电子签平台签署并回传证据，当前未执行本地签署。", showCancel: false });

type ContractTemplate = {
  no: number;
  icon: string;
  title: string;
  kind: "基础必签" | "履约生成" | "事件触发";
  steps: string;
  parties: string;
  signer: string;
  order: string;
  trigger: string;
  mode: string;
  clauses: string;
  attachments: string;
  fund: string;
  output: string;
  next: string;
};

const templates: ContractTemplate[] = [
  {
    no: 1, icon: "🏢", title: "企业入驻与平台服务协议", kind: "基础必签", steps: "第1、3步",
    parties: "供货商/采购商 ↔ 平台运营主体",
    signer: "企业法定代表人或已授权签约人，使用企业CA电子印章；平台使用企业CA章",
    order: "企业先签 → 平台复核后签",
    trigger: "主体资料、经营范围、对公账户初审通过",
    mode: "双方法人/经办权限核验 + 企业CA顺序签署",
    clauses: "平台服务边界、信息真实性、费用项目、数据处理、账户安全、争议解决；明确平台不经手交易货款",
    attachments: "营业执照、专项许可、对公账户核验回执、隐私与数据授权清单",
    fund: "只开通交易资格，不产生货款扣划；未生效不得发布或采购",
    output: "平台服务合同 + 主体签约档案",
    next: "放行第2步人员授权与第4/5步供需发布",
  },
  {
    no: 2, icon: "👤", title: "法人及经办人电子授权书", kind: "基础必签", steps: "第2步",
    parties: "企业法定代表人 → 企业经办人",
    signer: "法人以个人可靠电子签名确认授权；企业同步加盖企业CA章；经办人实名确认受权",
    order: "法人确认 → 企业盖章 → 经办人确认",
    trigger: "企业档案建立后，首次分配报价、定标、签约、付款或验收权限",
    mode: "个人签名 + 企业CA章 + 受权人意愿确认",
    clauses: "岗位、可操作业务、单笔/累计额度、有效期、转授权限制、撤销机制和冲突岗位",
    attachments: "法人身份证明、经办人身份核验结果、岗位权限表、额度审批单",
    fund: "付款人、复核人、资金指令人必须权限分离；越权即禁止支付",
    output: "可验证授权书 + 权限令牌",
    next: "放行相关岗位操作；授权到期自动冻结",
  },
  {
    no: 3, icon: "🌾", title: "供货挂牌与质量真实性承诺书", kind: "基础必签", steps: "第4步",
    parties: "供货商 → 采购商及平台",
    signer: "供货企业授权经办人发起，企业CA章确认",
    order: "供货商单方签署，平台验签",
    trigger: "每个货源版本首次发布或关键字段变更",
    mode: "批次级企业CA签署",
    clauses: "产地、品种、等级、库存、检疫检测、禁限用物质、保质期、价格口径和违约责任",
    attachments: "批次检测/检疫证明、产地证明、库存凭证、产品影像、追溯码",
    fund: "无资金划转；虚假挂牌触发下架、保证金处置或赔付责任",
    output: "可签约货源版本",
    next: "进入第6步撮合与询盘",
  },
  {
    no: 4, icon: "🛒", title: "采购需求与预算授权确认书", kind: "基础必签", steps: "第5步",
    parties: "采购企业内部授权主体 → 采购经办人/平台",
    signer: "采购负责人按企业授权规则确认，企业CA章固化",
    order: "业务经办提交 → 预算负责人审批 → 企业签章",
    trigger: "采购需求发布或预算、数量、收货主体发生变化",
    mode: "企业内部审批流 + 企业CA签署",
    clauses: "采购清单、预算上限、含税口径、收货地点、质量验收、发票、交付窗口和审批边界",
    attachments: "采购清单、预算审批单、验收标准、收货人授权",
    fund: "仅占用预算额度，不扣款；超预算或无授权不得定标",
    output: "可报价采购需求",
    next: "进入第6步智能撮合",
  },
  {
    no: 5, icon: "💬", title: "询报价、议价与定标确认单", kind: "基础必签", steps: "第6、7步",
    parties: "供货商 ↔ 采购商",
    signer: "供货商企业CA确认最终报价；采购商企业CA确认定标结果",
    order: "供方锁价 → 采购方定标；每轮版本只读留痕",
    trigger: "双方就价格、数量、运费、账期和交付条件达成一致",
    mode: "成交条件摘要双签",
    clauses: "含税单价、数量、运费承担、交期、结算模型；采用账期时写明确定天数、起算事件、准确到期日、额度、争议款和逾期责任",
    attachments: "历次报价、询盘记录、评标报告、关联关系披露",
    fund: "可生成保证金规则，但未签主合同前不得扣划货款",
    output: "唯一成交确认版本",
    next: "触发第8步订单生成",
  },
  {
    no: 6, icon: "📜", title: "B2B农产品购销主合同", kind: "基础必签", steps: "第8—10步",
    parties: "采购商 ↔ 供货商",
    signer: "双方有权签约人以企业CA电子印章签署",
    order: "供方先签 → 采购方复核订单快照后签；重大订单可配置双人会签",
    trigger: "订单人工复核放行，身份、报价、批次和税务口径一致",
    mode: "双方企业CA顺序签署",
    clauses: "主体、标的、数量、质量、价税、交付、验收、付款、违约、不可抗力、争议解决及通知送达",
    attachments: "订单快照、成交确认单、质量附件、履约计划、适用的支付/账期附件、费用清单",
    fund: "主合同生效后生成与所选模型一致的支付或账期计划；即时支付指令金额须与合同条件一致",
    output: "生效主合同 + 合同哈希",
    next: "放行第11步付款、机构监管或账期生效",
  },
  {
    no: 7, icon: "🏦", title: "支付、机构监管与账期授权附件", kind: "基础必签", steps: "第10、11、16步",
    parties: "采购商、供货商；主办银行/持牌支付机构（选择其产品时）",
    signer: "买卖双方企业CA；涉及机构产品的，由该机构按业务规则受理/确认",
    order: "买卖双方确认结算模型 → 账期授信或持牌机构按适用情形受理",
    trigger: "主合同生效、收付款账户核验通过且四种结算模型已明确选择其一",
    mode: "双方CA签署 + 机构侧授权/受理（适用时）",
    clauses: "付款比例、付款节点、账户、回单、退款；账期须写确定天数、起算事件、准确到期日、额度、争议金额、逾期责任和保理衔接；监管模式须对应真实机构产品",
    attachments: "同名对公账户回执、支付或账期计划、授信批复（适用时）、机构产品协议（适用时）",
    fund: "直接对公、验收即付、授信账期或机构监管按合同执行；平台不设资金池、不收货款、不做二次清算",
    output: "可执行支付指令或账期生效记录 + 资金规则快照",
    next: "满足本单约定的付款/授信前置条件后触发第12步履约",
  },
  {
    no: 8, icon: "🧪", title: "质量标准、抽检与验收规则附件", kind: "基础必签", steps: "第10、12、14步",
    parties: "采购商 ↔ 供货商；必要时第三方检测机构确认",
    signer: "买卖双方企业CA，与主合同骑缝绑定；检测机构按服务委托确认",
    order: "供方确认可交付 → 采购方确认验收口径",
    trigger: "主合同生成前，按品类自动选择国标/行标/团标及双方加严项",
    mode: "不可拆分合同附件双签",
    clauses: "抽样方法、检测项目、等级容差、复磅、温控、留样、异议期、复检机构和不合格处置",
    attachments: "品类标准、抽检方案、检测项目表、验收表、留样与影像规范",
    fund: "验收结果直接决定正常释放、部分释放或争议冻结金额",
    output: "机器可判定的验收规则",
    next: "约束第12—16步履约和结算",
  },
  {
    no: 9, icon: "📦", title: "仓储质检与出库服务单", kind: "履约生成", steps: "第12步",
    parties: "供货商 ↔ 仓储/质检服务商；采购商可见",
    signer: "供货商与服务商企业CA或经授权业务电子签名",
    order: "服务委托确认 → 实际作业完成确认",
    trigger: "本单约定的付款/授信前置条件完成并锁定具体批次",
    mode: "任务单发起签 + 完工回执签",
    clauses: "批次、库位、称重、抽检、包装、损耗、费用、责任边界和异常暂停",
    attachments: "入/出库单、称重单、质检报告、影像、操作日志",
    fund: "作业完成证据是履约继续条件；服务费按合同清单进入待结算",
    output: "合格出库批次证据包",
    next: "放行第13步运输",
  },
  {
    no: 10, icon: "🚚", title: "冷链运输与交付协议/电子运单", kind: "履约生成", steps: "第13步",
    parties: "托运方 ↔ 承运方 ↔ 收货方",
    signer: "托运、承运企业CA签署；司机/交接人实名业务签收；收货方到货确认",
    order: "托运委托 → 承运接单 → 交接签收",
    trigger: "出库合格且车辆、司机、线路和温控设备核验通过",
    mode: "多角色事件驱动签署",
    clauses: "车型、路线、时效、温区、开箱、货损、保价、保险、异常上报和交接责任",
    attachments: "电子运单、车辆与司机证照、温控曲线、轨迹、交接影像",
    fund: "偏航、失温、超时或异常开箱自动暂停相应货款释放并触发报案",
    output: "连续在途证据链",
    next: "到货后触发第14步验收",
  },
  {
    no: 11, icon: "✅", title: "到货验收、差异与对账确认单", kind: "履约生成", steps: "第14、15步",
    parties: "采购商 ↔ 供货商；第三方检测/仓储按事实确认",
    signer: "采购验收人按授权电子签名，买卖双方企业CA确认差异与结算口径",
    order: "收货验收 → 差异确认 → 双方对账",
    trigger: "电子运单到货；按一车、一批或一次交付自动生成",
    mode: "事件签收 + 差异双签",
    clauses: "实收数量、等级、温控、抽检、拒收/折价、补货、异议和对账金额",
    attachments: "签收单、复磅单、检测报告、影像、差异单、复检结论",
    fund: "正常部分转待释放，差异部分继续冻结；不得以沉默自动无条件验收",
    output: "可结算验收结果",
    next: "触发第15步发票对账",
  },
  {
    no: 12, icon: "🧾", title: "发票、费用与银行分账结算确认单", kind: "履约生成", steps: "第15、16步",
    parties: "采购商 ↔ 供货商；服务方列示；银行执行",
    signer: "买卖双方企业CA确认结算清单；资金指令岗按权限签发",
    order: "四流核验 → 双方对账 → 资金岗发指令 → 银行回单",
    trigger: "验收结果成立、发票合规、费用规则与收款账户一致",
    mode: "双签对账 + 分权资金指令",
    clauses: "货款、税额、服务费、扣款、冻结款、各收款方、放款条件及合计勾稽",
    attachments: "发票、验收单、费用明细、分账表、银行回单",
    fund: "分账总额严格等于本期应结金额；账户变更或合计不平禁止出款",
    output: "银行可执行分账指令 + 回单包",
    next: "正常款结清；保留售后观察期",
  },
  {
    no: 13, icon: "⚖️", title: "售后判责、退款与保险理赔协议", kind: "事件触发", steps: "第17步",
    parties: "采购商、供货商、责任服务方、保险机构（如有）",
    signer: "责任相关企业CA；调解/裁决人员以岗位签名固化过程",
    order: "申诉 → 调证 → 判责/协商 → 各责任方确认 → 资金执行",
    trigger: "质量、数量、时效、温控、票据或付款发生争议",
    mode: "争议事件多方签署",
    clauses: "证据清单、责任比例、退款/补款/赔付金额、执行期限、申诉和终局解决",
    attachments: "合同、检测、称重、温控、影像、沟通记录、判责书、理赔材料",
    fund: "争议金额持续冻结，按生效结论退款、赔付或释放；全程取得银行回单",
    output: "可执行售后结论",
    next: "关闭争议并进入第18步信用回写",
  },
  {
    no: 14, icon: "🔄", title: "交易评价、信用回写与数据使用确认", kind: "事件触发", steps: "第18步",
    parties: "采购商、供货商 ↔ 平台",
    signer: "企业授权经办人确认评价；涉及新增数据用途时由企业CA重新授权",
    order: "订单闭环 → 双方评价 → 信用结果公示/申诉 → 授权范围确认",
    trigger: "结算或售后关闭；数据用途、范围、期限变更时重新触发",
    mode: "完结事件确认 + 数据授权续签",
    clauses: "评价事实、信用指标、申诉纠错、数据用途、最小范围、保存期限和撤回路径",
    attachments: "履约评分、信用变更明细、数据目录、授权记录、审计日志",
    fund: "不直接放款；信用结果影响后续额度、保证金和准入，不追溯改动已结算资金",
    output: "可申诉信用资产 + 数据授权凭证",
    next: "订单闭环并反哺下一轮生产采购",
  },
];

const filters = ["全部14份", "基础必签8份", "履约生成4份", "事件触发2份"];
const filter = ref(0);
const selectedNo = ref(1);
const signedCount = ref(0);
const running = ref(false);
const orderNo = ref("SO-2026-08504");
const signParty = ref<"buyer" | "supplier">("buyer");
const backendSync = ref("");
const backendReady = ref(!productionBuild);
let timer: ReturnType<typeof setInterval> | null = null;

onLoad((q) => {
  if (q?.order) orderNo.value = String(q.order);
  if (q?.party === "supplier") signParty.value = "supplier";
  if (orderNo.value.startsWith("SZGS-")) {
    getTrade(orderNo.value).then((trade) => {
      backendReady.value = true;
      const signatures = trade?.contracts?.[0]?.signatures || [];
      if (signatures.length >= 2) signedCount.value = templates.length;
      backendSync.value = `后台状态：${signatures.length}/2 个主体已签署`;
    }).catch(() => { backendReady.value = false; backendSync.value = "后台状态暂不可读，请先完成登录授权"; });
  }
});

const selected = computed(() => templates.find((item) => item.no === selectedNo.value) || templates[0]);
const visible = computed(() => {
  if (filter.value === 1) return templates.filter((item) => item.kind === "基础必签");
  if (filter.value === 2) return templates.filter((item) => item.kind === "履约生成");
  if (filter.value === 3) return templates.filter((item) => item.kind === "事件触发");
  return templates;
});
const progress = computed(() => Math.round((signedCount.value / templates.length) * 100));
const packState = computed(() => signedCount.value === 14 ? "合同包完整 · 履约可继续" : signedCount.value ? `已完成 ${signedCount.value}/14` : "待逐份签署");

function statusOf(no: number) {
  if (no <= signedCount.value) return "已签署";
  if (no === signedCount.value + 1) return "待签";
  return "待前置";
}
function selectContract(no: number) {
  selectedNo.value = no;
}
function stopRun() {
  if (timer) clearInterval(timer);
  timer = null;
  running.value = false;
}
function runAll() {
  if (productionBuild) return productionBlocked();
  if (running.value) return stopRun();
  signedCount.value = 0;
  selectedNo.value = 1;
  running.value = true;
  timer = setInterval(() => {
    signedCount.value += 1;
    selectedNo.value = Math.min(signedCount.value + 1, 14);
    if (signedCount.value >= templates.length) {
      stopRun();
      uni.showToast({ title: "合同包核验完成", icon: "success" });
    }
  }, 480);
}
function signSelected() {
  if (productionBuild && !orderNo.value.startsWith("SZGS-")) return productionBlocked();
  const item = selected.value;
  if (item.no <= signedCount.value) {
    uni.showToast({ title: "本份已完成签署", icon: "none" });
    return;
  }
  if (item.no !== signedCount.value + 1) {
    uni.showModal({
      title: "前置合同尚未完成",
      content: `请先完成第 ${signedCount.value + 1} 份，防止合同、权限、资金和履约顺序脱节。`,
      showCancel: false,
    });
    return;
  }
  uni.showModal({
    title: `签署第${item.no}份`,
    confirmText: "提交核验",
    content: `${item.title}\n\n签署主体：${item.signer}\n签署顺序：${item.order}\n\n未接入真实企业CA与签约服务前，本动作只提交签署前核验，不产生真实合同。`,
    success: (r) => {
      if (!r.confirm) return;
      const syncMainContract = item.no === 6 && orderNo.value.startsWith("SZGS-");
      if (syncMainContract) {
        signTradeContract(orderNo.value, signParty.value).then((result: any) => {
          backendSync.value = `后台状态：${(result?.signatures || []).length}/2 个主体已签署`;
          signedCount.value += 1;
          selectedNo.value = Math.min(signedCount.value + 1, 14);
          uni.showToast({ title: "后台已记录签署", icon: "success" });
        }).catch((error: Error) => uni.showModal({ title: "签署未完成", content: error.message || "后台未接受签署，请勿继续推进交易", showCancel: false }));
        return;
      }
      signedCount.value += 1;
      selectedNo.value = Math.min(signedCount.value + 1, 14);
      uni.showToast({ title: "签署证据已归集", icon: "success" });
    },
  });
}
function goFlow() {
  uni.switchTab({ url: "/pages/trade/index" });
}
function goFulfillment() {
  uni.navigateTo({ url: "/pages/trade/fulfillment" });
}

onUnmounted(stopRun);
</script>

<template>
  <view class="sg-page contract-page">
    <view v-if="productionBuild && !backendReady" class="production-empty">
      <text class="production-empty-title">等待后台合同订单</text>
      <text class="production-empty-text">正式环境需要后台返回真实订单和签署状态后才展示合同包；本地合同示例不会混入生产数据。</text>
    </view>
    <template v-else>
    <view class="hero">
      <view class="hero-top"><text class="hero-k">数智供社 v8533 · 订单 {{ orderNo }}</text><text class="hero-state">{{ packState }}</text></view>
      <text class="hero-t">CA合同包与履约计划</text>
      <text class="hero-s">14份合同模板对应交易主线；每份明确主体、签章、顺序、附件、资金条件和下一步放行规则。</text>
      <text v-if="backendSync" class="hero-sync">{{ backendSync }}</text>
      <view v-if="orderNo.startsWith('SZGS-')" class="party-switch">
        <text class="party-label">本次签署身份</text>
        <text class="party-chip" :class="{ on: signParty === 'buyer' }" @tap="signParty = 'buyer'">采购方</text>
        <text class="party-chip" :class="{ on: signParty === 'supplier' }" @tap="signParty = 'supplier'">供货方</text>
      </view>
      <view class="metrics">
        <view><text class="metric-n">14</text><text class="metric-l">合同模板</text></view>
        <view><text class="metric-n">主线</text><text class="metric-l">交易步骤</text></view>
        <view><text class="metric-n">7</text><text class="metric-l">签约动作</text></view>
        <view><text class="metric-n">{{ progress }}%</text><text class="metric-l">签署准备</text></view>
      </view>
      <view class="progress"><view :style="{ width: progress + '%' }"></view></view>
      <view class="hero-btns">
        <view class="hero-btn secondary" @tap="goFlow">返回交易大厅</view>
        <view class="hero-btn" :class="{ running }" @tap="runAll">{{ running ? "暂停核验" : (signedCount === 14 ? "重新核验合同包" : "核验合同包") }}</view>
      </view>
    </view>

    <view class="rule-note">
      <text class="rule-icon">🔐</text>
      <view><text class="rule-t">签约口径已纠正</text><text class="rule-s">CA数字证书与可靠电子签名完成主体签署；人脸/短信用于核验身份和意愿，可信时间戳、哈希及审计日志用于补强证据，不能互相替代。</text></view>
    </view>

    <scroll-view scroll-x class="filters">
      <view class="filter-row">
        <view v-for="(item, i) in filters" :key="item" class="filter" :class="{ on: filter === i }" @tap="filter = i">{{ item }}</view>
      </view>
    </scroll-view>

    <view class="section-head">
      <view><text class="section-t">合同—流程映射清单</text><text class="section-s">按顺序签署，后续合同不能绕过前置授权与交易条件</text></view>
      <text class="section-count">{{ visible.length }}份</text>
    </view>

    <view class="contract-list">
      <view
        v-for="item in visible"
        :key="item.no"
        class="contract-item"
        :class="{ active: selectedNo === item.no, done: item.no <= signedCount }"
        @tap="selectContract(item.no)"
      >
        <view class="contract-no">{{ item.no <= signedCount ? "✓" : item.no }}</view>
        <view class="contract-main">
          <view class="contract-line"><text class="contract-title">{{ item.icon }} {{ item.title }}</text><text class="status" :class="{ done: item.no <= signedCount, ready: item.no === signedCount + 1 }">{{ statusOf(item.no) }}</text></view>
          <view class="contract-tags"><text>{{ item.kind }}</text><text>{{ item.steps }}</text></view>
          <text class="contract-party">{{ item.parties }}</text>
        </view>
      </view>
    </view>

    <view class="detail-card">
      <view class="detail-head">
        <view><text class="detail-k">第{{ selected.no }}份 · {{ selected.kind }} · {{ selected.steps }}</text><text class="detail-title">{{ selected.icon }} {{ selected.title }}</text></view>
        <text class="detail-status">{{ statusOf(selected.no) }}</text>
      </view>
      <view class="detail-row"><text class="detail-label">签署各方</text><text class="detail-value">{{ selected.parties }}</text></view>
      <view class="detail-row"><text class="detail-label">签章主体</text><text class="detail-value">{{ selected.signer }}</text></view>
      <view class="detail-row"><text class="detail-label">签署顺序</text><text class="detail-value">{{ selected.order }}</text></view>
      <view class="detail-row"><text class="detail-label">触发条件</text><text class="detail-value">{{ selected.trigger }}</text></view>
      <view class="detail-row"><text class="detail-label">线上模式</text><text class="detail-value">{{ selected.mode }}</text></view>
      <view class="detail-row"><text class="detail-label">核心条款</text><text class="detail-value">{{ selected.clauses }}</text></view>
      <view class="detail-row"><text class="detail-label">证据附件</text><text class="detail-value">{{ selected.attachments }}</text></view>
      <view class="detail-row fund"><text class="detail-label">资金控制</text><text class="detail-value">{{ selected.fund }}</text></view>
      <view class="detail-row output"><text class="detail-label">签署产物</text><text class="detail-value">{{ selected.output }}</text></view>
      <view class="next-box"><text>下一步放行</text><text>{{ selected.next }}</text></view>
      <view class="sign-btn" :class="{ disabled: selected.no > signedCount + 1 }" @tap="signSelected">
        {{ selected.no <= signedCount ? "查看签署证据" : (selected.no === signedCount + 1 ? "核验身份与权限 · 提交签署申请" : `请先签第${signedCount + 1}份`) }}
      </view>
    </view>

    <view class="section-head">
      <view><text class="section-t">单份线上签约的7个动作</text><text class="section-s">每一份合同均复用同一证据标准，不让签署与业务状态脱节</text></view>
    </view>
    <view class="pipeline">
      <view v-for="(item, i) in [
        ['生成', '从订单不可变快照生成正文与附件'],
        ['锁版', '固化模板版本、正文哈希和关键条款摘要'],
        ['验权', '校验签约人授权、企业证书状态与用章权限'],
        ['明示', '展示价款、交付、验收、资金、违约等重点条款并确认意愿'],
        ['签章', '按顺序调用企业CA章/个人可靠电子签名'],
        ['验签', '校验证书链、签名值和文档完整性，附可信时间证明'],
        ['归档', '合同、证书、授权、日志、哈希和验证报告形成证据包并驱动下一步']
      ]" :key="item[0]" class="pipe">
        <view class="pipe-no">{{ i + 1 }}</view>
        <view><text class="pipe-t">{{ item[0] }}</text><text class="pipe-s">{{ item[1] }}</text></view>
      </view>
    </view>

    <view class="evidence-card">
      <text class="evidence-t">一份完整的签约证据包</text>
      <view class="evidence-grid">
        <text>合同正文及全部附件</text><text>模板版本与文件哈希</text>
        <text>双方身份与授权快照</text><text>签署意愿确认记录</text>
        <text>证书链与证书状态</text><text>签名验证报告</text>
        <text>可信时间证明</text><text>全流程操作审计日志</text>
      </view>
    </view>

    <view class="legal-card">
      <text class="legal-t">正式上线边界</text>
      <text class="legal-s">未接入真实企业CA与签约服务前，本页只做合同包准备和签署前核验，不直接签发真实合同。正式使用须接入依法许可的电子认证服务机构，完成真实身份、签约权限、证书状态、签署意愿和文档防篡改校验，并由法律顾问结合具体品类、地域、交易模式及持牌资金机构规则审定文本。</text>
      <text class="legal-law">依据提示：《电子签名法》第13、14条；《民法典》第469、470条。满足可靠电子签名条件时，电子签名与手写签名或盖章具有同等法律效力。</text>
    </view>

    <view class="bottom-action">
      <view class="bottom-ghost" @tap="goFulfillment">进入履约计划</view>
      <view class="bottom-main" @tap="signSelected">{{ signedCount === 14 ? "合同包已完整" : `继续签署 ${signedCount + 1}/14` }}</view>
    </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.contract-page { padding-bottom: 150rpx; background: #f3f6f5; }
.production-empty { margin: 48rpx 24rpx; padding: 34rpx 28rpx; border: 2rpx solid #d8e7de; border-radius: 22rpx; background: #f7fbf8; }
.production-empty-title { display: block; color: #145d3c; font-size: 32rpx; font-weight: 900; }
.production-empty-text { display: block; margin-top: 16rpx; color: #5e7167; font-size: 24rpx; line-height: 1.7; }
.hero-sync { display: block; margin-top: 10rpx; color: #d7f7e6; font-size: 20rpx; }
.party-switch { display: flex; align-items: center; gap: 12rpx; margin-top: 14rpx; }
.party-label { color: rgba(255,255,255,.78); font-size: 20rpx; }
.party-chip { padding: 8rpx 18rpx; border-radius: 999rpx; color: rgba(255,255,255,.78); border: 1rpx solid rgba(255,255,255,.45); font-size: 20rpx; }
.party-chip.on { color: $sg-primary-deep; background: #fff; border-color: #fff; font-weight: 700; }
.hero { margin: 0 0 22rpx; padding: 30rpx 26rpx 28rpx; color: #fff; background: linear-gradient(145deg, #0c5737, #16884c 58%, #22a864); border-radius: 0 0 34rpx 34rpx; box-shadow: 0 16rpx 40rpx rgba(15, 103, 62, .22); }
.hero-top { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.hero-k { font-size: 20rpx; opacity: .82; }
.hero-state { padding: 6rpx 12rpx; border-radius: 999rpx; background: rgba(255,255,255,.16); font-size: 18rpx; white-space: nowrap; }
.hero-t { display: block; margin-top: 16rpx; font-size: 39rpx; font-weight: 900; letter-spacing: 1rpx; }
.hero-s { display: block; margin-top: 12rpx; font-size: 22rpx; line-height: 1.65; opacity: .9; }
.metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8rpx; margin-top: 22rpx; }
.metrics>view { display: flex; flex-direction: column; align-items: center; padding: 13rpx 4rpx; border-radius: 14rpx; background: rgba(255,255,255,.12); }
.metric-n { font-size: 28rpx; font-weight: 900; }
.metric-l { margin-top: 3rpx; font-size: 17rpx; opacity: .8; }
.progress { height: 8rpx; margin-top: 18rpx; overflow: hidden; border-radius: 999rpx; background: rgba(255,255,255,.18); }
.progress>view { height: 100%; border-radius: 999rpx; background: #f7c85c; transition: width .35s; }
.hero-btns { display: flex; gap: 14rpx; margin-top: 20rpx; }
.hero-btn { flex: 1; padding: 18rpx 8rpx; border-radius: 14rpx; color: #145c3b; background: #fff; text-align: center; font-size: 23rpx; font-weight: 800; }
.hero-btn.secondary { color: #fff; background: rgba(255,255,255,.14); border: 1rpx solid rgba(255,255,255,.24); }
.hero-btn.running { color: #8a5b00; background: #fff2cc; }
.rule-note { display: flex; gap: 16rpx; margin: 0 24rpx 20rpx; padding: 20rpx; border: 2rpx solid #d9e8ff; border-radius: 18rpx; background: #f7fbff; }
.rule-icon { font-size: 34rpx; }
.rule-note>view { flex: 1; display: flex; flex-direction: column; }
.rule-t { color: #245177; font-size: 24rpx; font-weight: 800; }
.rule-s { margin-top: 5rpx; color: #53708a; font-size: 20rpx; line-height: 1.55; }
.filters { white-space: nowrap; }
.filter-row { display: inline-flex; gap: 12rpx; padding: 2rpx 24rpx 16rpx; }
.filter { padding: 13rpx 20rpx; border-radius: 999rpx; color: $sg-text-2; background: #fff; box-shadow: 0 5rpx 18rpx rgba(30,50,40,.06); font-size: 21rpx; }
.filter.on { color: #fff; background: $sg-primary; }
.section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 18rpx; margin: 14rpx 24rpx 16rpx; }
.section-head>view { display: flex; flex-direction: column; }
.section-t { color: $sg-text; font-size: 29rpx; font-weight: 900; }
.section-s { margin-top: 5rpx; color: $sg-text-3; font-size: 19rpx; line-height: 1.45; }
.section-count { color: $sg-primary; font-size: 21rpx; white-space: nowrap; }
.contract-list { margin: 0 24rpx; overflow: hidden; border-radius: 20rpx; background: #fff; box-shadow: 0 8rpx 28rpx rgba(30,50,40,.06); }
.contract-item { display: flex; gap: 15rpx; padding: 18rpx; border-bottom: 2rpx solid #f1f3f2; }
.contract-item:last-child { border-bottom: 0; }
.contract-item.active { background: #f1faf5; box-shadow: inset 6rpx 0 $sg-primary; }
.contract-no { flex: none; width: 43rpx; height: 43rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: $sg-text-3; background: #eef1ef; font-size: 19rpx; font-weight: 800; }
.contract-item.done .contract-no { color: #fff; background: $sg-primary; }
.contract-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.contract-line { display: flex; justify-content: space-between; gap: 10rpx; }
.contract-title { flex: 1; color: $sg-text; font-size: 23rpx; font-weight: 800; }
.status { flex: none; color: $sg-text-3; font-size: 18rpx; }
.status.ready { color: #b5791b; font-weight: 800; }
.status.done { color: $sg-primary; font-weight: 800; }
.contract-tags { display: flex; gap: 8rpx; margin-top: 8rpx; }
.contract-tags text { padding: 3rpx 9rpx; border-radius: 6rpx; color: $sg-primary; background: $sg-primary-light; font-size: 17rpx; }
.contract-party { margin-top: 7rpx; color: $sg-text-3; font-size: 19rpx; }
.detail-card { margin: 22rpx 24rpx; padding: 24rpx; border-radius: 22rpx; background: #fff; box-shadow: 0 8rpx 28rpx rgba(30,50,40,.07); }
.detail-head { display: flex; justify-content: space-between; gap: 15rpx; padding-bottom: 18rpx; border-bottom: 2rpx solid $sg-border; }
.detail-head>view { display: flex; flex-direction: column; }
.detail-k { color: $sg-primary; font-size: 19rpx; }
.detail-title { margin-top: 6rpx; color: $sg-text; font-size: 29rpx; font-weight: 900; }
.detail-status { color: #b5791b; font-size: 20rpx; white-space: nowrap; }
.detail-row { display: flex; gap: 14rpx; padding: 14rpx 0; border-bottom: 2rpx dashed #edf0ee; }
.detail-label { flex: 0 0 104rpx; color: $sg-text-3; font-size: 20rpx; }
.detail-value { flex: 1; color: $sg-text-2; font-size: 21rpx; line-height: 1.55; }
.detail-row.fund { margin: 8rpx 0 0; padding: 14rpx; border: 0; border-radius: 12rpx; background: #fff7e8; }
.detail-row.fund .detail-label, .detail-row.fund .detail-value { color: #8a631a; }
.detail-row.output { border-bottom: 0; }
.next-box { display: flex; flex-direction: column; gap: 5rpx; margin-top: 8rpx; padding: 17rpx; border-radius: 14rpx; color: #235478; background: #eef7ff; }
.next-box text:first-child { font-size: 18rpx; opacity: .7; }
.next-box text:last-child { font-size: 22rpx; font-weight: 800; }
.sign-btn { margin-top: 18rpx; padding: 21rpx 10rpx; border-radius: 999rpx; color: #fff; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); text-align: center; font-size: 24rpx; font-weight: 800; }
.sign-btn.disabled { color: $sg-text-3; background: #edf0ee; }
.pipeline { margin: 0 24rpx 22rpx; padding: 8rpx 22rpx; border-radius: 22rpx; background: #fff; box-shadow: 0 8rpx 28rpx rgba(30,50,40,.06); }
.pipe { display: flex; gap: 15rpx; padding: 16rpx 0; border-bottom: 2rpx solid #f0f2f1; }
.pipe:last-child { border-bottom: 0; }
.pipe-no { flex: none; width: 39rpx; height: 39rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; background: $sg-primary; font-size: 18rpx; font-weight: 800; }
.pipe>view:last-child { flex: 1; display: flex; flex-direction: column; }
.pipe-t { color: $sg-text; font-size: 22rpx; font-weight: 800; }
.pipe-s { margin-top: 4rpx; color: $sg-text-3; font-size: 19rpx; line-height: 1.5; }
.evidence-card { margin: 0 24rpx 22rpx; padding: 22rpx; border-radius: 22rpx; color: #fff; background: linear-gradient(135deg, #243a52, #345d74); }
.evidence-t { display: block; font-size: 27rpx; font-weight: 900; }
.evidence-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10rpx; margin-top: 15rpx; }
.evidence-grid text { padding: 12rpx; border-radius: 10rpx; background: rgba(255,255,255,.1); font-size: 18rpx; }
.legal-card { margin: 0 24rpx; padding: 22rpx; border: 2rpx solid #efdfb8; border-radius: 20rpx; background: #fffaf0; }
.legal-t { display: block; color: #8a631a; font-size: 25rpx; font-weight: 900; }
.legal-s, .legal-law { display: block; margin-top: 8rpx; color: #76654b; font-size: 19rpx; line-height: 1.6; }
.legal-law { color: #6c593a; font-weight: 700; }
.bottom-action { position: fixed; left: 0; right: 0; bottom: 0; z-index: 9; display: flex; gap: 14rpx; padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom)); background: rgba(255,255,255,.96); box-shadow: 0 -5rpx 24rpx rgba(20,50,35,.08); }
.bottom-ghost, .bottom-main { padding: 22rpx 10rpx; border-radius: 999rpx; text-align: center; font-size: 23rpx; font-weight: 800; }
.bottom-ghost { flex: 0 0 34%; color: $sg-primary; background: $sg-primary-light; }
.bottom-main { flex: 1; color: #fff; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); }
</style>
