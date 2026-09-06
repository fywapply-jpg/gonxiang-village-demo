import { defineStore } from "pinia";

// 用户在演示过程中生成的采购需求与订单（贯通"清单→需求→报价→下单→人工复核→合同→付款→流转"闭环）
export interface DemandItem { name: string; spec: string; price?: number; sub?: number; }
export interface MyDemand {
  id: string;
  title: string;
  category: string;
  qty: string;
  addr: string;
  deadline: string;
  buyer: string;
  budget: string;
  quotes: number;
  pic: string;
  items: DemandItem[];
  mine: true;
  ordered?: boolean;
}
export interface MyOrder {
  id: string;
  status: string;          // 待复核 → 待付款 → 待发货 → 运输中 → 已完成；驳回=已驳回
  emoji: string;
  title: string;
  qty: string;
  counterparty: string;
  amount: number;
  chainHash: string;
  time: string;
  mine: true;
  reviewer?: string;       // 复核人
  reviewTime?: string;
  rejectReason?: string;
  contractNo?: string;     // 电子合同编号
  paid?: boolean;
  payMethod?: string;
  identitySnapshotNo?: string; // 买卖双方主体、经办人权限与对公账户快照
  fundStatus?: string;         // 未付款 → 机构待确认 → 待结算 → 已结算
  evidenceStatus?: string;     // 订单证据链状态
}

export type BatchTradeScene = "buyerSupply" | "supplierDemand";

export interface BatchTradeItem {
  id: string;
  demandId?: string;
  productId?: string;
  buyerId?: string;
  supplierId?: string;
  name: string;
  spec: string;
  counterparty: string;
  origin: string;
  unit: string;
  qty: number;
  price: number;
  pic?: string;
}

export interface BatchTradeCase {
  id: string;
  scene: BatchTradeScene;
  roleName: string;
  org: string;
  createdAt: string;
  items: BatchTradeItem[];
  currentStep: number;
  completed: boolean;
  deliveryWindow: string;
  deliveryAddress?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  settlementModel: string;
  invoiceType: string;
  backendOrderId?: string;
  quoteIds?: string[];
  logs: Array<{ step: number; time: string; title: string; evidence: string }>;
}

let seq = 1;
function hash() { return "0x" + (0x7a1c00 + seq * 137).toString(16) + "…c4"; }

export const useTradeStore = defineStore("trade", {
  state: () => ({
    myDemands: [] as MyDemand[],
    myOrders: [] as MyOrder[],
    batchCase: null as BatchTradeCase | null,
  }),
  actions: {
    addDemand(d: Omit<MyDemand, "id" | "mine" | "quotes">) {
      const id = "RDX" + String(seq++).padStart(3, "0");
      this.myDemands.unshift({ ...d, id, quotes: 0, mine: true });
      return id;
    },
    findDemand(id: string) { return this.myDemands.find((d) => d.id === id); },
    placeOrder(d: MyDemand, supplier: string, amount: number) {
      const id = "SOX" + String(seq++).padStart(3, "0");
      d.ordered = true;
      const emojiMap: Record<string, string> = { 应季水果: "🍎", 时令蔬菜: "🥬", 肉制品: "🥩", 禽蛋: "🥚", 粮油调味: "🌾", 团餐食材: "🍚" };
      // 自动生成的订单一律先进「待复核」，人工复核后方可流转
      this.myOrders.unshift({
        id, status: "待复核", emoji: emojiMap[d.category] || "📦",
        title: d.title.replace(/^求购\s*/, ""), qty: d.qty,
        counterparty: supplier, amount, chainHash: hash(),
        time: "刚刚", mine: true,
        identitySnapshotNo: `ID-${id}-V8533`,
        fundStatus: "未入金",
        evidenceStatus: "已固化需求、报价与下单记录",
      });
      return id;
    },
    findOrder(id: string) { return this.myOrders.find((o) => o.id === id); },
    reviewPass(id: string, reviewer = "枢纽运营 · 张审") {
      const o = this.findOrder(id); if (!o) return;
      o.reviewer = reviewer; o.reviewTime = "刚刚";
      o.contractNo = "HT" + id.slice(3) + "-2026";
      o.status = "待付款";
      o.fundStatus = "待付款 · 仅可使用采购方同名对公账户";
      o.evidenceStatus = "身份快照、复核记录与合同包签署证据已归集";
    },
    reviewReject(id: string, reason: string) {
      const o = this.findOrder(id); if (!o) return;
      o.rejectReason = reason; o.status = "已驳回";
    },
    payOrder(id: string, method: string) {
      const o = this.findOrder(id); if (!o) return;
      o.paid = true; o.payMethod = method; o.status = "待发货";
      o.fundStatus = method.includes("机构") ? "合作机构已确认付款 · 按合同等待结算" : "银行回单已确认";
      o.evidenceStatus = "已取得银行/持牌机构回单，等待锁货、出库和验收证据";
    },
    createBatchCase(scene: BatchTradeScene, items: BatchTradeItem[], org: string) {
      const stamp = Date.now().toString().slice(-8);
      this.batchCase = {
        id: `SZGS-8533-${stamp}`,
        scene,
        roleName: scene === "buyerSupply" ? "采购商" : "产地供货商",
        org,
        createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
        items: items.map((item) => ({ ...item })),
        currentStep: -1,
        completed: false,
        deliveryWindow: "2026-08-03 08:00—12:00",
        deliveryAddress: "",
        deliveryLat: undefined,
        deliveryLng: undefined,
        settlementModel: "持牌机构条件结算（验收后分账）",
        invoiceType: "增值税专用发票",
        logs: [],
      };
      uni.setStorageSync("szgsBatchCase", this.batchCase);
      return this.batchCase.id;
    },
    hydrateBatchCase() {
      if (this.batchCase) return;
      const saved = uni.getStorageSync("szgsBatchCase");
      if (saved && saved.id && Array.isArray(saved.items)) this.batchCase = saved as BatchTradeCase;
    },
    saveBatchCase() {
      if (this.batchCase) uni.setStorageSync("szgsBatchCase", this.batchCase);
    },
    updateBatchQty(id: string, delta: number) {
      const item = this.batchCase?.items.find((x) => x.id === id);
      if (!item) return;
      item.qty = Math.max(1, item.qty + delta);
      this.saveBatchCase();
    },
    setBatchOption(key: "deliveryWindow" | "settlementModel" | "invoiceType", value: string) {
      if (!this.batchCase) return;
      this.batchCase[key] = value;
      this.saveBatchCase();
    },
    recordBatchStep(step: number, title: string, evidence: string) {
      if (!this.batchCase || step !== this.batchCase.currentStep + 1) return false;
      this.batchCase.currentStep = step;
      this.batchCase.logs.unshift({
        step,
        time: new Date().toLocaleTimeString("zh-CN", { hour12: false }),
        title,
        evidence,
      });
      if (step >= 11) this.batchCase.completed = true;
      this.saveBatchCase();
      return true;
    },
    resetBatchCase() {
      if (!this.batchCase) return;
      this.batchCase.currentStep = -1;
      this.batchCase.completed = false;
      this.batchCase.logs = [];
      this.saveBatchCase();
    },
  },
});
