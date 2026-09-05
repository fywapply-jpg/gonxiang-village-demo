<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { advanceOperation, getOperationCatalog, resetOperation, type OperationModule as BackendOperationModule } from "@/services/localApi";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const productionBlocked = () => uni.showModal({ title: "需后台授权岗位", content: "正式环境业务工作流只能由后台授权岗位推进，前台不能在后台断联时本地生成完成结果。", showCancel: false });

interface OperationModule {
  key: string;
  icon: string;
  name: string;
  owner: string;
  object: string;
  steps: Array<{ name: string; action: string; result: string }>;
}

const modules: OperationModule[] = [
  {
    key: "agri-qualification", icon: "🛡️", name: "生产资质准入", owner: "县级运营中心 / 农业农村主管部门协同", object: "农资商家、农机手、无人机操作员准入批次",
    steps: [
      { name: "主体实名与分类", action: "识别企业/个人身份，按种子、农药、肥料、农机具、无人机及其他投入品分类适用规则", result: "形成差异化材料清单" },
      { name: "证照OCR与监管联查", action: "提取证照编号、发证机关、有效期、许可区域和范围，与权威数据交叉核验", result: "证照真伪与状态确认" },
      { name: "许可范围逐项比对", action: "把商家SKU、限制使用农药、农机准驾类型、无人机生产企业/机型逐项匹配", result: "超范围商品或设备自动冻结" },
      { name: "设备与人员绑定", action: "核验农机牌证检验、无人机实名登记、操作证、培训考核、保险和安全责任书", result: "一人一档、一机一档建立" },
      { name: "风险分级与人工复核", action: "低风险自动通过，数据冲突或现场条件转县级复核，缺证、过期、吊销直接拒绝", result: "准入结论与复核工单生成" },
      { name: "备案与持续监管", action: "生成电子备案卡，启用90/30/7天到期预警和处罚、吊销、异常经营动态复审", result: "交易上架与作业派单闸门生效" },
    ],
  },
  {
    key: "machine-merchant", icon: "🚜", name: "农机具商家管理", owner: "农机经销商 / 租赁服务商", object: "农机具全生命周期经营批次 · 16台",
    steps: [
      { name: "准入与授权确认", action: "核验经营主体、品牌授权、维修能力、仓储场地和售后承诺", result: "商家经营边界生效" },
      { name: "验真入库建档", action: "逐台扫描铭牌、序列号、发动机/飞控号，关联合同、发票、合格证和鉴定认证材料", result: "一机一码资产档案生成" },
      { name: "权属库存管控", action: "区分自有、代销、融资租赁和抵押资产，管理仓位、调拨、借机、试机及可售可租状态", result: "账卡物权证保持一致" },
      { name: "销售租赁履约", action: "完成锁库、合同、支付预授权、交机点检、操作培训、验收、开票及权属转移", result: "订单和设备状态同步闭环" },
      { name: "人机任务三重匹配", action: "出租或派单前逐项校验人员证照、准驾/培训机型、机具牌证维保保险、排班档期、地块与任务风险", result: "生成不可拆分的人—机—任务调度快照" },
      { name: "维保召回退出", action: "按工时生成保养工单，记录配件批次；质量预警触发锁定、通知、召回、复检、报废或二手转让", result: "售后责任与资产退出留痕" },
    ],
  },
  {
    key: "plant", icon: "🌾", name: "数字种植", owner: "种植户 / 合作社", object: "东丽区水稻订单项目 · 320亩",
    steps: [
      { name: "资源匹配与立项", action: "读取土地确权、土壤、水源、气象和适种分析，选择订单作物", result: "形成项目备案与地块边界" },
      { name: "合同与生产计划", action: "签订订单农业合同，锁定品种、农艺、产量、质量、保险和收购价", result: "生成CA合同与农事日历" },
      { name: "农资与作业管控", action: "按处方领用种肥药，派发耕种管收工单并记录人员、设备和用量", result: "形成投入品与作业台账" },
      { name: "生长监测与预警", action: "回传墒情、苗情、虫情、气象和遥感，异常自动生成处置工单", result: "生成巡田与整改证据" },
      { name: "采收检测与验收", action: "测产、农残检测、分级称重、合格证与批次码同步生成", result: "合格产量进入订单交付" },
      { name: "交付结算与复盘", action: "绑定仓单、物流、发票、收购结算并核算亩均收益", result: "项目关账并回写信用" },
    ],
  },
  {
    key: "livestock", icon: "🐂", name: "数字养殖", owner: "养殖场 / 合作社", object: "肉牛标准化养殖项目 · 860头",
    steps: [
      { name: "设施与存栏建档", action: "核验场址、圈舍、环评、防疫条件和存栏，建立一畜一码/批次档案", result: "养殖项目准入通过" },
      { name: "引种入场检疫", action: "核对来源、动物检疫合格证明、运输车辆和隔离观察记录", result: "入场批次与耳标绑定" },
      { name: "饲喂用药与防疫", action: "记录饲料批次、日增重、免疫、诊疗、处方和休药期", result: "生成健康与投入品台账" },
      { name: "环境与疫病预警", action: "监测温湿度、氨气、饮水、死亡率和异常行为，触发兽医工单", result: "风险闭环留痕" },
      { name: "出栏检疫与屠宰", action: "完成产地检疫、禁运校验、屠宰检疫、肉品品质检验和无害化处理", result: "两证两章与胴体码关联" },
      { name: "冷链交付与结算", action: "分割包装、冷链温控、采购验收、开票和机构结算", result: "全链溯源与收益核算完成" },
    ],
  },
  {
    key: "order-agri", icon: "📑", name: "订单农业", owner: "县域运营中心", object: "学校营养餐年度蔬菜订单 · 1,800吨",
    steps: [
      { name: "需求归集", action: "汇总采购周期、BOM、品类、数量、质量和交付地", result: "形成年度采购计划" },
      { name: "产能匹配", action: "匹配适种土地、设施、历史产量、种植窗口和合作社履约能力", result: "锁定订单与生产主体" },
      { name: "合同与保供计划", action: "签署价格机制、最低保护、验收、替补产能、保险和结算规则", result: "合同与风险预案生效" },
      { name: "生产与资金协同", action: "按里程碑发放农资、农机、保险和机构授信，持续监测生产", result: "资金用途与生产证据对应" },
      { name: "分批交付验收", action: "按周排产采收，检测、仓配、到货抽检和差异处理同步", result: "合格部分进入结算" },
      { name: "收益分配复盘", action: "机构分账、开票、对账并核算农户、村集体、服务方和平台收益", result: "年度订单闭环" },
    ],
  },
  {
    key: "logistics", icon: "🚚", name: "仓储冷链", owner: "仓库 / 承运商", object: "华北生鲜统仓统配任务 · 12车",
    steps: [
      { name: "预约与入库", action: "预约仓容、月台和温区，验货称重后建立批次库存", result: "WMS入库单生效" },
      { name: "波次拣选复核", action: "按订单波次执行先进先出、分拣、复核与装箱", result: "货品与子订单一一对应" },
      { name: "运力竞价与派车", action: "校验车辆、司机、保险、温区和时效后确定承运商", result: "运输合同与运单生成" },
      { name: "在途监控", action: "回传定位、温控、开箱、停留和预计到达，异常自动升级", result: "TMS轨迹证据连续" },
      { name: "签收与回单", action: "到货复磅、影像签收、周转筐交接和异常登记", result: "电子回单触发验收" },
      { name: "运费结算", action: "按有效里程、车型、温区、准时率和异常责任核算运费", result: "承运账单完成对账" },
    ],
  },
  {
    key: "finance", icon: "🏦", name: "供应链金融", owner: "银行 / 保险机构", object: "订单贷申请 · ¥800,000",
    steps: [
      { name: "主体与贸易背景核验", action: "核验企业、受益所有人、订单合同、上下游和历史履约", result: "反欺诈与准入通过" },
      { name: "四流一致性审查", action: "比对合同、订单、物流、发票及账户流水，识别空转和关联交易", result: "真实贸易评分生成" },
      { name: "银行竞标授信", action: "多家机构基于风险画像给出额度、期限、利率和担保条件", result: "企业自主选定方案" },
      { name: "受托支付与用款", action: "机构按合同用途直接支付至真实交易对手，不进入平台账户", result: "贷款与生产/采购用途对应" },
      { name: "贷后监控", action: "监测订单、库存、仓单、物流、回款和风险事件", result: "异常触发预警与人工复核" },
      { name: "回款还贷与评价", action: "销售回款按协议归还贷款，结清后释放担保并回写信用", result: "融资生命周期闭环" },
    ],
  },
  {
    key: "quality", icon: "🔬", name: "品质认证与溯源", owner: "检测机构 / 品牌方", object: "赣南脐橙批次 P20260801",
    steps: [
      { name: "标准模板选择", action: "按品种、用途和采购方选择国家、行业、地方及合同加严指标", result: "本批检验方案生效" },
      { name: "采样封样送检", action: "记录采样人、位置、时间、数量、封签和样品流转", result: "样品证据链建立" },
      { name: "检测与复核", action: "录入农兽残、微生物、重金属、等级和感官指标并双人复核", result: "报告签发或整改" },
      { name: "合格证与批次码", action: "合格后生成承诺达标合格证和唯一溯源码", result: "证货绑定" },
      { name: "流通节点上链", action: "生产、加工、仓储、物流和销售节点持续追加事件", result: "消费者可查全链" },
      { name: "召回与责任定位", action: "异常时按批次反查流向、暂停销售、通知下游并跟踪召回", result: "问题闭环与信用扣分" },
    ],
  },
  {
    key: "crossborder", icon: "🌐", name: "跨境贸易", owner: "出口商 / 海关服务", object: "苹果出口东盟订单 · 4柜",
    steps: [
      { name: "市场准入匹配", action: "核对目的国准入、果园和包装厂注册、检疫及标签要求", result: "出口可行性通过" },
      { name: "报价与国际合同", action: "确认币种、贸易术语、付款方式、装运期和质量索赔", result: "国际合同生效" },
      { name: "备货检疫报关", action: "锁批次、检验检疫、熏蒸/冷处理、单证制作和申报", result: "放行与装运文件生成" },
      { name: "国际物流与保险", action: "订舱、装柜、铅封、温控、货运险和节点跟踪", result: "提单与在途证据完整" },
      { name: "收汇与结汇", action: "银行核验合同、报关和物流单据后办理收款与结汇", result: "外汇业务留痕" },
      { name: "退税与售后", action: "匹配发票、报关单和收汇数据，处理索赔、退税和关账", result: "跨境订单闭环" },
    ],
  },
  {
    key: "emergency", icon: "🆘", name: "应急保供", owner: "政府保供专班", object: "极端天气蔬菜保供任务 · 72小时",
    steps: [
      { name: "事件分级与征召", action: "确认事件等级、保障人口、品类、数量、价格和区域", result: "保供任务正式发布" },
      { name: "货源与替补产能", action: "匹配在库、在田、加工和跨区域调拨资源", result: "主供与备供主体锁定" },
      { name: "价格与质量监管", action: "核验平价机制、检测批次、合格证和不得加价规则", result: "保供商品准入" },
      { name: "运力通行调度", action: "匹配仓库、冷链车辆、绿色通道和末端网点", result: "运力与路线确定" },
      { name: "签收与供应监测", action: "实时统计调出、在途、到货、销售和缺口", result: "动态补货指令生成" },
      { name: "补贴审核与审计", action: "按真实任务、运单、签收和价差审核补贴", result: "资金发放与全程审计" },
    ],
  },
  {
    key: "alliance", icon: "🤝", name: "利益共同体", owner: "合作社 / 村集体 / 平台", object: "县域产业共同体年度项目",
    steps: [
      { name: "成员与资产入组", action: "确认成员资格、土地/设施/渠道/服务贡献和权责边界", result: "成员名册与贡献档案" },
      { name: "分配规则表决", action: "明确商品货款、履约成本、服务费、风险金与公益金的标的和比例", result: "合计100%的规则生效" },
      { name: "项目预算执行", action: "每项支出关联合同、审批、服务事实、发票和收款主体", result: "预算占用实时可查" },
      { name: "交易收益归集", action: "持牌机构按订单将各项资金直接结算至对应主体", result: "平台不形成资金池" },
      { name: "风险准备金处置", action: "按约定条件处理灾害、违约、质量和市场波动损失", result: "动用与追偿全留痕" },
      { name: "年度分配与公示", action: "审计后按成员贡献、履约和民主决策结果分配并公示", result: "可查、可申诉、可追溯" },
    ],
  },
];

