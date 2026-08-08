import { useState } from 'react';
import Taro, { useDidShow } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { store } from '../../store';
import './index.css';

interface Svc {
  id: number;
  emoji: string;
  name: string;
  desc: string;
  badge?: string;      // 「60岁以上免费」「公益免费」等标签
  action: string;      // 底部按钮文案：申请 / 预约 / 办理
  points: string[];    // 服务详情要点
}

// 乡村版（村民 / 村委会运营）
const RURAL_SENIOR: Svc[] = [
  { id: 11, emoji: '🍚', name: '助餐送餐（村级养老助餐点）', desc: '村养老助餐点每日供餐，行动不便可送餐上门，60 岁以上就餐优惠', badge: '60 岁以上优惠', action: '预约就餐', points: ['村级养老助餐点每日中午供应热饭热菜', '60 岁以上老人就餐享优惠价，特困老人免费', '行动不便、独居老人由党员志愿者送餐上门', '按需登记，工作人员上门核实用餐需求'] },
  { id: 12, emoji: '🏠', name: '日间照料（幸福院）', desc: '村幸福院日间托养，白天有人照看、有饭吃、有伴聊', action: '申请托养', points: ['村幸福院白天照料，午休、休闲、就餐一体', '专人照看，子女外出务工也放心', '棋牌、读报、聊天，不再一个人闷在家', '登记后由村委安排入院时间'] },
  { id: 13, emoji: '🛁', name: '上门照护（助浴 / 助医）', desc: '为高龄、失能老人提供上门助浴、助医、代购代办', badge: '困难老人免费', action: '申请上门', points: ['上门助浴、助洁，解决高龄老人洗澡难', '陪同就医、代取药品、代购生活用品', '失能、特困、独居老人公益优先，可免费', '党员包户结对，一户一档，不漏一户'] },
  { id: 14, emoji: '📄', name: '高龄津贴办理', desc: '80 岁以上高龄津贴申报，村干部上门帮办，不用来回跑', badge: '免费帮办', action: '申请帮办', points: ['80 岁以上老人高龄津贴代为申报', '村干部上门收集材料，足不出户办成事', '定期复核、按时发放，进度可查', '不识字、行动不便的老人重点帮办'] },
  { id: 15, emoji: '❤️', name: '健康监测', desc: '定期为老人量血压、测血糖，建健康档案，异常有提醒', badge: '公益免费', action: '预约体检', points: ['村卫生室定期量血压、测血糖', '为65 岁以上老人建立健康档案', '慢病随访、用药提醒，家人同步知情', '数据异常第一时间通知子女和村医'] },
  { id: 16, emoji: '🎶', name: '老年文体', desc: '广场舞、戏曲、书画、门球等文体活动，老有所乐', action: '报名参加', points: ['广场舞、豫剧、书画、门球等常态活动', '农闲时节组织文艺汇演、健康讲座', '老年协会牵头，就近就便参与', '丰富精神生活，老有所乐、老有所为'] },
];

// 乡村版 · 儿童
const RURAL_CHILD: Svc[] = [
  { id: 21, emoji: '📚', name: '课后托管（四点半课堂）', desc: '放学后有人管、有人辅导作业，留守儿童之家免费开放', badge: '公益免费', action: '报名托管', points: ['留守儿童之家「四点半课堂」免费开放', '大学生志愿者、退休教师辅导作业', '解决双职工、务工家庭放学看护难题', '登记后安排固定托管时段'] },
  { id: 22, emoji: '☀️', name: '寒暑假托管', desc: '寒暑假集中托管，看护、阅读、兴趣课，孩子有去处', badge: '公益免费', action: '报名托管', points: ['寒暑假集中托管，安全有人看护', '阅读、绘画、手工、兴趣拓展课', '缓解假期无人照看的务工家庭压力', '志愿者与村干部共同带班'] },
  { id: 23, emoji: '👨‍👩‍👧', name: '亲子活动', desc: '亲子阅读、农事体验、节日活动，增进陪伴', action: '报名参加', points: ['亲子阅读、农事体验、传统节日活动', '鼓励在外父母返乡陪伴、视频连线', '在游戏中增进亲子感情', '就近在村留守儿童之家开展'] },
  { id: 24, emoji: '🤝', name: '留守 / 困境儿童帮扶', desc: '为留守、困境儿童建档，党员一对一结对关爱', badge: '公益优先', action: '申请帮扶', points: ['为留守、困境儿童逐一建档立卡', '党员干部一对一结对，定期走访', '学习、生活、心理全方位关爱', '不漏一户，困难家庭优先帮扶'] },
  { id: 25, emoji: '🛡️', name: '安全普法', desc: '防溺水、防拐骗、交通安全普法教育，护苗成长', badge: '公益免费', action: '报名参加', points: ['防溺水、防拐骗、交通安全教育', '暑期重点开展防溺水宣传', '法治副校长进村讲安全课', '守护每个孩子平安成长'] },
];

