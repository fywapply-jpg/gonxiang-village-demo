import {
  Divider, Grid, H2, H3,
  Pill, Row, Stack, Stat, Table, Text,
  useHostTheme, Callout, ThemeProvider,
} from './canvas-shim';
import { useState, useEffect } from 'react';
import { authing, isConfigured } from './authing';

type Theme = ReturnType<typeof useHostTheme>;

// ── Mock Data ────────────────────────────────────────────────────────────────

const VILLAGE = { name: '范庄村', township: '方城乡', logo: '村', members: 312, stores: 18 };

const PRODUCTS = [
  { id: 1, name: '有机小米', price: 28, unit: '斤', store: '范庄粮铺', sales: 142, tag: '本村特产', desc: '本村旱地种植，无化肥，颗粒饱满，煮粥香糯。', stock: 500, weight: '500g/袋', origin: '范庄村旱地' },
  { id: 2, name: '土鸡蛋', price: 36, unit: '30枚', store: '王大姐农场', sales: 89, tag: '散养', desc: '纯散养土鸡，每天户外觅食，蛋黄金黄，营养丰富。', stock: 200, weight: '30枚/盒', origin: '范庄村' },
  { id: 3, name: '红薯粉条', price: 15, unit: '斤', store: '李家粉坊', sales: 210, tag: '手工', desc: '传统工艺制作，纯红薯淀粉，十余道工序，劲道爽滑。', stock: 300, weight: '500g/包', origin: '方城乡' },
  { id: 4, name: '花生油', price: 68, unit: '桶', store: '范庄油坊', sales: 55, tag: '冷榨', desc: '当年新鲜花生，低温冷榨，保留天然营养，色泽金黄透亮。', stock: 80, weight: '5L/桶', origin: '范庄村' },
  { id: 5, name: '蜂蜜', price: 88, unit: '斤', store: '山顶蜂场', sales: 37, tag: '野生', desc: '深山野花蜜，纯天然未经加工，浓稠清香。', stock: 50, weight: '500g/瓶', origin: '方城乡山区' },
  { id: 6, name: '腊肉', price: 58, unit: '斤', store: '陈记腊味', sales: 63, tag: '腊制', desc: '传统腊制工艺，选用本地散养黑猪，烟熏风干，风味独特。', stock: 120, weight: '500g/份', origin: '范庄村' },
];

const GROUPS = [
  { id: 1, name: '新鲜大白菜', price: 1.2, unit: '斤', from: '邻村·李庄', min: 50, current: 38, deadline: '12小时', img: '菜' },
  { id: 2, name: '农家黑猪肉', price: 32, unit: '斤', from: '本村', min: 20, current: 17, deadline: '8小时', img: '肉' },
  { id: 3, name: '苹果（富士）', price: 5.5, unit: '斤', from: '邻村·张庄', min: 100, current: 100, deadline: '已成团', img: '果' },
  { id: 4, name: '玉米面', price: 3.8, unit: '斤', from: '本村', min: 30, current: 12, deadline: '24小时', img: '粮' },
];

const INIT_NOTICES = [
  '本月25日发放利益共享金，请绑定银行卡',
  '范庄村第三届农产品市集将于本周六举办',
  '方城乡通知：秋季种植补贴申请截止11月30日',
];

type PartyEvent = { date: string; title: string; members: number; status: string };
const INIT_PARTY_EVENTS: PartyEvent[] = [
  { date: '11月15日', title: '主题党日活动·参观红色教育基地', members: 24, status: '已完成' },
  { date: '11月8日', title: '党员学习：习近平总书记关于乡村振兴重要论述', members: 31, status: '已完成' },
  { date: '12月1日', title: '冬季慰问困难群众志愿服务活动', members: 18, status: '报名中' },
];

type Job = { id: number; title: string; company: string; salary: string; type: string; deadline: string; count: number; location: string };
const INIT_JOBS: Job[] = [
  { id: 1, title: '果园采摘工', company: '丰收果园', salary: '120元/天', type: '临时', deadline: '11月30日', count: 5, location: '方城乡东区' },
  { id: 2, title: '电商客服', company: '供享村社运营中心', salary: '2800元/月', type: '全职', deadline: '长期', count: 2, location: '乡政府楼上' },
  { id: 3, title: '大棚蔬菜管理', company: '绿源蔬菜基地', salary: '90元/天', type: '临时', deadline: '12月15日', count: 8, location: '李庄村' },
  { id: 4, title: '村级物流分拣', company: '范庄驿站', salary: '2200元/月', type: '兼职', deadline: '长期', count: 1, location: '村委会' },
];

type VillageAffair = { date: string; title: string; category: string; amount: string; tag: string };
type PendingProduct = { id: number; name: string; price: string; unit: string; store: string; desc: string; status: '待审核' | '已通过' | '已驳回'; image?: string };
const INIT_VILLAGE_AFFAIRS: VillageAffair[] = [
  { date: '11月20日', title: '2024年村集体收入分配公示', category: '财务公开', amount: '¥12.6万', tag: '已公示' },
  { date: '11月15日', title: '村道硬化工程竣工验收报告', category: '工程公示', amount: '¥8.3万', tag: '已公示' },
  { date: '11月10日', title: '低保户核查名单及补助标准公示', category: '民政公示', amount: '—', tag: '已公示' },
  { date: '11月01日', title: '村委班子述职评议结果公告', category: '组织公开', amount: '—', tag: '已完成' },
  { date: '10月25日', title: '秋季农业补贴发放明细', category: '财务公开', amount: '¥5.4万', tag: '已公示' },
];

type VillageAdminApp = { id: number; name: string; village: string; township: string; phone: string; appliedRole: string; applyDate: string; status: '待审批' | '已批准' | '已拒绝'; permissions: string[] };
const INIT_VILLAGE_ADMIN_APPS: VillageAdminApp[] = [
  { id: 1, name: '张建国', village: '赵庄村', township: '方城乡', phone: '138****6721', appliedRole: '村服务中心管理员', applyDate: '11月22日', status: '待审批', permissions: [] },
  { id: 2, name: '李秀芬', village: '刘庄村', township: '方城乡', phone: '156****3344', appliedRole: '村服务中心管理员', applyDate: '11月20日', status: '待审批', permissions: [] },
  { id: 3, name: '王建平', village: '李庄村', township: '方城乡', phone: '139****5512', appliedRole: '村服务中心管理员', applyDate: '11月15日', status: '已批准', permissions: ['发布公告', '商品初审', '就业发布', '党建活动', '村务公开'] },
  { id: 4, name: '陈志远', village: '张庄村', township: '方城乡', phone: '177****8830', appliedRole: '村服务中心管理员', applyDate: '11月10日', status: '已拒绝', permissions: [] },
];

// ── Cart & Order Types ────────────────────────────────────────────────────────

type CartItem = { productId: number; qty: number };
type OrderStatus = '待付款' | '待发货' | '配送中' | '已签收' | '已取消' | '退款中';
type LogisticsNode = { time: string; desc: string; location: string };
type OrderReview = { rating: number; comment: string; anonymous: boolean; createdAt: string };
type Order = {
  id: string; items: CartItem[]; total: number;
  address: string; payment: string; deliveryMethod: string;
  status: OrderStatus; createdAt: string;
  courier: string; trackingNo: string;
  logistics: LogisticsNode[];
  review?: OrderReview;
  refundReason?: string;
};
type Coupon = { id: number; desc: string; discount: number; minAmount: number; tag: string; used?: boolean };

const MOCK_COUPONS: Coupon[] = [
  { id: 1, desc: '满50减5元', discount: 5, minAmount: 50, tag: '满减券' },
  { id: 2, desc: '新用户立减3元', discount: 3, minAmount: 0, tag: '无门槛' },
];

// ── Entrepreneur / Invite Types & Data ───────────────────────────────────────

type Downline = {
  id: number; name: string; phone: string;
  level: string; joinDate: string;
  gmv: number; earning: number; // earning = commission this user gets from them
};

const MOCK_DOWNLINES_INIT: Downline[] = [
  { id: 3, name: '张小花', phone: '152****8833', level: 'Lv.1', joinDate: '10月5日',  gmv: 860,  earning: 8.60  },
  { id: 4, name: '王二牛', phone: '139****4455', level: 'Lv.1', joinDate: '10月12日', gmv: 650,  earning: 6.50  },
  { id: 5, name: '陈翠翠', phone: '177****6677', level: 'Lv.1', joinDate: '10月20日', gmv: 420,  earning: 4.20  },
  { id: 6, name: '赵老四', phone: '135****9988', level: 'Lv.1', joinDate: '11月3日',  gmv: 280,  earning: 2.80  },
  { id: 7, name: '刘小娟', phone: '186****1122', level: 'Lv.2', joinDate: '10月8日',  gmv: 1840, earning: 18.40 },
];

const BIND_MOCK_POOL = [
  { name: '周建伟', phone: '188****7766' },
  { name: '吴小芳', phone: '133****2299' },
  { name: '郑强',   phone: '155****6644' },
  { name: '李慧',   phone: '181****3355' },
  { name: '冯大山', phone: '136****8811' },
];

type VillageEntrepreneur = {
  id: number; name: string; phone: string; level: string;
  monthGmv: number; monthCommission: number;
  downlines: { name: string; phone: string; gmv: number }[];
};

const VILLAGE_ENTREPRENEURS: VillageEntrepreneur[] = [
  {
    id: 1, name: '范村民', phone: '138****5678', level: 'Lv.3 推广达人',
    monthGmv: 2840, monthCommission: 142,
    downlines: [
      { name: '张小花', phone: '152****8833', gmv: 860 },
      { name: '王二牛', phone: '139****4455', gmv: 650 },
      { name: '陈翠翠', phone: '177****6677', gmv: 420 },
      { name: '赵老四', phone: '135****9988', gmv: 280 },
      { name: '刘小娟', phone: '186****1122', gmv: 1840 },
    ],
  },
  {
    id: 2, name: '李大壮', phone: '136****2211', level: 'Lv.2 活跃推广',
    monthGmv: 1260, monthCommission: 63,
    downlines: [
      { name: '孙大明', phone: '158****3344', gmv: 320 },
      { name: '周小梅', phone: '147****5566', gmv: 180 },
    ],
  },
  {
    id: 3, name: '陈秀英', phone: '153****7788', level: 'Lv.1 初级推广',
    monthGmv: 480, monthCommission: 24,
    downlines: [],
  },
];

const INIT_ORDERS: Order[] = [
  {
    id: 'GX202411220001',
    items: [{ productId: 1, qty: 2 }, { productId: 3, qty: 1 }],
    total: 71,
    address: '范庄村 12 组 · 张小红 · 138****5678',
    payment: '微信支付', deliveryMethod: '快递',
    status: '配送中', createdAt: '11月22日 10:24',
    courier: '顺丰速运', trackingNo: 'SF1234567890',
    logistics: [
      { time: '11月22日 10:24', desc: '您的订单已提交，等待商家确认', location: '范庄村电商服务站' },
      { time: '11月22日 11:05', desc: '商家已确认，正在备货打包', location: '范庄粮铺' },
      { time: '11月22日 14:30', desc: '已揽件，运往方城乡转运中心', location: '方城乡' },
      { time: '11月23日 08:15', desc: '到达南阳市中转站，正在转运', location: '南阳中转站' },
      { time: '11月23日 16:42', desc: '快件已到达范庄驿站，等待派送', location: '范庄村驿站' },
    ],
  },
  {
    id: 'GX202411180003',
    items: [{ productId: 5, qty: 1 }],
    total: 88,
    address: '范庄村 12 组 · 张小红 · 138****5678',
    payment: '微信支付', deliveryMethod: '快递',
    status: '已签收', createdAt: '11月18日 15:10',
    courier: '京东快递', trackingNo: 'JD0012345678901',
    logistics: [
      { time: '11月18日 15:10', desc: '您的订单已提交', location: '范庄村' },
      { time: '11月18日 16:20', desc: '商家已发货', location: '山顶蜂场' },
      { time: '11月19日 09:00', desc: '到达方城乡转运中心', location: '方城乡转运中心' },
      { time: '11月20日 10:30', desc: '快件已签收，签收人：本人', location: '范庄村 12 组' },
    ],
  },
];

const HERITAGE = [
  { id: 1, name: '方城石猴', category: '民间工艺', level: '省级', icon: '猴', desc: '距今已有200余年历史，以当地特有红石雕刻而成，造型灵动，寓意吉祥，是方城独有的民俗艺术珍品。' },
  { id: 2, name: '豫南皮影戏', category: '传统表演', level: '国家级', icon: '影', desc: '流传于方城地区的皮影艺术，以牛皮为材料，手工雕刻彩绘，配合传统乐器演出，已有四百年历史。' },
  { id: 3, name: '红薯粉条技艺', category: '传统技艺', level: '市级', icon: '粉', desc: '纯手工制作，选用本地红薯，经洗、磨、滤、晒等十余道工序，成品劲道爽滑，口感独特。' },
  { id: 4, name: '范庄落子舞', category: '民间舞蹈', level: '县级', icon: '舞', desc: '源自清代的民间舞蹈，以竹板打节拍，动作粗犷豪放，是农闲时节村民娱乐的重要形式。' },
];


// 党建地图：5列3行，用 col/row 定位
const PARTY_VILLAGES = [
  { name: '李庄村', active: true, members: 28, col: 0, row: 0 },
  { name: '张庄村', active: true, members: 22, col: 2, row: 0 },
  { name: '孙庄村', active: false, members: 0, col: 4, row: 0 },
  { name: '王庄村', active: false, members: 0, col: 1, row: 1 },
  { name: '范庄村', active: true, members: 31, col: 3, row: 1, current: true },
  { name: '赵庄村', active: true, members: 19, col: 0, row: 2 },
  { name: '刘庄村', active: true, members: 24, col: 2, row: 2 },
  { name: '陈庄村', active: false, members: 0, col: 4, row: 2 },
];

// ── App Shell ────────────────────────────────────────────────────────────────

type Tab = '首页' | '小店' | '团购' | '党建' | '我的';
type SubScreen = '就业招工' | '非遗文化' | '村务公开' | '购物车' | '确认订单' | '订单列表' | '物流查询' | '贡献体系' | '功能详情';

const TABS: { id: Tab; icon: string }[] = [
  { id: '首页', icon: '⌂' },
  { id: '小店', icon: '⊞' },
  { id: '团购', icon: '◎' },
  { id: '党建', icon: '✦' },
  { id: '我的', icon: '◉' },
];

// ── 页面适配版 IA：核心理念 + 六大板块 ───────────────────────────────────────
const CORE_IDEA = {
  badge: '党建引领',
  slogan: '人人共建 · 全城共享 · 全民供享',
  desc: '以全生命周期社会贡献体系为纽带，以公共贡献、社会效益作为村社评价与分配的核心标尺，推动乡村物质与精神双共富。',
};

type EntryRoute =
  | { kind: 'tab'; tab: Tab }
  | { kind: 'sub'; sub: SubScreen }
  | { kind: 'feature'; key: string }
  | { kind: 'contribution' };

type FeatureEntry = { label: string; icon: string; route: EntryRoute };
type ServiceSection = { key: string; title: string; tagline: string; icon: string; accent: string; entries: FeatureEntry[] };

const SERVICE_SECTIONS: ServiceSection[] = [
  {
    key: 'bianmin', title: '便民服务', tagline: '供享普惠 · 党建便民', icon: '☷', accent: '#4f8ef7',
    entries: [
      { label: '供享小店', icon: '⊞', route: { kind: 'tab', tab: '小店' } },
      { label: '政务办事', icon: '▣', route: { kind: 'feature', key: 'gov' } },
      { label: '健康医疗', icon: '✚', route: { kind: 'feature', key: 'health' } },
      { label: '生活缴费', icon: '¥', route: { kind: 'feature', key: 'pay' } },
      { label: '快递物流', icon: '➤', route: { kind: 'feature', key: 'express' } },
      { label: '惠民团购', icon: '◎', route: { kind: 'tab', tab: '团购' } },
      { label: '贡献商城', icon: '◈', route: { kind: 'feature', key: 'mall' } },
    ],
  },
  {
    key: 'xingnong', title: '兴农增收', tagline: '供建共富 · 党建兴农', icon: '❀', accent: '#22c55e',
    entries: [
      { label: '产销对接', icon: '⇄', route: { kind: 'feature', key: 'supply' } },
      { label: '农资农耕', icon: '❀', route: { kind: 'feature', key: 'agri' } },
      { label: '农技指导', icon: '✿', route: { kind: 'feature', key: 'tech' } },
      { label: '产权交易', icon: '▤', route: { kind: 'feature', key: 'property' } },
      { label: '助农金融', icon: '◉', route: { kind: 'feature', key: 'finance' } },
      { label: '文旅休闲', icon: '⚑', route: { kind: 'feature', key: 'tourism' } },
      { label: '就业招工', icon: '◧', route: { kind: 'sub', sub: '就业招工' } },
    ],
  },
  {
    key: 'zhili', title: '乡村治理', tagline: '供管共治 · 党建强基', icon: '✦', accent: '#f59e0b',
    entries: [
      { label: '党建联建', icon: '✦', route: { kind: 'tab', tab: '党建' } },
      { label: '村务公开', icon: '▦', route: { kind: 'sub', sub: '村务公开' } },
      { label: '村民议事', icon: '☷', route: { kind: 'feature', key: 'council' } },
      { label: '平安应急', icon: '⚠', route: { kind: 'feature', key: 'safety' } },
      { label: '志愿服务', icon: '♡', route: { kind: 'feature', key: 'volunteer' } },
    ],
  },
  {
    key: 'wenming', title: '乡风文明', tagline: '供塑新风 · 党建铸魂', icon: '★', accent: '#a78bfa',
    entries: [
      { label: '一老一小', icon: '⚘', route: { kind: 'feature', key: 'oldyoung' } },
      { label: '法务调解', icon: '⚖', route: { kind: 'feature', key: 'legal' } },
      { label: '技能学堂', icon: '✎', route: { kind: 'feature', key: 'skill' } },
      { label: '非遗文化', icon: '◑', route: { kind: 'sub', sub: '非遗文化' } },
      { label: '文明乡风', icon: '★', route: { kind: 'feature', key: 'civility' } },
    ],
  },
];

type FeatureContent = {
  title: string; section: string; tagline: string; icon: string; accent: string;
  intro: string; highlights: string[];
  listTitle?: string; list?: { name: string; sub?: string; tag?: string }[];
  contribNote?: string;
};

const FEATURE_CONTENT: Record<string, FeatureContent> = {
  // 便民服务
  gov: {
    title: '政务办事', section: '便民服务', tagline: '供享普惠 · 党建便民', icon: '▣', accent: '#4f8ef7',
    intro: '村民足不出村即可办理高频政务事项，村级代办员协助提交，办理进度实时可查。',
    highlights: ['高频事项掌上办', '村级代办帮代办', '办理进度实时追踪', '电子证照一键调取'],
    listTitle: '办事大厅', list: [
      { name: '社保认证', sub: '人脸认证 · 即时完成', tag: '高频' },
      { name: '医保参保缴费', sub: '城乡居民医保' },
      { name: '惠农补贴申领', sub: '种植 / 养殖补贴', tag: '高频' },
      { name: '户籍证明开具', sub: '在线申请邮寄到家' },
      { name: '宅基地审批', sub: '一户一宅资格核验' },
      { name: '残疾证办理', sub: '预约下乡评定' },
    ],
  },
  health: {
    title: '健康医疗', section: '便民服务', tagline: '供享普惠 · 党建便民', icon: '✚', accent: '#4f8ef7',
    intro: '链接村卫生室与乡镇卫生院，在线问诊、家庭医生签约、慢病随访一站式守护健康。',
    highlights: ['在线问诊与预约挂号', '家庭医生签约', '慢病用药提醒', '健康档案云端管理'],
    listTitle: '健康服务', list: [
      { name: '在线问诊', sub: '乡镇卫生院医生坐诊', tag: '7×24' },
      { name: '预约挂号', sub: '县乡两级号源' },
      { name: '家庭医生签约', sub: '一人一医一档' },
      { name: '慢病管理', sub: '高血压 / 糖尿病随访' },
      { name: '用药提醒', sub: '定时提醒不漏服' },
      { name: '体检报告查询', sub: '历年报告云端存' },
    ],
  },
  pay: {
    title: '生活缴费', section: '便民服务', tagline: '供享普惠 · 党建便民', icon: '¥', accent: '#4f8ef7',
    intro: '水费、电费、燃气、宽带、话费一个入口缴清，支持亲情代缴，老人也能轻松操作。',
    highlights: ['水电燃气一键缴', '亲情账户代缴', '缴费记录可查', '到期自动提醒'],
    listTitle: '缴费项目', list: [
      { name: '电费', sub: '国家电网' },
      { name: '水费', sub: '乡镇供水' },
      { name: '燃气费', sub: '管道 / 罐装' },
      { name: '宽带 / 话费', sub: '三大运营商' },
      { name: '有线电视', sub: '广电缴费' },
      { name: '取暖费', sub: '冬季集中收缴' },
    ],
  },
  express: {
    title: '快递物流', section: '便民服务', tagline: '供享普惠 · 党建便民', icon: '➤', accent: '#4f8ef7',
    intro: '村级寄递综合服务站，快递进村、农货出村，代收代寄不出村，物流轨迹实时可查。',
    highlights: ['快递进村免跑腿', '农产品上行寄递', '村站代收代寄', '到件短信通知'],
    listTitle: '驿站服务', list: [
      { name: '快件代收', sub: '到村统一签收', tag: '免费' },
      { name: '上门取件', sub: '村内预约揽收' },
      { name: '农货寄递', sub: '产地直发优惠价' },
      { name: '到件通知', sub: '短信 / 小程序提醒' },
    ],
  },
  mall: {
    title: '贡献商城', section: '便民服务', tagline: '供享普惠 · 党建便民', icon: '◈', accent: '#4f8ef7',
    intro: '用贡献值兑换实物好礼与服务权益，让社会贡献"看得见、兑得到"，本地好货优先上架。',
    highlights: ['贡献值兑好物', '专属荣誉权益', '本地好货优先', '定期上新'],
    listTitle: '热门兑换', list: [
      { name: '有机小米 1 斤', sub: '范庄粮铺', tag: '500 贡献值' },
      { name: '土鸡蛋 6 枚', sub: '王大姐农场', tag: '300 贡献值' },
      { name: '村卫生室体检券', sub: '基础体检套餐', tag: '800 贡献值' },
      { name: '农技上门服务券', sub: '专家到地头', tag: '600 贡献值' },
    ],
    contribNote: '贡献商城是「共享」价值兑换出口之一，贡献值越多可兑换的好物与权益越丰富。',
  },
  // 兴农增收
  supply: {
    title: '产销对接', section: '兴农增收', tagline: '供建共富 · 党建兴农', icon: '⇄', accent: '#22c55e',
    intro: '打通农产品从田间到餐桌的销路，村集体统一对接商超、电商、机关食堂等大宗订单。',
    highlights: ['订单农业产销直连', '村集体统一议价', '商超食堂大宗采购', '滞销预警帮扶'],
    listTitle: '对接渠道', list: [
      { name: '商超直供', sub: '县域连锁商超', tag: '长期' },
      { name: '电商代运营', sub: '直播带货 / 网店' },
      { name: '机关食堂', sub: '消费帮扶采购' },
      { name: '社区团长', sub: '城区社区团购' },
    ],
  },
  agri: {
    title: '农资农耕', section: '兴农增收', tagline: '供建共富 · 党建兴农', icon: '❀', accent: '#22c55e',
    intro: '正规农资集中采购更实惠，农机共享调度，春耕秋收不误农时，正品溯源更放心。',
    highlights: ['农资团购降成本', '农机共享调度', '正品溯源保障', '按需配送到村'],
    listTitle: '农资农机', list: [
      { name: '种子 / 化肥', sub: '厂家直供溯源', tag: '团购价' },
      { name: '农药兽药', sub: '正规渠道保真' },
      { name: '农机租赁', sub: '收割机 / 旋耕机' },
      { name: '地膜农具', sub: '按需配送到村' },
    ],
  },
  tech: {
    title: '农技指导', section: '兴农增收', tagline: '供建共富 · 党建兴农', icon: '✿', accent: '#22c55e',
    intro: '农技专家在线答疑、田间课堂、病虫害诊断，把实用技术送到田间地头。',
    highlights: ['专家在线答疑', '病虫害拍照识别', '田间课堂直播', '种养技术库'],
    listTitle: '技术服务', list: [
      { name: '在线问诊', sub: '县乡农技员答疑', tag: '免费' },
      { name: '病虫害识别', sub: '拍照 AI 初判' },
      { name: '田间课堂', sub: '直播 + 回放' },
      { name: '专家预约', sub: '关键农时上门' },
    ],
    contribNote: '为乡邻提供技术帮扶、带动产业增收，将计入「立业贡献」获得贡献值。',
  },
  property: {
    title: '产权交易', section: '兴农增收', tagline: '供建共富 · 党建兴农', icon: '▤', accent: '#22c55e',
    intro: '农村土地经营权、宅基地、集体资产规范流转，阳光交易、合同存证、全程留痕。',
    highlights: ['土地经营权流转', '集体资产竞价', '合同在线签约', '交易全程留痕'],
    listTitle: '交易品类', list: [
      { name: '土地经营权流转', sub: '挂牌 / 摘牌', tag: '热门' },
      { name: '宅基地盘活', sub: '闲置农房利用' },
      { name: '集体资产竞价', sub: '公开透明竞拍' },
      { name: '林权交易', sub: '林地经营权' },
    ],
  },
  finance: {
    title: '助农金融', section: '兴农增收', tagline: '供建共富 · 党建兴农', icon: '◉', accent: '#22c55e',
    intro: '对接涉农银行与保险机构，免抵押小额信贷、农业保险一键申请，信用增信更便捷。',
    highlights: ['惠农贷款快申请', '农业保险投保', '信用积分增信', '政策补贴直达'],
    listTitle: '金融服务', list: [
      { name: '惠农贷款', sub: '免抵押 · 利率优惠', tag: '快批' },
      { name: '农业保险', sub: '种植 / 养殖险' },
      { name: '信用评估', sub: '贡献值参与增信' },
      { name: '补贴申领', sub: '政策资金直达' },
    ],
    contribNote: '良好的贡献记录可纳入村民信用评估，助力贷款增信、享受更优惠利率。',
  },
  tourism: {
    title: '文旅休闲', section: '兴农增收', tagline: '供建共富 · 党建兴农', icon: '⚑', accent: '#22c55e',
    intro: '推介乡村旅游、农家乐、采摘体验，把游客引进来、农货带出去，文旅融合促增收。',
    highlights: ['乡村旅游线路', '农家乐预订', '采摘体验报名', '民俗活动展示'],
    listTitle: '文旅体验', list: [
      { name: '农家乐预订', sub: '本村特色餐宿', tag: '推荐' },
      { name: '采摘园', sub: '当季果蔬采摘' },
      { name: '特色民宿', sub: '乡村慢生活' },
      { name: '研学路线', sub: '非遗 + 农耕研学' },
    ],
  },
  // 乡村治理
  council: {
    title: '村民议事', section: '乡村治理', tagline: '供管共治 · 党建强基', icon: '☷', accent: '#f59e0b',
    intro: '线上议事厅，村民提议、投票表决、结果公示，真正实现民事民议、民事民决。',
    highlights: ['村民线上提议', '议题投票表决', '结果公开公示', '办理进度跟踪'],
    listTitle: '议事进行中', list: [
      { name: '文化广场改造方案', sub: '已投票 186 / 312', tag: '表决中' },
      { name: '垃圾分类点选址', sub: '征求意见中' },
      { name: '自来水管网改造', sub: '方案公示' },
      { name: '村规民约修订', sub: '已通过 · 公示中', tag: '已决' },
    ],
    contribNote: '参与议事、建言献策、投票表决均计入「治理贡献」，获得相应贡献值。',
  },
  safety: {
    title: '平安应急', section: '乡村治理', tagline: '供管共治 · 党建强基', icon: '⚠', accent: '#f59e0b',
    intro: '一键报警求助、隐患随手拍、应急广播通知，网格员快速响应，联防联控保平安。',
    highlights: ['一键求助报警', '隐患随手拍', '应急广播通知', '网格员快速响应'],
    listTitle: '平安服务', list: [
      { name: '一键求助', sub: '直达网格员 / 村干部', tag: '紧急' },
      { name: '隐患上报', sub: '拍照定位上报' },
      { name: '应急避难点', sub: '就近避险指引' },
      { name: '天气预警', sub: '防汛防火提示' },
    ],
  },
  volunteer: {
    title: '志愿服务', section: '乡村治理', tagline: '供管共治 · 党建强基', icon: '♡', accent: '#f59e0b',
    intro: '志愿活动报名、服务时长记录、爱心榜公示，党员带头、邻里互助蔚然成风。',
    highlights: ['志愿活动报名', '服务时长记录', '贡献值激励', '爱心榜公示'],
    listTitle: '招募中', list: [
      { name: '关爱独居老人', sub: '每周探访', tag: '招募中' },
      { name: '村道清洁', sub: '周末集中' },
      { name: '防汛值守', sub: '汛期轮班' },
      { name: '文明劝导', sub: '红白事劝导' },
    ],
    contribNote: '参与志愿服务计入「治理贡献」与「乡风贡献」，服务时长可兑换爱心权益。',
  },
  // 乡风文明
  oldyoung: {
    title: '一老一小', section: '乡风文明', tagline: '供塑新风 · 党建铸魂', icon: '⚘', accent: '#a78bfa',
    intro: '聚焦留守老人与儿童关爱，助餐助医、课后托管、定期探访、亲情连线不缺位。',
    highlights: ['老人助餐助医', '儿童课后托管', '定期探访关怀', '亲情视频连线'],
    listTitle: '关爱服务', list: [
      { name: '长者食堂', sub: '助餐 · 营养配餐', tag: '惠老' },
      { name: '课后托管', sub: '作业辅导 + 兴趣' },
      { name: '定期探访', sub: '志愿者结对' },
      { name: '亲情连线', sub: '视频联系在外子女' },
    ],
    contribNote: '为一老一小提供关爱服务，将计入「乡风贡献」与「银龄贡献」。',
  },
  legal: {
    title: '法务调解', section: '乡风文明', tagline: '供塑新风 · 党建铸魂', icon: '⚖', accent: '#a78bfa',
    intro: '村级调解员 + 在线律师，矛盾纠纷就地化解，普法宣传润物无声，协议范本一键取。',
    highlights: ['矛盾纠纷调解', '在线法律咨询', '普法以案说法', '合同协议范本'],
    listTitle: '法务服务', list: [
      { name: '纠纷调解', sub: '村级调解委员会', tag: '就地办' },
      { name: '法律咨询', sub: '在线律师答疑' },
      { name: '普法学堂', sub: '以案说法' },
      { name: '协议范本', sub: '土地 / 借贷范本' },
    ],
  },
  skill: {
    title: '技能学堂', section: '乡风文明', tagline: '供塑新风 · 党建铸魂', icon: '✎', accent: '#a78bfa',
    intro: '实用技能培训与就业技能提升，电商、家政、烹饪、传统手艺线上线下结合学。',
    highlights: ['实用技能课程', '就业技能提升', '线上线下结合', '结业可获贡献值'],
    listTitle: '热门课程', list: [
      { name: '电商运营', sub: '直播带货实操', tag: '热报' },
      { name: '家政月嫂', sub: '持证上岗' },
      { name: '烹饪面点', sub: '农家菜 / 面点' },
      { name: '传统手艺', sub: '非遗技艺传习' },
    ],
    contribNote: '完成技能学习与考核计入「成长贡献」，提升就业本领更增收。',
  },
  civility: {
    title: '文明乡风', section: '乡风文明', tagline: '供塑新风 · 党建铸魂', icon: '★', accent: '#a78bfa',
    intro: '文明红黑榜、文明积分、移风易俗，倡导厚养薄葬、喜事新办的乡村新风尚。',
    highlights: ['文明户红榜', '移风易俗倡议', '好人好事推荐', '文明积分激励'],
    listTitle: '乡风建设', list: [
      { name: '文明红榜', sub: '星级文明户', tag: '光荣榜' },
      { name: '移风易俗', sub: '红白事简办倡议' },
      { name: '好人好事', sub: '身边榜样推荐' },
      { name: '积分兑换', sub: '文明积分兑好礼' },
    ],
    contribNote: '践行文明新风、推动移风易俗计入「乡风贡献」，是荣誉评定的重要依据。',
  },
};

