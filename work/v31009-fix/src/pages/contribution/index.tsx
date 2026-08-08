import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store, ContribDimension, ContribRecord, ContribAccount } from '../../store';
import { cloudApi, CLOUD_ENABLED } from '../../utils/cloud';
import { creditScore, socialRank, certCount } from '../../config/contribution-model';
import { backendApi, BACKEND_SYNC_ENABLED } from '../../utils/backend';
import './index.css';

const SHARE_OUTLETS = [
  { key: 'dividend', icon: '💰', title: '收益分红', desc: '集体经营收益按贡献值分红', cta: '查看分红' },
  { key: 'service', icon: '🎫', title: '服务兑换', desc: '兑换体检·农机·家政等服务', cta: '去兑换' },
  { key: 'goods', icon: '🛍️', title: '商品抵扣', desc: '贡献值抵扣贡献商城商品', cta: '去商城' },
  { key: 'honor', icon: '🏅', title: '荣誉评定', desc: '星级贡献者·年度榜样', cta: '看榜单' },
];

// 社会贡献值计算规则（11 类线上线下行为，所有线上活动都产贡献值）
const RULES = [
  { icon: '🛒', act: '消费助农（大集下单）', pt: '+5/单 · 每满¥100 +5' },
  { icon: '🤝', act: '邻里互助（代缴/代取/帮办）', pt: '+10/次' },
  { icon: '❤️', act: '志愿服务（活动/巡防/值守）', pt: '+15/次' },
  { icon: '🗳️', act: '议事参与（投票/提案/监督）', pt: '+5/次' },
  { icon: '🌸', act: '文明践行（移风易俗/好人好事）', pt: '+10/次' },
  { icon: '🎓', act: '技能传授（农技/带徒/授课）', pt: '+20/次' },
  { icon: '👵', act: '养老关爱（探访/助餐助浴）', pt: '+15/次' },
  { icon: '🧒', act: '儿童关爱（四点半课堂/托管）', pt: '+15/次' },
  { icon: '🚩', act: '党建参与（活动/微心愿·党员）', pt: '+10/次' },
  { icon: '⭐', act: '诚信经营（好评/诚信履约）', pt: '+5/单' },
  { icon: '📣', act: '分享推广（邀请/分享成交）', pt: '+3 · 成交 +5' },
];

