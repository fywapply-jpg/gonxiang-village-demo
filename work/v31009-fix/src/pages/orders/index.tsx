import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, Button, ScrollView } from '@tarojs/components';
import { store, Order } from '../../store';
import { payOrder } from '../../utils/pay';
import { VILLAGE_STORE } from '../../config/region';
import { backendApi, BACKEND_SYNC_ENABLED, BackendOrder } from '../../utils/backend';
import './index.css';

const TABS = ['全部', '待付款', '待发货', '配送中', '已签收'];

const STATUS_COLOR: Record<string, string> = {
  '待付款': '#f59e0b', '待发货': '#3b82f6',
  '配送中': '#8b5cf6', '已签收': '#16a34a', '退款中': '#ef4444', '已退款': '#9ca3af',
  '已取消': '#9ca3af',
};

const REVIEW_TAGS = ['质量好', '新鲜实惠', '包装完好', '发货快', '服务态度好', '值得回购'];
const API_STATUS: Record<string, string> = {
  PENDING_PAYMENT: '待付款', PAID: '待发货', SHIPPED: '配送中',
  DELIVERED: '已签收', REFUNDING: '退款中', REFUNDED: '已退款', CANCELLED: '已取消',
};
const toBackendOrder = (order: BackendOrder): Order => ({
  id: order.id,
  date: String(order.createdAt || '').slice(0, 16),
  status: API_STATUS[order.status] || order.status,
  items: (order.items || []).map((item: any) => ({
    name: item.productName, qty: Number(item.quantity), price: Number(item.unitPriceCents) / 100,
  })),
  total: Number(order.totalCents || 0) / 100,
  address: '订单收货信息',
  shop: order.merchantName || '供享村社',
  logistics: [],
});

