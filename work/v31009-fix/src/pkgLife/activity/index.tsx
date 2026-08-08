import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

// 场馆预约
interface Venue { id: number; name: string; emoji: string; place: string; times: string[]; free: boolean; price: string; note: string; }
// 活动报名
interface Act { id: number; name: string; emoji: string; when: string; place: string; quota: string; free: boolean; price: string; tags: string[]; note: string; }

// ── 乡村：村文化礼堂 / 农家书屋 / 健身广场（村委会运营）──
const VILLAGE_VENUES: Venue[] = [
  { id: 1, name: '村健身房', emoji: '💪', place: '文化礼堂 1 楼', times: ['上午 8:00–11:30', '下午 14:00–18:00', '晚上 19:00–21:30'], free: true, price: '免费', note: '党群服务中心运营，村民免费开放，器材齐全' },
  { id: 2, name: '农家书屋', emoji: '📚', place: '党群服务中心', times: ['上午 9:00–12:00', '下午 14:00–17:30'], free: true, price: '免费', note: '藏书 6000 余册，免费借阅，配少儿绘本专区' },
  { id: 3, name: '村活动室', emoji: '🏓', place: '文化礼堂 2 楼', times: ['上午 9:00–12:00', '下午 14:00–18:00', '晚上 19:00–21:00'], free: false, price: '¥10/场·2 小时', note: '乒乓球 / 台球 / 排练，公益低价，党员志愿者值守' },
  { id: 4, name: '村文化礼堂', emoji: '🏛️', place: '村中心广场旁', times: ['白天 9:00–17:00', '晚上 19:00–21:00'], free: true, price: '免费（需报备）', note: '可办文艺演出 / 讲座 / 村民议事，村委会统一调配' },
];
// ── 社区：社区文体中心 / 图书室 / 健身房（居委会运营）──
const COMMUNITY_VENUES: Venue[] = [
  { id: 1, name: '社区健身房', emoji: '💪', place: '社区文体中心 1 楼', times: ['上午 8:00–11:30', '下午 14:00–18:00', '晚上 19:00–21:30'], free: true, price: '免费', note: '居委会运营，居民持卡免费，有社会体育指导员' },
  { id: 2, name: '社区图书室', emoji: '📚', place: '社区文体中心 2 楼', times: ['上午 9:00–12:00', '下午 14:00–17:30', '晚上 19:00–20:30'], free: true, price: '免费', note: '藏书 1 万余册，免费借阅，配电子阅览区' },
  { id: 3, name: '社区活动室', emoji: '🏓', place: '社区文体中心 3 楼', times: ['上午 9:00–12:00', '下午 14:00–18:00', '晚上 19:00–21:00'], free: false, price: '¥15/场·2 小时', note: '乒乓 / 台球 / 舞蹈排练，公益低价，党员志愿者值守' },
  { id: 4, name: '社区文体中心（多功能厅）', emoji: '🏛️', place: '社区党群服务中心', times: ['白天 9:00–17:00', '晚上 19:00–21:00'], free: true, price: '免费（需报备）', note: '可办文艺汇演 / 讲座 / 邻里议事，居委会统一调配' },
];

