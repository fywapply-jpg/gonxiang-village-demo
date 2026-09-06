<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { cbHubs, type CbHub } from "@/mock/crossborder";
import { useUserStore } from "@/store/user";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const user = useUserStore();
const h = ref<CbHub>(cbHubs[0]);
onLoad((q) => { const f = cbHubs.find((x) => x.key === q?.key); if (f) h.value = f; });

const settled = computed(() => user.hubKey === h.value.key);
const settledOther = computed(() => user.hubKey && user.hubKey !== h.value.key);
const otherName = computed(() => cbHubs.find((x) => x.key === user.hubKey)?.name || "");

function settle() {
  if (productionBuild) return uni.showModal({ title: "需要跨境枢纽服务", content: "正式环境的枢纽进驻必须由后台完成主体、海关/外汇和区域权限审核，当前未写入进驻状态。", showCancel: false });
  if (user.isVisitor || user.certStatus !== "approved") {
    return uni.showModal({
      title: "需完成企业入驻", content: "国际贸易须以已认证的企业法人主体进驻区域枢纽。是否前往企业入驻？",
      confirmText: "去入驻", success: (r) => { if (r.confirm) uni.navigateTo({ url: "/pages/register/index" }); },
    });
  }
  const doSettle = () => {
    user.settleHub(h.value.key);
    uni.showToast({ title: "已进驻 " + h.value.name, icon: "success" });
  };
  if (settledOther.value) {
    uni.showModal({ title: "变更进驻枢纽", content: `当前已进驻「${otherName.value}」，确认变更为「${h.value.name}」？`,
      confirmText: "确认变更", success: (r) => { if (r.confirm) doSettle(); } });
  } else {
    uni.showModal({ title: "进驻 " + h.value.name, content: "进驻后即可开展该枢纽跨境业务，享受对应政策红利，并遵守枢纽管理制度。",
      confirmText: "确认进驻", success: (r) => { if (r.confirm) doSettle(); } });
  }
}
function func(key: string) { uni.navigateTo({ url: `/pages/crossborder/func?key=${key}` }); }
</script>

<template>
  <view class="sg-page">
    <view class="hd">
      <view class="hd-top">
        <view class="badge" :class="{ core: h.core }">{{ h.short }}</view>
        <view class="hd-i">
          <view class="hd-row"><text class="name">{{ h.name }}</text><text v-if="h.core" class="core">核心枢纽</text></view>
          <text class="region">📍 {{ h.region }}</text>
        </view>
        <view v-if="settled" class="settled-tag">✔ 已进驻</view>
      </view>
      <view class="kpis">
        <view class="kpi"><text class="kn">{{ h.flow }}</text><text class="kl">贸易方向</text></view>
        <view class="kpi"><text class="kn">{{ h.volume }}</text><text class="kl">规模</text></view>
      </view>
    </view>

    <!-- 政策红利 -->
    <view class="sg-card policy">
      <text class="ct">🎁 政策红利<text class="ct-tip">进驻本枢纽即可享受</text></text>
      <view class="pl" v-for="p in h.policies" :key="p"><text class="pl-dot">✔</text><text>{{ p }}</text></view>
    </view>

    <!-- 管理制度 -->
    <view class="sg-card rule">
      <text class="ct">📋 管理制度<text class="ct-tip">进驻商家须遵守</text></text>
      <view class="rl" v-for="r in h.rules" :key="r"><text class="rl-dot">§</text><text>{{ r }}</text></view>
    </view>

    <view class="sg-card">
      <text class="ct">🚢 口岸 / 通道</text>
      <text class="channel">{{ h.channel }}</text>
      <view class="chips"><text class="chip" v-for="p in h.ports" :key="p">{{ p }}</text></view>
    </view>

    <view class="sg-card">
      <text class="ct">📦 主营品类</text>
      <view class="chips"><text class="chip green" v-for="g in h.goods" :key="g">{{ g }}</text></view>
    </view>

    <view class="sg-card">
      <text class="ct">🏬 海外仓布局</text>
      <text class="oversea">{{ h.overseas }}</text>
    </view>

    <view class="bar">
      <block v-if="settled">
        <view class="bar-btn ghost" @tap="func('customs')">🛃 海关申报</view>
        <view class="bar-btn" @tap="func('match')">🤝 开展业务</view>
      </block>
      <view v-else class="bar-btn full" @tap="settle">{{ settledOther ? '变更进驻至本枢纽' : '进驻本枢纽' }}</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, #1e5fa8, #133f73); padding: 36rpx 28rpx 28rpx; color: #fff; }
.hd-top { display: flex; align-items: center; }
.badge { width: 88rpx; height: 88rpx; border-radius: 24rpx; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 44rpx; font-weight: 800; margin-right: 20rpx; }
.badge.core { background: $sg-gold; }
.hd-i { display: flex; flex-direction: column; flex: 1; }
.hd-row { display: flex; align-items: center; }
.name { font-size: 34rpx; font-weight: 800; }
.core { font-size: 19rpx; background: $sg-gold; padding: 2rpx 12rpx; border-radius: 999rpx; margin-left: 12rpx; }
.region { font-size: 22rpx; opacity: 0.9; margin-top: 6rpx; }
.settled-tag { font-size: 21rpx; background: #16c784; color: #fff; padding: 6rpx 16rpx; border-radius: 999rpx; }
.kpis { display: flex; margin-top: 24rpx; }
.kpi { flex: 1; }
.kn { font-size: 30rpx; font-weight: 800; display: block; }
.kl { font-size: 20rpx; opacity: 0.85; }

.ct { font-size: 27rpx; font-weight: 700; display: block; margin-bottom: 14rpx; }
.ct-tip { font-size: 20rpx; color: $sg-text-3; font-weight: 400; margin-left: 12rpx; }
.policy { background: linear-gradient(135deg, #fff8ec, #fff); border: 2rpx solid #f0e0c0; }
.pl { display: flex; align-items: center; padding: 8rpx 0; font-size: 25rpx; }
.pl-dot { color: $sg-gold; margin-right: 12rpx; font-weight: 700; }
.rule { background: linear-gradient(135deg, #eef5ff, #fff); border: 2rpx solid #d6e4f5; }
.rl { display: flex; align-items: center; padding: 8rpx 0; font-size: 25rpx; }
.rl-dot { color: #1e5fa8; margin-right: 12rpx; font-weight: 700; }

.channel { font-size: 24rpx; color: $sg-text-2; display: block; margin-bottom: 12rpx; }
.oversea { font-size: 26rpx; color: $sg-blue; font-weight: 600; }
.chips { display: flex; flex-wrap: wrap; }
.chip { font-size: 22rpx; color: #1e5fa8; background: #eef5ff; padding: 8rpx 18rpx; border-radius: 999rpx; margin: 0 12rpx 12rpx 0; }
.chip.green { color: $sg-primary; background: $sg-primary-light; }

.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; display: flex; gap: 20rpx; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.05); }
.bar-btn { flex: 1; text-align: center; padding: 24rpx 0; border-radius: 999rpx; font-size: 29rpx; font-weight: 700; background: linear-gradient(135deg, #1e5fa8, #133f73); color: #fff; }
.bar-btn.ghost { flex: 0 0 42%; background: #eef5ff; color: #1e5fa8; }
.bar-btn.full { flex: 1; }
</style>
