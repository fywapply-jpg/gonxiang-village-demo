<script setup lang="ts">
import { ref, computed } from "vue";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

// 五类认证体系
const certTypes = [
  { key: "green", icon: "🟢", name: "绿色食品", org: "中国绿色食品发展中心", level: "A级 / AA级", desc: "产地环境达标 + 限用化学投入品 + 全程质控，绿标可查真伪" },
  { key: "organic", icon: "♻️", name: "有机产品", org: "认监委授权认证机构", level: "有机码一物一码", desc: "禁用化学合成农药化肥、转换期≥2年，最严投入品管控" },
  { key: "gi", icon: "📍", name: "地理标志农产品", org: "农业农村部", level: "农产品地理标志", desc: "特定地域 + 独特品质 + 地域名称，如赣南脐橙、五常大米" },
  { key: "micro", icon: "⛰️", name: "小产区", org: "行业协会 / 核心产区", level: "微域核心产区", desc: "地块/海拔/工艺更严标准，类 AOC 分级，稀缺高值" },
  { key: "pledge", icon: "✅", name: "承诺达标合格证", org: "生产者自我承诺", level: "食用农产品准入", desc: "带证上市基础门槛：自我承诺 + 快检 + 追溯，一票通" },
];

// 明星认证产品（cert 键对应 certTypes）
const products = [
  { key: "orange", emoji: "🍊", name: "赣南脐橙", origin: "江西信丰", certs: ["gi", "green"], no: "GI-2026-JX-0781", premium: "溢价 28%" },
  { key: "rice", emoji: "🌾", name: "五常大米", origin: "黑龙江五常", certs: ["gi", "pledge"], no: "GI-2026-HLJ-0210", premium: "溢价 35%" },
  { key: "tomato", emoji: "🍅", name: "寿光有机番茄", origin: "山东寿光", certs: ["organic", "green"], no: "OGA-2026-SD-0663", premium: "溢价 42%" },
  { key: "tea", emoji: "🍵", name: "狮峰龙井", origin: "杭州西湖狮峰", certs: ["gi", "micro"], no: "GI-2026-ZJ-0088", premium: "溢价 120%" },
];
const pi = ref(0);
const prod = computed(() => products[pi.value]);
const prodCerts = computed(() => prod.value.certs.map((k) => certTypes.find((c) => c.key === k)!));
function pick(i: number) { pi.value = i; reset(); }

// 全程认证 8 环节核验（认证嵌入每个环节，而非贴标）
const stages = [
  { n: "产地环境认证", d: "土壤/水/大气达标 · 无污染源 · 产地档案" },
  { n: "投入品准入", d: "绿色限用 / 有机禁用清单 · 统配可追溯" },
  { n: "标准化生产", d: "按认证标准 SOP 种养 · 数字农场记录" },
  { n: "过程记录管控", d: "农事/用药/投入品记录完整可查、上链" },
  { n: "采收加工", d: "加工环境工艺合规 · 无违禁添加" },
  { n: "检测检验", d: "农残/兽残/重金属全项达标 · 第三方报告" },
  { n: "包装赋码", d: "认证标志 + 防伪码 + 溯源码 三码合一" },
  { n: "上市标识核验", d: "证书有效期内 · 标志真伪链上核验 · 准予用标" },
];
const running = ref(false);
const step = ref(0);
const done = ref(false);
function verifyAll() {
  if (productionBuild) return uni.showModal({ title: "需要认证机构核验", content: "正式环境的认证证书、产地环境、投入品和检测结果必须由认证/检测机构接口返回，当前未执行本地达标判定。", showCancel: false });
  done.value = false; running.value = true; step.value = 0;
  const t = setInterval(() => { step.value++; if (step.value >= stages.length) { clearInterval(t); running.value = false; done.value = true; } }, 380);
}
function reset() { running.value = false; step.value = 0; done.value = false; }

