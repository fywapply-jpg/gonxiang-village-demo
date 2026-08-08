import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import { cloudApi, CLOUD_ENABLED } from '../../utils/cloud';
import './index.css';

interface Proposal {
  id: string; title: string; by: string; desc: string;
  agree: number; oppose: number; status: '表决中' | '已通过' | '已采纳'; voted: boolean;
}
const LOCAL_INIT: Proposal[] = [
  { id: '1', title: '村口闲置坑塘改建为文化广场', by: '村民代表·王建国', desc: '建议将村口废弃坑塘填埋改建为休闲文化广场，配健身器材与停车位，方便村民活动。', agree: 128, oppose: 12, status: '表决中', voted: false },
  { id: '2', title: '制定红白事简办村规民约', by: '红白理事会', desc: '倡导婚事新办、丧事简办，彩礼不超过6万元，宴席不超过15桌，刹住攀比之风。', agree: 96, oppose: 34, status: '表决中', voted: false },
  { id: '3', title: '灌溉用水排班与水费分摊方案', by: '村民代表·李秀兰', desc: '夏季灌溉按地块轮排，水费按亩均摊，账目每月公示、链上可查。', agree: 152, oppose: 8, status: '已通过', voted: true },
  { id: '4', title: '村集体果园承包经营公开竞标', by: '村务监督委员会', desc: '30亩集体果园面向本村村民公开竞标承包，三年一期，收益归集体。', agree: 140, oppose: 20, status: '已采纳', voted: true },
];

// 演示环境（未接云）下的预设提案，供村民一键发起、真正入列表决
const PRESET_PROPOSALS: { title: string; desc: string }[] = [
  { title: '村道路灯加装与夜间照明改造', desc: '建议在主干道与文化广场加装太阳能路灯，方便村民夜间出行，费用一事一议、账目链上公示。' },
  { title: '村集体鱼塘承包收益公开分红', desc: '建议公开鱼塘承包收益，年底按户分红，收支明细每月公示、接受全体村民监督。' },
  { title: '增设垃圾分类回收点与保洁排班', desc: '建议在各村民小组增设垃圾分类回收点，明确保洁员排班与考核，改善村庄人居环境。' },
];

