import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store, Wish, WishStatus } from '../../store';
import { cloudApi, CLOUD_ENABLED } from '../../utils/cloud';
import './index.css';

const STATUS_TEXT: Record<WishStatus, string> = { open: '招募认领中', partial: '部分实现', done: '已实现' };
const ME = '我';

export default function PartyWishPage() {
  const [wishes, setWishes] = useState<Wish[]>(() => store.getWishes());
  const [filter, setFilter] = useState<'all' | WishStatus>('all');
  const [allowed, setAllowed] = useState(store.isPartyMember());

  useDidShow(() => {
    const ok = store.isPartyMember(); setAllowed(ok);
    setWishes(store.getWishes());
    if (!ok) {
      Taro.showModal({ title: '党建联建', content: '党建联建内容仅面向在册党员开放浏览与参与，请先在「我的」绑定 / 切换党员身份', showCancel: false, success: () => Taro.reLaunch({ url: '/pages/index/index' }) });
    }
  });

  const addContrib = () => {
    if (CLOUD_ENABLED) cloudApi.contribution.add('认领微心愿', 30, '乡风贡献').catch(() => {});
    else store.addContribution('custom', '认领微心愿', 30);
  };

  const claim = (id: number) => {
    const w = wishes.find(x => x.id === id);
    if (!w || w.claimers.includes(ME)) { Taro.showToast({ title: '你已认领', icon: 'none' }); return; }
    Taro.showModal({
      title: '联合认领',
      content: '党员可共同认领、合力办成。认领即计入办实事台账，认领即得 30 贡献值。确认加入认领？',
      confirmText: '我也来认领',
      success: (res) => {
        if (!res.confirm) return;
        const next = wishes.map(x => {
          if (x.id !== id) return x;
          const claimers = [...x.claimers, ME];
          return { ...x, claimers, status: (claimers.length >= x.target ? 'done' : x.status) as WishStatus };
        });
        store.setWishes(next); setWishes(next);
        addContrib();
        Taro.showToast({ title: '认领即得 30 贡献值', icon: 'none' });
      },
    });
  };

  const settle = (id: number) => {
    if (!store.canManageVillage()) { Taro.showToast({ title: `仅${store.adminLabel()} / 党组织可结算办结`, icon: 'none' }); return; }
    const w = wishes.find(x => x.id === id);
    if (!w) return;
    const full = w.claimers.length >= w.target;
    Taro.showModal({
      title: '到期结算',
      content: full
        ? '认领已满额，确认全部办结？'
        : `已有 ${w.claimers.length}/${w.target} 名党员认领。到期可按已认领部分先行办理（部分实现）。`,
      confirmText: '确认结算',
      success: (res) => {
        if (!res.confirm) return;
        const next = wishes.map(x => x.id === id ? { ...x, status: (full ? 'done' : 'partial') as WishStatus } : x);
        store.setWishes(next); setWishes(next);
        Taro.showToast({ title: full ? '已全部办结' : '已按部分实现结算', icon: 'none' });
      },
    });
  };

  const post = () => {
    Taro.showModal({
      title: '发布微心愿',
      editable: true,
      placeholderText: '写下你的心愿，党员将联合认领',
      success: (res: any) => {
        if (!res.confirm || !res.content) return;
        const w: Wish = {
          id: Date.now(), from: store.getUser()?.name || store.memberLabel(), tag: '群众诉求',
          content: res.content, date: '今天', deadline: '15天后', target: 3, claimers: [], status: 'open',
        };
        const next = [w, ...wishes];
        store.setWishes(next); setWishes(next);
        Taro.showToast({ title: '已发布，等待党员认领', icon: 'success' });
      },
    } as any);
  };

  const stats = {
    open: wishes.filter(w => w.status === 'open').length,
    partial: wishes.filter(w => w.status === 'partial').length,
    done: wishes.filter(w => w.status === 'done').length,
  };
  const filtered = filter === 'all' ? wishes : wishes.filter(w => w.status === filter);

  if (!allowed) {
    return (<View className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Text style={{ fontSize: '30rpx', color: '#9ca3af' }}>🔒 党建·微心愿仅在册党员可访问</Text></View>);
  }

  return (
    <View className="page">
      <View className="header">
        <Text className="header-title">💝 微心愿·联合认领</Text>
        <Text className="header-sub">党员合力认领、办实事，让微心愿照进现实</Text>
        <View className="header-stats">
          <View className="hs-item"><Text className="hs-num">{stats.open}</Text><Text className="hs-label">招募中</Text></View>
          <View className="hs-item"><Text className="hs-num">{stats.partial}</Text><Text className="hs-label">部分实现</Text></View>
          <View className="hs-item"><Text className="hs-num">{stats.done}</Text><Text className="hs-label">已实现</Text></View>
        </View>
      </View>

      <View className="filter-bar">
        {([['all', '全部'], ['open', '招募中'], ['partial', '部分实现'], ['done', '已实现']] as const).map(([k, label]) => (
          <View key={k} className={`filter-item ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>
            <Text>{label}</Text>
          </View>
        ))}
      </View>

      <ScrollView scrollY className="body">
        {filtered.map(w => {
          const pct = Math.min(100, Math.round(w.claimers.length / w.target * 100));
          const mine = w.claimers.includes(ME);
          return (
            <View key={w.id} className="wish-card">
              <View className="wish-head">
                <View className="wish-tag"><Text className="wish-tag-text">{w.tag}</Text></View>
                <View className={`wish-status st-${w.status}`}><Text className="wish-status-text">{STATUS_TEXT[w.status]}</Text></View>
              </View>
              <Text className="wish-content">"{w.content}"</Text>
              <View className="wish-meta">
                <Text className="wish-from">🙋 {w.from}</Text>
                <Text className="wish-date">截止 {w.deadline}</Text>
              </View>

              <View className="claim-prog-row">
                <View className="claim-prog"><View className="claim-prog-fill" style={{ width: `${pct}%` }} /></View>
                <Text className="claim-count">{w.claimers.length}/{w.target} 党员</Text>
              </View>
              {w.claimers.length > 0 && (
                <View className="claimer-list">
                  {w.claimers.map((c, i) => (
                    <View key={i} className="claimer-chip"><Text className="claimer-chip-t">👤 {c}</Text></View>
                  ))}
                </View>
              )}

              {w.status === 'open' && (
                <View className="wish-actions">
                  {mine ? (
                    <View className="wish-btn done-mark"><Text className="wish-btn-text-g">✓ 你已认领</Text></View>
                  ) : (
                    <View className="wish-btn claim" onClick={() => claim(w.id)}><Text className="wish-btn-text">我也来认领</Text></View>
                  )}
                  {store.canManageVillage() && <View className="wish-btn settle" onClick={() => settle(w.id)}><Text className="wish-btn-text-o">到期结算</Text></View>}
                </View>
              )}
              {w.status === 'partial' && (
                <View className="partial-note"><Text className="partial-note-t">⏰ 已到期，{w.claimers.length} 名党员认领并部分办理</Text></View>
              )}
              {w.status === 'done' && (
                <View className="done-note"><Text className="done-note-t">🎉 已由 {w.claimers.length} 名党员联合办结</Text></View>
              )}
            </View>
          );
        })}
        <View style={{ height: '160rpx' }} />
      </ScrollView>

      <View className="fab" onClick={post}><Text className="fab-text">+ 发布心愿</Text></View>
    </View>
  );
}
