<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { cityMarkets, cityLoop, cityRelations } from "@/mock/citymarket";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const productionBlocked = () => uni.showModal({ title: "需后台市场服务", content: "正式环境的市场闭环必须由后台订单、仓储、物流和结算数据驱动，当前未执行本地闭环。", showCancel: false });

const mkey = ref(cityMarkets[0].key);
onLoad((q: any) => { if (q?.mkey && cityMarkets.some((m) => m.key === q.mkey)) mkey.value = q.mkey; });
const cm = computed(() => cityMarkets.find((m) => m.key === mkey.value) || cityMarkets[0]);
// 同省其他市场（便捷切换）
const siblings = computed(() => cityMarkets.filter((m) => m.province === cm.value.province));
function pickMarket(k: string) { mkey.value = k; }

function toEnd(key: string) { uni.navigateTo({ url: `/pages/trade/endtype?key=${key}&mkey=${mkey.value}` }); }
function toSupply() { uni.switchTab({ url: "/pages/trade/index" }); }
function allMarkets() { uni.navigateTo({ url: "/pages/trade/markets" }); }

// 业务闭环核验
const step = ref(0);
const running = ref(false);
function runLoop() { if (productionBuild) return productionBlocked(); running.value = true; step.value = 0; const t = setInterval(() => { step.value++; if (step.value >= cityLoop.length) clearInterval(t); }, 480); }
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <view class="hero-top">
        <text class="ht">🏬 农批枢纽</text>
        <text class="all" @tap="allMarkets">☰ 全部市场</text>
      </view>
      <text class="hs">{{ cm.province }} · {{ cm.city }}｜周边 {{ cm.radiusKm }} 公里匹配八类小端</text>
      <scroll-view v-if="siblings.length > 1" scroll-x class="cities">
        <text v-for="m in siblings" :key="m.key" class="city" :class="{ on: mkey === m.key }" @tap="pickMarket(m.key)">{{ m.city }}</text>
      </scroll-view>
    </view>

    <!-- 枢纽卡 -->
    <view class="hub">
      <view class="hub-top">
        <view class="hub-badge">枢纽</view>
        <view class="hub-i">
          <text class="hub-n">{{ cm.hub }}</text>
          <text class="hub-g">{{ cm.hubGrade }}</text>
        </view>
      </view>
      <text class="hub-note">📍 {{ cm.note }}</text>
      <text class="hub-desc">{{ cm.hubDesc }}</text>
      <view class="kpis">
        <view class="kpi"><text class="kn">{{ cm.kpi.deal }}</text><text class="kl">日交易额</text></view>
        <view class="kpi"><text class="kn">{{ cm.kpi.coop }}</text><text class="kl">上游合作社</text></view>
        <view class="kpi"><text class="kn">{{ cm.kpi.ends }}</text><text class="kl">下游小端</text></view>
        <view class="kpi"><text class="kn">{{ cm.kpi.trucks }}</text><text class="kl">日吞吐</text></view>
      </view>
    </view>

    <!-- 闭环示意图 -->
    <view class="flowmap">
      <view class="fm-tier up" @tap="toSupply">
        <text class="fm-label">上游 · 源头供给</text>
        <text class="fm-main">产地专业合作社 · {{ cm.kpi.coop }} 家</text>
        <text class="fm-sub">组织农户 · 标准化生产 · 产地集货 · 订单农业</text>
      </view>
      <text class="fm-down">↓ 产地直挂 · 保底收购</text>
      <view class="fm-tier core">
        <text class="fm-label light">中枢 · 一级农批市场</text>
        <text class="fm-main light">{{ cm.hub }}</text>
        <text class="fm-sub light">集货分级 · 价格发现 · 统仓统配 · 电子结算</text>
      </view>
      <text class="fm-down">↓ 集单分销 · 冷链落地配</text>
      <view class="fm-tier down">
        <text class="fm-label">下游 · 八类小端</text>
        <text class="fm-main">终端采购主体 · {{ cm.kpi.ends }} 个</text>
        <text class="fm-sub">农贸 / 夫妻店 / 央厨 / 加工 / 餐饮 / 军供 / 校餐 / 机关食堂</text>
      </view>
      <view class="fm-loop">↺ 消费与采购数据反向拉动生产端（订单农业），形成闭环</view>
    </view>

    <!-- 上游合作社 -->
    <view class="sec">上游 · 整合源头合作社</view>
    <view class="coop" v-for="c in cm.upstream" :key="c.name">
      <view class="coop-ic">🌱</view>
      <view class="coop-i">
        <text class="coop-n">{{ c.name }}</text>
        <text class="coop-m">{{ c.base }} · {{ c.cat }}</text>
      </view>
      <text class="coop-s">{{ c.scale }}</text>
    </view>

    <!-- 八类小端 -->
    <view class="sec">下游 · 八类小端（点开看详情）</view>
    <view class="ends">
      <view class="end" v-for="e in cm.ends" :key="e.key" @tap="toEnd(e.key)">
        <text class="end-ic">{{ e.icon }}</text>
        <text class="end-n">{{ e.name }}</text>
        <text class="end-c">{{ e.count }} 家</text>
        <text class="end-b">{{ e.buys }}</text>
      </view>
    </view>

    <!-- 业务流程闭环 -->
    <view class="sec-row"><text class="sec">B2B 业务逻辑闭环</text><text class="demo" @tap="runLoop">查看闭环</text></view>
    <view class="sg-card">
      <view class="fl" v-for="(f, i) in cityLoop" :key="i" :class="{ on: running && step > i }">
        <view class="fl-axis"><view class="fl-dot" :class="{ on: running && step > i }">{{ running && step > i ? '✓' : i + 1 }}</view><view v-if="i < cityLoop.length - 1" class="fl-line" :class="{ on: running && step > i + 1 }"></view></view>
        <view class="fl-i"><text class="fl-t">{{ f.t }}</text><text class="fl-d">{{ f.d }}</text></view>
      </view>
      <view v-if="running && step >= cityLoop.length" class="fl-done">✅ 一城一枢纽、一网通供采：产地不愁卖、枢纽提效率、小端稳货源、全链可追溯。</view>
    </view>

    <!-- 关系与规则 -->
    <view class="sec">上下游关系与规则</view>
    <view class="rel" v-for="r in cityRelations" :key="r.pair">
      <view class="rel-hd"><text class="rel-ic">{{ r.icon }}</text><text class="rel-t">{{ r.pair }}</text></view>
      <view class="rel-pts">
        <text class="rel-p" v-for="p in r.points" :key="p">· {{ p }}</text>
      </view>
    </view>

    <view class="tip">🔗 全部主体以企业法人 / 合作社主体入驻，供货、集货、成交、配送、结算全链上链；军供、校餐等按资质分级准入，一城一网、可信闭环。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #2f9e5b, $sg-primary-deep); padding: 34rpx 28rpx 26rpx; color: #fff; }
