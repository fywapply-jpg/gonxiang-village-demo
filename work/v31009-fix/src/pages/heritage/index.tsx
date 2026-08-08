import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import './index.css';

const CATS = ['全部', '手工艺', '传统技艺', '民俗表演'];
interface Item { id: number; cat: string; name: string; emoji: string; inheritor: string; level: string; desc: string; }
const INIT: Item[] = [
  { id: 1, cat: '手工艺', name: '范庄剪纸', emoji: '✂️', inheritor: '王秀英', level: '区级非遗', desc: '流传百年的窗花剪纸技艺，题材丰富、寓意吉祥，逢年过节家家张贴。' },
  { id: 2, cat: '传统技艺', name: '老式手工挂面', emoji: '🍜', inheritor: '李建国', level: '区级非遗', desc: '纯手工和面、醒面、拉制、晾晒，面条细如发丝、口感筋道。' },
  { id: 3, cat: '民俗表演', name: '高跷秧歌', emoji: '🎭', inheritor: '张文武', level: '市级非遗', desc: '逢年过节、庙会必演的传统民俗表演，热闹喜庆、群众喜爱。' },
  { id: 4, cat: '手工艺', name: '草柳编', emoji: '🧺', inheritor: '赵桂兰', level: '区级非遗', desc: '就地取材，编织篮筐、坐垫等生活器具，绿色环保、实用美观。' },
  { id: 5, cat: '传统技艺', name: '石磨豆腐', emoji: '🥢', inheritor: '孙德旺', level: '乡土技艺', desc: '石磨豆浆、卤水点制，保留传统风味，香嫩可口。' },
];

export default function HeritagePage() {
  const [cat, setCat] = useState('全部');
  const [detail, setDetail] = useState<Item | null>(null);
  const visible = cat === '全部' ? INIT : INIT.filter(i => i.cat === cat);
  const play = (n: string) => Taro.showModal({ title: '🎬 ' + n, content: '（演示）此处播放非遗技艺展演视频。正式版接入视频后可直接观看。', showCancel: false });
  const reserve = (n: string) => Taro.showModal({ title: '体验预约', content: `预约「${n}」非遗工坊体验课？`, confirmText: '确认预约', success: (r) => { if (r.confirm) Taro.showToast({ title: process.env.TARO_APP_BACKEND_SYNC === 'true' ? '非遗预约接口尚未开放' : '演示预约已记录', icon: 'none' }); } });

  return (
    <View className="page">
      <View className="hero"><Text className="hero-title">🏮 非遗文化</Text><Text className="hero-sub">守护乡土记忆 · 让非遗活起来</Text></View>
      <ScrollView scrollX className="chips">{CATS.map(c => (<View key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}><Text>{c}</Text></View>))}</ScrollView>
      <ScrollView scrollY className="body">
        <View className="grid">
          {visible.map(it => (
            <View key={it.id} className="card" onClick={() => setDetail(it)}>
              <View className="card-img"><Text style={{ fontSize: '64rpx' }}>{it.emoji}</Text><View className="card-level"><Text className="card-level-t">{it.level}</Text></View></View>
              <View className="card-info"><Text className="card-name">{it.name}</Text><Text className="card-inh">传承人 {it.inheritor}</Text></View>
            </View>
          ))}
        </View>
        <View style={{ height: '40rpx' }} />
      </ScrollView>
      {detail && (
        <View className="overlay" onClick={() => setDetail(null)}>
          <View className="sheet" onClick={(e) => e.stopPropagation()}>
            <View className="sheet-head"><Text className="sheet-title">{detail.emoji} {detail.name}</Text><Text className="sheet-close" onClick={() => setDetail(null)}>✕</Text></View>
            <View className="badge"><Text className="badge-t">{detail.level} · 传承人 {detail.inheritor}</Text></View>
            <Text className="sheet-desc">{detail.desc}</Text>
            <View className="video" onClick={() => play(detail.name)}><Text className="video-cover">{detail.emoji}</Text><Text className="video-name">▶ 观看技艺展演视频</Text></View>
            <View className="sheet-btn" onClick={() => reserve(detail.name)}><Text className="sheet-btn-t">预约非遗工坊体验</Text></View>
          </View>
        </View>
      )}
    </View>
  );
}
