<script setup lang="ts">
import { ref, computed } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const productionBlocked = () => uni.showModal({
  title: "需后台初加工服务",
  content: "正式环境的代加工下单必须由后台核验产能、批次、质量标准、合同和收货方后生成真实订单；当前不会创建本地订单。",
  showCancel: false,
});

const TON = 10;          // 一批毛菜 10 吨
const JIN = 2000;        // 斤/吨
const BUY = 1.2;         // 毛菜收购价 元/斤

// 初加工深度：越深加工，售价越高、损耗越低，但加工成本也高
interface Level {
  key: string; icon: string; name: string; d: string;
  yield: number;   // 出成率（可售成品占毛菜比例）
  price: number;   // 成品售价 元/斤
  proc: number;    // 加工成本 元/斤毛菜
  loss: number;    // 产后损耗率
  works: string[]; // 工序
}
const levels: Level[] = [
  { key: "raw", icon: "🥬", name: "毛菜直卖", d: "田头装车、原样卖批发市场", yield: 0.75, price: 1.8, proc: 0, loss: 0.25, works: ["采收", "装车"] },
  { key: "grade", icon: "🧺", name: "分拣分级 + 田头预冷", d: "去杂去次、按级分选、真空预冷", yield: 0.85, price: 2.7, proc: 0.35, loss: 0.12, works: ["分拣去次", "分级", "田头预冷", "冷藏保鲜"] },
  { key: "clean", icon: "🔪", name: "净菜切配（直配央厨）", d: "清洗、去皮去边、切配、气调包装", yield: 0.72, price: 4.2, proc: 0.8, loss: 0.08, works: ["清洗", "去皮去边", "切配", "气调包装", "冷链"] },
  { key: "prep", icon: "🍱", name: "预制半成品", d: "腌制/焯制/调理、锁鲜包装", yield: 0.65, price: 6.0, proc: 1.6, loss: 0.05, works: ["净菜", "焯制/腌制", "调理", "速冷锁鲜", "赋码"] },
];
const li = ref(2); // 默认净菜切配
const lv = computed(() => levels[li.value]);
const raw = levels[0];

// 每吨毛菜净收益 = 成品收入 − 毛菜成本 − 加工成本
const netPerTon = (l: Level) => Math.round(JIN * l.yield * l.price - JIN * BUY - JIN * l.proc);
const netCur = computed(() => netPerTon(lv.value));
const netRaw = computed(() => netPerTon(raw));
const gainPerTon = computed(() => netCur.value - netRaw.value);
const batchGain = computed(() => (gainPerTon.value * TON / 10000).toFixed(2)); // 万元
const maxNet = computed(() => Math.max(...levels.map(netPerTon)));

// 分级好价：同一批菜分级后按级卖，好货好价（呼应"信誉/品质分层收益"）
const grades = [
  { g: "精品级", pct: 30, price: "4.2 元/斤", to: "央厨净菜 / 商超精品", color: "#16884c" },
  { g: "一级", pct: 45, price: "2.7 元/斤", to: "餐饮 / 社区门店", color: "#2b6cb0" },
  { g: "等外 / 次品", pct: 25, price: "0.6 元/斤", to: "深加工 / 饲料化，不浪费", color: "#c0392b" },
];

// 中央厨房原料链：产地初加工净菜 → 冷链直配 → 央厨，砍掉中间倒手
const chain = [
  { t: "产地初加工中心", d: "毛菜就地分级/净菜切配，最初一公里减损", icon: "🏭" },
  { t: "冷链直配", d: "净菜气调保鲜、当日冷链直达，不进批发市场倒手", icon: "🚚" },
  { t: "中央厨房收货", d: "净菜直接下锅，央厨免去洗切、省人工省损耗", icon: "🍳" },
  { t: "订单以销定产", d: "央厨报量 → 反向定产初加工，按需定产不压货", icon: "📑" },
];

