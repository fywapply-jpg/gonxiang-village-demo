<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const productionBlocked = () => uni.showModal({ title: "需后台争议服务", content: "正式环境的取证、判责和退款必须由后台工单及授权岗位处理，当前未执行本地判责。", showCancel: false });

// 一笔真实 B2B 订单（60 吨现货单 · 4.6 元/斤 = ¥55.2 万；与年度合约 OA-2026-0781/600 吨 各自独立）
const order = reactive({
  no: "PO-2026-0782",
  goods: "赣南脐橙 · 特级",
  qty: "60 吨",
  amount: "¥55.2 万",
  seller: "赣南脐橙合作社",
  buyer: "沪上团餐中央厨房",
  logi: "顺丰冷链 · 车牌 赣B·L2381",
});
// 接收从售后工单跳入的订单号
onLoad((q) => { if (q && q.id) order.no = q.id; });

// 四类生鲜 B2B 争议场景（含判责依据链）
interface Scene {
  key: string; icon: string; name: string; claim: string;
  evidence: { src: string; icon: string; find: string; bad: boolean }[];
  liable: "seller" | "logi" | "buyer";
  liableName: string;
  verdict: string;
  settle: { label: string; val: string; who: string }[];
  penalties: string[];
}
const scenes: Scene[] = [
  {
    key: "rot", icon: "🥀", name: "运输腐烂损耗",
    claim: "到货抽检约 15% 果实软腐、发霉，超合理损耗，要求赔付。",
    evidence: [
      { src: "冷链温控曲线", icon: "🌡️", find: "运输途中 06-12 段温度飙至 12℃（阈值≤5℃），持续 2.1h，疑似机组断电", bad: true },
      { src: "车载 GPS 轨迹", icon: "🛰️", find: "同时段车辆停靠服务区 2h，与超温时段吻合", bad: true },
      { src: "发货前品控记录", icon: "📋", find: "出库抽检合格、无病果，装车温度 4℃达标", bad: false },
      { src: "到货照片/视频", icon: "📷", find: "软腐集中在中层货位，与局部超温一致", bad: true },
    ],
    liable: "logi", liableName: "物流承运方（顺丰冷链）",
    verdict: "冷链断链导致腐烂，卖家发货合格、买家无过错 → 判物流承运方主责，农业保险先行代偿。",
    settle: [
      { label: "损耗赔付", val: "¥8.28 万", who: "货损险先行代偿" },
      { label: "保司向物流追偿", val: "全额", who: "冷链险责任" },
      { label: "买方补发", val: "9 吨优先补发", who: "卖家配合、不担损失" },
    ],
    penalties: ["承运方冷链考核记 1 次重大失温", "该车队 30 天内加装温控实时告警才可再接单", "赔付与追偿全流程上链存证"],
  },
  {
    key: "short", icon: "⚖️", name: "缺斤短量（磅差）",
    claim: "合同 60 吨，到货地磅复磅仅 58.2 吨，短量 1.8 吨（3%），超合理磅差。",
    evidence: [
      { src: "发货过磅单", icon: "🏭", find: "产地装车过磅 58.3 吨，本就不足合同量", bad: true },
      { src: "到货地磅复磅", icon: "⚖️", find: "58.2 吨，与发货过磅一致（途损 0.1 吨属正常）", bad: false },
      { src: "冷链温控曲线", icon: "🌡️", find: "全程达标，无异常失水", bad: false },
      { src: "GPS 全程轨迹", icon: "🛰️", find: "无中途开箱、无卸货记录", bad: false },
    ],
    liable: "seller", liableName: "卖方（赣南脐橙合作社）",
    verdict: "发货过磅即短量，物流/买家均无异常 → 判卖方主责（实发不足合同量）。",
    settle: [
      { label: "短量退款", val: "¥16,560", who: "按 1.8 吨×市价退" },
      { label: "违约金", val: "¥5,520", who: "合同短量 1% 罚则" },
      { label: "货款结算", val: "按实收 58.2 吨结", who: "买卖双方按复磅结果结算" },
    ],
    penalties: ["卖家信用分 -8、星级复核", "触发 3 单短量将暂停供货资格", "村支书背书人收到连带预警（首次提醒）"],
  },
  {
    key: "grade", icon: "🔎", name: "以次充好·定级不符",
    claim: "下单为「特级果 70-80mm」，到货抽检多为一级果（60-70mm），要求折价。",
    evidence: [
      { src: "第三方快检报告", icon: "🧪", find: "抽 3 箱：特级占比仅 42%，其余为一级，果径不达标", bad: true },
      { src: "溯源批次比对", icon: "🔗", find: "批次 F-0663 与下单批次不符，疑临时调包", bad: true },
      { src: "农残检测", icon: "✅", find: "农残全项合格，食品安全无问题", bad: false },
      { src: "到货照片", icon: "📷", find: "分级不均，混级装箱", bad: true },
    ],
    liable: "seller", liableName: "卖方（赣南脐橙合作社）",
    verdict: "食品安全合格但等级以次充好、批次不符 → 判卖方主责，按实际等级折价。",
    settle: [
      { label: "折价补偿", val: "¥6.62 万", who: "特级↔一级差价" },
      { label: "买方可选", val: "折价收货 / 部分退货", who: "买方决定" },
      { label: "复检费", val: "¥800", who: "卖方承担" },
    ],
    penalties: ["卖家信用分 -15、星级下调一档", "「特级」标签冻结待复审", "背书人连带记录 + 90 天重点抽检", "屡犯将进入失信黑名单"],
  },
  {
    key: "reject", icon: "🚫", name: "买方无理拒收",
    claim: "买方称「品质差」全单拒收，要求全额退款并索赔误工费。",
    evidence: [
      { src: "第三方到货抽检", icon: "🧪", find: "等级、果径、农残全部达标，符合合同", bad: false },
      { src: "冷链温控曲线", icon: "🌡️", find: "全程 3-5℃ 达标，无失温", bad: false },
      { src: "到货签收照片", icon: "📷", find: "果品完好，与发货一致", bad: false },
      { src: "买方历史行为", icon: "📊", find: "近 60 天 3 次货到价跌即拒收，疑借故毁约", bad: true },
    ],
    liable: "buyer", liableName: "买方（沪上团餐中央厨房）",
    verdict: "货品合格、冷链达标，买方无正当理由拒收（疑价格波动毁约）→ 驳回索赔，判买方违约。",
    settle: [
      { label: "索赔", val: "驳回", who: "无质量问题" },
      { label: "买方担责", val: "承担返程冷链费 ¥6,200", who: "违约方担" },
      { label: "货物处置", val: "平台协助转销其他采方", who: "减少卖家损失" },
    ],
    penalties: ["买方信用分 -12、预警借故拒收", "再犯需预付货款方可下单", "卖家权益受保护、不担损失"],
  },
];

