<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useAdminStore, MGMT_ROLES, MGMT_MODULES, MGMT_MATRIX, PERM_LABEL, type MgmtKey } from "@/store/admin";
import { useAuthStore } from "@/store/auth";
import { getAdminContext, recordPlatformEvent, switchAdminRole } from "@/services/localApi";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const admin = useAdminStore();
const auth = useAuthStore();
const backendOnline = ref(false);
const syncing = ref(false);

onMounted(async () => {
  try { await getAdminContext(admin.mgmtKey); backendOnline.value = true; void recordPlatformEvent("mine", "OPEN_ADMIN_CENTER", { role: admin.mgmtKey }).catch(() => {}); } catch { backendOnline.value = false; }
});

function adminFace() { uni.navigateTo({ url: "/pages/register/faceauth?scene=admin" }); }
// 管理员操作前置人脸核验：未核验则拦截并引导
function guard(fn: () => void) {
  if (auth.adminVerified) return fn();
  uni.showModal({
    title: "需人脸核验", content: "管理员执行操作前须完成本人人脸核验（本次会话有效）。", confirmText: "去核验",
    success: (r) => { if (r.confirm) adminFace(); },
  });
}

// 各角色待办
const todosMap: Record<MgmtKey, { t: string; tag: string }[]> = {
  super: [ { t: "3 项权限变更待批", tag: "系统" }, { t: "月度运营报告待确认", tag: "数据" } ],
  ops: [ { t: "12 家合作社入驻待招商跟进", tag: "商户" }, { t: "应急保供专区活动待发布", tag: "运营" } ],
  audit: [ { t: "8 份营业执照待审核", tag: "资质" }, { t: "5 条货源信息待审核", tag: "内容" }, { t: "3 笔溯源批次待核验", tag: "溯源" } ],
  finance: [ { t: "6 笔货款待结算", tag: "结算" }, { t: "Q2 全民分红待发放", tag: "分红" }, { t: "4 笔提现待复核", tag: "提现" } ],
  service: [ { t: "9 条客诉工单待处理", tag: "工单" }, { t: "2 笔售后待跟进", tag: "售后" } ],
};
const todos = computed(() => todosMap[admin.mgmtKey]);

