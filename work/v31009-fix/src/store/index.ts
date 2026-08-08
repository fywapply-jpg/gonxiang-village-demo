/**
 * 全局状态管理（基于 Taro Storage + 事件总线）
 * 简单场景不引入 Redux，用 storage 同步即可。
 */
import Taro from '@tarojs/taro';
import { DEMO_MODE } from '../config/version';
import { DEMO_ADDRESS } from '../config/region';

// ── 类型定义 ─────────────────────────────────────────────────────────────────
export interface CartItem {
  id: number;
  name: string;
  price: number;
  image: string;
  qty: number;
  spec?: string;
  shop?: string;   // 所属小卖部（供享大集按商家分单结算用）
}

export interface Order {
  id: string;
  date: string;
  status: '待付款' | '待发货' | '配送中' | '已签收' | '退款中' | '已退款' | '已取消';
  items: { name: string; qty: number; price: number }[];
  total: number;
  address: string;
  shop?: string;        // 订单所属小卖部（一键支付按商家自动分单）
  method?: '配送' | '自提'; // 配送方式
  delivery?: number;    // 本单配送费（自提为 0）
  contribUsed?: number; // 本单抵扣的贡献值；退款时原路退回，避免“钱退了、贡献值没退”
  reviewd?: boolean;    // 是否已评价
  review?: { star: number; shopStar: number; text: string }; // 点评：商品分/商家分/评语
  logistics?: { time: string; desc: string }[];
  courier?: { name: string; no: string; tel: string };
  source?: '普通交易' | '鲜食预售' | '惠民团购';
  campaignId?: string;  // 关联预售/团购活动，供成团、截单、履约批量联动
  businessStage?: string; // 如「待成团」「已成团待付款」「预售已锁货」
}

export interface UserInfo {
  id: string;
  name: string;
  phone: string;
  role: 'user' | 'entrepreneur' | 'village_admin' | 'platform_admin' | 'foundation_admin';
  orgType?: 'village' | 'community'; // 村(村委会↔村民) / 社区(居委会↔居民)，两套平级体系
  orgName?: string;
  family?: string;      // 所属家庭(户)
  isHead?: boolean;     // 是否户主
  verified?: boolean;   // 是否已与名册比对认证
  adminLevel?: 'officer' | 'leader'; // 村委/居委两级审批：officer=审核专员(初审) / leader=审批领导(终批)
  isPartyMember?: boolean; // 是否在册党员（党建联建内容仅党员可见/参与）
  avatar?: string;
  openid?: string;
  backendPermissions?: string[]; // 真实后端授权快照；页面可用于入口显隐，最终仍以后端鉴权为准
  backendOrganizationId?: string; // 真实后端主组织，用于事项上报及组织范围判断
  backendRoleName?: string; // 真实后端主角色名称，用于管理界面展示
}

// 就业招工
export interface Job {
  id: number;
  title: string;
  company: string;
  salary: string;
  type: '临时' | '兼职' | '全职';
  deadline: string;
  count: number;
  location: string;
  applied?: boolean;
}

// 村务公开
export interface VillageAffair {
  id: number;
  date: string;
  title: string;
  category: '财务公开' | '工程公示' | '民政公示' | '组织公开';
  amount: string;
  tag: string;
}

const INIT_JOBS: Job[] = [
  { id: 1, title: '果园采摘工', company: '丰收果园', salary: '120元/天', type: '临时', deadline: '11月30日', count: 5, location: '方城乡东区' },
  { id: 2, title: '电商客服', company: '供享村社运营中心', salary: '2800元/月', type: '全职', deadline: '长期', count: 2, location: '乡政府楼上' },
  { id: 3, title: '大棚蔬菜管理', company: '绿源蔬菜基地', salary: '90元/天', type: '临时', deadline: '12月15日', count: 8, location: '李庄村' },
  { id: 4, title: '村级物流分拣', company: '范庄驿站', salary: '2200元/月', type: '兼职', deadline: '长期', count: 1, location: '村委会' },
];

const INIT_AFFAIRS: VillageAffair[] = [
  { id: 1, date: '11月20日', title: '2024年村集体收入分配公示', category: '财务公开', amount: '¥12.6万', tag: '已公示' },
  { id: 2, date: '11月15日', title: '村道硬化工程竣工验收报告', category: '工程公示', amount: '¥8.3万', tag: '已公示' },
  { id: 3, date: '11月10日', title: '低保户核查名单及补助标准公示', category: '民政公示', amount: '—', tag: '已公示' },
  { id: 4, date: '11月01日', title: '村委班子述职评议结果公告', category: '组织公开', amount: '—', tag: '已完成' },
  { id: 5, date: '10月25日', title: '秋季农业补贴发放明细', category: '财务公开', amount: '¥5.4万', tag: '已公示' },
];

// ── 存取封装 ──────────────────────────────────────────────────────────────────
// ── 贡献体系（PDF 第五板块·全生命周期社会贡献）────────────────────────────────
export type ContribDimKey = 'growth' | 'career' | 'governance' | 'custom' | 'silver';
export interface ContribAction { name: string; value: number; done: boolean; }
export interface ContribDimension {
  key: ContribDimKey;
  title: string;
  icon: string;
  color: string;
  desc: string;
  score: number;
  actions: ContribAction[];
}
export interface ContribRecord {
  id?: string; date: string; ts?: number; title: string; dim: string; value: number; onChain: boolean; // ts=获得时间戳(ms)，用于12个月滚动有效值计算
  // 审核确认闭环：pending 待审核 / confirmed 已确认计分 / rejected 已驳回
  status?: 'pending' | 'confirmed' | 'rejected';
  dimKey?: ContribDimKey;        // 审核通过时加到对应维度
  proof?: string;               // 留痕：照片 / 视频
  beneficiary?: string;         // 受益者
  review?: string;              // 受益者评价
  reviewer?: string;            // 审核人（村委会 / 居委会）
  orderId?: string;             // 关联订单号：消费贡献值随订单「预记(冻结)→确认收货计分→退款冲正」
}
export interface ContribAccount {
  total: number; month: number; level: string; rank: number;
  dividend: number; exchangeable: number; onChainCount: number;
}

const INIT_DIMENSIONS: ContribDimension[] = [
  { key: 'growth', title: '成长贡献', icon: '🌱', color: '#16a34a', desc: '育儿互助·少年志愿·技能学习·科普参与', score: 120,
    actions: [
      { name: '育儿互助', value: 30, done: true },
      { name: '少年志愿', value: 30, done: true },
      { name: '技能学习', value: 30, done: true },
      { name: '科普参与', value: 20, done: false },
    ] },
  { key: 'career', title: '立业贡献', icon: '💼', color: '#2563eb', desc: '就业创收·产业带富·合作帮扶·创业引领', score: 420,
    actions: [
      { name: '就业创收', value: 100, done: true },
      { name: '产业带富', value: 120, done: true },
      { name: '合作帮扶', value: 100, done: true },
      { name: '创业引领', value: 100, done: false },
    ] },
  { key: 'governance', title: '治理贡献', icon: '🏛️', color: '#ea580c', desc: '村务议事·志愿值守·隐患上报·建言献策', score: 260,
    actions: [
      { name: '村务议事', value: 60, done: true },
      { name: '志愿值守', value: 80, done: true },
      { name: '隐患上报', value: 60, done: true },
      { name: '建言献策', value: 60, done: false },
    ] },
  { key: 'custom', title: '乡风贡献', icon: '🎎', color: '#9333ea', desc: '文明践行·移风易俗·非遗传承·邻里互助', score: 180,
    actions: [
      { name: '文明践行', value: 50, done: true },
      { name: '移风易俗', value: 40, done: true },
      { name: '非遗传承', value: 50, done: false },
      { name: '邻里互助', value: 40, done: true },
    ] },
  { key: 'silver', title: '银龄贡献', icon: '👴', color: '#dc2626', desc: '经验传授·乡贤助力·家风传承·银龄服务', score: 90,
    actions: [
      { name: '经验传授', value: 30, done: true },
      { name: '乡贤助力', value: 30, done: true },
      { name: '家风传承', value: 30, done: false },
      { name: '银龄服务', value: 30, done: false },
    ] },
];

