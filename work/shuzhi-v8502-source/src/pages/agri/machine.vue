<script setup lang="ts">
import { ref, computed } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

// 双视角
const view = ref<"call" | "driver">("call");

// —— 我要叫机 ——
const jobs = [
  { k: "harvest", n: "联合收割", price: 60, unit: "元/亩", icon: "🌾" },
  { k: "till", n: "深松整地", price: 45, unit: "元/亩", icon: "🚜" },
  { k: "seed", n: "免耕播种", price: 35, unit: "元/亩", icon: "🌱" },
  { k: "transplant", n: "机插秧", price: 120, unit: "元/亩", icon: "🪴" },
  { k: "spray", n: "植保飞防", price: 8, unit: "元/亩·次", icon: "🛸" },
  { k: "bale", n: "秸秆打捆", price: 25, unit: "元/亩", icon: "🎋" },
  { k: "dry", n: "粮食烘干", price: 80, unit: "元/吨", icon: "🔥" },
];
const ji = ref(0);
const job = computed(() => jobs[ji.value]);
const mu = ref(200); // 作业亩数

// 附近可派农机（信誉分层 → 报价与保障不同，呼应托管页信誉理念）
const machines = [
  { n: "供销农机服务中心", who: "雷沃谷神 · 联合收割机", operator: "王海强", match: "R准驾 · GM100机型 · 9年经验", star: 5, score: 946, beidou: true, qualified: true, filing: "机构、人员、机具、任务四档已匹配", dist: "3.2 km", eta: "约 40 分钟到位", factor: 1.0, color: "#16884c", promise: "明码标价 · 作业不达标免费返工" },
  { n: "丰穗农机合作社", who: "久保田 · 半喂入收割机", operator: "李国庆", match: "R准驾 · 对应机型培训有效", star: 4, score: 852, beidou: true, qualified: true, filing: "驾驶证、准驾机型与任务匹配", dist: "8 km", eta: "约 1.5 小时到位", factor: 0.93, color: "#2b6cb0", promise: "误期赔付 · 质量争议平台判责" },
  { n: "河南跨区麦客 · 王师傅", who: "约翰迪尔 · 大喂入收割机", operator: "王师傅", match: "R准驾 · 跨区排班无冲突", star: 4, score: 810, beidou: true, qualified: true, filing: "人机绑定与跨区作业备案有效", dist: "跨区在途", eta: "可预约档期 · 平台统一调度", factor: 0.87, color: "#d99a2b", promise: "跨区作业队 · 沿途维修加油保障" },
  { n: "个体机手 · 临时组队", who: "旧款收割机 · 无北斗", operator: "未确认", match: "人员证照与机具型号未匹配", star: 2, score: 641, beidou: false, qualified: false, filing: "操作证与机具检验材料缺失", dist: "5 km", eta: "约 1 小时", factor: 0.83, color: "#c0392b", promise: "无质量承诺 · 曾虚报亩数" },
];
const price = (f: number) => Math.round(job.value.price * f);
const total = (f: number) => (price(f) * mu.value / 10000).toFixed(1);

const dispatched = ref("");
function dispatch(m: any) {
  if (!m.qualified) {
    uni.showModal({ title: "禁止派单", content: "该机手/机具未通过资质审核备案，操作证、准驾机型或机具检验材料不完整。补齐材料并审核通过后才可参与调度。", showCancel: false });
    return;
  }
  if (productionBuild) return uni.showModal({ title: "需后台调度", content: "正式环境派单必须由后台复核人、机、任务、服务半径、保险和预算快照；当前未创建本地调度单。", showCancel: false });
  const isDry = job.value.k === "dry";
  uni.showModal({
    title: "一键派单", confirmText: "确认叫机",
    content: `作业：${job.value.n}\n农机：${m.n}（${m.who}）\n机手：${m.operator}\n人机匹配：${m.match}\n${isDry ? '数量' : '亩数'}：${mu.value} ${isDry ? '吨' : '亩'}\n单价：${price(m.factor)} ${job.value.unit}\n预估：约 ¥${total(m.factor)} 万\n${m.eta}\n\n调度单固化人员、机具与任务快照；换人或换机必须重新审核。作业全程北斗定位、亩数自动核，验收合格后结算。`,
    success: (r) => { if (r.confirm) { dispatched.value = m.n; uni.showToast({ title: "已派单 · 北斗追踪中", icon: "success" }); } },
  });
}

