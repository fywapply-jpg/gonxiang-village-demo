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
const auditToken = "production-outbox-audit-123456789";
const baseEnv = {
  SHUZHI_RUNTIME_MODE: "production",
  SHUZHI_DB: dbPath,
  SHUZHI_API_TOKEN: "production-outbox-internal-12345678901234567890",
  SHUZHI_ADMIN_TOKEN_ROLES: JSON.stringify({ [financeToken]: "finance", [auditToken]: "audit" }),
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
  const normalizedPayload = { provider, ...payload };
  const raw = JSON.stringify(normalizedPayload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");
  const response = await fetch(`http://127.0.0.1:${port}/api/v1/integrations/${provider}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Webhook-Timestamp": String(timestamp), "X-Webhook-Signature": signature, "X-Webhook-Id": normalizedPayload.event_id, "Idempotency-Key": `production-${normalizedPayload.event_id}` },
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
  // 清理演示种子运单，确保本回归只验证本次生产发运的送达门禁。
  db.prepare("DELETE FROM shipments WHERE order_id='SZGS-2026-850901'").run();
  db.close();
  productionServer = start(prodPort);
  await ready(productionServer, prodPort);
  const orderId = "SZGS-2026-850901";
  const fractionalMoney = await request(prodPort, "/api/v1/trades", buyerToken, { scene: "buyerSupply", supplier_id: "m-supplier", items: [{ product_id: "p-orange", qty: 1 }], service_amount: 0.001 }, "outbox-money-fraction-000001");
  add(fractionalMoney.status === 400, "生产金额拒绝半分值", `HTTP ${fractionalMoney.status}`);
  const caBuyer = await request(prodPort, `/api/v1/trades/${orderId}/contract/sign`, buyerToken, { party: "buyer", certificate_ref: "CA-BUYER-PROD", signer_authorization_ref: "AUTH-BUYER-PROD" }, "outbox-ca-buyer-000001");
  add(caBuyer.status === 202 && caBuyer.payload?.institution_outbox?.status === "pending", "生产 CA 签署先入 Outbox", `HTTP ${caBuyer.status}`);
  const caSupplier = await request(prodPort, `/api/v1/trades/${orderId}/contract/sign`, supplierToken, { party: "supplier", certificate_ref: "CA-SUPPLIER-PROD", signer_authorization_ref: "AUTH-SUPPLIER-PROD" }, "outbox-ca-supplier-000001");
  add(caSupplier.status === 202, "生产 CA 双方指令均异步受理", `HTTP ${caSupplier.status}`);
  const mismatchedIdentity = await request(prodPort, `/api/v1/trades/${orderId}/shipments`, supplierToken, { provider: "carrier-prod", consignor: "赣南优品", consignee: "华中商贸", consignor_credit_code: "91360722MA8V85013Q", consignee_credit_code: "91420100MA8V85013Y", consignor_address: "江西省赣州市寻乌县农产品仓", consignee_address: "湖北省武汉市洪山区团餐配送中心", goods: [{ product_id: "p-orange", name: "赣南脐橙", quantity: 10, unit: "箱" }] }, "outbox-logistics-mismatched-identity");
  add(mismatchedIdentity.status === 409, "机构指令主体代码错配阻断", `HTTP ${mismatchedIdentity.status}`);
  const shipment = await request(prodPort, `/api/v1/trades/${orderId}/shipments`, supplierToken, { provider: "carrier-prod", consignor: "赣南优品", consignee: "华中商贸", consignor_credit_code: "91360722MA8V85013X", consignee_credit_code: "91420100MA8V85013Y", consignor_address: "江西省赣州市寻乌县农产品仓", consignee_address: "湖北省武汉市洪山区团餐配送中心", goods: [{ product_id: "p-orange", name: "赣南脐橙", quantity: 10, unit: "箱" }] }, "outbox-logistics-000001");
  add(shipment.status === 202 && shipment.payload?.status === "待机构受理", "生产物流先建待受理运单", `HTTP ${shipment.status}`);
  const acceptanceBeforeDelivery = await request(prodPort, `/api/v1/trades/${orderId}/accept`, buyerToken, { result: "accepted", accepted_qty: 1, evidence: "尚未送达的验收尝试" }, "outbox-accept-before-delivery");
  add(acceptanceBeforeDelivery.status === 409, "生产未送达禁止提前验收", `HTTP ${acceptanceBeforeDelivery.status}`);
  const deliveredCallback = await webhook(prodPort, "logistics", { event_id: `outbox-logistics-delivered-${Date.now()}`, order_id: orderId, tracking_no: "OUTBOX-TRK-001", status: "delivered", temperature: 4.1, evidence: "第三方物流签收回单" }, baseEnv.LOGISTICS_WEBHOOK_SECRET);
  add(deliveredCallback.status === 202 && deliveredCallback.payload?.next_action?.includes("验收"), "物流送达回调推进验收节点", `HTTP ${deliveredCallback.status}${deliveredCallback.status !== 202 ? ` · ${JSON.stringify(deliveredCallback.payload)}` : ""}`);
  const acceptanceAfterDelivery = await request(prodPort, `/api/v1/trades/${orderId}/accept`, buyerToken, { result: "accepted", accepted_qty: 1, evidence: "复磅/抽检/签收证据" }, "outbox-accept-after-delivery");
  add(acceptanceAfterDelivery.status === 201, "生产送达后才允许验收", `HTTP ${acceptanceAfterDelivery.status}${acceptanceAfterDelivery.status !== 201 ? ` · ${JSON.stringify(acceptanceAfterDelivery.payload)}` : ""}`);
  const regulatorySubmission = await request(prodPort, "/api/v1/regulatory/submissions", auditToken, { action: "submit", subject_type: "merchant", subject_id: "m-supplier", authority_code: "AQSIQ-TEST", data_minimization_version: "2026-01", evidence_refs: ["MERCHANT-LICENSE-TEST", "PRODUCT-QUALITY-TEST"] }, "outbox-regulator-submit-000001");
  const regulatoryId = regulatorySubmission.payload?.id;
  add(regulatorySubmission.status === 202 && regulatorySubmission.payload?.institution_outbox?.provider === "regulator", "生产监管提交先入 Outbox", `HTTP ${regulatorySubmission.status}`);
  const unsupportedRegulatorySubject = await request(prodPort, "/api/v1/regulatory/submissions", auditToken, { action: "submit", subject_type: "inspection", subject_id: "INSPECTION-UNMODELED-001", authority_code: "AQSIQ-TEST", data_minimization_version: "2026-01", evidence_refs: ["INSPECTION-EVIDENCE-TEST"] }, "outbox-regulator-unmodeled-000001");
  add(unsupportedRegulatorySubject.status === 409, "生产监管提交拒绝未建模主体", `HTTP ${unsupportedRegulatorySubject.status}`);
  const regulatoryCallback = await webhook(prodPort, "regulator", { event_id: `outbox-regulator-callback-${Date.now()}`, provider: "regulator", submission_id: regulatoryId, subject_type: "merchant", subject_id: "m-supplier", authority_code: "AQSIQ-TEST", receipt_ref: "REG-RECEIPT-001", status: "accepted" }, baseEnv.REGULATOR_WEBHOOK_SECRET);
  add(regulatoryCallback.status === 202 && regulatoryCallback.payload?.next_action?.includes("已回执"), "监管回执推进提交状态", `HTTP ${regulatoryCallback.status} · ${JSON.stringify(regulatoryCallback.payload)}`);
  const regulatoryOverwrite = await webhook(prodPort, "regulator", { event_id: `outbox-regulator-overwrite-${Date.now()}`, provider: "regulator", submission_id: regulatoryId, subject_type: "merchant", subject_id: "m-supplier", authority_code: "AQSIQ-TEST", receipt_ref: "REG-RECEIPT-OTHER", status: "accepted" }, baseEnv.REGULATOR_WEBHOOK_SECRET);
  add(regulatoryOverwrite.status === 409, "监管终态回执证据禁止覆盖", `HTTP ${regulatoryOverwrite.status}`);
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
  const dbRefund = new DatabaseSync(dbPath);
  dbRefund.prepare("UPDATE payments SET status='已入金待验收',provider_transaction_id=? WHERE id=?").run("PROVIDER-DEPOSIT-001", retryPaymentId);
  dbRefund.close();
  const unknownPaymentAction = await webhook(prodPort, "payment", { event_id: `outbox-payment-unknown-action-${Date.now()}`, action: "capture", order_id: orderId, payment_id: retryPaymentId, status: "paid", amount: 276000, provider_transaction_id: "PROVIDER-TX-UNKNOWN-ACTION" }, baseEnv.PAYMENT_WEBHOOK_SECRET);
  add(unknownPaymentAction.status === 400, "生产支付回调拒绝未知 action", `HTTP ${unknownPaymentAction.status}`);
  const failedRelease = await webhook(prodPort, "payment", { event_id: `outbox-payment-release-failed-${Date.now()}`, action: "release", order_id: orderId, payment_id: retryPaymentId, status: "failed", amount: 276000, provider_transaction_id: "PROVIDER-RELEASE-FAILED" }, baseEnv.PAYMENT_WEBHOOK_SECRET);
  add(failedRelease.status === 409, "分账失败不得覆盖托管入金账本", `HTTP ${failedRelease.status}`);
  const refund = await request(prodPort, `/api/v1/trades/${orderId}/refund`, buyerToken, { amount: 100, reason: "买方复核后申请退款" }, "outbox-payment-refund-000001");
  add(refund.status === 202 && refund.payload?.refund_pending === true, "生产退款先入 Outbox", `HTTP ${refund.status}`);
  const refundId = refund.payload?.refunds?.at(-1)?.id;
  const refundCallback = await webhook(prodPort, "payment", { event_id: `outbox-payment-refund-callback-${Date.now()}`, action: "refund", refund_id: refundId, order_id: orderId, payment_id: retryPaymentId, status: "refunded", amount: 100, provider_transaction_id: "PROVIDER-REFUND-001" }, baseEnv.PAYMENT_WEBHOOK_SECRET);
  add(refundCallback.status === 202 && refundCallback.payload?.next_action?.includes("部分退回"), "生产部分退款回调落账", `HTTP ${refundCallback.status}${refundCallback.status !== 202 ? ` · ${JSON.stringify(refundCallback.payload)}` : ""}`);
  const refundOverLimit = await request(prodPort, `/api/v1/trades/${orderId}/refund`, buyerToken, { amount: 275999.99, reason: "买方再次复核后申请超额退款" }, "outbox-payment-refund-over-limit");
  add(refundOverLimit.status === 409, "累计退款超过原支付金额时阻断", `HTTP ${refundOverLimit.status}`);
  const finalRefund = await request(prodPort, `/api/v1/trades/${orderId}/refund`, buyerToken, { amount: 275900, reason: "买方复核后申请剩余退款" }, "outbox-payment-refund-final-000001");
  add(finalRefund.status === 202, "生产剩余退款继续入 Outbox", `HTTP ${finalRefund.status}`);
  const finalRefundId = finalRefund.payload?.refunds?.at(-1)?.id;
  const finalRefundCallback = await webhook(prodPort, "payment", { event_id: `outbox-payment-refund-final-callback-${Date.now()}`, action: "refund", refund_id: finalRefundId, order_id: orderId, payment_id: retryPaymentId, status: "refunded", amount: 275900, provider_transaction_id: "PROVIDER-REFUND-002" }, baseEnv.PAYMENT_WEBHOOK_SECRET);
  add(finalRefundCallback.status === 202 && finalRefundCallback.payload?.next_action?.includes("全部退回"), "生产全额退款回调落账", `HTTP ${finalRefundCallback.status}${finalRefundCallback.status !== 202 ? ` · ${JSON.stringify(finalRefundCallback.payload)}` : ""}`);
  const dbAfter = new DatabaseSync(dbPath);
  dbAfter.prepare("UPDATE contracts SET status='已签署',signed_at=? WHERE order_id=?").run(t, orderId);
  dbAfter.prepare("UPDATE acceptances SET result='accepted',accepted_qty=1,accepted_at=?,evidence='生产验收回执' WHERE order_id=?").run(t, orderId);
  dbAfter.prepare("UPDATE invoices SET amount=276000 WHERE order_id=?").run(orderId);
  dbAfter.prepare("UPDATE payments SET status='已入金待验收',paid_at=? WHERE id=?").run(t, retryPaymentId);
  dbAfter.prepare("UPDATE payment_refunds SET status='退款失败',updated_at=? WHERE id=?").run(t, refundId);
  dbAfter.prepare("UPDATE orders SET payment_status='机构已确认（验收后分账）' WHERE id=?").run(orderId);
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
  add(providers.join(",") === "ca,invoice,logistics,payment,regulator" && outbox.some((row) => row.provider === "payment" && row.command_type === "refund") && outbox.some((row) => row.provider === "regulator" && row.command_type === "submit"), "五类机构写操作使用异步边界", JSON.stringify(outbox));
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
