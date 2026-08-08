import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

interface Groupon { name: string; price: number; orig: number; }
interface Restaurant {
  id: number; name: string; emoji: string; star: number; price: number;
  distance: string; signature: string; sales: number; tags: string[];
  services: string[]; groupon?: Groupon[];
}

// 周边餐饮商户（村镇农家 + 社区食堂 + 特色小吃）
const RESTAURANTS: Restaurant[] = [
  { id: 1, name: '范庄老灶农家院', emoji: '🍲', star: 4.9, price: 45, distance: '0.8km', signature: '柴火炖笨鸡', sales: 1280, tags: ['农家菜', '柴火灶'], services: ['团购', '堂食', '订餐'], groupon: [{ name: '4人柴火套餐', price: 158, orig: 220 }, { name: '双人农家小炒', price: 79, orig: 108 }] },
  { id: 2, name: '华明羊汤馆', emoji: '🍜', star: 4.8, price: 25, distance: '1.2km', signature: '原汁羊肉汤', sales: 960, tags: ['汤面', '清真'], services: ['外卖', '堂食'], groupon: [{ name: '羊汤+烧饼双人餐', price: 39, orig: 56 }] },
  { id: 3, name: '赤土魏记卤味', emoji: '🍖', star: 4.8, price: 35, distance: '0.5km', signature: '秘制扣肉', sales: 1520, tags: ['卤味', '熟食'], services: ['团购', '外卖'], groupon: [{ name: '卤味拼盘（6样）', price: 68, orig: 98 }] },
  { id: 4, name: '社区长者食堂', emoji: '🍱', star: 4.7, price: 12, distance: '0.3km', signature: '营养助老套餐', sales: 2100, tags: ['社区食堂', '助老'], services: ['堂食', '订餐', '外卖'] },
  { id: 5, name: '胡张庄葡萄庄园', emoji: '🍇', star: 4.7, price: 80, distance: '2.5km', signature: '葡萄宴+采摘', sales: 680, tags: ['农庄', '采摘'], services: ['团购', '堂食', '订餐'], groupon: [{ name: '采摘+农家宴（4人）', price: 198, orig: 280 }] },
  { id: 6, name: '军粮城铁锅炖', emoji: '🍳', star: 4.6, price: 55, distance: '1.8km', signature: '大铁锅炖江鱼', sales: 840, tags: ['炖菜', '聚餐'], services: ['团购', '堂食'], groupon: [{ name: '铁锅炖 4-6 人餐', price: 238, orig: 328 }] },
  { id: 7, name: '小沙窝炭火烧烤', emoji: '🍢', star: 4.5, price: 40, distance: '1.5km', signature: '炭火羊肉串', sales: 1120, tags: ['烧烤', '夜宵'], services: ['外卖', '堂食'] },
  { id: 8, name: '桂顺斋点心铺', emoji: '🥮', star: 4.6, price: 20, distance: '0.9km', signature: '现烤桃酥', sales: 1380, tags: ['点心', '老字号'], services: ['团购', '外卖'], groupon: [{ name: '中式糕点礼盒', price: 39, orig: 58 }] },
];

const TABS: [string, string][] = [['recommend', '🔥 推荐'], ['groupon', '🎫 团购'], ['takeout', '🛵 外卖'], ['dinein', '🍽️ 堂食'], ['rank', '🏆 排名']];

