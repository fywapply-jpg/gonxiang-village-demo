import { useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { View, Text, Button, ScrollView, Image } from '@tarojs/components';
import { store } from '../../store';
import { featuredProductById } from '../../config/featured-products';
import './index.css';

export default function ProductPage() {
  const router = useRouter();
  const id = Number(router.params.id || 1);
  const product = featuredProductById(id);

  const [specName, setSpecName] = useState(product.specs[0].name);
  const [qty, setQty] = useState(1);
  const [showTrace, setShowTrace] = useState(false);
  const selectedSpec = product.specs.find(item => item.name === specName) || product.specs[0];

  const addCart = () => {
    if (!store.requireBound()) return;
    if (qty > selectedSpec.stock) { Taro.showToast({ title: '库存不足，请减少数量', icon: 'none' }); return; }
    store.addToCart({ id: product.id, name: product.shortName, price: selectedSpec.price, image: product.image, qty, spec: selectedSpec.name, shop: product.shop });
    Taro.showToast({ title: '已加入购物车', icon: 'success' });
  };

  const buyNow = () => {
    if (!store.requireBound()) return;
    if (qty > selectedSpec.stock) { Taro.showToast({ title: '库存不足，请减少数量', icon: 'none' }); return; }
    const cart = [{ id: product.id, name: product.shortName, price: selectedSpec.price, image: product.image, qty, spec: selectedSpec.name, shop: product.shop }];
    const params = encodeURIComponent(JSON.stringify(cart));
    Taro.navigateTo({ url: `/pages/order-confirm/index?cart=${params}` });
  };

  // 链上存证：点击 TxHash 弹出验证说明（演示示意）
  const verifyTx = () => {
    Taro.showModal({
      title: '链上存证验证',
      content: '交易哈希 0x3a7f...c182\n该记录已上链存证、不可篡改（演示示意）。',
      showCancel: false,
      confirmText: '知道了',
    });
  };

  return (
    <View className="page">
      <ScrollView scrollY className="scroll">
        {/* 商品图 */}
        <View className="product-hero">
          <Image className="product-photo" src={product.image} mode="aspectFit" />
          <View className="hero-tag"><Text className="tag-text">{product.tag}</Text></View>
        </View>

        {/* 基本信息 */}
        <View className="info-card">
          <View className="price-row">
            <Text className="price">¥{selectedSpec.price}</Text>
            <Text className="sold">已售 {product.sales} · 库存 {selectedSpec.stock}</Text>
          </View>
          <Text className="name">{product.name}</Text>
          <Text className="origin">📍 {product.origin}</Text>
          <View className="shop-line">
            <Text className="shop-name">🏪 {product.shop}</Text>
            <Text className="shop-cert">已核验</Text>
          </View>
          <Text className="delivery-line">🚚 {product.delivery}</Text>
        </View>

        <View className="promise-row">
          <Text>✓ 明码实价</Text><Text>✓ 货品相符</Text><Text>✓ 售后可查</Text>
        </View>

        {/* 规格 */}
        <View className="section">
          <Text className="sec-title">规格选择</Text>
          <View className="spec-list">
            {product.specs.map(item => (
              <View key={item.name} className={`spec-item ${specName === item.name ? 'active' : ''}`} onClick={() => { setSpecName(item.name); setQty(1); }}>
                <Text>{item.name} · ¥{item.price}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 数量 */}
        <View className="section qty-section">
          <Text className="sec-title">购买数量</Text>
          <View className="qty-ctrl">
            <View className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}>
              <Text>-</Text>
            </View>
            <Text className="qty-num">{qty}</Text>
            <View className="qty-btn" onClick={() => setQty(q => q + 1)}>
              <Text>+</Text>
            </View>
          </View>
          <Text className="stock-hint">最多可购 {selectedSpec.stock} 件</Text>
        </View>

        {/* 商品描述 */}
        <View className="section">
          <Text className="sec-title">商品介绍</Text>
          <Text className="desc">{product.desc}</Text>
        </View>

        {/* 区块链溯源 */}
        <View className="section">
          <View className="trace-header" onClick={() => setShowTrace(v => !v)}>
            <View className="trace-title-row">
              <Text className="chain-icon">⛓️</Text>
              <Text className="sec-title" style={{ margin: 0 }}>区块链溯源</Text>
              <View className="verified-badge"><Text className="verified-text">已上链</Text></View>
            </View>
            <Text className="trace-arrow">{showTrace ? '∧' : '∨'}</Text>
          </View>
          {showTrace && (
            <View className="trace-list">
              {product.trace.map((t: any, i: number) => (
                <View key={i} className="trace-item">
                  <Text className="trace-step">{t.step}</Text>
                  <Text className="trace-info">{t.info}</Text>
                </View>
              ))}
              <View className="txhash-row">
                <Text className="txhash-label">TxHash</Text>
                <Text className="txhash" onClick={verifyTx}>0x3a7f...c182（点击验证）</Text>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: '180rpx' }} />
      </ScrollView>

      {/* 底部操作栏 */}
      <View className="bottom-bar">
        <Button className="btn-cart" onClick={addCart}>加入购物车</Button>
        <Button className="btn-buy" onClick={buyNow}>立即购买</Button>
      </View>
    </View>
  );
}
