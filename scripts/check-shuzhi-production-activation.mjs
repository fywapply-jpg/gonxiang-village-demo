#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const args = process.argv.slice(2);
const jsonOutput = args.includes("--json");
const positional = args.filter((item) => item !== "--json");
const envFile = resolve(positional[0] || process.env.SHUZHI_ENV_FILE || "/etc/shuzhi-v8530.env");
const manifest = JSON.parse(readFileSync(resolve(root, "deploy/shuzhi-v8533-capability-activation.json"), "utf8"));

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

const validHttpsRoot = (value) => {
  try {
    const parsed = new URL(String(value || ""));
    return parsed.protocol === "https:" && !parsed.username && !parsed.password && parsed.pathname === "/" && !parsed.search && !parsed.hash;
  } catch {
    return false;
  }
};

const values = existsSync(envFile) ? parseEnv(readFileSync(envFile, "utf8")) : {};
const result = manifest.capabilities.map((capability) => {
  const missingConfig = capability.requiredConfig.filter((key) => !usable(values[key]));
  if (capability.key === "HTTPS_API") {
    if (!validHttpsRoot(values.VITE_API_BASE)) missingConfig.push("VITE_API_BASE(HTTPS根地址)");
    if (!validHttpsRoot(values.SHUZHI_ALLOWED_ORIGIN)) missingConfig.push("SHUZHI_ALLOWED_ORIGIN(HTTPS来源)");
  }
  if (capability.key === "DATABASE" && usable(values.SHUZHI_DB)) {
    const dbPath = String(values.SHUZHI_DB);
    const resolvedDbPath = isAbsolute(dbPath) ? resolve(dbPath) : "";
    if (!resolvedDbPath || resolvedDbPath === ":memory:" || resolvedDbPath.startsWith(`${root}/local-backend/`)) missingConfig.push("SHUZHI_DB(仓库外绝对路径)");
  }
  const uniqueMissing = [...new Set(missingConfig)];
  const declaredReady = capability.readyEnv ? values[capability.readyEnv] === "true" : false;
  const acceptanceRef = capability.acceptanceRefEnv ? String(values[capability.acceptanceRefEnv] || "").trim() : "";
  const hasAcceptanceRef = usable(acceptanceRef);
  let state;
  let safeToEnable = false;
  if (!existsSync(envFile)) {
    state = "未创建生产配置";
  } else if (uniqueMissing.length) {
    state = "配置未完成";
  } else if (capability.codeReadiness === "partial") {
    state = declaredReady ? "危险：开关已开但适配器不完整" : "待实现机构适配器";
  } else if (capability.readyEnv && !declaredReady) {
    state = "配置完成，待真实联调验收";
  } else if (!hasAcceptanceRef) {
    state = capability.readyEnv ? "已开开关，但缺少验收证据引用" : "配置完成，待保存验收证据引用";
  } else if (capability.readyEnv && declaredReady) {
    state = "已声明完成并登记验收证据";
    safeToEnable = true;
  } else if (capability.key === "HTTPS_API") {
    state = "公网与 TLS 验收证据已登记";
    safeToEnable = true;
  } else {
    state = "SQLite 试运营及备份恢复证据已登记";
    safeToEnable = true;
  }
  return {
    key: capability.key,
    name: capability.name,
    codeReadiness: capability.codeReadiness,
    state,
    safeToEnable,
    readyEnv: capability.readyEnv,
    declaredReady,
    acceptanceRefEnv: capability.acceptanceRefEnv || null,
    acceptanceRefConfigured: hasAcceptanceRef,
    missingConfig: uniqueMissing,
    missingAdapter: capability.missingAdapter || null,
    evidenceRequired: capability.acceptanceEvidence || capability.onlineEvidence || [],
    nextAction: capability.nextAction,
  };
});

const unsafeReady = result.filter((item) => item.declaredReady && item.codeReadiness === "partial");
const blockers = result.filter((item) => !item.safeToEnable);
const report = {
  platformVersion: manifest.platformVersion,
  apiVersion: manifest.apiVersion,
  envFile,
  envFileExists: existsSync(envFile),
  productionReady: existsSync(envFile) && blockers.length === 0 && unsafeReady.length === 0,
  unsafeReady: unsafeReady.map((item) => item.key),
  capabilities: result,
};

if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`数智供社 ${manifest.platformVersion} 生产能力逐项开通诊断`);
  console.log(`配置文件：${envFile}${existsSync(envFile) ? "" : "（不存在）"}`);
  for (const item of result) {
    console.log(`\n[${item.key}] ${item.name}：${item.state}`);
    console.log(`  代码准备度：${item.codeReadiness}`);
    if (item.readyEnv) console.log(`  放行开关：${item.readyEnv}=${item.declaredReady ? "true" : "false/未配置"}`);
    if (item.acceptanceRefEnv) console.log(`  验收证据：${item.acceptanceRefEnv}=${item.acceptanceRefConfigured ? "已登记" : "未登记"}`);
    if (item.missingConfig.length) console.log(`  缺少配置：${item.missingConfig.join("、")}`);
    if (item.missingAdapter) console.log(`  适配缺口：${item.missingAdapter}`);
    console.log(`  下一步：${item.nextAction}`);
    if (item.evidenceRequired.length) console.log(`  必留证据：${item.evidenceRequired.join("、")}`);
  }
  console.log(`\n结论：${report.productionReady ? "全部能力具备放行条件" : `尚未具备正式放行条件；${blockers.length} 项机构能力未闭环`}`);
  if (unsafeReady.length) console.log(`严重风险：${unsafeReady.map((item) => item.name).join("、")} 的 READY 开关已开启，但适配器仍不完整。`);
  console.log("说明：本命令不会读取或输出密钥值，也不会自动修改 READY 开关。");
}

process.exitCode = report.productionReady ? 0 : 1;