function certVerify() {
  if (productionBuild) return uni.showModal({ title: "需要证书验真接口", content: "正式环境只能展示认证机构返回的证书状态、有效期和撤销信息，当前未生成验真结论。", showCancel: false });
  uni.showModal({ title: "证书链上核验 ✔", showCancel: false, confirmText: "已验真",
    content: `${prod.value.name}\n证书编号：${prod.value.no}\n发证机构核验：有效\n有效期内 · 标志真伪：真\n链上存证一致，防伪防冒用。` });
}
function toTrace() { uni.navigateTo({ url: "/pages/trace/fullchain" }); }
function toPremium() { uni.navigateTo({ url: "/pages/cert/premium" }); }
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty">
      <text class="production-empty-title">暂无认证机构回执</text>
      <text class="production-empty-text">正式环境的认证类型、证书编号、有效期、产品溢价和八环节结论必须由认证/检测机构接口返回。本页面不展示静态证书或达标结论。</text>
    </view>
    <template v-else>
    <view class="hero">
      <text class="ht">🏅 品质认证中心</text>
      <text class="hs">绿色 · 有机 · 地理标志 · 小产区——认证融入产地到上市每一环，全程可核验、可溯源、防伪防冒用</text>
    </view>

    <!-- 信誉分层收益入口 -->
    <view class="premium-lk" @tap="toPremium">
      <text class="pl-ic">⚖️</text>
      <view class="pl-i">
        <text class="pl-t">同品类 · 信誉不同 → 收益不同</text>
        <text class="pl-d">同样的脐橙、同样 100 吨：A+ 档 6.4 元/斤，C 档 3.9 元/斤还限流，一年差 ¥73 万</text>
      </view>
      <text class="pl-go">算给你看 ›</text>
    </view>

    <!-- 认证体系 -->
    <view class="sec">认证体系（五类）</view>
    <view class="types">
      <view class="ty" v-for="c in certTypes" :key="c.key">
        <text class="ty-ic">{{ c.icon }}</text>
        <view class="ty-i">
          <view class="ty-hd"><text class="ty-n">{{ c.name }}</text><text class="ty-lv">{{ c.level }}</text></view>
          <text class="ty-d">{{ c.desc }}</text>
          <text class="ty-org">主管：{{ c.org }}</text>
        </view>
      </view>
    </view>

    <!-- 明星认证产品 -->
    <view class="sec">选择认证产品</view>
    <view class="prods">
      <view class="pd" :class="{ on: pi === i }" v-for="(p, i) in products" :key="p.key" @tap="pick(i)">
        <text class="pd-e">{{ p.emoji }}</text>
        <text class="pd-n">{{ p.name }}</text>
        <text class="pd-o">{{ p.origin }}</text>
      </view>
    </view>

    <!-- 该产品持有认证 -->
    <view class="held">
      <view class="hl-hd">
        <text class="hl-t">{{ prod.emoji }} {{ prod.name }} · 持有认证</text>
        <text class="hl-pm">{{ prod.premium }}</text>
      </view>
      <view class="badges">
        <text class="bdg" v-for="c in prodCerts" :key="c.key">{{ c.icon }} {{ c.name }}</text>
      </view>
      <text class="hl-no">证书编号 {{ prod.no }}</text>
    </view>

    <!-- 全程认证核验 -->
    <view class="sec-row"><text class="sec">全程认证核验（8 环节）</text><text class="run" @tap="verifyAll">▶ 一键核验</text></view>
    <view class="sg-card">
      <view class="stg" v-for="(s, i) in stages" :key="i" :class="{ show: !running || step > i, ok: done || step > i }">
        <view class="stg-dot" :class="{ ok: done || step > i }">{{ (done || step > i) ? '✓' : i + 1 }}</view>
        <view class="stg-i"><text class="stg-n">{{ s.n }}</text><text class="stg-d">{{ s.d }}</text></view>
        <text class="stg-r" v-if="done || step > i">达标</text>
      </view>
      <view v-if="done" class="verdict">
        ✅ 八环全部达标 → 准予加施 {{ prodCerts.map(c => c.name).join(' + ') }} 标志上市，认证赋能 {{ prod.premium }}、优先采购、出口互认。
      </view>
    </view>

    <!-- 认证 + 溯源 一码双标 -->
    <view class="dual" @tap="toTrace">
      <text class="du-ic">🔗</text>
      <view class="du-i"><text class="du-t">认证 + 溯源 · 一码双标</text><text class="du-d">扫一个码：既看全链路溯源，又核验绿色/有机/地标证书真伪</text></view>
      <text class="du-go">看溯源 ›</text>
    </view>
    <view class="verify-btn" @tap="certVerify">🛡️ 证书链上核验 · 防伪防冒用</view>

    <!-- B2B 价值 -->
    <view class="sec">认证的 B2B 价值</view>
    <view class="vals">
      <view class="val"><text class="vl-ic">💰</text><text class="vl-t">认证溢价</text><text class="vl-d">绿色/有机/地标品普遍溢价 20%~120%</text></view>
      <view class="val"><text class="vl-ic">🚪</text><text class="vl-t">准入门槛</text><text class="vl-d">商超/央厨/机关食堂/出口优先或强制要求认证</text></view>
      <view class="val"><text class="vl-ic">🌐</text><text class="vl-t">出口互认</text><text class="vl-d">有机/GI 对接国际认证，跨境贸易通行证</text></view>
      <view class="val"><text class="vl-ic">🏷️</text><text class="vl-t">品牌增值</text><text class="vl-d">地标+小产区=区域公用品牌，带动集体增收</text></view>
    </view>

    <view class="tip">🔗 认证不是"贴个标"：产地环境、投入品、生产过程、检测、赋码每一环都按认证标准核验并上链，证书编号可链上验真、防冒用；认证与溯源一码贯通，让"绿色有机地标"从口号变成买家可查、可信、愿溢价的硬凭证。</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #16884c, #0f6b3b); padding: 34rpx 28rpx 26rpx; color: #fff; }
