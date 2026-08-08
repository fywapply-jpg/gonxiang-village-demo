import Taro, { useRouter } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

interface Svc { name: string; desc: string; }
interface Feature {
  title: string; icon: string; color: string; slogan: string;
  intro: string; services: Svc[]; party: string; contrib: string;
}

// 便民蓝 #2563eb / 兴农绿 #16a34a / 治理橙 #ea580c / 乡风紫 #9333ea
const FEATURE_CONTENT: Record<string, Feature> = {
  pay: {
    title: '生活缴费', icon: '💡', color: '#2563eb', slogan: '供享普惠 · 党建便民',
    intro: '水电燃气、宽带话费、有线电视等日常费用一站缴纳，不出村、不跑腿，老人也能轻松办。',
    services: [
      { name: '水费电费', desc: '对接供水供电，实时到账' },
      { name: '燃气宽带', desc: '燃气、宽带、话费充值' },
      { name: '代缴代办', desc: '为老人、外出务工户代缴' },
      { name: '缴费记录', desc: '历史账单链上留痕可查' },
    ],
    party: '党员志愿者驻点帮办，确保孤寡老人、留守家庭缴费不漏一户。',
    contrib: '为邻里代缴、协助缴费可计入「乡风贡献 · 邻里互助」。',
  },
  express: {
    title: '快递物流', icon: '📦', color: '#2563eb', slogan: '供享普惠 · 党建便民',
    intro: '村级寄递服务站，快递进村到户、农产品出村上行，打通快递“最后一公里”。',
    services: [
      { name: '代收代寄', desc: '各大快递统一收寄' },
      { name: '上门取件', desc: '行动不便户预约上门' },
      { name: '农货上行', desc: '农产品打包发货进城' },
      { name: '物流追踪', desc: '订单全程可视化追踪' },
    ],
    party: '党支部领办驿站，公益性收费，让利于民。',
    contrib: '志愿分拣、帮邻派送可计入「治理贡献 · 志愿值守」。',
  },
  sales: {
    title: '产销对接', icon: '🚚', color: '#16a34a', slogan: '供建共富 · 党建兴农',
    intro: '把村里好物直连城市餐桌，订单农业、直播带货、社区团购多渠道并行，卖得出、卖得好。',
    services: [
      { name: '订单农业', desc: '以销定产，签约保价收购' },
      { name: '直播带货', desc: '村播基地直播助农' },
      { name: '社区团购', desc: '对接城市社区团长' },
      { name: '品牌包装', desc: '统一品牌、溯源认证' },
    ],
    party: '党员先锋带头跑市场、签订单，把销路带回村。',
    contrib: '助销帮扶、带动产销可计入「立业贡献 · 产业带富」。',
  },
  'agri-material': {
    title: '农资农机', icon: '🚜', color: '#16a34a', slogan: '供建共富 · 党建兴农',
    intro: '种子化肥农药集采集配，农机共享租赁，降成本、提效率。',
    services: [
      { name: '农资集采', desc: '团购议价，正品直供' },
      { name: '农机租赁', desc: '旋耕、收割按需租用' },
      { name: '农机手预约', desc: '跨村作业统一调度' },
      { name: '统防统治', desc: '无人机植保统一作业' },
    ],
    party: '党支部牵头团购议价，杜绝假冒伪劣农资坑农。',
    contrib: '共享农机、帮邻作业可计入「立业贡献 · 合作帮扶」。',
  },
  'agri-tech': {
    title: '农技指导', icon: '📚', color: '#16a34a', slogan: '供建共富 · 党建兴农',
    intro: '农技专家、“田秀才”在线答疑，科技特派员下沉到田间地头。',
    services: [
      { name: '在线问诊', desc: '拍照问诊、专家答疑' },
      { name: '专家坐诊', desc: '定期下乡现场指导' },
      { name: '技术课堂', desc: '种养技术视频课' },
      { name: '病虫预警', desc: '气象与病虫害预警' },
    ],
    party: '党员科技特派员结对帮带，把论文写在大地上。',
    contrib: '传授技术、带徒帮农可计入「银龄贡献 · 经验传授」。',
  },
  property: {
    title: '产权交易', icon: '📄', color: '#16a34a', slogan: '供建共富 · 党建兴农',
    intro: '土地经营权、宅基地、集体资产阳光流转，规范交易、保障权益。',
    services: [
      { name: '土地流转', desc: '经营权挂牌流转' },
      { name: '资产挂牌', desc: '集体资产公开交易' },
      { name: '产权登记', desc: '确权登记、信息归集' },
      { name: '合同鉴证', desc: '交易合同在线鉴证' },
    ],
    party: '村务监督委员会全程监督，“三资”公开透明。',
    contrib: '参与集体资产监督可计入「治理贡献 · 村务议事」。',
  },
  finance: {
    title: '助农金融', icon: '💰', color: '#16a34a', slogan: '供建共富 · 党建兴农',
    intro: '整村授信、惠农贷款、农业保险，为创业兴农引入金融活水。',
    services: [
      { name: '整村授信', desc: '党员信用户优先授信' },
      { name: '惠农贷款', desc: '低息创业、经营贷款' },
      { name: '农业保险', desc: '种养保险、防灾减损' },
      { name: '反诈课堂', desc: '防范金融诈骗宣传' },
    ],
    party: '“党建 + 金融”，党员信用户带头守信履约。',
    contrib: '诚信履约、带动就业可计入「立业贡献 · 就业创收」。',
  },
  tourism: {
    title: '文旅休闲', icon: '🏞️', color: '#16a34a', slogan: '供建共富 · 党建兴农',
    intro: '依托仰韶文化、地坑院与乡村风光，发展民宿、采摘、研学旅游。',
    services: [
      { name: '乡村民宿', desc: '特色民宿预订' },
      { name: '果园采摘', desc: '当季采摘体验' },
      { name: '研学旅游', desc: '农耕文化研学' },
      { name: '农事体验', desc: '春耕秋收沉浸体验' },
    ],
    party: '党支部统筹村集体文旅运营，收益反哺集体。',
    contrib: '参与文旅服务、讲解可计入「乡风贡献 · 非遗传承」。',
  },
  care: {
    title: '一老一小', icon: '👵', color: '#9333ea', slogan: '供享新风 · 党建铸魂',
    intro: '聚焦养老与儿童关爱：日间照料、爱心助餐、四点半课堂、留守关怀。',
    services: [
      { name: '日间照料', desc: '老人日间照护服务' },
      { name: '爱心助餐', desc: '长者食堂助餐配餐' },
      { name: '四点半课堂', desc: '课后托管与辅导' },
      { name: '留守关爱', desc: '留守儿童老人探访' },
    ],
    party: '党员包户结对，定期探访独居老人与留守儿童。',
    contrib: '照护陪伴、值守课堂可计入「银龄贡献 / 成长贡献」。',
  },
  legal: {
    title: '法务调解', icon: '⚖️', color: '#9333ea', slogan: '供享新风 · 党建铸魂',
    intro: '法律咨询、矛盾调解、普法宣传，小事不出村、矛盾不上交。',
    services: [
      { name: '法律咨询', desc: '在线法律咨询答疑' },
      { name: '纠纷调解', desc: '邻里矛盾就地调解' },
      { name: '普法课堂', desc: '以案释法、法治宣传' },
      { name: '法律援助', desc: '困难群众法律援助' },
    ],
    party: '党员调解员 + 乡贤理事会联合调解。',
    contrib: '参与调解、普法可计入「治理贡献 · 建言献策」。',
  },
  school: {
    title: '技能学堂', icon: '🎓', color: '#9333ea', slogan: '供享新风 · 党建铸魂',
    intro: '农民夜校、技能培训、就业指导，富口袋更富脑袋。',
    services: [
      { name: '农民夜校', desc: '党的政策与农技夜校' },
      { name: '技能培训', desc: '电商、烹饪、家政培训' },
      { name: '就业指导', desc: '岗位推荐与求职辅导' },
      { name: '创业辅导', desc: '返乡创业一对一辅导' },
    ],
    party: '党支部办学，党员讲师义务授课。',
    contrib: '授课、学习成长可计入「成长贡献 · 技能学习」。',
  },
  heritage: {
    title: '非遗文化', icon: '🏮', color: '#9333ea', slogan: '供享新风 · 党建铸魂',
    intro: '挖掘保护剪纸、捶草印花、地坑院营造等非遗，让乡土文化活起来。',
    services: [
      { name: '非遗名录', desc: '本地非遗项目展示' },
      { name: '传承人', desc: '非遗传承人风采' },
      { name: '技艺展演', desc: '节庆技艺展演活动' },
      { name: '研学体验', desc: '非遗工坊研学体验' },
    ],
    party: '党支部牵头建设非遗传承基地。',
    contrib: '传习技艺、参与展演可计入「乡风贡献 · 非遗传承」。',
  },
  civility: {
    title: '文明乡风', icon: '🌸', color: '#9333ea', slogan: '供享新风 · 党建铸魂',
    intro: '积分制、红黑榜、星级文明户，以文明实践积分激励向上向善。',
    services: [
      { name: '文明积分', desc: '善行义举积分激励' },
      { name: '红黑榜', desc: '正反典型公开亮榜' },
      { name: '星级文明户', desc: '星级文明家庭评定' },
      { name: '移风易俗', desc: '抵制高价彩礼、铺张' },
    ],
    party: '党员带头签订村规民约，示范文明新风。',
    contrib: '文明践行、移风易俗可计入「乡风贡献 · 文明践行」。',
  },
  safety: {
    title: '平安综治', icon: '🛡️', color: '#ea580c', slogan: '供管共治 · 党建强基',
    intro: '网格化治理、矛盾排查、技防联防，守护一方平安。',
    services: [
      { name: '网格巡防', desc: '党员中心户任网格员' },
      { name: '矛盾排查', desc: '隐患早发现早化解' },
      { name: '视频联防', desc: '雪亮工程技防联防' },
      { name: '应急响应', desc: '防汛防火应急联动' },
    ],
    party: '党员中心户任网格员，联防联控守平安。',
    contrib: '志愿巡逻、隐患上报可计入「治理贡献 · 志愿值守」。',
  },
  wuye: {
    title: '物业报修', icon: '🔧', color: '#2563eb', slogan: '供享普惠 · 党建便民',
    intro: '社区物业一站式报修与缴费：房屋维修、公共设施、电梯管道，居民线上报单、居委会督办、物业限时响应。',
    services: [
      { name: '在线报修', desc: '拍照报单，物业限时上门' },
      { name: '物业缴费', desc: '物业费、停车费在线缴纳' },
      { name: '公共设施', desc: '电梯 / 路灯 / 管道报障' },
      { name: '投诉建议', desc: '居委会督办、结果反馈' },
    ],
    party: '党员楼栋长包联到户，督促物业限时办结、回访满意度。',
    contrib: '楼栋志愿、协助报修可计入「治理贡献 · 志愿值守」。',
  },
  jiazheng: {
    title: '家政服务', icon: '🧹', color: '#2563eb', slogan: '供享普惠 · 党建便民',
    intro: '社区就近家政服务：保洁、月嫂育儿、养老陪护、维修安装，居委会把关资质，居民就近放心下单。',
    services: [
      { name: '家庭保洁', desc: '日常保洁、开荒深度清洁' },
      { name: '月嫂育儿', desc: '持证月嫂、育婴师' },
      { name: '养老陪护', desc: '居家养老陪护照料' },
      { name: '维修安装', desc: '水电、家电维修安装' },
    ],
    party: '居委会把关家政资质，优先录用本社区困难居民、党员创业户。',
    contrib: '家政帮扶、邻里互助可计入「乡风贡献 · 邻里互助」。',
  },
};

