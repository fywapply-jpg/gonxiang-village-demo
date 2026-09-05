<script setup lang="ts">
import { ref, computed } from "vue";
import { inputCats, groupBuy, directSupply, inputsCredit, deliverFlow } from "@/mock/agriinputs";

const joined = ref(groupBuy.joined);
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
// 当前档位（按已拼数量落在哪个阶梯）
const curTier = computed(() => {
  let t = groupBuy.tiers[0];
  for (const x of groupBuy.tiers) if (joined.value >= x.min) t = x;
  return t;
});
const nextTier = computed(() => groupBuy.tiers.find((x) => x.min > joined.value) || null);
const toNext = computed(() => (nextTier.value ? nextTier.value.min - joined.value : 0));
const progress = computed(() => Math.min(100, Math.round(joined.value / groupBuy.target * 100)));
const saved = computed(() => groupBuy.market - curTier.value.price);
const money = (n: number) => n.toLocaleString();

function join() {
  if (productionBuild) return uni.showModal({ title: "需要后台团采服务", content: "正式环境的农资批量采购必须使用后台审核 SKU、实时库存、合同和受托支付结果，当前未创建本地拼团。", showCancel: false });
  uni.showModal({
    title: "参与集采拼团", confirmText: "参团 20 袋",
    content: `${groupBuy.name}\n当前拼团价 ¥${curTier.value.price}/袋（市场价 ¥${groupBuy.market}，省 ¥${saved.value}）\n再拼 ${toNext.value} 袋进入下一档更低价。`,
    success: (r) => { if (r.confirm) { joined.value += 20; uni.showToast({ title: "参团成功 +20 袋", icon: "success" }); } },
  });
}
function credit() { uni.navigateTo({ url: "/pages/finance/apply?from=agriinputs" }); }
function mall() { uni.navigateTo({ url: "/pages/agri/index" }); }
function qualify() { uni.navigateTo({ url: "/pages/agri/qualification" }); }
function machineryMerchant() { uni.navigateTo({ url: "/pages/agri/machinery-merchant" }); }
function trace() { uni.switchTab({ url: "/pages/trace/scan" }); }
const usedPct = computed(() => Math.round(inputsCredit.used / inputsCredit.limit * 100));

