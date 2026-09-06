#!/usr/bin/env node

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";

const root = resolve(new URL("..", import.meta.url).pathname);
const port = 8897;
const dbDir = mkdtempSync(join(tmpdir(), "szgs-demand-flow-"));
const dbPath = join(dbDir, "demand-flow.db");
const principals = JSON.stringify({
  "buyer-flow-token": { id: "buyer-flow-user", name: "采购方回归用户", role: "buyer", merchant_id: "m-buyer" },
  "agri-flow-token": { id: "agri-flow-user", name: "农资采购方回归用户", role: "agri", merchant_id: "m-agri-flow" },
  "supplier-flow-token": { id: "supplier-flow-user", name: "供货方回归用户", role: "supplier", merchant_id: "m-supplier" },
});
const server = spawn(process.execPath, ["local-backend/server.mjs"], {
  cwd: root,
  env: { ...process.env, PORT: String(port), SHUZHI_DB: dbPath, SHUZHI_RUNTIME_MODE: "local-demo", SHUZHI_USER_TOKEN_PRINCIPALS: principals },
  stdio: ["ignore", "pipe", "pipe"],
});
let output = "";
server.stdout.on("data", (chunk) => { output += chunk.toString(); });
server.stderr.on("data", (chunk) => { output += chunk.toString(); });

const base = `http://127.0.0.1:${port}`;
const request = async (path, { token, method = "GET", body, key } = {}) => {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...(key ? { "Idempotency-Key": key } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await response.json(); } catch { /* 保留状态码用于失败断言 */ }
  return { status: response.status, data };
};
const expect = (condition, label, detail = "") => {
  if (!condition) throw new Error(`${label}${detail ? `：${detail}` : ""}`);
  console.log(`PASS  ${label}${detail ? `  ${detail}` : ""}`);
};

