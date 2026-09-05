<script setup lang="ts">
import { ref } from "vue";
import { useUserStore, ROLES, type RoleKey } from "@/store/user";
import { clearSessionToken, loginWithWechat, logoutSession, setSessionToken } from "@/services/localApi";

const user = useUserStore();
const agreed = ref(false);
const pickRole = ref<RoleKey>("supplier");
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const loginRoles = ROLES.filter((r) => r.key !== "visitor");

function ensureAgree(): boolean {
  if (!agreed.value) {
    uni.showToast({ title: "请先阅读并同意用户协议", icon: "none" });
    return false;
  }
  return true;
}

function enterLocalDemo() {
  user.switchRole(pickRole.value);
  uni.showToast({ title: "本地演示登录成功", icon: "success" });
  setTimeout(() => uni.switchTab({ url: "/pages/home/index" }), 600);
}

function wechatLogin() {
  if (!ensureAgree()) return;
  if (!productionBuild) return enterLocalDemo();
  uni.login({
    provider: "weixin",
    success: async ({ code }) => {
      if (!code) return uni.showModal({ title: "微信登录失败", content: "未取得一次性登录凭证，请重试。", showCancel: false });
      try {
        const session = await loginWithWechat(code);
        setSessionToken(session.token);
        const role = session.user.role as RoleKey;
        if (!["supplier", "buyer", "agri", "station"].includes(role)) throw new Error("后台返回的企业角色不在平台授权范围");
        user.switchRole(role);
        uni.showToast({ title: "微信登录成功", icon: "success" });
        setTimeout(() => uni.switchTab({ url: "/pages/home/index" }), 600);
      } catch (error: any) {
        uni.showModal({ title: "登录未完成", content: error?.message || "微信身份或企业主体尚未完成后台核验", showCancel: false });
      }
    },
    fail: () => uni.showModal({ title: "微信登录不可用", content: "请在微信环境中发起登录，或联系管理员完成微信身份联调。", showCancel: false }),
  });
}

function phoneLogin() {
  if (!ensureAgree()) return;
  if (productionBuild) {
    uni.showModal({ title: "需完成微信身份联调", content: "手机号授权必须由微信服务端完成实名绑定，当前先使用“微信一键登录”建立企业主体会话。", showCancel: false });
    return;
  }
  uni.showModal({
    title: "手机号快捷登录",
    content: "将通过微信授权获取手机号并完成实名认证。",
    confirmText: "授权登录",
    success: (r) => {
      if (r.confirm) {
        user.switchRole(pickRole.value);
        uni.switchTab({ url: "/pages/home/index" });
      }
    },
  });
}

function guest() {
  clearSessionToken();
  user.switchRole("visitor");
  uni.switchTab({ url: "/pages/home/index" });
}
function register() { uni.navigateTo({ url: "/pages/register/index" }); }
function openRole(key: RoleKey) {
  if (productionBuild) {
    uni.showModal({ title: "请先完成企业登录", content: "正式环境不能通过角色卡绕过微信会话和企业主体授权；请使用微信一键登录，登录后由后台返回可用工作台。", showCancel: false });
    return;
  }
  // 角色卡同时是入口链接：先选择本地联调身份，再打开对应工作台；正式登录仍可通过下方授权按钮完成。
  pickRole.value = key;
  user.switchRole(key);
  if (key === "agri") return uni.navigateTo({ url: "/pages/agri/inputs" });
  if (key === "station") return uni.navigateTo({ url: "/pages/station/hub" });
  if (key === "supplier") {
    uni.setStorageSync("tradeTab", "supply");
    return uni.switchTab({ url: "/pages/trade/index" });
  }
  uni.setStorageSync("tradeTab", "supply");
  return uni.switchTab({ url: "/pages/trade/index" });
}
</script>

