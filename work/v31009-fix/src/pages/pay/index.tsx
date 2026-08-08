import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

interface PayType { key: string; name: string; icon: string; due: number; }
const TYPES: PayType[] = [
  { key: 'elec', name: '电费', icon: '💡', due: 86.5 },
  { key: 'water', name: '水费', icon: '💧', due: 32.0 },
  { key: 'gas', name: '燃气', icon: '🔥', due: 45.0 },
  { key: 'net', name: '宽带', icon: '📶', due: 99.0 },
  { key: 'phone', name: '话费', icon: '📱', due: 50.0 },
  { key: 'tv', name: '有线电视', icon: '📺', due: 25.0 },
  { key: 'heat', name: '暖气', icon: '♨️', due: 120.0 },
  { key: 'more', name: '更多', icon: '➕', due: 0 },
];
interface Rec { id: number; name: string; amount: number; date: string; }

export default function PayPage() {
  const [sel, setSel] = useState<PayType | null>(null);
  const [acct, setAcct] = useState('');
  const [queried, setQueried] = useState(false);
  const [forOther, setForOther] = useState(false);
  const [recs, setRecs] = useState<Rec[]>([]);

  useDidShow(() => { setRecs(Taro.getStorageSync('gx_pay_records') || []); });

  const open = (t: PayType) => {
    if (t.key === 'more') { Taro.showToast({ title: '更多缴费类目陆续接入', icon: 'none' }); return; }
    setSel(t); setAcct(''); setQueried(false); setForOther(false);
  };
  const query = () => {
    if (!acct) { Taro.showToast({ title: '请输入户号', icon: 'none' }); return; }
    setQueried(true);
  };
  const pay = () => {
    if (!store.requireBound()) return;
    if (!sel) return;
    Taro.showModal({
      title: '确认缴费',
      content: `${sel.name}　户号 ${acct}\n应缴 ¥${sel.due.toFixed(2)}${forOther ? '\n（代缴）' : ''}\n\n确认缴费？（演示，正式版调起微信支付）`,
      confirmText: '确认缴费',
      success: (res) => {
        if (!res.confirm) return;
        const rec: Rec = { id: Date.now(), name: `${sel.name}·${acct}${forOther ? '（代缴）' : ''}`, amount: sel.due, date: '今天' };
        const next = [rec, ...recs];
        setRecs(next); Taro.setStorageSync('gx_pay_records', next);
        setSel(null);
        if (forOther) store.addContributionAuto('custom', '邻里互助·代缴', 10);
        Taro.showToast({ title: forOther ? '代缴成功 +10 贡献值' : '缴费成功', icon: 'none' });
      },
    });
  };

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-title">💡 生活缴费</Text>
        <Text className="hero-sub">{`水电燃气宽带 · 不出${store.orgLabel()}一站缴`}</Text>
      </View>
      <ScrollView scrollY className="body">
        <View className="grid">
          {TYPES.map(t => (
            <View key={t.key} className="cell" onClick={() => open(t)}>
              <Text className="cell-icon">{t.icon}</Text>
              <Text className="cell-name">{t.name}</Text>
            </View>
          ))}
        </View>
        <View className="tip-card"><Text className="tip-t">🤝 党员代缴：可为孤寡老人、外出务工户代缴，每单记入「乡风·邻里互助」贡献</Text></View>
        <Text className="sec">缴费记录</Text>
        {recs.length === 0 ? (
          <View className="empty"><Text className="empty-t">暂无缴费记录</Text></View>
        ) : recs.map(r => (
          <View key={r.id} className="rec">
            <View className="rec-info"><Text className="rec-name">{r.name}</Text><Text className="rec-date">{r.date} · 已缴</Text></View>
            <Text className="rec-amt">¥{r.amount.toFixed(2)}</Text>
          </View>
        ))}
        <View style={{ height: '40rpx' }} />
      </ScrollView>

      {sel && (
        <View className="overlay" onClick={() => setSel(null)}>
          <View className="sheet" onClick={(e) => e.stopPropagation()}>
            <View className="sheet-head"><Text className="sheet-title">{sel.icon} {sel.name}缴费</Text><Text className="sheet-close" onClick={() => setSel(null)}>✕</Text></View>
            <View className="field">
              <Text className="field-label">户号 / 账号</Text>
              <Input className="field-input" placeholder={`请输入${sel.name}户号`} value={acct} onInput={e => setAcct(e.detail.value)} />
            </View>
            <View className="other-row" onClick={() => setForOther(v => !v)}>
              <Text className={`other-box ${forOther ? 'on' : ''}`}>{forOther ? '✓' : ''}</Text>
              <Text className="other-t">我为他人代缴（党员志愿帮办）</Text>
            </View>
            {!queried ? (
              <View className="sheet-btn" onClick={query}><Text className="sheet-btn-t">查询待缴</Text></View>
            ) : (
              <View>
                <View className="due-card"><Text className="due-label">待缴金额</Text><Text className="due-amt">¥{sel.due.toFixed(2)}</Text></View>
                <View className="sheet-btn pay" onClick={pay}><Text className="sheet-btn-t">确认缴费 ¥{sel.due.toFixed(2)}</Text></View>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}
