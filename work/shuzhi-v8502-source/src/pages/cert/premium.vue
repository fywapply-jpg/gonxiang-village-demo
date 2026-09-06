<script setup lang="ts">
import { ref, computed } from "vue";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

// 同一品类：赣南脐橙。同样的地、同样的品种、同样产 100 吨，信誉不同 → 收益不同
const BASE = 4.6;      // 基准收购价 元/斤
const YIELD = 100;     // 年产量 吨
const JIN = 2000;      // 斤/吨

interface Seller {
  key: string; tier: string; name: string; who: string; color: string;
  certs: string[]; score: number; star: number; starName: string;
  trace: number; record: string; recordBad: boolean;
  price: number; sellRate: number;
  perks: { k: string; v: string; d: string }[];
}
const sellers: Seller[] = [
  {
    key: "a", tier: "A+", name: "核心小产区 · 有机地标", who: "赣南脐橙合作社 · 信丰安西 08 号地块", color: "#b8860b",
    certs: ["📍 地理标志", "♻️ 有机产品", "⛰️ 小产区", "✅ 承诺达标"],
    score: 952, star: 5, starName: "金牌商户", trace: 100,
    record: "连续 3 年零违约 · 零质量争议 · 农残全项合格", recordBad: false,
    price: 6.4, sellRate: 1.0,
    perks: [
      { k: "收购价", v: "6.4 元/斤", d: "较基准 +39%（认证+信誉双溢价）" },
      { k: "平台流量", v: "×3.0 加权", d: "首页优选 · 搜索置顶 · 专区推荐" },
      { k: "结算账期", v: "T+3 优先结", d: "回款最快，资金周转快一倍" },
      { k: "融资利率", v: "3.85%", d: "信用贷最优档、免抵押" },
      { k: "准入渠道", v: "军供 / 校餐 / 优选 全开", d: "最高门槛渠道全部准入" },
      { k: "二次分红", v: "×1.2 系数", d: "终端溢价返还加成" },
    ],
  },
  {
    key: "b", tier: "A", name: "地标 + 绿色食品", who: "寻乌脐橙产业合作联社", color: "#16884c",
    certs: ["📍 地理标志", "🟢 绿色食品", "✅ 承诺达标"],
    score: 868, star: 4, starName: "优质商户", trace: 96,
    record: "近 12 个月零违约 · 抽检全合格", recordBad: false,
    price: 5.3, sellRate: 1.0,
    perks: [
      { k: "收购价", v: "5.3 元/斤", d: "较基准 +15%" },
      { k: "平台流量", v: "×1.8 加权", d: "优选专区可进" },
      { k: "结算账期", v: "T+7", d: "标准优先账期" },
      { k: "融资利率", v: "4.10%", d: "信用贷标准档" },
      { k: "准入渠道", v: "校餐 / 优选 开放", d: "军供需再补一档认证" },
      { k: "二次分红", v: "×1.0 系数", d: "标准返还" },
    ],
  },
  {
    key: "c", tier: "B", name: "绿色食品 · 基础带证", who: "赣县蔬果产销合作社", color: "#2b6cb0",
    certs: ["🟢 绿色食品", "✅ 承诺达标"],
    score: 762, star: 3, starName: "合格商户", trace: 82,
    record: "1 次交付延迟（已整改）", recordBad: false,
    price: 4.7, sellRate: 0.95,
    perks: [
      { k: "收购价", v: "4.7 元/斤", d: "较基准 +2%" },
      { k: "平台流量", v: "×1.0 常规", d: "常规排序，无加权" },
      { k: "结算账期", v: "T+15", d: "账期偏长" },
      { k: "融资利率", v: "4.80%", d: "需订单/仓单质押" },
      { k: "准入渠道", v: "仅普通采购", d: "军供/校餐 不准入" },
      { k: "二次分红", v: "×0.8 系数", d: "返还折减" },
    ],
  },
  {
    key: "d", tier: "C", name: "无认证 · 有争议记录", who: "散户直供（未入社）", color: "#c0392b",
    certs: ["✅ 承诺达标（仅基础门槛）"],
    score: 623, star: 2, starName: "成长商户", trace: 45,
    record: "2 次质量争议判责（以次充好 / 缺斤短量）", recordBad: true,
    price: 3.9, sellRate: 0.70,
    perks: [
      { k: "收购价", v: "3.9 元/斤", d: "较基准 −15%（信誉折价）" },
      { k: "平台流量", v: "×0.4 降权", d: "限流，搜索靠后" },
      { k: "结算账期", v: "T+30 / 需预付保证金", d: "回款最慢" },
      { k: "融资利率", v: "不予授信", d: "信用分低于 650 门槛" },
      { k: "准入渠道", v: "限流 · 高门槛渠道全关", d: "军供/校餐/优选 均不准入" },
      { k: "二次分红", v: "无", d: "争议判责期间停发" },
    ],
  },
];

