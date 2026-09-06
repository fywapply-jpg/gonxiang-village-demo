<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

const orderId = ref("O240701");
onLoad((q) => { if (q?.id) orderId.value = q.id; });

const types = [
  { key: "refund", name: "退货退款", icon: "↩️" },
  { key: "exchange", name: "换货", icon: "🔄" },
  { key: "quality", name: "质量投诉", icon: "⚠️" },
  { key: "logistics", name: "物流投诉", icon: "🚚" },
];
const type = ref("refund");
const desc = ref("");
const submitted = ref(false);

function submit() {
  if (!desc.value) return uni.showToast({ title: "请填写问题描述", icon: "none" });
  if (productionBuild) return uni.showModal({ title: "需要后台工单服务", content: "正式环境的售后申请必须写入后台工单、绑定订单证据并由客服/质检岗位受理，当前未提交本地演示工单。", showCancel: false });
  submitted.value = true;
}
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty">
      <text class="production-empty-title">暂无后台售后工单档案</text>
      <text class="production-empty-text">正式环境的订单、物流、验收和争议证据必须由后台工单服务返回。本页面不展示本地订单号，也不会创建本地售后工单。</text>
    </view>
    <template v-else>
    <block v-if="!submitted">
      <view class="dispute-lk" @tap="uni.navigateTo({ url: '/pages/aftersale/dispute?id=' + orderId })">
        <text class="dl-ic">⚖️</text>
        <view class="dl-i"><text class="dl-t">生鲜质量争议 · 判责理赔闭环</text><text class="dl-d">磅差/腐烂/以次充好/拒收 → 调冷链·检测·溯源多源判责</text></view>
        <text class="dl-go">判责 ›</text>
      </view>
      <view class="sg-card">
        <text class="oid">订单 {{ orderId }} · 申请售后</text>
        <text class="lb">售后类型</text>
        <view class="types">
          <view class="type" :class="{ on: type === t.key }" v-for="t in types" :key="t.key" @tap="type = t.key">
            <text class="ty-ic">{{ t.icon }}</text><text class="ty-n">{{ t.name }}</text>
          </view>
        </view>
        <text class="lb">问题描述</text>
        <textarea class="ta" v-model="desc" placeholder="请描述遇到的问题，便于快速处理" />
        <view class="upload">📷 上传凭证照片</view>
      </view>
      <view class="tip">🎧 工单将转客服专员处理，进度可在此查询，链上留痕</view>
      <view class="bar"><view class="bar-btn" @tap="submit">提交工单</view></view>
    </block>

    <view v-else class="done">
      <text class="d-ic">🎫</text>
      <text class="d-t">售后工单已提交</text>
      <text class="d-no">工单号 TK{{ orderId }}</text>
      <view class="flow sg-card">
        <view class="fs"><view class="fd on">✓</view><text>已提交</text></view>
        <view class="fl on"></view>
        <view class="fs"><view class="fd doing">·</view><text>客服受理中</text></view>
        <view class="fl"></view>
        <view class="fs"><view class="fd">✔</view><text>处理完成</text></view>
      </view>
      <text class="d-tip">客服专员将在 24h 内联系您，结果通过微信订阅消息通知</text>
      <view class="d-link" @tap="uni.navigateTo({ url: '/pages/aftersale/review?id=' + orderId })">查看商家审核处理进度 ›</view>
      <view class="d-btn" @tap="uni.navigateBack()">返回</view>
    </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.dispute-lk { display: flex; align-items: center; margin-bottom: 20rpx; padding: 22rpx; background: linear-gradient(135deg, #fbeee9, #fff); border: 2rpx solid #f0d0c5; border-radius: $sg-radius-lg; }
.dl-ic { font-size: 44rpx; margin-right: 14rpx; }
.dl-i { flex: 1; display: flex; flex-direction: column; }
.dl-t { font-size: 26rpx; font-weight: 800; color: #b5563c; }
.dl-d { font-size: 19rpx; color: $sg-text-3; margin-top: 4rpx; line-height: 1.4; }
.dl-go { font-size: 22rpx; color: #fff; background: #b5563c; padding: 8rpx 18rpx; border-radius: 999rpx; }
.oid { font-size: 24rpx; color: $sg-text-3; display: block; margin-bottom: 8rpx; }
.lb { font-size: 26rpx; font-weight: 600; display: block; margin: 18rpx 0 12rpx; }
.types { display: flex; flex-wrap: wrap; gap: 16rpx; }
.type { width: calc(50% - 8rpx); display: flex; align-items: center; padding: 20rpx; border-radius: $sg-radius; border: 3rpx solid $sg-border; }
.type.on { border-color: $sg-primary; background: $sg-primary-light; }
.ty-ic { font-size: 34rpx; margin-right: 12rpx; }
.ty-n { font-size: 25rpx; font-weight: 600; }
.ta { width: 100%; height: 180rpx; background: $sg-bg; border-radius: $sg-radius; padding: 18rpx; font-size: 26rpx; }
.upload { margin-top: 16rpx; padding: 36rpx; border: 2rpx dashed $sg-border; border-radius: $sg-radius; text-align: center; color: $sg-text-3; font-size: 26rpx; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); }
.bar-btn { text-align: center; padding: 24rpx 0; border-radius: 999rpx; font-size: 30rpx; font-weight: 700; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; }
.done { display: flex; flex-direction: column; align-items: center; padding-top: 70rpx; }
.d-ic { font-size: 110rpx; }
.d-t { font-size: 32rpx; font-weight: 800; margin-top: 16rpx; }
.d-no { font-size: 24rpx; color: $sg-text-3; margin-top: 8rpx; }
.flow { display: flex; align-items: center; width: 86%; padding: 30rpx; }
.fs { display: flex; flex-direction: column; align-items: center; font-size: 21rpx; color: $sg-text-3; }
.fd { width: 48rpx; height: 48rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx; }
.fd.on { background: $sg-primary; }
.fd.doing { background: $sg-gold; }
.fl { flex: 1; height: 4rpx; background: $sg-border; margin: 0 6rpx 26rpx; }
.fl.on { background: $sg-primary; }
.d-tip { font-size: 22rpx; color: $sg-text-3; text-align: center; padding: 16rpx 50rpx; }
.d-link { font-size: 24rpx; color: $sg-primary; font-weight: 600; padding: 8rpx 0 18rpx; }
.d-btn { margin-top: 10rpx; width: 80%; text-align: center; padding: 24rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; font-size: 30rpx; font-weight: 700; }
.production-empty { margin: 48rpx 24rpx; padding: 34rpx 28rpx; border: 2rpx solid #d8e7de; border-radius: 22rpx; background: #f7fbf8; }
.production-empty-title { display: block; color: #145d3c; font-size: 32rpx; font-weight: 900; }
.production-empty-text { display: block; margin-top: 16rpx; color: #5e7167; font-size: 24rpx; line-height: 1.7; }
</style>
