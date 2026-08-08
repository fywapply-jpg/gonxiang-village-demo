import { useState, useEffect } from 'react';
import Taro, { useDidShow, useShareAppMessage } from '@tarojs/taro';
import { View, Text, ScrollView, Image, Input } from '@tarojs/components';
import { store } from '../../store';
import { SERVICE_CENTERS, centerName } from '../../config/service-centers';
import { CENTER_COLORS, FREQUENT_SERVICES, FrequentService } from '../../config/frequent-services';
import TabBar from '../../components/TabBar';
import villageBanner from '../../assets/village-banner.jpg';
import flagCn from '../../assets/flag-cn.png';
import { FEATURED_CATEGORIES, FEATURED_PRODUCTS } from '../../config/featured-products';
import './index.css';

const BANNERS = [
  { id: 1, text: '🍎 秋收季节好物上新', bg: '#fef3c7', color: '#92400e' },
  { id: 2, text: '🌿 区块链溯源·品质保证', bg: '#d1fae5', color: '#065f46' },
  { id: 3, text: '🎁 邀请好友·赚佣金', bg: '#ede9fe', color: '#5b21b6' },
];

export default function IndexPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('全部');
  const [bannerIdx, setBannerIdx] = useState(0);
  const [contrib, setContrib] = useState(() => store.getContribAccount().total);
  const [usageTick, setUsageTick] = useState(0);

  useDidShow(() => {
    setContrib(store.getContribAccount().total);
  });

  // 分享卡片：用门头牌作封面（官方供销社背书，提升转发公信力）
  useShareAppMessage(() => ({
    title: `供享村社 · ${store.getUser()?.orgName || '连接城乡 助农惠民'}`,
    imageUrl: villageBanner,
    path: '/pages/index/index',
  }));

  useEffect(() => {
    const timer = setInterval(() => setBannerIdx(i => (i + 1) % BANNERS.length), 3000);
    return () => clearInterval(timer);
  }, []);

  const filtered = FEATURED_PRODUCTS.filter(p => {
    const matchSearch = !search || p.name.includes(search) || p.shortName.includes(search) || p.origin.includes(search);
    const matchCategory = category === '全部' || p.category === category;
    return matchSearch && matchCategory;
  });

  const goProduct = (id: number) => Taro.navigateTo({ url: `/pages/product/index?id=${id}` });
  const usage: Record<string, number> = Taro.getStorageSync('gx_service_clicks') || {};
  const frequentServices = FREQUENT_SERVICES
    .filter(item => !item.scope || item.scope === store.orgType())
    .sort((a, b) => (b.priority + (usage[b.key] || 0) * 6) - (a.priority + (usage[a.key] || 0) * 6))
    .slice(0, 15);
  const openFrequent = (item: FrequentService) => {
    const next = { ...usage, [item.key]: (usage[item.key] || 0) + 1 };
    Taro.setStorageSync('gx_service_clicks', next);
    setUsageTick(usageTick + 1);
    Taro.navigateTo({ url: item.url }).catch(() => Taro.showToast({ title: '页面暂无法打开', icon: 'none' }));
  };
  // 轮播 Banner 点击跳转（按当前轮播位对应的内容跳转）
  const onBanner = () => {
    if (bannerIdx === 2) { Taro.navigateTo({ url: '/pages/invite/index' }); }        // 🎁 邀请好友·赚佣金
    else if (bannerIdx === 1) { Taro.navigateTo({ url: '/pkgPlatform/web3/index' }); }      // 🌿 区块链溯源
    else { Taro.showToast({ title: '🍎 秋收好物已上新，往下逛逛「村里好物」', icon: 'none' }); } // 🍎 秋收上新
  };

  return (
    <View className="page">
      <View className="top-shell">
        <View className="home-tabs">
          <Text className="home-tab active">首页</Text>
          <Text className="home-tab" onClick={() => Taro.navigateTo({ url: '/pages/service-center/index?key=life' })}>便民</Text>
          <Text className="home-tab" onClick={() => Taro.navigateTo({ url: '/pages/service-center/index?key=governance' })}>治理</Text>
          <Text className="home-tab" onClick={() => Taro.navigateTo({ url: '/pkgShop/my-store/index' })}>好物</Text>
        </View>
        <View className="search-line">
          <View className="location-chip"><Text>{store.orgLabel()}</Text></View>
          <View className="search-bar">
            <Text className="search-icon">🔍</Text>
            <Input className="search-input" placeholder="搜好物、服务、政策" value={search} onInput={e => setSearch(e.detail.value)} />
          </View>
          <View className="message-entry" onClick={() => Taro.navigateTo({ url: '/pages/messages/index' })}><Text>🔔</Text></View>
        </View>
      </View>
      {/* 供享村社·门头牌（顶部留安全区并填绿，门头下移让出听筒/状态栏，上方无留白） */}
      <View className="banner-wrap">
        <Image className="village-banner" src={villageBanner} mode="widthFix" />
      </View>
      <ScrollView scrollY className="scroll-body">
        {/* 党建引领横幅 */}
        <View className="party-banner" onClick={() => { if (!store.isPartyMember()) { Taro.showModal({ title: '党建联建', content: '党建联建内容仅面向在册党员开放浏览与参与。如你是党员，请到「我的」切换 / 绑定党员身份后查看。', showCancel: false }); return; } Taro.navigateTo({ url: '/pkgParty/party-map/index' }); }}>
          <Image className="party-banner-flag" src={flagCn} mode="aspectFill" />
          <View className="party-banner-text">
            <Text className="party-banner-title">党建引领 · 供享村社</Text>
            <Text className="party-banner-sub">人人共建 · 全域共管 · 全民供享</Text>
          </View>
          <View style={{ position: 'absolute', top: '16rpx', right: '20rpx', width: '60rpx', height: '60rpx', borderRadius: '50%', background: '#c81e1e', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2rpx 8rpx rgba(0,0,0,.2)' }}>
          <Text style={{ color: '#ffe066', fontSize: '38rpx', lineHeight: 1 }}>★</Text>
        </View>
        </View>

        {/* 贡献体系大卡 */}
        <View className="contrib-card" onClick={() => Taro.navigateTo({ url: '/pages/contribution/index' })}>
          <View className="contrib-left">
            <Text className="contrib-label">我的贡献值</Text>
            <Text className="contrib-num">{contrib}</Text>
            <Text className="contrib-hint">全生命周期社会贡献 · 链上存证</Text>
          </View>
          <View className="contrib-right">
            <Text className="contrib-enter">社会贡献值 ›</Text>
          </View>
        </View>

        <View className="frequent-head">
          <View><Text className="section-label">常用服务</Text><Text className="shelf-subtitle">高频功能直达 · 使用越多排序越靠前</Text></View>
        </View>
        <View className="frequent-grid">
          {frequentServices.map(item => <View key={item.key} className="frequent-item" onClick={() => openFrequent(item)}>
            <View className="frequent-icon" style={{ background: `${CENTER_COLORS[item.center]}14` }}><Text>{item.icon}</Text></View>
            <Text className="frequent-name">{store.isCommunity() && item.nameCommunity ? item.nameCommunity : item.name}</Text>
          </View>)}
        </View>

        {/* 场景中心：首页只保留少量稳定入口，原子功能在中心页分组承载 */}
        <View className="platform-services-title">
          <Text className="section-label">特色频道</Text>
          <Text className="shelf-subtitle">同类服务集中办理 · 全部功能不遗漏</Text>
        </View>
        <View className="center-list">
          {SERVICE_CENTERS.filter(center => !center.admin || store.canManageVillage()).map(center => (
            <View key={center.key} className="center-card" onClick={() => Taro.navigateTo({ url: `/pages/service-center/index?key=${center.key}` })}>
              <View className="center-main">
                <View className="center-symbol" style={{ background: `${center.accent}16` }}><Text>{center.icon}</Text></View>
                <View className="center-info">
                  <Text className="center-name">{centerName(center, store.isCommunity())}</Text>
                  <Text className="center-summary">{center.summary}</Text>
                </View>
                <Text className="center-arrow" style={{ color: center.accent }}>查看全部 ›</Text>
              </View>
              <View className="center-quick">
                {center.quickLinks.map(link => <View key={link.url} className="quick-link" onClick={(event: any) => { event.stopPropagation(); Taro.navigateTo({ url: link.url }); }}>
                  <View className="quick-link-icon" style={{ background: `${center.accent}12` }}><Text>{link.icon}</Text></View>
                  <Text className="quick-link-name">{link.name}</Text>
                </View>)}
              </View>
            </View>
          ))}
        </View>

        {/* Banner */}
        <View className="banner" style={{ background: BANNERS[bannerIdx].bg }} onClick={onBanner}>
          <Text className="banner-text" style={{ color: BANNERS[bannerIdx].color }}>
            {BANNERS[bannerIdx].text}
          </Text>
          <View className="banner-dots">
            {BANNERS.map((_, i) => (
              <View key={i} className={`dot ${i === bannerIdx ? 'active' : ''}`} />
            ))}
          </View>
        </View>

        {/* 分类 */}
        <ScrollView scrollX className="category-scroll">
          {FEATURED_CATEGORIES.map(c => (
            <View
              key={c}
              className={`cat-item ${category === c ? 'active' : ''}`}
              onClick={() => setCategory(c)}
            >
              <Text>{c}</Text>
            </View>
          ))}
        </ScrollView>

        {/* 商品网格 */}
        <View className="section-title">
          <View>
            <Text className="section-label">🌾 村里好物</Text>
            <Text className="shelf-subtitle">真实货图 · 明码实价 · 供货主体可查</Text>
          </View>
          <Text className="section-more" onClick={() => Taro.navigateTo({ url: '/pkgShop/my-store/index?cat=cunli' })}>全部货品 ›</Text>
        </View>

        <View className="trade-assurance">
          <View className="assurance-item"><Text className="assurance-icon">🏘️</Text><Text>村社直供</Text></View>
          <View className="assurance-item"><Text className="assurance-icon">📋</Text><Text>批次可查</Text></View>
          <View className="assurance-item"><Text className="assurance-icon">🛡️</Text><Text>售后留痕</Text></View>
        </View>

        {filtered.length === 0 ? (
          <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60rpx', color: '#9ca3af' }}>
            <Text style={{ fontSize: '80rpx', lineHeight: 1 }}>🔍</Text>
            <Text style={{ fontSize: '26rpx', color: '#9ca3af', marginTop: '20rpx', textAlign: 'center' }}>没找到「{search}」相关好物，换个词试试</Text>
            <View style={{ marginTop: '28rpx', background: '#f3f4f6', borderRadius: '100rpx', padding: '14rpx 40rpx' }} onClick={() => setSearch('')}>
              <Text style={{ fontSize: '24rpx', color: '#6b7280' }}>清空搜索</Text>
            </View>
          </View>
        ) : (
        <View className="product-grid">
          {filtered.map(p => (
            <View key={p.id} className="product-card" onClick={() => goProduct(p.id)}>
              <View className="product-img">
                <Image className="product-photo" src={p.image} mode="aspectFill" />
                <View className="product-tag">
                  <Text className="tag-text">{p.tag}</Text>
                </View>
              </View>
              <View className="product-info">
                <Text className="product-name">{p.shortName}</Text>
                <Text className="product-origin">📍 {p.origin}</Text>
                <Text className="product-spec">{p.specs[0].name} · 库存 {p.specs[0].stock}</Text>
                <View className="product-bottom">
                  <View><Text className="product-price">¥{p.specs[0].price}</Text><Text className="price-from"> 起</Text></View>
                  <Text className="product-sales">已售 {p.sales}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
        )}

        <View className="tabbar-placeholder" />
      </ScrollView>
      <TabBar active="index" />
    </View>
  );
}
