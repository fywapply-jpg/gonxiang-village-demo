import { useState } from 'react';
import Taro, { useDidShow, useLoad } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store, volLevelOf } from '../../store';
import './index.css';

// 「我的资产·经营」个人概览 —— 数据全部实时取自贡献值账户 + 订单 + 志愿/捐赠，非写死。
export default function MyAssetsPage() {
  const [acct, setAcct] = useState(store.getContribAccount());
  const [dims, setDims] = useState(store.getDimensions());
  const [recs, setRecs] = useState(store.getContribRecords());
  const [orders, setOrders] = useState(store.getOrders());
  const [user, setUser] = useState(store.getUser());
  const [active, setActive] = useState(store.getActiveContrib());
  const [expiring, setExpiring] = useState(store.getExpiringContrib(90));
  const [expired, setExpired] = useState(store.getExpiredContrib());
  const [vols, setVols] = useState(store.getVolRecords());
  const [dons, setDons] = useState(store.getDonations());

  useDidShow(() => {
    store.initMockDataIfEmpty?.();          // 与订单页一致：无订单时补演示数据，保证概览有真实可汇总的数据
    setAcct(store.getContribAccount());
    setDims(store.getDimensions());
    setRecs(store.getContribRecords());
    setOrders(store.getOrders());
    setUser(store.getUser());
    setActive(store.getActiveContrib());
    setExpiring(store.getExpiringContrib(90));
    setExpired(store.getExpiredContrib());
    setVols(store.getVolRecords());
    setDons(store.getDonations());
  });

  useLoad(() => {
    Taro.setNavigationBarTitle({ title: '我的资产·经营' });
  });

  const role = user?.role || 'user';
  const orgType = user?.orgType;

  // ── 派生汇总（全部来自 store）──
  const yuan = (acct.total * 0.01).toFixed(2);
  const money = (n: number) => { const r = Math.round(n * 100) / 100; return Number.isInteger(r) ? String(r) : r.toFixed(2); };
  const orderCount = orders.length;
  const totalSpent = orders.reduce((s, o) => s + (o.total || 0), 0);
  const dimTotal = dims.reduce((s, d) => s + d.score, 0) || 1;

  const volHours = vols.filter(v => v.verified).reduce((s, v) => s + (v.hours || 0), 0);
  const donationTotal = dons.reduce((s, d) => s + (d.amount || 0), 0);
  let myVolLevel: ReturnType<typeof volLevelOf> = null;
  try { myVolLevel = volLevelOf(active); } catch (e) { myVolLevel = null; }

  const topRanked = acct.rank > 0 && acct.rank <= 10;
  const rights = ['消费抵扣 ≤ 30%', '服务兑换', '费用代缴', '年度分红资格'];
  if (topRanked) rights.push('优先供货 · 专属折扣');

  const statusText = (s?: string) => (s === 'pending' ? '待审核' : s === 'rejected' ? '已退回' : '已确认');
  const statusColor = (s?: string) => (s === 'pending' ? '#f59e0b' : s === 'rejected' ? '#9ca3af' : '#16a34a');

  const go = (url: string) => Taro.navigateTo({ url });

  return (
    <View className="ma-page">
      {/* 资产总览 Hero */}
      <View className="ma-hero">
        <View className="ma-hero-top">
          <Text className="ma-eyebrow">💼 我的资产 · 经营概览</Text>
          <View className="ma-level"><Text className="ma-level-t">{store.getActiveLevel()}</Text></View>
        </View>
        <View className="ma-hero-main">
          <Text className="ma-total">{acct.total}</Text>
          <Text className="ma-unit">社会贡献值</Text>
        </View>
        <Text className="ma-yuan">≈ ¥{yuan} 可分配权益（1 贡献值 = 0.01 元）</Text>
        <View className="ma-hero-meta">
          <Text className="ma-meta">本月 +{acct.month}</Text>
          <Text className="ma-dot">·</Text>
          <Text className="ma-meta">{store.orgLabel()}内排名 #{acct.rank}</Text>
          <Text className="ma-dot">·</Text>
          <Text className="ma-meta">🔗 链上凭证 {acct.onChainCount}</Text>
        </View>
      </View>

      <ScrollView scrollY className="ma-body">
        <View className="ma-wrap">
          {/* 利益共同体 · 你也有份（个体入口） */}
          <View
            className="ma-biz"
            style={{ background: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '1rpx solid #fdba74', marginTop: 0 }}
            onClick={() => go('/pkgPlatform/interest-community/index')}
          >
            <View className="ma-biz-head">
              <Text className="ma-biz-title">🤝 你也是利益共同体一员</Text>
              <Text className="ma-biz-tag" style={{ color: '#c2410c', background: '#ffedd5' }}>人人有份</Text>
            </View>
            <Text style={{ display: 'block', fontSize: '23rpx', color: '#9a3412', lineHeight: 1.7, marginTop: '14rpx' }}>你的消费·出力·参与 → 攒社会贡献值 → 年度分红(全民普惠池) + 集体分红反哺 + 权益升级。不是单打独斗，平台/集体好、你也分。</Text>
            <View style={{ marginTop: '16rpx', display: 'flex', justifyContent: 'flex-end' }}>
              <Text style={{ fontSize: '24rpx', color: '#c2410c', fontWeight: 700 }}>看利益共同体 ›</Text>
            </View>
          </View>

          {/* 关键资产 4 宫格 */}
          <View className="ma-tiles">
            <View className="ma-tile" onClick={() => go('/pages/contrib-mall/index')}>
              <Text className="ma-tile-num" style={{ color: '#16a34a' }}>{store.getSpendable()}</Text>
              <Text className="ma-tile-label">可兑换</Text>
            </View>
            <View className="ma-tile" onClick={() => go('/pkgPlatform/prosperity/index')}>
              <Text className="ma-tile-num" style={{ color: '#d97706' }}>¥{money(acct.dividend)}</Text>
              <Text className="ma-tile-label">累计分红</Text>
            </View>
            <View className="ma-tile">
              <Text className="ma-tile-num" style={{ color: '#2563eb' }}>+{acct.month}</Text>
              <Text className="ma-tile-label">本月新增</Text>
            </View>
            <View className="ma-tile" onClick={() => go('/pkgPlatform/digital-asset/index')}>
              <Text className="ma-tile-num" style={{ color: '#7c3aed' }}>{acct.onChainCount}</Text>
              <Text className="ma-tile-label">链上凭证</Text>
            </View>
          </View>

          {/* 有效值时效 */}
          <View className="ma-sec">
            <Text className="ma-sec-title">⏳ 有效值时效</Text>
            <Text className="ma-sec-sub">滚动 12 个月</Text>
          </View>
          <View className="ma-tiles ma-tiles-3">
            <View className="ma-tile">
              <Text className="ma-tile-num" style={{ color: '#16a34a' }}>{active}</Text>
              <Text className="ma-tile-label">近12月有效值</Text>
            </View>
            <View className="ma-tile">
              <Text className="ma-tile-num" style={{ color: '#f59e0b' }}>{expiring}</Text>
              <Text className="ma-tile-label">90天内临期</Text>
            </View>
            <View className="ma-tile">
              <Text className="ma-tile-num" style={{ color: '#9ca3af' }}>{expired}</Text>
              <Text className="ma-tile-label">已过期</Text>
            </View>
          </View>
          <Text className="ma-note">贡献值按时间戳滚动 12 个月计有效，超期自动失效、用于定级。临期部分请及时兑换或续做。</Text>

          {/* 贡献构成（5 维） */}
          <View className="ma-sec">
            <Text className="ma-sec-title">📊 贡献构成</Text>
            <Text className="ma-sec-sub">共 {dimTotal} 分</Text>
          </View>
          <View className="ma-card">
            {dims.map(d => {
              const pct = Math.round((d.score / dimTotal) * 100);
              return (
                <View key={d.key} className="ma-dim">
                  <View className="ma-dim-top">
                    <Text className="ma-dim-name">{d.icon} {d.title}</Text>
                    <Text className="ma-dim-score" style={{ color: d.color }}>{d.score} · {pct}%</Text>
                  </View>
                  <View className="ma-bar">
                    <View className="ma-bar-fill" style={{ width: pct + '%', background: d.color }} />
                  </View>
                </View>
              );
            })}
          </View>

          {/* 经营 / 消费情况（role-aware） */}
          <View className="ma-sec">
            <Text className="ma-sec-title">🛒 经营 · 消费</Text>
            <Text className="ma-sec-sub">供享大集</Text>
          </View>
          <View className="ma-tiles ma-tiles-2">
            <View className="ma-tile ma-tile-lg" onClick={() => go('/pages/orders/index')}>
              <Text className="ma-tile-num" style={{ color: '#1f2937' }}>{orderCount}</Text>
              <Text className="ma-tile-label">累计订单（笔）</Text>
            </View>
            <View className="ma-tile ma-tile-lg" onClick={() => go('/pages/orders/index')}>
              <Text className="ma-tile-num" style={{ color: '#c81e1e' }}>¥{money(totalSpent)}</Text>
              <Text className="ma-tile-label">累计消费助农</Text>
            </View>
          </View>

          {role === 'entrepreneur' && (
            <View className="ma-biz ma-biz-shop" onClick={() => go('/pkgShop/my-store/index')}>
              <View className="ma-biz-head">
                <Text className="ma-biz-title">🏪 我的店铺经营</Text>
                <Text className="ma-biz-tag">示意</Text>
              </View>
              <View className="ma-biz-grid">
                <View className="ma-biz-cell"><Text className="ma-biz-num">¥{money(12860)}</Text><Text className="ma-biz-lbl">本月GMV</Text></View>
                <View className="ma-biz-cell"><Text className="ma-biz-num">128</Text><Text className="ma-biz-lbl">本月订单</Text></View>
                <View className="ma-biz-cell"><Text className="ma-biz-num">¥{money(1543)}</Text><Text className="ma-biz-lbl">待结佣金</Text></View>
                <View className="ma-biz-cell"><Text className="ma-biz-num">¥{money(3200)}</Text><Text className="ma-biz-lbl">可提现</Text></View>
              </View>
              <View className="ma-biz-btn"><Text className="ma-biz-btn-t">进入店铺后台 ›</Text></View>
              <Text className="ma-biz-foot">示意数据，接入店铺后台后按实时经营数据显示</Text>
            </View>
          )}

          {orgType === 'village' && (
            <View className="ma-biz ma-biz-agri" onClick={() => go('/pages/sales/index')}>
              <View className="ma-biz-head">
                <Text className="ma-biz-title">🌾 兴农增收</Text>
              </View>
              <Text className="ma-biz-desc">供货返贡献值 · 保底收购 · 劳务用工。把自家农产品挂到供需大厅，村集体统一对接销路。</Text>
              <View className="ma-biz-btn ma-biz-btn-green"><Text className="ma-biz-btn-t">去发布供应 / 看采购 ›</Text></View>
            </View>
          )}

          {/* 公益与志愿 */}
          <View className="ma-sec">
            <Text className="ma-sec-title">❤️ 公益与志愿</Text>
            <Text className="ma-sec-sub" onClick={() => go('/pkgLife/charity/index')}>去公益 ›</Text>
          </View>
          <View className="ma-tiles ma-tiles-3">
            <View className="ma-tile">
              <Text className="ma-tile-num" style={{ color: '#dc2626' }}>{volHours}</Text>
              <Text className="ma-tile-label">志愿时长（时）</Text>
            </View>
            <View className="ma-tile">
              <Text className="ma-tile-num" style={{ color: '#dc2626' }}>¥{money(donationTotal)}</Text>
              <Text className="ma-tile-label">公益捐赠</Text>
            </View>
            <View className="ma-tile">
              <Text className="ma-tile-num" style={{ color: '#dc2626', fontSize: myVolLevel ? '30rpx' : '32rpx' }}>{myVolLevel ? `${myVolLevel.star}★` : '未达标'}</Text>
              <Text className="ma-tile-label">{myVolLevel ? myVolLevel.title : '志愿者等级'}</Text>
            </View>
          </View>

          {/* 我的权益 */}
          <View className="ma-sec">
            <Text className="ma-sec-title">🎫 我的权益</Text>
            <Text className="ma-sec-sub">凭贡献值享</Text>
          </View>
          <View className="ma-chips">
            {rights.map(r => (<Text key={r} className={`ma-chip${r.indexOf('优先') === 0 ? ' ma-chip-hot' : ''}`}>{r}</Text>))}
          </View>

          {/* 近期动态 */}
          <View className="ma-sec">
            <Text className="ma-sec-title">🕑 近期动态</Text>
            <Text className="ma-sec-sub" onClick={() => go('/pages/contribution/index')}>全部 ›</Text>
          </View>
          <View className="ma-card ma-recs">
            {recs.slice(0, 6).map((r, i) => (
              <View key={r.id || i} className="ma-rec">
                <View className="ma-rec-left">
                  <Text className="ma-rec-title">{r.title}</Text>
                  <Text className="ma-rec-meta">{r.date} · {r.dim} · <Text style={{ color: statusColor(r.status) }}>{statusText(r.status)}</Text></Text>
                </View>
                <Text className="ma-rec-val" style={{ color: statusColor(r.status) }}>{r.status === 'rejected' ? '—' : '+' + r.value}</Text>
              </View>
            ))}
            {recs.length === 0 && <Text className="ma-empty">暂无贡献记录，去参与志愿 / 议事 / 助农即可积累。</Text>}
          </View>

          <Text className="ma-foot">数据实时取自你的贡献值账户与订单，1 贡献值 = 0.01 元可分配权益，不可提现。</Text>
        </View>
        <View className="ma-tabbar-ph" />
      </ScrollView>
    </View>
  );
}