const saved = productionBuild ? {} : (uni.getStorageSync("szgsOperationProgress") || {});
const progress = reactive<Record<string, number>>(saved);
const activeKey = ref(modules[0].key);
const active = computed(() => modules.find((x) => x.key === activeKey.value) || modules[0]);
const cursor = computed(() => progress[activeKey.value] ?? -1);
const percent = computed(() => Math.round(((cursor.value + 1) / active.value.steps.length) * 100));
const logs = ref<Array<{ time: string; module: string; step: string; evidence: string }>>([]);
const backendOnline = ref(false);
const syncing = ref(false);

function applyServerModule(item: BackendOperationModule) {
  progress[item.key] = item.current_step;
  if (item.key === activeKey.value) {
    logs.value = item.events.map((event) => ({
      time: new Date(event.created_at).toLocaleTimeString("zh-CN", { hour12: false }),
      module: item.name,
      step: event.title,
      evidence: event.evidence,
    }));
  }
}

async function syncOperations() {
  syncing.value = true;
  try {
    const data = await getOperationCatalog();
    data.modules.forEach(applyServerModule);
    backendOnline.value = true;
  } catch {
    backendOnline.value = false;
  } finally {
    syncing.value = false;
  }
}

onMounted(syncOperations);

async function runNext() {
  if (productionBuild && !backendOnline.value) return productionBlocked();
  const next = cursor.value + 1;
  if (next >= active.value.steps.length) {
    uni.showToast({ title: "本项目已完成", icon: "success" });
    return;
  }
  if (backendOnline.value) {
    try {
      const result = await advanceOperation(activeKey.value);
      applyServerModule(result);
      uni.showToast({ title: result.steps[result.current_step] + "已完成", icon: "none" });
      return;
    } catch {
      backendOnline.value = false;
      if (productionBuild) return productionBlocked();
      uni.showToast({ title: "后台暂时不可用，已切换本地联调", icon: "none" });
    }
  }
  progress[activeKey.value] = next;
  uni.setStorageSync("szgsOperationProgress", { ...progress });
  logs.value.unshift({
    time: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
    module: active.value.name,
    step: active.value.steps[next].name,
    evidence: `${activeKey.value.toUpperCase()}-${Date.now().toString().slice(-8)}-${next + 1}`,
  });
  uni.showToast({ title: active.value.steps[next].result, icon: "none" });
}

