#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(new URL("..", import.meta.url).pathname);
const production = process.argv.includes("--production");
const checks = [];
const add = (level, name, detail) => checks.push({ level, name, detail });
const text = (path) => readFileSync(resolve(root, path), "utf8");
const manifestText = text("work/shuzhi-v8502-source/src/manifest.json");
const project = JSON.parse(text("work/shuzhi-v8502-source/project.config.json"));
const versionIndex = JSON.parse(text("deliverables/数智供社-版本索引.json"));
const currentVersion = String(versionIndex.current_version || "v8530");
const currentCode = currentVersion.replace(/^v/, "");
const currentName = currentCode.length === 4
  ? `${currentCode[0]}.${currentCode[1]}.${currentCode.slice(2)}`
  : `8.5.${currentCode}`;
const serverSource = text("local-backend/server.mjs");
const apiSource = text("work/shuzhi-v8502-source/src/services/localApi.ts");
const homeSource = text("work/shuzhi-v8502-source/src/pages/home/index.vue");
const tradeIndexSource = text("work/shuzhi-v8502-source/src/pages/trade/index.vue");
const adminSource = text("admin/App2.tsx");
const tradeFlowPanelSource = text("work/shuzhi-v8502-source/src/components/TradeFlowPanel.vue");
const paySource = text("work/shuzhi-v8502-source/src/utils/pay.ts");
const productionActionSources = [
  text("work/shuzhi-v8502-source/src/pages/agri/futures.vue"),
  text("work/shuzhi-v8502-source/src/pages/agri/detail.vue"),
  text("work/shuzhi-v8502-source/src/pages/finance/bankbid.vue"),
  text("work/shuzhi-v8502-source/src/pages/emergency/apply.vue"),
  text("work/shuzhi-v8502-source/src/pages/crossborder/func.vue"),
  text("work/shuzhi-v8502-source/src/pages/trade/tool-army.vue"),
  text("work/shuzhi-v8502-source/src/pages/trade/tool-student.vue"),
  text("work/shuzhi-v8502-source/src/pages/trade/tool-process.vue"),
  text("work/shuzhi-v8502-source/src/pages/trade/tool-catering.vue"),
  text("work/shuzhi-v8502-source/src/pages/trade/tool-market.vue"),
  text("work/shuzhi-v8502-source/src/pages/trade/tool-store.vue"),
  text("work/shuzhi-v8502-source/src/pages/trade/kitchen-bom.vue"),
  text("work/shuzhi-v8502-source/src/pages/ai/quality.vue"),
  text("work/shuzhi-v8502-source/src/pages/ai/forecast.vue"),
  text("work/shuzhi-v8502-source/src/pages/ai/pick.vue"),
  text("work/shuzhi-v8502-source/src/pages/ai/match.vue"),
  text("work/shuzhi-v8502-source/src/pages/ai/qa.vue"),
  text("work/shuzhi-v8502-source/src/pages/aftersale/ticket.vue"),
  text("work/shuzhi-v8502-source/src/pages/agri/brand.vue"),
  text("work/shuzhi-v8502-source/src/pages/agri/contract.vue"),
  text("work/shuzhi-v8502-source/src/pages/agri/inputs.vue"),
  text("work/shuzhi-v8502-source/src/pages/agri/qualification.vue"),
  text("work/shuzhi-v8502-source/src/pages/agri/machinery-merchant.vue"),
  text("work/shuzhi-v8502-source/src/pages/cert/index.vue"),
  text("work/shuzhi-v8502-source/src/pages/crossborder/hub.vue"),
  text("work/shuzhi-v8502-source/src/pages/digitalfarm/project.vue"),
  text("work/shuzhi-v8502-source/src/pages/finance/dividend.vue"),
  text("work/shuzhi-v8502-source/src/pages/finance/factoring.vue"),
  text("work/shuzhi-v8502-source/src/pages/finance/grainbank.vue"),
  text("work/shuzhi-v8502-source/src/pages/finance/insurance.vue"),
  text("work/shuzhi-v8502-source/src/pages/trace/detail.vue"),
  text("work/shuzhi-v8502-source/src/pages/trace/fullchain.vue"),
  text("work/shuzhi-v8502-source/src/pages/ai/index.vue"),
  text("work/shuzhi-v8502-source/src/pages/trace/scan.vue"),
  text("work/shuzhi-v8502-source/src/pages/finance/product.vue"),
  text("work/shuzhi-v8502-source/src/pages/finance/loop.vue"),
  text("work/shuzhi-v8502-source/src/pages/crossborder/index.vue"),
  text("work/shuzhi-v8502-source/src/pages/promo/commission.vue"),
  text("work/shuzhi-v8502-source/src/pages/promo/dividend.vue"),
  text("work/shuzhi-v8502-source/src/pages/promo/org.vue"),
  text("work/shuzhi-v8502-source/src/pages/promo/promoter.vue"),
  text("work/shuzhi-v8502-source/src/pages/logistics/receipt.vue"),
  text("work/shuzhi-v8502-source/src/pages/admin/permdetail.vue"),
  text("work/shuzhi-v8502-source/src/pages/crossborder/compare.vue"),
  text("work/shuzhi-v8502-source/src/pages/crossborder/tax.vue"),
  text("work/shuzhi-v8502-source/src/pages/home/search.vue"),
  text("work/shuzhi-v8502-source/src/pages/merchant/star.vue"),
  text("work/shuzhi-v8502-source/src/pages/message/index.vue"),
  text("work/shuzhi-v8502-source/src/pages/alliance/index.vue"),
  text("work/shuzhi-v8502-source/src/pages/mine/favorites.vue"),
  text("work/shuzhi-v8502-source/src/pages/trade/chain.vue"),
  text("work/shuzhi-v8502-source/src/pages/trade/markets.vue"),
  text("work/shuzhi-v8502-source/src/pages/digitalfarm/livestock.vue"),
  text("work/shuzhi-v8502-source/src/pages/digitalfarm/index.vue"),
  text("work/shuzhi-v8502-source/src/pages/logistics/warehouse.vue"),
  text("work/shuzhi-v8502-source/src/pages/logistics/wms.vue"),
  text("work/shuzhi-v8502-source/src/pages/logistics/capacity.vue"),
  text("work/shuzhi-v8502-source/src/pages/agri/preseason.vue"),
  text("work/shuzhi-v8502-source/src/pages/agri/machine.vue"),
  text("work/shuzhi-v8502-source/src/pages/ai/risk.vue"),
  text("work/shuzhi-v8502-source/src/pages/digitalfarm/resources.vue"),
  text("work/shuzhi-v8502-source/src/pages/aftersale/dispute.vue"),
  text("work/shuzhi-v8502-source/src/pages/trade/contracts.vue"),
  text("work/shuzhi-v8502-source/src/pages/agri/property.vue"),
  text("work/shuzhi-v8502-source/src/pages/trade/control.vue"),
  text("work/shuzhi-v8502-source/src/pages/finance/fourflow.vue"),
  text("work/shuzhi-v8502-source/src/pages/arch/chain.vue"),
  text("work/shuzhi-v8502-source/src/pages/logistics/dispatch.vue"),
  text("work/shuzhi-v8502-source/src/pages/trade/citymarket.vue"),
  text("work/shuzhi-v8502-source/src/pages/login/index.vue"),
  text("work/shuzhi-v8502-source/src/pages/emergency/task.vue"),
  text("work/shuzhi-v8502-source/src/pages/emergency/subsidy.vue"),
  text("work/shuzhi-v8502-source/src/pages/home/emergency.vue"),
  text("work/shuzhi-v8502-source/src/pages/village/care.vue"),
  text("work/shuzhi-v8502-source/src/pages/village/leader.vue"),
  text("work/shuzhi-v8502-source/src/pages/village/meal.vue"),
  text("work/shuzhi-v8502-source/src/pages/village/index.vue"),
  text("work/shuzhi-v8502-source/src/pages/station/hub.vue"),
  text("work/shuzhi-v8502-source/src/pages/station/index.vue"),
  text("work/shuzhi-v8502-source/src/pages/promo/opinion.vue"),
  text("work/shuzhi-v8502-source/src/pages/pay/index.vue"),
  text("work/shuzhi-v8502-source/src/pages/trade/assist.vue"),
  text("work/shuzhi-v8502-source/src/pages/aftersale/review.vue"),
  text("work/shuzhi-v8502-source/src/pages/mine/privacy.vue"),
  text("work/shuzhi-v8502-source/src/pages/finance/settle.vue"),
  text("work/shuzhi-v8502-source/src/pages/admin/permission.vue"),
  text("work/shuzhi-v8502-source/src/pages/admin/region.vue"),
  text("work/shuzhi-v8502-source/src/pages/register/faceauth.vue"),
  text("work/shuzhi-v8502-source/src/pages/register/index.vue"),
  text("work/shuzhi-v8502-source/src/pages/trade/chat.vue"),
  text("work/shuzhi-v8502-source/src/pages/finance/apply.vue"),
  text("work/shuzhi-v8502-source/src/pages/promo/index.vue"),
  text("work/shuzhi-v8502-source/src/pages/crossborder/import.vue"),
  text("work/shuzhi-v8502-source/src/pages/crossborder/export.vue"),
  text("work/shuzhi-v8502-source/src/pages/trade/endtype.vue"),
  text("work/shuzhi-v8502-source/src/pages/register/endjoin.vue"),
  text("work/shuzhi-v8502-source/src/pages/mine/feedback.vue"),
  text("work/shuzhi-v8502-source/src/pages/operation/index.vue"),
  text("work/shuzhi-v8502-source/src/pages/trade/fulfillment.vue"),
  text("work/shuzhi-v8502-source/src/pages/finance/loanlife.vue"),
  text("work/shuzhi-v8502-source/src/pages/trade/canteen-bid.vue"),
  text("work/shuzhi-v8502-source/src/pages/village/groupbuy.vue"),
  text("work/shuzhi-v8502-source/src/pages/arch/flow.vue"),
  text("work/shuzhi-v8502-source/src/pages/trade/tender.vue"),
  text("work/shuzhi-v8502-source/src/pages/agri/credit.vue"),
  text("work/shuzhi-v8502-source/src/pages/agri/primary.vue"),
  text("work/shuzhi-v8502-source/src/pages/agri/recycle.vue"),
  text("work/shuzhi-v8502-source/src/pages/agri/trust.vue"),
  text("work/shuzhi-v8502-source/src/pages/admin/index.vue"),
];
const collectVueFiles = (directory) => readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap((entry) => {
  const relative = `${directory}/${entry.name}`;
  if (entry.isDirectory()) return collectVueFiles(relative);
  return entry.isFile() && entry.name.endsWith(".vue") ? [relative] : [];
});
const sourceVueFiles = collectVueFiles("work/shuzhi-v8502-source/src");
const productionModeFiles = [...sourceVueFiles, "work/shuzhi-v8502-source/src/services/localApi.ts", "work/shuzhi-v8502-source/src/utils/pay.ts"]
  .filter((path) => text(path).includes("productionBuild"));
