<script setup lang="ts">
import { computed, ref } from "vue";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

type AuditState = "idle" | "running" | "passed" | "review" | "blocked";
type CheckState = "verified" | "manual" | "missing";

interface Requirement {
  name: string;
  source: string;
  state: CheckState;
  note: string;
}

interface MerchantCategory {
  key: string;
  icon: string;
  name: string;
  applicant: string;
  creditCode: string;
  permitNo: string;
  scope: string;
  score: number;
  result: Exclude<AuditState, "idle" | "running">;
  reason: string;
  requirements: Requirement[];
}

interface OperatorRecord {
  key: string;
  icon: string;
  type: "农机手" | "农用无人机操作员";
  name: string;
  idNo: string;
  certNo: string;
  machine: string;
  expiry: string;
  score: number;
  result: Exclude<AuditState, "idle" | "running">;
  reason: string;
  checks: Requirement[];
}

const mode = ref<"merchant" | "operator">("merchant");
const merchantIndex = ref(0);
const operatorIndex = ref(0);
const auditState = ref<AuditState>("idle");
const auditStep = ref(0);
const filed = ref<string[]>(uni.getStorageSync("agri-qualification-filed-v8533") || []);
const auditLog = ref<string[]>([]);

const merchantSteps = [
  "OCR识别证照与统一社会信用代码",
  "企业实名、法定代表人与存续状态核验",
  "监管许可编号、发证机关与许可范围联查",
  "证照有效期、经营地址和仓储条件校验",
  "商品登记/备案、标签与授权链抽检",
  "失信、处罚、召回和异常经营风险扫描",
  "生成准入结论、有效期和人工复核任务",
];

const operatorSteps = [
  "实名身份与年龄条件核验",
  "操作证/驾驶证编号和发证主体联查",
  "准驾机型、作业类别和证件状态比对",
  "设备登记、号牌/实名登记与人员绑定",
  "培训考核、保险和安全责任书校验",
  "事故、违章和平台履约记录扫描",
  "生成电子备案卡和动态预警任务",
];

