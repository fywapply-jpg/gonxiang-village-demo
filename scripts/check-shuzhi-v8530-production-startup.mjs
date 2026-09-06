#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, symlinkSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(new URL("..", import.meta.url).pathname);
const serverFile = resolve(root, "local-backend/server.mjs");
const wait = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

const startChild = (env) => {
  const child = spawn(process.execPath, [serverFile], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  const closed = new Promise((resolvePromise) => child.once("close", (code, signal) => resolvePromise({ code, signal })));
  return { child, closed, output: () => ({ stdout, stderr }) };
};

const stopChild = async (running) => {
  if (!running || running.child.exitCode !== null) return await running?.closed;
  running.child.kill("SIGINT");
  const stopped = await Promise.race([running.closed, wait(1500).then(() => null)]);
  if (stopped) return stopped;
  running.child.kill("SIGTERM");
  return await Promise.race([running.closed, wait(1000).then(() => null)]);
};

const waitReady = async (running, port, timeoutMs = 8000) => {
  const deadline = Date.now() + timeoutMs;
  let lastError = "";
  while (Date.now() < deadline) {
    if (running.child.exitCode !== null) break;
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health/ready`);
      const body = await response.json();
      const payload = body?.data || body;
      if (response.ok && payload.status === "ready" && payload.database === "sqlite") return payload;
      lastError = `HTTP ${response.status} ${JSON.stringify(body)}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await wait(100);
  }
  const output = running.output();
  throw new Error(`就绪探针未通过：${lastError || "进程提前退出"}\n${output.stderr || output.stdout}`);
};

const makeEnv = (port, db) => ({
  SHUZHI_RUNTIME_MODE: "production",
  PORT: String(port),
  SHUZHI_DB: db,
  SHUZHI_API_TOKEN: "prod-internal-token-123456789012345678901234",
  SHUZHI_ADMIN_TOKEN_ROLES: JSON.stringify({ "prod-finance-token-1234567890123456": "finance" }),
  SHUZHI_USER_TOKEN_PRINCIPALS: JSON.stringify({ "prod-buyer-token-1234567890123456": { id: "buyer-user", name: "采购经办人", role: "buyer", merchant_id: "m-buyer" } }),
  SHUZHI_ALLOWED_ORIGIN: "https://demo.example.com",
  VITE_API_BASE: "https://demo.example.com",
  CA_WEBHOOK_SECRET: "ca-secret-123456789012345678901234",
  LOGISTICS_WEBHOOK_SECRET: "logistics-secret-123456789012345678901234",
  PAYMENT_WEBHOOK_SECRET: "payment-secret-123456789012345678901234",
  INVOICE_WEBHOOK_SECRET: "invoice-secret-123456789012345678901234",
  REGULATOR_WEBHOOK_SECRET: "regulator-secret-123456789012345678901234",
});

const checks = [];
const add = (ok, name, detail) => {
  checks.push({ ok, name, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`);
};

const tempRoot = mkdtempSync(join(tmpdir(), "shuzhi-v8530-startup-"));
let secure;
let staged;
let wechatOnly;
let weak;
let linked;
let invalidOrigin;
let invalidAdapter;
let invalidVerification;
let securePort;
try {
  securePort = 8899 + Math.floor(Math.random() * 200);
  const secureDb = join(tempRoot, "secure.sqlite");
  const secureEnv = makeEnv(securePort, secureDb);
  secure = startChild(secureEnv);
  try {
    const ready = await waitReady(secure, securePort);
    add(true, "生产安全配置启动", `进程启动且 /health/ready 返回 ${ready.status}`);
    try {
      const response = await fetch(`http://127.0.0.1:${securePort}/api/v1/products`);
      const body = await response.json();
      const products = body?.data || body;
      add(response.ok && Array.isArray(products) && products.length === 0 && ready.seeded_demo_data === false, "生产库不写入演示数据", "空生产库无演示商品，seeded_demo_data=false");
    } catch (error) {
      add(false, "生产库不写入演示数据", error instanceof Error ? error.message : String(error));
    }
    try {
      const response = await fetch(`http://127.0.0.1:${securePort}/api/v1/platform/capabilities`);
      const body = await response.json();
      const capabilities = body?.data || body;
      add(response.ok && capabilities.version === "v8533" && capabilities.productionReadiness?.allRequiredAvailable === false && capabilities.boundaries?.platformCustodiesFunds === false, "生产能力清单不虚报", "未完成机构联调时明确阻断，不把本地能力冒充生产能力");
    } catch (error) {
      add(false, "生产能力清单不虚报", error instanceof Error ? error.message : String(error));
    }
    try {
      const response = await fetch(`http://127.0.0.1:${securePort}/api/v1/auth/wechat/session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: "not-configured" }) });
      const body = await response.json();
      add(response.status === 503 && body?.message?.includes("微信身份认证尚未完成"), "生产禁止伪造微信登录", `HTTP ${response.status}`);
    } catch (error) {
      add(false, "生产禁止伪造微信登录", error instanceof Error ? error.message : String(error));
    }
  } catch (error) {
    add(false, "生产安全配置启动", error instanceof Error ? error.message : String(error));
  } finally {
    await stopChild(secure);
  }

  // A production database must not start with apparently verified merchants
  // whose license/bank records have no institution, evidence, or verification
  // timestamp. This mirrors merchantVerificationReady and protects startup
  // from a false-positive COUNT(DISTINCT verification_type).
  {
    const db = new DatabaseSync(secureDb);
    const t = new Date().toISOString();
    db.prepare("INSERT INTO organizations VALUES (?,?,?,?,?,?)").run("org-invalid-verification", "资质证据缺失测试主体", "采购商", "测试", "active", t);
    db.prepare("INSERT INTO merchants VALUES (?,?,?,?,?,?,?,?)").run("m-invalid-verification", "org-invalid-verification", "资质证据缺失测试主体", "buyer", "verified", "verified", "低", t);
    db.prepare("INSERT INTO merchant_identity(merchant_id,credit_code,legal_name,status,provider,evidence_ref,verified_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").run("m-invalid-verification", "91360000MA8V85330Q", "资质证据缺失测试主体", "verified", "测试主体核验机构", "IDENTITY-INVALID-VERIFICATION", t, t);
    for (const type of ["license", "bank"]) {
      db.prepare("INSERT INTO merchant_verifications(id,merchant_id,verification_type,status,provider,evidence_ref,verified_by,verified_at,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(`MV-INVALID-${type}`, "m-invalid-verification", type, "verified", "", "", "测试审核岗", null, null, t, t);
    }
    db.close();
    const verificationPort = securePort + 1;
    invalidVerification = startChild(makeEnv(verificationPort, secureDb));
    const verificationResult = await Promise.race([invalidVerification.closed, wait(3000).then(() => null)]);
    if (!verificationResult) {
      await stopChild(invalidVerification);
      add(false, "缺失资质证据拒绝启动", "空机构/证据/核验时间的 license、bank 记录未被生产启动门禁拒绝");
    } else {
      add(verificationResult.code !== 0, "缺失资质证据拒绝启动", verificationResult.code !== 0 ? "生产主体核验记录必须包含机构、证据和核验时间" : "进程异常以 0 退出");
    }
  }

  const stagedPort = securePort + 2;
  const stagedEnv = makeEnv(stagedPort, join(tempRoot, "staged.sqlite"));
  for (const key of ["CA_WEBHOOK_SECRET", "LOGISTICS_WEBHOOK_SECRET", "PAYMENT_WEBHOOK_SECRET", "INVOICE_WEBHOOK_SECRET", "REGULATOR_WEBHOOK_SECRET"]) delete stagedEnv[key];
  staged = startChild(stagedEnv);
  try {
    const ready = await waitReady(staged, stagedPort);
    add(true, "未 ready 机构可分阶段启动", `未配置未启用机构回调密钥仍可启动，/health/ready=${ready.status}`);
  } catch (error) {
    add(false, "未 ready 机构可分阶段启动", error instanceof Error ? error.message : String(error));
  } finally {
    await stopChild(staged);
  }

  const wechatOnlyPort = stagedPort + 1;
  const wechatOnlyEnv = {
    ...makeEnv(wechatOnlyPort, join(tempRoot, "wechat-only.sqlite")),
    SHUZHI_WECHAT_AUTH_READY: "true",
    SHUZHI_USER_TOKEN_PRINCIPALS: "{}",
    WECHAT_APP_ID: "wx0123456789abcdef",
    WECHAT_APP_SECRET: "wechat-secret-for-startup-smoke",
    SHUZHI_WECHAT_OPENID_PRINCIPALS: JSON.stringify({ "openid-startup-smoke": { id: "buyer-user", name: "采购经办人", role: "buyer", merchant_id: "m-buyer" } }),
  };
  wechatOnly = startChild(wechatOnlyEnv);
  try {
    const ready = await waitReady(wechatOnly, wechatOnlyPort);
    add(true, "微信认证 ready 可免长期用户令牌", `空 SHUZHI_USER_TOKEN_PRINCIPALS 仍可启动，/health/ready=${ready.status}`);
  } catch (error) {
    add(false, "微信认证 ready 可免长期用户令牌", error instanceof Error ? error.message : String(error));
  } finally {
    await stopChild(wechatOnly);
  }

  const weakPort = wechatOnlyPort + 1;
  weak = startChild({ ...makeEnv(weakPort, join(tempRoot, "weak.sqlite")), SHUZHI_API_TOKEN: "short-token" });
  const weakResult = await Promise.race([weak.closed, wait(3000).then(() => null)]);
  if (!weakResult) {
    await stopChild(weak);
    add(false, "弱令牌拒绝启动", "弱令牌进程未在 3 秒内退出");
  } else {
    const output = weak.output();
    add(weakResult.code !== 0, "弱令牌拒绝启动", weakResult.code !== 0 ? "短于 32 字符的 API 令牌已被拒绝" : `进程异常以 0 退出${output.stderr ? `：${output.stderr.trim()}` : ""}`);
  }

  const invalidOriginPort = weakPort + 1;
  invalidOrigin = startChild({ ...makeEnv(invalidOriginPort, join(tempRoot, "invalid-origin.sqlite")), SHUZHI_ALLOWED_ORIGIN: "http://unsafe.example.com" });
  const invalidOriginResult = await Promise.race([invalidOrigin.closed, wait(3000).then(() => null)]);
  if (!invalidOriginResult) {
    await stopChild(invalidOrigin);
    add(false, "不安全 CORS 来源拒绝启动", "HTTP 来源未被生产启动门禁拒绝");
  } else {
    add(invalidOriginResult.code !== 0, "不安全 CORS 来源拒绝启动", invalidOriginResult.code !== 0 ? "生产 CORS 必须使用 HTTPS 根来源" : "进程异常以 0 退出");
  }

  const invalidAdapterPort = invalidOriginPort + 1;
  invalidAdapter = startChild({ ...makeEnv(invalidAdapterPort, join(tempRoot, "invalid-adapter.sqlite")), SHUZHI_PAYMENT_READY: "true", SHUZHI_PAYMENT_ADAPTER_URL: "http://payment-adapter.example.com", SHUZHI_PAYMENT_ADAPTER_SECRET: "payment-adapter-secret-123456789012345678901234" });
  const invalidAdapterResult = await Promise.race([invalidAdapter.closed, wait(3000).then(() => null)]);
  if (!invalidAdapterResult) {
    await stopChild(invalidAdapter);
    add(false, "READY 机构缺少 HTTPS 适配器拒绝启动", "不安全支付适配器地址未被生产启动门禁拒绝");
  } else {
    add(invalidAdapterResult.code !== 0, "READY 机构缺少 HTTPS 适配器拒绝启动", invalidAdapterResult.code !== 0 ? "ready 机构适配器必须使用 HTTPS 根地址" : "进程异常以 0 退出");
  }

  const linkedPort = invalidAdapterPort + 1;
  const linkedDb = join(tempRoot, "linked-db");
  // Use a tracked file so this guard also exercises clean CI checkouts where
  // the ignored local SQLite data directory is not present.
  symlinkSync(resolve(root, "local-backend/server.mjs"), linkedDb, "file");
  linked = startChild(makeEnv(linkedPort, linkedDb));
  const linkedResult = await Promise.race([linked.closed, wait(3000).then(() => null)]);
  if (!linkedResult) {
    await stopChild(linked);
    add(false, "符号链接数据库拒绝启动", "指向仓库演示目录的数据库路径未被拒绝");
  } else {
    add(linkedResult.code !== 0, "符号链接数据库拒绝启动", linkedResult.code !== 0 ? "生产数据库符号链接已被拒绝" : "进程异常以 0 退出");
  }
} finally {
  await stopChild(secure);
  await stopChild(staged);
  await stopChild(wechatOnly);
  await stopChild(weak);
  await stopChild(linked);
  await stopChild(invalidOrigin);
  await stopChild(invalidAdapter);
  await stopChild(invalidVerification);
  rmSync(tempRoot, { recursive: true, force: true });
}

const failed = checks.filter((item) => !item.ok).length;
console.log(`\n数智供社 v8530 生产启动烟测：${checks.length - failed} 通过，${failed} 失败`);
process.exitCode = failed ? 1 : 0;
