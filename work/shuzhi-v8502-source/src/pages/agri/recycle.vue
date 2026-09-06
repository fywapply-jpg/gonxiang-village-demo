<script setup lang="ts">
import { ref, computed } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const productionBlocked = () => uni.showModal({
  title: "需后台循环农业服务",
  content: "正式环境的回收计量、财政补贴、绿色积分和碳减排量必须由后台凭真实称重、转运和持牌处置回执入账；当前不展示或修改本地积分。",
  showCancel: false,
});

const ACRES = 100; // 测算基准 100 亩

// 三类农业废弃物回收
interface Cat {
  key: string; icon: string; name: string; color: string;
  gen: number; genUnit: string;           // 每亩产生量
  mode: string;                            // 回收方式
  price: number; priceUnit: string;        // 回收价/退款（元/单位）
  subsidy: string;                         // 补贴政策
  uses: string[];                          // 资源化去向
  harm: string;                            // 不回收的危害
  carbon: number;                          // 每亩可减碳（t CO2e）
}
const cats: Cat[] = [
  {
    key: "film", icon: "🎞️", name: "废旧农膜", color: "#2b6cb0",
    gen: 5, genUnit: "kg/亩", mode: "网点回收 · 计重收购",
    price: 1.2, priceUnit: "元/kg",
    subsidy: "加厚耐候膜 / 全生物降解膜 财政补贴 40%（从源头减残留）",
    uses: ["清洗除杂 → 破碎造粒", "再生塑料：管材 / 滴灌带 / 育苗盘", "劣质膜 → 合规能源化"],
    harm: "白色污染、土壤板结、出苗率下降、牲畜误食",
    carbon: 0.02,
  },
  {
    key: "pack", icon: "🧴", name: "农药包装废弃物", color: "#c0392b",
    gen: 8, genUnit: "件/亩·季", mode: "押金制 · 以旧换新",
    price: 0.5, priceUnit: "元/件（押金全退）",
    subsidy: "购药收 0.5 元/件押金，交回全退；财政再补处置费 0.3 元/件",
    uses: ["集中暂存 → 专业清洗", "无害化焚烧 / 合规资源化", "台账扫码、去向可追溯"],
    harm: "农残渗入土壤水体、误饮中毒、随意丢弃入河",
    carbon: 0,
  },
  {
    key: "straw", icon: "🌾", name: "农作物秸秆", color: "#16884c",
    gen: 400, genUnit: "kg/亩", mode: "离田收储 · 五化利用",
    price: 0.22, priceUnit: "元/kg（离田收储）",
    subsidy: "离田利用作业补贴，替代焚烧；打捆机具购置补贴",
    uses: ["肥料化：粉碎还田培肥", "饲料化：青贮 / 黄贮喂牛羊", "燃料化：压块 / 生物质发电", "基料化：食用菌棒", "原料化：板材 / 纸浆"],
    harm: "露天焚烧 → 大气污染、火灾、烧毁地力",
    carbon: 0.32,
  },
];
const ci = ref(2);
const cat = computed(() => cats[ci.value]);

// 100 亩综合回收账本
const line = (c: Cat) => {
  const qty = c.gen * ACRES;                        // 总量（原单位）
  const income = Math.round(qty * c.price);         // 回收收益/退款（元）
  const carbon = +(c.carbon * ACRES).toFixed(1);    // 减碳（t）
  return { qty, income, carbon };
};
const rows = computed(() => cats.map((c) => ({ c, ...line(c) })));
const totalIncome = computed(() => rows.value.reduce((s, r) => s + r.income, 0));
const packSubsidy = computed(() => Math.round(cats[1].gen * ACRES * 0.3)); // 农药瓶处置补贴
const grandIncome = computed(() => totalIncome.value + packSubsidy.value);
const totalCarbon = computed(() => +rows.value.reduce((s, r) => s + r.carbon, 0).toFixed(1));
const greenPoints = computed(() => Math.round(grandIncome.value * 1.2)); // 绿色积分