const merchants = ref<MerchantCategory[]>([
  {
    key: "seed", icon: "🌱", name: "种子经营商", applicant: "赣南丰穗种业有限公司",
    creditCode: "91360722MA38****6D", permitNo: "D(赣赣)农种许字(2025)第0068号",
    scope: "非主要农作物种子批发、零售；赣南区域", score: 94, result: "passed",
    reason: "主体、许可证主副证、品种审定/登记编号及经营范围一致，可自动准入。",
    requirements: [
      { name: "营业执照与企业存续状态", source: "市场监管企业信息", state: "verified", note: "名称、信用代码、法人一致" },
      { name: "农作物种子生产经营许可证", source: "农业农村主管部门许可数据", state: "verified", note: "主证有效，许可区域匹配" },
      { name: "许可证副证与品种审定/登记", source: "种业监管信息", state: "verified", note: "8个在售品种均在许可清单" },
      { name: "种子标签、质量检验与追溯码", source: "商品批次材料", state: "verified", note: "抽检批次合格" },
      { name: "委托代销或品牌授权链", source: "CA签章授权书", state: "verified", note: "授权链完整" },
    ],
  },
  {
    key: "pesticide", icon: "🧴", name: "农药经营商", applicant: "绿盾植保农资服务部",
    creditCode: "92360722MA39****8Q", permitNo: "农药经许(赣)36072220****",
    scope: "农药经营（不含限制使用农药）", score: 72, result: "review",
    reason: "主体许可证有效，但申报商品中含1项限制使用农药，超出许可范围，转县级人工复核并冻结该商品。",
    requirements: [
      { name: "营业执照与经营主体", source: "市场监管企业信息", state: "verified", note: "主体一致" },
      { name: "农药经营许可证", source: "农药管理信息", state: "verified", note: "有效至2028-06-30" },
      { name: "限制使用农药经营范围", source: "许可范围与SKU比对", state: "manual", note: "1个SKU疑似超范围" },
      { name: "经营人员专业学习经历", source: "学历/56学时培训材料", state: "verified", note: "人员条件符合" },
      { name: "营业仓储场所与安全设施", source: "地址、影像和现场核验", state: "manual", note: "仓库影像需复核" },
      { name: "产品登记证、标签与批次", source: "农药登记数据", state: "verified", note: "其余12个SKU一致" },
    ],
  },
  {
    key: "fertilizer", icon: "🧪", name: "肥料经营商", applicant: "沃土绿色农资有限公司",
    creditCode: "91360722MA37****2K", permitNo: "肥登(2024)临字第1288号",
    scope: "复合肥、水溶肥、有机肥销售", score: 91, result: "passed",
    reason: "企业状态正常，在售肥料登记/备案、执行标准、检验报告和标签信息一致。",
    requirements: [
      { name: "营业执照与经营范围", source: "市场监管企业信息", state: "verified", note: "经营范围匹配" },
      { name: "肥料产品登记或备案", source: "农业农村部肥料数据", state: "verified", note: "9个SKU均可核验" },
      { name: "执行标准与出厂检验报告", source: "产品批次材料", state: "verified", note: "指标和批次一致" },
      { name: "包装标签与宣传用语", source: "OCR合规审查", state: "verified", note: "未发现夸大宣传" },
      { name: "生产厂家/经销授权", source: "CA签章授权书", state: "verified", note: "授权有效" },
    ],
  },
  {
    key: "machine", icon: "🚜", name: "农机具商家", applicant: "供销农机装备服务有限公司",
    creditCode: "91360722MA35****9P", permitNo: "经销授权 GX-2026-018",
    scope: "拖拉机、联合收割机、植保机械销售及维修", score: 88, result: "passed",
    reason: "主体、产品合格证明、适用强制性认证、厂家授权和售后能力均已核验。",
    requirements: [
      { name: "营业执照与经营范围", source: "市场监管企业信息", state: "verified", note: "销售维修范围匹配" },
      { name: "产品合格证与适用认证", source: "产品/认证数据", state: "verified", note: "机型目录一致" },
      { name: "厂家经销授权与进货票据", source: "CA授权及电子发票", state: "verified", note: "授权链完整" },
      { name: "机具唯一编号与可登记性", source: "农机产品及牌证规则", state: "verified", note: "抽检机型可追溯" },
      { name: "维修网点、配件与售后承诺", source: "服务能力材料", state: "verified", note: "2个县域服务点" },
    ],
  },
  {
    key: "drone", icon: "🛸", name: "无人机服务商", applicant: "赣南飞防科技服务有限公司",
    creditCode: "91360722MA3A****5X", permitNo: "农用无人机服务备案 GN-F-2026-031",
    scope: "常规农用无人驾驶航空器植保飞防", score: 79, result: "review",
    reason: "企业与人员基本合格，1架设备UOM所有人信息变更未同步，暂停该设备派单并转人工复核。",
    requirements: [
      { name: "营利法人及经营范围", source: "市场监管企业信息", state: "verified", note: "主体有效" },
      { name: "无人机实名登记与唯一识别码", source: "UOM登记材料", state: "manual", note: "1架设备所有人待更新" },
      { name: "设备合格证明和适用标准", source: "生产厂家设备档案", state: "verified", note: "3架设备可核验" },
      { name: "农用无人机操作证与机型", source: "生产者培训考核记录", state: "verified", note: "2名操作员机型匹配" },
      { name: "责任保险与作业安全制度", source: "保单和制度材料", state: "verified", note: "保险有效" },
      { name: "作业区域与飞行活动要求", source: "空域规则和作业计划", state: "manual", note: "每次作业前动态校验" },
    ],
  },
  {
    key: "other", icon: "📦", name: "其他农业投入品", applicant: "兴农综合投入品供应站",
    creditCode: "92360722MA38****1M", permitNo: "综合经营备案 XN-2026-102",
    scope: "农膜、滴灌、饲料及兽药零售", score: 66, result: "blocked",
    reason: "兽药经营许可缺失。农膜、滴灌可单独准入，兽药SKU禁止上架，补证后重新审核。",
    requirements: [
      { name: "营业执照与分类经营范围", source: "市场监管企业信息", state: "verified", note: "主体有效" },
      { name: "兽药经营许可证", source: "兽药监管数据", state: "missing", note: "未提交、未联查到" },
      { name: "饲料产品批准/备案信息", source: "饲料产品数据", state: "verified", note: "4个SKU可核验" },
      { name: "农膜、滴灌产品质量材料", source: "商品批次材料", state: "verified", note: "抽检材料齐全" },
    ],
  },
]);

