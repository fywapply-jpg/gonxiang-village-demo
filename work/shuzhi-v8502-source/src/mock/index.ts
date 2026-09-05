/**
 * 数智供社 演示数据（纯前端 mock，不依赖后端）
 * 生产环境由主平台 BFF 层聚合真实接口，替换此文件即可。
 */

export interface Supply {
  id: string;
  name: string;
  emoji: string;
  origin: string;
  spec: string;
  price: number;
  unit: string;
  stock: string;
  grade: string;
  supplier: string;
  certified: boolean;
  qcReport: boolean;
  traceId: string;
  tags: string[];
}

export const supplies: Supply[] = [
  { id: "S1001", name: "赣南脐橙", emoji: "🍊", origin: "江西·赣州", spec: "70-80mm 精品果", price: 4.6, unit: "斤", stock: "现货 120 吨", grade: "特级", supplier: "赣南脐橙合作社", certified: true, qcReport: true, traceId: "GN2026X0781", tags: ["产地直供", "冷链", "溯源"] },
  { id: "S1002", name: "山东大白菜", emoji: "🥬", origin: "山东·潍坊", spec: "净菜 2-3kg/棵", price: 0.9, unit: "斤", stock: "现货 300 吨", grade: "一级", supplier: "潍坊蔬菜产销联合体", certified: true, qcReport: true, traceId: "SD2026B0342", tags: ["应急保供", "统仓统配"] },
  { id: "S1003", name: "云南高原番茄", emoji: "🍅", origin: "云南·玉溪", spec: "串收 200g±", price: 3.2, unit: "斤", stock: "现货 60 吨", grade: "特级", supplier: "玉溪红河谷农业", certified: true, qcReport: true, traceId: "YN2026T0155", tags: ["订单农业", "冷链"] },
  { id: "S1004", name: "五常稻花香米", emoji: "🌾", origin: "黑龙江·五常", spec: "2025 新米 25kg", price: 6.8, unit: "斤", stock: "现货 500 吨", grade: "特级", supplier: "五常金穗米业", certified: true, qcReport: true, traceId: "HL2026R0908", tags: ["地标产品", "溯源"] },
  { id: "S1005", name: "陕西红富士苹果", emoji: "🍎", origin: "陕西·洛川", spec: "80# 一二级混装", price: 3.5, unit: "斤", stock: "现货 200 吨", grade: "一级", supplier: "洛川苹果产业合作社", certified: true, qcReport: false, traceId: "SX2026A0466", tags: ["产地直供"] },
  { id: "S1006", name: "海南贵妃芒", emoji: "🥭", origin: "海南·三亚", spec: "单果 250-350g", price: 5.4, unit: "斤", stock: "现货 40 吨", grade: "特级", supplier: "三亚南繁果业", certified: true, qcReport: true, traceId: "HN2026M0233", tags: ["跨境优选", "冷链"] },
];

export interface Demand {
  id: string;
  title: string;
  category: string;
  qty: string;
  addr: string;
  deadline: string;
  buyer: string;
  budget: string;
  quotes: number;
}

export const demands: Demand[] = [
  { id: "D2001", title: "求购精品脐橙 一次 30 吨", category: "水果", qty: "30 吨", addr: "广东·深圳", deadline: "3 天内", buyer: "锦华连锁生鲜", budget: "≤ 4.8 元/斤", quotes: 12 },
  { id: "D2002", title: "中央厨房长期采购净菜", category: "蔬菜", qty: "5 吨/日", addr: "上海·闵行", deadline: "长期", buyer: "沪上团餐中央厨房", budget: "面议", quotes: 8 },
  { id: "D2003", title: "商超采购五常大米 100 吨", category: "粮油", qty: "100 吨", addr: "北京·朝阳", deadline: "7 天内", buyer: "京客隆商贸", budget: "≤ 7.2 元/斤", quotes: 5 },
  { id: "D2004", title: "食堂集采时令水果", category: "水果", qty: "2 吨/周", addr: "浙江·杭州", deadline: "本周", buyer: "之江高校后勤", budget: "面议", quotes: 3 },
];

