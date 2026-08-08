import { useState } from 'react';
import Taro, { useRouter, useDidShow } from '@tarojs/taro';
import { View, Text, Button, Input } from '@tarojs/components';
import { store, UserInfo } from '../../store';
import TabBar from '../../components/TabBar';
import './index.css';

// ── Mock 数据 ────────────────────────────────────────────────────────────────
interface Village { id: string; name: string; admin: string; phone?: string; type?: '村庄' | '社区'; gmv: number; orders: number; users: number; joined: string; status: 'reviewing' | 'pending' | 'active'; }
interface Settlement { id: string; village: string; entrepreneur: string; amount: number; orders: number; dueDate: string; status: 'pending' | 'paid'; }
interface PlatformUser { id: string; name: string; phone: string; role: UserInfo['role']; joinDate: string; }

const MOCK_VILLAGES: Village[] = [
  { id: 'V001', name: '湖滨区示范村', admin: '王村长', gmv: 15840, orders: 312, users: 486, joined: '10月1日', status: 'active' },
  { id: 'V002', name: '渑池县桃花村', admin: '李书记', gmv: 8760, orders: 198, users: 234, joined: '10月15日', status: 'active' },
  { id: 'V003', name: '卢氏县核桃沟', admin: '张主任', gmv: 4320, orders: 87, users: 112, joined: '11月1日', status: 'active' },
  { id: 'V004', name: '灵宝市函谷关村', admin: '—', gmv: 0, orders: 0, users: 0, joined: '11月8日', status: 'pending' },
];

const MOCK_SETTLEMENTS: Settlement[] = [
  { id: 'S001', village: '湖滨区示范村', entrepreneur: '冯韵雯', amount: 680.5, orders: 23, dueDate: '11月20日', status: 'pending' },
  { id: 'S002', village: '湖滨区示范村', entrepreneur: '孙建军', amount: 320, orders: 11, dueDate: '11月20日', status: 'pending' },
  { id: 'S003', village: '渑池县桃花村', entrepreneur: '周小琴', amount: 1240, orders: 41, dueDate: '11月18日', status: 'paid' },
  { id: 'S004', village: '卢氏县核桃沟', entrepreneur: '马大力', amount: 540, orders: 18, dueDate: '11月22日', status: 'pending' },
];

const MOCK_USERS: PlatformUser[] = [
  { id: 'U001', name: '王村长', phone: '138****0011', role: 'village_admin', joinDate: '10月1日' },
  { id: 'U002', name: '李书记', phone: '139****2233', role: 'village_admin', joinDate: '10月15日' },
  { id: 'U003', name: '冯韵雯', phone: '177****5566', role: 'entrepreneur', joinDate: '10月5日' },
  { id: 'U004', name: '张小花', phone: '152****8833', role: 'entrepreneur', joinDate: '10月10日' },
  { id: 'U005', name: '新用户001', phone: '136****4455', role: 'user', joinDate: '11月6日' },
];

// 底栏 sec 参数 ↔ 板块名；板块名 ↔ 底栏高亮 key（板块切换由底部导航驱动）
const SEC_TO_TAB: Record<string, string> = { overview: '平台总览', village: '村庄管理', settle: '结算中心', perm: '用户权限' };
const TAB_TO_KEY: Record<string, string> = { '平台总览': 'pf-overview', '村庄管理': 'pf-village', '结算中心': 'pf-settle', '用户权限': 'pf-perm' };

const ROLE_LABELS: Record<string, string> = {
  user: '普通用户',
  entrepreneur: '创业者',
  village_admin: '村委管理员',
  platform_admin: '平台管理员',
};

