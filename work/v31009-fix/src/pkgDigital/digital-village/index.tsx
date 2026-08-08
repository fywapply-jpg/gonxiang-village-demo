import { useState } from 'react';
import Taro, { useDidShow, useRouter } from '@tarojs/taro';
import { View, Text, ScrollView, Input, Textarea } from '@tarojs/components';
import { store } from '../../store';
import { backendApi, BACKEND_SYNC_ENABLED, BackendGovernanceCase, BackendGovernanceStatus, BackendOrganization } from '../../utils/backend';
import './index.css';

type TabKey = 'overview' | 'data' | 'governance' | 'agri' | 'network' | 'culture';
type GovernancePanel = 'workbench' | 'architecture' | 'permissions' | 'process';

const TABS: Array<{ key: TabKey; name: string }> = [
  { key: 'overview', name: '融合总览' },
  { key: 'data', name: '数据中台' },
  { key: 'governance', name: '基层智治' },
  { key: 'agri', name: '智慧农业' },
  { key: 'network', name: '万村互联' },
  { key: 'culture', name: '数字文化' },
];

const OVERVIEW_MODULES = [
  { icon: '📊', name: '综合村务管理', desc: '资产、财务、工程三公开', url: '/pages/affairs/index' },
  { icon: '🕸️', name: '智能社群治理', desc: '网格上报、调解、闭环处置', url: '/pages/safety/index' },
  { icon: '🏛️', name: '便民政务服务', desc: '社保医保、补贴、门店代办', url: '/pages/gov/index' },
  { icon: '🗳️', name: '数字基层治理', desc: '议事投票、派单、人居考核', url: '/pages/council/index' },
  { icon: '🚩', name: '智慧党建', desc: '三会一课、党员学习与积分', url: '/pkgParty/party/index' },
  { icon: '🎬', name: '数字文化', desc: '乡村影像、族谱、文明档案', tab: 'culture' as TabKey },
  { icon: '🏞️', name: '乡村文旅', desc: '景点、非遗、民宿线上经营', url: '/pages/tourism/index' },
  { icon: '🌱', name: '智慧农业', desc: '种植台账与产销预测', tab: 'agri' as TabKey },
];

const ALERTS = [
  { level: '紧急', color: '#dc2626', title: '独居老人连续两日未打卡', grid: '范庄村第3网格', time: '10分钟前' },
  { level: '关注', color: '#d97706', title: '草莓收购需求低于预计产量', grid: '设施农业片区', time: '1小时前' },
  { level: '提示', color: '#2563eb', title: '村务公开质询即将到期', grid: '村级事务中心', time: '今天 09:20' },
];

const LEDGERS = [
  { crop: '设施草莓', area: '186亩', stage: '花果期', forecast: '412吨', demand: '368吨', risk: '需拓销路' },
  { crop: '沙窝萝卜', area: '320亩', stage: '备耕期', forecast: '960吨', demand: '1,080吨', risk: '供需平衡' },
  { crop: '小站稻', area: '1,240亩', stage: '冬闲期', forecast: '682吨', demand: '750吨', risk: '建议扩种' },
];

const NETWORK_NODES = [
  { area: '天津', villages: 112, communities: 42, stores: 14, specialty: '小站稻、沙窝萝卜' },
  { area: '河南', villages: 36, communities: 8, stores: 3, specialty: '灵宝苹果、卢氏核桃' },
  { area: '山东', villages: 24, communities: 11, stores: 5, specialty: '寿光蔬菜、烟台苹果' },
  { area: '广西', villages: 18, communities: 6, stores: 2, specialty: '沃柑、百香果' },
];

const CULTURE_ITEMS = [
  { icon: '🎞️', title: '乡村影像志', value: '126条', desc: '村史、口述史与短视频档案' },
  { icon: '🌳', title: '数字族谱', value: '38支', desc: '按户授权查看，敏感信息分级保护' },
  { icon: '🏮', title: '非遗数字馆', value: '17项', desc: '传承人、技艺影像与研学预约联动' },
  { icon: '🌸', title: '文明积分档案', value: '2,860户', desc: '文明家庭、志愿服务与村规民约留痕' },
];

const GOVERNANCE_STATUS: Record<string, string> = {
  DRAFT: '待派单', ASSIGNED: '已派单', ACCEPTED: '已接单', IN_PROGRESS: '办理中',
  PENDING_VERIFICATION: '待验收', CLOSED: '已办结', RETURNED: '已退回', ESCALATED: '已升级',
};

