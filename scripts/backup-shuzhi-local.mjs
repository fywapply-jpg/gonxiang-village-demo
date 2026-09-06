#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const dbPath = resolve(process.env.SHUZHI_DB || resolve(root, "local-backend/data/shuzhi.db"));
const backupDir = resolve(process.env.SHUZHI_BACKUP_DIR || resolve(root, "local-backend/backups"));
const retentionDays = Number(process.env.SHUZHI_BACKUP_RETENTION_DAYS || 30);
if (!Number.isInteger(retentionDays) || retentionDays < 7 || retentionDays > 3650) throw new Error("SHUZHI_BACKUP_RETENTION_DAYS 必须是 7—3650 的整数");
if (!existsSync(dbPath)) throw new Error(`数据库不存在：${dbPath}`);
mkdirSync(backupDir, { recursive: true });
// 保留毫秒，避免手工重试或定时任务并发时在同一秒覆盖上一份备份。
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.(\d{3})Z$/, "$1Z");
const backupPath = resolve(backupDir, `shuzhi-v8530-${stamp}.db`);
const temporaryBackupPath = `${backupPath}.tmp-${process.pid}`;
const escaped = temporaryBackupPath.replaceAll("'", "''");
let manifestPath;
try {
  // 先写临时文件并做完整性校验，成功后再原子改名；崩溃只会留下可识别的 .tmp 文件，
  // 不会让巡检误把半成品当成最新正式备份。
  execFileSync("sqlite3", [dbPath, `.backup '${escaped}'`], { stdio: "pipe" });
  const integrity = execFileSync("sqlite3", [temporaryBackupPath, "PRAGMA integrity_check;"], { encoding: "utf8" }).trim();
  if (integrity !== "ok") throw new Error(`备份完整性检查失败：${integrity}`);
  const bytes = readFileSync(temporaryBackupPath);
  const manifest = { version: "v8530", created_at: new Date().toISOString(), source: dbPath, backup: backupPath, bytes: statSync(temporaryBackupPath).size, sha256: createHash("sha256").update(bytes).digest("hex"), integrity };
  renameSync(temporaryBackupPath, backupPath);
  manifestPath = `${backupPath}.json`;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let deleted = 0;
  for (const name of readdirSync(backupDir)) {
    if (!/^shuzhi-v8530-[0-9TZ]+\.db$/.test(name)) continue;
    const candidate = resolve(backupDir, name);
    const candidateStat = statSync(candidate);
    if (candidate === backupPath || !candidateStat.isFile() || candidateStat.mtimeMs >= cutoff) continue;
    unlinkSync(candidate);
    const candidateManifest = `${candidate}.json`;
    if (existsSync(candidateManifest)) unlinkSync(candidateManifest);
    deleted += 1;
  }
  console.log(JSON.stringify({ backup: backupPath, manifest: manifestPath, sha256: manifest.sha256, integrity, retention_days: retentionDays, deleted_old_backups: deleted }, null, 2));
} finally {
  if (existsSync(temporaryBackupPath)) unlinkSync(temporaryBackupPath);
}