async function pick(k: MgmtKey) {
  if (productionBuild) return uni.showModal({ title: "生产环境不可切换角色", content: "正式环境管理员角色由后台岗位令牌决定；请退出后使用对应岗位账号重新登录，前台不在本地切换权限。", showCancel: false });
  syncing.value = true;
  try { await switchAdminRole(k); backendOnline.value = true; admin.switchMgmt(k); uni.showToast({ title: "已切换：" + admin.role.name, icon: "none" }); }
  catch { backendOnline.value = false; if (!productionBuild) { admin.switchMgmt(k); uni.showToast({ title: "已切换本地联调角色", icon: "none" }); } else uni.showModal({ title: "后台未连接", content: "正式环境无法取得管理员岗位会话，未切换本地权限。", showCancel: false }); }
  finally { syncing.value = false; }
}
function openModule(name: string) {
  guard(() => {
    if (name.includes("数据")) return uni.navigateTo({ url: "/pages/admin/dashboard" });
    if (name.includes("系统") || name.includes("权限")) return uni.navigateTo({ url: "/pages/admin/permission" });
    // 其余模块 → 该角色的操作级权限明细
    uni.navigateTo({ url: `/pages/admin/permdetail?role=${admin.mgmtKey}` });
  });
}
function goRegion() { guard(() => uni.navigateTo({ url: "/pages/admin/region" })); }
function goPermission() { guard(() => uni.navigateTo({ url: "/pages/admin/permission" })); }
function permClass(p: string) { return p; }
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty">
      <text class="production-empty-title">请从独立后台管理台操作</text>
      <text class="production-empty-text">正式环境管理员岗位、待办、权限矩阵和区域范围只接受后台会话与实时接口返回。移动端不切换本地角色，也不展示静态待办或权限样例。</text>
    </view>
    <template v-else>
    <!-- 头部：当前管理身份 -->
    <view class="hd">
      <view class="hd-top">
        <view class="badge">{{ admin.role.short }}</view>
        <view class="hi">
          <text class="hn">{{ admin.role.name }}</text>
          <text class="ho">{{ admin.role.org }}</text>
        </view>
        <view class="tag-admin">管理端 · {{ backendOnline ? '后台已同步' : '本地待同步' }}</view>
      </view>
      <text class="hdesc">{{ admin.role.desc }}</text>
    </view>

    <!-- 管理员操作人脸核验闸 -->
    <view class="face-gate" :class="{ ok: auth.adminVerified }" @tap="adminFace">
      <text class="fg-ic">{{ auth.adminVerified ? '🛡️' : '⚠️' }}</text>
      <view class="fg-i">
        <text class="fg-t">{{ auth.adminVerified ? '管理员人脸核验已通过' : '管理员操作需人脸核验' }}</text>
        <text class="fg-s">{{ auth.adminVerified ? ('本次会话有效 · ' + auth.adminTime + ' · 操作全程留痕上链') : '所有管理操作前须本人人脸核验，防冒用、可追溯' }}</text>
      </view>
      <text class="fg-go">{{ auth.adminVerified ? '重新核验' : '去核验 ›' }}</text>
    </view>

    <!-- 切换管理角色 -->
    <view class="sg-card">
      <text class="ct">切换管理角色体验</text>
      <view class="roles">
        <view v-for="r in MGMT_ROLES" :key="r.key" class="role" :class="{ on: r.key === admin.mgmtKey }" @tap="pick(r.key)">
          <view class="r-badge" :class="{ on: r.key === admin.mgmtKey }">{{ r.short }}</view>
          <text class="r-name">{{ r.name }}</text>
        </view>
      </view>
    </view>

    <!-- 当前角色可用功能 -->
    <view class="sg-card">
      <text class="ct">我的管理权限 <text class="ct-sub">（{{ admin.modules.length }} 个可用模块）</text></text>
      <view class="grid">
        <view class="g" v-for="m in admin.modules" :key="m.key" @tap="openModule(m.name)">
          <view class="g-ic">{{ m.icon }}</view>
          <text class="g-lb">{{ m.name }}</text>
          <text class="g-perm" :class="admin.perms[m.key]">{{ PERM_LABEL[admin.perms[m.key]] }}</text>
        </view>
      </view>
    </view>

    <!-- 区域管理 + 权限设置 快捷入口 -->
    <view class="mg-entries">
      <view class="me" @tap="goRegion">
        <text class="me-ic">🗺️</text>
        <view class="me-i"><text class="me-t">区域管理</text><text class="me-s">以地市为中心 · 辐射供应链</text></view>
      </view>
      <view class="me" @tap="goPermission">
        <text class="me-ic">🔑</text>
        <view class="me-i"><text class="me-t">权限设置</text><text class="me-s">角色 · 数据范围 · 模块</text></view>
      </view>
    </view>

    <!-- 待办 -->
    <view class="sg-card">
      <text class="ct">待办事项</text>
      <view class="todo" v-for="(t, i) in todos" :key="i" @tap="openModule(t.t)">
        <view class="td-l"><text class="td-tag">{{ t.tag }}</text><text class="td-t">{{ t.t }}</text></view>
        <text class="td-go">处理 ›</text>
      </view>
    </view>

    <!-- 权限矩阵 -->
    <view class="sg-card">
      <text class="ct">角色权限矩阵</text>
      <text class="ct-sub2">✓ 可管理 · ○ 仅查看 · — 无权限</text>
      <scroll-view scroll-x class="mx-wrap">
        <view class="mx">
          <view class="mx-row head">
            <text class="mx-cell mod">模块 \ 角色</text>
            <text class="mx-cell" v-for="r in MGMT_ROLES" :key="r.key">{{ r.short }}</text>
          </view>
          <view class="mx-row" v-for="m in MGMT_MODULES" :key="m.key">
            <text class="mx-cell mod">{{ m.icon }} {{ m.name }}</text>
            <text class="mx-cell val" v-for="r in MGMT_ROLES" :key="r.key" :class="MGMT_MATRIX[r.key][m.key]">
              {{ MGMT_MATRIX[r.key][m.key] === 'full' ? '✓' : (MGMT_MATRIX[r.key][m.key] === 'read' ? '○' : '—') }}
            </text>
          </view>
        </view>
      </scroll-view>
      <text class="mx-legend">超=超级管理员 运=运营 审=审核员 财=财务 客=客服</text>
    </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, #334155, #1e293b); padding: 40rpx 28rpx 34rpx; color: #fff; }