.hero-top { display: flex; align-items: center; justify-content: space-between; }
.ht { font-size: 36rpx; font-weight: 800; }
.all { font-size: 22rpx; color: #fff; background: rgba(255,255,255,0.2); padding: 8rpx 20rpx; border-radius: 999rpx; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; line-height: 1.5; }
.hub-note { font-size: 21rpx; color: $sg-primary; font-weight: 600; margin-top: 12rpx; display: block; }
.cities { white-space: nowrap; margin-top: 18rpx; }
.city { display: inline-block; padding: 8rpx 26rpx; font-size: 24rpx; border-radius: 999rpx; margin-right: 14rpx; background: rgba(255,255,255,0.16); }
.city.on { background: #fff; color: $sg-primary-deep; font-weight: 700; }

.hub { margin: -14rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; position: relative; }
.hub-top { display: flex; align-items: center; }
.hub-badge { width: 64rpx; height: 64rpx; border-radius: 18rpx; background: linear-gradient(135deg, $sg-gold, #c8871f); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 800; margin-right: 16rpx; }
.hub-i { flex: 1; display: flex; flex-direction: column; }
.hub-n { font-size: 30rpx; font-weight: 800; }
.hub-g { font-size: 21rpx; color: $sg-gold; margin-top: 4rpx; }
.hub-desc { font-size: 21rpx; color: $sg-text-3; margin: 14rpx 0 16rpx; display: block; }
.kpis { display: flex; border-top: 2rpx solid $sg-border; padding-top: 16rpx; }
.kpi { flex: 1; text-align: center; }
.kn { font-size: 26rpx; font-weight: 800; color: $sg-primary-deep; display: block; }
.kl { font-size: 19rpx; color: $sg-text-3; }

.flowmap { margin: 20rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.fm-tier { border-radius: $sg-radius; padding: 18rpx 20rpx; }
.fm-tier.up { background: $sg-primary-light; }
.fm-tier.core { background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); }
.fm-tier.down { background: #eef4fb; }
.fm-label { font-size: 19rpx; color: $sg-primary; font-weight: 700; }
.fm-label.light { color: rgba(255,255,255,0.85); }
.fm-main { font-size: 27rpx; font-weight: 800; display: block; margin-top: 4rpx; }
.fm-main.light { color: #fff; }
.fm-sub { font-size: 20rpx; color: $sg-text-3; display: block; margin-top: 4rpx; }
.fm-sub.light { color: rgba(255,255,255,0.82); }
.fm-down { display: block; text-align: center; font-size: 20rpx; color: $sg-text-3; padding: 8rpx 0; }
.fm-loop { margin-top: 14rpx; font-size: 20rpx; color: $sg-primary; text-align: center; background: $sg-primary-light; padding: 12rpx; border-radius: $sg-radius; }

.sec { font-size: 30rpx; font-weight: 700; padding: 26rpx 28rpx 12rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 24rpx; }
.demo { font-size: 24rpx; color: $sg-primary; background: $sg-primary-light; padding: 8rpx 22rpx; border-radius: 999rpx; }

.coop { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 14rpx; padding: 20rpx; }
.coop-ic { font-size: 40rpx; margin-right: 16rpx; }
.coop-i { flex: 1; display: flex; flex-direction: column; }
.coop-n { font-size: 27rpx; font-weight: 700; }
.coop-m { font-size: 21rpx; color: $sg-text-3; margin-top: 4rpx; }
.coop-s { font-size: 21rpx; color: $sg-primary; font-weight: 600; }

.ends { display: flex; flex-wrap: wrap; gap: 16rpx; padding: 0 24rpx; }
.end { width: calc((100% - 32rpx) / 3); box-sizing: border-box; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx 12rpx; display: flex; flex-direction: column; align-items: center; }
.end-ic { font-size: 42rpx; }
.end-n { font-size: 22rpx; font-weight: 700; margin-top: 8rpx; text-align: center; }
.end-c { font-size: 20rpx; color: $sg-gold; font-weight: 700; margin-top: 4rpx; }
.end-b { font-size: 18rpx; color: $sg-text-3; text-align: center; margin-top: 4rpx; line-height: 1.3; }

.fl { display: flex; opacity: 0.5; transition: opacity 0.3s; }
.fl.on { opacity: 1; }
.fl-axis { display: flex; flex-direction: column; align-items: center; margin-right: 20rpx; }
.fl-dot { width: 46rpx; height: 46rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; }
.fl-dot.on { background: $sg-primary; }
.fl-line { flex: 1; width: 4rpx; background: $sg-border; min-height: 24rpx; margin: 4rpx 0; }
.fl-line.on { background: $sg-primary; }
.fl-i { flex: 1; display: flex; flex-direction: column; padding-bottom: 22rpx; }
.fl-t { font-size: 25rpx; font-weight: 600; }
.fl-d { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; line-height: 1.4; }
.fl-done { font-size: 22rpx; color: $sg-primary; background: $sg-primary-light; padding: 16rpx; border-radius: $sg-radius; line-height: 1.6; }

.rel { background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 14rpx; padding: 20rpx 22rpx; }
.rel-hd { display: flex; align-items: center; margin-bottom: 10rpx; }
.rel-ic { font-size: 30rpx; margin-right: 12rpx; }
.rel-t { font-size: 26rpx; font-weight: 700; }
.rel-pts { display: flex; flex-direction: column; }
.rel-p { font-size: 22rpx; color: $sg-text-2; line-height: 1.7; }

.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
</style>
