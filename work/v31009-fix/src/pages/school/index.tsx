import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

const TABS = [{ key: 'course', name: '课程报名' }, { key: 'mine', name: '我的学习' }, { key: 'teacher', name: '讲师名师' }];
interface Course { id: number; name: string; cat: string; mode: string; dur: string; emoji: string; enrolled: number; need: number; teacher: string; }
const COURSES: Course[] = [
  { id: 1, name: '草莓设施栽培技术', cat: '农技', mode: '线下', dur: '2天', emoji: '🍓', enrolled: 7, need: 10, teacher: '张技术·高级农艺师' },
  { id: 2, name: '手机直播带货入门', cat: '电商', mode: '线上', dur: '6课时', emoji: '📱', enrolled: 9, need: 10, teacher: '李老师·电商讲师' },
  { id: 3, name: '家政服务（月嫂/保洁）', cat: '家政', mode: '线下', dur: '15天·考证', emoji: '🧹', enrolled: 4, need: 8, teacher: '待匹配' },
  { id: 4, name: '乡村厨师·特色菜', cat: '烹饪', mode: '线下', dur: '10天', emoji: '🍳', enrolled: 6, need: 8, teacher: '王师傅·党员名师' },
  { id: 5, name: '电商美工与运营', cat: '电商', mode: '线上', dur: '12课时', emoji: '💻', enrolled: 3, need: 10, teacher: '待匹配' },
  { id: 6, name: '农产品电商打包发货', cat: '电商', mode: '线下', dur: '1天', emoji: '📦', enrolled: 5, need: 5, teacher: '李老师·电商讲师' },
];
const TEACHERS = [
  { name: '张技术', field: '设施农业', org: '区农技站·高级农艺师' },
  { name: '李老师', field: '电商直播', org: '电商产业园讲师' },
  { name: '王师傅', field: '烹饪', org: '县烹饪协会·党员名师' },
];
interface Mine { id: number; name: string; hours: number; cert: boolean; }

export default function SchoolPage() {
  const [tab, setTab] = useState('course');
  const [mine, setMine] = useState<Mine[]>([]);
  const [enrolls, setEnrolls] = useState<Record<number, number>>(() => { const o: Record<number, number> = {}; COURSES.forEach(c => { o[c.id] = c.enrolled; }); return o; });

  useDidShow(() => setMine(Taro.getStorageSync('gx_school') || []));

  const enroll = (c: Course) => {
    if (!store.requireBound()) return;
    if (mine.find(m => m.id === c.id)) { Taro.showToast({ title: '已报名该课程', icon: 'none' }); return; }
    const cur = enrolls[c.id] ?? c.enrolled;
    Taro.showModal({
      title: '课程报名', content: `报名「${c.name}」（${c.mode} · ${c.dur}）？\n当前已报 ${cur}/${c.need} 人，满 ${c.need} 人即成班、匹配讲师开课。`, confirmText: '确认报名',
      success: (r) => {
        if (!r.confirm) return;
        const n = cur + 1;
        setEnrolls(e => ({ ...e, [c.id]: n }));
        const next = [...mine, { id: c.id, name: c.name, hours: 0, cert: false }];
        setMine(next); Taro.setStorageSync('gx_school', next);
        store.addContribution('growth', '技能学习·' + c.name.slice(0, 6), 20);
        if (n >= c.need) {
          Taro.showModal({ title: '🎉 满员成班！', content: `「${c.name}」已满 ${c.need} 人，正式成班！\n平台已匹配讲师：${c.teacher}\n将于近期开课，请留意开课通知。`, showCancel: false });
        } else {
          Taro.showToast({ title: `报名成功，还差 ${c.need - n} 人成班`, icon: 'none' });
        }
      },
    });
  };
  const learn = (id: number) => {
    const next = mine.map(m => m.id === id ? { ...m, hours: Math.min(100, m.hours + 25), cert: m.hours + 25 >= 100 } : m);
    setMine(next); Taro.setStorageSync('gx_school', next);
    const m = next.find(x => x.id === id);
    Taro.showToast({ title: m?.cert ? '已结课，获得证书 🎓' : `学习 +25%（${m?.hours}%）`, icon: 'none' });
  };

  return (
    <View className="page">
      <View className="hero"><Text className="hero-title">🎓 技能学堂</Text><Text className="hero-sub">富口袋更富脑袋 · 学技能好就业</Text></View>
      <View className="tabs">{TABS.map(t => (<View key={t.key} className={`tab ${tab === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}><Text>{t.name}</Text></View>))}</View>
      <ScrollView scrollY className="body"><View className="wrap">
        {tab === 'course' && COURSES.map(c => (
          <View key={c.id} className="course">
            <View className="course-img"><Text style={{ fontSize: '48rpx' }}>{c.emoji}</Text></View>
            <View className="course-info">
              <Text className="course-name">{c.name}</Text>
              <View className="course-tags"><Text className="ctag">{c.cat}</Text><Text className="ctag">{c.mode}</Text><Text className="ctag">{c.dur}</Text></View>
              <View style={{ height: '8rpx', background: '#f3f4f6', borderRadius: '100rpx', overflow: 'hidden', marginTop: '10rpx' }}><View style={{ height: '100%', background: (enrolls[c.id] ?? c.enrolled) >= c.need ? '#16a34a' : '#f59e0b', width: `${Math.min(100, Math.round((enrolls[c.id] ?? c.enrolled) / c.need * 100))}%` }} /></View>
              <Text style={{ fontSize: '20rpx', color: (enrolls[c.id] ?? c.enrolled) >= c.need ? '#16a34a' : '#9ca3af', marginTop: '4rpx' }}>{(enrolls[c.id] ?? c.enrolled) >= c.need ? `✓ 已满${c.need}人成班 · 讲师 ${c.teacher}` : `已报 ${enrolls[c.id] ?? c.enrolled}/${c.need} 人 · 满${c.need}人开班`}</Text>
            </View>
            <View className="course-btn" onClick={() => enroll(c)}><Text className="course-btn-t">报名</Text></View>
          </View>
        ))}
        {tab === 'mine' && (mine.length === 0 ? <View className="empty"><Text className="empty-t">还没报名课程，去「课程报名」看看</Text></View> : mine.map(m => (
          <View key={m.id} className="mine" onClick={() => learn(m.id)}>
            <View className="mine-top"><Text className="mine-name">{m.name}</Text>{m.cert && <Text className="mine-cert">🎓 已结课</Text>}</View>
            <View className="bar"><View className="bar-fill" style={{ width: `${m.hours}%` }} /></View>
            <Text className="mine-h">学习进度 {m.hours}%{m.hours < 100 ? '（点击继续学习）' : ''}</Text>
          </View>
        )))}
        {tab === 'teacher' && TEACHERS.map((t, i) => (<View key={i} className="teacher"><View className="teacher-av"><Text style={{ fontSize: '40rpx' }}>👨‍🏫</Text></View><View className="teacher-info"><Text className="teacher-name">{t.name}</Text><Text className="teacher-field">{t.field}</Text><Text className="teacher-org">{t.org}</Text></View></View>))}
        <View style={{ height: '40rpx' }} />
      </View></ScrollView>
    </View>
  );
}
