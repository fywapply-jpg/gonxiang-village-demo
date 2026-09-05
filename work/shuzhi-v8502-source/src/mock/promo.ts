// 小B端推广分销体系 · 制度与数据
// 推广组织必须为村集体/社区集体所有控股企业；佣金平台4:组织6；组织负责关系维护+舆情处理；配套考核。

// —— 制度 ——
export const SPLIT = { platform: 40, org: 60 }; // 佣金分成比例（%）

export const promoEligibility = [
  "必须是【村集体 / 社区集体 / 企业集体】所有控股企业（集体持股 ≥ 51%）",
  "由各村、社区、企业集体组织成立或授权设立，属地化运营",
  "需提供：集体股权结构证明、集体经济组织登记证、集体决议、法人资质",
  "一村 / 一社区 / 一园区一组织，划定专属推广区域，不越界",
];

export interface Duty { icon: string; t: string; d: string; }
export const promoDuties: Duty[] = [
  { icon: "🌱", t: "拉新入驻", d: "动员周边小端上平台，协助资质、门店定位、铺号、法人认证" },
  { icon: "🤝", t: "关系维护", d: "定期回访答疑，协助小端用好平台，提升活跃与留存" },
  { icon: "📣", t: "舆情处理", d: "第一时间响应投诉、纠纷、负面，属地化解、上报闭环" },
  { icon: "🎓", t: "培训赋能", d: "教小端用批货/补货/招采/BOM 等专属工具" },
  { icon: "📜", t: "政策传达", d: "把平台政策、补贴、活动传达到户，落地不走样" },
  { icon: "📊", t: "数据反馈", d: "收集小端诉求，反馈平台优化产品与服务" },
];

export interface Kpi { name: string; weight: number; target: string; }
export const promoKpis: Kpi[] = [
  { name: "拉新入驻数 / 转化率", weight: 25, target: "月拉新 ≥ 8 户，转化率 ≥ 60%" },
  { name: "小端活跃率", weight: 20, target: "月活占比 ≥ 75%" },
  { name: "带动 GMV", weight: 20, target: "月度环比增长 ≥ 10%" },
  { name: "关系维护及时率", weight: 12, target: "回访 / 响应 48h 内 ≥ 95%" },
  { name: "舆情处理时效", weight: 13, target: "2h 内响应，24h 化解率 ≥ 90%" },
  { name: "满意度 / 投诉率", weight: 10, target: "满意度 ≥ 90%，投诉率 ≤ 2%" },
];

export interface FlowStep { t: string; d: string; }
export const promoFlow: FlowStep[] = [
  { t: "① 集体组织申报", d: "村 / 社区 / 企业集体控股企业提交申报" },
  { t: "② 资质审核（集体控股核验）", d: "核验集体持股 ≥51%、登记证、集体决议" },
  { t: "③ 授予属地推广权", d: "划定服务区域、签独立推广服务合同、明确计费基数与分配比例" },
  { t: "④ 认证推广员", d: "推广员实名 + 人脸认证，绑定组织" },
  { t: "⑤ 推广拉新", d: "小端入驻绑定推荐关系，推荐链上存证" },
  { t: "⑥ 交易产生佣金", d: "小端在平台产生服务费 / 交易佣金基数" },
  { t: "⑦ 服务费分配结算", d: "按生效合同、验收、发票和持牌结算回单执行，按月结算、上链" },
  { t: "⑧ 维护 + 舆情 + 考核", d: "关系维护、舆情处理工单闭环，考核评级定佣金系数与续约" },
];

// —— 考核评级 → 佣金系数（干得好多拿、干得差折减，差额由平台激励池调节）——
export interface CoefTier { grade: string; min: number; k: number; label: string; }
export const COEF: CoefTier[] = [
  { grade: "A", min: 90, k: 1.1, label: "优秀 · 加成 10%" },
  { grade: "B", min: 80, k: 1.0, label: "合格 · 标准" },
  { grade: "C", min: 70, k: 0.8, label: "待改进 · 折减 20%" },
  { grade: "D", min: 0, k: 0.6, label: "不合格 · 折减 40% / 约谈退出" },
];
export function coefOf(score: number): CoefTier { return COEF.find((c) => score >= c.min) || COEF[COEF.length - 1]; }