const _DAY = 86400000;
const _NOW = Date.now();
const _ago = (d: number) => _NOW - d * _DAY;
const INIT_CONTRIB_RECORDS: ContribRecord[] = [
  // 待审核（不计入有效值）
  { id: 'Cp1', date: '今天', ts: _NOW, title: '志愿服务·帮独居张奶奶买菜送药', dim: '乡风贡献', dimKey: 'custom', value: 10, onChain: false, status: 'pending', proof: '📷 已上传 2 张照片 + 1 段视频', beneficiary: '张桂英（独居老人）', review: '小伙子很热心，菜和药都买齐送到家，谢谢！' },
  { id: 'Cp2', date: '今天', ts: _NOW, title: '文体活动·组织老年象棋赛', dim: '乡风贡献', dimKey: 'custom', value: 3, onChain: false, status: 'pending', proof: '📷 活动现场照片 4 张', beneficiary: '参赛老人 12 人', review: '活动办得好，大家都很开心' },
  { id: 'Cp3', date: '昨天', ts: _ago(1), title: '便民维修·免费帮李伯修水管', dim: '乡风贡献', dimKey: 'custom', value: 3, onChain: false, status: 'pending', proof: '📷 维修前后对比照', beneficiary: '李建军（脱贫户）', review: '师傅上门快，免费帮困难户修好，点赞' },
  // 已确认（带真实时间戳，用于近12个月滚动有效值计算）——合计 1070：有效 880 / 临期 118 / 已过期 190
  { date: '15 天前', ts: _ago(15), title: '志愿服务·乡村篮球公益课助教', dim: '乡风贡献', dimKey: 'custom', value: 168, onChain: true, status: 'confirmed', reviewer: '基金会核实' },
  { date: '40 天前', ts: _ago(40), title: '认领帮扶户·助销土蜂蜜', dim: '立业贡献', dimKey: 'career', value: 100, onChain: true, status: 'confirmed', reviewer: '村委会' },
  { date: '70 天前', ts: _ago(70), title: '志愿值守·夜间巡逻', dim: '治理贡献', dimKey: 'governance', value: 80, onChain: true, status: 'confirmed', reviewer: '村委会' },
  { date: '110 天前', ts: _ago(110), title: '参与村民议事·灌溉用水协调', dim: '治理贡献', dimKey: 'governance', value: 60, onChain: true, status: 'confirmed', reviewer: '村委会' },
  { date: '150 天前', ts: _ago(150), title: '邻里互助·帮独居老人代购', dim: '乡风贡献', dimKey: 'custom', value: 40, onChain: true, status: 'confirmed', reviewer: '村委会' },
  { date: '200 天前', ts: _ago(200), title: '助农消费·惠农返贡献值', dim: '乡风贡献', dimKey: 'custom', value: 120, onChain: true, status: 'confirmed', reviewer: '系统自动核实' },
  { date: '240 天前', ts: _ago(240), title: '就业创收·稳岗补贴达标', dim: '立业贡献', dimKey: 'career', value: 134, onChain: true, status: 'confirmed', reviewer: '村委会' },
  { date: '260 天前', ts: _ago(260), title: '技能学习·农技培训结业', dim: '成长贡献', dimKey: 'growth', value: 60, onChain: true, status: 'confirmed', reviewer: '村委会' },
  { date: '300 天前 · 90天内将过期', ts: _ago(300), title: '公益捐赠·困境儿童体育关爱', dim: '乡风贡献', dimKey: 'custom', value: 55, onChain: true, status: 'confirmed', reviewer: '基金会开票确认' },
  { date: '335 天前 · 90天内将过期', ts: _ago(335), title: '产业带富·合作社共富分红', dim: '立业贡献', dimKey: 'career', value: 63, onChain: true, status: 'confirmed', reviewer: '村委会' },
  { date: '400 天前 · 已过期', ts: _ago(400), title: '早期助农消费返贡献值', dim: '乡风贡献', dimKey: 'custom', value: 100, onChain: true, status: 'confirmed', reviewer: '系统自动核实' },
  { date: '480 天前 · 已过期', ts: _ago(480), title: '早期志愿服务·敬老助残', dim: '乡风贡献', dimKey: 'custom', value: 90, onChain: true, status: 'confirmed', reviewer: '村委会' },
];

const INIT_CONTRIB_ACCOUNT: ContribAccount = {
  total: 1070, month: 310, level: '四星贡献者', rank: 7,
  dividend: 268, exchangeable: 1070, onChainCount: 23,
};

// 贡献等级按累计总分动态推定（口径与账户页一致）——每次写账户时同步刷新，避免 level 冻结在初始值
const contribLevelOf = (total: number): string =>
  total >= 2000 ? '五星贡献者'
    : total >= 1000 ? '四星贡献者'
    : total >= 500 ? '三星贡献者'
    : total >= 200 ? '二星贡献者'
    : total >= 50 ? '一星贡献者'
    : '新晋贡献者';

// ── 功能开关：平台按村控制开通哪些模块（MVP 核心常开、不可关；其余可按村开通/隐藏）──
export interface FeatureDef { key: string; name: string; mvp: boolean; }
export const FEATURE_LIST: FeatureDef[] = [
  { key: 'store', name: '供享大集', mvp: true },
  { key: 'contrib', name: '社会贡献值', mvp: true },
  { key: 'party', name: '党建引领', mvp: true },
  { key: 'admin', name: '管理后台', mvp: true },
  { key: 'food', name: '周边美食', mvp: false },
  { key: 'chess', name: '棋牌室', mvp: false },
  { key: 'travel', name: '旅游服务', mvp: false },
  { key: 'repair', name: '便民维修', mvp: false },
  { key: 'activity', name: '文体活动', mvp: false },
  { key: 'senior', name: '一老一小', mvp: false },
  { key: 'errand', name: '生活代办', mvp: false },
  { key: 'life', name: '生活服务大厅', mvp: false },
  { key: 'social', name: '医保社保', mvp: false },
  { key: 'health', name: '健康医疗', mvp: false },
  { key: 'exchange', name: '双向流通', mvp: false },
  { key: 'agri', name: '兴农增收', mvp: false },
  { key: 'barter', name: '邻里置换', mvp: false },
  { key: 'groupon', name: '惠民团购', mvp: false },
];

// ── 社会公益：平台运营授权分级管理（未授权=公众浏览权；授权后仅在责权范围内行使）──
export interface CharityPerm { key: string; name: string; desc: string; }
export const CHARITY_PERMS: CharityPerm[] = [
  { key: 'proj', name: '项目监管', desc: '项目申报立项、进度督查、结项评估' },
  { key: 'fund', name: '资金审计', desc: '预算审批、核销付款、导出审计底稿' },
  { key: 'mat', name: '物资管理', desc: '采购入库、调拨发放、溯源登记' },
  { key: 'audit', name: '申领审核发放', desc: '受理群众申领、核实、审核发放' },
];
export interface CharityClaim { id: string; item: string; applicant: string; date: string; status: '待审核' | '已通过' | '已驳回'; }
// 申领对象：须由相应福利机构/基金会「预先确定发布」，方可在「我要申领」显现供群众申领
export interface CharityItem { id: string; name: string; icon: string; who: string; cond: string; limit: string; docs: string; org: string; proj: string; }
export const SEED_ITEMS: CharityItem[] = [
  { id: 'IT1', name: '体育器材申领', icon: '🏀', who: '乡村中小学、社区青少年之家', cond: '在校在读、具备体育教学 / 活动场地', limit: '每校每学年 1 次，按班级数核定数量', docs: '学校申请函 + 场地照片 + 负责人联系方式', org: '中国关心下一代体育基金会', proj: 'P1' },
  { id: 'IT2', name: '公益体育课报名', icon: '🤸', who: '6–16 岁本地青少年', cond: '本地村民 / 居民子女，家长知情同意', limit: '每期每人 1 个名额，额满为止', docs: '学生姓名 · 年龄 + 家长手机号', org: '中国关心下一代体育基金会', proj: 'P1' },
  { id: 'IT3', name: '体能帮扶名额', icon: '💪', who: '体质偏弱、留守 / 困境青少年', cond: '村委 / 居委 / 学校推荐，有体质监测档案', limit: '每村 / 社区每季度 ≤ 20 名', docs: '推荐表 + 体质监测记录', org: '阳光助学公益基金会', proj: 'P2' },
  { id: 'IT4', name: '困境儿童关爱申请', icon: '❤️', who: '低保 / 特困 / 孤儿 / 事实无人抚养儿童', cond: '持有效证明，村委 / 居委入户核实', limit: '一人一档、一年一评', docs: '低保证 / 特困证等证明 + 户口本', org: '阳光助学公益基金会', proj: 'P2' },
];