// 🗂️ 管理功能 导航（平台级管理工具集）
const MGMT_TOOLS: { icon: string; label: string; url: string }[] = [
  { icon: '🔑', label: '公益授权管理', url: '/pkgPlatform/charity-auth/index' },
  { icon: '📣', label: '推广分销管理', url: '/pkgPlatform/promotion/index' },
  { icon: '⚙️', label: '村庄功能配置', url: '/pkgAdmin/village-config/index' },
  { icon: '📋', label: '审批中心', url: '/pages/approval/index' },
  { icon: '📇', label: '组织码·名单', url: '/pages/org-code/index' },
  { icon: '📥', label: '名单导入', url: '/pkgAdmin/roster-import/index' },
  { icon: '⛓', label: '区块链底座', url: '/pkgPlatform/web3/index' },
];

export default function PlatformPage() {
  const router = useRouter();
  const [tab, setTab] = useState(SEC_TO_TAB[router.params.sec || ''] || '平台总览');
  const [villages, setVillages] = useState<Village[]>(MOCK_VILLAGES);
  const [settlements, setSettlements] = useState<Settlement[]>(MOCK_SETTLEMENTS);
  const [users, setUsers] = useState<PlatformUser[]>(MOCK_USERS);

  // 接入新村庄表单
  const [showIntake, setShowIntake] = useState(false);
  const [formName, setFormName] = useState('');
  const [formAdmin, setFormAdmin] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formType, setFormType] = useState<'村庄' | '社区'>('村庄');
  const resetForm = () => { setFormName(''); setFormAdmin(''); setFormPhone(''); setFormType('村庄'); };
  const closeIntake = () => { setShowIntake(false); resetForm(); };

  const [allowed, setAllowed] = useState(store.isPlatformAdmin());
  useDidShow(() => {
    const ok = store.isPlatformAdmin();
    setAllowed(ok);
    if (!ok) {
      Taro.showModal({ title: '无权访问', content: '平台运营后台仅平台管理员可用', showCancel: false, success: () => Taro.reLaunch({ url: '/pages/index/index' }) });
    }
  });

  const totalGMV = villages.reduce((s, v) => s + v.gmv, 0);
  const totalOrders = villages.reduce((s, v) => s + v.orders, 0);
  const totalUsers = villages.reduce((s, v) => s + v.users, 0);
  const pendingSettlement = settlements.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.amount, 0);

  const goPage = (url: string) => Taro.navigateTo({ url });

  const approveVillage = (id: string) => {
    Taro.showModal({
      title: '激活村庄',
      content: '确认开通该村庄的平台权限？激活后默认只开通 MVP 核心功能，其余可在「村庄功能配置」按需开通。',
      success: (res) => {
        if (res.confirm) {
          const v = villages.find(x => x.id === id);
          if (v) store.seedNewVillageFeatures(v.name);
          setVillages(prev => prev.map(vv => vv.id === id ? { ...vv, status: 'active' } : vv));
          Taro.showToast({ title: '村庄已激活', icon: 'success' });
        }
      }
    });
  };

  // 提交接入申请 → 加入列表，状态「待审核」
  const submitIntake = () => {
    if (!formName.trim()) { Taro.showToast({ title: '请填写名称', icon: 'none' }); return; }
    if (!formAdmin.trim()) { Taro.showToast({ title: '请填写负责人', icon: 'none' }); return; }
    if (!/^1\d{10}$/.test(formPhone.trim())) { Taro.showToast({ title: '请填写正确的手机号', icon: 'none' }); return; }
    const now = new Date();
    const newV: Village = {
      id: `V${String(villages.length + 1).padStart(3, '0')}`,
      name: formName.trim(),
      admin: formAdmin.trim(),
      phone: formPhone.trim(),
      type: formType,
      gmv: 0, orders: 0, users: 0,
      joined: `${now.getMonth() + 1}月${now.getDate()}日`,
      status: 'reviewing',
    };
    setVillages(prev => [newV, ...prev]);
    closeIntake();
    Taro.showToast({ title: '已提交，待审核', icon: 'success' });
  };

  // 通过接入申请 → 待审核 变 待激活
  const passIntake = (id: string, name: string) => {
    Taro.showModal({
      title: '通过接入',
      content: `确认通过「${name}」的接入申请？通过后进入待激活状态，可开通平台权限。`,
      success: (res) => {
        if (res.confirm) {
          setVillages(prev => prev.map(v => v.id === id ? { ...v, status: 'pending' } : v));
          Taro.showToast({ title: '已通过，待激活', icon: 'success' });
        }
      }
    });
  };

  // 驳回接入申请 → 从列表移除
  const rejectIntake = (id: string, name: string) => {
    Taro.showModal({
      title: '驳回接入',
      content: `确认驳回「${name}」的接入申请？驳回后将从列表移除。`,
      success: (res) => {
        if (res.confirm) {
          setVillages(prev => prev.filter(v => v.id !== id));
          Taro.showToast({ title: '已驳回', icon: 'none' });
        }
      }
    });
  };

  const paySingleSettlement = (id: string, name: string, amount: number) => {
    Taro.showModal({
      title: '确认打款',
      content: `向 ${name} 打款 ¥${amount.toFixed(2)}？打款后不可撤销。`,
      success: (res) => {
        if (res.confirm) {
          setSettlements(prev => prev.map(s => s.id === id ? { ...s, status: 'paid' } : s));
          Taro.showToast({ title: '打款成功', icon: 'success' });
        }
      }
    });
  };

  const batchPay = () => {
    const pending = settlements.filter(s => s.status === 'pending');
    if (pending.length === 0) { Taro.showToast({ title: '无待结算条目', icon: 'none' }); return; }
    Taro.showModal({
      title: '批量打款',
      content: `共 ${pending.length} 笔，合计 ¥${pendingSettlement.toFixed(2)}，确认全部打款？`,
      success: (res) => {
        if (res.confirm) {
          setSettlements(prev => prev.map(s => ({ ...s, status: 'paid' })));
          Taro.showToast({ title: `已向 ${pending.length} 人打款`, icon: 'success' });
        }
      }
    });
  };

  const changeRole = (userId: string, currentRole: UserInfo['role'], userName: string) => {
    const roles: { label: string; role: UserInfo['role'] }[] = [
      { label: '普通用户', role: 'user' },
      { label: '创业者', role: 'entrepreneur' },
      { label: '村委管理员', role: 'village_admin' },
      { label: '平台管理员', role: 'platform_admin' },
    ];
    // 简化：用 ActionSheet 模拟选择
    Taro.showActionSheet({
      itemList: roles.map(r => `${r.label}${r.role === currentRole ? ' ✓' : ''}`),
      success: (res) => {
        const newRole = roles[res.tapIndex].role;
        if (newRole === currentRole) return;
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
        Taro.showToast({ title: `${userName} → ${roles[res.tapIndex].label}`, icon: 'success' });
      }
    });
  };

  if (!allowed) {
    return (
      <View className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Text style={{ fontSize: '30rpx', color: '#9ca3af' }}>🔒 平台运营后台仅平台管理员可访问</Text>
      </View>
    );
  }

  return (
    <View className="page">
      {/* 标题栏 */}
      <View className="header">
        <Text className="header-title">🏢 平台管理中心</Text>
        <Text className="header-sub">供享村社 · 运营后台</Text>
      </View>

      {/* ── 平台总览 ─────────────────────────────────────────────── */}
      {tab === '平台总览' && (
        <View className="tab-content">
          <View className="kpi-grid">
            <View className="kpi-card kpi-green">
              <Text className="kpi-num">¥{(totalGMV / 10000).toFixed(1)}万</Text>
              <Text className="kpi-label">平台总 GMV</Text>
            </View>
            <View className="kpi-card kpi-blue">
              <Text className="kpi-num">{totalOrders}</Text>
              <Text className="kpi-label">总订单数</Text>
            </View>
            <View className="kpi-card kpi-purple">
              <Text className="kpi-num">{totalUsers}</Text>
              <Text className="kpi-label">注册用户</Text>
            </View>
            <View className="kpi-card kpi-yellow">
              <Text className="kpi-num">{villages.filter(v => v.status === 'active').length}</Text>
              <Text className="kpi-label">活跃村庄</Text>
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

          {/* 待结算提示 */}
          <View className="alert-card">
            <Text className="alert-icon">💰</Text>
            <View className="alert-info">
              <Text className="alert-main">待结算 ¥{pendingSettlement.toFixed(2)}</Text>
              <Text className="alert-sub">{settlements.filter(s => s.status === 'pending').length} 笔到期账单</Text>
            </View>
            <Button className="alert-btn" onClick={() => setTab('结算中心')}>去处理</Button>
          </View>

          {/* 村庄排行 */}
          <View className="rank-card">
            <Text className="rank-title">🏆 村庄 GMV 排行</Text>
            {[...villages].filter(v => v.status === 'active').sort((a, b) => b.gmv - a.gmv).map((v, i) => (
              <View key={v.id} className="rank-item">
                <Text className={`rank-no rank-${i + 1}`}>{i + 1}</Text>
                <View className="rank-info">
                  <Text className="rank-name">{v.name}</Text>
                  <Text className="rank-admin">管理员: {v.admin}</Text>
                </View>
                <Text className="rank-gmv">¥{v.gmv.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── 村庄管理 ─────────────────────────────────────────────── */}
      {tab === '村庄管理' && (
        <View className="tab-content">
          <Button className="btn-add" onClick={() => setShowIntake(true)}>
            + 接入新村庄
          </Button>
          <View style={{ display: 'flex', gap: '16rpx', marginBottom: '16rpx' }}>
            <View style={{ flex: 1, background: '#dc2626', borderRadius: '14rpx', padding: '20rpx', textAlign: 'center' }} onClick={() => Taro.navigateTo({ url: '/pkgLife/charity/index' })}>
              <Text style={{ color: '#fff', fontSize: '24rpx', fontWeight: 700 }}>🏀 关心下一代公益</Text>
              <Text style={{ display: 'block', color: '#fecaca', fontSize: '19rpx', marginTop: '4rpx' }}>青少年体育公益监管</Text>
            </View>
          </View>
          {villages.map(v => (
            <View key={v.id} className={`village-card ${v.status === 'reviewing' ? 'v-reviewing' : v.status === 'pending' ? 'v-pending' : ''}`}>
              <View className="village-head">
                <Text className="village-name">{v.name}{v.type ? `（${v.type}）` : ''}</Text>
                <View className={`village-badge ${v.status === 'active' ? 'badge-active' : v.status === 'pending' ? 'badge-pending' : 'badge-reviewing'}`}>
                  <Text>{v.status === 'active' ? '运营中' : v.status === 'pending' ? '待激活' : '待审核'}</Text>
                </View>
              </View>
              <View className="village-stats">
                <View className="vs-item"><Text className="vs-num">{v.orders}</Text><Text className="vs-label">订单</Text></View>
                <View className="vs-item"><Text className="vs-num">¥{v.gmv.toLocaleString()}</Text><Text className="vs-label">GMV</Text></View>
                <View className="vs-item"><Text className="vs-num">{v.users}</Text><Text className="vs-label">用户</Text></View>
              </View>
              <Text className="village-admin-txt">
                {v.type === '社区' ? '社区负责人' : '村委管理员'}: {v.admin}{v.phone ? ` · ${v.phone}` : ''} · 接入于 {v.joined}
              </Text>
              {v.status === 'reviewing' && (
                <View className="intake-actions">
                  <Button className="btn-reject" onClick={() => rejectIntake(v.id, v.name)}>驳回</Button>
                  <Button className="btn-pass" onClick={() => passIntake(v.id, v.name)}>通过接入</Button>
                </View>
              )}
              {v.status === 'pending' && (
                <Button className="btn-activate" onClick={() => approveVillage(v.id)}>激活村庄</Button>
              )}
            </View>
          ))}
        </View>
      )}

      {/* ── 结算中心 ─────────────────────────────────────────────── */}
      {tab === '结算中心' && (
        <View className="tab-content">
          <View className="settle-summary">
            <Text className="settle-pending-label">待打款总额</Text>
            <Text className="settle-pending-val">¥{pendingSettlement.toFixed(2)}</Text>
            <Button className="btn-batch-pay" onClick={batchPay}>一键批量打款</Button>
          </View>

          {settlements.map(s => (
            <View key={s.id} className={`settle-card ${s.status === 'paid' ? 'settle-done' : ''}`}>
              <View className="settle-head">
                <View>
                  <Text className="settle-name">{s.entrepreneur}</Text>
                  <Text className="settle-village">{s.village}</Text>
                </View>
                <View className={`settle-status ${s.status === 'paid' ? 'ss-paid' : 'ss-pending'}`}>
                  <Text>{s.status === 'paid' ? '已打款' : '待打款'}</Text>
                </View>
              </View>
              <View className="settle-body">
                <View className="settle-detail">
                  <Text className="settle-orders">{s.orders} 笔订单</Text>
                  <Text className="settle-due">到期: {s.dueDate}</Text>
                </View>
                <Text className="settle-amount">¥{s.amount.toFixed(2)}</Text>
              </View>
              {s.status === 'pending' && (
                <Button className="btn-pay-single" onClick={() => paySingleSettlement(s.id, s.entrepreneur, s.amount)}>
                  打款
                </Button>
              )}
            </View>
          ))}
        </View>
      )}

      {/* ── 用户权限 ─────────────────────────────────────────────── */}
      {tab === '用户权限' && (
        <View className="tab-content">
          <Text className="perm-tip">点击角色标签可修改用户权限</Text>
          {users.map(u => (
            <View key={u.id} className="user-row">
              <View className="user-avatar"><Text>{u.name[0]}</Text></View>
              <View className="user-info">
                <Text className="user-name">{u.name}</Text>
                <Text className="user-phone">{u.phone} · {u.joinDate}加入</Text>
              </View>
              <View
                className={`role-tag role-${u.role}`}
                onClick={() => changeRole(u.id, u.role, u.name)}
              >
                <Text className="role-tag-text">{ROLE_LABELS[u.role]}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── 接入新村庄 底部表单 ─────────────────────────────────────── */}
      {showIntake && (
        <View className="intake-mask" onClick={closeIntake}>
          <View className="intake-sheet" onClick={e => e.stopPropagation()}>
            <Text className="intake-title">接入新村庄 / 社区</Text>
            <Text className="intake-sub">填写基本信息，提交后进入「待审核」，审核通过再激活。</Text>

            <Text className="intake-label">类型</Text>
            <View className="intake-type-row">
              <View className={`intake-type ${formType === '村庄' ? 'intake-type-on' : ''}`} onClick={() => setFormType('村庄')}>
                <Text className="intake-type-t">🏡 村庄</Text>
              </View>
              <View className={`intake-type ${formType === '社区' ? 'intake-type-on' : ''}`} onClick={() => setFormType('社区')}>
                <Text className="intake-type-t">🏙️ 社区</Text>
              </View>
            </View>

            <Text className="intake-label">{formType}名称</Text>
            <Input className="intake-inp" placeholder={`请输入${formType}名称，如：湖滨区示范村`} value={formName} onInput={e => setFormName(e.detail.value)} />

            <Text className="intake-label">负责人</Text>
            <Input className="intake-inp" placeholder={formType === '社区' ? '社区负责人姓名' : '村委负责人姓名'} value={formAdmin} onInput={e => setFormAdmin(e.detail.value)} />

            <Text className="intake-label">联系电话</Text>
            <Input className="intake-inp" type="number" maxlength={11} placeholder="11 位手机号" value={formPhone} onInput={e => setFormPhone(e.detail.value)} />

            <View className="intake-btns">
              <Button className="intake-cancel" onClick={closeIntake}>取消</Button>
              <Button className="intake-submit" onClick={submitIntake}>提交接入申请</Button>
            </View>
          </View>
        </View>
      )}

      <View className="tabbar-placeholder" />
      <TabBar active={TAB_TO_KEY[tab]} />
    </View>
  );
}
