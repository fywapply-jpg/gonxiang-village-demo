<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { recordPlatformEvent } from "@/services/localApi";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

type ProjectType = "plant" | "livestock";
type Stage = {
  no: number;
  title: string;
  owner: string;
  control: string;
  evidence: string;
  accept: string;
  block: string;
  fund: string;
};

const mode = ref<ProjectType>("plant");
const familyIndex = ref(0);
const roleIndex = ref(0);
const readyCount = ref(0);
const launchStep = ref(0);
const projectCreated = ref(false);
const processStep = ref(0);
const selectedStage = ref(0);
const launchRunning = ref(false);
const processRunning = ref(false);
let launchTimer: ReturnType<typeof setInterval> | null = null;
let processTimer: ReturnType<typeof setInterval> | null = null;

onLoad((q) => {
  mode.value = q?.type === "livestock" ? "livestock" : "plant";
});

const roles = ["农户", "家庭农场", "合作社", "农业企业", "受托代种/代养户"];
const plantFamilies = [
  { icon: "🌾", name: "粮食作物", examples: "水稻、小麦、玉米、薯类、豆类", focus: "种源、耕地、肥药、成熟度、粮食质量" },
  { icon: "🥬", name: "蔬菜食用菌", examples: "叶菜、茄果、根茎、瓜菜、食用菌", focus: "高频采收、农残、采收间隔、冷链" },
  { icon: "🍊", name: "水果瓜果", examples: "柑橘、苹果、梨、桃、葡萄、莓果、瓜类", focus: "果园批次、糖酸度、果径、农残、分级" },
  { icon: "🍵", name: "茶叶中药材", examples: "茶叶、药材、香料、桑蚕原料", focus: "采摘期、加工批次、特征成分与污染物" },
  { icon: "🌻", name: "油糖棉麻", examples: "油菜、花生、芝麻、甘蔗、甜菜、棉麻", focus: "含油/含糖率、水分、杂质和仓储" },
  { icon: "🍄", name: "设施农业", examples: "温室、大棚、植物工厂、无土栽培", focus: "环境曲线、水肥配方、基质和连续采收" },
  { icon: "🌿", name: "花卉苗木牧草", examples: "花卉、苗木、草种、饲草与青贮", focus: "品种纯度、检疫性有害生物、等级和成活率" },
];
const livestockFamilies = [
  { icon: "🐖", name: "生猪", examples: "种猪、仔猪、育肥猪", focus: "防疫条件、耳标、免疫、非洲猪瘟、出栏检疫" },
  { icon: "🐂", name: "牛类", examples: "肉牛、奶牛、种牛", focus: "来源检疫、布病结核监测、用药与乳品/出栏质量" },
  { icon: "🐑", name: "羊类", examples: "肉羊、奶羊、种羊", focus: "标识、免疫、检疫、寄生虫和用药" },
  { icon: "🐔", name: "禽类", examples: "肉鸡、蛋鸡、鸭、鹅、鸽", focus: "禽流感免疫、群体批次、产蛋/出栏、检疫" },
  { icon: "🐇", name: "兔蜂及其他", examples: "家兔、蜜蜂、鹌鹑等", focus: "品种专属防疫、投入品、产品检测与地方要求" },
  { icon: "🐟", name: "淡水养殖", examples: "鱼、虾、蟹、鳖、蛙", focus: "苗种、水质、饲料渔药、休药期、起捕检测" },
  { icon: "🦐", name: "海水养殖", examples: "海水鱼、虾蟹、贝类、藻类", focus: "海域/水域、苗种、病害、禁用药物和采捕批次" },
  { icon: "🦌", name: "许可特种养殖", examples: "依法许可的特种经济动物", focus: "物种名录、来源合法、许可、防疫和销售边界" },
];
const families = computed(() => mode.value === "plant" ? plantFamilies : livestockFamilies);
const family = computed(() => families.value[familyIndex.value] || families.value[0]);

const plantChecks = [
  { t: "主体与收款账户", d: "身份、经营主体、经办权限与同名账户核验" },
  { t: "地块及使用权", d: "定位到田、面积边界、承包/流转/托管关系真实有效" },
  { t: "产地环境基线", d: "土壤、灌溉水及周边污染风险评价；不适宜区域不得立项" },
  { t: "订单与销售方案", d: "先明确自销、订单收购或保供任务，再反推品种和标准" },
  { t: "预算、资金与保险", d: "种苗、农资、农机、人工、检测、仓储物流预算及资金来源" },
  { t: "技术与记录能力", d: "SOP负责人、社会化服务方、农事记录与必要的物联设备到位" },
];
const livestockChecks = [
  { t: "主体、场户与账户", d: "养殖主体、场户备案适用性、经办权限及同名账户核验" },
  { t: "场区防疫条件", d: "选址布局、隔离、消毒、兽医、无害化及粪污处理条件" },
  { t: "用地用水与环保", d: "场舍/水域使用依据、承载量、尾水或粪污资源化方案" },
  { t: "种畜禽/苗种来源", d: "供应方资质、来源合法、检疫或健康证明与运输方案" },
  { t: "饲料兽药与技术", d: "合格供应链、执业兽医/技术人员、免疫用药和休药期方案" },
  { t: "订单、预算与保险", d: "明确代养/自营/订单回收、成本、价格、死亡风险和保险责任" },
];
const prechecks = computed(() => mode.value === "plant" ? plantChecks : livestockChecks);

const launchSteps = computed(() => mode.value === "plant" ? [
  "选主体、地块和作物模板",
  "绑定订单/销路、质量标准与预算",
  "生成一地一品SOP、农事日历和投入品白名单",
  "签署项目协议、技术服务及订单附件",
  "生成种植批次码，项目正式开工",
] : [
  "选主体、场区和养殖品类模板",
  "绑定代养/自营模式、订单、预算和保险",
  "生成防疫、饲喂、用药、环保和应急SOP",
  "签署项目协议、技术服务及订单附件",
  "生成场户/栏舍/池塘批次码，项目正式开工",
]);

