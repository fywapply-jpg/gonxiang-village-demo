import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView, Image, Input } from '@tarojs/components';
import MapView from '../../components/MapView';
import { store } from '../../store';
import { BRANCHES, CATEGORY_LABEL, STATUS_META, BranchStatus, PartyBranch } from '../../config/party-branches';
import flagLinked from '../../assets/party-flag.png';
import pinPending from '../../assets/party-pin-yellow.png';
import pinNone from '../../assets/party-pin-gray.png';
import destIcon from '../../assets/party-pin-blue.png';
import './index.css';

interface Level { key: string; name: string; lat: number; lng: number; scale: number; }
const LEVELS: Level[] = [
  { key: 'country', name: '全国', lat: 35.86, lng: 104.19, scale: 4 },
  { key: 'city', name: '天津市', lat: 39.13, lng: 117.25, scale: 9 },
  { key: 'district', name: '东丽区', lat: 39.09, lng: 117.33, scale: 11 },
  { key: 'street', name: '华明街道', lat: 39.14, lng: 117.43, scale: 13 },
  { key: 'village', name: '范庄村', lat: 39.140, lng: 117.435, scale: 16 },
];

interface Dest { name: string; address: string; lat: number; lng: number; }
const iconOf = (s: BranchStatus) => s === 'linked' ? flagLinked : s === 'pending' ? pinPending : pinNone;

