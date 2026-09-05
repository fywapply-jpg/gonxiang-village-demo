<script setup lang="ts">
import { ref, computed } from "vue";
import { dishes, matPrice } from "@/mock/procure";
import { useTradeStore } from "@/store/trade";
const trade = useTradeStore();
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const portions = ref(5000);
const picked = ref<Record<string, boolean>>({ gbjd: true, xhsjd: true, qcssc: true, mifan: true, tddnr: false, mydf: false });
function toggle(k: string) { picked.value[k] = !picked.value[k]; }
function setP(n: number) { portions.value = Math.max(0, n); }
function onPortionsInput(event: any) { setP(Number(event.detail.value)); }

// 聚合 BOM：按原料汇总（用量 kg + 小计）
const bom = computed(() => {
  const agg: Record<string, number> = {};
  for (const d of dishes) {
    if (!picked.value[d.key]) continue;
    for (const ing of d.ings) agg[ing.mat] = (agg[ing.mat] || 0) + ing.g * portions.value;
  }
  return Object.entries(agg)
    .map(([mat, g]) => { const kg = g / 1000; const price = matPrice[mat] || 0; return { mat, kg: +kg.toFixed(1), price, sub: +(kg * price).toFixed(0) }; })
    .sort((a, b) => b.sub - a.sub);
});
const total = computed(() => bom.value.reduce((s, x) => s + x.sub, 0));
const perPortion = computed(() => (portions.value ? (total.value / portions.value).toFixed(2) : "0"));
const dishCount = computed(() => dishes.filter((d) => picked.value[d.key]).length);

