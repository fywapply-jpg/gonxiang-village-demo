import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import { COMMUNITY_FULL } from '../../config/region';
import './index.css';

type FnKey = 'notice' | 'volunteer' | 'council' | 'grid' | 'service' | 'care' | 'points' | 'group';

const FUNCS: { key: FnKey; icon: string; label: string; desc: string }[] = [
  { key: 'service', icon: '👥', label: '居民服务', desc: '户籍/低保/医保代办' },
  { key: 'group', icon: '🛒', label: '社区团购', desc: '对接农产品上行' },
  { key: 'care', icon: '👴', label: '一老一小', desc: '日间照料/课后' },
  { key: 'grid', icon: '🛡️', label: '综治网格', desc: '网格/隐患/调解' },
  { key: 'points', icon: '⭐', label: '贡献值管理', desc: '居民贡献值' },
  { key: 'council', icon: '🗳️', label: '社区议事', desc: '居民提案投票' },
  { key: 'notice', icon: '📢', label: '便民公告', desc: '发布/撤下' },
  { key: 'volunteer', icon: '❤️', label: '志愿活动', desc: '发起/审核' },
];

// 🗂️ 管理功能 导航（社区 / 村务管理工具集）
const MGMT_TOOLS: { icon: string; label: string; url: string }[] = [
  { icon: '📋', label: '审批中心', url: '/pages/approval/index' },
  { icon: '📇', label: '组织码·名单', url: '/pages/org-code/index' },
  { icon: '📥', label: '名单导入', url: '/pkgAdmin/roster-import/index' },
  { icon: '✨', label: '聚光星·流量', url: '/pkgLife/spotlight/index' },
  { icon: '✅', label: '贡献审核', url: '/pkgLife/contrib-audit/index' },
  { icon: '📋', label: '社区公开', url: '/pages/affairs/index' },
  { icon: '❤️', label: '志愿服务', url: '/pages/volunteer/index' },
];

// ===== 数据模型 =====
interface Notice { id: number; title: string; body: string; time: string; on: boolean; }
interface Volunteer { id: number; name: string; time: string; quota: number; signed: number; status: '报名中' | '已结束'; }
interface Proposal { id: number; title: string; agree: number; oppose: number; status: '投票中' | '已公示'; result?: string; }
interface Hazard { id: number; grid: string; text: string; level: '一般' | '较大'; done: boolean; }
interface ServiceItem { id: number; resident: string; kind: '户籍' | '低保' | '医保'; text: string; done: boolean; }
interface CareItem { id: number; name: string; kind: '助餐' | '日照' | '托管'; note: string; served: boolean; }
interface PointItem { id: number; name: string; points: number; last: string; }
interface GroupItem { id: number; goods: string; qty: string; joined: number; supplier: string; confirmed: boolean; }

