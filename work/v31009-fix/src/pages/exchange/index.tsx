import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

// ── 供应大厅：产地大宗预售 ──────────────────────────────
interface Supply { id: number; origin: string; party: string; product: string; emoji: string; month: string; volume: string; price: string; flow: '上行' | '下行'; }
const SUPPLY: Supply[] = [
  { id: 1, origin: '天津东丽华明范庄', party: '范庄村党支部', product: '黄金香印葡萄', emoji: '🍇', month: '8月上市', volume: '预估 50 吨', price: '¥6.5/斤', flow: '上行' },
  { id: 2, origin: '天津蓟州·二十里铺', party: '二十里铺党支部', product: '红香酥梨', emoji: '🍐', month: '9月上市', volume: '预估 80 吨', price: '¥4.2/斤', flow: '上行' },
  { id: 3, origin: '天津宁河·大北涧沽', party: '大北涧沽党支部', product: '小站稻大米', emoji: '🌾', month: '10月上市', volume: '预估 120 吨', price: '¥4.8/斤', flow: '上行' },
  { id: 4, origin: '中粮集团·津供基地', party: '中粮党委', product: '复合肥/种子/农膜', emoji: '🧪', month: '常年供应', volume: '直采直配', price: '出厂价', flow: '下行' },
  { id: 5, origin: '某国营日化·天津厂', party: '国企党委', product: '日化快消礼包', emoji: '🧴', month: '常年供应', volume: '厂家直供', price: '批发价', flow: '下行' },
];

// ── 采购大厅：采购单 + 三方比价 ──────────────────────────
interface Quote { name: string; price: number; note: string; }
interface Purchase { id: number; buyer: string; type: string; product: string; emoji: string; demand: string; deadline: string; quotes: Quote[]; }
const PURCHASE: Purchase[] = [
  { id: 1, buyer: '华明街道·国央企职工食堂', type: '国央企采购', product: '苹果(7斤以下)', emoji: '🍎', demand: '30 吨/月', deadline: '长期', quotes: [
    { name: '蓟州马伸桥合作社', price: 5.6, note: '产地直发·党支部品控' },
    { name: '兴隆山区果园', price: 5.9, note: '冷链次日达' },
    { name: '本地批发市场', price: 6.4, note: '现货' },
  ] },
  { id: 2, buyer: '某社区·居委会团购', type: '社区采购', product: '应季蔬菜礼包', emoji: '🥬', demand: '500 份/周', deadline: '每周三截单', quotes: [
    { name: '华明永和村党支部', price: 38, note: '当日采摘·村集体担保' },
    { name: '武清蔬菜基地', price: 42, note: '基地直供' },
    { name: '商超配送', price: 49, note: '品牌包装' },
  ] },
  { id: 3, buyer: '范庄村·农资集采', type: '村采购(下行)', product: '水稻专用复合肥', emoji: '🧪', demand: '40 吨', deadline: '春耕前', quotes: [
    { name: '中粮津供基地', price: 2980, note: '国企直采·万吨价' },
    { name: '区农资公司', price: 3180, note: '正品溯源' },
    { name: '镇农资店', price: 3450, note: '零售' },
  ] },
];

