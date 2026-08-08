import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store, Order } from '../../store';
import { DEMO_ADDRESS, VILLAGE_FULL } from '../../config/region';
import './index.css';

type GroupStatus = '开团中' | '已成团' | '已截单' | '已流团';
interface Group {
  id: number;
  name: string;
  emoji: string;
  marketPrice: number;
  groupPrice: number;
  joined: number;
  need: number;
  hours: string;
  supplier: string;
  origin: string;
  pickup: string;
  limit: number;
  status: GroupStatus;
}

const INIT: Group[] = [
  { id: 1, name: '统采复合肥 40kg', emoji: '🧪', marketPrice: 135, groupPrice: 108, joined: 29, need: 30, hours: '剩 8 小时', supplier: '天津市农资集团东丽配送中心', origin: '天津市东丽区华明街道', pickup: '天津市东丽区华明街道范庄村服务站', limit: 3, status: '开团中' },
  { id: 2, name: '米面油惠民礼包', emoji: '🛢️', marketPrice: 158, groupPrice: 128, joined: 46, need: 50, hours: '剩 1 天', supplier: '天津市东丽区供销合作社', origin: '天津市东丽区', pickup: '村社服务站统一自提', limit: 2, status: '开团中' },
  { id: 3, name: '灵宝苹果 10斤', emoji: '🍎', marketPrice: 59, groupPrice: 39, joined: 88, need: 80, hours: '已成团', supplier: '河南省三门峡市灵宝市果业合作社', origin: '河南省三门峡市灵宝市', pickup: '成团后冷链配送到村', limit: 5, status: '已成团' },
  { id: 4, name: '儿童文具开学礼包', emoji: '✏️', marketPrice: 88, groupPrice: 59, joined: 12, need: 40, hours: '剩 3 天', supplier: '天津市东丽区教育用品联合采购中心', origin: '天津市东丽区', pickup: '社区服务站自提', limit: 2, status: '开团中' },
];

const stamp = () => {
  const d = new Date();
  const p2 = (n: number) => n < 10 ? `0${n}` : `${n}`;
  return `${d.getMonth() + 1}月${d.getDate()}日 ${p2(d.getHours())}:${p2(d.getMinutes())}`;
};