const si = ref(0);
const cur = computed(() => sellers[si.value]);

// 年收入 = 收购价 × 产量 × 斤/吨 × 售出率
const income = (s: Seller) => s.price * YIELD * JIN * s.sellRate / 10000; // 万元
const maxIncome = computed(() => Math.max(...sellers.map(income)));
const gap = computed(() => income(sellers[0]) - income(sellers[3]));

// 升降档路径
const upPath = [
  "① 补齐认证：承诺达标 → 绿色食品 → 地理标志用标授权",
  "② 补溯源：农事/投入品/检测记录上链，完整度补到 90%+",
  "③ 零违约熬满 12 个月，质量争议清零",
  "④ 加入合作社、取得村党支部信用背书，进白名单",
  "→ 可升至 B 档，同样 100 吨年增约 ¥35 万",
];
const downPath = [
  "① 1 次「以次充好」判责成立 → 信用分 −15、星级降一档",
  "② 「特级 / 有机」标签冻结待复审，用标资格暂停",
  "③ 军供 / 校餐 准入资格即时取消",
  "④ 背书人（村支书/党支部）连带记录，90 天重点抽检",
  "→ 直接掉到 B 档，同样 100 吨年少赚约 ¥39 万",
];
const pathMode = ref<"up" | "down">("up");
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty">
      <text class="production-empty-title">暂无后台信用收益档案</text>
      <text class="production-empty-text">正式环境的商户星级、认证、溯源、价格和收益待遇只能由后台风控与真实认证/交易回执计算。本页不展示固定商户评分、收购价或收益对比样例。</text>
    </view>
    <template v-else>
    <view class="hero">
      <text class="ht">⚖️ 同品类 · 信誉分层收益</text>
      <text class="hs">同一个品类、同样的地、同样产 100 吨——认证与信誉不同，收益天差地别。让信用值钱，良币驱逐劣币。</text>
    </view>

    <!-- 品类基准 -->
    <view class="basis">
      <text class="bs-t">🍊 赣南脐橙 · 同品类横向对比</text>
      <view class="bs-chips">
        <text class="bs-chip">基准收购价 {{ BASE }} 元/斤</text>
        <text class="bs-chip">年产量同为 {{ YIELD }} 吨</text>
      </view>
    </view>

    <!-- 四档卖家 -->
    <view class="sec">选一档看"凭什么值这个价"</view>
    <view class="tiers">
      <view class="ti" :class="{ on: si === i }" v-for="(s, i) in sellers" :key="s.key" @tap="si = i"
        :style="si === i ? { borderColor: s.color, background: '#fff' } : {}">
        <text class="ti-tier" :style="{ background: s.color }">{{ s.tier }}</text>
        <text class="ti-p" :style="{ color: s.color }">{{ s.price }}</text>
        <text class="ti-u">元/斤</text>
      </view>
    </view>

    <!-- 当前档详情 -->
    <view class="card" :style="{ borderColor: cur.color }">
      <view class="cd-hd">
        <view class="cd-hi">
          <text class="cd-n">{{ cur.name }}</text>
          <text class="cd-w">{{ cur.who }}</text>
        </view>
        <text class="cd-tier" :style="{ background: cur.color }">{{ cur.tier }} 档</text>
      </view>

      <!-- 信誉构成（凭什么） -->
      <text class="cd-lb">🔎 信誉构成（可核验）</text>
      <view class="certs">
        <text class="ct" v-for="c in cur.certs" :key="c">{{ c }}</text>
      </view>
      <view class="metrics">
        <view class="mt"><text class="mt-v" :style="{ color: cur.color }">{{ cur.score }}</text><text class="mt-k">信用分</text></view>
        <view class="mt"><text class="mt-v" :style="{ color: cur.color }">★{{ cur.star }}</text><text class="mt-k">{{ cur.starName }}</text></view>
        <view class="mt"><text class="mt-v" :style="{ color: cur.color }">{{ cur.trace }}%</text><text class="mt-k">溯源完整度</text></view>
      </view>
      <view class="rec" :class="{ bad: cur.recordBad }">
        <text class="rc-ic">{{ cur.recordBad ? '⚠️' : '✔' }}</text><text class="rc-t">{{ cur.record }}</text>
      </view>

      <!-- 收益待遇（不只是价格） -->
      <text class="cd-lb">💰 我能拿到的待遇（六项）</text>
      <view class="perk" v-for="(p, i) in cur.perks" :key="i">
        <text class="pk-k">{{ p.k }}</text>
        <view class="pk-i"><text class="pk-v" :style="{ color: cur.color }">{{ p.v }}</text><text class="pk-d">{{ p.d }}</text></view>
      </view>
    </view>

    <!-- 年收入对比：钱证 -->
    <view class="sec">同样 100 吨，一年到手差多少</view>
    <view class="cmp">
      <view class="cb" v-for="s in sellers" :key="s.key">
        <view class="cb-top">
          <text class="cb-n">{{ s.tier }} · {{ s.name }}</text>
          <text class="cb-v" :style="{ color: s.color }">¥{{ income(s).toFixed(1) }} 万</text>
        </view>
        <view class="cb-track"><view class="cb-fill" :style="{ width: (income(s) / maxIncome * 100) + '%', background: s.color }"></view></view>
        <text class="cb-d">{{ s.price }} 元/斤 × {{ YIELD }} 吨 × 售出率 {{ (s.sellRate * 100).toFixed(0) }}%</text>
      </view>
      <view class="cb-gap">
        同样的地、同样的脐橙，A+ 档比 C 档一年多挣 <text class="gp-v">¥{{ gap.toFixed(1) }} 万</text>
        <text class="gp-d">差的不是运气，是认证 + 溯源 + 零违约攒出来的信誉</text>
      </view>
    </view>

    <!-- 升降档：信用建设的驱动力 -->
    <view class="sec">信用能升，也能掉</view>
    <view class="pathbar">
      <text class="pb" :class="{ on: pathMode === 'up' }" @tap="pathMode = 'up'">📈 C 档如何翻身</text>
      <text class="pb" :class="{ on: pathMode === 'down' }" @tap="pathMode = 'down'">📉 A+ 档如何跌落</text>
    </view>
    <view class="paths" :class="pathMode">
      <text class="pt" v-for="(p, i) in (pathMode === 'up' ? upPath : downPath)" :key="i">{{ p }}</text>
    </view>

    <!-- 良币驱逐劣币 -->
    <view class="sec">为什么这样能"良币驱逐劣币"</view>
    <view class="loop">
      <view class="lp good">
        <text class="lp-t">🌱 良币正循环</text>
        <text class="lp-d">认证齐 + 溯源全 + 不违约 → 卖得贵、流量大、账期短、利率低、渠道全 → 更有钱有动力投品质 → 信誉更高</text>
      </view>
      <view class="lp bad">
        <text class="lp-t">🥀 劣币出清</text>
        <text class="lp-d">无认证 + 溯源缺 + 有争议 → 卖得便宜还限流、贷不到款、进不了军供校餐 → 要么整改升档，要么自己退出</text>
      </view>
      <view class="lp key">
        <text class="lp-t">🔑 关键：信用必须"值钱"</text>
        <text class="lp-d">全流程可信不是贴个标——农户的农事记录、合作社的背书、商户的履约、客户的评价，全部上链沉淀成一个可算的信誉分，直接换算成收购价、流量、账期、利率。信用一旦能换钱，每个环节才有动力去建设它。</text>
      </view>
    </view>

    <view class="tip">🔗 从农户到商户到客户全流程可信：产地环境/投入品/农事记录 → 认证与检测 → 冷链与交付 → 争议判责与评价，逐环上链沉淀为信誉资产。同品类不同信誉、不同收益，把"认认真真做好货"变成看得见的钱，倒逼各环节主动建信用。</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #b8860b, #8a6508); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.95; margin-top: 8rpx; display: block; line-height: 1.6; }
