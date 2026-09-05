<script setup lang="ts">
import { ref, computed } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

// 区域公用品牌资产
const brands = [
  { k: "orange", emoji: "🍊", name: "赣南脐橙", region: "江西省赣州市", value: 691, firms: 320, premium: 28, output: "170 亿", op: "赣州市脐橙产业协会 + 供销社运营", color: "#e8830c" },
  { k: "rice", emoji: "🌾", name: "五常大米", region: "黑龙江省哈尔滨市五常市", value: 713, firms: 280, premium: 35, output: "138 亿", op: "五常市大米产业协会运营", color: "#16884c" },
  { k: "apple", emoji: "🍎", name: "威宁苹果", region: "贵州省毕节市威宁县", value: 62, firms: 96, premium: 18, output: "24 亿", op: "威宁县 + 帮扶协作运营", color: "#c0392b" },
];
const bi = ref(0);
const brand = computed(() => brands[bi.value]);

// 授权用标准入 4 步
const admit = [
  { t: "资质核验", d: "产地在授权地域范围内、主体已确权、无失信记录" },
  { t: "品质达标", d: "农残全项合格、等级/糖度/果径达标准，第三方检测" },
  { t: "信誉门槛", d: "信用评级达标、无质量违规、有背书人担保" },
  { t: "授权发码", d: "签用标授权书、发放一品一码防伪标，纳入监管" },
];

// —— 一品一码防伪核验（可交互）——
interface Code { code: string; label: string; type: "ok" | "fake" | "revoked"; title: string; detail: string; }
const codes: Code[] = [
  { code: "GN2026-0781-A2F9", label: "扫描：包装上防伪码 A", type: "ok",
    title: "✅ 授权正品",
    detail: "江西省赣州市信丰县安西镇范庄村赣南脐橙合作社 · 授权有效期内 · 产地/等级核验一致 · 可享「赣南脐橙」品牌溢价 28%" },
  { code: "GN2026-8830-K7X1", label: "扫描：某电商包装防伪码 B", type: "fake",
    title: "⛔ 未授权冒用",
    detail: "该码不在授权库、产地非赣南脐橙地域范围（实为外省普通橙冒充）· 已推送品牌办查处、纳入打假黑名单、通报电商平台下架" },
  { code: "GN2025-0663-D4M0", label: "扫描：曾授权主体防伪码 C", type: "revoked",
    title: "⚠️ 已摘牌停用",
    detail: "该主体上季因农残超标、品质违规被摘牌，已停止用标资格 · 不得再用「赣南脐橙」品牌 · 信用降级、进失信名单、背书人连带" },
];
const cvi = ref(0);
const running = ref(false);
const done = ref(false);
function verify() {
  if (productionBuild) return uni.showModal({ title: "需要品牌核验服务", content: "正式环境的授权用标、防伪码和证书状态必须由品牌管理/认证机构接口返回并留痕，当前未执行本地验真。", showCancel: false });
  done.value = false; running.value = true;
  const t = setInterval(() => { clearInterval(t); running.value = false; done.value = true; }, 900);
}
function pick(i: number) { cvi.value = i; done.value = false; running.value = false; }
const cv = computed(() => codes[cvi.value]);
const cvColor = computed(() => cv.value.type === "ok" ? "#16884c" : cv.value.type === "revoked" ? "#d99a2b" : "#c0392b");

// 良币驱逐劣币
const good = ["享品牌溢价、优先推荐位", "授信额度上浮、利率下浮", "进「授权正品」推荐榜", "带动订单、稳定包销"];
const bad = ["摘牌停用、不得用标", "信用降级、进失信黑名单", "冒用移交查处、通报下架", "背书人连带、屡犯失格"];

// 品牌溢价回流
const flow = [
  { who: "守标农户 / 合作社", pct: 60, d: "品质达标者拿走品牌溢价大头", color: "#16884c" },
  { who: "品牌运营 / 品控基金", pct: 25, d: "用于检测、打假、品牌推广、标准升级", color: "#2b6cb0" },
  { who: "村集体 / 产业发展", pct: 15, d: "反哺集体、扩大标准化生产", color: "#d99a2b" },
];

