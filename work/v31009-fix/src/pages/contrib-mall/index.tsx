import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

interface Goods { id: number; name: string; cost: number; emoji: string; type: '实物' | '服务' | '券'; stock: string; }
const GOODS: Goods[] = [
  { id: 1, name: '惠农大米 10斤', cost: 200, emoji: '🌾', type: '实物', stock: '库存 36' },
  { id: 2, name: '食用油 5L', cost: 300, emoji: '🛢️', type: '实物', stock: '库存 20' },
  { id: 3, name: '农资抵用券 ¥50', cost: 150, emoji: '🎫', type: '券', stock: '不限量' },
  { id: 4, name: '免费健康体检', cost: 500, emoji: '🩺', type: '服务', stock: '名额 12' },
  { id: 5, name: '家政保洁 2小时', cost: 260, emoji: '🧹', type: '服务', stock: '名额 8' },
  { id: 6, name: '农机租赁券 1天', cost: 220, emoji: '🚜', type: '券', stock: '不限量' },
  { id: 7, name: '土蜂蜜 500g', cost: 180, emoji: '🍯', type: '实物', stock: '库存 15' },
  { id: 8, name: '话费充值 ¥30', cost: 120, emoji: '📱', type: '券', stock: '不限量' },
];
const TYPES = ['全部', '实物', '服务', '券'] as const;

// 本地兑换流水（演示：兑换记录落地 storage，页面展示「我的兑换记录」）
interface Redeem { name: string; cost: number; time: string; }
const REDEEM_KEY = 'gx_contrib_redeem';

export default function ContribMallPage() {
  const [balance, setBalance] = useState(() => store.getSpendable());
  const [type, setType] = useState<typeof TYPES[number]>('全部');
  const [records, setRecords] = useState<Redeem[]>(Taro.getStorageSync(REDEEM_KEY) || []);

  useDidShow(() => {
    setBalance(store.getSpendable());
    setRecords(Taro.getStorageSync(REDEEM_KEY) || []);
  });

  const redeem = (g: Goods) => {
    if (!store.requireBound()) return;
    if (balance < g.cost) { Taro.showToast({ title: '贡献值不足', icon: 'none' }); return; }
    Taro.showModal({
      title: '确认兑换',
      content: `用 ${g.cost} 贡献值兑换「${g.name}」？`,
      success: (res) => {
        if (!res.confirm) return;
        if (process.env.TARO_APP_BACKEND_SYNC === 'true') { Taro.showToast({ title: '贡献值兑换接口尚未开放', icon: 'none' }); return; }
        const acct = store.getContribAccount();
        store.setContribAccount({ ...acct, exchangeable: acct.exchangeable - g.cost });
        setBalance(store.getSpendable());
        // 记一条兑换流水
        const d = new Date();
        const pad = (n: number) => (n < 10 ? '0' + n : '' + n);
        const rec: Redeem = { name: g.name, cost: g.cost, time: `${d.getMonth() + 1}月${d.getDate()}日 ${pad(d.getHours())}:${pad(d.getMinutes())}` };
        const next = [rec, ...(Taro.getStorageSync(REDEEM_KEY) || [])];
        Taro.setStorageSync(REDEEM_KEY, next);
        setRecords(next);
        Taro.showToast({ title: '演示兑换已记录（未提交后台）', icon: 'none' });
      },
    });
  };

  const list = type === '全部' ? GOODS : GOODS.filter(g => g.type === type);

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-label">可用贡献值</Text>
        <Text className="hero-balance">{balance}</Text>
        <Text className="hero-hint">「共享」商品抵扣 · 贡献变实惠</Text>
        <Text className="hero-hint">可兑换按近12月有效值计（过期分不计）</Text>
      </View>
      <View className="filter">
        {TYPES.map(t => (
          <View key={t} className={`filter-item ${type === t ? 'on' : ''}`} onClick={() => setType(t)}>
            <Text>{t}</Text>
          </View>
        ))}
      </View>
      <ScrollView scrollY className="body">
        <View className="grid">
          {list.map(g => (
            <View key={g.id} className="goods">
              <View className="goods-img">
                <Text className="goods-emoji">{g.emoji}</Text>
                <View className="goods-type"><Text className="goods-type-t">{g.type}</Text></View>
              </View>
              <Text className="goods-name">{g.name}</Text>
              <Text className="goods-stock">{g.stock}</Text>
              <View className="goods-foot">
                <Text className="goods-cost">{g.cost}<Text className="goods-unit"> 贡献值</Text></Text>
                <View className={`goods-btn ${balance < g.cost ? 'disabled' : ''}`} onClick={() => redeem(g)}>
                  <Text className="goods-btn-t">兑换</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {records.length > 0 && (
          <View style={{ margin: '0 24rpx 24rpx' }}>
            <Text style={{ display: 'block', fontSize: '28rpx', fontWeight: 700, color: '#1f2937', margin: '4rpx 4rpx 14rpx' }}>🧾 我的兑换记录</Text>
            {records.map((r, i) => (
              <View key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', borderRadius: '14rpx', padding: '20rpx 24rpx', marginBottom: '12rpx' }}>
                <Text style={{ fontSize: '26rpx', color: '#1f2937', flex: 1 }}>{r.name}</Text>
                <View style={{ textAlign: 'right', marginLeft: '16rpx' }}>
                  <Text style={{ display: 'block', fontSize: '24rpx', fontWeight: 700, color: '#c81e1e' }}>-{r.cost} 贡献值</Text>
                  <Text style={{ fontSize: '20rpx', color: '#9ca3af' }}>{r.time}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