// 信用 / 碳汇 / 循环 联动
const loops = [
  { icon: "🎫", t: "绿色积分", d: "交回废弃物即积分，抵扣农资、兑换生活用品，越回收越省" },
  { icon: "🏅", t: "信用加分", d: "回收履约计入合作社/农户绿色信用，评级上浮、授信更优" },
  { icon: "🌿", t: "碳汇变现", d: "秸秆离田利用、地膜减污形成碳减排，确权后可质押/交易" },
  { icon: "♻️", t: "循环闭环", d: "废膜→再生塑料→滴灌带回田；秸秆→有机肥→还田，肥药双减" },
];

// 回收闭环流程
const flow = [
  { t: "村级回收网点收集", d: "依托供销服务站/基层社，一村一点、计量入库" },
  { t: "扫码建台账 · 上链", d: "回收物称重扫码，谁交的、交多少、去哪，全程可追溯" },
  { t: "归集运输", d: "网点 → 县域集散中心，规模化归集降本" },
  { t: "资源化利用企业处置", d: "对接再生塑料 / 秸秆利用 / 无害化处置持牌企业" },
  { t: "积分 / 补贴 / 碳汇结算", d: "回收款、财政补贴、绿色积分、碳减排量核算入账" },
];

function nav(url: string) { uni.navigateTo({ url }); }
function point() {
  if (productionBuild) return productionBlocked();
  uni.showModal({
    title: "绿色积分兑换", showCancel: false, confirmText: "知道了",
    content: `本季 ${ACRES} 亩预计可得绿色积分 ${greenPoints.value} 分。\n\n可用于：抵扣农资集采货款、兑换生活用品、提升绿色信用评级。回收越规范、积分越多、信用越好。`,
  });
}
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty"><text class="production-empty-title">暂无后台回收订单</text><text class="production-empty-text">正式环境只展示后台返回的回收主体、称重、结算和追溯证据；本地回收案例不会混入生产数据。</text></view>
    <template v-else>
    <view class="hero">
      <text class="ht">♻️ 再生资源回收 · 绿色循环</text>
      <text class="hs">农膜、农药包装、秸秆——一村一网点应收尽收，全程可追溯、资源化再利用。回收换钱、换积分、换信用、换碳汇。</text>
    </view>

    <!-- 三类废弃物 -->
    <view class="sec">选回收物</view>
    <view class="cats">
      <view class="ct" :class="{ on: ci === i }" v-for="(c, i) in cats" :key="c.key" @tap="ci = i"
        :style="ci === i ? { borderColor: c.color, background: '#fff' } : {}">
        <text class="ct-ic">{{ c.icon }}</text><text class="ct-n">{{ c.name }}</text>
      </view>
    </view>

    <!-- 当前类详情 -->
    <view class="detail">
      <view class="dt-hd">
        <text class="dt-ic">{{ cat.icon }}</text>
        <view class="dt-hi"><text class="dt-n">{{ cat.name }}</text><text class="dt-mode" :style="{ color: cat.color }">{{ cat.mode }}</text></view>
        <view class="dt-p"><text class="dt-pv" :style="{ color: cat.color }">{{ cat.price }}</text><text class="dt-pu">{{ cat.priceUnit }}</text></view>
      </view>
      <view class="dt-sub"><text class="dt-k">💰 补贴政策</text><text class="dt-v">{{ cat.subsidy }}</text></view>
      <view class="dt-uses">
        <text class="du-lb">🏭 资源化去向</text>
        <text class="du" v-for="(u, i) in cat.uses" :key="i">· {{ u }}</text>
      </view>
      <view class="dt-harm">⚠️ 不回收的危害：{{ cat.harm }}</view>
    </view>

    <!-- 100 亩综合回收账本 -->
    <view class="sec">📊 回收账本（{{ ACRES }} 亩一季）</view>
    <view class="ledger">
      <view class="lg" v-for="r in rows" :key="r.c.key">
        <text class="lg-ic">{{ r.c.icon }}</text>
        <view class="lg-i">
          <text class="lg-n">{{ r.c.name }}</text>
          <text class="lg-d">{{ r.qty >= 1000 ? (r.qty/1000) + ' 吨 × ' + (r.c.price * 1000) + ' 元/吨' : r.qty + ' ' + r.c.genUnit.split('/')[0] + ' × ' + r.c.price + (r.c.priceUnit.includes('kg') ? ' 元/kg' : ' 元/件') }}<text v-if="r.carbon > 0"> · 减碳 {{ r.carbon }}t</text></text>
        </view>
        <text class="lg-v">¥{{ r.income.toLocaleString() }}</text>
      </view>
      <view class="lg extra">
        <text class="lg-ic">🏛️</text>
        <view class="lg-i"><text class="lg-n">农药瓶处置财政补贴</text><text class="lg-d">{{ cats[1].gen * ACRES }} 件 × 0.3 元/件</text></view>
        <text class="lg-v">¥{{ packSubsidy.toLocaleString() }}</text>
      </view>
      <view class="lg-sum">
        <view class="sum-cell"><text class="sc-v red">¥{{ grandIncome.toLocaleString() }}</text><text class="sc-l">回收总收益</text></view>
        <view class="sum-cell" @tap="point"><text class="sc-v gold">{{ greenPoints.toLocaleString() }}</text><text class="sc-l">绿色积分 ›</text></view>
        <view class="sum-cell"><text class="sc-v green">{{ totalCarbon }} t</text><text class="sc-l">CO₂e 减排</text></view>
      </view>
    </view>

    <!-- 四大联动 -->
    <view class="sec">回收 → 钱 · 积分 · 信用 · 碳汇</view>
    <view class="loops">
      <view class="lp" v-for="l in loops" :key="l.t">
        <text class="lp-ic">{{ l.icon }}</text>
        <view class="lp-i"><text class="lp-t">{{ l.t }}</text><text class="lp-d">{{ l.d }}</text></view>
      </view>
    </view>

    <!-- 闭环流程 -->
    <view class="sec">回收闭环（应收尽收 · 可追溯）</view>
    <view class="flow">
      <view class="fl" v-for="(f, i) in flow" :key="i">
        <view class="fl-n">{{ i + 1 }}</view>
        <view class="fl-i"><text class="fl-t">{{ f.t }}</text><text class="fl-d">{{ f.d }}</text></view>
      </view>
    </view>

    <!-- 关联 -->
    <view class="links">
      <view class="lk" @tap="nav('/pages/agri/inputs')"><text class="lk-ic">🎫</text><view class="lk-i"><text class="lk-t">绿色积分抵农资</text><text class="lk-d">回收攒的积分，直接抵扣农资集采货款</text></view><text class="lk-go">›</text></view>
      <view class="lk" @tap="nav('/pages/finance/product?id=F6')"><text class="lk-ic">🌿</text><view class="lk-i"><text class="lk-t">碳汇资产质押 / 交易</text><text class="lk-d">秸秆利用、地膜减污形成的碳减排确权变现</text></view><text class="lk-go">›</text></view>
      <view class="lk" @tap="nav('/pages/agri/trust')"><text class="lk-ic">🚜</text><view class="lk-i"><text class="lk-t">土地托管顺带回收</text><text class="lk-d">机收同步打捆离田、地膜统一回收，省心</text></view><text class="lk-go">›</text></view>
    </view>

    <view class="tip">🔗 再生资源回收是供销社的传统主业与绿色使命：把散落田间的农膜、农药瓶、秸秆一村一点应收尽收，扫码建台账、去向全追溯，杜绝白色污染与农残乱排。回收既换钱、换积分、换信用，又通过秸秆利用与减污形成碳汇——让"绿色"变成看得见的收益，倒逼肥药双减、良性循环。</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #16884c, #0f6b3b); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.95; margin-top: 8rpx; display: block; line-height: 1.6; }
