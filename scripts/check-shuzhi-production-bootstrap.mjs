#!/usr/bin/env node

import { existsSync, readFileSync, realpathSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, isAbsolute, relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const envFile = resolve(process.argv[2] || process.env.SHUZHI_ENV_FILE || "/etc/shuzhi-v8530.env");
const checks = [];
const add = (ok, name, detail) => {
  checks.push({ ok, name, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`);
};
const parseEnv = (source) => {
  const values = {};
  for (const rawLine of source.split(/\r?\n/)) {
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
const usable = (value) => {
  const normalized = String(value || "").trim();
  return Boolean(normalized) && !normalized.includes("CHANGE_ME") && normalized !== "local-demo-token";
};
const requiredValue = (key, expected) => {
  const value = String(values[key] || "");
  add(usable(value) && (!expected || value === expected), `核心变量 ${key}`, usable(value) && (!expected || value === expected) ? "已配置" : "缺失、占位或版本不匹配");
};
const parseJsonObject = (key) => {
  try {
    const value = JSON.parse(String(values[key] || ""));
    const ok = Boolean(value) && !Array.isArray(value) && typeof value === "object";
    add(ok, `${key} JSON`, ok ? "对象格式" : "必须是 JSON 对象");
    return ok ? value : null;
  } catch {
    add(false, `${key} JSON`, "无法解析为 JSON 对象");
    return null;
  }
};
const validHttpsRoot = (value) => {
  try {
    const parsed = new URL(String(value || ""));
    return parsed.protocol === "https:" && !parsed.username && !parsed.password && parsed.pathname === "/" && !parsed.search && !parsed.hash;
  } catch {
    return false;
  }
};
const validAbsoluteOutsideRepo = (value) => {
  const target = String(value || "").trim();
  const resolved = isAbsolute(target) ? resolve(target) : "";
  if (!resolved || resolved === ":memory:") return false;
  let cursor = resolved;
  while (!existsSync(cursor)) {
    const parent = dirname(cursor);
    if (parent === cursor) return !resolved.startsWith(`${root}/`);
    cursor = parent;
  }
  const canonical = resolve(realpathSync(cursor), relative(cursor, resolved));
  return !canonical.startsWith(`${root}/`);
};
const values = existsSync(envFile) ? parseEnv(readFileSync(envFile, "utf8")) : {};

try {
  execFileSync("sqlite3", ["--version"], { stdio: "ignore" });
  add(true, "sqlite3 备份工具", "系统 sqlite3 命令可用，备份与恢复服务具备运行依赖");
} catch {
  add(false, "sqlite3 备份工具", "系统未安装 sqlite3 命令；每日备份、校验和恢复演练无法运行");
}

if (!existsSync(envFile)) {
  add(false, "生产配置文件存在", `${envFile} 不存在`);
} else {
  try {
    const mode = statSync(envFile).mode & 0o777;
    add((mode & 0o077) === 0, "配置文件权限", `权限 ${mode.toString(8).padStart(3, "0")}，不得允许组或其他用户读取`);
  } catch (error) {
    add(false, "配置文件权限", error instanceof Error ? error.message : String(error));
  }
}

requiredValue("SHUZHI_RUNTIME_MODE", "production");
for (const key of ["SHUZHI_DEPLOY_ENV", "SHUZHI_SERVICE_NAME"]) requiredValue(key);
requiredValue("SHUZHI_PLATFORM_VERSION", "v8533");
requiredValue("SHUZHI_RELEASE_VERSION", "v8530");
requiredValue("SHUZHI_DB");
requiredValue("SHUZHI_BACKUP_DIR");
requiredValue("SHUZHI_BACKUP_RETENTION_DAYS");
requiredValue("SHUZHI_API_TOKEN");
requiredValue("SHUZHI_ADMIN_TOKEN_ROLES");
add(validAbsoluteOutsideRepo(values.SHUZHI_DB), "生产数据库路径", "必须是仓库外的绝对路径，禁止 :memory: 和演示数据库");
add(validAbsoluteOutsideRepo(values.SHUZHI_BACKUP_DIR), "生产备份目录", "必须是仓库外的绝对路径");
const retentionDays = Number(values.SHUZHI_BACKUP_RETENTION_DAYS);
add(Number.isInteger(retentionDays) && retentionDays >= 7 && retentionDays <= 3650, "备份保留周期", "必须是 7—3650 天的整数");
add(String(values.SHUZHI_API_TOKEN || "").length >= 32, "内部令牌长度", "SHUZHI_API_TOKEN 至少 32 字符");
const adminRoles = parseJsonObject("SHUZHI_ADMIN_TOKEN_ROLES");
add(Boolean(adminRoles) && Object.keys(adminRoles).length > 0 && Object.keys(adminRoles).every((token) => token.length >= 24 && usable(token)), "管理员岗位令牌", "至少一个 24 字符以上且非占位的岗位令牌");
for (const key of ["VITE_API_TOKEN", "VITE_ADMIN_TOKEN"]) add(!values[key], `禁止字段 ${key}`, values[key] ? "不得进入生产配置或前端构建环境" : "未发现");
add(validHttpsRoot(values.VITE_API_BASE), "API 根地址", "必须是无凭证的 HTTPS 根地址");
add(validHttpsRoot(values.SHUZHI_ALLOWED_ORIGIN), "CORS 来源", "必须是精确 HTTPS 来源，不允许通配符");
for (const key of ["SHUZHI_WECHAT_AUTH_READY", "SHUZHI_CA_READY", "SHUZHI_PAYMENT_READY", "SHUZHI_LOGISTICS_READY", "SHUZHI_INVOICE_READY", "SHUZHI_REGULATOR_READY"]) {
  add(values[key] === "true" || values[key] === "false", `${key} 开关`, values[key] ? "已明确设置" : "必须明确设置 true 或 false");
}

const wechatReady = values.SHUZHI_WECHAT_AUTH_READY === "true";
if (wechatReady) {
  requiredValue("WECHAT_APP_ID");
  requiredValue("WECHAT_APP_SECRET");
  parseJsonObject("SHUZHI_WECHAT_OPENID_PRINCIPALS");
  requiredValue("SHUZHI_WECHAT_ACCEPTANCE_REF");
} else {
  const principals = parseJsonObject("SHUZHI_USER_TOKEN_PRINCIPALS");
  add(Boolean(principals) && Object.keys(principals).length > 0, "受控联调会话", "微信认证未 ready 时必须配置临时主体令牌，禁止匿名进入交易");
}

requiredValue("SHUZHI_HTTPS_ACCEPTANCE_REF");
requiredValue("SHUZHI_DATABASE_ACCEPTANCE_REF");
const providerKeys = [
  ["CA", "SHUZHI_CA_ADAPTER_URL", "SHUZHI_CA_ADAPTER_SECRET", "CA_WEBHOOK_SECRET", "SHUZHI_CA_ACCEPTANCE_REF"],
  ["PAYMENT", "SHUZHI_PAYMENT_ADAPTER_URL", "SHUZHI_PAYMENT_ADAPTER_SECRET", "PAYMENT_WEBHOOK_SECRET", "SHUZHI_PAYMENT_ACCEPTANCE_REF"],
  ["LOGISTICS", "SHUZHI_LOGISTICS_ADAPTER_URL", "SHUZHI_LOGISTICS_ADAPTER_SECRET", "LOGISTICS_WEBHOOK_SECRET", "SHUZHI_LOGISTICS_ACCEPTANCE_REF"],
  ["INVOICE", "SHUZHI_INVOICE_ADAPTER_URL", "SHUZHI_INVOICE_ADAPTER_SECRET", "INVOICE_WEBHOOK_SECRET", "SHUZHI_INVOICE_ACCEPTANCE_REF"],
  ["REGULATOR", "SHUZHI_REGULATOR_ADAPTER_URL", "SHUZHI_REGULATOR_ADAPTER_SECRET", "REGULATOR_WEBHOOK_SECRET", "SHUZHI_REGULATOR_ACCEPTANCE_REF"],
];
for (const [name, urlKey, adapterKey, webhookKey, evidenceKey] of providerKeys) {
  if (values[`SHUZHI_${name}_READY`] !== "true") {
    console.log(`INFO  ${name} 能力  未启用；保持机构写接口阻断，不要求猜测或伪造机构凭证`);
    continue;
  }
  add(validHttpsRoot(values[urlKey]), `${name} 适配器地址`, "ready=true 时必须配置 HTTPS 根地址");
  add(String(values[adapterKey] || "").length >= 32 && usable(values[adapterKey]), `${name} 出站密钥`, "ready=true 时必须使用独立的 32 字符以上密钥");
  add(String(values[webhookKey] || "").length >= 32 && usable(values[webhookKey]), `${name} 回调密钥`, "ready=true 时必须使用独立的 32 字符以上密钥");
  requiredValue(evidenceKey);
}

const failed = checks.filter((item) => !item.ok).length;
console.log(`\n数智供社 v8533 分阶段生产启动检查：${checks.length - failed} 通过，${failed} 失败`);
console.log(failed ? "结论：禁止启动；先修复核心环境、数据库/备份或已声明 ready 能力的配置。" : "结论：允许启动分阶段生产 API；未 ready 的机构能力继续由后端拒绝，正式全量放行仍须通过 check:shuzhi-production。");
process.exitCode = failed ? 1 : 0;