function genDemand() {
  if (productionBuild) return uni.showModal({ title: "需要后台中央厨房服务", content: "正式环境的菜谱 BOM 采购必须由后台审核菜谱、供应商、检测和结算条件后生成需求，不能使用本地样例下单。", showCancel: false });
  if (!dishCount.value || !portions.value) return uni.showToast({ title: "请先选菜品并填份数", icon: "none" });
  const items = bom.value.map((b) => ({ name: b.mat, spec: `${b.kg} kg`, price: b.price, sub: b.sub }));
  const id = trade.addDemand({
    title: `求购 中央厨房团餐食材（${dishCount.value}菜 · ${portions.value}份）`,
    category: "团餐食材", qty: `${bom.value.length} 种 · 共 ${bom.value.reduce((s, x) => s + x.kg, 0).toFixed(0)} kg`,
    addr: "上海 · 江桥农批枢纽", deadline: "3 天内",
    buyer: "沪上团餐中央厨房", budget: `≤ ${total.value.toLocaleString()} 元`, pic: "/static/products/p8.jpg", items,
  });
  uni.showModal({
    title: "采购需求已生成", showCancel: false, confirmText: "去采购大厅看",
    content: `已按 BOM 清单生成需求单 ${id}\n${bom.value.length} 种原料 · 预算 ¥${total.value.toLocaleString()}\n将发布到采购大厅，接收供应商报价。`,
    success: () => (uni.setStorageSync('tradeTab','demand'), uni.switchTab({ url: '/pages/trade/index' })),
  });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🍚 中央厨房 · 菜谱 BOM 测算</text>
      <text class="hs">按菜单反算食材用量与成本，一键生成采购需求</text>
    </view>

    <!-- 份数 -->
    <view class="sg-card">
      <view class="pt-row">
        <text class="lbl">出餐份数</text>
        <view class="stepper">
          <text class="stp" @tap="setP(portions - 500)">－</text>
          <input class="pin" type="number" :value="String(portions)" @input="onPortionsInput" />
          <text class="stp" @tap="setP(portions + 500)">＋</text>
        </view>
      </view>
      <view class="quick">
        <text v-for="n in [1000, 3000, 5000, 10000]" :key="n" class="qb" :class="{ on: portions === n }" @tap="setP(n)">{{ n }}份</text>
      </view>
    </view>

    <!-- 选菜品 -->
    <view class="sec">选择菜谱（{{ dishCount }} 道）</view>
    <view class="dishes">
      <view class="dish" :class="{ on: picked[d.key] }" v-for="d in dishes" :key="d.key" @tap="toggle(d.key)">
        <text class="d-ic">{{ d.icon }}</text>
        <text class="d-n">{{ d.name }}</text>
        <text class="d-chk">{{ picked[d.key] ? '✓' : '＋' }}</text>
      </view>
    </view>

    <!-- BOM 清单 -->
    <view class="sec">食材 BOM 清单（{{ bom.length }} 种）</view>
    <view class="sg-card">
      <view class="bom-hd"><text class="bh mat">原料</text><text class="bh use">用量</text><text class="bh pr">单价</text><text class="bh sub">小计</text></view>
      <view class="bom-row" v-for="b in bom" :key="b.mat">
        <text class="bc mat">{{ b.mat }}</text>
        <text class="bc use">{{ b.kg }} kg</text>
        <text class="bc pr">¥{{ b.price }}/kg</text>
        <text class="bc sub">¥{{ b.sub.toLocaleString() }}</text>
      </view>
      <view v-if="!bom.length" class="empty">请选择至少一道菜</view>
      <view class="bom-total">
        <view class="bt-l"><text class="bt-k">合计采购成本</text><text class="bt-per">约 ¥{{ perPortion }} / 份</text></view>
        <text class="bt-v">¥{{ total.toLocaleString() }}</text>
      </view>
    </view>

    <view class="tip">📐 用量 = 每份克数 × 份数，按原料聚合；单价取枢纽当日批发价。实际以到货过磅计量为准。</view>

    <view class="cta" @tap="genDemand">① 用此清单一键生成采购需求 ›</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #8054d6, #5b21b6); padding: 32rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 22rpx; opacity: 0.92; margin-top: 8rpx; display: block; }
.sg-card { margin: 20rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.pt-row { display: flex; align-items: center; justify-content: space-between; }
.lbl { font-size: 28rpx; font-weight: 700; }
.stepper { display: flex; align-items: center; }
.stp { width: 60rpx; height: 60rpx; border-radius: 14rpx; background: $sg-primary-light; color: $sg-primary; font-size: 36rpx; display: flex; align-items: center; justify-content: center; }
.pin { width: 150rpx; text-align: center; font-size: 34rpx; font-weight: 800; color: $sg-primary-deep; }
.quick { display: flex; gap: 14rpx; margin-top: 18rpx; }
.qb { flex: 1; text-align: center; font-size: 24rpx; padding: 14rpx 0; border-radius: 999rpx; background: $sg-bg; color: $sg-text-2; }
.qb.on { background: $sg-primary; color: #fff; }
.sec { font-size: 30rpx; font-weight: 700; padding: 26rpx 28rpx 12rpx; }
.dishes { display: flex; flex-wrap: wrap; gap: 16rpx; padding: 0 24rpx; }
.dish { width: calc((100% - 32rpx) / 3); box-sizing: border-box; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 10rpx; display: flex; flex-direction: column; align-items: center; border: 3rpx solid transparent; position: relative; }
.dish.on { border-color: $sg-primary; }
.d-ic { font-size: 40rpx; }
.d-n { font-size: 23rpx; font-weight: 600; margin-top: 6rpx; }
.d-chk { position: absolute; top: 8rpx; right: 10rpx; font-size: 22rpx; color: $sg-primary; font-weight: 800; }
.bom-hd { display: flex; padding-bottom: 12rpx; border-bottom: 2rpx solid $sg-border; }
.bh { font-size: 21rpx; color: $sg-text-3; }
.bom-row { display: flex; padding: 14rpx 0; border-bottom: 2rpx solid $sg-bg; }
.bc { font-size: 24rpx; }
.mat { flex: 1.4; font-weight: 600; }
.use { flex: 1; color: $sg-text-2; }
.pr { flex: 1; color: $sg-text-3; }
.sub { flex: 1; text-align: right; color: $sg-red; font-weight: 600; }
.empty { text-align: center; font-size: 24rpx; color: $sg-text-3; padding: 24rpx 0; }
.bom-total { display: flex; align-items: center; justify-content: space-between; margin-top: 14rpx; padding-top: 16rpx; border-top: 2rpx solid $sg-border; }
.bt-l { display: flex; flex-direction: column; }
.bt-k { font-size: 24rpx; font-weight: 700; }
.bt-per { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }
.bt-v { font-size: 38rpx; font-weight: 800; color: $sg-red; }
.tip { margin: 20rpx 24rpx 0; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.cta { margin: 24rpx; text-align: center; padding: 26rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #7c3aed, #5b21b6); color: #fff; font-size: 27rpx; font-weight: 700; box-shadow: 0 8rpx 20rpx rgba(124,58,237,0.3); }
</style>
