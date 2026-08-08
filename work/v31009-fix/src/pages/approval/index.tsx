import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store, ApprovalItem, ApprovalSt } from '../../store';
import './index.css';

const ST: Record<ApprovalSt, { t: string; c: string }> = {
  pending_officer: { t: '待初审', c: '#f59e0b' }, pending_leader: { t: '待终批', c: '#2563eb' },
  approved: { t: '已批准', c: '#16a34a' }, rejected: { t: '已驳回', c: '#dc2626' },
};

export default function ApprovalPage() {
  const [items, setItems] = useState<ApprovalItem[]>(() => store.getApprovals());
  const [specs, setSpecs] = useState<Record<string, string>>(() => store.getApprovalSpecs());
  const [allowed, setAllowed] = useState(store.canManageVillage());
  const [isLeader, setIsLeader] = useState(store.isApprovalLeader());
  useDidShow(() => { const ok = store.canManageVillage(); setAllowed(ok); setIsLeader(store.isApprovalLeader()); setItems(store.getApprovals()); setSpecs(store.getApprovalSpecs()); if (!ok) { Taro.showModal({ title: '无权访问', content: '审批中心仅村委 / 居委审批领导可用', showCancel: false, success: () => Taro.reLaunch({ url: '/pages/index/index' }) }); } });

  const assign = (spec: string) => { if (!store.isApprovalLeader()) { Taro.showToast({ title: '仅审批领导可指派专员', icon: 'none' }); return; } Taro.showModal({ title: `指派「${spec}」审核专员`, editable: true, placeholderText: '输入专员姓名', content: `当前专员：${specs[spec]}（审批领导可随时改派）`, success: (r: any) => { if (r.confirm && r.content) { const next = { ...specs, [spec]: r.content }; store.setApprovalSpecs(next); setSpecs(next); Taro.showToast({ title: `已指派 ${r.content}`, icon: 'none' }); } } } as any); };
  const officerPass = (it: ApprovalItem) => Taro.showModal({ title: '前置初审', content: `${it.type} · ${it.by}\n初审岗：${it.spec}（专员 ${specs[it.spec] || '未指派'}）\n\n该专项审核专员完成前置初审、通过后 → 转审批领导终批。`, confirmText: '初审通过', success: r => { if (r.confirm) { const next = items.map(x => x.id === it.id ? { ...x, status: 'pending_leader' as ApprovalSt } : x); store.setApprovals(next); setItems(next); Taro.showToast({ title: '已初审，转领导终批', icon: 'none' }); } } });
  const leaderAct = (it: ApprovalItem, pass: boolean) => { if (!store.isApprovalLeader()) { Taro.showToast({ title: '仅审批领导可终批', icon: 'none' }); return; } Taro.showModal({ title: `终批${pass ? '通过' : '驳回'}`, content: `${it.type} · ${it.by}\n已由「${it.spec}」专员 ${specs[it.spec] || ''} 初审\n\n审批领导确认终批${pass ? '通过' : '驳回'}？`, success: r => { if (r.confirm) { const next = items.map(x => x.id === it.id ? { ...x, status: (pass ? 'approved' : 'rejected') as ApprovalSt } : x); store.setApprovals(next); setItems(next); Taro.showToast({ title: `已终批${pass ? '通过' : '驳回'}`, icon: 'none' }); } } }); };

  if (!allowed) {
    return (<View className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><Text style={{ fontSize: '30rpx', color: '#9ca3af' }}>🔒 审批中心仅村委 / 居委审批领导可访问</Text></View>);
  }

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">📋 两级审批中心</Text>
        <Text className="hero-s">专项审核专员前置初审 → 审批领导终批 · 你当前：{isLeader ? '审批领导（终批）' : '审核专员（初审）'}</Text>
      </View>
      <ScrollView scrollY className="body">
        <View className="sec">
          <Text className="sec-t">👥 专项审核专员岗（审批领导指派 · 可设多岗，各管一类初审）</Text>
          {Object.keys(specs).map(k => (
            <View key={k} className="spec" onClick={isLeader ? () => assign(k) : undefined}>
              <Text className="spec-k">{k}</Text>
              <Text className="spec-o">专员：{specs[k]} {isLeader && <Text style={{ color: '#2563eb' }}>· 改派 ›</Text>}</Text>
            </View>
          ))}
        </View>
        <Text className="sec-t" style={{ marginTop: '24rpx' }}>📑 待审事项（前置初审 → 终批）</Text>
        {items.map(it => (
          <View key={it.id} className="card">
            <View className="row"><Text className="type">{it.type}</Text><Text className="st" style={{ color: ST[it.status].c }}>{ST[it.status].t}</Text></View>
            <Text className="detail">{it.detail}</Text>
            <Text className="by">申请人 {it.by} · 初审岗：{it.spec}（{specs[it.spec] || '未指派'}）</Text>
            {it.status === 'pending_officer' && (
              <View className="acts"><View className="btn pass" onClick={() => officerPass(it)}><Text className="btn-t">前置初审通过</Text></View></View>
            )}
            {it.status === 'pending_leader' && (
              isLeader
                ? <View className="acts"><View className="btn pass" onClick={() => leaderAct(it, true)}><Text className="btn-t">终批通过</Text></View><View className="btn rej" onClick={() => leaderAct(it, false)}><Text className="btn-t-r">驳回</Text></View></View>
                : <Text className="hint">已前置初审 · 待审批领导终批</Text>
            )}
            {(it.status === 'approved' || it.status === 'rejected') && <Text className="hint">{it.status === 'approved' ? '✓ 审批完成（初审+终批）' : '✗ 已驳回'}</Text>}
          </View>
        ))}
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
