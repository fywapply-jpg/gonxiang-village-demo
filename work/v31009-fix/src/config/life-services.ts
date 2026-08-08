/**
 * 生活服务大厅数据：社区 12 大类 / 乡村 11 类，各含若干子服务项。
 * 由 pages/life 按 orgType 渲染，村民看乡村版、居民看社区版。
 * url：该大类若有对应的真实办事页，填其路径 —— 大厅弹窗会给「去办理」按钮跳转过去。
 */
export interface LifeCat { key: string; icon: string; title: string; items: string[]; url?: string; }

// 社区生活服务·十二大类
export const COMMUNITY_LIFE: LifeCat[] = [
  { key: 'repair', icon: '🔧', title: '便民家政维修', items: ['家电清洗维修', '水电管道疏通', '开锁换锁', '保洁开荒', '保姆护工', '缝补干洗', '配钥匙', '家具维修', '生活物品便民加工'] },
  { key: 'daiban', icon: '🛍️', title: '生活代办配送', items: ['代采生鲜药品', '代收快递', '代缴水电燃气话费', '打印复印', '证件拍照', '大件垃圾代运', '上门配送物资'] },
  { key: 'elder', icon: '👵', title: '养老助老', url: '/pages/care/index', items: ['日间照料', '助餐送餐', '上门理发助浴', '高龄津贴办理', '适老化改造申报', '慢病巡诊', '独居老人探访', '老年文体', '心理慰藉'] },
  { key: 'child', icon: '🧒', title: '青少年与未成年人', url: '/pages/care/index', items: ['四点半课堂', '寒暑假托管', '绘本科普', '亲子活动', '家庭教育指导', '困境儿童帮扶', '未成年人心理疏导', '安全普法'] },
  { key: 'health', icon: '🏥', title: '医疗卫生健康', url: '/pages/health/index', items: ['免费测血压血糖', '义诊', '家庭医生签约', '健康档案', '慢病管理', '中医药服务', '心理健康咨询', '疫苗通知', '就医转诊协助'] },
  { key: 'gov', icon: '🏛️', title: '政务代办', url: '/pages/gov/index', items: ['社保医保业务', '居住证办理', '低保/特困/残疾人补贴申报', '退役军人服务', '党组织关系转接', '婚育证明', '老旧小区改造咨询', '灵活就业登记'] },
  { key: 'culture', icon: '🎭', title: '文化文体', url: '/pages/volunteer/index', items: ['图书室开放', '健身场地', '活动室开放', '节日汇演', '社区运动会', '科普讲座', '书画手工', '公益观影', '新时代文明实践'] },
  { key: 'safety', icon: '🛡️', title: '平安综治调解', url: '/pages/safety/index', items: ['邻里/物业/家庭矛盾调解', '反诈宣传', '消防宣传', '治安巡逻', '楼道环境整治', '特殊人群走访管控', '高空抛物劝导', '停车秩序劝导'] },
  { key: 'help', icon: '❤️', title: '特殊群体帮扶', items: ['低保特困临时救助', '残疾人康复与辅具申领', '流动人口入学务工咨询', '重病受灾家庭帮扶', '无障碍改造申请'] },
  { key: 'property', icon: '🏢', title: '小区环境物业协调', url: '/pages/feature/index?key=wuye', items: ['垃圾分类督导', '公共保洁绿化', '消杀除四害', '公共设施报修', '物业诉求协调', '电梯及公共设备监督'] },
  { key: 'job', icon: '💼', title: '就业创业', url: '/pages/jobs/index', items: ['周边岗位推送', '社区公益岗发布', '家政护理技能培训', '创业补贴', '灵活就业政策咨询', '零工信息对接'] },
  { key: 'emergency', icon: '🚨', title: '应急与志愿', url: '/pages/volunteer/index', items: ['防汛防火防震宣传', '应急物资管理', '突发困难临时安置', '志愿者招募登记', '志愿队伍服务', '积分激励与志愿活动'] },
];

// 乡村生活服务·十一类
export const VILLAGE_LIFE: LifeCat[] = [
  { key: 'life', icon: '🔧', title: '便民生活服务', items: ['水电农具维修', '代缴费用', '快递代收', '理发缝纫', '农资代购', '农产品产销对接'] },
  { key: 'elder', icon: '👵', title: '养老关爱服务', url: '/pages/care/index', items: ['老年食堂', '上门照料', '养老认证', '高龄补贴代办', '留守老人走访', '老年文体活动'] },
  { key: 'child', icon: '🧒', title: '儿童关爱服务', url: '/pages/care/index', items: ['留守儿童托管', '课后课堂', '安全科普', '困境儿童帮扶'] },
  { key: 'health', icon: '🏥', title: '医疗卫生服务', url: '/pages/health/index', items: ['村卫生室诊疗', '义诊体检', '慢病随访', '医保咨询', '大病救助', '防疫宣传'] },
  { key: 'gov', icon: '🏛️', title: '政务代办服务', url: '/pages/gov/index', items: ['社保医保认证', '低保残疾补贴', '宅基地/土地确权', '涉农补贴', '退役军人业务办理'] },
  { key: 'culture', icon: '🎭', title: '文化文体服务', url: '/pages/volunteer/index', items: ['农家书屋', '健身广场', '乡村电影', '民俗汇演', '科普普法', '志愿活动'] },
  { key: 'safety', icon: '🛡️', title: '平安调解服务', url: '/pages/safety/index', items: ['土地邻里纠纷调解', '治安巡逻', '秸秆禁烧', '防火防汛', '道路安全劝导'] },
  { key: 'agri', icon: '🌾', title: '农业生产服务', url: '/pages/agri-tech/index', items: ['农技指导', '农机协调', '病虫害防治', '土地流转咨询'] },
  { key: 'env', icon: '🌳', title: '人居环境服务', items: ['村内保洁', '垃圾清运', '公厕管护', '污水沟渠清理', '村容整治'] },
  { key: 'job', icon: '💼', title: '就业帮扶服务', url: '/pages/jobs/index', items: ['招工信息', '种养技能培训', '返乡创业政策咨询'] },
  { key: 'emergency', icon: '🚨', title: '应急救助服务', url: '/pages/volunteer/index', items: ['灾害防范', '困难群众临时救助', '极端天气特殊群体看护'] },
];