// 组织实发的三分配：推广员提成 / 运营成本 / 集体经济分红反哺
export const ORG_ALLOC = { promoter: 35, ops: 25, collective: 40 }; // %

// —— 推广组织（村社集体控股企业）——
export interface PromoOrg {
  id: string; name: string; type: string; holding: number; // 集体控股比例
  region: string; promoters: number; ends: number; active: number;
  gmv: string; commission: string; score: number; status: string;
  baseComm: number;   // 本月基础组织分成（6成，元）
  collective: string; // 反哺的集体经济组织
  members: number;    // 集体成员（户）
  people: number;     // 集体成员（人）
}
export const promoOrgs: PromoOrg[] = [
  { id: "PO001", name: "范庄村集体电商服务公司", type: "村集体控股", holding: 100, region: "江西省赣州市信丰县安西镇范庄村", promoters: 6, ends: 84, active: 71, gmv: "1860 万/月", commission: "11.2 万/月", score: 92, status: "运营中", baseComm: 112000, collective: "江西省赣州市信丰县安西镇范庄村集体经济组织", members: 620, people: 1860 },
  { id: "PO002", name: "华明街道社区集体服务社", type: "社区集体控股", holding: 67, region: "天津市东丽区华明街道华明社区", promoters: 4, ends: 56, active: 44, gmv: "1120 万/月", commission: "6.7 万/月", score: 86, status: "运营中", baseComm: 67000, collective: "天津市东丽区华明街道华明社区集体", members: 3200, people: 8600 },
  { id: "PO003", name: "军粮城产业园集体运营公司", type: "企业集体控股", holding: 55, region: "天津市东丽区军粮城镇产业园", promoters: 3, ends: 38, active: 28, gmv: "760 万/月", commission: "4.6 万/月", score: 78, status: "运营中", baseComm: 46000, collective: "天津市东丽区军粮城镇产业园集体", members: 86, people: 1200 },
];

// —— 推广员 ——
export interface Promoter { id: string; name: string; org: string; ends: number; active: number; month: string; pending: number; opinion: number; score: number; }
export const promoters: Promoter[] = [
  { id: "PM01", name: "张建国", org: "范庄村集体电商服务公司", ends: 22, active: 19, month: "3.1 万", pending: 3, opinion: 1, score: 94 },
  { id: "PM02", name: "李秀兰", org: "范庄村集体电商服务公司", ends: 18, active: 16, month: "2.4 万", pending: 2, opinion: 0, score: 90 },
  { id: "PM03", name: "王海涛", org: "华明街道社区集体服务社", ends: 16, active: 12, month: "1.9 万", pending: 4, opinion: 2, score: 83 },
];

// —— 推广服务费示例台账（base = 小端本月产生的独立服务费基数）——
export interface CommRow { end: string; endType: string; base: number; }
export const commRows: CommRow[] = [
  { end: "范庄综合农贸摊(A-12)", endType: "农贸市场商户", base: 8600 },
  { end: "数智供社便利店", endType: "社区门店·夫妻店", base: 6200 },
  { end: "沪上团餐中央厨房", endType: "中央厨房", base: 42000 },
  { end: "军粮城米业加工", endType: "食品加工企业", base: 28000 },
  { end: "锦华连锁餐饮", endType: "餐饮服务公司", base: 15000 },
  { end: "区教育局配送中心", endType: "学生食材供应", base: 22000 },
];

// —— 舆情 / 关系维护工单 ——
export interface Ticket { id: string; end: string; type: string; level: string; content: string; status: string; promoter: string; }
export const promoTickets: Ticket[] = [
  { id: "YQ001", type: "投诉舆情", level: "高", end: "数智供社便利店", content: "小端反映某批次蔬菜品质不达标，已在业主群发酵", status: "处理中", promoter: "李秀兰" },
  { id: "YQ002", type: "关系维护", level: "中", end: "范庄综合农贸摊", content: "摊主反映批货配送晚点，需回访安抚并协调时效", status: "待处理", promoter: "张建国" },
  { id: "YQ003", type: "纠纷协调", level: "中", end: "锦华连锁餐饮", content: "对账金额有异议，需属地推广员协助核对", status: "已化解", promoter: "王海涛" },
  { id: "YQ004", type: "关系维护", level: "低", end: "军粮城米业加工", content: "季度回访 + 新工具培训预约", status: "已化解", promoter: "王海涛" },
];
