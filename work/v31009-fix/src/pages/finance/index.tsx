import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

const TABS = [{ key: 'loan', name: '惠农贷款' }, { key: 'insure', name: '农业保险' }, { key: 'subsidy', name: '补贴查询' }];
const LOANS = [
  { id: 1, name: '整村授信·惠农贷', amount: '最高5万', rate: '年化3.85%', term: '1-3年', tag: '党员信用户优先' },
  { id: 2, name: '富民创业贷', amount: '最高20万', rate: '年化4.35%', term: '最长5年', tag: '创业带富' },
  { id: 3, name: '农机购置贷', amount: '最高15万', rate: '年化4.0%', term: '最长3年', tag: '专款专用' },
];
const INSURES = [
  { id: 1, name: '小麦种植险', cover: '保额800元/亩', fee: '自缴4元/亩', tag: '政策性' },
  { id: 2, name: '设施大棚险', cover: '保额2万/亩', fee: '自缴120元/亩', tag: '政策性' },
  { id: 3, name: '生猪养殖险', cover: '保额800元/头', fee: '自缴12元/头', tag: '政策性' },
];
const SUBSIDIES = [
  { id: 1, name: '耕地地力保护补贴', amount: '+1280元', date: '已到账 6月', ok: true },
  { id: 2, name: '农机购置补贴', amount: '+3000元', date: '已到账 5月', ok: true },
  { id: 3, name: '实际种粮农民一次性补贴', amount: '待发放', date: '预计9月', ok: false },
];

export default function FinancePage() {
  const [tab, setTab] = useState('loan');
  const apply = (name: string) => { if (!store.requireBound()) return; Taro.showModal({ title: '贷款申请', content: `申请「${name}」？\n（演示）将对接合作银行，整村授信党员信用户可快速审批。`, confirmText: '提交申请', success: (r) => { if (r.confirm) Taro.showToast({ title: '已提交，客户经理将联系', icon: 'none' }); } }); };
  const insure = (name: string) => { if (!store.requireBound()) return; Taro.showModal({ title: '投保', content: `投保「${name}」？\n（演示）政策性农险，财政补贴大部分保费。`, confirmText: '确认投保', success: (r) => { if (r.confirm) Taro.showToast({ title: '投保成功', icon: 'success' }); } }); };
  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-title">💰 助农金融</Text>
        <Text className="hero-sub">整村授信 · 贷款·保险·补贴一站办</Text>
        <View className="credit"><Text className="credit-l">我的授信额度（党员信用户）</Text><Text className="credit-n">¥50,000</Text><Text className="credit-s">可用 · 年化低至3.85% · 随借随还</Text></View>
      </View>
      <View className="tabs">{TABS.map(t => (<View key={t.key} className={`tab ${tab === t.key ? 'on' : ''}`} onClick={() => setTab(t.key)}><Text>{t.name}</Text></View>))}</View>
      <ScrollView scrollY className="body">
        <View className="wrap">
          {tab === 'loan' && LOANS.map(l => (
            <View key={l.id} className="fcard">
              <View className="fc-top"><Text className="fc-name">{l.name}</Text><View className="fc-tag"><Text className="fc-tag-t">{l.tag}</Text></View></View>
              <View className="fc-row"><Text className="fc-k">额度</Text><Text className="fc-v hot">{l.amount}</Text></View>
              <View className="fc-row"><Text className="fc-k">利率</Text><Text className="fc-v">{l.rate}</Text></View>
              <View className="fc-row"><Text className="fc-k">期限</Text><Text className="fc-v">{l.term}</Text></View>
              <View className="fc-btn" onClick={() => apply(l.name)}><Text className="fc-btn-t">在线申请</Text></View>
            </View>
          ))}
          {tab === 'insure' && INSURES.map(i => (
            <View key={i.id} className="fcard">
              <View className="fc-top"><Text className="fc-name">{i.name}</Text><View className="fc-tag"><Text className="fc-tag-t">{i.tag}</Text></View></View>
              <View className="fc-row"><Text className="fc-k">保障</Text><Text className="fc-v hot">{i.cover}</Text></View>
              <View className="fc-row"><Text className="fc-k">保费</Text><Text className="fc-v">{i.fee}</Text></View>
              <View className="fc-btn" onClick={() => insure(i.name)}><Text className="fc-btn-t">立即投保</Text></View>
            </View>
          ))}
          {tab === 'subsidy' && (<View>
            <View className="sub-tip" style={{ background: '#eff6ff' }}><Text className="sub-tip-t" style={{ color: '#1d4ed8' }}>📌 示例数据：以下补贴明细为演示内容，正式版对接财政"一卡通"后显示你本人的真实补贴。</Text></View>
            <View className="sub-tip"><Text className="sub-tip-t">🛡️ 防诈提醒：补贴均通过"一卡通"直发，不会要求转账或验证码，谨防诈骗。</Text></View>
            {SUBSIDIES.map(s => (
              <View key={s.id} className="sub">
                <View className="sub-info"><Text className="sub-name">{s.name}</Text><Text className="sub-date">{s.date}</Text></View>
                <Text className={`sub-amt ${s.ok ? 'ok' : 'wait'}`}>{s.amount}</Text>
              </View>
            ))}
          </View>)}
        </View>
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
