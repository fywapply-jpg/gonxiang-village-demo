#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(new URL("..", import.meta.url).pathname);
const configuredBase = String(process.env.SHUZHI_TEST_BASE || "http://127.0.0.1:8787").replace(/\/$/, "");
const scripts = [
  "scripts/check-shuzhi-pages-assets.mjs",
  "scripts/check-shuzhi-pages-build.mjs",
  "scripts/check-shuzhi-release-integrity.mjs",
  "scripts/check-shuzhi-v8530-access.mjs",
  "scripts/check-shuzhi-v8530-webhooks.mjs",
  "scripts/check-shuzhi-v8530-settlement.mjs",
  "scripts/check-shuzhi-v8530-production-settlement.mjs",
  "scripts/check-shuzhi-v8530-batch-gate.mjs",
  "scripts/check-shuzhi-v8530-demand-flow.mjs",
  "scripts/check-shuzhi-v8530-role-isolation.mjs",
];

const canReach = async (base) => {
  try {
    const response = await fetch(`${base}/health`, { signal: AbortSignal.timeout(700) });
    return response.ok;
  } catch {
    return false;
  }
};

// 本机可能已有其他项目占用默认 8787 端口。烟测必须启动自己的临时 API，
// 不能把无关服务误当成数智供社后端，也不能因端口冲突直接失败。
const findFreePort = async () => await new Promise((resolvePromise, reject) => {
  const server = createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    server.close((error) => error ? reject(error) : resolvePromise(port));
  });
});

const waitReady = async (base, child) => {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error("本地 API 启动进程提前退出");
    try {
      const response = await fetch(`${base}/health/ready`, { signal: AbortSignal.timeout(700) });
      if (response.ok) return;
    } catch {
      // 服务尚未监听，继续等待。
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error(`本地 API 未在 10 秒内就绪：${base}`);
};

let child = null;
let tempRoot = null;
let base = configuredBase;
try {
  const explicitBase = Boolean(process.env.SHUZHI_TEST_BASE);
  const parsed = new URL(base);
  const localBase = parsed.protocol === "http:" && (parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost");
  // 默认烟测永远使用隔离实例；仅显式传入 SHUZHI_TEST_BASE 时才复用已有服务。
  if (!explicitBase || !(await canReach(base))) {
    if (!localBase) throw new Error(`无法连接 ${base}，非本机地址不会自动启动服务`);
    let port = explicitBase ? Number(parsed.port || 8787) : await findFreePort();
    if (explicitBase) {
      // 显式指定的本机端口被其他进程占用时，仍改用随机临时端口，避免覆盖其他服务。
      const probe = await new Promise((resolvePromise) => {
        const server = createServer();
        server.once("error", () => resolvePromise(false));
        server.listen(port, parsed.hostname, () => server.close(() => resolvePromise(true)));
      });
      if (!probe) port = await findFreePort();
    }
    base = `http://127.0.0.1:${port}`;
    tempRoot = mkdtempSync(join(tmpdir(), "shuzhi-smoke-"));
    const db = join(tempRoot, "smoke.sqlite");
    child = spawn(process.execPath, [resolve(root, "local-backend/server.mjs")], {
      cwd: root,
      env: { ...process.env, PORT: String(port), SHUZHI_RUNTIME_MODE: "local-demo", SHUZHI_DB: db, SHUZHI_SEED_DEMO_DATA: "true" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    let diagnostics = "";
    child.stdout.on("data", (chunk) => { diagnostics += chunk.toString(); });
    child.stderr.on("data", (chunk) => { diagnostics += chunk.toString(); });
    try {
      await waitReady(base, child);
    } catch (error) {
      throw new Error(`${error instanceof Error ? error.message : String(error)}\n${diagnostics}`);
    }
    console.log(`[shuzhi-smoke] 已自动启动临时本地 API：${base}`);
  } else {
    console.log(`[shuzhi-smoke] 复用显式指定的本地 API：${base}`);
  }

  const env = { ...process.env, SHUZHI_TEST_BASE: base };
  for (const script of scripts) {
    const result = spawnSync(process.execPath, [resolve(root, script)], { cwd: root, env, stdio: "inherit" });
    if (result.status !== 0) process.exitCode = result.status ?? 1;
    if (process.exitCode) break;
  }
} finally {
  if (child && child.exitCode === null) {
    child.kill("SIGINT");
    await new Promise((resolvePromise) => child.once("close", resolvePromise));
  }
  if (tempRoot && existsSync(tempRoot)) rmSync(tempRoot, { recursive: true, force: true });
}
