import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

interface Machine {
  id: number; name: string; emoji: string; owner: string; village: string;
  distance: number; condition: string; scene: string;
  level: '精品' | '标准' | '经济'; price: number; category: string;
  imgH: number; combinable?: boolean;
}
const CATS = ['全部', '耕整地', '种植', '植保', '收获', '运输'];
const LEVEL_COLOR: Record<string, string> = { '精品': '#dc2626', '标准': '#2563eb', '经济': '#16a34a' };
const TIME_SLOTS = ['上午 6:00–12:00', '下午 12:00–18:00', '全天', '按天（多日）'];
interface Joint { id: number; area: string; job: string; emoji: string; joined: number; need: number; mu: number; deadline: string; }
const JOINTS: Joint[] = [
  { id: 1, area: '范庄村·东片区', job: '小麦联合收割', emoji: '🌾', joined: 6, need: 10, mu: 320, deadline: '6月15日前' },
  { id: 2, area: '范庄村·西片区', job: '玉米旋耕整地', emoji: '🚜', joined: 8, need: 10, mu: 210, deadline: '春耕前' },
  { id: 3, area: '邻村·李楼联合', job: '水稻统一植保', emoji: '🛸', joined: 3, need: 8, mu: 150, deadline: '7月上旬' },
];
const INIT: Machine[] = [
  { id: 1, name: '东方红504 拖拉机', emoji: '🚜', owner: '王建国', village: '范庄村一组', distance: 0.8, condition: '8成新', scene: '旋耕·犁地', level: '标准', price: 280, category: '耕整地', imgH: 200, combinable: true },
  { id: 2, name: '大疆 T40 植保无人机', emoji: '🛸', owner: '冯韵雯', village: '范庄村三组', distance: 1.2, condition: '9成新', scene: '打药·施肥', level: '精品', price: 350, category: '植保', imgH: 248 },
  { id: 3, name: '久保田 收割机', emoji: '🌾', owner: '孙志强', village: '邻村·李楼', distance: 3.5, condition: '7成新', scene: '小麦·水稻收割', level: '标准', price: 600, category: '收获', imgH: 176, combinable: true },
  { id: 4, name: '微耕机（小型）', emoji: '⚙️', owner: '李秀兰', village: '范庄村二组', distance: 0.5, condition: '9成新', scene: '菜园·果园松土', level: '经济', price: 80, category: '耕整地', imgH: 160 },
  { id: 5, name: '农用三轮运输车', emoji: '🛻', owner: '张大山', village: '范庄村一组', distance: 0.9, condition: '6成新', scene: '农资·农产品运输', level: '经济', price: 120, category: '运输', imgH: 208 },
  { id: 6, name: '电动喷雾器 ×3', emoji: '💦', owner: '周建伟', village: '范庄村四组', distance: 1.5, condition: '9成新', scene: '果树·蔬菜打药', level: '标准', price: 30, category: '植保', imgH: 150, combinable: true },
  { id: 7, name: '玉米脱粒机', emoji: '🌽', owner: '吴小芳', village: '范庄村三组', distance: 1.1, condition: '8成新', scene: '玉米脱粒', level: '标准', price: 150, category: '收获', imgH: 184 },
  { id: 8, name: '水稻插秧机', emoji: '🌱', owner: '郑强', village: '邻村·王店', distance: 4.2, condition: '7成新', scene: '水稻插秧', level: '标准', price: 320, category: '种植', imgH: 196 },
];

interface Agri { id: number; name: string; emoji: string; cat: string; spec: string; price: number; unit: string; sales: number; verified: boolean; group?: boolean; }
const AGRI_CATS = ['全部', '种子', '化肥', '农药', '农膜', '农具'];
const AGRI: Agri[] = [
  { id: 1, name: '郑麦366 小麦种', emoji: '🌾', cat: '种子', spec: '25kg/袋', price: 180, unit: '袋', sales: 230, verified: true, group: true },
  { id: 2, name: '史丹利复合肥 45%', emoji: '🧪', cat: '化肥', spec: '40kg/袋', price: 135, unit: '袋', sales: 560, verified: true, group: true },
  { id: 3, name: '尿素 46%', emoji: '⚗️', cat: '化肥', spec: '40kg/袋', price: 108, unit: '袋', sales: 480, verified: true },
  { id: 4, name: '吡虫啉 杀虫剂', emoji: '🧴', cat: '农药', spec: '100ml', price: 18, unit: '瓶', sales: 320, verified: true },
  { id: 5, name: '草甘膦 除草剂', emoji: '🪣', cat: '农药', spec: '1L', price: 35, unit: '瓶', sales: 210, verified: true },
  { id: 6, name: '地膜（白色）', emoji: '🎞️', cat: '农膜', spec: '幅宽1m·10kg', price: 95, unit: '卷', sales: 140, verified: true },
  { id: 7, name: '番茄良种', emoji: '🍅', cat: '种子', spec: '10g/包', price: 25, unit: '包', sales: 180, verified: true },
  { id: 8, name: '手动喷雾器', emoji: '🛢️', cat: '农具', spec: '16L', price: 45, unit: '个', sales: 90, verified: false },
  { id: 9, name: '生物有机肥', emoji: '🌱', cat: '化肥', spec: '40kg/袋', price: 65, unit: '袋', sales: 300, verified: true, group: true },
];

