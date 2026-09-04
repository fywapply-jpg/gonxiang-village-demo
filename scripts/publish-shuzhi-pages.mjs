#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";

const root = new URL("..", import.meta.url).pathname;
const direct = process.argv.includes("--direct");
const checkOnly = process.argv.includes("--check-only");
const publicBase = String(process.env.SHUZHI_PUBLIC_BASE_URL || "https://fywapply-jpg.github.io/gonxiang-village-demo/").replace(/\/?$/, "/");
const env = { ...process.env, SHUZHI_PUBLIC_BASE_URL: publicBase };

if (direct) {
  for (const key of ["HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "http_proxy", "https_proxy", "all_proxy"]) delete env[key];
}

const capture = (command, args) => execFileSync(command, args, {
  cwd: root,
  env,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
}).trim();

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: root,
    env,
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) process.exit(result.status || 1);
};

const branch = capture("git", ["branch", "--show-current"]);
if (branch !== "main") {
  console.error(`[publish-pages] FAIL：当前分支为 ${branch || "未知"}，只允许从 main 发布`);
  process.exit(1);
}

const releasePaths = [
  "shuzhi-demo",
  ".github/workflows/pages.yml",
  "scripts/check-secret-hygiene.mjs",
];
const dirtyReleaseFiles = capture("git", ["status", "--porcelain", "--", ...releasePaths]);
if (dirtyReleaseFiles) {
  console.error("[publish-pages] FAIL：发布目录存在未提交改动，请先核对并提交：");
  for (const line of dirtyReleaseFiles.split("\n")) console.error(`- ${line.slice(3)}`);
  process.exit(1);
}

console.log("[publish-pages] 1/5 检查密钥泄露与制品完整性");
run("node", ["scripts/check-secret-hygiene.mjs"]);
run("node", ["scripts/check-shuzhi-release-integrity.mjs"]);
run("node", ["scripts/check-shuzhi-pages-assets.mjs"]);
run("node", ["scripts/check-shuzhi-pages-build.mjs"]);

if (checkOnly) {
  console.log("[publish-pages] OK：发布前检查通过；--check-only 未连接远程或执行推送");
  process.exit(0);
}

console.log("[publish-pages] 2/5 同步远程状态并验证为安全快进");
run("git", ["fetch", "--prune", "origin"]);
const ancestor = spawnSync("git", ["merge-base", "--is-ancestor", "origin/main", "HEAD"], { cwd: root, env });
if (ancestor.status !== 0) {
  console.error("[publish-pages] FAIL：远程 main 含本地没有的新提交，禁止直接推送，请先人工合并");
  process.exit(1);
}

const ahead = Number(capture("git", ["rev-list", "--count", "origin/main..HEAD"]));
if (!ahead) {
  console.log("[publish-pages] 远程已包含当前提交，跳过重复推送");
} else {
  console.log(`[publish-pages] 3/5 推送 ${ahead} 个快进提交`);
  const pushed = spawnSync("git", ["push", "origin", "main"], { cwd: root, env, stdio: "inherit" });
  if (pushed.status !== 0) {
    console.error("[publish-pages] FAIL：GitHub 未授权或推送失败。请先登录有仓库写入权限的账号，再重新执行本命令");
    process.exit(pushed.status || 1);
  }
}

console.log("[publish-pages] 4/5 等待 GitHub Pages 切换到 v8533（最长约 5 分钟）");
let online = false;
for (let attempt = 1; attempt <= 30; attempt += 1) {
  try {
    const response = await fetch(`${publicBase}release.json?ts=${Date.now()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (response.ok) {
      const release = await response.json();
      if (release.version === "v8533") {
        online = true;
        break;
      }
    }
  } catch {
    // 部署切换过程中允许临时 404/网络重试，最终仍由严格公网回验决定。
  }
  if (attempt < 30) await new Promise((resolve) => setTimeout(resolve, 10_000));
}

if (!online) {
  console.error("[publish-pages] FAIL：等待超时，公开地址仍未返回 v8533 release.json，请检查 GitHub Actions");
  process.exit(1);
}

console.log("[publish-pages] 5/5 执行公开根入口、手机入口、后台入口和品牌隔离回验");
run("node", ["scripts/check-shuzhi-public-pages.mjs"]);
console.log(`[publish-pages] OK：数智供社 v8533 已发布并通过回验：${publicBase}`);
