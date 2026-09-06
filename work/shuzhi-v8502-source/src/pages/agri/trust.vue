<script setup lang="ts">
import { ref, computed } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const productionBlocked = () => uni.showModal({
  title: "需后台农业托管服务",
  content: "正式环境的托管协议必须由后台核验土地/服务组织、作业范围、机构结算条件和授权签署后生成真实合同；当前不会在前台确认签约。",
  showCancel: false,
});

// 土地托管（农业生产托管）：不流转土地，把"耕种防收烘储"环节委托给服务组织
const ACRES = 100; // 测算基准：100 亩水稻

// 菜单式半托管：按环节点单（元/亩）
const menu = ref([
  { k: "till", n: "深耕整地", d: "大马力机械深耕 25cm+、旋耕耙平", p: 80, on: true },
  { k: "seed", n: "育秧 + 机插秧", d: "集中育秧、乘坐式插秧机、良种统供", p: 160, on: true },
  { k: "fert", n: "测土配方施肥", d: "测土出方、无人机/机械撒施", p: 60, on: true },
  { k: "spray", n: "统防统治（飞防3次）", d: "植保无人机统一防治、绿色药剂", p: 90, on: true },
  { k: "harv", n: "机械收割", d: "联合收割机、损失率<2%", p: 110, on: true },
  { k: "dry", n: "烘干", d: "低温循环烘干、不靠天晒场", p: 70, on: true },
  { k: "store", n: "仓储代管", d: "监管仓储存、可转电子粮票", p: 40, on: false },
]);
function toggle(i: number) { menu.value[i].on = !menu.value[i].on; }
const menuTotal = computed(() => menu.value.filter((m) => m.on).reduce((s, m) => s + m.p, 0));
const menuCount = computed(() => menu.value.filter((m) => m.on).length);
const FULL_PRICE = 540; // 全程托管打包价（元/亩，全 7 环节打包）
const allTotal = computed(() => menu.value.reduce((s, m) => s + m.p, 0)); // 610
const savePack = computed(() => allTotal.value - FULL_PRICE); // 打包省 70

// 服务组织（信誉不同 → 报价与保障不同，呼应"信誉分层收益"）
const orgs = [
  { k: "a", n: "供销为农服务中心", who: "县供销社直属 · 区域中心站", score: 946, star: 5, beidou: 68,
    price: 540, color: "#16884c", promise: "作业质量不达标免费返工 · 减产按保底赔付", area: "年作业 12 万亩" },
  { k: "b", n: "丰穗农机合作社", who: "本地农机专业合作社", score: 852, star: 4, beidou: 24,
    price: 505, color: "#2b6cb0", promise: "误期赔付 · 质量争议平台判责", area: "年作业 3.6 万亩" },
  { k: "c", n: "个体机手队", who: "散户机手临时组队", score: 641, star: 2, beidou: 0,
    price: 470, color: "#c0392b", promise: "无书面质量承诺 · 曾有虚报亩数记录", area: "年作业 0.4 万亩" },
];
const oi = ref(0);
const org = computed(() => orgs[oi.value]);

// 托管收益测算（100 亩水稻）：自己干 vs 全程托管
const SELF = { agri: 380, machine: 430, yieldJin: 1050, loss: 0.05, price: 1.32 };
const TRUST = { agri: 320, subsidy: 100, yieldJin: 1180, loss: 0.02, price: 1.45 };

const selfCost = computed(() => SELF.agri + SELF.machine);                       // 810 元/亩
const selfIncome = computed(() => SELF.yieldJin * (1 - SELF.loss) * SELF.price); // 1316.7
const selfNet = computed(() => selfIncome.value - selfCost.value);               // 506.7

const trustCost = computed(() => org.value.price + TRUST.agri - TRUST.subsidy);  // 托管费+农资-补贴
const trustIncome = computed(() => TRUST.yieldJin * (1 - TRUST.loss) * TRUST.price); // 1676.8
const trustNet = computed(() => trustIncome.value - trustCost.value);
const netGap = computed(() => trustNet.value - selfNet.value);
const totalGap = computed(() => netGap.value * ACRES / 10000); // 万元
const maxNet = computed(() => Math.max(selfNet.value, trustNet.value));

