import {
  Divider, Grid, H2, H3,
  Pill, Row, Stack, Stat, Text,
  useHostTheme, Callout, ThemeProvider,
} from './canvas-shim';
import { useState } from 'react';

type Theme = ReturnType<typeof useHostTheme>;

// ── Mock Data ────────────────────────────────────────────────────────────────

const VILLAGE = { name: '范庄村', township: '方城乡', logo: '村', members: 312, stores: 18 };

const PRODUCTS = [
  { id: 1, name: '有机小米', price: 28, unit: '斤', store: '范庄粮铺', sales: 142, tag: '本村特产' },
  { id: 2, name: '土鸡蛋', price: 36, unit: '30枚', store: '王大姐农场', sales: 89, tag: '散养' },
  { id: 3, name: '红薯粉条', price: 15, unit: '斤', store: '李家粉坊', sales: 210, tag: '手工' },
  { id: 4, name: '花生油', price: 68, unit: '桶', store: '范庄油坊', sales: 55, tag: '冷榨' },
  { id: 5, name: '蜂蜜', price: 88, unit: '斤', store: '山顶蜂场', sales: 37, tag: '野生' },
  { id: 6, name: '腊肉', price: 58, unit: '斤', store: '陈记腊味', sales: 63, tag: '腊制' },
];

const GROUPS = [
  { id: 1, name: '新鲜大白菜', price: 1.2, unit: '斤', from: '邻村·李庄', min: 50, current: 38, deadline: '12小时', img: '菜' },
  { id: 2, name: '农家黑猪肉', price: 32, unit: '斤', from: '本村', min: 20, current: 17, deadline: '8小时', img: '肉' },
  { id: 3, name: '苹果（富士）', price: 5.5, unit: '斤', from: '邻村·张庄', min: 100, current: 100, deadline: '已成团', img: '果' },
  { id: 4, name: '玉米面', price: 3.8, unit: '斤', from: '本村', min: 30, current: 12, deadline: '24小时', img: '粮' },
];

const NOTICES = [
  '本月25日发放利益共享金，请绑定银行卡',
  '范庄村第三届农产品市集将于本周六举办',
  '方城乡通知：秋季种植补贴申请截止11月30日',
];

const PARTY_EVENTS = [
  { date: '11月15日', title: '主题党日活动·参观红色教育基地', members: 24, status: '已完成' },
  { date: '11月8日', title: '党员学习：习近平总书记关于乡村振兴重要论述', members: 31, status: '已完成' },
  { date: '12月1日', title: '冬季慰问困难群众志愿服务活动', members: 18, status: '报名中' },
];

// ── App Shell ────────────────────────────────────────────────────────────────

type Tab = '首页' | '小店' | '团购' | '党建' | '我的';
const TABS: { id: Tab; icon: string }[] = [
  { id: '首页', icon: '⌂' },
  { id: '小店', icon: '⊞' },
  { id: '团购', icon: '◎' },
  { id: '党建', icon: '✦' },
  { id: '我的', icon: '◉' },
];

export default function AppRoot() {
  const [mode, setMode] = useState<'dark' | 'light'>('dark');
  return (
    <ThemeProvider mode={mode}>
      <GongXiangDemo mode={mode} onToggle={() => setMode(m => m === 'dark' ? 'light' : 'dark')} />
    </ThemeProvider>
  );
}

