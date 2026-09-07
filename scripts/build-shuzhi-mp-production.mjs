#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const sourceRoot = resolve(root, "work/shuzhi-v8502-source");
const source = resolve(sourceRoot, "dist/build/mp-weixin");
const target = resolve(sourceRoot, "dist/build/mp-weixin-production");
const apiBase = String(process.env.VITE_API_BASE || "").trim();

let parsed;
try { parsed = new URL(apiBase); } catch { parsed = null; }
const valid = Boolean(parsed)
  && parsed.protocol === "https:"
  && !parsed.username
  && !parsed.password
  && !parsed.search
  && !parsed.hash
  && parsed.pathname === "/"
  && (!parsed.port || parsed.port === "443")
  && !parsed.hostname.includes("example.cn")
  && !parsed.hostname.includes("CHANGE_ME")
  && !parsed.hostname.endsWith(".invalid")
  && !["localhost", "127.0.0.1", "0.0.0.0"].includes(parsed.hostname);

if (!valid) {
  throw new Error("正式微信小程序构建必须提供真实 HTTPS API 根地址，例如 VITE_API_BASE=https://api.你的正式域名.cn；禁止 HTTP、占位域名、路径和查询参数");
}

const productionEnv = { ...process.env, VITE_API_BASE: apiBase };
delete productionEnv.VITE_LOCAL_DEMO_TOKEN;
delete productionEnv.VITE_API_TOKEN;
delete productionEnv.VITE_ADMIN_TOKEN;
execFileSync("npm", ["run", "build:mp-weixin:production"], { cwd: sourceRoot, env: productionEnv, stdio: "inherit" });
if (!existsSync(resolve(source, "app.json"))) throw new Error("正式微信小程序构建未生成 app.json");

mkdirSync(resolve(sourceRoot, "dist/build"), { recursive: true });
if (existsSync(target)) rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log(`数智供社 v8533 正式小程序制品已隔离保存：${target}`);
