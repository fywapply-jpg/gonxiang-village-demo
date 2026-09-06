<script setup lang="ts">
import { ref } from "vue";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

// 明年产能预售
const capacity = { crop: "赣南脐橙", year: "2027", total: "1800 吨", booked: 68, left: "576 吨" };

// 跨年度时间轴（今年定明年）
const timeline = [
  { period: "2026 Q4", tag: "今年秋冬", t: "发布明年采购需求 · 撮合签约", who: "采购方 ⇄ 合作社", acts: ["采购方按明年用量下预订单", "平台产销撮合", "签约锁量锁价 · 上链"], color: "#16884c" },
  { period: "2026 冬", tag: "备耕期", t: "预付定金 + 统配农资 + 下发 SOP", who: "平台 · 采购方 · 农户", acts: ["采购方预付定金 30%", "平台统配种苗/化肥/农药", "下发《种植标准 SOP》"], color: "#d99a2b" },
  { period: "2027 Q1-Q2", tag: "明年春播·田管", t: "按 SOP 春播 · 数字种植监管", who: "合作社 · 农户", acts: ["良种统供春播", "IoT 监测 + AI 指导", "农事打卡逐笔上链"], color: "#2b6cb0" },
  { period: "2027 Q4", tag: "明年秋采", t: "分级采收 · 品控溯源", who: "合作社 · 品控", acts: ["10-11 月按标准分级采收", "农残检测 · 全项合格", "一物一码溯源"], color: "#7c3aed" },
  { period: "2027 Q4", tag: "交付结算", t: "履约交付 · 结算 · 二次分红", who: "全链主体", acts: ["按保底价+随行就市收购", "尾款结算", "溢价二次分红"], color: "#c0392b" },
];

// 明年种植计划书
const plan = [
  ["作物 / 品种", "赣南脐橙 · 纽荷尔"],
  ["种植面积", "1200 亩（信丰 3 地块）"],
  ["预计产量", "1800 吨"],
  ["交付期", "2027 年 10 月—12 月"],
  ["收购价", "≥ 4.2 元/斤 保底 + 随行就市"],
  ["已认购方", "中央厨房×3 · 商超×2"],
];

// 今年定明年的风险规避
const risks = [
  { icon: "🔒", t: "预付定金锁产能", d: "采购方缴 30% 定金，违约不退，锁定明年产能" },
  { icon: "🧪", t: "农资统配 + SOP", d: "农户不愁投入、不愁标准，从源头保标准化" },
  { icon: "🛡️", t: "保底价兜底", d: "价格下跌农户不吃亏，保障种植积极性" },
  { icon: "📉", t: "基差点价", d: "挂钩期货价，采购方规避明年涨价风险" },
  { icon: "🌦️", t: "种植/收入保险", d: "自然灾害减产按保底价理赔" },
  { icon: "📜", t: "双向履约保证金", d: "买卖双方各缴保证金，智能合约自动执行" },
];

const booking = ref(false);
function book() {
  if (productionBuild) return uni.showModal({ title: "需后台产能认购", content: "正式环境定金预订必须由后台生成合同、冻结托管资金并校验履约计划；当前未锁定本地产能。", showCancel: false });
  uni.showModal({
    title: "认购明年产能", content: `预订「${capacity.year} 年 ${capacity.crop}」产能。缴 30% 定金锁量锁价，明年 Q4 按合约交付。`,
    confirmText: "缴定金预订", success: (r) => { if (r.confirm) { booking.value = true; uni.showToast({ title: "预订成功 · 已锁产能", icon: "success" }); } },
  });
}
function toContract() { uni.navigateTo({ url: "/pages/agri/contract" }); }
function toFutures() { uni.navigateTo({ url: "/pages/agri/futures" }); }
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty"><text class="production-empty-title">暂无后台产能项目</text><text class="production-empty-text">正式环境的预订数量、定金、合同和履约计划必须由后台生成并由持牌机构确认；本地预订案例不会混入生产项目。</text></view>
    <template v-else>
    <view class="hd">
      <text class="hd-t">跨年度订单农业 · 今年定明年</text>
      <text class="hd-s">以销定产 · 提前一季锁定明年产能 · 先有销路再种</text>
    </view>

    <!-- 产能预售看板 -->
    <view class="cap sg-card">
      <view class="sg-between"><text class="cap-t">{{ capacity.year }} 年 {{ capacity.crop }} 产能预售</text><text class="cap-pct">{{ capacity.booked }}%</text></view>
      <view class="cap-bar"><view class="cap-fill" :style="{ width: capacity.booked + '%' }"></view></view>
      <view class="sg-between cap-meta"><text>总产能 {{ capacity.total }}</text><text>剩余可订 {{ capacity.left }}</text></view>
    </view>

    <!-- 跨年度时间轴 -->
    <view class="sec">今年定明年 · 全流程时间轴</view>
    <view class="tl">
      <view class="ti" v-for="(s, i) in timeline" :key="i">
        <view class="ti-axis">
          <view class="ti-dot" :style="{ background: s.color }"></view>
          <view v-if="i < timeline.length - 1" class="ti-line"></view>
        </view>
        <view class="ti-c">
          <view class="ti-top"><text class="ti-p">{{ s.period }}</text><text class="ti-tag" :style="{ background: s.color }">{{ s.tag }}</text></view>
          <text class="ti-t">{{ s.t }}</text>
          <text class="ti-who">👥 {{ s.who }}</text>
          <view class="ti-acts"><text class="ti-a" v-for="a in s.acts" :key="a">· {{ a }}</text></view>
        </view>
      </view>
    </view>

    <!-- 明年种植计划书 -->
    <view class="sg-card">
      <text class="ct">📋 明年种植计划书</text>
      <view class="pr" v-for="p in plan" :key="p[0]"><text class="pk">{{ p[0] }}</text><text class="pv">{{ p[1] }}</text></view>
    </view>

    <!-- 风险规避 -->
    <view class="sec">今年定明年 · 风险规避机制</view>
    <view class="risks">
      <view class="rk" v-for="r in risks" :key="r.t">
        <text class="rk-ic">{{ r.icon }}</text>
        <view class="rk-i"><text class="rk-t">{{ r.t }}</text><text class="rk-d">{{ r.d }}</text></view>
      </view>
    </view>

    <!-- 关联 -->
    <view class="links">
      <view class="lk" @tap="toContract"><text class="lk-ic">📑</text><text class="lk-t">查看订单农业合约</text><text class="lk-go">›</text></view>
      <view class="lk" @tap="toFutures"><text class="lk-ic">📈</text><text class="lk-t">升级为期货年单（多年度对冲）</text><text class="lk-go">›</text></view>
    </view>

    <view class="tip">🔗 跨年度合约、定金、农资、农事、交付全程上链；以销定产、锁量锁价，规避"价贱伤农、价高伤市"。</view>

    <view class="bar">
      <view class="bar-btn" :class="{ done: booking }" @tap="book">{{ booking ? '✔ 已认购明年产能' : '认购明年产能 · 锁量锁价' }}</view>
    </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, $sg-primary, $sg-primary-deep); padding: 36rpx 28rpx; color: #fff; }
