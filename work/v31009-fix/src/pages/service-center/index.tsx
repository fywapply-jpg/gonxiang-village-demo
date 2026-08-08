import Taro, { useRouter } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { SERVICE_CENTERS, centerName } from '../../config/service-centers';
import { SECTIONS, entryFeature, entryName, entryUrl, sectionTitle } from '../../config/sections';
import { store } from '../../store';
import './index.css';

export default function ServiceCenterPage() {
  const { params } = useRouter();
  const center = SERVICE_CENTERS.find(item => item.key === params.key) || SERVICE_CENTERS[0];
  const seen = new Set<string>();
  const groups = SECTIONS.filter(section => center.sectionKeys.includes(section.key) && (!section.scope || section.scope === store.orgType()))
    .map(section => {
      const entries = section.entries.filter(entry => {
        if (center.admin ? !entry.admin : entry.admin) return false;
        if (entry.party && !store.isPartyMember()) return false;
        if (entry.scope && entry.scope !== store.orgType()) return false;
        const feature = entryFeature(entry);
        if (feature && !store.isFeatureOn(feature)) return false;
        const url = entryUrl(entry);
        if (seen.has(url)) return false;
        seen.add(url);
        return true;
      });
      return { section, entries };
    }).filter(group => group.entries.length > 0);

  return (
    <View className="page">
      <View className="head" style={{ borderTopColor: center.accent }}>
        <Text className="head-title">{centerName(center, store.isCommunity())}</Text>
        <Text className="head-summary">{center.summary}</Text>
      </View>
      <ScrollView scrollY className="body">
        {groups.map(({ section, entries }) => (
          <View key={section.key} className="group">
            <View className="group-head">
              <Text className="group-title">{sectionTitle(section)}</Text>
              <Text className="group-slogan">{section.slogan}</Text>
            </View>
            <View className="rows">
              {entries.map(entry => (
                <View key={`${entry.name}-${entryUrl(entry)}`} className="row" onClick={() => Taro.navigateTo({ url: entryUrl(entry) })}>
                  <View className="row-icon" style={{ background: `${center.accent}12` }}><Text>{entry.icon}</Text></View>
                  <Text className="row-name">{entryName(entry)}</Text>
                  <Text className="row-arrow">›</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
        <View className="tip"><Text>已按办理场景归集，所有原功能图标和链接均保留。</Text></View>
        <View className="space" />
      </ScrollView>
    </View>
  );
}
