<script setup lang="ts">
import { mgmtAccounts, scopeLevels } from "@/mock/regions";
import { MGMT_ROLES, MGMT_MODULES, MGMT_MATRIX, PERM_LABEL } from "@/store/admin";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");

const scopeColor: Record<string, string> = { 全国: "#c0392b", 省域: "#d99a2b", 地市: "#16884c", 单点: "#2b6cb0" };

function edit(name: string) {
  if (productionBuild) return uni.showModal({ title: "需后台权限审批", content: `正式环境「${name}」权限变更必须由独立管理后台完成复核、最小授权和审计留痕；当前未修改本地权限。`, showCancel: false });
  uni.showModal({ title: "编辑权限", content: `调整「${name}」的管理角色、数据权限范围与可管理模块。`,
    confirmText: "保存", success: (r) => { if (r.confirm) uni.showToast({ title: "已保存", icon: "success" }); } });
}
function addAccount() {
  if (productionBuild) return uni.showModal({ title: "需后台账号审批", content: "正式环境新增管理员必须在独立管理后台完成实名、岗位、数据范围和双人复核；当前未创建本地账号。", showCancel: false });
  uni.showToast({ title: "新增管理账号", icon: "none" });
}
function permCls(p: string) { return p; }
function toDetail() { uni.navigateTo({ url: "/pages/admin/permdetail?role=super" }); }
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty">
      <text class="production-empty-title">暂无后台权限档案</text>
      <text class="production-empty-text">正式环境的管理员账号、岗位、区域范围和模块权限必须由后台岗位服务实时返回并留存双人复核记录。本页面不展示本地账号和权限矩阵样例。</text>
    </view>
    <template v-else>
    <view class="hd">
      <text class="hd-t">管理权限设置</text>
      <text class="hd-s">管理角色 · 数据权限范围（全国/省域/地市/单点）· 模块权限</text>
    </view>

    <!-- 数据权限范围说明 -->
    <view class="scopes">
      <view class="scope" v-for="s in scopeLevels" :key="s">
        <text class="sc-dot" :style="{ background: scopeColor[s] }"></text><text class="sc-n">{{ s }}</text>
      </view>
    </view>

    <!-- 操作级明细入口 -->
    <view class="detail-entry" @tap="toDetail">
      <text class="de-ic">🧩</text>
      <view class="de-i"><text class="de-t">操作级权限明细</text><text class="de-d">每个模块细分到具体功能点 · 逐角色授权一览</text></view>
      <text class="de-go">查看 ›</text>
    </view>

    <!-- 管理账号 -->
    <view class="sec">管理账号（{{ mgmtAccounts.length }}）<text class="add" @tap="addAccount">＋ 新增</text></view>
    <view class="acc" v-for="a in mgmtAccounts" :key="a.name" @tap="edit(a.name)">
      <view class="badge">{{ a.short }}</view>
      <view class="acc-i">
        <view class="acc-top"><text class="acc-n">{{ a.name }}</text><text class="acc-scope" :style="{ background: scopeColor[a.scopeLevel] }">{{ a.scopeLevel }}</text></view>
        <text class="acc-role">{{ a.role }} · {{ a.scope }}</text>
        <view class="acc-mods"><text class="mod" v-for="m in a.modules" :key="m">{{ m }}</text></view>
      </view>
      <text class="acc-edit">编辑 ›</text>
    </view>

    <!-- 角色权限矩阵 -->
    <view class="sec">角色权限矩阵</view>
    <view class="matrix sg-card">
      <view class="mrow head">
        <text class="mc0">模块 \ 角色</text>
        <text class="mc" v-for="r in MGMT_ROLES" :key="r.key">{{ r.short }}</text>
      </view>
      <view class="mrow" v-for="m in MGMT_MODULES" :key="m.key">
        <text class="mc0">{{ m.name }}</text>
        <text class="mc cell" v-for="r in MGMT_ROLES" :key="r.key" :class="permCls(MGMT_MATRIX[r.key][m.key])">
          {{ MGMT_MATRIX[r.key][m.key] === 'full' ? '●' : (MGMT_MATRIX[r.key][m.key] === 'read' ? '◐' : '—') }}
        </text>
      </view>
      <view class="legend">
        <text class="lg"><text class="d full">●</text>可管理</text>
        <text class="lg"><text class="d read">◐</text>仅查看</text>
        <text class="lg"><text class="d none">—</text>无权限</text>
      </view>
    </view>
    <view class="tip">🔒 遵循最小必要授权 · 数据权限按区域逐级下放 · 越权操作自动拦截并上链留痕</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, #334155, #1e293b); padding: 36rpx 28rpx; color: #fff; }
