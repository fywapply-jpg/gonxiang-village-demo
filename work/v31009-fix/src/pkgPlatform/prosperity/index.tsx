import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { useState } from 'react';
import './index.css';

// —— 全民共富分配机制 · 白皮书（公开可看、无角色守卫）——
// 暖金 / 丰收主题，区别于 web3（深色）/ 社会公益（红）/ 分销推广（绿）

// HERO 徽章
const BADGES: string[] = ['银行监管专户', '智能分账 T+1', '区块链存证', '三分之二民主表决'];

// ① 成员确权（第一~三条）
const MEMBERS: { icon: string; t: string; d: string; tag: string; hl?: boolean }[] = [
  { icon: '🌾', t: '村集体成员', tag: '户籍 / 常住农户', d: '户籍在本村的村民 + 常住满 6 个月、参与集体生产经营的外来农户；凭身份信息开立专属个人账户。' },
  { icon: '🏙️', t: '社区居民成员', tag: '居住登记开户', d: '辖区内常住居民，凭居住登记开户；享消费贡献值累计 + 普惠分红资格。' },
  { icon: '🤲', t: '特殊群体兜底', tag: '无需出资 · 分红上浮 20%', hl: true, d: '低保户 / 特困供养 / 重度残疾人；由村集体公益金代享基础权益，无需出资，同等享贡献值累计与分红，分红标准上浮 20%。' },
];

// 村集体持股确权 · 三维权重
const WEIGHTS: { label: string; pct: number }[] = [
  { label: '常住人口', pct: 40 },
  { label: '集体经营性资产（闲置场地 / 服务站点 / 农机设备）评估作价', pct: 30 },
  { label: '年度农产品供给量 + 协同治理贡献度', pct: 30 },
];

// ② 贡献值 · 四类获取规则
const EARN: { icon: string; t: string; d: string }[] = [
  { icon: '🌾', t: '生产供给（农户）', d: '供货额 12% 随收购款到账；标准化种植 / 绿色认证 / 产业培训单次 50–200；分拣配送农机劳务按报酬 8% 额外累计。' },
  { icon: '🛒', t: '消费参与（城乡居民）', d: '生鲜 10% / 日用百货 6% / 农资农具 12%，支付完成实时到账；推荐新用户完成首单 30/人；满意度调研 / 商品监督反馈单次 10–50。' },
  { icon: '🤝', t: '集体协同（村集体 / 社区）', d: '场地人力协助落地服务站 / 产销对接按贡献度累计；组织集中供货 / 团购按月交易规模阶梯奖励；公益帮扶 / 政策宣传单次 100–500 集体贡献值。' },
  { icon: '❤️', t: '公益服务（全体成员）', d: '助农志愿 / 社区服务 / 乡村治理按 10 贡献值 / 小时；捐赠进公益池等额计入个人公益贡献值；带动困难农户就业增收给专项奖励。' },
];

// ② 贡献值 · 五大使用范围
const USE: { icon: string; t: string; d: string }[] = [
  { icon: '🏷️', t: '消费抵扣', d: '所有商品服务最高按 30% 抵扣货款' },
  { icon: '🎟️', t: '服务兑换', d: '养老体检 / 青少年体育课程 / 农技培训 / 乡村文旅体验' },
  { icon: '🧾', t: '费用代缴', d: '物业费 / 水电费 / 城乡居民医保代缴手续费' },
  { icon: '⬆️', t: '权益升级', d: '年度贡献值排名前 20% 享优先供货、专属折扣、额外分红资格' },
  { icon: '🎁', t: '公益转赠', d: '捐至公益池，定向帮扶困难群体 / 乡村公共设施建设' },
];

// ③ 计算器 · 预设
const AMTS: number[] = [100, 500, 1000, 5000];
const RATES: number[] = [0.5, 0.6, 0.7];

// ③ 毛利额再分 · 四大前置专项基金（占毛利比）
const FUNDS: { icon: string; name: string; pct: number; desc: string }[] = [
  { icon: '🏭', name: '产业发展准备金', pct: 15, desc: '仓储冷链 / 服务站升级 / 新产业孵化 / 农资补贴' },
  { icon: '🛡️', name: '风险兜底基金', pct: 5, desc: '滞销托底 / 灾害补贴 / 低收入农户临时帮扶' },
  { icon: '❤️', name: '公益专项基金', pct: 3, desc: '青少年体育 / 老年助餐 / 助学 / 特殊群体帮扶' },
  { icon: '⚙️', name: '运营运维准备金', pct: 12, desc: '人员薪酬 / 物流仓储 / 系统运维 / 站点房租水电' },
];