// ── 贡献体系：全生命周期五维度 + 共享价值兑换出口 ───────────────────────────
type ContribDimension = { key: string; name: string; tagline: string; icon: string; accent: string; behaviors: string[]; value: number };
const CONTRIB_DIMENSIONS: ContribDimension[] = [
  { key: 'growth', name: '成长贡献', tagline: '育儿 · 少年 · 成长', icon: '✿', accent: '#22c55e', behaviors: ['育儿互动', '少年志愿', '技能学习', '科普参与'], value: 320 },
  { key: 'career', name: '立业贡献', tagline: '创业 · 带富 · 帮扶', icon: '◉', accent: '#4f8ef7', behaviors: ['就业带动', '产业带富', '产销帮扶', '创业引领'], value: 460 },
  { key: 'govern', name: '治理贡献', tagline: '议事 · 守护 · 献策', icon: '⚑', accent: '#f59e0b', behaviors: ['村务议事', '志愿值守', '隐忧上报', '建言献策'], value: 280 },
  { key: 'culture', name: '乡风贡献', tagline: '文明 · 传承 · 互助', icon: '★', accent: '#a78bfa', behaviors: ['文明践行', '移风易俗', '非遗传承', '邻里互助'], value: 240 },
  { key: 'silver', name: '银龄贡献', tagline: '经验 · 乡贤 · 家风', icon: '☷', accent: '#ef4444', behaviors: ['经验传授', '乡贤助力', '家风传承', '银龄服务'], value: 180 },
];
const CONTRIB_TOTAL = CONTRIB_DIMENSIONS.reduce((a, d) => a + d.value, 0); // 1480

const CONTRIB_EXCHANGE: { name: string; desc: string; icon: string; accent: string }[] = [
  { name: '收益分红', desc: '持链上凭证参与利益共享金按比例分配', icon: '¥', accent: '#22c55e' },
  { name: '服务兑换', desc: '兑换健康体检、农技上门、家政等服务', icon: '✚', accent: '#4f8ef7' },
  { name: '商品抵扣', desc: '贡献值在供享小店、贡献商城抵扣消费', icon: '◈', accent: '#f59e0b' },
  { name: '荣誉评定', desc: '文明户、星级乡贤、最美村民评定依据', icon: '★', accent: '#a78bfa' },
];

export default function AppRoot() {
  const [mode, setMode] = useState<'dark' | 'light'>('dark');
  return (
    <ThemeProvider mode={mode}>
      <GongXiangDemo mode={mode} onToggle={() => setMode(m => m === 'dark' ? 'light' : 'dark')} />
    </ThemeProvider>
  );
}

function GongXiangDemo({ mode, onToggle }: { mode: 'dark' | 'light'; onToggle: () => void }) {
  const theme = useHostTheme();
  const [tab, setTab] = useState<Tab>('首页');
  const [subScreen, setSubScreen] = useState<SubScreen | null>(null);
  const [featureKey, setFeatureKey] = useState<string | null>(null);
  const [elderMode, setElderMode] = useState(false);
  const [productDetail, setProductDetail] = useState<number | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [joined, setJoined] = useState<Set<number>>(new Set());
  const [groupCounts, setGroupCounts] = useState<Record<number, number>>({});
  const [adminMode, setAdminMode] = useState(false);
  const [platformMode, setPlatformMode] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [villageAdminApps, setVillageAdminApps] = useState<VillageAdminApp[]>(INIT_VILLAGE_ADMIN_APPS);

  // shared state — admin publishes, villager side reflects
  const [notices, setNotices] = useState<string[]>(INIT_NOTICES);
  const [jobs, setJobs] = useState<Job[]>(INIT_JOBS);
  const [partyEvents, setPartyEvents] = useState<PartyEvent[]>(INIT_PARTY_EVENTS);
  const [villageAffairs, setVillageAffairs] = useState<VillageAffair[]>(INIT_VILLAGE_AFFAIRS);
  const [pendingProducts, setPendingProducts] = useState<PendingProduct[]>([
    { id: 1001, name: '苦荞茶叶', price: '45', unit: '盒', store: '李老三小店', desc: '本地苦荞手工炒制', status: '待审核' },
    { id: 1002, name: '手工布鞋', price: '88', unit: '双', store: '张大娘手艺坊', desc: '纯手工纳底，穿着舒适', status: '待审核' },
    { id: 1003, name: '黑花生 500g', price: '18', unit: '袋', store: '王老五农场', desc: '自家种植黑花生，无农药', status: '已通过' },
    { id: 1004, name: '腌萝卜', price: '12', unit: '瓶', store: '赵老四酱菜铺', desc: '传统腌制工艺', status: '已驳回' },
  ]);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>(INIT_ORDERS);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [signInStreak, setSignInStreak] = useState(4); // mock: 4-day streak already

  const onUpdateOrder = (id: string, changes: Partial<Order>) =>
    setOrders(prev => prev.map(o => o.id === id ? { ...o, ...changes } : o));

  const cartTotalCount = cart.reduce((a, b) => a + b.qty, 0);

  const addToCart = (productId: number, qty: number) => {
    setCart(prev => {
      const existing = prev.find(i => i.productId === productId);
      if (existing) return prev.map(i => i.productId === productId ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { productId, qty }];
    });
  };

  const updateCartQty = (productId: number, qty: number) => {
    if (qty <= 0) setCart(prev => prev.filter(i => i.productId !== productId));
    else setCart(prev => prev.map(i => i.productId === productId ? { ...i, qty } : i));
  };

  const handleJoin = (id: number) => {
    if (joined.has(id)) return;
    setJoined(prev => new Set([...prev, id]));
    setGroupCounts(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  };

  const handleTabChange = (t: Tab) => {
    setTab(t);
    setSubScreen(null);
    setFeatureKey(null);
    setProductDetail(null);
  };

  const onEntry = (route: EntryRoute) => {
    if (route.kind === 'tab') { handleTabChange(route.tab); return; }
    setProductDetail(null);
    if (route.kind === 'sub') { setSubScreen(route.sub); return; }
    if (route.kind === 'feature') { setFeatureKey(route.key); setSubScreen('功能详情'); return; }
    if (route.kind === 'contribution') { setSubScreen('贡献体系'); return; }
  };

  const goBack = () => {
    if (subScreen === '物流查询') { setSubScreen('订单列表'); return; }
    if (subScreen === '确认订单') { setSubScreen('购物车'); return; }
    setSubScreen(null);
    setFeatureKey(null);
    setProductDetail(null);
  };

  const renderPhoneContent = () => {
    if (!loggedIn) return <LoginScreen theme={theme} onLogin={() => setLoggedIn(true)} />;
    if (elderMode) return <ElderModeScreen theme={theme} onExit={() => setElderMode(false)} onEntry={(r) => { setElderMode(false); onEntry(r); }} />;
    if (subScreen === '贡献体系') return <ContributionScreen theme={theme} onBack={goBack} />;
    if (subScreen === '功能详情' && featureKey) return <FeatureScreen theme={theme} featureKey={featureKey} onBack={goBack} onEntry={onEntry} />;
    if (subScreen === '就业招工') return <JobScreen theme={theme} onBack={goBack} jobs={jobs} />;
    if (subScreen === '非遗文化') return <HeritageScreen theme={theme} onBack={goBack} />;
    if (subScreen === '村务公开') return <VillageAffairsScreen theme={theme} onBack={goBack} affairs={villageAffairs} />;
    if (subScreen === '购物车') return (
      <CartScreen
        theme={theme} cart={cart}
        onUpdateQty={updateCartQty}
        onRemove={id => setCart(prev => prev.filter(i => i.productId !== id))}
        onCheckout={() => setSubScreen('确认订单')}
        onBack={goBack}
      />
    );
    if (subScreen === '确认订单') return (
      <OrderConfirmScreen
        theme={theme} cart={cart}
        onSubmit={order => { setOrders(prev => [order, ...prev]); setCart([]); }}
        onBack={goBack}
        onViewOrders={() => setSubScreen('订单列表')}
      />
    );
    if (subScreen === '订单列表') return (
      <OrdersScreen
        theme={theme} orders={orders}
        onUpdateOrder={onUpdateOrder}
        onViewLogistics={id => { setSelectedOrderId(id); setSubScreen('物流查询'); }}
        onBack={goBack}
      />
    );
    if (subScreen === '物流查询') {
      const ord = orders.find(o => o.id === selectedOrderId);
      if (ord) return <LogisticsScreen theme={theme} order={ord} onBack={goBack} />;
    }
    if (productDetail !== null) {
      const p = PRODUCTS.find(x => x.id === productDetail);
      if (p) return (
        <ProductDetailScreen
          product={p} theme={theme} onBack={goBack}
          onAddToCart={(productId, qty) => { addToCart(productId, qty); setSubScreen('购物车'); }}
          onBuyNow={(productId, qty) => { setCart([{ productId, qty }]); setSubScreen('确认订单'); }}
        />
      );
    }
    if (tab === '首页') return <HomeScreen theme={theme} setTab={handleTabChange} onEntry={onEntry} notices={notices} signedIn={signedIn} signInStreak={signInStreak} onSignIn={() => { setSignedIn(true); setSignInStreak(s => s + 1); }} />;
    if (tab === '小店') return <StoreScreen theme={theme} selected={selected} setSelected={setSelected} onDetail={setProductDetail} />;
    if (tab === '团购') return <GroupScreen theme={theme} joined={joined} groupCounts={groupCounts} onJoin={handleJoin} />;
    if (tab === '党建') return <PartyScreen theme={theme} partyEvents={partyEvents} />;
    if (tab === '我的') return (
      <ProfileScreen
        theme={theme} joined={joined}
        pendingProducts={pendingProducts}
        onSubmitProduct={p => setPendingProducts(prev => [...prev, p])}
        onLogout={() => setLoggedIn(false)}
        onViewOrders={() => setSubScreen('订单列表')}
        onViewContribution={() => setSubScreen('贡献体系')}
        onElderMode={() => setElderMode(true)}
        orders={orders}
      />
    );
  };

  const activeTab = subScreen || productDetail !== null ? null : tab;

  if (platformMode) {
    return (
      <PlatformBackend
        theme={theme} mode={mode} onToggle={onToggle}
        onExit={() => setPlatformMode(false)}
        villageAdminApps={villageAdminApps} setVillageAdminApps={setVillageAdminApps}
      />
    );
  }

  if (adminMode) {
    return (
      <AdminBackend
        theme={theme}
        mode={mode}
        onToggle={onToggle}
        onExit={() => setAdminMode(false)}
        notices={notices} setNotices={setNotices}
        jobs={jobs} setJobs={setJobs}
        partyEvents={partyEvents} setPartyEvents={setPartyEvents}
        villageAffairs={villageAffairs} setVillageAffairs={setVillageAffairs}
        pendingProducts={pendingProducts} setPendingProducts={setPendingProducts}
      />
    );
  }

  return (
    <div className="demo-shell" style={{ display: 'flex', height: '100dvh', background: theme.bg.chrome, overflow: 'hidden' }}>
      {/* Phone Frame */}
      <div className="phone-shell" style={{
        width: 390, maxWidth: '100vw', flexShrink: 0,
        background: theme.bg.editor,
        borderRight: `1px solid ${theme.stroke.secondary}`,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', background: theme.bg.elevated,
          borderBottom: `1px solid ${theme.stroke.tertiary}`, flexShrink: 0,
        }}>
          <Text size="small" style={{ fontWeight: 600, color: theme.text.secondary }}>9:41</Text>
          <Text size="small" style={{ color: theme.text.secondary }}>供享村社</Text>
          <button onClick={() => setSubScreen('购物车')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 0, position: 'relative', display: 'flex', alignItems: 'center',
          }}>
            <span style={{ fontSize: 15, color: theme.text.secondary }}>🛒</span>
            {cartTotalCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -6,
                background: '#ef4444', color: '#fff', borderRadius: '50%',
                width: 14, height: 14, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 9, fontWeight: 700,
              }}>{cartTotalCount}</span>
            )}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {renderPhoneContent()}
        </div>

        <div style={{
          height: 60, display: 'flex', alignItems: 'center',
          borderTop: `1px solid ${theme.stroke.secondary}`,
          background: theme.bg.elevated, flexShrink: 0,
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
              flex: 1, height: '100%', border: 'none', background: 'none',
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: 2,
            }}>
              <span style={{ fontSize: 18, color: activeTab === t.id ? theme.accent.primary : theme.text.tertiary }}>
                {t.icon}
              </span>
              <span style={{
                fontSize: 10,
                color: activeTab === t.id ? theme.accent.primary : theme.text.tertiary,
                fontWeight: activeTab === t.id ? 600 : 400,
              }}>{t.id}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div className="desktop-panel" style={{ flex: 1, overflow: 'auto', padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20, gap: 8 }}>
          <button onClick={() => setPlatformMode(true)} style={{
            padding: '6px 14px', borderRadius: 20,
            border: `1px solid ${theme.accent.primary}`,
            background: `${theme.accent.primary}15`, color: theme.accent.primary,
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
          }}>平台运营商后台</button>
          <button onClick={() => setAdminMode(true)} style={{
            padding: '6px 14px', borderRadius: 20,
            border: `1px solid ${theme.stroke.secondary}`,
            background: theme.bg.elevated, color: theme.text.secondary,
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
          }}>村管理员后台</button>
          <button onClick={onToggle} style={{
            padding: '6px 14px', borderRadius: 20, border: `1px solid ${theme.stroke.secondary}`,
            background: theme.bg.elevated, color: theme.text.secondary,
            cursor: 'pointer', fontSize: 12, fontWeight: 500,
          }}>{mode === 'dark' ? '切换浅色' : '切换深色'}</button>
        </div>
        <RightPanel theme={theme} tab={tab} selected={selected} joined={joined} subScreen={subScreen} productDetail={productDetail} />
      </div>
    </div>
  );
}

// ── Login Screen ─────────────────────────────────────────────────────────────

function MockQR({ size = 140 }: { size?: number }) {
  const rows = [
    '111111100101001111111',
    '100000101001001000001',
    '101110101100001011101',
    '101110100110101011101',
    '101110101001001011101',
    '100000100010001000001',
    '111111101010101111111',
    '000000001001000000000',
    '111010110011110100101',
    '001101000100001001010',
    '110011101011011001110',
    '010100010001010100010',
    '101111011010110111010',
    '000000010001101010001',
    '111111101011011010101',
    '100000100100001001001',
    '101110110001010110110',
    '101110100010001010001',
    '101110101001011011010',
    '100000100110001000100',
    '111111101000101110111',
  ];
  const cell = Math.floor((size - 8) / 21);
  return (
    <div style={{
      width: size, height: size, background: '#fff',
      padding: 4, borderRadius: 10, display: 'inline-block',
      boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(21, ${cell}px)`,
        gridTemplateRows: `repeat(21, ${cell}px)`,
        width: 21 * cell, height: 21 * cell,
        margin: '0 auto',
      }}>
        {rows.flatMap((row, r) =>
          row.split('').map((c, col) => (
            <div key={`${r}-${col}`} style={{ background: c === '1' ? '#111' : '#fff' }} />
          ))
        )}
      </div>
    </div>
  );
}

type LoginTab = '微信' | '扫码' | '手机号';

function LoginScreen({ theme, onLogin }: { theme: Theme; onLogin: () => void }) {
  const [activeTab, setActiveTab] = useState<LoginTab>('微信');
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [codeRequested, setCodeRequested] = useState(false);
  const [error, setError] = useState('');

  // 倒计时
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // 微信 OAuth 跳回来时自动完成登录
  useEffect(() => {
    if (!authing) return;
    authing.handleRedirectCallback()
      .then((user: unknown) => { if (user) onLogin(); })
      .catch(() => {}); // 非回调页面时会报错，静默忽略
  }, []);

  // ── 微信登录 ─────────────────────────────────────────────────────────────────
  const wechatLogin = async () => {
    setError('');
    if (!isConfigured || !authing) {
      // 演示模式：模拟登录
      setLoading(true);
      setTimeout(() => { setLoading(false); onLogin(); }, 1400);
      return;
    }
    try {
      // 跳转到 Authing 托管登录页（在控制台开启「微信网页授权」后即可微信一键登录）
      await authing.loginWithRedirect();
    } catch (e: any) {
      setError((e as Error).message || '微信登录失败，请稍后重试');
    }
  };

  // ── 发送短信验证码 ────────────────────────────────────────────────────────────
  const requestCode = async () => {
    if (!phone.match(/^1[3-9]\d{9}$/)) return;
    setError('');
    if (!isConfigured || !authing) {
      // 演示模式：模拟发码
      setCodeRequested(true);
      setCountdown(60);
      return;
    }
    // 真实环境：@authing/web SDK 不支持直接发短信，跳转到 Authing 托管登录页
    // 托管登录页内置短信验证码 + 微信登录，配置好后体验一致
    try {
      await authing.loginWithRedirect();
    } catch (e: any) {
      setError((e as Error).message || '跳转登录页失败');
    }
  };

  // ── 手机号验证码登录（未注册自动注册） ────────────────────────────────────────
  const phoneLogin = async () => {
    if (code.length < 6) return;
    setError('');
    setLoading(true);
    // 演示模式或真实模式均走 mock（真实短信登录通过上一步的 Authing 托管登录页完成）
    setTimeout(() => { setLoading(false); onLogin(); }, 800);
  };

  const inputStyle: React.CSSProperties = {
    padding: '11px 14px', borderRadius: 10, fontSize: 14, outline: 'none',
    border: `1px solid ${theme.stroke.secondary}`,
    background: theme.fill.tertiary, color: theme.text.primary,
    width: '100%', boxSizing: 'border-box',
  };

  const validPhone = /^1[3-9]\d{9}$/.test(phone);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', padding: '0 0 24px' }}>
      {/* Logo */}
      <div style={{ padding: '52px 24px 28px', textAlign: 'center' }}>
        <div style={{
          width: 68, height: 68, borderRadius: 18, background: theme.accent.primary,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: theme.text.onAccent, fontWeight: 700, fontSize: 26,
          margin: '0 auto 14px', boxShadow: `0 4px 16px ${theme.accent.primary}55`,
        }}>村</div>
        <Text style={{ fontWeight: 700, fontSize: 20, color: theme.text.primary, display: 'block' }}>供享村社</Text>
        <Text size="small" tone="secondary" style={{ marginTop: 4, display: 'block' }}>乡村数字经济平台</Text>
      </div>

      {/* Tab switcher */}
      <div style={{
        display: 'flex', margin: '0 24px 24px',
        borderRadius: 12, background: theme.fill.tertiary, padding: 3, gap: 2,
      }}>
        {(['微信', '扫码', '手机号'] as LoginTab[]).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            flex: 1, padding: '8px 0', borderRadius: 10, border: 'none',
            background: activeTab === t ? theme.bg.elevated : 'none',
            color: activeTab === t ? theme.text.primary : theme.text.tertiary,
            cursor: 'pointer', fontSize: 13,
            fontWeight: activeTab === t ? 600 : 400,
            boxShadow: activeTab === t ? '0 1px 4px rgba(0,0,0,0.12)' : 'none',
            transition: 'all 0.15s',
          }}>{t}登录</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '0 24px', flex: 1 }}>

        {/* WeChat */}
        {activeTab === '微信' && (
          <Stack gap={20} style={{ textAlign: 'center' }}>
            <div style={{
              width: 76, height: 76, borderRadius: '50%', background: '#07c160',
              margin: '4px auto 0',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px #07c16055',
            }}>
              <svg width="40" height="32" viewBox="0 0 40 32" fill="none">
                <path d="M14.5 2C7.6 2 2 6.9 2 13c0 3.5 1.8 6.6 4.7 8.7l-1.4 4.3 4.8-2.4c1.4.4 2.9.6 4.4.6.4 0 .8 0 1.2-.1-.3-.9-.4-1.8-.4-2.8 0-5.5 5.1-9.9 11.4-9.9.4 0 .8 0 1.2.1C26.4 5.7 20.8 2 14.5 2z" fill="white"/>
                <path d="M27.5 12c-5.8 0-10.5 3.8-10.5 8.5 0 4.7 4.7 8.5 10.5 8.5 1.3 0 2.5-.2 3.7-.5l3.8 1.9-1.1-3.4C36.2 25.4 38 23 38 20.5 38 15.8 33.3 12 27.5 12z" fill="white"/>
              </svg>
            </div>
            <Stack gap={6}>
              <Text style={{ fontWeight: 600, fontSize: 16, color: theme.text.primary }}>微信授权登录</Text>
              <Text size="small" tone="secondary">
                {isConfigured ? '一键获取微信身份，安全快捷' : '演示模式 · 点击跳过直接进入'}
              </Text>
            </Stack>
            {/* 未配置时的说明条 */}
            {!isConfigured && (
              <div style={{
                padding: '9px 13px', borderRadius: 8, textAlign: 'left',
                background: '#f59e0b18', border: `1px solid #f59e0b40`,
              }}>
                <Text size="small" style={{ color: '#f59e0b', display: 'block', fontWeight: 600, marginBottom: 4 }}>
                  配置说明
                </Text>
                <Text size="small" style={{ color: '#f59e0b', fontSize: 10 }}>
                  在 src/authing.ts 填入 Authing AppID 即可开启真实微信登录
                </Text>
              </div>
            )}
            {error && (
              <div style={{ padding: '9px 13px', borderRadius: 8, background: '#ef444418', border: `1px solid #ef444440` }}>
                <Text size="small" style={{ color: '#ef4444' }}>{error}</Text>
              </div>
            )}
            <button onClick={wechatLogin} disabled={loading} style={{
              width: '100%', padding: '15px', borderRadius: 30, border: 'none',
              background: loading ? theme.fill.secondary : '#07c160',
              color: '#fff', cursor: loading ? 'default' : 'pointer',
              fontSize: 15, fontWeight: 700, letterSpacing: 1,
              boxShadow: loading ? 'none' : '0 4px 12px #07c16040',
              transition: 'all 0.2s',
            }}>
              {loading ? '登录中…' : isConfigured ? '微信一键登录' : '演示登录'}
            </button>
            <Text size="small" tone="secondary" style={{ fontSize: 11 }}>
              {isConfigured ? '首次登录自动注册 · 仅获取头像和昵称' : '真实环境需在 Authing 控制台开启微信社会化登录'}
            </Text>
          </Stack>
        )}

        {/* QR */}
        {activeTab === '扫码' && (
          <Stack gap={16} style={{ textAlign: 'center' }}>
            <Text size="small" tone="secondary">打开微信，扫描下方二维码登录</Text>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
              <MockQR size={160} />
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 20,
              background: theme.fill.tertiary, margin: '0 auto',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
              <Text size="small" tone="secondary" style={{ fontSize: 11 }}>二维码有效 · 扫码后自动登录</Text>
            </div>
            <button style={{
              padding: '9px 24px', borderRadius: 20,
              border: `1px solid ${theme.stroke.secondary}`,
              background: 'none', color: theme.text.secondary,
              cursor: 'pointer', fontSize: 13, margin: '0 auto', display: 'block',
            }}>刷新二维码</button>
          </Stack>
        )}

        {/* Phone */}
        {activeTab === '手机号' && (
          <Stack gap={14}>
            <div>
              <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 6 }}>手机号</Text>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{
                  padding: '11px 14px', borderRadius: 10, flexShrink: 0,
                  border: `1px solid ${theme.stroke.secondary}`,
                  background: theme.fill.tertiary, color: theme.text.secondary, fontSize: 14,
                }}>+86</div>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="请输入手机号"
                  style={{ ...inputStyle, flex: 1, width: 'auto' }}
                />
              </div>
            </div>
            <div>
              <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 6 }}>验证码</Text>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6 位验证码"
                  style={{ ...inputStyle, flex: 1, width: 'auto' }}
                />
                <button onClick={requestCode} disabled={countdown > 0 || !validPhone} style={{
                  padding: '11px 12px', borderRadius: 10, border: 'none', flexShrink: 0,
                  background: countdown > 0 || !validPhone ? theme.fill.secondary : theme.accent.primary,
                  color: countdown > 0 || !validPhone ? theme.text.tertiary : theme.text.onAccent,
                  cursor: countdown > 0 || !validPhone ? 'default' : 'pointer',
                  fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap',
                }}>
                  {countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
                </button>
              </div>
            </div>
            {/* 演示模式提示 */}
            {codeRequested && !isConfigured && (
              <div style={{
                padding: '9px 13px', borderRadius: 8,
                background: `${theme.accent.primary}18`,
                border: `1px solid ${theme.accent.primary}40`,
              }}>
                <Text size="small" style={{ color: theme.accent.primary }}>
                  演示模式：输入任意 6 位数字即可登录
                </Text>
              </div>
            )}
            {/* 真实模式：已发送提示 */}
            {codeRequested && isConfigured && (
              <div style={{
                padding: '9px 13px', borderRadius: 8,
                background: '#22c55e18', border: `1px solid #22c55e40`,
              }}>
                <Text size="small" style={{ color: '#22c55e' }}>
                  验证码已发送至 {phone.slice(0, 3)}****{phone.slice(7)}
                </Text>
              </div>
            )}
            {/* 错误提示 */}
            {error && (
              <div style={{
                padding: '9px 13px', borderRadius: 8,
                background: '#ef444418', border: `1px solid #ef444440`,
              }}>
                <Text size="small" style={{ color: '#ef4444' }}>{error}</Text>
              </div>
            )}
            <button onClick={phoneLogin} disabled={loading || code.length < 6} style={{
              width: '100%', padding: '14px', borderRadius: 30, border: 'none',
              background: code.length >= 6 && !loading ? theme.accent.primary : theme.fill.secondary,
              color: code.length >= 6 && !loading ? theme.text.onAccent : theme.text.tertiary,
              cursor: code.length >= 6 && !loading ? 'pointer' : 'default',
              fontSize: 15, fontWeight: 700, marginTop: 4,
              boxShadow: code.length >= 6 && !loading ? `0 4px 12px ${theme.accent.primary}40` : 'none',
            }}>
              {loading ? '登录中…' : '登录 / 绑定手机号'}
            </button>
          </Stack>
        )}
      </div>

      {/* Terms */}
      <div style={{ padding: '24px 24px 0', textAlign: 'center' }}>
        <Text size="small" tone="secondary" style={{ fontSize: 10, lineHeight: '1.6' }}>
          登录即表示同意《供享村社服务协议》与《隐私政策》
        </Text>
      </div>
    </div>
  );
}