const plantStages: Stage[] = [
  { no: 1, title: "立项与地块基线验收", owner: "种植户 + 村社/合作社 + 技术服务方", control: "核验主体、地块权属/使用关系、边界面积、产地环境和禁限种风险", evidence: "地块四至、权属/托管资料、土壤与灌溉水基线、现场影像", accept: "主体真实、地块可用、环境适宜、面积一致，形成项目基线报告", block: "权属争议、产地污染或用途不符时禁止开工", fund: "只确认立项，不支付生产款" },
  { no: 2, title: "种苗与投入品进场验收", owner: "种植户 + 农资服务商", control: "种子种苗来源、品种真实性、农药肥料许可标签、批号和有效期", evidence: "采购合同、票据、合格证、批次照片、入库称重", accept: "来源可追溯、品种匹配、无禁限用品，数量与预算一致", block: "三无、过期、禁用或超项目白名单一律拒收入场", fund: "合格农资按合同进入待结算" },
  { no: 3, title: "播种定植与批次建档", owner: "种植户 + 农技员", control: "播期、密度、面积、机械作业与品种批次按SOP执行", evidence: "作业单、定位轨迹、照片、种苗用量与剩余量", accept: "一地一品一批一码，实际面积和密度在允许偏差内", block: "串种、超面积、无法定位或未建批次不得进入生产期", fund: "达到开工节点后按合同释放相应进度款" },
  { no: 4, title: "生育期农事过程管控", owner: "种植户 + 农技员 + 社会化服务方", control: "灌溉、施肥、植保、修剪、授粉等任务按日历执行并记录投入量", evidence: "农事记录、投入品扫码、人员机具、定位影像、物联曲线", accept: "任务闭环、用量合理、记录真实完整、异常有处置", block: "使用禁用农药、超范围超剂量或伪造记录，立即封批整改", fund: "通过月度/生育期验收后按合同释放服务款" },
  { no: 5, title: "中期长势与产量验收", owner: "技术服务方 + 订单采购方", control: "苗情/树势、病虫害、存活率、预计产量和订单缺口联合评估", evidence: "巡田报告、抽样点、遥感/影像、产量模型、整改工单", accept: "长势达到SOP阈值，预计产量与订单在可控区间", block: "重大病害、灾损或减产触发补种、保险报案和订单协商", fund: "只对验收合格部分确认进度；风险部分暂缓" },
  { no: 6, title: "安全间隔期与采前检测", owner: "种植户 + 合规检测机构", control: "最后用药时间、安全间隔期、抽样方案和农残/污染物检测", evidence: "用药台账、停药日历、抽样记录、检测报告、留样信息", accept: "间隔期已满，适用项目检测合格，报告与地块批次一致", block: "间隔期未满或检测不合格不得采收销售，复检仍不合格依法处置", fund: "货款保持未释放，检测费用按责任规则承担" },
  { no: 7, title: "采收、分级与产量验收", owner: "种植户 + 合作社/采购方", control: "成熟度、采收时间、净重、等级、损耗、包装和批次隔离", evidence: "采收单、称重单、分级结果、包装码、现场影像", accept: "数量、等级和品质达到合同容差，批次未混装", block: "抢收、混批、掺杂使假或等级不符转差异处理", fund: "合格数量形成待结货值，差异部分单独冻结" },
  { no: 8, title: "产地准出与合格证验收", owner: "生产主体 + 乡镇/县级监管协同", control: "依据质量控制和检测结果开具承诺达标合格证，证货码一致", evidence: "合格证、检测报告、生产记录摘要、批次追溯码", accept: "主体、产品、数量、开具日期和承诺事项完整，可核验", block: "无证、冒用、证货不符或不合格产品不得进入交易交付", fund: "具备准出条件后方可进入订单验收" },
  { no: 9, title: "交付、交易验收与结算", owner: "采购方 + 仓储物流 + 主办银行", control: "到货复磅、抽检、温控、差异、发票和合同资金条件联动", evidence: "运单、签收、复检、对账、发票、分账指令和银行回单", accept: "四流一致；正常、扣减和冻结金额合计等于本期应结金额", block: "质量争议只冻结争议部分；重大不合格启动召回和责任追溯", fund: "银行按生效合同直分，平台不经手货款" },
];

