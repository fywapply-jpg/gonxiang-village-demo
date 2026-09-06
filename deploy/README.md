# 数智供社生产部署资产

当前正式部署只允许使用以下文件，平台版本为 **v8533**，后端兼容发布线为 **v8530**：

```text
shuzhi-v8530.env.example
shuzhi-v8530.service
shuzhi-v8530-institution-worker.service
nginx-shuzhi-api-v8530.conf.example
```

旧的 `v8514`—`v8529` 配置文件仅为历史归档，不能用于当前环境，也不能复制到生产服务器。它们可能包含旧的 API 路径、旧版本变量或已废弃的前端令牌配置。

当前 v8533 生产试运营服务仍是 `local-backend/server.mjs` + 受保护的 SQLite 文件（`SHUZHI_DB`）；`cloud-server/` 的 Fastify + MySQL 服务是独立候选实现，未完成前台兼容适配和机构联调前不得与本服务混用，也不能把 `DATABASE_URL` 当作 `SHUZHI_DB` 使用。

## 当前部署顺序

1. 使用 `scripts/create-shuzhi-production-env.mjs` 在服务器受限目录生成 `/etc/shuzhi-v8530.env`。
2. 填入域名、微信、CA、支付、物流、发票和监管机构签发的真实凭证；不要把密钥写入前端或 Git 仓库。
3. 使用 `scripts/render-shuzhi-nginx.mjs` 渲染 API-only Nginx 配置，避免 API 域名误返回历史前台页面。
4. 运行 `npm run check:shuzhi-production-env`，所有字段通过后再启动 `shuzhi-v8530.service`。
5. 完成微信及各机构签名、幂等、对账和恢复演练后，才把对应 `SHUZHI_*_READY` 开关改为 `true`。
6. API 服务和 `shuzhi-v8530-institution-worker.service` 必须同时启用；前者接收业务和回调，后者从事务性 Outbox 投递 CA、支付、物流、发票和监管指令。两者必须使用同一生产数据库文件和同一受限环境文件。

生产环境不得使用 `local-backend/` 下的演示数据库、`CHANGE_ME` 占位值或旧版本 service/nginx 文件。
