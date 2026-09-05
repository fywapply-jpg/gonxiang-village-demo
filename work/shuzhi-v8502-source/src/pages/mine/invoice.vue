<script setup lang="ts">
import { ref } from "vue";
import { recordPlatformEvent } from "@/services/localApi";
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const titles = ref(productionBuild ? [] : [
  { name: "赣南脐橙合作社", taxNo: "91360722MA2Y3K7X8Q", type: "企业", def: true },
  { name: "赣南脐橙合作社（个人报销）", taxNo: "—", type: "个人", def: false },
]);
const records = productionBuild ? [] : [
  { no: "FP-20260702-018", amount: 11200, target: "订单 O240620 农资集采", status: "已开具", time: "2026-07-02" },
  { no: "FP-20260629-006", amount: 138000, target: "订单 O240701 脐橙货款", status: "开具中", time: "2026-06-29" },
  { no: "FP-20260618-142", amount: 96000, target: "订单 O240615 番茄货款", status: "已开具", time: "2026-06-18" },
];
const statusColor: Record<string, string> = { 已开具: "#16884c", 开具中: "#d99a2b", 已红冲: "#9aa0aa" };

function apply() {
  if (productionBuild) return uni.showModal({ title: "暂不可申请开票", content: "请从已授权订单详情发起开票；正式环境的抬头、金额和发票状态只接受后台四流校验结果。", showCancel: false });
  void recordPlatformEvent("mine", "REQUEST_INVOICE", {}).catch(() => {});
  uni.showModal({ title: "申请开票", content: "选择可开票订单，按默认抬头开具增值税发票，电子发票开好后推送至微信。",
    confirmText: "申请", success: (r) => { if (r.confirm) uni.showToast({ title: "开票申请已提交", icon: "success" }); } });
}
function setDefault(i: number) {
  void recordPlatformEvent("mine", "SET_DEFAULT_INVOICE_TITLE", { index: i }).catch(() => {});
  titles.value.forEach((t, k) => (t.def = k === i));
  uni.showToast({ title: "已设为默认抬头", icon: "none" });
}
function download(r: any) {
  if (r.status !== "已开具") return uni.showToast({ title: "开具中，暂不可下载", icon: "none" });
  void recordPlatformEvent("mine", "DOWNLOAD_INVOICE", { invoice_no: r.no }).catch(() => {});
  uni.showToast({ title: "电子发票已下载", icon: "success" });
}
</script>

<template>
  <view class="sg-page">
    <view class="hd">
      <text class="hd-t">发票管理</text>
      <text class="hd-s">增值税专用 / 普通发票 · 抬头管理 · 电子发票即时下载</text>
    </view>

    <view class="sg-card">
      <view class="sg-between"><text class="ct">发票抬头</text><text class="add" @tap="apply">＋ 申请开票</text></view>
      <view class="title" v-for="(t, i) in titles" :key="i" @tap="setDefault(i)">
        <view class="t-i">
          <view class="t-top"><text class="t-n">{{ t.name }}</text><text v-if="t.def" class="t-def">默认</text><text class="t-type">{{ t.type }}</text></view>
          <text class="t-tax">税号：{{ t.taxNo }}</text>
        </view>
        <view class="t-radio" :class="{ on: t.def }">{{ t.def ? '●' : '' }}</view>
      </view>
      <view v-if="productionBuild" class="empty">暂无后台发票抬头，请先完成主体授权。</view>
    </view>

    <view class="sg-card">
      <text class="ct">开票记录</text>
      <view class="rec" v-for="r in records" :key="r.no" @tap="download(r)">
        <view class="r-i">
          <text class="r-target">{{ r.target }}</text>
          <text class="r-no">{{ r.no }} · {{ r.time }}</text>
        </view>
        <view class="r-right">
          <text class="r-amt">¥{{ r.amount.toLocaleString() }}</text>
          <text class="r-st" :style="{ color: statusColor[r.status] }">{{ r.status }}{{ r.status === '已开具' ? ' · 下载' : '' }}</text>
        </view>
      </view>
      <view v-if="productionBuild" class="empty">暂无后台发票记录；发票必须绑定订单并通过金额核验。</view>
    </view>
    <view class="tip">🔗 发票与订单链上关联，开具/红冲全程留痕，支持批量导出对账。</view>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, $sg-primary, $sg-primary-deep); padding: 36rpx 28rpx; color: #fff; }
.hd-t { font-size: 32rpx; font-weight: 800; }
.hd-s { font-size: 21rpx; opacity: 0.9; margin-top: 8rpx; display: block; }
.ct { font-size: 28rpx; font-weight: 700; }
.add { font-size: 24rpx; color: $sg-primary; background: $sg-primary-light; padding: 8rpx 22rpx; border-radius: 999rpx; }
.title { display: flex; align-items: center; padding: 20rpx 0; border-top: 2rpx solid $sg-border; }
.t-i { flex: 1; display: flex; flex-direction: column; }
.t-top { display: flex; align-items: center; }
.t-n { font-size: 27rpx; font-weight: 600; }
.t-def { font-size: 19rpx; color: #fff; background: $sg-primary; padding: 2rpx 12rpx; border-radius: 6rpx; margin-left: 10rpx; }
.t-type { font-size: 20rpx; color: $sg-text-3; margin-left: 10rpx; }
.t-tax { font-size: 21rpx; color: $sg-text-3; margin-top: 4rpx; }
.t-radio { width: 40rpx; height: 40rpx; border-radius: 50%; border: 2rpx solid $sg-border; color: $sg-primary; display: flex; align-items: center; justify-content: center; font-size: 30rpx; }
.t-radio.on { border-color: $sg-primary; }
.rec { display: flex; justify-content: space-between; align-items: center; padding: 18rpx 0; border-top: 2rpx solid $sg-border; }
.r-i { flex: 1; display: flex; flex-direction: column; }
.r-target { font-size: 26rpx; font-weight: 600; }
.r-no { font-size: 21rpx; color: $sg-text-3; margin-top: 4rpx; }
.r-right { display: flex; flex-direction: column; align-items: flex-end; }
.r-amt { font-size: 28rpx; font-weight: 700; color: $sg-red; }
.r-st { font-size: 21rpx; margin-top: 4rpx; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
.empty { padding: 26rpx 0; color: $sg-text-3; font-size: 22rpx; line-height: 1.6; text-align: center; }
</style>