// 社区版（居民 / 居委会运营）
const CITY_SENIOR: Svc[] = [
  { id: 31, emoji: '🍚', name: '助餐送餐（长者食堂）', desc: '社区长者食堂堂食 + 送餐，60 岁以上就餐优惠', badge: '60 岁以上优惠', action: '预约就餐', points: ['社区长者食堂每日供应营养餐', '60 岁以上长者就餐享优惠，高龄独居可送餐', '荤素搭配、少油少盐，适老饮食', '刷卡就餐、按需登记送餐上门'] },
  { id: 32, emoji: '🏠', name: '日间照料（社区日间照料中心）', desc: '社区日间照料中心白天托养，专业照护、就近就便', action: '申请托养', points: ['社区日间照料中心白天专业托养', '康复辅助、休憩、助餐一体化', '就近就便，子女上班无后顾之忧', '登记评估后安排入托'] },
  { id: 33, emoji: '🛁', name: '上门照护（助浴 / 助医）', desc: '为高龄、失能长者提供上门助浴、助医、家政服务', badge: '困难长者免费', action: '申请上门', points: ['上门助浴、助洁，解决洗澡难', '陪诊、代取药、家政保洁上门服务', '失能、特困、独居长者公益优先，可免费', '党员楼栋长包户，一户一档不漏一户'] },
  { id: 34, emoji: '📄', name: '高龄津贴办理', desc: '高龄津贴申报，社区代办帮办，材料上门收', badge: '免费帮办', action: '申请帮办', points: ['高龄津贴申报、复核社区代办', '工作人员上门收材料，少跑腿', '按时发放、进度可查', '行动不便长者重点帮办'] },
  { id: 35, emoji: '❤️', name: '健康监测', desc: '社区卫生服务站量血压、测血糖，建健康档案', badge: '公益免费', action: '预约体检', points: ['社区卫生服务站定期健康监测', '为65 岁以上长者建健康档案', '慢病管理、家庭医生签约随访', '异常数据及时提醒本人和家属'] },
  { id: 36, emoji: '🎶', name: '老年文体', desc: '合唱、书画、太极、老年大学课程，丰富晚年生活', action: '报名参加', points: ['合唱、书画、太极、舞蹈等文体活动', '社区老年大学开设兴趣课程', '就近参与，结识邻里好友', '老有所学、老有所乐'] },
];

// 社区版 · 儿童
const CITY_CHILD: Svc[] = [
  { id: 41, emoji: '📚', name: '儿童托管（四点半课堂）', desc: '社区儿童托管，放学后作业辅导、安全看护', badge: '公益免费', action: '报名托管', points: ['社区「四点半课堂」放学后托管', '志愿者、社工辅导作业、组织活动', '解决双职工家庭放学看护难题', '登记后安排固定托管时段'] },
  { id: 42, emoji: '☀️', name: '寒暑假托管', desc: '寒暑假社区托管班，看护 + 兴趣课程，家长安心', badge: '公益免费', action: '报名托管', points: ['寒暑假社区托管班，安全看护', '阅读、科普、手工、兴趣拓展', '缓解假期看护压力', '社工与志愿者共同带班'] },
  { id: 43, emoji: '👨‍👩‍👧', name: '亲子活动', desc: '社区亲子阅读、手工、节日活动，促进邻里亲子交流', action: '报名参加', points: ['亲子阅读、手工、传统节日活动', '促进亲子陪伴与邻里交流', '在社区活动室就近开展', '增进家庭与社区感情'] },
  { id: 44, emoji: '🤝', name: '困境儿童帮扶', desc: '为社区困境、单亲、残障儿童建档，党员结对关爱', badge: '公益优先', action: '申请帮扶', points: ['为困境、单亲、残障儿童建档立卡', '党员、社工一对一结对关爱', '学习、生活、心理帮扶', '困难家庭优先，不漏一户'] },
  { id: 45, emoji: '🛡️', name: '安全普法', desc: '防溺水、防拐骗、消防交通安全教育，护苗成长', badge: '公益免费', action: '报名参加', points: ['防溺水、防拐骗、消防交通安全教育', '暑期重点开展防溺水宣传', '法治副校长、民警进社区讲课', '守护每个孩子平安成长'] },
];

