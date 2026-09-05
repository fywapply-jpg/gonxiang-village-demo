<script setup lang="ts">
import { villageProducts } from "@/mock/products";
const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const directSupply = villageProducts.slice(0, 4);

const meals = [
  { name: "红烧肉套餐", price: "8 元", tag: "60-79岁", emoji: "🍚" },
  { name: "三菜一汤 · 营养餐", price: "8 元", tag: "60-79岁", emoji: "🥗" },
  { name: "长者爱心餐", price: "免费", tag: "80岁以上", emoji: "🍲" },
];
const convenience = [
  { icon: "📦", name: "快递代收" },
  { icon: "🔧", name: "家政维修" },
  { icon: "💼", name: "就业帮扶" },
  { icon: "💡", name: "水电缴费" },
];
const social = [
  { icon: "♟️", name: "免费棋牌" },
  { icon: "❤️", name: "健康监测" },
  { icon: "🎪", name: "社区活动" },
  { icon: "📖", name: "长者课堂" },
];

const svcDesc: Record<string, string> = {
  快递代收: "代收各快递公司包裹，凭取件码到店自提，支持代寄。",
  家政维修: "预约保洁、维修、管道疏通等上门服务，明码标价。",
  就业帮扶: "发布本地用工岗位、灵活就业登记与技能培训报名。",
  水电缴费: "水费、电费、燃气、话费一站式代缴，实时到账。",
  免费棋牌: "社区免费棋牌室，可预约座位与活动时段。",
  健康监测: "免费测血压血糖、健康档案管理、家庭医生签约。",
  社区活动: "广场舞、文艺演出、节庆活动报名与通知。",
  长者课堂: "智能手机、健康养生、防诈骗等长者公益课程报名。",
};
function service(name: string) {
  if (productionBuild) return uni.showModal({ title: "需后台服务受理", content: `正式环境「${name}」办理必须由后台登记服务站、人员、时间和受理结果；当前未创建本地工单。`, showCancel: false });
  uni.showModal({ title: name, content: svcDesc[name] || "社区便民服务", confirmText: "预约 / 使用",
    success: (r) => { if (r.confirm) uni.showToast({ title: "已受理", icon: "success" }); } });
}
function orderMeal(name: string, price: string) {
  if (productionBuild) return uni.showModal({ title: "需后台助餐订单", content: `正式环境「${name}」预订必须校验补贴、库存、支付和取餐记录；当前未创建本地订单。`, showCancel: false });
  uni.showModal({ title: "预订助餐", content: `${name}（${price}）\n可选到店堂食或长者送餐上门，支持养老补贴抵扣。`, confirmText: "确认预订",
    success: (r) => { if (r.confirm) uni.showToast({ title: "预订成功", icon: "success" }); } });
}
// B2C：社区居民买菜走社区团购，不跳 B2B 供货大厅
function goProduct(_id: string) { uni.navigateTo({ url: "/pages/village/groupbuy" }); }
</script>

