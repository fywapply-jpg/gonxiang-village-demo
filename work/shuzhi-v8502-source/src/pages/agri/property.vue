<script setup lang="ts">
import { ref, computed } from "vue";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const productionBlocked = () => uni.showModal({ title: "需后台产权交易服务", content: "正式环境竞价必须由交易机构和后台留痕，当前未执行本地竞价。", showCancel: false });

// 三类流转标的
const kinds = [
  { key: "land", icon: "🌾", name: "土地经营权", d: "承包权不变，只流转经营权" },
  { key: "asset", icon: "🏭", name: "集体经营性资产", d: "厂房 / 冷库 / 门面，必须进场交易" },
  { key: "equip", icon: "🚜", name: "农业设施装备", d: "农机 / 烘干线 / 大棚 使用权" },
];
const ki = ref(0);

// 在挂标的（按类）
const listings: Record<string, any[]> = {
  land: [
    { t: "江西赣州信丰安西镇范庄村 200 亩连片水田经营权", base: 600, unit: "元/亩·年", term: "流转 5 年", tag: "连片 · 已确权", hot: true },
    { t: "江西赣州信丰安西镇 80 亩果园经营权", base: 900, unit: "元/亩·年", term: "流转 8 年", tag: "赣南脐橙老园" },
  ],
  asset: [
    { t: "江西赣州信丰安西镇范庄村集体冷库 800㎡", base: 8, unit: "万元/年", term: "租赁 3 年", tag: "集体资产 · 进场交易", hot: true },
    { t: "天津东丽华明街道社区临街门面 3 间", base: 12, unit: "万元/年", term: "租赁 5 年", tag: "集体经营性资产" },
  ],
  equip: [
    { t: "联合收割机 + 烘干线", base: 18, unit: "万元/年", term: "使用权 2 年", tag: "农机社会化服务", hot: true },
  ],
};
const list = computed(() => listings[kinds[ki.value].key]);

// 竞价核验（针对第一宗热门标的）
const bidders = ["丰穗家庭农场", "张大户种粮合作社", "绿丰农业公司"];
const bidSteps = [
  { who: "起拍价", price: 600 },
  { who: "丰穗家庭农场", price: 620 },
  { who: "张大户种粮合作社", price: 650 },
  { who: "绿丰农业公司", price: 680 },
  { who: "丰穗家庭农场", price: 700 },
  { who: "张大户种粮合作社", price: 720 },
];
const running = ref(false);
const cur = ref(0);
const done = ref(false);
const bidLog = ref<{ who: string; price: number }[]>([]);
function startBid() {
  if (productionBuild) return productionBlocked();
  running.value = true; done.value = false; cur.value = 0; bidLog.value = [bidSteps[0]];
  const t = setInterval(() => {
    cur.value++;
    bidLog.value.unshift(bidSteps[cur.value]);
    if (cur.value >= bidSteps.length - 1) { clearInterval(t); running.value = false; done.value = true; }
  }, 700);
}
const dealPrice = computed(() => bidSteps[bidSteps.length - 1].price);
const dealPremium = computed(() => dealPrice.value - bidSteps[0].price); // 溢价 120
const ACRES = 200;
const collectiveGain = computed(() => (dealPremium.value * ACRES / 10000).toFixed(1)); // 溢价归集体/农户（万元）

// 农户三选一：自种 vs 托管 vs 流转（每亩·年）
const options = [
  { key: "self", icon: "🧑‍🌾", n: "自己种", net: 520, d: "自投劳力，收成看天，价格随市场波动", color: "#9aa0aa", extra: "要出劳力" },
  { key: "trust", icon: "🚜", n: "土地托管", net: 900, d: "地还是自己的，请服务组织种，自己收粮卖，收益最高", color: "#16884c", extra: "省心增收", best: true },
  { key: "transfer", icon: "🤝", n: "流转出去", net: 720, d: "拿固定租金、旱涝保收，人解放出来可外出务工再挣一份", color: "#2b6cb0", extra: "旱涝保收" },
];
const maxNet = Math.max(...options.map((o) => o.net));

