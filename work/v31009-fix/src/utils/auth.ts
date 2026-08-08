/**
 * 登录相关 API
 *
 * 后端需实现的接口：
 *
 * POST /api/auth/wx-login
 *   body: { code: string }               ← wx.login() 拿到的 code
 *   return: { token, user }
 *
 * POST /api/auth/send-sms
 *   body: { phone: string }
 *   return: { success: true }
 *
 * POST /api/auth/phone-login
 *   body: { phone, code }
 *   return: { token, user }
 *
 * GET /api/auth/me                       ← 用 token 获取最新用户信息（含最新 role）
 *   return: { user }
 */
import Taro from '@tarojs/taro';
import { post, get } from './request';
import { store, UserInfo } from '../store';

// 后端返回的用户+token结构
interface AuthResult {
  token: string;
  user: UserInfo;
}

// ── 微信一键登录 ───────────────────────────────────────────────────────────
export async function wxLogin(): Promise<UserInfo> {
  return new Promise((resolve, reject) => {
    Taro.login({
      success: async ({ code }) => {
        if (!code) { reject(new Error('获取code失败')); return; }
        try {
          const result = await post<AuthResult>('/api/auth/wx-login', { code });
          store.setToken(result.token);
          store.setUser(result.user);
          resolve(result.user);
        } catch (e) {
          reject(e);
        }
      },
      fail: (e) => reject(e),
    });
  });
}

// ── 发送短信验证码 ─────────────────────────────────────────────────────────
export async function sendSmsCode(phone: string): Promise<void> {
  await post('/api/auth/send-sms', { phone });
}

// ── 手机号验证码登录 ───────────────────────────────────────────────────────
export async function phoneLogin(phone: string, code: string): Promise<UserInfo> {
  const result = await post<AuthResult>('/api/auth/phone-login', { phone, code });
  store.setToken(result.token);
  store.setUser(result.user);
  return result.user;
}

// ── 微信授权手机号登录（推荐，一步完成）────────────────────────────────────
// 调用时机：用户点击 <Button openType="getPhoneNumber"> 后
export async function wxPhoneLogin(encryptedData: string, iv: string): Promise<UserInfo> {
  // 先获取 wx.login code，再把 code+加密手机号一起发给后端
  return new Promise((resolve, reject) => {
    Taro.login({
      success: async ({ code }) => {
        if (!code) { reject(new Error('获取code失败')); return; }
        try {
          // 后端同时用 code 换 session_key，再解密 encryptedData 得到真实手机号
          const result = await post<AuthResult>('/api/auth/wx-phone-login', {
            code, encryptedData, iv
          });
          store.setToken(result.token);
          store.setUser(result.user);
          resolve(result.user);
        } catch (e) { reject(e); }
      },
      fail: (e) => reject(e),
    });
  });
}

// ── 刷新当前用户信息（每次进入首页调用，确保 role 最新）─────────────────────
export async function refreshUser(): Promise<UserInfo | null> {
  try {
    const user = await get<UserInfo>('/api/auth/me');
    store.setUser(user);
    return user;
  } catch {
    return null;
  }
}
