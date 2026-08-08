import { useState } from 'react';
import Taro, { useRouter } from '@tarojs/taro';
import { View, Text, Button } from '@tarojs/components';
import { store, CartItem, Order } from '../../store';
import { payOrder } from '../../utils/pay';
import { DEMO_ADDRESS, VILLAGE_STORE } from '../../config/region';
import { backendApi, BACKEND_SYNC_ENABLED } from '../../utils/backend';
import './index.css';

const ADDRESS = DEMO_ADDRESS;
const FREE_LINE = 59;   // 单店满此额免基础配送费
const BASE_FEE = 5;     // 基础配送费
const KG_PER_ITEM = 0.5; // 每件预估重量(kg)
const FREE_KG = 5;      // 每单免超重的基准重量
const OVER_KG_FEE = 1;  // 超重每kg加价

export default function OrderConfirmPage() {
  const router = useRouter();
  // 容错：cart 参数损坏时兜底为空，避免整页白屏
  const cart: CartItem[] = (() => {
    try {
      const raw = JSON.parse(decodeURIComponent(router.params.cart || '[]'));
      if (!Array.isArray(raw)) return [];
      // 破坏性防护：价格/数量强制转正数并剔除 NaN/≤0/负数/超量，杜绝白嫖与 NaN 污染贡献值账户
      return raw.map((i: any) => ({ ...i, price: Number(i.price), qty: Math.floor(Number(i.qty)) }))
        .filter((i: any) => Number.isFinite(i.price) && i.price > 0 && Number.isFinite(i.qty) && i.qty > 0 && i.qty <= 999);
    } catch { return []; }
  })();
  const [paying, setPaying] = useState(false);
  const [method, setMethod] = useState<'delivery' | 'pickup' | ''>(''); // 必须点选才能下单
  const [useContrib, setUseContrib] = useState(false); // 贡献值抵扣开关

  // 按小卖部分组
  const byShop: Record<string, CartItem[]> = {};
  cart.forEach(i => { const s = i.shop || VILLAGE_STORE; (byShop[s] = byShop[s] || []).push(i); });
  const shops = Object.keys(byShop);

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shopSub = (items: CartItem[]) => items.reduce((s, i) => s + i.price * i.qty, 0);
  const weightOf = (items: CartItem[]) => items.reduce((s, i) => s + i.qty * KG_PER_ITEM, 0);
  const overFeeOf = (items: CartItem[]) => Math.max(0, Math.ceil(weightOf(items) - FREE_KG)) * OVER_KG_FEE;

  // 需付基础配送费的店（未满免配门槛）
  const payShops = shops.filter(s => shopSub(byShop[s]) < FREE_LINE);
  const overTotal = shops.reduce((s, shop) => s + overFeeOf(byShop[shop]), 0);
  const baseFee = payShops.length > 0 ? BASE_FEE : 0; // 多店拼单共享：只收 1 份基础费
  const showFee = baseFee + overTotal; // 配送预估费
  const totalWeight = shops.reduce((s, shop) => s + weightOf(byShop[shop]), 0);
  // 贡献值抵扣：1 值 = 0.01 元，最多抵 30% 货款，且不超过可花余额(近12月有效值)
  const spendable = store.getSpendable();
  const maxOffsetYuan = Math.floor(subtotal * 0.3 * 100) / 100;
  const usableContrib = Math.min(spendable, Math.round(maxOffsetYuan * 100));
  const offsetYuan = useContrib && usableContrib > 0 ? Math.round(usableContrib) / 100 : 0;
  const contribToUse = offsetYuan > 0 ? usableContrib : 0;
  const total = Math.max(0, subtotal + (method === 'delivery' ? showFee : 0) - offsetYuan);

  const submit = async () => {
    if (paying) return; // 防重复提交：狂点只出一单、只计一次贡献值
    if (!store.requireBound()) return;
    if (!shops.length) { Taro.showToast({ title: '购物车为空，无法下单', icon: 'none' }); return; }
    if (!method) { Taro.showToast({ title: '请先选择配送或自提', icon: 'none' }); return; }
    setPaying(true);

    if (BACKEND_SYNC_ENABLED) {
      try {
        const products = await backendApi.products();
        const mapped = cart.map(item => ({
          cart: item,
          product: products.find(product => product.name === item.name || product.name.includes(item.name)),
        }));
        const missing = mapped.find(item => !item.product);
        if (missing) throw new Error(`后端尚未配置商品：${missing.cart.name}`);
        const groups = mapped.reduce((result: Record<string, Array<{ productId: string; quantity: number }>>, item) => {
          const organizationId = item.product.organizationId;
          (result[organizationId] ||= []).push({ productId: item.product.id, quantity: item.cart.qty });
          return result;
        }, {});
        const batchKey = `GX-${Date.now()}`;
        await Promise.all(Object.entries(groups).map(([organizationId, items], index) =>
          backendApi.orders.create(organizationId, items, `${batchKey}-${index}`)));
        store.setCart(store.getCart().filter(pc => !cart.some(oc => oc.id === pc.id && oc.spec === pc.spec && oc.shop === pc.shop)));
        Taro.showToast({ title: '订单已提交，等待付款', icon: 'success' });
        setTimeout(() => Taro.redirectTo({ url: '/pages/orders/index' }), 800);
      } catch (error: any) {
        Taro.showToast({ title: error?.message || '订单提交失败', icon: 'none' });
      } finally {
        setPaying(false);
      }
      return;
    }

    const orderNo = 'GX' + Date.now();

    // 统一支付入口：演示模式=模拟成功；接入微信支付后=拉起真实支付面板。
    // 切换只改 config/payment.ts 的 PAY_MODE，这里不用动。
    const pay = await payOrder({ orderNo, amount: total, description: `供享村社 · ${shops.length} 家小卖部` });
    if (!pay.ok) {
      setPaying(false);
      Taro.showToast({ title: pay.reason === 'cancel' ? '已取消支付' : (pay.message || '支付失败，请重试'), icon: 'none' });
      return;
    }
    // 贡献值抵扣：支付成功后从可花余额真扣除
    if (contribToUse > 0) store.spendContrib(contribToUse);

    // ── 支付成功后，才生成订单（按小卖部分单）──
    const now = new Date().toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    // 服务费按店均摊，余数归到最后一家，保证 Σ feePerShop === showFee（避免 5/3 → 1.67×3=5.01 的漂移）
    const deliverFee = method === 'delivery' ? showFee : 0;
    const feeEach = Math.round((deliverFee / shops.length) * 100) / 100;
    const feeLast = Math.round((deliverFee - feeEach * (shops.length - 1)) * 100) / 100;
    // 抵扣额按各店商品额占比分摊，最后一店吃尾差，确保各订单合计=实际支付额且退款可逐单原路退回。
    let contribAllocated = 0;
    shops.forEach((shop, idx) => {
      const feePerShop = idx === shops.length - 1 ? feeLast : feeEach;
      const its = byShop[shop];
      const contribForShop = idx === shops.length - 1
        ? contribToUse - contribAllocated
        : Math.floor(contribToUse * shopSub(its) / subtotal);
      contribAllocated += contribForShop;
      const order: Order = {
        id: orderNo + idx,
        date: now,
        status: '待发货',
        items: its.map(c => ({ name: c.name + (c.spec ? ` (${c.spec})` : ''), qty: c.qty, price: c.price })),
        total: Math.max(0, shopSub(its) + feePerShop - contribForShop / 100),
        address: ADDRESS,
        shop,
        method: method === 'pickup' ? '自提' : '配送',
        delivery: feePerShop,
        contribUsed: contribForShop,
      };
      store.addOrder(order);
      // 消费助农：每单 +5，每满 ¥100 再 +5（社会贡献值）
      // 消费助农贡献值：随订单「预记(冻结)」，确认收货后才计分、退款自动冲正（不再下单即到账、防薅）
      store.addOrderContrib(order.id, 'career', `消费助农·${shop}下单`, 5 + Math.floor(shopSub(its) / 100) * 5);
    });
    // 只清掉本次已下单的商品，保留购物车里未下单的（分店结算 / 立即购买 场景不能整车清空）
    store.setCart(store.getCart().filter(pc => !cart.some(oc => oc.id === pc.id && oc.spec === pc.spec && oc.shop === pc.shop)));
    setPaying(false);
    Taro.showToast({ title: method === 'pickup' ? '已下单，到店自提' : shops.length > 1 ? `已按 ${shops.length} 家分单` : '下单成功', icon: 'success' });
    setTimeout(() => Taro.redirectTo({ url: '/pages/orders/index' }), 1000);
  };

  return (
    <View className="page">
      <View className="card">
        <Text className="card-label">📍 收货地址</Text>
        <Text className="address-name">冯永清　15116900077</Text>
        <Text className="address-detail">{ADDRESS}</Text>
      </View>

      {/* 配送方式：必须点选 */}
      <View className="card">
        <Text className="card-label">🚚 配送方式（必选）</Text>
        <View style={{ display: 'flex', gap: '16rpx', marginTop: '14rpx' }}>
          <View style={{ flex: 1, border: method === 'delivery' ? '2rpx solid #16a34a' : '2rpx solid #e5e7eb', borderRadius: '14rpx', padding: '20rpx', background: method === 'delivery' ? '#f0fdf4' : '#fff' }} onClick={() => setMethod('delivery')}>
            <Text style={{ fontSize: '26rpx', fontWeight: 700, color: '#1f2937', display: 'block' }}>🛵 配送到家</Text>
            <Text style={{ fontSize: '22rpx', color: '#16a34a', display: 'block', marginTop: '6rpx' }}>{showFee === 0 ? `满¥${FREE_LINE}免配送费` : `预估 ¥${showFee.toFixed(2)}`}</Text>
          </View>
          <View style={{ flex: 1, border: method === 'pickup' ? '2rpx solid #16a34a' : '2rpx solid #e5e7eb', borderRadius: '14rpx', padding: '20rpx', background: method === 'pickup' ? '#f0fdf4' : '#fff' }} onClick={() => setMethod('pickup')}>
            <Text style={{ fontSize: '26rpx', fontWeight: 700, color: '#1f2937', display: 'block' }}>🏪 到店自提</Text>
            <Text style={{ fontSize: '22rpx', color: '#16a34a', display: 'block', marginTop: '6rpx' }}>免配送费 ¥0</Text>
          </View>
        </View>
        {method === 'delivery' && shops.length > 1 && (
          <Text style={{ fontSize: '21rpx', color: '#7c3aed', display: 'block', marginTop: '12rpx', lineHeight: 1.6 }}>✨ {shops.length} 家拼单，配送小哥就近一趟取齐，已共享配送费（比各家单送省约 ¥{((shops.length - 1) * BASE_FEE).toFixed(2)}）</Text>
        )}
        {method === 'delivery' && overTotal > 0 && (
          <Text style={{ fontSize: '21rpx', color: '#ea580c', display: 'block', marginTop: '8rpx', lineHeight: 1.6 }}>预估总重 {totalWeight.toFixed(1)}kg，超 {FREE_KG}kg 部分加收超重费 ¥{overTotal.toFixed(2)}</Text>
        )}
      </View>

      <View className="card">
        <Text className="card-label">🛍️ 商品清单{shops.length === 1 ? '' : `（${shops.length} 家小卖部）`}</Text>
        {cart.map((item, i) => (
          <View key={i} className="item-row">
            <View className="item-left">
              <Text className="item-name">{item.name}</Text>
              {item.spec && <Text className="item-spec">{item.spec}</Text>}
            </View>
            <Text className="item-price">¥{item.price} × {item.qty}</Text>
          </View>
        ))}
      </View>

      <View className="card">
        <View className="fee-row" onClick={() => { if (spendable > 0 && maxOffsetYuan > 0) setUseContrib(v => !v); }}>
          <Text className="fee-label">🎁 贡献值抵扣</Text>
          <Text style={{ color: spendable > 0 ? '#16a34a' : '#9ca3af', fontWeight: 700 }}>{spendable <= 0 ? '暂无可用贡献值' : useContrib ? `已抵 −¥${offsetYuan.toFixed(2)}（用 ${usableContrib} 值）✓` : `点此使用 · 最多抵 ¥${maxOffsetYuan.toFixed(2)}`}</Text>
        </View>
        <Text style={{ fontSize: '20rpx', color: '#9ca3af', display: 'block', marginTop: '6rpx' }}>可用 {spendable} 贡献值（1 值 = 0.01 元，最多抵 30% 货款；过期分不计）</Text>
      </View>

      <View className="card">
        <View className="fee-row">
          <Text className="fee-label">商品合计</Text>
          <Text>¥{subtotal.toFixed(2)}</Text>
        </View>
        <View className="fee-row">
          <Text className="fee-label">配送费</Text>
          <Text>{!method ? '请选择配送方式' : method === 'pickup' ? '自提 · 免配送费 🎉' : showFee === 0 ? '免配送费 🎉' : `¥${showFee.toFixed(2)}`}</Text>
        </View>
        {offsetYuan > 0 && (
          <View className="fee-row">
            <Text className="fee-label">贡献值抵扣</Text>
            <Text style={{ color: '#16a34a' }}>−¥{offsetYuan.toFixed(2)}</Text>
          </View>
        )}
        <View className="fee-row total-row">
          <Text className="fee-label-bold">实付金额</Text>
          <Text className="total-price">¥{total.toFixed(2)}</Text>
        </View>
      </View>

      <View className="bottom-bar">
        <Text className="bottom-price">¥{total.toFixed(2)}</Text>
        <Button className="btn-pay" loading={paying} onClick={submit}>
          {!method ? '选择配送方式' : method === 'pickup' ? '提交自提单' : '提交订单'}
        </Button>
      </View>
    </View>
  );
}