async function reset() {
  if (productionBuild) return productionBlocked();
  if (backendOnline.value) {
    try {
      const result = await resetOperation(activeKey.value);
      applyServerModule(result);
      logs.value = [];
      uni.showToast({ title: "后台工作流已重置", icon: "none" });
      return;
    } catch {
      backendOnline.value = false;
    }
  }
  progress[activeKey.value] = -1;
  uni.setStorageSync("szgsOperationProgress", { ...progress });
  logs.value = [];
}
</script>

<template>
  <view class="ops">
    <view class="hero">
      <text>数智供社 v8533</text>
      <text>全项目真实业务实操中心</text>
      <text>每个项目都按“主体—任务—单据—证据—资金—验收”运行，点击即可逐环节生成真实形态的业务结果。</text>
      <text class="backend-badge" :class="{ online: backendOnline }">{{ syncing ? "正在连接后台" : backendOnline ? "前后台已同步 · SQLite 工作流" : productionBuild ? "正式环境需后台授权岗位" : "本地联调模式 · 点击刷新重试" }}</text>
    </view>
    <scroll-view scroll-x class="module-scroll">
      <view class="module-row">
        <view v-for="m in modules" :key="m.key" class="module" :class="{ on: activeKey === m.key }" @tap="activeKey = m.key">
          <text>{{ m.icon }}</text><text>{{ m.name }}</text><text>{{ (progress[m.key] ?? -1) + 1 }}/{{ m.steps.length }}</text>
        </view>
      </view>
    </scroll-view>
    <view class="project">
      <view class="project-top"><text>{{ active.icon }}</text><view><text>{{ active.name }}</text><text>{{ active.object }}</text></view><text>{{ percent }}%</text></view>
      <view class="project-row"><text>执行主体</text><text>{{ active.owner }}</text></view>
      <view class="bar"><view :style="{ width: percent + '%' }"></view></view>
      <view class="actions"><view @tap="runNext">{{ cursor + 1 >= active.steps.length ? "项目已完成" : "执行下一环节" }}</view><view @tap="reset">重置</view></view>
    </view>
    <view class="section"><text>项目环节与功能</text><text>前序未完成，后续功能保持锁定</text></view>
    <view class="steps">
      <view v-for="(s, i) in active.steps" :key="s.name" :class="{ done: cursor >= i, active: cursor + 1 === i }" @tap="cursor + 1 === i && runNext()">
        <text class="no">{{ cursor >= i ? "✓" : i + 1 }}</text>
        <view><view><text>{{ s.name }}</text><text>{{ cursor >= i ? "已完成" : cursor + 1 === i ? "可执行" : "待前序" }}</text></view><text>{{ s.action }}</text><text v-if="cursor >= i">结果：{{ s.result }} · 证据已归档</text></view>
      </view>
    </view>
    <view class="section"><text>最近生成的业务事件</text><text>跨项目日志统一归集</text></view>
    <view v-if="logs.length" class="logs">
      <view v-for="log in logs" :key="log.evidence"><text>{{ log.time }}</text><view><text>{{ log.module }} · {{ log.step }}</text><text>{{ log.evidence }}</text></view><text>通过</text></view>
    </view>
    <view v-else class="empty">选择任一项目，点击“执行下一环节”开始办理。</view>
    <view class="note">当前仅保存项目进度和业务日志，不直接扣款、开票、报关或调用政府与机构系统；正式办理需逐一签约并接入对应权威接口。</view>
  </view>
