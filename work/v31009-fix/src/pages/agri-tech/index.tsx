import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

const TABS = [
  { key: 'qa', name: '在线问答' },
  { key: 'class', name: '技术课堂' },
  { key: 'expert', name: '专家坐诊' },
  { key: 'pest', name: '病虫识别' },
];
interface QA { id: number; q: string; a: string; by: string; }
const QAS: QA[] = [
  { id: 1, q: '草莓叶子发黄是怎么回事？', a: '多为缺氮或根系问题，建议薄肥勤施、检查排水，避免积水沤根。', by: '农技员·张技术' },
  { id: 2, q: '小麦什么时候浇返青水合适？', a: '土壤解冻、日均温稳定3℃以上时浇，过早易冻、过晚影响分蘖。', by: '田秀才·李师傅' },
  { id: 3, q: '果树冬季如何防冻？', a: '树干涂白、根部培土、灌足越冬水，幼树可包草绳。', by: '农技员·张技术' },
];
const CLASSES = [
  { id: 1, name: '设施草莓高产栽培技术', dur: '18分钟', type: '视频', emoji: '🍓' },
  { id: 2, name: '测土配方施肥图解', dur: '图文', type: '图文', emoji: '🌱' },
  { id: 3, name: '果树整形修剪要点', dur: '25分钟', type: '视频', emoji: '🌳' },
  { id: 4, name: '绿色防控病虫害', dur: '图文', type: '图文', emoji: '🐛' },
];
interface Expert { id: number; name: string; field: string; org: string; slots: number; }
const EXPERTS: Expert[] = [
  { id: 1, name: '张技术', field: '蔬菜·草莓种植', org: '区农技推广站', slots: 5 },
  { id: 2, name: '王教授', field: '果树栽培', org: '市农科院', slots: 3 },
  { id: 3, name: '李师傅', field: '粮食作物·田秀才', org: '本乡土专家', slots: 8 },
];

export default function AgriTechPage() {
  const [tab, setTab] = useState('qa');
  const [experts, setExperts] = useState<Expert[]>(EXPERTS);
  const [qas, setQas] = useState<QA[]>(QAS);

  const ask = () => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: '我要提问', editable: true, placeholderText: '描述你的种养难题…',
      success: (res: any) => {
        if (!res.confirm || !res.content) return;
        setQas(prev => [{ id: Date.now(), q: res.content, a: '农技员将尽快解答（演示）', by: '待解答' }, ...prev]);
        Taro.showToast({ title: '已提交，农技员将解答', icon: 'none' });
      },
    } as any);
  };
  const book = (e: Expert) => {
    if (!store.requireBound()) return;
    if (e.slots <= 0) { Taro.showToast({ title: '号已约满', icon: 'none' }); return; }
    Taro.showModal({
      title: '预约专家', content: `预约 ${e.name}（${e.field}）下乡坐诊？`,
      success: (r) => { if (!r.confirm) return; if (process.env.TARO_APP_BACKEND_SYNC === 'true') { Taro.showToast({ title: '农技预约接口尚未开放', icon: 'none' }); return; } setExperts(prev => prev.map(x => x.id === e.id ? { ...x, slots: x.slots - 1 } : x)); Taro.showToast({ title: '演示预约已记录', icon: 'none' }); },
    });
  };
  const pest = () => Taro.showModal({ title: '📷 病虫识别', content: '（演示）拍照/上传作物照片，AI 识别病虫害并给出防治方案。正式版接入病虫害识别模型。', showCancel: false });
  const study = (n: string) => Taro.showModal({ title: '📚 ' + n, content: '（演示）此处播放/展示该农技教程。', showCancel: false });

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-title">📚 农技指导</Text>
        <Text className="hero-sub">专家 + 田秀才在线 · 科技到田间</Text>
      </View>
      <View className="tabs">
        {TABS.map(t => (<View key={t.key} className={`tab ${tab === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}><Text>{t.name}</Text></View>))}
      </View>
      <ScrollView scrollY className="body">
        {tab === 'qa' && (<View className="wrap">
          {qas.map(q => (
            <View key={q.id} className="qa">
              <Text className="qa-q">❓ {q.q}</Text>
              <Text className="qa-a">💬 {q.a}</Text>
              <Text className="qa-by">— {q.by}</Text>
            </View>
          ))}
          <View style={{ height: '120rpx' }} />
        </View>)}
        {tab === 'class' && (<View className="wrap">
          {CLASSES.map(c => (
            <View key={c.id} className="cls" onClick={() => study(c.name)}>
              <View className="cls-img"><Text style={{ fontSize: '48rpx' }}>{c.emoji}</Text></View>
              <View className="cls-info"><Text className="cls-name">{c.name}</Text><Text className="cls-meta">{c.type} · {c.dur}</Text></View>
              <Text className="cls-play">▶</Text>
            </View>
          ))}
        </View>)}
        {tab === 'expert' && (<View className="wrap">
          {experts.map(e => (
            <View key={e.id} className="exp">
              <View className="exp-av"><Text style={{ fontSize: '44rpx' }}>👨‍🌾</Text></View>
              <View className="exp-info"><Text className="exp-name">{e.name}</Text><Text className="exp-field">{e.field}</Text><Text className="exp-org">{e.org} · 今日剩 {e.slots} 号</Text></View>
              <View className={`exp-btn ${e.slots <= 0 ? 'dis' : ''}`} onClick={() => book(e)}><Text className="exp-btn-t">{e.slots <= 0 ? '约满' : '预约'}</Text></View>
            </View>
          ))}
        </View>)}
        {tab === 'pest' && (<View className="wrap">
          <View className="pest-card" onClick={pest}>
            <Text className="pest-icon">📷</Text>
            <Text className="pest-t">拍照识别病虫害</Text>
            <Text className="pest-sub">对准作物病斑/虫害拍照，AI 识别并给防治方案</Text>
          </View>
          <View className="pest-tip"><Text className="pest-tip-t">🗓️ 农事提醒：当前为越冬期，注意果树防冻、设施保温通风。</Text></View>
        </View>)}
      </ScrollView>
      {tab === 'qa' && <View className="fab" onClick={ask}><Text className="fab-t">＋ 我要提问</Text></View>}
    </View>
  );
}