const livestockStages: Stage[] = [
  { no: 1, title: "立项、场区与防疫条件验收", owner: "养殖户 + 合作社 + 属地主管部门/服务机构", control: "判断场户备案和防疫条件适用要求，核验场区、隔离、消毒、粪污/尾水及无害化能力", evidence: "场区平面、备案/许可资料、设施影像、防疫与环保制度", accept: "主体、场址、规模、设施与品类相匹配，责任人到位", block: "禁养/限养、设施不达标、许可或来源边界不清不得开工", fund: "立项通过前不投入种畜禽/苗种" },
  { no: 2, title: "引种引苗与来源检疫验收", owner: "养殖户 + 供应方 + 官方兽医/水生动物防疫人员", control: "来源场资质、健康/检疫证明、品种数量、运输车辆和到场状态", evidence: "采购合同、检疫/健康证明、运输记录、到场清点与影像", accept: "来源合法、证物一致、数量健康状况符合合同", block: "无合法来源、证物不符、疑似染疫立即隔离报告", fund: "合格种源进入待结算；异常批次不付款" },
  { no: 3, title: "隔离观察、标识与批次建档", owner: "养殖户 + 兽医/技术员", control: "按品类执行隔离观察、个体标识或群体/池塘批次编码", evidence: "隔离日志、耳标/脚环/池塘码、日检、检测和转群记录", accept: "个体或群体可追溯，隔离期及适用检测达到要求", block: "未隔离、混群、标识缺失或检测异常不得转入生产群", fund: "隔离验收后按合同确认种源款" },
  { no: 4, title: "饲料、兽药与投入品验收", owner: "养殖户 + 供应商 + 兽医", control: "饲料、添加剂、兽药/渔药来源、批准信息、处方、批号和用法用量", evidence: "采购票据、标签合格证、处方、入库及领用记录", accept: "来源合法、适用对象正确、用量和库存账实一致", block: "假劣、禁用、原料药直用或无记录立即封存并报告", fund: "仅合格投入品纳入项目成本和结算" },
  { no: 5, title: "日常饲养与生物安全管控", owner: "养殖户 + 兽医/技术员", control: "饲喂饮水、环境水质、消毒、免疫、诊疗、死亡和无害化全过程记录", evidence: "养殖档案、免疫用药、环境/水质曲线、巡检、死亡处置联单", accept: "档案连续完整，异常处置闭环，关键环境指标受控", block: "异常死亡、重大疫病风险或污染物超标立即隔离、报告、停运", fund: "按月/阶段验收确认代养或技术服务款" },
  { no: 6, title: "中期生产性能与健康验收", owner: "养殖户 + 技术服务方 + 订单方", control: "存活率、增重/产蛋/产奶/水产长势、料比、健康和预计出栏量", evidence: "抽样称重、盘点、生产曲线、兽医报告、保险查勘", accept: "生产指标在品类SOP区间，订单供应能力可控", block: "异常损失或疫病触发诊疗、减栏、保险和订单重排", fund: "仅对真实存栏和合格绩效确认进度" },
  { no: 7, title: "休药期、疫病检测与检疫申报", owner: "养殖户 + 执业兽医 + 官方兽医", control: "核验最后用药、休药期、免疫、监测、养殖档案并按规定申报检疫", evidence: "处方用药记录、休药日历、检测报告、申报单和场户委托", accept: "休药期已满，档案齐全，适用检测符合要求，申报资料真实", block: "休药期未满、疫病阳性或档案不全不得出栏/起捕上市", fund: "货款继续冻结；整改和检测费用按责任承担" },
  { no: 8, title: "官方检疫与出场/起捕验收", owner: "官方兽医/法定机构 + 养殖主体", control: "依法查验资料、标识、临床健康及必要实验室检测；水产按适用规则执行", evidence: "动物检疫合格证明或适用品类质量证明、批次清单", accept: "法定人员依法出证，证物、数量、目的地和有效期一致", block: "平台不得代替官方兽医出证；检疫不合格依法隔离或无害化处理", fund: "取得适用法定/质量证明后才进入交付" },
  { no: 9, title: "运输、屠宰/起捕加工验收", owner: "备案承运方 + 定点屠宰/加工方 + 采购方", control: "一车一证、车辆消毒、轨迹温控；畜禽入场查验与同步检疫，水产分池起捕", evidence: "运单、检疫证明、消毒、轨迹、屠宰检疫/加工记录、影像", accept: "证车货一致、过程连续、产品批次重新编码并可追溯", block: "多车一证、途中换货、异常死亡或同步检疫不合格立即阻断", fund: "运输和加工合格服务费进入待结算" },
  { no: 10, title: "产品检测、合格证、冷链与结算", owner: "生产经营主体 + 检测/采购方 + 主办银行", control: "兽药残留、品质、承诺达标合格证、冷链签收、发票与资金条件联动", evidence: "检测、肉品/产品证明、合格证、温控、签收、对账和银行回单", accept: "产品批次、证明、数量质量和合同一致，四流勾稽通过", block: "残留超标、证货不符启动召回；只释放无争议合格金额", fund: "银行按合同直分；异常款冻结、退款或保险理赔" },
];
const stages = computed(() => mode.value === "plant" ? plantStages : livestockStages);
const selected = computed(() => stages.value[selectedStage.value] || stages.value[0]);
const processProgress = computed(() => Math.round((processStep.value / stages.value.length) * 100));

const acceptance = computed(() => mode.value === "plant" ? [
  { t: "开工验收", who: "合作社/项目经理 + 农技员", scope: "主体、地块、环境、种苗农资、SOP和预算", result: "通过/整改/终止" },
  { t: "过程验收", who: "农技员 + 订单方", scope: "农事记录、投入品、长势产量、灾损和整改", result: "节点通过/部分通过" },
  { t: "准出验收", who: "检测机构 + 生产主体", scope: "安全间隔期、采前检测、分级及承诺达标合格证", result: "允许采收交付/封批" },
  { t: "交易验收", who: "采购方 + 仓储物流 + 银行", scope: "复磅抽检、温控、发票、对账和结算条件", result: "放款/扣减/冻结" },
] : [
  { t: "开工验收", who: "合作社/项目经理 + 兽医/技术员", scope: "场区、备案/防疫条件、种源、设施、环保和SOP", result: "通过/整改/终止" },
  { t: "过程验收", who: "兽医/技术员 + 订单方", scope: "档案、免疫用药、环境、生产性能、死亡无害化", result: "节点通过/隔离整改" },
  { t: "出场验收", who: "官方兽医/适用法定机构", scope: "休药期、疫病检测、检疫申报、证物一致", result: "依法出证/不予出场" },
  { t: "产品交易验收", who: "检测/屠宰加工/采购方 + 银行", scope: "产品检验、合格证、冷链、签收、发票和结算", result: "放款/召回/冻结" },
]);

const contracts = [
  "项目共建与技术服务协议", "土地托管/场户代养协议", "订单收购与保底/市场化计价附件", "种苗种源及投入品采购合同",
  "农事/防疫SOP与质量验收附件", "检测检疫委托及数据授权", "农业保险与风险分担确认", "仓储物流、结算与售后附件",
];
const funds = [
  { t: "立项前", s: "¥0", d: "只核验条件，不以先收费换取准入" },
  { t: "开工验收", s: "按合同", d: "种源/农资真实进场后释放对应款项" },
  { t: "过程节点", s: "按实绩", d: "记录完整且验收通过才确认服务或代养进度" },
  { t: "准出/出场", s: "保持冻结", d: "检测、休药期、检疫或合格证未通过不得放货" },
  { t: "交付结算", s: "银行直分", d: "正常款释放，差异与争议金额单独冻结" },
];

