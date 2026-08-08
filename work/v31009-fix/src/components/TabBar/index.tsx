import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

export interface TabDef { key: string; label: string; icon: string; url: string; }

// 村委书记（村委管理员）底部导航
const VILLAGE_ADMIN_TABS: TabDef[] = [
  { key: 'index', label: '首页', icon: '🏠', url: '/pages/index/index' },
  { key: 'party', label: '党建', icon: '🚩', url: '/pkgParty/party/index' },
  { key: 'affairs', label: '村务公开', icon: '📋', url: '/pages/affairs/index' },
  { key: 'help-store', label: '帮扶小店', icon: '🛒', url: '/pages/help-store/index' },
  { key: 'achievement', label: '成就', icon: '🏆', url: '/pages/achievement/index' },
  { key: 'profile', label: '我的', icon: '👤', url: '/pages/profile/index' },
];

// 居委会管理员 底部导航（社区版：隐藏涉农的帮扶小店/成就，换成社区公开）
const COMMUNITY_ADMIN_TABS: TabDef[] = [
  { key: 'index', label: '首页', icon: '🏠', url: '/pages/index/index' },
  { key: 'party', label: '党建', icon: '🚩', url: '/pkgParty/party/index' },
  { key: 'affairs', label: '社区公开', icon: '📋', url: '/pages/affairs/index' },
  { key: 'profile', label: '我的', icon: '👤', url: '/pages/profile/index' },
];

// 普通村民 / 消费者 底部导航（「供享小卖部」= 购物视图，只能下单）
const USER_TABS: TabDef[] = [
  { key: 'index', label: '首页', icon: '🏠', url: '/pages/index/index' },
  { key: 'my-store', label: '供享大集', icon: '🛒', url: '/pkgShop/my-store/index' },
  { key: 'jobs', label: '就业招工', icon: '💼', url: '/pages/jobs/index' },
  { key: 'barter', label: '置换', icon: '🔄', url: '/pages/barter/index' },
  { key: 'cart', label: '购物车', icon: '🛒', url: '/pages/cart/index' },
  { key: 'profile', label: '我的', icon: '👤', url: '/pages/profile/index' },
];

// 创业者 / 店主 底部导航（「我的小卖部」= 管理后台，可上下架）
const ENTREPRENEUR_TABS: TabDef[] = [
  { key: 'index', label: '首页', icon: '🏠', url: '/pages/index/index' },
  { key: 'my-store', label: '我的小卖部', icon: '🏪', url: '/pkgShop/my-store/index' },
  { key: 'jobs', label: '就业招工', icon: '💼', url: '/pages/jobs/index' },
  { key: 'barter', label: '置换', icon: '🔄', url: '/pages/barter/index' },
  { key: 'cart', label: '购物车', icon: '🛒', url: '/pages/cart/index' },
  { key: 'profile', label: '我的', icon: '👤', url: '/pages/profile/index' },
];

// 平台管理员 底部导航（直达运营后台四大板块）
const PLATFORM_ADMIN_TABS: TabDef[] = [
  { key: 'index', label: '首页', icon: '🏠', url: '/pages/index/index' },
  { key: 'pf-overview', label: '总览', icon: '🏢', url: '/pkgPlatform/platform/index?sec=overview' },
  { key: 'pf-village', label: '村庄', icon: '🏘️', url: '/pkgPlatform/platform/index?sec=village' },
  { key: 'pf-settle', label: '结算', icon: '💰', url: '/pkgPlatform/platform/index?sec=settle' },
  { key: 'pf-perm', label: '权限', icon: '🔑', url: '/pkgPlatform/platform/index?sec=perm' },
  { key: 'profile', label: '我的', icon: '👤', url: '/pages/profile/index' },
];

export default function TabBar({ active }: { active: string }) {
  // 直接读取当前角色，不用 useState 缓存：
  // 演示模式在「我的」页切换角色时，父页面会重渲染，本组件随之重渲染并读到最新角色，
  // 底部栏即时切换。若用 useState + useDidShow，同页切换角色不会刷新（useDidShow 只在页面切入时触发）。
  const role = store.getUser()?.role || 'user';

  const tabs =
    role === 'village_admin' ? (store.isCommunity() ? COMMUNITY_ADMIN_TABS : VILLAGE_ADMIN_TABS) :
    role === 'platform_admin' ? PLATFORM_ADMIN_TABS :
    role === 'entrepreneur' ? ENTREPRENEUR_TABS :
    USER_TABS;

  // 当前页若不是该角色的某个 tab，则不显示底部栏（说明是从别处 push 进来的子页面）
  if (!tabs.some(t => t.key === active)) return null;

  const go = (t: TabDef) => {
    if (t.key === active) return;
    Taro.reLaunch({ url: t.url });
  };

  return (
    <View className="tabbar">
      {tabs.map(t => (
        <View key={t.key} className="tabbar-item" onClick={() => go(t)}>
          <Text className={`tabbar-icon ${active === t.key ? 'tabbar-icon-on' : ''}`}>{t.icon}</Text>
          <Text className={`tabbar-label ${active === t.key ? 'tabbar-label-on' : ''}`}>{t.label}</Text>
        </View>
      ))}
    </View>
  );
}
