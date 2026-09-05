<script setup lang="ts">
import { banks, chainFin, riskLoop, compare } from "@/mock/bankfinance";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const totalCredit = banks.reduce((s, b) => s + b.credit, 0);
const totalUsed = banks.reduce((s, b) => s + b.used, 0);
const useRate = Math.round((totalUsed / totalCredit) * 100);

function connect(name: string) {
  if (productionBuild) return uni.showModal({ title: "需要后台金融数据", showCancel: false, content: "正式环境须接入持牌银行的授信、用信和回款接口后才能查看或发起融资。" });
  uni.showModal({ title: "银企直连", showCancel: false, confirmText: "了解",
    content: `${name} 已通过 API 与平台直连，基于链上真实交易数据自动授信、放款与回款核销，实现资金闭环监管。` });
}
function openFin(c: any) {
  if (productionBuild) return uni.showModal({ title: "需要后台金融数据", showCancel: false, content: "正式环境金融产品由持牌机构返回，当前未配置真实机构接口。" });
  if ((c.product || "").includes("保理")) return uni.navigateTo({ url: "/pages/finance/factoring" });
  uni.showModal({ title: c.stage + " · " + c.product, showCancel: false, confirmText: "了解",
    content: `${c.basis}，对接 ${c.bank}，基于链上真实交易数据自动授信与放款。` });
}
</script>

<template>
  <view class="sg-page">
    <view v-if="!productionBuild" class="hd">
      <text class="hd-t">供应链金融闭环</text>
      <text class="hd-s">银企直连 · 覆盖全链环节 · 控风险 · 提效率 · 提资金使用率</text>
      <view class="kpis">
        <view class="k"><text class="kn">{{ totalCredit }}亿</text><text class="kl">银行授信</text></view>
        <view class="k"><text class="kn">{{ totalUsed }}亿</text><text class="kl">已投放</text></view>
        <view class="k"><text class="kn">{{ useRate }}%</text><text class="kl">资金使用率</text></view>
      </view>
    </view>

    <!-- 合作银行 -->
    <view v-if="!productionBuild" class="sec">🏦 银企直连 · 合作银行</view>
    <view v-if="!productionBuild" class="bank" v-for="b in banks" :key="b.name" @tap="connect(b.name)">
      <view class="b-badge">{{ b.short }}</view>
      <view class="b-i">
        <view class="b-top"><text class="b-n">{{ b.name }}</text><text class="b-rate">{{ b.rate }}</text></view>
        <view class="b-bar"><view class="b-fill" :style="{ width: (b.used / b.credit * 100) + '%' }"></view></view>
        <view class="b-meta"><text>授信 {{ b.credit }}亿 · 已投放 {{ b.used }}亿</text><text class="b-prod">{{ b.products.join(" / ") }}</text></view>
      </view>
    </view>

    <!-- 主办银行制入口 -->
    <view v-if="!productionBuild" class="mainbank" @tap="() => uni.navigateTo({ url: '/pages/finance/bankbid' })">
      <text class="mb-ic">🏆</text>
      <view class="mb-i"><text class="mb-t">主办银行制 · 银行竞标</text><text class="mb-s">一笔业务一家主办行行内闭环 · 多行公平有序竞标择优</text></view>
      <text class="mb-go">进入 ›</text>
    </view>

    <!-- 各环节金融闭环 -->
    <view v-if="!productionBuild" class="sec">🔗 供应链各环节金融闭环</view>
    <view v-if="!productionBuild" class="fin" v-for="(c, i) in chainFin" :key="c.stage" @tap="openFin(c)">
      <view class="f-ic" :style="{ background: c.color }">{{ c.icon }}</view>
      <view class="f-i">
        <view class="f-top"><text class="f-stage">{{ c.stage }}</text><text class="f-bank">对接 {{ c.bank }}</text></view>
        <text class="f-prod">{{ c.product }}<text v-if="(c.product || '').includes('保理')" class="f-link"> · 进入保理 ›</text></text>
        <text class="f-basis">{{ c.basis }}</text>
      </view>
      <view v-if="i < chainFin.length - 1" class="f-arrow">↓</view>
    </view>
    <view v-if="!productionBuild" class="loop-note">💡 货款经统一结算自动回流银行、优先偿贷 → 银行额度释放 → 再投放下一笔，形成资金闭环</view>

    <!-- 风控闭环 -->
    <view v-if="!productionBuild" class="sec">🛡️ 全链路风控闭环</view>
    <view v-if="!productionBuild" class="sg-card">
      <view class="risk" v-for="(r, i) in riskLoop" :key="i">
        <view class="r-no">{{ i + 1 }}</view>
        <view class="r-i"><text class="r-t">{{ r.t }}</text><text class="r-d">{{ r.d }}</text></view>
      </view>
    </view>

    <!-- 效率 & 资金使用率对比 -->
    <view v-if="!productionBuild" class="sec">📈 效率与资金使用率提升</view>
    <view v-if="!productionBuild" class="sg-card">
      <view class="cmp head"><text class="c-k">指标</text><text class="c-o">传统模式</text><text class="c-n">数智供社</text></view>
      <view class="cmp" v-for="c in compare" :key="c.k">
        <text class="c-k">{{ c.k }}</text>
        <text class="c-o">{{ c.old }}</text>
        <text class="c-n up">{{ c.now }} ↑</text>
      </view>
    </view>
    <view v-if="!productionBuild" class="tip">🔒 平台不触碰资金，仅提供数据与撮合；放款、还款由持牌银行闭环办理，风险可控、资金高效</view>
    <view v-else class="backend-note">正式环境金融指标、银行产品和授信数据由后台持牌机构接口实时返回；当前未配置真实机构数据，已隐藏演示数据。</view>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, #d99a2b, #c8871f); padding: 36rpx 28rpx 28rpx; color: #fff; }
