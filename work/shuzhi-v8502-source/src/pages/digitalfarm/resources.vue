<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const productionBlocked = () => uni.showModal({ title: "需后台资源服务", content: "正式环境的资源匹配必须使用县级审定底图和后台规则服务，当前未执行本地匹配。", showCancel: false });

type TabKey = "map" | "match" | "execute";
type VerifyState = "已核验" | "待复核" | "估算";

const tab = ref<TabKey>("map");
const level = ref<"county" | "town" | "village">("county");
const townIndex = ref(0);
const villageIndex = ref(0);
const running = ref(false);
const runStep = ref(0);
let timer: ReturnType<typeof setInterval> | null = null;

const towns = [
  { name: "丰泽镇", villages: ["丰收村", "新田村", "河湾村"], land: 38600, score: 92 },
  { name: "青岭镇", villages: ["青山村", "岭南村", "茶园村"], land: 32100, score: 86 },
  { name: "临江镇", villages: ["江口村", "渔业村", "沙洲村"], land: 27400, score: 81 },
];
const currentTown = computed(() => towns[townIndex.value]);
const currentVillage = computed(() => currentTown.value.villages[villageIndex.value] || currentTown.value.villages[0]);
const regionName = computed(() => level.value === "county" ? "示范县" : level.value === "town" ? currentTown.value.name : `${currentTown.value.name} · ${currentVillage.value}`);
const summary = computed(() => {
  const ratio = level.value === "county" ? 1 : level.value === "town" ? 0.32 : 0.095;
  return [
    { icon: "🗺️", value: Math.round(98100 * ratio).toLocaleString(), unit: "亩", label: "确权耕地", note: "按地块去重" },
    { icon: "🌱", value: Math.round(84600 * ratio).toLocaleString(), unit: "亩", label: "可组织种植", note: "扣除休耕与受限地" },
    { icon: "🏠", value: Math.round(6800 * ratio).toLocaleString(), unit: "亩", label: "设施农业", note: "棚室/灌排可用" },
    { icon: "🐄", value: Math.round(110500 * ratio).toLocaleString(), unit: "头羽", label: "当前存栏", note: "同一时点快照" },
  ];
});