// 阳光交易五步
const flow = [
  { t: "申请挂牌", d: "出让方提交权属证明，土地经营权须已确权、集体资产须成员大会表决" },
  { t: "资格审核 + 价格评估", d: "交易中心审核权属无争议，参照流转指导价评估底价" },
  { t: "公开竞价", d: "公示期满，多主体线上竞价 / 拍卖，价高者得、全程留痕" },
  { t: "网签鉴证", d: "生成流转合同、交易中心鉴证，电子签章上链存证" },
  { t: "资金监管交割", d: "价款进监管账户，交割完成后拨付，集体收益按份分配" },
];

// 集体资产防流失
const guard = [
  "🔒 集体经营性资产必须进场公开交易，禁止私下低价发包",
  "🗳️ 重大流转经成员（代表）大会表决，结果公示到户",
  "📊 交易价、受让方、资金流向全程阳光公示、上链可查",
  "⚖️ 低于评估底价流拍，杜绝贱卖、防止集体资产流失",
];

function nav(url: string) { uni.navigateTo({ url }); }
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">📜 农村产权流转交易市场</text>
      <text class="hs">让沉睡的地和资产活起来。土地经营权、集体资产、农机设施——公开挂牌、竞价交易、网签鉴证、资金监管，阳光交易不流失。</text>
    </view>

    <!-- 三类标的 -->
    <view class="sec">流转什么</view>
    <view class="kinds">
      <view class="kd" :class="{ on: ki === i }" v-for="(k, i) in kinds" :key="k.key" @tap="ki = i">
        <text class="kd-ic">{{ k.icon }}</text>
        <text class="kd-n">{{ k.name }}</text>
        <text class="kd-d">{{ k.d }}</text>
      </view>
    </view>

    <!-- 在挂标的 -->
    <view class="listings">
      <view class="ls" v-for="(l, i) in list" :key="i">
        <view class="ls-hd">
          <text class="ls-t">{{ l.t }}</text>
          <text v-if="l.hot" class="ls-hot">🔥 竞价中</text>
        </view>
        <view class="ls-m">
          <text class="ls-tag">{{ l.tag }}</text>
          <text class="ls-term">{{ l.term }}</text>
        </view>
        <view class="ls-price"><text class="ls-pl">起拍</text><text class="ls-pv">{{ l.base }}</text><text class="ls-pu">{{ l.unit }}</text></view>
      </view>
    </view>

    <!-- 竞价核验 -->
    <view class="sec-row">
      <text class="sec">公开竞价核验</text>
      <text class="bid-btn" @tap="startBid">{{ done ? '↻ 重新竞价' : '开始竞价' }}</text>
    </view>
    <view class="bidcard">
      <text class="bc-t">江西赣州信丰安西镇范庄村 200 亩连片水田经营权 · 起拍 600 元/亩·年</text>
      <view v-if="!bidLog.length" class="bc-empty">点击“开始竞价”，查看 3 家规模经营主体举牌加价</view>
      <view v-else class="bc-log">
        <view class="bl-row" v-for="(b, i) in bidLog" :key="b.price" :class="{ top: i === 0 }">
          <text class="bl-who">{{ b.who }}</text>
          <text class="bl-price">{{ b.price }} 元/亩·年</text>
        </view>
      </view>
      <view v-if="done" class="bc-done">
        ✅ 成交价 {{ dealPrice }} 元/亩·年（溢价 +{{ dealPremium }}）· 张大户种粮合作社摘牌<br>
        溢价 <text class="hl">¥{{ collectiveGain }} 万</text> 归村集体与农户，网签鉴证、资金进监管账户
      </view>
    </view>

    <!-- 农户三选一 -->
    <view class="sec">我的地，怎么用最划算（每亩·年）</view>
    <view class="opts">
      <view class="op" v-for="o in options" :key="o.key" :class="{ best: o.best }">
        <view class="op-hd">
          <text class="op-ic">{{ o.icon }}</text>
          <view class="op-hi"><text class="op-n">{{ o.n }}<text v-if="o.best" class="op-best">收益最高</text></text><text class="op-x">{{ o.extra }}</text></view>
          <text class="op-net" :style="{ color: o.color }">¥{{ o.net }}</text>
        </view>
        <view class="op-track"><view class="op-fill" :style="{ width: (o.net / maxNet * 100) + '%', background: o.color }"></view></view>
        <text class="op-d">{{ o.d }}</text>
      </view>
      <text class="op-note">💡 想省心拿稳定收益 → 流转；想多赚又不下地 → 托管；托管和流转都不耽误外出务工，地不撂荒、人不闲着。</text>
    </view>

    <!-- 阳光交易五步 -->
    <view class="sec">阳光交易五步</view>
    <view class="flow">
      <view class="fl" v-for="(f, i) in flow" :key="i">
        <view class="fl-n">{{ i + 1 }}</view>
        <view class="fl-i"><text class="fl-t">{{ f.t }}</text><text class="fl-d">{{ f.d }}</text></view>
      </view>
    </view>

    <!-- 集体资产防流失 -->
    <view class="sec">集体资产防流失</view>
    <view class="guard">
      <text class="gd" v-for="(g, i) in guard" :key="i">{{ g }}</text>
    </view>

    <!-- 关联 -->
    <view class="links">
      <view class="lk" @tap="nav('/pages/finance/product?id=F6')"><text class="lk-ic">💰</text><view class="lk-i"><text class="lk-t">经营权抵押融资</text><text class="lk-d">流转来的经营权可确权抵押，撬动规模经营资金</text></view><text class="lk-go">›</text></view>
      <view class="lk" @tap="nav('/pages/agri/trust')"><text class="lk-ic">🚜</text><view class="lk-i"><text class="lk-t">流转后交给托管服务</text><text class="lk-d">规模经营主体摘牌后，可点单社会化服务代耕代种</text></view><text class="lk-go">›</text></view>
      <view class="lk" @tap="nav('/pages/agri/contract')"><text class="lk-ic">📑</text><view class="lk-i"><text class="lk-t">规模连片接订单农业</text><text class="lk-d">连片流转后以销定产、标准化种植，好卖又好价</text></view><text class="lk-go">›</text></view>
    </view>

    <view class="tip">🔗 农村产权流转交易是盘活农村沉睡资源的关键：土地经营权在承包权不变前提下依法流转，集体经营性资产必须进场公开交易。全程公开竞价、网签鉴证、资金监管、上链留痕——既让农户和集体的资源卖出好价、防止集体资产流失，又让规模经营主体拿到连片土地、干得起大农业。</view>
  </view>