export default function CouncilPage() {
  const [list, setList] = useState<Proposal[]>(LOCAL_INIT);

  const load = async () => {
    if (!CLOUD_ENABLED) { setList(LOCAL_INIT); return; }
    try {
      const { list: cloud } = await cloudApi.proposals.list();
      setList(cloud.length ? cloud.map((p: any) => ({
        id: p._id, title: p.title, by: p.by, desc: p.desc,
        agree: p.agree, oppose: p.oppose, status: p.status, voted: p.voted,
      })) : LOCAL_INIT);
    } catch {
      setList(LOCAL_INIT);
    }
  };

  useDidShow(() => { load(); });

  const vote = async (id: string, opt: 'agree' | 'oppose') => {
    if (!store.requireBound()) return;
    const p = list.find(x => x.id === id);
    if (!p || p.voted || p.status !== '表决中') return;

    if (CLOUD_ENABLED) {
      try {
        const res = await cloudApi.proposals.vote(id, opt);
        if (res.error === 'voted') { Taro.showToast({ title: '你已投过票', icon: 'none' }); return; }
        cloudApi.contribution.add('参与村民议事', 20, '治理贡献').catch(() => {});
        await load();
        Taro.showToast({ title: '投票成功 +20 贡献值', icon: 'none' });
      } catch {
        Taro.showToast({ title: '投票失败，请重试', icon: 'none' });
      }
      return;
    }

    setList(prev => prev.map(x => x.id === id
      ? { ...x, agree: opt === 'agree' ? x.agree + 1 : x.agree, oppose: opt === 'oppose' ? x.oppose + 1 : x.oppose, voted: true }
      : x));
    store.addContributionAuto('governance', '参与村民议事', 20);
    Taro.showToast({ title: '投票成功 +20 贡献值', icon: 'none' });
  };

  const propose = () => {
    if (!store.requireBound()) return;
    if (!CLOUD_ENABLED) {
      Taro.showActionSheet({
        itemList: PRESET_PROPOSALS.map(p => p.title),
        success: (res) => {
          const preset = PRESET_PROPOSALS[res.tapIndex];
          if (!preset) return;
          const np: Proposal = {
            id: String(Date.now()), title: preset.title,
            by: `村民代表·${store.getUser()?.name || store.memberLabel()}`, desc: preset.desc,
            agree: 0, oppose: 0, status: '表决中', voted: false,
          };
          setList(prev => [np, ...prev]);
          Taro.showToast({ title: '提案已发起，全村可表决', icon: 'success' });
        },
      });
      return;
    }
    Taro.showModal({
      title: '发起提案', editable: true, placeholderText: '一句话写下你的提案',
      success: async (res: any) => {
        if (!res.confirm || !res.content) return;
        try {
          await cloudApi.proposals.create(res.content, '', store.getUser()?.name || '村民');
          await load();
          Taro.showToast({ title: '已发布，全村可见', icon: 'success' });
        } catch {
          Taro.showToast({ title: '发布失败，请重试', icon: 'none' });
        }
      },
    } as any);
  };

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-title">🗳️ {store.memberLabel()}议事厅</Text>
        <Text className="hero-sub">大家的事大家商量 · 民主决策、阳光治理</Text>
        <View className="hero-stat">
          <View className="hs-item"><Text className="hs-num">{list.length}</Text><Text className="hs-label">议题</Text></View>
          <View className="hs-item"><Text className="hs-num">{list.filter(p => p.status !== '表决中').length}</Text><Text className="hs-label">已决议</Text></View>
          <View className="hs-item"><Text className="hs-num">416</Text><Text className="hs-label">参与人次</Text></View>
        </View>
      </View>
      <ScrollView scrollY className="body">
        <View className="wrap">
          {list.map(p => {
            const total = p.agree + p.oppose;
            const pct = total ? Math.round(p.agree / total * 100) : 0;
            return (
              <View key={p.id} className="prop">
                <View className="prop-head">
                  <Text className="prop-title">{p.title}</Text>
                  <View className="prop-status" style={{ background: p.status === '表决中' ? '#fff7ed' : '#ecfdf5' }}>
                    <Text className="prop-status-t" style={{ color: p.status === '表决中' ? '#ea580c' : '#16a34a' }}>{p.status}</Text>
                  </View>
                </View>
                <Text className="prop-by">{p.by}</Text>
                <Text className="prop-desc">{p.desc}</Text>
                <View className="bar"><View className="bar-fill" style={{ width: `${pct}%` }} /></View>
                <View className="bar-meta">
                  <Text className="bar-agree">赞成 {p.agree}</Text>
                  <Text className="bar-oppose">反对 {p.oppose}</Text>
                </View>
                {p.status === '表决中' ? (
                  p.voted ? (
                    <View className="voted"><Text className="voted-t">已投票 ✓</Text></View>
                  ) : (
                    <View className="vote-row">
                      <View className="vote-btn agree" onClick={() => vote(p.id, 'agree')}><Text className="vote-t">赞成</Text></View>
                      <View className="vote-btn oppose" onClick={() => vote(p.id, 'oppose')}><Text className="vote-t-o">反对</Text></View>
                    </View>
                  )
                ) : (
                  <View className="result"><Text className="result-t">表决结果：{pct}% 赞成 · {p.status}</Text></View>
                )}
              </View>
            );
          })}
        </View>
        <View style={{ height: '120rpx' }} />
      </ScrollView>
      <View className="fab" onClick={propose}><Text className="fab-t">＋ 发起提案</Text></View>
    </View>
  );
}
