// 供应链金融 · 银企直连闭环数据

// 合作银行（银行系统对接）
export interface Bank {
  name: string; short: string; credit: number; used: number; rate: string; products: string[];
}
export const banks: Bank[] = [
  { name: "中国农业银行", short: "农行", credit: 500, used: 390, rate: "3.85%起", products: ["订单贷", "农机购置贷"] },
  { name: "中国邮政储蓄银行", short: "邮储", credit: 300, used: 234, rate: "4.0%起", products: ["仓单质押贷", "农户小额贷"] },
  { name: "农业发展银行", short: "农发行", credit: 800, used: 560, rate: "政策利率", products: ["收储贷", "基建贷"] },
  { name: "省农村信用社", short: "农信", credit: 200, used: 168, rate: "4.2%起", products: ["基层普惠贷", "应收账款保理"] },
];

// 供应链各环节金融产品闭环
export interface ChainFin {
  stage: string; icon: string; color: string; product: string; basis: string; bank: string;
}
export const chainFin: ChainFin[] = [
  { stage: "生产端", icon: "🌱", color: "#16884c", product: "订单贷 · 农资预付贷", basis: "凭链上订单/种植合约", bank: "农行" },
  { stage: "流通端", icon: "🚚", color: "#2b6cb0", product: "仓单质押贷 · 应收账款保理", basis: "凭电子仓单/应收账款", bank: "邮储/农信" },
  { stage: "销售端", icon: "🏪", color: "#d99a2b", product: "采购账期融资", basis: "凭真实采购订单·先货后款", bank: "农信" },
  { stage: "回款闭环", icon: "🔄", color: "#c0392b", product: "货款自动回流·优先偿贷", basis: "统一结算→偿贷→释放额度→再投放", bank: "全部" },
];

// 风控闭环
export const riskLoop = [
  { t: "链上数据交叉核验", d: "订单·仓储·物流·回款四流合一，杜绝虚假贸易融资" },
  { t: "ZKP 隐私计算", d: "经营数据「可用不可见」，合规调用授信" },
  { t: "智能风控动态授信", d: "AI 模型实时评估，额度利率动态调整" },
  { t: "数字人民币定向支付", d: "专款专用，资金流向全程可监管" },
  { t: "风险准备金 + 自动核销", d: "300 亿准备金兜底，回款自动核销闭环" },
];

// 效率 & 资金使用率对比
export const compare = [
  { k: "放款周期", old: "T+15 天", now: "T+1 天", up: true },
  { k: "资金周转", old: "4 次/年", now: "8 次/年", up: true },
  { k: "融资成本", old: "基准利率", now: "下浮 20%+", up: true },
  { k: "坏账率", old: "3.2%", now: "0.8%", up: true },
  { k: "银行资金使用率", old: "62%", now: "78%", up: true },
];