function GongXiangDemo({ mode, onToggle }: { mode: 'dark' | 'light'; onToggle: () => void }) {
  const theme = useHostTheme();
  const [tab, setTab] = useState<Tab>('首页');
  const [selected, setSelected] = useState<number | null>(null);
  const [joined, setJoined] = useState<Set<number>>(new Set());
  const [groupCounts, setGroupCounts] = useState<Record<number, number>>({});

  const handleJoin = (id: number) => {
    if (joined.has(id)) return;
    setJoined(prev => new Set([...prev, id]));
    setGroupCounts(prev => ({ ...prev, [id]: (prev[id] ?? 0) + 1 }));
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: theme.bg.chrome, overflow: 'hidden' }}>
      {/* Phone Frame */}
      <div style={{
        width: 390, flexShrink: 0,
        background: theme.bg.editor,
        borderRight: `1px solid ${theme.stroke.secondary}`,
        display: 'flex', flexDirection: 'column',
        position: 'relative',
      }}>
        {/* Status Bar */}
        <div style={{
          height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 20px', background: theme.bg.elevated,
          borderBottom: `1px solid ${theme.stroke.tertiary}`,
          flexShrink: 0,
        }}>
          <Text size="small" style={{ fontWeight: 600, color: theme.text.secondary }}>9:41</Text>
          <Text size="small" style={{ color: theme.text.secondary }}>供享村社</Text>
          <Text size="small" style={{ color: theme.text.secondary }}>●●●</Text>
        </div>

        {/* Screen Content */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {tab === '首页' && <HomeScreen theme={theme} setTab={setTab} />}
          {tab === '小店' && <StoreScreen theme={theme} selected={selected} setSelected={setSelected} />}
          {tab === '团购' && <GroupScreen theme={theme} joined={joined} groupCounts={groupCounts} onJoin={handleJoin} />}
          {tab === '党建' && <PartyScreen theme={theme} />}
          {tab === '我的' && <ProfileScreen theme={theme} joined={joined} />}
        </div>

        {/* Tab Bar */}
        <div style={{
          height: 60, display: 'flex', alignItems: 'center',
          borderTop: `1px solid ${theme.stroke.secondary}`,
          background: theme.bg.elevated, flexShrink: 0,
        }}>
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, height: '100%', border: 'none', background: 'none',
                cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 2,
              }}
            >
              <span style={{ fontSize: 18, color: tab === t.id ? theme.accent.primary : theme.text.tertiary }}>
                {t.icon}
              </span>
              <span style={{
                fontSize: 10, color: tab === t.id ? theme.accent.primary : theme.text.tertiary,
                fontWeight: tab === t.id ? 600 : 400,
              }}>{t.id}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ flex: 1, overflow: 'auto', padding: 32 }}>
        {/* Theme Toggle */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
          <button
            onClick={onToggle}
            style={{
              padding: '6px 14px', borderRadius: 20, border: `1px solid ${theme.stroke.secondary}`,
              background: theme.bg.elevated, color: theme.text.secondary,
              cursor: 'pointer', fontSize: 12, fontWeight: 500,
            }}
          >
            {mode === 'dark' ? '切换浅色' : '切换深色'}
          </button>
        </div>
        <RightPanel theme={theme} tab={tab} selected={selected} joined={joined} />
      </div>
    </div>
  );
}

// ── Home Screen ──────────────────────────────────────────────────────────────

