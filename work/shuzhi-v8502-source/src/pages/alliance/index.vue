<script setup lang="ts">
import { ref, computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useUserStore } from "@/store/user";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

const user = useUserStore();

// 六方角色——"我的一份"（延伸到每个商家和个体）
interface Role {
  key: string; icon: string; name: string; who: string; pos: string;
  income: { label: string; val: string }[];
  bind: string; duty: string; risk: string; color: string;
}
const roles: Role[] = [
  {
    key: "farmer", icon: "🧑‍🌾", name: "农户（个体）", who: "赣南脐橙种植户 · 张有粮（老俵）", color: "#16884c",
    pos: "共同体最前端——种得好、卖得掉、分得到",
    income: [
      { label: "收购货款", val: "保底兜底 / 随行就市就高" },
      { label: "增值收益", val: "按适用共同体合同和实际增值分配" },
      { label: "集体分红", val: "村集体持股分红按户分" },
      { label: "考核奖励", val: "品质 A 级 ×1.1 多劳多得" },
    ],
    bind: "合作社 + 村集体 + 平台", duty: "按合同与适用标准生产、如约交付", risk: "自然风险按保险条款理赔；价格与减产责任按合同分担",
  },
  {
    key: "shopb", icon: "🏪", name: "小 b 商家", who: "社区门店 / 中央厨房等八类小端", color: "#2b6cb0",
    pos: "共同体流通端——就近进好货、稳定有钱赚",
    income: [
      { label: "集采优惠", val: "枢纽直采、量大价降" },
      { label: "复购返利", val: "年度采购返点" },
      { label: "认证溢价", val: "转售绿色/地标品加价空间" },
      { label: "推广分成", val: "独立推广服务费按生效合同结算" },
    ],
    bind: "城市农批枢纽 + 平台 + 推广组织", duty: "诚信经营、索证索票、如实溯源", risk: "质量争议按证据与责任判定；不作无边界连带",
  },
  {
    key: "coop", icon: "🏢", name: "合作社", who: "赣南脐橙合作社", color: "#0f6b3b",
    pos: "共同体组织端——把散户拧成一股绳",
    income: [
      { label: "组织服务费", val: "统购统销规模收益" },
      { label: "品牌增值", val: "地标/小产区公用品牌溢价" },
      { label: "订单农业", val: "以销定产、锁量锁价稳收" },
    ],
    bind: "农户 + 平台 + 采购方", duty: "组织生产、协同标准；农资服务自愿选择且单独计价", risk: "履约保证措施须对等、设上限并与实际责任匹配",
  },
  {
    key: "village", icon: "🚩", name: "村集体", who: "江西省赣州市信丰县安西镇范庄村集体经济组织", color: "#d64541",
    pos: "共同体分配枢纽——发展壮大、反哺村民",
    income: [
      { label: "集体服务", val: "按真实服务成果单列结算" },
      { label: "推广分红", val: "推广组织集体控股分红 40%" },
      { label: "集体入股", val: "持股 ≥51% 的股权收益" },
    ],
    bind: "农户 + 推广组织 + 平台", duty: "组织生产、公共服务、成员大会分配", risk: "考核奖惩、集体资产阳光监管",
  },
  {
    key: "promo", icon: "📣", name: "推广组织 / 推广员", who: "村集体控股推广公司", color: "#7c3aed",
    pos: "共同体连接端——维护关系、化解舆情",
    income: [
      { label: "推广佣金", val: "平台 4 : 组织 6 分成" },
      { label: "考核系数", val: "A×1.1 / B×1.0 / C×0.8 / D×0.6 浮动" },
    ],
    bind: "小 b 商家 + 村集体 + 平台", duty: "关系维护、舆情处理、合规拓展", risk: "考核不达标降系数、失格退出",
  },
  {
    key: "platform", icon: "🌐", name: "平台", who: "数智供社", color: "#d99a2b",
    pos: "共同体底座——不赚差价、做基础设施、让利各方",
    income: [
      { label: "技术服务费", val: "按合同约定基数、费率或固定价" },
      { label: "增值池份额", val: "适用共同体合同中为 5%" },
    ],
    bind: "全体参与方", duty: "建底座、控风险、保公平、持续让利", risk: "合规红线：不碰资金、不设资金池、不赚差价",
  },
];
const ri = ref(0);
const role = computed(() => roles[ri.value]);

