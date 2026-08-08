import { View, Text, ScrollView } from '@tarojs/components';
import { LIFECYCLE, CURRENT_STAGE } from '../../config/contribution-model';
import './index.css';

export default function LifecyclePage() {
  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-title">🌟 全生命周期贡献</Text>
        <Text className="hero-sub">从出生到传承 · 每一段人生都被记录</Text>
      </View>
      <ScrollView scrollY className="body">
        <View style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', borderRadius: '16rpx', padding: '28rpx', marginBottom: '24rpx', color: '#fff' }}>
          <Text style={{ fontSize: '24rpx', color: '#dcfce7' }}>我的全生命周期贡献账户</Text>
          <View style={{ display: 'flex', alignItems: 'baseline', marginTop: '8rpx' }}>
            <Text style={{ fontSize: '60rpx', fontWeight: 800 }}>728</Text>
            <Text style={{ fontSize: '24rpx', marginLeft: '12rpx' }}>社会贡献度</Text>
          </View>
          <View style={{ display: 'flex', alignItems: 'center', marginTop: '6rpx' }}>
            <Text style={{ fontSize: '32rpx', color: '#ffe066' }}>★★★★</Text>
            <Text style={{ fontSize: '32rpx', color: 'rgba(255,224,102,.4)' }}>★</Text>
            <Text style={{ fontSize: '23rpx', color: '#dcfce7', marginLeft: '10rpx' }}>4.5 星 · 卓越贡献</Text>
          </View>
          <View style={{ display: 'flex', marginTop: '18rpx', paddingTop: '16rpx', borderTop: '1rpx solid rgba(255,255,255,.25)' }}>
            <View style={{ flex: 1 }}><Text style={{ fontSize: '30rpx', fontWeight: 700, display: 'block' }}>600</Text><Text style={{ fontSize: '20rpx', color: '#dcfce7' }}>基础分</Text></View>
            <View style={{ flex: 1 }}><Text style={{ fontSize: '30rpx', fontWeight: 700, display: 'block' }}>+128</Text><Text style={{ fontSize: '20rpx', color: '#dcfce7' }}>贡献加分</Text></View>
            <View style={{ flex: 1 }}><Text style={{ fontSize: '30rpx', fontWeight: 700, display: 'block', color: '#fecaca' }}>0</Text><Text style={{ fontSize: '20rpx', color: '#dcfce7' }}>违规扣分</Text></View>
            <View style={{ flex: 1 }}><Text style={{ fontSize: '26rpx', fontWeight: 700, display: 'block' }}>可继承</Text><Text style={{ fontSize: '20rpx', color: '#dcfce7' }}>传承属性</Text></View>
          </View>
        </View>
        <View className="timeline">
          {LIFECYCLE.map((s, i) => {
            const isCur = s.key === CURRENT_STAGE;
            const doneCount = s.nodes.filter(n => n.done).length;
            return (
              <View key={s.key} className={`stage ${isCur ? 'cur' : ''}`}>
                <View className="stage-line">
                  <View className="stage-dot" style={{ background: s.color }}><Text className="stage-dot-i">{s.icon}</Text></View>
                  {i < LIFECYCLE.length - 1 && <View className="stage-bar" />}
                </View>
                <View className="stage-card" style={{ borderColor: isCur ? s.color : '#f0f0f0' }}>
                  <View className="stage-head">
                    <Text className="stage-name">{s.name}</Text>
                    <Text className="stage-age">{s.age}</Text>
                    {isCur && <View className="stage-now" style={{ background: s.color }}><Text className="stage-now-t">当前阶段</Text></View>}
                  </View>
                  <Text className="stage-desc">{s.desc} · 已完成 {doneCount}/{s.nodes.length} 节点</Text>
                  <View className="nodes">
                    {s.nodes.map(n => (
                      <View key={n.name} className="node">
                        <Text className={`node-ck ${n.done ? 'done' : ''}`}>{n.done ? '✓' : '○'}</Text>
                        <Text className="node-name">{n.name}</Text>
                        {n.value > 0 && <Text className="node-val" style={{ color: n.done ? s.color : '#9ca3af' }}>+{n.value}</Text>}
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ background: '#fff', borderRadius: '16rpx', padding: '24rpx', marginTop: '8rpx' }}>
          <Text style={{ fontSize: '26rpx', fontWeight: 800, color: '#14532d', display: 'block', marginBottom: '12rpx' }}>📋 贡献度规则</Text>
          <Text style={{ fontSize: '23rpx', color: '#4b5563', display: 'block', lineHeight: 1.8 }}>· <Text style={{ fontWeight: 700 }}>三类构成</Text>：基础分(人人 600) + 社会贡献加分 − 违规扣分</Text>
          <Text style={{ fontSize: '23rpx', color: '#4b5563', display: 'block', lineHeight: 1.8 }}>· <Text style={{ fontWeight: 700 }}>违规扣分</Text>：经举报核实(不赡养老人、失信等)即扣，补回需 5–10 倍贡献</Text>
          <Text style={{ fontSize: '23rpx', color: '#4b5563', display: 'block', lineHeight: 1.8 }}>· <Text style={{ fontWeight: 700 }}>可继承</Text>：贡献度作为家族传承属性，可被子女继承(独特机制)</Text>
          <Text style={{ fontSize: '23rpx', color: '#4b5563', display: 'block', lineHeight: 1.8 }}>· <Text style={{ fontWeight: 700 }}>分层权益</Text>：贡献度越高，享分红 / 服务兑换 / 荣誉等分层待遇</Text>
        </View>
        <View className="foot"><Text className="foot-t">人生不同阶段，贡献各有侧重；点滴积累，皆成传承。</Text></View>
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
