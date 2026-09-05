<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { villageProducts, type VillageProduct } from "@/mock/products";
import { merchantProfile, starLevels } from "@/mock/merchant";
import { getProducts, type LocalProduct } from "@/services/localApi";

const name = ref(merchantProfile.org);
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const merchantId = ref("");
const remoteGoods = ref<VillageProduct[]>([]);
const ready = ref(!productionBuild);
const loading = ref(false);
const loadError = ref("");
function mapProduct(product: LocalProduct): VillageProduct {
  const price = Number(product.price) || 0;
  return { id: product.id, merchant_id: product.merchant_id, name: product.name, cat: product.category, origin: product.origin || "产地待确认", spec: product.spec || "标准规格", price, priceText: `¥${price.toFixed(2)}`, unit: product.unit || "件", supplier: product.merchant_name || name.value, pic: product.media?.find((item) => item.media_type === "image")?.url || "/static/products/p12.jpg", tags: ["后台已审核"], sold: 0, stock: `库存 ${Number(product.stock) || 0}`, rating: 4.8 };
}
onLoad(async (q: any) => {
  if (q?.name) name.value = decodeURIComponent(q.name);
  merchantId.value = String(q?.merchant_id || "");
  if (!productionBuild) return;
  loading.value = true;
  try {
    const rows = await getProducts();
    const selected = rows.filter((p) => merchantId.value ? String(p.merchant_id || "") === merchantId.value : p.merchant_name === name.value);
    remoteGoods.value = selected.map(mapProduct);
    ready.value = true;
  } catch (error: any) { loadError.value = error?.message || "后台商户资料暂不可读，请先登录授权"; }
  finally { loading.value = false; }
});

// 稳定生成企业档案（按名称）
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff; return h; }
const h = computed(() => hash(name.value));
const profile = computed(() => productionBuild ? { star: 0, score: "—", dims: [], benefits: [] } : merchantProfile);
const level = computed(() => productionBuild ? { color: "#5b9a70", name: "后台评定", benefits: [] } : (starLevels.find((l) => l.star === merchantProfile.star) || starLevels[0]));

// 企业法人资质
const corp = computed(() => ({
  code: productionBuild ? "后台授权后显示" : "91" + (360000 + (h.value % 40000)) + "MA" + (h.value % 9000 + 1000) + "K",
  since: productionBuild ? "—" : 2008 + (h.value % 14),
  capital: productionBuild ? "—" : [200, 500, 800, 1000, 2000][h.value % 5],
  legal: productionBuild ? "后台授权后显示" : ["王", "李", "张", "陈", "刘"][h.value % 5] + "**",
  type: productionBuild ? "已核验商户主体" : (/合作社|联合体|农合/.test(name.value) ? "农民专业合作社" : (/食品|加工|米业|厂/.test(name.value) ? "有限责任公司（加工企业）" : "有限责任公司")),
  scope: productionBuild ? "以后台返回的经营范围为准" : "农产品收购、初加工、仓储、批发；预包装食品销售",
}));

// 经营能力
const biz = computed(() => ({
  cats: productionBuild ? "以后台已审核商品为准" : (/脐橙|果/.test(name.value) ? "脐橙 / 柑橘 / 时令水果" : (/蔬菜|菜/.test(name.value) ? "叶菜 / 瓜果 / 净菜" : "综合农产品")),
  capacity: productionBuild ? "后台未返回" : (8 + h.value % 20) + " 万吨/年",
  radius: productionBuild ? "后台未返回" : "覆盖 " + (3 + h.value % 6) + " 省 " + (8 + h.value % 30) + " 市",
  moq: productionBuild ? "按商品与合同约定" : (500 + (h.value % 10) * 100) + " kg 起订",
  account: productionBuild ? "以单笔 CA 合同及授信审批为准" : ["验收合格即付", "验收合格次日起30个自然日", "发票与对账确认次日起45个自然日"][h.value % 3],
  settle: productionBuild ? "以后台结算配置为准" : "对公转账 / 企业数字人民币 / 持牌机构监管结算",
}));

// 成交数据
const stat = computed(() => ({
  gmv: productionBuild ? "—" : (1200 + h.value % 2600) + " 万",
  deals: productionBuild ? "—" : 800 + h.value % 4000,
  repurchase: productionBuild ? "—" : (72 + h.value % 24) + "%",
  ontime: productionBuild ? "—" : (95 + h.value % 5) + "%",
}));