const si = ref(0);
const scene = computed(() => scenes[si.value]);
function pick(i: number) { si.value = i; reset(); }

// 取证 + 判责动画
const running = ref(false);
const step = ref(0);
const done = ref(false);
function judge() {
  if (productionBuild) return productionBlocked();
  done.value = false; running.value = true; step.value = 0;
  const t = setInterval(() => {
    step.value++;
    if (step.value >= scene.value.evidence.length) { clearInterval(t); running.value = false; done.value = true; }
  }, 500);
}
function reset() { running.value = false; step.value = 0; done.value = false; }

const liableColor = computed(() => scene.value.liable === "buyer" ? "#2b6cb0" : scene.value.liable === "logi" ? "#d99a2b" : "#d64541");
const liableTag = computed(() => scene.value.liable === "buyer" ? "买方担责" : scene.value.liable === "logi" ? "物流担责" : "卖方担责");
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty">
      <text class="production-empty-title">暂无后台争议工单</text>
      <text class="production-empty-text">正式环境只展示后台返回的订单、证据和责任认定；本地争议案例不会混入生产数据。</text>
    </view>
    <template v-else>
    <view class="hero">
      <text class="ht">⚖️ 质量争议 · 判责理赔闭环</text>
      <text class="hs">生鲜 B2B 到货争议：一键调证（复磅·第三方检测·冷链温控·溯源）→ 自动判责 → 理赔 → 追责</text>
    </view>

    <!-- 订单卡 -->
    <view class="ord">
      <view class="sg-between"><text class="o-no">{{ order.no }}</text><text class="o-amt">{{ order.amount }}</text></view>
      <text class="o-g">{{ order.goods }} · {{ order.qty }}</text>
      <view class="o-row"><text class="o-k">卖方</text><text class="o-v">{{ order.seller }}</text></view>
      <view class="o-row"><text class="o-k">买方</text><text class="o-v">{{ order.buyer }}</text></view>
      <view class="o-row"><text class="o-k">承运</text><text class="o-v">{{ order.logi }}</text></view>
    </view>

    <!-- 争议类型 -->
    <view class="sec">选择争议类型</view>
    <view class="scenes">
      <view class="sc" :class="{ on: si === i }" v-for="(s, i) in scenes" :key="s.key" @tap="pick(i)">
        <text class="sc-ic">{{ s.icon }}</text><text class="sc-n">{{ s.name }}</text>
      </view>
    </view>

    <!-- 买方诉求 -->
    <view class="claim">
      <text class="cl-tag">买方诉求</text>
      <text class="cl-t">{{ scene.claim }}</text>
    </view>

    <!-- 取证判责 -->
    <view class="sec">平台调证 · 多源交叉核验</view>
    <view class="sg-card">
      <view class="ev" v-for="(e, i) in scene.evidence" :key="e.src" :class="{ show: !running || step > i, bad: (done || step > i) && e.bad, good: (done || step > i) && !e.bad }">
        <text class="ev-ic">{{ e.icon }}</text>
        <view class="ev-i">
          <text class="ev-src">{{ e.src }}</text>
          <text class="ev-find" v-if="done || step > i">{{ e.find }}</text>
          <text class="ev-find wait" v-else-if="running">调取中…</text>
        </view>
        <text class="ev-r" v-if="done || step > i">{{ e.bad ? '⚠' : '✓' }}</text>
      </view>

      <!-- 判决 -->
      <view v-if="done" class="verdict" :style="{ borderColor: liableColor }">
        <view class="vd-hd">
          <text class="vd-badge" :style="{ background: liableColor }">{{ liableTag }}</text>
          <text class="vd-who">{{ scene.liableName }}</text>
        </view>
        <text class="vd-t">{{ scene.verdict }}</text>
      </view>

      <view class="judge-btn" @tap="judge">{{ done ? '↻ 重新调证判责' : '▶ 一键调证 · 自动判责' }}</view>
    </view>

    <!-- 理赔方案 -->
    <view v-if="done" class="sec">💰 理赔方案</view>
    <view v-if="done" class="sg-card">
      <view class="st" v-for="(s, i) in scene.settle" :key="i">
        <view class="st-i"><text class="st-l">{{ s.label }}</text><text class="st-who">{{ s.who }}</text></view>
        <text class="st-v" :style="{ color: liableColor }">{{ s.val }}</text>
      </view>
    </view>

    <!-- 追责闭环 -->
    <view v-if="done" class="sec">🔒 追责闭环（信用·背书·保险联动）</view>
    <view v-if="done" class="penalties">
      <text class="pen" v-for="(p, i) in scene.penalties" :key="i">· {{ p }}</text>
    </view>

    </template>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #b5563c, #8f3d28); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; line-height: 1.5; }
