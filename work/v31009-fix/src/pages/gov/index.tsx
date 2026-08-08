import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import './index.css';

const CATS: { icon: string; name: string; url?: string }[] = [
  { icon: '🛡️', name: '社保医保', url: '/pkgLife/social/index' },
  { icon: '🏠', name: '户籍证明' },
  { icon: '💴', name: '补贴申领' },
  { icon: '📇', name: '证照办理' },
  { icon: '🧓', name: '养老认证' },
  { icon: '🌾', name: '惠农补贴' },
];
interface Affair { id: number; name: string; online: boolean; days: string; need: string; }
const AFFAIRS: Affair[] = [
  { id: 1, name: '城乡居民医保参保登记', online: true, days: '即时办', need: '身份证、户口本' },
  { id: 2, name: '高龄老人补贴申领', online: true, days: '3个工作日', need: '身份证、银行卡' },
  { id: 3, name: '新生儿落户登记', online: false, days: '5个工作日', need: '出生证、户口本' },
  { id: 4, name: '残疾人两项补贴', online: true, days: '5个工作日', need: '残疾证、银行卡' },
  { id: 5, name: '临时救助申请', online: false, days: '7个工作日', need: '申请书、收入证明' },
  { id: 6, name: '农机购置补贴', online: true, days: '10个工作日', need: '购机发票、身份证' },
];

// 分类磁贴 → 该类具体可办事项清单（点分类展开二级列表，点条目走预约办理）
const CAT_ITEMS: Record<string, Affair[]> = {
  '户籍证明': [
    { id: 101, name: '户籍证明开具', online: true, days: '即时办', need: '身份证' },
    { id: 102, name: '居住 / 无房证明', online: false, days: '即时办', need: '身份证、村委核实' },
    { id: 103, name: '新生儿落户登记', online: false, days: '5个工作日', need: '出生证、父母户口本' },
    { id: 104, name: '户口迁移办理', online: false, days: '7个工作日', need: '户口本、迁入准迁证' },
    { id: 105, name: '亲属关系证明', online: true, days: '3个工作日', need: '户口本、双方身份证' },
  ],
  '补贴申领': [
    { id: 201, name: '高龄老人补贴', online: true, days: '3个工作日', need: '身份证、本人银行卡' },
    { id: 202, name: '残疾人两项补贴', online: true, days: '5个工作日', need: '残疾证、银行卡' },
    { id: 203, name: '低保金申领', online: false, days: '10个工作日', need: '家庭收入证明、身份证' },
    { id: 204, name: '临时救助金', online: false, days: '7个工作日', need: '申请书、困难证明' },
    { id: 205, name: '独生子女父母奖励', online: true, days: '5个工作日', need: '独生子女证、户口本' },
  ],
  '证照办理': [
    { id: 301, name: '城乡居民医保参保', online: true, days: '即时办', need: '身份证、户口本' },
    { id: 302, name: '社保卡申领 / 激活', online: false, days: '5个工作日', need: '身份证、一寸照' },
    { id: 303, name: '残疾证办理', online: false, days: '20个工作日', need: '二寸照、医院诊断书' },
    { id: 304, name: '老年人优待证', online: true, days: '3个工作日', need: '身份证、一寸照' },
    { id: 305, name: '生育服务登记', online: true, days: '即时办', need: '夫妻身份证、结婚证' },
  ],
  '养老认证': [
    { id: 401, name: '养老金资格认证（人脸）', online: true, days: '即时办', need: '身份证、手机刷脸' },
    { id: 402, name: '城乡居民养老参保', online: true, days: '即时办', need: '身份证、本人银行卡' },
    { id: 403, name: '养老金待遇申领', online: false, days: '15个工作日', need: '身份证、银行卡、参保凭证' },
    { id: 404, name: '高龄津贴年度核验', online: true, days: '即时办', need: '身份证' },
  ],
  '惠农补贴': [
    { id: 501, name: '耕地地力保护补贴', online: true, days: '10个工作日', need: '土地承包合同、银行卡' },
    { id: 502, name: '农机购置补贴', online: true, days: '10个工作日', need: '购机发票、身份证' },
    { id: 503, name: '种粮大户补贴', online: false, days: '15个工作日', need: '种植面积核定、银行卡' },
    { id: 504, name: '政策性农业保险理赔', online: false, days: '20个工作日', need: '保单、定损单' },
    { id: 505, name: '良种补贴申领', online: true, days: '10个工作日', need: '购种凭证、身份证' },
  ],
};

export default function GovPage() {
  const [openCat, setOpenCat] = useState<string | null>(null);

  const apply = (a: Affair) => Taro.showModal({
    title: a.name,
    content: `办理材料：${a.need}\n办理时限：${a.days}\n方式：${a.online ? '可在线提交' : '需到村党群服务中心'}\n\n确认预约办理？党员代办员将协助你完成。`,
    confirmText: '预约办理',
    success: (res) => { if (res.confirm) Taro.showToast({ title: process.env.TARO_APP_BACKEND_SYNC === 'true' ? '代办预约接口尚未开放' : '演示预约已记录（未提交后台）', icon: 'none' }); },
  });

  // 点分类：有独立页则跳转，否则在页内展开 / 收起该类可办事项清单
  const onCat = (c: { name: string; url?: string }) => {
    if (c.url) { Taro.navigateTo({ url: c.url }); return; }
    setOpenCat(prev => (prev === c.name ? null : c.name));
  };
  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-title">🏛️ 政务办事</Text>
        <Text className="hero-sub">党群服务中心 · 一站代办，最多跑一次</Text>
      </View>
      <ScrollView scrollY className="body">
        <View className="cat-card">
          {CATS.map(c => (
            <View key={c.name} className={`cat ${openCat === c.name ? 'active' : ''}`} onClick={() => onCat(c)}>
              <View className="cat-icon"><Text style={{ fontSize: '40rpx' }}>{c.icon}</Text></View>
              <Text className="cat-name">{c.name}</Text>
            </View>
          ))}
        </View>
        {openCat && (
          <View>
            <Text className="sec">「{openCat}」可办事项 · 点选办理</Text>
            <View className="list">
              {(CAT_ITEMS[openCat] || []).map(a => (
                <View key={a.id} className="row" onClick={() => apply(a)}>
                  <View className="row-info">
                    <View className="row-top">
                      <Text className="row-name">{a.name}</Text>
                      <View className={`pill ${a.online ? 'on' : 'off'}`}><Text className="pill-t">{a.online ? '可在线办' : '需到场'}</Text></View>
                    </View>
                    <Text className="row-need">材料：{a.need} · {a.days}</Text>
                  </View>
                  <Text className="row-arrow">›</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        <Text className="sec">热门事项</Text>
        <View className="list">
          {AFFAIRS.map(a => (
            <View key={a.id} className="row" onClick={() => apply(a)}>
              <View className="row-info">
                <View className="row-top">
                  <Text className="row-name">{a.name}</Text>
                  <View className={`pill ${a.online ? 'on' : 'off'}`}><Text className="pill-t">{a.online ? '可在线办' : '需到场'}</Text></View>
                </View>
                <Text className="row-need">材料：{a.need} · {a.days}</Text>
              </View>
              <Text className="row-arrow">›</Text>
            </View>
          ))}
        </View>
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
