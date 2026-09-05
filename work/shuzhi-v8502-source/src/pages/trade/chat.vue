<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

const to = ref("采购方");
onLoad((q) => { if (q?.to) to.value = decodeURIComponent(q.to); });

// 议价标的
const item = { name: "赣南脐橙 特级 70-80mm", qty: 30, unit: "吨", base: 4.6 };

interface Msg { me: boolean; text?: string; offer?: { price: number; by: string; status: string } }
const msgs = ref<Msg[]>([
  { me: false, text: "您好，看到您的脐橙货源，特级现货还有多少？" },
  { me: true, text: "特级现货 120 吨，70-80mm，可冷链直发、质检报告已上链。" },
  { me: false, offer: { price: 4.4, by: "采购方", status: "待回应" } },
]);
const input = ref("");
const deal = ref(false);

function total(price: number) { return Math.round(item.qty * 1000 * 2 * price); } // 吨→斤(×2000)×单价
const money = (n: number) => n.toLocaleString();

function send() {
  if (productionBuild) return uni.showModal({ title: "需要后台消息服务", content: "正式环境的议价消息必须写入后台会话并绑定双方主体、商品和订单；当前未发送本地消息。", showCancel: false });
  if (!input.value.trim()) return;
  msgs.value.push({ me: true, text: input.value });
  input.value = "";
}
// 还价 / 改价
function counter() {
  if (productionBuild) return uni.showModal({ title: "需要后台报价服务", content: "正式环境的还价必须由后台生成报价版本、有效期和幂等记录，当前未提交本地报价。", showCancel: false });
  uni.showModal({ title: "还价 / 改价", editable: true, placeholderText: "输入你的单价（元/斤）", confirmText: "发报价",
    success: (r: any) => {
      if (!r.confirm) return;
      const p = parseFloat(r.content); if (!p || p <= 0) return uni.showToast({ title: "请输入有效单价", icon: "none" });
      msgs.value.push({ me: true, offer: { price: p, by: "我方", status: "待回应" } });
      // 对方自动回应：接近则接受，否则小幅还价
      setTimeout(() => {
        if (p >= item.base - 0.1) msgs.value.push({ me: false, text: `¥${p}/斤 可以，接受成交！` });
        else msgs.value.push({ me: false, offer: { price: +(p + 0.1).toFixed(2), by: "采购方", status: "待回应" } });
      }, 700);
    },
  });
}
// 接受某条报价 → 成交
function accept(m: Msg) {
  if (productionBuild) return uni.showModal({ title: "需要后台成交确认", content: "正式环境成交必须由后台确认报价、主体、库存和合同前置条件，当前未确认本地报价。", showCancel: false });
  if (!m.offer) return;
  m.offer.status = "已接受";
  deal.value = true;
  msgs.value.push({ me: !m.me, text: `已按 ¥${m.offer.price}/斤 达成，共 ${item.qty}${item.unit}、¥${money(total(m.offer.price))}。生成合同下单。` });
}
function toOrder() { uni.navigateTo({ url: "/pages/trade/demand-detail" }); }
</script>

<template>
  <view class="chat">
    <view class="tip">与「{{ to }}」议价洽谈 · 报价全程留存、成交上链</view>
    <view class="goods">
      <text class="g-n">🍊 {{ item.name }}</text>
      <text class="g-m">议价数量 {{ item.qty }}{{ item.unit }} · 参考价 ¥{{ item.base }}/斤</text>
    </view>

    <scroll-view scroll-y class="body">
      <view v-for="(m, i) in msgs" :key="i" class="row" :class="{ me: m.me }">
        <!-- 文本 -->
        <view v-if="m.text" class="bubble" :class="{ me: m.me }">{{ m.text }}</view>
        <!-- 报价卡 -->
        <view v-else-if="m.offer" class="offer" :class="{ me: m.me }">
          <view class="of-hd"><text class="of-by">{{ m.offer.by }}报价</text><text class="of-st" :class="{ ok: m.offer.status === '已接受' }">{{ m.offer.status }}</text></view>
          <view class="of-price"><text class="of-p">¥{{ m.offer.price }}</text><text class="of-u">/斤</text></view>
          <text class="of-total">{{ item.qty }}{{ item.unit }} · 合计 ¥{{ money(total(m.offer.price)) }}</text>
          <view v-if="!deal && m.offer.status !== '已接受'" class="of-btn" @tap="accept(m)">接受此报价</view>
        </view>
      </view>
    </scroll-view>

    <!-- 成交条 -->
    <view v-if="deal" class="deal" @tap="toOrder">✅ 已达成一致 · 点此生成合同 / 下单 ›</view>

    <view class="input-bar">
      <view class="quick" @tap="counter">￥ 还价</view>
      <input class="ip" v-model="input" placeholder="输入消息…" confirm-type="send" @confirm="send" />
      <view class="send" @tap="send">发送</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.chat { display: flex; flex-direction: column; height: 100vh; background: $sg-bg; }
.tip { text-align: center; font-size: 22rpx; color: $sg-text-3; padding: 14rpx; }
.goods { margin: 0 24rpx 10rpx; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 16rpx 20rpx; }
.g-n { font-size: 25rpx; font-weight: 700; display: block; }
.g-m { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.body { flex: 1; padding: 10rpx 24rpx; }
.row { display: flex; margin-bottom: 20rpx; }
.row.me { justify-content: flex-end; }
.bubble { max-width: 70%; padding: 18rpx 24rpx; border-radius: 18rpx; background: #fff; font-size: 27rpx; line-height: 1.5; }
.bubble.me { background: $sg-primary; color: #fff; }
.offer { max-width: 72%; background: #fff; border: 2rpx solid #f0dcae; border-radius: 18rpx; padding: 18rpx 22rpx; box-shadow: $sg-shadow; }
.offer.me { border-color: $sg-primary; }
.of-hd { display: flex; align-items: center; justify-content: space-between; }
.of-by { font-size: 21rpx; color: $sg-text-2; font-weight: 600; }
.of-st { font-size: 19rpx; color: $sg-gold; background: $sg-gold-light; padding: 2rpx 12rpx; border-radius: 6rpx; }
.of-st.ok { color: #fff; background: $sg-primary; }
.of-price { display: flex; align-items: baseline; margin: 8rpx 0 2rpx; }
.of-p { font-size: 42rpx; font-weight: 800; color: $sg-red; }
.of-u { font-size: 20rpx; color: $sg-text-3; }
.of-total { font-size: 20rpx; color: $sg-text-3; }
.of-btn { margin-top: 12rpx; text-align: center; padding: 14rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; font-size: 24rpx; font-weight: 600; }
.deal { margin: 0 24rpx 10rpx; text-align: center; padding: 20rpx 0; border-radius: $sg-radius; background: $sg-primary-light; color: $sg-primary-deep; font-size: 25rpx; font-weight: 700; }
.input-bar { display: flex; align-items: center; gap: 14rpx; padding: 16rpx 24rpx calc(16rpx + env(safe-area-inset-bottom)); background: #fff; }
.quick { flex: none; padding: 18rpx 22rpx; background: $sg-gold-light; color: #c8871f; border-radius: 999rpx; font-size: 24rpx; font-weight: 700; }
.ip { flex: 1; background: $sg-bg; border-radius: 999rpx; padding: 18rpx 26rpx; font-size: 27rpx; }
.send { flex: none; padding: 18rpx 32rpx; background: $sg-primary; color: #fff; border-radius: 999rpx; font-size: 27rpx; }
</style>
