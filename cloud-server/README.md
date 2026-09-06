# 供享村社 · 微信云托管后端

> **历史隔离说明（数智供社 v8533）**：本目录保留的是旧版微信云托管/MySQL 服务（发布标识 v3.1208），不属于当前数智供社 v8533 前后台链路，也不在 GitHub Pages 发布工作流中。当前平台后端以 `local-backend/server.mjs` 的 v8530 API 兼容线为准；除非完成独立迁移评审、版本改名和全量机构联调，不得将本目录接入当前生产域名或小程序。

Goal A–D 的后端地基：微信身份、MySQL、六级组织、RBAC 数据域、审计、治理与交易安全边界。

## 当前边界

- 小程序通过微信云托管网关调用 `POST /api/v1/auth/wechat/session`。
- 生产环境只接受网关注入的 `X-WX-OPENID` / `X-WX-SOURCE` 身份信息。
- 本地开发可使用 `X-DEV-OPENID`，生产配置会强制禁止开发身份模式。
- 客户端不能直写 MySQL；所有组织和权限查询均经过 API。
- 真实微信支付、退款、对象存储和消息推送默认关闭，必须在密钥、验签回调和生产确认闸门完成后启用。

## 本地启动

```bash
cp .env.example .env
# 启动本地 MySQL 后，将 .env 中的变量导出到运行环境
npm install
npm run migrate
npm run dev
```

若本机从零部署数据库，优先按 [`docs/local-database-setup.md`](./docs/local-database-setup.md) 执行：

```bash
npm run setup:local-db
npm run migrate:local
npm run dev:local
```

接口：

```text
GET  /health/live
GET  /health/ready
POST /api/v1/auth/wechat/session
POST /api/v1/auth/logout
GET  /api/v1/me
GET  /api/v1/organizations
GET  /api/v1/organizations/:id
POST /api/v1/admin/users/:id/revoke-sessions
```

本地获取会话：

```bash
curl -X POST http://localhost:8080/api/v1/auth/wechat/session \
  -H 'X-DEV-OPENID: local-user-001'
```

## 微信云托管配置

服务根目录选择 `cloud-server`，监听端口 `8080`，使用仓库中的 `Dockerfile`。

生产环境必须配置：

```text
NODE_ENV=production
AUTH_MODE=wechat-cloud
WECHAT_APP_ID=wxed295d86de63bd83
TRUST_PROXY_HOPS=1
SESSION_SECRET=<至少 32 字节的随机值>
CORS_ORIGINS=<正式管理后台域名>
MYSQL_HOST=<云托管 MySQL 内网地址>
MYSQL_PORT=3306
MYSQL_USER=<数据库用户>
MYSQL_PASSWORD=<数据库密码>
MYSQL_DATABASE=gonxiang
B2C_PAYMENT_CALLBACK_SECRET=<B2C支付机构独立密钥，至少32字节>
B2C_LOGISTICS_CALLBACK_SECRET=<B2C物流机构独立密钥，至少32字节>
B2B_PROVIDER_CALLBACK_SECRET=<B2B履约机构独立密钥，至少32字节>
PROSPERITY_PAYMENT_CALLBACK_SECRET=<共同富裕付款机构独立密钥，至少32字节>
EVIDENCE_STORAGE_CALLBACK_SECRET=<对象存储与安全扫描机构独立密钥，至少32字节>
LICENSE_AUTHORITY_CALLBACK_SECRET=<权威许可状态机构独立密钥，至少32字节>
PROVIDER_CALLBACK_MAX_SKEW_SECONDS=300
```

## 单机/VPS 生产部署模板

仓库同时提供 `compose.production.yml`，用于把同一套 Docker 镜像、MySQL、健康检查和迁移启动顺序交给运维执行。先复制并填写真实密钥：

```bash
cp .env.production.example .env.production
# 用密钥管理系统或受控编辑器填写 .env.production
docker compose --env-file .env.production -f compose.production.yml config
docker compose --env-file .env.production -f compose.production.yml up -d --build
curl --fail https://正式域名/health/ready
```

`CLOUD_SERVER_IMAGE` 必须填写不可变镜像标签或 digest；生产 Compose 不接受默认的 `latest`。MySQL 服务只在单机/VPS 模式启用，使用云托管 MySQL 时，应移除 `mysql` 服务及 `api.depends_on`，并将 `MYSQL_HOST`、账号和密码注入托管平台密钥。`docker compose config` 只能验证配置展开，不能替代真实机构验收、HTTPS、微信 AppID 归属或部署后在线回验；上线仍必须执行前端目录的 `npm run check:release-gate -- --production --full` 和 `npm run verify:production-deployment`。

四个业务域的密钥禁止复用。轮换时可分别临时配置对应的 `*_PREVIOUS` 变量，使新旧密钥在短暂窗口内同时验签；确认机构全部切换后应删除上一版密钥。不得只配置上一版密钥，也不得继续使用旧的跨域共享 `PROVIDER_CALLBACK_SECRET`。

所有机构回调统一携带 `X-Provider-Timestamp`（10 位 Unix 秒）和 `X-Provider-Signature`。签名原文为 `timestamp + "." + canonicalJson(body)`，算法为 HMAC-SHA256 十六进制小写；对象键按字典序递归排序，数组顺序保持不变。服务端默认只接受前后 300 秒内的事件，并继续使用请求体中的 `eventId` 或 `providerEventId` 做机构级幂等。缺少时间戳、时间窗外、跨业务域密钥或签名错误均拒绝处理。

生产镜像启动时执行 `npm run start:production`，先取得数据库全局迁移锁、校验历史迁移摘要并执行待应用迁移，成功后才启动 API；任何迁移失败都会阻止容器接收流量。镜像已包含编译后的迁移器和 `migrations/`，不依赖生产环境安装 `tsx`。