// 登录身份 → 共同体六身份映射（延伸到每个商家和个体）
const roleMap: Record<string, string> = {
  supplier: "coop",   // 产地供应商 = 合作社
  buyer: "shopb",     // 采购商 = 小 b 商家
  agri: "farmer",     // 农资采购方/家庭农场 = 农户个体
  // 服务站专员为综合服务岗（代办/运维/助农），收益走推广/服务站单独结算，不在此页展示个人账本
};
// 当前登录用户对应的共同体身份 key（visitor 无个人账本）
const myKey = computed(() => roleMap[user.roleKey] || "");
const isMe = computed(() => role.value.key === myKey.value);
// 每次进入页面，按当前登录身份自动定位到"我的一份"
onShow(() => {
  const idx = roles.findIndex((r) => r.key === myKey.value);
  if (idx >= 0) ri.value = idx;
});

// 每个身份的"本月账本"（本月到手 + 明细 + 贡献值排名）
interface Ledger { total: string; unit: string; items: { l: string; v: string }[]; contrib: number; rank: string; }
const ledgers: Record<string, Ledger> = {
  farmer: { total: "9,500", unit: "本月到手", contrib: 892, rank: "全村第 3 / 187 户",
    items: [{ l: "收购货款", v: "¥7,200" }, { l: "二次分红", v: "¥820" }, { l: "集体分红", v: "¥1,280" }, { l: "品质考核奖", v: "¥200" }] },
  shopb: { total: "12,480", unit: "本月净增收", contrib: 815, rank: "片区第 6 / 92 店",
    items: [{ l: "集采省下", v: "¥3,280" }, { l: "复购返利", v: "¥1,800" }, { l: "认证品溢价", v: "¥6,200" }, { l: "推荐分成", v: "¥1,200" }] },
  coop: { total: "6.8 万", unit: "本月组织收益", contrib: 906, rank: "全县第 2 / 34 社",
    items: [{ l: "统购统销服务费", v: "¥3.6 万" }, { l: "品牌溢价分成", v: "¥2.1 万" }, { l: "订单农业规模收益", v: "¥1.1 万" }] },
  promo: { total: "9,860", unit: "本月佣金", contrib: 838, rank: "全区第 4 / 26 队",
    items: [{ l: "推广佣金(6 成)", v: "¥8,960" }, { l: "考核系数 A×1.1", v: "+¥900" }] },
};
const myLedger = computed(() => ledgers[role.value.key] || null);

// 村里分红榜（本月 · 按贡献值→户均分红，"我"高亮）
const board = [
  { n: "张有粮（老俵·我）", v: "¥1,280", me: true },
  { n: "赵满仓", v: "¥1,150", me: false },
  { n: "李丰收", v: "¥980", me: false },
  { n: "王二发", v: "¥860", me: false },
];
const boardMeta = "江西省赣州市信丰县安西镇范庄村 · 全村 187 户 · 本月集体分红池 ¥8.4 万 · 户均 ¥449";

// 共同体增值收益池分配：与基础货款、履约成本、平台服务费分开核算
const orderAmount = 10; // 万元，示例为扣除货物本金和合同认可成本后的可分配增值收益
const alloc = [
  { who: "生产者/合作社激励", pct: 55, color: "#16884c" },
  { who: "村集体服务与成员收益", pct: 15, color: "#d64541" },
  { who: "市场运营组织", pct: 10, color: "#7c3aed" },
  { who: "产业发展", pct: 8, color: "#2b6cb0" },
  { who: "风险准备", pct: 5, color: "#b45309" },
  { who: "公益帮扶", pct: 2, color: "#38a169" },
  { who: "平台技术运营", pct: 5, color: "#475569" },
];
const allocVal = (pct: number) => (orderAmount * pct / 100).toFixed(2);

// 四大利益绑定机制
const mechs = [
  { icon: "⚖️", t: "两账分离", d: "基础交易按合同逐项结算；只有实际形成的共同体增值收益池才按55/15/10/8/5/2/5分配，合计100%" },
  { icon: "🏦", t: "集体入股分红", d: "推广组织村/社区集体控股≥51%，收益 40% 反哺集体，按户分红" },
  { icon: "🎁", t: "增值收益共享", d: "先扣除货物本金、税费、物流加工检测、退货损失与合同认可成本，再按适用合同分配真实增值收益" },
  { icon: "📊", t: "考核奖惩", d: "服务/品质/履约考核 → 系数浮动（A×1.1、B×1.0、C×0.8、D×0.6），多劳多得、优汰劣" },
];

