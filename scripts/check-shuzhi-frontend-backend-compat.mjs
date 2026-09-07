#!/usr/bin/env node
/**
 * Check the API contract used by the v8533 frontend.
 *
 * The current frontend is wired to local-backend/server.mjs (the v8530 BFF
 * contract). cloud-server is a separate MySQL domain service and must not be
 * selected as VITE_API_BASE until an explicit adapter is implemented.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const read = (file) => readFileSync(resolve(root, file), "utf8");
const readIfPresent = (file) => {
  try {
    return read(file);
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
};
const api = read("work/shuzhi-v8502-source/src/services/localApi.ts");
const local = read("local-backend/server.mjs");
// cloud-server is a historical, optional tree. Some local checkouts retain
// extra source files that are intentionally not part of the v8533 release;
// a clean CI checkout must still be able to verify the current API boundary.
const cloud = [
  "cloud-server/src/server.ts",
  "cloud-server/src/b2b-routes.ts",
  "cloud-server/src/b2b-workflow-routes.ts",
  "cloud-server/src/commerce-routes.ts",
  "cloud-server/src/merchant-product-routes.ts",
].map(readIfPresent).join("\n");

const checks = [];
const add = (level, name, detail) => checks.push({ level, name, detail });
const sourceHasRoute = (source, route) => source.includes(route) || source.includes(route.replaceAll("/", "\\/"));

const frontendRoutes = [
  "/api/v1/auth/wechat/session",
  "/api/v1/auth/logout",
  "/api/v1/trade-config",
  "/api/v1/products",
  "/api/v1/purchase-demands",
  "/api/v1/trades",
  "/api/v1/invoices",
  "/api/v1/purchase-quotes",
  "/api/v1/merchants",
  "/api/v1/merchant-applications",
  "/api/v1/operations/catalog",
  "/api/v1/operations/",
  "/api/v1/platform/features",
  "/api/v1/platform/events",
  "/api/v1/admin/context",
];

const actionRoutes = [
  "contractSignMatch",
  "/accept",
  "/invoice",
  "/settle",
  "/cancel",
  "/ledger",
  "/advance",
  "/reset",
];

const missingLocal = frontendRoutes.filter((route) => !sourceHasRoute(local, route));
const missingLocalActions = actionRoutes.filter((route) => !sourceHasRoute(local, route));
add(
  missingLocal.length === 0 && missingLocalActions.length === 0 ? "pass" : "fail",
  "local-backend 路由闭包",
  missingLocal.length === 0 && missingLocalActions.length === 0
    ? `${frontendRoutes.length} 个资源路由和 ${actionRoutes.length} 个交易动作均存在`
    : `缺少资源：${missingLocal.join(", ")}；缺少动作：${missingLocalActions.join(", ")}`,
);

add(
  api.includes('payload?.code === 0') && local.includes('code: 0')
    ? "pass"
    : "fail",
  "统一响应信封",
  "前台 requestJson 要求 code=0，local-backend 必须返回 {code,data,message}，禁止静默接受 HTML 或其他后端信封",
);

add(
  api.includes('token: string') && api.includes('expires_at') && api.includes('user:') && local.includes('expires_at') && local.includes('user:')
    ? "pass"
    : "fail",
  "微信登录响应契约",
  "登录响应必须提供 token、expires_at 和 user，前台才能建立企业角色会话",
);

const cloudMissing = frontendRoutes.filter((route) => !sourceHasRoute(cloud, route));
const cloudMissingActions = actionRoutes.filter((route) => !sourceHasRoute(cloud, route));
const historicalCloudIsolated =
  read("cloud-server/README.md").includes("历史隔离说明（数智供社 v8533）") &&
  read("cloud-server/README.md").includes("不得将本目录接入当前生产域名或小程序") &&
  read("docs/frontend-backend-sync.md").includes("生产配置不得直连 cloud-server");
const frontendSelectsHistoricalCloud = api.includes("cloud-server") || api.includes("cloudServer");
add(
  frontendSelectsHistoricalCloud
    ? "fail"
    : historicalCloudIsolated
      ? "pass"
      : "warn",
  "cloud-server 历史隔离",
  frontendSelectsHistoricalCloud
    ? "前台源码仍直接引用历史 cloud-server，禁止切换生产 API"
    : historicalCloudIsolated
      ? `cloud-server 已明确标记为历史后端（当前缺少 ${cloudMissing.length} 个资源路由和 ${cloudMissingActions.length} 个交易动作），当前 v8533 前台只接 local-backend；迁移须另行完成适配层`
      : `历史隔离证据不完整或出现部分路由，仍缺少 ${cloudMissing.length} 个资源路由和 ${cloudMissingActions.length} 个交易动作`,
);

add(
  historicalCloudIsolated
    ? "pass"
    : cloud.includes("accessToken") && cloud.includes("expiresAt") && !cloud.includes("token: string")
      ? "fail"
      : "pass",
  "历史后端登录契约隔离",
  historicalCloudIsolated
    ? "历史 cloud-server 的 accessToken/expiresAt 契约不参与当前 v8533 前台"
    : "cloud-server 当前返回 accessToken/expiresAt，若要迁移必须补齐 token/expires_at/user 适配",
);

for (const item of checks) console.log(`${item.level === "pass" ? "PASS" : item.level === "warn" ? "WARN" : "FAIL"}  ${item.name}  ${item.detail}`);
const failures = checks.filter((item) => item.level === "fail").length;
const warnings = checks.filter((item) => item.level === "warn").length;
console.log(`\n前台—后端兼容性检查：${checks.length - failures - warnings} 通过，${warnings} 警告，${failures} 失败`);
process.exitCode = failures ? 1 : 0;
