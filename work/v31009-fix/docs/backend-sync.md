# v3.1009 后端适配

前端视觉与交互继续使用 v3.1009，真实数据通过 `src/utils/backend.ts` 接入
`cloud-server` 的 `/api/v1` 接口。

## 已接入

- 微信可信登录与当前用户/组织成员身份
- 六级组织查询
- 商品查询、订单创建、订单列表、退款申请
- 贡献账户与贡献流水
- 消息列表与已读

后端模式关闭时仍使用 v3.1009 原有演示数据，便于离线展示。

## 微信小程序构建

```bash
TARO_APP_BACKEND_SYNC=true \
TARO_APP_CLOUD_ENV=你的云开发环境ID \
TARO_APP_CLOUD_SERVICE=gonxiang-api \
npm run build:weapp
```

微信云托管服务名需要与 `TARO_APP_CLOUD_SERVICE` 一致，并将微信云开发环境 ID
写入 `TARO_APP_CLOUD_ENV`。小程序通过云托管网关取得可信 OpenID，前端不提交或
伪造 OpenID。

## 演示 H5

```bash
npm run build:h5
```

H5 默认保持本地演示模式。生产 H5 若要连接真实后端，需要另接浏览器端 OIDC/
短信登录并换取后端会话；不能复用微信云托管的可信 OpenID 登录链路。

## 当前业务边界

订单确认页可以创建后端订单，订单页可以查询和申请退款。支付、取消、确认收货
目前没有对应的后端命令接口，因此后端模式下会明确提示“接口尚未开放”，不会
用本地状态伪装成功。
