<script setup lang="ts">
import { computed, ref } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

type AssetState = "在售" | "在租" | "作业中" | "维保中" | "冻结";
type AuditState = "verified" | "warning" | "blocked";

interface MachineAsset {
  id: string;
  icon: string;
  category: string;
  model: string;
  merchant: string;
  ownership: string;
  channel: string;
  state: AssetState;
  price: number;
  rent: number;
  stock: number;
  available: number;
  serial: string;
  engineNo: string;
  certificate: string;
  registry: string;
  insurance: string;
  hours: number;
  nextService: string;
  location: string;
  audit: AuditState;
  alert: string;
}

interface MachineOperator {
  id: string;
  name: string;
  avatar: string;
  cert: string;
  scopes: string[];
  models: string[];
  expiry: string;
  training: string;
  insurance: string;
  experience: number;
  distance: number;
  status: "可派" | "作业中" | "待复训" | "证件异常";
}

const tabs = [
  { key: "overview", name: "经营总览" },
  { key: "assets", name: "机具台账" },
  { key: "match", name: "人机匹配" },
  { key: "inbound", name: "验真入库" },
  { key: "orders", name: "销售租赁" },
  { key: "service", name: "维保召回" },
];
const activeTab = ref("overview");
const category = ref("全部");
const keyword = ref("");

const assets = ref<MachineAsset[]>([
  {
    id: "AM-2026-00031", icon: "🚜", category: "拖拉机", model: "雷沃 M2004-5G 轮式拖拉机",
    merchant: "供销农机装备服务有限公司", ownership: "商家自有", channel: "销售 + 租赁",
    state: "在售", price: 286000, rent: 1280, stock: 3, available: 2,
    serial: "LOVOL-M2004-2026-00318", engineNo: "WP6G200E330-0618",
    certificate: "出厂合格证、推广鉴定证书已核", registry: "待销售后由购机人办理登记",
    insurance: "库存财产险有效", hours: 42, nextService: "首保剩余 8 小时",
    location: "信丰县农机仓储中心 A-03", audit: "verified", alert: "正常",
  },
  {
    id: "AM-2026-00042", icon: "🌾", category: "收获机械", model: "谷神 GM100 联合收割机",
    merchant: "供销农机装备服务有限公司", ownership: "融资租赁", channel: "经营租赁",
    state: "在租", price: 398000, rent: 2600, stock: 2, available: 1,
    serial: "GUSHEN-GM100-2026-00127", engineNo: "YC6A220-260127",
    certificate: "合格证、购置发票、融资租赁合同已核", registry: "赣07农机登字2026**** · 检验有效",
    insurance: "交强险/商业险至 2027-03-18", hours: 386, nextService: "剩余 64 小时",
    location: "安西镇跨区作业队", audit: "verified", alert: "租期至 2026-08-20",
  },
  {
    id: "AM-2026-00056", icon: "🛸", category: "植保无人机", model: "T70 农业无人飞机",
    merchant: "供销农机装备服务有限公司", ownership: "商家自有", channel: "销售 + 作业服务",
    state: "作业中", price: 79800, rent: 880, stock: 6, available: 4,
    serial: "UAS-T70-2026-07319", engineNo: "飞控 SN-FC2607319",
    certificate: "产品合格证、生产企业授权、适航符合性材料已核", registry: "UOM实名登记标识 UAS-CN-36****",
    insurance: "第三者责任险 100 万元", hours: 126, nextService: "桨叶 18 小时后检查",
    location: "大塘埠镇水稻项目 3 号地块", audit: "verified", alert: "已绑定操作员刘建国",
  },
  {
    id: "AM-2026-00061", icon: "🌱", category: "种植机械", model: "2BMF-12 免耕精量播种机",
    merchant: "供销农机装备服务有限公司", ownership: "代销", channel: "销售",
    state: "冻结", price: 36800, rent: 0, stock: 4, available: 0,
    serial: "BMF12-2026-BATCH-009", engineNo: "非动力机具",
    certificate: "仅上传批次合格证，缺少单机编号对应表", registry: "非牌证机具 · 平台唯一编码待补",
    insurance: "库存险待补充批次", hours: 0, nextService: "未启用",
    location: "信丰县农机仓储中心 待验区", audit: "blocked", alert: "禁止上架：证货无法逐台对应",
  },
  {
    id: "AM-2026-00073", icon: "🔥", category: "加工机械", model: "15T 循环式谷物烘干机",
    merchant: "供销农机装备服务有限公司", ownership: "样机", channel: "销售 + 安装",
    state: "维保中", price: 325000, rent: 0, stock: 1, available: 0,
    serial: "DRYER-15T-2025-0088", engineNo: "燃烧器 BR-88-2025",
    certificate: "整机合格证、安装说明及特种部件资料已核", registry: "固定式设备安装地址已备案",
    insurance: "产品责任险有效", hours: 1680, nextService: "正在更换温度传感器",
    location: "正平镇粮食烘干中心", audit: "warning", alert: "维保完成复检前禁止交付",
  },
]);

const categories = computed(() => ["全部", ...Array.from(new Set(assets.value.map((x) => x.category)))]);
const filteredAssets = computed(() => assets.value.filter((x) => {
  const cat = category.value === "全部" || x.category === category.value;
  const text = `${x.id}${x.model}${x.serial}${x.location}`.toLowerCase();
  return cat && text.includes(keyword.value.trim().toLowerCase());
}));
const totalStock = computed(() => assets.value.reduce((sum, x) => sum + x.stock, 0));
const usable = computed(() => assets.value.filter((x) => x.audit === "verified").length);
const blocked = computed(() => assets.value.filter((x) => x.audit === "blocked").length);
const assetValue = computed(() => assets.value.reduce((sum, x) => sum + x.price * x.stock, 0));
const fmt = (n: number) => n.toLocaleString("zh-CN");

// Do not use the Chinese display value as a CSS class. WeChat's wxss compiler
// escapes Chinese class names (for example `.state.冻结` becomes `.state.\51bb...`)
// and older DevTools versions reject that escape with an "unexpected \\" error.
function stateClass(state: AssetState) {
  return {
    "state-frozen": state === "冻结",
    "state-maintenance": state === "维保中",
    "state-rented": state === "在租",
    "state-working": state === "作业中",
  };
}

function serviceStatusClass(status: string) {
  return { "service-frozen": status === "已冻结" };
}

