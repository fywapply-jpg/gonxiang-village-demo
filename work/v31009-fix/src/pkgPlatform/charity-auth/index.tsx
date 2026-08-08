import Taro, { useDidShow, useLoad } from '@tarojs/taro';
import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { store, CHARITY_PERMS } from '../../store';
import './index.css';

export default function CharityAuthPage() {
  const [allowed, setAllowed] = useState(store.isPlatformAdmin());
  useDidShow(() => {
    const ok = store.isPlatformAdmin();
    setAllowed(ok);
    if (!ok) { Taro.showModal({ title: '无权访问', content: '社会公益授权管理仅平台运营方可用', showCancel: false, success: () => Taro.reLaunch({ url: '/pages/index/index' }) }); }
  });

  useLoad(() => {
    Taro.setNavigationBarTitle({ title: '社会公益授权管理' });
  });

  const [keys, setKeys] = useState<string[]>(store.getCharityAuth());
  const authorized = keys.length > 0;
  const toggle = (k: string) => setKeys(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  const grantAll = () => setKeys(CHARITY_PERMS.map(p => p.key));
  const revokeAll = () => setKeys([]);
  const save = () => { store.setCharityAuth(keys); Taro.showToast({ title: keys.length ? `已授权 ${keys.length} 项责权` : '已收回全部授权', icon: 'success' }); };

  if (!allowed) {
    return (
      <View className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Text style={{ fontSize: '30rpx', color: '#9ca3af' }}>🔒 社会公益授权管理仅平台运营方可访问</Text>
      </View>
    );
  }

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">🛡️ 社会公益授权管理</Text>
        <Text className="hero-s">平台运营授权分级管理 · 公众仅浏览权 · 授权后在责权范围内行使</Text>
      </View>
      <ScrollView scrollY className="body">
        <View className="orgcard">
          <View className="org-l">
            <Text className="org-n">关心下一代体育基金会</Text>
            <Text className="org-s">社会公益管理主体 · 授权认证</Text>
          </View>
          <View className={`badge ${authorized ? 'badge-on' : ''}`}><Text className="badge-t">{authorized ? '已授权' : '未授权'}</Text></View>
        </View>
        <View className="quick">
          <View className="q-btn" onClick={grantAll}><Text className="q-t">全部授权</Text></View>
          <View className="q-btn q-off" onClick={revokeAll}><Text className="q-t2">收回全部</Text></View>
        </View>
        <Text className="lbl">分级责权（勾选授予 · 已授 {keys.length}/{CHARITY_PERMS.length}）</Text>
        {CHARITY_PERMS.map(p => {
          const on = keys.includes(p.key);
          return (
            <View key={p.key} className="perm" onClick={() => toggle(p.key)}>
              <View className="perm-l"><Text className="perm-n">{p.name}</Text><Text className="perm-d">{p.desc}</Text></View>
              <View className={`sw ${on ? 'sw-on' : ''}`}><View className="sw-dot" /></View>
            </View>
          );
        })}
        <View className="save" onClick={save}><Text className="save-t">保存授权</Text></View>
        <Text className="tip">💡 未授予的责权，公益机构管理员在社会公益页「只能看不能改」；公众（村民 / 居民 / 游客）仅有浏览权。公益机构管理员再将责权逐级授权到各福利机构 / 基金会项目板块分别开展工作。</Text>
        <Text className="tip" style={{ textAlign: 'center' }}>本页为社会公益授权管理演示示意，实际以平台正式授权规则为准。</Text>
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
