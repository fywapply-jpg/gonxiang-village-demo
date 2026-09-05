<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { MODULE_OPS } from "@/mock/permissions";
import { MGMT_ROLES, PERM_LABEL, type MgmtKey, type Perm } from "@/store/admin";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const roleKey = ref<MgmtKey>("super");
onLoad((q) => { if (q?.role) roleKey.value = q.role as MgmtKey; });
const roleName = computed(() => MGMT_ROLES.find((r) => r.key === roleKey.value)?.name || "");

const permColor: Record<Perm, string> = { full: "#16884c", read: "#d99a2b", none: "#9aa0aa" };

// 每模块该角色的可管理数/总数
function stat(ops: any[]) {
  const full = ops.filter((o) => o.roles[roleKey.value] === "full").length;
  const read = ops.filter((o) => o.roles[roleKey.value] === "read").length;
  return { full, read, total: ops.length };
}
// 该角色有权限的模块（至少 read）
const visibleModules = computed(() => MODULE_OPS.filter((m) => m.ops.some((o) => o.roles[roleKey.value] !== "none")));
const totalFull = computed(() => MODULE_OPS.reduce((s, m) => s + m.ops.filter((o) => o.roles[roleKey.value] === "full").length, 0));
const totalOps = computed(() => MODULE_OPS.reduce((s, m) => s + m.ops.length, 0));
</script>

<template>
  <view class="sg-page">
    <view v-if="!productionBuild" class="hd">
      <text class="hd-t">操作级权限明细</text>
      <text class="hd-s">按角色查看每个模块下的具体功能点授权</text>
    </view>

    <!-- 角色选择 -->
    <scroll-view v-if="!productionBuild" scroll-x class="roles">
      <text v-for="r in MGMT_ROLES" :key="r.key" class="role" :class="{ on: roleKey === r.key }" @tap="roleKey = r.key">{{ r.name }}</text>
    </scroll-view>

    <view v-if="!productionBuild" class="summary">
      <text class="sm-role">{{ roleName }}</text>
      <text class="sm-stat">可管理 {{ totalFull }} / 共 {{ totalOps }} 项操作 · {{ visibleModules.length }}/{{ MODULE_OPS.length }} 模块可见</text>
    </view>

    <!-- 各模块操作明细 -->
    <view v-if="!productionBuild" class="mod" v-for="m in MODULE_OPS" :key="m.key">
      <view class="mod-hd">
        <view class="mod-l"><text class="mod-ic">{{ m.icon }}</text><text class="mod-n">{{ m.name }}</text></view>
        <text class="mod-st">{{ stat(m.ops).full }} 可管理 · {{ stat(m.ops).read }} 查看</text>
      </view>
      <view class="op" v-for="o in m.ops" :key="o.op">
        <view class="op-i"><text class="op-n">{{ o.op }}</text><text class="op-d">{{ o.desc }}</text></view>
        <text class="op-p" :style="{ color: permColor[o.roles[roleKey]], background: o.roles[roleKey] === 'none' ? '#f2f3f5' : (o.roles[roleKey] === 'full' ? '#e8f5ee' : '#fbf2e0') }">{{ PERM_LABEL[o.roles[roleKey]] }}</text>
      </view>
    </view>

    <view v-if="!productionBuild" class="tip">🔒 最小必要授权 · 操作级细粒度控制 · 数据按区域范围叠加 · 越权拦截并上链留痕</view>
    <view v-else class="backend-note">正式环境权限矩阵由后台岗位、区域和数据权限接口实时返回；当前未配置真实管理员会话，已隐藏演示权限。</view>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, #334155, #1e293b); padding: 36rpx 28rpx; color: #fff; }
.hd-t { font-size: 32rpx; font-weight: 800; }
.hd-s { font-size: 21rpx; opacity: 0.85; margin-top: 8rpx; display: block; }
.roles { white-space: nowrap; padding: 20rpx 24rpx 4rpx; }
.role { display: inline-block; padding: 12rpx 28rpx; font-size: 24rpx; color: $sg-text-2; background: #fff; border-radius: 999rpx; margin-right: 14rpx; box-shadow: $sg-shadow; }
.role.on { background: #334155; color: #fff; }
.summary { display: flex; flex-direction: column; padding: 16rpx 28rpx 4rpx; }
.sm-role { font-size: 30rpx; font-weight: 800; }
.sm-stat { font-size: 21rpx; color: $sg-text-3; margin-top: 4rpx; }
.mod { background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 16rpx 24rpx 0; padding: 22rpx 24rpx; }
.mod-hd { display: flex; align-items: center; justify-content: space-between; padding-bottom: 12rpx; border-bottom: 2rpx solid $sg-border; }
.mod-l { display: flex; align-items: center; }
.mod-ic { font-size: 34rpx; margin-right: 12rpx; }
.mod-n { font-size: 28rpx; font-weight: 700; }
.mod-st { font-size: 20rpx; color: $sg-text-3; }
.op { display: flex; align-items: center; padding: 14rpx 0; border-top: 2rpx solid $sg-border; }
.op:nth-child(2) { border-top: none; }
.op-i { flex: 1; display: flex; flex-direction: column; }
.op-n { font-size: 25rpx; font-weight: 600; }
.op-d { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }
.op-p { font-size: 21rpx; font-weight: 600; padding: 6rpx 18rpx; border-radius: 999rpx; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
.backend-note { margin: 40rpx 28rpx; padding: 28rpx; border-radius: $sg-radius-lg; background: #fff8e8; color: #8a5a00; line-height: 1.6; font-size: 24rpx; }
</style>
