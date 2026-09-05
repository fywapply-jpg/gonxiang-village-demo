<script setup lang="ts">
import { ref, computed } from "vue";
import { bidCase, bidScore } from "@/mock/procure";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const productionBlocked = () => uni.showModal({ title: "需后台招采服务", content: "正式环境的公告、报价、评标和中标结果必须来自后台招采单及授权采购岗位，当前页面不生成本地中标结果。", showCancel: false });

const opened = ref(false);
const flow = [
  { t: "① 发布采购公告", d: "机关食堂挂网发布采购包、预算与标准" },
  { t: "② 供应商在线报价", d: "合规供应商在线应标、上传资质" },
  { t: "③ 系统比价评标", d: "价格50% + 资质25% + 履约25% 综合评分" },
  { t: "④ 中标公示", d: "择优中标、结果公示、全程留痕" },
  { t: "⑤ 签约配送履约", d: "电子合同、按合同配送验收、票据合规" },
];

const ranked = computed(() => {
  return bidCase.bids
    .map((b) => ({ ...b, score: bidScore(b, bidCase.bids) }))
    .sort((a, b) => b.score - a.score);
});
const winner = computed(() => ranked.value[0]);

function open() { if (productionBuild) return productionBlocked(); opened.value = true; }
function award() {
  if (productionBuild) return productionBlocked();
  uni.showModal({ title: "中标公示", showCancel: false, confirmText: "知道了",
    content: `中标供应商：${winner.value.supplier}\n综合得分：${winner.value.score}\n中标价：¥${winner.value.price} 万\n\n结果已公示、全程留痕，进入 CA 数字证书电子签约（可信时间戳固化、上链存证）与配送履约。` });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🏛️ 机关企事业食堂 · 阳光招采</text>
      <text class="hs">线上比价 · 综合评标 · 中标公示 · 全程留痕可审计</text>
    </view>

    <!-- 招采公告 -->
    <view class="sg-card">
      <view class="bc-hd"><text class="bc-t">{{ bidCase.title }}</text><text class="bc-badge">招采中</text></view>
      <view class="bc-meta">
        <view class="bm"><text class="bmk">采购预算</text><text class="bmv">¥{{ bidCase.budget }} 万</text></view>
        <view class="bm"><text class="bmk">周期</text><text class="bmv">{{ bidCase.cycle }}</text></view>
        <view class="bm"><text class="bmk">应标</text><text class="bmv">{{ bidCase.bids.length }} 家</text></view>
      </view>
      <view class="items">
        <text class="it" v-for="i in bidCase.items" :key="i.name">{{ i.name }} · {{ i.qty }}</text>
      </view>
    </view>

    <!-- 招采流程 -->
    <view class="sec">阳光招采流程</view>
    <view class="sg-card">
      <view class="fl" v-for="(f, i) in flow" :key="i" :class="{ on: opened || i < 2 }">
        <view class="fl-axis"><view class="fl-dot" :class="{ on: opened || i < 2 }">{{ (opened || i < 2) ? '✓' : i + 1 }}</view><view v-if="i < flow.length - 1" class="fl-line" :class="{ on: opened || i < 1 }"></view></view>
        <view class="fl-i"><text class="fl-t">{{ f.t }}</text><text class="fl-d">{{ f.d }}</text></view>
      </view>
    </view>

    <!-- 比价评标 -->
    <view class="sec-row"><text class="sec">在线比价评标</text><text v-if="!opened" class="demo" @tap="open">▶ 开标</text><text v-else class="demo done">已开标</text></view>
    <view class="sg-card">
      <view class="bid" v-for="(b, i) in ranked" :key="b.short" :class="{ win: opened && i === 0 }">
        <view class="bid-l">
          <view class="bid-badge" :class="{ win: opened && i === 0 }">{{ b.short }}</view>
          <view class="bid-i">
            <view class="bid-row"><text class="bid-n">{{ b.supplier }}</text><text v-if="opened && i === 0" class="win-tag">中标</text></view>
            <text class="bid-cert">{{ b.cert }}</text>
          </view>
        </view>
        <view class="bid-r">
          <text class="bid-price">¥{{ b.price }}万</text>
          <text v-if="opened" class="bid-score">综合 {{ b.score }}</text>
          <text v-else class="bid-hide">待开标</text>
        </view>
      </view>
      <view v-if="opened" class="rule">评分 = 价格 50%（最低价满分）+ 资质 25% + 履约 25%；最低价未必中标，综合择优。</view>
      <view v-if="opened" class="award-btn" @tap="award">查看中标公示 ›</view>
    </view>

    <view class="tip">🔒 需求挂网、报价、评分、中标、合同、验收全程上链留痕，招采过程可审计、防围标防暗箱，符合阳光采购要求。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #d99a2b, #b5791b); padding: 32rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 32rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.95; margin-top: 8rpx; display: block; }
.sg-card { margin: 20rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.bc-hd { display: flex; align-items: center; justify-content: space-between; }
.bc-t { font-size: 28rpx; font-weight: 800; flex: 1; }
.bc-badge { font-size: 20rpx; color: #fff; background: $sg-gold; padding: 4rpx 16rpx; border-radius: 999rpx; }
.bc-meta { display: flex; margin: 18rpx 0; border-top: 2rpx solid $sg-border; padding-top: 16rpx; }
.bm { flex: 1; display: flex; flex-direction: column; }
.bmk { font-size: 20rpx; color: $sg-text-3; }
.bmv { font-size: 25rpx; font-weight: 700; margin-top: 4rpx; }
.items { display: flex; flex-wrap: wrap; gap: 12rpx; }
.it { font-size: 21rpx; color: $sg-text-2; background: $sg-bg; padding: 8rpx 16rpx; border-radius: 8rpx; }
.sec { font-size: 30rpx; font-weight: 700; padding: 26rpx 28rpx 12rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 24rpx; }
.demo { font-size: 24rpx; color: #fff; background: $sg-gold; padding: 8rpx 24rpx; border-radius: 999rpx; }
.demo.done { background: $sg-bg; color: $sg-text-3; }
.fl { display: flex; opacity: 0.45; transition: opacity 0.3s; }
.fl.on { opacity: 1; }
.fl-axis { display: flex; flex-direction: column; align-items: center; margin-right: 20rpx; }
.fl-dot { width: 44rpx; height: 44rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; }
.fl-dot.on { background: $sg-gold; }
.fl-line { flex: 1; width: 4rpx; background: $sg-border; min-height: 20rpx; margin: 4rpx 0; }
.fl-line.on { background: $sg-gold; }
.fl-i { flex: 1; display: flex; flex-direction: column; padding-bottom: 20rpx; }
.fl-t { font-size: 25rpx; font-weight: 600; }
.fl-d { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }
.bid { display: flex; align-items: center; justify-content: space-between; padding: 18rpx; border-radius: $sg-radius; border: 2rpx solid $sg-border; margin-bottom: 14rpx; }
.bid.win { border-color: $sg-gold; background: $sg-gold-light; }
.bid-l { display: flex; align-items: center; flex: 1; }
.bid-badge { width: 60rpx; height: 60rpx; border-radius: 14rpx; background: $sg-text-3; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 700; margin-right: 14rpx; }
.bid-badge.win { background: linear-gradient(135deg, #e6b451, #c8871f); }
.bid-i { flex: 1; display: flex; flex-direction: column; }
.bid-row { display: flex; align-items: center; }
.bid-n { font-size: 25rpx; font-weight: 700; }
.win-tag { font-size: 19rpx; color: #fff; background: $sg-gold; padding: 2rpx 12rpx; border-radius: 999rpx; margin-left: 10rpx; }
.bid-cert { font-size: 19rpx; color: $sg-text-3; margin-top: 4rpx; }
.bid-r { display: flex; flex-direction: column; align-items: flex-end; }
.bid-price { font-size: 28rpx; font-weight: 800; color: $sg-red; }
.bid-score { font-size: 20rpx; color: $sg-gold; font-weight: 700; margin-top: 4rpx; }
.bid-hide { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.rule { font-size: 20rpx; color: $sg-text-3; line-height: 1.5; margin-top: 6rpx; }
.award-btn { margin-top: 16rpx; text-align: center; padding: 20rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, $sg-gold, #b5791b); color: #fff; font-size: 25rpx; font-weight: 700; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
</style>
