import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import './index.css';

// —— 利益共同体 · 机制示意（公开可看、无角色守卫）——
// 暖珊瑚 / 赤陶「同心·共同体」主题，区别于 共富(金) / 结算(蓝) / web3(深色) / 社会公益(红) / AI小店(青) / 分销推广(绿)
// 核心：党建引领 · 助农惠民 · 全民共富——把农民、商户、村民居民、集体、供销社、银行、企事业、政府、平台九方拧成一股绳，谁也不掉队。

type Seg = { t: string; em?: boolean };
const flat = (segs: Seg[]): string => segs.map(s => s.t).join('');

// HERO 徽章
const BADGES: string[] = ['党建引领', '助农惠民', '人人有份', '一个都不能少', '全程公开'];

// ① 党建引领 · 一根红线串起来（4 张党建卡）
const PARTY: { icon: string; t: string; d: string }[] = [
  { icon: '🧭', t: '把方向', d: '联合党委统领，助农惠民不跑偏。' },
  { icon: '🚩', t: '带头干', d: '党员先锋岗带头认领帮扶、助农岗，做给群众看。' },
  { icon: '🛟', t: '兜住底', d: '困难群众、脱贫户优先兜底，一个都不能少。' },
  { icon: '👀', t: '管监督', d: '党组织加群众代表全程盯着，账目公开、说话算数。' },
];

// ② 谁在共同体里（9 成员）
const MEMBERS: { icon: string; t: string; tag: string; d: string }[] = [
  { icon: '🌾', t: '农民', tag: '供给', d: '种地养殖、给平台供货的乡亲' },
  { icon: '🏪', t: '商户', tag: '小 b', d: '开店、就近服务的店主创业者' },
  { icon: '👥', t: '村民 / 居民', tag: 'C 端', d: '消费、出力、参与的每个人' },
  { icon: '🏘️', t: '村社集体', tag: '大 B', d: '控股办企业、带富全村' },
  { icon: '🤝', t: '供销社', tag: '枢纽', d: '直采直供、保底收购的为农枢纽' },
  { icon: '🏦', t: '银行', tag: '金融', d: '管好钱、放助农贷的金融伙伴' },
  { icon: '🏢', t: '企事业单位', tag: '社会力量', d: '消费帮扶、用工、送技术的社会力量' },
  { icon: '🏛️', t: '行政机关', tag: '政府', d: '给政策、做背书、把政务搬上来的政府' },
  { icon: '🖥️', t: '平台', tag: '运营', d: '搭台、定规则、不碰钱的运营方' },
];

// ③ 利益怎么绑 · 延伸到每个角色（核心 · 每角色一张卡：出啥力 → 得啥好）
const BIND: { icon: string; role: string; tag: string; kind: string; give: string; get: Seg[] }[] = [
  {
    icon: '🌾', role: '农民', tag: '供给', kind: 'nong',
    give: '把地种好、供好货',
    get: [{ t: '有人保底收购（高于市场 ' }, { t: '5%–8%', em: true }, { t: '）、卖得掉、多赚钱，年底按' }, { t: '贡献值分红', em: true }],
  },
  {
    icon: '🏪', role: '商户', tag: '小 b', kind: 'shop',
    give: '开店经营',
    get: [{ t: '平台' }, { t: '流量扶持', em: true }, { t: '、' }, { t: '4:6 分佣', em: true }, { t: '、消费返贡献值留客、跟集体一起分' }],
  },
  {
    icon: '👥', role: '村民 / 居民', tag: 'C 端', kind: 'ind',
    give: '消费、出力、参与',
    get: [{ t: '攒' }, { t: '社会贡献值', em: true }, { t: '抵扣兑换、进' }, { t: '全民普惠池（25%）', em: true }, { t: '分红、办事不跑腿' }],
  },
  {
    icon: '🏘️', role: '村社集体', tag: '大 B', kind: 'coll',
    give: '控股 ≥51% 办企业、反哺',
    get: [{ t: '集体有收入、留' }, { t: '公积公益金', em: true }, { t: '、带全村富' }],
  },
  {
    icon: '🤝', role: '供销社', tag: '枢纽', kind: 'coop',
    give: '直采保底、对接销路',
    get: [{ t: '帮农增收、' }, { t: '不赚差价赚服务', em: true }],
  },
  {
    icon: '🏦', role: '银行', tag: '金融', kind: 'bank',
    give: '管好钱（银行监管专户）、放助农低息贷、数币结算',
    get: [{ t: '稳定' }, { t: '存贷场景', em: true }, { t: '、服务乡村振兴' }],
  },
  {
    icon: '🏢', role: '企事业单位', tag: '社会力量', kind: 'ent',
    give: '消费帮扶 / 以购代捐、下乡用工、送技术',
    get: [{ t: '稳定' }, { t: '优质货源', em: true }, { t: '、履行社会责任、' }, { t: '党建结对', em: true }, { t: '出实效' }],
  },
  {
    icon: '🏛️', role: '行政机关', tag: '政府', kind: 'gov',
    give: '政策扶持、政务上平台、监管背书',
    get: [{ t: '乡村振兴有抓手、老百姓' }, { t: '信得过', em: true }, { t: '、办事更高效' }],
  },
  {
    icon: '🖥️', role: '平台', tag: '运营', kind: 'plat',
    give: '搭台、定规则、智能分账、上链',
    get: [{ t: '只赚服务钱（' }, { t: '运营 35%', em: true }, { t: '）、' }, { t: '不碰钱', em: true }, { t: '、不与民争利' }],
  },
];

