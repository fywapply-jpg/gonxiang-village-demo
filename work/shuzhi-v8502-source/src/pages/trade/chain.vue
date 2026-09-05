<script setup lang="ts">
import { chainNodes } from "@/mock/chain";
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

function member(name: string, role: string) {
  if (productionBuild) return uni.showModal({ title: "需要后台供应链数据", showCancel: false, content: "正式环境供应链主体和成员档案由后台审核服务返回。" });
  uni.showModal({ title: name, content: role, showCancel: false, confirmText: "知道了" });
}
</script>

<template>
  <view class="sg-page">
    <view v-if="!productionBuild" class="hd">
      <text class="hd-t">农产品供应链闭环体系</text>
      <text class="hd-s">从田间到餐桌 · 全链主体协同 · 各环节功能凸显</text>
    </view>

    <!-- 闭环流转条 -->
    <view v-if="!productionBuild" class="loop">
      <view class="loop-row">
        <block v-for="(n, i) in chainNodes" :key="n.key">
          <view class="loop-node" :style="{ background: n.color }">{{ n.icon }}</view>
          <text v-if="i < chainNodes.length - 1" class="loop-arrow">→</text>
        </block>
      </view>
      <view class="loop-back">↺ 消费端订单反向拉动生产端（订单农业），形成闭环</view>
    </view>

    <!-- 各主体机构 -->
    <view v-if="!productionBuild" class="node" v-for="n in chainNodes" :key="n.key">
      <view class="node-hd">
        <view class="node-ic" :style="{ background: n.color }">{{ n.icon }}</view>
        <view class="node-i">
          <view class="node-row"><text class="node-n">{{ n.name }}</text><text class="node-stage" :style="{ color: n.color, background: n.color + '1a' }">{{ n.stage }}</text></view>
          <text class="node-role">{{ n.role }}</text>
        </view>
      </view>

      <view class="funcs">
        <text class="func" v-for="f in n.functions" :key="f" :style="{ color: n.color, borderColor: n.color + '55' }">{{ f }}</text>
      </view>

      <view class="members">
        <text class="mlabel">入驻机构</text>
        <view class="member" v-for="m in n.members" :key="m.name" @tap="member(m.name, n.role)">
          <text class="m-dot" :style="{ background: n.color }"></text>
          <text class="m-n">{{ m.name }}</text>
          <text class="m-s">{{ m.spec }}</text>
        </view>
      </view>
    </view>

    <view v-if="!productionBuild" class="tip">🔗 六类主体全部以企业法人 / 合作社主体入驻，业务数据全链上链，形成"产—加—流—销—消"可信闭环</view>
    <view v-else class="backend-note">正式环境供应链主体、成员和节点关系由后台审核与交易数据实时返回；当前未配置真实数据，已隐藏演示闭环。</view>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, $sg-primary, $sg-primary-deep); padding: 34rpx 28rpx; color: #fff; }
.hd-t { font-size: 34rpx; font-weight: 800; }
.hd-s { font-size: 22rpx; opacity: 0.9; margin-top: 8rpx; display: block; }

.loop { margin: 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.loop-row { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; }
.loop-node { width: 72rpx; height: 72rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-size: 38rpx; margin: 6rpx 0; }
.loop-arrow { color: $sg-text-3; margin: 0 6rpx; font-size: 26rpx; }
.loop-back { margin-top: 16rpx; font-size: 21rpx; color: $sg-primary; text-align: center; background: $sg-primary-light; padding: 12rpx; border-radius: $sg-radius; }

.node { margin: 0 24rpx 20rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.node-hd { display: flex; align-items: center; }
.node-ic { width: 84rpx; height: 84rpx; border-radius: 22rpx; display: flex; align-items: center; justify-content: center; font-size: 46rpx; margin-right: 18rpx; }
.node-i { flex: 1; display: flex; flex-direction: column; }
.node-row { display: flex; align-items: center; }
.node-n { font-size: 30rpx; font-weight: 700; }
.node-stage { font-size: 20rpx; padding: 3rpx 14rpx; border-radius: 999rpx; margin-left: 12rpx; }
.node-role { font-size: 22rpx; color: $sg-text-3; margin-top: 6rpx; }

.funcs { display: flex; flex-wrap: wrap; margin: 18rpx 0 8rpx; }
.func { font-size: 21rpx; padding: 6rpx 16rpx; border: 2rpx solid; border-radius: 999rpx; margin: 0 12rpx 12rpx 0; }

.members { border-top: 2rpx solid $sg-border; padding-top: 14rpx; }
.mlabel { font-size: 21rpx; color: $sg-text-3; display: block; margin-bottom: 8rpx; }
.member { display: flex; align-items: center; padding: 10rpx 0; }
.m-dot { width: 12rpx; height: 12rpx; border-radius: 50%; margin-right: 14rpx; flex-shrink: 0; }
.m-n { font-size: 26rpx; font-weight: 600; }
.m-s { font-size: 21rpx; color: $sg-text-3; margin-left: 12rpx; }

.tip { margin: 8rpx 24rpx 30rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
.backend-note { margin: 40rpx 28rpx; padding: 28rpx; border-radius: 24rpx; background: #fff8e8; color: #8a5a00; line-height: 1.6; font-size: 24rpx; }
</style>
