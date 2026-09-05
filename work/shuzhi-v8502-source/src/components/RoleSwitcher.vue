<script setup lang="ts">
import { ref } from "vue";
import { useUserStore, ROLES, type RoleKey } from "@/store/user";

const user = useUserStore();
const open = ref(false);

function pick(k: RoleKey) {
  user.switchRole(k);
  open.value = false;
  uni.showToast({ title: "已切换：" + user.role.name, icon: "none" });
}
</script>

<template>
  <view class="rs">
    <view class="rs-fab" @tap="open = !open">
      <text class="rs-fab-t">{{ user.role.short }}</text>
      <text class="rs-fab-s">切角色</text>
    </view>
    <view v-if="open" class="rs-mask" @tap="open = false"></view>
    <view v-if="open" class="rs-panel">
      <view class="rs-title">选择当前工作身份</view>
      <view class="rs-sub">前台入口按企业主体、岗位授权和业务状态展示</view>
      <view
        v-for="r in ROLES"
        :key="r.key"
        class="rs-item"
        :class="{ on: r.key === user.roleKey }"
        @tap="pick(r.key)"
      >
        <view class="rs-badge">{{ r.short }}</view>
        <view class="rs-info">
          <text class="rs-name">{{ r.name }}</text>
          <text class="rs-desc">{{ r.desc }}</text>
        </view>
        <text v-if="r.key === user.roleKey" class="rs-check">✔</text>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.rs-fab {
  position: fixed;
  right: 20rpx;
  bottom: 180rpx;
  z-index: 90;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, $sg-gold, #c8871f);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(200, 135, 31, 0.45);
}
.rs-fab-t { font-size: 34rpx; font-weight: 700; line-height: 1.1; }
.rs-fab-s { font-size: 18rpx; }
.rs-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 95;
}
.rs-panel {
  position: fixed;
  left: 24rpx;
  right: 24rpx;
  bottom: 40rpx;
  z-index: 96;
  background: #fff;
  border-radius: $sg-radius-lg;
  padding: 28rpx;
}
.rs-title { font-size: 32rpx; font-weight: 700; }
.rs-sub { font-size: 22rpx; color: $sg-text-3; margin: 6rpx 0 18rpx; display: block; }
.rs-item {
  display: flex;
  align-items: center;
  padding: 18rpx;
  border-radius: $sg-radius;
  margin-bottom: 12rpx;
  background: $sg-bg;
  &.on { background: $sg-primary-light; }
}
.rs-badge {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: $sg-primary;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 700;
  margin-right: 18rpx;
}
.rs-info { flex: 1; display: flex; flex-direction: column; }
.rs-name { font-size: 28rpx; font-weight: 600; }
.rs-desc { font-size: 22rpx; color: $sg-text-3; }
.rs-check { color: $sg-primary; font-weight: 700; }
</style>