<template>
  <view class="login">
    <!-- 紫色渐变品牌区 -->
    <view class="hero">
      <view class="blob b1"></view>
      <view class="blob b2"></view>
      <view class="brand">
        <view class="logo-card"><image class="logo" src="/static/brand-logo.png" mode="aspectFit" /></view>
        <text class="title">数智供社</text>
        <text class="subtitle">农产品供应链 + 金融服务</text>
      </view>
    </view>

    <!-- 登录卡片 -->
    <view class="sheet">
      <text class="sh-title">商户登录（企业法人主体）</text>
      <text class="sh-sub">商户须为具备独立法人资格的企事业单位/机构；个人用户请以游客身份浏览</text>
      <view class="roles">
        <view
          v-for="r in loginRoles"
          :key="r.key"
          class="role"
          :class="{ on: pickRole === r.key }"
          @tap="openRole(r.key)"
        >
          <view class="r-badge">{{ r.short }}</view>
          <text class="r-name">{{ r.name }}</text>
        </view>
      </view>

      <view class="wx-btn" @tap="wechatLogin">
        <text class="wx-ic"></text>
        <text>微信一键登录</text>
      </view>
      <view class="phone-btn" @tap="phoneLogin">手机号授权登录</view>

      <view class="reg-row">
        <text class="reg-txt">新商户？</text>
        <text class="reg-link" @tap="register">企业主体入驻注册 ›</text>
      </view>
      <view class="guest" @tap="guest">个人用户 · 游客浏览 / 扫码溯源 ›</view>

      <view class="agree" @tap="agreed = !agreed">
        <view class="cb" :class="{ on: agreed }">{{ agreed ? "✓" : "" }}</view>
        <text class="agree-txt">我已阅读并同意《用户协议》《隐私政策》，金融服务由持牌机构提供</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.login { min-height: 100vh; background: #fff; display: flex; flex-direction: column; }

/* 蓝色渐变 hero */
.hero {
  position: relative;
  overflow: hidden;
  padding: 150rpx 40rpx 90rpx;
  background: linear-gradient(155deg, #1a5c9e 0%, #2b6cb0 50%, #4a90d0 100%);
}
.blob { position: absolute; border-radius: 50%; filter: blur(2rpx); opacity: 0.3; }
.b1 { width: 360rpx; height: 360rpx; background: #5aa0dc; top: -120rpx; right: -80rpx; }
.b2 { width: 300rpx; height: 300rpx; background: #86bde8; bottom: -100rpx; left: -90rpx; opacity: 0.28; }
.brand { position: relative; display: flex; flex-direction: column; align-items: center; }
.logo-card { display: flex; align-items: center; justify-content: center; }
.logo { width: 268rpx; height: 287rpx; }
.title { font-size: 58rpx; font-weight: 800; color: #f5cd4b; letter-spacing: 8rpx; margin-top: 20rpx; text-shadow: 0 2rpx 10rpx rgba(0,0,0,0.18); }
.subtitle { font-size: 26rpx; color: rgba(255,255,255,0.95); font-weight: 600; margin-top: 12rpx; }
.badge { font-size: 21rpx; color: rgba(255,255,255,0.85); margin-top: 20rpx; padding: 6rpx 24rpx; border: 2rpx solid rgba(255,255,255,0.4); border-radius: 999rpx; }

/* 登录卡片 */
.sheet { flex: 1; margin-top: -46rpx; background: #fff; border-radius: 46rpx 46rpx 0 0; padding: 48rpx 40rpx 60rpx; }
.sh-title { font-size: 34rpx; font-weight: 700; }
.sh-sub { font-size: 22rpx; color: $sg-text-3; margin: 8rpx 0 28rpx; display: block; }
.roles { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18rpx; margin-bottom: 40rpx; }
.role { width: auto; min-width: 0; box-sizing: border-box; display: flex; align-items: center; padding: 20rpx; border-radius: $sg-radius-lg; background: #eef7f1; border: 3rpx solid transparent; }
.role.on { border-color: $sg-primary; background: #e3f5ea; }
.r-badge { width: 60rpx; height: 60rpx; border-radius: 50%; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 700; margin-right: 16rpx; }
.r-name { flex: 1; min-width: 0; font-size: 25rpx; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.wx-btn { display: flex; align-items: center; justify-content: center; gap: 14rpx; background: #07c160; color: #fff; font-size: 32rpx; font-weight: 700; padding: 26rpx 0; border-radius: 999rpx; box-shadow: 0 10rpx 26rpx rgba(7, 193, 96, 0.32); }
.wx-ic { font-size: 36rpx; }
.phone-btn { text-align: center; margin-top: 22rpx; padding: 24rpx 0; border-radius: 999rpx; font-size: 30rpx; font-weight: 600; color: $sg-primary-deep; background: #e8f5ee; }
.reg-row { text-align: center; margin-top: 26rpx; }
.reg-txt { font-size: 24rpx; color: $sg-text-3; }
.reg-link { font-size: 26rpx; color: $sg-primary-deep; font-weight: 600; }
.guest { text-align: center; margin-top: 20rpx; font-size: 26rpx; color: $sg-text-3; }

.agree { display: flex; align-items: flex-start; margin-top: 40rpx; }
.cb { width: 34rpx; height: 34rpx; border-radius: 50%; border: 2rpx solid $sg-text-3; display: flex; align-items: center; justify-content: center; font-size: 22rpx; color: #fff; margin-right: 14rpx; flex-shrink: 0; margin-top: 2rpx; }
.cb.on { background: $sg-primary; border-color: $sg-primary; }
.agree-txt { flex: 1; font-size: 21rpx; color: $sg-text-3; line-height: 1.5; }
</style>
