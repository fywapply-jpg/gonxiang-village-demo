#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const dbPath = resolve(process.env.SHUZHI_DB || resolve(root, "local-backend/data/shuzhi.db"));
const backupDir = resolve(process.env.SHUZHI_BACKUP_DIR || resolve(root, "local-backend/backups"));
const retentionDays = Number(process.env.SHUZHI_BACKUP_RETENTION_DAYS || 30);
if (!Number.isInteger(retentionDays) || retentionDays < 7 || retentionDays > 3650) throw new Error("SHUZHI_BACKUP_RETENTION_DAYS 必须是 7—3650 的整数");
if (!existsSync(dbPath)) throw new Error(`数据库不存在：${dbPath}`);
mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
const backupPath = resolve(backupDir, `shuzhi-v8530-${stamp}.db`);
const escaped = backupPath.replaceAll("'", "''");
execFileSync("sqlite3", [dbPath, `.backup '${escaped}'`], { stdio: "pipe" });
const integrity = execFileSync("sqlite3", [backupPath, "PRAGMA integrity_check;"], { encoding: "utf8" }).trim();
if (integrity !== "ok") throw new Error(`备份完整性检查失败：${integrity}`);
const bytes = readFileSync(backupPath);
const manifest = { version: "v8530", created_at: new Date().toISOString(), source: dbPath, backup: backupPath, bytes: statSync(backupPath).size, sha256: createHash("sha256").update(bytes).digest("hex"), integrity };
const manifestPath = `${backupPath}.json`;
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
