<script setup lang="ts">
import { computed, ref } from "vue";
import { useUserStore } from "@/store/user";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const productionBlocked = () => uni.showModal({ title: "需后台交易控制台", content: "正式环境六项核验必须由后台根据真实订单、合同、物流、发票和结算回执返回，当前未执行本地核验。", showCancel: false });

const user = useUserStore();
type Desk = "supplier" | "buyer" | "platform";

const desk = ref<Desk>(
  user.roleKey === "buyer" ? "buyer" : user.roleKey === "supplier" ? "supplier" : "platform",
);
const verifyStep = ref(6);
const flowStep = ref(0);

const desks = [
  { key: "supplier" as Desk, name: "供货商", icon: "🌾" },
  { key: "buyer" as Desk, name: "采购商", icon: "🏢" },
  { key: "platform" as Desk, name: "平台风控", icon: "🛡️" },
];

const profiles = {
  supplier: {
    org: "赣南脐橙合作社",
    type: "农民专业合作社",
    legal: "钟海明 · 法人人脸已核验",
    license: "统一社会信用代码 91360722MA35Q8****",
    bank: "江西农商银行 · 对公账户尾号 0781",
    scope: "水果种植、初加工、农产品销售",
    permit: "承诺达标合格证 · 绿色食品认证",
    role: "可发布货源、响应采购、签约、交付；不可代采购方付款",
    color: "#16884c",
  },
  buyer: {
    org: "锦华连锁生鲜有限公司",
    type: "有限责任公司",
    legal: "李建华 · 法人人脸已核验",
    license: "统一社会信用代码 91440300MA5D9****",
    bank: "招商银行深圳分行 · 对公账户尾号 6038",
    scope: "生鲜农产品采购、连锁零售、仓储配送",
    permit: "食品经营许可证 · 80家门店采购授权",
    role: "可发布采购、选定报价、签约付款、验收；不可修改供方批次记录",
    color: "#2b6cb0",
  },
  platform: {
    org: "数智供社交易运营中心",
    type: "平台运营与技术服务主体",
    legal: "交易复核岗、资金指令岗、争议岗三岗分离",
    license: "平台备案、等保与数据合规资料已公示",
    bank: "不设自有资金池 · 不接收交易货款",
    scope: "主体核验、撮合、合同、履约、风控与分账指令",
    permit: "持牌银行/支付机构合作协议",
    role: "可审核、暂停业务、发送经授权指令；不可自行冻结银行资金、挪用货款或二清",
    color: "#7c3aed",
  },
};

const profile = computed(() => profiles[desk.value]);

const checks = [
  { t: "工商主体存续", d: "企业名称、统一社会信用代码、法定代表人三项一致", proof: "市场监管权威数据" },
  { t: "法人与经办人授权", d: "法人人脸绑定 DID；经办人有岗位、额度和有效期", proof: "人脸令牌 + 授权书" },
  { t: "经营范围与许可", d: "发布品类必须在经营范围内，肉类、水产等校验专项许可", proof: "许可编号 + 到期日" },
  { t: "对公账户四要素", d: "户名必须与交易主体一致，变更账户触发人工复核", proof: "银行账户核验回执" },
  { t: "受益所有人与风险名单", d: "核验实际控制人、司法风险、失信、反洗钱名单", proof: "风险筛查报告" },
  { t: "履约能力与信用", d: "库存/产能、历史履约、争议率、冷链和质量能力匹配订单", proof: "信用快照 V8533" },
];