function switchMode(next: ProjectType) {
  stopTimers();
  mode.value = next;
  familyIndex.value = 0;
  readyCount.value = 0;
  launchStep.value = 0;
  projectCreated.value = false;
  processStep.value = 0;
  selectedStage.value = 0;
  void recordPlatformEvent("digitalfarm", "SWITCH_PROJECT_TYPE", { type: next }).catch(() => {});
}
function markCheck(index: number) {
  if (productionBuild) return uni.showModal({ title: "需要后台核验", content: "正式环境的土地/养殖设施、主体资质、合同和检测前置条件必须由后台核验后返回，当前未写入本地核验结果。", showCancel: false });
  if (index > readyCount.value) {
    uni.showToast({ title: `请先完成第${readyCount.value + 1}项`, icon: "none" });
    return;
  }
  if (index === readyCount.value) readyCount.value += 1;
  if (index === readyCount.value - 1) void recordPlatformEvent("digitalfarm", "COMPLETE_PRECHECK", { type: mode.value, index }).catch(() => {});
}
function stopTimers() {
  if (launchTimer) clearInterval(launchTimer);
  if (processTimer) clearInterval(processTimer);
  launchTimer = null;
  processTimer = null;
  launchRunning.value = false;
  processRunning.value = false;
}
function runLaunch() {
  if (productionBuild) return uni.showModal({ title: "需要生产项目服务", content: "正式环境的种植/养殖项目立项必须由后台生成项目号、合同附件和追溯码，当前未执行立项。", showCancel: false });
  if (launchRunning.value) {
    stopTimers();
    return;
  }
  readyCount.value = 0;
  launchStep.value = 0;
  projectCreated.value = false;
  launchRunning.value = true;
  void recordPlatformEvent("digitalfarm", "RUN_LAUNCH_CHECK", { type: mode.value, family: family.value.name }).catch(() => {});
  let tick = 0;
  launchTimer = setInterval(() => {
    tick += 1;
    if (readyCount.value < prechecks.value.length) {
      readyCount.value += 1;
      return;
    }
    if (launchStep.value < launchSteps.value.length) {
      launchStep.value += 1;
      return;
    }
    projectCreated.value = true;
    stopTimers();
    uni.showToast({ title: "项目已正式建档", icon: "success" });
  }, 420);
}
function createProject() {
  if (productionBuild) return uni.showModal({ title: "需要生产项目服务", content: "正式环境的项目建档必须由后台保存主体、地块/栏舍、SOP、验收计划和批次规则，当前未写入项目。", showCancel: false });
  if (readyCount.value < prechecks.value.length) {
    uni.showModal({ title: "开工条件未齐", content: `还需完成 ${prechecks.value.length - readyCount.value} 项前置核验。请逐项核验，或使用“批量核验开工条件”完成办理准备。`, showCancel: false });
    return;
  }
  if (launchStep.value < launchSteps.value.length) {
    launchStep.value += 1;
    return;
  }
  projectCreated.value = true;
  void recordPlatformEvent("digitalfarm", "CREATE_PROJECT", { type: mode.value, family: family.value.name, role: roles[roleIndex.value] }).catch(() => {});
  uni.showModal({ title: "项目建档成功", content: `${mode.value === "plant" ? "ZZ" : "YZ"}-2026-08509\n${family.value.name} · ${roles[roleIndex.value]}\n已生成SOP、验收表、合同附件和批次追溯码。`, showCancel: false });
}
function runProcess() {
  if (productionBuild) return uni.showModal({ title: "需要后台验收服务", content: "正式环境的每个种植/养殖验收节点必须上传证据并由授权岗位确认，当前未执行本地验收。", showCancel: false });
  if (!projectCreated.value) {
    uni.showToast({ title: "请先完成项目发起", icon: "none" });
    return;
  }
  if (processRunning.value) {
    stopTimers();
    return;
  }
  processStep.value = 0;
  selectedStage.value = 0;
  processRunning.value = true;
  void recordPlatformEvent("digitalfarm", "RUN_ACCEPTANCE", { type: mode.value, family: family.value.name }).catch(() => {});
  processTimer = setInterval(() => {
    processStep.value += 1;
    selectedStage.value = Math.min(processStep.value, stages.value.length - 1);
    if (processStep.value >= stages.value.length) {
      stopTimers();
      uni.showToast({ title: "全周期验收已完成", icon: "success" });
    }
  }, 520);
}
function selectStage(index: number) {
  selectedStage.value = index;
}
function statusOf(index: number) {
  if (index < processStep.value) return "已验收";
  if (index === processStep.value) return projectCreated.value ? "待执行" : "待立项";
  return "待前置";
}
function goDashboard() {
  uni.navigateTo({ url: mode.value === "plant" ? "/pages/digitalfarm/index" : "/pages/digitalfarm/livestock" });
}
function goContracts() {
  uni.navigateTo({ url: "/pages/trade/contracts" });
}
function goResources() {
  uni.navigateTo({ url: "/pages/digitalfarm/resources" });
}

onUnmounted(stopTimers);
</script>

