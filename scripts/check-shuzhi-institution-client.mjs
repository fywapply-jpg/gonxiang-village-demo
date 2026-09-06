#!/usr/bin/env node

import { createHmac } from "node:crypto";
import { createInstitutionAdapterClient, InstitutionAdapterError, PROVIDER_COMMAND_PATHS } from "../institution-adapters/shared/client.mjs";

const checks = [];
const add = (ok, name, detail) => checks.push({ ok, name, detail });
const secret = "institution-outbound-secret-1234567890";
const command = {
  command_id: "CMD-V8533-0001",
  occurred_at: "2026-09-06T08:00:00.000Z",
  callback_url: "https://api.example.cn/api/v1/integrations/payment/webhook",
  order_id: "SZGS-ORDER-001",
};
const party = { merchant_id: "m-test", legal_name: "测试企业", credit_code: "91360000MA8V85331X" };
const commands = {
  ca: { ...command, contract_id: "CA-ORDER-001", contract_digest: "a".repeat(64), party: "buyer", signer_id: "m-test" },
  payment: { ...command, action: "create_escrow", payment_id: "PAY-ORDER-001", payer: party, payee: { ...party, merchant_id: "m-supplier", legal_name: "测试供货企业" }, money: { amount: 100, currency: "CNY" } },
  logistics: { ...command, action: "create", shipment_id: "SHP-ORDER-001", goods: [{ product_id: "p-test", name: "测试商品", quantity: 1, unit: "箱" }], consignor: party, consignee: { ...party, merchant_id: "m-buyer", legal_name: "测试采购企业" } },
  invoice: { ...command, action: "issue", invoice_id: "INV-ORDER-001", seller: party, buyer: { ...party, merchant_id: "m-buyer", legal_name: "测试采购企业" }, money: { amount: 100, currency: "CNY" }, items: [{ name: "测试商品", quantity: 1, unit_price: 100, tax_rate: 0.01 }] },
  regulator: { ...command, action: "submit", submission_id: "REG-ORDER-001", subject_type: "merchant", subject_id: "m-test", authority_code: "TEST-AUTH", data_minimization_version: "2026-01", evidence_refs: ["EVIDENCE-001"] },
};
const paymentRefundCommand = {
  ...command,
  action: "refund",
  payment_id: "PAY-ORDER-001",
  refund_id: "REF-ORDER-001",
  provider_transaction_id: "PROVIDER-PAYMENT-001",
  payer: party,
  payee: { ...party, merchant_id: "m-supplier", legal_name: "测试供货企业" },
  money: { amount: 25, currency: "CNY" },
  reason: "测试退款",
};

try {
  createInstitutionAdapterClient({ provider: "payment", baseUrl: "http://adapter.example.cn", secret });
  add(false, "生产 HTTPS 强制", "错误地接受了 HTTP 地址");
} catch (error) {
  add(error instanceof InstitutionAdapterError && error.code === "INSECURE_BASE_URL", "生产 HTTPS 强制", error.code);
}

try {
  createInstitutionAdapterClient({ provider: "payment", baseUrl: "https://adapter.example.cn", secret: "short" });
  add(false, "独立密钥长度", "错误地接受了弱密钥");
} catch (error) {
  add(error instanceof InstitutionAdapterError && error.code === "WEAK_SECRET", "独立密钥长度", error.code);
}

const observed = [];
const fetchImpl = async (url, init) => {
  observed.push({ url: String(url), init });
  return new Response(JSON.stringify({ code: 0, message: "accepted", request_id: "REQ-1", data: { instruction_id: "INS-1", status: "accepted" } }), { status: 202, headers: { "content-type": "application/json" } });
};

for (const provider of Object.keys(PROVIDER_COMMAND_PATHS)) {
  const client = createInstitutionAdapterClient({ provider, baseUrl: "https://adapter.example.cn/root/", secret, fetchImpl });
  const result = await client.send(commands[provider], { idempotencyKey: `idem-${provider}-1234567890` });
  add(result.instruction_id === "INS-1" && observed.at(-1).url === `https://adapter.example.cn${PROVIDER_COMMAND_PATHS[provider]}`, `${provider} 路径固定`, observed.at(-1).url);
}