const controlChain = [
  { icon: "🏷️", title: "一机一码", desc: "SKU管商品型号，资产码管每台实物；序列号、发动机号、飞控号不得重复。" },
  { icon: "📄", title: "来源与合格性", desc: "采购合同、发票、出厂合格证、鉴定/认证材料、厂家授权相互印证。" },
  { icon: "🧾", title: "所有权与权利负担", desc: "区分自有、代销、融资租赁和抵押设备，避免无权处分或重复融资。" },
  { icon: "🛰️", title: "在库与在途状态", desc: "仓位、调拨、借机、试机、作业位置实时更新，账、卡、物保持一致。" },
  { icon: "🔧", title: "维保与配件", desc: "按小时/里程/日期生成保养工单，关键配件记录来源、批次和更换人。" },
  { icon: "⛔", title: "交易硬闸门", desc: "冻结、召回、证件不全、超期未检、保险失效的机具禁止上架、交付和派单。" },
];

const operators = ref<MachineOperator[]>([
  {
    id: "OP-360722-0018", name: "王海强", avatar: "王", cert: "赣07拖联驾字2024****",
    scopes: ["G2", "R"], models: ["M2004", "GM100"], expiry: "2029-08-18",
    training: "大型轮式拖拉机、联合收割机安全操作培训", insurance: "雇主责任险 + 人身意外险",
    experience: 9, distance: 3.2, status: "可派",
  },
  {
    id: "OP-360722-0031", name: "刘建国", avatar: "刘", cert: "AGR-UAS-DJI-2025-08****",
    scopes: ["UAS"], models: ["T60", "T70"], expiry: "长期有效 · 年度复训已完成",
    training: "T60/T70生产者操作培训 + 农药安全使用", insurance: "操作员责任险 + 第三者责任险",
    experience: 5, distance: 5.8, status: "可派",
  },
  {
    id: "OP-360722-0045", name: "赵志刚", avatar: "赵", cert: "赣07拖驾字2022****",
    scopes: ["G1"], models: ["M1204"], expiry: "2027-04-06",
    training: "中型轮式拖拉机操作培训", insurance: "人身意外险",
    experience: 6, distance: 2.1, status: "可派",
  },
  {
    id: "OP-360722-0052", name: "陈小林", avatar: "陈", cert: "AGR-UAS-OTHER-2024-01****",
    scopes: ["UAS"], models: ["T40"], expiry: "待完成跨厂家机型实操复训",
    training: "原厂家T40操作培训", insurance: "保险待续保",
    experience: 2, distance: 1.6, status: "待复训",
  },
]);

const matchTasks = [
  { id: "TASK-260730-01", icon: "🌾", name: "水稻联合收割", amount: "320亩", location: "安西镇范庄村", scope: "R", model: "GM100", category: "收获机械", date: "8月2日 06:00", risk: "抢农时 · 潮湿田块" },
  { id: "TASK-260730-02", icon: "🛸", name: "水稻植保飞防", amount: "600亩", location: "大塘埠镇3号地块", scope: "UAS", model: "T70", category: "植保无人机", date: "7月31日 05:30", risk: "临近村庄 · 需设置安全边界" },
  { id: "TASK-260730-03", icon: "🚜", name: "深松整地", amount: "200亩", location: "正平镇高标准农田", scope: "G2", model: "M2004", category: "拖拉机", date: "8月5日 07:00", risk: "大马力牵引作业" },
];
const matchTaskIndex = ref(0);
const matchTask = computed(() => matchTasks[matchTaskIndex.value]);
const matchChecks = [
  "人员实名、年龄与黑名单核验",
  "驾驶证/操作证真实性与有效期核验",
  "准驾类型、培训厂家与具体机型匹配",
  "机具一机一码、登记检验与维保状态核验",
  "人员险、机具险及第三者责任险核验",
  "人员排班、机具档期与历史工单冲突检测",
  "任务类型、地块环境、天气和安全要求匹配",
  "距离、经验、信用和综合成本智能排序",
];
const matchRunning = ref(false);
const matchStep = ref(-1);
const matchFinished = computed(() => matchStep.value >= matchChecks.length);
const assignment = ref("");

const matchPairs = computed(() => {
  const task = matchTask.value;
  const machines = assets.value.filter((x) => x.category === task.category);
  const rows = operators.value.flatMap((operator) => machines.map((machine) => {
    const reasons: string[] = [];
    if (operator.status !== "可派") reasons.push(operator.status === "待复训" ? "跨厂家/机型实操复训未完成" : `人员状态：${operator.status}`);
    if (!operator.scopes.includes(task.scope)) reasons.push(`证照范围缺少 ${task.scope}`);
    if (!operator.models.includes(task.model)) reasons.push(`未备案 ${task.model} 机型`);
    if (machine.audit !== "verified") reasons.push("机具合规状态未通过");
    if (machine.state === "冻结" || machine.state === "维保中") reasons.push(`机具处于${machine.state}`);
    if (operator.insurance.includes("待续保")) reasons.push("人员保险未生效");
    const passed = reasons.length === 0;
    const score = passed ? Math.max(70, Math.round(100 - operator.distance * 1.8 + operator.experience * 1.3 - (machine.hours > 1000 ? 4 : 0))) : Math.max(18, 62 - reasons.length * 14);
    return {
      key: `${operator.id}-${machine.id}`, operator, machine, passed, score, reasons,
      strengths: passed ? [`${operator.experience}年经验`, `${operator.distance}km到场`, "证照与机型一致", "保险有效"] : [],
    };
  }));
  return rows.sort((a, b) => b.score - a.score);
});

function selectMatchTask(i: number) {
  matchTaskIndex.value = i;
  matchStep.value = -1;
  matchRunning.value = false;
  assignment.value = "";
}
function runMatch() {
  if (productionBuild) return uni.showModal({ title: "需要后台调度服务", content: "正式环境的人、机、任务匹配必须由后台核验资质、保险、服务半径和实时档期后生成调度单，当前未执行本地匹配。", showCancel: false });
  if (matchRunning.value) return;
  matchRunning.value = true;
  matchStep.value = 0;
  assignment.value = "";
  const timer = setInterval(() => {
    matchStep.value += 1;
    if (matchStep.value >= matchChecks.length) {
      clearInterval(timer);
      matchRunning.value = false;
      uni.showToast({ title: "匹配核验完成", icon: "success" });
    }
  }, 380);
}
function bindPair(pair: any) {
  if (!pair.passed) {
    uni.showModal({ title: "禁止绑定派单", content: pair.reasons.join("；") + "。须补证、复训或更换人员/机具后重新匹配。", showCancel: false });
    return;
  }
  if (productionBuild) return uni.showModal({ title: "需要后台调度服务", content: "正式环境的人员—机具—任务绑定必须由授权调度岗位写入并留存快照，当前未写入绑定结果。", showCancel: false });
  assignment.value = pair.key;
  uni.showModal({
    title: "人—机—任务绑定成功",
    content: `任务：${matchTask.value.name} · ${matchTask.value.amount}\n人员：${pair.operator.name}（${pair.operator.cert}）\n机具：${pair.machine.model}\n资产码：${pair.machine.id}\n\n调度单已固化人员、设备和任务快照；中途换人或换机必须重新审核。`,
    showCancel: false,
  });
}

