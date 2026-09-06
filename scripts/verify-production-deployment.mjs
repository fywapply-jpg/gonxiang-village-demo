#!/usr/bin/env node
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const base = String(process.env.PRODUCTION_API_BASE_URL || "").replace(/\/$/, "");
const expectedEnv = String(process.env.CLOUD_SERVER_DEPLOY_ENV || "");
const expectedService = String(process.env.CLOUD_SERVER_SERVICE_NAME || "");
const expectedPlatformVersion = String(process.env.CLOUD_PLATFORM_VERSION || "v8533");
const expectedVersion = String(process.env.CLOUD_SERVER_RELEASE_VERSION || "v8530");
const outputPath = resolve(process.env.PRODUCTION_VERIFY_OUTPUT || "docs/releases/数智供社-v8533-生产部署回验证据.json");
const checks = [];
const check = (ok, name, detail) => checks.push({ ok, name, detail });

if (!base) {
  check(false, "生产 API 地址", "必须设置 PRODUCTION_API_BASE_URL");
} else {
  let parsed;
  try { parsed = new URL(base); } catch { parsed = null; }
  check(Boolean(parsed && parsed.protocol === "https:"), "HTTPS 强制", parsed ? `当前协议 ${parsed.protocol}` : "地址格式不正确");
}

const fetchJson = async (path) => {
  if (!base) throw new Error("未配置生产 API 地址");
  const response = await fetch(`${base}${path}`, { headers: { accept: "application/json" } });
  const raw = await response.text();
  let body;
  try { body = JSON.parse(raw); } catch { throw new Error(`${path} 返回非 JSON（HTTP ${response.status}）`); }
  const data = body?.data ?? body;
  if (!response.ok) throw new Error(`${path} HTTP ${response.status}: ${body?.message || "请求失败"}`);
  return data;
};

let live;
let ready;
let capabilities;
try {
  [live, ready, capabilities] = await Promise.all([
    fetchJson("/health/live"),
    fetchJson("/health/ready"),
    fetchJson("/api/v1/platform/capabilities"),
  ]);
  check(live?.status === "ok", "存活探针", `status=${live?.status || "未知"}`);
  check(ready?.status === "ready" && ready?.runtime_mode === "production", "就绪探针", `status=${ready?.status || "未知"} runtime_mode=${ready?.runtime_mode || "未知"}`);
  const context = capabilities?.releaseContext || {};
  check(capabilities?.platform_version === expectedPlatformVersion, "平台版本一致", `期望=${expectedPlatformVersion} 实际=${capabilities?.platform_version || "未返回"}`);
  check(!expectedEnv || context.deployEnv === expectedEnv, "云环境一致", `期望=${expectedEnv || "未指定"} 实际=${context.deployEnv || "未返回"}`);
  check(!expectedService || context.serviceName === expectedService, "服务名一致", `期望=${expectedService || "未指定"} 实际=${context.serviceName || "未返回"}`);
  check(context.releaseVersion === expectedVersion, "后端版本一致", `期望=${expectedVersion} 实际=${context.releaseVersion || "未返回"}`);
  const readiness = capabilities?.productionReadiness || {};
  check(readiness.allRequiredAvailable === true && Array.isArray(readiness.missingCapabilities) && readiness.missingCapabilities.length === 0, "机构能力齐备", readiness.missingCapabilities?.length ? `缺少：${readiness.missingCapabilities.join(",")}` : "required capabilities 全部 ready");
  check(readiness.acceptanceAndCallbackBothRequired === true && readiness.b2bOutboundHandoffRequired === true, "交易边界生效", "验收与机构回调双门槛、B2B出站交接均已声明");
  const boundaries = capabilities?.boundaries || {};
  check(Object.values(boundaries).every((value) => value === false), "资金与授权红线", "平台不托管资金、不以点击替代签约、不把本地数据当政府审批");
} catch (error) {
  check(false, "生产接口回验", error instanceof Error ? error.message : String(error));
}

const failed = checks.filter((item) => !item.ok).length;
const evidence = {
  checked_at: new Date().toISOString(),
  api_base: base || null,
  expected: { platform_version: expectedPlatformVersion, deploy_env: expectedEnv || null, service_name: expectedService || null, release_version: expectedVersion },
  passed: failed === 0,
  checks,
  observed: { live: live || null, ready: ready || null, capabilities: capabilities || null },
};
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.name}  ${item.detail}`);
console.log(`\n数智供社 v8533 生产部署回验：${checks.length - failed} 通过，${failed} 失败`);
process.exitCode = failed ? 1 : 0;
