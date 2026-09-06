import { createHmac } from "node:crypto";

export const PROVIDER_COMMAND_PATHS = Object.freeze({
  ca: "/adapter/v1/ca/signature-requests",
  payment: "/adapter/v1/payments/escrow-orders",
  logistics: "/adapter/v1/logistics/shipments",
  invoice: "/adapter/v1/invoices/issuance-requests",
  regulator: "/adapter/v1/regulatory/submissions",
});

export class InstitutionAdapterError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "InstitutionAdapterError";
    this.code = code;
  }
}

export const canonicalizeInstitutionCommand = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonicalizeInstitutionCommand).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalizeInstitutionCommand(value[key])}`).join(",")}}`;
  }
  let encoded;
  try { encoded = JSON.stringify(value); } catch { throw new InstitutionAdapterError("INVALID_COMMAND", "机构命令包含不可序列化字段"); }
  if (encoded === undefined) throw new InstitutionAdapterError("INVALID_COMMAND", "机构命令包含不可序列化字段");
  return encoded;
};

const validateCommand = (command) => {
  if (!command || typeof command !== "object" || Array.isArray(command)) throw new InstitutionAdapterError("INVALID_COMMAND", "机构命令必须是 JSON 对象");
  for (const key of ["command_id", "occurred_at", "callback_url"]) {
    if (!String(command[key] || "").trim()) throw new InstitutionAdapterError("INVALID_COMMAND", `机构命令缺少 ${key}`);
  }
  if (!Number.isFinite(Date.parse(command.occurred_at))) throw new InstitutionAdapterError("INVALID_COMMAND", "occurred_at 必须是有效时间");
  let callback;
  try { callback = new URL(command.callback_url); } catch { throw new InstitutionAdapterError("INVALID_COMMAND", "callback_url 格式不正确"); }
  if (callback.protocol !== "https:") throw new InstitutionAdapterError("INVALID_COMMAND", "callback_url 必须使用 HTTPS");
};

const requiredText = (command, fields, provider) => {
  for (const field of fields) {
    if (!String(command[field] || "").trim()) throw new InstitutionAdapterError("INVALID_COMMAND", `${provider} 机构命令缺少 ${field}`);
  }
};

const validateParty = (party, provider, field) => {
  if (!party || typeof party !== "object" || Array.isArray(party)) throw new InstitutionAdapterError("INVALID_COMMAND", `${provider} 机构命令缺少 ${field}`);
  requiredText(party, ["merchant_id", "legal_name", "credit_code"], provider);
  if (!/^[0-9A-Z]{15,18}$/i.test(String(party.credit_code))) throw new InstitutionAdapterError("INVALID_COMMAND", `${provider} 机构命令的 ${field}.credit_code 格式不正确`);
};

const validateMoney = (money, provider) => {
  if (!money || typeof money !== "object" || Array.isArray(money)) throw new InstitutionAdapterError("INVALID_COMMAND", `${provider} 机构命令缺少 money`);
  const amount = money.amount;
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-7 || money.currency !== "CNY") throw new InstitutionAdapterError("INVALID_COMMAND", `${provider} 机构命令 money 必须是精确到人民币分的 CNY 数值金额`);
};

const validateProviderCommand = (provider, command) => {
  if (provider === "ca") {
    requiredText(command, ["order_id", "contract_id", "contract_digest", "party", "signer_id"], provider);
    if (!/^[a-f0-9]{64}$/i.test(String(command.contract_digest)) || !["buyer", "supplier"].includes(command.party)) throw new InstitutionAdapterError("INVALID_COMMAND", "ca 机构命令的合同摘要或签署方不合法");
    return;
  }
  if (provider === "payment") {
    requiredText(command, ["action", "order_id", "payment_id"], provider);
    if (!["create_escrow", "release", "refund", "query"].includes(command.action)) throw new InstitutionAdapterError("INVALID_COMMAND", "payment 机构命令 action 不在协议范围");
    validateParty(command.payer, provider, "payer");
    validateParty(command.payee, provider, "payee");
    validateMoney(command.money, provider);
    return;
  }
  if (provider === "logistics") {
    requiredText(command, ["action", "order_id", "shipment_id"], provider);
    if (!["create", "cancel", "query"].includes(command.action)) throw new InstitutionAdapterError("INVALID_COMMAND", "logistics 机构命令 action 不在协议范围");
    if (!Array.isArray(command.goods) || command.goods.length < 1) throw new InstitutionAdapterError("INVALID_COMMAND", "logistics 机构命令 goods 不能为空");
    for (const item of command.goods) {
      requiredText(item, ["product_id", "name", "unit"], provider);
      if (typeof item.quantity !== "number" || !Number.isFinite(item.quantity) || item.quantity <= 0) throw new InstitutionAdapterError("INVALID_COMMAND", "logistics 机构命令 goods.quantity 必须是正数值");
    }
    validateParty(command.consignor, provider, "consignor");
    validateParty(command.consignee, provider, "consignee");
    return;
  }
  if (provider === "invoice") {
    requiredText(command, ["action", "order_id", "invoice_id"], provider);
    if (!["issue", "verify", "red_letter", "void"].includes(command.action)) throw new InstitutionAdapterError("INVALID_COMMAND", "invoice 机构命令 action 不在协议范围");
    validateParty(command.seller, provider, "seller");
    validateParty(command.buyer, provider, "buyer");
    validateMoney(command.money, provider);
    if (!Array.isArray(command.items) || command.items.length < 1) throw new InstitutionAdapterError("INVALID_COMMAND", "invoice 机构命令 items 不能为空");
    for (const item of command.items) {
      requiredText(item, ["name"], provider);
      if (typeof item.quantity !== "number" || !Number.isFinite(item.quantity) || item.quantity <= 0 || typeof item.unit_price !== "number" || !Number.isFinite(item.unit_price) || item.unit_price < 0 || typeof item.tax_rate !== "number" || !Number.isFinite(item.tax_rate) || item.tax_rate < 0 || item.tax_rate > 1) throw new InstitutionAdapterError("INVALID_COMMAND", "invoice 机构命令商品金额或税率必须是数值且在协议范围内");
    }
    return;
  }
  if (provider === "regulator") {
    requiredText(command, ["action", "submission_id", "subject_type", "subject_id", "authority_code", "data_minimization_version"], provider);
    if (!["submit", "query", "withdraw"].includes(command.action) || !Array.isArray(command.evidence_refs) || command.evidence_refs.length < 1) throw new InstitutionAdapterError("INVALID_COMMAND", "regulator 机构命令 action 或 evidence_refs 不合法");
  }
};

