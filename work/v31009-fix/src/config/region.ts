// ── 地名规范：全国村/社区/小区命名统一带完整行政路径 ──────────────────────
// 省 · 市 · 县(区) · 镇(乡/街道) · 村(社区)，避免"范庄村"这类全国重名混淆。
// 本平台发起村：天津市东丽区华明街道范庄村。改一处、全局生效。

export const VILLAGE_FULL = '天津市东丽区华明街道范庄村';
export const COMMUNITY_FULL = '天津市东丽区华明街道第六社区';

// 简称（家庭/内部标签等空间紧张处用，非地名唯一标识）
export const VILLAGE_SHORT = '范庄村';
export const COMMUNITY_SHORT = '第六社区';

// 紧凑地名（产地标签/品牌前缀用，比全称短、比"范庄村"唯一）
export const VILLAGE_COMPACT = '天津东丽华明范庄';

// 归属组织全称（带"村委会/居委会"）
export const VILLAGE_ORG = VILLAGE_FULL + '·村委会';
export const COMMUNITY_ORG = COMMUNITY_FULL + '·居委会';

// 供销合作社全称（挂地名，全国不重名）
export const VILLAGE_COOP = '天津东丽华明范庄供销合作社';
export const DEMO_ADDRESS = '天津市东丽区华明街道范庄村示范住址';
export const VILLAGE_STORE = VILLAGE_COMPACT + '·集体自营';

// 按身份取完整地名 / 组织全称
export const fullPlace = (community: boolean): string => (community ? COMMUNITY_FULL : VILLAGE_FULL);
export const fullOrg = (community: boolean): string => (community ? COMMUNITY_ORG : VILLAGE_ORG);
