<script setup lang="ts">
import { computed, ref } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { useUserStore } from "@/store/user";
import { priceIndex } from "@/mock";
import { villageProducts, villageDemands, type VillageProduct, type VillageDemand } from "@/mock/products";
import { starOf, starName } from "@/mock/merchant";
import { getProducts, getPurchaseDemands, type LocalProduct, type LocalPurchaseDemand } from "@/services/localApi";
import RoleSwitcher from "@/components/RoleSwitcher.vue";

const user = useUserStore();
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const remoteProducts = ref<VillageProduct[]>([]);
const remoteDemands = ref<VillageDemand[]>([]);

function mapProduct(product: LocalProduct): VillageProduct {
  const price = Number(product.price) || 0;
  return { id: product.id, merchant_id: product.merchant_id, name: product.name, cat: product.category, origin: product.origin || "产地待确认", spec: product.spec || "标准规格", price, priceText: `¥${price.toFixed(2)}`, unit: product.unit || "件", supplier: product.merchant_name || "已核验供货商", pic: product.media?.find((item) => item.media_type === "image")?.url || "/static/products/p12.jpg", tags: ["后台已审核"], sold: 0, stock: `库存 ${Number(product.stock) || 0}`, rating: 4.8 };
}
function mapDemand(demand: LocalPurchaseDemand): VillageDemand {
  return { id: demand.id, title: demand.title, category: demand.category, qty: `${demand.qty} ${demand.unit}`, addr: demand.destination, deadline: demand.delivery_window, buyer: demand.buyer_name, budget: demand.budget_max == null ? "按需求议价" : `≤ ${demand.budget_max} 元/${demand.unit}`, quotes: demand.quote_count, pic: "/static/products/p12.jpg" };
}
function loadHomeData() {
  if (!productionBuild) return;
  void getProducts().then((items) => { remoteProducts.value = items.map(mapProduct); }).catch(() => { remoteProducts.value = []; });
  void getPurchaseDemands().then((items) => { remoteDemands.value = items.map(mapDemand); }).catch(() => { remoteDemands.value = []; });
}
onLoad(loadHomeData);
onShow(loadHomeData);

// 按可研报告「三位一体 + 民生终端」重编平台架构
interface Entry { icon: string; label: string; url: string; roles?: string[]; }
interface Group { key: string; title: string; icon: string; entries: Entry[]; }
const capabilityCenters: Entry[] = [
  { icon: "交", label: "供需交易中心", url: "/pages/trade/index" },
  { icon: "约", label: "合同履约中心", url: "/pages/trade/fulfillment" },
  { icon: "资", label: "企业资金中心", url: "/pages/finance/index" },
  { icon: "产", label: "产业服务中心", url: "/pages/agri/index" },
  { icon: "信", label: "企业信用中心", url: "/pages/finance/credit" },
  { icon: "企", label: "企业管理中心", url: "/pages/mine/settings" },
];
const groups: Group[] = [
  { key: "prod", title: "生产服务", icon: "🌱", entries: [
    { icon: "🧪", label: "农资集采", url: "/pages/agri/inputs" },
    { icon: "🛡️", label: "资质准入", url: "/pages/agri/qualification" },
    { icon: "🏷️", label: "农机商家", url: "/pages/agri/machinery-merchant" },
    { icon: "🚜", label: "土地托管", url: "/pages/agri/trust" },
    { icon: "🛺", label: "共享农机", url: "/pages/agri/machine" },
    { icon: "📑", label: "订单农业", url: "/pages/agri/contract" },
    { icon: "🗺️", label: "资源底图", url: "/pages/digitalfarm/resources" },
    { icon: "🌾", label: "数字种植", url: "/pages/digitalfarm/index" },
    { icon: "🐖", label: "数字养殖", url: "/pages/digitalfarm/livestock" },
    { icon: "♻️", label: "资源回收", url: "/pages/agri/recycle" },
    { icon: "📜", label: "产权流转", url: "/pages/agri/property" },
  ]},
  { key: "flow", title: "流通服务", icon: "🚚", entries: [
    { icon: "🛒", label: "供货大厅", url: "/pages/trade/index" },
    { icon: "📢", label: "采购大厅", url: "/pages/trade/index?tab=demand" },
    { icon: "🏭", label: "产地初加工", url: "/pages/agri/primary" },
    { icon: "🚚", label: "仓储物流", url: "/pages/logistics/index" },
    { icon: "🌐", label: "跨境贸易", url: "/pages/crossborder/index" },
    { icon: "🏅", label: "品质认证", url: "/pages/cert/index" },
    { icon: "🏆", label: "品牌运营", url: "/pages/agri/brand" },
    { icon: "🤝", label: "消费帮扶", url: "/pages/trade/assist" },
    { icon: "📊", label: "价格指数", url: "/pages/home/price" },
  ]},
  { key: "credit", title: "信用服务", icon: "💰", entries: [
    { icon: "💰", label: "供应链金融", url: "/pages/finance/index" },
    { icon: "🌾", label: "粮食银行", url: "/pages/finance/grainbank" },
    { icon: "🏅", label: "信用资产", url: "/pages/finance/credit" },
    { icon: "🧧", label: "全民分红", url: "/pages/finance/dividend" },
  ]},
  { key: "life", title: "民生终端", icon: "🏘️", entries: [
    { icon: "🏘️", label: "民生终端", url: "/pages/village/index" },
    { icon: "🔍", label: "扫码溯源", url: "/pages/trace/scan" },
    { icon: "🆘", label: "应急保供", url: "/pages/home/emergency" },
    { icon: "🏛️", label: "服务站", url: "/pages/station/index", roles: ["station"] },
  ]},
];
const visibleGroups = computed(() =>
  groups.map((g) => ({ ...g, entries: g.entries.filter((e) => !e.roles || e.roles.includes(user.roleKey)) }))
);