// —— 我是机手 ——
// 附近作业单（可抢）
const tasks = [
  { crop: "冬小麦", job: "联合收割", mu: 320, addr: "江西赣州信丰县安西镇范庄村", income: "1.92 万", dist: "4 km", urgent: true },
  { crop: "水稻", job: "机插秧", mu: 180, addr: "江西赣州信丰县大塘埠镇", income: "2.16 万", dist: "12 km", urgent: false },
  { crop: "油菜", job: "植保飞防", mu: 600, addr: "江西赣州信丰县安西镇", income: "0.48 万", dist: "6 km", urgent: false },
];
const grabbed = ref<number[]>([]);
function grab(i: number) {
  if (grabbed.value.includes(i)) return;
  if (productionBuild) return uni.showModal({ title: "需后台抢单", content: "正式环境抢单必须校验机手主体、机具资质、排班冲突和结算账户；当前未接受本地作业单。", showCancel: false });
  uni.showModal({
    title: "抢单确认", confirmText: "抢单",
    content: `${tasks[i].crop} · ${tasks[i].job} · ${tasks[i].mu} 亩\n地点：${tasks[i].addr}\n预估收入：¥${tasks[i].income}\n\n抢单后按约到场作业，北斗记录亩数，验收合格 T+1 结算。`,
    success: (r) => { if (r.confirm) { grabbed.value.push(i); uni.showToast({ title: "抢单成功", icon: "success" }); } },
  });
}

// 跨区作业路线（麦收南征北战 · 平台组织）
const route = [
  { t: "5 月中", loc: "河南 · 南阳", crop: "冬小麦开镰", mu: "作业 3200 亩", pay: "收入 ¥19.2 万" },
  { t: "6 月初", loc: "河北 · 邢台", crop: "冬小麦跟进", mu: "作业 2800 亩", pay: "收入 ¥16.8 万" },
  { t: "6 月中", loc: "天津 · 武清", crop: "冬小麦扫尾", mu: "作业 1500 亩", pay: "收入 ¥9 万" },
  { t: "7-8 月", loc: "内蒙 · 呼伦贝尔", crop: "春小麦北上", mu: "作业 2600 亩", pay: "收入 ¥15.6 万" },
];

const guarantee = [
  { icon: "🛰️", t: "北斗监管作业", d: "农机装北斗终端，作业轨迹+亩数实时上链，不靠人工报数，防虚报" },
  { icon: "🗺️", t: "智能派单/跨区调度", d: "就近派单、跨区排程，让机具不空跑、麦收不误农时" },
  { icon: "🔧", t: "沿途保障", d: "跨区作业队配随队维修、加油、住宿、绿色通道协调" },
  { icon: "💰", t: "监管账户结算", d: "作业费进监管账户，验收合格放款给机手，平台只收撮合服务费、不碰资金" },
  { icon: "⚖️", t: "作业争议判责", d: "调北斗轨迹+抽验+气象交叉核验，按责判定、保险赔付" },
];