// ── Home Screen ──────────────────────────────────────────────────────────────

function HomeScreen({ theme, setTab, onEntry, notices, signedIn, signInStreak, onSignIn }: {
  theme: Theme;
  setTab: (t: Tab) => void;
  onEntry: (route: EntryRoute) => void;
  notices: string[];
  signedIn: boolean;
  signInStreak: number;
  onSignIn: () => void;
}) {
  const [noticeIdx, setNoticeIdx] = useState(0);

  return (
    <Stack gap={0}>
      <div style={{
        background: theme.fill.secondary, padding: '20px 16px 16px',
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
      }}>
        <Row gap={12} align="center">
          <div style={{
            width: 48, height: 48, borderRadius: 12, background: theme.accent.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme.text.onAccent, fontWeight: 700, fontSize: 18,
          }}>{VILLAGE.logo}</div>
          <Stack gap={2}>
            <Text style={{ fontWeight: 700, fontSize: 16, color: theme.text.primary }}>
              {VILLAGE.name} · 欢迎回家
            </Text>
            <Text size="small" tone="secondary">{VILLAGE.township} · {VILLAGE.members} 位村民 · {VILLAGE.stores} 家小店</Text>
          </Stack>
        </Row>
      </div>

      <div onClick={() => setNoticeIdx(i => (i + 1) % notices.length)} style={{
        padding: '8px 16px', background: theme.fill.tertiary,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ fontSize: 10, color: theme.accent.primary, fontWeight: 700, flexShrink: 0 }}>公告</span>
        <Text size="small" tone="secondary" style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {notices[noticeIdx]}
        </Text>
        <span style={{ fontSize: 10, color: theme.text.tertiary }}>›</span>
      </div>

      {/* 核心理念 */}
      <div style={{ padding: '10px 16px 0' }}>
        <div style={{
          padding: '12px 14px', borderRadius: 12,
          background: 'linear-gradient(135deg, #c0392b, #e2603f)',
          color: '#fff',
        }}>
          <Row gap={8} align="center" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: '#ffffff2e', borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap' }}>★ {CORE_IDEA.badge}</span>
            <Text style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{CORE_IDEA.slogan}</Text>
          </Row>
          <Text style={{ fontSize: 11, color: '#ffffffdd', lineHeight: 1.55 }}>{CORE_IDEA.desc}</Text>
        </div>
      </div>

      {/* Sign-in card */}
      <div style={{ padding: '10px 16px 0' }}>
        <div style={{
          padding: '12px 14px', borderRadius: 12,
          background: signedIn
            ? `${theme.accent.primary}15`
            : `linear-gradient(135deg, ${theme.accent.primary}22, ${theme.accent.primary}08)`,
          border: `1px solid ${theme.accent.primary}30`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Stack gap={4} style={{ flex: 1 }}>
            <Row gap={6} align="center">
              <Text size="small" style={{ fontWeight: 700, color: theme.text.primary }}>
                {signedIn ? `已签到 · 连续 ${signInStreak} 天` : '每日签到 · 得贡献值'}
              </Text>
              {signedIn && <Pill tone="success" size="sm">+5 已到账</Pill>}
            </Row>
            {/* 7-day dots */}
            <Row gap={5} align="center">
              {Array.from({ length: 7 }, (_, i) => {
                const isPast = i < signInStreak - (signedIn ? 0 : 1);
                const isToday = signedIn ? i === signInStreak - 1 : i === signInStreak - 1;
                const isTodayActive = signedIn && i === signInStreak - 1;
                return (
                  <div key={i} style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: isTodayActive
                      ? theme.accent.primary
                      : isPast
                        ? `${theme.accent.primary}50`
                        : theme.fill.secondary,
                    border: `1.5px solid ${isTodayActive ? theme.accent.primary : isPast ? `${theme.accent.primary}40` : theme.stroke.tertiary}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10,
                  }}>
                    {isTodayActive
                      ? <span style={{ color: '#fff', fontSize: 11 }}>✓</span>
                      : isPast
                        ? <span style={{ color: theme.accent.primary, fontSize: 11 }}>✓</span>
                        : <span style={{ color: theme.text.tertiary, fontSize: 9 }}>{i + 1}</span>
                    }
                  </div>
                );
              })}
              <Text size="small" tone="secondary" style={{ fontSize: 10, marginLeft: 2 }}>天</Text>
            </Row>
          </Stack>
          {!signedIn && (
            <button onClick={onSignIn} style={{
              padding: '8px 16px', borderRadius: 20, border: 'none',
              background: theme.accent.primary, color: theme.text.onAccent,
              cursor: 'pointer', fontSize: 12, fontWeight: 600, flexShrink: 0,
              boxShadow: `0 2px 8px ${theme.accent.primary}40`,
            }}>签到</button>
          )}
        </div>
      </div>

      {/* 贡献体系入口 */}
      <div style={{ padding: '12px 16px 0' }}>
        <button onClick={() => onEntry({ kind: 'contribution' })} style={{
          width: '100%', textAlign: 'left', cursor: 'pointer', border: 'none', borderRadius: 14,
          padding: '14px 16px', color: '#fff',
          background: `linear-gradient(135deg, ${theme.accent.primary}, ${theme.accent.control})`,
          display: 'flex', alignItems: 'center', gap: 12,
          boxShadow: `0 4px 14px ${theme.accent.primary}40`,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12, background: '#ffffff28', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>◈</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>贡献体系 · 全周期社会贡献</div>
            <div style={{ fontSize: 11, opacity: 0.9, marginTop: 3 }}>成长·立业·治理·乡风·银龄 五维贡献 → 链上凭证 → 共享分配</div>
          </div>
          <span style={{ fontSize: 18, opacity: 0.9, flexShrink: 0 }}>›</span>
        </button>
      </div>

      {/* 六大板块服务入口 */}
      {SERVICE_SECTIONS.map(sec => (
        <div key={sec.key} style={{ padding: '16px 16px 0' }}>
          <Row gap={8} align="center" style={{ marginBottom: 12 }}>
            <div style={{
              width: 24, height: 24, borderRadius: 7, background: `${sec.accent}1f`, color: sec.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0,
            }}>{sec.icon}</div>
            <Text style={{ fontWeight: 700, fontSize: 14, color: theme.text.primary }}>{sec.title}</Text>
            <span style={{
              fontSize: 10, color: sec.accent, background: `${sec.accent}14`,
              borderRadius: 99, padding: '1px 8px', whiteSpace: 'nowrap',
            }}>{sec.tagline}</span>
          </Row>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {sec.entries.map(item => (
              <button key={item.label} onClick={() => onEntry(item.route)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 4,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, background: `${sec.accent}14`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: sec.accent,
                }}>{item.icon}</div>
                <Text size="small" style={{ fontSize: 10, color: theme.text.secondary }}>{item.label}</Text>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div style={{ height: 8 }} />
      <Divider />

      <div style={{ padding: '12px 16px 0' }}>
        <Row gap={8} align="center" style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: 600, fontSize: 14, color: theme.text.primary }}>本村精选</Text>
          <button onClick={() => setTab('小店')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <Text size="small" style={{ color: theme.accent.primary }}>查看全部 ›</Text>
          </button>
        </Row>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {PRODUCTS.slice(0, 4).map(p => (
            <ProductCard key={p.id} product={p} theme={theme} compact />
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        <Row gap={8} align="center" style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: 600, fontSize: 14, color: theme.text.primary }}>热门团购</Text>
          <button onClick={() => setTab('团购')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <Text size="small" style={{ color: theme.accent.primary }}>查看全部 ›</Text>
          </button>
        </Row>
        {GROUPS.slice(0, 2).map(g => (
          <GroupCard key={g.id} group={g} theme={theme} compact joined={false} onJoin={() => {}} />
        ))}
      </div>

      <div style={{ height: 20 }} />
    </Stack>
  );
}

// ── Store Screen ─────────────────────────────────────────────────────────────

function StoreScreen({ theme, selected, setSelected, onDetail }: {
  theme: Theme; selected: number | null; setSelected: (id: number | null) => void;
  onDetail: (id: number) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = PRODUCTS.filter(p =>
    p.name.includes(search) || p.store.includes(search) || p.tag.includes(search)
  );

  return (
    <Stack gap={0}>
      <div style={{ padding: '12px 16px', background: theme.bg.elevated, borderBottom: `1px solid ${theme.stroke.tertiary}` }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索商品、小店..."
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 20,
            border: `1px solid ${theme.stroke.secondary}`,
            background: theme.fill.tertiary, color: theme.text.primary,
            fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ padding: '12px 16px 4px' }}>
        <Row gap={8} align="center">
          <Text size="small" style={{ fontWeight: 600, color: theme.text.secondary }}>本村小店</Text>
          <Text size="small" tone="secondary">{filtered.length} 件商品</Text>
        </Row>
      </div>

      <div style={{ padding: '8px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {filtered.map(p => (
          <div key={p.id} onClick={() => {
            setSelected(p.id === selected ? null : p.id);
            onDetail(p.id);
          }}>
            <ProductCard product={p} theme={theme} compact={false} selected={p.id === selected} />
          </div>
        ))}
      </div>
      <div style={{ height: 20 }} />
    </Stack>
  );
}

function ProductCard({ product: p, theme, compact, selected }: {
  product: typeof PRODUCTS[0]; theme: Theme; compact: boolean; selected?: boolean;
}) {
  const labels: Record<number, string> = { 1: '粮', 2: '蛋', 3: '粉', 4: '油', 5: '蜜', 6: '肉' };
  return (
    <div style={{
      borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
      border: `1px solid ${selected ? theme.accent.primary : theme.stroke.secondary}`,
      background: selected ? theme.fill.tertiary : theme.bg.elevated,
    }}>
      <div style={{
        height: compact ? 70 : 100,
        background: theme.fill.secondary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: compact ? 22 : 28, fontWeight: 700, color: theme.text.tertiary,
      }}>{labels[p.id] ?? '品'}</div>
      <div style={{ padding: compact ? '6px 8px' : '10px 12px' }}>
        <Text size="small" style={{ fontWeight: 600, color: theme.text.primary, display: 'block' }}>{p.name}</Text>
        {!compact && <Text size="small" tone="secondary" style={{ display: 'block', marginTop: 2 }}>{p.store}</Text>}
        <Row gap={4} align="center" style={{ marginTop: 4 }}>
          <Pill tone="info" size="sm">{p.tag}</Pill>
        </Row>
        <Row gap={4} align="center" style={{ marginTop: 6 }}>
          <Text style={{ fontWeight: 700, color: theme.accent.primary, fontSize: compact ? 13 : 15 }}>
            ¥{p.price}
          </Text>
          <Text size="small" tone="secondary">/{p.unit}</Text>
        </Row>
        {!compact && (
          <Text size="small" tone="secondary" style={{ marginTop: 2, display: 'block' }}>已售 {p.sales} {p.unit}</Text>
        )}
      </div>
    </div>
  );
}

// ── Product Detail Screen ────────────────────────────────────────────────────

function ProductDetailScreen({ product: p, theme, onBack, onAddToCart, onBuyNow }: {
  product: typeof PRODUCTS[0]; theme: Theme; onBack: () => void;
  onAddToCart: (productId: number, qty: number) => void;
  onBuyNow: (productId: number, qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const labels: Record<number, string> = { 1: '粮', 2: '蛋', 3: '粉', 4: '油', 5: '蜜', 6: '肉' };

  return (
    <Stack gap={0}>
      <div style={{
        padding: '12px 16px', background: theme.bg.elevated,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: theme.accent.primary, fontSize: 20, lineHeight: 1, padding: 0,
        }}>‹</button>
        <Text style={{ fontWeight: 700, fontSize: 15, color: theme.text.primary }}>商品详情</Text>
      </div>

      <div style={{
        height: 200, background: theme.fill.secondary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 72, color: theme.text.tertiary,
      }}>{labels[p.id] ?? '品'}</div>

      <div style={{ padding: '16px' }}>
        <Row gap={8} align="center" style={{ marginBottom: 4 }}>
          <Text style={{ fontWeight: 700, fontSize: 18, color: theme.text.primary, flex: 1 }}>{p.name}</Text>
          <Pill tone="info" size="sm">{p.tag}</Pill>
        </Row>
        <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 12 }}>
          {p.store} · {p.origin}
        </Text>

        <Row gap={6} align="center" style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: 700, color: theme.accent.primary }}>¥{p.price}</Text>
          <Text size="small" tone="secondary">/{p.unit}</Text>
          <Text size="small" tone="secondary" style={{ marginLeft: 8 }}>已售 {p.sales}{p.unit}</Text>
        </Row>

        <div style={{
          padding: '12px', borderRadius: 8, background: theme.fill.tertiary, marginBottom: 16,
        }}>
          <Text size="small" tone="secondary" style={{ lineHeight: '1.7' }}>{p.desc}</Text>
        </div>

        <div style={{ marginBottom: 16 }}>
          {([
            ['规格', p.weight],
            ['库存', `${p.stock} ${p.unit}`],
            ['配送', '快递 / 村委会自提'],
            ['贡献值', '购买可得 10 贡献值'],
          ] as [string, string][]).map(([k, v]) => (
            <Row key={k} gap={8} align="center" style={{
              padding: '8px 0', borderBottom: `1px solid ${theme.stroke.tertiary}`,
            }}>
              <Text size="small" tone="secondary" style={{ width: 60, flexShrink: 0 }}>{k}</Text>
              <Text size="small" style={{ color: theme.text.primary }}>{v}</Text>
            </Row>
          ))}
        </div>

        <Row gap={12} align="center" style={{ marginBottom: 16 }}>
          <Text size="small" tone="secondary">数量</Text>
          <Row gap={0} align="center">
            <button onClick={() => setQty(q => Math.max(1, q - 1))} style={{
              width: 32, height: 32, border: `1px solid ${theme.stroke.secondary}`,
              background: theme.bg.elevated, borderRadius: '6px 0 0 6px',
              cursor: 'pointer', fontSize: 16, color: theme.text.primary,
            }}>−</button>
            <div style={{
              width: 40, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: `1px solid ${theme.stroke.secondary}`, borderLeft: 'none', borderRight: 'none',
              background: theme.bg.elevated,
            }}>
              <Text size="small" style={{ fontWeight: 600 }}>{qty}</Text>
            </div>
            <button onClick={() => setQty(q => q + 1)} style={{
              width: 32, height: 32, border: `1px solid ${theme.stroke.secondary}`,
              background: theme.bg.elevated, borderRadius: '0 6px 6px 0',
              cursor: 'pointer', fontSize: 16, color: theme.text.primary,
            }}>+</button>
          </Row>
          <Text size="small" style={{ color: theme.accent.primary, fontWeight: 700 }}>
            小计 ¥{(p.price * qty).toFixed(2)}
          </Text>
        </Row>

        <Row gap={10} align="center">
          <button onClick={() => onAddToCart(p.id, qty)} style={{
            flex: 1, padding: '12px', borderRadius: 24,
            border: `1px solid ${theme.accent.primary}`,
            background: 'none', color: theme.accent.primary,
            cursor: 'pointer', fontWeight: 600, fontSize: 14,
          }}>加入购物车</button>
          <button onClick={() => onBuyNow(p.id, qty)} style={{
            flex: 1, padding: '12px', borderRadius: 24, border: 'none',
            background: theme.accent.primary, color: theme.text.onAccent,
            cursor: 'pointer', fontWeight: 600, fontSize: 14,
          }}>立即购买</button>
        </Row>
      </div>
    </Stack>
  );
}

// ── Group Buy Screen ─────────────────────────────────────────────────────────

function GroupScreen({ theme, joined, groupCounts, onJoin }: {
  theme: Theme; joined: Set<number>;
  groupCounts: Record<number, number>; onJoin: (id: number) => void;
}) {
  return (
    <Stack gap={0}>
      <div style={{
        padding: '12px 16px', background: theme.fill.secondary,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
      }}>
        <Text style={{ fontWeight: 700, fontSize: 15, color: theme.text.primary }}>惠民团购</Text>
        <Text size="small" tone="secondary">达到成团人数自动下单，未成团全额退款</Text>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {GROUPS.map(g => (
          <GroupCard key={g.id} group={g} theme={theme} compact={false}
            joined={joined.has(g.id)} extra={groupCounts[g.id] ?? 0}
            onJoin={() => onJoin(g.id)} />
        ))}
      </div>
      <div style={{ height: 20 }} />
    </Stack>
  );
}

function GroupCard({ group: g, theme, compact, joined, extra = 0, onJoin }: {
  group: typeof GROUPS[0]; theme: Theme; compact: boolean;
  joined: boolean; extra?: number; onJoin: () => void;
}) {
  const total = g.current + extra;
  const pct = Math.min(total / g.min, 1);
  const done = g.deadline === '已成团' || total >= g.min;

  return (
    <div style={{
      borderRadius: 10, border: `1px solid ${theme.stroke.secondary}`,
      background: theme.bg.elevated, marginBottom: 12, overflow: 'hidden',
    }}>
      <div style={{ padding: compact ? '10px 12px' : '14px 14px 10px' }}>
        <Row gap={10} align="center">
          <div style={{
            width: compact ? 36 : 50, height: compact ? 36 : 50, borderRadius: 8, flexShrink: 0,
            background: theme.fill.secondary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: compact ? 18 : 24, color: theme.text.primary,
          }}>{g.img}</div>
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>{g.name}</Text>
            <Text size="small" tone="secondary">来自：{g.from}</Text>
            <Row gap={6} align="center">
              <Text style={{ color: theme.accent.primary, fontWeight: 700, fontSize: compact ? 13 : 15 }}>
                ¥{g.price}
              </Text>
              <Text size="small" tone="secondary">/{g.unit}</Text>
              {done && <Pill tone="success" size="sm">已成团</Pill>}
              {!done && <Pill tone="warning" size="sm">剩余 {g.deadline}</Pill>}
            </Row>
          </Stack>
          {!compact && (
            <button onClick={onJoin} disabled={done || joined} style={{
              padding: '6px 14px', borderRadius: 20, border: 'none',
              cursor: done || joined ? 'default' : 'pointer',
              background: done || joined ? theme.fill.secondary : theme.accent.primary,
              color: done || joined ? theme.text.tertiary : theme.text.onAccent,
              fontSize: 12, fontWeight: 600, flexShrink: 0,
            }}>
              {done ? '已成团' : joined ? '已参团' : '参与'}
            </button>
          )}
        </Row>

        {!compact && (
          <div style={{ marginTop: 10 }}>
            <Row gap={8} align="center" style={{ marginBottom: 4 }}>
              <Text size="small" tone="secondary">成团进度</Text>
              <Text size="small" style={{ color: done ? theme.accent.primary : theme.text.secondary, fontWeight: 600 }}>
                {total}/{g.min} 份
              </Text>
            </Row>
            <div style={{ height: 6, borderRadius: 3, background: theme.fill.secondary, overflow: 'hidden' }}>
              <div style={{
                width: `${pct * 100}%`, height: '100%', borderRadius: 3,
                background: done ? theme.accent.primary : theme.fill.primary,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Party Screen ─────────────────────────────────────────────────────────────

function PartyScreen({ theme, partyEvents }: { theme: Theme; partyEvents: PartyEvent[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [mapView, setMapView] = useState(false);

  return (
    <Stack gap={0}>
      <div style={{
        padding: '16px', background: theme.fill.secondary,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
      }}>
        <Row gap={10} align="center">
          <div style={{
            width: 40, height: 40, borderRadius: 8, background: theme.fill.tertiary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: theme.text.secondary,
          }}>党</div>
          <Stack gap={2} style={{ flex: 1 }}>
            <Text style={{ fontWeight: 700, fontSize: 15, color: theme.text.primary }}>党建助农</Text>
            <Text size="small" tone="secondary">范庄村党支部 · 党员 31 人</Text>
          </Stack>
          <button onClick={() => setMapView(v => !v)} style={{
            padding: '4px 12px', borderRadius: 16, border: `1px solid ${theme.stroke.secondary}`,
            background: mapView ? theme.accent.primary : theme.bg.elevated,
            color: mapView ? theme.text.onAccent : theme.text.secondary,
            cursor: 'pointer', fontSize: 11,
          }}>{mapView ? '活动' : '联谊点地图'}</button>
        </Row>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {mapView ? (
          <PartyVillageMap theme={theme} />
        ) : (
          <>
            <Grid columns={3} gap={10} style={{ marginBottom: 16 }}>
              {[
                { label: '党员人数', value: '31' },
                { label: '本月活动', value: '8' },
                { label: '志愿时长', value: '142h' },
              ].map(s => (
                <div key={s.label} style={{
                  textAlign: 'center', padding: '12px 8px',
                  background: theme.fill.tertiary, borderRadius: 10,
                }}>
                  <Text style={{ fontSize: 20, fontWeight: 700, color: theme.text.primary, display: 'block' }}>{s.value}</Text>
                  <Text size="small" tone="secondary">{s.label}</Text>
                </div>
              ))}
            </Grid>

            <Text style={{ fontWeight: 600, fontSize: 14, color: theme.text.primary, display: 'block', marginBottom: 10 }}>
              党建活动
            </Text>

            {partyEvents.map((ev, i) => (
              <div key={i} onClick={() => setExpanded(expanded === i ? null : i)} style={{
                border: `1px solid ${theme.stroke.secondary}`, borderRadius: 10,
                marginBottom: 10, overflow: 'hidden', cursor: 'pointer',
                background: theme.bg.elevated,
              }}>
                <div style={{ padding: '12px 14px' }}>
                  <Row gap={10} align="center">
                    <Stack gap={2} style={{ flex: 1 }}>
                      <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>{ev.title}</Text>
                      <Row gap={8} align="center">
                        <Text size="small" tone="secondary">{ev.date}</Text>
                        <Text size="small" tone="secondary">· {ev.members} 人参与</Text>
                      </Row>
                    </Stack>
                    <Pill tone={ev.status === '已完成' ? 'success' : 'warning'} size="sm">{ev.status}</Pill>
                  </Row>
                </div>
                {expanded === i && (
                  <div style={{ padding: '0 14px 12px', borderTop: `1px solid ${theme.stroke.tertiary}` }}>
                    <Text size="small" tone="secondary" style={{ marginTop: 10, display: 'block' }}>
                      {ev.status === '报名中'
                        ? '活动正在报名中，点击报名后可获得20贡献值。'
                        : `本次活动已圆满完成，共${ev.members}名党员及群众参与，活动记录已上传至党建档案。`}
                    </Text>
                    {ev.status === '报名中' && (
                      <div style={{ marginTop: 10 }}>
                        <button style={{
                          padding: '6px 20px', borderRadius: 20,
                          background: theme.accent.primary, color: theme.text.onAccent,
                          border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        }}>立即报名 · 得20贡献值</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div style={{ marginTop: 8 }}>
              <Text style={{ fontWeight: 600, fontSize: 14, color: theme.text.primary, display: 'block', marginBottom: 10 }}>
                党员学习园地
              </Text>
              {[
                { title: '11月学习主题：习近平总书记关于乡村振兴重要论述', duration: '预计30分钟', done: true },
                { title: '党史故事：从延安精神看新时代基层党建', duration: '预计20分钟', done: false },
              ].map((item, i) => (
                <div key={i} style={{
                  padding: '12px 14px', borderRadius: 10, marginBottom: 8,
                  border: `1px solid ${theme.stroke.secondary}`,
                  background: item.done ? theme.fill.tertiary : theme.bg.elevated,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <Stack gap={2} style={{ flex: 1, marginRight: 12 }}>
                    <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>{item.title}</Text>
                    <Text size="small" tone="secondary">{item.duration}</Text>
                  </Stack>
                  <Pill tone={item.done ? 'success' : 'neutral'} size="sm">{item.done ? '已学习' : '去学习'}</Pill>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
      <div style={{ height: 20 }} />
    </Stack>
  );
}

function PartyVillageMap({ theme }: { theme: Theme }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const COLS = 5;
  const ROWS = 3;
  const CELL = 58;

  return (
    <Stack gap={12}>
      <Text size="small" tone="secondary">
        方城乡党建助农联谊点分布 · 红色图标为已建立联谊点
      </Text>

      <div style={{
        position: 'relative',
        width: COLS * CELL + (COLS - 1) * 8,
        height: ROWS * CELL + (ROWS - 1) * 8,
        background: theme.fill.tertiary,
        borderRadius: 12, padding: 8,
        margin: '0 auto',
      }}>
        {PARTY_VILLAGES.map(v => {
          const x = v.col * (CELL + 8);
          const y = v.row * (CELL + 8);
          const isHovered = hovered === v.name;
          return (
            <div
              key={v.name}
              onMouseEnter={() => setHovered(v.name)}
              onMouseLeave={() => setHovered(null)}
              style={{
                position: 'absolute', left: x, top: y,
                width: CELL, height: CELL,
                borderRadius: 10,
                background: v.current
                  ? theme.accent.primary
                  : v.active
                    ? '#ef444422'
                    : theme.fill.secondary,
                border: `2px solid ${v.current ? theme.accent.primary : v.active ? '#ef4444' : theme.stroke.secondary}`,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 2,
                cursor: 'pointer',
                transition: 'transform 0.15s',
                transform: isHovered ? 'scale(1.08)' : 'scale(1)',
              }}
            >
              <span style={{ fontSize: 16 }}>{v.active ? '★' : '○'}</span>
              <Text size="small" style={{
                fontSize: 9, fontWeight: 600,
                color: v.current ? theme.text.onAccent : v.active ? '#ef4444' : theme.text.tertiary,
                textAlign: 'center', lineHeight: 1.2,
              }}>{v.name}</Text>
              {v.active && (
                <Text size="small" style={{
                  fontSize: 8,
                  color: v.current ? theme.text.onAccent : '#ef4444',
                }}>{v.members}人</Text>
              )}
            </div>
          );
        })}
      </div>

      <Row gap={16} align="center" style={{ justifyContent: 'center' }}>
        {[
          { color: theme.accent.primary, label: '本村（范庄）' },
          { color: '#ef4444', label: '已建联谊点' },
          { color: theme.stroke.secondary, label: '待建' },
        ].map(item => (
          <Row key={item.label} gap={6} align="center">
            <div style={{ width: 10, height: 10, borderRadius: 3, background: item.color }} />
            <Text size="small" tone="secondary" style={{ fontSize: 10 }}>{item.label}</Text>
          </Row>
        ))}
      </Row>

      <div style={{ marginTop: 4 }}>
        <Text size="small" style={{ fontWeight: 600, color: theme.text.primary, display: 'block', marginBottom: 8 }}>
          联谊点统计
        </Text>
        <Grid columns={2} gap={8}>
          {PARTY_VILLAGES.filter(v => v.active).map(v => (
            <Row key={v.name} gap={8} align="center" style={{
              padding: '8px 10px', borderRadius: 8,
              background: theme.fill.tertiary,
              border: `1px solid ${v.current ? theme.accent.primary : theme.stroke.tertiary}`,
            }}>
              <span style={{ fontSize: 12 }}>★</span>
              <Stack gap={1} style={{ flex: 1 }}>
                <Text size="small" style={{ fontWeight: 600, color: v.current ? theme.accent.primary : theme.text.primary }}>
                  {v.name}{v.current ? ' (本村)' : ''}
                </Text>
                <Text size="small" tone="secondary" style={{ fontSize: 10 }}>党员 {v.members} 人</Text>
              </Stack>
            </Row>
          ))}
        </Grid>
      </div>
    </Stack>
  );
}

// ── Job Screen ───────────────────────────────────────────────────────────────

function JobScreen({ theme, onBack, jobs }: { theme: Theme; onBack: () => void; jobs: Job[] }) {
  return (
    <Stack gap={0}>
      <div style={{
        padding: '12px 16px', background: theme.bg.elevated,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: theme.accent.primary, fontSize: 20, lineHeight: 1, padding: 0,
        }}>‹</button>
        <Text style={{ fontWeight: 700, fontSize: 15, color: theme.text.primary }}>就业招工</Text>
      </div>

      <div style={{ padding: '12px 16px 4px' }}>
        <Text size="small" tone="secondary">方城乡 · 当前在招 {jobs.length} 个岗位</Text>
      </div>

      <div style={{ padding: '8px 16px' }}>
        {jobs.map(job => (
          <div key={job.id} style={{
            borderRadius: 10, border: `1px solid ${theme.stroke.secondary}`,
            background: theme.bg.elevated, marginBottom: 10, padding: '14px',
          }}>
            <Row gap={8} align="center">
              <Stack gap={4} style={{ flex: 1 }}>
                <Row gap={8} align="center">
                  <Text style={{ fontWeight: 700, fontSize: 14, color: theme.text.primary }}>{job.title}</Text>
                  <Pill
                    tone={job.type === '全职' ? 'success' : job.type === '兼职' ? 'info' : 'warning'}
                    size="sm"
                  >{job.type}</Pill>
                </Row>
                <Text size="small" tone="secondary">{job.company} · {job.location}</Text>
                <Row gap={12} align="center">
                  <Text style={{ color: theme.accent.primary, fontWeight: 700, fontSize: 15 }}>{job.salary}</Text>
                  <Text size="small" tone="secondary">招 {job.count} 人</Text>
                  <Text size="small" tone="secondary">截止 {job.deadline}</Text>
                </Row>
              </Stack>
              <button style={{
                padding: '6px 14px', borderRadius: 20, border: 'none',
                background: theme.accent.primary, color: theme.text.onAccent,
                fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
              }}>联系</button>
            </Row>
          </div>
        ))}
      </div>
      <div style={{ height: 20 }} />
    </Stack>
  );
}

// ── Heritage Screen ──────────────────────────────────────────────────────────

function HeritageScreen({ theme, onBack }: { theme: Theme; onBack: () => void }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <Stack gap={0}>
      <div style={{
        padding: '12px 16px', background: theme.bg.elevated,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: theme.accent.primary, fontSize: 20, lineHeight: 1, padding: 0,
        }}>‹</button>
        <Text style={{ fontWeight: 700, fontSize: 15, color: theme.text.primary }}>非遗文化</Text>
      </div>

      <div style={{ padding: '12px 16px 4px' }}>
        <Text size="small" tone="secondary">方城乡非物质文化遗产保护项目</Text>
      </div>

      <div style={{ padding: '8px 16px' }}>
        {HERITAGE.map(item => (
          <div key={item.id} onClick={() => setExpanded(expanded === item.id ? null : item.id)} style={{
            borderRadius: 10, border: `1px solid ${theme.stroke.secondary}`,
            background: theme.bg.elevated, marginBottom: 10, overflow: 'hidden', cursor: 'pointer',
          }}>
            <div style={{ padding: '14px' }}>
              <Row gap={12} align="center">
                <div style={{
                  width: 48, height: 48, borderRadius: 10, flexShrink: 0,
                  background: theme.fill.secondary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: theme.text.secondary,
                }}>{item.icon}</div>
                <Stack gap={4} style={{ flex: 1 }}>
                  <Row gap={8} align="center">
                    <Text style={{ fontWeight: 700, fontSize: 14, color: theme.text.primary }}>{item.name}</Text>
                    <Pill tone="warning" size="sm">{item.level}非遗</Pill>
                  </Row>
                  <Text size="small" tone="secondary">{item.category}</Text>
                </Stack>
                <Text style={{ color: theme.text.tertiary, fontSize: 12 }}>{expanded === item.id ? '▲' : '▼'}</Text>
              </Row>
            </div>
            {expanded === item.id && (
              <div style={{ padding: '0 14px 14px', borderTop: `1px solid ${theme.stroke.tertiary}` }}>
                <Text size="small" tone="secondary" style={{ display: 'block', marginTop: 10, lineHeight: '1.7' }}>
                  {item.desc}
                </Text>
                <button style={{
                  marginTop: 10, padding: '6px 16px', borderRadius: 20,
                  background: theme.fill.secondary, border: 'none',
                  color: theme.text.secondary, fontSize: 12, cursor: 'pointer',
                }}>了解更多 ›</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ height: 20 }} />
    </Stack>
  );
}

// ── Village Affairs Screen ────────────────────────────────────────────────────

function VillageAffairsScreen({ theme, onBack, affairs }: { theme: Theme; onBack: () => void; affairs: VillageAffair[] }) {
  return (
    <Stack gap={0}>
      <div style={{
        padding: '12px 16px', background: theme.bg.elevated,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: theme.accent.primary, fontSize: 20, lineHeight: 1, padding: 0,
        }}>‹</button>
        <Text style={{ fontWeight: 700, fontSize: 15, color: theme.text.primary }}>村务公开</Text>
      </div>

      <div style={{ padding: '12px 16px 0' }}>
        <Grid columns={3} gap={10} style={{ marginBottom: 16 }}>
          {[
            { label: '本年公示', value: '18 项' },
            { label: '资金公开', value: '¥26.3万' },
            { label: '满意度', value: '97%' },
          ].map(s => (
            <div key={s.label} style={{
              textAlign: 'center', padding: '12px 8px',
              background: theme.fill.tertiary, borderRadius: 10,
            }}>
              <Text style={{ fontSize: 16, fontWeight: 700, color: theme.text.primary, display: 'block' }}>{s.value}</Text>
              <Text size="small" tone="secondary">{s.label}</Text>
            </div>
          ))}
        </Grid>

        {affairs.map((item, i) => (
          <div key={i} style={{
            padding: '12px 14px', borderRadius: 10, marginBottom: 8,
            border: `1px solid ${theme.stroke.secondary}`,
            background: theme.bg.elevated,
          }}>
            <Row gap={8} align="center">
              <Stack gap={4} style={{ flex: 1 }}>
                <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>{item.title}</Text>
                <Row gap={8} align="center">
                  <Text size="small" tone="secondary">{item.date}</Text>
                  <Pill tone="neutral" size="sm">{item.category}</Pill>
                  {item.amount !== '—' && (
                    <Text size="small" style={{ color: theme.accent.primary }}>{item.amount}</Text>
                  )}
                </Row>
              </Stack>
              <Pill tone="success" size="sm">{item.tag}</Pill>
            </Row>
          </div>
        ))}
      </div>
      <div style={{ height: 20 }} />
    </Stack>
  );
}

// ── Profile Screen ───────────────────────────────────────────────────────────

function ProfileScreen({ theme, joined, pendingProducts, onSubmitProduct, onLogout, onViewOrders, onViewContribution, onElderMode, orders }: {
  theme: Theme; joined: Set<number>;
  pendingProducts: PendingProduct[]; onSubmitProduct: (p: PendingProduct) => void;
  onLogout: () => void;
  onViewOrders: () => void;
  onViewContribution: () => void;
  onElderMode: () => void;
  orders: Order[];
}) {
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const [myStore, setMyStore] = useState(false);
  const [inviteCenter, setInviteCenter] = useState(false);

  if (myStore) return <MyStoreScreen theme={theme} products={pendingProducts} onSubmit={onSubmitProduct} onBack={() => setMyStore(false)} />;
  if (inviteCenter) return <InviteScreen theme={theme} onBack={() => setInviteCenter(false)} />;
  const contribution = CONTRIB_TOTAL;
  const certificates = Math.floor(contribution / 1000);

  return (
    <Stack gap={0}>
      <div style={{
        padding: '20px 16px 16px', background: theme.fill.secondary,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
      }}>
        <Row gap={12} align="center">
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: theme.accent.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme.text.onAccent, fontWeight: 700, fontSize: 20,
          }}>范</div>
          <Stack gap={4}>
            <Text style={{ fontWeight: 700, fontSize: 16, color: theme.text.primary }}>范村民 · 创业者</Text>
            <Row gap={6} align="center">
              <Pill tone="info" size="sm">Lv.3 推广达人</Pill>
              <Pill tone="success" size="sm">已参团 {joined.size}</Pill>
            </Row>
          </Stack>
        </Row>
      </div>

      <div style={{ padding: '16px' }}>
        <Text style={{ fontWeight: 600, fontSize: 14, color: theme.text.primary, display: 'block', marginBottom: 10 }}>
          我的账户
        </Text>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: '现金账户', value: '¥ 128.50', sub: '可提现', key: 'cash', tone: theme.accent.primary },
            { label: '积分账户', value: '2,360 分', sub: '可兑换', key: 'points', tone: theme.text.secondary },
            { label: '贡献值', value: `${contribution}`, sub: `持有 ${certificates} 张凭证`, key: 'contrib', tone: theme.accent.primary },
          ].map(w => (
            <button key={w.key} onClick={() => setShowDetail(showDetail === w.key ? null : w.key)} style={{
              padding: '14px 10px', borderRadius: 10, cursor: 'pointer',
              border: `1px solid ${showDetail === w.key ? theme.accent.primary : theme.stroke.secondary}`,
              background: showDetail === w.key ? theme.fill.tertiary : theme.bg.elevated,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: w.tone }}>{w.value}</div>
              <div style={{ fontSize: 11, color: theme.text.secondary, marginTop: 4 }}>{w.label}</div>
              <div style={{ fontSize: 10, color: theme.text.tertiary, marginTop: 2 }}>{w.sub}</div>
            </button>
          ))}
        </div>

        {showDetail === 'cash' && (
          <div style={{ marginBottom: 14, padding: 14, borderRadius: 10, border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated }}>
            <Text size="small" style={{ fontWeight: 600, display: 'block', marginBottom: 8, color: theme.text.primary }}>现金账户明细</Text>
            {[
              { desc: 'CPS返佣 · 花生油', amount: '+12.00', date: '11/20' },
              { desc: '邀请奖励 · 李四', amount: '+8.50', date: '11/18' },
              { desc: '活动返利', amount: '+5.00', date: '11/15' },
              { desc: '提现至银行卡', amount: '-60.00', date: '11/10' },
            ].map((r, i) => (
              <Row key={i} gap={8} align="center" style={{ paddingBottom: 6 }}>
                <Text size="small" tone="secondary" style={{ flex: 1 }}>{r.desc}</Text>
                <Text size="small" tone="secondary">{r.date}</Text>
                <Text size="small" style={{
                  fontWeight: 600,
                  color: r.amount.startsWith('+') ? theme.accent.primary : theme.text.secondary,
                  width: 60, textAlign: 'right',
                }}>{r.amount}</Text>
              </Row>
            ))}
            <Divider />
            <button style={{
              width: '100%', marginTop: 10, padding: '8px', borderRadius: 8,
              background: theme.accent.primary, color: theme.text.onAccent,
              border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            }}>申请提现</button>
          </div>
        )}

        {showDetail === 'contrib' && (
          <div style={{ marginBottom: 14, padding: 14, borderRadius: 10, border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated }}>
            <Text size="small" style={{ fontWeight: 600, display: 'block', marginBottom: 8, color: theme.text.primary }}>贡献值明细</Text>
            <Row gap={8} align="center" style={{ marginBottom: 4 }}>
              <Text size="small" tone="secondary">本月累计</Text>
              <Text size="small" style={{ fontWeight: 700, color: theme.accent.primary }}>{contribution} 贡献值</Text>
            </Row>
            <div style={{ height: 6, borderRadius: 3, background: theme.fill.secondary }}>
              <div style={{ width: `${(contribution % 1000) / 10}%`, height: '100%', borderRadius: 3, background: theme.accent.primary }} />
            </div>
            <Text size="small" tone="secondary" style={{ marginTop: 4, display: 'block' }}>
              距离下一次上链还需 {1000 - (contribution % 1000)} 贡献值 · 已持有 {certificates} 张凭证
            </Text>
            <Divider />
            <Text size="small" style={{ fontWeight: 600, display: 'block', margin: '8px 0 6px', color: theme.text.primary }}>获取方式</Text>
            {[
              { way: '消费购物', pts: '+10/笔' },
              { way: '每日签到', pts: '+5/天' },
              { way: '分享商品', pts: '+3/次' },
              { way: '志愿服务', pts: '+20/次' },
              { way: '填写问卷', pts: '+10/份' },
            ].map((w, i) => (
              <Row key={i} gap={8} align="center" style={{ paddingBottom: 4 }}>
                <Text size="small" tone="secondary" style={{ flex: 1 }}>{w.way}</Text>
                <Text size="small" style={{ color: theme.accent.primary, fontWeight: 600 }}>{w.pts}</Text>
              </Row>
            ))}
          </div>
        )}

        {showDetail === 'points' && (
          <div style={{ marginBottom: 14, padding: 14, borderRadius: 10, border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated }}>
            <Text size="small" style={{ fontWeight: 600, display: 'block', marginBottom: 8, color: theme.text.primary }}>积分商城</Text>
            {[
              { name: '有机小米 1斤', pts: 500, stock: 20 },
              { name: '土鸡蛋 6枚', pts: 300, stock: 15 },
              { name: '优惠券 ¥5', pts: 100, stock: 50 },
            ].map((item, i) => (
              <Row key={i} gap={8} align="center" style={{ paddingBottom: 8 }}>
                <Text size="small" style={{ flex: 1, color: theme.text.primary }}>{item.name}</Text>
                <Text size="small" tone="secondary">库存 {item.stock}</Text>
                <button style={{
                  padding: '4px 10px', borderRadius: 12, border: 'none',
                  background: theme.fill.secondary, color: theme.text.secondary,
                  cursor: 'pointer', fontSize: 11,
                }}>{item.pts} 分兑换</button>
              </Row>
            ))}
          </div>
        )}

        <div style={{
          padding: '14px', borderRadius: 10, marginBottom: 14,
          border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated,
        }}>
          <Row gap={8} align="center" style={{ marginBottom: 8 }}>
            <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>利益共享金</Text>
            <Pill tone="warning" size="sm">本月 25 日发放</Pill>
          </Row>
          <Row gap={16} align="center">
            {[
              { val: '¥ 34.20', sub: '预计本月可得', color: theme.accent.primary },
              { val: String(certificates), sub: '持有凭证数', color: theme.text.primary },
              { val: '¥ 182.60', sub: '历史累计', color: theme.text.primary },
            ].map((s, i) => (
              <Stack key={i} gap={2}>
                <Text style={{ fontWeight: 700, fontSize: 18, color: s.color }}>{s.val}</Text>
                <Text size="small" tone="secondary">{s.sub}</Text>
              </Stack>
            ))}
          </Row>
          <div style={{ marginTop: 10, padding: 8, borderRadius: 6, background: theme.fill.tertiary }}>
            <Text size="small" tone="secondary" style={{ fontSize: 10 }}>
              声明：利益共享金为平台交易利润的按比例分配，不构成固定收益承诺，不涉及股权或虚拟货币。
            </Text>
          </div>
        </div>

        <Text style={{ fontWeight: 600, fontSize: 14, color: theme.text.primary, display: 'block', marginBottom: 10 }}>
          个人中心
        </Text>
        {([
          { label: '我的贡献', sub: `${contribution} 贡献值 · ${certificates} 张链上凭证`, icon: '◈', accent: theme.accent.primary, onClick: onViewContribution as (() => void) | undefined },
          { label: '我的订单', sub: `共 ${orders.length} 笔 · 配送中 ${orders.filter(o => o.status === '配送中').length} 件`, icon: '▦', onClick: onViewOrders as (() => void) | undefined },
          { label: '我的小店', sub: `管理商品 · 已上架 ${pendingProducts.filter(p => p.status === '已通过').length} 件`, icon: '⊞', onClick: () => setMyStore(true) },
          { label: '邀请中心', sub: '已绑定 5 人 · 累计返佣 ¥40.50', icon: '♛', onClick: () => setInviteCenter(true) },
          { label: '我的信息', sub: '范村民 · 范庄村 12 组 · 138****5678', icon: '◉', onClick: undefined as (() => void) | undefined },
          { label: '消息通知', sub: '3 条未读 · 公告 / 物流 / 分红提醒', icon: '✉', onClick: undefined as (() => void) | undefined },
          { label: '帮助客服', sub: '常见问题 · 在线客服 · 意见反馈', icon: 'ⓘ', onClick: undefined as (() => void) | undefined },
          { label: '银行卡管理', sub: '中国工商银行 尾号 6628', icon: '▭', onClick: undefined as (() => void) | undefined },
        ]).map((item, i) => (
          <div key={i} onClick={item.onClick} style={{
            padding: '12px 14px', borderRadius: 10, marginBottom: 8,
            border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated,
            display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 8, flexShrink: 0,
              background: item.accent ? `${item.accent}1a` : theme.fill.secondary,
              color: item.accent ?? theme.text.secondary,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
            }}>{item.icon}</div>
            <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
              <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>{item.label}</Text>
              <Text size="small" tone="secondary">{item.sub}</Text>
            </Stack>
            <Text tone="secondary">›</Text>
          </div>
        ))}

        {/* 长辈模式 */}
        <div onClick={onElderMode} style={{
          padding: '12px 14px', borderRadius: 10, marginBottom: 8, marginTop: 2,
          border: '1px solid #c0392b35', background: '#c0392b10',
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: '#c0392b1f', color: '#c0392b',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
          }}>⚘</div>
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>长辈模式</Text>
            <Text size="small" tone="secondary">大字图标 · 一键求助 · 关怀适老</Text>
          </Stack>
          <Pill tone="warning" size="sm">立即开启</Pill>
        </div>

        <button onClick={onLogout} style={{
          width: '100%', marginTop: 4, padding: '12px', borderRadius: 10,
          border: `1px solid #ef444440`, background: 'none', color: '#ef4444',
          cursor: 'pointer', fontSize: 14, fontWeight: 500,
        }}>退出登录</button>
      </div>
      <div style={{ height: 20 }} />
    </Stack>
  );
}

// ── My Store Screen ──────────────────────────────────────────────────────────

function MyStoreScreen({ theme, products, onSubmit, onBack }: {
  theme: Theme;
  products: PendingProduct[];
  onSubmit: (p: PendingProduct) => void;
  onBack: () => void;
}) {
  const [form, setForm] = useState({ name: '', price: '', unit: '', desc: '', image: '' });
  const [submitted, setSubmitted] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set('image', ev.target?.result as string ?? '');
    reader.readAsDataURL(file);
  };

  const submit = () => {
    if (!form.name.trim() || !form.price.trim()) return;
    onSubmit({
      id: Date.now(),
      name: form.name,
      price: form.price,
      unit: form.unit || '件',
      store: '我的小店',
      desc: form.desc,
      status: '待审核',
      image: form.image || undefined,
    });
    setForm({ name: '', price: '', unit: '', desc: '', image: '' });
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2500);
  };

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: `1px solid ${theme.stroke.secondary}`,
    background: theme.fill.tertiary, color: theme.text.primary,
    fontSize: 13, outline: 'none', boxSizing: 'border-box' as const,
  };

  return (
    <Stack gap={0}>
      <div style={{
        padding: '12px 16px', background: theme.bg.elevated,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: theme.accent.primary, fontSize: 20, lineHeight: 1, padding: 0,
        }}>‹</button>
        <Text style={{ fontWeight: 700, fontSize: 15, color: theme.text.primary }}>我的小店</Text>
      </div>

      <div style={{ padding: '16px' }}>
        <Text style={{ fontWeight: 600, fontSize: 14, color: theme.text.primary, display: 'block', marginBottom: 12 }}>
          申请上架新商品
        </Text>
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, alignItems: 'flex-start' }}>
          <div style={{ flexShrink: 0 }}>
            <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>商品图片</Text>
            <label htmlFor="my-store-img" style={{ cursor: 'pointer', display: 'block' }}>
              <div style={{
                width: 80, height: 80, borderRadius: 10, overflow: 'hidden', flexShrink: 0,
                border: `2px dashed ${form.image ? theme.accent.primary : theme.stroke.secondary}`,
                background: theme.fill.tertiary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {form.image
                  ? <img src={form.image} style={{ width: 80, height: 80, objectFit: 'cover', display: 'block' }} alt="" />
                  : <Text size="small" tone="secondary" style={{ fontSize: 22, lineHeight: 1 }}>+</Text>
                }
              </div>
            </label>
            <input id="my-store-img" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImage} />
          </div>
          <div style={{ flex: 1 }}>
            <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>商品名称 *</Text>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="如：自家蜂蜜" style={inputStyle} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>价格（元）*</Text>
            <input value={form.price} onChange={e => set('price', e.target.value)} placeholder="如：68" style={inputStyle} />
          </div>
          <div>
            <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>单位</Text>
            <input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="如：斤" style={inputStyle} />
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>商品描述</Text>
          <input value={form.desc} onChange={e => set('desc', e.target.value)} placeholder="如：本村散养蜜蜂，纯天然未加工…" style={inputStyle} />
        </div>
        <Row gap={10} align="center" style={{ marginBottom: 20 }}>
          <button onClick={submit} style={{
            padding: '10px 24px', borderRadius: 8, border: 'none',
            background: theme.accent.primary, color: theme.text.onAccent,
            cursor: 'pointer', fontWeight: 600, fontSize: 13,
          }}>提交审核</button>
          {submitted && <Pill tone="success" size="sm">✓ 已提交，等待村管理员审核</Pill>}
        </Row>

        <Divider />

        <Text style={{ fontWeight: 600, fontSize: 14, color: theme.text.primary, display: 'block', margin: '14px 0 10px' }}>
          我的商品（{products.length} 件）
        </Text>
        {products.length === 0 && (
          <Text size="small" tone="secondary">还没有上架商品，提交商品后等待管理员审核。</Text>
        )}
        {products.map(p => (
          <div key={p.id} style={{
            padding: '12px 14px', borderRadius: 10, marginBottom: 8,
            border: `1px solid ${p.status === '已通过' ? theme.accent.primary : p.status === '已驳回' ? '#ef4444' : theme.stroke.secondary}`,
            background: theme.bg.elevated,
          }}>
            <Row gap={10} align="center">
              <div style={{
                width: 48, height: 48, borderRadius: 8, flexShrink: 0, overflow: 'hidden',
                background: theme.fill.secondary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {p.image
                  ? <img src={p.image} style={{ width: 48, height: 48, objectFit: 'cover', display: 'block' }} alt="" />
                  : <Text size="small" tone="secondary" style={{ fontSize: 18 }}>品</Text>
                }
              </div>
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>{p.name}</Text>
                <Text size="small" tone="secondary">¥{p.price}/{p.unit} · {p.desc}</Text>
              </Stack>
              <Pill
                tone={p.status === '已通过' ? 'success' : p.status === '已驳回' ? 'deleted' : 'warning'}
                size="sm"
              >{p.status}</Pill>
            </Row>
            {p.status === '已驳回' && (
              <Text size="small" style={{ color: '#ef4444', marginTop: 6, display: 'block' }}>
                请修改后重新提交
              </Text>
            )}
          </div>
        ))}
      </div>
      <div style={{ height: 20 }} />
    </Stack>
  );
}

// ── Invite Center Screen ─────────────────────────────────────────────────────

function InviteScreen({ theme, onBack }: { theme: Theme; onBack: () => void }) {
  const [downlines, setDownlines] = useState<Downline[]>(MOCK_DOWNLINES_INIT);
  const [binding, setBinding] = useState(false);
  const [bindSuccess, setBindSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const nextMock = BIND_MOCK_POOL[downlines.length - MOCK_DOWNLINES_INIT.length];
  const canBind = nextMock !== undefined;

  const simulateBind = () => {
    if (!canBind || binding) return;
    setBinding(true);
    setTimeout(() => {
      const mock = nextMock;
      const today = new Date();
      setDownlines(prev => [...prev, {
        id: prev.length + 10, name: mock.name, phone: mock.phone,
        level: 'Lv.1',
        joinDate: `${today.getMonth() + 1}月${today.getDate()}日`,
        gmv: 0, earning: 0,
      }]);
      setBindSuccess(mock.name);
      setBinding(false);
      setTimeout(() => setBindSuccess(null), 3000);
    }, 1500);
  };

  const directCommission = 88.00;
  const downlineCommission = parseFloat(downlines.reduce((s, d) => s + d.earning, 0).toFixed(2));
  const total = parseFloat((directCommission + downlineCommission).toFixed(2));

  return (
    <Stack gap={0}>
      {/* Header */}
      <div style={{
        padding: '12px 16px', background: theme.bg.elevated,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: theme.accent.primary, fontSize: 20, lineHeight: 1, padding: 0,
        }}>‹</button>
        <Text style={{ fontWeight: 700, fontSize: 15, color: theme.text.primary }}>邀请中心</Text>
        <div style={{ flex: 1 }} />
        <Pill tone="info" size="sm">Lv.3 推广达人</Pill>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {/* Earnings summary */}
        <div style={{
          padding: '14px', borderRadius: 12, marginBottom: 14,
          background: `${theme.accent.primary}12`,
          border: `1px solid ${theme.accent.primary}35`,
        }}>
          <Text size="small" style={{ fontWeight: 600, color: theme.text.primary, display: 'block', marginBottom: 10 }}>
            推广收益（累计）
          </Text>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { label: '直销佣金', value: `¥${directCommission.toFixed(2)}`, sub: '成交额×5%', color: theme.text.primary },
              { label: '下级返佣', value: `¥${downlineCommission.toFixed(2)}`, sub: `${downlines.length}人×1%`, color: theme.text.primary },
              { label: '合计收益', value: `¥${total.toFixed(2)}`, sub: '已入账', color: theme.accent.primary },
            ].map(s => (
              <div key={s.label} style={{
                textAlign: 'center', padding: '10px 4px', borderRadius: 8,
                background: theme.bg.elevated,
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 10, color: theme.text.secondary, marginTop: 3 }}>{s.label}</div>
                <div style={{ fontSize: 9, color: theme.text.tertiary, marginTop: 1 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Invite code card */}
        <div style={{
          padding: '14px', borderRadius: 12, marginBottom: 14,
          border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated,
        }}>
          <Text size="small" style={{ fontWeight: 600, color: theme.text.primary, display: 'block', marginBottom: 12 }}>
            我的专属邀请码
          </Text>
          <Row gap={16} align="center" style={{ marginBottom: 12 }}>
            <MockQR size={82} />
            <Stack gap={6} style={{ flex: 1 }}>
              <Text style={{ fontSize: 24, fontWeight: 800, color: theme.accent.primary, letterSpacing: 3 }}>GX10086</Text>
              <Text size="small" tone="secondary" style={{ fontSize: 10 }}>下级扫码后自动绑定为您的一级成员</Text>
              <button
                onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1600); }}
                style={{
                  padding: '5px 0', borderRadius: 8,
                  border: `1px solid ${copied ? theme.accent.primary : theme.stroke.secondary}`,
                  background: copied ? `${theme.accent.primary}15` : 'none',
                  color: copied ? theme.accent.primary : theme.text.secondary,
                  cursor: 'pointer', fontSize: 11, width: '100%',
                }}
              >{copied ? '已复制 ✓' : '复制邀请码'}</button>
            </Stack>
          </Row>
          {/* Simulate bind button */}
          <button
            onClick={simulateBind}
            disabled={!canBind || binding}
            style={{
              width: '100%', padding: '11px', borderRadius: 10, border: 'none',
              background: canBind && !binding ? theme.accent.primary : theme.fill.secondary,
              color: canBind && !binding ? theme.text.onAccent : theme.text.tertiary,
              cursor: canBind && !binding ? 'pointer' : 'default',
              fontWeight: 600, fontSize: 13, transition: 'all 0.2s',
            }}
          >
            {binding ? '绑定中…请稍候' : canBind ? '🎯 演示：新用户扫码绑定' : '演示账户已全部绑定'}
          </button>
          {bindSuccess && (
            <div style={{
              marginTop: 8, padding: '8px 12px', borderRadius: 8,
              background: '#22c55e15', border: `1px solid #22c55e40`,
            }}>
              <Text size="small" style={{ color: '#22c55e' }}>
                ✓ {bindSuccess} 已绑定为您的一级下级，其购买可为您带来 1% 返佣
              </Text>
            </div>
          )}
        </div>

        {/* Downline list */}
        <Row gap={8} align="center" style={{ marginBottom: 10 }}>
          <Text style={{ fontWeight: 600, fontSize: 14, color: theme.text.primary }}>已绑定下级</Text>
          <Pill tone="info" size="sm">{downlines.length} 人 · 一级</Pill>
          <div style={{ flex: 1 }} />
          <Text size="small" tone="secondary">返佣 ¥{downlines.reduce((s, d) => s + d.earning, 0).toFixed(2)}</Text>
        </Row>

        {downlines.map(d => (
          <div key={d.id} style={{
            padding: '11px 14px', borderRadius: 10, marginBottom: 8,
            border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated,
          }}>
            <Row gap={10} align="center">
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: `${theme.accent.primary}20`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: theme.accent.primary, fontWeight: 700, fontSize: 14,
              }}>{d.name[0]}</div>
              <Stack gap={3} style={{ flex: 1 }}>
                <Row gap={6} align="center">
                  <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>{d.name}</Text>
                  <Pill tone="info" size="sm">{d.level}</Pill>
                </Row>
                <Text size="small" tone="secondary" style={{ fontSize: 10 }}>
                  {d.phone} · {d.joinDate}绑定
                </Text>
              </Stack>
              <Stack gap={2} style={{ textAlign: 'right' }}>
                {d.earning > 0 ? (
                  <>
                    <Text size="small" style={{ fontWeight: 700, color: theme.accent.primary }}>+¥{d.earning.toFixed(2)}</Text>
                    <Text size="small" tone="secondary" style={{ fontSize: 10 }}>GMV ¥{d.gmv}</Text>
                  </>
                ) : (
                  <Text size="small" tone="secondary" style={{ fontSize: 10 }}>暂无成交</Text>
                )}
              </Stack>
            </Row>
          </div>
        ))}

        {/* Rules */}
        <div style={{ marginTop: 8, padding: '12px 14px', borderRadius: 10, background: theme.fill.tertiary, border: `1px solid ${theme.stroke.tertiary}` }}>
          <Text size="small" style={{ fontWeight: 600, color: theme.text.primary, display: 'block', marginBottom: 8 }}>邀请规则</Text>
          {[
            '可邀请无限人数作为一级下级，无上限',
            '下级不可再邀请（一层限制，防止多层传销结构）',
            '下级每笔成交您获得成交额 1% 返佣（T+15 结算）',
            '发生退款时返佣同步扣回，防止刷单',
          ].map((t, i) => (
            <Row key={i} gap={6} align="start" style={{ marginBottom: 4 }}>
              <Text size="small" style={{ color: theme.accent.primary, flexShrink: 0 }}>·</Text>
              <Text size="small" tone="secondary">{t}</Text>
            </Row>
          ))}
        </div>

        <div style={{ height: 20 }} />
      </div>
    </Stack>
  );
}