export interface AgriProduct {
  id: string;
  name: string;
  emoji: string;
  cat: string;
  spec: string;
  price: number;
  unit: string;
  brand: string;
  groupPrice?: number;
  groupCount?: number;
  traceable: boolean;
}

export const agriCats = ["化肥", "种子", "农药", "农机"];

export const agriProducts: AgriProduct[] = [
  { id: "A3001", name: "复合肥 45%(15-15-15)", emoji: "🧪", cat: "化肥", spec: "40kg/袋", price: 128, unit: "袋", brand: "中农控股", groupPrice: 112, groupCount: 100, traceable: true },
  { id: "A3002", name: "杂交水稻种 Ⅱ优航", emoji: "🌱", cat: "种子", spec: "1kg/包", price: 68, unit: "包", brand: "隆平高科", groupPrice: 59, groupCount: 200, traceable: true },
  { id: "A3003", name: "吡虫啉 10% 可湿性粉", emoji: "🧴", cat: "农药", spec: "500g/瓶", price: 26, unit: "瓶", brand: "先正达", traceable: true },
  { id: "A3004", name: "背负式电动喷雾器", emoji: "🚜", cat: "农机", spec: "16L 锂电", price: 258, unit: "台", brand: "华盛农机", groupPrice: 228, groupCount: 50, traceable: false },
  { id: "A3005", name: "有机水溶肥", emoji: "🧪", cat: "化肥", spec: "5kg/桶", price: 96, unit: "桶", brand: "史丹利", groupPrice: 85, groupCount: 80, traceable: true },
  { id: "A3006", name: "大棚滴灌带", emoji: "💧", cat: "农机", spec: "1000m/卷", price: 180, unit: "卷", brand: "大禹节水", traceable: false },
];

export interface Order {
  id: string;
  title: string;
  emoji: string;
  amount: number;
  qty: string;
  status: "待确认" | "待发货" | "运输中" | "待收货" | "已完成" | "售后";
  time: string;
  counterparty: string;
  chainHash: string;
}

export const orders: Order[] = [
  { id: "O240701", title: "赣南脐橙 特级", emoji: "🍊", amount: 276000, qty: "30 吨", status: "运输中", time: "2026-06-29", counterparty: "锦华连锁生鲜", chainHash: "0x8f3a…c21d" },
  { id: "O240628", title: "五常稻花香米", emoji: "🌾", amount: 1360000, qty: "100 吨", status: "待收货", time: "2026-06-26", counterparty: "京客隆商贸", chainHash: "0x1b7e…9a04" },
  { id: "O240620", title: "复合肥 45% 集采", emoji: "🧪", amount: 11200, qty: "100 袋", status: "已完成", time: "2026-06-18", counterparty: "中农控股", chainHash: "0x55cd…7f18" },
  { id: "O240615", title: "云南高原番茄", emoji: "🍅", amount: 192000, qty: "30 吨", status: "待发货", time: "2026-06-14", counterparty: "沪上团餐中央厨房", chainHash: "0x2a9f…33be" },
];

export interface FinanceProduct {
  id: string;
  name: string;
  target: string;
  rate: string;
  limit: string;
  desc: string;
  icon: string;
  cat: "生产端" | "流通端" | "城市端" | "特色";
}