容器健康检查使用`/health/ready`：数据库迁移完整且全部关键后台调度器启动后才进入就绪；收到`SIGTERM`或`SIGINT`时立即退出就绪状态，停止调度并排空连接。`SHUTDOWN_GRACE_SECONDS`默认30秒，超时以失败状态退出，部署平台的终止宽限期必须大于该值。

就绪检查还会读取数据库中的共享调度租约：治理SLA、运营快照、企业证照和全国资质政策四类任务必须至少成功一次，最后成功时间不得超过三个执行周期（最低容忍15分钟），且最近一次运行不能是失败。多实例共享同一权威记录，未抢到租约的实例不会被误判；真实任务持续失败或停滞会使所有实例退出就绪并触发部署平台告警。

配置`OPERATIONS_ALERT_WEBHOOK_URL`和独立的`OPERATIONS_ALERT_WEBHOOK_SECRET`后，调度故障会生成去重的运维事件和可靠发件箱记录，以HMAC-SHA256签名投递；只有HTTP 2xx才记为送达，失败按指数退避重试，恢复时发送独立闭环事件。每次“故障—恢复—再次故障”都会递增事件轮次，保留首次发现时间和本轮开始时间，签名载荷携带轮次供接收方幂等处理。生产地址强制HTTPS，密钥不得与支付、物流、存储或许可回调复用。未配置外部通道时只保留内部事件，绝不伪造已送达状态。

告警处置API仅授予全国总平台管理员的`operations.alert.manage`权限。处置必须按“未确认→已确认→调查中→已缓解→已结案”推进，每步记录操作者、时间、轮次、说明和审计日志；监控自动恢复不自动结案，故障事实未恢复时禁止人工结案。事件复发后新轮次会清空本轮责任字段，但历史处置事件永久保留。

响应SLA按严重级别版本化，当前关键告警基线为15分钟确认、120分钟缓解，普通告警为30分钟确认、240分钟缓解。每个事件轮次在建案时冻结政策和期限，政策调整不改写历史；迟到确认或迟到缓解仍记录违约。两类超时分别生成唯一`ESCALATED`事件进入可靠发件箱，不能用后续处理覆盖既有违约事实。

告警事实、恢复事实、SLA违约与对应发件箱消息均在同一个数据库事务内提交，并对事件行加锁。任何一步失败会整体回滚，下一轮扫描可幂等重试，避免出现“已有故障但没有通知”或“已有违约但没有升级消息”的孤立状态。

发件箱投递使用60秒租约；进程在`SENDING`阶段崩溃后，其他实例可在租约过期时重新认领。每条消息最多自动尝试10次，随后进入`DEAD_LETTER`，避免无限重试掩盖通道故障。死信列表不返回原始载荷，仅全国运维管理员可填写原因后人工重放；重放和审计同事务，首次失败时间永久保留。

生产日志默认遮盖授权令牌、Cookie、微信OpenID、机构回调签名、身份证号和银行账号等字段。生产环境的`/health/ready`仅公开`ready/not-ready`，迁移版本、缺失表和调度器名称不会暴露给公网；详细诊断应从受控日志和监控平台查看。

生产镜像包含MySQL客户端和受控灾备命令：`npm run backup:production`生成事务一致性备份及SHA-256清单；`npm run restore:drill`只允许恢复到空的`_restore_drill`隔离库，并在恢复后校验当前镜像的最新迁移与核心表。详细步骤和演练证据要求见`docs/MySQL备份恢复与灾备演练手册.md`。

若平台要求数据库变更与应用启动分离，可在同一镜像中先执行：

```bash
npm run migrate:production
```

迁移成功后再以 `node dist/server.js` 启动应用。不得在多个版本镜像之间交叉执行迁移，也不得修改已经执行过的 SQL 文件。

首位总平台管理员必须先通过微信登录一次，再由受控终端执行：

```bash
BOOTSTRAP_USER_ID=<首次登录产生的用户 UUID> npm run bootstrap:admin:production
```

该命令仅在系统不存在任何有效角色授权时执行一次；初始化后再次运行会拒绝，避免公网自助提权。

生产迁移只创建“全国总平台”，不会预装任何地方。准备并审批真实区划清单后执行：

```bash
PILOT_MANIFEST_PATH=/secure/pilot-org.json \
PILOT_OPERATOR_USER_ID=<全国总平台管理员UUID> \
npm run bootstrap:pilot:production
```

清单格式、层级要求和幂等规则见 `docs/pilot-organization-manifest.md`。完成岗位、企业、商户、商品、共富主体和机构验收配置后，执行县域预检：

```bash
PILOT_COUNTY_ORGANIZATION_ID=<试点县组织UUID> npm run validate:pilot:production
```

预检输出 `ready=false` 或任一检查未通过时不得进入真实交易放量；`ready=true` 也只代表基础数据就绪，仍需完成七场景端到端验收。

## 安全验收

交易和文件安全约束：

- 创建订单必须携带 `Idempotency-Key`，商品价格和总额只由服务端计算。
- 不提供客户端“确认支付”接口；付款只能由后续的微信支付验签回调确认。
- 退款申请只进入 `REQUESTED/REFUNDING`，不会在未调用微信支付前标记成功。
- 文件限制 20 MiB 且仅允许 JPEG、PNG、WebP、PDF 和纯文本；新文件固定进入 `quarantine/`。
- 未接入恶意文件扫描和对象存储签名上传前，API 返回 `uploadEnabled: false`。

```bash
npm run check
```

检查覆盖迁移连续性、地方组织硬编码、权限/角色身份冲突、全国九领域契约、生产镜像制品、生产配置阻断、组织路径边界、横向越权、权限编码和角色向下授权规则。