// 作业监管：防虚报亩数、防糊弄
const supervise = [
  { icon: "🛰️", t: "北斗农机定位", d: "农机装北斗终端，作业轨迹实时上传，亩数系统自动算，不靠人报" },
  { icon: "📐", t: "作业面积自动核实", d: "轨迹围成的实际作业面积 vs 申报亩数，超差自动预警拦截结算" },
  { icon: "📷", t: "作业质量抽验", d: "耕深/插秧密度/防治覆盖 现场抽验+照片上链，不达标免费返工" },
  { icon: "🧾", t: "农户确认验收", d: "每环节农户手机确认签收，未确认不放款给服务组织" },
  { icon: "⚖️", t: "争议判责", d: "调北斗轨迹+抽验记录+气象数据交叉核验，按责判定、保险赔付" },
];

// 托管流程
const flow = [
  { t: "农户签托管协议", d: "不流转土地、不改承包权，只委托作业环节" },
  { t: "选服务组织 + 点环节", d: "全程托管 或 菜单式点单，按亩计价、线上签约" },
  { t: "农资统配到田", d: "接农资集采：集采价直供，比散买省 60 元/亩" },
  { t: "按标准作业", d: "北斗监管、农事记录自动上链（进溯源、进认证）" },
  { t: "农户逐环节验收", d: "确认合格才结算，服务费银行监管账户托管" },
  { t: "收粮 → 以销定产", d: "接订单农业保底收购 / 存粮食银行，卖好价" },
];

