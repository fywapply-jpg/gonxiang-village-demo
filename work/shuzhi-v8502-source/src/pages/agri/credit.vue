<script setup lang="ts">
import { ref, computed } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const productionBlocked = () => uni.showModal({
  title: "需后台信用服务",
  content: "正式环境的信用扣分、背书资格和白名单变化必须由后台基于真实履约证据、授权岗位和审计记录计算；当前页面不会修改本地信用结果。",
  showCancel: false,
});

// 白名单准入流程
const flow = [
  { t: "农户建档", d: "农户提交身份、地块、种植品类" },
  { t: "村支书推荐签字", d: "村党支部书记线上审核、书面推荐" },
  { t: "供销复核", d: "县联社复核资质与信用" },
  { t: "纳入白名单", d: "通过后进入供应白名单" },
  { t: "可签保底订单 / 授信", d: "白名单方可创建保底收购订单、申请授信" },
];

// 评分规则
const rules = {
  base: 60,
  add: ["每完成 1 笔合格供货 +2 分", "连续 3 个月无违约 +5 分", "年度加分上限 20 分"],
  deduct: ["品控不合格 1 次 −5 分", "供货违约 1 次 −10 分", "私自外销违约 −20 分"],
};
function gradeOf(s: number) { return s >= 80 ? "A" : s >= 60 ? "B" : "C"; }
const gradeColor: Record<string, string> = { A: "#16884c", B: "#d99a2b", C: "#d64541" };

// 本村农户信用（村支书视角）
const farmers = ref([
  { name: "张有粮", land: 32, score: 88, deliv: 42, breach: 0, add: 28, deduct: 0 },
  { name: "李丰收", land: 18, score: 76, deliv: 24, breach: 0, add: 18, deduct: 2 },
  { name: "赵满仓", land: 25, score: 82, deliv: 35, breach: 0, add: 24, deduct: 2 },
  { name: "王二发", land: 12, score: 55, deliv: 8, breach: 2, add: 10, deduct: 25 },
]);
const villageAvg = computed(() => Math.round(farmers.value.reduce((s, f) => s + f.score, 0) / farmers.value.length));
const villageDown = computed(() => villageAvg.value < 50);

// —— 背书人连带问责（背书评级与客户评价背离 → 背书人信用受损、可失格）——
const endorser = ref({ name: "李国强", role: "江西省赣州市信丰县安西镇范庄村党支部书记", score: 82, endorsed: 84, consistent: 83 });
const endorseGrade = computed(() => {
  const s = endorser.value.score;
  if (s >= 80) return { g: "A", status: "背书资格正常", d: "可自主为农户背书评级", c: "#16884c" };
  if (s >= 60) return { g: "B", status: "背书受限", d: "背书须报县联社复核后生效", c: "#d99a2b" };
  return { g: "C", status: "背书资格已暂停", d: "取消背书人地位，不得再为他人背书", c: "#d64541" };
});
const deviation = computed(() => endorser.value.endorsed - endorser.value.consistent);
// 背书偏差案例（背书评级与客户实际评价/履约背离）
const devCase = { farmer: "王二发", endorsed: "B（可信）", actual: "C · 品控不合格 + 违约 2 次", deduct: 9 };
// 风险核验：所背书对象再次违约 → 背书人连带扣分、可能失格
function simDeviation() {
  if (productionBuild) return productionBlocked();
  uni.showModal({
    title: "背书对象违约 · 连带问责", confirmText: "确认扣分",
    content: `你背书的农户再次出现违约/品控不合格。\n按连带问责规则，背书人「${endorser.value.name}」信用扣 12 分。\n若信用跌破 60 分，将暂停背书资格、取消背书人地位。`,
    success: (r) => {
      if (!r.confirm) return;
      endorser.value.score = Math.max(0, endorser.value.score - 12);
      endorser.value.consistent = Math.max(0, endorser.value.consistent - 1);
      const g = endorseGrade.value.g;
      uni.showToast({ title: g === "C" ? "背书资格已暂停" : "已连带扣分", icon: g === "C" ? "none" : "success" });
    },
  });
}

