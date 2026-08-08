/**
 * 支付统一入口 —— 下单页只调 payOrder()，内部按 config/payment.ts 的 PAY_MODE 自动分流。
 * 演示模式模拟成功；接入微信支付后拉起真实支付面板。切换只改配置，不改这里、不改下单页。
 */
import Taro from '@tarojs/taro';
import { post } from './request';
import { PAY_MODE, PAY_META } from '../config/payment';

export interface PayParams {
  orderNo: string;      // 商户订单号（唯一，用于对账）
  amount: number;       // 应付金额（元）
  description: string;  // 订单描述（显示在支付面板）
}
export type PayResult =
  | { ok: true }
  | { ok: false; reason: 'cancel' | 'fail'; message?: string };

// ── 微信支付：后端统一下单 → 小程序端拉起支付 ──────────────────────────────────
async function payWechat(p: PayParams): Promise<PayResult> {
  try {
    // 后端「JSAPI 统一下单」：用商户号 + APIv3 密钥调微信下单，回传 requestPayment 所需参数。
    // 期望后端返回：{ timeStamp, nonceStr, package, signType, paySign }
    const pay = await post<any>(PAY_META.wechatCreateApi, {
      orderNo: p.orderNo,
      amount: Math.round(p.amount * 100),          // 微信金额单位是「分」
      description: p.description,
      openid: (Taro.getStorageSync('gx_user') || {}).openid || '', // 用户 openid（登录时写入 gx_user）
    });
    return await new Promise<PayResult>((resolve) => {
      Taro.requestPayment({
        timeStamp: pay.timeStamp,
        nonceStr: pay.nonceStr,
        package: pay.package,
        signType: pay.signType || 'RSA',
        paySign: pay.paySign,
        success: () => resolve({ ok: true }),
        fail: (e: any) => resolve({
          ok: false,
          reason: /cancel/i.test(e?.errMsg || '') ? 'cancel' : 'fail',
          message: e?.errMsg,
        }),
      });
    });
  } catch (e: any) {
    return { ok: false, reason: 'fail', message: e?.message || '下单失败，请重试' };
  }
}

// ── 支付宝：仅支付宝小程序 / H5 端可用（微信小程序内不可用）──────────────────────
async function payAlipay(_p: PayParams): Promise<PayResult> {
  // 预留：支付宝小程序用 my.tradePay(tradeNO)；H5 用后端返回的收银台链接跳转。
  // const pay = await post(PAY_META.alipayCreateApi, {...});
  Taro.showModal({
    title: '支付宝支付',
    content: '支付宝支付需在「支付宝小程序 / H5 网页版」使用，当前微信小程序端暂不支持。',
    showCancel: false,
  });
  return { ok: false, reason: 'fail', message: '当前端不支持支付宝' };
}

// ── 演示模拟：转圈 0.8s 后成功，无真实扣款 ──────────────────────────────────────
function payMock(): Promise<PayResult> {
  return new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 800));
}

/** 统一支付入口。下单页调用它，返回是否支付成功。 */
export function payOrder(p: PayParams): Promise<PayResult> {
  if (PAY_MODE === 'wechat') return payWechat(p);
  if (PAY_MODE === 'alipay') return payAlipay(p);
  if (PAY_MODE === 'disabled') {
    return Promise.resolve({ ok: false, reason: 'fail', message: '支付通道尚未接入，订单已保留为待付款' });
  }
  if (process.env.TARO_APP_BACKEND_SYNC === 'true') {
    return Promise.resolve({ ok: false, reason: 'fail', message: '真实后端模式禁止模拟支付' });
  }
  return payMock();
}
