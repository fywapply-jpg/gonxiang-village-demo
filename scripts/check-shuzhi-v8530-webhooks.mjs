#!/usr/bin/env node
import { createHmac, randomUUID } from "node:crypto";
import { createHash } from "node:crypto";

const base = String(process.env.SHUZHI_TEST_BASE || "http://127.0.0.1:8787").replace(/\/$/, "");
const orderId = process.env.SHUZHI_TEST_ORDER || "SZGS-2026-850901";
const secrets = {
  ca: process.env.CA_WEBHOOK_SECRET || "local-demo-ca-secret",
  logistics: process.env.LOGISTICS_WEBHOOK_SECRET || "local-demo-logistics-secret",
  payment: process.env.PAYMENT_WEBHOOK_SECRET || "local-demo-payment-secret",
  invoice: process.env.INVOICE_WEBHOOK_SECRET || "local-demo-invoice-secret",
  regulator: process.env.REGULATOR_WEBHOOK_SECRET || "local-demo-regulator-secret",
};
const checks = [];
const add = (ok, name, detail) => { checks.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`); };
const send = async (provider, payload, options = {}) => {
  const normalizedPayload = { provider, ...payload };
  const raw = JSON.stringify(normalizedPayload);
  const timestamp = options.timestamp || Math.floor(Date.now() / 1000);
  const eventId = options.eventId || normalizedPayload.event_id || randomUUID();
  const key = options.idempotencyKey || `webhook-${provider}-${eventId}`;
  const signature = createHmac("sha256", secrets[provider]).update(`${timestamp}.${raw}`).digest("hex");
  const headers = {
    "Content-Type": "application/json",
    "X-Webhook-Timestamp": String(timestamp),
    "X-Webhook-Signature": options.signature || signature,
    "X-Webhook-Id": eventId,
    "Idempotency-Key": key,
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
  };
  const response = await fetch(`${base}/api/v1/integrations/${provider}/webhook`, { method: "POST", headers, body: raw });
  let body = {}; try { body = await response.json(); } catch {}
  return { status: response.status, body, eventId, key };
};

const logisticsPayload = { event_id: `v8530-logistics-${Date.now()}`, order_id: orderId, tracking_no: "SF202608030001", status: "in_transit", temperature: 4.1 };
const caDigest = createHash("sha256").update(`CA-SZGS-850901:${orderId}:0x850901ca…c4`).digest("hex");
const caPayload = { event_id: `v8530-ca-${Date.now()}`, order_id: orderId, contract_id: "CA-SZGS-850901", party: "buyer", signer_id: "m-buyer", certificate_ref: "CA-BUYER-DEMO", contract_digest: caDigest, status: "signed" };
const ca = await send("ca", caPayload);
add(ca.status === 202, "CA签署回调", `HTTP ${ca.status}`);
const caReplay = await send("ca", caPayload, { eventId: ca.eventId, idempotencyKey: ca.key });
add(caReplay.status === 200 && caReplay.body?.data?.replayed === true, "CA重复回调重放", `HTTP ${caReplay.status}`);
const logistics = await send("logistics", logisticsPayload);
add(logistics.status === 202, "物流签名回调", `HTTP ${logistics.status}`);
const invalidTemperature = await send("logistics", { ...logisticsPayload, event_id: `v8530-logistics-temp-${Date.now()}`, temperature: 999 });
add(invalidTemperature.status === 400, "物流异常温度拦截", `HTTP ${invalidTemperature.status}`);
const logisticsReplay = await send("logistics", logisticsPayload, { eventId: logistics.eventId, idempotencyKey: logistics.key });
add(logisticsReplay.status === 200 && logisticsReplay.body?.data?.replayed === true, "物流重复回调重放", `HTTP ${logisticsReplay.status}`);
const badSignature = await send("logistics", { ...logisticsPayload, event_id: `v8530-bad-${Date.now()}` }, { signature: "00" });
add(badSignature.status === 401, "错误签名拦截", `HTTP ${badSignature.status}`);
const stale = await send("regulator", { event_id: `v8530-stale-${Date.now()}`, action: "sync" }, { timestamp: Math.floor(Date.now() / 1000) - 3600 });
add(stale.status === 401, "过期时间戳拦截", `HTTP ${stale.status}`);
const payment = await send("payment", { event_id: `v8530-payment-${Date.now()}`, order_id: orderId, payment_id: "PAY-SZGS-850901", status: "paid", amount: 276000 });
add(payment.status === 202, "支付入金回调", `HTTP ${payment.status}`);
const mismatchedProvider = await send("payment", { provider: "logistics", event_id: `v8530-provider-mismatch-${Date.now()}`, order_id: orderId, payment_id: "PAY-SZGS-850901", status: "paid", amount: 276000 });
add(mismatchedProvider.status === 400, "回调机构与路径绑定", `HTTP ${mismatchedProvider.status}`);
const paymentRegression = await send("payment", { event_id: `v8530-payment-regression-${Date.now()}`, order_id: orderId, payment_id: "PAY-SZGS-850901", status: "pending", amount: 276000 });
add(paymentRegression.status === 409, "支付已确认后禁止状态回退", `HTTP ${paymentRegression.status}`);
const paymentUnknown = await send("payment", { event_id: `v8530-payment-unknown-${Date.now()}`, order_id: orderId, payment_id: "PAY-SZGS-850901", status: "provider_new_state", amount: 276000 });
add(paymentUnknown.status === 400, "支付未知状态拒绝落账", `HTTP ${paymentUnknown.status}`);
const paymentMismatch = await send("payment", { event_id: `v8530-payment-mismatch-${Date.now()}`, order_id: orderId, payment_id: "PAY-SZGS-850901", status: "paid", amount: 1 });
add(paymentMismatch.status === 409, "支付回调金额一致性校验", `HTTP ${paymentMismatch.status}`);
const sharedCallbackKey = `v8530-cross-provider-key-${Date.now()}`;
const sharedPayment = await send("payment", { event_id: `v8530-payment-shared-${Date.now()}`, order_id: orderId, payment_id: "PAY-SZGS-850901", status: "paid", amount: 276000 }, { idempotencyKey: sharedCallbackKey });
const sharedLogistics = await send("logistics", { event_id: `v8530-logistics-shared-${Date.now()}`, order_id: orderId, tracking_no: "SF202608030001", status: "in_transit", temperature: 4.1 }, { idempotencyKey: sharedCallbackKey });
add(sharedPayment.status === 202 && sharedLogistics.status === 202, "不同机构相同幂等键各自落库", `payment=${sharedPayment.status} logistics=${sharedLogistics.status}`);
let alreadyAccepted = false;
try {
  const trade = await fetch(`${base}/api/v1/trades/${orderId}`, { headers: { Authorization: `Bearer ${process.env.SHUZHI_TEST_TOKEN || "local-demo-token"}` } });
  const data = await trade.json();
  alreadyAccepted = Array.isArray(data?.data?.acceptances) && data.data.acceptances.some((item) => item.result === "accepted");
} catch {}
const invoice = await send("invoice", { event_id: `v8530-invoice-gate-${Date.now()}`, order_id: orderId, invoice_no: "V8530-GATE", status: "issued" });
add(invoice.status === (alreadyAccepted ? 202 : 409), alreadyAccepted ? "验收后发票回调" : "验收前发票回调闸门", `HTTP ${invoice.status}`);
let regulatorySubmissionId = "";
try {
  const response = await fetch(`${base}/api/v1/regulatory/submissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.SHUZHI_TEST_TOKEN || "local-demo-token"}`, "Idempotency-Key": `v8530-regulator-submit-${Date.now()}` },
    body: JSON.stringify({ action: "submit", subject_type: "merchant", subject_id: "m-supplier", authority_code: "AQSIQ-DEMO", data_minimization_version: "2026-01", evidence_refs: ["DEMO-MERCHANT-EVIDENCE"] }),
  });
  const body = await response.json();
  regulatorySubmissionId = String(body?.data?.id || "");
} catch {}
const regulator = await send("regulator", { event_id: `v8530-regulator-${Date.now()}`, provider: "regulator", submission_id: regulatorySubmissionId, subject_type: "merchant", subject_id: "m-supplier", authority_code: "AQSIQ-DEMO", receipt_ref: "REG-DEMO-001", status: "accepted" });
add(regulator.status === 202, "监管留痕回调", `HTTP ${regulator.status}`);

const failures = checks.filter((ok) => !ok).length;
console.log(`\n数智供社 v8530 第三方回调回归：${checks.length - failures} 通过，${failures} 失败`);
process.exitCode = failures ? 1 : 0;
