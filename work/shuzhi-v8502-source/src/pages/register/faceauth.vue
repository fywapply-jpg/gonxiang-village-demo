<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useAuthStore } from "@/store/auth";
const auth = useAuthStore();
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const scene = ref<"legal" | "admin" | "review" | "pay">("legal");
const name = ref("");
onLoad((q: any) => { if (q?.scene) scene.value = q.scene; if (q?.name) name.value = decodeURIComponent(q.name); });

const cfgMap: Record<string, { title: string; sub: string; who: string }> = {
  admin: { title: "管理员操作 · 人脸核验", sub: "关键操作前须本人人脸核验，全程留痕上链", who: "管理员本人" },
  review: { title: "订单人工复核 · 人脸核验", sub: "复核放行前须复核人本人人脸核验（权）", who: "复核人本人" },
  pay: { title: "大额付款 · 人脸核验", sub: "大额资金支付前须付款人本人人脸核验（钱）", who: "付款人本人" },
  legal: { title: "法人人脸实名认证", sub: "核验法定代表人身份，绑定链上身份 DID", who: "" },
};
const cfg = computed(() => {
  const c = cfgMap[scene.value] || cfgMap.legal;
  return scene.value === "legal" ? { ...c, who: name.value || "法定代表人" } : c;
});

const stages = [
  { t: "请将面部对准取景框", p: 10 },
  { t: "活体检测 · 请眨眨眼", p: 35 },
  { t: "活体检测 · 请缓慢点头", p: 60 },
  { t: "比对公安/主体身份库中…", p: 85 },
  { t: "认证通过", p: 100 },
];
const running = ref(false);
const done = ref(false);
const idx = ref(-1);
const progress = ref(0);
const status = computed(() => (idx.value < 0 ? "点击下方开始人脸识别" : stages[idx.value].t));

function start() {
  if (productionBuild) return uni.showModal({ title: "需要实名核验服务", content: "正式环境的人脸/短信核验必须由已备案的身份服务完成，并返回可审计的核验凭证；当前未执行本地核验。", showCancel: false });
  if (running.value || done.value) return;
  running.value = true; idx.value = 0; progress.value = stages[0].p;
  const timer = setInterval(() => {
    idx.value++;
    if (idx.value >= stages.length) {
      clearInterval(timer);
      progress.value = 100; running.value = false; done.value = true;
      if (scene.value === "admin") auth.verifyAdmin();
      else if (scene.value === "legal") auth.verifyLegal(name.value);
      else auth.grantFace(scene.value); // review / pay 一次性令牌
      return;
    }
    progress.value = stages[idx.value].p;
  }, 850);
}
function finish() { uni.navigateBack(); }

// 替代核验方式（合规要求「不得强制刷脸」+ 适老：老人/无法刷脸可用短信验证码）
function grant() {
  if (productionBuild) return uni.showModal({ title: "需要实名核验服务", content: "正式环境不能用本地按钮替代人脸或短信核验，请接入身份服务后再继续。", showCancel: false });
  if (scene.value === "admin") auth.verifyAdmin();
  else if (scene.value === "legal") auth.verifyLegal(name.value);
  else auth.grantFace(scene.value);
}
function smsVerify() {
  if (productionBuild) return uni.showModal({ title: "需要短信核验服务", content: "正式环境短信验证码必须由身份服务发送并校验，当前未执行本地核验。", showCancel: false });
  uni.showModal({
    title: "短信验证码核验", editable: true, placeholderText: "输入手机收到的 6 位验证码", confirmText: "核验",
    success: (r) => { if (r.confirm) { grant(); done.value = true; running.value = false; progress.value = 100; idx.value = stages.length - 1; uni.showToast({ title: "短信核验通过", icon: "success" }); } },
  });
}
</script>

