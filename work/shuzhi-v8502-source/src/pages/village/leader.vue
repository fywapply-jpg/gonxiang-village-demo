<script setup lang="ts">
import { ref } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

// 社区团长（数智供社 · 民生团购，区别于 B2B 推广组织）
const me = { name: "王阿姨", store: "龙南镇 · 数智供社 3 号店", members: 128, level: "金牌团长", month: 2360, orders: 186 };

// 团长四大赋能
const powers = [
  { icon: "🚀", n: "一键开团", d: "从产地直采货盘选品，一键生成团购、海报、小程序码" },
  { icon: "🌱", n: "产地直采", d: "对接产地合作社，预售集单、产地现采、次日到店自提" },
  { icon: "👥", n: "社群工具", d: "邻居群、接龙、通知、售后一站管理" },
  { icon: "💰", n: "佣金结算", d: "按成交额得团购服务佣金，按周结算、上链留痕" },
];

// 团长佣金（民生团购服务佣金，非 B2B 分成）
const commission = { rate: "8%", month: 2360, week: 620, note: "团购成交额 × 8% 团长服务佣金，多劳多得；仅一级、不发展下线、不收押金。" };

// 成为团长条件
const conds = ["有固定门店 / 自提点（数智供社门店优先）", "热心邻里、有社群号召力", "实名认证 + 承诺诚信经营", "由服务站培训赋能后上岗"];

function openGroup() { uni.navigateTo({ url: "/pages/village/groupbuy" }); }
function join() {
  if (productionBuild) return uni.showModal({ title: "需后台团长审核", content: "正式环境团长申请必须完成实名、门店、培训和结算账户审核；当前未提交本地申请。", showCancel: false });
  uni.showModal({ title: "申请成为社区团长", content: "提交门店与实名信息，服务站培训后即可开团带货、服务邻里、赚团购佣金。", confirmText: "提交申请",
    success: (r) => { if (r.confirm) uni.showToast({ title: "申请已提交", icon: "success" }); } });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <view class="me">
        <view class="avatar">团</view>
        <view class="me-i">
          <view class="me-row"><text class="me-n">{{ me.name }}</text><text class="me-lv">{{ me.level }}</text></view>
          <text class="me-s">{{ me.store }}</text>
        </view>
      </view>
      <view class="me-kpis">
        <view class="mk"><text class="mkn">{{ me.members }}</text><text class="mkl">邻居</text></view>
        <view class="mk"><text class="mkn">{{ me.orders }}</text><text class="mkl">本月单量</text></view>
        <view class="mk"><text class="mkn">¥{{ me.month }}</text><text class="mkl">本月佣金</text></view>
      </view>
    </view>

    <view class="open" @tap="openGroup">🚀 去开团 / 看在团商品 ›</view>

    <!-- 四大赋能 -->
    <view class="sec">团长四大赋能</view>
    <view class="powers">
      <view class="pw" v-for="p in powers" :key="p.n">
        <text class="pw-ic">{{ p.icon }}</text>
        <view class="pw-i"><text class="pw-n">{{ p.n }}</text><text class="pw-d">{{ p.d }}</text></view>
      </view>
    </view>

    <!-- 佣金 -->
    <view class="sec">团长佣金（团购服务佣金）</view>
    <view class="comm">
      <view class="cm-top">
        <view><text class="cm-rate">{{ commission.rate }}</text><text class="cm-lb">成交佣金率</text></view>
        <view class="cm-num"><text class="cm-v">¥{{ commission.week }}</text><text class="cm-l">本周待结</text></view>
        <view class="cm-num"><text class="cm-v">¥{{ commission.month }}</text><text class="cm-l">本月累计</text></view>
      </view>
      <text class="cm-note">💡 {{ commission.note }}</text>
    </view>

    <!-- 成为团长 -->
    <view class="sec">成为社区团长</view>
    <view class="conds">
      <view class="cond" v-for="(c, i) in conds" :key="i"><text class="cd-n">{{ i + 1 }}</text><text class="cd-t">{{ c }}</text></view>
    </view>
    <view class="join" @tap="join">申请成为团长</view>

    <view class="tip">🏘️ 社区团长依托数智供社门店，把产地好货带给邻里、赚合理服务佣金；这是<text style="color:#c0392b;font-weight:600">民生社区团购</text>，与平台面向企业的 B2B 推广体系相互独立。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #c0392b, #922b21); padding: 32rpx 28rpx 26rpx; color: #fff; }
.me { display: flex; align-items: center; }
.avatar { width: 88rpx; height: 88rpx; border-radius: 24rpx; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 40rpx; font-weight: 800; margin-right: 18rpx; }
.me-i { flex: 1; display: flex; flex-direction: column; }
.me-row { display: flex; align-items: center; gap: 12rpx; }
.me-n { font-size: 32rpx; font-weight: 800; }
.me-lv { font-size: 19rpx; background: #ffd76a; color: #7a4a00; padding: 3rpx 14rpx; border-radius: 999rpx; font-weight: 700; }
.me-s { font-size: 21rpx; opacity: 0.9; margin-top: 4rpx; }
.me-kpis { display: flex; margin-top: 22rpx; }
.mk { flex: 1; text-align: center; }
.mkn { font-size: 32rpx; font-weight: 800; display: block; }
.mkl { font-size: 18rpx; opacity: 0.9; }
.open { margin: 20rpx 24rpx 0; text-align: center; padding: 24rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #c0392b, #922b21); color: #fff; font-size: 27rpx; font-weight: 700; box-shadow: 0 8rpx 20rpx rgba(192,57,43,0.3); }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.powers { display: flex; flex-wrap: wrap; gap: 14rpx; padding: 0 24rpx; }
.pw { width: calc(50% - 7rpx); box-sizing: border-box; display: flex; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx; }
.pw-ic { font-size: 38rpx; margin-right: 12rpx; }
.pw-i { flex: 1; display: flex; flex-direction: column; }
.pw-n { font-size: 24rpx; font-weight: 700; }
.pw-d { font-size: 18rpx; color: $sg-text-3; margin-top: 4rpx; line-height: 1.4; }
.comm { margin: 0 24rpx; background: linear-gradient(135deg, #fdeceb, #fff); border: 2rpx solid #f3c9c5; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.cm-top { display: flex; align-items: center; justify-content: space-between; }
.cm-rate { font-size: 44rpx; font-weight: 800; color: #c0392b; }
.cm-lb { font-size: 18rpx; color: $sg-text-3; margin-left: 8rpx; }
.cm-num { text-align: center; }
.cm-v { font-size: 30rpx; font-weight: 800; color: #c0392b; display: block; }
.cm-l { font-size: 18rpx; color: $sg-text-3; }
.cm-note { display: block; margin-top: 14rpx; font-size: 20rpx; color: $sg-text-2; line-height: 1.5; }
.conds { padding: 0 24rpx; }
.cond { display: flex; align-items: center; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 16rpx 18rpx; margin-bottom: 12rpx; }
.cd-n { width: 36rpx; height: 36rpx; flex: none; border-radius: 50%; background: #fdeceb; color: #c0392b; font-size: 20rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-right: 14rpx; }
.cd-t { font-size: 23rpx; color: $sg-text-2; }
.join { margin: 16rpx 24rpx 0; text-align: center; padding: 26rpx 0; border-radius: 999rpx; background: #fff; border: 2rpx solid #c0392b; color: #c0392b; font-size: 27rpx; font-weight: 700; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
</style>
