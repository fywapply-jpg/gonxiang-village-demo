import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import { View, Text, Button } from '@tarojs/components';
import { useState } from 'react';
import { store, Order } from '../../store';
import './index.css';

const STEPS = ['已下单', '待发货', '运输中', '派送中', '已签收'];
const STATUS_STEP: Record<string, number> = {
  '待付款': 0, '待发货': 1, '配送中': 3, '已签收': 4, '退款中': -1,
};

const DEFAULT_COURIER = { name: '等待商家选择配送方式', no: '待生成', tel: '15116900077' };

export default function LogisticsPage() {
  const router = useRouter();
  const orderId = router.params.id || '';
  const [order, setOrder] = useState<Order | null>(null);

  useDidShow(() => {
    const orders = store.getOrders();
    const found = orders.find(o => o.id === orderId) || null;
    setOrder(found);
  });

  if (!order) {
    return (
      <View className="empty-page">
        <Text className="empty-icon">📦</Text>
        <Text className="empty-text">订单不存在</Text>
        <Button className="btn-back" onClick={() => Taro.navigateBack()}>返回</Button>
      </View>
    );
  }

  const step = STATUS_STEP[order.status] ?? 0;
  const logs = order.logistics || [];
  const courier = order.courier || DEFAULT_COURIER;

  const callCourier = () => {
    Taro.makePhoneCall({ phoneNumber: courier.tel }).catch(() => {
      Taro.showToast({ title: `联系电话: ${courier.tel}`, icon: 'none' });
    });
  };

  const copyNo = () => {
    Taro.setClipboardData({
      data: courier.no,
      success: () => Taro.showToast({ title: '运单号已复制', icon: 'success' }),
    });
  };

  return (
    <View className="page">

      {/* 顶部状态卡 */}
      <View className={`status-card ${order.status === '已签收' ? 'card-done' : 'card-active'}`}>
        <Text className="status-icon">
          {order.status === '已签收' ? '✅' : order.status === '配送中' ? '🚚' : '📦'}
        </Text>
        <View className="status-info">
          <Text className="status-main">{order.status}</Text>
          <Text className="status-sub">
            {order.status === '已签收'
              ? `已于 ${logs[0]?.time || '—'} 签收`
              : order.status === '配送中'
              ? (logs[0]?.desc || '快件正在配送中')
              : '等待商家发货'}
          </Text>
        </View>
      </View>

      {/* 快递信息 */}
      <View className="courier-card">
        <View className="courier-row">
          <Text className="courier-label">快递公司</Text>
          <Text className="courier-val">{courier.name}</Text>
        </View>
        <View className="courier-row">
          <Text className="courier-label">运单号码</Text>
          <View className="no-row">
            <Text className="courier-val">{courier.no}</Text>
            <Text className="btn-copy-no" onClick={copyNo}>复制</Text>
          </View>
        </View>
        <View className="courier-row">
          <Text className="courier-label">快递电话</Text>
          <Text className="courier-tel" onClick={callCourier}>{courier.tel} ›</Text>
        </View>
      </View>

      {/* 进度条 */}
      <View className="progress-card">
        {STEPS.map((s, i) => (
          <View key={s} className="progress-item">
            <View className={`progress-dot ${i <= step ? 'dot-done' : 'dot-gray'}`}>
              {i < step ? <Text className="check">✓</Text> : <Text className="dot-num">{i + 1}</Text>}
            </View>
            {i < STEPS.length - 1 && (
              <View className={`progress-line ${i < step ? 'line-done' : 'line-gray'}`} />
            )}
            <Text className={`progress-label ${i === step ? 'label-active' : i < step ? 'label-done' : 'label-gray'}`}>
              {s}
            </Text>
          </View>
        ))}
      </View>

      {/* 物流动态 */}
      <View className="timeline-card">
        <Text className="timeline-title">📍 物流动态</Text>
        {logs.length === 0 ? (
          <Text className="no-logs">暂无物流信息</Text>
        ) : (
          logs.map((log, i) => (
            <View key={i} className={`log-item ${i === 0 ? 'log-latest' : ''}`}>
              <View className="log-dot-wrap">
                <View className={`log-dot ${i === 0 ? 'log-dot-active' : ''}`} />
                {i < logs.length - 1 && <View className="log-line" />}
              </View>
              <View className="log-content">
                <Text className="log-time">{log.time}</Text>
                <Text className="log-desc">{log.desc}</Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* 收货地址 */}
      <View className="addr-card">
        <Text className="addr-title">📮 收货地址</Text>
        <Text className="addr-text">{order.address}</Text>
      </View>

      {/* 订单商品 */}
      <View className="goods-card">
        <Text className="goods-title">🛍️ 订单商品</Text>
        {order.items.map((item, i) => (
          <View key={i} className="goods-row">
            <Text className="goods-name">{item.name}</Text>
            <Text className="goods-info">× {item.qty}　¥{item.price}</Text>
          </View>
        ))}
        <View className="total-row">
          <Text className="total-label">合计</Text>
          <Text className="total-val">¥{order.total.toFixed(2)}</Text>
        </View>
      </View>

      <View style={{ height: '60rpx' }} />
    </View>
  );
}
