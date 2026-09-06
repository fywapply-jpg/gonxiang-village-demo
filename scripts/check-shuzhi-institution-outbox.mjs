#!/usr/bin/env node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  acceptInstitutionCommand,
  claimInstitutionCommand,
  enqueueInstitutionCommand,
  ensureInstitutionOutboxSchema,
  failInstitutionCommand,
  institutionOutboxOverview,
  InstitutionOutboxError,
  publicInstitutionCommand,
  requeueDeadInstitutionCommand,
} from "../institution-adapters/shared/outbox.mjs";
import { createInstitutionOutboxWorker } from "../institution-adapters/shared/worker.mjs";

const checks = [];
const add = (ok, name, detail) => checks.push({ ok, name, detail });
const root = mkdtempSync(join(tmpdir(), "szgs-institution-outbox-"));
const path = join(root, "outbox.sqlite");
const db = new DatabaseSync(path);
const peer = new DatabaseSync(path);
for (const connection of [db, peer]) connection.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");

const command = (id, extra = {}) => ({
  command_id: id,
  occurred_at: "2026-09-06T08:00:00.000Z",
  callback_url: "https://api.example.cn/api/v1/integrations/payment/webhook",
  order_id: "SZGS-ORDER-001",
  ...extra,
});

try {
  ensureInstitutionOutboxSchema(db);
  ensureInstitutionOutboxSchema(peer);
  const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='institution_outbox'").get();
  add(table?.name === "institution_outbox", "Outbox 表结构幂等", table?.name || "缺失");

  const first = enqueueInstitutionCommand(db, {
    provider: "payment",
    aggregateType: "order",
    aggregateId: "SZGS-ORDER-001",
    commandType: "create_escrow",
    command: command("CMD-OUTBOX-00000001"),
    idempotencyKey: "idem-outbox-00000001",
    now: "2026-09-06T08:00:00.000Z",
  });
  add(first.status === "pending" && !first.replayed, "业务事务内写入待投递指令", `${first.id}/${first.status}`);

  const replay = enqueueInstitutionCommand(db, {
    provider: "payment",
    aggregateType: "order",
    aggregateId: "SZGS-ORDER-001",
    commandType: "create_escrow",
    command: { order_id: "SZGS-ORDER-001", callback_url: first.payload.callback_url, occurred_at: first.payload.occurred_at, command_id: first.id },
    idempotencyKey: "idem-outbox-00000001",
    now: "2026-09-06T08:00:01.000Z",
  });
  add(replay.replayed && db.prepare("SELECT COUNT(*) count FROM institution_outbox").get().count === 1, "同语义请求幂等重放", `replayed=${replay.replayed}`);

  try {
    enqueueInstitutionCommand(db, {
      provider: "payment",
      aggregateType: "order",
      aggregateId: "DIFFERENT-ORDER",
      commandType: "create_escrow",
      command: command("CMD-OUTBOX-DIFFERENT"),
      idempotencyKey: "idem-outbox-00000001",
    });
    add(false, "幂等键冲突阻断", "错误地接受了不同指令");
  } catch (error) {
    add(error instanceof InstitutionOutboxError && error.code === "IDEMPOTENCY_CONFLICT", "幂等键冲突阻断", error.code);
  }

  const claimed = claimInstitutionCommand(db, { workerId: "worker-a", now: "2026-09-06T08:00:00.000Z" });
  const duplicateClaim = claimInstitutionCommand(peer, { workerId: "worker-b", now: "2026-09-06T08:00:00.000Z" });
  add(claimed?.id === first.id && duplicateClaim === null && claimed.attempts === 1, "并发领取不重复投递", `${claimed?.id}/peer=null`);

  try {
    acceptInstitutionCommand(peer, { id: claimed.id, workerId: "worker-b", instructionId: "INS-WRONG" });
    add(false, "租约所有权隔离", "错误进程覆盖了领取结果");
  } catch (error) {
    add(error instanceof InstitutionOutboxError && error.code === "LEASE_LOST", "租约所有权隔离", error.code);
  }

  const accepted = acceptInstitutionCommand(db, { id: claimed.id, workerId: "worker-a", instructionId: "INS-ACCEPTED-001", now: "2026-09-06T08:00:01.000Z" });
  add(accepted.status === "accepted" && accepted.instruction_id === "INS-ACCEPTED-001", "机构受理回执落库", accepted.instruction_id);

  const retryItem = enqueueInstitutionCommand(db, {
    provider: "invoice",
    aggregateType: "order",
    aggregateId: "SZGS-ORDER-002",
    commandType: "issue",
    command: command("CMD-OUTBOX-00000002", { order_id: "SZGS-ORDER-002" }),
    idempotencyKey: "idem-outbox-00000002",
    maxAttempts: 2,
    now: "2026-09-06T09:00:00.000Z",
  });
  const retryClaim1 = claimInstitutionCommand(db, { workerId: "worker-a", now: "2026-09-06T09:00:00.000Z" });
  const retry1 = failInstitutionCommand(db, { id: retryClaim1.id, workerId: "worker-a", errorCode: "UPSTREAM_503", errorMessage: "temporary\nsecret stack", now: "2026-09-06T09:00:00.000Z" });
  const earlyClaim = claimInstitutionCommand(db, { workerId: "worker-a", now: "2026-09-06T09:00:04.999Z" });
  add(retry1.status === "retry" && earlyClaim === null && retry1.last_error_message === "temporary secret stack", "指数退避与错误单行化", retry1.next_attempt_at);

  const retryClaim2 = claimInstitutionCommand(db, { workerId: "worker-a", now: "2026-09-06T09:00:05.000Z" });
  const dead = failInstitutionCommand(db, { id: retryClaim2.id, workerId: "worker-a", errorCode: "UPSTREAM_503", errorMessage: "仍不可用", now: "2026-09-06T09:00:05.000Z" });
  add(dead.status === "dead" && dead.attempts === 2, "最大次数转死信", `${dead.status}/${dead.attempts}`);

  const requeued = requeueDeadInstitutionCommand(db, { id: retryItem.id, now: "2026-09-06T09:01:00.000Z" });
  const requeuedClaim = claimInstitutionCommand(db, { workerId: "worker-a", now: "2026-09-06T09:01:00.000Z" });
  add(requeued.status === "retry" && requeued.attempts === 0 && requeuedClaim?.id === retryItem.id, "死信人工复核后重放", `${requeued.status}/${requeued.attempts}`);
  acceptInstitutionCommand(db, { id: requeuedClaim.id, workerId: "worker-a", instructionId: "INS-REPLAY-001", now: "2026-09-06T09:01:01.000Z" });

  const staleItem = enqueueInstitutionCommand(db, {
    provider: "logistics",
    aggregateType: "shipment",
    aggregateId: "SHP-001",
    commandType: "create",
    command: command("CMD-OUTBOX-00000003", { order_id: "SZGS-ORDER-003" }),
    idempotencyKey: "idem-outbox-00000003",
    now: "2026-09-06T10:00:00.000Z",
  });
  claimInstitutionCommand(db, { workerId: "crashed-worker", leaseMs: 5_000, now: "2026-09-06T10:00:00.000Z" });
  const recovered = claimInstitutionCommand(peer, { workerId: "recovery-worker", leaseMs: 5_000, now: "2026-09-06T10:00:05.001Z" });
  add(recovered?.id === staleItem.id && recovered.attempts === 2 && recovered.last_error_code === "LEASE_EXPIRED", "崩溃租约自动回收", `${recovered?.id}/${recovered?.attempts}`);
  acceptInstitutionCommand(peer, { id: recovered.id, workerId: "recovery-worker", instructionId: "INS-RECOVERED", now: "2026-09-06T10:00:06.000Z" });

  const workerItem = enqueueInstitutionCommand(db, {
    provider: "ca",
    aggregateType: "contract",
    aggregateId: "CA-001",
    commandType: "request_signature",
    command: command("CMD-OUTBOX-00000004", { order_id: "SZGS-ORDER-004" }),
    idempotencyKey: "idem-outbox-00000004",
    now: new Date(Date.now() - 1_000),
  });
  const worker = createInstitutionOutboxWorker({
    db,
    workerId: "worker-success",
    clients: { ca: { send: async () => ({ instruction_id: "INS-WORKER-001", status: "accepted" }) } },
  });
  const processed = await worker.tick();
  const workerResult = db.prepare("SELECT status,instruction_id FROM institution_outbox WHERE id=?").get(workerItem.id);
  add(processed === 1 && workerResult.status === "accepted" && workerResult.instruction_id === "INS-WORKER-001", "工作进程端到端投递", `${processed}/${workerResult.status}`);

  const publicView = publicInstitutionCommand(db.prepare("SELECT * FROM institution_outbox WHERE id=?").get(first.id));
  add(!Object.prototype.hasOwnProperty.call(publicView, "payload") && !Object.prototype.hasOwnProperty.call(publicView, "lock_owner"), "后台列表隐藏业务载荷与租约", Object.keys(publicView).length);

  const overview = institutionOutboxOverview(db);
  add(overview.counts.accepted === 4 && overview.active === 0 && overview.counts.dead === 0, "运营汇总口径", JSON.stringify(overview.counts));
} finally {
  peer.close();
  db.close();
  rmSync(root, { recursive: true, force: true });
}

for (const item of checks) console.log(`${item.ok ? "PASS" : "FAIL"}  ${item.name}  ${item.detail}`);
const failures = checks.filter((item) => !item.ok).length;
console.log(`\n数智供社 v8533 机构 Outbox 检查：${checks.length - failures} 通过，${failures} 失败`);
process.exitCode = failures ? 1 : 0;
