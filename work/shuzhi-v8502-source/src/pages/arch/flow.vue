<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";

type FlowStep = {
  stage: string;
  stageNo: number;
  icon: string;
  title: string;
  owner: string;
  input: string;
  action: string;
  business: string;
  fund: string;
  evidence: string;
  gate: string;
  output: string;
  url: string;
};

// 统一标准：一笔 B2B 农产品交易 = 6 个阶段、18 个步骤。
// 10 道是贯穿其中的风控闸门，不再与 18 个业务步骤混称。
const steps: FlowStep[] = [
  {
    stage: "准入建档", stageNo: 1, icon: "🏢", title: "交易主体申请入驻",
    owner: "供货商 / 采购商",
    input: "营业执照、法人信息、经营范围、联系信息",
    action: "建立唯一企业主体档案，区分供货、采购或双角色",
    business: "主体待核验", fund: "未开通交易资金权限", evidence: "入驻申请原文与授权记录",
    gate: "主体不存在、注销、吊销或资料冒用立即拒绝",
    output: "企业主体 ID", url: "/pages/register/index",
  },
  {
    stage: "准入建档", stageNo: 1, icon: "👤", title: "法人及经办人授权",
    owner: "法人 / 企业管理员",
    input: "法人人脸、经办人身份、岗位、额度、有效期",
    action: "法人绑定 DID，经办人按岗位授予最小操作权限",
    business: "人员权限生效", fund: "付款与复核权限分离", evidence: "人脸令牌、授权书、权限快照",
    gate: "越权、过期授权、同人兼任冲突岗位不得放行",
    output: "经办权限令牌", url: "/pages/mine/did",
  },
  {
    stage: "准入建档", stageNo: 1, icon: "🛡️", title: "资质、账户与风险核验",
    owner: "平台合规岗 + 银行",
    input: "专项许可、受益所有人、对公账户四要素、履约能力",
    action: "完成六项身份硬核验并生成本次交易可引用的身份快照",
    business: "准入通过", fund: "仅启用同名对公账户", evidence: "KYB报告、银行回执、风险筛查报告",
    gate: "许可与品类不匹配、账户不同名、命中风险名单即阻断",
    output: "交易身份通行证", url: "/pages/trade/control",
  },
  {
    stage: "供需撮合", stageNo: 2, icon: "🌾", title: "供货信息发布",
    owner: "供货商",
    input: "品类、规格、产地、库存、批次、含税价、交付能力",
    action: "发布可验证货源并锁定质量标准、有效期和可供数量",
    business: "货源挂牌", fund: "不发生资金", evidence: "货源版本、批次与检测凭证",
    gate: "超经营范围、虚假库存、检测过期或禁限售品不得发布",
    output: "标准化货源单", url: "/pages/trade/publish?type=supply",
  },
  {
    stage: "供需撮合", stageNo: 2, icon: "🛒", title: "采购需求发布",
    owner: "采购商",
    input: "采购清单、预算、数量、交付地、验收标准、发票要求",
    action: "将采购意图转为可报价、可验收、可签约的结构化需求",
    business: "需求挂牌", fund: "预算额度预校验", evidence: "需求版本与采购授权",
    gate: "超采购额度、收货主体异常、关键验收项缺失不得发布",
    output: "标准化采购单", url: "/pages/trade/publish?type=demand",
  },
  {
    stage: "供需撮合", stageNo: 2, icon: "🤖", title: "智能撮合与询盘",
    owner: "平台撮合引擎 + 买卖双方",
    input: "供需单、距离、时效、价格、信用、物流能力",
    action: "形成候选清单，双方询盘并确认可交付性",
    business: "进入询盘", fund: "不发生资金", evidence: "匹配理由、询盘沟通记录",
    gate: "关联交易、异常低价、高风险主体转人工增强审核",
    output: "合格候选方", url: "/pages/ai/match",
  },
  {
    stage: "供需撮合", stageNo: 2, icon: "💬", title: "报价、议价与定标",
    owner: "供货商 / 采购商",
    input: "含税报价、运费承担、账期、交期、质量与售后条款",
    action: "多轮报价留痕；采购方按授权规则选定成交方案",
    business: "成交条件锁定", fund: "可约定保证金，暂不扣款", evidence: "历次报价、评标与定标记录",
    gate: "关键条款不完整、报价失效、定标人无权限不得成交",
    output: "成交确认单", url: "/pages/trade/tender",
  },
  {
    stage: "订单签约", stageNo: 3, icon: "📋", title: "订单生成与四流预校验",
    owner: "交易系统",
    input: "成交确认单、双方身份快照、货源批次、采购授权",
    action: "生成唯一订单号，预绑定合同流、货物流、资金流和发票流",
    business: "订单待复核", fund: "未入金", evidence: "订单初始快照与规则版本",
    gate: "主体、金额、批次、收货地或税务口径不一致即阻断",
    output: "待复核订单", url: "/pages/trade/orders",
  },
  {
    stage: "订单签约", stageNo: 3, icon: "🔎", title: "订单人工复核",
    owner: "交易复核岗",
    input: "订单、报价链、身份、关联关系、异常风险提示",
    action: "复核人刷脸签名；正常放行，异常驳回或转增强审核",
    business: "订单已放行", fund: "仍未扣款", evidence: "复核意见、人员签名、时间戳",
    gate: "复核岗不得兼任资金指令岗；高风险订单必须双人复核",
    output: "复核放行单", url: "/pages/trade/order-detail",
  },
  {
    stage: "订单签约", stageNo: 3, icon: "✍️", title: "CA合同与履约计划",
    owner: "买卖双方",
    input: "订单、质量标准、交付节点、验收方法、资金释放规则",
    action: "双方 CA 签章，合同绑定身份、报价、批次、四选一结算模型和争议处理规则",
    business: "合同生效", fund: "生成与所选模型一致的支付/账期计划", evidence: "CA合同、可信时间戳、合同哈希",
    gate: "签章未完成或合同与订单不一致，支付入口不可用",
    output: "生效合同包与履约计划", url: "/pages/trade/contracts",
  },
  {
    stage: "资金履约", stageNo: 4, icon: "🏦", title: "结算模型与付款条件生效",
    owner: "采购商 + 供货商 + 银行/持牌机构（适用时）",
    input: "生效合同、所选结算模型、采购方同名对公账户、授信批复（账期适用）",
    action: "按合同选择预付款+尾款、机构监管、验收即付或授信账期；银行/持牌机构依真实产品执行资金操作",
    business: "付款条件已确认", fund: "即时付款取得回单；账期形成明确到期日，不提前扣款", evidence: "支付回单、机构受理结果或账期审批记录",
    gate: "未经约定的第三方代付、账户不同名、模型与合同不一致、账期七要素缺失不得放行",
    output: "付款确认或账期生效记录", url: "/pages/finance/settle",
  },
  {
    stage: "资金履约", stageNo: 4, icon: "📦", title: "锁货、质检与出库",
    owner: "供货商 + 仓储",
    input: "履约计划、指定批次、质检与包装要求",
    action: "锁定实物批次，完成复检、称重、包装、出库交接",
    business: "已出库", fund: "按所选模型保持待付、待释放或进入账期应收", evidence: "质检单、称重单、出库单、影像",
    gate: "换批、短装、检测不合格、证货不一致暂停出库",
    output: "合格出库批次", url: "/pages/logistics/wms",
  },
  {
    stage: "资金履约", stageNo: 4, icon: "🚚", title: "运输与在途监控",
    owner: "承运方 + 平台物流",
    input: "出库批次、运单、车辆与司机、温控要求",
    action: "轨迹、温度、开箱、时效连续记录，异常实时通知责任方",
    business: "运输在途", fund: "按合同模型控制；未满足付款条件不得提前支付", evidence: "运单、轨迹、温控与异常处置记录",
    gate: "偏航、失温、超时、异常开箱触发暂停交付与保险报案",
    output: "完整在途证据包", url: "/pages/logistics/waybill",
  },
  {
    stage: "资金履约", stageNo: 4, icon: "✅", title: "到货复磅、抽检与验收",
    owner: "采购商 + 第三方检测",
    input: "合同标准、到货实物、在途证据、抽检方案",
    action: "核对数量、等级、温控、检测和影像，形成电子验收单",
    business: "通过 / 部分通过 / 拒收", fund: "合格部分进入应付/释放/账期起算，异常部分单独暂停", evidence: "签收、复磅、检测、影像与差异单",
    gate: "采购方超时未验收只触发催办，不直接视为无条件通过",
    output: "可结算验收结果", url: "/pages/trace/fullchain",
  },
  {
    stage: "结算售后", stageNo: 5, icon: "🧾", title: "发票、对账与结算申请",
    owner: "供货商 + 采购商 + 平台资金岗",
    input: "合同、验收结果、发票、费用规则、收付款账户",
    action: "四流交叉核验，形成正常金额、费用金额、争议金额和准确到期日",
    business: "结算待执行", fund: "即时模型生成支付指令；账期模型生成应收应付台账", evidence: "发票、对账单、结算清单",
    gate: "四流不一致、发票异常、账户变更、合计不平不得出款",
    output: "银行分账指令", url: "/pages/finance/fourflow",
  },
  {
    stage: "结算售后", stageNo: 5, icon: "💴", title: "到期付款、机构结算与回单",
    owner: "主办银行/持牌机构",
    input: "已授权分账指令与可结算验收结果",
    action: "即时款或到期账期款直达合同收款方；机构监管模式按已授权条件释放",
    business: "正常部分已结算", fund: "平台不归集货款；仅争议金额按合同暂停", evidence: "各收款方银行回单与总账勾稽",
    gate: "平台不接收交易货款、不设资金池、不做二次清算",
    output: "结算回单包", url: "/pages/finance/settle",
  },
  {
    stage: "结算售后", stageNo: 5, icon: "⚖️", title: "售后、判责、退款或理赔",
    owner: "争议岗 + 责任方 + 保险机构",
    input: "合同、批次、称重、检测、温控、影像与签收证据",
    action: "独立调证判责，按责任执行退款、补款、赔付或余款释放",
    business: "争议关闭", fund: "冻结款依判责退款/赔付/释放", evidence: "判责书、退款回单、理赔凭证",
    gate: "争议岗不得兼任原订单复核岗或资金指令岗",
    output: "闭环售后结论", url: "/pages/aftersale/dispute",
  },
  {
    stage: "数据闭环", stageNo: 6, icon: "🔄", title: "信用回写与产销反哺",
    owner: "平台规则引擎 + 利益共同体",
    input: "完整订单、履约、资金、评价、售后与责任数据",
    action: "更新双方信用、履约能力和风险画像；动销数据反向指导生产",
    business: "订单闭环", fund: "尾款结清；收益按合同规则确认", evidence: "信用变更、审计报告、数据授权记录",
    gate: "信用结果可申诉；数据使用必须在授权范围内并可追溯",
    output: "可复用信用资产与生产建议", url: "/pages/finance/credit",
  },
];

