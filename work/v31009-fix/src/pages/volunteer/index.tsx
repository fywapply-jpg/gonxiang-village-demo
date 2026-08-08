import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import { cloudApi, CLOUD_ENABLED } from '../../utils/cloud';
import './index.css';

interface Act { id: number; name: string; date: string; place: string; hours: number; joined: number; need: number; signed?: boolean; }
const INIT: Act[] = [
  { id: 1, name: '关爱独居老人·入户探访', date: '12月3日 上午', place: '范庄村各组', hours: 3, joined: 8, need: 12 },
  { id: 2, name: '人居环境整治·清扫村道', date: '12月5日 上午', place: '主村道沿线', hours: 2, joined: 15, need: 20 },
  { id: 3, name: '冬季防火宣传巡逻', date: '12月7日 晚上', place: '全村', hours: 2, joined: 6, need: 10 },
  { id: 4, name: '留守儿童四点半课堂', date: '每周三 下午', place: '党群服务中心', hours: 2, joined: 4, need: 6 },
];

export default function VolunteerPage() {
  const [list, setList] = useState<Act[]>(INIT);
  const sign = (id: number) => {
    if (!store.requireBound()) return;
    const a = list.find(x => x.id === id);
    if (!a || a.signed) return;
    if (a.joined >= a.need) { Taro.showToast({ title: '名额已满', icon: 'none' }); return; }
    setList(prev => prev.map(x => x.id === id ? { ...x, joined: x.joined + 1, signed: true } : x));
    if (CLOUD_ENABLED) {
      cloudApi.contribution.add('志愿服务·' + a.name.slice(0, 8), a.hours * 10, '治理贡献').catch(() => {});
    } else {
      store.addContribution('custom', '志愿服务·' + a.name.slice(0, 8), a.hours * 10);
    }
    Taro.showToast({ title: `已提交，待审核（通过后+${a.hours * 10}计入）`, icon: 'none' });
  };
  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-title">❤️ 志愿服务</Text>
        <Text className="hero-sub">奉献 · 友爱 · 互助 · 进步</Text>
        <View className="hero-stat">
          <View className="hs"><Text className="hs-num">142h</Text><Text className="hs-l">累计时长</Text></View>
          <View className="hs"><Text className="hs-num">68</Text><Text className="hs-l">志愿者</Text></View>
          <View className="hs"><Text className="hs-num">23</Text><Text className="hs-l">本月活动</Text></View>
        </View>
      </View>
      <ScrollView scrollY className="body">
        <View className="wrap">
          <Text className="sec">志愿活动招募</Text>
          {list.map(a => {
            const full = a.joined >= a.need;
            return (
              <View key={a.id} className="act">
                <View className="act-head">
                  <Text className="act-name">{a.name}</Text>
                  <View className="act-hours"><Text className="act-hours-t">{a.hours}h</Text></View>
                </View>
                <Text className="act-meta">🕐 {a.date}</Text>
                <Text className="act-meta">📍 {a.place}</Text>
                <View className="act-foot">
                  <Text className="act-joined">已报名 {a.joined}/{a.need}</Text>
                  {a.signed ? (
                    <View className="act-btn signed"><Text className="act-btn-t-s">已报名 ✓</Text></View>
                  ) : (
                    <View className={`act-btn ${full ? 'full' : ''}`} onClick={() => sign(a.id)}>
                      <Text className="act-btn-t">{full ? '名额已满' : '我要报名'}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
