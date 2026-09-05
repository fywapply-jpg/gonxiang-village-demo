// 中央厨房菜谱 BOM 测算 + 机关食堂阳光招采 数据

// ========== 中央厨房 · 菜谱 BOM ==========
export interface Ingredient { mat: string; g: number; } // 每份用量（克）
export interface Dish { key: string; name: string; icon: string; ings: Ingredient[]; }

// 原料单价（元 / 公斤）
export const matPrice: Record<string, number> = {
  鸡胸肉: 18, 牛腩: 62, 五花肉: 26, 鸡蛋: 10, 番茄: 5, 黄瓜: 4, 土豆: 3,
  青椒: 6, 花生米: 14, 大米: 5.6, 面粉: 4.2, 食用油: 12, 娃娃菜: 5, 木耳: 46, 豆腐: 6,
};

export const dishes: Dish[] = [
  { key: "gbjd", name: "宫保鸡丁", icon: "🍗", ings: [{ mat: "鸡胸肉", g: 120 }, { mat: "花生米", g: 20 }, { mat: "黄瓜", g: 30 }, { mat: "食用油", g: 15 }] },
  { key: "xhsjd", name: "西红柿炒蛋", icon: "🍅", ings: [{ mat: "番茄", g: 150 }, { mat: "鸡蛋", g: 80 }, { mat: "食用油", g: 12 }] },
  { key: "tddnr", name: "土豆炖牛腩", icon: "🥩", ings: [{ mat: "牛腩", g: 90 }, { mat: "土豆", g: 120 }, { mat: "食用油", g: 10 }] },
  { key: "qcssc", name: "清炒时蔬", icon: "🥬", ings: [{ mat: "娃娃菜", g: 160 }, { mat: "食用油", g: 10 }] },
  { key: "mydf", name: "木耳烧豆腐", icon: "🍲", ings: [{ mat: "豆腐", g: 120 }, { mat: "木耳", g: 15 }, { mat: "青椒", g: 20 }, { mat: "食用油", g: 10 }] },
  { key: "mifan", name: "米饭", icon: "🍚", ings: [{ mat: "大米", g: 150 }] },
];

// ========== 机关食堂 · 阳光招采 ==========
export interface BidItem { name: string; qty: string; }
export interface Bid {
  supplier: string; short: string;
  price: number;      // 报价（万元）
  qualScore: number;  // 资质分 0-100
  perfScore: number;  // 履约分 0-100
  cert: string;       // 资质亮点
}
export interface BidCase {
  title: string;
  budget: number;     // 预算（万元）
  cycle: string;
  items: BidItem[];
  bids: Bid[];
}

export const bidCase: BidCase = {
  title: "市直机关食堂 · 9 月大宗食材采购包",
  budget: 86,
  cycle: "月度框架 · 分批配送",
  items: [
    { name: "大宗米面油", qty: "12 吨" },
    { name: "时令蔬菜", qty: "28 吨" },
    { name: "猪牛禽肉", qty: "9 吨" },
    { name: "鲜蛋豆制品", qty: "6 吨" },
  ],
  bids: [
    { supplier: "红旗农批直供联营体", short: "红旗", price: 79.2, qualScore: 95, perfScore: 96, cert: "一级农批直采 · A级溯源 · 3年0违约" },
    { supplier: "冀农优选供应链", short: "冀农", price: 76.5, qualScore: 88, perfScore: 90, cert: "省级龙头 · HACCP · 履约良好" },
    { supplier: "惠民食材配送公司", short: "惠民", price: 74.8, qualScore: 82, perfScore: 78, cert: "本地配送 · 价格低 · 履约一般" },
  ],
};

// 综合评分：价格分（越低越高，占50%）+ 资质分（25%）+ 履约分（25%）
export function bidScore(b: Bid, bids: Bid[]): number {
  const min = Math.min(...bids.map((x) => x.price));
  const priceScore = (min / b.price) * 100; // 最低价得满分
  return +(priceScore * 0.5 + b.qualScore * 0.25 + b.perfScore * 0.25).toFixed(1);
}
