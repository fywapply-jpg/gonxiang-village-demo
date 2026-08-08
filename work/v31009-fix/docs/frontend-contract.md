# v3.1009 前端—后端契约基线

> 唯一前端基准：`work/v31009-fix`。本文记录前端当前真实调用、页面依赖字段、状态映射、降级行为与未接入模块。后端实现以 `cloud-server` 的 `/api/v1` 为准。

## 1. 运行边界

- `TARO_APP_BACKEND_SYNC=true`：微信小程序使用真实后端；所有已接入命令必须以后端成功响应为准。
- `TARO_APP_CLOUD_ENV`：微信云开发环境 ID；为空时真实请求直接失败。
- `TARO_APP_CLOUD_SERVICE`：云托管服务名，默认 `gonxiang-api`。
- H5 演示版不建立微信可信会话，继续使用 v3.1009 本地演示数据。
- 真实后端模式禁止 `PAY_MODE=mock` 返回成功；支付契约未完成时页面只能提示不可支付。
- 未列入“已接入”的模块仍属于演示数据，不得据此认定业务已在后端落库。

## 2. 传输与统一响应

前端通过 `Taro.cloud.callContainer` 调用云托管：

```text
X-WX-SERVICE: <TARO_APP_CLOUD_SERVICE>
Content-Type: application/json
Authorization: Bearer <accessToken>   # 建立会话后
```

成功响应：

```ts
interface Result<T> {
  code?: 0;
  message?: 'success';
  data: T;
  requestId?: string;
  timestamp?: string;
}
```

错误响应兼容两种现有形态：

```ts
{ error: { code: string; message: string }; requestId?: string }
{ code: number; message: string; requestId?: string; timestamp?: string }
```

前端判错条件：HTTP 非 2xx、存在 `error`，或 `code` 存在且不为 `0`。HTTP 401 会清除本地用户与令牌；当前没有自动刷新/单次重试契约。

## 3. 已接入路由

### 3.1 身份与组织

| 前端调用 | 路由 | 请求 | 页面需要的响应字段 | 页面行为 |
|---|---|---|---|---|
| `establishBackendSession` | `POST /api/v1/auth/wechat/session` | 无请求体；身份来自可信微信网关 | `accessToken`, `expiresAt` | 保存令牌后请求 `/me`；失败只提示，不伪造登录成功 |
| `backendApi.me` | `GET /api/v1/me` | Bearer Token | `userId`; `memberships[].id/organizationId/organizationName/organizationType/roleId/roleName`; `grants[].permission/organizationPath` | `app.tsx` 当前只写入 `userId`、首个组织名称；角色与权限 UI 映射仍缺失 |
| `backendApi.organizations` | `GET /api/v1/organizations` | 无 | `id`, `name`, `type`, `parentId`, `path`, `status` | 适配层已定义，页面尚未消费 |

### 3.2 商品与订单

| 前端调用 | 路由 | 请求 | 页面需要的响应字段 | 页面行为 |
|---|---|---|---|---|
| `backendApi.products` | `GET /api/v1/products` | 无 | `id`, `name`, `unit`, `priceCents`, `stock`, `organizationId`, `merchantName` | 结算页目前用商品名称匹配购物车，再按 `organizationId` 分单；匹配不到即阻止提交 |
| `backendApi.orders.create` | `POST /api/v1/orders` | Header `Idempotency-Key`；Body `{ organizationId, items: [{ productId, quantity }] }` | `id`, `orderNo`, `status`, `totalCents` | 每个组织创建一单；全部请求成功后才清购物车并提示“等待付款” |
| `backendApi.orders.list` | `GET /api/v1/orders` | 无 | 订单摘要及 `items[]`, `merchantName`，字段见下节 | 订单页只展示后端返回；失败保留现有画面并提示同步失败，不注入 Mock |
| `backendApi.orders.detail` | `GET /api/v1/orders/:id` | Path `id` | 完整订单及 `items[]`, `merchantName` | 契约已纳入适配层；当前没有独立订单详情页消费 |
| `backendApi.orders.cancel` | `POST /api/v1/orders/:id/cancel` | Path `id`，无 Body | `id`, `status`, `version`, 可选 `replayed` | 用户确认后调用；成功后重拉订单列表再显示取消成功；失败不改本地状态 |
| `backendApi.orders.confirmReceipt` | `POST /api/v1/orders/:id/confirm-receipt` | Path `id`，无 Body | `id`, `status`, `version`, 可选 `replayed` | 用户确认后调用；成功后重拉订单列表再显示成功；失败不改本地状态 |
| `backendApi.orders.requestRefund` | `POST /api/v1/orders/:id/request-refund` | `{ reason }`，2–300 字 | `refundId`, `orderStatus`, `status: REQUESTED` | 成功后重拉列表并提示已提交；失败不改本地状态 |

订单查询 DTO：

