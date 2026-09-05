<script setup lang="ts">
import { ref, computed } from "vue";
import { recordPlatformEvent } from "@/services/localApi";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const productionBlocked = (action: string) => uni.showModal({ title: "需后台核验后执行", content: `正式环境${action}必须由后台写入真实养殖档案，并校验主体、兽医/检测机构和官方检疫证据；当前未执行本地状态变更。`, showCancel: false });

// 多品类养殖切换
const kinds = [
  { key: "pig", name: "生猪运行台", emoji: "🐖", unit: "头", farm: "牧原代养 · 信丰养殖基地" },
  { key: "cattle", name: "牛类项目", emoji: "🐂", unit: "头", farm: "分品类项目模板" },
  { key: "sheep", name: "羊类项目", emoji: "🐑", unit: "只", farm: "分品类项目模板" },
  { key: "poultry", name: "禽类项目", emoji: "🐔", unit: "羽", farm: "分品类项目模板" },
  { key: "other", name: "兔蜂等", emoji: "🐇", unit: "批", farm: "分品类项目模板" },
  { key: "fresh", name: "淡水养殖", emoji: "🐟", unit: "批", farm: "分品类项目模板" },
  { key: "marine", name: "海水养殖", emoji: "🦐", unit: "批", farm: "分品类项目模板" },
  { key: "special", name: "许可特种", emoji: "🦌", unit: "批", farm: "分品类项目模板" },
];
const ki = ref(0);
const kind = computed(() => kinds[ki.value]);

// 养殖场概况（以生猪为样本值）
const stock = { in: 320, out: 168, alive: 152, tagged: "100%" };

// 环控 IoT（猪舍环境，区别于种植的土壤墒情）
const sensors = [
  { icon: "🌡️", name: "舍内温度", val: "22.4", unit: "℃", ok: true },
  { icon: "💧", name: "湿度", val: "65", unit: "%", ok: true },
  { icon: "🫧", name: "氨气 NH₃", val: "12", unit: "ppm", ok: true },
  { icon: "🌫️", name: "CO₂", val: "1100", unit: "ppm", ok: true },
  { icon: "💨", name: "风速", val: "0.3", unit: "m/s", ok: true },
  { icon: "🔋", name: "水料线", val: "正常", unit: "", ok: true },
];

// 生长阶段
const stages = [
  { name: "引种建档", done: true }, { name: "保育", done: true },
  { name: "育肥", done: false, cur: true }, { name: "出栏检疫", done: false }, { name: "定点屠宰", done: false },
];

// 防疫免疫档案（养殖溯源核心）
const immune = ref([
  { t: "猪瘟疫苗", date: "05-16", batch: "CSF-2609", vet: "官方兽医·王", done: true },
  { t: "口蹄疫疫苗", date: "06-02", batch: "FMD-2614", vet: "官方兽医·王", done: true },
  { t: "蓝耳病疫苗", date: "06-20", batch: "PRRS-2621", vet: "官方兽医·李", done: true },
  { t: "非洲猪瘟检测", date: "10-28", batch: "ASF-抽检", vet: "县动检中心", done: false, cur: true },
]);
function checkImmune(v: any) {
  if (v.done) return;
  if (productionBuild) return productionBlocked("免疫记录归档");
  uni.showModal({ title: "防疫记录归档", content: `确认完成「${v.t}」并上传免疫人员、兽医或检测机构形成的真实记录？该记录进入养殖档案，供后续检疫申报核验，但不能替代官方检疫证明。`,
    confirmText: "完成并上链", success: (r) => { if (r.confirm) { v.done = true; v.cur = false; void recordPlatformEvent("digitalfarm", "ARCHIVE_IMMUNIZATION", { item: v.t }).catch(() => {}); uni.showToast({ title: "已上链存证", icon: "success" }); } } });
}

// 饲料 + 兽药休药期（硬闸：休药期满才能出栏）
const feedLog = [
  { date: "10-20", act: "无抗育肥料", detail: "批次 FD-1102 · 统配直供 · 无违禁添加" },
  { date: "10-15", act: "拌料兽药（治疗）", detail: "泰妙菌素 · 休药期 7 天" },
];
const withdrawDays = ref(3); // 兽药休药期剩余天数（>0 不得出栏）
const canSlaughter = computed(() => withdrawDays.value <= 0);

