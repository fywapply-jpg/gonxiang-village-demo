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
const api = read("work/shuzhi-v8502-source/src/services/localApi.ts");
const local = read("local-backend/server.mjs");
const cloud = read("cloud-server/src/server.ts") + "\n" + read("cloud-server/src/b2b-routes.ts") + "\n" + read("cloud-server/src/b2b-workflow-routes.ts") + "\n" + read("cloud-server/src/commerce-routes.ts") + "\n" + read("cloud-server/src/merchant-product-routes.ts");

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
add(
  cloudMissing.length === frontendRoutes.length && cloudMissingActions.length === actionRoutes.length ? "fail" : "warn",
  "cloud-server 直连门禁",
  cloudMissing.length === frontendRoutes.length && cloudMissingActions.length === actionRoutes.length
    ? "cloud-server 未实现前台 legacy BFF 路由；不得把 VITE_API_BASE 直接切到 cloud-server，需先完成适配层"
    : `cloud-server 仍缺少 ${cloudMissing.length} 个资源路由和 ${cloudMissingActions.length} 个交易动作`,
);

add(
  cloud.includes("accessToken") && cloud.includes("expiresAt") && !cloud.includes("token: string")
    ? "fail"
    : "pass",
  "cloud-server 登录字段隔离",
  "cloud-server 当前返回 accessToken/expiresAt 且不返回前台要求的 token/expires_at/user，属于未完成适配的证据",
);

for (const item of checks) console.log(`${item.level === "pass" ? "PASS" : item.level === "warn" ? "WARN" : "FAIL"}  ${item.name}  ${item.detail}`);
const failures = checks.filter((item) => item.level === "fail").length;
const warnings = checks.filter((item) => item.level === "warn").length;
console.log(`\n前台—后端兼容性检查：${checks.length - failures - warnings} 通过，${warnings} 警告，${failures} 失败`);
process.exitCode = failures ? 1 : 0;