function nav(url: string) { uni.navigateTo({ url }); }
function sign() {
  if (productionBuild) return productionBlocked();
  uni.showModal({
    title: "签订托管协议",
    content: `服务组织：${org.value.n}\n模式：${menuCount.value === menu.value.length ? "全程托管" : "菜单式半托管（" + menuCount.value + " 个环节）"}\n面积：${ACRES} 亩\n费用：约 ¥${(menuCount.value === menu.value.length ? FULL_PRICE : menuTotal.value) * ACRES / 10000} 万\n\n土地承包权不变、经营权不流转，仅委托作业环节；作业全程北斗监管、逐环节验收合格才结算。`,
    confirmText: "确认签约",
    success: (r) => { if (r.confirm) uni.showToast({ title: "协议已签、待首环节作业", icon: "success" }); },
  });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🚜 土地托管 · 农业社会化服务</text>
      <text class="hs">地还是你的，活我们干。不流转土地、不改承包权，只把"耕种防收烘储"委托给服务组织——解决"谁来种地"。</text>
    </view>

    <!-- 基准 -->
    <view class="basis">
      <text class="bs-t">🌾 测算基准：水稻 · {{ ACRES }} 亩</text>
      <view class="bs-chips">
        <text class="bs-chip">土地不流转</text>
        <text class="bs-chip">承包权不变</text>
        <text class="bs-chip">按亩计价</text>
      </view>
    </view>

    <!-- 菜单式点单 -->
    <view class="sec-row">
      <text class="sec">① 要托管哪些环节（点单）</text>
      <text class="cnt">{{ menuCount }}/{{ menu.length }} 项</text>
    </view>
    <view class="menu">
      <view class="mi" :class="{ on: m.on }" v-for="(m, i) in menu" :key="m.k" @tap="toggle(i)">
        <view class="mi-cb" :class="{ on: m.on }">{{ m.on ? '✓' : '' }}</view>
        <view class="mi-i"><text class="mi-n">{{ m.n }}</text><text class="mi-d">{{ m.d }}</text></view>
        <text class="mi-p" :class="{ on: m.on }">{{ m.p }}<text class="mi-u">元/亩</text></text>
      </view>
      <view class="mi-sum">
        <view class="ms-l">
          <text class="ms-k">{{ menuCount === menu.length ? '全程托管打包价' : '菜单式半托管合计' }}</text>
          <text class="ms-d" v-if="menuCount === menu.length">单点合计 {{ allTotal }} 元/亩，打包省 {{ savePack }} 元/亩</text>
          <text class="ms-d" v-else>全 {{ menu.length }} 项打包只要 {{ FULL_PRICE }} 元/亩，更划算</text>
        </view>
        <view class="ms-r">
          <text class="ms-v">¥{{ menuCount === menu.length ? FULL_PRICE : menuTotal }}</text>
          <text class="ms-u">元/亩</text>
        </view>
      </view>
    </view>

    <!-- 服务组织：信誉不同、报价与保障不同 -->
    <view class="sec">② 选服务组织（信誉≠报价≠保障）</view>
    <view class="orgs">
      <view class="og" :class="{ on: oi === i }" v-for="(o, i) in orgs" :key="o.k" @tap="oi = i"
        :style="oi === i ? { borderColor: o.color, background: '#fff' } : {}">
        <view class="og-hd">
          <view class="og-hi"><text class="og-n">{{ o.n }}</text><text class="og-w">{{ o.who }}</text></view>
          <view class="og-p"><text class="og-pv" :style="{ color: o.color }">{{ o.price }}</text><text class="og-pu">元/亩</text></view>
        </view>
        <view class="og-m">
          <text class="og-mi" :style="{ color: o.color }">信用 {{ o.score }}</text>
          <text class="og-mi" :style="{ color: o.color }">★{{ o.star }}</text>
          <text class="og-mi" :style="{ color: o.color }">北斗农机 {{ o.beidou }} 台</text>
          <text class="og-mi">{{ o.area }}</text>
        </view>
        <text class="og-pr" :class="{ bad: o.score < 700 }">{{ o.score < 700 ? '⚠️ ' : '🛡️ ' }}{{ o.promise }}</text>
      </view>
      <text class="og-note">💡 最便宜的未必最省——个体机手队报价低 70 元/亩，但无质量承诺、无北斗监管、有虚报亩数记录，减产没人赔。</text>
    </view>

    <!-- 收益测算：自己干 vs 托管 -->
    <view class="sec">③ 自己干 vs 全程托管（{{ ACRES }} 亩一季）</view>
    <view class="cmp">
      <view class="cw">
        <view class="cw-hd"><text class="cw-n">🧑‍🌾 自己干</text><text class="cw-v self">¥{{ selfNet.toFixed(0) }} 元/亩</text></view>
        <view class="cw-track"><view class="cw-fill self" :style="{ width: (selfNet / maxNet * 100) + '%' }"></view></view>
        <view class="cw-rows">
          <text class="cw-r">农资散买 {{ SELF.agri }} + 零散雇机 {{ SELF.machine }} = 成本 {{ selfCost }} 元/亩</text>
          <text class="cw-r">产量 {{ SELF.yieldJin }} 斤 × 损耗 {{ (SELF.loss*100).toFixed(0) }}% × 散卖 {{ SELF.price }} 元/斤 = 收入 {{ selfIncome.toFixed(0) }}</text>
        </view>
      </view>
      <view class="cw">
        <view class="cw-hd"><text class="cw-n">🚜 全程托管（{{ org.n }}）</text><text class="cw-v trust">¥{{ trustNet.toFixed(0) }} 元/亩</text></view>
        <view class="cw-track"><view class="cw-fill trust" :style="{ width: (trustNet / maxNet * 100) + '%' }"></view></view>
        <view class="cw-rows">
          <text class="cw-r">托管费 {{ org.price }} + 农资集采 {{ TRUST.agri }} − 政策补贴 {{ TRUST.subsidy }} = 成本 {{ trustCost }} 元/亩</text>
          <text class="cw-r">产量 {{ TRUST.yieldJin }} 斤（标准化+{{ ((TRUST.yieldJin/SELF.yieldJin-1)*100).toFixed(0) }}%）× 损耗仅 {{ (TRUST.loss*100).toFixed(0) }}%（机收烘干）× 订单价 {{ TRUST.price }} = 收入 {{ trustIncome.toFixed(0) }}</text>
        </view>
      </view>
      <view class="cmp-gap">
        托管后每亩多挣 <text class="gp-v">¥{{ netGap.toFixed(0) }}</text>，{{ ACRES }} 亩一季多挣 <text class="gp-v">¥{{ totalGap.toFixed(1) }} 万</text>
        <text class="gp-d">省下的是农资差价和零散雇机钱，多出来的是标准化增产、机收烘干减损、订单好价</text>
      </view>
    </view>

    <!-- 作业监管 -->
    <view class="sec">④ 凭什么信他真干了活（作业监管）</view>
    <view class="sup">
      <view class="sp" v-for="s in supervise" :key="s.t">
        <text class="sp-ic">{{ s.icon }}</text>
        <view class="sp-i"><text class="sp-t">{{ s.t }}</text><text class="sp-d">{{ s.d }}</text></view>
      </view>
    </view>

    <!-- 流程 -->
    <view class="sec">⑤ 托管全流程</view>
    <view class="flow">
      <view class="fl" v-for="(f, i) in flow" :key="i">
        <view class="fl-n">{{ i + 1 }}</view>
        <view class="fl-i"><text class="fl-t">{{ f.t }}</text><text class="fl-d">{{ f.d }}</text></view>
      </view>
    </view>

    <!-- 关联 -->
    <view class="links">
      <view class="lk" @tap="nav('/pages/agri/inputs')"><text class="lk-ic">🧪</text><view class="lk-i"><text class="lk-t">农资集采统配到田</text><text class="lk-d">托管用的农资走集采价，比散买省 60 元/亩</text></view><text class="lk-go">›</text></view>
      <view class="lk" @tap="nav('/pages/agri/contract')"><text class="lk-ic">📑</text><view class="lk-i"><text class="lk-t">接订单农业以销定产</text><text class="lk-d">托管种出来的粮，保底价收购不愁卖</text></view><text class="lk-go">›</text></view>
      <view class="lk" @tap="nav('/pages/finance/grainbank')"><text class="lk-ic">🌾</text><view class="lk-i"><text class="lk-t">收粮存粮食银行</text><text class="lk-d">烘干直入监管仓，换电子粮票、可锁价质押</text></view><text class="lk-go">›</text></view>
    </view>

    <view class="tip">🔗 农业生产托管是供销社为农服务的主责主业:不流转土地、不改变承包关系,把一家一户干不了、干不好、干起来不划算的环节集中起来干。作业全程北斗定位+逐环节农户验收+上链存证,既防服务组织虚报糊弄,也让农事记录自动沉淀进溯源与认证——服务组织的信誉同样可算、可比、可换钱。</view>

    <view class="bar"><view class="bar-btn" @tap="sign">签订托管协议 · 约 ¥{{ ((menuCount === menu.length ? FULL_PRICE : menuTotal) * ACRES / 10000).toFixed(1) }} 万 / {{ ACRES }} 亩</view></view>
  </view>
</template>

<style lang="scss" scoped>
.sg-page { padding-bottom: 140rpx; }
.hero { background: linear-gradient(160deg, #16884c, #0f6b3b); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.95; margin-top: 8rpx; display: block; line-height: 1.6; }
.basis { margin: 18rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx 22rpx; }
.bs-t { font-size: 26rpx; font-weight: 800; }
.bs-chips { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 10rpx; }
.bs-chip { font-size: 20rpx; color: $sg-primary; background: $sg-primary-light; padding: 4rpx 14rpx; border-radius: 999rpx; }
.sec { font-size: 28rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 28rpx; }
.cnt { font-size: 21rpx; color: $sg-text-3; }
.menu { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 8rpx 22rpx 18rpx; }
.mi { display: flex; align-items: center; padding: 16rpx 0; border-top: 2rpx solid $sg-bg; opacity: 0.5; }
.mi:first-child { border-top: none; }
.mi.on { opacity: 1; }
.mi-cb { width: 40rpx; height: 40rpx; flex: none; border-radius: 10rpx; border: 3rpx solid $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; margin-right: 14rpx; }
.mi-cb.on { background: $sg-primary; border-color: $sg-primary; }
.mi-i { flex: 1; display: flex; flex-direction: column; }
.mi-n { font-size: 25rpx; font-weight: 700; }
.mi-d { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; line-height: 1.4; }
.mi-p { font-size: 26rpx; font-weight: 800; color: $sg-text-3; flex: none; margin-left: 10rpx; }
.mi-p.on { color: $sg-primary; }
.mi-u { font-size: 17rpx; font-weight: 400; color: $sg-text-3; margin-left: 2rpx; }
.mi-sum { display: flex; align-items: center; justify-content: space-between; margin-top: 12rpx; padding: 16rpx 18rpx; background: $sg-primary-light; border-radius: $sg-radius; }
.ms-l { flex: 1; display: flex; flex-direction: column; }
.ms-k { font-size: 24rpx; font-weight: 700; }
.ms-d { font-size: 19rpx; color: $sg-text-3; margin-top: 3rpx; line-height: 1.4; }
.ms-r { display: flex; align-items: baseline; flex: none; margin-left: 10rpx; }
.ms-v { font-size: 38rpx; font-weight: 800; color: $sg-primary-deep; }
.ms-u { font-size: 18rpx; color: $sg-text-3; margin-left: 2rpx; }
.orgs { margin: 0 24rpx; }
.og { background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 20rpx; margin-bottom: 12rpx; border: 3rpx solid transparent; }
.og-hd { display: flex; align-items: flex-start; justify-content: space-between; }
.og-hi { flex: 1; display: flex; flex-direction: column; }
.og-n { font-size: 26rpx; font-weight: 800; }
.og-w { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; }
.og-p { display: flex; align-items: baseline; flex: none; }
.og-pv { font-size: 32rpx; font-weight: 800; }
.og-pu { font-size: 17rpx; color: $sg-text-3; margin-left: 2rpx; }
.og-m { display: flex; flex-wrap: wrap; gap: 8rpx; margin: 10rpx 0 8rpx; }
.og-mi { font-size: 19rpx; color: $sg-text-3; background: $sg-bg; padding: 3rpx 12rpx; border-radius: 6rpx; }
.og-pr { font-size: 19rpx; color: $sg-primary; display: block; line-height: 1.4; }
.og-pr.bad { color: #c0392b; }
.og-note { display: block; margin-top: 4rpx; font-size: 20rpx; color: $sg-text-2; background: #fff8ec; border: 2rpx solid #f0dcae; border-radius: $sg-radius; padding: 14rpx 16rpx; line-height: 1.5; }
.cmp { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx 22rpx; }
.cw { margin-bottom: 18rpx; }
.cw-hd { display: flex; align-items: baseline; justify-content: space-between; }
.cw-n { font-size: 24rpx; font-weight: 700; flex: 1; }
.cw-v { font-size: 28rpx; font-weight: 800; flex: none; margin-left: 10rpx; }
.cw-v.self { color: $sg-text-3; }
.cw-v.trust { color: $sg-primary; }
.cw-track { height: 22rpx; background: $sg-bg; border-radius: 999rpx; overflow: hidden; margin: 8rpx 0 6rpx; }
.cw-fill { height: 100%; border-radius: 999rpx; }
.cw-fill.self { background: #c2c7cf; }
.cw-fill.trust { background: linear-gradient(90deg, #2fae6b, #16884c); }
.cw-rows { display: flex; flex-direction: column; }
.cw-r { font-size: 18rpx; color: $sg-text-3; line-height: 1.6; }
.cmp-gap { margin-top: 4rpx; padding: 16rpx; background: $sg-primary-light; border-radius: $sg-radius; font-size: 23rpx; font-weight: 600; text-align: center; line-height: 1.6; }
.gp-v { color: #d64541; font-size: 30rpx; font-weight: 800; }
.gp-d { display: block; font-size: 18rpx; color: $sg-text-3; font-weight: 400; margin-top: 6rpx; }
.sup { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 8rpx 22rpx; }
.sp { display: flex; align-items: flex-start; padding: 14rpx 0; border-top: 2rpx solid $sg-bg; }
.sp:first-child { border-top: none; }
.sp-ic { font-size: 36rpx; margin-right: 14rpx; flex: none; }
.sp-i { flex: 1; display: flex; flex-direction: column; }
.sp-t { font-size: 24rpx; font-weight: 700; }
.sp-d { font-size: 19rpx; color: $sg-text-2; margin-top: 3rpx; line-height: 1.5; }
.flow { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 22rpx; }
.fl { display: flex; align-items: flex-start; padding: 12rpx 0; border-top: 2rpx solid $sg-bg; }
.fl:first-child { border-top: none; }
.fl-n { width: 40rpx; height: 40rpx; flex: none; border-radius: 50%; background: $sg-primary; color: #fff; font-size: 22rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-right: 14rpx; }
.fl-i { flex: 1; display: flex; flex-direction: column; }
.fl-t { font-size: 24rpx; font-weight: 600; }
.fl-d { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; line-height: 1.4; }
.links { margin: 20rpx 24rpx 0; }
.lk { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; margin-bottom: 12rpx; }
.lk-ic { width: 64rpx; height: 64rpx; border-radius: 18rpx; background: $sg-primary-light; display: flex; align-items: center; justify-content: center; font-size: 34rpx; margin-right: 14rpx; flex: none; }
.lk-i { flex: 1; display: flex; flex-direction: column; }
.lk-t { font-size: 25rpx; font-weight: 700; }
.lk-d { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; }
.lk-go { font-size: 30rpx; color: $sg-text-3; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom)); box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.06); }
.bar-btn { text-align: center; padding: 22rpx 0; border-radius: 999rpx; font-size: 26rpx; font-weight: 700; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; }
</style>