// AI 疫病预警
const alerts = [
  { icon: "🦠", t: "非洲猪瘟区域预警", d: "邻县发现疫点，加强消毒与检测", level: "中", color: "#d99a2b" },
  { icon: "🍽️", t: "3 号栏采食量下降 8%", d: "AI 行为监测异常，建议巡查", level: "中", color: "#d99a2b" },
];

// 无害化处理
const harmless = { count: 2, place: "县病死畜无害化处理中心", note: "收集-暂存-联单-集中处理全程留痕，保险联动补贴" };

// 出栏合规检查（交互）
const checkResult = ref<"" | "pass" | "block">("");
function applySlaughter() {
  if (productionBuild) return productionBlocked("出栏检疫申请");
  void recordPlatformEvent("digitalfarm", "APPLY_QUARANTINE", { kind: kind.value.key, withdraw_days: withdrawDays.value }).catch(() => {});
  // 检查：休药期满 + 非瘟阴性
  const asfPass = immune.value.find((i) => i.t.includes("非洲猪瘟"))?.done;
  if (!canSlaughter.value) { checkResult.value = "block"; return; }
  if (!asfPass) { checkResult.value = "block"; return; }
  checkResult.value = "pass";
}
function passWithdraw() {
  if (productionBuild) return productionBlocked("休药期复核登记");
  checkResult.value = "";
  void recordPlatformEvent("digitalfarm", "REGISTER_WITHDRAWAL_REVIEW", { days: withdrawDays.value }).catch(() => {});
  uni.showToast({ title: "已登记复核申请", icon: "none" });
}

function toTrace() { uni.navigateTo({ url: "/pages/trace/fullchain?type=meat" }); }
function toContract() { uni.navigateTo({ url: "/pages/agri/contract" }); }
function toDispatch() { uni.navigateTo({ url: "/pages/logistics/dispatch" }); }
function toPlant() { uni.navigateTo({ url: "/pages/digitalfarm/index" }); }
function startProject() { uni.navigateTo({ url: "/pages/digitalfarm/project?type=livestock" }); }
function toResources() { uni.navigateTo({ url: "/pages/digitalfarm/resources" }); }
function selectKind(i: number) {
  if (i === 0) { ki.value = 0; return; }
  uni.navigateTo({ url: "/pages/digitalfarm/project?type=livestock" });
}
function chain() { uni.showModal({ title: "养殖数据上链", showCancel: false, confirmText: "已验真",
  content: "耳标建档、免疫记录、环控数据、兽药休药和屠宰加工记录形成可核验的电子证据链，用于辅助追溯；不能替代官方兽医依法实施的动物检疫和检疫证明。" }); }
</script>