// 风险共担
const shared = [
  "🛡️ 履约险 / 天气险：按承保范围、免赔额和查勘结论理赔，不替代违约责任",
  "🤝 权责对等：谁有定价权、变更权和增值收益，谁承担相应交付、服务和赔偿责任",
  "💰 风险缓释：保险 / 担保 / 保证金只覆盖合同约定风险；平台不设资金池、不代偿",
  "🔍 防重复收费：合作社、村集体、推广组织和平台的服务项目逐项核验，同一服务只结算一次",
];
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🤝 利益共同体 · 人人有份</text>
      <text class="hs">供销"社"的本色是合作经济——货款归货款、成本归成本、服务费归服务费、增值收益再共享；让每一方获得与真实贡献匹配的收益，也承担与权利相匹配的责任。</text>
    </view>

    <!-- 登录身份横幅 -->
    <view v-if="myKey" class="idbar">
      <view class="ib-badge">{{ user.role.short }}</view>
      <view class="ib-i"><text class="ib-n">{{ user.role.name }} · {{ user.role.org }}</text><text class="ib-s">已按你的身份定位到"我的一份"</text></view>
    </view>
    <view v-else-if="!user.isVisitor" class="idbar">
      <view class="ib-badge">{{ user.role.short }}</view>
      <view class="ib-i"><text class="ib-n">{{ user.role.name }} · {{ user.role.org }}</text><text class="ib-s">综合服务身份 · 收益走推广/服务站单独结算，此处暂不展示个人账本</text></view>
    </view>
    <view v-else class="idbar guest">
      <text class="ib-gic">👋</text>
      <view class="ib-i"><text class="ib-n">当前为访客 / 消费者</text><text class="ib-s">登录企业身份后可查看"我的一份·本月到手"</text></view>
    </view>

    <view v-if="productionBuild" class="backend-note">正式环境共同体账本、分配比例、贡献排名和分红榜必须由后台依据生效合同、验收证据、发票和持牌结算回执实时计算；当前未配置真实共同体账本，不展示本地金额样例。</view>

    <!-- 我的账本（按登录身份，本月到手）-->
    <view v-if="myLedger && !productionBuild" class="ledger">
      <view class="lg-hd">
        <view><text class="lg-lb">{{ myLedger.unit }}<text v-if="isMe" class="me-tag">我</text></text><text class="lg-total">¥{{ myLedger.total }}</text></view>
        <view class="lg-contrib"><text class="lg-cv">{{ myLedger.contrib }}</text><text class="lg-cl">贡献值 · {{ myLedger.rank }}</text></view>
      </view>
      <view class="lg-items">
        <view class="lg-it" v-for="(x, i) in myLedger.items" :key="i"><text class="lg-il">{{ x.l }}</text><text class="lg-iv">{{ x.v }}</text></view>
      </view>
    </view>

    <!-- 选身份看"我的一份" -->
    <view class="sec">选身份 · 看"我的一份"</view>
    <scroll-view scroll-x class="roles">
      <view class="rl" :class="{ on: ri === i }" v-for="(r, i) in roles" :key="r.key" @tap="ri = i" :style="ri === i ? { borderColor: r.color, background: '#fff' } : {}">
        <text class="rl-ic">{{ r.icon }}</text><text class="rl-n">{{ r.name }}</text>
        <text v-if="r.key === myKey" class="rl-me">我</text>
      </view>
    </scroll-view>

    <view class="mine" :style="{ borderColor: role.color }">
      <view class="mn-hd">
        <text class="mn-ic">{{ role.icon }}</text>
        <view class="mn-hi"><text class="mn-n">{{ role.name }}</text><text class="mn-who">{{ role.who }}</text></view>
      </view>
      <view class="mn-pos" :style="{ background: role.color }">{{ role.pos }}</view>
      <template v-if="!productionBuild">
      <text class="mn-lb">💰 我的收益构成</text>
      <view class="inc" v-for="(x, i) in role.income" :key="i">
        <text class="inc-l">{{ x.label }}</text><text class="inc-v">{{ x.val }}</text>
      </view>
      </template>
      <view class="mn-foot">
        <view class="mf"><text class="mf-k">🔗 绑定共同体</text><text class="mf-v">{{ role.bind }}</text></view>
        <view class="mf"><text class="mf-k">📋 我的责任</text><text class="mf-v">{{ role.duty }}</text></view>
        <view class="mf"><text class="mf-k">🛡️ 风险共担</text><text class="mf-v">{{ role.risk }}</text></view>
      </view>
    </view>

    <!-- 共同体增值收益池分配 -->
    <template v-if="!productionBuild">
    <view class="sec">增值收益池 · 合计100%（示例 ¥{{ orderAmount }} 万）</view>
    <view class="waterfall">
      <view class="wf" v-for="a in alloc" :key="a.who">
        <view class="wf-top"><text class="wf-who">{{ a.who }}</text><text class="wf-pct">{{ a.pct }}%</text></view>
        <view class="wf-track"><view class="wf-fill" :style="{ width: a.pct + '%', background: a.color }"></view></view>
        <text class="wf-val">¥{{ allocVal(a.pct) }} 万</text>
      </view>
      <view class="wf-note">计费标的不是订单总货款，而是扣除货物本金、税费、物流/加工/检测、退货损失和合同认可成本后的可分配增值收益。平台技术运营占增值池 <text class="pf-hl">5%</text>；普通交易技术服务费另按合同约定，不重复收取。</view>
    </view>

    <!-- 村里分红榜 -->
    <view class="sec">村里分红榜（本月）</view>
    <view class="boardc">
      <view class="bd" v-for="(b, i) in board" :key="i" :class="{ me: b.me }">
        <text class="bd-r" :class="{ top: i === 0 }">{{ i + 1 }}</text>
        <text class="bd-n">{{ b.n }}</text>
        <text class="bd-v">{{ b.v }}</text>
      </view>
      <text class="bd-meta">{{ boardMeta }}</text>
    </view>
    </template>

    <!-- 四大利益绑定机制 -->
    <view class="sec">利益绑定 · 四大机制</view>
    <view class="mechs">
      <view class="mech" v-for="m in mechs" :key="m.t">
        <text class="mc-ic">{{ m.icon }}</text>
        <view class="mc-i"><text class="mc-t">{{ m.t }}</text><text class="mc-d">{{ m.d }}</text></view>
      </view>
    </view>

    <!-- 风险共担 -->
    <view class="sec">一荣俱荣 · 一损俱损（风险共担）</view>
    <view class="shared">
      <text class="sh" v-for="(s, i) in shared" :key="i">{{ s }}</text>
    </view>

    <view class="tip">🔗 普通B2B订单不套用统一分成。每项费用必须写明服务项目、计费基数、费率或单价、付款人、收款人、履约证据和发票；推广4:6只分一笔已产生的推广服务费，不得与货款、平台费或增值池重复提取。资金由持牌机构按有效合同和验收证据直达，平台不经手货款。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #16884c, #0f6b3b); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.95; margin-top: 8rpx; display: block; line-height: 1.6; }
