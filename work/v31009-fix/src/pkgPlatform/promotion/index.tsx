import Taro, { useDidShow, useLoad } from '@tarojs/taro';
import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { store, PromoOrg } from '../../store';
import './index.css';

// 分销流程（7 步）：申请入驻 → 审核授资质 → 推广员注册生成码 → B端凭码入驻 → 交易4:6分成月结 → 季度考核 → 奖惩升降级
const STEPS: { t: string; d: string }[] = [
  { t: '申请入驻', d: '交集体控股证明' },
  { t: '平台审核', d: '授推广资质' },
  { t: '推广员注册', d: '生成专属推广码' },
  { t: '小b端凭码入驻', d: '店主/创业者绑推广员' },
  { t: '交易分成', d: '服务费2%·4:6·月结' },
  { t: '季度考核', d: '拓展·服务·合规' },
  { t: '奖惩升降级', d: '加成/正常/限期/降级' },
];

// 分销制度四要点
const RULES: { icon: string; t: string; d: string }[] = [
  { icon: '🏛️', t: '推广资格', d: '须为村集体/社区集体控股企业，集体持股 ≥51% 方可授资质，不足驳回' },
  { icon: '💰', t: '佣金分成', d: '平台对小b端(店主)交易收 2% 服务费，按 平台4:推广组织6 分成，月结、流水可查' },
  { icon: '📣', t: '组织职责', d: '维护「小端关系」+ 一线「舆情处置」，投诉/纠纷/负面第一时间响应' },
  { icon: '📊', t: '考核周期', d: '每季度按 拓展/服务/合规 三维评级，分优秀/合格/待整改/不达标' },
];

// 季度考核三维指标
const ASSESS: { icon: string; name: string; items: string[] }[] = [
  { icon: '📈', name: '拓展', items: ['新增 / 活跃 小b端数', '平台 GMV 贡献'] },
  { icon: '🤝', name: '服务', items: ['小b端满意度', '响应时效', '舆情处置及时率', '投诉解决率'] },
  { icon: '✅', name: '合规', items: ['资质合规率', '违规清退情况'] },
];

// 评级 → 奖惩
const REWARDS: { grade: PromoOrg['grade']; act: string }[] = [
  { grade: '优秀', act: '佣金加成' },
  { grade: '合格', act: '正常结算' },
  { grade: '待整改', act: '限期整改' },
  { grade: '不达标', act: '降级停牌' },
];

// 平台商业三层：大B推广 · 小b经营 · C端消费
const TIERS: { k: string; i: string; who: string; d: string; c: string }[] = [
  { k: '大B端', i: '🏛️', who: '推广组织', d: '村集体 / 社区集体控股企业（≥51%）· 招募推广、维护小端、拿 4:6 佣金', c: '#0891b2' },
  { k: '小b端', i: '🏪', who: '创业者 / 店主', d: '供享大集开店卖货的个体经营者 · 凭推广码入驻、交 2% 服务费', c: '#16a34a' },
  { k: 'C 端', i: '👥', who: '消费者', d: '村民 / 居民 · 下单消费、累计消费贡献值', c: '#f59e0b' },
];

const GRADE_CLASS: Record<PromoOrg['grade'], string> = {
  '优秀': 'g-exc', '合格': 'g-pass', '待整改': 'g-fix', '不达标': 'g-fail',
};
const STATUS_CLASS: Record<PromoOrg['status'], string> = {
  '已授权': 's-ok', '待审核': 's-wait', '已驳回': 's-rej',
};

