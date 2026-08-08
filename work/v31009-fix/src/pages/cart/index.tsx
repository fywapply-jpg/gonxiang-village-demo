import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, Button, ScrollView, Image } from '@tarojs/components';
import { store, CartItem } from '../../store';
import { VILLAGE_STORE } from '../../config/region';
import TabBar from '../../components/TabBar';
import './index.css';

export default function CartPage() {
  const [cart, setCart] = useState<CartItem[]>(() => store.getCart());
  useDidShow(() => setCart(store.getCart()));

  const update = (id: number, spec: string | undefined, delta: number) => {
    const next = cart.map(item => (item.id === id && item.spec === spec)
      ? { ...item, qty: Math.max(0, item.qty + delta) } : item).filter(item => item.qty > 0);
    store.setCart(next);
    setCart(next);
  };

  // 按小卖部分组（供享大集多商家）
  const groups: Record<string, CartItem[]> = {};
  cart.forEach(item => { const s = item.shop || VILLAGE_STORE; (groups[s] = groups[s] || []).push(item); });
  const shops = Object.keys(groups);

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const subtotalOf = (items: CartItem[]) => items.reduce((s, i) => s + i.price * i.qty, 0);

  const checkout = (items: CartItem[]) => {
    if (!items.length) return;
    Taro.navigateTo({ url: `/pages/order-confirm/index?cart=${encodeURIComponent(JSON.stringify(items))}` });
  };
  // 一键支付：按商家自动分单、各自结算
  const payAll = () => {
    if (!store.requireBound()) return;
    if (!cart.length) return;
    Taro.showModal({
      title: '一键支付', confirmText: '确认支付',
      content: `将按 ${shops.length} 家小卖部自动分开结算、各自开单：共 ${count} 件、合计 ¥${total.toFixed(2)}。`,
      success: r => { if (r.confirm) checkout(cart); },
    });
  };

  return (
    <View className="page">
      {cart.length === 0 ? (
        <View className="empty">
          <Text className="empty-icon">🛒</Text>
          <Text className="empty-text">购物车是空的</Text>
          <Button className="btn-go" onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}>去选购</Button>
        </View>
      ) : (
        <>
          {shops.length > 1 && (
            <View style={{ background: '#eff6ff', padding: '16rpx 24rpx' }}>
              <Text style={{ fontSize: '22rpx', color: '#1e40af' }}>🛒 共 {shops.length} 家小卖部 · 可分店结算，或底部「一键支付」按店自动分单</Text>
            </View>
          )}
          <ScrollView scrollY className="list">
            {shops.map(shop => {
              const items = groups[shop];
              const sub = subtotalOf(items);
              return (
                <View key={shop} style={{ background: '#fff', borderRadius: '20rpx', margin: '20rpx', overflow: 'hidden' }}>
                  <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20rpx 24rpx', borderBottom: '1rpx solid #f3f4f6' }}>
                    <Text style={{ fontSize: '26rpx', fontWeight: 700, color: '#1f2937' }}>🏪 {shop}</Text>
                    <Text style={{ fontSize: '21rpx', color: '#9ca3af' }}>{items.length} 种商品</Text>
                  </View>
                  {items.map(item => (
                    <View key={`${item.id}-${item.spec}`} className="cart-item" style={{ margin: 0, borderRadius: 0 }}>
                      <View className="item-img">
                        {item.image
                          ? <Image style={{ width: '100%', height: '100%', borderRadius: '12rpx' }} src={item.image} mode="aspectFill" />
                          : <Text style={{ fontSize: '48rpx' }}>🛍️</Text>}
                      </View>
                      <View className="item-info">
                        <Text className="item-name">{item.name}</Text>
                        {item.spec && <Text className="item-spec">{item.spec}</Text>}
                        <Text className="item-price">¥{item.price}</Text>
                      </View>
                      <View className="item-qty">
                        <View className="qty-btn" onClick={() => update(item.id, item.spec, -1)}><Text>-</Text></View>
                        <Text className="qty-num">{item.qty}</Text>
                        <View className="qty-btn" onClick={() => update(item.id, item.spec, 1)}><Text>+</Text></View>
                      </View>
                    </View>
                  ))}
                  <View style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '20rpx', padding: '16rpx 24rpx', background: '#fafafa' }}>
                    <Text style={{ fontSize: '23rpx', color: '#6b7280' }}>本店小计 <Text style={{ fontSize: '28rpx', fontWeight: 800, color: '#ef4444' }}>¥{sub.toFixed(2)}</Text></Text>
                    <View style={{ background: '#16a34a', borderRadius: '100rpx', padding: '12rpx 32rpx' }} onClick={() => checkout(items)}>
                      <Text style={{ color: '#fff', fontSize: '24rpx', fontWeight: 700 }}>结算本店</Text>
                    </View>
                  </View>
                </View>
              );
            })}
            <View style={{ height: '40rpx' }} />
          </ScrollView>
          <View className="bottom-bar">
            <View className="total-area">
              <Text className="total-label">合计</Text>
              <Text className="total-price">¥{total.toFixed(2)}</Text>
            </View>
            <Button className="btn-checkout" onClick={payAll}>一键支付（{count}件·{shops.length}家）</Button>
          </View>
        </>
      )}
      <TabBar active="cart" />
    </View>
  );
}
