<script setup lang="ts">
import { ref } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

const kpis = [
  { n: "386", l: "今日服务人次" },
  { n: "1,240", l: "覆盖长者" },
  { n: "68", l: "独居重点关怀" },
  { n: "42", l: "志愿者" },
];

// 送餐即探访（独居老人）
const visits = ref([
  { name: "李奶奶 88岁", addr: "龙南镇幸福路12号", note: "独居 · 高血压", status: "安好", by: "志愿者·小王 09:12" },
  { name: "张爷爷 82岁", addr: "龙南镇建设街4号", note: "独居 · 行动不便", status: "需关注", by: "志愿者·小陈 09:20" },
  { name: "王奶奶 79岁", addr: "龙南镇育才巷7号", note: "空巢", status: "安好", by: "网格员·老刘 09:05" },
]);
const stColor: Record<string, string> = { 安好: "#16884c", 需关注: "#d99a2b", 已上报: "#d64541" };
function report(v: any) {
  if (v.status === "已上报") return;
  if (productionBuild) return uni.showModal({ title: "需后台关怀工单", content: "正式环境异常上报必须写入受理人、通知对象和响应时限，涉及隐私数据需按权限处理；当前未提交本地工单。", showCancel: false });
  uni.showModal({ title: "异常一键上报", content: `${v.name} · ${v.note}\n上报至社区网格 + 家属 + 卫生室，启动关怀响应。`,
    confirmText: "确认上报", confirmColor: "#d64541", success: (r) => { if (r.confirm) { v.status = "已上报"; uni.showToast({ title: "已上报关怀响应", icon: "success" }); } } });
}

// 爱心认捐
const fund = ref({ target: 5000, raised: 3860 });
const donors = [
  { name: "数智供社联建企业", amount: 1200 },
  { name: "乡贤 · 王先生", amount: 800 },
  { name: "爱心居民（匿名）", amount: 260 },
];
function donate(n: number) {
  if (productionBuild) return uni.showModal({ title: "需后台公益收款", content: "正式环境认捐必须由持牌支付或公益账户收款，并关联凭证、专账和公示记录；当前未执行本地认捐。", showCancel: false });
  uni.showModal({ title: "爱心认捐一顿饭", content: `认捐 ${n} 元 ≈ ${Math.round(n / 8)} 顿长者助餐。\n认捐上链公示、爱心墙留名，资金专款专用。`,
    confirmText: "确认认捐", success: (r) => { if (r.confirm) { fund.value.raised = Math.min(fund.value.target, fund.value.raised + n); uni.showToast({ title: "感谢您的爱心 ❤️", icon: "none" }); } } });
}

// 一顿饭的钱从哪来（8元长者餐）
const cost = [
  { k: "政府养老补贴", v: 4, c: "#16884c" },
  { k: "慈善认捐", v: 2, c: "#d64541" },
  { k: "个人自付", v: 2, c: "#2b6cb0" },
];
function meal() { uni.navigateTo({ url: "/pages/village/meal" }); }
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty">
      <text class="production-empty-title">暂无后台民生关怀台账</text>
      <text class="production-empty-text">正式环境的服务对象、助餐补贴、认捐流水和异常关怀工单必须由后台民生服务与持牌收款机构返回。本页面不展示静态金额、老人信息或捐赠样例。</text>
    </view>
    <template v-else>
    <view class="hero">
      <text class="ht">❤️ 银发关怀 · 助餐公益</text>
      <text class="hs">送一餐饭 · 看一眼人 · 问一句好 — 助餐即探访</text>
      <view class="kpis">
        <view class="k" v-for="x in kpis" :key="x.l"><text class="kn">{{ x.n }}</text><text class="kl">{{ x.l }}</text></view>
      </view>
    </view>

    <!-- 送餐即探访 -->
    <view class="sec-row"><text class="sec">🚪 送餐即探访（独居老人）</text><text class="tag-live">实时</text></view>
    <view class="intro">送餐上门 = 每日探访。志愿者/网格员送餐时确认老人安全，异常一键上报社区+家属+卫生室。</view>
    <view class="visit" v-for="v in visits" :key="v.name">
      <view class="v-l">
        <text class="v-n">{{ v.name }}</text>
        <text class="v-a">{{ v.addr }} · {{ v.note }}</text>
        <text class="v-by">{{ v.by }}</text>
      </view>
      <view class="v-r">
        <text class="v-st" :style="{ color: stColor[v.status], background: stColor[v.status] + '1a' }">{{ v.status }}</text>
        <text v-if="v.status !== '安好'" class="v-btn" @tap="report(v)">{{ v.status === '已上报' ? '已响应' : '一键上报' }}</text>
      </view>
    </view>

    <!-- 一顿饭的钱从哪来 -->
    <view class="sec">💡 一顿长者餐（8 元）的钱从哪来</view>
    <view class="cost">
      <view class="cost-bar">
        <view class="cb" v-for="c in cost" :key="c.k" :style="{ flex: c.v, background: c.c }"><text>{{ c.k.slice(0,2) }} ¥{{ c.v }}</text></view>
      </view>
      <view class="cost-lg">
        <view class="cl" v-for="c in cost" :key="c.k"><text class="cl-dot" :style="{ background: c.c }"></text><text class="cl-t">{{ c.k }} ¥{{ c.v }}</text></view>
      </view>
      <text class="cost-note">补贴 + 慈善 + 自付三方分担，80 岁以上全免；每一笔核销上链公示，可查可审。</text>
    </view>

    <!-- 爱心认捐 -->
    <view class="sec">🤍 爱心认捐 · 让助餐可持续</view>
    <view class="fund">
      <view class="f-top"><text class="f-r">已筹 ¥{{ fund.raised }}</text><text class="f-t">目标 ¥{{ fund.target }}/月</text></view>
      <view class="f-bar"><view class="f-fill" :style="{ width: (fund.raised / fund.target * 100) + '%' }"></view></view>
      <text class="f-eq">≈ 已认捐 {{ Math.round(fund.raised / 8) }} 顿长者助餐</text>
      <view class="f-btns">
        <text class="f-b" @tap="donate(50)">认捐 ¥50</text>
        <text class="f-b" @tap="donate(100)">¥100</text>
        <text class="f-b main" @tap="donate(200)">¥200 · 冠名爱心墙</text>
      </view>
      <view class="wall">
        <text class="wall-t">爱心墙</text>
        <view class="donor" v-for="d in donors" :key="d.name"><text class="d-n">❤️ {{ d.name }}</text><text class="d-a">¥{{ d.amount }}</text></view>
      </view>
    </view>

    <view class="cta" @tap="meal">🍚 去长者食堂订餐 ›</view>
    <view class="tip">🔗 助餐 + 探访 + 认捐三合一：政府补、社会捐、平台连，独居老人不漏一人；消费、补贴、捐赠全链上留痕、公开透明。</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #c0392b, #922b21); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; }
