<script setup lang="ts">
import { ref } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

// 一条采购需求，AI 撮合供应商
const demand = { title: "求购净菜（叶菜类）5 吨/日 · 冷链直配", buyer: "沪上团餐中央厨房", addr: "上海·闵行", need: "A级溯源 · T+0 到厂 · 账期30天" };

const matches = ref([
  { name: "崇明设施蔬菜合作社", score: 96, dims: { 就近: "38km", 时效: "当日达", 价格: "¥3.6/斤", 信用: "AA · ★5" }, note: "产地直供、A级溯源、可定制分切" },
  { name: "青浦净菜加工中心", score: 91, dims: { 就近: "52km", 时效: "当日达", 价格: "¥3.8/斤", 信用: "A · ★4" }, note: "中央厨房配套、净菜标准化" },
  { name: "苏州吴江产销联合体", score: 84, dims: { 就近: "96km", 时效: "T+1", 价格: "¥3.4/斤", 信用: "A · ★4" }, note: "价格更低、时效稍慢" },
]);
const running = ref(false);
const done = ref(false);
function match() {
  if (productionBuild) return uni.showModal({ title: "需要后台撮合服务", content: "正式环境的供需撮合必须基于已核验主体、实时库存、服务半径和报价回执，当前未执行撮合。", showCancel: false });
  done.value = false; running.value = true; setTimeout(() => { running.value = false; done.value = true; }, 1500);
}
function talk(m: any) {
  if (productionBuild) return uni.showModal({ title: "需后台撮合工单", content: "正式环境约谈必须基于实时撮合结果、双方已核验主体和可追踪消息会话；当前未创建本地工单。", showCancel: false });
  uni.showModal({ title: "发起约谈 · " + m.name, confirmText: "一键约谈",
    content: `匹配度 ${m.score}%\n${m.note}\n就近 ${m.dims.就近} · ${m.dims.时效} · ${m.dims.价格} · 信用 ${m.dims.信用}\n\n发起在线约谈并生成撮合工单？`,
    success: (r) => { if (r.confirm) uni.showToast({ title: "约谈已发起", icon: "success" }); } });
}
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty">
      <text class="production-empty-title">暂无后台撮合结果</text>
      <text class="production-empty-text">正式环境的匹配度、供应商、价格、库存和服务半径必须由后台模型与交易服务返回。本页面不展示静态供应商或报价样例。</text>
    </view>
    <template v-else>
    <view class="hero">
      <text class="ht">🤝 AI 供需撮合</text>
      <text class="hs">供货与需求语义匹配 · 就近 / 时效 / 价格 / 信用综合排序 · 秒级撮合</text>
    </view>

    <!-- 需求卡 -->
    <view class="demand">
      <text class="dm-t">📢 采购需求</text>
      <text class="dm-title">{{ demand.title }}</text>
      <text class="dm-meta">{{ demand.buyer }} · {{ demand.addr }}</text>
      <view class="dm-tags"><text class="dm-tag">{{ demand.need }}</text></view>
    </view>

    <view class="match-btn" :class="{ run: running }" @tap="match">{{ running ? 'AI 撮合中…' : '🤖 AI 一键智能撮合' }}</view>

    <!-- 撮合结果 -->
    <view v-if="done" class="result">
      <text class="res-t">为你匹配到 {{ matches.length }} 家供应商（按综合匹配度排序）</text>
      <view class="m" v-for="(m, i) in matches" :key="m.name" :class="{ best: i === 0 }">
        <view class="m-top">
          <view class="m-l"><text v-if="i === 0" class="m-best">最佳匹配</text><text class="m-n">{{ m.name }}</text></view>
          <view class="m-score"><text class="ms-n">{{ m.score }}</text><text class="ms-l">匹配度</text></view>
        </view>
        <view class="m-dims">
          <view class="md" v-for="(v, k) in m.dims" :key="k"><text class="md-k">{{ k }}</text><text class="md-v">{{ v }}</text></view>
        </view>
        <text class="m-note">{{ m.note }}</text>
        <view class="m-btn" @tap="talk(m)">一键约谈 / 撮合</view>
      </view>
    </view>

    <view class="tip">🔗 撮合基于语义理解（品类/规格/时效/资质）+ 就近半径 + 信用星级综合排序；约谈、报价、成交全程留痕，撮合成功进入下单闭环。</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #6d28d9, #4c1d95); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 36rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.9; margin-top: 8rpx; display: block; line-height: 1.5; }
.demand { margin: 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; border-left: 8rpx solid #6d28d9; }
.dm-t { font-size: 21rpx; color: #6d28d9; font-weight: 700; }
.dm-title { font-size: 27rpx; font-weight: 800; margin: 8rpx 0 6rpx; display: block; }
.dm-meta { font-size: 21rpx; color: $sg-text-3; }
.dm-tags { margin-top: 10rpx; }
.dm-tag { font-size: 20rpx; color: $sg-primary; background: $sg-primary-light; padding: 5rpx 16rpx; border-radius: 6rpx; }
.match-btn { margin: 0 24rpx; text-align: center; padding: 26rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; font-size: 29rpx; font-weight: 800; box-shadow: 0 8rpx 20rpx rgba(124,58,237,0.3); }
.match-btn.run { opacity: 0.7; }
.result { margin-top: 20rpx; }
.res-t { font-size: 22rpx; color: $sg-text-3; padding: 0 28rpx 12rpx; display: block; }
.m { margin: 0 24rpx 14rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; border: 3rpx solid transparent; }
.m.best { border-color: #7c3aed; }
.m-top { display: flex; align-items: center; justify-content: space-between; }
.m-l { display: flex; flex-direction: column; }
.m-best { font-size: 18rpx; color: #fff; background: #7c3aed; align-self: flex-start; padding: 2rpx 12rpx; border-radius: 6rpx; margin-bottom: 4rpx; }
.m-n { font-size: 27rpx; font-weight: 800; }
.m-score { text-align: center; }
.ms-n { font-size: 40rpx; font-weight: 800; color: #6d28d9; display: block; line-height: 1; }
.ms-l { font-size: 17rpx; color: $sg-text-3; }
.m-dims { display: flex; flex-wrap: wrap; gap: 10rpx; margin: 12rpx 0; }
.md { display: flex; align-items: center; background: $sg-bg; border-radius: 6rpx; padding: 6rpx 12rpx; }
.md-k { font-size: 18rpx; color: $sg-text-3; margin-right: 6rpx; }
.md-v { font-size: 19rpx; font-weight: 600; }
.m-note { font-size: 20rpx; color: $sg-text-3; display: block; margin-bottom: 12rpx; }
.m-btn { text-align: center; padding: 18rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #16884c, #0f6b3b); color: #fff; font-size: 25rpx; font-weight: 700; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 20rpx; color: $sg-text-3; line-height: 1.6; }
.production-empty { margin: 48rpx 24rpx; padding: 34rpx 28rpx; border: 2rpx solid #d8e7de; border-radius: 22rpx; background: #f7fbf8; }
.production-empty-title { display: block; color: #145d3c; font-size: 32rpx; font-weight: 900; }
.production-empty-text { display: block; margin-top: 16rpx; color: #5e7167; font-size: 24rpx; line-height: 1.7; }
</style>
