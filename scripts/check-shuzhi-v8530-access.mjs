#!/usr/bin/env node
const base = String(process.env.SHUZHI_TEST_BASE || "http://127.0.0.1:8787").replace(/\/$/, "");
const token = process.env.SHUZHI_TEST_TOKEN || "local-demo-token";
const production = process.env.SHUZHI_TEST_PRODUCTION === "true";
const checks = [];
async function request(path, options = {}) {
  const accessToken = options.token === undefined ? token : options.token;
  const response = await fetch(`${base}${path}`, { method: options.method || "GET", headers: { ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...(options.headers || {}), ...(options.body ? { "Content-Type": "application/json" } : {}) }, body: options.body ? JSON.stringify(options.body) : undefined });
  let payload = {}; try { payload = await response.json(); } catch {}
  return { status: response.status, payload };
}
const add = (ok, name, detail) => { checks.push({ ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`); };
for (const path of ["/health", "/api/v1/trade-config", "/api/v1/products"]) add((await request(path, { token: "" })).status === 200, `公开接口 ${path}`, `HTTP ${(await request(path, { token: "" })).status}`);
const tradeConfigResponse = await request("/api/v1/trade-config", { token: "" });
const allocationPolicy = tradeConfigResponse.payload?.data?.allocation_policy;
add(tradeConfigResponse.status === 200 && allocationPolicy?.ordinary_b2b?.enabled === false && allocationPolicy?.validation?.require_sum_100 === true && allocationPolicy?.promotion_service_fee?.platform_percent + allocationPolicy?.promotion_service_fee?.organization_percent === 100, "收益分配口径统一", "普通 B2B 不自动分配；推广服务费示例 40/60 且合同凭证门禁要求合计 100%");
const capabilities = await request("/api/v1/platform/capabilities", { token: "" });
const capabilityVersion = capabilities.payload?.data?.version || capabilities.payload?.data?.platform_version;
add(capabilities.status === 200 && capabilityVersion === "v8533", "后台版本能力清单", capabilities.status === 200 ? (capabilityVersion || "缺少平台版本") : `HTTP ${capabilities.status}`);
const anonymousAdmin = await request("/api/v1/admin/integrations", { token: "", headers: { "X-Admin-Role": "super" } });
add(anonymousAdmin.status === 401, "后台匿名与伪造角色拦截", `HTTP ${anonymousAdmin.status}`);
const institutionOutbox = await request("/api/v1/admin/institution-outbox", { headers: { "X-Admin-Role": "super" } });
add(institutionOutbox.status === 200 && institutionOutbox.payload?.data?.overview && Array.isArray(institutionOutbox.payload?.data?.commands), "机构指令后台可观测", `HTTP ${institutionOutbox.status}`);
for (const path of ["/api/v1/trades", "/api/v1/trades/SZGS-2026-850901", "/api/v1/trades/SZGS-2026-850901/ledger"]) { const anon = await request(path, { token: "" }); const auth = await request(path); add(anon.status === 401, `匿名拦截 ${path}`, `HTTP ${anon.status}`); add(auth.status === 200, `授权访问 ${path}`, `HTTP ${auth.status}`); }
const malformed = await request("/api/v1/platform/events", { method: "POST", body: "not-json", headers: { "Content-Type": "application/json", "Idempotency-Key": "bad-json-v8530" } });
add(malformed.status === 400, "非法 JSON 隔离", `HTTP ${malformed.status}`);
const oversized = await fetch(`${base}/api/v1/platform/events`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Idempotency-Key": "oversized-v8530" }, body: JSON.stringify({ feature_key: "trade", action: "oversized", payload: { value: "x".repeat(2 * 1024 * 1024) } }) });
add(oversized.status === 413, "超大请求拦截", `HTTP ${oversized.status}`);
const collisionKey = `payload-collision-${Date.now()}`;
const collisionFirst = await request("/api/v1/platform/events", { method: "POST", headers: { "Idempotency-Key": collisionKey }, body: { feature_key: "trade", action: "first", payload: { amount: 100 } } });
const collisionSecond = await request("/api/v1/platform/events", { method: "POST", headers: { "Idempotency-Key": collisionKey }, body: { feature_key: "trade", action: "changed", payload: { amount: 999 } } });
add(collisionFirst.status === 201 && collisionSecond.status === 409, "幂等键绑定请求内容", `首次=${collisionFirst.status} 变更内容=${collisionSecond.status}`);
const invalidProduct = await request("/api/v1/products", { method: "POST", body: { merchant_id: "m-supplier", name: "非法测试商品", category: "水果", price: -1, stock: 0 } });
add(invalidProduct.status === 400, "商品金额与库存校验", `HTTP ${invalidProduct.status}`);
const invalidMediaName = `媒体事务回滚-${Date.now()}`;
const invalidMedia = await request("/api/v1/products", { method: "POST", body: { merchant_id: "m-supplier", name: invalidMediaName, category: "水果", price: 10, stock: 10, media: [{ media_type: "image", url: "" }] } });
const adminProducts = await request("/api/v1/admin/products", { headers: { "X-Admin-Role": "super" } });
const leakedInvalidProduct = Array.isArray(adminProducts.payload?.data) && adminProducts.payload.data.some((item) => item.name === invalidMediaName);
add(invalidMedia.status === 400 && !leakedInvalidProduct, "商品媒体事务回滚", `提交=${invalidMedia.status} 孤立商品=${leakedInvalidProduct ? "是" : "否"}`);
const invalidArea = await request("/api/v1/merchants/m-supplier/service-area", { method: "POST", body: { center_lat: 24.9, center_lng: 115.6, radius_km: 0, max_daily_orders: -1 } });
add(invalidArea.status === 400, "服务半径与日单量校验", `HTTP ${invalidArea.status}`);
if (!production) {
  const creditCode = `M${Date.now().toString(36).toUpperCase().padEnd(17, "X").slice(0, 17)}`;
  const application = await request("/api/v1/merchant-applications", { method: "POST", token: "", body: { entity_type: "corp", business_role: "buyer", name: "角色映射回归企业", credit_code: creditCode, legal_name: "测试法人" } });
  add(application.status === 201 && application.payload?.data?.business_role === "buyer", "入驻申请记录经营角色", `HTTP ${application.status}`);
  const applicationId = application.payload?.data?.id;
  const opsReview = await request(`/api/v1/admin/merchant-applications/${applicationId}/review`, { method: "POST", headers: { "X-Admin-Role": "ops", "Idempotency-Key": `review-ops-block-${creditCode}` }, body: { decision: "approve", note: "运营岗不得代替审核岗" } });
  add(opsReview.status === 403, "运营岗不得直接准入审核", `HTTP ${opsReview.status}`);
  const review = await request(`/api/v1/admin/merchant-applications/${applicationId}/review`, { method: "POST", headers: { "X-Admin-Role": "super", "Idempotency-Key": `review-role-${creditCode}` }, body: { decision: "approve", note: "角色映射回归" } });
  add(review.status === 200 && review.payload?.data?.business_role === "buyer", "审核按申请角色建档", `HTTP ${review.status}`);
  const reviewReplay = await request(`/api/v1/admin/merchant-applications/${applicationId}/review`, { method: "POST", headers: { "X-Admin-Role": "super", "Idempotency-Key": `review-role-${creditCode}` }, body: { decision: "approve", note: "角色映射回归" } });
  add(reviewReplay.status === 200 && reviewReplay.payload?.data?.business_role === "buyer", "审核请求幂等重放", `HTTP ${reviewReplay.status}`);
  const reviewConflict = await request(`/api/v1/admin/merchant-applications/${applicationId}/review`, { method: "POST", headers: { "X-Admin-Role": "super", "Idempotency-Key": `review-conflict-${creditCode}` }, body: { decision: "reject", note: "不应覆盖已完成审核" } });
  add(reviewConflict.status === 409, "已完成审核不可覆盖", `HTTP ${reviewConflict.status}`);
  const applicationDetail = await request(`/api/v1/merchant-applications/${applicationId}`);
  add(applicationDetail.status === 200 && applicationDetail.payload?.data?.reviewer && applicationDetail.payload.data.reviewer !== "local-admin", "审核主体写入审计", applicationDetail.payload?.data?.reviewer || "未记录审核主体");
  const merchants = await request("/api/v1/admin/merchants", { headers: { "X-Admin-Role": "super" } });
  const merchant = Array.isArray(merchants.payload?.data) ? merchants.payload.data.find((item) => item.name === "角色映射回归企业") : null;
  add(merchant?.role === "buyer", "后台商户角色与申请一致", merchant?.role || "未找到");
  const reviewedMerchantId = `m-${String(applicationId).toLowerCase()}`;
  const verificationPending = await request(`/api/v1/admin/merchants/${reviewedMerchantId}/verification`, { method: "POST", headers: { "X-Admin-Role": "super", "Idempotency-Key": `verify-block-${creditCode}` }, body: { license_status: "rejected", bank_status: "pending", provider: "主体核验回归机构", evidence_ref: `EVID-${creditCode}` } });
  const activationBlocked = await request(`/api/v1/admin/merchant-applications/${applicationId}/activate`, { method: "POST", headers: { "X-Admin-Role": "ops", "Idempotency-Key": `activate-block-${creditCode}` }, body: { note: "核验未完成不得启用" } });
  const verificationPassed = await request(`/api/v1/admin/merchants/${reviewedMerchantId}/verification`, { method: "POST", headers: { "X-Admin-Role": "super", "Idempotency-Key": `verify-pass-${creditCode}` }, body: { license_status: "verified", bank_status: "verified", provider: "主体核验回归机构", evidence_ref: `EVID-${creditCode}` } });
  const activationPassed = await request(`/api/v1/admin/merchant-applications/${applicationId}/activate`, { method: "POST", headers: { "X-Admin-Role": "ops", "Idempotency-Key": `activate-pass-${creditCode}` }, body: { note: "核验完成后启用" } });
  add(verificationPending.status === 200 && activationBlocked.status === 409 && verificationPassed.status === 200 && activationPassed.status === 200, "商户核验后启用闸门", `核验退回=${verificationPending.status} 未核验启用=${activationBlocked.status} 核验通过=${verificationPassed.status} 启用=${activationPassed.status}`);
  const operationKey = `operation-idem-${creditCode}`;
  // 本地回归可能复用同一份演示库；先把该模块恢复到 ready，避免历史演示状态把幂等检查误报为 409。
  const operationReset = await request("/api/v1/operations/alliance/reset", { method: "POST", headers: { "Idempotency-Key": `operation-reset-${creditCode}` }, body: { actor: "回归测试" } });
  add(operationReset.status === 200, "运营工作流回归前置复位", `HTTP ${operationReset.status}`);
  const operationFirst = await request("/api/v1/operations/alliance/advance", { method: "POST", headers: { "Idempotency-Key": operationKey }, body: { evidence: `OP-${creditCode}` } });
  const operationReplay = await request("/api/v1/operations/alliance/advance", { method: "POST", headers: { "Idempotency-Key": operationKey }, body: { evidence: `OP-${creditCode}` } });
  add(operationFirst.status === 200 && operationReplay.status === 200 && operationFirst.payload?.data?.current_step === operationReplay.payload?.data?.current_step, "运营工作流请求幂等重放", `首次=${operationFirst.status} 重试=${operationReplay.status}`);
  const areaKey = `area-idem-${creditCode}`;
  const areaFirst = await request("/api/v1/merchants/m-supplier/service-area", { method: "POST", headers: { "Idempotency-Key": areaKey }, body: { center_lat: 24.9, center_lng: 115.6, radius_km: 120, max_daily_orders: 80, regions: ["赣州"], delivery_modes: ["冷链整车"] } });
  const areaReplay = await request("/api/v1/merchants/m-supplier/service-area", { method: "POST", headers: { "Idempotency-Key": areaKey }, body: { center_lat: 24.9, center_lng: 115.6, radius_km: 120, max_daily_orders: 80, regions: ["赣州"], delivery_modes: ["冷链整车"] } });
  add(areaFirst.status === 200 && areaReplay.status === 200 && areaFirst.payload?.data?.radius_km === areaReplay.payload?.data?.radius_km, "服务区域维护请求幂等重放", `首次=${areaFirst.status} 重试=${areaReplay.status}`);
  const productKey = `product-review-${creditCode}`;
  const product = await request("/api/v1/products", { method: "POST", headers: { "Idempotency-Key": productKey }, body: { merchant_id: "m-supplier", name: `审核幂等测试-${creditCode}`, category: "水果", price: 10, stock: 10 } });
  const productId = product.payload?.data?.id;
  const productReview = await request(`/api/v1/admin/products/${productId}/review`, { method: "POST", headers: { "X-Admin-Role": "super", "Idempotency-Key": `product-review-action-${creditCode}` }, body: { decision: "approve", note: "审核幂等回归" } });
  const productReplay = await request(`/api/v1/admin/products/${productId}/review`, { method: "POST", headers: { "X-Admin-Role": "super", "Idempotency-Key": `product-review-action-${creditCode}` }, body: { decision: "approve", note: "审核幂等回归" } });
  add(product.status === 201 && productReview.status === 200 && productReplay.status === 200, "商品审核请求幂等重放", `提交=${product.status} 首次=${productReview.status} 重试=${productReplay.status}`);
  const orderKey = `trade-create-${creditCode}`;
  const createdOrder = await request("/api/v1/trades", { method: "POST", headers: { "Idempotency-Key": orderKey }, body: { scene: "buyerSupply", buyer_id: "m-buyer", supplier_id: "m-supplier", items: [{ product_id: productId, qty: 1 }], service_amount: 2, delivery_window: "测试窗口" } });
  const orderReplay = await request("/api/v1/trades", { method: "POST", headers: { "Idempotency-Key": orderKey }, body: { scene: "buyerSupply", buyer_id: "m-buyer", supplier_id: "m-supplier", items: [{ product_id: productId, qty: 1 }], service_amount: 2, delivery_window: "测试窗口" } });
  add(createdOrder.status === 201 && orderReplay.status === 201 && createdOrder.payload?.data?.id === orderReplay.payload?.data?.id && Number(createdOrder.payload?.data?.amount) === 12, "批量订单创建与幂等重放", `首次=${createdOrder.status} 重试=${orderReplay.status}`);
  const cancelKey = `trade-cancel-${creditCode}`;
  const cancelled = await request(`/api/v1/trades/${createdOrder.payload?.data?.id}/cancel`, { method: "POST", headers: { "Idempotency-Key": cancelKey }, body: { reason: "库存释放回归" } });
  const cancelReplay = await request(`/api/v1/trades/${createdOrder.payload?.data?.id}/cancel`, { method: "POST", headers: { "Idempotency-Key": cancelKey }, body: { reason: "库存释放回归" } });
  add(cancelled.status === 200 && cancelReplay.status === 200 && cancelled.payload?.data?.status === "已取消" && cancelReplay.payload?.data?.status === "已取消" && cancelled.payload?.data?.inventory_reservations?.every((item) => item.status === "released"), "取消订单原子释放库存与幂等重放", `首次=${cancelled.status} 重试=${cancelReplay.status}`);
  const invalidSettlement = await request("/api/v1/trades", { method: "POST", headers: { "Idempotency-Key": `trade-model-${creditCode}` }, body: { scene: "buyerSupply", buyer_id: "m-buyer", supplier_id: "m-supplier", items: [{ product_id: productId, qty: 1 }], settlement_model: "自定义免审结算" } });
  add(invalidSettlement.status === 400, "非标准结算模型拦截", `HTTP ${invalidSettlement.status}`);
}
if (production) {
  const missingKey = await request("/api/v1/platform/events", { method: "POST", body: { feature_key: "trade", action: "missing-key" } });
  add(missingKey.status === 400, "生产缺少幂等键拦截", `HTTP ${missingKey.status}`);
  const first = await request("/api/v1/platform/events", { method: "POST", body: { feature_key: "trade", action: "idempotent-test", idempotency_key: "idempotent-v8530", payload: { source: "regression" } } });
  const second = await request("/api/v1/platform/events", { method: "POST", body: { feature_key: "trade", action: "idempotent-test", idempotency_key: "idempotent-v8530", payload: { source: "regression" } } });
  add(first.status === 201 && second.status === 201 && first.payload?.data?.id === second.payload?.data?.id, "重复写请求安全重放", `首次=${first.status} 重试=${second.status}`);
}
const failures = checks.filter((item) => !item.ok).length;
console.log(`\n数智供社 v8530 异常请求与幂等回归：${checks.length - failures} 通过，${failures} 失败`);
process.exitCode = failures ? 1 : 0;
