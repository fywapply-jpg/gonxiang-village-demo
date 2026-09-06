<script setup lang="ts">
import { ref, computed } from "vue";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const kpis = [
  { n: "326", l: "在库 SKU" },
  { n: "1.8 天", l: "生鲜周转" },
  { n: "99.2%", l: "冷链达标" },
  { n: "4.2%", l: "损耗率" },
];

// 库存批次（按入库时间排序，最早批次先出 FIFO）
const batches = ref([
  { sku: "赣南脐橙 特级", batch: "B0412", in: "04-12 06:20", qty: 8.2, days: 3, zone: "冷藏 A 区", out: false },
  { sku: "赣南脐橙 特级", batch: "B0413", in: "04-13 05:40", qty: 12.0, days: 2, zone: "冷藏 A 区", out: false },
  { sku: "赣南脐橙 特级", batch: "B0414", in: "04-14 06:05", qty: 15.5, days: 1, zone: "冷藏 A 区", out: false },
]);
// FIFO：未出库中入库最早的那批
const nextOut = computed(() => batches.value.filter((b) => !b.out).sort((a, b) => a.in.localeCompare(b.in))[0]);

function outbound(b: any) {
  if (b.out) return uni.showToast({ title: "该批已出库", icon: "none" });
  if (productionBuild) return uni.showModal({ title: "需后台 WMS 出库", content: "正式环境出库必须由后台校验库存锁定、FIFO、拣货单和物流交接证据；当前未执行本地出库。", showCancel: false });
  if (nextOut.value && b.batch !== nextOut.value.batch) {
    return uni.showModal({ title: "⛔ 先进先出拦截", showCancel: false, confirmText: "知道了",
      content: `禁止跳批次出库！\n应先出最早入库批次「${nextOut.value.batch}（${nextOut.value.in}）」。\n跳批次操作已拦截并记录告警。` });
  }
  uni.showModal({ title: "出库确认", confirmText: "确认出库",
    content: `按 FIFO 出库最早批次「${b.batch}」\n${b.sku} · ${b.qty} 吨 · ${b.zone}`,
    success: (r) => { if (r.confirm) { b.out = true; uni.showToast({ title: "已按 FIFO 出库", icon: "success" }); } } });
}

// 库存周转预警（生鲜 > 2 天）
const turnWarn = computed(() => batches.value.filter((b) => !b.out && b.days > 2));

