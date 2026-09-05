<script setup lang="ts">
import { useUserStore } from "@/store/user";
import { recordPlatformEvent } from "@/services/localApi";
const user = useUserStore();
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const devices = productionBuild ? [] : [
  { name: "iPhone · 微信", loc: "天津", cur: true, time: "当前在线" },
  { name: "微信开发者工具", loc: "天津", cur: false, time: "2 小时前" },
];
const actInfo: Record<string, string> = {
  "修改绑定手机号": "验证原手机号 → 输入新手机号 → 短信验证码校验，即可更换绑定手机。",
  "修改登录密码": "验证身份后设置新密码，密码需 8-20 位含字母与数字。",
  "人脸核身": "法定代表人已通过公安人脸核身，如变更法人需重新核验。",
  "对公账户": "对公账户已通过打款验证，可在此更换收款结算账户。",
};
function act(t: string) {
  if (productionBuild) return uni.showModal({ title: "需要后台授权", content: "该安全操作必须由后台会话、实名核验和持牌账户服务共同完成，当前页面不使用演示状态。", showCancel: false });
  void recordPlatformEvent("mine", "OPEN_SECURITY_ACTION", { action: t }).catch(() => {});
  uni.showModal({ title: t, content: actInfo[t] || t, confirmText: "去办理",
    success: (r) => { if (r.confirm) uni.showToast({ title: "已进入" + t + "流程", icon: "none" }); } });
}
function did() { uni.navigateTo({ url: "/pages/mine/did" }); }
function offline(name: string) {
  void recordPlatformEvent("mine", "OFFLINE_DEVICE", { name }).catch(() => {});
  uni.showModal({ title: "下线设备", content: `将「${name}」退出登录？`, confirmText: "确认下线",
    success: (r) => { if (r.confirm) uni.showToast({ title: "已下线", icon: "success" }); } });
}
</script>

<template>
  <view class="sg-page">
    <!-- 主体认证状态 -->
    <view class="sg-card">
      <text class="ct">主体与认证</text>
      <view class="row"><text class="k">企业主体</text><text class="v">{{ user.certOrg }}</text></view>
      <view class="row"><text class="k">认证状态</text><text class="v ok">✔ 企业法人已实名认证</text></view>
      <view class="row" @tap="did"><text class="k">链上身份</text><text class="v link">{{ user.did || '未生成' }} ›</text></view>
    </view>

    <!-- 账号安全 -->
    <view class="sg-card">
      <text class="ct">账号安全</text>
      <view class="op" @tap="act('修改绑定手机号')"><text class="op-t">📱 绑定手机号</text><text class="ar">138****6688 ›</text></view>
      <view class="op" @tap="act('修改登录密码')"><text class="op-t">🔑 登录密码</text><text class="ar">修改 ›</text></view>
      <view class="op" @tap="act('人脸核身')"><text class="op-t">🧑‍💼 法人人脸核身</text><text class="ar">已核验 ›</text></view>
      <view class="op" @tap="act('对公账户')"><text class="op-t">🏦 对公账户</text><text class="ar">已验证 ›</text></view>
    </view>

    <!-- 登录设备 -->
    <view class="sg-card">
      <text class="ct">登录设备管理</text>
      <view class="dev" v-for="d in devices" :key="d.name">
        <view class="d-i"><text class="d-n">{{ d.name }} <text v-if="d.cur" class="cur">本机</text></text><text class="d-m">{{ d.loc }} · {{ d.time }}</text></view>
        <text v-if="!d.cur" class="d-off" @tap="offline(d.name)">下线</text>
      </view>
      <view v-if="productionBuild" class="empty">暂无后台设备会话；登录后由服务端返回当前账号的设备清单。</view>
    </view>
    <view class="tip">🔒 接口国密 SM2 签名、全链路 HTTPS；异常登录自动告警并要求重新核身。</view>
  </view>
</template>

<style lang="scss" scoped>
.ct { font-size: 28rpx; font-weight: 700; display: block; margin-bottom: 6rpx; }
.row { display: flex; padding: 18rpx 0; border-top: 2rpx solid $sg-border; }
.k { width: 150rpx; color: $sg-text-3; font-size: 26rpx; }
.v { flex: 1; font-size: 26rpx; }
.v.ok { color: $sg-primary; }
.v.link { color: $sg-blue; }
.op { display: flex; justify-content: space-between; align-items: center; padding: 22rpx 0; border-top: 2rpx solid $sg-border; }
.op-t { font-size: 27rpx; }
.ar { color: $sg-text-3; font-size: 24rpx; }
.dev { display: flex; align-items: center; justify-content: space-between; padding: 18rpx 0; border-top: 2rpx solid $sg-border; }
.d-i { display: flex; flex-direction: column; }
.d-n { font-size: 26rpx; font-weight: 600; }
.cur { font-size: 19rpx; color: $sg-primary; background: $sg-primary-light; padding: 2rpx 10rpx; border-radius: 6rpx; }
.d-m { font-size: 21rpx; color: $sg-text-3; margin-top: 4rpx; }
.d-off { font-size: 24rpx; color: $sg-red; padding: 8rpx 24rpx; border: 2rpx solid $sg-red; border-radius: 999rpx; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
</style>
