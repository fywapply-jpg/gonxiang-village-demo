import { defineStore } from "pinia";

/** 五类角色，对应细则「二、用户角色与权限体系」 */
export type RoleKey = "supplier" | "buyer" | "agri" | "station" | "visitor";
export type TradeCapability = "supply" | "purchase";

export interface RoleDef {
  key: RoleKey;
  name: string;
  short: string;
  desc: string;
  scene: string;
  perms: string[];
  creditScore: number;
  org: string;
}

export const ROLES: RoleDef[] = [
  {
    key: "supplier",
    name: "产地供应商",
    short: "供",
    desc: "合作社 / 种植大户 / 集货商",
    scene: "发布供货、查看采购需求、管理订单、溯源管理、申请融资",
    perms: ["供货发布", "订单管理", "溯源上传", "金融申请", "仓单查询"],
    creditScore: 786,
    org: "赣南脐橙合作社",
  },
  {
    key: "buyer",
    name: "采购商",
    short: "采",
    desc: "农批商户 / 中央厨房 / 连锁门店 / 食堂",
    scene: "找货源、发采购、下单采购、查物流、溯源核验",
    perms: ["货源浏览", "采购发布", "下单结算", "物流追踪", "溯源查询"],
    creditScore: 742,
    org: "锦华连锁生鲜",
  },
  {
    key: "agri",
    name: "农资采购方",
    short: "农",
    desc: "基层社 / 家庭农场",
    scene: "集采农资、查订单、申请订单贷",
    perms: ["农资商城", "集采拼单", "订单管理", "金融申请"],
    creditScore: 705,
    org: "兴农家庭农场",
  },
  {
    key: "station",
    name: "基层服务站专员",
    short: "站",
    desc: "县域供销服务站",
    scene: "代办入驻、现场登记、设备运维、助农服务",
    perms: ["入驻代办", "业务登记", "运维上报", "数据看板"],
    creditScore: 800,
    org: "龙南镇供销服务站",
  },
  {
    key: "visitor",
    name: "普通访客",
    short: "客",
    desc: "消费者 / 未登录用户",
    scene: "扫码查询农产品溯源",
    perms: ["溯源查询"],
    creditScore: 0,
    org: "未登录",
  },
];

export const useUserStore = defineStore("user", {
  state: () => ({
    roleKey: "supplier" as RoleKey,
    loggedIn: true,
    // 企业主体入驻状态：approved 已认证 / pending 审核中 / none 未认证
    certStatus: "approved" as "approved" | "pending" | "none",
    pendingOrg: "",
    // 国际贸易进驻的区域枢纽 key（空 = 未进驻）
    hubKey: "",
  }),
  getters: {
    role(state): RoleDef {
      return ROLES.find((r) => r.key === state.roleKey) || ROLES[0];
    },
    isVisitor(state): boolean {
      return state.roleKey === "visitor";
    },
    // 企业 DID（链上身份），未认证为空
    did(state): string {
      if (state.certStatus === "none") return "";
      return "did:sg:0x7f3a9c" + (state.roleKey === "buyer" ? "21d84e" : "b3c50a");
    },
    certOrg(state): string {
      const r = ROLES.find((x) => x.key === state.roleKey) || ROLES[0];
      return state.certStatus === "pending" && state.pendingOrg ? state.pendingOrg : r.org;
    },
  },
  actions: {
    switchRole(key: RoleKey) {
      this.roleKey = key;
      this.loggedIn = key !== "visitor";
      // 游客未认证；已有业务角色视为已入驻企业
      this.certStatus = key === "visitor" ? "none" : "approved";
      this.pendingOrg = "";
    },
    // 完成入驻申请 → 进入审核中
    submitCert(orgName: string) {
      this.pendingOrg = orgName;
      this.certStatus = "pending";
    },
    // 进驻区域枢纽（国际贸易准入）
    settleHub(key: string) {
      this.hubKey = key;
    },
    // 准入守卫：需已认证企业法人主体才能交易/融资，否则弹窗引导入驻
    ensureCert(action = "该操作"): boolean {
      if (this.certStatus === "approved") return true;
      const pending = this.certStatus === "pending";
      uni.showModal({
        title: pending ? "入驻审核中" : "需完成企业入驻",
        content: pending
          ? `${action}需等企业入驻审核通过后开放（预计 1-3 个工作日）。`
          : `${action}需以已认证的企业法人主体进行。个人用户仅可游客浏览/扫码溯源，是否前往企业入驻？`,
        confirmText: pending ? "知道了" : "去入驻",
        showCancel: !pending,
        success: (r) => { if (r.confirm && !pending) uni.navigateTo({ url: "/pages/register/index" }); },
      });
      return false;
    },
    // 交易动作不仅校验“是否认证”，还必须校验当前主体的交易角色和权限。
    // 正式环境的角色由企业管理员授权，不能靠前端自行切换。
    ensureTradeRole(action: string, capability: TradeCapability): boolean {
      if (!this.ensureCert(action)) return false;
      const expected: RoleKey = capability === "supply" ? "supplier" : "buyer";
      if (this.roleKey === expected) return true;
      const roleName = capability === "supply" ? "已认证供货商" : "已认证采购商";
      uni.showModal({
        title: "交易角色不匹配",
        content: `当前身份为“${this.role.name}”，无权执行“${action}”。该动作要求${roleName}身份，并校验经办人岗位、授权额度和有效期。正式环境中角色由企业管理员审批授权，不允许临时冒用。`,
        confirmText: "查看准入",
        cancelText: "取消",
        success: (r) => {
          if (r.confirm) uni.navigateTo({ url: "/pages/trade/control" });
        },
      });
      return false;
    },
  },
});