```ts
interface BackendOrder {
  id: string;
  orderNo: string;
  organizationId: string;
  status: BackendOrderStatus;
  totalCents: number;
  version: number;
  createdAt: string;
  merchantName: string;
  items: Array<{
    productId?: string;
    productName: string;
    quantity: number;
    unitPriceCents: number;
    subtotalCents: number;
    merchantName?: string;
  }>;
}
```

### 3.3 贡献值

| 前端调用 | 路由 | 请求 | 页面需要的响应字段 | 页面行为 |
|---|---|---|---|---|
| `backendApi.contributions` | `GET /api/v1/contributions/me` | 无 | `pendingPoints`, `availablePoints`, `entries[].id/referenceType/referenceId/points/state/occurredAt` | 使用 `availablePoints` 作为可用总额；失败只提示，不回退本地贡献值 |

贡献流水状态：`PENDING`（待确认）、`AVAILABLE`（可用）、`REVERSED`（已冲正）。当前页面把 `AVAILABLE` 显示为链上已确认，其他状态显示为未确认；后端没有返回月份、排名、维度与分红字段，页面暂以 `0` 或前端派生值展示。

### 3.4 通知

| 前端调用 | 路由 | 请求 | 页面需要的响应字段 | 页面行为 |
|---|---|---|---|---|
| `backendApi.notifications.list` | `GET /api/v1/notifications` | 无 | `id`, `type`, `title`, `body`, `targetPath`, `status`, `createdAt` | 后端只返回 `SENT/READ`；失败保留当前画面并提示，不混入初始化 Mock |
| `backendApi.notifications.read` | `POST /api/v1/notifications/:id/read` | Path `id` | `id`, `status: READ` | 后端确认后才把单条通知改为已读 |
| `backendApi.notifications.readAll` | `POST /api/v1/notifications/read-all` | 无 | `affected` | 后端确认后才把当前列表全部改为已读；失败保持未读状态 |

`targetPath` 存在时，消息页在标记已读后跳转到站内用户业务页；登录页、管理端和非法路径不允许通过通知直达。

### 3.5 六级治理事项

| 前端调用 | 路由 | 请求 | 页面需要的响应字段 | 页面行为 |
|---|---|---|---|---|
| `governanceCases.list` | `GET /api/v1/governance-cases` | 无 | `id/caseNo/title/description/urgency/status/origin*/assignee*/version/dueAt/createdAt` | 基层智治页展示当前权限范围台账；失败不注入演示事项 |
| `governanceCases.create` | `POST /api/v1/governance-cases` | `{ organizationId, title, description, urgency }` | `id`, `caseNo`, `status` | 基层智治页已开放上报；组织取当前账号主组织，标题≥2字、说明≥10字 |
| `governanceCases.command` | `POST /api/v1/governance-cases/:id/:command` | `assign:{assigneeOrganizationId}`；`progress:{detail}`；`submit-verification:{result}`；`return:{reason}`；其余无字段 | `id`, `status`, `version` | 页面按授权与状态展示动作；派单目标仅限发起组织合法下级；成功后重拉，失败保留原状态 |

状态机严格使用：`DRAFT → ASSIGNED → ACCEPTED → IN_PROGRESS → PENDING_VERIFICATION → CLOSED`；验收可进入 `RETURNED`，疑难事项可进入 `ESCALATED`。前端不得使用旧状态 `REPORTED/VERIFIED`。权限入口仅作体验收敛，最终鉴权以后端为准：`governance.assign`（派单）、`governance.handle`（接单/反馈/提交验收）、`governance.verify`（验收/退回）。

## 4. 状态映射

| 后端订单状态 | v3.1009 页面状态 | 页面可执行动作 |
|---|---|---|
| `PENDING_PAYMENT` | 待付款 | 取消；支付暂不可用 |
| `PAID` | 待发货 | 申请退款 |
| `SHIPPED` | 配送中 | 确认收货、申请退款 |
| `DELIVERED` | 已签收 | 评价接口未完成，真实模式不提交本地评价成功 |
| `REFUNDING` | 退款中 | 无重复退款 |
| `REFUNDED` | 已退款 | 无 |
| `CANCELLED` | 已取消 | 无 |

未知状态暂原样显示，颜色使用默认值；新增后端状态时必须先补映射和允许动作，不能默认视为成功终态。

## 5. 页面降级与“不得伪造成功”规则

| 场景 | 真实后端模式 | 演示模式 |
|---|---|---|
| 会话失败 | 提示“后端会话建立失败”，不生成真实身份 | H5 可注入演示身份 |
| 商品无法匹配 | 阻止下单并指出缺失商品 | 使用本地商品与购物车 |
| 创建订单部分/全部失败 | 不清购物车，不提示成功 | 本地生成演示订单 |
| 订单取消/确认/退款失败 | 不改列表状态，不显示成功 | 本地状态机演示 |
| 支付契约缺失 | 明确提示不可付款；`payOrder` 禁止走 `payMock` | 默认 `PAY_MODE=disabled`；只有显式切到 `mock` 才演示支付 |
| 订单评价契约缺失 | 不写本地评价成功，提示接口未开放 | 可本地演示评价 |
| 通知已读失败 | 保持原未读状态 | 本地改状态 |
| 贡献查询失败 | 只提示失败，不用本地余额冒充后端余额 | 使用本地/旧云函数数据 |