const operators = ref<OperatorRecord[]>([
  {
    key: "tractor", icon: "🚜", type: "农机手", name: "王海强", idNo: "360722********3816",
    certNo: "赣07拖联驾字2024****", machine: "轮式拖拉机G2、联合收割机R", expiry: "2029-08-18",
    score: 96, result: "passed", reason: "驾驶证状态正常、准驾机型匹配，机具登记和检验有效，可自动备案。",
    checks: [
      { name: "实名身份与年龄", source: "身份核验", state: "verified", note: "38岁，身份一致" },
      { name: "拖拉机和联合收割机驾驶证", source: "县级农机监理材料", state: "verified", note: "有效至2029-08-18" },
      { name: "准驾机型与本次作业", source: "证载范围比对", state: "verified", note: "G2、R匹配" },
      { name: "机具登记、号牌与检验", source: "农机牌证档案", state: "verified", note: "2台设备有效" },
      { name: "保险、安全培训与责任书", source: "平台备案材料", state: "verified", note: "全部有效" },
    ],
  },
  {
    key: "drone-ok", icon: "🛸", type: "农用无人机操作员", name: "周小玲", idNo: "360722********1428",
    certNo: "AGR-UAS-DJI-2025-08****", machine: "T60/T70 常规农用无人机",
    expiry: "长期有效", score: 94, result: "passed", reason: "生产者培训考核合格，操作证、机型、设备实名登记和保险均匹配，可自动备案。",
    checks: [
      { name: "实名身份与完全民事行为能力", source: "身份核验", state: "verified", note: "身份一致" },
      { name: "农用无人机操作证", source: "生产者培训考核档案", state: "verified", note: "三科均≥80分" },
      { name: "操作证与设备机型匹配", source: "厂家机型授权数据", state: "verified", note: "T60/T70匹配" },
      { name: "航空器实名登记标志", source: "UOM登记材料", state: "verified", note: "设备与服务商绑定" },
      { name: "作业责任险与安全记录", source: "保险/平台履约数据", state: "verified", note: "无事故，保单有效" },
    ],
  },
  {
    key: "drone-risk", icon: "⚠️", type: "农用无人机操作员", name: "张某某", idNo: "360722********2063",
    certNo: "AGR-UAS-OTHER-2024-01****", machine: "申报T70，操作证载明其他厂家机型",
    expiry: "长期有效", score: 58, result: "blocked", reason: "操作证与申报设备生产企业/机型不匹配，且设备实名登记材料缺失，禁止派单。",
    checks: [
      { name: "实名身份", source: "身份核验", state: "verified", note: "身份一致" },
      { name: "农用无人机操作证", source: "生产者培训考核档案", state: "verified", note: "证件本身有效" },
      { name: "操作证与设备机型匹配", source: "厂家机型授权数据", state: "missing", note: "跨厂家机型未完成实操考核" },
      { name: "航空器实名登记标志", source: "UOM登记材料", state: "missing", note: "未提交" },
      { name: "作业责任险", source: "保险材料", state: "manual", note: "保单影像待验真" },
    ],
  },
]);

