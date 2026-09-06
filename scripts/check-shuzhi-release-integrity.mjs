#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const manifestPath = resolve(root, "deliverables/数智供社-v8533/release-integrity.json");
if (!existsSync(manifestPath)) throw new Error("缺少 v8533 完整性清单");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const failures = [];
for (const artifact of manifest.artifacts || []) {
  const path = resolve(root, "deliverables/数智供社-v8533", artifact.name);
  if (!existsSync(path)) { failures.push(`${artifact.name}: 文件不存在`); continue; }
  const data = readFileSync(path);
  const sha256 = createHash("sha256").update(data).digest("hex");
  if (data.length !== artifact.bytes || sha256 !== artifact.sha256) failures.push(`${artifact.name}: bytes/hash 不匹配`);
  if (/供享村社/.test(artifact.name) || /供享村社/.test(data.toString("utf8"))) failures.push(`${artifact.name}: 混入历史品牌`);
}
// 若本机保留了便于手动导入的目录，也必须与当前构建一致，不能让旧 IP 版本被再次导入。
const devtoolsDir = resolve(root, "deliverables/数智供社-v8533/微信开发者工具项目");
const currentMpDir = resolve(root, "work/shuzhi-v8502-source/dist/build/mp-weixin");
if (existsSync(devtoolsDir)) {
  const devtoolsApi = resolve(devtoolsDir, "services/localApi.js");
  if (existsSync(devtoolsApi)) {
    const source = readFileSync(devtoolsApi, "utf8");
    if (source.includes("192.168.2.104")) failures.push("微信开发者工具项目目录：仍残留历史局域网 IP");
  }
  for (const relative of ["app.json", "project.config.json", "services/localApi.js"]) {
    const devtoolsFile = resolve(devtoolsDir, relative);
    const currentFile = resolve(currentMpDir, relative);
    if (!existsSync(devtoolsFile) || !existsSync(currentFile)) {
      failures.push(`微信开发者工具项目目录：缺少当前构建文件 ${relative}`);
      continue;
    }
    if (!readFileSync(devtoolsFile).equals(readFileSync(currentFile))) failures.push(`微信开发者工具项目目录：${relative} 与当前构建不一致`);
  }
}
if (failures.length) { console.error("[shuzhi-release-integrity] FAIL"); failures.forEach((item) => console.error(`- ${item}`)); process.exitCode = 1; }
else console.log(`[shuzhi-release-integrity] OK：${manifest.artifacts.length} 个 v8533 制品 bytes/SHA256 一致`);
