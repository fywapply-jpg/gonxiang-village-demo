#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const args = process.argv.slice(2);
const modeIndex = args.indexOf("--mode");
const mode = modeIndex >= 0 ? String(args[modeIndex + 1] || "") : "";
const artifactDir = resolve(args.includes("--dir") ? args[args.indexOf("--dir") + 1] : "work/shuzhi-v8502-source/dist/build/mp-weixin");
const zipArgIndex = args.indexOf("--zip");
const zipPath = zipArgIndex >= 0 ? resolve(args[zipArgIndex + 1]) : mode === "local" ? resolve("deliverables/数智供社-v8533-微信小程序开发者工具预览包.zip") : "";
const checks = [];
const add = (ok, name, detail) => {
  checks.push({ ok, name, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  ${detail}`);
};

if (!["local", "production"].includes(mode)) {
  console.error("用法：node scripts/check-shuzhi-mp-artifact.mjs --mode local|production [--dir ...] [--zip ...]");
  process.exit(2);
}

const appJsonPath = resolve(artifactDir, "app.json");
const projectConfigPath = resolve(artifactDir, "project.config.json");
const apiSourcePath = resolve(artifactDir, "services/localApi.js");
const appExists = existsSync(appJsonPath);
add(appExists, "小程序 app.json", appExists ? artifactDir : `缺少 ${appJsonPath}`);
const projectExists = existsSync(projectConfigPath);
add(projectExists, "微信项目配置", projectExists ? "project.config.json 存在" : `缺少 ${projectConfigPath}`);
const apiExists = existsSync(apiSourcePath);
add(apiExists, "API 服务封装", apiExists ? "services/localApi.js 存在" : `缺少 ${apiSourcePath}`);

let app = null;
let apiSource = "";
if (appExists) {
  try {
    app = JSON.parse(readFileSync(appJsonPath, "utf8"));
    add(Array.isArray(app.pages) && app.pages.length > 0, "页面清单", `${app.pages?.length || 0} 个主包页面`);
  } catch (error) {
    add(false, "页面清单", error instanceof Error ? error.message : String(error));
  }
}
if (apiExists) apiSource = readFileSync(apiSourcePath, "utf8");

const allPages = app ? [
  ...(app.pages || []),
  ...(app.subPackages || []).flatMap((item) => (item.pages || []).map((page) => `${item.root}/${page}`)),
] : [];
const missingPages = allPages.filter((page) => ["js", "json", "wxml"].some((ext) => !existsSync(resolve(artifactDir, `${page}.${ext}`))));
add(missingPages.length === 0, "页面资源闭包", missingPages.length === 0 ? `${allPages.length} 个页面资源齐全` : `缺少：${missingPages.slice(0, 8).join(", ")}`);

const urls = [...new Set((apiSource.match(/https?:[^"'` )]+/g) || []).map((url) => url.replace(/\\\/$/, "")))];
const apiBase = urls[0] || "";
if (mode === "local") {
  add(/^http:\/\/[^/]+:\d+$/.test(apiBase) && !apiBase.includes("localhost"), "本地联调 API 地址", apiBase || "未找到 HTTP 局域网地址");
} else {
  add(/^https:\/\/[^/]+$/.test(apiBase) && !apiBase.includes("example.cn") && !apiBase.includes("CHANGE_ME"), "正式 HTTPS API 地址", apiBase || "未找到正式 HTTPS 根地址");
}
add(!apiSource.includes("local-demo-token"), "前端不内嵌演示令牌", "未发现 local-demo-token");
add(!apiSource.includes("CHANGE_ME"), "前端不含占位配置", "未发现 CHANGE_ME");

if (zipPath && existsSync(zipPath)) {
  try {
    const listing = execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" });
    const names = listing.split(/\r?\n/).filter(Boolean);
    add(names.includes("mp-weixin/app.json"), "预览包入口", names.includes("mp-weixin/app.json") ? "包含 mp-weixin/app.json" : "压缩包入口缺失");
    add(!names.some((name) => name.startsWith("__MACOSX/")), "预览包元数据隔离", "未包含 __MACOSX");
    const packagedApi = execFileSync("unzip", ["-p", zipPath, "mp-weixin/services/localApi.js"], { encoding: "utf8" });
    const packagedUrls = [...new Set((packagedApi.match(/https?:[^"'` )]+/g) || []).map((url) => url.replace(/\\\/$/, "")))];
    const packagedApiBase = packagedUrls[0] || "";
    add(packagedApiBase === apiBase, "预览包与目录 API 一致", packagedApiBase || "预览包未找到 API 地址");
  } catch (error) {
    add(false, "预览包可读取", error instanceof Error ? error.message : String(error));
  }
} else if (zipPath) {
  add(false, "预览包存在", `缺少 ${zipPath}`);
}

const failed = checks.filter((item) => !item.ok).length;
console.log(`\n数智供社 v8533 小程序制品检查（${mode}）：${checks.length - failed} 通过，${failed} 失败`);
process.exitCode = failed ? 1 : 0;
