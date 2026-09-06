#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const backupArg = process.argv[2];
const backupDir = resolve(process.env.SHUZHI_BACKUP_DIR || resolve(new URL("../local-backend/backups", import.meta.url).pathname));
const latestBackup = () => {
  if (!existsSync(backupDir)) return null;
  return readdirSync(backupDir)
    .filter((name) => /^shuzhi-v\d+-.*\.db$/.test(name))
    .map((name) => resolve(backupDir, name))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0] || null;
};
const backupCandidate = backupArg || latestBackup();
if (!backupCandidate) throw new Error("用法：node scripts/verify-shuzhi-backup.mjs <备份数据库.db>（或先生成 local-backend/backups 下的备份）");
const backupPath = resolve(backupCandidate);
const manifestPath = `${backupPath}.json`;
if (!existsSync(backupPath) || !existsSync(manifestPath)) throw new Error("备份文件或同名 .json 清单不存在");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const sha256 = createHash("sha256").update(readFileSync(backupPath)).digest("hex");
if (sha256 !== manifest.sha256) throw new Error("备份 SHA-256 与清单不一致");
const integrity = execFileSync("sqlite3", [backupPath, "PRAGMA integrity_check;"], { encoding: "utf8" }).trim();
if (integrity !== "ok") throw new Error(`备份完整性检查失败：${integrity}`);
console.log(JSON.stringify({ backup: backupPath, version: manifest.version, sha256, integrity, verified_at: new Date().toISOString() }, null, 2));
