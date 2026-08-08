import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView, Textarea } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

interface Svc { id: number; name: string; emoji: string; desc: string; price: string; }

// 服务项：村民版 / 居民版共用，仅运营方文案按身份切换
const SERVICES: Svc[] = [
  { id: 1, name: '代买代购', emoji: '🛒', desc: '生鲜 / 药品 / 日用品，就近代买送到家', price: '¥5 起' },
  { id: 2, name: '代缴费用', emoji: '💳', desc: '水费 / 电费 / 燃气 / 话费，帮你跑腿代缴', price: '免费代办' },
  { id: 3, name: '证件代办', emoji: '📄', desc: '社保 / 医保 / 居住证等，帮你排队递交', price: '免费帮办' },
  { id: 4, name: '快递代收代寄', emoji: '📦', desc: '快递到点代收，包裹上门代寄', price: '¥2 起' },
  { id: 5, name: '大件搬运代运', emoji: '🚚', desc: '家具家电、粮油大件，帮你搬运代运', price: '¥30 起' },
  { id: 6, name: '打印复印证件拍照', emoji: '🖨️', desc: '材料打印复印、证件照拍摄冲印', price: '¥1 起' },
  { id: 7, name: '大件垃圾代运', emoji: '🗑️', desc: '旧家具、装修垃圾，帮你联系清运', price: '¥20 起' },
  { id: 8, name: '政务事项帮办', emoji: '🧾', desc: '各类政务事项，帮你跑腿代办不用来回跑', price: '免费' },
];

export default function ErrandPage() {
  const [isCom, setIsCom] = useState(store.isCommunity());
  useDidShow(() => setIsCom(store.isCommunity()));
  // 身份两套文案
  const brand = isCom ? '社区代办跑腿' : '乡村代办跑腿';
  const point = isCom ? '社区便民服务站' : '村级便民服务点';
  const operator = isCom ? '居委会' : '村委会';
  const runner = isCom ? '志愿者' : '跑腿员';

  const [sel, setSel] = useState<Svc | null>(null);
  const [demand, setDemand] = useState('');

  const open = (s: Svc) => { setSel(s); setDemand(''); };

  const submit = (s: Svc) => {
    if (!store.requireBound()) return;
    setSel(null);
    store.addContributionAuto('custom', '生活代办·' + s.name, 3);
    Taro.showModal({
      title: '下单成功',
      showCancel: false,
      confirmText: '好的',
      content: `【${s.name}】${s.price}\n${point} 已收到你的需求。\n\n（演示）${operator}安排党员志愿者 / 公益岗${runner}就近接单，会尽快与你联系。参与便民计社会贡献值（已到账 +3）。`,
    });
  };

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">🏃 {brand}</Text>
        <Text className="hero-s">{point} · {operator}主办 · 党员志愿者 + 公益岗跑腿 · 就近快速 · 明码标价</Text>
      </View>

      <View className="notice">
        <Text className="notice-e">❤️</Text>
        <Text className="notice-t">老人、外出务工户免费帮办；党员志愿者、公益岗{runner}就近接单，能代办的绝不让你来回跑。</Text>
      </View>

      <ScrollView scrollY className="body">
        {SERVICES.map(s => (
          <View key={s.id} className="card" onClick={() => open(s)}>
            <View className="thumb"><Text className="thumb-e">{s.emoji}</Text></View>
            <View className="info">
              <Text className="name">{s.name}</Text>
              <Text className="desc">{s.desc}</Text>
            </View>
            <Text className="price">{s.price}</Text>
            <Text className="arrow">›</Text>
          </View>
        ))}
        <View style={{ height: '40rpx' }} />
      </ScrollView>

      {sel && (
        <View className="mask" onClick={() => setSel(null)}>
          <View className="sheet" onClick={e => e.stopPropagation()}>
            <Text className="sheet-e">{sel.emoji}</Text>
            <Text className="sheet-name">{sel.name}</Text>
            <Text className="sheet-desc">{sel.desc}</Text>
            <Text className="sheet-price-tag">{sel.price}</Text>

            <View className="field">
              <Text className="field-l">填写你的需求 / 联系方式（选填）</Text>
              <Textarea
                className="field-i"
                placeholder={`例如：帮买 3 斤鸡蛋 + 1 盒感冒药，送到 XX 号；联系电话 138…`}
                value={demand}
                onInput={e => setDemand(e.detail.value)}
              />
            </View>

            <View className="hl">
              <View className="hl-row"><Text className="hl-dot">·</Text><Text className="hl-t">{operator}主办，党员志愿者 + 公益岗{runner}接单，靠谱放心</Text></View>
              <View className="hl-row"><Text className="hl-dot">·</Text><Text className="hl-t">老人、外出务工户免费帮办，就近快速上门</Text></View>
              <View className="hl-row"><Text className="hl-dot">·</Text><Text className="hl-t">{point}统一登记派单，服务留痕可追溯</Text></View>
            </View>

            <View className="sheet-btn" onClick={() => submit(sel)}>
              <Text className="sheet-btn-t">下单 / 预约</Text>
            </View>
            <Text className="sheet-foot">💡 {point}公益便民服务；参与便民计社会贡献值。</Text>
          </View>
        </View>
      )}
    </View>
  );
}