export default function FeaturePage() {
  const router = useRouter();
  const key = router.params.key || '';
  const f = FEATURE_CONTENT[key];

  if (!f) {
    return (
      <View className="page">
        <View className="empty">
          <Text style={{ fontSize: '96rpx', display: 'block' }}>🚧</Text>
          <Text className="empty-text">该板块正在建设中，敬请期待</Text>
          {key ? <Text style={{ display: 'block', fontSize: '22rpx', color: '#c0c4cc', marginTop: '10rpx' }}>板块标识：{key}</Text> : null}
          <View style={{ display: 'flex', gap: '20rpx', justifyContent: 'center', marginTop: '48rpx' }}>
            <View className="cta" style={{ background: '#e5e7eb', padding: '22rpx 40rpx', margin: 0 }} onClick={() => Taro.navigateBack().catch(() => Taro.reLaunch({ url: '/pages/index/index' }))}>
              <Text className="cta-text" style={{ color: '#374151' }}>返回上一页</Text>
            </View>
            <View className="cta" style={{ background: '#2563eb', padding: '22rpx 40rpx', margin: 0 }} onClick={() => Taro.reLaunch({ url: '/pages/index/index' })}>
              <Text className="cta-text">返回首页</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  const consult = () => Taro.showModal({
    title: f.title,
    content: `「${f.title}」正在本${store.orgLabel()}试点上线，可咨询${store.adminLabel()}或党群服务中心预约办理。`,
    showCancel: false,
  });

  return (
    <View className="page">
      <View className="hero" style={{ background: f.color }}>
        <Text className="hero-icon">{f.icon}</Text>
        <Text className="hero-title">{f.title}</Text>
        <Text className="hero-slogan">{f.slogan}</Text>
      </View>
      <ScrollView scrollY className="body">
        <View className="wrap">
          <View className="card">
            <Text className="card-title">功能定位</Text>
            <Text className="intro">{f.intro}</Text>
          </View>

          <Text className="sec">服务内容</Text>
          <View className="card svc-card">
            {f.services.map(s => (
              <View key={s.name} className="svc-row">
                <View className="svc-dot" style={{ background: f.color }} />
                <View className="svc-info">
                  <Text className="svc-name">{s.name}</Text>
                  <Text className="svc-desc">{s.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <View className="card">
            <Text className="tag tag-red">🚩 党建引领</Text>
            <Text className="card-text">{f.party}</Text>
          </View>

          <View className="card">
            <Text className="tag tag-org">⭐ 贡献联动</Text>
            <Text className="card-text">{f.contrib}</Text>
          </View>

          <View className="cta" style={{ background: f.color }} onClick={consult}>
            <Text className="cta-text">咨询 / 办理</Text>
          </View>
          <View style={{ height: '40rpx' }} />
        </View>
      </ScrollView>
    </View>
  );
}