const now = () => { const d = new Date(); return `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

export default function CommunityPage() {
  const [allowed, setAllowed] = useState(store.canManageCommunity());
  useDidShow(() => {
    const ok = store.canManageCommunity();
    setAllowed(ok);
    if (!ok) {
      Taro.showModal({ title: '无权访问', content: '居委会后台仅居委会 / 平台管理员可用', showCancel: false, success: () => Taro.reLaunch({ url: '/pages/index/index' }) });
    }
  });
  const name = store.getUser()?.orgName || COMMUNITY_FULL;
  const [sheet, setSheet] = useState<FnKey | null>(null);
  const goPage = (url: string) => Taro.navigateTo({ url });

  // ===== 各职能本地数据 =====
  const [notices, setNotices] = useState<Notice[]>([
    { id: 1, title: '11月社保认证提醒', body: '请60岁以上居民本月内完成养老待遇资格认证，可到社区服务站办理。', time: '11月2日 09:10', on: true },
    { id: 2, title: '供暖试压通知', body: '本周三对2-5号楼进行供暖管道试压，请居民留意家中管道。', time: '11月1日 15:30', on: true },
    { id: 3, title: '文明养犬倡议', body: '遛狗请牵绳、清理粪便，共建整洁社区。', time: '10月28日 10:00', on: false },
  ]);
  const [vols, setVols] = useState<Volunteer[]>([
    { id: 1, name: '重阳节助老包饺子', time: '11月8日 上午', quota: 20, signed: 14, status: '报名中' },
    { id: 2, name: '社区环境清扫日', time: '11月12日 上午', quota: 30, signed: 30, status: '报名中' },
    { id: 3, name: '反诈知识进楼栋', time: '10月20日 下午', quota: 15, signed: 12, status: '已结束' },
  ]);
  const [props, setProps] = useState<Proposal[]>([
    { id: 1, title: '3号楼加装电梯', agree: 86, oppose: 12, status: '投票中' },
    { id: 2, title: '增设地面停车位', agree: 120, oppose: 45, status: '投票中' },
    { id: 3, title: '儿童游乐区改造', agree: 152, oppose: 8, status: '已公示', result: '通过，已进入施工招标' },
  ]);
  const [hazards, setHazards] = useState<Hazard[]>([
    { id: 1, grid: '一网格', text: '4号楼消防通道被杂物堵塞', level: '较大', done: false },
    { id: 2, grid: '二网格', text: '中心花园路灯不亮', level: '一般', done: false },
    { id: 3, grid: '三网格', text: '地下车库积水', level: '较大', done: true },
  ]);
  const [services, setServices] = useState<ServiceItem[]>([
    { id: 1, resident: '王秀兰', kind: '低保', text: '低保年度复核材料代交', done: false },
    { id: 2, resident: '李建国', kind: '医保', text: '异地就医备案代办', done: false },
    { id: 3, resident: '赵敏', kind: '户籍', text: '新生儿落户预约', done: false },
    { id: 4, resident: '孙丽', kind: '医保', text: '慢病门诊报销代办', done: true },
  ]);
  const [cares, setCares] = useState<CareItem[]>([
    { id: 1, name: '张桂芳（82岁）', kind: '助餐', note: '午餐配送·软食', served: false },
    { id: 2, name: '刘德海（79岁）', kind: '日照', note: '日间照料·康复训练', served: false },
    { id: 3, name: '陈乐乐（6岁）', kind: '托管', note: '课后托管·作业辅导', served: false },
    { id: 4, name: '周奶奶（85岁）', kind: '助餐', note: '午餐配送·糖尿病餐', served: true },
  ]);
  const [points, setPoints] = useState<PointItem[]>([
    { id: 1, name: '王强', points: 120, last: '志愿服务 +10 贡献值' },
    { id: 2, name: '李梅', points: 85, last: '垃圾分类 +5 贡献值' },
    { id: 3, name: '张伟', points: 200, last: '楼栋长履职 +20 贡献值' },
    { id: 4, name: '刘芳', points: 60, last: '参加议事 +5 贡献值' },
  ]);
  const [groups, setGroups] = useState<GroupItem[]>([
    { id: 1, goods: '灵宝苹果', qty: '10 吨', joined: 128, supplier: '', confirmed: false },
    { id: 2, goods: '卢氏香菇', qty: '500 斤', joined: 64, supplier: '', confirmed: false },
    { id: 3, goods: '陕州冬枣', qty: '2000 斤', joined: 96, supplier: '果农合作社', confirmed: true },
  ]);

  const toast = (t: string) => Taro.showToast({ title: t, icon: 'none' });

  // ===== 操作 =====
  const addNotice = () => Taro.showModal({
    title: '发布新公告', editable: true, placeholderText: '输入公告标题',
    success: (r: any) => { if (r.confirm && r.content) { setNotices(p => [{ id: Date.now(), title: r.content, body: '（居委会发布）', time: now(), on: true }, ...p]); toast('已发布'); } },
  } as any);
  const toggleNotice = (id: number) => setNotices(p => p.map(n => n.id === id ? { ...n, on: !n.on } : n));

  const addVol = () => Taro.showModal({
    title: '发起志愿活动', editable: true, placeholderText: '输入活动名称',
    success: (r: any) => { if (r.confirm && r.content) { setVols(p => [{ id: Date.now(), name: r.content, time: now(), quota: 20, signed: 0, status: '报名中' }, ...p]); toast('已发起'); } },
  } as any);
  const endVol = (id: number) => setVols(p => p.map(v => v.id === id ? { ...v, status: '已结束' } : v));

  const voteResult = (id: number) => setProps(p => p.map(pr => {
    if (pr.id !== id) return pr;
    return { ...pr, status: '已公示', result: pr.agree > pr.oppose ? '多数通过，进入执行' : '未通过，暂缓' };
  }));

  const doneHazard = (id: number) => setHazards(p => p.map(h => h.id === id ? { ...h, done: true } : h));

  const doneService = (id: number) => setServices(p => p.map(s => s.id === id ? { ...s, done: true } : s));

  const serveCare = (id: number) => setCares(p => p.map(c => c.id === id ? { ...c, served: true } : c));

  const addPoint = (id: number, n: PointItem) => Taro.showModal({
    title: `为 ${n.name} 加贡献值`, editable: true, placeholderText: '输入贡献值数值，如 10',
    success: (r: any) => { const v = parseInt(r.content || '', 10); if (r.confirm && v > 0) { setPoints(p => p.map(x => x.id === id ? { ...x, points: x.points + v, last: `手动 +${v} 贡献值` } : x)); toast(`已加 ${v} 贡献值`); } },
  } as any);

  const confirmSupplier = (id: number, g: GroupItem) => Taro.showModal({
    title: `确认供应方 · ${g.goods}`, editable: true, placeholderText: '输入供应方名称',
    success: (r: any) => { if (r.confirm && r.content) { setGroups(p => p.map(x => x.id === id ? { ...x, supplier: r.content, confirmed: true } : x)); toast('已确认供应方'); } },
  } as any);

  // ===== 待办动态汇总 =====
  const todos = [
    ...groups.filter(g => !g.confirmed).map(g => ({ type: '团购', text: `${g.goods} ${g.qty}（${g.joined}人）待确认供应方`, key: 'group' as FnKey })),
    ...props.filter(p => p.status === '投票中').map(p => ({ type: '议事', text: `"${p.title}"提案待公示（赞成${p.agree}/反对${p.oppose}）`, key: 'council' as FnKey })),
    ...hazards.filter(h => !h.done).map(h => ({ type: '综治', text: `${h.grid}：${h.text}`, key: 'grid' as FnKey })),
    ...services.filter(s => !s.done).map(s => ({ type: '代办', text: `${s.resident}·${s.text}`, key: 'service' as FnKey })),
    ...cares.filter(c => !c.served).map(c => ({ type: '一老一小', text: `${c.name}·${c.note}`, key: 'care' as FnKey })),
  ];

  // 守卫未通过时只渲染锁定占位，绝不渲染 8 职能真实数据（防止弹窗期间居民信息露出）
  if (!allowed) {
    return (
      <View className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Text style={{ fontSize: '30rpx', color: '#9ca3af' }}>🔒 居委会后台仅居委会 / 平台管理员可访问</Text>
      </View>
    );
  }

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">🏙️ {name} · 居委会后台</Text>
        <Text className="hero-s">社区居委会管理 · 与村委会平级、职能区分、部分重叠(一老一小/贡献值)</Text>
      </View>
      <ScrollView scrollY className="body">
        <View className="kpis">
          <View className="kpi"><Text className="kpi-n">1,860</Text><Text className="kpi-l">在册居民</Text></View>
          <View className="kpi"><Text className="kpi-n">42</Text><Text className="kpi-l">今日服务</Text></View>
          <View className="kpi"><Text className="kpi-n">{todos.length}</Text><Text className="kpi-l">待办</Text></View>
        </View>
        {/* 🗂️ 管理功能 导航 */}
        <View className="mgmt-card">
          <Text className="mgmt-title">🗂️ 管理功能</Text>
          <View className="mgmt-grid">
            {MGMT_TOOLS.map(t => (
              <View key={t.label} className="mgmt-item" onClick={() => goPage(t.url)}>
                <View className="mgmt-icon"><Text>{t.icon}</Text></View>
                <Text className="mgmt-label">{t.label}</Text>
              </View>
            ))}
          </View>
        </View>
        <View className="card">
          <Text className="card-t">管理职能</Text>
          <View className="grid">
            {FUNCS.map(f => (
              <View key={f.key} className="fn" onClick={() => setSheet(f.key)}>
                <Text className="fn-i">{f.icon}</Text>
                <Text className="fn-l">{f.label}</Text>
                <Text className="fn-d">{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>
        <View className="card">
          <Text className="card-t">待办事项（{todos.length}）</Text>
          {todos.length === 0 && <Text className="empty">🎉 暂无待办，全部处理完毕</Text>}
          {todos.map((t, i) => (
            <View key={i} className="todo" onClick={() => setSheet(t.key)}>
              <View className="todo-tag"><Text className="todo-tag-t">{t.type}</Text></View>
              <View className="todo-c"><Text className="todo-text">{t.text}</Text></View>
              <Text className="todo-go">›</Text>
            </View>
          ))}
        </View>
        <View style={{ height: '40rpx' }} />
      </ScrollView>

      {sheet && (
        <View className="mask" onClick={() => setSheet(null)}>
          <View className="sheet" onClick={e => e.stopPropagation()}>
            {sheet === 'notice' && (<>
              <View className="sheet-head"><Text className="sheet-name">📢 便民公告</Text><Text className="sheet-add" onClick={addNotice}>+ 发布</Text></View>
              {notices.map(n => (
                <View key={n.id} className="row">
                  <View className="row-main">
                    <Text className="row-t">{n.title} {n.on ? <Text className="pill on">已发布</Text> : <Text className="pill off">已撤下</Text>}</Text>
                    <Text className="row-s">{n.body}</Text>
                    <Text className="row-m">{n.time}</Text>
                  </View>
                  <Text className={n.on ? 'btn btn-warn' : 'btn btn-ok'} onClick={() => toggleNotice(n.id)}>{n.on ? '撤下' : '重发'}</Text>
                </View>
              ))}
            </>)}

            {sheet === 'volunteer' && (<>
              <View className="sheet-head"><Text className="sheet-name">❤️ 志愿活动</Text><Text className="sheet-add" onClick={addVol}>+ 发起</Text></View>
              {vols.map(v => (
                <View key={v.id} className="row">
                  <View className="row-main">
                    <Text className="row-t">{v.name} {v.status === '报名中' ? <Text className="pill on">报名中</Text> : <Text className="pill off">已结束</Text>}</Text>
                    <Text className="row-s">🕑 {v.time} · 已报名 {v.signed}/{v.quota} 人</Text>
                  </View>
                  {v.status === '报名中'
                    ? <Text className="btn btn-warn" onClick={() => endVol(v.id)}>结束</Text>
                    : <Text className="btn btn-mut" onClick={() => toast(`共 ${v.signed} 人报名`)}>报名情况</Text>}
                </View>
              ))}
            </>)}

            {sheet === 'council' && (<>
              <View className="sheet-head"><Text className="sheet-name">🗳️ 社区议事</Text></View>
              {props.map(p => (
                <View key={p.id} className="row">
                  <View className="row-main">
                    <Text className="row-t">{p.title} {p.status === '投票中' ? <Text className="pill on">投票中</Text> : <Text className="pill ok">已公示</Text>}</Text>
                    <Text className="row-s">👍 赞成 {p.agree} · 👎 反对 {p.oppose}</Text>
                    {p.result && <Text className="row-m">公示：{p.result}</Text>}
                  </View>
                  {p.status === '投票中'
                    ? <Text className="btn btn-ok" onClick={() => voteResult(p.id)}>公示结果</Text>
                    : <Text className="btn btn-mut">已公示</Text>}
                </View>
              ))}
            </>)}

            {sheet === 'grid' && (<>
              <View className="sheet-head"><Text className="sheet-name">🛡️ 综治网格</Text></View>
              {hazards.map(h => (
                <View key={h.id} className="row">
                  <View className="row-main">
                    <Text className="row-t">{h.text} {h.level === '较大' ? <Text className="pill warn">较大</Text> : <Text className="pill off">一般</Text>}</Text>
                    <Text className="row-s">📍 {h.grid} · {h.done ? '已处理' : '待处理'}</Text>
                  </View>
                  {h.done ? <Text className="btn btn-mut">已处理</Text> : <Text className="btn btn-ok" onClick={() => doneHazard(h.id)}>标记已处理</Text>}
                </View>
              ))}
            </>)}

            {sheet === 'service' && (<>
              <View className="sheet-head"><Text className="sheet-name">👥 居民服务 · 代办</Text></View>
              {services.map(s => (
                <View key={s.id} className="row">
                  <View className="row-main">
                    <Text className="row-t">{s.resident} <Text className="pill on">{s.kind}</Text> {s.done && <Text className="pill ok">已办结</Text>}</Text>
                    <Text className="row-s">{s.text}</Text>
                  </View>
                  {s.done ? <Text className="btn btn-mut">已办结</Text> : <Text className="btn btn-ok" onClick={() => doneService(s.id)}>标记办结</Text>}
                </View>
              ))}
            </>)}

            {sheet === 'care' && (<>
              <View className="sheet-head"><Text className="sheet-name">👴 一老一小</Text></View>
              {cares.map(c => (
                <View key={c.id} className="row">
                  <View className="row-main">
                    <Text className="row-t">{c.name} <Text className="pill on">{c.kind}</Text> {c.served && <Text className="pill ok">今日已服务</Text>}</Text>
                    <Text className="row-s">{c.note}</Text>
                  </View>
                  {c.served ? <Text className="btn btn-mut">已服务</Text> : <Text className="btn btn-ok" onClick={() => serveCare(c.id)}>记录服务</Text>}
                </View>
              ))}
            </>)}

            {sheet === 'points' && (<>
              <View className="sheet-head"><Text className="sheet-name">⭐ 贡献值管理</Text></View>
              {[...points].sort((a, b) => b.points - a.points).map(n => (
                <View key={n.id} className="row">
                  <View className="row-main">
                    <Text className="row-t">{n.name} · <Text className="pts">{n.points} 贡献值</Text></Text>
                    <Text className="row-s">最近：{n.last}</Text>
                  </View>
                  <Text className="btn btn-ok" onClick={() => addPoint(n.id, n)}>加贡献值</Text>
                </View>
              ))}
            </>)}

            {sheet === 'group' && (<>
              <View className="sheet-head"><Text className="sheet-name">🛒 社区团购</Text></View>
              {groups.map(g => (
                <View key={g.id} className="row">
                  <View className="row-main">
                    <Text className="row-t">{g.goods} · {g.qty} {g.confirmed ? <Text className="pill ok">已定供应方</Text> : <Text className="pill on">待确认</Text>}</Text>
                    <Text className="row-s">👥 {g.joined} 人参团{g.supplier ? ` · 供应方：${g.supplier}` : ''}</Text>
                  </View>
                  {g.confirmed ? <Text className="btn btn-mut">已确认</Text> : <Text className="btn btn-ok" onClick={() => confirmSupplier(g.id, g)}>确认供应方</Text>}
                </View>
              ))}
            </>)}

            <Text className="sheet-close" onClick={() => setSheet(null)}>关闭</Text>
          </View>
        </View>
      )}
    </View>
  );
}
