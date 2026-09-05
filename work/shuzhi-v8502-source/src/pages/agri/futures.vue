<script setup lang="ts">
import { ref, computed } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

// —— 套期保值盈亏测算（可拉动价格）——
const H = { spot: 800, hedge: 600, base: 4.5, jin: 2000 }; // 现货800吨/对冲600吨/基准价/斤每吨
const priceMoves = [
  { key: "down", name: "价格跌", delta: -0.5 },
  { key: "flat", name: "价格平", delta: 0 },
  { key: "up", name: "价格涨", delta: 0.5 },
];
const hi = ref(0);
const nowPrice = computed(() => H.base + priceMoves[hi.value].delta);
const wanH = (n: number) => (Math.abs(n) / 10000).toFixed(0);
// 现货盈亏（相对基准价）：跌则亏
const spotPnl = computed(() => (nowPrice.value - H.base) * H.spot * H.jin);
// 期货空单盈亏：价跌则赚，正好对冲现货
const futPnl = computed(() => (H.base - nowPrice.value) * H.hedge * H.jin);
const netPnl = computed(() => spotPnl.value + futPnl.value);
const barW = (v: number) => Math.min(100, Math.abs(v) / (H.base * H.spot * H.jin * 0.12) * 100);

// 撮合大厅：采购年单意向 × 供货年单意向
const buyIntents = [
  { who: "沪上团餐中央厨房", cat: "脐橙", qty: "年 600 吨", price: "目标 ≤ 4.5 元/斤", term: "月结" },
  { who: "京客隆商贸", cat: "五常大米", qty: "年 1200 吨", price: "目标 ≤ 7.0 元/斤", term: "账期 45 天" },
];
const sellIntents = [
  { who: "赣南脐橙合作社", cat: "脐橙", qty: "年产 800 吨", price: "保底 4.2 元/斤" },
  { who: "五常金穗米业", cat: "五常大米", qty: "年产 1500 吨", price: "保底 6.8 元/斤" },
];

const matched = ref(false);
function match() {
  if (productionBuild) return uni.showModal({ title: "需要期货机构接入", content: "正式环境的年单撮合、保证金和套期保值必须由已接入的持牌机构根据真实订单执行，当前未执行撮合或建仓。", showCancel: false });
  uni.showLoading({ title: "智能撮合中…", mask: true });
  setTimeout(() => { uni.hideLoading(); matched.value = true; uni.showToast({ title: "撮合成功", icon: "success" }); }, 1000);
}

// 期货年单（撮合达成）
const order = {
  no: "FA-2026-0912", cat: "赣南脐橙", buyer: "沪上团餐中央厨房", seller: "赣南脐橙合作社",
  annualQty: "600 吨", avgPrice: "4.35 元/斤", margin: "78 万（年单额 15%）",
  hedge: "苹果期货 AP 套保", progress: 33,
};

// 定价机制
const pricing = [
  { t: "保底价", d: "≥ 4.2 元/斤，价格再跌兜底收购", color: "#16884c" },
  { t: "基差点价", d: "挂钩期货价（苹果 AP）+ 约定基差，双方择时点价", color: "#2b6cb0" },
  { t: "价格区间", d: "设 4.2~4.8 元/斤 上下限，超出部分共担", color: "#d99a2b" },
];

// 分批交割计划
const delivery = [
  { m: "Q4 首交", qty: "180 吨", status: "已交割" },
  { m: "Q1 二交", qty: "180 吨", status: "交割中" },
  { m: "Q2 三交", qty: "140 吨", status: "待交割" },
  { m: "Q3 尾交", qty: "100 吨", status: "待交割" },
];
const dColor: Record<string, string> = { 已交割: "#16884c", 交割中: "#d99a2b", 待交割: "#9aa0aa" };

