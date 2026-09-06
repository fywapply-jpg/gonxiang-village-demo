<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { mainBankOf } from "@/mock/mainbank";
import { useUserStore } from "@/store/user";

const user = useUserStore();
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const name = ref("订单贷");
onLoad((q) => { if (q?.name) name.value = decodeURIComponent(q.name); });
const bank = computed(() => mainBankOf(name.value));
function viewBid() { uni.navigateTo({ url: "/pages/finance/bankbid" }); }
const amount = ref("");
const submitted = ref(false);

function submit() {
  if (productionBuild) return uni.showModal({ title: "需要持牌金融机构接入", content: "正式环境融资申请必须提交后台并由合作银行/持牌机构完成授信、合同和放款回执，当前未提交本地申请。", showCancel: false });
  if (!user.ensureCert("融资申请")) return;
  if (!amount.value) return uni.showToast({ title: "请输入融资金额", icon: "none" });
  submitted.value = true;
}
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty">
      <text class="production-empty-title">暂无后台融资档案</text>
      <text class="production-empty-text">正式环境的主办行、关联订单、授信额度和还款方案必须由合作银行/持牌机构及后台返回。本页面不展示本地订单号、金额或利率，也不会提交本地融资申请。</text>
    </view>
    <block v-else>
      <block v-if="!submitted">
        <view class="mainbank" @tap="viewBid">
          <view class="mb-badge">{{ bank.short }}</view>
          <view class="mb-i"><text class="mb-t">本笔由「{{ bank.name }}」主办行承接</text><text class="mb-s">经银行竞标择优 · 授信/放款/回款/风控行内闭环 · 参考利率 {{ bank.rate }}</text></view>
          <text class="mb-go">竞标详情 ›</text>
        </view>
        <view class="sg-card">
          <text class="t">{{ name }} · 融资申请</text>
          <view class="fi"><text class="lb">融资金额</text><input class="ip" type="number" v-model="amount" placeholder="请输入（万元）" /></view>
          <view class="fi"><text class="lb">关联订单</text><text class="val">O240701 赣南脐橙 ¥138,000</text></view>
          <view class="fi"><text class="lb">还款方式</text><text class="val">随借随还</text></view>
          <view class="upload">📎 上传营业执照 / 经营资质</view>
        </view>
        <view class="privacy">🔒 资料经国密加密传输，仅用于持牌机构授信审核（数据可用不可见）</view>
        <view class="bar"><view class="bar-btn" @tap="submit">提交申请</view></view>
      </block>

      <view v-else class="done">
        <text class="ok-ic">✅</text>
        <text class="ok-t">申请已提交</text>
        <text class="ok-s">已同步至合作持牌金融机构，审批结果将通过微信订阅消息通知您</text>
        <view class="prog sg-card">
          <view class="ps"><view class="pd on">✓</view><text>在线申请</text></view>
          <view class="pl on"></view>
          <view class="ps"><view class="pd on doing">·</view><text>机构审核中</text></view>
          <view class="pl"></view>
          <view class="ps"><view class="pd">3</view><text>签约放款</text></view>
        </view>
        <view class="bar-btn ghost" @tap="uni.navigateBack()">返回</view>
      </view>
    </block>
  </view>
</template>

<style lang="scss" scoped>
.mainbank { display: flex; align-items: center; margin: 24rpx 24rpx 0; padding: 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #fff6e6, #fff); border: 2rpx solid #f0dcae; }
.mb-badge { width: 68rpx; height: 68rpx; border-radius: 18rpx; background: linear-gradient(135deg, #d99a2b, #c8871f); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24rpx; font-weight: 800; margin-right: 16rpx; }
.mb-i { flex: 1; display: flex; flex-direction: column; }
.mb-t { font-size: 25rpx; font-weight: 700; }
.mb-s { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.mb-go { font-size: 22rpx; color: #c8871f; }
.t { font-size: 30rpx; font-weight: 700; }
.fi { display: flex; align-items: center; padding: 22rpx 0; border-bottom: 2rpx solid $sg-border; }
.lb { width: 160rpx; font-size: 27rpx; color: $sg-text-2; }
.ip { flex: 1; font-size: 27rpx; }
.val { flex: 1; font-size: 27rpx; color: $sg-text; }
.upload { margin-top: 20rpx; padding: 40rpx; border: 2rpx dashed $sg-border; border-radius: $sg-radius; text-align: center; color: $sg-text-3; font-size: 26rpx; }
.privacy { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; }
.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); }
.bar-btn { text-align: center; padding: 24rpx 0; border-radius: 999rpx; font-size: 30rpx; font-weight: 700; background: linear-gradient(135deg, $sg-gold, #c8871f); color: #fff; }
.bar-btn.ghost { margin: 30rpx 24rpx; background: $sg-primary-light; color: $sg-primary; }
.done { display: flex; flex-direction: column; align-items: center; padding-top: 80rpx; }
.ok-ic { font-size: 120rpx; }
.ok-t { font-size: 34rpx; font-weight: 800; margin-top: 20rpx; }
.ok-s { font-size: 24rpx; color: $sg-text-3; text-align: center; padding: 12rpx 60rpx; }
.prog { display: flex; align-items: center; width: 90%; padding: 30rpx; }
.ps { display: flex; flex-direction: column; align-items: center; font-size: 22rpx; color: $sg-text-3; }
.pd { width: 48rpx; height: 48rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx; }
.pd.on { background: $sg-primary; }
.pd.doing { background: $sg-gold; }
.pl { flex: 1; height: 4rpx; background: $sg-border; margin: 0 6rpx 26rpx; }
.pl.on { background: $sg-primary; }
.production-empty { margin: 48rpx 24rpx; padding: 34rpx 28rpx; border: 2rpx solid #d8e7de; border-radius: 22rpx; background: #f7fbf8; }
.production-empty-title { display: block; color: #145d3c; font-size: 32rpx; font-weight: 900; }
.production-empty-text { display: block; margin-top: 16rpx; color: #5e7167; font-size: 24rpx; line-height: 1.7; }
</style>