<template>
  <view class="page">
    <view class="top">
      <text class="tt">{{ cfg.title }}</text>
      <text class="ts">{{ cfg.sub }}</text>
    </view>

    <!-- 取景框 -->
    <view class="scan">
      <view class="ring" :class="{ run: running, done: done }">
        <view class="face">{{ done ? '✅' : '👤' }}</view>
        <view v-if="running" class="scanline"></view>
      </view>
      <view class="dots">
        <view class="dot" v-for="(s, i) in stages" :key="i" :class="{ on: progress >= s.p }"></view>
      </view>
      <text class="status" :class="{ ok: done }">{{ done ? '✅ ' + cfg.who + ' 身份核验通过' : status }}</text>
      <view class="pbar"><view class="pfill" :style="{ width: progress + '%' }"></view></view>
    </view>

    <!-- 认证信息 -->
    <view v-if="done" class="card">
      <view class="row"><text class="k">核验对象</text><text class="v">{{ cfg.who }}</text></view>
      <view class="row"><text class="k">活体检测</text><text class="v ok">通过</text></view>
      <view class="row"><text class="k">身份比对</text><text class="v ok">一致</text></view>
      <view v-if="scene === 'legal'" class="row"><text class="k">链上身份</text><text class="v mono">{{ auth.legalDid }}</text></view>
      <view class="row"><text class="k">核验存证</text><text class="v mono">0x7af1…c4 已上链</text></view>
    </view>
    <view v-else class="tips">
      <text class="tip-t">🔒 认证说明</text>
      <text class="tip-i">· 采用活体检测，防照片/视频/面具冒用</text>
      <text class="tip-i">· 人脸信息加密比对，不留存原始图像</text>
      <text class="tip-i">· 核验结果哈希上链存证，可追溯</text>
      <text class="tip-i">· 人脸为敏感信息，采集需<text style="color:#4fe39b">单独同意</text>，并提供替代方式，可随时拒绝</text>
    </view>

    <view class="bar">
      <view v-if="!done" class="btn" :class="{ dis: running }" @tap="start">{{ running ? '识别中…' : '开始人脸识别' }}</view>
      <view v-if="!done" class="alt" @tap="smsVerify">改用短信验证码核验（老人 / 无法刷脸可选）</view>
      <view v-else class="btn" @tap="finish">完成，返回</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.page { min-height: 100vh; background: linear-gradient(170deg, #10241a, #0c1a13); display: flex; flex-direction: column; }
.top { padding: 50rpx 40rpx 20rpx; text-align: center; }
.tt { font-size: 38rpx; font-weight: 800; color: #fff; display: block; }
.ts { font-size: 22rpx; color: rgba(255,255,255,0.6); margin-top: 10rpx; display: block; }
.scan { display: flex; flex-direction: column; align-items: center; padding: 30rpx 40rpx; }
.ring { width: 380rpx; height: 380rpx; border-radius: 50%; border: 6rpx dashed rgba(47,174,107,0.5); display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; background: radial-gradient(circle, rgba(47,174,107,0.12), transparent 70%); }
.ring.run { border-style: solid; border-color: #2fae6b; animation: pulse 1s infinite; }
.ring.done { border-color: #2fae6b; border-style: solid; background: radial-gradient(circle, rgba(47,174,107,0.25), transparent 70%); }
@keyframes pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(47,174,107,0.4); } 50% { box-shadow: 0 0 0 20rpx rgba(47,174,107,0); } }
.face { font-size: 160rpx; }
.scanline { position: absolute; left: 8%; right: 8%; height: 6rpx; background: linear-gradient(90deg, transparent, #4fe39b, transparent); animation: scan 1.4s linear infinite; }
@keyframes scan { 0% { top: 12%; } 50% { top: 84%; } 100% { top: 12%; } }
.dots { display: flex; gap: 14rpx; margin-top: 28rpx; }
.dot { width: 16rpx; height: 16rpx; border-radius: 50%; background: rgba(255,255,255,0.2); }
.dot.on { background: #2fae6b; }
.status { font-size: 26rpx; color: #cfe9dc; margin-top: 22rpx; font-weight: 600; }
.status.ok { color: #4fe39b; }
.pbar { width: 100%; height: 10rpx; background: rgba(255,255,255,0.12); border-radius: 999rpx; margin-top: 20rpx; overflow: hidden; }
.pfill { height: 100%; background: linear-gradient(90deg, #2fae6b, #4fe39b); border-radius: 999rpx; transition: width 0.6s; }
.card { margin: 20rpx 40rpx; background: rgba(255,255,255,0.06); border: 2rpx solid rgba(47,174,107,0.3); border-radius: 24rpx; padding: 24rpx; }
.row { display: flex; padding: 14rpx 0; border-top: 2rpx solid rgba(255,255,255,0.08); }
.row:first-child { border-top: none; }
.k { width: 160rpx; font-size: 24rpx; color: rgba(255,255,255,0.55); }
.v { flex: 1; font-size: 24rpx; color: #fff; }
.v.ok { color: #4fe39b; }
.v.mono { font-family: Menlo, Consolas, monospace; font-size: 20rpx; color: #9fd8bd; }
.tips { margin: 20rpx 40rpx; background: rgba(255,255,255,0.05); border-radius: 20rpx; padding: 22rpx; display: flex; flex-direction: column; gap: 10rpx; }
.tip-t { font-size: 24rpx; color: #cfe9dc; font-weight: 700; }
.tip-i { font-size: 21rpx; color: rgba(255,255,255,0.6); line-height: 1.5; }
.bar { margin-top: auto; padding: 24rpx 40rpx calc(30rpx + env(safe-area-inset-bottom)); }
.btn { text-align: center; padding: 28rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #2fae6b, #16884c); color: #fff; font-size: 30rpx; font-weight: 700; }
.btn.dis { opacity: 0.6; }
.alt { text-align: center; margin-top: 16rpx; font-size: 23rpx; color: rgba(255,255,255,0.75); text-decoration: underline; }
</style>