export const financeProducts: FinanceProduct[] = [
  { id: "F1", name: "订单贷", target: "供应商 / 农资采购方", rate: "3.85%~5.6%", limit: "最高 500 万", desc: "凭链上真实订单预支货款，随借随还", icon: "📑", cat: "生产端" },
  { id: "F2", name: "仓单质押贷", target: "产地供应商", rate: "4.2%~6.0%", limit: "仓单价值 70%", desc: "电子仓单在线质押，货押不押钱", icon: "🏬", cat: "流通端" },
  { id: "F3", name: "应收账款保理", target: "供应商", rate: "4.5%~6.5%", limit: "账款 80%", desc: "对公应收账款转让融资，缓解账期压力", icon: "💳", cat: "流通端" },
  { id: "F4", name: "农机购置贷", target: "农资采购方", rate: "3.6%~5.0%", limit: "最高 50 万", desc: "农机具分期购置，享国补贴息", icon: "🚜", cat: "生产端" },
  { id: "F5", name: "采购账期融资", target: "采购商", rate: "4.0%~5.8%", limit: "最高 300 万", desc: "先货后款，延长采购账期", icon: "🛒", cat: "城市端" },
  { id: "F6", name: "碳汇资产质押", target: "合作社", rate: "面议", limit: "评估价 60%", desc: "农业碳汇确权后质押 / 交易", icon: "🌿", cat: "特色" },
];

/** 溯源批次全链路（对应细则「3.4 全链路可信溯源」） */
export const traceBatch = {
  traceId: "GN2025X0781",
  product: "赣南脐橙 · 特级",
  emoji: "🍊",
  batch: "2025 秋季 · 第 07 批",
  chain: {
    block: 4820193,
    hash: "0x8f3a6b1d9c47e2f05a8b3c21d7e4f9a0c21d",
    time: "2025-11-06 09:14:22",
    verified: true,
    chainName: "长安链 · 存证监管链",
  },
  stages: [
    { key: "plant", title: "种植端", icon: "🌱", items: [["地块", "江西省赣州市信丰县安西镇范庄村 08 号地块"], ["播种", "2025-03-12"], ["农资使用", "有机肥 · 生物农药（残留合规）"], ["气象", "年均 19.3℃ / 降水 1560mm"]] },
    { key: "process", title: "加工端", icon: "🏭", items: [["分拣批次", "P-0781-A"], ["采收/加工", "2025-10-28 采收 · 10-29 分拣加工"], ["质检报告", "农残/重金属 全项合格 ✔"]] },
    { key: "flow", title: "流通端", icon: "🚚", items: [["仓储", "赣州产地冷链中心 3 号库"], ["冷链温度", "全程 4~6℃"], ["运输轨迹", "赣州 → 深圳（在途 620km · 11-02~11-04）"]] },
    { key: "sale", title: "销售端", icon: "🏪", items: [["销售主体", "锦华连锁生鲜（深圳）"], ["入库时间", "2025-11-04 22:10"]] },
  ],
};

/** 价格指数（对应「区域农产品价格指数看板」） */
export const priceIndex = [
  { name: "脐橙", cat: "水果", price: 4.62, delta: 2.1 },
  { name: "大白菜", cat: "蔬菜", price: 0.88, delta: -3.4 },
  { name: "番茄", cat: "蔬菜", price: 3.15, delta: 1.2 },
  { name: "稻花香米", cat: "粮油", price: 6.85, delta: 0.5 },
  { name: "红富士", cat: "水果", price: 3.48, delta: -1.1 },
  { name: "生猪", cat: "畜禽", price: 8.9, delta: 4.2 },
];

/** 信用资产（对应「3.5.4 信用资产中心」） */
export const creditDetail = {
  score: 786,
  level: "B（演示）",
  dims: [
    { name: "KYB与授权完整度", score: 88, weight: "准入项" },
    { name: "合同履约", score: 92, weight: "25%" },
    { name: "交付时效", score: 80, weight: "20%" },
    { name: "质量验收", score: 74, weight: "25%" },
    { name: "支付与开票", score: 83, weight: "15%" },
    { name: "争议判责", score: 76, weight: "15%" },
  ],
  benefits: ["企业履约档案可查", "获得适配交易机会推荐", "可授权向持牌机构提交事实包", "风险事项提前预警"],
};

