export interface ServiceCenter {
  key: string;
  name: string;
  nameCommunity?: string;
  summary: string;
  sectionKeys: string[];
  accent: string;
  icon: string;
  admin?: boolean;
  quickLinks: Array<{ name: string; icon: string; url: string }>;
}

/**
 * 首页只展示场景中心；原子功能仍由 sections.ts 统一维护，避免出现两套入口配置。
 * 一个功能即使在多个板块出现，中心页也会按最终路由去重。
 */
export const SERVICE_CENTERS: ServiceCenter[] = [
  {
    key: 'life', name: '办事与生活', summary: '政务、医疗、养老、就业及日常服务集中办理',
    sectionKeys: ['convenience', 'community-life'], accent: '#2563eb', icon: '🤝',
    quickLinks: [
      { name: '政务办事', icon: '🏛️', url: '/pages/gov/index' },
      { name: '健康医疗', icon: '🏥', url: '/pages/health/index' },
      { name: '生活大厅', icon: '🤝', url: '/pkgLife/life/index' },
    ],
  },
  {
    key: 'governance', name: '治理与共建', nameCommunity: '社区治理与共建', summary: '公开、议事、网格、党建和六级协同统一入口',
    sectionKeys: ['digital-village', 'governance'], accent: '#0f766e', icon: '🏛️',
    quickLinks: [
      { name: '数智治理', icon: '🧭', url: '/pkgDigital/digital-village/index?tab=governance' },
      { name: '村务公开', icon: '📋', url: '/pages/affairs/index' },
      { name: '议事协商', icon: '🗳️', url: '/pages/council/index' },
    ],
  },
  {
    key: 'industry', name: '产业与交易', summary: '生产服务、供需对接、村社好物和全国协作',
    sectionKeys: ['agri', 'national-network'], accent: '#15803d', icon: '🌾',
    quickLinks: [
      { name: '供享大集', icon: '🛒', url: '/pkgShop/my-store/index' },
      { name: '产销对接', icon: '🚚', url: '/pages/sales/index' },
      { name: '农技指导', icon: '📚', url: '/pages/agri-tech/index' },
    ],
  },
  {
    key: 'culture', name: '公益与文化', summary: '公益项目、志愿服务、邻里互助与乡土文化',
    sectionKeys: ['charity', 'culture'], accent: '#9333ea', icon: '❤️',
    quickLinks: [
      { name: '社会公益', icon: '❤️', url: '/pkgLife/charity/index' },
      { name: '非遗文化', icon: '🏮', url: '/pages/heritage/index' },
      { name: '文明乡风', icon: '🌸', url: '/pages/civility/index' },
    ],
  },
  {
    key: 'management', name: '组织管理', summary: '审批、名册、权限、运营和审计集中管理',
    sectionKeys: ['governance'], accent: '#b45309', icon: '🗂️', admin: true,
    quickLinks: [{ name: '管理中心', icon: '🗂️', url: '/pages/admin/index' }],
  },
];

export function centerName(center: ServiceCenter, community: boolean): string {
  return community && center.nameCommunity ? center.nameCommunity : center.name;
}
