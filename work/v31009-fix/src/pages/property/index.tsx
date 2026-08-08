import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

interface Deal { id: number; cat: string; title: string; area: string; years: string; price: string; status: '挂牌中' | '交易中' | '已成交'; by: string; }
const CATS = ['全部', '土地经营权', '宅基地', '集体资产', '林权'];
const INIT: Deal[] = [
  { id: 1, cat: '土地经营权', title: '范庄村东30亩连片耕地', area: '30亩', years: '5年', price: '800元/亩/年', status: '挂牌中', by: '范庄村集体' },
  { id: 2, cat: '集体资产', title: '村集体果园承包经营', area: '45亩', years: '3年', price: '底价12万/年', status: '交易中', by: '村股份经济合作社' },
  { id: 3, cat: '宅基地', title: '闲置宅基地使用权流转', area: '0.3亩', years: '20年', price: '面议', status: '挂牌中', by: '村民·赵某' },
  { id: 4, cat: '林权', title: '公益林管护权', area: '120亩', years: '10年', price: '政策补贴', status: '挂牌中', by: '范庄村集体' },
  { id: 5, cat: '土地经营权', title: '西洼地高标准农田', area: '80亩', years: '5年', price: '750元/亩/年', status: '已成交', by: '范庄村集体' },
];

export default function PropertyPage() {
  const [cat, setCat] = useState('全部');
  const [list, setList] = useState<Deal[]>(INIT);
  const visible = cat === '全部' ? list : list.filter(d => d.cat === cat);

  const detail = (d: Deal) => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: d.title,
      content: `类别：${d.cat}\n面积：${d.area}　年限：${d.years}\n价格：${d.price}\n发包方：${d.by}\n状态：${d.status}\n\n本交易由村务监督委员会监督、三资平台公示；正式交易对接天津市农村产权交易所办理，买卖双方联系方式由平台居间对接。${d.status === '挂牌中' ? '\n确认摘牌报名？' : ''}`,
      showCancel: d.status === '挂牌中',
      confirmText: d.status === '挂牌中' ? '摘牌报名' : '知道了',
      success: (res) => { if (d.status === '挂牌中' && res.confirm) { Taro.showToast({ title: '已报名，等待资格审核', icon: 'none' }); } },
    });
  };
  const publish = () => {
    if (!store.requireBound()) return;
    const admin = store.canManageVillageOnly();
    Taro.showModal({
      title: admin ? '发布产权流转' : '申请产权流转', editable: true, placeholderText: '如：南地20亩耕地 流转5年',
      success: (res: any) => {
        if (!res.confirm || !res.content) return;
        setList(prev => [{ id: Date.now(), cat: '土地经营权', title: res.content, area: '详见', years: '面议', price: '面议', status: '挂牌中', by: store.getUser()?.name || '我' }, ...prev]);
        Taro.showToast({ title: admin ? '已挂牌，进入三资监督流程' : '已提交，经村委审核公示后正式挂牌', icon: 'none' });
      },
    } as any);
  };

  const stCls = (s: string) => s === '挂牌中' ? 'open' : s === '交易中' ? 'ing' : 'done';
  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-title">📄 宅基地·产权流转</Text>
        <Text className="hero-sub">农村产权阳光流转 · 三资监督、规范交易</Text>
      </View>
      <View style={{ background: '#eff6ff', borderLeft: '6rpx solid #2563eb', margin: '20rpx 24rpx 0', padding: '18rpx 22rpx', borderRadius: '0 12rpx 12rpx 0' }} onClick={() => Taro.showModal({ title: '对接天津市农村产权交易所', content: '本平台仅提供产权流转信息的发布与撮合，不直接经手交易与资金。\n\n正式交易统一对接【天津市农村产权交易所】线上办理：产权鉴证、竞价摘牌、资金监管、合同网签全流程合规。\n\n买卖双方联系方式由平台居间对接，避免绕开平台私下成交。', showCancel: false })}>
        <Text style={{ fontSize: '23rpx', color: '#1e40af', fontWeight: 600 }}>🔗 正式交易对接「天津市农村产权交易所」</Text>
        <Text style={{ fontSize: '20rpx', color: '#6b7280', display: 'block', marginTop: '4rpx' }}>平台只发布信息、居间撮合；交易与资金走交易所合规办理 ›</Text>
      </View>
      <ScrollView scrollX className="chips">
        {CATS.map(c => (<View key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}><Text>{c}</Text></View>))}
      </ScrollView>
      <ScrollView scrollY className="body">
        {visible.map(d => (
          <View key={d.id} className="deal" onClick={() => detail(d)}>
            <View className="deal-top"><Text className="deal-title">{d.title}</Text><View className={`deal-st st-${stCls(d.status)}`}><Text className="deal-st-t">{d.status}</Text></View></View>
            <View className="deal-meta"><Text className="dm">📐 {d.area}</Text><Text className="dm">⏱ {d.years}</Text><Text className="dm cat">{d.cat}</Text></View>
            <View className="deal-foot"><Text className="deal-price">{d.price}</Text><Text className="deal-by">{d.by}</Text></View>
          </View>
        ))}
        <View style={{ height: '140rpx' }} />
      </ScrollView>
      <View className="fab" onClick={publish}><Text className="fab-t">＋ 我要流转</Text></View>
    </View>
  );
}
