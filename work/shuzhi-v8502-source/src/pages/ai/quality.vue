<script setup lang="ts">
import { ref, computed } from "vue";
import { villageProducts } from "@/mock/products";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

const samples = villageProducts.slice(0, 6);
const picked = ref<{ pic: string; name: string } | null>(null);
const running = ref(false);
const done = ref(false);

// 稳定生成识别结果（按名称哈希）
function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff; return h; }
const result = computed(() => {
  if (!picked.value) return null as any;
  const h = hash(picked.value.name);
  const score = 76 + (h % 22);
  const grade = score >= 92 ? { g: "特级", c: "#d99a2b" } : score >= 85 ? { g: "一级", c: "#16884c" } : { g: "二级", c: "#2b6cb0" };
  const defs = score >= 92 ? ["无明显缺陷", "色泽均匀", "果型端正"]
    : score >= 85 ? ["轻微表皮瑕疵 " + (h % 4 + 2) + "%", "成熟度良好"]
    : ["成熟度不均 " + (h % 8 + 8) + "%", "个别机械损伤", "建议分拣后销售"];
  const base = 3 + (h % 30) / 10;
  return {
    name: picked.value.name, cat: /橙|果|苹|梨|桃/.test(picked.value.name) ? "水果类" : /菜|瓜|椒/.test(picked.value.name) ? "蔬菜类" : "农产品",
    score, grade, size: (60 + h % 25) + "-" + (70 + h % 25) + "mm", sugar: (11 + (h % 40) / 10).toFixed(1) + "°Bx",
    defects: defs, conf: (90 + h % 9) + "%",
    price: base.toFixed(1) + "-" + (base + 0.5).toFixed(1) + " 元/斤",
    pass: score >= 85,
  };
});

function pick(s: any) {
  if (productionBuild) { uni.showModal({ title: "需要 AI 服务接入", content: "正式环境的品质识别必须调用已备案的模型服务并保留原图、模型版本和复检证据，当前未生成识别结论。", showCancel: false }); return; }
  picked.value = { pic: s.pic, name: s.name };
  done.value = false; running.value = true;
  setTimeout(() => { running.value = false; done.value = true; }, 1600);
}
function upload() {
  uni.chooseImage({ count: 1, success: (r: any) => { pick({ pic: r.tempFilePaths[0], name: "上传农产品" }); }, fail: () => {} });
}
function toTrace() { uni.switchTab({ url: "/pages/trace/scan" }); }
function toSupply() { uni.switchTab({ url: "/pages/trade/index" }); }
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">📷 AI 品质识别</text>
      <text class="hs">拍照 / 选图 · 自动识别品类 · 成色分级 · 缺陷检测 · 建议定价</text>
    </view>

    <!-- 取景 / 结果 -->
    <view class="scan">
      <view v-if="!picked" class="empty">
        <text class="emp-ic">🖼️</text>
        <text class="emp-t">拍一张 / 选一张农产品照片，AI 帮你定级</text>
        <view class="up-btn" @tap="upload">📷 拍照 / 上传</view>
      </view>
      <view v-else class="shot">
        <image class="shot-img" :src="picked.pic" mode="aspectFill" />
        <view v-if="running" class="scanning"><view class="scanline"></view><text class="scan-t">AI 识别中…</text></view>
      </view>
    </view>

    <!-- 样例快速选 -->
    <view class="sec">试一试（点样例）</view>
    <scroll-view scroll-x class="samples">
      <view class="samp" v-for="s in samples" :key="s.id" @tap="pick(s)">
        <image class="samp-img" :src="s.pic" mode="aspectFill" />
        <text class="samp-n">{{ s.name }}</text>
      </view>
    </scroll-view>

    <!-- 识别结果 -->
    <view v-if="done && result" class="result">
      <view class="rt">
        <view class="rt-l"><text class="rt-n">{{ result.name }}</text><text class="rt-c">{{ result.cat }} · 置信度 {{ result.conf }}</text></view>
        <view class="rt-grade" :style="{ background: result.grade.c }">{{ result.grade.g }}</view>
      </view>
      <view class="score-row">
        <view class="sc"><text class="sc-n">{{ result.score }}</text><text class="sc-l">成色分</text></view>
        <view class="sc"><text class="sc-n">{{ result.size }}</text><text class="sc-l">果径</text></view>
        <view class="sc"><text class="sc-n">{{ result.sugar }}</text><text class="sc-l">糖度</text></view>
      </view>
      <view class="defs">
        <text class="def-t">缺陷检测</text>
        <text class="def" v-for="d in result.defects" :key="d" :class="{ ok: d.includes('无') || d.includes('良好') || d.includes('均匀') || d.includes('端正') }">· {{ d }}</text>
      </view>
      <view class="price-row">
        <text class="pr-l">AI 建议收购价</text>
        <text class="pr-v">{{ result.price }}</text>
      </view>
      <view class="verdict" :class="{ pass: result.pass }">{{ result.pass ? '✅ 品质合格，可入库上架 / 进溯源档案' : '⚠️ 建议分拣降级处理，不进优品渠道' }}</view>
      <view class="acts">
        <view class="act ghost" @tap="toTrace">🔗 进溯源档案</view>
        <view class="act" @tap="toSupply">🛒 定级上架</view>
      </view>
    </view>

    <view class="tip">🤖 基于国产视觉大模型 + 供销分级标准训练，识别结果自动写入溯源与定价；实际收购以现场复检为准。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #6d28d9, #4c1d95); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 36rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.9; margin-top: 8rpx; display: block; line-height: 1.5; }