try {
  const client = createInstitutionAdapterClient({ provider: "payment", baseUrl: "https://adapter.example.cn", secret, fetchImpl });
  const result = await client.send(paymentRefundCommand, { idempotencyKey: "idem-payment-refund-123456" });
  add(result.instruction_id === "INS-1", "支付退款 DTO 主体字段", "退款指令包含付款方、收款方和退款金额，可被 worker 出站校验");
} catch (error) {
  add(false, "支付退款 DTO 主体字段", error instanceof Error ? error.message : String(error));
}

const last = observed.at(-1);
const expectedSignature = createHmac("sha256", secret).update(`${last.init.headers["X-Platform-Timestamp"]}.${last.init.body}`).digest("hex");
add(last.init.headers["X-Platform-Signature"] === expectedSignature && last.init.headers["X-Platform-Command-Id"] === command.command_id, "原始请求体签名", "timestamp.raw_body HMAC-SHA256 一致");
add(last.init.redirect === "error" && last.init.method === "POST" && last.init.headers["Idempotency-Key"].length >= 16, "重定向与幂等控制", "redirect=error 且幂等键已发送");

try {
  const client = createInstitutionAdapterClient({ provider: "payment", baseUrl: "https://adapter.example.cn", secret, fetchImpl });
  await client.send(commands.payment, { idempotencyKey: "short" });
  add(false, "幂等键校验", "错误地接受了短幂等键");
} catch (error) {
  add(error instanceof InstitutionAdapterError && error.code === "INVALID_IDEMPOTENCY_KEY", "幂等键校验", error.code);
}

try {
  const client = createInstitutionAdapterClient({ provider: "payment", baseUrl: "https://adapter.example.cn", secret, fetchImpl });
  await client.send({ ...commands.payment, action: "create" }, { idempotencyKey: "idem-invalid-dto-123456" });
  add(false, "机构 DTO 前置校验", "错误地接受了不在协议范围内的支付动作");
} catch (error) {
  add(error instanceof InstitutionAdapterError && error.code === "INVALID_COMMAND", "机构 DTO 前置校验", "支付动作与五类 DTO 规则在出站前校验");
}

try {
  const client = createInstitutionAdapterClient({ provider: "payment", baseUrl: "https://adapter.example.cn", secret, fetchImpl: async () => new Response("upstream stack and secret", { status: 500 }) });
  await client.send(commands.payment, { idempotencyKey: "idem-reject-1234567890" });
  add(false, "上游错误脱敏", "错误地接受了异常响应");
} catch (error) {
  add(error instanceof InstitutionAdapterError && !error.message.includes(secret) && !error.message.includes("upstream stack"), "上游错误脱敏", error.code);
}

try {
  const client = createInstitutionAdapterClient({
    provider: "payment",
    baseUrl: "https://adapter.example.cn",
    secret,
    fetchImpl: async () => new Response("oversized", { status: 202, headers: { "content-length": String(1024 * 1024 + 1) } }),
  });
  await client.send(commands.payment, { idempotencyKey: "idem-oversized-123456789" });
  add(false, "响应大小限制", "错误地接受了超过 1MB 的响应");
} catch (error) {
  add(error instanceof InstitutionAdapterError && error.code === "ADAPTER_RESPONSE_TOO_LARGE", "响应大小限制", error.code);
}

try {
  const client = createInstitutionAdapterClient({ provider: "payment", baseUrl: "https://adapter.example.cn", secret, fetchImpl: async () => { const error = new Error("aborted"); error.name = "AbortError"; throw error; } });
  await client.send(commands.payment, { idempotencyKey: "idem-timeout-123456789" });
  add(false, "超时隔离", "错误地接受了超时请求");
} catch (error) {
  add(error instanceof InstitutionAdapterError && error.code === "ADAPTER_TIMEOUT", "超时隔离", error.code);
}

for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.name}  ${item.detail}`);
const failures = checks.filter((item) => !item.ok).length;
console.log(`\n数智供社 v8533 机构出站客户端检查：${checks.length - failures} 通过，${failures} 失败`);
process.exitCode = failures ? 1 : 0;
