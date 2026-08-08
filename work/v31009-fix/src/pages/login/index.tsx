import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, Button, Image, Input } from '@tarojs/components';
import { store } from '../../store';
import { wxLogin, wxPhoneLogin, sendSmsCode, phoneLogin } from '../../utils/auth';
import { BASE_URL } from '../../utils/request';
import { cloudApi, CLOUD_ENABLED } from '../../utils/cloud';
import villageBanner from '../../assets/village-banner.jpg';
import './index.css';

// 是否已接入真实后端：BASE_URL 还是占位地址时 = false（走演示模式），
// 换成真实后端地址后自动变 true（走真实接口）。
const IS_PROD = BASE_URL !== 'https://api.gonxiang.com';

export default function LoginPage() {
  const [tab, setTab] = useState<'wechat' | 'phone'>('wechat');
  const [agree, setAgree] = useState(false);
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const goHome = () => Taro.reLaunch({ url: '/pages/index/index' });

  // ── 微信一键登录 ──────────────────────────────────────────────────────────
  const wechatLogin = async () => {
    if (!agree) { setError('请先阅读并勾选下方协议'); return; }
    setLoading(true); setError('');
    try {
      if (CLOUD_ENABLED) {
        // 云开发：调 login 云函数，用 openid 真实账户登录（跨设备同一个你）
        const { user } = await cloudApi.login();
        store.setToken('cloud_' + (user._openid || Date.now()));
        store.setUser({ id: user._id || '1001', name: user.name, phone: user.phone, role: (user.role as any) || 'user' });
      } else if (IS_PROD) {
        await wxLogin(); // 真实：wx.login code → 后端换 openid → 返回 JWT
      } else {
        // 演示降级
        await new Promise(r => setTimeout(r, 800));
        store.setToken('demo_' + Date.now());
        store.setUser({ id: '1001', name: '游客·待绑定', phone: '', role: 'user' });
      }
      goHome();
    } catch (e: any) {
      setError(e.message || '微信登录失败');
    } finally { setLoading(false); }
  };

  // ── 微信授权手机号（一步完成注册+登录，最推荐）───────────────────────────
  const onGetPhoneNumber = async (e: any) => {
    if (e.detail.errMsg !== 'getPhoneNumber:ok') { setError('未授权手机号'); return; }
    setLoading(true); setError('');
    try {
      if (CLOUD_ENABLED) {
        const { user } = await cloudApi.login();
        store.setToken('cloud_' + (user._openid || Date.now()));
        store.setUser({ id: user._id || '1002', name: user.name, phone: user.phone, role: (user.role as any) || 'user' });
      } else if (IS_PROD) {
        await wxPhoneLogin(e.detail.encryptedData, e.detail.iv);
      } else {
        store.setToken('demo_' + Date.now());
        store.setUser({ id: '1002', name: '手机用户', phone: '138****', role: 'user' });
      }
      goHome();
    } catch (e: any) {
      setError(e.message || '授权失败');
    } finally { setLoading(false); }
  };

  // ── 发送短信验证码 ─────────────────────────────────────────────────────────
  const sendCode = async () => {
    if (!phone.match(/^1[3-9]\d{9}$/)) { setError('请输入正确的手机号'); return; }
    setError('');
    try {
      if (IS_PROD) {
        await sendSmsCode(phone); // 真实短信
      }
    } catch (e: any) { setError(e.message || '发送失败'); return; }
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timer); return 0; }
        return c - 1;
      });
    }, 1000);
    Taro.showToast({ title: IS_PROD ? '验证码已发送' : '验证码已发送（演示：任意6位）', icon: 'none' });
  };

  // ── 验证码登录 ────────────────────────────────────────────────────────────
  const submitPhoneLogin = async () => {
    if (code.length < 6) { setError('请输入6位验证码'); return; }
    setLoading(true); setError('');
    try {
      if (IS_PROD) {
        await phoneLogin(phone, code);
      } else {
        await new Promise(r => setTimeout(r, 800));
        store.setToken('demo_' + Date.now());
        store.setUser({ id: '1003', name: phone.slice(0, 3) + '****', phone, role: 'user' });
      }
      goHome();
    } catch (e: any) {
      setError(e.message || '验证码错误');
    } finally { setLoading(false); }
  };

  return (
    <View className="page">
      {/* Logo */}
      <View className="logo-area">
        <Image className="logo-banner" src={villageBanner} mode="widthFix" />
        <Text className="logo-sub">连接城乡 助农惠民</Text>
      </View>

      {/* 协议勾选（注册强制同意） */}
      <View style={{ display: 'flex', alignItems: 'center', gap: '10rpx', width: '100%', margin: '0 0 24rpx', padding: '0 4rpx' }} onClick={() => setAgree(!agree)}>
        <View style={{ width: '32rpx', height: '32rpx', borderRadius: '50%', border: agree ? 'none' : '2rpx solid #d1d5db', background: agree ? '#16a34a' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{agree ? <Text style={{ color: '#fff', fontSize: '20rpx' }}>✓</Text> : null}</View>
        <Text style={{ fontSize: '21rpx', color: '#6b7280' }}>我已阅读并同意<Text style={{ color: '#16a34a' }} onClick={(e: any) => { e.stopPropagation(); Taro.navigateTo({ url: '/pages/privacy/index' }); }}>《用户协议》《隐私政策》《免责声明》</Text></Text>
      </View>

      {/* Tab 切换 */}
      <View className="tab-bar">
        <View className={`tab ${tab === 'wechat' ? 'active' : ''}`} onClick={() => setTab('wechat')}>
          <Text>微信登录</Text>
        </View>
        <View className={`tab ${tab === 'phone' ? 'active' : ''}`} onClick={() => setTab('phone')}>
          <Text>手机登录</Text>
        </View>
      </View>

      {error ? <Text className="error">{error}</Text> : null}

      {tab === 'wechat' ? (
        <View className="form">
          {/* 微信一键登录 */}
          <Button
            className="btn-wechat"
            loading={loading}
            onClick={wechatLogin}
          >
            <Text className="btn-text">微信一键登录</Text>
          </Button>

          {/* 微信原生获取手机号按钮（需要用户授权） */}
          {process.env.TARO_ENV !== 'h5' && (
            <Button
              className="btn-phone-wx"
              openType="getPhoneNumber"
              onGetPhoneNumber={onGetPhoneNumber}
            >
              <Text className="btn-text">微信授权手机号</Text>
            </Button>
          )}

          <Text className="hint">登录即表示同意《用户协议》和《隐私政策》</Text>
        </View>
      ) : (
        <View className="form">
          <View className="input-wrap">
            <Text className="input-label">手机号</Text>
            <Input
              className="input"
              type="number"
              maxlength={11}
              placeholder="请输入手机号"
              value={phone}
              onInput={e => setPhone(e.detail.value)}
            />
          </View>
          <View className="input-wrap code-wrap">
            <Text className="input-label">验证码</Text>
            <Input
              className="input code-input"
              type="number"
              maxlength={6}
              placeholder="6位验证码"
              value={code}
              onInput={e => setCode(e.detail.value)}
            />
            <View
              className={`btn-send ${countdown > 0 ? 'disabled' : ''}`}
              onClick={countdown === 0 ? sendCode : undefined}
            >
              <Text>{countdown > 0 ? `${countdown}s` : '获取验证码'}</Text>
            </View>
          </View>
          <Button
            className="btn-submit"
            loading={loading}
            onClick={submitPhoneLogin}
          >
            <Text className="btn-text">登录 / 注册</Text>
          </Button>
          <Text className="hint">未注册手机号将自动注册账号</Text>
        </View>
      )}
    </View>
  );
}
