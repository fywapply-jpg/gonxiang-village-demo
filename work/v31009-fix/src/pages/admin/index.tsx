import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, Button, ScrollView, Input } from '@tarojs/components';
import { store, Order } from '../../store';
import { VILLAGE_FULL } from '../../config/region';
import './index.css';

// ── Mock 数据 ────────────────────────────────────────────────────────────────
interface Application { id: string; name: string; phone: string; date: string; status: 'pending' | 'approved' | 'rejected'; reason: string; }
interface ProductItem { id: number; name: string; price: number; stock: number; sold: number; status: 'on' | 'off'; spec?: string; category?: string; }

const MOCK_APPS: Application[] = [
  { id: 'A001', name: '李大山', phone: '138****2233', date: '11月5日', status: 'pending', reason: '本村农产品种植10年，希望借助平台拓展销售' },
  { id: 'A002', name: '赵翠花', phone: '177****8899', date: '11月3日', status: 'pending', reason: '养殖土鸡和鸡蛋，质量好，想开店销售' },
  { id: 'A003', name: '孙建军', phone: '152****4455', date: '10月28日', status: 'approved', reason: '核桃种植大户，已有稳定货源' },
];

const MOCK_PRODUCTS: ProductItem[] = [
  { id: 1, name: '三门峡苹果·红富士 5斤', price: 29.9, stock: 200, sold: 438, status: 'on', spec: '5斤装', category: '农产品' },
  { id: 2, name: '灵宝核桃 2斤装', price: 45, stock: 80, sold: 156, status: 'on', spec: '2斤装', category: '干货' },
  { id: 3, name: '陕州冬枣 3斤礼盒', price: 68, stock: 0, sold: 89, status: 'off', spec: '3斤礼盒', category: '生鲜' },
  { id: 4, name: '玉米糁 5斤', price: 18, stock: 500, sold: 312, status: 'on', spec: '5斤装', category: '农产品' },
];

const TABS = ['数据总览', '角色权限', '订单管理', '商品管理', '创业申请'];

const ADMIN_LEVEL_ROLES = [
  { key: 'GLOBAL', icon: '🌐', level: '总平台', role: '总平台管理员', desc: '全国制度、组织、审计和重大事项协同', scope: '全国组织树', posts: ['平台负责人', '全国调度员', '安全审计员'], permissions: ['组织管理', '角色授予', '治理全流程', '审计查看', '数据导出'] },
  { key: 'PROVINCE', icon: '🏛️', level: '省（直辖市）', role: '省级统筹管理员', desc: '省域督导、跨市协调和资源统筹', scope: '本省及全部下级', posts: ['省级负责人', '省级督导员', '跨域协调员'], permissions: ['组织管理', '角色授予', '治理全流程', '审计查看', '数据导出'] },
  { key: 'CITY', icon: '🏙️', level: '市（州）', role: '市州运营管理员', desc: '跨县协同、运行监测和专业支撑', scope: '本市州及全部下级', posts: ['市州负责人', '市州调度员', '效能监督员'], permissions: ['组织管理', '角色授予', '治理全流程', '审计查看', '数据导出'] },
  { key: 'COUNTY', icon: '🗺️', level: '县（区）', role: '县区服务管理员', desc: '县域分拨、部门联动和跨乡镇调度', scope: '本县区及全部下级', posts: ['县区负责人', '县区调度员', '部门联络员'], permissions: ['组织管理', '角色授予', '治理全流程', '审计查看'] },
  { key: 'TOWNSHIP', icon: '🏘️', level: '乡（镇、街道）', role: '乡镇运营管理员', desc: '基层研判、村社派单、协调和验收', scope: '本乡镇及下辖村社', posts: ['乡镇负责人', '治理调度员', '验收人员'], permissions: ['成员管理', '事项上报', '派单', '办理', '验收'] },
  { key: 'VILLAGE', icon: '🏡', level: '村（社区）', role: '村社服务管理员', desc: '民情发现、现场核实、办理和群众反馈', scope: '本村（社区）', posts: ['村社负责人', '网格员', '事项办理员'], permissions: ['组织查看', '事项上报', '事项办理'] },
];

// 🗂️ 管理功能 导航（村委 / 村务管理工具集）
const MGMT_TOOLS: { icon: string; label: string; url: string }[] = [
  { icon: '📋', label: '审批中心', url: '/pages/approval/index' },
  { icon: '📇', label: '组织码·名单', url: '/pages/org-code/index' },
  { icon: '📥', label: '名单导入', url: '/pkgAdmin/roster-import/index' },
  { icon: '✨', label: '聚光星·流量', url: '/pkgLife/spotlight/index' },
  { icon: '✅', label: '贡献审核', url: '/pkgLife/contrib-audit/index' },
  { icon: '📋', label: '村务公开', url: '/pages/affairs/index' },
  { icon: '❤️', label: '志愿服务', url: '/pages/volunteer/index' },
];

