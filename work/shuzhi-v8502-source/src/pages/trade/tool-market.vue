<script setup lang="ts">
import { ref, computed } from "vue";
import { marketBoard } from "@/mock/endtools";
import { useTradeStore } from "@/store/trade";
const trade = useTradeStore();
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const qty = ref<Record<string, number>>({});
function add(n: string, d: number) { qty.value[n] = Math.max(0, (qty.value[n] || 0) + d); }
const cart = computed(() => marketBoard.filter((r) => qty.value[r.name] > 0)
  .map((r) => ({ ...r, q: qty.value[r.name], sub: +(r.price * qty.value[r.name]).toFixed(1) })));
const total = computed(() => cart.value.reduce((s, x) => s + x.sub, 0));

function order() {
  if (productionBuild) return uni.showModal({ title: "需要后台农批服务", content: "正式环境的农批订单必须使用后台实时行情、库存、商户主体和结算结果，不能使用本地样例生成采购单。", showCancel: false });
  if (!cart.value.length) return uni.showToast({ title: "请先选货加量", icon: "none" });
  const items = cart.value.map((c) => ({ name: c.name, spec: `${c.q} ${c.unit}`, price: c.price, sub: c.sub }));
  const id = trade.addDemand({
    title: `批货 农贸市场当日鲜货（${cart.value.length}种）`, category: "时令蔬菜",
    qty: `${cart.value.length} 种`, addr: "枢纽 · 农贸直批", deadline: "当日",
    buyer: "农贸市场商户（本户）", budget: `≤ ${total.value.toLocaleString()} 元`, pic: "/static/products/p6.jpg", items,
  });
  uni.showModal({ title: "批货单已生成", showCancel: false, confirmText: "去采购大厅",
    content: `需求单 ${id}｜${cart.value.length} 种 · 合计 ¥${total.value.toLocaleString()}\n一件起批，市场统一分拣、凌晨配到摊。`,
    success: () => (uni.setStorageSync('tradeTab','demand'), uni.switchTab({ url: '/pages/trade/index' })) });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🏪 当日行情批货单</text>
      <text class="hs">一级农批当日挂牌价 · 一件起批 · 凌晨配到摊</text>
    </view>

    <view class="sec">今日行情（点 ＋ 加量）</view>
    <view class="board">
      <view class="row hd"><text class="c-n">品类</text><text class="c-p">批发价</text><text class="c-c">涨跌</text><text class="c-q">进货量</text></view>
      <view class="row" v-for="r in marketBoard" :key="r.name">
        <text class="c-n">{{ r.name }}</text>
        <text class="c-p">¥{{ r.price }}/{{ r.unit }}</text>
        <text class="c-c" :class="r.chg > 0 ? 'up' : (r.chg < 0 ? 'down' : '')">{{ r.chg > 0 ? '▲' : (r.chg < 0 ? '▼' : '—') }}{{ r.chg ? Math.abs(r.chg) : '' }}</text>
        <view class="c-q">
          <text class="stp" @tap="add(r.name, -10)">－</text>
          <text class="qn">{{ qty[r.name] || 0 }}</text>
          <text class="stp" @tap="add(r.name, 10)">＋</text>
        </view>
      </view>
    </view>

    <view v-if="cart.length" class="sg-card">
      <text class="ct">批货清单</text>
      <view class="li" v-for="c in cart" :key="c.name"><text class="li-n">{{ c.name }}</text><text class="li-q">{{ c.q }} {{ c.unit }}</text><text class="li-s">¥{{ c.sub }}</text></view>
      <view class="tot"><text>合计</text><text class="tv">¥{{ total.toLocaleString() }}</text></view>
    </view>

    <view class="cta" @tap="order">生成批货采购单 ›</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #2f9e5b, $sg-primary-deep); padding: 32rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.board { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 8rpx 20rpx; }
.row { display: flex; align-items: center; padding: 16rpx 0; border-top: 2rpx solid $sg-bg; }
.row.hd { border-top: none; }
.row.hd text { font-size: 21rpx; color: $sg-text-3; }
.c-n { flex: 1.2; font-size: 25rpx; font-weight: 600; }
.c-p { flex: 1.1; font-size: 24rpx; color: $sg-red; }
.c-c { flex: 0.9; font-size: 22rpx; color: $sg-text-3; }
.c-c.up { color: #d64541; }
.c-c.down { color: #16884c; }
.c-q { flex: 1.2; display: flex; align-items: center; justify-content: flex-end; }
.stp { width: 44rpx; height: 44rpx; border-radius: 10rpx; background: $sg-primary-light; color: $sg-primary; font-size: 28rpx; display: flex; align-items: center; justify-content: center; }
.qn { min-width: 56rpx; text-align: center; font-size: 24rpx; font-weight: 700; }
.sg-card { margin: 20rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.ct { font-size: 27rpx; font-weight: 700; display: block; margin-bottom: 12rpx; }
.li { display: flex; align-items: center; padding: 12rpx 0; border-top: 2rpx solid $sg-bg; }
.li-n { flex: 1.4; font-size: 24rpx; }
.li-q { flex: 1; font-size: 23rpx; color: $sg-text-2; }
.li-s { font-size: 23rpx; color: $sg-red; }
.tot { display: flex; justify-content: space-between; align-items: baseline; margin-top: 14rpx; padding-top: 14rpx; border-top: 2rpx solid $sg-border; font-size: 26rpx; font-weight: 700; }
.tv { font-size: 36rpx; color: $sg-red; }
.cta { margin: 24rpx; text-align: center; padding: 26rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; font-size: 27rpx; font-weight: 700; box-shadow: 0 8rpx 20rpx rgba(15,107,59,0.3); }
</style>
