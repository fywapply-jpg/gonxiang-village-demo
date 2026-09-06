# 前后端同步与安全切换

## 小程序

数智供社 v8533 小程序通过 `uni.request` 访问后端 `/api/v1`，不直接连接数据库。正式构建必须把 `VITE_API_BASE` 设置为真实 HTTPS API 根地址；局域网地址只用于联调。当前工作区没有把微信云托管 `callContainer` 当作已启用的生产链路，后续如迁移云托管，必须重新完成服务名、网络边界、身份注入和回调验收。

启动流程为：微信运行时登录 → 后端 `POST /api/v1/auth/wechat/session` 换取短时会话 → 服务端绑定已审核企业主体 → 业务 API。微信 `appsecret` 只保存在后端环境，不进入小程序包。

已同步的页面：

- 订单列表与退款申请
- 贡献值账户与流水
- 消息列表与已读状态

支付、确认收货和取消订单在新后端尚未具备完整接口时会明确阻断，不会退回本地伪造成功。

## 网页管理后台

网页管理后台（默认 `http://localhost:5180`）通过 Vite 代理把 `/api/*` 和 `/health` 转发到 `http://localhost:8787`；因此不会把前端 SPA 的 `index.html` 误当成 JSON。若管理后台与 API 部署在不同域名，构建时设置 `VITE_ADMIN_API_ORIGIN=https://api.example.com`。管理端只在已建立服务端管理会话时读取数据，不能用演示角色获取生产数据。

管理台所有状态变更由统一 API 包装层自动附加 `Idempotency-Key`（可由调用方显式覆盖），审批、启用、商品审核、流程推进和权限变更在网络重试时只落一次，满足生产写入门禁。

业务工作流推进的审计人由服务端按认证管理员岗位生成；生产环境忽略前端传入的 `actor` 显示名，防止客户端伪造操作主体。

健康探针中的版本字段已拆开：`platform_version=v8533` 表示前台/交付包版本，`api_version=v8530` 表示后端接口兼容发布线；`version` 仅保留为兼容字段（本地为 `v8530-local`，生产为 `v8530`）。能力清单 `/api/v1/platform/capabilities` 使用同一版本口径，并明确列出尚未完成的机构能力。

出现 `Unexpected token '<', "<!doctype" ... is not valid JSON` 时，说明请求被送到了前端静态站点而不是 API。请确认管理后台使用 `npm run dev:local-admin`（已代理 `/health`），API 使用 `npm run dev:local-api`，并先访问 `http://localhost:5180/health` 验证返回 `Content-Type: application/json`。

## 上线闸门

1. 云托管必须覆盖或清理客户端伪造的 `X-WX-*` 请求头。
2. 网页管理端必须完成 OIDC 令牌验签、用户映射和服务端 RBAC，才能开启写操作。
3. CORS 仅允许正式管理域名，不允许 `*`。
4. 微信支付、退款和文件公开依然保持独立安全验收闸门。

## 前台 API 与候选后端兼容性（2026-09-06）

前台当前使用的是 `work/shuzhi-v8502-source/src/services/localApi.ts` 定义的 legacy BFF 契约：资源路由、交易动作、`{code: 0, data, message}` 响应信封，以及微信登录返回的 `token`、`expires_at`、`user` 三个字段必须同时满足。可用 `npm run check:shuzhi-frontend-backend` 做静态闭包检查。

检查结果表明，`local-backend/server.mjs` 已覆盖前台使用的 14 个资源路由和 8 个交易动作，响应信封与登录字段也匹配；因此本地演示和当前小程序构建应继续指向这个兼容 BFF。`cloud-server` 是另一套 MySQL 领域服务，当前仍缺少前台 legacy 路由，且使用 `accessToken`/`expiresAt` 和 `{data, requestId}` 信封，直接把 `VITE_API_BASE` 切到它会导致前台请求被拒绝，不能作为“只改一个环境变量”的上线方案。

正式切换到 cloud-server 前，必须实现并验收独立适配层（路由映射、身份字段转换、错误码、幂等键和回调语义），再以公网 HTTPS 回归测试替换本地 BFF；适配层完成前，生产配置不得直连 cloud-server。

本地真机/开发者工具构建使用 `npm run build:shuzhi-mp`：构建脚本会优先读取 `VITE_API_BASE`，否则读取 `VITE_API_HOST`，最后自动探测 macOS 的 `en0/en1` 局域网地址并生成 `http://<局域网地址>:8787`。使用根目录 `打开数智供社v8533-微信开发者工具.command` 时，启动器会先校验 `/health` 是否确实返回 `platform_version=v8533`；若 8787 被历史 `server/index.js` 占用，会自动选择 8788—8799 的空闲端口并用同一端口重新编译、启动 API，避免把小程序请求发到旧服务。手机和电脑仍必须在同一 Wi-Fi，且防火墙允许实际提示的端口。正式构建继续使用 HTTPS 地址，不得使用该本地命令发布。

## 数智供社 v8533 交易创建闭环