.hd-top { display: flex; align-items: center; }
.badge { width: 84rpx; height: 84rpx; border-radius: 22rpx; background: rgba(255,255,255,0.18); display: flex; align-items: center; justify-content: center; font-size: 40rpx; font-weight: 800; margin-right: 20rpx; }
.hi { flex: 1; display: flex; flex-direction: column; }
.hn { font-size: 34rpx; font-weight: 800; }
.ho { font-size: 22rpx; opacity: 0.85; margin-top: 4rpx; }
.tag-admin { font-size: 20rpx; background: $sg-gold; color: #fff; padding: 6rpx 16rpx; border-radius: 999rpx; }
.hdesc { font-size: 23rpx; opacity: 0.9; margin-top: 16rpx; display: block; }

.face-gate { display: flex; align-items: center; margin: 20rpx 24rpx 0; padding: 20rpx 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #fff6e6, #fff); border: 2rpx solid #f0dcae; box-shadow: $sg-shadow; }
.face-gate.ok { background: linear-gradient(135deg, #eaf7ef, #fff); border-color: #b6e0c6; }
.fg-ic { font-size: 40rpx; margin-right: 14rpx; }
.fg-i { flex: 1; display: flex; flex-direction: column; }
.fg-t { font-size: 26rpx; font-weight: 700; color: #b5791b; }
.face-gate.ok .fg-t { color: $sg-primary-deep; }
.fg-s { font-size: 19rpx; color: $sg-text-3; margin-top: 4rpx; }
.fg-go { font-size: 23rpx; color: #b5791b; }
.face-gate.ok .fg-go { color: $sg-primary; }

.ct { font-size: 28rpx; font-weight: 700; display: block; margin-bottom: 16rpx; }
.ct-sub { font-size: 22rpx; color: $sg-text-3; font-weight: 400; }
.ct-sub2 { font-size: 21rpx; color: $sg-text-3; display: block; margin: -8rpx 0 14rpx; }

.roles { display: flex; flex-wrap: wrap; gap: 14rpx; }
.role { width: calc(33.33% - 10rpx); display: flex; flex-direction: column; align-items: center; padding: 18rpx 8rpx; border-radius: $sg-radius; background: $sg-bg; border: 3rpx solid transparent; }
.role.on { background: #eef2ff; border-color: #6366f1; }
.r-badge { width: 56rpx; height: 56rpx; border-radius: 50%; background: #cbd5e1; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 26rpx; font-weight: 700; }
.r-badge.on { background: linear-gradient(135deg, #6366f1, #4f46e5); }
.r-name { font-size: 22rpx; margin-top: 10rpx; }

.grid { display: flex; flex-wrap: wrap; }
.g { width: 25%; display: flex; flex-direction: column; align-items: center; padding: 16rpx 0; }
.g-ic { width: 80rpx; height: 80rpx; border-radius: 22rpx; background: $sg-primary-light; display: flex; align-items: center; justify-content: center; font-size: 42rpx; }
.g-lb { font-size: 22rpx; margin-top: 8rpx; }
.g-perm { font-size: 18rpx; margin-top: 4rpx; padding: 2rpx 10rpx; border-radius: 6rpx; }
.g-perm.full { color: $sg-primary; background: $sg-primary-light; }
.g-perm.read { color: $sg-text-3; background: $sg-bg; }
.mg-entries { display: flex; gap: 20rpx; margin: 20rpx 24rpx 0; }
.me { flex: 1; display: flex; align-items: center; background: linear-gradient(135deg, #334155, #1e293b); border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.me-ic { font-size: 40rpx; margin-right: 14rpx; }
.me-i { display: flex; flex-direction: column; }
.me-t { font-size: 26rpx; font-weight: 700; color: #fff; }
.me-s { font-size: 18rpx; color: rgba(255,255,255,0.7); margin-top: 4rpx; }

.todo { display: flex; align-items: center; justify-content: space-between; padding: 20rpx 0; border-top: 2rpx solid $sg-border; }
.td-l { display: flex; align-items: center; flex: 1; }
.td-tag { font-size: 19rpx; color: #4f46e5; background: #eef2ff; padding: 3rpx 12rpx; border-radius: 6rpx; margin-right: 14rpx; }
.td-t { font-size: 25rpx; }
.td-go { font-size: 23rpx; color: #4f46e5; }

.mx-wrap { width: 100%; }
.mx { display: inline-block; min-width: 100%; }
.mx-row { display: flex; }
.mx-row.head .mx-cell { font-weight: 700; color: $sg-text-2; background: $sg-bg; }
.mx-cell { width: 90rpx; text-align: center; padding: 16rpx 0; font-size: 24rpx; border-bottom: 2rpx solid $sg-border; }
.mx-cell.mod { width: 220rpx; text-align: left; font-size: 23rpx; padding-left: 8rpx; }
.mx-cell.val.full { color: $sg-primary; font-weight: 700; }
.mx-cell.val.read { color: $sg-text-2; }
.mx-cell.val.none { color: $sg-text-3; }
.mx-legend { font-size: 20rpx; color: $sg-text-3; margin-top: 14rpx; display: block; }
.production-empty { margin: 40rpx 24rpx; padding: 34rpx 28rpx; border: 2rpx solid #d8e7de; border-radius: 22rpx; background: #f7fbf8; }
.production-empty-title { display: block; color: #145d3c; font-size: 32rpx; font-weight: 900; }
.production-empty-text { display: block; margin-top: 16rpx; color: #5e7167; font-size: 24rpx; line-height: 1.7; }
</style>
