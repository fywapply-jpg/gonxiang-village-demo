import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

const TABS = [{ key: 'score', name: '文明积分' }, { key: 'board', name: '红黑榜' }, { key: 'star', name: '星级文明户' }, { key: 'custom', name: '移风易俗' }];
const RANK = [
  { name: '王建国', score: 1280, me: false },
  { name: '李秀兰', score: 1150, me: false },
  { name: '张玉峰', score: 980, me: false },
  { name: '我（村民）', score: 860, me: true },
  { name: '赵桂兰', score: 720, me: false },
];
const RED = [
  { name: '王建国', deed: '拾金不昧，归还失主钱包' },
  { name: '李秀兰', deed: '义务清扫村道一个月' },
  { name: '张玉峰', deed: '帮扶困难户抢收秋粮' },
];
const BLACK = [
  { name: '某村民', deed: '乱倒垃圾，经劝导已整改' },
  { name: '某村民', deed: '红白事大操大办，已签承诺整改' },
];
const STARS = [
  { name: '王建国家庭', star: 5, tag: '五星文明户' },
  { name: '李秀兰家庭', star: 5, tag: '五星文明户' },
  { name: '张玉峰家庭', star: 4, tag: '四星文明户' },
  { name: '孙德旺家庭', star: 4, tag: '四星文明户' },
];

export default function CivilityPage() {
  const [tab, setTab] = useState('score');
  const [board, setBoard] = useState<'red' | 'black'>('red');
  const [signed, setSigned] = useState(false);

  useDidShow(() => setSigned(!!Taro.getStorageSync('gx_civility_sign')));
  const report = () => { if (!store.requireBound()) return; Taro.showModal({ title: '好人好事上报', editable: true, placeholderText: '描述身边的好人好事…', success: (res: any) => { if (!res.confirm || !res.content) return; store.addContribution('custom', '文明践行·好人好事', 20); Taro.showToast({ title: `已上报，待${store.adminLabel()}审核（通过后计入）`, icon: 'none' }); } } as any); };
  const sign = () => {
    if (!store.requireBound()) return;
    if (signed) { Taro.showToast({ title: '你已签署承诺', icon: 'none' }); return; }
    Taro.showModal({
      title: '移风易俗承诺', content: '我承诺：婚事新办、丧事简办，抵制大操大办与铺张浪费，争做文明乡风带头人。\n\n确认签署？', confirmText: '郑重签署',
      success: (r) => { if (!r.confirm) return; setSigned(true); Taro.setStorageSync('gx_civility_sign', 1); store.addContribution('custom', '移风易俗·承诺签署', 30); Taro.showToast({ title: '签署成功，待审核后计入', icon: 'none' }); },
    });
  };

  return (
    <View className="page">
      <View className="hero"><Text className="hero-title">🌸 文明乡风</Text><Text className="hero-sub">积分激励 · 红黑榜 · 移风易俗</Text></View>
      <View className="tabs">{TABS.map(t => (<View key={t.key} className={`tab ${tab === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}><Text>{t.name}</Text></View>))}</View>
      <ScrollView scrollY className="body"><View className="wrap">
        {tab === 'score' && (<View>
          <View className="score-tip"><Text className="score-tip-t">⭐ 文明积分与「社会贡献·乡风维度」打通，积分可在贡献商城兑换</Text></View>
          {RANK.map((r, i) => (
            <View key={i} className={`rank ${r.me ? 'me' : ''}`}>
              <Text className={`rank-no ${i < 3 ? 'top' : ''}`}>{i + 1}</Text>
              <Text className="rank-name">{r.name}</Text>
              <Text className="rank-score">{r.score}分</Text>
            </View>
          ))}
        </View>)}
        {tab === 'board' && (<View>
          <View className="bswitch">
            <View className={`bs ${board === 'red' ? 'on red' : ''}`} onClick={() => setBoard('red')}><Text>🌟 红榜</Text></View>
            <View className={`bs ${board === 'black' ? 'on black' : ''}`} onClick={() => setBoard('black')}><Text>⚠️ 黑榜</Text></View>
          </View>
          {(board === 'red' ? RED : BLACK).map((b, i) => (
            <View key={i} className={`deed ${board}`}>
              <Text className="deed-name">{b.name}</Text>
              <Text className="deed-text">{b.deed}</Text>
            </View>
          ))}
        </View>)}
        {tab === 'star' && STARS.map((s, i) => (
          <View key={i} className="star">
            <View className="star-info"><Text className="star-name">{s.name}</Text><Text className="star-row">{'⭐'.repeat(s.star)}</Text></View>
            <View className="star-badge"><Text className="star-badge-t">{s.tag}</Text></View>
          </View>
        ))}
        {tab === 'custom' && (<View>
          <View className="rule-card">
            <Text className="rule-title">📜 范庄村村规民约（摘要）</Text>
            <Text className="rule-item">一、婚事新办，彩礼不超6万、宴席不超15桌；</Text>
            <Text className="rule-item">二、丧事简办，不大操大办、不攀比；</Text>
            <Text className="rule-item">三、邻里和睦，垃圾入桶、门前三包；</Text>
            <Text className="rule-item">四、孝老爱亲，赡养老人、关爱儿童。</Text>
          </View>
          <View className={`sign-btn ${signed ? 'done' : ''}`} onClick={sign}><Text className="sign-btn-t">{signed ? '✓ 已签署移风易俗承诺' : '郑重签署移风易俗承诺（+30 贡献值）'}</Text></View>
        </View>)}
        <View style={{ height: '120rpx' }} />
      </View></ScrollView>
      {tab === 'board' && board === 'red' && <View className="fab" onClick={report}><Text className="fab-t">＋ 上报好人好事</Text></View>}
    </View>
  );
}
