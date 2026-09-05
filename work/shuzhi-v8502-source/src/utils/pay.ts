// 支付链路（演示版 · 预留真实接入口）
// 生产接入：办好微信支付商户号 / 支付宝 APPID + 搭后端统一下单接口后，替换 requestPay 内实现即可。

export interface PayMethod { key: string; name: string; icon: string; desc: string; color: string; }

export const payMethods: PayMethod[] = [
  { key: "wechat", name: "微信支付", icon: "🟢", desc: "推荐 · 微信内快捷支付", color: "#07c160" },
  { key: "alipay", name: "支付宝", icon: "🔵", desc: "支付宝安全支付", color: "#1677ff" },
  { key: "dcep", name: "数字人民币", icon: "💴", desc: "企业钱包 · 以运营机构实际能力为准", color: "#c8871f" },
  { key: "bank", name: "对公转账", icon: "🏦", desc: "企业同名账户 · 到账以银行回单为准", color: "#5a6270" },
];

export interface PayOrder { title: string; amount: number; no: string; }
export interface PayResult { ok: boolean; method: string; tradeNo: string; msg?: string; }

const prefix: Record<string, string> = { wechat: "WX", alipay: "ALI", dcep: "DC", bank: "BANK" };
const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

/**
 * 发起支付。正式构建禁止模拟成功；真实支付必须由后端向持牌机构统一下单并由机构回调确认。
 * 生产环境替换为：
 *   1) uni.request 调后端 /api/pay/create（传 method + order），后端向微信/支付宝「统一下单」返回支付参数
 *   2) 微信：uni.requestPayment({ provider:'wxpay', ...params })
 *      支付宝：uni.requestPayment({ provider:'alipay', orderInfo })
 *   3) 支付成功后由后端接收微信/支付宝异步回调，核销订单、记账、对账（前端仅展示结果）
 */
export function requestPay(method: string, order: PayOrder): Promise<PayResult> {
  if (productionBuild) {
    return Promise.resolve({ ok: false, method, tradeNo: "", msg: "正式支付通道尚未完成机构联调，未执行扣款" });
  }
  return new Promise((resolve) => {
    uni.showLoading({ title: "支付处理中…", mask: true });
    setTimeout(() => {
      uni.hideLoading();
      const tradeNo = (prefix[method] || "PAY") + "20260705" + String(Math.floor(Math.random() * 900000) + 100000);
      resolve({ ok: true, method, tradeNo });
    }, 1000);
  });
}
