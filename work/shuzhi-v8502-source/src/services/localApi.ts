/** 数智供社本地 BFF：H5 通过 Vite 代理访问，微信端可用 VITE_API_BASE 指向局域网地址。 */
const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");
const BUILD_API_TOKEN = import.meta.env.VITE_API_TOKEN || "";
// 只要目标是 HTTPS API，就按正式边界处理；这样开发服务器联调真实 API 时也不会
// 因为 MODE=development 回退发送 local-demo-token。
const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production" || API_BASE.startsWith("https://");
const getApiToken = () => String(uni.getStorageSync("shuzhi-session-token") || BUILD_API_TOKEN || (productionBuild ? "" : "local-demo-token"));
const authHeader = () => {
  const token = getApiToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
export const setSessionToken = (token: string) => uni.setStorageSync("shuzhi-session-token", token);
export const clearSessionToken = () => uni.removeStorageSync("shuzhi-session-token");
const newIdempotencyKey = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/** 正式微信登录：服务端用 code 换取微信身份并绑定已审核企业主体，不在前端保存 appsecret。 */
export function loginWithWechat(code: string) {
  return requestJson<{ token: string; expires_at: string; user: { id: string; name: string; role: string; merchant_ids: string[] } }>("/api/v1/auth/wechat/session", { method: "POST", auth: false, data: { code } });
}

/** 撤销当前短时会话；本地演示令牌没有服务端会话时也安全返回。 */
export function logoutSession() {
  return requestJson<{ logged_out: boolean }>("/api/v1/auth/logout", { method: "POST" });
}

export function advanceLocalTrade(orderId: string) {
  return requestJson<void>(`/api/v1/trades/${encodeURIComponent(orderId)}/advance`, { method: "POST", data: {} }).then(() => undefined);
}

export function resetLocalTrade(orderId: string) {
  return requestJson<void>(`/api/v1/trades/${encodeURIComponent(orderId)}/reset`, { method: "POST", data: {} }).then(() => undefined);
}

export function getLocalHealth() {
  return new Promise<{ status: string; version: string; platform_version?: string; api_version?: string; runtime_mode?: string }>((resolve, reject) => {
    uni.request({ url: `${API_BASE}/health`, success: (res) => { const p = res.data as any; p?.data ? resolve(p.data) : reject(new Error("健康检查失败")); }, fail: reject });
  });
}

export function getTradeConfig() {
  return new Promise<any>((resolve, reject) => {
    uni.request({ url: `${API_BASE}/api/v1/trade-config`, success: (res) => { const p = res.data as any; p?.data ? resolve(p.data) : reject(new Error("交易配置读取失败")); }, fail: reject });
  });
}

export type LocalProduct = {
  id: string;
  merchant_id?: string;
  name: string;
  category: string;
  spec?: string;
  unit?: string;
  price: number;
  stock: number;
  origin?: string;
  quality_status?: string;
  merchant_name?: string;
  media?: Array<{ media_type: string; url: string; sort_no?: number }>;
};

/** 读取后台已审核商品；前台大厅只展示此接口返回的可交易商品。 */
export function getProducts() {
  return new Promise<LocalProduct[]>((resolve, reject) => {
    uni.request({
      url: `${API_BASE}/api/v1/products`,
      success: (res) => {
        const p = res.data as any;
        if (res.statusCode >= 200 && res.statusCode < 300 && p?.code === 0 && Array.isArray(p.data)) resolve(p.data);
        else reject(new Error(p?.message || "商品读取失败"));
      },
      fail: reject,
    });
  });
}

export type LocalDemandQuote = {
  id: string;
  demand_id: string;
  supplier_id: string;
  supplier_name?: string;
  product_id: string;
  product_name?: string;
  qty: number;
  unit_price: number;
  amount: number;
  status: string;
  note?: string | null;
  order_id?: string | null;
};

export type LocalPurchaseDemand = {
  id: string;
  buyer_id: string;
  buyer_name: string;
  title: string;
  category: string;
  qty: number;
  unit: string;
  budget_max?: number | null;
  destination: string;
  destination_lat?: number | null;
  destination_lng?: number | null;
  delivery_window: string;
  status: string;
  quote_count: number;
  quotes?: LocalDemandQuote[];
  my_quotes?: LocalDemandQuote[];
};

/** 采购大厅正式数据源：需求必须绑定已核验采购主体，不能用展示名称冒充身份。 */
export function getPurchaseDemands() {
  return requestJson<LocalPurchaseDemand[]>('/api/v1/purchase-demands');
}

export type CreatePurchaseDemandPayload = {
  buyer_id?: string;
  title: string;
  category: string;
  qty: number;
  unit: string;
  budget_max?: number | null;
  destination: string;
  destination_lat?: number | null;
  destination_lng?: number | null;
  delivery_window: string;
};

/** 发布采购需求：服务端校验采购主体、资质、预算与交付字段，并以幂等键落库。 */
export function createPurchaseDemand(payload: CreatePurchaseDemandPayload) {
  return requestJson<LocalPurchaseDemand>('/api/v1/purchase-demands', {
    method: 'POST',
    idempotencyKey: newIdempotencyKey('purchase-demand'),
    data: payload,
  });
}

export function submitDemandQuote(demandId: string, payload: { product_id: string; qty: number; unit_price: number; note?: string; supplier_id?: string }) {
  return requestJson<LocalDemandQuote>(`/api/v1/purchase-demands/${encodeURIComponent(demandId)}/quotes`, {
    method: 'POST',
    idempotencyKey: newIdempotencyKey('demand-quote'),
    data: payload,
  });
}

export function acceptDemandQuote(quoteId: string) {
  return requestJson<LocalDemandQuote>(`/api/v1/purchase-quotes/${encodeURIComponent(quoteId)}/accept`, {
    method: 'POST',
    idempotencyKey: newIdempotencyKey('quote-accept'),
    data: {},
  });
}

/** 读取后台交易聚合，供前台详情/演示工作台核对四流状态。 */
export function getTrade(orderId: string) {
  return new Promise<any>((resolve, reject) => {
    uni.request({
      url: `${API_BASE}/api/v1/trades/${encodeURIComponent(orderId)}`,
      header: authHeader(),
      success: (res) => {
        const p = res.data as any;
        if (res.statusCode >= 200 && res.statusCode < 300 && p?.code === 0) resolve(p.data);
        else reject(new Error(p?.message || "交易读取失败"));
      },
      fail: reject,
    });
  });
}

/** 仅在合同、托管和履约尚未启动时取消订单；后台会原子释放库存并留痕。 */
export function cancelTrade(orderId: string, reason = "交易双方取消订单") {
  return requestJson<any>(`/api/v1/trades/${encodeURIComponent(orderId)}/cancel`, {
    method: "POST",
    idempotencyKey: newIdempotencyKey("cancel-trade"),
    data: { reason },
  });
}

export function getTrades() {
  return new Promise<any[]>((resolve, reject) => {
    uni.request({
      url: `${API_BASE}/api/v1/trades`,
      header: authHeader(),
      success: (res) => {
        const p = res.data as any;
        if (res.statusCode >= 200 && res.statusCode < 300 && p?.code === 0 && Array.isArray(p.data)) resolve(p.data);
        else reject(new Error(p?.message || "交易列表读取失败"));
      },
      fail: reject,
    });
  });
}

export type CreateTradeOrderPayload = {
  scene?: "buyerSupply" | "supplierDemand";
  buyer_id?: string;
  supplier_id?: string;
  quote_id?: string;
  items: Array<{ product_id: string; qty: number }>;
  service_amount?: number;
  delivery_address?: string;
  delivery_lat?: number;
  delivery_lng?: number;
  delivery_window?: string;
  settlement_model?: string;
  invoice_type?: string;
};

/** 按大厅已选商品创建正式订单草稿；金额、主体、库存由后台重新核算。 */
export function createTradeOrder(payload: CreateTradeOrderPayload) {
  return requestJson<any>("/api/v1/trades", {
    method: "POST",
    idempotencyKey: newIdempotencyKey("trade-create"),
    data: payload,
  });
}

export function getTradeLedger(orderId: string) {
  return new Promise<any>((resolve, reject) => {
    uni.request({
      url: `${API_BASE}/api/v1/trades/${encodeURIComponent(orderId)}/ledger`,
      header: authHeader(),
      success: (res) => {
        const p = res.data as any;
        if (res.statusCode >= 200 && res.statusCode < 300 && p?.code === 0) resolve(p.data);
        else reject(new Error(p?.message || "交易台账读取失败"));
      },
      fail: reject,
    });
  });
}

export function getMerchantServiceArea(merchantId: string) {
  return new Promise<any>((resolve, reject) => {
    uni.request({ url: `${API_BASE}/api/v1/merchants/${encodeURIComponent(merchantId)}/service-area`, header: authHeader(), success: (res) => { const p = res.data as any; p?.data ? resolve(p.data) : reject(new Error("服务区域读取失败")); }, fail: reject });
  });
}

export type MerchantApplicationPayload = {
  entity_type: string;
  business_role?: "supplier" | "buyer" | "agri" | "station";
  name: string;
  credit_code: string;
  legal_name: string;
  legal_id_masked?: string;
  address?: string;
  scope?: string;
  capital?: string;
  documents?: string[];
};

export function submitMerchantApplication(payload: MerchantApplicationPayload) {
  return new Promise<{ id: string; status: string }>((resolve, reject) => {
    uni.request({
      url: `${API_BASE}/api/v1/merchant-applications`,
      method: "POST",
      header: { "Content-Type": "application/json", ...authHeader(), "Idempotency-Key": newIdempotencyKey("merchant-application") },
      data: payload,
      success: (res) => {
        const p = res.data as any;
        if (res.statusCode >= 200 && res.statusCode < 300 && p?.code === 0) resolve(p.data);
        else reject(new Error(p?.message || "入驻申请提交失败"));
      },
      fail: reject,
    });
  });
}

export function submitProduct(payload: { merchant_id?: string; name: string; category: string; price: number; stock: number; spec?: string; origin?: string; media?: { media_type: string; url: string }[] }) {
  return new Promise<{ id: string; status: string }>((resolve, reject) => {
    uni.request({
      url: `${API_BASE}/api/v1/products`, method: "POST",
      header: { "Content-Type": "application/json", ...authHeader(), "Idempotency-Key": newIdempotencyKey("product-submit") }, data: payload,
      success: (res) => { const p = res.data as any; if (res.statusCode >= 200 && res.statusCode < 300 && p?.code === 0) resolve(p.data); else reject(new Error(p?.message || "商品提交失败")); },
      fail: reject,
    });
  });
}

export type OperationModule = {
  key: string;
  domain: "production" | "circulation" | "credit" | "livelihood";
  name: string;
  steps: string[];
  current_step: number;
  status: "ready" | "running" | "completed";
  updated_at?: string | null;
  events: Array<{ id: number; step: number; title: string; evidence: string; actor: string; result: string; created_at: string }>;
};

function requestJson<T>(url: string, init: { method?: "GET" | "POST"; data?: any; auth?: boolean; idempotencyKey?: string } = {}) {
  return new Promise<T>((resolve, reject) => {
    const method = init.method || "GET";
    const key = method === "POST" ? (init.idempotencyKey || newIdempotencyKey("front")) : "";
    uni.request({
      url: `${API_BASE}${url}`,
      method,
      header: { "Content-Type": "application/json", ...(init.auth === false ? {} : authHeader()), ...(key ? { "Idempotency-Key": key } : {}) },
      data: init.data,
      success: (res) => {
        const payload = res.data as any;
        if (res.statusCode >= 200 && res.statusCode < 300 && payload?.code === 0) resolve(payload.data as T);
        else reject(new Error(payload?.message || `本地后台返回 ${res.statusCode}`));
      },
      fail: reject,
    });
  });
}

/** 四大业务域统一工作流：生产、流通、信用、民生。前台进度来自后台，不使用本地独立副本。 */
export function getOperationCatalog() {
  return requestJson<{ version: string; domains: Array<{ domain: string; modules: OperationModule[]; completed: number }>; modules: OperationModule[] }>("/api/v1/operations/catalog");
}

export function advanceOperation(moduleKey: string, actor = "前台经办人") {
  return requestJson<OperationModule>(`/api/v1/operations/${encodeURIComponent(moduleKey)}/advance`, { method: "POST", data: { actor } });
}

export function resetOperation(moduleKey: string) {
  return requestJson<OperationModule>(`/api/v1/operations/${encodeURIComponent(moduleKey)}/reset`, { method: "POST" });
}

export type PlatformFeature = {
  domain: "production" | "circulation" | "credit" | "livelihood";
  key: string;
  name: string;
  scope: string;
  event_count: number;
  last_event_at?: string | null;
};

/** 平台级动作统一落后台，供所有前台页面使用；失败时页面可继续离线演示。 */
export function getPlatformFeatures() {
  return requestJson<{ version: string; domains: Array<{ domain: string; features: PlatformFeature[] }>; features: PlatformFeature[] }>("/api/v1/platform/features");
}

export function recordPlatformEvent(featureKey: string, action: string, payload: Record<string, unknown> = {}, actor = "前台经办人") {
  const idempotencyKey = String(payload.idempotency_key || newIdempotencyKey(`event-${featureKey}`));
  return requestJson<{ id: number; feature_key: string; action: string; status: string }>("/api/v1/platform/events", { method: "POST", idempotencyKey, data: { feature_key: featureKey, action, actor, payload: { ...payload, idempotency_key: idempotencyKey }, idempotency_key: idempotencyKey } });
}

export type AdminContext = { role_key: string; role: { key: string; name: string; short: string; org: string; desc: string }; permissions: Record<string, "full" | "read" | "none">; modules: Array<{ module: string; permission: string }> };
export function getAdminContext(role = "super") {
  return requestJson<AdminContext>(`/api/v1/admin/context?role=${encodeURIComponent(role)}`);
}
export function switchAdminRole(roleKey: string) {
  return requestJson<AdminContext>("/api/v1/admin/context/role", { method: "POST", data: { role_key: roleKey } });
}

export function signTradeContract(orderId: string, party: "buyer" | "supplier", certificateRef?: string) {
  return requestJson<any>(`/api/v1/trades/${encodeURIComponent(orderId)}/contract/sign`, {
    method: "POST",
    idempotencyKey: newIdempotencyKey(`contract-${party}`),
    data: { party, certificate_ref: certificateRef || `LOCAL-CA-${party.toUpperCase()}` },
  });
}

export function acceptTrade(orderId: string, evidence = "复磅+抽检+签收影像", acceptedQty?: number) {
  return requestJson<any>(`/api/v1/trades/${encodeURIComponent(orderId)}/accept`, {
    method: "POST",
    idempotencyKey: newIdempotencyKey("accept-trade"),
    data: { result: "accepted", receiver: "采购验收岗", evidence, ...(acceptedQty == null ? {} : { accepted_qty: acceptedQty }) },
  });
}

export function issueTradeInvoice(orderId: string, invoiceNo: string, amount?: number) {
  return requestJson<any>(`/api/v1/trades/${encodeURIComponent(orderId)}/invoice`, {
    method: "POST",
    idempotencyKey: newIdempotencyKey("invoice-trade"),
    data: { invoice_no: invoiceNo, ...(amount == null ? {} : { amount }) },
  });
}

export function settleTrade(orderId: string, instructionRef?: string) {
  return requestJson<any>(`/api/v1/trades/${encodeURIComponent(orderId)}/settle`, {
    method: "POST",
    idempotencyKey: newIdempotencyKey("settle-trade"),
    data: { instruction_ref: instructionRef || `SETTLE-${orderId}-${Date.now()}` },
  });
}

/** 生产托管入金：只提交给持牌支付机构，HTTP 202 仅表示机构受理，不代表付款成功。 */
export function createEscrowPayment(orderId: string, payerCreditCode?: string, payeeCreditCode?: string) {
  return requestJson<any>(`/api/v1/trades/${encodeURIComponent(orderId)}/pay`, {
    method: "POST",
    idempotencyKey: newIdempotencyKey("payment-create"),
    data: {
      ...(payerCreditCode ? { payer_credit_code: payerCreditCode } : {}),
      ...(payeeCreditCode ? { payee_credit_code: payeeCreditCode } : {}),
    },
  });
}
