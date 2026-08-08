import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

interface Service { id: number; name: string; emoji: string; price: string; desc: string; tags: string[]; }

// 便民维修·家政服务项（村民 / 居民共用同一批服务，仅运营方文案不同）
const SERVICES: Service[] = [
  { id: 1, name: '水电维修', emoji: '🔧', price: '¥50 起/次', desc: '灯具、开关、插座、水龙头、下水、跳闸断电等日常水电故障上门维修，常用配件随车带。', tags: ['水电', '急修'] },
  { id: 2, name: '家电维修', emoji: '📺', price: '¥60 起/次', desc: '电视、冰箱、洗衣机、空调、热水器、油烟机等家电检修，先检测报价、同意再修。', tags: ['家电', '检修'] },
  { id: 3, name: '管道疏通', emoji: '🚿', price: '¥80 起/次', desc: '马桶、地漏、厨房下水、主管道堵塞疏通，专业设备、不通不收费。', tags: ['疏通', '管道'] },
  { id: 4, name: '开锁换锁', emoji: '🔑', price: '¥50 起/次', desc: '门锁反锁、钥匙丢失开锁，换普通锁/防盗锁/智能锁。凭身份证及房产证明登记后作业。', tags: ['开锁', '换锁'] },
  { id: 5, name: '家庭保洁', emoji: '🧹', price: '¥30/小时', desc: '日常打扫、擦玻璃、厨卫深度清洁、开荒保洁，自带专业工具与环保清洁剂。', tags: ['保洁', '钟点'] },
  { id: 6, name: '月嫂/育儿嫂', emoji: '👶', price: '¥8800 起/月', desc: '持证月嫂、育儿嫂上门，产妇护理、宝宝照料、辅食制作，均经健康证及背景核验。', tags: ['母婴', '持证'] },
  { id: 7, name: '家具安装', emoji: '🛠️', price: '¥40 起/次', desc: '衣柜、床、桌椅、晾衣架、窗帘杆、灯具安装及各类家具拆装搬移。', tags: ['安装', '拆装'] },
  { id: 8, name: '玻璃清洗', emoji: '🪟', price: '¥100 起/次', desc: '窗户玻璃、玻璃门、高层外窗专业清洗，安全绳作业、擦净无水痕。', tags: ['清洗', '玻璃'] },
];

const SLOTS = ['上午 9:00–12:00', '下午 13:00–17:00', '晚上 18:00–21:00'];

export default function RepairPage() {
  const [community, setCommunity] = useState(store.isCommunity());
  useDidShow(() => setCommunity(store.isCommunity()));
  const team = community ? '社区便民服务队' : '乡村便民服务队';
  const org = community ? '社区' : '乡村';
  const admin = community ? '居委会' : '村委会';
  const [sel, setSel] = useState<Service | null>(null);

  const book = (s: Service, slot: string) => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: '预约上门', showCancel: false, confirmText: '确认预约',
      content: `${s.name}\n上门时段：${slot}\n参考价：${s.price}\n服务由${team}（${admin}审核持证师傅）上门。\n\n（演示）已预约，师傅会电话联系你确认时间。参与便民服务计社会贡献值（已到账 +3）。`,
      success: () => {
        store.addContributionAuto('custom', '便民维修·' + s.name, 3);
        Taro.showToast({ title: '已预约，师傅会电话联系（演示）', icon: 'none', duration: 2500 });
      },
    });
  };

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">🔧 {team}</Text>
        <Text className="hero-s">{org}便民维修 · 家政上门 · {admin}审核持证师傅 · 明码标价 · 党员志愿者优先困难户</Text>
      </View>
      <ScrollView scrollY className="body">
        <View className="tip"><Text className="tip-t">🛠️ 师傅均经{admin}审核、持证上门，价格公开透明；孤寡老人、残疾人等困难户由党员志愿者优先服务。</Text></View>
        {SERVICES.map(s => (
          <View key={s.id} className="card" onClick={() => setSel(s)}>
            <View className="thumb"><Text className="thumb-e">{s.emoji}</Text></View>
            <View className="info">
              <Text className="name">{s.name}</Text>
              <Text className="desc">{s.desc}</Text>
              <View className="tags">{s.tags.map(g => <Text key={g} className="tag">{g}</Text>)}</View>
              <Text className="price">{s.price}</Text>
            </View>
          </View>
        ))}
        <View style={{ height: '40rpx' }} />
      </ScrollView>

      {sel && (
        <View className="mask" onClick={() => setSel(null)}>
          <View className="sheet" onClick={e => e.stopPropagation()}>
            <Text className="sheet-e">{sel.emoji}</Text>
            <Text className="sheet-name">{sel.name}</Text>
            <Text className="sheet-meta">{team} · 参考价 {sel.price}</Text>
            <View className="hl"><Text className="hl-desc">{sel.desc}</Text></View>
            <View className="badges">
              <Text className="badge">✅ {admin}审核</Text>
              <Text className="badge">🪪 持证上门</Text>
              <Text className="badge">💰 明码标价</Text>
              <Text className="badge">🎗️ 党员优先困难户</Text>
            </View>
            <Text className="sheet-label">选择上门时段预约</Text>
            {SLOTS.map(t => (
              <View key={t} className="time-row" onClick={() => book(sel, t)}>
                <Text className="time-t">{t}</Text>
                <Text className="time-cta">预约上门 ›</Text>
              </View>
            ))}
            <Text className="sheet-foot">💡 师傅经{admin}审核、持证上门、明码标价；参与便民服务计社会贡献值。</Text>
          </View>
        </View>
      )}
    </View>
  );
}
