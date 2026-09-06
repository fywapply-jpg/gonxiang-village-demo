#!/usr/bin/env node
import { createHmac } from "node:crypto";
const base = String(process.env.SHUZHI_TEST_BASE || "http://127.0.0.1:8787").replace(/\/$/, "");
const buyerToken = process.env.SHUZHI_TEST_BUYER_TOKEN || "local-demo-token";
const supplierToken = process.env.SHUZHI_TEST_SUPPLIER_TOKEN || "local-demo-token";
const financeToken = process.env.SHUZHI_TEST_FINANCE_TOKEN || "local-demo-token";
const orderId = process.env.SHUZHI_TEST_ORDER || "SZGS-2026-850901";
const checks = [];
const add = (ok, name, detail) => { checks.push(ok); console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`); };
async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...(options.role ? { "X-Admin-Role": options.role } : {}), ...(options.key ? { "Idempotency-Key": options.key } : {}) };
  const response = await fetch(`${base}${path}`, { method: options.method || "GET", headers, body: options.body ? JSON.stringify(options.body) : undefined });
  let payload = {}; try { payload = await response.json(); } catch {}
  return { status: response.status, payload };
}
async function webhook(provider, payload) {
  const normalizedPayload = { provider, ...payload };
  const raw = JSON.stringify(normalizedPayload);
  const timestamp = Math.floor(Date.now() / 1000);
  const eventId = normalizedPayload.event_id;
  const secret = process.env[`${provider.toUpperCase()}_WEBHOOK_SECRET`] || `local-demo-${provider}-secret`;
  const signature = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");
  const response = await fetch(`${base}/api/v1/integrations/${provider}/webhook`, { method: "POST", headers: { "Content-Type": "application/json", "X-Webhook-Timestamp": String(timestamp), "X-Webhook-Signature": signature, "X-Webhook-Id": eventId, "Idempotency-Key": `settlement-${provider}-${eventId}` }, body: raw });
  let payloadBody = {}; try { payloadBody = await response.json(); } catch {}
  return { status: response.status, payload: payloadBody };
}

// 该回归脚本针对本地演示后端；先调用受保护的演示重置接口，保证重复执行
// 不会被上一次验收、开票或结算的派生状态污染。生产模式会拒绝该接口。
const reset = await request(`/api/v1/trades/${orderId}/reset`, { method: "POST", token: buyerToken });
add(reset.status === 200 && reset.payload?.data?.payment_status === "待验收分账", "演示交易状态重置", `HTTP ${reset.status}`);
const tradeSnapshot = await request(`/api/v1/trades/${orderId}`, { token: buyerToken });
const goodsNet = (tradeSnapshot.payload?.data?.items || []).reduce((sum, item) => sum + Number(item.subtotal || 0), 0);
const expectedPlatformFee = Math.round(goodsNet * 0.04 * 100) / 100;
add(tradeSnapshot.status === 200 && goodsNet > 0, "平台费商品明细基数", `商品净额 ¥${goodsNet.toFixed(2)}`);

const invalidSign = await request(`/api/v1/trades/${orderId}/contract/sign`, { method: "POST", token: buyerToken, key: "v8530-invalid-contract", body: { party: "broker" } });
add(invalidSign.status === 400, "合同签署方校验", `HTTP ${invalidSign.status}`);
const preSettle = await request(`/api/v1/trades/${orderId}/settle`, { method: "POST", token: financeToken, role: "finance", key: "v8530-pre-settle", body: { instruction_ref: "PRE-V8530" } });
add(preSettle.status === 409, "未满足条件禁止结算", `HTTP ${preSettle.status}`);
const accept = await request(`/api/v1/trades/${orderId}/accept`, { method: "POST", token: buyerToken, key: "v8530-accept", body: { result: "accepted", receiver: "采购验收岗", accepted_qty: 4288, evidence: "复磅+抽检+签收影像" } });
add(accept.status === 201, "采购验收落账", `HTTP ${accept.status}`);
const invoiceMismatch = await request(`/api/v1/trades/${orderId}/invoice`, { method: "POST", token: supplierToken, key: "v8530-invoice-mismatch", body: { invoice_no: "V8530-INV-BAD", amount: 1 } });
add(invoiceMismatch.status === 409, "发票金额不一致拦截", `HTTP ${invoiceMismatch.status}`);
const invoice = await request(`/api/v1/trades/${orderId}/invoice`, { method: "POST", token: supplierToken, key: "v8530-invoice", body: { invoice_no: "V8530-INV-0001" } });
add(invoice.status === 200, "供货方开票落账", `HTTP ${invoice.status}`);
const settled = await request(`/api/v1/trades/${orderId}/settle`, { method: "POST", token: financeToken, role: "finance", key: "v8530-settle", body: { instruction_ref: "SETTLE-V8530-0001" } });
add(settled.status === 201 && settled.payload?.data?.settlement?.status === "settled", "财务结算与四流关账", `HTTP ${settled.status}`);
add(settled.payload?.data?.settlement?.platform_fee_base === Math.round(goodsNet * 100) / 100 && settled.payload?.data?.settlement?.platform_fee === expectedPlatformFee, "平台费按商品净额计收", `基数=¥${settled.payload?.data?.settlement?.platform_fee_base} 费额=¥${settled.payload?.data?.settlement?.platform_fee}`);
add(settled.payload?.data?.settlement?.platform_fee_collection_status === "pending_collection" && settled.payload?.data?.platform_fee_collection?.recognized_as_revenue === false, "平台费应收与已收分离", "未具备独立服务合同、发票及收款回执前，只记录 pending_collection，不把核算值视为平台收入");
const replay = await request(`/api/v1/trades/${orderId}/settle`, { method: "POST", token: financeToken, role: "finance", key: "v8530-settle", body: { instruction_ref: "SETTLE-V8530-0001" } });
add(replay.status === 201 && replay.payload?.data?.settlement?.status === "settled", "结算请求幂等重放", `HTTP ${replay.status}`);
const duplicate = await request(`/api/v1/trades/${orderId}/settle`, { method: "POST", token: financeToken, role: "finance", key: "v8530-settle-duplicate", body: { instruction_ref: "SETTLE-V8530-0002" } });
add(duplicate.status === 409, "不同幂等键重复结算拦截", `HTTP ${duplicate.status}`);
const postSettlementPayment = await webhook("payment", { event_id: `v8530-payment-after-settle-${Date.now()}`, order_id: orderId, payment_id: "PAY-SZGS-850901", status: "paid", amount: 276000 });
add(postSettlementPayment.status === 409, "已结算交易拒绝支付回调覆盖", `HTTP ${postSettlementPayment.status}`);

const failures = checks.filter((ok) => !ok).length;
console.log(`\n数智供社 v8530 合同—验收—发票—结算回归：${checks.length - failures} 通过，${failures} 失败`);
process.exitCode = failures ? 1 : 0;
