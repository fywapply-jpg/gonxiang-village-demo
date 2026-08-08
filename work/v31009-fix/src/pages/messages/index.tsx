import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import './index.css';
import { backendApi, BACKEND_SYNC_ENABLED } from '../../utils/backend';

interface Msg { id: string | number; icon: string; title: string; desc: string; time: string; unread: boolean; targetPath?: string | null; }
const INIT: Msg[] = [
  { id: 1, icon: '🚩', title: '主题党日活动通知', desc: '12月1日冬季慰问困难群众志愿服务活动开始报名', time: '10分钟前', unread: true },
  { id: 2, icon: '⭐', title: '贡献值到账', desc: '参与村民议事 +60 贡献值已上链存证', time: '2小时前', unread: true },
  { id: 3, icon: '📋', title: '村务公开更新', desc: '2024年村集体收入分配公示已发布', time: '昨天', unread: false },
  { id: 4, icon: '📦', title: '订单已发货', desc: '灵宝核桃2斤装 已从郑州仓库出库', time: '2天前', unread: false },
  { id: 5, icon: '🔔', title: '家庭医生签约提醒', desc: '您的家庭医生签约即将到期，请及时续约', time: '3天前', unread: false },
];

export default function MessagesPage() {
  const [list, setList] = useState<Msg[]>(BACKEND_SYNC_ENABLED ? [] : INIT);
  useDidShow(() => {
    if (!BACKEND_SYNC_ENABLED) return;
    backendApi.notifications.list()
      .then(rows => setList(rows.map(item => ({
        id: item.id, icon: '🔔', title: item.title, desc: item.body,
        time: String(item.createdAt || '').slice(0, 16), unread: item.status !== 'READ', targetPath: item.targetPath,
      }))))
      .catch(() => Taro.showToast({ title: '消息同步失败', icon: 'none' }));
  });
  const read = (id: string | number) => {
    if (BACKEND_SYNC_ENABLED) {
      backendApi.notifications.read(String(id))
        .then(() => setList(prev => prev.map(m => m.id === id ? { ...m, unread: false } : m)))
        .catch(() => Taro.showToast({ title: '已读状态同步失败', icon: 'none' }));
      return;
    }
    setList(prev => prev.map(m => m.id === id ? { ...m, unread: false } : m));
  };
  const safeTarget = (path?: string | null) => {
    if (!path || !/^\/(pages|pkg[A-Z][A-Za-z]+)\/[a-z0-9-]+\/index(?:\?.*)?$/.test(path)) return '';
    // 通知只能进入用户业务页，不允许绕过权限直达管理端。
    if (/^\/(pages\/login|pages\/admin|pkgAdmin|pkgPlatform\/(platform|community|charity-auth|promotion))\//.test(path)) return '';
    return path;
  };
  const open = (m: Msg) => {
    read(m.id);
    const target = safeTarget(m.targetPath);
    if (target) {
      Taro.navigateTo({ url: target }).catch(() => Taro.showToast({ title: '通知目标页暂无法打开', icon: 'none' }));
      return;
    }
    Taro.showModal({ title: m.title, content: m.desc, showCancel: false, confirmText: '知道了' });
  };
  const readAll = async () => {
    if (BACKEND_SYNC_ENABLED) {
      try {
        await backendApi.notifications.readAll();
        setList(prev => prev.map(m => ({ ...m, unread: false })));
        Taro.showToast({ title: '已全部标记已读', icon: 'none' });
      } catch {
        Taro.showToast({ title: '全部已读同步失败', icon: 'none' });
      }
      return;
    }
    setList(prev => prev.map(m => ({ ...m, unread: false })));
    Taro.showToast({ title: '已全部标记已读', icon: 'none' });
  };
  const unreadCount = list.filter(m => m.unread).length;
  return (
    <View className="page">
      <View className="head">
        <Text className="head-title">消息通知</Text>
        {unreadCount > 0 ? <Text className="head-read" onClick={readAll}>全部已读 ({unreadCount})</Text> : null}
      </View>
      <ScrollView scrollY className="body">
        {list.map(m => (
          <View key={m.id} className="msg" onClick={() => open(m)}>
            <View className="msg-icon"><Text style={{ fontSize: '40rpx' }}>{m.icon}</Text></View>
            <View className="msg-info">
              <View className="msg-top">
                <Text className="msg-title">{m.title}</Text>
                {m.unread ? <View className="dot" /> : null}
              </View>
              <Text className="msg-desc">{m.desc}</Text>
              <Text className="msg-time">{m.time}</Text>
            </View>
          </View>
        ))}
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