.premium-lk { display: flex; align-items: center; margin: 18rpx 24rpx 0; padding: 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #fdf6e3, #fff); border: 2rpx solid #e8d9a8; box-shadow: $sg-shadow; }
.pl-ic { font-size: 46rpx; margin-right: 14rpx; }
.pl-i { flex: 1; display: flex; flex-direction: column; }
.pl-t { font-size: 26rpx; font-weight: 800; color: #b8860b; }
.pl-d { font-size: 19rpx; color: $sg-text-3; margin-top: 4rpx; line-height: 1.45; }
.pl-go { font-size: 22rpx; color: #fff; background: #b8860b; padding: 8rpx 16rpx; border-radius: 999rpx; flex: none; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.94; margin-top: 8rpx; display: block; line-height: 1.5; }
.sec { font-size: 28rpx; font-weight: 700; padding: 22rpx 28rpx 12rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 24rpx; }
.run { font-size: 24rpx; color: #16884c; background: $sg-primary-light; padding: 8rpx 22rpx; border-radius: 999rpx; }
.types { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 8rpx 22rpx; }
.ty { display: flex; align-items: flex-start; padding: 16rpx 0; border-top: 2rpx solid $sg-bg; }
.ty:first-child { border-top: none; }
.ty-ic { font-size: 40rpx; margin-right: 14rpx; flex: none; }
.ty-i { flex: 1; display: flex; flex-direction: column; }
.ty-hd { display: flex; align-items: baseline; }
.ty-n { font-size: 26rpx; font-weight: 800; }
.ty-lv { font-size: 19rpx; color: #16884c; background: $sg-primary-light; padding: 2rpx 12rpx; border-radius: 999rpx; margin-left: 10rpx; }
.ty-d { font-size: 20rpx; color: $sg-text-2; margin-top: 4rpx; line-height: 1.45; }
.ty-org { font-size: 18rpx; color: $sg-text-3; margin-top: 3rpx; }
.prods { display: flex; gap: 12rpx; padding: 0 24rpx; }
.pd { flex: 1; display: flex; flex-direction: column; align-items: center; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 18rpx 4rpx; border: 3rpx solid transparent; }
.pd.on { border-color: #16884c; background: $sg-primary-light; }
.pd-e { font-size: 44rpx; }
.pd-n { font-size: 21rpx; font-weight: 700; margin-top: 4rpx; text-align: center; }
.pd-o { font-size: 17rpx; color: $sg-text-3; margin-top: 2rpx; }
.held { margin: 16rpx 24rpx 0; background: linear-gradient(135deg, #eaf7ef, #fff); border: 2rpx solid #b6e0c6; border-radius: $sg-radius-lg; padding: 22rpx; }
.hl-hd { display: flex; align-items: center; justify-content: space-between; }
.hl-t { font-size: 26rpx; font-weight: 800; }
.hl-pm { font-size: 24rpx; font-weight: 800; color: #d64541; }
.badges { display: flex; flex-wrap: wrap; gap: 10rpx; margin: 12rpx 0 8rpx; }
.bdg { font-size: 22rpx; font-weight: 700; color: #0f6b3b; background: #fff; border: 2rpx solid #b6e0c6; padding: 6rpx 16rpx; border-radius: 999rpx; }
.hl-no { font-size: 19rpx; color: $sg-text-3; }
.sg-card { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 22rpx; }
.stg { display: flex; align-items: center; padding: 14rpx 0; border-top: 2rpx solid $sg-bg; opacity: 0.4; transition: opacity 0.3s; }
.stg:first-child { border-top: none; }
.stg.show { opacity: 1; }
.stg-dot { width: 44rpx; height: 44rpx; flex: none; border-radius: 50%; background: $sg-border; color: #fff; font-size: 22rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; margin-right: 14rpx; }
.stg-dot.ok { background: #16884c; }
.stg-i { flex: 1; display: flex; flex-direction: column; }
.stg-n { font-size: 24rpx; font-weight: 600; }
.stg-d { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; line-height: 1.4; }
.stg-r { font-size: 21rpx; font-weight: 700; color: #16884c; flex: none; margin-left: 10rpx; }
.verdict { margin-top: 14rpx; padding: 16rpx 18rpx; border-radius: $sg-radius; background: $sg-primary-light; color: $sg-primary-deep; font-size: 22rpx; line-height: 1.6; font-weight: 600; }
.dual { display: flex; align-items: center; margin: 16rpx 24rpx 0; padding: 22rpx; background: linear-gradient(135deg, #eef6ff, #fff); border: 2rpx solid #cfe0f5; border-radius: $sg-radius-lg; }
.du-ic { font-size: 42rpx; margin-right: 14rpx; }
.du-i { flex: 1; display: flex; flex-direction: column; }
.du-t { font-size: 25rpx; font-weight: 800; color: #2b6cb0; }
.du-d { font-size: 19rpx; color: $sg-text-3; margin-top: 3rpx; line-height: 1.4; }
.du-go { font-size: 22rpx; color: #2b6cb0; }
.verify-btn { margin: 16rpx 24rpx 0; text-align: center; padding: 22rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #16884c, #0f6b3b); color: #fff; font-size: 26rpx; font-weight: 700; }
.vals { display: flex; flex-wrap: wrap; gap: 14rpx; padding: 0 24rpx; }
.val { width: calc(50% - 7rpx); box-sizing: border-box; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx; }
.vl-ic { font-size: 34rpx; }
.vl-t { font-size: 24rpx; font-weight: 700; display: block; margin-top: 6rpx; }
.vl-d { font-size: 19rpx; color: $sg-text-3; margin-top: 4rpx; display: block; line-height: 1.45; }
.tip { margin: 20rpx 24rpx 40rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
.production-empty { margin: 48rpx 24rpx; padding: 34rpx 28rpx; border: 2rpx solid #d8e7de; border-radius: 22rpx; background: #f7fbf8; }
.production-empty-title { display: block; color: #145d3c; font-size: 32rpx; font-weight: 900; }
.production-empty-text { display: block; margin-top: 16rpx; color: #5e7167; font-size: 24rpx; line-height: 1.7; }
</style>
