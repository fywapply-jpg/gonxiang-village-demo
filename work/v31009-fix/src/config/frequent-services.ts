export interface FrequentService {
  key: string;
  name: string;
  nameCommunity?: string;
  icon: string;
  url: string;
  center: 'life' | 'governance' | 'industry' | 'culture';
  priority: number;
  scope?: 'village' | 'community';
  party?: boolean;
}

/** 默认顺序来自居民日常办理频率假设；上线后可由真实埋点统计替换 priority。 */
export const FREQUENT_SERVICES: FrequentService[] = [
  { key: 'market', name: '供享大集', icon: '🛒', url: '/pkgShop/my-store/index', center: 'industry', priority: 100 },
  { key: 'gov', name: '政务办事', icon: '🏛️', url: '/pages/gov/index', center: 'life', priority: 98 },
  { key: 'health', name: '健康医疗', icon: '🏥', url: '/pages/health/index', center: 'life', priority: 96 },
  { key: 'express', name: '快递物流', icon: '📦', url: '/pages/express/index', center: 'life', priority: 94 },
  { key: 'pay', name: '生活缴费', icon: '💡', url: '/pages/pay/index', center: 'life', priority: 92 },
  { key: 'jobs', name: '就业招工', nameCommunity: '就业创业', icon: '💼', url: '/pages/jobs/index', center: 'life', priority: 90 },
  { key: 'affairs', name: '村务公开', nameCommunity: '社区公开', icon: '📋', url: '/pages/affairs/index', center: 'governance', priority: 88 },
  { key: 'council', name: '村民议事', nameCommunity: '居民议事', icon: '🗳️', url: '/pages/council/index', center: 'governance', priority: 86 },
  { key: 'safety', name: '平安综治', icon: '🛡️', url: '/pages/safety/index', center: 'governance', priority: 84 },
  { key: 'care', name: '一老一小', icon: '👵', url: '/pages/care/index', center: 'life', priority: 82 },
  { key: 'contribution', name: '社会贡献', icon: '⭐', url: '/pages/contribution/index', center: 'governance', priority: 80 },
  { key: 'volunteer', name: '志愿服务', icon: '❤️', url: '/pages/volunteer/index', center: 'culture', priority: 78 },
  { key: 'digital', name: '数智治理', icon: '🧭', url: '/pkgDigital/digital-village/index?tab=governance', center: 'governance', priority: 76 },
  { key: 'neighbor', name: '邻里互助', icon: '🤝', url: '/pages/neighbor/index', center: 'culture', priority: 74 },
  { key: 'agri', name: '农技指导', icon: '📚', url: '/pages/agri-tech/index', center: 'industry', priority: 72, scope: 'village' },
  { key: 'social', name: '社保医保', icon: '📄', url: '/pkgLife/social/index', center: 'life', priority: 70 },
  { key: 'charity', name: '社会公益', icon: '🏀', url: '/pkgLife/charity/index', center: 'culture', priority: 68 },
  { key: 'assistant', name: 'AI助手', icon: '🤖', url: '/pages/assistant/index', center: 'life', priority: 66 },
];

export const CENTER_COLORS: Record<FrequentService['center'], string> = {
  life: '#2563eb', governance: '#0f766e', industry: '#15803d', culture: '#9333ea',
};