export default function PromotionPage() {
  const [allowed, setAllowed] = useState(store.isPlatformAdmin());
  useDidShow(() => {
    const ok = store.isPlatformAdmin();
    setAllowed(ok);
    if (!ok) { Taro.showModal({ title: '无权访问', content: '推广分销管理仅平台运营方可用', showCancel: false, success: () => Taro.reLaunch({ url: '/pages/index/index' }) }); }
  });

  useLoad(() => {
    Taro.setNavigationBarTitle({ title: '推广分销管理' });
  });

  const [orgs, setOrgs] = useState<PromoOrg[]>(store.getPromoOrgs());

  // 概览汇总
  const orgCount = orgs.length;
  const totalPromoters = orgs.reduce((s, o) => s + o.promoters, 0);
  const totalMerchants = orgs.reduce((s, o) => s + o.merchants, 0);
  const totalCommission = orgs.reduce((s, o) => s + o.commission, 0);

  // 平台审核：通过且集体持股 ≥51% → 已授权；否则驳回
  const review = (o: PromoOrg, pass: boolean) => {
    Taro.showModal({
      title: pass ? '通过 · 授推广资质' : '驳回入驻申请',
      content: pass
        ? `确认为「${o.name}」授予推广资质？集体持股须 ≥51%（当前 ${o.holding}%），不足将自动驳回。`
        : `确认驳回「${o.name}」的入驻申请？`,
      confirmColor: '#16a34a',
      success: (res) => {
        if (!res.confirm) return;
        const list = store.reviewPromoOrg(o.id, pass);
        setOrgs(list);
        const now = list.find(x => x.id === o.id);
        if (now?.status === '已授权') Taro.showToast({ title: '已授权', icon: 'success' });
        else Taro.showToast({ title: pass && o.holding < 51 ? '控股不足 · 已驳回' : '已驳回', icon: 'none' });
      },
    });
  };

  if (!allowed) {
    return (
      <View className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Text style={{ fontSize: '30rpx', color: '#9ca3af' }}>🔒 推广分销管理仅平台运营方可访问</Text>
      </View>
    );
  }

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">🤝 推广分销管理</Text>
        <Text className="hero-s">大B推广组织（集体控股）招募 小b端（创业者/店主）· 实名推广员专属码 · 服务费 4:6 分佣月结 · 季度考核升降级</Text>
      </View>

      <ScrollView scrollY className="body">
        {/* 概览 */}
        <View className="ov">
          <View className="ov-c"><Text className="ov-n">{orgCount}</Text><Text className="ov-l">推广组织</Text></View>
          <View className="ov-c"><Text className="ov-n">{totalPromoters}</Text><Text className="ov-l">推广员总数</Text></View>
          <View className="ov-c"><Text className="ov-n">{totalMerchants}</Text><Text className="ov-l">拓展小b端</Text></View>
          <View className="ov-c"><Text className="ov-n">¥{totalCommission.toLocaleString()}</Text><Text className="ov-l">本月佣金合计</Text></View>
        </View>

        {/* 平台三层结构：大B / 小b / C端 */}
        <View className="card">
          <Text className="card-t">🧭 平台三层：大B推广 · 小b经营 · C端消费</Text>
          {TIERS.map(t => (
            <View key={t.k} className="rule" style={{ borderLeft: `6rpx solid ${t.c}`, paddingLeft: '16rpx' }}>
              <Text className="rule-i">{t.i}</Text>
              <View className="rule-b">
                <Text className="rule-t" style={{ color: t.c }}>{t.k} · {t.who}</Text>
                <Text className="rule-d">{t.d}</Text>
              </View>
            </View>
          ))}
          <Text className="tip" style={{ marginTop: '8rpx' }}>推广组织（大B）招募创业者 / 店主（小b端）入驻供享大集卖货、服务 C 端消费者；本页即管理大B及其名下小b端。</Text>
        </View>

        {/* 分销制度 */}
        <View className="card">
          <Text className="card-t">📋 分销制度</Text>
          {RULES.map(r => (
            <View key={r.t} className="rule">
              <Text className="rule-i">{r.icon}</Text>
              <View className="rule-b">
                <Text className="rule-t">{r.t}</Text>
                <Text className="rule-d">{r.d}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* 分销流程 */}
        <View className="card">
          <Text className="card-t">🔄 分销流程</Text>
          <View className="steps">
            {STEPS.map((s, i) => (
              <View key={s.t} className="step">
                <View className="step-no"><Text className="step-no-t">{i + 1}</Text></View>
                <View className="step-b">
                  <Text className="step-t">{s.t}</Text>
                  <Text className="step-d">{s.d}</Text>
                </View>
                {i < STEPS.length - 1 && <Text className="step-arrow">↓</Text>}
              </View>
            ))}
          </View>
        </View>

        {/* 推广组织列表 */}
        <Text className="sec-lbl">推广组织（{orgCount}）· 待审核可授资质 / 驳回</Text>
        {orgs.map(o => (
          <View key={o.id} className="org">
            <View className="org-h">
              <View className="org-hl">
                <Text className="org-n">{o.name}</Text>
                <Text className="org-tp">{o.type} · 集体持股 {o.holding}%</Text>
              </View>
              <View className={`pill ${STATUS_CLASS[o.status]}`}><Text className="pill-t">{o.status}</Text></View>
            </View>

            <View className="org-grid">
              <View className="og-c"><Text className="og-n">{o.promoters}</Text><Text className="og-l">推广员</Text></View>
              <View className="og-c"><Text className="og-n">{o.activeMerchants}/{o.merchants}</Text><Text className="og-l">活跃/拓展小b</Text></View>
              <View className="og-c"><Text className="og-n">{o.gmv}万</Text><Text className="og-l">累计GMV</Text></View>
              <View className="og-c"><Text className="og-n og-hl">¥{o.commission.toLocaleString()}</Text><Text className="og-l">本月佣金</Text></View>
            </View>

            <View className="org-svc">
              <Text className="svc-i">满意度 {o.satisfaction}%</Text>
              <Text className="svc-i">舆情处置 {o.opinionRate}%</Text>
            </View>

            <View className="org-f">
              <Text className="org-score">季度考核 <Text className="org-score-n">{o.score}</Text> 分</Text>
              <View className={`grade ${GRADE_CLASS[o.grade]}`}><Text className="grade-t">{o.grade}</Text></View>
            </View>

            {o.status === '待审核' && (
              <View className="org-act">
                <View className="act-btn act-rej" onClick={() => review(o, false)}><Text className="act-t2">驳回</Text></View>
                <View className="act-btn act-pass" onClick={() => review(o, true)}><Text className="act-t">通过授资质</Text></View>
              </View>
            )}
          </View>
        ))}

        {/* 考核指标 */}
        <View className="card">
          <Text className="card-t">🎯 季度考核指标</Text>
          {ASSESS.map(a => (
            <View key={a.name} className="assess">
              <Text className="assess-h">{a.icon} {a.name}维度</Text>
              <View className="assess-tags">
                {a.items.map(it => <View key={it} className="tag"><Text className="tag-t">{it}</Text></View>)}
              </View>
            </View>
          ))}
          <Text className="assess-lbl">评级奖惩</Text>
          <View className="rewards">
            {REWARDS.map(r => (
              <View key={r.grade} className="reward">
                <View className={`grade ${GRADE_CLASS[r.grade]}`}><Text className="grade-t">{r.grade}</Text></View>
                <Text className="reward-arrow">→</Text>
                <Text className="reward-act">{r.act}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text className="tip">💡 推广组织须村集体 / 社区集体控股 ≥51% 方可授资质；服务费 2% 按平台 4 : 组织 6 月结分成，流水可查；季度考核不达标者降级停牌、违规清退。</Text>
        <Text className="tip" style={{ textAlign: 'center' }}>本页为推广分销管理演示示意，实际以平台正式运营规则为准。</Text>
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