## 6. `backendApi` 调用盘点

| 文件 | 调用 |
|---|---|
| `src/app.tsx` | `establishBackendSession()` → `backendApi.me()` |
| `src/pages/order-confirm/index.tsx` | `products()`, `orders.create()` |
| `src/pages/orders/index.tsx` | `orders.list()`, `orders.cancel()`, `orders.confirmReceipt()`, `orders.requestRefund()` |
| `src/pages/contribution/index.tsx` | `contributions()` |
| `src/pages/messages/index.tsx` | `notifications.list()`, `notifications.read()`, `notifications.readAll()` |
| `src/pkgDigital/digital-village/index.tsx` | `organizations()`, `governanceCases.list/create/command()` |
| 尚未被页面调用 | 无（当前适配层均已有页面消费者） |

## 7. 仍在 Mock/本地存储的关键模块

以下是“页面存在但尚未形成真实后端闭环”的主要模块，不等于所有演示页面的穷举：

| 优先级 | 模块 | 当前数据/行为 | 前端所缺契约 |
|---|---|---|---|
| P0 | 微信支付 | `config/payment.ts` 默认 Mock；真实模式已硬阻断 Mock 成功 | 支付预下单、支付参数、支付状态查询；前端只信后端订单状态，不信 `requestPayment.success` 作为最终到账 |
| P0 | 购物车商品标识 | 本地 `CartItem.id` 为数字，结算时按商品名称模糊匹配 | 商品卡片/购物车直接保存后端 `productId`、`organizationId`、价格版本；移除名称匹配 |
| P0 | 下单价格与履约信息 | 前端计算配送费、贡献抵扣、地址、配送/自提，但创建订单未传这些字段 | 收货地址快照、履约方式、配送费报价、贡献抵扣预占/释放；金额始终由后端重算 |
| P0 | 多组织分单原子性 | 前端以 `Promise.all` 分别创建订单；中途失败可能已有部分订单成功，重试又会生成新的批次幂等键 | 后端批次下单命令，或前端持久化批次键并提供批次查询/恢复契约，避免重复订单 |
| P0 | 用户角色与权限 | `/me` 已返回 memberships/grants，但 UI 仍主要依赖本地 `role` 和 `store.can*` | 明确 `roleName/permission` 到前端能力的映射；无权限入口隐藏且命令仍以后端鉴权为准 |
| P1 | 商家工作台 | `pkgShop/my-store` 商品、发货、退款、余额、提现均为本地存储 | 商户资料、商品管理、履约发货、退款处理、账户与提现命令/查询 |
| P1 | 平台/村级管理 | `pages/admin`、`pkgPlatform/platform` 使用常量 Mock，可在本地“审核/结算成功” | 入驻审核、组织开通、用户/角色授权、结算账单、审计查询 |
| P1 | 治理业务 | 村务、议事、隐患、调解、审批、名册多为 store/页面状态 | 治理事项 Command/Query、流转版本、组织数据域、附件与审计轨迹 |
| P1 | 贡献闭环 | 查询已接入；申报、审核、消费冻结/确认/冲正仍在本地 | 贡献申报、审核、订单事件计分、抵扣预占与释放、排名/维度查询 |
| P1 | 公益与志愿 | 项目、申领、捐赠、志愿认证/核销均为本地种子与状态 | 公益项目、申领审核、捐赠凭证、志愿记录、双审核变更 |
| P1 | 就业/村务公开 | `jobs`、`affairs` 使用本地种子 | 发布、审核、查询、数据域过滤、有效期与下架 |
| P2 | 消息跳转 | `targetPath` 已返回但页面未使用 | 跳转白名单与按通知类型的详情路由 |
| P2 | H5 正式登录 | H5 只适合演示，不能取得微信云托管可信 OpenID | OIDC/短信登录及对应会话交换契约 |
| P2 | 分页与刷新 | 多个列表固定最多 200/500 条，前端无游标 | `cursor/limit/nextCursor` 或页码契约、下拉刷新与增量合并规则 |

## 8. 下一轮前端优先顺序

1. 商品卡片到购物车全链路保留后端 `productId + organizationId`，消除名称模糊匹配。
2. 接支付预下单与订单支付状态查询；在此之前保持真实模式不可支付。
3. 将 `/me` 的角色、权限和组织层级映射到现有入口与 `store.can*` 判断。
4. 对商家工作台和管理端的本地成功操作统一加真实模式阻断，再按后端完成顺序逐项开放。
5. 补治理、贡献申报审核、公益三组 Command/Query 契约，禁止页面仅凭本地状态宣告完成。
