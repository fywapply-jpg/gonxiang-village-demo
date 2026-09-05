#!/usr/bin/env node

import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const buildRoot = resolve(root, "work/shuzhi-v8502-source/dist/build");
const source = resolve(buildRoot, "mp-weixin");
const output = resolve(root, "deliverables/数智供社-v8533-微信小程序开发者工具预览包.zip");
const versionOutput = resolve(root, "deliverables/数智供社-v8533/数智供社-v8533-微信小程序开发者工具预览包.zip");
const devtoolsDir = resolve(root, "deliverables/数智供社-v8533/微信开发者工具项目");

if (!existsSync(resolve(source, "app.json"))) {
  throw new Error("缺少微信构建产物，请先执行 npm run build:shuzhi-mp 或 npm run build:shuzhi-mp-production");
}

mkdirSync(dirname(output), { recursive: true });
mkdirSync(dirname(versionOutput), { recursive: true });
for (const file of [output, versionOutput]) if (existsSync(file)) rmSync(file, { force: true });
if (existsSync(devtoolsDir)) rmSync(devtoolsDir, { recursive: true, force: true });
cpSync(source, devtoolsDir, { recursive: true });

// 以 dist/build 为工作目录，保持开发者工具打开后的目录名为 mp-weixin/。
execFileSync("zip", ["-qr", output, "mp-weixin", "-x", "__MACOSX/*"], { cwd: buildRoot });
copyFileSync(output, versionOutput);

const listing = execFileSync("unzip", ["-Z1", output], { encoding: "utf8" });
if (!listing.split("\n").includes("mp-weixin/app.json")) throw new Error("微信预览包缺少 mp-weixin/app.json");
if (listing.includes("__MACOSX/")) throw new Error("微信预览包不应包含 macOS 元数据目录");
console.log(`数智供社 v8533 微信开发者工具预览包已生成：${output}`);