export default function GrouponPage() {
  const isAdmin = store.canManageVillage();
  const [list, setList] = useState<Group[]>(() => (store.getGrouponItems() as Group[] | null) || INIT);
  useDidShow(() => setList((store.getGrouponItems() as Group[] | null) || INIT));

  const save = (next: Group[]) => { setList(next); store.setGrouponItems(next); };
  const campaignId = (id: number) => `GT-CAMPAIGN-${id}`;
  const myCount = (g: Group) => store.getOrders().filter(o =>
    o.campaignId === campaignId(g.id) && o.status !== '已取消' && o.status !== '已退款'
  ).reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.qty, 0), 0);

  const markFormed = (g: Group) => {
    const cid = campaignId(g.id);
    store.setOrders(store.getOrders().map(o => o.campaignId === cid && o.status === '待付款'
      ? { ...o, businessStage: '已成团待付款', logistics: [{ time: '刚刚', desc: '人数达标，团购已成团，可以支付' }, ...(o.logistics || [])] }
      : o
    ));
  };

  const join = (g: Group) => {
    if (!store.requireBound()) return;
    if (g.status !== '开团中') {
      Taro.showToast({ title: g.status === '已成团' ? '本团已成团，请等待下一团' : '本团已停止报名', icon: 'none' });
      return;
    }
    if (myCount(g) >= g.limit) {
      Taro.showToast({ title: `每人限购 ${g.limit} 份，你已达到上限`, icon: 'none' });
      return;
    }
    Taro.showModal({
      title: '确认参团',
      content: `${g.name}\n团购价：¥${g.groupPrice}（市场价 ¥${g.marketPrice}）\n供应方：${g.supplier}\n提货：${g.pickup}\n\n先锁定名额，人数达标后再付款；未成团自动取消，不扣款。`,
      confirmText: '锁定名额',
      success: (res) => {
        if (!res.confirm) return;
        const joined = g.joined + 1;
        const formed = joined >= g.need;
        const next = list.map(x => x.id === g.id ? { ...x, joined, status: formed ? '已成团' as GroupStatus : x.status, hours: formed ? '刚刚成团' : x.hours } : x);
        save(next);
        const order: Order = {
          id: `GT${Date.now()}`,
          date: stamp(),
          status: '待付款',
          items: [{ name: g.name, qty: 1, price: g.groupPrice }],
          total: g.groupPrice,
          address: DEMO_ADDRESS,
          shop: '惠民团购',
          method: '自提',
          source: '惠民团购',
          campaignId: campaignId(g.id),
          businessStage: formed ? '已成团待付款' : '待成团',
          logistics: [{ time: '刚刚', desc: formed ? '参团成功且人数达标，已成团' : `参团成功，当前 ${joined}/${g.need} 人` }],
        };
        store.addOrder(order);
        if (formed) markFormed(g);
        Taro.showToast({ title: formed ? '成团成功 · 可去支付' : `参团成功 · 还差 ${g.need - joined} 人`, icon: 'none' });
      },
    });
  };

  const closeGroup = (g: Group) => {
    if (!isAdmin || g.status !== '开团中') return;
    const formed = g.joined >= g.need;
    Taro.showModal({
      title: formed ? '确认截单成团' : '人数不足，确认流团',
      content: formed ? '截单后通知全部成员付款，并进入集采履约。' : '流团后所有待付款占位订单自动取消，不产生扣款。',
      success: (res) => {
        if (!res.confirm) return;
        save(list.map(x => x.id === g.id ? { ...x, status: formed ? '已截单' : '已流团', hours: formed ? '已截单' : '未成团' } : x));
        const cid = campaignId(g.id);
        store.setOrders(store.getOrders().map(o => o.campaignId !== cid ? o : formed
          ? { ...o, businessStage: '已成团待付款', logistics: [{ time: '刚刚', desc: '管理员已截单，进入付款与集采阶段' }, ...(o.logistics || [])] }
          : { ...o, status: o.status === '待付款' ? '已取消' : o.status, businessStage: '未成团自动取消', logistics: [{ time: '刚刚', desc: '人数未达标，已流团；未扣款' }, ...(o.logistics || [])] }
        ));
        Taro.showToast({ title: formed ? '已截单并通知付款' : '已流团，订单自动取消', icon: 'none' });
      },
    });
  };

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-title">🧺 惠民团购</Text>
        <Text className="hero-sub">党建引领 · 村社组织 · 集采集配 · 未成团不扣款</Text>
        <View className="hero-chips"><Text>先锁名额</Text><Text>成团再付款</Text><Text>流团自动取消</Text></View>
      </View>
      <View className="rule">
        <Text className="rule-title">本村团购规则</Text>
        <Text className="rule-desc">{VILLAGE_FULL}统一组织，供应商、价格、人数、提货点全程留痕；个人限购，避免囤货倒卖。</Text>
      </View>
      <ScrollView scrollY className="body">
        <View className="wrap">
          {list.map(g => {
            const done = g.status === '已成团' || g.status === '已截单';
            const pct = Math.min(100, Math.round(g.joined / g.need * 100));
            const remain = Math.max(0, g.need - g.joined);
            return (
              <View key={g.id} className="grp">
                <View className="grp-img"><Text className="grp-emoji">{g.emoji}</Text><Text className={`status status-${g.status}`}>{g.status}</Text></View>
                <View className="grp-info">
                  <Text className="grp-name">{g.name}</Text>
                  <Text className="supplier">供货：{g.supplier}</Text>
                  <Text className="supplier">产地：{g.origin}</Text>
                  <View className="grp-price">
                    <Text className="grp-now">¥{g.groupPrice}</Text>
                    <Text className="grp-origin">¥{g.marketPrice}</Text>
                    <Text className="grp-save">省 ¥{g.marketPrice - g.groupPrice}</Text>
                    <Text className="grp-hours">{g.hours}</Text>
                  </View>
                  <View className="bar"><View className="bar-fill" style={{ width: `${pct}%` }} /></View>
                  <Text className="progress-copy">{done ? `已达到成团线 · ${g.joined} 人` : `已团 ${g.joined}/${g.need} 人 · 还差 ${remain} 人`}</Text>
                  <View className="pickup"><Text>📍 {g.pickup}</Text><Text>每人限 {g.limit} 份</Text></View>
                  <View className="grp-foot">
                    <Text className="mine">我已锁 {myCount(g)} 份</Text>
                    {isAdmin && g.status === '开团中' && <View className="admin-btn" onClick={() => closeGroup(g)}><Text>管理截单</Text></View>}
                    <View className={`grp-btn ${g.status !== '开团中' ? 'done' : ''}`} onClick={() => join(g)}>
                      <Text className="grp-btn-t">{g.status === '开团中' ? '锁定名额' : g.status}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
        <View className="bottom-space" />
      </ScrollView>
    </View>
  );
}
