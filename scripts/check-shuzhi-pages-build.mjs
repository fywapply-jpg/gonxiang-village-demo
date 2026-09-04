#!/usr/bin/env node

import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

const root = resolve(new URL("..", import.meta.url).pathname);
const source = resolve(root, "shuzhi-demo");
const temp = mkdtempSync(join(tmpdir(), "shuzhi-pages-build-"));
const site = join(temp, "site");
const failures = [];
const fail = (message) => failures.push(message);
const replaceInFile = (file, replacements) => {
  let content = readFileSync(file, "utf8");
  for (const [from, to] of replacements) content = content.split(from).join(to);
  writeFileSync(file, content);
};
const walk = (dir) => {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(file));
    else files.push(file);
  }
  return files;
};

try {
  // 与 .github/workflows/pages.yml 保持同一目录映射，不触碰工作区源目录。
  cpSync(source, site, { recursive: true });
  cpSync(resolve(root, "deliverables/数智供社-v8533/数智供社-v8533-后台手机演示版.html"), join(site, "admin.html"));
  cpSync(source, join(site, "shuzhi"), { recursive: true });
  replaceInFile(join(site, "app.html"), [["/gonxiang-village-demo/shuzhi/", "/gonxiang-village-demo/"]]);
  for (const file of walk(join(site, "assets"))) {
    if (file.endsWith(".js")) replaceInFile(file, [["\"/static/", "\"/gonxiang-village-demo/static/"]]);
  }
  for (const file of walk(join(site, "shuzhi", "assets"))) {
    if (file.endsWith(".js")) replaceInFile(file, [["\"/static/", "\"/gonxiang-village-demo/shuzhi/static/"]]);
  }

  cpSync(resolve(root, "v3demo"), join(site, "legacy-v3"), { recursive: true });
  const legacy = join(site, "legacy-v3");
  if (existsSync(join(legacy, "index.html"))) {
    const legacyIndex = join(legacy, "index.html");
    const legacyApp = join(legacy, "app.html");
    writeFileSync(legacyApp, readFileSync(legacyIndex));
    rmSync(legacyIndex);
    replaceInFile(legacyApp, [["href=\"/css/", "href=\"/gonxiang-village-demo/legacy-v3/css/"], ["src=\"/js/", "src=\"/gonxiang-village-demo/legacy-v3/js/"]]);
    if (existsSync(join(legacy, "js", "app.js"))) replaceInFile(join(legacy, "js", "app.js"), [["__webpack_require__.p=\"/\"", "__webpack_require__.p=\"/gonxiang-village-demo/legacy-v3/\""]]);
    if (existsSync(join(legacy, "demo.html"))) {
      replaceInFile(join(legacy, "demo.html"), [["src=\"/index.html\"", "src=\"app.html\""], ["src=\"index.html\"", "src=\"app.html\""]]);
      cpSync(join(legacy, "demo.html"), join(legacy, "index.html"));
    }
  }

  cpSync(resolve(root, "v3.1demo"), join(site, "v3.1"), { recursive: true });
  const v31 = join(site, "v3.1");
  if (existsSync(join(v31, "index.html"))) {
    const v31Index = join(v31, "index.html");
    const v31App = join(v31, "app.html");
    writeFileSync(v31App, readFileSync(v31Index));
    rmSync(v31Index);
    replaceInFile(v31App, [["href=\"/css/", "href=\"/gonxiang-village-demo/v3.1/css/"], ["src=\"/js/", "src=\"/gonxiang-village-demo/v3.1/js/"]]);
    if (existsSync(join(v31, "js", "app.js"))) replaceInFile(join(v31, "js", "app.js"), [["__webpack_require__.p=\"/\"", "__webpack_require__.p=\"/gonxiang-village-demo/v3.1/\""]]);
    if (existsSync(join(v31, "demo.html"))) {
      replaceInFile(join(v31, "demo.html"), [["src=\"/index.html\"", "src=\"app.html\""], ["src=\"index.html\"", "src=\"app.html\""]]);
      cpSync(join(v31, "demo.html"), join(v31, "index.html"));
    }
  }

  const rootIndex = readFileSync(join(site, "index.html"), "utf8");
  const rootApp = readFileSync(join(site, "app.html"), "utf8");
  const rootScript = rootApp.match(/src=["']\.\/assets\/(index-[A-Za-z0-9_-]+\.js)["']/)?.[1];
  if (!rootIndex.includes("app.html")) fail("根入口 index.html 未指向 app.html");
  if (!rootApp.includes("数智供社 v8533")) fail("根入口 app.html 未标识 v8533");
  if (!rootScript || !existsSync(join(site, "assets", rootScript))) fail(`根入口主包不存在：${rootScript || "未识别"}`);
  const shuzhiApp = readFileSync(join(site, "shuzhi", "app.html"), "utf8");
  const shuzhiScript = shuzhiApp.match(/src=["']\.\/assets\/(index-[A-Za-z0-9_-]+\.js)["']/)?.[1];
  for (const file of ["static/brand-logo.png", "static/og-v8513.png", "admin.html", "shuzhi/app.html", "legacy-v3/index.html", "v3.1/index.html"]) {
    if (!existsSync(join(site, file))) fail(`Pages 仿真制品缺少：${file}`);
  }
  if (!shuzhiScript || !existsSync(join(site, "shuzhi", "assets", shuzhiScript))) fail(`兼容入口主包不存在：${shuzhiScript || "未识别"}`);
  if (rootApp.includes("/gonxiang-village-demo/shuzhi/assets/")) fail("根入口仍引用 /shuzhi/ 资源路径");
} finally {
  rmSync(temp, { recursive: true, force: true });
}

if (failures.length) {
  console.error("[shuzhi-pages-build] FAIL");
  failures.forEach((message) => console.error(`- ${message}`));
  process.exitCode = 1;
} else {
  console.log("[shuzhi-pages-build] OK：根路径 v8533、/shuzhi/ 兼容入口、历史路径隔离与资源闭包均通过");
}
