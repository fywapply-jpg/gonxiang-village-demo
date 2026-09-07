#!/usr/bin/env node

/**
 * 生产 SQLite 试运行的并发库存回归：两个 API 进程共享同一数据库，
 * 并发创建超过库存的订单，验证 UPDATE ... WHERE stock>=qty 与事务闸门
 * 不会超卖、重复占用或把 SQLITE_BUSY/500 暴露给前台。
 */
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { join, resolve } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";

const root = resolve(new URL("..", import.meta.url).pathname);
const serverFile = resolve(root, "local-backend/server.mjs");
const tempRoot = mkdtempSync(join(tmpdir(), "shuzhi-production-concurrency-"));
const dbPath = join(tempRoot, "production.sqlite");
const ports = [9600 + Math.floor(Math.random() * 100), 9700 + Math.floor(Math.random() * 100)];
const buyerToken = "concurrency-buyer-123456789012345";
const apiToken = "concurrency-api-12345678901234567890";
const adminToken = "concurrency-admin-123456789012345";
const userPrincipals = JSON.stringify({ [buyerToken]: { id: "concurrency-buyer", name: "并发采购经办人", role: "buyer", merchant_id: "m-buyer" } });
const adminRoles = JSON.stringify({ [adminToken]: "super" });
const baseEnv = {
  SHUZHI_DB: dbPath,
  SHUZHI_API_TOKEN: apiToken,
  SHUZHI_ADMIN_TOKEN_ROLES: adminRoles,
  SHUZHI_USER_TOKEN_PRINCIPALS: userPrincipals,
  SHUZHI_ALLOWED_ORIGIN: "https://app.example.com",
  VITE_API_BASE: "https://api.example.com",
};
const wait = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
const start = (port, runtimeMode, extra = {}) => {
  const child = spawn(process.execPath, [serverFile], { cwd: root, env: { ...process.env, ...baseEnv, PORT: String(port), SHUZHI_RUNTIME_MODE: runtimeMode, ...extra }, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", (chunk) => { output += chunk.toString(); });
  child.stderr.on("data", (chunk) => { output += chunk.toString(); });
  return { child, output: () => output };
};
const stop = async (running) => {
  if (!running || running.child.exitCode !== null) return;
  running.child.kill("SIGINT");
  await Promise.race([new Promise((resolvePromise) => running.child.once("close", resolvePromise)), wait(1500)]);
  if (running.child.exitCode === null) running.child.kill("SIGTERM");
};
const waitReady = async (running, port) => {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (running.child.exitCode !== null) throw new Error(running.output());
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health/ready`);
      if (response.ok) return;
    } catch {}
    await wait(100);
  }
  throw new Error(`API 未就绪：${running.output()}`);
};
const createOrder = async (port, index) => {
  const response = await fetch(`http://127.0.0.1:${port}/api/v1/trades`, {
    method: "POST",
    headers: { Authorization: `Bearer ${buyerToken}`, "Content-Type": "application/json", "Idempotency-Key": `concurrency-order-${index}-${Date.now()}` },
    body: JSON.stringify({
      scene: "buyerSupply",
      supplier_id: "m-supplier",
      items: [{ product_id: "p-concurrency", qty: 1 }],
      delivery_address: "江西省赣州市寻乌县并发测试仓",
      delivery_lat: 24.91,
      delivery_lng: 115.65,
      settlement_model: "持牌机构条件结算（验收后分账）",
    }),
  });
  let payload = {};
  try { payload = await response.json(); } catch {}
  return { status: response.status, body: payload, port };
};

