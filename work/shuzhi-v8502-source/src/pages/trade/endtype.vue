<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { cityMarkets, endTypeDetail } from "@/mock/citymarket";
import { useTradeStore } from "@/store/trade";
const trade = useTradeStore();
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const mkey = ref(cityMarkets[0].key);
const key = ref("market");
onLoad((q: any) => {
  if (q?.mkey && cityMarkets.some((m) => m.key === q.mkey)) mkey.value = q.mkey;
  if (q?.key) key.value = q.key;
});

const cm = computed(() => cityMarkets.find((m) => m.key === mkey.value) || cityMarkets[0]);
const end = computed(() => cm.value.ends.find((e) => e.key === key.value) || cm.value.ends[0]);
const d = computed(() => endTypeDetail[key.value]);

// 八类小端各自的专属工具（深入页）
const deepMap: Record<string, { url: string; t: string; s: string }> = {
  market: { url: "/pages/trade/tool-market", t: "🏪 深入：当日行情批货单", s: "看当日挂牌涨跌 · 一件起批 · 一键下单" },
  store: { url: "/pages/trade/tool-store", t: "🏘️ 深入：智能补货", s: "按动销自动荐量 · 临期特价 · 次日达" },
  kitchen: { url: "/pages/trade/kitchen-bom", t: "🍚 深入：菜谱 BOM 测算", s: "按菜单反算食材用量与成本，一键下单" },
  process: { url: "/pages/trade/tool-process", t: "🏭 深入：原料年单锁价", s: "按产能反算年度原料 · 期货锁价避波动" },
  catering: { url: "/pages/trade/tool-catering", t: "🍽️ 深入：多门店集单", s: "各店报量 · 总部集采 · 集采降本" },
  army: { url: "/pages/trade/tool-army", t: "🎖️ 深入：军供计划配送", s: "定点定量配送计划 · 合规核验（脱敏）" },
  student: { url: "/pages/trade/tool-student", t: "🎓 深入：带量食谱配餐", s: "营养带量食谱 · 按人数反算 · A级留样" },
  canteen: { url: "/pages/trade/canteen-bid", t: "🏛️ 深入：阳光招采", s: "线上比价 · 综合评标 · 中标公示" },
};
const deepLink = computed(() => deepMap[key.value] || null);
function goDeep() { if (deepLink.value) uni.navigateTo({ url: deepLink.value.url }); }
function join() { uni.navigateTo({ url: `/pages/register/endjoin?key=${key.value}` }); }

// 采购流程核验
const step = ref(0);
const running = ref(false);
function runFlow() {
  if (productionBuild) return uni.showModal({ title: "需要后台采购流程", content: "正式环境的采购流程步骤和验收结果必须由后台订单返回，当前未播放本地流程。", showCancel: false });
  running.value = true; step.value = 0; const t = setInterval(() => { step.value++; if (step.value >= d.value.procure.length) clearInterval(t); }, 480);
}

// 用典型采购清单一键生成采购需求（打通下单闭环）
function genDemand() {
  if (productionBuild) return uni.showModal({ title: "需要后台采购需求", content: "正式环境必须由后台绑定采购主体、预算、商品 SKU、服务区域和幂等键后生成采购需求，当前未创建本地需求。", showCancel: false });
  const items = d.value.skus.map((s) => ({ name: s.name, spec: s.spec }));
  const id = trade.addDemand({
    title: `求购 ${end.value.name}食材（${d.value.skus.length}项）`,
    category: "团餐食材", qty: `${d.value.skus.length} 项`,
    addr: `${cm.value.city} · ${cm.value.hub}`, deadline: "5 天内",
    buyer: d.value.orgs[0]?.name || end.value.name, budget: "面议 · 待报价", pic: "/static/products/p8.jpg", items,
  });
  uni.showModal({
    title: "采购需求已生成", showCancel: false, confirmText: "去采购大厅看",
    content: `已按典型清单生成需求单 ${id}\n${d.value.skus.length} 项 · 发布到采购大厅，接收供应商报价。`,
    success: () => (uni.setStorageSync('tradeTab','demand'), uni.switchTab({ url: '/pages/trade/index' })),
  });
}

