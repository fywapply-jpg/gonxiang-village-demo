<script setup lang="ts">
import { ref, computed } from "vue";

// 招标公告
const tender = {
  name: "XX 区团餐食材年度集采招标",
  buyer: "XX 区机关事务服务中心（企业法人采购方）",
  cat: "综合食材（米面油 / 蔬菜 / 肉禽蛋）",
  qty: "约 1200 吨 / 年", budget: 860, deadline: "2026-08-15",
  quals: ["食品经营许可证", "A 级溯源", "近 3 年无食安事故", "月供 ≥ 80 吨产能"],
};
// 评标规则（价格不是唯一，综合择优）
const rule = { price: 50, qual: 25, perform: 25 };
interface Bid {
  supplier: string;
  star: number;
  price: number;
  qual: number;
  perform: number;
  score?: number;
}

// 投标供应商（企业法人）
const bids = ref<Bid[]>([
  { supplier: "红旗农批直供联营体", star: 5, price: 812, qual: 95, perform: 96 },
  { supplier: "冀农优选供应链", star: 4, price: 786, qual: 88, perform: 90 },
  { supplier: "武清蔬菜产销合作社", star: 5, price: 828, qual: 96, perform: 94 },
  { supplier: "中央厨房集配中心", star: 4, price: 805, qual: 90, perform: 88 },
]);

const opened = ref(false);
const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const productionBlocked = () => uni.showModal({
  title: "需后台招采服务",
  content: "正式环境的开标、评标和中标结果必须来自后台招采单、授权采购岗位和可审计评标记录；当前页面不会生成本地中标结果。",
  showCancel: false,
});
const minPrice = computed(() => Math.min(...bids.value.map((b) => b.price)));
// 综合得分：价格分(最低价满分,线性) + 资质 + 履约，按权重
function scoreOf(b: Bid) {
  const priceScore = (minPrice.value / b.price) * 100;
  return +(priceScore * rule.price / 100 + b.qual * rule.qual / 100 + b.perform * rule.perform / 100).toFixed(1);
}
const ranked = computed(() => [...bids.value].map((b) => ({ ...b, score: scoreOf(b) })).sort((a, b) => b.score - a.score));
const winner = computed(() => ranked.value[0]);