export default function AgriRentalPage() {
  const [mode, setMode] = useState<'machine' | 'supply'>('machine');
  const [list, setList] = useState<Machine[]>(INIT);
  const [cat, setCat] = useState('全部');
  const [acat, setAcat] = useState('全部');
  const [sortByDist, setSortByDist] = useState(true);

  let filtered = cat === '全部' ? list : list.filter(m => m.category === cat);
  filtered = [...filtered].sort((a, b) => sortByDist ? a.distance - b.distance : b.id - a.id);
  const cols: Machine[][] = [[], []];
  const colH = [0, 0];
  filtered.forEach(m => { const c = colH[0] <= colH[1] ? 0 : 1; cols[c].push(m); colH[c] += m.imgH + 170; });

  const agriList = acat === '全部' ? AGRI : AGRI.filter(a => a.cat === acat);

  const book = (m: Machine) => {
    if (!store.requireBound()) return;
    Taro.showActionSheet({
      itemList: TIME_SLOTS,
      success: (res) => {
        const slot = TIME_SLOTS[res.tapIndex];
        Taro.showModal({ title: '预约租赁', content: `${m.name}\n机主：${m.owner}（${m.village}，距你 ${m.distance}km）\n等级：${m.level} · ${m.condition}\n时段：${slot}\n日租：¥${m.price}\n\n确认预约？机主将电话与你确认。`, confirmText: '确认预约', success: (r) => { if (r.confirm) Taro.showToast({ title: process.env.TARO_APP_BACKEND_SYNC === 'true' ? '农机预约接口尚未开放' : '演示预约已记录', icon: 'none' }); } });
      },
    });
  };
  const publish = () => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: '发布闲置农机', editable: true, placeholderText: '如：旋耕机 8成新 日租200',
      success: (res: any) => {
        if (!res.confirm || !res.content) return;
        const m: Machine = { id: Date.now(), name: res.content, emoji: '🚜', owner: store.getUser()?.name || '我', village: '范庄村', distance: 0.1, condition: '闲置', scene: '待补充', level: '标准', price: 0, category: '全部', imgH: 184, combinable: true };
        setList(prev => [m, ...prev]);
        Taro.showToast({ title: '发布成功，已上架', icon: 'success' });
      },
    } as any);
  };
  const joinPin = (j: Joint) => { if (!store.requireBound()) return; Taro.showModal({ title: `加入联合作业 · ${j.job}`, content: `片区：${j.area}\n已拼 ${j.joined} 户 · ${j.mu} 亩，还差 ${j.need - j.joined} 户\n截止：${j.deadline}\n\n联合作业 = 多户拼地连片，农机一次进场干完，单亩成本更低、运输调度更省。确认加入？`, confirmText: '加入拼单', success: r => { if (r.confirm) Taro.showToast({ title: '已加入，达成后通知你', icon: 'none' }); } }); };
  const launchPin = () => { if (!store.requireBound()) return; Taro.showModal({ title: '发起联合作业拼单', editable: true, placeholderText: '如：东片区 小麦收割 拟拼80亩', success: (res: any) => { if (res.confirm && res.content) Taro.showToast({ title: '已发起，等邻里加入', icon: 'success' }); } } as any); };
  const buy = (a: Agri) => { if (!store.requireBound()) return; Taro.showModal({ title: a.name, content: `规格：${a.spec}\n单价：¥${a.price}/${a.unit}\n${a.verified ? '✅ 正品溯源·扫码可验真' : '⚠️ 暂未溯源'}${a.group ? '\n🤝 党支部集采团购价' : ''}\n\n确认下单？`, confirmText: '立即下单', success: (r) => { if (r.confirm) Taro.showToast({ title: '下单成功', icon: 'success' }); } }); };
  const trace = (a: Agri) => Taro.showModal({ title: '🔍 正品溯源', content: `${a.name}\n生产厂家：正规备案厂家\n生产批次：2026XXXX\n质检结论：合格\n\n（演示）扫码可查农资正品溯源链路，防假冒伪劣、放心用。`, showCancel: false });

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-title">🚜 农资农机</Text>
        <Text className="hero-sub">📍 范庄村 · 农机共享 + 农资集采</Text>
      </View>
      <View className="mode-tabs">
        <View className={`mtab ${mode === 'machine' ? 'on' : ''}`} onClick={() => setMode('machine')}><Text>🚜 农机租赁</Text></View>
        <View className={`mtab ${mode === 'supply' ? 'on' : ''}`} onClick={() => setMode('supply')}><Text>🌾 农资商城</Text></View>
      </View>

      {mode === 'machine' ? (
        <View className="seg">
          <View className="bar"><ScrollView scrollX className="cat-scroll">{CATS.map(c => (<View key={c} className={`cat ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}><Text>{c}</Text></View>))}</ScrollView></View>
          <View className="sort-row">
            <Text className={`sort ${sortByDist ? 'on' : ''}`} onClick={() => setSortByDist(true)}>📍 距离最近</Text>
            <Text className={`sort ${!sortByDist ? 'on' : ''}`} onClick={() => setSortByDist(false)}>🆕 最新发布</Text>
          </View>
          <View className="pin-sec">
            <View className="pin-head"><Text className="pin-title">🤝 联合作业 · 拼单中</Text><Text className="pin-launch" onClick={launchPin}>＋ 发起</Text></View>
            <ScrollView scrollX className="pin-scroll">
              {JOINTS.map(j => (
                <View key={j.id} className="pin-card" onClick={() => joinPin(j)}>
                  <Text className="pin-job">{j.emoji} {j.job}</Text>
                  <Text className="pin-area">{j.area}</Text>
                  <View className="pin-bar"><View className="pin-fill" style={{ width: `${Math.round(j.joined / j.need * 100)}%` }} /></View>
                  <Text className="pin-meta">已拼 {j.joined}/{j.need}户 · {j.mu}亩 · 差{j.need - j.joined}户</Text>
                </View>
              ))}
            </ScrollView>
          </View>
          <ScrollView scrollY className="body">
            <View className="waterfall">
              {cols.map((col, ci) => (
                <View key={ci} className="wf-col">
                  {col.map(m => (
                    <View key={m.id} className="m-card" onClick={() => book(m)}>
                      <View className="m-img" style={{ height: `${m.imgH}rpx` }}>
                        <Text className="m-emoji">{m.emoji}</Text>
                        <View className="m-level" style={{ background: LEVEL_COLOR[m.level] }}><Text className="m-level-t">{m.level}</Text></View>
                        {m.combinable && <View className="m-combine"><Text className="m-combine-t">可拼租</Text></View>}
                      </View>
                      <View className="m-info">
                        <Text className="m-name">{m.name}</Text>
                        <View className="m-tags"><Text className="m-cond">{m.condition}</Text><Text className="m-scene">{m.scene}</Text></View>
                        <View className="m-foot"><Text className="m-price">¥{m.price}<Text className="m-unit">/天</Text></Text><Text className="m-dist">📍{m.distance}km</Text></View>
                        <Text className="m-owner">👤 {m.owner} · {m.village}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
            <View style={{ height: '140rpx' }} />
          </ScrollView>
          <View className="fab" onClick={publish}><Text className="fab-t">＋ 发布闲置农机</Text></View>
        </View>
      ) : (
        <View className="seg">
          <View className="agri-tip"><Text className="agri-tip-t">🤝 党支部集采团购：统一议价、正品溯源，比市场价省 10-20%</Text></View>
          <View className="bar"><ScrollView scrollX className="cat-scroll">{AGRI_CATS.map(c => (<View key={c} className={`cat ${acat === c ? 'on' : ''}`} onClick={() => setAcat(c)}><Text>{c}</Text></View>))}</ScrollView></View>
          <ScrollView scrollY className="body">
            <View className="agri-wrap">
              {agriList.map(a => (
                <View key={a.id} className="agri">
                  <View className="agri-img"><Text style={{ fontSize: '52rpx' }}>{a.emoji}</Text></View>
                  <View className="agri-info">
                    <View className="agri-top"><Text className="agri-name">{a.name}</Text>{a.verified && <View className="agri-verify" onClick={() => trace(a)}><Text className="agri-verify-t">✅溯源</Text></View>}</View>
                    <Text className="agri-spec">{a.spec} · 已售 {a.sales}</Text>
                    {a.group && <View className="agri-group"><Text className="agri-group-t">🤝 集采团购价</Text></View>}
                    <View className="agri-foot"><Text className="agri-price">¥{a.price}<Text className="agri-unit">/{a.unit}</Text></Text><View className="agri-btn" onClick={() => buy(a)}><Text className="agri-btn-t">下单</Text></View></View>
                  </View>
                </View>
              ))}
              <View style={{ height: '40rpx' }} />
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
}
