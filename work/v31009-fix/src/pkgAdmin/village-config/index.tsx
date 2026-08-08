import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { store, FEATURE_LIST } from '../../store';
import { VILLAGE_FULL, COMMUNITY_ORG } from '../../config/region';
import './index.css';

// 演示：平台已接入的村 / 社区（地名统一带完整行政路径，避免全国重名混淆）
const VILLAGES = [VILLAGE_FULL, COMMUNITY_ORG, '天津市东丽区华明街道贯庄村', '天津市东丽区华明街道赵庄村'];

export default function VillageConfigPage() {
  const [allowed, setAllowed] = useState(store.isPlatformAdmin());
  useDidShow(() => {
    const ok = store.isPlatformAdmin();
    setAllowed(ok);
    if (!ok) { Taro.showModal({ title: '无权访问', content: '村庄功能配置仅平台运营方可用', showCancel: false, success: () => Taro.reLaunch({ url: '/pages/index/index' }) }); }
  });

  const [village, setVillage] = useState(VILLAGES[0]);
  const [keys, setKeys] = useState<string[]>(store.getFeatures(VILLAGES[0]));

  const pickVillage = (v: string) => { setVillage(v); setKeys(store.getFeatures(v)); };
  const toggle = (k: string) => {
    const f = FEATURE_LIST.find(x => x.key === k);
    if (f?.mvp) { Taro.showToast({ title: 'MVP 核心，全村常开、不可关闭', icon: 'none' }); return; }
    setKeys(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  };
  const save = () => { store.setFeatures(keys, village); Taro.showToast({ title: `已保存「${village}」的功能配置`, icon: 'success' }); };
  const openCount = FEATURE_LIST.filter(f => f.mvp || keys.includes(f.key)).length;

  if (!allowed) {
    return (
      <View className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Text style={{ fontSize: '30rpx', color: '#9ca3af' }}>🔒 村庄功能配置仅平台运营方可访问</Text>
      </View>
    );
  }

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">⚙️ 村庄功能配置</Text>
        <Text className="hero-s">平台按村控制开通哪些功能 · 关闭的在用户端 / 村委端自动隐藏</Text>
      </View>
      <ScrollView scrollY className="body">
        <Text className="lbl">① 选择村庄 / 社区</Text>
        <ScrollView scrollX className="vill-row">
          {VILLAGES.map(v => (
            <View key={v} className={`vill ${village === v ? 'vill-on' : ''}`} onClick={() => pickVillage(v)}>
              <Text className="vill-t">{v}</Text>
            </View>
          ))}
        </ScrollView>

        <Text className="lbl">② 功能开关 · 已开 {openCount}/{FEATURE_LIST.length} 项</Text>
        {FEATURE_LIST.map(f => {
          const on = f.mvp || keys.includes(f.key);
          return (
            <View key={f.key} className="feat" onClick={() => toggle(f.key)}>
              <View className="feat-l">
                <Text className="feat-n">{f.name}</Text>
                {f.mvp && <Text className="feat-mvp">MVP核心·常开</Text>}
              </View>
              <View className={`sw ${on ? 'sw-on' : ''} ${f.mvp ? 'sw-lock' : ''}`}><View className="sw-dot" /></View>
            </View>
          );
        })}

        <View className="save" onClick={save}><Text className="save-t">保存「{village}」配置</Text></View>
        <Text className="tip">💡 MVP 核心（供享大集 / 社会贡献值 / 党建引领 / 管理后台）全村常开、不可关闭；其余功能可按村逐步放开。</Text>
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