// ④ 党建引领怎么落地（4 张小卡）
const LAND: { icon: string; t: string; d: string }[] = [
  { icon: '🧑‍🤝‍🧑', t: '联合党委', d: '跨村 / 社区 / 企业联合党委统一领导' },
  { icon: '🚩', t: '党员先锋岗', d: '党员带头认领帮扶户、助农岗' },
  { icon: '🔗', t: '党建结对', d: '企事业、机关党组织与村社结对帮扶' },
  { icon: '📋', t: '议事公开', d: '定期议事、账目上链、群众监督' },
];

// ⑤ 三根利益纽带
const BONDS: { icon: string; t: string; d: string }[] = [
  { icon: '🏘️', t: '股权纽带', d: '集体控股 ≥51%，集体收益按股分到村集体、再普惠到户' },
  { icon: '🤝', t: '分佣纽带', d: '推广 4:6 分成，谁带来交易谁分成，多劳多得' },
  { icon: '⭐', t: '贡献值纽带', d: '消费 / 劳动 / 公益 → 社会贡献值 → 年度分红加成，付出即有份' },
];

// ⑥ 共赢闭环
const CYCLE: string[] = ['每个人付出·经营', '做大共同体蛋糕', '按贡献+股权分回', '人人得实惠', '更愿参与'];

// ⑦ 一荣俱荣的底线
const REDLINES: string[] = [
  '困难群体分红上浮 20%',
  '农户保底款不因退货追回',
  '村公积公益金反哺全村',
  '全程上链存证、三级公开',
  '年度利润 <50万 当年不分红、优先保按劳分配',
];