export default function OrdersPage() {
  const [tab, setTab] = useState('全部');
  const [orders, setOrders] = useState<Order[]>(() => BACKEND_SYNC_ENABLED ? [] : store.getOrders());
  // 评价弹窗：正在评价的订单 + 商品分 / 商家分 / 好评标签
  const [reviewing, setReviewing] = useState<Order | null>(null);
  const [star, setStar] = useState(5);
  const [shopStar, setShopStar] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [payingId, setPayingId] = useState('');

  useDidShow(() => {
    if (BACKEND_SYNC_ENABLED) {
      backendApi.orders.list()
        .then(rows => setOrders(rows.map(toBackendOrder)))
        .catch(() => Taro.showToast({ title: '订单同步失败', icon: 'none' }));
      return;
    }
    store.initMockDataIfEmpty && store.initMockDataIfEmpty?.();
    setOrders(store.getOrders());
  });

  const filtered = tab === '全部' ? orders : orders.filter(o => o.status === tab);

  const confirm = (id: string) => {
    if (BACKEND_SYNC_ENABLED) {
      Taro.showModal({
        title: '确认收货', content: '确认已收到商品？',
        success: res => {
          if (!res.confirm) return;
          backendApi.orders.confirmReceipt(id)
            .then(() => backendApi.orders.list())
            .then(rows => setOrders(rows.map(toBackendOrder)))
            .then(() => Taro.showToast({ title: '已确认收货', icon: 'success' }))
            .catch(error => Taro.showToast({ title: error.message || '确认收货失败', icon: 'none' }));
        },
      });
      return;
    }
    Taro.showModal({
      title: '确认收货', content: '确认已收到商品？',
      success: (res) => {
        if (res.confirm) { store.updateOrder(id, { status: '已签收' }); store.confirmOrderContrib(id); setOrders(store.getOrders()); Taro.showToast({ title: '已确认收货 · 消费贡献值已到账', icon: 'success' }); }
      }
    });
  };

  const payPending = async (order: Order) => {
    if (BACKEND_SYNC_ENABLED) {
      Taro.showToast({ title: '微信支付验签接入前不可付款', icon: 'none' });
      return;
    }
    if (payingId || order.status !== '待付款') return;
    if (order.businessStage === '待成团') {
      Taro.showToast({ title: '人数尚未达标，成团后才能付款', icon: 'none' });
      return;
    }
    setPayingId(order.id);
    const result = await payOrder({ orderNo: order.id, amount: order.total, description: `供享村社 · ${order.shop || '订单支付'}` });
    if (!result.ok) {
      setPayingId('');
      Taro.showToast({ title: result.reason === 'cancel' ? '已取消支付' : (result.message || '支付失败，请重试'), icon: 'none' });
      return;
    }
    store.updateOrder(order.id, { status: '待发货' });
    store.addOrderContrib(order.id, 'career', `消费助农·${order.shop || '平台订单'}支付`, 5 + Math.floor(order.total / 100) * 5);
    setOrders(store.getOrders());
    setPayingId('');
    Taro.showToast({ title: '支付成功 · 等待发货', icon: 'success' });
  };

  const refund = (id: string) => {
    const order = orders.find(o => o.id === id);
    if (!order || order.status === '已退款' || order.status === '退款中') return;
    Taro.showModal({
      title: '申请退款', content: '提交后由对应商家处理；平台全程留痕，商家超过48小时未处理将自动转平台客服。',
      success: (res) => {
        if (res.confirm) {
          if (BACKEND_SYNC_ENABLED) {
            backendApi.orders.requestRefund(id, '买家申请退款')
              .then(() => backendApi.orders.list())
              .then(rows => setOrders(rows.map(toBackendOrder)))
              .then(() => Taro.showToast({ title: '退款申请已提交', icon: 'none' }))
              .catch(error => Taro.showToast({ title: error.message || '退款申请失败', icon: 'none' }));
            return;
          }
          store.updateOrder(id, {
            status: '退款中',
            logistics: [{ time: '刚刚', desc: '买家已提交退款申请，等待商家处理' }, ...(order.logistics || [])],
          });
          setOrders(store.getOrders());
          Taro.showToast({ title: '退款申请已提交 · 等待商家处理', icon: 'none' });
        }
      }
    });
  };

  const cancelPending = (id: string) => {
    if (BACKEND_SYNC_ENABLED) {
      Taro.showModal({
        title: '取消订单', content: '该订单尚未付款，取消后不会扣款。',
        success: res => {
          if (!res.confirm) return;
          backendApi.orders.cancel(id)
            .then(() => backendApi.orders.list())
            .then(rows => setOrders(rows.map(toBackendOrder)))
            .then(() => Taro.showToast({ title: '订单已取消', icon: 'none' }))
            .catch(error => Taro.showToast({ title: error.message || '取消订单失败', icon: 'none' }));
        },
      });
      return;
    }
    const order = store.getOrders().find(o => o.id === id);
    if (!order || order.status !== '待付款') return;
    Taro.showModal({
      title: '取消订单', content: '该订单尚未付款，取消后不会扣款。',
      success: (res) => {
        if (!res.confirm) return;
        store.updateOrder(id, { status: '已取消' });
        // 未付款取消必须释放团购人数 / 鲜食库存，避免“幽灵占位”和假售罄。
        if (order.source === '惠民团购' && order.businessStage === '待成团' && order.campaignId) {
          const gid = Number(order.campaignId.replace('GT-CAMPAIGN-', ''));
          const groups = store.getGrouponItems() || [];
          store.setGrouponItems(groups.map((g: any) => g.id === gid ? { ...g, joined: Math.max(0, g.joined - 1) } : g));
        }
        if (order.source === '鲜食预售' && order.campaignId) {
          const pid = Number(order.campaignId.replace('YS-CAMPAIGN-', ''));
          const items = store.getPresaleItems() || [];
          store.setPresaleItems(items.map((it: any) => it.id === pid ? { ...it, ordered: Math.max(0, it.ordered - 1) } : it));
        }
        setOrders(store.getOrders());
        Taro.showToast({ title: '订单已取消 · 名额已释放', icon: 'none' });
      },
    });
  };

  const openReview = (order: Order) => {
    if (BACKEND_SYNC_ENABLED) {
      Taro.showToast({ title: '评价接口尚未开放', icon: 'none' });
      return;
    }
    setReviewing(order); setStar(5); setShopStar(5); setTags([]);
  };
  const toggleTag = (t: string) => setTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const submitReview = () => {
    if (!reviewing) return;
    if (BACKEND_SYNC_ENABLED) {
      Taro.showToast({ title: '评价接口尚未开放', icon: 'none' });
      return;
    }
    store.updateOrder(reviewing.id, { reviewd: true, review: { star, shopStar, text: tags.join('、') || '好评' } });
    store.addContribution('custom', '诚信互评·订单点评', 5); // 社会贡献值
    setOrders(store.getOrders());
    setReviewing(null);
    Taro.showToast({ title: '评价成功 · 贡献值 +5（待审核）', icon: 'success' });
  };

  const Stars = ({ v, on }: { v: number; on: (n: number) => void }) => (
    <View style={{ display: 'flex', gap: '6rpx' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Text key={i} style={{ fontSize: '46rpx', lineHeight: 1 }} onClick={() => on(i)}>{i <= v ? '⭐' : '☆'}</Text>
      ))}
    </View>
  );

  return (
    <View className="page">
      {/* Tab */}
      <ScrollView scrollX className="tab-scroll">
        {TABS.map(t => (
          <View key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            <Text>{t}</Text>
          </View>
        ))}
      </ScrollView>

      {/* 订单列表 */}
      <ScrollView scrollY className="list">
        {filtered.length === 0 ? (
          <View className="empty">
            <Text className="empty-icon">📦</Text>
            <Text className="empty-text">{tab === '全部' ? '暂无订单' : `暂无${tab}订单`}</Text>
            <Button style={{ marginTop: '8rpx', background: '#16a34a', color: '#fff', borderRadius: '100rpx', fontSize: '26rpx', padding: '0 48rpx', height: '76rpx', lineHeight: '76rpx', border: 'none' }} onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}>去首页逛逛</Button>
          </View>
        ) : (
          filtered.map(order => (
            <View key={order.id} className="order-card">
              <View className="order-header">
                <Text className="order-id">{order.shop ? `🏪 ${order.shop}` : order.id}</Text>
                <Text className="order-status" style={{ color: STATUS_COLOR[order.status] || '#374151' }}>{order.status}</Text>
              </View>

              {order.items.map((item, i) => (
                <View key={i} className="order-item">
                  <Text className="item-name">{item.name}</Text>
                  <Text className="item-info">× {item.qty}　¥{item.price}</Text>
                </View>
              ))}

              <View className="order-footer">
                <Text className="order-date">{order.date}</Text>
                <Text className="order-total">合计 <Text className="price-red">¥{order.total.toFixed(2)}</Text></Text>
              </View>
              {order.businessStage && (
                <View style={{ background: order.businessStage === '待成团' ? '#fff7ed' : '#eff6ff', borderRadius: '10rpx', padding: '10rpx 14rpx', marginTop: '10rpx' }}>
                  <Text style={{ fontSize: '21rpx', color: order.businessStage === '待成团' ? '#c2410c' : '#1d4ed8' }}>
                    {order.source === '惠民团购' ? '🧺' : '🍓'} {order.businessStage}
                  </Text>
                </View>
              )}

              {/* 已评价：展示打分 */}
              {order.reviewd && order.review && (
                <View style={{ background: '#f0fdf4', borderRadius: '12rpx', padding: '14rpx 18rpx', marginTop: '12rpx' }}>
                  <Text style={{ fontSize: '22rpx', color: '#15803d' }}>已评价 · 商品 ⭐{order.review.star} · 商家口碑 ⭐{order.review.shopStar}{order.review.text ? ` · ${order.review.text}` : ''}</Text>
                </View>
              )}

              {/* 操作按钮 */}
              <View className="action-row">
                {order.status === '待付款' && (
                  <>
                    <Button className="btn-sm btn-outline" onClick={() => cancelPending(order.id)}>取消订单</Button>
                    <Button className="btn-sm btn-primary" loading={payingId === order.id} disabled={!!payingId || order.businessStage === '待成团'} onClick={() => payPending(order)}>{order.businessStage === '待成团' ? '等待成团' : '去支付'}</Button>
                  </>
                )}
                {(order.status === '配送中' || order.status === '已签收') && (
                  <Button className="btn-sm btn-outline" onClick={() => Taro.navigateTo({ url: `/pages/logistics/index?id=${order.id}` })}>查看物流</Button>
                )}
                {order.status === '配送中' && (
                  <Button className="btn-sm btn-outline" onClick={() => confirm(order.id)}>确认收货</Button>
                )}
                {order.status === '已签收' && !order.reviewd && (
                  <Button className="btn-sm btn-primary" onClick={() => openReview(order)}>评价</Button>
                )}
                {(order.status === '待发货' || order.status === '配送中') && (
                  <Button className="btn-sm btn-danger" onClick={() => refund(order.id)}>退款</Button>
                )}
                {order.status === '退款中' && (
                  <Text style={{ fontSize: '22rpx', color: '#ef4444' }}>退款审核中 · 最迟48小时处理</Text>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* 评价弹窗 */}
      {reviewing && (
        <View style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setReviewing(null)}>
          <View style={{ width: '84%', background: '#fff', borderRadius: '24rpx', padding: '32rpx' }} onClick={(e) => e.stopPropagation()}>
            <Text style={{ display: 'block', fontSize: '30rpx', fontWeight: 800, color: '#1f2937', textAlign: 'center' }}>评价订单</Text>
            <Text style={{ display: 'block', fontSize: '22rpx', color: '#9ca3af', textAlign: 'center', marginTop: '6rpx' }}>{reviewing.shop || VILLAGE_STORE}</Text>

            <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '28rpx' }}>
              <Text style={{ fontSize: '26rpx', color: '#374151' }}>商品质量</Text>
              <Stars v={star} on={setStar} />
            </View>
            <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20rpx' }}>
              <Text style={{ fontSize: '26rpx', color: '#374151' }}>商家口碑</Text>
              <Stars v={shopStar} on={setShopStar} />
            </View>

            <Text style={{ display: 'block', fontSize: '24rpx', color: '#374151', marginTop: '26rpx', marginBottom: '12rpx' }}>选择评价（可多选）</Text>
            <View style={{ display: 'flex', flexWrap: 'wrap', gap: '14rpx' }}>
              {REVIEW_TAGS.map(t => (
                <View key={t} style={{ padding: '10rpx 24rpx', borderRadius: '100rpx', background: tags.includes(t) ? '#16a34a' : '#f3f4f6' }} onClick={() => toggleTag(t)}>
                  <Text style={{ fontSize: '23rpx', color: tags.includes(t) ? '#fff' : '#6b7280' }}>{t}</Text>
                </View>
              ))}
            </View>

            <View style={{ display: 'flex', gap: '16rpx', marginTop: '32rpx' }}>
              <View style={{ flex: 1, textAlign: 'center', padding: '20rpx', borderRadius: '999rpx', background: '#f3f4f6' }} onClick={() => setReviewing(null)}><Text style={{ fontSize: '27rpx', color: '#374151' }}>取消</Text></View>
              <View style={{ flex: 1, textAlign: 'center', padding: '20rpx', borderRadius: '999rpx', background: '#16a34a' }} onClick={submitReview}><Text style={{ fontSize: '27rpx', color: '#fff', fontWeight: 700 }}>提交评价</Text></View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
