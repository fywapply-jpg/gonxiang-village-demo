import Taro, { useRouter } from '@tarojs/taro';
import { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { store, CHARITY_PERMS, VOL_POSTS, VOL_TYPE_COEF, VOL_TYPE_MINSTAR, calcVolPoints, PROJ_STAGES, ORG_PROJECTS, BENE_OPTS, CharityItem, VOL_LEVELS, VOL_APPLY_MIN, volLevelOf, donationPoints } from '../../store';
import { DEMO_MODE } from '../../config/version';
import './index.css';

const KPIS = [
  { label: '累计受益青少年', value: '12,860', unit: '人' },
  { label: '体育器材发放', value: '3,420', unit: '件' },
  { label: '公益活动场次', value: '486', unit: '场' },
  { label: '覆盖学校 / 社区', value: '162', unit: '个' },
];

interface Project { id: number; name: string; area: string; benefit: number; status: '进行中' | '已结项' | '募集中'; progress: number; stage: string; }
const PROJECTS: Project[] = [
  { id: 1, name: '乡村校园体育器材捐赠', area: '豫西 12 所乡村小学', benefit: 3200, status: '进行中', progress: 68, stage: '活动执行' },
  { id: 2, name: '公益体能课堂', area: '三门峡城乡社区', benefit: 4800, status: '进行中', progress: 55, stage: '中期督查' },
  { id: 3, name: '困境儿童体育关爱', area: '全市留守 / 困境儿童', benefit: 860, status: '募集中', progress: 30, stage: '理事会立项' },
  { id: 4, name: '乡村青少年体能帮扶', area: '范庄村等 8 村', benefit: 1500, status: '已结项', progress: 100, stage: '结项评估' },
];

const STAGES = ['项目申报', '理事会立项', '活动执行', '中期督查', '结项评估'];

interface Ledger { name: string; school: string; item: string; date: string; }
const LEDGER: Ledger[] = [
  { name: '张*明', school: '范庄村小学 · 五年级', item: '篮球 + 体育课名额', date: '06-28' },
  { name: '李*华', school: '第六社区青少年之家', item: '乒乓训练包', date: '06-25' },
  { name: '王*雨', school: '豫西中心小学 · 留守儿童', item: '体能帮扶名额', date: '06-20' },
  { name: '赵*阳', school: '范庄村小学 · 困境儿童', item: '运动装备 + 关爱金', date: '06-18' },
];

interface TraceStep { time: string; who: string; event: string; }
interface Material { code: string; name: string; qty: number; to: string; date: string; supplier: string; trace: TraceStep[]; }
const MATERIALS: Material[] = [
  {
    code: 'TY-2026-0348', name: '篮球架（标准）', qty: 12, to: '范庄村小学', date: '06-28', supplier: '星火体育用品有限公司',
    trace: [
      { time: '2026-05-18 14:20', who: '基金会采购员 · 李国强', event: '发起采购：篮球架 12 套；三方比价后中标，签合同 HT-2026-018，单价 ¥2,400' },
      { time: '2026-05-30 09:10', who: '公益专仓仓管 · 王芳', event: '到货验收合格入库，逐套粘贴唯一溯源码 TY-2026-0348，入库照片 8 张存档' },
      { time: '2026-06-25 10:00', who: '物资主管 · 赵明', event: '按项目计划调拨出库至范庄村小学，物流运单 WD-0625-07' },
      { time: '2026-06-28 15:30', who: '项目专员 · 孙强 / 校方 · 张校长', event: '现场安装 12 套到位，全校师生见证，现场照片 6 张归档' },
      { time: '2026-06-28 16:00', who: '范庄村小学体育教师 · 刘敏', event: '签字确认接收，纳入学校固定资产台账，受益班级 5 个 / 学生 320 名' },
    ],
  },
  {
    code: 'TY-2026-0349', name: '乒乓球台', qty: 20, to: '第六社区青少年之家', date: '06-25', supplier: '恒动体育器材厂',
    trace: [
      { time: '2026-05-20 11:00', who: '基金会采购员 · 李国强', event: '发起采购：乒乓球台 20 张，合同 HT-2026-021，单价 ¥1,180' },
      { time: '2026-06-02 15:40', who: '公益专仓仓管 · 王芳', event: '验收入库并贴码 TY-2026-0349，抽检 3 张合格' },
      { time: '2026-06-24 09:30', who: '物资主管 · 赵明', event: '调拨至第六社区青少年之家，运单 WD-0624-03' },
      { time: '2026-06-25 14:00', who: '社区专员 · 周敏 / 居委会 · 张主任', event: '现场交付 20 张，摆放到位，居民代表见证签字' },
    ],
  },
  {
    code: 'TY-2026-0350', name: '体能训练器材包', qty: 150, to: '豫西 8 所乡村小学', date: '06-20', supplier: '康体运动装备公司',
    trace: [
      { time: '2026-05-12 10:15', who: '基金会采购员 · 李国强', event: '发起采购：体能训练器材包 150 套，合同 HT-2026-009，单价 ¥360' },
      { time: '2026-05-26 16:20', who: '公益专仓仓管 · 王芳', event: '分批到货验收入库，整批贴码 TY-2026-0350' },
      { time: '2026-06-15 08:00', who: '物资主管 · 赵明', event: '按 8 校名额拆分调拨，8 张运单分别签收' },
      { time: '2026-06-20 17:00', who: '各校体育教师（8 人）', event: '8 校全部签收，受益学生 1,860 名，发放明细逐校公示' },
    ],
  },
  {
    code: 'TY-2026-0351', name: '运动健康科普教具', qty: 300, to: '城乡社区活动站', date: '06-15', supplier: '知行教育科技公司',
    trace: [
      { time: '2026-05-08 13:30', who: '基金会采购员 · 李国强', event: '发起采购：科普教具 300 套，合同 HT-2026-005，单价 ¥95' },
      { time: '2026-05-22 10:50', who: '公益专仓仓管 · 王芳', event: '验收入库贴码 TY-2026-0351，质检报告归档' },
      { time: '2026-06-15 11:00', who: '物资主管 · 赵明 / 各活动站站长', event: '发放至 24 个城乡社区活动站，签收台账全部录入' },
    ],
  },
];

const FUND = [
  { name: '定制软件开发', budget: 445, used: 210, note: '无形资产 · 3 年摊销' },
  { name: '硬件设备采购', budget: 175, used: 96, note: '固定资产 · 3 年折旧' },
  { name: '云资源租赁', budget: 128, used: 42, note: '运营分摊' },
  { name: '人员薪酬', budget: 162, used: 58, note: '管理分摊' },
  { name: '运维 / 培训 / 审计', budget: 90, used: 20, note: '运营分摊' },
];

const FUND_FLOW = ['预算填报', '多级审批', '费用核销', '对公付款'];

const REGIONS = [
  { name: '河南 · 三门峡', n: '5,400' },
  { name: '河南 · 豫西各县', n: '3,800' },
  { name: '河南 · 郑州社区', n: '1,600' },
  { name: '其他省份试点', n: '2,060' },
];

const DONORS = [
  { name: '中国关心下一代体育基金会', type: '专项拨款', amount: '1000 万' },
  { name: '豫西体育用品有限公司', type: '爱心企业 · 配捐', amount: '86 万' },
  { name: '三门峡农商银行', type: '爱心企业 · 配捐', amount: '52 万' },
  { name: '天津东丽华明范庄供销合作社', type: '实物捐赠', amount: '38 万' },
  { name: '爱心人士（累计 1,240 人次）', type: '个人小额', amount: '17 万' },
];

const VOLUNTEERS = [
  { name: '党员志愿者 · 王建国', org: '范庄村党支部', hours: 186 },
  { name: '大学生志愿者 · 李梦', org: '三门峡体育学院', hours: 152 },
  { name: '党员志愿者 · 赵红', org: '第六社区党委', hours: 138 },
  { name: '教练志愿者 · 孙强', org: '市体育局', hours: 120 },
  { name: '巾帼志愿者 · 周敏', org: '范庄村妇联', hours: 96 },
];

const PHOTOS = [
  { emoji: '🏀', title: '乡村校园篮球课', date: '06-28', bg: '#fee2e2' },
  { emoji: '🏃', title: '青少年体能营', date: '06-25', bg: '#ffedd5' },
  { emoji: '⚽', title: '留守儿童足球赛', date: '06-20', bg: '#dcfce7' },
  { emoji: '🏓', title: '社区乒乓公益课', date: '06-18', bg: '#dbeafe' },
  { emoji: '🤸', title: '体操科普进校园', date: '06-15', bg: '#fae8ff' },
  { emoji: '🥇', title: '公益运动会颁奖', date: '06-10', bg: '#fef9c3' },
];

// 角色责权利（相互制衡·对等平衡）
const ROLES_RZL = [
  { role: '平台运营', duty: '系统保障、数据安全、审核机构入驻', power: '审核入驻、授权公益机构管理员、全局监管', benefit: '平台运营（合规内）' },
  { role: '公益机构管理员', duty: '统筹各公益机构、合规监督', power: '逐级授权到各机构项目板块、跨机构监管', benefit: '公益生态公信力' },
  { role: '福利机构 / 基金会（机构管理员）', duty: '本机构合规、公示、确定发放对象', power: '本机构项目板块运营、集中审批（理事会）', benefit: '项目落地、机构公信' },
  { role: '机构初审 / 复审专员', duty: '受理初审、材料复核', power: '分级审核（初审 → 复审）', benefit: '履职绩效' },
  { role: '村委 / 居委（实施单位）', duty: '申报、执行、如实登记发放', power: '发起申报、登记发放', benefit: '项目资源 + 贡献值 + 荣誉' },
  { role: '村民 / 居民', duty: '如实申领、接受公示', power: '申领、捐赠、志愿、监督', benefit: '受益 + 捐赠 / 志愿贡献值' },
  { role: '捐赠人 / 爱心企业', duty: '履约、诚信', power: '定向指定、查去向、监督', benefit: '社会贡献值 + 公示致谢' },
  { role: '法律 / 监察部门', duty: '依法监督', power: '唯一可调查取证', benefit: '维护公益公信' },
];

// 申领对象改由福利机构/基金会在 store 预先确定发布（store.getCharityItems），此处不再写死

export default function CharityPage() {
  const router = useRouter();
  // 权限模型：由平台运营授权分级管理。公众=浏览权；授权=在责权范围内行使。
  // 进入监管视角的两种方式：① 扫 ?org=foundation 专属码；② 登录为「基金会管理员」且平台已授予责权。
  const foundationMode = DEMO_MODE && router.params.org === 'foundation';
  const isManager = foundationMode || store.isCharityManager();
  const perms = foundationMode ? CHARITY_PERMS.map(p => p.key) : store.getCharityAuth();
  const has = (k: string) => perms.includes(k);
  const grantedNames = CHARITY_PERMS.filter(p => has(p.key)).map(p => p.name).join(' / ') || '（暂未授予）';

  const MGR_TABS: [string, string][] = [['dash', '📊 监管驾驶舱'], ['org', '🏛 机构入驻'], ['proj', '📋 项目监管'], ['fund', '💰 资金审计'], ['mat', '📦 物资溯源']];
  if (has('audit')) MGR_TABS.push(['audit', '✅ 申领审核']);
  MGR_TABS.push(['vol', '🙋 志愿核实'], ['open', '📢 公开监督']);
  const PUB_TABS: [string, string][] = [['org', '🏛 公益机构'], ['proj', '🏀 公益项目'], ['donate', '❤️ 我要捐赠'], ['vol', '🙋 志愿服务'], ['apply', '📝 我要申领'], ['open', '📢 信息公开']];
  const TABS = isManager ? MGR_TABS : PUB_TABS;
  const keys = TABS.map(t => t[0]);
  const qtab = router.params.tab;
  const [tab, setTab] = useState(qtab && keys.includes(qtab) ? qtab : (isManager ? 'dash' : 'proj'));
  const [openMat, setOpenMat] = useState('');
  const [claims, setClaims] = useState(store.getCharityClaims());
  const [orgs, setOrgs] = useState(store.getCharityOrgs());
  const [vols, setVols] = useState(store.getVolRecords());
  const [dons, setDons] = useState(store.getDonations());
  const [projs, setProjs] = useState(store.getCharityProjs());
  const certOrgs = orgs.filter(o => o.status === '已认证');
  const [dOrg, setDOrg] = useState(certOrgs[0] ? certOrgs[0].name : '');
  const [dProj, setDProj] = useState((ORG_PROJECTS[certOrgs[0] ? certOrgs[0].name : ''] || [])[0] || '');
  const [dBene, setDBene] = useState(BENE_OPTS[0]);
  const [dKind, setDKind] = useState<'资金' | '实物'>('资金');
  const [dRecur, setDRecur] = useState(false);
  const [dAnon, setDAnon] = useState(false);
  const projList = ORG_PROJECTS[dOrg] || [];
  const pickOrg = (name: string) => { setDOrg(name); setDProj((ORG_PROJECTS[name] || [])[0] || ''); };
  const [volCerts, setVolCerts] = useState(store.getVolCerts());
  const [items, setItems] = useState(store.getCharityItems());
  const myName = store.getUser()?.name || '';
  const myCert = volCerts.find(c => c.name === myName);
  const myCertStatus = myCert ? myCert.status : '未认证';
  const myPoints = store.getContribAccount().total;              // 累计贡献值（终身荣誉）
  const activePoints = store.getActiveContrib();                 // 有效贡献值（近12月·真实时间戳滚动计算）
  const expired = store.getExpiredContrib();                     // 已过期（超12月自动滚出）
  const expiring = store.getExpiringContrib(90);                 // 90天内将过期
  const myLevel = volLevelOf(activePoints);                      // 星级按有效值动态评定，不进则退
  const nextLevel = VOL_LEVELS.find(l => l.min > activePoints);
  const totalUsed = FUND.reduce((s, f) => s + f.used, 0);
  const mgmtPct = 7.8;

  const apply = (a: CharityItem) => {
    if (!store.requireBound()) return;
    Taro.showModal({
    title: `申领：${a.name}`,
    content: `申领对象：${a.who}\n须满足：${a.cond}\n限额：${a.limit}\n需提交：${a.docs}\n\n确认你已符合上述条件并提交申领？`,
    confirmText: '确认符合并提交', cancelText: '再看看',
    success: (res) => {
      if (res.confirm) {
        const id = store.addCharityClaim(a.name, a.proj);
        setClaims(store.getCharityClaims());
        setProjs(store.getCharityProjs());
        Taro.showModal({ title: '✅ 申领已提交', content: `申领单号：${id}\n申领对象：${a.name}\n挂靠项目：${a.proj}\n状态：待审核\n\n已挂入对应公益项目、计入认领进度，进入「村 / 社区便民站核实 → 基金会审核」流程，可在「我的申领」查看进度。`, showCancel: false });
      }
    },
    });
  };
  const doReview = (id: string, pass: boolean) => { store.reviewCharityClaim(id, pass); setClaims(store.getCharityClaims()); Taro.showToast({ title: pass ? '已通过并发放' : '已驳回', icon: 'success' }); };
  const supervise = () => Taro.showModal({ title: '群众监督', content: '专项资金使用、物资发放全部脱敏公示；如发现问题可一键反馈，基金会 + 第三方审计联合核查（演示）。', showCancel: false });
  const report = (p: Project) => Taro.showModal({ title: `结项报告 · ${p.name}`, content: `受益青少年 ${p.benefit} 人 · 进度 100%，覆盖 ${p.area}。专项资金已核销、物资发放到位、受益档案一人一档齐全，第三方审计通过。演示版：正式版可一键导出 PDF 结项报告与专项审计底稿。`, showCancel: false });
  const needAuth = () => Taro.showModal({ title: '🔒 需授权认证', content: '该管理操作需「社会公益管理授权」。请由平台运营在「社会公益授权管理」中授予对应责权后行使。公众仅有浏览权。', showCancel: false });
  const stCls = (s: string) => s === '待审核' ? 'st-raise' : s === '已通过' || s === '已认证' ? 'st-done' : s === '已驳回' ? 'st-ing' : 'st-raise';
  // 机构入驻：凭国家认证资质申请 → 平台审核认证
  const applyOrg = () => {
    if (!store.requireBound()) return;
    Taro.showModal({ title: '机构入驻申请', editable: true, placeholderText: '输入机构名称', content: '入驻须持国家认证机构颁发的专业资质证书（慈善组织登记证 / 公开募捐资格 / 民非登记证等）。演示：提交后进入平台审核认证。', success: (r: any) => { if (r.confirm && r.content) { store.applyCharityOrg(r.content, '社会福利机构', '（已提交国家认证资质证书 · 待核验）'); setOrgs(store.getCharityOrgs()); Taro.showToast({ title: '已提交 · 待平台审核', icon: 'success' }); } } } as any);
  };
  const reviewOrg = (id: string, pass: boolean) => { store.reviewCharityOrg(id, pass); setOrgs(store.getCharityOrgs()); Taro.showToast({ title: pass ? '已认证通过' : '已驳回', icon: 'success' }); };
  // 公益捐赠：联动社会贡献值
  const viewReceipt = (d: any) => Taro.showModal({ title: '🧾 公益事业捐赠票据', content: `票据编号：${d.receiptNo}\n🔒 防伪验真码：${d.verifyCode}\n开票状态：${d.confirmed ? '✅ 基金会已开票确认' : '⏳ 待基金会到账核对开票'}\n开具机构：${d.org}\n捐赠人：${d.anonymous ? d.who + '（匿名·内部可溯）' : d.who}\n捐赠：${d.kind} · ¥${d.amount}${d.recurring ? ' · 月捐' : ''}\n项目：${d.project} · 为${d.bene}\n开具日期：${d.date}\n\n凭「防伪验真码」可在基金会官网 / 慈善中国验真；可用于个税 / 企税税前扣除。正式版含机构财务专用章、验真二维码、可下载 PDF。`, confirmText: '保存 / 下载', cancelText: '关闭', success: (r) => { if (r.confirm) Taro.showToast({ title: '票据已保存（演示）', icon: 'success' }); } });
  const doDonate = (amt: number) => { if (!store.requireBound()) return; const pts = donationPoints(amt, dKind, dRecur); Taro.showModal({ title: `捐赠 ¥${amt}`, content: `机构：${dOrg}\n项目：${dProj}\n受益对象：${dBene}\n类型：${dKind}${dRecur ? ' · 月捐' : ''} · ${dAnon ? '匿名不公开' : '公开公布'}\n\n按算法折算社会贡献值 +${pts} 分（须基金会开票确认后入账）。专款专用、开具防伪票据、全程可溯。确认捐赠？`, confirmText: '确认捐赠', success: (r) => { if (r.confirm) { const d = store.donate(amt, dOrg, dProj, dBene, dKind, dRecur, dAnon); setDons(store.getDonations()); Taro.showModal({ title: '❤️ 感谢您的爱心', content: `已提交捐赠 ¥${amt}（${dKind}${dRecur ? '·月捐' : ''}）。\n\n📌 社会贡献值 +${d.points} 分为「待确认」，须基金会到账核对 + 开票确认后正式入账、上链。\n🧾 防伪票据 ${d.receiptNo}，验真码 ${d.verifyCode}。`, confirmText: '查看票据', cancelText: '完成', success: (r2) => { if (r2.confirm) viewReceipt(d); } }); } } }); };
  const confirmDonate = (id: string) => { store.confirmDonation(id); setDons(store.getDonations()); Taro.showToast({ title: '已开票确认 · 贡献值入账', icon: 'success' }); };
  // 志愿报名 / 核实（核实后按精算入账贡献值）
  const doSignVol = (p: typeof VOL_POSTS[number]) => {
    if (!store.requireBound()) return;
    if (myCertStatus !== '已认证') { Taro.showModal({ title: '🪪 需先完成志愿者认证', content: '参与公益服务须先通过志愿者认证：身份、职业技能、相关证书、所在单位证明、无犯罪记录证明，最终由相应福利机构审核认证。请在本页顶部「志愿者认证」提交申请。', showCancel: false }); return; }
    const need = VOL_TYPE_MINSTAR[p.type] || 1;
    if (!myLevel || myLevel.star < need) { const needName = VOL_LEVELS.find(l => l.star === need)?.title || `${need}星`; Taro.showModal({ title: '🌟 岗位等级不足', content: `「${p.title}」为${p.type}岗，需 ${'★'.repeat(need)} ${needName} 及以上。你当前 ${myLevel ? '★'.repeat(myLevel.star) + ' ' + myLevel.title : '未达志愿者门槛'}。多参与公益、积累社会贡献值即可升级解锁更高价值岗位。`, showCancel: false }); return; }
    Taro.showModal({ title: `报名志愿：${p.title}`, content: `岗位类型：${p.type}（系数 ×${VOL_TYPE_COEF[p.type]}）\n预计时长：${p.hours} 小时 · 受益约 ${p.benefit} 人\n预估贡献值：${calcVolPoints(p.hours, p.type, p.benefit)} 分\n\n完成后须经「签到 + 照片 / 视频 + 受益人评价 + 机构确认」核实方计入。确认报名？`, confirmText: '确认报名', success: (r) => { if (r.confirm) { store.signVol(p); setVols(store.getVolRecords()); Taro.showToast({ title: '报名成功', icon: 'success' }); } } });
  };
  const applyCert = () => {
    if (!store.requireBound()) return;
    if (activePoints < VOL_APPLY_MIN) { Taro.showModal({ title: '🪪 暂未达申请门槛', content: `申请志愿者需「有效社会贡献值」≥ ${VOL_APPLY_MIN} 分（你当前有效值 ${activePoints} 分）。有效值只算近 12 个月，需持续参与积累。`, showCancel: false }); return; }
    Taro.showModal({ title: '志愿者认证申请', editable: true, placeholderText: '填写职业技能，如“篮球二级教练”', content: `你当前有效社会贡献值 ${activePoints} 分（已达 ≥${VOL_APPLY_MIN} 门槛）。认证须提交：① 身份证明 ② 职业技能 ③ 相关证书 ④ 所在单位证明 ⑤ 无犯罪记录证明。提交后由相应福利机构审核认证（面向青少年，从严核验）。`, success: (r: any) => { if (r.confirm) { store.applyVolCert(r.content || '一般志愿服务'); setVolCerts(store.getVolCerts()); Taro.showToast({ title: '已提交 · 待机构认证', icon: 'success' }); } } } as any);
  };
  const doReviewCert = (id: string, pass: boolean) => { store.reviewVolCert(id, pass); setVolCerts(store.getVolCerts()); Taro.showToast({ title: pass ? '已认证通过' : '已驳回', icon: 'success' }); };
  const totalVolHours = vols.filter(v => v.verified).reduce((s, v) => s + v.hours, 0);
  const _dt = new Date();
  const issueDate = `${_dt.getFullYear()}-${String(_dt.getMonth() + 1).padStart(2, '0')}-${String(_dt.getDate()).padStart(2, '0')}`;
  const expireDate = `${_dt.getFullYear() + 1}-${String(_dt.getMonth() + 1).padStart(2, '0')}-${String(_dt.getDate()).padStart(2, '0')}`;
  const showVolCertificate = () => { if (!myLevel) return; Taro.showModal({ title: '🎖 志愿者荣誉证书（演示）', content: `兹证明 ${myName}\n志愿者等级：${'★'.repeat(myLevel.star)} ${myLevel.title}\n累计贡献值 ${myPoints} 分 · 有效值 ${activePoints} 分\n累计志愿服务时长：${totalVolHours} 小时\n颁发机构：中国关心下一代体育基金会\n证书编号：RY-2026-${String(1000 + myPoints).slice(1)}\n发证：${issueDate} · 有效期 1 年（至 ${expireDate}）\n\n到期须按当年有效值与服务表现重新核发；逾期未复核自动失效。正式版含机构公章、验真二维码。`, confirmText: '保存 / 分享', cancelText: '关闭', success: (r) => { if (r.confirm) Taro.showToast({ title: '证书已保存（演示）', icon: 'success' }); } }); };
  const showAppointment = () => { if (!myLevel || myLevel.star < 4) { Taro.showModal({ title: '📜 暂不可受聘', content: '「聘书」面向星级导师（★★★★）及以上受聘岗位负责人 / 公益导师。继续积累有效贡献值晋级后可受聘。', showCancel: false }); return; } Taro.showModal({ title: '📜 电子聘书（演示）', content: `兹聘任 ${myName}\n职务：${myLevel.star >= 5 ? '公益导师' : '岗位负责人'}\n受聘机构：中国关心下一代体育基金会\n聘书编号：PS-2026-${String(1000 + myPoints).slice(1)}\n任期：1 年（${issueDate} 至 ${expireDate}）\n\n任期届满须经年度考核「续聘 / 解聘」；考核不达标或降级即自动解聘。`, confirmText: '接受聘任', cancelText: '关闭', success: (r) => { if (r.confirm) Taro.showToast({ title: '已接受聘任（演示）', icon: 'success' }); } }); };
  // 机构预先确定并发布申领对象（发布后才在「我要申领」显现）
  const publishItem = () => Taro.showModal({ title: '发布申领对象', editable: true, placeholderText: '输入申领对象名称，如“冬季暖冬包”', content: '由福利机构 / 基金会预先确定申领对象、受益范围与限额，发布后方在「我要申领」向群众显现。', success: (r: any) => { if (r.confirm && r.content) { store.addCharityItem(r.content, '经机构核定的受益对象', '按机构核定限额'); setItems(store.getCharityItems()); Taro.showToast({ title: '已发布 · 群众端已显现', icon: 'success' }); } } } as any);
  const unpublishItem = (id: string) => { store.removeCharityItem(id); setItems(store.getCharityItems()); Taro.showToast({ title: '已下架', icon: 'success' }); };
  const doVerifyVol = (id: string) => { store.verifyVol(id); setVols(store.getVolRecords()); Taro.showToast({ title: '已核实 · 贡献值入账', icon: 'success' }); };
  // 项目全流程：实施单位发起申报 → 分角色推进
  const doDeclare = () => Taro.showModal({ title: '项目发起申报', editable: true, placeholderText: '输入项目名称，如“范庄村校园足球”', content: '实施单位（村委 / 居委 / 学校）发起公益项目申报。演示：提交后进入基金会理事会立项审核（发起≠立项，相互制衡）。', success: (r: any) => { if (r.confirm && r.content) { store.declareProj(r.content, '关心下一代体育基金会', '本村青少年'); setProjs(store.getCharityProjs()); Taro.showToast({ title: '已申报 · 待立项', icon: 'success' }); } } } as any);
  const doAdvance = (id: string) => { store.advanceProj(id); setProjs(store.getCharityProjs()); Taro.showToast({ title: '已推进到下一环节', icon: 'success' }); };
  // 发起人申请变更（增额/减额/终止）→ 平台 + 国家机构 双审核方生效
  const reqChange = (id: string, type: '增额' | '减额' | '终止') => {
    if (type === '终止') { Taro.showModal({ title: '申请终止项目', content: '终止申请须经「平台 + 国家机构」双审核方可生效，全程留痕可溯。确认提交？', confirmText: '提交终止申请', success: (r) => { if (r.confirm) { store.requestProjChange(id, '终止', 0); setProjs(store.getCharityProjs()); Taro.showToast({ title: '终止申请已提交 · 待双审核', icon: 'none' }); } } }); return; }
    Taro.showModal({ title: `申请${type}`, editable: true, placeholderText: '输入金额（万），如 50', content: `${type}申请须经「平台 + 国家机构」双审核方可生效。`, success: (r: any) => { if (r.confirm) { const d = parseInt(r.content || '50', 10) || 50; store.requestProjChange(id, type, d); setProjs(store.getCharityProjs()); Taro.showToast({ title: `${type} ${d} 万 已提交 · 待双审核`, icon: 'none' }); } } } as any);
  };
  const reviewChange = (pid: string, cid: string, party: 'platform' | 'national') => { store.reviewProjChange(pid, cid, party); setProjs(store.getCharityProjs()); Taro.showToast({ title: party === 'platform' ? '平台已审核' : '国家机构已审核', icon: 'success' }); };

  return (
    <View className="page">
      <View className="hero">
        {isManager && <Text className="hero-badge">🛡️ 公益机构监管平台</Text>}
        <Text className="hero-t">🏀 关心下一代 · 青少年体育公益</Text>
        <Text className="hero-s">中国关心下一代体育基金会 · 1000 万专项公益资金 · 全程可溯源可监管 · 依托供享村社</Text>
      </View>
      {/* 权限横幅：平台运营授权分级管理，公众仅浏览权 */}
      <View className={`authbar ${isManager ? 'authbar-mgr' : ''}`}>
        {isManager
          ? <Text className="authbar-t">🛡 已授权社会公益管理 · 责权范围：{grantedNames}</Text>
          : <Text className="authbar-t">👁 公众浏览身份 · 可查看公示与申领；管理权限须由平台运营授权认证</Text>}
      </View>
      <ScrollView scrollX className="tabs">
        {TABS.map(([k, l]) => (
          <View key={k} className={`tab ${tab === k ? 'tab-on' : ''}`} onClick={() => setTab(k)}><Text className="tab-t">{l}</Text></View>
        ))}
      </ScrollView>
      <ScrollView scrollY className="body">
        {/* ① 监管驾驶舱 */}
        {tab === 'dash' && (
          <View>
            <View className="kpis">
              {KPIS.map(k => (<View key={k.label} className="kpi"><Text className="kpi-v">{k.value}</Text><Text className="kpi-u">{k.unit}</Text><Text className="kpi-l">{k.label}</Text></View>))}
            </View>
            <View className="fundcard">
              <Text className="fc-t">💰 专项资金总览（万元）</Text>
              <View className="fc-row"><Text>总额度</Text><Text className="fc-b">¥1000</Text></View>
              <View className="fc-row"><Text>已支出</Text><Text className="fc-b">¥{totalUsed}</Text></View>
              <View className="fc-row"><Text>管理费占比</Text><Text className="fc-ok">{mgmtPct}% · 未触 10% 红线 ✓</Text></View>
              <View className="bar"><View className="bar-in" style={{ width: `${totalUsed / 10}%` }} /></View>
            </View>
            <View className="modcard">
              <Text className="mod-t">🔐 数据安全与全程操作存证</Text>
              <Text className="mod-d">未成年人信息脱敏 · 分级授权访问；后台操作 / 资金审批 / 物资调拨生成不可篡改区块链日志；配套等保合规改造。</Text>
            </View>
            <View className="chain"><Text className="chain-t">🔗 全部资金流水、物资调拨、受益青少年档案区块链存证 · 电子档案留存 ≥10 年 · 一键导出专项审计底稿</Text></View>
          </View>
        )}
        {/* 🏛 公益机构（多机构入驻 · 国家认证资质 · 平台审核） */}
        {tab === 'org' && (
          <View>
            <View className="apply-tip"><Text className="apply-tip-t">🏛 多家福利机构 / 基金会 · 均持国家认证专业资质证书，须经「平台运营」审核资质准入后方可入驻 · 各自发起社会福利项目</Text></View>
            {orgs.map(o => (
              <View key={o.id} className="orgc">
                <View className="orgc-top">
                  <Text className="orgc-ic">{o.icon}</Text>
                  <View className="orgc-m"><Text className="orgc-n">{o.name}</Text><Text className="orgc-ty">{o.type}</Text></View>
                  <Text className={`cc-st ${stCls(o.status)}`}>{o.status}</Text>
                </View>
                <Text className="orgc-cert">📜 资质：{o.cert}</Text>
                <Text className="orgc-lic">统一社会信用代码 {o.code} · 证书号 {o.certNo} · 有效期 {o.valid}</Text>
                {o.status === '已认证' && <Text className="orgc-stat">在办项目 {o.projects} 个 · 累计受益 {o.benefit} 人</Text>}
                {store.isPlatformAdmin() && o.status === '待审核' && (
                  <View className="cc-btns">
                    <View className="cc-pass" onClick={() => reviewOrg(o.id, true)}><Text className="cc-btn-t">✓ 平台运营核验资质 · 准予入驻</Text></View>
                    <View className="cc-reject" onClick={() => reviewOrg(o.id, false)}><Text className="cc-btn-t2">✕ 驳回</Text></View>
                  </View>
                )}
                {!store.isPlatformAdmin() && o.status === '待审核' && <Text className="orgc-stat" style={{ color: '#ea580c' }}>⏳ 入驻申请待平台运营审核资质</Text>}
              </View>
            ))}
            <View className="ai-btn" onClick={applyOrg}><Text className="ai-btn-t">＋ 机构入驻申请（须持国家认证资质）›</Text></View>
          </View>
        )}
        {/* ② 项目监管 / 公益项目 */}
        {tab === 'proj' && (
          <View>
            <View className="modcard">
              <Text className="mod-t">📋 项目全流程监管（申报 → 结项）</Text>
              <View className="steps">
                {STAGES.map((s, i) => (<View key={s} className="step"><View className="step-dot"><Text className="step-n">{i + 1}</Text></View><Text className="step-t">{s}</Text></View>))}
              </View>
            </View>
            <View className="ai-btn" onClick={doDeclare}><Text className="ai-btn-t">＋ 发起项目申报（实施单位：村委 / 居委 / 学校）›</Text></View>
            {projs.length > 0 && (
              <View className="modcard">
                <Text className="mod-t">🔄 公益项目全流程（机构发起 → 受益人认领 · 全程可溯 · 变更须双审核）</Text>
                {projs.map(p => (
                  <View key={p.id} className="pcard">
                    <View className="p-top"><Text className="p-name">{p.name}</Text><Text className={`p-st ${p.terminated ? 'st-done' : 'st-ing'}`}>{p.terminated ? '已终止' : PROJ_STAGES[p.stageIdx]}</Text></View>
                    <Text className="p-area">🏛 {p.org} · 发起：{p.initiator}</Text>
                    <View className="pmeta"><Text className="pm-k">定向人群</Text><Text className="pm-v">{p.target}</Text></View>
                    <View className="pmeta"><Text className="pm-k">实施金额</Text><Text className="pm-v">¥{p.amount} 万（自筹 {p.selfRaised} + 捐赠 {p.donated}）</Text></View>
                    <View className="pmeta"><Text className="pm-k">实施计划</Text><Text className="pm-v">{p.plan}</Text></View>
                    <View className="pmeta"><Text className="pm-k">制度</Text><Text className="pm-v">{p.rule}</Text></View>
                    <View className="pmeta"><Text className="pm-k">认领进度</Text><Text className="pm-v">受益人已认领 {p.claimed} / 名额 {p.quota} 名</Text></View>
                    <View className="bar"><View className="bar-in" style={{ width: `${Math.min(100, Math.round(p.claimed / p.quota * 100))}%` }} /></View>
                    <View className="steps" style={{ marginTop: '10rpx' }}>
                      {PROJ_STAGES.map((s, i) => (<View key={s} className="step"><View className="step-dot" style={{ background: !p.terminated && i <= p.stageIdx ? '#dc2626' : '#e5e7eb' }}><Text className="step-n">{i + 1}</Text></View><Text className="step-t">{s}</Text></View>))}
                    </View>
                    {isManager && has('proj') && !p.terminated && p.stageIdx < PROJ_STAGES.length - 1 && (
                      <View className="ai-btn" style={{ marginTop: '12rpx' }} onClick={() => doAdvance(p.id)}><Text className="ai-btn-t">推进到「{PROJ_STAGES[p.stageIdx + 1]}」›</Text></View>
                    )}
                    {!p.terminated && (
                      <View className="chgrow">
                        <Text className="chg-lbl">发起人变更：</Text>
                        <View className="chg-b" onClick={() => reqChange(p.id, '增额')}><Text className="chg-t">增额</Text></View>
                        <View className="chg-b" onClick={() => reqChange(p.id, '减额')}><Text className="chg-t">减额</Text></View>
                        <View className="chg-b chg-stop" onClick={() => reqChange(p.id, '终止')}><Text className="chg-t2">终止</Text></View>
                      </View>
                    )}
                    {p.changes.map(c => (
                      <View key={c.id} className="chgcard">
                        <Text className="chgc-t">变更：{c.type}{c.type !== '终止' ? ` ${c.delta} 万` : ''} · {c.done ? '✅ 双审通过 · 已生效' : '待双审核'}</Text>
                        <View className="chgc-r">
                          <View className={`chgc-ok ${c.platformOk ? 'chgc-on' : ''}`} onClick={() => { if (!c.platformOk && isManager) reviewChange(p.id, c.id, 'platform'); }}><Text className="chgc-ot">{c.platformOk ? '✓ 平台已审' : '平台审核'}</Text></View>
                          <View className={`chgc-ok ${c.nationalOk ? 'chgc-on' : ''}`} onClick={() => { if (!c.nationalOk && isManager) reviewChange(p.id, c.id, 'national'); }}><Text className="chgc-ot">{c.nationalOk ? '✓ 国家机构已审' : '国家机构审核'}</Text></View>
                        </View>
                      </View>
                    ))}
                    <Text className="p-pg">📌 解释权归发起人；增 / 减 / 终止等变更须「平台 + 国家机构」双审核方生效，全程上链可溯</Text>
                  </View>
                ))}
              </View>
            )}
            {PROJECTS.map(p => (
              <View key={p.id} className="pcard">
                <View className="p-top"><Text className="p-name">{p.name}</Text><Text className={`p-st st-${p.status === '进行中' ? 'ing' : p.status === '已结项' ? 'done' : 'raise'}`}>{p.status}</Text></View>
                <Text className="p-area">📍 {p.area} · 受益 {p.benefit} 人 · 当前：{p.stage}</Text>
                <View className="bar"><View className="bar-in" style={{ width: `${p.progress}%` }} /></View>
                <Text className="p-pg">进度 {p.progress}% · 受益档案一人一档</Text>
                {p.status === '已结项' && <Text className="p-report" onClick={() => report(p)}>📄 下载结项报告 ›</Text>}
              </View>
            ))}
            <View className="modcard">
              <Text className="mod-t">📷 公益活动照片 / 视频墙（现场留痕 · 线上归档）</Text>
              <View className="photos">
                {PHOTOS.map(ph => (
                  <View key={ph.title} className="photo" style={{ background: ph.bg }}>
                    <Text className="photo-em">{ph.emoji}</Text>
                    <Text className="photo-t">{ph.title}</Text>
                    <Text className="photo-d">{ph.date}</Text>
                  </View>
                ))}
              </View>
              <View className="vids">
                {['乡村篮球课·实录', '体能营·开营式', '困境儿童足球赛', '公益运动会·颁奖'].map(v => (
                  <View key={v} className="vid" onClick={() => Taro.showToast({ title: '演示视频（占位，真视频后续替换）', icon: 'none' })}>
                    <View className="vid-play"><Text className="vid-pi">▶</Text></View>
                    <Text className="vid-t">{v}</Text>
                  </View>
                ))}
              </View>
            </View>
            {isManager && has('proj') && (
              <View className="modcard">
                <Text className="mod-t">👦 实名受益台账（脱敏 · 一人一档）<Text className="permok"> · 已授权</Text></Text>
                {LEDGER.map(l => (
                  <View key={l.name} className="led"><Text className="led-n">{l.name}</Text><View className="led-r"><Text className="led-s">{l.school}</Text><Text className="led-i">{l.item} · {l.date}</Text></View></View>
                ))}
              </View>
            )}
            {isManager && !has('proj') && (
              <View className="lockcard" onClick={needAuth}><Text className="lock-t">🔒 实名受益台账等项目管理操作需「项目监管」授权 · 点此了解</Text></View>
            )}
          </View>
        )}
        {/* 我要申领（公众）——全流程可演示 */}
        {tab === 'apply' && (
          <View>
            <View className="modcard">
              <Text className="mod-t">📋 领用门槛与规定（申领前必读）</Text>
              <Text className="rule-r">👥 对象：面向乡村与社区 6–16 岁青少年，优先留守、困境、低保家庭子女</Text>
              <Text className="rule-r">🔄 流程：公开申请 → 村委 / 居委核实 → 基金会审核 → 公示无异议后发放</Text>
              <Text className="rule-r">🚫 红线：一人一档、按需发放、杜绝重复领取，全程留痕可追溯</Text>
              <Text className="rule-r">📢 公示：发放结果脱敏公示 ≥ 7 天，接受群众监督</Text>
            </View>
            <Text className="rule-r" style={{ margin: '4rpx 4rpx 12rpx' }}>📌 以下申领对象均由相应福利机构 / 基金会预先确定发布，方可申领</Text>
            {items.length === 0 && <View className="modcard"><Text className="mod-d">暂无可申领对象。待相应福利机构 / 基金会确定并发布后，此处才会显现可申领项。</Text></View>}
            {items.map(a => (
              <View key={a.id} className="aitem">
                <Text className="ai-name">{a.icon} {a.name}</Text>
                <View className="ai-row"><Text className="ai-k">机构</Text><Text className="ai-v">{a.org}</Text></View>
                <View className="ai-row"><Text className="ai-k">对象</Text><Text className="ai-v">{a.who}</Text></View>
                <View className="ai-row"><Text className="ai-k">条件</Text><Text className="ai-v">{a.cond}</Text></View>
                <View className="ai-row"><Text className="ai-k">限额</Text><Text className="ai-v">{a.limit}</Text></View>
                <View className="ai-row"><Text className="ai-k">材料</Text><Text className="ai-v">{a.docs}</Text></View>
                <View className="ai-btn" onClick={() => apply(a)}><Text className="ai-btn-t">符合条件 · 我要申领 ›</Text></View>
              </View>
            ))}
            {claims.length > 0 && (
              <View className="modcard">
                <Text className="mod-t">📄 我的申领（{claims.length}）</Text>
                {claims.map(c => (
                  <View key={c.id} className="myclaim">
                    <View className="mc-l"><Text className="mc-item">{c.item}</Text><Text className="mc-id">单号 {c.id} · {c.date}</Text></View>
                    <Text className={`cc-st ${stCls(c.status)}`}>{c.status}</Text>
                  </View>
                ))}
              </View>
            )}
            <View className="sup" onClick={supervise}><Text className="sup-t">🔍 我要监督 · 查资金 / 物资公示</Text></View>
          </View>
        )}
        {/* ❤️ 我要捐赠（定向：选机构 + 项目 + 受益对象，联动社会贡献值） */}
        {tab === 'donate' && (
          <View>
            <View className="modcard">
              <Text className="mod-t">❤️ 定向公益捐赠 · 专款专用可溯源</Text>
              <Text className="mod-d">定向捐赠（机构 → 项目 → 受益对象）：按算法折算社会贡献值（分段折算 × 类型 × 持续系数），须基金会到账开票确认后入账；开具带防伪验真码票据（可税前抵扣）；可选公开 / 匿名。</Text>
              <Text className="sel-l">① 捐给哪个机构</Text>
              <ScrollView scrollX className="chips">
                {certOrgs.map(o => (
                  <View key={o.id} className={`chip ${dOrg === o.name ? 'chip-on' : ''}`} onClick={() => pickOrg(o.name)}><Text className="chip-t">{o.icon} {o.name}</Text></View>
                ))}
              </ScrollView>
              <Text className="sel-l">② 支持哪个项目</Text>
              <ScrollView scrollX className="chips">
                {projList.map(p => (
                  <View key={p} className={`chip ${dProj === p ? 'chip-on' : ''}`} onClick={() => setDProj(p)}><Text className="chip-t">{p}</Text></View>
                ))}
              </ScrollView>
              <Text className="sel-l">③ 为谁捐赠（受益对象）</Text>
              <ScrollView scrollX className="chips">
                {BENE_OPTS.map(b => (<View key={b} className={`chip ${dBene === b ? 'chip-on' : ''}`} onClick={() => setDBene(b)}><Text className="chip-t">{b}</Text></View>))}
              </ScrollView>
              <Text className="sel-l">④ 捐赠类型</Text>
              <ScrollView scrollX className="chips">
                {(['资金', '实物'] as const).map(k => (<View key={k} className={`chip ${dKind === k ? 'chip-on' : ''}`} onClick={() => setDKind(k)}><Text className="chip-t">{k}捐赠{k === '实物' ? '（×1.1）' : ''}</Text></View>))}
              </ScrollView>
              <Text className="sel-l">⑤ 方式 · 公开选项</Text>
              <ScrollView scrollX className="chips">
                <View className={`chip ${dRecur ? 'chip-on' : ''}`} onClick={() => setDRecur(!dRecur)}><Text className="chip-t">{dRecur ? '✓ ' : ''}月捐 / 连续（×1.2）</Text></View>
                <View className={`chip ${!dAnon ? 'chip-on' : ''}`} onClick={() => setDAnon(false)}><Text className="chip-t">公开公布</Text></View>
                <View className={`chip ${dAnon ? 'chip-on' : ''}`} onClick={() => setDAnon(true)}><Text className="chip-t">匿名不公开</Text></View>
              </ScrollView>
              <Text className="sel-l">⑥ 捐赠金额（按算法折算 · 须开票确认后入账）</Text>
              <View className="damts">
                {[50, 100, 500, 1000].map(a => (<View key={a} className="damt" onClick={() => doDonate(a)}><Text className="damt-a">¥{a}</Text><Text className="damt-p">+{donationPoints(a, dKind, dRecur)} 贡献值</Text></View>))}
              </View>
              <Text className="sel-tip">当前：{dOrg || '—'} · {dProj || '—'} · 为{dBene} · {dKind}{dRecur ? '·月捐' : ''} · {dAnon ? '匿名' : '公开'}</Text>
            </View>
            <View className="modcard">
              <Text className="mod-t">🙏 爱心捐赠公示（定向可溯 · 阳光透明）</Text>
              {dons.map(d => (
                <View key={d.id} className="drow">
                  <View className="dr-l"><Text className="dr-who">{d.anonymous ? '爱心人士（匿名）' : d.who} <Text className={d.confirmed ? 'dtag-ok' : 'dtag-wait'}>{d.confirmed ? '已确认' : '待确认'}</Text></Text><Text className="dr-sub">→ {d.org} · {d.project} · 为{d.bene} · +{d.points} 分</Text><Text className="dr-rcpt" onClick={() => viewReceipt(d)}>🧾 票据 {d.receiptNo} · 🔒{d.verifyCode}</Text></View>
                  <Text className="don-amt">¥{d.amount}</Text>
                </View>
              ))}
              {DONORS.map(d => (
                <View key={d.name} className="drow"><View className="dr-l"><Text className="dr-who">{d.name}</Text><Text className="dr-sub">{d.type}</Text></View><Text className="don-amt">¥{d.amount}</Text></View>
              ))}
            </View>
          </View>
        )}
        {/* 🙋 志愿服务 / 志愿核实（社会贡献值精算） */}
        {tab === 'vol' && (
          <View>
            {!isManager && (
              <View className="modcard">
                <Text className="mod-t">🪪 志愿者认证（由相应福利机构审核认证）</Text>
                {myCertStatus === '已认证'
                  ? <Text className="cert-ok">✅ 你已通过志愿者认证 · 可报名参与公益服务</Text>
                  : myCertStatus === '待认证'
                    ? <Text className="cert-wait">⏳ 认证审核中 · 待福利机构核验（身份 / 职业技能 / 证书 / 单位证明 / 无犯罪证明）</Text>
                    : myCertStatus === '已驳回'
                      ? <View><Text className="cert-no">✕ 认证未通过 · 请补充材料后重新提交</Text><View className="ai-btn" onClick={applyCert}><Text className="ai-btn-t">🪪 重新提交认证 ›</Text></View></View>
                      : (<View>
                          <Text className="mod-d">参与公益服务须先认证，提交：① 身份证明 ② 职业技能 ③ 相关证书 ④ 所在单位证明 ⑤ 无犯罪记录证明。最终由相应福利机构审核认证。</Text>
                          <View className="ai-btn" onClick={applyCert}><Text className="ai-btn-t">🪪 提交志愿者认证申请 ›</Text></View>
                        </View>)}
              </View>
            )}
            {isManager && volCerts.filter(c => c.status === '待认证').length > 0 && (
              <View className="modcard">
                <Text className="mod-t">🪪 志愿者认证审核（福利机构核验 · 面向青少年从严）</Text>
                {volCerts.filter(c => c.status === '待认证').map(c => (
                  <View key={c.id} className="claimcard">
                    <View className="cc-top"><Text className="cc-item">{c.name}</Text><Text className="cc-st st-raise">待认证</Text></View>
                    <Text className="cc-meta">身份：{c.identity} · 职业技能：{c.skill}</Text>
                    <Text className="cc-meta">证书：{c.cert}</Text>
                    <Text className="cc-meta">单位证明：{c.unit} · 无犯罪证明：{c.noCrime ? '已核验 ✓' : '缺'}</Text>
                    <View className="cc-btns">
                      <View className="cc-pass" onClick={() => doReviewCert(c.id, true)}><Text className="cc-btn-t">✓ 核验通过 · 予以认证</Text></View>
                      <View className="cc-reject" onClick={() => doReviewCert(c.id, false)}><Text className="cc-btn-t2">✕ 驳回</Text></View>
                    </View>
                  </View>
                ))}
              </View>
            )}
            {!isManager && (<>
              <View className="modcard">
                <Text className="mod-t">🌟 志愿者分级（有效贡献值定级 · 不进则退 · 门槛 ≥ {VOL_APPLY_MIN} 分）</Text>
                <View className="mylv">
                  {myLevel
                    ? <View>
                        <Text className="mylv-t">你当前：{'★'.repeat(myLevel.star)} {myLevel.title} · 商城兑换 {myLevel.bonus < 1 ? (myLevel.bonus * 10).toFixed(1) + '折' : '原价'}{nextLevel ? ` · 距「${nextLevel.title}」还差 ${nextLevel.min - activePoints} 分` : ' · 已达最高级'}</Text>
                        <Text className="mylv-s">累计 {myPoints} 分（终身荣誉）· 有效 {activePoints} 分（近12月·定级）· 已过期 {expired} 分</Text>
                        <Text className="mylv-warn">⏳ 90 天内将过期 {expiring} 分 · 年度保级线：{myLevel.keep} · 请持续参与维持</Text>
                      </View>
                    : <Text className="mylv-t mylv-no">你当前有效值 {activePoints} 分 · 未达志愿者门槛（有效值 ≥ {VOL_APPLY_MIN} 分方可申请）</Text>}
                </View>
                {myLevel && myCertStatus === '已认证' && (
                  <View className="chgrow">
                    <View className="chg-b" onClick={showVolCertificate}><Text className="chg-t">🎖 荣誉证书（有效期1年）</Text></View>
                    <View className="chg-b" onClick={showAppointment}><Text className="chg-t">📜 电子聘书（任期1年）</Text></View>
                  </View>
                )}
                {VOL_LEVELS.map(l => (
                  <View key={l.star} className={`lvline ${myLevel && myLevel.star === l.star ? 'lvline-on' : ''}`}>
                    <Text className="lvline-s">{'★'.repeat(l.star)}</Text>
                    <View className="lvline-m"><Text className="lvline-t">{l.title}（≥{l.min}）</Text><Text className="lvline-d">{l.right} · 商城{l.bonus < 1 ? (l.bonus * 10).toFixed(1) + '折' : '原价'} · 保级：{l.keep}</Text></View>
                  </View>
                ))}
              </View>
              <View className="modcard">
                <Text className="mod-t">♻️ 星级维持 · 更迭推新制度（不可一劳永逸）</Text>
                <Text className="rule-r">📅 制度：社会贡献值保质期 12 个月；分「累计值（终身荣誉）」与「有效值（近12月·定级）」，老贡献自然过期滚出。</Text>
                <Text className="rule-r">📏 标准：星级按有效值动态评定，各级另设年度保级线（见上表）；证书 / 聘书均设期限。</Text>
                <Text className="rule-r">🧮 算法：有效值 = 近12月未过期贡献值之和；星级 = 有效值达标的最高级；有效值下降即自动降级。</Text>
                <Text className="rule-r">🔁 流程：实时滚动更新 → 动态调级；年度复核；临过期 / 临降级预警 + 30 天宽限期；宽限满不达标降级。</Text>
                <Text className="rule-r">🎖 证书任期：荣誉证书有效期 1 年到期重核；岗位聘书任期 1 年到期续聘 / 解聘；降级或考核不达标自动失效。</Text>
              </View>
            </>)}
            <View className="modcard">
              <Text className="mod-t">🧮 志愿服务 · 社会贡献值精算规则</Text>
              <Text className="rule-r">⏱ 时基：每 1 小时 = 10 分</Text>
              <Text className="rule-r">🎯 类型系数：专业服务 ×2.0 · 组织协调 ×1.5 · 一般参与 ×1.0 · 后勤 ×0.8</Text>
              <Text className="rule-r">📈 成效加成：受益 ≥100 人 +40% · 50–99 人 +20%</Text>
              <Text className="rule-r">✅ 核实必需：签到 + 照片 / 视频 + 受益人评价 + 机构确认（缺一不计）</Text>
              <Text className="rule-r">🚫 封顶防刷：单日 ≤8 小时计分 · 单月 ≤100 小时</Text>
            </View>
            {!isManager && VOL_POSTS.map(p => {
              const need = VOL_TYPE_MINSTAR[p.type] || 1;
              const ok = !!myLevel && myLevel.star >= need;
              return (
                <View key={p.id} className="aitem">
                  <Text className="ai-name">🙋 {p.title}</Text>
                  <View className="ai-row"><Text className="ai-k">机构</Text><Text className="ai-v">{p.org}</Text></View>
                  <View className="ai-row"><Text className="ai-k">岗位</Text><Text className="ai-v">{p.type}（系数 ×{VOL_TYPE_COEF[p.type]}）· {p.hours}h · 受益约 {p.benefit} 人 · 招 {p.need} 人</Text></View>
                  <View className="ai-row"><Text className="ai-k">准入</Text><Text className="ai-v">需 {'★'.repeat(need)} {VOL_LEVELS.find(l => l.star === need)?.title} 及以上{ok ? '（你已达标 ✓）' : ''}</Text></View>
                  <View className="ai-row"><Text className="ai-k">预估</Text><Text className="ai-v">完成并核实后约 +{calcVolPoints(p.hours, p.type, p.benefit)} 社会贡献值</Text></View>
                  <View className={`ai-btn ${ok ? '' : 'ai-btn-lock'}`} onClick={() => doSignVol(p)}><Text className="ai-btn-t">{ok ? '报名参与 ›' : '🔒 等级不足 · 查看要求'}</Text></View>
                </View>
              );
            })}
            {vols.length > 0 && (
              <View className="modcard">
                <Text className="mod-t">{isManager ? '🧾 志愿服务核实（核实后按精算入账贡献值）' : '📄 我的志愿记录'}</Text>
                {vols.map(v => (
                  <View key={v.id} className="claimcard">
                    <View className="cc-top"><Text className="cc-item">{v.post}</Text><Text className={`cc-st ${v.verified ? 'st-done' : 'st-raise'}`}>{v.verified ? '已核实 +' + v.points : '待核实'}</Text></View>
                    <Text className="cc-meta">{v.name} · {v.type} · {v.hours}h · 受益 {v.benefit} 人 · 精算 {v.points} 分</Text>
                    {isManager && !v.verified && (
                      <View className="cc-btns"><View className="cc-pass" onClick={() => doVerifyVol(v.id)}><Text className="cc-btn-t">✓ 核实通过 · 贡献值入账</Text></View></View>
                    )}
                  </View>
                ))}
              </View>
            )}
            {isManager && vols.length === 0 && (
              <View className="modcard"><Text className="mod-d">🙋 暂无待核实的志愿记录</Text></View>
            )}
          </View>
        )}
        {/* ③ 资金审计 / 资金公示 */}
        {tab === 'fund' && (
          <View>
            {isManager && has('fund') && (
              <View className="modcard">
                <Text className="mod-t">💳 资金闭环 · 限定性资金专属账套<Text className="permok"> · 已授权</Text></Text>
                <View className="flow">{FUND_FLOW.map((f, i) => (<Text key={f} className="flow-i">{f}{i < FUND_FLOW.length - 1 ? ' → ' : ''}</Text>))}</View>
                <Text className="mod-d">自动区分公益直接支出 / 管理分摊费用；触 10% 红线自动锁单禁付；自动生成民非标准财务报表、无形资产摊销、固定资产折旧台账。</Text>
              </View>
            )}
            {isManager && has('fund') && dons.filter(d => !d.confirmed).length > 0 && (
              <View className="modcard">
                <Text className="mod-t">🧾 捐赠到账核对 · 开票确认（确认后贡献值入账）</Text>
                {dons.filter(d => !d.confirmed).map(d => (
                  <View key={d.id} className="claimcard">
                    <View className="cc-top"><Text className="cc-item">{d.anonymous ? '爱心人士（匿名）' : d.who} · ¥{d.amount}</Text><Text className="cc-st st-raise">待确认</Text></View>
                    <Text className="cc-meta">{d.kind}{d.recurring ? '·月捐' : ''} → {d.project} · 为{d.bene} · 拟入账 +{d.points} 分 · 票据 {d.receiptNo}</Text>
                    <View className="cc-btns"><View className="cc-pass" onClick={() => confirmDonate(d.id)}><Text className="cc-btn-t">✓ 到账核对 · 开票确认</Text></View></View>
                  </View>
                ))}
              </View>
            )}
            <View className="fundcard">
              <Text className="fc-t">💰 1000 万专项资金 · 分项执行{isManager && has('fund') ? '（审计视图）' : '（公开公示）'}</Text>
              {FUND.map(f => (
                <View key={f.name} className="f-item">
                  <View className="f-l"><Text className="f-n">{f.name}</Text><Text className="f-note">{f.note}</Text></View>
                  <Text className="f-num">¥{f.used} / {f.budget} 万</Text>
                </View>
              ))}
              <View className="fc-row"><Text>管理费占比</Text><Text className="fc-ok">{mgmtPct}% · 系统锁定 ≤10% ✓</Text></View>
            </View>
            {isManager && has('fund')
              ? <View className="sup" onClick={() => Taro.showToast({ title: '审计底稿已生成（演示）', icon: 'success' })}><Text className="sup-t">🔍 导出专项审计底稿</Text></View>
              : isManager
                ? <View className="lockcard" onClick={needAuth}><Text className="lock-t">🔒 导出审计底稿需「资金审计」授权 · 点此了解</Text></View>
                : <View className="sup" onClick={supervise}><Text className="sup-t">🔍 发现问题 · 一键反馈监督</Text></View>}
          </View>
        )}
        {/* ④ 物资溯源 / 物资查询（点开看完整溯源链：时间·经手人·事件） */}
        {tab === 'mat' && (
          <View>
            <View className="apply-tip"><Text className="apply-tip-t">📦 每件器材唯一溯源编码 · 一物一档 · 采购 → 入库 → 调拨 → 发放 → 领取全链可查 · 点卡片看完整溯源链</Text></View>
            {isManager && has('mat') && <View className="permbar"><Text className="permbar-t">🛡 已授权「物资管理」：可登记采购入库、调拨发放（演示）</Text></View>}
            {MATERIALS.map(m => (
              <View key={m.code} className="mcard" onClick={() => setOpenMat(openMat === m.code ? '' : m.code)}>
                <View className="m-top"><Text className="m-name">{m.name} ×{m.qty}</Text><Text className="m-date">{m.date}</Text></View>
                <Text className="m-code">🔖 {m.code} · 供应商 {m.supplier}</Text>
                <Text className="m-to">→ 发放至 {m.to}</Text>
                <Text className="m-more">{openMat === m.code ? '收起溯源链 ▲' : '查看完整溯源链（时间 · 经手人 · 事件）▼'}</Text>
                {openMat === m.code && (
                  <View className="trace">
                    {m.trace.map((t, i) => (
                      <View key={i} className={`tr-step ${i === m.trace.length - 1 ? 'tr-last' : ''}`}>
                        <View className="tr-dot" />
                        <View className="tr-body">
                          <Text className="tr-time">{t.time}</Text>
                          <Text className="tr-who">{t.who}</Text>
                          <Text className="tr-event">{t.event}</Text>
                        </View>
                      </View>
                    ))}
                    <Text className="tr-chain">🔗 以上每一步均上链存证，不可篡改；审计可凭编码反向追溯资金流向</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
        {/* ✅ 申领审核（授权审核员：受理 → 通过发放 / 驳回） */}
        {tab === 'audit' && (
          <View>
            <View className="apply-tip"><Text className="apply-tip-t">✅ 受理群众申领 · 村 / 社区核实 → 审核发放 → 脱敏公示；每笔留痕可追溯</Text></View>
            <View className="modcard">
              <Text className="mod-t">📢 发布申领对象（机构预先确定 · 已发布 {items.length} 项）</Text>
              <Text className="mod-d">由福利机构 / 基金会确定申领对象后发布，群众端「我要申领」才显现并可申领。</Text>
              {items.map(it => (
                <View key={it.id} className="f-item"><View className="f-l"><Text className="f-n">{it.icon} {it.name}</Text><Text className="f-note">{it.who} · {it.limit}</Text></View><Text className="p-report" onClick={() => unpublishItem(it.id)}>下架</Text></View>
              ))}
              <View className="ai-btn" style={{ marginTop: '14rpx' }} onClick={publishItem}><Text className="ai-btn-t">＋ 发布新申领对象 ›</Text></View>
            </View>
            {claims.length === 0 && <View className="modcard"><Text className="mod-d">暂无申领单。切到「我要申领」提交一笔，这里即可审核（演示全流程）。</Text></View>}
            {claims.map(c => (
              <View key={c.id} className="claimcard">
                <View className="cc-top"><Text className="cc-item">{c.item}</Text><Text className={`cc-st ${stCls(c.status)}`}>{c.status}</Text></View>
                <Text className="cc-meta">单号 {c.id} · 申请人 {c.applicant} · {c.date}</Text>
                {c.status === '待审核' && (
                  <View className="cc-btns">
                    <View className="cc-pass" onClick={() => doReview(c.id, true)}><Text className="cc-btn-t">✓ 审核通过并发放</Text></View>
                    <View className="cc-reject" onClick={() => doReview(c.id, false)}><Text className="cc-btn-t2">✕ 驳回</Text></View>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
        {/* ⑤ 公开监督 / 信息公开 */}
        {tab === 'open' && (
          <View>
            <View className="modcard">
              <Text className="mod-t">📂 全流程可溯 · 分级查阅（结果公开 · 明细授权 · 取证法定）</Text>
              <View className="tier" onClick={() => Taro.showModal({ title: '👁 公众 · 结果公开', content: '人人可见「结果」：谁发起、谁受益、成效数字、资金与物资公示。可查可监督，但不含全流程明细。', showCancel: false })}><Text className="tier-i">👁</Text><View className="tier-m"><Text className="tier-t">公众 · 结果人人可见</Text><Text className="tier-d">发起人 / 受益人结果、成效与资金物资公示</Text></View><Text className="tier-a">可看</Text></View>
              <View className="tier" onClick={() => Taro.showModal({ title: '🛡 授权管理层 · 全流程明细', content: '经平台 / 机构授权后，可查全流程明细：申报书、审批记录、资金流水、物资溯源、受益档案。【可看不可取】——禁止导出、复制、下载，页面带操作留痕与水印，越权即锁。', showCancel: false })}><Text className="tier-i">🛡</Text><View className="tier-m"><Text className="tier-t">授权管理层 · 全流程明细</Text><Text className="tier-d">申报 / 审批 / 资金 / 物资 / 受益档案 · 可看不可取</Text></View><Text className="tier-a">授权可查</Text></View>
              <View className="tier" onClick={() => Taro.showModal({ title: '⚖️ 法律 / 监察部门 · 调查取证', content: '仅司法 / 监察 / 审计等法定部门，凭法律程序专门授权，方可「调查取证」：导出带电子签章的完整证据链。全程留痕、责任到人。其他任何角色一律可看不可取。', showCancel: false })}><Text className="tier-i">⚖️</Text><View className="tier-m"><Text className="tier-t">法律 / 监察部门 · 调查取证</Text><Text className="tier-d">唯一可导出带签章证据链 · 法定授权 · 全程留痕</Text></View><Text className="tier-a tier-law">仅可取证</Text></View>
            </View>
            <View className="modcard">
              <Text className="mod-t">🏗️ 授权与审批层级（逐级授权 · 分级审核 · 集中审批）</Text>
              <View className="lvl"><Text className="lvl-n">1</Text><View className="lvl-m"><Text className="lvl-t">平台运营</Text><Text className="lvl-d">审核机构入驻资质 · 授权「公益机构管理员」</Text></View></View>
              <View className="lvl"><Text className="lvl-n">2</Text><View className="lvl-m"><Text className="lvl-t">公益机构管理员</Text><Text className="lvl-d">逐级授权到各福利机构 / 基金会项目板块</Text></View></View>
              <View className="lvl"><Text className="lvl-n">3</Text><View className="lvl-m"><Text className="lvl-t">各福利机构 / 基金会 · 项目板块</Text><Text className="lvl-d">分别开展工作，机构内分级审核 + 集中审批</Text></View></View>
              <View className="lvl lvl-sub"><Text className="lvl-n2">↳</Text><View className="lvl-m"><Text className="lvl-t2">机构内：初审专员 → 复审 → 集中审批（理事会终批）</Text></View></View>
            </View>
            <View className="modcard">
              <Text className="mod-t">🧭 角色责权利（相互制衡 · 对等平衡）</Text>
              {ROLES_RZL.map(r => (
                <View key={r.role} className="rzl">
                  <Text className="rzl-r">{r.role}</Text>
                  <View className="rzl-m">
                    <View className="rzl-l"><Text className="rzl-k rzl-z">责</Text><Text className="rzl-v">{r.duty}</Text></View>
                    <View className="rzl-l"><Text className="rzl-k rzl-q">权</Text><Text className="rzl-v">{r.power}</Text></View>
                    <View className="rzl-l"><Text className="rzl-k rzl-y">利</Text><Text className="rzl-v">{r.benefit}</Text></View>
                  </View>
                </View>
              ))}
              <Text className="mod-d" style={{ marginTop: '10rpx' }}>⚖️ 平衡逻辑：申报≠立项≠督查≠授权（权力分立），群众全程监督，捐赠得利也受公示约束——责权利对等制衡。</Text>
            </View>
            <View className="modcard">
              <Text className="mod-t">🗺️ 公益全国分布（受益青少年）</Text>
              {REGIONS.map(r => (
                <View key={r.name} className="reg"><Text className="reg-n">{r.name}</Text><Text className="reg-v">{r.n} 人</Text></View>
              ))}
            </View>
            <View className="modcard">
              <Text className="mod-t">🙏 爱心捐赠公示（阳光透明 · 可查可溯）</Text>
              {DONORS.map((d, i) => (
                <View key={d.name} className="don">
                  <Text className={`don-rk ${i < 3 ? 'don-top' : ''}`}>{i + 1}</Text>
                  <View className="don-m"><Text className="don-n">{d.name}</Text><Text className="don-ty">{d.type}</Text></View>
                  <Text className="don-amt">¥{d.amount}</Text>
                </View>
              ))}
            </View>
            <View className="modcard">
              <Text className="mod-t">📢 信息公开 · 对接慈善中国</Text>
              <Text className="mod-d">专项资金使用明细、管理成本占比、年度公益成效脱敏公示，同步对接「慈善中国」信息公开要求，村民 / 居民可在线查询、全程监督。</Text>
            </View>
            <View className="modcard">
              <Text className="mod-t">🚩 党建联建支撑（配套接口 · 轻量化）</Text>
              <Text className="mod-d">党组织入驻台账、党员志愿者注册派单、公益服务时长统计、党群阵地预约登记，复用平台原有党建底层，无独立大额开发投入。</Text>
            </View>
            <View className="modcard">
              <Text className="mod-t">⏱️ 志愿者服务时长榜（党员先锋 · 公益计时）</Text>
              {VOLUNTEERS.map((v, i) => (
                <View key={v.name} className="vol">
                  <Text className={`vol-rk ${i < 3 ? 'vol-top' : ''}`}>{i + 1}</Text>
                  <View className="vol-m"><Text className="vol-n">{v.name}</Text><Text className="vol-o">{v.org}</Text></View>
                  <Text className="vol-h">{v.hours} h</Text>
                </View>
              ))}
            </View>
            <View className="sup" onClick={supervise}><Text className="sup-t">🔍 我要监督 · 一键反馈问题线索</Text></View>
          </View>
        )}
        <View style={{ height: '40rpx' }} />
      </ScrollView>
    </View>
  );
}