采购大厅批量勾选商品后，前台调用 `POST /api/v1/trades` 创建订单草稿；服务端重新核验采购方/供货方主体、商品审核状态、库存、数量和订单金额，并在同一事务内写入订单明细、合同、支付、发票、验收和首个履约证据。生产请求必须带 `Idempotency-Key`，金额以商品明细净额加合同服务费用为准，不能由客户端覆盖。

生产批量工作台仅允许从同一已核验供货主体创建订单；后台不可用时前台不得本地推进交易状态。订单创建成功后返回的订单 ID 会保存到交易包，后续合同签署、验收、开票和结算均使用该服务端订单，不再依赖固定演示订单号。

结算模型只能取平台配置的标准项；生产授信账期必须带持牌机构审批引用，未通过审批的账期订单不会进入履约或结算。

下单时服务端会在 `inventory_reservations` 中登记每个商品的占用并同步扣减可售库存；订单尚未签约、支付、发运或形成最终验收结论前，可调用 `POST /api/v1/trades/:id/cancel` 取消，后台在同一事务内恢复库存、更新订单状态并写入取消证据。进入合同/资金/履约阶段后直接取消会被拒绝，必须走机构退款或双方解约流程；本地演示重置会释放并重新占用同一批库存，已取消订单不可重置。

### 采购大厅供货方响应闭环

采购大厅的需求不是订单。采购方发布需求调用 `POST /api/v1/purchase-demands`，服务端校验采购主体、经营资质、数量、预算、收货地和交付时间并以幂等键落库；前台选择需求后，批量工作台调用 `GET /api/v1/purchase-demands` 读取已绑定采购主体的需求。供货方提交报价调用 `POST /api/v1/purchase-demands/:id/quotes`，服务端校验供货主体、经营资质、对公账户、商品审核状态、品类、库存、数量和预算上限，并将报价留痕。采购方在需求详情确认报价调用 `POST /api/v1/purchase-quotes/:id/accept`，同一需求只能授标一家供货方，且需求关闭后不能再确认第二报价；只有确认后的报价才能调用 `POST /api/v1/trades` 并携带 `quote_id` 生成正式订单。

报价确认前不会扣库存、建合同或产生支付指令；正式订单生成时才原子占用库存，并把报价标记为 `ordered`、需求关闭。供货方前台只显示自己的报价，不泄露其他商家的价格；采购方或后台按权限查看报价并承担确认责任。生产环境每个写请求必须提供幂等键，网络重试不得重复报价或重复建单。

### 四流回调状态机

第三方机构回调不是“收到即覆盖”，而是带签名、时间窗、事件号和幂等键的状态迁移：

| 回调 | 允许状态 | 不可逆事实与处理 |
| --- | --- | --- |
| 支付 | `pending/processing`、`paid/success`、`failed/refunded` | 已确认入金不能回退；已分账或已有结算记录的交易拒绝新支付回调；失败支付单不得复用重试 |
| 物流 | `in_transit/shipped`、`delivered/signed`、`exception/cancelled` | 已送达运单不能回退为在途/异常；已结算交易不再接收履约覆盖 |
| 发票 | `pending/processing`、`issued/verified`、`failed/rejected` | 验收合格前拒绝回调；已开具发票不能回退；已结算账本拒绝回调覆盖 |

未知状态、金额不一致、未知订单/运单、重复事件分别返回 400、409、404 或幂等重放结果，并保留机构回调记录。最终分账仍必须同时满足 CA 双签、验收合格、发票验真、托管入金和商品明细金额一致，前台不能绕过这些闸门。

闭环回归命令为 `npm run check:shuzhi-demand-flow`，测试在临时 SQLite 库中运行并自动清理，不污染本地演示数据；`npm run smoke:shuzhi-local` 已纳入该回归。

`npm run smoke:shuzhi-local` 默认每次在随机本机端口启动隔离 API 和临时数据库，即使 8787 上已有开发者工具演示服务也不会复用其状态。只有显式设置 `SHUZHI_TEST_BASE` 时才会针对指定服务回归；这样重复执行物流、支付和结算回调不会因上一次演示状态产生假失败。

正式 H5 与小程序构建都必须显式提供 HTTPS API 根地址（不要附加 `/api`，前端会自动拼接 `/api/v1`）：`VITE_API_BASE=https://真实 API 域名 npm --prefix work/shuzhi-v8502-source run build:h5:production` 或 `npm --prefix work/shuzhi-v8502-source run build:mp-weixin:production`。未配置或使用局域网 HTTP 地址时构建直接失败，避免把离线演示包误当作生产前端。

### 微信身份认证

正式前端的“微信一键登录”先调用微信原生 `uni.login` 获取一次性 `code`，再调用 `POST /api/v1/auth/wechat/session`。后端使用仅存在于服务端的 `WECHAT_APP_SECRET` 向微信换取身份，按 `SHUZHI_WECHAT_OPENID_PRINCIPALS` 绑定已审核企业主体和角色，检查经营资质、对公账户后签发 12 小时短时会话；会话只保存哈希，`POST /api/v1/auth/logout` 可撤销。未完成微信机构联调时接口返回 503，前台不会把切换角色当成生产登录成功。