function nav(url: string) { uni.navigateTo({ url }); }
function qualification() { uni.navigateTo({ url: "/pages/agri/qualification" }); }
function merchantMachine() { uni.navigateTo({ url: "/pages/agri/machinery-merchant" }); }
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty">
      <text class="production-empty-title">暂无后台农机调度档案</text>
      <text class="production-empty-text">正式环境的作业单、报价、机手资质、机具状态、服务半径和收入必须由后台调度服务实时返回。本页面不展示本地机手、价格或作业单样例，也不会创建本地派单。</text>
    </view>
    <template v-else>
    <view class="hero">
      <text class="ht">🚜 共享农机 · 跨区作业调度</text>
      <text class="hs">按需叫机、机手抢单、跨区调度——让农机不空跑、农时不耽误。作业全程北斗监管、亩数自动核、验收合格才结算。</text>
    </view>

    <!-- 视角切换 -->
    <view class="tabs">
      <text class="tab" :class="{ on: view === 'call' }" @tap="view = 'call'">📱 我要叫机</text>
      <text class="tab" :class="{ on: view === 'driver' }" @tap="view = 'driver'">🧑‍🌾 我是机手</text>
    </view>

    <view class="qual-entry" @tap="qualification">
      <text class="qual-ic">🛡️</text>
      <view class="qual-main"><text class="qual-t">农机手与无人机操作员资质备案</text><text class="qual-d">实名、驾驶证/操作证、准驾机型、机具牌证、UOM实名与保险自动联查</text></view>
      <text class="qual-go">进入 ›</text>
    </view>
    <view class="qual-entry" @tap="merchantMachine">
      <text class="qual-ic">🏷️</text>
      <view class="qual-main"><text class="qual-t">农机具商家管理台</text><text class="qual-d">一机一码、库存权属、销售租赁、交机验收、维保召回全周期管理</text></view>
      <text class="qual-go">进入 ›</text>
    </view>

    <!-- ===== 叫机视角 ===== -->
    <block v-if="view === 'call'">
      <view class="sec">① 选作业类型</view>
      <scroll-view scroll-x class="jobs">
        <view class="jb" :class="{ on: ji === i }" v-for="(j, i) in jobs" :key="j.k" @tap="ji = i">
          <text class="jb-ic">{{ j.icon }}</text>
          <text class="jb-n">{{ j.n }}</text>
          <text class="jb-p">{{ j.price }} {{ j.unit }}</text>
        </view>
      </scroll-view>

      <view class="mu-card">
        <text class="mu-l">{{ job.k === 'dry' ? '烘干数量（吨）' : '作业面积（亩）' }}</text>
        <input class="mu-in" type="number" v-model.number="mu" />
      </view>

      <view class="sec">② 附近可派农机（信誉≠报价≠保障）</view>
      <view class="machines">
        <view class="mc" v-for="m in machines" :key="m.n" :class="{ done: dispatched === m.n }">
          <view class="mc-hd">
            <view class="mc-hi"><text class="mc-n">{{ m.n }}</text><text class="mc-who">{{ m.who }}</text></view>
            <view class="mc-p"><text class="mc-pv" :style="{ color: m.color }">{{ price(m.factor) }}</text><text class="mc-pu">{{ job.unit }}</text></view>
          </view>
          <view class="mc-m">
            <text class="mc-mi" :style="{ color: m.color }">★{{ m.star }}</text>
            <text class="mc-mi" :style="{ color: m.color }">信誉 {{ m.score }}</text>
            <text class="mc-mi" :class="{ nob: !m.beidou }">{{ m.beidou ? '🛰️ 北斗' : '⚠️ 无北斗' }}</text>
            <text class="mc-mi">{{ m.dist }} · {{ m.eta }}</text>
          </view>
          <view class="filing" :class="{ blocked: !m.qualified }">{{ m.qualified ? '✓ 资质自动审核通过' : '× 未通过准入' }} · {{ m.filing }}</view>
          <view class="filing" :class="{ blocked: !m.qualified }">👷 {{ m.operator }} · {{ m.match }}</view>
          <view class="mc-ft">
            <text class="mc-pr" :class="{ bad: m.score < 700 }">{{ m.score < 700 ? '⚠️ ' : '🛡️ ' }}{{ m.promise }}</text>
            <text class="mc-btn" :class="{ done: dispatched === m.n, disabled: !m.qualified }" :style="dispatched === m.n || !m.qualified ? {} : { background: m.color }" @tap="dispatch(m)">{{ !m.qualified ? '禁止派单' : dispatched === m.n ? '已派单 ✓' : '派单' }}</text>
          </view>
        </view>
        <text class="mc-note">💡 个体机手报价最低，但无北斗、无质量承诺、曾虚报亩数——便宜的未必划算。总价按 {{ mu }} {{ job.k === 'dry' ? '吨' : '亩' }} 估算。</text>
      </view>
    </block>

    <!-- ===== 机手视角 ===== -->
    <block v-else>
      <view class="sec">① 附近作业单（可抢）</view>
      <view class="tasks">
        <view class="tk" v-for="(t, i) in tasks" :key="i">
          <view class="tk-hd">
            <text class="tk-crop">{{ t.crop }} · {{ t.job }}</text>
            <text v-if="t.urgent" class="tk-urg">⏰ 抢时</text>
          </view>
          <view class="tk-m"><text class="tk-mu">{{ t.mu }} 亩</text><text class="tk-dist">{{ t.dist }}</text></view>
          <text class="tk-addr">📍 {{ t.addr }}</text>
          <view class="tk-ft">
            <text class="tk-inc">预估收入 <text class="tk-iv">¥{{ t.income }}</text></text>
            <text class="tk-btn" :class="{ done: grabbed.includes(i) }" @tap="grab(i)">{{ grabbed.includes(i) ? '已抢单 ✓' : '抢单' }}</text>
          </view>
        </view>
      </view>

      <view class="sec">② 跨区作业 · 麦收南征北战（平台组织）</view>
      <view class="route">
        <view class="rt" v-for="(r, i) in route" :key="i">
          <view class="rt-axis"><view class="rt-dot"></view><view v-if="i < route.length - 1" class="rt-line"></view></view>
          <view class="rt-i">
            <view class="rt-hd"><text class="rt-t">{{ r.t }}</text><text class="rt-loc">{{ r.loc }}</text></view>
            <text class="rt-crop">{{ r.crop }} · {{ r.mu }}</text>
            <text class="rt-pay">{{ r.pay }}</text>
          </view>
        </view>
        <view class="rt-sum">🚜 一季跟着麦收从南到北，累计作业 1.01 万亩、机手毛收入约 <text class="rt-hl">¥60.6 万</text>；平台统一排线、沿途保障，机具不空跑。</view>
      </view>
    </block>

    <!-- 作业监管保障 -->
    <view class="sec">作业监管与结算保障</view>
    <view class="guard">
      <view class="gd" v-for="g in guarantee" :key="g.t">
        <text class="gd-ic">{{ g.icon }}</text>
        <view class="gd-i"><text class="gd-t">{{ g.t }}</text><text class="gd-d">{{ g.d }}</text></view>
      </view>
    </view>

    <!-- 关联 -->
    <view class="links">
      <view class="lk" @tap="nav('/pages/agri/trust')"><text class="lk-ic">🚜</text><view class="lk-i"><text class="lk-t">土地托管一并叫机</text><text class="lk-d">全程托管里"耕种防收烘"各环节的农机,系统自动派</text></view><text class="lk-go">›</text></view>
      <view class="lk" @tap="nav('/pages/agri/recycle')"><text class="lk-ic">🎋</text><view class="lk-i"><text class="lk-t">机收同步秸秆打捆离田</text><text class="lk-d">收割+打捆一趟过,秸秆离田接资源回收</text></view><text class="lk-go">›</text></view>
      <view class="lk" @tap="nav('/pages/finance/product?id=F6')"><text class="lk-ic">💰</text><view class="lk-i"><text class="lk-t">农机购置 / 融资租赁</text><text class="lk-d">买农机可申请农机贷、融资租赁,先用后付</text></view><text class="lk-go">›</text></view>
    </view>

    <view class="tip">🔗 共享农机是农业社会化服务的重要一环:把分散的农机具聚成一张调度网,农户按需叫机、机手就近抢单、平台组织跨区作业,解决"有机没活干、有活没机用"和农时紧张。作业全程北斗定位、亩数自动核算、监管账户结算,平台只做撮合调度、收服务费,不碰资金、不赚差价。</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.sg-page { padding-bottom: 40rpx; }
