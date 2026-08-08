import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import { creditScore, creditLevel, RIGHTS, socialRank } from '../../config/contribution-model';
import './index.css';

export default function CreditPage() {
  const cv = store.getContribAccount().total;
  const score = creditScore(cv);
  const level = creditLevel(score);
  const rank = socialRank(cv);
  const pct = Math.round((score - 600) / (950 - 600) * 100);

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-eyebrow">个人信用分（基于社会贡献）</Text>
        <Text className="hero-score">{score}</Text>
        <Text className="hero-level">{level} · {rank.icon}{rank.label}</Text>
        <View className="gauge"><View className="gauge-fill" style={{ width: `${pct}%` }} /></View>
        <Text className="hero-range">600 —————————— 950</Text>
      </View>
      <ScrollView scrollY className="body">
        <View className="card">
          <Text className="card-title">信用分构成</Text>
          <View className="comp"><Text className="comp-k">基础分</Text><Text className="comp-v">600</Text></View>
          <View className="comp"><Text className="comp-k">社会贡献加分（贡献值 × 0.15）</Text><Text className="comp-v">+{Math.round(cv * 0.15)}</Text></View>
          <View className="comp"><Text className="comp-k">违规扣分</Text><Text className="comp-v">0</Text></View>
          <View className="comp total"><Text className="comp-k">当前信用分</Text><Text className="comp-v">{score}</Text></View>
        </View>
        <Text className="sec">信用权益（贡献越多 · 信用越高 · 权益越大）</Text>
        {RIGHTS.map(r => {
          const ok = score >= r.need;
          return (
            <View key={r.name} className={`right ${ok ? '' : 'lock'}`}>
              <Text className="right-icon">{r.icon}</Text>
              <View className="right-info"><Text className="right-name">{r.name}</Text><Text className="right-desc">{r.desc}</Text></View>
              <View className={`right-st ${ok ? 'ok' : 'lk'}`}><Text className="right-st-t">{ok ? '已享' : `需${r.need}`}</Text></View>
            </View>
          );
        })}
        <View className="note-card"><Text className="note-t">{`💡 信用分由社会贡献决定，不看经济财富。让有德者有得、好人有好报，让守信成为${store.memberLabel()}最值钱的"通行证"。`}</Text></View>
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