.basis { margin: 18rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx 22rpx; }
.bs-t { font-size: 26rpx; font-weight: 800; }
.bs-chips { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 10rpx; }
.bs-chip { font-size: 20rpx; color: $sg-gold; background: $sg-gold-light; padding: 4rpx 14rpx; border-radius: 999rpx; }
.sec { font-size: 28rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.tiers { display: flex; gap: 12rpx; padding: 0 24rpx; }
.ti { flex: 1; display: flex; flex-direction: column; align-items: center; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 14rpx 4rpx; border: 3rpx solid transparent; }
.ti-tier { font-size: 19rpx; color: #fff; font-weight: 800; padding: 2rpx 12rpx; border-radius: 999rpx; }
.ti-p { font-size: 32rpx; font-weight: 800; margin-top: 6rpx; }
.ti-u { font-size: 17rpx; color: $sg-text-3; }
.card { margin: 14rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; border: 3rpx solid; }
.cd-hd { display: flex; align-items: flex-start; justify-content: space-between; }
.cd-hi { flex: 1; display: flex; flex-direction: column; }
.cd-n { font-size: 28rpx; font-weight: 800; }
.cd-w { font-size: 20rpx; color: $sg-text-3; margin-top: 3rpx; }
.cd-tier { font-size: 20rpx; color: #fff; font-weight: 800; padding: 4rpx 16rpx; border-radius: 999rpx; flex: none; }
.cd-lb { font-size: 23rpx; font-weight: 700; display: block; margin: 18rpx 0 8rpx; }
.certs { display: flex; flex-wrap: wrap; gap: 8rpx; }
.ct { font-size: 20rpx; color: $sg-text-2; background: $sg-bg; padding: 5rpx 14rpx; border-radius: 8rpx; }
.metrics { display: flex; margin-top: 14rpx; }
.mt { flex: 1; display: flex; flex-direction: column; align-items: center; }
.mt-v { font-size: 30rpx; font-weight: 800; }
.mt-k { font-size: 18rpx; color: $sg-text-3; margin-top: 2rpx; }
.rec { display: flex; align-items: center; margin-top: 12rpx; padding: 12rpx 14rpx; border-radius: $sg-radius; background: $sg-primary-light; }
.rec.bad { background: #fdeceb; }
.rc-ic { font-size: 24rpx; margin-right: 10rpx; }
.rc-t { flex: 1; font-size: 20rpx; color: $sg-text-2; line-height: 1.4; }
.perk { display: flex; align-items: flex-start; padding: 12rpx 0; border-top: 2rpx solid $sg-bg; }
.pk-k { width: 130rpx; font-size: 22rpx; color: $sg-text-3; flex: none; }
.pk-i { flex: 1; display: flex; flex-direction: column; }
.pk-v { font-size: 24rpx; font-weight: 700; }
.pk-d { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; line-height: 1.4; }
.cmp { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx 22rpx; }
.cb { margin-bottom: 16rpx; }
.cb-top { display: flex; align-items: baseline; justify-content: space-between; }
.cb-n { font-size: 21rpx; font-weight: 600; flex: 1; }
.cb-v { font-size: 26rpx; font-weight: 800; flex: none; margin-left: 10rpx; }
.cb-track { height: 20rpx; background: $sg-bg; border-radius: 999rpx; overflow: hidden; margin: 6rpx 0 4rpx; }
.cb-fill { height: 100%; border-radius: 999rpx; }
.cb-d { font-size: 18rpx; color: $sg-text-3; }
.cb-gap { margin-top: 6rpx; padding: 16rpx; background: $sg-gold-light; border-radius: $sg-radius; font-size: 22rpx; font-weight: 600; text-align: center; line-height: 1.5; }
.gp-v { color: #c0392b; font-size: 30rpx; font-weight: 800; }
.gp-d { display: block; font-size: 18rpx; color: $sg-text-3; font-weight: 400; margin-top: 6rpx; }
.pathbar { display: flex; gap: 12rpx; margin: 0 24rpx 12rpx; }
.pb { flex: 1; text-align: center; padding: 14rpx 0; border-radius: 999rpx; background: #fff; box-shadow: $sg-shadow; font-size: 22rpx; font-weight: 700; color: $sg-text-2; }
.pb.on { background: #b8860b; color: #fff; }
.paths { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 16rpx 22rpx; border-left: 8rpx solid #16884c; }
.paths.down { border-left-color: #c0392b; }
.pt { display: block; font-size: 21rpx; color: $sg-text-2; line-height: 1.9; }
.loop { margin: 0 24rpx; }
.lp { background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 20rpx; margin-bottom: 12rpx; border-left: 8rpx solid; }
.lp.good { border-left-color: #16884c; }
.lp.bad { border-left-color: #c0392b; }
.lp.key { border-left-color: #b8860b; background: linear-gradient(135deg, #fdf6e3, #fff); }
.lp-t { font-size: 24rpx; font-weight: 800; display: block; }
.lp-d { font-size: 20rpx; color: $sg-text-2; margin-top: 6rpx; display: block; line-height: 1.6; }
.tip { margin: 20rpx 24rpx 40rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.production-empty { margin: 40rpx 24rpx; padding: 34rpx 28rpx; border: 2rpx solid #d8e7de; border-radius: 22rpx; background: #f7fbf8; }
.production-empty-title { display: block; color: #145d3c; font-size: 32rpx; font-weight: 900; }
.production-empty-text { display: block; margin-top: 16rpx; color: #5e7167; font-size: 24rpx; line-height: 1.7; }
</style>
