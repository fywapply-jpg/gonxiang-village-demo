<script setup lang="ts">
const TAB_PATHS = ["/pages/home/index", "/pages/trade/index", "/pages/trace/scan", "/pages/finance/index", "/pages/mine/index"];
function go(url: string) {
  const path = url.split("?")[0];
  if (TAB_PATHS.includes(path)) uni.switchTab({ url: path });
  else uni.navigateTo({ url });
}
function toast(t: string) { uni.showToast({ title: t, icon: "none" }); }

const biz = [
  { key: "prod", title: "生产服务", color: "#16884c", items: ["农资集采", "订单农业", "数字种植"], url: "/pages/agri/index" },
  { key: "flow", title: "流通服务", color: "#2b6cb0", items: ["供货/采购大厅", "仓储物流", "全国统一市场"], url: "/pages/trade/index" },
  { key: "credit", title: "信用服务", color: "#d99a2b", items: ["供应链金融", "粮食银行", "信用资产", "全民分红"], url: "/pages/finance/index" },
];
</script>

<template>
  <view class="sg-page arch">
    <!-- 定位层 -->
    <view class="layer top" @tap="toast('数智供社 · 全国性农产品数字供应链基础设施')">
      <text class="top-t">数智供社</text>
      <text class="top-s">全国性农产品供应链 + 金融服务 数字基础设施</text>
      <text class="top-tag">生产－流通－信用 三位一体 · 全民共富</text>
    </view>

    <text class="ltitle">业务体系 · 三位一体</text>
    <view class="biz-row">
      <view class="biz" v-for="b in biz" :key="b.key" :style="{ borderTopColor: b.color }" @tap="go(b.url)">
        <text class="biz-t" :style="{ color: b.color }">{{ b.title }}</text>
        <text class="biz-i" v-for="it in b.items" :key="it">{{ it }}</text>
      </view>
    </view>

    <!-- 民生终端 -->
    <view class="wide life" @tap="go('/pages/village/index')">
      <view class="wide-hd"><text class="wide-t">🏘️ 数智供社 · 民生终端</text><text class="wide-go">进入 ›</text></view>
      <view class="chips"><text class="chip">农产品直供</text><text class="chip">老年助餐</text><text class="chip">便民服务</text><text class="chip">社交健康</text></view>
    </view>

    <!-- 跨境 -->
    <view class="wide cross" @tap="go('/pages/crossborder/index')">
      <view class="wide-hd"><text class="wide-t">🌐 跨境贸易 · 五大枢纽</text><text class="wide-go">进入 ›</text></view>
      <view class="chips"><text class="chip b">海南</text><text class="chip b">上海</text><text class="chip b">新疆</text><text class="chip b">东北</text><text class="chip b">河南</text><text class="chip b">数字人民币结算</text></view>
    </view>

    <text class="ltitle">公共能力中台</text>
    <view class="mid">
      <text class="m-item">DID 身份</text><text class="m-item">可信溯源</text><text class="m-item">隐私计算</text>
      <text class="m-item">数字人民币结算</text><text class="m-item">智能风控</text>
    </view>

    <view class="ltitle-row"><text class="ltitle">技术底座 · 国家自主 Web3 双底座</text><text class="ltitle-go" @tap="go('/pages/arch/chain')">看底座 ›</text></view>
    <view class="base-row" @tap="go('/pages/arch/chain')">
      <view class="base"><text class="base-t">长安链</text><text class="base-s">存证监管层 · 国密加密</text></view>
      <view class="base"><text class="base-t">Conflux 树图链</text><text class="base-s">交易流转层 · 6000+ TPS</text></view>
    </view>
    <view class="tech-row">
      <text class="tech">ZKP 隐私加速芯片</text><text class="tech">国产算力</text><text class="tech">后量子安全</text>
    </view>

    <text class="ltitle">节点设施</text>
    <view class="node-row">
      <view class="node"><text class="node-n">7</text><text class="node-l">骨干枢纽</text></view>
      <view class="node"><text class="node-n">31</text><text class="node-l">省级节点</text></view>
      <view class="node"><text class="node-n">2800+</text><text class="node-l">县域节点</text></view>
    </view>

    <!-- 共富分配 -->
    <view class="gongfu">
      <text class="gf-t">💰 全民共富分配机制</text>
      <text class="gf-s">仅对依法表决并写入生效章程 / 专项合同的可分配增值收益执行分配；比例、基数与对象以项目台账为准</text>
    </view>

    <!-- 阶段 -->
    <view class="phases">
      <view class="ph"><text class="ph-t">试点</text><text class="ph-y">2026-28</text></view>
      <text class="ph-arrow">→</text>
      <view class="ph"><text class="ph-t">推广</text><text class="ph-y">2029-31</text></view>
      <text class="ph-arrow">→</text>
      <view class="ph"><text class="ph-t">引领</text><text class="ph-y">2032-35</text></view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.arch { padding: 24rpx 24rpx 60rpx; }
