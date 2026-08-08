import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

const CATS = ['全部', '民宿', '采摘', '农事体验', '研学', '美食'];
interface Item { id: number; cat: string; name: string; emoji: string; price: string; place: string; tag: string; }
const INIT: Item[] = [
  { id: 1, cat: '民宿', name: '华明田园民宿·小院', emoji: '🏡', price: '¥288/晚', place: '范庄村', tag: '网红小院' },
  { id: 2, cat: '采摘', name: '草莓采摘园（按斤）', emoji: '🍓', price: '¥30/斤', place: '范庄草莓园', tag: '亲子热门' },
  { id: 3, cat: '农事体验', name: '插秧·磨豆腐一日游', emoji: '🌾', price: '¥98/人', place: '稻香合作社', tag: '团建首选' },
  { id: 4, cat: '研学', name: '供销文化研学路线', emoji: '📚', price: '¥128/人', place: '供销社展馆', tag: '中小学研学' },
  { id: 5, cat: '美食', name: '农家院·铁锅炖', emoji: '🍲', price: '¥68/位', place: '范庄农家乐', tag: '招牌土菜' },
  { id: 6, cat: '采摘', name: '苹果采摘+果园野餐', emoji: '🍎', price: '¥45/人', place: '蓟州果园', tag: '秋季限定' },
  { id: 7, cat: '民宿', name: '稻田观景房', emoji: '🌅', price: '¥368/晚', place: '小站稻区', tag: '观稻田日落' },
];

export default function TourismPage() {
  const [cat, setCat] = useState('全部');
  const visible = cat === '全部' ? INIT : INIT.filter(i => i.cat === cat);
  const book = (it: Item) => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: it.name,
      content: `${it.place}\n${it.price}\n\n确认预约/预订？（演示，正式版可选日期、人数、在线支付）`,
      confirmText: '立即预订',
      success: (r) => { if (r.confirm) Taro.showToast({ title: '预订成功，到店出示即可', icon: 'none' }); },
    });
  };
  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-title">🏞️ 文旅休闲</Text>
        <Text className="hero-sub">乡村民宿·采摘·研学 · 周末就来村里玩</Text>
      </View>
      <ScrollView scrollX className="chips">
        {CATS.map(c => (<View key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}><Text>{c}</Text></View>))}
      </ScrollView>
      <ScrollView scrollY className="body">
        <View className="grid">
          {visible.map(it => (
            <View key={it.id} className="card" onClick={() => book(it)}>
              <View className="card-img"><Text style={{ fontSize: '72rpx' }}>{it.emoji}</Text><View className="card-tag"><Text className="card-tag-t">{it.tag}</Text></View></View>
              <View className="card-info">
                <Text className="card-name">{it.name}</Text>
                <Text className="card-place">📍 {it.place}</Text>
                <View className="card-foot"><Text className="card-price">{it.price}</Text><View className="card-btn"><Text className="card-btn-t">预订</Text></View></View>
              </View>
            </View>
          ))}
        </View>
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