const inboundSteps = [
  "扫描整机铭牌、序列号、发动机/飞控编号",
  "OCR采购合同、发票、合格证与厂家授权",
  "校验型号、生产企业、鉴定/认证及适用范围",
  "核查所有权、融资租赁、抵押和查封冲突",
  "需要登记的机具核验牌证、检验与保险",
  "生成平台资产码、仓位标签与电子设备档案",
];
const inboundRunning = ref(false);
const inboundStep = ref(-1);
const inboundDone = computed(() => inboundStep.value >= inboundSteps.length);
function runInbound() {
  if (productionBuild) return uni.showModal({ title: "需要资产核验服务", content: "正式环境的机具入库必须由后台核验序列号、所有权、证照、保险和抵押状态后建档，当前未执行本地入库。", showCancel: false });
  if (inboundRunning.value) return;
  inboundRunning.value = true;
  inboundStep.value = 0;
  const timer = setInterval(() => {
    inboundStep.value += 1;
    if (inboundStep.value >= inboundSteps.length) {
      clearInterval(timer);
      inboundRunning.value = false;
      uni.showToast({ title: "验真入库完成", icon: "success" });
    }
  }, 430);
}

const orderModes = ["整机销售", "经营租赁", "作业服务"];
const orderMode = ref(orderModes[0]);
const orderStep = ref(0);
const orderFlow = computed(() => orderMode.value === "整机销售" ? [
  "选机锁库", "买方实名与购机资格确认", "电子合同/定金", "出库复核与交机培训", "签收验收", "发票/尾款/所有权转移", "质保建档",
] : orderMode.value === "经营租赁" ? [
  "选机与档期锁定", "承租人/机手资质核验", "租赁合同与押金", "交机点检", "定位与工时监管", "还机验收/损耗判定", "租金结算/押金解冻",
] : [
  "发布作业需求", "机构/机手/机具三重准入", "服务合同与预授权", "北斗到场开工", "轨迹/亩数/质量记录", "农户验收", "作业费分账",
]);
function nextOrder() {
  if (productionBuild) return uni.showModal({ title: "需要后台订单服务", content: "正式环境的销售、租赁和作业服务订单必须由后台按合同、验收和结算状态推进，当前未推进本地订单。", showCancel: false });
  if (orderStep.value < orderFlow.value.length) {
    orderStep.value += 1;
    if (orderStep.value === orderFlow.value.length) uni.showToast({ title: "业务闭环完成", icon: "success" });
  } else orderStep.value = 0;
}
function changeMode(mode: string) {
  orderMode.value = mode;
  orderStep.value = 0;
}

const serviceOrders = ref([
  { no: "WX-260729-018", machine: "谷神 GM100 联合收割机", type: "计划保养", issue: "400小时保养：机油、滤芯、皮带张紧", status: "待接单", sla: "2小时响应", parts: "原厂滤芯套装" },
  { no: "WX-260730-006", machine: "T70 农业无人飞机", type: "故障维修", issue: "2号电机温度异常，飞控已锁定设备", status: "维修中", sla: "预计今日完成", parts: "电机总成 SN-M26073" },
  { no: "ZH-260728-002", machine: "2BMF-12 免耕播种机", type: "质量召回", issue: "厂家通知检查播种轴批次，涉及4台库存", status: "已冻结", sla: "48小时完成排查", parts: "召回批次 BMF-009" },
]);
function serviceAction(i: number) {
  if (productionBuild) return uni.showModal({ title: "需要后台维修服务", content: "正式环境的维修、复检和召回工单必须由服务商回执并由后台留痕，当前未修改工单状态。", showCancel: false });
  const item = serviceOrders.value[i];
  if (item.status === "待接单") item.status = "维修中";
  else if (item.status === "维修中") item.status = "待复检";
  else if (item.status === "待复检") item.status = "已完成";
  else if (item.status === "已冻结") item.status = "排查中";
  else if (item.status === "排查中") item.status = "待复检";
  uni.showToast({ title: item.status, icon: "none" });
}

function inspectAsset(x: MachineAsset) {
  uni.showModal({
    title: `${x.icon} ${x.model}`,
    content: `资产码：${x.id}\n唯一编号：${x.serial}\n动力/飞控：${x.engineNo}\n所有权：${x.ownership}\n登记：${x.registry}\n保险：${x.insurance}\n位置：${x.location}\n工时：${x.hours}h\n下次保养：${x.nextService}`,
    confirmText: "知道了",
    showCancel: false,
  });
}
function toggleListing(x: MachineAsset) {
  if (productionBuild) return uni.showModal({ title: "需要后台资产服务", content: "正式环境的机具上下架必须由后台依据资质、检验、保险和召回状态执行，当前未修改库存状态。", showCancel: false });
  if (x.audit !== "verified" || x.state === "冻结" || x.state === "维保中") {
    uni.showModal({ title: "禁止上架", content: `当前状态：${x.state}\n${x.alert}\n须完成材料补正、维修复检或解除召回后才能恢复经营。`, showCancel: false });
    return;
  }
  x.state = x.state === "在售" ? "冻结" : "在售";
  x.alert = x.state === "在售" ? "正常" : "商家主动下架";
  uni.showToast({ title: x.state === "在售" ? "已恢复上架" : "已下架锁定", icon: "none" });
}
function nav(url: string) { uni.navigateTo({ url }); }
</script>