<template>
  <view class="sg-page">
    <!-- 党建联建头部 -->
    <view class="hd">
      <view class="hd-row">
        <view class="party">🚩 党建联建</view>
        <text class="store">📍 龙南镇 数智供社民生终端</text>
      </view>
      <text class="hd-title">数智供社 · 社区民生服务终端</text>
      <text class="hd-sub">打通服务"最后一公里" · 直供 / 助餐 / 便民 / 社交健康</text>
      <view class="b2c-note">🏘️ 面向社区居民（B2C）· 与数智供社 B2B 平台各自独立、互为支撑</view>
    </view>

    <!-- 农产品直供区 30% -->
    <view class="sec">
      <view class="sec-hd">
        <view class="sec-l"><text class="sec-ic">🥬</text><text class="sec-t">农产品直供区</text></view>
        <text class="sec-tag lk" @tap="uni.navigateTo({ url: '/pages/village/groupbuy' })">🛒 社区团购 ›</text>
      </view>
      <scroll-view scroll-x class="pscroll">
        <view class="pcard" v-for="p in directSupply" :key="p.id" @tap="goProduct(p.id)">
          <image class="pimg" :src="p.pic" mode="aspectFill" />
          <text class="pname">{{ p.name }}</text>
          <text class="pprice">{{ p.priceText }}</text>
        </view>
      </scroll-view>
    </view>

    <!-- 老年助餐区 30% -->
    <view class="sec">
      <view class="sec-hd">
        <view class="sec-l"><text class="sec-ic">🍚</text><text class="sec-t">老年助餐区</text></view>
        <text class="sec-tag lk" @tap="uni.navigateTo({ url: '/pages/village/meal' })">🍽️ 在线订餐 ›</text>
      </view>
      <view class="meal" v-for="m in meals" :key="m.name" @tap="orderMeal(m.name, m.price)">
        <text class="meal-e">{{ m.emoji }}</text>
        <view class="meal-i"><text class="meal-n">{{ m.name }}</text><text class="meal-tag">{{ m.tag }}</text></view>
        <text class="meal-p" :class="{ free: m.price === '免费' }">{{ m.price }}</text>
      </view>
    </view>

    <!-- 便民服务区 20% -->
    <view class="sec">
      <view class="sec-hd"><view class="sec-l"><text class="sec-ic">🛎️</text><text class="sec-t">便民服务区</text></view></view>
      <view class="grid">
        <view class="g" v-for="c in convenience" :key="c.name" @tap="service(c.name)">
          <view class="g-ic">{{ c.icon }}</view><text class="g-lb">{{ c.name }}</text>
        </view>
      </view>
    </view>

    <!-- 社交健康区 20% -->
    <view class="sec">
      <view class="sec-hd"><view class="sec-l"><text class="sec-ic">💗</text><text class="sec-t">社交健康区</text></view></view>
      <view class="grid">
        <view class="g" v-for="s in social" :key="s.name" @tap="service(s.name)">
          <view class="g-ic pink">{{ s.icon }}</view><text class="g-lb">{{ s.name }}</text>
        </view>
      </view>
    </view>

    <view class="tip">🏘️ 全国布局标准化社区终端（80-200㎡），单店年净利约 15 万，服务民生 + 反哺三农</view>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, #c0392b, #a5281c); padding: 40rpx 28rpx 34rpx; color: #fff; }
.hd-row { display: flex; align-items: center; justify-content: space-between; }
.party { font-size: 22rpx; background: rgba(255,255,255,0.2); padding: 6rpx 18rpx; border-radius: 999rpx; }
.store { font-size: 22rpx; opacity: 0.92; }
.hd-title { font-size: 34rpx; font-weight: 800; display: block; margin-top: 20rpx; }
.hd-sub { font-size: 22rpx; opacity: 0.9; margin-top: 8rpx; display: block; }
.b2c-note { font-size: 19rpx; opacity: 0.92; margin-top: 12rpx; display: inline-block; border: 2rpx solid rgba(255,255,255,0.35); padding: 5rpx 16rpx; border-radius: 999rpx; }

.sec { background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 24rpx 24rpx 0; padding: 24rpx; }
.sec-hd { display: flex; align-items: center; justify-content: space-between; margin-bottom: 18rpx; }
.sec-l { display: flex; align-items: center; }
.sec-ic { font-size: 36rpx; margin-right: 12rpx; }
.sec-t { font-size: 30rpx; font-weight: 700; }
.sec-tag { font-size: 20rpx; color: $sg-primary; background: $sg-primary-light; padding: 4rpx 14rpx; border-radius: 999rpx; }

.pscroll { white-space: nowrap; }
.pcard { display: inline-block; width: 210rpx; margin-right: 18rpx; vertical-align: top; }
.pimg { width: 210rpx; height: 180rpx; border-radius: $sg-radius; background: $sg-primary-light; display: block; }
.pname { font-size: 23rpx; margin-top: 8rpx; display: block; white-space: normal; height: 62rpx; overflow: hidden; }
.pprice { font-size: 26rpx; font-weight: 700; color: $sg-red; }

.meal { display: flex; align-items: center; padding: 18rpx 0; border-top: 2rpx solid $sg-border; }
.meal-e { font-size: 44rpx; margin-right: 18rpx; }
.meal-i { flex: 1; display: flex; flex-direction: column; }
.meal-n { font-size: 27rpx; font-weight: 600; }
.meal-tag { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.meal-p { font-size: 30rpx; font-weight: 800; color: $sg-red; }
.meal-p.free { color: $sg-primary; }

.grid { display: flex; flex-wrap: wrap; }
.g { width: 25%; display: flex; flex-direction: column; align-items: center; padding: 12rpx 0; }
.g-ic { width: 84rpx; height: 84rpx; border-radius: 24rpx; background: $sg-primary-light; display: flex; align-items: center; justify-content: center; font-size: 44rpx; }
.g-ic.pink { background: #fde8ef; }
.g-lb { font-size: 22rpx; color: $sg-text-2; margin-top: 10rpx; }

.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
</style>
