#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(new URL("..", import.meta.url).pathname);
const source = readFileSync(resolve(root, "work/shuzhi-v8502-source/src/pages/trade/batch-workbench.vue"), "utf8");
const checks = [
  [source.includes("backendLinked"), "后台连接状态"],
  [source.includes("await signTradeContract") && source.includes("await acceptTrade"), "合同/验收后台动作"],
  [source.includes("await issueTradeInvoice") && source.includes("await settleTrade"), "开票/结算后台动作"],
  [source.includes("createTradeOrder") && source.includes("backendOrderId"), "批量建单使用后台订单"],
  [source.includes("后台未放行") && source.includes("return;"), "拒绝时不推进"],
  [source.includes("productionBuild") && source.includes("生产后台未连接") && source.includes("不会在前台本地推进"), "生产断联禁止本地推进"],
  [source.includes("backendMode.value === \"production\"") && source.includes("生产交易不可重置"), "生产禁止重置"],
];
for (const [ok, name] of checks) console.log(`${ok ? "PASS" : "FAIL"}  批量工作台 ${name}`);
const failures = checks.filter(([ok]) => !ok).length;
console.log(`\n数智供社 v8530 批量工作台后台门禁：${checks.length - failures} 通过，${failures} 失败`);
process.exitCode = failures ? 1 : 0;
