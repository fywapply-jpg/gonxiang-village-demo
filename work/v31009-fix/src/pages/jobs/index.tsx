import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store, Job } from '../../store';
import TabBar from '../../components/TabBar';
import './index.css';

const TYPE_COLOR: Record<string, string> = {
  '全职': '#16a34a', '兼职': '#2563eb', '临时': '#d97706',
};
const TYPE_BG: Record<string, string> = {
  '全职': '#dcfce7', '兼职': '#dbeafe', '临时': '#fef3c7',
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [filter, setFilter] = useState<'全部' | '临时' | '兼职' | '全职'>('全部');

  useDidShow(() => setJobs(store.getJobs()));

  const apply = (job: Job) => {
    if (!store.requireBound()) return;
    if (job.applied) { Taro.showToast({ title: '您已报名该岗位', icon: 'none' }); return; }
    Taro.showModal({
      title: '岗位报名',
      content: `确认报名「${job.title}」？\n报名后${store.adminLabel()}将联系您安排面试，成功就业可获 50 贡献值。`,
      confirmText: '确认报名',
      success: (res) => {
        if (res.confirm) {
          store.applyJob(job.id);
          setJobs(store.getJobs());
          Taro.showToast({ title: '报名成功，等待联系', icon: 'success' });
        }
      },
    });
  };

  const list = filter === '全部' ? jobs : jobs.filter(j => j.type === filter);

  return (
    <View className="page">
      <View className="header">
        <Text className="header-title">💼 就业招工</Text>
        <Text className="header-sub">当前在招 {jobs.length} 个岗位</Text>
      </View>

      <View className="filter-bar">
        {(['全部', '临时', '兼职', '全职'] as const).map(f => (
          <View key={f} className={`filter-item ${filter === f ? 'filter-active' : ''}`} onClick={() => setFilter(f)}>
            <Text className="filter-text">{f}</Text>
          </View>
        ))}
      </View>

      <ScrollView scrollY className="body">
        <View className="wrap">
          {list.map(job => (
            <View key={job.id} className="job-card">
              <View className="job-head">
                <Text className="job-title">{job.title}</Text>
                <View className="job-type" style={{ background: TYPE_BG[job.type] }}>
                  <Text className="job-type-text" style={{ color: TYPE_COLOR[job.type] }}>{job.type}</Text>
                </View>
              </View>
              <Text className="job-company">{job.company} · {job.location}</Text>
              <View className="job-meta">
                <Text className="job-salary">{job.salary}</Text>
                <Text className="job-info">招 {job.count} 人</Text>
                <Text className="job-info">截止 {job.deadline}</Text>
              </View>
              {job.applied ? (
                <View className="job-applied"><Text className="job-applied-text">{`✓ 已报名，等待${store.adminLabel()}联系`}</Text></View>
              ) : (
                <View className="job-apply-btn" onClick={() => apply(job)}><Text className="job-apply-text">立即报名</Text></View>
              )}
            </View>
          ))}
          {list.length === 0 && <Text className="empty-hint">暂无该类型岗位</Text>}
        </View>
        <View className="tabbar-placeholder" />
      </ScrollView>
      <TabBar active="jobs" />
    </View>
  );
}
