<script setup lang="ts">
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
// 村社综合服务站 · 一村/一社区一站，依托村集体，一站通办
const station = { name: "范庄村社综合服务站", master: "张建国（村集体聘 · 兼推广员）", addr: "江西省赣州市信丰县安西镇范庄村口 · 供销社旧址改建" };

const board = [
  { n: "1860", l: "本月服务人次" },
  { n: "¥216万", l: "代买代卖额" },
  { n: "3420", l: "快递代收寄" },
  { n: "¥1.1万", l: "站长月收益" },
];

const services = [
  { icon: "🌱", n: "代买农资", d: "集采拼团、厂家直供、赊销到田", url: "/pages/agri/inputs" },
  { icon: "🚚", n: "代卖农产", d: "帮农户挂货源、对接枢纽与小端", url: "/pages/trade/index" },
  { icon: "📦", n: "快递代收寄", d: "物流落地配末端、村口自提代寄", url: "/pages/logistics/dispatch" },
  { icon: "💰", n: "金融助农", d: "取款、贷款受理、缴费、数币", url: "/pages/finance/index" },
  { icon: "🛒", n: "团购自提", d: "数智供社社区团购自提点", url: "/pages/village/groupbuy" },
  { icon: "🔍", n: "溯源采集", d: "现场采集农事/农资，扫码验真", url: "/pages/trace/scan" },
  { icon: "🏛️", n: "政务代办", d: "社保医保、证照、补贴申报", url: "" },
  { icon: "📣", n: "政策宣讲·培训", d: "政策到户、平台工具培训", url: "/pages/promo/index" },
];

function go(s: any) {
  if (s.url) return uni.navigateTo({ url: s.url });
  uni.showModal({ title: s.n, showCancel: false, confirmText: "知道了", content: `${s.d}。\n村站现场代办、数据上链存证。` });
}

const todos = [
  { t: "王婶家脐橙 200 斤代卖挂单", tag: "代卖" },
  { t: "李叔 3 袋复合肥赊销受理", tag: "农资" },
  { t: "村民养老认证代办 5 人", tag: "政务" },
  { t: "顺丰到件 28 件待自提通知", tag: "快递" },
];
function todo(t: string) {
  if (productionBuild) return uni.showModal({ title: "需后台服务站台账", content: `正式环境「${t}」办理必须写入服务站受理人、材料和办理结果；当前未修改本地台账。`, showCancel: false });
  uni.showToast({ title: "已办理：" + t, icon: "none" });
}
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty">
      <text class="production-empty-title">暂无后台服务站档案</text>
      <text class="production-empty-text">正式环境的服务站主体、站长、办理量、佣金和待办必须由后台民生服务台账返回。本页面不展示静态站点或收益样例。</text>
    </view>
    <template v-else>
    <view class="hero">
      <text class="ht">🏛️ {{ station.name }}</text>
      <text class="hs">📍 {{ station.addr }}</text>
      <view class="master"><text class="m-lb">站长</text><text class="m-v">{{ station.master }}</text></view>
      <view class="board">
        <view class="b" v-for="x in board" :key="x.l"><text class="bn">{{ x.n }}</text><text class="bl">{{ x.l }}</text></view>
      </view>
    </view>

    <view class="intro">一村 / 一社区一站，依托<text class="em">村集体</text>建站、村集体聘站长——<text class="em">买农资、卖农产、取快递、办金融、办政务、提团购、做溯源</text>，村口一站全办了。</view>

    <!-- 八大服务 -->
    <view class="sec">村站八大服务（一站通办）</view>
    <view class="svcs">
      <view class="svc" v-for="s in services" :key="s.n" @tap="go(s)">
        <text class="s-ic">{{ s.icon }}</text>
        <view class="s-i"><text class="s-n">{{ s.n }}</text><text class="s-d">{{ s.d }}</text></view>
        <text class="s-go">›</text>
      </view>
    </view>

    <!-- 站长收益 -->
    <view class="sec">站长收益（接推广佣金）</view>
    <view class="earn">
      <view class="e-row"><text class="e-k">代买代卖佣金</text><text class="e-v">¥6,800</text></view>
      <view class="e-row"><text class="e-k">快递代收寄</text><text class="e-v">¥1,700</text></view>
      <view class="e-row"><text class="e-k">推广拉新提成</text><text class="e-v">¥2,500</text></view>
      <view class="e-row total"><text class="e-k">本月合计</text><text class="e-v big">¥11,000</text></view>
      <text class="e-note">💡 站长可承接推广服务；服务费须独立签约、验收、开票并按项目台账结算，符合条件的收益再依法反哺集体。</text>
    </view>

    <!-- 待办 -->
    <view class="sec">村站待办</view>
    <view class="todo" v-for="(t, i) in todos" :key="i" @tap="todo(t.t)">
      <view class="td-l"><text class="td-tag">{{ t.tag }}</text><text class="td-t">{{ t.t }}</text></view>
      <text class="td-go">办理 ›</text>
    </view>

    <view class="tip">🔗 村社综合服务站是供销社「基层网点」的数字化升级：依托村集体、一站通办、数据上链，把平台服务送到村口、送到户。</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, $sg-primary, $sg-primary-deep); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.9; margin-top: 8rpx; display: block; }
