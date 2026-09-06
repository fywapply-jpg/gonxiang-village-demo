<script setup lang="ts">
import { ref, computed } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

// 多地块切换
const plots = [
  { key: "p08", plot: "江西省赣州市信丰县安西镇范庄村 08 号地块", area: "320 亩", crop: "赣南脐橙" },
  { key: "p03", plot: "江西省赣州市信丰县大塘埠镇 03 号地块", area: "180 亩", crop: "赣南脐橙" },
  { key: "p11", plot: "江西省赣州市信丰县安西镇设施大棚 11 号", area: "60 亩", crop: "草莓（设施）" },
];
const plotKey = ref("p08");
const cur = computed(() => plots.find((p) => p.key === plotKey.value) || plots[0]);
const farm = computed(() => ({ name: cur.value.crop + " 数字农场", plot: cur.value.plot, area: cur.value.area, coop: "赣南脐橙合作社" }));

// 待办农事任务（可打卡）
const tasks = ref([
  { t: "膨大期滴灌补水 2 小时", tag: "灌溉", due: "今日", done: false },
  { t: "增施钾肥 · 8kg/亩", tag: "施肥", due: "今日", done: false },
  { t: "红蜘蛛生物防治巡查", tag: "植保", due: "明日", done: false },
]);
function checkTask(t: any) {
  if (t.done) return;
  if (productionBuild) return uni.showModal({ title: "需后台农事档案", content: "正式环境打卡必须上传现场证据并由后台校验地块、人员和时间后入档，当前未执行本地打卡。", showCancel: false });
  uni.showModal({ title: "农事打卡", content: `完成「${t.t}」并上传现场照片？记录进入农事档案并上链。`,
    confirmText: "完成打卡", success: (r) => { if (r.confirm) { t.done = true; uni.showToast({ title: "已打卡上链", icon: "success" }); } } });
}

// 7 日墒情趋势（%）
const trend = [58, 61, 55, 63, 60, 57, 62];
const trendMax = 70;

// 预警
const alerts = [
  { icon: "🌡️", t: "夜间低温预警", d: "后天最低 8℃，建议防霜", level: "中", color: "#d99a2b" },
  { icon: "🐛", t: "红蜘蛛虫情预警", d: "邻近地块虫口上升，注意巡查", level: "中", color: "#d99a2b" },
];

// 农事投入档案（→ 溯源）
const archive = [
  { date: "07-01", act: "施有机复合肥", detail: "16 吨 · 统配直供 · 批次 F-0781" },
  { date: "06-20", act: "生物农药防治", detail: "苦参碱 · 残留合规 · 批次 P-0663" },
  { date: "06-05", act: "灌溉补水", detail: "水肥一体 · 3 小时" },
];

const sensors = [
  { icon: "🌡️", name: "土壤温度", val: "19.6", unit: "℃" },
  { icon: "💧", name: "土壤墒情", val: "62", unit: "%" },
  { icon: "⚗️", name: "土壤 pH", val: "6.2", unit: "" },
  { icon: "🌿", name: "氮磷钾", val: "均衡", unit: "" },
  { icon: "☀️", name: "光照", val: "38k", unit: "lux" },
  { icon: "🌧️", name: "近7日降水", val: "26", unit: "mm" },
];

const stages = [
  { name: "萌芽", done: true }, { name: "开花", done: true }, { name: "坐果", done: true },
  { name: "膨大", done: false, cur: true }, { name: "转色", done: false }, { name: "成熟采收", done: false },
];

const ai = [
  "当前处于果实膨大期，建议增施钾肥 1 次（已按 SOP 生成农事单）",
  "未来 3 天晴好，墒情偏低，建议滴灌补水 2 小时",
  "红蜘蛛风险中等，建议生物防治，禁用高毒农药（残留合规）",
];

const sop = [
  { t: "统一品种", d: "纽荷尔脐橙 · 良种统供" },
  { t: "标准株行距", d: "3m × 4m · 55 株/亩" },
  { t: "水肥方案", d: "水肥一体 · 按生育期配比" },
  { t: "质量检测", d: "按适用国家标准、品类风险与合同项目检测" },
  { t: "采收分级", d: "70-80mm 精品果分级" },
];

