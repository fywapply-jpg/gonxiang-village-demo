import { useState } from 'react';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

// ── 先锋岗·党员帮扶 ───────────────────────────────────────────────────────────
interface Pioneer { name: string; households: number; gmv: number; rank: number; }
const PIONEERS: Pioneer[] = [
  { name: '王建国', households: 3, gmv: 6800, rank: 1 },
  { name: '冯韵雯', households: 2, gmv: 5200, rank: 2 },
  { name: '李秀兰', households: 2, gmv: 3400, rank: 3 },
  { name: '孙志强', households: 1, gmv: 1900, rank: 4 },
];

// 帮扶户
interface HelpHousehold { id: number; name: string; type: '脱贫户' | '监测户' | '低保户'; product: string; target: number; sold: number; pioneer: string | null; }
const HOUSEHOLDS: HelpHousehold[] = [
  { id: 1, name: '张大爷', type: '脱贫户', product: '土蜂蜜·小米', target: 3000, sold: 2100, pioneer: '王建国' },
  { id: 2, name: '刘奶奶', type: '低保户', product: '土鸡蛋·散养鸡', target: 2000, sold: 1600, pioneer: '冯韵雯' },
  { id: 3, name: '赵叔', type: '监测户', product: '红薯粉条·花椒', target: 2500, sold: 800, pioneer: '李秀兰' },
  { id: 4, name: '陈大姐', type: '脱贫户', product: '手工挂面·辣椒酱', target: 1800, sold: 0, pioneer: null },
];

// ── 消费帮扶专区商品 ──────────────────────────────────────────────────────────
interface HelpProduct { id: number; name: string; price: number; from: string; emoji: string; sold: number; }
const HELP_PRODUCTS: HelpProduct[] = [
  { id: 1, name: '张大爷家·深山土蜂蜜 500g', price: 78, from: '脱贫户·张大爷', emoji: '🍯', sold: 64 },
  { id: 2, name: '刘奶奶家·散养土鸡蛋 30枚', price: 45, from: '低保户·刘奶奶', emoji: '🥚', sold: 89 },
  { id: 3, name: '赵叔家·手工红薯粉条 2斤', price: 36, from: '监测户·赵叔', emoji: '🍠', sold: 32 },
  { id: 4, name: '陈大姐家·手工挂面 5斤', price: 42, from: '脱贫户·陈大姐', emoji: '🍜', sold: 18 },
];