function nav(url: string) { uni.navigateTo({ url }); }
function toBom() { uni.navigateTo({ url: "/pages/trade/kitchen-bom" }); }
function order() {
  if (productionBuild) return productionBlocked();
  uni.showModal({
    title: "初加工代加工下单", showCancel: false, confirmText: "知道了",
    content: `${lv.value.name}\n一批 ${TON} 吨毛菜\n每吨净收益约 ¥${netCur.value.toLocaleString()}（比毛菜直卖多 ¥${gainPerTon.value.toLocaleString()}）\n\n可委托产地初加工中心代加工，或自建线接央厨订单。`,
  });
}
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty"><text class="production-empty-title">暂无后台农资生产档案</text><text class="production-empty-text">正式环境只展示后台审核的农资、作业和验收档案；本地农资生产案例不会混入真实项目。</text></view>
    <template v-else>
    <view class="hero">
      <text class="ht">🏭 产地初加工中心</text>
      <text class="hs">最初一公里，减损又增值。分拣分级、净菜切配、冷藏保鲜——就地把毛菜变好货，直配中央厨房，不再贱卖原字号。</text>
    </view>

    <!-- 初加工深度 -->
    <view class="sec">选初加工深度（越深越增值）</view>
    <view class="levels">
      <view class="lvl" :class="{ on: li === i }" v-for="(l, i) in levels" :key="l.key" @tap="li = i">
        <text class="lv-ic">{{ l.icon }}</text>
        <text class="lv-n">{{ l.name }}</text>
      </view>
    </view>

    <view class="detail">
      <text class="dt-d">{{ lv.icon }} {{ lv.name }}——{{ lv.d }}</text>
      <view class="works">
        <text class="wk" v-for="(w, i) in lv.works" :key="i">{{ w }}<text v-if="i < lv.works.length - 1" class="wk-arrow"> → </text></text>
      </view>
      <view class="params">
        <view class="pm"><text class="pm-v">{{ (lv.yield*100).toFixed(0) }}%</text><text class="pm-l">出成率</text></view>
        <view class="pm"><text class="pm-v">{{ lv.price }}</text><text class="pm-l">售价 元/斤</text></view>
        <view class="pm"><text class="pm-v">{{ lv.proc }}</text><text class="pm-l">加工 元/斤</text></view>
        <view class="pm"><text class="pm-v" :class="{ good: lv.loss <= 0.08 }">{{ (lv.loss*100).toFixed(0) }}%</text><text class="pm-l">产后损耗</text></view>
      </view>
    </view>

    <!-- 增值对比 -->
    <view class="sec">增值对比（每吨毛菜净收益）</view>
    <view class="cmp">
      <view class="cw">
        <view class="cw-hd"><text class="cw-n">🥬 毛菜直卖</text><text class="cw-v raw">¥{{ netRaw.toLocaleString() }}/吨</text></view>
        <view class="cw-track"><view class="cw-fill raw" :style="{ width: (Math.max(netRaw,0) / maxNet * 100) + '%' }"></view></view>
      </view>
      <view class="cw">
        <view class="cw-hd"><text class="cw-n">{{ lv.icon }} {{ lv.name }}</text><text class="cw-v cur">¥{{ netCur.toLocaleString() }}/吨</text></view>
        <view class="cw-track"><view class="cw-fill cur" :style="{ width: (netCur / maxNet * 100) + '%' }"></view></view>
      </view>
      <view class="cmp-gap">
        初加工后每吨多挣 <text class="gp-v">¥{{ gainPerTon.toLocaleString() }}</text>，一批 {{ TON }} 吨多挣 <text class="gp-v">¥{{ batchGain }} 万</text>
        <text class="gp-d">出成率×好价把毛菜提值，预冷冷藏把损耗从 {{ (raw.loss*100).toFixed(0) }}% 降到 {{ (lv.loss*100).toFixed(0) }}%</text>
      </view>
    </view>

    <!-- 分级好价 -->
    <view class="sec">分级定价 · 好货卖好价</view>
    <view class="grades">
      <view class="gd" v-for="g in grades" :key="g.g">
        <view class="gd-hd"><text class="gd-g" :style="{ color: g.color }">{{ g.g }}</text><text class="gd-pct">{{ g.pct }}%</text><text class="gd-price" :style="{ color: g.color }">{{ g.price }}</text></view>
        <view class="gd-track"><view class="gd-fill" :style="{ width: g.pct + '%', background: g.color }"></view></view>
        <text class="gd-to">去向：{{ g.to }}</text>
      </view>
      <text class="gd-note">💡 分级不是把好菜挑出来，而是让每一档都卖到它该值的价——精品进央厨、次品进深加工，一斤都不浪费。品质越稳，精品率越高，收益越高。</text>
    </view>

    <!-- 中央厨房原料链 -->
    <view class="sec">中央厨房原料链（净菜直配）</view>
    <view class="chain">
      <view class="ch" v-for="(c, i) in chain" :key="i">
        <view class="ch-ic">{{ c.icon }}</view>
        <view class="ch-i"><text class="ch-t">{{ c.t }}</text><text class="ch-d">{{ c.d }}</text></view>
        <view v-if="i < chain.length - 1" class="ch-line"></view>
      </view>
    </view>
    <view class="bom-lk" @tap="toBom">
      <text class="bl-ic">🧮</text>
      <view class="bl-i"><text class="bl-t">接中央厨房菜谱 BOM 测算</text><text class="bl-d">央厨按菜谱算原料 → 反向定初加工净菜量，以销定产</text></view>
      <text class="bl-go">进入 ›</text>
    </view>

    <!-- 关联 -->
    <view class="links">
      <view class="lk" @tap="nav('/pages/logistics/dispatch')"><text class="lk-ic">🧊</text><view class="lk-i"><text class="lk-t">净菜冷链直配</text><text class="lk-d">气调保鲜、当日达央厨/门店，全程温控</text></view><text class="lk-go">›</text></view>
      <view class="lk" @tap="nav('/pages/agri/contract')"><text class="lk-ic">📑</text><view class="lk-i"><text class="lk-t">订单农业以销定产</text><text class="lk-d">央厨订单反向定产，初加工按需不压货</text></view><text class="lk-go">›</text></view>
      <view class="lk" @tap="nav('/pages/cert/index')"><text class="lk-ic">🏅</text><view class="lk-i"><text class="lk-t">加工赋码进溯源认证</text><text class="lk-d">初加工环节记录上链，绿色/地标认证不断链</text></view><text class="lk-go">›</text></view>
    </view>

    <view class="tip">🔗 产地初加工是"最初一公里"的增值与减损：把分拣分级、清洗切配、预冷冷藏就地做掉，毛菜不再原字号贱卖、损耗大降，净菜直配中央厨房砍掉批发倒手。分级让好货卖好价、次品不浪费，倒逼农户把品质做稳——这正是"同品类、不同品质、不同收益"的落点。</view>

    <view class="bar"><view class="bar-btn" @tap="order">按「{{ lv.name }}」下单 · 一批 {{ TON }} 吨多挣 ¥{{ batchGain }} 万</view></view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.sg-page { padding-bottom: 140rpx; }