// 冷链温控告警
const coldAlerts = ref([
  { zone: "冷藏 A 区", temp: 6.8, hum: 82, std: "0~4℃ / ≤85%", status: "超温告警", alarm: true },
  { zone: "冷冻 B 区", temp: -18.2, hum: 70, std: "-18℃", status: "正常", alarm: false },
  { zone: "恒温 C 区", temp: 13.5, hum: 65, std: "10~15℃", status: "正常", alarm: false },
]);
function handleAlert(a: any) {
  if (!a.alarm) return;
  if (productionBuild) return uni.showModal({ title: "需后台冷链处置", content: "正式环境告警处置必须写入设备、处置人和复核证据；当前未修改本地告警状态。", showCancel: false });
  uni.showModal({ title: `冷链告警 · ${a.zone}`, confirmText: "已处置",
    content: `当前 ${a.temp}℃ / 湿度 ${a.hum}%，超出标准（${a.std}）。\n告警已于 1 分钟内推送仓管员。请立即检查制冷设备。`,
    success: (r) => { if (r.confirm) { a.temp = 3.6; a.status = "已处置 · 恢复正常"; a.alarm = false; uni.showToast({ title: "已处置", icon: "success" }); } } });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🏬 智慧仓储 WMS</text>
      <text class="hs">先进先出 · 冷链温控告警 · 周转与损耗管控</text>
      <view class="kpis">
        <view class="k" v-for="x in kpis" :key="x.l"><text class="kn">{{ x.n }}</text><text class="kl">{{ x.l }}</text></view>
      </view>
    </view>

    <!-- 先进先出 -->
    <view class="sec">先进先出（FIFO · 禁止跳批次）</view>
    <view class="fifo-note">📥 应出批次：<text class="fn-em">{{ nextOut ? nextOut.batch + '（' + nextOut.in + '）' : '—' }}</text>，跳批次出库将被拦截告警。</view>
    <view class="batch" v-for="(b, i) in batches" :key="b.batch" :class="{ next: nextOut && b.batch === nextOut.batch && !b.out, gone: b.out }">
      <view class="b-l">
        <view class="b-top"><text class="b-bt">{{ b.batch }}</text><text v-if="nextOut && b.batch === nextOut.batch && !b.out" class="b-tag">↓ 先出</text><text v-if="b.out" class="b-tag gone">已出</text></view>
        <text class="b-m">{{ b.sku }} · {{ b.qty }} 吨 · {{ b.zone }}</text>
        <text class="b-in">入库 {{ b.in }} · 已存 {{ b.days }} 天</text>
      </view>
      <view class="b-btn" :class="{ dis: b.out }" @tap="outbound(b)">{{ b.out ? '已出库' : '出库' }}</view>
    </view>

    <!-- 周转预警 -->
    <view class="sec">库存周转预警（生鲜 > 2 天）</view>
    <view v-if="turnWarn.length" class="warn-list">
      <view class="wn" v-for="w in turnWarn" :key="w.batch">
        <text class="wn-ic">⚠️</text>
        <view class="wn-i"><text class="wn-t">{{ w.sku }} · {{ w.batch }}</text><text class="wn-s">已存 {{ w.days }} 天，超周转阈值，建议优先出库降损耗</text></view>
      </view>
    </view>
    <view v-else class="ok-note">✅ 无超期库存</view>

    <!-- 冷链告警 -->
    <view class="sec">冷链温控告警（超标 1 分钟推送）</view>
    <view class="cold" v-for="a in coldAlerts" :key="a.zone" :class="{ alarm: a.alarm }" @tap="handleAlert(a)">
      <view class="c-l">
        <text class="c-z">{{ a.zone }}</text>
        <text class="c-std">标准 {{ a.std }}</text>
      </view>
      <view class="c-m"><text class="c-t">{{ a.temp }}℃</text><text class="c-h">湿 {{ a.hum }}%</text></view>
      <text class="c-st" :class="{ red: a.alarm }">{{ a.status }}</text>
    </view>

    <view class="tip">🔗 出库强制先进先出、跳批次拦截并留痕；生鲜周转 > 2 天、损耗率 > 5% 自动生成异常报表；温湿度超标 1 分钟内推送告警，全程上链可追溯。（数智供社 B2B）</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #2b6cb0, #1e4e8c); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; }
.kpis { display: flex; margin-top: 20rpx; }
.k { flex: 1; text-align: center; }
.kn { font-size: 30rpx; font-weight: 800; display: block; }
.kl { font-size: 18rpx; opacity: 0.9; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.fifo-note { margin: 0 24rpx 12rpx; font-size: 21rpx; color: $sg-text-2; background: #eef6ff; padding: 12rpx 16rpx; border-radius: $sg-radius; line-height: 1.5; }
.fn-em { color: $sg-blue; font-weight: 700; }
.batch { display: flex; align-items: center; justify-content: space-between; margin: 0 24rpx 12rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; border: 2rpx solid transparent; }
.batch.next { border-color: $sg-blue; background: #f4f9ff; }
.batch.gone { opacity: 0.5; }
.b-l { flex: 1; display: flex; flex-direction: column; }
.b-top { display: flex; align-items: center; gap: 10rpx; }
.b-bt { font-size: 26rpx; font-weight: 800; }
.b-tag { font-size: 18rpx; color: #fff; background: $sg-blue; padding: 2rpx 12rpx; border-radius: 6rpx; }
.b-tag.gone { background: $sg-text-3; }
.b-m { font-size: 21rpx; color: $sg-text-2; margin-top: 4rpx; }
.b-in { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; }
.b-btn { flex: none; padding: 16rpx 30rpx; border-radius: 999rpx; background: linear-gradient(135deg, #2b6cb0, #1e4e8c); color: #fff; font-size: 24rpx; font-weight: 700; }
.b-btn.dis { background: $sg-bg; color: $sg-text-3; }
.warn-list { margin: 0 24rpx; }
.wn { display: flex; align-items: center; background: #fff8ee; border: 2rpx solid #f0dcae; border-radius: $sg-radius-lg; padding: 18rpx; margin-bottom: 12rpx; }
.wn-ic { font-size: 34rpx; margin-right: 12rpx; }
.wn-i { flex: 1; display: flex; flex-direction: column; }
.wn-t { font-size: 24rpx; font-weight: 700; }
.wn-s { font-size: 19rpx; color: $sg-text-3; margin-top: 4rpx; line-height: 1.4; }
.ok-note { margin: 0 24rpx; font-size: 23rpx; color: $sg-primary; background: $sg-primary-light; padding: 18rpx; border-radius: $sg-radius; text-align: center; }
.cold { display: flex; align-items: center; margin: 0 24rpx 12rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; border: 2rpx solid transparent; }
.cold.alarm { border-color: $sg-red; background: #fdeceb; }
.c-l { flex: 1; display: flex; flex-direction: column; }
.c-z { font-size: 25rpx; font-weight: 700; }
.c-std { font-size: 19rpx; color: $sg-text-3; margin-top: 4rpx; }
.c-m { text-align: right; margin-right: 16rpx; }
.c-t { font-size: 30rpx; font-weight: 800; color: $sg-blue; display: block; }
.c-h { font-size: 18rpx; color: $sg-text-3; }
.c-st { flex: none; font-size: 20rpx; color: $sg-primary; font-weight: 700; }
.c-st.red { color: $sg-red; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
</style>
