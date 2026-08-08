/**
 * 贡献体系模型：全生命周期 + 科学计算公式 + 信用 + 社会地位 + 数字资产
 * 被贡献体系主页、全生命周期页、信用权益页、数字资产页共用。
 */

// ── 全生命周期（出生 → 身后，6 阶段）──────────────────────────────────────
export interface LifeNode { name: string; value: number; done: boolean; }
export interface LifeStage { key: string; name: string; age: string; icon: string; color: string; desc: string; nodes: LifeNode[]; }

export const LIFECYCLE: LifeStage[] = [
  { key: 'infant', name: '育苗期', age: '0-6岁', icon: '🍼', color: '#f472b6', desc: '监护关爱期 · 家庭尽责计分',
    nodes: [{ name: '出生登记', value: 0, done: true }, { name: '健康建档', value: 0, done: true }, { name: '疫苗接种', value: 0, done: true }, { name: '入托入园', value: 0, done: true }] },
  { key: 'growth', name: '成长期', age: '7-17岁', icon: '🌱', color: '#16a34a', desc: '成长积累期',
    nodes: [{ name: '义务教育', value: 30, done: true }, { name: '少先队 / 共青团', value: 20, done: true }, { name: '志愿启蒙', value: 20, done: true }, { name: '技能学习', value: 30, done: false }, { name: '文体特长', value: 20, done: false }] },
  { key: 'career', name: '立业期', age: '18-35岁', icon: '💼', color: '#2563eb', desc: '立业奋斗期',
    nodes: [{ name: '成年·公民责任', value: 30, done: true }, { name: '就业创业', value: 100, done: true }, { name: '参军入伍', value: 120, done: false }, { name: '入党', value: 80, done: true }, { name: '婚育', value: 50, done: false }, { name: '产业带富', value: 120, done: false }] },
  { key: 'duty', name: '担当期', age: '36-59岁', icon: '🤝', color: '#ea580c', desc: '中坚担当期',
    nodes: [{ name: '兴业带富', value: 120, done: false }, { name: '合作帮扶', value: 100, done: false }, { name: '村务议事', value: 60, done: false }, { name: '志愿值守', value: 80, done: false }, { name: '赡养老人', value: 60, done: false }, { name: '教育子女', value: 50, done: false }] },
  { key: 'silver', name: '银龄期', age: '60岁+', icon: '👴', color: '#9333ea', desc: '银龄反哺期',
    nodes: [{ name: '经验传授', value: 40, done: false }, { name: '乡贤助力', value: 50, done: false }, { name: '家风传承', value: 40, done: false }, { name: '邻里调解', value: 40, done: false }] },
  { key: 'legacy', name: '传承期', age: '身后', icon: '🕯️', color: '#78716c', desc: '精神传承期',
    nodes: [{ name: '精神风范入村史', value: 0, done: false }, { name: '功德册铭记', value: 0, done: false }, { name: '家风荣誉传承', value: 0, done: false }] },
];
export const CURRENT_STAGE = 'career'; // 演示：当前用户处于立业期

// ── 社会地位分级 ──────────────────────────────────────────────────────────
export interface SocialRank { label: string; star: number; icon: string; next: number; }
export function socialRank(cv: number): SocialRank {
  if (cv >= 5000) return { label: '时代榜样', star: 6, icon: '🏆', next: 0 };
  if (cv >= 3000) return { label: '乡贤', star: 5, icon: '🎖️', next: 5000 };
  if (cv >= 2000) return { label: '五星贡献者', star: 5, icon: '⭐', next: 3000 };
  if (cv >= 1000) return { label: '四星贡献者', star: 4, icon: '⭐', next: 2000 };
  if (cv >= 500) return { label: '三星贡献者', star: 3, icon: '⭐', next: 1000 };
  if (cv >= 200) return { label: '二星贡献者', star: 2, icon: '⭐', next: 500 };
  if (cv >= 50) return { label: '一星贡献者', star: 1, icon: '⭐', next: 200 };
  return { label: '新晋贡献者', star: 0, icon: '🌱', next: 50 };
}

// ── 信用分（芝麻分式，600起步，上限950）──────────────────────────────────
export function creditScore(cv: number, violations = 0): number {
  return Math.max(600, Math.min(950, Math.round(600 + cv * 0.15 - violations * 50)));
}
export function creditLevel(score: number): string {
  if (score >= 850) return '信用极好';
  if (score >= 750) return '信用优秀';
  if (score >= 700) return '信用良好';
  if (score >= 650) return '信用中等';
  return '信用一般';
}

// ── 数字资产凭证 ──────────────────────────────────────────────────────────
export function certCount(cv: number): number { return Math.floor(cv / 1000); }

// ── 信用权益（按信用分解锁）──────────────────────────────────────────────
export interface Right { name: string; desc: string; icon: string; need: number; }
export const RIGHTS: Right[] = [
  { name: '惠农贷款授信', desc: '享整村授信，信用越高额度越高', icon: '💰', need: 650 },
  { name: '村务议事优先', desc: '提案优先受理、议事话语权重上浮', icon: '🗳️', need: 700 },
  { name: '集体分红权重上浮', desc: '集体经营分红权重 +10%', icon: '📈', need: 750 },
  { name: '评优·入乡贤人才库', desc: '优先评优、纳入乡贤人才库', icon: '🎖️', need: 850 },
];

// ── 科学计算公式（展示用）────────────────────────────────────────────────
export interface Formula { title: string; expr: string; note: string; }
export const FORMULAS: Formula[] = [
  { title: '单次行为分', expr: 'V = B × Wd × Ws × Wt', note: '基础分 × 维度权重 × 社会影响系数 × 时效系数' },
  { title: '累计贡献值', expr: 'CV = Σ V', note: '全生命周期所有行为累加' },
  { title: '信用分', expr: 'Credit = 600 + CV×0.15 − 违规×50', note: '600 起步，上限 950' },
  { title: '数字资产凭证', expr: '凭证数 = ⌊ CV ÷ 1000 ⌋', note: '每满 1000 贡献值生成 1 张链上凭证' },
  { title: '节点收益分红', expr: '个人 = 共享池 × (个人凭证 ÷ 全网凭证)', note: '数字人民币 / 平台积分结算，不发币' },
];
