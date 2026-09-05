<script setup lang="ts">
import { ref, computed } from "vue";
import { cateringStores, cateringUnit, cateringSaveRate } from "@/mock/endtools";
import { useTradeStore } from "@/store/trade";
const trade = useTradeStore();
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const qty = ref<Record<string, number>>(Object.fromEntries(cateringStores.map((s) => [s.store, s.qty])));
function adj(s: string, d: number) { qty.value[s] = Math.max(0, (qty.value[s] || 0) + d); }

const totalPortions = computed(() => cateringStores.reduce((s, x) => s + (qty.value[x.store] || 0), 0));
const poolCost = computed(() => Math.round(totalPortions.value * cateringUnit * (1 - cateringSaveRate)));
const dispersedCost = computed(() => Math.round(totalPortions.value * cateringUnit));
const saved = computed(() => dispersedCost.value - poolCost.value);

function order() {
  if (productionBuild) return uni.showModal({ title: "需要后台餐饮服务", content: "正式环境的多门店集单必须由后台审核门店主体、价格、配送和合同后生成采购单，不能使用本地样例下单。", showCancel: false });
  if (!totalPortions.value) return uni.showToast({ title: "请先填各店报量", icon: "none" });
  const items = cateringStores.filter((s) => qty.value[s.store] > 0)
    .map((s) => ({ name: s.store, spec: `${qty.value[s.store]} 份/日（${s.area}）` }));
  const id = trade.addDemand({
    title: `集单 连锁餐饮多门店食材（${items.length}店·${totalPortions.value}份/日）`, category: "团餐食材",
    qty: `${items.length} 店 · ${totalPortions.value} 份/日`, addr: "枢纽 · 多店集配", deadline: "每日配送",
    buyer: "餐饮服务公司（总部）", budget: `≤ ${poolCost.value.toLocaleString()} 元/日`, pic: "/static/products/p6.jpg", items,
  });
  uni.showModal({ title: "集单已生成", showCancel: false, confirmText: "去采购大厅",
    content: `需求单 ${id}｜${items.length} 店集单 · ${totalPortions.value} 份/日\n总部集中采购、统一标准、一票制，较分散采购省 ¥${saved.value.toLocaleString()}/日。`,
    success: () => (uni.setStorageSync('tradeTab','demand'), uni.switchTab({ url: '/pages/trade/index' })) });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🍽️ 多门店集单</text>
      <text class="hs">各店报量 · 总部集采 · 统一标准 · 一票制</text>
    </view>

    <view class="sec">各门店报量（份/日）</view>
    <view class="sg-card">
      <view class="st" v-for="s in cateringStores" :key="s.store">
        <view class="st-l"><text class="st-n">{{ s.store }}</text><text class="st-a">{{ s.area }}</text></view>
        <view class="st-q">
          <text class="stp" @tap="adj(s.store, -100)">－</text>
          <text class="qn">{{ qty[s.store] || 0 }}</text>
          <text class="stp" @tap="adj(s.store, 100)">＋</text>
        </view>
      </view>
    </view>

    <view class="sg-card pool">
      <view class="pl-row"><text class="pl-k">集单总量</text><text class="pl-v">{{ totalPortions.toLocaleString() }} 份/日</text></view>
      <view class="pl-row"><text class="pl-k">分散采购</text><text class="pl-old">¥{{ dispersedCost.toLocaleString() }}/日</text></view>
      <view class="pl-row"><text class="pl-k">集采成本</text><text class="pl-new">¥{{ poolCost.toLocaleString() }}/日</text></view>
      <view class="pl-save">集采降本 ¥{{ saved.toLocaleString() }}/日（约省 {{ (cateringSaveRate*100).toFixed(0) }}%）</view>
    </view>

    <view class="cta" @tap="order">汇总下集单 · 生成采购需求 ›</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #d99a2b, #b5791b); padding: 32rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.95; margin-top: 8rpx; display: block; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.sg-card { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 8rpx 24rpx; }
.st { display: flex; align-items: center; justify-content: space-between; padding: 18rpx 0; border-top: 2rpx solid $sg-bg; }
.st:first-child { border-top: none; }
.st-l { display: flex; flex-direction: column; }
.st-n { font-size: 26rpx; font-weight: 600; }
.st-a { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }
.st-q { display: flex; align-items: center; }
.stp { width: 44rpx; height: 44rpx; border-radius: 10rpx; background: $sg-gold-light; color: #c8871f; font-size: 28rpx; display: flex; align-items: center; justify-content: center; }
.qn { min-width: 72rpx; text-align: center; font-size: 24rpx; font-weight: 700; }
.pool { margin-top: 20rpx; padding: 24rpx; }
.pl-row { display: flex; justify-content: space-between; padding: 8rpx 0; }
.pl-k { font-size: 24rpx; color: $sg-text-2; }
.pl-v { font-size: 26rpx; font-weight: 700; }
.pl-old { font-size: 24rpx; color: $sg-text-3; text-decoration: line-through; }
.pl-new { font-size: 28rpx; font-weight: 800; color: $sg-red; }
.pl-save { margin-top: 12rpx; font-size: 22rpx; color: #c8871f; background: $sg-gold-light; padding: 12rpx; border-radius: $sg-radius; text-align: center; }
.cta { margin: 20rpx 24rpx; text-align: center; padding: 26rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #d99a2b, #b5791b); color: #fff; font-size: 27rpx; font-weight: 700; box-shadow: 0 8rpx 20rpx rgba(217,154,43,0.3); }
</style>
