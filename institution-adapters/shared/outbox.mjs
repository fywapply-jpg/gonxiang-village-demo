import { randomUUID } from "node:crypto";
import { canonicalizeInstitutionCommand } from "./client.mjs";

const PROVIDERS = new Set(["ca", "payment", "logistics", "invoice", "regulator"]);
const ACTIVE_STATUSES = new Set(["pending", "retry", "processing"]);

export class InstitutionOutboxError extends Error {
  constructor(code, message, options = {}) {
    super(message, options);
    this.name = "InstitutionOutboxError";
    this.code = code;
  }
}

const iso = (value = new Date()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new InstitutionOutboxError("INVALID_TIME", "机构指令时间不合法");
  return date.toISOString();
};

const parsePayload = (raw) => {
  try { return JSON.parse(raw); } catch { throw new InstitutionOutboxError("CORRUPT_PAYLOAD", "机构指令载荷无法解析"); }
};

const safeErrorText = (value, fallback) => String(value || fallback).replace(/[\r\n\t]+/g, " ").slice(0, 240);

export const ensureInstitutionOutboxSchema = (db) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS institution_outbox (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL CHECK(provider IN ('ca','payment','logistics','invoice','regulator')),
      aggregate_type TEXT NOT NULL,
      aggregate_id TEXT NOT NULL,
      command_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','accepted','retry','dead')),
      attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts >= 0),
      max_attempts INTEGER NOT NULL DEFAULT 8 CHECK(max_attempts BETWEEN 1 AND 20),
      next_attempt_at TEXT NOT NULL,
      locked_at TEXT,
      lock_owner TEXT,
      instruction_id TEXT,
      last_error_code TEXT,
      last_error_message TEXT,
      accepted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_institution_outbox_dispatch
      ON institution_outbox(status, next_attempt_at, created_at);
    CREATE INDEX IF NOT EXISTS idx_institution_outbox_aggregate
      ON institution_outbox(aggregate_type, aggregate_id, created_at);
  `);
};

export const enqueueInstitutionCommand = (db, {
  provider,
  aggregateType,
  aggregateId,
  commandType,
  command,
  idempotencyKey,
  maxAttempts = 8,
  now = new Date(),
}) => {
  if (!PROVIDERS.has(provider)) throw new InstitutionOutboxError("UNSUPPORTED_PROVIDER", "机构类型不受支持");
  if (![aggregateType, aggregateId, commandType].every((item) => String(item || "").trim())) throw new InstitutionOutboxError("INVALID_COMMAND", "聚合类型、聚合编号和命令类型不能为空");
  if (!command || typeof command !== "object" || Array.isArray(command)) throw new InstitutionOutboxError("INVALID_COMMAND", "机构命令必须是 JSON 对象");
  const key = String(idempotencyKey || "").trim();
  if (key.length < 16 || key.length > 128) throw new InstitutionOutboxError("INVALID_IDEMPOTENCY_KEY", "机构指令幂等键长度必须为 16—128 个字符");
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 20) throw new InstitutionOutboxError("INVALID_MAX_ATTEMPTS", "最大投递次数必须是 1—20 的整数");
  const payload = canonicalizeInstitutionCommand(command);
  if (!payload || Buffer.byteLength(payload, "utf8") > 1024 * 1024) throw new InstitutionOutboxError("INVALID_COMMAND", "机构指令载荷不能为空且不得超过 1MB");
  const existing = db.prepare("SELECT * FROM institution_outbox WHERE idempotency_key=?").get(key);
  if (existing) {
    if (existing.provider !== provider || existing.aggregate_type !== String(aggregateType) || existing.aggregate_id !== String(aggregateId) || existing.command_type !== String(commandType) || existing.payload !== payload) {
      throw new InstitutionOutboxError("IDEMPOTENCY_CONFLICT", "幂等键已被不同机构指令占用");
    }
    return { ...existing, payload: parsePayload(existing.payload), replayed: true };
  }
  const createdAt = iso(now);
  const id = String(command.command_id || `CMD-${randomUUID()}`);
  try {
    db.prepare(`INSERT INTO institution_outbox(
      id,provider,aggregate_type,aggregate_id,command_type,payload,idempotency_key,status,
      attempts,max_attempts,next_attempt_at,created_at,updated_at
    ) VALUES (?,?,?,?,?,?,?,'pending',0,?,?,?,?)`).run(
      id,
      provider,
      String(aggregateType),
      String(aggregateId),
      String(commandType),
      payload,
      key,
      maxAttempts,
      createdAt,
      createdAt,
      createdAt,
    );
  } catch (cause) {
    if (String(cause?.message || "").includes("UNIQUE constraint failed")) throw new InstitutionOutboxError("COMMAND_CONFLICT", "机构命令编号或幂等键已经存在", { cause });
    throw cause;
  }
  return { ...db.prepare("SELECT * FROM institution_outbox WHERE id=?").get(id), payload: command, replayed: false };
};

export const claimInstitutionCommand = (db, {
  workerId,
  leaseMs = 60_000,
  now = new Date(),
} = {}) => {
  const owner = String(workerId || "").trim();
  if (!owner) throw new InstitutionOutboxError("INVALID_WORKER", "投递工作进程编号不能为空");
  if (!Number.isInteger(leaseMs) || leaseMs < 5_000 || leaseMs > 15 * 60_000) throw new InstitutionOutboxError("INVALID_LEASE", "机构指令租约必须在 5 秒—15 分钟之间");
  const claimedAt = iso(now);
  const staleBefore = iso(new Date(new Date(claimedAt).getTime() - leaseMs));
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(`UPDATE institution_outbox
      SET status='retry',locked_at=NULL,lock_owner=NULL,next_attempt_at=?,last_error_code='LEASE_EXPIRED',
          last_error_message='上次投递进程租约已过期，已安全回收',updated_at=?
      WHERE status='processing' AND locked_at<=?`).run(claimedAt, claimedAt, staleBefore);
    const candidate = db.prepare(`SELECT id FROM institution_outbox
      WHERE status IN ('pending','retry') AND next_attempt_at<=?
      ORDER BY next_attempt_at,created_at LIMIT 1`).get(claimedAt);
    if (!candidate) {
      db.exec("COMMIT");
      return null;
    }
    const changed = db.prepare(`UPDATE institution_outbox
      SET status='processing',attempts=attempts+1,locked_at=?,lock_owner=?,updated_at=?
      WHERE id=? AND status IN ('pending','retry')`).run(claimedAt, owner, claimedAt, candidate.id);
    if (Number(changed.changes) !== 1) throw new InstitutionOutboxError("CLAIM_CONFLICT", "机构指令已被其他进程领取");
    const row = db.prepare("SELECT * FROM institution_outbox WHERE id=?").get(candidate.id);
    db.exec("COMMIT");
    return { ...row, payload: parsePayload(row.payload) };
  } catch (cause) {
    db.exec("ROLLBACK");
    throw cause;
  }
};

export const acceptInstitutionCommand = (db, { id, workerId, instructionId, now = new Date() }) => {
  const acceptedAt = iso(now);
  const instruction = String(instructionId || "").trim();
  if (!instruction) throw new InstitutionOutboxError("INVALID_INSTRUCTION", "机构受理编号不能为空");
  const changed = db.prepare(`UPDATE institution_outbox
    SET status='accepted',instruction_id=?,accepted_at=?,locked_at=NULL,lock_owner=NULL,
        last_error_code=NULL,last_error_message=NULL,updated_at=?
    WHERE id=? AND status='processing' AND lock_owner=?`).run(instruction, acceptedAt, acceptedAt, id, String(workerId || ""));
  if (Number(changed.changes) !== 1) throw new InstitutionOutboxError("LEASE_LOST", "机构指令租约已经失效，禁止覆盖其他进程结果");
  return publicInstitutionCommand(db.prepare("SELECT * FROM institution_outbox WHERE id=?").get(id));
};

export const failInstitutionCommand = (db, {
  id,
  workerId,
  errorCode,
  errorMessage,
  baseDelayMs = 5_000,
  maxDelayMs = 15 * 60_000,
  now = new Date(),
}) => {
  if (!Number.isInteger(baseDelayMs) || baseDelayMs < 1_000 || !Number.isInteger(maxDelayMs) || maxDelayMs < baseDelayMs) throw new InstitutionOutboxError("INVALID_RETRY_POLICY", "机构重试间隔配置不合法");
  const row = db.prepare("SELECT * FROM institution_outbox WHERE id=? AND status='processing' AND lock_owner=?").get(id, String(workerId || ""));
  if (!row) throw new InstitutionOutboxError("LEASE_LOST", "机构指令租约已经失效，禁止覆盖其他进程结果");
  const exhausted = Number(row.attempts) >= Number(row.max_attempts);
  const delay = Math.min(maxDelayMs, baseDelayMs * (2 ** Math.max(0, Number(row.attempts) - 1)));
  const updatedAt = iso(now);
  const nextAttemptAt = iso(new Date(new Date(updatedAt).getTime() + delay));
  db.prepare(`UPDATE institution_outbox
    SET status=?,next_attempt_at=?,locked_at=NULL,lock_owner=NULL,last_error_code=?,last_error_message=?,updated_at=?
    WHERE id=? AND status='processing' AND lock_owner=?`).run(
      exhausted ? "dead" : "retry",
      nextAttemptAt,
      safeErrorText(errorCode, "ADAPTER_ERROR"),
      safeErrorText(errorMessage, "机构适配器调用失败"),
      updatedAt,
      id,
      String(workerId || ""),
    );
  return publicInstitutionCommand(db.prepare("SELECT * FROM institution_outbox WHERE id=?").get(id));
};

export const requeueDeadInstitutionCommand = (db, { id, now = new Date() }) => {
  const updatedAt = iso(now);
  const changed = db.prepare(`UPDATE institution_outbox
    SET status='retry',attempts=0,next_attempt_at=?,locked_at=NULL,lock_owner=NULL,
        last_error_code=NULL,last_error_message=NULL,updated_at=?
    WHERE id=? AND status='dead'`).run(updatedAt, updatedAt, id);
  if (Number(changed.changes) !== 1) throw new InstitutionOutboxError("NOT_DEAD", "只有死信指令可以人工重试");
  return publicInstitutionCommand(db.prepare("SELECT * FROM institution_outbox WHERE id=?").get(id));
};

export const publicInstitutionCommand = (row) => row ? {
  id: row.id,
  provider: row.provider,
  aggregate_type: row.aggregate_type,
  aggregate_id: row.aggregate_id,
  command_type: row.command_type,
  idempotency_key: row.idempotency_key,
  status: row.status,
  attempts: Number(row.attempts),
  max_attempts: Number(row.max_attempts),
  next_attempt_at: row.next_attempt_at,
  instruction_id: row.instruction_id,
  last_error_code: row.last_error_code,
  last_error_message: row.last_error_message,
  accepted_at: row.accepted_at,
  created_at: row.created_at,
  updated_at: row.updated_at,
} : null;

export const institutionOutboxOverview = (db) => {
  const counts = Object.fromEntries(db.prepare("SELECT status,COUNT(*) count FROM institution_outbox GROUP BY status").all().map((row) => [row.status, Number(row.count)]));
  const due = Number(db.prepare("SELECT COUNT(*) count FROM institution_outbox WHERE status IN ('pending','retry') AND next_attempt_at<=?").get(new Date().toISOString()).count);
  const active = Object.entries(counts).filter(([status]) => ACTIVE_STATUSES.has(status)).reduce((sum, [, count]) => sum + count, 0);
  return { counts: { pending: 0, processing: 0, accepted: 0, retry: 0, dead: 0, ...counts }, due, active };
};