// ── 社会公益·多机构入驻（发起机构须持国家认证专业资质证书，平台审核认证后方可发项目）──
export interface CharityOrg { id: string; name: string; type: string; cert: string; code: string; certNo: string; valid: string; status: '已认证' | '待审核' | '已驳回'; projects: number; benefit: number; icon: string; }
export const SEED_ORGS: CharityOrg[] = [
  { id: 'F1', name: '中国关心下一代体育基金会', type: '公募基金会', cert: '慈善组织公开募捐资格证书 · 民政部', code: '53100000500000123X', certNo: '慈募证字〔2021〕第0087号', valid: '2021-03-01 至 2026-02-28（临期）', status: '已认证', projects: 4, benefit: 12860, icon: '🏀' },
  { id: 'F2', name: '阳光助学公益基金会', type: '公募基金会', cert: '慈善组织登记证书 · 省民政厅', code: '52410000MJY6421088', certNo: '豫慈登字〔2022〕第0342号', valid: '2022-06-15 至 2027-06-14', status: '已认证', projects: 3, benefit: 5400, icon: '📚' },
  { id: 'F3', name: '夕阳红助老福利会', type: '社会福利机构', cert: '民办非企业单位登记证 · 市民政局', code: '52411200MJE8830266', certNo: '民非登字〔2024〕第0156号', valid: '2024-09-10 至 2029-09-09', status: '已认证', projects: 2, benefit: 3200, icon: '👵' },
];

// ── 党建·微心愿（村民发布→党员认领→党组织办结，跨角色持久化）──
export type WishStatus = 'open' | 'partial' | 'done';
export interface Wish { id: number; from: string; tag: string; content: string; date: string; deadline: string; target: number; claimers: string[]; status: WishStatus; }
export const SEED_WISHES: Wish[] = [
  { id: 1, from: '留守老人·周奶奶', tag: '空巢老人', content: '希望有人帮忙修一下漏雨的屋顶，入冬了怕冷。', date: '11月28日', deadline: '12月10日', target: 3, claimers: ['王建国'], status: 'open' },
  { id: 2, from: '留守儿童·小宇', tag: '困境儿童', content: '想要一盏护眼台灯，晚上写作业用。', date: '11月26日', deadline: '12月05日', target: 2, claimers: ['王建国', '冯韵雯'], status: 'done' },
  { id: 3, from: '脱贫户·李大姐', tag: '就业帮扶', content: '想学电商直播，帮家里的山货找销路。', date: '11月20日', deadline: '12月15日', target: 4, claimers: ['冯韵雯', '孙志强'], status: 'open' },
  { id: 4, from: '低保户·张大爷', tag: '生活帮扶', content: '腿脚不便，希望每月能帮忙代购米面油。', date: '11月10日', deadline: '11月30日', target: 5, claimers: ['孙志强', '李秀兰', '周建伟'], status: 'partial' },
  { id: 5, from: '留守儿童·朵朵', tag: '困境儿童', content: '想要一套课外书和一个书包。', date: '11月5日', deadline: '11月20日', target: 2, claimers: ['李秀兰', '吴小芳'], status: 'done' },
];

// ── 两级审批（专员前置初审→审批领导终批，跨角色持久化）──
export type ApprovalSt = 'pending_officer' | 'pending_leader' | 'approved' | 'rejected';
export interface ApprovalItem { id: number; type: string; spec: string; by: string; detail: string; status: ApprovalSt; }
export const SEED_APPROVAL_SPECS: Record<string, string> = {
  '开店经营审核': '张志强', '产权流转审核': '李国土', '民政/微心愿审核': '李秀兰', '平安综治审核': '赵网格', '预售/电商审核': '周伟',
};
export const SEED_APPROVALS: ApprovalItem[] = [
  { id: 1, type: '开店申请', spec: '开店经营审核', by: '陈强', detail: '申请开办供享·小卖部（农副产品）', status: 'pending_officer' },
  { id: 2, type: '鲜食预售', spec: '预售/电商审核', by: '李秀兰', detail: '大棚草莓预售 100 盒', status: 'pending_officer' },
  { id: 3, type: '产权流转', spec: '产权流转审核', by: '赵建国', detail: '闲置宅基地流转 20 年', status: 'pending_leader' },
  { id: 4, type: '微心愿', spec: '民政/微心愿审核', by: '王奶奶', detail: '助听器 ¥500 认领核销', status: 'pending_leader' },
  { id: 5, type: '隐患上报', spec: '平安综治审核', by: '周伟', detail: '村口路灯不亮维修', status: 'approved' },
];

// ── 志愿服务·社会贡献值精算 ──
// 公式：贡献值 = min(时长,8) × 10 × 类型系数 × (1+成效加成)，核实（签到+照片视频+受益人评价+机构确认）后计。
export const VOL_TYPE_COEF: Record<string, number> = { '专业服务': 2.0, '组织协调': 1.5, '一般参与': 1.0, '后勤保障': 0.8 };
// 岗位准入等级：高价值岗位需更高志愿者等级（与分级相辅相成：升级解锁高价值岗 → 得更多贡献值）
export const VOL_TYPE_MINSTAR: Record<string, number> = { '专业服务': 3, '组织协调': 2, '一般参与': 1, '后勤保障': 1 };
export function calcVolPoints(hours: number, type: string, benefit: number): number {
  const coef = VOL_TYPE_COEF[type] || 1;
  const bonus = benefit >= 100 ? 0.4 : benefit >= 50 ? 0.2 : 0;
  return Math.round(Math.min(hours, 8) * 10 * coef * (1 + bonus));
}
export interface VolPost { id: string; title: string; org: string; type: '专业服务' | '组织协调' | '一般参与' | '后勤保障'; hours: number; benefit: number; need: number; }
export const VOL_POSTS: VolPost[] = [
  { id: 'V1', title: '乡村篮球公益课·助教', org: '关心下一代体育基金会', type: '专业服务', hours: 6, benefit: 120, need: 4 },
  { id: 'V2', title: '困境儿童体能营·带队', org: '关心下一代体育基金会', type: '组织协调', hours: 4, benefit: 60, need: 6 },
  { id: 'V3', title: '公益运动会·现场引导', org: '阳光助学公益基金会', type: '一般参与', hours: 5, benefit: 200, need: 20 },
  { id: 'V4', title: '器材搬运与登记·后勤', org: '夕阳红助老福利会', type: '后勤保障', hours: 3, benefit: 30, need: 8 },
];
export interface VolRecord { id: string; name: string; post: string; hours: number; type: string; benefit: number; verified: boolean; points: number; }
// 志愿者认证（身份/职业技能/相关证书/所在单位证明/无犯罪证明，最终由相应福利机构认证）
export interface VolCert { id: string; name: string; identity: string; skill: string; cert: string; unit: string; noCrime: boolean; org: string; status: '待认证' | '已认证' | '已驳回'; }
export const SEED_VOLCERTS: VolCert[] = [
  { id: 'VC1', name: '李梦', identity: '身份证已核验', skill: '篮球二级教练', cert: '教练资格证 + 红十字急救证', unit: '三门峡体育学院 · 在读证明', noCrime: true, org: '中国关心下一代体育基金会', status: '待认证' },
  { id: 'VC2', name: '孙强', identity: '身份证已核验', skill: '体能训练师', cert: '国家体能教练证', unit: '市体育局 · 在职证明', noCrime: true, org: '中国关心下一代体育基金会', status: '待认证' },
];
// 志愿者分级（与社会贡献值相辅相成：服务得贡献值 → 贡献值升级志愿者 → 高阶岗位得更多贡献值）
export const VOL_APPLY_MIN = 100; // 申请志愿者的社会贡献值门槛
export interface VolLevel { star: number; title: string; min: number; right: string; bonus: number; keep: string; } // bonus=商城兑换折扣; keep=年度保级线
export const VOL_LEVELS: VolLevel[] = [
  { star: 1, title: '见习志愿者', min: 100, right: '参与一般 / 后勤志愿岗', bonus: 1.0, keep: '每年 ≥1 次有效服务' },
  { star: 2, title: '爱心志愿者', min: 300, right: '参与组织协调岗 · 专属荣誉徽章', bonus: 0.98, keep: '每年 ≥20 小时 或 有效值≥300' },
  { star: 3, title: '金牌志愿者', min: 800, right: '可带队 · 优先排班 · 荣誉证书', bonus: 0.95, keep: '每年 ≥60 小时 或 有效值≥800' },
  { star: 4, title: '星级导师', min: 1800, right: '受聘岗位负责人 · 培训新人', bonus: 0.90, keep: '每年 ≥100 小时 + 带教 1 批' },
  { star: 5, title: '公益之星', min: 3500, right: '受聘公益导师 · 参与项目评审', bonus: 0.85, keep: '每年 ≥150 小时 + 参与项目评审' },
];
export function volLevelOf(points: number): VolLevel | null {
  let lv: VolLevel | null = null;
  for (const l of VOL_LEVELS) if (points >= l.min) lv = l;
  return lv;
}
// 当前用户在贡献商城的兑换折扣（由志愿者等级决定；无等级=无折扣）
export function volDiscount(points: number): number { return volLevelOf(points)?.bonus ?? 1; }