const goods = computed(() => productionBuild ? remoteGoods.value : villageProducts.slice(h.value % 4, (h.value % 4) + 6));
function goGoods(id: string) { if (id) uni.navigateTo({ url: `/pages/trade/supply-detail?id=${encodeURIComponent(id)}` }); else uni.showModal({ title: "暂无可下单货源", content: "该商户当前没有后台已审核且可交易的商品。", showCancel: false }); }
function firstGoods() { goGoods(goods.value[0]?.id || ""); }
function contact() { uni.navigateTo({ url: `/pages/trade/chat?to=${encodeURIComponent(name.value)}` }); }
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild && !ready" class="sg-card unavailable">
      <text class="unavailable-title">{{ loading ? '正在读取后台商户资料…' : '商户资料暂不可用' }}</text>
      <text class="unavailable-text">{{ loadError || '请先完成登录授权后查看商户资料。' }}</text>
    </view>
    <template v-else>
    <view class="hero">
      <view class="h-top">
        <view class="logo">{{ name.slice(0, 1) }}</view>
        <view class="h-i">
          <text class="h-n">{{ name }}</text>
          <view class="h-tags">
            <text class="h-star" :style="{ background: level.color }">{{ productionBuild ? '✔' : '★' + profile.star }} {{ level.name }}</text>
            <text class="h-cert">✔ 企业法人已认证</text>
          </view>
        </view>
      </view>
      <text class="h-b">B2B 供应商 · {{ corp.type }}</text>
    </view>

    <!-- 企业法人资质 -->
    <view class="sec">🏢 企业法人资质</view>
    <view class="sg-card">
      <view class="r"><text class="k">主体类型</text><text class="v">{{ corp.type }}</text></view>
      <view class="r"><text class="k">统一社会信用代码</text><text class="v mono">{{ corp.code }}</text></view>
      <view class="r"><text class="k">成立时间</text><text class="v">{{ productionBuild ? '—' : corp.since + ' 年（' + (2026 - Number(corp.since)) + ' 年）' }}</text></view>
      <view class="r"><text class="k">注册资本</text><text class="v">{{ corp.capital }} 万元</text></view>
      <view class="r"><text class="k">法定代表人</text><text class="v">{{ corp.legal }}</text></view>
      <view class="r"><text class="k">经营范围</text><text class="v">{{ corp.scope }}</text></view>
      <view class="quals"><text class="ql">营业执照</text><text class="ql">食品经营许可</text><text class="ql">质量安全合格证</text><text class="ql">A 级溯源</text></view>
    </view>

    <!-- 星级评定 -->
    <view class="sec">⭐ 商户星级评定</view>
    <view class="sg-card">
      <view class="star-top">
        <view class="st-score"><text class="sts-n">{{ profile.score }}</text><text class="sts-l">综合分</text></view>
        <view class="st-dims">
          <view class="dim" v-for="d in profile.dims" :key="d.name">
            <view class="d-top"><text class="d-n">{{ d.name }}</text><text class="d-w">{{ d.weight }}</text></view>
            <view class="d-bar"><view class="d-fill" :style="{ width: d.score + '%' }"></view></view>
            <text class="d-d">{{ d.desc }}</text>
          </view>
        </view>
      </view>
      <view class="benefits"><text class="bf" v-for="b in level.benefits" :key="b">✔ {{ b }}</text><text v-if="productionBuild" class="backend-note">星级与信用指标由后台授权后展示</text></view>
    </view>

    <!-- 经营能力 -->
    <view class="sec">📦 经营与供货能力</view>
    <view class="sg-card">
      <view class="r"><text class="k">主营品类</text><text class="v">{{ biz.cats }}</text></view>
      <view class="r"><text class="k">年供货能力</text><text class="v">{{ biz.capacity }}</text></view>
      <view class="r"><text class="k">供货半径</text><text class="v">{{ biz.radius }}</text></view>
      <view class="r"><text class="k">起订量</text><text class="v">{{ biz.moq }}</text></view>
      <view class="r"><text class="k">付款条件示例</text><text class="v">{{ biz.account }}（以单笔CA合同及授信审批为准）</text></view>
      <view class="r"><text class="k">结算方式</text><text class="v">{{ biz.settle }}</text></view>
    </view>

    <!-- 成交数据 -->
    <view class="stats">
      <view class="s"><text class="s-n">¥{{ stat.gmv }}</text><text class="s-l">近12月成交</text></view>
      <view class="s"><text class="s-n">{{ stat.deals }}</text><text class="s-l">累计订单</text></view>
      <view class="s"><text class="s-n">{{ stat.repurchase }}</text><text class="s-l">复购率</text></view>
      <view class="s"><text class="s-n">{{ stat.ontime }}</text><text class="s-l">准时交付</text></view>
    </view>

    <!-- 在售货源 -->
    <view class="sec">🛒 在售货源</view>
    <view class="grid">
      <view class="gcard" v-for="g in goods" :key="g.id" @tap="goGoods(g.id)">
        <image class="gimg" :src="g.pic" mode="aspectFill" />
        <text class="gname">{{ g.name }}</text>
        <text class="gprice">{{ g.priceText }}</text>
      </view>
    </view>
    <view v-if="productionBuild && !goods.length" class="empty-goods">暂无后台已审核货源</view>

    <view class="tip">🔗 所有供应商均为企业法人 / 合作社主体，资质、星级、成交、溯源全程上链，可查可信。（数智供社 B2B）</view>

    <view class="bar">
      <view class="bar-btn ghost" @tap="contact">💬 询盘洽谈</view>
      <view class="bar-btn" @tap="firstGoods">查看货源下单</view>
    </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #16884c, #0f6b3b); padding: 32rpx 28rpx 26rpx; color: #fff; }