function play() { uni.showToast({ title: "田间监控待接入", icon: "none" }); }
function toContract() { uni.navigateTo({ url: "/pages/agri/contract" }); }
function toLivestock() { uni.navigateTo({ url: "/pages/digitalfarm/livestock" }); }
function startProject() { uni.navigateTo({ url: "/pages/digitalfarm/project?type=plant" }); }
function toResources() { uni.navigateTo({ url: "/pages/digitalfarm/resources" }); }
function toTrace() { uni.navigateTo({ url: "/pages/trace/detail?id=TJ2026V001" }); }
function chain() { uni.showModal({ title: "种植数据上链", showCancel: false, confirmText: "已验真",
  content: "本地块传感器数据每 10 分钟上链一次，长安链存证，作为溯源与订单农业履约依据。" }); }
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty"><text class="production-empty-title">暂无后台数字农事项目</text><text class="production-empty-text">正式环境只展示后台返回的地块、农事记录、设备和验收证据；本地种植档案不会混入生产数据。</text></view>
    <template v-else>
    <view class="hd">
      <text class="hd-t">数字种植项目运营台</text>
      <text class="hd-s">{{ farm.name }} · {{ farm.area }}</text>
      <text class="hd-p">📍 {{ farm.plot }} · {{ farm.coop }}</text>
    </view>

    <view class="project-start" @tap="startProject">
      <view class="ps-icon">🚀</view>
      <view class="ps-main"><text class="ps-title">我是种植户 · 开始一个新项目</text><text class="ps-sub">选品种、选地块、建预算与SOP，完成9道管控和4层验收</text></view>
      <text class="ps-go">开始 ›</text>
    </view>

    <view class="resource-link" @tap="toResources">
      <text class="rl-icon">🗺️</text>
      <view class="rl-main"><text class="rl-title">先看县—乡—村农业资源底图</text><text class="rl-sub">土地、土壤、适种作物、设施与存栏 → 精准匹配订单</text></view>
      <text class="rl-go">›</text>
    </view>

    <!-- 地块切换 -->
    <scroll-view scroll-x class="plots">
      <text v-for="p in plots" :key="p.key" class="plot" :class="{ on: plotKey === p.key }" @tap="plotKey = p.key">
        {{ p.plot.slice(-9) }} · {{ p.area }}
      </text>
    </scroll-view>

    <view class="cam" @tap="play">
      <text class="cam-ic">📹</text><text class="cam-t">田间高清监控 · 实时画面</text><text class="cam-live">● 监控中</text>
    </view>

    <!-- 待办农事 -->
    <view class="sg-card">
      <view class="sg-between"><text class="ct">📅 今日农事任务</text><text class="upd">完成打卡上链</text></view>
      <view class="task" v-for="(t, i) in tasks" :key="i" @tap="checkTask(t)">
        <view class="tk-cb" :class="{ on: t.done }">{{ t.done ? '✓' : '' }}</view>
        <view class="tk-i"><text class="tk-t" :class="{ done: t.done }">{{ t.t }}</text><text class="tk-meta">{{ t.tag }} · {{ t.due }}</text></view>
        <text class="tk-st" :class="{ done: t.done }">{{ t.done ? '已完成' : '打卡' }}</text>
      </view>
    </view>

    <view class="sg-card">
      <view class="sg-between"><text class="ct">🛰️ 物联网实时监测</text><text class="upd">10 分钟前更新</text></view>
      <view class="sensors">
        <view class="sensor" v-for="s in sensors" :key="s.name">
          <text class="s-ic">{{ s.icon }}</text>
          <text class="s-v">{{ s.val }}<text class="s-u">{{ s.unit }}</text></text>
          <text class="s-n">{{ s.name }}</text>
        </view>
      </view>
    </view>

    <view class="sg-card">
      <text class="ct">🌱 生长阶段</text>
      <view class="stages">
        <view class="stg" v-for="(s, i) in stages" :key="i">
          <view class="stg-dot" :class="{ on: s.done, cur: s.cur }">{{ s.done ? '✓' : (s.cur ? '●' : '') }}</view>
          <text class="stg-n" :class="{ on: s.done || s.cur }">{{ s.name }}</text>
          <view v-if="i < stages.length - 1" class="stg-line" :class="{ on: s.done }"></view>
        </view>
      </view>
    </view>

    <!-- 7 日墒情趋势 -->
    <view class="sg-card">
      <text class="ct">📈 近 7 日土壤墒情趋势（%）</text>
      <view class="trend">
        <view class="tr-col" v-for="(v, i) in trend" :key="i">
          <text class="tr-v">{{ v }}</text>
          <view class="tr-bar" :style="{ height: (v / trendMax * 160) + 'rpx' }"></view>
          <text class="tr-x">D{{ i + 1 }}</text>
        </view>
      </view>
    </view>

    <!-- 预警 -->
    <view class="sg-card">
      <text class="ct">⚠️ 预警提醒</text>
      <view class="alert" v-for="a in alerts" :key="a.t">
        <text class="al-ic">{{ a.icon }}</text>
        <view class="al-i"><text class="al-t">{{ a.t }}</text><text class="al-d">{{ a.d }}</text></view>
        <text class="al-lv" :style="{ background: a.color }">{{ a.level }}风险</text>
      </view>
    </view>

    <view class="sg-card ai">
      <text class="ct">🤖 AI 种植指导</text>
      <view class="ai-item" v-for="(a, i) in ai" :key="i"><text class="ai-dot">·</text><text class="ai-t">{{ a }}</text></view>
    </view>

    <!-- 农事投入档案 -->
    <view class="sg-card">
      <view class="sg-between"><text class="ct">🗂️ 农事投入档案</text><text class="arch-go" @tap="toTrace">全链路溯源 ›</text></view>
      <view class="arch" v-for="(a, i) in archive" :key="i">
        <text class="ar-date">{{ a.date }}</text>
        <view class="ar-i"><text class="ar-act">{{ a.act }}</text><text class="ar-detail">{{ a.detail }}</text></view>
      </view>
    </view>

    <!-- 切换到数字养殖 -->
    <view class="livestock-lk" @tap="toLivestock">
      <text class="ll-ic">🐖</text>
      <view class="ll-i"><text class="ll-t">切换到数字养殖项目运营台</text><text class="ll-d">畜禽、水产及许可特种养殖 · 分品类加载防疫、检疫与验收规则</text></view>
      <text class="ll-go">›</text>
    </view>

    <!-- 关联订单农业合约 -->
    <view class="contract-lk" @tap="toContract">
      <text class="cl-ic">📑</text>
      <view class="cl-i"><text class="cl-t">本地块履约中：赣南脐橙订单农业合约</text><text class="cl-d">OA-2026-0781 · 沪上团餐中央厨房 · 保底价收购</text></view>
      <text class="cl-go">›</text>
    </view>

    <view class="sg-card">
      <text class="ct">📋 标准化种植 SOP</text>
      <view class="sop" v-for="s in sop" :key="s.t"><text class="sop-t">{{ s.t }}</text><text class="sop-d">{{ s.d }}</text></view>
    </view>

    <view class="chain-btn" @tap="chain">🔗 种植数据已上链存证 · 点击验真</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, $sg-primary, $sg-primary-deep); padding: 36rpx 28rpx; color: #fff; }
