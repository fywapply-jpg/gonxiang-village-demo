import Taro, { useDidShow } from '@tarojs/taro';
import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

interface Item { name: string; desc: string; }
interface Block { key: string; icon: string; title: string; items: Item[]; }
interface Query { name: string; icon: string; result: string; }
interface SocialSet { badge: string; status: { label: string; sub: string }; queryTitle: string; queries: Query[]; blocks: Block[]; note: string; }

// 村民：城乡居民保障（新农合 / 城乡居民养老）
const VILLAGE: SocialSet = {
  badge: '村民 · 城乡居民保障',
  status: { label: '✅ 已参保 · 城乡居民医保（新农合）', sub: '2024 年度 · 已缴 ¥380 · 状态正常' },
  queryTitle: '新农合查询',
  queries: [
    { name: '参保查询', icon: '📋', result: '参保人：王建国\n参保类型：城乡居民基本医保（新农合）\n参保年度：2024\n已缴金额：¥380\n状态：正常参保 · 有效期至 2024-12-31' },
    { name: '缴费记录', icon: '💰', result: '连续参保 3 年：\n· 2024 年度 ¥380（已缴）\n· 2023 年度 ¥350（已缴）\n· 2022 年度 ¥320（已缴）' },
    { name: '报销查询', icon: '🧾', result: '本年度已报销：\n· 门诊报销 ¥420（村卫生室）\n· 住院报销 ¥3,200（县医院直接结算）\n大病保险：额度充足\n年度封顶线：¥18 万' },
    { name: '养老账户', icon: '👵', result: '城乡居民养老保险\n个人账户余额：¥12,600\n缴费档次：第 5 档（¥2000/年）\n预计 60 岁后月领：约 ¥235/月' },
    { name: '家庭参保', icon: '👨‍👩‍👧', result: '王建国户 · 全家参保：\n· 王建国 ✅ 已参保\n· 王秀兰 ✅ 已参保\n· 王小磊 ✅ 已参保（学生）\n全户 3 人均正常参保' },
    { name: '异地就医', icon: '🏥', result: '异地就医备案：\n备案后省外住院可直接结算。\n当前备案：无\n如需外出就医，可线上一键备案（演示）。' },
  ],
  blocks: [
    { key: 'med', icon: '🏥', title: '医疗 · 城乡居民基本医保（新农合）', items: [
      { name: '参保缴费', desc: '城乡居民医保（原新农合）年度参保、代缴' },
      { name: '门诊报销', desc: '村卫生室 / 乡镇卫生院门诊统筹报销' },
      { name: '住院报销', desc: '县域内住院直接结算、异地就医备案' },
      { name: '大病保险', desc: '大病二次报销、医疗救助兜底' },
    ]},
    { key: 'old', icon: '👵', title: '养老 · 城乡居民基本养老保险', items: [
      { name: '参保缴费', desc: '按档缴费、政府补贴，多缴多得' },
      { name: '养老金领取', desc: '年满60周岁按月领基础养老金' },
      { name: '居家互助养老', desc: '互助幸福院、邻里照护、党员包户探访' },
      { name: '高龄补贴', desc: '高龄补贴、失能护理补助申领' },
    ]},
    { key: 'ss', icon: '🛡️', title: '社保 · 惠农保障', items: [
      { name: '参保登记', desc: '城乡居民养老 + 医疗一站参保' },
      { name: '被征地保障', desc: '被征地农民养老保障参保' },
      { name: '农业保险', desc: '种养保险、政策性农业保险' },
      { name: '困难救助', desc: '低保、特困、临时救助申请' },
    ]},
  ],
  note: '村委会协办：党员志愿者驻村代办参保缴费，孤寡老人上门帮办，不漏一户。',
};