const merchant = computed(() => merchants.value[merchantIndex.value]);
const operator = computed(() => operators.value[operatorIndex.value]);
const currentResult = computed(() => mode.value === "merchant" ? merchant.value.result : operator.value.result);
const currentScore = computed(() => mode.value === "merchant" ? merchant.value.score : operator.value.score);
const currentReason = computed(() => mode.value === "merchant" ? merchant.value.reason : operator.value.reason);
const currentChecks = computed(() => mode.value === "merchant" ? merchant.value.requirements : operator.value.checks);
const verifiedCount = computed(() => currentChecks.value.filter((x) => x.state === "verified").length);
const steps = computed(() => mode.value === "merchant" ? merchantSteps : operatorSteps);
const progress = computed(() => auditState.value === "idle" ? 0 : Math.min(100, Math.round(auditStep.value / steps.value.length * 100)));
const resultText = computed(() => currentResult.value === "passed" ? "自动通过" : currentResult.value === "review" ? "转人工复核" : "禁止准入");
const resultClass = computed(() => currentResult.value);
const filingKey = computed(() => `${mode.value}-${mode.value === "merchant" ? merchant.value.key : operator.value.key}`);
const isFiled = computed(() => filed.value.includes(filingKey.value));

function selectMerchant(i: number) { merchantIndex.value = i; resetAudit(); }
function selectOperator(i: number) { operatorIndex.value = i; resetAudit(); }
function changeMode(next: "merchant" | "operator") { mode.value = next; resetAudit(); }
function resetAudit() { auditState.value = "idle"; auditStep.value = 0; auditLog.value = []; }
function runAudit() {
  if (productionBuild) return uni.showModal({ title: "需要资质审核服务", content: "正式环境的农资商家、农机手和无人机操作员资质必须由后台审核并留存证据，当前未执行本地自动通过。", showCancel: false });
  if (auditState.value === "running") return;
  auditState.value = "running";
  auditStep.value = 0;
  auditLog.value = [];
  const timer = setInterval(() => {
    const i = auditStep.value;
    if (i < steps.value.length) {
      auditLog.value.unshift(`${new Date().toLocaleTimeString("zh-CN", { hour12: false })}　${steps.value[i]}：完成`);
      auditStep.value++;
    }
    if (auditStep.value >= steps.value.length) {
      clearInterval(timer);
      auditState.value = currentResult.value;
      uni.showToast({ title: resultText.value, icon: currentResult.value === "passed" ? "success" : "none" });
    }
  }, 420);
}
function fileRecord() {
  if (auditState.value !== "passed") {
    uni.showModal({ title: "暂不能备案", content: "只有自动审核通过或人工复核通过后才能生成有效备案卡。", showCancel: false });
    return;
  }
  if (!filed.value.includes(filingKey.value)) {
    filed.value.push(filingKey.value);
    uni.setStorageSync("agri-qualification-filed-v8533", filed.value);
  }
  uni.showModal({
    title: "备案成功",
    content: `${mode.value === "merchant" ? merchant.value.applicant : operator.value.name}\n备案编号：SZGS-${new Date().getFullYear()}-${String(merchantIndex.value + operatorIndex.value + 31).padStart(4, "0")}\n已启用证照到期90/30/7天预警和经营范围动态复核。`,
    showCancel: false,
  });
}
function manualReview() {
  uni.showModal({
    title: "已生成复核工单",
    content: `工单：RISK-${Date.now().toString().slice(-8)}\n责任方：县级运营审核岗\n材料：疑点证照、监管联查结果、SKU/机型范围差异\n时限：1个工作日\n复核前相关商品或设备保持冻结。`,
    showCancel: false,
  });
}
function showRule() {
  uni.showModal({
    title: "自动审核边界",
    content: "系统只对可联查、可结构化验证的事项自动判定；现场条件、影像真实性、跨区域许可差异和监管接口无返回的情形必须转人工。许可缺失、吊销、过期或明确超范围的，禁止准入。",
    showCancel: false,
  });
}
function machineManager() {
  uni.navigateTo({ url: "/pages/agri/machinery-merchant" });
}
</script>

