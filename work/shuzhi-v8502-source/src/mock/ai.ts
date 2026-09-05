// AI 智能中枢 · 数据

export const aiKpis = [
  { n: "18", l: "AI 模型" },
  { n: "260 万", l: "日均调用" },
  { n: "92.4%", l: "预测准确率" },
  { n: "3.1 亿", l: "服务主体" },
];

// 六大 AI 能力
export interface AiCap { key: string; icon: string; n: string; d: string; }
export const aiCaps: AiCap[] = [
  { key: "pick", icon: "🎯", n: "智能选品荐货", d: "按店型/季节/动销/毛利，给小端推荐进货组合" },
  { key: "price", icon: "📈", n: "价格预测", d: "农产品价格指数 7/30 日走势预测，辅助买卖决策" },
  { key: "risk", icon: "🛡️", n: "智能风控", d: "信贷反欺诈、异常交易与虚假贸易识别" },
  { key: "match", icon: "🤝", n: "供需智能撮合", d: "供货 ↔ 采购自动匹配，就近优先、成本最优" },
  { key: "quality", icon: "🔍", n: "AI 品质识别", d: "图像识别农产品分级、缺陷与病虫害" },
  { key: "qa", icon: "💬", n: "AI 农技客服", d: "农技问答、政策解读、7×24 智能应答" },
];

// AI 价格预测（历史 7 日 + 预测 7 日，元/斤 或 元/公斤）
export interface Forecast { n: string; unit: string; hist: number[]; fore: number[]; trend: string; conf: string; advice: string; }
export const forecasts: Forecast[] = [
  { n: "大白菜", unit: "元/斤", hist: [1.2, 1.25, 1.3, 1.28, 1.35, 1.4, 1.42], fore: [1.45, 1.5, 1.56, 1.6, 1.63, 1.65, 1.68], trend: "↑ 上行 +18%", conf: "置信度 91%", advice: "预计持续上行，建议采购方提前锁量、种植方分批出货" },
  { n: "猪肉", unit: "元/斤", hist: [13.8, 13.6, 13.5, 13.2, 13.0, 12.8, 12.6], fore: [12.5, 12.3, 12.2, 12.0, 11.9, 11.8, 11.7], trend: "↓ 下行 -7%", conf: "置信度 88%", advice: "供给回升、价格走弱，建议加工企业按需采购、避免囤货" },
  { n: "苹果", unit: "元/斤", hist: [3.6, 3.6, 3.7, 3.7, 3.8, 3.8, 3.9], fore: [3.9, 3.95, 4.0, 4.05, 4.05, 4.1, 4.1], trend: "↑ 温和 +5%", conf: "置信度 93%", advice: "库存偏低、价格温和上行，可逢低适量备货" },
];

// AI 智能选品（按店型推荐进货）
export interface Pick { store: string; icon: string; items: { n: string; qty: string; reason: string }[]; }
export const picks: Pick[] = [
  { store: "社区夫妻店", icon: "🏘️", items: [
    { n: "鸡蛋", qty: "8 板/日", reason: "刚需高频、动销 Top1" },
    { n: "本地叶菜", qty: "40 斤/日", reason: "损耗低、复购强" },
    { n: "临期特价奶", qty: "3 箱", reason: "引流爆品、提毛利" },
  ] },
  { store: "农贸市场摊", icon: "🏪", items: [
    { n: "时令水果", qty: "50 斤/日", reason: "当季价优、周转快" },
    { n: "净菜组合", qty: "30 份/日", reason: "省事需求上升" },
    { n: "鲜猪肉", qty: "1 扇/日", reason: "价格下行、走量" },
  ] },
  { store: "中央厨房", icon: "🍚", items: [
    { n: "净菜(定制切)", qty: "3 吨/日", reason: "按菜谱 BOM 测算" },
    { n: "冻品肉禽", qty: "按餐次", reason: "锁价采购稳成本" },
    { n: "主食米面", qty: "2 吨/日", reason: "大宗集采压价" },
  ] },
];
