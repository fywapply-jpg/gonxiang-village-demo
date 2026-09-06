<script setup lang="ts">
import { regions } from "@/mock/regions";
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
function assign(city: string) {
  if (productionBuild) return uni.showModal({ title: "需后台区域权限审批", content: `正式环境「${city}」区域权限必须在独立管理后台按组织层级、岗位和数据范围审批；当前未执行本地分配。`, showCancel: false });
  uni.showModal({ title: "区域权限分配", content: `为「${city}」指派区域管理员并设置数据权限范围（地市级）。`,
    confirmText: "确认分配", success: (r) => { if (r.confirm) uni.showToast({ title: "已分配", icon: "success" }); } });
}
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty">
      <text class="production-empty-title">暂无后台区域档案</text>
      <text class="production-empty-text">正式环境的区域中心、覆盖县乡村、服务半径、管理员和数据范围必须由后台区域服务按授权岗位返回。本页面不展示静态区域、人员或覆盖数量。</text>
    </view>
    <template v-else>
    <view class="hd">
      <text class="hd-t">区域管理 · 权限与范围</text>
      <text class="hd-s">以地市为中心 · 农批市场/分拣配送中心为枢纽 · 辐射地区供应链</text>
    </view>

    <view class="card" v-for="r in regions" :key="r.key">
      <!-- 区域中心 -->
      <view class="ctop">
        <view class="cl">
          <text class="city">{{ r.city }}</text>
          <text class="status" :class="{ build: r.status === '建设中' }">{{ r.status }}</text>
        </view>
        <text class="counties">覆盖 {{ r.counties }} 区县 · 辐射 {{ r.radiusKm }}km</text>
      </view>

      <!-- 中心枢纽 -->
      <view class="hub">
        <text class="hub-ic">🏛️</text>
        <view class="hub-i"><text class="hub-n">{{ r.hub }}</text><text class="hub-t">{{ r.hubType }} · 区域中心枢纽</text></view>
      </view>

      <!-- 辐射下游 -->
      <text class="rad-lb">↓ 辐射地区农产品供应链</text>
      <view class="radiate">
        <view class="rn" v-for="x in r.radiate" :key="x.name">
          <text class="rn-ic">{{ x.icon }}</text>
          <text class="rn-c">{{ x.count }}</text>
          <text class="rn-n">{{ x.name }}</text>
        </view>
      </view>

      <!-- 管理员 + 权限范围 -->
      <view class="mgr">
        <view class="mgr-i"><text class="mgr-l">区域管理员</text><text class="mgr-v">{{ r.manager }}</text></view>
        <view class="mgr-i"><text class="mgr-l">权限范围</text><text class="mgr-v">{{ r.scope }}</text></view>
      </view>
      <view class="assign" @tap="assign(r.city)">分配 / 调整区域权限</view>
    </view>

    <view class="tip">🔗 区域管理员仅可管理本地市范围内的商户、审核、结算与运营数据，权限逐级下放、越权隔离</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, #334155, #1e293b); padding: 36rpx 28rpx; color: #fff; }
.hd-t { font-size: 32rpx; font-weight: 800; }
.hd-s { font-size: 21rpx; opacity: 0.85; margin-top: 8rpx; display: block; }
.card { background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 24rpx 24rpx 0; padding: 24rpx; }
.ctop { display: flex; align-items: center; justify-content: space-between; }
.cl { display: flex; align-items: center; }
.city { font-size: 32rpx; font-weight: 800; }
.status { font-size: 19rpx; color: #fff; background: $sg-primary; padding: 2rpx 14rpx; border-radius: 999rpx; margin-left: 14rpx; }
.status.build { background: $sg-gold; }
.counties { font-size: 21rpx; color: $sg-text-3; }
.hub { display: flex; align-items: center; background: $sg-primary-light; border-radius: $sg-radius; padding: 18rpx; margin: 18rpx 0; }
.hub-ic { font-size: 44rpx; margin-right: 16rpx; }
.hub-i { display: flex; flex-direction: column; }
.hub-n { font-size: 27rpx; font-weight: 700; color: $sg-primary-deep; }
.hub-t { font-size: 20rpx; color: $sg-primary; margin-top: 2rpx; }
.rad-lb { font-size: 21rpx; color: $sg-text-3; display: block; margin-bottom: 12rpx; }
.radiate { display: flex; }
.rn { flex: 1; display: flex; flex-direction: column; align-items: center; }
.rn-ic { font-size: 40rpx; }
.rn-c { font-size: 30rpx; font-weight: 800; color: $sg-blue; margin-top: 4rpx; }
.rn-n { font-size: 18rpx; color: $sg-text-3; margin-top: 2rpx; text-align: center; }
.mgr { margin: 18rpx 0 14rpx; padding-top: 16rpx; border-top: 2rpx solid $sg-border; }
.mgr-i { display: flex; padding: 6rpx 0; }
.mgr-l { width: 150rpx; font-size: 23rpx; color: $sg-text-3; }
.mgr-v { flex: 1; font-size: 24rpx; font-weight: 600; }
.assign { text-align: center; padding: 18rpx 0; border-radius: 999rpx; background: #334155; color: #fff; font-size: 26rpx; font-weight: 600; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
.production-empty { margin: 40rpx 24rpx; padding: 34rpx 28rpx; border: 2rpx solid #d8e7de; border-radius: 22rpx; background: #f7fbf8; }
.production-empty-title { display: block; color: #145d3c; font-size: 32rpx; font-weight: 900; }
.production-empty-text { display: block; margin-top: 16rpx; color: #5e7167; font-size: 24rpx; line-height: 1.7; }
</style>
