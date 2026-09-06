<script setup lang="ts">
import { ref, computed } from "vue";
import { mainBankOf } from "@/mock/mainbank";
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const bank = mainBankOf("粮食银行");

// 我的存粮（电子粮票）—— 多品类，一粮多用
const deposits = ref([
  { id: "GB2026-0416-0087", cat: "小麦", icon: "🌾", grade: "国标二等", qty: 42.6, unit: "吨", warehouse: "辛集中心粮库", loc: "河北·辛集", price: 2820, in: "2026-04-16", status: "在库", locked: false, lockPrice: 0 },
  { id: "GB2026-0331-0142", cat: "玉米", icon: "🌽", grade: "国标一等", qty: 68.0, unit: "吨", warehouse: "冀中南联营监管仓", loc: "河北·石家庄", price: 2460, in: "2026-03-31", status: "在库", locked: true, lockPrice: 2510 },
]);
const cur = ref(0);
const d = computed(() => deposits.value[cur.value]);
const totalValue = computed(() => deposits.value.reduce((s, x) => s + x.qty * x.price, 0));
const loanable = computed(() => Math.round(d.value.qty * d.value.price * 0.7));
const money = (n: number) => (n >= 10000 ? (n / 10000).toFixed(1) + " 万" : n.toLocaleString());

function pick(i: number) { cur.value = i; }

// 六大灵活操作
const ops = [
  { key: "lock", icon: "🔒", n: "锁价保值", d: "锁定今日市价，粮价下跌不亏" },
  { key: "loan", icon: "💰", n: "抵押贷款", d: "凭证质押，按市值 70% 放款" },
  { key: "consign", icon: "🤝", n: "委托寄卖", d: "平台择机代销，到价即出手" },
  { key: "sell", icon: "🏪", n: "自行销售", d: "上架供货大厅，自主定价" },
  { key: "pickup", icon: "📦", n: "异地提货", d: "全国联仓，就近仓库提货" },
  { key: "renew", icon: "🌾", n: "续存加仓", d: "继续存粮，凭证累加" },
];

function doOp(key: string) {
  if (productionBuild && ["lock", "consign", "pickup"].includes(key)) return uni.showModal({ title: "需要仓储/银行服务", content: "正式环境的锁价、寄卖和联仓操作必须由仓储及持牌机构返回受理状态，当前未执行本地操作。", showCancel: false });
  const g = d.value;
  if (key === "lock") {
    if (g.locked) return uni.showModal({ title: "已锁价", showCancel: false, confirmText: "知道了",
      content: `本笔${g.cat}已按 ¥${g.lockPrice}/吨 锁价，90 天内若市价低于此价，按锁定价结算。` });
    return uni.showModal({ title: "锁价服务", confirmText: "确认锁价",
      content: `${g.cat} ${g.qty}${g.unit} · 今日市价 ¥${g.price}/吨\n锁定后 90 天内：市价下跌按锁定价结算，上涨可解锁按市价卖。\n锁价服务费约 12 元/吨。`,
      success: (r) => { if (r.confirm) { g.locked = true; g.lockPrice = g.price; uni.showToast({ title: "已锁价保值", icon: "success" }); } } });
  }
  if (key === "loan") {
    return uni.showModal({ title: "存粮抵押贷款", confirmText: "去申请",
      content: `以「${g.cat} ${g.qty}${g.unit}」电子粮票质押\n市值 ¥${money(g.qty * g.price)} · 可贷额度 ¥${money(loanable.value)}（市值 70%）\n参考年化 3.85% · 主办行行内放款，粮票冻结不影响所有权。`,
      success: (r) => { if (r.confirm) uni.navigateTo({ url: "/pages/finance/apply?from=grainbank" }); } });
  }
  if (key === "consign") {
    return uni.showModal({ title: "委托寄卖", confirmText: "设为寄卖",
      content: `设定心理价位（如 ¥${g.price + 80}/吨），平台在市价到达时自动撮合成交，成交收取 0.8% 佣金。未成交随时可撤回、转质押或自提。`,
      success: (r) => { if (r.confirm) { g.status = "寄卖中"; uni.showToast({ title: "已挂寄卖", icon: "success" }); } } });
  }
  if (key === "sell") {
    return uni.showModal({ title: "自行销售", confirmText: "去上架",
      content: `将「${g.cat} ${g.qty}${g.unit}」一键上架到供货大厅，自主定价、自主谈单，成交后凭电子粮票在仓库直接交割/发货。`,
      success: (r) => { if (r.confirm) uni.navigateTo({ url: "/pages/trade/publish?type=supply" }); } });
  }
  if (key === "pickup") {
    return uni.showModal({ title: "异地异仓就近提货", confirmText: "查询联仓",
      content: `全国联营监管仓一网通兑：外出/异地时，就近选任一联仓，凭电子粮票提取等量同品级${g.cat}，无需千里运粮。仓间量价由联营仓储体系按规则轧差，平台不赚差价。`,
      success: (r) => { if (r.confirm) uni.showToast({ title: "已匹配最近联仓：3.2km", icon: "none" }); } });
  }
  if (key === "renew") {
    return uni.showModal({ title: "续存加仓", showCancel: false, confirmText: "知道了",
      content: "新收粮食送至任一联营仓，质检定级后并入你的电子粮票，数量自动累加，存期不限、随时可用。" });
  }
}

