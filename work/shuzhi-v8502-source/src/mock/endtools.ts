// 八类小端的其余 6 类专属工具数据（中央厨房BOM、机关食堂招采见 procure.ts）

// 1. 农贸市场商户 · 当日行情批货单
export interface MarketRow { name: string; price: number; chg: number; unit: string; }
export const marketBoard: MarketRow[] = [
  { name: "大白菜", price: 1.2, chg: -0.1, unit: "斤" },
  { name: "土豆", price: 1.8, chg: 0.2, unit: "斤" },
  { name: "西红柿", price: 3.2, chg: 0.4, unit: "斤" },
  { name: "黄瓜", price: 2.6, chg: -0.2, unit: "斤" },
  { name: "猪后腿肉", price: 14.5, chg: -0.5, unit: "斤" },
  { name: "鸡蛋", price: 5.6, chg: 0, unit: "斤" },
  { name: "带鱼", price: 12.0, chg: 0.8, unit: "斤" },
  { name: "苹果", price: 4.5, chg: 0.1, unit: "斤" },
];

// 2. 社区门店·夫妻店 · 智能补货
export interface StoreSku { name: string; stock: number; daily: number; sug: number; unit: string; price: number; }
export const storeSkus: StoreSku[] = [
  { name: "袋装大米 5kg", stock: 6, daily: 3, sug: 18, unit: "袋", price: 32 },
  { name: "鸡蛋（30枚/盒）", stock: 3, daily: 6, sug: 30, unit: "盒", price: 18 },
  { name: "鲜牛奶（箱）", stock: 4, daily: 5, sug: 24, unit: "箱", price: 45 },
  { name: "挂面（袋）", stock: 10, daily: 4, sug: 16, unit: "袋", price: 6 },
  { name: "食用油 5L", stock: 2, daily: 1, sug: 8, unit: "桶", price: 62 },
  { name: "时令蔬菜包", stock: 5, daily: 8, sug: 40, unit: "份", price: 9 },
];
export const storeExpiring = [
  { name: "临期鲜奶", off: "6 折", exp: "明日到期" },
  { name: "临期面包", off: "5 折", exp: "今日到期" },
];

// 3. 食品加工企业 · 原料年单锁价
export interface ProcMat { name: string; perTon: number; spot: number; lock: number; unit: string; }
// perTon：每加工 1 吨成品所需原料（吨）；spot 现价；lock 锁定价（元/吨）
export const procMats: ProcMat[] = [
  { name: "小麦", perTon: 1.25, spot: 2820, lock: 2760, unit: "吨" },
  { name: "玉米", perTon: 0.30, spot: 2460, lock: 2400, unit: "吨" },
  { name: "大豆", perTon: 0.20, spot: 4980, lock: 4850, unit: "吨" },
];

// 4. 餐饮服务公司 · 多门店集单
export interface CateringStore { store: string; area: string; qty: number; } // qty：该店本期报量（份/日）
export const cateringStores: CateringStore[] = [
  { store: "中关村旗舰店", area: "海淀", qty: 1200 },
  { store: "国贸店", area: "朝阳", qty: 900 },
  { store: "望京店", area: "朝阳", qty: 800 },
  { store: "亦庄店", area: "大兴", qty: 600 },
];
export const cateringUnit = 12.5; // 每份食材成本（元）
export const cateringSaveRate = 0.08; // 集采较分散采购降本比例

// 5. 军队食材配送 · 军供计划配送
export interface ArmyPlanRow { day: string; cat: string; qty: string; point: string; }
export const armyPlan: ArmyPlanRow[] = [
  { day: "周一", cat: "主食（米/面）", qty: "800 kg", point: "一号食堂" },
  { day: "周二", cat: "肉禽蛋", qty: "500 kg", point: "一号食堂" },
  { day: "周三", cat: "时令蔬菜", qty: "1200 kg", point: "二号食堂" },
  { day: "周四", cat: "副食调味", qty: "300 kg", point: "综合仓" },
  { day: "周五", cat: "应急储备轮换", qty: "按预案", point: "战备库" },
];
export const armyChecks = ["军供名录准入 ✔", "双人双锁交接 ✔", "全程冷链 GPS ✔", "食安 A 级全项检测 ✔"];

// 6. 学生食材供应 · 带量食谱配餐
export interface MenuDish { name: string; grams: number; protein: number; kcal: number; } // 每生每餐克数/蛋白(g)/热量(kcal)
export const studentMeals: { key: string; name: string; dishes: MenuDish[] }[] = [
  { key: "breakfast", name: "早餐", dishes: [
    { name: "鸡蛋", grams: 50, protein: 6, kcal: 78 },
    { name: "牛奶", grams: 200, protein: 6, kcal: 130 },
    { name: "馒头", grams: 80, protein: 6, kcal: 210 },
  ]},
  { key: "lunch", name: "午餐", dishes: [
    { name: "米饭", grams: 150, protein: 4, kcal: 195 },
    { name: "鸡胸肉", grams: 80, protein: 18, kcal: 130 },
    { name: "时令蔬菜", grams: 150, protein: 3, kcal: 60 },
  ]},
  { key: "dinner", name: "晚餐", dishes: [
    { name: "米饭", grams: 120, protein: 3, kcal: 156 },
    { name: "豆腐", grams: 100, protein: 8, kcal: 82 },
    { name: "青菜", grams: 150, protein: 3, kcal: 55 },
  ]},
];