export default function ContributionPage() {
  const [acct, setAcct] = useState<ContribAccount>(() => BACKEND_SYNC_ENABLED
    ? { total: 0, month: 0, level: '新晋贡献者', rank: 0, dividend: 0, exchangeable: 0, onChainCount: 0 }
    : store.getContribAccount());
  const [dims, setDims] = useState<ContribDimension[]>(() => BACKEND_SYNC_ENABLED ? [] : store.getDimensions());
  const [recs, setRecs] = useState<ContribRecord[]>(() => BACKEND_SYNC_ENABLED ? [] : store.getContribRecords());
  const [openDim, setOpenDim] = useState<string | null>('career');

  const levelOf = (total: number): string => {
    if (total >= 2000) return '五星贡献者';
    if (total >= 1000) return '四星贡献者';
    if (total >= 500) return '三星贡献者';
    if (total >= 200) return '二星贡献者';
    if (total >= 50) return '一星贡献者';
    return '新晋贡献者';
  };

  const loadCloud = async () => {
    try {
      const { account, rank } = await cloudApi.contribution.get();
      const total = account.total || 0;
      setAcct({
        total, month: account.month || 0, level: levelOf(total), rank,
        dividend: Math.round(total * 0.25), exchangeable: total,
        onChainCount: (account.records || []).length,
      });
      const recs = (account.records || []).slice().reverse().map((r: any) => ({
        date: r.date, title: r.title, dim: r.dim, value: r.value, onChain: !!r.onChain,
      }));
      if (recs.length) setRecs(recs);
    } catch {
      setAcct(store.getContribAccount());
      setRecs(store.getContribRecords());
    }
  };

  const loadBackend = async () => {
    try {
      const account = await backendApi.contributions();
      const total = Number(account.availablePoints || 0);
      setAcct({
        total, month: 0, level: levelOf(total), rank: 0,
        dividend: Math.round(total * 0.25), exchangeable: total,
        onChainCount: account.entries?.length || 0,
      });
      setRecs((account.entries || []).map((record: any) => ({
        date: String(record.occurredAt || '').slice(0, 10),
        title: `${record.referenceType} #${record.referenceId}`,
        dim: '社会贡献', value: Number(record.points), onChain: record.state === 'AVAILABLE',
      })));
    } catch {
      Taro.showToast({ title: '贡献值同步失败', icon: 'none' });
    }
  };

  useDidShow(() => {
    if (BACKEND_SYNC_ENABLED) {
      loadBackend();
    } else if (CLOUD_ENABLED) {
      setDims(store.getDimensions());
      loadCloud();
    } else {
      setDims(store.getDimensions());
      setAcct(store.getContribAccount());
      setRecs(store.getContribRecords());
    }
  });

  const onAction = (a: { name: string; value: number; done: boolean }) => {
    if (BACKEND_SYNC_ENABLED) {
      Taro.showToast({ title: '贡献行为接口尚未开放', icon: 'none' });
      return;
    }
    Taro.showToast({
      title: a.done ? `${a.name}：已记 +${a.value}` : `${a.name}：参与即得 +${a.value} 贡献值`,
      icon: 'none',
    });
  };

  const onOutlet = (key: string) => {
    if (BACKEND_SYNC_ENABLED && ['dividend', 'service', 'goods'].includes(key)) {
      Taro.showToast({ title: '贡献权益接口尚未开放', icon: 'none' });
      return;
    }
    if (key === 'goods') { Taro.navigateTo({ url: '/pages/contrib-mall/index' }); return; }
    if (key === 'service') { Taro.navigateTo({ url: '/pages/contrib-mall/index' }); return; }
    if (key === 'honor') { Taro.navigateTo({ url: '/pages/achievement/index' }); return; }
    if (key === 'dividend') {
      Taro.showModal({ title: '收益分红', content: `你当前可参与分红 ¥${acct.dividend}。集体经营性收益的 30% 按全${store.orgLabel()}贡献值占比分配，季度发放、链上可查。`, showCancel: false });
      return;
    }
    Taro.showModal({ title: '服务兑换', content: `可用 ${store.getSpendable()} 贡献值兑换：免费体检、农机租赁券、家政服务、技能培训名额等惠民服务。`, confirmText: '知道了', showCancel: false });
  };

  return (
    <View className="page">
      {/* Hero 账户 */}
      <View className="hero">
        <Text className="hero-eyebrow">★ 全生命周期社会贡献</Text>
        <View className="hero-main">
          <View className="hero-total-wrap">
            <Text className="hero-total">{acct.total}</Text>
            <Text className="hero-unit">贡献值</Text>
          </View>
          <View className="hero-level"><Text className="hero-level-text">{acct.level}</Text></View>
        </View>
        <View className="hero-row">
          <Text className="hero-meta">本月 +{acct.month}</Text>
          <Text className="hero-dot">·</Text>
          <Text className="hero-meta">{store.orgLabel()}内排名 #{acct.rank}</Text>
          <Text className="hero-dot">·</Text>
          <Text className="hero-meta">🔗 链上凭证 {acct.onChainCount}</Text>
        </View>
      </View>

      <ScrollView scrollY className="body">
        <View className="wrap">
          {/* 信用 + 数字凭证 + 社会地位 */}
          <View className="trinity">
            <View className="tri-item" onClick={() => Taro.navigateTo({ url: '/pkgPlatform/credit/index' })}>
              <Text className="tri-num" style={{ color: '#2563eb' }}>{creditScore(acct.total)}</Text>
              <Text className="tri-label">信用分</Text>
            </View>
            <View className="tri-div" />
            <View className="tri-item" onClick={() => Taro.navigateTo({ url: '/pkgPlatform/digital-asset/index' })}>
              <Text className="tri-num" style={{ color: '#7c3aed' }}>{certCount(acct.total)}</Text>
              <Text className="tri-label">数字凭证</Text>
            </View>
            <View className="tri-div" />
            <View className="tri-item" onClick={() => Taro.navigateTo({ url: '/pkgPlatform/credit/index' })}>
              <Text className="tri-rank">{socialRank(acct.total).icon}</Text>
              <Text className="tri-label">{socialRank(acct.total).label}</Text>
            </View>
          </View>
          <View className="entry3">
            <View className="e3" onClick={() => Taro.navigateTo({ url: '/pkgPlatform/lifecycle/index' })}><Text className="e3-i">🌟</Text><Text className="e3-t">全生命周期</Text></View>
            <View className="e3" onClick={() => Taro.navigateTo({ url: '/pkgPlatform/credit/index' })}><Text className="e3-i">💳</Text><Text className="e3-t">信用与权益</Text></View>
            <View className="e3" onClick={() => Taro.navigateTo({ url: '/pkgPlatform/digital-asset/index' })}><Text className="e3-i">🔗</Text><Text className="e3-t">数字资产</Text></View>
          </View>
          {/* 用户申报贡献入口 */}
          <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,#16a34a,#22c55e)', borderRadius: '16rpx', padding: '24rpx 26rpx', margin: '4rpx 0 20rpx' }} onClick={() => Taro.navigateTo({ url: '/pkgLife/contrib-submit/index' })}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: '28rpx', fontWeight: 800, color: '#fff', display: 'block' }}>➕ 申报我的贡献</Text>
              <Text style={{ fontSize: '21rpx', color: '#dcfce7', display: 'block', marginTop: '4rpx' }}>做了好事 · 留痕 + 受益者评价 · 审核后计分</Text>
            </View>
            <Text style={{ fontSize: '30rpx', color: '#fff' }}>›</Text>
          </View>
          {/* 核心规则 */}
          <View className="rule-card">
            <Text className="rule-badge">党建引领</Text>
            <Text className="rule-text">
              以行为对集体的<Text className="rule-hl">公共价值、社会效益</Text>为唯一计量依据，不以个人经济投入、财富规模为评判标准 —— 让每一份付出都被看见、可传承、能共享。
            </Text>
          </View>

          {/* 管理员：社会贡献值审核入口 */}
          {store.canManageVillage() && (
            <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'linear-gradient(135deg,#fff7ed,#ffedd5)', border: '1rpx solid #fed7aa', borderRadius: '16rpx', padding: '22rpx 24rpx', marginBottom: '20rpx' }} onClick={() => Taro.navigateTo({ url: '/pkgLife/contrib-audit/index' })}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: '27rpx', fontWeight: 800, color: '#9a3412', display: 'block' }}>⚖️ 社会贡献值审核</Text>
                <Text style={{ fontSize: '21rpx', color: '#c2410c', display: 'block', marginTop: '4rpx' }}>核实留痕 + 受益者评价，通过后才计分</Text>
              </View>
              <Text style={{ fontSize: '24rpx', color: '#ea580c', fontWeight: 700 }}>{store.getPendingContribs().length} 条待审 ›</Text>
            </View>
          )}

          {/* 社会贡献值计算规则表（11 类行为） */}
          <View className="sec-head">
            <Text className="sec-title">📋 社会贡献值 · 怎么算</Text>
            <Text className="sec-sub">留痕 + 审核确认</Text>
          </View>
          <View style={{ background: '#fff', borderRadius: '16rpx', padding: '8rpx 24rpx', marginBottom: '20rpx' }}>
            {RULES.map(r => (
              <View key={r.act} style={{ display: 'flex', alignItems: 'center', padding: '16rpx 0', borderBottom: '1rpx solid #f3f4f6' }}>
                <Text style={{ fontSize: '34rpx', marginRight: '14rpx' }}>{r.icon}</Text>
                <Text style={{ flex: 1, fontSize: '23rpx', color: '#374151' }}>{r.act}</Text>
                <Text style={{ fontSize: '23rpx', fontWeight: 700, color: '#16a34a' }}>{r.pt}</Text>
              </View>
            ))}
            <Text style={{ display: 'block', fontSize: '20rpx', color: '#9ca3af', padding: '16rpx 0', lineHeight: 1.6 }}>同类每日有上限（防刷）· 全部链上存证不可篡改 · 可换贡献商城好物、评星级贡献者、享信用贷等待遇</Text>
          </View>

          {/* 共建维度 */}
          <View className="sec-head">
            <Text className="sec-title">「共建」贡献维度</Text>
            <Text className="sec-sub">覆盖全生命周期</Text>
          </View>
          {dims.map(d => {
            const open = openDim === d.key;
            const doneCount = d.actions.filter(a => a.done).length;
            return (
              <View key={d.key} className="dim-card" style={{ borderLeftColor: d.color }}>
                <View className="dim-head" onClick={() => setOpenDim(open ? null : d.key)}>
                  <View className="dim-icon" style={{ background: d.color + '1a' }}>
                    <Text style={{ fontSize: '40rpx' }}>{d.icon}</Text>
                  </View>
                  <View className="dim-info">
                    <View className="dim-title-row">
                      <Text className="dim-title">{d.title}</Text>
                      <Text className="dim-score" style={{ color: d.color }}>{d.score}</Text>
                    </View>
                    <Text className="dim-desc">{d.desc}</Text>
                  </View>
                  <Text className="dim-arrow">{open ? '▾' : '▸'}</Text>
                </View>
                {open && (
                  <View className="dim-actions">
                    {d.actions.map(a => (
                      <View key={a.name} className="act-row" onClick={() => onAction(a)}>
                        <Text className={`act-check ${a.done ? 'act-done' : ''}`}>{a.done ? '✓' : '○'}</Text>
                        <Text className="act-name">{a.name}</Text>
                        <Text className="act-val" style={{ color: a.done ? d.color : '#9ca3af' }}>+{a.value}</Text>
                      </View>
                    ))}
                    <View className="dim-foot"><Text className="dim-foot-text">已完成 {doneCount}/4 项行为</Text></View>
                  </View>
                )}
              </View>
            );
          })}

          {/* 共享出口 */}
          <View className="sec-head">
            <Text className="sec-title">「共享」价值兑换出口</Text>
            <Text className="sec-sub">贡献变收益</Text>
          </View>
          <View className="outlet-grid">
            {SHARE_OUTLETS.map(o => (
              <View key={o.key} className="outlet-card" onClick={() => onOutlet(o.key)}>
                <Text className="outlet-icon">{o.icon}</Text>
                <Text className="outlet-title">{o.title}</Text>
                <Text className="outlet-desc">{o.desc}</Text>
                <Text className="outlet-cta">{o.cta} ›</Text>
              </View>
            ))}
          </View>

          {/* 贡献明细（链上） */}
          <View className="sec-head">
            <Text className="sec-title">贡献明细</Text>
            <Text className="sec-sub">区块链存证</Text>
          </View>
          <View className="rec-card">
            {recs.map((r, i) => {
              const pending = r.status === 'pending';
              const rejected = r.status === 'rejected';
              return (
                <View key={i} className="rec-row">
                  <View className="rec-left">
                    <Text className="rec-title" style={{ color: pending || rejected ? '#9ca3af' : '#1f2937' }}>{r.title}</Text>
                    <Text className="rec-meta">{r.date} · {r.dim} · {pending ? `⏳ 待${store.adminLabel()}审核` : rejected ? '✗ 已驳回' : '🔗 已上链'}</Text>
                  </View>
                  <Text className="rec-val" style={{ color: pending ? '#f59e0b' : rejected ? '#d1d5db' : '#16a34a' }}>{rejected ? '—' : pending ? `待+${r.value}` : `+${r.value}`}</Text>
                </View>
              );
            })}
          </View>

          <View className="footnote">
            <Text className="footnote-text">人人共建 · 全域共管 · 全民供享</Text>
          </View>
        </View>
        <View className="tabbar-placeholder" />
      </ScrollView>
    </View>
  );
}