// ③ 生产端按劳分配（第七条）
const PROD: { t: string; d: string }[] = [
  { t: '保底收购', d: '主粮 / 蔬果 / 畜禽保底价，高于同期本地市场均价 5%–8%，验收合格实时拨付个人银行账户。' },
  { t: '销售溢价分成', d: '终端增值毛利扣直接成本后 → 70% 返供货农户（按供货量精准拆分）/ 30% 划村集体账户。' },
  { t: '劳务报酬', d: '分拣 / 配送 / 村级站长按工时计件，每周自动结算，同步累计贡献值。' },
];

// ④ 可分配利润核算顺序
const ORDER: string[] = ['弥补以前年度亏损', '提取 10% 法定公积金', '剩余为可分配利润按股权分红'];

// ④ 四池分红（股权比例 100%）
const POOLS: { name: string; pct: number; desc: string }[] = [
  { name: '平台运营方', pct: 35, desc: '跨区域供应链拓展 / 平台迭代 / 模式复制推广。' },
  { name: '村集体联合社', pct: 30, desc: '按各村年度贡献度拆分；各村分红 60% 全民普惠人头均分 / 40% 留村集体公积公益金。' },
  { name: '全民普惠成员池', pct: 25, desc: '90% 按确权成员人头均等分配；10% 贡献值专项激励（年度排名前 10% 上浮 50%、10%–30% 上浮 20%）；困难群体基础分红上浮 20%（从风险兜底基金列支）。' },
  { name: '运营激励池', pct: 10, desc: '与年度考核挂钩（助农增收完成率 / 营收完成率 / 群众满意度 各 1/3）；达标全额，超额最高上浮 20%，未达标按比例扣减；基层站点人员分红不低于 40%，向一线倾斜。' },
];

// ④ 执行流程 5 步
const FLOW: { t: string; d: string }[] = [
  { t: '审计核算', d: '次年 1 月 · 第三方会所' },
  { t: '方案制定', d: '共富工作专班' },
  { t: '民主表决', d: '村 / 居民代表大会 2/3 以上通过' },
  { t: '公示异议', d: '全域公示 7 天，推送个人明细' },
  { t: '批量兑付', d: '次年 3 月底前，直划社保卡 / 银行卡 + 到账通知' },
];

// ⑥ 数字化 · 三大内置模块
const MODULES: { icon: string; t: string; d: string }[] = [
  { icon: '⛓', t: '区块链溯源模块', d: '种养 / 收购 / 仓储 / 销售全链路数据上链存证，作为分配核算唯一依据。' },
  { icon: '💠', t: '智能分账模块', d: '预设比例与兑付路径，自动拆分，全程可查，异常实时预警。' },
  { icon: '⭐', t: '贡献值核算模块', d: '自动统计四类贡献值，实时更新余额，使用 / 捐赠 / 兑换全程留痕。' },
];

// ⑥ 三级公开公示
const DISCLOSE: { icon: string; t: string; d: string }[] = [
  { icon: '📱', t: '个人端', d: '小程序实时查交易 / 贡献值 / 分红 / 公益进展。' },
  { icon: '📺', t: '村级端', d: '服务站公示大屏，每日更新流水 / 收益 / 分账。' },
  { icon: '🌐', t: '全域端', d: '每月共富分配月报，每年共富分配白皮书，全量数据可查。' },
];

// ⑨ 三级监督
const SUPERVISE: { icon: string; t: string; d: string }[] = [
  { icon: '🎗️', t: '党建监督', d: '联合党委统领，把控政策方向与共富定位。' },
  { icon: '👥', t: '群众监督', d: '每村 / 社区推选 3–5 名成员代表组成监督小组，每月核查，有权质询整改。' },
  { icon: '🏢', t: '行业监督', d: '属地供销监事会每季度专项检查。' },
];

// [NEW-A] 共富一体化闭环 · 5 节点循环
const CYCLE: string[] = ['多元增收', '攒社会贡献值', '平台智能分账 + 年度分红', '全民共享·人人有份', '再投入乡村（公积/公益金）'];

