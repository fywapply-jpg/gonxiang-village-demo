import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import TabBar from '../../components/TabBar';
import './index.css';

const STATS = [
  { icon: '🏠', num: '12', label: '帮扶贫困户' },
  { icon: '💰', num: '¥38.6万', label: '带动农产销售' },
  { icon: '👷', num: '47', label: '促成就业' },
  { icon: '⏱️', num: '142h', label: '志愿服务时长' },
];

interface Badge { icon: string; name: string; desc: string; earned: boolean; }
const BADGES: Badge[] = [
  { icon: '🌾', name: '助农先锋', desc: '助农销售破30万', earned: true },
  { icon: '🛒', name: '消费帮扶达人', desc: '帮扶户商品月销破百', earned: true },
  { icon: '💼', name: '就业红娘', desc: '促成就业超40人', earned: true },
  { icon: '🚩', name: '党建标兵', desc: '三会一课满勤', earned: true },
  { icon: '❤️', name: '公益之星', desc: '志愿时长破200h', earned: false },
  { icon: '🏆', name: '振兴楷模', desc: '帮扶户全部脱贫', earned: false },
];

interface Honor { date: string; title: string; org: string; }
const HONORS: Honor[] = [
  { date: '2026年5月', title: '市级「乡村振兴示范村」', org: '天津市农业农村委员会' },
  { date: '2026年3月', title: '消费帮扶先进集体', org: '湖滨区乡村振兴局' },
  { date: '2025年12月', title: '年度脱贫攻坚成效突出村', org: '方城乡人民政府' },
  { date: '2025年9月', title: '数字乡村建设试点村', org: '河南省大数据局' },
];

export default function AchievementPage() {
  const earnedCount = BADGES.filter(b => b.earned).length;

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-title">范庄村 · 帮扶成果</Text>
        <Text className="hero-sub">范庄村党支部 · 自 2024 年开展助农帮扶</Text>
        <View className="hero-line">
          <Text className="hero-line-text">🎖️ 已获 {earnedCount} 枚勋章 · {HONORS.length} 项荣誉</Text>
        </View>
      </View>

      <ScrollView scrollY className="body">
        <View className="wrap">
          {/* 成果数据 */}
          <View className="stat-grid">
            {STATS.map(s => (
              <View key={s.label} className="stat-card">
                <Text className="stat-icon">{s.icon}</Text>
                <Text className="stat-num">{s.num}</Text>
                <Text className="stat-label">{s.label}</Text>
              </View>
            ))}
          </View>

          {/* 脱贫进度 */}
          <View className="prog-card">
            <View className="prog-head">
              <Text className="prog-title">脱贫攻坚进度</Text>
              <Text className="prog-val">10 / 12 户已脱贫</Text>
            </View>
            <View className="prog-bar"><View className="prog-fill" style={{ width: '83%' }} /></View>
            <Text className="prog-hint">剩余 2 户监测户预计今年内稳定脱贫</Text>
          </View>

          {/* 勋章墙 */}
          <Text className="sec-title">荣誉勋章</Text>
          <View className="badge-grid">
            {BADGES.map(b => (
              <View key={b.name} className={`badge ${b.earned ? '' : 'badge-locked'}`} onClick={() => Taro.showToast({ title: b.earned ? `已获得：${b.name}` : `未解锁：${b.desc}`, icon: 'none' })}>
                <Text className="badge-icon">{b.earned ? b.icon : '🔒'}</Text>
                <Text className="badge-name">{b.name}</Text>
                <Text className="badge-desc">{b.desc}</Text>
              </View>
            ))}
          </View>

          {/* 荣誉时间线 */}
          <Text className="sec-title">所获荣誉</Text>
          <View className="timeline">
            {HONORS.map((h, i) => (
              <View key={i} className="tl-item">
                <View className="tl-dot" />
                {i < HONORS.length - 1 && <View className="tl-line" />}
                <View className="tl-content">
                  <Text className="tl-title">{h.title}</Text>
                  <Text className="tl-org">{h.org}</Text>
                  <Text className="tl-date">{h.date}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
        <View className="tabbar-placeholder" />
      </ScrollView>

      <TabBar active="achievement" />
    </View>
  );
}
