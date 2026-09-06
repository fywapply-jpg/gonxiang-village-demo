import { useEffect, useState } from "react";

type Tab = "overview" | "orders" | "merchants" | "products" | "operations" | "events" | "permissions" | "audit";
type Order = { id: string; status: string; amount: number; payment_status: string; fulfillment_step: number; buyer_name: string; supplier_name: string; settlement_model: string };
type Merchant = { id: string; name: string; role: string; license_status: string; bank_status: string; risk_level: string; organization_name: string; region: string };
type Application = { id: string; name: string; entity_type: string; credit_code: string; legal_name: string; status: string; submitted_at: string; review_note?: string };
type ServiceArea = { merchant_id: string; radius_km: number; regions: string[]; delivery_modes: string[] };
type Product = { id: string; name: string; category: string; spec?: string; price: number; stock: number; quality_status: string; merchant_name: string; origin?: string; media?: Array<{ media_type: string; url: string; status: string }> };
type Operation = { key: string; domain: string; name: string; steps: string[]; current_step: number; status: string; updated_at?: string | null; events: Array<{ title: string; evidence: string; actor: string; created_at: string }> };
type AdminContext = { role_key: string; role: { name: string; org: string; desc: string }; permissions: Record<string, string>; modules: Array<{ module: string; permission: string }> };
type PlatformCapabilities = { version: string; platform_version: string; api_version: string; runtime_mode: string; capabilities: Array<{ key: string; name: string; ready: boolean; source: string }>; productionReadiness: { missingCapabilities: string[]; allRequiredAvailable: boolean } };

