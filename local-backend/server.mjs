import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import {
  enqueueInstitutionCommand,
  ensureInstitutionOutboxSchema,
  institutionOutboxOverview,
  InstitutionOutboxError,
  publicInstitutionCommand,
  requeueDeadInstitutionCommand,
} from "../institution-adapters/shared/outbox.mjs";
import { canonicalizeInstitutionCommand } from "../institution-adapters/shared/client.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8787);
const configuredDbPath = resolve(process.env.SHUZHI_DB || resolve(here, "data/shuzhi.db"));
const canonicalPath = (target) => {
  let cursor = target;
  while (!existsSync(cursor)) {
    const parent = dirname(cursor);
    if (parent === cursor) return target;
    cursor = parent;
  }
  return resolve(realpathSync(cursor), relative(cursor, target));
};
const dbPath = canonicalPath(configuredDbPath);
const runtimeMode = process.env.SHUZHI_RUNTIME_MODE || "local-demo";
const productionMode = runtimeMode === "production";
// 平台展示版本与后端 API 发布版本分开维护：前台/交付包当前为 v8533，
// 后端服务的兼容发布线仍为 v8530。健康探针同时返回两者，避免监控或
// 管理端只读一个 version 字段时把平台版本和接口版本混为一谈。
const platformVersion = String(process.env.SHUZHI_PLATFORM_VERSION || "v8533");
const apiReleaseVersion = String(process.env.SHUZHI_RELEASE_VERSION || "v8530");
const healthVersion = productionMode ? apiReleaseVersion : `${apiReleaseVersion}-local`;
// 正式环境只创建表结构和流程配置，不得把演示主体、商品或订单写入真实库。
// 本地演示默认保留种子数据；如需空库演示，可显式设置 SHUZHI_SEED_DEMO_DATA=false。
const seedDemoData = !productionMode && process.env.SHUZHI_SEED_DEMO_DATA !== "false";
const apiToken = process.env.SHUZHI_API_TOKEN || "local-demo-token";
let adminTokenRoles = {};
try { adminTokenRoles = JSON.parse(process.env.SHUZHI_ADMIN_TOKEN_ROLES || "{}"); } catch { throw new Error("SHUZHI_ADMIN_TOKEN_ROLES 必须是 JSON 对象"); }
let userTokenPrincipals = {};
try { userTokenPrincipals = JSON.parse(process.env.SHUZHI_USER_TOKEN_PRINCIPALS || "{}"); } catch { throw new Error("SHUZHI_USER_TOKEN_PRINCIPALS 必须是 JSON 对象"); }
const wechatAuthReady = process.env.SHUZHI_WECHAT_AUTH_READY === "true";
const wechatAppId = String(process.env.WECHAT_APP_ID || "").trim();
const wechatAppSecret = String(process.env.WECHAT_APP_SECRET || "").trim();
const wechatSessionUrl = String(process.env.SHUZHI_WECHAT_SESSION_URL || "https://api.weixin.qq.com/sns/jscode2session").trim();
let wechatOpenidPrincipals = {};
try { wechatOpenidPrincipals = JSON.parse(process.env.SHUZHI_WECHAT_OPENID_PRINCIPALS || "{}"); } catch { throw new Error("SHUZHI_WECHAT_OPENID_PRINCIPALS 必须是 JSON 对象"); }
if (productionMode && apiToken === "local-demo-token") throw new Error("生产模式禁止使用 local-demo-token，请设置 SHUZHI_API_TOKEN");
if (productionMode && dbPath.startsWith(`${resolve(here, "..")}/`)) throw new Error("生产模式数据库路径不得通过符号链接指向仓库目录");
if (productionMode && Object.keys(adminTokenRoles).length === 0) throw new Error("生产模式必须设置 SHUZHI_ADMIN_TOKEN_ROLES，将独立管理员令牌映射到角色");
if (productionMode && !wechatAuthReady && Object.keys(userTokenPrincipals).length === 0) throw new Error("微信身份认证未 ready 时，生产模式必须设置 SHUZHI_USER_TOKEN_PRINCIPALS，将临时用户会话令牌绑定到商户主体");
if (productionMode) {
  if (apiToken.length < 32) throw new Error("SHUZHI_API_TOKEN 至少需要 32 个字符");
  const adminTokens = Object.keys(adminTokenRoles);
  const userTokens = Object.keys(userTokenPrincipals);
  if ([...adminTokens, ...userTokens].some((token) => token.length < 24)) throw new Error("管理员令牌和用户会话令牌至少需要 24 个字符");
  if (adminTokens.includes(apiToken) || userTokens.includes(apiToken) || adminTokens.some((token) => userTokens.includes(token))) throw new Error("内部、管理员和用户令牌不得复用");
  for (const [token, principal] of Object.entries(userTokenPrincipals)) {
    const merchantIds = Array.isArray(principal?.merchant_ids) ? principal.merchant_ids : principal?.merchant_id ? [principal.merchant_id] : [];
    if (!principal?.id || !principal?.name || !principal?.role || merchantIds.length === 0) throw new Error(`用户令牌 ${token.slice(0, 4)}… 必须绑定 id、name、role 和 merchant_id(s)`);
  }
  if (wechatAuthReady && (!wechatAppId || wechatAppId.includes("CHANGE_ME") || !wechatAppSecret || wechatAppSecret.includes("CHANGE_ME") || Object.keys(wechatOpenidPrincipals).length === 0)) throw new Error("微信身份认证已标记 ready，但 WECHAT_APP_ID、WECHAT_APP_SECRET 或 SHUZHI_WECHAT_OPENID_PRINCIPALS 未完整配置");
  try { if (new URL(wechatSessionUrl).protocol !== "https:") throw new Error("not https"); } catch { throw new Error("SHUZHI_WECHAT_SESSION_URL 必须使用 HTTPS"); }
}
const corsOrigin = productionMode ? String(process.env.SHUZHI_ALLOWED_ORIGIN || "") : "*";
const validHttpsRoot = (value) => {
  try {
    const parsed = new URL(String(value || ""));
    return parsed.protocol === "https:" && !parsed.username && !parsed.password && parsed.pathname === "/" && !parsed.search && !parsed.hash;
  } catch { return false; }
};
if (productionMode && !validHttpsRoot(corsOrigin)) throw new Error("生产模式 SHUZHI_ALLOWED_ORIGIN 必须是无凭证、无路径、无查询参数的 HTTPS 根来源");
const maxBodyBytes = Number(process.env.SHUZHI_MAX_BODY_BYTES || 1024 * 1024);
if (!Number.isInteger(maxBodyBytes) || maxBodyBytes < 1024 || maxBodyBytes > 16 * 1024 * 1024) throw new Error("SHUZHI_MAX_BODY_BYTES 必须是 1KB—16MB 的整数");
const integrationPorts = [
  { key: "core-api", name: "平台核心 API", port, protocol: "HTTP/HTTPS", status: "active" },
  { key: "logistics-webhook", name: "第三方物流回调", port: Number(process.env.LOGISTICS_WEBHOOK_PORT || 8790), protocol: "HTTPS", status: "reserved" },
  { key: "payment-webhook", name: "银行/持牌支付回调", port: Number(process.env.PAYMENT_WEBHOOK_PORT || 8791), protocol: "HTTPS + 签名", status: "reserved" },
  { key: "invoice-callback", name: "发票开具/验真回调", port: Number(process.env.INVOICE_CALLBACK_PORT || 8792), protocol: "HTTPS + 签名", status: "reserved" },
  { key: "regulator-sync", name: "监管数据同步", port: Number(process.env.REGULATOR_SYNC_PORT || 8793), protocol: "HTTPS/VPN", status: "reserved" },
];
const webhookReplayWindowSeconds = Number(process.env.SHUZHI_WEBHOOK_REPLAY_WINDOW_SECONDS || 300);
if (!Number.isInteger(webhookReplayWindowSeconds) || webhookReplayWindowSeconds < 30 || webhookReplayWindowSeconds > 900) throw new Error("SHUZHI_WEBHOOK_REPLAY_WINDOW_SECONDS 必须是 30—900 秒的整数");
const integrationSecrets = {
  ca: process.env.CA_WEBHOOK_SECRET || (productionMode ? "" : "local-demo-ca-secret"),
  logistics: process.env.LOGISTICS_WEBHOOK_SECRET || (productionMode ? "" : "local-demo-logistics-secret"),
  payment: process.env.PAYMENT_WEBHOOK_SECRET || (productionMode ? "" : "local-demo-payment-secret"),
  invoice: process.env.INVOICE_WEBHOOK_SECRET || (productionMode ? "" : "local-demo-invoice-secret"),
  regulator: process.env.REGULATOR_WEBHOOK_SECRET || (productionMode ? "" : "local-demo-regulator-secret"),
};
const integrationReadyEnv = {
  ca: "SHUZHI_CA_READY",
  logistics: "SHUZHI_LOGISTICS_READY",
  payment: "SHUZHI_PAYMENT_READY",
  invoice: "SHUZHI_INVOICE_READY",
  regulator: "SHUZHI_REGULATOR_READY",
};
const integrationAdapterUrls = {
  ca: process.env.SHUZHI_CA_ADAPTER_URL || "",
  logistics: process.env.SHUZHI_LOGISTICS_ADAPTER_URL || "",
  payment: process.env.SHUZHI_PAYMENT_ADAPTER_URL || "",
  invoice: process.env.SHUZHI_INVOICE_ADAPTER_URL || "",
  regulator: process.env.SHUZHI_REGULATOR_ADAPTER_URL || "",
};
if (productionMode) {
  for (const [provider, secret] of Object.entries(integrationSecrets)) {
    if (process.env[integrationReadyEnv[provider]] !== "true") continue;
    if (String(secret).length < 32) throw new Error(`已 ready 的 ${provider} 机构必须配置不少于 32 个字符的独立回调密钥`);
    if (!validHttpsRoot(integrationAdapterUrls[provider])) throw new Error(`已 ready 的 ${provider} 机构必须配置无凭证、无路径的 HTTPS 适配器根地址`);
  }
}
const tradeConfig = {
  settlement_models: [
    { key: "advance", name: "预付款 + 尾款", badge: "适合定制/备产" },
    { key: "custody", name: "机构监管结算", badge: "推荐大宗标准单" },
    { key: "cod", name: "货到/验收即付", badge: "适合短链现货" },
    { key: "credit", name: "授信账期", badge: "审批后才能使用" },
  ],
  amount_items: [
    { n: "货物价款", v: "¥275,644", note: "本单验收合格商品净额，计入订单金额" },
    { n: "合同服务费用", v: "¥356", note: "包装、物流、检测等按实际服务逐项列示，计入订单金额" },
    { n: "平台技术服务", v: "¥11,025.76", note: "验收合格商品净额 ¥275,644 × 4%，结算时单独列示，不计入订单金额" },
  ],
  fee_rules: { basis: "验收合格商品净额", platform_rate: 0.04, duplicate_charge_block: true },
  // 收益分配不是所有订单的统一比例。只有合同/章程明确约定、且已完成
  // 服务验收和开票的独立服务费，才允许进入分配台账；普通 B2B 货款、物流费、
  // 检测费和平台技术服务费不得自动套用“全民分红”或推广分成比例。
  allocation_policy: {
    ordinary_b2b: { enabled: false, rule: "不自动分配；按订单合同、验收和持牌结算回单执行" },
    platform_technical_fee: { enabled: false, rule: "平台技术服务费为独立服务费，按验收合格商品净额计费，不进入货款分配" },
    promotion_service_fee: { enabled: true, platform_percent: 40, organization_percent: 60, prerequisite: "独立推广服务合同 + 服务验收 + 发票 + 持牌结算回单", note: "仅适用于该笔已产生的推广服务费，不得与货款、平台技术服务费或增值池重复提取" },
    commonwealth_pool: { enabled: false, rule: "仅限依法表决并写入生效章程/专项合同的税后可分配增值收益；分配比例由项目规则表决后生效，平台不预设全民固定比例" },
    validation: { require_sum_100: true, require_contract_ref: true, require_acceptance_ref: true, require_invoice_ref: true, require_settlement_ref: true },
  },
};
const publicTradeConfig = () => productionMode
  ? {
    ...tradeConfig,
    // 正式环境不向公开配置接口返回本地演示订单金额；真实金额只能来自订单聚合和机构回执。
    amount_items: [],
    amount_source: "后台订单明细与机构回执",
  }
  : tradeConfig;

// 四大业务域的统一工作流规则。页面可以展示更细的运营说明，但能否推进、
// 当前环节和证据留痕必须由后端裁决，避免前台单独修改进度。
const operationWorkflowRules = [
  { key: "agri-qualification", domain: "production", name: "生产资质准入", steps: ["主体实名与分类", "证照 OCR 与监管联查", "许可范围逐项比对", "设备与人员绑定", "风险分级与人工复核", "备案与持续监管"] },
  { key: "machine-merchant", domain: "production", name: "农机具商家管理", steps: ["准入与授权确认", "验真入库建档", "权属库存管控", "销售租赁履约", "人机任务三重匹配", "维保召回退出"] },
  { key: "plant", domain: "production", name: "数字种植", steps: ["资源匹配与立项", "合同与生产计划", "农资与作业管控", "生长监测与预警", "采收检测与验收", "交付结算与复盘"] },
  { key: "livestock", domain: "production", name: "数字养殖", steps: ["设施与存栏建档", "引种入场检疫", "饲喂用药与防疫", "环境与疫病预警", "出栏检疫与屠宰", "冷链交付与结算"] },
  { key: "order-agri", domain: "circulation", name: "订单农业", steps: ["需求归集", "产能匹配", "合同与保供计划", "生产与资金协同", "分批交付验收", "收益分配复盘"] },
  { key: "logistics", domain: "circulation", name: "仓储冷链", steps: ["预约与入库", "波次拣选复核", "运力竞价与派车", "在途监控", "签收与回单", "运费结算"] },
  { key: "quality", domain: "circulation", name: "品质认证与溯源", steps: ["标准模板选择", "采样封样送检", "检测与复核", "合格证与批次码", "流通节点留痕", "召回与责任定位"] },
  { key: "crossborder", domain: "circulation", name: "跨境贸易", steps: ["市场准入匹配", "报价与国际合同", "备货检疫报关", "国际物流与保险", "收汇与结汇", "退税与售后"] },
  { key: "finance", domain: "credit", name: "供应链金融", steps: ["主体与贸易背景核验", "四流一致性审查", "银行竞标授信", "受托支付与用款", "贷后监控", "回款还贷与评价"] },
  { key: "emergency", domain: "livelihood", name: "应急保供", steps: ["事件分级与征召", "货源与替补产能", "价格与质量监管", "运力通行调度", "签收与供应监测", "补贴审核与审计"] },
  { key: "alliance", domain: "livelihood", name: "利益共同体", steps: ["成员与资产入组", "分配规则表决", "项目预算执行", "交易收益归集", "风险准备金处置", "年度分配与公示"] },
];
// 统一功能目录：前台负责交互，后台负责权限、状态和证据。未接入外部机构时仍可用本地适配器演示。
const platformFeatureRules = [
  ["production", "digitalfarm", "数字种植/养殖", "种植项目、养殖项目"],
  ["production", "agri-inputs", "农资与农机", "资质、库存、人机匹配"],
  ["circulation", "trade", "供货/采购大厅", "订单、合同、履约、结算"],
  ["circulation", "logistics", "物流与仓储", "派车、运单、签收、回单"],
  ["circulation", "trace", "质量与溯源", "采样、检测、批次、召回"],
  ["credit", "finance", "支付与供应链金融", "授信、托管、分账、对账"],
  ["credit", "invoice", "发票与四流核对", "开票、验真、归档"],
  ["livelihood", "emergency", "应急保供", "征召、调度、补贴、审计"],
  ["livelihood", "village", "民生终端与共同体", "团购、助餐、公益、分配"],
  ["livelihood", "mine", "我的与账户中心", "身份、订单、钱包、发票、安全、隐私、反馈"],
  ["circulation", "crossborder", "跨境贸易", "准入、报关、收汇、退税"],
].map(([domain, key, name, scope]) => ({ domain, key, name, scope }));
const adminRoleRules = {
  super: { name: "超级管理员", short: "超", org: "供销集团 · 平台运营总部", desc: "平台最高权限，账号与权限分配" },
  ops: { name: "运营管理员", short: "运", org: "运营中心", desc: "商户招商、内容运营、活动公告" },
  audit: { name: "审核员", short: "审", org: "审核中心", desc: "资质、货源、溯源、金融初审" },
  finance: { name: "财务结算", short: "财", org: "财务结算中心", desc: "货款结算、发票、分红、提现" },
  service: { name: "客服专员", short: "客", org: "客服中心", desc: "工单、投诉、售后处理" },
};
if (productionMode) for (const [token, role] of Object.entries(adminTokenRoles)) if (!Object.prototype.hasOwnProperty.call(adminRoleRules, role)) throw new Error(`管理员令牌 ${token.slice(0, 4)}… 对应的角色不存在`);
const adminPermissionMatrix = {
  super:   { merchant: "full", content: "full", audit: "full", finance: "full", risk: "full", service: "full", data: "full", system: "full" },
  ops:     { merchant: "full", content: "full", audit: "read", finance: "none", risk: "none", service: "read", data: "full", system: "read" },
  audit:   { merchant: "read", content: "full", audit: "full", finance: "none", risk: "read", service: "none", data: "read", system: "read" },
  finance: { merchant: "none", content: "none", audit: "read", finance: "full", risk: "read", service: "read", data: "read", system: "read" },
  service: { merchant: "read", content: "read", audit: "none", finance: "read", risk: "none", service: "full", data: "read", system: "read" },
};
const merchantBusinessRoles = {
  supplier: "产地供应商",
  buyer: "采购商",
  agri: "农资采购方",
  station: "基层服务站专员",
};
const adminContext = (roleKey = "super") => {
  const key = Object.prototype.hasOwnProperty.call(adminRoleRules, roleKey) ? roleKey : "super";
  return { role_key: key, role: { key, ...adminRoleRules[key] }, permissions: adminPermissionMatrix[key], modules: Object.entries(adminPermissionMatrix[key]).filter(([, value]) => value !== "none").map(([module, permission]) => ({ module, permission })) };
};
// 发布回验只暴露能力是否具备及安全边界，不返回密钥、令牌或机构配置明细。
// 本地适配器可用于联调，但不得被误判为生产机构能力。
const productionCapabilityRules = [
  { key: "B2B_ORDER", name: "B2B订单与批量履约", ready: true, source: "core-api" },
  { key: "WECHAT_AUTH", name: "微信身份认证与主体绑定", ready: wechatAuthReady, source: "wechat-provider" },
  { key: "CA_SIGNATURE", name: "CA合同签署", ready: process.env.SHUZHI_CA_READY === "true", source: "ca-provider" },
  { key: "ESCROW_PAYMENT", name: "托管支付与分账", ready: process.env.SHUZHI_PAYMENT_READY === "true", source: "payment-provider" },
  { key: "LOGISTICS_CALLBACK", name: "物流回调与签收", ready: process.env.SHUZHI_LOGISTICS_READY === "true", source: "logistics-provider" },
  { key: "INVOICE_VERIFICATION", name: "发票开具与验真", ready: process.env.SHUZHI_INVOICE_READY === "true", source: "invoice-provider" },
  { key: "REGULATOR_SYNC", name: "监管数据同步", ready: process.env.SHUZHI_REGULATOR_READY === "true", source: "regulator-provider" },
  { key: "AUDIT_EVIDENCE", name: "审计证据与幂等留痕", ready: true, source: "sqlite-audit" },
];
const platformCapabilities = () => {
  const capabilities = productionCapabilityRules.map((item) => ({
    ...item,
    ready: productionMode ? item.ready : ["B2B_ORDER", "AUDIT_EVIDENCE"].includes(item.key),
  }));
  const required = capabilities;
  const missing = required.filter((item) => !item.ready).map((item) => item.key);
  return {
    version: platformVersion,
    platform_version: platformVersion,
    api_version: apiReleaseVersion,
    runtime_mode: runtimeMode,
    releaseContext: {
      deployEnv: String(process.env.SHUZHI_DEPLOY_ENV || runtimeMode),
      serviceName: String(process.env.SHUZHI_SERVICE_NAME || "shuzhi-v8530"),
      releaseVersion: apiReleaseVersion,
    },
    productionReadiness: {
      requiredCapabilities: required.map((item) => item.key),
      availableCapabilities: capabilities.filter((item) => item.ready).map((item) => item.key),
      missingCapabilities: missing,
      callbackReadyOnly: capabilities.filter((item) => item.source.endsWith("-provider") && !item.ready).map((item) => item.key),
      allRequiredAvailable: productionMode && missing.length === 0,
      acceptanceAndCallbackBothRequired: true,
      b2bOutboundHandoffRequired: true,
    },
    capabilities,
    boundaries: {
      platformCustodiesFunds: false,
      clickEqualsCaSignature: false,
      localDataEqualsGovernmentApproval: false,
      socialContributionHasMonetaryValue: false,
      b2bInstructionWithoutProviderHandoff: false,
    },
  };
};
const adminRole = (req) => {
  if (productionMode) {
    const auth = String(req.headers.authorization || "");
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    return Object.prototype.hasOwnProperty.call(adminRoleRules, adminTokenRoles[token]) ? adminTokenRoles[token] : "service";
  }
  const key = String(req.headers["x-admin-role"] || "super");
  return Object.prototype.hasOwnProperty.call(adminRoleRules, key) ? key : "super";
};
const hasAdminPermission = (req, module, write = false) => {
  const principal = principalFor(req);
  if (!principal || !["admin", "demo"].includes(principal.type)) return false;
  const permission = adminPermissionMatrix[adminRole(req)]?.[module] || "none";
  return permission === "full" || (!write && permission === "read");
};
mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
db.exec(`
  CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, region TEXT, status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS merchants (id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, license_status TEXT NOT NULL, bank_status TEXT NOT NULL, risk_level TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (organization_id) REFERENCES organizations(id));
  CREATE TABLE IF NOT EXISTS merchant_identity (merchant_id TEXT PRIMARY KEY, credit_code TEXT NOT NULL UNIQUE, legal_name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', provider TEXT NOT NULL DEFAULT '', evidence_ref TEXT NOT NULL DEFAULT '', verified_at TEXT, updated_at TEXT NOT NULL, FOREIGN KEY (merchant_id) REFERENCES merchants(id));
  CREATE TABLE IF NOT EXISTS merchant_verifications (id TEXT PRIMARY KEY, merchant_id TEXT NOT NULL, verification_type TEXT NOT NULL, status TEXT NOT NULL, provider TEXT NOT NULL, evidence_ref TEXT NOT NULL, verified_by TEXT NOT NULL, verified_at TEXT, expires_at TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(merchant_id,verification_type), FOREIGN KEY (merchant_id) REFERENCES merchants(id));
  CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, merchant_id TEXT NOT NULL, name TEXT NOT NULL, category TEXT NOT NULL, spec TEXT, unit TEXT, price REAL NOT NULL, stock REAL NOT NULL, origin TEXT, quality_status TEXT NOT NULL, FOREIGN KEY (merchant_id) REFERENCES merchants(id));
  CREATE TABLE IF NOT EXISTS product_media (id INTEGER PRIMARY KEY AUTOINCREMENT, product_id TEXT NOT NULL, media_type TEXT NOT NULL, url TEXT NOT NULL, sort_no INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'pending', FOREIGN KEY (product_id) REFERENCES products(id));
  CREATE TABLE IF NOT EXISTS purchase_demands (id TEXT PRIMARY KEY, buyer_id TEXT NOT NULL, title TEXT NOT NULL, category TEXT NOT NULL, qty REAL NOT NULL, unit TEXT NOT NULL, budget_max REAL, destination TEXT NOT NULL, destination_lat REAL, destination_lng REAL, delivery_window TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (buyer_id) REFERENCES merchants(id));
  CREATE TABLE IF NOT EXISTS demand_quotes (id TEXT PRIMARY KEY, demand_id TEXT NOT NULL, supplier_id TEXT NOT NULL, product_id TEXT NOT NULL, qty REAL NOT NULL, unit_price REAL NOT NULL, amount REAL NOT NULL, status TEXT NOT NULL DEFAULT 'submitted', note TEXT, order_id TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, UNIQUE(demand_id,supplier_id,product_id), FOREIGN KEY (demand_id) REFERENCES purchase_demands(id), FOREIGN KEY (supplier_id) REFERENCES merchants(id), FOREIGN KEY (product_id) REFERENCES products(id), FOREIGN KEY (order_id) REFERENCES orders(id));
  CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, scene TEXT NOT NULL, buyer_id TEXT NOT NULL, supplier_id TEXT NOT NULL, status TEXT NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'CNY', settlement_model TEXT NOT NULL, payment_status TEXT NOT NULL, fulfillment_step INTEGER NOT NULL DEFAULT 0, delivery_window TEXT, invoice_status TEXT NOT NULL, contract_status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (buyer_id) REFERENCES merchants(id), FOREIGN KEY (supplier_id) REFERENCES merchants(id));
  CREATE TABLE IF NOT EXISTS order_items (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL, product_id TEXT NOT NULL, name TEXT NOT NULL, qty REAL NOT NULL, unit_price REAL NOT NULL, subtotal REAL NOT NULL, FOREIGN KEY (order_id) REFERENCES orders(id), FOREIGN KEY (product_id) REFERENCES products(id));
  CREATE TABLE IF NOT EXISTS inventory_reservations (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, product_id TEXT NOT NULL, qty REAL NOT NULL, status TEXT NOT NULL DEFAULT 'reserved', reserved_at TEXT NOT NULL, released_at TEXT, release_reason TEXT, UNIQUE(order_id,product_id), FOREIGN KEY (order_id) REFERENCES orders(id), FOREIGN KEY (product_id) REFERENCES products(id));
  CREATE TABLE IF NOT EXISTS contracts (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, contract_type TEXT NOT NULL, status TEXT NOT NULL, signed_at TEXT, hash TEXT NOT NULL, FOREIGN KEY (order_id) REFERENCES orders(id));
  CREATE TABLE IF NOT EXISTS contract_signatures (id INTEGER PRIMARY KEY AUTOINCREMENT, contract_id TEXT NOT NULL, order_id TEXT NOT NULL, party TEXT NOT NULL, signer_id TEXT NOT NULL, signer_name TEXT NOT NULL, certificate_ref TEXT NOT NULL, signed_at TEXT NOT NULL, UNIQUE(contract_id,party), FOREIGN KEY (contract_id) REFERENCES contracts(id), FOREIGN KEY (order_id) REFERENCES orders(id));
  CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, payer TEXT NOT NULL, payee TEXT NOT NULL, amount REAL NOT NULL, channel TEXT NOT NULL, status TEXT NOT NULL, paid_at TEXT, provider_transaction_id TEXT, FOREIGN KEY (order_id) REFERENCES orders(id));
  CREATE TABLE IF NOT EXISTS payment_refunds (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, payment_id TEXT NOT NULL, amount REAL NOT NULL, reason TEXT NOT NULL, status TEXT NOT NULL, provider_ref TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, FOREIGN KEY (order_id) REFERENCES orders(id), FOREIGN KEY (payment_id) REFERENCES payments(id));
  CREATE TABLE IF NOT EXISTS settlement_records (id TEXT PRIMARY KEY, order_id TEXT NOT NULL UNIQUE, amount REAL NOT NULL, platform_fee REAL NOT NULL DEFAULT 0, status TEXT NOT NULL, instruction_ref TEXT NOT NULL, settled_at TEXT, created_at TEXT NOT NULL, FOREIGN KEY (order_id) REFERENCES orders(id));
  CREATE TABLE IF NOT EXISTS fulfillment_events (id INTEGER PRIMARY KEY AUTOINCREMENT, order_id TEXT NOT NULL, step INTEGER NOT NULL, title TEXT NOT NULL, evidence TEXT NOT NULL, actor TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (order_id) REFERENCES orders(id));
  CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, invoice_no TEXT, amount REAL NOT NULL, status TEXT NOT NULL, issued_at TEXT, invoice_type TEXT NOT NULL DEFAULT '', tax_category_code TEXT NOT NULL DEFAULT '', tax_rate REAL, seller_credit_code TEXT, buyer_credit_code TEXT, FOREIGN KEY (order_id) REFERENCES orders(id));
  CREATE TABLE IF NOT EXISTS shipments (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, provider TEXT NOT NULL, tracking_no TEXT NOT NULL, carrier_name TEXT, vehicle_no TEXT, temperature REAL, status TEXT NOT NULL, departed_at TEXT, arrived_at TEXT, evidence TEXT, updated_at TEXT NOT NULL, consignor_address TEXT NOT NULL DEFAULT '', consignee_address TEXT NOT NULL DEFAULT '', FOREIGN KEY (order_id) REFERENCES orders(id));
  CREATE TABLE IF NOT EXISTS acceptances (id TEXT PRIMARY KEY, order_id TEXT NOT NULL, receiver TEXT NOT NULL, result TEXT NOT NULL, accepted_qty REAL, evidence TEXT, accepted_at TEXT, dispute_note TEXT, FOREIGN KEY (order_id) REFERENCES orders(id));
  CREATE TABLE IF NOT EXISTS merchant_credit (merchant_id TEXT PRIMARY KEY, star_level INTEGER NOT NULL DEFAULT 1, score REAL NOT NULL DEFAULT 60, completed_orders INTEGER NOT NULL DEFAULT 0, on_time_rate REAL NOT NULL DEFAULT 0, dispute_rate REAL NOT NULL DEFAULT 0, last_review_at TEXT, FOREIGN KEY (merchant_id) REFERENCES merchants(id));
  CREATE TABLE IF NOT EXISTS merchant_rewards (id INTEGER PRIMARY KEY AUTOINCREMENT, merchant_id TEXT NOT NULL, type TEXT NOT NULL, points INTEGER NOT NULL, reason TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (merchant_id) REFERENCES merchants(id));
  CREATE TABLE IF NOT EXISTS merchant_service_areas (id TEXT PRIMARY KEY, merchant_id TEXT NOT NULL, area_type TEXT NOT NULL DEFAULT 'radius', center_lat REAL NOT NULL, center_lng REAL NOT NULL, radius_km REAL NOT NULL, regions TEXT NOT NULL DEFAULT '[]', delivery_modes TEXT NOT NULL DEFAULT '[]', max_daily_orders INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'active', updated_at TEXT NOT NULL, FOREIGN KEY (merchant_id) REFERENCES merchants(id));
  CREATE TABLE IF NOT EXISTS order_delivery_constraints (order_id TEXT PRIMARY KEY, supplier_id TEXT NOT NULL, destination TEXT NOT NULL, destination_lat REAL NOT NULL, destination_lng REAL NOT NULL, distance_km REAL NOT NULL, radius_km REAL NOT NULL, max_daily_orders INTEGER NOT NULL DEFAULT 0, daily_order_count INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL, evidence_ref TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (order_id) REFERENCES orders(id), FOREIGN KEY (supplier_id) REFERENCES merchants(id));
  CREATE TABLE IF NOT EXISTS merchant_applications (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, name TEXT NOT NULL, credit_code TEXT NOT NULL, legal_name TEXT NOT NULL, legal_id_masked TEXT, address TEXT, scope TEXT, capital TEXT, documents TEXT NOT NULL DEFAULT '[]', status TEXT NOT NULL DEFAULT 'pending', review_note TEXT, reviewer TEXT, submitted_at TEXT NOT NULL, reviewed_at TEXT, activated_at TEXT, updated_at TEXT NOT NULL, business_role TEXT NOT NULL DEFAULT 'supplier');
  CREATE TABLE IF NOT EXISTS audit_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, actor TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL, detail TEXT, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS operation_progress (module_key TEXT PRIMARY KEY, domain TEXT NOT NULL, step INTEGER NOT NULL DEFAULT -1, status TEXT NOT NULL DEFAULT 'ready', updated_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS operation_events (id INTEGER PRIMARY KEY AUTOINCREMENT, module_key TEXT NOT NULL, domain TEXT NOT NULL, step INTEGER NOT NULL, title TEXT NOT NULL, evidence TEXT NOT NULL, actor TEXT NOT NULL, result TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS business_events (id INTEGER PRIMARY KEY AUTOINCREMENT, feature_key TEXT NOT NULL, domain TEXT NOT NULL, action TEXT NOT NULL, actor TEXT NOT NULL, payload TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'accepted', idempotency_key TEXT UNIQUE, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS request_idempotency (idempotency_key TEXT PRIMARY KEY, principal_id TEXT NOT NULL, method TEXT NOT NULL, path TEXT NOT NULL, request_hash TEXT, response_status INTEGER NOT NULL, response_data TEXT NOT NULL, created_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS user_sessions (token_hash TEXT PRIMARY KEY, principal_json TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL, revoked_at TEXT);
  CREATE TABLE IF NOT EXISTS integration_callbacks (id INTEGER PRIMARY KEY AUTOINCREMENT, provider TEXT NOT NULL, event_id TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE, signature TEXT NOT NULL, payload TEXT NOT NULL, status TEXT NOT NULL, received_at TEXT NOT NULL, processed_at TEXT, UNIQUE(provider,event_id));
  CREATE TABLE IF NOT EXISTS regulatory_submissions (id TEXT PRIMARY KEY, action TEXT NOT NULL CHECK(action IN ('submit','query','withdraw')), subject_type TEXT NOT NULL, subject_id TEXT NOT NULL, authority_code TEXT NOT NULL, data_minimization_version TEXT NOT NULL, evidence_refs TEXT NOT NULL, status TEXT NOT NULL, receipt_ref TEXT, failure_code TEXT, failure_message TEXT, idempotency_key TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS idx_regulatory_submissions_subject ON regulatory_submissions(subject_type, subject_id, authority_code, created_at);
`);
ensureInstitutionOutboxSchema(db);
// v8533 结算审计迁移：把平台技术服务费的计费基数与费额一起落库，
// 避免只保存费额而无法证明“商品净额×费率”的口径。旧库安全补列，不改变历史结算记录。
if (!db.prepare("PRAGMA table_info(settlement_records)").all().some((column) => column.name === "platform_fee_base")) {
  db.exec("ALTER TABLE settlement_records ADD COLUMN platform_fee_base REAL NOT NULL DEFAULT 0");
}
// v8530 schema migration: legacy SQLite files default existing applications to
// supplier; new applications explicitly record the selected business role.
if (!db.prepare("PRAGMA table_info(merchant_applications)").all().some((column) => column.name === "business_role")) {
  db.exec("ALTER TABLE merchant_applications ADD COLUMN business_role TEXT NOT NULL DEFAULT 'supplier'");
}
for (const [name, definition] of [["destination_lat", "REAL"], ["destination_lng", "REAL"]]) {
  if (!db.prepare("PRAGMA table_info(purchase_demands)").all().some((column) => column.name === name)) db.exec(`ALTER TABLE purchase_demands ADD COLUMN ${name} ${definition}`);
}
// 幂等键必须同时绑定请求体；否则同一主体在同一路径误用旧键并更换金额、数量或决定时，
// 服务端会返回旧响应，掩盖真实冲突。旧记录保留 NULL 以兼容升级，新请求全部写入 SHA-256。
if (!db.prepare("PRAGMA table_info(request_idempotency)").all().some((column) => column.name === "request_hash")) {
  db.exec("ALTER TABLE request_idempotency ADD COLUMN request_hash TEXT");
}
if (!db.prepare("PRAGMA table_info(shipments)").all().some((column) => column.name === "consignor_address")) {
  db.exec("ALTER TABLE shipments ADD COLUMN consignor_address TEXT NOT NULL DEFAULT ''");
}
if (!db.prepare("PRAGMA table_info(shipments)").all().some((column) => column.name === "consignee_address")) {
  db.exec("ALTER TABLE shipments ADD COLUMN consignee_address TEXT NOT NULL DEFAULT ''");
}
if (!db.prepare("PRAGMA table_info(payments)").all().some((column) => column.name === "provider_transaction_id")) {
  db.exec("ALTER TABLE payments ADD COLUMN provider_transaction_id TEXT");
}
for (const [name, definition] of [["invoice_type", "TEXT NOT NULL DEFAULT ''"], ["tax_category_code", "TEXT NOT NULL DEFAULT ''"], ["tax_rate", "REAL"], ["seller_credit_code", "TEXT"], ["buyer_credit_code", "TEXT"]]) {
  if (!db.prepare("PRAGMA table_info(invoices)").all().some((column) => column.name === name)) db.exec(`ALTER TABLE invoices ADD COLUMN ${name} ${definition}`);
}