<template>
  <view class="sg-page qualification">
    <view class="hero">
      <view class="hero-row"><text class="hero-k">数智供社 v8533 · 生产准入风控</text><text class="law" @tap="showRule">审核边界 ›</text></view>
      <text class="hero-t">农资商家与作业人员<br />自动审核备案中心</text>
      <text class="hero-d">证照OCR + 监管联查 + 范围比对 + 风险规则 + 人工复核 + 到期预警；不让无证商家、无证人员和不合规设备进入交易与派单。</text>
      <view class="hero-kpis">
        <view><text class="n">6类</text><text class="d">农资主体</text></view>
        <view><text class="n">2类</text><text class="d">作业人员</text></view>
        <view><text class="n">7步</text><text class="d">自动审核</text></view>
        <view><text class="n">3级</text><text class="d">准入结论</text></view>
      </view>
    </view>

    <view class="mode-tabs">
      <view class="mode" :class="{ on: mode === 'merchant' }" @tap="changeMode('merchant')">🏪 农资商家审核</view>
      <view class="mode" :class="{ on: mode === 'operator' }" @tap="changeMode('operator')">🧑‍🌾 人员资质备案</view>
    </view>

    <block v-if="mode === 'merchant'">
      <scroll-view scroll-x class="cat-scroll">
        <view v-for="(c, i) in merchants" :key="c.key" class="cat" :class="{ on: merchantIndex === i }" @tap="selectMerchant(i)">
          <text class="cat-ic">{{ c.icon }}</text><text class="cat-n">{{ c.name }}</text>
        </view>
      </scroll-view>
      <view class="application">
        <view class="ap-hd"><view><text class="ap-k">商家准入申请</text><text class="ap-n">{{ merchant.applicant }}</text></view><text class="tag" :class="merchant.result">{{ merchant.result === 'passed' ? '低风险' : merchant.result === 'review' ? '中风险' : '高风险' }}</text></view>
        <view class="field"><text>统一社会信用代码</text><input v-model="merchant.creditCode" /></view>
        <view class="field"><text>核心许可证/备案号</text><input v-model="merchant.permitNo" /></view>
        <view class="field"><text>申请经营范围</text><input v-model="merchant.scope" /></view>
      </view>
      <view v-if="merchant.key === 'machine'" class="manager-entry" @tap="machineManager">
        <text>🚜</text><view><text>准入通过后进入农机具管理台</text><text>建立一机一码、权属库存、销售租赁、交机验收与维保召回档案</text></view><text>进入 ›</text>
      </view>
    </block>

    <block v-else>
      <scroll-view scroll-x class="cat-scroll">
        <view v-for="(p, i) in operators" :key="p.key" class="person" :class="{ on: operatorIndex === i }" @tap="selectOperator(i)">
          <text class="cat-ic">{{ p.icon }}</text><view><text class="cat-n">{{ p.name }}</text><text class="person-t">{{ p.type }}</text></view>
        </view>
      </scroll-view>
      <view class="application">
        <view class="ap-hd"><view><text class="ap-k">人员与设备备案申请</text><text class="ap-n">{{ operator.name }} · {{ operator.type }}</text></view><text class="tag" :class="operator.result">{{ operator.result === 'passed' ? '低风险' : operator.result === 'review' ? '中风险' : '高风险' }}</text></view>
        <view class="field"><text>实名身份</text><input v-model="operator.idNo" /></view>
        <view class="field"><text>操作证/驾驶证号</text><input v-model="operator.certNo" /></view>
        <view class="field"><text>准驾机型/作业设备</text><input v-model="operator.machine" /></view>
        <view class="field"><text>证件有效期</text><input v-model="operator.expiry" /></view>
      </view>
    </block>

    <view class="section-title"><text>材料与监管数据核验</text><text class="count">{{ verifiedCount }}/{{ currentChecks.length }} 自动核验</text></view>
    <view class="checks">
      <view v-for="item in currentChecks" :key="item.name" class="check">
        <view class="state" :class="item.state">{{ item.state === 'verified' ? '✓' : item.state === 'manual' ? '!' : '×' }}</view>
        <view class="check-main"><view class="check-hd"><text class="check-n">{{ item.name }}</text><text class="check-source">{{ item.source }}</text></view><text class="check-note">{{ item.note }}</text></view>
      </view>
    </view>

    <view class="audit-card">
      <view class="audit-hd"><view><text class="audit-k">规则引擎 RA-AGRI-8533</text><text class="audit-t">7步自动审核</text></view><text class="audit-p">{{ progress }}%</text></view>
      <view class="bar"><view class="fill" :style="{ width: progress + '%' }"></view></view>
      <view class="steps">
        <view v-for="(s, i) in steps" :key="s" class="step" :class="{ done: auditStep > i }">
          <text class="step-no">{{ auditStep > i ? '✓' : i + 1 }}</text><text>{{ s }}</text>
        </view>
      </view>
      <view class="run" :class="{ running: auditState === 'running' }" @tap="runAudit">{{ auditState === 'running' ? `审核中 ${progress}%` : auditState === 'idle' ? '▶ 立即自动审核' : '↻ 重新审核' }}</view>
    </view>

    <view v-if="auditState !== 'idle' && auditState !== 'running'" class="result" :class="resultClass">
      <view class="result-top"><view><text class="result-k">自动审核结论</text><text class="result-t">{{ resultText }}</text></view><view class="score"><text>{{ currentScore }}</text><text class="score-label">风险得分</text></view></view>
      <text class="result-reason">{{ currentReason }}</text>
      <view class="result-actions">
        <view v-if="currentResult === 'passed'" class="primary" @tap="fileRecord">{{ isFiled ? '已备案 · 查看备案卡' : '确认准入并生成备案卡' }}</view>
        <view v-else-if="currentResult === 'review'" class="warning" @tap="manualReview">生成县级人工复核工单</view>
        <view v-else class="danger">相关商品/人员/设备已冻结</view>
      </view>
    </view>

    <view class="section-title"><text>持续监管与交易联动</text><text class="count">不是一次性审证</text></view>
    <view class="controls">
      <view><text class="ctl-ic">⏰</text><text class="ctl-t">90/30/7天到期预警</text><text class="ctl-d">到期自动降权、暂停上架或停止派单</text></view>
      <view><text class="ctl-ic">🔄</text><text class="ctl-t">每日动态联查</text><text class="ctl-d">吊销、注销、处罚、经营异常实时触发复审</text></view>
      <view><text class="ctl-ic">🎯</text><text class="ctl-t">许可范围逐单校验</text><text class="ctl-d">SKU、限制使用农药、机型和作业范围不匹配即拦截</text></view>
      <view><text class="ctl-ic">📒</text><text class="ctl-t">一户一档、一人一档、一机一档</text><text class="ctl-d">材料版本、审核日志、人工意见和历史任务全留痕</text></view>
      <view><text class="ctl-ic">🔒</text><text class="ctl-t">交易与派单硬闸门</text><text class="ctl-d">未通过不能上架、签约、收款、抢单或接受调度</text></view>
      <view><text class="ctl-ic">👷</text><text class="ctl-t">人—机—任务逐单匹配</text><text class="ctl-d">证照有效不等于可开所有设备，准驾/培训机型、人员排班、机具状态和任务风险必须同时匹配</text></view>
      <view><text class="ctl-ic">👁️</text><text class="ctl-t">县级监管驾驶舱</text><text class="ctl-d">查看待复核、将到期、超范围和高风险名单</text></view>
    </view>

    <view class="notice">
      <text class="notice-t">合规口径说明</text>
      <text>农用无人机常规作业人员核验生产者颁发的操作证，并比对生产企业/机型；航空器所有人须实名登记。拖拉机、联合收割机核验相应驾驶证、准驾机型及机具牌证。其他农机作业人员按设备风险、地方规定和平台安全规则分类备案，不虚构全国统一许可证。</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.qualification { padding-bottom: 48rpx; }
