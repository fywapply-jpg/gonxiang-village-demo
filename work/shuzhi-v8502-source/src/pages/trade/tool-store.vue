<script setup lang="ts">
import { ref, computed } from "vue";
import { storeSkus, storeExpiring } from "@/mock/endtools";
import { useTradeStore } from "@/store/trade";
const trade = useTradeStore();
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

// 默认采纳系统建议补货量
const qty = ref<Record<string, number>>(Object.fromEntries(storeSkus.map((s) => [s.name, s.sug])));
function adj(n: string, d: number) { qty.value[n] = Math.max(0, (qty.value[n] || 0) + d); }
function adoptAll() { storeSkus.forEach((s) => { qty.value[s.name] = s.sug; }); uni.showToast({ title: "已采纳全部建议", icon: "success" }); }

const cart = computed(() => storeSkus.filter((s) => qty.value[s.name] > 0)
  .map((s) => ({ ...s, q: qty.value[s.name], sub: s.price * qty.value[s.name] })));
const total = computed(() => cart.value.reduce((s, x) => s + x.sub, 0));

function order() {
  if (productionBuild) return uni.showModal({ title: "需要后台门店补货服务", content: "正式环境的门店补货必须由后台返回实时库存、动销、价格和配送结果，不能使用本地样例生成采购单。", showCancel: false });
  if (!cart.value.length) return uni.showToast({ title: "请先选补货量", icon: "none" });
  const items = cart.value.map((c) => ({ name: c.name, spec: `${c.q} ${c.unit}`, price: c.price, sub: c.sub }));
  const id = trade.addDemand({
    title: `补货 社区门店民生品（${cart.value.length}项）`, category: "粮油调味",
    qty: `${cart.value.length} 项`, addr: "枢纽 · 就近仓配", deadline: "次日达",
    buyer: "社区门店·夫妻店（本店）", budget: `≤ ${total.value.toLocaleString()} 元`, pic: "/static/products/p12.jpg", items,
  });
  uni.showModal({ title: "补货单已生成", showCancel: false, confirmText: "去采购大厅",
    content: `需求单 ${id}｜${cart.value.length} 项 · 合计 ¥${total.value.toLocaleString()}\n小批量免起订，城市仓次日配到店。`,
    success: () => (uni.setStorageSync('tradeTab','demand'), uni.switchTab({ url: '/pages/trade/index' })) });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🏘️ 智能补货</text>
      <text class="hs">按动销自动荐量 · 小批量免起订 · 次日达</text>
    </view>

    <!-- 临期特价 -->
    <view class="exp">
      <text class="exp-t">⚡ 临期特价专区</text>
      <view class="exp-list"><text class="exp-i" v-for="e in storeExpiring" :key="e.name">{{ e.name }} {{ e.off }} · {{ e.exp }}</text></view>
    </view>

    <view class="sec-row"><text class="sec">补货建议</text><text class="adopt" @tap="adoptAll">一键采纳全部</text></view>
    <view class="sg-card">
      <view class="sku" v-for="s in storeSkus" :key="s.name">
        <view class="sk-l">
          <text class="sk-n">{{ s.name }}</text>
          <text class="sk-m">库存 {{ s.stock }} · 日均销 {{ s.daily }} · <text class="sug">荐补 {{ s.sug }}{{ s.unit }}</text></text>
        </view>
        <view class="sk-q">
          <text class="stp" @tap="adj(s.name, -2)">－</text>
          <text class="qn">{{ qty[s.name] || 0 }}</text>
          <text class="stp" @tap="adj(s.name, 2)">＋</text>
        </view>
      </view>
    </view>

    <view class="sg-card">
      <view class="tot"><text>补货合计（{{ cart.length }} 项）</text><text class="tv">¥{{ total.toLocaleString() }}</text></view>
    </view>

    <view class="cta" @tap="order">生成补货采购单 ›</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #2f9e5b, $sg-primary-deep); padding: 32rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; }
.exp { margin: 20rpx 24rpx 0; background: linear-gradient(135deg, #fff2e0, #fff); border: 2rpx solid #f5d9a8; border-radius: $sg-radius-lg; padding: 20rpx; }
.exp-t { font-size: 25rpx; font-weight: 700; color: #c8871f; }
.exp-list { display: flex; flex-wrap: wrap; gap: 12rpx; margin-top: 10rpx; }
.exp-i { font-size: 21rpx; color: #b5791b; background: #fff6e6; padding: 6rpx 14rpx; border-radius: 8rpx; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 24rpx; }
.adopt { font-size: 23rpx; color: $sg-primary; background: $sg-primary-light; padding: 8rpx 20rpx; border-radius: 999rpx; }
.sg-card { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 8rpx 24rpx; }
.sku { display: flex; align-items: center; justify-content: space-between; padding: 18rpx 0; border-top: 2rpx solid $sg-bg; }
.sku:first-child { border-top: none; }
.sk-l { flex: 1; display: flex; flex-direction: column; }
.sk-n { font-size: 25rpx; font-weight: 600; }
.sk-m { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.sug { color: $sg-primary; font-weight: 600; }
.sk-q { display: flex; align-items: center; }
.stp { width: 44rpx; height: 44rpx; border-radius: 10rpx; background: $sg-primary-light; color: $sg-primary; font-size: 28rpx; display: flex; align-items: center; justify-content: center; }
.qn { min-width: 56rpx; text-align: center; font-size: 24rpx; font-weight: 700; }
.tot { display: flex; justify-content: space-between; align-items: baseline; padding: 16rpx 0; font-size: 26rpx; font-weight: 700; }
.tv { font-size: 36rpx; color: $sg-red; }
.cta { margin: 20rpx 24rpx; text-align: center; padding: 26rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; font-size: 27rpx; font-weight: 700; box-shadow: 0 8rpx 20rpx rgba(15,107,59,0.3); }
</style>
