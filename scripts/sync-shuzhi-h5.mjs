#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "work/shuzhi-v8502-source/dist/build/h5");
const target = resolve(root, "shuzhi-demo");
const sourceIndex = resolve(source, "index.html");
const sourceAssets = resolve(source, "assets");
const sourceStatic = resolve(source, "static");
const demoBuild = process.env.SHUZHI_H5_DEMO === "true";

for (const required of [sourceIndex, sourceAssets, sourceStatic]) {
  if (!existsSync(required)) throw new Error(`缺少 H5 生产构建产物：${required}`);
}

const index = readFileSync(sourceIndex, "utf8");
if (!index.includes("v8533") || !index.includes("assets/")) {
  throw new Error("H5 入口不是数智供社 v8533 或缺少静态资源引用，拒绝同步");
}

mkdirSync(target, { recursive: true });
const targetAssets = resolve(target, "assets");
// assets 是构建器完全生成的目录。先清理旧哈希文件，避免静态包持续膨胀或误发布旧代码。
rmSync(targetAssets, { recursive: true, force: true });
cpSync(sourceAssets, targetAssets, { recursive: true });
cpSync(sourceStatic, resolve(target, "static"), { recursive: true, force: true });
cpSync(sourceIndex, resolve(target, "app.html"));

if (demoBuild) {
  const appPath = resolve(target, "app.html");
  const app = readFileSync(appPath, "utf8");
  const routeScript = '<script>if (!location.hash || location.hash === "#/") location.hash = "/pages/home/index";</script>';
  if (!app.includes("/pages/home/index") && app.includes("</head>")) {
    writeFileSync(appPath, app.replace("</head>", `${routeScript}</head>`));
  }
}

const synced = readFileSync(resolve(target, "app.html"), "utf8");
if (!synced.includes("v8533") || !synced.includes("assets/")) throw new Error("H5 同步结果校验失败");
console.log(`[shuzhi-h5-sync] OK：${demoBuild ? "公开演示" : "生产"} H5 已同步到 shuzhi-demo，旧哈希资源已清理`);
