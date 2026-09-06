#!/usr/bin/env node
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(new URL("..", import.meta.url).pathname);
const serverFile = resolve(root, "local-backend/server.mjs");
const wait = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
const port = 9000 + Math.floor(Math.random() * 400);
const tempRoot = mkdtempSync(join(tmpdir(), "shuzhi-v8530-production-settlement-"));
const dbPath = join(tempRoot, "production.sqlite");
const financeToken = "prod-finance-token-1234567890123456";
const env = {
  ...process.env,
  SHUZHI_RUNTIME_MODE: "production",
  PORT: String(port),
  SHUZHI_DB: dbPath,
  SHUZHI_API_TOKEN: "prod-internal-token-123456789012345678901234",
  SHUZHI_ADMIN_TOKEN_ROLES: JSON.stringify({ [financeToken]: "finance" }),
  SHUZHI_USER_TOKEN_PRINCIPALS: JSON.stringify({ "prod-buyer-token-1234567890123456": { id: "buyer-user", name: "采购经办人", role: "buyer", merchant_id: "m-buyer" } }),
  SHUZHI_ALLOWED_ORIGIN: "https://demo.example.com",
  CA_WEBHOOK_SECRET: "ca-secret-123456789012345678901234",
  LOGISTICS_WEBHOOK_SECRET: "logistics-secret-123456789012345678901234",
  PAYMENT_WEBHOOK_SECRET: "payment-secret-123456789012345678901234",
  INVOICE_WEBHOOK_SECRET: "invoice-secret-123456789012345678901234",
  REGULATOR_WEBHOOK_SECRET: "regulator-secret-123456789012345678901234",
  SHUZHI_PAYMENT_READY: "true",
};
const checks = [];
const add = (ok, name, detail) => { checks.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`); };
const start = () => {
  const child = spawn(process.execPath, [serverFile], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { output += chunk.toString(); });
  return { child, output: () => output };
};
const stop = async (running) => {
  if (!running || running.child.exitCode !== null) return;
  running.child.kill("SIGINT");
  await Promise.race([new Promise((resolvePromise) => running.child.once("close", resolvePromise)), wait(1200)]);
  if (running.child.exitCode === null) running.child.kill("SIGTERM");
};
const ready = async (running) => {
  const deadline = Date.now() + 7000;
  while (Date.now() < deadline && running.child.exitCode === null) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health/ready`);
      const body = await response.json();
      if (response.ok && body?.data?.status === "ready") return true;
    } catch {}
    await wait(100);
  }
  throw new Error(`生产服务未就绪：${running.output()}`);
};
const seedIncompleteOrder = () => {
  const db = new DatabaseSync(dbPath);
  const t = new Date().toISOString();
  db.exec("PRAGMA foreign_keys = ON");
  db.prepare("INSERT INTO organizations VALUES (?,?,?,?,?,?)").run("org-buyer", "测试采购主体", "采购商", "测试地区", "active", t);
  db.prepare("INSERT INTO organizations VALUES (?,?,?,?,?,?)").run("org-supplier", "测试供货主体", "产地供货商", "测试地区", "active", t);
  db.prepare("INSERT INTO merchants VALUES (?,?,?,?,?,?,?,?)").run("m-buyer", "org-buyer", "测试采购主体", "buyer", "verified", "verified", "低", t);
  db.prepare("INSERT INTO merchants VALUES (?,?,?,?,?,?,?,?)").run("m-supplier", "org-supplier", "测试供货主体", "supplier", "verified", "verified", "低", t);
  db.prepare("INSERT INTO merchant_identity(merchant_id,credit_code,legal_name,status,provider,evidence_ref,verified_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").run("m-buyer", "91420100MA8V85013Y", "测试采购主体", "verified", "测试核验机构", "EVID-m-buyer-identity", t, t);
  db.prepare("INSERT INTO merchant_identity(merchant_id,credit_code,legal_name,status,provider,evidence_ref,verified_at,updated_at) VALUES (?,?,?,?,?,?,?,?)").run("m-supplier", "91360722MA8V85013X", "测试供货主体", "verified", "测试核验机构", "EVID-m-supplier-identity", t, t);
  const verificationStmt = db.prepare("INSERT INTO merchant_verifications(id,merchant_id,verification_type,status,provider,evidence_ref,verified_by,verified_at,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
  for (const merchantId of ["m-buyer", "m-supplier"]) {
    for (const type of ["license", "bank"]) {
      verificationStmt.run(`MV-${merchantId}-${type}`, merchantId, type, "verified", "测试核验机构", `EVID-${merchantId}-${type}`, "测试审核岗", t, null, t, t);
    }
  }
  const orderId = "SZGS-PROD-MISSING-ITEMS";
  db.prepare("INSERT INTO orders VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(orderId, "buyerSupply", "m-buyer", "m-supplier", "履约中", 10000, "CNY", "持牌机构条件结算（验收后分账）", "待验收分账", 9, "2026-09-01", "已开具", "已签署", t, t);
  db.prepare("INSERT INTO contracts VALUES (?,?,?,?,?,?)").run("CA-PROD-MISSING-ITEMS", orderId, "主合同", "已签署", t, "0xprod");
  db.prepare("INSERT INTO payments VALUES (?,?,?,?,?,?,?,?)").run("PAY-PROD-MISSING-ITEMS", orderId, "测试采购主体", "持牌结算机构托管户", 10000, "机构监管结算", "已支付", t);
  db.prepare("INSERT INTO invoices VALUES (?,?,?,?,?,?)").run("INV-PROD-MISSING-ITEMS", orderId, "PROD-INV-1", 10000, "已开具", t);
  db.prepare("INSERT INTO acceptances VALUES (?,?,?,?,?,?,?,?)").run("ACC-PROD-MISSING-ITEMS", orderId, "测试采购验收岗", "accepted", 1, "验收证据", t, null);
  db.close();
  return orderId;
};
let running;
try {
  running = start();
  await ready(running);
  await stop(running);
  const orderId = seedIncompleteOrder();
  running = start();
  await ready(running);
  const response = await fetch(`http://127.0.0.1:${port}/api/v1/trades/${orderId}/settle`, {
    method: "POST",
    headers: { Authorization: `Bearer ${financeToken}`, "X-Admin-Role": "finance", "Content-Type": "application/json", "Idempotency-Key": "prod-missing-items" },
    body: JSON.stringify({ instruction_ref: "PROD-MISSING-ITEMS" }),
  });
  const body = await response.json();
  add(response.status === 409 && /商品明细/.test(body?.message || ""), "生产缺商品明细阻断结算", `HTTP ${response.status} · ${body?.message || "无错误信息"}`);
} catch (error) {
  add(false, "生产缺商品明细阻断结算", error instanceof Error ? error.message : String(error));
} finally {
  await stop(running);
  rmSync(tempRoot, { recursive: true, force: true });
}
const failures = checks.filter((ok) => !ok).length;
console.log(`\n数智供社 v8530 生产计费基数门禁：${checks.length - failures} 通过，${failures} 失败`);
process.exitCode = failures ? 1 : 0;
