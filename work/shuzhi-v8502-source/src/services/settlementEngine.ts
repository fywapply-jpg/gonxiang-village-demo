export type ScenarioKey = "normal" | "quality" | "callback" | "account";

export interface LedgerState {
  buyerPaid: number;
  institutionPending: number;
  released: number;
  disputed: number;
  refunded: number;
  platformBalance: number;
}

export interface SimulationStep {
  key: string;
  title: string;
  actor: string;
  request: string;
  response: string;
  businessStatus: string;
  fundStatus: string;
  evidence: string;
  control: string;
  level?: "normal" | "warning" | "blocked";
  ledger: LedgerState;
}

export interface SimulationSession {
  scenario: ScenarioKey;
  cursor: number;
  running: boolean;
  steps: SimulationStep[];
}

export const demoTransaction = {
  orderNo: "SZGS-2026-850901",
  contractNo: "CA-HT-2026-850901",
  instructionNo: "PI-850901-0001",
  institutionTradeNo: "BANK-SBX-20260729-000851",
  reconciliationNo: "REC-20260729-850901",
  buyer: "华中商贸采购中心有限公司",
  buyerAccount: "采购方同名对公账户 · 尾号 6628",
  supplier: "赣南优品农业合作社",
  supplierAccount: "供货方同名对公账户 · 尾号 1936",
  institution: "主办银行条件结算服务（仿真）",
  amount: 276000,
  acceptedAmount: 248400,
  disputedAmount: 27600,
  platformBalance: 0,
};

export const scenarioOptions = [
  { key: "normal" as ScenarioKey, name: "正常履约", desc: "全额验收并结算" },
  { key: "quality" as ScenarioKey, name: "部分质量争议", desc: "只暂停争议款" },
  { key: "callback" as ScenarioKey, name: "机构回调延迟", desc: "主动查单后补记" },
  { key: "account" as ScenarioKey, name: "收款账户变更", desc: "拦截后双人复核" },
];

const zero = (): LedgerState => ({
  buyerPaid: 0,
  institutionPending: 0,
  released: 0,
  disputed: 0,
  refunded: 0,
  platformBalance: 0,
});

function ledger(
  buyerPaid: number,
  institutionPending: number,
  released: number,
  disputed = 0,
  refunded = 0,
): LedgerState {
  return { buyerPaid, institutionPending, released, disputed, refunded, platformBalance: 0 };
}

function commonBeforePayment(): SimulationStep[] {
  return [
    {
      key: "order",
      title: "创建唯一交易订单",
      actor: "采购方经办人",
      request: "提交采购清单、成交报价、批次与预算授权",
      response: "生成订单 SZGS-2026-850901，金额 ¥276,000",
      businessStatus: "订单待核验",
      fundStatus: "未发生资金",
      evidence: "订单快照 ORD-SHA256-850901",
      control: "订单号、报价版本和批次不可重复；金额重新计算而非信任前端",
      ledger: zero(),
    },
    {
      key: "kyb",
      title: "双方KYB与账户核验",
      actor: "平台合规岗 + 主办银行",
      request: "核验营业执照、受益所有人、经办授权和对公账户",
      response: "买卖主体、经办权限及同名账户全部匹配",
      businessStatus: "主体准入通过",
      fundStatus: "仍未发生资金",
      evidence: "身份快照 ID-SNAP-850901-V1",
      control: "个人账户、未经约定第三方代付、账户不同名全部拦截",
      ledger: zero(),
    },
    {
      key: "contract",
      title: "CA合同与结算条件生效",
      actor: "采购方 + 供货方",
      request: "签署主合同、质量附件、验收规则和机构结算授权",
      response: "企业CA双签通过，合同与订单金额一致",
      businessStatus: "合同已生效",
      fundStatus: "等待付款指令",
      evidence: "CA-HT-2026-850901 · TSA-850901",
      control: "结算模型、账户、退款、争议款和机构产品必须写入合同",
      ledger: zero(),
    },
    {
      key: "instruction",
      title: "生成机构支付指令",
      actor: "平台资金指令服务",
      request: "向仿真银行网关发送订单、合同、付款人、收款人和金额摘要",
      response: "机构受理 PI-850901-0001，返回一次性付款指引",
      businessStatus: "等待采购方付款",
      fundStatus: "机构指令已创建",
      evidence: "请求签名 SIG-PI-850901 · 幂等键 IDEM-850901",
      control: "请求验签、防重放、幂等；平台只传指令，不接收货款",
      ledger: zero(),
    },
    {
      key: "debit",
      title: "采购方对公付款",
      actor: "采购方付款岗 + 主办银行",
      request: "付款岗提交，复核岗确认，从同名对公账户付款 ¥276,000",
      response: "银行扣款成功，机构交易号 BANK-SBX-20260729-000851",
      businessStatus: "等待机构到账确认",
      fundStatus: "采购方已付 ¥276,000",
      evidence: "银行电子回单 RCPT-850901",
      control: "付款与复核岗位分离；平台账户余额始终为零",
      ledger: ledger(276000, 276000, 0),
    },
  ];
}