.sec { font-size: 28rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.cats { display: flex; gap: 14rpx; padding: 0 24rpx; }
.ct { flex: 1; display: flex; flex-direction: column; align-items: center; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 18rpx 8rpx; border: 3rpx solid transparent; }
.ct-ic { font-size: 40rpx; }
.ct-n { font-size: 22rpx; font-weight: 700; margin-top: 6rpx; text-align: center; }
.detail { margin: 16rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.dt-hd { display: flex; align-items: center; }
.dt-ic { font-size: 48rpx; margin-right: 14rpx; }
.dt-hi { flex: 1; display: flex; flex-direction: column; }
.dt-n { font-size: 28rpx; font-weight: 800; }
.dt-mode { font-size: 20rpx; font-weight: 600; margin-top: 2rpx; }
.dt-p { display: flex; align-items: baseline; flex: none; }
.dt-pv { font-size: 34rpx; font-weight: 800; }
.dt-pu { font-size: 17rpx; color: $sg-text-3; margin-left: 3rpx; }
.dt-sub { display: flex; margin-top: 16rpx; padding-top: 14rpx; border-top: 2rpx solid $sg-bg; }
.dt-k { width: 130rpx; flex: none; font-size: 21rpx; color: $sg-text-3; }
.dt-v { flex: 1; font-size: 21rpx; color: $sg-text-2; line-height: 1.5; }
.dt-uses { margin-top: 12rpx; padding-top: 12rpx; border-top: 2rpx solid $sg-bg; display: flex; flex-direction: column; }
.du-lb { font-size: 21rpx; color: $sg-text-3; margin-bottom: 4rpx; }
.du { font-size: 21rpx; color: $sg-text-2; line-height: 1.7; }
.dt-harm { margin-top: 12rpx; font-size: 20rpx; color: #c0392b; background: #fdeceb; border-radius: $sg-radius; padding: 12rpx 14rpx; line-height: 1.5; }
.ledger { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 8rpx 22rpx 18rpx; }
.lg { display: flex; align-items: center; padding: 14rpx 0; border-top: 2rpx solid $sg-bg; }
.lg:first-child { border-top: none; }
.lg.extra { opacity: 0.9; }
.lg-ic { font-size: 34rpx; margin-right: 12rpx; flex: none; }
.lg-i { flex: 1; display: flex; flex-direction: column; }
.lg-n { font-size: 24rpx; font-weight: 700; }
.lg-d { font-size: 18rpx; color: $sg-text-3; margin-top: 2rpx; }
.lg-v { font-size: 26rpx; font-weight: 800; color: $sg-primary; flex: none; margin-left: 10rpx; }
.lg-sum { display: flex; margin-top: 12rpx; padding-top: 14rpx; border-top: 3rpx dashed #d9e6dd; }
.sum-cell { flex: 1; display: flex; flex-direction: column; align-items: center; }
.sc-v { font-size: 30rpx; font-weight: 800; }
.sc-v.red { color: #d64541; }
.sc-v.gold { color: #d99a2b; }
.sc-v.green { color: #16884c; }
.sc-l { font-size: 18rpx; color: $sg-text-3; margin-top: 3rpx; }
.loops { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 8rpx 22rpx; }
.lp { display: flex; align-items: flex-start; padding: 14rpx 0; border-top: 2rpx solid $sg-bg; }
.lp:first-child { border-top: none; }
.lp-ic { font-size: 36rpx; margin-right: 14rpx; flex: none; }
.lp-i { flex: 1; display: flex; flex-direction: column; }
.lp-t { font-size: 24rpx; font-weight: 700; }
.lp-d { font-size: 19rpx; color: $sg-text-2; margin-top: 3rpx; line-height: 1.5; }
.flow { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 22rpx; }
.fl { display: flex; align-items: flex-start; padding: 12rpx 0; border-top: 2rpx solid $sg-bg; }
.fl:first-child { border-top: none; }
.fl-n { width: 40rpx; height: 40rpx; flex: none; border-radius: 50%; background: $sg-primary; color: #fff; font-size: 22rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-right: 14rpx; }
.fl-i { flex: 1; display: flex; flex-direction: column; }
.fl-t { font-size: 24rpx; font-weight: 600; }
.fl-d { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; line-height: 1.4; }
.links { margin: 20rpx 24rpx 0; }
.lk { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; margin-bottom: 12rpx; }
.lk-ic { width: 64rpx; height: 64rpx; border-radius: 18rpx; background: $sg-primary-light; display: flex; align-items: center; justify-content: center; font-size: 34rpx; margin-right: 14rpx; flex: none; }
.lk-i { flex: 1; display: flex; flex-direction: column; }
.lk-t { font-size: 25rpx; font-weight: 700; }
.lk-d { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; }
.lk-go { font-size: 30rpx; color: $sg-text-3; }
.tip { margin: 20rpx 24rpx 40rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
</style>