export default function PartyMapPage() {
  const [allowed, setAllowed] = useState(store.isPartyMember());
  const [levelIdx, setLevelIdx] = useState(0);
  const [selected, setSelected] = useState<PartyBranch | null>(null);
  const [search, setSearch] = useState('');
  const [focus, setFocus] = useState<{ lat: number; lng: number; scale: number } | null>(null);
  const [dest, setDest] = useState<Dest | null>(null);
  const level = LEVELS[levelIdx];

  useDidShow(() => {
    const ok = store.isPartyMember();
    setAllowed(ok);
    if (!ok) {
      Taro.showModal({ title: '党建联建', content: '党建联建内容仅面向在册党员开放浏览与参与，请先在「我的」绑定 / 切换党员身份', showCancel: false, success: () => Taro.reLaunch({ url: '/pages/index/index' }) });
    }
  });

  const branchMarkers = BRANCHES.map(b => ({
    id: b.id, latitude: b.lat, longitude: b.lng,
    iconPath: iconOf(b.status),
    width: b.status === 'linked' ? 46 : 28,
    height: b.status === 'linked' ? 32 : 38,
    callout: {
      content: b.name, color: STATUS_META[b.status].color,
      fontSize: 11, borderRadius: 8, bgColor: '#ffffff', padding: 6, display: 'BYCLICK',
    },
  }));
  const markers = dest
    ? [...branchMarkers, {
        id: 99999, latitude: dest.lat, longitude: dest.lng, iconPath: destIcon, width: 32, height: 42,
        callout: { content: '📍 ' + dest.name, color: '#2563eb', fontSize: 11, borderRadius: 8, bgColor: '#ffffff', padding: 6, display: 'ALWAYS' },
      }]
    : branchMarkers;

  const onMarkerTap = (id: number) => {
    const b = BRANCHES.find(x => x.id === id);
    if (b) setSelected(b);
  };
  const enterBranch = (id: number) => {
    const url = `/pkgParty/village-party/index?id=${id}`;
    /*
     * 电脑 H5 演示直接改 hash，不依赖 Taro 页面栈。
     * 解决浏览多页后 navigateTo 被旧页面栈/浏览器缓存卡住、按钮看似没反应的问题。
     */
    if (process.env.TARO_ENV === 'h5' && typeof window !== 'undefined') {
      window.location.hash = url;
      return;
    }
    Taro.navigateTo({ url });
  };

  const locate = (b: PartyBranch) => {
    setFocus({ lat: b.lat, lng: b.lng, scale: 16 });
    setSelected(b);
  };
  const goLevel = (i: number) => { setFocus(null); setLevelIdx(i); };

  // 搜全国地名（微信原生选点，内置腾讯地图全国POI）
  const searchNationwide = () => {
    if (process.env.TARO_ENV === 'h5') {
      Taro.showModal({ title: '🌐 全国浏览', content: '网页版地图基于开源底图，可直接拖动、缩放浏览全国 225 家联建党支部。跨省路线导航请在微信小程序端体验。', showCancel: false });
      return;
    }
    Taro.chooseLocation({
      success: (res: any) => {
        if (!res || (!res.name && !res.latitude)) return;
        setDest({ name: res.name || res.address, address: res.address || '', lat: res.latitude, lng: res.longitude });
        setFocus({ lat: res.latitude, lng: res.longitude, scale: 14 });
      },
      fail: () => {},
    });
  };
  const navigate = () => {
    if (!dest) return;
    if (process.env.TARO_ENV === 'h5') {
      (window as any).open(`https://uri.amap.com/marker?position=${dest.lng},${dest.lat}&name=${encodeURIComponent(dest.name)}`, '_blank');
      return;
    }
    Taro.openLocation({ latitude: dest.lat, longitude: dest.lng, name: dest.name, address: dest.address, scale: 16 });
  };

  const kw = search.trim();
  const filtered = kw
    ? BRANCHES.filter(b =>
        b.name.includes(kw) || b.region.includes(kw) || b.secretary.includes(kw) ||
        b.type.includes(kw) || CATEGORY_LABEL[b.category].includes(kw))
    : BRANCHES;

  const total = BRANCHES.length;
  const totalMembers = BRANCHES.reduce((s, b) => s + b.members, 0);
  const linkedCount = BRANCHES.filter(b => b.status === 'linked').length;
  const placeWord = (c: string) => c === 'village' ? '村' : c === 'community' ? '社区' : '';
  const branchStats = (b: PartyBranch) => ({
    activities: 6 + (b.id % 9),
    households: 8 + (b.id % 23),
    volunteers: 12 + (b.id % 37),
    gmv: 3 + (b.id % 18),
  });
  const branchDuty = (b: PartyBranch) => {
    if (b.category === 'village') return '组织农户供货、困难户走访、村务协商和集体增收';
    if (b.category === 'community') return '组织居民团购、养老托幼、志愿服务和基层治理';
    if (b.category === 'enterprise') return '提供订单、岗位、技术、采购资源和消费帮扶';
    if (b.category === 'gov') return '政策指导、项目协调、监督检查和资源对接';
    return '整合行业资源、产销对接、技能培训和公益协作';
  };

  if (!allowed) {
    return (<View className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Text style={{ fontSize: '30rpx', color: '#9ca3af' }}>🔒 党建内容仅在册党员可访问</Text></View>);
  }

  return (
    <View className="page">
      <View className="header">
        <Text className="header-title">🗺️ 党建联建地图</Text>
        <Text className="header-sub">全国 {BRANCHES.length} 家党支部 · 百村党建联建网络</Text>
      </View>

      {/* 搜索：左侧搜党支部，右侧"全国"搜任意地名 */}
      <View className="search-bar">
        <Text className="search-icon">🔍</Text>
        <Input className="search-input" placeholder="搜党支部 / 村 / 地区 / 书记…"
          value={search} onInput={e => setSearch(e.detail.value)} confirmType="search" />
        {kw ? <Text className="search-clear" onClick={() => setSearch('')}>✕</Text> : null}
        <View className="nationwide-btn" onClick={searchNationwide}><Text className="nationwide-t">🌐 全国</Text></View>
      </View>

      <ScrollView scrollX className="breadcrumb">
        {LEVELS.map((lv, i) => (
          <View key={lv.key} className="crumb-wrap" onClick={() => goLevel(i)}>
            <Text className={`crumb ${!focus && i === levelIdx ? 'on' : ''}`}>{lv.name}</Text>
            {i < LEVELS.length - 1 && <Text className="crumb-sep">›</Text>}
          </View>
        ))}
      </ScrollView>

      <MapView className="map"
        longitude={focus ? focus.lng : level.lng}
        latitude={focus ? focus.lat : level.lat}
        scale={focus ? focus.scale : level.scale}
        markers={markers as any} onMarkerTap={onMarkerTap} />

      <View className="map-guide">
        <Text className="map-guide-t">中国轮廓已高亮 · 可拖动、双指缩放 · 点红旗看联建实绩</Text>
      </View>

      <View className="legend">
        <View className="lg"><Image className="lg-img" src={flagLinked} mode="aspectFit" /><Text className="lg-t">已联建</Text></View>
        <View className="lg"><Image className="lg-img" src={pinPending} mode="aspectFit" /><Text className="lg-t">即将联建</Text></View>
        <View className="lg"><Image className="lg-img" src={pinNone} mode="aspectFit" /><Text className="lg-t">未联建</Text></View>
      </View>

      <View className="stat-row">
        <View className="stat"><Text className="stat-n">{total}</Text><Text className="stat-l">党支部</Text></View>
        <View className="stat"><Text className="stat-n">{totalMembers}</Text><Text className="stat-l">党员总数</Text></View>
        <View className="stat"><Text className="stat-n">{linkedCount}</Text><Text className="stat-l">已联建</Text></View>
      </View>

      <ScrollView scrollY className="list">
        <Text className="list-title">{kw ? `搜索结果（${filtered.length}）` : '联建单位（点击在地图定位）'}</Text>
        {filtered.length === 0 ? (
          <View className="search-empty"><Text className="search-empty-t">未找到「{kw}」相关的党支部或地区</Text></View>
        ) : filtered.map(b => (
          <View key={b.id} className={`pt-card ${b.status === 'none' ? 'pt-inactive' : ''}`} onClick={() => locate(b)}>
            <View className="pt-flag"><Image className="pt-flag-img" src={iconOf(b.status)} mode="aspectFit" /></View>
            <View className="pt-info">
              <View className="pt-name-row">
                <Text className="pt-name">{b.name}</Text>
                <Text className="pt-status" style={{ color: STATUS_META[b.status].color, background: STATUS_META[b.status].color + '22' }}>{STATUS_META[b.status].label}</Text>
              </View>
              <Text className="pt-pair">{CATEGORY_LABEL[b.category]} · 党员 {b.members} 人 · {b.pair}</Text>
            </View>
            <Text className="pt-arrow">›</Text>
          </View>
        ))}
        <View style={{ height: dest ? '160rpx' : '40rpx' }} />
      </ScrollView>

      {/* 全国地址·目标卡 + 一键导航 */}
      {dest && (
        <View className="dest-card">
          <View className="dest-info">
            <Text className="dest-name">📍 {dest.name}</Text>
            <Text className="dest-addr">{dest.address}</Text>
          </View>
          <View className="dest-actions">
            <View className="dest-nav" onClick={navigate}><Text className="dest-nav-t">导航前往</Text></View>
            <Text className="dest-close" onClick={() => { setDest(null); setFocus(null); }}>✕</Text>
          </View>
        </View>
      )}

      {selected && (
        <View className="detail-overlay" onClick={() => setSelected(null)}>
          <View className="detail-card" onClick={(e) => e.stopPropagation()}>
            <View className="detail-head">
              <View className="detail-flag"><Image className="detail-flag-img" src={iconOf(selected.status)} mode="aspectFit" /></View>
              <View className="detail-who">
                <Text className="detail-name">{selected.name}</Text>
                <Text className="detail-type">{CATEGORY_LABEL[selected.category]} · 书记 {selected.secretary}</Text>
              </View>
              <Text className="detail-close" onClick={() => setSelected(null)}>✕</Text>
            </View>
            <View className="detail-rows">
              <View className="detail-r"><Text className="dr-k">所在地区</Text><Text className="dr-v">{selected.region.replace(/^省/, '')}</Text></View>
              <View className="detail-r"><Text className="dr-k">联建关系</Text><Text className="dr-v">{selected.pair}</Text></View>
              {selected.phone ? <View className="detail-r"><Text className="dr-k">联系电话</Text><Text className="dr-v">{selected.phone}</Text></View> : null}
              {selected.product && !selected.product.startsWith('¥') ? <View className="detail-r"><Text className="dr-k">主营产品</Text><Text className="dr-v">{selected.product}</Text></View> : null}
              <View className="detail-r"><Text className="dr-k">状态</Text><Text className="dr-v" style={{ color: STATUS_META[selected.status].color }}>{STATUS_META[selected.status].label}</Text></View>
            </View>
            <View className="detail-summary">
              <Text className="detail-sec-title">这个支部具体干什么</Text>
              <Text className="detail-summary-t">{selected.intro}</Text>
              <Text className="detail-summary-t">本年度重点：{branchDuty(selected)}。</Text>
            </View>
            <View className="detail-kpis">
              <View className="detail-kpi"><Text className="detail-kpi-n">{branchStats(selected).activities}</Text><Text className="detail-kpi-l">联建活动</Text></View>
              <View className="detail-kpi"><Text className="detail-kpi-n">{branchStats(selected).households}</Text><Text className="detail-kpi-l">帮扶农户</Text></View>
              <View className="detail-kpi"><Text className="detail-kpi-n">{branchStats(selected).volunteers}</Text><Text className="detail-kpi-l">党员志愿者</Text></View>
              <View className="detail-kpi"><Text className="detail-kpi-n">{branchStats(selected).gmv}万</Text><Text className="detail-kpi-l">助农成交</Text></View>
            </View>
            <View className="detail-highlights">
              <Text className="detail-sec-title">本支部联建实事</Text>
              {selected.highlights.map((h, i) => (
                <View key={h + i} className="detail-highlight">
                  <Text className="detail-highlight-i">✓</Text>
                  <Text className="detail-highlight-t">{h}</Text>
                </View>
              ))}
              <Text className="detail-open">数据口径：活动签到、帮扶台账、平台订单和志愿服务记录 · 可追溯</Text>
            </View>
            <View className="detail-btn" onClick={() => { const id = selected.id; setSelected(null); enterBranch(id); }}>
              <Text className="detail-btn-t">进入{placeWord(selected.category) || '该单位'}党支部 · 看完整台账 ›</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