const flows = [
  {
    g: "准入",
    t: "双方主体与角色确认",
    owner: "平台合规岗",
    action: "确认供货方、采购方、经办人及操作权限；生成可验证、可追溯的身份快照",
    fund: "不发生资金",
    gate: "主体、许可、对公账户任一不一致，禁止报价和下单",
    links: ["企业入驻", "DID身份", "商户星级"],
  },
  {
    g: "供需",
    t: "货源发布与采购需求",
    owner: "供货商 / 采购商",
    action: "供方锁定品类、规格、可供量；采购方锁定数量、质量、交付地与预算",
    fund: "不发生资金",
    gate: "超经营范围、虚假库存、预算与数量异常自动拦截",
    links: ["供货大厅", "采购大厅", "品质认证"],
  },
  {
    g: "撮合",
    t: "询盘、报价与反报价",
    owner: "买卖双方",
    action: "结构化报价固化含税口径、物流承担、验收标准、账期和有效期",
    fund: "可选履约保证金规则，尚不扣款",
    gate: "关键条款未齐不得生成订单；报价版本全留痕",
    links: ["议价洽谈", "AI撮合", "阳光招采"],
  },
  {
    g: "复核",
    t: "订单人工复核",
    owner: "交易复核岗",
    action: "复核主体、价格、数量、收货地、发票和监管账户；复核人刷脸签名",
    fund: "仍未扣款",
    gate: "价格异常、关联交易、超授权额度转增强审核",
    links: ["订单中心", "智能风控", "权限中心"],
  },
  {
    g: "签约",
    t: "CA电子合同与履约计划",
    owner: "买卖双方",
    action: "合同引用身份快照、报价版本、批次标准、交付节点和资金释放条件",
    fund: "生成唯一支付指令，不允许改收款户名",
    gate: "双方CA签章完成前，支付入口不可用",
    links: ["电子合同", "履约管理", "链上存证"],
  },
  {
    g: "入金",
    t: "采购方付款进入监管体系",
    owner: "采购方 + 持牌银行",
    action: "付款账户原则上与采购主体一致；按企业授权额度和合作机构风控采用增强核验",
    fund: "按合同选择直接对公、机构监管、验收即付或授信账期；平台不经手",
    gate: "未授权代付、账户异常、超权限、拆单规避核验时暂停并转人工复核",
    links: ["支付结算", "主办银行", "四流合一"],
  },
  {
    g: "交付",
    t: "锁货、出库与物流",
    owner: "供货商 + 仓储物流",
    action: "批次锁定、质检、称重、装车、温控和运单连续上链",
    fund: "货款保持冻结，供货商不可提前提现",
    gate: "换批、短装、质检过期、冷链异常暂停交付",
    links: ["智慧仓储", "冷链调度", "全链溯源"],
  },
  {
    g: "验收",
    t: "到货复磅、抽检与签收",
    owner: "采购方 + 第三方检测",
    action: "数量、等级、温控、检测和影像五类证据形成验收单",
    fund: "验收通过才进入待释放；异常金额继续冻结",
    gate: "采购方超时不验收自动提醒，不直接视为无条件通过",
    links: ["电子签收", "质检报告", "争议判责"],
  },
  {
    g: "结算",
    t: "银行按规则分账",
    owner: "主办银行 + 资金指令岗",
    action: "业务岗、资金岗分离；系统核对合同、验收、发票和分账规则",
    fund: "正常部分直达供方对公账户；争议部分继续冻结；费用逐项可查",
    gate: "无验收证据、账户变更、分账合计不等于应结金额时禁止出款",
    links: ["分账台账", "发票管理", "利益共同体"],
  },
  {
    g: "售后",
    t: "退款、理赔与信用回写",
    owner: "争议岗 + 保险/责任方",
    action: "调取合同、称重、温控、检测、影像和签收证据自动辅助判责",
    fund: "按责任退款、赔付或释放；全程留银行回单",
    gate: "争议岗不得同时担任原订单复核岗或资金指令岗",
    links: ["售后工单", "质量判责", "信用资产"],
  },
];

const funds = [
  { p: "合同签署", state: "未入金", amount: "¥0", note: "只生成银行支付指令" },
  { p: "采购方付款", state: "本例选择机构监管", amount: "¥276,000", note: "依合作机构实际产品入金，不进平台账户" },
  { p: "发货在途", state: "按合同保持待释放", amount: "¥276,000", note: "仅适用于本例所选监管结算模型" },
  { p: "到货验收", state: "正常待结 / 异常冻结", amount: "¥248,400 / ¥27,600", note: "示例保留10%质量观察款" },
  { p: "结算完成", state: "银行直分", amount: "以合同规则为准", note: "供方、服务方分别收到银行回单" },
  { p: "售后窗口关闭", state: "尾款释放", amount: "¥27,600", note: "有争议则退款/理赔后再结清" },
];

const flow = computed(() => flows[flowStep.value]);
const progress = computed(() => Math.round(((flowStep.value + 1) / flows.length) * 100));