const showSupply = computed(() => user.roleKey === "buyer" || user.roleKey === "visitor");
const feedTitle = computed(() => (showSupply.value ? "优选好货 · 供货推荐" : "为你推荐 · 采购需求"));
const feedProducts = computed(() => productionBuild ? remoteProducts.value.slice(0, 6) : villageProducts.slice(0, 6));
const feedDemands = computed(() => productionBuild ? remoteDemands.value.slice(0, 6) : villageDemands.slice(0, 6));

const TAB_PATHS = ["/pages/home/index", "/pages/trade/index", "/pages/trace/scan", "/pages/finance/index", "/pages/mine/index"];
function go(url: string) {
  const path = url.split("?")[0];
  if (TAB_PATHS.includes(path)) {
    if (url.includes("tab=demand")) uni.setStorageSync("tradeTab", "demand");
    uni.switchTab({ url: path });
  } else {
    uni.navigateTo({ url });
  }
}
function goSupply(id: string) { uni.navigateTo({ url: `/pages/trade/supply-detail?id=${id}` }); }
function goDemand(id: string) { uni.navigateTo({ url: `/pages/trade/demand-detail?id=${id}` }); }
function goSearch() { uni.navigateTo({ url: "/pages/home/search" }); }
function goScan() { uni.switchTab({ url: "/pages/trace/scan" }); }
</script>

