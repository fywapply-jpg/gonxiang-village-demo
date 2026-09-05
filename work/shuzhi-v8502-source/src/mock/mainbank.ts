// 主办银行制：单项业务由竞标中标的主办银行行内承接

export interface MainBank { short: string; name: string; rate: string; }

// 各类业务的中标主办行（演示：由银行竞标择优产生）
const map: { key: string; bank: MainBank }[] = [
  { key: "订单贷", bank: { short: "农行", name: "中国农业银行", rate: "3.85%" } },
  { key: "农资", bank: { short: "农行", name: "中国农业银行", rate: "3.80%" } },
  { key: "仓单", bank: { short: "邮储", name: "邮政储蓄银行", rate: "4.10%" } },
  { key: "保理", bank: { short: "农发", name: "农业发展银行", rate: "3.90%" } },
  { key: "账期", bank: { short: "农信", name: "省农村信用社", rate: "4.20%" } },
  { key: "采购", bank: { short: "农信", name: "省农村信用社", rate: "4.20%" } },
];

export function mainBankOf(name: string): MainBank {
  const hit = map.find((m) => (name || "").includes(m.key));
  return hit ? hit.bank : { short: "农行", name: "中国农业银行", rate: "3.85%" };
}