const legacyProductionModeFiles = sourceVueFiles.filter((path) => {
  const source = text(path);
  return source.includes("Boolean(import.meta.env.PROD)") || source.includes('import.meta.env.MODE === "production"');
});
const inconsistentProductionModeFiles = productionModeFiles.filter((path) => !text(path).includes('String(import.meta.env.VITE_API_BASE || "").startsWith("https://")'));
add(legacyProductionModeFiles.length === 0 && inconsistentProductionModeFiles.length === 0 ? "pass" : "fail", "前端演示/生产模式判定一致", legacyProductionModeFiles.length === 0 && inconsistentProductionModeFiles.length === 0
  ? `${productionModeFiles.length} 个页面以 HTTPS API 根地址进入正式模式；本地 HTTP 小程序保留演示模式`
  : `旧判定：${legacyProductionModeFiles.join(", ") || "无"}；不一致：${inconsistentProductionModeFiles.join(", ") || "无"}`);
const mockPageFiles = collectVueFiles("work/shuzhi-v8502-source/src/pages")
  .filter((path) => text(path).includes("from \"@/mock"));
const mockPageGuardFailures = mockPageFiles.filter((path) => {
  const source = text(path);
  return !source.includes("productionBuild") || !/(正式环境|后台|production)/i.test(source);
});
// 防止新增页面把本地状态变更或“成功”提示带进正式包。四个例外都是
// 明确的非业务动作：复制 DID、清理本地设置、只读支付结果，以及真正
// 通过 localApi 写入后台的供货/采购发布页。
const safeUnguardedActionPages = new Set([
  "work/shuzhi-v8502-source/src/pages/mine/did.vue",
  "work/shuzhi-v8502-source/src/pages/mine/settings.vue",
  "work/shuzhi-v8502-source/src/pages/pay/result.vue",
  "work/shuzhi-v8502-source/src/pages/trade/publish.vue",
]);
const localMutationSignals = [/setTimeout\s*\(/, /\.value\s*=\s*/, /\.status\s*=\s*/, /showToast\(\{\s*title:\s*[`\"].*(?:成功|提交|完成|已)/s];
const unguardedActionPages = collectVueFiles("work/shuzhi-v8502-source/src/pages").filter((path) => {
  if (safeUnguardedActionPages.has(path)) return false;
  const source = text(path);
  return localMutationSignals.some((pattern) => pattern.test(source)) && !source.includes("productionBuild");
});
const workPackage = text("work/shuzhi-v8502-source/package.json");
const legacyCloudReadme = text("cloud-server/README.md");
const historicalDeploymentDocs = [
  text("docs/数智供社-v8513-微信小程序与后端部署.md"),
  text("docs/数智供社-v8513-本地三层部署说明.md"),
].join("\n");
const serverProductBlock = serverSource.slice(serverSource.indexOf('if (path === "/api/v1/products" && req.method === "POST")'), serverSource.indexOf('const productReviewMatch'));
const publishPageSource = text("work/shuzhi-v8502-source/src/pages/trade/publish.vue");
add(manifestText.includes(`"versionName" : "${currentName}"`) && manifestText.includes(`"versionCode" : "${currentCode}"`) ? "pass" : "fail", "版本一致性", `manifest 必须为 ${currentName} / ${currentCode}`);
add(versionIndex.current_version === currentVersion && versionIndex.next_version === `v${Number(currentCode) + 1}` ? "pass" : "fail", "版本索引", `current=${versionIndex.current_version} next=${versionIndex.next_version}`);
add(legacyCloudReadme.includes("历史隔离说明（数智供社 v8533）") && legacyCloudReadme.includes("不得将本目录接入当前生产域名") ? "pass" : "fail", "旧版后端隔离", "v3.1208 微信云托管目录仅作历史保留，不进入当前 v8533 生产链路");
add(!historicalDeploymentDocs.includes("生产环境应切换到 `cloud-server/` 的 MySQL 后端") && historicalDeploymentDocs.includes("不能直接切换到 `cloud-server/`") ? "pass" : "fail", "历史部署文档冲突隔离", "旧版三层部署说明不得把 cloud-server 直接宣称为当前 v8533 生产后端");
add(Boolean(project.appid && /^wx[a-z0-9]{16}$/i.test(project.appid)) ? "pass" : "fail", "微信 AppID", project.appid || "未配置");
add(existsSync(resolve(root, "work/shuzhi-v8502-source/dist/build/mp-weixin/app.json")) ? "pass" : "fail", "微信构建产物", "dist/build/mp-weixin/app.json");
const v8514Archive = text("deliverables/数智供社-v8514/数智供社-v8514-手机演示版.html");
const v8514Source = text("deliverables/数智供社-v8514-手机离线演示版.html");
add(v8514Archive === v8514Source && !v8514Archive.includes(".data:image") && !v8514Archive.includes("if(l&&l.length>0)") ? "pass" : "fail", "v8514 归档手机回归", "源文件与归档一致，分包预加载和错误图片路径已清理");
const v8533ArchivePath = resolve(root, "deliverables/数智供社-v8533/数智供社-v8533-手机演示版.html");
const v8533SourceCandidates = [
  resolve(root, "deliverables/数智供社-v8533-手机离线演示版.html"),
  v8533ArchivePath,
];
const v8533SourcePath = v8533SourceCandidates.find((path) => existsSync(path)) || v8533SourceCandidates[0];
const v8533Archive = existsSync(v8533ArchivePath) ? readFileSync(v8533ArchivePath) : null;
const v8533Source = existsSync(v8533SourcePath) ? readFileSync(v8533SourcePath) : null;
const v8533Hash = v8533Archive ? createHash("sha256").update(v8533Archive).digest("hex") : "";
add(v8533Archive && v8533Source && v8533Archive.equals(v8533Source) && v8533Archive.includes("grid-template-columns:repeat(2") && v8533Archive.includes("数智供社 v8533 · 手机离线演示版") && !v8533Archive.includes("供享村社") && v8533Hash === "2c4f8d1a92ad2e2f3ebfbe872b7bbb34fc5b3a138da36cef48062aeb777f3b1a" ? "pass" : "fail", "v8533 手机两列归档", "单文件归档、离线副本和发布指纹一致，包内标题与版本一致，入口为每行两个且不混入其他版本品牌");
const legacyMobileCandidates = [
  resolve(root, "deliverables/数智供销-v85-手机离线演示版.html"),
  v8533ArchivePath,
];
const legacyMobilePath = legacyMobileCandidates.find((path) => existsSync(path)) || legacyMobileCandidates[0];
const legacyMobile = existsSync(legacyMobilePath) ? readFileSync(legacyMobilePath) : null;
add(legacyMobile && v8533Source && legacyMobile.equals(v8533Source) && legacyMobile.includes("数智供社 v8533 · 手机离线演示版") && legacyMobile.includes("grid-template-columns:repeat(2") ? "pass" : "fail", "旧手机链接兼容", "原数智供销-v85 文件名继续指向 v8533 最新内容，避免手机收藏链接打开旧版");
add(workPackage.includes('"build:mp-weixin:production"') && workPackage.includes('"build:h5:production"') && workPackage.includes("VITE_API_BASE") && workPackage.includes("https://") ? "pass" : "fail", "生产端构建门禁", "正式 H5/小程序构建强制 HTTPS API 地址，局域网构建仅供联调");
add(!workPackage.includes("192.168.2.104") && workPackage.includes("VITE_API_HOST") && workPackage.includes("ipconfig getifaddr") ? "pass" : "fail", "本地联调地址动态探测", "微信真机联调不固化历史局域网 IP，优先使用 VITE_API_BASE/VITE_API_HOST 或自动探测当前网卡");
add(existsSync(resolve(root, "scripts/sync-shuzhi-h5.mjs")) && text("scripts/sync-shuzhi-h5.mjs").includes("rmSync(targetAssets") && text("package.json").includes('"sync:shuzhi-h5"') ? "pass" : "fail", "H5 发布同步", "生产 H5 通过受控脚本同步并清理旧哈希资源，避免发布包累积历史前端代码");
add(existsSync(resolve(root, "dist-admin/index.html")) ? "pass" : "fail", "后台构建产物", "dist-admin/index.html");
add(adminSource.includes("productionAdminBuild") && adminSource.includes("productionAdminBuild ? \"\" : \"local-demo-token\"") && adminSource.includes("正式环境需要管理员岗位令牌") && adminSource.includes("正式后台 API") ? "pass" : "fail", "后台生产认证门禁", "正式管理台不内置演示令牌，必须输入会话令牌并显示生产连接提示");
add(adminSource.includes("按合同/物流/验收/开票接口推进") && adminSource.includes("生产环境不支持重置") && adminSource.includes("runtimeMode !== \"production\" && <button") ? "pass" : "fail", "后台生产动作提示", "生产后台不展示会被后端拒绝的一键推进/重置操作，明确提示按真实业务接口和证据推进");
add(serverSource.includes("SHUZHI_MAX_BODY_BYTES") && serverSource.includes("HttpError") ? "pass" : "fail", "请求体与错误隔离", "生产请求体上限、JSON 类型校验和统一错误响应");
add(serverSource.includes("seedDemoData") && serverSource.includes("if (!seedDemoData) return") ? "pass" : "fail", "生产数据隔离", "生产模式不写入演示主体、商品、订单和资质种子");
add(serverProductBlock.indexOf("const media =") < serverProductBlock.indexOf('db.prepare("INSERT INTO products') && serverProductBlock.includes('db.exec("BEGIN")') && serverProductBlock.includes('db.exec("COMMIT")') ? "pass" : "fail", "商品写入原子性", "商品字段和媒体先校验，再以事务写入商品、媒体及幂等记录");
add(serverSource.includes("request_idempotency") && serverSource.includes("Idempotency-Key") ? "pass" : "fail", "幂等控制", "关键写请求支持幂等键和重复响应");
add(serverSource.includes("inventory_reservations") && serverSource.includes("releaseOrderInventory") && serverSource.includes("订单取消与库存释放") ? "pass" : "fail", "库存占用与可逆取消", "下单原子占用库存，安全取消时原子释放并保留库存状态证据");
add(serverSource.includes("该运单已登记") && serverSource.includes("最终验收结论") && serverSource.includes("发票已开具") ? "pass" : "fail", "重复状态拦截", "发运、验收、发票不得重复落账");
add(serverSource.includes("所有运单须经物流机构确认已送达且无异常后才能验收") && serverSource.includes("shipmentSummary") && serverSource.includes("acceptance_items") && serverSource.includes("生产验收必须按订单明细提供 accepted_items") && serverSource.includes("生产全量合格验收必须逐项覆盖全部订单明细") && text("scripts/check-shuzhi-v8530-production-outbox.mjs").includes("生产未送达禁止提前验收") && text("scripts/check-shuzhi-v8530-production-outbox.mjs").includes("生产送达后才允许验收") && text("scripts/check-shuzhi-v8530-production-outbox.mjs").includes("生产部分数量不得直接标记合格") ? "pass" : "fail", "物流与逐项验收闸门", "生产最终验收必须等待所有关联运单已送达且无异常，并按订单明细逐项覆盖；不同计量单位不得合并比较，部分到货只能走争议/冻结");
add(serverSource.includes("shipmentPaymentReady") && serverSource.includes("当前结算模型要求托管资金确认后才能登记发运") && text("scripts/check-shuzhi-v8530-production-outbox.mjs").includes("托管资金确认前禁止生产发运") ? "pass" : "fail", "资金确认发运闸门", "预付款/机构监管结算模型必须在机构确认托管资金后才能登记运单，回归脚本覆盖未确认时拒绝");
add(serverSource.includes("退款待机构受理") && serverSource.includes("普通发票暂不得开具") && text("scripts/check-shuzhi-v8530-production-outbox.mjs").includes("全额退款后禁止普通开票") ? "pass" : "fail", "退款开票冲突闸门", "退款状态下普通开票进入财务复核/红冲流程，避免退款与全额蓝票冲突");
add(serverSource.includes("发票回调金额与订单发票金额不一致") && serverSource.includes("发票金额与订单金额不一致，禁止结算") ? "pass" : "fail", "发票金额四流核对", "开票及机构回调金额必须与订单金额一致，金额不一致不得进入结算");
add(serverSource.includes("生产写请求必须提供 Idempotency-Key") ? "pass" : "fail", "生产写入门禁", "生产关键写接口强制幂等键");
add(serverSource.includes("processIntegrationWebhook") && serverSource.includes("timingSafeEqual") && serverSource.includes("integration_callbacks") && serverSource.includes("callbackStorageKey") && serverSource.includes("declaredProvider !== provider") && serverSource.includes("integrationReadyEnv") && serverSource.includes("机构联调尚未完成") ? "pass" : "fail", "第三方回调安全", "物流、支付、发票、监管回调具备路径机构绑定、独立命名空间、签名、时间窗、幂等落库与机构 ready 门禁；未启用机构不强制配置回调密钥");
add(serverSource.includes("normalizeWebhookStatus") && serverSource.includes("禁止支付回调回退状态") && serverSource.includes("禁止回调回退覆盖") && serverSource.includes("禁止发票回调覆盖账本") ? "pass" : "fail", "回调状态机", "回调状态白名单、单向迁移和已结算账本保护，防止未知或过期回调覆盖已确认事实");
add(serverSource.includes("contract_signatures") && serverSource.includes("SIGN_CONTRACT") && serverSource.includes("SHUZHI_CA_READY") ? "pass" : "fail", "合同签署落库", "买卖双方签署主体、证书引用和时间戳可审计留痕，生产必须通过 CA ready 门禁");
add(serverSource.includes("const actorFor") && serverSource.includes("reviewer=?,reviewed_at") && !serverSource.includes('reviewed_at=?,updated_at=? WHERE id=?").run(String(payload.note || "后台双人复核通过"), "local-admin"') ? "pass" : "fail", "后台操作人审计", "审核、启用、服务区域和商品审核记录真实授权主体，不使用固定 local-admin");
add(serverSource.includes("const operationActor = productionMode ? actorFor(req, \"业务运营岗\")") && serverSource.includes("run(moduleKey, rule.domain, next, rule.steps[next], evidence, operationActor") ? "pass" : "fail", "业务工作流操作人审计", "生产工作流事件使用已认证岗位主体，不信任前端传入的 actor 字段");
add(serverSource.includes("const shipmentActor = actorFor(req, \"物流履约岗\")") && serverSource.includes("const acceptanceActor = productionMode ? actorFor(req, \"采购验收岗\")") && serverSource.includes("log(actorFor(req, \"供货财务岗\"), \"ISSUE_INVOICE\"") && serverSource.includes("const signerName = productionMode ? actorFor(req, \"授权签约人\")") ? "pass" : "fail", "交易证据操作人审计", "发运、验收、开票和 CA 签署记录使用认证主体，生产不接受前端伪造经办人");
add(serverSource.includes("const allowedRoles = side === \"buyer\" ? [\"buyer\", \"agri\"] : [\"supplier\"]") && serverSource.includes("allowedRoles.includes(principal.role)") ? "pass" : "fail", "交易角色与主体隔离", "采购、供货、验收、发运和开票动作同时校验主体归属与经营角色，避免同一令牌跨边签署或操作");
add(serverSource.includes("[\"buyer\", \"agri\"].includes(principal?.role)") && serverSource.includes("role IN ('buyer','agri')") && text("scripts/check-shuzhi-v8530-demand-flow.mjs").includes("农资采购方生成正式订单") && text("scripts/check-shuzhi-v8530-demand-flow.mjs").includes("农资采购方读取自己的需求") ? "pass" : "fail", "农资采购方交易闭环", "agri 角色与普通采购商共用需求列表、报价下单和正式订单规则，不因角色分支遗漏而无法交易");
add(existsSync(resolve(root, "scripts/check-shuzhi-v8530-role-isolation.mjs")) && text("package.json").includes('"check:shuzhi-role-isolation": "node scripts/check-shuzhi-v8530-role-isolation.mjs"') && text("scripts/run-shuzhi-local-smoke.mjs").includes("check-shuzhi-v8530-role-isolation.mjs") ? "pass" : "fail", "交易角色隔离回归", "使用生产模式请求验证采购/供货令牌不能跨边发运、验收或签约");
add(serverSource.includes('if (!hasAdminPermission(req, "audit", true)) return error(res, 403, "当前管理员角色无商户审核操作权限")') && text("scripts/check-shuzhi-v8530-access.mjs").includes("运营岗不得直接准入审核") ? "pass" : "fail", "商户审核岗位分权", "运营岗不能直接审批商户准入，审核岗/超级管理员负责准入结论，运营岗负责后续启用");
add(serverSource.includes("const initialVerificationStatus = productionMode ? \"pending\" : \"verified\";") && serverSource.includes("const verificationMatch = path.match") && serverSource.includes("const merchantVerificationReady =") && serverSource.includes("COUNT(DISTINCT verification_type)") && serverSource.includes("TRIM(provider)<>''") && serverSource.includes("TRIM(evidence_ref)<>''") && serverSource.includes("verified_at IS NOT NULL") && serverSource.includes("merchantIds.some((merchantId) => !merchantVerificationReady(merchantId))") && serverSource.includes("!merchantVerificationReady(supplierId)") && serverSource.includes("!merchantVerificationReady(buyerId)") && serverSource.includes("!merchantVerificationReady(merchant.id)") && serverSource.includes("营业资质和对公账户尚未完成独立核验，不能启用商户") ? "pass" : "fail", "商户准入事实核验", "生产准入审核不伪造外部核验结论，必须由带机构、证据和核验时间的独立 license/bank 记录后才能启用");
add(serverSource.includes("settlement_records") && serverSource.includes("SETTLE_TRADE") && serverSource.includes("全量验收合格前不得结算") && text("scripts/check-shuzhi-v8530-production-outbox.mjs").includes("订单/托管/发票金额不一致") && text("scripts/check-shuzhi-v8530-production-outbox.mjs").includes("发票与订单金额不一致禁止开票") && text("scripts/check-shuzhi-v8530-production-outbox.mjs").includes("机构分账流水号跨交易复用阻断") && serverSource.includes("合同、全量验收、发票和托管金额未全部一致") && serverSource.includes("发票金额与订单金额不一致，禁止机构回调落账") && serverSource.includes("机构分账流水号已绑定其他交易") && serverSource.includes("allowedSettlementModels") && serverSource.includes("SHUZHI_PAYMENT_READY") ? "pass" : "fail", "结算对账闸门", "合同、全量验收、开票、机构回调和托管资金齐备、金额逐分一致且机构分账流水号未跨交易复用后才允许最终关账");
add(serverSource.includes("const publicTradeConfig") && serverSource.includes("amount_items: []") && serverSource.includes("amount_source: \"后台订单明细与机构回执\"") ? "pass" : "fail", "交易配置金额生产隔离", "正式公开配置不返回本地示例订单金额，金额来源明确为后台订单明细和机构回执");
add(serverSource.includes("order_delivery_constraints") && serverSource.includes("productionDeliveryConstraint") && serverSource.includes("生产订单必须提供有效的收货地经纬度") && serverSource.includes("已达到当日服务上限") && serverSource.includes("生产服务区域只能由后台商户管理岗位维护") && serverSource.includes("生产服务区域维护必须提供后台/机构验收证据引用") && text("scripts/check-shuzhi-v8530-production-outbox.mjs").includes("生产订单超服务半径阻断") && text("scripts/check-shuzhi-v8530-production-outbox.mjs").includes("生产只读岗位禁止维护服务区域") && text("scripts/check-shuzhi-v8530-production-outbox.mjs").includes("生产订单超过日单量阻断") ? "pass" : "fail", "生产服务半径订单闸门", "正式订单创建必须固化收货坐标、服务距离、日单量和证据，区域维护由后台岗位负责并绑定证据，超半径或超量不能直接成交");
add(serverSource.includes("hasAdminPermission(req, \"data\", true)") && serverSource.includes("生产工作流只能由具备数据管理写权限的后台岗位推进") && text("scripts/check-shuzhi-v8530-production-outbox.mjs").includes("生产只读岗位禁止推进业务工作流") ? "pass" : "fail", "后台工作流写权限分权", "生产业务工作流推进必须具备数据管理写权限，只读财务/审核岗位不能越权改变流程状态");
add(serverSource.includes("platform_fee_base") && serverSource.includes("platform_fee_collection_status") && serverSource.includes("orderGoodsNet") && serverSource.includes("platformFeeForOrder") && serverSource.includes("recognized_as_revenue") ? "pass" : "fail", "平台费计费与收款边界", "平台技术服务费只按商品明细净额计收；独立服务费没有合同、发票和收款回执前，不得把应收核算值当作平台已实现收入");
add(serverSource.includes("const contractOrderMatch = order.contracts.length > 0") && serverSource.includes("const invoiceGate = order.invoices.length > 0") && serverSource.includes("const paymentReady = order.payments.some") && serverSource.includes("contract_order_match: contractOrderMatch") ? "pass" : "fail", "四流汇总拒绝空集合误报", "交易账本汇总必须实际存在合同、发票和可用支付状态，不能让空数组 every() 误报为已通过");
add(apiSource.includes("Idempotency-Key") && apiSource.includes("newIdempotencyKey") && apiSource.includes("createTradeOrder") && apiSource.includes("createPurchaseDemand") && apiSource.includes("signTradeContract") && apiSource.includes("settleTrade") && apiSource.includes("getPurchaseDemands") && apiSource.includes("submitDemandQuote") && apiSource.includes("acceptDemandQuote") && apiSource.includes("quote_id?: string") ? "pass" : "fail", "前台后端接线", "订单创建、采购需求发布/报价、报价确认、合同、验收、开票、结算动作调用后台并携带幂等键及服务端金额");
add(apiSource.includes("destination_lat?: number | null") && apiSource.includes("delivery_address?: string") && apiSource.includes("delivery_lat?: number") && text("work/shuzhi-v8502-source/src/pages/trade/publish.vue").includes("chooseDestination") && text("work/shuzhi-v8502-source/src/pages/trade/supply-detail.vue").includes("chooseDeliveryLocation") && text("work/shuzhi-v8502-source/src/pages/trade/batch-workbench.vue").includes("delivery_lat: currentTx.deliveryLat") ? "pass" : "fail", "前台收货坐标接线", "正式采购需求、直接下单和批量建单都能采集收货地址与坐标，交由后台服务半径闸门复核");
add(serverProductBlock.includes("const requestedMerchantId") && serverProductBlock.includes("principal?.merchant_ids") && serverProductBlock.includes("role IN ('supplier','agri')") && publishPageSource.includes("const productionBuild") && publishPageSource.includes("...(productionBuild ? {} : { merchant_id: \"m-supplier\" })") && publishPageSource.includes("...(productionBuild ? {} : { buyer_id: \"m-buyer\" })") ? "pass" : "fail", "交易主体会话绑定", "生产商品/采购发布不依赖前端写死主体 ID，服务端按认证会话绑定主体并校验供货/采购角色");
add(apiSource.includes("const productionBuild") && (apiSource.includes('API_BASE.startsWith("https://")') || apiSource.includes('String(import.meta.env.VITE_API_BASE || "").startsWith("https://")')) && apiSource.includes('(productionBuild ? "" : LOCAL_DEMO_TOKEN)') && apiSource.includes("const authHeader") && apiSource.includes("...authHeader()") ? "pass" : "fail", "生产会话令牌边界", "正式构建或指向 HTTPS API 的联调构建无会话时不发送本地演示令牌；本地演示令牌只由联调构建脚本注入");
add(/export function advanceLocalTrade[\s\S]*?requestJson<void>/.test(apiSource) && /export function resetLocalTrade[\s\S]*?requestJson<void>/.test(apiSource) ? "pass" : "fail", "前台履约推进幂等接线", "交易履约推进与演示重置复用统一请求封装，生产写操作不会漏传幂等键");
add(adminSource.includes("requestHeaders.set(\"Idempotency-Key\"") && adminSource.includes("method === \"POST\" || method === \"PUT\" || method === \"PATCH\"") ? "pass" : "fail", "后台写操作幂等接线", "管理台审批、审核、启用和流程推进统一携带服务端幂等键，生产不会因漏传被拦截");
add(["getOperationCatalog", "advanceOperation", "resetOperation", "getPlatformFeatures", "recordPlatformEvent", "createPurchaseDemand", "createTradeOrder", "cancelTrade", "signTradeContract", "acceptTrade", "issueTradeInvoice", "settleTrade"].every((name) => apiSource.includes(name)) && ["/api/v1/operations/catalog", "operationAdvanceMatch", "platform/features", "platform/events", "path === \"/api/v1/purchase-demands\" && req.method === \"POST\"", "path === \"/api/v1/trades\" && req.method === \"POST\"", "cancelMatch", "contractSignMatch", "acceptMatch", "invoiceMatch", "settleMatch"].every((route) => serverSource.includes(route)) ? "pass" : "fail", "前台接口路由闭包", "采购需求发布、订单创建、取消、业务工作流、平台事件和交易合同—验收—开票—结算调用均有对应后端路由");
add(apiSource.includes("product-submit") ? "pass" : "fail", "商品提交幂等键", "商品上架提交不会因重复点击产生重复申请");
add(tradeIndexSource.includes("productionBuild ? [] : villageProducts") && homeSource.includes("productionBuild ? remoteProducts.value") && homeSource.includes("productionBuild ? remoteDemands.value") ? "pass" : "fail", "生产数据不回退演示", "正式构建在后台不可用或无数据时不展示内置虚构商品、需求，避免把演示内容当成真实交易");
add(tradeFlowPanelSource.includes("const productionBuild") && tradeFlowPanelSource.includes("productionBuild ? []") && tradeFlowPanelSource.includes("订单金额、服务费和平台技术服务费以后台正式订单明细及机构回执为准") && tradeFlowPanelSource.includes("v-else class=\"amount-box\"") ? "pass" : "fail", "交易金额面板生产隔离", "正式构建不展示固定订单金额和平台费示例，金额只来自后台订单明细与机构回执");
add(mockPageGuardFailures.length === 0 ? "pass" : "fail", "页面 mock 生产隔离", mockPageGuardFailures.length === 0 ? `${mockPageFiles.length} 个引用 mock 的页面均具备 productionBuild 门禁` : `缺少正式环境隔离：${mockPageGuardFailures.join(", ")}`);
add(unguardedActionPages.length === 0 ? "pass" : "fail", "前台动作门禁闭包", unguardedActionPages.length === 0 ? "业务状态变更页面均具备 productionBuild 或后台写入边界" : `存在未隔离动作：${unguardedActionPages.join(", ")}`);
const batchSource = text("work/shuzhi-v8502-source/src/pages/trade/batch-workbench.vue");
add(batchSource.includes("backendLinked") && batchSource.includes("backendMode.value === \"production\"") && batchSource.includes("生产后台未连接") && batchSource.includes("后台未放行") && batchSource.includes("await signTradeContract") && batchSource.includes("await settleTrade") && batchSource.includes("currentTx.backendOrderId || (backendMode.value === \"production\" ? \"\" : demoBackendOrderId)") && existsSync(resolve(root, "scripts/check-shuzhi-v8530-batch-gate.mjs")) ? "pass" : "fail", "批量工作台后台门禁", "批量核验关键节点必须先得到后台成功响应，生产后台不可用时不得推进本地状态，也不得回读固定演示订单");
add(batchSource.includes("const authoritativeTrade") && batchSource.includes("computed<number | null>") && batchSource.includes("正式交易清单等待后台订单快照返回；未连接后台时不展示离线样例商品、数量和价格") && batchSource.includes("productionBuild && !backendLinked.value") ? "pass" : "fail", "批量金额与清单生产隔离", "生产后台未返回权威订单时不展示离线商品、数量、价格或金额样例；本地演示模式保持原有体验");
const operationSource = text("work/shuzhi-v8502-source/src/pages/operation/index.vue");
const fulfillmentSource = text("work/shuzhi-v8502-source/src/pages/trade/fulfillment.vue");
const loanLifeSource = text("work/shuzhi-v8502-source/src/pages/finance/loanlife.vue");
add(operationSource.includes("productionBuild && !backendOnline.value") && operationSource.includes("if (productionBuild) return productionBlocked()") && operationSource.includes("正式环境需后台授权岗位") ? "pass" : "fail", "运营中心断联门禁", "正式环境后台断联时不回退本地工作流，重置和推进均需后台授权岗位");
add(fulfillmentSource.includes("if (productionBuild) return productionBlocked(\"履约节点推进\")") && fulfillmentSource.includes("productionBuild && !sync") ? "pass" : "fail", "履约节点断联门禁", "正式订单才允许提交后台验收，非正式订单不会在前台伪造履约或验收成功");
add(loanLifeSource.includes("v-if=\"productionBuild\" class=\"production-empty\"") && loanLifeSource.includes("暂无后台贷款档案") ? "pass" : "fail", "金融样例隔离", "正式环境不展示本地授信/放款样例，必须等待银行或持牌机构回执");
const settlementPageSource = text("work/shuzhi-v8502-source/src/pages/finance/settle.vue");
add(settlementPageSource.includes("v-if=\"productionBuild\" class=\"production-empty\"") && settlementPageSource.includes("暂无后台结算流水") && settlementPageSource.includes("<template v-else>") ? "pass" : "fail", "结算演示隔离", "正式环境不展示固定演示订单、账户或资金台账，真实结算只读后台与持牌机构回执");
const agricultureSettlementSource = text("work/shuzhi-v8502-source/src/pages/agri/settle.vue");
const agriDetailSource = text("work/shuzhi-v8502-source/src/pages/agri/detail.vue");
const financeApplySource = text("work/shuzhi-v8502-source/src/pages/finance/apply.vue");
const agriMachineSource = text("work/shuzhi-v8502-source/src/pages/agri/machine.vue");
const machineryMerchantSource = text("work/shuzhi-v8502-source/src/pages/agri/machinery-merchant.vue");
const logisticsCapacitySource = text("work/shuzhi-v8502-source/src/pages/logistics/capacity.vue");
const assistSource = text("work/shuzhi-v8502-source/src/pages/trade/assist.vue");
const tradeControlSource = text("work/shuzhi-v8502-source/src/pages/trade/control.vue");
const aftersaleTicketSource = text("work/shuzhi-v8502-source/src/pages/aftersale/ticket.vue");
const aiMatchSource = text("work/shuzhi-v8502-source/src/pages/ai/match.vue");
const certIndexSource = text("work/shuzhi-v8502-source/src/pages/cert/index.vue");
const crossborderImportSource = text("work/shuzhi-v8502-source/src/pages/crossborder/import.vue");
const digitalfarmProjectSource = text("work/shuzhi-v8502-source/src/pages/digitalfarm/project.vue");
const payIndexSource = text("work/shuzhi-v8502-source/src/pages/pay/index.vue");
const stationHubSource = text("work/shuzhi-v8502-source/src/pages/station/hub.vue");
const villageCareSource = text("work/shuzhi-v8502-source/src/pages/village/care.vue");
const premiumSource = text("work/shuzhi-v8502-source/src/pages/cert/premium.vue");
const priceSource = text("work/shuzhi-v8502-source/src/pages/home/price.vue");
const paymentResultSource = text("work/shuzhi-v8502-source/src/pages/pay/result.vue");
const adminCenterSource = text("work/shuzhi-v8502-source/src/pages/admin/index.vue");
const adminDashboardSource = text("work/shuzhi-v8502-source/src/pages/admin/dashboard.vue");
const adminRegionSource = text("work/shuzhi-v8502-source/src/pages/admin/region.vue");
const adminPermissionSource = text("work/shuzhi-v8502-source/src/pages/admin/permission.vue");
const didSource = text("work/shuzhi-v8502-source/src/pages/mine/did.vue");
add(agricultureSettlementSource.includes("v-if=\"productionBuild\" class=\"production-empty\"") && agricultureSettlementSource.includes("暂无后台履约结算档案") && agricultureSettlementSource.includes("<template v-else>") ? "pass" : "fail", "订单农业结算演示隔离", "正式环境不展示固定合同、价格、理赔或农户收益，必须读取后台履约和机构回执");
add(agriDetailSource.includes("v-if=\"productionBuild\" class=\"production-empty\"") && agriDetailSource.includes("暂无后台农资商品档案") && agriDetailSource.includes("<template v-else>") && agriDetailSource.includes("不会根据 URL 参数生成订单") ? "pass" : "fail", "农资详情演示隔离", "正式环境不展示深链带入的静态农资名称、价格、库存或资质，农资下单只能使用后台审核 SKU");
add(financeApplySource.includes("v-if=\"productionBuild\" class=\"production-empty\"") && financeApplySource.includes("暂无后台融资档案") && financeApplySource.includes("<block v-else>") && financeApplySource.includes("不展示本地订单号、金额或利率") ? "pass" : "fail", "融资申请演示隔离", "正式环境不展示固定主办行、订单金额或利率，融资申请必须等待后台和持牌机构档案");
add(agriMachineSource.includes("v-if=\"productionBuild\" class=\"production-empty\"") && agriMachineSource.includes("暂无后台农机调度档案") && agriMachineSource.includes("<template v-else>") ? "pass" : "fail", "农机调度演示隔离", "正式环境不展示静态机手、价格、作业单或收入，调度必须读取后台人机任务快照");
add(machineryMerchantSource.includes("v-if=\"productionBuild\" class=\"production-empty\"") && machineryMerchantSource.includes("暂无后台机具资产档案") && machineryMerchantSource.includes("<template v-else>") ? "pass" : "fail", "机具资产演示隔离", "正式环境不展示静态机具库存、价格、序列号或订单，资产台账必须读取后台核验结果");
add(logisticsCapacitySource.includes("v-if=\"productionBuild\" class=\"production-empty\"") && logisticsCapacitySource.includes("暂无后台运力竞价档案") && logisticsCapacitySource.includes("<template v-else>") ? "pass" : "fail", "运力竞价演示隔离", "正式环境不展示静态线路、预算或报价，物流竞价必须读取后台承运主体和机构结果");
add(assistSource.includes("v-if=\"productionBuild\" class=\"production-empty\"") && assistSource.includes("暂无后台消费帮扶档案") && assistSource.includes("<template v-else>") ? "pass" : "fail", "消费帮扶演示隔离", "正式环境不展示静态帮扶县、采购金额或成效，帮扶数据必须读取后台合同和结算回执");
add(tradeControlSource.includes("v-if=\"productionBuild\" class=\"production-empty\"") && tradeControlSource.includes("暂无后台交易总控档案") && tradeControlSource.includes("<template v-else>") ? "pass" : "fail", "交易总控演示隔离", "正式环境不展示静态身份、资金状态或订单金额，交易总控必须读取后台真实节点和机构回执");
add([aftersaleTicketSource, aiMatchSource, certIndexSource, crossborderImportSource, digitalfarmProjectSource, stationHubSource, villageCareSource].every((source) => source.includes("v-if=\"productionBuild\" class=\"production-empty\"") && source.includes("<template v-else>") && source.includes("production-empty-text")) ? "pass" : "fail", "其他业务深链演示隔离", "售后、撮合、认证、跨境、种养项目、服务站和民生关怀生产不展示静态主体、金额、证书或工单样例");
const disputeSource = text("work/shuzhi-v8502-source/src/pages/aftersale/dispute.vue");
const brandSource = text("work/shuzhi-v8502-source/src/pages/agri/brand.vue");
const trustSource = text("work/shuzhi-v8502-source/src/pages/agri/trust.vue");
const fourflowSource = text("work/shuzhi-v8502-source/src/pages/finance/fourflow.vue");
const contractsSource = text("work/shuzhi-v8502-source/src/pages/trade/contracts.vue");
const fulfillmentPageSource = text("work/shuzhi-v8502-source/src/pages/trade/fulfillment.vue");
add([disputeSource, brandSource, trustSource, fourflowSource].every((source) => source.includes("v-if=\"productionBuild\" class=\"production-empty\"") && source.includes("<template v-else>") && source.includes("production-empty-text")) && operationSource.includes("productionBuild && !backendOnline") && contractsSource.includes("backendReady") && contractsSource.includes("productionBuild && !backendReady") && fulfillmentPageSource.includes("backendReady") && fulfillmentPageSource.includes("productionBuild && !backendReady") ? "pass" : "fail", "剩余页面生产事实隔离", "争议、品牌、托管、四流、运营、合同和履约页面在生产只读后台真实档案，未接通时不展示本地金额、主体、库存或签署样例");
const traceDetailSource = text("work/shuzhi-v8502-source/src/pages/trace/detail.vue");
const futuresSource = text("work/shuzhi-v8502-source/src/pages/agri/futures.vue");
const emergencyApplySource = text("work/shuzhi-v8502-source/src/pages/emergency/apply.vue");
const emergencyTaskSource = text("work/shuzhi-v8502-source/src/pages/emergency/task.vue");
const emergencySubsidySource = text("work/shuzhi-v8502-source/src/pages/emergency/subsidy.vue");
const agriContractSource = text("work/shuzhi-v8502-source/src/pages/agri/contract.vue");
const traceFullchainSource = text("work/shuzhi-v8502-source/src/pages/trace/fullchain.vue");
const preseasonSource = text("work/shuzhi-v8502-source/src/pages/agri/preseason.vue");
const digitalfarmIndexSource = text("work/shuzhi-v8502-source/src/pages/digitalfarm/index.vue");
const agriPrimarySource = text("work/shuzhi-v8502-source/src/pages/agri/primary.vue");
const agriRecycleSource = text("work/shuzhi-v8502-source/src/pages/agri/recycle.vue");
const crossborderExportSource = text("work/shuzhi-v8502-source/src/pages/crossborder/export.vue");
const chatSource = text("work/shuzhi-v8502-source/src/pages/trade/chat.vue");
const emergencyHomeSource = text("work/shuzhi-v8502-source/src/pages/home/emergency.vue");
const dividendSource = text("work/shuzhi-v8502-source/src/pages/finance/dividend.vue");
const factoringSource = text("work/shuzhi-v8502-source/src/pages/finance/factoring.vue");
const groupbuySource = text("work/shuzhi-v8502-source/src/pages/village/groupbuy.vue");
const newlyIsolatedSources = [traceDetailSource, futuresSource, emergencyApplySource, emergencyTaskSource, emergencySubsidySource, agriContractSource, traceFullchainSource, preseasonSource, digitalfarmIndexSource, agriPrimarySource, agriRecycleSource, crossborderExportSource, chatSource, emergencyHomeSource, dividendSource, factoringSource, groupbuySource];
add(newlyIsolatedSources.every((source) => source.includes("productionBuild") && source.includes("class=\"production-empty\"") && source.includes("<template v-else>") && source.includes("production-empty-text")) ? "pass" : "fail", "业务样例生产隔离扩展", "溯源、期货、应急、订单农业、农事、跨境、交易会话、收益、保理和社区团购正式环境不展示本地样例");
add(payIndexSource.includes("const backendOrderReady") && payIndexSource.includes("await getTrade(orderNo)") && payIndexSource.includes("正式订单支付") && payIndexSource.includes("不展示 URL 金额") && payIndexSource.includes("v-if=\"productionBuild && !backendOrderReady\"") ? "pass" : "fail", "生产支付订单事实来源", "支付页生产只接受后台正式订单金额和订单号，未取得后台回执时不展示 URL 参数或发起扣款");
add(premiumSource.includes("v-if=\"productionBuild\" class=\"production-empty\"") && premiumSource.includes("暂无后台信用收益档案") && premiumSource.includes("<template v-else>") ? "pass" : "fail", "信用收益演示隔离", "正式环境不展示固定商户评分、收购价或收益对比，必须读取后台风控和认证回执");
add(priceSource.includes("v-if=\"productionBuild\" class=\"production-empty\"") && priceSource.includes("暂无实时行情接口") && priceSource.includes("<template v-else>") ? "pass" : "fail", "行情样例隔离", "正式环境不展示过期静态行情，也不据此生成采购或报价");
add(paymentResultSource.includes("const productionBuild") && paymentResultSource.includes("支付结果待后台回执") && paymentResultSource.includes("正式环境不会根据页面参数") && paymentResultSource.includes("<template v-else>") ? "pass" : "fail", "支付结果参数防伪", "正式环境不信任 URL 的 ok、amount 或 trade 参数，支付成功只能来自后台和持牌机构回执");
add(adminCenterSource.includes("v-if=\"productionBuild\" class=\"production-empty\"") && adminCenterSource.includes("请从独立后台管理台操作") && adminCenterSource.includes("<template v-else>") ? "pass" : "fail", "移动管理中心演示隔离", "正式环境不展示本地管理员角色、待办和权限矩阵，管理操作回到独立后台");
add(adminDashboardSource.includes("v-if=\"productionBuild\" class=\"production-empty\"") && adminDashboardSource.includes("暂无后台运营看板数据") && adminDashboardSource.includes("<template v-else>") ? "pass" : "fail", "管理看板演示隔离", "正式环境不展示静态交易额、贷款余额、风险告警或区域排行");
add(adminRegionSource.includes("v-if=\"productionBuild\" class=\"production-empty\"") && adminRegionSource.includes("暂无后台区域档案") && adminRegionSource.includes("<template v-else>") ? "pass" : "fail", "区域管理演示隔离", "正式环境不展示静态区域、管理员或服务半径");
add(adminPermissionSource.includes("v-if=\"productionBuild\" class=\"production-empty\"") && adminPermissionSource.includes("暂无后台权限档案") && adminPermissionSource.includes("<template v-else>") ? "pass" : "fail", "权限档案演示隔离", "正式环境不展示静态管理员账号和权限矩阵");
add(didSource.includes("const productionBuild") && didSource.includes("暂无后台 DID 身份档案") && didSource.includes("did = productionBuild ? \"\"") && didSource.includes("<template v-else>") ? "pass" : "fail", "DID 凭证演示隔离", "正式环境不展示静态 DID、证照或信用凭证，身份事实只读后台及认证机构回执");
add(serverSource.includes("/api/v1/purchase-demands") && serverSource.includes("demand_quotes") && serverSource.includes("已确认采购报价必须以供货方响应场景生成订单") && serverSource.includes("同一采购需求只能确认一家供货方报价") && serverSource.includes("该采购需求已关闭，不能再确认报价") && batchSource.includes("submitSupplierQuotes") && batchSource.includes("采购方尚未确认全部报价") ? "pass" : "fail", "采购大厅报价闭环", "采购需求、供货报价、单一授标、采购确认和 quote_id 正式订单均绑定真实主体、审核商品与库存，未确认不得进入合同支付");
add(existsSync(resolve(root, "scripts/check-shuzhi-v8530-demand-flow.mjs")) && text("package.json").includes("check:shuzhi-demand-flow") ? "pass" : "fail", "报价闭环回归资产", "采购大厅匿名拦截、主体隔离、报价幂等、采购确认、越权阻断和 quote_id 建单均有独立自动化回归");
add(batchSource.includes("backendOrderAmount.value ?? displayTotalAmount.value") ? "pass" : "fail", "生产开票金额接线", "前台开票使用后台订单金额，服务端再次校验，避免生产模式缺少 amount");
const orderListSource = text("work/shuzhi-v8502-source/src/pages/trade/orders.vue");
const orderDetailSource = text("work/shuzhi-v8502-source/src/pages/trade/order-detail.vue");
add(orderListSource.includes("getTrades") && orderListSource.includes("已同步") && orderDetailSource.includes("syncBackendOrder") && orderDetailSource.includes("backendSync") ? "pass" : "fail", "我的订单后台同步", "订单列表和详情以后台订单状态为主，离线时明确降级为演示数据");
const supplyDetailSource = text("work/shuzhi-v8502-source/src/pages/trade/supply-detail.vue");
const demandDetailSource = text("work/shuzhi-v8502-source/src/pages/trade/demand-detail.vue");
const shopSource = text("work/shuzhi-v8502-source/src/pages/trade/shop.vue");
const hasProductionEmptyState = (source) => source.includes("productionBuild") && (source.includes("暂不可用") || source.includes("暂无"));
add(hasProductionEmptyState(supplyDetailSource) && hasProductionEmptyState(demandDetailSource) && hasProductionEmptyState(shopSource) && supplyDetailSource.includes("getProducts") && demandDetailSource.includes("getPurchaseDemands") && shopSource.includes("getProducts") && supplyDetailSource.includes("createTradeOrder") && demandDetailSource.includes("createTradeOrder") && orderDetailSource.includes("ready.value = true") ? "pass" : "fail", "交易详情生产数据隔离", "供货/采购详情、商户店铺和订单详情生产只读后台，未连接或无权时不展示内置样例；供货详情下单先创建后台正式订单");
const financeIndexSource = text("work/shuzhi-v8502-source/src/pages/finance/index.vue");
const financeCreditSource = text("work/shuzhi-v8502-source/src/pages/finance/credit.vue");
const logisticsIndexSource = text("work/shuzhi-v8502-source/src/pages/logistics/index.vue");
const logisticsWaybillSource = text("work/shuzhi-v8502-source/src/pages/logistics/waybill.vue");
const agriIndexSource = text("work/shuzhi-v8502-source/src/pages/agri/index.vue");
const agriInputsSource = text("work/shuzhi-v8502-source/src/pages/agri/inputs.vue");
add([financeIndexSource, financeCreditSource, logisticsIndexSource, logisticsWaybillSource, agriIndexSource, agriInputsSource].every((source) => source.includes("productionBuild")) && financeIndexSource.includes("!productionBuild") && financeCreditSource.includes("后台评定") && logisticsIndexSource.includes("不展示内置运单") && logisticsWaybillSource.includes("不使用内置演示运单") && agriIndexSource.includes("不展示内置农资商品") && agriInputsSource.includes("不展示内置拼团") ? "pass" : "fail", "生产信息模块防演示回退", "金融、信用、物流、农资生产构建不展示内置样例，真实数据须经后台或持牌机构返回");
add(paySource.includes("productionBuild") && paySource.includes("正式构建禁止模拟成功") && paySource.includes("未执行扣款") ? "pass" : "fail", "生产支付防模拟成功", "正式构建不得把本地定时器成功当作真实支付，未完成机构联调时必须明确阻断扣款");
add(productionActionSources.every((source) => source.includes("productionBuild") && source.includes("正式环境")) ? "pass" : "fail", "生产动作防模拟成功", "交易、结算、农业、仓储、应急、民生、隐私和权限动作在未接入后台或机构时不得伪造成功");
const mineSource = text("work/shuzhi-v8502-source/src/pages/mine/index.vue");
const walletSource = text("work/shuzhi-v8502-source/src/pages/mine/wallet.vue");
const invoiceSource = text("work/shuzhi-v8502-source/src/pages/mine/invoice.vue");
const securitySource = text("work/shuzhi-v8502-source/src/pages/mine/security.vue");
add([mineSource, walletSource, invoiceSource, securitySource].every((source) => source.includes("productionBuild")) && walletSource.includes("暂无后台资金流水") && invoiceSource.includes("暂无后台发票记录") && securitySource.includes("暂无后台设备会话") ? "pass" : "fail", "我的模块生产数据隔离", "我的首页、钱包、发票和安全页不展示内置余额、流水、发票或设备样例");
const settlementRegression = text("scripts/check-shuzhi-v8530-settlement.mjs");
add(existsSync(resolve(root, "scripts/check-shuzhi-v8530-access.mjs")) && existsSync(resolve(root, "scripts/check-shuzhi-v8530-webhooks.mjs")) && existsSync(resolve(root, "scripts/check-shuzhi-v8530-settlement.mjs")) && settlementRegression.includes("演示交易状态重置") && serverSource.includes("DELETE FROM settlement_records WHERE order_id=?") && serverSource.includes("DELETE FROM request_idempotency WHERE path LIKE ?") ? "pass" : "fail", "异常请求回归", "大请求、非法 JSON、重复写入与状态冲突、第三方回调和可重复结算流程自动检查");
add(serverSource.includes("https://example.invalid") ? "warn" : "pass", "演示占位媒体", "正式商品不得包含 example.invalid 地址");
const backupSource = text("scripts/backup-shuzhi-local.mjs");
add(existsSync(resolve(root, "scripts/backup-shuzhi-local.mjs")) && existsSync(resolve(root, "scripts/verify-shuzhi-backup.mjs")) && backupSource.includes("temporaryBackupPath") && backupSource.includes("renameSync(temporaryBackupPath, backupPath)") && backupSource.includes("保留毫秒") && text("scripts/check-shuzhi-production-bootstrap.mjs").includes("sqlite3") ? "pass" : "fail", "备份恢复工具", "sqlite3 依赖有启动前检查，临时文件完整性校验后原子发布、SHA-256 与 integrity_check");
add(existsSync(resolve(root, "scripts/check-shuzhi-v8530-backup-restore.mjs")) ? "pass" : "fail", "恢复演练工具", "可将最新备份恢复到临时 SQLite 库并读取关键业务表");
const deployFiles = ["deploy/README.md", "deploy/shuzhi-v8530.env.example", "deploy/shuzhi-v8530.service", "deploy/shuzhi-v8530-institution-worker.service", "deploy/shuzhi-v8530-backup.service", "deploy/shuzhi-v8530-backup.timer", "deploy/nginx-shuzhi-v8530.conf", "deploy/nginx-shuzhi-api-v8530.conf.example", "deploy/shuzhi-v8533-capability-activation.json", "docs/数智供社-v8530-上线执行清单.md", "docs/数智供社-v8530-外部联调验收表.md", "docs/openapi/数智供社-v8533-机构适配协议-v1.openapi.json", "institution-adapters/shared/client.mjs", "institution-adapters/shared/outbox.mjs", "institution-adapters/shared/worker.mjs", "scripts/run-shuzhi-institution-worker.mjs", "scripts/create-shuzhi-production-env.mjs", "scripts/check-shuzhi-production-bootstrap.mjs", "scripts/check-shuzhi-production-activation.mjs", "scripts/check-shuzhi-institution-contract.mjs", "scripts/check-shuzhi-institution-client.mjs", "scripts/check-shuzhi-institution-outbox.mjs", "scripts/check-shuzhi-v8530-production-outbox.mjs"];
const releaseChecklist = text("docs/数智供社-v8530-上线执行清单.md");
add(deployFiles.every((file) => existsSync(resolve(root, file))) && existsSync(resolve(root, "scripts/build-shuzhi-pages-site.mjs")) && text("deploy/README.md").includes("旧的 `v8514`—`v8529` 配置文件仅为历史归档") && releaseChecklist.includes("npm run build:h5:production") ? "pass" : "fail", "部署资产", "当前 v8530 生产模板、API-only Nginx、密钥初始化工具、Pages 构建器和生产 H5 构建命令齐备");
const serviceTemplate = text("deploy/shuzhi-v8530.service");
const workerServiceTemplate = text("deploy/shuzhi-v8530-institution-worker.service");
const backupServiceTemplate = text("deploy/shuzhi-v8530-backup.service");
const backupTimerTemplate = text("deploy/shuzhi-v8530-backup.timer");
add(serviceTemplate.includes("ExecStartPre=/usr/bin/node /opt/shuzhi-v8530/scripts/check-shuzhi-production-bootstrap.mjs") && workerServiceTemplate.includes("ExecStartPre=/usr/bin/node /opt/shuzhi-v8530/scripts/check-shuzhi-production-bootstrap.mjs") && backupServiceTemplate.includes("ExecStartPre=/usr/bin/node /opt/shuzhi-v8530/scripts/check-shuzhi-production-bootstrap.mjs") && serviceTemplate.includes("ProtectSystem=strict") && workerServiceTemplate.includes("ProtectSystem=strict") && serviceTemplate.includes("RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6") && backupServiceTemplate.includes("backup-shuzhi-local.mjs") && backupServiceTemplate.includes("ProtectSystem=strict") && backupTimerTemplate.includes("Persistent=true") && backupTimerTemplate.includes("RandomizedDelaySec=15m") && existsSync(resolve(root, "scripts/check-shuzhi-production-bootstrap.mjs")) ? "pass" : "fail", "服务启动与隔离", "API、Outbox worker 和每日备份均使用受限 systemd 服务；启动门禁、最小权限、备份持久化和随机错峰已纳入部署资产");
const envTemplate = text("deploy/shuzhi-v8530.env.example");
add(envTemplate.includes("SHUZHI_RUNTIME_MODE=production") && envTemplate.includes("SHUZHI_PLATFORM_VERSION=v8533") && envTemplate.includes("SHUZHI_RELEASE_VERSION=v8530") && !envTemplate.includes("VITE_API_TOKEN=") && !envTemplate.includes("VITE_ADMIN_TOKEN=") ? "pass" : "fail", "版本与密钥分离", "生产模板显式区分平台 v8533 与 API v8530，且未提供构建期前端令牌");
add(envTemplate.includes("VITE_API_BASE=https://CHANGE_ME_DOMAIN") && !envTemplate.includes("VITE_API_BASE=https://CHANGE_ME_DOMAIN/api") && apiSource.includes("${API_BASE}/api/v1") ? "pass" : "fail", "生产 API 根地址", "环境模板只填写 HTTPS API 域名根地址，前端统一拼接 /api/v1，避免形成 /api/api/v1");
add(existsSync(resolve(root, "scripts/check-shuzhi-production-env.mjs")) && text("package.json").includes('"check:shuzhi-production-env": "node scripts/check-shuzhi-production-env.mjs"') ? "pass" : "fail", "受限配置文件检查器", "正式启动前可检查 env 文件权限、占位值、HTTPS 地址、秘密不复用和数据库路径，且不输出秘密");
const activationCatalog = JSON.parse(text("deploy/shuzhi-v8533-capability-activation.json"));
const activationKeys = new Set(activationCatalog.capabilities.map((item) => item.key));
add(text("package.json").includes('"check:shuzhi-activation": "node scripts/check-shuzhi-production-activation.mjs"') && ["HTTPS_API", "DATABASE", "WECHAT_AUTH", "CA_SIGNATURE", "ESCROW_PAYMENT", "LOGISTICS_CALLBACK", "INVOICE_VERIFICATION", "REGULATOR_SYNC"].every((key) => activationKeys.has(key)) ? "pass" : "fail", "生产能力逐项开通诊断", "HTTPS、数据库、微信和五类机构能力分别展示配置、适配器与验收证据状态，且不会自动修改 READY 开关");
const institutionContract = JSON.parse(text("docs/openapi/数智供社-v8533-机构适配协议-v1.openapi.json"));
add(institutionContract.openapi === "3.1.0" && Object.keys(institutionContract.paths || {}).filter((path) => path.startsWith("/adapter/v1/")).length === 5 && text("package.json").includes('"check:shuzhi-institution-contract": "node scripts/check-shuzhi-institution-contract.mjs"') ? "pass" : "fail", "五类机构统一适配协议", "CA、支付、物流、发票、监管的出站 Command 与入站 Callback 使用独立 DTO、双向签名和幂等键");
const institutionClient = text("institution-adapters/shared/client.mjs");
add(institutionClient.includes("PROVIDER_COMMAND_PATHS") && institutionClient.includes("validateProviderCommand") && institutionClient.includes('redirect: "error"') && institutionClient.includes('createHmac("sha256"') && institutionClient.includes("AbortController") && serverSource.includes('action: "create_escrow"') && text("package.json").includes('"check:shuzhi-institution-client": "node scripts/check-shuzhi-institution-client.mjs"') ? "pass" : "fail", "五类机构安全出站客户端", "统一强制 HTTPS、独立 HMAC 签名、幂等键、超时、禁止重定向、支付托管动作统一为 create_escrow，并在发出前校验五类机构 DTO");
const institutionWorker = text("scripts/run-shuzhi-institution-worker.mjs");
add(institutionWorker.includes("readyKey") && institutionWorker.includes("if (String(process.env[readyKey] || \"\") !== \"true\") continue") && institutionWorker.includes("没有已 ready 的机构适配器") ? "pass" : "fail", "机构 worker 分阶段加载", "Outbox worker 只加载已 ready 的机构适配器；未开通的机构不要求凭证，至少一类机构 ready 后才启动");
const institutionOutbox = text("institution-adapters/shared/outbox.mjs");
add(institutionOutbox.includes("CREATE TABLE IF NOT EXISTS institution_outbox") && institutionOutbox.includes("BEGIN IMMEDIATE") && institutionOutbox.includes("LEASE_EXPIRED") && institutionOutbox.includes("IDEMPOTENCY_CONFLICT") && serverSource.includes("institutionOutboxOverview(db)") && text("package.json").includes('"check:shuzhi-institution-outbox": "node scripts/check-shuzhi-institution-outbox.mjs"') ? "pass" : "fail", "机构指令事务性 Outbox", "业务事务可持久化指令，支持并发领取、崩溃租约回收、指数退避、死信和人工重放");
add(serverSource.includes("QUEUE_CA_SIGNATURE") && serverSource.includes("QUEUE_INVOICE_ISSUE") && serverSource.includes("QUEUE_LOGISTICS_SHIPMENT") && serverSource.includes("QUEUE_PAYMENT_RELEASE") && serverSource.includes("QUEUE_PAYMENT_CREATE") && serverSource.includes("/pay") && text("package.json").includes('"check:shuzhi-production-outbox": "node scripts/check-shuzhi-v8530-production-outbox.mjs"') ? "pass" : "fail", "生产机构写操作异步边界", "生产 CA、托管入金、物流、发票和分账只入 Outbox，最终状态由机构回调确认");
add(serverSource.includes("CREATE TABLE IF NOT EXISTS regulatory_submissions") && serverSource.includes("regulatorySubmissionMatch") && serverSource.includes("QUEUE_REGULATORY_SUBMISSION") && serverSource.includes("监管提交已完成，禁止回调覆盖回执证据") && serverSource.includes("监管提交已撤回，禁止回调重新打开") && serverSource.includes("生产监管提交暂不支持未建模") && serverSource.includes("商品所属供货主体尚未完成资质与对公账户核验") && serverSource.includes("运单关联交易主体尚未完成资质与对公账户核验") && text("docs/openapi/数智供社-v8533-机构适配协议-v1.openapi.json").includes('"/adapter/v1/regulatory/submissions"') ? "pass" : "fail", "监管提交回执闭环", "监管/检测数据按最小化版本和证据引用提交，绑定真实业务对象和已核验主体后进入 Outbox，并由验签回执推进状态");
add(serverSource.includes("CREATE TABLE IF NOT EXISTS merchant_identity") && serverSource.includes("status='verified'") && serverSource.includes("统一社会信用代码与后台备案主体不一致") && serverSource.includes("merchantVerificationReady") ? "pass" : "fail", "机构主体身份绑定", "生产 CA、支付、物流和发票指令必须使用后台备案且已核验主体的统一社会信用代码");
add(serverSource.includes("consignor_address TEXT NOT NULL DEFAULT ''") && serverSource.includes("生产物流指令必须提供不超过 300 字的收发货地址快照") && serverSource.includes("consignee_address: consigneeAddress") ? "pass" : "fail", "物流地址快照", "生产运单将收发货地址作为订单履约证据快照写入后台并随机构指令发送");
add(serverSource.includes("tax_category_code TEXT NOT NULL DEFAULT ''") && serverSource.includes("生产开票指令必须提供购销双方统一社会信用代码、税率、发票类型和税收分类编码") && serverSource.includes("const serviceFee =") ? "pass" : "fail", "发票税务事实", "生产发票固化税率、发票类型、税收分类编码和购销主体，并校验商品明细与应开金额边界");
add(serverSource.includes("provider_transaction_id") && serverSource.includes("生产支付回调必须提供 payment_id") && serverSource.includes("duplicateTransaction") && serverSource.includes("duplicateInvoice") && serverSource.includes("duplicateTracking") && serverSource.includes("物流回调温度必须在 -80℃ 至 80℃之间") ? "pass" : "fail", "机构凭证冲突防重", "支付尝试必须绑定 payment_id；机构交易号、发票号码和物流运单号绑定单一交易，并拦截异常温度回调");
add(serverSource.includes("const moneyCents") && serverSource.includes("必须精确到人民币分") && serverSource.includes("moneyCents(goodsNet") && serverSource.includes("moneyCents(payload.amount") ? "pass" : "fail", "生产金额精度门禁", "商品、订单、支付回调、发票回调和结算金额统一按人民币分校验，禁止半分金额进入生产链路");
add(serverSource.includes("CREATE TABLE IF NOT EXISTS payment_refunds") && serverSource.includes("/refund") && serverSource.includes("QUEUE_PAYMENT_REFUND") && serverSource.includes("累计退款金额不得超过原支付金额") && serverSource.includes("部分退款") && serverSource.includes("action === \"refund\"") && serverSource.includes("action 不在允许范围") && serverSource.includes("分账机构未确认成功") && serverSource.includes("退款机构已确认") ? "pass" : "fail", "生产退款出站闭环", "退款请求独立落库并进入支付 Outbox，累计退款不得超过原支付，部分退款与全额退款分别落账，未知动作与分账失败不覆盖入金账本，必须由机构退款回调确认；已分账交易不允许直接退款");
add(text("work/shuzhi-v8502-source/src/services/localApi.ts").includes("createEscrowPayment") && text("work/shuzhi-v8502-source/src/pages/pay/index.vue").includes("submitProductionEscrow") ? "pass" : "fail", "前台托管入金接线", "采购付款页在生产环境调用后台托管入金接口，202 受理只显示待机构确认，不冒充支付成功");
add(serverSource.includes('!["admin", "demo"].includes(principal.type)') && serverSource.includes("row.request_hash !== requestHash(payload)") && text("scripts/check-shuzhi-v8530-access.mjs").includes("后台匿名与伪造角色拦截") && text("scripts/check-shuzhi-v8530-access.mjs").includes("幂等键绑定请求内容") ? "pass" : "fail", "后台认证与请求幂等加固", "后台岗位权限必须先通过身份认证；幂等键绑定规范化请求体哈希，禁止换金额或动作复用旧键");
add(existsSync(resolve(root, "scripts/check-secret-hygiene.mjs")) && text(".github/workflows/pages.yml").includes("node scripts/check-secret-hygiene.mjs") ? "pass" : "fail", "发布凭据泄露门禁", "Pages 发布前拒绝受版本控制的真实环境文件、私钥和高置信度访问令牌，报告不显示密钥值");
add(existsSync(resolve(root, "scripts/check-shuzhi-public-pages.mjs")) && text("package.json").includes('"check:shuzhi-public": "node scripts/check-shuzhi-public-pages.mjs"') ? "pass" : "fail", "公网版本回验器", "发布后可核对根入口、兼容入口、后台入口、版本号、历史品牌隔离和资源闭包");
add(text("scripts/verify-production-deployment.mjs").includes("docs/releases/数智供社-v8533-生产部署回验证据.json") && !text("scripts/verify-production-deployment.mjs").includes("docs/releases/供享村社-v8533-生产部署回验证据.json") ? "pass" : "fail", "生产证据品牌隔离", "公网回验默认证据路径只使用数智供社，不把历史项目名带入正式运维记录");
const nginxTemplate = text("deploy/nginx-shuzhi-v8530.conf");
const apiNginxTemplate = text("deploy/nginx-shuzhi-api-v8530.conf.example");
add(nginxTemplate.includes("location = /health/ready") && nginxTemplate.includes("proxy_pass http://127.0.0.1:8787/health/ready") && apiNginxTemplate.includes("location = /health/live") && apiNginxTemplate.includes("location = /health/ready") && apiNginxTemplate.includes("return 404") && text("package.json").includes('"render:shuzhi-nginx"') ? "pass" : "fail", "反向代理就绪探针", "组合部署和 EdgeOne + 独立 API 部署模板均转发健康探针，API 域名根路径不误返回前台");
add(existsSync(resolve(root, "scripts/check-shuzhi-v8530-production-startup.mjs")) && serverSource.includes("生产模式 SHUZHI_ALLOWED_ORIGIN 必须是无凭证、无路径、无查询参数的 HTTPS 根来源") && serverSource.includes("已 ready 的") && text("scripts/check-shuzhi-v8530-production-startup.mjs").includes("不安全 CORS 来源拒绝启动") && text("scripts/check-shuzhi-v8530-production-startup.mjs").includes("READY 机构缺少 HTTPS 适配器拒绝启动") && text("scripts/check-shuzhi-v8530-production-startup.mjs").includes("缺失资质证据拒绝启动") ? "pass" : "fail", "生产启动烟测", "安全配置启动、数据库就绪、主体资质证据、弱令牌、CORS 和 READY 机构适配器地址均有自动化检查");
add(serverSource.includes("!wechatAuthReady") && text("scripts/check-shuzhi-v8530-production-startup.mjs").includes("微信认证 ready 可免长期用户令牌") ? "pass" : "fail", "会话令牌最小化", "微信认证 ready 后不强制保留长期静态用户令牌，未 ready 时仍保留受控联调门禁");
add(existsSync(resolve(root, "scripts/run-shuzhi-local-smoke.mjs")) && text("package.json").includes('"smoke:shuzhi-local": "node scripts/run-shuzhi-local-smoke.mjs"') ? "pass" : "fail", "本地烟测自启动", "烟测自动启动临时 API 并在结束后清理，避免依赖手动开启终端");
add(existsSync(resolve(root, "scripts/check-shuzhi-v8530-production-settlement.mjs")) ? "pass" : "fail", "生产计费基数门禁", "生产订单缺少商品明细时禁止按订单总额回退计费");
add(serverSource.includes("/api/v1/platform/capabilities") && serverSource.includes("platformCapabilities") && existsSync(resolve(root, "scripts/verify-production-deployment.mjs")) ? "pass" : "fail", "生产能力回验接口", "健康检查、能力清单和 HTTPS 生产回验脚本已与当前 v8533 后端接线");
add(serverSource.includes("/api/v1/auth/wechat/session") && serverSource.includes("user_sessions") && serverSource.includes("WECHAT_APP_SECRET") && serverSource.includes("SHUZHI_WECHAT_SESSION_URL") && serverSource.includes("/api/v1/auth/logout") && serverSource.includes("WECHAT_AUTH") && apiSource.includes("loginWithWechat") && apiSource.includes("logoutSession") ? "pass" : "fail", "微信会话认证闭环", "正式环境通过 HTTPS 微信 code 换取短时会话、绑定已核验主体并支持服务端撤销，前台不保存 appsecret 或伪造登录；能力清单未 ready 时阻断上线");
if (production) {
  const required = [["SHUZHI_RUNTIME_MODE", "production"], ["SHUZHI_DEPLOY_ENV", null], ["SHUZHI_SERVICE_NAME", null], ["SHUZHI_PLATFORM_VERSION", "v8533"], ["SHUZHI_RELEASE_VERSION", "v8530"], ["SHUZHI_DB", null], ["SHUZHI_API_TOKEN", null], ["SHUZHI_ADMIN_TOKEN_ROLES", null], ["WECHAT_APP_ID", null], ["WECHAT_APP_SECRET", null], ["SHUZHI_WECHAT_OPENID_PRINCIPALS", null], ["SHUZHI_ALLOWED_ORIGIN", null], ["VITE_API_BASE", null], ["SHUZHI_CA_ADAPTER_URL", null], ["SHUZHI_CA_ADAPTER_SECRET", null], ["SHUZHI_PAYMENT_ADAPTER_URL", null], ["SHUZHI_PAYMENT_ADAPTER_SECRET", null], ["SHUZHI_LOGISTICS_ADAPTER_URL", null], ["SHUZHI_LOGISTICS_ADAPTER_SECRET", null], ["SHUZHI_INVOICE_ADAPTER_URL", null], ["SHUZHI_INVOICE_ADAPTER_SECRET", null], ["SHUZHI_REGULATOR_ADAPTER_URL", null], ["SHUZHI_REGULATOR_ADAPTER_SECRET", null], ["CA_WEBHOOK_SECRET", null], ["LOGISTICS_WEBHOOK_SECRET", null], ["PAYMENT_WEBHOOK_SECRET", null], ["INVOICE_WEBHOOK_SECRET", null], ["REGULATOR_WEBHOOK_SECRET", null], ["SHUZHI_HTTPS_ACCEPTANCE_REF", null], ["SHUZHI_DATABASE_ACCEPTANCE_REF", null], ["SHUZHI_WECHAT_ACCEPTANCE_REF", null], ["SHUZHI_CA_ACCEPTANCE_REF", null], ["SHUZHI_PAYMENT_ACCEPTANCE_REF", null], ["SHUZHI_LOGISTICS_ACCEPTANCE_REF", null], ["SHUZHI_INVOICE_ACCEPTANCE_REF", null], ["SHUZHI_REGULATOR_ACCEPTANCE_REF", null]];
  if (process.env.SHUZHI_WECHAT_AUTH_READY !== "true") required.push(["SHUZHI_USER_TOKEN_PRINCIPALS", null]);
  for (const [key, expected] of required) { const value = process.env[key]; const ok = Boolean(value) && (expected == null || value === expected) && !String(value).includes("CHANGE_ME") && value !== "local-demo-token"; add(ok ? "pass" : "fail", `生产变量 ${key}`, ok ? "已配置" : "缺失、占位或不安全"); }
  for (const key of ["VITE_API_TOKEN", "VITE_ADMIN_TOKEN"]) add(!process.env[key] ? "pass" : "fail", `禁止前端内嵌 ${key}`, process.env[key] ? "检测到构建期静态令牌" : "未内嵌");
  add(/^https:\/\//.test(process.env.VITE_API_BASE || "") ? "pass" : "fail", "API HTTPS", process.env.VITE_API_BASE || "未配置");
  add(/^https:\/\//.test(process.env.VITE_API_BASE || "") && !/\/api\/?$/.test(process.env.VITE_API_BASE || "") ? "pass" : "fail", "API 根路径", "VITE_API_BASE 必须是 API 域名根地址，不能重复附加 /api");
  add(/^https:\/\//.test(process.env.SHUZHI_ALLOWED_ORIGIN || "") ? "pass" : "fail", "CORS 精确来源", process.env.SHUZHI_ALLOWED_ORIGIN || "未配置");
  add(process.env.SHUZHI_WECHAT_AUTH_READY === "true" ? "pass" : "fail", "微信身份认证联调", "必须完成 code 换 session、用户绑定、令牌轮换和退出失效测试");
  for (const key of ["CA", "PAYMENT", "LOGISTICS", "INVOICE", "REGULATOR"]) add(process.env[`SHUZHI_${key}_READY`] === "true" ? "pass" : "fail", `${key} 第三方联调`, "必须完成合同、密钥、回调签名、幂等和验收测试");
  for (const item of activationCatalog.capabilities.filter((capability) => capability.codeReadiness === "partial")) add("fail", `${item.name} 出站适配器`, item.missingAdapter || "机构出站适配器尚未完成");
}
for (const item of checks) console.log(`${item.level === "pass" ? "PASS" : item.level === "warn" ? "WARN" : "FAIL"}  ${item.name}  ${item.detail}`);
const failures = checks.filter((item) => item.level === "fail").length;
const warnings = checks.filter((item) => item.level === "warn").length;
console.log(`\n数智供社 ${currentVersion} 就绪检查：${checks.length - failures - warnings} 通过，${warnings} 警告，${failures} 失败`);
process.exitCode = failures ? 1 : 0;