// 风险对冲 / 规避
const risks = [
  { icon: "📊", t: "套期保值", d: "平台/合作社在期货交易所反向操作，对冲现货价格波动" },
  { icon: "💰", t: "保证金制度", d: "买卖双方各缴年单额 15% 保证金，违约优先扣付守约方" },
  { icon: "🛡️", t: "价格/收入保险", d: "政策性农险，价格跌破保底自动触发理赔" },
  { icon: "🌦️", t: "天气指数保险", d: "干旱/霜冻/台风达阈值即赔，减产不减收" },
  { icon: "📦", t: "分批交割 + 逐月结算", d: "分散集中交割与一次性违约风险" },
  { icon: "⚖️", t: "违约处置", d: "保证金扣付 + 履约险补偿 + 信用扣分/黑名单" },
];

// 撮合到清算全流程
const flow = [
  { t: "发布年单意向", d: "买方报年度采购量/目标价，卖方报年产量/保底价" },
  { t: "平台智能撮合", d: "按品类/量/价/物流半径匹配，生成撮合方案" },
  { t: "双方确认条款", d: "确认量、价格机制、交割节奏、违约责任" },
  { t: "缴纳保证金", d: "各缴年单额 15%，进入监管账户" },
  { t: "数字化签年单", d: "CA签约并存证，变更须经双方授权并保留版本" },
  { t: "套期保值建仓", d: "在期货交易所对冲价格风险" },
  { t: "分批交割", d: "按季/月交货，质检溯源上链" },
  { t: "逐月结算 + 到期清算", d: "点价结算货款，退还保证金，超额分成" },
];
const cur = ref(0);
const running = ref(false);
function runFlow() { running.value = true; cur.value = 0; const t = setInterval(() => { cur.value++; if (cur.value >= flow.length) clearInterval(t); }, 450); }
</script>