function nav(url: string) { uni.navigateTo({ url }); }
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🏆 区域公用品牌运营中心</text>
      <text class="hs">把「赣南脐橙」这类地标做成品牌资产：授权用标、一品一码防伪、守标者享溢价、冒用劣质者摘牌——好品质卖出好价钱，良币驱逐劣币。</text>
    </view>

    <!-- 品牌资产 -->
    <view class="sec">区域公用品牌资产</view>
    <scroll-view scroll-x class="brands">
      <view class="br" :class="{ on: bi === i }" v-for="(b, i) in brands" :key="b.k" @tap="bi = i"
        :style="bi === i ? { borderColor: b.color, background: '#fff' } : {}">
        <text class="br-em">{{ b.emoji }}</text><text class="br-n">{{ b.name }}</text>
      </view>
    </scroll-view>
    <view class="bd">
      <view class="bd-hd"><text class="bd-em">{{ brand.emoji }}</text><view class="bd-hi"><text class="bd-n">{{ brand.name }}</text><text class="bd-r">{{ brand.region }} · {{ brand.op }}</text></view></view>
      <view class="bd-stat">
        <view class="bs"><text class="bs-v" :style="{ color: brand.color }">{{ brand.value }}<text class="bs-u">亿</text></text><text class="bs-l">品牌价值</text></view>
        <view class="bs"><text class="bs-v" :style="{ color: brand.color }">{{ brand.firms }}<text class="bs-u">家</text></text><text class="bs-l">授权企业</text></view>
        <view class="bs"><text class="bs-v" :style="{ color: brand.color }">+{{ brand.premium }}<text class="bs-u">%</text></text><text class="bs-l">品牌溢价</text></view>
        <view class="bs"><text class="bs-v" :style="{ color: brand.color }">{{ brand.output }}</text><text class="bs-l">年产值</text></view>
      </view>
    </view>

    <!-- 授权用标准入 -->
    <view class="sec">授权用标 · 谁能用（良币准入门槛）</view>
    <view class="admit">
      <view class="ad" v-for="(a, i) in admit" :key="i">
        <view class="ad-n">{{ i + 1 }}</view>
        <view class="ad-i"><text class="ad-t">{{ a.t }}</text><text class="ad-d">{{ a.d }}</text></view>
      </view>
    </view>

    <!-- 一品一码防伪核验 -->
    <view class="sec">一品一码 · 防伪核验（扫码验真伪）</view>
    <view class="vf">
      <view class="vf-codes">
        <text class="vc" :class="{ on: cvi === i }" v-for="(c, i) in codes" :key="i" @tap="pick(i)">{{ c.label }}</text>
      </view>
      <view class="vf-code">防伪码：<text class="vf-mono">{{ cv.code }}</text></view>
      <view class="vf-btn" @tap="verify">{{ running ? '链上核验中…' : (done ? '↻ 重新核验' : '🔍 一键核验') }}</view>
      <view v-if="done" class="vf-res" :style="{ borderColor: cvColor, background: cv.type === 'ok' ? '#eaf7ef' : cv.type === 'revoked' ? '#fdf6e8' : '#fdeceb' }">
        <text class="vr-t" :style="{ color: cvColor }">{{ cv.title }}</text>
        <text class="vr-d">{{ cv.detail }}</text>
      </view>
    </view>

    <!-- 良币驱逐劣币 -->
    <view class="sec">良币驱逐劣币</view>
    <view class="gb">
      <view class="gb-col good">
        <text class="gb-h">🏅 守标者（正品·达标）</text>
        <text class="gb-i" v-for="(g, i) in good" :key="i">＋ {{ g }}</text>
      </view>
      <view class="gb-col bad">
        <text class="gb-h">🚫 冒用/劣质者</text>
        <text class="gb-i" v-for="(b, i) in bad" :key="i">－ {{ b }}</text>
      </view>
    </view>

    <!-- 品牌溢价回流 -->
    <view class="sec">品牌溢价回流（卖得越好、守标者越受益）</view>
    <view class="pf">
      <view class="pfr" v-for="p in flow" :key="p.who">
        <view class="pf-top"><text class="pf-who">{{ p.who }}</text><text class="pf-pct" :style="{ color: p.color }">{{ p.pct }}%</text></view>
        <view class="pf-track"><view class="pf-fill" :style="{ width: p.pct + '%', background: p.color }"></view></view>
        <text class="pf-d">{{ p.d }}</text>
      </view>
    </view>

    <!-- 关联 -->
    <view class="links">
      <view class="lk" @tap="nav('/pages/cert/index')"><text class="lk-ic">🏅</text><view class="lk-i"><text class="lk-t">品质认证是用标前提</text><text class="lk-d">绿色/有机/地标认证达标,才能申请品牌授权</text></view><text class="lk-go">›</text></view>
      <view class="lk" @tap="nav('/pages/trace/fullchain')"><text class="lk-ic">🔍</text><view class="lk-i"><text class="lk-t">扫码溯源验产地真伪</text><text class="lk-d">防伪码联动全链溯源,冒用无处遁形</text></view><text class="lk-go">›</text></view>
      <view class="lk" @tap="nav('/pages/party/endorse')"><text class="lk-ic">🤝</text><view class="lk-i"><text class="lk-t">背书人连带担责</text><text class="lk-d">用标主体违规摘牌,背书的党组织连带扣分</text></view><text class="lk-go">›</text></view>
    </view>

    <view class="tip">🔗 区域公用品牌是全体守标者共有的无形资产,最怕"一颗老鼠屎坏一锅汤"——个别冒用、以次充好会砸掉整个地标的招牌。运营中心用"严准入、强监管、一品一码防伪、违规即摘牌"守住品质底线,让守标的好农户拿到品牌溢价、劣质冒用者被踢出局。品质→品牌→溢价→反哺品质,飞轮转起来,良币驱逐劣币。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #d99a2b, #b5791b); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.95; margin-top: 8rpx; display: block; line-height: 1.6; }
