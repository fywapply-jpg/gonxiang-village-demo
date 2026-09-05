#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const output = resolve(process.argv[2] || join(root, "_site"));
const replace = (file, replacements) => {
  let value = readFileSync(file, "utf8");
  for (const [from, to] of replacements) value = value.split(from).join(to);
  writeFileSync(file, value);
};
const copyIfPresent = (source, target) => {
  if (!existsSync(source)) throw new Error(`缺少发布源文件：${source}`);
  mkdirSync(dirname(target), { recursive: true });
  cpSync(source, target, { recursive: true });
};

if (output === root || output === "/" || output.length < 8) throw new Error(`拒绝使用危险发布目录：${output}`);
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const demo = join(root, "shuzhi-demo");
copyIfPresent(demo, output);
copyIfPresent(join(root, "deliverables/数智供社-v8533/数智供社-v8533-后台手机演示版.html"), join(output, "admin.html"));
copyIfPresent(demo, join(output, "shuzhi"));
replace(join(output, "app.html"), [["/gonxiang-village-demo/shuzhi/", "/gonxiang-village-demo/"]]);

const rewriteAssets = (dir, prefix) => {
  const files = [];
  const walk = (current) => {
    for (const name of readdirSync(current)) {
      const file = join(current, name);
      if (statSync(file).isDirectory()) walk(file);
      else if (file.endsWith(".js")) files.push(file);
    }
  };
  walk(dir);
  for (const file of files) replace(file, [["\"/static/", `\"${prefix}`]]);
};
rewriteAssets(join(output, "assets"), "/gonxiang-village-demo/static/");
rewriteAssets(join(output, "shuzhi/assets"), "/gonxiang-village-demo/shuzhi/static/");

const copyLegacy = (sourceDir, targetDir, pathPrefix) => {
  copyIfPresent(sourceDir, targetDir);
  const index = join(targetDir, "index.html");
  const app = join(targetDir, "app.html");
  if (!existsSync(index)) return;
  cpSync(index, app);
  rmSync(index);
  replace(app, [["href=\"/css/", `href=\"${pathPrefix}css/`], ["src=\"/js/", `src=\"${pathPrefix}js/`]]);
  const js = join(targetDir, "js/app.js");
  if (existsSync(js)) replace(js, [["__webpack_require__.p=\"/\"", `__webpack_require__.p=\"${pathPrefix}\"`]]);
  const demoPage = join(targetDir, "demo.html");
  if (existsSync(demoPage)) {
    replace(demoPage, [["src=\"/index.html\"", "src=\"app.html\""], ["src=\"index.html\"", "src=\"app.html\""]]);
    cpSync(demoPage, index);
  }
};
copyLegacy(join(root, "v3demo"), join(output, "legacy-v3"), "/gonxiang-village-demo/legacy-v3/");
copyLegacy(join(root, "v3.1demo"), join(output, "v3.1"), "/gonxiang-village-demo/v3.1/");
writeFileSync(join(output, ".nojekyll"), "");

const rootApp = readFileSync(join(output, "app.html"), "utf8");
if (!rootApp.includes("数智供社 v8533")) throw new Error("根入口未标识数智供社 v8533");
if (rootApp.includes("/gonxiang-village-demo/shuzhi/assets/")) throw new Error("根入口仍引用兼容入口资源路径");
console.log(`[shuzhi-pages-build] 已生成 ${output}（根路径、/shuzhi/、后台和历史隔离入口）`);
