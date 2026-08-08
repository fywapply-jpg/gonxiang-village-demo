import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

// ── 党费记录（党员端） ────────────────────────────────────────────────────────
interface DuesRecord { month: string; amount: number; paid: boolean; }
const INIT_DUES: DuesRecord[] = [
  { month: '2026年6月', amount: 6, paid: false },
  { month: '2026年5月', amount: 6, paid: true },
  { month: '2026年4月', amount: 6, paid: true },
  { month: '2026年3月', amount: 6, paid: true },
  { month: '2026年2月', amount: 6, paid: true },
  { month: '2026年1月', amount: 6, paid: true },
];

// ── 三会一课台账 ──────────────────────────────────────────────────────────────
type MeetingType = '支部党员大会' | '党小组会' | '支委会' | '党课' | '主题党日';
interface Meeting { id: number; type: MeetingType; title: string; date: string; should: number; actual: number; status: 'done' | 'upcoming'; signed?: boolean; }
const INIT_MEETINGS: Meeting[] = [
  { id: 1, type: '主题党日', title: '12月主题党日·学习全会精神', date: '12月05日 09:00', should: 31, actual: 0, status: 'upcoming' },
  { id: 2, type: '支委会', title: '研究年底评议与发展党员事项', date: '12月02日 14:00', should: 5, actual: 0, status: 'upcoming' },
  { id: 3, type: '党课', title: '书记讲党课·乡村振兴中的党建引领', date: '11月20日', should: 31, actual: 28, status: 'done' },
  { id: 4, type: '支部党员大会', title: '11月支部党员大会', date: '11月10日', should: 31, actual: 30, status: 'done' },
  { id: 5, type: '党小组会', title: '第一党小组学习研讨', date: '11月05日', should: 12, actual: 12, status: 'done' },
];
const TYPE_COLOR: Record<MeetingType, string> = {
  '支部党员大会': 'm-red', '党小组会': 'm-orange', '支委会': 'm-blue', '党课': 'm-purple', '主题党日': 'm-green',
};

// ── 党支部收费管理端 ──────────────────────────────────────────────────────────
interface Member { name: string; paid: boolean; activated: boolean; }
const INIT_MEMBERS: Member[] = [
  { name: '王建国', paid: true, activated: true },
  { name: '冯韵雯', paid: true, activated: true },
  { name: '孙志强', paid: true, activated: true },
  { name: '李秀兰', paid: false, activated: true },
  { name: '周建伟', paid: true, activated: true },
  { name: '吴小芳', paid: false, activated: true },
  { name: '郑强', paid: false, activated: false },
  { name: '张大山', paid: true, activated: true },
  { name: '刘建军', paid: false, activated: false },
  { name: '赵丽华', paid: true, activated: true },
];
interface Flow { name: string; month: string; amount: number; date: string; }
const INIT_FLOW: Flow[] = [
  { name: '王建国', month: '6月', amount: 6, date: '12-01 09:12' },
  { name: '冯韵雯', month: '6月', amount: 6, date: '12-01 08:45' },
  { name: '孙志强', month: '6月', amount: 6, date: '11-30 19:20' },
  { name: '周建伟', month: '6月', amount: 6, date: '11-30 15:08' },
  { name: '张大山', month: '6月', amount: 6, date: '11-29 21:33' },
  { name: '赵丽华', month: '6月', amount: 6, date: '11-29 10:55' },
];

