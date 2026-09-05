<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad, onShow } from "@dcloudio/uni-app";
import { villageProducts, villageDemands, villageCats } from "@/mock/products";
import type { VillageProduct } from "@/mock/products";
import { chainNodes } from "@/mock/chain";
import { starOf, starName } from "@/mock/merchant";
import { useTradeStore } from "@/store/trade";
import { useUserStore } from "@/store/user";
import type { MyDemand } from "@/store/trade";
import type { VillageDemand } from "@/mock/products";
import { getMerchantServiceArea, getProducts, getPurchaseDemands, type LocalProduct, type LocalPurchaseDemand } from "@/services/localApi";
const trade = useTradeStore();
const user = useUserStore();

const tab = ref<"supply" | "demand">("supply");
const cat = ref("全部");
const batchMode = ref(false);
const selectedSupply = ref<string[]>([]);
const selectedDemand = ref<string[]>([]);
const serviceArea = ref<any>(null);
const remoteProducts = ref<VillageProduct[]>([]);
const remoteDemands = ref<HallDemand[]>([]);
const remoteDemandLoaded = ref(false);
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

onLoad((q) => { if (q && q.tab === "demand") tab.value = "demand"; });
onLoad(() => {
  getMerchantServiceArea("m-supplier").then((data) => { serviceArea.value = data; }).catch(() => undefined);
  loadRemoteProducts();
  loadRemoteDemands();
});
onShow(() => {
  const t = uni.getStorageSync("tradeTab");
  if (t === "demand") { tab.value = "demand"; uni.removeStorageSync("tradeTab"); }
  loadRemoteProducts();
  loadRemoteDemands();
});

function mapRemoteProduct(product: LocalProduct): VillageProduct {
  const price = Number(product.price) || 0;
  const stock = Number(product.stock) || 0;
  const image = product.media?.find((item) => item.media_type === "image")?.url || "/static/products/p12.jpg";
  return {
    id: product.id,
    merchant_id: product.merchant_id,
    name: product.name,
    cat: product.category,
    origin: product.origin || "产地待确认",
    spec: product.spec || "标准规格",
    price,
    priceText: `¥${price.toFixed(2)}`,
    unit: product.unit || "件",
    supplier: product.merchant_name || "已核验供货商",
    pic: image,
    tags: ["后台已审核"],
    sold: 0,
    stock: stock > 0 ? `库存 ${stock}` : "待补货",
    rating: 4.8,
  };
}

function loadRemoteProducts() {
  getProducts().then((list) => {
    remoteProducts.value = list.map(mapRemoteProduct);
  }).catch(() => {
    // 手机离线体验时继续使用内置样例；有后台数据时以上架审核结果为准。
  });
}

function mapRemoteDemand(demand: LocalPurchaseDemand): HallDemand {
  const budget = demand.budget_max == null ? "按需求议价" : `≤ ${demand.budget_max} 元/${demand.unit}`;
  return {
    id: demand.id,
    title: demand.title,
    category: demand.category,
    qty: `${demand.qty} ${demand.unit}`,
    addr: demand.destination,
    deadline: demand.delivery_window,
    buyer: demand.buyer_name,
    budget,
    quotes: demand.quote_count,
    pic: "/static/products/p12.jpg",
    buyer_id: demand.buyer_id,
    source: "backend",
    budget_max: demand.budget_max,
    unit: demand.unit,
    delivery_window: demand.delivery_window,
    quotes_detail: demand.quotes,
    my_quotes: demand.my_quotes,
  };
}

function loadRemoteDemands() {
  getPurchaseDemands().then((list) => {
    remoteDemands.value = list.map(mapRemoteDemand);
    remoteDemandLoaded.value = true;
  }).catch(() => {
    // 正式构建后台不可用时不回退虚构采购主体；本地演示才保留内置样例。
    remoteDemandLoaded.value = false;
    remoteDemands.value = [];
  });
}