/** 全民分红（对应「4.6 全民分红与收益分配」「3.5.6 全民分红查询」） */
export const dividend = {
  total: 1286.5,
  rule: "仅对依法表决并写入生效章程 / 专项合同的税后可分配增值收益执行分配；比例、基数、对象和发放批次以项目台账及结算回单为准。普通 B2B 货款和平台技术服务费不自动进入全民分红。",
  records: [
    { period: "2026 Q2", type: "全民均分", amount: 320.0, time: "2026-06-30", hash: "0x71c2…" },
    { period: "2026 Q2", type: "信用加权", amount: 486.5, time: "2026-06-30", hash: "0x71c3…" },
    { period: "2026 Q1", type: "全民均分", amount: 300.0, time: "2026-03-31", hash: "0x5ad9…" },
    { period: "2026 Q1", type: "信用加权", amount: 180.0, time: "2026-03-31", hash: "0x5ad8…" },
  ],
};

/** 物流运单（对应「3.6 仓储物流」） */
export const waybill = {
  no: "SF-CL-20260629-0781",
  order: "O240701",
  from: "赣州产地冷链中心",
  to: "深圳锦华连锁生鲜仓",
  cargo: "赣南脐橙 特级 30 吨",
  temp: 4.8,
  tempRange: "4~6℃",
  eta: "2026-06-30 22:00",
  progress: 68,
  nodes: [
    { name: "赣州冷链中心 出库", time: "06-29 22:10", done: true },
    { name: "赣州南 高速卡口", time: "06-29 23:40", done: true },
    { name: "韶关 冷链中转", time: "06-30 06:20", done: true },
    { name: "东莞 分拨中心", time: "预计 06-30 18:30", done: false },
    { name: "深圳 锦华生鲜仓", time: "预计 06-30 22:00", done: false },
  ],
};

export const warehouseReceipts = [
  { id: "WR-0781", cargo: "赣南脐橙 特级", qty: "120 吨", value: "110.4 万", status: "正常", warehouse: "赣州产地冷链中心 3 号库" },
  { id: "WR-0908", cargo: "五常稻花香米", qty: "500 吨", value: "680 万", status: "质押中", warehouse: "五常金穗中心库" },
  { id: "WR-0342", cargo: "潍坊大白菜", qty: "300 吨", value: "52.8 万", status: "已核销", warehouse: "潍坊蔬菜前置仓" },
];

export interface Msg {
  id: string;
  type: "订单" | "询盘" | "金融" | "物流" | "公告";
  title: string;
  desc: string;
  time: string;
  unread: boolean;
}

export const messages: Msg[] = [
  { id: "M1", type: "物流", title: "冷链温度告警已解除", desc: "运单 SF-CL-…0781 温度回落至 4.8℃", time: "10 分钟前", unread: true },
  { id: "M2", type: "订单", title: "订单已发货", desc: "O240701 赣南脐橙 30 吨 已出库", time: "1 小时前", unread: true },
  { id: "M3", type: "金融", title: "融资申请进度更新", desc: "订单贷已放款，进入受托支付上游环节", time: "3 小时前", unread: true },
  { id: "M4", type: "询盘", title: "收到新报价", desc: "锦华连锁生鲜 对您的脐橙报价 4.6 元/斤", time: "昨天", unread: false },
  { id: "M5", type: "公告", title: "应急保供专区上线", desc: "潍坊大白菜纳入保供调度，欢迎参与", time: "2 天前", unread: false },
];

export const stationBoard = {
  name: "龙南镇供销服务站",
  today: { orders: 46, serve: 128, agent: 12 },
  todos: [
    { title: "代办入驻 · 安西脐橙合作社", tag: "入驻代办" },
    { title: "现场登记 · 08 号地块脐橙收购", tag: "业务登记" },
    { title: "设备报修 · 3 号冷库温控终端", tag: "运维上报" },
  ],
};