function HomeScreen({ theme, setTab }: { theme: Theme; setTab: (t: Tab) => void }) {
  const [noticeIdx, setNoticeIdx] = useState(0);

  return (
    <Stack gap={0}>
      <div style={{
        background: theme.fill.secondary,
        padding: '20px 16px 16px',
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
      }}>
        <Row gap={12} align="center">
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: theme.accent.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme.text.onAccent, fontWeight: 700, fontSize: 18,
          }}>
            {VILLAGE.logo}
          </div>
          <Stack gap={2}>
            <Text style={{ fontWeight: 700, fontSize: 16, color: theme.text.primary }}>
              {VILLAGE.name} · 欢迎回家
            </Text>
            <Text size="small" tone="secondary">{VILLAGE.township} · {VILLAGE.members} 位村民 · {VILLAGE.stores} 家小店</Text>
          </Stack>
        </Row>
      </div>

      <div
        onClick={() => setNoticeIdx(i => (i + 1) % NOTICES.length)}
        style={{
          padding: '8px 16px', background: theme.fill.tertiary,
          borderBottom: `1px solid ${theme.stroke.tertiary}`,
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
        }}
      >
        <span style={{ fontSize: 10, color: theme.accent.primary, fontWeight: 700, flexShrink: 0 }}>公告</span>
        <Text size="small" tone="secondary" style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {NOTICES[noticeIdx]}
        </Text>
        <span style={{ fontSize: 10, color: theme.text.tertiary }}>›</span>
      </div>

      <div style={{ padding: '16px 16px 8px' }}>
        <Text size="small" style={{ fontWeight: 600, color: theme.text.secondary, marginBottom: 12, display: 'block' }}>功能入口</Text>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {[
            { label: '供享小店', icon: '⊞', tab: '小店' as Tab },
            { label: '惠民团购', icon: '◎', tab: '团购' as Tab },
            { label: '党建助农', icon: '✦', tab: '党建' as Tab },
            { label: '积分商城', icon: '◈', tab: '我的' as Tab },
            { label: '志愿服务', icon: '♡', tab: '党建' as Tab },
            { label: '就业招工', icon: '◧', tab: '首页' as Tab },
            { label: '非遗文化', icon: '◑', tab: '首页' as Tab },
            { label: '村务公开', icon: '◻', tab: '首页' as Tab },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => item.tab !== '首页' && setTab(item.tab)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 4,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: theme.fill.secondary,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, color: theme.accent.primary,
              }}>{item.icon}</div>
              <Text size="small" style={{ fontSize: 10, color: theme.text.secondary }}>{item.label}</Text>
            </button>
          ))}
        </div>
      </div>

      <Divider />

      <div style={{ padding: '12px 16px 0' }}>
        <Row gap={8} align="center" style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: 600, fontSize: 14, color: theme.text.primary }}>本村精选</Text>
          <button onClick={() => setTab('小店')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <Text size="small" style={{ color: theme.accent.primary }}>查看全部 ›</Text>
          </button>
        </Row>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {PRODUCTS.slice(0, 4).map(p => (
            <ProductCard key={p.id} product={p} theme={theme} compact />
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>
        <Row gap={8} align="center" style={{ marginBottom: 12 }}>
          <Text style={{ fontWeight: 600, fontSize: 14, color: theme.text.primary }}>热门团购</Text>
          <button onClick={() => setTab('团购')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <Text size="small" style={{ color: theme.accent.primary }}>查看全部 ›</Text>
          </button>
        </Row>
        {GROUPS.slice(0, 2).map(g => (
          <GroupCard key={g.id} group={g} theme={theme} compact joined={false} onJoin={() => {}} />
        ))}
      </div>

      <div style={{ height: 20 }} />
    </Stack>
  );
}

// ── Store Screen ─────────────────────────────────────────────────────────────

function StoreScreen({ theme, selected, setSelected }: {
  theme: Theme; selected: number | null; setSelected: (id: number | null) => void;
}) {
  const [search, setSearch] = useState('');
  const filtered = PRODUCTS.filter(p =>
    p.name.includes(search) || p.store.includes(search) || p.tag.includes(search)
  );

  return (
    <Stack gap={0}>
      <div style={{ padding: '12px 16px', background: theme.bg.elevated, borderBottom: `1px solid ${theme.stroke.tertiary}` }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索商品、小店..."
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 20,
            border: `1px solid ${theme.stroke.secondary}`,
            background: theme.fill.tertiary, color: theme.text.primary,
            fontSize: 13, outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      <div style={{ padding: '12px 16px 4px' }}>
        <Row gap={8} align="center">
          <Text size="small" style={{ fontWeight: 600, color: theme.text.secondary }}>本村小店</Text>
          <Text size="small" tone="secondary">{filtered.length} 件商品</Text>
        </Row>
      </div>

      <div style={{ padding: '8px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {filtered.map(p => (
          <div key={p.id} onClick={() => setSelected(p.id === selected ? null : p.id)}>
            <ProductCard product={p} theme={theme} compact={false} selected={p.id === selected} />
          </div>
        ))}
      </div>
      <div style={{ height: 20 }} />
    </Stack>
  );
}

function ProductCard({ product: p, theme, compact, selected }: {
  product: typeof PRODUCTS[0]; theme: Theme; compact: boolean; selected?: boolean;
}) {
  const labels: Record<number, string> = { 1: '粮', 2: '蛋', 3: '粉', 4: '油', 5: '蜜', 6: '肉' };
  return (
    <div style={{
      borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
      border: `1px solid ${selected ? theme.accent.primary : theme.stroke.secondary}`,
      background: selected ? theme.fill.tertiary : theme.bg.elevated,
    }}>
      <div style={{
        height: compact ? 70 : 100,
        background: theme.fill.secondary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: compact ? 22 : 28, fontWeight: 700,
        color: theme.text.tertiary,
      }}>
        {labels[p.id] ?? '品'}
      </div>
      <div style={{ padding: compact ? '6px 8px' : '10px 12px' }}>
        <Text size="small" style={{ fontWeight: 600, color: theme.text.primary, display: 'block' }}>{p.name}</Text>
        {!compact && <Text size="small" tone="secondary" style={{ display: 'block', marginTop: 2 }}>{p.store}</Text>}
        <Row gap={4} align="center" style={{ marginTop: 4 }}>
          <Pill tone="info" size="sm">{p.tag}</Pill>
        </Row>
        <Row gap={4} align="center" style={{ marginTop: 6 }}>
          <Text style={{ fontWeight: 700, color: theme.accent.primary, fontSize: compact ? 13 : 15 }}>
            ¥{p.price}
          </Text>
          <Text size="small" tone="secondary">/{p.unit}</Text>
        </Row>
        {!compact && (
          <Text size="small" tone="secondary" style={{ marginTop: 2, display: 'block' }}>已售 {p.sales} {p.unit}</Text>
        )}
      </div>
    </div>
  );
}

// ── Group Buy Screen ─────────────────────────────────────────────────────────

function GroupScreen({ theme, joined, groupCounts, onJoin }: {
  theme: Theme; joined: Set<number>;
  groupCounts: Record<number, number>; onJoin: (id: number) => void;
}) {
  return (
    <Stack gap={0}>
      <div style={{
        padding: '12px 16px', background: theme.fill.secondary,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
      }}>
        <Text style={{ fontWeight: 700, fontSize: 15, color: theme.text.primary }}>惠民团购</Text>
        <Text size="small" tone="secondary">达到成团人数自动下单，未成团全额退款</Text>
      </div>

      <div style={{ padding: '12px 16px' }}>
        {GROUPS.map(g => (
          <GroupCard
            key={g.id} group={g} theme={theme} compact={false}
            joined={joined.has(g.id)}
            extra={groupCounts[g.id] ?? 0}
            onJoin={() => onJoin(g.id)}
          />
        ))}
      </div>
      <div style={{ height: 20 }} />
    </Stack>
  );
}

function GroupCard({ group: g, theme, compact, joined, extra = 0, onJoin }: {
  group: typeof GROUPS[0]; theme: Theme; compact: boolean;
  joined: boolean; extra?: number; onJoin: () => void;
}) {
  const total = g.current + extra;
  const pct = Math.min(total / g.min, 1);
  const done = g.deadline === '已成团' || total >= g.min;

  return (
    <div style={{
      borderRadius: 10, border: `1px solid ${theme.stroke.secondary}`,
      background: theme.bg.elevated, marginBottom: 12, overflow: 'hidden',
    }}>
      <div style={{ padding: compact ? '10px 12px' : '14px 14px 10px' }}>
        <Row gap={10} align="center">
          <div style={{
            width: compact ? 36 : 50, height: compact ? 36 : 50, borderRadius: 8, flexShrink: 0,
            background: theme.fill.secondary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: compact ? 18 : 24, color: theme.text.primary,
          }}>{g.img}</div>
          <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
            <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>{g.name}</Text>
            <Text size="small" tone="secondary">来自：{g.from}</Text>
            <Row gap={6} align="center">
              <Text style={{ color: theme.accent.primary, fontWeight: 700, fontSize: compact ? 13 : 15 }}>
                ¥{g.price}
              </Text>
              <Text size="small" tone="secondary">/{g.unit}</Text>
              {done && <Pill tone="success" size="sm">已成团</Pill>}
              {!done && <Pill tone="warning" size="sm">剩余 {g.deadline}</Pill>}
            </Row>
          </Stack>
          {!compact && (
            <button
              onClick={onJoin}
              disabled={done || joined}
              style={{
                padding: '6px 14px', borderRadius: 20, border: 'none',
                cursor: done || joined ? 'default' : 'pointer',
                background: done || joined ? theme.fill.secondary : theme.accent.primary,
                color: done || joined ? theme.text.tertiary : theme.text.onAccent,
                fontSize: 12, fontWeight: 600, flexShrink: 0,
              }}
            >
              {done ? '已成团' : joined ? '已参团' : '参与'}
            </button>
          )}
        </Row>

        {!compact && (
          <div style={{ marginTop: 10 }}>
            <Row gap={8} align="center" style={{ marginBottom: 4 }}>
              <Text size="small" tone="secondary">成团进度</Text>
              <Text size="small" style={{ color: done ? theme.accent.primary : theme.text.secondary, fontWeight: 600 }}>
                {total}/{g.min} 份
              </Text>
            </Row>
            <div style={{ height: 6, borderRadius: 3, background: theme.fill.secondary, overflow: 'hidden' }}>
              <div style={{
                width: `${pct * 100}%`, height: '100%', borderRadius: 3,
                background: done ? theme.accent.primary : theme.fill.primary,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Party Screen ─────────────────────────────────────────────────────────────

function PartyScreen({ theme }: { theme: Theme }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <Stack gap={0}>
      <div style={{
        padding: '16px',
        background: theme.fill.secondary,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
      }}>
        <Row gap={10} align="center">
          <div style={{
            width: 40, height: 40, borderRadius: 8,
            background: theme.fill.tertiary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, fontWeight: 700, color: theme.text.secondary,
          }}>党</div>
          <Stack gap={2}>
            <Text style={{ fontWeight: 700, fontSize: 15, color: theme.text.primary }}>党建助农</Text>
            <Text size="small" tone="secondary">范庄村党支部 · 党员 31 人</Text>
          </Stack>
        </Row>
      </div>

      <div style={{ padding: '12px 16px' }}>
        <Grid columns={3} gap={10} style={{ marginBottom: 16 }}>
          {[
            { label: '党员人数', value: '31' },
            { label: '本月活动', value: '8' },
            { label: '志愿时长', value: '142' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center', padding: '12px 8px', background: theme.fill.tertiary, borderRadius: 10 }}>
              <Text style={{ fontSize: 20, fontWeight: 700, color: theme.text.primary, display: 'block' }}>{s.value}</Text>
              <Text size="small" tone="secondary">{s.label}</Text>
            </div>
          ))}
        </Grid>

        <Text style={{ fontWeight: 600, fontSize: 14, color: theme.text.primary, display: 'block', marginBottom: 10 }}>
          党建活动
        </Text>

        {PARTY_EVENTS.map((ev, i) => (
          <div
            key={i}
            onClick={() => setExpanded(expanded === i ? null : i)}
            style={{
              border: `1px solid ${theme.stroke.secondary}`, borderRadius: 10,
              marginBottom: 10, overflow: 'hidden', cursor: 'pointer',
              background: theme.bg.elevated,
            }}
          >
            <div style={{ padding: '12px 14px' }}>
              <Row gap={10} align="center">
                <Stack gap={2} style={{ flex: 1 }}>
                  <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>{ev.title}</Text>
                  <Row gap={8} align="center">
                    <Text size="small" tone="secondary">{ev.date}</Text>
                    <Text size="small" tone="secondary">· {ev.members} 人参与</Text>
                  </Row>
                </Stack>
                <Pill tone={ev.status === '已完成' ? 'success' : 'warning'} size="sm">{ev.status}</Pill>
              </Row>
            </div>
            {expanded === i && (
              <div style={{ padding: '0 14px 12px', borderTop: `1px solid ${theme.stroke.tertiary}` }}>
                <Text size="small" tone="secondary" style={{ marginTop: 10, display: 'block' }}>
                  {ev.status === '报名中'
                    ? '活动正在报名中，点击下方按钮报名参加，参与后可获得20贡献值。'
                    : `本次活动已圆满完成，共${ev.members}名党员及群众参与，活动记录已上传至党建档案。`}
                </Text>
                {ev.status === '报名中' && (
                  <div style={{ marginTop: 10 }}>
                    <button style={{
                      padding: '6px 20px', borderRadius: 20,
                      background: theme.accent.primary, color: theme.text.onAccent,
                      border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    }}>
                      立即报名 · 得20贡献值
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        <div style={{ marginTop: 8 }}>
          <Text style={{ fontWeight: 600, fontSize: 14, color: theme.text.primary, display: 'block', marginBottom: 10 }}>
            党员学习园地
          </Text>
          {[
            { title: '11月学习主题：习近平总书记关于乡村振兴重要论述', duration: '预计30分钟', done: true },
            { title: '党史故事：从延安精神看新时代基层党建', duration: '预计20分钟', done: false },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '12px 14px', borderRadius: 10, marginBottom: 8,
              border: `1px solid ${theme.stroke.secondary}`,
              background: item.done ? theme.fill.tertiary : theme.bg.elevated,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <Stack gap={2} style={{ flex: 1, marginRight: 12 }}>
                <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>{item.title}</Text>
                <Text size="small" tone="secondary">{item.duration}</Text>
              </Stack>
              <Pill tone={item.done ? 'success' : 'neutral'} size="sm">{item.done ? '已学习' : '去学习'}</Pill>
            </div>
          ))}
        </div>
      </div>
      <div style={{ height: 20 }} />
    </Stack>
  );
}

// ── Profile Screen ───────────────────────────────────────────────────────────

function ProfileScreen({ theme, joined }: { theme: Theme; joined: Set<number> }) {
  const [showDetail, setShowDetail] = useState<string | null>(null);
  const contribution = 1480;
  const certificates = Math.floor(contribution / 1000);

  return (
    <Stack gap={0}>
      <div style={{
        padding: '20px 16px 16px', background: theme.fill.secondary,
        borderBottom: `1px solid ${theme.stroke.tertiary}`,
      }}>
        <Row gap={12} align="center">
          <div style={{
            width: 52, height: 52, borderRadius: '50%',
            background: theme.accent.primary,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: theme.text.onAccent, fontWeight: 700, fontSize: 20,
          }}>范</div>
          <Stack gap={4}>
            <Text style={{ fontWeight: 700, fontSize: 16, color: theme.text.primary }}>范村民 · 创业者</Text>
            <Row gap={6} align="center">
              <Pill tone="info" size="sm">Lv.3 推广达人</Pill>
              <Pill tone="success" size="sm">已参团 {joined.size}</Pill>
            </Row>
          </Stack>
        </Row>
      </div>

      <div style={{ padding: '16px' }}>
        <Text style={{ fontWeight: 600, fontSize: 14, color: theme.text.primary, display: 'block', marginBottom: 10 }}>
          我的账户
        </Text>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: '现金账户', value: '¥ 128.50', sub: '可提现', key: 'cash', tone: theme.accent.primary },
            { label: '积分账户', value: '2,360 分', sub: '可兑换', key: 'points', tone: theme.text.secondary },
            { label: '贡献值', value: `${contribution}`, sub: `持有 ${certificates} 张凭证`, key: 'contrib', tone: theme.accent.primary },
          ].map(w => (
            <button
              key={w.key}
              onClick={() => setShowDetail(showDetail === w.key ? null : w.key)}
              style={{
                padding: '14px 10px', borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${showDetail === w.key ? theme.accent.primary : theme.stroke.secondary}`,
                background: showDetail === w.key ? theme.fill.tertiary : theme.bg.elevated,
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: w.tone }}>{w.value}</div>
              <div style={{ fontSize: 11, color: theme.text.secondary, marginTop: 4 }}>{w.label}</div>
              <div style={{ fontSize: 10, color: theme.text.tertiary, marginTop: 2 }}>{w.sub}</div>
            </button>
          ))}
        </div>

        {showDetail === 'cash' && (
          <div style={{ marginBottom: 14, padding: 14, borderRadius: 10, border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated }}>
            <Text size="small" style={{ fontWeight: 600, display: 'block', marginBottom: 8, color: theme.text.primary }}>现金账户明细</Text>
            {[
              { desc: 'CPS返佣 · 花生油', amount: '+12.00', date: '11/20' },
              { desc: '邀请奖励 · 李四', amount: '+8.50', date: '11/18' },
              { desc: '活动返利', amount: '+5.00', date: '11/15' },
              { desc: '提现至银行卡', amount: '-60.00', date: '11/10' },
            ].map((r, i) => (
              <Row key={i} gap={8} align="center" style={{ paddingBottom: 6 }}>
                <Text size="small" tone="secondary" style={{ flex: 1 }}>{r.desc}</Text>
                <Text size="small" tone="secondary">{r.date}</Text>
                <Text size="small" style={{
                  fontWeight: 600,
                  color: r.amount.startsWith('+') ? theme.accent.primary : theme.text.secondary,
                  width: 60, textAlign: 'right',
                }}>{r.amount}</Text>
              </Row>
            ))}
            <Divider />
            <button style={{
              width: '100%', marginTop: 10, padding: '8px', borderRadius: 8,
              background: theme.accent.primary, color: theme.text.onAccent,
              border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            }}>申请提现</button>
          </div>
        )}

        {showDetail === 'contrib' && (
          <div style={{ marginBottom: 14, padding: 14, borderRadius: 10, border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated }}>
            <Text size="small" style={{ fontWeight: 600, display: 'block', marginBottom: 8, color: theme.text.primary }}>贡献值明细</Text>
            <Row gap={8} align="center" style={{ marginBottom: 4 }}>
              <Text size="small" tone="secondary">本月累计</Text>
              <Text size="small" style={{ fontWeight: 700, color: theme.accent.primary }}>{contribution} 贡献值</Text>
            </Row>
            <div style={{ height: 6, borderRadius: 3, background: theme.fill.secondary }}>
              <div style={{ width: `${(contribution % 1000) / 10}%`, height: '100%', borderRadius: 3, background: theme.accent.primary }} />
            </div>
            <Text size="small" tone="secondary" style={{ marginTop: 4, display: 'block' }}>
              距离下一次上链还需 {1000 - (contribution % 1000)} 贡献值 · 已持有 {certificates} 张凭证
            </Text>
            <Divider />
            <Text size="small" style={{ fontWeight: 600, display: 'block', margin: '8px 0 6px', color: theme.text.primary }}>获取方式</Text>
            {[
              { way: '消费购物', pts: '+10/笔' },
              { way: '每日签到', pts: '+5/天' },
              { way: '分享商品', pts: '+3/次' },
              { way: '志愿服务', pts: '+20/次' },
              { way: '填写问卷', pts: '+10/份' },
            ].map((w, i) => (
              <Row key={i} gap={8} align="center" style={{ paddingBottom: 4 }}>
                <Text size="small" tone="secondary" style={{ flex: 1 }}>{w.way}</Text>
                <Text size="small" style={{ color: theme.accent.primary, fontWeight: 600 }}>{w.pts}</Text>
              </Row>
            ))}
          </div>
        )}

        {showDetail === 'points' && (
          <div style={{ marginBottom: 14, padding: 14, borderRadius: 10, border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated }}>
            <Text size="small" style={{ fontWeight: 600, display: 'block', marginBottom: 8, color: theme.text.primary }}>积分商城</Text>
            {[
              { name: '有机小米 1斤', pts: 500, stock: 20 },
              { name: '土鸡蛋 6枚', pts: 300, stock: 15 },
              { name: '优惠券 ¥5', pts: 100, stock: 50 },
            ].map((item, i) => (
              <Row key={i} gap={8} align="center" style={{ paddingBottom: 8 }}>
                <Text size="small" style={{ flex: 1, color: theme.text.primary }}>{item.name}</Text>
                <Text size="small" tone="secondary">库存 {item.stock}</Text>
                <button style={{
                  padding: '4px 10px', borderRadius: 12, border: 'none',
                  background: theme.fill.secondary, color: theme.text.secondary,
                  cursor: 'pointer', fontSize: 11,
                }}>{item.pts} 分兑换</button>
              </Row>
            ))}
          </div>
        )}

        <div style={{
          padding: '14px', borderRadius: 10, marginBottom: 14,
          border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated,
        }}>
          <Row gap={8} align="center" style={{ marginBottom: 8 }}>
            <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>利益共享金</Text>
            <Pill tone="warning" size="sm">本月 25 日发放</Pill>
          </Row>
          <Row gap={16} align="center">
            {[
              { val: '¥ 34.20', sub: '预计本月可得', color: theme.accent.primary },
              { val: String(certificates), sub: '持有凭证数', color: theme.text.primary },
              { val: '¥ 182.60', sub: '历史累计', color: theme.text.primary },
            ].map((s, i) => (
              <Stack key={i} gap={2}>
                <Text style={{ fontWeight: 700, fontSize: 18, color: s.color }}>{s.val}</Text>
                <Text size="small" tone="secondary">{s.sub}</Text>
              </Stack>
            ))}
          </Row>
          <div style={{ marginTop: 10, padding: 8, borderRadius: 6, background: theme.fill.tertiary }}>
            <Text size="small" tone="secondary" style={{ fontSize: 10 }}>
              声明：利益共享金为平台交易利润的按比例分配，不构成固定收益承诺，不涉及股权或虚拟货币。
            </Text>
          </div>
        </div>

        <Text style={{ fontWeight: 600, fontSize: 14, color: theme.text.primary, display: 'block', marginBottom: 10 }}>
          我的服务
        </Text>
        {[
          { label: '我的订单', sub: '查看购买记录' },
          { label: '我的小店', sub: '管理商品 · 已上架 3 件' },
          { label: '邀请记录', sub: '已邀请 5 人 · 累计返佣 ¥28.50' },
          { label: '银行卡管理', sub: '中国工商银行 尾号 6628' },
        ].map((item, i) => (
          <div key={i} style={{
            padding: '12px 14px', borderRadius: 10, marginBottom: 8,
            border: `1px solid ${theme.stroke.secondary}`, background: theme.bg.elevated,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer',
          }}>
            <Stack gap={2}>
              <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>{item.label}</Text>
              <Text size="small" tone="secondary">{item.sub}</Text>
            </Stack>
            <Text tone="secondary">›</Text>
          </div>
        ))}
      </div>
      <div style={{ height: 20 }} />
    </Stack>
  );
}

// ── Right Panel ──────────────────────────────────────────────────────────────

function RightPanel({ theme, tab, selected, joined }: {
  theme: Theme; tab: Tab; selected: number | null; joined: Set<number>;
}) {
  const product = selected ? PRODUCTS.find(p => p.id === selected) : null;

  return (
    <Stack gap={24}>
      <Stack gap={4}>
        <H2>供享村社 · 平台演示</H2>
        <Text tone="secondary">乡村数字经济产业服务平台 · 交互原型</Text>
      </Stack>

      <Grid columns={3} gap={16}>
        <Stat label="当前页面" value={tab} />
        <Stat label="参团数量" value={`${joined.size} 个`} tone={joined.size > 0 ? 'success' : undefined} />
        <Stat label="查看商品" value={selected ? `#${selected}` : '未选中'} />
      </Grid>

      <Divider />

      {tab === '首页' && (
        <Stack gap={12}>
          <H3>首页功能说明</H3>
          <Callout tone="info">
            <Text size="small">点击顶部公告栏可切换通知内容。点击功能入口格可跳转到对应页面。</Text>
          </Callout>
          <Stack gap={8}>
            <Text size="small" style={{ fontWeight: 600, color: theme.text.primary }}>核心设计原则</Text>
            {[
              '一村一码：每个村庄专属二维码，扫码自动绑定，首页展示本村定制内容',
              '村容村貌：图文/视频展示，由村支部统一管理发布',
              '公告栏：滚动展示平台/乡镇级通知，点击切换',
              '功能8格：团购、小店、党建等核心功能快速入口',
            ].map((t, i) => (
              <Row key={i} gap={8} align="start">
                <Text size="small" style={{ color: theme.accent.primary, flexShrink: 0 }}>·</Text>
                <Text size="small" tone="secondary">{t}</Text>
              </Row>
            ))}
          </Stack>
        </Stack>
      )}

      {tab === '小店' && !product && (
        <Stack gap={12}>
          <H3>供享小店说明</H3>
          <Callout tone="info">
            <Text size="small">在左侧手机屏幕点击商品卡片可选中，此处将显示商品详情与运营分析。</Text>
          </Callout>
          <Table
            headers={['商品', '店铺', '售价', '已售', '标签']}
            rows={PRODUCTS.map(p => [p.name, p.store, `¥${p.price}/${p.unit}`, `${p.sales}${p.unit}`, p.tag])}
          />
        </Stack>
      )}

      {tab === '小店' && product && (
        <Stack gap={12}>
          <H3>商品详情 · {product.name}</H3>
          <Grid columns={2} gap={12}>
            <Stat label="售价" value={`¥${product.price}/${product.unit}`} />
            <Stat label="已售" value={`${product.sales} ${product.unit}`} tone="success" />
          </Grid>
          <Table
            headers={['属性', '内容']}
            rows={[
              ['所属小店', product.store],
              ['商品标签', product.tag],
              ['配送方式', '快递 / 到店自提'],
              ['审核状态', '已通过'],
              ['贡献值', '购买可得 10 贡献值'],
            ]}
          />
          <Callout tone="info">
            <Text size="small">平台抽佣后，净利润按各层级比例分配：技术平台5%、运营商剩余利润、创业者按销售获取佣金。</Text>
          </Callout>
        </Stack>
      )}

      {tab === '团购' && (
        <Stack gap={12}>
          <H3>惠民团购说明</H3>
          <Callout tone={joined.size > 0 ? 'success' : 'info'}>
            <Text size="small">
              {joined.size > 0
                ? `你已参与 ${joined.size} 个团购，系统将在截止时间自动判断是否成团。`
                : '在左侧点击"参与"按钮加入团购，体验成团进度实时更新。'}
            </Text>
          </Callout>
          <Table
            headers={['规则', '说明']}
            rows={[
              ['成团条件', '截止时间前预定数量 ≥ 最低成团份数'],
              ['付款时机', '成团后系统自动扣款（预定期间冻结）'],
              ['退款机制', '未成团全额退回现金账户'],
              ['配送方式', '次日统一配送至村委会等指定自提点'],
              ['核销方式', '用户凭取货码二维码到自提点扫码取货'],
              ['外村商品', '目标村管理员可选择是否上架外村团购商品'],
            ]}
          />
        </Stack>
      )}

      {tab === '党建' && (
        <Stack gap={12}>
          <H3>党建助农模块说明</H3>
          <Callout tone="info">
            <Text size="small">点击左侧活动卡片可展开详情，查看活动说明和报名入口。</Text>
          </Callout>
          <Table
            headers={['板块', '功能']}
            rows={[
              ['活动展示', '展示本村党建活动记录，已完成和报名中两种状态'],
              ['党员学习园地', '发布学习内容，记录完成状态，可获贡献值激励'],
              ['数据汇总', '党员人数、本月活动次数、累计志愿时长统计'],
              ['贡献值联动', '参与党建活动可获贡献值，参与利益共享分配'],
              ['上级汇报', '各村党建数据自动向乡镇级汇总展示'],
            ]}
          />
        </Stack>
      )}

      {tab === '我的' && (
        <Stack gap={12}>
          <H3>账户体系说明</H3>
          <Callout tone="info">
            <Text size="small">点击左侧三个账户卡片可展开详情，查看明细和操作。</Text>
          </Callout>
          <Table
            headers={['账户类型', '来源', '用途', '可提现']}
            rows={[
              ['现金账户', 'CPS返佣、活动返利', '提现、站内消费', '是'],
              ['积分账户', '平台活动积分', '积分商城兑换', '否'],
              ['贡献值账户', '消费/签到/分享等行为', '参与利益共享金分配', '否（凭证形式）'],
            ]}
          />
          <div style={{
            padding: '12px 14px', borderRadius: 8,
            background: theme.fill.tertiary, border: `1px solid ${theme.stroke.secondary}`,
          }}>
            <Text size="small" style={{ color: theme.text.primary, fontFamily: 'monospace' }}>
              个人分配额 = 利益共享池总额 × (持有凭证数 ÷ 全网凭证总量)
            </Text>
          </div>
        </Stack>
      )}
    </Stack>
  );
}
