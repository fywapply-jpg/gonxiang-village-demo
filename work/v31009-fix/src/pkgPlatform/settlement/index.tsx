import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { useState } from 'react';
import { PAY_MODE } from '../../config/payment';
import './index.css';

// —— 平台支付结算系统 · 流程与规则（公开可看、无角色守卫）——
// 金融蓝 / 靛蓝主题，区别于 共富(金) / web3(深色) / 社会公益(红) / 分销推广(绿)

type Part = { t: string; em?: boolean };
const flat = (parts: Part[]): string => parts.map(p => p.t).join('');

// HERO 徽章
const BADGES: string[] = ['银行监管存管', '资金不入私账', '智能合约锁比例', '退货期资金冻结', 'T+1 清分'];

// ① 系统架构 · 5 层
const ARCH: { icon: string; t: string; d: string; chips?: string[] }[] = [
  { icon: '🧾', t: '收银收单层', d: '多渠道统一收单', chips: ['微信支付', '支付宝', '数字人民币', '银行卡', '贡献值抵扣'] },
  { icon: '🏦', t: '银行存管层', d: '商业银行监管专户，资金存管、平台无权动用（不碰钱）' },
  { icon: '🔗', t: '智能分账层', d: '智能合约引擎：预设比例自动拆分、人工不可篡改' },
  { icon: '⚡', t: '清结算层', d: 'T+1 清分、代付代发、多账户清算' },
  { icon: '🛡️', t: '对账风控层', d: '实时三方对账、风控反洗钱、全程上链存证' },
];

// ② 支付结算流程 · 7 步
const STEPS: { t: string; d: string }[] = [
  { t: '用户下单 · 选支付方式', d: '可用贡献值抵扣 ≤ 30% 货款' },
  { t: '支付 · 资金进银行监管专户', d: '平台不碰钱，全程托管在持牌银行专户' },
  { t: '订单确认 → 触发分账', d: '收货 / 服务完成；可退商品还需 7 天无理由退货期届满' },
  { t: '智能合约按预设比例自动拆分', d: '前置四金 35% + 生产端 70/30 + 平台服务费 ≤ 毛利 12%' },
  { t: 'T+1 清分', d: '拆分到各方账户' },
  { t: '到账通知', d: '直划社保卡 / 银行卡 / 平台账户' },
  { t: '全程上链存证', d: '可对账、可溯源' },
];

// ③ 支付方式 · 费率与到账（INTERACTIVE，默认微信支付）
const PAYS: { key: string; icon: string; name: string; badge: string; detail: string; zero?: boolean }[] = [
  { key: 'wx', icon: '💚', name: '微信支付', badge: '0.6%', detail: '通道费 0.6% · 资金实时进监管专户 · T+1 分账' },
  { key: 'ali', icon: '🔷', name: '支付宝', badge: '0.6%', detail: '通道费 0.6% · 实时进监管专户 · T+1 分账' },
  { key: 'dcep', icon: '💴', name: '数字人民币', badge: '0 费率', detail: '通道费 0% · 链上清分 · 即时到账', zero: true },
  { key: 'card', icon: '💳', name: '银行卡', badge: '~0.5%', detail: '通道费 ~0.5% · T+1' },
  { key: 'contrib', icon: '⭐', name: '贡献值抵扣', badge: '≤ 30%', detail: '抵扣 ≤ 30% 货款 · 即时冲抵 · 不可提现' },
];

