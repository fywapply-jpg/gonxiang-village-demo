import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

interface Carpool { id: number; route: string; time: string; joined: number; need: number; driver: string; note: string; }
interface Escort { id: number; need: string; hospital: string; reward: string; star: number; taker?: string; }
interface Job { id: number; title: string; pay: string; place: string; need: number; }

const CARPOOL: Carpool[] = [
  { id: 1, route: '范庄村 → 华明第二小学', time: '早 7:00 / 晚 4:30 · 长期', joined: 3, need: 4, driver: '王建国(私家车)', note: '接送孩子上学，拼满4人均摊油费' },
  { id: 2, route: '范庄村 → 东丽区医院', time: '周一/三/五 上午', joined: 2, need: 4, driver: '李秀兰', note: '老人复查拼车，往返' },
  { id: 3, route: '范庄村 → 华明地铁站', time: '工作日早 7:30', joined: 1, need: 4, driver: '张志强', note: '通勤拼车' },
];
const ESCORT: Escort[] = [
  { id: 1, need: '陪 80 岁老人去三甲医院复查', hospital: '天津一中心医院', reward: '¥80/次', star: 5, taker: '周建伟(已接·长期)' },
  { id: 2, need: '陪同产检', hospital: '东丽区妇幼', reward: '¥60/次', star: 5 },
  { id: 3, need: '陪老人取药+挂号', hospital: '华明社区医院', reward: '¥40/次', star: 4 },
];
const JOBS: Job[] = [
  { id: 1, title: '冬枣采摘短工', pay: '¥150/天', place: '范庄村枣园', need: 5 },
  { id: 2, title: '家政保洁', pay: '¥30/小时', place: '范庄村各户', need: 2 },
  { id: 3, title: '红白事帮厨', pay: '¥200/天', place: '范庄村', need: 4 },
];

export default function NeighborPage() {
  const [tab, setTab] = useState<'car' | 'escort' | 'job'>('car');
  const [carpool, setCarpool] = useState<Carpool[]>(CARPOOL);
  const [escort, setEscort] = useState<Escort[]>(ESCORT);
  const [jobs, setJobs] = useState<Job[]>(JOBS);
  const me = store.getUser()?.name || '我';

  const joinCar = (c: Carpool) => { if (!store.requireBound()) return; if (c.joined >= c.need) { Taro.showToast({ title: '已满员', icon: 'none' }); return; } Taro.showModal({ title: '加入拼车', content: `${c.route}\n${c.time}\n司机：${c.driver}\n已拼 ${c.joined}/${c.need} 人\n\n确认加入？满员后按时段长期成单。`, confirmText: '加入', success: r => { if (!r.confirm) return; setCarpool(prev => prev.map(x => x.id === c.id ? { ...x, joined: Math.min(x.need, x.joined + 1) } : x)); Taro.showToast({ title: '已加入，司机将联系你', icon: 'none' }); } }); };
  const takeEscort = (e: Escort) => { if (!store.requireBound()) return; Taro.showModal({ title: '接单 · 陪诊', content: `${e.need}\n医院：${e.hospital}\n报酬：${e.reward}\n服务评分：${'★'.repeat(e.star)}\n\n接单后完成服务由对方五星评价，差评将影响接单资格。确认接单？`, confirmText: '接单', success: r => { if (!r.confirm) return; setEscort(prev => prev.map(x => x.id === e.id ? { ...x, taker: `${me}(已接)` } : x)); Taro.showToast({ title: '已接单', icon: 'success' }); } }); };
  const applyJob = (j: Job) => { if (!store.requireBound()) return; if (j.need <= 0) { Taro.showToast({ title: '名额已满', icon: 'none' }); return; } Taro.showModal({ title: '报名 · ' + j.title, content: `报酬：${j.pay}\n地点：${j.place}\n还需 ${j.need} 人\n\n确认报名？`, confirmText: '报名', success: r => { if (!r.confirm) return; setJobs(prev => prev.map(x => x.id === j.id ? { ...x, need: Math.max(0, x.need - 1) } : x)); Taro.showToast({ title: '报名成功', icon: 'success' }); } }); };
  const publish = () => {
    if (!store.requireBound()) return;
    const t = tab === 'car' ? '拼车' : tab === 'escort' ? '陪诊需求' : '用工/求助';
    Taro.showModal({ title: '发布' + t, editable: true, placeholderText: '简要描述，如路线 / 需求 / 报酬', success: (r: any) => {
      if (!r.confirm || !r.content) return;
      const txt = String(r.content).trim();
      const id = Date.now();
      if (tab === 'car') setCarpool(prev => [{ id, route: txt, time: '时段待定 · 新发布', joined: 0, need: 4, driver: me, note: '本人发布，等待成团' }, ...prev]);
      else if (tab === 'escort') setEscort(prev => [{ id, need: txt, hospital: '待定', reward: '面议', star: 5 }, ...prev]);
      else setJobs(prev => [{ id, title: txt, pay: '面议', place: '范庄村', need: 1 }, ...prev]);
      Taro.showToast({ title: '已发布', icon: 'success' });
    } } as any);
  };

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">🤝 邻里互助</Text>
        <Text className="hero-s">资源优化整合 · 拼车 / 陪诊 / 临时用工 · 五星评价</Text>
      </View>
      <View className="tabs">
        {([['car', '🚗 拼车'], ['escort', '🏥 陪诊'], ['job', '🔧 临时用工']] as const).map(([k, l]) => (
          <View key={k} className={`tab ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}><Text>{l}</Text></View>
        ))}
      </View>
      <ScrollView scrollY className="body">
        {tab === 'car' && carpool.map(c => (
          <View key={c.id} className="card" onClick={() => joinCar(c)}>
            <View className="row"><Text className="title">{c.route}</Text><Text className="join">{c.joined}/{c.need}人</Text></View>
            <Text className="sub">🕒 {c.time}</Text>
            <Text className="sub">👤 {c.driver}</Text>
            <Text className="note">{c.note}</Text>
            <View className="bar"><View className="fill" style={{ width: `${Math.round(c.joined / c.need * 100)}%` }} /></View>
          </View>
        ))}
        {tab === 'escort' && escort.map(e => (
          <View key={e.id} className="card" onClick={() => !e.taker && takeEscort(e)}>
            <View className="row"><Text className="title">{e.need}</Text><Text className="reward">{e.reward}</Text></View>
            <Text className="sub">🏥 {e.hospital}</Text>
            <Text className="sub">服务评分 {'★'.repeat(e.star)}</Text>
            {e.taker ? <Text className="taken">✓ {e.taker}</Text> : <View className="act"><Text className="act-t">接单</Text></View>}
          </View>
        ))}
        {tab === 'job' && jobs.map(j => (
          <View key={j.id} className="card" onClick={() => applyJob(j)}>
            <View className="row"><Text className="title">{j.title}</Text><Text className="reward">{j.pay}</Text></View>
            <Text className="sub">📍 {j.place} · 还需 {j.need} 人</Text>
            <View className="act"><Text className="act-t">报名</Text></View>
          </View>
        ))}
        <View style={{ height: '140rpx' }} />
      </ScrollView>
      <View className="fab" onClick={publish}><Text className="fab-t">＋ 发布</Text></View>
    </View>
  );
}