.hero { padding: 34rpx 26rpx 28rpx; color: #fff; background: linear-gradient(145deg, #123c56, #12634d 62%, #16884c); }
.hero-row, .ap-hd, .audit-hd, .result-top, .section-title, .check-hd { display: flex; align-items: center; justify-content: space-between; }
.hero-k { font-size: 20rpx; opacity: .88; }
.law { font-size: 20rpx; padding: 7rpx 15rpx; border-radius: 999rpx; background: rgba(255,255,255,.16); }
.hero-t { display: block; margin-top: 16rpx; font-size: 39rpx; line-height: 1.3; font-weight: 900; }
.hero-d { display: block; margin-top: 10rpx; font-size: 21rpx; line-height: 1.65; opacity: .9; }
.hero-kpis { display: flex; margin-top: 22rpx; padding: 16rpx 4rpx; border-radius: 16rpx; background: rgba(255,255,255,.12); }
.hero-kpis view { flex: 1; text-align: center; }
.hero-kpis .n { display: block; font-size: 28rpx; font-weight: 900; }
.hero-kpis .d { font-size: 18rpx; opacity: .82; }
.mode-tabs { display: flex; gap: 12rpx; margin: 18rpx 22rpx 0; }
.mode { flex: 1; padding: 19rpx 10rpx; text-align: center; font-size: 24rpx; font-weight: 800; border-radius: 16rpx; background: #fff; box-shadow: $sg-shadow; color: $sg-text-2; }
.mode.on { color: #fff; background: #12634d; }
.cat-scroll { box-sizing: border-box; width: 100%; white-space: nowrap; padding: 18rpx 22rpx 6rpx; }
.cat, .person { display: inline-flex; align-items: center; margin-right: 12rpx; padding: 15rpx 19rpx; border: 2rpx solid transparent; border-radius: 16rpx; background: #fff; box-shadow: $sg-shadow; }
.cat.on, .person.on { border-color: #16884c; background: #edf8f2; }
.cat-ic { margin-right: 8rpx; font-size: 31rpx; }
.cat-n { display: block; font-size: 22rpx; font-weight: 800; }
.person-t { display: block; margin-top: 2rpx; font-size: 17rpx; color: $sg-text-3; }
.application, .checks, .audit-card, .notice { margin: 14rpx 22rpx 0; padding: 21rpx; border-radius: 20rpx; background: #fff; box-shadow: $sg-shadow; }
.manager-entry { display: flex; align-items: center; gap: 13rpx; margin: 14rpx 22rpx 0; padding: 18rpx 20rpx; border-radius: 17rpx; color: #fff; background: linear-gradient(135deg, #79531d, #17704e); box-shadow: $sg-shadow; }
.manager-entry > text:first-child { font-size: 34rpx; }
.manager-entry > view { flex: 1; }
.manager-entry > view text { display: block; font-size: 23rpx; font-weight: 850; }
.manager-entry > view text + text { margin-top: 3rpx; font-size: 17rpx; line-height: 1.45; font-weight: 400; opacity: .85; }
.manager-entry > text:last-child { font-size: 20rpx; }
.ap-k, .audit-k, .result-k { display: block; font-size: 18rpx; color: $sg-text-3; }
.ap-n { display: block; margin-top: 3rpx; font-size: 27rpx; font-weight: 850; }
.tag { padding: 6rpx 14rpx; border-radius: 999rpx; font-size: 19rpx; }
.tag.passed { color: #087742; background: #e5f7ed; }
.tag.review { color: #9a6200; background: #fff3d6; }
.tag.blocked { color: #b3261e; background: #fde9e7; }
.field { margin-top: 14rpx; padding: 13rpx 15rpx; border-radius: 12rpx; background: #f5f7f8; }
.field text { display: block; font-size: 18rpx; color: $sg-text-3; }
.field input { height: 42rpx; margin-top: 2rpx; font-size: 22rpx; color: $sg-text; }
.section-title { padding: 25rpx 25rpx 9rpx; font-size: 28rpx; font-weight: 850; }
.count { font-size: 18rpx; font-weight: 500; color: #16884c; }
.checks { margin-top: 0; padding-top: 5rpx; padding-bottom: 5rpx; }
.check { display: flex; align-items: flex-start; padding: 15rpx 0; border-bottom: 1rpx solid #edf0f2; }
.check:last-child { border-bottom: none; }
.state { flex: none; display: flex; align-items: center; justify-content: center; width: 38rpx; height: 38rpx; margin-right: 12rpx; border-radius: 50%; font-size: 21rpx; font-weight: 900; }
.state.verified { color: #fff; background: #16884c; }
.state.manual { color: #fff; background: #d99a2b; }
.state.missing { color: #fff; background: #c0392b; }
.check-main { flex: 1; min-width: 0; }
.check-n { font-size: 22rpx; font-weight: 750; }
.check-source { margin-left: 12rpx; font-size: 16rpx; color: $sg-text-3; }
.check-note { display: block; margin-top: 4rpx; font-size: 18rpx; color: $sg-text-2; }
.audit-card { background: linear-gradient(145deg, #f7fbff, #fff); border: 2rpx solid #dceaf2; }
.audit-t { display: block; margin-top: 2rpx; font-size: 28rpx; font-weight: 850; }
.audit-p { font-size: 34rpx; font-weight: 900; color: #12634d; }
.bar { height: 12rpx; margin: 16rpx 0; overflow: hidden; border-radius: 999rpx; background: #dce8e3; }
.fill { height: 100%; border-radius: 999rpx; background: linear-gradient(90deg, #16884c, #22a96b); transition: width .3s; }
.step { display: flex; align-items: center; min-height: 47rpx; font-size: 19rpx; color: #8b949b; }
.step.done { color: #123c56; font-weight: 650; }
.step-no { display: flex; align-items: center; justify-content: center; flex: none; width: 32rpx; height: 32rpx; margin-right: 10rpx; border-radius: 50%; color: #fff; background: #c9d0d4; font-size: 17rpx; }
.step.done .step-no { background: #16884c; }
.run { margin-top: 15rpx; padding: 20rpx; text-align: center; color: #fff; font-size: 25rpx; font-weight: 850; border-radius: 999rpx; background: linear-gradient(135deg, #12634d, #16884c); }
.run.running { opacity: .75; }
.result { margin: 16rpx 22rpx 0; padding: 23rpx; border-radius: 20rpx; border: 2rpx solid; }
.result.passed { background: #eefaf4; border-color: #b6e4ca; }
.result.review { background: #fff8e8; border-color: #f0d59c; }
.result.blocked { background: #fff0ef; border-color: #efbbb7; }
.result-t { display: block; margin-top: 2rpx; font-size: 34rpx; font-weight: 900; }
.score { text-align: center; }
.score text { display: block; font-size: 38rpx; font-weight: 900; }
.score-label { font-size: 17rpx; color: $sg-text-3; }
.result-reason { display: block; margin-top: 13rpx; font-size: 21rpx; line-height: 1.65; color: $sg-text-2; }
.result-actions view { margin-top: 16rpx; padding: 18rpx; text-align: center; color: #fff; border-radius: 999rpx; font-size: 23rpx; font-weight: 800; }
.primary { background: #16884c; }
.warning { background: #d38b16; }
.danger { background: #bd3229; }
.controls { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; padding: 0 22rpx; }
.controls view { min-height: 150rpx; padding: 17rpx; border-radius: 18rpx; background: #fff; box-shadow: $sg-shadow; }
.ctl-ic { display: block; font-size: 31rpx; }
.ctl-t { display: block; margin-top: 5rpx; font-size: 21rpx; font-weight: 800; }
.ctl-d { display: block; margin-top: 4rpx; font-size: 17rpx; line-height: 1.45; color: $sg-text-3; }
.notice { font-size: 19rpx; line-height: 1.65; color: $sg-text-2; background: #eef4f7; border: 2rpx solid #d4e2e9; }
.notice-t { display: block; margin-bottom: 6rpx; font-size: 22rpx; font-weight: 850; color: #123c56; }
</style>
