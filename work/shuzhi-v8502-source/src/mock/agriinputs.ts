// 农资集采 · 数据（厂家直供 · 团购压价 · 赊销到田 · 真伪溯源）

export interface InputCat { icon: string; n: string; items: string; }
export const inputCats: InputCat[] = [
  { icon: "🌱", n: "种子种苗", items: "稻/麦/菜/果苗" },
  { icon: "🧪", n: "化肥", items: "氮磷钾/复合/有机肥" },
  { icon: "🐛", n: "农药", items: "杀虫/杀菌/除草" },
  { icon: "🎞️", n: "农膜", items: "地膜/棚膜/滴灌带" },
  { icon: "🚜", n: "农机植保", items: "农机具/植保无人机" },
  { icon: "🐄", n: "饲料兽药", items: "饲料/兽药/添加剂" },
];

// 集采拼团（量大价降 · 阶梯降价）
export interface Tier { qty: string; price: number; min: number; }
export const groupBuy = {
  name: "史丹利复合肥 45%（15-15-15）",
  spec: "40kg/袋",
  factory: "史丹利农业集团（厂家直供）",
  market: 128, // 市场零售价
  tiers: [
    { qty: "散买 < 100 袋", price: 128, min: 0 },
    { qty: "100-500 袋", price: 118, min: 100 },
    { qty: "500-1000 袋", price: 110, min: 500 },
    { qty: "≥ 1000 袋", price: 103, min: 1000 },
  ] as Tier[],
  joined: 620,   // 已拼数量（袋）
  target: 1000,  // 下一档目标
};

// 厂家直供 · 正品比价
export interface DirectItem { n: string; factory: string; price: string; market: string; save: string; }
export const directSupply: DirectItem[] = [
  { n: "金正大缓释掺混肥", factory: "金正大生态工程", price: "¥135/袋", market: "¥156", save: "省 13%" },
  { n: "先正达康宽杀虫剂", factory: "先正达（正品授权）", price: "¥88/瓶", market: "¥105", save: "省 16%" },
  { n: "登海玉米种 605", factory: "登海种业", price: "¥42/袋", market: "¥50", save: "省 16%" },
  { n: "地膜 0.01mm 加厚", factory: "金发科技", price: "¥12.6/kg", market: "¥15", save: "省 16%" },
];

// 赊销 · 农资贷（先用后付，秋后订单农业收购款代扣）
export const inputsCredit = {
  limit: 80000, used: 32000,
  rate: "3.85%",
  note: "先用后付、赊销到田；秋收由订单农业收购款优先代扣归还，不占用现金。",
};

// 配送到田流程
export const deliverFlow = [
  { t: "线上下单 / 参团", d: "选品、参团或直供下单" },
  { t: "厂家直发 / 集配", d: "厂家直发到县仓，统仓统配" },
  { t: "送货到村 / 到田", d: "冷链/常温落地配到村站或田头" },
  { t: "扫码验真 · 建档", d: "扫防伪溯源码验真，登记使用" },
  { t: "使用记录入溯源", d: "农资批次进入该地块农产品溯源链" },
];
