// 管理权限 · 操作级明细（每个模块细分到具体功能点，逐角色授权）
import type { MgmtKey, Perm } from "@/store/admin";

export interface OpPerm { op: string; desc: string; roles: Record<MgmtKey, Perm>; }
export interface ModuleOps { key: string; name: string; icon: string; ops: OpPerm[]; }

// F=可管理 R=仅查看 N=无权限（简写便于维护）
const F: Perm = "full", R: Perm = "read", N: Perm = "none";

export const MODULE_OPS: ModuleOps[] = [
  { key: "merchant", name: "商户管理", icon: "🏪", ops: [
    { op: "商户入驻审核", desc: "营业执照/法人资质初审、准入", roles: { super: F, ops: F, audit: R, finance: N, service: N } },
    { op: "商户资料变更", desc: "经营范围/账户/联系人变更复核", roles: { super: F, ops: F, audit: R, finance: N, service: R } },
    { op: "星级调整", desc: "口碑/营收/信用维度星级评定", roles: { super: F, ops: F, audit: N, finance: N, service: N } },
    { op: "冻结 / 解冻", desc: "违规商户暂停经营权限", roles: { super: F, ops: R, audit: R, finance: N, service: N } },
    { op: "黑名单管理", desc: "严重违规主体拉黑、上链留痕", roles: { super: F, ops: N, audit: R, finance: N, service: N } },
  ]},
  { key: "content", name: "内容运营", icon: "📣", ops: [
    { op: "货源/需求审核发布", desc: "内容安全审核后上架", roles: { super: F, ops: F, audit: F, finance: N, service: N } },
    { op: "Banner / 活动运营", desc: "首页活动位、专题配置", roles: { super: F, ops: F, audit: N, finance: N, service: N } },
    { op: "公告 / 政策推送", desc: "订阅消息、系统公告", roles: { super: F, ops: F, audit: N, finance: N, service: R } },
    { op: "应急保供发布", desc: "保供专区商品与调度发布", roles: { super: F, ops: F, audit: R, finance: N, service: N } },
  ]},
  { key: "audit", name: "审核中心", icon: "✅", ops: [
    { op: "营业执照/资质审核", desc: "法人主体资质核验", roles: { super: F, ops: R, audit: F, finance: N, service: N } },
    { op: "货源信息审核", desc: "价格/规格/图片合规核验", roles: { super: F, ops: R, audit: F, finance: N, service: N } },
    { op: "溯源批次核验", desc: "上链数据一致性核验", roles: { super: F, ops: N, audit: F, finance: N, service: N } },
    { op: "金融申请初审", desc: "订单贷/保理资料初审转银行", roles: { super: F, ops: N, audit: F, finance: R, service: N } },
  ]},
  { key: "finance", name: "财务结算", icon: "💰", ops: [
    { op: "货款结算", desc: "交易货款对账、结算", roles: { super: F, ops: N, audit: N, finance: F, service: N } },
    { op: "发票管理", desc: "开票审核、红冲", roles: { super: F, ops: N, audit: N, finance: F, service: R } },
    { op: "全民分红发放", desc: "分红基金测算与发放", roles: { super: F, ops: N, audit: N, finance: F, service: N } },
    { op: "提现复核", desc: "商户提现二次复核放款", roles: { super: F, ops: N, audit: N, finance: F, service: N } },
    { op: "对账 / 账务导出", desc: "银企/平台对账单", roles: { super: F, ops: N, audit: N, finance: F, service: N } },
  ]},
  { key: "risk", name: "风控合规", icon: "🛡️", ops: [
    { op: "风控规则配置", desc: "授信/交易风控阈值", roles: { super: F, ops: N, audit: N, finance: R, service: N } },
    { op: "异常交易处置", desc: "虚假贸易/套现拦截处置", roles: { super: F, ops: N, audit: R, finance: R, service: N } },
    { op: "合规检查", desc: "金融/内容/资质合规巡检", roles: { super: F, ops: N, audit: R, finance: R, service: N } },
    { op: "风险准备金管理", desc: "准备金计提与动用审批", roles: { super: F, ops: N, audit: N, finance: R, service: N } },
  ]},
  { key: "service", name: "客服工单", icon: "🎧", ops: [
    { op: "工单处理", desc: "咨询/投诉工单受理、流转", roles: { super: F, ops: R, audit: N, finance: N, service: F } },
    { op: "售后处理", desc: "退换货、售后跟进", roles: { super: F, ops: N, audit: N, finance: R, service: F } },
    { op: "评价管理", desc: "评价审核、申诉处理", roles: { super: F, ops: R, audit: N, finance: N, service: F } },
    { op: "客诉升级", desc: "重大客诉上报处置", roles: { super: F, ops: R, audit: N, finance: N, service: F } },
  ]},
  { key: "data", name: "数据看板", icon: "📊", ops: [
    { op: "经营数据看板", desc: "交易额/订单/活跃", roles: { super: F, ops: F, audit: R, finance: R, service: R } },
    { op: "战略指标", desc: "流通损耗/分红覆盖/节点", roles: { super: F, ops: R, audit: R, finance: R, service: N } },
    { op: "数据导出", desc: "报表导出（脱敏）", roles: { super: F, ops: R, audit: N, finance: R, service: N } },
  ]},
  { key: "system", name: "系统 / 权限", icon: "⚙️", ops: [
    { op: "管理账号管理", desc: "新增/停用管理账号", roles: { super: F, ops: N, audit: N, finance: N, service: N } },
    { op: "角色权限分配", desc: "角色-模块-操作授权", roles: { super: F, ops: N, audit: N, finance: N, service: N } },
    { op: "数据范围设置", desc: "全国/省域/地市/单点范围", roles: { super: F, ops: N, audit: N, finance: N, service: N } },
    { op: "操作日志审计", desc: "全量操作日志上链留痕", roles: { super: F, ops: R, audit: R, finance: R, service: R } },
  ]},
];

export const PERM_MARK: Record<Perm, string> = { full: "●", read: "◐", none: "—" };