const stages = [
  { no: 1, name: "准入建档", range: "1–3" },
  { no: 2, name: "供需撮合", range: "4–7" },
  { no: 3, name: "订单签约", range: "8–10" },
  { no: 4, name: "资金履约", range: "11–14" },
  { no: 5, name: "结算售后", range: "15–17" },
  { no: 6, name: "数据闭环", range: "18" },
];

const current = ref(-1);
const completed = ref(0);
const running = ref(false);
const finished = ref(false);
let timer: ReturnType<typeof setInterval> | null = null;

const active = computed(() => steps[Math.max(current.value, 0)]);
const progress = computed(() => Math.round((completed.value / steps.length) * 100));
const activeAnchor = computed(() => current.value >= 0 ? `flow-step-${Math.max(0, current.value - 1)}` : "flow-step-0");

function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
  running.value = false;
}

function runAll() {
  if (running.value) {
    stopTimer();
    return;
  }
  if (finished.value || current.value < 0) {
    current.value = 0;
    completed.value = 0;
    finished.value = false;
  }
  running.value = true;
  timer = setInterval(() => {
    if (current.value < steps.length - 1) {
      completed.value = current.value + 1;
      current.value += 1;
      return;
    }
    completed.value = steps.length;
    finished.value = true;
    stopTimer();
    uni.showToast({ title: "18步全流程已跑通", icon: "success" });
  }, 720);
}

