import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

interface Track { time: string; desc: string; }
interface Pkg { id: number; name: string; company: string; no: string; status: '待取' | '运输中' | '已签收'; code?: string; track: Track[]; }

const INIT: Pkg[] = [
  { id: 1, name: '快递包裹', company: '顺丰', no: 'SF1234567890', status: '待取', code: '8-2-1056', track: [{ time: '今天 09:12', desc: '已到寄递服务站，请凭取件码取件' }] },
  { id: 2, name: '日用百货', company: '中通', no: 'ZT8899001122', status: '待取', code: '5-1-0231', track: [{ time: '今天 08:40', desc: '已到服务站，待取件' }] },
  { id: 3, name: '手机配件', company: '京东', no: 'JD5566778899', status: '运输中', track: [{ time: '昨天 18:00', desc: '东丽转运中心已发出' }, { time: '昨天 12:30', desc: '天津分拣中心' }, { time: '前天 20:10', desc: '商家已发货' }] },
  { id: 4, name: '土特产回礼', company: '邮政', no: 'EMS001122334', status: '已签收', track: [{ time: '前天 16:20', desc: '已签收，签收人：本人' }] },
];

export default function ExpressPage() {
  const [pkgs, setPkgs] = useState<Pkg[]>(INIT);
  const [view, setView] = useState<Pkg | null>(null);

  const waitCount = pkgs.filter(p => p.status === '待取').length;

  const sendExpress = (isUpward: boolean) => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: isUpward ? '寄大件' : '寄快递',
      editable: true,
      placeholderText: isUpward ? '如：大件包裹 寄北京' : '如：文件 寄天津市区',
      success: (res: any) => {
        if (!res.confirm || !res.content) return;
        const p: Pkg = { id: Date.now(), name: res.content, company: '顺丰', no: 'SF' + String(Date.now()).slice(-10), status: '运输中', track: [{ time: '刚刚', desc: `已在${store.orgLabel()}寄递服务站揽收` }] };
        setPkgs(prev => [p, ...prev]);
        Taro.showToast({ title: '寄件成功', icon: 'none' });
      },
    } as any);
  };

  const queryTrack = () => Taro.showModal({
    title: '查物流',
    content: `共 ${pkgs.length} 件快递，点开下方「我的快递」中任意一件，即可查看完整物流轨迹与取件码。`,
    showCancel: false, confirmText: '知道了',
  });

  const pickup = (p: Pkg) => {
    if (!store.requireBound()) return;
    setPkgs(prev => prev.map(x => x.id === p.id ? { ...x, status: '已签收', track: [{ time: '刚刚', desc: '已取件，签收人：本人' }, ...x.track] } : x));
    setView(null);
    store.addContributionAuto('custom', '便民·驿站取件代办', 5);
    Taro.showToast({ title: '取件成功', icon: 'success' });
  };

  const FUNCS = [
    { key: 'send', icon: '📤', name: '寄快递' },
    { key: 'pickup', icon: '📥', name: '取快递' },
    { key: 'track', icon: '🔍', name: '查物流' },
    { key: 'upward', icon: '📦', name: '寄大件' },
  ];
  const onFunc = (key: string) => {
    if (key === 'send') sendExpress(false);
    else if (key === 'upward') sendExpress(true);
    else if (key === 'track') queryTrack();
    else Taro.showToast({ title: `下方「待取」共 ${waitCount} 件，点开即可取件`, icon: 'none' });
  };

  const stCls = (s: string) => s === '待取' ? 'wait' : s === '运输中' ? 'ing' : 'done';

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-title">📦 快递物流</Text>
        <Text className="hero-sub">{store.orgLabel()}寄递服务站 · 送件到家</Text>
      </View>
      <ScrollView scrollY className="body">
        <View className="station">
          <Text className="station-name">🏪 {store.orgLabel()}寄递服务站</Text>
          <Text className="station-info">今日待取 {waitCount} 件 · 营业 8:00–18:00 · 党支部领办公益驿站</Text>
        </View>
        <View className="grid">
          {FUNCS.map(f => (
            <View key={f.key} className="cell" onClick={() => onFunc(f.key)}>
              <Text className="cell-icon">{f.icon}</Text><Text className="cell-name">{f.name}</Text>
            </View>
          ))}
        </View>
        <Text className="sec">我的快递</Text>
        {pkgs.map(p => (
          <View key={p.id} className="pkg" onClick={() => setView(p)}>
            <View className="pkg-icon"><Text style={{ fontSize: '40rpx' }}>📦</Text></View>
            <View className="pkg-info">
              <Text className="pkg-name">{p.name}</Text>
              <Text className="pkg-no">{p.company} · {p.no}</Text>
            </View>
            <View className={`pkg-st st-${stCls(p.status)}`}><Text className="pkg-st-t">{p.status}</Text></View>
          </View>
        ))}
        <View style={{ height: '40rpx' }} />
      </ScrollView>

      {view && (
        <View className="overlay" onClick={() => setView(null)}>
          <View className="sheet" onClick={(e) => e.stopPropagation()}>
            <View className="sheet-head"><Text className="sheet-title">{view.name}</Text><Text className="sheet-close" onClick={() => setView(null)}>✕</Text></View>
            {view.status === '待取' && view.code && (
              <View className="code-card"><Text className="code-label">取件码</Text><Text className="code-val">{view.code}</Text></View>
            )}
            <Text className="block-t">物流轨迹</Text>
            <View className="track">
              {view.track.map((t, i) => (
                <View key={i} className={`tk ${i === 0 ? 'tk-now' : ''}`}>
                  <View className="tk-dot" />
                  <View className="tk-c"><Text className="tk-desc">{t.desc}</Text><Text className="tk-time">{t.time}</Text></View>
                </View>
              ))}
            </View>
            {view.status === '待取' && (
              <View className="sheet-btn" onClick={() => pickup(view)}><Text className="sheet-btn-t">确认取件</Text></View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
