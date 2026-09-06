<script setup lang="ts">
import { ref, computed } from "vue";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

// 一笔订单贷的全生命周期
const loan = {
  no: "LN-2026-0781", product: "订单贷", amount: 138, rate: "3.85%", term: "随借随还",
  bank: "中国农业银行（主办行）", order: "O240701 · 赣南脐橙 30 吨 · ¥138,000",
  supplier: "赣南脐橙合作社", disbursed: "2026-07-02", repay: "按贷款合同及有效授权由银行扣收",
};

// 生命周期 7 阶段
const phases = [
  { t: "额度测算", d: "按链上订单/信用分预估可贷额度", meta: "可贷 ¥52 万 · 利率 4.1%", done: true },
  { t: "在线申请", d: "上传营业执照/订单，国密加密", meta: "资料齐全", done: true },
  { t: "银行竞标 · 择优", d: "多行竞标，主办行行内闭环", meta: "农行中标 · 评分 95", done: true },
  { t: "授信放款", d: "银企直连 T+0 放款", meta: "放款 ¥13.8 万 · 07-02", done: true },
  { t: "受托支付", d: "款项定向支付上游供应商", meta: "→ 赣南脐橙合作社", done: true, cur: true },
  { t: "回款还款", d: "银行依据贷款合同、还款账户和客户有效授权执行扣收", meta: "待下游收货回款", done: false },
  { t: "结清 · 释放额度", d: "还清本息，额度释放再投放", meta: "预计 08-30", done: false },
];
const curIdx = computed(() => phases.findIndex((p) => p.cur));

// 风控要点
const risk = ["订单/仓储/物流/回款交叉核验，识别虚假贸易融资风险", "ZKP 数据可用不可见", "受托支付按银行规则执行", "还款扣收须有合同依据和有效授权", "银行风控节点接入 + 风险缓释措施"];

function verify() {
  if (productionBuild) return uni.showModal({ title: "暂无后台贷款档案", content: "正式环境的授信、放款、受托支付和还款状态必须来自银行/持牌机构回执，当前未展示本地样例。", showCancel: false });
  uni.showModal({ title: "放款链上存证 ✔", showCancel: false, confirmText: "已验真",
    content: `放款交易哈希 0x8f3a…c21d\n区块高度 4,820,193\n资金直达商户对公账户\n平台不触碰资金。` });
}
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty">正式环境暂无已授权的后台贷款档案。授信、放款、受托支付和还款状态将在银行/持牌机构回执入账后展示。</view>
    <template v-else>
    <view class="hd">
      <text class="hd-t">订单贷 · 全生命周期</text>
      <text class="hd-s">测额 → 申请 → 竞标 → 放款 → 受托支付 → 回款划扣 → 结清</text>
      <view class="hd-kpis">
        <view class="k"><text class="kn">¥{{ loan.amount }}万</text><text class="kl">放款额</text></view>
        <view class="k"><text class="kn">{{ loan.rate }}</text><text class="kl">利率</text></view>
        <view class="k"><text class="kn">T+0</text><text class="kl">放款时效</text></view>
      </view>
    </view>

    <!-- 贷款信息 -->
    <view class="sg-card">
      <view class="r"><text class="k">贷款编号</text><text class="v">{{ loan.no }}</text></view>
      <view class="r"><text class="k">关联订单</text><text class="v">{{ loan.order }}</text></view>
      <view class="r"><text class="k">主办银行</text><text class="v">{{ loan.bank }}</text></view>
      <view class="r"><text class="k">受托支付</text><text class="v">{{ loan.supplier }}</text></view>
      <view class="r"><text class="k">还款方式</text><text class="v">{{ loan.repay }}</text></view>
    </view>

    <!-- 生命周期时间轴 -->
    <view class="sec">全生命周期</view>
    <view class="tl">
      <view class="ph" v-for="(p, i) in phases" :key="i">
        <view class="ph-ax"><view class="ph-dot" :class="{ done: p.done, cur: p.cur }">{{ p.done ? '✓' : (p.cur ? '●' : i + 1) }}</view><view v-if="i < phases.length - 1" class="ph-line" :class="{ done: p.done }"></view></view>
        <view class="ph-c" :class="{ cur: p.cur }">
          <view class="ph-top"><text class="ph-t">{{ p.t }}</text><text v-if="p.cur" class="ph-badge">进行中</text><text v-else-if="p.done" class="ph-ok">已完成</text></view>
          <text class="ph-d">{{ p.d }}</text>
          <text class="ph-m">{{ p.meta }}</text>
        </view>
      </view>
    </view>

    <view class="chain" @tap="verify">🔗 放款/受托支付/回款全程上链 · 点击验真 ›</view>

    <!-- 风控 -->
    <view class="sec">风控闭环</view>
    <view class="sg-card">
      <view class="rk" v-for="(r, i) in risk" :key="i"><text class="rk-no">{{ i + 1 }}</text><text class="rk-t">{{ r }}</text></view>
    </view>

    <view class="tip">🔒 平台不触碰资金：授信/放款/还款由主办银行行内闭环；平台提供链上数据风控与撮合。控风险、提效率、提高银行资金使用率。</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, $sg-gold, #c8871f); padding: 36rpx 28rpx; color: #fff; }
