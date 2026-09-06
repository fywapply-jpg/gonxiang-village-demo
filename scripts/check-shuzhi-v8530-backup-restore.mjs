#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(new URL("..", import.meta.url).pathname);
const backupDir = resolve(process.env.SHUZHI_BACKUP_DIR || join(root, "local-backend/backups"));
const requested = process.env.SHUZHI_BACKUP_FILE ? resolve(process.env.SHUZHI_BACKUP_FILE) : "";
const candidates = requested
  ? [requested]
  : readdirSync(backupDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && /^shuzhi-v8530-.*\.db$/.test(entry.name))
      .map((entry) => join(backupDir, entry.name))
      .sort()
      .reverse();
const source = candidates[0];
if (!source || !existsSync(source)) throw new Error(`找不到 v8530 数据库备份：${requested || backupDir}`);
const manifestPath = `${source}.json`;
if (!existsSync(manifestPath)) throw new Error(`备份清单不存在：${manifestPath}`);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const sha256 = createHash("sha256").update(readFileSync(source)).digest("hex");
if (sha256 !== manifest.sha256) throw new Error("备份 SHA-256 与清单不一致");

const workDir = mkdtempSync(join(tmpdir(), "shuzhi-v8530-restore-"));
const restored = join(workDir, "restored.db");
try {
  copyFileSync(source, restored);
  const integrity = execFileSync("sqlite3", [restored, "PRAGMA integrity_check;"], { encoding: "utf8" }).trim();
  if (integrity !== "ok") throw new Error(`恢复库完整性检查失败：${integrity}`);
  const counts = JSON.parse(execFileSync("sqlite3", ["-json", restored, "SELECT (SELECT COUNT(*) FROM organizations) organizations, (SELECT COUNT(*) FROM merchants) merchants, (SELECT COUNT(*) FROM orders) orders, (SELECT COUNT(*) FROM audit_logs) audit_logs;"], { encoding: "utf8" }))[0];
  if (!counts || Object.values(counts).some((value) => Number(value) < 1)) throw new Error("恢复库关键业务表为空，恢复演练未通过");
  console.log(JSON.stringify({ source, restored, version: manifest.version, bytes: statSync(restored).size, sha256, integrity, counts, restored_to_temporary_database: true }, null, 2));
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
