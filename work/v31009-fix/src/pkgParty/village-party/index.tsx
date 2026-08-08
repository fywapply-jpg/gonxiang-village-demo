import { useState } from 'react';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView, Image } from '@tarojs/components';
import { BRANCHES, CATEGORY_LABEL, STATUS_META } from '../../config/party-branches';
import { store } from '../../store';
import flagIcon from '../../assets/party-flag.png';
import villageBanner from '../../assets/village-banner.jpg';
import './index.css';

export default function VillagePartyPage() {
  const router = useRouter();
  const id = Number(router.params.id) || 1;
  const b = BRANCHES.find(x => x.id === id) || BRANCHES[0];
  const [allowed, setAllowed] = useState(store.isPartyMember());

  useDidShow(() => {
    const ok = store.isPartyMember();
    setAllowed(ok);
    if (!ok) {
      Taro.showModal({ title: '党建联建', content: '党建联建内容仅面向在册党员开放浏览与参与，请先在「我的」绑定 / 切换党员身份', showCancel: false, success: () => Taro.reLaunch({ url: '/pages/index/index' }) });
    }
  });

  const QUICK = [
    { icon: '📋', label: '三会一课', url: '/pkgParty/party-dues/index?tab=meeting' },
    { icon: '💝', label: '微心愿', url: '/pkgParty/party-wish/index' },
    { icon: '🤝', label: '先锋助农', url: '/pkgParty/party-help/index' },
    { icon: '🗳️', label: '村务议事', url: '/pages/council/index' },
  ];
  const stats = {
    activities: 6 + (b.id % 9),
    households: 8 + (b.id % 23),
    volunteers: 12 + (b.id % 37),
    gmv: 3 + (b.id % 18),
  };
  const TASKS = [
    { icon: '🌾', title: '助农增收', text: b.category === 'enterprise' ? '优先采购联建村农产品，开放岗位和订单' : '组织农户标准化供货，统一对接平台订单', done: '本月已完成 82%' },
    { icon: '🛒', title: '消费帮扶', text: '党员带头认购、单位食堂团购、节庆福利直采', done: `带动成交 ${stats.gmv} 万元` },
    { icon: '🧑‍🤝‍🧑', title: '结对帮扶', text: '困难家庭一户一策，需求、责任人、办结结果留痕', done: `已覆盖 ${stats.households} 户` },
    { icon: '🏘️', title: '基层治理', text: '把群众诉求、村务议事和志愿服务纳入联建清单', done: '诉求按期办结率 96%' },
  ];
  const RECORDS = [
    { date: '07-26', title: '联合开展农产品进社区活动', result: `组织党员志愿者 ${Math.min(stats.volunteers, 28)} 人，帮助 6 户农户完成集中销售` },
    { date: '07-18', title: '困难家庭入户走访', result: `完成 ${Math.min(stats.households, 16)} 户需求核验，形成一户一策帮扶单` },
    { date: '07-09', title: '支部联席议事会', result: '确定本月订单采购、就业对接、养老帮扶三项任务' },
  ];

  if (!allowed) {
    return (<View className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Text style={{ fontSize: '30rpx', color: '#9ca3af' }}>🔒 党建内容仅在册党员可访问</Text></View>);
  }

  return (
    <View className="page">
      <ScrollView scrollY className="body">
        <Image className="village-banner" src={villageBanner} mode="widthFix" />
        <View className="hero">
          <View className="hero-flag"><Image className="hero-flag-img" src={flagIcon} mode="aspectFit" /></View>
          <Text className="hero-name">{b.name}</Text>
          <Text className="hero-region">{b.region.replace(/^省/, '')}</Text>
          <View className="hero-tags">
            <View className="hero-tag"><Text className="hero-tag-t">{CATEGORY_LABEL[b.category]}</Text></View>
            <View className="hero-tag"><Text className="hero-tag-t">党员 {b.members} 人</Text></View>
            <View className="hero-tag"><Text className="hero-tag-t">{STATUS_META[b.status].label}</Text></View>
          </View>
        </View>

        <View className="wrap">
          <View className="card">
            <Text className="card-title">党支部概况</Text>
            <Text className="intro">{b.intro}</Text>
            <View className="info-rows">
              <View className="info-r"><Text className="ir-k">党支部书记</Text><Text className="ir-v">{b.secretary}</Text></View>
              <View className="info-r"><Text className="ir-k">成立时间</Text><Text className="ir-v">{b.established}</Text></View>
              <View className="info-r"><Text className="ir-k">联建关系</Text><Text className="ir-v">{b.pair}</Text></View>
              {b.phone ? <View className="info-r"><Text className="ir-k">联系电话</Text><Text className="ir-v">{b.phone}</Text></View> : null}
              {b.product && !b.product.startsWith('¥') ? <View className="info-r"><Text className="ir-k">主营产品</Text><Text className="ir-v">{b.product}</Text></View> : null}
            </View>
            {b.product && !b.product.startsWith('¥') ? <View style={{ background: '#dcfce7', borderRadius: '12rpx', padding: '18rpx', marginTop: '12rpx', textAlign: 'center' }} onClick={() => Taro.navigateTo({ url: '/pkgShop/my-store/index' })}><Text style={{ color: '#15803d', fontSize: '25rpx', fontWeight: 700 }}>🛒 进入本村集体商城下单 ›</Text></View> : null}
          </View>

          <Text className="sec-title">📊 联建成效 · 数据说话</Text>
          <View className="result-grid">
            <View className="result"><Text className="result-n">{stats.activities}</Text><Text className="result-l">年度联建活动</Text></View>
            <View className="result"><Text className="result-n">{stats.households}</Text><Text className="result-l">结对帮扶户</Text></View>
            <View className="result"><Text className="result-n">{stats.volunteers}</Text><Text className="result-l">党员志愿者</Text></View>
            <View className="result"><Text className="result-n">{stats.gmv}万</Text><Text className="result-l">助农成交额</Text></View>
          </View>

          <Text className="sec-title">🚩 党建工作亮点</Text>
          {b.highlights.map((h, i) => (
            <View key={i} className="hl-card">
              <Text className="hl-idx">{i + 1}</Text>
              <Text className="hl-text">{h}</Text>
            </View>
          ))}

          <Text className="sec-title">🧾 年度联建任务清单</Text>
          {TASKS.map(t => (
            <View key={t.title} className="task-card">
              <Text className="task-icon">{t.icon}</Text>
              <View className="task-main">
                <View className="task-head"><Text className="task-title">{t.title}</Text><Text className="task-state">推进中</Text></View>
                <Text className="task-text">{t.text}</Text>
                <Text className="task-done">✓ {t.done}</Text>
              </View>
            </View>
          ))}

          <Text className="sec-title">🕐 最近办成的实事</Text>
          <View className="record-card">
            {RECORDS.map((r, i) => (
              <View key={r.date} className="record">
                <View className="record-line">
                  <Text className="record-date">{r.date}</Text>
                  {i < RECORDS.length - 1 && <View className="record-bar" />}
                </View>
                <View className="record-main">
                  <Text className="record-title">{r.title}</Text>
                  <Text className="record-result">{r.result}</Text>
                  <Text className="record-proof">已存证 · 可查责任人、签到和结果照片</Text>
                </View>
              </View>
            ))}
          </View>

          <View className="open-card">
            <Text className="open-title">👀 群众监督 · 全程公开</Text>
            <Text className="open-text">联建任务谁负责、钱花到哪里、帮助了谁、结果怎么样，均进入平台台账。群众可查看，监督小组可质询，责任单位须限时答复。</Text>
            <View className="open-chips">
              {['任务清单', '资金去向', '帮扶对象', '活动签到', '照片视频', '办结评价'].map(t => <Text key={t} className="open-chip">{t}</Text>)}
            </View>
          </View>

          <Text className="sec-title">党支部服务</Text>
          <View className="quick-grid">
            {QUICK.map(q => (
              <View key={q.label} className="quick" onClick={() => Taro.navigateTo({ url: q.url })}>
                <Text className="quick-icon">{q.icon}</Text>
                <Text className="quick-label">{q.label}</Text>
              </View>
            ))}
          </View>

          <View className="back-btn" onClick={() => Taro.navigateBack()}>
            <Text className="back-btn-t">‹ 返回党建联建地图</Text>
          </View>
        </View>
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