export default function InterestCommunityPage() {
  useLoad(() => {
    Taro.setNavigationBarTitle({ title: '利益共同体' });
  });

  const memInfo = (m: (typeof MEMBERS)[number]) => {
    Taro.showModal({ title: `${m.icon} ${m.t}（${m.tag}）`, content: m.d, showCancel: false, confirmText: '知道了' });
  };
  const bindInfo = (b: (typeof BIND)[number]) => {
    Taro.showModal({
      title: `${b.icon} ${b.role}（${b.tag}）`,
      content: `【出力】${b.give}\n\n【得好】${flat(b.get)}`,
      showCancel: false,
      confirmText: '知道了',
    });
  };

  return (
    <ScrollView scrollY className="page">
      <View className="bg">
        {/* HERO */}
        <View className="hero">
          <Text className="hero-t">🤝 利益共同体</Text>
          <Text className="hero-s">党建引领 · 助农惠民 · 全民共富</Text>
          <Text className="hero-lead">把农民、商户、村民居民、银行、企事业、政府都拧成一股绳——党建带头，一起把日子过好，谁也不掉队。</Text>
          <View className="badges">
            {BADGES.map(b => (
              <View key={b} className="badge"><Text className="badge-t">{b}</Text></View>
            ))}
          </View>
        </View>

        {/* ① 党建引领 · 一根红线串起来 */}
        <View className="sec sec-party">
          <View className="sec-h">
            <View className="sec-no sec-no-party"><Text className="sec-no-t">1</Text></View>
            <Text className="sec-t">🚩 党建引领 · 一根红线串起来</Text>
            <Text className="sec-key sec-key-party">红线</Text>
          </View>
          <Text className="sec-lead">党组织把大家拧成一股绳——把方向、带好头、兜住底、管监督。谁也不能只顾自己，谁也不掉队。</Text>
          <View className="pcards">
            {PARTY.map(p => (
              <View key={p.t} className="pcard">
                <Text className="pcard-i">{p.icon}</Text>
                <Text className="pcard-t">{p.t}</Text>
                <Text className="pcard-d">{p.d}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ② 谁在共同体里 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text className="sec-no-t">2</Text></View>
            <Text className="sec-t">👥 谁在共同体里</Text>
          </View>
          <Text className="sec-lead">台上台下九方人，一个都不能少——农民、商户、村民居民、村社集体、供销社、银行、企事业单位、行政机关、平台，都在这张网里。</Text>
          <View className="mems">
            {MEMBERS.map(m => (
              <View key={m.t} className="mem" onClick={() => memInfo(m)}>
                <Text className="mem-i">{m.icon}</Text>
                <View className="mem-b">
                  <View className="mem-h">
                    <Text className="mem-t">{m.t}</Text>
                    <Text className="mem-tag">{m.tag}</Text>
                  </View>
                  <Text className="mem-d">{m.d}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ③ 利益怎么绑 · 延伸到每个角色（核心） */}
        <View className="sec sec-star">
          <View className="sec-h">
            <View className="sec-no sec-no-star"><Text className="sec-no-t">3</Text></View>
            <Text className="sec-t">🔗 利益怎么绑 · 延伸到每个角色</Text>
            <Text className="sec-key">核心</Text>
          </View>
          <Text className="sec-lead">利益共同体不是口号——谁出了力，就有谁的一份。九方各出各的力、各得各的好，都写在这儿。</Text>
          <View className="roles">
            {BIND.map(b => (
              <View key={b.role} className={`role role-${b.kind}`} onClick={() => bindInfo(b)}>
                <View className="role-h">
                  <Text className="role-i">{b.icon}</Text>
                  <View className="role-hb">
                    <Text className="role-t">{b.role}</Text>
                    <Text className="role-tag">{b.tag}</Text>
                  </View>
                </View>
                <View className="role-gg">
                  <View className="role-row">
                    <Text className="role-lbl role-lbl-give">出力</Text>
                    <Text className="role-rowt">{b.give}</Text>
                  </View>
                  <View className="role-row">
                    <Text className="role-lbl role-lbl-get">得好</Text>
                    <Text className="role-rowt">
                      {b.get.map((s, j) => (
                        <Text key={j} className={s.em ? 'em' : ''}>{s.t}</Text>
                      ))}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ④ 党建引领怎么落地 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no sec-no-party"><Text className="sec-no-t">4</Text></View>
            <Text className="sec-t">🛠️ 党建引领怎么落地</Text>
          </View>
          <Text className="sec-lead">不是挂块牌子——把党建做成看得见的动作：定人、定岗、结对、公开。</Text>
          <View className="pcards">
            {LAND.map(p => (
              <View key={p.t} className="pcard">
                <Text className="pcard-i">{p.icon}</Text>
                <Text className="pcard-t">{p.t}</Text>
                <Text className="pcard-d">{p.d}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ⑤ 三根利益纽带 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text className="sec-no-t">5</Text></View>
            <Text className="sec-t">🪢 三根利益纽带</Text>
          </View>
          <Text className="sec-lead">股权、分佣、贡献值——三根线把每个人的利益拧成一股绳。</Text>
          <View className="bonds">
            {BONDS.map(b => (
              <View key={b.t} className="bond">
                <Text className="bond-i">{b.icon}</Text>
                <View className="bond-b">
                  <Text className="bond-t">{b.t}</Text>
                  <Text className="bond-d">{b.d}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ⑥ 共赢闭环 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text className="sec-no-t">6</Text></View>
            <Text className="sec-t">🔄 共赢闭环</Text>
          </View>
          <View className="cycle">
            <View className="cycle-nodes">
              {CYCLE.map((n, i) => (
                <View key={n} className="cycle-item">
                  <View className="cycle-node"><Text className="cycle-node-t">{n}</Text></View>
                  {i < CYCLE.length - 1
                    ? <Text className="cycle-arr">→</Text>
                    : <Text className="cycle-arr cycle-arr-back">↺</Text>}
                </View>
              ))}
            </View>
            <Text className="cycle-cap">蛋糕越做越大，每个人分到的越多——这就是利益共同体</Text>
          </View>
        </View>

        {/* ⑦ 一荣俱荣的底线 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text className="sec-no-t">7</Text></View>
            <Text className="sec-t">🛡️ 一荣俱荣的底线</Text>
          </View>
          <Text className="sec-lead">共同体不让任何人掉队——这几条底线，写在制度里、锁在链上。</Text>
          <View className="rls">
            {REDLINES.map(r => (
              <View key={r} className="rl">
                <Text className="rl-i">✓</Text>
                <Text className="rl-t">{r}</Text>
              </View>
            ))}
          </View>
          <View className="chips">
            <Text className="chip">一个都不能少</Text>
            <Text className="chip">党组织全程监督</Text>
          </View>
        </View>

        <Text className="foot">本页为利益共同体机制演示示意，具体比例与联结方式以平台正式《共富分配白皮书》为准。</Text>
      </View>
    </ScrollView>
  );
}