const now = () => new Date().toISOString();
const seed = () => {
  if (!seedDemoData) return;
  const count = db.prepare("SELECT COUNT(*) AS n FROM organizations").get().n;
  if (Number(count) > 0) return;
  const t = now();
  db.exec("BEGIN");
  try {
    db.prepare("INSERT INTO organizations VALUES (?,?,?,?,?,?)").run("org-buyer", "华中商贸采购中心有限公司", "采购商", "湖北·武汉", "active", t);
    db.prepare("INSERT INTO organizations VALUES (?,?,?,?,?,?)").run("org-supplier", "赣南优品农业合作社", "产地供货商", "江西·赣州", "active", t);
    db.prepare("INSERT INTO organizations VALUES (?,?,?,?,?,?)").run("org-platform", "数智供社平台运营中心", "平台", "全国", "active", t);
    db.prepare("INSERT INTO merchants VALUES (?,?,?,?,?,?,?,?)").run("m-buyer", "org-buyer", "华中商贸采购中心有限公司", "buyer", "verified", "verified", "低", t);
    db.prepare("INSERT INTO merchants VALUES (?,?,?,?,?,?,?,?)").run("m-supplier", "org-supplier", "赣南优品农业合作社", "supplier", "verified", "verified", "低", t);
    db.prepare("INSERT INTO merchants VALUES (?,?,?,?,?,?,?,?)").run("m-platform", "org-platform", "数智供社平台运营中心", "platform", "verified", "verified", "低", t);
    const identityStmt = db.prepare("INSERT INTO merchant_identity(merchant_id,credit_code,legal_name,status,provider,evidence_ref,verified_at,updated_at) VALUES (?,?,?,?,?,?,?,?)");
    identityStmt.run("m-buyer", "91420100MA8V85013Y", "华中商贸采购中心有限公司", "verified", "本地演示核验", "LOCAL-BUYER-IDENTITY", t, t);
    identityStmt.run("m-supplier", "91360722MA8V85013X", "赣南优品农业合作社", "verified", "本地演示核验", "LOCAL-SUPPLIER-IDENTITY", t, t);
    identityStmt.run("m-platform", "91110108MA8V85013Z", "数智供社平台运营中心", "verified", "本地演示核验", "LOCAL-PLATFORM-IDENTITY", t, t);
    const products = [
      ["p-orange", "m-supplier", "赣南脐橙", "水果", "果径70mm·特级", "箱", 68, 2400, "江西赣州", "passed"],
      ["p-vegetable", "m-supplier", "高山菜心", "蔬菜", "净菜·2.5kg", "袋", 32, 1800, "江西寻乌", "passed"],
      ["p-eggs", "m-supplier", "生态土鸡蛋", "禽蛋", "30枚/盒", "盒", 49, 900, "江西瑞金", "passed"],
      ["p-feed", "m-supplier", "反刍动物配合饲料", "农资", "40kg/包", "包", 238, 600, "江西赣州", "passed"],
    ];
    const productStmt = db.prepare("INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?)");
    for (const p of products) productStmt.run(...p);
    const mediaStmt = db.prepare("INSERT INTO product_media(product_id,media_type,url,sort_no,status) VALUES (?,?,?,?,?)");
    mediaStmt.run("p-orange", "image", "/static/products/p12.jpg", 1, "approved");
    const orderId = "SZGS-2026-850901";
    db.prepare("INSERT INTO orders VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(orderId, "buyerSupply", "m-buyer", "m-supplier", "履约中", 276000, "CNY", "持牌机构条件结算（验收后分账）", "机构待确认", 5, "2026-08-03 08:00—12:00", "待开票", "已签署", t, t);
    const itemStmt = db.prepare("INSERT INTO order_items(order_id,product_id,name,qty,unit_price,subtotal) VALUES (?,?,?,?,?,?)");
    itemStmt.run(orderId, "p-orange", "赣南脐橙", 1200, 68, 81600);
    itemStmt.run(orderId, "p-vegetable", "高山菜心", 1800, 32, 57600);
    itemStmt.run(orderId, "p-eggs", "生态土鸡蛋", 900, 49, 44100);
    itemStmt.run(orderId, "p-feed", "反刍动物配合饲料", 388, 238, 92344);
    db.prepare("INSERT INTO contracts VALUES (?,?,?,?,?,?)").run("CA-SZGS-850901", orderId, "主合同+子订单+质量附件", "已签署", t, "0x850901ca…c4");
    db.prepare("INSERT INTO contract_signatures(contract_id,order_id,party,signer_id,signer_name,certificate_ref,signed_at) VALUES (?,?,?,?,?,?,?)").run("CA-SZGS-850901", orderId, "buyer", "m-buyer", "华中商贸采购中心有限公司授权签约人", "CA-BUYER-DEMO", t);
    db.prepare("INSERT INTO contract_signatures(contract_id,order_id,party,signer_id,signer_name,certificate_ref,signed_at) VALUES (?,?,?,?,?,?,?)").run("CA-SZGS-850901", orderId, "supplier", "m-supplier", "赣南优品农业合作社授权签约人", "CA-SUPPLIER-DEMO", t);
    db.prepare("INSERT INTO payments(id,order_id,payer,payee,amount,channel,status,paid_at,provider_transaction_id) VALUES (?,?,?,?,?,?,?,?,?)").run("PAY-SZGS-850901", orderId, "华中商贸采购中心有限公司", "持牌结算机构托管户", 276000, "机构监管结算", "待验收分账", null, null);
    db.prepare("INSERT INTO invoices(id,order_id,invoice_no,amount,status,issued_at,invoice_type,tax_category_code,tax_rate,seller_credit_code,buyer_credit_code) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run("INV-SZGS-850901", orderId, null, 276000, "待开具", null, "增值税电子普通发票", "农业产品", null, "91360722MA8V85013X", "91420100MA8V85013Y");
    db.prepare("INSERT INTO shipments(id,order_id,provider,tracking_no,carrier_name,vehicle_no,temperature,status,departed_at,arrived_at,evidence,updated_at,consignor_address,consignee_address) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run("SHP-SZGS-850901", orderId, "third-party", "SF202608030001", "顺丰冷运", "鄂A·85013", 4.2, "运输中", t, null, "温控/GPS/签封已绑定", t, "江西省赣州市寻乌县农产品仓", "湖北省武汉市洪山区团餐配送中心");
    db.prepare("INSERT INTO acceptances VALUES (?,?,?,?,?,?,?,?)").run("ACC-SZGS-850901", orderId, "华中商贸采购中心有限公司验收岗", "pending", null, "待到货复磅、抽检和签收", null, null);
    db.prepare("INSERT INTO merchant_credit VALUES (?,?,?,?,?,?,?)").run("m-supplier", 4, 86.5, 128, 0.97, 0.012, t);
    db.prepare("INSERT INTO merchant_rewards(merchant_id,type,points,reason,created_at) VALUES (?,?,?,?,?)").run("m-supplier", "reward", 120, "近90日准时履约率达到97%", t);
    db.prepare("INSERT INTO merchant_service_areas VALUES (?,?,?,?,?,?,?,?,?,?,?)").run("AREA-m-supplier", "m-supplier", "radius", 24.9105, 115.6528, 120, JSON.stringify(["赣州", "龙南", "安远", "寻乌"]), JSON.stringify(["冷链整车", "零担", "自提"]), 80, "active", t);
    db.prepare("INSERT INTO merchant_applications VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run("MA-2026-0001", "coop", "赣南优品农业合作社", "91360722MA8V85013X", "刘某某", "****************12", "江西省赣州市寻乌县", "农产品种植、收购、销售", "500", JSON.stringify(["营业执照", "法人身份证", "对公账户" ]), "pending", null, null, t, null, null, t, "supplier");
    const flow = ["批量清单拆单", "采购主体与授权核验", "供应商逐户确认", "订单复核与成交", "CA合同包双签", "机构支付授权"];
    const eventStmt = db.prepare("INSERT INTO fulfillment_events(order_id,step,title,evidence,actor,created_at) VALUES (?,?,?,?,?,?)");
    flow.forEach((title, i) => eventStmt.run(orderId, i, title, `V8530-${i + 1}-${orderId.slice(-6)}`, "交易复核岗", t));
    db.prepare("INSERT INTO audit_logs(actor,action,resource,detail,created_at) VALUES (?,?,?,?,?)").run("system", "SEED", orderId, "初始化数智供社 v8530 本地演示交易", t);
    db.exec("COMMIT");
  } catch (e) { db.exec("ROLLBACK"); throw e; }
};
seed();
if (seedDemoData) {
// 采购大厅的演示需求必须绑定已核验采购主体；供应商只能对这些需求提交报价，
// 不再把前台展示名称直接当作可下单的采购方身份。
{
  const demandStmt = db.prepare("INSERT OR IGNORE INTO purchase_demands(id,buyer_id,title,category,qty,unit,budget_max,destination,delivery_window,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)");
  const t = now();
  demandStmt.run("DEM-SZGS-0001", "m-buyer", "华中团餐采购 · 赣南脐橙", "水果", 1200, "箱", 72, "湖北·武汉", "2026-09-08 08:00—12:00", "open", t, t);
  demandStmt.run("DEM-SZGS-0002", "m-buyer", "华中团餐采购 · 高山菜心", "蔬菜", 800, "袋", 36, "湖北·武汉", "2026-09-09 08:00—12:00", "open", t, t);
}
// 旧本地数据库在升级到 v8530 时补齐演示合同的双方签章证据，不改变既有订单金额或状态。
{
  const demoContract = db.prepare("SELECT id,order_id,status,signed_at FROM contracts WHERE id='CA-SZGS-850901'").get();
  if (demoContract && demoContract.status === "已签署") {
    const signedAt = demoContract.signed_at || now();
    db.prepare("INSERT OR IGNORE INTO contract_signatures(contract_id,order_id,party,signer_id,signer_name,certificate_ref,signed_at) VALUES (?,?,?,?,?,?,?)").run(demoContract.id, demoContract.order_id, "buyer", "m-buyer", "华中商贸采购中心有限公司授权签约人", "CA-BUYER-DEMO", signedAt);
    db.prepare("INSERT OR IGNORE INTO contract_signatures(contract_id,order_id,party,signer_id,signer_name,certificate_ref,signed_at) VALUES (?,?,?,?,?,?,?)").run(demoContract.id, demoContract.order_id, "supplier", "m-supplier", "赣南优品农业合作社授权签约人", "CA-SUPPLIER-DEMO", signedAt);
  }
}

// 将 v8530 前台原有 89 项商品目录一次性纳入本地数据库，保留原图片与供应商信息。
// 这样后台审核后的商品仍是前台唯一数据源，不会因切换后台接口而丢失原图库。
const syncOriginalCatalog = () => {
  try {
    const sourcePath = resolve(here, "../work/shuzhi-v8502-source/src/mock/products.ts");
    const source = readFileSync(sourcePath, "utf8");
    const match = source.match(/export const villageProducts: VillageProduct\[\] = (\[[\s\S]*?\]);\n\nexport interface VillageDemand/);
    if (!match) return;
    const catalog = JSON.parse(match[1]);
    const suppliers = [...new Set(catalog.map((item) => String(item.supplier || "产地供货商")))].sort();
    const t = now();
    const orgStmt = db.prepare("INSERT OR IGNORE INTO organizations VALUES (?,?,?,?,?,?)");
    const merchantStmt = db.prepare("INSERT OR IGNORE INTO merchants VALUES (?,?,?,?,?,?,?,?)");
    const identityStmt = db.prepare("INSERT OR IGNORE INTO merchant_identity(merchant_id,credit_code,legal_name,status,provider,evidence_ref,verified_at,updated_at) VALUES (?,?,?,?,?,?,?,?)");
    const productStmt = db.prepare("INSERT OR IGNORE INTO products VALUES (?,?,?,?,?,?,?,?,?,?)");
    const mediaStmt = db.prepare("INSERT INTO product_media(product_id,media_type,url,sort_no,status) VALUES (?,?,?,?,?)");
    suppliers.forEach((name, index) => {
      const suffix = String(index + 1).padStart(3, "0");
      orgStmt.run(`org-catalog-${suffix}`, name, "产地供货商", "全国", "active", t);
      merchantStmt.run(`m-catalog-${suffix}`, `org-catalog-${suffix}`, name, "supplier", "verified", "verified", "低", t);
      identityStmt.run(`m-catalog-${suffix}`, `913600000MA8V85${suffix}`, name, "verified", "本地演示核验", `LOCAL-CATALOG-${suffix}`, t, t);
    });
    catalog.forEach((item) => {
      const supplierIndex = suppliers.indexOf(String(item.supplier || "产地供货商"));
      const suffix = String(supplierIndex + 1).padStart(3, "0");
      const id = `catalog-${item.id}`;
      const stock = Number(String(item.stock || "").match(/[\d.]+/)?.[0]) || 1000;
      productStmt.run(id, `m-catalog-${suffix}`, String(item.name), String(item.cat || "农产品"), String(item.spec || ""), String(item.unit || "件"), Number(item.price) || 0, stock, String(item.origin || ""), "passed");
      if (!db.prepare("SELECT id FROM product_media WHERE product_id=? LIMIT 1").get(id) && item.pic) mediaStmt.run(id, "image", String(item.pic), 1, "approved");
    });
  } catch {
    // 发行后的独立后端可能不携带前台源目录，保留基础种子数据即可运行。
  }
};
syncOriginalCatalog();
// 基础种子商品也沿用前台图库中的原图，不再让多个商品共用 p12 兜底图。
const seedPhotoMap = {
  "p-feed": "/static/products/p54.jpg",
  "p-eggs": "/static/products/p49.jpg",
  "p-1788179558325": "/static/products/p48.jpg",
  "p-orange": "/static/products/p7.jpg",
  "p-vegetable": "/static/products/p20.jpg",
};
for (const [productId, image] of Object.entries(seedPhotoMap)) {
  if (!db.prepare("SELECT id FROM products WHERE id=?").get(productId)) continue;
  const media = db.prepare("SELECT id FROM product_media WHERE product_id=? AND media_type='image' LIMIT 1").get(productId);
  if (media) db.prepare("UPDATE product_media SET url=?,status='approved' WHERE id=?").run(image, media.id);
  else db.prepare("INSERT INTO product_media(product_id,media_type,url,sort_no,status) VALUES (?,?,?,?,?)").run(productId, "image", image, 1, "approved");
}
if (Number(db.prepare("SELECT COUNT(*) AS n FROM merchant_applications").get().n) === 0) {
  const t = now();
  db.prepare("INSERT INTO merchant_applications VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run("MA-2026-0001", "coop", "赣南优品农业合作社", "91360722MA8V85013X", "刘某某", "****************12", "江西省赣州市寻乌县", "农产品种植、收购、销售", "500", JSON.stringify(["营业执照", "法人身份证", "对公账户"]), "pending", null, null, t, null, null, t, "supplier");
}
if (Number(db.prepare("SELECT COUNT(*) AS n FROM product_media").get().n) === 0) {
  db.prepare("INSERT INTO product_media(product_id,media_type,url,sort_no,status) VALUES (?,?,?,?,?)").run("p-orange", "image", "/static/products/p12.jpg", 1, "approved");
}
db.prepare("DELETE FROM product_media WHERE url LIKE '%example.invalid%'").run();
if (Number(db.prepare("SELECT COUNT(*) AS n FROM shipments").get().n) === 0) {
  const t = now();
  db.prepare("INSERT INTO shipments(id,order_id,provider,tracking_no,carrier_name,vehicle_no,temperature,status,departed_at,arrived_at,evidence,updated_at,consignor_address,consignee_address) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run("SHP-SZGS-850901", "SZGS-2026-850901", "third-party", "SF202608030001", "顺丰冷运", "鄂A·85013", 4.2, "运输中", t, null, "温控/GPS/签封已绑定", t, "江西省赣州市寻乌县农产品仓", "湖北省武汉市洪山区团餐配送中心");
  db.prepare("INSERT INTO acceptances VALUES (?,?,?,?,?,?,?,?)").run("ACC-SZGS-850901", "SZGS-2026-850901", "华中商贸采购中心有限公司验收岗", "pending", null, "待到货复磅、抽检和签收", null, null);
}
if (Number(db.prepare("SELECT COUNT(*) AS n FROM merchant_credit").get().n) === 0) {
  const t = now();
  db.prepare("INSERT INTO merchant_credit VALUES (?,?,?,?,?,?,?)").run("m-supplier", 4, 86.5, 128, 0.97, 0.012, t);
  db.prepare("INSERT INTO merchant_rewards(merchant_id,type,points,reason,created_at) VALUES (?,?,?,?,?)").run("m-supplier", "reward", 120, "近90日准时履约率达到97%", t);
}
if (Number(db.prepare("SELECT COUNT(*) AS n FROM merchant_service_areas").get().n) === 0) {
  const t = now();
  db.prepare("INSERT INTO merchant_service_areas VALUES (?,?,?,?,?,?,?,?,?,?,?)").run("AREA-m-supplier", "m-supplier", "radius", 24.9105, 115.6528, 120, JSON.stringify(["赣州", "龙南", "安远", "寻乌"]), JSON.stringify(["冷链整车", "零担", "自提"]), 80, "active", t);
}
}
const seedOperationWorkflows = () => {
  const stmt = db.prepare("INSERT OR IGNORE INTO operation_progress(module_key,domain,step,status,updated_at) VALUES (?,?,?,?,?)");
  const t = now();
  operationWorkflowRules.forEach((item) => stmt.run(item.key, item.domain, -1, "ready", t));
};
seedOperationWorkflows();

// 生产环境的主体可交易条件必须同时满足：商户字段为 verified，且营业执照、
// 对公账户各有一条带证据的独立核验记录。这样即使有人直接改写 merchants 表，
// 登录、报价、上架和下单也不会绕过核验事实。
const merchantVerificationReady = (merchantId) => {
  const merchant = db.prepare("SELECT license_status,bank_status FROM merchants WHERE id=?").get(String(merchantId));
  if (!merchant || merchant.license_status !== "verified" || merchant.bank_status !== "verified") return false;
  if (!productionMode) return true;
  const identity = db.prepare("SELECT credit_code,provider,evidence_ref,verified_at FROM merchant_identity WHERE merchant_id=? AND status='verified'").get(String(merchantId));
  if (!identity || !/^[0-9A-Z]{18}$/.test(String(identity.credit_code || "").toUpperCase()) || !String(identity.provider || '').trim() || !String(identity.evidence_ref || '').trim() || !identity.verified_at) return false;
  const result = db.prepare("SELECT COUNT(DISTINCT verification_type) AS n FROM merchant_verifications WHERE merchant_id=? AND verification_type IN ('license','bank') AND status='verified' AND TRIM(provider)<>'' AND TRIM(evidence_ref)<>'' AND verified_at IS NOT NULL").get(String(merchantId));
  return Number(result?.n || 0) === 2;
};
if (productionMode) {
  const invalidVerifiedMerchants = db.prepare("SELECT m.id FROM merchants m WHERE (m.license_status='verified' OR m.bank_status='verified') AND ((SELECT COUNT(DISTINCT v.verification_type) FROM merchant_verifications v WHERE v.merchant_id=m.id AND v.verification_type IN ('license','bank') AND v.status='verified' AND TRIM(v.provider)<>'' AND TRIM(v.evidence_ref)<>'' AND v.verified_at IS NOT NULL) < 2 OR NOT EXISTS (SELECT 1 FROM merchant_identity i WHERE i.merchant_id=m.id AND i.status='verified' AND length(i.credit_code)=18 AND TRIM(i.provider)<>'' AND TRIM(i.evidence_ref)<>'' AND i.verified_at IS NOT NULL)) LIMIT 1").get();
  if (invalidVerifiedMerchants) throw new Error(`生产库商户 ${invalidVerifiedMerchants.id} 缺少完整资质核验凭证，禁止启动；请先补齐 merchant_verifications`);
}

const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Access-Control-Allow-Origin": corsOrigin, "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key, X-Admin-Role, X-DEV-OPENID", "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS" };
const json = (res, status, data) => { res.writeHead(status, headers); if (status === 204) return res.end(); res.end(JSON.stringify({ code: 0, message: "success", data })); };
const error = (res, status, message) => { res.writeHead(status, headers); res.end(JSON.stringify({ code: Number(`${status}01`), message, data: { error: message } })); };
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const body = async (req) => {
  const chunks = [];
  let size = 0;
  let tooLarge = false;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size <= maxBodyBytes) chunks.push(bytes);
    else tooLarge = true;
  }
  if (tooLarge) throw new HttpError(413, `请求体不能超过 ${maxBodyBytes} 字节`);
  if (size === 0) return {};
  if (!String(req.headers["content-type"] || "").toLowerCase().includes("application/json")) throw new HttpError(415, "写接口只接受 application/json");
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not-object");
    return parsed;
  } catch { throw new HttpError(400, "请求 JSON 格式不正确"); }
};
const rawBody = async (req) => {
  const chunks = [];
  let size = 0;
  let tooLarge = false;
  for await (const chunk of req) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.length;
    if (size <= maxBodyBytes) chunks.push(bytes);
    else tooLarge = true;
  }
  if (tooLarge) throw new HttpError(413, `请求体不能超过 ${maxBodyBytes} 字节`);
  if (!String(req.headers["content-type"] || "").toLowerCase().includes("application/json")) throw new HttpError(415, "回调只接受 application/json");
  return Buffer.concat(chunks).toString("utf8");
};
const parseObject = (raw, message = "回调 JSON 格式不正确") => {
  try {
    const parsed = JSON.parse(raw || "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not-object");
    return parsed;
  } catch { throw new HttpError(400, message); }
};
const verifyWebhook = (provider, req, raw) => {
  const secret = String(integrationSecrets[provider] || "");
  if (!secret) throw new HttpError(503, `${provider} 回调密钥尚未配置`);
  const timestamp = Number(req.headers["x-webhook-timestamp"] || 0);
  const signature = String(req.headers["x-webhook-signature"] || "").replace(/^sha256=/i, "").toLowerCase();
  if (!Number.isInteger(timestamp) || Math.abs(Date.now() - timestamp * 1000) > webhookReplayWindowSeconds * 1000) throw new HttpError(401, "回调时间戳无效或已过期");
  const expected = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");
  const actual = Buffer.from(signature, "utf8");
  const wanted = Buffer.from(expected, "utf8");
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) throw new HttpError(401, "回调签名校验失败");
};
const bearerToken = (req) => {
  const auth = String(req.headers.authorization || "");
  return auth.startsWith("Bearer ") ? auth.slice(7) : "";
};
const sessionTokenHash = (token) => createHash("sha256").update(String(token)).digest("hex");
const principalFor = (req) => {
  const token = bearerToken(req);
  if (!token) return null;
  if (Object.prototype.hasOwnProperty.call(adminTokenRoles, token)) return { type: "admin", id: `admin-${adminTokenRoles[token]}`, name: adminRoleRules[adminTokenRoles[token]]?.name || "管理员", role: adminTokenRoles[token], merchant_ids: [] };
  if (Object.prototype.hasOwnProperty.call(userTokenPrincipals, token)) {
    const configured = userTokenPrincipals[token] || {};
    const merchantIds = Array.isArray(configured.merchant_ids) ? configured.merchant_ids.map(String) : configured.merchant_id ? [String(configured.merchant_id)] : [];
    return { type: "user", id: String(configured.id || "authorized-user"), name: String(configured.name || "已授权用户"), role: String(configured.role || "member"), merchant_ids: merchantIds, application_ids: Array.isArray(configured.application_ids) ? configured.application_ids.map(String) : [] };
  }
  if (token) {
    const session = db.prepare("SELECT principal_json FROM user_sessions WHERE token_hash=? AND revoked_at IS NULL AND expires_at>? LIMIT 1").get(sessionTokenHash(token), new Date().toISOString());
    if (session) {
      try {
        const principal = JSON.parse(session.principal_json);
        if (principal && principal.type === "user" && principal.id && principal.role && Array.isArray(principal.merchant_ids)) return principal;
      } catch { /* 会话数据损坏时按未登录处理 */ }
    }
  }
  if (token === apiToken) return { type: productionMode ? "integration" : "demo", id: productionMode ? "internal-integration" : "local-admin", name: productionMode ? "内部集成服务" : "本地演示管理员", role: productionMode ? "integration" : "super", merchant_ids: [] };
  return null;
};
const actorFor = (req, fallback = "前台经办人") => {
  const principal = principalFor(req);
  return principal ? `${principal.name}（${principal.id}）` : fallback;
};
const authorized = (req) => Boolean(principalFor(req));
const privileged = (req) => ["admin", "integration", "demo"].includes(principalFor(req)?.type || "");
const adminAuthorized = (req) => ["admin", "demo"].includes(principalFor(req)?.type || "");
const canAccessMerchant = (req, merchantId) => privileged(req) || (principalFor(req)?.merchant_ids || []).includes(String(merchantId));
const canAccessOrder = (req, order) => Boolean(order) && (privileged(req) || (principalFor(req)?.merchant_ids || []).some((id) => id === order.buyer_id || id === order.supplier_id));
const canActForOrder = (req, order, side) => {
  const principal = principalFor(req);
  if (privileged(req)) return true;
  const allowedRoles = side === "buyer" ? ["buyer", "agri"] : ["supplier"];
  return Boolean(order && principal && allowedRoles.includes(principal.role) && (principal.merchant_ids || []).includes(side === "buyer" ? order.buyer_id : order.supplier_id));
};
const requestKey = (req, payload = {}) => String(req.headers["idempotency-key"] || payload.idempotency_key || "").trim();
const requestHash = (payload) => createHash("sha256").update(canonicalizeInstitutionCommand(payload || {})).digest("hex");
const replayIdempotent = (req, res, key, payload) => {
  if (!key) return false;
  const principal = principalFor(req);
  const row = db.prepare("SELECT * FROM request_idempotency WHERE idempotency_key=?").get(key);
  if (!row) return false;
  if (row.principal_id !== principal?.id || row.method !== req.method || row.path !== new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname) { error(res, 409, "幂等键已被其他请求占用"); return true; }
  if (!row.request_hash || row.request_hash !== requestHash(payload)) { error(res, 409, "幂等键对应的请求内容已发生变化或无法安全复用"); return true; }
  json(res, row.response_status, JSON.parse(row.response_data));
  return true;
};
const saveIdempotent = (req, key, status, data, payload) => {
  if (!key) return;
  const principal = principalFor(req);
  const path = new URL(req.url, `http://${req.headers.host || "localhost"}`).pathname;
  db.prepare("INSERT OR IGNORE INTO request_idempotency(idempotency_key,principal_id,method,path,request_hash,response_status,response_data,created_at) VALUES (?,?,?,?,?,?,?,?)").run(key, principal?.id || "anonymous", req.method, path, requestHash(payload), status, JSON.stringify(data), now());
};
const orderView = (id) => {
  const order = db.prepare(`SELECT o.*, b.name buyer_name, s.name supplier_name FROM orders o JOIN merchants b ON b.id=o.buyer_id JOIN merchants s ON s.id=o.supplier_id WHERE o.id=?`).get(id);
  if (!order) return null;
  return { ...order, items: db.prepare("SELECT * FROM order_items WHERE order_id=?").all(id), inventory_reservations: db.prepare("SELECT id,product_id,qty,status,reserved_at,released_at,release_reason FROM inventory_reservations WHERE order_id=? ORDER BY id").all(id), events: db.prepare("SELECT * FROM fulfillment_events WHERE order_id=? ORDER BY step").all(id), contracts: db.prepare("SELECT * FROM contracts WHERE order_id=?").all(id).map((contract) => ({ ...contract, signatures: db.prepare("SELECT party,signer_id,signer_name,certificate_ref,signed_at FROM contract_signatures WHERE contract_id=? ORDER BY party").all(contract.id) })), payments: db.prepare("SELECT * FROM payments WHERE order_id=? ORDER BY rowid").all(id), refunds: db.prepare("SELECT * FROM payment_refunds WHERE order_id=? ORDER BY created_at").all(id), invoices: db.prepare("SELECT * FROM invoices WHERE order_id=?").all(id), shipments: db.prepare("SELECT * FROM shipments WHERE order_id=? ORDER BY updated_at DESC").all(id), acceptances: db.prepare("SELECT * FROM acceptances WHERE order_id=? ORDER BY accepted_at DESC").all(id), delivery_constraint: db.prepare("SELECT * FROM order_delivery_constraints WHERE order_id=?").get(id) || null, settlement: db.prepare("SELECT * FROM settlement_records WHERE order_id=?").get(id) || null };
};
const releaseOrderInventory = (orderId, reason) => {
  const reservations = db.prepare("SELECT id,product_id,qty FROM inventory_reservations WHERE order_id=? AND status='reserved'").all(orderId);
  for (const reservation of reservations) {
    const restored = db.prepare("UPDATE products SET stock=stock+? WHERE id=?").run(Number(reservation.qty), reservation.product_id);
    if (Number(restored.changes) !== 1) throw new HttpError(409, `库存释放失败：商品 ${reservation.product_id} 不存在`);
    db.prepare("UPDATE inventory_reservations SET status='released',released_at=?,release_reason=? WHERE id=? AND status='reserved'").run(now(), String(reason || "订单取消").slice(0, 120), reservation.id);
  }
  return reservations.length;
};
const orderGoodsNet = (orderId) => {
  const row = db.prepare("SELECT COALESCE(SUM(subtotal), 0) AS amount FROM order_items WHERE order_id=?").get(orderId);
  return Math.round(Number(row?.amount || 0) * 100) / 100;
};
const platformFeeForOrder = (orderId, orderAmount) => {
  // 只有商品明细才是平台费计费基数；物流、包装、检测等实际服务费不得并入基数。
  // 本地演示兼容没有明细的旧订单；生产结算必须补齐商品明细，不能用订单总额代替。
  const goodsNet = orderGoodsNet(orderId);
  if (goodsNet <= 0 && productionMode) throw new HttpError(409, "结算缺少商品明细，禁止按订单总额回退计费；请先补齐订单明细并复核");
  const base = goodsNet > 0 ? goodsNet : Math.round(Number(orderAmount || 0) * 100) / 100;
  const baseCents = productionMode ? moneyCents(base, "平台费计费基数") : Math.round(base * 100);
  const feeCents = Math.round(baseCents * Number(tradeConfig.fee_rules.platform_rate));
  return { base: centsMoney(baseCents), fee: centsMoney(feeCents), fallback: goodsNet <= 0 };
};
const tradeLedger = (id) => {
  const order = orderView(id);
  if (!order) return null;
  return {
    order: { id: order.id, scene: order.scene, status: order.status, amount: order.amount, buyer: order.buyer_name, supplier: order.supplier_name },
    settlement: order.settlement,
    four_flows: {
      contract: order.contracts,
      order: { id: order.id, items: order.items, status: order.status },
      logistics: order.shipments,
      invoice: order.invoices,
      payment: order.payments,
      acceptance: order.acceptances,
    },
    reconciliation: { contract_order_match: true, order_logistics_match: order.shipments.length > 0, acceptance_invoice_gate: order.invoices.every((item) => item.status === "待开具" || item.issued_at), payment_release_gate: order.acceptances.some((item) => item.result === "accepted") && order.invoices.some((item) => item.status === "已开具"), settlement_complete: order.settlement?.status === "settled" },
  };
};
const applicationView = (id) => {
  const app = db.prepare("SELECT * FROM merchant_applications WHERE id=?").get(id);
  if (!app) return null;
  return { ...app, documents: JSON.parse(app.documents || "[]") };
};
const serviceAreaView = (merchantId) => {
  const area = db.prepare("SELECT * FROM merchant_service_areas WHERE merchant_id=? AND status='active' LIMIT 1").get(merchantId);
  if (!area) return null;
  return { ...area, regions: JSON.parse(area.regions || "[]"), delivery_modes: JSON.parse(area.delivery_modes || "[]") };
};
const demandView = (id) => {
  const demand = db.prepare("SELECT d.*, b.name buyer_name FROM purchase_demands d JOIN merchants b ON b.id=d.buyer_id WHERE d.id=?").get(id);
  if (!demand) return null;
  return {
    ...demand,
    quote_count: Number(db.prepare("SELECT COUNT(*) AS n FROM demand_quotes WHERE demand_id=? AND status IN ('submitted','accepted','ordered')").get(id)?.n || 0),
    quotes: db.prepare("SELECT q.id,q.supplier_id,s.name supplier_name,q.product_id,p.name product_name,q.qty,q.unit_price,q.amount,q.status,q.note,q.order_id,q.created_at,q.updated_at FROM demand_quotes q JOIN merchants s ON s.id=q.supplier_id JOIN products p ON p.id=q.product_id WHERE q.demand_id=? ORDER BY q.created_at DESC").all(id),
  };
};
const quoteView = (id) => db.prepare("SELECT q.*,d.buyer_id,d.status demand_status,d.title demand_title,d.category,d.destination,d.destination_lat,d.destination_lng,d.delivery_window,b.name buyer_name,s.name supplier_name,p.name product_name,p.unit product_unit FROM demand_quotes q JOIN purchase_demands d ON d.id=q.demand_id JOIN merchants b ON b.id=d.buyer_id JOIN merchants s ON s.id=q.supplier_id JOIN products p ON p.id=q.product_id WHERE q.id=?").get(id) || null;
const distanceKm = (lat1, lng1, lat2, lng2) => {
  const rad = (value) => value * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const productionDeliveryConstraint = ({ supplierId, destination, lat, lng, orderId }) => {
  if (!productionMode) return null;
  if (![lat, lng].every(Number.isFinite) || lat < -90 || lat > 90 || lng < -180 || lng > 180) throw new HttpError(400, "生产订单必须提供有效的收货地经纬度");
  const area = serviceAreaView(supplierId);
  if (!area) throw new HttpError(409, "供货商未配置已审核的服务半径，不能创建生产订单");
  const distance = distanceKm(area.center_lat, area.center_lng, lat, lng);
  if (distance > area.radius_km) throw new HttpError(409, `收货地超出供货商服务半径（${distance.toFixed(2)}km > ${area.radius_km}km），需先完成后台人工扩围审批`);
  const dayStart = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;
  // 以订单事实统计当日占用量，而不是只统计本版本写入的约束表；这样升级旧库时，
  // 没有历史坐标证据的订单也不会被错误地排除在日单量限制之外。
  const dailyCount = Number(db.prepare("SELECT COUNT(*) AS n FROM orders WHERE supplier_id=? AND created_at>=? AND status NOT IN ('已取消','已驳回')").get(supplierId, dayStart)?.n || 0);
  if (area.max_daily_orders > 0 && dailyCount >= area.max_daily_orders) throw new HttpError(409, `供货商已达到当日服务上限（${area.max_daily_orders}单），不能继续创建订单`);
  return { supplier_id: supplierId, destination: String(destination || "待补充").trim().slice(0, 240), destination_lat: lat, destination_lng: lng, distance_km: Number(distance.toFixed(2)), radius_km: area.radius_km, max_daily_orders: area.max_daily_orders, daily_order_count: dailyCount + 1, status: "within_radius", evidence_ref: `AREA-CHECK-${orderId}` };
};
const finitePositive = (value, max = Number.MAX_SAFE_INTEGER) => Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= max;
const finiteNonNegative = (value, max = Number.MAX_SAFE_INTEGER) => Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= max;
// 生产账务金额必须精确到人民币分；内部仍保留现有 DTO 和 SQLite 字段，
// 但所有关键边界先用整数分校验，避免二进制浮点造成四流金额不一致。
const moneyCents = (value, label = "金额", { allowZero = false } = {}) => {
  const number = Number(value);
  if (!Number.isFinite(number) || (allowZero ? number < 0 : number <= 0) || number > 1e12) throw new HttpError(400, `${label}必须为合法金额`);
  const cents = Math.round(number * 100);
  if (Math.abs(number * 100 - cents) > 1e-7) throw new HttpError(400, `${label}必须精确到人民币分`);
  return cents;
};
const centsMoney = (cents) => Math.round(Number(cents)) / 100;
const prepaidShipmentModels = new Set(["advance", "预付款 + 尾款", "custody", "机构监管结算", "持牌机构条件结算（验收后分账）"]);
const shipmentPaymentReady = (order) => {
  if (!productionMode || !prepaidShipmentModels.has(String(order?.settlement_model || ""))) return true;
  return ["已入金待验收", "待验收分账", "机构已确认（验收后分账）", "已支付"].includes(String(order?.payment_status || ""));
};
// 第三方回调只接受明确的状态词，并按单向状态机落账；未知状态或回退
// 不能覆盖已经确认、已送达或已分账的事实，避免供应商重试/异常回调改写账本。
const normalizeWebhookStatus = (provider, value) => {
  const incoming = String(value || "").trim().toLowerCase();
  const maps = {
    ca: new Map([
      ["signed", "signed"], ["completed", "signed"], ["success", "signed"], ["已签署", "signed"], ["已完成", "signed"],
      ["pending", "pending"], ["processing", "pending"], ["待签署", "pending"], ["处理中", "pending"],
      ["failed", "failed"], ["rejected", "failed"], ["cancelled", "failed"], ["canceled", "failed"], ["签署失败", "failed"],
    ]),
    logistics: new Map([
      ["in_transit", "运输中"], ["shipped", "运输中"], ["运输中", "运输中"], ["出库", "运输中"],
      ["delivered", "已送达"], ["arrived", "已送达"], ["signed", "已送达"], ["已签收", "已送达"], ["已送达", "已送达"],
      ["exception", "异常"], ["异常", "异常"], ["cancelled", "异常"], ["canceled", "异常"], ["已取消", "异常"],
    ]),
    payment: new Map([
      ["paid", "paid"], ["success", "paid"], ["succeeded", "paid"], ["settled", "paid"], ["已支付", "paid"], ["已入金", "paid"],
      ["pending", "pending"], ["processing", "pending"], ["待确认", "pending"], ["待支付", "pending"], ["机构待确认", "pending"],
      ["failed", "failed"], ["failure", "failed"], ["cancelled", "failed"], ["canceled", "failed"], ["refunded", "failed"], ["支付失败", "failed"], ["已退款", "failed"],
    ]),
    invoice: new Map([
      ["verified", "verified"], ["issued", "verified"], ["success", "verified"], ["已验真", "verified"], ["已开具", "verified"],
      ["pending", "pending"], ["processing", "pending"], ["待验真", "pending"], ["待开具", "pending"],
      ["failed", "failed"], ["rejected", "failed"], ["开票失败", "failed"], ["验真失败", "failed"],
    ]),
    regulator: new Map([
      ["accepted", "accepted"], ["received", "accepted"], ["submitted", "accepted"], ["success", "accepted"], ["succeeded", "accepted"], ["completed", "accepted"], ["verified", "accepted"], ["已受理", "accepted"], ["已提交", "accepted"], ["已回执", "accepted"],
      ["pending", "pending"], ["processing", "pending"], ["待受理", "pending"], ["处理中", "pending"], ["待回执", "pending"],
      ["failed", "failed"], ["failure", "failed"], ["rejected", "failed"], ["cancelled", "failed"], ["canceled", "failed"], ["提交失败", "failed"], ["监管驳回", "failed"],
      ["withdrawn", "withdrawn"], ["撤回", "withdrawn"], ["已撤回", "withdrawn"],
    ]),
  };
  return maps[provider]?.get(incoming) || null;
};
const log = (actor, action, resource, detail) => db.prepare("INSERT INTO audit_logs(actor,action,resource,detail,created_at) VALUES (?,?,?,?,?)").run(actor, action, resource, detail, now());
const operationView = (moduleKey) => {
  const rule = operationWorkflowRules.find((item) => item.key === moduleKey);
  if (!rule) return null;
  const progress = db.prepare("SELECT * FROM operation_progress WHERE module_key=?").get(moduleKey) || { module_key: moduleKey, domain: rule.domain, step: -1, status: "ready", updated_at: null };
  return {
    ...rule,
    current_step: Number(progress.step),
    status: progress.status,
    updated_at: progress.updated_at,
    events: db.prepare("SELECT id,step,title,evidence,actor,result,created_at FROM operation_events WHERE module_key=? ORDER BY id DESC LIMIT 30").all(moduleKey),
  };
};
const featureView = (item) => ({
  ...item,
  event_count: Number(db.prepare("SELECT COUNT(*) AS n FROM business_events WHERE feature_key=?").get(item.key).n),
  last_event_at: db.prepare("SELECT MAX(created_at) AS t FROM business_events WHERE feature_key=?").get(item.key).t || null,
});
const businessEventView = (row) => ({ ...row, payload: JSON.parse(row.payload || "{}") });
const regulatorySubmissionView = (row) => row ? ({
  ...row,
  evidence_refs: JSON.parse(row.evidence_refs || "[]"),
}) : null;
const institutionCallbackUrl = (provider) => {
  const base = String(process.env.VITE_API_BASE || "").trim().replace(/\/+$/, "");
  try {
    const url = new URL(base);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error("invalid");
  } catch { throw new HttpError(503, "生产机构回调地址未配置有效的 HTTPS API 根地址"); }
  return `${base}/api/v1/integrations/${provider}/webhook`;
};
const merchantParty = (merchantId, creditCode) => {
  const row = db.prepare("SELECT m.id,m.name,o.name organization_name,i.credit_code registered_credit_code FROM merchants m JOIN organizations o ON o.id=m.organization_id LEFT JOIN merchant_identity i ON i.merchant_id=m.id WHERE m.id=?").get(merchantId);
  const code = String(creditCode || "").trim();
  if (!row || !code) throw new HttpError(400, "机构指令缺少交易主体统一社会信用代码");
  if (!/^[0-9A-Z]{15,18}$/i.test(code)) throw new HttpError(400, "统一社会信用代码格式不正确");
  if (productionMode && !merchantVerificationReady(merchantId)) throw new HttpError(409, "交易主体核验状态已失效，禁止发送机构指令");
  if (productionMode && (!row.registered_credit_code || String(row.registered_credit_code).toUpperCase() !== code.toUpperCase())) throw new HttpError(409, "统一社会信用代码与后台备案主体不一致，禁止发送机构指令");
  return { merchant_id: row.id, legal_name: row.organization_name || row.name, credit_code: code };
};
const enqueueProductionInstitutionCommand = (input) => enqueueInstitutionCommand(db, {
  ...input,
  command: {
    command_id: input.command.command_id,
    occurred_at: input.command.occurred_at || now(),
    callback_url: institutionCallbackUrl(input.provider),
    ...input.command,
  },
});
const processIntegrationWebhook = async (provider, req, res) => {
  const readinessEnv = { ca: "SHUZHI_CA_READY", logistics: "SHUZHI_LOGISTICS_READY", payment: "SHUZHI_PAYMENT_READY", invoice: "SHUZHI_INVOICE_READY", regulator: "SHUZHI_REGULATOR_READY" };
  if (productionMode && process.env[readinessEnv[provider]] !== "true") throw new HttpError(503, `${provider} 机构联调尚未完成，暂不接收生产回调`);
  const raw = await rawBody(req);
  verifyWebhook(provider, req, raw);
  const payload = parseObject(raw);
  const declaredProvider = String(payload.provider || "").trim().toLowerCase();
  if (declaredProvider !== provider) throw new HttpError(400, "回调 provider 与路径机构不一致");
  const eventId = String(req.headers["x-webhook-id"] || payload.event_id || "").trim();
  const idemKey = requestKey(req, payload) || eventId;
  if (!eventId || !idemKey) throw new HttpError(400, "回调必须提供 event_id 和 Idempotency-Key（或使用 X-Webhook-Id）");
  // 回调幂等键在机构域内生效；存储时增加 provider 命名空间，避免支付机构和
  // 监管机构恰好使用同一字符串时互相吞掉回调。旧版本未加前缀的记录仍兼容读取。
  const callbackStorageKey = `${provider}:${idemKey}`;
  // 旧版本可能保存过未加 provider 前缀的幂等键；兼容读取时也必须限定同一机构，
  // 否则支付机构复用物流机构的旧 key 会被误判为已处理，导致回调事实丢失。
  const existing = db.prepare("SELECT provider,event_id,status FROM integration_callbacks WHERE (provider=? AND idempotency_key IN (?,?)) OR (provider=? AND event_id=?) LIMIT 1").get(provider, callbackStorageKey, idemKey, provider, eventId);
  if (existing) return json(res, 200, { accepted: true, provider, event_id: existing.event_id, replayed: true, status: existing.status });
  const t = now();
  db.exec("BEGIN");
  try {
    db.prepare("INSERT INTO integration_callbacks(provider,event_id,idempotency_key,signature,payload,status,received_at) VALUES (?,?,?,?,?,?,?)").run(provider, eventId, callbackStorageKey, String(req.headers["x-webhook-signature"] || ""), raw, "received", t);
    const orderId = String(payload.order_id || "").trim();
    let nextAction = "已记录，等待后台复核";
    if (provider !== "regulator") {
      const order = orderId ? db.prepare("SELECT * FROM orders WHERE id=?").get(orderId) : null;
      if (!order) throw new HttpError(404, "回调关联的交易不存在");
      if (order.status === "已取消") throw new HttpError(409, "交易已取消，禁止机构回调继续推进履约或账本");
      if (provider === "ca") {
        const contractId = String(payload.contract_id || "").trim();
        const party = String(payload.party || "").trim();
        const certificateRef = String(payload.certificate_ref || "").trim();
        const digest = String(payload.contract_digest || "").trim().toLowerCase();
        const status = normalizeWebhookStatus("ca", payload.status);
        if (!contractId || !["buyer", "supplier"].includes(party) || !certificateRef || !digest || !status) throw new HttpError(400, "CA回调字段或状态不完整");
        const contract = db.prepare("SELECT * FROM contracts WHERE id=? AND order_id=? LIMIT 1").get(contractId, orderId);
        if (!contract) throw new HttpError(404, "回调关联的合同不存在");
        const expectedDigest = createHash("sha256").update(`${contract.id}:${orderId}:${contract.hash}`).digest("hex");
        if (digest !== expectedDigest) throw new HttpError(409, "CA回调合同摘要与平台记录不一致");
        if (db.prepare("SELECT id FROM settlement_records WHERE order_id=? LIMIT 1").get(orderId)) throw new HttpError(409, "交易已结算，禁止CA回调覆盖账本");
        if (status === "failed") {
          db.prepare("UPDATE contracts SET status='签署失败' WHERE id=? AND status<>'已签署'").run(contract.id);
          db.prepare("UPDATE orders SET contract_status='签署失败',updated_at=? WHERE id=? AND contract_status<>'已签署'").run(t, orderId);
          nextAction = "CA签署失败，需由授权签约人复核后重新发起";
        } else if (status === "signed") {
          const existingSignature = db.prepare("SELECT * FROM contract_signatures WHERE contract_id=? AND party=?").get(contract.id, party);
          if (existingSignature && (existingSignature.certificate_ref !== certificateRef || existingSignature.signer_id !== String(payload.signer_id || "ca-provider"))) throw new HttpError(409, "该签署方已有不同的CA签署证据");
          if (!existingSignature) db.prepare("INSERT INTO contract_signatures(contract_id,order_id,party,signer_id,signer_name,certificate_ref,signed_at) VALUES (?,?,?,?,?,?,?)").run(contract.id, orderId, party, String(payload.signer_id || "ca-provider"), String(payload.signer_name || "CA机构回传签署人").slice(0, 120), certificateRef, t);
          const count = Number(db.prepare("SELECT COUNT(*) AS n FROM contract_signatures WHERE contract_id=? AND party IN ('buyer','supplier')").get(contract.id).n);
          const signed = count >= 2;
          db.prepare("UPDATE contracts SET status=?,signed_at=CASE WHEN ? THEN COALESCE(signed_at,?) ELSE signed_at END WHERE id=?").run(signed ? "已签署" : "待双方签署", signed ? 1 : 0, t, contract.id);
          db.prepare("UPDATE orders SET contract_status=?,updated_at=? WHERE id=?").run(signed ? "已签署" : "待双方签署", t, orderId);
          nextAction = signed ? "双方CA签署已完成，可进入支付条件确认" : "已记录一方CA签署，等待另一方签署";
        }
      } else if (provider === "logistics") {
        const trackingNo = String(payload.tracking_no || "").trim();
        if (!trackingNo) throw new HttpError(400, "物流回调缺少 tracking_no");
        const shipment = db.prepare("SELECT * FROM shipments WHERE order_id=? AND (tracking_no=? OR tracking_no LIKE 'PENDING-%') ORDER BY updated_at DESC LIMIT 1").get(orderId, trackingNo);
        if (!shipment) throw new HttpError(404, "回调关联的运单不存在");
        const status = normalizeWebhookStatus("logistics", payload.status);
        if (!status) throw new HttpError(400, "物流回调状态不在允许范围");
        if (payload.temperature !== undefined && (!Number.isFinite(Number(payload.temperature)) || Number(payload.temperature) < -80 || Number(payload.temperature) > 80)) throw new HttpError(400, "物流回调温度必须在 -80℃ 至 80℃之间");
        const duplicateTracking = db.prepare("SELECT id,order_id FROM shipments WHERE tracking_no=? AND id<>? LIMIT 1").get(trackingNo, shipment.id);
        if (duplicateTracking) throw new HttpError(409, "物流机构运单号已绑定其他交易，禁止覆盖履约证据");
        if (db.prepare("SELECT id FROM settlement_records WHERE order_id=? LIMIT 1").get(orderId)) throw new HttpError(409, "交易已完成结算，禁止物流回调覆盖履约账本");
        if (shipment.status === "已送达" && status !== "已送达") throw new HttpError(409, "运单已送达，禁止回调回退覆盖");
        const arrivedAt = status === "已送达" ? t : shipment.arrived_at;
        db.prepare("UPDATE shipments SET tracking_no=?,status=?,temperature=?,arrived_at=?,evidence=?,updated_at=? WHERE id=?").run(trackingNo, status, payload.temperature == null ? shipment.temperature : Number(payload.temperature), arrivedAt, String(payload.evidence || "第三方物流签名回传"), t, shipment.id);
        if (status === "已送达") db.prepare("UPDATE orders SET fulfillment_step=CASE WHEN fulfillment_step<8 THEN 8 ELSE fulfillment_step END,updated_at=? WHERE id=?").run(t, orderId);
        nextAction = status === "已送达" ? "待采购方复磅、抽检并验收" : "继续跟踪物流状态";
      } else if (provider === "payment") {
        const action = String(payload.action || "").trim().toLowerCase();
        const rawPaymentStatus = String(payload.status || "").trim().toLowerCase();
        const paymentState = normalizeWebhookStatus("payment", payload.status);
        const refundSuccessStates = new Set(["refunded", "refund_success", "success", "succeeded", "已退款", "退款成功"]);
        const refundPendingStates = new Set(["pending", "processing", "refund_pending", "refund_processing", "待确认", "退款待受理", "退款处理中"]);
        const refundFailedStates = new Set(["failed", "failure", "refund_failed", "rejected", "cancelled", "canceled", "支付失败", "退款失败"]);
        if (action && !["deposit", "release", "refund"].includes(action)) throw new HttpError(400, "支付回调 action 不在允许范围");
        if (!paymentState && action !== "refund") throw new HttpError(400, "支付回调状态不在允许范围");
        if (action === "refund" && ![...refundSuccessStates, ...refundPendingStates, ...refundFailedStates].includes(rawPaymentStatus)) throw new HttpError(400, "退款回调状态不在允许范围");
        const paymentId = String(payload.payment_id || "").trim();
        if (productionMode && !paymentId) throw new HttpError(400, "生产支付回调必须提供 payment_id 以绑定支付尝试");
        const payment = db.prepare("SELECT * FROM payments WHERE order_id=? AND (?='' OR id=?) LIMIT 1").get(orderId, paymentId, paymentId);
        if (!payment) throw new HttpError(404, "回调关联的托管支付记录不存在");
        const providerTransactionId = String(payload.provider_transaction_id || "").trim();
        if (productionMode && payload.amount === undefined) throw new HttpError(400, "生产支付回调必须提供 amount 用于资金核对");
        if (productionMode && !providerTransactionId) throw new HttpError(400, "生产支付回调必须提供机构交易号");
        if (providerTransactionId.length > 180) throw new HttpError(400, "机构交易号过长");
        if (action !== "refund" && providerTransactionId && payment.provider_transaction_id && payment.provider_transaction_id !== providerTransactionId) throw new HttpError(409, "同一托管支付已绑定其他机构交易号");
        if (action !== "refund" && providerTransactionId) {
          const duplicateTransaction = db.prepare("SELECT id,order_id FROM payments WHERE provider_transaction_id=? AND id<>? LIMIT 1").get(providerTransactionId, payment.id);
          if (duplicateTransaction) throw new HttpError(409, "机构交易号已绑定其他托管支付，禁止重复落账");
        }
        if (productionMode && payload.amount !== undefined) moneyCents(payload.amount, "支付回调金额");
        if (action !== "refund" && payload.amount !== undefined && (!finitePositive(payload.amount, 1e12) || Math.abs(Number(payload.amount) - Number(payment.amount)) > 0.01)) throw new HttpError(409, "支付回调金额与托管记录不一致");
        if (db.prepare("SELECT id FROM settlement_records WHERE order_id=? LIMIT 1").get(orderId)) throw new HttpError(409, "交易已完成结算，禁止支付回调覆盖账本");
        const paidStates = new Set(["已入金待验收", "待验收分账", "机构已确认（验收后分账）", "已支付"]);
        const failedStates = new Set(["支付失败", "已退款"]);
        if (payment.status === "已分账") throw new HttpError(409, "支付记录已分账，禁止回调覆盖账本");
        if (action !== "refund" && paidStates.has(payment.status) && paymentState !== "paid") throw new HttpError(409, "资金已确认，禁止支付回调回退状态");
        if (action !== "refund" && failedStates.has(payment.status) && paymentState !== "failed") throw new HttpError(409, "支付已终止，必须新建支付单后重试");
        if (action === "refund") {
          const refundId = String(payload.refund_id || "").trim();
          if (!refundId) throw new HttpError(400, "退款回调缺少 refund_id");
          const refund = db.prepare("SELECT * FROM payment_refunds WHERE id=? AND order_id=? AND payment_id=? LIMIT 1").get(refundId, orderId, payment.id);
          if (!refund) throw new HttpError(404, "回调关联的退款记录不存在");
          const nextRefundStatus = refundSuccessStates.has(rawPaymentStatus) ? "已退款" : refundFailedStates.has(rawPaymentStatus) ? "退款失败" : "退款处理中";
          if (payload.amount !== undefined && Math.abs(Number(payload.amount) - Number(refund.amount)) > 0.01) throw new HttpError(409, "退款回调金额与退款申请不一致");
          if (refund.status === "已退款" && nextRefundStatus !== "已退款") throw new HttpError(409, "退款已完成，禁止回调回退状态");
          if (providerTransactionId) {
            const duplicateRefund = db.prepare("SELECT id FROM payment_refunds WHERE provider_ref=? AND id<>? LIMIT 1").get(providerTransactionId, refund.id);
            if (duplicateRefund) throw new HttpError(409, "退款机构交易号已绑定其他退款，禁止重复入账");
          }
          db.prepare("UPDATE payment_refunds SET status=?,provider_ref=COALESCE(provider_ref,?),updated_at=? WHERE id=?").run(nextRefundStatus, providerTransactionId || null, t, refund.id);
          if (nextRefundStatus === "已退款") {
            const refundTotalCents = Math.round(Number(db.prepare("SELECT COALESCE(SUM(amount),0) AS amount FROM payment_refunds WHERE payment_id=? AND status='已退款'").get(payment.id)?.amount || 0) * 100);
            const paymentCents = moneyCents(payment.amount, "原支付金额");
            const fullyRefunded = refundTotalCents >= paymentCents;
            db.prepare("UPDATE payments SET status=? WHERE id=?").run(fullyRefunded ? "已退款" : "部分退款", payment.id);
            db.prepare("UPDATE orders SET payment_status=?,updated_at=? WHERE id=?").run(fullyRefunded ? "已退款" : "部分退款", t, orderId);
            db.prepare("INSERT INTO fulfillment_events(order_id,step,title,evidence,actor,created_at) VALUES (?,?,?,?,?,?)").run(orderId, Math.max(0, Number(order.fulfillment_step)), "机构退款已确认", refundId, `integration-payment:${providerTransactionId || eventId}`, t);
            nextAction = fullyRefunded ? "退款机构已确认，交易资金已全部退回" : "退款机构已确认，交易资金已部分退回，剩余金额仍在原支付账本中";
          } else if (nextRefundStatus === "退款失败") {
            db.prepare("UPDATE orders SET payment_status='退款失败',updated_at=? WHERE id=?").run(t, orderId);
            nextAction = "退款机构处理失败，进入财务复核";
          } else {
            db.prepare("UPDATE orders SET payment_status='退款处理中',updated_at=? WHERE id=?").run(t, orderId);
            nextAction = "退款机构处理中，等待最终回执";
          }
        } else if (action === "release" && paymentState !== "paid") {
          throw new HttpError(409, "分账机构未确认成功，禁止按入金失败覆盖托管账本；请等待分账重试或进入人工复核");
        } else if (action === "release" && paymentState === "paid") {
          if (!paidStates.has(payment.status)) throw new HttpError(409, "分账回调前托管资金尚未进入可分账状态");
          const contract = db.prepare("SELECT id,status FROM contracts WHERE order_id=? ORDER BY id LIMIT 1").get(orderId);
          const accepted = db.prepare("SELECT id FROM acceptances WHERE order_id=? AND result='accepted' LIMIT 1").get(orderId);
          const invoice = db.prepare("SELECT id,amount,status FROM invoices WHERE order_id=? AND status='已开具' LIMIT 1").get(orderId);
          const orderAmount = Number(order.amount);
          const paymentAmount = Number(payment.amount);
          const invoiceAmount = Number(invoice?.amount);
          if (productionMode) {
            moneyCents(orderAmount, "订单金额");
            moneyCents(paymentAmount, "托管金额");
            if (invoice) moneyCents(invoiceAmount, "发票金额");
          }
          if (!contract || contract.status !== "已签署" || !accepted || !invoice || Math.abs(invoiceAmount - paymentAmount) > 0.01 || Math.abs(orderAmount - paymentAmount) > 0.01 || Math.abs(orderAmount - invoiceAmount) > 0.01) throw new HttpError(409, "合同、验收、发票和托管金额未全部一致，禁止机构分账回调落账");
          const feeCalc = platformFeeForOrder(orderId, Number(payment.amount));
          const instructionRef = String(payload.provider_transaction_id || payload.instruction_ref || eventId).trim().slice(0, 180);
          if (db.prepare("SELECT id FROM settlement_records WHERE order_id=? LIMIT 1").get(orderId)) throw new HttpError(409, "交易已经存在分账记录，禁止重复分账");
          db.prepare("INSERT INTO settlement_records(id,order_id,amount,platform_fee,platform_fee_base,status,instruction_ref,settled_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)").run(instructionRef, orderId, Number(payment.amount), feeCalc.fee, feeCalc.base, "settled", instructionRef, t, t);
          db.prepare("UPDATE payments SET status='已分账',paid_at=COALESCE(paid_at,?),provider_transaction_id=COALESCE(provider_transaction_id,?) WHERE id=?").run(t, providerTransactionId || null, payment.id);
          db.prepare("UPDATE orders SET status='已完成',payment_status='已分账',fulfillment_step=CASE WHEN fulfillment_step<11 THEN 11 ELSE fulfillment_step END,updated_at=? WHERE id=?").run(t, orderId);
          db.prepare("INSERT INTO fulfillment_events(order_id,step,title,evidence,actor,created_at) VALUES (?,?,?,?,?,?)").run(orderId, 10, "机构条件分账结算", instructionRef, `integration-payment:${payload.provider_transaction_id || eventId}`, t);
          db.prepare("INSERT INTO fulfillment_events(order_id,step,title,evidence,actor,created_at) VALUES (?,?,?,?,?,?)").run(orderId, 11, "四流三账对账关账", `RECON-${instructionRef}`, `integration-payment:${payload.provider_transaction_id || eventId}`, t);
          nextAction = "机构分账已确认，交易已完成四流三账关账";
        } else {
        const paid = paymentState === "paid";
        const nextPaymentStatus = paid ? (paidStates.has(payment.status) ? payment.status : "已入金待验收") : paymentState === "failed" ? "支付失败" : "机构待确认";
        db.prepare("UPDATE payments SET status=?,paid_at=?,provider_transaction_id=COALESCE(provider_transaction_id,?) WHERE id=?").run(nextPaymentStatus, paid ? (payment.paid_at || t) : payment.paid_at, providerTransactionId || null, payment.id);
        db.prepare("UPDATE orders SET payment_status=?,updated_at=? WHERE id=?").run(paid ? "机构已确认（验收后分账）" : nextPaymentStatus === "支付失败" ? "支付失败" : "机构待确认", t, orderId);
        nextAction = paid ? "资金已入托管，验收合格后才能分账" : nextPaymentStatus === "支付失败" ? "支付失败，请按机构退款/重试流程处理" : "等待支付机构最终确认";
        }
      } else if (provider === "invoice") {
        const invoiceNo = String(payload.invoice_no || "").trim();
        if (!invoiceNo) throw new HttpError(400, "发票回调缺少 invoice_no");
        if (invoiceNo.length > 80) throw new HttpError(400, "发票号码过长");
        const invoiceState = normalizeWebhookStatus("invoice", payload.status);
        if (!invoiceState) throw new HttpError(400, "发票回调状态不在允许范围");
        const invoice = db.prepare("SELECT * FROM invoices WHERE order_id=? LIMIT 1").get(orderId);
        if (!invoice) throw new HttpError(404, "回调关联的发票记录不存在");
        const duplicateInvoice = db.prepare("SELECT id,order_id FROM invoices WHERE invoice_no=? AND id<>? LIMIT 1").get(invoiceNo, invoice.id);
        if (duplicateInvoice) throw new HttpError(409, "发票号码已绑定其他交易，禁止重复入账");
        if (productionMode && payload.amount !== undefined) moneyCents(payload.amount, "发票回调金额");
        if (payload.amount !== undefined && (!finitePositive(payload.amount, 1e12) || Math.abs(Number(payload.amount) - Number(invoice.amount)) > 0.01)) throw new HttpError(409, "发票回调金额与订单发票金额不一致");
        if (productionMode && payload.amount === undefined) throw new HttpError(400, "生产发票回调必须提供 amount 用于四流核对");
        const accepted = db.prepare("SELECT id FROM acceptances WHERE order_id=? AND result='accepted' LIMIT 1").get(orderId);
        if (!accepted) throw new HttpError(409, "验收合格前不得接收开票回调");
        if (db.prepare("SELECT id FROM settlement_records WHERE order_id=? LIMIT 1").get(orderId)) throw new HttpError(409, "交易已完成结算，禁止发票回调覆盖账本");
        if (invoice.status === "已开具" && invoiceState !== "verified") throw new HttpError(409, "发票已开具，禁止回调回退状态");
        const verified = invoiceState === "verified";
        const nextInvoiceStatus = verified ? "已开具" : invoiceState === "failed" ? "开票失败" : "待验真";
        db.prepare("UPDATE invoices SET invoice_no=?,status=?,issued_at=? WHERE id=?").run(invoiceNo, nextInvoiceStatus, verified ? (invoice.issued_at || t) : invoice.issued_at, invoice.id);
        db.prepare("UPDATE orders SET invoice_status=?,updated_at=? WHERE id=?").run(verified ? "已验真" : nextInvoiceStatus === "开票失败" ? "开票失败" : "待验真", t, orderId);
        nextAction = verified ? "发票已验真，进入四流对账" : nextInvoiceStatus === "开票失败" ? "发票处理失败，请由开票机构重试" : "等待发票验真结果";
      }
    }
    if (provider === "regulator") {
      const subjectType = String(payload.subject_type || "").trim();
      const subjectId = String(payload.subject_id || "").trim();
      const authorityCode = String(payload.authority_code || "").trim();
      const receiptRef = String(payload.receipt_ref || "").trim();
      const regulatorState = normalizeWebhookStatus("regulator", payload.status);
      if (!subjectType || !subjectId || !authorityCode || !receiptRef || !regulatorState) throw new HttpError(400, "监管回调字段或状态不完整");
      if (subjectType.length > 40 || subjectId.length > 160 || authorityCode.length > 80 || receiptRef.length > 180) throw new HttpError(400, "监管回调字段长度不合法");
      const requestedSubmissionId = String(payload.submission_id || "").trim();
      const submission = requestedSubmissionId
        ? db.prepare("SELECT * FROM regulatory_submissions WHERE id=? AND subject_type=? AND subject_id=? AND authority_code=? LIMIT 1").get(requestedSubmissionId, subjectType, subjectId, authorityCode)
        : db.prepare("SELECT * FROM regulatory_submissions WHERE subject_type=? AND subject_id=? AND authority_code=? AND status NOT IN ('已回执','已撤回') ORDER BY created_at DESC LIMIT 1").get(subjectType, subjectId, authorityCode);
      if (!submission) throw new HttpError(404, "回调关联的监管提交记录不存在");
      if (submission.status === "已撤回" && regulatorState !== "withdrawn") throw new HttpError(409, "监管提交已撤回，禁止回调重新打开");
      if (submission.status === "已回执") {
        if (regulatorState !== "accepted" || submission.receipt_ref !== receiptRef) throw new HttpError(409, "监管提交已完成，禁止回调覆盖回执证据");
      }
      const nextStatus = regulatorState === "accepted" ? "已回执" : regulatorState === "withdrawn" ? "已撤回" : regulatorState === "failed" ? "失败" : "处理中";
      const failureCode = regulatorState === "failed" ? String(payload.failure_code || "REGULATOR_REJECTED").slice(0, 80) : null;
      const failureMessage = regulatorState === "failed" ? String(payload.failure_message || "监管机构未受理").slice(0, 240) : null;
      db.prepare("UPDATE regulatory_submissions SET status=?,receipt_ref=?,failure_code=?,failure_message=?,updated_at=? WHERE id=?").run(nextStatus, receiptRef, failureCode, failureMessage, t, submission.id);
      nextAction = nextStatus === "已回执" ? "监管/检测机构已回执，数据提交完成" : nextStatus === "失败" ? "监管/检测机构处理失败，进入复核与补偿" : nextStatus === "已撤回" ? "监管提交已撤回" : "监管/检测机构处理中，等待最终回执";
    }
    db.prepare("UPDATE integration_callbacks SET status='processed',processed_at=? WHERE idempotency_key=?").run(t, callbackStorageKey);
    log(`integration-${provider}`, "WEBHOOK_ACCEPTED", orderId || eventId, `${eventId} · ${nextAction}`);
    db.exec("COMMIT");
    return json(res, 202, { accepted: true, provider, event_id: eventId, replayed: false, next_action: nextAction });
  } catch (cause) {
    db.exec("ROLLBACK");
    throw cause;
  }
};

const server = createServer(async (req, res) => {
 try {
  if (req.method === "OPTIONS") return json(res, 204, null);
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;
  if (path === "/health" || path === "/health/live") return json(res, 200, { status: "ok", database: "sqlite", dbPath: productionMode ? undefined : dbPath, version: healthVersion, platform_version: platformVersion, api_version: apiReleaseVersion, runtime_mode: runtimeMode, reserved_ports: integrationPorts });
  if (path === "/health/ready") {
    const requiredTables = ["organizations", "merchants", "merchant_identity", "products", "orders", "order_items", "inventory_reservations", "contracts", "payments", "payment_refunds", "invoices", "shipments", "acceptances", "merchant_service_areas", "order_delivery_constraints", "regulatory_submissions", "audit_logs", "operation_progress", "request_idempotency", "integration_callbacks", "institution_outbox", "user_sessions"];
    const placeholders = requiredTables.map(() => "?").join(",");
    const rows = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name IN (${placeholders})`).all(...requiredTables);
    const present = new Set(rows.map((row) => row.name));
    const missing = requiredTables.filter((name) => !present.has(name));
    if (missing.length) return error(res, 503, `数据库迁移未完成：缺少 ${missing.join(",")}`);
    // 只检查表存在不足以证明生产库可用；在就绪探针中执行轻量一致性检查，
    // 让反向代理/编排系统能够及时摘除损坏或未完成恢复的实例。
    const integrity = db.prepare("PRAGMA quick_check").get();
    if (String(integrity?.quick_check || "").toLowerCase() !== "ok") return error(res, 503, "数据库一致性检查未通过");
    return json(res, 200, { status: "ready", database: "sqlite", version: healthVersion, platform_version: platformVersion, api_version: apiReleaseVersion, runtime_mode: runtimeMode, seeded_demo_data: seedDemoData });
  }
  if (path === "/api/v1/platform/capabilities" && req.method === "GET") {
    return json(res, 200, platformCapabilities());
  }
  if (path === "/api/v1/auth/dev-session" && req.method === "GET") {
    if (productionMode) return error(res, 404, "生产环境未启用开发会话接口");
    return json(res, 200, { token: apiToken, user: { id: "local-admin", name: "本地演示管理员", role: "admin" } });
  }
  if (path === "/api/v1/auth/wechat/session" && req.method === "POST") {
    if (!productionMode) return json(res, 200, { token: apiToken, user: { id: "local-admin", name: "本地演示管理员", role: "admin" }, mode: "local-demo" });
    if (!wechatAuthReady) return error(res, 503, "微信身份认证尚未完成机构联调，生产登录暂不可用");
    const payload = await body(req);
    const code = String(payload.code || "").trim();
    if (!code || code.length > 512) return error(res, 400, "微信登录 code 不能为空且长度不合法");
    let session;
    try {
      const endpoint = new URL(wechatSessionUrl);
      endpoint.searchParams.set("appid", wechatAppId);
      endpoint.searchParams.set("secret", wechatAppSecret);
      endpoint.searchParams.set("js_code", code);
      endpoint.searchParams.set("grant_type", "authorization_code");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const response = await fetch(endpoint, { signal: controller.signal, headers: { accept: "application/json" } });
        const raw = await response.text();
        let result;
        try { result = JSON.parse(raw); } catch { throw new HttpError(502, "微信身份服务返回非 JSON"); }
        if (!response.ok || result?.errcode || !result?.openid) throw new HttpError(401, `微信登录校验失败${result?.errmsg ? `：${result.errmsg}` : ""}`);
        session = result;
      } finally { clearTimeout(timeout); }
    } catch (cause) {
      if (cause instanceof HttpError) throw cause;
      throw new HttpError(503, "微信身份服务暂不可用，请稍后重试");
    }
    const configured = wechatOpenidPrincipals[session.openid];
    if (!configured) return error(res, 403, "微信账号尚未绑定已审核企业主体，请先完成商户入驻和授权");
    const merchantIds = Array.isArray(configured.merchant_ids) ? configured.merchant_ids.map(String) : configured.merchant_id ? [String(configured.merchant_id)] : [];
    if (!configured.id || !configured.name || !configured.role || !merchantIds.length || !Object.prototype.hasOwnProperty.call(merchantBusinessRoles, configured.role)) return error(res, 403, "微信账号绑定的主体授权配置不完整");
    const verified = db.prepare(`SELECT COUNT(*) AS n FROM merchants WHERE id IN (${merchantIds.map(() => "?").join(",")}) AND license_status='verified' AND bank_status='verified'`).get(...merchantIds);
    if (Number(verified?.n || 0) !== merchantIds.length || merchantIds.some((merchantId) => !merchantVerificationReady(merchantId))) return error(res, 403, "微信账号绑定主体尚未完成经营资质和对公账户核验");
    const token = randomBytes(32).toString("base64url");
    const principal = { type: "user", id: String(configured.id), name: String(configured.name), role: String(configured.role), merchant_ids: merchantIds, application_ids: Array.isArray(configured.application_ids) ? configured.application_ids.map(String) : [] };
    const createdAt = Date.now(), expiresAt = new Date(createdAt + 12 * 60 * 60 * 1000).toISOString();
    db.prepare("DELETE FROM user_sessions WHERE expires_at<? OR revoked_at IS NOT NULL").run(new Date().toISOString());
    db.prepare("INSERT INTO user_sessions(token_hash,principal_json,expires_at,created_at,revoked_at) VALUES (?,?,?,?,NULL)").run(sessionTokenHash(token), JSON.stringify(principal), expiresAt, new Date(createdAt).toISOString());
    log(`${principal.name}（${principal.id}）`, "WECHAT_LOGIN", principal.id, "微信 code 已换取短时会话，主体绑定和对公账户状态已核验");
    return json(res, 200, { token, expires_at: expiresAt, user: { id: principal.id, name: principal.name, role: principal.role, merchant_ids: principal.merchant_ids } });
  }
  if (path === "/api/v1/auth/logout" && req.method === "POST") {
    const token = bearerToken(req);
    if (token) db.prepare("UPDATE user_sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL").run(now(), sessionTokenHash(token));
    return json(res, 200, { logged_out: true });
  }
  if (path === "/api/v1/me") {
    if (!authorized(req)) return error(res, 401, "需要登录授权");
    const principal = principalFor(req);
    return json(res, 200, { id: principal.id, name: principal.name, type: principal.type, role: principal.role, merchant_ids: principal.merchant_ids, permissions: principal.type === "user" ? ["trade.read.own", `trade.${principal.role}.act`] : ["trade.read", "trade.write", "admin.read"] });
  }
  if (path === "/api/v1/trade-config" && req.method === "GET") return json(res, 200, publicTradeConfig());
  if (path === "/api/v1/operations/catalog" && req.method === "GET") {
    if (!authorized(req)) return error(res, 401, "需要业务查看授权");
    const modules = operationWorkflowRules.map((item) => operationView(item.key)).map((item) => privileged(req) ? item : { ...item, events: [] });
    const domains = ["production", "circulation", "credit", "livelihood"].map((domain) => ({ domain, modules: modules.filter((item) => item.domain === domain), completed: modules.filter((item) => item.domain === domain && item.current_step >= item.steps.length - 1).length }));
    return json(res, 200, { version: "v8530", domains, modules });
  }
  if (path === "/api/v1/platform/features" && req.method === "GET") {
    if (!authorized(req)) return error(res, 401, "需要业务查看授权");
    const features = platformFeatureRules.map(featureView);
    const domains = ["production", "circulation", "credit", "livelihood"].map((domain) => ({ domain, features: features.filter((item) => item.domain === domain) }));
    return json(res, 200, { version: "v8530", domains, features });
  }
  if (path === "/api/v1/platform/events" && req.method === "GET") {
    if (!authorized(req)) return error(res, 401, "需要业务审计查看授权");
    if (!privileged(req)) return error(res, 403, "普通商户无权查看全平台业务事件");
    const feature = url.searchParams.get("feature");
    const domain = url.searchParams.get("domain");
    const rows = db.prepare(`SELECT * FROM business_events WHERE (? IS NULL OR feature_key=?) AND (? IS NULL OR domain=?) ORDER BY id DESC LIMIT 100`).all(feature || null, feature || null, domain || null, domain || null);
    return json(res, 200, rows.map(businessEventView));
  }
  if (path === "/api/v1/platform/events" && req.method === "POST") {
    if (!authorized(req)) return error(res, 401, "需要业务操作授权");
    const payload = await body(req);
    const idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产写请求必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    const featureKey = String(payload.feature_key || "");
    const feature = platformFeatureRules.find((item) => item.key === featureKey);
    const action = String(payload.action || "").trim();
    if (!feature || !action) return error(res, 400, "功能标识和动作不能为空");
    const principal = principalFor(req);
    const actor = productionMode ? `${principal.name}（${principal.id}）` : String(payload.actor || principal.name || "前台经办人");
    const idempotencyKey = idemKey || null;
    if (idempotencyKey) {
      const existed = db.prepare("SELECT * FROM business_events WHERE idempotency_key=?").get(idempotencyKey);
      if (existed) return json(res, 200, businessEventView(existed));
    }
    const t = now();
    const result = db.prepare("INSERT INTO business_events(feature_key,domain,action,actor,payload,status,idempotency_key,created_at) VALUES (?,?,?,?,?,?,?,?)").run(featureKey, feature.domain, action, actor, JSON.stringify(payload.payload || {}), "accepted", idempotencyKey, t);
    log(actor, "PLATFORM_EVENT", featureKey, `${action}${payload.reference_id ? ` · ${payload.reference_id}` : ""}`);
    const data = businessEventView(db.prepare("SELECT * FROM business_events WHERE id=?").get(result.lastInsertRowid));
    saveIdempotent(req, idemKey, 201, data, payload);
    return json(res, 201, data);
  }
  const regulatorySubmissionMatch = path.match(/^\/api\/v1\/regulatory\/submissions(?:\/([^/]+))?$/);
  if (regulatorySubmissionMatch && req.method === "GET") {
    if (!authorized(req)) return error(res, 401, "需要监管数据查看授权");
    if (productionMode && !hasAdminPermission(req, "audit")) return error(res, 403, "只有审核岗位或超级管理员可以查看监管提交");
    const id = regulatorySubmissionMatch[1];
    if (id) {
      const row = db.prepare("SELECT * FROM regulatory_submissions WHERE id=?").get(id);
      return row ? json(res, 200, regulatorySubmissionView(row)) : error(res, 404, "监管提交记录不存在");
    }
    return json(res, 200, db.prepare("SELECT * FROM regulatory_submissions ORDER BY created_at DESC LIMIT 200").all().map(regulatorySubmissionView));
  }
  if (regulatorySubmissionMatch && req.method === "POST" && !regulatorySubmissionMatch[1]) {
    if (!authorized(req)) return error(res, 401, "需要监管数据提交授权");
    if (productionMode && !hasAdminPermission(req, "audit", true)) return error(res, 403, "只有审核岗位或超级管理员可以提交监管数据");
    const payload = await body(req);
    const idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产监管提交必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    if (productionMode && process.env.SHUZHI_REGULATOR_READY !== "true") return error(res, 503, "监管/检测机构尚未完成联调，暂不接受生产提交");
    const action = String(payload.action || "").trim().toLowerCase();
    const subjectType = String(payload.subject_type || "").trim().toLowerCase();
    const subjectId = String(payload.subject_id || "").trim();
    const authorityCode = String(payload.authority_code || "").trim();
    const minimizationVersion = String(payload.data_minimization_version || "").trim();
    const evidenceRefs = Array.isArray(payload.evidence_refs) ? payload.evidence_refs.map((item) => String(item || "").trim()).filter(Boolean) : [];
    if (!["submit", "query", "withdraw"].includes(action)) return error(res, 400, "监管提交 action 必须为 submit、query 或 withdraw");
    if (!["merchant", "product", "batch", "shipment", "inspection", "quarantine"].includes(subjectType)) return error(res, 400, "监管提交 subject_type 不在允许范围");
    if (!subjectId || subjectId.length > 160 || !authorityCode || authorityCode.length > 80 || !minimizationVersion || minimizationVersion.length > 80) return error(res, 400, "监管提交主体、机构编码和最小化版本不能为空且长度不合法");
    if (!evidenceRefs.length || evidenceRefs.length > 20 || evidenceRefs.some((item) => item.length > 240)) return error(res, 400, "监管提交必须提供 1—20 条证据引用");
    if (productionMode && ["batch", "inspection", "quarantine"].includes(subjectType)) return error(res, 409, `生产监管提交暂不支持未建模的 ${subjectType} 主体，必须先完成真实业务对象建模`);
    if (subjectType === "merchant") {
      const merchant = db.prepare("SELECT id FROM merchants WHERE id=?").get(subjectId);
      if (!merchant) return error(res, 404, "监管提交关联的商户不存在");
      if (productionMode && !merchantVerificationReady(subjectId)) return error(res, 409, "商户主体尚未完成资质与对公账户核验，禁止提交监管数据");
    }
    if (subjectType === "product") {
      const product = db.prepare("SELECT id,merchant_id FROM products WHERE id=?").get(subjectId);
      if (!product) return error(res, 404, "监管提交关联的商品不存在");
      if (productionMode && !merchantVerificationReady(product.merchant_id)) return error(res, 409, "商品所属供货主体尚未完成资质与对公账户核验，禁止提交监管数据");
    }
    if (subjectType === "shipment") {
      const shipment = db.prepare("SELECT s.id,o.buyer_id,o.supplier_id FROM shipments s JOIN orders o ON o.id=s.order_id WHERE s.id=?").get(subjectId);
      if (!shipment) return error(res, 404, "监管提交关联的运单不存在");
      if (productionMode && (!merchantVerificationReady(shipment.buyer_id) || !merchantVerificationReady(shipment.supplier_id))) return error(res, 409, "运单关联交易主体尚未完成资质与对公账户核验，禁止提交监管数据");
    }
    const prior = db.prepare("SELECT * FROM regulatory_submissions WHERE subject_type=? AND subject_id=? AND authority_code=? AND status NOT IN ('失败','已撤回') ORDER BY created_at DESC LIMIT 1").get(subjectType, subjectId, authorityCode);
    if (action !== "submit" && !prior) return error(res, 409, `监管 ${action} 必须关联一条未完成的提交记录`);
    const submissionId = `REG-${randomUUID().replaceAll("-", "").slice(0, 24).toUpperCase()}`;
    const t = now();
    db.exec("BEGIN");
    try {
      db.prepare("INSERT INTO regulatory_submissions(id,action,subject_type,subject_id,authority_code,data_minimization_version,evidence_refs,status,receipt_ref,failure_code,failure_message,idempotency_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(submissionId, action, subjectType, subjectId, authorityCode, minimizationVersion, JSON.stringify(evidenceRefs), "待机构受理", null, null, null, idemKey || `LOCAL-REG-${submissionId}`, t, t);
      if (productionMode) {
        const queued = enqueueProductionInstitutionCommand({
          provider: "regulator",
          aggregateType: "regulatory_submission",
          aggregateId: submissionId,
          commandType: action,
          idempotencyKey: `REGULATOR:${action}:${submissionId}`,
          command: {
            command_id: `CMD-REGULATOR-${submissionId}`,
            action,
            submission_id: submissionId,
            subject_type: subjectType,
            subject_id: subjectId,
            authority_code: authorityCode,
            data_minimization_version: minimizationVersion,
            evidence_refs: evidenceRefs,
          },
          now: t,
        });
        const data = { ...regulatorySubmissionView(db.prepare("SELECT * FROM regulatory_submissions WHERE id=?").get(submissionId)), institution_outbox: publicInstitutionCommand(queued) };
        log(actorFor(req, "监管数据审核岗"), "QUEUE_REGULATORY_SUBMISSION", submissionId, `${action} · ${subjectType}/${subjectId} · ${authorityCode}`);
        saveIdempotent(req, idemKey, 202, data, payload);
        db.exec("COMMIT");
        return json(res, 202, data);
      }
      log(actorFor(req, "监管数据审核岗"), "CREATE_LOCAL_REGULATORY_SUBMISSION", submissionId, `${action} · ${subjectType}/${subjectId} · ${authorityCode}`);
      const data = regulatorySubmissionView(db.prepare("SELECT * FROM regulatory_submissions WHERE id=?").get(submissionId));
      saveIdempotent(req, idemKey, 201, data, payload);
      db.exec("COMMIT");
      return json(res, 201, data);
    } catch (cause) {
      db.exec("ROLLBACK");
      throw cause;
    }
  }
  const webhookMatch = path.match(/^\/api\/v1\/integrations\/(ca|logistics|payment|invoice|regulator)\/webhook$/);
  if (webhookMatch && req.method === "POST") return await processIntegrationWebhook(webhookMatch[1], req, res);
  const operationMatch = path.match(/^\/api\/v1\/operations\/([^/]+)$/);
  if (operationMatch && req.method === "GET") {
    if (!authorized(req)) return error(res, 401, "需要业务查看授权");
    const data = operationView(operationMatch[1]);
    return data ? json(res, 200, privileged(req) ? data : { ...data, events: [] }) : error(res, 404, "业务模块不存在");
  }
  const operationAdvanceMatch = path.match(/^\/api\/v1\/operations\/([^/]+)\/(advance|reset)$/);
  if (operationAdvanceMatch && req.method === "POST") {
    if (!authorized(req)) return error(res, 401, "需要业务操作授权");
    if (productionMode && !hasAdminPermission(req, "data", true)) return error(res, 403, "生产工作流只能由具备数据管理写权限的后台岗位推进");
    const [, moduleKey, action] = operationAdvanceMatch;
    const payload = await body(req), idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产业务工作流必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    const rule = operationWorkflowRules.find((item) => item.key === moduleKey);
    if (!rule) return error(res, 404, "业务模块不存在");
    const current = db.prepare("SELECT * FROM operation_progress WHERE module_key=?").get(moduleKey) || { step: -1 };
    const t = now();
    if (action === "reset") {
      if (productionMode) return error(res, 403, "生产环境禁止重置业务工作流");
      db.prepare("UPDATE operation_progress SET step=-1,status='ready',updated_at=? WHERE module_key=?").run(t, moduleKey);
      log("local-demo", "RESET_OPERATION", moduleKey, `${rule.name}工作流已重置`);
      return json(res, 200, operationView(moduleKey));
    }
    const next = Number(current.step) + 1;
    if (next >= rule.steps.length) return error(res, 409, "该业务模块已完成，请先重置后重新演示");
    const evidence = String(payload.evidence || `OP-${rule.domain.toUpperCase()}-${Date.now().toString().slice(-8)}-${next + 1}`);
    const operationActor = productionMode ? actorFor(req, "业务运营岗") : String(payload.actor || "前台经办人");
    db.prepare("UPDATE operation_progress SET step=?,status=?,updated_at=? WHERE module_key=?").run(next, next === rule.steps.length - 1 ? "completed" : "running", t, moduleKey);
    db.prepare("INSERT INTO operation_events(module_key,domain,step,title,evidence,actor,result,created_at) VALUES (?,?,?,?,?,?,?,?)").run(moduleKey, rule.domain, next, rule.steps[next], evidence, operationActor, "环节已完成，证据已归档", t);
    log(operationActor, "ADVANCE_OPERATION", moduleKey, `${rule.steps[next]} · ${evidence}`);
    const data = operationView(moduleKey);
    saveIdempotent(req, idemKey, 200, data, payload);
    return json(res, 200, data);
  }
  if (path.startsWith("/api/v1/admin") && !authorized(req)) return error(res, 401, "需要管理员授权");
  if (path.startsWith("/api/v1/admin") && !adminAuthorized(req)) return error(res, 403, "当前令牌不是管理员岗位令牌");
  if (path === "/api/v1/admin/context" && req.method === "GET") {
    const roleKey = productionMode ? adminRole(req) : (url.searchParams.get("role") || adminRole(req));
    return json(res, 200, adminContext(roleKey));
  }
  if (path === "/api/v1/admin/context/role" && req.method === "POST") {
    if (productionMode) return error(res, 403, "生产环境禁止在界面切换管理员角色，请使用对应岗位令牌重新登录");
    const payload = await body(req), roleKey = String(payload.role_key || "");
    if (!Object.prototype.hasOwnProperty.call(adminRoleRules, roleKey)) return error(res, 400, "管理员角色不存在");
    log("local-admin", "SWITCH_ADMIN_ROLE", roleKey, `${adminRoleRules[roleKey].name}权限上下文已切换`);
    return json(res, 200, adminContext(roleKey));
  }
  const areaMatch = path.match(/^\/api\/v1\/merchants\/([^/]+)\/service-area$/);
  if (areaMatch && req.method === "GET") {
    if (!authorized(req)) return error(res, 401, "需要商户信息查看授权");
    if (!canAccessMerchant(req, areaMatch[1])) return error(res, 403, "无权查看该商户服务区域");
    const area = serviceAreaView(areaMatch[1]);
    return area ? json(res, 200, area) : error(res, 404, "商户服务区域未配置");
  }
  if (areaMatch && req.method === "POST") {
    if (!authorized(req)) return error(res, 401, "需要商户管理授权");
    if (productionMode && !hasAdminPermission(req, "merchant", true)) return error(res, 403, "生产服务区域只能由后台商户管理岗位维护");
    if (!canAccessMerchant(req, areaMatch[1])) return error(res, 403, "无权维护该商户服务区域");
    const payload = await body(req), idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产服务区域维护必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    const merchant = db.prepare("SELECT id FROM merchants WHERE id=?").get(areaMatch[1]);
    if (!merchant) return error(res, 404, "商户不存在");
    const lat = Number(payload.center_lat), lng = Number(payload.center_lng), radius = Number(payload.radius_km), maxDailyOrders = Number(payload.max_daily_orders || 0);
    const areaType = String(payload.area_type || "radius").trim();
    const regions = Array.isArray(payload.regions) ? payload.regions.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 50) : [];
    const deliveryModes = Array.isArray(payload.delivery_modes) ? payload.delivery_modes.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 20) : [];
    const evidenceRef = String(payload.evidence_ref || "").trim().slice(0, 180);
    const regionsValid = payload.regions === undefined || payload.regions === null || Array.isArray(payload.regions);
    const deliveryModesValid = payload.delivery_modes === undefined || payload.delivery_modes === null || Array.isArray(payload.delivery_modes);
    if (!regionsValid || !deliveryModesValid || !["radius", "region"].includes(areaType) || ![lat, lng, radius].every(Number.isFinite) || lat < -90 || lat > 90 || lng < -180 || lng > 180 || radius <= 0 || radius > 500 || !Number.isInteger(maxDailyOrders) || maxDailyOrders < 0 || maxDailyOrders > 100000) return error(res, 400, "服务中心类型、坐标、半径、区域或日订单上限不合法");
    if (productionMode && !evidenceRef) return error(res, 400, "生产服务区域维护必须提供后台/机构验收证据引用");
    const t = now();
    db.prepare("INSERT INTO merchant_service_areas VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET area_type=excluded.area_type,center_lat=excluded.center_lat,center_lng=excluded.center_lng,radius_km=excluded.radius_km,regions=excluded.regions,delivery_modes=excluded.delivery_modes,max_daily_orders=excluded.max_daily_orders,status='active',updated_at=excluded.updated_at").run(`AREA-${merchant.id}`, merchant.id, areaType, lat, lng, radius, JSON.stringify(regions), JSON.stringify(deliveryModes), maxDailyOrders, "active", t);
    log(actorFor(req, "服务区域管理员"), "UPDATE_SERVICE_AREA", merchant.id, `类型${areaType} · 半径${radius}km · 证据${evidenceRef || "本地演示"}`);
    const data = serviceAreaView(merchant.id);
    saveIdempotent(req, idemKey, 200, data, payload);
    return json(res, 200, data);
  }
  const dispatchMatch = path.match(/^\/api\/v1\/trades\/([^/]+)\/dispatch-check$/);
  if (dispatchMatch && req.method === "GET") {
    if (!authorized(req)) return error(res, 401, "需要交易查看授权");
    const order = db.prepare("SELECT * FROM orders WHERE id=?").get(dispatchMatch[1]);
    if (!order) return error(res, 404, "交易不存在");
    if (!canAccessOrder(req, order)) return error(res, 403, "无权查看该交易派单结果");
    const lat = Number(url.searchParams.get("lat")), lng = Number(url.searchParams.get("lng"));
    if (![lat, lng].every(Number.isFinite)) return error(res, 400, "收货地必须提供有效经纬度");
    const area = serviceAreaView(order.supplier_id);
    if (!area) return error(res, 409, "供货商未配置服务半径");
    const distance = distanceKm(area.center_lat, area.center_lng, lat, lng);
    return json(res, 200, { order_id: order.id, supplier_id: order.supplier_id, distance_km: Number(distance.toFixed(2)), radius_km: area.radius_km, within_radius: distance <= area.radius_km, delivery_modes: area.delivery_modes, regions: area.regions, decision: distance <= area.radius_km ? "可派单" : "超出服务半径，需人工审批" });
  }
  if (path === "/api/v1/merchant-applications" && req.method === "POST") {
    const payload = await body(req);
    const idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产入驻申请必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    const required = ["entity_type", "name", "credit_code", "legal_name"];
    if (required.some((key) => !String(payload[key] || "").trim())) return error(res, 400, "主体名称、统一社会信用代码和法人不能为空");
    if (!/^[0-9A-Z]{18}$/i.test(String(payload.credit_code).trim())) return error(res, 400, "统一社会信用代码格式不正确");
    const creditCode = String(payload.credit_code).trim().toUpperCase();
    const duplicate = db.prepare("SELECT id,status FROM merchant_applications WHERE credit_code=? LIMIT 1").get(creditCode);
    if (duplicate) return error(res, 409, "该统一社会信用代码已提交或已入驻");
    const id = `MA-${new Date().getFullYear()}-${randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
    const t = now();
    const businessRole = String(payload.business_role || "supplier").trim();
    if (!Object.prototype.hasOwnProperty.call(merchantBusinessRoles, businessRole)) return error(res, 400, "经营角色不合法，请选择供应商、采购商、农资采购方或基层服务站");
    db.prepare("INSERT INTO merchant_applications VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(id, String(payload.entity_type), String(payload.name).trim(), creditCode, String(payload.legal_name).trim(), String(payload.legal_id_masked || ""), String(payload.address || ""), String(payload.scope || ""), String(payload.capital || ""), JSON.stringify(payload.documents || []), "pending", null, null, t, null, null, t, businessRole);
    log("merchant-applicant", "SUBMIT_APPLICATION", id, "商户入驻申请已提交，等待后台审核");
    const data = applicationView(id);
    saveIdempotent(req, idemKey, 201, data, payload);
    return json(res, 201, data);
  }
  const applicationMatch = path.match(/^\/api\/v1\/merchant-applications\/([^/]+)$/);
  if (applicationMatch && req.method === "GET") {
    if (!authorized(req)) return error(res, 401, "需要入驻申请查看授权");
    if (!privileged(req) && !(principalFor(req)?.application_ids || []).includes(applicationMatch[1])) return error(res, 403, "无权查看该入驻申请");
    const data = applicationView(applicationMatch[1]);
    return data ? json(res, 200, data) : error(res, 404, "入驻申请不存在");
  }
  const reviewMatch = path.match(/^\/api\/v1\/admin\/merchant-applications\/([^/]+)\/review$/);
  if (reviewMatch && req.method === "POST") {
    // 商户招商/启用与资质审核分权：运营岗可以维护已通过主体的运营状态，
    // 但不能替代审核岗完成准入结论，避免同一岗位既招募又审批。
    if (!hasAdminPermission(req, "audit", true)) return error(res, 403, "当前管理员角色无商户审核操作权限");
    const payload = await body(req), decision = String(payload.decision || ""), idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产商户审核必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    const app = db.prepare("SELECT * FROM merchant_applications WHERE id=?").get(reviewMatch[1]);
    if (!app) return error(res, 404, "入驻申请不存在");
    if (!["pending", "review"].includes(app.status)) return error(res, 409, "该入驻申请已完成审核，不能重复改变结论");
    if (!["approve", "reject", "review"].includes(decision)) return error(res, 400, "审核决定不合法");
    const t = now();
    if (decision === "approve") {
      const orgId = `org-${app.id.toLowerCase()}`, merchantId = `m-${app.id.toLowerCase()}`;
      const businessRole = Object.prototype.hasOwnProperty.call(merchantBusinessRoles, app.business_role) ? app.business_role : "supplier";
      db.prepare("INSERT OR IGNORE INTO organizations VALUES (?,?,?,?,?,?)").run(orgId, app.name, app.entity_type, app.address || "", "active", t);
      // 生产环境的“准入通过”只代表资料审核通过，不等于营业执照和对公账户
      // 已被外部机构核验；必须由独立核验接口写入 verified 后才能启用交易。
      const initialVerificationStatus = productionMode ? "pending" : "verified";
      db.prepare("INSERT OR IGNORE INTO merchants VALUES (?,?,?,?,?,?,?,?)").run(merchantId, orgId, app.name, businessRole, initialVerificationStatus, initialVerificationStatus, "低", t);
      db.prepare("INSERT OR IGNORE INTO merchant_identity(merchant_id,credit_code,legal_name,status,updated_at) VALUES (?,?,?,?,?)").run(merchantId, app.credit_code, app.name, "pending", t);
      db.prepare("UPDATE merchant_applications SET status='approved',review_note=?,reviewer=?,reviewed_at=?,updated_at=? WHERE id=?").run(String(payload.note || "后台双人复核通过"), actorFor(req, "商户审核岗"), t, t, app.id);
    } else {
      db.prepare("UPDATE merchant_applications SET status=?,review_note=?,reviewer=?,reviewed_at=?,updated_at=? WHERE id=?").run(decision === "reject" ? "rejected" : "review", String(payload.note || ""), actorFor(req, "商户审核岗"), t, t, app.id);
    }
    log(actorFor(req, "商户审核岗"), `REVIEW_APPLICATION_${decision.toUpperCase()}`, app.id, String(payload.note || "").slice(0, 160));
    const data = applicationView(app.id);
    saveIdempotent(req, idemKey, 200, data, payload);
    return json(res, 200, data);
  }
  const verificationMatch = path.match(/^\/api\/v1\/admin\/merchants\/([^/]+)\/verification$/);
  if (verificationMatch && req.method === "POST") {
    if (!hasAdminPermission(req, "audit", true)) return error(res, 403, "当前管理员角色无主体核验操作权限");
    const payload = await body(req), merchantId = verificationMatch[1], idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产主体核验必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    const merchant = db.prepare("SELECT * FROM merchants WHERE id=?").get(merchantId);
    if (!merchant) return error(res, 404, "商户不存在");
    const types = ["license", "bank"];
    const updates = types.map((type) => ({ type, status: payload[`${type}_status`] == null ? null : String(payload[`${type}_status`]).trim() })).filter((item) => item.status != null);
    if (!updates.length || updates.some((item) => !["pending", "verified", "rejected"].includes(item.status))) return error(res, 400, "至少提供 license_status 或 bank_status，且状态必须为 pending、verified 或 rejected");
    const provider = String(payload.provider || "").trim().slice(0, 120);
    const evidenceRef = String(payload.evidence_ref || "").trim().slice(0, 240);
    if (productionMode && updates.some((item) => item.status !== "pending") && (!provider || !evidenceRef)) return error(res, 400, "生产核验结论必须提供机构名称和证据引用");
    const suppliedCreditCode = String(payload.credit_code || "").trim().toUpperCase();
    if (suppliedCreditCode && !/^[0-9A-Z]{18}$/.test(suppliedCreditCode)) return error(res, 400, "统一社会信用代码必须为 18 位大写字母或数字");
    const registeredIdentity = db.prepare("SELECT credit_code FROM merchant_identity WHERE merchant_id=?").get(merchantId);
    if (productionMode && updates.some((item) => item.status === "verified") && !suppliedCreditCode && !registeredIdentity?.credit_code) return error(res, 400, "生产核验通过必须提供统一社会信用代码，或先完成主体身份备案");
    if (productionMode && suppliedCreditCode && registeredIdentity?.credit_code && String(registeredIdentity.credit_code).toUpperCase() !== suppliedCreditCode) return error(res, 409, "统一社会信用代码与既有主体备案不一致，禁止覆盖");
    if (suppliedCreditCode && db.prepare("SELECT merchant_id FROM merchant_identity WHERE credit_code=? AND merchant_id<>?").get(suppliedCreditCode, merchantId)) return error(res, 409, "统一社会信用代码已绑定其他商户，禁止重复使用");
    const actor = actorFor(req, "主体核验岗");
    const t = now();
    db.exec("BEGIN");
    try {
      for (const item of updates) {
        const column = item.type === "license" ? "license_status" : "bank_status";
        db.prepare(`UPDATE merchants SET ${column}=?,updated_at=? WHERE id=?`).run(item.status, t, merchantId);
        const verificationId = `MV-${merchantId}-${item.type}`;
        db.prepare("INSERT INTO merchant_verifications(id,merchant_id,verification_type,status,provider,evidence_ref,verified_by,verified_at,expires_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(merchant_id,verification_type) DO UPDATE SET status=excluded.status,provider=excluded.provider,evidence_ref=excluded.evidence_ref,verified_by=excluded.verified_by,verified_at=excluded.verified_at,expires_at=excluded.expires_at,updated_at=excluded.updated_at").run(verificationId, merchantId, item.type, item.status, provider || "本地演示核验", evidenceRef || `LOCAL-${item.type.toUpperCase()}`, actor, item.status === "verified" ? t : null, payload.expires_at ? String(payload.expires_at).slice(0, 40) : null, t, t);
      }
      if (suppliedCreditCode) {
        db.prepare("INSERT INTO merchant_identity(merchant_id,credit_code,legal_name,status,provider,evidence_ref,verified_at,updated_at) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(merchant_id) DO UPDATE SET legal_name=excluded.legal_name,status=excluded.status,provider=excluded.provider,evidence_ref=excluded.evidence_ref,verified_at=excluded.verified_at,updated_at=excluded.updated_at").run(merchantId, suppliedCreditCode, merchant.name, updates.some((item) => item.status === "verified") ? "verified" : "pending", provider, evidenceRef, updates.some((item) => item.status === "verified") ? t : null, t);
      }
      log(actor, "VERIFY_MERCHANT", merchantId, updates.map((item) => `${item.type}:${item.status}`).join(",") + (evidenceRef ? ` · ${evidenceRef}` : ""));
      const data = db.prepare("SELECT * FROM merchants WHERE id=?").get(merchantId);
      saveIdempotent(req, idemKey, 200, data, payload);
      db.exec("COMMIT");
      return json(res, 200, data);
    } catch (cause) {
      db.exec("ROLLBACK");
      throw cause;
    }
  }
  const activateMatch = path.match(/^\/api\/v1\/admin\/merchant-applications\/([^/]+)\/activate$/);
  if (activateMatch && req.method === "POST") {
    if (!hasAdminPermission(req, "merchant", true)) return error(res, 403, "当前管理员角色无商户启用权限");
    const payload = await body(req), idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产商户启用必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    const app = db.prepare("SELECT * FROM merchant_applications WHERE id=?").get(activateMatch[1]);
    if (!app) return error(res, 404, "入驻申请不存在");
    if (app.status !== "approved") return error(res, 409, "只有审核通过的主体才能启动业务");
    const merchantId = `m-${app.id.toLowerCase()}`;
    const merchant = db.prepare("SELECT license_status,bank_status FROM merchants WHERE id=?").get(merchantId);
    if (!merchant || !merchantVerificationReady(merchantId)) return error(res, 409, "营业资质和对公账户尚未完成独立核验，不能启用商户");
    const t = now();
    db.prepare("UPDATE merchant_applications SET status='active',activated_at=?,updated_at=? WHERE id=?").run(t, t, app.id);
    log(actorFor(req, "商户运营岗"), "ACTIVATE_MERCHANT", app.id, "商户业务资格已启用");
    const data = applicationView(app.id);
    saveIdempotent(req, idemKey, 200, data, payload);
    return json(res, 200, data);
  }
  if (path === "/api/v1/purchase-demands" && req.method === "POST") {
    if (!authorized(req)) return error(res, 401, "需要采购需求发布授权");
    const payload = await body(req), idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产采购需求必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    const principal = principalFor(req);
    if (!privileged(req) && !["buyer", "agri"].includes(String(principal?.role || ""))) return error(res, 403, "只有采购主体可以发布采购需求");
    const buyerId = String(payload.buyer_id || (principal?.merchant_ids || [])[0] || "").trim();
    if (!buyerId || (!privileged(req) && !canAccessMerchant(req, buyerId))) return error(res, 403, "采购主体未绑定当前授权");
    const buyer = db.prepare("SELECT * FROM merchants WHERE id=? AND role IN ('buyer','agri')").get(buyerId);
    if (!buyer || !merchantVerificationReady(buyerId)) return error(res, 403, "采购主体必须完成经营资质和对公账户核验");
    const title = String(payload.title || payload.name || "").trim().slice(0, 120);
    const category = String(payload.category || "").trim().slice(0, 40);
    const unit = String(payload.unit || "").trim().slice(0, 20);
    const destination = String(payload.destination || "").trim().slice(0, 120);
    const deliveryWindow = String(payload.delivery_window || "").trim().slice(0, 120);
    const hasDestinationLat = payload.destination_lat !== undefined && payload.destination_lat !== null && payload.destination_lat !== "";
    const hasDestinationLng = payload.destination_lng !== undefined && payload.destination_lng !== null && payload.destination_lng !== "";
    const destinationLat = hasDestinationLat ? Number(payload.destination_lat) : null;
    const destinationLng = hasDestinationLng ? Number(payload.destination_lng) : null;
    const qty = Number(payload.qty);
    const budgetMax = payload.budget_max === undefined || payload.budget_max === null || payload.budget_max === "" ? null : Number(payload.budget_max);
    if (!title || !category || !unit || !destination || !deliveryWindow || !finitePositive(qty, 1e9)) return error(res, 400, "采购需求名称、品类、数量、单位、交付地和交付时间均不能为空");
    if (hasDestinationLat !== hasDestinationLng || (productionMode && !hasDestinationLat) || (hasDestinationLat && (![destinationLat, destinationLng].every(Number.isFinite) || destinationLat < -90 || destinationLat > 90 || destinationLng < -180 || destinationLng > 180))) return error(res, 400, "生产采购需求必须提供有效且成对的收货地经纬度");
    if (budgetMax !== null && !finitePositive(budgetMax, 1e12)) return error(res, 400, "采购预算必须为合法正数");
    const demandId = `DEM-SZGS-${new Date().getFullYear()}-${randomUUID().slice(0, 12).toUpperCase()}`;
    const t = now();
    db.prepare("INSERT INTO purchase_demands(id,buyer_id,title,category,qty,unit,budget_max,destination,destination_lat,destination_lng,delivery_window,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(demandId, buyerId, title, category, qty, unit, budgetMax, destination, destinationLat, destinationLng, deliveryWindow, "open", t, t);
    log(actorFor(req, "采购需求岗"), "CREATE_PURCHASE_DEMAND", demandId, `${buyer.name} · ${title} · ${qty}${unit}`);
    const data = demandView(demandId);
    saveIdempotent(req, idemKey, 201, data, payload);
    return json(res, 201, data);
  }
  if (path === "/api/v1/purchase-demands" && req.method === "GET") {
    if (!authorized(req)) return error(res, 401, "需要采购需求查看授权");
    const principal = principalFor(req);
    const ownIds = principal?.merchant_ids || [];
    const rows = privileged(req)
      ? db.prepare("SELECT d.*,b.name buyer_name FROM purchase_demands d JOIN merchants b ON b.id=d.buyer_id ORDER BY d.updated_at DESC").all()
      : ["buyer", "agri"].includes(principal?.role)
        ? db.prepare("SELECT d.*,b.name buyer_name FROM purchase_demands d JOIN merchants b ON b.id=d.buyer_id WHERE d.buyer_id IN (SELECT value FROM json_each(?)) ORDER BY d.updated_at DESC").all(JSON.stringify(ownIds))
        : principal?.role === "supplier"
          ? db.prepare("SELECT d.*,b.name buyer_name FROM purchase_demands d JOIN merchants b ON b.id=d.buyer_id WHERE d.status IN ('open','quoting') ORDER BY d.updated_at DESC").all()
          : [];
    const data = rows.map((demand) => {
      const base = { ...demand, quote_count: Number(db.prepare("SELECT COUNT(*) AS n FROM demand_quotes WHERE demand_id=? AND status IN ('submitted','accepted','ordered')").get(demand.id)?.n || 0) };
      if (principal?.role !== "supplier") return { ...base, quotes: db.prepare("SELECT q.id,q.supplier_id,s.name supplier_name,q.product_id,p.name product_name,q.qty,q.unit_price,q.amount,q.status,q.note,q.order_id,q.created_at,q.updated_at FROM demand_quotes q JOIN merchants s ON s.id=q.supplier_id JOIN products p ON p.id=q.product_id WHERE q.demand_id=? ORDER BY q.created_at DESC").all(demand.id) };
      const mine = ownIds.length ? db.prepare("SELECT q.id,q.supplier_id,q.product_id,p.name product_name,q.qty,q.unit_price,q.amount,q.status,q.note,q.order_id,q.created_at,q.updated_at FROM demand_quotes q JOIN products p ON p.id=q.product_id WHERE q.demand_id=? AND q.supplier_id IN (SELECT value FROM json_each(?)) ORDER BY q.created_at DESC").all(demand.id, JSON.stringify(ownIds)) : [];
      return { ...base, my_quotes: mine };
    });
    return json(res, 200, data);
  }
  const demandQuoteMatch = path.match(/^\/api\/v1\/purchase-demands\/([^/]+)\/quotes$/);
  if (demandQuoteMatch && req.method === "POST") {
    if (!authorized(req)) return error(res, 401, "需要供货报价授权");
    const payload = await body(req), idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产报价必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    const principal = principalFor(req);
    const demand = db.prepare("SELECT d.*,b.name buyer_name FROM purchase_demands d JOIN merchants b ON b.id=d.buyer_id WHERE d.id=?").get(demandQuoteMatch[1]);
    if (!demand) return error(res, 404, "采购需求不存在");
    if (!['open','quoting'].includes(demand.status)) return error(res, 409, "该采购需求已停止接收报价");
    if (!privileged(req) && principal?.role !== "supplier") return error(res, 403, "只有供货主体可以提交采购报价");
    const supplierId = String(payload.supplier_id || (principal?.role === "supplier" ? principal.merchant_ids?.[0] : "")).trim();
    if (!supplierId || supplierId === demand.buyer_id || !canAccessMerchant(req, supplierId)) return error(res, 403, "报价供货主体未绑定当前授权或与采购方相同");
    const supplier = db.prepare("SELECT * FROM merchants WHERE id=? AND role='supplier' AND license_status='verified' AND bank_status='verified'").get(supplierId);
    if (!supplier || !merchantVerificationReady(supplierId)) return error(res, 403, "报价主体必须完成经营资质和对公账户核验");
    const productId = String(payload.product_id || "").trim();
    const qty = Number(payload.qty);
    const unitPrice = Number(payload.unit_price);
    if (!productId || !finitePositive(qty, 1e9) || qty > Number(demand.qty) || !finitePositive(unitPrice, 1e9)) return error(res, 400, "报价商品、数量或单价不合法");
    if (demand.budget_max != null && unitPrice > Number(demand.budget_max)) return error(res, 409, "报价单价超过采购需求预算上限");
    const product = db.prepare("SELECT * FROM products WHERE id=? AND merchant_id=? AND quality_status IN ('passed','approved')").get(productId, supplierId);
    if (!product) return error(res, 409, "报价商品未通过审核或不属于报价供货主体");
    if (String(product.category) !== String(demand.category)) return error(res, 409, "报价商品品类与采购需求不一致");
    if (Number(product.stock) < qty) return error(res, 409, "报价商品当前库存不足，不能提交虚假供给");
    const existing = db.prepare("SELECT id FROM demand_quotes WHERE demand_id=? AND supplier_id=? AND product_id=?").get(demand.id, supplierId, productId);
    if (existing) return error(res, 409, "同一需求、供货主体和商品只能保留一份有效报价");
    const quoteId = `QUOTE-${randomUUID().slice(0, 12).toUpperCase()}`;
    const amount = Math.round(qty * unitPrice * 100) / 100;
    if (productionMode) {
      moneyCents(unitPrice, "报价单价");
      moneyCents(amount, "报价金额");
    }
    const t = now();
    db.exec("BEGIN");
    try {
      db.prepare("INSERT INTO demand_quotes(id,demand_id,supplier_id,product_id,qty,unit_price,amount,status,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(quoteId, demand.id, supplierId, productId, qty, unitPrice, amount, "submitted", String(payload.note || "").slice(0, 240), t, t);
      db.prepare("UPDATE purchase_demands SET status='quoting',updated_at=? WHERE id=?").run(t, demand.id);
      log(actorFor(req, "供货报价岗"), "SUBMIT_DEMAND_QUOTE", quoteId, `${demand.id} · ${product.name} · ${qty}${product.unit} · ${amount}`);
      const data = quoteView(quoteId);
      saveIdempotent(req, idemKey, 201, data, payload);
      db.exec("COMMIT");
      return json(res, 201, data);
    } catch (cause) {
      db.exec("ROLLBACK");
      throw cause;
    }
  }
  const quoteAcceptMatch = path.match(/^\/api\/v1\/purchase-quotes\/([^/]+)\/accept$/);
  if (quoteAcceptMatch && req.method === "POST") {
    if (!authorized(req)) return error(res, 401, "需要采购方确认报价授权");
    const payload = await body(req), idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产报价确认必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    const quote = quoteView(quoteAcceptMatch[1]);
    if (!quote) return error(res, 404, "报价不存在");
    if (!privileged(req) && !canAccessMerchant(req, quote.buyer_id)) return error(res, 403, "只有该采购主体可以确认报价");
    if (!['open','quoting'].includes(quote.demand_status)) return error(res, 409, "该采购需求已关闭，不能再确认报价");
    if (quote.status !== "submitted") return error(res, 409, "报价当前状态不可确认");
    const awarded = db.prepare("SELECT id FROM demand_quotes WHERE demand_id=? AND status IN ('accepted','ordered') AND id<>? LIMIT 1").get(quote.demand_id, quote.id);
    if (awarded) return error(res, 409, "同一采购需求只能确认一家供货方报价");
    const t = now();
    db.exec("BEGIN");
    try {
      const fresh = db.prepare("SELECT status FROM purchase_demands WHERE id=?").get(quote.demand_id);
      const freshAwarded = db.prepare("SELECT id FROM demand_quotes WHERE demand_id=? AND status IN ('accepted','ordered') AND id<>? LIMIT 1").get(quote.demand_id, quote.id);
      if (!fresh || !['open','quoting'].includes(fresh.status)) throw new HttpError(409, "该采购需求已关闭，不能再确认报价");
      if (freshAwarded) throw new HttpError(409, "同一采购需求只能确认一家供货方报价");
      const changed = db.prepare("UPDATE demand_quotes SET status='accepted',updated_at=? WHERE id=? AND status='submitted'").run(t, quote.id);
      if (Number(changed.changes) !== 1) throw new HttpError(409, "报价当前状态不可确认");
      db.prepare("UPDATE purchase_demands SET updated_at=? WHERE id=?").run(t, quote.demand_id);
      log(actorFor(req, "采购确认岗"), "ACCEPT_DEMAND_QUOTE", quote.id, `${quote.demand_id} · ${quote.supplier_name} · 等待生成正式订单`);
      const data = quoteView(quote.id);
      saveIdempotent(req, idemKey, 200, data, payload);
      db.exec("COMMIT");
      return json(res, 200, data);
    } catch (cause) {
      db.exec("ROLLBACK");
      throw cause;
    }
  }
  if (path === "/api/v1/trades" && req.method === "POST") {
    if (!authorized(req)) return error(res, 401, "需要交易创建授权");
    const payload = await body(req), idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产订单创建必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    const principal = principalFor(req);
    const quoteId = String(payload.quote_id || "").trim();
    const acceptedQuote = quoteId ? quoteView(quoteId) : null;
    if (quoteId && (!acceptedQuote || acceptedQuote.status !== "accepted" || acceptedQuote.demand_status === "closed")) return error(res, 409, "只有采购方已确认且尚未转订单的报价才能生成正式交易");
    const requestedBuyer = String(payload.buyer_id || "").trim();
    const requestedSupplier = String(payload.supplier_id || "").trim();
    const buyerId = requestedBuyer || acceptedQuote?.buyer_id || (["buyer", "agri"].includes(principal?.role) ? principal.merchant_ids?.[0] : "");
    const supplierId = requestedSupplier || acceptedQuote?.supplier_id || (principal?.role === "supplier" ? principal.merchant_ids?.[0] : "");
    if (!buyerId || !supplierId || buyerId === supplierId) return error(res, 400, "采购方和供货方主体不能为空且不能相同");
    if (acceptedQuote && (buyerId !== acceptedQuote.buyer_id || supplierId !== acceptedQuote.supplier_id)) return error(res, 409, "正式订单主体必须与已确认报价的买卖双方一致");
    if (acceptedQuote && !privileged(req) && !canAccessMerchant(req, acceptedQuote.buyer_id)) return error(res, 403, "只有确认报价的采购主体可以生成正式订单");
    if (!privileged(req) && !canAccessMerchant(req, principal?.role === "supplier" ? supplierId : buyerId)) return error(res, 403, "无权代表该交易主体创建订单");
    const buyer = db.prepare("SELECT * FROM merchants WHERE id=? AND role IN ('buyer','agri') AND license_status='verified' AND bank_status='verified'").get(buyerId);
    const supplier = db.prepare("SELECT * FROM merchants WHERE id=? AND role='supplier' AND license_status='verified' AND bank_status='verified'").get(supplierId);
    if (!buyer || !supplier || !merchantVerificationReady(buyerId) || !merchantVerificationReady(supplierId)) return error(res, 403, "交易双方必须完成经营资质和对公账户核验");
    const items = acceptedQuote
      ? [{ product_id: acceptedQuote.product_id, qty: acceptedQuote.qty, quoted_unit_price: acceptedQuote.unit_price }]
      : (Array.isArray(payload.items) ? payload.items : []);
    if (!items.length || items.length > 100) return error(res, 400, "订单至少包含 1 项、最多 100 项商品");
    const normalized = [];
    const seenProducts = new Set();
    let goodsNet = 0;
    for (const raw of items) {
      const productId = String(raw?.product_id || raw?.id || "").trim();
      const qty = Number(raw?.qty);
      if (!productId || seenProducts.has(productId) || !finitePositive(qty, 1e9)) return error(res, 400, "商品明细或数量不合法，商品不得重复");
      seenProducts.add(productId);
      const product = db.prepare("SELECT * FROM products WHERE id=? AND merchant_id=? AND quality_status IN ('passed','approved')").get(productId, supplierId);
      if (!product) return error(res, 409, `商品 ${productId} 未通过审核或不属于该供货方`);
      if (Number(product.stock) < qty) return error(res, 409, `商品 ${product.name} 库存不足`);
      const unitPrice = acceptedQuote ? Number(raw?.quoted_unit_price) : Number(product.price);
      if (!finitePositive(unitPrice, 1e9)) return error(res, 400, "成交单价不合法");
      const subtotal = Math.round(unitPrice * qty * 100) / 100;
      if (productionMode) {
        moneyCents(unitPrice, "成交单价");
        moneyCents(subtotal, "商品明细金额");
      }
      goodsNet += subtotal;
      normalized.push({ product, qty, unitPrice, subtotal });
    }
    goodsNet = Math.round(goodsNet * 100) / 100;
    const serviceAmount = payload.service_amount === undefined ? 0 : Number(payload.service_amount);
    if (!finiteNonNegative(serviceAmount, 1e12)) return error(res, 400, "合同服务费用必须为合法非负金额");
    if (productionMode) {
      moneyCents(goodsNet, "商品明细净额");
      moneyCents(serviceAmount, "合同服务费用", { allowZero: true });
    }
    const amount = Math.round((goodsNet + serviceAmount) * 100) / 100;
    if (productionMode) moneyCents(amount, "订单金额");
    if (payload.amount !== undefined && (!finitePositive(payload.amount, 1e12) || Math.abs(Number(payload.amount) - amount) > 0.01)) return error(res, 409, "订单金额必须等于商品明细净额与合同服务费用之和");
    const scene = String(payload.scene || (acceptedQuote ? "supplierDemand" : "buyerSupply")).trim();
    if (!["buyerSupply", "supplierDemand"].includes(scene)) return error(res, 400, "交易场景不合法");
    if (acceptedQuote && scene !== "supplierDemand") return error(res, 409, "已确认采购报价必须以供货方响应场景生成订单");
    const settlementModel = String(payload.settlement_model || "持牌机构条件结算（验收后分账）").trim().slice(0, 80);
    const allowedSettlementModels = new Set(tradeConfig.settlement_models.flatMap((item) => [item.key, item.name]).concat(["持牌机构条件结算（验收后分账）", "机构授信账期（30日）", "银行对公直付（验收即付）"]));
    if (!allowedSettlementModels.has(settlementModel)) return error(res, 400, "结算模型必须选择平台已配置的标准模型");
    if (productionMode && (settlementModel === "credit" || /授信/.test(settlementModel)) && !String(payload.credit_approval_ref || "").trim()) return error(res, 400, "生产授信账期必须提供机构审批引用");
    const deliveryWindow = String(payload.delivery_window || "待双方确认").trim().slice(0, 120);
    const deliveryAddress = String(payload.delivery_address || acceptedQuote?.destination || "").trim().slice(0, 240);
    const rawDeliveryLat = payload.delivery_lat ?? acceptedQuote?.destination_lat;
    const rawDeliveryLng = payload.delivery_lng ?? acceptedQuote?.destination_lng;
    const deliveryLat = rawDeliveryLat === undefined || rawDeliveryLat === null || rawDeliveryLat === "" ? NaN : Number(rawDeliveryLat);
    const deliveryLng = rawDeliveryLng === undefined || rawDeliveryLng === null || rawDeliveryLng === "" ? NaN : Number(rawDeliveryLng);
    if (productionMode && !deliveryAddress) return error(res, 400, "生产订单必须提供收货地址");
    const invoiceType = String(payload.invoice_type || "增值税专用发票").trim().slice(0, 40);
    const orderId = `SZGS-${new Date().getFullYear()}-${randomUUID().slice(0, 12).toUpperCase()}`;
    const contractId = `CA-${orderId}`;
    const paymentId = `PAY-${orderId}`;
    const invoiceId = `INV-${orderId}`;
    const acceptanceId = `ACC-${orderId}`;
    const t = now();
    db.exec("BEGIN");
    try {
      const deliveryConstraint = productionDeliveryConstraint({ supplierId, destination: deliveryAddress, lat: deliveryLat, lng: deliveryLng, orderId });
      db.prepare("INSERT INTO orders VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(orderId, scene, buyerId, supplierId, "待复核", amount, "CNY", settlementModel, "待机构确认", -1, deliveryWindow, "待开票", "待双方签署", t, t);
      if (deliveryConstraint) db.prepare("INSERT INTO order_delivery_constraints(order_id,supplier_id,destination,destination_lat,destination_lng,distance_km,radius_km,max_daily_orders,daily_order_count,status,evidence_ref,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run(orderId, deliveryConstraint.supplier_id, deliveryConstraint.destination, deliveryConstraint.destination_lat, deliveryConstraint.destination_lng, deliveryConstraint.distance_km, deliveryConstraint.radius_km, deliveryConstraint.max_daily_orders, deliveryConstraint.daily_order_count, deliveryConstraint.status, deliveryConstraint.evidence_ref, t);
      const itemStmt = db.prepare("INSERT INTO order_items(order_id,product_id,name,qty,unit_price,subtotal) VALUES (?,?,?,?,?,?)");
      for (const item of normalized) {
        itemStmt.run(orderId, item.product.id, item.product.name, item.qty, item.unitPrice, item.subtotal);
        const reserved = db.prepare("UPDATE products SET stock=stock-? WHERE id=? AND stock>=?").run(item.qty, item.product.id, item.qty);
        if (Number(reserved.changes) !== 1) throw new HttpError(409, `商品 ${item.product.name} 库存已被其他订单占用，请重新确认`);
        db.prepare("INSERT INTO inventory_reservations(id,order_id,product_id,qty,status,reserved_at) VALUES (?,?,?,?,?,?)").run(`RSV-${orderId}-${item.product.id}`, orderId, item.product.id, item.qty, "reserved", t);
      }
      db.prepare("INSERT INTO contracts VALUES (?,?,?,?,?,?)").run(contractId, orderId, "主合同+子订单+质量附件", "待双方签署", null, `0x${randomUUID().replaceAll("-", "").slice(0, 16)}…c4`);
      db.prepare("INSERT INTO payments(id,order_id,payer,payee,amount,channel,status,paid_at,provider_transaction_id) VALUES (?,?,?,?,?,?,?,?,?)").run(paymentId, orderId, buyer.name, supplier.name, amount, "持牌结算机构托管户", "待机构确认", null, null);
      db.prepare("INSERT INTO invoices(id,order_id,invoice_no,amount,status,issued_at,invoice_type,tax_category_code,tax_rate,seller_credit_code,buyer_credit_code) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run(invoiceId, orderId, null, amount, "待开具", null, invoiceType, "", null, null, null);
      db.prepare("INSERT INTO acceptances VALUES (?,?,?,?,?,?,?,?)").run(acceptanceId, orderId, `${buyer.name}验收岗`, "pending", null, "待到货复磅、抽检和签收", null, null);
      db.prepare("INSERT INTO fulfillment_events(order_id,step,title,evidence,actor,created_at) VALUES (?,?,?,?,?,?)").run(orderId, 0, "批量清单拆单", `ORDER-CREATE-${orderId.slice(-8)}`, principal?.id || "交易创建岗", t);
      if (acceptedQuote) {
        db.prepare("UPDATE demand_quotes SET status='ordered',order_id=?,updated_at=? WHERE id=? AND status='accepted'").run(orderId, t, acceptedQuote.id);
        db.prepare("UPDATE purchase_demands SET status='closed',updated_at=? WHERE id=?").run(t, acceptedQuote.demand_id);
      }
      log(principal?.id || "交易创建岗", "CREATE_TRADE", orderId, `${normalized.length}项商品 · 商品净额 ${goodsNet} · 服务费用 ${serviceAmount} · ${invoiceType}`);
      const data = orderView(orderId);
      saveIdempotent(req, idemKey, 201, data, payload);
      db.exec("COMMIT");
      return json(res, 201, data);
    } catch (cause) {
      db.exec("ROLLBACK");
      throw cause;
    }
  }
  if (path === "/api/v1/trades" && req.method === "GET") {
    if (!authorized(req)) return error(res, 401, "需要交易查看授权");
    const principal = principalFor(req);
    const list = privileged(req)
      ? db.prepare("SELECT o.id,o.scene,o.status,o.amount,o.settlement_model,o.payment_status,o.fulfillment_step,o.delivery_window,o.created_at,b.name buyer_name,s.name supplier_name FROM orders o JOIN merchants b ON b.id=o.buyer_id JOIN merchants s ON s.id=o.supplier_id ORDER BY o.created_at DESC").all()
      : db.prepare("SELECT o.id,o.scene,o.status,o.amount,o.settlement_model,o.payment_status,o.fulfillment_step,o.delivery_window,o.created_at,b.name buyer_name,s.name supplier_name FROM orders o JOIN merchants b ON b.id=o.buyer_id JOIN merchants s ON s.id=o.supplier_id WHERE o.buyer_id IN (SELECT value FROM json_each(?)) OR o.supplier_id IN (SELECT value FROM json_each(?)) ORDER BY o.created_at DESC").all(JSON.stringify(principal.merchant_ids), JSON.stringify(principal.merchant_ids));
    return json(res, 200, list);
  }
  const tradeMatch = path.match(/^\/api\/v1\/trades\/([^/]+)$/);
  if (tradeMatch && req.method === "GET") {
    if (!authorized(req)) return error(res, 401, "需要交易查看授权");
    const order = db.prepare("SELECT * FROM orders WHERE id=?").get(tradeMatch[1]);
    if (!order) return error(res, 404, "交易不存在");
    if (!canAccessOrder(req, order)) return error(res, 403, "无权查看该交易");
    const data = orderView(tradeMatch[1]);
    return json(res, 200, data);
  }
  const paymentMatch = path.match(/^\/api\/v1\/trades\/([^/]+)\/pay$/);
  if (paymentMatch && req.method === "POST") {
    if (!authorized(req)) return error(res, 401, "需要支付授权");
    const payload = await body(req), id = paymentMatch[1], idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产托管入金必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    const order = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
    if (!order) return error(res, 404, "交易不存在");
    if (!canActForOrder(req, order, "buyer")) return error(res, 403, "只有采购方或授权后台岗位可以发起托管入金");
    if (productionMode) {
      const contract = db.prepare("SELECT status FROM contracts WHERE order_id=? ORDER BY id LIMIT 1").get(id);
      if (!contract || contract.status !== "已签署") return error(res, 409, "合同双方完成CA签署前不得发起托管入金");
    }
    if (productionMode && process.env.SHUZHI_PAYMENT_READY !== "true") return error(res, 503, "支付机构尚未完成联调，暂不接受生产托管入金");
    let payment = db.prepare("SELECT * FROM payments WHERE order_id=? ORDER BY rowid DESC LIMIT 1").get(id);
    if (!payment) return error(res, 404, "交易托管支付记录不存在");
    if (!["待机构确认", "待支付", "支付失败"].includes(payment.status)) return error(res, 409, "当前资金状态不允许重复发起托管入金");
    const amount = Number(order.amount);
    if (!finitePositive(amount, 1e12)) return error(res, 409, "订单应付金额不合法，禁止发起托管入金");
    const t = now();
    if (productionMode) {
      const principal = principalFor(req);
      const buyerIdentity = db.prepare("SELECT credit_code FROM merchant_identity WHERE merchant_id=? AND status='verified'").get(order.buyer_id);
      const supplierIdentity = db.prepare("SELECT credit_code FROM merchant_identity WHERE merchant_id=? AND status='verified'").get(order.supplier_id);
      const payerCreditCode = String(payload.payer_credit_code || ((principal?.merchant_ids || []).includes(order.buyer_id) ? buyerIdentity?.credit_code : "")).trim();
      const payeeCreditCode = String(payload.payee_credit_code || supplierIdentity?.credit_code || "").trim();
      if (!payerCreditCode || !payeeCreditCode) return error(res, 400, "生产托管入金必须提供付款方和收款方统一社会信用代码");
      db.exec("BEGIN");
      try {
        // 失败的机构支付尝试保留原始机构交易号和审计证据；重试创建新的支付记录，
        // 不复用旧 Outbox 幂等键，避免把不同的资金尝试误合并为同一笔入金。
        if (payment.status === "支付失败") {
          const retryPaymentId = `PAY-${id}-${randomUUID().slice(0, 12)}`;
          db.prepare("INSERT INTO payments(id,order_id,payer,payee,amount,channel,status,paid_at,provider_transaction_id) VALUES (?,?,?,?,?,?,?,?,?)").run(retryPaymentId, id, payment.payer, payment.payee, amount, payment.channel, "待机构确认", null, null);
          payment = db.prepare("SELECT * FROM payments WHERE id=?").get(retryPaymentId);
        }
        const queued = enqueueProductionInstitutionCommand({
          provider: "payment",
          aggregateType: "order",
          aggregateId: id,
          commandType: "create",
          idempotencyKey: `PAYMENT:CREATE:${payment.id}`,
          command: {
            command_id: `CMD-PAYMENT-CREATE-${payment.id}`,
            action: "create_escrow",
            order_id: id,
            payment_id: payment.id,
            payer: merchantParty(order.buyer_id, payerCreditCode),
            payee: merchantParty(order.supplier_id, payeeCreditCode),
            money: { amount, currency: order.currency || "CNY" },
            settlement_model: order.settlement_model,
          },
          now: t,
        });
        db.prepare("UPDATE payments SET status='机构待受理' WHERE id=?").run(payment.id);
        db.prepare("UPDATE orders SET payment_status='机构待受理',updated_at=? WHERE id=?").run(t, id);
        log(actorFor(req, "采购付款岗"), "QUEUE_PAYMENT_CREATE", id, queued.id);
        const data = { ...orderView(id), payment_pending: true, institution_outbox: publicInstitutionCommand(queued) };
        saveIdempotent(req, idemKey, 202, data, payload);
        db.exec("COMMIT");
        return json(res, 202, data);
      } catch (cause) {
        db.exec("ROLLBACK");
        throw cause;
      }
    }
    return error(res, 409, "本地演示请使用支付演示流程，不直接创建生产托管指令");
  }
  const refundMatch = path.match(/^\/api\/v1\/trades\/([^/]+)\/refund$/);
  if (refundMatch && req.method === "POST") {
    if (!authorized(req)) return error(res, 401, "需要退款授权");
    const payload = await body(req), id = refundMatch[1], idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产退款必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    const order = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
    if (!order) return error(res, 404, "交易不存在");
    const principal = principalFor(req);
    const financeAuthorized = hasAdminPermission(req, "finance", true);
    if (!financeAuthorized && !canActForOrder(req, order, "buyer")) return error(res, 403, "只有采购方或财务结算岗位可以发起退款");
    if (!productionMode) return error(res, 409, "本地演示请使用演示重置，不创建退款机构指令");
    if (process.env.SHUZHI_PAYMENT_READY !== "true") return error(res, 503, "支付机构尚未完成联调，暂不接受生产退款");
    if (db.prepare("SELECT id FROM settlement_records WHERE order_id=? LIMIT 1").get(id)) return error(res, 409, "交易已分账，退款必须进入争议人工流程，不得直接退款");
    const payment = db.prepare("SELECT * FROM payments WHERE order_id=? ORDER BY rowid DESC LIMIT 1").get(id);
    if (!payment || !["已入金待验收", "机构已确认（验收后分账）", "已支付", "待验收分账", "部分退款"].includes(payment.status)) return error(res, 409, "当前资金状态不允许发起退款");
    if (!payment.provider_transaction_id) return error(res, 409, "原支付尚未取得机构交易号，不能发起退款");
    const amount = Number(payload.amount === undefined ? payment.amount : payload.amount);
    if (productionMode) moneyCents(amount, "退款金额");
    if (amount <= 0 || amount > Number(payment.amount) + 0.000001) return error(res, 409, "退款金额必须大于零且不得超过原支付金额");
    const refundCents = moneyCents(amount, "退款金额");
    const refundedCents = Math.round(Number(db.prepare("SELECT COALESCE(SUM(amount),0) AS amount FROM payment_refunds WHERE payment_id=? AND status IN ('机构待受理','退款处理中','已退款')").get(payment.id)?.amount || 0) * 100);
    const paymentCents = productionMode ? moneyCents(payment.amount, "原支付金额") : Math.round(Number(payment.amount) * 100);
    if (refundedCents + refundCents > paymentCents) return error(res, 409, "累计退款金额不得超过原支付金额");
    const reason = String(payload.reason || "交易退款申请").trim().slice(0, 240);
    if (reason.length < 4) return error(res, 400, "退款原因至少需要 4 个字符");
    const refundId = `REF-${id}-${randomUUID().slice(0, 12).toUpperCase()}`;
    const t = now();
    db.exec("BEGIN");
    try {
      db.prepare("INSERT INTO payment_refunds(id,order_id,payment_id,amount,reason,status,provider_ref,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)").run(refundId, id, payment.id, amount, reason, "机构待受理", null, t, t);
      const queued = enqueueProductionInstitutionCommand({
        provider: "payment",
        aggregateType: "payment_refund",
        aggregateId: refundId,
        commandType: "refund",
        idempotencyKey: `PAYMENT:REFUND:${refundId}`,
        command: {
          command_id: `CMD-PAYMENT-REFUND-${refundId}`,
          action: "refund",
          order_id: id,
          refund_id: refundId,
          payment_id: payment.id,
          provider_transaction_id: payment.provider_transaction_id,
          money: { amount, currency: order.currency || "CNY" },
          reason,
          requested_by: principal?.id || "finance",
        },
        now: t,
      });
      db.prepare("UPDATE orders SET payment_status='退款待机构受理',updated_at=? WHERE id=?").run(t, id);
      log(actorFor(req, "财务退款岗"), "QUEUE_PAYMENT_REFUND", id, `${refundId} · ${amount}`);
      const data = { ...orderView(id), refund_pending: true, institution_outbox: publicInstitutionCommand(queued) };
      saveIdempotent(req, idemKey, 202, data, payload);
      db.exec("COMMIT");
      return json(res, 202, data);
    } catch (cause) {
      db.exec("ROLLBACK");
      throw cause;
    }
  }
  const cancelMatch = path.match(/^\/api\/v1\/trades\/([^/]+)\/cancel$/);
  if (cancelMatch && req.method === "POST") {
    if (!authorized(req)) return error(res, 401, "需要交易取消授权");
    const payload = await body(req), id = cancelMatch[1], idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产取消订单必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    const order = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
    if (!order) return error(res, 404, "交易不存在");
    if (!canAccessOrder(req, order)) return error(res, 403, "无权取消该交易");
    if (!["待复核", "履约中"].includes(order.status) || Number(order.fulfillment_step) > 0) return error(res, 409, "订单已进入合同、支付或履约阶段，须走人工退款/争议流程，不得直接取消");
    if (!["待机构确认", "待支付"].includes(order.payment_status)) return error(res, 409, "托管资金状态不允许直接取消，请先由结算机构确认退款路径");
    if (db.prepare("SELECT id FROM contract_signatures WHERE order_id=? LIMIT 1").get(id)) return error(res, 409, "合同已签署，须走双方解约流程");
    if (db.prepare("SELECT id FROM shipments WHERE order_id=? LIMIT 1").get(id)) return error(res, 409, "订单已有运单，不得直接取消");
    if (db.prepare("SELECT id FROM acceptances WHERE order_id=? AND result<>'pending' LIMIT 1").get(id)) return error(res, 409, "订单已有最终验收结论，不得直接取消");
    const reason = String(payload.reason || "交易双方取消订单").trim().slice(0, 240);
    const t = now();
    db.exec("BEGIN");
    try {
      const released = releaseOrderInventory(id, reason);
      db.prepare("UPDATE orders SET status='已取消',payment_status='未发生扣款',invoice_status='已取消',contract_status='已取消',updated_at=? WHERE id=?").run(t, id);
      db.prepare("INSERT INTO fulfillment_events(order_id,step,title,evidence,actor,created_at) VALUES (?,?,?,?,?,?)").run(id, Number(order.fulfillment_step), "订单取消与库存释放", `CANCEL-${id.slice(-8)} · 释放${released}项库存 · ${reason}`, actorFor(req), t);
      log(actorFor(req), "CANCEL_TRADE", id, `释放${released}项库存 · ${reason}`);
      const data = orderView(id);
      saveIdempotent(req, idemKey, 200, data, payload);
      db.exec("COMMIT");
      return json(res, 200, data);
    } catch (cause) {
      db.exec("ROLLBACK");
      throw cause;
    }
  }
  const resetMatch = path.match(/^\/api\/v1\/trades\/([^/]+)\/reset$/);
  if (resetMatch && req.method === "POST") {
    if (!authorized(req)) return error(res, 401, "需要交易操作授权");
    if (productionMode) return error(res, 403, "生产环境禁止重置真实交易");
    const id = resetMatch[1];
    const resetOrder = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
    if (!resetOrder) return error(res, 404, "交易不存在");
    if (resetOrder.status === "已取消") return error(res, 409, "已取消订单不可重置；如需演示请重新创建订单");
    const t = now();
    // 演示重置必须清理所有会阻止再次跑通流程的派生状态；该端点仅在
    // local-demo 可用，生产模式在上方直接拒绝，不会影响真实交易数据。
    db.exec("BEGIN");
    try {
      const reservationCount = Number(db.prepare("SELECT COUNT(*) AS n FROM inventory_reservations WHERE order_id=? AND status='reserved'").get(id)?.n || 0);
      if (reservationCount > 0) {
        releaseOrderInventory(id, "演示重置");
        const resetItems = db.prepare("SELECT product_id,qty FROM order_items WHERE order_id=? ORDER BY id").all(id);
        for (const item of resetItems) {
          const reserved = db.prepare("UPDATE products SET stock=stock-? WHERE id=? AND stock>=?").run(Number(item.qty), item.product_id, Number(item.qty));
          if (Number(reserved.changes) !== 1) throw new HttpError(409, `演示重置时库存不足：商品 ${item.product_id}`);
          const reopened = db.prepare("UPDATE inventory_reservations SET qty=?,status='reserved',reserved_at=?,released_at=NULL,release_reason=NULL WHERE order_id=? AND product_id=?").run(Number(item.qty), t, id, item.product_id);
          if (Number(reopened.changes) !== 1) db.prepare("INSERT INTO inventory_reservations(id,order_id,product_id,qty,status,reserved_at) VALUES (?,?,?,?,?,?)").run(`RSV-${id}-${item.product_id}-RESET-${Date.now()}`, id, item.product_id, Number(item.qty), "reserved", t);
        }
      }
      db.prepare("DELETE FROM request_idempotency WHERE path LIKE ?").run(`/api/v1/trades/${id}/%`);
      db.prepare("DELETE FROM settlement_records WHERE order_id=?").run(id);
      db.prepare("DELETE FROM acceptances WHERE order_id=?").run(id);
      db.prepare("DELETE FROM fulfillment_events WHERE order_id=?").run(id);
      db.prepare("UPDATE invoices SET invoice_no=NULL,status='待开具',issued_at=NULL WHERE order_id=?").run(id);
      db.prepare("UPDATE payments SET status='待验收分账',paid_at=NULL WHERE order_id=?").run(id);
      db.prepare("UPDATE orders SET fulfillment_step=-1,status='履约中',payment_status='待验收分账',invoice_status='待开票',contract_status='已签署',updated_at=? WHERE id=?").run(t, id);
      const receiver = db.prepare("SELECT m.name FROM orders o JOIN merchants m ON m.id=o.buyer_id WHERE o.id=?").get(id)?.name || "采购验收岗";
      db.prepare("INSERT INTO acceptances VALUES (?,?,?,?,?,?,?,?)").run(`ACC-${id}-RESET`, id, `${String(receiver)}验收岗`, "pending", null, "待到货复磅、抽检和签收", null, null);
      db.exec("COMMIT");
    } catch (cause) {
      db.exec("ROLLBACK");
      throw cause;
    }
    log("local-admin", "RESET_DEMO_TRADE", id, "演示交易回到首步，供前台重新跑通全流程");
    return json(res, 200, orderView(id));
  }
  const ledgerMatch = path.match(/^\/api\/v1\/trades\/([^/]+)\/ledger$/);
  if (ledgerMatch && req.method === "GET") {
    if (!authorized(req)) return error(res, 401, "需要交易台账查看授权");
    const order = db.prepare("SELECT * FROM orders WHERE id=?").get(ledgerMatch[1]);
    if (!order) return error(res, 404, "交易不存在");
    if (!canAccessOrder(req, order)) return error(res, 403, "无权查看该交易台账");
    const data = tradeLedger(ledgerMatch[1]);
    return json(res, 200, data);
  }
  if (path === "/api/v1/products" && req.method === "GET") {
    const list = db.prepare("SELECT p.*,m.name merchant_name FROM products p JOIN merchants m ON m.id=p.merchant_id WHERE p.quality_status IN ('passed','approved') ORDER BY p.name").all();
    return json(res, 200, list.map((p) => ({ ...p, media: db.prepare("SELECT media_type,url,sort_no FROM product_media WHERE product_id=? AND status='approved' ORDER BY sort_no").all(p.id) })));
  }
  if (path === "/api/v1/products" && req.method === "POST") {
    if (!authorized(req)) return error(res, 401, "需要商户授权");
    const payload = await body(req);
    const idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产商品提交必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    if (!["name", "category", "price", "stock"].every((key) => payload[key] !== undefined && String(payload[key]).trim() !== "")) return error(res, 400, "商品名称、品类、价格和库存不能为空");
    const principal = principalFor(req);
    const requestedMerchantId = String(payload.merchant_id || "").trim();
    // 生产请求以认证会话绑定的主体为准；前端不应自行决定代表哪家商户。
    // 本地演示仍接受显式 merchant_id，保持既有回归和离线演示兼容。
    const merchantId = requestedMerchantId || (principal?.merchant_ids || [])[0] || (!productionMode && principal?.type === "demo" ? "m-supplier" : "");
    if (!merchantId) return error(res, 403, "当前会话未绑定可发布商品的供货主体");
    if (!privileged(req) && requestedMerchantId && !canAccessMerchant(req, requestedMerchantId)) return error(res, 403, "无权以该商户身份发布商品");
    const merchant = db.prepare("SELECT * FROM merchants WHERE id=? AND role IN ('supplier','agri') AND license_status='verified' AND bank_status='verified'").get(merchantId);
    if (!merchant || !merchantVerificationReady(merchant.id)) return error(res, 403, "商户未完成资质和对公账户核验");
    if (!canAccessMerchant(req, merchant.id)) return error(res, 403, "无权以该商户身份发布商品");
    const price = Number(payload.price), stock = Number(payload.stock), name = String(payload.name).trim(), category = String(payload.category).trim();
    if (!name || name.length > 120 || !category || category.length > 40 || !finitePositive(price, 1e9) || !finitePositive(stock, 1e9)) return error(res, 400, "商品名称、品类、价格和库存必须为合法正数");
    if (productionMode) moneyCents(price, "商品单价");
    const media = Array.isArray(payload.media) ? payload.media : [];
    if (media.length > 8 || media.some((item) => !item || !["image", "video"].includes(String(item.media_type || "image")) || !String(item.url || "").trim() || String(item.url).length > 2048)) return error(res, 400, "商品媒体最多 8 个，类型和地址不合法");
    // 先完成全部字段校验，再写入商品和媒体，避免无效媒体留下孤立的待审核商品。
    const id = `p-${randomUUID()}`;
    db.exec("BEGIN");
    try {
      db.prepare("INSERT INTO products VALUES (?,?,?,?,?,?,?,?,?,?)").run(id, merchant.id, name, category, String(payload.spec || "").slice(0, 240), String(payload.unit || "件").slice(0, 20), price, stock, String(payload.origin || "").slice(0, 120), "pending_review");
      const mediaStmt = db.prepare("INSERT INTO product_media(product_id,media_type,url,sort_no,status) VALUES (?,?,?,?,?)");
      media.forEach((item, index) => mediaStmt.run(id, String(item.media_type || "image"), String(item.url || ""), index + 1, "pending"));
      log(merchant.id, "SUBMIT_PRODUCT", id, "商品及图文/视频资料已提交上架审核");
      const data = { id, status: "pending_review" };
      saveIdempotent(req, idemKey, 201, data, payload);
      db.exec("COMMIT");
      return json(res, 201, data);
    } catch (cause) {
      db.exec("ROLLBACK");
      throw cause;
    }
  }
  const productReviewMatch = path.match(/^\/api\/v1\/admin\/products\/([^/]+)\/review$/);
  if (productReviewMatch && req.method === "POST") {
    if (!hasAdminPermission(req, "audit", true)) return error(res, 403, "当前管理员角色无商品审核操作权限");
    const payload = await body(req), decision = String(payload.decision || ""), idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产商品审核必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    if (!["approve", "reject"].includes(decision)) return error(res, 400, "上架审核决定不合法");
    const product = db.prepare("SELECT * FROM products WHERE id=?").get(productReviewMatch[1]);
    if (!product) return error(res, 404, "商品不存在");
    db.prepare("UPDATE products SET quality_status=? WHERE id=?").run(decision === "approve" ? "approved" : "rejected", product.id);
    db.prepare("UPDATE product_media SET status=? WHERE product_id=?").run(decision === "approve" ? "approved" : "rejected", product.id);
    log(actorFor(req, "商品审核岗"), `REVIEW_PRODUCT_${decision.toUpperCase()}`, product.id, String(payload.note || "").slice(0, 160));
    const data = { id: product.id, status: decision === "approve" ? "approved" : "rejected" };
    saveIdempotent(req, idemKey, 200, data, payload);
    return json(res, 200, data);
  }
  const contractSignMatch = path.match(/^\/api\/v1\/trades\/([^/]+)\/contract\/sign$/);
  if (contractSignMatch && req.method === "POST") {
    if (!authorized(req)) return error(res, 401, "需要合同签署授权");
    const payload = await body(req), orderId = contractSignMatch[1], idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产合同签署必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    const order = db.prepare("SELECT * FROM orders WHERE id=?").get(orderId);
    if (!order) return error(res, 404, "交易不存在");
    if (order.status === "已取消") return error(res, 409, "交易已取消，禁止继续签署合同");
    const party = String(payload.party || "").trim();
    if (!["buyer", "supplier"].includes(party)) return error(res, 400, "签署方必须为 buyer 或 supplier");
    if (!canActForOrder(req, order, party)) return error(res, 403, "无权代表该交易签署合同");
    if (productionMode && process.env.SHUZHI_CA_READY !== "true") return error(res, 503, "CA签署机构尚未完成联调，暂不接受生产签署");
    const contract = db.prepare("SELECT * FROM contracts WHERE order_id=? ORDER BY id LIMIT 1").get(orderId);
    if (!contract) return error(res, 404, "交易合同不存在");
    const existing = db.prepare("SELECT * FROM contract_signatures WHERE contract_id=? AND party=?").get(contract.id, party);
    if (existing) return error(res, 409, "该签署方已完成签署，禁止重复签章");
    const principal = principalFor(req);
    const certificateRef = String(payload.certificate_ref || (productionMode ? "" : `LOCAL-CA-${party.toUpperCase()}`)).trim();
    if (!certificateRef && !productionMode) return error(res, 400, "必须提供企业 CA 证书引用");
    if (productionMode && !String(payload.signer_authorization_ref || "").trim()) return error(res, 400, "生产CA签署必须提供签署授权引用");
    const t = now();
    if (productionMode) {
      const digest = createHash("sha256").update(`${contract.id}:${orderId}:${contract.hash}`).digest("hex");
      db.exec("BEGIN");
      try {
        const queued = enqueueProductionInstitutionCommand({
          provider: "ca",
          aggregateType: "contract",
          aggregateId: contract.id,
          commandType: "request_signature",
          idempotencyKey: `CA:SIGN:${contract.id}:${party}`,
          command: {
            command_id: `CMD-CA-SIGN-${contract.id}-${party}`,
            order_id: orderId,
            contract_id: contract.id,
            contract_digest: digest,
            party,
            signer_id: principal.id,
            signer_authorization_ref: String(payload.signer_authorization_ref).trim().slice(0, 240),
          },
          now: t,
        });
        log(actorFor(req, "授权签约人"), "QUEUE_CA_SIGNATURE", orderId, `${party} · ${queued.id}`);
        const data = { ...contract, status: "待机构签署", signatures: db.prepare("SELECT party,signer_id,signer_name,certificate_ref,signed_at FROM contract_signatures WHERE contract_id=? ORDER BY party").all(contract.id), institution_outbox: publicInstitutionCommand(queued) };
        saveIdempotent(req, idemKey, 202, data, payload);
        db.exec("COMMIT");
        return json(res, 202, data);
      } catch (cause) {
        db.exec("ROLLBACK");
        throw cause;
      }
    }
    const signerName = productionMode ? actorFor(req, "授权签约人") : String(payload.signer_name || principal?.name || "授权签约人");
    db.prepare("INSERT INTO contract_signatures(contract_id,order_id,party,signer_id,signer_name,certificate_ref,signed_at) VALUES (?,?,?,?,?,?,?)").run(contract.id, orderId, party, principal?.id || `merchant-${party}`, signerName, certificateRef, t);
    const count = Number(db.prepare("SELECT COUNT(*) AS n FROM contract_signatures WHERE contract_id=? AND party IN ('buyer','supplier')").get(contract.id).n);
    const signed = count >= 2;
    db.prepare("UPDATE contracts SET status=?,signed_at=CASE WHEN ? THEN COALESCE(signed_at,?) ELSE signed_at END WHERE id=?").run(signed ? "已签署" : "待双方签署", signed ? 1 : 0, t, contract.id);
    db.prepare("UPDATE orders SET contract_status=?,updated_at=? WHERE id=?").run(signed ? "已签署" : "待双方签署", t, orderId);
    log(productionMode ? actorFor(req, "授权签约人") : (principal?.id || `merchant-${party}`), "SIGN_CONTRACT", orderId, `${party} · ${certificateRef}`);
    const data = db.prepare("SELECT * FROM contracts WHERE id=?").get(contract.id);
    const result = { ...data, signatures: db.prepare("SELECT party,signer_id,signer_name,certificate_ref,signed_at FROM contract_signatures WHERE contract_id=? ORDER BY party").all(contract.id) };
    saveIdempotent(req, idemKey, 201, result, payload);
    return json(res, 201, result);
  }
  const settleMatch = path.match(/^\/api\/v1\/trades\/([^/]+)\/settle$/);
  if (settleMatch && req.method === "POST") {
    if (!authorized(req)) return error(res, 401, "需要结算授权");
    if (!hasAdminPermission(req, "finance", true)) return error(res, 403, "只有财务结算岗位可以发起最终分账");
    const payload = await body(req), orderId = settleMatch[1], idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产结算必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    const order = db.prepare("SELECT * FROM orders WHERE id=?").get(orderId);
    if (!order) return error(res, 404, "交易不存在");
    const existing = db.prepare("SELECT * FROM settlement_records WHERE order_id=?").get(orderId);
    if (existing) return error(res, 409, "该交易已完成结算，禁止重复分账");
    const contract = db.prepare("SELECT id,status FROM contracts WHERE order_id=? ORDER BY id LIMIT 1").get(orderId);
    if (!contract || contract.status !== "已签署") return error(res, 409, "合同双方签署完成前不得结算");
    const accepted = db.prepare("SELECT id FROM acceptances WHERE order_id=? AND result='accepted' LIMIT 1").get(orderId);
    if (!accepted) return error(res, 409, "验收合格前不得结算");
    const invoice = db.prepare("SELECT id FROM invoices WHERE order_id=? AND status='已开具' LIMIT 1").get(orderId);
    if (!invoice) return error(res, 409, "发票验真前不得结算");
    const invoiceDetail = db.prepare("SELECT amount FROM invoices WHERE order_id=? AND status='已开具' LIMIT 1").get(orderId);
    if (productionMode) {
      moneyCents(order.amount, "订单金额");
      if (invoiceDetail) moneyCents(invoiceDetail.amount, "发票金额");
    }
    if (!invoiceDetail || Math.abs(Number(invoiceDetail.amount) - Number(order.amount)) > 0.01) return error(res, 409, "发票金额与订单金额不一致，禁止结算");
    const payment = db.prepare("SELECT * FROM payments WHERE order_id=? ORDER BY rowid DESC LIMIT 1").get(orderId);
    if (!payment || !["已入金待验收", "待验收分账", "机构已确认（验收后分账）", "已支付"].includes(payment.status)) return error(res, 409, "托管资金尚未确认，禁止结算");
    if (productionMode) {
      moneyCents(payment.amount, "托管金额");
      if (Math.abs(Number(payment.amount) - Number(order.amount)) > 0.01) return error(res, 409, "托管金额与订单金额不一致，禁止结算");
    }
    if (db.prepare("SELECT id FROM payment_refunds WHERE order_id=? AND status IN ('机构待受理','退款处理中') LIMIT 1").get(orderId)) return error(res, 409, "退款机构指令尚未完成，禁止同时分账");
    if (productionMode && process.env.SHUZHI_PAYMENT_READY !== "true") return error(res, 503, "支付机构尚未完成联调，暂不接受生产分账");
    const amount = Number(order.amount);
    const feeCalc = platformFeeForOrder(orderId, amount);
    const platformFee = feeCalc.fee;
    const instructionRef = String(payload.instruction_ref || `SETTLE-${orderId}-${Date.now()}`).trim();
    const t = now();
    if (productionMode) {
      const payerCreditCode = String(payload.payer_credit_code || "").trim();
      const payeeCreditCode = String(payload.payee_credit_code || "").trim();
      if (!payerCreditCode || !payeeCreditCode) return error(res, 400, "生产分账指令必须提供采购方和供货方统一社会信用代码");
      db.exec("BEGIN");
      try {
        const queued = enqueueProductionInstitutionCommand({
          provider: "payment",
          aggregateType: "order",
          aggregateId: orderId,
          commandType: "release",
          idempotencyKey: `PAYMENT:RELEASE:${orderId}`,
          command: {
            command_id: `CMD-PAYMENT-RELEASE-${orderId}`,
            action: "release",
            order_id: orderId,
            payment_id: payment.id,
            payer: merchantParty(order.buyer_id, payerCreditCode),
            payee: merchantParty(order.supplier_id, payeeCreditCode),
            money: { amount, currency: "CNY" },
            condition_refs: [contract.id, accepted.id, invoice.id, payment.id, `PLATFORM-FEE:${platformFee}`],
          },
          now: t,
        });
        log(actorFor(req, "财务结算岗"), "QUEUE_PAYMENT_RELEASE", orderId, `${queued.id} · 商品净额 ${feeCalc.base} · 平台费 ${platformFee}`);
        const data = { ...tradeLedger(orderId), settlement_pending: true, institution_outbox: publicInstitutionCommand(queued) };
        saveIdempotent(req, idemKey, 202, data, payload);
        db.exec("COMMIT");
        return json(res, 202, data);
      } catch (cause) {
        db.exec("ROLLBACK");
        throw cause;
      }
    }
    db.exec("BEGIN");
    try {
      db.prepare("INSERT INTO settlement_records(id,order_id,amount,platform_fee,platform_fee_base,status,instruction_ref,settled_at,created_at) VALUES (?,?,?,?,?,?,?,?,?)").run(instructionRef, orderId, amount, platformFee, feeCalc.base, "settled", instructionRef, t, t);
      db.prepare("UPDATE payments SET status='已分账',paid_at=COALESCE(paid_at,?) WHERE order_id=?").run(t, orderId);
      db.prepare("UPDATE orders SET status='已完成',payment_status='已分账',fulfillment_step=CASE WHEN fulfillment_step<11 THEN 11 ELSE fulfillment_step END,updated_at=? WHERE id=?").run(t, orderId);
      db.prepare("INSERT INTO fulfillment_events(order_id,step,title,evidence,actor,created_at) VALUES (?,?,?,?,?,?)").run(orderId, 10, "机构条件分账结算", instructionRef, principalFor(req)?.id || "finance", t);
      db.prepare("INSERT INTO fulfillment_events(order_id,step,title,evidence,actor,created_at) VALUES (?,?,?,?,?,?)").run(orderId, 11, "四流三账对账关账", `RECON-${instructionRef}`, principalFor(req)?.id || "finance", t);
      log(principalFor(req)?.id || "finance", "SETTLE_TRADE", orderId, `${instructionRef} · 平台技术服务费 ${platformFee} · 计费基数 ${feeCalc.base}${feeCalc.fallback ? "（订单明细缺失回退）" : "（商品净额）"}`);
      const data = tradeLedger(orderId);
      saveIdempotent(req, idemKey, 201, data, payload);
      db.exec("COMMIT");
      return json(res, 201, data);
    } catch (cause) {
      db.exec("ROLLBACK");
      throw cause;
    }
  }
  const shipmentMatch = path.match(/^\/api\/v1\/trades\/([^/]+)\/shipments$/);
  if (shipmentMatch && req.method === "POST") {
    if (!authorized(req)) return error(res, 401, "需要物流履约授权");
    const payload = await body(req), id = shipmentMatch[1];
    const idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产发运登记必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    const order = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
    if (!order) return error(res, 404, "交易不存在");
    if (!canActForOrder(req, order, "supplier")) return error(res, 403, "只有供货方或授权后台岗位可以登记发运");
    if (["已取消", "已完成"].includes(order.status) || db.prepare("SELECT id FROM settlement_records WHERE order_id=? LIMIT 1").get(id)) return error(res, 409, "交易已取消或已关账，禁止新增运单");
    if (productionMode) {
      const contract = db.prepare("SELECT status FROM contracts WHERE order_id=? ORDER BY id LIMIT 1").get(id);
      if (!contract || contract.status !== "已签署") return error(res, 409, "合同双方完成CA签署前不得登记发运");
      if (!shipmentPaymentReady(order)) return error(res, 409, "当前结算模型要求托管资金确认后才能登记发运");
    }
    if (productionMode && process.env.SHUZHI_LOGISTICS_READY !== "true") return error(res, 503, "物流机构尚未完成联调，暂不接受生产发运登记");
    if (!payload.provider) return error(res, 400, "物流公司不能为空");
    const shipmentId = String(payload.shipment_id || `SHP-${randomUUID()}`).trim();
    const trackingNo = String(payload.tracking_no || (productionMode ? `PENDING-${shipmentId}` : "")).trim();
    if (!trackingNo) return error(res, 400, "物流公司和运单号不能为空");
    if (db.prepare("SELECT id FROM shipments WHERE id=? OR (order_id=? AND tracking_no=?) LIMIT 1").get(shipmentId, id, trackingNo)) return error(res, 409, "该运单已登记，禁止重复发运");
    const t = now();
    const shipmentTemperature = payload.temperature == null ? null : Number(payload.temperature);
    if (shipmentTemperature != null && (!Number.isFinite(shipmentTemperature) || shipmentTemperature < -80 || shipmentTemperature > 80)) return error(res, 400, "运输温度必须在 -80℃ 至 80℃之间");
    const shipmentActor = actorFor(req, "物流履约岗");
    if (productionMode) {
      if (!Array.isArray(payload.goods) || payload.goods.length === 0 || payload.goods.length > 100) return error(res, 400, "生产物流指令必须提供货物明细");
      const consignorCode = String(payload.consignor_credit_code || "").trim();
      const consigneeCode = String(payload.consignee_credit_code || "").trim();
      if (!consignorCode || !consigneeCode || !payload.consignor || !payload.consignee) return error(res, 400, "生产物流指令必须提供收发货主体和统一社会信用代码");
      const consignorAddress = String(payload.consignor_address || "").trim();
      const consigneeAddress = String(payload.consignee_address || "").trim();
      if (!consignorAddress || !consigneeAddress || consignorAddress.length > 300 || consigneeAddress.length > 300) return error(res, 400, "生产物流指令必须提供不超过 300 字的收发货地址快照");
      db.exec("BEGIN");
      try {
        db.prepare("INSERT INTO shipments(id,order_id,provider,tracking_no,carrier_name,vehicle_no,temperature,status,departed_at,arrived_at,evidence,updated_at,consignor_address,consignee_address) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(shipmentId, id, String(payload.provider).trim().slice(0, 80), trackingNo.slice(0, 80), String(payload.carrier_name || "").slice(0, 120), String(payload.vehicle_no || "").slice(0, 40), shipmentTemperature, "待机构受理", null, null, String(payload.evidence || "待第三方物流受理").slice(0, 500), t, consignorAddress, consigneeAddress);
        const queued = enqueueProductionInstitutionCommand({
          provider: "logistics",
          aggregateType: "shipment",
          aggregateId: shipmentId,
          commandType: "create",
          idempotencyKey: `LOGISTICS:CREATE:${shipmentId}`,
          command: {
            command_id: `CMD-LOGISTICS-CREATE-${shipmentId}`,
            action: "create",
            order_id: id,
            shipment_id: shipmentId,
            goods: payload.goods,
            consignor: merchantParty(order.supplier_id, consignorCode),
            consignee: merchantParty(order.buyer_id, consigneeCode),
            consignor_address: consignorAddress,
            consignee_address: consigneeAddress,
            service_level: String(payload.service_level || "standard").slice(0, 40),
          },
          now: t,
        });
        log(shipmentActor, "QUEUE_LOGISTICS_SHIPMENT", id, `${payload.provider}/${shipmentId}`);
        const data = { ...db.prepare("SELECT * FROM shipments WHERE id=?").get(shipmentId), institution_outbox: publicInstitutionCommand(queued) };
        saveIdempotent(req, idemKey, 202, data, payload);
        db.exec("COMMIT");
        return json(res, 202, data);
      } catch (cause) {
        db.exec("ROLLBACK");
        throw cause;
      }
    }
    db.prepare("INSERT INTO shipments(id,order_id,provider,tracking_no,carrier_name,vehicle_no,temperature,status,departed_at,arrived_at,evidence,updated_at,consignor_address,consignee_address) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run(shipmentId, id, String(payload.provider).trim().slice(0, 80), trackingNo.slice(0, 80), String(payload.carrier_name || "").slice(0, 120), String(payload.vehicle_no || "").slice(0, 40), shipmentTemperature, "运输中", t, null, String(payload.evidence || "第三方物流回传").slice(0, 500), t, "本地演示发货地址", "本地演示收货地址");
    log(shipmentActor, "CREATE_SHIPMENT", id, `${payload.provider}/${payload.tracking_no}`);
    const data = db.prepare("SELECT * FROM shipments WHERE id=?").get(shipmentId);
    saveIdempotent(req, idemKey, 201, data, payload);
    return json(res, 201, data);
  }
  const acceptMatch = path.match(/^\/api\/v1\/trades\/([^/]+)\/accept$/);
  if (acceptMatch && req.method === "POST") {
    if (!authorized(req)) return error(res, 401, "需要采购验收授权");
    const payload = await body(req), id = acceptMatch[1], result = String(payload.result || "");
    const idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产验收必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    if (!["accepted", "disputed"].includes(result)) return error(res, 400, "验收结果不合法");
    const order = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
    if (!order) return error(res, 404, "交易不存在");
    if (!canActForOrder(req, order, "buyer")) return error(res, 403, "只有采购方或授权后台岗位可以执行验收");
    if (["已取消", "已完成"].includes(order.status) || db.prepare("SELECT id FROM settlement_records WHERE order_id=? LIMIT 1").get(id)) return error(res, 409, "交易已取消或已关账，禁止新增验收结论");
    if (db.prepare("SELECT id FROM acceptances WHERE order_id=? AND result IN ('accepted','disputed') LIMIT 1").get(id)) return error(res, 409, "该交易已存在最终验收结论，禁止重复提交");
    const acceptedQty = payload.accepted_qty == null ? null : Number(payload.accepted_qty);
    const orderedQty = Number(db.prepare("SELECT COALESCE(SUM(qty),0) AS qty FROM order_items WHERE order_id=?").get(id).qty);
    if (result === "accepted" && (!finitePositive(acceptedQty) || acceptedQty > orderedQty)) return error(res, 400, "合格验收数量必须为正数且不得超过订单数量");
    if (result === "disputed" && acceptedQty != null && (!finiteNonNegative(acceptedQty) || acceptedQty > orderedQty)) return error(res, 400, "争议验收数量不合法");
    // 生产环境的最终验收必须建立在物流机构已确认送达的事实之上。
    // 本地演示仍保留原有的离线跑通能力；真实交易不能跳过发运、签收再进入开票/结算。
    if (productionMode) {
      const shipmentSummary = db.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN status='已送达' THEN 1 ELSE 0 END) AS delivered, SUM(CASE WHEN status='异常' THEN 1 ELSE 0 END) AS exceptions FROM shipments WHERE order_id=?").get(id);
      const shipmentTotal = Number(shipmentSummary?.total || 0);
      const delivered = Number(shipmentSummary?.delivered || 0);
      const exceptions = Number(shipmentSummary?.exceptions || 0);
      if (!shipmentTotal || delivered !== shipmentTotal || exceptions > 0) return error(res, 409, "所有运单须经物流机构确认已送达且无异常后才能验收");
    }
    const acceptanceId = `ACC-${randomUUID()}`, t = now();
    const acceptanceActor = productionMode ? actorFor(req, "采购验收岗") : String(payload.receiver || "采购验收岗");
    db.prepare("INSERT INTO acceptances VALUES (?,?,?,?,?,?,?,?)").run(acceptanceId, id, acceptanceActor.slice(0, 120), result, acceptedQty, String(payload.evidence || "复磅/抽检/签收证据").slice(0, 500), t, result === "disputed" ? String(payload.dispute_note || "").slice(0, 500) : null);
    db.prepare("UPDATE orders SET status=?,payment_status=?,updated_at=? WHERE id=?").run(result === "accepted" ? "待开票" : "争议处理中", result === "accepted" ? "待开票" : "争议款冻结", t, id);
    log(acceptanceActor, result === "accepted" ? "ACCEPT_TRADE" : "DISPUTE_TRADE", id, String(payload.evidence || ""));
    const data = tradeLedger(id);
    saveIdempotent(req, idemKey, 201, data, payload);
    return json(res, 201, data);
  }
  const invoiceMatch = path.match(/^\/api\/v1\/trades\/([^/]+)\/invoice$/);
  if (invoiceMatch && req.method === "POST") {
    if (!authorized(req)) return error(res, 401, "需要开票授权");
    const payload = await body(req), id = invoiceMatch[1];
    const idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产发票登记必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    const order = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
    if (!order) return error(res, 404, "交易不存在");
    if (!canActForOrder(req, order, "supplier")) return error(res, 403, "只有供货方或授权后台岗位可以登记发票");
    if (["已取消", "已完成"].includes(order.status) || db.prepare("SELECT id FROM settlement_records WHERE order_id=? LIMIT 1").get(id)) return error(res, 409, "交易已取消或已关账，禁止新增发票");
    if (productionMode && ["退款待机构受理", "退款处理中", "部分退款", "已退款", "退款失败"].includes(String(order.payment_status || ""))) return error(res, 409, "交易存在退款或退款异常，普通发票暂不得开具；请先完成财务复核或走红冲流程");
    if (productionMode && process.env.SHUZHI_INVOICE_READY !== "true") return error(res, 503, "发票机构尚未完成联调，暂不接受生产开票登记");
    if (db.prepare("SELECT id FROM invoices WHERE order_id=? AND status='已开具' LIMIT 1").get(id)) return error(res, 409, "该交易发票已开具，禁止重复登记");
    const accepted = db.prepare("SELECT id FROM acceptances WHERE order_id=? AND result='accepted'").get(id);
    if (!accepted) return error(res, 409, "验收合格前不得开票");
    if (!productionMode && !payload.invoice_no) return error(res, 400, "发票号码不能为空");
    const invoice = db.prepare("SELECT id,amount FROM invoices WHERE order_id=? LIMIT 1").get(id);
    if (productionMode && payload.amount !== undefined) {
      try { moneyCents(payload.amount, "开票金额"); } catch (cause) { return error(res, cause.status || 400, cause.message); }
    }
    if (!invoice || (payload.amount !== undefined && (!finitePositive(payload.amount, 1e12) || Math.abs(Number(payload.amount) - Number(invoice.amount)) > 0.01))) return error(res, 409, "发票金额与订单金额不一致");
    if (productionMode && payload.amount === undefined) return error(res, 400, "生产开票必须提供 amount 用于四流核对");
    const t = now();
    if (productionMode) {
      const sellerCreditCode = String(payload.seller_credit_code || "").trim();
      const buyerCreditCode = String(payload.buyer_credit_code || "").trim();
      const taxRate = Number(payload.tax_rate);
      const invoiceType = String(payload.invoice_type || "").trim().slice(0, 80);
      const taxCategoryCode = String(payload.tax_category_code || "").trim().slice(0, 80);
      if (!sellerCreditCode || !buyerCreditCode || !Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1 || !invoiceType || !taxCategoryCode) return error(res, 400, "生产开票指令必须提供购销双方统一社会信用代码、税率、发票类型和税收分类编码");
      const itemRows = db.prepare("SELECT name,qty,unit_price FROM order_items WHERE order_id=? ORDER BY id").all(id);
      if (!itemRows.length) return error(res, 409, "生产开票缺少商品明细");
      const goodsNet = Math.round(itemRows.reduce((sum, item) => sum + Number(item.qty) * Number(item.unit_price), 0) * 100) / 100;
      if (!Number.isFinite(goodsNet) || goodsNet <= 0 || goodsNet > Number(invoice.amount) + 0.01) return error(res, 409, "生产开票商品明细金额超过应开金额，禁止开票");
      const serviceFee = Math.round((Number(invoice.amount) - goodsNet) * 100) / 100;
      db.exec("BEGIN");
      try {
        db.prepare("UPDATE invoices SET invoice_type=?,tax_category_code=?,tax_rate=?,seller_credit_code=?,buyer_credit_code=? WHERE id=?").run(invoiceType, taxCategoryCode, taxRate, sellerCreditCode.toUpperCase(), buyerCreditCode.toUpperCase(), invoice.id);
        const queued = enqueueProductionInstitutionCommand({
          provider: "invoice",
          aggregateType: "order",
          aggregateId: id,
          commandType: "issue",
          idempotencyKey: `INVOICE:ISSUE:${id}`,
          command: {
            command_id: `CMD-INVOICE-ISSUE-${id}`,
            action: "issue",
            order_id: id,
            invoice_id: `INV-${id}`,
            seller: merchantParty(order.supplier_id, sellerCreditCode),
            buyer: merchantParty(order.buyer_id, buyerCreditCode),
            money: { amount: Number(invoice.amount), currency: "CNY" },
            items: itemRows.map((item) => ({ name: item.name, quantity: Number(item.qty), unit_price: Number(item.unit_price), tax_rate: taxRate, tax_category_code: taxCategoryCode })),
            service_fee: serviceFee,
            invoice_type: invoiceType,
            tax_category_code: taxCategoryCode,
            original_invoice_no: null,
          },
          now: t,
        });
        log(actorFor(req, "供货财务岗"), "QUEUE_INVOICE_ISSUE", id, queued.id);
        const data = { ...tradeLedger(id), invoice_pending: true, institution_outbox: publicInstitutionCommand(queued) };
        saveIdempotent(req, idemKey, 202, data, payload);
        db.exec("COMMIT");
        return json(res, 202, data);
      } catch (cause) {
        db.exec("ROLLBACK");
        throw cause;
      }
    }
    db.prepare("UPDATE invoices SET invoice_no=?,status='已开具',issued_at=? WHERE order_id=?").run(String(payload.invoice_no), t, id);
    db.prepare("UPDATE orders SET invoice_status='已验真',updated_at=? WHERE id=?").run(t, id);
    log(actorFor(req, "供货财务岗"), "ISSUE_INVOICE", id, String(payload.invoice_no));
    const data = tradeLedger(id);
    saveIdempotent(req, idemKey, 200, data, payload);
    return json(res, 200, data);
  }
  const creditMatch = path.match(/^\/api\/v1\/merchants\/([^/]+)\/credit$/);
  if (creditMatch && req.method === "GET") {
    if (!authorized(req)) return error(res, 401, "需要信用档案查看授权");
    if (!canAccessMerchant(req, creditMatch[1])) return error(res, 403, "无权查看该商户完整信用档案");
    const credit = db.prepare("SELECT c.*,m.name merchant_name FROM merchant_credit c JOIN merchants m ON m.id=c.merchant_id WHERE c.merchant_id=?").get(creditMatch[1]);
    if (!credit) return error(res, 404, "商户信用档案不存在");
    return json(res, 200, { ...credit, rewards: db.prepare("SELECT type,points,reason,created_at FROM merchant_rewards WHERE merchant_id=? ORDER BY created_at DESC").all(creditMatch[1]) });
  }
  const advanceMatch = path.match(/^\/api\/v1\/trades\/([^/]+)\/advance$/);
  if (advanceMatch && req.method === "POST") {
    if (!authorized(req)) return error(res, 401, "需要交易操作授权");
    if (productionMode) return error(res, 403, "生产环境禁止一键推进真实交易，请使用签约、发运、验收、开票和结算的独立业务接口");
    const id = advanceMatch[1], order = db.prepare("SELECT * FROM orders WHERE id=?").get(id);
    if (!order) return error(res, 404, "交易不存在");
    const next = Number(order.fulfillment_step) + 1;
    if (next > 11) return error(res, 409, "交易已关账");
    const titles = ["批量清单拆单", "采购主体与授权核验", "供应商逐户确认", "订单复核与成交", "CA合同包双签", "机构支付授权", "分仓备货与出库", "多运单在途协同", "到货复磅与验收", "批量开票与验真", "机构条件分账结算", "四流三账对账关账"];
    const title = titles[next];
    db.prepare("UPDATE orders SET fulfillment_step=?,status=?,payment_status=?,invoice_status=?,updated_at=? WHERE id=?").run(next, next >= 11 ? "已完成" : "履约中", next >= 10 ? "已分账" : order.payment_status, next >= 9 ? "已验真" : order.invoice_status, now(), id);
    db.prepare("INSERT INTO fulfillment_events(order_id,step,title,evidence,actor,created_at) VALUES (?,?,?,?,?,?)").run(id, next, title, `LOCAL-${next + 1}-${id.slice(-6)}`, "本地演示管理员", now());
    log("local-admin", "ADVANCE_TRADE", id, title);
    return json(res, 200, orderView(id));
  }
  if (path === "/api/v1/admin/overview") {
    if (!hasAdminPermission(req, "data")) return error(res, 403, "当前管理员角色无数据看板权限");
    const stats = db.prepare("SELECT COUNT(*) orders, COALESCE(SUM(amount),0) gmv, SUM(CASE WHEN status='已完成' THEN 1 ELSE 0 END) completed, SUM(CASE WHEN payment_status='机构待确认' THEN 1 ELSE 0 END) pending_payment FROM orders").get();
    const merchantStats = db.prepare("SELECT COUNT(*) total, SUM(CASE WHEN license_status='verified' AND bank_status='verified' THEN 1 ELSE 0 END) verified, SUM(CASE WHEN risk_level<>'低' THEN 1 ELSE 0 END) elevated FROM merchants").get();
    const flow = db.prepare("SELECT fulfillment_step step, COUNT(*) count FROM orders GROUP BY fulfillment_step ORDER BY fulfillment_step").all();
    const analytics = db.prepare("SELECT COALESCE(AVG(amount),0) average_order_value, COALESCE(SUM(CASE WHEN payment_status='已分账' THEN amount ELSE 0 END),0) settled_amount, COALESCE(SUM(CASE WHEN invoice_status='待开票' THEN amount ELSE 0 END),0) invoice_pending_amount FROM orders").get();
    const audit = db.prepare("SELECT COUNT(*) events, MAX(created_at) last_event_at FROM audit_logs").get();
    const riskStats = db.prepare("SELECT (SELECT COUNT(*) FROM products WHERE quality_status='pending_review') pending_products,(SELECT COUNT(*) FROM acceptances WHERE result='disputed') disputes,(SELECT COUNT(*) FROM merchant_credit WHERE score<70) low_credit_merchants").get();
    return json(res, 200, {
      ...stats,
      merchants: merchantStats.total,
      analytics: { ...analytics, order_completion_rate: Number(stats.orders) ? Number(stats.completed || 0) / Number(stats.orders) : 0 },
      security: { merchant_total: merchantStats.total, merchant_verified: merchantStats.verified, elevated_risk_merchants: merchantStats.elevated, audit_events: audit.events, last_audit_at: audit.last_event_at, ...riskStats, controls: [{ key: "主体与对公账户", status: "正常" }, { key: "商品图文视频审核", status: Number(riskStats.pending_products) ? "有待处理" : "正常" }, { key: "物流验收与争议", status: Number(riskStats.disputes) ? "有待处理" : "正常" }, { key: "支付双人复核", status: "正常" }, { key: "验收后分账", status: Number(stats.pending_payment) ? "有待处理" : "正常" }] },
      flow,
      db: { engine: "SQLite", path: productionMode ? undefined : dbPath, mode: runtimeMode },
    });
  }
  if (path === "/api/v1/admin/orders") { if (!hasAdminPermission(req, "finance")) return error(res, 403, "当前管理员角色无交易与结算查看权限"); return json(res, 200, db.prepare("SELECT o.*, b.name buyer_name,s.name supplier_name FROM orders o JOIN merchants b ON b.id=o.buyer_id JOIN merchants s ON s.id=o.supplier_id ORDER BY o.updated_at DESC").all()); }
  if (path === "/api/v1/admin/merchants") { if (!hasAdminPermission(req, "merchant")) return error(res, 403, "当前管理员角色无商户管理权限"); return json(res, 200, db.prepare("SELECT m.*,o.name organization_name,o.region FROM merchants m JOIN organizations o ON o.id=m.organization_id ORDER BY m.name").all()); }
  if (path === "/api/v1/admin/products") { if (!hasAdminPermission(req, "audit")) return error(res, 403, "当前管理员角色无商品审核权限"); return json(res, 200, db.prepare("SELECT p.*,m.name merchant_name FROM products p JOIN merchants m ON m.id=p.merchant_id ORDER BY p.name").all().map((p) => ({ ...p, media: db.prepare("SELECT media_type,url,status FROM product_media WHERE product_id=? ORDER BY sort_no").all(p.id) }))); }
  if (path === "/api/v1/admin/merchant-credit") { if (!hasAdminPermission(req, "risk")) return error(res, 403, "当前管理员角色无信用风控权限"); return json(res, 200, db.prepare("SELECT c.*,m.name merchant_name FROM merchant_credit c JOIN merchants m ON m.id=c.merchant_id ORDER BY c.score DESC").all()); }
  if (path === "/api/v1/admin/service-areas") { if (!hasAdminPermission(req, "merchant")) return error(res, 403, "当前管理员角色无区域管理权限"); return json(res, 200, db.prepare("SELECT a.*,m.name merchant_name FROM merchant_service_areas a JOIN merchants m ON m.id=a.merchant_id ORDER BY a.updated_at DESC").all().map((a) => ({ ...a, regions: JSON.parse(a.regions || "[]"), delivery_modes: JSON.parse(a.delivery_modes || "[]") }))); }
  if (path === "/api/v1/admin/integrations") { if (!hasAdminPermission(req, "system")) return error(res, 403, "当前管理员角色无系统集成权限"); return json(res, 200, { ports: integrationPorts, webhooks: Object.keys(integrationSecrets).map((provider) => ({ provider, endpoint: `/api/v1/integrations/${provider}/webhook`, secret_configured: Boolean(integrationSecrets[provider]) })), outbox: institutionOutboxOverview(db), rules: { webhook_signature: "HMAC-SHA256(timestamp.raw_body)", replay_window_seconds: webhookReplayWindowSeconds, idempotency_required: true, outbound_delivery: "事务性 Outbox 至少一次投递；机构接口必须按 Idempotency-Key 去重", inbound_allowlist: "生产环境配置固定 IP/专线" } }); }
  if (path === "/api/v1/admin/institution-outbox" && req.method === "GET") {
    if (!hasAdminPermission(req, "system")) return error(res, 403, "当前管理员角色无机构指令查看权限");
    const requestedStatus = String(url.searchParams.get("status") || "").trim();
    const allowedStatuses = new Set(["pending", "processing", "accepted", "retry", "dead"]);
    if (requestedStatus && !allowedStatuses.has(requestedStatus)) return error(res, 400, "机构指令状态筛选不合法");
    const rows = requestedStatus
      ? db.prepare("SELECT * FROM institution_outbox WHERE status=? ORDER BY created_at DESC LIMIT 200").all(requestedStatus)
      : db.prepare("SELECT * FROM institution_outbox ORDER BY created_at DESC LIMIT 200").all();
    return json(res, 200, { overview: institutionOutboxOverview(db), commands: rows.map(publicInstitutionCommand) });
  }
  const outboxRetryMatch = path.match(/^\/api\/v1\/admin\/institution-outbox\/([^/]+)\/retry$/);
  if (outboxRetryMatch && req.method === "POST") {
    if (!hasAdminPermission(req, "system", true)) return error(res, 403, "只有系统管理岗位可以重放机构死信指令");
    const payload = await body(req), idemKey = requestKey(req, payload);
    if (productionMode && !idemKey) return error(res, 400, "生产死信重放必须提供 Idempotency-Key");
    if (replayIdempotent(req, res, idemKey, payload)) return;
    const actor = actorFor(req, "系统管理岗");
    db.exec("BEGIN");
    try {
      const data = requeueDeadInstitutionCommand(db, { id: outboxRetryMatch[1] });
      log(actor, "REQUEUE_INSTITUTION_COMMAND", data.id, `${data.provider} · ${data.aggregate_type}/${data.aggregate_id}`);
      saveIdempotent(req, idemKey, 200, data, payload);
      db.exec("COMMIT");
      return json(res, 200, data);
    } catch (cause) {
      db.exec("ROLLBACK");
      throw cause;
    }
  }
  if (path === "/api/v1/admin/operations") { if (!hasAdminPermission(req, "data")) return error(res, 403, "当前管理员角色无业务流程查看权限"); return json(res, 200, operationWorkflowRules.map((item) => operationView(item.key))); }
  if (path === "/api/v1/admin/platform-events") { if (!hasAdminPermission(req, "audit")) return error(res, 403, "当前管理员角色无平台事件审计权限"); return json(res, 200, db.prepare("SELECT * FROM business_events ORDER BY id DESC LIMIT 200").all().map(businessEventView)); }
  if (path === "/api/v1/admin/merchant-applications") { if (!hasAdminPermission(req, "merchant")) return error(res, 403, "当前管理员角色无商户申请权限"); return json(res, 200, db.prepare("SELECT * FROM merchant_applications ORDER BY submitted_at DESC").all().map((item) => ({ ...item, documents: JSON.parse(item.documents || "[]") }))); }
  if (path === "/api/v1/admin/audit-logs") { if (!hasAdminPermission(req, "audit")) return error(res, 403, "当前管理员角色无安全审计权限"); return json(res, 200, db.prepare("SELECT * FROM audit_logs ORDER BY id DESC LIMIT 100").all()); }
  return error(res, 404, "接口不存在");
 } catch (cause) {
  if (cause instanceof HttpError) return error(res, cause.status, cause.message);
  if (cause instanceof InstitutionOutboxError) return error(res, cause.code === "NOT_DEAD" ? 409 : 400, cause.message);
  console.error("[数智供社] request failed", cause);
  return error(res, 500, "服务器处理请求失败");
 }
});
server.listen(port, "0.0.0.0", () => console.log(`[数智供社] local API listening on http://localhost:${port} · SQLite ${dbPath}`));
process.on("SIGINT", () => { db.close(); server.close(() => process.exit(0)); });
