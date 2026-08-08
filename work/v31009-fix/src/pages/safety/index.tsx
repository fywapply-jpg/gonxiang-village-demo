import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

const TABS = [{ key: 'report', name: '隐患上报' }, { key: 'patrol', name: '平安巡逻' }, { key: 'notice', name: '平安公告' }];
interface Report { id: number; title: string; status: '处理中' | '已办结'; time: string; }
const INIT_REPORTS: Report[] = [
  { id: 1, title: '村东路灯不亮，夜间出行不便', status: '处理中', time: '今天' },
  { id: 2, title: '河边护栏破损存安全隐患', status: '已办结', time: '3天前' },
];
interface Patrol { id: number; name: string; date: string; need: number; joined: number; signed?: boolean; }
const INIT_PATROL: Patrol[] = [
  { id: 1, name: '夜间治安巡逻', date: '今晚 20:00-22:00', need: 6, joined: 4 },
  { id: 2, name: '防火巡查（秸秆禁烧）', date: '明天 全天', need: 8, joined: 5 },
  { id: 3, name: '节日安全值守', date: '周六 全天', need: 10, joined: 7 },
];
const NOTICES = [
  { id: 1, icon: '🛡️', title: '防范养老诈骗', desc: '警惕「以房养老」「保健品」「冒充公检法」等骗局，不向陌生账户转账。' },
  { id: 2, icon: '🔥', title: '冬季防火提示', desc: '安全用电用气，秸秆禁烧，离家断电关火。' },
  { id: 3, icon: '❄️', title: '雨雪天气出行提醒', desc: '路面结冰减速慢行，老人儿童尽量减少外出。' },
];

export default function SafetyPage() {
  const [tab, setTab] = useState('report');
  const [reports, setReports] = useState<Report[]>(INIT_REPORTS);
  const [patrol, setPatrol] = useState<Patrol[]>(INIT_PATROL);
  const [helped, setHelped] = useState(false);

  const sos = () => { if (helped) return; setHelped(true); Taro.showToast({ title: '已一键报警，网格员+派出所已通知', icon: 'none' }); };
  const callGrid = () => Taro.showModal({ title: '联系网格员', content: '演示号码：138****0000。正式版将接入真实网格员电话，点击即可直接拨打。', showCancel: false, confirmText: '知道了' });
  const report = () => { if (!store.requireBound()) return; Taro.showModal({ title: '隐患上报', editable: true, placeholderText: '描述安全/治安隐患（可附照片）…', success: (res: any) => { if (!res.confirm || !res.content) return; setReports(prev => [{ id: Date.now(), title: res.content, status: '处理中', time: '刚刚' }, ...prev]); Taro.showToast({ title: '已上报，网格员将核处', icon: 'none' }); } } as any); };
  const join = (p: Patrol) => {
    if (!store.requireBound()) return;
    if (p.signed || p.joined >= p.need) return;
    setPatrol(prev => prev.map(x => x.id === p.id ? { ...x, joined: x.joined + 1, signed: true } : x));
    store.addContribution('governance', '平安巡逻·' + p.name.slice(0, 6), 20);
    Taro.showToast({ title: '已提交，待审核（通过后+20计入）', icon: 'none' });
  };

  return (
    <View className="page">
      <View className="hero"><Text className="hero-title">🛡️ 平安综治</Text><Text className="hero-sub">网格治理 · 群防群治 · 守护平安</Text></View>
      <View className={`sos ${helped ? 'done' : ''}`} onClick={sos}>
        <Text className="sos-i">🆘</Text>
        <View className="sos-text"><Text className="sos-main">{helped ? '已报警，请原地等待' : '一键报警求助'}</Text><Text className="sos-sub">{helped ? '网格员与派出所已通知' : '紧急情况点此，联动网格员+派出所'}</Text></View>
      </View>
      <View className="grid-card">
        <View className="grid-l"><Text className="grid-name">我的网格员：李建国</Text><Text className="grid-info">{`第一网格 · ${store.isCommunity() ? '一号网格' : '范庄村一组'} · 24h在线`}</Text></View>
        <View className="grid-call" onClick={callGrid}><Text className="grid-call-t">📞 联系</Text></View>
      </View>
      <View className="cctv"><Text className="cctv-t">{`📹 雪亮工程：全${store.orgLabel()} 18 个视频联防点 · 重点区域全覆盖`}</Text></View>
      <View className="tabs">{TABS.map(t => (<View key={t.key} className={`tab ${tab === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}><Text>{t.name}</Text></View>))}</View>
      <ScrollView scrollY className="body"><View className="wrap">
        {tab === 'report' && (<View>{reports.map(r => (<View key={r.id} className="rep"><View className="rep-info"><Text className="rep-title">{r.title}</Text><Text className="rep-time">{r.time}</Text></View><View className={`rep-st ${r.status === '已办结' ? 'done' : 'ing'}`}><Text className="rep-st-t">{r.status}</Text></View></View>))}<View style={{ height: '120rpx' }} /></View>)}
        {tab === 'patrol' && patrol.map(p => (
          <View key={p.id} className="patrol">
            <View className="patrol-info"><Text className="patrol-name">{p.name}</Text><Text className="patrol-meta">🕐 {p.date} · 已报名 {p.joined}/{p.need}</Text></View>
            {p.signed ? <View className="patrol-done"><Text className="patrol-done-t">已报名 ✓</Text></View> : <View className={`patrol-btn ${p.joined >= p.need ? 'full' : ''}`} onClick={() => join(p)}><Text className="patrol-btn-t">{p.joined >= p.need ? '已满' : '报名'}</Text></View>}
          </View>
        ))}
        {tab === 'notice' && NOTICES.map(n => (<View key={n.id} className="notice"><Text className="notice-i">{n.icon}</Text><View className="notice-info"><Text className="notice-title">{n.title}</Text><Text className="notice-desc">{n.desc}</Text></View></View>))}
      </View></ScrollView>
      {tab === 'report' && <View className="fab" onClick={report}><Text className="fab-t">＋ 上报隐患</Text></View>}
    </View>
  );
}