// ── 公益捐赠（定向 + 挂钩认证算法 + 防伪票据 + 公开/匿名）──
export interface Donation { id: string; who: string; org: string; project: string; bene: string; amount: number; kind: '资金' | '实物'; recurring: boolean; anonymous: boolean; points: number; receiptNo: string; verifyCode: string; confirmed: boolean; date: string; }
// 捐赠→社会贡献值算法：基础分分段折算(边际递减) × 类型系数 × 持续系数；须机构开票确认后入账
export function donationPoints(amount: number, kind: '资金' | '实物', recurring: boolean): number {
  const seg1 = Math.min(amount, 1000);
  const seg2 = Math.min(Math.max(amount - 1000, 0), 9000);
  const seg3 = Math.max(amount - 10000, 0);
  const base = seg1 / 10 + seg2 / 15 + seg3 / 25;   // ¥1-1k每10=1 / 1k-10k每15=1 / >10k每25=1
  const kindCoef = kind === '实物' ? 1.1 : 1.0;
  const recurCoef = recurring ? 1.2 : 1.0;
  return Math.round(base * kindCoef * recurCoef);
}
// 各机构在办项目（定向捐赠可选）
export const ORG_PROJECTS: Record<string, string[]> = {
  '中国关心下一代体育基金会': ['乡村校园体育器材捐赠', '公益体能课堂', '困境儿童体育关爱', '乡村青少年体能帮扶'],
  '阳光助学公益基金会': ['乡村图书室援建', '贫困学子助学金', '乡村教师培训'],
  '夕阳红助老福利会': ['独居老人关爱探访', '社区日间照料'],
};
// 为谁捐赠（受益对象，定向）
export const BENE_OPTS = ['留守儿童', '困境儿童', '乡村学校', '一老一小', '全部统筹分配'];

// ── 项目全流程（申报→立项→执行→督查→结项，多角色分工制衡；发起人→受益人可溯源）──
export const PROJ_STAGES = ['项目申报', '理事会立项', '活动执行', '中期督查', '结项评估'] as const;
// 项目变更（增额/减额/终止）：由发起人提出，须「平台 + 国家机构」双审核通过方生效，全程留痕可溯
export interface ProjChange { id: string; type: '增额' | '减额' | '终止'; delta: number; platformOk: boolean; nationalOk: boolean; done: boolean; }
export interface CharityProj { id: string; name: string; org: string; initiator: string; target: string; amount: number; selfRaised: number; donated: number; plan: string; rule: string; stageIdx: number; terminated: boolean; quota: number; claimed: number; changes: ProjChange[]; }
export const SEED_PROJS: CharityProj[] = [
  { id: 'P1', name: '乡村校园体育器材捐赠', org: '中国关心下一代体育基金会', initiator: '范庄村委会', target: '豫西 12 所乡村小学 · 在校学生 3200 名', amount: 180, selfRaised: 120, donated: 60, plan: '2026 Q3 分批为 12 校配齐篮球架 / 乒乓台 / 体能器材，配套公益体育课', rule: '一校一档、按班级数核定、发放公示 ≥7 天', stageIdx: 2, terminated: false, quota: 3200, claimed: 2180, changes: [] },
  { id: 'P2', name: '困境儿童体育关爱', org: '阳光助学公益基金会', initiator: '第六社区居委会', target: '全市留守 / 困境儿童 860 名', amount: 90, selfRaised: 50, donated: 40, plan: '为困境儿童提供体育装备 + 关爱金 + 体能帮扶名额', rule: '低保 / 特困证明 + 入户核实、一人一档', stageIdx: 1, terminated: false, quota: 860, claimed: 430, changes: [] },
];

// ── B端推广分销管理（平台运营专属：集体控股组织推广 + 实名推广员 + 4:6 分佣 + 季度考核）──
// 推广资格：推广组织须为「村集体/社区集体所有控股企业」，集体持股 ≥51% 方可授资质。
export interface PromoOrg {
  id: string;
  name: string;
  type: '村集体企业' | '社区集体企业';
  holding: number;         // 集体持股比例(%)，≥51 才可授资质
  promoters: number;       // 实名推广员数
  merchants: number;       // 拓展 B 端总数
  activeMerchants: number; // 活跃 B 端数
  gmv: number;             // 累计 GMV(万元)
  commission: number;      // 本月佣金(元)，平台4:推广组织6 分成后推广组织所得
  satisfaction: number;    // 服务满意度(%)
  opinionRate: number;     // 舆情处置及时率(%)
  score: number;           // 季度考核总分
  grade: '优秀' | '合格' | '待整改' | '不达标';
  status: '已授权' | '待审核' | '已驳回';
}
export const SEED_PROMO_ORGS: PromoOrg[] = [
  { id: 'PO1', name: '范庄村集体经济合作社', type: '村集体企业', holding: 100, promoters: 8, merchants: 42, activeMerchants: 38, gmv: 186, commission: 22400, satisfaction: 96, opinionRate: 100, score: 92, grade: '优秀', status: '已授权' },
  { id: 'PO2', name: '第六社区惠民服务有限公司', type: '社区集体企业', holding: 67, promoters: 5, merchants: 28, activeMerchants: 24, gmv: 98, commission: 11200, satisfaction: 91, opinionRate: 98, score: 85, grade: '合格', status: '已授权' },
  { id: 'PO3', name: '灵宝供销兴农合作社', type: '村集体企业', holding: 80, promoters: 4, merchants: 19, activeMerchants: 15, gmv: 64, commission: 7600, satisfaction: 88, opinionRate: 93, score: 78, grade: '待整改', status: '已授权' },
  { id: 'PO4', name: '某商贸公司', type: '社区集体企业', holding: 45, promoters: 0, merchants: 0, activeMerchants: 0, gmv: 0, commission: 0, satisfaction: 0, opinionRate: 0, score: 0, grade: '待整改', status: '待审核' },
];