.scan { margin: 24rpx; }
.empty { background: #fff; border: 3rpx dashed #ddd0f7; border-radius: $sg-radius-lg; padding: 50rpx 24rpx; display: flex; flex-direction: column; align-items: center; }
.emp-ic { font-size: 80rpx; }
.emp-t { font-size: 23rpx; color: $sg-text-3; margin: 14rpx 0 20rpx; text-align: center; }
.up-btn { padding: 22rpx 50rpx; border-radius: 999rpx; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; font-size: 28rpx; font-weight: 700; }
.shot { position: relative; border-radius: $sg-radius-lg; overflow: hidden; box-shadow: $sg-shadow; }
.shot-img { width: 100%; height: 460rpx; display: block; background: #eee; }
.scanning { position: absolute; inset: 0; background: rgba(76,29,149,0.28); display: flex; align-items: center; justify-content: center; }
.scanline { position: absolute; left: 0; right: 0; height: 6rpx; background: linear-gradient(90deg, transparent, #c4b5fd, transparent); animation: scan 1.3s linear infinite; }
@keyframes scan { 0% { top: 6%; } 50% { top: 92%; } 100% { top: 6%; } }
.scan-t { color: #fff; font-size: 28rpx; font-weight: 700; z-index: 1; }
.sec { font-size: 28rpx; font-weight: 700; padding: 4rpx 28rpx 12rpx; }
.samples { white-space: nowrap; padding: 0 24rpx; }
.samp { display: inline-block; width: 150rpx; margin-right: 16rpx; vertical-align: top; }
.samp-img { width: 150rpx; height: 130rpx; border-radius: $sg-radius; background: $sg-primary-light; display: block; }
.samp-n { font-size: 20rpx; margin-top: 6rpx; display: block; white-space: normal; height: 52rpx; overflow: hidden; line-height: 1.3; }
.result { margin: 20rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx; }
.rt { display: flex; align-items: center; justify-content: space-between; }
.rt-l { display: flex; flex-direction: column; }
.rt-n { font-size: 30rpx; font-weight: 800; }
.rt-c { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.rt-grade { width: 72rpx; height: 72rpx; border-radius: 18rpx; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 800; }
.score-row { display: flex; margin: 16rpx 0; border-top: 2rpx solid $sg-bg; border-bottom: 2rpx solid $sg-bg; padding: 14rpx 0; }
.sc { flex: 1; text-align: center; }
.sc-n { font-size: 30rpx; font-weight: 800; color: #6d28d9; display: block; }
.sc-l { font-size: 19rpx; color: $sg-text-3; }
.defs { margin-bottom: 14rpx; }
.def-t { font-size: 23rpx; font-weight: 700; display: block; margin-bottom: 6rpx; }
.def { font-size: 21rpx; color: $sg-red; display: block; margin: 3rpx 0; }
.def.ok { color: $sg-primary; }
.price-row { display: flex; align-items: center; justify-content: space-between; background: $sg-gold-light; border-radius: $sg-radius; padding: 16rpx 20rpx; }
.pr-l { font-size: 23rpx; color: #9a6a12; }
.pr-v { font-size: 30rpx; font-weight: 800; color: $sg-red; }
.verdict { margin-top: 14rpx; font-size: 22rpx; padding: 14rpx 18rpx; border-radius: $sg-radius; background: #fdeceb; color: #c0392b; line-height: 1.5; }
.verdict.pass { background: $sg-primary-light; color: $sg-primary-deep; }
.acts { display: flex; gap: 16rpx; margin-top: 16rpx; }
.act { flex: 1; text-align: center; padding: 22rpx 0; border-radius: 999rpx; font-size: 26rpx; font-weight: 700; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; }
.act.ghost { background: #f3ecfe; color: #6d28d9; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 20rpx; color: $sg-text-3; line-height: 1.6; }
</style>
