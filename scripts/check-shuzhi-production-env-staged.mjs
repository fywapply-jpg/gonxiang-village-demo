#!/usr/bin/env node

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;
const tempRoot = mkdtempSync(join(tmpdir(), "shuzhi-production-env-staged-"));
const checks = [];
const add = (ok, name, detail) => {
  checks.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`);
};

const baseEnv = [
  "SHUZHI_RUNTIME_MODE=production",
  "SHUZHI_DEPLOY_ENV=staging",
  "SHUZHI_SERVICE_NAME=shuzhi-api",
  "SHUZHI_PLATFORM_VERSION=v8533",
  "SHUZHI_RELEASE_VERSION=v8530",
  `SHUZHI_DB=${join(tempRoot, "production.sqlite")}`,
  "SHUZHI_API_TOKEN=internal-token-123456789012345678901234567890",
  'SHUZHI_ADMIN_TOKEN_ROLES={"admin-token-123456789012345678":"super"}',
  'SHUZHI_USER_TOKEN_PRINCIPALS={"user-token-123456789012345678":{"id":"buyer","role":"buyer","merchant_id":"m-buyer"}}',
  "SHUZHI_WECHAT_OPENID_PRINCIPALS={}",
  "SHUZHI_ALLOWED_ORIGIN=https://app.example.cn",
  "VITE_API_BASE=https://api.example.cn",
  "SHUZHI_WECHAT_AUTH_READY=false",
  "SHUZHI_CA_READY=false",
  "SHUZHI_PAYMENT_READY=false",
  "SHUZHI_LOGISTICS_READY=false",
  "SHUZHI_INVOICE_READY=false",
  "SHUZHI_REGULATOR_READY=false",
  "SHUZHI_HTTPS_ACCEPTANCE_REF=tls-evidence-001",
  "SHUZHI_DATABASE_ACCEPTANCE_REF=db-evidence-001",
].join("\n");

const run = (name, extra, expectedExit) => {
  const file = join(tempRoot, `${name}.env`);
  writeFileSync(file, `${baseEnv}\n${extra}\n`, { mode: 0o600 });
  const result = spawnSync(process.execPath, ["scripts/check-shuzhi-production-env.mjs", file], { cwd: root, encoding: "utf8" });
  add(result.status === expectedExit, name, `exit=${result.status}（预期 ${expectedExit}）`);
};

try {
  run("未开通机构保持分阶段", "", 0);
  run("声明支付 ready 但缺少机构凭证", "SHUZHI_PAYMENT_READY=true", 1);
  run("微信 ready 但缺少主体映射", "SHUZHI_WECHAT_AUTH_READY=true\nWECHAT_APP_ID=wx-test\nWECHAT_APP_SECRET=wechat-secret", 1);
  run("微信 ready 且主体映射完整", 'SHUZHI_WECHAT_AUTH_READY=true\nWECHAT_APP_ID=wx-test\nWECHAT_APP_SECRET=wechat-secret\nSHUZHI_WECHAT_OPENID_PRINCIPALS={"openid-test":{"id":"buyer","role":"buyer","merchant_id":"m-buyer"}}\nSHUZHI_WECHAT_ACCEPTANCE_REF=wechat-evidence-001', 0);
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

const failures = checks.filter((ok) => !ok).length;
console.log(`\n数智供社 v8533 分阶段配置回归：${checks.length - failures} 通过，${failures} 失败`);
process.exitCode = failures ? 1 : 0;
