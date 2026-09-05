<script setup lang="ts">
import { stationBoard as s } from "@/mock";
const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const actDesc: Record<string, string> = {
  线下业务登记: "现场录入产地收购、质检结果、入库信息，数据实时上链存证。",
  物联网设备运维: "冷库温控、传感器等终端故障报修与运维记录上报。",
  助农服务对接: "协助农户金融申请、农技服务预约、政策咨询登记。",
};
function act(t: string) {
  if (productionBuild) return uni.showModal({ title: "需后台服务站台账", content: `正式环境「${t}」办理必须关联服务站、经办人、材料和结果；当前未创建本地业务记录。`, showCancel: false });
  uni.showModal({ title: t, content: actDesc[t] || (t + " 现场办理"), confirmText: "开始办理",
    success: (r) => { if (r.confirm) uni.showToast({ title: "已提交", icon: "success" }); } });
}
</script>

<template>
  <view class="sg-page">
    <view class="hub-entry" @tap="uni.navigateTo({ url: '/pages/station/hub' })">
      <text class="hb-ic">🏛️</text>
      <view class="hb-i"><text class="hb-t">村社综合服务站 · 一站通办</text><text class="hb-s">代买农资/代卖农产/快递/金融/政务/团购/溯源 村口全办</text></view>
      <text class="hb-go">进入 ›</text>
    </view>

    <view class="hero">
      <text class="ht">{{ s.name }}</text>
      <view class="board">
        <view class="b"><text class="bn">{{ s.today.orders }}</text><text class="bl">今日交易</text></view>
        <view class="b"><text class="bn">{{ s.today.serve }}</text><text class="bl">服务人次</text></view>
        <view class="b"><text class="bn">{{ s.today.agent }}</text><text class="bl">代办业务</text></view>
      </view>
    </view>

    <view class="acts">
      <view class="a" @tap="uni.navigateTo({ url: '/pages/register/index' })"><text class="ai">📝</text><text>入驻代办</text></view>
      <view class="a" @tap="act('线下业务登记')"><text class="ai">📋</text><text>业务登记</text></view>
      <view class="a" @tap="act('物联网设备运维')"><text class="ai">🔧</text><text>设备运维</text></view>
      <view class="a" @tap="act('助农服务对接')"><text class="ai">🤝</text><text>助农服务</text></view>
    </view>

    <view class="sech">待办事项</view>
    <view class="card" v-for="(t, i) in s.todos" :key="i" @tap="act(t.title)">
      <view class="ci"><text class="ct">{{ t.title }}</text><text class="cg">{{ t.tag }}</text></view>
      <text class="cgo">处理 ›</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.hub-entry { display: flex; align-items: center; margin: 24rpx 24rpx 0; padding: 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); box-shadow: 0 8rpx 20rpx rgba(15,107,59,0.28); }
.hb-ic { font-size: 44rpx; margin-right: 14rpx; }
.hb-i { flex: 1; display: flex; flex-direction: column; }
.hb-t { font-size: 26rpx; font-weight: 800; color: #fff; }
.hb-s { font-size: 18rpx; color: rgba(255,255,255,0.85); margin-top: 4rpx; line-height: 1.4; }
.hb-go { font-size: 23rpx; color: #fff; background: rgba(255,255,255,0.2); padding: 8rpx 18rpx; border-radius: 999rpx; }
.hero { background: linear-gradient(160deg, $sg-primary, $sg-primary-deep); padding: 40rpx 28rpx; color: #fff; }
.ht { font-size: 32rpx; font-weight: 800; }
.board { display: flex; margin-top: 24rpx; }
.b { flex: 1; text-align: center; }
.bn { font-size: 48rpx; font-weight: 800; display: block; }
.bl { font-size: 22rpx; opacity: 0.9; }
.acts { display: flex; background: #fff; margin: 24rpx; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx 0; }
.a { flex: 1; display: flex; flex-direction: column; align-items: center; font-size: 24rpx; color: $sg-text-2; }
.ai { font-size: 52rpx; margin-bottom: 8rpx; }
.sech { padding: 6rpx 28rpx 12rpx; font-size: 30rpx; font-weight: 700; }
.card { display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 20rpx; padding: 24rpx; }
.ci { display: flex; flex-direction: column; }
.ct { font-size: 27rpx; font-weight: 600; }
.cg { font-size: 20rpx; color: $sg-primary; background: $sg-primary-light; padding: 2rpx 12rpx; border-radius: 6rpx; align-self: flex-start; margin-top: 8rpx; }
.cgo { font-size: 24rpx; color: $sg-primary; }
</style>
