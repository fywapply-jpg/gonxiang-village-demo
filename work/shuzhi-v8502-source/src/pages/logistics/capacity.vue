<script setup lang="ts">
import { ref } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

// 运力竞价：货主发布运输需求，冷链承运方竞价
const jobs = ref([
  { id: "C1", route: "赣州 → 深圳", cargo: "脐橙 30 吨", temp: "4~6℃", need: "冷藏车", deadline: "今日 18:00", budget: "≤ 9800 元", bids: 5, best: 9200, won: false },
  { id: "C2", route: "潍坊 → 北京", cargo: "大白菜 20 吨", temp: "0~4℃", need: "冷藏车", deadline: "明日 08:00", budget: "≤ 6500 元", bids: 8, best: 6100, won: false },
  { id: "C3", route: "五常 → 上海", cargo: "大米 40 吨", temp: "常温", need: "厢式货车", deadline: "3 天内", budget: "≤ 12000 元", bids: 3, best: 11200, won: false },
]);

function bid(j: any) {
  if (productionBuild) return uni.showModal({ title: "需后台运力竞价", content: "正式环境报价必须由后台校验承运主体、车辆/司机资质、服务半径和竞价时效；当前未提交本地报价。", showCancel: false });
  uni.showModal({ title: "参与竞价", content: `为「${j.route} · ${j.cargo}」报价承运。当前最优价 ¥${j.best}，出价越优越易中标。`,
    confirmText: "提交报价", success: (r) => { if (r.confirm) { j.bids++; j.won = true; uni.showToast({ title: "报价已提交", icon: "success" }); } } });
}
</script>

<template>
  <view class="sg-page">
    <view class="hd">
      <text class="hd-t">冷链运力竞价</text>
      <text class="hd-s">货主发单 · 承运方竞价 · 全程温控定位上链 · 价优者得</text>
    </view>

    <view class="card" v-for="j in jobs" :key="j.id">
      <view class="sg-between">
        <text class="route">{{ j.route }}</text>
        <text class="need">{{ j.need }}</text>
      </view>
      <text class="cargo">{{ j.cargo }} · 温区 {{ j.temp }}</text>
      <view class="meta">
        <text class="m">🕑 截止 {{ j.deadline }}</text>
        <text class="m">预算 {{ j.budget }}</text>
      </view>
      <view class="bidbar">
        <view class="bid-l">
          <text class="best">当前最优 ¥{{ j.best }}</text>
          <text class="bids">{{ j.bids }} 家竞价</text>
        </view>
        <view class="bid-btn" :class="{ won: j.won }" @tap="bid(j)">{{ j.won ? '✔ 已报价' : '参与竞价' }}</view>
      </view>
    </view>
    <view class="tip">🔗 中标后生成运单，冷链温湿度、GPS 轨迹全程上链，异常自动告警</view>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, $sg-blue, #1e4f80); padding: 36rpx 28rpx; color: #fff; }
.hd-t { font-size: 32rpx; font-weight: 800; }
.hd-s { font-size: 21rpx; opacity: 0.9; margin-top: 8rpx; display: block; }
.card { background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 24rpx 24rpx 0; padding: 24rpx; }
.route { font-size: 30rpx; font-weight: 700; }
.need { font-size: 20rpx; color: $sg-blue; background: #eef5ff; padding: 4rpx 14rpx; border-radius: 999rpx; }
.cargo { font-size: 24rpx; color: $sg-text-2; display: block; margin: 10rpx 0; }
.meta { display: flex; gap: 24rpx; margin-bottom: 14rpx; }
.m { font-size: 22rpx; color: $sg-text-3; }
.bidbar { display: flex; align-items: center; justify-content: space-between; padding-top: 16rpx; border-top: 2rpx solid $sg-border; }
.bid-l { display: flex; flex-direction: column; }
.best { font-size: 28rpx; font-weight: 700; color: $sg-red; }
.bids { font-size: 20rpx; color: $sg-text-3; }
.bid-btn { padding: 16rpx 36rpx; border-radius: 999rpx; background: $sg-blue; color: #fff; font-size: 26rpx; font-weight: 600; }
.bid-btn.won { background: $sg-primary; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
</style>