function toDemand() { (uni.setStorageSync('tradeTab','demand'), uni.switchTab({ url: '/pages/trade/index' })); }
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <view class="hero-top">
        <text class="hero-ic">{{ end.icon }}</text>
        <view class="hero-i">
          <text class="hero-n">{{ end.name }}</text>
          <text class="hero-city">{{ cm.city }} · {{ cm.hub }}</text>
        </view>
      </view>
      <text class="hero-tag">{{ d.tagline }}</text>
      <view class="hero-kpis">
        <view class="hk"><text class="hkn">{{ end.count }}</text><text class="hkl">接入数量</text></view>
        <view class="hk"><text class="hkn">{{ end.freq }}</text><text class="hkl">采购节奏</text></view>
        <view class="hk"><text class="hkn">{{ end.buys }}</text><text class="hkl">主采品类</text></view>
      </view>
    </view>

    <view v-if="d.note" class="note">⚠️ {{ d.note }}</view>

    <!-- 深入页入口（中央厨房 / 机关食堂）-->
    <view v-if="deepLink" class="deep" @tap="goDeep">
      <view class="deep-i"><text class="deep-t">{{ deepLink.t }}</text><text class="deep-s">{{ deepLink.s }}</text></view>
      <text class="deep-go">进入 ›</text>
    </view>

    <!-- 需求特征 / 痛点 -->
    <view class="sec">需求特征 · 痛点</view>
    <view class="pains">
      <view class="pain" v-for="p in d.pains" :key="p"><text class="pain-dot">•</text><text class="pain-t">{{ p }}</text></view>
    </view>

    <!-- 专属采购流程 -->
    <view class="sec-row"><text class="sec">在枢纽里怎么采购</text><text class="demo" @tap="runFlow">查看步骤</text></view>
    <view class="sg-card">
      <view class="fl" v-for="(f, i) in d.procure" :key="i" :class="{ on: running && step > i }">
        <view class="fl-axis"><view class="fl-dot" :class="{ on: running && step > i }">{{ running && step > i ? '✓' : i + 1 }}</view><view v-if="i < d.procure.length - 1" class="fl-line" :class="{ on: running && step > i + 1 }"></view></view>
        <view class="fl-i"><text class="fl-t">{{ f.t }}</text><text class="fl-d">{{ f.d }}</text></view>
      </view>
    </view>

    <!-- 准入 / 资质 -->
    <view class="sec">准入 · 资质要求</view>
    <view class="quals">
      <text class="qual" v-for="q in d.quals" :key="q">✅ {{ q }}</text>
    </view>

    <!-- 典型采购清单 -->
    <view class="sec-row"><text class="sec">典型采购清单</text><text class="gen" @tap="genDemand">＋ 生成采购需求</text></view>
    <view class="skus">
      <view class="sku" v-for="s in d.skus" :key="s.name">
        <text class="sku-n">{{ s.name }}</text>
        <text class="sku-s">{{ s.spec }}</text>
      </view>
    </view>

    <!-- 代表机构 -->
    <view class="sec">代表机构（{{ cm.city }}）</view>
    <view class="org" v-for="o in d.orgs" :key="o.name">
      <view class="org-ic">{{ end.icon }}</view>
      <view class="org-i"><text class="org-n">{{ o.name }}</text><text class="org-s">{{ o.scale }}</text></view>
    </view>

    <!-- 结算 -->
    <view class="settle">💳 结算与账期：{{ d.settle }}</view>

    <!-- 平台价值 -->
    <view class="sec">平台为它解决什么</view>
    <view class="vals">
      <view class="val" v-for="(v, i) in d.values" :key="v"><text class="val-n">{{ i + 1 }}</text><text class="val-t">{{ v }}</text></view>
    </view>

    <view class="cta-row">
      <view class="cta ghost" @tap="join">＋ 入驻此类小端</view>
      <view class="cta" @tap="toDemand">看采购需求 ›</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #2f9e5b, $sg-primary-deep); padding: 32rpx 28rpx 26rpx; color: #fff; }
.hero-top { display: flex; align-items: center; }
.hero-ic { font-size: 60rpx; margin-right: 18rpx; }
.hero-i { flex: 1; display: flex; flex-direction: column; }
.hero-n { font-size: 36rpx; font-weight: 800; }
.hero-city { font-size: 21rpx; opacity: 0.9; margin-top: 4rpx; }
.hero-tag { font-size: 23rpx; opacity: 0.95; margin: 16rpx 0 0; display: block; line-height: 1.5; }
.hero-kpis { display: flex; margin-top: 22rpx; gap: 12rpx; }
.hk { flex: 1; background: rgba(255,255,255,0.14); border-radius: $sg-radius; padding: 14rpx 10rpx; text-align: center; }
.hkn { font-size: 24rpx; font-weight: 700; display: block; }
.hkl { font-size: 18rpx; opacity: 0.85; }

