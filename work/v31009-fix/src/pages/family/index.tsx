import Taro from '@tarojs/taro';
import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

const memberScore = (name: string) => { let h = 0; for (let i = 0; i < name.length; i++) h += name.charCodeAt(i); return 200 + (h % 400); };

export default function FamilyPage() {
  const [members] = useState<any[]>(() => {
    const ms = store.getFamilyMembers();
    if (ms && ms.length) return ms;
    return [{ name: '王建国', isHead: true }, { name: '王秀兰', isHead: false }, { name: '王小磊', isHead: false }];
  });
  const family = store.getUser()?.family || '本户';
  const total = members.reduce((s, m) => s + memberScore(String(m.name || '')), 0);
  const isHead = store.isHouseholdHead();

  const daiban = () => Taro.showActionSheet({ itemList: ['代订长者餐', '代预约挂号', '代缴水电费', '代报名活动'], success: (res) => Taro.showToast({ title: `已为家人${['代订餐', '代挂号', '代缴费', '代报名'][res.tapIndex]}（演示）`, icon: 'none' }) });
  const invite = () => Taro.showModal({ title: '家庭邀请码', content: '（演示）已生成本户邀请码，家人扫码即可加入你的家庭、归属同一户，由你作为户主统一管理。', showCancel: false });

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">{isHead ? '👑 户主 · 家庭成员管理' : '👨‍👩‍👧 家庭成员'}</Text>
        <Text className="hero-s">{family} · 共 {members.length} 人 · 家庭贡献合计 {total} 分</Text>
      </View>
      <ScrollView scrollY className="body">
        {!isHead && (
          <View className="tip" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
            <Text className="tip-t" style={{ color: '#c2410c' }}>🔒 仅本户户主可管理家庭成员，你可查看本户成员与家庭贡献；如需代办 / 邀请家人，请联系本户户主。</Text>
          </View>
        )}
        {members.map((m, i) => (
          <View key={i} className="mcard">
            <View className="mav"><Text className="mav-t">{String(m.name || '?').charAt(0)}</Text></View>
            <View className="minfo">
              <Text className="mname">{m.name}{m.isHead ? ' 👑' : ''}</Text>
              <Text className="mrole">{m.isHead ? (isHead ? '户主（你）' : '户主') : '家庭成员'} · 贡献 {memberScore(String(m.name || ''))} 分</Text>
            </View>
            {isHead && <View className="mact" onClick={daiban}><Text className="mact-t">代办</Text></View>}
          </View>
        ))}
        {isHead && <View className="tip"><Text className="tip-t">作为户主，你可代家庭成员预约 / 办事 / 订餐，查看本户家庭积分与五好家庭评定，邀请家人加入本户。</Text></View>}
        <View style={{ height: '160rpx' }} />
      </ScrollView>
      {isHead && <View className="fab" onClick={invite}><Text className="fab-t">＋ 邀请家人加入本户</Text></View>}
    </View>
  );
}
