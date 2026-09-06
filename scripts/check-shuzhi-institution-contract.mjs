#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const file = resolve(root, "docs/openapi/数智供社-v8533-机构适配协议-v1.openapi.json");
const contract = JSON.parse(readFileSync(file, "utf8"));
const checks = [];
const add = (ok, name, detail) => checks.push({ ok, name, detail });
const paths = contract.paths || {};
const outboundPaths = [
  "/adapter/v1/ca/signature-requests",
  "/adapter/v1/payments/escrow-orders",
  "/adapter/v1/logistics/shipments",
  "/adapter/v1/invoices/issuance-requests",
  "/adapter/v1/regulatory/submissions",
];

add(contract.openapi === "3.1.0" && contract.info?.version === "1.0.0", "契约版本", "OpenAPI 3.1.0 / adapter contract 1.0.0");
add(outboundPaths.every((path) => paths[path]?.post), "五类出站命令", "CA、支付、物流、发票、监管命令均有独立端点");
add(outboundPaths.every((path) => paths[path].post.parameters?.some((parameter) => parameter.$ref === "#/components/parameters/IdempotencyKey")), "出站命令幂等", "所有写命令强制 Idempotency-Key");
add(outboundPaths.every((path) => paths[path].post.responses?.["202"]?.$ref === "#/components/responses/CommandAccepted"), "异步受理边界", "202 只表示机构受理，不冒充业务完成");
add(Boolean(paths["/api/v1/integrations/{provider}/webhook"]?.post), "统一回调入口", "五类机构按 provider 进入统一回调契约");
const callback = paths["/api/v1/integrations/{provider}/webhook"]?.post || {};
const providers = callback.parameters?.find((parameter) => parameter.name === "provider")?.schema?.enum || [];
add(["ca", "payment", "logistics", "invoice", "regulator"].every((provider) => providers.includes(provider)), "机构枚举闭包", providers.join(", "));
const schemes = contract.components?.securitySchemes || {};
add(["AdapterTimestamp", "AdapterSignature", "AdapterCommandId", "WebhookTimestamp", "WebhookSignature", "WebhookEventId"].every((key) => schemes[key]), "双向签名头", "平台出站与机构回调分别使用时间戳、签名和事件/命令号");
const schemas = contract.components?.schemas || {};
add(["CaSignatureCommand", "EscrowPaymentCommand", "LogisticsCommand", "InvoiceCommand", "RegulatoryCommand", "CaCallback", "PaymentCallback", "LogisticsCallback", "InvoiceCallback", "RegulatoryCallback"].every((key) => schemas[key]), "命令与事件 DTO 分离", "五类 Command 和五类 Callback 独立定义");
const source = readFileSync(resolve(root, "local-backend/server.mjs"), "utf8");
add(source.includes("HMAC-SHA256(timestamp.raw_body)") && source.includes("x-webhook-timestamp") && source.includes("x-webhook-signature") && source.includes("Idempotency-Key"), "现有入站安全兼容", "v8530 回调验签、时间窗与幂等头和契约一致");

for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.name}  ${item.detail}`);
const failures = checks.filter((item) => !item.ok).length;
console.log(`\n数智供社 v8533 机构适配协议检查：${checks.length - failures} 通过，${failures} 失败`);
process.exitCode = failures ? 1 : 0;