<template>
  <view class="sg-page">
    <view class="hd">
      <text class="hd-t">🐖 数字养殖项目运营台</text>
      <text class="hd-s">{{ kind.name }} · 一畜一码 · 全程防疫溯源</text>
      <text class="hd-p">📍 {{ kind.farm }} · 电子耳标覆盖 {{ stock.tagged }}</text>
    </view>

    <view class="project-start" @tap="startProject">
      <view class="ps-icon">🚀</view>
      <view class="ps-main"><text class="ps-title">我是养殖户 · 开始一个新项目</text><text class="ps-sub">覆盖畜禽、水产、蜂兔及许可特种养殖，10道管控逐关验收</text></view>
      <text class="ps-go">开始 ›</text>
    </view>

    <view class="resource-link" @tap="toResources">
      <text class="rl-icon">🗺️</text>
      <view class="rl-main"><text class="rl-title">先核实区域养殖设施与真实产能</text><text class="rl-sub">场户、圈舍/水面、设计规模、同日存栏、防疫环保和可出栏计划</text></view>
      <text class="rl-go">›</text>
    </view>

    <!-- 品类切换 -->
    <scroll-view scroll-x class="kinds">
      <view v-for="(k, i) in kinds" :key="k.key" class="kd" :class="{ on: ki === i }" @tap="selectKind(i)">
        <text class="kd-e">{{ k.emoji }}</text><text class="kd-n">{{ k.name }}</text>
      </view>
    </scroll-view>

    <!-- 公司+农户 订单代养 -->
    <view class="contract-lk" @tap="toContract">
      <text class="cl-ic">🤝</text>
      <view class="cl-i"><text class="cl-t">订单养殖 · "公司+农户"代养保收</text><text class="cl-d">公司供仔猪+饲料+兽药+技术，农户代养，保底回收——以养定销</text></view>
      <text class="cl-go">›</text>
    </view>

    <!-- 存栏概况 -->
    <view class="stat">
      <view class="st"><text class="st-v">{{ stock.in }}</text><text class="st-l">引栏（{{ kind.unit }}）</text></view>
      <view class="st"><text class="st-v">{{ stock.alive }}</text><text class="st-l">在栏</text></view>
      <view class="st"><text class="st-v">{{ stock.out }}</text><text class="st-l">已出栏</text></view>
      <view class="st"><text class="st-v hl">{{ stock.tagged }}</text><text class="st-l">耳标建档</text></view>
    </view>

    <view class="cam" @tap="chain">
      <text class="cam-ic">📹</text><text class="cam-t">畜舍高清监控 · AI 行为分析</text><text class="cam-live">● 监控中</text>
    </view>

    <!-- 环控 IoT -->
    <view class="sg-card">
      <view class="sg-between"><text class="ct">🛰️ 畜舍环控实时监测</text><text class="upd">5 分钟前更新</text></view>
      <view class="sensors">
        <view class="sensor" v-for="s in sensors" :key="s.name">
          <text class="s-ic">{{ s.icon }}</text>
          <text class="s-v">{{ s.val }}<text class="s-u">{{ s.unit }}</text></text>
          <text class="s-n">{{ s.name }}</text>
        </view>
      </view>
    </view>

    <!-- 生长阶段 -->
    <view class="sg-card">
      <text class="ct">🐷 养殖阶段</text>
      <view class="stages">
        <view class="stg" v-for="(s, i) in stages" :key="i">
          <view class="stg-dot" :class="{ on: s.done, cur: s.cur }">{{ s.done ? '✓' : (s.cur ? '●' : '') }}</view>
          <text class="stg-n" :class="{ on: s.done || s.cur }">{{ s.name }}</text>
          <view v-if="i < stages.length - 1" class="stg-line" :class="{ on: s.done }"></view>
        </view>
      </view>
    </view>

    <!-- 防疫免疫档案 -->
    <view class="sg-card">
      <view class="sg-between"><text class="ct">💉 防疫免疫档案</text><text class="upd">真实记录归档 · 供检疫核验</text></view>
      <view class="imm" v-for="(v, i) in immune" :key="i" @tap="checkImmune(v)">
        <view class="im-dot" :class="{ done: v.done, cur: v.cur }">{{ v.done ? '✓' : (v.cur ? '●' : '') }}</view>
        <view class="im-i"><text class="im-t" :class="{ done: v.done }">{{ v.t }}</text><text class="im-m">{{ v.date }} · 批次 {{ v.batch }} · {{ v.vet }}</text></view>
        <text class="im-st" :class="{ done: v.done, cur: v.cur }">{{ v.done ? '已完成' : (v.cur ? '去打卡' : '待办') }}</text>
      </view>
    </view>

    <!-- 饲料 + 兽药休药期 -->
    <view class="sg-card">
      <text class="ct">🌽 饲料 + 兽药休药档案</text>
      <view class="feed" v-for="(f, i) in feedLog" :key="i">
        <text class="fd-date">{{ f.date }}</text>
        <view class="fd-i"><text class="fd-act">{{ f.act }}</text><text class="fd-detail">{{ f.detail }}</text></view>
      </view>
      <view class="withdraw" :class="{ ok: canSlaughter }">
        <text class="wd-ic">{{ canSlaughter ? '✅' : '⏳' }}</text>
        <view class="wd-i">
          <text class="wd-t">兽药休药期{{ canSlaughter ? '已满' : '未满' }}</text>
          <text class="wd-d">{{ canSlaughter ? '药物残留达标，允许申请出栏' : `还剩 ${withdrawDays} 天，休药期内严禁出栏上市` }}</text>
        </view>
        <text v-if="!canSlaughter" class="wd-btn" @tap="passWithdraw">登记复核</text>
      </view>
    </view>

    <!-- 出栏合规硬闸 -->
    <view class="sg-card gate-card">
      <text class="ct">📋 出栏准宰合规检查</text>
      <text class="gate-sub">出栏前系统硬性核验：休药期满 + 免疫齐全 + 非洲猪瘟阴性 + 耳标核对，任一不过即拦截。</text>
      <view class="gate-btn" @tap="applySlaughter">▶ 申请出栏检疫</view>
      <view v-if="checkResult === 'pass'" class="gate-r pass">
        ✅ 平台预检通过：休药期满、免疫档案齐全、适用检测完成、耳标一致 → 已生成检疫申报材料。须由官方兽医依法实施检疫，检疫合格并出证后方可出栏。
      </view>
      <view v-if="checkResult === 'block'" class="gate-r block">
        ⛔ 拦截：{{ !canSlaughter ? `兽药休药期未满（剩 ${withdrawDays} 天）` : '非洲猪瘟检测未完成' }} → 不予出栏，生成整改工单，杜绝问题肉流入市场。
      </view>
    </view>

    <!-- AI 疫病预警 -->
    <view class="sg-card">
      <text class="ct">⚠️ AI 疫病预警</text>
      <view class="alert" v-for="a in alerts" :key="a.t">
        <text class="al-ic">{{ a.icon }}</text>
        <view class="al-i"><text class="al-t">{{ a.t }}</text><text class="al-d">{{ a.d }}</text></view>
        <text class="al-lv" :style="{ background: a.color }">{{ a.level }}风险</text>
      </view>
    </view>

    <!-- 无害化处理 -->
    <view class="harmless">
      <text class="hm-ic">♻️</text>
      <view class="hm-i"><text class="hm-t">病死畜无害化处理 · {{ harmless.count }} 头（本月）</text><text class="hm-d">{{ harmless.place }} · {{ harmless.note }}</text></view>
    </view>

    <!-- 关联入口 -->
    <view class="links">
      <view class="lk feat" @tap="toTrace"><text class="lk-ic blue">🔍</text><view class="lk-i"><text class="lk-t">查看肉品全链路溯源（动物源）</text><text class="lk-d">养殖→防疫→检疫→定点屠宰→冷链→小端，一码溯全程</text></view><text class="lk-go">›</text></view>
      <view class="lk" @tap="toDispatch"><text class="lk-ic">🚚</text><view class="lk-i"><text class="lk-t">冷鲜分割 · 冷链配送</text><text class="lk-d">白条排酸 · 0~4℃ 冷链到店</text></view><text class="lk-go">›</text></view>
      <view class="lk" @tap="toPlant"><text class="lk-ic">🌾</text><view class="lk-i"><text class="lk-t">切换到数字种植项目运营台</text><text class="lk-d">种植项目发起 · 农事管控 · 分阶段验收 · 产地准出</text></view><text class="lk-go">›</text></view>
    </view>

    <view class="chain-btn" @tap="chain">🔗 养殖数据已上链存证 · 点击验真</view>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, #b5563c, #8f3d28); padding: 36rpx 28rpx; color: #fff; }
