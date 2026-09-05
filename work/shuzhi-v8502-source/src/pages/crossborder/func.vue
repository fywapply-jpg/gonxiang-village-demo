<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { cbFuncs, cbHubs, type CbFunc } from "@/mock/crossborder";
import { useUserStore } from "@/store/user";
import { recordPlatformEvent } from "@/services/localApi";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

const user = useUserStore();
const f = ref<CbFunc>(cbFuncs[0]);
const done = ref(false);
onLoad((q) => { const x = cbFuncs.find((i) => i.key === q?.key); if (x) f.value = x; });

const hubName = () => cbHubs.find((x) => x.key === user.hubKey)?.name || "";

function run() {
  if (productionBuild) return uni.showModal({ title: "需要跨境机构接入", content: "正式环境的报关、结算和跨境服务必须由海关/支付/物流等已接入机构返回受理结果，当前未提交跨境业务。", showCancel: false });
  // 国际贸易必须先进驻区域枢纽
  if (!user.hubKey) {
    return uni.showModal({
      title: "请先进驻区域枢纽",
      content: "按平台管理制度，国际贸易商家须先进驻对应区域枢纽，方可开展跨境业务并享受政策红利。",
      confirmText: "去进驻", success: (r) => { if (r.confirm) uni.navigateTo({ url: "/pages/crossborder/index" }); },
    });
  }
  void recordPlatformEvent("crossborder", "START_CROSSBORDER_SERVICE", { function_key: f.value.key, hub: hubName() }).catch(() => {});
  uni.showLoading({ title: "处理中…" });
  setTimeout(() => { uni.hideLoading(); done.value = true; }, 900);
}
</script>

<template>
  <view class="sg-page">
    <view class="hd">
      <text class="ic">{{ f.icon }}</text>
      <text class="name">{{ f.name }}</text>
      <text class="desc">{{ f.desc }}</text>
    </view>

    <view class="sg-card">
      <text class="ct">业务流程</text>
      <view class="step" v-for="(s, i) in f.steps" :key="i">
        <view class="axis"><view class="dot" :class="{ on: done || i === 0 }">{{ i + 1 }}</view><view v-if="i < f.steps.length - 1" class="line" :class="{ on: done }"></view></view>
        <text class="stext" :class="{ on: done }">{{ s }}</text>
      </view>
    </view>

    <view v-if="done" class="result sg-card">
      <text class="r-ic">✅</text>
      <view class="r-i"><text class="r-t">办理成功</text><text class="r-s">{{ f.result }}</text></view>
    </view>

    <view v-if="user.hubKey" class="hubtag">🏛️ 进驻枢纽：{{ hubName() }} · 享政策红利</view>
    <view class="note">🔗 全流程数据上链存证 · 数字人民币跨境结算 · 海关单一窗口对接</view>

    <view class="bar">
      <view class="bar-btn" @tap="run">{{ done ? '重新办理' : f.action }}</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, #1e5fa8, #133f73); padding: 44rpx 28rpx; color: #fff; display: flex; flex-direction: column; align-items: center; }
.ic { font-size: 88rpx; }
.name { font-size: 34rpx; font-weight: 800; margin-top: 12rpx; }
.desc { font-size: 22rpx; opacity: 0.9; margin-top: 10rpx; text-align: center; }
.ct { font-size: 27rpx; font-weight: 700; display: block; margin-bottom: 18rpx; }
.step { display: flex; }
.axis { display: flex; flex-direction: column; align-items: center; margin-right: 20rpx; }
.dot { width: 48rpx; height: 48rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 700; }
.dot.on { background: #1e5fa8; }
.line { flex: 1; width: 4rpx; background: $sg-border; min-height: 30rpx; margin: 4rpx 0; }
.line.on { background: #1e5fa8; }
.stext { flex: 1; font-size: 26rpx; padding: 10rpx 0 30rpx; color: $sg-text-2; }
.stext.on { color: $sg-text; font-weight: 600; }
.result { display: flex; align-items: center; background: linear-gradient(135deg, #eafaf0, #fff); border: 2rpx solid #c6ecd5; }
.r-ic { font-size: 56rpx; margin-right: 18rpx; }
.r-i { flex: 1; display: flex; flex-direction: column; }
.r-t { font-size: 28rpx; font-weight: 700; color: $sg-primary; }
.r-s { font-size: 23rpx; color: $sg-text-2; margin-top: 4rpx; }
.hubtag { margin: 20rpx 24rpx 0; font-size: 22rpx; color: #1e5fa8; background: #eef5ff; padding: 14rpx 20rpx; border-radius: $sg-radius; }
.note { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); }
.bar-btn { text-align: center; padding: 24rpx 0; border-radius: 999rpx; font-size: 30rpx; font-weight: 700; background: linear-gradient(135deg, #1e5fa8, #133f73); color: #fff; }
</style>
