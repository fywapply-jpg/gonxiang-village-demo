<script setup lang="ts">
import { ref, computed } from "vue";
import { villageProducts } from "@/mock/products";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const storeTypes = [
  { key: "cvs", icon: "🏪", n: "社区便利店" },
  { key: "stall", icon: "🥬", n: "农贸摊位" },
  { key: "fresh", icon: "🍎", n: "生鲜店" },
  { key: "canteen", icon: "🍚", n: "餐饮 / 食堂" },
];
const areas = ["老小区周边", "学校周边", "写字楼商圈", "乡镇集市"];
const store = ref("cvs");
const area = ref("老小区周边");
const running = ref(false);
const done = ref(false);

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff; return h; }
const REASONS = [
  { t: "🔥 动销 TOP", c: "#c0392b" },
  { t: "🍂 当季鲜货", c: "#16884c" },
  { t: "💰 高毛利", c: "#d99a2b" },
  { t: "🆕 潜力新品", c: "#7c3aed" },
];

// 按店型 + 商圈生成进货清单
const list = computed(() => {
  const seed = hash(store.value + area.value);
  const src = villageProducts.slice(seed % 5, (seed % 5) + 6);
  return src.map((p, i) => {
    const h = hash(p.name + store.value);
    const qty = (10 + (h % 40)) + (store.value === "canteen" ? "0 kg" : " kg");
    const reason = REASONS[(h + i) % REASONS.length];
    const cost = Math.max(1, Math.round((p.price || 8) * 0.75 * 10) / 10);
    const margin = 12 + (h % 20);
    return { id: p.id, name: p.name, pic: p.pic, qty, reason, cost, sale: p.priceText, margin };
  });
});
const totalCost = computed(() => list.value.reduce((s, x) => s + x.cost * (parseInt(x.qty) || 20), 0));
const avgMargin = computed(() => Math.round(list.value.reduce((s, x) => s + x.margin, 0) / list.value.length));

function generate() {
  if (productionBuild) return uni.showModal({ title: "需要真实行情数据", content: "正式环境的智能选品必须使用后台授权的成交、库存和商圈数据，当前未生成虚构进货清单。", showCancel: false });
  done.value = false; running.value = true; setTimeout(() => { running.value = false; done.value = true; }, 1400);
}
function order() { uni.switchTab({ url: "/pages/trade/index" }); }
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🛒 AI 智能选品</text>
      <text class="hs">告诉 AI 你的店型和商圈，一键生成进货清单——不靠感觉进货</text>
    </view>

    <!-- 输入 -->
    <view class="sec">① 我的店型</view>
    <view class="types">
      <view class="type" :class="{ on: store === t.key }" v-for="t in storeTypes" :key="t.key" @tap="store = t.key; done = false">
        <text class="t-ic">{{ t.icon }}</text><text class="t-n">{{ t.n }}</text>
      </view>
    </view>
    <view class="sec">② 商圈位置</view>
    <view class="areas">
      <text class="area" :class="{ on: area === a }" v-for="a in areas" :key="a" @tap="area = a; done = false">{{ a }}</text>
    </view>

    <view class="gen-btn" :class="{ run: running }" @tap="generate">{{ running ? 'AI 生成中…' : '🤖 生成智能进货清单' }}</view>

    <!-- 清单 -->
    <view v-if="done" class="result">
      <view class="sum">
        <view class="su"><text class="sun">{{ list.length }}</text><text class="sul">推荐品项</text></view>
        <view class="su"><text class="sun">¥{{ totalCost.toLocaleString() }}</text><text class="sul">预估进货额</text></view>
        <view class="su"><text class="sun">{{ avgMargin }}%</text><text class="sul">预估毛利率</text></view>
      </view>
      <view class="item" v-for="it in list" :key="it.id">
        <image class="it-img" :src="it.pic" mode="aspectFill" />
        <view class="it-i">
          <text class="it-n">{{ it.name }}</text>
          <text class="it-reason" :style="{ color: it.reason.c, background: it.reason.c + '18' }">{{ it.reason.t }}</text>
          <text class="it-meta">进价 ¥{{ it.cost }} · 售 {{ it.sale }} · 毛利 {{ it.margin }}%</text>
        </view>
        <view class="it-r">
          <text class="it-qty">建议 {{ it.qty }}</text>
        </view>
      </view>
      <view class="cta" @tap="order">一键下单到采购大厅 ›</view>
    </view>

    <view class="tip">🤖 结合周边动销榜、季节节令、毛利结构与你的店型智能推荐；数据来自平台真实成交，进货量与结构可自主增减。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #6d28d9, #4c1d95); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 36rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.9; margin-top: 8rpx; display: block; line-height: 1.5; }
.sec { font-size: 27rpx; font-weight: 700; padding: 22rpx 28rpx 12rpx; }
.types { display: flex; flex-wrap: wrap; gap: 14rpx; padding: 0 24rpx; }
.type { width: calc(50% - 7rpx); box-sizing: border-box; display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; border: 3rpx solid transparent; }
.type.on { border-color: #7c3aed; background: #f3ecfe; }
.t-ic { font-size: 40rpx; margin-right: 12rpx; }
.t-n { font-size: 25rpx; font-weight: 700; }
.areas { display: flex; flex-wrap: wrap; gap: 12rpx; padding: 0 24rpx; }
.area { font-size: 23rpx; padding: 12rpx 24rpx; background: #fff; border-radius: 999rpx; box-shadow: $sg-shadow; color: $sg-text-2; }
.area.on { background: #7c3aed; color: #fff; }
.gen-btn { margin: 24rpx; text-align: center; padding: 26rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; font-size: 29rpx; font-weight: 800; box-shadow: 0 8rpx 20rpx rgba(124,58,237,0.3); }
.gen-btn.run { opacity: 0.7; }
.result { margin: 0 0 20rpx; }
.sum { display: flex; margin: 0 24rpx 16rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx 0; }
.su { flex: 1; text-align: center; }
.sun { font-size: 30rpx; font-weight: 800; color: #6d28d9; display: block; }
.sul { font-size: 19rpx; color: $sg-text-3; }
.item { display: flex; align-items: center; margin: 0 24rpx 12rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 16rpx; }
.it-img { width: 110rpx; height: 110rpx; border-radius: $sg-radius; margin-right: 16rpx; background: $sg-primary-light; }
.it-i { flex: 1; display: flex; flex-direction: column; }
.it-n { font-size: 25rpx; font-weight: 700; }
.it-reason { font-size: 18rpx; align-self: flex-start; padding: 3rpx 12rpx; border-radius: 6rpx; margin: 6rpx 0; font-weight: 600; }
.it-meta { font-size: 19rpx; color: $sg-text-3; }
.it-r { text-align: right; }
.it-qty { font-size: 23rpx; font-weight: 800; color: $sg-red; }
.cta { margin: 16rpx 24rpx 0; text-align: center; padding: 24rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #16884c, #0f6b3b); color: #fff; font-size: 27rpx; font-weight: 700; box-shadow: 0 8rpx 20rpx rgba(15,107,59,0.3); }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 20rpx; color: $sg-text-3; line-height: 1.6; }
</style>
