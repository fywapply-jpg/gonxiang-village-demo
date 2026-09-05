<script setup lang="ts">
import { ref } from "vue";
import { cbHubs } from "@/mock/crossborder";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

// 招商推荐：主营品类 → 推荐枢纽
const recos = [
  { cat: "热带水果", hub: "hainan" },
  { cat: "进口生鲜", hub: "shanghai" },
  { cat: "干果坚果", hub: "xinjiang" },
  { cat: "粮食大豆", hub: "dongbei" },
  { cat: "预制菜", hub: "henan" },
];
const pick = ref("");
function reco(cat: string, hubKey: string) { pick.value = pick.value === cat ? "" : cat; return hubKey; }
const highlightHub = () => recos.find((r) => r.cat === pick.value)?.hub || "";

const rows = [
  { key: "flow", label: "贸易方向", h: 70 },
  { key: "goods", label: "主营品类", h: 130 },
  { key: "policy", label: "核心政策红利", h: 190 },
  { key: "channel", label: "口岸 / 通道", h: 110 },
  { key: "volume", label: "年规模", h: 70 },
  { key: "overseas", label: "海外仓", h: 90 },
];
function cell(hub: any, key: string): string {
  if (key === "goods") return hub.goods.join("、");
  if (key === "policy") return hub.policies.slice(0, 3).join("；");
  return hub[key];
}
function hub(key: string) { if (productionBuild) return uni.showModal({ title: "需要后台枢纽数据", showCancel: false, content: "正式环境跨境枢纽和政策信息由后台及口岸机构接口返回。" }); uni.navigateTo({ url: `/pages/crossborder/hub?key=${key}` }); }
</script>

<template>
  <view class="sg-page">
    <view v-if="!productionBuild" class="hd">
      <text class="hd-t">五大枢纽对比</text>
      <text class="hd-s">按主营品类推荐枢纽 · 一屏对比政策红利，选择进驻</text>
    </view>

    <!-- 招商推荐 -->
    <view v-if="!productionBuild" class="reco">
      <text class="reco-t">我主营：</text>
      <scroll-view scroll-x class="reco-chips">
        <text v-for="r in recos" :key="r.cat" class="chip" :class="{ on: pick === r.cat }" @tap="reco(r.cat, r.hub)">{{ r.cat }}</text>
      </scroll-view>
    </view>
    <view v-if="!productionBuild && pick" class="reco-hint">
      👉 主营「{{ pick }}」推荐进驻 <text class="rh-hub">{{ cbHubs.find(h=>h.key===highlightHub())?.name }}</text>
    </view>

    <!-- 对比表 -->
    <view v-if="!productionBuild" class="table">
      <!-- 固定标签列 -->
      <view class="labelcol">
        <view class="lhead">对比项</view>
        <view class="lcell" v-for="r in rows" :key="r.key" :style="{ height: r.h + 'rpx' }">{{ r.label }}</view>
        <view class="lcell act">操作</view>
      </view>
      <!-- 可横滑枢纽列 -->
      <scroll-view scroll-x class="hubcols">
        <view class="hubcol" v-for="h in cbHubs" :key="h.key" :class="{ hl: highlightHub() === h.key }">
          <view class="hhead">
            <view class="hbadge" :class="{ core: h.core }">{{ h.short }}</view>
            <text class="hname">{{ h.name.replace('枢纽','') }}</text>
            <text v-if="highlightHub() === h.key" class="reco-tag">推荐</text>
          </view>
          <view class="hcell" v-for="r in rows" :key="r.key" :style="{ height: r.h + 'rpx' }">{{ cell(h, r.key) }}</view>
          <view class="hcell act"><view class="join" @tap="hub(h.key)">查看 / 进驻</view></view>
        </view>
      </scroll-view>
    </view>

    <view v-if="!productionBuild" class="tip">🏛️ 国际贸易商家须进驻对应枢纽，方可享该枢纽政策红利并遵守其管理制度</view>
    <view v-else class="backend-note">正式环境跨境枢纽、品类、政策和口岸通道数据由后台及机构接口实时返回；当前未配置真实数据，已隐藏演示对比表。</view>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, #1e5fa8, #133f73); padding: 34rpx 28rpx; color: #fff; }
.hd-t { font-size: 34rpx; font-weight: 800; }
.hd-s { font-size: 22rpx; opacity: 0.9; margin-top: 8rpx; display: block; }

.reco { display: flex; align-items: center; padding: 24rpx 24rpx 4rpx; }
.reco-t { font-size: 25rpx; font-weight: 600; flex-shrink: 0; }
.reco-chips { white-space: nowrap; flex: 1; }
.chip { display: inline-block; font-size: 24rpx; color: #1e5fa8; background: #eef5ff; padding: 8rpx 24rpx; border-radius: 999rpx; margin-right: 12rpx; }
.chip.on { background: #1e5fa8; color: #fff; }
.reco-hint { margin: 12rpx 24rpx 0; font-size: 23rpx; color: $sg-text-2; background: #fff8ec; padding: 14rpx 18rpx; border-radius: $sg-radius; }
.rh-hub { color: $sg-gold; font-weight: 700; }

.table { display: flex; margin: 20rpx 24rpx; border-radius: $sg-radius-lg; overflow: hidden; box-shadow: $sg-shadow; background: #fff; }
.labelcol { width: 150rpx; flex-shrink: 0; background: #f4f7fb; }
.lhead { height: 96rpx; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 700; color: $sg-text-2; }
.lcell { display: flex; align-items: center; padding: 0 16rpx; font-size: 22rpx; color: $sg-text-2; font-weight: 600; border-top: 2rpx solid #e6ecf3; }
.lcell.act { height: 96rpx; }

.hubcols { white-space: nowrap; flex: 1; }
.hubcol { display: inline-block; width: 280rpx; vertical-align: top; border-left: 2rpx solid #eef1f5; }
.hubcol.hl { background: #fffdf5; box-shadow: inset 0 0 0 4rpx $sg-gold; }
.hhead { height: 96rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative; }
.hbadge { width: 48rpx; height: 48rpx; border-radius: 14rpx; background: #dbeafe; color: #1e5fa8; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 800; }
.hbadge.core { background: $sg-gold; color: #fff; }
.hname { font-size: 21rpx; margin-top: 4rpx; font-weight: 600; }
.reco-tag { position: absolute; top: 4rpx; right: 8rpx; font-size: 17rpx; color: #fff; background: $sg-gold; padding: 1rpx 8rpx; border-radius: 999rpx; }
.hcell { display: flex; align-items: center; padding: 8rpx 16rpx; font-size: 21rpx; color: $sg-text; border-top: 2rpx solid #eef1f5; white-space: normal; line-height: 1.35; overflow: hidden; }
.hcell.act { height: 96rpx; }
.join { background: linear-gradient(135deg, #1e5fa8, #133f73); color: #fff; font-size: 21rpx; padding: 12rpx 0; border-radius: 999rpx; text-align: center; width: 100%; }

.tip { margin: 8rpx 24rpx 30rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
.backend-note { margin: 40rpx 28rpx; padding: 28rpx; border-radius: $sg-radius-lg; background: #fff8e8; color: #8a5a00; line-height: 1.6; font-size: 24rpx; }
</style>