.hd-t { font-size: 34rpx; font-weight: 800; }
.hd-s { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; }
.kpis { display: flex; margin-top: 24rpx; }
.k { flex: 1; text-align: center; }
.kn { font-size: 40rpx; font-weight: 800; display: block; }
.kl { font-size: 20rpx; opacity: 0.9; }
.sec { padding: 26rpx 28rpx 12rpx; font-size: 28rpx; font-weight: 700; }
.mainbank { display: flex; align-items: center; margin: 20rpx 24rpx 0; padding: 24rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #fff6e6, #fff); border: 2rpx solid #f0dcae; box-shadow: $sg-shadow; }
.mb-ic { font-size: 48rpx; margin-right: 18rpx; }
.mb-i { flex: 1; display: flex; flex-direction: column; }
.mb-t { font-size: 27rpx; font-weight: 700; }
.mb-s { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.mb-go { font-size: 23rpx; color: $sg-gold; }

.bank { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 16rpx; padding: 22rpx; }
.b-badge { width: 72rpx; height: 72rpx; border-radius: 20rpx; background: linear-gradient(135deg, #d99a2b, #c8871f); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 800; margin-right: 18rpx; }
.b-i { flex: 1; }
.b-top { display: flex; align-items: center; justify-content: space-between; }
.b-n { font-size: 27rpx; font-weight: 700; }
.b-rate { font-size: 22rpx; color: $sg-red; }
.b-bar { height: 12rpx; background: $sg-bg; border-radius: 6rpx; margin: 10rpx 0 8rpx; overflow: hidden; }
.b-fill { height: 100%; background: linear-gradient(90deg, #d99a2b, #16884c); }
.b-meta { display: flex; justify-content: space-between; }
.b-meta text { font-size: 20rpx; color: $sg-text-3; }
.b-prod { color: $sg-gold !important; }

.fin { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 16rpx; padding: 22rpx; position: relative; }
.f-ic { width: 68rpx; height: 68rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-size: 34rpx; margin-right: 18rpx; }
.f-i { flex: 1; display: flex; flex-direction: column; }
.f-top { display: flex; align-items: center; justify-content: space-between; }
.f-stage { font-size: 27rpx; font-weight: 700; }
.f-bank { font-size: 20rpx; color: $sg-gold; background: $sg-gold-light; padding: 2rpx 12rpx; border-radius: 999rpx; }
.f-prod { font-size: 24rpx; color: $sg-text; margin: 4rpx 0; }
.f-link { font-size: 21rpx; color: $sg-gold; font-weight: 600; }
.f-basis { font-size: 21rpx; color: $sg-text-3; }
.f-arrow { position: absolute; bottom: -14rpx; left: 46rpx; color: $sg-gold; font-size: 26rpx; z-index: 2; }
.loop-note { margin: 4rpx 24rpx; font-size: 22rpx; color: $sg-gold; background: $sg-gold-light; padding: 16rpx 20rpx; border-radius: $sg-radius; line-height: 1.5; }

.risk { display: flex; align-items: flex-start; padding: 12rpx 0; border-bottom: 2rpx solid $sg-border; }
.risk:last-child { border-bottom: none; }
.r-no { width: 40rpx; height: 40rpx; border-radius: 50%; background: $sg-primary; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 700; margin-right: 16rpx; flex-shrink: 0; }
.r-i { flex: 1; display: flex; flex-direction: column; }
.r-t { font-size: 25rpx; font-weight: 600; }
.r-d { font-size: 21rpx; color: $sg-text-3; margin-top: 2rpx; }

.cmp { display: flex; align-items: center; padding: 14rpx 0; border-top: 2rpx solid $sg-border; }
.cmp.head { border-top: none; }
.cmp.head text { font-size: 21rpx; color: $sg-text-3; }
.c-k { flex: 1.4; font-size: 24rpx; }
.c-o { flex: 1; text-align: center; font-size: 23rpx; color: $sg-text-3; }
.c-n { flex: 1; text-align: right; font-size: 24rpx; }
.c-n.up { color: $sg-primary; font-weight: 700; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
.backend-note { margin: 40rpx 28rpx; padding: 28rpx; border-radius: $sg-radius-lg; background: #fff8e8; color: #8a5a00; line-height: 1.6; font-size: 24rpx; }
</style>
