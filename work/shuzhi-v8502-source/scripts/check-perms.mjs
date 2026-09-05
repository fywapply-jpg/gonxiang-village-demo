#!/usr/bin/env node
/**
 * 权限一致性校验
 * 校验「模块级权限矩阵」(src/store/admin.ts MGMT_MATRIX)
 * 与「操作级权限明细」(src/mock/permissions.ts MODULE_OPS) 是否一致：
 *   模块级权限 = 该模块下各操作级权限的最高值（full > read > none）。
 * 用法：node scripts/check-perms.mjs   或   npm run check:perms
 * 一致 → 退出码 0；不一致 → 打印明细并退出码 1。
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const RANK = { none: 0, read: 1, full: 2 };
const NAME = ["none", "read", "full"];
const SHORT = { F: "full", R: "read", N: "none" };
const ROLES = ["super", "ops", "audit", "finance", "service"];
const MODS = ["merchant", "content", "audit", "finance", "risk", "service", "data", "system"];

// 1) 解析模块级矩阵
const adminSrc = readFileSync(join(root, "src/store/admin.ts"), "utf8");
const matrix = {};
for (const m of adminSrc.matchAll(/(\w+):\s*\{\s*(merchant[^}]*)\}/g)) {
  const role = m[1];
  if (!ROLES.includes(role)) continue;
  matrix[role] = {};
  for (const [, k, v] of m[2].matchAll(/(\w+):\s*"(\w+)"/g)) matrix[role][k] = v;
}

// 2) 解析操作级明细，按模块汇总每个角色的最高权限
const permSrc = readFileSync(join(root, "src/mock/permissions.ts"), "utf8");
const rollup = {}; // mod -> role -> rank
for (const blk of permSrc.matchAll(/\{\s*key:\s*"(\w+)"[\s\S]*?ops:\s*\[([\s\S]*?)\]\s*\}/g)) {
  const mod = blk[1];
  rollup[mod] = Object.fromEntries(ROLES.map((r) => [r, 0]));
  for (const rolesObj of blk[2].matchAll(/roles:\s*\{([^}]*)\}/g)) {
    for (const [, rk, sv] of rolesObj[1].matchAll(/(\w+):\s*([FRN])/g)) {
      rollup[mod][rk] = Math.max(rollup[mod][rk], RANK[SHORT[sv]]);
    }
  }
}

// 3) 比对
const issues = [];
for (const role of ROLES) {
  for (const mod of MODS) {
    const mLvl = matrix[role]?.[mod] ?? "none";
    const oLvl = NAME[rollup[mod]?.[role] ?? 0];
    if (mLvl !== oLvl) issues.push(`${role} / ${mod}：矩阵=${mLvl}  操作级汇总=${oLvl}`);
  }
}

if (issues.length === 0) {
  console.log("✅ 权限一致性校验通过：模块级矩阵与操作级明细完全一致（5 角色 × 8 模块）。");
  process.exit(0);
} else {
  console.error(`❌ 发现 ${issues.length} 处权限不一致：`);
  for (const i of issues) console.error("  ⚠️  " + i);
  console.error("\n修复：把 src/store/admin.ts 的 MGMT_MATRIX 改为操作级汇总值，或调整 src/mock/permissions.ts 的操作级权限。");
  process.exit(1);
}