export default function Exchange() {
  const [tab, setTab] = useState<'net' | 'supply' | 'purchase'>('net');
  const [openQuote, setOpenQuote] = useState<number | null>(null);

  const publish = (kind: string) => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: `发布${kind}`,
      content: `演示版：${kind}将提交至党支部审核，审核通过后进入大厅公示。正式版可填写品类、数量、价格、时间等。`,
      confirmText: '我知道了', showCancel: false,
    });
  };

  return (
    <View className="ex-page">
      {/* 党建引领横幅 */}
      <View className="ex-banner">
        <Text className="ex-banner-flag">★</Text>
        <View>
          <Text className="ex-banner-title">党建引领 · 农产品与工业品双向流通</Text>
          <Text className="ex-banner-sub">党支部为节点 · 以供代采 · 三方比价 · 最低价中标</Text>
        </View>
      </View>

      {/* Tab */}
      <View className="ex-tabs">
        {[['net', '流通网络'], ['supply', '供应大厅'], ['purchase', '采购大厅']].map(([k, l]) => (
          <View key={k} className={`ex-tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k as any)}>
            <Text>{l}</Text>
          </View>
        ))}
      </View>

      <ScrollView scrollY className="ex-body">
        {tab === 'net' && (
          <View>
            {/* 上行 */}
            <View className="flow-card up">
              <View className="flow-head"><Text className="flow-tag up-tag">农产品 上行 ↑</Text></View>
              <View className="flow-chain">
                <View className="flow-node"><Text className="fn-emoji">🌾</Text><Text className="fn-t">村·农产品</Text></View>
                <Text className="flow-arrow">→</Text>
                <View className="flow-node hl"><Text className="fn-emoji">🚩</Text><Text className="fn-t">党支部组织·品控</Text></View>
                <Text className="flow-arrow">→</Text>
                <View className="flow-node"><Text className="fn-emoji">🏙️</Text><Text className="fn-t">社区居民/国央企</Text></View>
              </View>
            </View>
            {/* 下行 */}
            <View className="flow-card down">
              <View className="flow-head"><Text className="flow-tag down-tag">工业品·农资 下行 ↓</Text></View>
              <View className="flow-chain">
                <View className="flow-node"><Text className="fn-emoji">🏭</Text><Text className="fn-t">国央企·工业品农资</Text></View>
                <Text className="flow-arrow">→</Text>
                <View className="flow-node hl"><Text className="fn-emoji">🚩</Text><Text className="fn-t">党支部·分发</Text></View>
                <Text className="flow-arrow">→</Text>
                <View className="flow-node"><Text className="fn-emoji">🏡</Text><Text className="fn-t">村 / 社区</Text></View>
              </View>
            </View>

            {/* 双板块入口 */}
            <Text className="ex-sec-title">精选好物 · 双向供给</Text>
            <View className="dual">
              <View className="dual-card guoyang" onClick={() => Taro.navigateTo({ url: '/pkgShop/my-store/index' })}>
                <Text className="dual-emoji">🏭</Text>
                <Text className="dual-t">国央企好物</Text>
                <Text className="dual-d">种子化肥·农机·日化快消{'\n'}国企背书·直采直供</Text>
              </View>
              <View className="dual-card cunli" onClick={() => Taro.navigateTo({ url: '/pkgShop/my-store/index' })}>
                <Text className="dual-emoji">🌾</Text>
                <Text className="dual-t">村里好物</Text>
                <Text className="dual-d">农副产品·土特产{'\n'}党支部品控·产地直发</Text>
              </View>
            </View>

            <View className="ex-rule">
              <Text className="ex-rule-t">🛡️ 防腐机制：以供代采 · 三方比价 · 最低价中标</Text>
              <Text className="ex-rule-d">所有采购需求公开发布，供应方报价透明排序，由采购方自主择优，信息全程留痕，杜绝暗箱与回扣。</Text>
            </View>
          </View>
        )}

        {tab === 'supply' && (
          <View>
            <View className="ex-hint"><Text>产地大宗预售公示。村党支部组织生产、品控、保供。</Text></View>
            {SUPPLY.map(s => (
              <View key={s.id} className="sup-card">
                <Text className="sup-emoji">{s.emoji}</Text>
                <View className="sup-main">
                  <View className="sup-row1">
                    <Text className="sup-name">{s.product}</Text>
                    <Text className={`sup-flow ${s.flow === '上行' ? 'up' : 'down'}`}>{s.flow}</Text>
                  </View>
                  <Text className="sup-origin">📍 {s.origin} · {s.party}</Text>
                  <View className="sup-row2">
                    <Text className="sup-meta">{s.month}</Text>
                    <Text className="sup-meta">{s.volume}</Text>
                    <Text className="sup-price">{s.price}</Text>
                  </View>
                </View>
              </View>
            ))}
            <View className="ex-pub" onClick={() => publish('供应信息')}><Text>＋ 发布供应（产地预售）</Text></View>
          </View>
        )}

        {tab === 'purchase' && (
          <View>
            <View className="ex-hint"><Text>采购方发布需求，多方报价比价，最低价中标（点卡片看比价）。</Text></View>
            {PURCHASE.map(p => {
              const min = Math.min(...p.quotes.map(q => q.price));
              return (
                <View key={p.id} className="pur-card" onClick={() => setOpenQuote(openQuote === p.id ? null : p.id)}>
                  <View className="pur-top">
                    <Text className="pur-emoji">{p.emoji}</Text>
                    <View className="pur-main">
                      <Text className="pur-name">{p.product}</Text>
                      <Text className="pur-buyer">{p.buyer}</Text>
                    </View>
                    <View className="pur-right">
                      <Text className="pur-type">{p.type}</Text>
                      <Text className="pur-demand">{p.demand}</Text>
                    </View>
                  </View>
                  <View className="pur-foot">
                    <Text className="pur-deadline">⏰ {p.deadline}</Text>
                    <Text className="pur-toggle">{openQuote === p.id ? '收起比价 ▲' : `三方比价 · 最低 ¥${typeof min === 'number' ? min : ''} ▼`}</Text>
                  </View>
                  {openQuote === p.id && (
                    <View className="quotes">
                      {p.quotes.slice().sort((a, b) => a.price - b.price).map((q) => (
                        <View key={q.name} className={`quote ${q.price === min ? 'win' : ''}`}>
                          <View className="q-l">
                            <Text className="q-name">{q.name}{q.price === min ? ' 🏆中标' : ''}</Text>
                            <Text className="q-note">{q.note}</Text>
                          </View>
                          <Text className="q-price">{q.price >= 100 ? `¥${q.price}` : `¥${q.price}/斤`}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
            <View className="ex-pub" onClick={() => publish('采购需求')}><Text>＋ 发布采购需求</Text></View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
