<script setup lang="ts">
import { ref } from "vue";
import { recordPlatformEvent } from "@/services/localApi";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const productionBlocked = (action: string) => uni.showModal({ title: "需后台隐私工单", content: `正式环境${action}必须由后台验证当前用户、记录授权版本并返回可审计结果；当前未修改本地授权状态。`, showCancel: false });

// 授权项（最小必要原则：仅在使用对应功能时申请）
const perms = ref([
  { key: "phone", name: "手机号", use: "登录注册、订单联系、实名核验", on: true, required: true },
  { key: "location", name: "位置信息", use: "就近仓配、物流轨迹、产地定位", on: true, required: false },
  { key: "camera", name: "相机", use: "扫码溯源、上传资质/货源照片", on: true, required: false },
  { key: "album", name: "相册 / 存储", use: "上传商品图片、保存溯源海报", on: true, required: false },
  { key: "mic", name: "麦克风", use: "询盘语音、语音搜索", on: false, required: false },
  { key: "subscribe", name: "订阅消息", use: "订单/金融/物流关键节点提醒", on: true, required: false },
]);

function toggle(p: any) {
  if (p.required && p.on) {
    return uni.showModal({ title: "该权限为必需", showCancel: false, confirmText: "知道了",
      content: `${p.name}是登录与交易的必需权限，关闭后无法正常使用。如需注销请前往「账号注销」。` });
  }
  if (productionBuild) return productionBlocked("权限变更");
  p.on = !p.on;
  void recordPlatformEvent("mine", "TOGGLE_PRIVACY_PERMISSION", { key: p.key, enabled: p.on }).catch(() => {});
  uni.showToast({ title: (p.on ? "已授权 " : "已关闭 ") + p.name, icon: "none" });
}

function exportData() {
  if (productionBuild) return productionBlocked("数据导出申请");
  void recordPlatformEvent("mine", "REQUEST_DATA_EXPORT", {}).catch(() => {});
  uni.showModal({ title: "导出我的数据", content: "将您的账户、交易、授权记录打包，通过微信订阅消息推送下载链接。",
    confirmText: "申请导出", success: (r) => { if (r.confirm) uni.showToast({ title: "导出申请已提交", icon: "success" }); } });
}
function revokeAll() {
  if (productionBuild) return productionBlocked("撤回可选授权");
  void recordPlatformEvent("mine", "REVOKE_OPTIONAL_PERMISSIONS", {}).catch(() => {});
  uni.showModal({ title: "撤回全部可选授权", content: "将关闭位置、相机、相册、麦克风、订阅消息等可选授权（保留登录必需项）。",
    confirmText: "确认撤回", success: (r) => { if (r.confirm) { perms.value.forEach((p) => { if (!p.required) p.on = false; }); uni.showToast({ title: "已撤回", icon: "success" }); } } });
}
function cancelAccount() {
  if (productionBuild) return productionBlocked("账号注销申请");
  void recordPlatformEvent("mine", "REQUEST_ACCOUNT_CANCELLATION", {}).catch(() => {});
  uni.showModal({ title: "注销账号", content: "注销后账户、企业资质、链上 DID 将解绑，数据按合规要求脱敏留存，操作不可恢复。确认申请注销？",
    confirmText: "申请注销", confirmColor: "#d64541", success: (r) => { if (r.confirm) uni.showToast({ title: "注销申请已提交，客服将回访", icon: "none" }); } });
}
</script>

<template>
  <view class="sg-page">
    <view class="hd">
      <text class="hd-t">隐私授权管理</text>
      <text class="hd-s">最小必要原则 · 授权可随时开关 · 数据可用不可见</text>
    </view>

    <!-- 授权开关 -->
    <view class="sg-card">
      <text class="ct">应用权限授权</text>
      <view class="perm" v-for="p in perms" :key="p.key">
        <view class="p-i">
          <view class="p-top"><text class="p-n">{{ p.name }}</text><text v-if="p.required" class="p-req">必需</text></view>
          <text class="p-u">{{ p.use }}</text>
        </view>
        <switch :checked="p.on" color="#16884c" @change="toggle(p)" />
      </view>
    </view>

    <!-- 授权记录 -->
    <view class="sg-card">
      <text class="ct">授权与访问记录</text>
      <view class="rec"><text class="r-t">首次隐私协议同意</text><text class="r-d">2026-06-28 · 微信登录时</text></view>
      <view class="rec"><text class="r-t">相机授权（扫码溯源）</text><text class="r-d">最近使用 2026-07-02</text></view>
      <view class="rec"><text class="r-t">位置授权（物流轨迹）</text><text class="r-d">最近使用 2026-07-03</text></view>
      <view class="rec"><text class="r-t">数据访问日志</text><text class="r-d">全程上链存证 · 可审计</text></view>
    </view>

    <!-- 数据管理 -->
    <view class="sg-card">
      <text class="ct">我的数据</text>
      <view class="op" @tap="exportData"><text class="op-t">📤 导出我的数据</text><text class="ar">›</text></view>
      <view class="op" @tap="revokeAll"><text class="op-t">↩️ 撤回全部可选授权</text><text class="ar">›</text></view>
      <view class="op" @tap="cancelAccount"><text class="op-t danger">🗑️ 注销账号</text><text class="ar">›</text></view>
    </view>

    <view class="policy">
      <text class="pt">📜 隐私政策要点</text>
      <text class="pl">· 坚持最小必要原则，仅在使用对应功能时申请权限</text>
      <text class="pl">· 敏感数据国密 SM4 加密存储、展示脱敏</text>
      <text class="pl">· 金融风控采用 ZKP 隐私计算，数据「可用不可见」</text>
      <text class="pl">· 不向第三方出售个人信息，授权访问全程上链可审计</text>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, $sg-primary, $sg-primary-deep); padding: 36rpx 28rpx; color: #fff; }
.hd-t { font-size: 32rpx; font-weight: 800; }
.hd-s { font-size: 21rpx; opacity: 0.9; margin-top: 8rpx; display: block; }
.ct { font-size: 28rpx; font-weight: 700; display: block; margin-bottom: 8rpx; }
.perm { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 0; border-top: 2rpx solid $sg-border; }
.p-i { flex: 1; display: flex; flex-direction: column; padding-right: 20rpx; }
.p-top { display: flex; align-items: center; }
.p-n { font-size: 28rpx; font-weight: 600; }
.p-req { font-size: 19rpx; color: $sg-red; background: #fdecec; padding: 2rpx 12rpx; border-radius: 6rpx; margin-left: 12rpx; }
.p-u { font-size: 21rpx; color: $sg-text-3; margin-top: 4rpx; }
.rec { display: flex; justify-content: space-between; align-items: center; padding: 16rpx 0; border-top: 2rpx solid $sg-border; }
.r-t { font-size: 25rpx; }
.r-d { font-size: 21rpx; color: $sg-text-3; }
.op { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 0; border-top: 2rpx solid $sg-border; }
.op-t { font-size: 27rpx; }
.op-t.danger { color: $sg-red; }
.ar { color: $sg-text-3; }
.policy { margin: 24rpx; padding: 22rpx; background: $sg-primary-light; border-radius: $sg-radius-lg; }
.pt { font-size: 25rpx; font-weight: 700; color: $sg-primary-deep; display: block; margin-bottom: 10rpx; }
.pl { font-size: 22rpx; color: $sg-text-2; line-height: 1.8; display: block; }
</style>