.hd-t { font-size: 34rpx; font-weight: 800; }
.hd-s { font-size: 24rpx; opacity: 0.95; margin-top: 8rpx; display: block; }
.hd-p { font-size: 21rpx; opacity: 0.8; margin-top: 6rpx; display: block; }
.project-start { display: flex; align-items: center; gap: 14rpx; margin: 18rpx 24rpx 0; padding: 20rpx; border: 2rpx solid #efc7b9; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #fff1ec, #fff); box-shadow: $sg-shadow; }
.ps-icon { flex: none; width: 62rpx; height: 62rpx; display: flex; align-items: center; justify-content: center; border-radius: 18rpx; color: #fff; background: #a74730; font-size: 33rpx; }
.ps-main { flex: 1; display: flex; flex-direction: column; }
.ps-title { color: #8f3d28; font-size: 25rpx; font-weight: 800; }
.ps-sub { margin-top: 4rpx; color: $sg-text-3; font-size: 19rpx; line-height: 1.45; }
.ps-go { color: #a74730; font-size: 23rpx; font-weight: 800; white-space: nowrap; }
.resource-link { display: flex; align-items: center; gap: 14rpx; margin: 14rpx 24rpx 0; padding: 18rpx 20rpx; border: 2rpx solid #ead8ae; border-radius: $sg-radius-lg; background: #fff9ec; }
.rl-icon { font-size: 34rpx; }
.rl-main { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.rl-title { color: #775317; font-size: 23rpx; font-weight: 800; }
.rl-sub { margin-top: 3rpx; color: $sg-text-3; font-size: 18rpx; line-height: 1.4; }
.rl-go { color: #a97724; font-size: 30rpx; }
.kinds { white-space: nowrap; padding: 20rpx 24rpx 0; }
.kd { display: inline-flex; flex-direction: column; align-items: center; padding: 12rpx 26rpx; background: #fff; border-radius: $sg-radius; margin-right: 14rpx; box-shadow: $sg-shadow; border: 3rpx solid transparent; }
.kd.on { border-color: #b5563c; background: #fbeee9; }
.kd-e { font-size: 40rpx; }
.kd-n { font-size: 21rpx; margin-top: 4rpx; color: $sg-text-2; }
.contract-lk { display: flex; align-items: center; margin: 20rpx 24rpx 0; padding: 22rpx; background: linear-gradient(135deg, #fff8ec, #fff); border: 2rpx solid #f0e0c0; border-radius: $sg-radius-lg; }
.cl-ic { width: 68rpx; height: 68rpx; border-radius: 20rpx; background: $sg-gold-light; display: flex; align-items: center; justify-content: center; font-size: 36rpx; margin-right: 16rpx; }
.cl-i { flex: 1; display: flex; flex-direction: column; }
.cl-t { font-size: 25rpx; font-weight: 700; }
.cl-d { font-size: 19rpx; color: $sg-text-3; margin-top: 3rpx; line-height: 1.4; }
.cl-go { font-size: 32rpx; color: $sg-text-3; }
.stat { display: flex; margin: 16rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx 0; }
.st { flex: 1; display: flex; flex-direction: column; align-items: center; }
.st-v { font-size: 34rpx; font-weight: 800; color: #b5563c; }
.st-v.hl { color: #16884c; }
.st-l { font-size: 19rpx; color: $sg-text-3; margin-top: 4rpx; }
.cam { margin: 16rpx 24rpx 0; height: 180rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #1e293b, #334155); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; position: relative; }
.cam-ic { font-size: 56rpx; }
.cam-t { font-size: 23rpx; opacity: 0.9; margin-top: 8rpx; }
.cam-live { position: absolute; top: 20rpx; right: 24rpx; font-size: 20rpx; color: #ff5a5a; }
.sg-card { margin: 16rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.ct { font-size: 28rpx; font-weight: 700; }
.upd { font-size: 20rpx; color: $sg-text-3; }
.sensors { display: flex; flex-wrap: wrap; margin-top: 14rpx; }
.sensor { width: 33.33%; display: flex; flex-direction: column; align-items: center; padding: 18rpx 0; }
.s-ic { font-size: 40rpx; }
.s-v { font-size: 30rpx; font-weight: 800; color: #b5563c; margin-top: 6rpx; }
.s-u { font-size: 20rpx; font-weight: 400; color: $sg-text-3; margin-left: 2rpx; }
.s-n { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }
.stages { display: flex; margin-top: 18rpx; }
.stg { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }
.stg-dot { width: 40rpx; height: 40rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20rpx; z-index: 2; }
.stg-dot.on { background: #b5563c; }
.stg-dot.cur { background: $sg-gold; }
.stg-n { font-size: 18rpx; color: $sg-text-3; margin-top: 8rpx; text-align: center; }
.stg-n.on { color: $sg-text; font-weight: 600; }
.stg-line { position: absolute; top: 18rpx; left: 60%; width: 80%; height: 4rpx; background: $sg-border; z-index: 1; }
.stg-line.on { background: #b5563c; }
.imm { display: flex; align-items: center; padding: 14rpx 0; border-top: 2rpx solid $sg-bg; }
.imm:first-of-type { border-top: none; }
.im-dot { width: 40rpx; height: 40rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20rpx; margin-right: 14rpx; flex: none; }
.im-dot.done { background: #16884c; }
.im-dot.cur { background: $sg-gold; }
.im-i { flex: 1; display: flex; flex-direction: column; }
.im-t { font-size: 25rpx; font-weight: 600; }
.im-t.done { color: $sg-text-3; }
.im-m { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; }
.im-st { font-size: 21rpx; color: $sg-text-3; flex: none; }
.im-st.done { color: #16884c; }
.im-st.cur { color: #fff; background: $sg-gold; padding: 6rpx 16rpx; border-radius: 999rpx; }
.feed { display: flex; padding: 12rpx 0; border-top: 2rpx solid $sg-bg; }
.feed:first-of-type { border-top: none; }
.fd-date { width: 90rpx; font-size: 21rpx; color: $sg-text-3; flex: none; }
.fd-i { flex: 1; display: flex; flex-direction: column; }
.fd-act { font-size: 24rpx; font-weight: 600; }
.fd-detail { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; }
.withdraw { display: flex; align-items: center; margin-top: 14rpx; padding: 16rpx 18rpx; border-radius: $sg-radius; background: #fff6ec; border: 2rpx solid #f0d9b8; }
.withdraw.ok { background: #eaf7ef; border-color: #b6e0c6; }
.wd-ic { font-size: 36rpx; margin-right: 14rpx; }
.wd-i { flex: 1; display: flex; flex-direction: column; }
.wd-t { font-size: 24rpx; font-weight: 700; }
.wd-d { font-size: 20rpx; color: $sg-text-2; margin-top: 2rpx; line-height: 1.4; }
.wd-btn { font-size: 21rpx; color: #fff; background: #d99a2b; padding: 8rpx 18rpx; border-radius: 999rpx; flex: none; }
.gate-card { border: 2rpx solid #f0d0c5; }
.gate-sub { font-size: 20rpx; color: $sg-text-2; line-height: 1.5; display: block; margin: 8rpx 0 14rpx; }
.gate-btn { text-align: center; padding: 20rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #b5563c, #8f3d28); color: #fff; font-size: 26rpx; font-weight: 700; }
.gate-r { margin-top: 14rpx; padding: 16rpx 18rpx; border-radius: $sg-radius; font-size: 22rpx; line-height: 1.6; font-weight: 600; }
.gate-r.pass { background: $sg-primary-light; color: $sg-primary-deep; }
.gate-r.block { background: #fdeceb; color: #c0392b; }
.alert { display: flex; align-items: center; padding: 14rpx 0; border-top: 2rpx solid $sg-bg; }
.alert:first-of-type { border-top: none; }
.al-ic { font-size: 38rpx; margin-right: 16rpx; }
.al-i { flex: 1; display: flex; flex-direction: column; }
.al-t { font-size: 25rpx; font-weight: 600; }
.al-d { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }
.al-lv { font-size: 19rpx; color: #fff; padding: 4rpx 14rpx; border-radius: 999rpx; flex: none; }
.harmless { display: flex; align-items: center; margin: 16rpx 24rpx 0; padding: 20rpx 22rpx; background: linear-gradient(135deg, #eef7f2, #fff); border: 2rpx solid #cbe8d8; border-radius: $sg-radius-lg; }
.hm-ic { font-size: 40rpx; margin-right: 14rpx; }
.hm-i { flex: 1; display: flex; flex-direction: column; }
.hm-t { font-size: 24rpx; font-weight: 700; }
.hm-d { font-size: 19rpx; color: $sg-text-3; margin-top: 3rpx; line-height: 1.4; }
.links { margin: 16rpx 24rpx 0; }
.lk { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; margin-bottom: 14rpx; }
.lk-ic { width: 68rpx; height: 68rpx; border-radius: 20rpx; background: #fbeee9; display: flex; align-items: center; justify-content: center; font-size: 36rpx; margin-right: 16rpx; }
.lk-ic.blue { background: #e7f0f9; }
.lk-i { flex: 1; display: flex; flex-direction: column; }
.lk-t { font-size: 25rpx; font-weight: 600; }
.lk-d { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; line-height: 1.4; }
.lk-go { font-size: 32rpx; color: $sg-text-3; }
.lk.feat { background: linear-gradient(135deg, #eef6ff, #fff); border: 2rpx solid #cfe0f5; }
.chain-btn { margin: 20rpx 24rpx 40rpx; text-align: center; padding: 22rpx; background: linear-gradient(135deg, #eef6ff, #fff); border: 2rpx solid #d6e8fb; border-radius: $sg-radius-lg; color: $sg-blue; font-size: 24rpx; }
</style>