function reset() {
  stopTimer();
  current.value = -1;
  completed.value = 0;
  finished.value = false;
}

function selectStep(index: number) {
  stopTimer();
  current.value = index;
  completed.value = index;
  finished.value = false;
}

function selectStage(stageNo: number) {
  const index = steps.findIndex((item) => item.stageNo === stageNo);
  if (index >= 0) selectStep(index);
}

const tabPages = ["/pages/trade/index", "/pages/finance/index"];
function go(url: string) {
  const path = url.split("?")[0];
  if (tabPages.includes(path)) uni.switchTab({ url: path });
  else uni.navigateTo({ url });
}

onUnmounted(stopTimer);
</script>

<template>
  <view class="sg-page flow-page">
    <view class="hero">
      <text class="hero-k">数智供社 v8533 · 单笔 B2B 交易标准</text>
      <text class="hero-t">端到端全流程贯通</text>
      <text class="hero-s">统一口径：6 个阶段、18 个步骤。10 道是贯穿全程的风控闸门，三本账同步、四流交叉核验。</text>
      <view class="metrics">
        <view><text class="metric-n">6</text><text class="metric-l">业务阶段</text></view>
        <view><text class="metric-n">18</text><text class="metric-l">标准步骤</text></view>
        <view><text class="metric-n">10</text><text class="metric-l">风控闸门</text></view>
        <view><text class="metric-n">4+3</text><text class="metric-l">四流三账</text></view>
      </view>
      <view class="run" :class="{ running, finished }" @tap="runAll">
        {{ running ? "Ⅱ 暂停核验" : finished ? "↻ 重新核验 18 步" : "开始核验 18 步" }}
      </view>
      <view class="run-meta">
        <text>{{ finished ? "全流程已闭环" : current < 0 ? "尚未开始" : `正在执行第 ${current + 1} 步` }}</text>
        <text>{{ progress }}%</text>
      </view>
      <view class="progress"><view :style="{ width: progress + '%' }"></view></view>
    </view>

    <scroll-view scroll-x class="stage-strip">
      <view
        v-for="stage in stages"
        :key="stage.no"
        class="stage-chip"
        :class="{ on: active.stageNo === stage.no && current >= 0, done: completed >= Number(stage.range.split('–').pop()) }"
        @tap="selectStage(stage.no)"
      >
        <text class="stage-no">{{ stage.no }}</text>
        <view><text class="stage-name">{{ stage.name }}</text><text class="stage-range">第{{ stage.range }}步</text></view>
      </view>
    </scroll-view>

    <view class="rule-card">
      <text class="rule-title">口径说明</text>
      <text class="rule-text">18 步是业务从“主体入驻”到“信用回写”的操作顺序；10 道闸门是身份、权限、品类、价格、合同、支付、批次、物流、验收、结算的放行控制。二者是“流程 + 控制”的关系，不重复计数。</text>
    </view>

    <view class="section-head">
      <view><text class="section-title">当前执行步骤</text><text class="section-sub">每一步必须具备输入、责任人、动作、证据、闸门和输出</text></view>
      <text class="step-count">{{ current < 0 ? "—" : current + 1 }}/18</text>
    </view>

    <view class="current-card" :class="{ idle: current < 0, complete: finished }">
      <view class="current-top">
        <text class="current-icon">{{ current < 0 ? "▶" : active.icon }}</text>
        <view class="current-main">
          <text class="current-stage">{{ current < 0 ? "点击上方开始" : `阶段 ${active.stageNo} · ${active.stage}` }}</text>
          <text class="current-title">{{ current < 0 ? "端到端交易流程核验" : active.title }}</text>
        </view>
        <text class="current-state">{{ finished ? "已闭环" : running ? "执行中" : current < 0 ? "待启动" : "已暂停" }}</text>
      </view>
      <template v-if="current >= 0">
        <view class="detail-row"><text class="detail-key">责任主体</text><text class="detail-val">{{ active.owner }}</text></view>
        <view class="detail-row"><text class="detail-key">本步输入</text><text class="detail-val">{{ active.input }}</text></view>
        <view class="detail-row"><text class="detail-key">标准动作</text><text class="detail-val">{{ active.action }}</text></view>
        <view class="four-lanes">
          <view><text class="lane-k green">业务账</text><text class="lane-v">{{ active.business }}</text></view>
          <view><text class="lane-k blue">资金账</text><text class="lane-v">{{ active.fund }}</text></view>
          <view><text class="lane-k purple">证据账</text><text class="lane-v">{{ active.evidence }}</text></view>
          <view><text class="lane-k gold">风控闸门</text><text class="lane-v">{{ active.gate }}</text></view>
        </view>
        <view class="output"><text>本步输出</text><text>{{ active.output }}</text></view>
        <view class="open-step" @tap="go(active.url)">打开对应业务模块 ›</view>
      </template>
      <text v-else class="idle-note">依次核验供货大厅、采购大厅、撮合、复核、合同、结算模型、仓储物流、验收、付款、售后和信用闭环。</text>
    </view>

    <view class="section-head">
      <view><text class="section-title">18 步标准作业链</text><text class="section-sub">可点选任一步查看完整控制要求</text></view>
      <view class="reset" @tap="reset">复位</view>
    </view>

    <scroll-view
      scroll-y
      class="runner-list"
      :scroll-into-view="activeAnchor"
      :scroll-with-animation="true"
    >
      <view
        v-for="(step, index) in steps"
        :id="`flow-step-${index}`"
        :key="step.title"
        class="flow-step"
        :class="{ active: index === current && !finished, done: index < completed || finished }"
        @tap="selectStep(index)"
      >
        <view class="axis">
          <view class="dot">{{ index < completed || finished ? "✓" : index + 1 }}</view>
          <view v-if="index < steps.length - 1" class="line"></view>
        </view>
        <view class="step-body">
          <view class="step-top">
            <text class="step-icon">{{ step.icon }}</text>
            <text class="step-title">{{ step.title }}</text>
            <text class="step-stage">{{ step.stage }}</text>
          </view>
          <text class="step-owner">{{ step.owner }}</text>
          <text class="step-output">输出：{{ step.output }}</text>
        </view>
      </view>
    </scroll-view>

    <view v-if="finished" class="receipt">
      <view class="receipt-head"><text>✅ 端到端贯通凭证</text><text>18/18</text></view>
      <view class="receipt-row"><text>业务订单</text><text>GX-B2B-8503-0001</text></view>
      <view class="receipt-row"><text>交易双方</text><text>赣南脐橙合作社 → 锦华连锁生鲜</text></view>
      <view class="receipt-row"><text>业务结果</text><text>交付、验收、结算、售后窗口全部闭环</text></view>
      <view class="receipt-row"><text>资金结果</text><text>四种模型按合同执行 · 平台不经手货款</text></view>
      <view class="receipt-row"><text>核验结果</text><text>四流一致 · 三账一致 · 10道闸门通过</text></view>
      <text class="receipt-note">本凭证为预览数据，用于核验规范流程与系统联动，不代表真实交易或银行回单。</text>
    </view>

    <view class="bottom-rule">
      <text class="bottom-title">全流程总原则</text>
      <text>上一步输出必须成为下一步输入；业务状态、资金状态、证据状态必须同单同号同步推进。任何闸门不通过，业务停、资金冻、证据留痕，禁止绕过流程人工放款。</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.flow-page { padding-bottom: 44rpx; }