.hero { background: linear-gradient(160deg, #16884c, #0f6b3b); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.95; margin-top: 8rpx; display: block; line-height: 1.6; }
.tabs { display: flex; gap: 14rpx; margin: 20rpx 24rpx 0; }
.qual-entry { display: flex; align-items: center; margin: 14rpx 24rpx 0; padding: 18rpx 20rpx; border-radius: $sg-radius-lg; color: #fff; background: linear-gradient(135deg, #123c56, #12634d); box-shadow: $sg-shadow; }
.qual-ic { flex: none; font-size: 36rpx; margin-right: 13rpx; }
.qual-main { flex: 1; display: flex; flex-direction: column; }
.qual-t { font-size: 23rpx; font-weight: 800; }
.qual-d { margin-top: 3rpx; font-size: 17rpx; line-height: 1.45; opacity: .86; }
.qual-go { flex: none; font-size: 20rpx; margin-left: 8rpx; }
.tab { flex: 1; text-align: center; padding: 20rpx 0; border-radius: $sg-radius-lg; background: #fff; box-shadow: $sg-shadow; font-size: 26rpx; font-weight: 700; color: $sg-text-2; }
.tab.on { background: #16884c; color: #fff; }
.sec { font-size: 28rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.jobs { white-space: nowrap; padding: 0 24rpx; }
.jb { display: inline-flex; flex-direction: column; align-items: center; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 16rpx 22rpx; margin-right: 14rpx; border: 3rpx solid transparent; }
.jb.on { border-color: #16884c; background: #e8f5ee; }
.jb-ic { font-size: 36rpx; }
.jb-n { font-size: 23rpx; font-weight: 700; margin-top: 4rpx; }
.jb-p { font-size: 18rpx; color: $sg-text-3; margin-top: 2rpx; }
.mu-card { margin: 16rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx 22rpx; }
.mu-l { font-size: 22rpx; color: $sg-text-3; }
.mu-in { font-size: 40rpx; font-weight: 800; color: $sg-text; margin-top: 6rpx; border-bottom: 2rpx solid $sg-border; padding-bottom: 6rpx; }
.machines { margin: 0 24rpx; }
.mc { background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 20rpx; margin-bottom: 12rpx; border: 2rpx solid transparent; }
.mc.done { border-color: #16884c; background: #f2fbf6; }
.mc-hd { display: flex; align-items: flex-start; justify-content: space-between; }
.mc-hi { flex: 1; display: flex; flex-direction: column; }
.mc-n { font-size: 26rpx; font-weight: 800; }
.mc-who { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }
.mc-p { display: flex; align-items: baseline; flex: none; }
.mc-pv { font-size: 32rpx; font-weight: 800; }
.mc-pu { font-size: 17rpx; color: $sg-text-3; margin-left: 2rpx; }
.mc-m { display: flex; flex-wrap: wrap; gap: 8rpx; margin: 10rpx 0 8rpx; }
.mc-mi { font-size: 19rpx; color: $sg-text-3; background: $sg-bg; padding: 3rpx 12rpx; border-radius: 6rpx; }
.mc-mi.nob { color: #c0392b; background: #fdeceb; }
.mc-ft { display: flex; align-items: center; justify-content: space-between; }
.filing { margin: 8rpx 0; padding: 7rpx 10rpx; border-radius: 8rpx; font-size: 17rpx; color: #087742; background: #e8f5ee; }
.filing.blocked { color: #b3261e; background: #fdeceb; }
.mc-pr { flex: 1; font-size: 19rpx; color: $sg-primary; line-height: 1.4; }
.mc-pr.bad { color: #c0392b; }
.mc-btn { flex: none; margin-left: 12rpx; font-size: 24rpx; color: #fff; font-weight: 700; padding: 10rpx 30rpx; border-radius: 999rpx; }
.mc-btn.done { background: #16884c; }
.mc-btn.disabled { background: #a9afb3; }
.mc-note { display: block; margin-top: 4rpx; font-size: 20rpx; color: $sg-text-2; background: #fff8ec; border: 2rpx solid #f0dcae; border-radius: $sg-radius; padding: 14rpx 16rpx; line-height: 1.5; }
.tasks { margin: 0 24rpx; }
.tk { background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 20rpx; margin-bottom: 12rpx; }
.tk-hd { display: flex; align-items: center; justify-content: space-between; }
.tk-crop { font-size: 26rpx; font-weight: 800; }
.tk-urg { font-size: 19rpx; color: #fff; background: #d64541; padding: 3rpx 12rpx; border-radius: 999rpx; }
.tk-m { display: flex; gap: 14rpx; margin: 8rpx 0 4rpx; }
.tk-mu { font-size: 22rpx; font-weight: 700; color: $sg-primary; }
.tk-dist { font-size: 20rpx; color: $sg-text-3; }
.tk-addr { font-size: 19rpx; color: $sg-text-3; display: block; }
.tk-ft { display: flex; align-items: center; justify-content: space-between; margin-top: 10rpx; }
.tk-inc { font-size: 22rpx; color: $sg-text-2; }
.tk-iv { font-size: 26rpx; font-weight: 800; color: #d64541; }
.tk-btn { font-size: 24rpx; color: #fff; font-weight: 700; padding: 10rpx 32rpx; border-radius: 999rpx; background: #16884c; }
.tk-btn.done { background: #9aa0aa; }
.route { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx 22rpx; }
.rt { display: flex; }
.rt-axis { display: flex; flex-direction: column; align-items: center; margin-right: 16rpx; }
.rt-dot { width: 22rpx; height: 22rpx; border-radius: 50%; background: #16884c; margin-top: 6rpx; }
.rt-line { flex: 1; width: 4rpx; background: #d9e6dd; min-height: 40rpx; margin: 4rpx 0; }
.rt-i { flex: 1; padding-bottom: 20rpx; }
.rt-hd { display: flex; align-items: baseline; gap: 12rpx; }
.rt-t { font-size: 22rpx; font-weight: 700; color: #16884c; }
.rt-loc { font-size: 24rpx; font-weight: 700; }
.rt-crop { font-size: 20rpx; color: $sg-text-2; display: block; margin-top: 2rpx; }
.rt-pay { font-size: 21rpx; color: #d64541; font-weight: 700; display: block; margin-top: 2rpx; }
.rt-sum { margin-top: 4rpx; font-size: 21rpx; color: $sg-text-2; background: #e8f5ee; border-radius: $sg-radius; padding: 14rpx 16rpx; line-height: 1.6; }
.rt-hl { color: #d64541; font-weight: 800; font-size: 24rpx; }
.guard { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 8rpx 22rpx; }
.gd { display: flex; align-items: flex-start; padding: 14rpx 0; border-top: 2rpx solid $sg-bg; }
.gd:first-child { border-top: none; }
.gd-ic { font-size: 36rpx; margin-right: 14rpx; flex: none; }
.gd-i { flex: 1; display: flex; flex-direction: column; }
.gd-t { font-size: 24rpx; font-weight: 700; }
.gd-d { font-size: 19rpx; color: $sg-text-2; margin-top: 3rpx; line-height: 1.5; }
.links { margin: 20rpx 24rpx 0; }
.lk { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; margin-bottom: 12rpx; }
.lk-ic { width: 64rpx; height: 64rpx; border-radius: 18rpx; background: #e8f5ee; display: flex; align-items: center; justify-content: center; font-size: 34rpx; margin-right: 14rpx; flex: none; }
.lk-i { flex: 1; display: flex; flex-direction: column; }
.lk-t { font-size: 25rpx; font-weight: 700; }
.lk-d { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; }
.lk-go { font-size: 30rpx; color: $sg-text-3; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.production-empty { margin: 48rpx 24rpx; padding: 34rpx 28rpx; border: 2rpx solid #d8e7de; border-radius: 22rpx; background: #f7fbf8; }
.production-empty-title { display: block; color: #145d3c; font-size: 32rpx; font-weight: 900; }
.production-empty-text { display: block; margin-top: 16rpx; color: #5e7167; font-size: 24rpx; line-height: 1.7; }
</style>
