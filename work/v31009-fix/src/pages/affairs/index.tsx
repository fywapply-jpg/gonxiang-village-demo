import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView, Input, Picker, Button } from '@tarojs/components';
import { store, VillageAffair, Job } from '../../store';
import TabBar from '../../components/TabBar';
import './index.css';

const CAT_COLOR: Record<string, { bg: string; color: string }> = {
  '财务公开': { bg: '#fef2f2', color: '#b91c1c' },
  '工程公示': { bg: '#fff7ed', color: '#ea580c' },
  '民政公示': { bg: '#eff6ff', color: '#2563eb' },
  '组织公开': { bg: '#f5f3ff', color: '#7c3aed' },
};
const CATS = ['全部', '财务公开', '工程公示', '民政公示', '组织公开'] as const;
const AFFAIR_CATS = ['财务公开', '工程公示', '民政公示', '组织公开'] as const;
const JOB_TYPES = ['临时', '兼职', '全职'] as const;

export default function AffairsPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [affairs, setAffairs] = useState<VillageAffair[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<typeof CATS[number]>('全部');
  const [adminTab, setAdminTab] = useState<'affairs' | 'jobs'>('affairs');
  const [affairForm, setAffairForm] = useState({ title: '', catIdx: 0, amount: '' });
  const [jobForm, setJobForm] = useState({ title: '', company: '', salary: '', typeIdx: 0, count: '1', location: '', deadline: '' });

  useDidShow(() => {
    setIsAdmin(store.canManageVillage());
    setAffairs(store.getAffairs());
    setJobs(store.getJobs());
  });

  // ── 发布村务公开 ──
  const publishAffair = () => {
    if (!affairForm.title.trim()) { Taro.showToast({ title: '请填写公示标题', icon: 'none' }); return; }
    const now = new Date();
    store.addAffair({
      id: Date.now(), date: `${now.getMonth() + 1}月${now.getDate()}日`,
      title: affairForm.title, category: AFFAIR_CATS[affairForm.catIdx], amount: affairForm.amount || '—', tag: '已公示',
    });
    setAffairs(store.getAffairs());
    setAffairForm({ title: '', catIdx: 0, amount: '' });
    Taro.showToast({ title: '已发布，村民端已更新', icon: 'success' });
  };
  const delAffair = (id: number) => { store.removeAffair(id); setAffairs(store.getAffairs()); };

  // ── 发布就业招工 ──
  const publishJob = () => {
    if (!jobForm.title.trim() || !jobForm.salary.trim()) { Taro.showToast({ title: '请填写岗位名称和薪资', icon: 'none' }); return; }
    store.addJob({
      id: Date.now(), title: jobForm.title, company: jobForm.company || '本村', salary: jobForm.salary,
      type: JOB_TYPES[jobForm.typeIdx], deadline: jobForm.deadline || '长期', count: parseInt(jobForm.count) || 1, location: jobForm.location || '范庄村',
    });
    setJobs(store.getJobs());
    setJobForm({ title: '', company: '', salary: '', typeIdx: 0, count: '1', location: '', deadline: '' });
    Taro.showToast({ title: '已发布，村民端已更新', icon: 'success' });
  };
  const delJob = (id: number) => { store.removeJob(id); setJobs(store.getJobs()); };

  const list = filter === '全部' ? affairs : affairs.filter(a => a.category === filter);

  // ────────────────────────── 村委书记：发布管理 ──────────────────────────
  if (isAdmin) {
    return (
      <View className="page">
        <View className="header header-admin">
          <Text className="header-title">📋 {store.isCommunity() ? '社区事务公开' : '村务公开'} · 发布管理</Text>
          <Text className="header-sub">发布即同步到{store.memberLabel()}端，阳光{store.isCommunity() ? '社区事务' : '村务'}接受监督</Text>
        </View>

        <View className="admin-tabs">
          <View className={`admin-tab ${adminTab === 'affairs' ? 'admin-tab-on' : ''}`} onClick={() => setAdminTab('affairs')}>
            <Text>{store.isCommunity() ? '社区公开' : '村务公开'}</Text>
          </View>
          <View className={`admin-tab ${adminTab === 'jobs' ? 'admin-tab-on' : ''}`} onClick={() => setAdminTab('jobs')}>
            <Text>就业招工</Text>
          </View>
        </View>

        <ScrollView scrollY className="body">
          {adminTab === 'affairs' ? (
            <View className="wrap">
              <View className="form-card">
                <Text className="form-title">新增公示</Text>
                <Text className="form-label">公示标题 *</Text>
                <Input className="form-input" value={affairForm.title} placeholder="如：2024年冬季农业补贴发放明细"
                  onInput={e => setAffairForm(f => ({ ...f, title: e.detail.value }))} />
                <Text className="form-label">类别</Text>
                <Picker mode="selector" range={AFFAIR_CATS as unknown as string[]} value={affairForm.catIdx}
                  onChange={e => setAffairForm(f => ({ ...f, catIdx: Number(e.detail.value) }))}>
                  <View className="form-picker"><Text>{AFFAIR_CATS[affairForm.catIdx]}</Text><Text className="picker-arrow">▾</Text></View>
                </Picker>
                <Text className="form-label">涉及金额（可选）</Text>
                <Input className="form-input" value={affairForm.amount} placeholder="如：¥3.2万"
                  onInput={e => setAffairForm(f => ({ ...f, amount: e.detail.value }))} />
                <Button className="form-submit" onClick={publishAffair}>发布公示</Button>
              </View>

              <Text className="list-title">公示列表（{affairs.length}）</Text>
              {affairs.map(a => (
                <View key={a.id} className="manage-row">
                  <View className="manage-info">
                    <Text className="manage-name">{a.title}</Text>
                    <Text className="manage-sub">{a.date} · {a.category}{a.amount !== '—' ? ` · ${a.amount}` : ''}</Text>
                  </View>
                  <Text className="manage-del" onClick={() => delAffair(a.id)}>撤下</Text>
                </View>
              ))}
            </View>
          ) : (
            <View className="wrap">
              <View className="form-card">
                <Text className="form-title">发布新岗位</Text>
                <Text className="form-label">岗位名称 *</Text>
                <Input className="form-input" value={jobForm.title} placeholder="如：苹果采摘工"
                  onInput={e => setJobForm(f => ({ ...f, title: e.detail.value }))} />
                <Text className="form-label">招聘单位</Text>
                <Input className="form-input" value={jobForm.company} placeholder="如：丰收果园"
                  onInput={e => setJobForm(f => ({ ...f, company: e.detail.value }))} />
                <Text className="form-label">薪资待遇 *</Text>
                <Input className="form-input" value={jobForm.salary} placeholder="如：100元/天"
                  onInput={e => setJobForm(f => ({ ...f, salary: e.detail.value }))} />
                <Text className="form-label">工作性质</Text>
                <Picker mode="selector" range={JOB_TYPES as unknown as string[]} value={jobForm.typeIdx}
                  onChange={e => setJobForm(f => ({ ...f, typeIdx: Number(e.detail.value) }))}>
                  <View className="form-picker"><Text>{JOB_TYPES[jobForm.typeIdx]}</Text><Text className="picker-arrow">▾</Text></View>
                </Picker>
                <View className="form-row">
                  <View className="form-col">
                    <Text className="form-label">招聘人数</Text>
                    <Input className="form-input" type="number" value={jobForm.count} placeholder="3"
                      onInput={e => setJobForm(f => ({ ...f, count: e.detail.value }))} />
                  </View>
                  <View className="form-col">
                    <Text className="form-label">截止日期</Text>
                    <Input className="form-input" value={jobForm.deadline} placeholder="如：12月31日"
                      onInput={e => setJobForm(f => ({ ...f, deadline: e.detail.value }))} />
                  </View>
                </View>
                <Text className="form-label">工作地点</Text>
                <Input className="form-input" value={jobForm.location} placeholder="如：范庄村农场"
                  onInput={e => setJobForm(f => ({ ...f, location: e.detail.value }))} />
                <Button className="form-submit" onClick={publishJob}>发布岗位</Button>
              </View>

              <Text className="list-title">当前岗位（{jobs.length}）</Text>
              {jobs.map(j => (
                <View key={j.id} className="manage-row">
                  <View className="manage-info">
                    <Text className="manage-name">{j.title}</Text>
                    <Text className="manage-sub">{j.salary} · {j.type} · 招{j.count}人{j.applied ? ' · 有人报名' : ''}</Text>
                  </View>
                  <Text className="manage-del" onClick={() => delJob(j.id)}>撤下</Text>
                </View>
              ))}
            </View>
          )}
          <View className="tabbar-placeholder" />
        </ScrollView>

        <TabBar active="affairs" />
      </View>
    );
  }

  // ────────────────────────── 村民：村务公开查看 ──────────────────────────
  return (
    <View className="page">
      <View className="header">
        <Text className="header-title">📋 {store.isCommunity() ? '社区事务公开' : '村务公开'}</Text>
        <Text className="header-sub">{store.isCommunity() ? '阳光社区 · 接受全体居民监督' : '阳光村务 · 接受全体村民监督'}</Text>
      </View>

      <View className="stat-row">
        <View className="stat-cell"><Text className="stat-num">{affairs.length}</Text><Text className="stat-label">公示项</Text></View>
        <View className="stat-cell"><Text className="stat-num">¥26.3万</Text><Text className="stat-label">资金公开</Text></View>
        <View className="stat-cell"><Text className="stat-num">97%</Text><Text className="stat-label">满意度</Text></View>
      </View>

      <View className="filter-bar">
        {CATS.map(c => (
          <View key={c} className={`filter-item ${filter === c ? 'filter-active' : ''}`} onClick={() => setFilter(c)}>
            <Text className="filter-text">{c}</Text>
          </View>
        ))}
      </View>

      <ScrollView scrollY className="body">
        <View className="wrap">
          {list.map(a => (
            <View key={a.id} className="affair-card">
              <View className="affair-top">
                <Text className="affair-title">{a.title}</Text>
                <View className="affair-tag"><Text className="affair-tag-text">{a.tag}</Text></View>
              </View>
              <View className="affair-meta">
                <Text className="affair-date">{a.date}</Text>
                <View className="affair-cat" style={{ background: CAT_COLOR[a.category]?.bg }}>
                  <Text className="affair-cat-text" style={{ color: CAT_COLOR[a.category]?.color }}>{a.category}</Text>
                </View>
                {a.amount !== '—' && <Text className="affair-amount">{a.amount}</Text>}
              </View>
            </View>
          ))}
          {list.length === 0 && <Text className="empty-hint">暂无该类别公示</Text>}
        </View>
        <View className="tabbar-placeholder" />
      </ScrollView>

      <TabBar active="affairs" />
    </View>
  );
}