// [NEW-B] ③ 平台增收引擎矩阵 · 八大板块
const ENGINES: { icon: string; board: string; way: string; who: string; link: string; arrive: string }[] = [
  { icon: '🛒', board: '供享大集', way: '农户上架卖货 · 居民消费返利', who: '农户 / 居民', link: '供货 12% · 消费 10% 攒值', arrive: '货款 T+1' },
  { icon: '🌾', board: '兴农供销', way: '保底收购 + 销售溢价 70% 分成', who: '供货农户', link: '供货额攒值', arrive: '收购款实时' },
  { icon: '🚜', board: '农机租赁 · 农技', way: '闲置农机出租 · 技能服务', who: '农户 / 能人', link: '劳务报酬 8% 攒值', arrive: '每周结算' },
  { icon: '👥', board: '团购 · 预售', way: '集中团购 · 鲜食预售订单', who: '居民 / 农户', link: '组织攒集体贡献值', arrive: '成交结算' },
  { icon: '📣', board: '推广分销', way: '集体组织推广拿佣金', who: '村 / 社区集体', link: '4:6 分佣（平台 4 · 组织 6）', arrive: '佣金结算' },
  { icon: '❤️', board: '社会公益', way: '志愿服务 · 公益捐赠', who: '全体成员', link: '10 值/小时 · 捐赠等额计值', arrive: '贡献值到账' },
  { icon: '💼', board: '就业用工', way: '平台派工 · 灵活岗位', who: '村民', link: '劳务攒值', arrive: '工资结算' },
  { icon: '🏦', board: '普惠金融 · 文旅', way: '助农金融 · 乡村文旅经营', who: '农户 / 居民', link: '经营 / 消费攒值', arrive: '对应结算' },
];

// [NEW-C] ② 社会贡献值 · 四闭环
const LOOP4: { dot: string; t: string; chips?: string[]; text?: string; foot?: string }[] = [
  { dot: '🔵', t: '来源闭环 · 从哪来', chips: ['生产供给', '消费参与', '集体协同', '公益服务', '推广分销', '治理参与'], foot: '六条线汇入一个账户。' },
  { dot: '🟢', t: '兑现闭环 · 变成啥', chips: ['①消费抵扣 ≤ 30%', '②服务兑换(体检/体育课/农技培训)', '③费用代缴(物业/水电/医保)', '④权益升级(前20%优先供货·专属折扣)', '⑤分红加成(排名前10%↑50%)', '⑥公益转赠'], foot: '看得见摸得着。' },
  { dot: '🟠', t: '时效闭环 · 会滚动', text: '每笔按时间戳滚动 12 个月计有效值，保级 / 降级，不一劳永逸。' },
  { dot: '🔴', t: '放大闭环 · 能生钱', text: '年度分红按贡献值排名加成（前 10%↑50%、10~30%↑20%），困难群体↑20%——贡献值直接变真金白银。' },
];

// [NEW-D] ⑦ 共富分配六项规范红线
const REDLINES: string[] = [
  '银行监管专户 · 资金不入平台私账',
  '智能合约锁定分配比例 · 人工不可篡改',
  '平台运维 / 管理费 ≤ 毛利 12% 红线',
  '年度可分配利润 < 50 万 当年不分红 · 结转下年',
  '分配方案 2/3 代表大会表决 + 全域公示 7 天',
  '全流程上链存证 · 个人 / 村级 / 全域三级公开',
];