const landLedger = [
  { item: "确权/承包耕地", value: "98,100亩", source: "承包地台账 + 地块边界", state: "已核验" as VerifyState },
  { item: "本季实际播种", value: "76,300亩", source: "农户申报 + 遥感/抽查", state: "待复核" as VerifyState },
  { item: "有效灌溉面积", value: "63,800亩", source: "水利设施台账 + 现场核验", state: "已核验" as VerifyState },
  { item: "温室及大棚", value: "6,800亩", source: "设施清单 + 定位影像", state: "待复核" as VerifyState },
  { item: "可新增订单面积", value: "12,400亩", source: "轮作计划 + 主体意向", state: "估算" as VerifyState },
];
const soil = [
  { label: "土壤 pH", value: "6.2–7.1", status: "适宜", note: "按采样单元展示范围，不能以单点代表全村" },
  { label: "有机质", value: "22.8 g/kg", status: "中上", note: "建议秸秆还田与有机肥替代" },
  { label: "质地", value: "壤土 63%", status: "适宜", note: "砂壤土22% · 黏土15%" },
  { label: "氮磷钾", value: "中 / 中高 / 中", status: "可优化", note: "立项后生成分作物施肥建议" },
  { label: "灌溉水", value: "抽检合格 96%", status: "关注", note: "4%点位复检，未通过前不得用于食用农产品项目" },
  { label: "污染风险", value: "优先保护 91%", status: "分区管控", note: "安全利用7% · 严格管控2%；以主管部门分类为准" },
];
const crops = [
  { icon: "🌾", name: "优质水稻", score: 94, area: "28,000亩", season: "4–10月", supply: "1.54万吨", reason: "水源、积温、壤土和连片度匹配", risk: "低洼田洪涝；需锁定烘干仓容" },
  { icon: "🥬", name: "设施蔬菜", score: 91, area: "6,200亩", season: "全年分茬", supply: "9.3万吨", reason: "棚室与冷链基础较好，可按周排产", risk: "农残与连续采收批次隔离" },
  { icon: "🍊", name: "柑橘", score: 88, area: "14,500亩", season: "10–12月", supply: "3.26万吨", reason: "坡向、酸碱度与既有果园基础适配", risk: "冻害、黄龙病与分选能力" },
  { icon: "🌽", name: "鲜食玉米", score: 85, area: "8,600亩", season: "6–9月", supply: "1.12万吨", reason: "订单弹性大，适合轮作和错峰上市", risk: "采收窗口短，须反推冷链日计划" },
  { icon: "🍵", name: "茶叶/药材", score: 78, area: "5,300亩", season: "3–10月", supply: "0.31万吨", reason: "青岭片区海拔与土壤条件较好", risk: "不宜全县铺开，须分品种专项评价" },
];
const facilities = [
  { icon: "🐖", type: "生猪", farms: "18场 + 326户", capacity: "设计6.8万头", stock: "存栏4.62万头", rate: "68%", key: "防疫条件、隔离舍、洗消、无害化、粪污消纳" },
  { icon: "🐂", type: "牛羊", farms: "12场 + 481户", capacity: "设计1.45万头只", stock: "存栏1.08万头只", rate: "74%", key: "草料库、运动场、兽医服务、布病等监测" },
  { icon: "🐔", type: "家禽", farms: "21场 + 690户", capacity: "设计56万羽", stock: "存栏42.8万羽", rate: "76%", key: "全进全出、禽舍环控、消毒、粪污与病死禽处置" },
  { icon: "🐟", type: "水产", farms: "养殖水面8,900亩", capacity: "预计1.17万吨/年", stock: "在养0.73万吨", rate: "62%", key: "水源、进排水分离、水质监测、尾水处理、起捕能力" },
  { icon: "🐇", type: "蜂兔及其他", farms: "74个经营主体", capacity: "分品种核定", stock: "批次档案覆盖71%", rate: "待补数", key: "品种合法边界、专属防疫、投入品及销售凭证" },
];
const dataFields = [
  { group: "土地地块", fields: "地块编码、四至、面积、权利/使用关系、地类、坡度、灌排、设施、现种作物、可排产窗口", owner: "村采集 · 乡复核 · 县审定" },
  { group: "土壤环境", fields: "采样点、pH、有机质、质地、养分、盐渍化、灌溉水、污染风险类别、检测日期与机构", owner: "专业采样检测 · 县级归档" },
  { group: "种植能力", fields: "主体、品种、历史面积产量、机械、烘干、仓储、冷链、农技、用工与灾害记录", owner: "主体申报 · 村核实" },
  { group: "养殖能力", fields: "场户编码、品种、设计规模、同日存栏、出栏、圈舍/池塘、防疫、环控、粪污/尾水、兽医与检疫服务", owner: "场户填报 · 乡镇盘点 · 县抽查" },
  { group: "订单需求", fields: "采购主体、资质、品种规格、数量、交付期、质量标准、价格机制、保证金、验收与付款节点", owner: "采购方提交 · 平台/县域核验" },
];
const governance = [
  { level: "村级采集员", duty: "逐户逐地逐场建档，核定位、凭证和现场状态；异常不得代填通过", cycle: "变更即报 + 月度盘点", output: "一地/一场一档" },
  { level: "乡镇复核岗", duty: "查重、查漏、跨村边界校验，抽查面积、设施、存栏与生产意向", cycle: "月度复核 + 农时专项", output: "乡镇供给能力表" },
  { level: "县级审定岗", duty: "多部门数据比对、抽样检测、发布可用口径和置信等级，审批对外使用", cycle: "季度审定 + 重大变化更新", output: "县域农业资源底图" },
  { level: "专业机构", duty: "依法依规承担测绘、土壤/水质检测、农技适宜性和兽医防疫服务", cycle: "按采样/项目周期", output: "报告与电子证据" },
  { level: "平台", duty: "做规则校验、版本留痕、订单匹配和预警；不替代政府统计、检测检疫或行政审批", cycle: "实时", output: "可解释的匹配建议" },
];
const matchRules = [
  { no: "01", title: "先验买方", detail: "核验采购主体、真实需求、付款能力和经办权限，虚假订单不进入排产池", gate: "主体准入" },
  { no: "02", title: "再定交付", detail: "明确交付周、数量、等级、检测、包装、冷链、价格与付款条件", gate: "需求标准化" },
  { no: "03", title: "资源硬筛", detail: "用途、环境、防疫、许可、供水、设施等任一硬约束不满足即淘汰", gate: "红线阻断" },
  { no: "04", title: "能力测算", detail: "按可组织面积/真实存栏、单产成活率、损耗和可用设施测算保守可供量", gate: "不超能力接单" },
  { no: "05", title: "适配评分", detail: "自然条件25% + 设施20% + 主体履约20% + 质量15% + 物流10% + 收益风险10%", gate: "≥80优先" },
  { no: "06", title: "收益校验", detail: "保底收入应覆盖合规直接成本和约定服务成本；价格上下行风险对等分担", gate: "农户不亏底线" },
  { no: "07", title: "合同锁定", detail: "CA签署订单、生产SOP、投入品、验收、交付、结算、保险和违约附件", gate: "无合同不投产" },
  { no: "08", title: "项目执行", detail: "生成地块/场户项目批次，按节点验收；合格货款银行直分，争议款单独冻结", gate: "四流一致" },
];
const result = {
  order: "团餐鲜食玉米 · 1,200吨 · 7—9月分12周交付",
  regions: "丰泽镇 5村 + 青岭镇 3村",
  plan: "锁定6,420亩 · 276户 · 预计保守供给1,284吨",
  backup: "另设8%机动面积，不计入基础承诺量",
  price: "保底价 + 周指数浮动；上涨共享、下跌触底",
  margin: "预计亩均净收益1,180元，较散种提高约16%",
  warning: "临江镇冷链时效不足，本轮不匹配；先补齐预冷与运力",
};
const implementation = [
  { phase: "第0—15天", title: "定口径、定组织", acts: "县级专班牵头；统一指标字典、行政区划码、地块/场户编码、数据授权、保密分级和验收办法", result: "一套制度 + 一张责任表 + 一套电子表单" },
  { phase: "第16—45天", title: "村级全量摸底", acts: "逐村入户、逐地块定位、逐场盘点；复用合法已有数据，缺项才补采，严禁重复向农户索取", result: "村级初始台账，完整率≥95%" },
  { phase: "第46—60天", title: "乡镇复核纠偏", acts: "地块查重、面积平差、设施可用性和同日存栏抽核；退回异常记录并限期整改", result: "乡镇复核率100%，抽核率不低于20%" },
  { phase: "第61—75天", title: "县级审定成图", acts: "部门比对、专业采样、环境风险分区、适种适养评价；每个数字标注来源、日期、责任人和置信等级", result: "县域资源底图 v1.0" },
  { phase: "第76—90天", title: "首批订单试跑", acts: "选2—3个有真实买方、有组织主体、有标准的品类；从需求反推排产，签约后才开工", result: "至少1条订单完成端到端贯通" },
  { phase: "常态运营", title: "动态更新与年度复评", acts: "生产变更随时报、存栏月报、种植季报、设施半年查、土壤按主管部门方案监测；每笔订单复盘收益与违约", result: "底图不是一次普查，而是可持续运营台账" },
];
const kpis = [
  { value: "≥98%", label: "关键字段完整率" }, { value: "100%", label: "一地一场编码率" },
  { value: "≤3%", label: "抽查面积偏差率" }, { value: "≥95%", label: "同日存栏盘点一致率" },
  { value: "≥90%", label: "订单按期履约率" }, { value: "100%", label: "货款与争议款分离" },
];
const runText = computed(() => runStep.value === 0 ? "生成订单农业匹配方案" :
  runStep.value >= matchRules.length ? "匹配完成 · 查看实施方案" : `正在执行 ${runStep.value}/${matchRules.length}：${matchRules[runStep.value - 1]?.title}`);