// ④ 退货期与结算的衔接（重点章节）
const RETURN: { icon: string; t: string; parts: Part[] }[] = [
  {
    icon: '🥬', t: '生鲜农产品', parts: [
      { t: '（签收即成交，不支持 7 天无理由）：确认收货后 ' }, { t: 'T+1', em: true },
      { t: ' 结算；农户保底收购款验收合格' }, { t: '实时', em: true }, { t: '到账。' },
    ],
  },
  {
    icon: '📦', t: '标品 / 日用', parts: [
      { t: '（支持 7 天无理由退货）：' }, { t: '“确认收货 + 7 天无理由期届满”', em: true },
      { t: ' 后 ' }, { t: 'T+1', em: true }, { t: ' 结算；退货期内资金在' },
      { t: '银行监管专户冻结挂账、不下发', em: true }, { t: '。' },
    ],
  },
  {
    icon: '🧰', t: '服务类', parts: [
      { t: '：服务完成 + 评价 / 异议期结束后结算。' },
    ],
  },
  {
    icon: '↩️', t: '退货自动冲正', parts: [
      { t: '：退货期内退款，原路退回买家，已预记的分账与消费贡献值' },
      { t: '自动冲正撤回', em: true }, { t: '。' },
    ],
  },
  {
    icon: '🛡️', t: '风险准备金兜底', parts: [
      { t: '：前置“风险兜底基金 5%”覆盖极少数已结算后的退货 / 坏账，从后续结算或准备金冲抵。' },
    ],
  },
  {
    icon: '👨‍🌾', t: '保底款保护', parts: [
      { t: '：农户保底收购款一经验收到账，' }, { t: '不因买家退货而追回', em: true },
      { t: '，退货损耗由平台 / 风险金承担，保护农户不担销售风险。' },
    ],
  },
];

// ⑤ 到账周期
const ARRIVE: { type: string; time: string; chan: string }[] = [
  { type: '农户保底收购款', time: '验收合格 · 实时', chan: '银行专户直付' },
  { type: '销售溢价分成（70% 农户 / 30% 村集体）', time: '退货期届满后 T+1', chan: '智能分账' },
  { type: '劳务报酬（分拣 / 配送 / 站长）', time: '每周结算', chan: '银行代发' },
  { type: '消费贡献值', time: '确认收货 · 实时（退货冲正）', chan: '平台账户' },
  { type: '集体贡献值', time: '按月', chan: '平台账户' },
  { type: '前置四项专项基金', time: '按月归集', chan: '专用子账户' },
  { type: '年度股权分红', time: '次年 3 月底前', chan: '社保卡 / 银行卡' },
];

// ⑥ 结算规则要点（加粗关键数字）
const RULES: Part[][] = [
  [{ t: '分账基数 = ' }, { t: '毛利额', em: true }, { t: '（交易实收 − 采购成本）' }],
  [{ t: '前置四金 ' }, { t: '35%', em: true }, { t: '（产业发展 15% / 风险兜底 5% / 公益专项 3% / 运营运维 12%）' }],
  [{ t: '生产端：保底收购高于市场均价 ' }, { t: '5%–8%', em: true }, { t: ' · 溢价分成 ' }, { t: '70% 农户 / 30% 村集体', em: true }],
  [{ t: '平台服务费 / 运维 ' }, { t: '≤ 毛利 12% 红线', em: true }],
  [{ t: '贡献值抵扣 ' }, { t: '≤ 30% 货款', em: true }],
  [{ t: '提现：农户 / 店主提现到银行卡，' }, { t: 'T+1、0 手续费', em: true }, { t: '（平台补贴通道费）' }],
  [{ t: '年度可分配利润 ' }, { t: '< 50 万当年不分红', em: true }, { t: '，结转下年' }],
];

// ⑦ 对账 · 退款 · 风控 · 存证
const RECON: { icon: string; t: string; d: string }[] = [
  { icon: '📊', t: '实时对账', d: '收单 ↔ 存管 ↔ 平台三方逐笔对账，日终总对账，差错自动挂起复核' },
  { icon: '↩️', t: '退款', d: '未发货 T+0~T+1 原路退回；退货期内退款自动冲正分账；已结算后退货由风险金兜底' },
  { icon: '🚨', t: '风控', d: '大额人工复核 · 限额 · 反洗钱 · 异常预警；争议资金可临时冻结待仲裁' },
  { icon: '🔒', t: '存证', d: '每笔交易 + 分账 + 清分全程上链，不可篡改，司法可调证取证' },
];

// ⑧ 安全合规
const COMPLY: { icon: string; t: string }[] = [
  { icon: '🏦', t: '银行存管 · 持牌监管专户' },
  { icon: '🚫', t: '不设资金池 · 不二次清算（避“二清”）· 走持牌通道' },
  { icon: '🔐', t: '国密加密 · 等保三级 · 上链存证' },
  { icon: '💴', t: '对接央行数字人民币' },
];