<template>
  <view class="sg-page merchant-machine">
    <view class="hero">
      <view class="hero-row"><text class="hero-k">数智供社 v8533 · 农机具商家端</text><text class="role">已认证商家</text></view>
      <text class="hero-t">农机具全生命周期管理</text>
      <text class="hero-d">从验真入库、一机一码、人员与机具精准匹配，到销售租赁、交机验收、维保召回和资产退出，真正做到“人、机、任务、账、卡、物、权、证、险”一致。</text>
      <view class="hero-kpis">
        <view><text>{{ totalStock }}</text><text>库存机具</text></view>
        <view><text>{{ usable }}</text><text>合规型号</text></view>
        <view><text>¥{{ (assetValue / 10000).toFixed(1) }}万</text><text>库存货值</text></view>
        <view><text class="danger">{{ blocked }}</text><text>冻结型号</text></view>
      </view>
    </view>

    <scroll-view scroll-x class="tabs">
      <view class="tab-row">
        <text v-for="tab in tabs" :key="tab.key" class="tab" :class="{ on: activeTab === tab.key }" @tap="activeTab = tab.key">{{ tab.name }}</text>
      </view>
    </scroll-view>

    <block v-if="activeTab === 'overview'">
      <view class="quick-links">
        <view @tap="nav('/pages/agri/qualification')"><text>🛡️</text><text>商家资质</text><text>主体与经营准入 ›</text></view>
        <view @tap="nav('/pages/agri/machine')"><text>🛰️</text><text>共享调度</text><text>租赁/作业派单 ›</text></view>
        <view @tap="nav('/pages/finance/product?id=F6')"><text>🏦</text><text>设备金融</text><text>农机贷/融资租赁 ›</text></view>
      </view>

      <view class="section-title"><text>今日经营风险</text><text class="count">3项待处理</text></view>
      <view class="alerts">
        <view class="alert red" @tap="activeTab = 'match'"><text>👷</text><view><text>1组人机匹配被拦截</text><text>无人机操作员培训机型与待派设备不一致</text></view><text>处理 ›</text></view>
        <view class="alert red" @tap="activeTab = 'assets'"><text>⛔</text><view><text>4台播种机冻结</text><text>单机编号与批次合格证未逐一对应，禁止上架</text></view><text>处理 ›</text></view>
        <view class="alert amber" @tap="activeTab = 'service'"><text>🔧</text><view><text>1台烘干机待维修复检</text><text>温度传感器更换完成前不得交付</text></view><text>处理 ›</text></view>
        <view class="alert blue" @tap="activeTab = 'orders'"><text>📦</text><view><text>2笔订单待交机验收</text><text>完成现场点检、培训和电子签收后才能结算</text></view><text>处理 ›</text></view>
      </view>

      <view class="section-title"><text>六道管理闸门</text><text class="count">覆盖全生命周期</text></view>
      <view class="controls">
        <view v-for="c in controlChain" :key="c.title">
          <text class="control-icon">{{ c.icon }}</text>
          <view><text class="control-title">{{ c.title }}</text><text class="control-desc">{{ c.desc }}</text></view>
        </view>
      </view>
    </block>

    <block v-else-if="activeTab === 'assets'">
      <view class="search">
        <text>🔎</text><input v-model="keyword" placeholder="搜资产码、型号、序列号或位置" />
      </view>
      <scroll-view scroll-x class="cats"><view class="cat-row"><text v-for="c in categories" :key="c" class="cat" :class="{ on: category === c }" @tap="category = c">{{ c }}</text></view></scroll-view>
      <view class="asset-list">
        <view v-for="x in filteredAssets" :key="x.id" class="asset-card" :class="x.audit">
          <view class="asset-head">
            <text class="asset-icon">{{ x.icon }}</text>
            <view class="asset-main"><text class="asset-model">{{ x.model }}</text><text class="asset-id">{{ x.id }} · {{ x.category }}</text></view>
            <text class="state" :class="stateClass(x.state)">{{ x.state }}</text>
          </view>
          <view class="asset-tags"><text>{{ x.ownership }}</text><text>{{ x.channel }}</text><text>库存 {{ x.stock }} / 可用 {{ x.available }}</text></view>
          <view class="asset-grid">
            <view><text>整机序列号</text><text>{{ x.serial }}</text></view>
            <view><text>登记/备案</text><text>{{ x.registry }}</text></view>
            <view><text>当前定位</text><text>{{ x.location }}</text></view>
            <view><text>保养计划</text><text>{{ x.nextService }}</text></view>
          </view>
          <view class="asset-alert" :class="x.audit">{{ x.audit === "verified" ? "✓" : x.audit === "warning" ? "!" : "×" }} {{ x.alert }}</view>
          <view class="asset-foot">
            <view><text v-if="x.price">售价 ¥{{ fmt(x.price) }}</text><text v-if="x.rent">租金 ¥{{ fmt(x.rent) }}/日</text></view>
            <view><text class="ghost" @tap="inspectAsset(x)">完整档案</text><text class="action" :class="{ disabled: x.audit !== 'verified' || x.state === '维保中' }" @tap="toggleListing(x)">{{ x.state === "在售" ? "下架" : "上架审核" }}</text></view>
          </view>
        </view>
      </view>
    </block>

    <block v-else-if="activeTab === 'match'">
      <view class="match-hero">
        <view><text>👷‍♂️ 人—机—任务智能匹配</text><text>先过合规硬闸门，再按距离、经验、信用和成本排序；严禁“有证但开错机”。</text></view>
        <text>{{ matchFinished ? "已完成" : matchRunning ? `${Math.round(matchStep / matchChecks.length * 100)}%` : "待匹配" }}</text>
      </view>

      <scroll-view scroll-x class="task-scroll">
        <view class="task-row">
          <view v-for="(t, i) in matchTasks" :key="t.id" class="match-task" :class="{ on: matchTaskIndex === i }" @tap="selectMatchTask(i)">
            <text>{{ t.icon }}</text><view><text>{{ t.name }}</text><text>{{ t.amount }} · {{ t.location }}</text></view>
          </view>
        </view>
      </scroll-view>

      <view class="task-detail">
        <view class="task-head"><view><text>{{ matchTask.name }}</text><text>{{ matchTask.id }}</text></view><text>{{ matchTask.date }}</text></view>
        <view class="task-grid">
          <view><text>作业规模</text><text>{{ matchTask.amount }}</text></view>
          <view><text>人员范围</text><text>{{ matchTask.scope }}</text></view>
          <view><text>指定/兼容机型</text><text>{{ matchTask.model }}</text></view>
          <view><text>安全风险</text><text>{{ matchTask.risk }}</text></view>
        </view>
      </view>

      <view class="match-checks">
        <view v-for="(s, i) in matchChecks" :key="s" :class="{ done: matchStep > i, current: matchStep === i }">
          <text>{{ matchStep > i ? "✓" : i + 1 }}</text><text>{{ s }}</text>
        </view>
      </view>
      <view class="match-run" :class="{ running: matchRunning }" @tap="runMatch">{{ matchRunning ? "正在联查人员、机具与任务条件" : matchFinished ? "↻ 重新智能匹配" : "▶ 一键执行人机匹配" }}</view>

      <block v-if="matchFinished">
        <view class="section-title"><text>匹配结果</text><text class="count">合规优先 · 综合排序</text></view>
        <view class="pair-list">
          <view v-for="(p, i) in matchPairs" :key="p.key" class="pair-card" :class="{ blocked: !p.passed, selected: assignment === p.key }">
            <view class="pair-rank">{{ p.passed ? i + 1 : "×" }}</view>
            <view class="pair-main">
              <view class="pair-head">
                <view class="operator-avatar">{{ p.operator.avatar }}</view>
                <view><text>{{ p.operator.name }} + {{ p.machine.model }}</text><text>{{ p.operator.cert }} · {{ p.machine.id }}</text></view>
                <view class="pair-score" :class="{ bad: !p.passed }"><text>{{ p.score }}</text><text>匹配分</text></view>
              </view>
              <view v-if="p.passed" class="strengths"><text v-for="s in p.strengths" :key="s">✓ {{ s }}</text></view>
              <view v-else class="pair-reasons"><text v-for="r in p.reasons" :key="r">× {{ r }}</text></view>
              <view class="pair-meta"><text>人员状态：{{ p.operator.status }}</text><text>机具状态：{{ p.machine.state }}</text><text>位置：{{ p.machine.location }}</text></view>
              <view class="pair-action" :class="{ disabled: !p.passed, selected: assignment === p.key }" @tap="bindPair(p)">{{ !p.passed ? "禁止派单" : assignment === p.key ? "已绑定 ✓" : "绑定人机并生成调度单" }}</view>
            </view>
          </view>
        </view>
      </block>

      <view class="change-rule">
        <text>🔒 派单后的变更控制</text>
        <text>调度单固化人员证照快照、机具资产码、任务与地块条件。临时换人、换机、转包或更换无人机型号时，原授权立即失效，必须重新执行八项匹配后才能开工。</text>
      </view>
    </block>

    <block v-else-if="activeTab === 'inbound'">
      <view class="process-card">
        <view class="process-head"><view><text>新机/二手机验真入库</text><text>样例：雷沃 M2004-5G · 3台</text></view><text>{{ inboundDone ? "已完成" : inboundRunning ? "核验中" : "待执行" }}</text></view>
        <view class="doc-grid">
          <view><text>供货主体</text><text>雷沃重工授权经销体系</text></view>
          <view><text>采购单号</text><text>CG-NJ-202607-018</text></view>
          <view><text>到货仓位</text><text>信丰县农机仓 A-03</text></view>
          <view><text>货值</text><text>¥858,000</text></view>
        </view>
        <view class="steps">
          <view v-for="(s, i) in inboundSteps" :key="s" :class="{ done: inboundStep > i, current: inboundStep === i }">
            <text>{{ inboundStep > i ? "✓" : i + 1 }}</text><text>{{ s }}</text>
          </view>
        </view>
        <view v-if="inboundDone" class="done-box">✅ 三台机具分别生成资产码，采购单、发票、证书、仓位和单机序列号已完成关联，可进入销售或租赁库存。</view>
        <view class="primary" :class="{ running: inboundRunning }" @tap="runInbound">{{ inboundRunning ? `自动核验 ${Math.min(100, Math.round(inboundStep / inboundSteps.length * 100))}%` : inboundDone ? "重新验真入库" : "一键验真并入库" }}</view>
      </view>

      <view class="rule-note">
        <text>二手机额外核验</text>
        <text>原始购置凭证、历次转让、登记变更、维修事故、工时里程、抵押查封、报废更新及补贴处置情况；权属或安全状态不清的设备只能进入待验区，不能先卖后补。</text>
      </view>
    </block>

    <block v-else-if="activeTab === 'orders'">
      <view class="mode-row"><text v-for="m in orderModes" :key="m" :class="{ on: orderMode === m }" @tap="changeMode(m)">{{ m }}</text></view>
      <view class="order-card">
        <view class="order-head"><view><text>{{ orderMode }}业务单</text><text>SZ-NJ-20260730-0086</text></view><text>{{ orderStep }}/{{ orderFlow.length }}</text></view>
        <view class="order-goods"><text>🚜</text><view><text>雷沃 M2004-5G 轮式拖拉机</text><text>资产码 AM-2026-00031 · 已锁库</text></view><text>¥286,000</text></view>
        <view class="flow">
          <view v-for="(s, i) in orderFlow" :key="s" :class="{ done: orderStep > i, current: orderStep === i }">
            <view><text>{{ orderStep > i ? "✓" : i + 1 }}</text><view v-if="i < orderFlow.length - 1"></view></view>
            <text>{{ s }}</text>
          </view>
        </view>
        <view class="money-safe">
          <text>💳 资金规则</text>
          <text>货款、租金或作业费由银行/持牌支付机构按合同处理；平台记录订单和履约指令，不沉淀客户资金。押金单独标识，验收无争议后按约解冻。</text>
        </view>
        <view class="primary" @tap="nextOrder">{{ orderStep >= orderFlow.length ? "重新核验全流程" : `完成：${orderFlow[orderStep]}` }}</view>
      </view>
    </block>

    <block v-else-if="activeTab === 'service'">
      <view class="service-summary">
        <view><text>96.8%</text><text>按时完工率</text></view><view><text>18分钟</text><text>平均响应</text></view><view><text>100%</text><text>关键配件溯源</text></view>
      </view>
      <view class="service-list">
        <view v-for="(s, i) in serviceOrders" :key="s.no" class="service-card">
          <view class="service-head"><view><text>{{ s.type }}</text><text>{{ s.no }}</text></view><text :class="serviceStatusClass(s.status)">{{ s.status }}</text></view>
          <text class="service-machine">{{ s.machine }}</text>
          <text class="service-issue">{{ s.issue }}</text>
          <view class="service-meta"><text>⏱ {{ s.sla }}</text><text>🔩 {{ s.parts }}</text></view>
          <view class="service-foot"><text>报修影像、远程诊断、配件出库、维修工时、复检签字全留痕</text><text @tap="serviceAction(i)">{{ s.status === "已完成" ? "查看档案" : "推进工单" }}</text></view>
        </view>
      </view>
      <view class="recall">
        <text>质量召回闭环</text>
        <view><text>1</text><text>厂家/监管预警</text><text>→</text><text>2</text><text>按型号批次锁定</text><text>→</text><text>3</text><text>停止销售和派单</text></view>
        <view><text>4</text><text>通知客户与回收</text><text>→</text><text>5</text><text>维修更换/退货</text><text>→</text><text>6</text><text>复检解锁与追偿</text></view>
      </view>
    </block>

    <view class="boundary">办理边界：本页面用于商家内部经营管理与平台风控联动。实际经营中，设备登记、检验、补贴、认证和无人机实名等事项，应按设备类别和所在地要求，由相应主管机关或依法授权机构办理。</view>
  </view>