.hd-t { font-size: 32rpx; font-weight: 800; }
.hd-s { font-size: 21rpx; opacity: 0.85; margin-top: 8rpx; display: block; }
.scopes { display: flex; justify-content: space-around; background: #fff; margin: 24rpx; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx 0; }
.scope { display: flex; align-items: center; }
.sc-dot { width: 20rpx; height: 20rpx; border-radius: 50%; margin-right: 8rpx; }
.sc-n { font-size: 23rpx; }
.detail-entry { display: flex; align-items: center; margin: 0 24rpx 8rpx; padding: 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #334155, #1e293b); box-shadow: $sg-shadow; }
.de-ic { font-size: 40rpx; margin-right: 16rpx; }
.de-i { flex: 1; display: flex; flex-direction: column; }
.de-t { font-size: 27rpx; font-weight: 700; color: #fff; }
.de-d { font-size: 20rpx; color: rgba(255,255,255,0.75); margin-top: 2rpx; }
.de-go { font-size: 22rpx; color: $sg-gold; }
.sec { padding: 8rpx 28rpx 12rpx; font-size: 28rpx; font-weight: 700; display: flex; justify-content: space-between; align-items: center; }
.add { font-size: 23rpx; color: $sg-primary; font-weight: 600; }
.acc { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 16rpx; padding: 22rpx; }
.badge { width: 64rpx; height: 64rpx; border-radius: 18rpx; background: #334155; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 30rpx; font-weight: 800; margin-right: 18rpx; }
.acc-i { flex: 1; display: flex; flex-direction: column; }
.acc-top { display: flex; align-items: center; }
.acc-n { font-size: 27rpx; font-weight: 700; }
.acc-scope { font-size: 18rpx; color: #fff; padding: 2rpx 12rpx; border-radius: 999rpx; margin-left: 12rpx; }
.acc-role { font-size: 21rpx; color: $sg-text-3; margin: 4rpx 0; }
.acc-mods { display: flex; flex-wrap: wrap; }
.mod { font-size: 18rpx; color: $sg-text-2; background: $sg-bg; padding: 2rpx 12rpx; border-radius: 6rpx; margin: 4rpx 8rpx 0 0; }
.acc-edit { font-size: 22rpx; color: $sg-text-3; }
.matrix { padding: 20rpx 16rpx; }
.mrow { display: flex; align-items: center; padding: 12rpx 0; border-bottom: 2rpx solid $sg-border; }
.mrow.head { border-bottom: 2rpx solid $sg-border; }
.mrow.head .mc { font-weight: 700; color: $sg-text-2; }
.mc0 { flex: 2; font-size: 22rpx; }
.mc { flex: 1; text-align: center; font-size: 22rpx; }
.cell.full { color: $sg-primary; font-weight: 700; }
.cell.read { color: $sg-gold; }
.cell.none { color: $sg-text-3; }
.legend { display: flex; justify-content: center; gap: 30rpx; padding-top: 16rpx; }
.lg { font-size: 21rpx; color: $sg-text-3; }
.d { margin-right: 6rpx; }
.d.full { color: $sg-primary; }
.d.read { color: $sg-gold; }
.d.none { color: $sg-text-3; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
.production-empty { margin: 40rpx 24rpx; padding: 34rpx 28rpx; border: 2rpx solid #d8e7de; border-radius: 22rpx; background: #f7fbf8; }
.production-empty-title { display: block; color: #145d3c; font-size: 32rpx; font-weight: 900; }
.production-empty-text { display: block; margin-top: 16rpx; color: #5e7167; font-size: 24rpx; line-height: 1.7; }
</style>