function openBid() { if (productionBuild) return productionBlocked(); opened.value = true; }
function award() {
  if (productionBuild) return productionBlocked();
  uni.showModal({ title: "中标公示", showCancel: false, confirmText: "知道了",
    content: `中标供应商：${winner.value.supplier}\n综合得分：${winner.value.score}（价${rule.price}+质${rule.qual}+履${rule.perform}）\n中标价：¥${winner.value.price} 万\n\n结果公示、全程留痕；进入 CA 数字证书电子签约（可信时间戳固化、上链存证）与配送履约。` });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">📢 大宗集采招投标</text>
      <text class="hs">阳光比价 · 综合评标 · 中标公示 · 全程留痕可审计（B2B）</text>
    </view>

    <!-- 招标公告 -->
    <view class="sec">招标公告</view>
    <view class="sg-card">
      <text class="tn">{{ tender.name }}</text>
      <view class="r"><text class="k">采购方</text><text class="v">{{ tender.buyer }}</text></view>
      <view class="r"><text class="k">采购品类</text><text class="v">{{ tender.cat }}</text></view>
      <view class="r"><text class="k">采购量</text><text class="v">{{ tender.qty }}</text></view>
      <view class="r"><text class="k">预算</text><text class="v sg-price">¥{{ tender.budget }} 万</text></view>
      <view class="r"><text class="k">投标截止</text><text class="v">{{ tender.deadline }}</text></view>
      <view class="quals"><text class="q" v-for="q in tender.quals" :key="q">✔ {{ q }}</text></view>
    </view>

    <!-- 评标规则 -->
    <view class="sec">评标规则（综合择优，非唯低价）</view>
    <view class="rule">
      <view class="rr"><text class="rr-n">{{ rule.price }}%</text><text class="rr-l">价格分（最低价满分）</text></view>
      <view class="rr"><text class="rr-n">{{ rule.qual }}%</text><text class="rr-l">资质分</text></view>
      <view class="rr"><text class="rr-n">{{ rule.perform }}%</text><text class="rr-l">履约分</text></view>
    </view>

    <!-- 投标 / 开标 -->
    <view class="sec-row"><text class="sec">投标供应商（{{ bids.length }} 家）</text><text v-if="!opened" class="demo" @tap="openBid">▶ 开标评标</text></view>
    <view class="bid" v-for="(b, i) in (opened ? ranked : bids)" :key="b.supplier" :class="{ win: opened && i === 0 }">
      <view class="b-l">
        <view class="b-top"><text class="b-n">{{ b.supplier }}</text><text v-if="opened && i === 0" class="win-tag">中标</text><text v-else-if="opened" class="rank">第 {{ i + 1 }}</text></view>
        <text class="b-star">{{ '★'.repeat(b.star) }} · 资质 {{ b.qual }} · 履约 {{ b.perform }}</text>
      </view>
      <view class="b-r">
        <text class="b-price">¥{{ b.price }} 万</text>
        <text v-if="opened" class="b-score">综合 {{ b.score }}</text>
      </view>
    </view>

    <view v-if="opened" class="award-note">
      💡 最低价「{{ ranked.find(b => b.price === minPrice)?.supplier }}」未必中标——综合价格+资质+履约择优，中标为「{{ winner.supplier }}」。
    </view>
    <view v-if="opened" class="award-btn" @tap="award">查看中标公示 · CA 电子签约 ›</view>

    <view class="tip">🔒 招标、投标、报价、评分、中标、合同、验收全程上链留痕，防围标、防暗箱，符合阳光采购要求；投标方均为企业法人主体。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #16884c, #0f6b3b); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; line-height: 1.5; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 24rpx; }
.demo { font-size: 24rpx; color: $sg-primary; background: $sg-primary-light; padding: 8rpx 22rpx; border-radius: 999rpx; }
.sg-card { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.tn { font-size: 28rpx; font-weight: 800; display: block; margin-bottom: 12rpx; }
.r { display: flex; padding: 12rpx 0; border-top: 2rpx solid $sg-bg; }
.k { width: 160rpx; color: $sg-text-3; font-size: 23rpx; flex: none; }
.v { flex: 1; font-size: 23rpx; }
.quals { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 12rpx; padding-top: 12rpx; border-top: 2rpx solid $sg-bg; }
.q { font-size: 19rpx; color: $sg-primary; background: $sg-primary-light; padding: 5rpx 14rpx; border-radius: 6rpx; }
.rule { display: flex; gap: 14rpx; margin: 0 24rpx; }
.rr { flex: 1; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx 8rpx; display: flex; flex-direction: column; align-items: center; }
.rr-n { font-size: 36rpx; font-weight: 800; color: $sg-primary; }
.rr-l { font-size: 18rpx; color: $sg-text-3; text-align: center; margin-top: 4rpx; }
.bid { display: flex; align-items: center; justify-content: space-between; margin: 0 24rpx 12rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; border: 2rpx solid transparent; }
.bid.win { border-color: $sg-gold; background: linear-gradient(135deg, #fff9ee, #fff); }
.b-l { flex: 1; display: flex; flex-direction: column; }
.b-top { display: flex; align-items: center; gap: 10rpx; }
.b-n { font-size: 26rpx; font-weight: 700; }
.win-tag { font-size: 18rpx; color: #fff; background: $sg-gold; padding: 3rpx 12rpx; border-radius: 6rpx; }
.rank { font-size: 18rpx; color: $sg-text-3; background: $sg-bg; padding: 3rpx 12rpx; border-radius: 6rpx; }
.b-star { font-size: 20rpx; color: $sg-gold; margin-top: 4rpx; }
.b-r { text-align: right; display: flex; flex-direction: column; }
.b-price { font-size: 27rpx; font-weight: 800; color: $sg-red; }
.b-score { font-size: 20rpx; color: $sg-primary; margin-top: 2rpx; }
.award-note { margin: 4rpx 24rpx 0; padding: 16rpx 20rpx; background: $sg-gold-light; border-radius: $sg-radius; font-size: 21rpx; color: #9a6a12; line-height: 1.5; }
.award-btn { margin: 16rpx 24rpx 0; text-align: center; padding: 26rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; font-size: 27rpx; font-weight: 700; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
</style>