try {
  let healthy = false;
  for (let i = 0; i < 40 && !healthy; i += 1) {
    try { healthy = (await request("/health")).status === 200; } catch { /* 等待服务启动 */ }
    if (!healthy) await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }
  expect(healthy, "需求回归测试服务启动", output.trim().split("\n").at(-1) || "服务未就绪");

  // 补充农资采购方主体，验证 agri 与普通采购商共享采购需求/建单规则。
  const agriDb = new DatabaseSync(dbPath);
  const agriTime = new Date().toISOString();
  agriDb.prepare("INSERT OR IGNORE INTO organizations VALUES (?,?,?,?,?,?)").run("org-flow-agri", "农资采购方回归主体", "农资采购方", "测试区域", "active", agriTime);
  agriDb.prepare("INSERT OR IGNORE INTO merchants VALUES (?,?,?,?,?,?,?,?)").run("m-agri-flow", "org-flow-agri", "农资采购方回归主体", "agri", "verified", "verified", "低", agriTime);
  agriDb.close();

  const anonymous = await request("/api/v1/purchase-demands");
  expect(anonymous.status === 401, "采购需求匿名访问拦截", `HTTP ${anonymous.status}`);

  const createDemandPayload = { title: "采购需求发布回归", category: "水果", qty: 12, unit: "吨", budget_max: 70, destination: "湖北·武汉", delivery_window: "2026-09-10 08:00—12:00" };
  const createdDemand = await request("/api/v1/purchase-demands", { token: "buyer-flow-token", method: "POST", key: "demand-flow-create-001", body: createDemandPayload });
  expect(createdDemand.status === 201 && createdDemand.data?.data?.buyer_id === "m-buyer" && createdDemand.data?.data?.status === "open", "采购方发布需求写入后台", createdDemand.data?.data?.id || "未返回需求号");
  const createdDemandReplay = await request("/api/v1/purchase-demands", { token: "buyer-flow-token", method: "POST", key: "demand-flow-create-001", body: createDemandPayload });
  expect(createdDemandReplay.status === 201 && createdDemandReplay.data?.data?.id === createdDemand.data?.data?.id, "采购需求发布幂等重放", createdDemand.data?.data?.id || "未返回原需求号");

  const agriDemand = await request("/api/v1/purchase-demands", { token: "agri-flow-token", method: "POST", key: "demand-flow-agri-create-001", body: { title: "农资采购方需求回归", category: "水果", qty: 1, unit: "箱", destination: "湖北·武汉", delivery_window: "2026-09-10" } });
  expect(agriDemand.status === 201 && agriDemand.data?.data?.buyer_id === "m-agri-flow", "农资采购方发布需求", agriDemand.data?.data?.id || "未返回需求号");
  const agriDemandList = await request("/api/v1/purchase-demands", { token: "agri-flow-token" });
  expect(agriDemandList.status === 200 && agriDemandList.data?.data?.some((item) => item.id === agriDemand.data?.data?.id), "农资采购方读取自己的需求", "列表按采购主体隔离");
  const agriOrder = await request("/api/v1/trades", { token: "agri-flow-token", method: "POST", key: "demand-flow-agri-order-001", body: { supplier_id: "m-supplier", items: [{ product_id: "p-orange", qty: 1 }], service_amount: 0, scene: "buyerSupply", settlement_model: "持牌机构条件结算（验收后分账）" } });
  expect(agriOrder.status === 201 && agriOrder.data?.data?.buyer_id === "m-agri-flow", "农资采购方生成正式订单", agriOrder.data?.data?.id || "未返回订单号");

  const sessionBoundProduct = await request("/api/v1/products", { token: "supplier-flow-token", method: "POST", key: "demand-flow-session-product", body: { name: "会话主体推导商品", category: "水果", price: 68, stock: 20 } });
  expect(sessionBoundProduct.status === 201 && sessionBoundProduct.data?.data?.status === "pending_review", "商品上架从会话主体推导", sessionBoundProduct.data?.data?.id || "未返回商品号");
  const productImpersonation = await request("/api/v1/products", { token: "supplier-flow-token", method: "POST", key: "demand-flow-product-impersonation", body: { merchant_id: "m-buyer", name: "越权主体商品", category: "水果", price: 68, stock: 20 } });
  expect(productImpersonation.status === 403, "商品上架主体越权拦截", `HTTP ${productImpersonation.status}`);

  const demands = await request("/api/v1/purchase-demands", { token: "supplier-flow-token" });
  const demand = demands.data?.data?.find((item) => item.id === "DEM-SZGS-0001");
  expect(demands.status === 200 && demand?.buyer_id === "m-buyer", "供货方读取已绑定采购需求", demand ? `${demand.id} · ${demand.buyer_name}` : "未找到 DEM-SZGS-0001");
  expect(!Object.prototype.hasOwnProperty.call(demand, "quotes") && Array.isArray(demand?.my_quotes), "供货方报价信息隔离", "仅返回 my_quotes，不泄露其他供应商报价");

  const wrongProduct = await request("/api/v1/purchase-demands/DEM-SZGS-0001/quotes", { token: "supplier-flow-token", method: "POST", key: "demand-flow-wrong-category", body: { product_id: "p-vegetable", qty: 100, unit_price: 30 } });
  expect(wrongProduct.status === 409, "报价品类不一致拦截", `HTTP ${wrongProduct.status}`);

  const quoteKey = "demand-flow-quote-001";
  const quote = await request("/api/v1/purchase-demands/DEM-SZGS-0001/quotes", { token: "supplier-flow-token", method: "POST", key: quoteKey, body: { product_id: "p-orange", qty: 1200, unit_price: 68, note: "采购大厅闭环回归" } });
  expect(quote.status === 201 && quote.data?.data?.status === "submitted", "供货方提交报价", quote.data?.data?.id || "未返回报价号");
  const replay = await request("/api/v1/purchase-demands/DEM-SZGS-0001/quotes", { token: "supplier-flow-token", method: "POST", key: quoteKey, body: { product_id: "p-orange", qty: 1200, unit_price: 68, note: "采购大厅闭环回归" } });
  expect(replay.status === 201 && replay.data?.data?.id === quote.data?.data?.id, "报价幂等重放", replay.data?.data?.id || "未返回原报价");

  const quoteId = quote.data.data.id;
  const supplierAccept = await request(`/api/v1/purchase-quotes/${quoteId}/accept`, { token: "supplier-flow-token", method: "POST", key: "demand-flow-supplier-accept" });
  expect(supplierAccept.status === 403, "供货方越权确认报价拦截", `HTTP ${supplierAccept.status}`);
  const accepted = await request(`/api/v1/purchase-quotes/${quoteId}/accept`, { token: "buyer-flow-token", method: "POST", key: "demand-flow-buyer-accept" });
  expect(accepted.status === 200 && accepted.data?.data?.status === "accepted", "采购方确认报价", quoteId);

  const supplierOrder = await request("/api/v1/trades", { token: "supplier-flow-token", method: "POST", key: "demand-flow-supplier-order", body: { quote_id: quoteId, scene: "supplierDemand", items: [], settlement_model: "持牌机构条件结算（验收后分账）" } });
  expect(supplierOrder.status === 403, "供货方越权生成正式订单拦截", `HTTP ${supplierOrder.status}`);
  const order = await request("/api/v1/trades", { token: "buyer-flow-token", method: "POST", key: "demand-flow-order-001", body: { quote_id: quoteId, scene: "supplierDemand", items: [], settlement_model: "持牌机构条件结算（验收后分账）", delivery_window: "2026-09-08 08:00—12:00" } });
  const created = order.data?.data;
  expect(order.status === 201 && created?.scene === "supplierDemand", "采购方按 quote_id 生成正式订单", created?.id || "未返回订单号");
  expect(created?.items?.length === 1 && Number(created.items[0].unit_price) === 68 && Number(created.items[0].subtotal) === 81600 && Number(created.amount) === 81600, "正式订单采用已确认成交价", `¥${created?.amount || 0}`);
  const orderReplay = await request("/api/v1/trades", { token: "buyer-flow-token", method: "POST", key: "demand-flow-order-001", body: { quote_id: quoteId, scene: "supplierDemand", items: [], settlement_model: "持牌机构条件结算（验收后分账）", delivery_window: "2026-09-08 08:00—12:00" } });
  expect(orderReplay.status === 201 && orderReplay.data?.data?.id === created.id, "正式订单幂等重放", created.id);
  // 模拟另一家供货方在需求关闭后仍持有一份待确认报价，验证关闭态闸门。
  const testDb = new DatabaseSync(dbPath);
  const t = new Date().toISOString();
  testDb.exec("PRAGMA foreign_keys=OFF; BEGIN");
  testDb.prepare("INSERT OR IGNORE INTO organizations VALUES (?,?,?,?,?,?)").run("org-flow-second", "第二供货方回归主体", "产地供货商", "测试区域", "active", t);
  testDb.prepare("INSERT OR IGNORE INTO merchants VALUES (?,?,?,?,?,?,?,?)").run("m-supplier-2", "org-flow-second", "第二供货方回归主体", "supplier", "verified", "verified", "低", t);
  testDb.prepare("INSERT OR IGNORE INTO products VALUES (?,?,?,?,?,?,?,?,?,?)").run("p-orange-2", "m-supplier-2", "第二供货方脐橙", "水果", "标准", "箱", 67, 100, "江西赣州", "passed");
  testDb.prepare("INSERT OR IGNORE INTO demand_quotes(id,demand_id,supplier_id,product_id,qty,unit_price,amount,status,note,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").run("QUOTE-CLOSED-SECOND", "DEM-SZGS-0001", "m-supplier-2", "p-orange-2", 1, 67, 67, "submitted", "关闭态回归", t, t);
  testDb.exec("COMMIT");
  const closedAccept = await request("/api/v1/purchase-quotes/QUOTE-CLOSED-SECOND/accept", { token: "buyer-flow-token", method: "POST", key: "demand-flow-closed-accept" });
  expect(closedAccept.status === 409, "需求关闭后禁止确认第二报价", `HTTP ${closedAccept.status}`);
  // 新建一条开放需求放入两家报价，验证同一需求只能授标一次。
  testDb.exec("BEGIN");
  testDb.prepare("INSERT INTO purchase_demands(id,buyer_id,title,category,qty,unit,budget_max,destination,destination_lat,destination_lng,delivery_window,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").run("DEM-FLOW-UNIQUE", "m-buyer", "唯一授标回归需求", "水果", 1, "箱", 100, "湖北·武汉", null, null, "测试窗口", "quoting", t, t);
  testDb.prepare("INSERT INTO demand_quotes VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run("QUOTE-UNIQUE-A", "DEM-FLOW-UNIQUE", "m-supplier", "p-orange", 1, 68, 68, "submitted", "", null, t, t);
  testDb.prepare("INSERT INTO demand_quotes VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").run("QUOTE-UNIQUE-B", "DEM-FLOW-UNIQUE", "m-supplier-2", "p-orange-2", 1, 67, 67, "submitted", "", null, t, t);
  testDb.exec("COMMIT");
  const firstAward = await request("/api/v1/purchase-quotes/QUOTE-UNIQUE-A/accept", { token: "buyer-flow-token", method: "POST", key: "demand-flow-award-a" });
  expect(firstAward.status === 200, "开放需求首次授标", "QUOTE-UNIQUE-A");
  const secondAward = await request("/api/v1/purchase-quotes/QUOTE-UNIQUE-B/accept", { token: "buyer-flow-token", method: "POST", key: "demand-flow-award-b" });
  expect(secondAward.status === 409, "同一需求禁止二次授标", `HTTP ${secondAward.status}`);
  testDb.close();
  const closed = await request("/api/v1/purchase-demands", { token: "buyer-flow-token" });
  const closedDemand = closed.data?.data?.find((item) => item.id === "DEM-SZGS-0001");
  const closedQuote = closedDemand?.quotes?.find((item) => item.id === quoteId);
  expect(closedDemand?.status === "closed" && closedQuote?.status === "ordered" && closedQuote?.order_id === created.id, "报价下单后需求与报价状态闭合", `${closedDemand?.status} / ${closedQuote?.status}`);
  console.log("\n数智供社采购大厅报价闭环回归：全部通过");
} catch (error) {
  console.error(`FAIL  采购大厅报价闭环回归  ${error?.message || error}`);
  process.exitCode = 1;
} finally {
  server.kill("SIGTERM");
  await new Promise((resolveExit) => server.once("exit", resolveExit));
  rmSync(dbDir, { recursive: true, force: true });
}