</template>

<style scoped>
.merchant-machine{padding-bottom:48rpx;background:#f4f7f5;min-height:100vh;color:#17352a}
.hero{padding:34rpx 28rpx 30rpx;background:linear-gradient(145deg,#083f2c,#0f7650 58%,#23a56c);color:#fff}
.hero-row{display:flex;align-items:center;justify-content:space-between}.hero-k{font-size:23rpx;opacity:.86}.role{font-size:21rpx;padding:7rpx 14rpx;border:1rpx solid rgba(255,255,255,.42);border-radius:999rpx}
.hero-t{display:block;font-size:40rpx;font-weight:800;margin-top:18rpx}.hero-d{display:block;font-size:24rpx;line-height:1.7;opacity:.9;margin-top:10rpx}
.hero-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:8rpx;margin-top:24rpx}.hero-kpis view{background:rgba(255,255,255,.12);padding:14rpx 6rpx;text-align:center;border-radius:14rpx}.hero-kpis text{display:block;font-size:25rpx;font-weight:750}.hero-kpis text+text{font-size:19rpx;font-weight:400;opacity:.8;margin-top:4rpx}.hero-kpis .danger{color:#ffe092}
.tabs{background:#fff;border-bottom:1rpx solid #e6ece8}.tab-row{display:flex;width:max-content;padding:0 18rpx}.tab{padding:24rpx 20rpx 20rpx;font-size:24rpx;color:#66766f;white-space:nowrap;border-bottom:5rpx solid transparent}.tab.on{color:#087149;font-weight:750;border-bottom-color:#16a268}
.quick-links{display:grid;grid-template-columns:repeat(3,1fr);gap:12rpx;margin:20rpx 22rpx}.quick-links view{padding:19rpx 12rpx;background:#fff;border-radius:16rpx;box-shadow:0 3rpx 14rpx rgba(19,64,46,.06)}.quick-links text{display:block;font-size:32rpx}.quick-links text+text{font-size:24rpx;font-weight:700;margin-top:8rpx}.quick-links text+text+text{font-size:19rpx;font-weight:400;color:#72827b;margin-top:5rpx}
.section-title{display:flex;justify-content:space-between;align-items:center;margin:28rpx 24rpx 14rpx;font-size:29rpx;font-weight:800}.count{font-size:20rpx;color:#16845a;font-weight:500}
.alerts{margin:0 22rpx}.alert{display:grid;grid-template-columns:50rpx 1fr auto;align-items:center;gap:10rpx;padding:18rpx;margin-bottom:12rpx;background:#fff;border-radius:15rpx;border-left:7rpx solid}.alert>text:first-child{font-size:30rpx}.alert view text{display:block;font-size:24rpx;font-weight:700}.alert view text+text{font-size:20rpx;font-weight:400;color:#738078;margin-top:5rpx}.alert>text:last-child{font-size:21rpx;color:#147550}.alert.red{border-color:#d84949}.alert.amber{border-color:#e2a427}.alert.blue{border-color:#2d80c9}
.controls{margin:0 22rpx;display:grid;grid-template-columns:1fr 1fr;gap:12rpx}.controls>view{display:flex;gap:12rpx;background:#fff;padding:19rpx 15rpx;border-radius:15rpx}.control-icon{font-size:30rpx}.control-title,.control-desc{display:block}.control-title{font-size:24rpx;font-weight:750}.control-desc{font-size:20rpx;color:#6c7c74;line-height:1.5;margin-top:6rpx}
.search{display:flex;align-items:center;gap:12rpx;margin:20rpx 22rpx 10rpx;padding:16rpx 20rpx;background:#fff;border:1rpx solid #dce7e1;border-radius:14rpx}.search input{flex:1;font-size:23rpx}
.cats{margin-bottom:12rpx}.cat-row{display:flex;width:max-content;padding:4rpx 22rpx}.cat{font-size:21rpx;padding:10rpx 18rpx;margin-right:9rpx;border-radius:999rpx;background:#e7eee9;color:#627168}.cat.on{background:#167650;color:#fff}
.asset-list{margin:0 22rpx}.asset-card{background:#fff;margin-bottom:15rpx;border-radius:17rpx;padding:20rpx;border:1rpx solid #e2ebe6}.asset-card.blocked{border-color:#edc1c1}.asset-card.warning{border-color:#ecd89d}
.asset-head{display:flex;align-items:center;gap:12rpx}.asset-icon{font-size:40rpx}.asset-main{flex:1}.asset-model,.asset-id{display:block}.asset-model{font-size:26rpx;font-weight:800}.asset-id{font-size:19rpx;color:#78867f;margin-top:4rpx}.state{font-size:19rpx;padding:7rpx 12rpx;border-radius:999rpx;background:#e1f3e9;color:#13744c}.state-frozen{background:#fbe5e5;color:#b93434}.state-maintenance{background:#fff0cc;color:#9c6710}.state-rented,.state-working{background:#e4eefb;color:#2766a2}
.asset-tags{display:flex;flex-wrap:wrap;gap:8rpx;margin:15rpx 0}.asset-tags text{font-size:18rpx;padding:6rpx 10rpx;background:#f0f5f2;border-radius:7rpx;color:#53675d}
.asset-grid{display:grid;grid-template-columns:1fr 1fr;gap:12rpx;background:#f7faf8;padding:14rpx;border-radius:12rpx}.asset-grid text{display:block;font-size:19rpx;color:#7b8982}.asset-grid text+text{font-size:20rpx;color:#29493b;line-height:1.4;margin-top:3rpx}
.asset-alert{font-size:20rpx;margin-top:13rpx;padding:9rpx 12rpx;border-radius:8rpx;background:#e7f6ed;color:#15734c}.asset-alert.blocked{background:#fdeaea;color:#bb3535}.asset-alert.warning{background:#fff5da;color:#98640d}
.asset-foot{display:flex;align-items:flex-end;justify-content:space-between;margin-top:16rpx}.asset-foot>view>text{display:block;font-size:21rpx;font-weight:700}.asset-foot>view:last-child{display:flex;gap:10rpx}.ghost,.action{padding:10rpx 13rpx!important;border-radius:9rpx;font-weight:600!important}.ghost{border:1rpx solid #b9cec2;color:#237052}.action{background:#157852;color:#fff}.action.disabled{background:#adb9b3}
.match-hero{display:flex;align-items:center;gap:14rpx;margin:20rpx 22rpx 8rpx;padding:20rpx;border-radius:17rpx;color:#fff;background:linear-gradient(135deg,#173f59,#16704d)}.match-hero>view{flex:1}.match-hero>view text{display:block;font-size:27rpx;font-weight:800}.match-hero>view text+text{margin-top:5rpx;font-size:20rpx;line-height:1.5;font-weight:400;opacity:.86}.match-hero>text{font-size:21rpx;padding:9rpx 12rpx;border-radius:999rpx;background:rgba(255,255,255,.15)}
.task-scroll{white-space:nowrap}.task-row{display:inline-flex;gap:10rpx;padding:10rpx 22rpx}.match-task{display:flex;align-items:center;gap:10rpx;width:310rpx;padding:15rpx;background:#fff;border:2rpx solid transparent;border-radius:14rpx}.match-task.on{border-color:#168057;background:#edf8f2}.match-task>text{font-size:34rpx}.match-task>view text{display:block;font-size:22rpx;font-weight:750}.match-task>view text+text{font-size:18rpx;font-weight:400;color:#718078;margin-top:3rpx}
.task-detail,.match-checks{margin:12rpx 22rpx 0;padding:19rpx;background:#fff;border-radius:16rpx}.task-head{display:flex;justify-content:space-between;align-items:center}.task-head>view text{display:block;font-size:27rpx;font-weight:800}.task-head>view text+text{font-size:18rpx;font-weight:400;color:#7a8780;margin-top:3rpx}.task-head>text{font-size:20rpx;color:#a26016;background:#fff1d9;padding:8rpx 11rpx;border-radius:8rpx}
.task-grid{display:grid;grid-template-columns:1fr 1fr;gap:10rpx;margin-top:15rpx}.task-grid view{padding:11rpx;background:#f5f8f6;border-radius:9rpx}.task-grid text{display:block;font-size:18rpx;color:#7a8780}.task-grid text+text{font-size:20rpx;color:#27483a;margin-top:3rpx}
.match-checks{display:grid;grid-template-columns:1fr 1fr;gap:8rpx}.match-checks>view{display:flex;align-items:center;gap:9rpx;padding:9rpx;color:#7b8881;font-size:19rpx}.match-checks>view>text:first-child{flex:none;width:34rpx;height:34rpx;line-height:34rpx;text-align:center;border-radius:50%;background:#e4eae7}.match-checks>view.current{color:#126947;font-weight:700}.match-checks>view.current>text:first-child{background:#cce9da;color:#126947}.match-checks>view.done{color:#176c4b}.match-checks>view.done>text:first-child{color:#fff;background:#168057}
.match-run{margin:14rpx 22rpx 0;padding:18rpx;text-align:center;border-radius:12rpx;color:#fff;background:#167952;font-size:24rpx;font-weight:750}.match-run.running{background:#3b9270}
.pair-list{margin:0 22rpx}.pair-card{display:flex;gap:11rpx;margin-bottom:13rpx;padding:17rpx;background:#fff;border:2rpx solid #dce9e2;border-radius:16rpx}.pair-card.blocked{border-color:#edcccc}.pair-card.selected{border-color:#178056;background:#eff9f3}.pair-rank{flex:none;width:38rpx;height:38rpx;line-height:38rpx;text-align:center;border-radius:50%;background:#167952;color:#fff;font-size:19rpx;font-weight:800}.pair-card.blocked .pair-rank{background:#c64949}.pair-main{flex:1}.pair-head{display:grid;grid-template-columns:52rpx 1fr 62rpx;align-items:center;gap:10rpx}.operator-avatar{width:52rpx;height:52rpx;line-height:52rpx;text-align:center;border-radius:50%;background:#dceee4;color:#176d4b;font-size:24rpx;font-weight:800}.pair-head>view:nth-child(2) text{display:block;font-size:23rpx;font-weight:800}.pair-head>view:nth-child(2) text+text{font-size:17rpx;font-weight:400;color:#78867f;margin-top:3rpx}.pair-score{text-align:center}.pair-score text{display:block;font-size:27rpx;color:#14734d;font-weight:850}.pair-score text+text{font-size:15rpx;color:#75827b;font-weight:400}.pair-score.bad text:first-child{color:#bd3d3d}
.strengths,.pair-reasons{display:flex;flex-wrap:wrap;gap:7rpx;margin-top:12rpx}.strengths text,.pair-reasons text{font-size:17rpx;padding:6rpx 9rpx;border-radius:7rpx}.strengths text{background:#e9f6ee;color:#176d4b}.pair-reasons text{background:#fdeaea;color:#b73535}.pair-meta{margin-top:11rpx;padding:10rpx;background:#f5f8f6;border-radius:8rpx}.pair-meta text{display:block;font-size:17rpx;color:#65776e;line-height:1.5}.pair-action{margin-top:12rpx;padding:13rpx;text-align:center;border-radius:9rpx;color:#fff;background:#167952;font-size:21rpx;font-weight:700}.pair-action.disabled{background:#a8b1ad}.pair-action.selected{background:#113f31}
.change-rule{margin:18rpx 22rpx 0;padding:18rpx;border:1rpx solid #efd79e;border-radius:14rpx;background:#fff7e6}.change-rule text{display:block;font-size:23rpx;font-weight:800;color:#7b5516}.change-rule text+text{font-size:20rpx;line-height:1.6;font-weight:400;margin-top:6rpx;color:#765f37}
.process-card,.order-card{margin:20rpx 22rpx;background:#fff;border-radius:18rpx;padding:22rpx}.process-head,.order-head{display:flex;align-items:center;justify-content:space-between}.process-head view text,.order-head view text{display:block;font-size:28rpx;font-weight:800}.process-head view text+text,.order-head view text+text{font-size:20rpx;font-weight:400;color:#718078;margin-top:5rpx}.process-head>text,.order-head>text{font-size:21rpx;color:#168057}
.doc-grid{display:grid;grid-template-columns:1fr 1fr;gap:12rpx;margin-top:18rpx;background:#f4f8f5;padding:14rpx;border-radius:12rpx}.doc-grid text{display:block;font-size:19rpx;color:#7b8982}.doc-grid text+text{font-size:21rpx;color:#254638;margin-top:3rpx}
.steps{margin-top:20rpx}.steps>view{display:flex;align-items:center;gap:12rpx;padding:11rpx 0;color:#75827c;font-size:22rpx}.steps>view>text:first-child{width:38rpx;height:38rpx;line-height:38rpx;text-align:center;border-radius:50%;background:#e7ece9}.steps>view.done{color:#176f4c}.steps>view.done>text:first-child{background:#1a8b5d;color:#fff}.steps>view.current{color:#165c43;font-weight:700}.steps>view.current>text:first-child{background:#cbe9da;color:#126c48}
.done-box,.money-safe{font-size:21rpx;line-height:1.6;padding:14rpx;background:#eaf7ef;border-radius:10rpx;margin-top:15rpx;color:#205c43}.primary{margin-top:18rpx;background:#147a52;color:#fff;text-align:center;padding:19rpx;border-radius:12rpx;font-size:25rpx;font-weight:750}.primary.running{background:#3c9c74}
.rule-note{margin:0 22rpx;padding:19rpx;background:#fff8e5;border:1rpx solid #efdcab;border-radius:14rpx}.rule-note text{display:block;font-size:24rpx;font-weight:750;color:#7f5713}.rule-note text+text{font-size:21rpx;font-weight:400;line-height:1.65;margin-top:7rpx;color:#765f36}
.mode-row{display:flex;margin:20rpx 22rpx 0;background:#e4ece7;padding:5rpx;border-radius:12rpx}.mode-row text{flex:1;text-align:center;padding:13rpx 5rpx;font-size:22rpx;color:#607068;border-radius:9rpx}.mode-row text.on{background:#fff;color:#14734d;font-weight:750;box-shadow:0 2rpx 8rpx rgba(0,0,0,.06)}
.order-goods{display:grid;grid-template-columns:52rpx 1fr auto;align-items:center;gap:10rpx;margin:18rpx 0;padding:15rpx;background:#f5f8f6;border-radius:12rpx}.order-goods>text:first-child{font-size:36rpx}.order-goods view text{display:block;font-size:23rpx;font-weight:700}.order-goods view text+text{font-size:19rpx;font-weight:400;color:#718078;margin-top:4rpx}.order-goods>text:last-child{font-size:23rpx;font-weight:800;color:#d26928}
.flow{display:grid;grid-template-columns:repeat(7,1fr);margin:22rpx 0 12rpx}.flow>view{text-align:center;color:#8b9791;font-size:17rpx}.flow>view>view{display:flex;align-items:center}.flow>view>view>text{flex:none;width:34rpx;height:34rpx;line-height:34rpx;border-radius:50%;background:#e5eae7;margin:auto}.flow>view>view>view{height:3rpx;background:#dfe6e2;flex:1;margin-left:2rpx}.flow>view.done,.flow>view.current{color:#16704d}.flow>view.done>view>text{background:#168158;color:#fff}.flow>view.current>view>text{background:#c9e8d8;color:#126846}.flow>view>text{display:block;margin-top:7rpx;line-height:1.3}
.money-safe text{display:block;font-weight:750}.money-safe text+text{font-weight:400;margin-top:5rpx}
.service-summary{display:grid;grid-template-columns:repeat(3,1fr);gap:10rpx;margin:20rpx 22rpx}.service-summary view{background:#fff;padding:18rpx 8rpx;border-radius:14rpx;text-align:center}.service-summary text{display:block;font-size:27rpx;font-weight:800;color:#16744e}.service-summary text+text{font-size:19rpx;font-weight:400;color:#708077;margin-top:5rpx}
.service-list{margin:0 22rpx}.service-card{background:#fff;padding:20rpx;border-radius:16rpx;margin-bottom:13rpx}.service-head{display:flex;justify-content:space-between}.service-head view text{display:block;font-size:24rpx;font-weight:750}.service-head view text+text{font-size:18rpx;color:#7a8780;margin-top:3rpx}.service-head>text{font-size:19rpx;padding:6rpx 10rpx;background:#eaf4ee;color:#14704b;border-radius:8rpx}.service-head>text.service-frozen{background:#fde6e6;color:#b63333}
.service-machine{display:block;font-size:25rpx;font-weight:800;margin-top:15rpx}.service-issue{display:block;font-size:21rpx;color:#566c61;line-height:1.5;margin-top:6rpx}.service-meta{display:flex;gap:16rpx;margin-top:12rpx}.service-meta text{font-size:19rpx;color:#6b7c73}.service-foot{display:flex;align-items:center;gap:12rpx;border-top:1rpx solid #edf1ef;margin-top:14rpx;padding-top:13rpx}.service-foot text:first-child{flex:1;font-size:18rpx;color:#829088;line-height:1.4}.service-foot text:last-child{font-size:20rpx;padding:10rpx 13rpx;background:#167952;color:#fff;border-radius:9rpx}
.recall{margin:20rpx 22rpx;background:#fff3f0;border:1rpx solid #efd0c9;padding:20rpx;border-radius:16rpx}.recall>text{display:block;font-size:26rpx;font-weight:800;color:#a13b2f}.recall>view{display:flex;align-items:center;gap:7rpx;margin-top:14rpx}.recall>view text{font-size:17rpx;color:#6f554f}.recall>view text:nth-child(1),.recall>view text:nth-child(4),.recall>view text:nth-child(7){width:28rpx;height:28rpx;line-height:28rpx;text-align:center;background:#c85c4d;color:#fff;border-radius:50%}
.boundary{margin:28rpx 22rpx 0;padding:18rpx;background:#e9efec;border-radius:13rpx;font-size:20rpx;line-height:1.65;color:#65756d}
</style>