export default function PartyDuesPage() {
  const isAdmin = store.canManageVillage();
  const [allowed, setAllowed] = useState(store.isPartyMember());
  const routeTab = Taro.getCurrentInstance().router?.params?.tab;
  const [tab, setTab] = useState<'dues' | 'meeting' | 'manage'>(routeTab === 'meeting' ? 'meeting' : 'dues');
  const [dues, setDues] = useState<DuesRecord[]>(INIT_DUES);
  const [meetings, setMeetings] = useState<Meeting[]>(INIT_MEETINGS);
  const [members, setMembers] = useState<Member[]>(INIT_MEMBERS);
  const [flow, setFlow] = useState<Flow[]>(INIT_FLOW);

  useDidShow(() => {
    const ok = store.isPartyMember();
    setAllowed(ok);
    if (!ok) {
      Taro.showModal({ title: '党建联建', content: '党建联建内容仅面向在册党员开放浏览与参与，请先在「我的」绑定 / 切换党员身份', showCancel: false, success: () => Taro.reLaunch({ url: '/pages/index/index' }) });
    }
  });

  const payDues = (month: string, amount: number) => {
    Taro.showModal({
      title: '缴纳党费',
      content: `应缴 ${month} 党费 ¥${amount.toFixed(2)}，将调起微信支付，缴费后自动入账并生成电子收据。`,
      confirmText: '立即支付',
      success: (res) => {
        if (!res.confirm) return;
        Taro.showLoading({ title: '调起微信支付…' });
        setTimeout(() => {
          Taro.hideLoading();
          setDues(prev => prev.map(d => d.month === month ? { ...d, paid: true } : d));
          setFlow(prev => [{ name: store.getUser()?.name || '我', month: month.replace('2026年', ''), amount, date: '刚刚' }, ...prev]);
          Taro.showToast({ title: '缴费成功，已生成电子收据', icon: 'success' });
        }, 800);
      },
    });
  };

  const sign = (id: number) => {
    Taro.showModal({
      title: '会议签到', content: '确认签到参加本次会议？',
      success: (res) => {
        if (res.confirm) {
          setMeetings(prev => prev.map(m => m.id === id ? { ...m, signed: true, actual: m.actual + 1 } : m));
          Taro.showToast({ title: '签到成功', icon: 'success' });
        }
      },
    });
  };

  const urge = (name: string) => Taro.showToast({ title: `已向 ${name} 发送催缴提醒`, icon: 'none' });
  const activate = (name: string) => {
    setMembers(prev => prev.map(m => m.name === name ? { ...m, activated: true } : m));
    Taro.showToast({ title: `已开通 ${name} 的个人界面`, icon: 'success' });
  };

  const unpaidCount = dues.filter(d => !d.paid).length;
  const paidThisYear = dues.filter(d => d.paid).reduce((s, d) => s + d.amount, 0);
  const meetingDone = meetings.filter(m => m.status === 'done').length;
  const total = members.length;
  const paidCount = members.filter(m => m.paid).length;
  const should = total * 6;
  const received = paidCount * 6;

  if (!allowed) {
    return (<View className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Text style={{ fontSize: '30rpx', color: '#9ca3af' }}>🔒 党建内容仅在册党员可访问</Text></View>);
  }

  return (
    <View className="page">
      <View className="tab-bar">
        <View className={`tab ${tab === 'dues' ? 'active' : ''}`} onClick={() => setTab('dues')}><Text>💴 党费缴纳</Text></View>
        <View className={`tab ${tab === 'meeting' ? 'active' : ''}`} onClick={() => setTab('meeting')}><Text>📋 三会一课</Text></View>
        {isAdmin && <View className={`tab ${tab === 'manage' ? 'active' : ''}`} onClick={() => setTab('manage')}><Text>🏛️ 支部收费</Text></View>}
      </View>

      <ScrollView scrollY className="body">
        {tab === 'dues' && (
          <View className="wrap">
            <View className="dues-overview">
              <Text className="do-label">今年已缴党费</Text>
              <Text className="do-amount">¥{paidThisYear.toFixed(2)}</Text>
              {unpaidCount > 0
                ? <Text className="do-remind">⚠️ 还有 {unpaidCount} 个月待缴</Text>
                : <Text className="do-remind ok">✓ 党费已全部缴清</Text>}
            </View>
            <View className="std-card">
              <Text className="std-title">党费缴纳标准</Text>
              <Text className="std-text">每月按个人收入的 0.5%–2% 缴纳（农民党员本支部统一标准 ¥6/月），平台缴费自动入账、生成电子收据。</Text>
            </View>
            <Text className="sec-title">缴纳记录</Text>
            {dues.map(d => (
              <View key={d.month} className="dues-row">
                <View className="dues-info">
                  <Text className="dues-month">{d.month}</Text>
                  <Text className="dues-amt">¥{d.amount.toFixed(2)}</Text>
                </View>
                {d.paid
                  ? <View className="dues-paid"><Text className="dues-paid-text">已缴</Text></View>
                  : <View className="dues-pay-btn" onClick={() => payDues(d.month, d.amount)}><Text className="dues-pay-text">微信支付</Text></View>}
              </View>
            ))}
          </View>
        )}

        {tab === 'meeting' && (
          <View className="wrap">
            <View className="meeting-overview">
              <View className="mo-item"><Text className="mo-num">{meetingDone}</Text><Text className="mo-label">本季已开展</Text></View>
              <View className="mo-item"><Text className="mo-num">{meetings.filter(m => m.status === 'upcoming').length}</Text><Text className="mo-label">即将开展</Text></View>
              <View className="mo-item"><Text className="mo-num">95%</Text><Text className="mo-label">平均出勤</Text></View>
            </View>
            <Text className="sec-title">会议台账</Text>
            {meetings.map(m => (
              <View key={m.id} className="meeting-card">
                <View className="meeting-head">
                  <View className={`meeting-type ${TYPE_COLOR[m.type]}`}><Text className="meeting-type-text">{m.type}</Text></View>
                  <Text className={`meeting-st ${m.status === 'done' ? 'done' : 'upcoming'}`}>{m.status === 'done' ? '已开展' : '待开展'}</Text>
                </View>
                <Text className="meeting-title">{m.title}</Text>
                <View className="meeting-foot">
                  <Text className="meeting-date">🕐 {m.date}</Text>
                  <Text className="meeting-attend">{m.status === 'done' ? `应到 ${m.should} · 实到 ${m.actual}` : `应到 ${m.should} 人`}</Text>
                </View>
                {m.status === 'upcoming' && (
                  m.signed
                    ? <View className="meeting-signed"><Text className="meeting-signed-text">✓ 已签到</Text></View>
                    : <View className="meeting-sign-btn" onClick={() => sign(m.id)}><Text className="meeting-sign-text">签到</Text></View>
                )}
              </View>
            ))}
          </View>
        )}

        {tab === 'manage' && (
          <View className="wrap">
            <View className="manage-overview">
              <Text className="mng-label">本月党费收缴</Text>
              <View className="mng-amount-row">
                <Text className="mng-received">¥{received}</Text>
                <Text className="mng-should">/ 应收 ¥{should}</Text>
              </View>
              <View className="mng-bar"><View className="mng-bar-fill" style={{ width: `${Math.round(received / should * 100)}%` }} /></View>
              <Text className="mng-sub">{paidCount}/{total} 名党员已缴 · 全支部共 {total} 名党员</Text>
            </View>

            <Text className="sec-title">党员缴费名册</Text>
            {members.map(m => (
              <View key={m.name} className="member-row">
                <View className="member-info">
                  <Text className="member-name">{m.name}</Text>
                  <Text className={`member-tag ${m.activated ? '' : 'off'}`}>{m.activated ? '已开通个人界面' : '未开通'}</Text>
                </View>
                {!m.activated
                  ? <View className="m-btn open" onClick={() => activate(m.name)}><Text className="m-btn-t">开通界面</Text></View>
                  : m.paid
                    ? <View className="m-paid"><Text className="m-paid-t">✓ 已缴</Text></View>
                    : <View className="m-btn urge" onClick={() => urge(m.name)}><Text className="m-btn-t-o">催缴</Text></View>}
              </View>
            ))}

            <Text className="sec-title">党费流水</Text>
            <View className="flow-card">
              {flow.map((f, i) => (
                <View key={i} className="flow-row">
                  <View className="flow-left">
                    <Text className="flow-name">{f.name}</Text>
                    <Text className="flow-meta">{f.month}党费 · {f.date}</Text>
                  </View>
                  <Text className="flow-amt">+¥{f.amount.toFixed(2)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: '60rpx' }} />
      </ScrollView>
    </View>
  );
}
