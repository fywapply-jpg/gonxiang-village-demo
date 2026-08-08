import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

interface Room { id: number; name: string; emoji: string; area: string; boxes: number; star: number; games: string[]; price: string; distance: string; note: string; }

// 乡村棋牌室（村文化礼堂 / 老年活动中心 / 农家院）
const VILLAGE_ROOMS: Room[] = [
  { id: 1, name: '范庄村文化礼堂棋牌室', emoji: '🀄', area: '村文化礼堂 2 楼', boxes: 8, star: 4.8, games: ['麻将', '斗地主', '象棋'], price: '¥30/桌·半天', distance: '村中心 · 0.3km', note: '党群服务中心运营，公益低价，含免费茶水' },
  { id: 2, name: '老年活动中心棋牌室', emoji: '♟️', area: '老年活动中心', boxes: 5, star: 4.9, games: ['麻将', '象棋', '跳棋'], price: '60 岁以上免费', distance: '0.5km', note: '助老公益，党员志愿者陪护，免费茶水点心' },
  { id: 3, name: '农家茶馆棋牌院', emoji: '🍵', area: '王家农家院', boxes: 6, star: 4.6, games: ['麻将', '扑克'], price: '¥40/桌·半天', distance: '1.2km', note: '农家小院，可点农家菜，棋牌 + 餐饮一站' },
];
// 社区棋牌室（社区文体中心 / 邻里之家 / 老年之家）
const COMMUNITY_ROOMS: Room[] = [
  { id: 1, name: '社区文体活动中心棋牌室', emoji: '🀄', area: '社区文体中心 3 楼', boxes: 12, star: 4.8, games: ['麻将', '桥牌', '象棋'], price: '¥35/桌·2 小时', distance: '社区中心 · 0.2km', note: '居委会运营，独立包间、环境好，含茶水' },
  { id: 2, name: '邻里棋牌室', emoji: '♟️', area: '3 号楼架空层', boxes: 6, star: 4.6, games: ['麻将', '斗地主'], price: '¥30/桌·2 小时', distance: '0.4km', note: '邻里之家，就近方便，可代订餐' },
  { id: 3, name: '社区老年之家棋牌', emoji: '🍵', area: '社区老年之家', boxes: 5, star: 4.9, games: ['麻将', '象棋', '围棋'], price: '60 岁以上免费', distance: '0.3km', note: '助老公益，党员帮办队值守，免费茶水' },
];

const TIMES = ['上午 9:00–12:00', '下午 13:00–17:00', '晚上 18:00–22:00'];

export default function ChessPage() {
  const [community, setCommunity] = useState(store.isCommunity());
  useDidShow(() => setCommunity(store.isCommunity()));
  const rooms = community ? COMMUNITY_ROOMS : VILLAGE_ROOMS;
  const org = community ? '社区' : '乡村';
  const admin = community ? '居委会' : '村委会';
  const [sel, setSel] = useState<Room | null>(null);

  const book = (r: Room, time: string) => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: '预约棋牌室', showCancel: false, confirmText: '确认预约',
      content: `${r.name}\n时段：${time}\n${r.price}\n\n（演示）预约成功，到店报手机号即可开台。参与文体活动计社会贡献值（已到账 +3）。`,
      success: () => store.addContributionAuto('custom', '文体活动·棋牌室', 3),
    });
  };

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">🀄 {org}棋牌室</Text>
        <Text className="hero-s">整合{org}棋牌室 · {admin}运营 · 在线预约包间 · 健康文娱</Text>
      </View>
      <ScrollView scrollY className="body">
        <View className="tip"><Text className="tip-t">🎴 {admin}统一整合辖区棋牌室，明码标价、公益优先；60 岁以上多处免费，党员志愿者值守。</Text></View>
        {rooms.map(r => (
          <View key={r.id} className="card" onClick={() => setSel(r)}>
            <View className="thumb"><Text className="thumb-e">{r.emoji}</Text></View>
            <View className="info">
              <Text className="name">{r.name}</Text>
              <Text className="meta">⭐{r.star} · {r.boxes} 个包间 · {r.price}</Text>
              <Text className="area">📍 {r.area} · {r.distance}</Text>
              <View className="tags">{r.games.map(g => <Text key={g} className="tag">{g}</Text>)}</View>
            </View>
          </View>
        ))}
        <View style={{ height: '40rpx' }} />
      </ScrollView>

      {sel && (
        <View className="mask" onClick={() => setSel(null)}>
          <View className="sheet" onClick={e => e.stopPropagation()}>
            <Text className="sheet-name">{sel.emoji} {sel.name}</Text>
            <Text className="sheet-meta">⭐{sel.star} · {sel.boxes} 个包间 · {sel.price} · {sel.distance}</Text>
            <Text className="sheet-note">{sel.note}</Text>
            <Text className="sheet-sub">🀄 项目：{sel.games.join(' / ')}</Text>
            <Text className="sheet-label">选择时段预约包间</Text>
            {TIMES.map(t => (
              <View key={t} className="time-row" onClick={() => book(sel, t)}>
                <Text className="time-t">{t}</Text>
                <Text className="time-cta">预约 ›</Text>
              </View>
            ))}
            <Text className="sheet-foot">💡 参与文体活动计社会贡献值；请健康娱乐、适度参与。</Text>
          </View>
        </View>
      )}
    </View>
  );
}
