#!/usr/bin/env node

import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { createHash, createHmac } from "node:crypto";

const root = resolve(new URL("..", import.meta.url).pathname);
const serverFile = resolve(root, "local-backend/server.mjs");
const tempRoot = mkdtempSync(join(tmpdir(), "shuzhi-production-outbox-"));
const dbPath = join(tempRoot, "production.sqlite");
const seedPort = 9400 + Math.floor(Math.random() * 200);
const prodPort = seedPort + 1;
const wait = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
const buyerToken = "production-outbox-buyer-123456789012";
const supplierToken = "production-outbox-supplier-123456789";
const financeToken = "production-outbox-finance-123456789";
const baseEnv = {
  SHUZHI_RUNTIME_MODE: "production",
  SHUZHI_DB: dbPath,
  SHUZHI_API_TOKEN: "production-outbox-internal-12345678901234567890",
  SHUZHI_ADMIN_TOKEN_ROLES: JSON.stringify({ [financeToken]: "finance" }),
  SHUZHI_USER_TOKEN_PRINCIPALS: JSON.stringify({
    [buyerToken]: { id: "buyer-user", name: "采购经办人", role: "buyer", merchant_id: "m-buyer" },
    [supplierToken]: { id: "supplier-user", name: "供货经办人", role: "supplier", merchant_id: "m-supplier" },
  }),
  SHUZHI_ALLOWED_ORIGIN: "https://app.example.com",
  VITE_API_BASE: "https://api.example.com",
  SHUZHI_CA_ADAPTER_URL: "https://ca-adapter.example.com",
  SHUZHI_CA_ADAPTER_SECRET: "production-ca-outbound-secret-123456789012",
  SHUZHI_PAYMENT_ADAPTER_URL: "https://payment-adapter.example.com",
  SHUZHI_PAYMENT_ADAPTER_SECRET: "production-payment-outbound-secret-123456789",
  SHUZHI_LOGISTICS_ADAPTER_URL: "https://logistics-adapter.example.com",
  SHUZHI_LOGISTICS_ADAPTER_SECRET: "production-logistics-outbound-secret-123456789",
  SHUZHI_INVOICE_ADAPTER_URL: "https://invoice-adapter.example.com",
  SHUZHI_INVOICE_ADAPTER_SECRET: "production-invoice-outbound-secret-123456789",
  SHUZHI_REGULATOR_ADAPTER_URL: "https://regulator-adapter.example.com",
  SHUZHI_REGULATOR_ADAPTER_SECRET: "production-regulator-outbound-secret-123456789",
  CA_WEBHOOK_SECRET: "production-ca-webhook-secret-123456789012",
  LOGISTICS_WEBHOOK_SECRET: "production-logistics-webhook-secret-123456",
  PAYMENT_WEBHOOK_SECRET: "production-payment-webhook-secret-123456",
  INVOICE_WEBHOOK_SECRET: "production-invoice-webhook-secret-123456",
  REGULATOR_WEBHOOK_SECRET: "production-regulator-webhook-secret-123456",
  SHUZHI_CA_READY: "true",
  SHUZHI_PAYMENT_READY: "true",
  SHUZHI_LOGISTICS_READY: "true",
  SHUZHI_INVOICE_READY: "true",
  SHUZHI_REGULATOR_READY: "true",
};
const start = (port, extra = {}) => {
  const child = spawn(process.execPath, [serverFile], { cwd: root, env: { ...process.env, ...baseEnv, PORT: String(port), ...extra }, stdio: ["ignore", "pipe", "pipe"] });
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
const ready = async (running, port) => {
  const deadline = Date.now() + 8_000;
  while (Date.now() < deadline) {
    if (running.child.exitCode !== null) throw new Error(running.output());
    try { const response = await fetch(`http://127.0.0.1:${port}/health/ready`); if (response.ok) return; } catch {}
    await wait(100);
  }
  throw new Error(`服务未就绪：${running.output()}`);
};
const request = async (port, path, token, body, key) => {
  const response = await fetch(`http://127.0.0.1:${port}${path}`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(body) });
  let payload = {}; try { payload = await response.json(); } catch {}
  return { status: response.status, payload: payload?.data || payload };
};
const webhook = async (port, provider, payload, secret) => {
  const raw = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");
  const response = await fetch(`http://127.0.0.1:${port}/api/v1/integrations/${provider}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Webhook-Timestamp": String(timestamp), "X-Webhook-Signature": signature, "X-Webhook-Id": payload.event_id, "Idempotency-Key": `production-${payload.event_id}` },
    body: raw,
  });
  let body = {}; try { body = await response.json(); } catch {}
  return { status: response.status, payload: body?.data || body };
};
const checks = [];
const add = (ok, name, detail) => { checks.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`); };
let seedServer;
let productionServer;
try {
  seedServer = start(seedPort, { SHUZHI_RUNTIME_MODE: "local-demo", SHUZHI_SEED_DEMO_DATA: "true" });
  await ready(seedServer, seedPort);
  await stop(seedServer);
  const db = new DatabaseSync(dbPath);
  const t = new Date().toISOString();
  const verification = db.prepare("INSERT OR IGNORE INTO merchant_verifications(id,merchant_id,verification_type,status,provider,evidence_ref,verified_by,verified_at,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)");
  const merchantIds = db.prepare("SELECT id FROM merchants").all().map((row) => String(row.id));
  for (const merchant of merchantIds) for (const type of ["license", "bank"]) verification.run(`MV-OUTBOX-${merchant}-${type}`, merchant, type, "verified", "测试核验机构", `OUTBOX-${merchant}-${type}`, "测试审核岗", t, null, t, t);
  db.prepare("DELETE FROM contract_signatures WHERE contract_id='CA-SZGS-850901'").run();
  db.prepare("UPDATE contracts SET status='待双方签署',signed_at=NULL WHERE id='CA-SZGS-850901'").run();
  db.prepare("UPDATE orders SET contract_status='待双方签署' WHERE id='SZGS-2026-850901'").run();
  db.prepare("UPDATE invoices SET invoice_no=NULL,status='待开具',issued_at=NULL WHERE order_id='SZGS-2026-850901'").run();
  db.close();
  productionServer = start(prodPort);
  await ready(productionServer, prodPort);
  const orderId = "SZGS-2026-850901";
  const caBuyer = await request(prodPort, `/api/v1/trades/${orderId}/contract/sign`, buyerToken, { party: "buyer", certificate_ref: "CA-BUYER-PROD", signer_authorization_ref: "AUTH-BUYER-PROD" }, "outbox-ca-buyer-000001");
  add(caBuyer.status === 202 && caBuyer.payload?.institution_outbox?.status === "pending", "生产 CA 签署先入 Outbox", `HTTP ${caBuyer.status}`);
  const caSupplier = await request(prodPort, `/api/v1/trades/${orderId}/contract/sign`, supplierToken, { party: "supplier", certificate_ref: "CA-SUPPLIER-PROD", signer_authorization_ref: "AUTH-SUPPLIER-PROD" }, "outbox-ca-supplier-000001");
  add(caSupplier.status === 202, "生产 CA 双方指令均异步受理", `HTTP ${caSupplier.status}`);
  const mismatchedIdentity = await request(prodPort, `/api/v1/trades/${orderId}/shipments`, supplierToken, { provider: "carrier-prod", consignor: "赣南优品", consignee: "华中商贸", consignor_credit_code: "91360722MA8V85013Q", consignee_credit_code: "91420100MA8V85013Y", consignor_address: "江西省赣州市寻乌县农产品仓", consignee_address: "湖北省武汉市洪山区团餐配送中心", goods: [{ product_id: "p-orange", name: "赣南脐橙", quantity: 10, unit: "箱" }] }, "outbox-logistics-mismatched-identity");
  add(mismatchedIdentity.status === 409, "机构指令主体代码错配阻断", `HTTP ${mismatchedIdentity.status}`);
  const shipment = await request(prodPort, `/api/v1/trades/${orderId}/shipments`, supplierToken, { provider: "carrier-prod", consignor: "赣南优品", consignee: "华中商贸", consignor_credit_code: "91360722MA8V85013X", consignee_credit_code: "91420100MA8V85013Y", consignor_address: "江西省赣州市寻乌县农产品仓", consignee_address: "湖北省武汉市洪山区团餐配送中心", goods: [{ product_id: "p-orange", name: "赣南脐橙", quantity: 10, unit: "箱" }] }, "outbox-logistics-000001");
  add(shipment.status === 202 && shipment.payload?.status === "待机构受理", "生产物流先建待受理运单", `HTTP ${shipment.status}`);
  const dbPayment = new DatabaseSync(dbPath);
  dbPayment.prepare("UPDATE payments SET status='待机构确认',paid_at=NULL WHERE order_id=?").run(orderId);
  dbPayment.close();
  const paymentCreate = await request(prodPort, `/api/v1/trades/${orderId}/pay`, buyerToken, { payer_credit_code: "91420100MA8V85013Y", payee_credit_code: "91360722MA8V85013X" }, "outbox-payment-create-000001");
  add(paymentCreate.status === 202 && paymentCreate.payload?.payment_pending === true, "生产托管入金先入 Outbox", `HTTP ${paymentCreate.status}`);
  const dbRetry = new DatabaseSync(dbPath);
  const failedPaymentId = dbRetry.prepare("SELECT id FROM payments WHERE order_id=? ORDER BY rowid DESC LIMIT 1").get(orderId)?.id;
  dbRetry.prepare("UPDATE payments SET status='支付失败' WHERE id=?").run(failedPaymentId);
  dbRetry.close();
  const paymentRetry = await request(prodPort, `/api/v1/trades/${orderId}/pay`, buyerToken, { payer_credit_code: "91420100MA8V85013Y", payee_credit_code: "91360722MA8V85013X" }, "outbox-payment-retry-000001");
  add(paymentRetry.status === 202 && paymentRetry.payload?.payment_pending === true && Array.isArray(paymentRetry.payload?.payments) && paymentRetry.payload.payments.length === 2, "支付失败重试创建新支付尝试", `HTTP ${paymentRetry.status}`);
  const retryPaymentId = paymentRetry.payload?.payments?.at(-1)?.id;
  const paymentCallbackMissingId = await webhook(prodPort, "payment", { event_id: `outbox-payment-missing-id-${Date.now()}`, order_id: orderId, status: "paid", amount: 276000, provider_transaction_id: "PROVIDER-TX-MISSING-PAYMENT-ID" }, baseEnv.PAYMENT_WEBHOOK_SECRET);
  add(paymentCallbackMissingId.status === 400, "生产支付回调必须绑定支付尝试", `HTTP ${paymentCallbackMissingId.status}`);
  const dbAfter = new DatabaseSync(dbPath);
  dbAfter.prepare("UPDATE contracts SET status='已签署',signed_at=? WHERE order_id=?").run(t, orderId);
  dbAfter.prepare("UPDATE acceptances SET result='accepted',accepted_qty=1,accepted_at=?,evidence='生产验收回执' WHERE order_id=?").run(t, orderId);
  dbAfter.prepare("UPDATE invoices SET amount=276000 WHERE order_id=?").run(orderId);
  dbAfter.prepare("UPDATE payments SET status='已入金待验收',paid_at=? WHERE id=?").run(t, retryPaymentId);
  dbAfter.close();
  const invoiceMissingTax = await request(prodPort, `/api/v1/trades/${orderId}/invoice`, supplierToken, { amount: 276000, seller_credit_code: "91360722MA8V85013X", buyer_credit_code: "91420100MA8V85013Y", tax_rate: 0.09 }, "outbox-invoice-missing-tax-fields");
  add(invoiceMissingTax.status === 400, "生产开票缺少税务字段阻断", `HTTP ${invoiceMissingTax.status}`);
  const invoice = await request(prodPort, `/api/v1/trades/${orderId}/invoice`, supplierToken, { amount: 276000, seller_credit_code: "91360722MA8V85013X", buyer_credit_code: "91420100MA8V85013Y", tax_rate: 0.09, invoice_type: "增值税电子普通发票", tax_category_code: "农业产品" }, "outbox-invoice-000001");
  add(invoice.status === 202, "生产发票先入 Outbox", `HTTP ${invoice.status}${invoice.status !== 202 ? ` · ${JSON.stringify(invoice.payload)} · ${productionServer.output().slice(-900)}` : ""}`);
  const dbIssued = new DatabaseSync(dbPath);
  dbIssued.prepare("UPDATE invoices SET status='已开具',invoice_no='PROD-INVOICE-001',issued_at=? WHERE order_id=?").run(t, orderId);
  dbIssued.close();
  const settlement = await request(prodPort, `/api/v1/trades/${orderId}/settle`, financeToken, { payer_credit_code: "91420100MA8V85013Y", payee_credit_code: "91360722MA8V85013X" }, "outbox-payment-release-000001");
  add(settlement.status === 202 && settlement.payload?.settlement_pending === true, "生产分账先入 Outbox", `HTTP ${settlement.status}${settlement.status !== 202 ? ` · ${JSON.stringify(settlement.payload)} · ${productionServer.output().slice(-600)}` : ""}`);
  const outbox = new DatabaseSync(dbPath).prepare("SELECT provider,command_type,status FROM institution_outbox ORDER BY provider,command_type").all();
  const providers = [...new Set(outbox.map((row) => row.provider))].sort();
  add(providers.join(",") === "ca,invoice,logistics,payment", "五类机构写操作使用异步边界", JSON.stringify(outbox));
} catch (error) {
  add(false, "生产 Outbox 回归启动", `${error instanceof Error ? error.message : String(error)}${productionServer?.output?.() ? ` · ${productionServer.output().slice(-1200)}` : ""}`);
} finally {
  await stop(productionServer);
  await stop(seedServer);
  rmSync(tempRoot, { recursive: true, force: true });
}
const failures = checks.filter((ok) => !ok).length;
console.log(`\n数智供社 v8530 生产 Outbox 回归：${checks.length - failures} 通过，${failures} 失败`);
process.exitCode = failures ? 1 : 0;