.sec { font-size: 28rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.brands { white-space: nowrap; padding: 0 24rpx; }
.br { display: inline-flex; flex-direction: column; align-items: center; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 16rpx 24rpx; margin-right: 14rpx; border: 3rpx solid transparent; }
.br-em { font-size: 38rpx; }
.br-n { font-size: 22rpx; font-weight: 700; margin-top: 4rpx; }
.bd { margin: 16rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.bd-hd { display: flex; align-items: center; }
.bd-em { font-size: 50rpx; margin-right: 14rpx; }
.bd-hi { flex: 1; display: flex; flex-direction: column; }
.bd-n { font-size: 30rpx; font-weight: 800; }
.bd-r { font-size: 19rpx; color: $sg-text-3; margin-top: 3rpx; }
.bd-stat { display: flex; margin-top: 16rpx; padding-top: 16rpx; border-top: 2rpx solid $sg-bg; }
.bs { flex: 1; display: flex; flex-direction: column; align-items: center; }
.bs-v { font-size: 28rpx; font-weight: 800; }
.bs-u { font-size: 16rpx; font-weight: 400; margin-left: 1rpx; }
.bs-l { font-size: 18rpx; color: $sg-text-3; margin-top: 3rpx; }
.admit { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 22rpx; }
.ad { display: flex; align-items: flex-start; padding: 12rpx 0; border-top: 2rpx solid $sg-bg; }
.ad:first-child { border-top: none; }
.ad-n { width: 40rpx; height: 40rpx; flex: none; border-radius: 50%; background: #d99a2b; color: #fff; font-size: 22rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-right: 14rpx; }
.ad-i { flex: 1; display: flex; flex-direction: column; }
.ad-t { font-size: 24rpx; font-weight: 700; }
.ad-d { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; line-height: 1.4; }
.vf { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx 22rpx; }
.vf-codes { display: flex; flex-direction: column; gap: 10rpx; }
.vc { font-size: 21rpx; padding: 14rpx 16rpx; border-radius: $sg-radius; background: $sg-bg; color: $sg-text-2; font-weight: 600; border: 2rpx solid transparent; }
.vc.on { background: #fdf6e8; border-color: #e6c67a; color: #b5791b; }
.vf-code { font-size: 20rpx; color: $sg-text-3; margin: 12rpx 0; }
.vf-mono { font-family: monospace; font-size: 22rpx; color: $sg-text; font-weight: 700; }
.vf-btn { text-align: center; padding: 20rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #d99a2b, #b5791b); color: #fff; font-size: 25rpx; font-weight: 700; }
.vf-res { margin-top: 16rpx; padding: 18rpx; border-radius: $sg-radius; border: 2rpx solid; }
.vr-t { font-size: 27rpx; font-weight: 800; }
.vr-d { font-size: 20rpx; color: $sg-text-2; margin-top: 8rpx; display: block; line-height: 1.6; }
.gb { display: flex; gap: 14rpx; margin: 0 24rpx; }
.gb-col { flex: 1; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx; }
.gb-col.good { background: linear-gradient(160deg, #eaf7ef, #fff); border: 2rpx solid #b6e0c6; }
.gb-col.bad { background: linear-gradient(160deg, #fdeceb, #fff); border: 2rpx solid #f2cdc8; }
.gb-h { font-size: 22rpx; font-weight: 800; display: block; margin-bottom: 8rpx; }
.gb-col.good .gb-h { color: #16884c; }
.gb-col.bad .gb-h { color: #c0392b; }
.gb-i { font-size: 20rpx; color: $sg-text-2; display: block; line-height: 1.8; }
.pf { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx 22rpx; }
.pfr { margin-bottom: 14rpx; }
.pf-top { display: flex; align-items: baseline; justify-content: space-between; }
.pf-who { font-size: 23rpx; font-weight: 600; }
.pf-pct { font-size: 26rpx; font-weight: 800; }
.pf-track { height: 20rpx; background: $sg-bg; border-radius: 999rpx; overflow: hidden; margin: 8rpx 0 4rpx; }
.pf-fill { height: 100%; border-radius: 999rpx; }
.pf-d { font-size: 19rpx; color: $sg-text-3; }
.links { margin: 20rpx 24rpx 0; }
.lk { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; margin-bottom: 12rpx; }
.lk-ic { width: 64rpx; height: 64rpx; border-radius: 18rpx; background: #fdf6e8; display: flex; align-items: center; justify-content: center; font-size: 34rpx; margin-right: 14rpx; flex: none; }
.lk-i { flex: 1; display: flex; flex-direction: column; }
.lk-t { font-size: 25rpx; font-weight: 700; }
.lk-d { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; }
.lk-go { font-size: 30rpx; color: $sg-text-3; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
</style>
