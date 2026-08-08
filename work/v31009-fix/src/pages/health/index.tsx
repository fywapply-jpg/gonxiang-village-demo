import { useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

const QUICK = [
  { icon: '📅', name: '预约挂号' },
  { icon: '💬', name: '在线问诊' },
  { icon: '👨‍⚕️', name: '家庭医生' },
  { icon: '📋', name: '健康档案' },
];
interface Doctor { id: number; name: string; dept: string; good: string; slots: number; }
const INIT_DOCS: Doctor[] = [
  { id: 1, name: '张医生', dept: '全科', good: '常见病、慢病管理', slots: 8 },
  { id: 2, name: '李医生', dept: '中医科', good: '针灸、推拿、调理', slots: 5 },
  { id: 3, name: '王医生', dept: '内科', good: '高血压、糖尿病', slots: 3 },
  { id: 4, name: '赵医生', dept: '儿科', good: '儿童常见病', slots: 6 },
];

export default function HealthPage() {
  const [docs, setDocs] = useState<Doctor[]>(INIT_DOCS);
  const [scrollTo, setScrollTo] = useState('');
  const [signed, setSigned] = useState(true); // 顶部提示已签约 1 人

  // 家庭医生：展示签约信息并可签约 / 续约
  const familyDoctor = () => {
    if (!store.requireBound()) return;
    const org = store.isCommunity() ? '社区卫生服务中心' : '村卫生室';
    Taro.showModal({
      title: signed ? '家庭医生签约信息' : '家庭医生签约',
      content: signed
        ? `签约机构：${org}\n签约医生：张医生（全科）\n服务团队：张医生 + 李护士 + 公卫专员\n签约周期：2025.01 - 2025.12\n服务包：慢病随访 · 年度体检 · 预约转诊 · 健康咨询\n\n是否续约下一年度？`
        : `与${org}家庭医生团队签约，享慢病随访、年度免费体检、优先预约转诊、健康咨询。\n\n确认签约（1年期）？`,
      confirmText: signed ? '续约' : '签约',
      success: (res) => { if (res.confirm) { setSigned(true); Taro.showToast({ title: signed ? '已续约' : '签约成功', icon: 'success' }); } },
    });
  };

  // 健康档案：展示本人电子健康档案（血压 / 体检 / 疫苗等）
  const archive = () => {
    if (!store.requireBound()) return;
    const name = store.getUser()?.name || '本人';
    Taro.showModal({
      title: `${name} · 电子健康档案`,
      content: '血压：128 / 82 mmHg（11-10 测 · 偏高在管）\n血糖：5.6 mmol/L（正常）\n最近体检：2025-09-20 市中心医院 · 基本正常\n疫苗接种：新冠 3 针 · 2025 流感 已接种\n慢病管理：高血压（在管 · 每月随访）\n过敏史：青霉素\n\n完整档案由家庭医生在卫生室系统同步维护。',
      showCancel: false,
    });
  };

  const quick = (name: string) => {
    if (name === '在线问诊') {
      Taro.showModal({ title: '在线问诊', content: `描述症状即可由${store.isCommunity() ? '社区卫生服务中心' : '村卫生室'}家庭医生在线初诊，必要时一键转诊上级医院。正式版支持图文、电话问诊。`, showCancel: false });
      return;
    }
    if (name === '预约挂号') {
      // 锚定到同页「今日坐诊」，直接选医生预约（先清空再设值，保证每次都触发滚动）
      setScrollTo('');
      setTimeout(() => setScrollTo('doc-sec'), 30);
      Taro.showToast({ title: '已定位今日坐诊，点「预约」挂号', icon: 'none' });
      return;
    }
    if (name === '家庭医生') { familyDoctor(); return; }
    if (name === '健康档案') { archive(); return; }
    Taro.showToast({ title: `${name}·开发中`, icon: 'none' });
  };

  const book = (d: Doctor) => {
    if (!store.requireBound()) return;
    if (d.slots <= 0) { Taro.showToast({ title: '号源已约满', icon: 'none' }); return; }
    Taro.showModal({
      title: '预约挂号', content: `预约 ${d.name}（${d.dept}）今日号源？`,
      success: (res) => {
        if (!res.confirm) return;
        if (process.env.TARO_APP_BACKEND_SYNC === 'true') { Taro.showToast({ title: '挂号预约接口尚未开放', icon: 'none' }); return; }
        setDocs(prev => prev.map(x => x.id === d.id ? { ...x, slots: x.slots - 1 } : x));
        Taro.showToast({ title: '演示预约已记录', icon: 'none' });
      },
    });
  };

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-title">🏥 健康医疗</Text>
        <Text className="hero-sub">{store.isCommunity() ? '社区卫生服务中心 · 家庭医生签约' : '村卫生室 · 家庭医生签约服务'}</Text>
      </View>
      <ScrollView scrollY scrollIntoView={scrollTo} className="body">
        <View className="quick-card">
          {QUICK.map(q => (
            <View key={q.name} className="quick" onClick={() => quick(q.name)}>
              <View className="quick-icon"><Text style={{ fontSize: '40rpx' }}>{q.icon}</Text></View>
              <Text className="quick-name">{q.name}</Text>
            </View>
          ))}
        </View>
        <View className="tip"><Text className="tip-t">❤️ 已签约家庭医生 1 人 · 65 岁以上老人享免费年度体检</Text></View>
        <Text className="sec" id="doc-sec">今日坐诊</Text>
        <View className="list">
          {docs.map(d => (
            <View key={d.id} className="doc">
              <View className="doc-avatar"><Text style={{ fontSize: '44rpx' }}>👨‍⚕️</Text></View>
              <View className="doc-info">
                <View className="doc-top"><Text className="doc-name">{d.name}</Text><Text className="doc-dept">{d.dept}</Text></View>
                <Text className="doc-good">擅长：{d.good}</Text>
                <Text className="doc-slots">今日剩余号源 {d.slots}</Text>
              </View>
              <View className={`book-btn ${d.slots <= 0 ? 'disabled' : ''}`} onClick={() => book(d)}>
                <Text className="book-t">{d.slots <= 0 ? '约满' : '预约'}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
