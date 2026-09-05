<script setup lang="ts">
import { ref, nextTick } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

interface Msg { role: "ai" | "me"; text: string; link?: { t: string; u: string } }
const msgs = ref<Msg[]>([
  { role: "ai", text: "你好，我是数智供社 AI 农技助手 🌾\n种植技术、病虫害、政策补贴、平台操作、价格行情都可以问我。下面选一个，或直接打字。" },
]);
const typing = ref(false);
const input = ref("");
const scrollId = ref("");

// 供销农技知识库（关键词 → 回答）
interface KB { kw: string[]; q: string; a: string; cat: string; link?: { t: string; u: string } }
const kb: KB[] = [
  { kw: ["小麦", "追肥", "返青", "施肥"], q: "小麦返青期怎么追肥？", cat: "种植技术",
    a: "返青拔节期是需肥关键期：\n· 亩追尿素 8-12kg，弱苗早追、旺苗晚追\n· 结合浇水施用、雨前撒施更省工\n· 缺锌缺硼可叶面补微肥\n建议先做土壤检测，按缺补配方。" },
  { kw: ["番茄", "黄叶", "卷叶", "叶子"], q: "番茄叶子发黄卷曲怎么办？", cat: "病虫害",
    a: "常见 3 类原因：\n① 缺素（缺镁/缺钾）→ 叶面补肥\n② 病毒病（蚜虫/粉虱传播）→ 先防虫、拔除病株\n③ 高温干旱生理性卷叶 → 遮阳补水\n拿不准可拍照用「AI 品质/病害识别」初判。" },
  { kw: ["补贴", "种粮", "政策", "惠农"], q: "种粮有哪些补贴可以申请？", cat: "政策补贴",
    a: "常见惠农补贴：\n· 耕地地力保护补贴（按承包地）\n· 实际种粮农民一次性补贴\n· 农机购置补贴、种子/农资补贴\n· 规模经营、绿色生产等专项\n具体以当地政策为准，可到基层服务站代办申领。",
    link: { t: "去基层服务站", u: "/pages/station/index" } },
  { kw: ["订单贷", "贷款", "融资", "资金", "农资贷"], q: "没钱买种子农资，怎么贷款？", cat: "平台操作",
    a: "平台对接持牌银行做「订单贷/农资贷」：\n· 有保底收购订单 → 可贷订单额 50% 预付款\n· 农资赊销「先用后付」，秋收订单款代扣\n· 放款由银行办理，平台不碰资金\n信用好、村支书背书的农户额度更高。",
    link: { t: "去融资申请", u: "/pages/finance/apply" } },
  { kw: ["大蒜", "价格", "行情", "走势", "卖", "什么时候"], q: "最近大蒜价格走势，什么时候卖合适？", cat: "价格行情",
    a: "近 7 日蒜价窄幅上行，AI 预测未来 7 日震荡偏强、置信度中等。\n建议：\n· 冷库有货可分批出、别一次清仓\n· 关注产区到货量与出库节奏\n更精细的走势看「AI 价格预测」。",
    link: { t: "看 AI 价格预测", u: "/pages/ai/index" } },
  { kw: ["溯源", "追溯", "码"], q: "怎么给我的农产品做溯源？", cat: "平台操作",
    a: "很简单：\n① 建档确权（村支书审核入白名单）\n② 农事打卡、投入品登记自动上链\n③ 收购品控合格 → 生成溯源码\n消费者扫码即可看到产地、村支书、检测报告全流程。",
    link: { t: "看溯源", u: "/pages/trace/scan" } },
  { kw: ["订单农业", "以销定产", "签约", "保底"], q: "订单农业怎么参加？保底价靠谱吗？", cat: "种植技术",
    a: "订单农业=以销定产：\n· 先签保底收购合同（随行就市不低于保底价）\n· 按标准种植、平台配套农资与技术\n· T+7 结算、品控否决制\n合同 CA 签章上链，违约有追责，比自己找销路稳。",
    link: { t: "看订单农业", u: "/pages/agri/contract" } },
];

const chips = kb.map((k) => k.q);

function push(m: Msg) { msgs.value.push(m); nextTick(() => { scrollId.value = "m" + (msgs.value.length - 1); }); }