<template>
  <view class="sg-page">
    <view class="hd">
      <text class="hd-t">农产品期货年单</text>
      <text class="hd-s">平台撮合 · 锁量锁价 · 分批交割 · 风险对冲</text>
      <text class="hd-p">订单农业的进阶：把"一单一签"升级为"年度锁定 + 期货化风控"</text>
    </view>

    <!-- 撮合大厅 -->
    <view class="sg-card">
      <view class="sg-between"><text class="ct">🤝 年单撮合大厅</text><text class="demo" @tap="match">▶ 智能撮合</text></view>
      <view class="match">
        <view class="side">
          <text class="side-t buy">采购意向</text>
          <view class="mi" v-for="b in buyIntents" :key="b.who"><text class="mi-w">{{ b.who }}</text><text class="mi-d">{{ b.cat }} · {{ b.qty }}</text><text class="mi-p">{{ b.price }}</text></view>
        </view>
        <text class="match-ic" :class="{ on: matched }">⇄</text>
        <view class="side">
          <text class="side-t sell">供货意向</text>
          <view class="mi" v-for="s in sellIntents" :key="s.who"><text class="mi-w">{{ s.who }}</text><text class="mi-d">{{ s.cat }} · {{ s.qty }}</text><text class="mi-p">{{ s.price }}</text></view>
        </view>
      </view>
      <view v-if="matched" class="match-done">✅ 撮合成功：脐橙年单 600 吨 · 成交均价 4.35 元/斤 · 已生成期货年单</view>
    </view>

    <!-- 期货年单 -->
    <view class="sg-card">
      <view class="sg-between"><text class="ct">📄 期货年单</text><text class="no">{{ order.no }}</text></view>
      <view class="r"><text class="k">品类</text><text class="v">{{ order.cat }}</text></view>
      <view class="r"><text class="k">买 / 卖</text><text class="v">{{ order.buyer }} ⇄ {{ order.seller }}</text></view>
      <view class="r"><text class="k">年度量</text><text class="v">{{ order.annualQty }}</text></view>
      <view class="r"><text class="k">成交均价</text><text class="v sg-price">{{ order.avgPrice }}</text></view>
      <view class="r"><text class="k">保证金</text><text class="v">{{ order.margin }}</text></view>
      <view class="r"><text class="k">对冲方式</text><text class="v">{{ order.hedge }}</text></view>
      <view class="bar"><view class="fill" :style="{ width: order.progress + '%' }"></view></view>
      <text class="pct">年度交割进度 {{ order.progress }}%</text>
    </view>

    <!-- 定价机制 -->
    <view class="sg-card">
      <text class="ct">💹 定价机制</text>
      <view class="pm" v-for="p in pricing" :key="p.t">
        <view class="pm-dot" :style="{ background: p.color }"></view>
        <view class="pm-i"><text class="pm-t">{{ p.t }}</text><text class="pm-d">{{ p.d }}</text></view>
      </view>
    </view>

    <!-- 分批交割 -->
    <view class="sg-card">
      <text class="ct">📦 分批交割计划</text>
      <view class="dv" v-for="d in delivery" :key="d.m">
        <text class="dv-m">{{ d.m }}</text>
        <text class="dv-q">{{ d.qty }}</text>
        <text class="dv-s" :style="{ color: dColor[d.status] }">{{ d.status }}</text>
      </view>
    </view>

    <!-- 套期保值盈亏测算（可交互）-->
    <view class="sg-card hedge-card">
      <text class="ct">🎯 套期保值盈亏测算</text>
      <text class="hg-sub">合作社有现货 {{ H.spot }} 吨（预期 {{ H.base }} 元/斤），怕跌 → 在期货市场（苹果 AP）建 {{ H.hedge }} 吨空单对冲。拉动价格看效果：</text>
      <view class="moves">
        <text class="mv" :class="{ on: hi === i }" v-for="(m, i) in priceMoves" :key="m.key" @tap="hi = i">{{ m.name }}</text>
      </view>
      <text class="now">当前市场价 <text class="now-v">{{ nowPrice.toFixed(1) }}</text> 元/斤</text>

      <view class="pnl">
        <view class="pn-row">
          <text class="pn-l">现货盈亏</text>
          <view class="pn-track"><view class="pn-fill" :class="spotPnl >= 0 ? 'up' : 'dn'" :style="{ width: barW(spotPnl) + '%' }"></view></view>
          <text class="pn-v" :class="spotPnl >= 0 ? 'up' : 'dn'">{{ spotPnl >= 0 ? '+' : '-' }}{{ wanH(spotPnl) }}万</text>
        </view>
        <view class="pn-row">
          <text class="pn-l">期货空单</text>
          <view class="pn-track"><view class="pn-fill" :class="futPnl >= 0 ? 'up' : 'dn'" :style="{ width: barW(futPnl) + '%' }"></view></view>
          <text class="pn-v" :class="futPnl >= 0 ? 'up' : 'dn'">{{ futPnl >= 0 ? '+' : '-' }}{{ wanH(futPnl) }}万</text>
        </view>
      </view>
      <view class="net">
        <view class="net-cmp">
          <view class="nc"><text class="nc-l">🛡️ 套保后净盈亏</text><text class="nc-v hedge">{{ netPnl >= 0 ? '+' : '-' }}{{ wanH(netPnl) }}万</text></view>
          <view class="nc"><text class="nc-l">⚠️ 不对冲（裸奔）</text><text class="nc-v bare">{{ spotPnl >= 0 ? '+' : '-' }}{{ wanH(spotPnl) }}万</text></view>
        </view>
        <text class="net-note">{{ hi === 0 ? '价跌：现货亏但期货赚，把大部分损失对冲掉，收入被锁住' : hi === 2 ? '价涨：现货多赚、期货少赚，让出部分上涨换来"锁定"确定性' : '价平：两边不赚不亏，收入锁定在预期价位' }}</text>
      </view>
    </view>

    <!-- 风险对冲 -->
    <view class="sg-card risk-card">
      <text class="ct">🛡️ 风险对冲与规避</text>
      <view class="risk" v-for="r in risks" :key="r.t">
        <text class="rk-ic">{{ r.icon }}</text>
        <view class="rk-i"><text class="rk-t">{{ r.t }}</text><text class="rk-d">{{ r.d }}</text></view>
      </view>
    </view>

    <!-- 全流程 -->
    <view class="sg-card">
      <view class="sg-between"><text class="ct">🔄 撮合到清算全流程</text><text class="demo" @tap="runFlow">核验流程</text></view>
      <view class="fl" v-for="(f, i) in flow" :key="i" :class="{ on: running && cur > i }">
        <view class="fl-axis"><view class="fl-dot" :class="{ on: running && cur > i }">{{ running && cur > i ? '✓' : i + 1 }}</view><view v-if="i < flow.length - 1" class="fl-line" :class="{ on: running && cur > i + 1 }"></view></view>
        <view class="fl-i"><text class="fl-t">{{ f.t }}</text><text class="fl-d">{{ f.d }}</text></view>
      </view>
    </view>

    <view class="tip">🔒 期货年单为"现货远期履约"合约，非交易所标准期货合约；套期保值在持牌期货公司/交易所进行，平台仅撮合与风控，不代客理财、不碰资金。</view>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, $sg-primary, $sg-primary-deep); padding: 36rpx 28rpx; color: #fff; }
