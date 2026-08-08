import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import TabBar from '../../components/TabBar';
import { store } from '../../store';
import './index.css';

// ── 党建活动数据 ──────────────────────────────────────────────────────────────
interface PartyEvent { date: string; title: string; members: number; status: '已完成' | '报名中'; }
const PARTY_EVENTS: PartyEvent[] = [
  { date: '11月15日', title: '主题党日活动·参观红色教育基地', members: 24, status: '已完成' },
  { date: '11月8日', title: '党员学习：习近平总书记关于乡村振兴重要论述', members: 31, status: '已完成' },
  { date: '12月1日', title: '冬季慰问困难群众志愿服务活动', members: 18, status: '报名中' },
];

// ── 党员学习园地 ──────────────────────────────────────────────────────────────
interface StudyItem { title: string; duration: string; done: boolean; materials: string[]; }
const STUDY_ITEMS: StudyItem[] = [
  { title: '11月学习主题：习近平总书记关于乡村振兴重要论述', duration: '预计30分钟', done: true,
    materials: ['视频党课：乡村振兴战略解读（18分钟）', '原文选编：《论坚持全面深化改革》节选', '图解：产业·人才·文化·生态·组织 五大振兴', '学习心得提交入口'] },
  { title: '党史故事：从延安精神看新时代基层党建', duration: '预计20分钟', done: false,
    materials: ['音频故事：延安整风与作风建设', '微视频：南泥湾大生产运动', '延伸阅读：新时代基层党建12问', '在线知识答题 · 3题'] },
];

export default function PartyPage() {
  const [allowed, setAllowed] = useState(store.isPartyMember());
  const [expanded, setExpanded] = useState<number | null>(null);
  const [studies, setStudies] = useState<StudyItem[]>(STUDY_ITEMS);

  useDidShow(() => {
    const ok = store.isPartyMember();
    setAllowed(ok);
    if (!ok) {
      Taro.showModal({ title: '党建联建', content: '党建联建内容仅面向在册党员开放浏览与参与，请先在「我的」绑定 / 切换党员身份', showCancel: false, success: () => Taro.reLaunch({ url: '/pages/index/index' }) });
    }
  });

  const signUp = (title: string) => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: '活动报名',
      content: `确认报名「${title}」？报名后可获得 20 贡献值（计入治理贡献）。`,
      success: (res) => {
        if (!res.confirm) return;
        store.addContributionAuto('governance', '党建·' + title, 20);
        Taro.showToast({ title: '报名成功 +20 贡献值', icon: 'success' });
      },
    });
  };

  const study = (i: number) => {
    const item = studies[i];
    if (item.done) { Taro.showToast({ title: '已完成学习', icon: 'success' }); return; }
    Taro.showModal({
      title: '学习资料清单',
      content: `《${item.title}》\n${item.duration}\n\n${item.materials.map((m, k) => `${k + 1}. ${m}`).join('\n')}\n\n完成学习后标记「已学习」。`,
      confirmText: '标记已学',
      success: (res) => { if (res.confirm) setStudies(prev => prev.map((s, k) => (k === i ? { ...s, done: true } : s))); },
    });
  };

  if (!allowed) {
    return (<View className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Text style={{ fontSize: '30rpx', color: '#9ca3af' }}>🔒 党建内容仅在册党员可访问</Text></View>);
  }

  return (
    <View className="page">
      {/* 头部 */}
      <View className="party-header">
        <View className="party-badge"><Text className="party-badge-text">党</Text></View>
        <View className="party-title-wrap">
          <Text className="party-title">党建助农</Text>
          <Text className="party-sub">范庄村党支部 · 党员 31 人</Text>
        </View>
        {/* 右上角交互按钮：党建联建地图 */}
        <View className="map-toggle" onClick={() => Taro.navigateTo({ url: '/pkgParty/party-map/index' })}>
          <Text className="map-toggle-text">🗺️ 联建地图</Text>
        </View>
      </View>

      <ScrollView scrollY className="party-body">
        <View className="activity-wrap">
          {/* 数据统计 */}
          <View className="stat-grid">
            {[
              { label: '党员人数', value: '31' },
              { label: '本月活动', value: '8' },
              { label: '志愿时长', value: '142h' },
            ].map(s => (
              <View key={s.label} className="stat-cell">
                <Text className="stat-num">{s.value}</Text>
                <Text className="stat-label">{s.label}</Text>
              </View>
            ))}
          </View>

          {/* 功能宫格 */}
          <View className="feature-grid">
            {[
              { icon: '🤝', label: '先锋助农', url: '/pkgParty/party-help/index?tab=pioneer' },
              { icon: '🛒', label: '消费帮扶', url: '/pkgParty/party-help/index?tab=consume' },
              { icon: '💝', label: '微心愿', url: '/pkgParty/party-wish/index' },
              { icon: '💴', label: '党费缴纳', url: '/pkgParty/party-dues/index' },
              { icon: '📋', label: '三会一课', url: '/pkgParty/party-dues/index' },
              { icon: '🚩', label: '党员风采', url: '/pkgParty/party-help/index' },
            ].map(f => (
              <View key={f.label} className="feature-item" onClick={() => Taro.navigateTo({ url: f.url })}>
                <Text className="feature-icon">{f.icon}</Text>
                <Text className="feature-label">{f.label}</Text>
              </View>
            ))}
          </View>

          {/* 党建活动 */}
          <Text className="section-title">党建活动</Text>
          {PARTY_EVENTS.map((ev, i) => (
            <View key={i} className="event-card" onClick={() => setExpanded(expanded === i ? null : i)}>
              <View className="event-head">
                <View className="event-info">
                  <Text className="event-title">{ev.title}</Text>
                  <Text className="event-meta">{ev.date} · {ev.members} 人参与</Text>
                </View>
                <View className={`event-pill ${ev.status === '已完成' ? 'pill-done' : 'pill-open'}`}>
                  <Text className="pill-text">{ev.status}</Text>
                </View>
              </View>
              {expanded === i && (
                <View className="event-detail">
                  <Text className="event-detail-text">
                    {ev.status === '报名中'
                      ? '活动正在报名中，点击报名后可获得 20 贡献值。'
                      : `本次活动已圆满完成，共 ${ev.members} 名党员及群众参与，活动记录已上传至党建档案。`}
                  </Text>
                  {ev.status === '报名中' && (
                    <View className="signup-btn" onClick={() => signUp(ev.title)}>
                      <Text className="signup-text">立即报名 · 得 20 贡献值</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          ))}

          {/* 党员学习园地 */}
          <Text className="section-title" style={{ marginTop: '24rpx' }}>党员学习园地</Text>
          {studies.map((item, i) => (
            <View key={i} className={`study-card ${item.done ? 'study-done' : ''}`} onClick={() => study(i)}>
              <View className="study-info">
                <Text className="study-title">{item.title}</Text>
                <Text className="study-duration">{item.duration}</Text>
              </View>
              <View className={`study-pill ${item.done ? 'pill-done' : 'pill-neutral'}`}>
                <Text className="pill-text">{item.done ? '已学习' : '去学习'}</Text>
              </View>
            </View>
          ))}
        </View>
        <View className="tabbar-placeholder" />
      </ScrollView>
      <TabBar active="party" />
    </View>
  );
}