const cats = computed(() => ["全部", ...new Set([...villageCats, ...remoteProducts.value.map((p) => p.cat)])]);

const supplyList = computed(() => {
  // 正式构建只展示后台审核后的商品；后台不可用时不得把内置演示商品
  // 当成真实货源展示或允许进入下单链路。
  const source = remoteProducts.value.length ? remoteProducts.value : (productionBuild ? [] : villageProducts);
  return cat.value === "全部" ? source : source.filter((p) => p.cat === cat.value);
});
type HallDemand = VillageDemand & Partial<Pick<MyDemand, "mine" | "ordered">> & {
  buyer_id?: string;
  source?: "backend" | "mock";
  budget_max?: number | null;
  unit?: string;
  delivery_window?: string;
  quotes_detail?: any[];
  my_quotes?: any[];
};
const demandList = computed<HallDemand[]>(() => {
  const source: HallDemand[] = remoteDemandLoaded.value ? remoteDemands.value : (productionBuild ? [] : villageDemands.map((d) => ({ ...d, source: "mock" as const })));
  const base = cat.value === "全部" ? source : source.filter((p) => p.category === cat.value);
  // 我发布的采购需求始终置顶
  return [...(productionBuild ? [] : trade.myDemands), ...base];
});

// 按名称稳定取值（不同机构展示不同但固定的规模）
function pick<T>(name: string, arr: T[]): T {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return arr[h % arr.length];
}

// 供应商机构：角色定位 · 服务半径 · 承载规模（按名称关键词识别）
function supMeta(name: string) {
  const isProc = /米业|食品|酒坊|盐业|红糖|果饮|斋|加工|坊/.test(name);
  const isCoop = /合作社|农合|农场|联合体/.test(name);
  if (isProc) return { role: "加工企业·采供", radius: pick(name, ["辐射 2 市", "辐射 3 市", "辐射 5 县"]), cap: pick(name, ["日处理 40 吨", "日处理 60 吨", "日处理 80 吨"]) };
  if (isCoop) return { role: "专业合作社", radius: pick(name, ["覆盖 4 村", "覆盖 6 村", "覆盖 8 村"]), cap: pick(name, ["年供 500 吨", "年供 800 吨", "年供 1200 吨"]) };
  return { role: "基层供销社", radius: pick(name, ["覆盖 8 村", "覆盖 12 村", "覆盖 1 乡"]), cap: pick(name, ["年供 1500 吨", "年供 2000 吨", "年供 3000 吨"]) };
}
function serviceRadius(name: string) {
  if (name === "赣南优品农业合作社" && serviceArea.value) return `半径 ${serviceArea.value.radius_km}km`;
  return supMeta(name).radius;
}

// 采购商机构：下游八类小端定位 · 采/供属性 · 采购范围（按名称关键词识别）
function buyerMeta(name: string) {
  if (/中央厨房|央厨/.test(name)) return { role: "中央厨房", mode: "采购", scope: pick(name, ["日配 3 万份", "日配 5 万份"]) };
  if (/军供|部队|后勤保障|军粮/.test(name)) return { role: "军队食材配送", mode: "采购", scope: "军供 · 定点保障" };
  if (/学|校|学生|营养餐/.test(name)) return { role: "学生食材供应", mode: "采购", scope: "校餐 · A级溯源" };
  if (/机关|事业|政务|单位食堂/.test(name)) return { role: "机关企事业食堂", mode: "采购", scope: "阳光采购" };
  if (/加工|食品厂|预制|米业|制品/.test(name)) return { role: "食品加工企业", mode: "采购", scope: "大宗原料 · 以销定产" };
  if (/餐饮|连锁餐|饭店|酒楼|团餐公司/.test(name)) return { role: "餐饮服务公司", mode: "采购", scope: "多店集配" };
  if (/批发|商贸|农批/.test(name)) return { role: "农贸市场商户", mode: "采+供", scope: "摊位直批" };
  if (/连锁|生鲜|超市|商超|物美|盒马/.test(name)) return { role: "连锁商超", mode: "采购", scope: pick(name, ["门店 80 家", "门店 120 家"]) };
  if (/后勤|食堂|高校|餐配/.test(name)) return { role: "团餐食堂", mode: "采购", scope: "团餐配供" };
  if (/前置仓|叮咚|美菜|团购|团长|夫妻|社区店/.test(name)) return { role: "社区门店 · 夫妻店", mode: "采+供", scope: "就近落地配" };
  return { role: "采购主体", mode: "采购", scope: "区域采购" };
}