</template>

<style lang="scss" scoped>
.sg-page { padding-bottom: 40rpx; }
.hero { background: linear-gradient(160deg, #2b6cb0, #1e4e8c); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.95; margin-top: 8rpx; display: block; line-height: 1.6; }
.sec { font-size: 28rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 24rpx; }
.bid-btn { font-size: 22rpx; color: #fff; background: #2b6cb0; padding: 8rpx 20rpx; border-radius: 999rpx; font-weight: 700; }
.kinds { display: flex; gap: 12rpx; padding: 0 24rpx; }
.kd { flex: 1; display: flex; flex-direction: column; align-items: center; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 18rpx 8rpx; border: 3rpx solid transparent; }
.kd.on { border-color: #2b6cb0; background: #eef5ff; }
.kd-ic { font-size: 40rpx; }
.kd-n { font-size: 22rpx; font-weight: 700; margin-top: 6rpx; }
.kd-d { font-size: 17rpx; color: $sg-text-3; margin-top: 3rpx; text-align: center; line-height: 1.3; }
.listings { padding: 16rpx 24rpx 0; }
.ls { background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; margin-bottom: 12rpx; }
.ls-hd { display: flex; align-items: center; justify-content: space-between; }
.ls-t { font-size: 26rpx; font-weight: 700; flex: 1; }
.ls-hot { font-size: 19rpx; color: #d64541; background: #fdeceb; padding: 3rpx 12rpx; border-radius: 999rpx; flex: none; margin-left: 8rpx; }
.ls-m { display: flex; gap: 10rpx; margin: 10rpx 0; }
.ls-tag { font-size: 19rpx; color: #2b6cb0; background: #eef5ff; padding: 3rpx 12rpx; border-radius: 6rpx; }
.ls-term { font-size: 19rpx; color: $sg-text-3; background: $sg-bg; padding: 3rpx 12rpx; border-radius: 6rpx; }
.ls-price { display: flex; align-items: baseline; }
.ls-pl { font-size: 19rpx; color: $sg-text-3; margin-right: 8rpx; }
.ls-pv { font-size: 32rpx; font-weight: 800; color: #d64541; }
.ls-pu { font-size: 18rpx; color: $sg-text-3; margin-left: 3rpx; }
.bidcard { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx 22rpx; }
.bc-t { font-size: 22rpx; font-weight: 600; display: block; margin-bottom: 12rpx; }
.bc-empty { font-size: 21rpx; color: $sg-text-3; text-align: center; padding: 24rpx 0; }
.bc-log { display: flex; flex-direction: column; }
.bl-row { display: flex; align-items: center; justify-content: space-between; padding: 12rpx 14rpx; border-radius: $sg-radius; margin-bottom: 6rpx; background: $sg-bg; }
.bl-row.top { background: #eef5ff; border: 2rpx solid #cfe0f5; }
.bl-who { font-size: 22rpx; font-weight: 600; }
.bl-price { font-size: 24rpx; font-weight: 800; color: #2b6cb0; }
.bc-done { margin-top: 10rpx; padding: 16rpx; background: $sg-primary-light; border-radius: $sg-radius; font-size: 21rpx; color: $sg-primary-deep; line-height: 1.7; }
.bc-done .hl { color: #d64541; font-weight: 800; font-size: 26rpx; }
.opts { margin: 0 24rpx; }
.op { background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 20rpx; margin-bottom: 12rpx; border: 3rpx solid transparent; }
.op.best { border-color: #16884c; }
.op-hd { display: flex; align-items: center; }
.op-ic { font-size: 40rpx; margin-right: 14rpx; }
.op-hi { flex: 1; display: flex; flex-direction: column; }
.op-n { font-size: 26rpx; font-weight: 800; }
.op-best { font-size: 17rpx; color: #fff; background: #16884c; padding: 1rpx 10rpx; border-radius: 999rpx; margin-left: 8rpx; font-weight: 700; }
.op-x { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; }
.op-net { font-size: 32rpx; font-weight: 800; flex: none; }
.op-track { height: 16rpx; background: $sg-bg; border-radius: 999rpx; overflow: hidden; margin: 10rpx 0 8rpx; }
.op-fill { height: 100%; border-radius: 999rpx; }
.op-d { font-size: 19rpx; color: $sg-text-2; line-height: 1.5; }
.op-note { display: block; margin-top: 4rpx; font-size: 20rpx; color: $sg-text-2; background: #eef5ff; border: 2rpx solid #cfe0f5; border-radius: $sg-radius; padding: 14rpx 16rpx; line-height: 1.5; }
.flow { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 22rpx; }
.fl { display: flex; align-items: flex-start; padding: 12rpx 0; border-top: 2rpx solid $sg-bg; }
.fl:first-child { border-top: none; }
.fl-n { width: 40rpx; height: 40rpx; flex: none; border-radius: 50%; background: #2b6cb0; color: #fff; font-size: 22rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-right: 14rpx; }
.fl-i { flex: 1; display: flex; flex-direction: column; }
.fl-t { font-size: 24rpx; font-weight: 600; }
.fl-d { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; line-height: 1.4; }
.guard { margin: 0 24rpx; }
.gd { display: block; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 16rpx 18rpx; margin-bottom: 10rpx; font-size: 22rpx; color: $sg-text-2; line-height: 1.4; }
.links { margin: 20rpx 24rpx 0; }
.lk { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; margin-bottom: 12rpx; }
.lk-ic { width: 64rpx; height: 64rpx; border-radius: 18rpx; background: #eef5ff; display: flex; align-items: center; justify-content: center; font-size: 34rpx; margin-right: 14rpx; flex: none; }
.lk-i { flex: 1; display: flex; flex-direction: column; }
.lk-t { font-size: 25rpx; font-weight: 700; }
.lk-d { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; }
.lk-go { font-size: 30rpx; color: $sg-text-3; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
</style>
