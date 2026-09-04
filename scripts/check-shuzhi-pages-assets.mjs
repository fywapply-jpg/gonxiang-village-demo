#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const demoDir = resolve(root, "shuzhi-demo");
const failures = [];
const read = (name) => {
  const file = resolve(demoDir, name);
  if (!existsSync(file)) {
    failures.push(`缺少文件：shuzhi-demo/${name}`);
    return "";
  }
  return readFileSync(file, "utf8");
};

const index = read("index.html");
if (!/app\.html(?:\?|['"])/.test(index)) failures.push("index.html 未指向手机应用入口 app.html");
if (!index.includes("v8533")) failures.push("index.html 未标识当前平台版本 v8533");
const app = read("app.html");
if (!app.includes("v8533")) failures.push("app.html 未标识当前平台版本 v8533");
const releasePath = resolve(demoDir, "release.json");
if (!existsSync(releasePath)) failures.push("缺少 shuzhi-demo/release.json 发布指纹");
else {
  try {
    const release = JSON.parse(readFileSync(releasePath, "utf8"));
    if (release.platform_version !== "v8533" || release.backend_release !== "v8530") failures.push("release.json 平台/后端版本口径不一致");
    if (Array.isArray(release.excluded_versions) && release.excluded_versions.includes("v3.1208") === false) failures.push("release.json 未明确屏蔽 v3.1208");
    const files = [];
    const walk = (dir) => readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const full = resolve(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (full !== releasePath) files.push(full);
    });
    walk(demoDir);
    files.sort();
    const digest = createHash("sha256");
    for (const file of files) {
      digest.update(file.slice(demoDir.length + 1));
      digest.update("\0");
      digest.update(readFileSync(file));
    }
    if (release.file_count !== files.length || release.bundle_sha256 !== digest.digest("hex")) failures.push("release.json 发布指纹与当前静态资源不一致");
  } catch { failures.push("release.json JSON 解析失败"); }
}
const refs = [...app.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map((match) => match[1].split(/[?#]/, 1)[0])
  .filter((ref) => !/^(?:https?:|data:|javascript:|#)/.test(ref));
for (const ref of refs) {
  const relative = ref.replace(/^.*\/shuzhi\//, "").replace(/^\/+/, "");
  if (!relative) continue;
  if (!existsSync(resolve(demoDir, relative))) failures.push(`app.html 引用资源不存在：${relative}`);
}
const metaAssetRefs = [...app.matchAll(/content=["']([^"']*(?:\/static\/|static\/)[^"']+)["']/g)]
  .map((match) => match[1].split(/[?#]/, 1)[0])
  .filter((ref) => !/^(?:https?:|data:|javascript:|#)/.test(ref));
for (const ref of metaAssetRefs) {
  const relative = ref.replace(/^.*\/shuzhi\//, "").replace(/^\/+/, "");
  if (relative && !existsSync(resolve(demoDir, relative))) failures.push(`app.html 元数据资源不存在：${relative}`);
}
const pagesWorkflow = readFileSync(resolve(root, ".github/workflows/pages.yml"), "utf8");
const pagesBuilder = readFileSync(resolve(root, "scripts/build-v85-sites.mjs"), "utf8");
if (/供享村社|数智供销\s+v85/.test(pagesBuilder)) failures.push("静态发布脚本仍包含历史品牌或 v85 元数据");
if (!pagesWorkflow.includes("cp -R shuzhi-demo/. _site/")) failures.push("Pages 根路径未从 shuzhi-demo 发布当前平台制品");
if (!pagesWorkflow.includes("cp deliverables/数智供社-v8533/数智供社-v8533-后台手机演示版.html _site/admin.html")) failures.push("Pages 未发布独立后台手机演示入口");
if (!pagesWorkflow.includes("cp -R shuzhi-demo/* _site/shuzhi/")) failures.push("Pages /shuzhi/ 兼容入口未从当前平台制品发布");
if (!pagesWorkflow.includes("legacy-v3") || pagesWorkflow.includes("cp -R v3demo _site")) failures.push("Pages 历史 v3demo 未隔离到独立路径");
if (/v3\.1208|work\/v31009-fix/.test(pagesWorkflow)) failures.push("Pages 工作流错误关联已隔离的 v3.1208");
const mobileDemo = resolve(root, "deliverables/数智供社-v8533/数智供社-v8533-手机演示版.html");
if (!existsSync(mobileDemo)) failures.push("缺少 v8533 手机单文件演示版");
else {
  const mobileText = readFileSync(mobileDemo, "utf8");
  if (!mobileText.includes("terminal-capabilities") || !mobileText.includes("grid-template-columns:repeat(2")) failures.push("v8533 手机单文件仍未使用每行两个布局");
  if (mobileText.includes("import(") || mobileText.includes("pages-home-index") || mobileText.includes("/static/brand-logo.png")) failures.push("v8533 手机单文件仍依赖外部异步资源");
}
const scanFiles = (dir) => {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...scanFiles(full));
    else files.push(full);
  }
  return files;
};
for (const file of scanFiles(demoDir)) {
  if (file.endsWith(".html") || file.endsWith(".js") || file.endsWith(".json")) {
    if (readFileSync(file, "utf8").includes("供享村社")) failures.push(`当前 v8533 展示制品混入历史品牌：${file.slice(demoDir.length + 1)}`);
  }
}

if (failures.length) {
  console.error("[shuzhi-pages-assets] FAIL");
  failures.forEach((item) => console.error(`- ${item}`));
  process.exitCode = 1;
} else {
  console.log(`[shuzhi-pages-assets] OK：${refs.length} 个入口资源存在，Pages 未关联 v3.1208`);
}