const step = ref(0);
const running = ref(false);
function runFlow() { running.value = true; step.value = 0; const t = setInterval(() => { step.value++; if (step.value >= deliverFlow.length) clearInterval(t); }, 480); }
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🧪 农资集采</text>
      <text class="hs">厂家直供 · 团购压价 · 赊销到田 · 真伪溯源</text>
      <view v-if="!productionBuild" class="kpis">
        <view class="k"><text class="kn">6 类</text><text class="kl">集采品类</text></view>
        <view class="k"><text class="kn">1.2 亿</text><text class="kl">年集采额</text></view>
        <view class="k"><text class="kn">15%</text><text class="kl">平均省</text></view>
        <view class="k"><text class="kn">860</text><text class="kl">覆盖合作社</text></view>
      </view>
    </view>

    <view class="qual-entry" @tap="qualify">
      <view class="qe-ic">🛡️</view>
      <view class="qe-main">
        <text class="qe-t">农资商家自动审核准入</text>
        <text class="qe-d">种子、农药、肥料、农机具、无人机等分类审证；许可范围逐个SKU拦截</text>
      </view>
      <text class="qe-go">进入 ›</text>
    </view>
    <view class="qual-entry machinery-entry" @tap="machineryMerchant">
      <view class="qe-ic">🚜</view>
      <view class="qe-main">
        <text class="qe-t">农机具商家 · 机具全生命周期管理</text>
        <text class="qe-d">验真入库、一机一码、销售租赁、交机验收、维保召回与资产退出</text>
      </view>
      <text class="qe-go">进入 ›</text>
    </view>

    <!-- 集采品类 -->
    <view class="cats">
      <view class="cat" v-for="c in inputCats" :key="c.n" @tap="mall">
        <text class="c-ic">{{ c.icon }}</text>
        <text class="c-n">{{ c.n }}</text>
        <text class="c-i">{{ c.items }}</text>
      </view>
    </view>
    <view class="mall-entry" @tap="mall">🛒 逛农资商城 · 浏览全部品类下单 ›</view>
    <view v-if="productionBuild" class="backend-note">正式环境不展示内置拼团、比价、额度或流程样例；真实农资 SKU、价格、库存、授信和配送状态须由后台审核及持牌机构接口返回。</view>

    <!-- 集采拼团（阶梯降价）-->
    <view v-if="!productionBuild" class="sec">🔥 集采拼团 · 量大价降</view>
    <view v-if="!productionBuild" class="gb">
      <text class="gb-n">{{ groupBuy.name }}</text>
      <text class="gb-f">{{ groupBuy.factory }} · {{ groupBuy.spec }}</text>
      <view class="gb-price">
        <text class="gb-cur">¥{{ curTier.price }}</text><text class="gb-unit">/袋</text>
        <text class="gb-mkt">市场价 ¥{{ groupBuy.market }}</text>
        <text class="gb-save">省 ¥{{ saved }}/袋</text>
      </view>
      <!-- 阶梯 -->
      <view class="tiers">
        <view class="tier" v-for="t in groupBuy.tiers" :key="t.qty" :class="{ on: t.price === curTier.price }">
          <text class="t-q">{{ t.qty }}</text>
          <text class="t-p">¥{{ t.price }}</text>
        </view>
      </view>
      <!-- 进度 -->
      <view class="gb-bar"><view class="gb-fill" :style="{ width: progress + '%' }"></view></view>
      <view class="gb-meta">
        <text class="gb-join">已拼 {{ joined }} 袋</text>
        <text v-if="nextTier" class="gb-next">再拼 {{ toNext }} 袋 → ¥{{ nextTier.price }}/袋</text>
        <text v-else class="gb-next">已达最低档 🎉</text>
      </view>
      <view class="gb-btn" @tap="join">参与拼团</view>
    </view>

    <!-- 厂家直供正品比价 -->
    <view v-if="!productionBuild" class="sec">厂家直供 · 正品比价</view>
    <view v-if="!productionBuild" class="ds" v-for="d in directSupply" :key="d.n">
      <view class="ds-l">
        <text class="ds-n">{{ d.n }}</text>
        <text class="ds-f">{{ d.factory }}</text>
        <text class="ds-pass">🛡️ 商家资质联查通过 · 商品许可范围匹配</text>
        <text class="ds-tag">🔎 一物一码 · 扫码验真</text>
      </view>
      <view class="ds-r">
        <text class="ds-p">{{ d.price }}</text>
        <text class="ds-m">{{ d.market }}</text>
        <text class="ds-s">{{ d.save }}</text>
      </view>
    </view>

    <!-- 赊销 / 农资贷 -->
    <view v-if="!productionBuild" class="sec">赊销 · 农资贷（先用后付）</view>
    <view v-if="!productionBuild" class="credit" @tap="credit">
      <view class="cr-top">
        <view class="cr-l"><text class="cr-lb">农资赊销额度</text><text class="cr-amt">¥{{ money(inputsCredit.limit) }}</text></view>
        <text class="cr-rate">年化 {{ inputsCredit.rate }}</text>
      </view>
      <view class="cr-bar"><view class="cr-fill" :style="{ width: usedPct + '%' }"></view></view>
      <text class="cr-used">已用 ¥{{ money(inputsCredit.used) }} · 剩余 ¥{{ money(inputsCredit.limit - inputsCredit.used) }}</text>
      <text class="cr-note">💡 {{ inputsCredit.note }}</text>
    </view>

    <!-- 配送到田 + 溯源 -->
    <view v-if="!productionBuild" class="sec-row"><text class="sec">配送到田 · 真伪溯源</text><text class="demo" @tap="runFlow">核验流程</text></view>
    <view v-if="!productionBuild" class="sg-card">
      <view class="fl" v-for="(f, i) in deliverFlow" :key="i" :class="{ on: running && step > i }">
        <view class="fl-axis"><view class="fl-dot" :class="{ on: running && step > i }">{{ running && step > i ? '✓' : i + 1 }}</view><view v-if="i < deliverFlow.length - 1" class="fl-line" :class="{ on: running && step > i + 1 }"></view></view>
        <view class="fl-i"><text class="fl-t">{{ f.t }}</text><text class="fl-d">{{ f.d }}</text></view>
      </view>
      <view v-if="running && step >= deliverFlow.length" class="fl-done">✅ 农资一物一码扫码验真，使用批次进入该地块农产品溯源链——从「种什么、施什么」到「卖给谁」全程可追。</view>
    </view>

    <view class="trace-btn" @tap="trace">🔍 扫码验农资真伪</view>
    <view class="tip">🔗 集采压价降成本、厂家直供防假货、赊销缓资金、使用记录接溯源。农资是全链路溯源的起点，与订单农业「以销定产」配套下单。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #2f9e5b, $sg-primary-deep); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 36rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; }