.sec { font-size: 28rpx; font-weight: 700; padding: 22rpx 28rpx 12rpx; }
.idbar { display: flex; align-items: center; margin: 18rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 22rpx; }
.idbar.guest { background: linear-gradient(135deg, #fff6e6, #fff); border: 2rpx solid #f0dcae; }
.ib-badge { width: 60rpx; height: 60rpx; border-radius: 16rpx; background: $sg-primary-light; color: $sg-primary; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 800; margin-right: 14rpx; flex: none; }
.ib-gic { font-size: 44rpx; margin-right: 14rpx; }
.ib-i { flex: 1; display: flex; flex-direction: column; }
.ib-n { font-size: 24rpx; font-weight: 700; }
.ib-s { font-size: 19rpx; color: $sg-text-3; margin-top: 3rpx; }
.ledger { margin: 14rpx 24rpx 0; background: linear-gradient(135deg, #16884c, #0f6b3b); border-radius: $sg-radius-lg; padding: 22rpx; color: #fff; }
.lg-hd { display: flex; align-items: flex-start; justify-content: space-between; }
.lg-lb { font-size: 20rpx; opacity: 0.9; display: block; }
.me-tag { font-size: 17rpx; background: $sg-gold; color: #fff; padding: 1rpx 10rpx; border-radius: 999rpx; margin-left: 8rpx; font-weight: 700; }
.lg-total { font-size: 48rpx; font-weight: 800; line-height: 1.2; }
.lg-contrib { text-align: right; display: flex; flex-direction: column; }
.lg-cv { font-size: 34rpx; font-weight: 800; color: $sg-gold-light; }
.lg-cl { font-size: 18rpx; opacity: 0.9; margin-top: 2rpx; }
.lg-items { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 16rpx; }
.lg-it { width: calc(50% - 5rpx); box-sizing: border-box; background: rgba(255,255,255,0.15); border-radius: $sg-radius; padding: 12rpx 14rpx; display: flex; align-items: center; justify-content: space-between; }
.lg-il { font-size: 20rpx; opacity: 0.92; }
.lg-iv { font-size: 22rpx; font-weight: 700; }
.roles { white-space: nowrap; padding: 0 24rpx; }
.rl-me { position: absolute; top: -6rpx; right: -6rpx; font-size: 16rpx; background: $sg-gold; color: #fff; padding: 1rpx 8rpx; border-radius: 999rpx; font-weight: 700; }
.boardc { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 12rpx 22rpx 18rpx; }
.bd { display: flex; align-items: center; padding: 14rpx 0; border-top: 2rpx solid $sg-bg; }
.bd:first-child { border-top: none; }
.bd.me { background: $sg-primary-light; margin: 0 -12rpx; padding: 14rpx 12rpx; border-radius: $sg-radius; border-top: none; }
.bd-r { width: 40rpx; height: 40rpx; flex: none; border-radius: 50%; background: $sg-bg; color: $sg-text-3; font-size: 22rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-right: 14rpx; }
.bd-r.top { background: linear-gradient(135deg, #e6b451, #d99a2b); color: #fff; }
.bd-n { flex: 1; font-size: 24rpx; font-weight: 600; }
.bd-v { font-size: 25rpx; font-weight: 800; color: #d64541; }
.bd-meta { display: block; margin-top: 10rpx; font-size: 19rpx; color: $sg-text-3; text-align: center; }
.rl { position: relative; display: inline-flex; flex-direction: column; align-items: center; padding: 14rpx 24rpx; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; margin-right: 14rpx; border: 3rpx solid transparent; }
.rl-ic { font-size: 40rpx; }
.rl-n { font-size: 20rpx; margin-top: 4rpx; color: $sg-text-2; font-weight: 600; }
.mine { margin: 14rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; border: 3rpx solid; }
.mn-hd { display: flex; align-items: center; }
.mn-ic { font-size: 52rpx; margin-right: 14rpx; }
.mn-hi { display: flex; flex-direction: column; }
.mn-n { font-size: 28rpx; font-weight: 800; }
.mn-who { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }
.mn-pos { margin: 14rpx 0; padding: 12rpx 16rpx; border-radius: $sg-radius; color: #fff; font-size: 21rpx; font-weight: 600; line-height: 1.4; }
.mn-lb { font-size: 23rpx; font-weight: 700; display: block; margin-bottom: 6rpx; }
.inc { display: flex; align-items: baseline; justify-content: space-between; padding: 12rpx 0; border-top: 2rpx solid $sg-bg; }
.inc:first-of-type { border-top: none; }
.inc-l { font-size: 24rpx; font-weight: 600; flex: none; margin-right: 16rpx; }
.inc-v { font-size: 21rpx; color: $sg-text-2; text-align: right; }
.mn-foot { margin-top: 12rpx; padding-top: 12rpx; border-top: 2rpx dashed $sg-border; }
.mf { display: flex; padding: 6rpx 0; }
.mf-k { width: 170rpx; font-size: 20rpx; color: $sg-text-3; flex: none; }
.mf-v { flex: 1; font-size: 21rpx; color: $sg-text-2; line-height: 1.4; }
.waterfall { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.wf { margin-bottom: 16rpx; }
.wf-top { display: flex; align-items: baseline; justify-content: space-between; }
.wf-who { font-size: 24rpx; font-weight: 600; }
.wf-pct { font-size: 24rpx; font-weight: 800; }
.wf-track { height: 22rpx; background: $sg-bg; border-radius: 999rpx; overflow: hidden; margin: 6rpx 0 4rpx; }
.wf-fill { height: 100%; border-radius: 999rpx; }
.wf-val { font-size: 20rpx; color: $sg-text-3; }
.wf-note { margin-top: 6rpx; font-size: 22rpx; color: $sg-text-2; background: $sg-primary-light; border-radius: $sg-radius; padding: 14rpx 16rpx; line-height: 1.5; }
.pf-hl { color: #d99a2b; font-weight: 800; font-size: 26rpx; }
.mechs { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 8rpx 22rpx; }
.mech { display: flex; align-items: flex-start; padding: 16rpx 0; border-top: 2rpx solid $sg-bg; }
.mech:first-child { border-top: none; }
.mc-ic { font-size: 38rpx; margin-right: 14rpx; flex: none; }
.mc-i { flex: 1; display: flex; flex-direction: column; }
.mc-t { font-size: 25rpx; font-weight: 700; }
.mc-d { font-size: 20rpx; color: $sg-text-2; margin-top: 3rpx; line-height: 1.5; }
.shared { margin: 0 24rpx; }
.sh { display: block; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 16rpx 18rpx; margin-bottom: 10rpx; font-size: 22rpx; color: $sg-text-2; line-height: 1.4; }
.tip { margin: 20rpx 24rpx 40rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.backend-note { margin: 24rpx; padding: 24rpx; border-radius: $sg-radius-lg; background: #fff8e8; color: #8a5a00; line-height: 1.6; font-size: 24rpx; }
</style>