.hd-t { font-size: 34rpx; font-weight: 800; }
.hd-s { font-size: 22rpx; opacity: 0.9; margin-top: 8rpx; display: block; }
.cap-t { font-size: 27rpx; font-weight: 700; }
.cap-pct { font-size: 32rpx; font-weight: 800; color: $sg-primary; }
.cap-bar { height: 20rpx; background: $sg-bg; border-radius: 10rpx; overflow: hidden; margin: 12rpx 0 8rpx; }
.cap-fill { height: 100%; background: linear-gradient(90deg, $sg-primary, $sg-gold); }
.cap-meta { font-size: 21rpx; color: $sg-text-3; }
.sec { font-size: 30rpx; font-weight: 700; padding: 26rpx 28rpx 12rpx; }
.ct { font-size: 28rpx; font-weight: 700; display: block; margin-bottom: 12rpx; }

.tl { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 28rpx 24rpx; }
.ti { display: flex; }
.ti-axis { display: flex; flex-direction: column; align-items: center; margin-right: 20rpx; }
.ti-dot { width: 28rpx; height: 28rpx; border-radius: 50%; margin-top: 6rpx; }
.ti-line { flex: 1; width: 4rpx; background: $sg-border; margin: 6rpx 0; }
.ti-c { flex: 1; padding-bottom: 28rpx; }
.ti-top { display: flex; align-items: center; }
.ti-p { font-size: 24rpx; font-weight: 800; }
.ti-tag { font-size: 18rpx; color: #fff; padding: 2rpx 12rpx; border-radius: 999rpx; margin-left: 12rpx; }
.ti-t { font-size: 26rpx; font-weight: 600; display: block; margin: 6rpx 0; }
.ti-who { font-size: 21rpx; color: $sg-text-3; }
.ti-acts { display: flex; flex-direction: column; margin-top: 8rpx; }
.ti-a { font-size: 21rpx; color: $sg-text-2; padding: 2rpx 0; }

.pr { display: flex; padding: 12rpx 0; border-top: 2rpx solid $sg-border; }
.pr:first-of-type { border-top: none; }
.pk { width: 160rpx; font-size: 24rpx; color: $sg-text-3; }
.pv { flex: 1; font-size: 24rpx; }

.risks { margin: 0 24rpx; }
.rk { display: flex; align-items: center; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 20rpx; margin-bottom: 14rpx; }
.rk-ic { font-size: 44rpx; margin-right: 16rpx; }
.rk-i { flex: 1; display: flex; flex-direction: column; }
.rk-t { font-size: 26rpx; font-weight: 600; }
.rk-d { font-size: 21rpx; color: $sg-text-3; margin-top: 2rpx; }

.links { margin: 20rpx 24rpx 0; }
.lk { display: flex; align-items: center; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 22rpx; margin-bottom: 14rpx; }
.lk-ic { font-size: 36rpx; margin-right: 16rpx; }
.lk-t { flex: 1; font-size: 26rpx; font-weight: 600; }
.lk-go { font-size: 32rpx; color: $sg-text-3; }

.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; padding-bottom: 120rpx; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.05); }
.bar-btn { text-align: center; padding: 26rpx 0; border-radius: 999rpx; font-size: 30rpx; font-weight: 700; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; }
.bar-btn.done { background: $sg-primary-light; color: $sg-primary; }
</style>