.master { display: flex; align-items: center; margin-top: 12rpx; }
.m-lb { font-size: 19rpx; background: rgba(255,255,255,0.2); padding: 4rpx 14rpx; border-radius: 999rpx; margin-right: 12rpx; }
.m-v { font-size: 22rpx; }
.board { display: flex; margin-top: 22rpx; }
.b { flex: 1; text-align: center; }
.bn { font-size: 30rpx; font-weight: 800; display: block; }
.bl { font-size: 18rpx; opacity: 0.9; }
.intro { margin: 24rpx; padding: 20rpx; background: #fff; border-left: 8rpx solid $sg-primary; border-radius: $sg-radius; font-size: 24rpx; color: $sg-text-2; line-height: 1.7; }
.intro .em { color: $sg-primary; font-weight: 700; }
.sec { font-size: 30rpx; font-weight: 700; padding: 22rpx 28rpx 12rpx; }
.svcs { display: flex; flex-wrap: wrap; gap: 14rpx; padding: 0 24rpx; }
.svc { width: calc(50% - 7rpx); box-sizing: border-box; display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx; }
.s-ic { font-size: 40rpx; margin-right: 12rpx; }
.s-i { flex: 1; display: flex; flex-direction: column; }
.s-n { font-size: 25rpx; font-weight: 700; }
.s-d { font-size: 17rpx; color: $sg-text-3; margin-top: 4rpx; line-height: 1.35; }
.s-go { font-size: 30rpx; color: $sg-text-3; }
.earn { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.e-row { display: flex; justify-content: space-between; padding: 12rpx 0; border-top: 2rpx solid $sg-bg; }
.e-row:first-child { border-top: none; }
.e-row.total { border-top: 2rpx dashed #ddd; margin-top: 6rpx; }
.e-k { font-size: 24rpx; color: $sg-text-2; }
.e-v { font-size: 26rpx; font-weight: 700; }
.e-v.big { font-size: 34rpx; color: $sg-red; font-weight: 800; }
.e-note { font-size: 20rpx; color: $sg-primary; background: $sg-primary-light; padding: 12rpx; border-radius: $sg-radius; margin-top: 12rpx; display: block; line-height: 1.5; }
.todo { display: flex; align-items: center; justify-content: space-between; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 12rpx; padding: 20rpx; }
.td-l { display: flex; align-items: center; flex: 1; }
.td-tag { font-size: 19rpx; color: $sg-primary; background: $sg-primary-light; padding: 3rpx 12rpx; border-radius: 6rpx; margin-right: 12rpx; }
.td-t { font-size: 24rpx; }
.td-go { font-size: 22rpx; color: $sg-primary; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.production-empty { margin: 48rpx 24rpx; padding: 34rpx 28rpx; border: 2rpx solid #d8e7de; border-radius: 22rpx; background: #f7fbf8; }
.production-empty-title { display: block; color: #145d3c; font-size: 32rpx; font-weight: 900; }
.production-empty-text { display: block; margin-top: 16rpx; color: #5e7167; font-size: 24rpx; line-height: 1.7; }
</style>