const checks = [];
const add = (ok, name, detail) => { checks.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`); };
let demo;
const production = [];
try {
  demo = start(ports[0], "local-demo", { SHUZHI_SEED_DEMO_DATA: "true" });
  await waitReady(demo, ports[0]);
  await stop(demo);
  const db = new DatabaseSync(dbPath);
  const t = new Date().toISOString();
  const merchantIds = db.prepare("SELECT id FROM merchants").all().map((row) => String(row.id));
  for (const merchantId of merchantIds) {
    db.prepare("UPDATE merchants SET license_status='verified',bank_status='verified' WHERE id=?").run(merchantId);
    for (const type of ["license", "bank"]) db.prepare("INSERT OR REPLACE INTO merchant_verifications(id,merchant_id,verification_type,status,provider,evidence_ref,verified_by,verified_at,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(`MV-CONCURRENCY-${merchantId}-${type}`, merchantId, type, "verified", "并发测试机构", `CONCURRENCY-${merchantId}-${type}`, "并发测试审核岗", t, null, t, t);
  }
  db.prepare("DELETE FROM merchant_service_areas WHERE merchant_id='m-supplier'").run();
  db.prepare("INSERT INTO merchant_service_areas(id,merchant_id,area_type,center_lat,center_lng,radius_km,regions,delivery_modes,max_daily_orders,status,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run("AREA-CONCURRENCY", "m-supplier", "radius", 24.91, 115.65, 300, JSON.stringify(["赣州"]), JSON.stringify(["普通物流"]), 100, "active", t);
  db.prepare("INSERT OR REPLACE INTO products(id,merchant_id,name,category,spec,unit,price,stock,origin,quality_status) VALUES (?,?,?,?,?,?,?,?,?,?)").run("p-concurrency", "m-supplier", "并发库存测试商品", "农产品", "1批", "件", 10, 5, "江西赣州", "approved");
  db.close();
  for (const port of ports) {
    const running = start(port, "production");
    production.push(running);
    await waitReady(running, port);
  }
  const requests = Array.from({ length: 20 }, (_, index) => createOrder(ports[index % ports.length], index));
  const results = await Promise.all(requests);
  const successful = results.filter((item) => item.status === 201);
  const conflicts = results.filter((item) => item.status === 409);
  const unexpected = results.filter((item) => ![201, 409].includes(item.status));
  add(unexpected.length === 0, "并发订单无 500/锁错误", unexpected.length === 0 ? "所有响应均为成功或库存/业务冲突" : `${JSON.stringify(unexpected.map((item) => ({ status: item.status, message: item.body?.message })))} · ${production.map((running) => running.output().slice(-500)).join(" | ")}`);
  add(successful.length === 5 && conflicts.length === 15, "库存不足时严格拒绝超卖", `成功 ${successful.length}，冲突 ${conflicts.length}`);
  add(new Set(successful.map((item) => item.body?.data?.id)).size === successful.length, "并发订单号不重复", `唯一订单号 ${new Set(successful.map((item) => item.body?.data?.id)).size}`);
  const dbAfter = new DatabaseSync(dbPath);
  const product = dbAfter.prepare("SELECT stock FROM products WHERE id='p-concurrency'").get();
  const reservations = dbAfter.prepare("SELECT COALESCE(SUM(qty),0) qty FROM inventory_reservations WHERE product_id='p-concurrency' AND status='reserved'").get();
  const orders = dbAfter.prepare("SELECT COUNT(*) count FROM order_items WHERE product_id='p-concurrency'").get();
  dbAfter.close();
  add(Number(product?.stock) === 0 && Number(reservations?.qty) === 5 && Number(orders?.count) === 5, "库存、预占和订单明细一致", `库存 ${product?.stock} · 预占 ${reservations?.qty} · 明细 ${orders?.count}`);
} catch (error) {
  add(false, "并发回归执行", error instanceof Error ? error.message : String(error));
} finally {
  for (const running of production.reverse()) await stop(running);
  rmSync(tempRoot, { recursive: true, force: true });
}

const failed = checks.filter((value) => !value).length;
console.log(`\n数智供社 v8530 生产并发库存回归：${checks.length - failed} 通过，${failed} 失败`);
process.exitCode = failed ? 1 : 0;