.kpis { display: flex; margin-top: 22rpx; }
.k { flex: 1; text-align: center; }
.kn { font-size: 30rpx; font-weight: 800; display: block; }
.kl { font-size: 19rpx; opacity: 0.9; }
.mall-entry { margin: 14rpx 24rpx 0; text-align: center; padding: 20rpx 0; border-radius: 999rpx; background: $sg-primary-light; color: $sg-primary-deep; font-size: 24rpx; font-weight: 700; }
.qual-entry { display: flex; align-items: center; margin: 18rpx 24rpx 0; padding: 20rpx; border-radius: $sg-radius-lg; color: #fff; background: linear-gradient(135deg, #123c56, #12634d); box-shadow: 0 8rpx 20rpx rgba(18,60,86,.22); }
.machinery-entry { margin-top: 12rpx; background: linear-gradient(135deg, #765120, #17704e); }
.qe-ic { flex: none; width: 62rpx; height: 62rpx; display: flex; align-items: center; justify-content: center; margin-right: 14rpx; border-radius: 16rpx; font-size: 34rpx; background: rgba(255,255,255,.14); }
.qe-main { flex: 1; display: flex; flex-direction: column; }
.qe-t { font-size: 25rpx; font-weight: 800; }
.qe-d { margin-top: 4rpx; font-size: 18rpx; line-height: 1.45; opacity: .86; }
.qe-go { flex: none; margin-left: 10rpx; font-size: 21rpx; }
.cats { display: flex; flex-wrap: wrap; gap: 14rpx; padding: 20rpx 24rpx 0; }
.cat { width: calc((100% - 28rpx) / 3); box-sizing: border-box; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 8rpx; display: flex; flex-direction: column; align-items: center; }
.c-ic { font-size: 40rpx; }
.c-n { font-size: 23rpx; font-weight: 700; margin-top: 6rpx; }
.c-i { font-size: 17rpx; color: $sg-text-3; margin-top: 2rpx; text-align: center; }
.sec { font-size: 30rpx; font-weight: 700; padding: 26rpx 28rpx 12rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 24rpx; }
.demo { font-size: 24rpx; color: $sg-primary; background: $sg-primary-light; padding: 8rpx 22rpx; border-radius: 999rpx; }
.gb { margin: 0 24rpx; background: linear-gradient(135deg, #fff6e6, #fff); border: 2rpx solid #f0dcae; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.gb-n { font-size: 28rpx; font-weight: 800; }
.gb-f { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; display: block; }
.gb-price { display: flex; align-items: baseline; margin: 14rpx 0; }
.gb-cur { font-size: 48rpx; font-weight: 800; color: $sg-red; }
.gb-unit { font-size: 22rpx; color: $sg-text-3; margin-left: 2rpx; }
.gb-mkt { font-size: 21rpx; color: $sg-text-3; text-decoration: line-through; margin-left: 16rpx; }
.gb-save { font-size: 21rpx; color: #fff; background: $sg-red; padding: 3rpx 12rpx; border-radius: 6rpx; margin-left: auto; }
.tiers { display: flex; gap: 8rpx; margin-bottom: 14rpx; }
.tier { flex: 1; background: #fff; border: 2rpx solid $sg-border; border-radius: $sg-radius; padding: 12rpx 4rpx; display: flex; flex-direction: column; align-items: center; }
.tier.on { border-color: $sg-red; background: #fdf0ef; }
.t-q { font-size: 17rpx; color: $sg-text-3; text-align: center; }
.t-p { font-size: 24rpx; font-weight: 800; color: $sg-red; margin-top: 4rpx; }
.gb-bar { height: 14rpx; background: #f0e6cf; border-radius: 999rpx; overflow: hidden; }
.gb-fill { height: 100%; background: linear-gradient(90deg, #e6b451, #d99a2b); border-radius: 999rpx; }
.gb-meta { display: flex; justify-content: space-between; margin: 8rpx 0 14rpx; }
.gb-join { font-size: 21rpx; color: $sg-text-2; }
.gb-next { font-size: 21rpx; color: #c8871f; font-weight: 600; }
.gb-btn { text-align: center; padding: 22rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #d99a2b, #c8871f); color: #fff; font-size: 28rpx; font-weight: 700; }
.ds { display: flex; align-items: center; margin: 0 24rpx 14rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; }
.ds-l { flex: 1; display: flex; flex-direction: column; }
.ds-n { font-size: 26rpx; font-weight: 700; }
.ds-f { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.ds-pass { font-size: 17rpx; color: #087742; margin-top: 5rpx; }
.ds-tag { font-size: 18rpx; color: $sg-primary; margin-top: 6rpx; }
.ds-r { text-align: right; display: flex; flex-direction: column; }
.ds-p { font-size: 28rpx; font-weight: 800; color: $sg-red; }
.ds-m { font-size: 19rpx; color: $sg-text-3; text-decoration: line-through; }
.ds-s { font-size: 19rpx; color: #fff; background: $sg-primary; padding: 2rpx 10rpx; border-radius: 6rpx; margin-top: 4rpx; }
.credit { margin: 0 24rpx; background: linear-gradient(135deg, #eef6ff, #fff); border: 2rpx solid #cfe0f5; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.cr-top { display: flex; align-items: center; justify-content: space-between; }
.cr-lb { font-size: 20rpx; color: $sg-text-3; }
.cr-amt { font-size: 40rpx; font-weight: 800; color: $sg-blue; display: block; }
.cr-rate { font-size: 22rpx; color: $sg-blue; background: #e7f0f9; padding: 6rpx 16rpx; border-radius: 999rpx; }
.cr-bar { height: 14rpx; background: #dce8f5; border-radius: 999rpx; overflow: hidden; margin: 14rpx 0 8rpx; }
.cr-fill { height: 100%; background: linear-gradient(90deg, #4a9fe0, #2b6cb0); border-radius: 999rpx; }
.cr-used { font-size: 21rpx; color: $sg-text-2; display: block; }
.cr-note { font-size: 20rpx; color: $sg-blue; margin-top: 10rpx; display: block; line-height: 1.5; }
.fl { display: flex; opacity: 0.5; transition: opacity 0.3s; }
.fl.on { opacity: 1; }
.fl-axis { display: flex; flex-direction: column; align-items: center; margin-right: 20rpx; }
.fl-dot { width: 46rpx; height: 46rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; }
.fl-dot.on { background: $sg-primary; }
.fl-line { flex: 1; width: 4rpx; background: $sg-border; min-height: 22rpx; margin: 4rpx 0; }
.fl-line.on { background: $sg-primary; }
.fl-i { flex: 1; display: flex; flex-direction: column; padding-bottom: 22rpx; }
.fl-t { font-size: 25rpx; font-weight: 600; }
.fl-d { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }
.fl-done { font-size: 22rpx; color: $sg-primary; background: $sg-primary-light; padding: 16rpx; border-radius: $sg-radius; line-height: 1.6; }
.trace-btn { margin: 20rpx 24rpx 0; text-align: center; padding: 24rpx 0; border-radius: 999rpx; background: #fff; border: 2rpx solid $sg-primary; color: $sg-primary; font-size: 26rpx; font-weight: 700; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.backend-note { margin: 0 24rpx 20rpx; padding: 18rpx 20rpx; border-radius: $sg-radius; background: #fff8e8; border: 2rpx solid #f0dcae; color: #8a641f; font-size: 22rpx; line-height: 1.6; }
</style>
