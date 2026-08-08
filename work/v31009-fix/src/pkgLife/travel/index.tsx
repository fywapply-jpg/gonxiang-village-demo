import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

interface Tour { id: number; name: string; emoji: string; agency: string; days: string; price: number; tags: string[]; highlights: string[]; sales: number; }

// 整合本地各旅行社的线路
const TOURS: Tour[] = [
  { id: 1, name: '仰韶文化 + 地坑院 2 日研学', emoji: '🏛️', agency: '三门峡中旅', days: '2 天 1 晚', price: 398, tags: ['研学', '文化'], highlights: ['仰韶文化博物馆', '陕州地坑院民俗', '专业讲解导游', '含 1 晚食宿'], sales: 320 },
  { id: 2, name: '云台山一日游', emoji: '⛰️', agency: '豫西青旅', days: '1 日', price: 168, tags: ['山水', '一日游'], highlights: ['红石峡峡谷', '茱萸峰登高', '往返空调大巴', '含景区门票'], sales: 680 },
  { id: 3, name: '乡村采摘 + 农家乐 1 日', emoji: '🍎', agency: '范庄乡旅合作社', days: '1 日', price: 88, tags: ['采摘', '亲子'], highlights: ['当季果园采摘', '农家柴火饭', '亲子农事体验', '就近出发'], sales: 540 },
  { id: 4, name: '红色教育基地 1 日', emoji: '🚩', agency: '党建研学中心', days: '1 日', price: 128, tags: ['红色', '党建'], highlights: ['革命纪念馆参观', '重温入党誓词', '现场专题党课', '党建研学证明'], sales: 260 },
  { id: 5, name: '温泉度假 2 日', emoji: '♨️', agency: '豫西青旅', days: '2 天 1 晚', price: 580, tags: ['温泉', '休闲'], highlights: ['天然温泉泡池', '度假酒店住宿', '自助早晚餐', '往返接送'], sales: 180 },
  { id: 6, name: '江南古镇水乡 3 日', emoji: '🏘️', agency: '三门峡中旅', days: '3 天 2 晚', price: 980, tags: ['古镇', '深度游'], highlights: ['江南水乡古镇', '摇橹船游河', '特色民宿', '全程含餐'], sales: 96 },
];

const AGENCIES = ['三门峡中旅', '豫西青旅', '范庄乡旅合作社', '党建研学中心'];

export default function TravelPage() {
  const [agency, setAgency] = useState('全部');
  const [sel, setSel] = useState<Tour | null>(null);
  const list = agency === '全部' ? TOURS : TOURS.filter(t => t.agency === agency);

  const signup = (t: Tour) => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: '报名出行', showCancel: false, confirmText: `¥${t.price} 报名`,
      content: `${t.name}\n${t.agency} · ${t.days} · ¥${t.price}/人\n\n（演示）报名成功，旅行社客服会联系你确认出行日期。出游消费计社会贡献值（已到账 +5）。`,
      success: () => store.addContributionAuto('custom', '文旅出行·报名', 5),
    });
  };

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">🚌 旅游服务</Text>
        <Text className="hero-s">整合本地各旅行社 · 周边游 / 研学 / 红色教育 / 温泉度假 · 明码实价</Text>
      </View>
      <ScrollView scrollX className="filters">
        {['全部', ...AGENCIES].map(a => (
          <View key={a} className={`filter ${agency === a ? 'filter-on' : ''}`} onClick={() => setAgency(a)}>
            <Text className="filter-t">{a}</Text>
          </View>
        ))}
      </ScrollView>
      <ScrollView scrollY className="body">
        {list.map(t => (
          <View key={t.id} className="card" onClick={() => setSel(t)}>
            <View className="thumb"><Text className="thumb-e">{t.emoji}</Text></View>
            <View className="info">
              <Text className="name">{t.name}</Text>
              <Text className="meta">{t.agency} · {t.days} · 已报 {t.sales}</Text>
              <View className="tags">{t.tags.map(g => <Text key={g} className="tag">{g}</Text>)}</View>
              <Text className="price">¥{t.price}<Text className="price-u">/人</Text></Text>
            </View>
          </View>
        ))}
        <View style={{ height: '40rpx' }} />
      </ScrollView>

      {sel && (
        <View className="mask" onClick={() => setSel(null)}>
          <View className="sheet" onClick={e => e.stopPropagation()}>
            <Text className="sheet-e">{sel.emoji}</Text>
            <Text className="sheet-name">{sel.name}</Text>
            <Text className="sheet-meta">{sel.agency} · {sel.days} · 已报 {sel.sales}</Text>
            <View className="hl">
              {sel.highlights.map(h => <View key={h} className="hl-row"><Text className="hl-dot">·</Text><Text className="hl-t">{h}</Text></View>)}
            </View>
            <View className="sheet-bar">
              <Text className="sheet-price">¥{sel.price}<Text className="sheet-price-u">/人</Text></Text>
              <View className="sheet-btn" onClick={() => signup(sel)}><Text className="sheet-btn-t">立即报名</Text></View>
            </View>
            <Text className="sheet-foot">💡 已整合本地正规旅行社，行程价格公开透明；出游消费计社会贡献值。</Text>
          </View>
        </View>
      )}
    </View>
  );
}
