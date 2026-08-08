import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { store } from '../../store';
import { certCount } from '../../config/contribution-model';
import './index.css';

export default function DigitalAssetPage() {
  const acct = store.getContribAccount();
  const cv = acct.total;
  const certs = certCount(cv);
  const dividend = acct.dividend;
  const progress = cv % 1000;
  const list = Array.from({ length: certs }, (_, i) => ({ no: `GX-TJ001-${String(i + 1).padStart(4, '0')}`, cv: 1000, date: `2026.${(i % 12) + 1}` }));

  const claim = () => Taro.showModal({
    title: '节点收益分红',
    content: `你持有 ${certs} 张数字资产凭证，本期可参与分红 ¥${dividend}。\n\n集体经营收益的 30% 按全${store.orgLabel()}凭证占比分配，用数字人民币 / 平台积分结算（不发币、不承诺固定收益）。`,
    confirmText: '知道了', showCancel: false,
  });

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-eyebrow">🔗 链上数字资产凭证（长安链）</Text>
        <View className="hero-main"><Text className="hero-num">{certs}</Text><Text className="hero-unit">张凭证</Text></View>
        <Text className="hero-sub">累计 {cv} 贡献值 · 每满 1000 生成 1 张</Text>
        <View className="prog"><View className="prog-fill" style={{ width: `${progress / 10}%` }} /></View>
        <Text className="hero-next">距下一张凭证还需 {1000 - progress} 贡献值</Text>
      </View>
      <ScrollView scrollY className="body">
        <View className="income" onClick={claim}>
          <View className="income-l"><Text className="income-k">本期可分红（节点收益）</Text><Text className="income-v">¥{dividend}</Text><Text className="income-s">数字人民币 / 积分结算 · 点击查看</Text></View>
          <Text className="income-arrow">›</Text>
        </View>
        <Text className="sec">我的数字资产凭证</Text>
        {certs === 0 ? <View className="empty"><Text className="empty-t">还没有凭证，继续积累贡献值吧</Text></View> :
          list.map((c, i) => (
            <View key={i} className="cert">
              <View className="cert-icon"><Text style={{ fontSize: '36rpx' }}>🎫</Text></View>
              <View className="cert-info"><Text className="cert-no">{c.no}</Text><Text className="cert-meta">凭证价值 {c.cv} 贡献值 · {c.date} · 🔗已上链</Text></View>
            </View>
          ))
        }
        <View className="law-card">
          <Text className="law-t">⚖️ 合规说明</Text>
          <Text className="law-d">数字资产凭证是个人社会贡献的链上存证，定性为：非股权、非虚拟货币、不承诺固定收益。分红来自集体经营性收益，按凭证占比分配，用数字人民币 / 平台积分结算。</Text>
        </View>
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
