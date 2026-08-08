import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

const TABS = [{ key: 'meal', name: '长者食堂' }, { key: 'daycare', name: '日间照料' }, { key: 'class', name: '四点半课堂' }, { key: 'roster', name: '关爱名册' }];
const MEALS = [
  { id: 1, name: '今日午餐·三菜一汤', detail: '红烧肉 · 炒时蔬 · 豆腐 · 紫菜汤', price: '¥6（老人价）', emoji: '🍱' },
  { id: 2, name: '今日晚餐·两菜一汤', detail: '鸡蛋羹 · 清炒菜 · 小米粥', price: '¥4（老人价）', emoji: '🥣' },
];
const DAYCARE = [
  { id: 1, name: '日间照料·全天托管', detail: '9:00-17:00 含午餐午休、康复活动', emoji: '🛌' },
  { id: 2, name: '健康监测', detail: '量血压血糖、健康咨询', emoji: '🩺' },
  { id: 3, name: '文娱活动', detail: '书画、棋牌、健身操', emoji: '🎴' },
];
const CLASSES = [
  { id: 1, name: '四点半课堂·作业辅导', detail: '每周一至五 16:30-18:00', emoji: '📚' },
  { id: 2, name: '周末兴趣班·书法绘画', detail: '每周六上午', emoji: '🎨' },
  { id: 3, name: '暑期托管班', detail: '7-8月 全天', emoji: '☀️' },
];
interface Person { id: number; name: string; type: string; note: string; visited: boolean; }
const ROSTER: Person[] = [
  { id: 1, name: '张大爷（82岁·独居）', type: '独居老人', note: '子女在外务工，腿脚不便', visited: false },
  { id: 2, name: '李奶奶（78岁·独居）', type: '独居老人', note: '高血压，需定期探访', visited: false },
  { id: 3, name: '小明（9岁·留守）', type: '留守儿童', note: '父母在外，随祖父母生活', visited: false },
  { id: 4, name: '王爷爷（85岁·空巢）', type: '空巢老人', note: '已结对，本月已探访', visited: true },
];

export default function CarePage() {
  const [tab, setTab] = useState('meal');
  const [roster, setRoster] = useState<Person[]>(ROSTER);
  const [helped, setHelped] = useState(false);

  const order = (n: string) => { if (!store.requireBound()) return; Taro.showModal({ title: '订餐', content: `预订「${n}」？可选堂食或党员志愿送餐上门。`, confirmText: '确认订餐', success: (r) => { if (r.confirm) Taro.showToast({ title: '订餐成功', icon: 'success' }); } }); };
  const reserve = (n: string) => { if (!store.requireBound()) return; Taro.showModal({ title: '预约', content: `预约「${n}」？`, success: (r) => { if (r.confirm) Taro.showToast({ title: '预约成功', icon: 'success' }); } }); };
  const signUp = (n: string) => { if (!store.requireBound()) return; Taro.showModal({ title: '报名', content: `为孩子报名「${n}」？`, success: (r) => { if (r.confirm) Taro.showToast({ title: '报名成功', icon: 'success' }); } }); };
  const visit = (p: Person) => {
    if (!store.requireBound()) return;
    if (p.visited) return;
    setRoster(prev => prev.map(x => x.id === p.id ? { ...x, visited: true } : x));
    store.addContribution('custom', '结对探访·' + p.name.slice(0, 3), 30);
    Taro.showToast({ title: '已提交，待审核（通过后+30计入）', icon: 'none' });
  };
  const sos = () => { if (helped) return; setHelped(true); Taro.showToast({ title: '已通知网格员与家人', icon: 'success' }); };

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-title">👵 一老一小</Text>
        <Text className="hero-sub">老有所养 · 幼有所育 · 党员包户结对</Text>
      </View>
      <View className={`sos ${helped ? 'done' : ''}`} onClick={sos}><Text className="sos-t">{helped ? '✓ 已发出求助，请稍候' : '🆘 老人一键求助'}</Text></View>
      <View className="tabs">{TABS.map(t => (<View key={t.key} className={`tab ${tab === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}><Text>{t.name}</Text></View>))}</View>
      <ScrollView scrollY className="body"><View className="wrap">
        {tab === 'meal' && MEALS.map(m => (
          <View key={m.id} className="row"><Text className="row-emoji">{m.emoji}</Text><View className="row-info"><Text className="row-name">{m.name}</Text><Text className="row-detail">{m.detail}</Text><Text className="row-price">{m.price}</Text></View><View className="row-btn" onClick={() => order(m.name)}><Text className="row-btn-t">订餐</Text></View></View>
        ))}
        {tab === 'daycare' && DAYCARE.map(d => (
          <View key={d.id} className="row"><Text className="row-emoji">{d.emoji}</Text><View className="row-info"><Text className="row-name">{d.name}</Text><Text className="row-detail">{d.detail}</Text></View><View className="row-btn" onClick={() => reserve(d.name)}><Text className="row-btn-t">预约</Text></View></View>
        ))}
        {tab === 'class' && CLASSES.map(c => (
          <View key={c.id} className="row"><Text className="row-emoji">{c.emoji}</Text><View className="row-info"><Text className="row-name">{c.name}</Text><Text className="row-detail">{c.detail}</Text></View><View className="row-btn" onClick={() => signUp(c.name)}><Text className="row-btn-t">报名</Text></View></View>
        ))}
        {tab === 'roster' && (<View>
          <View className="roster-tip"><Text className="roster-tip-t">🤝 党员包户结对，定期探访关爱（探访打卡计入社会贡献值）</Text></View>
          {roster.map(p => (
            <View key={p.id} className="prow"><View className="prow-info"><Text className="prow-name">{p.name}</Text><Text className="prow-note">{p.type} · {p.note}</Text></View>{p.visited ? <View className="prow-done"><Text className="prow-done-t">本月已探访 ✓</Text></View> : <View className="prow-btn" onClick={() => visit(p)}><Text className="prow-btn-t">探访打卡</Text></View>}</View>
          ))}
        </View>)}
        <View style={{ height: '40rpx' }} />
      </View></ScrollView>
    </View>
  );
}