const fmt = (n: number): string => '¥' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export default function ProsperityPage() {
  const [amount, setAmount] = useState<number>(1000);
  const [costRate, setCostRate] = useState<number>(0.6);

  useLoad(() => {
    Taro.setNavigationBarTitle({ title: '共富分配' });
  });

  const cost = Math.round(amount * costRate);
  const gross = amount - cost;
  const fundVals = FUNDS.map(f => Math.round((gross * f.pct) / 100));
  const preSum = fundVals.reduce((a, b) => a + b, 0);
  const profit = gross - preSum;

  const memInfo = (m: { t: string; d: string }) => {
    Taro.showModal({ title: `👥 ${m.t}`, content: m.d, showCancel: false, confirmText: '知道了' });
  };
  const fundInfo = (f: { icon: string; name: string; pct: number; desc: string }, v: number) => {
    Taro.showModal({
      title: `${f.icon} ${f.name}`,
      content: `占毛利 ${f.pct}%\n本次计提：${fmt(v)}（毛利 ${fmt(gross)} × ${f.pct}%）\n\n用途：${f.desc}\n\n数值为演示示意，实际以链上智能分账为准。`,
      showCancel: false,
      confirmText: '知道了',
    });
  };
  const poolInfo = (p: { name: string; pct: number; desc: string }) => {
    Taro.showModal({ title: `📊 ${p.name} · ${p.pct}%`, content: p.desc, showCancel: false, confirmText: '知道了' });
  };

  return (
    <ScrollView scrollY className="page">
      <View className="bg">
        {/* HERO */}
        <View className="hero">
          <Text className="hero-t">🌾 全民共富分配机制</Text>
          <Text className="hero-s">人人有份 · 按劳分配 · 多劳多得 · 困有所扶</Text>
          <Text className="hero-tag">一个平台 · 一条贡献值主线 · 把多元增收串成一体</Text>
          <View className="badges">
            {BADGES.map(b => (
              <View key={b} className="badge"><Text className="badge-t">{b}</Text></View>
            ))}
          </View>
        </View>

        {/* [NEW-A] 共富一体化闭环 · 总览 banner（无编号） */}
        <View className="loop">
          <Text className="loop-t">🔄 共富一体化闭环</Text>
          <View className="loop-nodes">
            {CYCLE.map((n, i) => (
              <View key={n} className="loop-item">
                <View className="loop-node"><Text className="loop-node-t">{n}</Text></View>
                {i < CYCLE.length - 1
                  ? <Text className="loop-arr">→</Text>
                  : <Text className="loop-arr loop-arr-back">↺</Text>}
              </View>
            ))}
          </View>
          <Text className="loop-cap">所有增收方式先记成社会贡献值，再经即时分账与年度分红分到人，村集体公积公益金反哺乡村——形成“增收→记值→分配→共享→再投入”的共富闭环。</Text>
        </View>

        {/* ① 成员确权 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text className="sec-no-t">1</Text></View>
            <Text className="sec-t">👥 成员确权</Text>
            <Text className="sec-law">第一~三条</Text>
          </View>
          <View className="mems">
            {MEMBERS.map(m => (
              <View key={m.t} className={`mem ${m.hl ? 'mem-hl' : ''}`} onClick={() => memInfo(m)}>
                <View className="mem-h">
                  <Text className="mem-i">{m.icon}</Text>
                  <View className="mem-hb">
                    <Text className="mem-t">{m.t}</Text>
                    <Text className={`mem-tag ${m.hl ? 'mem-tag-hl' : ''}`}>{m.tag}</Text>
                  </View>
                </View>
                <Text className="mem-d">{m.d}</Text>
              </View>
            ))}
          </View>

          {/* 村集体持股确权 · 三维权重 */}
          <View className="wcard">
            <Text className="wcard-t">🏘️ 村集体持股确权</Text>
            <Text className="wcard-s">三维权重动态核算，每年年末调整一次</Text>
            {WEIGHTS.map(w => (
              <View key={w.label} className="wrow">
                <View className="wrow-h">
                  <Text className="wlbl">{w.label}</Text>
                  <Text className="wpct">{w.pct}%</Text>
                </View>
                <View className="wtrack"><View className="wfill" style={{ width: `${w.pct}%` }} /></View>
              </View>
            ))}
            <Text className="wfoot">确权结果全村公示 7 天无异议后录入平台集体账户，作为年度分红核算依据。</Text>
          </View>
        </View>

        {/* ② 社会贡献值的具体体现 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text className="sec-no-t">2</Text></View>
            <Text className="sec-t">⭐ 社会贡献值的具体体现</Text>
            <Text className="sec-law">第四~五条</Text>
          </View>
          <Text className="sec-lead">社会贡献值 = 全平台统一的“付出记账凭证”，1 贡献值 = 0.01 元；从各板块攒起、在生活里兑现、随时间滚动、靠分红放大——一条主线贯穿共富全流程。</Text>
          <View className="banner">
            <Text className="banner-t">1 贡献值 = 0.01 元可分配权益</Text>
            <Text className="banner-s">不可直接提现 · 平台账户内流转、永久可查</Text>
          </View>

          <Text className="sub-lbl">贡献值四闭环 · 一条主线看得见</Text>
          <View className="loop4">
            {LOOP4.map(l => (
              <View key={l.t} className="l4">
                <Text className="l4-t">{l.dot} {l.t}</Text>
                {l.chips ? (
                  <View className="l4-chips">
                    {l.chips.map(c => <Text key={c} className="l4-chip">{c}</Text>)}
                  </View>
                ) : null}
                {l.text ? <Text className="l4-d">{l.text}</Text> : null}
                {l.foot ? <Text className="l4-foot">{l.foot}</Text> : null}
              </View>
            ))}
          </View>

          <Text className="sub-lbl">四类获取规则</Text>
          <View className="grid2">
            {EARN.map(e => (
              <View key={e.t} className="ecard">
                <Text className="ecard-i">{e.icon}</Text>
                <Text className="ecard-t">{e.t}</Text>
                <Text className="ecard-d">{e.d}</Text>
              </View>
            ))}
          </View>

          <Text className="sub-lbl">五大使用范围</Text>
          <View className="uses">
            {USE.map(u => (
              <View key={u.t} className="use">
                <Text className="use-i">{u.icon}</Text>
                <View className="use-b">
                  <Text className="use-t">{u.t}</Text>
                  <Text className="use-d">{u.d}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ③ 增收一体化 · 平台增收引擎矩阵 [NEW-B] */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text className="sec-no-t">3</Text></View>
            <Text className="sec-t">🔗 增收一体化 · 平台增收引擎矩阵</Text>
          </View>
          <Text className="calc-intro">不止一种赚法——平台<Text className="em">八大板块都是增收引擎</Text>，收入直达个人银行账户，社会贡献值全程同步累计。</Text>
          <View className="engs">
            {ENGINES.map(e => (
              <View key={e.board} className="eng">
                <View className="eng-top">
                  <Text className="eng-name">{e.icon} {e.board}</Text>
                  <Text className="eng-arrive">{e.arrive}</Text>
                </View>
                <Text className="eng-way">{e.way}</Text>
                <View className="eng-meta">
                  <Text className="eng-chip eng-who">面向 {e.who}</Text>
                  <Text className="eng-chip eng-link">贡献值 {e.link}</Text>
                </View>
              </View>
            ))}
          </View>
          <Text className="eng-foot">八大引擎并联运转，增收与积分一体两面——赚到的钱进银行账户，付出的功记成贡献值。</Text>
        </View>

        {/* ④ 交易即时分账 · 计算器 */}
        <View className="sec sec-star">
          <View className="sec-h">
            <View className="sec-no sec-no-star"><Text className="sec-no-t">4</Text></View>
            <Text className="sec-t">⚡ 交易即时分账</Text>
            <Text className="sec-law">第六~九条</Text>
          </View>
          <Text className="calc-intro">所有交易资金进入<Text className="em">银行监管专户</Text>，平台智能分账，每笔确认后自动拆分、<Text className="em">T+1 兑付</Text>，人工无权篡改。</Text>

          <View className="calc">
            {/* 交易金额预设 */}
            <Text className="calc-lbl">交易实收金额</Text>
            <View className="presets">
              {AMTS.map(a => (
                <View key={a} className={`preset ${amount === a ? 'preset-on' : ''}`} onClick={() => setAmount(a)}>
                  <Text className="preset-t">{fmt(a)}</Text>
                </View>
              ))}
            </View>

            {/* 采购成本率预设 */}
            <Text className="calc-lbl">采购成本率（保底收购款）</Text>
            <View className="presets">
              {RATES.map(r => (
                <View key={r} className={`preset ${costRate === r ? 'preset-on' : ''}`} onClick={() => setCostRate(r)}>
                  <Text className="preset-t">{Math.round(r * 100)}%</Text>
                </View>
              ))}
            </View>

            {/* 瀑布 */}
            <View className="wf">
              <View className="wf-row">
                <View className="wf-top"><Text className="wf-lbl">交易实收</Text><Text className="wf-amt">{fmt(amount)}</Text></View>
                <View className="wf-track"><View className="wf-fill wf-recv" style={{ width: '100%' }} /></View>
              </View>
              <View className="wf-row">
                <View className="wf-top"><Text className="wf-lbl">− 采购成本 · 直付供货农户</Text><Text className="wf-amt wf-minus">−{fmt(cost)}</Text></View>
                <View className="wf-track"><View className="wf-fill wf-cost" style={{ width: `${Math.round(costRate * 100)}%` }} /></View>
              </View>
              <View className="wf-row wf-gross">
                <View className="wf-top"><Text className="wf-lbl-g">= 毛利额</Text><Text className="wf-amt-g">{fmt(gross)}</Text></View>
                <View className="wf-track"><View className="wf-fill wf-margin" style={{ width: `${Math.round((1 - costRate) * 100)}%` }} /></View>
              </View>
            </View>

            <Text className="calc-lbl">毛利额再分 · 四大前置专项基金</Text>
            <View className="fbars">
              {FUNDS.map((f, i) => (
                <View key={f.name} className="fbar" onClick={() => fundInfo(f, fundVals[i])}>
                  <View className="fbar-h">
                    <Text className="fbar-name">{f.icon} {f.name} <Text className="fbar-pct">{f.pct}%</Text></Text>
                    <Text className="fbar-amt">{fmt(fundVals[i])}</Text>
                  </View>
                  <View className="ftrack"><View className="ffill" style={{ width: `${f.pct}%` }} /></View>
                  <Text className="fbar-desc">{f.desc}</Text>
                </View>
              ))}
            </View>

            <View className="calc-sum">
              <Text className="calc-sum-l">前置合计</Text>
              <Text className="calc-sum-r">35% 毛利 · {fmt(preSum)}</Text>
            </View>

            <View className="calc-profit">
              <View className="cp-h">
                <Text className="cp-l">剩余 65% → 平台利润总额</Text>
                <Text className="cp-r">{fmt(profit)}</Text>
              </View>
              <Text className="cp-s">计入年度分红</Text>
              <View className="cp-track"><View className="cp-fill" style={{ width: '65%' }} /></View>
            </View>

            <Text className="calc-note">数值为演示示意，实际以平台链上智能分账为准。</Text>
          </View>

          {/* 生产端按劳分配 */}
          <View className="card">
            <Text className="card-t">💪 生产端按劳分配（第七条）</Text>
            {PROD.map(p => (
              <View key={p.t} className="pt">
                <Text className="pt-dot">•</Text>
                <Text className="pt-x"><Text className="pt-t">{p.t}：</Text>{p.d}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ⑤ 年度利润分红 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text className="sec-no-t">5</Text></View>
            <Text className="sec-t">📊 年度利润分红</Text>
            <Text className="sec-law">第十~十二条</Text>
          </View>

          <Text className="sub-lbl">可分配利润核算顺序</Text>
          <View className="order">
            {ORDER.map((o, i) => (
              <View key={o} className="order-item">
                <View className="order-chip"><Text className="order-no">{i + 1}</Text><Text className="order-t">{o}</Text></View>
                {i < ORDER.length - 1 ? <Text className="order-arr">→</Text> : null}
              </View>
            ))}
          </View>

          <View className="redline">
            <Text className="redline-t">⚠️ 分红红线</Text>
            <Text className="redline-d">年度可分配利润低于 50 万元当年不分红，结转下年，优先保障生产端按劳分配与日常贡献值权益。</Text>
          </View>

          <Text className="sub-lbl">四池分红（股权比例 100%）</Text>
          <View className="pools">
            {POOLS.map(p => (
              <View key={p.name} className="pool" onClick={() => poolInfo(p)}>
                <View className="pool-h">
                  <Text className="pool-n">{p.name}</Text>
                  <Text className="pool-pct">{p.pct}%</Text>
                </View>
                <View className="ptrack"><View className="pfill" style={{ width: `${p.pct}%` }} /></View>
                <Text className="pool-d">{p.desc}</Text>
              </View>
            ))}
          </View>

          <Text className="sub-lbl">执行流程</Text>
          <View className="flow">
            {FLOW.map((s, i) => (
              <View key={s.t} className="flow-item">
                <View className="flow-no"><Text className="flow-no-t">{i + 1}</Text></View>
                <View className="flow-b">
                  <Text className="flow-t">{s.t}</Text>
                  <Text className="flow-d">{s.d}</Text>
                </View>
                {i < FLOW.length - 1 ? <View className="flow-line" /> : null}
              </View>
            ))}
          </View>
        </View>

        {/* ⑥ 公益兜底与均衡调剂 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text className="sec-no-t">6</Text></View>
            <Text className="sec-t">🤝 公益兜底与均衡调剂</Text>
            <Text className="sec-law">第十三~十四条</Text>
          </View>

          <View className="card">
            <Text className="card-t">❤️ 公益专项基金</Text>
            <View className="kv"><Text className="kv-k">来源</Text><Text className="kv-v">交易毛利 3% + 成员贡献值捐赠 + 社会捐赠 + 对口帮扶资金（单独账户，与经营资金完全隔离）</Text></View>
            <View className="kv"><Text className="kv-k">用途</Text><Text className="kv-v">青少年体育场地 / 器材 / 公益赛事、老年助餐点 / 高龄补贴、困难子女助学 / 重残护理 / 临时救助</Text></View>
            <View className="kv"><Text className="kv-k">审批</Text><Text className="kv-v">申报 → 共富专班审核 → 公示 5 天 → 拨付 → 验收（全流程平台存证）</Text></View>
            <Text className="card-foot">每半年专项审计、报告全平台公开。</Text>
          </View>

          <View className="card">
            <Text className="card-t">⚖️ 村社均衡调剂</Text>
            <Text className="card-d">从年度村集体收入排名<Text className="em">前 20% 强村分红提取 5%</Text> 纳入县域共富调剂池 → 定向帮扶收入排名<Text className="em">后 20% 薄弱村</Text> / 偏远乡村，按薄弱村常住人口均分，每年调剂一次，名单与明细全平台公示。</Text>
          </View>
        </View>

        {/* ⑦ 共富分配六项规范红线 [NEW-D] */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text className="sec-no-t">7</Text></View>
            <Text className="sec-t">🧭 共富分配六项规范红线</Text>
          </View>
          <Text className="calc-intro">分好钱，先立规矩——六条红线把“谁来分、按什么分、分多少”锁死在制度和链上。</Text>
          <View className="rls">
            {REDLINES.map((r, i) => (
              <View key={r} className="rl">
                <View className="rl-no"><Text className="rl-no-t">{i + 1}</Text></View>
                <Text className="rl-t">{r}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ⑧ 数字化执行与公示 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text className="sec-no-t">8</Text></View>
            <Text className="sec-t">⛓ 数字化执行与公示</Text>
            <Text className="sec-law">第十五~十六条</Text>
          </View>

          <Text className="sub-lbl">三大内置模块</Text>
          <View className="mods">
            {MODULES.map(m => (
              <View key={m.t} className="mod">
                <Text className="mod-i">{m.icon}</Text>
                <View className="mod-b">
                  <Text className="mod-t">{m.t}</Text>
                  <Text className="mod-d">{m.d}</Text>
                </View>
              </View>
            ))}
          </View>

          <Text className="sub-lbl">三级公开公示</Text>
          <View className="discs">
            {DISCLOSE.map(d => (
              <View key={d.t} className="disc">
                <Text className="disc-i">{d.icon}</Text>
                <Text className="disc-t">{d.t}</Text>
                <Text className="disc-d">{d.d}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ⑨ 监督与动态调整 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text className="sec-no-t">9</Text></View>
            <Text className="sec-t">🛡 监督与动态调整</Text>
            <Text className="sec-law">第十七~十九条</Text>
          </View>

          <Text className="sub-lbl">三级监督</Text>
          <View className="sups">
            {SUPERVISE.map(s => (
              <View key={s.t} className="sup">
                <Text className="sup-i">{s.icon}</Text>
                <View className="sup-b">
                  <Text className="sup-t">{s.t}</Text>
                  <Text className="sup-d">{s.d}</Text>
                </View>
              </View>
            ))}
          </View>

          <View className="card">
            <Text className="card-t">📝 异议处理</Text>
            <Text className="card-d">公示期内经小程序 / 书面提交 → 工作专班<Text className="em">5 个工作日</Text>核实答复 → 确有错误<Text className="em">3 个工作日</Text>纠正补付并公示。</Text>
          </View>

          <View className="card">
            <Text className="card-t">🔄 规则动态调整</Text>
            <Text className="card-d">专班提案 → 代表大会<Text className="em">2/3 以上表决</Text> → 公示 7 天生效；每年年末可微调一次，重大调整报属地供销社、农业农村部门备案。</Text>
          </View>
        </View>

        <Text className="foot">本页为共富分配机制演示示意，具体比例与流程以平台正式发布的《共富分配白皮书》及链上智能分账为准。</Text>
      </View>
    </ScrollView>
  );
}