function detail(f: any) {
  const g = gradeOf(f.score);
  uni.showModal({ title: `${f.name} · 信用档案`, showCancel: false, confirmText: "知道了",
    content: `地块 ${f.land} 亩 · 累计合格供货 ${f.deliv} 笔 · 违约 ${f.breach} 次\n基础分 ${rules.base} + 加分 ${f.add} − 扣分 ${f.deduct} = ${f.score} 分\n等级 ${g}｜${g === "C" ? "灰名单：禁授信、禁保底订单" : g === "A" ? "白名单 · 授信上浮、优先撮合" : "白名单 · 标准授信"}` });
}
function recommend() { uni.navigateTo({ url: "/pages/register/faceauth?scene=admin" }); }
function partyEndorse() { uni.navigateTo({ url: "/pages/party/endorse" }); }
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🚩 村支书信用背书 · 白名单准入</text>
      <text class="hs">村党支部书面推荐 + 供销复核 · 数智供社 B2B 生产端</text>
      <view class="kpis">
        <view class="k"><text class="kn">{{ farmers.length }}</text><text class="kl">在册农户</text></view>
        <view class="k"><text class="kn">{{ villageAvg }}</text><text class="kl">全村均分</text></view>
        <view class="k"><text class="kn">{{ farmers.filter(f => f.score >= 60).length }}</text><text class="kl">白名单</text></view>
      </view>
    </view>

    <view class="party-entry" @tap="partyEndorse">
      <text class="pe-ic">🚩</text>
      <view class="pe-i"><text class="pe-t">党组织信用背书体系（村/社区/企事业单位）</text><text class="pe-s">三类党支部背书 · 社会贡献值 · 考核奖惩 · 红黑榜</text></view>
      <text class="pe-go">进入 ›</text>
    </view>

    <!-- 白名单准入流程 -->
    <view class="sec">白名单准入流程</view>
    <view class="sg-card">
      <view class="fl" v-for="(f, i) in flow" :key="i">
        <view class="fl-axis"><view class="fl-dot">{{ i + 1 }}</view><view v-if="i < flow.length - 1" class="fl-line"></view></view>
        <view class="fl-i"><text class="fl-t">{{ f.t }}</text><text class="fl-d">{{ f.d }}</text></view>
      </view>
      <view class="gate-note">🔒 非白名单农户无法创建保底收购订单、无法申请授信。</view>
    </view>

    <!-- 评分规则 -->
    <view class="sec">信用评分规则</view>
    <view class="sg-card">
      <view class="rule-base">基础分 <text class="rb">{{ rules.base }}</text>（获村支书推荐且无失信）</view>
      <view class="rule-cols">
        <view class="rc add">
          <text class="rc-t">＋ 加分项</text>
          <text class="rc-i" v-for="a in rules.add" :key="a">{{ a }}</text>
        </view>
        <view class="rc ded">
          <text class="rc-t">− 扣分项</text>
          <text class="rc-i" v-for="d in rules.deduct" :key="d">{{ d }}</text>
        </view>
      </view>
      <view class="grades">
        <text class="gd a">A ≥ 80</text><text class="gd b">B 60–79</text><text class="gd c">C &lt; 60 灰名单</text>
      </view>
    </view>

    <!-- 农户信用列表 -->
    <view class="sec">本村农户信用（点开看明细）</view>
    <view class="farmer" v-for="f in farmers" :key="f.name" @tap="detail(f)">
      <view class="fm-l">
        <view class="fm-grade" :style="{ background: gradeColor[gradeOf(f.score)] }">{{ gradeOf(f.score) }}</view>
        <view class="fm-i"><text class="fm-n">{{ f.name }}</text><text class="fm-m">{{ f.land }} 亩 · 供货 {{ f.deliv }} 笔 · 违约 {{ f.breach }}</text></view>
      </view>
      <view class="fm-r">
        <text class="fm-score">{{ f.score }}</text>
        <text class="fm-wl" :class="{ off: f.score < 60 }">{{ f.score < 60 ? '灰名单' : '白名单' }}</text>
      </view>
    </view>

    <!-- 村集体联动 -->
    <view class="collective" :class="{ warn: villageDown }">
      <text class="cl-t">🏘️ 村集体联动</text>
      <text class="cl-s">全村平均 {{ villageAvg }} 分。{{ villageDown ? '低于 50 分：村集体整体评分下调 10 分，全村授信额度同步下调。' : '高于 50 分：村集体信用良好，维持全村授信额度。' }}</text>
    </view>

    <!-- 背书人连带问责 -->
    <view class="sec">背书人连带问责（背书失准 → 背书人失格）</view>
    <view class="endorser" :style="{ borderColor: endorseGrade.c }">
      <view class="en-top">
        <view class="en-l">
          <text class="en-n">{{ endorser.name }}</text>
          <text class="en-r">{{ endorser.role }} · 背书人</text>
        </view>
        <view class="en-score">
          <text class="ens-n" :style="{ color: endorseGrade.c }">{{ endorser.score }}</text>
          <text class="ens-g" :style="{ background: endorseGrade.c }">{{ endorseGrade.g }} 级</text>
        </view>
      </view>
      <view class="en-status" :style="{ background: endorseGrade.c + '18', color: endorseGrade.c }">
        {{ endorseGrade.g === 'C' ? '⛔' : endorseGrade.g === 'B' ? '⚠️' : '✅' }} 背书资格：{{ endorseGrade.status }} · {{ endorseGrade.d }}
      </view>
      <view class="en-cons">
        <view class="ec"><text class="ec-n">{{ endorser.endorsed }}</text><text class="ec-l">已背书</text></view>
        <view class="ec"><text class="ec-n" style="color:#16884c">{{ endorser.consistent }}</text><text class="ec-l">评级一致</text></view>
        <view class="ec"><text class="ec-n" style="color:#d64541">{{ deviation }}</text><text class="ec-l">背书偏差</text></view>
      </view>
    </view>

    <!-- 偏差案例 -->
    <view class="devcase">
      <text class="dc-t">🔎 背书偏差案例</text>
      <text class="dc-r">背书对象「{{ devCase.farmer }}」：背书评级 <text class="dc-e">{{ devCase.endorsed }}</text>，实际 <text class="dc-a">{{ devCase.actual }}</text></text>
      <text class="dc-r">→ 背书评级与客户评价/履约<text class="dc-bad">严重背离</text>，背书人连带扣 {{ devCase.deduct }} 分。</text>
    </view>

    <!-- 失格三档 -->
    <view class="disq">
      <text class="dq-t">背书资格问责三档</text>
      <view class="dq-row"><text class="dq-g a">A ≥ 80</text><text class="dq-d">背书资格正常，可自主背书</text></view>
      <view class="dq-row"><text class="dq-g b">B 60–79</text><text class="dq-d">背书受限，须报县联社复核</text></view>
      <view class="dq-row"><text class="dq-g c">C &lt; 60</text><text class="dq-d">暂停背书资格、取消背书人地位</text></view>
    </view>

    <view class="sim-btn" @tap="simDeviation">风险核验：所背书农户再次违约（连带扣分）</view>

    <view class="rec-btn" @tap="recommend">🚩 村支书推荐农户入白名单（需人脸核验）</view>
    <view class="tip">🔗 信用评分自动重算、等级变动同步触发订单/金融权限；C 级自动进灰名单、禁授信与保底订单；评分、推荐、失信全程上链。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #c0392b, #922b21); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 32rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; }
