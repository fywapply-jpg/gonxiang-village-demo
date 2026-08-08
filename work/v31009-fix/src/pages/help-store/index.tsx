import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import TabBar from '../../components/TabBar';
import './index.css';

type HType = '脱贫户' | '监测户' | '低保户';
interface HelpProduct {
  id: number; name: string; emoji: string; household: string; htype: HType;
  price: number; unit: string; sold: number; skill: boolean; on: boolean; featured: boolean;
}

const INIT: HelpProduct[] = [
  { id: 1, name: '高山土蜂蜜', emoji: '🍯', household: '李秀英', htype: '脱贫户', price: 68, unit: '瓶', sold: 42, skill: false, on: true, featured: true },
  { id: 2, name: '散养土鸡蛋', emoji: '🥚', household: '王老栓', htype: '监测户', price: 35, unit: '30枚', sold: 88, skill: false, on: true, featured: false },
  { id: 3, name: '手工竹编簸箕', emoji: '🧺', household: '张桂兰', htype: '低保户', price: 45, unit: '个', sold: 15, skill: true, on: true, featured: false },
  { id: 4, name: '红薯粉条', emoji: '🍜', household: '刘建军', htype: '脱贫户', price: 28, unit: '斤', sold: 120, skill: false, on: true, featured: true },
  { id: 5, name: '手工虎头鞋', emoji: '👟', household: '陈春梅', htype: '低保户', price: 58, unit: '双', sold: 8, skill: true, on: false, featured: false },
];

const HTYPE_STYLE: Record<HType, { bg: string; color: string }> = {
  '脱贫户': { bg: '#fef2f2', color: '#b91c1c' },
  '监测户': { bg: '#fff7ed', color: '#ea580c' },
  '低保户': { bg: '#eff6ff', color: '#2563eb' },
};

export default function HelpStorePage() {
  const [products, setProducts] = useState<HelpProduct[]>(INIT);
  // 帮扶小店由村委统一运营管理；普通村民只能浏览选购，不能上下架/推流。
  const canManage = store.canManageVillage();

  const toggleOn = (id: number) => {
    if (!canManage) { Taro.showToast({ title: `仅${store.adminLabel()}可管理帮扶商品`, icon: 'none' }); return; }
    setProducts(p => p.map(x => x.id === id ? { ...x, on: !x.on } : x));
    Taro.showToast({ title: '已更新', icon: 'success' });
  };
  const applyFeature = (id: number) => {
    if (!canManage) { Taro.showToast({ title: `仅${store.adminLabel()}可申请推流`, icon: 'none' }); return; }
    const it = products.find(p => p.id === id);
    if (it?.featured) { Taro.showToast({ title: '已在推流中', icon: 'none' }); return; }
    Taro.showModal({
      title: '申请平台推流',
      content: `为「${it?.name}」申请平台重点推流？审核通过后将在平台首页、消费帮扶专区获得重点展示。`,
      confirmText: '提交申请',
      success: (res) => {
        if (res.confirm) {
          setProducts(p => p.map(x => x.id === id ? { ...x, featured: true } : x));
          Taro.showToast({ title: '已加入推流位', icon: 'success' });
        }
      },
    });
  };
  const add = () => { if (!canManage) { Taro.showToast({ title: `仅${store.adminLabel()}可上架帮扶商品`, icon: 'none' }); return; } Taro.showModal({ title: '上架帮扶商品', content: '可录入帮扶户的农产品或手工技能作品，平台为帮扶户商品提供免佣金通道与流量倾斜。', showCancel: false }); };
  // 村民爱心购买帮扶商品（加入购物车）
  const buyHelp = (p: HelpProduct) => { if (!store.requireBound()) return; store.addToCart({ id: 90000 + p.id, name: p.name, price: p.price, image: '', qty: 1, spec: p.unit, shop: '帮扶小店' }); Taro.showToast({ title: '已加入购物车 · 爱心助农', icon: 'success' }); };

  const households = new Set(products.map(p => p.household)).size;
  const salesAmount = products.reduce((s, p) => s + p.sold * p.price, 0);
  const featuredCount = products.filter(p => p.featured).length;

  return (
    <View className="page">
      <View className="header">
        <Text className="header-title">🛒 帮扶小店</Text>
        <Text className="header-sub">帮扶户农产品·手工技能 · 平台流量倾斜助增收</Text>
      </View>

      <ScrollView scrollY className="body">
        <View className="wrap">
          <View className="kpi-row">
            <View className="kpi"><Text className="kpi-num">{households}</Text><Text className="kpi-label">在帮扶户</Text></View>
            <View className="kpi"><Text className="kpi-num">¥{(salesAmount / 10000).toFixed(1)}万</Text><Text className="kpi-label">助农销售额</Text></View>
            <View className="kpi"><Text className="kpi-num">{featuredCount}</Text><Text className="kpi-label">平台推流中</Text></View>
          </View>

          <View className="banner">
            <Text className="banner-text">💡 帮扶户商品享 0 佣金 + 平台流量扶持，可申请「平台推流」获得首页重点展示。</Text>
          </View>

          <View className="sec-head">
            <Text className="sec-title">帮扶商品（{products.length}）</Text>
            {canManage && <Text className="sec-add" onClick={add}>+ 上架</Text>}
          </View>

          {products.filter(p => canManage || p.on).map(p => (
            <View key={p.id} className={`hp-card ${p.on ? '' : 'hp-off'}`}>
              <View className="hp-thumb">
                <Text style={{ fontSize: '48rpx' }}>{p.emoji}</Text>
                {p.featured && <View className="hp-featured"><Text className="hp-featured-text">推流中</Text></View>}
              </View>
              <View className="hp-info">
                <View className="hp-top">
                  <Text className="hp-name">{p.name}</Text>
                  {p.skill && <View className="hp-skill"><Text className="hp-skill-text">手工技能</Text></View>}
                </View>
                <View className="hp-household">
                  <Text className="hp-house-name">帮扶户 {p.household}</Text>
                  <View className="hp-htype" style={{ background: HTYPE_STYLE[p.htype].bg }}>
                    <Text className="hp-htype-text" style={{ color: HTYPE_STYLE[p.htype].color }}>{p.htype}</Text>
                  </View>
                </View>
                <View className="hp-meta">
                  <Text className="hp-price">¥{p.price}/{p.unit}</Text>
                  <Text className="hp-sold">已售 {p.sold}</Text>
                </View>
                {canManage ? (
                  <View className="hp-actions">
                    <View className={`hp-btn ${p.featured ? 'hp-btn-done' : 'hp-btn-feature'}`} onClick={() => applyFeature(p.id)}>
                      <Text className="hp-btn-text" style={{ color: p.featured ? '#16a34a' : '#fff' }}>{p.featured ? '✓ 推流中' : '申请推流'}</Text>
                    </View>
                    <View className="hp-btn hp-btn-toggle" onClick={() => toggleOn(p.id)}>
                      <Text className="hp-btn-text" style={{ color: '#6b7280' }}>{p.on ? '下架' : '上架'}</Text>
                    </View>
                  </View>
                ) : (
                  <View className="hp-actions">
                    <View className="hp-btn hp-btn-feature" onClick={() => buyHelp(p)}>
                      <Text className="hp-btn-text" style={{ color: '#fff' }}>爱心购买</Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
        <View className="tabbar-placeholder" />
      </ScrollView>

      <TabBar active="help-store" />
    </View>
  );
}