.layer, .wide, .mid, .base-row, .node-row, .gongfu, .phases, .biz-row, .tech-row { margin-bottom: 22rpx; }

.top { background: linear-gradient(135deg, #6d28d9, #c026d3); border-radius: $sg-radius-lg; padding: 34rpx; display: flex; flex-direction: column; align-items: center; color: #fff; }
.top-t { font-size: 44rpx; font-weight: 800; letter-spacing: 4rpx; }
.top-s { font-size: 22rpx; opacity: 0.92; margin-top: 8rpx; text-align: center; }
.top-tag { font-size: 20rpx; margin-top: 14rpx; border: 2rpx solid rgba(255,255,255,0.5); padding: 6rpx 20rpx; border-radius: 999rpx; }

.ltitle { display: block; font-size: 24rpx; font-weight: 700; color: $sg-text-2; padding: 6rpx 4rpx 12rpx; }
.ltitle-row { display: flex; align-items: baseline; justify-content: space-between; }
.ltitle-go { font-size: 22rpx; color: #7c3aed; font-weight: 700; padding: 6rpx 4rpx; }

.biz-row { display: flex; gap: 16rpx; }
.biz { flex: 1; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; border-top: 8rpx solid; padding: 20rpx 14rpx; display: flex; flex-direction: column; align-items: center; }
.biz-t { font-size: 26rpx; font-weight: 700; margin-bottom: 10rpx; }
.biz-i { font-size: 21rpx; color: $sg-text-2; padding: 3rpx 0; }

.wide { border-radius: $sg-radius-lg; padding: 22rpx 24rpx; }
.wide.life { background: linear-gradient(135deg, #fdeceb, #fff); border: 2rpx solid #f3c9c5; }
.wide.cross { background: linear-gradient(135deg, #eaf2fb, #fff); border: 2rpx solid #cadff2; }
.wide-hd { display: flex; align-items: center; justify-content: space-between; }
.wide-t { font-size: 28rpx; font-weight: 700; }
.wide-go { font-size: 22rpx; color: $sg-text-3; }
.chips { display: flex; flex-wrap: wrap; margin-top: 12rpx; }
.chip { font-size: 21rpx; color: #c0392b; background: #fff; border: 2rpx solid #f3c9c5; padding: 4rpx 16rpx; border-radius: 999rpx; margin: 6rpx 10rpx 0 0; }
.chip.b { color: #1e5fa8; border-color: #cadff2; }

.mid { display: flex; flex-wrap: wrap; background: #eef7f2; border-radius: $sg-radius; padding: 18rpx; }
.m-item { font-size: 22rpx; color: $sg-primary-deep; background: #fff; padding: 8rpx 18rpx; border-radius: 999rpx; margin: 6rpx; }

.base-row { display: flex; gap: 16rpx; }
.base { flex: 1; background: linear-gradient(135deg, #334155, #1e293b); color: #fff; border-radius: $sg-radius; padding: 22rpx; display: flex; flex-direction: column; align-items: center; }
.base-t { font-size: 27rpx; font-weight: 700; }
.base-s { font-size: 20rpx; opacity: 0.85; margin-top: 6rpx; }
.tech-row { display: flex; gap: 12rpx; }
.tech { flex: 1; text-align: center; font-size: 21rpx; color: $sg-text-2; background: #fff; box-shadow: $sg-shadow; border-radius: $sg-radius; padding: 14rpx 0; }

.node-row { display: flex; gap: 16rpx; }
.node { flex: 1; background: #fff; box-shadow: $sg-shadow; border-radius: $sg-radius; padding: 20rpx; display: flex; flex-direction: column; align-items: center; }
.node-n { font-size: 40rpx; font-weight: 800; color: $sg-primary; }
.node-l { font-size: 20rpx; color: $sg-text-3; }

.gongfu { background: linear-gradient(135deg, #d99a2b, #c8871f); border-radius: $sg-radius-lg; padding: 26rpx; display: flex; flex-direction: column; align-items: center; color: #fff; }
.gf-t { font-size: 28rpx; font-weight: 700; }
.gf-s { font-size: 21rpx; opacity: 0.95; margin-top: 8rpx; text-align: center; }

.phases { display: flex; align-items: center; justify-content: center; }
.ph { display: flex; flex-direction: column; align-items: center; background: #fff; box-shadow: $sg-shadow; border-radius: $sg-radius; padding: 16rpx 26rpx; }
.ph-t { font-size: 24rpx; font-weight: 700; color: $sg-primary; }
.ph-y { font-size: 20rpx; color: $sg-text-3; }
.ph-arrow { color: $sg-text-3; margin: 0 12rpx; }
</style>