.ord { margin: 20rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.o-no { font-size: 24rpx; color: $sg-text-3; }
.o-amt { font-size: 30rpx; font-weight: 800; color: $sg-red; }
.o-g { font-size: 28rpx; font-weight: 700; display: block; margin: 8rpx 0 12rpx; }
.o-row { display: flex; padding: 6rpx 0; }
.o-k { width: 90rpx; font-size: 22rpx; color: $sg-text-3; }
.o-v { flex: 1; font-size: 23rpx; color: $sg-text-2; }
.sec { font-size: 28rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.scenes { display: flex; flex-wrap: wrap; gap: 14rpx; padding: 0 24rpx; }
.sc { width: calc(50% - 7rpx); box-sizing: border-box; display: flex; align-items: center; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 20rpx; border: 3rpx solid transparent; }
.sc.on { border-color: #b5563c; background: #fbeee9; }
.sc-ic { font-size: 36rpx; margin-right: 12rpx; }
.sc-n { font-size: 24rpx; font-weight: 700; }
.claim { margin: 16rpx 24rpx 0; background: #fff7f5; border: 2rpx solid #f2d4cb; border-radius: $sg-radius-lg; padding: 20rpx; }
.cl-tag { font-size: 20rpx; color: #fff; background: #b5563c; padding: 3rpx 14rpx; border-radius: 999rpx; }
.cl-t { display: block; margin-top: 10rpx; font-size: 24rpx; color: $sg-text-2; line-height: 1.6; }
.sg-card { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx 22rpx; }
.ev { display: flex; align-items: center; padding: 16rpx 0; border-top: 2rpx solid $sg-bg; opacity: 0.4; transition: opacity 0.35s; }
.ev:first-child { border-top: none; }
.ev.show { opacity: 1; }
.ev-ic { font-size: 38rpx; margin-right: 14rpx; flex: none; }
.ev-i { flex: 1; display: flex; flex-direction: column; }
.ev-src { font-size: 24rpx; font-weight: 700; }
.ev-find { font-size: 20rpx; color: $sg-text-2; margin-top: 4rpx; line-height: 1.45; }
.ev-find.wait { color: $sg-text-3; }
.ev.bad .ev-src { color: #d64541; }
.ev.good .ev-src { color: #16884c; }
.ev-r { font-size: 30rpx; font-weight: 800; margin-left: 12rpx; flex: none; }
.ev.bad .ev-r { color: #d64541; }
.ev.good .ev-r { color: #16884c; }
.verdict { margin-top: 16rpx; padding: 18rpx; border-radius: $sg-radius; background: #fafafa; border: 2rpx solid; }
.vd-hd { display: flex; align-items: center; margin-bottom: 10rpx; }
.vd-badge { font-size: 21rpx; color: #fff; font-weight: 700; padding: 4rpx 16rpx; border-radius: 999rpx; margin-right: 12rpx; }
.vd-who { font-size: 24rpx; font-weight: 700; }
.vd-t { font-size: 22rpx; color: $sg-text-2; line-height: 1.6; }
.judge-btn { margin-top: 16rpx; text-align: center; padding: 22rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #b5563c, #8f3d28); color: #fff; font-size: 26rpx; font-weight: 700; }
.st { display: flex; align-items: center; justify-content: space-between; padding: 14rpx 0; border-top: 2rpx solid $sg-bg; }
.st:first-child { border-top: none; }
.st-i { display: flex; flex-direction: column; }
.st-l { font-size: 25rpx; font-weight: 600; }
.st-who { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; }
.st-v { font-size: 28rpx; font-weight: 800; }
.penalties { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 22rpx; }
.pen { display: block; font-size: 22rpx; color: $sg-text-2; line-height: 1.9; }
 .tip { margin: 20rpx 24rpx 40rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
 .production-empty { margin: 48rpx 24rpx; padding: 34rpx 28rpx; border: 2rpx solid #d8e7de; border-radius: 22rpx; background: #f7fbf8; }
 .production-empty-title { display: block; color: #145d3c; font-size: 32rpx; font-weight: 900; }
 .production-empty-text { display: block; margin-top: 16rpx; color: #5e7167; font-size: 24rpx; line-height: 1.7; }
</style>