.h-top { display: flex; align-items: center; }
.logo { width: 96rpx; height: 96rpx; border-radius: 24rpx; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 44rpx; font-weight: 800; margin-right: 18rpx; }
.h-i { flex: 1; display: flex; flex-direction: column; }
.h-n { font-size: 32rpx; font-weight: 800; }
.h-tags { display: flex; gap: 10rpx; margin-top: 8rpx; flex-wrap: wrap; }
.h-star { font-size: 19rpx; color: #fff; padding: 4rpx 14rpx; border-radius: 999rpx; font-weight: 700; }
.h-cert { font-size: 19rpx; background: rgba(255,255,255,0.2); padding: 4rpx 14rpx; border-radius: 999rpx; }
.h-b { font-size: 20rpx; opacity: 0.9; margin-top: 14rpx; display: inline-block; border: 2rpx solid rgba(255,255,255,0.35); padding: 4rpx 16rpx; border-radius: 999rpx; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.sg-card { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.r { display: flex; padding: 12rpx 0; border-top: 2rpx solid $sg-bg; }
.r:first-child { border-top: none; }
.k { width: 200rpx; color: $sg-text-3; font-size: 23rpx; flex: none; }
.v { flex: 1; font-size: 23rpx; }
.v.mono { font-family: Menlo, monospace; font-size: 20rpx; }
.quals { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 12rpx; padding-top: 12rpx; border-top: 2rpx solid $sg-bg; }
.ql { font-size: 19rpx; color: $sg-primary; background: $sg-primary-light; padding: 5rpx 14rpx; border-radius: 6rpx; }
.star-top { display: flex; gap: 16rpx; }
.st-score { flex: none; width: 130rpx; display: flex; flex-direction: column; align-items: center; justify-content: center; background: $sg-gold-light; border-radius: $sg-radius; }
.sts-n { font-size: 48rpx; font-weight: 800; color: $sg-gold; }
.sts-l { font-size: 19rpx; color: $sg-text-3; }
.st-dims { flex: 1; }
.dim { margin-bottom: 12rpx; }
.d-top { display: flex; justify-content: space-between; align-items: baseline; }
.d-n { font-size: 22rpx; font-weight: 600; }
.d-w { font-size: 19rpx; color: $sg-text-3; }
.d-bar { height: 12rpx; background: $sg-bg; border-radius: 999rpx; overflow: hidden; margin: 6rpx 0 4rpx; }
.d-fill { height: 100%; background: linear-gradient(90deg, $sg-gold, $sg-primary); border-radius: 999rpx; }
.d-d { font-size: 18rpx; color: $sg-text-3; }
.benefits { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 12rpx; padding-top: 12rpx; border-top: 2rpx solid $sg-bg; }
.bf { font-size: 19rpx; color: $sg-gold; background: $sg-gold-light; padding: 5rpx 14rpx; border-radius: 6rpx; }
.stats { display: flex; margin: 16rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx 0; }
.s { flex: 1; text-align: center; }
.s-n { font-size: 30rpx; font-weight: 800; color: $sg-primary-deep; display: block; }
.s-l { font-size: 18rpx; color: $sg-text-3; }
.grid { display: flex; flex-wrap: wrap; padding: 0 16rpx; }
.gcard { width: calc(33.33% - 20rpx); margin: 0 10rpx 20rpx; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; overflow: hidden; }
.gimg { width: 100%; height: 150rpx; display: block; background: $sg-primary-light; }
.gname { font-size: 19rpx; padding: 6rpx 8rpx 0; display: block; height: 52rpx; overflow: hidden; line-height: 1.3; }
.gprice { font-size: 22rpx; font-weight: 700; color: $sg-red; padding: 0 8rpx 8rpx; display: block; }
.tip { margin: 16rpx 24rpx 0; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; padding-bottom: 130rpx; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; display: flex; gap: 20rpx; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.05); }
.bar-btn { flex: 1; text-align: center; padding: 24rpx 0; border-radius: 999rpx; font-size: 28rpx; font-weight: 700; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; }
.bar-btn.ghost { flex: 0 0 40%; background: $sg-primary-light; color: $sg-primary; }
.backend-note { font-size: 19rpx; color: $sg-text-3; padding: 5rpx 14rpx; }
.empty-goods { margin: 0 24rpx 20rpx; padding: 28rpx; text-align: center; background: #fff; border-radius: $sg-radius; color: $sg-text-3; font-size: 22rpx; }
.unavailable { margin-top: 28rpx; text-align: center; padding: 54rpx 28rpx; }
.unavailable-title { display: block; font-size: 30rpx; font-weight: 800; color: $sg-text; }
.unavailable-text { display: block; margin-top: 14rpx; font-size: 23rpx; line-height: 1.6; color: $sg-text-3; }
</style>