function commonFulfillment(startLedger: LedgerState): SimulationStep[] {
  return [
    {
      key: "callback",
      title: "机构异步回调验签",
      actor: "主办银行仿真网关 → 平台后端",
      request: "回调交易号、金额、付款账户摘要和机构状态",
      response: "服务器验签、主动查单、金额核对均通过",
      businessStatus: "订单已付款，允许备货",
      fundStatus: "机构待结算 ¥276,000",
      evidence: "CALLBACK-850901-V1",
      control: "不能凭手机前端成功页改订单；必须以后端回调或主动查单为准",
      ledger: startLedger,
    },
    {
      key: "ship",
      title: "锁批次、复检与出库",
      actor: "供货方 + 仓储质检",
      request: "锁定60吨脐橙批次，完成复检、称重、包装和出库",
      response: "批次 P01/P02/P03 全部出库，物流运单已绑定",
      businessStatus: "运输在途",
      fundStatus: "按本单机构产品保持待结算",
      evidence: "WMS-OUT-850901 · TEST-850901",
      control: "换批、短装、检测不合格或证货不一致不得出库",
      ledger: startLedger,
    },
    {
      key: "deliver",
      title: "运输交付与到货复磅",
      actor: "承运方 + 采购验收岗",
      request: "提交轨迹、温控、电子运单、签收和复磅数据",
      response: "到货60吨，温控达标，进入抽检验收",
      businessStatus: "待质量验收",
      fundStatus: "尚未触发结算",
      evidence: "TMS-850901 · SCALE-850901",
      control: "轨迹断点、失温、异常开箱、复磅差异自动预警",
      ledger: startLedger,
    },
  ];
}

function finalReconcile(endLedger: LedgerState, status: string): SimulationStep {
  return {
    key: "reconcile",
    title: "三账对账与交易关账",
    actor: "平台对账服务 + 主办银行 + 财务",
    request: "核对订单账、机构资金账、商户结算/发票账",
    response: `三账一致，生成 ${demoTransaction.reconciliationNo}`,
    businessStatus: status,
    fundStatus: `已释放 ¥${endLedger.released.toLocaleString()} · 已退款 ¥${endLedger.refunded.toLocaleString()}`,
    evidence: "对账单 REC-20260729-850901 · 结算回单包",
    control: "差异不自动补记、不二次扣款；先查单、复核后再处理",
    ledger: endLedger,
  };
}