// 存粮上链流程
const flow = [
  { t: "送粮到仓", d: "就近选择平台联营监管仓" },
  { t: "质检定级", d: "水分/杂质/容重检测，套国标定级" },
  { t: "过磅入库", d: "电子地磅计重，仓单同步生成" },
  { t: "生成电子粮票", d: "存粮凭证上链，唯一编号防篡改、防重复质押" },
  { t: "凭证到账", d: "随时可锁价 / 质押 / 寄卖 / 销售 / 异地提货" },
];
const step = ref(0);
const running = ref(false);
function runFlow() { running.value = true; step.value = 0; const t = setInterval(() => { step.value++; if (step.value >= flow.length) clearInterval(t); }, 500); }

// 品类银行矩阵：粮食先行，其他品类复制推广
const cats = [
  { icon: "🌾", n: "粮食银行", tag: "运行中", d: "小麦 / 玉米 / 稻谷 / 大豆", on: true },
  { icon: "🐑", n: "羊肉银行", tag: "筹建中", d: "冷链监管仓 · 活体折胴体计价", on: false },
  { icon: "🥔", n: "土豆银行", tag: "规划中", d: "恒温窖储 · 错季销售套保", on: false },
  { icon: "🧄", n: "大蒜银行", tag: "规划中", d: "冷库仓 · 蒜价周期避险", on: false },
];
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🌾 粮食银行</text>
      <text class="hs">存粮托管 · 一粮多用 · 灵活变现</text>
      <view class="kpis">
        <view class="k"><text class="kn">¥{{ money(totalValue) }}</text><text class="kl">我的存粮总值</text></view>
        <view class="k"><text class="kn">¥{{ money(loanable) }}</text><text class="kl">当前可质押</text></view>
        <view class="k"><text class="kn">128</text><text class="kl">联营监管仓</text></view>
      </view>
    </view>

    <view class="intro">
      把自家粮食存进平台约定的监管仓，换一张<text class="em">电子粮票</text>——从此这批粮可<text class="em">锁价、贷款、寄卖、自卖、异地提货</text>，卖不卖、何时卖、怎么用，全听你的。
    </view>

    <!-- 品类切换 -->
    <view class="tabs">
      <view v-for="(x, i) in deposits" :key="x.id" class="tab" :class="{ on: cur === i }" @tap="pick(i)">
        <text class="tb-ic">{{ x.icon }}</text><text class="tb-n">{{ x.cat }}</text>
      </view>
    </view>

    <!-- 电子粮票凭证 -->
    <view class="ticket">
      <view class="tk-top">
        <view class="tk-left">
          <text class="tk-cat">{{ d.icon }} {{ d.cat }} · 电子粮票</text>
          <text class="tk-grade">{{ d.grade }}</text>
        </view>
        <view class="tk-st" :class="{ lock: d.locked, sell: d.status !== '在库' }">
          {{ d.status !== '在库' ? d.status : (d.locked ? '已锁价' : '在库') }}
        </view>
      </view>
      <view class="tk-qty">
        <text class="tk-num">{{ d.qty }}</text><text class="tk-unit">{{ d.unit }}</text>
        <view class="tk-price"><text class="tk-p">¥{{ d.price }}/吨</text><text class="tk-pl">今日市价{{ d.locked ? ' · 已锁 ¥' + d.lockPrice : '' }}</text></view>
      </view>
      <view class="tk-rows">
        <view class="tk-row"><text class="rk">存放仓库</text><text class="rv">{{ d.warehouse }}（{{ d.loc }}）</text></view>
        <view class="tk-row"><text class="rk">入库日期</text><text class="rv">{{ d.in }}</text></view>
        <view class="tk-row"><text class="rk">凭证编号</text><text class="rv mono">{{ d.id }}</text></view>
      </view>
      <view class="tk-chain">🔗 已上链存证 · 唯一编号防伪防重复质押 · 所有权归你</view>
    </view>

    <!-- 六大灵活操作 -->
    <view class="sec">这张粮票能怎么用</view>
    <view class="ops">
      <view class="op" v-for="o in ops" :key="o.key" @tap="doOp(o.key)">
        <text class="op-ic">{{ o.icon }}</text>
        <text class="op-n">{{ o.n }}</text>
        <text class="op-d">{{ o.d }}</text>
      </view>
    </view>

    <!-- 主办银行 -->
    <view class="mainbank">
      <view class="mb-badge">{{ bank.short }}</view>
      <view class="mb-i"><text class="mb-t">质押放款由「{{ bank.name }}」主办行承接</text><text class="mb-s">粮票冻结监管 · 授信/放款/回款/风控行内闭环</text></view>
    </view>

    <!-- 存粮业务流程 -->
    <view class="sec-row"><text class="sec">存粮上链流程</text><text class="demo" @tap="runFlow">核验流程</text></view>
    <view class="sg-card">
      <view class="fl" v-for="(f, i) in flow" :key="i" :class="{ on: running && step > i }">
        <view class="fl-axis"><view class="fl-dot" :class="{ on: running && step > i }">{{ running && step > i ? '✓' : i + 1 }}</view><view v-if="i < flow.length - 1" class="fl-line" :class="{ on: running && step > i + 1 }"></view></view>
        <view class="fl-i"><text class="fl-t">{{ f.t }}</text><text class="fl-d">{{ f.d }}</text></view>
      </view>
      <view v-if="running && step >= flow.length" class="fl-done">✅ 电子粮票已到账：存粮变"活钱"，锁价防跌、质押解急需、寄卖等好价、异地就近提。</view>
    </view>

    <!-- 品类银行矩阵 -->
    <view class="sec">从"粮食银行"到"万物银行"</view>
    <view class="cats">
      <view class="cat" v-for="c in cats" :key="c.n" :class="{ off: !c.on }">
        <text class="ct-ic">{{ c.icon }}</text>
        <view class="ct-i"><text class="ct-n">{{ c.n }}</text><text class="ct-d">{{ c.d }}</text></view>
        <text class="ct-tag" :class="{ on: c.on }">{{ c.tag }}</text>
      </view>
    </view>
    <view class="copy">同一套"监管仓 + 电子凭证 + 灵活变现"模式，可平移复制到羊肉、土豆、大蒜等更多品类，让农户手里的每一样农产品都能"存得下、用得活、卖得好"。</view>

    <view class="tip">🔒 合规说明：「粮食银行」为形象说法，实为<text style="font-weight:700">粮食仓储 + 仓单质押服务</text>，平台<text style="font-weight:700">不吸收存款、不承诺收益、不放贷</text>。仓储由第三方监管仓/银行监管，电子粮票上链防重复质押；质押放款、结算全程跳转持牌金融机构办理，平台不触碰资金、不设资金池。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #2f9e5b, $sg-primary); padding: 40rpx 28rpx 30rpx; color: #fff; }
