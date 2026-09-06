<script setup lang="ts">
import { ref } from "vue";
import { recordPlatformEvent } from "@/services/localApi";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const productionBlocked = (action: string) => uni.showModal({ title: "需后台应急台账", content: `正式环境${action}必须由后台校验征召令、主体、签收证据和财政结算条件；当前未执行本地状态变更。`, showCancel: false });

const order = {
  no: "ZZ-2026-0713-021",
  issuer: "市应急保供指挥部 · 供销总社",
  level: "Ⅱ 级应急响应",
  cargo: "叶类蔬菜（大白菜 / 生菜）",
  qty: "调拨 50 吨",
  to: "天津市河西区 3 个保供投放点",
  deadline: "48 小时内到位",
  price: "政府指导价 · 保供补贴 0.2 元/斤",
  basis: "依据贵司《应急保供承诺书》（编号 BG-2026-0342）自动征召",
};

const steps = ["接受征召", "组织备货", "调拨发运", "到位签收", "结算补贴"];
const cur = ref(0);
const accepted = ref(false);

function accept() {
  if (productionBuild) return productionBlocked("接受应急征召");
  uni.showModal({
    title: "接受应急征召", confirmText: "优先接受",
    content: "依据备案承诺，本次为优先征召任务。确认接受并立即组织保供？",
    success: (r) => { if (r.confirm) { accepted.value = true; cur.value = 1; void recordPlatformEvent("emergency", "ACCEPT_REQUISITION", { order_no: order.no }).catch(() => {}); uni.showToast({ title: "已接受征召", icon: "success" }); } },
  });
}
function advance() {
  if (productionBuild) return productionBlocked("推进应急保供任务");
  void recordPlatformEvent("emergency", "ADVANCE_SUPPLY_TASK", { order_no: order.no, step: cur.value }).catch(() => {});
  if (cur.value < steps.length) cur.value++;
  if (cur.value >= steps.length) uni.showToast({ title: "任务完成，补贴结算中", icon: "success" });
}
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty"><text class="production-empty-title">暂无后台应急任务</text><text class="production-empty-text">正式环境只展示后台征召令、调拨、签收和财政结算状态；本地应急任务不会推进或展示为真实任务。</text></view>
    <template v-else>
    <!-- 征召令 -->
    <view class="order">
      <view class="o-top"><text class="o-tag">🔴 应急征召令</text><text class="o-lv">{{ order.level }}</text></view>
      <text class="o-no">征召编号 {{ order.no }}</text>
      <text class="o-issuer">发令机关：{{ order.issuer }}</text>
      <view class="uncond">⚠️ 优先参与 · {{ order.basis }}</view>
    </view>

    <!-- 任务详情 -->
    <view class="sg-card">
      <text class="ct">征召任务详情</text>
      <view class="r"><text class="k">保供品类</text><text class="v">{{ order.cargo }}</text></view>
      <view class="r"><text class="k">调拨数量</text><text class="v sg-price">{{ order.qty }}</text></view>
      <view class="r"><text class="k">交付地点</text><text class="v">{{ order.to }}</text></view>
      <view class="r"><text class="k">到位时限</text><text class="v warn">{{ order.deadline }}</text></view>
      <view class="r"><text class="k">价格补贴</text><text class="v">{{ order.price }}</text></view>
    </view>

    <!-- 执行进度 -->
    <view class="sg-card">
      <text class="ct">任务执行进度</text>
      <view class="step" v-for="(s, i) in steps" :key="i">
        <view class="axis">
          <view class="dot" :class="{ on: i < cur, cur: i === cur }">{{ i < cur ? '✓' : i + 1 }}</view>
          <view v-if="i < steps.length - 1" class="line" :class="{ on: i < cur }"></view>
        </view>
        <view class="s-i">
          <text class="s-t" :class="{ on: i <= cur }">{{ s }}</text>
          <text v-if="i === cur && accepted" class="s-cur">进行中</text>
        </view>
      </view>
      <text class="chain">🔗 征召、接单、调拨、签收全程上链存证，作为履约与补贴结算依据</text>
    </view>

    <view class="bar">
      <view v-if="!accepted" class="bar-btn" @tap="accept">优先接受征召 · 立即保供</view>
      <view v-else-if="cur < steps.length" class="bar-btn" @tap="advance">推进到「{{ steps[cur] }}」下一步</view>
      <view v-else class="bar-btn done">✅ 保供任务已完成</view>
    </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.order { background: linear-gradient(160deg, #c0392b, #a5281c); padding: 34rpx 28rpx; color: #fff; }
.o-top { display: flex; align-items: center; justify-content: space-between; }
.o-tag { font-size: 30rpx; font-weight: 800; }
.o-lv { font-size: 21rpx; background: rgba(255,255,255,0.2); padding: 6rpx 16rpx; border-radius: 999rpx; }
.o-no { font-size: 22rpx; opacity: 0.9; margin-top: 14rpx; display: block; }
.o-issuer { font-size: 22rpx; opacity: 0.9; margin-top: 4rpx; display: block; }
.uncond { margin-top: 16rpx; background: rgba(0,0,0,0.18); border-radius: $sg-radius; padding: 14rpx 18rpx; font-size: 21rpx; }
.ct { font-size: 28rpx; font-weight: 700; display: block; margin-bottom: 12rpx; }
.r { display: flex; padding: 14rpx 0; border-top: 2rpx solid $sg-border; }
.r:first-of-type { border-top: none; }
.k { width: 150rpx; color: $sg-text-3; font-size: 26rpx; }
.v { flex: 1; font-size: 26rpx; }
.v.warn { color: $sg-red; font-weight: 600; }
.step { display: flex; }
.axis { display: flex; flex-direction: column; align-items: center; margin-right: 20rpx; }
.dot { width: 46rpx; height: 46rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; z-index: 2; }
.dot.on { background: $sg-red; }
.dot.cur { background: $sg-gold; }
.line { flex: 1; width: 4rpx; background: $sg-border; min-height: 30rpx; margin: 4rpx 0; }
.line.on { background: $sg-red; }
.s-i { flex: 1; display: flex; align-items: center; padding: 10rpx 0 30rpx; }
.s-t { font-size: 26rpx; color: $sg-text-2; }
.s-t.on { color: $sg-text; font-weight: 600; }
.s-cur { font-size: 20rpx; color: $sg-gold; margin-left: 12rpx; }
.chain { font-size: 21rpx; color: $sg-text-3; margin-top: 8rpx; display: block; line-height: 1.6; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.05); }
.bar-btn { text-align: center; padding: 24rpx 0; border-radius: 999rpx; font-size: 30rpx; font-weight: 700; background: linear-gradient(135deg, $sg-red, #b5322e); color: #fff; }
.bar-btn.done { background: $sg-primary; }
</style>
