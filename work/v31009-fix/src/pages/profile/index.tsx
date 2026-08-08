import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, Button } from '@tarojs/components';
import { useState } from 'react';
import { store, UserInfo } from '../../store';
import TabBar from '../../components/TabBar';
import { APP_VERSION, DEMO_MODE } from '../../config/version';
import { VILLAGE_ORG, COMMUNITY_ORG } from '../../config/region';
import './index.css';

interface Menu { icon: string; label: string; sub: string; path: string; role?: string; help?: boolean; }

export default function ProfilePage() {
  const [user, setUser] = useState<UserInfo | null>(() => store.getUser());
  const [contrib, setContrib] = useState(() => store.getContribAccount().total);

  useDidShow(() => {
    setUser(store.getUser());
    setContrib(store.getContribAccount().total);
  });

  const logout = () => {
    Taro.showModal({
      title: '退出登录',
      content: '确认退出？',
      success: (res) => {
        if (res.confirm) {
          store.clearUser();
          Taro.reLaunch({ url: '/pages/login/index' });
        }
      }
    });
  };

  const menus: Menu[] = [
    { icon: '💼', label: '我的资产·经营', sub: '贡献·分红·经营·权益 一览', path: '/pkgPlatform/my-assets/index' },
    { icon: '⭐', label: '我的贡献', sub: '全生命周期社会贡献', path: '/pages/contribution/index' },
    { icon: '📦', label: '我的订单', sub: '查看全部订单', path: '/pages/orders/index' },
    { icon: '🔔', label: '消息通知', sub: '党建·村务·订单消息', path: '/pages/messages/index' },
    { icon: '🌟', label: '邀请中心', sub: '邀请助农得贡献值', path: '/pages/invite/index' },
    { icon: '📍', label: '收货地址', sub: '管理收货地址（即将开放）', path: '' },
    { icon: '👴', label: '长辈模式', sub: '大字大图标·一键求助', path: '/pages/elder/index' },
    { icon: '💬', label: '帮助客服', sub: '常见问题·联系客服', path: '', help: true },
    { icon: '⛓', label: '区块链技术底座', sub: '平台技术架构·自主可控', path: '/pkgPlatform/web3/index' },
    { icon: '💰', label: '共富分配机制', sub: '全民共富·按劳分配·即时分账', path: '/pkgPlatform/prosperity/index' },
    { icon: '🤝', label: '利益共同体', sub: '一荣俱荣·人人有份·利益联结', path: '/pkgPlatform/interest-community/index' },
    { icon: '💳', label: '支付结算系统', sub: '银行存管·智能分账·T+1清分', path: '/pkgPlatform/settlement/index' },
    { icon: '📊', label: '盈亏平衡测算', sub: '拖一拖·算平台什么时候能打平', path: '/pkgPlatform/breakeven/index' },
    { icon: user?.orgType === 'community' ? '🏛️' : '🏘️', label: user?.orgType === 'community' ? '居委会管理' : '村委管理', sub: user?.orgType === 'community' ? '居委会管理员入口' : '村委管理员入口', path: user?.orgType === 'community' ? '/pkgPlatform/community/index' : '/pages/admin/index', role: 'village_admin' },
  ];

  const visible = menus.filter(m => !m.role || m.role === user?.role);

  const onMenu = (m: Menu) => {
    if (m.help) {
      Taro.showModal({
        title: '帮助与客服',
        content: '客服热线：0398-8888888\n服务时间：周一至周五 9:00-17:00\n也可前往村党群服务中心现场咨询。',
        showCancel: false,
      });
      return;
    }
    if (m.path) Taro.navigateTo({ url: m.path });
    else Taro.showToast({ title: '功能开发中', icon: 'none' });
  };

  const ROLES: { role: UserInfo['role']; org?: 'village' | 'community'; level?: 'officer' | 'leader'; party?: boolean; label: string; emoji: string; tier: string }[] = [
    { role: 'user',           org: 'village',   label: '村民',        emoji: '👤', tier: '用户层（村民 · 居民 平级）' },
    { role: 'user',           org: 'community', label: '居民',        emoji: '🏙️', tier: '用户层（村民 · 居民 平级）' },
    { role: 'village_admin',  org: 'village',   level: 'leader', label: '村委会（审批领导）', emoji: '🏘️', tier: '管理层（村委会 · 居委会 平级）' },
    { role: 'village_admin',  org: 'community', level: 'leader', label: '居委会（审批领导）', emoji: '🏛️', tier: '管理层（村委会 · 居委会 平级）' },
    { role: 'entrepreneur',                     label: '创业者/店主', emoji: '🌟', tier: '其他角色' },
    { role: 'platform_admin',                   label: '平台运营',    emoji: '🏢', tier: '其他角色' },
    { role: 'foundation_admin',                 label: '公益机构管理员', emoji: '🛡️', tier: '其他角色' },
  ];

  const switchRole = (role: UserInfo['role'], org?: 'village' | 'community', level?: 'officer' | 'leader', party?: boolean) => {
    const cur = store.getUser();
    if (!cur) return;
    const nameFor = (): string => {
      if (role === 'foundation_admin') return '公益机构管理员';
      if (role === 'user') return org === 'community' ? '社区居民' : '农村村民';
      if (role === 'village_admin') return org === 'community' ? '居委会主任' : '村委书记';
      if (role === 'entrepreneur') return '创业者冯韵雯';
      return '平台运营';
    };
    const name = nameFor();
    const fam = org ? (org === 'community' ? '张明户' : '王建国户') : undefined;
    const orgName = role === 'foundation_admin' ? '关心下一代体育基金会' : (org ? (org === 'community' ? COMMUNITY_ORG : VILLAGE_ORG) : undefined);
    store.setUser({ ...cur, role, orgType: org, orgName, name, family: fam, isHead: !!org, verified: !!org, adminLevel: level, isPartyMember: !!party });
    setUser(store.getUser());
    Taro.showToast({ title: `已切换为${name}`, icon: 'success' });
  };

  // 游客绑定：扫「一村一码/一社区一码」或输序列号 → 系统自动判定村民/居民
  const resolveBind = (raw: string) => {
    const cur = store.getUser(); if (!cur) return;
    const m = store.matchMember(raw); // 与村委/居委导入的名册比对
    if (m) {
      const isCommunity = m.org === 'community';
      store.setUser({ ...cur, orgType: isCommunity ? 'community' : 'village', orgName: isCommunity ? COMMUNITY_ORG : VILLAGE_ORG, name: m.name || cur.name, family: m.family, isHead: !!m.isHead, verified: true });
      setUser(store.getUser());
      Taro.showModal({ title: '✅ 实名认证成功', content: `已在名册中找到你：\n姓名：${m.name}\n家庭：${m.family}${m.isHead ? '（户主）' : ''}\n归属：${isCommunity ? '社区 · 居委会' : '范庄村 · 村委会'}\n\n身份已核验，可参与全部功能。`, showCancel: false });
    } else {
      const s = String(raw).toUpperCase();
      const isCommunity = s.includes('SQ') || raw.includes('社区') || raw.includes('居');
      // 名册里查无此人：保持「游客（仅可浏览）」，不写入 orgType，避免随意输入即绕过实名门槛
      Taro.showModal({ title: '⚠️ 未在名册中找到', content: `凭证：${raw}\n你不在已导入名册中，暂无法完成实名绑定，当前仍为「游客（仅可浏览）」。请联系${isCommunity ? '居委会' : '村委会'}把你加入名册后再绑定。`, showCancel: false });
    }
  };
  const bindByCode = () => {
    if (process.env.TARO_ENV === 'h5') { Taro.showModal({ title: '扫码绑定', content: '请在微信小程序内扫「一村一码 / 一社区一码」。\n网页端请用「序列号绑定」。', showCancel: false }); return; }
    Taro.scanCode({}).then(res => resolveBind(res.result)).catch(() => { });
  };
  const bindBySn = () => Taro.showModal({ title: '序列号绑定', editable: true, placeholderText: '输入村/社区序列号，如 FZ2026 或 SQ2026', success: (r: any) => { if (r.confirm && r.content) resolveBind(r.content); } } as any);
  // 户主管理本户家庭成员
  const memberScore = (m: any) => { const n = String(m.name || ''); let h = 0; for (let i = 0; i < n.length; i++) h += n.charCodeAt(i); return 200 + (h % 400); };
  const familyScore = () => store.getFamilyMembers().reduce((s: number, m: any) => s + memberScore(m), 0);
  // 全村/社区家庭贡献榜（名册按 family 分组合计；无名册时用演示榜）
  const familyRanking = (): { family: string; score: number }[] => {
    const roster = store.getRoster() as any[];
    let fams: { family: string; score: number }[];
    if (roster.length) {
      const map: Record<string, number> = {};
      roster.forEach((m: any) => { const f = m.family || '未知户'; map[f] = (map[f] || 0) + memberScore(m); });
      fams = Object.keys(map).map(f => ({ family: f, score: map[f] }));
    } else {
      fams = [{ family: '王建国户', score: 1680 }, { family: '李卫东户', score: 1520 }, { family: '赵桂芳户', score: 1390 }, { family: '周伟户', score: 1180 }, { family: '孙秀梅户', score: 960 }];
    }
    return fams.sort((a, b) => b.score - a.score);
  };
  const showRanking = () => {
    const r = familyRanking();
    const list = r.map((f, i) => `${['🥇', '🥈', '🥉'][i] || (i + 1) + '.'} ${f.family} — ${f.score}分${i < 3 ? ' 🏵️五好家庭' : ''}`).join('\n');
    Taro.showModal({ title: '🏆 家庭贡献榜', content: `${store.orgLabel()}以家庭为单元累计贡献，前列评为「五好家庭」：\n\n${list}\n\n贡献 = 全家成员参与消费/志愿/议事/学习/党建等累计。`, showCancel: false });
  };
  // 户主的「家庭成员管理 / 代成员办事」已统一至「家庭档案」页(/pages/family)，此处不再重复入口

  return (
    <View className="page">
      {/* 用户信息卡 */}
      <View className="user-card">
        <View className="avatar">
          <Text style={{ fontSize: '60rpx' }}>👤</Text>
        </View>
        <View className="user-info">
          <Text className="user-name">{user?.name || '未登录'}</Text>
          <Text className="user-phone">{user?.phone || '手机号未绑定'}</Text>
          <View className="role-badge">
            <Text className="role-text">
              {user?.role === 'entrepreneur' ? '创业者' :
               user?.role === 'village_admin' ? (user?.orgType === 'community' ? '居委会管理员' : '村委管理员') :
               user?.role === 'platform_admin' ? '平台管理员' :
               user?.role === 'foundation_admin' ? '公益机构管理员' :
               (user?.orgType ? (user?.orgType === 'community' ? '居民' : '村民') : '普通用户')}
            </Text>
          </View>
        </View>
        <View className="contrib-mini" onClick={() => Taro.navigateTo({ url: '/pages/contribution/index' })}>
          <Text className="contrib-mini-num">{contrib}</Text>
          <Text className="contrib-mini-label">贡献值</Text>
        </View>
      </View>

      {/* 家庭档案：村民/居民 必归属家庭 + 村委会/居委会，户主标注，五好家庭星级 */}
      <View style={{ background: '#fff', borderRadius: '16rpx', margin: '20rpx', padding: '24rpx' }}>
        <Text style={{ fontSize: '27rpx', fontWeight: 800, color: '#14532d' }}>🏠 我的家庭档案</Text>
        {user?.orgType ? (
          <View>
            <View style={{ display: 'flex', justifyContent: 'space-between', marginTop: '18rpx' }}><Text style={{ fontSize: '24rpx', color: '#6b7280' }}>归属组织</Text><Text style={{ fontSize: '24rpx', color: '#1f2937', fontWeight: 600 }}>{user.orgType === 'community' ? (user.orgName || COMMUNITY_ORG) : (user.orgName || VILLAGE_ORG)}</Text></View>
            <View style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12rpx' }}><Text style={{ fontSize: '24rpx', color: '#6b7280' }}>所属家庭</Text><Text style={{ fontSize: '24rpx', color: '#1f2937', fontWeight: 600 }}>{user.family || '未绑定名册'}{user.family ? (user.isHead ? ' · 👑户主' : ' · 家庭成员') : ''}</Text></View>
            <View style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12rpx' }}><Text style={{ fontSize: '24rpx', color: '#6b7280' }}>认证状态</Text><Text style={{ fontSize: '24rpx', fontWeight: 600, color: user.verified ? '#16a34a' : '#f59e0b' }}>{user.verified ? '✅ 已实名认证' : '⚠️ 未认证(不在名册)'}</Text></View>
            <View style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12rpx' }}><Text style={{ fontSize: '24rpx', color: '#6b7280' }}>五好家庭</Text><Text style={{ fontSize: '26rpx', color: '#f59e0b' }}>★★★★★ 五星</Text></View>
            <View style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12rpx' }} onClick={showRanking}><Text style={{ fontSize: '24rpx', color: '#6b7280' }}>家庭贡献 <Text style={{ color: '#16a34a' }}>🏆榜 ›</Text></Text><Text style={{ fontSize: '24rpx', color: '#c81e1e', fontWeight: 700 }}>{familyScore()} 分 · 全家 {store.getFamilyMembers().length} 人</Text></View>
            <View style={{ display: 'flex', flexWrap: 'wrap', gap: '8rpx', marginTop: '14rpx' }}>
              {['爱国守法', '勤劳致富', '家庭和睦', '邻里团结', '移风易俗'].map(t => (<Text key={t} style={{ fontSize: '19rpx', color: '#b45309', background: '#fffbeb', border: '1rpx solid #fde68a', borderRadius: '100rpx', padding: '4rpx 14rpx' }}>{t}</Text>))}
            </View>
            {user.isHead && user.family ? (
              <View style={{ marginTop: '16rpx', background: '#fef2f2', border: '1rpx solid #fecaca', borderRadius: '12rpx', padding: '16rpx 20rpx', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} onClick={() => Taro.navigateTo({ url: '/pages/family/index' })}>
                <Text style={{ fontSize: '24rpx', color: '#c81e1e', fontWeight: 700 }}>👑 户主管理 · 本户 {store.getFamilyMembers().length} 人</Text>
                <Text style={{ fontSize: '22rpx', color: '#c81e1e' }}>管理成员 ›</Text>
              </View>
            ) : user.family ? (
              <Text style={{ display: 'block', marginTop: '14rpx', fontSize: '21rpx', color: '#9ca3af' }}>本户户主：{(store.getFamilyMembers().find((m: any) => m.isHead) || {}).name || '—'} · 家庭事务由户主统一管理</Text>
            ) : null}
          </View>
        ) : (
          <Text style={{ display: 'block', fontSize: '23rpx', color: '#9ca3af', marginTop: '14rpx', lineHeight: 1.6 }}>你当前是游客。扫「一村一码/一社区一码」或在下方角色切换为村民/居民后，系统会自动把你关联到所属家庭与户籍，并显示户主标识、五好家庭星级。</Text>
        )}
      </View>

      {/* 菜单列表 */}
      <View className="menu-list">
        {visible.map(m => (
          <View
            key={m.label}
            className="menu-item"
            onClick={() => onMenu(m)}
          >
            <Text className="menu-icon">{m.icon}</Text>
            <View className="menu-text">
              <Text className="menu-label">{m.label}</Text>
              <Text className="menu-sub">{m.sub}</Text>
            </View>
            <Text className="menu-arrow">›</Text>
          </View>
        ))}
      </View>

      {/* 我的身份（游客 → 扫码/序列号绑定 → 自动村民/居民） */}
      <View className="dev-card">
        <Text className="dev-title">🎫 我的身份</Text>
        {user?.orgType ? (
          <View style={{ padding: '16rpx 0' }}>
            <Text style={{ fontSize: '28rpx', color: '#14532d', fontWeight: 700 }}>已绑定：{user.orgType === 'community' ? '🏙️ 社区居民（居委会）' : '🌾 农村村民（村委会）'}</Text>
            <Text style={{ display: 'block', fontSize: '22rpx', color: '#6b7280', marginTop: '6rpx' }}>{user.orgName || ''}</Text>
          </View>
        ) : (
          <View style={{ padding: '12rpx 0' }}>
            <Text style={{ display: 'block', fontSize: '23rpx', color: '#6b7280', lineHeight: 1.6, marginBottom: '16rpx' }}>当前为 <Text style={{ color: '#ea580c', fontWeight: 700 }}>游客（未绑定）</Text>。扫「一村一码/一社区一码」或输序列号，系统自动判定你是村民还是居民。</Text>
            <View style={{ display: 'flex', gap: '16rpx' }}>
              <View style={{ flex: 1, background: '#16a34a', borderRadius: '100rpx', padding: '18rpx 0', textAlign: 'center' }} onClick={bindByCode}><Text style={{ color: '#fff', fontSize: '26rpx', fontWeight: 700 }}>📷 扫码绑定</Text></View>
              <View style={{ flex: 1, background: '#fff', border: '2rpx solid #16a34a', borderRadius: '100rpx', padding: '18rpx 0', textAlign: 'center' }} onClick={bindBySn}><Text style={{ color: '#16a34a', fontSize: '26rpx', fontWeight: 700 }}>🔢 序列号绑定</Text></View>
            </View>
          </View>
        )}
      </View>

      {/* 演示角色切换（DEMO_MODE=false 正式版隐藏，角色由后台真实分配） */}
      {DEMO_MODE && <View className="dev-card">
        <Text className="dev-title">🛠 演示模式 · 切换角色</Text>
        {['用户层（村民 · 居民 平级）', '管理层（村委会 · 居委会 平级）', '其他角色'].map(tier => (
          <View key={tier}>
            <Text style={{ fontSize: '22rpx', color: '#9ca3af', display: 'block', margin: '16rpx 0 8rpx' }}>{tier}</Text>
            <View className="role-grid">
              {ROLES.filter(r => r.tier === tier).map(r => {
                const active = user?.role === r.role && (!r.org || (user?.orgType || 'village') === r.org);
                return (
                  <View
                    key={r.role + (r.org || '')}
                    className={`role-btn ${active ? 'role-active' : ''}`}
                    onClick={() => switchRole(r.role, r.org, r.level, r.party)}
                  >
                    <Text className="role-emoji">{r.emoji}</Text>
                    <Text className="role-name">{r.label}</Text>
                    {active && <Text className="role-check">✓</Text>}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
        <Text className="dev-hint">真实上线后角色由后台分配，此区块可删除</Text>
      </View>}

      <Button className="btn-logout" onClick={logout}>退出登录</Button>

      <Text style={{ display: 'block', textAlign: 'center', fontSize: '20rpx', color: '#c0c5cc', marginTop: '24rpx' }}>供享村社 · {APP_VERSION}</Text>

      <View className="tabbar-placeholder" />
      <TabBar active="profile" />
    </View>
  );
}
