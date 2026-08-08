import Taro from '@tarojs/taro';
import { CLOUD_ENV, initCloud } from './cloud';
import { store } from '../store';

export const BACKEND_SYNC_ENABLED = process.env.TARO_APP_BACKEND_SYNC === 'true';
const CLOUD_SERVICE = process.env.TARO_APP_CLOUD_SERVICE || 'gonxiang-api';

type Method = 'GET' | 'POST';
type Envelope<T> = {
  code?: number;
  data?: T;
  error?: { code: string; message: string };
  message?: string;
};

async function rawRequest<T>(
  path: string,
  method: Method = 'GET',
  data?: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<T> {
  if (!BACKEND_SYNC_ENABLED) throw new Error('后端同步尚未启用');
  if (!CLOUD_ENV) throw new Error('未配置微信云开发环境');
  initCloud();
  const token = store.getToken();
  const result = await (Taro as any).cloud.callContainer({
    config: { env: CLOUD_ENV },
    path,
    method,
    data,
    header: {
      'X-WX-SERVICE': CLOUD_SERVICE,
      'Content-Type': 'application/json',
      ...(token && token !== 'demo' ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const body = result.data as Envelope<T>;
  if (result.statusCode < 200 || result.statusCode >= 300 || body.error || (body.code !== undefined && body.code !== 0)) {
    if (result.statusCode === 401) store.clearUser();
    throw new Error(body.error?.message || body.message || `请求失败 ${result.statusCode}`);
  }
  return body.data as T;
}

export interface BackendProfile {
  userId: string;
  memberships: Array<{
    id: string;
    organizationId: string;
    organizationName: string;
    organizationType: string;
    roleId?: string;
    roleName?: string;
  }>;
  grants: Array<{ permission: string; organizationPath: string }>;
}

export interface BackendOrganization {
  id: string;
  name: string;
  type: string;
  parentId: string | null;
  path: string;
  status: 'ACTIVE';
}

export interface BackendProduct {
  id: string;
  name: string;
  unit: string;
  priceCents: number;
  stock: number;
  organizationId: string;
  merchantName: string;
}

export type BackendOrderStatus =
  | 'PENDING_PAYMENT' | 'PAID' | 'SHIPPED' | 'DELIVERED'
  | 'REFUNDING' | 'REFUNDED' | 'CANCELLED';

export interface BackendOrderItem {
  productId?: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  subtotalCents: number;
  merchantName?: string;
}

export interface BackendOrder {
  id: string;
  orderNo: string;
  organizationId: string;
  status: BackendOrderStatus;
  totalCents: number;
  version: number;
  createdAt: string;
  items: BackendOrderItem[];
  merchantName: string;
}

export interface BackendOrderCommandResult {
  id: string;
  status: BackendOrderStatus;
  version?: number;
  replayed?: boolean;
}

export interface BackendContributionEntry {
  id: string;
  referenceType: string;
  referenceId: string;
  points: number;
  state: 'PENDING' | 'AVAILABLE' | 'REVERSED';
  occurredAt: string;
}

export interface BackendContributionAccount {
  pendingPoints: number;
  availablePoints: number;
  entries: BackendContributionEntry[];
}

export interface BackendNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  targetPath: string | null;
  status: 'SENT' | 'READ';
  createdAt: string;
}

export type BackendGovernanceStatus = 'DRAFT' | 'ASSIGNED' | 'ACCEPTED' | 'IN_PROGRESS' | 'PENDING_VERIFICATION' | 'CLOSED' | 'RETURNED' | 'ESCALATED';
export interface BackendGovernanceCase {
  id: string;
  caseNo: string;
  title: string;
  description: string;
  urgency: 'NORMAL' | 'URGENT' | 'CRITICAL';
  status: BackendGovernanceStatus;
  originOrganizationId: string;
  originOrganizationName: string;
  assigneeOrganizationId: string | null;
  assigneeOrganizationName: string | null;
  version: number;
  dueAt: string | null;
  createdAt: string;
}

export async function establishBackendSession(): Promise<BackendProfile> {
  const session = await rawRequest<{ accessToken: string; expiresAt: string }>('/api/v1/auth/wechat/session', 'POST');
  store.setToken(session.accessToken);
  return backendApi.me();
}

export const backendApi = {
  me: () => rawRequest<BackendProfile>('/api/v1/me'),
  organizations: () => rawRequest<BackendOrganization[]>('/api/v1/organizations'),
  products: () => rawRequest<BackendProduct[]>('/api/v1/products'),
  orders: {
    list: () => rawRequest<BackendOrder[]>('/api/v1/orders'),
    detail: (id: string) => rawRequest<BackendOrder>(`/api/v1/orders/${id}`),
    create: (organizationId: string, items: Array<{ productId: string; quantity: number }>, idempotencyKey: string) =>
      rawRequest<Pick<BackendOrder, 'id' | 'orderNo' | 'status' | 'totalCents'>>('/api/v1/orders', 'POST', { organizationId, items }, { 'Idempotency-Key': idempotencyKey }),
    cancel: (id: string) =>
      rawRequest<BackendOrderCommandResult>(`/api/v1/orders/${id}/cancel`, 'POST'),
    confirmReceipt: (id: string) =>
      rawRequest<BackendOrderCommandResult>(`/api/v1/orders/${id}/confirm-receipt`, 'POST'),
    requestRefund: (id: string, reason: string) =>
      rawRequest<{ refundId: string; orderStatus: BackendOrderStatus; status: 'REQUESTED' }>(`/api/v1/orders/${id}/request-refund`, 'POST', { reason }),
  },
  contributions: () => rawRequest<BackendContributionAccount>('/api/v1/contributions/me'),
  notifications: {
    list: () => rawRequest<BackendNotification[]>('/api/v1/notifications'),
    read: (id: string) => rawRequest<{ id: string; status: 'READ' }>(`/api/v1/notifications/${id}/read`, 'POST'),
    readAll: () => rawRequest<{ affected: number }>('/api/v1/notifications/read-all', 'POST'),
  },
  governanceCases: {
    list: () => rawRequest<BackendGovernanceCase[]>('/api/v1/governance-cases'),
    create: (organizationId: string, title: string, description: string, urgency: BackendGovernanceCase['urgency'] = 'NORMAL') =>
      rawRequest<Pick<BackendGovernanceCase, 'id' | 'caseNo' | 'status'>>('/api/v1/governance-cases', 'POST', { organizationId, title, description, urgency }),
    command: (id: string, command: 'assign' | 'accept' | 'progress' | 'submit-verification' | 'verify' | 'return', data: Record<string, unknown> = {}) =>
      rawRequest<Pick<BackendGovernanceCase, 'id' | 'status' | 'version'>>(`/api/v1/governance-cases/${id}/${command}`, 'POST', data),
  },
};