.hero { background: linear-gradient(160deg, #d99a2b, #b5791b); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.95; margin-top: 8rpx; display: block; line-height: 1.6; }
.sec { font-size: 28rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.levels { display: flex; gap: 12rpx; padding: 0 24rpx; }
.lvl { flex: 1; display: flex; flex-direction: column; align-items: center; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 16rpx 6rpx; border: 3rpx solid transparent; }
.lvl.on { border-color: #d99a2b; background: #fdf6e8; }
.lv-ic { font-size: 38rpx; }
.lv-n { font-size: 19rpx; font-weight: 700; margin-top: 6rpx; text-align: center; line-height: 1.3; }
.detail { margin: 16rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx 22rpx; }
.dt-d { font-size: 23rpx; font-weight: 600; display: block; }
.works { display: flex; flex-wrap: wrap; margin: 12rpx 0; }
.wk { font-size: 20rpx; color: $sg-primary; }
.wk-arrow { color: $sg-text-3; }
.params { display: flex; margin-top: 6rpx; padding-top: 14rpx; border-top: 2rpx solid $sg-bg; }
.pm { flex: 1; display: flex; flex-direction: column; align-items: center; }
.pm-v { font-size: 30rpx; font-weight: 800; color: #b5791b; }
.pm-v.good { color: #16884c; }
.pm-l { font-size: 18rpx; color: $sg-text-3; margin-top: 3rpx; }
.cmp { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx 22rpx; }
.cw { margin-bottom: 16rpx; }
.cw-hd { display: flex; align-items: baseline; justify-content: space-between; }
.cw-n { font-size: 24rpx; font-weight: 700; flex: 1; }
.cw-v { font-size: 27rpx; font-weight: 800; flex: none; margin-left: 10rpx; }
.cw-v.raw { color: $sg-text-3; }
.cw-v.cur { color: #d99a2b; }
.cw-track { height: 22rpx; background: $sg-bg; border-radius: 999rpx; overflow: hidden; margin-top: 8rpx; }
.cw-fill { height: 100%; border-radius: 999rpx; }
.cw-fill.raw { background: #c2c7cf; }
.cw-fill.cur { background: linear-gradient(90deg, #e6b451, #d99a2b); }
.cmp-gap { margin-top: 4rpx; padding: 16rpx; background: #fdf6e8; border-radius: $sg-radius; font-size: 23rpx; font-weight: 600; text-align: center; line-height: 1.6; }
.gp-v { color: #d64541; font-size: 30rpx; font-weight: 800; }
.gp-d { display: block; font-size: 18rpx; color: $sg-text-3; font-weight: 400; margin-top: 6rpx; }
.grades { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 22rpx; }
.gd { margin-bottom: 14rpx; }
.gd-hd { display: flex; align-items: baseline; }
.gd-g { font-size: 24rpx; font-weight: 800; flex: none; }
.gd-pct { font-size: 20rpx; color: $sg-text-3; margin-left: 12rpx; flex: 1; }
.gd-price { font-size: 24rpx; font-weight: 700; flex: none; }
.gd-track { height: 16rpx; background: $sg-bg; border-radius: 999rpx; overflow: hidden; margin: 6rpx 0 4rpx; }
.gd-fill { height: 100%; border-radius: 999rpx; }
.gd-to { font-size: 19rpx; color: $sg-text-3; }
.gd-note { display: block; margin-top: 6rpx; font-size: 20rpx; color: $sg-text-2; background: #fdf6e8; border: 2rpx solid #f0dcae; border-radius: $sg-radius; padding: 14rpx 16rpx; line-height: 1.5; }
.chain { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 22rpx; }
.ch { display: flex; align-items: flex-start; position: relative; padding-bottom: 6rpx; }
.ch-ic { width: 56rpx; height: 56rpx; flex: none; border-radius: 50%; background: #fdf6e8; display: flex; align-items: center; justify-content: center; font-size: 28rpx; margin-right: 16rpx; z-index: 2; }
.ch-i { flex: 1; display: flex; flex-direction: column; padding-bottom: 18rpx; }
.ch-t { font-size: 24rpx; font-weight: 700; }
.ch-d { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; line-height: 1.4; }
.ch-line { position: absolute; left: 27rpx; top: 56rpx; bottom: 0; width: 3rpx; background: #f0dcae; z-index: 1; }
.bom-lk { display: flex; align-items: center; margin: 12rpx 24rpx 0; padding: 20rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #fdf6e8, #fff); border: 2rpx solid #f0dcae; box-shadow: $sg-shadow; }
.bl-ic { font-size: 40rpx; margin-right: 14rpx; }
.bl-i { flex: 1; display: flex; flex-direction: column; }
.bl-t { font-size: 25rpx; font-weight: 700; color: #b5791b; }
.bl-d { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; line-height: 1.4; }
.bl-go { font-size: 22rpx; color: #b5791b; }
.links { margin: 20rpx 24rpx 0; }
.lk { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; margin-bottom: 12rpx; }
.lk-ic { width: 64rpx; height: 64rpx; border-radius: 18rpx; background: #fdf6e8; display: flex; align-items: center; justify-content: center; font-size: 34rpx; margin-right: 14rpx; flex: none; }
.lk-i { flex: 1; display: flex; flex-direction: column; }
.lk-t { font-size: 25rpx; font-weight: 700; }
.lk-d { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; }
.lk-go { font-size: 30rpx; color: $sg-text-3; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom)); box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.06); }
.bar-btn { text-align: center; padding: 22rpx 0; border-radius: 999rpx; font-size: 25rpx; font-weight: 700; background: linear-gradient(135deg, #d99a2b, #b5791b); color: #fff; }
</style>