export default function FoodPage() {
  const [tab, setTab] = useState('recommend');
  const [sel, setSel] = useState<Restaurant | null>(null);

  const list = tab === 'groupon' ? RESTAURANTS.filter(r => r.services.includes('团购'))
    : tab === 'takeout' ? RESTAURANTS.filter(r => r.services.includes('外卖'))
    : tab === 'dinein' ? RESTAURANTS.filter(r => r.services.includes('堂食'))
    : tab === 'rank' ? [...RESTAURANTS].sort((a, b) => b.star - a.star || b.sales - a.sales)
    : [...RESTAURANTS].sort((a, b) => b.sales - a.sales);

  const act = (r: Restaurant, type: string) => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: type, showCancel: false, confirmText: '知道了',
      content: `（演示）已为你在「${r.name}」发起${type}。\n\n同城美食消费同样计入社会贡献值（已到账 +5），支持本地商户。`,
      success: () => store.addContributionAuto('custom',`同城消费·${type}`, 5),
    });
  };
  const buyGroupon = (r: Restaurant, g: Groupon) => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: '团购下单', showCancel: false, confirmText: `¥${g.price} 抢购`,
      content: `${r.name}\n「${g.name}」团购价 ¥${g.price}（原价 ¥${g.orig}）\n\n（演示）下单成功，到店出示核销码即可，社会贡献值（已到账 +5）。`,
      success: () => store.addContributionAuto('custom','同城消费·美食团购', 5),
    });
  };

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">🍜 周边美食</Text>
        <Text className="hero-s">📍 天津东丽·华明街道 · 同城好味 · 团购 / 外卖 / 堂食 / 订餐一站享</Text>
      </View>
      <View className="tabs">
        {TABS.map(([k, l]) => (
          <View key={k} className={`tab ${tab === k ? 'tab-on' : ''}`} onClick={() => setTab(k)}>
            <Text className="tab-t">{l}</Text>
          </View>
        ))}
      </View>
      <ScrollView scrollY className="body">
        {tab === 'rank' && <View className="rank-tip"><Text className="rank-tip-t">🏆 同城美食榜 · 按口碑评分 + 人气综合排名</Text></View>}
        {list.map((r, idx) => (
          <View key={r.id} className="card" onClick={() => setSel(r)}>
            {tab === 'rank' && <Text className={`rank-no ${idx < 3 ? 'rank-top' : ''}`}>{idx + 1}</Text>}
            <View className="thumb"><Text className="thumb-e">{r.emoji}</Text></View>
            <View className="info">
              <Text className="name">{r.name}</Text>
              <Text className="meta">⭐{r.star} · 人均¥{r.price} · {r.distance} · 已售{r.sales}</Text>
              <Text className="sig">招牌：{r.signature}</Text>
              <View className="tags">
                {r.services.map(s => <Text key={s} className="svc">{s}</Text>)}
                {r.groupon && r.groupon[0] && <Text className="gp">团购¥{r.groupon[0].price}起</Text>}
              </View>
            </View>
          </View>
        ))}
        <View style={{ height: '40rpx' }} />
      </ScrollView>

      {sel && (
        <View className="mask" onClick={() => setSel(null)}>
          <View className="sheet" onClick={(e) => e.stopPropagation()}>
            <View className="sheet-head">
              <Text className="sheet-e">{sel.emoji}</Text>
              <View>
                <Text className="sheet-name">{sel.name}</Text>
                <Text className="sheet-meta">⭐{sel.star} · 人均¥{sel.price} · {sel.distance} · 已售{sel.sales}</Text>
              </View>
            </View>
            <Text className="sheet-sig">🍽️ 招牌：{sel.signature} · {sel.tags.join(' / ')}</Text>

            {sel.groupon && sel.groupon.length > 0 && (
              <View className="gp-sec">
                <Text className="gp-title">🎫 团购套餐</Text>
                {sel.groupon.map(g => (
                  <View key={g.name} className="gp-row" onClick={() => buyGroupon(sel, g)}>
                    <View className="gp-l"><Text className="gp-name">{g.name}</Text><Text className="gp-orig">原价 ¥{g.orig}</Text></View>
                    <View className="gp-buy"><Text className="gp-price">¥{g.price}</Text><Text className="gp-cta">抢购</Text></View>
                  </View>
                ))}
              </View>
            )}

            <View className="ops">
              {sel.services.includes('外卖') && <View className="op op-takeout" onClick={() => act(sel, '外卖下单')}><Text className="op-t">🛵 外卖下单</Text></View>}
              {sel.services.includes('堂食') && <View className="op op-dinein" onClick={() => act(sel, '堂食订座')}><Text className="op-t">🍽️ 堂食订座</Text></View>}
              {sel.services.includes('订餐') && <View className="op op-order" onClick={() => act(sel, '预订订餐')}><Text className="op-t">📞 预订订餐</Text></View>}
            </View>
            <Text className="sheet-note">💡 同城美食消费计入社会贡献值，支持本地商户、助力共同富裕</Text>
          </View>
        </View>
      )}
    </View>
  );
}
