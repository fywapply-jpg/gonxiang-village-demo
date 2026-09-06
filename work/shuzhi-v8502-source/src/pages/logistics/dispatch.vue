<script setup lang="ts">
import { ref } from "vue";
import { netHub, satellites, terminals, slaTiers, tempZones, tempCurve, routeStats, trackNodes } from "@/mock/dispatch";
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const productionBlocked = () => uni.showModal({ title: "需第三方物流服务", content: "正式环境轨迹和温控必须来自已签约物流商回传，当前未执行本地轨迹播放。", showCancel: false });
const tmax = Math.max(...tempCurve) + 1;
const step = ref(0);
const running = ref(false);
function runTrack() { if (productionBuild) return productionBlocked(); running.value = true; step.value = 0; const t = setInterval(() => { step.value++; if (step.value >= trackNodes.length) clearInterval(t); }, 520); }
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🚚 统仓统配 · 冷链配送调度</text>
      <text class="hs">枢纽仓 → 城市卫星仓 → 冷链落地配到店 / 到厨房 / 到铺号</text>
      <view class="kpis">
        <view class="k"><text class="kn">{{ routeStats.orders }}</text><text class="kl">日配单量</text></view>
        <view class="k"><text class="kn">98.6%</text><text class="kl">准时率</text></view>
        <view class="k"><text class="kn">99.2%</text><text class="kl">冷链达标</text></view>
        <view class="k"><text class="kn">{{ routeStats.saveRate }}</text><text class="kl">集配降本</text></view>
      </view>
    </view>

    <!-- 三级仓配网络 -->
    <view class="sec">三级仓配网络</view>
    <view class="net">
      <view class="tier hub">
        <text class="ti-lb">① 枢纽中心仓</text>
        <text class="ti-n">{{ netHub.name }}</text>
        <text class="ti-s">{{ netHub.cap }}</text>
      </view>
      <text class="ar">↓ 干线冷链</text>
      <view class="tier sat">
        <text class="ti-lb">② 城市卫星仓 / 前置仓</text>
        <view class="sats">
          <view class="sat-c" v-for="s in satellites" :key="s.name"><text class="sc-n">{{ s.name }}</text><text class="sc-a">{{ s.area }}</text></view>
        </view>
      </view>
      <text class="ar">↓ 冷链落地配</text>
      <view class="tier term">
        <text class="ti-lb">③ 落地配终端（到铺号）</text>
        <view class="terms">
          <view class="tm" v-for="t in terminals" :key="t.name"><text class="tm-ic">{{ t.icon }}</text><text class="tm-n">{{ t.name }}</text></view>
        </view>
      </view>
    </view>

    <!-- 时效分层 -->
    <view class="sec">配送时效分层（按小端类型）</view>
    <view class="slas">
      <view class="sla" v-for="s in slaTiers" :key="s.tier" :style="{ borderColor: s.color }">
        <view class="sl-top"><text class="sl-tier" :style="{ color: s.color }">{{ s.tier }}</text><text class="sl-win">{{ s.window }}</text></view>
        <text class="sl-ends">{{ s.ends }}</text>
        <text class="sl-note">{{ s.note }}</text>
      </view>
    </view>

    <!-- 智能路由拼单 -->
    <view class="sec">智能路由 · 拼单集配</view>
    <view class="route-card">
      <view class="rc"><text class="rc-n">{{ routeStats.orders }}</text><text class="rc-l">今日订单</text></view>
      <text class="rc-arrow">→</text>
      <view class="rc"><text class="rc-n">{{ routeStats.cars }}</text><text class="rc-l">拼车集配</text></view>
      <text class="rc-arrow">→</text>
      <view class="rc"><text class="rc-n">{{ routeStats.pooled }}</text><text class="rc-l">拼单率</text></view>
    </view>
    <text class="route-note">多小端订单按就近卫星仓分单、同线路拼车集配，装载率提升、里程下降，综合物流成本降 {{ routeStats.saveRate }}。</text>

    <!-- 冷链温控 -->
    <view class="sec">全程冷链温控</view>
    <view class="sg-card">
      <view class="zones">
        <view class="zone" v-for="z in tempZones" :key="z.zone"><text class="z-t">{{ z.zone }}</text><text class="z-tp">{{ z.temp }}</text><text class="z-c">{{ z.cargo }}</text></view>
      </view>
      <text class="chart-lb">冷藏车厢 24h 温度曲线（0~4℃ 达标区）</text>
      <view class="chart">
        <view class="col" v-for="(v, i) in tempCurve" :key="i">
          <view class="cbar" :style="{ height: (v / tmax * 120) + 'rpx' }"></view>
        </view>
        <view class="okline"></view>
      </view>
      <text class="chart-note">✅ 全程温度稳定在 3.5~4.2℃，未出现断链；超温 / 断链自动告警并上链存证。</text>
    </view>

    <!-- 配送到铺号轨迹 -->
    <view class="sec-row"><text class="sec">一单到铺号 · 配送轨迹</text><text class="demo" @tap="runTrack">查看轨迹</text></view>
    <view class="sg-card">
      <view class="tk" v-for="(n, i) in trackNodes" :key="i" :class="{ on: running && step > i }">
        <view class="tk-axis"><view class="tk-dot" :class="{ on: running && step > i }">{{ running && step > i ? '✓' : i + 1 }}</view><view v-if="i < trackNodes.length - 1" class="tk-line" :class="{ on: running && step > i + 1 }"></view></view>
        <view class="tk-i"><view class="tk-row"><text class="tk-t">{{ n.t }}</text><text class="tk-time">{{ n.time }}</text></view><text class="tk-d">{{ n.d }}</text></view>
      </view>
      <view v-if="running && step >= trackNodes.length" class="tk-done">✅ 从枢纽仓到「XX 市场 A-12 档口」全程冷链、GPS 到点、电子签收，温度与轨迹全上链，配送到点、监管到户。</view>
    </view>

    <view class="tip">🔗 统仓统配依托一级农批枢纽仓 + 城市卫星仓，冷链落地配到小端铺号；电子仓单可质押融资（对接粮食银行 / 仓单贷），全程温控与轨迹上链存证。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #2b6cb0, #1e4e8c); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; line-height: 1.5; }
