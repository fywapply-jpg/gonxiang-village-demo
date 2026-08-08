import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import { COMMUNITY_LIFE, VILLAGE_LIFE, LifeCat } from '../../config/life-services';
import './index.css';

export default function LifePage() {
  const [community, setCommunity] = useState(store.isCommunity());
  useDidShow(() => setCommunity(store.isCommunity()));
  const cats: LifeCat[] = community ? COMMUNITY_LIFE : VILLAGE_LIFE;
  const member = community ? '居民' : '村民';
  const org = community ? '居委会' : '村委会';
  const title = community ? '社区生活服务' : '乡村生活服务';
  const act = (cat: LifeCat, item: string) => {
    if (cat.url) {
      Taro.showModal({
        title: item,
        content: `「${cat.title} · ${item}」由${org}统筹提供、党员志愿帮办。可进入办理页在线预约 / 查看，或到党群服务中心现场办理。`,
        confirmText: '去办理', cancelText: '知道了',
        success: (r) => { if (r.confirm && cat.url) Taro.navigateTo({ url: cat.url }); },
      });
    } else {
      Taro.showModal({
        title: item,
        content: `「${cat.title} · ${item}」由${org}统筹提供、党员志愿帮办，可线上预约或到党群服务中心办理（演示）。`,
        showCancel: false,
      });
    }
  };

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">🤝 {title}</Text>
        <Text className="hero-s">{cats.length} 大类服务 · {org}统筹 · 党员志愿帮办 · 为{member}就近办</Text>
      </View>
      <ScrollView scrollY className="body">
        {cats.map((c, idx) => (
          <View key={c.key} className="cat">
            <View className="cat-head">
              <Text className="cat-idx">{idx + 1}</Text>
              <Text className="cat-t">{c.icon} {c.title}</Text>
              <Text className="cat-n">{c.url ? '可办理 ›' : c.items.length + '项'}</Text>
            </View>
            <View className="chips">
              {c.items.map(it => (
                <View key={it} className="chip" onClick={() => act(c, it)}>
                  <Text className="chip-t">{it}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
        <View className="foot"><Text className="foot-t">🚩 以上服务由{org}党组织统筹、党员先锋带头、志愿队伍参与，服务记录计入社会贡献值。</Text></View>
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
