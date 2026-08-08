/**
 * 五大板块定义（convenience/agri/community-life/governance/culture）——
 * 其中 agri（兴农增收·村民专属）与 community-life（社区生活·居民专属）按身份互斥，
 * 故任一身份实际只展示其中四块。依据《供享村社 页面适配版功能词条》。
 * 村 / 社区双体系：村民重农业生产，居民重社区生活。
 * - Section.scope / SectionEntry.scope: 'village' 仅村民可见 / 'community' 仅居民可见 / 不填=两者都见
 * - titleCommunity / nameCommunity / urlCommunity: 居民身份下的替代标题 / 名称 / 跳转
 * 被首页门户与通用功能详情页共用。
 */
import { store } from '../store';

export interface SectionEntry {
  name: string; nameCommunity?: string; icon: string;
  url?: string; urlCommunity?: string; key?: string;
  admin?: boolean; party?: boolean; scope?: 'village' | 'community';
}
export interface Section {
  key: string; title: string; titleCommunity?: string; slogan: string;
  color: string; bg: string; icon: string;
  scope?: 'village' | 'community';
  entries: SectionEntry[];
}

export const SECTIONS: Section[] = [
  {
    key: 'digital-village', title: '数智乡村', titleCommunity: '数智社区', slogan: '一网统管 · 全域智治',
    color: '#0f766e', bg: '#ecfdf5', icon: '🧭',
    entries: [
      { name: '综合村务', nameCommunity: '综合社区事务', icon: '📊', url: '/pages/affairs/index' },
      { name: '智能社群', icon: '🕸️', url: '/pkgDigital/digital-village/index?tab=governance' },
      { name: '便民政务', icon: '🏛️', url: '/pages/gov/index' },
      { name: '数字治理', icon: '🗺️', url: '/pkgDigital/digital-village/index?tab=data' },
      { name: '智慧党建', icon: '🚩', url: '/pkgParty/party/index', party: true },
      { name: '数字文化', icon: '🎬', url: '/pkgDigital/digital-village/index?tab=culture' },
      { name: '乡村文旅', icon: '🏞️', url: '/pages/tourism/index' },
      { name: '智慧农业', icon: '🌱', url: '/pkgDigital/digital-village/index?tab=agri', scope: 'village' },
    ],
  },
  {
    key: 'national-network', title: '全国联动', slogan: '一村一私域 · 万村大联动',
    color: '#1d4ed8', bg: '#eff6ff', icon: '🌐',
    entries: [
      { name: '万村互联', icon: '🇨🇳', url: '/pkgDigital/digital-village/index?tab=network' },
      { name: '零抽佣专区', icon: '0️⃣', url: '/pkgDigital/digital-village/index?tab=network' },
      { name: '数据服务', icon: '📈', url: '/pkgDigital/digital-village/index?tab=data' },
    ],
  },
  {
    key: 'convenience', title: '便民服务', slogan: '供享普惠 · 党建便民',
    color: '#2563eb', bg: '#eff6ff', icon: '🤝',
    entries: [
      { name: '供享大集', icon: '🛒', url: '/pkgShop/my-store/index' },
      { name: '周边美食', icon: '🍜', url: '/pkgLife/food/index' },
      { name: '棋牌室', nameCommunity: '社区棋牌室', icon: '🀄', url: '/pkgLife/chess/index' },
      { name: '旅游服务', icon: '🚌', url: '/pkgLife/travel/index' },
      { name: '便民维修', icon: '🔧', url: '/pkgLife/repair/index' },
      { name: '文体活动', icon: '🎭', url: '/pkgLife/activity/index' },
      { name: '一老一小', icon: '👵', url: '/pkgLife/senior/index' },
      { name: '生活代办', icon: '🛍️', url: '/pkgLife/errand/index' },
      { name: '政务办事', icon: '🏛️', url: '/pages/gov/index' },
      { name: '健康医疗', icon: '🏥', url: '/pages/health/index' },
      { name: '医保社保', icon: '📋', url: '/pkgLife/social/index' },
      { name: '生活缴费', icon: '💡', url: '/pages/pay/index' },
      { name: '快递物流', icon: '📦', url: '/pages/express/index' },
      { name: '惠民团购', icon: '🧺', url: '/pages/groupon/index' },
      { name: '贡献商城', icon: '🎁', url: '/pages/contrib-mall/index' },
      { name: 'AI智能小卖部', icon: '🏪', url: '/pkgPlatform/ai-store/index' },
      { name: 'AI智能助手', icon: '🤖', url: '/pages/assistant/index' },
      { name: '生活服务大厅', nameCommunity: '社区服务大厅', icon: '🤝', url: '/pkgLife/life/index' },
    ],
  },
  {
    // 兴农增收：村民专属（农业生产、宅基地流转、助农金融等）
    key: 'agri', title: '兴农增收', slogan: '供建共富 · 党建兴农', scope: 'village',
    color: '#16a34a', bg: '#f0fdf4', icon: '🌾',
    entries: [
      { name: '产销对接', icon: '🚚', url: '/pages/sales/index' },
      { name: '农资农机', icon: '🚜', url: '/pages/agri-rental/index' },
      { name: '农技指导', icon: '📚', url: '/pages/agri-tech/index' },
      { name: '宅基地·产权', icon: '📄', url: '/pages/property/index' },
      { name: '助农金融', icon: '💰', url: '/pages/finance/index' },
      { name: '文旅休闲', icon: '🏞️', url: '/pages/tourism/index' },
      { name: '就业招工', icon: '💼', url: '/pages/jobs/index' },
    ],
  },
  {
    // 社区生活：居民专属（物业、家政、社区团购、综治网格等城市社区服务）
    key: 'community-life', title: '社区生活', slogan: '供享宜居 · 党建惠民', scope: 'community',
    color: '#0891b2', bg: '#ecfeff', icon: '🏙️',
    entries: [
      { name: '物业报修', icon: '🔧', key: 'wuye' },
      { name: '家政服务', icon: '🧹', key: 'jiazheng' },
      { name: '社区团购', icon: '🧺', url: '/pages/groupon/index' },
      { name: '便民缴费', icon: '💡', url: '/pages/pay/index' },
      { name: '综治网格', icon: '🛡️', url: '/pages/safety/index' },
      { name: '就业创业', icon: '💼', url: '/pages/jobs/index' },
      { name: '日间照料', icon: '👵', url: '/pages/care/index' },
      { name: '居民议事', icon: '🗳️', url: '/pages/council/index' },
    ],
  },
  {
    key: 'governance', title: '乡村治理', titleCommunity: '社区治理', slogan: '供管共治 · 党建强基',
    color: '#ea580c', bg: '#fff7ed', icon: '🏛️',
    entries: [
      { name: '党建联建', icon: '🚩', url: '/pkgParty/party/index', party: true },
      { name: '双向流通', icon: '🤝', url: '/pages/exchange/index' },
      { name: '村务公开', nameCommunity: '社区公开', icon: '📋', url: '/pages/affairs/index' },
      { name: '村民议事', nameCommunity: '居民议事', icon: '🗳️', url: '/pages/council/index' },
      { name: '平安综治', icon: '🛡️', url: '/pages/safety/index' },
      { name: '志愿服务', icon: '❤️', url: '/pages/volunteer/index' },
      // 管理类功能（审批/组织码/名单导入/聚光星/贡献审核等）统一收拢进「管理中心」后台，此处仅保留一个入口，避免散落各板块
      { name: '管理中心', nameCommunity: '管理中心', icon: '🗂️', url: '/pages/admin/index', urlCommunity: '/pkgPlatform/community/index', admin: true },
    ],
  },
  {
    // 社会公益：独立第六板块（全民共享，村/社区都可见）——关心下一代 青少年体育公益数字化系统
    key: 'charity', title: '社会公益', slogan: '供爱共育 · 关心下一代',
    color: '#dc2626', bg: '#fef2f2', icon: '🏀',
    entries: [
      { name: '公益机构', icon: '🏛', url: '/pkgLife/charity/index?tab=org' },
      { name: '公益项目', icon: '📋', url: '/pkgLife/charity/index?tab=proj' },
      { name: '我要申领', icon: '📝', url: '/pkgLife/charity/index?tab=apply' },
      { name: '资金公示', icon: '💰', url: '/pkgLife/charity/index?tab=fund' },
      { name: '物资溯源', icon: '📦', url: '/pkgLife/charity/index?tab=mat' },
      { name: '信息公开·监督', icon: '📢', url: '/pkgLife/charity/index?tab=open' },
    ],
  },
  {
    key: 'culture', title: '乡风文明', titleCommunity: '社区文明', slogan: '供享新风 · 党建铸魂',
    color: '#9333ea', bg: '#faf5ff', icon: '🎎',
    entries: [
      { name: '日间照料·居家养老', icon: '👵', url: '/pages/care/index' },
      { name: '邻里互助', icon: '🤝', url: '/pages/neighbor/index' },
      { name: '法务调解', icon: '⚖️', url: '/pages/legal/index' },
      { name: '技能学堂', icon: '🎓', url: '/pages/school/index' },
      { name: '非遗文化', icon: '🏮', url: '/pages/heritage/index' },
      { name: '文明乡风', nameCommunity: '文明社区', icon: '🌸', url: '/pages/civility/index' },
    ],
  },
];