<template>
  <view class="sg-page home">
    <!-- 顶部头部 + Logo -->
    <view class="hd">
      <view class="scan" @tap="goScan"><text class="scan-ic">⌇</text><text>扫码</text></view>
      <view class="brand">
        <view class="logo-card"><image class="logo" src="/static/brand-logo.png" mode="aspectFit" /></view>
        <text class="brand-name">数智供社</text>
        <text class="brand-sub">农产品供应链 + 金融服务</text>
        <text class="brand-version">v8533 · 手机演示版</text>
      </view>
      <view class="search" @tap="goSearch">
        <text class="s-ic">🔎</text>
        <text class="s-ph">搜货源 / 采购需求 / 农资 / 运单号</text>
        <view class="s-btn">搜索</view>
      </view>
    </view>

    <!-- 身份横幅 -->
    <view class="ident">
      <view class="id-badge">{{ user.role.short }}</view>
      <view class="id-info">
        <view class="sg-row">
          <text class="id-name">{{ user.role.name }}</text>
          <text class="id-org">{{ user.role.org }}</text>
        </view>
        <text class="id-scene">{{ user.role.scene }}</text>
      </view>
      <view v-if="!user.isVisitor" class="id-credit" @tap="go('/pages/finance/credit')">
        <text class="id-score">{{ user.role.creditScore }}</text>
        <text class="id-lbl">信用分</text>
      </view>
    </view>

    <!-- 价格指数滚动条 -->
    <scroll-view scroll-x class="ticker" @tap="go('/pages/home/price')">
      <view class="tk-lead">📈 价格指数</view>
      <view class="tk-item" v-for="p in priceIndex" :key="p.name">
        <text class="tk-name">{{ p.name }}</text>
        <text class="tk-price">¥{{ p.price }}</text>
        <text class="tk-delta" :class="p.delta >= 0 ? 'up' : 'down'">{{ p.delta >= 0 ? "▲" : "▼" }}{{ Math.abs(p.delta) }}%</text>
      </view>
    </scroll-view>

    <!-- 平台架构：三位一体 + 民生终端 -->
    <view class="arch-note" @tap="go('/pages/arch/index')">
      <text class="an-t">国家自主 Web3 基座　查看架构总览 ›</text>
    </view>
    <view class="groups">
      <view class="group" v-for="g in visibleGroups" :key="g.key">
        <view class="gp-hd"><text class="gp-ic">{{ g.icon }}</text><text class="gp-t">{{ g.title }}</text></view>
        <view class="gp-grid">
          <view class="g-item" v-for="e in g.entries" :key="e.label" @tap="go(e.url)">
            <view class="g-ic">{{ e.icon }}</view>
            <text class="g-lb">{{ e.label }}</text>
          </view>
        </view>
        <!-- 交易、结算、运营、AI、利益共同体和六中心统一归入民生终端能力层 -->
        <view v-if="g.key === 'life'" class="terminal-capabilities">
          <view class="terminal-cap-title">民生终端能力</view>
          <view class="flow-note" @tap="go('/pages/trade/index')">
            <text class="fn-ic">🔗</text>
            <view class="fn-i"><text class="fn-t">交易贯通工作台</text></view>
            <text class="fn-go">进入 ›</text>
          </view>
          <view class="flow-note payment" @tap="go('/pages/finance/index')">
            <text class="fn-ic">🏦</text>
            <view class="fn-i"><text class="fn-t">交易支付结算</text></view>
            <text class="fn-go">进入 ›</text>
          </view>
          <view class="flow-note operation" @tap="go('/pages/arch/index')">
            <text class="fn-ic">🧭</text>
            <view class="fn-i"><text class="fn-t">业务运营中心</text></view>
            <text class="fn-go">进入 ›</text>
          </view>
          <view class="flow-note ai" @tap="go('/pages/ai/index')">
            <text class="fn-ic">🧠</text>
            <view class="fn-i"><text class="fn-t">AI 智能中枢</text></view>
            <text class="fn-go">进入 ›</text>
          </view>
          <view class="flow-note ally" @tap="go('/pages/alliance/index')">
            <text class="fn-ic">🤝</text>
            <view class="fn-i"><text class="fn-t">利益共同体</text></view>
            <text class="fn-go">进入 ›</text>
          </view>
          <view class="center-card">
            <view class="center-head"><text class="center-title">六中心能力总览</text></view>
            <view class="center-grid">
              <view class="center-item" v-for="c in capabilityCenters" :key="c.label" @tap="go(c.url)">
                <text class="center-icon">{{ c.icon }}</text>
                <text class="center-label">{{ c.label }}</text>
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- 应急保供 -->
    <view class="banner" @tap="go('/pages/home/emergency')">
      <text class="bn-ic">🆘</text>
      <view class="bn-info">
        <text class="bn-t">应急保供专区 · 统仓统配平价直供</text>
        <text class="bn-s">政策保供 · 全国一张网调度 ›</text>
      </view>
    </view>

    <!-- 信息流 -->
    <view class="feed-hd">
      <view class="fh-l"><text class="fh-bar"></text><text class="fh-t">{{ feedTitle }}</text></view>
      <text class="fh-more" @tap="go('/pages/trade/index')">全部 ›</text>
    </view>

    <!-- 供货推荐（带图）-->
    <view v-if="showSupply" class="pgrid">
      <view class="pcard" v-for="p in feedProducts" :key="p.id" @tap="goSupply(p.id)">
        <view class="pimg-wrap">
          <image class="pimg" :src="p.pic" mode="aspectFill" />
          <text v-if="starOf(p.rating) >= 4" class="plevel" :class="{ gold: starOf(p.rating) === 5 }">★{{ starOf(p.rating) }} {{ starName(starOf(p.rating)) }}</text>
        </view>
        <view class="pbody">
          <text class="pname">{{ p.name }}</text>
          <view class="pfoot"><text class="sg-price">{{ p.priceText }}</text><text class="porigin">{{ p.origin }}</text></view>
        </view>
      </view>
      <view v-if="productionBuild && !feedProducts.length" class="empty-feed">暂无已审核货源，请稍后刷新</view>
    </view>

    <!-- 采购需求（带图）-->
    <view v-else>
      <view class="dcard" v-for="d in feedDemands" :key="d.id" @tap="goDemand(d.id)">
        <image class="dimg" :src="d.pic" mode="aspectFill" />
        <view class="dbody">
          <text class="dname">{{ d.title }}</text>
          <text class="dmeta">{{ d.addr }} · 截止 {{ d.deadline }} · {{ d.buyer }}</text>
          <view class="dtags"><text class="tag">{{ d.category }}</text><text class="tag">{{ d.qty }}</text></view>
        </view>
        <view class="dright"><text class="sg-price">{{ d.budget }}</text><text class="dquote">{{ d.quotes }} 报价</text></view>
      </view>
      <view v-if="productionBuild && !feedDemands.length" class="empty-feed">暂无已审核采购需求，请稍后刷新</view>
    </view>

    <RoleSwitcher />
  </view>