</template>

<style lang="scss" scoped>
.ops { min-height: 100vh; padding-bottom: 40rpx; background: #eef2f5; }
.hero { padding: 30rpx 24rpx; color: #fff; background: linear-gradient(145deg, #123a52, #176a4b); border-radius: 0 0 30rpx 30rpx; }
.hero text { display: block; }
.hero text:first-child { font-size: 18rpx; opacity: .75; }
.hero text:nth-child(2) { margin-top: 9rpx; font-size: 37rpx; font-weight: 900; }
.hero text:last-child { margin-top: 7rpx; font-size: 19rpx; line-height: 1.55; opacity: .85; }
.backend-badge { display: inline-block !important; width: fit-content; margin-top: 12rpx !important; padding: 6rpx 12rpx; border-radius: 999rpx; color: #ffe6a3; background: rgba(255,255,255,.12); font-size: 17rpx !important; opacity: 1 !important; }
.backend-badge.online { color: #d7ffe6; background: rgba(40,190,112,.25); }
.module-scroll { white-space: nowrap; padding: 17rpx 0 3rpx; }
.module-row { display: inline-flex; gap: 10rpx; padding: 0 24rpx; }
.module { width: 130rpx; padding: 13rpx; border: 2rpx solid transparent; border-radius: 15rpx; background: #fff; display: inline-flex; flex-direction: column; align-items: center; }
.module text:first-child { font-size: 29rpx; }
.module text:nth-child(2) { color: #2c424e; font-size: 18rpx; font-weight: 850; }
.module text:last-child { color: #849097; font-size: 15rpx; }
.module.on { border-color: #16884c; background: #edf9f2; }
.project { margin: 15rpx 24rpx 0; padding: 19rpx; border-radius: 18rpx; color: #fff; background: #102f3d; }
.project-top { display: grid; grid-template-columns: 54rpx 1fr 80rpx; gap: 10rpx; align-items: center; }
.project-top > text:first-child { font-size: 35rpx; }
.project-top > view { display: flex; flex-direction: column; }
.project-top > view text:first-child { font-size: 23rpx; font-weight: 900; }
.project-top > view text:last-child { margin-top: 2rpx; font-size: 16rpx; opacity: .7; }
.project-top > text:last-child { font-size: 27rpx; font-weight: 900; text-align: right; }
.project-row { display: flex; justify-content: space-between; margin-top: 14rpx; padding-top: 12rpx; border-top: 1rpx solid rgba(255,255,255,.12); font-size: 17rpx; }
.project-row text:first-child { opacity: .65; }
.bar { height: 8rpx; margin-top: 13rpx; border-radius: 999rpx; overflow: hidden; background: rgba(255,255,255,.15); }
.bar view { height: 100%; background: #6fe1a0; transition: width .3s; }
.actions { display: flex; gap: 10rpx; margin-top: 14rpx; }
.actions view { padding: 14rpx; border-radius: 999rpx; text-align: center; font-size: 19rpx; font-weight: 850; }
.actions view:first-child { flex: 1; color: #123d36; background: #fff; }
.actions view:last-child { width: 110rpx; border: 2rpx solid rgba(255,255,255,.3); }
.section { display: flex; justify-content: space-between; align-items: flex-end; padding: 23rpx 24rpx 9rpx; }
.section text:first-child { color: #172b3a; font-size: 26rpx; font-weight: 900; }
.section text:last-child { color: #7f8b92; font-size: 16rpx; }
.steps, .logs { margin: 0 24rpx; border-radius: 18rpx; background: #fff; overflow: hidden; }
.steps > view { display: flex; gap: 12rpx; padding: 15rpx 16rpx; border-bottom: 1rpx solid #edf0f2; opacity: .45; }
.steps > view.done, .steps > view.active { opacity: 1; }
.steps > view.done { background: #f3faf6; }
.steps > view.active { background: #fff8e8; }
.no { flex: none; width: 42rpx; height: 42rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; background: #94a1a8; font-size: 17rpx; font-weight: 900; }
.done .no { background: #16884c; }
.active .no { background: #d39222; }
.steps > view > view { flex: 1; display: flex; flex-direction: column; }
.steps > view > view > view { display: flex; justify-content: space-between; }
.steps > view > view > view text:first-child { color: #2a414d; font-size: 20rpx; font-weight: 900; }
.steps > view > view > view text:last-child { color: #79868d; font-size: 16rpx; }
.steps > view > view > text { margin-top: 3rpx; color: #68777f; font-size: 16rpx; line-height: 1.45; }
.steps > view > view > text:last-child { color: #16884c; }
.logs > view { display: grid; grid-template-columns: 85rpx 1fr 52rpx; gap: 8rpx; padding: 13rpx 16rpx; border-bottom: 1rpx solid #edf0f2; }
.logs > view > text:first-child { color: #8a969d; font-size: 15rpx; }
.logs > view > view { display: flex; flex-direction: column; }
.logs > view > view text:first-child { color: #2b424d; font-size: 18rpx; font-weight: 850; }
.logs > view > view text:last-child { color: #2b6cb0; font-size: 15rpx; font-family: Menlo, monospace; }
.logs > view > text:last-child { color: #16884c; font-size: 16rpx; }
.empty { margin: 0 24rpx; padding: 26rpx; border-radius: 17rpx; color: #859198; background: #fff; text-align: center; font-size: 18rpx; }
.note { margin: 20rpx 24rpx 0; padding: 16rpx; border: 2rpx solid #efd494; border-radius: 15rpx; color: #755f39; background: #fff8e7; font-size: 17rpx; line-height: 1.55; }
</style>
