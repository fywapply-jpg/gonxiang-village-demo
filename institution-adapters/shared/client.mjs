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
