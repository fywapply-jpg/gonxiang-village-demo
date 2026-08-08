import { Component, PropsWithChildren } from 'react';
import Taro from '@tarojs/taro';
import { initCloud } from './utils/cloud';
import { DEMO_MODE } from './config/version';
import { VILLAGE_ORG, COMMUNITY_ORG } from './config/region';
import { BACKEND_SYNC_ENABLED, establishBackendSession } from './utils/backend';
import { store } from './store';
import './app.css';

class App extends Component<PropsWithChildren> {
  constructor(props: PropsWithChildren) {
    super(props);
    /*
     * H5 演示页跳转硬化：
     * 微信内置浏览器连续打开很多功能后，Taro 页面栈达到上限会让 navigateTo
     * 看起来“点了没反应”。演示版达到 8 层时改用 redirectTo，自动腾出页面栈。
     * 仅影响 H5 演示，不改变正式微信小程序端的导航行为。
     */
    if (DEMO_MODE && process.env.TARO_ENV === 'h5') {
      const taroAny = Taro as any;
      if (!taroAny.__gxNavigateHardened) {
        const rawNavigateTo = Taro.navigateTo.bind(Taro);
        const rawRedirectTo = Taro.redirectTo.bind(Taro);
        taroAny.navigateTo = (options: any) => {
          const pages = (Taro.getCurrentPages && Taro.getCurrentPages()) || [];
          return pages.length >= 8 ? rawRedirectTo(options) : rawNavigateTo(options);
        };
        taroAny.__gxNavigateHardened = true;
      }
    }
    // H5 演示版：启动即免登录注入演示账号，方便直接分享给他人浏览
    // （小程序端不受影响，仍走正常登录）
    if (DEMO_MODE && process.env.TARO_ENV === 'h5' && !Taro.getStorageSync('gx_token')) {
      // 演示版可用 ?role=entrepreneur / village_admin / platform_admin 切换角色视图（仅限已知角色）
      const ROLES = ['user', 'entrepreneur', 'village_admin', 'platform_admin', 'foundation_admin'];
      let role: any = 'user';
      try {
        const m = typeof window !== 'undefined' && window.location.search.match(/role=([a-z_]+)/);
        if (m && ROLES.includes(m[1])) role = m[1];
      } catch (e) { /* noop */ }
      const names: any = { user: '演示村民', entrepreneur: '演示店主', village_admin: '村委管理员', platform_admin: '平台运营', foundation_admin: '公益机构监管' };
      // ?org=village / community：设置归属；仅普通村民/居民(role=user)才注入「已认证户主 + 家庭名册」，避免给管理/商家角色造出矛盾身份
      let org: any = undefined;
      try { const mo = typeof window !== 'undefined' && window.location.search.match(/org=(village|community)/); if (mo) org = mo[1]; } catch (e) { /* noop */ }
      const u: any = { id: '1001', name: names[role] || '演示用户', phone: '', role };
      if (org) {
        u.orgType = org;
        u.orgName = org === 'community' ? COMMUNITY_ORG : VILLAGE_ORG;
        if (role === 'user') {
          u.family = org === 'community' ? '示范社区·张明户' : '范庄村·王建国户';
          u.isHead = true; u.verified = true;
          u.name = org === 'community' ? '张明' : '王建国';
          Taro.setStorageSync('gx_roster', org === 'community'
            ? [{ name: '张明', family: '示范社区·张明户', isHead: true, sn: 'SQ001', org: 'community' }, { name: '张丽', family: '示范社区·张明户', isHead: false, sn: 'SQ002', org: 'community' }]
            : [{ name: '王建国', family: '范庄村·王建国户', isHead: true, sn: 'FZ001', org: 'village' }, { name: '王秀兰', family: '范庄村·王建国户', isHead: false, sn: 'FZ002', org: 'village' }, { name: '王小磊', family: '范庄村·王建国户', isHead: false, sn: 'FZ003', org: 'village' }]);
        }
      }
      Taro.setStorageSync('gx_token', 'demo');
      Taro.setStorageSync('gx_user', u);
    }
  }

  componentDidMount() {
    // 初始化云开发（CLOUD_ENV 未配置时自动跳过，走本地演示）
    initCloud();
    // 基金会专项版入口：扫带「?org=foundation」的专属小程序码直达「社会公益」监管平台，
    // 免登录、注入只读「基金会监管」身份、跳过登录跳转（社会公益页 foundationMode 会锁定监管视角）。
    const launch: any = (Taro.getLaunchOptionsSync && Taro.getLaunchOptionsSync()) || {};
    if (DEMO_MODE && launch.query && launch.query.org === 'foundation') {
      if (!Taro.getStorageSync('gx_token')) {
        Taro.setStorageSync('gx_token', 'foundation');
        Taro.setStorageSync('gx_user', { id: 'fund', name: '公益机构管理员', phone: '', role: 'foundation_admin', orgName: '公益机构管理中心' });
      }
      return;
    }
    if (BACKEND_SYNC_ENABLED && process.env.TARO_ENV !== 'h5') {
      establishBackendSession()
        .then(profile => {
          const primary = profile.memberships.find(item => item.roleId) || profile.memberships[0];
          const roleName = primary?.roleName || '';
          const organizationType = primary?.organizationType;
          const role = /(总平台|省级|市州|县区|乡镇)/.test(roleName)
            ? 'platform_admin'
            : /(村社|村委|居委)/.test(roleName) ? 'village_admin' : 'user';
          store.setUser({
            ...store.getUser(),
            id: profile.userId,
            role,
            orgName: primary?.organizationName || store.getUser()?.orgName,
            orgType: organizationType === 'COMMUNITY' ? 'community' : organizationType === 'VILLAGE' ? 'village' : store.getUser()?.orgType,
            verified: profile.memberships.length > 0,
            backendPermissions: [...new Set(profile.grants.map(item => item.permission))],
            backendOrganizationId: primary?.organizationId,
            backendRoleName: primary?.roleName,
          } as any);
        })
        .catch(() => Taro.showToast({ title: '后端会话建立失败', icon: 'none' }));
      return;
    }
    // 未启用后端时保留 v3.1102 演示版原有登录流程。
    const token = Taro.getStorageSync('gx_token');
    if (!token) {
      Taro.reLaunch({ url: '/pages/login/index' });
    }
  }

  componentDidShow() {}
  componentDidHide() {}

  render() {
    return this.props.children;
  }
}

export default App;
