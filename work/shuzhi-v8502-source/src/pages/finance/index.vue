<script setup lang="ts">
import { computed } from "vue";
import { financeProducts } from "@/mock";
import { useUserStore } from "@/store/user";
const user = useUserStore();
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const creditScore = computed(() => productionBuild ? "—" : (user.role.creditScore || "—"));

function product(id: string) { uni.navigateTo({ url: `/pages/finance/product?id=${id}` }); }
function nav(url: string) { uni.navigateTo({ url }); }
function calc() {
  if (productionBuild) return uni.showModal({ title: "额度暂不可测", content: "额度、利率和放款结果须由已接入的持牌金融机构根据真实订单独立评估，平台不会用演示数据计算。", showCancel: false });
  uni.showModal({ title: "融资额度测算", showCancel: false, confirmText: "知道了",
    content: `根据您近 6 个月链上真实订单（累计 ¥914,000）与信用分 ${user.role.creditScore || 786}，预估可贷额度约 ¥520,000，参考利率 4.1%。` });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <view class="sg-between">
        <view><text class="ht">供应链金融服务</text><text class="hs">以链上真实交易数据为风控依据</text></view>
        <view class="credit" @tap="nav('/pages/finance/credit')"><text class="cs">{{ creditScore }}</text><text class="cl">信用分 · {{ productionBuild ? '以后台为准' : (user.isVisitor ? '未登录' : 'AA') }}</text></view>
      </view>
      <view class="quick">
        <view class="q" @tap="nav('/pages/finance/grainbank')">🌾 粮食银行</view>
        <view class="q" @tap="nav('/pages/finance/credit')">🏅 信用资产</view>
        <view class="q" @tap="nav('/pages/finance/insurance')">🛡️ 农业保险</view>
        <view class="q" @tap="nav('/pages/finance/dividend')">💰 全民分红</view>
      </view>
    </view>

    <view class="compliance">
      🔒 合规说明：本模块仅提供金融产品信息展示与申请入口，资金放款、还款全流程跳转持牌金融机构办理，平台不触碰资金、不设立资金池、不放贷。
    </view>
    <view v-if="productionBuild" class="backend-note">正式环境不展示内置金融产品、额度或收益数据；完成持牌机构接口与主体授权后，页面只呈现后台返回结果。</view>

    <view class="loop-entry" @tap="nav('/pages/finance/loop')">
      <text class="le-ic">🏦</text>
      <view class="le-i"><text class="le-t">供应链金融闭环 · 银企直连</text><text class="le-s">覆盖全链环节 · 控风险 · 提效率 · 提资金使用率</text></view>
      <text class="le-go">查看 ›</text>
    </view>

    <view class="loop-entry grain" @tap="nav('/pages/finance/grainbank')">
      <text class="le-ic">🌾</text>
      <view class="le-i"><text class="le-t">粮食银行 · 存粮托管</text><text class="le-s">存粮换电子粮票 · 锁价/质押/寄卖/自卖/异地就近提货</text></view>
      <text class="le-go grain-go">进入 ›</text>
    </view>

    <view class="loop-entry factoring" @tap="nav('/pages/finance/factoring')">
      <text class="le-ic">📑</text>
      <view class="le-i"><text class="le-t">应收账款保理</text><text class="le-s">转让应收账款 · 提前回款 · 缓解账期压力</text></view>
      <text class="le-go">进入 ›</text>
    </view>

    <view class="loop-entry factoring" @tap="nav('/pages/finance/loanlife')">
      <text class="le-ic">🔄</text>
      <view class="le-i"><text class="le-t">订单贷 · 全生命周期</text><text class="le-s">测额→申请→竞标→放款→受托支付→回款→结清</text></view>
      <text class="le-go">进入 ›</text>
    </view>

    <view class="loop-entry fourflow" @tap="nav('/pages/finance/fourflow')">
      <text class="le-ic">🔗</text>
      <view class="le-i"><text class="le-t">四流合一 · 融资贸易风控</text><text class="le-s">合同/物流/资金/发票四流一致才放款 · 防走单走票不走货、空转、重复质押</text></view>
      <text class="le-go flow-go">进入 ›</text>
    </view>

    <view class="loop-entry bank" @tap="nav('/pages/finance/bankbid')">
      <text class="le-ic">🏛️</text>
      <view class="le-i"><text class="le-t">银行合作 · 主办银行制</text><text class="le-s">多家持牌银行竞标择优 · 单笔业务一家主办行行内闭环</text></view>
      <text class="le-go bank-go">进入 ›</text>
    </view>

    <view class="loop-entry pay" @tap="nav('/pages/finance/fourflow')">
      <text class="le-ic">💳</text>
      <view class="le-i"><text class="le-t">资金对账与四流核验</text><text class="le-s">订单、合同、物流、发票和资金一致性校验</text></view>
      <text class="le-go pay-go">进入 ›</text>
    </view>

    <view v-if="!productionBuild" class="sech">金融产品矩阵</view>
    <view v-if="!productionBuild" class="card" v-for="p in financeProducts" :key="p.id" @tap="product(p.id)">
      <text class="pic">{{ p.icon }}</text>
      <view class="body">
        <view class="sg-between"><text class="nm">{{ p.name }}</text><text class="cat">{{ p.cat }}</text></view>
        <text class="desc">{{ p.desc }}</text>
        <view class="metaline"><text class="rate">利率 {{ p.rate }}</text><text class="limit">{{ p.limit }}</text></view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, $sg-gold, #c8871f); padding: 40rpx 28rpx 30rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 22rpx; opacity: 0.9; margin-top: 6rpx; display: block; }
.credit { text-align: center; }
.cs { font-size: 46rpx; font-weight: 800; line-height: 1; display: block; }
.cl { font-size: 20rpx; opacity: 0.9; }
.quick { display: flex; gap: 16rpx; margin-top: 26rpx; }
.q { flex: 1; text-align: center; background: rgba(255,255,255,0.2); border-radius: $sg-radius; padding: 18rpx 0; font-size: 24rpx; }
.compliance { margin: 24rpx; padding: 20rpx; background: #fff; border-left: 8rpx solid $sg-gold; border-radius: $sg-radius; font-size: 23rpx; color: $sg-text-2; line-height: 1.6; }
.loop-entry { display: flex; align-items: center; margin: 0 24rpx 8rpx; padding: 24rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #fff6e6, #fff); border: 2rpx solid #f0dcae; box-shadow: $sg-shadow; }
.loop-entry.grain { background: linear-gradient(135deg, #eaf7ef, #fff); border-color: #b6e0c6; }
.loop-entry.grain .le-t { color: $sg-primary; }
.le-go.grain-go { color: $sg-primary; }
.loop-entry.bank { background: linear-gradient(135deg, #eef6ff, #fff); border-color: #cfe0f5; }
.loop-entry.bank .le-t { color: $sg-blue; }
.le-go.bank-go { color: $sg-blue; }
.loop-entry.pay { background: linear-gradient(135deg, #f3ecfe, #fff); border-color: #ddceF7; }
.loop-entry.pay .le-t { color: #7c3aed; }
.le-go.pay-go { color: #7c3aed; }
.loop-entry.fourflow { background: linear-gradient(135deg, #eef6ff, #fff); border-color: #cfe0f5; }
.loop-entry.fourflow .le-t { color: #1e5fa8; }
.le-go.flow-go { color: #1e5fa8; }
.le-ic { font-size: 48rpx; margin-right: 16rpx; }
.le-i { flex: 1; display: flex; flex-direction: column; }
.le-t { font-size: 27rpx; font-weight: 700; color: #b5791b; }
.le-s { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.le-go { font-size: 24rpx; color: $sg-gold; }
.sech { padding: 6rpx 28rpx 12rpx; font-size: 30rpx; font-weight: 700; }
.card { display: flex; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 20rpx; padding: 24rpx; }
.pic { font-size: 60rpx; margin-right: 20rpx; }
.body { flex: 1; }
.nm { font-size: 30rpx; font-weight: 700; }
.cat { font-size: 20rpx; color: $sg-gold; background: $sg-gold-light; padding: 2rpx 12rpx; border-radius: 6rpx; }
.desc { font-size: 23rpx; color: $sg-text-3; margin: 8rpx 0; display: block; }
.metaline { display: flex; gap: 24rpx; }
.rate { font-size: 24rpx; color: $sg-red; font-weight: 600; }
.limit { font-size: 24rpx; color: $sg-text-2; }
.backend-note { margin: 0 24rpx 18rpx; padding: 18rpx 20rpx; border-radius: $sg-radius; background: #fff8e8; border: 2rpx solid #f0dcae; color: #8a641f; font-size: 22rpx; line-height: 1.6; }
</style>
