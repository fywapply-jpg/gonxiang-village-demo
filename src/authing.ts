import { Authing } from '@authing/web';

// ─────────────────────────────────────────────────────────────────────────────
// 🔧 配置区：把这两行替换成你的真实 Authing 应用信息
//    操作步骤：
//    1. 打开 https://console.authing.cn 注册登录
//    2. 创建应用 → 选「单页 Web 应用」
//    3. 把下面的占位符替换为控制台里的 AppID 和 应用域名
//       例如：AUTHING_APP_ID = 'abc123...'
//            AUTHING_DOMAIN  = 'https://your-app.authing.cn'
//    4. 在 Authing 控制台「安全配置→登录回调 URL」填入你的访问地址
// ─────────────────────────────────────────────────────────────────────────────
export const AUTHING_APP_ID: string = '6a1d185f3dc38c34ba60485b';
export const AUTHING_DOMAIN    = 'https://gsdtlch36ov4-demo.authing.cn';
export const AUTHING_POOL_ID   = '6a1d185ec6db056661a55787';

// 判断是否已填写真实配置
export const isConfigured = AUTHING_APP_ID !== 'YOUR_APP_ID';

// 只有配置完成才初始化客户端，否则保持 null（演示模式继续可用）
export const authing: Authing | null = isConfigured
  ? new Authing({
      appId: AUTHING_APP_ID,
      domain: AUTHING_DOMAIN,
      userPoolId: AUTHING_POOL_ID,
      // 回调地址：去掉 hash/query，兼容本地文件和线上部署
      redirectUri: window.location.href.split('?')[0].split('#')[0],
    })
  : null;