export function buildSimulationSteps(scenario: ScenarioKey): SimulationStep[] {
  const start = ledger(276000, 276000, 0);
  const before = commonBeforePayment();
  const fulfillment = commonFulfillment(start);

  if (scenario === "callback") {
    const delayed = {
      ...fulfillment[0],
      key: "callback_delay",
      title: "机构回调超时，订单保持待确认",
      response: "5秒内未收到有效回调，前端成功结果不入账",
      businessStatus: "支付结果待确认",
      fundStatus: "资金状态未知，禁止重复付款",
      evidence: "TIMEOUT-850901 · 告警 ALM-850901",
      control: "冻结的是平台业务状态，不是擅自冻结银行资金",
      level: "warning" as const,
    };
    const query = {
      ...fulfillment[0],
      key: "active_query",
      title: "主动查单与延迟回调补偿",
      actor: "平台后端 → 主办银行仿真网关",
      request: "使用机构交易号主动查询并校验延迟回调",
      response: "机构确认扣款成功，幂等补记一次，不重复扣款",
      evidence: "QUERY-850901 · CALLBACK-850901-V2",
    };
    const accepted = ledger(276000, 0, 276000);
    return [
      ...before,
      delayed,
      query,
      ...fulfillment.slice(1),
      {
        key: "accept",
        title: "全额验收通过",
        actor: "采购验收岗 + 供货方",
        request: "复磅、抽检、留样和发票对账",
        response: "60吨全部合格，可结算金额 ¥276,000",
        businessStatus: "验收通过",
        fundStatus: "生成全额结算指令",
        evidence: "ACCEPT-850901",
        control: "验收标准来自CA合同，采购方不得临时单方加严",
        ledger: start,
      },
      {
        key: "settle",
        title: "机构执行结算",
        actor: "主办银行仿真网关",
        request: "验签已授权结算指令并复核收款账户",
        response: "¥276,000 直达合同收款方，平台未触碰资金",
        businessStatus: "已结算",
        fundStatus: "机构待结算余额 ¥0",
        evidence: "SETTLE-RCPT-850901",
        control: "回单收款主体、金额和合同必须一致",
        ledger: accepted,
      },
      finalReconcile(accepted, "交易正常关闭"),
    ];
  }

  if (scenario === "account") {
    const accepted = ledger(276000, 276000, 0);
    const released = ledger(276000, 0, 276000);
    return [
      ...before,
      ...fulfillment,
      {
        key: "accept",
        title: "全额验收通过",
        actor: "采购验收岗 + 供货方",
        request: "复磅、抽检、留样和发票对账",
        response: "60吨全部合格，可结算金额 ¥276,000",
        businessStatus: "验收通过",
        fundStatus: "等待结算",
        evidence: "ACCEPT-850901",
        control: "验收结果与批次、金额逐项绑定",
        ledger: accepted,
      },
      {
        key: "account_block",
        title: "收款账户临时变更被拦截",
        actor: "平台结算校验服务",
        request: "供货方申请将尾号1936变更为新账户尾号7281",
        response: "账户与合同快照不一致，结算指令未发送",
        businessStatus: "结算暂停待复核",
        fundStatus: "机构待结算 ¥276,000",
        evidence: "BLOCK-ACCT-850901",
        control: "旧联系人单方申请无效；防冒名改卡和截留货款",
        level: "blocked",
        ledger: accepted,
      },
      {
        key: "account_review",
        title: "账户变更双人复核",
        actor: "供货方法人 + 平台复核岗 + 主办银行",
        request: "企业CA重新签署、对公账户四要素核验、原预留电话回拨",
        response: "新账户确认属于同一供货主体，合同补充协议生效",
        businessStatus: "账户变更已授权",
        fundStatus: "允许重新生成结算指令",
        evidence: "CA-ADD-850901 · BANK-VERIFY-7281",
        control: "经办人与复核人分离；账户变更全程留痕",
        ledger: accepted,
      },
      {
        key: "settle",
        title: "机构执行结算",
        actor: "主办银行仿真网关",
        request: "按补充协议和新账户快照执行结算",
        response: "¥276,000 直达已复核的供货方同名对公账户",
        businessStatus: "已结算",
        fundStatus: "机构待结算余额 ¥0",
        evidence: "SETTLE-RCPT-850901",
        control: "平台不改银行账、不手工挪款，只生成可审计指令",
        ledger: released,
      },
      finalReconcile(released, "交易正常关闭"),
    ];
  }

  if (scenario === "quality") {
    const disputed = ledger(276000, 27600, 248400, 27600);
    const closed = ledger(276000, 0, 262200, 0, 13800);
    return [
      ...before,
      ...fulfillment,
      {
        key: "partial_accept",
        title: "部分验收与争议金额拆分",
        actor: "采购验收岗 + 第三方检测",
        request: "P03批次抽检出现等级差异，双方共同留样",
        response: "正常款 ¥248,400；争议款 ¥27,600 单独标记",
        businessStatus: "部分验收通过",
        fundStatus: "正常款可结算，争议款暂停",
        evidence: "ACCEPT-850901-PART · SAMPLE-P03",
        control: "不得因为一个批次争议无限期暂停整笔订单",
        level: "warning",
        ledger: start,
      },
      {
        key: "partial_settle",
        title: "机构结算无争议款",
        actor: "主办银行仿真网关",
        request: "提交 ¥248,400 结算指令和 ¥27,600 争议标记",
        response: "¥248,400 已直达合同收款方，仅 ¥27,600 保持待处理",
        businessStatus: "正常部分已结算",
        fundStatus: "机构争议待处理 ¥27,600",
        evidence: "SETTLE-RCPT-850901-A",
        control: "平台不扩大暂停范围，机构按实际产品和授权执行",
        ledger: disputed,
      },
      {
        key: "resolve",
        title: "复检判责与退款协议",
        actor: "买卖双方 + 复检机构",
        request: "复检确认部分降级，双方CA签署折价与退款协议",
        response: "争议款中 ¥13,800 补付供方，¥13,800 原路退回采购方",
        businessStatus: "争议已解决",
        fundStatus: "等待机构执行补结算及退款",
        evidence: "DISPUTE-RESOLVE-850901",
        control: "退款必须有合同、协商书或生效处理结论",
        ledger: disputed,
      },
      {
        key: "refund",
        title: "机构补结算并原路退款",
        actor: "主办银行仿真网关",
        request: "验签争议处理指令，核对原交易与退款金额",
        response: "¥13,800 补付供方；¥13,800 原路退回采购方",
        businessStatus: "资金处理完成",
        fundStatus: "机构待处理余额 ¥0",
        evidence: "SETTLE-RCPT-850901-B · REFUND-850901",
        control: "退款不经过平台账户，不得改付无关第三方",
        ledger: closed,
      },
      finalReconcile(closed, "争议关闭，交易关账"),
    ];
  }

  const released = ledger(276000, 0, 276000);
  return [
    ...before,
    ...fulfillment,
    {
      key: "accept",
      title: "全额验收通过",
      actor: "采购验收岗 + 供货方",
      request: "复磅、抽检、留样、签收、发票与对账单齐备",
      response: "60吨全部合格，可结算金额 ¥276,000",
      businessStatus: "验收通过",
      fundStatus: "生成全额结算指令",
      evidence: "ACCEPT-850901",
      control: "验收标准来自CA合同，采购方不得临时单方加严",
      ledger: start,
    },
    {
      key: "settle",
      title: "机构执行全额结算",
      actor: "主办银行仿真网关",
      request: "验签结算指令，复核合同、验收、发票和收款账户",
      response: "¥276,000 直达合同收款方，机构返回结算回单",
      businessStatus: "已结算",
      fundStatus: "机构待结算余额 ¥0",
      evidence: "SETTLE-RCPT-850901",
      control: "平台不收货款、不设资金池、不做二次清算",
      ledger: released,
    },
    finalReconcile(released, "交易正常关闭"),
  ];
}

export function createSimulation(scenario: ScenarioKey = "normal"): SimulationSession {
  return { scenario, cursor: -1, running: false, steps: buildSimulationSteps(scenario) };
}