// ── 乡村活动（村委会 + 党员志愿者组织）──
const VILLAGE_ACTS: Act[] = [
  { id: 1, name: '乡村文艺演出·农民丰收晚会', emoji: '🎭', when: '本周六 19:30', place: '村文化礼堂', quota: '不限', free: true, price: '免费', tags: ['文艺', '惠民'], note: '党员文艺队 + 村民自编自演，免费观看，欢迎全村参与' },
  { id: 2, name: '公益讲座·防诈骗与健康养生', emoji: '📢', when: '本周日 上午 9:30', place: '党群服务中心', quota: '80 人', free: true, price: '免费', tags: ['讲座', '公益'], note: '民警 + 乡村医生主讲，免费听讲，含现场答疑' },
  { id: 3, name: '技能培训·农村电商与直播带货', emoji: '📱', when: '每周三 下午 14:00', place: '文化礼堂 2 楼', quota: '30 人', free: true, price: '免费（政府补贴）', tags: ['培训', '助农'], note: '免费学开网店 / 手机直播卖农货，助农增收，结业发证' },
  { id: 4, name: '亲子活动·非遗手工体验', emoji: '👨‍👩‍👧', when: '本周六 下午 15:00', place: '农家书屋', quota: '20 组家庭', free: false, price: '¥20/组（含材料）', tags: ['亲子', '非遗'], note: '党员志愿者带娃做手工，材料成本价，丰富孩子课余' },
  { id: 5, name: '广场舞队·夕阳红舞蹈队', emoji: '💃', when: '每晚 19:30 常态', place: '村中心广场', quota: '常年招新', free: true, price: '免费', tags: ['广场舞', '健身'], note: '村委会牵头组建，免费加入，党员领队，愉悦身心' },
];
// ── 社区活动（居委会 + 党员志愿者组织）──
const COMMUNITY_ACTS: Act[] = [
  { id: 1, name: '社区文艺演出·邻里艺术节', emoji: '🎭', when: '本周六 19:30', place: '社区文体中心', quota: '不限', free: true, price: '免费', tags: ['文艺', '惠民'], note: '党员文艺队 + 居民才艺展演，免费观看，邻里同乐' },
  { id: 2, name: '公益讲座·反诈防骗与家庭健康', emoji: '📢', when: '本周日 上午 9:30', place: '社区党群服务中心', quota: '100 人', free: true, price: '免费', tags: ['讲座', '公益'], note: '社区民警 + 家庭医生主讲，免费听讲，含现场义诊' },
  { id: 3, name: '技能培训·电商直播与手工创业', emoji: '📱', when: '每周三 下午 14:00', place: '社区文体中心 3 楼', quota: '30 人', free: true, price: '免费（政府补贴）', tags: ['培训', '创业'], note: '免费学直播带货 / 手工创业，助力灵活就业，结业发证' },
  { id: 4, name: '亲子活动·绘本共读与手工', emoji: '👨‍👩‍👧', when: '本周六 下午 15:00', place: '社区图书室', quota: '20 组家庭', free: false, price: '¥20/组（含材料）', tags: ['亲子', '阅读'], note: '党员志愿者带读带做，材料成本价，促进亲子陪伴' },
  { id: 5, name: '广场舞队·活力社区舞蹈队', emoji: '💃', when: '每晚 19:30 常态', place: '社区文体广场', quota: '常年招新', free: true, price: '免费', tags: ['广场舞', '健身'], note: '居委会牵头组建，免费加入，党员领队，强身健体' },
];

