<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

const orderId = ref("O240620");
onLoad((q) => { if (q?.id) orderId.value = q.id; });

const star = ref(5);
const tags = ["品质好", "发货快", "包装好", "溯源清晰", "价格实惠", "服务好"];
const picked = ref<string[]>(["品质好", "溯源清晰"]);
const text = ref("");
const anon = ref(false);

function toggle(t: string) {
  const i = picked.value.indexOf(t);
  if (i >= 0) picked.value.splice(i, 1); else picked.value.push(t);
}
function submit() {
  if (productionBuild) return uni.showModal({ title: "需后台订单评价", content: "正式环境评价必须校验订单归属、履约完成状态和防重复提交，并保留申诉与审计记录；当前未提交本地评价。", showCancel: false });
  uni.showToast({ title: "评价已提交", icon: "success" });
  setTimeout(() => uni.navigateBack(), 800);
}
</script>

<template>
  <view class="sg-page">
    <view class="sg-card">
      <text class="oid">订单 {{ orderId }} · 评价交易</text>
      <view class="stars">
        <text v-for="i in 5" :key="i" class="star" :class="{ on: i <= star }" @tap="star = i">★</text>
        <text class="star-t">{{ ["", "很差", "较差", "一般", "满意", "非常满意"][star] }}</text>
      </view>
      <view class="tags">
        <text v-for="t in tags" :key="t" class="tag" :class="{ on: picked.includes(t) }" @tap="toggle(t)">{{ t }}</text>
      </view>
      <textarea class="ta" v-model="text" placeholder="说说你的采购体验（选填）" />
      <view class="anon" @tap="anon = !anon">
        <view class="cb" :class="{ on: anon }">{{ anon ? '✓' : '' }}</view>
        <text class="anon-t">匿名评价</text>
      </view>
    </view>
    <view class="tip">⭐ 评价将按公示规则计入供应商信用分与平台排名，并保留可验证、可追溯的记录；被评价方可申诉和更正</view>
    <view class="bar"><view class="bar-btn" @tap="submit">提交评价</view></view>
  </view>
</template>

<style lang="scss" scoped>
.oid { font-size: 24rpx; color: $sg-text-3; display: block; }
.stars { display: flex; align-items: center; margin: 24rpx 0; }
.star { font-size: 60rpx; color: $sg-border; margin-right: 10rpx; }
.star.on { color: $sg-gold; }
.star-t { font-size: 26rpx; color: $sg-gold; margin-left: 12rpx; }
.tags { display: flex; flex-wrap: wrap; }
.tag { font-size: 24rpx; color: $sg-text-2; background: $sg-bg; padding: 12rpx 26rpx; border-radius: 999rpx; margin: 0 14rpx 14rpx 0; }
.tag.on { background: $sg-primary-light; color: $sg-primary; }
.ta { width: 100%; height: 160rpx; background: $sg-bg; border-radius: $sg-radius; padding: 18rpx; font-size: 26rpx; margin-top: 8rpx; }
.anon { display: flex; align-items: center; margin-top: 20rpx; }
.cb { width: 34rpx; height: 34rpx; border-radius: 50%; border: 2rpx solid $sg-text-3; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22rpx; margin-right: 12rpx; }
.cb.on { background: $sg-primary; border-color: $sg-primary; }
.anon-t { font-size: 24rpx; color: $sg-text-2; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); }
.bar-btn { text-align: center; padding: 24rpx 0; border-radius: 999rpx; font-size: 30rpx; font-weight: 700; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; }
</style>