const money = (v: number) => `¥${Number(v || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2 })}`;
const domainName: Record<string, string> = { production: "生产", circulation: "流通", credit: "信用", livelihood: "民生" };
const featureName: Record<string, string> = { digitalfarm: "数字种养", "agri-inputs": "农资与农机", trade: "供需交易", logistics: "物流与仓储", trace: "品质与溯源", finance: "支付与供应链金融", invoice: "发票与四流核对", emergency: "应急保供", village: "民生终端与共同体", mine: "账户中心", crossborder: "跨境贸易" };
const moduleName: Record<string, string> = { merchant: "商户管理", content: "内容运营", audit: "审核审计", finance: "财务结算", risk: "风险控制", service: "客户服务", data: "数据看板", system: "系统设置" };
const apiOrigin = String(import.meta.env.VITE_ADMIN_API_ORIGIN || "").replace(/\/+$/, "");
const productionAdminBuild = String(import.meta.env.VITE_ADMIN_RUNTIME_MODE || "").toLowerCase() === "production" || apiOrigin.startsWith("https://");
let activeAdminRole = "super";
// 正式构建禁止把演示令牌带入浏览器；令牌只允许由管理员在当前会话中输入。
let adminToken = sessionStorage.getItem("shuzhi-admin-session-token") || import.meta.env.VITE_ADMIN_TOKEN || (productionAdminBuild ? "" : "local-demo-token");
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  const method = String(init?.method || "GET").toUpperCase();
  const requestHeaders = new Headers(init?.headers || {});
  requestHeaders.set("Content-Type", "application/json");
  requestHeaders.set("Authorization", `Bearer ${adminToken}`);
  requestHeaders.set("X-Admin-Role", activeAdminRole);
  // 生产后台所有状态变更都必须幂等；统一在 API 包装层生成，避免审批、审核、结算等入口漏传。
  if ((method === "POST" || method === "PUT" || method === "PATCH") && !requestHeaders.has("Idempotency-Key")) {
    const nonce = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    requestHeaders.set("Idempotency-Key", `admin-${nonce}`);
  }
  try {
    response = await fetch(`${apiOrigin}${path}`, { ...init, method, headers: requestHeaders });
  } catch {
    throw new Error(productionAdminBuild
      ? "无法连接正式后台 API，请检查 HTTPS 地址、反向代理和 /health 转发"
      : "无法连接本地后台 API（http://localhost:8787），请先运行 npm run dev:local-api");
  }
  const raw = await response.text();
  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    const contentType = response.headers.get("content-type") || "未知类型";
    throw new Error(`后台接口返回了非 JSON 响应（HTTP ${response.status}，${contentType}）；请确认管理后台已将 /api 与 /health 代理到 8787`);
  }
  if (!response.ok || payload.code !== 0) throw new Error(payload.data?.error || payload.message || "请求失败");
  return payload.data;
}

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [overview, setOverview] = useState<any>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [areas, setAreas] = useState<ServiceArea[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [adminContext, setAdminContext] = useState<AdminContext | null>(null);
  const [capabilities, setCapabilities] = useState<PlatformCapabilities | null>(null);
  const [platformEvents, setPlatformEvents] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [runtimeMode, setRuntimeMode] = useState("local-demo");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [authenticated, setAuthenticated] = useState(Boolean(adminToken));

  const load = async () => {
    setError("");
    try {
      const [health, context, capabilityData] = await Promise.all([
        api<{ runtime_mode: string }>("/health"),
        api<AdminContext>("/api/v1/admin/context"),
        api<PlatformCapabilities>("/api/v1/platform/capabilities"),
      ]);
      activeAdminRole = context.role_key;
      const can = (module: string) => context.permissions[module] !== "none";
      const [o, os, ms, aps, areasData, ps, ops, ls, es] = await Promise.all([
        can("data") ? api<any>("/api/v1/admin/overview") : Promise.resolve(null),
        can("finance") ? api<Order[]>("/api/v1/admin/orders") : Promise.resolve([]),
        can("merchant") ? api<Merchant[]>("/api/v1/admin/merchants") : Promise.resolve([]),
        can("merchant") ? api<Application[]>("/api/v1/admin/merchant-applications") : Promise.resolve([]),
        can("merchant") ? api<ServiceArea[]>("/api/v1/admin/service-areas") : Promise.resolve([]),
        can("audit") ? api<Product[]>("/api/v1/admin/products") : Promise.resolve([]),
        can("data") ? api<Operation[]>("/api/v1/admin/operations") : Promise.resolve([]),
        can("audit") ? api<any[]>("/api/v1/admin/audit-logs") : Promise.resolve([]),
        can("audit") ? api<any[]>("/api/v1/admin/platform-events") : Promise.resolve([]),
      ]);
      setRuntimeMode(health.runtime_mode); setAdminContext(context); setCapabilities(capabilityData); setOverview(o); setOrders(os); setMerchants(ms); setApplications(aps); setAreas(areasData); setProducts(ps); setOperations(ops); setLogs(ls); setPlatformEvents(es);
    } catch (e) { setError((e as Error).message); }
  };
  useEffect(() => { if (!productionAdminBuild || authenticated) void load(); }, [authenticated]);

  const advance = async (id: string) => {
    setBusy(true);
    try { await api(`/api/v1/trades/${encodeURIComponent(id)}/advance`, { method: "POST", body: "{}" }); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const review = async (id: string, decision: "approve" | "review" | "reject") => {
    setBusy(true);
    try {
      await api(`/api/v1/admin/merchant-applications/${encodeURIComponent(id)}/review`, { method: "POST", body: JSON.stringify({ decision, note: decision === "approve" ? "后台双人复核通过" : decision === "review" ? "转人工补充核验" : "资料或风险不符合准入条件" }) });
      await load();
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const activate = async (id: string) => {
    setBusy(true);
    try { await api(`/api/v1/admin/merchant-applications/${encodeURIComponent(id)}/activate`, { method: "POST", body: "{}" }); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const reviewProduct = async (id: string, decision: "approve" | "reject") => {
    setBusy(true);
    try { await api(`/api/v1/admin/products/${encodeURIComponent(id)}/review`, { method: "POST", body: JSON.stringify({ decision, note: decision === "approve" ? "后台商品资料与资质复核通过" : "商品资料或资质不符合上架要求" }) }); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const advanceOperation = async (key: string) => {
    setBusy(true);
    try { await api(`/api/v1/operations/${encodeURIComponent(key)}/advance`, { method: "POST", body: JSON.stringify({ actor: "后台运营管理员" }) }); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const resetOperation = async (key: string) => {
    setBusy(true);
    try { await api(`/api/v1/operations/${encodeURIComponent(key)}/reset`, { method: "POST", body: "{}" }); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const changeAdminRole = async (roleKey: string) => {
    setBusy(true);
    try { const next = await api<AdminContext>("/api/v1/admin/context/role", { method: "POST", body: JSON.stringify({ role_key: roleKey }) }); activeAdminRole = next.role_key; setAdminContext(next); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };
  const replaceAdminToken = () => {
    const next = window.prompt("请输入后台管理员岗位令牌。令牌仅保存在当前浏览器会话，关闭窗口后失效。", "");
    if (!next?.trim()) return;
    adminToken = next.trim();
    sessionStorage.setItem("shuzhi-admin-session-token", adminToken);
    activeAdminRole = "super";
    setAuthenticated(true);
    void load();
  };

  if (productionAdminBuild && !authenticated) return <div className="auth-gate"><div className="auth-card"><div className="brand-mark">供</div><h1>数智供社 · 后端管理台</h1><p>正式环境需要管理员岗位令牌。令牌仅保存在当前浏览器会话，不会写入构建包。</p><button className="primary" onClick={replaceAdminToken}>输入管理员令牌</button></div></div>;

  return <div className="shell">
    <aside><div className="brand"><span className="brand-mark">供</span><div><strong>数智供社</strong><small>v8533 · 后端管理</small></div></div>
      <nav>{([["overview", "运行总览"], ["orders", "交易与结算"], ["merchants", "商家准入"], ["products", "商品审核"], ["operations", "业务流程"], ["events", "平台事件"], ["permissions", "权限设置"], ["audit", "安全审计"]] as [Tab, string][]).map(([key, label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}</nav>
      <div className="side-note">前台与后端分离<br />业务只经 REST API<br />SQLite 本地数据底座</div>
    </aside>
    <main><header><div><span className="eyebrow">数智供社 · 后端</span><h1>{tab === "overview" ? "运行总览" : tab === "orders" ? "交易与结算" : tab === "merchants" ? "商家准入" : tab === "products" ? "商品审核" : tab === "operations" ? "业务流程" : tab === "events" ? "平台事件" : tab === "permissions" ? "权限设置" : "安全审计"}</h1></div><div className="header-actions"><span className="online"><i />后端已连接</span><button onClick={replaceAdminToken}>管理员登录</button><button onClick={load}>刷新数据</button></div></header>
      {error && <div className="error">{error}</div>}
      {tab === "overview" && overview && <><section className="cards"><Card label="交易订单" value={overview.orders} /><Card label="交易总额" value={money(overview.gmv)} /><Card label="已核验主体" value={`${overview.security?.merchant_verified}/${overview.security?.merchant_total}`} /><Card label="审计事件" value={overview.security?.audit_events} /></section><section className="panel monitor-grid"><div><h2>安全控制</h2>{overview.security?.controls?.map((c: any) => <div className="control-item" key={c.key}><span>{c.key}</span><b className={c.status === "正常" ? "safe" : "warn"}>{c.status}</b></div>)}<p className="muted">提升风险主体：{overview.security?.elevated_risk_merchants}　待机构确认：{overview.pending_payment}</p></div><div><h2>经营数据</h2><div className="mini-kpis"><div><b>{money(overview.analytics?.average_order_value)}</b><span>平均订单额</span></div><div><b>{money(overview.analytics?.settled_amount)}</b><span>已分账金额</span></div><div><b>{Math.round((overview.analytics?.order_completion_rate || 0) * 100)}%</b><span>订单完成率</span></div></div><h3>流程分布</h3>{overview.flow?.map((f: any) => <div className="flow-bar" key={f.step}><span>第 {Number(f.step) + 1} 步</span><i><em style={{ width: `${Math.max(8, Number(f.count) / Math.max(1, Number(overview.orders)) * 100)}%` }} /></i><b>{f.count}</b></div>)}</div></section>{capabilities && <section className="panel"><div className="panel-title"><h2>平台能力接入</h2><span>{capabilities.platform_version} · API {capabilities.api_version} · {capabilities.runtime_mode}</span></div><div className="capability-grid">{capabilities.capabilities.map(c => <div className={`capability-item ${c.ready ? "ready" : "blocked"}`} key={c.key}><div><b>{c.name}</b><small>{c.source}</small></div><span>{c.ready ? "已就绪" : "待联调"}</span></div>)}</div>{!capabilities.productionReadiness.allRequiredAvailable && <p className="muted capability-warning">生产发布前仍需完成：{capabilities.productionReadiness.missingCapabilities.join("、")}</p>}</section>}{adminContext && <section className="panel"><div className="panel-title"><h2>当前管理员权限上下文</h2><span>{adminContext.role.name} · {adminContext.role.org}</span></div><p className="muted">{adminContext.role.desc} · 前台管理中心与本后台共用同一角色权限矩阵</p><div className="mini-kpis">{Object.entries(adminContext.permissions).map(([k, v]) => <div key={k}><b>{v === "full" ? "可管理" : v === "read" ? "仅查看" : "无权限"}</b><span>{k}</span></div>)}</div></section>}</>}
      {tab === "orders" && <section className="panel"><div className="panel-title"><h2>交易台账</h2><span>推进会写入履约事件与安全审计</span></div><div className="table-wrap"><table><thead><tr><th>订单</th><th>双方主体</th><th>金额</th><th>履约</th><th>支付</th><th>操作</th></tr></thead><tbody>{orders.map(o => <tr key={o.id}><td><b>{o.id}</b><small>{o.settlement_model}</small></td><td>{o.buyer_name}<br /><span className="muted">→ {o.supplier_name}</span></td><td>{money(o.amount)}</td><td><span className="pill">第 {o.fulfillment_step + 1}/12 步</span><br /><span className="muted">{o.status}</span></td><td>{o.payment_status}</td><td>{runtimeMode === "production" ? <span className="muted">按合同/物流/验收/开票接口推进</span> : <button disabled={busy || o.fulfillment_step >= 11} onClick={() => advance(o.id)}>{o.fulfillment_step >= 11 ? "已关账" : "推进下一步"}</button>}</td></tr>)}</tbody></table></div></section>}
      {tab === "merchants" && <><section className="panel"><div className="panel-title"><h2>入驻申请审批</h2><span>注册 → 审核 → 启动业务</span></div><div className="application-list">{applications.length === 0 && <p className="muted">暂无申请</p>}{applications.map(a => <div className="application-row" key={a.id}><div><b>{a.name}</b><small>{a.id} · {a.credit_code} · 法人 {a.legal_name}</small></div><span className={`pill ${a.status}`}>{a.status === "pending" ? "待审核" : a.status === "approved" ? "已通过" : a.status === "review" ? "人工复核" : a.status === "active" ? "已启用" : "已驳回"}</span><div className="row-actions">{a.status === "pending" && <><button disabled={busy} onClick={() => review(a.id, "approve")}>通过</button><button disabled={busy} onClick={() => review(a.id, "review")}>转复核</button><button disabled={busy} onClick={() => review(a.id, "reject")}>驳回</button></>}{a.status === "approved" && <button disabled={busy} onClick={() => activate(a.id)}>启动业务</button>}</div></div>)}</div></section><section className="panel"><div className="panel-title"><h2>已准入商家</h2><span>交易前锁定主体、许可和对公账户</span></div><div className="table-wrap"><table><thead><tr><th>主体</th><th>角色</th><th>区域</th><th>经营资质</th><th>对公账户</th><th>风险</th></tr></thead><tbody>{merchants.map(m => <tr key={m.id}><td><b>{m.name}</b><small>{m.organization_name}</small></td><td>{m.role === "buyer" ? "采购商" : m.role === "supplier" ? "产地供货商" : "平台"}</td><td>{m.region}</td><td><span className="ok">● {m.license_status === "verified" ? "已核验" : m.license_status}</span></td><td><span className="ok">● {m.bank_status === "verified" ? "已核验" : m.bank_status}</span></td><td>{m.risk_level}</td></tr>)}</tbody></table></div></section></>}
      {tab === "products" && <section className="panel"><div className="panel-title"><h2>商品上架审核</h2><span>前台提交 → 后台审核 → 供货大厅同步</span></div><div className="table-wrap"><table><thead><tr><th>商品</th><th>供货商</th><th>规格/产地</th><th>价格</th><th>库存</th><th>状态</th><th>操作</th></tr></thead><tbody>{products.map(p => <tr key={p.id}><td><b>{p.name}</b><small>{p.id} · {p.category}</small></td><td>{p.merchant_name}</td><td>{p.spec || "—"}<br /><span className="muted">{p.origin || "—"}</span></td><td>{money(p.price)}</td><td>{p.stock}</td><td><span className={`pill ${p.quality_status === "pending_review" ? "pending" : p.quality_status === "rejected" ? "rejected" : "approved"}`}>{p.quality_status === "pending_review" ? "待审核" : p.quality_status === "rejected" ? "已驳回" : "已通过"}</span></td><td>{p.quality_status === "pending_review" ? <div className="row-actions"><button disabled={busy} onClick={() => reviewProduct(p.id, "approve")}>通过</button><button disabled={busy} onClick={() => reviewProduct(p.id, "reject")}>驳回</button></div> : "—"}</td></tr>)}</tbody></table></div></section>}
      {tab === "operations" && <section className="panel"><div className="panel-title"><h2>四大业务域工作流</h2><span>生产、流通、信用、民生共用后端状态机与审计证据</span></div><div className="operation-grid">{operations.map(o => <div className="operation-card" key={o.key}><div className="operation-head"><div><b>{o.name}</b><small>{domainName[o.domain] || o.domain}</small></div><span className={`pill ${o.status}`}>{o.status === "completed" ? "已完成" : o.status === "running" ? "进行中" : "待开始"}</span></div><div className="operation-progress"><i style={{ width: `${Math.max(0, Math.min(100, ((o.current_step + 1) / o.steps.length) * 100))}%` }} /></div><div className="operation-meta"><span>第 {Math.max(0, o.current_step + 1)}/{o.steps.length} 环节</span><span>{o.current_step >= 0 ? o.steps[o.current_step] : "尚未执行"}</span></div><div className="row-actions"><button disabled={busy || o.current_step >= o.steps.length - 1} onClick={() => advanceOperation(o.key)}>{o.current_step >= o.steps.length - 1 ? "已完成" : "推进下一环节"}</button>{runtimeMode !== "production" && <button disabled={busy || o.current_step < 0} onClick={() => resetOperation(o.key)}>重置</button>}</div>{runtimeMode === "production" && <p className="muted">生产环境不支持重置；流程只能按真实业务接口和证据推进。</p>}{o.events[0] && <p className="muted">最近证据：{o.events[0].evidence} · {o.events[0].actor}</p>}</div>)}</div></section>}
      {tab === "events" && <section className="panel"><div className="panel-title"><h2>平台业务事件</h2><span>前台每个关键动作统一写入后台，可按功能、域和主体追溯</span></div><div className="table-wrap"><table><thead><tr><th>时间</th><th>业务域/功能</th><th>动作</th><th>经办人</th><th>状态</th><th>参数</th></tr></thead><tbody>{platformEvents.map(e => <tr key={e.id}><td>{new Date(e.created_at).toLocaleString("zh-CN")}</td><td><b>{domainName[e.domain] || e.domain}</b><br /><span className="muted">{featureName[e.feature_key] || e.feature_key}</span></td><td>{e.action}</td><td>{e.actor}</td><td><span className="pill approved">已接收</span></td><td><code>{JSON.stringify(e.payload || {})}</code></td></tr>)}</tbody></table></div></section>}
      {tab === "permissions" && adminContext && <section className="panel"><div className="panel-title"><h2>管理员权限设置</h2><span>{runtimeMode === "production" ? "生产岗位由服务端令牌绑定，界面禁止切换" : "本地演示可切换岗位验证权限矩阵"}</span></div><div className="row-actions">{["super", "ops", "audit", "finance", "service"].map(k => <button key={k} disabled={busy || runtimeMode === "production"} className={adminContext.role_key === k ? "active" : ""} onClick={() => changeAdminRole(k)}>{k === "super" ? "超级管理员" : k === "ops" ? "运营管理员" : k === "audit" ? "审核员" : k === "finance" ? "财务结算" : "客服专员"}</button>)}</div><div className="table-wrap"><table><thead><tr><th>模块</th><th>当前角色权限</th><th>接口策略</th></tr></thead><tbody>{Object.entries(adminContext.permissions).map(([module, permission]) => <tr key={module}><td>{moduleName[module] || module}</td><td>{permission === "full" ? "可管理" : permission === "read" ? "仅查看" : "无权限"}</td><td>{permission === "none" ? "后台拒绝访问" : permission === "read" ? "只读接口" : "读写接口"}</td></tr>)}</tbody></table></div></section>}
      {tab === "audit" && <section className="panel"><div className="panel-title"><h2>安全审计</h2><span>身份、支付、状态变更全部留痕</span></div><div className="timeline">{logs.map(l => <div className="log" key={l.id}><span className="dot" /><div><b>{l.action}</b><span className="muted"> · {l.actor} · {new Date(l.created_at).toLocaleString("zh-CN")}</span><p>{l.resource}　{l.detail || ""}</p></div></div>)}</div></section>}
    </main>
  </div>;
}
function Card({ label, value }: { label: string; value: any }) { return <div className="card"><span>{label}</span><strong>{value}</strong></div>; }
