# 数智供社 v8533 · 供应链与产业服务平台

> 当前发布入口为数智供社 v8533；仓库中的 `work/v31009-fix` 等供享村社目录仅作历史资料，不属于当前平台链路。

面向采购商、产地供货商、农资服务商和基层服务站的移动端小程序及前后台联调工程。前台、管理后台和 API 分开部署，交易状态以后台为准。

**前台演示**: https://fywapply-jpg.github.io/gonxiang-village-demo/

**后台演示**: https://fywapply-jpg.github.io/gonxiang-village-demo/admin.html

**微信开发者工具**：运行根目录 `打开数智供社v8533-微信开发者工具.command`，或导入 `work/shuzhi-v8502-source/dist/build/mp-weixin`。

## 当前平台模块

- **生产** — 数字种植、数字养殖、农资准入、农机与人员匹配
- **流通** — 供货大厅、采购大厅、订单、合同、物流、验收、发票
- **信用与金融** — 企业信用、持牌金融入口、四流合一结算门禁
- **民生终端** — 溯源、应急保供、服务站和基层服务
- **后台管理** — 商户审核、商品审核、权限、审计、服务半径和运营数据

## 本地运行

```bash
npm install
npm run dev
```

微信小程序本地预览：

```bash
npm run build:shuzhi-mp
./打开数智供社v8533-微信开发者工具.command
```

## 技术栈

React 18 · TypeScript · Vite · 纯 CSS-in-JS（无第三方 UI 库）
