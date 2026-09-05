<script setup lang="ts">
import { ref, computed } from "vue";
import { studentMeals } from "@/mock/endtools";
import { useTradeStore } from "@/store/trade";
const trade = useTradeStore();
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const mealKey = ref("lunch");
const students = ref(1000);
function setN(n: number) { students.value = Math.max(0, n); }
function onStudentsInput(event: any) { setN(Number(event.detail.value)); }
const meal = computed(() => studentMeals.find((m) => m.key === mealKey.value)!);

// 按带量食谱 × 人数 反算食材量与营养
const list = computed(() => meal.value.dishes.map((d) => ({ name: d.name, kg: +(d.grams * students.value / 1000).toFixed(1), grams: d.grams })));
const protein = computed(() => meal.value.dishes.reduce((s, d) => s + d.protein, 0));
const kcal = computed(() => meal.value.dishes.reduce((s, d) => s + d.kcal, 0));

function order() {
  if (productionBuild) return uni.showModal({ title: "需要后台校餐服务", content: "正式环境的校餐采购必须由后台审核供应商、检测和留样记录后生成订单，不能使用本地样例下单。", showCancel: false });
  const items = list.value.map((i) => ({ name: i.name, spec: `${i.kg} kg（每生 ${i.grams}g）` }));
  const id = trade.addDemand({
    title: `校餐 带量食谱配餐食材（${meal.value.name}·${students.value}人）`, category: "团餐食材",
    qty: `${list.value.length} 种`, addr: "枢纽 · 校园直配", deadline: "按校历配送",
    buyer: "学生食材供应（校方）", budget: "A级溯源 · 待报价", pic: "/static/products/p4.jpg", items,
  });
  uni.showModal({ title: "配餐采购单已生成", showCancel: false, confirmText: "去采购大厅",
    content: `需求单 ${id}｜${meal.value.name} · ${students.value} 人\n每生蛋白 ${protein}g / 热量 ${kcal}kcal；A 级溯源随货、48h 留样。`,
    success: () => (uni.setStorageSync('tradeTab','demand'), uni.switchTab({ url: '/pages/trade/index' })) });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🎓 带量食谱配餐</text>
      <text class="hs">营养带量食谱 · 按人数反算食材 · A级溯源留样</text>
    </view>

    <view class="sg-card">
      <view class="meals">
        <text v-for="m in studentMeals" :key="m.key" class="ml" :class="{ on: mealKey===m.key }" @tap="mealKey=m.key">{{ m.name }}</text>
      </view>
      <view class="pt-row">
        <text class="lbl">就餐人数</text>
        <view class="stepper">
          <text class="stp" @tap="setN(students-100)">－</text>
          <input class="pin" type="number" :value="String(students)" @input="onStudentsInput" />
          <text class="stp" @tap="setN(students+100)">＋</text>
        </view>
      </view>
    </view>

    <!-- 营养 -->
    <view class="nutri">
      <view class="nu"><text class="nu-v">{{ protein }}g</text><text class="nu-l">每生蛋白</text></view>
      <view class="nu"><text class="nu-v">{{ kcal }}</text><text class="nu-l">每生热量(kcal)</text></view>
      <view class="nu"><text class="nu-v">{{ meal.dishes.length }}</text><text class="nu-l">带量菜品</text></view>
    </view>

    <view class="sec">{{ meal.name }} · 食材用量（{{ students }} 人）</view>
    <view class="sg-card">
      <view class="li hd"><text class="li-n">食材</text><text class="li-g">每生</text><text class="li-k">总量</text></view>
      <view class="li" v-for="i in list" :key="i.name">
        <text class="li-n">{{ i.name }}</text>
        <text class="li-g">{{ i.grams }} g</text>
        <text class="li-k">{{ i.kg }} kg</text>
      </view>
    </view>

    <view class="tip">🎓 校园准入 · 农残快检 · A 级溯源随货到校 · 每餐 48h 留样、编号可查、家长可扫码。</view>
    <view class="cta" @tap="order">生成配餐采购单 ›</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #2b6cb0, #1e4e8c); padding: 32rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; }
.sg-card { margin: 20rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.meals { display: flex; gap: 14rpx; margin-bottom: 18rpx; }
.ml { flex: 1; text-align: center; font-size: 25rpx; padding: 16rpx 0; border-radius: 999rpx; background: $sg-bg; color: $sg-text-2; }
.ml.on { background: #2b6cb0; color: #fff; font-weight: 700; }
.pt-row { display: flex; align-items: center; justify-content: space-between; }
.lbl { font-size: 28rpx; font-weight: 700; }
.stepper { display: flex; align-items: center; }
.stp { width: 56rpx; height: 56rpx; border-radius: 12rpx; background: #e7f0f9; color: #2b6cb0; font-size: 32rpx; display: flex; align-items: center; justify-content: center; }
.pin { width: 130rpx; text-align: center; font-size: 32rpx; font-weight: 800; color: #1e4e8c; }
.nutri { display: flex; gap: 16rpx; margin: 16rpx 24rpx 0; }
.nu { flex: 1; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx 8rpx; display: flex; flex-direction: column; align-items: center; }
.nu-v { font-size: 32rpx; font-weight: 800; color: #2b6cb0; }
.nu-l { font-size: 19rpx; color: $sg-text-3; margin-top: 4rpx; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.li { display: flex; align-items: center; padding: 14rpx 0; border-top: 2rpx solid $sg-bg; }
.li.hd { border-top: none; }
.li.hd text { font-size: 20rpx; color: $sg-text-3; }
.li-n { flex: 1.4; font-size: 25rpx; font-weight: 600; }
.li-g { flex: 1; font-size: 23rpx; color: $sg-text-2; }
.li-k { flex: 1; font-size: 24rpx; color: #2b6cb0; font-weight: 600; }
.tip { margin: 20rpx 24rpx 0; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.cta { margin: 20rpx 24rpx; text-align: center; padding: 26rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #2b6cb0, #1e4e8c); color: #fff; font-size: 27rpx; font-weight: 700; box-shadow: 0 8rpx 20rpx rgba(43,108,176,0.3); }
</style>
