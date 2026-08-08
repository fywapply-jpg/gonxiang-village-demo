import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store, ContribRecord } from '../../store';
import './index.css';

export default function ContribAuditPage() {
  const [allowed, setAllowed] = useState(store.canManageVillage());
  const [list, setList] = useState<ContribRecord[]>([]);
  const reload = () => setList(store.getPendingContribs());
  useDidShow(() => {
    const ok = store.canManageVillage();
    setAllowed(ok);
    if (!ok) { Taro.showModal({ title: '无权访问', content: '社会贡献值审核仅村委 / 居委会 / 平台管理员可用', showCancel: false, success: () => Taro.reLaunch({ url: '/pages/index/index' }) }); return; }
    reload();
  });
  const org = store.adminLabel();

  const review = (r: ContribRecord, pass: boolean) => Taro.showModal({
    title: pass ? '确认计入贡献值' : '驳回该贡献',
    content: pass
      ? `核实留痕与受益者评价属实，确认为「${r.title}」计入社会贡献值 +${r.value}？确认后即上链存证、计入本人总分。`
      : `驳回「${r.title}」？（留痕不实 / 服务未完成 / 受益者否认）`,
    success: (res) => { if (res.confirm) { store.reviewContrib(r.id!, pass, org); reload(); Taro.showToast({ title: pass ? `已确认 +${r.value}` : '已驳回', icon: 'none' }); } },
  });

  if (!allowed) {
    return <View className="page"><View className="empty"><Text className="empty-t">🔒 社会贡献值审核仅村委 / 居委会 / 平台管理员可访问</Text></View></View>;
  }

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">⚖️ 社会贡献值审核</Text>
        <Text className="hero-s">{org}审核 · 留痕 + 受益者评价核实 · 通过后才计入贡献值</Text>
      </View>
      <ScrollView scrollY className="body">
        <View className="tip"><Text className="tip-t">📋 群众参与服务后需提交留痕（照片 / 视频）与受益者评价，由 {org} 核实属实后确认计分，杜绝虚报刷分。当前待审 {list.length} 条。</Text></View>
        {list.length === 0 && <View className="empty"><Text className="empty-t">✅ 暂无待审核贡献</Text></View>}
        {list.map(r => (
          <View key={r.id} className="card">
            <View className="card-head">
              <Text className="card-title">{r.title}</Text>
              <Text className="card-val">+{r.value}</Text>
            </View>
            <Text className="card-dim">{r.dim} · {r.date}</Text>
            <View className="proof"><Text className="proof-icon">📷</Text><Text className="proof-t">留痕：{r.proof}</Text></View>
            <View className="benef">
              <Text className="benef-l">👤 受益者：{r.beneficiary}</Text>
              <Text className="benef-r">💬 受益者评价：{r.review}</Text>
            </View>
            <View className="ops">
              <View className="op op-pass" onClick={() => review(r, true)}><Text className="op-t">✓ 核实确认 · 计分</Text></View>
              <View className="op op-rej" onClick={() => review(r, false)}><Text className="op-t2">✗ 驳回</Text></View>
            </View>
          </View>
        ))}
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