function goSupply(id: string) { uni.navigateTo({ url: `/pages/trade/supply-detail?id=${id}` }); }
function goDemand(id: string) { uni.navigateTo({ url: `/pages/trade/demand-detail?id=${id}` }); }
function tapSupply(id: string) {
  if (!batchMode.value) return goSupply(id);
  const i = selectedSupply.value.indexOf(id);
  if (i >= 0) selectedSupply.value.splice(i, 1);
  else selectedSupply.value.push(id);
}
function tapDemand(id: string) {
  if (!batchMode.value) return goDemand(id);
  const i = selectedDemand.value.indexOf(id);
  if (i >= 0) selectedDemand.value.splice(i, 1);
  else selectedDemand.value.push(id);
}
const selectedCount = computed(() => tab.value === "supply" ? selectedSupply.value.length : selectedDemand.value.length);
function toggleBatch() {
  batchMode.value = !batchMode.value;
  if (!batchMode.value) {
    selectedSupply.value = [];
    selectedDemand.value = [];
  }
}
function selectExamples() {
  if (tab.value === "supply") selectedSupply.value = supplyList.value.slice(0, 3).map((p) => p.id);
  else selectedDemand.value = demandList.value.slice(0, 3).map((d) => d.id);
}
function startBatch() {
  if (!selectedCount.value) {
    uni.showToast({ title: "请先勾选至少一项", icon: "none" });
    return;
  }
  const isBuyer = tab.value === "supply";
  const expected = isBuyer ? "buyer" : "supplier";
  const proceed = () => {
    if (isBuyer) {
      const lines = supplyList.value.filter((p) => selectedSupply.value.includes(p.id)).map((p) => ({
        id: p.id, supplierId: (p as any).merchant_id || "m-supplier", name: p.name, spec: p.spec, counterparty: p.supplier,
        origin: p.origin, unit: p.unit, qty: 100, price: p.price, pic: p.pic,
      }));
      trade.createBatchCase("buyerSupply", lines, user.certOrg);
    } else {
      const lines = demandList.value.filter((d) => selectedDemand.value.includes(d.id)).map((d, i) => {
        const budget = Number(String(d.budget).match(/[\d.]+/)?.[0]) || 50;
        const demandQty = Number(String(d.qty).match(/\d+/)?.[0]) || (500 + i * 100);
        const matchedProduct = remoteProducts.value.find((p) => p.cat === d.category || p.cat.includes(d.category) || d.category.includes(p.cat));
        return {
          id: matchedProduct?.id || d.id, demandId: d.id, productId: matchedProduct?.id,
          buyerId: d.buyer_id, name: d.title.replace(/^求购\s*/, ""), spec: `${d.category} · ${d.qty}`,
          counterparty: d.buyer, origin: d.addr, unit: matchedProduct?.unit || d.unit || "批", qty: demandQty,
          price: matchedProduct?.price || Math.max(1000, budget), pic: d.pic,
        };
      });
      trade.createBatchCase("supplierDemand", lines, user.certOrg);
    }
    uni.navigateTo({ url: "/pages/trade/batch-workbench" });
  };
  if (user.roleKey === expected) return proceed();
  uni.showModal({
    title: `切换为${isBuyer ? "采购商" : "产地供货商"}工作台`,
    content: `当前身份是“${user.role.name}”。为保证权限真实，本次操作将切换到${isBuyer ? "采购商" : "产地供货商"}工作台，并重新引用该主体的认证与授权快照。`,
    confirmText: "切换并继续",
    success: (r) => {
      if (!r.confirm) return;
      user.switchRole(expected);
      proceed();
    },
  });
}
function publish() {
  const capability = tab.value === "supply" ? "supply" : "purchase";
  const action = tab.value === "supply" ? "发布供货" : "发布采购";
  if (!user.ensureTradeRole(action, capability)) return;
  uni.navigateTo({ url: `/pages/trade/publish?type=${tab.value}` });
}
function orders() { uni.navigateTo({ url: "/pages/trade/orders" }); }
function chain() { uni.navigateTo({ url: "/pages/trade/chain" }); }
function citymarket() { uni.navigateTo({ url: "/pages/trade/markets" }); }
function tender() { uni.navigateTo({ url: "/pages/trade/tender" }); }
function control() { uni.navigateTo({ url: "/pages/trade/control" }); }
</script>

