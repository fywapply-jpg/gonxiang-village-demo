import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

interface Member { id: number; name: string; phone: string; household: string; verified: boolean; }
const INIT_MEMBERS: Member[] = [
  { id: 1, name: '王建国', phone: '138****0001', household: '1组·王宅', verified: true },
  { id: 2, name: '李秀兰', phone: '138****0002', household: '1组·王宅', verified: true },
  { id: 3, name: '张志强', phone: '138****0003', household: '2组·张宅', verified: true },
  { id: 4, name: '周建伟', phone: '138****0008', household: '4组·周宅', verified: true },
  { id: 5, name: '赵明', phone: '155****8866', household: '—', verified: false },
  { id: 6, name: '孙丽', phone: '156****2233', household: '—', verified: false },
];

export default function OrgCodePage() {
  const [allowed, setAllowed] = useState(store.canManageVillage());
  useDidShow(() => {
    const ok = store.canManageVillage();
    setAllowed(ok);
    if (!ok) {
      Taro.showModal({ title: '无权访问', content: '组织码与成员名单仅村委/居委会/平台管理员可用', showCancel: false, success: () => Taro.reLaunch({ url: '/pages/index/index' }) });
    }
  });
  const [members, setMembers] = useState<Member[]>(INIT_MEMBERS);
  const org = store.orgLabel();      // 村 / 社区
  const admin = store.adminLabel();  // 村委会 / 居委会
  const member = store.memberLabel(); // 村民 / 居民

  // 名册导入统一走「后台名册导入」分包页（含真实 Excel 解析）；xlsx 库仅打进分包，主包不超 2MB
  const importExcel = () => Taro.navigateTo({ url: '/pkgAdmin/roster-import/index' });
  const verify = (id: number) => Taro.showModal({ title: '人工复核认证', content: `确认该成员属于本${org}？认证后可参与下单、议事、积分等。`, success: r => { if (r.confirm) setMembers(m => m.map(x => x.id === id ? { ...x, verified: true } : x)); } });
  const showCode = () => Taro.showModal({ title: `一${org}一码`, content: `范庄${org}专属二维码，由${admin}党支部掌握并推广。\n${member}微信扫码 → 弹出"这是范庄${org}" → 确认即归属本${org}。\n\n（演示）实际为可下载 / 打印的二维码图片。`, showCancel: false });

  const verifiedCount = members.filter(m => m.verified).length;

  // 守卫未通过时只渲染锁定占位页，绝不渲染真实名单（防止弹窗期间实名手机号露出）
  if (!allowed) {
    return (
      <View className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Text style={{ fontSize: '30rpx', color: '#9ca3af' }}>🔒 组织码与成员名单仅村委 / 居委会 / 平台管理员可访问</Text>
      </View>
    );
  }

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">📇 组织码与成员名单</Text>
        <Text className="hero-s">范庄{org} · {admin}党支部掌码 · 一{org}一码</Text>
      </View>

      <ScrollView scrollY className="body">
        <View className="qr-card" onClick={showCode}>
          <View className="qr-box">
            <View className="qr-grid">
              {Array.from({ length: 25 }).map((_, i) => (<View key={i} className={`qr-dot ${(i * 7 % 3 === 0 || i % 4 === 0) ? 'on' : ''}`} />))}
            </View>
          </View>
          <View className="qr-info">
            <Text className="qr-title">一{org}一码 · 范庄{org}</Text>
            <Text className="qr-desc">{member}扫码即归属本{org}；{admin}党支部掌握并推广</Text>
            <Text className="qr-act">点击查看大图 ›</Text>
          </View>
        </View>

        <View className="sec">
          <View className="sec-head">
            <Text className="sec-title">成员名单（已认证 {verifiedCount}/{members.length}）</Text>
            <Text className="sec-add" onClick={importExcel}>＋ Excel导入</Text>
          </View>
          <View className="tip"><Text className="tip-t">📋 扫码自动比对名单：匹配→自动认证；不匹配→未认证(灰色·可看不可参与)，由{admin}定期复核</Text></View>
          {members.map(m => (
            <View key={m.id} className={`mem ${m.verified ? '' : 'mem-off'}`}>
              <View className="mem-avatar"><Text>{m.name[0]}</Text></View>
              <View className="mem-info">
                <View className="mem-line"><Text className="mem-name">{m.name}</Text><Text className={m.verified ? 'badge-ok' : 'badge-no'}>{m.verified ? '已认证' : '未认证'}</Text></View>
                <Text className="mem-sub">{m.phone} · {m.household}</Text>
              </View>
              {!m.verified && <View className="mem-btn" onClick={() => verify(m.id)}><Text className="mem-btn-t">认证</Text></View>}
            </View>
          ))}
          <View style={{ height: '40rpx' }} />
        </View>
      </ScrollView>
    </View>
  );
}
