import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, ScrollView, Input } from '@tarojs/components';
import { useState } from 'react';
import { store } from '../../store';
import { payOrder } from '../../utils/pay';
import { DEMO_ADDRESS } from '../../config/region';
import './index.css';

// —— AI 智能小卖部 · 24h 无人值守 + AI 店员「小享」（软件演示 · 公开可看，出货需绑定身份）——
// 主题：清新便利店青绿(teal) + 暖橙(amber) 价格/出货，区别于 web3(深色)/公益(红)/共富(暖金)/推广(绿)。

interface Product { id: number; name: string; emoji: string; price: number; stock: number; threshold: number; cat: string; }
interface Msg { who: 'ai' | 'me'; text: string; items?: number[]; }
interface RestockRec { text: string; time: string; }

// 商品种子（默认预警阈值 5；辣条/纸巾/食用油 起始即低于阈值，供补货演示）
const SEED: Product[] = [
  // 饮料
  { id: 1, name: '矿泉水', emoji: '💧', price: 2, stock: 40, threshold: 5, cat: '饮料' },
  { id: 2, name: '冰红茶', emoji: '🧋', price: 3.5, stock: 30, threshold: 5, cat: '饮料' },
  { id: 3, name: '可乐', emoji: '🥤', price: 3, stock: 25, threshold: 5, cat: '饮料' },
  { id: 4, name: '豆奶', emoji: '🥛', price: 4, stock: 18, threshold: 5, cat: '饮料' },
  // 零食
  { id: 5, name: '薯片', emoji: '🥔', price: 6, stock: 24, threshold: 5, cat: '零食' },
  { id: 6, name: '辣条', emoji: '🌶️', price: 2, stock: 2, threshold: 5, cat: '零食' },
  { id: 7, name: '饼干', emoji: '🍪', price: 5, stock: 16, threshold: 5, cat: '零食' },
  { id: 8, name: '瓜子', emoji: '🌻', price: 8, stock: 12, threshold: 5, cat: '零食' },
  { id: 9, name: '巧克力', emoji: '🍫', price: 9, stock: 10, threshold: 5, cat: '零食' },
  // 日用
  { id: 10, name: '牙膏', emoji: '🪥', price: 12, stock: 15, threshold: 5, cat: '日用' },
  { id: 11, name: '香皂', emoji: '🧼', price: 4, stock: 20, threshold: 5, cat: '日用' },
  { id: 12, name: '纸巾', emoji: '🧻', price: 8, stock: 3, threshold: 5, cat: '日用' },
  { id: 13, name: '洗发水', emoji: '🧴', price: 25, stock: 8, threshold: 5, cat: '日用' },
  // 米面粮油
  { id: 14, name: '大米', emoji: '🌾', price: 45, stock: 6, threshold: 5, cat: '米面粮油' },
  { id: 15, name: '面条', emoji: '🍜', price: 6, stock: 14, threshold: 5, cat: '米面粮油' },
  { id: 16, name: '食用油', emoji: '🛢️', price: 55, stock: 5, threshold: 5, cat: '米面粮油' },
  { id: 17, name: '盐', emoji: '🧂', price: 2, stock: 30, threshold: 5, cat: '米面粮油' },
  // 应急
  { id: 18, name: '创可贴', emoji: '🩹', price: 6, stock: 10, threshold: 5, cat: '应急' },
  { id: 19, name: '电池', emoji: '🔋', price: 10, stock: 7, threshold: 5, cat: '应急' },
  { id: 20, name: '打火机', emoji: '🔥', price: 1, stock: 20, threshold: 5, cat: '应急' },
  // 文具
  { id: 21, name: '笔', emoji: '🖊️', price: 2, stock: 25, threshold: 5, cat: '文具' },
  { id: 22, name: '笔记本', emoji: '📓', price: 5, stock: 14, threshold: 5, cat: '文具' },
];