.hd-t { font-size: 34rpx; font-weight: 800; }
.hd-s { font-size: 24rpx; opacity: 0.95; margin-top: 8rpx; display: block; }
.hd-p { font-size: 21rpx; opacity: 0.8; margin-top: 6rpx; display: block; }
.project-start { display: flex; align-items: center; gap: 14rpx; margin: 18rpx 24rpx 0; padding: 20rpx; border: 2rpx solid #a9ddbf; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #eaf8f0, #fff); box-shadow: $sg-shadow; }
.ps-icon { flex: none; width: 62rpx; height: 62rpx; display: flex; align-items: center; justify-content: center; border-radius: 18rpx; color: #fff; background: $sg-primary; font-size: 33rpx; }
.ps-main { flex: 1; display: flex; flex-direction: column; }
.ps-title { color: $sg-primary-deep; font-size: 25rpx; font-weight: 800; }
.ps-sub { margin-top: 4rpx; color: $sg-text-3; font-size: 19rpx; line-height: 1.45; }
.ps-go { color: $sg-primary; font-size: 23rpx; font-weight: 800; white-space: nowrap; }
.resource-link { display: flex; align-items: center; gap: 14rpx; margin: 14rpx 24rpx 0; padding: 18rpx 20rpx; border: 2rpx solid #ead8ae; border-radius: $sg-radius-lg; background: #fff9ec; }
.rl-icon { font-size: 34rpx; }
.rl-main { display: flex; min-width: 0; flex: 1; flex-direction: column; }
.rl-title { color: #775317; font-size: 23rpx; font-weight: 800; }
.rl-sub { margin-top: 3rpx; color: $sg-text-3; font-size: 18rpx; line-height: 1.4; }
.rl-go { color: #a97724; font-size: 30rpx; }
.cam { margin: 24rpx; height: 200rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #1e293b, #334155); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; position: relative; }
.cam-ic { font-size: 60rpx; }
.cam-t { font-size: 24rpx; opacity: 0.9; margin-top: 8rpx; }
.cam-live { position: absolute; top: 20rpx; right: 24rpx; font-size: 20rpx; color: #ff5a5a; }
.ct { font-size: 28rpx; font-weight: 700; }
.upd { font-size: 20rpx; color: $sg-text-3; }
.sensors { display: flex; flex-wrap: wrap; margin-top: 14rpx; }
.sensor { width: 33.33%; display: flex; flex-direction: column; align-items: center; padding: 18rpx 0; }
.s-ic { font-size: 40rpx; }
.s-v { font-size: 30rpx; font-weight: 800; color: $sg-primary; margin-top: 6rpx; }
.s-u { font-size: 20rpx; font-weight: 400; color: $sg-text-3; margin-left: 2rpx; }
.s-n { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }
.stages { display: flex; margin-top: 18rpx; }
.stg { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }
.stg-dot { width: 40rpx; height: 40rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20rpx; z-index: 2; }
.stg-dot.on { background: $sg-primary; }
.stg-dot.cur { background: $sg-gold; }
.stg-n { font-size: 19rpx; color: $sg-text-3; margin-top: 8rpx; }
.stg-n.on { color: $sg-text; font-weight: 600; }
.stg-line { position: absolute; top: 18rpx; left: 60%; width: 80%; height: 4rpx; background: $sg-border; z-index: 1; }
.stg-line.on { background: $sg-primary; }
.ai { background: linear-gradient(135deg, #eef7f2, #fff); }
.ai-item { display: flex; align-items: flex-start; padding: 8rpx 0; }
.ai-dot { color: $sg-primary; margin-right: 10rpx; font-weight: 700; }
.ai-t { flex: 1; font-size: 24rpx; color: $sg-text-2; line-height: 1.5; }
.sop { display: flex; align-items: center; padding: 12rpx 0; border-top: 2rpx solid $sg-border; }
.sop-t { width: 160rpx; font-size: 25rpx; font-weight: 600; }
.sop-d { flex: 1; font-size: 23rpx; color: $sg-text-2; }
.chain-btn { margin: 24rpx; text-align: center; padding: 22rpx; background: linear-gradient(135deg, #eef6ff, #fff); border: 2rpx solid #d6e8fb; border-radius: $sg-radius-lg; color: $sg-blue; font-size: 24rpx; }

/* 地块切换 */
.plots { white-space: nowrap; padding: 20rpx 24rpx 0; }
.plot { display: inline-block; padding: 10rpx 26rpx; font-size: 23rpx; color: $sg-text-2; background: #fff; border-radius: 999rpx; margin-right: 14rpx; box-shadow: $sg-shadow; }
.plot.on { background: $sg-primary; color: #fff; }

/* 农事任务 */
.task { display: flex; align-items: center; padding: 16rpx 0; border-top: 2rpx solid $sg-border; }
.tk-cb { width: 40rpx; height: 40rpx; border-radius: 50%; border: 2rpx solid $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; margin-right: 16rpx; }
.tk-cb.on { background: $sg-primary; border-color: $sg-primary; }
.tk-i { flex: 1; display: flex; flex-direction: column; }
.tk-t { font-size: 26rpx; font-weight: 600; }
.tk-t.done { color: $sg-text-3; text-decoration: line-through; }
.tk-meta { font-size: 20rpx; color: $sg-text-3; }
.tk-st { font-size: 22rpx; color: #fff; background: $sg-primary; padding: 6rpx 20rpx; border-radius: 999rpx; }
.tk-st.done { color: $sg-primary; background: $sg-primary-light; }

/* 趋势 */
.trend { display: flex; align-items: flex-end; justify-content: space-between; height: 220rpx; margin-top: 16rpx; }
.tr-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; }
.tr-v { font-size: 19rpx; color: $sg-text-3; margin-bottom: 6rpx; }
.tr-bar { width: 36rpx; border-radius: 8rpx 8rpx 0 0; background: linear-gradient(180deg, #4fc3f7, #2b6cb0); }
.tr-x { font-size: 19rpx; color: $sg-text-3; margin-top: 8rpx; }

/* 预警 */
.alert { display: flex; align-items: center; padding: 14rpx 0; border-top: 2rpx solid $sg-border; }
.alert:first-of-type { border-top: none; }
.al-ic { font-size: 40rpx; margin-right: 16rpx; }
.al-i { flex: 1; display: flex; flex-direction: column; }
.al-t { font-size: 26rpx; font-weight: 600; }
.al-d { font-size: 21rpx; color: $sg-text-3; margin-top: 2rpx; }
.al-lv { font-size: 19rpx; color: #fff; padding: 4rpx 14rpx; border-radius: 999rpx; }

/* 农事档案 */
.arch-go { font-size: 21rpx; color: $sg-blue; }
.arch { display: flex; padding: 14rpx 0; border-top: 2rpx solid $sg-border; }
.ar-date { width: 90rpx; font-size: 22rpx; color: $sg-text-3; }
.ar-i { flex: 1; display: flex; flex-direction: column; }
.ar-act { font-size: 25rpx; font-weight: 600; }
.ar-detail { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }

/* 切换养殖 */
.livestock-lk { display: flex; align-items: center; margin: 20rpx 24rpx 0; padding: 22rpx; background: linear-gradient(135deg, #fbeee9, #fff); border: 2rpx solid #f0d0c5; border-radius: $sg-radius-lg; }
.ll-ic { width: 68rpx; height: 68rpx; border-radius: 20rpx; background: #f7ddd3; display: flex; align-items: center; justify-content: center; font-size: 36rpx; margin-right: 16rpx; }
.ll-i { flex: 1; display: flex; flex-direction: column; }
.ll-t { font-size: 25rpx; font-weight: 700; color: #b5563c; }
.ll-d { font-size: 19rpx; color: $sg-text-3; margin-top: 3rpx; line-height: 1.4; }
.ll-go { font-size: 32rpx; color: $sg-text-3; }

/* 关联合约 */
.contract-lk { display: flex; align-items: center; margin: 20rpx 24rpx 0; padding: 22rpx; background: linear-gradient(135deg, #fff8ec, #fff); border: 2rpx solid #f0e0c0; border-radius: $sg-radius-lg; }
.cl-ic { width: 68rpx; height: 68rpx; border-radius: 20rpx; background: $sg-gold-light; display: flex; align-items: center; justify-content: center; font-size: 36rpx; margin-right: 16rpx; }
.cl-i { flex: 1; display: flex; flex-direction: column; }
.cl-t { font-size: 25rpx; font-weight: 700; }
.cl-d { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }
.cl-go { font-size: 32rpx; color: $sg-text-3; }
</style>
