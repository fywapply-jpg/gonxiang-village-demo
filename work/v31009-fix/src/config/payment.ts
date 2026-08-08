/**
 * 支付配置 —— 拿到商户号后，改这里就能从「演示」切到「真实收款」
 *
 * PAY_MODE 四种值：
 *   'disabled' 未接支付（默认）——明确阻断，不产生“支付成功”假状态
 *   'mock'   仅显式演示使用——转圈 0.8s 后模拟成功，无真实扣款
 *   'wechat' 真实微信支付 —— 需要①后端「统一下单」接口 ②微信支付商户号 ③request.ts 的 BASE_URL 指向后端
 *   'alipay' 支付宝 —— 仅「支付宝小程序 / H5 版」可用，当前微信小程序内接不了
 *
 * 【切到真实微信支付的三步】
 *   1. 后端部署统一下单接口（返回格式见 utils/pay.ts 里 payWechat 的注释）
 *   2. src/utils/request.ts 的 BASE_URL 改成你的后端域名
 *   3. 把下面 PAY_MODE 改成 'wechat'
 *   前端其它代码、下单页都不用动。
 */
export type PayMode = 'disabled' | 'mock' | 'wechat' | 'alipay';

export const PAY_MODE: PayMode = 'disabled';

/**
 * 支付元信息（仅备注与非敏感配置）。
 * ⚠️ 商户号密钥 / APIv3 密钥 / 支付证书 只能放后端，绝不写进前端代码（会被反编译盗刷）。
 *   - 微信商户号 MchID：____________（微信支付商户平台获取 → 配到后端）
 *   - 经营类目费率：约 0.6%（签约时确认，部分公益/政务类目可申请更低）
 */
export const PAY_META = {
  currency: 'CNY',
  wechatCreateApi: '/api/pay/wechat/create', // 后端统一下单接口（相对 BASE_URL）
  alipayCreateApi: '/api/pay/alipay/create',
};