const DEMO_CASES: BackendGovernanceCase[] = [
  { id: 'demo-1', caseNo: 'ZL20260808001', title: '村东道路井盖破损', description: '村民巡查发现井盖松动，夜间存在安全隐患，请尽快设置警示并维修。', urgency: 'CRITICAL', status: 'DRAFT', originOrganizationId: 'demo-village', originOrganizationName: '范庄村', assigneeOrganizationId: null, assigneeOrganizationName: null, version: 1, dueAt: null, createdAt: '2026-08-08 09:30' },
  { id: 'demo-2', caseNo: 'ZL20260807006', title: '独居老人助餐服务协调', description: '网格员反馈老人行动不便，已联系助餐点，正在确认每日配送时间。', urgency: 'URGENT', status: 'IN_PROGRESS', originOrganizationId: 'demo-village', originOrganizationName: '范庄村', assigneeOrganizationId: 'demo-town', assigneeOrganizationName: '方城乡民生办', version: 3, dueAt: null, createdAt: '2026-08-07 14:10' },
  { id: 'demo-3', caseNo: 'ZL20260806012', title: '灌溉沟渠淤堵清理', description: '清淤已经完成，现场照片和施工记录已上传，等待村级验收。', urgency: 'NORMAL', status: 'PENDING_VERIFICATION', originOrganizationId: 'demo-village', originOrganizationName: '范庄村', assigneeOrganizationId: 'demo-grid', assigneeOrganizationName: '第二网格', version: 4, dueAt: null, createdAt: '2026-08-06 08:45' },
];

const STATUS_GROUPS: Array<{ key: string; name: string; statuses: BackendGovernanceStatus[] }> = [
  { key: 'all', name: '全部', statuses: [] },
  { key: 'dispatch', name: '待派单', statuses: ['DRAFT', 'RETURNED', 'ESCALATED'] },
  { key: 'handling', name: '办理中', statuses: ['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'] },
  { key: 'verify', name: '待验收', statuses: ['PENDING_VERIFICATION'] },
  { key: 'closed', name: '已办结', statuses: ['CLOSED'] },
];

const GOVERNANCE_LEVELS = [
  { key: 'GLOBAL', short: '总', name: '总平台', role: '总平台管理员', position: '制度、标准与全国协同中枢', scope: '全国组织树及跨省汇总数据', duties: ['治理标准与事项分类', '全国态势与重大事项协调', '省级组织及角色治理', '审计监管与数据规范'], roles: ['平台负责人', '全国协同调度员', '安全审计员'], permissions: ['org.read', 'org.manage', 'member.manage', 'role.assign', 'governance.create', 'governance.assign', 'governance.handle', 'governance.verify', 'audit.read', 'data.export'] },
  { key: 'PROVINCE', short: '省', name: '省（直辖市）', role: '省级统筹管理员', position: '省域政策承接、督导与跨市协调', scope: '本省及全部下级组织数据', duties: ['省域治理驾驶舱', '跨市州事项协调', '重大事项督导会商', '省级资源统筹'], roles: ['省级负责人', '省级督导员', '跨域协调员'], permissions: ['org.read', 'org.manage', 'member.manage', 'role.assign', 'governance.create', 'governance.assign', 'governance.handle', 'governance.verify', 'audit.read', 'data.export'] },
  { key: 'CITY', short: '市', name: '市（州）', role: '市州运营管理员', position: '跨县协同、运行监测与专业支撑', scope: '本市州及全部下级组织数据', duties: ['跨县区联合处置', '市域运行监测', '专业部门协同', '治理效能分析'], roles: ['市州负责人', '市州调度员', '效能监督员'], permissions: ['org.read', 'org.manage', 'member.manage', 'role.assign', 'governance.create', 'governance.assign', 'governance.handle', 'governance.verify', 'audit.read', 'data.export'] },
  { key: 'COUNTY', short: '县', name: '县（区）', role: '县区服务管理员', position: '县域治理调度和部门资源落地中枢', scope: '本县区及全部乡镇、村社数据', duties: ['县域事项分拨', '跨乡镇协调处置', '职能部门资源调度', '超时督办与复盘'], roles: ['县区负责人', '县区调度员', '部门联络员'], permissions: ['org.read', 'org.manage', 'member.manage', 'role.assign', 'governance.create', 'governance.assign', 'governance.handle', 'governance.verify', 'audit.read'] },
  { key: 'TOWNSHIP', short: '乡', name: '乡（镇、街道）', role: '乡镇运营管理员', position: '基层事项派单、联动处置和结果验收', scope: '本乡镇街道及下辖村社数据', duties: ['村社事项受理研判', '承办组织派单', '跨村社力量协调', '结果验收与退回整改'], roles: ['乡镇负责人', '治理调度员', '验收人员'], permissions: ['org.read', 'member.manage', 'governance.create', 'governance.assign', 'governance.handle', 'governance.verify'] },
  { key: 'VILLAGE', short: '村', name: '村（社区）', role: '村社服务管理员', position: '民情发现、现场处置和群众反馈末梢', scope: '本村（社区）组织数据', duties: ['群众诉求和网格上报', '现场核实与先期处置', '办理过程反馈', '结果公示与回访'], roles: ['村社负责人', '网格员', '事项办理员'], permissions: ['org.read', 'governance.create', 'governance.handle'] },
];