/** 身份感知的板块标题：居民身份下用 titleCommunity 覆盖 */
export function sectionTitle(s: Section): string {
  return (store.isCommunity() && s.titleCommunity) ? s.titleCommunity : s.title;
}

/** 身份感知的入口名称：居民身份下用 nameCommunity 覆盖 */
export function entryName(e: SectionEntry): string {
  return (store.isCommunity() && e.nameCommunity) ? e.nameCommunity : e.name;
}

/** 跳转辅助：居民身份优先 urlCommunity；有真实页面走页面，否则走通用详情页 */
export function entryUrl(e: SectionEntry): string {
  const url = (store.isCommunity() && e.urlCommunity) ? e.urlCommunity : e.url;
  return url || `/pages/feature/index?key=${e.key}`;
}

// 入口 → 功能开关 key 映射（平台按村控制显示/隐藏；未列出的入口默认常显）
const URL_FEATURE: Record<string, string> = {
  '/pkgLife/food/index': 'food',
  '/pkgLife/chess/index': 'chess',
  '/pkgLife/travel/index': 'travel',
  '/pkgLife/repair/index': 'repair',
  '/pkgLife/activity/index': 'activity',
  '/pkgLife/senior/index': 'senior',
  '/pkgLife/errand/index': 'errand',
  '/pkgLife/life/index': 'life',
  '/pkgLife/social/index': 'social',
  '/pages/health/index': 'health',
  '/pages/groupon/index': 'groupon',
  '/pages/exchange/index': 'exchange',
  '/pages/care/index': 'senior',
  '/pages/sales/index': 'agri',
  '/pages/agri-rental/index': 'agri',
  '/pages/agri-tech/index': 'agri',
  '/pages/property/index': 'agri',
  '/pages/finance/index': 'agri',
  '/pages/tourism/index': 'agri',
};
/** 入口对应的功能开关 key（无则常显）；平台可按村关闭这些功能，用户端/村委端即自动隐藏。 */
export function entryFeature(e: SectionEntry): string | null {
  return e.url ? (URL_FEATURE[e.url] || null) : null;
}