.ht { font-size: 38rpx; font-weight: 800; }
.hs { font-size: 22rpx; opacity: 0.95; margin-top: 8rpx; display: block; }
.kpis { display: flex; margin-top: 26rpx; }
.k { flex: 1; text-align: center; }
.kn { font-size: 34rpx; font-weight: 800; display: block; }
.kl { font-size: 20rpx; opacity: 0.9; }
.intro { margin: 24rpx; padding: 20rpx; background: #fff; border-left: 8rpx solid $sg-primary; border-radius: $sg-radius; font-size: 24rpx; color: $sg-text-2; line-height: 1.7; }
.intro .em { color: $sg-primary; font-weight: 700; }
.tabs { display: flex; gap: 16rpx; padding: 0 24rpx; }
.tab { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8rpx; background: #fff; border-radius: $sg-radius; padding: 16rpx 0; box-shadow: $sg-shadow; border: 3rpx solid transparent; }
.tab.on { border-color: $sg-primary; }
.tb-ic { font-size: 30rpx; }
.tb-n { font-size: 26rpx; font-weight: 700; }
.ticket { margin: 16rpx 24rpx 0; padding: 26rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #f2fbf5, #fff); border: 2rpx dashed #a9d9bd; box-shadow: $sg-shadow; }
.tk-top { display: flex; align-items: center; justify-content: space-between; }
.tk-left { display: flex; flex-direction: column; }
.tk-cat { font-size: 28rpx; font-weight: 800; }
.tk-grade { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.tk-st { font-size: 22rpx; font-weight: 700; color: $sg-primary; background: rgba(47,158,91,0.12); padding: 6rpx 18rpx; border-radius: 999rpx; }
.tk-st.lock { color: #c8871f; background: rgba(217,154,43,0.14); }
.tk-st.sell { color: #2b6cb0; background: rgba(43,108,176,0.12); }
.tk-qty { display: flex; align-items: baseline; margin: 20rpx 0 16rpx; }
.tk-num { font-size: 66rpx; font-weight: 800; color: $sg-primary; line-height: 1; }
.tk-unit { font-size: 26rpx; color: $sg-text-2; margin-left: 6rpx; }
.tk-price { margin-left: auto; text-align: right; }
.tk-p { font-size: 30rpx; font-weight: 700; color: $sg-red; display: block; }
.tk-pl { font-size: 19rpx; color: $sg-text-3; }
.tk-rows { border-top: 2rpx dashed #cde9d8; padding-top: 14rpx; }
.tk-row { display: flex; justify-content: space-between; padding: 6rpx 0; }
.rk { font-size: 22rpx; color: $sg-text-3; }
.rv { font-size: 22rpx; color: $sg-text-2; }
.rv.mono { font-family: Menlo, Consolas, monospace; font-size: 20rpx; }
.tk-chain { margin-top: 12rpx; font-size: 20rpx; color: $sg-primary; background: rgba(47,158,91,0.08); padding: 12rpx 16rpx; border-radius: $sg-radius; }
.sec { font-size: 30rpx; font-weight: 700; padding: 26rpx 28rpx 12rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 24rpx; }
.demo { font-size: 24rpx; color: $sg-primary; background: rgba(47,158,91,0.1); padding: 8rpx 22rpx; border-radius: 999rpx; }
.ops { display: flex; flex-wrap: wrap; gap: 16rpx; padding: 0 24rpx; }
.op { width: calc((100% - 32rpx) / 3); box-sizing: border-box; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx 12rpx; display: flex; flex-direction: column; align-items: center; }
.op-ic { font-size: 42rpx; }
.op-n { font-size: 25rpx; font-weight: 700; margin-top: 8rpx; }
.op-d { font-size: 18rpx; color: $sg-text-3; text-align: center; margin-top: 6rpx; line-height: 1.35; }
.mainbank { display: flex; align-items: center; margin: 20rpx 24rpx 0; padding: 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #fff6e6, #fff); border: 2rpx solid #f0dcae; box-shadow: $sg-shadow; }
.mb-badge { width: 68rpx; height: 68rpx; border-radius: 18rpx; background: linear-gradient(135deg, #d99a2b, #c8871f); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 800; margin-right: 16rpx; }
.mb-i { flex: 1; display: flex; flex-direction: column; }
.mb-t { font-size: 25rpx; font-weight: 700; }
.mb-s { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.fl { display: flex; opacity: 0.5; transition: opacity 0.3s; }
.fl.on { opacity: 1; }
.fl-axis { display: flex; flex-direction: column; align-items: center; margin-right: 20rpx; }
.fl-dot { width: 46rpx; height: 46rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; }
.fl-dot.on { background: $sg-primary; }
.fl-line { flex: 1; width: 4rpx; background: $sg-border; min-height: 26rpx; margin: 4rpx 0; }
.fl-line.on { background: $sg-primary; }
.fl-i { flex: 1; display: flex; flex-direction: column; padding-bottom: 24rpx; }
.fl-t { font-size: 26rpx; font-weight: 600; }
.fl-d { font-size: 21rpx; color: $sg-text-3; margin-top: 2rpx; }
.fl-done { font-size: 23rpx; color: $sg-primary; background: rgba(47,158,91,0.08); padding: 16rpx; border-radius: $sg-radius; line-height: 1.6; }
.cats { padding: 0 24rpx; }
.cat { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin-bottom: 14rpx; padding: 22rpx; }
.cat.off { opacity: 0.72; }
.ct-ic { font-size: 44rpx; margin-right: 18rpx; }
.ct-i { flex: 1; display: flex; flex-direction: column; }
.ct-n { font-size: 28rpx; font-weight: 700; }
.ct-d { font-size: 21rpx; color: $sg-text-3; margin-top: 4rpx; }
.ct-tag { font-size: 21rpx; color: $sg-text-3; background: $sg-bg; padding: 6rpx 18rpx; border-radius: 999rpx; }
.ct-tag.on { color: #fff; background: $sg-primary; }
.copy { margin: 16rpx 24rpx 0; font-size: 22rpx; color: $sg-text-2; line-height: 1.7; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
</style>