export default function PartyHelpPage() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(store.isPartyMember());
  const [tab, setTab] = useState<'pioneer' | 'consume'>(
    router.params.tab === 'consume' ? 'consume' : 'pioneer'
  );
  const [households, setHouseholds] = useState(HOUSEHOLDS);

  useDidShow(() => {
    const ok = store.isPartyMember();
    setAllowed(ok);
    if (!ok) {
      Taro.showModal({ title: '党建联建', content: '党建联建内容仅面向在册党员开放浏览与参与，请先在「我的」绑定 / 切换党员身份', showCancel: false, success: () => Taro.reLaunch({ url: '/pages/index/index' }) });
    }
  });

  const claim = (id: number, name: string) => {
    if (!store.isPartyMember() && store.role() !== 'entrepreneur') { Taro.showToast({ title: '先锋助农岗面向党员 / 创业者认领', icon: 'none' }); return; }
    Taro.showModal({
      title: '认领帮扶',
      content: `确认认领帮扶「${name}」？认领后将由你负责帮其对接销路、上架带货。`,
      success: (res) => {
        if (res.confirm) {
          setHouseholds(prev => prev.map(h => h.id === id ? { ...h, pioneer: '我' } : h));
          Taro.showToast({ title: '认领成功', icon: 'success' });
        }
      },
    });
  };

  const buy = (p: HelpProduct) => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: '爱心助农',
      content: `购买「${p.name}」即为帮扶对象增收，订单金额计入消费帮扶台账。`,
      confirmText: '加入购物车',
      success: (res) => {
        if (!res.confirm) return;
        // 消费帮扶商品用 95000+ 独立 id 段，避免与助农商城(90000+)购物车串号
        store.addToCart({ id: 95000 + p.id, name: p.name, price: p.price, image: '', qty: 1, spec: '消费帮扶', shop: '消费帮扶专区' });
        Taro.showToast({ title: '已加入购物车', icon: 'success' });
      },
    });
  };

  const totalGmv = PIONEERS.reduce((s, p) => s + p.gmv, 0);
  const pioneerCount = PIONEERS.length;
  const householdCount = households.length;

  if (!allowed) {
    return (<View className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Text style={{ fontSize: '30rpx', color: '#9ca3af' }}>🔒 党建内容仅在册党员可访问</Text></View>);
  }

  return (
    <View className="page">
      {/* Tab */}
      <View className="tab-bar">
        <View className={`tab ${tab === 'pioneer' ? 'active' : ''}`} onClick={() => setTab('pioneer')}>
          <Text>🤝 先锋助农岗</Text>
        </View>
        <View className={`tab ${tab === 'consume' ? 'active' : ''}`} onClick={() => setTab('consume')}>
          <Text>🛒 消费帮扶专区</Text>
        </View>
      </View>

      <ScrollView scrollY className="body">
        {tab === 'pioneer' ? (
          <View className="wrap">
            {/* 总览 */}
            <View className="summary-card">
              <Text className="summary-title">党员先锋助农总览</Text>
              <View className="summary-row">
                <View className="summary-item"><Text className="summary-num">{pioneerCount}</Text><Text className="summary-label">认领党员</Text></View>
                <View className="summary-item"><Text className="summary-num">{householdCount}</Text><Text className="summary-label">帮扶户数</Text></View>
                <View className="summary-item"><Text className="summary-num">¥{totalGmv.toLocaleString()}</Text><Text className="summary-label">累计助销</Text></View>
              </View>
            </View>

            {/* 先锋榜 */}
            <Text className="sec-title">🏅 助农先锋榜</Text>
            <View className="rank-card">
              {PIONEERS.map(p => (
                <View key={p.name} className="rank-row">
                  <Text className={`rank-no rank-${p.rank}`}>{p.rank}</Text>
                  <View className="rank-info">
                    <Text className="rank-name">{p.name}</Text>
                    <Text className="rank-sub">帮扶 {p.households} 户</Text>
                  </View>
                  <Text className="rank-gmv">助销 ¥{p.gmv.toLocaleString()}</Text>
                </View>
              ))}
            </View>

            {/* 帮扶户 */}
            <Text className="sec-title">📋 帮扶对象</Text>
            {households.map(h => {
              const pct = Math.min(100, Math.round((h.sold / h.target) * 100));
              return (
                <View key={h.id} className="house-card">
                  <View className="house-head">
                    <View className="house-avatar"><Text>{h.name[0]}</Text></View>
                    <View className="house-info">
                      <View className="house-name-row">
                        <Text className="house-name">{h.name}</Text>
                        <View className={`house-type type-${h.type === '脱贫户' ? 'tuopin' : h.type === '监测户' ? 'jiance' : 'dibao'}`}>
                          <Text className="house-type-text">{h.type}</Text>
                        </View>
                      </View>
                      <Text className="house-product">主营：{h.product}</Text>
                    </View>
                  </View>
                  {/* 进度 */}
                  <View className="progress-info">
                    <Text className="progress-text">助销进度 ¥{h.sold} / ¥{h.target}</Text>
                    <Text className="progress-pct">{pct}%</Text>
                  </View>
                  <View className="progress-bar"><View className="progress-fill" style={{ width: `${pct}%` }} /></View>
                  {/* 认领 */}
                  <View className="house-foot">
                    {h.pioneer ? (
                      <Text className="house-pioneer">帮扶党员：{h.pioneer === '我' ? '我（已认领）' : h.pioneer}</Text>
                    ) : (
                      <>
                        <Text className="house-pioneer no-claim">暂无党员认领</Text>
                        <View className="claim-btn" onClick={() => claim(h.id, h.name)}><Text className="claim-text">认领帮扶</Text></View>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View className="wrap">
            {/* 帮扶台账 */}
            <View className="ledger-card">
              <Text className="ledger-icon">❤️</Text>
              <View className="ledger-info">
                <Text className="ledger-main">本月消费帮扶 ¥18,640</Text>
                <Text className="ledger-sub">203 人次参与 · 帮扶 12 户脱贫监测户</Text>
              </View>
            </View>

            <Text className="sec-title">🛒 帮扶商品专区</Text>
            <Text className="consume-hint">购买以下商品，所得直接帮助脱贫户、监测户增收</Text>
            {HELP_PRODUCTS.map(p => (
              <View key={p.id} className="hp-card">
                <View className="hp-img"><Text className="hp-emoji">{p.emoji}</Text></View>
                <View className="hp-info">
                  <Text className="hp-name">{p.name}</Text>
                  <View className="hp-from"><Text className="hp-from-text">❤️ {p.from}</Text></View>
                  <View className="hp-bottom">
                    <Text className="hp-price">¥{p.price}</Text>
                    <Text className="hp-sold">已助销 {p.sold}</Text>
                  </View>
                </View>
                <View className="hp-buy" onClick={() => buy(p)}><Text className="hp-buy-text">献爱心</Text></View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: '60rpx' }} />
      </ScrollView>
    </View>
  );
}