.hd-t { font-size: 34rpx; font-weight: 800; }
.hd-s { font-size: 22rpx; opacity: 0.95; margin-top: 8rpx; display: block; }
.hd-p { font-size: 20rpx; opacity: 0.8; margin-top: 6rpx; display: block; }
.ct { font-size: 28rpx; font-weight: 700; }
.demo { font-size: 24rpx; color: $sg-primary; background: $sg-primary-light; padding: 8rpx 22rpx; border-radius: 999rpx; }

/* 撮合 */
.match { display: flex; align-items: center; margin-top: 16rpx; }
.side { flex: 1; }
.side-t { font-size: 22rpx; font-weight: 700; padding: 4rpx 16rpx; border-radius: 999rpx; }
.side-t.buy { color: #1e5fa8; background: #eef5ff; }
.side-t.sell { color: $sg-primary; background: $sg-primary-light; }
.mi { display: flex; flex-direction: column; padding: 12rpx 0; border-bottom: 2rpx solid $sg-border; }
.mi-w { font-size: 24rpx; font-weight: 600; }
.mi-d { font-size: 20rpx; color: $sg-text-3; }
.mi-p { font-size: 21rpx; color: $sg-red; }
.match-ic { font-size: 44rpx; color: $sg-text-3; margin: 0 12rpx; }
.match-ic.on { color: $sg-primary; }
.match-done { margin-top: 12rpx; font-size: 22rpx; color: $sg-primary; background: $sg-primary-light; padding: 14rpx; border-radius: $sg-radius; }

/* 年单 */
.no { font-size: 24rpx; color: $sg-text-3; }
.r { display: flex; padding: 12rpx 0; border-top: 2rpx solid $sg-border; }
.r:first-of-type { border-top: none; }
.k { width: 150rpx; color: $sg-text-3; font-size: 25rpx; }
.v { flex: 1; font-size: 25rpx; }
.bar { height: 16rpx; background: $sg-border; border-radius: 8rpx; margin: 16rpx 0 8rpx; overflow: hidden; }
.fill { height: 100%; background: linear-gradient(90deg, $sg-primary, $sg-gold); }
.pct { font-size: 21rpx; color: $sg-text-3; }

/* 定价 */
.pm { display: flex; align-items: flex-start; padding: 12rpx 0; border-top: 2rpx solid $sg-border; }
.pm:first-of-type { border-top: none; }
.pm-dot { width: 20rpx; height: 20rpx; border-radius: 50%; margin: 8rpx 16rpx 0 0; flex-shrink: 0; }
.pm-i { flex: 1; display: flex; flex-direction: column; }
.pm-t { font-size: 26rpx; font-weight: 600; }
.pm-d { font-size: 21rpx; color: $sg-text-3; margin-top: 2rpx; }

/* 交割 */
.dv { display: flex; align-items: center; padding: 14rpx 0; border-top: 2rpx solid $sg-border; }
.dv:first-of-type { border-top: none; }
.dv-m { flex: 1.4; font-size: 25rpx; font-weight: 600; }
.dv-q { flex: 1; font-size: 24rpx; color: $sg-text-2; }
.dv-s { flex: 1; text-align: right; font-size: 23rpx; font-weight: 600; }

/* 套期保值测算 */
.hedge-card { background: linear-gradient(135deg, #eef5ff, #fff); border: 2rpx solid #cfe0f5; }
.hg-sub { font-size: 20rpx; color: $sg-text-2; line-height: 1.5; display: block; margin: 8rpx 0 14rpx; }
.moves { display: flex; gap: 12rpx; }
.mv { flex: 1; text-align: center; padding: 14rpx 0; border-radius: 999rpx; background: #fff; box-shadow: $sg-shadow; font-size: 24rpx; font-weight: 700; color: $sg-text-2; }
.mv.on { background: #2b6cb0; color: #fff; }
.now { display: block; text-align: center; font-size: 22rpx; color: $sg-text-3; margin: 14rpx 0; }
.now-v { font-size: 30rpx; font-weight: 800; color: #2b6cb0; }
.pnl { background: #fff; border-radius: $sg-radius; padding: 14rpx 16rpx; }
.pn-row { display: flex; align-items: center; padding: 10rpx 0; }
.pn-l { width: 120rpx; font-size: 22rpx; color: $sg-text-2; flex: none; }
.pn-track { flex: 1; height: 20rpx; background: $sg-bg; border-radius: 999rpx; overflow: hidden; margin: 0 12rpx; }
.pn-fill { height: 100%; border-radius: 999rpx; }
.pn-fill.up { background: linear-gradient(90deg, #2fae6b, #16884c); }
.pn-fill.dn { background: linear-gradient(90deg, #e8756b, #d64541); }
.pn-v { width: 130rpx; text-align: right; font-size: 24rpx; font-weight: 800; flex: none; }
.pn-v.up { color: #16884c; }
.pn-v.dn { color: #d64541; }
.net { margin-top: 14rpx; }
.net-cmp { display: flex; gap: 14rpx; }
.nc { flex: 1; background: #fff; border-radius: $sg-radius; padding: 16rpx; display: flex; flex-direction: column; align-items: center; }
.nc-l { font-size: 20rpx; color: $sg-text-3; }
.nc-v { font-size: 30rpx; font-weight: 800; margin-top: 6rpx; }
.nc-v.hedge { color: #2b6cb0; }
.nc-v.bare { color: #d64541; }
.net-note { display: block; margin-top: 12rpx; font-size: 20rpx; color: $sg-text-2; background: #eef5ff; border-radius: $sg-radius; padding: 14rpx; line-height: 1.5; }

/* 风险 */
.risk-card { background: linear-gradient(135deg, #fff8ec, #fff); border: 2rpx solid #f0e0c0; }
.risk { display: flex; align-items: flex-start; padding: 12rpx 0; border-top: 2rpx solid #f0e6d2; }
.risk:first-of-type { border-top: none; }
.rk-ic { font-size: 38rpx; margin-right: 16rpx; }
.rk-i { flex: 1; display: flex; flex-direction: column; }
.rk-t { font-size: 26rpx; font-weight: 700; }
.rk-d { font-size: 21rpx; color: $sg-text-3; margin-top: 2rpx; }

/* 流程 */
.fl { display: flex; opacity: 0.5; transition: opacity 0.3s; }
.fl.on { opacity: 1; }
.fl-axis { display: flex; flex-direction: column; align-items: center; margin-right: 18rpx; }
.fl-dot { width: 44rpx; height: 44rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; }
.fl-dot.on { background: $sg-primary; }
.fl-line { flex: 1; width: 4rpx; background: $sg-border; min-height: 24rpx; margin: 4rpx 0; }
.fl-line.on { background: $sg-primary; }
.fl-i { flex: 1; display: flex; flex-direction: column; padding-bottom: 22rpx; }
.fl-t { font-size: 25rpx; font-weight: 600; }
.fl-d { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
</style>