</template>

<style lang="scss" scoped>
.home { padding-bottom: 60rpx; }

/* 头部 */
.hd { position: relative; background: linear-gradient(165deg, #2b6cb0, #1a5c9e); padding: 70rpx 28rpx 30rpx; }
.brand { display: flex; flex-direction: column; align-items: center; }
.logo-card { background: transparent; display: flex; align-items: center; justify-content: center; }
.logo { width: 172rpx; height: 184rpx; display: block; }
.brand-name { font-size: 44rpx; font-weight: 800; letter-spacing: 8rpx; margin-top: 8rpx; color: #f5cd4b; text-shadow: 0 2rpx 10rpx rgba(0,0,0,0.18); }
.brand-sub { font-size: 22rpx; color: rgba(255,255,255,0.92); margin-top: 6rpx; }
.brand-version { font-size: 20rpx; color: rgba(255,255,255,0.78); margin-top: 4rpx; letter-spacing: 1rpx; }
.scan { position: absolute; top: 76rpx; right: 28rpx; display: flex; flex-direction: column; align-items: center; color: #fff; background: rgba(255,255,255,0.16); padding: 10rpx 18rpx; border-radius: 16rpx; }
.scan-ic { font-size: 32rpx; line-height: 1; }
.scan text:last-child { font-size: 20rpx; }
.search { margin-top: 30rpx; background: #fff; border-radius: 999rpx; padding: 12rpx 12rpx 12rpx 26rpx; display: flex; align-items: center; }
.s-ic { margin-right: 12rpx; }
.s-ph { flex: 1; color: $sg-text-3; font-size: 26rpx; }
.s-btn { background: linear-gradient(135deg, $sg-gold, #c8871f); color: #fff; font-size: 26rpx; padding: 12rpx 30rpx; border-radius: 999rpx; }

/* 身份横幅 */
.ident { margin: -18rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; display: flex; align-items: center; }
.id-badge { width: 76rpx; height: 76rpx; border-radius: 20rpx; background: $sg-primary-light; color: $sg-primary; display: flex; align-items: center; justify-content: center; font-size: 38rpx; font-weight: 800; margin-right: 20rpx; }
.id-info { flex: 1; display: flex; flex-direction: column; }
.id-name { font-size: 30rpx; font-weight: 700; }
.id-org { font-size: 22rpx; color: $sg-text-3; margin-left: 14rpx; }
.id-scene { font-size: 22rpx; color: $sg-text-2; margin-top: 6rpx; }
.id-credit { text-align: center; padding-left: 20rpx; border-left: 2rpx solid $sg-border; display: flex; flex-direction: column; }
.id-score { font-size: 40rpx; font-weight: 800; color: $sg-gold; line-height: 1; }
.id-lbl { font-size: 20rpx; color: $sg-text-3; }

/* 价格指数 */
.ticker { white-space: nowrap; padding: 22rpx 24rpx 4rpx; display: flex; }
.tk-lead { display: inline-flex; align-items: center; font-size: 24rpx; font-weight: 700; color: $sg-primary; margin-right: 16rpx; }
.tk-item { display: inline-flex; align-items: center; background: #fff; border-radius: 999rpx; padding: 10rpx 22rpx; margin-right: 16rpx; box-shadow: $sg-shadow; }
.tk-name { font-size: 24rpx; color: $sg-text-2; margin-right: 10rpx; }
.tk-price { font-size: 26rpx; font-weight: 700; }
.tk-delta { font-size: 22rpx; margin-left: 8rpx; }
.tk-delta.up { color: $sg-red; }
.tk-delta.down { color: $sg-primary; }

/* 平台架构标语 */
.arch-note { display: flex; flex-direction: column; align-items: center; padding: 26rpx 24rpx 6rpx; }
.flow-note { display: flex; align-items: center; margin: 12rpx 24rpx 0; padding: 20rpx 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); box-shadow: 0 8rpx 20rpx rgba(15,107,59,0.28); }
.flow-note.ai { background: linear-gradient(135deg, #6d28d9, #4c1d95); box-shadow: 0 8rpx 20rpx rgba(109,40,217,0.28); }
.flow-note.ally { background: linear-gradient(135deg, #d99a2b, #b5791b); box-shadow: 0 8rpx 20rpx rgba(217,154,43,0.28); }
.flow-note.payment { background: linear-gradient(135deg, #0c4d6c, #146a4a); box-shadow: 0 8rpx 20rpx rgba(12,77,108,.28); }
.flow-note.operation { background: linear-gradient(135deg, #7a4318, #a8651c); box-shadow: 0 8rpx 20rpx rgba(122,67,24,.25); }
.terminal-capabilities { margin-top: 20rpx; padding-top: 18rpx; border-top: 2rpx solid $sg-border; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-flow: row; align-items: stretch; gap: 16rpx; }
.terminal-cap-title { padding: 0 4rpx 12rpx; font-size: 25rpx; font-weight: 800; color: $sg-text; }
.terminal-cap-title, .terminal-capabilities .center-card { grid-column: 1 / -1; }
.terminal-capabilities .flow-note { margin: 0; min-height: 112rpx; box-sizing: border-box; padding: 18rpx 14rpx; }
.terminal-capabilities .fn-ic { margin-right: 7rpx; }
.fn-ic { font-size: 36rpx; margin-right: 12rpx; flex: none; }
.fn-i { flex: 1; display: flex; flex-direction: column; }
.fn-t { font-size: 25rpx; font-weight: 800; color: #fff; }
.fn-d { font-size: 17rpx; color: rgba(255,255,255,0.85); margin-top: 4rpx; line-height: 1.4; }
.fn-go { font-size: 22rpx; color: #fff; background: rgba(255,255,255,0.2); padding: 8rpx 16rpx; border-radius: 999rpx; }
.an-t { font-size: 24rpx; font-weight: 700; color: $sg-primary; }
.an-d { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }

/* 六中心能力入口 */
.center-card { margin: 18rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx 20rpx 18rpx; }
.center-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 16rpx; }
.center-title { font-size: 30rpx; font-weight: 800; color: $sg-text; }
.center-sub { font-size: 21rpx; color: $sg-text-3; }
.center-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-flow: row; border-radius: 18rpx; overflow: hidden; border: 1rpx solid $sg-border; }
.center-item { min-height: 82rpx; display: flex; align-items: center; background: #fff; border-right: 1rpx solid $sg-border; border-bottom: 1rpx solid $sg-border; padding: 0 14rpx; box-sizing: border-box; }
.center-item:nth-child(2n) { border-right: 0; }
.center-item:nth-last-child(-n + 2) { border-bottom: 0; }
.center-icon { width: 44rpx; height: 44rpx; border-radius: 12rpx; background: $sg-primary-light; color: $sg-primary; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 800; margin-right: 18rpx; }
.center-label { font-size: 24rpx; font-weight: 700; color: $sg-text; line-height: 1.3; }

/* 分组服务端入口 */
.groups { margin: 12rpx 24rpx 0; }
.group { background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx 12rpx 8rpx; margin-bottom: 20rpx; }
.gp-hd { display: flex; align-items: center; padding: 0 12rpx 14rpx; }
.gp-ic { font-size: 30rpx; margin-right: 10rpx; }
.gp-t { font-size: 27rpx; font-weight: 700; }
.gp-grid { display: flex; flex-wrap: wrap; }
.g-item { width: 25%; display: flex; flex-direction: column; align-items: center; margin: 12rpx 0; }
.g-ic { width: 84rpx; height: 84rpx; border-radius: 24rpx; background: $sg-primary-light; display: flex; align-items: center; justify-content: center; font-size: 46rpx; }
.g-lb { font-size: 22rpx; color: $sg-text-2; margin-top: 10rpx; }

/* 应急保供 */
.banner { margin: 0 24rpx; background: linear-gradient(135deg, $sg-gold-light, #fff); border: 2rpx solid #f0dcae; border-radius: $sg-radius-lg; padding: 22rpx; display: flex; align-items: center; }
.bn-ic { font-size: 44rpx; margin-right: 18rpx; }
.bn-info { display: flex; flex-direction: column; }
.bn-t { font-size: 26rpx; font-weight: 600; }
.bn-s { font-size: 22rpx; color: $sg-gold; margin-top: 4rpx; }

/* 信息流标题 */
.feed-hd { display: flex; align-items: center; justify-content: space-between; padding: 34rpx 28rpx 14rpx; }
.fh-l { display: flex; align-items: center; }
.fh-bar { width: 8rpx; height: 30rpx; background: $sg-primary; border-radius: 4rpx; margin-right: 14rpx; }
.fh-t { font-size: 30rpx; font-weight: 700; }
.fh-more { font-size: 24rpx; color: $sg-text-3; }

/* 供货卡片（两列带图）*/
.pgrid { display: flex; flex-wrap: wrap; padding: 0 16rpx; }
.pcard { width: calc(50% - 32rpx); margin: 0 16rpx 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; overflow: hidden; }
.pimg-wrap { position: relative; }
.pimg { width: 100%; height: 300rpx; display: block; background: $sg-primary-light; }
.plevel { position: absolute; top: 14rpx; right: 14rpx; font-size: 18rpx; color: #fff; background: rgba(22,136,76,0.9); padding: 3rpx 12rpx; border-radius: 999rpx; }
.plevel.gold { background: linear-gradient(135deg, #e6b451, #c8871f); }
.pbody { padding: 16rpx 18rpx 20rpx; }
.pname { font-size: 27rpx; font-weight: 600; line-height: 1.35; display: block; height: 74rpx; overflow: hidden; }
.pfoot { display: flex; align-items: baseline; justify-content: space-between; margin-top: 8rpx; }
.sg-price { font-size: 32rpx; }
.porigin { font-size: 20rpx; color: $sg-text-3; }

/* 采购卡片（横向带图）*/
.dcard { display: flex; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 20rpx; padding: 20rpx; }
.dimg { width: 140rpx; height: 140rpx; border-radius: $sg-radius; margin-right: 20rpx; background: $sg-primary-light; }
.dbody { flex: 1; display: flex; flex-direction: column; }
.dname { font-size: 27rpx; font-weight: 600; }
.dmeta { font-size: 21rpx; color: $sg-text-3; margin: 6rpx 0; }
.dtags { display: flex; margin-top: 6rpx; }
.tag { font-size: 20rpx; color: $sg-primary; background: $sg-primary-light; padding: 2rpx 12rpx; border-radius: 6rpx; margin-right: 8rpx; }
.dright { display: flex; flex-direction: column; align-items: flex-end; justify-content: center; }
.dquote { font-size: 20rpx; color: $sg-text-3; margin-top: 8rpx; }
</style>