const CATS = ['饮料', '零食', '日用', '米面粮油', '应急', '文具'];
const CAT_EMOJI: Record<string, string> = { '饮料': '🥤', '零食': '🍪', '日用': '🧼', '米面粮油': '🌾', '应急': '🚑', '文具': '✏️' };
const CAT_BLURB: Record<string, string> = {
  '饮料': '解渴的都在这儿，冰镇管够～挑一样？',
  '零食': '嘴馋了？这些零食安排上：',
  '日用': '日用百货挺全的，看看这几样：',
  '米面粮油': '米面粮油送到取货口，居家必备：',
  '应急': '应急小物常备着，关键时刻用得上：',
  '文具': '学习办公的文具，这里有：',
};
// 热门（含冰红茶/薯片/巧克力/可乐）
const POPULAR = [2, 5, 9, 3];
const QUICK = ['有啥饮料', '帮我拿包盐', '推荐点零食', '牙膏多少钱', '怎么补货'];
const RESTOCK_TO = 20; // 补货回满目标库存

const badgeText = (p: Product): string => p.stock <= 0 ? '已售罄' : p.stock <= p.threshold ? `仅剩${p.stock}` : `库存${p.stock}`;
const shelfBadge = (p: Product): string => p.stock <= 0 ? '已售罄' : p.stock <= p.threshold ? `仅剩${p.stock}·缺货` : `库存${p.stock}`;
const badgeClass = (p: Product): string => p.stock <= 0 ? 'b-gray' : p.stock <= p.threshold ? 'b-red' : 'b-green';

const ABILITIES: { i: string; t: string; d: string }[] = [
  { i: '🗣️', t: '自动应答', d: 'AI 对话选购 · 品类/报价/推荐随口就答' },
  { i: '🛒', t: '即时出货', d: '对话或货架即点即取 · 接平台支付结算' },
  { i: '🔄', t: '自动补货', d: '库存预警 → 供销社直采 · 线上下单线下入库' },
  { i: '🚨', t: '异常值守', d: '缺货 / 异常自动报警 · 全天无人也在岗' },
];

