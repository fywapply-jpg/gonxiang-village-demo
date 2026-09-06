#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(new URL("..", import.meta.url).pathname);
const target = String(process.argv[2] || "").trim();
if (!/^scripts\/check-shuzhi-[\w-]+\.mjs$/.test(target)) {
  console.error("用法：node scripts/run-shuzhi-check-with-local-api.mjs scripts/check-shuzhi-*.mjs");
  process.exit(2);
}

const configuredBase = String(process.env.SHUZHI_TEST_BASE || "").replace(/\/$/, "");
const findFreePort = async () => await new Promise((resolvePromise, reject) => {
  const probe = createServer();
  probe.once("error", reject);
  probe.listen(0, "127.0.0.1", () => {
    const address = probe.address();
    const port = typeof address === "object" && address ? address.port : 0;
    probe.close((error) => error ? reject(error) : resolvePromise(port));
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
      // API 尚未监听，继续等待。
    }
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 100));
  }
  throw new Error(`本地 API 未在 10 秒内就绪：${base}`);
};

let child = null;
let tempRoot = null;
let base = configuredBase;
try {
  if (!base) {
    const port = await findFreePort();
    base = `http://127.0.0.1:${port}`;
    tempRoot = mkdtempSync(join(tmpdir(), "shuzhi-check-"));
    child = spawn(process.execPath, [resolve(root, "local-backend/server.mjs")], {
      cwd: root,
      env: { ...process.env, PORT: String(port), SHUZHI_RUNTIME_MODE: "local-demo", SHUZHI_DB: join(tempRoot, "check.sqlite"), SHUZHI_SEED_DEMO_DATA: "true" },
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
    console.log(`[shuzhi-check] 已自动启动临时本地 API：${base}`);
  } else {
    console.log(`[shuzhi-check] 复用显式指定的 API：${base}`);
  }

  const result = spawnSync(process.execPath, [resolve(root, target)], {
    cwd: root,
    env: { ...process.env, SHUZHI_TEST_BASE: base },
    stdio: "inherit",
  });
  process.exitCode = result.status ?? 1;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (child && child.exitCode === null) {
    child.kill("SIGINT");
    await new Promise((resolvePromise) => child.once("close", resolvePromise));
  }
  if (tempRoot && existsSync(tempRoot)) rmSync(tempRoot, { recursive: true, force: true });
}
