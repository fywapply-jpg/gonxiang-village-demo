/**
 * 微信云开发统一封装
 *
 * ⭐ 用法：在微信开发者工具开通"云开发"、创建环境后，把环境ID填到下面 CLOUD_ENV，
 *    全小程序即自动从「本地演示数据」切换到「云端真实数据（多人共享、跨设备）」。
 *    CLOUD_ENV 留空时 = 演示模式，完全使用本地 mock，不影响现有演示。
 */
import Taro from '@tarojs/taro';

// 构建时通过 TARO_APP_CLOUD_ENV 注入（形如 'gonxiang-prod-9xxxx'）。
export const CLOUD_ENV = process.env.TARO_APP_CLOUD_ENV || '';
export const CLOUD_ENABLED: boolean = !!CLOUD_ENV;

// 云开发 API 由微信运行时注入，用 any 规避类型缺失
function wxCloud(): any {
  return (Taro as any).cloud;
}

let inited = false;
export function initCloud(): void {
  if (!CLOUD_ENABLED || inited) return;
  const c = wxCloud();
  if (c && typeof c.init === 'function') {
    c.init({ env: CLOUD_ENV, traceUser: true });
    inited = true;
  }
}

/** 统一调用云函数，返回云函数 result */
export async function callFn<T = any>(name: string, data: Record<string, any> = {}): Promise<T> {
  const c = wxCloud();
  if (!c) throw new Error('云开发未初始化');
  const res = await c.callFunction({ name, data });
  return res.result as T;
}

// ── 业务接口封装 ──────────────────────────────────────────────────────────────
export interface CloudUser {
  _id?: string; _openid?: string;
  name: string; phone: string; role: string; avatar?: string;
}

export const cloudApi = {
  // 账户：用 openid 自动注册/登录
  login: () => callFn<{ user: CloudUser }>('login'),

  // 村民议事：真正多人共享的发帖 + 投票
  proposals: {
    list: () => callFn<{ list: any[] }>('proposals', { action: 'list' }),
    create: (title: string, desc: string, by: string) =>
      callFn<{ _id: string }>('proposals', { action: 'create', title, desc, by }),
    vote: (id: string, opt: 'agree' | 'oppose') =>
      callFn<{ ok?: boolean; error?: string }>('proposals', { action: 'vote', id, opt }),
  },

  // 贡献值：云端账户 + 流水 + 全村排名
  contribution: {
    get: () => callFn<{ account: any; rank: number }>('contribution', { action: 'get' }),
    add: (title: string, value: number, dim: string) =>
      callFn<{ ok: boolean; total: number }>('contribution', { action: 'add', title, value, dim }),
  },
};
