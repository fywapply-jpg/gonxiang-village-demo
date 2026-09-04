#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

const tracked = execFileSync("git", ["ls-files", "-z"], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
}).split("\0").filter(Boolean);

const findings = [];
const isExample = (file) => /(?:^|\/)\.env(?:\.[^/]+)?\.example$/.test(file)
  || /(?:^|\/)\.env\.example$/.test(file);
const forbiddenName = (file) => {
  const name = file.split("/").at(-1) || "";
  if (/^\.env(?:\..+)?$/.test(name) && !isExample(file)) return "真实环境文件";
  if (/^(?:id_rsa|id_ed25519)$/.test(name)) return "SSH 私钥";
  if ([".pem", ".key", ".p12", ".pfx", ".jks"].includes(extname(name).toLowerCase())) return "证书或私钥容器";
  if (/^(?:credentials?|secrets?)(?:\.[^.]+)?\.json$/i.test(name)) return "凭据文件";
  return "";
};

const signatures = [
  [/(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,})/g, "GitHub 访问令牌"],
  [/AKIA[0-9A-Z]{16}/g, "云访问密钥"],
  [/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g, "私钥正文"],
  [/\b(?:secret|token|password|api[_-]?key|app[_-]?secret)\s*[:=]\s*["']?[0-9a-f]{32,}["']?/gi, "疑似硬编码密钥"],
];

for (const file of tracked) {
  const nameRisk = forbiddenName(file);
  if (nameRisk) findings.push({ file, kind: nameRisk });

  if (/\.(?:zip|png|jpe?g|gif|ico|pdf|woff2?|ttf|sqlite|db)$/i.test(file)) continue;
  let content;
  try {
    content = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (content.includes("\0")) continue;
  for (const [pattern, kind] of signatures) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) findings.push({ file, kind });
  }
}

const unique = [...new Map(findings.map((item) => [`${item.file}\0${item.kind}`, item])).values()];
if (unique.length) {
  console.error(`[secret-hygiene] FAIL：发现 ${unique.length} 项可能泄露（仅显示文件与类型，不显示值）`);
  for (const item of unique) console.error(`- ${item.file}：${item.kind}`);
  process.exit(1);
}

console.log(`[secret-hygiene] OK：已检查 ${tracked.length} 个受版本控制文件，未发现生产环境文件、私钥或高置信度令牌`);
