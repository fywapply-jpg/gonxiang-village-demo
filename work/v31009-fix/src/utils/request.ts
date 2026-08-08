/**
 * 统一请求封装
 * - 自动带上 Authorization token
 * - 401 自动跳登录页
 * - 统一错误提示
 */
import Taro from '@tarojs/taro';
import { store } from '../store';

// ── 修改这里换成你的真实后端地址 ─────────────────────────────────────────────
export const BASE_URL = 'https://api.gonxiang.com'; // 上线前替换

// ── 核心请求函数 ──────────────────────────────────────────────────────────────
interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, any>;
  showError?: boolean;
}

export async function request<T = any>(opts: RequestOptions): Promise<T> {
  const token = store.getToken();

  return new Promise((resolve, reject) => {
    Taro.request({
      url: BASE_URL + opts.url,
      method: opts.method || 'GET',
      data: opts.data,
      header: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      success: (res) => {
        if (res.statusCode === 401) {
          // token 过期 → 清除登录态跳登录页
          store.clearUser();
          Taro.reLaunch({ url: '/pages/login/index' });
          reject(new Error('未登录'));
          return;
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const body = res.data as any;
          if (body.code === 0 || body.success) {
            resolve(body.data as T);
          } else {
            if (opts.showError !== false) {
              Taro.showToast({ title: body.message || '请求失败', icon: 'none' });
            }
            reject(new Error(body.message));
          }
        } else {
          if (opts.showError !== false) {
            Taro.showToast({ title: `服务器错误 ${res.statusCode}`, icon: 'none' });
          }
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      },
      fail: (err) => {
        Taro.showToast({ title: '网络连接失败', icon: 'none' });
        reject(err);
      },
    });
  });
}

export const get = <T>(url: string, data?: Record<string, any>) =>
  request<T>({ url, method: 'GET', data });

export const post = <T>(url: string, data?: Record<string, any>) =>
  request<T>({ url, method: 'POST', data });

export const put = <T>(url: string, data?: Record<string, any>) =>
  request<T>({ url, method: 'PUT', data });