<template>
  <view class="sg-page project-page" :class="{ animal: mode === 'livestock' }">
    <view class="hero">
      <text class="hero-k">数智供社 v8533 · 生产项目制</text>
      <text class="hero-t">种养项目发起与全过程验收</text>
      <text class="hero-s">农户先把“谁来做、在哪里做、做什么、卖给谁、按什么标准验收、哪一步才能付款”确定下来，再开工生产。</text>
      <view class="mode-tabs">
        <view :class="{ on: mode === 'plant' }" @tap="switchMode('plant')">🌱 数字种植</view>
        <view :class="{ on: mode === 'livestock' }" @tap="switchMode('livestock')">🐄 数字养殖</view>
      </view>
      <view class="resource-entry" @tap="goResources">🗺️ 先核对县域资源底图、适种适养与可供能力 ›</view>
    </view>

    <view class="summary">
      <view><text>{{ mode === "plant" ? 7 : 8 }}</text><text>品类模板</text></view>
      <view><text>{{ stages.length }}</text><text>管控节点</text></view>
      <view><text>4</text><text>验收层级</text></view>
      <view><text>8</text><text>合同附件</text></view>
    </view>

    <view class="section-head">
      <view><text class="section-t">第一步 · 选项目模板</text><text class="section-s">模板覆盖大类，立项后再按具体品种、地域、季节和用途加载适用标准</text></view>
    </view>
    <scroll-view scroll-x class="families">
      <view class="family-row">
        <view v-for="(item, i) in families" :key="item.name" class="family" :class="{ on: familyIndex === i }" @tap="familyIndex = i">
          <text>{{ item.icon }}</text><text>{{ item.name }}</text>
        </view>
      </view>
    </scroll-view>
    <view class="family-detail">
      <view class="family-icon">{{ family.icon }}</view>
      <view><text class="family-name">{{ family.name }}</text><text class="family-examples">{{ family.examples }}</text><text class="family-focus">重点管控：{{ family.focus }}</text></view>
    </view>

    <view class="role-row">
      <text class="role-label">项目发起人</text>
      <scroll-view scroll-x><view class="role-scroll"><text v-for="(item, i) in roles" :key="item" :class="{ on: roleIndex === i }" @tap="roleIndex = i">{{ item }}</text></view></scroll-view>
    </view>

    <view class="section-head">
      <view><text class="section-t">第二步 · 开工前6项核验</text><text class="section-s">不是填完表就开工，条件、能力、销路和风险责任必须同时落地</text></view>
      <text class="section-count">{{ readyCount }}/6</text>
    </view>
    <view class="check-list">
      <view v-for="(item, i) in prechecks" :key="item.t" class="check" :class="{ done: i < readyCount, active: i === readyCount }" @tap="markCheck(i)">
        <view class="check-no">{{ i < readyCount ? "✓" : i + 1 }}</view>
        <view><text class="check-t">{{ item.t }}</text><text class="check-d">{{ item.d }}</text></view>
        <text class="check-status">{{ i < readyCount ? "通过" : i === readyCount ? "去核验" : "待前置" }}</text>
      </view>
    </view>

    <view class="launch-card">
      <view class="launch-head"><view><text>项目发起5步</text><text>{{ family.name }} · {{ roles[roleIndex] }}</text></view><text>{{ launchStep }}/5</text></view>
      <view class="launch-steps">
        <view v-for="(item, i) in launchSteps" :key="item" :class="{ done: i < launchStep, active: i === launchStep }">
          <view>{{ i < launchStep ? "✓" : i + 1 }}</view><text>{{ item }}</text>
        </view>
      </view>
      <view v-if="projectCreated" class="created">
        <text>✅ 项目已建档</text>
        <text>{{ mode === "plant" ? "ZZ" : "YZ" }}-2026-08509 · 已生成SOP、验收表、合同附件、批次码和风险台账</text>
      </view>
      <view class="launch-actions">
        <view class="secondary" @tap="runLaunch">{{ launchRunning ? "暂停核验" : "批量核验开工条件" }}</view>
        <view class="primary" @tap="createProject">{{ projectCreated ? "查看项目档案" : launchStep < 5 ? "继续下一步" : "确认开工" }}</view>
      </view>
    </view>

    <view class="law-boundary">
      <text class="law-icon">⚖️</text>
      <view>
        <text class="law-title">谁验收、谁负责</text>
        <text class="law-text">平台负责流程、证据和合同条件校验；农技员/兽医负责专业服务；有资质检测机构出具检测结果；动物检疫由官方兽医依法实施。平台不能用“上链”或AI判断代替法定检测检疫。</text>
      </view>
    </view>

    <view class="section-head">
      <view><text class="section-t">第三步 · 全周期管控与验收</text><text class="section-s">每个节点同时核对责任、证据、通过标准、阻断条件和资金状态</text></view>
      <text class="section-count">{{ processProgress }}%</text>
    </view>
    <view class="process-actions">
      <view class="progress-bar"><view :style="{ width: processProgress + '%' }"></view></view>
      <view class="process-btn" @tap="runProcess">{{ processRunning ? "暂停验收" : processStep === stages.length ? "重新核验" : `开始${stages.length}道管控验收` }}</view>
    </view>

    <view class="stage-list">
      <view v-for="(item, i) in stages" :key="item.no" class="stage" :class="{ active: selectedStage === i, done: i < processStep }" @tap="selectStage(i)">
        <view class="stage-no">{{ i < processStep ? "✓" : item.no }}</view>
        <view class="stage-main"><text class="stage-title">{{ item.title }}</text><text class="stage-owner">{{ item.owner }}</text></view>
        <text class="stage-status">{{ statusOf(i) }}</text>
      </view>
    </view>

    <view class="stage-detail">
      <view class="detail-head"><text>第{{ selected.no }}关 · {{ selected.title }}</text><text>{{ statusOf(selectedStage) }}</text></view>
      <view class="detail-row"><text>责任主体</text><text>{{ selected.owner }}</text></view>
      <view class="detail-row"><text>管控事项</text><text>{{ selected.control }}</text></view>
      <view class="detail-row"><text>必须证据</text><text>{{ selected.evidence }}</text></view>
      <view class="detail-row pass"><text>通过标准</text><text>{{ selected.accept }}</text></view>
      <view class="detail-row block"><text>阻断处置</text><text>{{ selected.block }}</text></view>
      <view class="detail-row fund"><text>资金结果</text><text>{{ selected.fund }}</text></view>
    </view>

    <view class="section-head">
      <view><text class="section-t">四层验收责任表</text><text class="section-s">把平台验收、专业验收和法定检疫分开，结论才能用于合同和资金</text></view>
    </view>
    <view class="accept-list">
      <view v-for="(item, i) in acceptance" :key="item.t" class="accept">
        <view class="accept-no">{{ i + 1 }}</view>
        <view><text class="accept-t">{{ item.t }}</text><text class="accept-who">验收人：{{ item.who }}</text><text class="accept-scope">{{ item.scope }}</text><text class="accept-result">结论：{{ item.result }}</text></view>
      </view>
    </view>

    <view class="section-head">
      <view><text class="section-t">项目合同与附件包</text><text class="section-s">不是一份总协议包打天下，按项目角色和服务逐份启用</text></view>
    </view>
    <view class="contract-grid">
      <view v-for="(item, i) in contracts" :key="item"><text>{{ i + 1 }}</text><text>{{ item }}</text></view>
    </view>
    <view class="contract-link" @tap="goContracts">查看 CA 合同包、签署主体与线上签约顺序 ›</view>

    <view class="section-head">
      <view><text class="section-t">资金随验收走</text><text class="section-s">比例和金额由生效合同决定，平台只校验条件，不沉淀交易资金</text></view>
    </view>
    <view class="fund-list">
      <view v-for="item in funds" :key="item.t"><text>{{ item.t }}</text><text>{{ item.s }}</text><text>{{ item.d }}</text></view>
    </view>

    <view class="red-lines">
      <text class="red-title">三色风险处置</text>
      <view><text class="green">绿</text><text>证据齐全、指标合格：放行下一节点和对应资金。</text></view>
      <view><text class="yellow">黄</text><text>记录缺失、物联异常、任务逾期：限时整改、复验，相关款暂缓。</text></view>
      <view><text class="red">红</text><text>禁用投入品、残留超标、疫病阳性、无检疫证明、证货不符：封批/隔离、报告、召回或无害化处理，禁止付款。</text></view>
    </view>

    <view class="compliance-note">
      <text>合规基线（上线口径）</text>
      <text>种植执行投入品生产记录、安全间隔期、检测和承诺达标合格证；畜禽执行标识养殖档案、免疫用药、休药期、检疫申报和无害化处理；水产执行生产、用药、水质和销售记录。具体项目仍须按品种、规模、用途和属地要求加载最新适用标准。</text>
    </view>

    <view class="bottom-actions">
      <view @tap="goDashboard">进入{{ mode === "plant" ? "种植" : "养殖" }}运营台</view>
      <view @tap="runProcess">{{ projectCreated ? "开始全过程验收" : "请先完成项目发起" }}</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.project-page { padding-bottom: 150rpx; background: #f3f6f4; }
.hero { padding: 32rpx 26rpx 30rpx; color: #fff; background: linear-gradient(145deg, #0b5f38, #16884c 58%, #318b72); border-radius: 0 0 34rpx 34rpx; }
.animal .hero { background: linear-gradient(145deg, #7e3525, #a84b33 58%, #b8713c); }
.hero-k { display: block; font-size: 20rpx; opacity: .82; }
.hero-t { display: block; margin-top: 12rpx; font-size: 36rpx; font-weight: 900; }
.hero-s { display: block; margin-top: 10rpx; font-size: 21rpx; line-height: 1.65; opacity: .9; }
.mode-tabs { display: flex; gap: 12rpx; margin-top: 20rpx; padding: 6rpx; border-radius: 16rpx; background: rgba(255,255,255,.13); }
.mode-tabs>view { flex: 1; padding: 15rpx 8rpx; border-radius: 12rpx; text-align: center; font-size: 23rpx; font-weight: 800; }
.mode-tabs>view.on { color: #18583b; background: #fff; }
.animal .mode-tabs>view.on { color: #8f3d28; }
.resource-entry { margin-top: 14rpx; padding: 13rpx 15rpx; border: 1rpx solid rgba(255,255,255,.32); border-radius: 13rpx; background: rgba(0,0,0,.11); font-size: 20rpx; font-weight: 700; text-align: center; }
.summary { display: grid; grid-template-columns: repeat(4, 1fr); margin: 18rpx 24rpx 0; padding: 18rpx 0; border-radius: 20rpx; background: #fff; box-shadow: $sg-shadow; }
.summary>view { display: flex; flex-direction: column; align-items: center; border-right: 2rpx solid #eef1ef; }
.summary>view:last-child { border-right: 0; }
.summary text:first-child { color: $sg-primary; font-size: 31rpx; font-weight: 900; }
.animal .summary text:first-child { color: #a74730; }
.summary text:last-child { margin-top: 3rpx; color: $sg-text-3; font-size: 17rpx; }
.section-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 15rpx; margin: 25rpx 24rpx 14rpx; }
.section-head>view { display: flex; flex-direction: column; }
.section-t { color: $sg-text; font-size: 29rpx; font-weight: 900; }
.section-s { margin-top: 5rpx; color: $sg-text-3; font-size: 19rpx; line-height: 1.45; }
.section-count { flex: none; color: $sg-primary; font-size: 22rpx; font-weight: 800; }
.animal .section-count { color: #a74730; }
.families { white-space: nowrap; }
.family-row { display: inline-flex; gap: 11rpx; padding: 2rpx 24rpx 12rpx; }
.family { display: flex; flex-direction: column; align-items: center; min-width: 126rpx; padding: 15rpx 12rpx; border: 2rpx solid transparent; border-radius: 17rpx; background: #fff; box-shadow: 0 5rpx 18rpx rgba(30,50,40,.06); }
.family text:first-child { font-size: 35rpx; }
.family text:last-child { margin-top: 5rpx; color: $sg-text-2; font-size: 19rpx; }
.family.on { border-color: $sg-primary; background: $sg-primary-light; }
.animal .family.on { border-color: #a74730; background: #fff0eb; }
.family-detail { display: flex; gap: 15rpx; margin: 4rpx 24rpx 0; padding: 20rpx; border-radius: 20rpx; color: #fff; background: linear-gradient(135deg, #265b43, #3a7960); }
.animal .family-detail { background: linear-gradient(135deg, #774033, #a85c44); }
.family-icon { flex: none; width: 64rpx; height: 64rpx; display: flex; align-items: center; justify-content: center; border-radius: 17rpx; background: rgba(255,255,255,.12); font-size: 36rpx; }
.family-detail>view:last-child { display: flex; flex-direction: column; }
.family-name { font-size: 25rpx; font-weight: 900; }
.family-examples { margin-top: 3rpx; font-size: 19rpx; opacity: .8; }
.family-focus { margin-top: 6rpx; font-size: 19rpx; line-height: 1.45; }
.role-row { display: flex; align-items: center; gap: 10rpx; margin: 14rpx 24rpx 0; padding: 14rpx; border-radius: 16rpx; background: #fff; }
.role-label { flex: none; color: $sg-text-3; font-size: 19rpx; }
.role-row scroll-view { flex: 1; white-space: nowrap; }
.role-scroll { display: inline-flex; gap: 8rpx; }
.role-scroll text { padding: 8rpx 13rpx; border-radius: 999rpx; color: $sg-text-2; background: #f1f3f2; font-size: 18rpx; }
.role-scroll text.on { color: #fff; background: $sg-primary; }
.animal .role-scroll text.on { background: #a74730; }
.check-list { margin: 0 24rpx; overflow: hidden; border-radius: 20rpx; background: #fff; box-shadow: $sg-shadow; }
.check { display: flex; align-items: center; gap: 13rpx; padding: 17rpx; border-bottom: 2rpx solid #eef1ef; }
.check:last-child { border-bottom: 0; }
.check.active { background: #fff9ec; }
.check-no { flex: none; width: 41rpx; height: 41rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: $sg-text-3; background: #e9ecea; font-size: 18rpx; font-weight: 900; }
.check.done .check-no { color: #fff; background: $sg-primary; }
.animal .check.done .check-no { background: #a74730; }
.check>view:nth-child(2) { flex: 1; display: flex; flex-direction: column; }
.check-t { color: $sg-text; font-size: 22rpx; font-weight: 800; }
.check-d { margin-top: 4rpx; color: $sg-text-3; font-size: 18rpx; line-height: 1.45; }
.check-status { flex: none; color: $sg-text-3; font-size: 18rpx; }
.check.active .check-status { color: #b5791b; font-weight: 800; }
.check.done .check-status { color: $sg-primary; }
.launch-card { margin: 20rpx 24rpx 0; padding: 22rpx; border-radius: 22rpx; background: #fff; box-shadow: $sg-shadow; }
.launch-head { display: flex; justify-content: space-between; }
.launch-head>view { display: flex; flex-direction: column; }
.launch-head>view text:first-child { font-size: 27rpx; font-weight: 900; }
.launch-head>view text:last-child { margin-top: 3rpx; color: $sg-text-3; font-size: 18rpx; }
.launch-head>text { color: $sg-primary; font-size: 24rpx; font-weight: 900; }
.launch-steps { margin-top: 14rpx; }
.launch-steps>view { display: flex; align-items: center; gap: 12rpx; padding: 10rpx 0; color: $sg-text-3; font-size: 20rpx; }
.launch-steps>view>view { width: 35rpx; height: 35rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #e9ecea; font-size: 17rpx; font-weight: 800; }
.launch-steps>view.done, .launch-steps>view.active { color: $sg-text; font-weight: 700; }
.launch-steps>view.done>view { color: #fff; background: $sg-primary; }
.launch-steps>view.active>view { color: #fff; background: $sg-gold; }
.created { display: flex; flex-direction: column; gap: 5rpx; margin-top: 13rpx; padding: 15rpx; border-radius: 12rpx; color: $sg-primary-deep; background: $sg-primary-light; }
.created text:first-child { font-size: 23rpx; font-weight: 900; }
.created text:last-child { font-size: 18rpx; line-height: 1.45; }
.launch-actions { display: flex; gap: 12rpx; margin-top: 16rpx; }
.launch-actions>view { flex: 1; padding: 18rpx 8rpx; border-radius: 999rpx; text-align: center; font-size: 21rpx; font-weight: 800; }
.launch-actions .secondary { color: $sg-primary; background: $sg-primary-light; }
.launch-actions .primary { color: #fff; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); }
.animal .launch-actions .secondary { color: #95402c; background: #fff0eb; }
.animal .launch-actions .primary { background: linear-gradient(135deg, #b5563c, #8f3d28); }
.law-boundary { display: flex; gap: 14rpx; margin: 18rpx 24rpx 0; padding: 19rpx; border: 2rpx solid #d6e6f7; border-radius: 18rpx; background: #f6faff; }
.law-icon { font-size: 34rpx; }
.law-boundary>view { flex: 1; display: flex; flex-direction: column; }
.law-title { color: #285323; font-size: 23rpx; font-weight: 900; }
.law-text { margin-top: 5rpx; color: #567087; font-size: 18rpx; line-height: 1.55; }
.process-actions { margin: 0 24rpx 14rpx; padding: 16rpx; border-radius: 16rpx; background: #fff; }
.progress-bar { height: 8rpx; overflow: hidden; border-radius: 999rpx; background: #e8ece9; }
.progress-bar>view { height: 100%; border-radius: 999rpx; background: $sg-primary; transition: width .35s; }
.animal .progress-bar>view { background: #a74730; }
.process-btn { margin-top: 12rpx; padding: 15rpx; border-radius: 999rpx; color: #fff; background: $sg-primary; text-align: center; font-size: 21rpx; font-weight: 800; }
.animal .process-btn { background: #a74730; }
.stage-list { margin: 0 24rpx; overflow: hidden; border-radius: 20rpx; background: #fff; box-shadow: $sg-shadow; }
.stage { display: flex; align-items: center; gap: 13rpx; padding: 16rpx; border-bottom: 2rpx solid #eef1ef; }
.stage:last-child { border-bottom: 0; }
.stage.active { background: #f0faf4; box-shadow: inset 6rpx 0 $sg-primary; }
.animal .stage.active { background: #fff3ef; box-shadow: inset 6rpx 0 #a74730; }
.stage-no { flex: none; width: 42rpx; height: 42rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: $sg-text-3; background: #e9ecea; font-size: 18rpx; font-weight: 900; }
.stage.done .stage-no { color: #fff; background: $sg-primary; }
.animal .stage.done .stage-no { background: #a74730; }
.stage-main { flex: 1; display: flex; flex-direction: column; }
.stage-title { color: $sg-text; font-size: 22rpx; font-weight: 800; }
.stage-owner { margin-top: 3rpx; color: $sg-text-3; font-size: 17rpx; }
.stage-status { flex: none; color: $sg-text-3; font-size: 18rpx; }
.stage-detail { margin: 18rpx 24rpx 0; padding: 22rpx; border-radius: 22rpx; background: #fff; box-shadow: $sg-shadow; }
.detail-head { display: flex; justify-content: space-between; gap: 10rpx; padding-bottom: 14rpx; border-bottom: 2rpx solid #eef1ef; }
.detail-head text:first-child { font-size: 25rpx; font-weight: 900; }
.detail-head text:last-child { color: $sg-primary; font-size: 18rpx; }
.detail-row { display: flex; gap: 12rpx; padding: 13rpx 0; border-bottom: 2rpx dashed #edf0ee; }
.detail-row>text:first-child { flex: 0 0 96rpx; color: $sg-text-3; font-size: 19rpx; }
.detail-row>text:last-child { flex: 1; color: $sg-text-2; font-size: 20rpx; line-height: 1.5; }
.detail-row.pass, .detail-row.block, .detail-row.fund { margin-top: 8rpx; padding: 12rpx; border: 0; border-radius: 11rpx; }
.detail-row.pass { background: #edf9f2; }
.detail-row.pass text { color: #28734a; }
.detail-row.block { background: #fff0ee; }
.detail-row.block text { color: #9a4637; }
.detail-row.fund { background: #fff7e8; }
.detail-row.fund text { color: #8a631a; }
.accept-list { margin: 0 24rpx; }
.accept { display: flex; gap: 14rpx; margin-bottom: 11rpx; padding: 18rpx; border-radius: 18rpx; background: #fff; box-shadow: 0 5rpx 18rpx rgba(30,50,40,.05); }
.accept-no { flex: none; width: 42rpx; height: 42rpx; display: flex; align-items: center; justify-content: center; border-radius: 12rpx; color: #fff; background: #385e72; font-size: 18rpx; font-weight: 900; }
.accept>view:last-child { flex: 1; display: flex; flex-direction: column; }
.accept-t { font-size: 23rpx; font-weight: 900; }
.accept-who, .accept-scope, .accept-result { margin-top: 4rpx; color: $sg-text-3; font-size: 18rpx; line-height: 1.45; }
.accept-result { color: $sg-primary; font-weight: 700; }
.contract-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10rpx; margin: 0 24rpx; }
.contract-grid>view { display: flex; gap: 9rpx; align-items: flex-start; padding: 14rpx; border-radius: 13rpx; background: #fff; }
.contract-grid text:first-child { flex: none; width: 29rpx; height: 29rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; background: #6b47a8; font-size: 15rpx; }
.contract-grid text:last-child { color: $sg-text-2; font-size: 18rpx; line-height: 1.4; }
.contract-link { margin: 12rpx 24rpx 0; padding: 17rpx; border-radius: 999rpx; color: #6b47a8; background: #f3edff; text-align: center; font-size: 20rpx; font-weight: 800; }
.fund-list { margin: 0 24rpx; overflow: hidden; border-radius: 20rpx; background: #fff; }
.fund-list>view { display: grid; grid-template-columns: 100rpx 100rpx 1fr; gap: 10rpx; padding: 15rpx; border-bottom: 2rpx solid #eef1ef; }
.fund-list>view:last-child { border-bottom: 0; }
.fund-list text { font-size: 18rpx; line-height: 1.45; }
.fund-list text:first-child { color: $sg-text; font-weight: 800; }
.fund-list text:nth-child(2) { color: $sg-primary; font-weight: 900; }
.fund-list text:last-child { color: $sg-text-3; }
.red-lines { margin: 20rpx 24rpx 0; padding: 20rpx; border-radius: 20rpx; color: #fff; background: linear-gradient(135deg, #273945, #405a65); }
.red-title { display: block; margin-bottom: 10rpx; font-size: 25rpx; font-weight: 900; }
.red-lines>view { display: flex; gap: 10rpx; margin-top: 8rpx; font-size: 18rpx; line-height: 1.5; }
.red-lines>view text:first-child { flex: none; width: 34rpx; height: 34rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; font-weight: 900; }
.red-lines .green { background: #16884c; }
.red-lines .yellow { background: #d99a2b; }
.red-lines .red { background: #c0392b; }
.red-lines>view text:last-child { flex: 1; opacity: .9; }
.compliance-note { margin: 17rpx 24rpx 0; padding: 19rpx; border: 2rpx solid #eadcb9; border-radius: 18rpx; background: #fffaf0; }
.compliance-note text:first-child { display: block; color: #86601f; font-size: 22rpx; font-weight: 900; }
.compliance-note text:last-child { display: block; margin-top: 6rpx; color: #746548; font-size: 18rpx; line-height: 1.6; }
.bottom-actions { position: fixed; left: 0; right: 0; bottom: 0; z-index: 8; display: flex; gap: 12rpx; padding: 15rpx 24rpx calc(15rpx + env(safe-area-inset-bottom)); background: rgba(255,255,255,.96); box-shadow: 0 -5rpx 22rpx rgba(25,50,35,.08); }
.bottom-actions>view { padding: 20rpx 8rpx; border-radius: 999rpx; text-align: center; font-size: 22rpx; font-weight: 800; }
.bottom-actions>view:first-child { flex: 0 0 35%; color: $sg-primary; background: $sg-primary-light; }
.bottom-actions>view:last-child { flex: 1; color: #fff; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); }
.animal .bottom-actions>view:first-child { color: #95402c; background: #fff0eb; }
.animal .bottom-actions>view:last-child { background: linear-gradient(135deg, #b5563c, #8f3d28); }
</style>