<template>
  <view class="sg-page">
    <view class="tabs">
      <view class="tab" :class="{ on: tab === 'supply' }" @tap="tab = 'supply'">供货大厅</view>
      <view class="tab" :class="{ on: tab === 'demand' }" @tap="tab = 'demand'">采购需求大厅</view>
    </view>
    <view class="batch-guide">
      <view>
        <text class="batch-title">{{ tab === "supply" ? "采购商批量采购" : "产地供货商批量接单" }}</text>
      </view>
      <view class="batch-toggle" :class="{ on: batchMode }" @tap="toggleBatch">{{ batchMode ? "退出批量" : "批量实操" }}</view>
    </view>
    <view v-if="batchMode" class="batch-tip">
      <text>已选 {{ selectedCount }} 项 · 可跨供应商/采购方生成批量交易包</text>
      <text v-if="!selectedCount" @tap="selectExamples">一键选3项</text>
      <text v-else class="batch-now" @tap="startBatch">立即生成 ›</text>
    </view>
    <view class="b2b-strip">🏢 数智供社 B2B · 实名主体交易</view>

    <view class="control-entry" @tap="control">
      <view class="control-top">
        <view class="control-icon">🛡️</view>
        <view class="control-main">
          <text class="control-title">交易准入与资金总控台</text>
        </view>
        <text class="control-go">进入 ›</text>
      </view>
      <view class="identity-line">
        <text class="identity-ok">当前已核验</text>
        <text class="identity-org">{{ user.certOrg }}</text>
        <text class="identity-role">{{ user.role.name }}</text>
      </view>
    </view>

    <!-- 城市农批枢纽入口（以城市为单元 · 一级农批市场为枢纽 · 上联合作社下达八类小端）-->
    <view class="hub-entry" @tap="citymarket">
      <view class="he-l">
        <text class="he-t">🗺️ 全国农批市场清单 · 13省26市场</text>
      </view>
      <text class="he-go">进入 ›</text>
    </view>

    <scroll-view scroll-x class="cats">
      <text v-for="c in cats" :key="c" class="cat" :class="{ on: cat === c }" @tap="cat = c">{{ c }}</text>
    </scroll-view>

    <!-- 供应链闭环主体（供货大厅）-->
    <view v-if="tab === 'supply'" class="chain-entry" @tap="chain">
      <view class="ce-top">
        <text class="ce-t">🔗 供应链</text>
        <text class="ce-go">全链主体 ›</text>
      </view>
      <scroll-view scroll-x class="ce-strip">
        <view class="ce-node" v-for="(n, i) in chainNodes" :key="n.key">
          <view class="ce-ic" :style="{ background: n.color }">{{ n.icon }}</view>
          <text class="ce-n">{{ n.stage }}</text>
          <text v-if="i < chainNodes.length - 1" class="ce-arrow">›</text>
        </view>
      </scroll-view>
    </view>

    <view class="count">共 {{ tab === 'supply' ? supplyList.length : demandList.length }} 条 · 全国一张网 · 产地直供</view>

    <!-- 供货大厅 -->
    <view v-if="tab === 'supply'" class="grid">
      <view class="pcard" v-for="p in supplyList" :key="p.id" :class="{ selected: selectedSupply.includes(p.id) }" @tap="tapSupply(p.id)">
        <view v-if="batchMode" class="select-dot">{{ selectedSupply.includes(p.id) ? "✓" : "" }}</view>
        <image class="pimg" :src="p.pic" mode="aspectFill" />
        <text class="pcat">{{ p.cat }}</text>
        <text v-if="starOf(p.rating) >= 4" class="plevel" :class="{ gold: starOf(p.rating) === 5 }">★{{ starOf(p.rating) }} {{ starName(starOf(p.rating)) }}</text>
        <view class="pbody">
          <text class="pname">{{ p.name }}</text>
          <text class="pspec">{{ p.spec }}</text>
          <view class="pmeta">
            <text class="prate">★ {{ p.rating }}</text>
            <text v-if="p.sold" class="psold">已售 {{ p.sold }}+</text>
            <text class="pstock">{{ p.stock }}</text>
          </view>
          <view class="porg">
            <text class="orole">{{ supMeta(p.supplier).role }}</text>
            <text class="ometa">🛰️{{ serviceRadius(p.supplier) }} · 📦{{ supMeta(p.supplier).cap }}</text>
          </view>
          <view class="pfoot">
            <text class="sg-price">{{ p.priceText }}</text>
            <text class="porigin">{{ p.origin }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 采购需求大厅 -->
    <view v-else>
      <view class="tender-entry" @tap="tender">
        <text class="te-ic">📢</text>
        <view class="te-i"><text class="te-t">大宗集采招投标 · 阳光竞价</text></view>
        <text class="te-go">进入 ›</text>
      </view>
      <view class="dcard" v-for="d in demandList" :key="d.id" :class="{ mine: d.mine, selected: selectedDemand.includes(d.id) }" @tap="tapDemand(d.id)">
        <view v-if="batchMode" class="select-dot demand-dot">{{ selectedDemand.includes(d.id) ? "✓" : "" }}</view>
        <image class="dimg" :src="d.pic" mode="aspectFill" />
        <view class="dbody">
          <view class="dname-row"><text v-if="d.mine" class="mine-tag">{{ d.ordered ? '已下单' : '我发布' }}</text><text class="dname">{{ d.title }}</text></view>
          <view class="dbuyer-row">
            <text class="brole">{{ buyerMeta(d.buyer).role }}</text>
            <text class="bmode">{{ buyerMeta(d.buyer).mode }}</text>
            <text class="bscope">{{ buyerMeta(d.buyer).scope }}</text>
          </view>
          <text class="dmeta">{{ d.buyer }} · {{ d.addr }} · 截止 {{ d.deadline }}</text>
          <view class="dtags"><text class="tag">{{ d.category }}</text><text class="tag">{{ d.qty }}</text></view>
        </view>
        <view class="dright"><text class="sg-price">{{ d.budget }}</text><text class="dquote">{{ d.quotes }} 报价</text></view>
      </view>
    </view>

    <view v-if="batchMode" class="batch-action">
      <view>
        <text>{{ selectedCount }} 项已选</text>
        <text>{{ tab === "supply" ? "以采购商身份批量下单" : "以产地供货商身份批量接单" }}</text>
      </view>
      <view @tap="startBatch">生成交易包 ›</view>
    </view>
    <view v-else class="fabs">
      <view class="fab ghost" @tap="orders">📋 我的订单</view>
      <view class="fab" @tap="publish">＋ 发布{{ tab === 'supply' ? '供货' : '采购' }}</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.tabs { display: flex; background: #fff; position: sticky; top: 0; z-index: 5; }
.tab { flex: 1; text-align: center; padding: 28rpx 0; font-size: 28rpx; color: $sg-text-2; position: relative; }
.tab.on { color: $sg-primary; font-weight: 700; }
.tab.on::after { content: ""; position: absolute; bottom: 8rpx; left: 50%; transform: translateX(-50%); width: 48rpx; height: 6rpx; border-radius: 3rpx; background: $sg-primary; }
.batch-guide { display: flex; align-items: center; gap: 14rpx; margin: 14rpx 24rpx 0; padding: 18rpx; border-radius: $sg-radius-lg; color: #fff; background: linear-gradient(135deg, #0c4d6c, #146a4a); }
.batch-guide > view:first-child { flex: 1; display: flex; flex-direction: column; }
.batch-title { font-size: 25rpx; font-weight: 850; }
.batch-sub { margin-top: 4rpx; font-size: 17rpx; line-height: 1.45; opacity: .82; }
.batch-toggle { flex: none; padding: 11rpx 15rpx; border: 2rpx solid rgba(255,255,255,.4); border-radius: 999rpx; font-size: 19rpx; font-weight: 800; }
.batch-toggle.on { color: #155a43; background: #fff; }
.batch-tip { display: flex; align-items: center; gap: 12rpx; margin: 10rpx 24rpx 0; padding: 12rpx 16rpx; border-radius: 12rpx; color: #176a4b; background: #e7f7ee; font-size: 18rpx; }
.batch-tip text:first-child { flex: 1; }
.batch-tip text:not(:first-child) { flex: none; font-weight: 800; }
.batch-now { padding: 7rpx 11rpx; border-radius: 999rpx; color: #fff; background: #176a4b; }
.b2b-strip { margin: 16rpx 24rpx 0; padding: 12rpx 18rpx; background: $sg-primary-light; border-radius: $sg-radius; font-size: 20rpx; color: $sg-primary-deep; line-height: 1.5; }
.b2b-em { font-weight: 700; }
.control-entry { margin: 14rpx 24rpx 4rpx; padding: 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #102a43, #1f4f72); color: #fff; box-shadow: 0 8rpx 22rpx rgba(16,42,67,.24); }
.control-top { display: flex; align-items: center; }
.control-icon { width: 58rpx; height: 58rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,.14); font-size: 31rpx; margin-right: 14rpx; }
.control-main { flex: 1; display: flex; flex-direction: column; }
.control-title { font-size: 27rpx; font-weight: 800; }
.control-sub { font-size: 19rpx; color: rgba(255,255,255,.8); margin-top: 5rpx; }
.control-go { font-size: 22rpx; color: #fff; }
.identity-line { display: flex; align-items: center; margin-top: 16rpx; padding-top: 13rpx; border-top: 1rpx solid rgba(255,255,255,.16); gap: 10rpx; }
.identity-ok { font-size: 18rpx; padding: 4rpx 10rpx; border-radius: 999rpx; background: #e8f5ee; color: $sg-primary-deep; }
.identity-org { flex: 1; font-size: 21rpx; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.identity-role { font-size: 19rpx; color: #d6e8fb; }
.tender-entry { display: flex; align-items: center; margin: 8rpx 24rpx 16rpx; padding: 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #eafaf0, #fff); border: 2rpx solid #c6ecd5; box-shadow: $sg-shadow; }
.te-ic { font-size: 42rpx; margin-right: 14rpx; }
.te-i { flex: 1; display: flex; flex-direction: column; }
.te-t { font-size: 26rpx; font-weight: 800; color: $sg-primary-deep; }
.te-s { font-size: 18rpx; color: $sg-text-3; margin-top: 4rpx; line-height: 1.4; }
.te-go { font-size: 23rpx; color: $sg-primary; }
.cats { white-space: nowrap; padding: 20rpx 24rpx 8rpx; }
.cat { display: inline-block; padding: 10rpx 28rpx; font-size: 26rpx; color: $sg-text-2; background: #fff; border-radius: 999rpx; margin-right: 14rpx; }
.cat.on { background: $sg-primary; color: #fff; }
.count { padding: 4rpx 28rpx 12rpx; font-size: 22rpx; color: $sg-text-3; }

/* 城市农批枢纽入口 */
.hub-entry { display: flex; align-items: center; margin: 12rpx 24rpx 4rpx; padding: 20rpx 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); box-shadow: 0 8rpx 20rpx rgba(15,107,59,0.28); }
.he-l { flex: 1; display: flex; flex-direction: column; }
.he-t { font-size: 27rpx; font-weight: 800; color: #fff; }
.he-s { font-size: 19rpx; color: rgba(255,255,255,0.85); margin-top: 6rpx; line-height: 1.4; }
.he-go { font-size: 24rpx; color: #fff; background: rgba(255,255,255,0.2); padding: 8rpx 20rpx; border-radius: 999rpx; }

/* 供应链闭环入口 */
.chain-entry { margin: 8rpx 24rpx 4rpx; background: linear-gradient(135deg, #eafaf0, #fff); border: 2rpx solid #c6ecd5; border-radius: $sg-radius-lg; padding: 20rpx 22rpx; }
.ce-top { display: flex; align-items: center; justify-content: space-between; }
.ce-t { font-size: 26rpx; font-weight: 700; color: $sg-primary-deep; }
.ce-go { font-size: 22rpx; color: $sg-primary; }
.ce-strip { white-space: nowrap; margin-top: 14rpx; }
.ce-node { display: inline-flex; align-items: center; }
.ce-ic { width: 56rpx; height: 56rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 30rpx; }
.ce-n { font-size: 20rpx; color: $sg-text-2; margin: 0 6rpx 0 8rpx; }
.ce-arrow { color: $sg-text-3; margin-right: 8rpx; }

/* 供货：两列卡片 */
.grid { display: flex; flex-wrap: wrap; padding: 0 16rpx 140rpx; }
.pcard { width: calc(50% - 32rpx); margin: 0 16rpx 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; overflow: hidden; position: relative; }
.pcard.selected, .dcard.selected { outline: 5rpx solid $sg-primary; background: #f0fbf5; }
.select-dot { position: absolute; top: 12rpx; left: 12rpx; z-index: 4; width: 42rpx; height: 42rpx; display: flex; align-items: center; justify-content: center; border: 3rpx solid #fff; border-radius: 50%; color: #fff; background: $sg-primary; box-shadow: 0 3rpx 10rpx rgba(0,0,0,.2); font-size: 24rpx; font-weight: 900; }
.demand-dot { position: relative; top: auto; left: auto; flex: none; margin-right: 12rpx; box-shadow: none; }
.pimg { width: 100%; height: 300rpx; background: $sg-primary-light; display: block; }
.pcat { position: absolute; top: 14rpx; left: 14rpx; font-size: 19rpx; color: #fff; background: rgba(22,136,76,0.86); padding: 3rpx 14rpx; border-radius: 999rpx; }
.plevel { position: absolute; top: 14rpx; right: 14rpx; font-size: 18rpx; color: #fff; background: rgba(22,136,76,0.9); padding: 3rpx 12rpx; border-radius: 999rpx; }
.plevel.gold { background: linear-gradient(135deg, #e6b451, #c8871f); }
.pbody { padding: 16rpx 18rpx 20rpx; }
.pname { font-size: 27rpx; font-weight: 600; line-height: 1.35; display: block; height: 74rpx; overflow: hidden; }
.pspec { font-size: 21rpx; color: $sg-text-3; margin: 6rpx 0 8rpx; display: block; height: 30rpx; overflow: hidden; }
.pmeta { display: flex; align-items: center; margin-bottom: 8rpx; }
.prate { font-size: 20rpx; color: $sg-gold; margin-right: 12rpx; }
.psold { font-size: 20rpx; color: $sg-text-3; margin-right: 12rpx; }
.pstock { font-size: 20rpx; color: $sg-primary; }
.porg { margin-bottom: 8rpx; }
.orole { font-size: 18rpx; color: $sg-primary; background: $sg-primary-light; padding: 2rpx 12rpx; border-radius: 6rpx; }
.ometa { font-size: 18rpx; color: $sg-text-3; display: block; margin-top: 4rpx; }
.pfoot { display: flex; align-items: baseline; justify-content: space-between; }
.sg-price { font-size: 32rpx; }
.porigin { font-size: 20rpx; color: $sg-text-3; }

/* 采购：横向卡片 */
.dcard { display: flex; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 20rpx; padding: 20rpx; }
.dcard.mine { border: 2rpx solid $sg-primary; background: linear-gradient(135deg, #f2fbf5, #fff); }
.dname-row { display: flex; align-items: center; }
.mine-tag { font-size: 18rpx; color: #fff; background: $sg-primary; padding: 2rpx 12rpx; border-radius: 6rpx; margin-right: 10rpx; flex-shrink: 0; }
.dimg { width: 150rpx; height: 150rpx; border-radius: $sg-radius; margin-right: 20rpx; background: $sg-primary-light; }
.dbody { flex: 1; display: flex; flex-direction: column; }
.dname { font-size: 27rpx; font-weight: 600; }
.dmeta { font-size: 21rpx; color: $sg-text-3; margin: 6rpx 0; }
.dbuyer-row { display: flex; align-items: center; margin-top: 6rpx; }
.brole { font-size: 19rpx; color: #fff; background: $sg-blue; padding: 2rpx 12rpx; border-radius: 6rpx; }
.bmode { font-size: 19rpx; color: $sg-gold; background: $sg-gold-light; padding: 2rpx 12rpx; border-radius: 6rpx; margin: 0 8rpx; }
.bscope { font-size: 20rpx; color: $sg-text-3; }
.dtags { display: flex; margin-top: 8rpx; }
.tag { font-size: 20rpx; color: $sg-primary; background: $sg-primary-light; padding: 2rpx 12rpx; border-radius: 6rpx; margin-right: 8rpx; }
.dright { display: flex; flex-direction: column; align-items: flex-end; justify-content: center; }
.dquote { font-size: 20rpx; color: $sg-text-3; margin-top: 8rpx; }

.fabs { position: fixed; left: 24rpx; right: 24rpx; bottom: 30rpx; display: flex; gap: 20rpx; z-index: 10; }
.batch-action { position: fixed; left: 20rpx; right: 20rpx; bottom: calc(118rpx + env(safe-area-inset-bottom)); z-index: 30; display: flex; align-items: center; padding: 18rpx 18rpx 18rpx 22rpx; border-radius: 24rpx; color: #fff; background: #102f3d; box-shadow: 0 10rpx 30rpx rgba(8,37,49,.3); }
.batch-action > view:first-child { flex: 1; display: flex; flex-direction: column; }
.batch-action > view:first-child text:first-child { font-size: 25rpx; font-weight: 900; }
.batch-action > view:first-child text:last-child { margin-top: 2rpx; font-size: 17rpx; opacity: .75; }
.batch-action > view:last-child { padding: 16rpx 20rpx; border-radius: 999rpx; color: #134d3a; background: #fff; font-size: 21rpx; font-weight: 900; }
.fab { flex: 1; text-align: center; padding: 24rpx 0; border-radius: 999rpx; font-size: 28rpx; font-weight: 600; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; box-shadow: 0 8rpx 20rpx rgba(15, 107, 59, 0.35); }
.fab.ghost { flex: 0 0 40%; background: #fff; color: $sg-primary; border: 2rpx solid $sg-primary; box-shadow: none; }
</style>
