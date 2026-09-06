<script setup lang="ts">
import { ref } from "vue";
import { promoTickets } from "@/mock/promo";
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const list = ref(promoTickets.map((t) => ({ ...t })));
const handleFlow = ["2h 内响应", "属地核实", "线下化解", "回访确认", "闭环上报"];
const statusColor: Record<string, string> = { 待处理: "#d64541", 处理中: "#d99a2b", 已化解: "#16884c" };

function handle(t: any) {
  if (t.status === "已化解") return uni.showToast({ title: "该工单已闭环", icon: "none" });
  if (productionBuild) return uni.showModal({ title: "需后台工单闭环", content: "正式环境工单化解必须写入处理人、核实证据、回访结果和审计记录；当前未修改本地状态。", showCancel: false });
  uni.showModal({
    title: `处理工单 ${t.id}`, confirmText: "标记化解",
    content: `类型：${t.type}（${t.level}优先）\n小端：${t.end}\n流程：${handleFlow.join(" → ")}\n\n属地推广员到场核实、线下化解后回访确认，闭环上报并上链。`,
    success: (r) => { if (r.confirm) { t.status = "已化解"; uni.showToast({ title: "已化解闭环", icon: "success" }); } },
  });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">📣 关系维护 · 舆情处理</text>
      <text class="hs">属地推广组织第一时间响应 · 就地化解 · 闭环上链</text>
    </view>

    <!-- 处理流程 -->
    <view class="sec">舆情处理流程</view>
    <view class="flow">
      <view class="fw" v-for="(f, i) in handleFlow" :key="f">
        <view class="fw-dot">{{ i + 1 }}</view>
        <text class="fw-t">{{ f }}</text>
        <text v-if="i < handleFlow.length - 1" class="fw-arr">›</text>
      </view>
    </view>

    <!-- 工单 -->
    <view class="sec">工单列表</view>
    <view class="tk" v-for="t in list" :key="t.id" :class="{ hot: t.level === '高' }">
      <view class="tk-top">
        <text class="tk-type" :class="{ red: t.type.includes('舆情') || t.type.includes('投诉') }">{{ t.type }}</text>
        <text class="tk-lv" :class="'lv-' + t.level">{{ t.level }}优先</text>
        <text class="tk-st" :style="{ color: statusColor[t.status] }">{{ t.status }}</text>
      </view>
      <text class="tk-end">{{ t.end }} · 推广员 {{ t.promoter }}</text>
      <text class="tk-c">{{ t.content }}</text>
      <view class="tk-btn" :class="{ done: t.status === '已化解' }" @tap="handle(t)">{{ t.status === '已化解' ? '✓ 已闭环' : '处理 / 化解' }}</view>
    </view>

    <view class="tip">🔗 关系维护与舆情处理是推广组织核心职责，计入考核（2h 响应、24h 化解率）；处理过程与结果全程上链，可回溯、可监督。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #c0392b, #922b21); padding: 32rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.95; margin-top: 8rpx; display: block; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.flow { display: flex; flex-wrap: wrap; align-items: center; margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; }
.fw { display: flex; align-items: center; }
.fw-dot { width: 40rpx; height: 40rpx; border-radius: 50%; background: #fdecea; color: #c0392b; display: flex; align-items: center; justify-content: center; font-size: 20rpx; font-weight: 700; }
.fw-t { font-size: 21rpx; margin: 0 6rpx 0 8rpx; }
.fw-arr { color: $sg-text-3; margin-right: 8rpx; }
.tk { margin: 0 24rpx 14rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; }
.tk.hot { border: 2rpx solid #f5c6c2; }
.tk-top { display: flex; align-items: center; gap: 12rpx; }
.tk-type { font-size: 20rpx; color: $sg-primary; background: $sg-primary-light; padding: 3rpx 12rpx; border-radius: 6rpx; }
.tk-type.red { color: #fff; background: $sg-red; }
.tk-lv { font-size: 19rpx; padding: 3rpx 12rpx; border-radius: 6rpx; }
.lv-高 { color: #fff; background: $sg-red; }
.lv-中 { color: #c8871f; background: $sg-gold-light; }
.lv-低 { color: $sg-text-3; background: $sg-bg; }
.tk-st { font-size: 20rpx; font-weight: 700; margin-left: auto; }
.tk-end { font-size: 24rpx; font-weight: 700; margin: 10rpx 0 4rpx; display: block; }
.tk-c { font-size: 21rpx; color: $sg-text-2; line-height: 1.5; display: block; }
.tk-btn { margin-top: 14rpx; text-align: center; padding: 16rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #c0392b, #922b21); color: #fff; font-size: 24rpx; font-weight: 700; }
.tk-btn.done { background: $sg-bg; color: $sg-text-3; }
.tip { margin: 16rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
</style>
