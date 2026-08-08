import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

const TABS = [{ key: 'consult', name: '法律咨询' }, { key: 'mediate', name: '矛盾调解' }, { key: 'class', name: '普法课堂' }, { key: 'staff', name: '调解员' }];
interface QA { id: number; q: string; a: string; by: string; }
const QAS: QA[] = [
  { id: 1, q: '土地承包到期后还能继续承包吗？', a: '第二轮土地承包到期后再延长30年，承包关系长久稳定，可继续承包。', by: '法律明白人·李主任' },
  { id: 2, q: '邻居占了我家宅基地怎么办？', a: '先协商，不成可申请村调委会调解，或向乡镇国土所反映确权。', by: '驻村律师·王律师' },
  { id: 3, q: '打工被拖欠工资如何维权？', a: '保留合同、考勤、欠条等证据，可向劳动监察投诉或申请仲裁，村里可提供法律援助。', by: '驻村律师·王律师' },
];
interface Case { id: number; title: string; status: '调解中' | '已化解'; mediator: string; }
const CASES: Case[] = [
  { id: 1, title: '宅基地边界纠纷', status: '调解中', mediator: '李主任' },
  { id: 2, title: '灌溉用水矛盾', status: '已化解', mediator: '张调解员' },
];
const PUFA = [
  { id: 1, name: '以案说法：民间借贷要打借条', emoji: '📜' },
  { id: 2, name: '防范养老诈骗', emoji: '🛡️' },
  { id: 3, name: '土地流转合同注意事项', emoji: '📋' },
];
const STAFF = [
  { name: '李主任', role: '法律明白人·村调委会主任', field: '土地、宅基地纠纷' },
  { name: '王律师', role: '驻村律师', field: '合同、劳动、婚姻' },
  { name: '张调解员', role: '人民调解员', field: '邻里、家庭矛盾' },
];

export default function LegalPage() {
  const [tab, setTab] = useState('consult');
  const [qas, setQas] = useState<QA[]>(QAS);
  const [cases, setCases] = useState<Case[]>(CASES);
  const ask = () => { if (!store.requireBound()) return; Taro.showModal({ title: '法律咨询', editable: true, placeholderText: '描述你的法律问题…', success: (res: any) => { if (!res.confirm || !res.content) return; setQas(prev => [{ id: Date.now(), q: res.content, a: '法律明白人将尽快解答（演示）', by: '待解答' }, ...prev]); Taro.showToast({ title: '已提交', icon: 'none' }); } } as any); };
  const apply = () => { if (!store.requireBound()) return; Taro.showModal({ title: '申请调解', editable: true, placeholderText: '简述矛盾纠纷…', success: (res: any) => { if (!res.confirm || !res.content) return; setCases(prev => [{ id: Date.now(), title: res.content, status: '调解中', mediator: '待分配' }, ...prev]); Taro.showToast({ title: '已受理，调解员将联系', icon: 'none' }); } } as any); };
  const study = (n: string) => Taro.showModal({ title: '📖 ' + n, content: '（演示）此处展示普法案例 / 视频。', showCancel: false });

  return (
    <View className="page">
      <View className="hero"><Text className="hero-title">⚖️ 法务调解</Text><Text className="hero-sub">小事不出村 · 矛盾不上交</Text></View>
      <View className="tabs">{TABS.map(t => (<View key={t.key} className={`tab ${tab === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}><Text>{t.name}</Text></View>))}</View>
      <ScrollView scrollY className="body"><View className="wrap">
        {tab === 'consult' && (<View>
          <View style={{ background: '#f0fdf4', border: '1rpx solid #bbf7d0', borderRadius: '12rpx', padding: '18rpx 22rpx', marginBottom: '16rpx' }} onClick={() => Taro.showModal({ title: '合作律所入驻', content: '本平台采用「律所付费入驻、村民免费咨询」模式：\n\n· 律所 / 律师付费入驻展示，获得本地案源与品牌曝光；\n· 村民法律咨询、法律援助全部免费；\n· 平台审核律所执业资质，保障服务质量。\n\n合作律所（示例）：天津XX律师事务所、XX法律服务所。', showCancel: false })}>
            <Text style={{ fontSize: '24rpx', color: '#15803d', fontWeight: 700 }}>⚖️ 合作律所免费咨询 · 村民 0 元</Text>
            <Text style={{ fontSize: '20rpx', color: '#6b7280', display: 'block', marginTop: '4rpx' }}>律所付费入驻打广告、村民免费用 · 点看合作律所 ›</Text>
          </View>
          {qas.map(q => (<View key={q.id} className="qa"><Text className="qa-q">❓ {q.q}</Text><Text className="qa-a">⚖️ {q.a}</Text><Text className="qa-by">— {q.by}</Text></View>))}<View style={{ height: '120rpx' }} /></View>)}
        {tab === 'mediate' && (<View>{cases.map(c => (<View key={c.id} className="case"><View className="case-info"><Text className="case-title">{c.title}</Text><Text className="case-m">调解员：{c.mediator}</Text></View><View className={`case-st ${c.status === '已化解' ? 'done' : 'ing'}`}><Text className="case-st-t">{c.status}</Text></View></View>))}<View style={{ height: '120rpx' }} /></View>)}
        {tab === 'class' && PUFA.map(p => (<View key={p.id} className="row" onClick={() => study(p.name)}><Text className="row-emoji">{p.emoji}</Text><Text className="row-name flex1">{p.name}</Text><Text className="row-arrow">›</Text></View>))}
        {tab === 'staff' && STAFF.map((s, i) => (<View key={i} className="staff"><View className="staff-av"><Text style={{ fontSize: '40rpx' }}>⚖️</Text></View><View className="staff-info"><Text className="staff-name">{s.name}</Text><Text className="staff-role">{s.role}</Text><Text className="staff-field">擅长：{s.field}</Text></View></View>))}
      </View></ScrollView>
      {tab === 'consult' && <View className="fab" onClick={ask}><Text className="fab-t">＋ 我要咨询</Text></View>}
      {tab === 'mediate' && <View className="fab" onClick={apply}><Text className="fab-t">＋ 申请调解</Text></View>}
    </View>
  );
}