const STATUS_COLOR: Record<string, string> = {
  '待付款': '#f59e0b', '待发货': '#f59e0b',
  '配送中': '#3b82f6', '已签收': '#16a34a', '退款中': '#ef4444',
};

export default function AdminPage() {
  const [tab, setTab] = useState('数据总览');
  const [orders, setOrders] = useState<Order[]>([]);
  const [apps, setApps] = useState<Application[]>(MOCK_APPS);
  const [products, setProducts] = useState<ProductItem[]>(MOCK_PRODUCTS);
  const matchedRoleIndex = ADMIN_LEVEL_ROLES.findIndex(item => item.role === store.getUser()?.backendRoleName);
  const [roleIndex, setRoleIndex] = useState(matchedRoleIndex >= 0 ? matchedRoleIndex : 5);

  const [allowed, setAllowed] = useState(store.canManageVillageOnly());
  useDidShow(() => {
    const ok = store.canManageVillageOnly();
    setAllowed(ok);
    if (!ok) { Taro.showModal({ title: '无权访问', content: '村委管理后台仅村委 / 平台管理员可用', showCancel: false, success: () => Taro.reLaunch({ url: '/pages/index/index' }) }); return; }
    store.initMockDataIfEmpty?.();
    setOrders(store.getOrders());
  });

  const totalGMV = orders.reduce((s, o) => s + o.total, 0);
  const pendingCount = orders.filter(o => o.status === '待发货').length;
  const deliveryCount = orders.filter(o => o.status === '配送中').length;
  const approvedCount = apps.filter(a => a.status === 'approved').length;

  const goPage = (url: string) => Taro.navigateTo({ url });

  const handleApprove = (id: string, approved: boolean) => {
    Taro.showModal({
      title: approved ? '确认通过申请' : '确认拒绝申请',
      content: approved ? '通过后该用户将成为创业者，可在平台开店销售。' : '拒绝后该用户需重新申请。',
      success: (res) => {
        if (res.confirm) {
          setApps(prev => prev.map(a => a.id === id ? { ...a, status: approved ? 'approved' : 'rejected' } : a));
          Taro.showToast({ title: approved ? '已通过申请' : '已拒绝申请', icon: 'success' });
        }
      }
    });
  };

  const toggleProduct = (id: number) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, status: p.status === 'on' ? 'off' : 'on' } : p));
    Taro.showToast({ title: '商品状态已更新', icon: 'success' });
  };

  // ── 发布 / 编辑商品表单 ──────────────────────────────────────
  const CATEGORIES = ['农产品', '生鲜', '干货', '手工艺', '其他'];
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null); // null = 新增
  const [fName, setFName] = useState('');
  const [fPrice, setFPrice] = useState('');
  const [fStock, setFStock] = useState('');
  const [fSpec, setFSpec] = useState('');
  const [fCat, setFCat] = useState('农产品');

  const openAdd = () => {
    setEditId(null);
    setFName(''); setFPrice(''); setFStock(''); setFSpec(''); setFCat('农产品');
    setShowForm(true);
  };
  const openEdit = (p: ProductItem) => {
    setEditId(p.id);
    setFName(p.name); setFPrice(String(p.price)); setFStock(String(p.stock));
    setFSpec(p.spec || ''); setFCat(p.category || '农产品');
    setShowForm(true);
  };
  const closeForm = () => setShowForm(false);

  const saveProduct = () => {
    if (!fName.trim()) { Taro.showToast({ title: '请填写商品名称', icon: 'none' }); return; }
    const priceNum = Number(fPrice);
    if (!fPrice.trim() || isNaN(priceNum) || priceNum <= 0) { Taro.showToast({ title: '请填写正确的价格', icon: 'none' }); return; }
    const stockNum = Math.max(0, Math.floor(Number(fStock) || 0));
    if (editId === null) {
      // 新增：默认在售
      const newId = products.length ? Math.max(...products.map(p => p.id)) + 1 : 1;
      setProducts(prev => [
        { id: newId, name: fName.trim(), price: priceNum, stock: stockNum, sold: 0, status: 'on', spec: fSpec.trim(), category: fCat },
        ...prev,
      ]);
      Taro.showToast({ title: '发布成功', icon: 'success' });
    } else {
      // 编辑：改回列表，保留 sold / status
      setProducts(prev => prev.map(p => p.id === editId
        ? { ...p, name: fName.trim(), price: priceNum, stock: stockNum, spec: fSpec.trim(), category: fCat }
        : p));
      Taro.showToast({ title: '已保存', icon: 'success' });
    }
    setShowForm(false);
  };

  const ship = (orderId: string) => {
    Taro.showModal({
      title: '确认发货',
      content: '确认已安排物流发货？',
      success: (res) => {
        if (res.confirm) {
          const order = orders.find(o => o.id === orderId);
          const now = new Date();
          const time = `${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
          store.updateOrder(orderId, {
            status: '配送中',
            logistics: [{ time, desc: '已发货，商品已交付物流' }, ...(order?.logistics || [])],
          });
          setOrders(store.getOrders());
          Taro.showToast({ title: '发货成功', icon: 'success' });
        }
      }
    });
  };

  if (!allowed) {
    return (
      <View className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Text style={{ fontSize: '30rpx', color: '#9ca3af' }}>🔒 村委管理后台仅村委 / 平台管理员可访问</Text>
      </View>
    );
  }

  return (
    <View className="page">
      {/* 标题栏 */}
      <View className="header">
        <Text className="header-title">🗂️ {ADMIN_LEVEL_ROLES[roleIndex].level}管理中心</Text>
        <Text className="header-sub">{store.getUser()?.backendRoleName || `${VILLAGE_FULL} · 演示管理视图`}</Text>
      </View>

      {/* Tab 切换 */}
      <ScrollView scrollX className="tab-scroll">
        {TABS.map(t => (
          <View key={t} className={`tab-item ${tab === t ? 'tab-active' : ''}`} onClick={() => setTab(t)}>
            <Text>{t}</Text>
          </View>
        ))}
      </ScrollView>

      {/* ── 数据总览 ─────────────────────────────────────────────── */}
      {tab === '数据总览' && (
        <View className="tab-content">
          <View className="stat-grid">
            <View className="stat-card">
              <Text className="stat-num">¥{totalGMV.toFixed(0)}</Text>
              <Text className="stat-label">本月 GMV</Text>
            </View>
            <View className="stat-card">
              <Text className="stat-num">{orders.length}</Text>
              <Text className="stat-label">累计订单</Text>
            </View>
            <View className="stat-card">
              <Text className="stat-num stat-warn">{pendingCount}</Text>
              <Text className="stat-label">待发货</Text>
            </View>
            <View className="stat-card">
              <Text className="stat-num stat-blue">{deliveryCount}</Text>
              <Text className="stat-label">配送中</Text>
            </View>
          </View>

          {/* 🗂️ 管理功能 导航 */}
          <View className="mgmt-card">
            <Text className="mgmt-title">🗂️ 管理功能</Text>
            <View className="mgmt-grid">
              {MGMT_TOOLS.map(t => (
                <View key={t.label} className="mgmt-item" onClick={() => goPage(t.url)}>
                  <View className="mgmt-icon"><Text>{t.icon}</Text></View>
                  <Text className="mgmt-label">{t.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View className="info-card">
            <Text className="info-title">📊 村庄运营概况</Text>
            <View className="info-row"><Text className="info-k">入驻创业者</Text><Text className="info-v">{approvedCount} 人</Text></View>
            <View className="info-row"><Text className="info-k">上架商品</Text><Text className="info-v">{products.filter(p => p.status === 'on').length} 件</Text></View>
            <View className="info-row"><Text className="info-k">待审申请</Text><Text className="info-v">{apps.filter(a => a.status === 'pending').length} 条</Text></View>
            <View className="info-row"><Text className="info-k">结算周期</Text><Text className="info-v">结算触发后 T+1</Text></View>
          </View>

          <View className="tips-card">
            <Text className="tips-title">💡 待办事项</Text>
            {apps.filter(a => a.status === 'pending').length > 0 && (
              <View className="tips-item" onClick={() => setTab('创业申请')}>
                <Text className="tips-dot warn" />
                <Text className="tips-text">{apps.filter(a => a.status === 'pending').length} 条创业申请待审核 ›</Text>
              </View>
            )}
            {pendingCount > 0 && (
              <View className="tips-item" onClick={() => setTab('订单管理')}>
                <Text className="tips-dot warn" />
                <Text className="tips-text">{pendingCount} 笔订单待发货 ›</Text>
              </View>
            )}
            {products.filter(p => p.stock === 0).length > 0 && (
              <View className="tips-item" onClick={() => setTab('商品管理')}>
                <Text className="tips-dot danger" />
                <Text className="tips-text">{products.filter(p => p.stock === 0).length} 件商品库存为零 ›</Text>
              </View>
            )}
            {apps.filter(a => a.status === 'pending').length === 0 && pendingCount === 0 && products.filter(p => p.stock === 0).length === 0 && (
              <Text className="tips-all-done">✅ 暂无待办事项</Text>
            )}
          </View>
        </View>
      )}

      {/* ── 六级角色与权限设置 ─────────────────────────────────── */}
      {tab === '角色权限' && (() => {
        const current = ADMIN_LEVEL_ROLES[roleIndex];
        return <View className="tab-content">
          <View className="role-setting-head">
            <View><Text className="role-setting-title">管理角色视图</Text><Text className="role-setting-sub">组织层级与角色严格一一匹配</Text></View>
            <Text className="role-mode">{store.getUser()?.backendRoleName ? '真实角色' : '演示视图'}</Text>
          </View>
          <ScrollView scrollX className="role-level-scroll"><View className="role-levels">{ADMIN_LEVEL_ROLES.map((item, index) => <View key={item.key} className={roleIndex === index ? 'on' : ''} onClick={() => setRoleIndex(index)}><Text>{item.icon}</Text><Text>{item.level.split('（')[0]}</Text></View>)}</View></ScrollView>
          <View className="selected-role-card">
            <View className="selected-role-top"><Text className="selected-role-icon">{current.icon}</Text><View><Text className="selected-role-name">{current.role}</Text><Text className="selected-role-level">适用组织：{current.level}</Text></View></View>
            <Text className="selected-role-desc">{current.desc}</Text>
            <View className="role-scope"><Text>🔐 数据范围</Text><Text>{current.scope}</Text></View>
            <Text className="role-block-title">标准岗位</Text><View className="admin-role-chips">{current.posts.map(post => <Text key={post}>{post}</Text>)}</View>
            <Text className="role-block-title">功能权限</Text><View className="admin-permission-grid">{current.permissions.map(permission => <View key={permission}><Text>✓</Text><Text>{permission}</Text></View>)}</View>
          </View>
          <View className="role-actions-card">
            <View onClick={() => Taro.showModal({ title: '新增成员授权', content: store.getUser()?.backendRoleName ? '成员查询与角色授予表单需要继续接入后端成员接口；当前不会直接修改真实账号。' : `演示：将先选择${current.level}组织，再选择成员并授予“${current.role}”。`, showCancel: false })}><Text>👤</Text><View><Text>新增成员授权</Text><Text>选择组织、成员和匹配层级角色</Text></View><Text>›</Text></View>
            <View onClick={() => Taro.showModal({ title: '角色授权规则', content: '只能向自己的合法下级组织授予角色；目标角色必须匹配目标组织层级；授予人角色等级必须高于目标角色。', showCancel: false })}><Text>🛡️</Text><View><Text>查看授权规则</Text><Text>防止越级、同级和跨域授权</Text></View><Text>›</Text></View>
            <View onClick={() => Taro.navigateTo({ url: '/pkgDigital/digital-village/index?tab=governance' })}><Text>🧭</Text><View><Text>进入六级治理</Text><Text>查看事项流程和权限矩阵</Text></View><Text>›</Text></View>
          </View>
          {!store.getUser()?.backendRoleName && <View className="role-demo-tip"><Text>当前仅切换管理界面预览，不会修改登录账号、组织或真实权限。</Text></View>}
        </View>;
      })()}

      {/* ── 订单管理 ─────────────────────────────────────────────── */}
      {tab === '订单管理' && (
        <View className="tab-content">
          {orders.map(order => (
            <View key={order.id} className="order-card">
              <View className="order-head">
                <Text className="order-id">{order.id}</Text>
                <Text className="order-status" style={{ color: STATUS_COLOR[order.status] || '#374151' }}>{order.status}</Text>
              </View>
              {order.items.map((item, i) => (
                <View key={i} className="order-item">
                  <Text className="item-name">{item.name}</Text>
                  <Text className="item-qty">×{item.qty}</Text>
                </View>
              ))}
              <View className="order-foot">
                <Text className="order-addr">{order.address.slice(0, 15)}...</Text>
                <Text className="order-total">¥{order.total.toFixed(2)}</Text>
              </View>
              {order.status === '待发货' && (
                <View className="order-actions">
                  <Button className="btn-ship" onClick={() => ship(order.id)}>📦 发货</Button>
                </View>
              )}
            </View>
          ))}
          {orders.length === 0 && <Text className="empty-hint">暂无订单</Text>}
        </View>
      )}

      {/* ── 商品管理 ─────────────────────────────────────────────── */}
      {tab === '商品管理' && (
        <View className="tab-content">
          <Button className="btn-add-product" onClick={openAdd}>
            + 发布新商品
          </Button>
          {products.map(p => (
            <View key={p.id} className={`product-card ${p.status === 'off' ? 'p-off' : ''}`}>
              <View className="product-info">
                <Text className="product-name">{p.name}</Text>
                <View className="product-meta">
                  <Text className="product-price">¥{p.price}</Text>
                  <Text className="product-stock">库存 {p.stock}</Text>
                  <Text className="product-sold">已售 {p.sold}</Text>
                </View>
              </View>
              <View className="product-actions">
                <View className={`toggle ${p.status === 'on' ? 'toggle-on' : 'toggle-off'}`} onClick={() => toggleProduct(p.id)}>
                  <Text className="toggle-text">{p.status === 'on' ? '上架' : '下架'}</Text>
                </View>
                <Text className="edit-btn" onClick={() => openEdit(p)}>编辑</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── 创业申请 ─────────────────────────────────────────────── */}
      {tab === '创业申请' && (
        <View className="tab-content">
          <View style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '16rpx', padding: '20rpx 24rpx', marginBottom: '20rpx' }}>
            <Text style={{ fontSize: '25rpx', color: '#166534', lineHeight: 1.6 }}>🏪 创业者 / 店主 = 平台「小b端」（个体经营者）：审核通过后即可在供享大集开店卖货，并可凭推广码归属推广组织（大B）。</Text>
          </View>
          {apps.map(app => (
            <View key={app.id} className="app-card">
              <View className="app-head">
                <View className="app-avatar"><Text>{app.name[0]}</Text></View>
                <View className="app-person">
                  <Text className="app-name">{app.name}</Text>
                  <Text className="app-phone">{app.phone}</Text>
                </View>
                <View className={`app-badge badge-${app.status}`}>
                  <Text>{app.status === 'pending' ? '待审' : app.status === 'approved' ? '已通过' : '已拒绝'}</Text>
                </View>
              </View>
              <Text className="app-date">申请时间：{app.date}</Text>
              <Text className="app-reason">"{app.reason}"</Text>
              {app.status === 'pending' && (
                <View className="app-actions">
                  <Button className="btn-reject" onClick={() => handleApprove(app.id, false)}>拒绝</Button>
                  <Button className="btn-approve" onClick={() => handleApprove(app.id, true)}>✓ 通过</Button>
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* ── 发布 / 编辑商品 底部弹窗 ─────────────────────────────── */}
      {showForm && (
        <View className="ps-mask" onClick={closeForm}>
          <View className="ps-sheet" onClick={e => e.stopPropagation()}>
            <View className="ps-head">
              <Text className="ps-title">{editId === null ? '发布新商品' : '编辑商品'}</Text>
              <Text className="ps-close" onClick={closeForm}>✕</Text>
            </View>
            <ScrollView scrollY className="ps-body">
              <Text className="form-label">商品名称 *</Text>
              <Input className="form-input" placeholder="如：灵宝苹果·红富士 5斤" value={fName} onInput={e => setFName(e.detail.value)} maxlength={40} />

              <View className="form-row">
                <View className="form-col">
                  <Text className="form-label">价格（元）*</Text>
                  <Input className="form-input" type="digit" placeholder="0.00" value={fPrice} onInput={e => setFPrice(e.detail.value)} />
                </View>
                <View className="form-col">
                  <Text className="form-label">库存</Text>
                  <Input className="form-input" type="number" placeholder="0" value={fStock} onInput={e => setFStock(e.detail.value)} />
                </View>
              </View>

              <Text className="form-label">规格</Text>
              <Input className="form-input" placeholder="如：5斤装 / 3斤礼盒" value={fSpec} onInput={e => setFSpec(e.detail.value)} maxlength={20} />

              <Text className="form-label">分类</Text>
              <View className="ps-cats">
                {CATEGORIES.map(c => (
                  <View key={c} className={`ps-cat ${fCat === c ? 'ps-cat-on' : ''}`} onClick={() => setFCat(c)}>
                    <Text className="ps-cat-t">{c}</Text>
                  </View>
                ))}
              </View>

              <Button className="form-submit" onClick={saveProduct}>{editId === null ? '发布商品' : '保存修改'}</Button>
              <View style={{ height: '20rpx' }} />
            </ScrollView>
          </View>
        </View>
      )}

      <View style={{ height: '60rpx' }} />
    </View>
  );
}
