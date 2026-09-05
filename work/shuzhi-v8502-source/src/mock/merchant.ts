// 商户星级评定 · 依据口碑、年营收、信用、履约等综合评定

export interface StarDim { name: string; weight: string; score: number; desc: string; }
export interface StarLevel { star: number; name: string; color: string; benefits: string[]; }

// 星级等级与权益
export const starLevels: StarLevel[] = [
  { star: 5, name: "金牌商户", color: "#d99a2b", benefits: ["首页/搜索优先曝光", "授信额度上浮 30%", "免交易保证金", "优先撮合与保供调度"] },
  { star: 4, name: "优质商户", color: "#16884c", benefits: ["搜索优先展示", "授信额度上浮 15%", "保证金减半"] },
  { star: 3, name: "合格商户", color: "#2b6cb0", benefits: ["正常经营权限", "标准授信额度"] },
  { star: 2, name: "成长商户", color: "#9aa0aa", benefits: ["基础经营权限", "限额授信"] },
  { star: 1, name: "新入驻商户", color: "#9aa0aa", benefits: ["试运营权限", "需缴纳保证金"] },
];

// 当前商户星级档案（演示）
export const merchantProfile = {
  org: "赣南脐橙合作社",
  star: 5,
  levelName: "金牌商户",
  score: 92,
  dims: [
    { name: "口碑评价", weight: "30%", score: 96, desc: "综合评分 4.8 · 好评率 98%" },
    { name: "年营收规模", weight: "25%", score: 88, desc: "近12月成交 2860 万" },
    { name: "信用资产", weight: "30%", score: 92, desc: "信用分 786 · AA 级" },
    { name: "履约记录", weight: "15%", score: 90, desc: "准时交付率 97% · 0 违约" },
  ] as StarDim[],
  next: "距离维持金牌需保持好评率 ≥ 95%、准时率 ≥ 95%",
};

// 依据评分给出星级（用于卡片展示）
export function starOf(rating: number): number {
  if (rating >= 4.7) return 5;
  if (rating >= 4.4) return 4;
  if (rating >= 4.0) return 3;
  if (rating >= 3.5) return 2;
  return 1;
}
export function starName(star: number): string {
  return (starLevels.find((l) => l.star === star) || starLevels[2]).name;
}