.note { margin: 20rpx 24rpx 0; padding: 16rpx 20rpx; background: $sg-gold-light; border-left: 8rpx solid $sg-gold; border-radius: $sg-radius; font-size: 21rpx; color: #9a6a12; line-height: 1.5; }
.deep { display: flex; align-items: center; margin: 20rpx 24rpx 0; padding: 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #f2ecff, #fff); border: 2rpx solid #d9c9f5; box-shadow: $sg-shadow; }
.deep-i { flex: 1; display: flex; flex-direction: column; }
.deep-t { font-size: 26rpx; font-weight: 800; color: #6b21b6; }
.deep-s { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.deep-go { font-size: 24rpx; color: #6b21b6; background: #efe6fc; padding: 8rpx 20rpx; border-radius: 999rpx; }
.gen { font-size: 23rpx; color: $sg-primary; background: $sg-primary-light; padding: 8rpx 20rpx; border-radius: 999rpx; }

.sec { font-size: 30rpx; font-weight: 700; padding: 26rpx 28rpx 12rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 24rpx; }
.demo { font-size: 24rpx; color: $sg-primary; background: $sg-primary-light; padding: 8rpx 22rpx; border-radius: 999rpx; }

.pains { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 8rpx 22rpx; }
.pain { display: flex; align-items: flex-start; padding: 12rpx 0; border-top: 2rpx solid $sg-border; }
.pain:first-child { border-top: none; }
.pain-dot { color: $sg-red; margin-right: 12rpx; font-size: 26rpx; line-height: 1.4; }
.pain-t { font-size: 24rpx; color: $sg-text-2; flex: 1; line-height: 1.4; }

.fl { display: flex; opacity: 0.5; transition: opacity 0.3s; }
.fl.on { opacity: 1; }
.fl-axis { display: flex; flex-direction: column; align-items: center; margin-right: 20rpx; }
.fl-dot { width: 46rpx; height: 46rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; }
.fl-dot.on { background: $sg-primary; }
.fl-line { flex: 1; width: 4rpx; background: $sg-border; min-height: 22rpx; margin: 4rpx 0; }
.fl-line.on { background: $sg-primary; }
.fl-i { flex: 1; display: flex; flex-direction: column; padding-bottom: 22rpx; }
.fl-t { font-size: 25rpx; font-weight: 600; }
.fl-d { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; line-height: 1.4; }

.quals { display: flex; flex-wrap: wrap; gap: 12rpx; padding: 0 24rpx; }
.qual { font-size: 22rpx; color: $sg-primary-deep; background: $sg-primary-light; padding: 10rpx 18rpx; border-radius: 999rpx; }

.skus { display: flex; flex-wrap: wrap; gap: 16rpx; padding: 0 24rpx; }
.sku { width: calc((100% - 16rpx) / 2); box-sizing: border-box; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 20rpx; display: flex; align-items: baseline; justify-content: space-between; }
.sku-n { font-size: 25rpx; font-weight: 600; }
.sku-s { font-size: 21rpx; color: $sg-primary; }

.org { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 14rpx; padding: 20rpx; }
.org-ic { font-size: 40rpx; margin-right: 16rpx; }
.org-i { flex: 1; display: flex; flex-direction: column; }
.org-n { font-size: 26rpx; font-weight: 700; }
.org-s { font-size: 21rpx; color: $sg-text-3; margin-top: 4rpx; }

.settle { margin: 18rpx 24rpx 0; padding: 18rpx 22rpx; background: $sg-primary-light; border-radius: $sg-radius; font-size: 23rpx; color: $sg-primary-deep; line-height: 1.5; }

.vals { padding: 0 24rpx; }
.val { display: flex; align-items: flex-start; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin-bottom: 12rpx; padding: 18rpx 20rpx; }
.val-n { width: 40rpx; height: 40rpx; flex-shrink: 0; border-radius: 50%; background: $sg-primary; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 700; margin-right: 16rpx; }
.val-t { font-size: 24rpx; color: $sg-text; flex: 1; line-height: 1.5; }

.cta-row { display: flex; gap: 20rpx; margin: 24rpx; }
.cta { flex: 1; text-align: center; padding: 26rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; font-size: 27rpx; font-weight: 700; box-shadow: 0 8rpx 20rpx rgba(15,107,59,0.3); }
.cta.ghost { background: #fff; color: $sg-primary; border: 2rpx solid $sg-primary; box-shadow: none; }
</style>
