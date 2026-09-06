#!/usr/bin/env node

import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(new URL("..", import.meta.url).pathname);
const serverFile = resolve(root, "local-backend/server.mjs");
const wait = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
const start = (env) => {
  const child = spawn(process.execPath, [serverFile], { cwd: root, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "pipe"] });
  let diagnostics = "";
  child.stdout.on("data", (chunk) => { diagnostics += chunk.toString(); });
  child.stderr.on("data", (chunk) => { diagnostics += chunk.toString(); });
  const closed = new Promise((resolvePromise) => child.once("close", (code) => resolvePromise(code)));
  return { child, closed, diagnostics: () => diagnostics };
};
const stop = async (running) => {
  if (!running || running.child.exitCode !== null) return;
  running.child.kill("SIGINT");
  await Promise.race([running.closed, wait(1500)]);
  if (running.child.exitCode === null) running.child.kill("SIGTERM");
};
const ready = async (running, port) => {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    if (running.child.exitCode !== null) throw new Error(running.diagnostics() || "服务进程提前退出");
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health/ready`);
      if (response.ok) return;
    } catch { /* 继续等待监听 */ }
    await wait(100);
  }
  throw new Error(`服务未在 8 秒内就绪：${running.diagnostics()}`);
};

const tempRoot = mkdtempSync(join(tmpdir(), "shuzhi-role-isolation-"));
const db = join(tempRoot, "role-isolation.sqlite");
const seedPort = 9050 + Math.floor(Math.random() * 100);
const prodPort = seedPort + 1;
let seedServer;
let productionServer;
const checks = [];
const add = (ok, name, detail) => { checks.push({ ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`); };
const request = async (port, path, token, body, key) => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(body) });
  let payload = {}; try { payload = await response.json(); } catch { /* ignore */ }
  return { response, payload };
};

try {
  seedServer = start({ PORT: String(seedPort), SHUZHI_RUNTIME_MODE: "local-demo", SHUZHI_DB: db, SHUZHI_SEED_DEMO_DATA: "true" });
  await ready(seedServer, seedPort);
  await stop(seedServer);
  const verificationDb = new DatabaseSync(db);
  const verificationTime = new Date().toISOString();
  const verificationStmt = verificationDb.prepare("INSERT INTO merchant_verifications(id,merchant_id,verification_type,status,provider,evidence_ref,verified_by,verified_at,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(merchant_id,verification_type) DO UPDATE SET status=excluded.status,provider=excluded.provider,evidence_ref=excluded.evidence_ref,verified_by=excluded.verified_by,verified_at=excluded.verified_at,updated_at=excluded.updated_at");
  const merchantIds = verificationDb.prepare("SELECT id FROM merchants").all().map((row) => String(row.id));
  for (const merchantId of merchantIds) {
    for (const type of ["license", "bank"]) verificationStmt.run(`MV-ROLE-${merchantId}-${type}`, merchantId, type, "verified", "角色隔离测试核验机构", `ROLE-EVID-${merchantId}-${type}`, "角色隔离测试审核岗", verificationTime, null, verificationTime, verificationTime);
  }
  verificationDb.close();

  const adminToken = "role-admin-token-1234567890123456";
  const buyerBothToken = "role-buyer-both-token-123456";
  const supplierToken = "role-supplier-token-123456789";
  productionServer = start({
    PORT: String(prodPort), SHUZHI_RUNTIME_MODE: "production", SHUZHI_DB: db,
    SHUZHI_API_TOKEN: "role-internal-api-token-123456789012345678901234",
    SHUZHI_ADMIN_TOKEN_ROLES: JSON.stringify({ [adminToken]: "super" }),
    SHUZHI_USER_TOKEN_PRINCIPALS: JSON.stringify({
      [buyerBothToken]: { id: "buyer-both", name: "双主体采购经办人", role: "buyer", merchant_ids: ["m-buyer", "m-supplier"] },
      [supplierToken]: { id: "supplier-user", name: "供货经办人", role: "supplier", merchant_id: "m-supplier" },
    }),
    SHUZHI_ALLOWED_ORIGIN: "https://app.example.com", VITE_API_BASE: "https://api.example.com",
    CA_WEBHOOK_SECRET: "role-ca-secret-123456789012345678901234",
    LOGISTICS_WEBHOOK_SECRET: "role-logistics-secret-123456789012345678901234",
    PAYMENT_WEBHOOK_SECRET: "role-payment-secret-1234567890123456789012345",
    INVOICE_WEBHOOK_SECRET: "role-invoice-secret-12345678901234567890123456",
    REGULATOR_WEBHOOK_SECRET: "role-regulator-secret-123456789012345678901234",
  });
  await ready(productionServer, prodPort);

  const shipment = await request(prodPort, "/api/v1/trades/SZGS-2026-850901/shipments", buyerBothToken, { provider: "role-test", tracking_no: "ROLE-UNAUTHORIZED-SHIPMENT" }, "role-isolation-shipment");
  add(shipment.response.status === 403, "采购角色禁止供货发运", `HTTP ${shipment.response.status}`);

  const acceptance = await request(prodPort, "/api/v1/trades/SZGS-2026-850901/accept", supplierToken, { result: "accepted", accepted_qty: 1, evidence: "role isolation" }, "role-isolation-acceptance");
  add(acceptance.response.status === 403, "供货角色禁止采购验收", `HTTP ${acceptance.response.status}`);

  const signature = await request(prodPort, "/api/v1/trades/SZGS-2026-850901/contract/sign", buyerBothToken, { party: "supplier", certificate_ref: "ROLE-CA-UNAUTHORIZED" }, "role-isolation-signature");
  add(signature.response.status === 403, "采购角色禁止代供货签约", `HTTP ${signature.response.status}`);
} catch (error) {
  add(false, "角色隔离回归启动", error instanceof Error ? error.message : String(error));
} finally {
  await stop(productionServer);
  await stop(seedServer);
  rmSync(tempRoot, { recursive: true, force: true });
}

const failed = checks.filter((item) => !item.ok).length;
console.log(`\n数智供社 v8530 交易角色隔离回归：${checks.length - failed} 通过，${failed} 失败`);
process.exitCode = failed ? 1 : 0;