export default function AiStorePage() {
  const [products, setProducts] = useState<Product[]>(SEED);
  const [msgs, setMsgs] = useState<Msg[]>([{ who: 'ai', text: '您好！我是 AI 店员小享，24 小时在岗~ 想买点啥、或让我推荐都行。' }]);
  const [val, setVal] = useState('');
  const [soldToday, setSoldToday] = useState(0);
  const [dispensingId, setDispensingId] = useState(0);
  const [restockLog, setRestockLog] = useState<RestockRec[]>([
    { text: '供销社直采 · 矿泉水×24、可乐×20 已补货入库', time: '2 小时前' },
    { text: '供销社直采 · 饼干×18 已补货入库', time: '今天 08:20' },
  ]);

  useLoad(() => { Taro.setNavigationBarTitle({ title: 'AI 智能小卖部' }); });

  const lowItems = products.filter(p => p.stock <= p.threshold);

  // —— 规则引擎：关键词 → 回复（演示，可平滑替换为 AI 大模型）——
  const reply = (raw: string): Msg => {
    const s = raw.trim();
    const has = (...ks: string[]) => ks.some(k => s.includes(k));
    const catItems = (cat: string): number[] => products.filter(p => p.cat === cat && p.stock > 0).slice(0, 4).map(p => p.id);

    // 1) 具体商品名命中（最长优先，避免「笔」抢「笔记本」）
    const hits = products.filter(p => s.includes(p.name)).sort((a, b) => b.name.length - a.name.length);
    if (hits.length > 0) {
      const p = hits[0];
      const desc = p.stock <= 0 ? '暂时售罄 · AI 已发起补货' : p.stock <= p.threshold ? `仅剩 ${p.stock} 件` : '库存充足';
      return { who: 'ai', text: `${p.name} ¥${p.price}，${desc}，为您出货～`, items: [p.id] };
    }
    // 2) 品类词
    if (has('水', '渴', '喝', '饮料')) return { who: 'ai', text: CAT_BLURB['饮料'], items: catItems('饮料') };
    if (has('零食', '吃', '嘴馋', '薯片', '辣条', '瓜子')) return { who: 'ai', text: CAT_BLURB['零食'], items: catItems('零食') };
    if (has('日用', '洗', '牙膏', '纸', '香皂')) return { who: 'ai', text: CAT_BLURB['日用'], items: catItems('日用') };
    if (has('米', '面', '油', '盐', '粮')) return { who: 'ai', text: CAT_BLURB['米面粮油'], items: catItems('米面粮油') };
    if (has('应急', '药', '创可贴', '电池', '打火机')) return { who: 'ai', text: CAT_BLURB['应急'], items: catItems('应急') };
    if (has('笔', '本', '文具')) return { who: 'ai', text: CAT_BLURB['文具'], items: catItems('文具') };
    // 3) 价格意图（具体商品已在上面报价，这里报几个热门价）
    if (has('多少钱', '价', '贵', '便宜')) return { who: 'ai', text: '热门价参考在这儿，想要哪样直接说名字，我帮你出货～', items: POPULAR };
    // 4) 推荐意图
    if (has('推荐', '有啥', '有什么', '好吃', '解馋', '来点')) return { who: 'ai', text: '给你推荐几样卖得最火的～', items: POPULAR };
    // 5) 补货意图
    if (has('补货', '缺货', '没了', '什么时候有', '断货', '到货'))
      return { who: 'ai', text: 'AI 7×24 监测库存，低于阈值就自动向供销社直采补货——缺货的商品已经在补货途中啦。下面「自动补货」能看实时库存和补货记录。' };
    // 6) 问候
    if (has('你好', '您好', '在吗', 'hi', 'Hi', 'HI', '嗨', '哈喽', '在不在'))
      return { who: 'ai', text: '您好呀～我是 AI 店员小享，24 小时在岗。想买饮料、零食、日用、米面粮油、应急、文具都行，直接说要啥，或点下面「货架」挑～' };
    // 7) 兜底
    return { who: 'ai', text: '我这有饮料、零食、日用、米面粮油、应急、文具～ 你说要啥，或点下面「货架」直接挑。' };
  };

  const send = (q: string) => {
    const t = q.trim(); if (!t) return;
    const r = reply(t);
    setMsgs(m => [...m, { who: 'me', text: t }, r]);
    setVal('');
  };

  // —— 出货：游客拦截 → 扣库存 → 记消费贡献值（无退货，即时确认计分）——
  const dispense = async (id: number) => {
    if (!store.requireBound()) return;
    if (dispensingId) return;
    const p = products.find(x => x.id === id);
    if (!p) return;
    if (p.stock <= 0) {
      Taro.showToast({ title: '已售罄，AI已发起补货', icon: 'none' });
      setMsgs(m => [...m, { who: 'ai', text: `「${p.name}」暂时售罄，AI 已自动向供销社发起补货，稍后到货～ 你可先看看别的。` }]);
      return;
    }
    setDispensingId(id);
    const orderId = 'AI' + Date.now();
    const paid = await payOrder({ orderNo: orderId, amount: p.price, description: `AI 智能小卖部 · ${p.name}` });
    if (!paid.ok) {
      setDispensingId(0);
      Taro.showToast({ title: paid.reason === 'cancel' ? '已取消支付' : (paid.message || '支付失败'), icon: 'none' });
      return;
    }
    const pts = Math.max(1, Math.round(p.price * 0.1));
    setProducts(prev => prev.map(x => x.id === id ? { ...x, stock: x.stock - 1 } : x));
    setSoldToday(n => n + 1);
    setMsgs(m => [...m, { who: 'ai', text: `🛒 出货成功！请到取货口领取「${p.name}」。已计消费贡献值 +${pts}` }]);
    Taro.showToast({ title: '出货成功·请取货', icon: 'success' });
    const dt = new Date();
    const p2 = (n: number) => String(n).padStart(2, '0');
    store.addOrder({
      id: orderId,
      date: `${dt.getMonth() + 1}月${dt.getDate()}日 ${p2(dt.getHours())}:${p2(dt.getMinutes())}`,
      status: '已签收',
      items: [{ name: p.name, qty: 1, price: p.price }],
      total: p.price,
      address: DEMO_ADDRESS,
      shop: 'AI 智能小卖部',
      method: '自提',
      delivery: 0,
    });
    store.addContributionAuto('career', 'AI小卖部·' + p.name, pts);
    setDispensingId(0);
    // 刚跌破预警线 → 悄悄提示（也会在「自动补货」区实时体现）
    if (p.stock > p.threshold && p.stock - 1 <= p.threshold) {
      setMsgs(m => [...m, { who: 'ai', text: `📉 「${p.name}」库存已低于预警线，AI 已列入自动补货清单。` }]);
    }
  };

  // —— 自动补货：低库存商品回满 + 记录一条补货流水 ——
  const restock = () => {
    const lows = products.filter(p => p.stock <= p.threshold);
    if (lows.length === 0) { Taro.showToast({ title: '库存充足，暂无需补货', icon: 'none' }); return; }
    const parts = lows.map(p => `${p.name}×${Math.max(RESTOCK_TO - p.stock, 1)}`);
    setProducts(prev => prev.map(p => p.stock <= p.threshold ? { ...p, stock: RESTOCK_TO } : p));
    setRestockLog(prev => [{ text: `供销社直采 · ${parts.join('、')} 已补货入库`, time: '刚刚' }, ...prev]);
    Taro.showToast({ title: `已向供销社直采补货，${lows.length} 样已入库`, icon: 'success' });
    setMsgs(m => [...m, { who: 'ai', text: `🔄 补货完成！${lows.length} 样商品已由供销社直采入库，货架已补满～` }]);
  };

  const endId = 'gx-end-' + msgs.length; // 变化即触发聊天区滚到底

  return (
    <ScrollView scrollY className="page">
      <View className="wrap">
        {/* ① Hero + 值守状态 */}
        <View className="hero">
          <View className="hero-top">
            <Text className="hero-logo">🏪</Text>
            <View className="hero-tt">
              <Text className="hero-t">AI 智能小卖部</Text>
              <View className="hero-status"><View className="dot" /><Text className="hero-status-t">24 小时值守中</Text></View>
            </View>
          </View>
          <Text className="hero-sub">AI 店员「小享」为你值守 · 随时聊 · 即时出货 · 自动补货</Text>
          <View className="stats">
            <View className="stat"><Text className="stat-n">{soldToday}</Text><Text className="stat-l">今日出货</Text></View>
            <View className="stat"><Text className="stat-n">{products.length}</Text><Text className="stat-l">在架商品</Text></View>
            <View className="stat"><Text className={`stat-n ${lowItems.length > 0 ? 'warn' : ''}`}>{lowItems.length}</Text><Text className="stat-l">缺货预警</Text></View>
            <View className="stat"><Text className="stat-n">365</Text><Text className="stat-l">连续值守（天）</Text></View>
          </View>
        </View>

        {/* ② AI 对话 */}
        <View className="card">
          <View className="card-h"><Text className="card-t">💬 和 AI 店员小享聊</Text><Text className="card-badge live">在线</Text></View>
          <ScrollView scrollY scrollWithAnimation scrollIntoView={endId} className="chatlog">
            {msgs.map((m, i) => (
              <View key={i} className={`row ${m.who}`}>
                {m.who === 'ai' && <Text className="ava">🤖</Text>}
                <View className="bubble">
                  <Text className="btext">{m.text}</Text>
                  {m.items && m.items.length > 0 && (
                    <View className="ai-cards">
                      {m.items.map(id => {
                        const p = products.find(x => x.id === id);
                        if (!p) return null;
                        return (
                          <View key={id} className="ai-card">
                            <Text className="ai-emoji">{p.emoji}</Text>
                            <View className="ai-mid">
                              <Text className="ai-name">{p.name}</Text>
                              <Text className={`ai-badge ${badgeClass(p)}`}>{badgeText(p)}</Text>
                            </View>
                            <Text className="ai-price">¥{p.price}</Text>
                            <View className="ai-btn" onClick={() => dispense(p.id)}><Text className="ai-btn-t">出货</Text></View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              </View>
            ))}
            <View id={endId} className="chat-end" />
          </ScrollView>
          <View className="quicks">
            {QUICK.map(q => <View key={q} className="quick" onClick={() => send(q)}><Text className="quick-t">{q}</Text></View>)}
          </View>
          <View className="inbar">
            <Input className="inp" value={val} onInput={e => setVal(e.detail.value)} placeholder="想买啥、或让我推荐…" confirmType="send" onConfirm={() => send(val)} />
            <View className="sendbtn" onClick={() => send(val)}><Text className="sendbtn-t">发送</Text></View>
          </View>
        </View>

        {/* ③ 货架 */}
        <View className="card">
          <View className="card-h"><Text className="card-t">🛒 货架 · 即点即取</Text><Text className="card-badge">{products.length} 种在架</Text></View>
          {CATS.map(cat => (
            <View key={cat} className="cat-block">
              <View className="cat-head">
                <Text className="cat-head-t">{CAT_EMOJI[cat]} {cat}</Text>
                <Text className="cat-head-n">{products.filter(p => p.cat === cat).length} 种</Text>
              </View>
              <View className="grid">
                {products.filter(p => p.cat === cat).map(p => (
                  <View key={p.id} className={`tile ${p.stock <= 0 ? 'tile-off' : ''}`} onClick={() => dispense(p.id)}>
                    <Text className="tile-emoji">{p.emoji}</Text>
                    <Text className="tile-name">{p.name}</Text>
                    <View className="tile-row">
                      <Text className="tile-price">¥{p.price}</Text>
                      <Text className={`tile-badge ${badgeClass(p)}`}>{shelfBadge(p)}</Text>
                    </View>
                    <View className={`tile-btn ${p.stock <= 0 ? 'off' : ''}`}><Text className="tile-btn-t">{p.stock <= 0 ? '补货中' : '出货'}</Text></View>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* ④ 自动补货 */}
        <View className="card">
          <View className="card-h"><Text className="card-t">🔄 自动补货</Text><Text className={`card-badge ${lowItems.length > 0 ? 'warn' : ''}`}>{lowItems.length} 样待补</Text></View>
          <Text className="restock-intro">AI 7×24 监测库存，低于阈值自动向供销社直采补货——线上下单、线下入库。</Text>
          <View className="low-list">
            {lowItems.length === 0
              ? <Text className="low-empty">✅ 当前库存充足，暂无缺货预警</Text>
              : lowItems.map(p => <View key={p.id} className="low-chip"><Text className="low-chip-t">{p.emoji} {p.name} 仅剩{p.stock}</Text></View>)}
          </View>
          <View className={`restock-btn ${lowItems.length === 0 ? 'dim' : ''}`} onClick={restock}>
            <Text className="restock-btn-t">🔄 AI 一键补货 / 自动补货</Text>
          </View>
          <Text className="log-title">补货记录</Text>
          {restockLog.map((r, i) => (
            <View key={i} className="log-item">
              <View className="log-dot" />
              <View className="log-body">
                <Text className="log-text">{r.text}</Text>
                <Text className="log-time">{r.time}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ⑤ 值守能力 */}
        <View className="card">
          <View className="card-h"><Text className="card-t">🛡️ 无人值守能力</Text></View>
          <View className="abilities">
            {ABILITIES.map(a => (
              <View key={a.t} className="ability">
                <Text className="ability-i">{a.i}</Text>
                <Text className="ability-t">{a.t}</Text>
                <Text className="ability-d">{a.d}</Text>
              </View>
            ))}
          </View>
          <Text className="ability-foot">无人值守 · 全天在线 · 支付成功才出货 · 出货记消费贡献值（演示示意）</Text>
        </View>

        <Text className="foot">本页为 AI 智能小卖部软件演示：已走平台统一支付与订单台账；当前支付为模拟通道，真机版还需接入持牌支付、AI 大模型与智能货柜硬件。</Text>
      </View>
    </ScrollView>
  );
}
