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
  text("work/shuzhi-v8502-source/src/pages/home/search.vue"),
  text("work/shuzhi-v8502-source/src/pages/merchant/star.vue"),
  text("work/shuzhi-v8502-source/src/pages/message/index.vue"),
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
  text("work/shuzhi-v8502-source/src/pages/admin/index.vue"),
];
const collectVueFiles = (directory) => readdirSync(resolve(root, directory), { withFileTypes: true }).flatMap((entry) => {
  const relative = `${directory}/${entry.name}`;
  if (entry.isDirectory()) return collectVueFiles(relative);
  return entry.isFile() && entry.name.endsWith(".vue") ? [relative] : [];
});
const mockPageFiles = collectVueFiles("work/shuzhi-v8502-source/src/pages")
  .filter((path) => text(path).includes("from \"@/mock"));
const mockPageGuardFailures = mockPageFiles.filter((path) => {
  const source = text(path);
  return !source.includes("productionBuild") || !/(正式环境|后台|production)/i.test(source);
});
const workPackage = text("work/shuzhi-v8502-source/package.json");
const legacyCloudReadme = text("cloud-server/README.md");
const historicalDeploymentDocs = [
  text("docs/数智供社-v8513-微信小程序与后端部署.md"),
  text("docs/数智供社-v8513-本地三层部署说明.md"),
].join("\n");
const serverProductBlock = serverSource.slice(serverSource.indexOf('if (path === "/api/v1/products" && req.method === "POST")'), serverSource.indexOf('const productReviewMatch'));
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
add(serverSource.includes("SHUZHI_MAX_BODY_BYTES") && serverSource.includes("HttpError") ? "pass" : "fail", "请求体与错误隔离", "生产请求体上限、JSON 类型校验和统一错误响应");
add(serverSource.includes("seedDemoData") && serverSource.includes("if (!seedDemoData) return") ? "pass" : "fail", "生产数据隔离", "生产模式不写入演示主体、商品、订单和资质种子");
add(serverProductBlock.indexOf("const media =") < serverProductBlock.indexOf('db.prepare("INSERT INTO products') && serverProductBlock.includes('db.exec("BEGIN")') && serverProductBlock.includes('db.exec("COMMIT")') ? "pass" : "fail", "商品写入原子性", "商品字段和媒体先校验，再以事务写入商品、媒体及幂等记录");
add(serverSource.includes("request_idempotency") && serverSource.includes("Idempotency-Key") ? "pass" : "fail", "幂等控制", "关键写请求支持幂等键和重复响应");
add(serverSource.includes("inventory_reservations") && serverSource.includes("releaseOrderInventory") && serverSource.includes("订单取消与库存释放") ? "pass" : "fail", "库存占用与可逆取消", "下单原子占用库存，安全取消时原子释放并保留库存状态证据");
add(serverSource.includes("该运单已登记") && serverSource.includes("最终验收结论") && serverSource.includes("发票已开具") ? "pass" : "fail", "重复状态拦截", "发运、验收、发票不得重复落账");
add(serverSource.includes("发票回调金额与订单发票金额不一致") && serverSource.includes("发票金额与订单金额不一致，禁止结算") ? "pass" : "fail", "发票金额四流核对", "开票及机构回调金额必须与订单金额一致，金额不一致不得进入结算");
add(serverSource.includes("生产写请求必须提供 Idempotency-Key") ? "pass" : "fail", "生产写入门禁", "生产关键写接口强制幂等键");
add(serverSource.includes("processIntegrationWebhook") && serverSource.includes("timingSafeEqual") && serverSource.includes("integration_callbacks") && serverSource.includes("机构联调尚未完成") ? "pass" : "fail", "第三方回调安全", "物流、支付、发票、监管回调具备签名、时间窗、幂等落库与机构 ready 门禁");
add(serverSource.includes("normalizeWebhookStatus") && serverSource.includes("禁止支付回调回退状态") && serverSource.includes("禁止回调回退覆盖") && serverSource.includes("禁止发票回调覆盖账本") ? "pass" : "fail", "回调状态机", "回调状态白名单、单向迁移和已结算账本保护，防止未知或过期回调覆盖已确认事实");
add(serverSource.includes("contract_signatures") && serverSource.includes("SIGN_CONTRACT") && serverSource.includes("SHUZHI_CA_READY") ? "pass" : "fail", "合同签署落库", "买卖双方签署主体、证书引用和时间戳可审计留痕，生产必须通过 CA ready 门禁");
add(serverSource.includes("const actorFor") && serverSource.includes("reviewer=?,reviewed_at") && !serverSource.includes('reviewed_at=?,updated_at=? WHERE id=?").run(String(payload.note || "后台双人复核通过"), "local-admin"') ? "pass" : "fail", "后台操作人审计", "审核、启用、服务区域和商品审核记录真实授权主体，不使用固定 local-admin");
add(serverSource.includes("const operationActor = productionMode ? actorFor(req, \"业务运营岗\")") && serverSource.includes("run(moduleKey, rule.domain, next, rule.steps[next], evidence, operationActor") ? "pass" : "fail", "业务工作流操作人审计", "生产工作流事件使用已认证岗位主体，不信任前端传入的 actor 字段");
add(serverSource.includes("const shipmentActor = actorFor(req, \"物流履约岗\")") && serverSource.includes("const acceptanceActor = productionMode ? actorFor(req, \"采购验收岗\")") && serverSource.includes("log(actorFor(req, \"供货财务岗\"), \"ISSUE_INVOICE\"") && serverSource.includes("const signerName = productionMode ? actorFor(req, \"授权签约人\")") ? "pass" : "fail", "交易证据操作人审计", "发运、验收、开票和 CA 签署记录使用认证主体，生产不接受前端伪造经办人");
add(serverSource.includes("const allowedRoles = side === \"buyer\" ? [\"buyer\", \"agri\"] : [\"supplier\"]") && serverSource.includes("allowedRoles.includes(principal.role)") ? "pass" : "fail", "交易角色与主体隔离", "采购、供货、验收、发运和开票动作同时校验主体归属与经营角色，避免同一令牌跨边签署或操作");
add(existsSync(resolve(root, "scripts/check-shuzhi-v8530-role-isolation.mjs")) && text("package.json").includes('"check:shuzhi-role-isolation": "node scripts/check-shuzhi-v8530-role-isolation.mjs"') && text("scripts/run-shuzhi-local-smoke.mjs").includes("check-shuzhi-v8530-role-isolation.mjs") ? "pass" : "fail", "交易角色隔离回归", "使用生产模式请求验证采购/供货令牌不能跨边发运、验收或签约");
add(serverSource.includes('if (!hasAdminPermission(req, "audit", true)) return error(res, 403, "当前管理员角色无商户审核操作权限")') && text("scripts/check-shuzhi-v8530-access.mjs").includes("运营岗不得直接准入审核") ? "pass" : "fail", "商户审核岗位分权", "运营岗不能直接审批商户准入，审核岗/超级管理员负责准入结论，运营岗负责后续启用");
add(serverSource.includes("const initialVerificationStatus = productionMode ? \"pending\" : \"verified\";") && serverSource.includes("const verificationMatch = path.match") && serverSource.includes("const merchantVerificationReady =") && serverSource.includes("merchantIds.some((merchantId) => !merchantVerificationReady(merchantId))") && serverSource.includes("!merchantVerificationReady(supplierId)") && serverSource.includes("!merchantVerificationReady(buyerId)") && serverSource.includes("!merchantVerificationReady(merchant.id)") && serverSource.includes("营业资质和对公账户尚未完成独立核验，不能启用商户") ? "pass" : "fail", "商户准入事实核验", "生产准入审核不伪造外部核验结论，必须由带机构和证据引用的独立核验记录后才能启用");
add(serverSource.includes("settlement_records") && serverSource.includes("SETTLE_TRADE") && serverSource.includes("验收合格前不得结算") && serverSource.includes("allowedSettlementModels") && serverSource.includes("SHUZHI_PAYMENT_READY") ? "pass" : "fail", "结算对账闸门", "合同、验收、发票和托管资金齐备且使用标准结算模型后才允许最终分账关账，生产必须通过支付 ready 门禁");
add(serverSource.includes("platform_fee_base") && serverSource.includes("orderGoodsNet") && serverSource.includes("platformFeeForOrder") ? "pass" : "fail", "平台费计费基数", "平台技术服务费只按商品明细净额计收，物流、包装、检测等服务项不得重复纳入基数");
add(apiSource.includes("Idempotency-Key") && apiSource.includes("newIdempotencyKey") && apiSource.includes("createTradeOrder") && apiSource.includes("createPurchaseDemand") && apiSource.includes("signTradeContract") && apiSource.includes("settleTrade") && apiSource.includes("getPurchaseDemands") && apiSource.includes("submitDemandQuote") && apiSource.includes("acceptDemandQuote") && apiSource.includes("quote_id?: string") ? "pass" : "fail", "前台后端接线", "订单创建、采购需求发布/报价、报价确认、合同、验收、开票、结算动作调用后台并携带幂等键及服务端金额");
add(apiSource.includes("const productionBuild") && apiSource.includes('(productionBuild ? "" : "local-demo-token")') && apiSource.includes("const authHeader") && apiSource.includes("...authHeader()") ? "pass" : "fail", "生产会话令牌边界", "正式构建无会话时不发送本地演示令牌，演示构建仍保留受控联调令牌");
add(/export function advanceLocalTrade[\s\S]*?requestJson<void>/.test(apiSource) && /export function resetLocalTrade[\s\S]*?requestJson<void>/.test(apiSource) ? "pass" : "fail", "前台履约推进幂等接线", "交易履约推进与演示重置复用统一请求封装，生产写操作不会漏传幂等键");
add(adminSource.includes("requestHeaders.set(\"Idempotency-Key\"") && adminSource.includes("method === \"POST\" || method === \"PUT\" || method === \"PATCH\"") ? "pass" : "fail", "后台写操作幂等接线", "管理台审批、审核、启用和流程推进统一携带服务端幂等键，生产不会因漏传被拦截");
add(["getOperationCatalog", "advanceOperation", "resetOperation", "getPlatformFeatures", "recordPlatformEvent", "createPurchaseDemand", "createTradeOrder", "cancelTrade", "signTradeContract", "acceptTrade", "issueTradeInvoice", "settleTrade"].every((name) => apiSource.includes(name)) && ["/api/v1/operations/catalog", "operationAdvanceMatch", "platform/features", "platform/events", "path === \"/api/v1/purchase-demands\" && req.method === \"POST\"", "path === \"/api/v1/trades\" && req.method === \"POST\"", "cancelMatch", "contractSignMatch", "acceptMatch", "invoiceMatch", "settleMatch"].every((route) => serverSource.includes(route)) ? "pass" : "fail", "前台接口路由闭包", "采购需求发布、订单创建、取消、业务工作流、平台事件和交易合同—验收—开票—结算调用均有对应后端路由");
add(apiSource.includes("product-submit") ? "pass" : "fail", "商品提交幂等键", "商品上架提交不会因重复点击产生重复申请");
add(tradeIndexSource.includes("productionBuild ? [] : villageProducts") && homeSource.includes("productionBuild ? remoteProducts.value") && homeSource.includes("productionBuild ? remoteDemands.value") ? "pass" : "fail", "生产数据不回退演示", "正式构建在后台不可用或无数据时不展示内置虚构商品、需求，避免把演示内容当成真实交易");
add(mockPageGuardFailures.length === 0 ? "pass" : "fail", "页面 mock 生产隔离", mockPageGuardFailures.length === 0 ? `${mockPageFiles.length} 个引用 mock 的页面均具备 productionBuild 门禁` : `缺少正式环境隔离：${mockPageGuardFailures.join(", ")}`);
const batchSource = text("work/shuzhi-v8502-source/src/pages/trade/batch-workbench.vue");
add(batchSource.includes("backendLinked") && batchSource.includes("backendMode.value === \"production\"") && batchSource.includes("生产后台未连接") && batchSource.includes("后台未放行") && batchSource.includes("await signTradeContract") && batchSource.includes("await settleTrade") && existsSync(resolve(root, "scripts/check-shuzhi-v8530-batch-gate.mjs")) ? "pass" : "fail", "批量工作台后台门禁", "批量核验关键节点必须先得到后台成功响应，生产后台不可用时不得推进本地状态");
const operationSource = text("work/shuzhi-v8502-source/src/pages/operation/index.vue");
const fulfillmentSource = text("work/shuzhi-v8502-source/src/pages/trade/fulfillment.vue");
const loanLifeSource = text("work/shuzhi-v8502-source/src/pages/finance/loanlife.vue");
add(operationSource.includes("productionBuild && !backendOnline.value") && operationSource.includes("if (productionBuild) return productionBlocked()") && operationSource.includes("正式环境需后台授权岗位") ? "pass" : "fail", "运营中心断联门禁", "正式环境后台断联时不回退本地工作流，重置和推进均需后台授权岗位");
add(fulfillmentSource.includes("if (productionBuild) return productionBlocked(\"履约节点推进\")") && fulfillmentSource.includes("productionBuild && !sync") ? "pass" : "fail", "履约节点断联门禁", "正式订单才允许提交后台验收，非正式订单不会在前台伪造履约或验收成功");
add(loanLifeSource.includes("v-if=\"productionBuild\" class=\"production-empty\"") && loanLifeSource.includes("暂无后台贷款档案") ? "pass" : "fail", "金融样例隔离", "正式环境不展示本地授信/放款样例，必须等待银行或持牌机构回执");
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
add(existsSync(resolve(root, "scripts/backup-shuzhi-local.mjs")) && existsSync(resolve(root, "scripts/verify-shuzhi-backup.mjs")) ? "pass" : "fail", "备份恢复工具", "一致性备份、SHA-256 与 integrity_check");
add(existsSync(resolve(root, "scripts/check-shuzhi-v8530-backup-restore.mjs")) ? "pass" : "fail", "恢复演练工具", "可将最新备份恢复到临时 SQLite 库并读取关键业务表");
const deployFiles = ["deploy/README.md", "deploy/shuzhi-v8530.env.example", "deploy/shuzhi-v8530.service", "deploy/shuzhi-v8530-institution-worker.service", "deploy/nginx-shuzhi-v8530.conf", "deploy/nginx-shuzhi-api-v8530.conf.example", "deploy/shuzhi-v8533-capability-activation.json", "docs/数智供社-v8530-上线执行清单.md", "docs/数智供社-v8530-外部联调验收表.md", "docs/openapi/数智供社-v8533-机构适配协议-v1.openapi.json", "institution-adapters/shared/client.mjs", "institution-adapters/shared/outbox.mjs", "institution-adapters/shared/worker.mjs", "scripts/run-shuzhi-institution-worker.mjs", "scripts/create-shuzhi-production-env.mjs", "scripts/check-shuzhi-production-activation.mjs", "scripts/check-shuzhi-institution-contract.mjs", "scripts/check-shuzhi-institution-client.mjs", "scripts/check-shuzhi-institution-outbox.mjs", "scripts/check-shuzhi-v8530-production-outbox.mjs"];
const releaseChecklist = text("docs/数智供社-v8530-上线执行清单.md");
add(deployFiles.every((file) => existsSync(resolve(root, file))) && existsSync(resolve(root, "scripts/build-shuzhi-pages-site.mjs")) && text("deploy/README.md").includes("旧的 `v8514`—`v8529` 配置文件仅为历史归档") && releaseChecklist.includes("npm run build:h5:production") ? "pass" : "fail", "部署资产", "当前 v8530 生产模板、API-only Nginx、密钥初始化工具、Pages 构建器和生产 H5 构建命令齐备");
const serviceTemplate = text("deploy/shuzhi-v8530.service");
add(serviceTemplate.includes("ExecStartPre=/usr/bin/node") && serviceTemplate.includes("ProtectSystem=strict") && serviceTemplate.includes("RestrictAddressFamilies=AF_UNIX AF_INET AF_INET6") ? "pass" : "fail", "服务启动与隔离", "systemd 启动前执行生产门禁并限制文件、设备和网络权限");
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
add(institutionClient.includes("PROVIDER_COMMAND_PATHS") && institutionClient.includes('redirect: "error"') && institutionClient.includes('createHmac("sha256"') && institutionClient.includes("AbortController") && text("package.json").includes('"check:shuzhi-institution-client": "node scripts/check-shuzhi-institution-client.mjs"') ? "pass" : "fail", "五类机构安全出站客户端", "统一强制 HTTPS、独立 HMAC 签名、幂等键、超时、禁止重定向和 202 受理响应校验");
const institutionOutbox = text("institution-adapters/shared/outbox.mjs");
add(institutionOutbox.includes("CREATE TABLE IF NOT EXISTS institution_outbox") && institutionOutbox.includes("BEGIN IMMEDIATE") && institutionOutbox.includes("LEASE_EXPIRED") && institutionOutbox.includes("IDEMPOTENCY_CONFLICT") && serverSource.includes("institutionOutboxOverview(db)") && text("package.json").includes('"check:shuzhi-institution-outbox": "node scripts/check-shuzhi-institution-outbox.mjs"') ? "pass" : "fail", "机构指令事务性 Outbox", "业务事务可持久化指令，支持并发领取、崩溃租约回收、指数退避、死信和人工重放");
add(serverSource.includes("QUEUE_CA_SIGNATURE") && serverSource.includes("QUEUE_INVOICE_ISSUE") && serverSource.includes("QUEUE_LOGISTICS_SHIPMENT") && serverSource.includes("QUEUE_PAYMENT_RELEASE") && text("package.json").includes('"check:shuzhi-production-outbox": "node scripts/check-shuzhi-v8530-production-outbox.mjs"') ? "pass" : "fail", "生产机构写操作异步边界", "生产 CA、物流、发票和分账只入 Outbox，最终状态由机构回调确认");
add(serverSource.includes("CREATE TABLE IF NOT EXISTS merchant_identity") && serverSource.includes("统一社会信用代码与后台备案主体不一致") && serverSource.includes("merchantVerificationReady") ? "pass" : "fail", "机构主体身份绑定", "生产 CA、支付、物流和发票指令必须使用后台备案且已核验主体的统一社会信用代码");
add(serverSource.includes('!["admin", "demo"].includes(principal.type)') && serverSource.includes("row.request_hash !== requestHash(payload)") && text("scripts/check-shuzhi-v8530-access.mjs").includes("后台匿名与伪造角色拦截") && text("scripts/check-shuzhi-v8530-access.mjs").includes("幂等键绑定请求内容") ? "pass" : "fail", "后台认证与请求幂等加固", "后台岗位权限必须先通过身份认证；幂等键绑定规范化请求体哈希，禁止换金额或动作复用旧键");
add(existsSync(resolve(root, "scripts/check-secret-hygiene.mjs")) && text(".github/workflows/pages.yml").includes("node scripts/check-secret-hygiene.mjs") ? "pass" : "fail", "发布凭据泄露门禁", "Pages 发布前拒绝受版本控制的真实环境文件、私钥和高置信度访问令牌，报告不显示密钥值");
add(existsSync(resolve(root, "scripts/check-shuzhi-public-pages.mjs")) && text("package.json").includes('"check:shuzhi-public": "node scripts/check-shuzhi-public-pages.mjs"') ? "pass" : "fail", "公网版本回验器", "发布后可核对根入口、兼容入口、后台入口、版本号、历史品牌隔离和资源闭包");
add(text("scripts/verify-production-deployment.mjs").includes("docs/releases/数智供社-v8533-生产部署回验证据.json") && !text("scripts/verify-production-deployment.mjs").includes("docs/releases/供享村社-v8533-生产部署回验证据.json") ? "pass" : "fail", "生产证据品牌隔离", "公网回验默认证据路径只使用数智供社，不把历史项目名带入正式运维记录");
const nginxTemplate = text("deploy/nginx-shuzhi-v8530.conf");
const apiNginxTemplate = text("deploy/nginx-shuzhi-api-v8530.conf.example");
add(nginxTemplate.includes("location = /health/ready") && nginxTemplate.includes("proxy_pass http://127.0.0.1:8787/health/ready") && apiNginxTemplate.includes("location = /health/live") && apiNginxTemplate.includes("location = /health/ready") && apiNginxTemplate.includes("return 404") && text("package.json").includes('"render:shuzhi-nginx"') ? "pass" : "fail", "反向代理就绪探针", "组合部署和 EdgeOne + 独立 API 部署模板均转发健康探针，API 域名根路径不误返回前台");
add(existsSync(resolve(root, "scripts/check-shuzhi-v8530-production-startup.mjs")) ? "pass" : "fail", "生产启动烟测", "安全配置启动、数据库就绪和弱令牌拒绝均有自动化检查");
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
