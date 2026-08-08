import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

// 聚光套餐（商家自购流量）
const PACKAGES = [
  { key: 'home', icon: '🏠', name: '首页焦点位', desc: '首页轮播大图，全平台最高曝光', price: 500 },
  { key: 'top', icon: '⬆️', name: '大集置顶', desc: '供享大集列表置顶，买家一进就看到', price: 300 },
  { key: 'cat', icon: '🎯', name: '分类推荐位', desc: '所属分类前排推荐，精准触达', price: 150 },
];

// 可推广 / 扶持的商品（演示）
const PROMOTABLE = [
  { id: 1, name: '蓟州老曲庄村面点', party: true },
  { id: 3, name: '蓟州柳子口黑猪肉', party: true },
  { id: 6, name: '军粮城镇大米', party: true },
  { id: 21, name: '华明红颜草莓', party: false },
  { id: 47, name: '家爱格可生食鸡蛋', party: false },
  { id: 95, name: '蜂蜜', party: false },
];

const WEEK_QUOTA = 20; // 本周免费流量扶持名额

export default function SpotlightPage() {
  const [isAdmin, setIsAdmin] = useState(store.canManageVillage());
  const [isShop, setIsShop] = useState(store.canManageShop());
  const [spot, setSpot] = useState<number[]>(store.getSpotlight());
  // 店主先选一件要推广的自家商品，再买聚光位（默认选中第一件，避免写死推 #1）
  const [pick, setPick] = useState<number>(PROMOTABLE[0].id);
  useDidShow(() => { setIsAdmin(store.canManageVillage()); setIsShop(store.canManageShop()); setSpot(store.getSpotlight()); });

  const buy = (pkg: typeof PACKAGES[number]) => {
    const picked = PROMOTABLE.find(p => p.id === pick);
    Taro.showModal({
      title: `购买「${pkg.name}」`, confirmText: `${pkg.price} 贡献值开通`,
      content: `将为你的商品「${picked?.name || '自家好货'}」开通聚光位。\n\n${pkg.desc}\n费用：${pkg.price} 贡献值/周（演示，用贡献值抵扣）。开通后该商品在供享大集优先展示、挂 ✨ 聚光星标识。`,
      success: r => { if (r.confirm) { const acct = store.getContribAccount(); if ((acct.exchangeable || 0) < pkg.price) { Taro.showToast({ title: '可兑换贡献值不足', icon: 'none' }); return; } store.setContribAccount({ ...acct, exchangeable: acct.exchangeable - pkg.price }); store.addSpotlight(pick); setSpot(store.getSpotlight()); Taro.showToast({ title: '聚光位已开通', icon: 'success' }); } },
    });
  };

  const grant = (item: typeof PROMOTABLE[number]) => {
    if (spot.includes(item.id)) { Taro.showToast({ title: '已在扶持中', icon: 'none' }); return; }
    if (spot.length >= WEEK_QUOTA) { Taro.showToast({ title: '本周名额已用完', icon: 'none' }); return; }
    Taro.showModal({
      title: '流量扶持', confirmText: '分配名额',
      content: `把本周免费流量扶持名额分给「${item.name}」${item.party ? '（🚩党员商户）' : ''}。\n\n分配后该商品在供享大集置顶、挂 ✨ 聚光星，本周内持续曝光。`,
      success: r => { if (r.confirm) { store.addSpotlight(item.id); setSpot(store.getSpotlight()); Taro.showToast({ title: '已分配聚光名额', icon: 'success' }); } },
    });
  };

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">✨ 聚光星</Text>
        <Text className="hero-s">让好货被看见 · {isAdmin ? '党建流量扶持 · 助农好货优先曝光' : isShop ? '花贡献值推自己的好商品' : '好货聚光 · 精选推荐'}</Text>
      </View>
      <ScrollView scrollY className="body">
        <View className="card">
          <Text className="card-t">🔦 当前聚光中（{spot.length}）</Text>
          <Text className="card-sub">这些商品正在供享大集获得优先曝光、挂 ✨ 聚光星标识</Text>
        </View>

        {/* 管理员：流量扶持 */}
        {isAdmin && (
          <View>
            <View className="quota">
              <Text className="quota-t">本周流量扶持池</Text>
              <Text className="quota-n">{spot.length} / {WEEK_QUOTA}</Text>
              <Text className="quota-sub">名额已用 / 本周总额 · 优先扶持党员商户与助农好货</Text>
            </View>
            <Text className="sec">选择商品分配扶持名额</Text>
            {PROMOTABLE.map(item => (
              <View key={item.id} className="row" onClick={() => grant(item)}>
                <View className="row-l">
                  <Text className="row-name">{item.name}{item.party ? ' 🚩' : ''}</Text>
                  <Text className="row-sub">{spot.includes(item.id) ? '✨ 聚光中' : '未推广'}</Text>
                </View>
                <View className={`row-btn ${spot.includes(item.id) ? 'row-btn-off' : ''}`}><Text className="row-btn-t">{spot.includes(item.id) ? '已扶持' : '分配名额'}</Text></View>
              </View>
            ))}
          </View>
        )}

        {/* 店主：买流量 */}
        {isShop && !isAdmin && (
          <View>
            <Text className="sec">① 选择要推广的自家商品</Text>
            {PROMOTABLE.map(item => (
              <View key={item.id} className="row" onClick={() => setPick(item.id)}>
                <View className="row-l">
                  <Text className="row-name">{item.name}</Text>
                  <Text className="row-sub">{pick === item.id ? '✨ 已选中，将为它开通聚光位' : '点此选中'}</Text>
                </View>
                <View className={`row-btn ${pick === item.id ? '' : 'row-btn-off'}`}><Text className="row-btn-t">{pick === item.id ? '已选' : '选它'}</Text></View>
              </View>
            ))}
            <Text className="sec">② 买聚光位 · 推自己的好商品</Text>
            {PACKAGES.map(pkg => (
              <View key={pkg.key} className="pkg" onClick={() => buy(pkg)}>
                <Text className="pkg-icon">{pkg.icon}</Text>
                <View className="pkg-info">
                  <Text className="pkg-name">{pkg.name}</Text>
                  <Text className="pkg-desc">{pkg.desc}</Text>
                </View>
                <View className="pkg-buy"><Text className="pkg-price">{pkg.price} 贡献值</Text><Text className="pkg-unit">/周</Text></View>
              </View>
            ))}
            <View className="tip"><Text className="tip-t">📈 演示数据：聚光位平均带来 3-5 倍曝光、约 2 倍下单转化。党员商户享流量倾斜。</Text></View>
          </View>
        )}

        {/* 买家：说明 */}
        {!isShop && !isAdmin && (
          <View className="tip"><Text className="tip-t">✨ 供享大集里挂「聚光星」的商品，是党组织流量扶持的助农好货或商家精选推荐。放心选、助农稳。</Text></View>
        )}
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
