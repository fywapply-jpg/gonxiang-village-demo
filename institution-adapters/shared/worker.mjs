import { randomUUID } from "node:crypto";
import {
  acceptInstitutionCommand,
  claimInstitutionCommand,
  failInstitutionCommand,
} from "./outbox.mjs";

export const createInstitutionOutboxWorker = ({
  db,
  clients = {},
  workerId = `institution-worker-${randomUUID()}`,
  pollMs = 1_000,
  leaseMs = 60_000,
  batchSize = 10,
  onResult = () => {},
}) => {
  if (!db) throw new Error("机构 Outbox 工作进程必须提供数据库");
  if (!Number.isInteger(pollMs) || pollMs < 250 || pollMs > 60_000) throw new Error("pollMs 必须在 250—60000 毫秒之间");
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) throw new Error("batchSize 必须在 1—100 之间");
  let timer = null;
  let running = false;

  const tick = async () => {
    if (running) return 0;
    running = true;
    let processed = 0;
    try {
      for (; processed < batchSize; processed += 1) {
        const item = claimInstitutionCommand(db, { workerId, leaseMs });
        if (!item) break;
        try {
          const client = clients[item.provider];
          if (!client) throw Object.assign(new Error(`${item.provider} 出站适配器尚未配置`), { code: "ADAPTER_NOT_CONFIGURED" });
          const result = await client.send(item.payload, { idempotencyKey: item.idempotency_key });
          const saved = acceptInstitutionCommand(db, { id: item.id, workerId, instructionId: result.instruction_id });
          onResult({ ok: true, command: saved });
        } catch (error) {
          const saved = failInstitutionCommand(db, { id: item.id, workerId, errorCode: error?.code, errorMessage: error?.message });
          onResult({ ok: false, command: saved });
        }
      }
      return processed;
    } finally {
      running = false;
    }
  };

  return Object.freeze({
    workerId,
    tick,
    start() {
      if (timer) return;
      timer = setInterval(() => { void tick(); }, pollMs);
      timer.unref?.();
      void tick();
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
  });
};