export default function ActivityPage() {
  const [community, setCommunity] = useState(store.isCommunity());
  useDidShow(() => setCommunity(store.isCommunity()));
  const org = community ? '社区' : '乡村';
  const admin = community ? '居委会' : '村委会';
  const venues = community ? COMMUNITY_VENUES : VILLAGE_VENUES;
  const acts = community ? COMMUNITY_ACTS : VILLAGE_ACTS;

  const [tab, setTab] = useState<'venue' | 'act'>('venue');
  const [venue, setVenue] = useState<Venue | null>(null);
  const [act, setAct] = useState<Act | null>(null);

  // 场馆预约
  const bookVenue = (v: Venue, time: string) => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: '预约场馆', showCancel: false, confirmText: '确认预约',
      content: `${v.name}\n时段：${time}\n${v.price}\n\n（演示）已预约，到场报手机号即可使用。参与文体活动计社会贡献值（已到账 +3）。`,
      success: () => { store.addContributionAuto('custom', '文体活动·' + v.name, 3); Taro.showToast({ title: '已预约（演示）', icon: 'success' }); },
    });
  };
  // 活动报名
  const signAct = (a: Act) => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: '活动报名', showCancel: false, confirmText: a.free ? '免费报名' : '确认报名',
      content: `${a.name}\n时间：${a.when} · ${a.place}\n名额：${a.quota} · ${a.price}\n\n（演示）已报名，届时凭手机号签到参与。参与文体活动计社会贡献值（已到账 +3）。`,
      success: () => { store.addContributionAuto('custom', '文体活动·' + a.name, 3); Taro.showToast({ title: '已报名（演示）', icon: 'success' }); },
    });
  };

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">🎭 {org}文体活动</Text>
        <Text className="hero-s">{admin}主办 · 党员志愿者组织 · 公益惠民 · 场馆多数免费开放，丰富群众精神文化生活</Text>
      </View>

      <View className="tabs">
        <View className={`tab ${tab === 'venue' ? 'tab-on' : ''}`} onClick={() => setTab('venue')}>
          <Text className="tab-t">🏛️ 场馆预约</Text>
        </View>
        <View className={`tab ${tab === 'act' ? 'tab-on' : ''}`} onClick={() => setTab('act')}>
          <Text className="tab-t">🎭 活动报名</Text>
        </View>
      </View>

      <ScrollView scrollY className="body">
        {tab === 'venue' ? (
          <>
            <View className="tip"><Text className="tip-t">🏛️ {admin}统一开放辖区文体场馆，健身房 / 图书室免费惠民，活动室公益低价；党员志愿者值守，就近方便。</Text></View>
            {venues.map(v => (
              <View key={v.id} className="card" onClick={() => setVenue(v)}>
                <View className="thumb"><Text className="thumb-e">{v.emoji}</Text></View>
                <View className="info">
                  <Text className="name">{v.name}</Text>
                  <Text className="area">📍 {v.place}</Text>
                  <Text className="meta">🕒 {v.times.length} 个开放时段</Text>
                  <View className="tags"><Text className={v.free ? 'free' : 'paid'}>{v.free ? '免费开放' : v.price}</Text></View>
                </View>
              </View>
            ))}
          </>
        ) : (
          <>
            <View className="tip"><Text className="tip-t">🎭 {admin}联合党员志愿者组织群众文体活动，多数免费或政府补贴；文艺演出、公益讲座、技能培训、亲子活动、广场舞队，欢迎报名参与。</Text></View>
            {acts.map(a => (
              <View key={a.id} className="card" onClick={() => setAct(a)}>
                <View className="thumb"><Text className="thumb-e">{a.emoji}</Text></View>
                <View className="info">
                  <Text className="name">{a.name}</Text>
                  <Text className="area">📍 {a.place}</Text>
                  <Text className="meta">🕒 {a.when} · 名额 {a.quota}</Text>
                  <View className="tags">
                    {a.tags.map(g => <Text key={g} className="tag">{g}</Text>)}
                    <Text className={a.free ? 'free' : 'paid'}>{a.free ? '免费' : a.price}</Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        )}
        <View style={{ height: '40rpx' }} />
      </ScrollView>

      {/* 场馆预约 sheet */}
      {venue && (
        <View className="mask" onClick={() => setVenue(null)}>
          <View className="sheet" onClick={e => e.stopPropagation()}>
            <Text className="sheet-name">{venue.emoji} {venue.name}</Text>
            <Text className="sheet-meta">📍 {venue.place} · {venue.price}</Text>
            <Text className="sheet-note">{venue.note}</Text>
            <Text className="sheet-label">选择开放时段预约</Text>
            {venue.times.map(t => (
              <View key={t} className="time-row" onClick={() => bookVenue(venue, t)}>
                <Text className="time-t">{t}</Text>
                <Text className="time-cta">预约 ›</Text>
              </View>
            ))}
            <Text className="sheet-foot">💡 {admin}公益开放，多数免费惠民；参与文体活动计社会贡献值。</Text>
          </View>
        </View>
      )}

      {/* 活动报名 sheet */}
      {act && (
        <View className="mask" onClick={() => setAct(null)}>
          <View className="sheet" onClick={e => e.stopPropagation()}>
            <Text className="sheet-name">{act.emoji} {act.name}</Text>
            <Text className="sheet-meta">🕒 {act.when} · 📍 {act.place} · 名额 {act.quota}</Text>
            <Text className="sheet-note">{act.note}</Text>
            <View className="sheet-bar">
              <Text className="sheet-price">{act.free ? '免费' : act.price.replace(/[（(].*$/, '')}<Text className="sheet-price-u">{act.free ? '·惠民' : ''}</Text></Text>
              <View className="sheet-btn" onClick={() => signAct(act)}><Text className="sheet-btn-t">{act.free ? '免费报名' : '立即报名'}</Text></View>
            </View>
            <Text className="sheet-foot">💡 党员志愿者组织，丰富群众精神文化生活；参与文体活动计社会贡献值。</Text>
          </View>
        </View>
      )}
    </View>
  );
}