// ── 存取封装 ──────────────────────────────────────────────────────────────────
export const store = {
  // 用户
  getUser: (): UserInfo | null => Taro.getStorageSync('gx_user') || null,
  setUser: (u: UserInfo) => Taro.setStorageSync('gx_user', u),
  clearUser: () => { Taro.removeStorageSync('gx_user'); Taro.removeStorageSync('gx_token'); },

  // token
  getToken: (): string => Taro.getStorageSync('gx_token') || '',
  setToken: (t: string) => Taro.setStorageSync('gx_token', t),

  // ── 角色权限（统一守卫工具，所有页面共用，避免各页各自为政）──────────────────
  role: (): UserInfo['role'] => store.getUser()?.role || 'user',
  // 店主及以上：可管理店铺商品（上/下架、库存、发布）。普通村民只能浏览下单。
  canManageShop: (): boolean => ['entrepreneur', 'platform_admin'].includes(store.role()),
  // 村委及以上：可审批、管理村务/党建/帮扶/产权/微心愿结算等。
  canManageVillage: (): boolean => ['village_admin', 'platform_admin'].includes(store.role()),
  // 平台级管理。
  isPlatformAdmin: (): boolean => store.role() === 'platform_admin',
  // 基金会级管理（社会公益专属，独立于供享村社平台管理员；走同一 App 公用通道但权限分离）。
  isFoundationAdmin: (): boolean => store.role() === 'foundation_admin',
  // ── 社会公益授权：由平台运营授权分级管理 ──
  // 当前身份已获授权的 perm keys（平台首次未配置时默认给全部，演示即开即用；平台可增减/清空）。
  getCharityAuth: (): string[] => {
    const a = Taro.getStorageSync('gx_charity_auth');
    if (Array.isArray(a)) return a;
    // 演示版默认全开（即开即用）；正式版默认按需开、由平台运营逐项授权
    return DEMO_MODE ? CHARITY_PERMS.map(p => p.key) : [];
  },
  setCharityAuth: (keys: string[]) => Taro.setStorageSync('gx_charity_auth', keys),
  // 微心愿（跨角色持久化：村民发布→党员认领→党组织办结，切角色也能看到）
  getWishes: (): Wish[] => { const w = Taro.getStorageSync('gx_wishes'); return (Array.isArray(w) && w.length) ? w : SEED_WISHES; },
  setWishes: (w: Wish[]) => Taro.setStorageSync('gx_wishes', w),
  // 两级审批（跨角色持久化：专员初审→领导终批，初审状态领导能看到）
  getApprovals: (): ApprovalItem[] => { const a = Taro.getStorageSync('gx_approvals'); return (Array.isArray(a) && a.length) ? a : SEED_APPROVALS; },
  setApprovals: (a: ApprovalItem[]) => Taro.setStorageSync('gx_approvals', a),
  getApprovalSpecs: (): Record<string, string> => { const s = Taro.getStorageSync('gx_approval_specs'); return (s && typeof s === 'object' && Object.keys(s).length) ? s : SEED_APPROVAL_SPECS; },
  setApprovalSpecs: (s: Record<string, string>) => Taro.setStorageSync('gx_approval_specs', s),
  hasCharityPerm: (key: string): boolean => store.getCharityAuth().includes(key),
  // 是否为「已授权的社会公益管理员」：基金会管理员身份 且 平台已授予至少一项责权（否则只有浏览权）。
  isCharityManager: (): boolean => {
    if (store.role() !== 'foundation_admin' || store.getCharityAuth().length === 0) return false;
    // 演示版便于切角色；正式版必须同时满足“机构已认证 + 平台已授权”，入驻审核不再与管理权脱节。
    if (DEMO_MODE) return true;
    const orgName = store.getUser()?.orgName;
    return !!orgName && store.getCharityOrgs().some(o => o.name === orgName && o.status === '已认证');
  },
  // ── 社会公益申领单：公众提交 → 授权审核员审核发放 ──
  getCharityClaims: (): CharityClaim[] => Taro.getStorageSync('gx_charity_claims') || [],
  addCharityClaim: (item: string, projId?: string) => {
    const list: CharityClaim[] = Taro.getStorageSync('gx_charity_claims') || [];
    const id = 'SQ' + (10240 + list.length + 1);
    list.unshift({ id, item, applicant: store.getUser()?.name || '演示用户', date: '刚刚提交', status: '待审核' });
    Taro.setStorageSync('gx_charity_claims', list);
    if (projId) { const projs = store.getCharityProjs().slice(); const p = projs.find(x => x.id === projId); if (p && p.claimed < p.quota) { p.claimed++; Taro.setStorageSync('gx_charity_projs', projs); } }
    return id;
  },
  reviewCharityClaim: (id: string, pass: boolean) => {
    const list: CharityClaim[] = Taro.getStorageSync('gx_charity_claims') || [];
    const c = list.find(x => x.id === id);
    if (c) { c.status = pass ? '已通过' : '已驳回'; Taro.setStorageSync('gx_charity_claims', list); }
  },
  // 申领对象：由福利机构/基金会预先确定发布后，才在「我要申领」显现
  getCharityItems: (): CharityItem[] => { const s = Taro.getStorageSync('gx_charity_items'); return (Array.isArray(s) && s.length) ? s : SEED_ITEMS; },
  addCharityItem: (name: string, who: string, limit: string) => {
    const list = store.getCharityItems().slice();
    list.unshift({ id: 'IT' + (list.length + 1), name, icon: '🎁', who: who || '经机构核定对象', cond: '经机构核定', limit: limit || '按机构核定', docs: '按机构要求提交', org: store.getUser()?.orgName || '关心下一代体育基金会', proj: SEED_PROJS[0]?.id || 'P1' });
    Taro.setStorageSync('gx_charity_items', list);
  },
  removeCharityItem: (id: string) => { Taro.setStorageSync('gx_charity_items', store.getCharityItems().filter(i => i.id !== id)); },
  // ── 多机构入驻（凭国家认证资质，平台审核认证）──
  getCharityOrgs: (): CharityOrg[] => { const s = Taro.getStorageSync('gx_charity_orgs'); return (Array.isArray(s) && s.length) ? s : SEED_ORGS; },
  applyCharityOrg: (name: string, type: string, cert: string) => {
    const list = store.getCharityOrgs().slice();
    list.unshift({ id: 'F' + (list.length + 1), name, type, cert, code: '待核验', certNo: '待核验', valid: '待核验', status: '待审核', projects: 0, benefit: 0, icon: '🏢' });
    Taro.setStorageSync('gx_charity_orgs', list);
  },
  reviewCharityOrg: (id: string, pass: boolean) => {
    const list = store.getCharityOrgs().map(o => o.id === id ? { ...o, status: (pass ? '已认证' : '已驳回') as CharityOrg['status'] } : o);
    Taro.setStorageSync('gx_charity_orgs', list);
  },
  // ── B端推广分销管理（平台运营专属）：集体控股组织推广 + 实名推广员 + 4:6 分佣 + 季度考核 ──
  getPromoOrgs: (): PromoOrg[] => { const s = Taro.getStorageSync('gx_promo_orgs'); return (Array.isArray(s) && s.length) ? s : SEED_PROMO_ORGS; },
  // 平台审核授资质：通过且集体持股 ≥51% → 已授权；否则驳回（集体控股不达标不予授资质），写回后返回最新列表。
  reviewPromoOrg: (id: string, pass: boolean): PromoOrg[] => {
    const list = store.getPromoOrgs().map(o => o.id === id ? { ...o, status: (pass && o.holding >= 51 ? '已授权' : '已驳回') as PromoOrg['status'] } : o);
    Taro.setStorageSync('gx_promo_orgs', list);
    return list;
  },
  // 推广组织当月分佣：平台对 B 端交易收 2% 服务费，按 平台4:推广组织6 分成，此为推广组织所得(元)。gmv 单位万元。
  promoCommission: (gmv: number): number => Math.round(gmv * 10000 * 0.02 * 0.6),
  // ── 志愿服务·精算（核实后自动折算社会贡献值、上链）──
  getVolRecords: (): VolRecord[] => Taro.getStorageSync('gx_vol_records') || [],
  signVol: (p: VolPost) => {
    const list: VolRecord[] = Taro.getStorageSync('gx_vol_records') || [];
    const id = 'VR' + (list.length + 1);
    list.unshift({ id, name: store.getUser()?.name || '演示志愿者', post: p.title, hours: p.hours, type: p.type, benefit: p.benefit, verified: false, points: calcVolPoints(p.hours, p.type, p.benefit) });
    Taro.setStorageSync('gx_vol_records', list);
    return id;
  },
  verifyVol: (id: string) => {
    const list: VolRecord[] = Taro.getStorageSync('gx_vol_records') || [];
    const r = list.find(x => x.id === id);
    if (r && !r.verified) { r.verified = true; Taro.setStorageSync('gx_vol_records', list); store.addContributionAuto('custom', `志愿服务·${r.post}`, r.points); }
  },
  // 志愿者认证：提交(身份/职业技能/相关证书/所在单位证明/无犯罪证明) → 由相应福利机构审核认证
  getVolCerts: (): VolCert[] => { const s = Taro.getStorageSync('gx_vol_certs'); return (Array.isArray(s) && s.length) ? s : SEED_VOLCERTS; },
  applyVolCert: (skill: string) => {
    const list = store.getVolCerts().slice();
    const name = store.getUser()?.name || '演示志愿者';
    list.unshift({ id: 'VC' + (list.length + 1), name, identity: '身份证已核验', skill: skill || '一般志愿服务', cert: '相关证书已上传', unit: '所在单位证明已上传', noCrime: true, org: '中国关心下一代体育基金会', status: '待认证' });
    Taro.setStorageSync('gx_vol_certs', list);
  },
  reviewVolCert: (id: string, pass: boolean) => {
    const list = store.getVolCerts().map(c => c.id === id ? { ...c, status: (pass ? '已认证' : '已驳回') as VolCert['status'] } : c);
    Taro.setStorageSync('gx_vol_certs', list);
  },
  // ── 公益捐赠（联动社会贡献值）──
  getDonations: (): Donation[] => Taro.getStorageSync('gx_donations') || [],
  donate: (amount: number, org: string, project: string, bene: string, kind: '资金' | '实物', recurring: boolean, anonymous: boolean): Donation => {
    const list: Donation[] = Taro.getStorageSync('gx_donations') || [];
    const points = donationPoints(amount, kind, recurring);
    const dt = new Date();
    const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    const receiptNo = `JZ-${dt.getFullYear()}-${String(100000 + list.length + 1).slice(1)}`;
    const verifyCode = 'FW' + String(Date.now()).slice(-8) + String(Math.floor(Math.random() * 900) + 100);
    const d: Donation = { id: 'D' + (list.length + 1), who: store.getUser()?.name || '爱心人士', org, project, bene, amount, kind, recurring, anonymous, points, receiptNo, verifyCode, confirmed: false, date };
    list.unshift(d);
    Taro.setStorageSync('gx_donations', list);
    return d;   // 贡献值先待确认，须机构到账核对 + 开票确认后由 confirmDonation 正式入账
  },
  // 基金会到账核对 + 开具正式发票 → 贡献值正式入账、票据生效（挂钩认证）
  confirmDonation: (id: string) => {
    const list: Donation[] = Taro.getStorageSync('gx_donations') || [];
    const d = list.find(x => x.id === id);
    if (d && !d.confirmed) { d.confirmed = true; Taro.setStorageSync('gx_donations', list); store.addContributionAuto('custom', `公益捐赠·${d.project}`, d.points); }
  },
  // ── 项目全流程（申报的新项目；发起人→受益人可溯源，stageIdx 分角色推进）──
  getCharityProjs: (): CharityProj[] => { const s = Taro.getStorageSync('gx_charity_projs'); return (Array.isArray(s) && s.length) ? s : SEED_PROJS; },
  declareProj: (name: string, org: string, target: string) => {
    const list = store.getCharityProjs().slice();
    const id = 'P' + (list.length + 1);
    list.unshift({ id, name, org, initiator: store.getUser()?.name || '实施单位', target: target || '经机构核定人群', amount: 0, selfRaised: 0, donated: 0, quota: 100, claimed: 0, plan: '（发起人填写实施计划）', rule: '（发起人填写实施制度）', stageIdx: 0, terminated: false, changes: [] });
    Taro.setStorageSync('gx_charity_projs', list);
    return id;
  },
  advanceProj: (id: string) => {
    const list = store.getCharityProjs().slice();
    const p = list.find(x => x.id === id);
    if (p && !p.terminated && p.stageIdx < PROJ_STAGES.length - 1) { p.stageIdx++; Taro.setStorageSync('gx_charity_projs', list); }
  },
  // 发起人申请变更（增额 / 减额 / 终止）→ 待「平台 + 国家机构」双审核
  requestProjChange: (projId: string, type: ProjChange['type'], delta: number) => {
    const list = store.getCharityProjs().slice();
    const p = list.find(x => x.id === projId); if (!p) return;
    p.changes.unshift({ id: 'CH' + (p.changes.length + 1), type, delta, platformOk: false, nationalOk: false, done: false });
    Taro.setStorageSync('gx_charity_projs', list);
  },
  // 平台 / 国家机构 审核变更；双通过后自动生效并留痕
  reviewProjChange: (projId: string, chId: string, party: 'platform' | 'national') => {
    const list = store.getCharityProjs().slice();
    const p = list.find(x => x.id === projId); if (!p) return;
    const c = p.changes.find(x => x.id === chId); if (!c || c.done) return;
    if (party === 'platform') c.platformOk = true; else c.nationalOk = true;
    if (c.platformOk && c.nationalOk) {
      c.done = true;
      if (c.type === '终止') p.terminated = true;
      else if (c.type === '增额') p.amount += c.delta;
      else if (c.type === '减额') p.amount = Math.max(0, p.amount - c.delta);
    }
    Taro.setStorageSync('gx_charity_projs', list);
  },
  // 权限分离：村委后台仅村委管理员(orgType=村)+平台；居委会后台仅居委会管理员(orgType=社区)+平台。
  // canManageVillage 保留为「村/社区通用管理」，供审批中心/贡献审核/名册导入等村居共享职能使用。
  canManageVillageOnly: (): boolean => store.isPlatformAdmin() || (store.role() === 'village_admin' && store.orgType() === 'village'),
  canManageCommunity: (): boolean => store.isPlatformAdmin() || (store.role() === 'village_admin' && store.orgType() === 'community'),
  // ── 功能开关：平台按村控制开通哪些模块 ──
  // 取当前村开通的功能 key 列表（无配置则默认全开，平台可按村关闭）。
  getFeatures: (village?: string): string[] => {
    const v = village || store.getUser()?.orgName || '_default';
    const all = Taro.getStorageSync('gx_features') || {};
    return all[v] || FEATURE_LIST.map(f => f.key);
  },
  setFeatures: (keys: string[], village?: string) => {
    const v = village || store.getUser()?.orgName || '_default';
    const all = Taro.getStorageSync('gx_features') || {};
    all[v] = keys;
    Taro.setStorageSync('gx_features', all);
  },
  // 新村接入激活时调用：只开 MVP 核心，其余可选功能默认关（平台在「村庄功能配置」按需再开）。
  // 存一份显式配置，让该村的 getFeatures 不再回落到"无配置=全开"的默认；mvp 功能本就恒开。
  seedNewVillageFeatures: (village: string) => {
    store.setFeatures(FEATURE_LIST.filter(f => f.mvp).map(f => f.key), village);
  },
  // 某功能是否对当前村开通：MVP 核心恒开、不可关；其余看平台的开通配置。
  isFeatureOn: (key: string): boolean => {
    const f = FEATURE_LIST.find(x => x.key === key);
    if (f && f.mvp) return true;
    return store.getFeatures().includes(key);
  },
  // 村 / 社区 双体系：村(村委会↔村民) 与 社区(居委会↔居民) 平级，职能区分、部分重叠(一老一小/积分)。
  orgType: (): 'village' | 'community' => store.getUser()?.orgType || 'village',
  orgLabel: (): string => (store.getUser()?.orgType === 'community' ? '社区' : '村'),
  adminLabel: (): string => (store.getUser()?.orgType === 'community' ? '居委会' : '村委会'),
  memberLabel: (): string => (store.getUser()?.orgType === 'community' ? '居民' : '村民'),
  // 村/社区体系判断（首页板块与医养社保内容按此分流：村民重农业生产、居民重社区生活）
  isCommunity: (): boolean => store.getUser()?.orgType === 'community',
  isVillage: (): boolean => store.getUser()?.orgType !== 'community',
  // 是否已绑定身份（非游客）：有归属组织(村民/居民) 或 属于经营/管理角色
  isBound: (): boolean => store.role() !== 'user' || (!!store.getUser()?.orgType && store.getUser()?.verified === true),
  // 游客拦截：未绑定则弹提示并引导去「我的」绑定，返回 false（拦截）/ true（放行）
  requireBound: (): boolean => {
    if (store.isBound()) return true;
    Taro.showModal({ title: '请先绑定身份', content: '你当前是游客，仅可浏览。请到「我的」扫「一村一码/一社区一码」或输序列号，绑定为村民/居民后再参与。', confirmText: '去绑定', cancelText: '再逛逛', success: (r) => { if (r.confirm) Taro.reLaunch({ url: '/pages/profile/index' }); } });
    return false;
  },
  // ── 成员名册（村委/居委导入，供绑定时比对认证）──────────────────
  getRoster: (): any[] => Taro.getStorageSync('gx_roster') || [],
  setRoster: (list: any[]) => Taro.setStorageSync('gx_roster', list),
  // 按 序列号/姓名/身份证 在名册中查人
  matchMember: (key: string): any => {
    const k = String(key || '').trim();
    if (!k) return null;
    return (store.getRoster() as any[]).find((m: any) => m.sn === k) || null;
  },
  // 本家庭成员（名册中同一 family 的人）——户主可管理
  getFamilyMembers: (): any[] => {
    const u = store.getUser();
    if (!u?.family) return [];
    return (store.getRoster() as any[]).filter((m: any) => (m.family || '').trim() === (u.family || '').trim());
  },
  // 是否本户户主（有户主权限：可管理家庭成员）
  isHouseholdHead: (): boolean => !!store.getUser()?.isHead,
  // 村委/居委 两级审批：审核专员(初审) / 审批领导(终批，平台运营等同领导)
  adminLevel: (): 'officer' | 'leader' | '' => store.getUser()?.adminLevel || '',
  isApprovalOfficer: (): boolean => store.canManageVillage() && store.adminLevel() === 'officer',
  isApprovalLeader: (): boolean => store.canManageVillage() && (store.adminLevel() === 'leader' || store.isPlatformAdmin()),
  // 在册党员：党建联建内容仅党员可浏览/参与（管理角色默认视为可查看党建）
  isPartyMember: (): boolean => !!store.getUser()?.isPartyMember || store.canManageVillage(),

  // ── 聚光星：被推广曝光的商品（管理员流量扶持分配 or 商家自购流量）──────────────
  getSpotlight: (): number[] => { const s = Taro.getStorageSync('gx_spotlight'); return (s && s.length) ? s : [1001, 1, 2001]; },
  setSpotlight: (ids: number[]) => Taro.setStorageSync('gx_spotlight', ids),
  addSpotlight: (id: number) => { const s = store.getSpotlight(); if (!s.includes(id)) store.setSpotlight([id, ...s]); },
  isSpotlight: (id: number): boolean => store.getSpotlight().includes(id),

  // 购物车
  getCart: (): CartItem[] => Taro.getStorageSync('gx_cart') || [],
  setCart: (c: CartItem[]) => Taro.setStorageSync('gx_cart', c),
  addToCart: (item: CartItem) => {
    const cart = store.getCart();
    const idx = cart.findIndex(c => c.id === item.id && c.spec === item.spec && c.shop === item.shop);
    if (idx >= 0) {
      cart[idx].qty += item.qty;
    } else {
      cart.push(item);
    }
    store.setCart(cart);
  },

  // 订单
  getOrders: (): Order[] => Taro.getStorageSync('gx_orders') || [],
  setOrders: (o: Order[]) => Taro.setStorageSync('gx_orders', o),
  addOrder: (o: Order) => {
    const orders = store.getOrders();
    store.setOrders([o, ...orders]);
  },
  updateOrder: (id: string, changes: Partial<Order>) => {
    const orders = store.getOrders().map(o => o.id === id ? { ...o, ...changes } : o);
    store.setOrders(orders);
  },

  // 就业招工
  getJobs: (): Job[] => {
    const j = Taro.getStorageSync('gx_jobs');
    return (j && j.length) ? j : INIT_JOBS;
  },
  setJobs: (j: Job[]) => Taro.setStorageSync('gx_jobs', j),
  addJob: (j: Job) => store.setJobs([j, ...store.getJobs()]),
  removeJob: (id: number) => store.setJobs(store.getJobs().filter(j => j.id !== id)),
  applyJob: (id: number) => store.setJobs(store.getJobs().map(j => j.id === id ? { ...j, applied: true } : j)),

  // 村务公开
  getAffairs: (): VillageAffair[] => {
    const a = Taro.getStorageSync('gx_affairs');
    return (a && a.length) ? a : INIT_AFFAIRS;
  },
  setAffairs: (a: VillageAffair[]) => Taro.setStorageSync('gx_affairs', a),
  addAffair: (a: VillageAffair) => store.setAffairs([a, ...store.getAffairs()]),
  removeAffair: (id: number) => store.setAffairs(store.getAffairs().filter(a => a.id !== id)),

  // 贡献体系
  getDimensions: (): ContribDimension[] => {
    const d = Taro.getStorageSync('gx_contrib_dims');
    return (d && d.length) ? d : INIT_DIMENSIONS;
  },
  setDimensions: (d: ContribDimension[]) => Taro.setStorageSync('gx_contrib_dims', d),
  getContribRecords: (): ContribRecord[] => {
    const r = Taro.getStorageSync('gx_contrib_recs');
    return (r && r.length) ? r : INIT_CONTRIB_RECORDS;
  },
  setContribRecords: (r: ContribRecord[]) => Taro.setStorageSync('gx_contrib_recs', r),
  getContribAccount: (): ContribAccount => Taro.getStorageSync('gx_contrib_acct') || INIT_CONTRIB_ACCOUNT,
  setContribAccount: (a: ContribAccount) => Taro.setStorageSync('gx_contrib_acct', a),
  // ── 社会贡献值 12 个月滚动保质期（真实时间戳计算）──
  // 有效贡献值 = 近 365 天内已确认记录之和（定级用；老记录自然过期滚出）
  getActiveContrib: (): number => { const now = Date.now(); const cut = now - 365 * 86400000; return store.getContribRecords().filter(r => r.status === 'confirmed' && (r.ts ?? now) >= cut).reduce((s, r) => s + r.value, 0); },
  // 已过期贡献值 = 超过 365 天的已确认记录之和
  getExpiredContrib: (): number => { const cut = Date.now() - 365 * 86400000; return store.getContribRecords().filter(r => r.status === 'confirmed' && r.ts !== undefined && r.ts < cut).reduce((s, r) => s + r.value, 0); },
  // 即将过期 = 距 365 天上限还剩 ≤days 天的已确认记录之和（预警用）
  getExpiringContrib: (days: number = 90): number => { const now = Date.now(); const lo = now - 365 * 86400000; const hi = lo + days * 86400000; return store.getContribRecords().filter(r => r.status === 'confirmed' && r.ts !== undefined && r.ts >= lo && r.ts <= hi).reduce((s, r) => s + r.value, 0); },
  // 真正「能花」的贡献值 = 账户可兑换 与 近12月有效值 取小（过期分不能花，与定级同口径）——统一全平台"可兑换/抵扣"上限
  getSpendable: (): number => Math.min(store.getContribAccount().exchangeable, store.getActiveContrib()),
  // 结算抵扣 / 商城兑换扣款：从可兑换里扣（封底 0）
  spendContrib: (n: number): void => { const a = store.getContribAccount(); store.setContribAccount({ ...a, exchangeable: Math.max(0, a.exchangeable - Math.max(0, Math.round(n))) }); },
  // 订单退款退回原抵扣贡献值；只退订单落账值，由订单状态防止重复退款重复返还
  restoreContrib: (n: number): void => { const a = store.getContribAccount(); store.setContribAccount({ ...a, exchangeable: a.exchangeable + Math.max(0, Math.round(n)) }); },
  // 账户等级按「有效值」定（与志愿定级同口径、随过期缩水），页面展示用此，避免总分/有效值/可兑换三个口径打架
  getActiveLevel: (): string => contribLevelOf(store.getActiveContrib()),
  // 记一笔贡献：账户累加 + 维度加分 + 写链上明细
  // 提交贡献：生成「待确认」记录（留痕 + 受益者评价），须村委/居委审核通过后才计分（防刷分、保真实）
  addContribution: (dimKey: ContribDimKey, title: string, value: number, extra?: { proof?: string; beneficiary?: string; review?: string }): void => {
    const dimTitle = INIT_DIMENSIONS.find(d => d.key === dimKey)?.title || '乡风贡献';
    const rec: ContribRecord = {
      id: 'C' + Date.now() + Math.floor(Math.random() * 1000),
      date: '今天', ts: Date.now(), title, dim: dimTitle, dimKey, value, onChain: false, status: 'pending',
      proof: extra?.proof || '现场照片 / 视频（待补 · 演示）',
      beneficiary: extra?.beneficiary || '受益村民',
      review: extra?.review || '服务已完成，满意',
    };
    store.setContribRecords([rec, ...store.getContribRecords()]);
  },
  // 待审核的贡献（村委/居委审核端用）
  getPendingContribs: (): ContribRecord[] => store.getContribRecords().filter(r => r.status === 'pending'),
  // 审核贡献：通过→计入总分+维度分+上链；驳回→标记 rejected。value 仅确认后才生效。
  reviewContrib: (id: string, pass: boolean, reviewer: string): void => {
    const recs = store.getContribRecords();
    const rec = recs.find(r => r.id === id);
    if (!rec || rec.status !== 'pending') return;
    if (pass) {
      rec.status = 'confirmed'; rec.onChain = true; rec.reviewer = reviewer;
      const acct = store.getContribAccount();
      const newTotal = acct.total + rec.value;
      store.setContribAccount({ ...acct, total: newTotal, month: acct.month + rec.value, exchangeable: acct.exchangeable + rec.value, onChainCount: acct.onChainCount + 1, level: contribLevelOf(newTotal), dividend: Math.round(newTotal * 0.25) });
      if (rec.dimKey) store.setDimensions(store.getDimensions().map(d => d.key === rec.dimKey ? { ...d, score: d.score + rec.value } : d));
    } else {
      rec.status = 'rejected'; rec.reviewer = reviewer;
    }
    store.setContribRecords(recs);
  },
  // 系统可验证行为（邀请/消费/投票/取件）自动确认计分，无需人工审核——后台有注册/订单/投票数据为证
  addContributionAuto: (dimKey: ContribDimKey, title: string, value: number): void => {
    const acct = store.getContribAccount();
    const newTotal = acct.total + value;
    store.setContribAccount({ ...acct, total: newTotal, month: acct.month + value, exchangeable: acct.exchangeable + value, onChainCount: acct.onChainCount + 1, level: contribLevelOf(newTotal), dividend: Math.round(newTotal * 0.25) });
    store.setDimensions(store.getDimensions().map(d => d.key === dimKey ? { ...d, score: d.score + value } : d));
    const dimTitle = INIT_DIMENSIONS.find(d => d.key === dimKey)?.title || '立业贡献';
    store.setContribRecords([{ id: 'CA' + Date.now() + Math.floor(Math.random() * 1000), date: '今天', ts: Date.now(), title, dim: dimTitle, dimKey, value, onChain: true, status: 'confirmed', reviewer: '系统自动核实' }, ...store.getContribRecords()]);
  },
  // ── 订单消费贡献值：下单「预记(pending·冻结)」→ 确认收货「确认计分」→ 退款「自动冲正撤回」──
  // 呼应支付结算规则：可退商品的贡献值在退货期内不计入账户，退货即撤回，杜绝"分完又退"。
  addOrderContrib: (orderId: string, dimKey: ContribDimKey, title: string, value: number): void => {
    const dimTitle = INIT_DIMENSIONS.find(d => d.key === dimKey)?.title || '立业贡献';
    store.setContribRecords([{ id: 'CO' + Date.now() + Math.floor(Math.random() * 1000), date: '今天', ts: Date.now(), title, dim: dimTitle, dimKey, value, onChain: false, status: 'pending', reviewer: '待确认收货 / 退货期满', orderId }, ...store.getContribRecords()]);
  },
  confirmOrderContrib: (orderId: string): void => {
    const recs = store.getContribRecords();
    let hit = false;
    recs.forEach(rec => {
      if (rec.orderId === orderId && rec.status === 'pending') {
        rec.status = 'confirmed'; rec.onChain = true; rec.reviewer = '确认收货核实';
        const acct = store.getContribAccount();
        const nt = acct.total + rec.value;
        store.setContribAccount({ ...acct, total: nt, month: acct.month + rec.value, exchangeable: acct.exchangeable + rec.value, onChainCount: acct.onChainCount + 1, level: contribLevelOf(nt), dividend: Math.round(nt * 0.25) });
        if (rec.dimKey) store.setDimensions(store.getDimensions().map(d => d.key === rec.dimKey ? { ...d, score: d.score + rec.value } : d));
        hit = true;
      }
    });
    if (hit) store.setContribRecords(recs);
  },
  reverseOrderContrib: (orderId: string): void => {
    const recs = store.getContribRecords();
    let hit = false;
    recs.forEach(rec => {
      if (rec.orderId === orderId && (rec.status === 'pending' || rec.status === 'confirmed')) {
        if (rec.status === 'confirmed') {
          const acct = store.getContribAccount();
          const nt = Math.max(0, acct.total - rec.value);
          store.setContribAccount({ ...acct, total: nt, month: Math.max(0, acct.month - rec.value), exchangeable: Math.max(0, acct.exchangeable - rec.value), onChainCount: Math.max(0, acct.onChainCount - 1), level: contribLevelOf(nt), dividend: Math.round(nt * 0.25) });
          if (rec.dimKey) store.setDimensions(store.getDimensions().map(d => d.key === rec.dimKey ? { ...d, score: Math.max(0, d.score - rec.value) } : d));
        }
        rec.status = 'rejected'; rec.reviewer = '退货冲正撤回';
        hit = true;
      }
    });
    if (hit) store.setContribRecords(recs);
  },

  // 鲜食预售单（村民发布 / 村委审批，本地持久化，切角色演示也能看到）
  getPresaleItems: (): any[] | null => {
    const d = Taro.getStorageSync('gx_presale');
    return (d && d.length) ? d : null;
  },
  setPresaleItems: (items: any[]) => Taro.setStorageSync('gx_presale', items),
  // 惠民团购活动：与订单分开保存，活动成团/流团时再批量穿透订单
  getGrouponItems: (): any[] | null => {
    const d = Taro.getStorageSync('gx_groupon');
    return (d && d.length) ? d : null;
  },
  setGrouponItems: (items: any[]) => Taro.setStorageSync('gx_groupon', items),

  initMockDataIfEmpty: () => {
    if (store.getOrders().length === 0) {
      store.setOrders([
        {
          id: 'GX2024110001',
          date: '11月1日 14:32',
          status: '已签收',
          shop: '华明果蔬园',
          items: [{ name: '三门峡苹果·红富士 5斤', qty: 2, price: 29.9 }],
          total: 59.8,
          address: DEMO_ADDRESS,
          reviewd: false,
          logistics: [
            { time: '11月3日 10:15', desc: '已签收，感谢使用供享村社' },
            { time: '11月2日 16:40', desc: '派送中，快递员: 王师傅 138xxxx' },
            { time: '11月2日 09:00', desc: '到达三门峡分拣中心' },
            { time: '11月1日 18:00', desc: '已发货，从郑州仓库出库' },
          ],
        },
        {
          id: 'GX2024110002',
          date: '11月5日 09:10',
          status: '配送中',
          items: [{ name: '灵宝核桃 2斤装', qty: 1, price: 45 }],
          total: 45,
          address: DEMO_ADDRESS,
          logistics: [
            { time: '11月6日 08:30', desc: '派送中，快递员: 李师傅 139xxxx' },
            { time: '11月5日 22:00', desc: '到达三门峡分拣中心' },
            { time: '11月5日 15:00', desc: '已发货' },
          ],
        },
      ]);
    }
  },
};