export const createInstitutionAdapterClient = ({ provider, baseUrl, secret, timeoutMs = 5000, fetchImpl = fetch, allowHttpForTests = false }) => {
  const path = PROVIDER_COMMAND_PATHS[provider];
  if (!path) throw new InstitutionAdapterError("UNSUPPORTED_PROVIDER", "不支持的机构类型");
  let base;
  try { base = new URL(baseUrl); } catch { throw new InstitutionAdapterError("INVALID_BASE_URL", "机构适配器地址格式不正确"); }
  if (base.username || base.password || base.search || base.hash) throw new InstitutionAdapterError("INVALID_BASE_URL", "机构适配器地址不得包含凭证、查询参数或片段");
  if (base.protocol !== "https:" && !(allowHttpForTests && base.protocol === "http:")) throw new InstitutionAdapterError("INSECURE_BASE_URL", "机构适配器必须使用 HTTPS");
  if (String(secret || "").length < 32) throw new InstitutionAdapterError("WEAK_SECRET", "机构出站签名密钥至少需要 32 个字符");
  if (!Number.isInteger(timeoutMs) || timeoutMs < 500 || timeoutMs > 30000) throw new InstitutionAdapterError("INVALID_TIMEOUT", "机构请求超时必须在 500—30000 毫秒之间");

  return Object.freeze({
    provider,
    async send(command, { idempotencyKey } = {}) {
      validateCommand(command);
      validateProviderCommand(provider, command);
      const key = String(idempotencyKey || "").trim();
      if (key.length < 16 || key.length > 128) throw new InstitutionAdapterError("INVALID_IDEMPOTENCY_KEY", "Idempotency-Key 长度必须为 16—128 个字符");
      const raw = canonicalizeInstitutionCommand(command);
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      let response;
      let responseText;
      try {
        response = await fetchImpl(new URL(path, base), {
          method: "POST",
          redirect: "error",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "Idempotency-Key": key,
            "X-Platform-Timestamp": String(timestamp),
            "X-Platform-Signature": signature,
            "X-Platform-Command-Id": String(command.command_id),
          },
          body: raw,
        });
        const contentLength = Number(response.headers?.get?.("content-length"));
        if (Number.isFinite(contentLength) && contentLength > 1024 * 1024) {
          throw new InstitutionAdapterError("ADAPTER_RESPONSE_TOO_LARGE", `${provider} 机构适配器响应超过 1MB`);
        }
        responseText = await response.text();
        if (Buffer.byteLength(responseText, "utf8") > 1024 * 1024) {
          throw new InstitutionAdapterError("ADAPTER_RESPONSE_TOO_LARGE", `${provider} 机构适配器响应超过 1MB`);
        }
      } catch (cause) {
        if (cause instanceof InstitutionAdapterError) throw cause;
        const timedOut = cause?.name === "AbortError";
        throw new InstitutionAdapterError(timedOut ? "ADAPTER_TIMEOUT" : "ADAPTER_UNREACHABLE", timedOut ? `${provider} 机构适配器请求超时` : `${provider} 机构适配器不可用`, { cause });
      } finally {
        clearTimeout(timeout);
      }

      let payload;
      try { payload = JSON.parse(responseText); } catch { throw new InstitutionAdapterError("INVALID_ADAPTER_RESPONSE", `${provider} 机构适配器返回非 JSON`); }
      if (response.status !== 202 || payload?.code !== 0 || !payload?.data?.instruction_id || !["accepted", "processing"].includes(payload?.data?.status)) {
        throw new InstitutionAdapterError("ADAPTER_REJECTED", `${provider} 机构适配器未受理命令（HTTP ${response.status}）`);
      }
      return payload.data;
    },
  });
};
