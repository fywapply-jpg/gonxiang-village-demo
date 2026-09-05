// 统仓统配 · 冷链配送调度 数据

// 三级仓配网络
export const netHub = { name: "枢纽中心仓", grade: "一级农批市场枢纽仓", cap: "12 万㎡ · 冷库 3 万吨 · 96 个月台" };
export interface Satellite { name: string; area: string; cover: string; }
export const satellites: Satellite[] = [
  { name: "城东卫星仓", area: "东丽 / 滨海", cover: "覆盖 6 街道" },
  { name: "城西卫星仓", area: "西青 / 武清", cover: "覆盖 8 街道" },
  { name: "城南前置仓", area: "津南 / 静海", cover: "覆盖 5 街道" },
];
export interface Terminal { icon: string; name: string; }
export const terminals: Terminal[] = [
  { icon: "🏪", name: "到摊(农贸)" }, { icon: "🏘️", name: "到店(夫妻店)" }, { icon: "🍚", name: "到厨房(央厨)" },
  { icon: "🍽️", name: "到店(餐饮)" }, { icon: "🎓", name: "到校(学生餐)" }, { icon: "🏛️", name: "到食堂(机关)" },
];

// 时效分层（不同小端不同配送窗口）
export interface Sla { tier: string; ends: string; window: string; note: string; color: string; }
export const slaTiers: Sla[] = [
  { tier: "凌晨配", ends: "农贸商户 / 夫妻店", window: "03:00-06:00", note: "当日鲜货、开门即到", color: "#2b6cb0" },
  { tier: "当日达", ends: "中央厨房 / 餐饮公司", window: "按餐次 T+0", note: "净菜按出餐节奏直配", color: "#16884c" },
  { tier: "次日达", ends: "食品加工 / 机关食堂", window: "T+1 定时", note: "大宗原料计划配送", color: "#d99a2b" },
  { tier: "专车专送", ends: "军供 / 学生餐", window: "定点定时", note: "资质核验、全程可追、优先保障", color: "#c0392b" },
];

// 冷链温区
export interface TempZone { zone: string; temp: string; cargo: string; }
export const tempZones: TempZone[] = [
  { zone: "冷冻区", temp: "-18℃", cargo: "冻品 / 肉禽水产" },
  { zone: "冷藏区", temp: "0~4℃", cargo: "叶菜 / 鲜肉 / 蛋奶" },
  { zone: "恒温区", temp: "10~15℃", cargo: "粮油 / 根茎 / 南北货" },
];
// 24h 温度曲线（冷藏车厢，℃）
export const tempCurve = [3.6, 3.8, 4.0, 3.9, 4.1, 3.7, 3.5, 3.8, 4.2, 4.0, 3.6, 3.9];

// 智能路由 / 拼单集配
export const routeStats = { orders: 1860, cars: 142, pooled: "68%", saveRate: "22%" };

// 一单到铺号的配送轨迹
export interface Track { t: string; d: string; time: string; }
export const trackNodes: Track[] = [
  { t: "枢纽仓分拣装车", d: "按铺号波次分拣，冷链装柜、铅封", time: "03:12" },
  { t: "干线冷链运输", d: "全程温控 GPS，实时温度曲线", time: "03:40" },
  { t: "城西卫星仓中转", d: "越库分拨，二次拼单就近派", time: "04:25" },
  { t: "落地配派送", d: "冷链小车按路由派送到点", time: "05:10" },
  { t: "到铺号签收（A-12）", d: "GPS 到点 + 电子签收 + 温度存证上链", time: "05:38" },
];