const PERMISSION_ROWS = [
  { code: 'org.read', name: '查看组织与范围数据', levels: 6, rule: '仅本组织及下级组织' },
  { code: 'org.manage', name: '创建和维护下级组织', levels: 4, rule: '总、省、市、县可用' },
  { code: 'member.manage', name: '管理本范围成员', levels: 5, rule: '总至乡镇可用' },
  { code: 'role.assign', name: '向下授予匹配层级角色', levels: 4, rule: '不可同级授予，不可越权' },
  { code: 'governance.create', name: '发起治理事项', levels: 6, rule: '在授权组织范围发起' },
  { code: 'governance.assign', name: '向合法下级组织派单', levels: 5, rule: '总至乡镇可用，仅向下派单' },
  { code: 'governance.handle', name: '接单、反馈、提交验收', levels: 6, rule: '仅责任组织精确匹配' },
  { code: 'governance.verify', name: '验收办结或退回整改', levels: 5, rule: '发起组织范围内验收' },
  { code: 'audit.read', name: '查看审计日志', levels: 4, rule: '总、省、市、县可用' },
  { code: 'data.export', name: '导出治理数据', levels: 3, rule: '仅总、省、市可用' },
];

const PROCESS_STAGES = [
  { no: '01', name: '发现上报', owner: '群众、网格员、村社', input: '诉求、巡查、预警、转办', output: '形成唯一事项编号', rule: '标题、地点、情况、紧急程度完整' },
  { no: '02', name: '受理研判', owner: '发起组织调度员', input: '待派单事项', output: '确定归口和承办层级', rule: '能本级解决不升级，需要资源才上报协同' },
  { no: '03', name: '分级派单', owner: '总至乡镇调度员', input: '归口结论', output: '责任组织与办理要求', rule: '只能派给发起组织的合法下级' },
  { no: '04', name: '接单处置', owner: '责任组织办理员', input: '事项与办理要求', output: '处置过程、凭证、结果', rule: '只有责任组织可以接单和办理' },
  { no: '05', name: '提交验收', owner: '责任组织办理员', input: '完成结果和现场凭证', output: '待验收事项', rule: '结果描述完整，关键事项需附件留痕' },
  { no: '06', name: '验收回访', owner: '发起组织验收员', input: '处置结果', output: '办结或退回整改', rule: '不合格必须说明原因；办结后可评价回访' },
  { no: '07', name: '归档复盘', owner: '县级以上监督角色', input: '全过程轨迹', output: '效能指标与治理知识', rule: '全程审计；跨域、重复、超时事项进入复盘' },
];