.kpis { display: flex; margin-top: 22rpx; }
.k { flex: 1; text-align: center; }
.kn { font-size: 32rpx; font-weight: 800; display: block; }
.kl { font-size: 18rpx; opacity: 0.9; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 10rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 24rpx; }
.tag-live { font-size: 19rpx; color: #fff; background: #d64541; padding: 4rpx 14rpx; border-radius: 999rpx; }
.intro { margin: 0 24rpx 12rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.5; }
.visit { display: flex; align-items: center; justify-content: space-between; margin: 0 24rpx 14rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; }
.v-l { flex: 1; display: flex; flex-direction: column; }
.v-n { font-size: 26rpx; font-weight: 700; }
.v-a { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.v-by { font-size: 18rpx; color: $sg-text-3; margin-top: 4rpx; }
.v-r { display: flex; flex-direction: column; align-items: flex-end; gap: 10rpx; }
.v-st { font-size: 21rpx; font-weight: 700; padding: 5rpx 16rpx; border-radius: 999rpx; }
.v-btn { font-size: 20rpx; color: #fff; background: #d64541; padding: 8rpx 18rpx; border-radius: 999rpx; }
.cost { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.cost-bar { display: flex; height: 56rpx; border-radius: 12rpx; overflow: hidden; }
.cb { display: flex; align-items: center; justify-content: center; color: #fff; font-size: 20rpx; font-weight: 700; }
.cost-lg { display: flex; flex-wrap: wrap; gap: 20rpx; margin: 14rpx 0 8rpx; }
.cl { display: flex; align-items: center; }
.cl-dot { width: 16rpx; height: 16rpx; border-radius: 50%; margin-right: 8rpx; }
.cl-t { font-size: 21rpx; color: $sg-text-2; }
.cost-note { font-size: 20rpx; color: $sg-text-3; line-height: 1.5; display: block; }
.fund { margin: 0 24rpx; background: linear-gradient(135deg, #fdeceb, #fff); border: 2rpx solid #f3c9c5; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.f-top { display: flex; align-items: baseline; justify-content: space-between; }
.f-r { font-size: 32rpx; font-weight: 800; color: #c0392b; }
.f-t { font-size: 20rpx; color: $sg-text-3; }
.f-bar { height: 16rpx; background: #f7d9d5; border-radius: 999rpx; overflow: hidden; margin: 12rpx 0 6rpx; }
.f-fill { height: 100%; background: linear-gradient(90deg, #e57373, #c0392b); border-radius: 999rpx; }
.f-eq { font-size: 20rpx; color: $sg-text-3; }
.f-btns { display: flex; gap: 12rpx; margin: 16rpx 0; }
.f-b { flex: 1; text-align: center; font-size: 23rpx; font-weight: 700; color: #c0392b; background: #fff; border: 2rpx solid #f3c9c5; padding: 14rpx 0; border-radius: 999rpx; }
.f-b.main { flex: 1.6; color: #fff; background: linear-gradient(135deg, #c0392b, #922b21); border: none; }
.wall { border-top: 2rpx dashed #f3c9c5; padding-top: 12rpx; }
.wall-t { font-size: 21rpx; color: $sg-text-3; display: block; margin-bottom: 8rpx; }
.donor { display: flex; justify-content: space-between; padding: 8rpx 0; }
.d-n { font-size: 23rpx; }
.d-a { font-size: 23rpx; font-weight: 700; color: #c0392b; }
.cta { margin: 24rpx; text-align: center; padding: 26rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #c0392b, #922b21); color: #fff; font-size: 27rpx; font-weight: 700; box-shadow: 0 8rpx 20rpx rgba(192,57,43,0.3); }
.tip { margin: 0 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.production-empty { margin: 48rpx 24rpx; padding: 34rpx 28rpx; border: 2rpx solid #d8e7de; border-radius: 22rpx; background: #f7fbf8; }
.production-empty-title { display: block; color: #145d3c; font-size: 32rpx; font-weight: 900; }
.production-empty-text { display: block; margin-top: 16rpx; color: #5e7167; font-size: 24rpx; line-height: 1.7; }
</style>
