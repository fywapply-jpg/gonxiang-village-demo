#!/usr/bin/env node

/**
 * 首次上线的空生产库恢复回归：生产库可以暂时没有组织、商户和订单，
 * 但备份必须完整、可校验，并包含当前 v8530 的关键业务 schema。
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(new URL("..", import.meta.url).pathname);
const tempRoot = mkdtempSync(join(tmpdir(), "shuzhi-empty-backup-restore-"));
const dbPath = join(tempRoot, "production.sqlite");
const backupDir = join(tempRoot, "backups");
const port = 9800 + Math.floor(Math.random() * 100);
const env = {
  ...process.env,
  PORT: String(port),
  SHUZHI_RUNTIME_MODE: "production",
  SHUZHI_DEPLOY_ENV: "test",
  SHUZHI_SERVICE_NAME: "shuzhi-empty-restore-test",
  SHUZHI_PLATFORM_VERSION: "v8533",
  SHUZHI_RELEASE_VERSION: "v8530",
  SHUZHI_DB: dbPath,
  SHUZHI_BACKUP_DIR: backupDir,
  SHUZHI_BACKUP_RETENTION_DAYS: "30",
  SHUZHI_API_TOKEN: "empty-restore-api-token-12345678901234567890",
  SHUZHI_ADMIN_TOKEN_ROLES: JSON.stringify({ "admin-empty-restore-token-123456789012": "super" }),
  SHUZHI_USER_TOKEN_PRINCIPALS: JSON.stringify({ "user-empty-restore-token-123456789012": { id: "buyer", name: "空库测试采购人", role: "buyer", merchant_id: "m-buyer" } }),
  SHUZHI_WECHAT_OPENID_PRINCIPALS: "{}",
  SHUZHI_ALLOWED_ORIGIN: "https://app.example.com",
  VITE_API_BASE: "https://api.example.com",
  SHUZHI_WECHAT_AUTH_READY: "false",
  SHUZHI_CA_READY: "false",
  SHUZHI_PAYMENT_READY: "false",
  SHUZHI_LOGISTICS_READY: "false",
  SHUZHI_INVOICE_READY: "false",
  SHUZHI_REGULATOR_READY: "false",
};
const checks = [];
const add = (ok, name, detail) => {
  checks.push(ok);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`);
};
const wait = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
const running = spawn(process.execPath, [resolve(root, "local-backend/server.mjs")], { cwd: root, env, stdio: ["ignore", "pipe", "pipe"] });
let output = "";
running.stdout.on("data", (chunk) => { output += chunk.toString(); });
running.stderr.on("data", (chunk) => { output += chunk.toString(); });
const stop = async () => {
  if (running.exitCode !== null) return;
  running.kill("SIGTERM");
  await Promise.race([new Promise((resolvePromise) => running.once("close", resolvePromise)), wait(1500)]);
  if (running.exitCode === null) running.kill("SIGKILL");
};
try {
  const deadline = Date.now() + 10_000;
  let ready = false;
  while (Date.now() < deadline) {
    if (running.exitCode !== null) throw new Error(`空生产库 API 启动失败：${output}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health/ready`);
      if (response.ok) { ready = true; break; }
    } catch {}
    await wait(100);
  }
  add(ready, "空生产库启动", ready ? "迁移完成且 /health/ready=ready" : "API 未就绪");
  if (!ready) throw new Error(`空生产库未就绪：${output}`);
  await stop();
  execFileSync(process.execPath, [resolve(root, "scripts/backup-shuzhi-local.mjs")], { cwd: root, env, stdio: "ignore" });
  const backup = readdirSync(backupDir).find((name) => /^shuzhi-v8530-.*\.db$/.test(name));
  add(Boolean(backup), "空生产库备份生成", backup ? "已生成带清单的 v8530 备份" : "未找到正式备份文件");
  if (!backup) throw new Error("备份文件不存在");
  const restoreOutput = execFileSync(process.execPath, [resolve(root, "scripts/check-shuzhi-v8530-backup-restore.mjs")], { cwd: root, env: { ...env, SHUZHI_BACKUP_FILE: join(backupDir, backup) }, encoding: "utf8" });
  const report = JSON.parse(restoreOutput);
  add(report.integrity === "ok" && report.restored_to_temporary_database === true, "空生产库恢复完整性", "SHA-256 与 integrity_check 通过");
  add(Object.values(report.counts || {}).every((value) => Number(value) === 0) && report.required_tables?.includes("institution_outbox") && report.required_tables?.includes("platform_fee_collections"), "空库 schema 恢复", "允许业务数据为 0，但关键业务表完整");
} catch (error) {
  add(false, "空库恢复回归执行", error instanceof Error ? error.message : String(error));
} finally {
  await stop();
  rmSync(tempRoot, { recursive: true, force: true });
}
const failed = checks.filter((value) => !value).length;
console.log(`\n数智供社 v8530 空生产库备份恢复回归：${checks.length - failed} 通过，${failed} 失败`);
process.exitCode = failed ? 1 : 0;