.kpis { display: flex; margin-top: 20rpx; }
.k { flex: 1; text-align: center; }
.kn { font-size: 34rpx; font-weight: 800; display: block; }
.kl { font-size: 19rpx; opacity: 0.9; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.party-entry { display: flex; align-items: center; margin: 20rpx 24rpx 0; padding: 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #c0392b, #922b21); box-shadow: 0 8rpx 20rpx rgba(192,57,43,0.28); }
.pe-ic { font-size: 42rpx; margin-right: 14rpx; }
.pe-i { flex: 1; display: flex; flex-direction: column; }
.pe-t { font-size: 25rpx; font-weight: 800; color: #fff; }
.pe-s { font-size: 18rpx; color: rgba(255,255,255,0.85); margin-top: 4rpx; line-height: 1.4; }
.pe-go { font-size: 23rpx; color: #fff; background: rgba(255,255,255,0.2); padding: 8rpx 18rpx; border-radius: 999rpx; }
.sg-card { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.fl { display: flex; }
.fl-axis { display: flex; flex-direction: column; align-items: center; margin-right: 18rpx; }
.fl-dot { width: 44rpx; height: 44rpx; border-radius: 50%; background: #c0392b; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 700; }
.fl-line { flex: 1; width: 4rpx; background: #f3c9c5; min-height: 20rpx; margin: 4rpx 0; }
.fl-i { flex: 1; display: flex; flex-direction: column; padding-bottom: 20rpx; }
.fl-t { font-size: 25rpx; font-weight: 600; }
.fl-d { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }
.gate-note { font-size: 21rpx; color: #c0392b; background: #fdeceb; padding: 12rpx 16rpx; border-radius: $sg-radius; margin-top: 6rpx; }
.rule-base { font-size: 24rpx; padding-bottom: 14rpx; border-bottom: 2rpx solid $sg-bg; }
.rb { font-size: 30rpx; font-weight: 800; color: $sg-primary; }
.rule-cols { display: flex; gap: 16rpx; margin: 14rpx 0; }
.rc { flex: 1; border-radius: $sg-radius; padding: 14rpx; }
.rc.add { background: $sg-primary-light; }
.rc.ded { background: #fdeceb; }
.rc-t { font-size: 23rpx; font-weight: 700; display: block; margin-bottom: 6rpx; }
.rc.add .rc-t { color: $sg-primary-deep; }
.rc.ded .rc-t { color: #c0392b; }
.rc-i { font-size: 19rpx; color: $sg-text-2; display: block; margin: 4rpx 0; line-height: 1.4; }
.grades { display: flex; gap: 12rpx; }
.gd { flex: 1; text-align: center; font-size: 21rpx; font-weight: 700; padding: 10rpx 0; border-radius: $sg-radius; color: #fff; }
.gd.a { background: #16884c; } .gd.b { background: #d99a2b; } .gd.c { background: #d64541; }
.farmer { display: flex; align-items: center; justify-content: space-between; margin: 0 24rpx 12rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; }
.fm-l { display: flex; align-items: center; }
.fm-grade { width: 56rpx; height: 56rpx; border-radius: 16rpx; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 800; margin-right: 16rpx; }
.fm-i { display: flex; flex-direction: column; }
.fm-n { font-size: 27rpx; font-weight: 700; }
.fm-m { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.fm-r { text-align: right; display: flex; flex-direction: column; align-items: flex-end; }
.fm-score { font-size: 32rpx; font-weight: 800; color: $sg-primary-deep; }
.fm-wl { font-size: 19rpx; color: #fff; background: $sg-primary; padding: 2rpx 12rpx; border-radius: 6rpx; margin-top: 4rpx; }
.fm-wl.off { background: $sg-red; }
.collective { margin: 16rpx 24rpx 0; background: $sg-primary-light; border-radius: $sg-radius-lg; padding: 20rpx; }
.collective.warn { background: #fdeceb; }
.cl-t { font-size: 25rpx; font-weight: 800; color: $sg-primary-deep; }
.collective.warn .cl-t { color: #c0392b; }
.cl-s { font-size: 21rpx; color: $sg-text-2; margin-top: 8rpx; display: block; line-height: 1.6; }
.endorser { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; border: 3rpx solid; }
.en-top { display: flex; align-items: center; justify-content: space-between; }
.en-l { display: flex; flex-direction: column; }
.en-n { font-size: 28rpx; font-weight: 800; }
.en-r { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.en-score { display: flex; align-items: center; gap: 10rpx; }
.ens-n { font-size: 44rpx; font-weight: 800; }
.ens-g { font-size: 20rpx; color: #fff; padding: 4rpx 14rpx; border-radius: 999rpx; font-weight: 700; }
.en-status { margin: 14rpx 0; padding: 12rpx 16rpx; border-radius: $sg-radius; font-size: 21rpx; font-weight: 600; line-height: 1.5; }
.en-cons { display: flex; border-top: 2rpx solid $sg-bg; padding-top: 14rpx; }
.ec { flex: 1; text-align: center; }
.ec-n { font-size: 32rpx; font-weight: 800; display: block; }
.ec-l { font-size: 19rpx; color: $sg-text-3; }
.devcase { margin: 16rpx 24rpx 0; background: #fdeceb; border-radius: $sg-radius-lg; padding: 18rpx 20rpx; }
.dc-t { font-size: 23rpx; font-weight: 800; color: #c0392b; display: block; margin-bottom: 8rpx; }
.dc-r { font-size: 21rpx; color: $sg-text-2; display: block; margin: 4rpx 0; line-height: 1.5; }
.dc-e { color: $sg-gold; font-weight: 700; }
.dc-a { color: #c0392b; font-weight: 700; }
.dc-bad { color: #c0392b; font-weight: 800; }
.disq { margin: 16rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; }
.dq-t { font-size: 24rpx; font-weight: 700; display: block; margin-bottom: 12rpx; }
.dq-row { display: flex; align-items: center; padding: 8rpx 0; }
.dq-g { flex: none; width: 130rpx; text-align: center; font-size: 20rpx; font-weight: 700; color: #fff; padding: 6rpx 0; border-radius: $sg-radius; margin-right: 14rpx; }
.dq-g.a { background: #16884c; } .dq-g.b { background: #d99a2b; } .dq-g.c { background: #d64541; }
.dq-d { font-size: 21rpx; color: $sg-text-2; }
.sim-btn { margin: 16rpx 24rpx 0; text-align: center; padding: 22rpx 0; border-radius: 999rpx; background: #fff; border: 2rpx solid #c0392b; color: #c0392b; font-size: 24rpx; font-weight: 700; }
.rec-btn { margin: 20rpx 24rpx 0; text-align: center; padding: 26rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #c0392b, #922b21); color: #fff; font-size: 26rpx; font-weight: 700; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
</style>
