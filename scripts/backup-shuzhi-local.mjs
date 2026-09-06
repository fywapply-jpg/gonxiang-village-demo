#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const dbPath = resolve(process.env.SHUZHI_DB || resolve(root, "local-backend/data/shuzhi.db"));
const backupDir = resolve(process.env.SHUZHI_BACKUP_DIR || resolve(root, "local-backend/backups"));
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
console.log(JSON.stringify({ backup: backupPath, manifest: manifestPath, sha256: manifest.sha256, integrity }, null, 2));