function chooseTown(index: number) { townIndex.value = index; villageIndex.value = 0; level.value = "town"; }
function chooseVillage(index: number) { villageIndex.value = index; level.value = "village"; }
function runMatch() {
  if (productionBuild) return productionBlocked();
  if (running.value) return;
  if (runStep.value >= matchRules.length) { tab.value = "execute"; return; }
  tab.value = "match"; running.value = true; runStep.value = 0;
  timer = setInterval(() => {
    runStep.value += 1;
    if (runStep.value >= matchRules.length) {
      if (timer) clearInterval(timer);
      timer = null; running.value = false;
      uni.showToast({ title: "匹配方案已生成", icon: "success" });
    }
  }, 380);
}
function resetData() { runStep.value = 0; tab.value = "map"; }
function toProject(type: "plant" | "livestock") { uni.navigateTo({ url: `/pages/digitalfarm/project?type=${type}` }); }
function toContract() { uni.navigateTo({ url: "/pages/agri/contract" }); }
onUnmounted(() => { if (timer) clearInterval(timer); });
</script>

<template>
  <view class="sg-page resource-page">
    <view class="hero">
      <text class="hero-k">数智供社 v8533 · 县域农业资源底图</text>
      <text class="hero-t">先摸清家底，再精准下单</text>
      <text class="hero-d">县—乡镇—村三级统计土地、土壤、设施与存栏，把“能种什么、能养多少、何时能交”算清楚，再把真实订单落到地块和场户。</text>
      <view class="notice">预览样本数据 · 非政府统计结论 · 正式使用须经县级审定</view>
    </view>
    <view class="tabs">
      <view class="tab" :class="{ on: tab === 'map' }" @tap="tab = 'map'">资源底图</view>
      <view class="tab" :class="{ on: tab === 'match' }" @tap="tab = 'match'">适种适养</view>
      <view class="tab" :class="{ on: tab === 'execute' }" @tap="tab = 'execute'">订单实施</view>
    </view>

    <template v-if="tab === 'map'">
      <view class="section">
        <view class="section-head"><view><text class="eyebrow">三级穿透</text><text class="title">{{ regionName }}资源总览</text></view><text class="badge ok">2026-07样本</text></view>
        <view class="level-switch">
          <text :class="{ on: level === 'county' }" @tap="level = 'county'">示范县</text>
          <text :class="{ on: level === 'town' }" @tap="level = 'town'">{{ currentTown.name }}</text>
          <text :class="{ on: level === 'village' }" @tap="level = 'village'">{{ currentVillage }}</text>
        </view>
        <scroll-view scroll-x class="towns">
          <view v-for="(item, index) in towns" :key="item.name" class="town" :class="{ on: townIndex === index }" @tap="chooseTown(index)">
            <text class="town-name">{{ item.name }}</text><text class="town-meta">耕地 {{ (item.land / 10000).toFixed(2) }}万亩</text><text class="town-score">数据完整度 {{ item.score }}%</text>
          </view>
        </scroll-view>
        <view class="villages"><text v-for="(item, index) in currentTown.villages" :key="item" :class="{ on: villageIndex === index && level === 'village' }" @tap="chooseVillage(index)">{{ item }}</text></view>
        <view class="summary-grid">
          <view v-for="item in summary" :key="item.label" class="summary"><text class="summary-icon">{{ item.icon }}</text><view><text class="summary-value">{{ item.value }}<text>{{ item.unit }}</text></text><text class="summary-label">{{ item.label }}</text><text class="summary-note">{{ item.note }}</text></view></view>
        </view>
      </view>

      <view class="section">
        <view class="section-head"><view><text class="eyebrow">一地一码</text><text class="title">土地面积与设施台账</text></view><text class="badge">口径可追溯</text></view>
        <view v-for="item in landLedger" :key="item.item" class="ledger-row">
          <view class="ledger-main"><text class="ledger-title">{{ item.item }}</text><text class="ledger-source">{{ item.source }}</text></view>
          <view class="ledger-right"><text class="ledger-value">{{ item.value }}</text><text class="state" :class="{ green: item.state === '已核验', amber: item.state === '待复核' }">{{ item.state }}</text></view>
        </view>
        <view class="formula">统计口径：以地块唯一编码去重；确权面积、实际播种面积、复种面积分别统计，严禁相加冒充耕地总面积。</view>
      </view>

      <view class="section">
        <view class="section-head"><view><text class="eyebrow">采样到点</text><text class="title">土壤与产地环境</text></view><text class="badge warn">分区评价</text></view>
        <view class="soil-grid">
          <view v-for="item in soil" :key="item.label" class="soil-card"><view class="soil-top"><text class="soil-label">{{ item.label }}</text><text class="soil-status">{{ item.status }}</text></view><text class="soil-value">{{ item.value }}</text><text class="soil-note">{{ item.note }}</text></view>
        </view>
        <view class="gate"><text class="gate-icon">⛔</text><view><text class="gate-title">环境风险是硬闸，不是加分项</text><text class="gate-text">用途不符、严格管控地块、灌溉水不合格或周边污染风险未查清时，不生成食用农产品种植建议；平台不替代法定调查、检测和分类管理。</text></view></view>
      </view>

      <view class="section">
        <view class="section-head"><view><text class="eyebrow">一场一档</text><text class="title">养殖设施与大致存栏</text></view><text class="badge">同日快照</text></view>
        <view v-for="item in facilities" :key="item.type" class="facility">
          <text class="facility-icon">{{ item.icon }}</text>
          <view class="facility-main"><view class="facility-top"><text class="facility-title">{{ item.type }}</text><text class="facility-rate">利用率 {{ item.rate }}</text></view><text class="facility-meta">{{ item.farms }} · {{ item.capacity }} · {{ item.stock }}</text><text class="facility-key">核查：{{ item.key }}</text></view>
        </view>
        <view class="formula">存栏口径：统一盘点时点；设计规模≠实际存栏≠年出栏。散养户、规模场、水产批次分别统计后再汇总，并保留估算方法和置信等级。</view>
      </view>

      <view class="section">
        <view class="section-head"><view><text class="eyebrow">数据字典</text><text class="title">必须采集的五组基础数据</text></view></view>
        <view v-for="item in dataFields" :key="item.group" class="data-group"><view class="data-no">{{ item.group }}</view><text class="data-fields">{{ item.fields }}</text><text class="data-owner">{{ item.owner }}</text></view>
      </view>

      <view class="section">
        <view class="section-head"><view><text class="eyebrow">三级联审</text><text class="title">谁填、谁核、谁审、谁负责</text></view></view>
        <view v-for="item in governance" :key="item.level" class="gov-row"><view class="gov-level">{{ item.level }}</view><view class="gov-main"><text>{{ item.duty }}</text><text class="gov-cycle">{{ item.cycle }} · 产出：{{ item.output }}</text></view></view>
      </view>
      <view class="primary-action" @tap="tab = 'match'">下一步：查看适种适养与可供能力 ›</view>
    </template>

    <template v-else-if="tab === 'match'">
      <view class="section">
        <view class="section-head"><view><text class="eyebrow">可解释推荐</text><text class="title">本县适合种什么</text></view><text class="badge ok">硬约束先行</text></view>
        <view v-for="item in crops" :key="item.name" class="crop">
          <view class="crop-score"><text class="crop-icon">{{ item.icon }}</text><text>{{ item.score }}</text><text class="score-unit">分</text></view>
          <view class="crop-main"><view class="crop-top"><text class="crop-name">{{ item.name }}</text><text class="crop-area">{{ item.area }}</text></view><text class="crop-supply">{{ item.season }} · 保守可供 {{ item.supply }}</text><text class="crop-reason">适宜依据：{{ item.reason }}</text><text class="crop-risk">风险约束：{{ item.risk }}</text></view>
        </view>
        <view class="formula">评分只用于排序：用途、生态环境、动植物防疫、禁限养/许可等硬约束不通过时，分数再高也不得立项。建议须由农技、检测及属地管理人员复核。</view>
      </view>

      <view class="section">
        <view class="section-head"><view><text class="eyebrow">六维模型</text><text class="title">从资源到订单的匹配规则</text></view></view>
        <view class="weight-grid"><view><text>25%</text><text>自然条件</text></view><view><text>20%</text><text>基础设施</text></view><view><text>20%</text><text>履约能力</text></view><view><text>15%</text><text>质量安全</text></view><view><text>10%</text><text>物流时效</text></view><view><text>10%</text><text>收益风险</text></view></view>
      </view>

      <view class="section">
        <view class="section-head"><view><text class="eyebrow">八步闭环</text><text class="title">订单农业匹配核验</text></view><text class="badge">{{ runStep }}/8</text></view>
        <view v-for="(item, index) in matchRules" :key="item.no" class="rule" :class="{ done: runStep > index, current: runStep === index && running }">
          <view class="rule-no">{{ runStep > index ? "✓" : item.no }}</view><view class="rule-main"><text class="rule-title">{{ item.title }}</text><text class="rule-detail">{{ item.detail }}</text></view><text class="rule-gate">{{ item.gate }}</text>
        </view>
        <view v-if="runStep >= matchRules.length" class="result">
          <text class="result-k">已生成可执行方案</text><text class="result-title">{{ result.order }}</text>
          <view class="result-row"><text>落地区域</text><text>{{ result.regions }}</text></view><view class="result-row"><text>生产计划</text><text>{{ result.plan }}</text></view><view class="result-row"><text>风险冗余</text><text>{{ result.backup }}</text></view><view class="result-row"><text>计价机制</text><text>{{ result.price }}</text></view><view class="result-row"><text>农户收益</text><text>{{ result.margin }}</text></view>
          <view class="result-warning">⚠️ {{ result.warning }}</view>
        </view>
      </view>
      <view class="run-action" :class="{ running }" @tap="runMatch">{{ runText }}</view>
      <view v-if="runStep >= matchRules.length" class="secondary-action" @tap="resetData">重新匹配</view>
    </template>

    <template v-else>
      <view class="section">
        <view class="section-head"><view><text class="eyebrow">90天落地</text><text class="title">完整实施路线图</text></view><text class="badge ok">先试点再扩面</text></view>
        <view v-for="(item, index) in implementation" :key="item.phase" class="phase"><view class="phase-line"><view class="phase-dot">{{ index + 1 }}</view></view><view class="phase-main"><text class="phase-time">{{ item.phase }}</text><text class="phase-title">{{ item.title }}</text><text class="phase-acts">{{ item.acts }}</text><text class="phase-result">验收成果：{{ item.result }}</text></view></view>
      </view>

      <view class="section">
        <view class="section-head"><view><text class="eyebrow">利益共同体</text><text class="title">风险与收益协同措施</text></view></view>
        <view class="measure"><text class="measure-title">农户/合作社</text><text>有保底、有上浮、有服务可选权；只对真实产量和合同质量负责，不承担采购方经营风险。</text></view>
        <view class="measure"><text class="measure-title">采购方</text><text>锁量锁标准并提供履约保障；享受稳定供应，但不得以模糊标准压价或强购指定农资。</text></view>
        <view class="measure"><text class="measure-title">村集体/服务组织</text><text>按真实组织、核验和服务绩效取费，台账造假、强制摊派或利益冲突须回避并追责。</text></view>
        <view class="measure"><text class="measure-title">平台与金融</text><text>平台收技术服务费并公开计费标的；银行按合同直分，平台不沉淀货款，争议只冻结争议金额。</text></view>
        <view class="measure"><text class="measure-title">保险与风险池</text><text>灾害、价格和履约风险分类承保/共担；保险赔付、风险准备金和违约责任不得相互替代。</text></view>
      </view>

      <view class="section">
        <view class="section-head"><view><text class="eyebrow">成果验收</text><text class="title">六项硬指标</text></view></view>
        <view class="kpi-grid"><view v-for="item in kpis" :key="item.label" class="kpi"><text>{{ item.value }}</text><text>{{ item.label }}</text></view></view>
        <view class="privacy"><text class="privacy-title">数据安全边界</text><text>个人身份、精确地块位置、经营成本、场区生物安全等按最小必要授权使用；对采购方只展示经授权的汇总可供能力。每次查询、导出、修改均留痕，撤回授权后停止新增使用，但依法应保存的合同与追溯记录除外。</text></view>
      </view>

      <view class="section">
        <view class="section-head"><view><text class="eyebrow">项目衔接</text><text class="title">底图不是终点，直接进入生产履约</text></view></view>
        <view class="link-card plant" @tap="toProject('plant')"><text class="link-icon">🌾</text><view><text class="link-title">按匹配结果发起数字种植项目</text><text class="link-text">绑定地块、订单、SOP、投入品、9道管控与验收</text></view><text>›</text></view>
        <view class="link-card animal" @tap="toProject('livestock')"><text class="link-icon">🐄</text><view><text class="link-title">按真实产能发起数字养殖项目</text><text class="link-text">绑定场户、品类、防疫、环保、10道管控与验收</text></view><text>›</text></view>
        <view class="link-card contract" @tap="toContract"><text class="link-icon">📑</text><view><text class="link-title">生成订单农业 CA 合同包</text><text class="link-text">把质量、交付、计价、验收、结算和风险写入合同</text></view><text>›</text></view>
      </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.resource-page { padding-bottom: 48rpx; background: #f5f7f4; }
.hero { padding: 38rpx 28rpx 30rpx; color: #fff; background: linear-gradient(145deg, #0d5133 0%, #16884c 58%, #b9872f 150%); }
.hero-k { display: block; font-size: 21rpx; letter-spacing: 1rpx; opacity: .86; }
.hero-t { display: block; margin-top: 10rpx; font-size: 40rpx; line-height: 1.2; font-weight: 900; }
.hero-d { display: block; margin-top: 14rpx; font-size: 23rpx; line-height: 1.65; opacity: .94; }
.notice { display: inline-flex; margin-top: 18rpx; padding: 8rpx 14rpx; border: 1rpx solid rgba(255,255,255,.35); border-radius: 999rpx; background: rgba(0,0,0,.13); font-size: 19rpx; }
.tabs { position: sticky; top: 0; z-index: 8; display: flex; padding: 14rpx 24rpx; background: rgba(245,247,244,.96); backdrop-filter: blur(12px); }
.tab { flex: 1; padding: 16rpx 8rpx; border-bottom: 5rpx solid transparent; color: #718079; font-size: 24rpx; font-weight: 700; text-align: center; }
.tab.on { border-color: #16884c; color: #0e6b3a; }
.section { margin: 16rpx 20rpx 0; padding: 24rpx; border: 1rpx solid #e6ebe7; border-radius: 24rpx; background: #fff; box-shadow: 0 8rpx 28rpx rgba(22,61,41,.055); }
.section-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14rpx; margin-bottom: 18rpx; }
.section-head > view:first-child { display: flex; flex-direction: column; }
.eyebrow { color: #b07a22; font-size: 19rpx; font-weight: 800; letter-spacing: 2rpx; }
.title { margin-top: 4rpx; color: #18382a; font-size: 29rpx; font-weight: 900; }
.badge { flex: none; padding: 7rpx 12rpx; border-radius: 999rpx; background: #eef2ef; color: #607268; font-size: 18rpx; }
.badge.ok { background: #e7f6ed; color: #16884c; }
.badge.warn { background: #fff4dc; color: #9b6514; }
.level-switch { display: flex; padding: 7rpx; border-radius: 14rpx; background: #f0f4f1; }
.level-switch text { flex: 1; padding: 12rpx 4rpx; border-radius: 10rpx; color: #637269; font-size: 21rpx; text-align: center; }
.level-switch text.on { background: #fff; color: #126a3b; font-weight: 800; box-shadow: 0 3rpx 10rpx rgba(16,74,44,.1); }
.towns { margin-top: 16rpx; white-space: nowrap; }
.town { display: inline-flex; width: 210rpx; flex-direction: column; margin-right: 12rpx; padding: 16rpx; border: 2rpx solid #e5ebe7; border-radius: 16rpx; background: #fbfcfb; }
.town.on { border-color: #36a168; background: #ecf8f1; }
.town-name { color: #213b2e; font-size: 24rpx; font-weight: 800; }
.town-meta, .town-score { margin-top: 4rpx; color: #75827b; font-size: 18rpx; }
.town-score { color: #19804a; }
.villages { display: flex; gap: 10rpx; margin-top: 14rpx; }
.villages text { flex: 1; padding: 11rpx 4rpx; border: 1rpx solid #e4e9e5; border-radius: 12rpx; color: #617068; font-size: 20rpx; text-align: center; }
.villages text.on { border-color: #16884c; background: #16884c; color: #fff; }
.summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; margin-top: 16rpx; }
.summary { display: flex; align-items: center; gap: 12rpx; padding: 16rpx; border-radius: 16rpx; background: #f7faf8; }
.summary-icon { font-size: 34rpx; }
.summary > view { display: flex; min-width: 0; flex-direction: column; }
.summary-value { color: #0e6b3a; font-size: 27rpx; font-weight: 900; }
.summary-value text { margin-left: 3rpx; font-size: 16rpx; font-weight: 500; }
.summary-label { color: #243c30; font-size: 20rpx; font-weight: 700; }
.summary-note { color: #8a958f; font-size: 17rpx; }
.ledger-row { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; padding: 15rpx 0; border-top: 1rpx solid #edf0ee; }
.ledger-row:first-of-type { border-top: 0; }
.ledger-main, .ledger-right { display: flex; flex-direction: column; }
.ledger-main { min-width: 0; flex: 1; }
.ledger-right { flex: none; align-items: flex-end; }
.ledger-title { color: #263d31; font-size: 23rpx; font-weight: 800; }
.ledger-source { margin-top: 4rpx; color: #7e8b84; font-size: 18rpx; }
.ledger-value { color: #183a29; font-size: 22rpx; font-weight: 900; }
.state { margin-top: 5rpx; color: #8c7b63; font-size: 17rpx; }
.state.green { color: #16884c; }
.state.amber { color: #bd7f19; }
.formula { margin-top: 16rpx; padding: 16rpx; border-left: 6rpx solid #b9872f; border-radius: 4rpx 12rpx 12rpx 4rpx; background: #fff9ee; color: #735b34; font-size: 19rpx; line-height: 1.6; }
.soil-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12rpx; }
.soil-card { display: flex; min-height: 154rpx; flex-direction: column; padding: 16rpx; border: 1rpx solid #e8ede9; border-radius: 16rpx; }
.soil-top { display: flex; justify-content: space-between; gap: 6rpx; }
.soil-label { color: #42564b; font-size: 19rpx; }
.soil-status { color: #17814a; font-size: 17rpx; font-weight: 700; }
.soil-value { margin-top: 8rpx; color: #173e2a; font-size: 25rpx; font-weight: 900; }
.soil-note { margin-top: 6rpx; color: #7c8982; font-size: 17rpx; line-height: 1.45; }
.gate { display: flex; gap: 13rpx; margin-top: 16rpx; padding: 18rpx; border-radius: 16rpx; background: #fff1ee; }
.gate-icon { font-size: 31rpx; }
.gate > view { display: flex; flex-direction: column; }
.gate-title { color: #9f3528; font-size: 22rpx; font-weight: 900; }
.gate-text { margin-top: 6rpx; color: #86584f; font-size: 19rpx; line-height: 1.55; }
.facility { display: flex; gap: 14rpx; padding: 17rpx 0; border-top: 1rpx solid #edf0ee; }
.facility:first-of-type { border-top: 0; }
.facility-icon { display: flex; width: 58rpx; height: 58rpx; flex: none; align-items: center; justify-content: center; border-radius: 15rpx; background: #f0f6f2; font-size: 31rpx; }
.facility-main { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.facility-top { display: flex; align-items: center; justify-content: space-between; }
.facility-title { color: #263c31; font-size: 23rpx; font-weight: 900; }
.facility-rate { color: #15804a; font-size: 18rpx; }
.facility-meta { margin-top: 5rpx; color: #56685e; font-size: 19rpx; }
.facility-key { margin-top: 5rpx; color: #89938e; font-size: 18rpx; line-height: 1.45; }
.data-group { padding: 16rpx 0; border-top: 1rpx solid #edf0ee; }
.data-group:first-of-type { border-top: 0; }
.data-no { display: inline-flex; padding: 6rpx 10rpx; border-radius: 8rpx; background: #eaf6ef; color: #147442; font-size: 18rpx; font-weight: 800; }
.data-fields, .data-owner { display: block; margin-top: 8rpx; color: #344a3e; font-size: 20rpx; line-height: 1.55; }
.data-owner { margin-top: 4rpx; color: #a06d20; font-size: 18rpx; }
.gov-row { display: flex; gap: 14rpx; padding: 16rpx 0; border-top: 1rpx solid #edf0ee; }
.gov-row:first-of-type { border-top: 0; }
.gov-level { width: 138rpx; flex: none; color: #176e42; font-size: 20rpx; font-weight: 900; }
.gov-main { display: flex; min-width: 0; flex: 1; flex-direction: column; color: #42554b; font-size: 19rpx; line-height: 1.5; }
.gov-cycle { margin-top: 5rpx; color: #8b7560; font-size: 17rpx; }
.primary-action, .run-action, .secondary-action { margin: 20rpx; padding: 23rpx; border-radius: 18rpx; color: #fff; background: #16884c; font-size: 25rpx; font-weight: 900; text-align: center; box-shadow: 0 12rpx 24rpx rgba(22,136,76,.2); }
.crop { display: flex; gap: 14rpx; padding: 18rpx 0; border-top: 1rpx solid #edf0ee; }
.crop:first-of-type { border-top: 0; }
.crop-score { display: flex; width: 74rpx; flex: none; flex-direction: column; align-items: center; color: #11804a; font-size: 25rpx; font-weight: 900; }
.crop-icon { font-size: 38rpx; }
.score-unit { color: #87928c; font-size: 16rpx; font-weight: 500; }
.crop-main { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.crop-top { display: flex; justify-content: space-between; gap: 8rpx; }
.crop-name { color: #203c2d; font-size: 24rpx; font-weight: 900; }
.crop-area { color: #a16b1b; font-size: 19rpx; font-weight: 800; }
.crop-supply { margin-top: 4rpx; color: #16884c; font-size: 19rpx; }
.crop-reason, .crop-risk { margin-top: 5rpx; color: #68776f; font-size: 18rpx; line-height: 1.45; }
.crop-risk { color: #9a553d; }
.weight-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10rpx; }
.weight-grid view { display: flex; flex-direction: column; align-items: center; padding: 16rpx 4rpx; border-radius: 14rpx; background: #f2f7f4; }
.weight-grid text:first-child { color: #117743; font-size: 27rpx; font-weight: 900; }
.weight-grid text:last-child { margin-top: 3rpx; color: #69786f; font-size: 17rpx; }
.rule { display: flex; align-items: center; gap: 12rpx; padding: 15rpx 0; border-top: 1rpx solid #edf0ee; opacity: .62; }
.rule:first-of-type { border-top: 0; }
.rule.done, .rule.current { opacity: 1; }
.rule-no { display: flex; width: 46rpx; height: 46rpx; flex: none; align-items: center; justify-content: center; border-radius: 50%; background: #eef2ef; color: #829087; font-size: 18rpx; font-weight: 900; }
.rule.done .rule-no { background: #16884c; color: #fff; }
.rule.current .rule-no { background: #d99a2b; color: #fff; }
.rule-main { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.rule-title { color: #293e33; font-size: 22rpx; font-weight: 900; }
.rule-detail { margin-top: 4rpx; color: #748078; font-size: 17rpx; line-height: 1.45; }
.rule-gate { width: 84rpx; flex: none; color: #9b6a21; font-size: 17rpx; text-align: right; }
.run-action.running { background: #b9872f; }
.secondary-action { margin-top: -10rpx; border: 2rpx solid #cdd9d1; color: #557064; background: #fff; box-shadow: none; }
.result { display: flex; flex-direction: column; margin-top: 18rpx; padding: 20rpx; border: 2rpx solid #9ed4b5; border-radius: 18rpx; background: linear-gradient(145deg, #ecf8f1, #fff); }
.result-k { color: #16884c; font-size: 18rpx; font-weight: 800; letter-spacing: 2rpx; }
.result-title { margin: 6rpx 0 12rpx; color: #183c29; font-size: 25rpx; font-weight: 900; }
.result-row { display: flex; gap: 12rpx; padding: 9rpx 0; border-top: 1rpx solid #dcebe2; }
.result-row text:first-child { width: 100rpx; flex: none; color: #66756c; font-size: 18rpx; }
.result-row text:last-child { color: #2d4839; font-size: 19rpx; font-weight: 700; }
.result-warning { margin-top: 12rpx; padding: 12rpx; border-radius: 10rpx; background: #fff1e8; color: #a6512f; font-size: 18rpx; line-height: 1.5; }
.phase { display: flex; gap: 14rpx; }
.phase-line { position: relative; width: 44rpx; flex: none; }
.phase-line::after { position: absolute; top: 44rpx; bottom: 0; left: 20rpx; width: 3rpx; background: #dbe7df; content: ""; }
.phase:last-child .phase-line::after { display: none; }
.phase-dot { position: relative; z-index: 1; display: flex; width: 42rpx; height: 42rpx; align-items: center; justify-content: center; border-radius: 50%; color: #fff; background: #16884c; font-size: 19rpx; font-weight: 900; }
.phase-main { display: flex; flex: 1; flex-direction: column; padding-bottom: 24rpx; }
.phase-time { color: #b07a22; font-size: 18rpx; font-weight: 800; }
.phase-title { margin-top: 3rpx; color: #203c2d; font-size: 24rpx; font-weight: 900; }
.phase-acts { margin-top: 7rpx; color: #65756c; font-size: 19rpx; line-height: 1.55; }
.phase-result { margin-top: 7rpx; color: #147442; font-size: 18rpx; font-weight: 700; }
.measure { display: flex; flex-direction: column; padding: 15rpx 0; border-top: 1rpx solid #edf0ee; color: #607067; font-size: 19rpx; line-height: 1.55; }
.measure:first-of-type { border-top: 0; }
.measure-title { margin-bottom: 3rpx; color: #233d2f; font-size: 22rpx; font-weight: 900; }
.kpi-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10rpx; }
.kpi { display: flex; flex-direction: column; align-items: center; padding: 16rpx 5rpx; border-radius: 14rpx; background: #f2f7f4; text-align: center; }
.kpi text:first-child { color: #16884c; font-size: 26rpx; font-weight: 900; }
.kpi text:last-child { margin-top: 5rpx; color: #6f7c74; font-size: 16rpx; }
.privacy { display: flex; flex-direction: column; margin-top: 16rpx; padding: 17rpx; border-radius: 15rpx; background: #f4f1fb; color: #6e647e; font-size: 18rpx; line-height: 1.55; }
.privacy-title { margin-bottom: 5rpx; color: #56466e; font-size: 21rpx; font-weight: 900; }
.link-card { display: flex; align-items: center; gap: 13rpx; margin-top: 12rpx; padding: 18rpx; border-radius: 16rpx; background: #eef8f2; color: #16884c; }
.link-card:first-of-type { margin-top: 0; }
.link-card.animal { background: #fff2ed; color: #ad5137; }
.link-card.contract { background: #fff8e9; color: #a16d1d; }
.link-icon { font-size: 36rpx; }
.link-card > view { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.link-title { color: #293c32; font-size: 22rpx; font-weight: 900; }
.link-text { margin-top: 4rpx; color: #748078; font-size: 18rpx; line-height: 1.4; }
</style>