.kpis { display: flex; margin-top: 22rpx; }
.k { flex: 1; text-align: center; }
.kn { font-size: 32rpx; font-weight: 800; display: block; }
.kl { font-size: 19rpx; opacity: 0.9; }
.sec { font-size: 30rpx; font-weight: 700; padding: 26rpx 28rpx 12rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 24rpx; }
.demo { font-size: 24rpx; color: $sg-blue; background: #e7f0f9; padding: 8rpx 22rpx; border-radius: 999rpx; }
.net { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.tier { border-radius: $sg-radius; padding: 18rpx 20rpx; }
.tier.hub { background: linear-gradient(135deg, #2b6cb0, #1e4e8c); }
.tier.sat { background: #e7f0f9; }
.tier.term { background: $sg-primary-light; }
.ti-lb { font-size: 19rpx; font-weight: 700; opacity: 0.9; }
.tier.hub .ti-lb { color: rgba(255,255,255,0.85); }
.tier.hub .ti-n { color: #fff; }
.tier.hub .ti-s { color: rgba(255,255,255,0.8); }
.ti-n { font-size: 27rpx; font-weight: 800; display: block; margin-top: 4rpx; }
.ti-s { font-size: 20rpx; color: $sg-text-3; display: block; margin-top: 4rpx; }
.ar { display: block; text-align: center; font-size: 20rpx; color: $sg-text-3; padding: 8rpx 0; }
.sats { display: flex; gap: 12rpx; margin-top: 10rpx; }
.sat-c { flex: 1; background: #fff; border-radius: $sg-radius; padding: 12rpx; display: flex; flex-direction: column; align-items: center; }
.sc-n { font-size: 22rpx; font-weight: 700; }
.sc-a { font-size: 18rpx; color: $sg-text-3; margin-top: 2rpx; }
.terms { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 10rpx; }
.tm { width: calc((100% - 20rpx) / 3); box-sizing: border-box; background: #fff; border-radius: $sg-radius; padding: 12rpx 4rpx; display: flex; flex-direction: column; align-items: center; }
.tm-ic { font-size: 30rpx; }
.tm-n { font-size: 18rpx; margin-top: 4rpx; }
.slas { display: flex; flex-wrap: wrap; gap: 14rpx; padding: 0 24rpx; }
.sla { width: calc(50% - 7rpx); box-sizing: border-box; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx; border-left: 8rpx solid; }
.sl-top { display: flex; align-items: baseline; justify-content: space-between; }
.sl-tier { font-size: 26rpx; font-weight: 800; }
.sl-win { font-size: 19rpx; color: $sg-text-3; }
.sl-ends { font-size: 22rpx; font-weight: 600; margin: 6rpx 0 4rpx; display: block; }
.sl-note { font-size: 19rpx; color: $sg-text-3; line-height: 1.4; display: block; }
.route-card { display: flex; align-items: center; justify-content: space-around; margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.rc { display: flex; flex-direction: column; align-items: center; }
.rc-n { font-size: 34rpx; font-weight: 800; color: $sg-blue; }
.rc-l { font-size: 19rpx; color: $sg-text-3; margin-top: 4rpx; }
.rc-arrow { font-size: 30rpx; color: $sg-text-3; }
.route-note { display: block; margin: 12rpx 24rpx 0; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.sg-card { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.zones { display: flex; gap: 14rpx; margin-bottom: 18rpx; }
.zone { flex: 1; background: #eef6ff; border-radius: $sg-radius; padding: 16rpx 8rpx; display: flex; flex-direction: column; align-items: center; }
.z-t { font-size: 22rpx; font-weight: 700; }
.z-tp { font-size: 24rpx; font-weight: 800; color: $sg-blue; margin: 4rpx 0; }
.z-c { font-size: 18rpx; color: $sg-text-3; text-align: center; }
.chart-lb { font-size: 21rpx; color: $sg-text-2; display: block; margin-bottom: 10rpx; }
.chart { display: flex; align-items: flex-end; justify-content: space-between; height: 130rpx; position: relative; padding: 0 4rpx; }
.col { flex: 1; display: flex; align-items: flex-end; justify-content: center; }
.cbar { width: 20rpx; border-radius: 6rpx 6rpx 0 0; background: linear-gradient(180deg, #4a9fe0, #2b6cb0); }
.okline { position: absolute; left: 0; right: 0; bottom: 96rpx; height: 2rpx; background: repeating-linear-gradient(90deg, #16884c, #16884c 8rpx, transparent 8rpx, transparent 16rpx); }
.chart-note { font-size: 20rpx; color: $sg-primary; margin-top: 12rpx; display: block; line-height: 1.5; }
.tk { display: flex; opacity: 0.5; transition: opacity 0.3s; }
.tk.on { opacity: 1; }
.tk-axis { display: flex; flex-direction: column; align-items: center; margin-right: 20rpx; }
.tk-dot { width: 46rpx; height: 46rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; }
.tk-dot.on { background: $sg-blue; }
.tk-line { flex: 1; width: 4rpx; background: $sg-border; min-height: 24rpx; margin: 4rpx 0; }
.tk-line.on { background: $sg-blue; }
.tk-i { flex: 1; display: flex; flex-direction: column; padding-bottom: 22rpx; }
.tk-row { display: flex; align-items: baseline; justify-content: space-between; }
.tk-t { font-size: 25rpx; font-weight: 600; }
.tk-time { font-size: 21rpx; color: $sg-blue; }
.tk-d { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }
.tk-done { font-size: 22rpx; color: $sg-blue; background: #eef6ff; padding: 16rpx; border-radius: $sg-radius; line-height: 1.6; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
</style>
