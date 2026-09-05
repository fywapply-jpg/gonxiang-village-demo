<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { orders } from "@/mock";
import { useTradeStore } from "@/store/trade";
import { getTrades } from "@/services/localApi";
const trade = useTradeStore();
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const filters = ["全部", "待复核", "待付款", "待确认", "待发货", "运输中", "已完成"];
const f = ref("全部");
const remote = ref<any[]>([]);
const remoteLoading = ref(false);
const remoteError = ref("");
const all = computed(() => {
  const mapped = remote.value.map((o) => ({ id: o.id, status: o.status, amount: Number(o.amount) || 0, title: "B2B农产品交易", qty: "批量订单", counterparty: `${o.buyer_name || "采购方"} ↔ ${o.supplier_name || "供货方"}`, emoji: "📦", chainHash: "后台四流台账", time: o.created_at || "—" }));
  if (productionBuild) return mapped;
  const seen = new Set<string>();
  return [...mapped, ...trade.myOrders, ...orders].filter((o) => { if (seen.has(o.id)) return false; seen.add(o.id); return true; });
});
const list = computed(() => (f.value === "全部" ? all.value : all.value.filter((o) => o.status === f.value)));

const statusColor: Record<string, string> = {
  待复核: "#d99a2b", 待付款: "#7c3aed", 已驳回: "#d64541",
  待确认: "#d99a2b", 待发货: "#d99a2b", 运输中: "#2b6cb0",
  待收货: "#2b6cb0", 已完成: "#16884c", 售后: "#d64541",
};
function detail(id: string) { uni.navigateTo({ url: `/pages/trade/order-detail?id=${id}` }); }
async function loadRemote() {
  remoteLoading.value = true;
  remoteError.value = "";
  try { remote.value = await getTrades(); } catch (error: any) { remote.value = []; remoteError.value = error?.message || "后台订单暂不可读，请先登录授权"; }
  remoteLoading.value = false;
}
onLoad(loadRemote);
onShow(loadRemote);
</script>

<template>
  <view class="sg-page">
    <scroll-view scroll-x class="fs">
      <text v-for="x in filters" :key="x" class="f" :class="{ on: f === x }" @tap="f = x">{{ x }}</text>
    </scroll-view>
    <view v-if="remoteLoading" class="sync-tip">正在读取后台订单状态…</view>
    <view v-else-if="remote.length" class="sync-tip">已同步 {{ remote.length }} 笔后台交易，列表状态以后台为准</view>
    <view v-if="!remoteLoading && !list.length" class="empty">
      <text class="empty-title">{{ productionBuild ? '暂无后台订单' : '暂无订单' }}</text>
      <text class="empty-text">{{ productionBuild ? (remoteError || '当前主体没有可查看的交易记录') : '完成下单后，订单会显示在这里' }}</text>
    </view>
    <view class="card" v-for="o in list" :key="o.id" @tap="detail(o.id)">
      <view class="sg-between">
        <text class="oid">订单号 {{ o.id }}</text>
        <text class="st" :style="{ color: statusColor[o.status] }">{{ o.status }}</text>
      </view>
      <view class="mid">
        <text class="emoji">{{ o.emoji }}</text>
        <view class="info">
          <text class="nm">{{ o.title }} · {{ o.qty }}</text>
          <text class="cp">{{ o.counterparty }}</text>
        </view>
        <text class="amt">¥{{ o.amount.toLocaleString() }}</text>
      </view>
      <view class="foot">
        <text class="hash">🔗 链上存证 {{ o.chainHash }}</text>
        <text class="time">{{ o.time }}</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.fs { white-space: nowrap; padding: 20rpx 24rpx; }
.sync-tip { margin: 0 24rpx 14rpx; padding: 12rpx 16rpx; border-radius: 12rpx; color: #176a4b; background: #eef9f2; font-size: 19rpx; }
.f { display: inline-block; padding: 10rpx 28rpx; font-size: 26rpx; color: $sg-text-2; background: #fff; border-radius: 999rpx; margin-right: 14rpx; }
.f.on { background: $sg-primary; color: #fff; }
.card { background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 20rpx; padding: 24rpx; }
.oid { font-size: 24rpx; color: $sg-text-3; }
.st { font-size: 26rpx; font-weight: 700; }
.mid { display: flex; align-items: center; margin: 20rpx 0; }
.emoji { width: 88rpx; height: 88rpx; border-radius: $sg-radius; background: $sg-primary-light; display: flex; align-items: center; justify-content: center; font-size: 48rpx; margin-right: 18rpx; }
.info { flex: 1; display: flex; flex-direction: column; }
.nm { font-size: 28rpx; font-weight: 600; }
.cp { font-size: 22rpx; color: $sg-text-3; margin-top: 4rpx; }
.amt { font-size: 30rpx; font-weight: 700; color: $sg-red; }
.foot { display: flex; justify-content: space-between; padding-top: 16rpx; border-top: 2rpx solid $sg-border; }
.hash { font-size: 22rpx; color: $sg-blue; }
.time { font-size: 22rpx; color: $sg-text-3; }
.empty { margin: 80rpx 24rpx; padding: 44rpx 24rpx; text-align: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; }
.empty-title { display: block; font-size: 30rpx; font-weight: 800; color: $sg-text; }
.empty-text { display: block; margin-top: 12rpx; font-size: 22rpx; line-height: 1.6; color: $sg-text-3; }
</style>
