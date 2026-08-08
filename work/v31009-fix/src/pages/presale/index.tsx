import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView, Picker } from '@tarojs/components';
import { store } from '../../store';
import { DEMO_ADDRESS } from '../../config/region';
import './index.css';

interface Endorser { name: string; role: string; desc: string; }
interface PresaleItem {
  id: number; name: string; emoji: string; origin: string; originDist: number;
  price: number; unit: string; preDays: number; pick: string;
  deadline: number;                      // 截止剩余天数（≤10）
  status: 'active' | 'pending' | 'rejected';
  ordered: number; target: number;       // 已挂单 / 成团目标
  photos: string[]; videoTitle: string;  // 展示物料
  endorser?: Endorser;                   // 人员背书
  stock?: number;                        // 可预订总库存
  opsStage?: '预售中' | '已截单' | '采摘中' | '分拣中' | '配送中' | '已完成';
}

const ITEMS: PresaleItem[] = [
  { id: 1, name: '大棚现摘草莓', emoji: '🍓', origin: '范庄村草莓园', originDist: 3, price: 25, unit: '盒', preDays: 1, pick: '下单次日清晨现摘', deadline: 6, status: 'active', ordered: 48, target: 100, photos: ['🍓', '🌱', '🏡'], videoTitle: '草莓园实拍·当天现摘', endorser: { name: '王建国', role: '范庄村党支部书记', desc: '我是范庄村党支部书记王建国，我为咱村的大棚草莓做背书——绿色种植、当天现摘、新鲜直达，请乡亲们放心买！' } },
  { id: 2, name: '时令绿叶菜', emoji: '🥬', origin: '村合作社菜地', originDist: 1, price: 8, unit: '斤', preDays: 0, pick: '当天早采', deadline: 9, status: 'active', ordered: 120, target: 200, photos: ['🥬', '🌿'], videoTitle: '合作社菜地直采', endorser: { name: '李秀兰', role: '合作社理事长', desc: '我是合作社理事长李秀兰，咱的菜不打农药，当天早上采、中午就送到您家。' } },
  { id: 3, name: '散养土鸡蛋', emoji: '🥚', origin: '华明邻村养殖户', originDist: 8, price: 18, unit: '30枚', preDays: 1, pick: '每日新鲜捡拾', deadline: 4, status: 'active', ordered: 35, target: 80, photos: ['🥚', '🐔'], videoTitle: '散养鸡场实拍' },
  { id: 4, name: '小站现碾稻米', emoji: '🌾', origin: '津南小站镇', originDist: 25, price: 68, unit: '5kg', preDays: 0, pick: '现碾新米', deadline: 10, status: 'active', ordered: 90, target: 150, photos: ['🌾', '🏞️'], videoTitle: '小站稻田与现碾实拍', endorser: { name: '李文海', role: '小站镇稻香村主任', desc: '我是小站镇稻香村主任李文海，小站稻现碾现发、颗颗饱满，我给乡亲们打包票！' } },
  { id: 5, name: '蓟州鲜香菇', emoji: '🍄', origin: '蓟州山区', originDist: 75, price: 36, unit: '500g', preDays: 1, pick: '当日采菇', deadline: 2, status: 'pending', ordered: 0, target: 60, photos: ['🍄', '⛰️'], videoTitle: '蓟州深山菇棚探访' },
  { id: 6, name: '蓟州红富士', emoji: '🍎', origin: '蓟州果园', originDist: 70, price: 29, unit: '5斤', preDays: 1, pick: '树上现摘', deadline: 7, status: 'active', ordered: 75, target: 120, photos: ['🍎', '🌳'], videoTitle: '蓟州果园采摘现场', endorser: { name: '赵建军', role: '蓟州下营镇果业合作社', desc: '我是蓟州下营镇果业合作社的赵建军，山区昼夜温差大，红富士脆甜多汁，树上现摘现发！' } },
];

