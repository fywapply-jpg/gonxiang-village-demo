import { defineStore } from "pinia";

/** 平台管理角色（精简版）——对应细则「统一运营后台 · 多角色权限分级」 */
export type MgmtKey = "super" | "ops" | "audit" | "finance" | "service";

export interface MgmtRole {
  key: MgmtKey;
  name: string;
  short: string;
  org: string;
  desc: string;
}

export const MGMT_ROLES: MgmtRole[] = [
  { key: "super", name: "超级管理员", short: "超", org: "供销集团 · 平台运营总部", desc: "平台最高权限，账号与权限分配" },
  { key: "ops", name: "运营管理员", short: "运", org: "运营中心", desc: "商户招商、内容运营、活动公告" },
  { key: "audit", name: "审核员", short: "审", org: "审核中心", desc: "资质、货源、溯源、金融初审" },
  { key: "finance", name: "财务结算", short: "财", org: "财务结算中心", desc: "货款结算、发票、分红、提现" },
  { key: "service", name: "客服专员", short: "客", org: "客服中心", desc: "工单、投诉、售后处理" },
];

/** 权限模块 */
export interface MgmtModule { key: string; name: string; icon: string; }
export const MGMT_MODULES: MgmtModule[] = [
  { key: "merchant", name: "商户管理", icon: "🏪" },
  { key: "content", name: "内容运营", icon: "📣" },
  { key: "audit", name: "审核中心", icon: "✅" },
  { key: "finance", name: "财务结算", icon: "💰" },
  { key: "risk", name: "风控合规", icon: "🛡️" },
  { key: "service", name: "客服工单", icon: "🎧" },
  { key: "data", name: "数据看板", icon: "📊" },
  { key: "system", name: "系统/权限", icon: "⚙️" },
];

/** 权限级别：full 可管理 / read 仅查看 / none 无权限 */
export type Perm = "full" | "read" | "none";
// 模块级 = 该模块下各操作级权限的汇总（取最高），与 mock/permissions.ts 的操作级明细严格一致
export const MGMT_MATRIX: Record<MgmtKey, Record<string, Perm>> = {
  super:   { merchant: "full", content: "full", audit: "full", finance: "full", risk: "full", service: "full", data: "full", system: "full" },
  ops:     { merchant: "full", content: "full", audit: "read", finance: "none", risk: "none", service: "read", data: "full", system: "read" },
  audit:   { merchant: "read", content: "full", audit: "full", finance: "none", risk: "read", service: "none", data: "read", system: "read" },
  finance: { merchant: "none", content: "none", audit: "read", finance: "full", risk: "read", service: "read", data: "read", system: "read" },
  service: { merchant: "read", content: "read", audit: "none", finance: "read", risk: "none", service: "full", data: "read", system: "read" },
};

export const PERM_LABEL: Record<Perm, string> = { full: "可管理", read: "仅查看", none: "无权限" };

export const useAdminStore = defineStore("admin", {
  state: () => ({ mgmtKey: "super" as MgmtKey }),
  getters: {
    role(state): MgmtRole { return MGMT_ROLES.find((r) => r.key === state.mgmtKey) || MGMT_ROLES[0]; },
    perms(state): Record<string, Perm> { return MGMT_MATRIX[state.mgmtKey]; },
    modules(state): MgmtModule[] {
      const p = MGMT_MATRIX[state.mgmtKey];
      return MGMT_MODULES.filter((m) => p[m.key] !== "none");
    },
  },
  actions: {
    switchMgmt(k: MgmtKey) { this.mgmtKey = k; },
  },
});
