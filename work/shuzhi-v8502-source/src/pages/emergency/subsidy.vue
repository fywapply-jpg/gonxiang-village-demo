<script setup lang="ts">
import { ref } from "vue";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

// 已完成的保供任务（可申领补贴）
const tasks = ref([
  { id: "BT-0342", name: "销区叶菜保供 · 调拨 50 吨", done: "2026-06-30 已履约", base: 1.2, subsidy: 0.2, qty: 50, claimed: false },
  { id: "BT-0765", name: "大白菜应急保供 · 调拨 30 吨", done: "2026-05-12 已履约", base: 0.9, subsidy: 0.3, qty: 30, claimed: true },
]);

function amount(t: any) { return (t.subsidy * t.qty * 2000).toLocaleString(); } // 元（吨→斤 *2000 * 补贴/斤）
function claim(t: any) {
  if (productionBuild) return uni.showModal({ title: "需后台补贴审核", content: "正式环境补贴申领必须关联真实履约、签收、发票和财政审核结果；当前未提交本地申领。", showCancel: false });
  uni.showModal({
    title: "申领保供补贴",
    content: `任务 ${t.id}\n补贴标准：${t.subsidy} 元/斤 × ${t.qty} 吨\n应领补贴：¥${amount(t)}\n\n补贴由财政保供专项拨付，经审核后发放至对公账户。`,
    confirmText: "确认申领",
    success: (r) => { if (r.confirm) { t.claimed = true; uni.showToast({ title: "申领已提交", icon: "success" }); } },
  });
}
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty"><text class="production-empty-title">暂无后台补贴记录</text><text class="production-empty-text">正式环境的补贴标准、履约数量和拨付状态必须由后台及财政回执返回；本地补贴案例不会混入生产数据。</text></view>
    <template v-else>
    <view class="hd">
      <text class="hd-t">保供补贴申领</text>
      <text class="hd-s">履约完成 → 在线申领 → 财政审核 → 拨付对公账户</text>
    </view>

    <view class="card" v-for="t in tasks" :key="t.id">
      <view class="c-top"><text class="c-id">任务 {{ t.id }}</text><text class="c-st" :class="{ ok: t.claimed }">{{ t.claimed ? '已发放' : '可申领' }}</text></view>
      <text class="c-name">{{ t.name }}</text>
      <text class="c-done">{{ t.done }}</text>
      <view class="c-calc">
        <view class="cc"><text class="cc-k">补贴标准</text><text class="cc-v">{{ t.subsidy }} 元/斤</text></view>
        <view class="cc"><text class="cc-k">保供数量</text><text class="cc-v">{{ t.qty }} 吨</text></view>
        <view class="cc"><text class="cc-k">应领补贴</text><text class="cc-v amt">¥{{ amount(t) }}</text></view>
      </view>
      <view class="c-btn" :class="{ dis: t.claimed }" @tap="!t.claimed && claim(t)">{{ t.claimed ? '✔ 补贴已到账' : '申领补贴' }}</view>
    </view>

    <view class="tip">🔗 保供任务履约数据、补贴申领与拨付记录全程上链，财政专项资金专款专用、可追溯审计</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, $sg-red, #b5322e); padding: 36rpx 28rpx; color: #fff; }
.hd-t { font-size: 32rpx; font-weight: 800; }
.hd-s { font-size: 21rpx; opacity: 0.9; margin-top: 8rpx; display: block; }
.card { background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 24rpx 24rpx 0; padding: 24rpx; }
.c-top { display: flex; align-items: center; justify-content: space-between; }
.c-id { font-size: 23rpx; color: $sg-text-3; }
.c-st { font-size: 24rpx; font-weight: 700; color: $sg-red; }
.c-st.ok { color: $sg-primary; }
.c-name { font-size: 28rpx; font-weight: 700; display: block; margin: 10rpx 0 4rpx; }
.c-done { font-size: 21rpx; color: $sg-text-3; }
.c-calc { display: flex; margin: 18rpx 0; padding: 16rpx 0; border-top: 2rpx solid $sg-border; border-bottom: 2rpx solid $sg-border; }
.cc { flex: 1; display: flex; flex-direction: column; align-items: center; }
.cc-k { font-size: 20rpx; color: $sg-text-3; }
.cc-v { font-size: 26rpx; font-weight: 600; margin-top: 6rpx; }
.cc-v.amt { color: $sg-red; font-size: 30rpx; font-weight: 800; }
.c-btn { text-align: center; padding: 20rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, $sg-red, #b5322e); color: #fff; font-size: 28rpx; font-weight: 700; }
.c-btn.dis { background: $sg-bg; color: $sg-text-3; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
</style>