.hero { padding: 34rpx 26rpx 28rpx; color: #fff; background: linear-gradient(145deg, #0b5d35, #16884c 55%, #1e5b8f); }
.hero-k { display: block; font-size: 19rpx; opacity: .82; }
.hero-t { display: block; margin-top: 7rpx; font-size: 38rpx; font-weight: 900; }
.hero-s { display: block; margin-top: 10rpx; font-size: 22rpx; line-height: 1.6; opacity: .94; }
.metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8rpx; margin-top: 18rpx; }
.metrics>view { padding: 13rpx 4rpx; text-align: center; border-radius: 12rpx; background: rgba(255,255,255,.13); border: 1rpx solid rgba(255,255,255,.16); }
.metric-n { display: block; font-size: 30rpx; font-weight: 900; }
.metric-l { display: block; margin-top: 2rpx; font-size: 17rpx; opacity: .86; }
.run { margin-top: 18rpx; padding: 19rpx; text-align: center; border-radius: 999rpx; background: #fff; color: $sg-primary-deep; font-size: 27rpx; font-weight: 900; box-shadow: 0 8rpx 22rpx rgba(0,0,0,.15); }
.run.running { background: #fff3cd; color: #8a5a00; }
.run.finished { background: #e8f5ee; color: $sg-primary-deep; }
.run-meta { display: flex; justify-content: space-between; margin-top: 14rpx; font-size: 19rpx; }
.progress { height: 8rpx; margin-top: 7rpx; border-radius: 999rpx; overflow: hidden; background: rgba(255,255,255,.22); }
.progress>view { height: 100%; border-radius: 999rpx; background: #ffd166; transition: width .35s; }
.stage-strip { white-space: nowrap; padding: 18rpx 20rpx 10rpx; box-sizing: border-box; }
.stage-chip { display: inline-flex; align-items: center; margin-right: 10rpx; padding: 12rpx 15rpx; border-radius: 14rpx; background: #fff; color: $sg-text-2; box-shadow: $sg-shadow; }
.stage-chip.on { color: #fff; background: $sg-primary; }
.stage-chip.done:not(.on) { color: $sg-primary; background: $sg-primary-light; }
.stage-no { width: 35rpx; height: 35rpx; margin-right: 9rpx; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; background: $sg-primary; font-size: 19rpx; font-weight: 800; }
.stage-chip.on .stage-no { color: $sg-primary; background: #fff; }
.stage-chip>view { display: inline-flex; flex-direction: column; }
.stage-name { font-size: 21rpx; font-weight: 800; }
.stage-range { margin-top: 2rpx; font-size: 16rpx; opacity: .72; }
.rule-card { margin: 8rpx 24rpx 0; padding: 18rpx 20rpx; border-radius: $sg-radius-lg; background: #eef6ff; border: 2rpx solid #cfe4fb; }
.rule-title { display: block; color: #1e5b8f; font-size: 23rpx; font-weight: 800; }
.rule-text { display: block; margin-top: 5rpx; color: #315f82; font-size: 20rpx; line-height: 1.6; }
.section-head { display: flex; align-items: center; justify-content: space-between; padding: 26rpx 25rpx 11rpx; }
.section-head>view:first-child { display: flex; flex-direction: column; }
.section-title { font-size: 29rpx; font-weight: 900; }
.section-sub { margin-top: 3rpx; color: $sg-text-3; font-size: 19rpx; }
.step-count { color: $sg-primary; font-size: 28rpx; font-weight: 900; }
.current-card { margin: 0 24rpx; padding: 22rpx; border-radius: $sg-radius-lg; background: #fff; box-shadow: $sg-shadow; border: 2rpx solid $sg-primary; }
.current-card.idle { border-style: dashed; border-color: $sg-border; }
.current-card.complete { border-color: #d99a2b; background: #fffdf5; }
.current-top { display: flex; align-items: center; }
.current-icon { width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center; border-radius: 16rpx; background: $sg-primary-light; font-size: 31rpx; }
.current-main { flex: 1; display: flex; flex-direction: column; margin-left: 13rpx; }
.current-stage { color: $sg-primary; font-size: 18rpx; }
.current-title { margin-top: 3rpx; font-size: 27rpx; font-weight: 900; }
.current-state { padding: 6rpx 11rpx; border-radius: 999rpx; color: #fff; background: $sg-primary; font-size: 18rpx; }
.detail-row { display: flex; padding: 13rpx 0; border-top: 2rpx solid $sg-bg; }
.detail-row:first-of-type { margin-top: 16rpx; }
.detail-key { width: 116rpx; color: $sg-text-3; font-size: 21rpx; }
.detail-val { flex: 1; font-size: 21rpx; line-height: 1.55; }
.four-lanes { display: grid; grid-template-columns: 1fr 1fr; gap: 10rpx; margin-top: 10rpx; }
.four-lanes>view { min-height: 96rpx; padding: 13rpx; border-radius: 11rpx; background: $sg-bg; display: flex; flex-direction: column; }
.lane-k { align-self: flex-start; padding: 3rpx 8rpx; border-radius: 5rpx; color: #fff; font-size: 17rpx; }
.lane-k.green { background: $sg-primary; }
.lane-k.blue { background: #2b6cb0; }
.lane-k.purple { background: #7c3aed; }
.lane-k.gold { background: #b5791b; }
.lane-v { margin-top: 6rpx; font-size: 18rpx; line-height: 1.4; }
.output { display: flex; align-items: center; justify-content: space-between; margin-top: 12rpx; padding: 13rpx 15rpx; border-radius: 10rpx; background: $sg-primary-light; color: $sg-primary-deep; font-size: 20rpx; }
.output text:last-child { font-weight: 800; }
.open-step { margin-top: 13rpx; padding: 15rpx; text-align: center; border-radius: 999rpx; color: #fff; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); font-size: 22rpx; font-weight: 800; }
.idle-note { display: block; padding: 20rpx 2rpx 3rpx; color: $sg-text-3; font-size: 21rpx; line-height: 1.65; }
.reset { padding: 8rpx 16rpx; border-radius: 999rpx; color: $sg-primary; background: $sg-primary-light; font-size: 20rpx; }
.runner-list { height: 760rpx; margin: 0 24rpx; padding: 18rpx 18rpx 2rpx; box-sizing: border-box; border-radius: $sg-radius-lg; background: #fff; box-shadow: $sg-shadow; }
.flow-step { display: flex; opacity: .65; }
.flow-step.active,.flow-step.done { opacity: 1; }
.axis { width: 48rpx; display: flex; flex-direction: column; align-items: center; flex: none; }
.dot { width: 38rpx; height: 38rpx; display: flex; align-items: center; justify-content: center; border-radius: 50%; color: #fff; background: #b7c0c9; font-size: 18rpx; font-weight: 800; }
.line { width: 3rpx; flex: 1; min-height: 73rpx; background: $sg-border; }
.flow-step.done .dot,.flow-step.done .line { background: $sg-primary; }
.flow-step.active .dot { background: #d99a2b; transform: scale(1.13); box-shadow: 0 0 0 7rpx rgba(217,154,43,.16); }
.step-body { flex: 1; min-width: 0; padding: 0 0 19rpx 10rpx; }
.step-top { display: flex; align-items: center; }
.step-icon { margin-right: 7rpx; font-size: 25rpx; }
.step-title { flex: 1; font-size: 23rpx; font-weight: 800; }
.step-stage { padding: 3rpx 8rpx; border-radius: 999rpx; color: $sg-primary; background: $sg-primary-light; font-size: 16rpx; }
.step-owner { display: block; margin-top: 4rpx; color: $sg-text-3; font-size: 18rpx; }
.step-output { display: block; margin-top: 5rpx; color: #2b6cb0; font-size: 18rpx; }
.receipt { margin: 20rpx 24rpx 0; padding: 22rpx; border-radius: $sg-radius-lg; background: #fffdf5; border: 2rpx solid #ecd28c; box-shadow: $sg-shadow; }
.receipt-head { display: flex; justify-content: space-between; padding-bottom: 13rpx; color: #8a5a00; font-size: 26rpx; font-weight: 900; border-bottom: 2rpx dashed #ecd28c; }
.receipt-row { display: flex; padding: 11rpx 0; border-bottom: 2rpx solid #f7eed5; font-size: 20rpx; line-height: 1.45; }
.receipt-row text:first-child { width: 118rpx; color: $sg-text-3; }
.receipt-row text:last-child { flex: 1; text-align: right; }
.receipt-note { display: block; margin-top: 12rpx; color: $sg-text-3; font-size: 17rpx; line-height: 1.5; }
.bottom-rule { margin: 20rpx 24rpx 0; padding: 20rpx; border-radius: $sg-radius-lg; color: #7b2f29; background: #fdecea; border: 2rpx solid #f5c6c2; font-size: 20rpx; line-height: 1.65; }
.bottom-title { display: block; margin-bottom: 5rpx; font-size: 24rpx; font-weight: 900; }
</style>
