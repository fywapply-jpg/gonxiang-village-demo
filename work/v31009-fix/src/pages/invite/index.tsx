import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Button } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

const INVITE_CODE = 'GX10086';

interface Downline { name: string; phone: string; joinDate: string; gmv: number; contrib: number; }

// 贡献值奖励：邀请实名 +10、首单 +5、每满 ¥50 助农消费 +2（无现金分成）
const contribOf = (gmv: number, firstOrder: boolean) => 10 + (firstOrder ? 5 : 0) + Math.floor(gmv / 50) * 2;

const MOCK_DOWNLINES: Downline[] = [
  { name: '张小花', phone: '152****8833', joinDate: '10月5日', gmv: 860, contrib: contribOf(860, true) },
  { name: '王二牛', phone: '139****4455', joinDate: '10月12日', gmv: 650, contrib: contribOf(650, true) },
  { name: '陈翠翠', phone: '177****6677', joinDate: '10月20日', gmv: 420, contrib: contribOf(420, true) },
];

const BIND_POOL = ['周建伟', '吴小芳', '郑强', '李慧', '冯大山'];

export default function InvitePage() {
  const [downlines, setDownlines] = useState<Downline[]>(MOCK_DOWNLINES);
  const [binding, setBinding] = useState(false);

  const inviteContrib = downlines.length * 10;
  const boostContrib = downlines.reduce((s, d) => s + (d.contrib - 10), 0);
  const totalContrib = downlines.reduce((s, d) => s + d.contrib, 0);

  const copyCode = () => Taro.setClipboardData({ data: INVITE_CODE, success: () => Taro.showToast({ title: '邀请码已复制', icon: 'success' }) });
  const shareLink = () => { Taro.showShareMenu({ withShareTicket: true, menus: ['shareAppMessage', 'shareTimeline'] } as any); Taro.showToast({ title: '请点击右上角分享', icon: 'none' }); };

  const simulateBind = () => {
    if (!store.requireBound()) return;
    const remaining = BIND_POOL.filter(n => !downlines.find(d => d.name === n));
    if (remaining.length === 0) { Taro.showToast({ title: '演示数据已用完', icon: 'none' }); return; }
    setBinding(true);
    setTimeout(() => {
      const name = remaining[0];
      setDownlines(prev => [...prev, { name, phone: `1${Math.floor(Math.random() * 9) + 3}****${Math.floor(1000 + Math.random() * 9000)}`, joinDate: `${new Date().getMonth() + 1}月${new Date().getDate()}日`, gmv: 0, contrib: 10 }]);
      setBinding(false);
      // 邀请实名加入 = 系统可验证，自动计分（不走人工审核）
      store.addContributionAuto('career', `邀请好友·${name} 实名加入`, 10);
      Taro.showModal({ title: '邀请成功', content: `${name} 已实名加入并绑定你为邀请人。\n\n+10 社会贡献值已自动计入你的账户（系统核实、无需审核）。TA 首次下单你再 +5，每满 ¥50 助农消费你 +2。`, showCancel: false });
    }, 1500);
  };

  return (
    <View className="page">
      {/* 贡献值汇总 */}
      <View className="earn-card">
        <Text className="earn-title">邀请获得的社会贡献值</Text>
        <View className="earn-row">
          <View className="earn-item">
            <Text className="earn-num">{inviteContrib}</Text>
            <Text className="earn-label">邀请实名</Text>
          </View>
          <View className="earn-divider" />
          <View className="earn-item">
            <Text className="earn-num">{boostContrib}</Text>
            <Text className="earn-label">助农带动</Text>
          </View>
          <View className="earn-divider" />
          <View className="earn-item">
            <Text className="earn-num" style={{ color: '#fbbf24' }}>{totalContrib}</Text>
            <Text className="earn-label">累计贡献值</Text>
          </View>
        </View>
      </View>

      {/* 邀请码 */}
      <View className="invite-card">
        <Text className="invite-title">我的邀请码</Text>
        <Text className="invite-code">{INVITE_CODE}</Text>
        <Text className="invite-hint">好友扫码实名加入即得贡献值奖励 · 无现金分成、公益助农</Text>
        <View className="btn-row">
          <Button className="btn-copy" onClick={copyCode}>复制邀请码</Button>
          <Button className="btn-share" onClick={shareLink}>分享给好友</Button>
        </View>
      </View>

      {/* 已邀请好友 */}
      <View className="downline-card">
        <View className="section-head">
          <Text className="section-title">已邀请好友（{downlines.length}人）</Text>
          <Button className="btn-sim" loading={binding} onClick={simulateBind}>+ 模拟邀请</Button>
        </View>
        {downlines.map((d, i) => (
          <View key={i} className="downline-item">
            <View className="dl-avatar"><Text>{d.name[0]}</Text></View>
            <View className="dl-info">
              <Text className="dl-name">{d.name}</Text>
              <Text className="dl-meta">{d.phone}　加入于 {d.joinDate}</Text>
            </View>
            <View className="dl-earn">
              <Text className="dl-gmv">助农消费 ¥{d.gmv}</Text>
              <Text className="dl-commission">贡献值 +{d.contrib}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* 规则说明 */}
      <View className="rules-card">
        <Text className="rules-title">🎖️ 邀请奖励规则（社会贡献值）</Text>
        <Text className="rule-item">· 🤝 邀请好友实名加入：+10 贡献值</Text>
        <Text className="rule-item">· 🛒 好友首次下单成交：+5 贡献值</Text>
        <Text className="rule-item">· 🌾 好友每满 ¥50 助农消费：+2 贡献值</Text>
        <Text className="rule-item">· ✅ 系统自动核实计分，无需人工审核（有注册/订单数据为证）</Text>
        <Text className="rule-item">· 🚩 单层直接邀请，不发展下线、无现金分成 —— 邀请助农得贡献值，可换分红 / 贡献商城好物 / 信用待遇</Text>
      </View>

      <View style={{ height: '60rpx' }} />
    </View>
  );
}