// 居民：城镇职工 / 居民保障（五险一金）
const COMMUNITY: SocialSet = {
  badge: '居民 · 城镇职工 / 居民保障',
  status: { label: '✅ 在缴 · 城镇职工五险一金', sub: '本月已缴 · 参保单位正常在缴' },
  queryTitle: '社保查询',
  queries: [
    { name: '参保查询', icon: '📋', result: '参保人：张明\n参保类型：城镇职工社保（五险）\n参保单位：在职单位\n参保起始：2019-03 至今\n状态：正常参保中' },
    { name: '缴费明细', icon: '💰', result: '本月缴纳明细（单位 + 个人）：\n· 养老 ¥890\n· 医疗 ¥320\n· 失业 ¥40\n· 工伤 ¥18（单位全担）\n· 生育 ¥25（单位全担）\n个人扣缴合计：¥680' },
    { name: '社保余额', icon: '💳', result: '养老保险个人账户：¥68,400\n医保个人账户：¥3,260\n（医保个账可家庭共济给父母、子女）' },
    { name: '公积金', icon: '🏠', result: '住房公积金\n账户余额：¥42,800\n月缴存：¥1,200（单位 + 个人）\n可贷额度：约 ¥60 万\n可用于：租房 / 购房 / 退休提取' },
    { name: '退休测算', icon: '🧮', result: '城镇职工养老金测算\n已缴年限：15 年 6 个月\n预计退休：60 岁\n预计月领养老金：约 ¥3,800/月\n（缴费越久、基数越高，领得越多）' },
    { name: '异地就医', icon: '🏥', result: '异地就医备案：\n跨省住院可直接结算。\n当前备案地：无\n如需外出就医，可线上备案（演示）。' },
  ],
  blocks: [
    { key: 'med', icon: '🏥', title: '医疗 · 城镇职工 / 居民基本医保', items: [
      { name: '参保缴费', desc: '职工医保（单位 / 灵活就业）、城镇居民医保' },
      { name: '门诊统筹', desc: '社区卫生服务中心门诊、慢病管理' },
      { name: '医保个账', desc: '个人账户余额、家庭共济绑定' },
      { name: '异地就医', desc: '异地就医备案、跨省直接结算' },
    ]},
    { key: 'old', icon: '👵', title: '养老 · 城镇职工 / 居民养老保险', items: [
      { name: '参保缴费', desc: '职工养老（单位 / 灵活就业）、居民养老' },
      { name: '养老金测算', desc: '缴费年限、养老金待遇测算' },
      { name: '日间照料', desc: '社区日间照料中心、助餐助浴' },
      { name: '个人养老金', desc: '企业年金 / 个人养老金账户' },
    ]},
    { key: 'ss', icon: '🛡️', title: '社保 · 五险一金', items: [
      { name: '五险参保', desc: '养老 / 医疗 / 失业 / 工伤 / 生育一站参保' },
      { name: '住房公积金', desc: '公积金缴存、提取、贷款咨询' },
      { name: '灵活就业', desc: '灵活就业人员社保参保缴费' },
      { name: '失业工伤', desc: '失业金申领、工伤认定申报' },
    ]},
  ],
  note: '居委会协办：社保专窗代办、线上预约叫号，党员帮办队为老弱居民上门服务。',
};

export default function SocialPage() {
  const [community, setCommunity] = useState(store.isCommunity());
  useDidShow(() => setCommunity(store.isCommunity()));
  const s = community ? COMMUNITY : VILLAGE;
  const member = community ? '居民' : '村民';
  const org = community ? '居委会' : '村委会';
  const act = (n: string) => Taro.showModal({ title: n, content: `「${n}」可到${org}社保医保专窗或线上预约办理（演示）。`, showCancel: false });
  const query = (q: Query) => Taro.showModal({ title: `${q.icon} ${q.name}`, content: q.result.replace(/王建国|张明/g, store.getUser()?.name || '本人'), showCancel: false, confirmText: '知道了' });

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">🏥 医保 · 养老 · 社保</Text>
        <Text className="hero-s">{s.badge} · {org}协办</Text>
      </View>
      <ScrollView scrollY className="body">
        {/* 我的参保状态卡 */}
        <View style={{ background: 'linear-gradient(135deg,#2563eb,#3b82f6)', borderRadius: '16rpx', padding: '24rpx 26rpx', marginBottom: '18rpx' }}>
          <Text style={{ fontSize: '22rpx', color: '#dbeafe', display: 'block' }}>我的参保状态 · {member}</Text>
          <Text style={{ fontSize: '30rpx', color: '#fff', fontWeight: 800, display: 'block', marginTop: '10rpx', lineHeight: 1.4 }}>{s.status.label}</Text>
          <Text style={{ fontSize: '22rpx', color: '#dbeafe', display: 'block', marginTop: '8rpx' }}>{s.status.sub}</Text>
        </View>

        {/* 一键查询 */}
        <View style={{ background: '#fff', borderRadius: '16rpx', padding: '22rpx 16rpx 12rpx', marginBottom: '20rpx' }}>
          <Text style={{ fontSize: '26rpx', fontWeight: 800, color: '#1f2937', display: 'block', marginLeft: '8rpx', marginBottom: '10rpx' }}>🔍 {s.queryTitle}</Text>
          <View style={{ display: 'flex', flexWrap: 'wrap' }}>
            {s.queries.map(q => (
              <View key={q.name} style={{ width: '33.33%', textAlign: 'center', padding: '16rpx 0' }} onClick={() => query(q)}>
                <Text style={{ fontSize: '46rpx', display: 'block' }}>{q.icon}</Text>
                <Text style={{ fontSize: '22rpx', color: '#4b5563', display: 'block', marginTop: '6rpx' }}>{q.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="switch-tip">
          <Text className="switch-tip-t">查询为演示数据。正式版对接社保 / 医保部门接口后，可查真实参保、缴费、报销明细。村民与居民待遇不同，系统按你的归属自动切换。</Text>
        </View>

        {s.blocks.map(b => (
          <View key={b.key} className="block">
            <Text className="block-t">{b.icon} {b.title}</Text>
            {b.items.map(it => (
              <View key={it.name} className="item" onClick={() => act(it.name)}>
                <View className="item-l">
                  <Text className="item-n">{it.name}</Text>
                  <Text className="item-d">{it.desc}</Text>
                </View>
                <Text className="item-arr">›</Text>
              </View>
            ))}
          </View>
        ))}
        <View className="note"><Text className="note-t">🚩 {s.note}</Text></View>
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