function nextFlow() {
  flowStep.value = (flowStep.value + 1) % flows.length;
}
function resetFlow() {
  flowStep.value = 0;
}
function runVerify() {
  if (productionBuild) return productionBlocked();
  if (verifyStep.value >= checks.length) {
    verifyStep.value = 0;
    return;
  }
  const timer = setInterval(() => {
    verifyStep.value += 1;
    if (verifyStep.value >= checks.length) {
      clearInterval(timer);
      uni.showToast({ title: "六项核验通过", icon: "success" });
    }
  }, 420);
}
function go(url: string) {
  const [path, query = ""] = url.split("?");
  if (path === "/pages/trade/index") {
    const tab = new URLSearchParams(query).get("tab");
    if (tab) uni.setStorageSync("tradeTab", tab);
    uni.switchTab({ url: path });
    return;
  }
  if (path === "/pages/finance/index") {
    uni.switchTab({ url: path });
    return;
  }
  uni.navigateTo({ url });
}
</script>

<template>
  <view class="sg-page control-page">
    <view class="hero">
      <text class="hero-k">数智供社 v8533 · B2B交易底座</text>
      <text class="hero-t">交易准入与资金总控台</text>
      <text class="hero-s">先确认“谁在交易、谁有权操作”，再让货、款、票、证据按同一订单状态联动；平台只管规则和指令，不经手货款。</text>
      <view class="hero-tags">
        <text>主体真实</text><text>角色分权</text><text>银行监管</text><text>证据放款</text>
      </view>
    </view>

    <view class="desk-tabs">
      <view
        v-for="d in desks"
        :key="d.key"
        class="desk"
        :class="{ on: desk === d.key }"
        @tap="desk = d.key"
      >
        <text class="desk-ic">{{ d.icon }}</text>
        <text>{{ d.name }}</text>
      </view>
    </view>

    <view class="e2e-entry" @tap="go('/pages/arch/flow')">
      <view class="e2e-count"><text>18</text><text>步骤</text></view>
      <view class="e2e-main">
        <text class="e2e-title">端到端交易总控</text>
        <text class="e2e-sub">6阶段 · 18步骤 · 10道风控闸门 · 四流三账同步</text>
      </view>
      <text class="e2e-go">进入 ›</text>
    </view>

    <view class="sg-card passport" :style="{ borderColor: profile.color }">
      <view class="pass-head">
        <view>
          <text class="pass-label">交易身份通行证</text>
          <text class="pass-org">{{ profile.org }}</text>
        </view>
        <text class="pass-ok">有效 · 可交易</text>
      </view>
      <view class="pass-row"><text class="pk">主体类型</text><text class="pv">{{ profile.type }}</text></view>
      <view class="pass-row"><text class="pk">法人/岗位</text><text class="pv">{{ profile.legal }}</text></view>
      <view class="pass-row"><text class="pk">主体编码</text><text class="pv">{{ profile.license }}</text></view>
      <view class="pass-row"><text class="pk">对公账户</text><text class="pv">{{ profile.bank }}</text></view>
      <view class="pass-row"><text class="pk">范围许可</text><text class="pv">{{ profile.scope }} · {{ profile.permit }}</text></view>
      <view class="role-box">权限边界：{{ profile.role }}</view>
    </view>

    <view class="sec-row">
      <view>
        <text class="sec-t">六项身份硬核验</text>
        <text class="sec-s">不是一枚“已认证”标签，而是每笔交易引用的身份快照</text>
      </view>
      <view class="mini-btn" @tap="runVerify">{{ verifyStep >= checks.length ? "重新核验" : "继续核验" }}</view>
    </view>
    <view class="check-list">
      <view v-for="(c, i) in checks" :key="c.t" class="check" :class="{ done: i < verifyStep }">
        <view class="check-no">{{ i < verifyStep ? "✓" : i + 1 }}</view>
        <view class="check-i">
          <text class="check-t">{{ c.t }}</text>
          <text class="check-d">{{ c.d }}</text>
          <text class="check-p">凭证：{{ c.proof }}</text>
        </view>
      </view>
    </view>

    <view class="sec-row flow-head">
      <view>
        <text class="sec-t">贯穿18步的10道风控闸门</text>
        <text class="sec-s">这里展示控制关口；完整业务顺序请进入18步交易总控</text>
      </view>
      <text class="flow-p">{{ progress }}%</text>
    </view>
    <scroll-view scroll-x class="flow-strip">
      <view
        v-for="(f, i) in flows"
        :key="f.t"
        class="flow-chip"
        :class="{ on: i === flowStep, done: i < flowStep }"
        @tap="flowStep = i"
      >
        <text class="fc-no">{{ i < flowStep ? "✓" : i + 1 }}</text>
        <text>{{ f.g }}</text>
      </view>
    </scroll-view>
    <view class="sg-card flow-card">
      <view class="flow-title"><text class="flow-badge">{{ flow.g }}</text><text>{{ flow.t }}</text></view>
      <view class="flow-row"><text class="fk">责任主体</text><text class="fv">{{ flow.owner }}</text></view>
      <view class="flow-row"><text class="fk">业务动作</text><text class="fv">{{ flow.action }}</text></view>
      <view class="flow-row fund"><text class="fk">资金状态</text><text class="fv">{{ flow.fund }}</text></view>
      <view class="flow-row risk"><text class="fk">放行条件</text><text class="fv">{{ flow.gate }}</text></view>
      <view class="link-tags"><text v-for="l in flow.links" :key="l">{{ l }}</text></view>
      <view class="flow-actions">
        <view class="reset" @tap="resetFlow">回到起点</view>
        <view class="next" @tap="nextFlow">下一环节 ›</view>
      </view>
    </view>

    <view class="sec-row">
      <view>
        <text class="sec-t">资金全程状态账</text>
        <text class="sec-s">示例订单 ¥276,000；比例和账期以合同及业务类型配置为准</text>
      </view>
    </view>
    <view class="fund-chain">
      <view v-for="(f, i) in funds" :key="f.p" class="fund-node">
        <view class="fund-axis">
          <view class="fund-dot">{{ i + 1 }}</view>
          <view v-if="i < funds.length - 1" class="fund-line"></view>
        </view>
        <view class="fund-card">
          <view class="fund-top"><text class="fund-p">{{ f.p }}</text><text class="fund-state">{{ f.state }}</text></view>
          <text class="fund-amount">{{ f.amount }}</text>
          <text class="fund-note">{{ f.note }}</text>
        </view>
      </view>
    </view>

    <view class="redline">
      <text class="red-t">资金红线</text>
      <text class="red-d">平台不得以“监管账户”名义把交易货款收进自有账户；不得二次清算、挪用、沉淀或用新单垫旧单。资金必须由持牌银行/支付机构托管，平台仅发送经授权、可审计的冻结与分账指令。</text>
    </view>

    <view class="sec-row">
      <view>
        <text class="sec-t">与现有流程的衔接入口</text>
        <text class="sec-s">从大厅进入交易，从订单贯通合同、物流、结算、售后和信用</text>
      </view>
    </view>
    <view class="links">
      <view class="link" @tap="go('/pages/trade/index?tab=supply')"><text>🌾</text><view><text class="link-t">供货大厅</text><text class="link-s">货源、库存、批次、供方身份</text></view><text class="link-go">›</text></view>
      <view class="link" @tap="go('/pages/trade/index?tab=demand')"><text>🏢</text><view><text class="link-t">采购大厅</text><text class="link-s">需求、预算、报价、采购方授权</text></view><text class="link-go">›</text></view>
      <view class="link" @tap="go('/pages/trade/contracts')"><text>✍️</text><view><text class="link-t">CA合同包与线上签约</text><text class="link-s">14份模板逐一对应18步、资金条件与履约放行</text></view><text class="link-go">›</text></view>
      <view class="link" @tap="go('/pages/finance/settle')"><text>🏦</text><view><text class="link-t">支付结算体系</text><text class="link-s">银行监管、对账、分账和回单</text></view><text class="link-go">›</text></view>
      <view class="link" @tap="go('/pages/aftersale/dispute')"><text>⚖️</text><view><text class="link-t">质量争议判责</text><text class="link-s">证据调取、责任认定、冻结退款</text></view><text class="link-go">›</text></view>
      <view class="link" @tap="go('/pages/finance/fourflow')"><text>🔗</text><view><text class="link-t">四流合一风控</text><text class="link-s">合同流、货物流、资金流、发票流交叉核验</text></view><text class="link-go">›</text></view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.control-page { padding-bottom: 42rpx; }
