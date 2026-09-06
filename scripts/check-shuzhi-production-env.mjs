#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const file = resolve(process.argv[2] || process.env.SHUZHI_ENV_FILE || "/etc/shuzhi-v8530.env");
const checks = [];
const add = (ok, name, detail) => {
  checks.push({ ok, name, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`);
};

const parseEnv = (text) => {
  const values = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    values[match[1]] = value;
  }
  return values;
};

if (!existsSync(file)) {
  add(false, "生产配置文件存在", `${file} 不存在；请从 deploy/shuzhi-v8530.env.example 复制后在受限服务器上填写`);
} else {
  let values;
  try {
    values = parseEnv(readFileSync(file, "utf8"));
    add(true, "生产配置文件可解析", "已解析环境变量（不显示值）");
  } catch (error) {
    add(false, "生产配置文件可解析", error instanceof Error ? error.message : String(error));
    values = {};
  }

  try {
    const mode = statSync(file).mode & 0o777;
    add((mode & 0o077) === 0, "配置文件权限", `权限 ${mode.toString(8).padStart(3, "0")}，不得允许组或其他用户读取`);
  } catch (error) {
    add(false, "配置文件权限", error instanceof Error ? error.message : String(error));
  }

  const required = [
    ["SHUZHI_RUNTIME_MODE", "production"],
    ["SHUZHI_DEPLOY_ENV"],
    ["SHUZHI_SERVICE_NAME"],
    ["SHUZHI_PLATFORM_VERSION", "v8533"],
    ["SHUZHI_RELEASE_VERSION", "v8530"],
    ["SHUZHI_DB"],
    ["SHUZHI_API_TOKEN"],
    ["SHUZHI_ADMIN_TOKEN_ROLES"],
    ["WECHAT_APP_ID"],
    ["WECHAT_APP_SECRET"],
    ["SHUZHI_WECHAT_OPENID_PRINCIPALS"],
    ["SHUZHI_ALLOWED_ORIGIN"],
    ["VITE_API_BASE"],
    ["LOGISTICS_WEBHOOK_SECRET"],
    ["PAYMENT_WEBHOOK_SECRET"],
    ["INVOICE_WEBHOOK_SECRET"],
    ["REGULATOR_WEBHOOK_SECRET"],
  ];
  for (const [key, expected] of required) {
    const value = String(values[key] || "");
    const ok = Boolean(value) && !value.includes("CHANGE_ME") && value !== "local-demo-token" && (!expected || value === expected);
    add(ok, `字段 ${key}`, ok ? "已填写且非占位值" : "缺失、占位值或版本不匹配");
  }

  const wechatReady = String(values.SHUZHI_WECHAT_AUTH_READY || "") === "true";
  const userPrincipalText = String(values.SHUZHI_USER_TOKEN_PRINCIPALS || "");
  const hasTemporaryPrincipals = Boolean(userPrincipalText) && !userPrincipalText.includes("CHANGE_ME") && userPrincipalText !== "{}";
  add(wechatReady || hasTemporaryPrincipals, "用户会话来源", wechatReady ? "微信认证已 ready，可不配置长期静态用户令牌" : (hasTemporaryPrincipals ? "微信认证未 ready，已配置临时用户主体令牌" : "微信认证未 ready，必须配置临时用户主体令牌"));

  for (const key of ["VITE_API_TOKEN", "VITE_ADMIN_TOKEN"]) add(!values[key], `禁止字段 ${key}`, values[key] ? "不得出现在生产配置或前端构建环境" : "未发现");

  const parseJsonField = (key, expectedType) => {
    try {
      const parsed = JSON.parse(String(values[key] || ""));
      const ok = expectedType === "object" && parsed && !Array.isArray(parsed) && typeof parsed === "object";
      add(ok, `${key} JSON`, ok ? "对象格式" : "必须是 JSON 对象");
      return ok ? parsed : {};
    } catch {
      add(false, `${key} JSON`, "无法解析为 JSON 对象");
      return {};
    }
  };

  const adminRoles = parseJsonField("SHUZHI_ADMIN_TOKEN_ROLES", "object");
  const userPrincipals = parseJsonField("SHUZHI_USER_TOKEN_PRINCIPALS", "object");
  parseJsonField("SHUZHI_WECHAT_OPENID_PRINCIPALS", "object");

  const apiToken = String(values.SHUZHI_API_TOKEN || "");
  const adminTokens = Object.keys(adminRoles);
  const userTokens = Object.keys(userPrincipals);
  const webhookKeys = ["LOGISTICS_WEBHOOK_SECRET", "PAYMENT_WEBHOOK_SECRET", "INVOICE_WEBHOOK_SECRET", "REGULATOR_WEBHOOK_SECRET"];
  const webhookValues = webhookKeys.map((key) => String(values[key] || ""));
  const tokenValues = [apiToken, ...adminTokens, ...userTokens, ...webhookValues].filter(Boolean);
  add(apiToken.length >= 32 && [...adminTokens, ...userTokens].every((token) => token.length >= 24), "令牌长度", "内部令牌至少 32 字符，岗位和用户令牌至少 24 字符");
  add(webhookValues.every((secret) => secret.length >= 32), "回调密钥长度", "物流、支付、发票和监管回调密钥均至少 32 字符");
  add(new Set(tokenValues).size === tokenValues.length, "秘密不复用", "内部令牌、岗位令牌、用户令牌和四类回调密钥均互不相同");

  const checkHttpsOrigin = (key, label, requireRoot = false) => {
    try {
      const parsed = new URL(String(values[key] || ""));
      const ok = parsed.protocol === "https:" && parsed.username === "" && parsed.password === "" && (!requireRoot || (parsed.pathname === "/" && !parsed.search && !parsed.hash));
      add(ok, label, ok ? "HTTPS 地址格式正确" : "必须是无凭证的 HTTPS 根地址");
    } catch {
      add(false, label, "地址格式不正确");
    }
  };
  checkHttpsOrigin("SHUZHI_ALLOWED_ORIGIN", "CORS 来源", false);
  checkHttpsOrigin("VITE_API_BASE", "API 根地址", true);

  const dbPath = String(values.SHUZHI_DB || "");
  const projectRoot = resolve(new URL("..", import.meta.url).pathname);
  add(isAbsolute(dbPath) && dbPath !== ":memory:" && !dbPath.includes(`${projectRoot}/local-backend/`), "生产数据库路径", "必须是绝对路径，且不得指向仓库内演示数据库");

  for (const key of ["SHUZHI_WECHAT_AUTH_READY", "SHUZHI_CA_READY", "SHUZHI_PAYMENT_READY", "SHUZHI_LOGISTICS_READY", "SHUZHI_INVOICE_READY", "SHUZHI_REGULATOR_READY"]) {
    const value = String(values[key] || "");
    add(value === "true" || value === "false", `${key} 开关`, value ? "布尔值" : "未填写（必须明确 true/false）");
  }
}

const failed = checks.filter((item) => !item.ok).length;
console.log(`\n数智供社 v8533 生产配置文件检查：${checks.length - failed} 通过，${failed} 失败`);
process.exitCode = failed ? 1 : 0;
