<script setup lang="ts">
import { ref } from "vue";
import { recordPlatformEvent } from "@/services/localApi";
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const types = ["功能建议", "体验问题", "数据错误", "投诉举报", "其他"];
const type = ref("功能建议");
const text = ref("");
const contact = ref("");
const submitted = ref(false);

async function submit() {
  if (!text.value.trim()) return uni.showToast({ title: "请填写反馈内容", icon: "none" });
  try {
    await recordPlatformEvent("mine", "SUBMIT_FEEDBACK", { type: type.value, content: text.value.slice(0, 200), contact: contact.value });
    submitted.value = true;
  } catch (error) {
    if (productionBuild) return uni.showModal({ title: "反馈未提交", content: (error as Error).message || "正式环境后台反馈服务暂不可用，请稍后重试。", showCancel: false });
    submitted.value = true;
  }
}
</script>

<template>
  <view class="sg-page">
    <block v-if="!submitted">
      <view class="sg-card">
        <text class="lb">反馈类型</text>
        <view class="chips"><text v-for="t in types" :key="t" class="chip" :class="{ on: type === t }" @tap="type = t">{{ t }}</text></view>
        <text class="lb">反馈内容</text>
        <textarea class="ta" v-model="text" placeholder="请描述你遇到的问题或建议，越具体我们越好改进" maxlength="500" />
        <text class="count">{{ text.length }}/500</text>
        <text class="lb">联系方式（选填）</text>
        <input class="ip" v-model="contact" placeholder="手机号 / 微信，方便我们回访" />
        <view class="upload">📷 上传截图（选填）</view>
      </view>
      <view class="tip">💡 我们会认真看每一条反馈；紧急问题可在「账号安全 → 客服」直接联系。</view>
      <view class="bar"><view class="bar-btn" @tap="submit">提交反馈</view></view>
    </block>

    <view v-else class="done">
      <text class="d-ic">💚</text>
      <text class="d-t">反馈已提交</text>
      <text class="d-s">感谢你的 {{ type }}！我们会尽快处理，需要时会通过你留的联系方式回访。</text>
      <view class="d-btn" @tap="uni.navigateBack()">返回</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.lb { font-size: 26rpx; font-weight: 600; display: block; margin: 18rpx 0 12rpx; }
.lb:first-child { margin-top: 0; }
.chips { display: flex; flex-wrap: wrap; gap: 14rpx; }
.chip { font-size: 24rpx; color: $sg-text-2; background: $sg-bg; padding: 10rpx 24rpx; border-radius: 999rpx; }
.chip.on { background: $sg-primary; color: #fff; }
.ta { width: 100%; height: 200rpx; background: $sg-bg; border-radius: $sg-radius; padding: 18rpx; font-size: 26rpx; }
.count { font-size: 20rpx; color: $sg-text-3; text-align: right; display: block; }
.ip { background: $sg-bg; border-radius: $sg-radius; padding: 18rpx; font-size: 26rpx; }
.upload { margin-top: 16rpx; padding: 34rpx; border: 2rpx dashed $sg-border; border-radius: $sg-radius; text-align: center; color: $sg-text-3; font-size: 25rpx; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); }
.bar-btn { text-align: center; padding: 24rpx 0; border-radius: 999rpx; font-size: 30rpx; font-weight: 700; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; }
.done { display: flex; flex-direction: column; align-items: center; padding-top: 90rpx; }
.d-ic { font-size: 120rpx; }
.d-t { font-size: 34rpx; font-weight: 800; margin-top: 16rpx; }
.d-s { font-size: 24rpx; color: $sg-text-3; text-align: center; padding: 12rpx 60rpx; line-height: 1.6; }
.d-btn { margin-top: 20rpx; width: 60%; text-align: center; padding: 24rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; font-size: 30rpx; font-weight: 700; }
</style>