const ADDRESSES = ['范庄村·我家（基准）', '华明街道·便民集市（+8km）', '东丽城区·住宅小区（+20km）'];
const ADDR_OFFSET = [0, 8, 20];
const STATUS_TEXT = { active: '预售中', pending: '待审批', rejected: '已驳回' };
// 预售收货地址（演示：与下单结算页一致，正式版取用户默认收货地址）
const DELIVERY_ADDR = DEMO_ADDRESS;

function delivery(dist: number) {
  if (dist <= 5) return { label: '最快2小时达', cls: 'fast' };
  if (dist <= 30) return { label: '当天达', cls: 'today' };
  return { label: '次日达', cls: 'next' };
}

export default function PresalePage() {
  const isAdmin = store.canManageVillage();
  const [items, setItems] = useState<PresaleItem[]>(() => (store.getPresaleItems() as PresaleItem[]) || ITEMS);
  const [addrIdx, setAddrIdx] = useState(0);
  const [detail, setDetail] = useState<PresaleItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'active'>('all');

  // 每次进入页面从本地存储同步：村民发布后，切到村委角色即可看到待审批
  useDidShow(() => {
    const saved = store.getPresaleItems() as PresaleItem[] | null;
    if (saved) setItems(saved);
  });
  const save = (next: PresaleItem[]) => { setItems(next); store.setPresaleItems(next); };

  const pendingCount = items.filter(it => it.status === 'pending').length;
  const activeCount = items.filter(it => it.status === 'active').length;

  // 村委可按状态筛选；村民只见已通过的
  const visible = isAdmin
    ? (filter === 'all' ? items : items.filter(it => it.status === filter))
    : items.filter(it => it.status === 'active');

  const order = (it: PresaleItem, dist: number) => {
    if (!store.requireBound()) return;
    if (it.status !== 'active') { Taro.showToast({ title: '该预售单审批中', icon: 'none' }); return; }
    if (it.price <= 0) { Taro.showToast({ title: '该预售单待村委定价后开放预订', icon: 'none' }); return; }
    if ((it.opsStage || '预售中') !== '预售中') { Taro.showToast({ title: `当前已进入“${it.opsStage}”，不能继续预订`, icon: 'none' }); return; }
    if (it.ordered >= (it.stock || it.target)) { Taro.showToast({ title: '本批次已经售罄', icon: 'none' }); return; }
    const duplicate = store.getOrders().some(o => o.shop === '鲜食预售' && o.items.some(i => i.name === it.name) && o.status !== '已退款' && o.status !== '已取消');
    if (duplicate) { Taro.showToast({ title: '你已有该预售订单，请到“我的订单”处理', icon: 'none' }); return; }
    const d = delivery(dist);
    const pickDay = it.preDays === 0 ? '今天现采' : `预订后第${it.preDays}天现摘`;
    const priceLabel = it.price > 0 ? `¥${it.price}/${it.unit}` : '价格待定';
    Taro.showModal({
      title: '预订确认',
      content: `${it.name}  ${priceLabel}\n产地：${it.origin}（${dist}km）\n采摘：${it.pick}（${pickDay}）\n送达：${d.label}\n截止：还剩 ${it.deadline} 天\n\n确认预订？`,
      confirmText: '立即预订',
      success: (res) => {
        if (!res.confirm) return;
        save(items.map(x => x.id === it.id ? { ...x, ordered: x.ordered + 1 } : x));
        // 预订后生成真实订单，进入「我的订单」主线，可追踪（待定价 price<=0 已在上方拦截，不会生成 ¥0 单）
        const dt = new Date();
        const p2 = (n: number) => (n < 10 ? '0' + n : '' + n);
        const stamp = `${dt.getMonth() + 1}月${dt.getDate()}日 ${p2(dt.getHours())}:${p2(dt.getMinutes())}`;
        store.addOrder({
          id: 'YS' + Date.now(),
          date: stamp,
          status: '待付款',
          items: [{ name: it.name, qty: 1, price: it.price }],
          total: it.price,
          address: DELIVERY_ADDR,
          shop: '鲜食预售',
          method: '配送',
          source: '鲜食预售',
          campaignId: `YS-CAMPAIGN-${it.id}`,
          businessStage: '预售已锁货',
          logistics: [{ time: '刚刚', desc: `已锁定本批次鲜食名额；${it.pick}` }],
        });
        setDetail(null);
        Taro.showToast({ title: `预订成功 · 待支付 · ${d.label}`, icon: 'none' });
      },
    });
  };

  const approve = (id: number, ok: boolean) => {
    if (!ok) {
      save(items.map(it => it.id === id ? { ...it, status: 'rejected' } : it));
      Taro.showToast({ title: '已驳回', icon: 'none' });
      return;
    }
    const target = items.find(it => it.id === id);
    Taro.showModal({
      title: '审核通过并核定价格',
      editable: true,
      placeholderText: target?.price ? `${target.price}` : '输入销售价，如 29.9',
      content: '价格核定后才开放村民预订，避免出现0元单。',
      success: (res: any) => {
        if (!res.confirm) return;
        const price = Number(res.content || target?.price || 0);
        if (!Number.isFinite(price) || price <= 0) { Taro.showToast({ title: '请输入正确价格', icon: 'none' }); return; }
        save(items.map(it => it.id === id ? { ...it, price, stock: it.stock || it.target, opsStage: '预售中', status: 'active' } : it));
        Taro.showToast({ title: `已通过 · 核定 ¥${price}`, icon: 'none' });
      },
    } as any);
  };

  const advanceStage = (it: PresaleItem) => {
    const stages: NonNullable<PresaleItem['opsStage']>[] = ['预售中', '已截单', '采摘中', '分拣中', '配送中', '已完成'];
    const cur = it.opsStage || '预售中';
    const idx = stages.indexOf(cur);
    if (idx < 0 || idx >= stages.length - 1) return;
    const next = stages[idx + 1];
    Taro.showModal({
      title: `推进至“${next}”`,
      content: next === '已截单' ? '截单后停止新增预订，已付款订单进入采摘履约。' : `确认本批次已经进入${next}？相关订单会同步留痕。`,
      success: (res) => {
        if (!res.confirm) return;
        save(items.map(x => x.id === it.id ? { ...x, opsStage: next } : x));
        const cid = `YS-CAMPAIGN-${it.id}`;
        store.setOrders(store.getOrders().map(o => {
          if (o.campaignId !== cid) return o;
          const status = next === '配送中' && o.status === '待发货' ? '配送中' : o.status;
          return { ...o, status, businessStage: next, logistics: [{ time: '刚刚', desc: `鲜食批次已进入：${next}` }, ...(o.logistics || [])] };
        }));
        Taro.showToast({ title: `已进入${next}`, icon: 'none' });
      },
    });
  };

  const publish = () => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: '发布预售单',
      editable: true,
      placeholderText: '如：黄金贡梨 提前2天订 ¥39/箱',
      success: (res: any) => {
        if (!res.confirm || !res.content) return;
        const it: PresaleItem = {
          id: Date.now(), name: res.content, emoji: '🥗', origin: store.getUser()?.name ? `${store.getUser()!.name}的农场` : '我的农场',
          originDist: 2, price: 0, unit: '份', preDays: 1, pick: '现采现发', // price:0 作为"待定价"哨兵，需村委定价后方可预订
          deadline: 10, status: 'pending', ordered: 0, target: 50,
          stock: 50, opsStage: '预售中',
          photos: ['📷'], videoTitle: '待上传展示视频',
        };
        save([it, ...items]);
        Taro.showToast({ title: '已提交，待村委审批（截止10天）', icon: 'none' });
      },
    } as any);
  };

  const playVideo = (title: string, desc?: string) => {
    Taro.showModal({ title: '📹 ' + title, content: desc || '（演示）此处播放产品展示/背书视频。正式版接入视频 CDN 后可直接播放。', showCancel: false });
  };

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-title">🍓 鲜食预售</Text>
        <Text className="hero-sub">先挂单 · 满截止现采 · 就近最快2小时达</Text>
      </View>

      <Picker mode="selector" range={ADDRESSES} value={addrIdx} onChange={e => setAddrIdx(Number(e.detail.value))}>
        <View className="addr-bar">
          <Text className="addr-icon">📍</Text>
          <Text className="addr-text">配送至：{ADDRESSES[addrIdx]}</Text>
          <Text className="addr-arrow">切换 ›</Text>
        </View>
      </Picker>

      <View className="tier-bar">
        <View className="tier fast"><Text className="tier-t">🚀 ≤5km·2小时</Text></View>
        <View className="tier today"><Text className="tier-t">☀️ ≤30km·当天</Text></View>
        <View className="tier next"><Text className="tier-t">🌙 &gt;30km·次日</Text></View>
      </View>

      {/* 村委管理员：审批筛选栏（待审批红色醒目） */}
      {isAdmin && (
        <View className="filter-bar">
          <View className={`f-chip ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}><Text>全部 {items.length}</Text></View>
          <View className={`f-chip pend ${pendingCount > 0 ? 'has' : ''} ${filter === 'pending' ? 'on' : ''}`} onClick={() => setFilter('pending')}><Text>待审批 {pendingCount}</Text></View>
          <View className={`f-chip ${filter === 'active' ? 'on' : ''}`} onClick={() => setFilter('active')}><Text>预售中 {activeCount}</Text></View>
        </View>
      )}
      {isAdmin && pendingCount > 0 && filter !== 'pending' && (
        <View className="appr-tip" onClick={() => setFilter('pending')}>
          <Text className="appr-tip-t">⏳ 有 {pendingCount} 单预售待审批，点此快速处理 ›</Text>
        </View>
      )}

      <ScrollView scrollY className="body">
        <View className="wrap">
          {visible.length === 0 ? (
            <View className="empty"><Text className="empty-t">{filter === 'pending' ? '暂无待审批的预售单' : '暂无预售单'}</Text></View>
          ) : visible.map(it => {
            const dist = it.originDist + ADDR_OFFSET[addrIdx];
            const d = delivery(dist);
            const pct = Math.min(100, Math.round(it.ordered / (it.stock || it.target) * 100));
            return (
              <View key={it.id} className="item" onClick={() => setDetail(it)}>
                <View className="item-img">
                  <Text className="item-emoji">{it.emoji}</Text>
                  <View className={`countdown ${it.deadline <= 2 ? 'urgent' : ''}`}><Text className="countdown-t">还剩{it.deadline}天</Text></View>
                  {it.endorser && <View className="endorse-flag"><Text className="endorse-flag-t">🎖书记背书</Text></View>}
                </View>
                <View className="item-info">
                  <View className="item-name-row">
                    <Text className="item-name">{it.name}</Text>
                    <View className={`st-badge st-${it.status}`}><Text className="st-badge-t">{it.status === 'active' ? (it.opsStage || STATUS_TEXT[it.status]) : STATUS_TEXT[it.status]}</Text></View>
                  </View>
                  <Text className="item-origin">📍 {it.origin} · {dist}km</Text>
                  <View className="order-prog"><View className="order-prog-fill" style={{ width: `${pct}%` }} /></View>
                  <Text className="order-cnt">已预订 {it.ordered}/{it.stock || it.target} · 剩余 {Math.max(0, (it.stock || it.target) - it.ordered)} · {it.preDays === 0 ? '现货当天采' : `提前${it.preDays}天订`}</Text>
                  <View className="item-foot">
                    <View className="item-price-wrap"><Text className="item-price">{it.price > 0 ? `¥${it.price}` : '待定价'}</Text>{it.price > 0 && <Text className="item-unit">/{it.unit}</Text>}</View>
                    <View className={`deliver ${d.cls}`}><Text className="deliver-t">{d.label}</Text></View>
                  </View>

                  {it.status === 'active' && (it.opsStage || '预售中') === '预售中' && (
                    <View className="order-btn" onClick={(e) => { e.stopPropagation(); order(it, dist); }}><Text className="order-btn-t">立即预订</Text></View>
                  )}
                  {it.status === 'active' && isAdmin && (
                    <View className="stage-btn" onClick={(e) => { e.stopPropagation(); advanceStage(it); }}><Text className="stage-btn-t">履约推进：{it.opsStage || '预售中'} ›</Text></View>
                  )}
                  {it.status === 'pending' && isAdmin && (
                    <View className="approve-row">
                      <View className="appr-btn pass" onClick={(e) => { e.stopPropagation(); approve(it.id, true); }}><Text className="appr-t">✓ 通过</Text></View>
                      <View className="appr-btn reject" onClick={(e) => { e.stopPropagation(); approve(it.id, false); }}><Text className="appr-t-r">✕ 驳回</Text></View>
                    </View>
                  )}
                  {it.status === 'rejected' && <View className="rejected-note"><Text className="rejected-note-t">已驳回，可修改后重新提交</Text></View>}
                </View>
              </View>
            );
          })}
        </View>
        <View style={{ height: '140rpx' }} />
      </ScrollView>

      <View className="fab" onClick={publish}><Text className="fab-t">＋ 发布预售单</Text></View>

      {/* 产品详情：图文 / 视频 / 背书 */}
      {detail && (
        <View className="overlay" onClick={() => setDetail(null)}>
          <View className="sheet" onClick={(e) => e.stopPropagation()}>
            <View className="sheet-head">
              <Text className="sheet-title">{detail.emoji} {detail.name}</Text>
              <Text className="sheet-close" onClick={() => setDetail(null)}>✕</Text>
            </View>
            <ScrollView scrollY className="sheet-body">
              <Text className="block-title">📷 产品实拍</Text>
              <View className="photo-wall">
                {detail.photos.map((p, i) => (
                  <View key={i} className="photo"><Text className="photo-emoji">{p}</Text></View>
                ))}
              </View>

              <Text className="block-title">🎬 产品视频</Text>
              <View className="video-card" onClick={() => playVideo(detail.videoTitle)}>
                <Text className="video-cover">{detail.emoji}</Text>
                <View className="video-play"><Text className="video-play-t">▶</Text></View>
                <Text className="video-name">{detail.videoTitle}</Text>
              </View>

              {detail.endorser ? (
                <View>
                  <Text className="block-title">🎖 权威背书</Text>
                  <View className="endorse-card">
                    <View className="endorse-head">
                      <View className="endorse-avatar"><Text className="endorse-avatar-t">👨‍🌾</Text></View>
                      <View className="endorse-who">
                        <Text className="endorse-name">{detail.endorser.name}</Text>
                        <Text className="endorse-role">{detail.endorser.role}</Text>
                      </View>
                    </View>
                    <Text className="endorse-desc">"{detail.endorser.desc}"</Text>
                    <View className="endorse-video" onClick={() => playVideo(`${detail.endorser!.name} 的背书视频`, detail.endorser!.desc)}>
                      <Text className="endorse-video-t">▶ 观看{detail.endorser.name}背书视频</Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View className="no-endorse"><Text className="no-endorse-t">暂无背书，可邀请村书记/合作社负责人录制背书视频</Text></View>
              )}

              <View className="sheet-info">
                <Text className="si-row">截止：还剩 {detail.deadline} 天（最长10天）</Text>
                <Text className="si-row">采摘：{detail.pick}</Text>
                <Text className="si-row">已预订：{detail.ordered}/{detail.stock || detail.target} 份</Text>
                <Text className="si-row">履约状态：{detail.opsStage || '预售中'}</Text>
              </View>
              <View style={{ height: '20rpx' }} />
            </ScrollView>
            <View className="sheet-foot">
              <View className="sheet-price"><Text className="sheet-price-n">{detail.price > 0 ? `¥${detail.price}` : '待定价'}</Text>{detail.price > 0 && <Text className="sheet-price-u">/{detail.unit}</Text>}</View>
              {(detail.opsStage || '预售中') === '预售中' ? (
                <View className="sheet-order" onClick={() => order(detail, detail.originDist + ADDR_OFFSET[addrIdx])}><Text className="sheet-order-t">立即预订</Text></View>
              ) : (
                <View className="sheet-order disabled"><Text className="sheet-order-t">{detail.opsStage}</Text></View>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}
