# 数智供社生产部署资产

当前正式部署只允许使用以下文件，平台版本为 **v8533**，后端兼容发布线为 **v8530**：

```text
shuzhi-v8530.env.example
shuzhi-v8530.service
shuzhi-v8530-institution-worker.service
shuzhi-v8530-backup.service
shuzhi-v8530-backup.timer
nginx-shuzhi-api-v8530.conf.example
```

API 服务器必须预装与当前 Node 运行时兼容的 `sqlite3` 命令行工具；备份、SHA-256/完整性校验和隔离恢复脚本都会在 bootstrap 阶段检查该依赖。没有 `sqlite3` 时禁止启用 API、Outbox worker 或备份 timer。

旧的 `v8514`—`v8529` 配置文件仅为历史归档，不能用于当前环境，也不能复制到生产服务器。它们可能包含旧的 API 路径、旧版本变量或已废弃的前端令牌配置。

当前 v8533 生产试运营服务仍是 `local-backend/server.mjs` + 受保护的 SQLite 文件（`SHUZHI_DB`）；`cloud-server/` 的 Fastify + MySQL 服务是独立候选实现，未完成前台兼容适配和机构联调前不得与本服务混用，也不能把 `DATABASE_URL` 当作 `SHUZHI_DB` 使用。

## 当前部署顺序

1. 使用 `scripts/create-shuzhi-production-env.mjs` 在服务器受限目录生成 `/etc/shuzhi-v8530.env`。
2. 先填入域名、核心令牌和备份目录；只有准备开通的微信/CA/支付/物流/发票/监管能力才填入对应真实凭证并登记验收证据，未 ready 的机构保持关闭，不要求猜测或伪造凭证；不要把密钥写入前端或 Git 仓库。
3. 使用 `scripts/render-shuzhi-nginx.mjs` 渲染 API-only Nginx 配置，避免 API 域名误返回历史前台页面。
4. 首次或分阶段部署先运行 `SHUZHI_ENV_FILE=/etc/shuzhi-v8530.env npm run check:shuzhi-bootstrap`；它允许未 ready 的机构能力保持关闭，但拒绝危险核心配置。全部能力推广前仍须运行 `npm run check:shuzhi-production-env` 和 `npm run check:shuzhi-production`。
5. 完成微信及各机构签名、幂等、对账和恢复演练后，才把对应 `SHUZHI_*_READY` 开关改为 `true`。
6. API 服务先启用；至少一类机构完成 `READY=true` 和适配器验收后，再启用 `shuzhi-v8530-institution-worker.service`。worker 只加载已 ready 的机构并从事务性 Outbox 投递对应指令；两者必须使用同一生产数据库文件和同一受限环境文件。
7. 安装并启用 `shuzhi-v8530-backup.timer`。它每天执行一致性 SQLite 备份、`integrity_check` 和 SHA-256 清单；异地复制和恢复演练仍由运维值班流程负责。

生产环境不得使用 `local-backend/` 下的演示数据库、`CHANGE_ME` 占位值或旧版本 service/nginx 文件。