export default function SettlementPage() {
  const [pay, setPay] = useState<string>('wx');

  useLoad(() => {
    Taro.setNavigationBarTitle({ title: '支付结算' });
  });

  const cur = PAYS.find(p => p.key === pay) || PAYS[0];

  const archInfo = (a: (typeof ARCH)[number]) => {
    Taro.showModal({
      title: `${a.icon} ${a.t}`,
      content: a.chips ? `${a.d}\n\n收单渠道：${a.chips.join(' · ')}` : a.d,
      showCancel: false,
      confirmText: '知道了',
    });
  };
  const retInfo = (r: (typeof RETURN)[number]) => {
    Taro.showModal({ title: `${r.icon} ${r.t}`, content: flat(r.parts), showCancel: false, confirmText: '知道了' });
  };
  const reconInfo = (r: (typeof RECON)[number]) => {
    Taro.showModal({ title: `${r.icon} ${r.t}`, content: r.d, showCancel: false, confirmText: '知道了' });
  };

  return (
    <ScrollView scrollY className="page">
      <View className="bg">
        {/* HERO */}
        <View className="hero">
          <Text className="hero-t">💳 平台支付结算系统</Text>
          <Text className="hero-s">银行监管存管 · 智能分账 · T+1 清分 · 全程可溯</Text>
          <Text style={{ display: 'block', marginTop: '14rpx', fontSize: '22rpx', color: '#dbeafe' }}>
            当前状态：{PAY_MODE === 'disabled' ? '支付通道未接入 · 不产生模拟成功状态' : PAY_MODE === 'mock' ? '显式演示模拟通道 · 未发生真实扣款' : '已切换真实支付通道 · 仍以银行/支付机构验收结果为准'}
          </Text>
          <View className="badges">
            {BADGES.map(b => (
              <View key={b} className="badge"><Text className="badge-t">{b}</Text></View>
            ))}
          </View>
        </View>

        {/* ① 系统架构 · 5 层 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text className="sec-no-t">1</Text></View>
            <Text className="sec-t">🏗️ 系统架构 · 五层</Text>
          </View>
          <Text className="sec-lead">从收单到清分，五层纵向贯通——收单在最上，资金托管在银行，分账靠智能合约，清结算 T+1，风控对账全程护航。</Text>
          <View className="arch">
            {ARCH.map((a, i) => (
              <View key={a.t}>
                <View className="arch-item" onClick={() => archInfo(a)}>
                  <View className="arch-h">
                    <Text className="arch-i">{a.icon}</Text>
                    <View className="arch-hb">
                      <Text className="arch-t">{a.t}</Text>
                      <Text className="arch-d">{a.d}</Text>
                    </View>
                  </View>
                  {a.chips ? (
                    <View className="arch-chips">
                      {a.chips.map(c => (<Text key={c} className="arch-chip">{c}</Text>))}
                    </View>
                  ) : null}
                </View>
                {i < ARCH.length - 1 ? <Text className="arch-conn">▼</Text> : null}
              </View>
            ))}
          </View>
        </View>

        {/* ② 支付结算流程 · 7 步 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text className="sec-no-t">2</Text></View>
            <Text className="sec-t">🧭 支付结算流程</Text>
          </View>
          <Text className="sec-lead">一笔钱从付款到到账，走完这 7 步——关键是资金先进银行专户、可退商品过了退货期才分账。</Text>
          <View className="steps">
            {STEPS.map((s, i) => (
              <View key={s.t} className="step">
                <View className="step-no"><Text className="step-no-t">{i + 1}</Text></View>
                <View className="step-b">
                  <Text className="step-t">{s.t}</Text>
                  <Text className="step-d">{s.d}</Text>
                </View>
                {i < STEPS.length - 1 ? <View className="step-line" /> : null}
              </View>
            ))}
          </View>
        </View>

        {/* ③ 支付方式 · 费率与到账（INTERACTIVE） */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text className="sec-no-t">3</Text></View>
            <Text className="sec-t">💠 支付方式 · 费率与到账</Text>
          </View>
          <Text className="sec-lead">不同渠道费率与到账不同——数字人民币 0 费率，通道费由平台运营金承担，用户 0 手续费。</Text>
          <View className="pays">
            {PAYS.map(p => (
              <View
                key={p.key}
                className={`pay ${pay === p.key ? 'pay-on' : ''} ${p.zero ? 'pay-zero' : ''}`}
                onClick={() => setPay(p.key)}
              >
                <Text className="pay-i">{p.icon}</Text>
                <Text className="pay-name">{p.name}</Text>
                <Text className="pay-badge">{p.badge}</Text>
              </View>
            ))}
          </View>
          <View className="pay-detail">
            <Text className="pay-detail-n">{cur.icon} {cur.name}</Text>
            <Text className="pay-detail-d">{cur.detail}</Text>
          </View>
        </View>

        {/* ④ 退货期与结算的衔接（重点 · 醒目） */}
        <View className="sec sec-hl">
          <View className="sec-h">
            <View className="sec-no sec-no-hl"><Text className="sec-no-t">4</Text></View>
            <Text className="sec-t">🔒 退货期与结算的衔接</Text>
            <Text className="sec-key">重点</Text>
          </View>
          <View className="rp-lead">
            <Text className="rp-lead-t">关键：T+1 指“结算触发事件”之后的 T+1，不是付款后 T+1。可退商品的资金，在 7 天无理由退货期内一直冻结在银行监管专户、不下发——从制度上杜绝“钱已分完、货又退了”。</Text>
          </View>
          <View className="rp-cards">
            {RETURN.map(r => (
              <View key={r.t} className="rp-card" onClick={() => retInfo(r)}>
                <Text className="rp-i">{r.icon}</Text>
                <Text className="rp-x">
                  <Text className="rp-t">{r.t}</Text>
                  {r.parts.map((p, j) => (
                    <Text key={j} className={p.em ? 'em' : ''}>{p.t}</Text>
                  ))}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ⑤ 到账周期 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text className="sec-no-t">5</Text></View>
            <Text className="sec-t">⏱️ 到账周期</Text>
          </View>
          <View className="tbl">
            <View className="tbl-row tbl-head">
              <Text className="tb-type">款项类型</Text>
              <Text className="tb-time">到账时效</Text>
              <Text className="tb-chan">结算通道</Text>
            </View>
            {ARRIVE.map(a => (
              <View key={a.type} className="tbl-row">
                <Text className="tb-type">{a.type}</Text>
                <Text className="tb-time">{a.time}</Text>
                <Text className="tb-chan">{a.chan}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ⑥ 结算规则要点 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text className="sec-no-t">6</Text></View>
            <Text className="sec-t">📐 结算规则要点</Text>
          </View>
          <View className="rules">
            {RULES.map((parts, i) => (
              <View key={i} className="rule">
                <Text className="rule-dot">✓</Text>
                <Text className="rule-x">
                  {parts.map((p, j) => (
                    <Text key={j} className={p.em ? 'em' : ''}>{p.t}</Text>
                  ))}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ⑦ 对账 · 退款 · 风控 · 存证 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text className="sec-no-t">7</Text></View>
            <Text className="sec-t">🛡️ 对账 · 退款 · 风控 · 存证</Text>
          </View>
          <View className="recon">
            {RECON.map(r => (
              <View key={r.t} className="rc" onClick={() => reconInfo(r)}>
                <Text className="rc-i">{r.icon}</Text>
                <Text className="rc-t">{r.t}</Text>
                <Text className="rc-d">{r.d}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ⑧ 安全合规 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text className="sec-no-t">8</Text></View>
            <Text className="sec-t">🔐 安全合规</Text>
          </View>
          <View className="comply">
            {COMPLY.map(c => (
              <View key={c.t} className="cp">
                <Text className="cp-i">{c.icon}</Text>
                <Text className="cp-t">{c.t}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text className="foot">本页为平台支付结算系统流程与规则演示示意，实际以持牌银行存管协议与平台正式结算规则为准。</Text>
      </View>
    </ScrollView>
  );
}