.hd-t { font-size: 34rpx; font-weight: 800; }
.hd-s { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; }
.hd-kpis { display: flex; margin-top: 22rpx; }
.k { flex: 1; text-align: center; }
.kn { font-size: 36rpx; font-weight: 800; display: block; }
.kl { font-size: 20rpx; opacity: 0.9; }
.r { display: flex; padding: 12rpx 0; border-top: 2rpx solid $sg-border; }
.r:first-of-type { border-top: none; }
.k { }
.r .k { width: 150rpx; font-size: 24rpx; color: $sg-text-3; }
.v { flex: 1; font-size: 24rpx; }
.sec { font-size: 30rpx; font-weight: 700; padding: 26rpx 28rpx 12rpx; }
.tl { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 28rpx 24rpx; }
.ph { display: flex; }
.ph-ax { display: flex; flex-direction: column; align-items: center; margin-right: 20rpx; }
.ph-dot { width: 46rpx; height: 46rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; }
.ph-dot.done { background: $sg-gold; }
.ph-dot.cur { background: $sg-red; }
.ph-line { flex: 1; width: 4rpx; background: $sg-border; min-height: 24rpx; margin: 4rpx 0; }
.ph-line.done { background: $sg-gold; }
.ph-c { flex: 1; padding-bottom: 26rpx; }
.ph-c.cur { }
.ph-top { display: flex; align-items: center; }
.ph-t { font-size: 27rpx; font-weight: 700; }
.ph-badge { font-size: 19rpx; color: #fff; background: $sg-red; padding: 2rpx 12rpx; border-radius: 999rpx; margin-left: 12rpx; }
.ph-ok { font-size: 19rpx; color: $sg-gold; margin-left: 12rpx; }
.ph-d { font-size: 22rpx; color: $sg-text-3; display: block; margin: 4rpx 0; }
.ph-m { font-size: 22rpx; color: $sg-text-2; font-weight: 600; }
.chain { margin: 20rpx 24rpx 0; text-align: center; padding: 20rpx; background: linear-gradient(135deg, #eef6ff, #fff); border: 2rpx solid #d6e8fb; border-radius: $sg-radius-lg; color: $sg-blue; font-size: 23rpx; }
.rk { display: flex; align-items: flex-start; padding: 10rpx 0; border-top: 2rpx solid $sg-border; }
.rk:first-of-type { border-top: none; }
.rk-no { width: 38rpx; height: 38rpx; border-radius: 50%; background: $sg-gold; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20rpx; font-weight: 700; margin-right: 14rpx; flex-shrink: 0; }
.rk-t { flex: 1; font-size: 23rpx; color: $sg-text-2; line-height: 1.5; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
.production-empty { margin: 28rpx 24rpx; padding: 28rpx 24rpx; border: 2rpx solid #efd494; border-radius: 20rpx; color: #755f39; background: #fff8e7; font-size: 24rpx; line-height: 1.6; }
</style>
