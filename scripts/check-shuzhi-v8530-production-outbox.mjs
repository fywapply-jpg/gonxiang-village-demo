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
const superToken = "production-outbox-super-123456789";
const baseEnv = {
  SHUZHI_RUNTIME_MODE: "production",
  SHUZHI_DB: dbPath,
  SHUZHI_API_TOKEN: "production-outbox-internal-12345678901234567890",
  SHUZHI_ADMIN_TOKEN_ROLES: JSON.stringify({ [financeToken]: "finance", [auditToken]: "audit", [superToken]: "super" }),
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
const webhook = async (port, provider, payload, secret, idempotencyKey = `production-${payload.event_id}`) => {
  const normalizedPayload = { provider, ...payload };
  const raw = JSON.stringify(normalizedPayload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");
  const response = await fetch(`http://127.0.0.1:${port}/api/v1/integrations/${provider}/webhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Webhook-Timestamp": String(timestamp), "X-Webhook-Signature": signature, "X-Webhook-Id": normalizedPayload.event_id, "Idempotency-Key": idempotencyKey },
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
  const readOnlyWorkflow = await request(prodPort, "/api/v1/operations/alliance/advance", financeToken, { evidence: "只读财务岗位不应推进业务流程" }, "outbox-readonly-workflow");
  add(readOnlyWorkflow.status === 403, "生产只读岗位禁止推进业务工作流", `HTTP ${readOnlyWorkflow.status}`);
  const readOnlyArea = await request(prodPort, "/api/v1/merchants/m-supplier/service-area", financeToken, { center_lat: 24.91, center_lng: 115.65, radius_km: 120, max_daily_orders: 80 }, "outbox-readonly-service-area");
  add(readOnlyArea.status === 403, "生产只读岗位禁止维护服务区域", `HTTP ${readOnlyArea.status}`);
  const areaUpdate = await request(prodPort, "/api/v1/merchants/m-supplier/service-area", superToken, { center_lat: 24.9105, center_lng: 115.6528, radius_km: 120, max_daily_orders: 2, regions: ["赣州"], delivery_modes: ["冷链整车"], evidence_ref: "AREA-APPROVAL-OUTBOX-001" }, "outbox-super-service-area");
  add(areaUpdate.status === 200 && areaUpdate.payload?.max_daily_orders === 2, "后台商户管理岗维护服务区域", `HTTP ${areaUpdate.status}`);
  const missingDeliveryLocation = await request(prodPort, "/api/v1/trades", buyerToken, { scene: "buyerSupply", supplier_id: "m-supplier", items: [{ product_id: "p-orange", qty: 1 }], delivery_address: "湖北省武汉市洪山区团餐配送中心", settlement_model: "持牌机构条件结算（验收后分账）" }, "outbox-delivery-location-missing");
  add(missingDeliveryLocation.status === 400, "生产订单缺收货坐标阻断", `HTTP ${missingDeliveryLocation.status}`);
  const outsideArea = await request(prodPort, "/api/v1/trades", buyerToken, { scene: "buyerSupply", supplier_id: "m-supplier", items: [{ product_id: "p-orange", qty: 1 }], delivery_address: "北京市朝阳区测试仓", delivery_lat: 39.9042, delivery_lng: 116.4074, settlement_model: "持牌机构条件结算（验收后分账）" }, "outbox-delivery-outside-area");
  add(outsideArea.status === 409, "生产订单超服务半径阻断", `HTTP ${outsideArea.status}`);
  const withinArea = await request(prodPort, "/api/v1/trades", buyerToken, { scene: "buyerSupply", supplier_id: "m-supplier", items: [{ product_id: "p-orange", qty: 1 }], delivery_address: "江西省赣州市寻乌县测试仓", delivery_lat: 24.91, delivery_lng: 115.65, settlement_model: "持牌机构条件结算（验收后分账）" }, "outbox-delivery-within-area");
  add(withinArea.status === 201 && withinArea.payload?.delivery_constraint?.status === "within_radius", "生产订单落库服务半径证据", `HTTP ${withinArea.status}`);
  const dailyLimit = await request(prodPort, "/api/v1/trades", buyerToken, { scene: "buyerSupply", supplier_id: "m-supplier", items: [{ product_id: "p-orange", qty: 1 }], delivery_address: "江西省赣州市寻乌县测试仓2", delivery_lat: 24.91, delivery_lng: 115.65, settlement_model: "持牌机构条件结算（验收后分账）" }, "outbox-delivery-daily-limit");
  add(dailyLimit.status === 409, "生产订单超过日单量阻断", `HTTP ${dailyLimit.status}`);
  const cancelledOrderId = withinArea.payload?.id;
  const cancelled = await request(prodPort, `/api/v1/trades/${cancelledOrderId}/cancel`, buyerToken, { reason: "采购计划调整取消" }, "outbox-cancel-before-flow");
  add(cancelled.status === 200 && cancelled.payload?.status === "已取消", "生产未启动订单可受控取消", `HTTP ${cancelled.status}`);
  const cancelledContract = await request(prodPort, `/api/v1/trades/${cancelledOrderId}/contract/sign`, buyerToken, { party: "buyer", certificate_ref: "CA-CANCELLED", signer_authorization_ref: "AUTH-CANCELLED" }, "outbox-cancelled-contract");
  add(cancelledContract.status === 409, "已取消交易禁止继续签署合同", `HTTP ${cancelledContract.status}`);
  const cancelledShipment = await request(prodPort, `/api/v1/trades/${cancelledOrderId}/shipments`, supplierToken, { provider: "carrier-prod", consignor: "赣南优品", consignee: "华中商贸", consignor_credit_code: "91360722MA8V85013X", consignee_credit_code: "91420100MA8V85013Y", consignor_address: "江西省赣州市寻乌县农产品仓", consignee_address: "湖北省武汉市洪山区团餐配送中心", goods: [{ product_id: "p-orange", name: "赣南脐橙", quantity: 1, unit: "箱" }] }, "outbox-cancelled-shipment");
  add(cancelledShipment.status === 409, "已取消交易禁止新增运单", `HTTP ${cancelledShipment.status}`);
  const cancelledAcceptance = await request(prodPort, `/api/v1/trades/${cancelledOrderId}/accept`, buyerToken, { result: "accepted", accepted_qty: 1, evidence: "取消后不应再验收" }, "outbox-cancelled-acceptance");
  add(cancelledAcceptance.status === 409, "已取消交易禁止新增验收结论", `HTTP ${cancelledAcceptance.status}`);
  const cancelledCallback = await webhook(prodPort, "logistics", { event_id: `outbox-cancelled-callback-${Date.now()}`, order_id: cancelledOrderId, tracking_no: "CANCELLED-TRK-001", status: "delivered", evidence: "取消后不应推进" }, baseEnv.LOGISTICS_WEBHOOK_SECRET);
  add(cancelledCallback.status === 409, "已取消交易禁止机构回调推进", `HTTP ${cancelledCallback.status}`);
  const fractionalMoney = await request(prodPort, "/api/v1/trades", buyerToken, { scene: "buyerSupply", supplier_id: "m-supplier", items: [{ product_id: "p-orange", qty: 1 }], service_amount: 0.001 }, "outbox-money-fraction-000001");
  add(fractionalMoney.status === 400, "生产金额拒绝半分值", `HTTP ${fractionalMoney.status}`);
  const caBuyer = await request(prodPort, `/api/v1/trades/${orderId}/contract/sign`, buyerToken, { party: "buyer", certificate_ref: "CA-BUYER-PROD", signer_authorization_ref: "AUTH-BUYER-PROD" }, "outbox-ca-buyer-000001");
  add(caBuyer.status === 202 && caBuyer.payload?.institution_outbox?.status === "pending", "生产 CA 签署先入 Outbox", `HTTP ${caBuyer.status}`);
  const caSupplier = await request(prodPort, `/api/v1/trades/${orderId}/contract/sign`, supplierToken, { party: "supplier", certificate_ref: "CA-SUPPLIER-PROD", signer_authorization_ref: "AUTH-SUPPLIER-PROD" }, "outbox-ca-supplier-000001");
  add(caSupplier.status === 202, "生产 CA 双方指令均异步受理", `HTTP ${caSupplier.status}`);
  const paymentBeforeCa = await request(prodPort, `/api/v1/trades/${orderId}/pay`, buyerToken, { payer_credit_code: "91420100MA8V85013Y", payee_credit_code: "91360722MA8V85013X" }, "outbox-payment-before-ca");
  add(paymentBeforeCa.status === 409, "CA 双签完成前禁止托管入金", `HTTP ${paymentBeforeCa.status}`);
  const dbContract = new DatabaseSync(dbPath);
  const contractRow = dbContract.prepare("SELECT id,hash FROM contracts WHERE order_id=? LIMIT 1").get(orderId);
  dbContract.close();
  const contractDigest = createHash("sha256").update(`${contractRow.id}:${orderId}:${contractRow.hash}`).digest("hex");
  const caBuyerCallback = await webhook(prodPort, "ca", { event_id: `outbox-ca-buyer-callback-${Date.now()}`, order_id: orderId, contract_id: contractRow.id, party: "buyer", signer_id: "ca-buyer-signer", signer_name: "采购授权签约人", certificate_ref: "CA-BUYER-PROD", contract_digest: contractDigest, status: "signed" }, baseEnv.CA_WEBHOOK_SECRET);
  add(caBuyerCallback.status === 202, "采购方 CA 签署回执落账", `HTTP ${caBuyerCallback.status}`);
  const caSupplierCallback = await webhook(prodPort, "ca", { event_id: `outbox-ca-supplier-callback-${Date.now()}`, order_id: orderId, contract_id: contractRow.id, party: "supplier", signer_id: "ca-supplier-signer", signer_name: "供货授权签约人", certificate_ref: "CA-SUPPLIER-PROD", contract_digest: contractDigest, status: "signed" }, baseEnv.CA_WEBHOOK_SECRET);
  add(caSupplierCallback.status === 202 && caSupplierCallback.payload?.next_action?.includes("支付"), "供货方 CA 签署回执完成双签", `HTTP ${caSupplierCallback.status}`);
  const shipmentBeforePayment = await request(prodPort, `/api/v1/trades/${orderId}/shipments`, supplierToken, { provider: "carrier-prod", consignor: "赣南优品", consignee: "华中商贸", consignor_credit_code: "91360722MA8V85013X", consignee_credit_code: "91420100MA8V85013Y", consignor_address: "江西省赣州市寻乌县农产品仓", consignee_address: "湖北省武汉市洪山区团餐配送中心", goods: [{ product_id: "p-orange", name: "赣南脐橙", quantity: 10, unit: "箱" }] }, "outbox-logistics-before-payment");
  add(shipmentBeforePayment.status === 409, "托管资金确认前禁止生产发运", `HTTP ${shipmentBeforePayment.status}`);
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
  // 兼容旧版本未带 provider 前缀的幂等记录，但同一字符串若属于物流机构，
  // 不得吞掉支付机构的真实回调。
  const dbLegacyCallback = new DatabaseSync(dbPath);
  dbLegacyCallback.prepare("INSERT INTO integration_callbacks(provider,event_id,idempotency_key,signature,payload,status,received_at) VALUES (?,?,?,?,?,?,?)")
    .run("logistics", `legacy-logistics-${Date.now()}`, "legacy-cross-provider-key", "legacy-signature", "{}", "processed", new Date().toISOString());
  dbLegacyCallback.close();
  const paymentAfterLegacyKey = await webhook(prodPort, "payment", { event_id: `outbox-payment-legacy-key-${Date.now()}`, order_id: orderId, payment_id: retryPaymentId, status: "paid", amount: 276000, provider_transaction_id: "PROVIDER-DEPOSIT-001" }, baseEnv.PAYMENT_WEBHOOK_SECRET, "legacy-cross-provider-key");
  add(paymentAfterLegacyKey.status === 202 && paymentAfterLegacyKey.payload?.replayed === false, "跨机构旧幂等键不得吞掉支付回调", `HTTP ${paymentAfterLegacyKey.status}`);
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
  const dbInvoiceMismatch = new DatabaseSync(dbPath);
  dbInvoiceMismatch.prepare("UPDATE invoices SET amount=amount+1 WHERE order_id=?").run(orderId);
  dbInvoiceMismatch.close();
  const invoiceAmountMismatch = await request(prodPort, `/api/v1/trades/${orderId}/invoice`, supplierToken, { amount: 276001, seller_credit_code: "91360722MA8V85013X", buyer_credit_code: "91420100MA8V85013Y", tax_rate: 0.09, invoice_type: "增值税电子普通发票", tax_category_code: "农业产品" }, "outbox-invoice-amount-mismatch");
  add(invoiceAmountMismatch.status === 409, "发票与订单金额不一致禁止开票", `HTTP ${invoiceAmountMismatch.status}`);
  const dbInvoiceRestore = new DatabaseSync(dbPath);
  dbInvoiceRestore.prepare("UPDATE invoices SET amount=276000 WHERE order_id=?").run(orderId);
  dbInvoiceRestore.close();
  const dbAmountMismatch = new DatabaseSync(dbPath);
  const originalOrderAmount = dbAmountMismatch.prepare("SELECT amount FROM orders WHERE id=?").get(orderId)?.amount;
  dbAmountMismatch.prepare("UPDATE orders SET amount=amount+1 WHERE id=?").run(orderId);
  dbAmountMismatch.prepare("UPDATE invoices SET status='已开具',amount=? WHERE order_id=?").run(276000, orderId);
  dbAmountMismatch.close();
  const releaseAmountMismatch = await webhook(prodPort, "payment", { event_id: `outbox-payment-release-amount-mismatch-${Date.now()}`, action: "release", order_id: orderId, payment_id: retryPaymentId, status: "paid", amount: 276000, provider_transaction_id: "PROVIDER-RELEASE-AMOUNT-MISMATCH" }, baseEnv.PAYMENT_WEBHOOK_SECRET);
  add(releaseAmountMismatch.status === 409, "订单/托管/发票金额不一致禁止分账", `HTTP ${releaseAmountMismatch.status}`);
  const dbRestoreAmount = new DatabaseSync(dbPath);
  dbRestoreAmount.prepare("UPDATE orders SET amount=? WHERE id=?").run(originalOrderAmount, orderId);
  dbRestoreAmount.prepare("UPDATE invoices SET status='待开具' WHERE order_id=?").run(orderId);
  dbRestoreAmount.close();
  const regulatorySubmission = await request(prodPort, "/api/v1/regulatory/submissions", auditToken, { action: "submit", subject_type: "merchant", subject_id: "m-supplier", authority_code: "AQSIQ-TEST", data_minimization_version: "2026-01", evidence_refs: ["MERCHANT-LICENSE-TEST", "PRODUCT-QUALITY-TEST"] }, "outbox-regulator-submit-000001");
  const regulatoryId = regulatorySubmission.payload?.id;
  add(regulatorySubmission.status === 202 && regulatorySubmission.payload?.institution_outbox?.provider === "regulator", "生产监管提交先入 Outbox", `HTTP ${regulatorySubmission.status}`);
  const unsupportedRegulatorySubject = await request(prodPort, "/api/v1/regulatory/submissions", auditToken, { action: "submit", subject_type: "inspection", subject_id: "INSPECTION-UNMODELED-001", authority_code: "AQSIQ-TEST", data_minimization_version: "2026-01", evidence_refs: ["INSPECTION-EVIDENCE-TEST"] }, "outbox-regulator-unmodeled-000001");
  add(unsupportedRegulatorySubject.status === 409, "生产监管提交拒绝未建模主体", `HTTP ${unsupportedRegulatorySubject.status}`);
  const regulatoryCallback = await webhook(prodPort, "regulator", { event_id: `outbox-regulator-callback-${Date.now()}`, provider: "regulator", submission_id: regulatoryId, subject_type: "merchant", subject_id: "m-supplier", authority_code: "AQSIQ-TEST", receipt_ref: "REG-RECEIPT-001", status: "accepted" }, baseEnv.REGULATOR_WEBHOOK_SECRET);
  add(regulatoryCallback.status === 202 && regulatoryCallback.payload?.next_action?.includes("已回执"), "监管回执推进提交状态", `HTTP ${regulatoryCallback.status} · ${JSON.stringify(regulatoryCallback.payload)}`);
  const regulatoryOverwrite = await webhook(prodPort, "regulator", { event_id: `outbox-regulator-overwrite-${Date.now()}`, provider: "regulator", submission_id: regulatoryId, subject_type: "merchant", subject_id: "m-supplier", authority_code: "AQSIQ-TEST", receipt_ref: "REG-RECEIPT-OTHER", status: "accepted" }, baseEnv.REGULATOR_WEBHOOK_SECRET);
  add(regulatoryOverwrite.status === 409, "监管终态回执证据禁止覆盖", `HTTP ${regulatoryOverwrite.status}`);
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
  const invoiceAfterRefund = await request(prodPort, `/api/v1/trades/${orderId}/invoice`, supplierToken, { amount: 276000, seller_credit_code: "91360722MA8V85013X", buyer_credit_code: "91420100MA8V85013Y", tax_rate: 0.09, invoice_type: "增值税电子普通发票", tax_category_code: "农业产品" }, "outbox-invoice-after-refund");
  add(invoiceAfterRefund.status === 409, "全额退款后禁止普通开票", `HTTP ${invoiceAfterRefund.status}`);
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
