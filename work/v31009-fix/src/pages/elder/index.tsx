import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import './index.css';

interface BigItem { icon: string; name: string; color: string; url?: string; }
const BIG: BigItem[] = [
  { icon: '📞', name: '呼叫家人', color: '#16a34a' },
  { icon: '🏥', name: '健康医疗', color: '#0d9488', url: '/pages/health/index' },
  { icon: '🏛️', name: '政务代办', color: '#2563eb', url: '/pages/gov/index' },
  { icon: '📦', name: '我的订单', color: '#ea580c', url: '/pages/orders/index' },
  { icon: '🧺', name: '惠民团购', color: '#dc2626', url: '/pages/groupon/index' },
  { icon: '❤️', name: '志愿帮扶', color: '#c81e1e', url: '/pages/volunteer/index' },
];

export default function ElderPage() {
  const [helped, setHelped] = useState(false);
  const tap = (item: BigItem) => {
    if (item.url) { Taro.navigateTo({ url: item.url }); return; }
    Taro.showModal({
      title: item.name,
      content: '家人电话：138-0000-0000（演示）。正式版将接入您登记的家人号码，点「拨打」即可直接呼叫。',
      confirmText: '拨打',
      success: (r) => {
        if (!r.confirm) return;
        try {
          Taro.makePhoneCall({ phoneNumber: '13800000000' }).catch(() => {});
        } catch {
          Taro.showToast({ title: '演示环境暂不能拨号', icon: 'none' });
        }
      },
    });
  };
  const help = () => {
    if (helped) return;
    setHelped(true);
    Taro.showToast({ title: '已发出求助', icon: 'success' });
  };
  return (
    <View className="page">
      <View className="head">
        <Text className="head-title">长辈模式</Text>
        <Text className="head-sub">大字大图标 · 一键直达</Text>
      </View>
      <ScrollView scrollY className="body">
        <View className={`sos ${helped ? 'sos-done' : ''}`} onClick={help}>
          <Text className="sos-icon">🆘</Text>
          <View className="sos-text">
            <Text className="sos-main">{helped ? '已通知网格员与家人' : '一键求助'}</Text>
            <Text className="sos-sub">{helped ? '请原地等待，马上有人来' : '遇到困难？点这里求助'}</Text>
          </View>
        </View>
        <View className="big-grid">
          {BIG.map(b => (
            <View key={b.name} className="big" onClick={() => tap(b)}>
              <View className="big-icon" style={{ background: b.color }}><Text className="big-emoji">{b.icon}</Text></View>
              <Text className="big-name">{b.name}</Text>
            </View>
          ))}
        </View>
        <View className="elder-tip"><Text className="elder-tip-t">字体已放大 · 如需帮助请联系党群服务中心 0398-8888888</Text></View>
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
