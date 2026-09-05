<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { agriProducts, type AgriProduct } from "@/mock";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const p = ref<AgriProduct>(agriProducts[0]);
const qty = ref(1);
onLoad((q) => { const f = agriProducts.find((x) => x.id === q?.id); if (f) p.value = f; });

function buy(group: boolean) {
  if (productionBuild) return uni.showModal({ title: "需要后台农资服务", content: "正式环境的农资下单必须使用后台审核 SKU、实时库存、合同和持牌结算结果，当前未接入真实订单。", showCancel: false });
  const amount = (group ? p.value.groupPrice! : p.value.price) * qty.value;
  uni.showModal({
    title: group ? "参与集采拼单" : "立即下单",
    content: `${p.value.name} ×${qty.value}${p.value.unit}，应付 ¥${amount.toLocaleString()}，去支付？`,
    confirmText: "去支付",
    success: (r) => {
      if (r.confirm) uni.navigateTo({ url: `/pages/pay/index?title=${encodeURIComponent(p.value.name + (group ? ' 集采拼单' : ''))}&amount=${amount}&no=A${Date.now()}` });
    },
  });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero"><text class="he">{{ p.emoji }}</text></view>
    <view class="sg-card">
      <text class="nm">{{ p.name }}</text>
      <view class="pr"><text class="sg-price big">¥{{ p.price }}</text><text class="u">/{{ p.unit }}</text>
        <text v-if="p.groupPrice" class="gp">拼团 ¥{{ p.groupPrice }}</text></view>
      <view class="r"><text class="k">品牌</text><text class="v">{{ p.brand }}</text></view>
      <view class="r"><text class="k">规格</text><text class="v">{{ p.spec }}</text></view>
      <view class="r"><text class="k">品类</text><text class="v">{{ p.cat }}</text></view>
      <view class="r"><text class="k">溯源</text><text class="v" :class="{ ok: p.traceable }">{{ p.traceable ? '✔ 农资一物一码全链路溯源' : '—' }}</text></view>
    </view>
    <view class="sg-card qty">
      <text>采购数量</text>
      <view class="stepper">
        <text class="sb" @tap="qty > 1 && qty--">−</text>
        <text class="qn">{{ qty }}</text>
        <text class="sb" @tap="qty++">＋</text>
      </view>
    </view>
    <view class="bar">
      <view v-if="p.groupPrice" class="bar-btn ghost" @tap="buy(true)">拼单集采</view>
      <view class="bar-btn" @tap="buy(false)">立即下单</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.hero { height: 300rpx; background: linear-gradient(160deg, $sg-primary-light, #fff); display: flex; align-items: center; justify-content: center; }
.he { font-size: 150rpx; }
.nm { font-size: 32rpx; font-weight: 700; }
.pr { margin: 12rpx 0 18rpx; display: flex; align-items: baseline; }
.sg-price.big { font-size: 48rpx; }
.u { font-size: 22rpx; color: $sg-text-3; margin-left: 4rpx; }
.gp { margin-left: 16rpx; font-size: 24rpx; color: $sg-gold; background: $sg-gold-light; padding: 4rpx 14rpx; border-radius: 6rpx; }
.r { display: flex; padding: 14rpx 0; border-top: 2rpx solid $sg-border; }
.k { width: 120rpx; color: $sg-text-3; font-size: 26rpx; }
.v { flex: 1; font-size: 26rpx; }
.ok { color: $sg-primary; }
.qty { display: flex; align-items: center; justify-content: space-between; }
.stepper { display: flex; align-items: center; }
.sb { width: 60rpx; height: 60rpx; background: $sg-bg; border-radius: 12rpx; text-align: center; line-height: 60rpx; font-size: 36rpx; }
.qn { width: 90rpx; text-align: center; font-size: 30rpx; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; display: flex; gap: 20rpx; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.05); }
.bar-btn { flex: 1; text-align: center; padding: 24rpx 0; border-radius: 999rpx; font-size: 30rpx; font-weight: 700; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; }
.bar-btn.ghost { flex: 0 0 42%; background: $sg-gold-light; color: $sg-gold; }
</style>
