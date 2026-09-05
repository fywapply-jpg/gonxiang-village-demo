<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { financeProducts, type FinanceProduct } from "@/mock";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const p = ref<FinanceProduct>(financeProducts[0]);
onLoad((q) => { const f = financeProducts.find((x) => x.id === q?.id); if (f) p.value = f; });
function apply() {
  if (productionBuild) {
    uni.showModal({ title: "金融机构服务未接入", content: "正式环境金融产品、利率和授信额度必须由合作持牌机构实时返回，当前仅开放演示。", showCancel: false });
    return;
  }
  uni.navigateTo({ url: `/pages/finance/apply?name=${encodeURIComponent(p.value.name)}` });
}
</script>

<template>
  <view class="sg-page">
    <view v-if="!productionBuild" class="hero"><text class="pic">{{ p.icon }}</text><text class="nm">{{ p.name }}</text><text class="cat">{{ p.cat }}</text></view>
    <view v-if="!productionBuild" class="sg-card">
      <view class="r"><text class="k">适用对象</text><text class="v">{{ p.target }}</text></view>
      <view class="r"><text class="k">参考利率</text><text class="v sg-price">{{ p.rate }}</text></view>
      <view class="r"><text class="k">授信额度</text><text class="v">{{ p.limit }}</text></view>
      <view class="r"><text class="k">产品说明</text><text class="v">{{ p.desc }}</text></view>
    </view>
    <view v-if="!productionBuild" class="sg-card">
      <text class="st">申请条件</text>
      <view class="li">• 供销体系已认证 B 端经营主体</view>
      <view class="li">• 平台近 6 个月有真实交易 / 仓单记录</view>
      <view class="li">• 信用分 ≥ 650（涉农小微享保底分补贴）</view>
      <text class="st">办理流程</text>
      <view class="flow">
        <text class="fn">在线申请</text><text class="fa">›</text>
        <text class="fn">机构审核</text><text class="fa">›</text>
        <text class="fn">签约放款</text><text class="fa">›</text>
        <text class="fn">随借随还</text>
      </view>
    </view>
    <view v-if="!productionBuild" class="notice">🔒 放款、还款由持牌金融机构办理，本平台仅提供申请入口</view>
    <view v-if="!productionBuild" class="bar"><view class="bar-btn" @tap="apply">在线申请</view></view>
    <view v-else class="backend-note">正式环境金融产品目录、利率、授信和申请入口由后台持牌机构服务提供。未完成机构联调前，不展示本地示例或受理申请。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { padding: 40rpx; display: flex; flex-direction: column; align-items: center; background: linear-gradient(160deg, $sg-gold-light, #fff); }
.pic { font-size: 100rpx; }
.nm { font-size: 34rpx; font-weight: 800; margin-top: 10rpx; }
.cat { font-size: 22rpx; color: $sg-gold; background: #fff; padding: 4rpx 16rpx; border-radius: 999rpx; margin-top: 8rpx; }
.r { display: flex; padding: 16rpx 0; border-bottom: 2rpx solid $sg-border; }
.k { width: 160rpx; color: $sg-text-3; font-size: 26rpx; }
.v { flex: 1; font-size: 26rpx; }
.st { font-size: 28rpx; font-weight: 700; display: block; margin: 16rpx 0 10rpx; }
.li { font-size: 25rpx; color: $sg-text-2; padding: 6rpx 0; }
.flow { display: flex; align-items: center; flex-wrap: wrap; }
.fn { font-size: 24rpx; background: $sg-primary-light; color: $sg-primary; padding: 10rpx 20rpx; border-radius: 999rpx; }
.fa { margin: 0 10rpx; color: $sg-text-3; }
.notice { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); }
.bar-btn { text-align: center; padding: 24rpx 0; border-radius: 999rpx; font-size: 30rpx; font-weight: 700; background: linear-gradient(135deg, $sg-gold, #c8871f); color: #fff; }
.backend-note { margin: 24rpx; padding: 22rpx; border-radius: $sg-radius-lg; background: #fff7ed; border: 2rpx solid #fed7aa; color: #9a3412; font-size: 23rpx; line-height: 1.6; }
</style>