.hero { padding: 36rpx 28rpx 32rpx; color: #fff; background: linear-gradient(145deg, #0f6b3b, #16884c 58%, #2b6cb0); }
.hero-k { font-size: 20rpx; opacity: .84; display: block; }
.hero-t { font-size: 38rpx; font-weight: 800; display: block; margin-top: 8rpx; }
.hero-s { font-size: 23rpx; line-height: 1.65; display: block; margin-top: 12rpx; opacity: .94; }
.hero-tags { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 18rpx; }
.hero-tags text { font-size: 19rpx; padding: 6rpx 14rpx; border-radius: 999rpx; background: rgba(255,255,255,.16); border: 1rpx solid rgba(255,255,255,.24); }
.desk-tabs { display: flex; margin: -16rpx 24rpx 8rpx; background: #fff; border-radius: 18rpx; box-shadow: $sg-shadow; position: relative; overflow: hidden; }
.desk { flex: 1; padding: 20rpx 8rpx; display: flex; align-items: center; justify-content: center; gap: 8rpx; color: $sg-text-2; font-size: 24rpx; }
.desk.on { color: $sg-primary; font-weight: 800; background: $sg-primary-light; }
.desk-ic { font-size: 28rpx; }
.e2e-entry { display: flex; align-items: center; margin: 14rpx 24rpx 8rpx; padding: 19rpx 20rpx; border-radius: $sg-radius-lg; color: #fff; background: linear-gradient(135deg, #102a43, #1f4f72); box-shadow: 0 8rpx 22rpx rgba(16,42,67,.22); }
.e2e-count { width: 62rpx; height: 62rpx; margin-right: 14rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; border-radius: 16rpx; background: rgba(255,255,255,.14); }
.e2e-count text:first-child { font-size: 27rpx; font-weight: 900; line-height: 1; }
.e2e-count text:last-child { margin-top: 3rpx; font-size: 15rpx; opacity: .8; }
.e2e-main { flex: 1; display: flex; flex-direction: column; }
.e2e-title { font-size: 25rpx; font-weight: 900; }
.e2e-sub { margin-top: 4rpx; font-size: 18rpx; opacity: .8; }
.e2e-go { font-size: 21rpx; }
.passport { border: 2rpx solid $sg-primary; }
.pass-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12rpx; }
.pass-label { font-size: 20rpx; color: $sg-text-3; display: block; }
.pass-org { font-size: 30rpx; font-weight: 800; display: block; margin-top: 4rpx; }
.pass-ok { font-size: 19rpx; color: #fff; background: $sg-primary; padding: 5rpx 14rpx; border-radius: 999rpx; }
.pass-row { display: flex; padding: 13rpx 0; border-top: 2rpx solid $sg-bg; }
.pk { width: 132rpx; color: $sg-text-3; font-size: 23rpx; }
.pv { flex: 1; font-size: 23rpx; line-height: 1.5; }
.role-box { margin-top: 10rpx; padding: 15rpx 17rpx; border-radius: 12rpx; background: #f3f0ff; color: #6b21b6; font-size: 21rpx; line-height: 1.55; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding: 26rpx 26rpx 12rpx; }
.sec-t { font-size: 29rpx; font-weight: 800; display: block; }
.sec-s { font-size: 20rpx; color: $sg-text-3; display: block; margin-top: 4rpx; line-height: 1.45; }
.mini-btn { flex: none; font-size: 21rpx; color: $sg-primary; background: $sg-primary-light; padding: 10rpx 17rpx; border-radius: 999rpx; }
.check-list { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 4rpx 20rpx; }
.check { display: flex; padding: 18rpx 0; border-top: 2rpx solid $sg-bg; opacity: .6; }
.check:first-child { border-top: 0; }
.check.done { opacity: 1; }
.check-no { width: 40rpx; height: 40rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 21rpx; margin-right: 14rpx; flex: none; }
.check.done .check-no { background: $sg-primary; }
.check-i { flex: 1; display: flex; flex-direction: column; }
.check-t { font-size: 25rpx; font-weight: 700; }
.check-d { font-size: 21rpx; color: $sg-text-2; margin-top: 3rpx; line-height: 1.45; }
.check-p { font-size: 19rpx; color: $sg-primary; margin-top: 4rpx; }
.flow-head { padding-bottom: 6rpx; }
.flow-p { font-size: 30rpx; color: $sg-primary; font-weight: 800; }
.flow-strip { white-space: nowrap; padding: 10rpx 24rpx 14rpx; }
.flow-chip { display: inline-flex; align-items: center; gap: 7rpx; padding: 10rpx 17rpx; margin-right: 9rpx; border-radius: 999rpx; background: #fff; color: $sg-text-2; font-size: 21rpx; }
.flow-chip.on { background: $sg-primary; color: #fff; }
.flow-chip.done { background: $sg-primary-light; color: $sg-primary; }
.fc-no { font-weight: 800; }
.flow-card { margin-top: 2rpx; }
.flow-title { display: flex; align-items: center; gap: 12rpx; font-size: 30rpx; font-weight: 800; margin-bottom: 12rpx; }
.flow-badge { font-size: 19rpx; color: #fff; background: $sg-primary; padding: 5rpx 12rpx; border-radius: 6rpx; }
.flow-row { display: flex; padding: 15rpx 0; border-top: 2rpx solid $sg-bg; }
.fk { width: 130rpx; color: $sg-text-3; font-size: 22rpx; }
.fv { flex: 1; font-size: 22rpx; line-height: 1.55; }
.flow-row.fund .fv { color: #2b6cb0; font-weight: 600; }
.flow-row.risk .fv { color: #b5791b; }
.link-tags { display: flex; flex-wrap: wrap; gap: 9rpx; margin-top: 10rpx; }
.link-tags text { font-size: 19rpx; color: #6b21b6; background: #f3f0ff; padding: 6rpx 12rpx; border-radius: 6rpx; }
.flow-actions { display: flex; gap: 14rpx; margin-top: 20rpx; }
.reset,.next { flex: 1; text-align: center; padding: 18rpx; border-radius: 999rpx; font-size: 24rpx; font-weight: 700; }
.reset { background: $sg-bg; color: $sg-text-2; }
.next { background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; }
.fund-chain { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; padding: 20rpx; box-shadow: $sg-shadow; }
.fund-node { display: flex; }
.fund-axis { width: 46rpx; display: flex; flex-direction: column; align-items: center; flex: none; }
.fund-dot { width: 36rpx; height: 36rpx; border-radius: 50%; background: #2b6cb0; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 19rpx; font-weight: 700; }
.fund-line { width: 3rpx; flex: 1; min-height: 82rpx; background: #d6e8fb; }
.fund-card { flex: 1; padding: 1rpx 0 20rpx 10rpx; }
.fund-top { display: flex; align-items: center; justify-content: space-between; }
.fund-p { font-size: 24rpx; font-weight: 700; }
.fund-state { font-size: 19rpx; color: #2b6cb0; background: #eef6ff; padding: 4rpx 10rpx; border-radius: 999rpx; }
.fund-amount { font-size: 28rpx; font-weight: 800; color: #2b6cb0; display: block; margin-top: 5rpx; }
.fund-note { font-size: 20rpx; color: $sg-text-3; line-height: 1.45; display: block; margin-top: 3rpx; }
.redline { margin: 20rpx 24rpx 2rpx; padding: 20rpx; border-radius: $sg-radius-lg; background: #fdecea; border: 2rpx solid #f5c6c2; }
.red-t { display: block; color: $sg-red; font-size: 26rpx; font-weight: 800; }
.red-d { display: block; color: #8f2f29; font-size: 21rpx; line-height: 1.65; margin-top: 7rpx; }
.links { margin: 0 24rpx; }
.link { display: flex; align-items: center; background: #fff; padding: 18rpx 20rpx; border-radius: $sg-radius-lg; margin-bottom: 12rpx; box-shadow: $sg-shadow; }
.link>text { font-size: 34rpx; margin-right: 15rpx; }
.link>view { flex: 1; display: flex; flex-direction: column; }
.link-t { font-size: 25rpx; font-weight: 700; }
.link-s { font-size: 20rpx; color: $sg-text-3; margin-top: 3rpx; }
.link-go { color: $sg-text-3; font-size: 30rpx; }
</style>