export default function DigitalVillagePage() {
  const router = useRouter();
  const initial = TABS.some(item => item.key === router.params.tab) ? router.params.tab as TabKey : 'overview';
  const [tab, setTab] = useState<TabKey>(initial);
  const [cases, setCases] = useState<BackendGovernanceCase[]>(BACKEND_SYNC_ENABLED ? [] : DEMO_CASES);
  const [caseLoading, setCaseLoading] = useState(false);
  const [organizations, setOrganizations] = useState<BackendOrganization[]>([]);
  const [caseFilter, setCaseFilter] = useState('all');
  const [expandedCase, setExpandedCase] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newCase, setNewCase] = useState({ title: '', description: '', urgency: 'NORMAL' as BackendGovernanceCase['urgency'] });
  const [caseBusy, setCaseBusy] = useState('');
  const [governancePanel, setGovernancePanel] = useState<GovernancePanel>('workbench');
  const [selectedLevel, setSelectedLevel] = useState(5);

  const loadCases = async () => {
    if (!BACKEND_SYNC_ENABLED) return;
    setCaseLoading(true);
    try {
      const [caseRows, organizationRows] = await Promise.all([backendApi.governanceCases.list(), backendApi.organizations()]);
      setCases(caseRows);
      setOrganizations(organizationRows);
    } catch (error: any) {
      Taro.showToast({ title: error.message || '治理事项同步失败', icon: 'none' });
    } finally { setCaseLoading(false); }
  };

  useDidShow(() => {
    loadCases();
  });

  const can = (permission: string) => !BACKEND_SYNC_ENABLED || !!store.getUser()?.backendPermissions?.includes(permission);
  const selectedGroup = STATUS_GROUPS.find(item => item.key === caseFilter) || STATUS_GROUPS[0];
  const visibleCases = selectedGroup.statuses.length ? cases.filter(item => selectedGroup.statuses.includes(item.status)) : cases;
  const statusCount = (statuses: BackendGovernanceStatus[]) => cases.filter(item => statuses.includes(item.status)).length;

  const createGovernanceCase = async () => {
    const title = newCase.title.trim(); const description = newCase.description.trim();
    if (title.length < 2 || description.length < 10) return Taro.showToast({ title: '标题至少2字，情况说明至少10字', icon: 'none' });
    const organizationId = store.getUser()?.backendOrganizationId;
    if (BACKEND_SYNC_ENABLED && !organizationId) return Taro.showToast({ title: '当前账号未绑定治理组织', icon: 'none' });
    setCaseBusy('create');
    try {
      if (BACKEND_SYNC_ENABLED) {
        await backendApi.governanceCases.create(organizationId!, title, description, newCase.urgency);
        await loadCases();
        Taro.showToast({ title: '事项已上报', icon: 'success' });
      } else {
        setCases(rows => [{ ...DEMO_CASES[0], id: `demo-${Date.now()}`, caseNo: `演示${Date.now().toString().slice(-8)}`, title, description, urgency: newCase.urgency, createdAt: '刚刚' }, ...rows]);
        Taro.showToast({ title: '已加入演示台账（未提交后台）', icon: 'none' });
      }
      setNewCase({ title: '', description: '', urgency: 'NORMAL' }); setShowCreate(false); setCaseFilter('all');
    } catch (error: any) { Taro.showToast({ title: error.message || '上报失败', icon: 'none' }); }
    finally { setCaseBusy(''); }
  };

  const promptText = async (title: string, placeholder: string) => {
    const result: any = await Taro.showModal({ title, editable: true, placeholderText: placeholder, confirmText: '确认' } as any);
    return result.confirm ? String(result.content || '').trim() : '';
  };

  const runCaseCommand = async (item: BackendGovernanceCase, command: 'assign' | 'accept' | 'progress' | 'submit-verification' | 'verify' | 'return') => {
    let data: Record<string, unknown> = {};
    if (command === 'assign') {
      if (BACKEND_SYNC_ENABLED) {
        const origin = organizations.find(org => org.id === item.originOrganizationId);
        const targets = origin ? organizations.filter(org => org.path.startsWith(`${origin.path}/`)) : [];
        if (!targets.length) return Taro.showToast({ title: '当前范围没有可派单组织', icon: 'none' });
        const choice = await Taro.showActionSheet({ itemList: targets.map(org => org.name) });
        data.assigneeOrganizationId = targets[choice.tapIndex].id;
      } else data.assigneeOrganizationId = 'demo-town';
    }
    if (command === 'progress') { const progress = await promptText('反馈办理进度', '说明已完成工作和下一步安排'); if (!progress) return; data.detail = progress; }
    if (command === 'submit-verification') { const result = await promptText('提交验收', '填写处置结果、凭证或现场情况'); if (!result) return; data.result = result; }
    if (command === 'return') { const reason = await promptText('退回整改', '请填写退回原因和整改要求'); if (!reason) return; data.reason = reason; }
    setCaseBusy(item.id);
    try {
      if (BACKEND_SYNC_ENABLED) {
        await backendApi.governanceCases.command(item.id, command, data); await loadCases();
        Taro.showToast({ title: '状态已更新', icon: 'success' });
      } else {
        const next: Record<string, BackendGovernanceStatus> = { assign: 'ASSIGNED', accept: 'ACCEPTED', progress: 'IN_PROGRESS', 'submit-verification': 'PENDING_VERIFICATION', verify: 'CLOSED', return: 'RETURNED' };
        setCases(rows => rows.map(row => row.id === item.id ? { ...row, status: next[command], version: row.version + 1, ...(command === 'assign' ? { assigneeOrganizationId: 'demo-town', assigneeOrganizationName: '方城乡治理中心' } : {}) } : row));
        Taro.showToast({ title: '演示状态已流转（未提交后台）', icon: 'none' });
      }
    } catch (error: any) { Taro.showToast({ title: error.message || '操作失败', icon: 'none' }); }
    finally { setCaseBusy(''); }
  };

  const caseActions = (item: BackendGovernanceCase) => {
    const actions: Array<[string, any, string]> = [];
    if (['DRAFT', 'RETURNED', 'ESCALATED'].includes(item.status) && can('governance.assign')) actions.push(['派单', 'assign', 'primary']);
    if (item.status === 'ASSIGNED' && can('governance.handle')) actions.push(['接单', 'accept', 'primary']);
    if (['ACCEPTED', 'IN_PROGRESS'].includes(item.status) && can('governance.handle')) actions.push(['反馈进度', 'progress', 'plain'], ['提交验收', 'submit-verification', 'primary']);
    if (item.status === 'PENDING_VERIFICATION' && can('governance.verify')) actions.push(['验收通过', 'verify', 'primary'], ['退回整改', 'return', 'danger']);
    return actions;
  };

  const navigate = (url?: string, next?: TabKey) => {
    if (url) Taro.navigateTo({ url });
    else if (next) setTab(next);
  };

  const previewOnly = (title: string, content: string) => Taro.showModal({
    title,
    content: `${content}\n\n当前为 v3.1102 试点能力展示，正式提交需接入对应后端工作流后开放。`,
    showCancel: false,
    confirmText: '知道了',
  });

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-kicker">党建引领 · 数智城乡一体化</Text>
        <Text className="hero-title">供享村社 · 数智乡村</Text>
        <Text className="hero-sub">治理现代化 × 产业双向增收 × 全国万村互联</Text>
        <View className="hero-tags">
          <Text>一张图统览</Text><Text>一平台联动</Text><Text>一套数据研判</Text>
        </View>
      </View>

      <ScrollView scrollX className="tabs">
        {TABS.map(item => (
          <View key={item.key} className={`tab ${tab === item.key ? 'on' : ''}`} onClick={() => setTab(item.key)}>
            <Text>{item.name}</Text>
          </View>
        ))}
      </ScrollView>

      <ScrollView scrollY className="body">
        {tab === 'overview' && <View className="wrap">
          <View className="metrics">
            <View><Text className="metric-num">112</Text><Text className="metric-label">合作村</Text></View>
            <View><Text className="metric-num">42</Text><Text className="metric-label">合作社区</Text></View>
            <View><Text className="metric-num">14</Text><Text className="metric-label">线下门店</Text></View>
            <View><Text className="metric-num">6级</Text><Text className="metric-label">治理架构</Text></View>
          </View>
          <View className="section-head"><Text className="section-title">八大数字治理模块</Text><Text className="section-sub">原有能力复用 · 缺失能力补齐</Text></View>
          <View className="module-grid">
            {OVERVIEW_MODULES.map(item => <View key={item.name} className="module-card" onClick={() => navigate(item.url, item.tab)}>
              <View className="module-icon"><Text>{item.icon}</Text></View>
              <Text className="module-name">{item.name}</Text>
              <Text className="module-desc">{item.desc}</Text>
            </View>)}
          </View>
          <View className="link-card" onClick={() => setTab('network')}>
            <View><Text className="link-title">🌐 一村一私域 · 万村大联动</Text><Text className="link-sub">国内零抽佣互通，优质农产品进入全国合作社区</Text></View><Text className="arrow">›</Text>
          </View>
        </View>}

        {tab === 'data' && <View className="wrap">
          <View className="section-head"><Text className="section-title">全域数据中台</Text><Text className="section-sub">治理、产业、用户三类数据统一研判</Text></View>
          <View className="data-card dark">
            <View className="data-title"><Text>🗺️ 乡村一张图</Text><Text className="live">● 试点数据</Text></View>
            <View className="map-box"><Text className="map-icon">📍</Text><Text className="map-main">天津试点网络</Text><Text className="map-sub">112村 · 42社区 · 14门店 · 7产业节点</Text></View>
            <View className="data-row"><View><Text className="data-num">3,286</Text><Text>治理事件</Text></View><View><Text className="data-num">96.8%</Text><Text>按期办结</Text></View><View><Text className="data-num">¥628万</Text><Text>助农交易</Text></View></View>
          </View>
          <View className="section-head"><Text className="section-title">AI 民情与产业预警</Text><Text className="section-sub">发现—派单—处置—验收闭环</Text></View>
          {ALERTS.map(item => <View key={item.title} className="alert-card">
            <View className="alert-level" style={{ background: item.color }}><Text>{item.level}</Text></View>
            <View className="alert-info"><Text className="alert-title">{item.title}</Text><Text className="alert-meta">{item.grid} · {item.time}</Text></View>
          </View>)}
          <View className="action-card" onClick={() => previewOnly('数据分析报告', '支持生成县域治理效能、农业产销趋势、门店经营和民生服务分析报告。')}><Text>📈 生成县域分析报告</Text><Text>›</Text></View>
        </View>}

        {tab === 'governance' && <View className="wrap">
          <View className="governance-banner">
            <View><Text className="governance-banner-title">数智治理协同中心</Text><Text className="governance-banner-sub">群众上报 · 分级派单 · 限时处置 · 组织验收</Text></View>
            <Text className="mode-badge">{BACKEND_SYNC_ENABLED ? '实时协同' : '演示流程'}</Text>
          </View>
          {!BACKEND_SYNC_ENABLED && <View className="demo-notice"><Text>当前为交互演示数据，所有流转仅在本机展示，不会提交后台。</Text></View>}
          <View className="governance-metrics">
            <View onClick={() => setCaseFilter('dispatch')}><Text>{statusCount(['DRAFT', 'RETURNED', 'ESCALATED'])}</Text><Text>待派单</Text></View>
            <View onClick={() => setCaseFilter('handling')}><Text>{statusCount(['ASSIGNED', 'ACCEPTED', 'IN_PROGRESS'])}</Text><Text>办理中</Text></View>
            <View onClick={() => setCaseFilter('verify')}><Text>{statusCount(['PENDING_VERIFICATION'])}</Text><Text>待验收</Text></View>
            <View onClick={() => setCaseFilter('closed')}><Text>{statusCount(['CLOSED'])}</Text><Text>已办结</Text></View>
          </View>
          <ScrollView scrollX className="governance-panels"><View className="governance-panel-inner">
            {([['workbench', '协同工作台'], ['architecture', '六级角色'], ['permissions', '权限矩阵'], ['process', '完整流程']] as Array<[GovernancePanel, string]>).map(([key, name]) => <Text key={key} className={governancePanel === key ? 'on' : ''} onClick={() => setGovernancePanel(key)}>{name}</Text>)}
          </View></ScrollView>
          {governancePanel === 'workbench' && <>
          <View className="section-head"><Text className="section-title">六级协助治理</Text><Text className="section-sub">上级统筹督导、基层发现处置，超时与疑难事项逐级协同</Text></View>
          <View className="govern-flow">
            {['总平台统筹', '省级督导', '市州协同', '县区调度', '乡镇派单', `${store.orgLabel()}处置`].map((name, index) => <View key={name} className="flow-item"><Text className="flow-index">{index + 1}</Text><Text>{name}</Text>{index < 5 && <Text className="flow-arrow">↓</Text>}</View>)}
          </View>
          <View className="section-head row-head"><View><Text className="section-title">事项协同台账</Text><Text className="section-sub">上报—派单—接单—处置—验收—归档</Text></View>{can('governance.create') ? <View className="create-case-btn" onClick={() => setShowCreate(!showCreate)}><Text>{showCreate ? '收起' : '＋ 上报事项'}</Text></View> : <Text className="readonly-badge">只读</Text>}</View>
          {showCreate && <View className="case-form">
            <Input className="case-input" value={newCase.title} maxlength={40} placeholder="事项标题（至少2字）" onInput={e => setNewCase({ ...newCase, title: e.detail.value })} />
            <Textarea className="case-textarea" value={newCase.description} maxlength={300} placeholder="说明地点、现状、影响和诉求（至少10字）" onInput={e => setNewCase({ ...newCase, description: e.detail.value })} />
            <View className="urgency-row"><Text>紧急程度</Text>{(['NORMAL', 'URGENT', 'CRITICAL'] as const).map(level => <Text key={level} className={newCase.urgency === level ? 'on' : ''} onClick={() => setNewCase({ ...newCase, urgency: level })}>{level === 'NORMAL' ? '一般' : level === 'URGENT' ? '紧急' : '重大'}</Text>)}</View>
            <View className={`submit-case ${caseBusy === 'create' ? 'disabled' : ''}`} onClick={() => caseBusy !== 'create' && createGovernanceCase()}><Text>{caseBusy === 'create' ? '正在提交…' : BACKEND_SYNC_ENABLED ? '确认上报' : '加入演示台账'}</Text></View>
          </View>}
          <ScrollView scrollX className="case-filters"><View className="case-filter-inner">{STATUS_GROUPS.map(item => <Text key={item.key} className={caseFilter === item.key ? 'on' : ''} onClick={() => setCaseFilter(item.key)}>{item.name}</Text>)}</View></ScrollView>
          {caseLoading ? <View className="case-empty"><Text>正在同步治理事项…</Text></View> : visibleCases.length === 0 ? <View className="case-empty"><Text>当前分类暂无治理事项</Text></View> : visibleCases.map(item => {
            const expanded = expandedCase === item.id; const actions = caseActions(item);
            return <View key={item.id} className={`case-card ${expanded ? 'expanded' : ''}`} onClick={() => setExpandedCase(expanded ? '' : item.id)}>
              <View className="case-top"><Text className="case-title">{item.urgency === 'CRITICAL' ? '🔴 ' : item.urgency === 'URGENT' ? '🟠 ' : ''}{item.title}</Text><Text className={`case-status status-${item.status.toLowerCase()}`}>{GOVERNANCE_STATUS[item.status] || item.status}</Text></View>
              <Text className="case-meta">{item.caseNo} · {item.originOrganizationName}{item.assigneeOrganizationName ? ` → ${item.assigneeOrganizationName}` : ' · 待派单'}</Text>
              <Text className={`case-desc ${expanded ? '' : 'ellipsis'}`}>{item.description}</Text>
              {expanded && <>
                <View className="case-track">{['上报', '派单', '接单', '办理', '验收'].map((name, index) => {
                  const order: Record<string, number> = { DRAFT: 0, RETURNED: 3, ESCALATED: 1, ASSIGNED: 1, ACCEPTED: 2, IN_PROGRESS: 3, PENDING_VERIFICATION: 4, CLOSED: 5 };
                  return <View key={name} className={(order[item.status] || 0) > index ? 'done' : (order[item.status] || 0) === index ? 'now' : ''}><Text className="track-dot">{(order[item.status] || 0) > index ? '✓' : index + 1}</Text><Text>{name}</Text></View>;
                })}</View>
                <View className="case-detail-row"><Text>创建时间</Text><Text>{item.createdAt}</Text></View>
                <View className="case-detail-row"><Text>协同版本</Text><Text>V{item.version}</Text></View>
                {actions.length > 0 ? <View className="case-actions" onClick={e => e.stopPropagation()}>{actions.map(([name, command, kind]) => <View key={name} className={`case-action ${kind} ${caseBusy === item.id ? 'disabled' : ''}`} onClick={() => caseBusy !== item.id && runCaseCommand(item, command)}><Text>{caseBusy === item.id ? '处理中…' : name}</Text></View>)}</View> : <View className="no-action"><Text>{item.status === 'CLOSED' ? '事项已归档，可在权限范围内查询全过程' : '当前账号无此环节操作权限'}</Text></View>}
              </>}
              <Text className="expand-hint">{expanded ? '收起详情 ︿' : '查看流程与操作 ﹀'}</Text>
            </View>;
          })}
          <View className="section-head"><Text className="section-title">基层治理闭环</Text><Text className="section-sub">群众发起 · 组织协同 · 结果可查</Text></View>
          <View className="quick-list">
            {[
              ['📋', '村务公开与质询', '/pages/affairs/index'],
              ['🗳️', '线上议事与投票', '/pages/council/index'],
              ['🛡️', '网格事件与平安综治', '/pages/safety/index'],
              ['⚖️', '矛盾纠纷调解', '/pages/legal/index'],
              ['🏛️', '便民政务与代办', '/pages/gov/index'],
              ['❤️', '志愿服务与治理积分', '/pages/volunteer/index'],
            ].map(([icon, name, url]) => <View key={name} className="quick-item" onClick={() => navigate(url)}><Text className="quick-icon">{icon}</Text><Text>{name}</Text><Text className="quick-arrow">›</Text></View>)}
          </View>
          </>}

          {governancePanel === 'architecture' && <View className="governance-panel-body">
            <View className="section-head"><Text className="section-title">六级角色与职责</Text><Text className="section-sub">点击层级查看岗位、功能和数据边界</Text></View>
            <View className="level-strip">{GOVERNANCE_LEVELS.map((level, index) => <View key={level.key} className={selectedLevel === index ? 'on' : ''} onClick={() => setSelectedLevel(index)}><Text>{level.short}</Text><Text>{level.name.split('（')[0]}</Text></View>)}</View>
            {(() => { const level = GOVERNANCE_LEVELS[selectedLevel]; return <View className="level-detail">
              <View className="level-detail-head"><View className="level-emblem"><Text>{level.short}</Text></View><View><Text className="level-name">{level.name}</Text><Text className="level-role">{level.role}</Text></View></View>
              <View className="level-position"><Text>治理定位</Text><Text>{level.position}</Text></View>
              <Text className="detail-label">标准岗位</Text><View className="role-chip-row">{level.roles.map(role => <Text key={role}>{role}</Text>)}</View>
              <Text className="detail-label">核心功能</Text><View className="duty-grid">{level.duties.map((duty, index) => <View key={duty}><Text>{index + 1}</Text><Text>{duty}</Text></View>)}</View>
              <Text className="detail-label">数据范围</Text><View className="scope-note"><Text>🔐 {level.scope}</Text></View>
              <Text className="detail-label">后端已配置权限</Text><View className="permission-chips">{level.permissions.map(permission => <Text key={permission}>{permission}</Text>)}</View>
            </View>; })()}
            <View className="boundary-card"><Text className="boundary-title">权责边界</Text><Text>上级负责标准、协调、监督和资源支持，不代替下级日常办理；下级负责发现、响应、现场处置和真实反馈。角色可向下授予但不能同级授予，且必须与目标组织层级匹配。</Text></View>
          </View>}

          {governancePanel === 'permissions' && <View className="governance-panel-body">
            <View className="section-head"><Text className="section-title">六级权限矩阵</Text><Text className="section-sub">● 表示后端角色已配置；任何页面显隐都不能代替后端鉴权</Text></View>
            <ScrollView scrollX className="permission-table-scroll"><View className="permission-table">
              <View className="permission-tr permission-th"><Text>功能权限</Text>{GOVERNANCE_LEVELS.map(level => <Text key={level.key}>{level.short}</Text>)}</View>
              {PERMISSION_ROWS.map(row => <View key={row.code} className="permission-tr"><View><Text>{row.name}</Text><Text>{row.code}</Text></View>{GOVERNANCE_LEVELS.map((level, index) => <Text key={level.key} className={index < row.levels ? 'allowed' : 'denied'}>{index < row.levels ? '●' : '—'}</Text>)}</View>)}
            </View></ScrollView>
            <View className="permission-rules">
              <Text className="detail-label">四条强制规则</Text>
              {['数据按组织路径隔离：只能看本组织及其下级范围', '办理必须精确匹配责任组织，上级有范围也不能冒充承办', '派单只能向发起组织的合法下级，不允许横向或向上派单', '验收由发起组织范围完成；命令冲突时重新加载，禁止覆盖新版本'].map((rule, index) => <View key={rule}><Text>{index + 1}</Text><Text>{rule}</Text></View>)}
            </View>
          </View>}

          {governancePanel === 'process' && <View className="governance-panel-body">
            <View className="section-head"><Text className="section-title">治理事项完整流程</Text><Text className="section-sub">每一环节明确责任人、输入、输出和控制规则</Text></View>
            <View className="process-list">{PROCESS_STAGES.map((stage, index) => <View key={stage.no} className="process-card">
              <View className="process-no"><Text>{stage.no}</Text>{index < PROCESS_STAGES.length - 1 && <View />}</View>
              <View className="process-content"><View className="process-title-row"><Text>{stage.name}</Text><Text>{stage.owner}</Text></View><View className="io-row"><Text>输入：{stage.input}</Text><Text>输出：{stage.output}</Text></View><Text className="process-rule">控制：{stage.rule}</Text></View>
            </View>)}</View>
            <View className="exception-grid">
              <View><Text>⏱️ 超时</Text><Text>提醒责任组织并进入上级督办队列；当前后端待补督办命令。</Text></View>
              <View><Text>↩️ 退回</Text><Text>必须填写原因，回到办理环节整改后再次提交验收。</Text></View>
              <View><Text>⬆️ 升级</Text><Text>本级资源不足或跨区域事项逐级协调；当前后端状态已预留。</Text></View>
              <View><Text>⚠️ 冲突</Text><Text>版本变化返回冲突，刷新最新状态后再操作，不自动覆盖。</Text></View>
            </View>
            <View className="backend-boundary"><Text>接口边界说明</Text><Text>当前真实接通：发起、列表、派单、接单、进度、提交验收、验收、退回。待后端补齐：详情轨迹、附件、督办、升级命令、时限规则、回访评价和统计接口。</Text></View>
          </View>}
        </View>}

        {tab === 'agri' && <View className="wrap">
          <View className="section-head"><Text className="section-title">种植台账与产销预测</Text><Text className="section-sub">消费数据反向指导生产</Text></View>
          {LEDGERS.map(item => <View key={item.crop} className="ledger-card">
            <View className="ledger-top"><Text className="ledger-name">🌱 {item.crop}</Text><Text className={`risk ${item.risk === '需拓销路' ? 'warn' : 'ok'}`}>{item.risk}</Text></View>
            <View className="ledger-grid"><View><Text>{item.area}</Text><Text>种植面积</Text></View><View><Text>{item.stage}</Text><Text>生长阶段</Text></View><View><Text>{item.forecast}</Text><Text>预计产量</Text></View><View><Text>{item.demand}</Text><Text>预测需求</Text></View></View>
          </View>)}
          <View className="forecast-card">
            <Text className="forecast-title">未来90天社区需求热度</Text>
            {[['沙窝萝卜', 92], ['小站稻', 78], ['设施草莓', 66], ['精品果蔬', 54]].map(([name, value]) => <View key={String(name)} className="bar-row"><Text>{name}</Text><View className="bar-track"><View className="bar-fill" style={{ width: `${value}%` }} /></View><Text>{value}</Text></View>)}
          </View>
          <View className="action-card" onClick={() => previewOnly('新增种植台账', '需记录地块、品类、面积、农事过程、投入品、检测和预计上市时间，并同步商品溯源。')}><Text>＋ 新增种植台账</Text><Text>›</Text></View>
          <View className="action-card" onClick={() => navigate('/pages/agri-tech/index')}><Text>📚 进入农技知识库</Text><Text>›</Text></View>
        </View>}

        {tab === 'network' && <View className="wrap">
          <View className="zero-card"><Text className="zero-big">0%</Text><View><Text className="zero-title">国内村社交易平台抽佣</Text><Text className="zero-sub">免费互通拓客 · 服务增值而非交易抽成</Text></View></View>
          <View className="section-head"><Text className="section-title">全国协作节点</Text><Text className="section-sub">各村独立私域 · 商品跨区域互通</Text></View>
          {NETWORK_NODES.map(item => <View key={item.area} className="node-card">
            <View className="node-place"><Text>📍 {item.area}</Text><Text>{item.villages}村</Text></View>
            <Text className="node-meta">{item.communities}个社区渠道 · {item.stores}个服务门店</Text>
            <Text className="node-special">特色供给：{item.specialty}</Text>
          </View>)}
          <View className="action-card" onClick={() => previewOnly('申请开通村级私域', '由县区或乡镇组织管理员审核组织资质，开通后可独立上架商品并参与全国互通。')}><Text>🏘️ 申请开通村级私域</Text><Text>›</Text></View>
        </View>}

        {tab === 'culture' && <View className="wrap">
          <View className="section-head"><Text className="section-title">乡村数字文化档案</Text><Text className="section-sub">文化留存、文明积分、文旅经营联动</Text></View>
          {CULTURE_ITEMS.map(item => <View key={item.title} className="culture-card">
            <View className="culture-icon"><Text>{item.icon}</Text></View><View className="culture-info"><Text className="culture-title">{item.title}</Text><Text className="culture-desc">{item.desc}</Text></View><Text className="culture-value">{item.value}</Text>
          </View>)}
          <View className="quick-list">
            <View className="quick-item" onClick={() => navigate('/pages/heritage/index')}><Text className="quick-icon">🏮</Text><Text>进入非遗文化</Text><Text className="quick-arrow">›</Text></View>
            <View className="quick-item" onClick={() => navigate('/pages/civility/index')}><Text className="quick-icon">🌸</Text><Text>进入文明乡风</Text><Text className="quick-arrow">›</Text></View>
            <View className="quick-item" onClick={() => navigate('/pages/tourism/index')}><Text className="quick-icon">🏞️</Text><Text>文旅资源上架联动</Text><Text className="quick-arrow">›</Text></View>
          </View>
          <View className="privacy-note"><Text>🔐 数字族谱和村民档案按户授权、分级可见；未经授权不得公开敏感个人信息。</Text></View>
        </View>}
        <View className="bottom-space" />
      </ScrollView>
    </View>
  );
}
