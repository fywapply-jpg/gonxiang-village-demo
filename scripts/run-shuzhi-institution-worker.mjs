#!/usr/bin/env node

import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createInstitutionAdapterClient } from "../institution-adapters/shared/client.mjs";
import { ensureInstitutionOutboxSchema } from "../institution-adapters/shared/outbox.mjs";
import { createInstitutionOutboxWorker } from "../institution-adapters/shared/worker.mjs";

if (String(process.env.SHUZHI_RUNTIME_MODE || "") !== "production") throw new Error("机构 Outbox 工作进程只能在 SHUZHI_RUNTIME_MODE=production 下启动");
const dbPath = resolve(String(process.env.SHUZHI_DB || "").trim());
if (!dbPath || dbPath === "." || dbPath === "/") throw new Error("SHUZHI_DB 必须是生产数据库绝对路径");
const providerConfig = {
  ca: ["SHUZHI_CA_READY", "SHUZHI_CA_ADAPTER_URL", "SHUZHI_CA_ADAPTER_SECRET"],
  payment: ["SHUZHI_PAYMENT_READY", "SHUZHI_PAYMENT_ADAPTER_URL", "SHUZHI_PAYMENT_ADAPTER_SECRET"],
  logistics: ["SHUZHI_LOGISTICS_READY", "SHUZHI_LOGISTICS_ADAPTER_URL", "SHUZHI_LOGISTICS_ADAPTER_SECRET"],
  invoice: ["SHUZHI_INVOICE_READY", "SHUZHI_INVOICE_ADAPTER_URL", "SHUZHI_INVOICE_ADAPTER_SECRET"],
  regulator: ["SHUZHI_REGULATOR_READY", "SHUZHI_REGULATOR_ADAPTER_URL", "SHUZHI_REGULATOR_ADAPTER_SECRET"],
};
const clients = {};
for (const [provider, [readyKey, urlKey, secretKey]] of Object.entries(providerConfig)) {
  if (String(process.env[readyKey] || "") !== "true") continue;
  const baseUrl = String(process.env[urlKey] || "").trim();
  const secret = String(process.env[secretKey] || "").trim();
  if (!baseUrl || baseUrl.includes("CHANGE_ME") || !secret || secret.includes("CHANGE_ME")) throw new Error(`${provider} 机构出站地址或独立密钥未配置`);
  clients[provider] = createInstitutionAdapterClient({ provider, baseUrl, secret });
}
if (!Object.keys(clients).length) throw new Error("没有已 ready 的机构适配器；先完成至少一类机构联调，再启动 Outbox 工作进程");

mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec("PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;");
ensureInstitutionOutboxSchema(db);
const worker = createInstitutionOutboxWorker({
  db,
  clients,
  workerId: `${String(process.env.SHUZHI_SERVICE_NAME || "shuzhi")}-institution-worker`,
  onResult: ({ ok, command }) => console.log(`[shuzhi-institution-worker] ${ok ? "accepted" : "retry"} ${command.provider}/${command.id} status=${command.status} attempts=${command.attempts}`),
});
worker.start();
console.log(`[shuzhi-institution-worker] started; db=${dbPath}`);
const stop = () => { worker.stop(); db.close(); process.exit(0); };
process.once("SIGINT", stop);
process.once("SIGTERM", stop);
