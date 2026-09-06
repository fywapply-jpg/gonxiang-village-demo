#!/usr/bin/env node

import { randomBytes } from "node:crypto";
import { chmodSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
const options = {};
for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === "--force") { options.force = true; continue; }
  if (arg === "--help" || arg === "-h") {
    console.log("用法：node scripts/create-shuzhi-production-env.mjs --output /etc/shuzhi-v8530.env --app-domain app.example.cn --api-domain api.example.cn [--force]");
    process.exit(0);
  }
  if (!arg.startsWith("--") || !args[index + 1] || args[index + 1].startsWith("--")) throw new Error(`参数格式错误：${arg}`);
  options[arg.slice(2)] = args[++index];
}

const output = options.output ? resolve(options.output) : "";
const appDomain = String(options["app-domain"] || "").trim().toLowerCase();
const apiDomain = String(options["api-domain"] || "").trim().toLowerCase();
const validDomain = (value) => Boolean(value) && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?(?::\d+)?$/.test(value) && !value.includes("CHANGE_ME");
if (!output) throw new Error("必须指定 --output；为避免误写，脚本不会默认写入系统目录");
if (!validDomain(appDomain) || !validDomain(apiDomain)) throw new Error("--app-domain 和 --api-domain 必须是实际域名，不能使用 CHANGE_ME 或路径");
if (existsSync(output) && !options.force) throw new Error(`文件已存在：${output}；如确认轮换令牌，请显式使用 --force`);

const token = () => randomBytes(32).toString("hex");
const adminTokens = Object.fromEntries(["super", "ops", "audit", "finance", "service"].map((role) => [`${role}-${token()}`, role]));
const userTokens = {
  [token()]: { id: "buyer-user", name: "采购经办人", role: "buyer", merchant_id: "m-buyer" },
  [token()]: { id: "supplier-user", name: "供货经办人", role: "supplier", merchant_id: "m-supplier" },
};
const lines = [
  "# 数智供社 v8533 / API v8530 生产环境文件（由 create-shuzhi-production-env.mjs 生成）",
  "SHUZHI_RUNTIME_MODE=production",
  "SHUZHI_DEPLOY_ENV=tencent-prod",
  "SHUZHI_SERVICE_NAME=shuzhi-v8530",
  "SHUZHI_PLATFORM_VERSION=v8533",
  "SHUZHI_RELEASE_VERSION=v8530",
  "PORT=8787",
  "SHUZHI_DB=/var/lib/shuzhi-v8530/shuzhi.db",
  "SHUZHI_MAX_BODY_BYTES=1048576",
  "SHUZHI_WEBHOOK_REPLAY_WINDOW_SECONDS=300",
  `SHUZHI_API_TOKEN=${token()}`,
  `SHUZHI_ADMIN_TOKEN_ROLES=${JSON.stringify(adminTokens)}`,
  "# 微信认证 ready 后清空此项；在联调完成前保留为受控短期令牌。",
  `SHUZHI_USER_TOKEN_PRINCIPALS=${JSON.stringify(userTokens)}`,
  "WECHAT_APP_ID=CHANGE_ME_WECHAT_APP_ID",
  "WECHAT_APP_SECRET=CHANGE_ME_WECHAT_APP_SECRET",
  "SHUZHI_WECHAT_SESSION_URL=https://api.weixin.qq.com/sns/jscode2session",
  "SHUZHI_WECHAT_OPENID_PRINCIPALS={}",
  `SHUZHI_ALLOWED_ORIGIN=https://${appDomain}`,
  `VITE_API_BASE=https://${apiDomain}`,
  "SHUZHI_CA_ADAPTER_URL=https://CHANGE_ME_CA_ADAPTER",
  `SHUZHI_CA_ADAPTER_SECRET=${token()}`,
  "SHUZHI_PAYMENT_ADAPTER_URL=https://CHANGE_ME_PAYMENT_ADAPTER",
  `SHUZHI_PAYMENT_ADAPTER_SECRET=${token()}`,
  "SHUZHI_LOGISTICS_ADAPTER_URL=https://CHANGE_ME_LOGISTICS_ADAPTER",
  `SHUZHI_LOGISTICS_ADAPTER_SECRET=${token()}`,
  "SHUZHI_INVOICE_ADAPTER_URL=https://CHANGE_ME_INVOICE_ADAPTER",
  `SHUZHI_INVOICE_ADAPTER_SECRET=${token()}`,
  "SHUZHI_REGULATOR_ADAPTER_URL=https://CHANGE_ME_REGULATOR_ADAPTER",
  `SHUZHI_REGULATOR_ADAPTER_SECRET=${token()}`,
  `CA_WEBHOOK_SECRET=${token()}`,
  `LOGISTICS_WEBHOOK_SECRET=${token()}`,
  `PAYMENT_WEBHOOK_SECRET=${token()}`,
  `INVOICE_WEBHOOK_SECRET=${token()}`,
  `REGULATOR_WEBHOOK_SECRET=${token()}`,
  "SHUZHI_WECHAT_AUTH_READY=false",
  "SHUZHI_CA_READY=false",
  "SHUZHI_PAYMENT_READY=false",
  "SHUZHI_LOGISTICS_READY=false",
  "SHUZHI_INVOICE_READY=false",
  "SHUZHI_REGULATOR_READY=false",
  "# 以下只登记受控证据库中的编号或路径，不得写入密钥或完整敏感报文。",
  "SHUZHI_HTTPS_ACCEPTANCE_REF=CHANGE_ME_TLS_CORS_REPORT_REF",
  "SHUZHI_DATABASE_ACCEPTANCE_REF=CHANGE_ME_BACKUP_RESTORE_REPORT_REF",
  "SHUZHI_WECHAT_ACCEPTANCE_REF=CHANGE_ME_WECHAT_TEST_REPORT_REF",
  "SHUZHI_CA_ACCEPTANCE_REF=CHANGE_ME_CA_TEST_REPORT_REF",
  "SHUZHI_PAYMENT_ACCEPTANCE_REF=CHANGE_ME_PAYMENT_TEST_REPORT_REF",
  "SHUZHI_LOGISTICS_ACCEPTANCE_REF=CHANGE_ME_LOGISTICS_TEST_REPORT_REF",
  "SHUZHI_INVOICE_ACCEPTANCE_REF=CHANGE_ME_INVOICE_TEST_REPORT_REF",
  "SHUZHI_REGULATOR_ACCEPTANCE_REF=CHANGE_ME_REGULATOR_TEST_REPORT_REF",
  "SHUZHI_BACKUP_DIR=/var/backups/shuzhi-v8530",
  "SHUZHI_BACKUP_RETENTION_DAYS=30",
  "",
];
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, lines.join("\n"), { encoding: "utf8", mode: 0o600 });
chmodSync(output, 0o600);
console.log(`[shuzhi-env] 已生成 ${output}（权限 600；未输出任何密钥）`);
console.log("[shuzhi-env] 下一步：填入微信/CA/支付/物流/发票/监管真实凭证，再运行 SHUZHI_ENV_FILE=" + output + " npm run check:shuzhi-production-env");