export default function SeniorPage() {
  const [isCommunity, setIsCommunity] = useState(store.isCommunity());
  useDidShow(() => setIsCommunity(store.isCommunity()));
  const [sel, setSel] = useState<Svc | null>(null);

  const zone = isCommunity ? '社区' : '乡村';
  const org = isCommunity ? '居委会' : '村委会';
  const seniorList = isCommunity ? CITY_SENIOR : RURAL_SENIOR;
  const childList = isCommunity ? CITY_CHILD : RURAL_CHILD;

  const apply = (s: Svc) => {
    if (!store.requireBound()) return;
    Taro.showModal({
      title: s.action,
      showCancel: false,
      confirmText: '确认' + s.action,
      content: `${s.name}\n运营：${org}\n\n（演示）已${s.action}，${org}工作人员将上门或电话与您联系核实。爱心公益服务计社会贡献值（待审核·通过后+3计入）。`,
      success: (r) => {
        if (r.confirm) {
          store.addContribution('custom', '一老一小·' + s.name, 3);
          Taro.showToast({ title: '已申请，工作人员上门/电话联系（演示）', icon: 'none', duration: 2200 });
        }
      },
    });
  };

  const renderCard = (s: Svc) => (
    <View key={s.id} className="card" onClick={() => setSel(s)}>
      <View className="thumb"><Text className="thumb-e">{s.emoji}</Text></View>
      <View className="info">
        <View className="name-row">
          <Text className="name">{s.name}</Text>
          {s.badge && <Text className="badge">{s.badge}</Text>}
        </View>
        <Text className="desc">{s.desc}</Text>
        <View className="do"><Text className="do-t">{s.action} ›</Text></View>
      </View>
    </View>
  );

  return (
    <View className="page">
      <View className="hero">
        <Text className="hero-t">👵🧒 {zone}一老一小</Text>
        <Text className="hero-s">
          {isCommunity ? '社区日间照料中心 · 长者食堂 · 儿童托管' : '村级养老助餐点 · 幸福院 · 留守儿童之家'} · {org}运营 · 党员包户结对
        </Text>
      </View>

      <ScrollView scrollY className="body">
        {/* 公益承诺条 */}
        <View className="promise">
          <Text className="promise-t">🤝 党员包户结对 · 助老助小公益优先 · 上门帮办不漏一户</Text>
        </View>

        {/* 长者服务 */}
        <View className="sec">
          <Text className="sec-t">👵 长者服务</Text>
          <Text className="sec-s">助餐送餐 · 日间照料 · 上门照护 · 高龄津贴 · 健康监测 · 老年文体</Text>
        </View>
        {seniorList.map(renderCard)}

        {/* 一小·儿童 */}
        <View className="sec sec2">
          <Text className="sec-t">🧒 一小 · 儿童</Text>
          <Text className="sec-s">课后托管 · 寒暑假托管 · 亲子活动 · 留守困境帮扶 · 安全普法</Text>
        </View>
        {childList.map(renderCard)}

        <View style={{ height: '40rpx' }} />
      </ScrollView>

      {sel && (
        <View className="mask" onClick={() => setSel(null)}>
          <View className="sheet" onClick={e => e.stopPropagation()}>
            <Text className="sheet-e">{sel.emoji}</Text>
            <View className="sheet-name-row">
              <Text className="sheet-name">{sel.name}</Text>
              {sel.badge && <Text className="badge">{sel.badge}</Text>}
            </View>
            <Text className="sheet-meta">运营：{org} · {zone}一老一小</Text>
            <View className="hl">
              {sel.points.map(p => (
                <View key={p} className="hl-row"><Text className="hl-dot">·</Text><Text className="hl-t">{p}</Text></View>
              ))}
            </View>
            <View className="sheet-bar">
              <Text className="sheet-tip">💗 助老助小 · 公益优先</Text>
              <View className="sheet-btn" onClick={() => apply(sel)}><Text className="sheet-btn-t">{sel.action}</Text></View>
            </View>
            <Text className="sheet-foot">💡 党员包户结对，上门帮办不漏一户；申请后{org}工作人员上门或电话联系（演示）。</Text>
          </View>
        </View>
      )}
    </View>
  );
}