function answer(text: string) {
  if (productionBuild) { uni.showModal({ title: "需要知识库服务接入", content: "正式环境的农技问答必须调用经审核的知识库/模型服务并保留版本与引用，当前未生成静态答复。", showCancel: false }); return; }
  const hit = kb.find((k) => k.kw.some((w) => text.includes(w)));
  typing.value = true;
  nextTick(() => { scrollId.value = "typing"; });
  setTimeout(() => {
    typing.value = false;
    if (hit) push({ role: "ai", text: hit.a, link: hit.link });
    else push({ role: "ai", text: "这个问题我先记下啦～ 我更擅长种植技术、病虫害、政策补贴、平台操作、价格行情。要不换个问法，或者我帮你转接供销农技专家？", link: { t: "转人工农技专家", u: "/pages/trade/chat?to=" + encodeURIComponent("供销农技专家") } });
  }, 900);
}

function ask(q: string) { push({ role: "me", text: q }); answer(q); }
function send() {
  const t = input.value.trim(); if (!t) return;
  input.value = "";
  ask(t);
}
</script>

<template>
  <view class="page">
    <scroll-view scroll-y class="chat" :scroll-into-view="scrollId" :scroll-with-animation="true">
      <view class="msg" :id="'m' + i" v-for="(m, i) in msgs" :key="i" :class="m.role">
        <view v-if="m.role === 'ai'" class="ava">AI</view>
        <view class="bubble" :class="m.role">
          <text class="btext">{{ m.text }}</text>
          <view v-if="m.link" class="blink" @tap="uni.navigateTo({ url: m.link.u })">{{ m.link.t }} ›</view>
        </view>
      </view>
      <view v-if="typing" id="typing" class="msg ai">
        <view class="ava">AI</view>
        <view class="bubble ai typing"><text class="dot"></text><text class="dot"></text><text class="dot"></text></view>
      </view>
      <view class="pad"></view>
    </scroll-view>

    <!-- 建议问题 -->
    <scroll-view scroll-x class="chips">
      <text class="chip" v-for="c in chips" :key="c" @tap="ask(c)">{{ c }}</text>
    </scroll-view>

    <!-- 输入 -->
    <view class="inbar">
      <input class="in" v-model="input" placeholder="问问种植、病虫害、补贴、贷款、行情…" confirm-type="send" @confirm="send" />
      <view class="send" @tap="send">发送</view>
    </view>
    <view class="disc">🤖 基于国产大模型 + 供销产业知识库 · 答复仅供参考，不构成投资/交易承诺</view>
  </view>
</template>

<style lang="scss" scoped>
.page { display: flex; flex-direction: column; height: 100vh; background: #eef0f3; }
.chat { flex: 1; padding: 20rpx 24rpx 0; box-sizing: border-box; }
.msg { display: flex; margin-bottom: 22rpx; }
.msg.me { flex-direction: row-reverse; }
.ava { width: 60rpx; height: 60rpx; border-radius: 16rpx; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; font-size: 22rpx; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.bubble { max-width: 76%; margin: 0 16rpx; padding: 18rpx 22rpx; border-radius: 20rpx; box-shadow: $sg-shadow; }
.bubble.ai { background: #fff; border-top-left-radius: 4rpx; }
.bubble.me { background: linear-gradient(135deg, #16a34a, #16884c); border-top-right-radius: 4rpx; }
.btext { font-size: 25rpx; line-height: 1.6; white-space: pre-wrap; }
.bubble.me .btext { color: #fff; }
.blink { margin-top: 12rpx; font-size: 22rpx; color: #6d28d9; font-weight: 700; }
.typing { display: flex; gap: 10rpx; align-items: center; padding: 24rpx 22rpx; }
.dot { width: 12rpx; height: 12rpx; border-radius: 50%; background: #c4b5fd; animation: blink 1.2s infinite; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }
@keyframes blink { 0%,100% { opacity: 0.3; } 50% { opacity: 1; } }
.pad { height: 20rpx; }
.chips { white-space: nowrap; padding: 12rpx 24rpx; background: #eef0f3; }
.chip { display: inline-block; font-size: 22rpx; color: #6d28d9; background: #fff; border: 2rpx solid #ddd0f7; padding: 10rpx 22rpx; border-radius: 999rpx; margin-right: 12rpx; }
.inbar { display: flex; gap: 14rpx; padding: 14rpx 24rpx; background: #fff; align-items: center; }
.in { flex: 1; background: #f2f3f5; border-radius: 999rpx; padding: 20rpx 26rpx; font-size: 25rpx; }
.send { flex-shrink: 0; padding: 20rpx 34rpx; border-radius: 999rpx; background: linear-gradient(135deg, #7c3aed, #6d28d9); color: #fff; font-size: 26rpx; font-weight: 700; }
.disc { font-size: 18rpx; color: $sg-text-3; text-align: center; padding: 10rpx 24rpx calc(16rpx + env(safe-area-inset-bottom)); background: #fff; line-height: 1.4; }
</style>