// ── Cart Screen ──────────────────────────────────────────────────────────────

function CartScreen({ theme, cart, onUpdateQty, onRemove, onCheckout, onBack }: {
  theme: Theme; cart: CartItem[];
  onUpdateQty: (productId: number, qty: number) => void;
  onRemove: (productId: number) => void;
  onCheckout: () => void;
  onBack: () => void;
}) {
  const labels: Record<number, string> = { 1: '粮', 2: '蛋', 3: '粉', 4: '油', 5: '蜜', 6: '肉' };
  const total = cart.reduce((sum, item) => {
    const p = PRODUCTS.find(p => p.id === item.productId);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);

  return (
    <Stack gap={0}>
      <div style={{
        padding: '12px 16px', background: theme.bg.elevated,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: theme.accent.primary, fontSize: 20, lineHeight: 1, padding: 0,
        }}>‹</button>
        <Text style={{ fontWeight: 700, fontSize: 15, color: theme.text.primary }}>购物车</Text>
        <Text size="small" tone="secondary" style={{ marginLeft: 'auto' }}>{cart.length} 件商品</Text>
      </div>

      {cart.length === 0 ? (
        <div style={{ padding: '60px 16px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🛒</div>
          <Text tone="secondary" style={{ display: 'block', marginBottom: 20 }}>购物车还是空的</Text>
          <button onClick={onBack} style={{
            padding: '10px 28px', borderRadius: 20,
            background: theme.accent.primary, color: theme.text.onAccent,
            border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}>去逛逛</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, padding: '0 16px' }}>
            {cart.map(item => {
              const p = PRODUCTS.find(pd => pd.id === item.productId);
              if (!p) return null;
              return (
                <div key={item.productId} style={{
                  display: 'flex', gap: 12, padding: '14px 0',
                  borderBottom: `1px solid ${theme.stroke.tertiary}`, alignItems: 'center',
                }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: 8, flexShrink: 0,
                    background: theme.fill.secondary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, color: theme.text.tertiary,
                  }}>{labels[p.id] ?? '品'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text size="small" style={{ fontWeight: 600, color: theme.text.primary, display: 'block' }}>{p.name}</Text>
                    <Text size="small" tone="secondary" style={{ display: 'block', marginTop: 2 }}>{p.store}</Text>
                    <Text style={{ fontWeight: 700, color: theme.accent.primary, fontSize: 14, marginTop: 4, display: 'block' }}>
                      ¥{p.price}<Text size="small" tone="secondary"> /{p.unit}</Text>
                    </Text>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                    <button onClick={() => onRemove(item.productId)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: theme.text.tertiary, fontSize: 12, padding: 0,
                    }}>✕</button>
                    <Row gap={0} align="center">
                      <button onClick={() => onUpdateQty(item.productId, item.qty - 1)} style={{
                        width: 26, height: 26, border: `1px solid ${theme.stroke.secondary}`,
                        background: theme.bg.elevated, borderRadius: '6px 0 0 6px',
                        cursor: 'pointer', fontSize: 16, color: theme.text.primary,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>−</button>
                      <div style={{
                        width: 34, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: `1px solid ${theme.stroke.secondary}`, borderLeft: 'none', borderRight: 'none',
                        background: theme.bg.elevated,
                      }}>
                        <Text size="small" style={{ fontWeight: 600, fontSize: 12 }}>{item.qty}</Text>
                      </div>
                      <button onClick={() => onUpdateQty(item.productId, item.qty + 1)} style={{
                        width: 26, height: 26, border: `1px solid ${theme.stroke.secondary}`,
                        background: theme.bg.elevated, borderRadius: '0 6px 6px 0',
                        cursor: 'pointer', fontSize: 16, color: theme.text.primary,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>+</button>
                    </Row>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{
            padding: '14px 16px', background: theme.bg.elevated,
            borderTop: `1px solid ${theme.stroke.secondary}`, marginTop: 8,
          }}>
            <Row gap={12} align="center">
              <div style={{ flex: 1 }}>
                <Text size="small" tone="secondary" style={{ display: 'block' }}>合计</Text>
                <Row gap={4} align="center">
                  <Text style={{ fontSize: 20, fontWeight: 700, color: theme.accent.primary }}>¥{total.toFixed(2)}</Text>
                  <Text size="small" tone="secondary">+贡献值</Text>
                </Row>
              </div>
              <button onClick={onCheckout} style={{
                padding: '13px 32px', borderRadius: 24, border: 'none',
                background: theme.accent.primary, color: theme.text.onAccent,
                cursor: 'pointer', fontWeight: 600, fontSize: 14,
                boxShadow: `0 4px 12px ${theme.accent.primary}40`,
              }}>去结算</button>
            </Row>
          </div>
        </div>
      )}
      <div style={{ height: 20 }} />
    </Stack>
  );
}

// ── Order Confirm Screen ──────────────────────────────────────────────────────

function OrderConfirmScreen({ theme, cart, onSubmit, onBack, onViewOrders }: {
  theme: Theme; cart: CartItem[];
  onSubmit: (order: Order) => void;
  onBack: () => void;
  onViewOrders: () => void;
}) {
  const [delivery, setDelivery] = useState<'快递' | '自提'>('快递');
  const [payment, setPayment] = useState<'微信支付' | '现金'>('微信支付');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>(MOCK_COUPONS);
  const [selectedCouponId, setSelectedCouponId] = useState<number | null>(null);
  const [couponOpen, setCouponOpen] = useState(false);

  const labels: Record<number, string> = { 1: '粮', 2: '蛋', 3: '粉', 4: '油', 5: '蜜', 6: '肉' };
  const address = '范庄村 12 组 · 张小红 · 138****5678';

  const productTotal = cart.reduce((sum, item) => {
    const p = PRODUCTS.find(p => p.id === item.productId);
    return sum + (p ? p.price * item.qty : 0);
  }, 0);
  const shippingFee = delivery === '自提' ? 0 : (productTotal >= 50 ? 0 : 5);
  const selectedCoupon = coupons.find(c => c.id === selectedCouponId) ?? null;
  const couponDiscount = selectedCoupon && productTotal >= selectedCoupon.minAmount ? selectedCoupon.discount : 0;
  const applicableCoupons = coupons.filter(c => productTotal >= c.minAmount);
  const finalTotal = Math.max(0, productTotal + shippingFee - couponDiscount);

  const placeOrder = () => {
    setLoading(true);
    setTimeout(() => {
      const now = new Date();
      const newOrder: Order = {
        id: `GX${Date.now()}`,
        items: cart,
        total: finalTotal,
        address,
        payment,
        deliveryMethod: delivery,
        status: '待发货',
        createdAt: `${now.getMonth() + 1}月${now.getDate()}日 ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
        courier: '顺丰速运',
        trackingNo: '—',
        logistics: [
          { time: '刚刚', desc: '您的订单已提交，等待商家确认', location: '范庄村电商服务站' },
        ],
      };
      onSubmit(newOrder);
      setPlacedOrder(newOrder);
      setLoading(false);
      setSuccess(true);
    }, 1200);
  };

  if (success && placedOrder) {
    // Re-compute from stored order items (cart is already cleared at this point)
    const savedProductTotal = placedOrder.items.reduce((sum, item) => {
      const p = PRODUCTS.find(pd => pd.id === item.productId);
      return sum + (p ? p.price * item.qty : 0);
    }, 0);
    const savedShippingFee = placedOrder.total - savedProductTotal;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '52px 24px 24px', gap: 16 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%', background: '#22c55e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, color: '#fff', boxShadow: '0 4px 20px #22c55e40',
        }}>✓</div>
        <Stack gap={4} style={{ textAlign: 'center' }}>
          <Text style={{ fontSize: 18, fontWeight: 700, color: theme.text.primary }}>下单成功！</Text>
          <Text size="small" tone="secondary">商家将在24小时内发货，发货后可查看物流信息</Text>
        </Stack>
        <div style={{
          width: '100%', padding: 16, borderRadius: 10,
          background: theme.bg.elevated, border: `1px solid ${theme.stroke.secondary}`,
        }}>
          {[
            ['订单编号', placedOrder.id.slice(-8)],
            ['支付方式', placedOrder.payment],
            ['配送方式', placedOrder.deliveryMethod === '自提' ? '村委会自提（3天内）' : '快递配送'],
            ['商品合计', `¥${savedProductTotal.toFixed(2)}`],
            ['运费', savedShippingFee === 0 ? (placedOrder.deliveryMethod === '自提' ? '免费自提' : '满50元免邮') : `¥${savedShippingFee}`],
          ].map(([k, v]) => (
            <Row key={k} gap={8} align="center" style={{ marginBottom: 6 }}>
              <Text size="small" tone="secondary" style={{ flex: 1 }}>{k}</Text>
              <Text size="small" style={{ color: theme.text.primary }}>{v}</Text>
            </Row>
          ))}
          <Divider />
          <Row gap={8} align="center" style={{ marginTop: 8 }}>
            <Text size="small" style={{ fontWeight: 600, flex: 1, color: theme.text.primary }}>实付金额</Text>
            <Text style={{ fontSize: 17, fontWeight: 700, color: theme.accent.primary }}>¥{placedOrder.total.toFixed(2)}</Text>
          </Row>
          <div style={{ marginTop: 10, padding: '7px 10px', borderRadius: 6, background: `${theme.accent.primary}15` }}>
            <Text size="small" style={{ color: theme.accent.primary }}>🎉 +10 贡献值已入账</Text>
          </div>
        </div>
        <button onClick={onViewOrders} style={{
          width: '100%', padding: '13px', borderRadius: 24, border: 'none',
          background: theme.accent.primary, color: theme.text.onAccent,
          cursor: 'pointer', fontWeight: 600, fontSize: 14,
          boxShadow: `0 4px 12px ${theme.accent.primary}40`,
        }}>查看订单</button>
        <button onClick={onBack} style={{
          width: '100%', padding: '10px', borderRadius: 24,
          border: `1px solid ${theme.stroke.secondary}`,
          background: 'none', color: theme.text.secondary,
          cursor: 'pointer', fontSize: 13,
        }}>继续购物</button>
      </div>
    );
  }

  return (
    <Stack gap={0}>
      <div style={{
        padding: '12px 16px', background: theme.bg.elevated,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: theme.accent.primary, fontSize: 20, lineHeight: 1, padding: 0,
        }}>‹</button>
        <Text style={{ fontWeight: 700, fontSize: 15, color: theme.text.primary }}>确认订单</Text>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {/* Address */}
        <div style={{
          padding: '14px', borderRadius: 10, marginBottom: 12,
          border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated,
        }}>
          <Row gap={10} align="center">
            <span style={{ fontSize: 20 }}>📍</span>
            <Stack gap={2} style={{ flex: 1 }}>
              <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>{address}</Text>
              <Text size="small" tone="secondary">收货地址</Text>
            </Stack>
            <Text tone="secondary">›</Text>
          </Row>
        </div>

        {/* Items */}
        <div style={{
          borderRadius: 10, marginBottom: 12,
          border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated, overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${theme.stroke.tertiary}`, background: theme.fill.tertiary }}>
            <Text size="small" style={{ fontWeight: 600, color: theme.text.secondary }}>范庄村供享小店</Text>
          </div>
          {cart.map(item => {
            const p = PRODUCTS.find(pd => pd.id === item.productId);
            if (!p) return null;
            return (
              <div key={item.productId} style={{
                display: 'flex', gap: 12, padding: '12px 14px', alignItems: 'center',
                borderBottom: `1px solid ${theme.stroke.tertiary}`,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 6, flexShrink: 0,
                  background: theme.fill.secondary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: theme.text.tertiary,
                }}>{labels[p.id] ?? '品'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text size="small" style={{ fontWeight: 600, color: theme.text.primary, display: 'block' }}>{p.name}</Text>
                  <Text size="small" tone="secondary" style={{ display: 'block', marginTop: 2 }}>¥{p.price}/{p.unit}</Text>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Text size="small" style={{ fontWeight: 600, color: theme.text.secondary }}>×{item.qty}</Text>
                  <Text size="small" style={{ color: theme.accent.primary, display: 'block', marginTop: 2 }}>¥{(p.price * item.qty).toFixed(2)}</Text>
                </div>
              </div>
            );
          })}
        </div>

        {/* Delivery & Payment */}
        <div style={{
          borderRadius: 10, marginBottom: 12,
          border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated,
        }}>
          {[
            { label: '配送方式', opts: ['快递', '自提'] as const, val: delivery, set: setDelivery as (v: string) => void },
            { label: '支付方式', opts: ['微信支付', '现金'] as const, val: payment, set: setPayment as (v: string) => void },
          ].map(({ label, opts, val, set }, i) => (
            <div key={label} style={{
              padding: '12px 14px',
              borderBottom: i === 0 ? `1px solid ${theme.stroke.tertiary}` : 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <Text size="small" tone="secondary">{label}</Text>
              <Row gap={6} align="center">
                {opts.map(o => (
                  <button key={o} onClick={() => set(o)} style={{
                    padding: '4px 12px', borderRadius: 12,
                    border: `1px solid ${val === o ? theme.accent.primary : theme.stroke.secondary}`,
                    background: val === o ? `${theme.accent.primary}18` : 'none',
                    color: val === o ? theme.accent.primary : theme.text.secondary,
                    cursor: 'pointer', fontSize: 12,
                  }}>{o}</button>
                ))}
              </Row>
            </div>
          ))}
        </div>

        {/* Coupon picker */}
        <div style={{
          borderRadius: 10, marginBottom: 12,
          border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated,
          overflow: 'hidden',
        }}>
          <button
            onClick={() => { if (applicableCoupons.length > 0) setCouponOpen(o => !o); }}
            style={{
              width: '100%', padding: '12px 14px', background: 'none', border: 'none',
              cursor: applicableCoupons.length > 0 ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
          >
            <Text size="small" tone="secondary">优惠券</Text>
            <Row gap={6} align="center">
              {couponDiscount > 0
                ? <Text size="small" style={{ color: '#ef4444', fontWeight: 600 }}>-¥{couponDiscount}</Text>
                : <Text size="small" tone="secondary">{applicableCoupons.length > 0 ? `${applicableCoupons.length}张可用` : '暂无可用'}</Text>
              }
              {applicableCoupons.length > 0 && (
                <Text size="small" tone="secondary">{couponOpen ? '∧' : '›'}</Text>
              )}
            </Row>
          </button>
          {couponOpen && (
            <div style={{ borderTop: `1px solid ${theme.stroke.tertiary}`, padding: '8px 14px 10px' }}>
              {/* No coupon option */}
              <button
                onClick={() => { setSelectedCouponId(null); setCouponOpen(false); }}
                style={{
                  width: '100%', padding: '8px 10px', marginBottom: 6, borderRadius: 8,
                  border: `1px solid ${selectedCouponId === null ? theme.stroke.secondary : theme.stroke.tertiary}`,
                  background: selectedCouponId === null ? theme.fill.secondary : 'none',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxSizing: 'border-box' as const,
                }}
              >
                <Text size="small" style={{ color: theme.text.secondary, flex: 1, textAlign: 'left' }}>不使用优惠券</Text>
                {selectedCouponId === null && <Text size="small" style={{ color: theme.accent.primary }}>✓</Text>}
              </button>
              {applicableCoupons.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCouponId(c.id); setCouponOpen(false); }}
                  style={{
                    width: '100%', padding: '10px 12px', marginBottom: 6, borderRadius: 8,
                    border: `2px solid ${selectedCouponId === c.id ? '#ef4444' : theme.stroke.tertiary}`,
                    background: selectedCouponId === c.id ? '#ef444410' : theme.fill.tertiary,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                    boxSizing: 'border-box' as const,
                  }}
                >
                  <div style={{
                    padding: '2px 7px', borderRadius: 4, background: '#ef4444',
                    color: '#fff', fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}>{c.tag}</div>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <Text size="small" style={{ fontWeight: 600, color: theme.text.primary, display: 'block' }}>{c.desc}</Text>
                    {c.minAmount > 0 && (
                      <Text size="small" tone="secondary" style={{ fontSize: 10 }}>满{c.minAmount}元可用</Text>
                    )}
                  </div>
                  <Text size="small" style={{ color: '#ef4444', fontWeight: 700 }}>-¥{c.discount}</Text>
                  {selectedCouponId === c.id && <span style={{ fontSize: 16, color: '#ef4444' }}>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Price breakdown */}
        <div style={{
          borderRadius: 10, marginBottom: 16, padding: '12px 14px',
          border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated,
        }}>
          {[
            { k: '商品合计', v: `¥${productTotal.toFixed(2)}`, red: false, accent: false },
            { k: '运费', v: delivery === '自提' ? '免费自提' : shippingFee === 0 ? '满50免邮' : `¥${shippingFee}`, red: false, accent: false },
            ...(couponDiscount > 0 ? [{ k: '优惠券', v: `-¥${couponDiscount}`, red: true, accent: false }] : []),
            { k: '贡献值奖励', v: '+10 分（即时到账）', red: false, accent: true },
          ].map(({ k, v, accent, red }) => (
            <Row key={k} gap={8} align="center" style={{ marginBottom: 6 }}>
              <Text size="small" tone="secondary" style={{ flex: 1 }}>{k}</Text>
              <Text size="small" style={{ color: red ? '#ef4444' : accent ? theme.accent.primary : theme.text.primary }}>{v}</Text>
            </Row>
          ))}
          <Divider />
          <Row gap={8} align="center" style={{ marginTop: 8 }}>
            <Text size="small" style={{ fontWeight: 600, flex: 1, color: theme.text.primary }}>实付金额</Text>
            <Text style={{ fontSize: 17, fontWeight: 700, color: theme.accent.primary }}>¥{finalTotal.toFixed(2)}</Text>
          </Row>
        </div>

        <button onClick={placeOrder} disabled={loading} style={{
          width: '100%', padding: '14px', borderRadius: 24, border: 'none',
          background: loading ? theme.fill.secondary : theme.accent.primary,
          color: loading ? theme.text.tertiary : theme.text.onAccent,
          cursor: loading ? 'default' : 'pointer', fontWeight: 600, fontSize: 15,
          boxShadow: loading ? 'none' : `0 4px 14px ${theme.accent.primary}40`,
          transition: 'all 0.2s',
        }}>
          {loading ? '提交中…' : `提交订单 · ¥${finalTotal.toFixed(2)}`}
        </button>
      </div>
      <div style={{ height: 20 }} />
    </Stack>
  );
}

// ── Orders Screen ─────────────────────────────────────────────────────────────

function OrdersScreen({ theme, orders, onUpdateOrder, onViewLogistics, onBack }: {
  theme: Theme; orders: Order[];
  onUpdateOrder: (id: string, changes: Partial<Order>) => void;
  onViewLogistics: (orderId: string) => void;
  onBack: () => void;
}) {
  type OTab = '全部' | '待发货' | '配送中' | '已签收';
  const [activeTab, setActiveTab] = useState<OTab>('全部');
  const labels: Record<number, string> = { 1: '粮', 2: '蛋', 3: '粉', 4: '油', 5: '蜜', 6: '肉' };

  // review form state
  const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewAnonymous, setReviewAnonymous] = useState(false);

  // refund form state
  const [refundOrderId, setRefundOrderId] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundDesc, setRefundDesc] = useState('');

  const refundReasons = ['商品质量问题', '发货太慢', '描述不符', '不想要了', '拍错了', '价格问题', '其他原因'];

  const filtered = activeTab === '全部' ? orders : orders.filter(o => o.status === (activeTab as string));

  const statusColor = (s: string) => {
    if (s === '配送中') return theme.accent.primary;
    if (s === '已签收') return '#22c55e';
    if (s === '已取消') return theme.text.tertiary;
    if (s === '退款中') return '#f97316';
    return '#f59e0b';
  };

  const submitReview = (orderId: string) => {
    const review: OrderReview = {
      rating: reviewRating, comment: reviewComment,
      anonymous: reviewAnonymous, createdAt: '刚刚',
    };
    onUpdateOrder(orderId, { review });
    setReviewingOrderId(null);
    setReviewComment('');
    setReviewRating(5);
    setReviewAnonymous(false);
  };

  const submitRefund = (orderId: string) => {
    if (!refundReason) return;
    onUpdateOrder(orderId, { status: '退款中', refundReason });
    setRefundOrderId(null);
    setRefundReason('');
    setRefundDesc('');
  };

  const smallBtn = (border: string, color: string) => ({
    padding: '4px 12px', borderRadius: 20,
    border: `1px solid ${border}`, background: 'none', color,
    cursor: 'pointer', fontSize: 11, fontWeight: 600,
  } as const);

  return (
    <Stack gap={0}>
      <div style={{
        padding: '12px 16px', background: theme.bg.elevated,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: theme.accent.primary, fontSize: 20, lineHeight: 1, padding: 0,
        }}>‹</button>
        <Text style={{ fontWeight: 700, fontSize: 15, color: theme.text.primary }}>我的订单</Text>
      </div>

      <div style={{ display: 'flex', background: theme.bg.elevated, borderBottom: `1px solid ${theme.stroke.tertiary}` }}>
        {(['全部', '待发货', '配送中', '已签收'] as OTab[]).map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', background: 'none',
            borderBottom: `2px solid ${activeTab === t ? theme.accent.primary : 'transparent'}`,
            color: activeTab === t ? theme.accent.primary : theme.text.secondary,
            fontSize: 12, fontWeight: activeTab === t ? 600 : 400, transition: 'all 0.15s',
          }}>{t}</button>
        ))}
      </div>

      <div style={{ padding: '12px 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Text tone="secondary">暂无{activeTab === '全部' ? '' : activeTab}订单</Text>
          </div>
        ) : filtered.map(order => (
          <div key={order.id} style={{
            borderRadius: 10, marginBottom: 12,
            border: `1px solid ${theme.stroke.secondary}`,
            background: theme.bg.elevated, overflow: 'hidden',
          }}>
            {/* Order header */}
            <div style={{
              padding: '9px 14px', background: theme.fill.tertiary,
              borderBottom: `1px solid ${theme.stroke.tertiary}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <Text size="small" tone="secondary" style={{ fontSize: 11 }}>订单 {order.id.slice(-8)}</Text>
              <Row gap={6} align="center">
                {order.status === '退款中' && (
                  <Text size="small" style={{ fontSize: 10, color: '#f97316' }}>退款处理中</Text>
                )}
                <Text size="small" style={{ color: statusColor(order.status), fontWeight: 600, fontSize: 12 }}>
                  {order.status}
                </Text>
              </Row>
            </div>

            {/* Items */}
            <div style={{ padding: '12px 14px' }}>
              {order.items.map(item => {
                const p = PRODUCTS.find(pd => pd.id === item.productId);
                if (!p) return null;
                return (
                  <div key={item.productId} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 6, flexShrink: 0,
                      background: theme.fill.secondary,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, color: theme.text.tertiary,
                    }}>{labels[p.id] ?? '品'}</div>
                    <div style={{ flex: 1 }}>
                      <Text size="small" style={{ fontWeight: 600, color: theme.text.primary, display: 'block' }}>{p.name}</Text>
                      <Text size="small" tone="secondary">×{item.qty} · ¥{p.price}/{p.unit}</Text>
                    </div>
                    <Text size="small" style={{ color: theme.accent.primary, fontWeight: 600 }}>¥{(p.price * item.qty).toFixed(2)}</Text>
                  </div>
                );
              })}
            </div>

            {/* Footer: total + action buttons */}
            <div style={{
              padding: '10px 14px', borderTop: `1px solid ${theme.stroke.tertiary}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <Text size="small" tone="secondary">{order.createdAt} · {order.payment}</Text>
              <Row gap={6} align="center">
                <Text size="small" style={{ color: theme.text.primary }}>
                  共付 <span style={{ fontWeight: 700, color: theme.accent.primary }}>¥{order.total.toFixed(2)}</span>
                </Text>
                {/* 查看物流 */}
                {(order.status === '配送中' || order.status === '已签收') && (
                  <button onClick={() => onViewLogistics(order.id)}
                    style={smallBtn(theme.stroke.secondary, theme.text.secondary)}>物流</button>
                )}
                {/* 确认收货 */}
                {order.status === '配送中' && (
                  <button onClick={() => onUpdateOrder(order.id, { status: '已签收' })}
                    style={smallBtn('#22c55e', '#22c55e')}>确认收货</button>
                )}
                {/* 评价 / 已评价 */}
                {order.status === '已签收' && !order.review && (
                  <button onClick={() => {
                    setReviewingOrderId(reviewingOrderId === order.id ? null : order.id);
                    setRefundOrderId(null);
                  }} style={smallBtn(theme.accent.primary, theme.accent.primary)}>评价</button>
                )}
                {order.status === '已签收' && order.review && (
                  <span style={{ fontSize: 11, color: theme.text.tertiary }}>已评价 {'★'.repeat(order.review.rating)}</span>
                )}
                {/* 申请退款 */}
                {(order.status === '待发货' || order.status === '配送中') && (
                  <button onClick={() => {
                    setRefundOrderId(refundOrderId === order.id ? null : order.id);
                    setReviewingOrderId(null);
                  }} style={smallBtn('#ef4444', '#ef4444')}>退款</button>
                )}
              </Row>
            </div>

            {/* Inline review form */}
            {reviewingOrderId === order.id && (
              <div style={{
                padding: '14px 14px 12px',
                borderTop: `1px solid ${theme.stroke.tertiary}`,
                background: theme.fill.tertiary,
              }}>
                <Text size="small" style={{ fontWeight: 600, color: theme.text.primary, display: 'block', marginBottom: 10 }}>
                  发表评价
                </Text>
                {/* Star rating */}
                <Row gap={4} align="center" style={{ marginBottom: 10 }}>
                  <Text size="small" tone="secondary" style={{ marginRight: 4 }}>评分</Text>
                  {[1, 2, 3, 4, 5].map(star => (
                    <button key={star} onClick={() => setReviewRating(star)} style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 22, padding: '0 1px', lineHeight: 1,
                    }}>
                      <span style={{ color: star <= reviewRating ? '#f59e0b' : theme.stroke.secondary }}>★</span>
                    </button>
                  ))}
                  <Text size="small" style={{ color: '#f59e0b', marginLeft: 4 }}>
                    {['', '差评', '一般', '还行', '好评', '超赞'][reviewRating]}
                  </Text>
                </Row>
                {/* Comment textarea */}
                <textarea
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder="分享一下您的使用体验，帮助更多村民做选择…"
                  rows={3}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8,
                    border: `1px solid ${theme.stroke.secondary}`,
                    background: theme.bg.elevated, color: theme.text.primary,
                    fontSize: 12, resize: 'none', outline: 'none',
                    boxSizing: 'border-box' as const, marginBottom: 8,
                  }}
                />
                {/* Anonymous toggle + buttons */}
                <Row gap={8} align="center">
                  <button onClick={() => setReviewAnonymous(a => !a)} style={{
                    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
                    border: `2px solid ${reviewAnonymous ? theme.accent.primary : theme.stroke.secondary}`,
                    background: reviewAnonymous ? theme.accent.primary : 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 12,
                  }}>{reviewAnonymous ? '✓' : ''}</button>
                  <Text size="small" tone="secondary">匿名评价</Text>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => setReviewingOrderId(null)} style={{
                    padding: '5px 14px', borderRadius: 16,
                    border: `1px solid ${theme.stroke.secondary}`,
                    background: 'none', color: theme.text.secondary,
                    cursor: 'pointer', fontSize: 12,
                  }}>取消</button>
                  <button onClick={() => submitReview(order.id)} style={{
                    padding: '5px 14px', borderRadius: 16, border: 'none',
                    background: theme.accent.primary, color: theme.text.onAccent,
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  }}>提交评价</button>
                </Row>
              </div>
            )}

            {/* Inline refund form */}
            {refundOrderId === order.id && (
              <div style={{
                padding: '14px 14px 12px',
                borderTop: `1px solid ${theme.stroke.tertiary}`,
                background: theme.fill.tertiary,
              }}>
                <Text size="small" style={{ fontWeight: 600, color: theme.text.primary, display: 'block', marginBottom: 10 }}>
                  申请退款
                </Text>
                {/* Reason chips */}
                <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                  {refundReasons.map(r => (
                    <button key={r} onClick={() => setRefundReason(r)} style={{
                      padding: '4px 10px', borderRadius: 12,
                      border: `1px solid ${refundReason === r ? '#ef4444' : theme.stroke.secondary}`,
                      background: refundReason === r ? '#ef444415' : 'none',
                      color: refundReason === r ? '#ef4444' : theme.text.secondary,
                      cursor: 'pointer', fontSize: 11,
                    }}>{r}</button>
                  ))}
                </div>
                {/* Description */}
                <textarea
                  value={refundDesc}
                  onChange={e => setRefundDesc(e.target.value)}
                  placeholder="补充说明（选填）…"
                  rows={2}
                  style={{
                    width: '100%', padding: '8px 10px', borderRadius: 8,
                    border: `1px solid ${theme.stroke.secondary}`,
                    background: theme.bg.elevated, color: theme.text.primary,
                    fontSize: 12, resize: 'none', outline: 'none',
                    boxSizing: 'border-box' as const, marginBottom: 8,
                  }}
                />
                {/* Buttons */}
                <Row gap={8} align="center" style={{ justifyContent: 'flex-end' }}>
                  <button onClick={() => { setRefundOrderId(null); setRefundReason(''); setRefundDesc(''); }} style={{
                    padding: '5px 14px', borderRadius: 16,
                    border: `1px solid ${theme.stroke.secondary}`,
                    background: 'none', color: theme.text.secondary,
                    cursor: 'pointer', fontSize: 12,
                  }}>取消</button>
                  <button
                    onClick={() => submitRefund(order.id)}
                    disabled={!refundReason}
                    style={{
                      padding: '5px 14px', borderRadius: 16, border: 'none',
                      background: refundReason ? '#ef4444' : theme.fill.secondary,
                      color: refundReason ? '#fff' : theme.text.tertiary,
                      cursor: refundReason ? 'pointer' : 'default',
                      fontSize: 12, fontWeight: 600,
                    }}
                  >提交申请</button>
                </Row>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ height: 20 }} />
    </Stack>
  );
}

// ── Logistics Screen ──────────────────────────────────────────────────────────

function LogisticsScreen({ theme, order, onBack }: {
  theme: Theme; order: Order; onBack: () => void;
}) {
  const labels: Record<number, string> = { 1: '粮', 2: '蛋', 3: '粉', 4: '油', 5: '蜜', 6: '肉' };
  const reversed = [...order.logistics].reverse();
  const isDone = order.status === '已签收';

  return (
    <Stack gap={0}>
      <div style={{
        padding: '12px 16px', background: theme.bg.elevated,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={onBack} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: theme.accent.primary, fontSize: 20, lineHeight: 1, padding: 0,
        }}>‹</button>
        <Text style={{ fontWeight: 700, fontSize: 15, color: theme.text.primary }}>物流跟踪</Text>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {/* Order brief */}
        <div style={{
          padding: '12px 14px', borderRadius: 10, marginBottom: 12,
          border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated,
        }}>
          <Row gap={10} align="center">
            {order.items.slice(0, 3).map(item => {
              const p = PRODUCTS.find(pd => pd.id === item.productId);
              if (!p) return null;
              return (
                <div key={item.productId} style={{
                  width: 44, height: 44, borderRadius: 6, flexShrink: 0,
                  background: theme.fill.secondary,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, color: theme.text.tertiary,
                }}>{labels[p.id] ?? '品'}</div>
              );
            })}
            <Stack gap={2} style={{ flex: 1 }}>
              <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>
                订单 {order.id.slice(-8)}
              </Text>
              <Text size="small" tone="secondary">
                共 {order.items.reduce((a, b) => a + b.qty, 0)} 件 · ¥{order.total.toFixed(2)} · {order.payment}
              </Text>
            </Stack>
          </Row>
        </div>

        {/* Courier banner */}
        <div style={{
          padding: '14px', borderRadius: 10, marginBottom: 16,
          border: `2px solid ${isDone ? '#22c55e' : theme.accent.primary}`,
          background: isDone ? '#22c55e10' : `${theme.accent.primary}10`,
        }}>
          <Row gap={12} align="center">
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: isDone ? '#22c55e' : theme.accent.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 22,
            }}>{isDone ? '✓' : '🚚'}</div>
            <Stack gap={3} style={{ flex: 1 }}>
              <Text style={{ fontWeight: 700, color: theme.text.primary, fontSize: 14 }}>
                {order.status === '配送中' ? '派送中 · 即将送达' :
                 order.status === '已签收' ? '已签收 · 感谢购买' :
                 order.status === '待发货' ? '商家备货中' : order.status}
              </Text>
              <Text size="small" tone="secondary">{order.courier} · 运单号 {order.trackingNo}</Text>
            </Stack>
            <button style={{
              padding: '5px 10px', borderRadius: 12,
              border: `1px solid ${theme.stroke.secondary}`,
              background: 'none', color: theme.text.secondary,
              cursor: 'pointer', fontSize: 11, flexShrink: 0,
            }}>复制</button>
          </Row>
        </div>

        {/* Timeline */}
        <Text style={{ fontWeight: 600, fontSize: 13, color: theme.text.primary, display: 'block', marginBottom: 12 }}>
          物流详情
        </Text>
        <div style={{ paddingLeft: 4 }}>
          {reversed.map((node, i) => {
            const isLatest = i === 0;
            const isLast = i === reversed.length - 1;
            return (
              <div key={i} style={{ display: 'flex', gap: 14 }}>
                {/* Dot + line */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 14 }}>
                  <div style={{
                    width: isLatest ? 14 : 10, height: isLatest ? 14 : 10,
                    borderRadius: '50%', flexShrink: 0, marginTop: 3,
                    background: isLatest ? (isDone ? '#22c55e' : theme.accent.primary) : theme.fill.primary,
                    border: `2px solid ${isLatest ? (isDone ? '#22c55e' : theme.accent.primary) : theme.stroke.secondary}`,
                    boxShadow: isLatest ? `0 0 0 3px ${isDone ? '#22c55e' : theme.accent.primary}25` : 'none',
                  }} />
                  {!isLast && (
                    <div style={{
                      width: 2, flex: 1, minHeight: 28,
                      background: `linear-gradient(to bottom, ${isLatest ? (isDone ? '#22c55e80' : theme.accent.primary + '80') : theme.stroke.secondary}, ${theme.stroke.secondary})`,
                      margin: '4px 0',
                    }} />
                  )}
                </div>
                {/* Content */}
                <div style={{ flex: 1, paddingBottom: isLast ? 4 : 18 }}>
                  <Text size="small" style={{
                    fontWeight: isLatest ? 600 : 400,
                    color: isLatest ? theme.text.primary : theme.text.secondary,
                    display: 'block', lineHeight: '1.5',
                  }}>{node.desc}</Text>
                  <Text size="small" tone="secondary" style={{ fontSize: 11, marginTop: 3, display: 'block' }}>
                    {node.time} · {node.location}
                  </Text>
                </div>
              </div>
            );
          })}
        </div>

        {/* Delivery address */}
        <div style={{
          marginTop: 16, padding: '12px 14px', borderRadius: 10,
          background: theme.fill.tertiary, border: `1px solid ${theme.stroke.tertiary}`,
        }}>
          <Row gap={8} align="center">
            <span style={{ fontSize: 16 }}>📍</span>
            <Stack gap={1}>
              <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>收货地址</Text>
              <Text size="small" tone="secondary">{order.address}</Text>
            </Stack>
          </Row>
        </div>
      </div>
      <div style={{ height: 20 }} />
    </Stack>
  );
}

// ── Admin Panel (Right Side) ─────────────────────────────────────────────────

type AdminSection = '看板' | '发布公告' | '商品审核' | '就业招工' | '党建活动' | '村务公开' | '消息通知' | '考核管理' | '创业者管理';

const ADMIN_NAV: { id: AdminSection; icon: string }[] = [
  { id: '看板', icon: '▦' },
  { id: '发布公告', icon: '📢' },
  { id: '商品审核', icon: '✓' },
  { id: '就业招工', icon: '◧' },
  { id: '党建活动', icon: '✦' },
  { id: '村务公开', icon: '◻' },
  { id: '消息通知', icon: '◉' },
  { id: '考核管理', icon: '◈' },
  { id: '创业者管理', icon: '◑' },
];

function AdminBackend({ theme, mode, onToggle, onExit, notices, setNotices, jobs, setJobs, partyEvents, setPartyEvents, villageAffairs, setVillageAffairs, pendingProducts, setPendingProducts }: {
  theme: Theme; mode: 'dark' | 'light'; onToggle: () => void; onExit: () => void;
  notices: string[]; setNotices: (v: string[]) => void;
  jobs: Job[]; setJobs: (v: Job[]) => void;
  partyEvents: PartyEvent[]; setPartyEvents: (v: PartyEvent[]) => void;
  villageAffairs: VillageAffair[]; setVillageAffairs: (v: VillageAffair[]) => void;
  pendingProducts: PendingProduct[]; setPendingProducts: (v: PendingProduct[]) => void;
}) {
  const [section, setSection] = useState<AdminSection>('看板');

  const inputStyle = {
    width: '100%', padding: '8px 12px', borderRadius: 8,
    border: `1px solid ${theme.stroke.secondary}`,
    background: theme.fill.tertiary, color: theme.text.primary,
    fontSize: 13, outline: 'none', boxSizing: 'border-box' as const,
  };
  const btnPrimary = {
    padding: '8px 20px', borderRadius: 8, border: 'none',
    background: theme.accent.primary, color: theme.text.onAccent,
    cursor: 'pointer', fontSize: 13, fontWeight: 600,
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: theme.bg.chrome, overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: 180, flexShrink: 0, background: theme.bg.elevated,
        borderRight: `1px solid ${theme.stroke.secondary}`,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          padding: '20px 16px 12px',
          borderBottom: `1px solid ${theme.stroke.tertiary}`,
        }}>
          <Text style={{ fontWeight: 700, fontSize: 14, color: theme.text.primary, display: 'block' }}>范庄村</Text>
          <Text size="small" tone="secondary">管理员后台</Text>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {ADMIN_NAV.map(item => (
            <button key={item.id} onClick={() => setSection(item.id)} style={{
              width: '100%', padding: '10px 16px', border: 'none', cursor: 'pointer',
              background: section === item.id ? `${theme.accent.primary}20` : 'none',
              borderLeft: `3px solid ${section === item.id ? theme.accent.primary : 'transparent'}`,
              display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
            }}>
              <span style={{ fontSize: 14, color: section === item.id ? theme.accent.primary : theme.text.tertiary }}>
                {item.icon}
              </span>
              <Text size="small" style={{
                color: section === item.id ? theme.accent.primary : theme.text.secondary,
                fontWeight: section === item.id ? 600 : 400,
              }}>{item.id}</Text>
            </button>
          ))}
        </div>

        <div style={{ padding: '12px', borderTop: `1px solid ${theme.stroke.tertiary}` }}>
          <button onClick={onExit} style={{
            width: '100%', padding: '8px', borderRadius: 8, border: `1px solid ${theme.stroke.secondary}`,
            background: 'none', color: theme.text.secondary, cursor: 'pointer', fontSize: 12,
          }}>← 返回村民端</button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Stack gap={2}>
            <H2>{section}</H2>
            <Text tone="secondary" size="small">供享村社 · 范庄村服务中心</Text>
          </Stack>
          <button onClick={onToggle} style={{
            padding: '6px 14px', borderRadius: 20, border: `1px solid ${theme.stroke.secondary}`,
            background: theme.bg.elevated, color: theme.text.secondary,
            cursor: 'pointer', fontSize: 12,
          }}>{mode === 'dark' ? '切换浅色' : '切换深色'}</button>
        </div>

        {section === '看板' && <AdminDashboard theme={theme} />}
        {section === '发布公告' && <AdminNotices theme={theme} notices={notices} setNotices={setNotices} inputStyle={inputStyle} btnPrimary={btnPrimary} />}
        {section === '商品审核' && <AdminProducts theme={theme} pendingProducts={pendingProducts} setPendingProducts={setPendingProducts} />}
        {section === '就业招工' && <AdminJobs theme={theme} jobs={jobs} setJobs={setJobs} inputStyle={inputStyle} btnPrimary={btnPrimary} />}
        {section === '党建活动' && <AdminParty theme={theme} partyEvents={partyEvents} setPartyEvents={setPartyEvents} inputStyle={inputStyle} btnPrimary={btnPrimary} />}
        {section === '村务公开' && <AdminAffairs theme={theme} villageAffairs={villageAffairs} setVillageAffairs={setVillageAffairs} inputStyle={inputStyle} btnPrimary={btnPrimary} />}
        {section === '消息通知' && <AdminMessages theme={theme} inputStyle={inputStyle} btnPrimary={btnPrimary} />}
        {section === '考核管理' && <AdminAssessment theme={theme} />}
        {section === '创业者管理' && <AdminEntrepreneurs theme={theme} />}
      </div>
    </div>
  );
}

function AdminDashboard({ theme }: { theme: Theme }) {
  return (
    <Stack gap={20}>
      <Grid columns={3} gap={16}>
        <Stat label="本月交易额" value="¥ 8,420" tone="success" />
        <Stat label="村民注册" value="312 人" />
        <Stat label="贡献值总量" value="48.6 万" />
        <Stat label="链上凭证" value="486 张" />
        <Stat label="在营小店" value="18 家" />
        <Stat label="本月服务费" value="¥ 421" tone="success" />
      </Grid>
      <Callout tone="warning">
        考核完成度 78%，还需上传 2 份推广证明材料，截止本月末。完成后服务费提升至 ¥ 484。
      </Callout>
      <H3>本周趋势</H3>
      <Table
        headers={['日期', '交易额', '新增注册', '新增凭证']}
        rows={[
          ['11/18 周一', '¥ 1,240', '+8 人', '+12 张'],
          ['11/19 周二', '¥ 980', '+3 人', '+9 张'],
          ['11/20 周三', '¥ 1,560', '+12 人', '+18 张'],
          ['11/21 周四', '¥ 820', '+5 人', '+7 张'],
          ['11/22 周五', '¥ 2,100', '+6 人', '+22 张'],
        ]}
      />
    </Stack>
  );
}

function AdminNotices({ theme, notices, setNotices, inputStyle, btnPrimary }: {
  theme: Theme; notices: string[]; setNotices: (v: string[]) => void;
  inputStyle: object; btnPrimary: object;
}) {
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  const publish = () => {
    if (!text.trim()) return;
    setNotices([text.trim(), ...notices]);
    setText('');
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };

  return (
    <Stack gap={20}>
      <Callout tone="info">
        发布后立即出现在村民端首页公告栏（点击可轮播），支持全村推送。
      </Callout>
      <Stack gap={10}>
        <H3>发布新公告</H3>
        <div>
          <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 6 }}>公告内容</Text>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="请输入公告内容，如：本周六上午举办农产品市集，欢迎踊跃参与…"
            style={{ ...inputStyle, marginBottom: 10 }}
          />
          <Row gap={10} align="center">
            <button onClick={publish} style={btnPrimary as React.CSSProperties}>发布公告</button>
            {sent && <Pill tone="success" size="sm">✓ 已发布，村民端已更新</Pill>}
          </Row>
        </div>
      </Stack>
      <Divider />
      <H3>当前公告列表（{notices.length} 条）</H3>
      {notices.map((n, i) => (
        <div key={i} style={{
          padding: '12px 14px', borderRadius: 8,
          background: theme.bg.elevated, border: `1px solid ${theme.stroke.secondary}`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <Text size="small" style={{ flex: 1, color: theme.text.primary }}>{n}</Text>
          <button onClick={() => setNotices(notices.filter((_, j) => j !== i))} style={{
            padding: '4px 10px', borderRadius: 6, border: `1px solid ${theme.stroke.secondary}`,
            background: 'none', color: theme.text.tertiary, cursor: 'pointer', fontSize: 11,
          }}>删除</button>
        </div>
      ))}
    </Stack>
  );
}

function AdminProducts({ theme, pendingProducts, setPendingProducts }: {
  theme: Theme;
  pendingProducts: PendingProduct[];
  setPendingProducts: (v: PendingProduct[]) => void;
}) {
  const setStatus = (id: number, s: PendingProduct['status']) =>
    setPendingProducts(pendingProducts.map(p => p.id === id ? { ...p, status: s } : p));

  const pending = pendingProducts.filter(x => x.status === '待审核').length;

  return (
    <Stack gap={16}>
      {pending > 0 && (
        <Callout tone="warning">
          有 {pending} 件商品待审核。村级审核后平台运营方复核，不影响上架时效。
        </Callout>
      )}
      <div style={{ borderRadius: 8, border: `1px solid ${theme.stroke.secondary}`, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.stroke.secondary}`, background: theme.fill.tertiary }}>
              {['图片', '商品名', '店铺', '单价', '状态', '操作'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: theme.text.secondary }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pendingProducts.map(item => (
              <tr key={item.id} style={{
                borderBottom: `1px solid ${theme.stroke.tertiary}`,
                background: item.status === '待审核' ? `${theme.accent.primary}08` : undefined,
              }}>
                <td style={{ padding: '8px 14px' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 6, overflow: 'hidden',
                    background: theme.fill.secondary,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {item.image
                      ? <img src={item.image} style={{ width: 40, height: 40, objectFit: 'cover', display: 'block' }} alt="" />
                      : <Text size="small" tone="secondary" style={{ fontSize: 14 }}>品</Text>
                    }
                  </div>
                </td>
                <td style={{ padding: '10px 14px', color: theme.text.primary, fontWeight: 600 }}>{item.name}</td>
                <td style={{ padding: '10px 14px', color: theme.text.secondary }}>{item.store}</td>
                <td style={{ padding: '10px 14px', color: theme.text.secondary }}>¥{item.price}/{item.unit}</td>
                <td style={{ padding: '10px 14px' }}>
                  <Pill
                    tone={item.status === '已通过' ? 'success' : item.status === '已驳回' ? 'deleted' : 'warning'}
                    size="sm"
                  >{item.status}</Pill>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {item.status === '待审核' && (
                    <Row gap={8} align="center">
                      <button onClick={() => setStatus(item.id, '已通过')} style={{
                        padding: '4px 12px', borderRadius: 6, border: 'none',
                        background: '#22c55e', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      }}>通过</button>
                      <button onClick={() => setStatus(item.id, '已驳回')} style={{
                        padding: '4px 12px', borderRadius: 6, border: 'none',
                        background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      }}>驳回</button>
                    </Row>
                  )}
                  {item.status !== '待审核' && <Text size="small" tone="secondary">—</Text>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Stack>
  );
}

function AdminJobs({ theme, jobs, setJobs, inputStyle, btnPrimary }: {
  theme: Theme; jobs: Job[]; setJobs: (v: Job[]) => void;
  inputStyle: object; btnPrimary: object;
}) {
  const [form, setForm] = useState({ title: '', company: '', salary: '', type: '临时', count: '1', location: '', deadline: '' });
  const [sent, setSent] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const publish = () => {
    if (!form.title.trim() || !form.salary.trim()) return;
    const newJob: Job = {
      id: Date.now(), title: form.title, company: form.company || '本村',
      salary: form.salary, type: form.type, deadline: form.deadline || '长期',
      count: parseInt(form.count) || 1, location: form.location || '范庄村',
    };
    setJobs([newJob, ...jobs]);
    setForm({ title: '', company: '', salary: '', type: '临时', count: '1', location: '', deadline: '' });
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };

  const selectStyle = { ...inputStyle, height: 36 };

  return (
    <Stack gap={20}>
      <Stack gap={12}>
        <H3>发布新岗位</H3>
        <Callout tone="info">发布后立即显示在村民端"就业招工"页面。</Callout>
        <Grid columns={2} gap={12}>
          <div>
            <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>岗位名称 *</Text>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="如：苹果采摘工" style={inputStyle as React.CSSProperties} />
          </div>
          <div>
            <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>招聘单位</Text>
            <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="如：丰收果园" style={inputStyle as React.CSSProperties} />
          </div>
          <div>
            <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>薪资待遇 *</Text>
            <input value={form.salary} onChange={e => set('salary', e.target.value)} placeholder="如：100元/天" style={inputStyle as React.CSSProperties} />
          </div>
          <div>
            <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>工作性质</Text>
            <select value={form.type} onChange={e => set('type', e.target.value)} style={selectStyle as React.CSSProperties}>
              <option>临时</option><option>兼职</option><option>全职</option>
            </select>
          </div>
          <div>
            <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>招聘人数</Text>
            <input value={form.count} onChange={e => set('count', e.target.value)} placeholder="如：3" style={inputStyle as React.CSSProperties} />
          </div>
          <div>
            <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>工作地点</Text>
            <input value={form.location} onChange={e => set('location', e.target.value)} placeholder="如：范庄村农场" style={inputStyle as React.CSSProperties} />
          </div>
          <div>
            <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>截止日期</Text>
            <input value={form.deadline} onChange={e => set('deadline', e.target.value)} placeholder="如：12月31日" style={inputStyle as React.CSSProperties} />
          </div>
        </Grid>
        <Row gap={10} align="center">
          <button onClick={publish} style={btnPrimary as React.CSSProperties}>发布岗位</button>
          {sent && <Pill tone="success" size="sm">✓ 已发布，村民端已更新</Pill>}
        </Row>
      </Stack>
      <Divider />
      <H3>当前岗位（{jobs.length} 个）</H3>
      <Table
        headers={['岗位', '薪资', '类型', '招聘数', '操作']}
        rows={jobs.map((j, i) => [
          j.title, j.salary, j.type, `${j.count}人`,
          <button key={i} onClick={() => setJobs(jobs.filter((_, k) => k !== i))} style={{
            padding: '3px 10px', borderRadius: 6, border: `1px solid ${theme.stroke.secondary}`,
            background: 'none', color: theme.text.tertiary, cursor: 'pointer', fontSize: 11,
          }}>撤下</button>,
        ])}
      />
    </Stack>
  );
}

function AdminParty({ theme, partyEvents, setPartyEvents, inputStyle, btnPrimary }: {
  theme: Theme; partyEvents: PartyEvent[]; setPartyEvents: (v: PartyEvent[]) => void;
  inputStyle: object; btnPrimary: object;
}) {
  const [form, setForm] = useState({ date: '', title: '', members: '20' });
  const [sent, setSent] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const publish = () => {
    if (!form.title.trim() || !form.date.trim()) return;
    setPartyEvents([{ date: form.date, title: form.title, members: parseInt(form.members) || 20, status: '报名中' }, ...partyEvents]);
    setForm({ date: '', title: '', members: '20' });
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };

  return (
    <Stack gap={20}>
      <Stack gap={12}>
        <H3>发布新活动</H3>
        <Callout tone="info">发布后显示在村民端党建助农页面，状态为"报名中"，村民可报名获得贡献值。</Callout>
        <Grid columns={2} gap={12}>
          <div>
            <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>活动标题 *</Text>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="如：冬季慰问困难群众活动" style={inputStyle as React.CSSProperties} />
          </div>
          <div>
            <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>活动日期 *</Text>
            <input value={form.date} onChange={e => set('date', e.target.value)} placeholder="如：12月15日" style={inputStyle as React.CSSProperties} />
          </div>
          <div>
            <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>预计参与人数</Text>
            <input value={form.members} onChange={e => set('members', e.target.value)} placeholder="如：20" style={inputStyle as React.CSSProperties} />
          </div>
        </Grid>
        <Row gap={10} align="center">
          <button onClick={publish} style={btnPrimary as React.CSSProperties}>发布活动</button>
          {sent && <Pill tone="success" size="sm">✓ 已发布，党建页面已更新</Pill>}
        </Row>
      </Stack>
      <Divider />
      <H3>活动列表（{partyEvents.length} 条）</H3>
      <Table
        headers={['日期', '活动标题', '人数', '状态', '操作']}
        rows={partyEvents.map((ev, i) => [
          ev.date, ev.title, `${ev.members}人`,
          <Pill key={i} tone={ev.status === '已完成' ? 'success' : 'warning'} size="sm">{ev.status}</Pill>,
          <button key={i} onClick={() => setPartyEvents(partyEvents.filter((_, k) => k !== i))} style={{
            padding: '3px 10px', borderRadius: 6, border: `1px solid ${theme.stroke.secondary}`,
            background: 'none', color: theme.text.tertiary, cursor: 'pointer', fontSize: 11,
          }}>删除</button>,
        ])}
      />
    </Stack>
  );
}

function AdminAffairs({ theme, villageAffairs, setVillageAffairs, inputStyle, btnPrimary }: {
  theme: Theme; villageAffairs: VillageAffair[]; setVillageAffairs: (v: VillageAffair[]) => void;
  inputStyle: object; btnPrimary: object;
}) {
  const [form, setForm] = useState({ title: '', category: '财务公开', amount: '' });
  const [sent, setSent] = useState(false);
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`;

  const publish = () => {
    if (!form.title.trim()) return;
    setVillageAffairs([{ date: dateStr, title: form.title, category: form.category, amount: form.amount || '—', tag: '已公示' }, ...villageAffairs]);
    setForm({ title: '', category: '财务公开', amount: '' });
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };

  const selectStyle = { ...inputStyle, height: 36 };

  return (
    <Stack gap={20}>
      <Stack gap={12}>
        <H3>新增公示</H3>
        <Callout tone="info">公示发布后即显示在村民端"村务公开"页面，有助于提升村务透明度。</Callout>
        <Grid columns={2} gap={12}>
          <div style={{ gridColumn: '1 / -1' }}>
            <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>公示标题 *</Text>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="如：2024年冬季农业补贴发放明细" style={inputStyle as React.CSSProperties} />
          </div>
          <div>
            <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>类别</Text>
            <select value={form.category} onChange={e => set('category', e.target.value)} style={selectStyle as React.CSSProperties}>
              <option>财务公开</option><option>工程公示</option><option>民政公示</option><option>组织公开</option>
            </select>
          </div>
          <div>
            <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>涉及金额（可选）</Text>
            <input value={form.amount} onChange={e => set('amount', e.target.value)} placeholder="如：¥3.2万" style={inputStyle as React.CSSProperties} />
          </div>
        </Grid>
        <Row gap={10} align="center">
          <button onClick={publish} style={btnPrimary as React.CSSProperties}>发布公示</button>
          {sent && <Pill tone="success" size="sm">✓ 已发布，村民端已更新</Pill>}
        </Row>
      </Stack>
      <Divider />
      <H3>公示列表（{villageAffairs.length} 条）</H3>
      <Table
        headers={['日期', '标题', '类别', '金额', '操作']}
        rows={villageAffairs.map((a, i) => [
          a.date, a.title, a.category, a.amount,
          <button key={i} onClick={() => setVillageAffairs(villageAffairs.filter((_, k) => k !== i))} style={{
            padding: '3px 10px', borderRadius: 6, border: `1px solid ${theme.stroke.secondary}`,
            background: 'none', color: theme.text.tertiary, cursor: 'pointer', fontSize: 11,
          }}>撤下</button>,
        ])}
      />
    </Stack>
  );
}

function AdminMessages({ theme, inputStyle, btnPrimary }: {
  theme: Theme; inputStyle: object; btnPrimary: object;
}) {
  const [msg, setMsg] = useState('');
  const [target, setTarget] = useState('全村');
  const [sent, setSent] = useState(false);
  const [history, setHistory] = useState([
    { content: '本月25日发放利益共享金', target: '全村', time: '11/20 10:00', read: '214/312 (69%)' },
    { content: '第三届市集报名开始', target: '全村', time: '11/18 09:30', read: '189/312 (61%)' },
    { content: '低保审核通知', target: '特定群体', time: '11/15 14:00', read: '12/18 (67%)' },
  ]);

  const send = () => {
    if (!msg.trim()) return;
    setHistory([{ content: msg, target, time: '刚刚', read: '0/312 (0%)' }, ...history]);
    setMsg('');
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };

  const selectStyle = { ...inputStyle, height: 36 };

  return (
    <Stack gap={20}>
      <Stack gap={12}>
        <H3>发送通知</H3>
        <Callout tone="info">通知以小程序消息推送给目标用户，支持全村、创业者、党员等分组。</Callout>
        <div>
          <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>发送对象</Text>
          <select value={target} onChange={e => setTarget(e.target.value)} style={selectStyle as React.CSSProperties}>
            <option>全村</option><option>创业者</option><option>党员</option><option>低保群体</option>
          </select>
        </div>
        <div>
          <Text size="small" tone="secondary" style={{ display: 'block', marginBottom: 4 }}>通知内容</Text>
          <input value={msg} onChange={e => setMsg(e.target.value)} placeholder="请输入通知内容…" style={inputStyle as React.CSSProperties} />
        </div>
        <Row gap={10} align="center">
          <button onClick={send} style={btnPrimary as React.CSSProperties}>发送通知</button>
          {sent && <Pill tone="success" size="sm">✓ 已发送</Pill>}
        </Row>
      </Stack>
      <Divider />
      <H3>发送记录</H3>
      <Table
        headers={['通知内容', '对象', '发送时间', '已读率']}
        rows={history.map(h => [h.content, h.target, h.time, h.read])}
      />
    </Stack>
  );
}

function AdminAssessment({ theme }: { theme: Theme }) {
  return (
    <Stack gap={16}>
      <H3>本月考核进度</H3>
      <Table
        headers={['考核项', '要求', '完成情况', '状态']}
        rows={[
          ['组织培训', '≥1次/月', '已完成 1 次', '✓ 达标'],
          ['推广证明', '≥5份', '已上传 3 份', '⚠ 进行中'],
          ['活动照片', '≥2次', '已上传 2 次', '✓ 达标'],
          ['新增注册', '≥10人', '本月 +14 人', '✓ 达标'],
        ]}
        rowTone={[undefined, 'warning', undefined, undefined]}
      />
      <div style={{ padding: '12px', borderRadius: 8, background: theme.fill.tertiary }}>
        <Text size="small" tone="secondary">
          考核系数当前预估：0.87。完成全部考核项可获系数 1.00，本月预计服务费提升至 ¥ 484。
        </Text>
      </div>
      <Callout tone="warning">
        还需上传 2 份推广证明（截图/活动照片），截止日期本月末。
      </Callout>
    </Stack>
  );
}

function AdminEntrepreneurs({ theme }: { theme: Theme }) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const totalGmv = VILLAGE_ENTREPRENEURS.reduce((s, e) => s + e.monthGmv, 0);
  const totalCommission = VILLAGE_ENTREPRENEURS.reduce((s, e) => s + e.monthCommission, 0);
  const totalDownlines = VILLAGE_ENTREPRENEURS.reduce((s, e) => s + e.downlines.length, 0);

  return (
    <Stack gap={20}>
      <Grid columns={3} gap={16}>
        <Stat label="本村创业者" value={`${VILLAGE_ENTREPRENEURS.length} 人`} />
        <Stat label="绑定下级总数" value={`${totalDownlines} 人`} tone="success" />
        <Stat label="本月佣金发放" value={`¥${totalCommission}`} tone="success" />
      </Grid>
      <Callout tone="info">
        创业者可无限邀请下级，但下级不可再邀请（一层限制）。下级每笔成交，上级自动获得成交额 1% 返佣，T+15 结算。
      </Callout>

      <H3>本月本村 GMV 合计：¥{totalGmv.toLocaleString()}</H3>
      <Table
        headers={['姓名', '等级', '本月 GMV', '绑定下级', '佣金发放']}
        rows={VILLAGE_ENTREPRENEURS.map(e => [
          e.name,
          e.level,
          `¥${e.monthGmv.toLocaleString()}`,
          `${e.downlines.length} 人`,
          `¥${e.monthCommission}`,
        ])}
      />

      <H3>邀请关系树（点击展开）</H3>
      {VILLAGE_ENTREPRENEURS.map(e => (
        <div key={e.id} style={{
          borderRadius: 10, border: `1px solid ${theme.stroke.secondary}`,
          background: theme.bg.elevated, marginBottom: 12, overflow: 'hidden',
        }}>
          {/* Entrepreneur row */}
          <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
              background: `${theme.accent.primary}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: theme.accent.primary, fontWeight: 700, fontSize: 15,
            }}>{e.name[0]}</div>
            <Stack gap={4} style={{ flex: 1 }}>
              <Row gap={8} align="center">
                <Text style={{ fontWeight: 600, color: theme.text.primary }}>{e.name}</Text>
                <Pill tone="info" size="sm">{e.level}</Pill>
                {e.downlines.length > 0 && (
                  <Pill tone="success" size="sm">下级 {e.downlines.length} 人</Pill>
                )}
              </Row>
              <Text size="small" tone="secondary">{e.phone}</Text>
            </Stack>
            <Stack gap={2} style={{ textAlign: 'right', marginRight: 10 }}>
              <Text size="small" style={{ fontWeight: 700, color: theme.accent.primary }}>¥{e.monthGmv.toLocaleString()}</Text>
              <Text size="small" tone="secondary" style={{ fontSize: 10 }}>佣金 ¥{e.monthCommission}</Text>
            </Stack>
            <button
              onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
              style={{
                padding: '4px 12px', borderRadius: 6,
                border: `1px solid ${expandedId === e.id ? theme.accent.primary : theme.stroke.secondary}`,
                background: expandedId === e.id ? `${theme.accent.primary}15` : 'none',
                color: expandedId === e.id ? theme.accent.primary : theme.text.secondary,
                cursor: 'pointer', fontSize: 12,
              }}
            >{expandedId === e.id ? '收起' : '下级树'}</button>
          </div>

          {/* Expanded downline tree */}
          {expandedId === e.id && (
            <div style={{
              borderTop: `1px solid ${theme.stroke.tertiary}`,
              padding: '10px 14px 12px',
              background: theme.fill.tertiary,
            }}>
              {e.downlines.length === 0 ? (
                <Text size="small" tone="secondary">该创业者暂无下级绑定</Text>
              ) : (
                <>
                  <Row gap={8} align="center" style={{ marginBottom: 8 }}>
                    <div style={{ width: 2, height: 20, background: theme.stroke.secondary, borderRadius: 1, marginLeft: 19 }} />
                    <Text size="small" style={{ color: theme.text.tertiary, fontSize: 10 }}>
                      一级下级（{e.downlines.length} 人）· 不可再邀请
                    </Text>
                  </Row>
                  {e.downlines.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 6 }}>
                      {/* Tree connector */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                        <div style={{ width: 2, height: 12, background: theme.stroke.secondary }} />
                        <div style={{ width: 12, height: 2, background: theme.stroke.secondary, marginLeft: 10 }} />
                      </div>
                      <div style={{
                        flex: 1, padding: '8px 12px', borderRadius: 8,
                        border: `1px solid ${theme.stroke.tertiary}`,
                        background: theme.bg.elevated,
                        display: 'flex', alignItems: 'center', gap: 10,
                      }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          background: theme.fill.secondary,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: theme.text.secondary, fontSize: 11,
                        }}>{d.name[0]}</div>
                        <Text size="small" style={{ flex: 1, color: theme.text.primary, fontWeight: 500 }}>{d.name}</Text>
                        <Text size="small" tone="secondary">{d.phone}</Text>
                        <Text size="small" style={{ color: theme.accent.primary, fontWeight: 600 }}>GMV ¥{d.gmv}</Text>
                        <Text size="small" tone="secondary" style={{ fontSize: 10 }}>
                          → 返 ¥{(d.gmv * 0.01).toFixed(2)}
                        </Text>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      ))}
    </Stack>
  );
}

// ── Platform Backend ─────────────────────────────────────────────────────────

type PlatformSection = '概览' | '申请管理' | '商品复核' | '创业者管理' | '分润配置';
const PLATFORM_NAV: { id: PlatformSection; icon: string }[] = [
  { id: '概览', icon: '▦' },
  { id: '申请管理', icon: '◉' },
  { id: '商品复核', icon: '✓' },
  { id: '创业者管理', icon: '◑' },
  { id: '分润配置', icon: '⊕' },
];
const PERMISSION_OPTIONS = ['发布公告', '商品初审', '就业发布', '党建活动', '村务公开', '消息推送'];

function PlatformBackend({ theme, mode, onToggle, onExit, villageAdminApps, setVillageAdminApps }: {
  theme: Theme; mode: 'dark' | 'light'; onToggle: () => void; onExit: () => void;
  villageAdminApps: VillageAdminApp[]; setVillageAdminApps: (v: VillageAdminApp[]) => void;
}) {
  const [section, setSection] = useState<PlatformSection>('申请管理');
  const pendingCount = villageAdminApps.filter(a => a.status === '待审批').length;

  return (
    <div style={{ display: 'flex', height: '100vh', background: theme.bg.chrome, overflow: 'hidden' }}>
      <div style={{
        width: 200, flexShrink: 0, background: theme.bg.elevated,
        borderRight: `1px solid ${theme.stroke.secondary}`,
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: `1px solid ${theme.stroke.tertiary}` }}>
          <Text style={{ fontWeight: 700, fontSize: 14, color: theme.accent.primary, display: 'block' }}>供享村社</Text>
          <Text size="small" tone="secondary">平台运营商后台</Text>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {PLATFORM_NAV.map(item => (
            <button key={item.id} onClick={() => setSection(item.id)} style={{
              width: '100%', padding: '10px 16px', border: 'none', cursor: 'pointer',
              background: section === item.id ? `${theme.accent.primary}20` : 'none',
              borderLeft: `3px solid ${section === item.id ? theme.accent.primary : 'transparent'}`,
              display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
            }}>
              <span style={{ fontSize: 14, color: section === item.id ? theme.accent.primary : theme.text.tertiary }}>{item.icon}</span>
              <Text size="small" style={{
                color: section === item.id ? theme.accent.primary : theme.text.secondary,
                fontWeight: section === item.id ? 600 : 400, flex: 1,
              }}>{item.id}</Text>
              {item.id === '申请管理' && pendingCount > 0 && (
                <span style={{
                  background: '#ef4444', color: '#fff', borderRadius: '50%',
                  width: 18, height: 18, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0,
                }}>{pendingCount}</span>
              )}
            </button>
          ))}
        </div>
        <div style={{ padding: '12px', borderTop: `1px solid ${theme.stroke.tertiary}` }}>
          <button onClick={onExit} style={{
            width: '100%', padding: '8px', borderRadius: 8, border: `1px solid ${theme.stroke.secondary}`,
            background: 'none', color: theme.text.secondary, cursor: 'pointer', fontSize: 12,
          }}>← 返回村民端</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Stack gap={2}>
            <H2>{section}</H2>
            <Text tone="secondary" size="small">供享村社 · 平台运营方</Text>
          </Stack>
          <button onClick={onToggle} style={{
            padding: '6px 14px', borderRadius: 20, border: `1px solid ${theme.stroke.secondary}`,
            background: theme.bg.elevated, color: theme.text.secondary, cursor: 'pointer', fontSize: 12,
          }}>{mode === 'dark' ? '切换浅色' : '切换深色'}</button>
        </div>
        {section === '概览' && <PlatformDashboard theme={theme} apps={villageAdminApps} />}
        {section === '申请管理' && <PlatformApps theme={theme} apps={villageAdminApps} setApps={setVillageAdminApps} />}
        {section === '商品复核' && <PlatformProductReview theme={theme} />}
        {section === '创业者管理' && <PlatformEntrepreneurs theme={theme} />}
        {section === '分润配置' && <PlatformCommissionConfig theme={theme} />}
      </div>
    </div>
  );
}

function PlatformDashboard({ theme, apps }: { theme: Theme; apps: VillageAdminApp[] }) {
  return (
    <Stack gap={20}>
      <Grid columns={4} gap={16}>
        <Stat label="接入村庄" value="8 个" />
        <Stat label="注册用户" value="2,460 人" tone="success" />
        <Stat label="本月 GMV" value="¥14.28 万" tone="success" />
        <Stat label="待审批申请" value={`${apps.filter(a => a.status === '待审批').length} 份`}
          tone={apps.some(a => a.status === '待审批') ? 'warning' : undefined} />
      </Grid>
      <Callout tone="info">
        平台运营商审批通过后，服务中心管理员可激活对应村庄的管理权限，开始初审商品、发布内容。
      </Callout>
      <H3>各村接入状态</H3>
      <Table
        headers={['村庄', '乡镇', '管理员', '接入状态', '本月交易额']}
        rows={[
          ['范庄村', '方城乡', '范书记', '已激活', '¥8,420'],
          ['李庄村', '方城乡', '王建平', '已激活', '¥5,120'],
          ['赵庄村', '方城乡', '—', '申请中', '—'],
          ['刘庄村', '方城乡', '—', '申请中', '—'],
          ['张庄村', '方城乡', '—', '已拒绝', '—'],
          ['孙庄村', '方城乡', '—', '未接入', '—'],
          ['王庄村', '方城乡', '—', '未接入', '—'],
          ['陈庄村', '方城乡', '—', '未接入', '—'],
        ]}
        rowTone={[undefined, undefined, 'warning', 'warning', 'warning', undefined, undefined, undefined]}
      />
    </Stack>
  );
}

function PlatformApps({ theme, apps, setApps }: {
  theme: Theme; apps: VillageAdminApp[]; setApps: (v: VillageAdminApp[]) => void;
}) {
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  const startApprove = (id: number) => {
    setApprovingId(id);
    setSelectedPerms(['发布公告', '商品初审', '就业发布', '党建活动', '村务公开']);
  };
  const confirmApprove = () => {
    if (approvingId === null) return;
    setApps(apps.map(a => a.id === approvingId ? { ...a, status: '已批准', permissions: selectedPerms } : a));
    setApprovingId(null);
    setSelectedPerms([]);
  };
  const reject = (id: number) => setApps(apps.map(a => a.id === id ? { ...a, status: '已拒绝' } : a));
  const togglePerm = (p: string) =>
    setSelectedPerms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]);

  const approved = apps.filter(a => a.status === '已批准');
  const pending = apps.filter(a => a.status === '待审批').length;
  const approvingApp = approvingId !== null ? (apps.find(a => a.id === approvingId) ?? null) : null;

  return (
    <Stack gap={20}>
      {pending > 0 && (
        <Callout tone="warning">
          有 {pending} 份服务中心申请待审批。通过后申请人将获得对应村庄管理权限，可开始初审商品、发布内容。
        </Callout>
      )}

      <H3>申请列表（{apps.length} 份）</H3>
      <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${theme.stroke.secondary}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.stroke.secondary}`, background: theme.fill.tertiary }}>
              {['申请人', '村庄', '乡镇', '联系方式', '申请日期', '状态', '操作'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: theme.text.secondary }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {apps.map(app => (
              <tr key={app.id} style={{
                borderBottom: `1px solid ${theme.stroke.tertiary}`,
                background: app.status === '待审批' ? `${theme.accent.primary}08` : undefined,
              }}>
                <td style={{ padding: '10px 14px', color: theme.text.primary, fontWeight: 600 }}>{app.name}</td>
                <td style={{ padding: '10px 14px', color: theme.text.secondary }}>{app.village}</td>
                <td style={{ padding: '10px 14px', color: theme.text.secondary }}>{app.township}</td>
                <td style={{ padding: '10px 14px', color: theme.text.secondary }}>{app.phone}</td>
                <td style={{ padding: '10px 14px', color: theme.text.secondary }}>{app.applyDate}</td>
                <td style={{ padding: '10px 14px' }}>
                  <Pill tone={app.status === '已批准' ? 'success' : app.status === '已拒绝' ? 'deleted' : 'warning'} size="sm">
                    {app.status}
                  </Pill>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {app.status === '待审批' && (
                    <Row gap={8} align="center">
                      <button onClick={() => startApprove(app.id)} style={{
                        padding: '4px 12px', borderRadius: 6, border: 'none',
                        background: '#22c55e', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      }}>批准</button>
                      <button onClick={() => reject(app.id)} style={{
                        padding: '4px 12px', borderRadius: 6, border: 'none',
                        background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      }}>拒绝</button>
                    </Row>
                  )}
                  {app.status === '已批准' && (
                    <Text size="small" style={{ color: theme.accent.primary }}>{app.permissions.length} 项权限</Text>
                  )}
                  {app.status === '已拒绝' && <Text size="small" tone="secondary">—</Text>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Permission grant panel */}
      {approvingApp && (
        <div style={{
          padding: 20, borderRadius: 12, background: theme.bg.elevated,
          border: `2px solid ${theme.accent.primary}`,
        }}>
          <Row gap={12} align="center" style={{ marginBottom: 16 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: theme.accent.primary,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: theme.text.onAccent, fontWeight: 700, fontSize: 18,
            }}>{approvingApp.name[0]}</div>
            <Stack gap={2}>
              <Text style={{ fontWeight: 700, color: theme.text.primary }}>审批：{approvingApp.name} · {approvingApp.village}</Text>
              <Text size="small" tone="secondary">{approvingApp.township} · {approvingApp.appliedRole}</Text>
            </Stack>
          </Row>
          <Text style={{ fontWeight: 600, fontSize: 13, color: theme.text.primary, display: 'block', marginBottom: 10 }}>
            授予权限（可自定义勾选）
          </Text>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 16 }}>
            {PERMISSION_OPTIONS.map(perm => {
              const checked = selectedPerms.includes(perm);
              return (
                <label key={perm} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                  border: `1px solid ${checked ? theme.accent.primary : theme.stroke.secondary}`,
                  background: checked ? `${theme.accent.primary}18` : theme.fill.tertiary,
                  transition: 'all 0.15s',
                }}>
                  <input type="checkbox" checked={checked} onChange={() => togglePerm(perm)}
                    style={{ width: 14, height: 14, accentColor: theme.accent.primary, flexShrink: 0 }} />
                  <Text size="small" style={{ color: checked ? theme.accent.primary : theme.text.secondary }}>
                    {perm}
                  </Text>
                </label>
              );
            })}
          </div>
          <Row gap={12} align="center">
            <button onClick={confirmApprove} style={{
              padding: '9px 28px', borderRadius: 8, border: 'none',
              background: theme.accent.primary, color: theme.text.onAccent,
              cursor: 'pointer', fontSize: 13, fontWeight: 600,
            }}>确认批准</button>
            <button onClick={() => { setApprovingId(null); setSelectedPerms([]); }} style={{
              padding: '9px 20px', borderRadius: 8, border: `1px solid ${theme.stroke.secondary}`,
              background: 'none', color: theme.text.secondary, cursor: 'pointer', fontSize: 13,
            }}>取消</button>
            <Text size="small" tone="secondary">已选 {selectedPerms.length} / {PERMISSION_OPTIONS.length} 项权限</Text>
          </Row>
        </div>
      )}

      {approved.length > 0 && (
        <>
          <Divider />
          <H3>已批准管理员（{approved.length} 人）</H3>
          {approved.map(app => (
            <div key={app.id} style={{
              padding: '14px 16px', borderRadius: 10, marginBottom: 8,
              border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated,
            }}>
              <Row gap={12} align="center">
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: '#22c55e22',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#22c55e', fontWeight: 700, fontSize: 15,
                }}>{app.name[0]}</div>
                <Stack gap={4} style={{ flex: 1 }}>
                  <Row gap={8} align="center">
                    <Text style={{ fontWeight: 600, color: theme.text.primary }}>{app.name}</Text>
                    <Text size="small" tone="secondary">· {app.village}</Text>
                    <Pill tone="success" size="sm">已激活</Pill>
                  </Row>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {app.permissions.map(p => (
                      <span key={p} style={{
                        padding: '2px 8px', borderRadius: 12, fontSize: 11,
                        background: `${theme.accent.primary}20`, color: theme.accent.primary,
                      }}>{p}</span>
                    ))}
                  </div>
                </Stack>
              </Row>
            </div>
          ))}
        </>
      )}
    </Stack>
  );
}

function PlatformProductReview({ theme }: { theme: Theme }) {
  type PRStatus = '村级初审通过' | '平台已复核' | '平台已驳回';
  const [items, setItems] = useState<{ name: string; store: string; village: string; status: PRStatus }[]>([
    { name: '黑花生 500g', store: '王老五农场', village: '范庄村', status: '村级初审通过' },
    { name: '手工挂面', store: '陈大婶面坊', village: '李庄村', status: '村级初审通过' },
    { name: '土蜂蜜', store: '山顶蜂场', village: '范庄村', status: '平台已复核' },
    { name: '芝麻油', store: '刘记油坊', village: '李庄村', status: '平台已驳回' },
  ]);
  const setStatus = (i: number, s: PRStatus) =>
    setItems(items.map((it, j) => j === i ? { ...it, status: s } : it));
  const pending = items.filter(x => x.status === '村级初审通过').length;

  return (
    <Stack gap={16}>
      {pending > 0 && <Callout tone="warning">有 {pending} 件商品经村级初审通过，等待平台复核后正式上架。</Callout>}
      <div style={{ overflowX: 'auto', borderRadius: 8, border: `1px solid ${theme.stroke.secondary}` }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ background: theme.fill.tertiary, borderBottom: `1px solid ${theme.stroke.secondary}` }}>
              {['商品名', '店铺', '所属村', '状态', '操作'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: theme.text.secondary }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{
                borderBottom: `1px solid ${theme.stroke.tertiary}`,
                background: item.status === '村级初审通过' ? `${theme.accent.primary}08` : undefined,
              }}>
                <td style={{ padding: '10px 14px', color: theme.text.primary, fontWeight: 600 }}>{item.name}</td>
                <td style={{ padding: '10px 14px', color: theme.text.secondary }}>{item.store}</td>
                <td style={{ padding: '10px 14px', color: theme.text.secondary }}>{item.village}</td>
                <td style={{ padding: '10px 14px' }}>
                  <Pill tone={item.status === '平台已复核' ? 'success' : item.status === '平台已驳回' ? 'deleted' : 'warning'} size="sm">
                    {item.status}
                  </Pill>
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {item.status === '村级初审通过' && (
                    <Row gap={8} align="center">
                      <button onClick={() => setStatus(i, '平台已复核')} style={{
                        padding: '4px 12px', borderRadius: 6, border: 'none',
                        background: '#22c55e', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      }}>复核通过</button>
                      <button onClick={() => setStatus(i, '平台已驳回')} style={{
                        padding: '4px 12px', borderRadius: 6, border: 'none',
                        background: '#ef4444', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      }}>驳回</button>
                    </Row>
                  )}
                  {item.status !== '村级初审通过' && <Text size="small" tone="secondary">—</Text>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Stack>
  );
}

function PlatformEntrepreneurs({ theme }: { theme: Theme }) {
  const allRows = [
    { name: '范村民', village: '范庄村', level: 'Lv.3', downlines: 5, monthGmv: 2840, totalGmv: 8420, commission: 128.50 },
    { name: '王建国', village: '李庄村', level: 'Lv.2', downlines: 3, monthGmv: 1540, totalGmv: 5100, commission: 76.50 },
    { name: '李大壮', village: '范庄村', level: 'Lv.2', downlines: 2, monthGmv: 1260, totalGmv: 4200, commission: 63.00 },
    { name: '陈秀英', village: '范庄村', level: 'Lv.1', downlines: 0, monthGmv: 480,  totalGmv: 1200, commission: 18.00 },
    { name: '张建辉', village: '李庄村', level: 'Lv.1', downlines: 1, monthGmv: 320,  totalGmv: 860,  commission: 12.90 },
    { name: '吴美丽', village: '李庄村', level: 'Lv.1', downlines: 0, monthGmv: 210,  totalGmv: 520,  commission: 7.80  },
  ].sort((a, b) => b.totalGmv - a.totalGmv);

  const rankColor = (i: number) =>
    i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#b87333' : theme.text.tertiary;
  const rankLabel = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `${i + 1}`;

  return (
    <Stack gap={20}>
      <Grid columns={4} gap={16}>
        <Stat label="全平台创业者" value="14 人" />
        <Stat label="绑定下级合计" value="23 人" tone="success" />
        <Stat label="本月创业者 GMV" value={`¥${allRows.reduce((s, r) => s + r.monthGmv, 0).toLocaleString()}`} tone="success" />
        <Stat label="本月佣金发放" value={`¥${allRows.reduce((s, r) => s + r.commission, 0).toFixed(0)}`} tone="success" />
      </Grid>
      <Callout tone="info">
        每位创业者最多绑定一层下级（无限人数），下级不可再邀请。下级成交时上级获 1% 返佣，直销获 5% 佣金，T+15 结算。
      </Callout>

      <H3>全平台创业者排行（按累计 GMV）</H3>
      <div style={{ borderRadius: 8, border: `1px solid ${theme.stroke.secondary}`, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap' }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.stroke.secondary}`, background: theme.fill.tertiary }}>
              {['排名', '姓名', '村庄', '等级', '绑定下级', '本月 GMV', '累计 GMV', '累计佣金'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: theme.text.secondary }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allRows.map((e, i) => (
              <tr key={i} style={{
                borderBottom: `1px solid ${theme.stroke.tertiary}`,
                background: i === 0 ? `${theme.accent.primary}08` : undefined,
              }}>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontWeight: i < 3 ? 700 : 400, color: rankColor(i), fontSize: i < 3 ? 16 : 13 }}>
                    {rankLabel(i)}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', color: theme.text.primary, fontWeight: 600 }}>{e.name}</td>
                <td style={{ padding: '10px 14px', color: theme.text.secondary }}>{e.village}</td>
                <td style={{ padding: '10px 14px' }}>
                  <Pill tone={e.level === 'Lv.3' ? 'warning' : e.level === 'Lv.2' ? 'info' : undefined} size="sm">{e.level}</Pill>
                </td>
                <td style={{ padding: '10px 14px', color: theme.text.secondary }}>{e.downlines} 人</td>
                <td style={{ padding: '10px 14px', color: theme.text.primary }}>¥{e.monthGmv.toLocaleString()}</td>
                <td style={{ padding: '10px 14px', color: theme.accent.primary, fontWeight: 700 }}>¥{e.totalGmv.toLocaleString()}</td>
                <td style={{ padding: '10px 14px', color: theme.text.secondary }}>¥{e.commission.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Stack>
  );
}

function PlatformCommissionConfig({ theme }: { theme: Theme }) {
  const [directRate, setDirectRate] = useState(5);
  const [inviteRate, setInviteRate] = useState(1);
  const [townshipRate, setTownshipRate] = useState(0.3);
  const [villageRate, setVillageRate] = useState(0.5);
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2200); };

  // All payout rates from a ¥100 transaction
  const platformCut = parseFloat((100 - directRate - inviteRate - townshipRate - villageRate).toFixed(2));

  const sliderStyle = (accentColor: string) => ({
    width: '100%', accentColor, cursor: 'pointer',
  } as const);

  return (
    <Stack gap={20}>
      <Callout tone="warning">
        比例调整后次日 0 点生效，不影响存量订单结算。建议修改前充分评估对各层级激励的影响。
      </Callout>

      <H3>创业者佣金比例</H3>
      <div style={{ padding: 20, borderRadius: 12, border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated }}>
        {[
          { label: '直销佣金率', desc: '创业者自身销售商品所得（成交额占比）', value: directRate, set: setDirectRate, min: 1, max: 15, step: 0.5, color: theme.accent.primary },
          { label: '一级邀请返佣率', desc: '下级成交额中上级可得比例', value: inviteRate, set: setInviteRate, min: 0.5, max: 5, step: 0.5, color: '#22c55e' },
        ].map(({ label, desc, value, set, min, max, step, color }) => (
          <div key={label} style={{ marginBottom: 22 }}>
            <Row gap={8} align="center" style={{ marginBottom: 6 }}>
              <Stack gap={1} style={{ flex: 1 }}>
                <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>{label}</Text>
                <Text size="small" tone="secondary" style={{ fontSize: 10 }}>{desc}</Text>
              </Stack>
              <Text style={{ fontWeight: 800, fontSize: 20, color, width: 54, textAlign: 'right' }}>{value}%</Text>
            </Row>
            <input
              type="range" min={min} max={max} step={step} value={value}
              onChange={e => set(parseFloat(e.target.value))}
              style={sliderStyle(color)}
            />
            <Row gap={0} align="center" style={{ marginTop: 3 }}>
              <Text size="small" tone="secondary" style={{ fontSize: 10 }}>最低 {min}%</Text>
              <div style={{ flex: 1 }} />
              <Text size="small" tone="secondary" style={{ fontSize: 10 }}>上限 {max}%</Text>
            </Row>
          </div>
        ))}
      </div>

      <H3>运营层级费率</H3>
      <div style={{ padding: 20, borderRadius: 12, border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated }}>
        {[
          { label: '运营中心（乡镇）服务费率', desc: '按辖区总成交额比例提取', value: townshipRate, set: setTownshipRate, min: 0.1, max: 2, step: 0.1, color: '#f59e0b' },
          { label: '服务中心（村）服务费率', desc: '按本村总成交额比例提取', value: villageRate, set: setVillageRate, min: 0.1, max: 3, step: 0.1, color: '#f59e0b' },
        ].map(({ label, desc, value, set, min, max, step, color }) => (
          <div key={label} style={{ marginBottom: 22 }}>
            <Row gap={8} align="center" style={{ marginBottom: 6 }}>
              <Stack gap={1} style={{ flex: 1 }}>
                <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>{label}</Text>
                <Text size="small" tone="secondary" style={{ fontSize: 10 }}>{desc}</Text>
              </Stack>
              <Text style={{ fontWeight: 800, fontSize: 20, color, width: 54, textAlign: 'right' }}>{value}%</Text>
            </Row>
            <input
              type="range" min={min} max={max} step={step} value={value}
              onChange={e => set(parseFloat(e.target.value))}
              style={sliderStyle(color)}
            />
          </div>
        ))}
      </div>

      <H3>分润结构实时预览（以 ¥100 成交额为例）</H3>
      <div style={{ borderRadius: 10, border: `1px solid ${theme.stroke.secondary}`, overflow: 'hidden' }}>
        {[
          { layer: '创业者直销佣金', amount: directRate, color: theme.accent.primary },
          { layer: '上级邀请返佣', amount: inviteRate, color: '#22c55e' },
          { layer: '运营中心（乡镇）', amount: townshipRate, color: '#f59e0b' },
          { layer: '服务中心（村）', amount: villageRate, color: '#f59e0b' },
          { layer: '平台留存（供享村社）', amount: platformCut, color: theme.text.secondary },
        ].map((row, i) => (
          <div key={i} style={{
            padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 12,
            borderBottom: i < 4 ? `1px solid ${theme.stroke.tertiary}` : 'none',
            background: i === 4 ? theme.fill.tertiary : undefined,
          }}>
            <div style={{ width: 4, height: 22, borderRadius: 2, background: row.color, flexShrink: 0, opacity: 0.8 }} />
            <Text size="small" style={{ flex: 1, color: theme.text.primary }}>{row.layer}</Text>
            <div style={{
              height: 6, width: Math.max(row.amount, 0) * 3, maxWidth: 200,
              borderRadius: 3, background: row.color, opacity: 0.6,
              transition: 'width 0.3s ease',
            }} />
            <Text size="small" style={{ fontWeight: 700, color: row.color, width: 52, textAlign: 'right' }}>¥{row.amount.toFixed(2)}</Text>
          </div>
        ))}
      </div>

      <Row gap={12} align="center">
        <button onClick={handleSave} style={{
          padding: '9px 28px', borderRadius: 8, border: 'none',
          background: theme.accent.primary, color: theme.text.onAccent,
          cursor: 'pointer', fontSize: 13, fontWeight: 600,
        }}>保存配置</button>
        {saved && <Pill tone="success" size="sm">✓ 已保存，次日 0 点生效</Pill>}
        <div style={{ flex: 1 }} />
        <Text size="small" tone="secondary">结算周期：T+15</Text>
      </Row>

      <div style={{ padding: '14px 16px', borderRadius: 10, background: theme.fill.tertiary, border: `1px solid ${theme.stroke.secondary}` }}>
        <Text size="small" style={{ fontWeight: 600, color: theme.text.primary, display: 'block', marginBottom: 8 }}>
          防刷机制（系统内置，不可关闭）
        </Text>
        {[
          '退货退款时佣金同步扣回，防止先下单后退款套佣金',
          '贡献值 T+30 确权：30 天内无退货才确认上链生成凭证',
          '同一手机号或设备每天最多绑定 1 位下级',
          '单日成交额 > ¥5,000 自动触发人工复核',
          '邀请关系一经绑定不可更改，避免反复切换刷佣',
        ].map((t, i) => (
          <Row key={i} gap={6} align="start" style={{ marginBottom: 4 }}>
            <Text size="small" style={{ color: theme.accent.primary, flexShrink: 0 }}>·</Text>
            <Text size="small" tone="secondary">{t}</Text>
          </Row>
        ))}
      </div>
    </Stack>
  );
}

// ── 通用返回头 ───────────────────────────────────────────────────────────────

function BackHeader({ theme, title, subtitle, onBack, accent }: {
  theme: Theme; title: string; subtitle?: string; onBack: () => void; accent?: string;
}) {
  return (
    <div style={{
      padding: '12px 16px', background: theme.bg.elevated,
      borderBottom: `1px solid ${theme.stroke.tertiary}`,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <button onClick={onBack} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: accent ?? theme.accent.primary, fontSize: 20, lineHeight: 1, padding: 0,
      }}>‹</button>
      <Stack gap={1}>
        <Text style={{ fontWeight: 700, fontSize: 15, color: theme.text.primary }}>{title}</Text>
        {subtitle && <Text size="small" tone="secondary" style={{ fontSize: 11 }}>{subtitle}</Text>}
      </Stack>
    </div>
  );
}

// ── 贡献体系（全周期社会贡献） ────────────────────────────────────────────────

function ContributionScreen({ theme, onBack }: { theme: Theme; onBack: () => void }) {
  const total = CONTRIB_TOTAL;
  const certificates = Math.floor(total / 1000);
  const toNext = 1000 - (total % 1000);
  const maxDim = Math.max(...CONTRIB_DIMENSIONS.map(d => d.value));

  return (
    <Stack gap={0}>
      <BackHeader theme={theme} title="贡献体系" subtitle="价值纽带 · 全周期社会贡献" onBack={onBack} />
      <div style={{ padding: '12px 16px 0' }}>
        {/* 核心规则 */}
        <div style={{
          padding: '12px 14px', borderRadius: 12, marginBottom: 14,
          background: 'linear-gradient(135deg, #c0392b, #e2603f)', color: '#fff',
        }}>
          <Row gap={6} align="center" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: '#ffffff2e', borderRadius: 99, padding: '2px 8px' }}>核心规则</span>
            <Text style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>社会贡献，唯一标尺</Text>
          </Row>
          <Text style={{ fontSize: 11, color: '#ffffffe0', lineHeight: 1.55 }}>
            以行为对村集体的公共价值、社会效益为唯一计量依据，不以个人经济投入、财富规模为评判标准。
          </Text>
        </div>

        {/* 我的贡献概览 */}
        <div style={{
          padding: '14px', borderRadius: 12, marginBottom: 16,
          border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated,
        }}>
          <Row gap={16} align="center">
            <Stack gap={2}>
              <Text style={{ fontWeight: 700, fontSize: 24, color: theme.accent.primary, lineHeight: 1 }}>{total}</Text>
              <Text size="small" tone="secondary">我的累计贡献值</Text>
            </Stack>
            <div style={{ width: 1, height: 36, background: theme.stroke.secondary }} />
            <Stack gap={2}>
              <Text style={{ fontWeight: 700, fontSize: 24, color: theme.text.primary, lineHeight: 1 }}>{certificates}</Text>
              <Text size="small" tone="secondary">链上数据凭证</Text>
            </Stack>
          </Row>
          <div style={{ height: 6, borderRadius: 3, background: theme.fill.secondary, marginTop: 12 }}>
            <div style={{ width: `${(total % 1000) / 10}%`, height: '100%', borderRadius: 3, background: theme.accent.primary }} />
          </div>
          <Text size="small" tone="secondary" style={{ marginTop: 6, display: 'block', fontSize: 11 }}>
            每累计 1000 贡献值自动生成 1 张链上凭证 · 距下一次上链还需 {toNext} 贡献值
          </Text>
        </div>

        {/* 共建：贡献维度 */}
        <Row gap={6} align="center" style={{ marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: theme.accent.primary }}>「共建」</span>
          <Text style={{ fontWeight: 700, fontSize: 14, color: theme.text.primary }}>贡献维度</Text>
          <Text size="small" tone="secondary" style={{ fontSize: 11 }}>覆盖全生命周期</Text>
        </Row>
      </div>

      <div style={{ padding: '8px 16px 0' }}>
        {CONTRIB_DIMENSIONS.map(d => (
          <div key={d.key} style={{
            borderRadius: 12, border: `1px solid ${theme.stroke.secondary}`,
            background: theme.bg.elevated, marginBottom: 10, padding: '12px 14px',
            borderLeft: `3px solid ${d.accent}`,
          }}>
            <Row gap={10} align="center">
              <div style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                background: `${d.accent}1f`, color: d.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17,
              }}>{d.icon}</div>
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Row gap={6} align="center">
                  <Text style={{ fontWeight: 700, fontSize: 14, color: theme.text.primary }}>{d.name}</Text>
                  <Text size="small" tone="secondary" style={{ fontSize: 10 }}>{d.tagline}</Text>
                </Row>
                <Text size="small" style={{ color: d.accent, fontWeight: 700 }}>{d.value} 贡献值</Text>
              </Stack>
            </Row>
            <Row gap={6} align="center" wrap style={{ marginTop: 8 }}>
              {d.behaviors.map(b => (
                <span key={b} style={{
                  fontSize: 10, color: theme.text.secondary, background: theme.fill.secondary,
                  borderRadius: 99, padding: '2px 8px',
                }}>{b}</span>
              ))}
            </Row>
            <div style={{ height: 4, borderRadius: 2, background: theme.fill.secondary, marginTop: 10 }}>
              <div style={{ width: `${(d.value / maxDim) * 100}%`, height: '100%', borderRadius: 2, background: d.accent }} />
            </div>
          </div>
        ))}
      </div>

      {/* 共享：价值兑换出口 */}
      <div style={{ padding: '8px 16px 0' }}>
        <Row gap={6} align="center" style={{ margin: '8px 0 10px' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#22c55e' }}>「共享」</span>
          <Text style={{ fontWeight: 700, fontSize: 14, color: theme.text.primary }}>价值兑换出口</Text>
        </Row>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {CONTRIB_EXCHANGE.map(e => (
            <div key={e.name} style={{
              borderRadius: 12, border: `1px solid ${theme.stroke.secondary}`,
              background: theme.bg.elevated, padding: '12px',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, background: `${e.accent}1f`, color: e.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, marginBottom: 8,
              }}>{e.icon}</div>
              <Text size="small" style={{ fontWeight: 700, color: theme.text.primary, display: 'block', marginBottom: 3 }}>{e.name}</Text>
              <Text size="small" tone="secondary" style={{ fontSize: 10, lineHeight: 1.5 }}>{e.desc}</Text>
            </div>
          ))}
        </div>
      </div>

      {/* 链上凭证 + 声明 */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{
          padding: '12px 14px', borderRadius: 10,
          background: theme.fill.tertiary, border: `1px solid ${theme.stroke.secondary}`,
        }}>
          <Text size="small" style={{ fontWeight: 600, color: theme.text.primary, display: 'block', marginBottom: 6 }}>
            ◈ 链上凭证 · 分配机制
          </Text>
          <Text size="small" style={{ color: theme.text.primary, fontFamily: 'monospace', fontSize: 11, display: 'block', marginBottom: 8 }}>
            个人分配额 = 利益共享池 × (持有凭证数 ÷ 全网凭证总量)
          </Text>
          <Text size="small" tone="secondary" style={{ fontSize: 10, lineHeight: 1.55 }}>
            声明：链上凭证为社会贡献的记录与分配依据，不构成固定收益承诺，不涉及股权或虚拟货币。
          </Text>
        </div>
      </div>
      <div style={{ height: 24 }} />
    </Stack>
  );
}

// ── 通用功能详情页（数据驱动） ────────────────────────────────────────────────

function FeatureScreen({ theme, featureKey, onBack, onEntry }: {
  theme: Theme; featureKey: string; onBack: () => void; onEntry: (route: EntryRoute) => void;
}) {
  const f = FEATURE_CONTENT[featureKey];
  if (!f) {
    return (
      <Stack gap={0}>
        <BackHeader theme={theme} title="功能详情" onBack={onBack} />
        <div style={{ padding: 16 }}><Text tone="secondary">功能建设中，敬请期待。</Text></div>
      </Stack>
    );
  }

  return (
    <Stack gap={0}>
      <BackHeader theme={theme} title={f.title} subtitle={`${f.section} · ${f.tagline}`} accent={f.accent} onBack={onBack} />

      {/* hero */}
      <div style={{
        padding: '16px', background: `${f.accent}10`,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
      }}>
        <Row gap={12} align="center">
          <div style={{
            width: 46, height: 46, borderRadius: 12, background: f.accent, color: '#fff', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
          }}>{f.icon}</div>
          <Stack gap={3} style={{ flex: 1 }}>
            <Text style={{ fontWeight: 700, fontSize: 16, color: theme.text.primary }}>{f.title}</Text>
            <Text size="small" tone="secondary" style={{ lineHeight: 1.5 }}>{f.intro}</Text>
          </Stack>
        </Row>
      </div>

      {/* 功能亮点 */}
      <div style={{ padding: '16px 16px 0' }}>
        <Text style={{ fontWeight: 700, fontSize: 14, color: theme.text.primary, display: 'block', marginBottom: 10 }}>功能亮点</Text>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {f.highlights.map(h => (
            <Row key={h} gap={6} align="center" style={{
              padding: '8px 10px', borderRadius: 8,
              border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated,
            }}>
              <span style={{ color: f.accent, fontSize: 12, flexShrink: 0 }}>✓</span>
              <Text size="small" style={{ color: theme.text.primary, fontSize: 12 }}>{h}</Text>
            </Row>
          ))}
        </div>
      </div>

      {/* 服务列表 */}
      {f.list && (
        <div style={{ padding: '16px 16px 0' }}>
          <Text style={{ fontWeight: 700, fontSize: 14, color: theme.text.primary, display: 'block', marginBottom: 10 }}>
            {f.listTitle ?? '服务项目'}
          </Text>
          {f.list.map(item => (
            <div key={item.name} style={{
              padding: '12px 14px', borderRadius: 10, marginBottom: 8,
              border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%', background: f.accent, flexShrink: 0,
              }} />
              <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>{item.name}</Text>
                {item.sub && <Text size="small" tone="secondary" style={{ fontSize: 11 }}>{item.sub}</Text>}
              </Stack>
              {item.tag && (
                <span style={{
                  fontSize: 10, color: f.accent, background: `${f.accent}16`,
                  borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap', flexShrink: 0,
                }}>{item.tag}</span>
              )}
              <span style={{ color: theme.text.tertiary, fontSize: 14, flexShrink: 0 }}>›</span>
            </div>
          ))}
        </div>
      )}

      {/* 与贡献体系联动 */}
      {f.contribNote && (
        <div style={{ padding: '14px 16px 0' }}>
          <button onClick={() => onEntry({ kind: 'contribution' })} style={{
            width: '100%', textAlign: 'left', cursor: 'pointer',
            padding: '12px 14px', borderRadius: 10,
            border: `1px solid #22c55e40`, background: '#22c55e12',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 16, color: '#22c55e', flexShrink: 0 }}>◈</span>
            <Text size="small" style={{ flex: 1, color: theme.text.secondary, fontSize: 11, lineHeight: 1.5 }}>{f.contribNote}</Text>
            <span style={{ color: '#22c55e', fontSize: 14, flexShrink: 0 }}>›</span>
          </button>
        </div>
      )}

      {/* 党建引领 footer */}
      <div style={{ padding: '14px 16px 0' }}>
        <Row gap={8} align="center" style={{
          padding: '10px 14px', borderRadius: 10,
          background: '#c0392b12', border: '1px solid #c0392b30',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#c0392b' }}>★ 党建引领</span>
          <Text size="small" tone="secondary" style={{ fontSize: 11 }}>{f.tagline}，把服务送到群众身边。</Text>
        </Row>
      </div>

      <div style={{ padding: '16px' }}>
        <button style={{
          width: '100%', padding: '12px', borderRadius: 24, border: 'none',
          background: f.accent, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: 14,
        }}>立即体验</button>
      </div>
    </Stack>
  );
}

// ── 长辈模式（大字关怀版） ────────────────────────────────────────────────────

function ElderModeScreen({ theme, onExit, onEntry }: {
  theme: Theme; onExit: () => void; onEntry: (route: EntryRoute) => void;
}) {
  const [helpSent, setHelpSent] = useState(false);
  const items: { label: string; icon: string; accent: string; onClick: () => void }[] = [
    { label: '供享小店', icon: '⊞', accent: '#4f8ef7', onClick: () => onEntry({ kind: 'tab', tab: '小店' }) },
    { label: '健康医疗', icon: '✚', accent: '#ef4444', onClick: () => onEntry({ kind: 'feature', key: 'health' }) },
    { label: '生活缴费', icon: '¥', accent: '#22c55e', onClick: () => onEntry({ kind: 'feature', key: 'pay' }) },
    { label: '我的订单', icon: '▦', accent: '#f59e0b', onClick: () => onEntry({ kind: 'sub', sub: '订单列表' }) },
    { label: '一老一小', icon: '⚘', accent: '#a78bfa', onClick: () => onEntry({ kind: 'feature', key: 'oldyoung' }) },
    { label: '快递查询', icon: '➤', accent: '#4f8ef7', onClick: () => onEntry({ kind: 'feature', key: 'express' }) },
  ];

  return (
    <Stack gap={0} style={{ background: theme.bg.editor, minHeight: '100%' }}>
      <div style={{
        padding: '16px', background: 'linear-gradient(135deg, #c0392b, #e2603f)', color: '#fff',
      }}>
        <Row gap={8} align="center" justify="space-between">
          <Text style={{ fontWeight: 700, fontSize: 22, color: '#fff' }}>长辈模式</Text>
          <button onClick={onExit} style={{
            background: '#ffffff28', border: 'none', borderRadius: 20, cursor: 'pointer',
            color: '#fff', fontSize: 15, fontWeight: 600, padding: '6px 14px',
          }}>返回标准版</button>
        </Row>
        <Text style={{ fontSize: 15, color: '#ffffffe0', marginTop: 6 }}>范大爷，您好！字大图大，轻松操作</Text>
      </div>

      {/* 一键求助 */}
      <div style={{ padding: '16px 16px 0' }}>
        <button onClick={() => setHelpSent(true)} disabled={helpSent} style={{
          width: '100%', padding: '18px', borderRadius: 16, border: 'none',
          cursor: helpSent ? 'default' : 'pointer',
          background: helpSent ? '#22c55e' : '#ef4444', color: '#fff',
          fontSize: 22, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        }}>
          <span style={{ fontSize: 26 }}>{helpSent ? '✓' : '☎'}</span>
          {helpSent ? '已通知网格员与家人' : '一键求助'}
        </button>
      </div>

      {/* 大按钮功能 */}
      <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {items.map(it => (
          <button key={it.label} onClick={it.onClick} style={{
            padding: '22px 12px', borderRadius: 16, cursor: 'pointer',
            border: `2px solid ${it.accent}30`, background: `${it.accent}12`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14, background: it.accent, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
            }}>{it.icon}</div>
            <span style={{ fontSize: 18, fontWeight: 700, color: theme.text.primary }}>{it.label}</span>
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px 24px' }}>
        <Text style={{ fontSize: 14, color: theme.text.tertiary, textAlign: 'center', display: 'block' }}>
          如需帮助，可联系村服务中心：村委会 0377-66668888
        </Text>
      </div>
    </Stack>
  );
}

// ── Right Panel ──────────────────────────────────────────────────────────────

function RightPanel({ theme, tab, selected, joined, subScreen, productDetail }: {
  theme: Theme; tab: Tab; selected: number | null; joined: Set<number>;
  subScreen: SubScreen | null; productDetail: number | null;
}) {
  const product = selected ? PRODUCTS.find(p => p.id === selected) : null;

  return (
    <Stack gap={24}>
      <Stack gap={4}>
        <H2>供享村社 · 平台演示</H2>
        <Text tone="secondary">乡村数字经济产业服务平台 · 交互原型</Text>
      </Stack>

      <Grid columns={3} gap={16}>
        <Stat label="当前页面" value={subScreen ?? (productDetail !== null ? '商品详情' : tab)} />
        <Stat label="参团数量" value={`${joined.size} 个`} tone={joined.size > 0 ? 'success' : undefined} />
        <Stat label="查看商品" value={selected ? `#${selected}` : '未选中'} />
      </Grid>

      <Divider />

      {subScreen === '就业招工' && (
        <Stack gap={12}>
          <H3>就业招工说明</H3>
          <Callout tone="info">
            <Text size="small">村内雇主、乡镇企业均可在村后台发布岗位，村管理员审核后发布。成功介绍就业可获 50 贡献值。</Text>
          </Callout>
          <Table headers={['模块', '说明']} rows={[
            ['岗位发布', '村后台填写岗位信息，提交后村管理员审核'],
            ['防欺诈', '审核机制防止虚假用工，联系方式不直接展示'],
            ['激励', '成功介绍1人就业 → 50贡献值'],
            ['数据', '乡镇后台可查看辖区内就业对接率'],
          ]} />
        </Stack>
      )}

      {subScreen === '非遗文化' && (
        <Stack gap={12}>
          <H3>非遗文化说明</H3>
          <Callout tone="info">
            <Text size="small">展示本村及周边乡镇的非物质文化遗产，点击卡片展开详细介绍。非遗产品可在供享小店上架销售。</Text>
          </Callout>
          <Table headers={['级别', '数量', '示例']} rows={[
            ['国家级', '1 项', '豫南皮影戏'],
            ['省级', '1 项', '方城石猴'],
            ['市级', '1 项', '红薯粉条技艺'],
            ['县级', '1 项', '范庄落子舞'],
          ]} />
        </Stack>
      )}

      {subScreen === '村务公开' && (
        <Stack gap={12}>
          <H3>村务公开说明</H3>
          <Callout tone="success">
            <Text size="small">财务收支、工程建设、政策落实等事项定期公示，村民可实时查看，提升村务透明度。</Text>
          </Callout>
          <Table headers={['类别', '说明']} rows={[
            ['财务公开', '集体收入分配、补贴发放明细'],
            ['工程公示', '基础设施建设费用与验收结果'],
            ['民政公示', '低保、残补等名单与标准'],
            ['组织公开', '村委工作述职与评议结果'],
          ]} />
        </Stack>
      )}

      {productDetail !== null && (
        <Stack gap={12}>
          <H3>商品购买流程</H3>
          <Table headers={['步骤', '说明']} rows={[
            ['选择商品', '浏览供享小店，点击商品进入详情页'],
            ['选规格/数量', '调整数量，实时显示小计金额'],
            ['下单支付', '支持微信支付，款项托管至平台'],
            ['发货/自提', '快递配送或村委会自提点取货'],
            ['获贡献值', '确认收货后获得 10 贡献值'],
          ]} />
        </Stack>
      )}

      {!subScreen && productDetail === null && tab === '首页' && (
        <Stack gap={12}>
          <H3>首页 · 页面适配版六大板块</H3>
          <Callout tone="info">
            <Text size="small">首页以「党建引领 + 全周期社会贡献」为核心，将功能按六大板块体系化呈现。点击任意入口进入对应功能页面。</Text>
          </Callout>
          <Table headers={['板块', '定位', '主要词条']} rows={[
            ['便民服务', '供享普惠·党建便民', '小店/政务/医疗/缴费/物流/团购/商城'],
            ['兴农增收', '供建共富·党建兴农', '产销/农资/农技/产权/金融/文旅/就业'],
            ['乡村治理', '供管共治·党建强基', '党建/村务/议事/平安/志愿'],
            ['乡风文明', '供塑新风·党建铸魂', '一老一小/法务/技能/非遗/乡风'],
            ['贡献体系', '价值纽带·全周期', '五维贡献 + 共享兑换出口'],
            ['个人中心', '基础支撑·便捷适配', '信息/订单/贡献/通知/客服/长辈模式'],
          ]} />
          <Callout tone="success">
            <Text size="small">核心理念：以全生命周期社会贡献为纽带，以公共贡献、社会效益作为村社评价与分配的核心标尺，替代单一经济价值导向。</Text>
          </Callout>
        </Stack>
      )}

      {subScreen === '贡献体系' && (
        <Stack gap={12}>
          <H3>贡献体系说明</H3>
          <Callout tone="info">
            <Text size="small">贡献体系是平台价值纽带：行为产生贡献值 → 每 1000 贡献值上链生成数据凭证 → 凭据持有量参与利益共享金分配。</Text>
          </Callout>
          <Table headers={['维度', '覆盖人群', '典型行为']} rows={[
            ['成长贡献', '儿童/青少年', '育儿互动、少年志愿、技能学习'],
            ['立业贡献', '青壮年/创业者', '就业带动、产业带富、创业引领'],
            ['治理贡献', '全体村民', '村务议事、志愿值守、建言献策'],
            ['乡风贡献', '全体村民', '文明践行、移风易俗、非遗传承'],
            ['银龄贡献', '老年/乡贤', '经验传授、乡贤助力、家风传承'],
          ]} />
          <Callout tone="warning">
            <Text size="small">核心规则：以行为对村集体的公共价值、社会效益为唯一计量依据，不以个人经济投入、财富规模为评判标准。</Text>
          </Callout>
          <div style={{
            padding: '12px 14px', borderRadius: 8,
            background: theme.fill.tertiary, border: `1px solid ${theme.stroke.secondary}`,
          }}>
            <Text size="small" style={{ color: theme.text.primary, fontFamily: 'monospace' }}>
              个人分配额 = 利益共享池 × (持有凭证数 ÷ 全网凭证总量)
            </Text>
          </div>
        </Stack>
      )}

      {subScreen === '功能详情' && (
        <Stack gap={12}>
          <H3>功能词条页说明</H3>
          <Callout tone="info">
            <Text size="small">六大板块下的每个功能词条均为数据驱动的标准化详情页，含功能亮点、服务项目清单、党建引领标识，部分与贡献体系联动。</Text>
          </Callout>
          <Table headers={['区块', '内容']} rows={[
            ['顶部', '词条名称 + 所属板块 + 党建标语'],
            ['功能亮点', '该功能的 4 项核心能力'],
            ['服务项目', '可办理 / 可参与的具体事项清单'],
            ['贡献联动', '参与即计入对应贡献维度（如有）'],
          ]} />
        </Stack>
      )}

      {!subScreen && productDetail === null && tab === '小店' && !product && (
        <Stack gap={12}>
          <H3>供享小店说明</H3>
          <Callout tone="info">
            <Text size="small">点击商品卡片可进入商品详情页（手机框内完整展示），支持数量选择和下单交互。</Text>
          </Callout>
          <Table
            headers={['商品', '店铺', '售价', '已售', '标签']}
            rows={PRODUCTS.map(p => [p.name, p.store, `¥${p.price}/${p.unit}`, `${p.sales}${p.unit}`, p.tag])}
          />
        </Stack>
      )}

      {!subScreen && productDetail === null && tab === '小店' && product && (
        <Stack gap={12}>
          <H3>商品详情 · {product.name}</H3>
          <Grid columns={2} gap={12}>
            <Stat label="售价" value={`¥${product.price}/${product.unit}`} />
            <Stat label="已售" value={`${product.sales} ${product.unit}`} tone="success" />
          </Grid>
          <Table
            headers={['属性', '内容']}
            rows={[
              ['所属小店', product.store],
              ['产地', product.origin],
              ['规格', product.weight],
              ['库存', `${product.stock} ${product.unit}`],
              ['贡献值', '购买可得 10 贡献值'],
            ]}
          />
          <Callout tone="info">
            <Text size="small">平台抽佣后，净利润按各层级比例分配：技术平台5%、运营商剩余利润、创业者按销售获取佣金。</Text>
          </Callout>
        </Stack>
      )}

      {!subScreen && productDetail === null && tab === '团购' && (
        <Stack gap={12}>
          <H3>惠民团购说明</H3>
          <Callout tone={joined.size > 0 ? 'success' : 'info'}>
            <Text size="small">
              {joined.size > 0
                ? `你已参与 ${joined.size} 个团购，系统将在截止时间自动判断是否成团。`
                : '在左侧点击"参与"按钮加入团购，体验成团进度实时更新。'}
            </Text>
          </Callout>
          <Table
            headers={['规则', '说明']}
            rows={[
              ['成团条件', '截止时间前预定数量 ≥ 最低成团份数'],
              ['付款时机', '成团后系统自动扣款（预定期间冻结）'],
              ['退款机制', '未成团全额退回现金账户'],
              ['配送方式', '次日统一配送至村委会等指定自提点'],
              ['跨村选品', '村管理员可选择是否上架外村团购商品'],
            ]}
          />
        </Stack>
      )}

      {!subScreen && productDetail === null && tab === '党建' && (
        <Stack gap={12}>
          <H3>党建助农模块说明</H3>
          <Callout tone="info">
            <Text size="small">点击左侧"联谊点地图"按钮查看各村党建站点分布图。点击活动卡片可展开详情和报名入口。</Text>
          </Callout>
          <Table
            headers={['板块', '功能']}
            rows={[
              ['联谊点地图', '可视化展示各村党建站点，标注建立状态'],
              ['活动展示', '展示活动记录，已完成和报名中两种状态'],
              ['学习园地', '发布学习内容，记录完成状态，可获贡献值'],
              ['数据汇总', '党员人数、本月活动次数、志愿时长统计'],
              ['贡献值联动', '参与党建活动可获贡献值，参与利益共享'],
            ]}
          />
        </Stack>
      )}

      {!subScreen && productDetail === null && tab === '我的' && (
        <Stack gap={12}>
          <H3>账户体系说明</H3>
          <Callout tone="info">
            <Text size="small">点击左侧三个账户卡片可展开详情，查看明细和操作。</Text>
          </Callout>
          <Table
            headers={['账户类型', '来源', '用途', '可提现']}
            rows={[
              ['现金账户', 'CPS返佣、活动返利', '提现、站内消费', '是'],
              ['积分账户', '平台活动积分', '积分商城兑换', '否'],
              ['贡献值账户', '消费/签到/分享等行为', '参与利益共享金分配', '否（凭证形式）'],
            ]}
          />
          <div style={{
            padding: '12px 14px', borderRadius: 8,
            background: theme.fill.tertiary, border: `1px solid ${theme.stroke.secondary}`,
          }}>
            <Text size="small" style={{ color: theme.text.primary, fontFamily: 'monospace' }}>
              个人分配额 = 利益共享池总额 × (持有凭证数 ÷ 全网凭证总量)
            </Text>
          </div>
        </Stack>
      )}
    </Stack>
  );
}
