import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

interface Listing { id: number; type: 'supply' | 'demand'; name: string; emoji: string; qty: string; price: string; who: string; place: string; tag: string; }
const INIT: Listing[] = [
  { id: 1, type: 'supply', name: '红富士苹果', emoji: '🍎', qty: '5000斤', price: '2.8元/斤', who: '范庄村·王建国', place: '东丽华明', tag: '树上现摘' },
  { id: 2, type: 'supply', name: '小站稻新米', emoji: '🌾', qty: '2万斤', price: '4.5元/斤', who: '稻香合作社', place: '津南小站', tag: '现碾新米' },
  { id: 3, type: 'supply', name: '散养土鸡蛋', emoji: '🥚', qty: '800斤', price: '12元/斤', who: '李秀兰', place: '华明邻村', tag: '每日新鲜' },
  { id: 4, type: 'supply', name: '设施大棚草莓', emoji: '🍓', qty: '1200盒', price: '22元/盒', who: '范庄草莓园', place: '东丽华明', tag: '大棚直供' },
  { id: 5, type: 'demand', name: '收购应季蔬菜', emoji: '🥬', qty: '每日500斤', price: '面议', who: '东丽开发区企业食堂', place: '天津东丽', tag: '长期收购' },
  { id: 6, type: 'demand', name: '求购优质大米', emoji: '🌾', qty: '1万斤', price: '4.2元/斤', who: '和平区社区团购', place: '天津和平', tag: '消费帮扶' },
  { id: 7, type: 'demand', name: '采购年货礼盒', emoji: '🎁', qty: '2000份', price: '80元/份', who: '某商超采购部', place: '天津市区', tag: '年节订单' },
];

export default function SalesPage() {
  const [tab, setTab] = useState<'supply' | 'demand'>('supply');
  const [list, setList] = useState<Listing[]>(INIT);
  const visible = list.filter(l => l.type === tab);

  const publish = () => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: tab === 'supply' ? '发布供应' : '发布采购',
      editable: true,
      placeholderText: tab === 'supply' ? '如：红薯 3000斤 1.5元/斤' : '如：收购南瓜 2000斤',
      success: (res: any) => {
        if (!res.confirm || !res.content) return;
        const it: Listing = { id: Date.now(), type: tab, name: res.content, emoji: tab === 'supply' ? '🌾' : '🛒', qty: '详谈', price: '面议', who: store.getUser()?.name || '我', place: '范庄村', tag: tab === 'supply' ? '新发布' : '求购' };
        setList(prev => [it, ...prev]);
        Taro.showToast({ title: '发布成功', icon: 'success' });
      },
    } as any);
  };

  const connect = (l: Listing) => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: l.type === 'supply' ? '对接采购' : '对接供应',
      content: `${l.name}\n${l.type === 'supply' ? '供应方' : '采购方'}：${l.who}（${l.place}）\n数量：${l.qty}　价格：${l.price}\n\n确认对接？村社专员将为双方牵线。`,
      confirmText: '一键对接',
      success: (res) => {
        if (!res.confirm) return;
        if (store.getUser()?.role !== 'village_admin') store.addContribution('career', '产销对接·助销', 30);
        Taro.showToast({ title: '已发起对接，专员将联系双方', icon: 'none' });
      },
    });
  };

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-title">🚚 产销对接</Text>
        <Text className="hero-sub">村里好货直连城市餐桌 · 供需撮合</Text>
        <View className="hero-stat">
          <View className="hs"><Text className="hs-n">{list.filter(l => l.type === 'supply').length}</Text><Text className="hs-l">在售供应</Text></View>
          <View className="hs"><Text className="hs-n">{list.filter(l => l.type === 'demand').length}</Text><Text className="hs-l">采购需求</Text></View>
          <View className="hs"><Text className="hs-n">86万</Text><Text className="hs-l">本月成交</Text></View>
        </View>
      </View>
      <View className="tabs">
        <View className={`tab ${tab === 'supply' ? 'on' : ''}`} onClick={() => setTab('supply')}><Text>🌾 供应大厅（卖）</Text></View>
        <View className={`tab ${tab === 'demand' ? 'on' : ''}`} onClick={() => setTab('demand')}><Text>🛒 采购大厅（买）</Text></View>
      </View>
      <ScrollView scrollY className="body">
        {visible.map(l => (
          <View key={l.id} className="card" onClick={() => connect(l)}>
            <View className="card-img"><Text style={{ fontSize: '56rpx' }}>{l.emoji}</Text></View>
            <View className="card-info">
              <View className="card-top"><Text className="card-name">{l.name}</Text><View className="card-tag"><Text className="card-tag-t">{l.tag}</Text></View></View>
              <Text className="card-meta">{l.qty} · {l.price}</Text>
              <Text className="card-who">{l.type === 'supply' ? '📦' : '🏢'} {l.who} · {l.place}</Text>
            </View>
            <View className="card-btn"><Text className="card-btn-t">对接</Text></View>
          </View>
        ))}
        <View style={{ height: '140rpx' }} />
      </ScrollView>
      <View className="fab" onClick={publish}><Text className="fab-t">＋ 发布{tab === 'supply' ? '供应' : '采购'}</Text></View>
    </View>
  );
}
