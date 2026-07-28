import { readFile, writeFile } from 'node:fs/promises';

function replaceBetween(source, startMarker, endMarker, replacement) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Start marker not found: ${startMarker}`);
  const end = source.indexOf(endMarker, start + startMarker.length);
  if (end < 0) throw new Error(`End marker not found: ${endMarker}`);
  return source.slice(0, start) + replacement + source.slice(end);
}

async function updateFlow() {
  const file = 'shuzhi-demo/assets/pages-arch-flow.CwimqXmk.js';
  let source = await readFile(file, 'utf8');

  const flow = `const h=[
{g:"准入",ic:"🪪",t:"主体注册与资质核验",d:"供应商、采购方、合作社、村集体、承运商分别实名入驻并绑定经营范围",owner:"平台合规岗+属地组织",gain:"获得可信交易资格与流量入口",risk:"冒名、超范围经营、证照过期",control:"OCR+权威数据核验；证照到期自动冻结",proof:"营业执照/许可/法人授权/承诺书",url:"/pages/mine/did"},
{g:"供需",ic:"📣",t:"供给与采购需求发布",d:"结构化填写品类、等级、数量、交期、交付地、含税口径和验收标准",owner:"供方/采购方",gain:"供方获得订单机会；采购方降低寻源成本",risk:"虚假库存、模糊等级、诱导低价",control:"库存占用、字段强校验、异常报价预警",proof:"货源批次/库存凭证/需求单",url:"/pages/trade/publish"},
{g:"匹配",ic:"🧭",t:"智能匹配与定向邀约",d:"按品类、产地、价格、履约半径、信用和历史质量匹配候选方",owner:"平台撮合引擎",gain:"缩短成交周期、减少无效询盘",risk:"算法偏置、关系单、信息泄露",control:"规则可解释、候选多源、敏感信息脱敏",proof:"匹配规则版本/候选清单/邀约记录",url:"/pages/trade/index"},
{g:"询报价",ic:"💬",t:"询价、报价与比价",d:"统一比较不含税商品净价T、税额、物流、检测、保险及服务费",owner:"买卖双方+平台",gain:"价格透明；优质优价",risk:"串标、临时加价、隐藏费用",control:"报价锁定、全费用展示、异常关联方识别",proof:"询价单/报价单/比价记录",url:"/pages/trade/chat"},
{g:"样品质检",ic:"🧪",t:"样品确认与质量规格书",d:"样品封签，约定等级、净含量、允许偏差、检测项目、抽样方案和不合格处置",owner:"买卖双方+检测机构",gain:"减少质量争议，形成品质溢价",risk:"送检样与大货不一致、报告造假",control:"盲样编码、资质实验室、批次关联",proof:"封样记录/规格书/检测报告",url:"/pages/ai/quality"},
{g:"议价招采",ic:"⚖️",t:"竞价、招标或协议议价",d:"按普通采购、团餐招标、长期框架、订单农业选择规则",owner:"采购方+监督方",gain:"兼顾价格、质量、交期和信用",risk:"最低价劣质、围标陪标、权力寻租",control:"综合评分、评审留痕、利益冲突申报",proof:"评分表/评审意见/中标通知",url:"/pages/trade/tender"},
{g:"合同",ic:"📑",t:"电子合同与责任矩阵",d:"明确T口径、税费、交付、验收、损耗、违约、分账、召回和数据授权",owner:"买卖双方+法务复核",gain:"锁定权责和预期收益",risk:"霸王条款、口头承诺、责任空白",control:"标准条款库+高风险条款人工复核",proof:"电子合同/签章/版本哈希",url:"/pages/agri/contract"},
{g:"担保付款",ic:"🏦",t:"保证金、保险与监管支付",d:"按风险等级选择保证金、履约险、预付款保函或银行监管账户",owner:"银行/保险+买卖双方",gain:"供方降低回款风险；买方避免挪用",risk:"资金池、套现、拒付、账户冒用",control:"持牌机构收付；平台不碰资金；大额双人复核",proof:"支付流水/保单/保函/监管指令",url:"/pages/trade/orders"},
{g:"备货",ic:"📦",t:"锁货、加工与批次建档",d:"锁定库存，完成分级、包装、标签、批次码和生产加工记录",owner:"供方+合作社/加工方",gain:"按标准交付获得溢价",risk:"以次充好、换批、短装、超能力接单",control:"批次锁定、称重影像、产能与库存校验",proof:"批次档案/加工记录/称重单",url:"/pages/trade/fulfillment"},
{g:"发运前检查",ic:"✅",t:"检验检疫与放行",d:"按品类完成质量检测、动植物检疫、索证索票及放行校验",owner:"官方机构/资质实验室+平台校验",gain:"合格产品获得市场准入和可信溢价",risk:"漏检、假证、过期证、证货不符",control:"证书验真、批次绑定、关键项不过即拦截",proof:"检疫证明/检测报告/放行单",url:"/pages/cert/index"},
{g:"物流",ic:"🚚",t:"装车、运输与冷链监控",d:"一车一单一证，记录承运人、车辆、封签、温湿度、轨迹和交接",owner:"承运商+仓配方",gain:"履约运费；降低损耗",risk:"断链、绕路、调包、污染、延误",control:"IoT阈值告警、电子围栏、封签核验",proof:"运单/轨迹/温控曲线/交接单",url:"/pages/logistics/dispatch"},
{g:"到货验收",ic:"🔍",t:"收货、抽检与差异确认",d:"按合同抽样，核对数量、等级、温度、包装、证照并记录拒收或让步接收",owner:"采购方+第三方见证",gain:"买方获得合格货；供方及时确认履约",risk:"恶意压级、超时验收、隐蔽瑕疵",control:"双边影像、抽样规则、验收时限、复检机制",proof:"签收单/抽检记录/差异单",url:"/pages/trade/order/detail"},
{g:"结算",ic:"🧾",t:"对账、发票与货款清算",d:"确认T、税额、代收代付、扣款依据和账期，银行按合同清算",owner:"买卖双方+银行",gain:"资金及时回笼，账实一致",risk:"无依据扣款、虚开发票、拖欠、重复付款",control:"三单匹配、发票验真、逾期预警",proof:"订单/验收单/发票/银行回单",url:"/pages/finance/settle"},
{g:"利益共同体",ic:"🤝",t:"收益分配与风险共担",d:"交易账T只分一次；标准档供方94%、组织1.5%、风险0.5%、平台及推广4%",owner:"银行分账+全体参与方",gain:"贡献者按规则获益，平台可持续运营",risk:"重复分配、暗扣、平台资金池、风险单边转嫁",control:"三本账隔离、比例校验、银行直分、全员可查",proof:"分账指令/到账回单/规则版本",url:"/pages/alliance/index"},
{g:"售后",ic:"🛠️",t:"售后、争议与保险理赔",d:"按质量、数量、物流、付款四类争议调取多源证据并限时判责",owner:"责任方+平台仲裁+保险",gain:"守约方快速获赔；责任成本归位",risk:"扯皮、证据灭失、平台偏袒",control:"证据冻结、规则自动初判、人工复核和申诉",proof:"工单/证据包/判责书/赔付单",url:"/pages/aftersale/dispute"},
{g:"追溯召回",ic:"🔗",t:"全链追溯与问题召回",d:"从销售批次反查生产、检验、运输和购买方，按影响范围精准召回",owner:"责任企业+监管+平台",gain:"降低损失范围，保护品牌信用",risk:"批次断链、迟报瞒报、召回不彻底",control:"一批一码、自动圈定、召回闭环核销",proof:"链上批次/召回通知/销毁或退回记录",url:"/pages/trace/fullchain"},
{g:"信用复盘",ic:"📊",t:"履约评价与下一周期定价",d:"把质量、时效、售后、结算和社会责任转为可申诉的信用记录",owner:"交易双方+平台风控",gain:"守信者获流量、低保证金和融资便利",risk:"刷分、报复性差评、永久标签化",control:"仅采可信事件、异常评价剔除、申诉与修复",proof:"履约评分/申诉记录/信用变更",url:"/pages/agri/credit"}
],m=`;

  source = replaceBetween(source, 'const h=[', 'm=["/pages/trade/index"', flow);
  source = source.replace(
    'i(d(a.d),1)]),_:2},1024),u(I,{class:"s-go"',
    'i(d(a.d),1)]),_:2},1024),u(I,{class:"s-d"},{default:l(()=>[i("👤 责任："+d(a.owner))]),_:2},1024),u(I,{class:"s-d"},{default:l(()=>[i("💰 收益："+d(a.gain))]),_:2},1024),u(I,{class:"s-d"},{default:l(()=>[i("⚠️ 风险："+d(a.risk))]),_:2},1024),u(I,{class:"s-d"},{default:l(()=>[i("🛡️ 协同控制："+d(a.control))]),_:2},1024),u(I,{class:"s-d"},{default:l(()=>[i("📎 凭证："+d(a.proof))]),_:2},1024),u(I,{class:"s-go"',
  );
  source = source.replace(
    '从农资到餐桌 · 从生产到分红 · 21 步一条线跑通、全程上链',
    '从主体准入到信用复盘 · 17步交易闭环 · 每步责任、收益、风险、控制、凭证一一对应',
  );
  source = source.replace(
    '这不是 12 个孤立页面，而是一条真实业务链：上一步的产出是下一步的输入（农资批次→溯源起点、下单→复核→合同→付款→配送、佣金→考核→集体分红），每一步都在「可信数字底座」上留痕。',
    '协同原则：谁贡献谁受益、谁决策谁负责、谁造成风险谁承担；平台不碰资金，银行按合同直分；官方检疫和资质检测不被平台替代；任何异常都能冻结证据、限时处置、申诉复核和追溯召回。',
  );
  await writeFile(file, source);
}

async function updateLivestock() {
  const file = 'shuzhi-demo/assets/pages-digitalfarm-livestock.Do81w_Ac.js';
  let source = await readFile(file, 'utf8');

  const profiles = [
    { key: 'pig', name: '生猪', emoji: '🐖', unit: '头', farm: '信丰生猪养殖基地', std: '《生猪产地检疫规程》', tests: '申报材料、强制免疫、临床检查、耳标、非洲猪瘟等规定项目', stages: ['引种与耳标建档', '保育免疫', '育肥与用药监测', '休药与出栏申报', '检疫屠宰'], records: ['猪瘟免疫', '口蹄疫免疫', '非洲猪瘟实验室检测', '耳标与养殖档案核验'], feeds: ['饲料批次与禁限用物质核验', '治疗用药与休药期核算'] },
    { key: 'cattle', name: '牛类', emoji: '🐂', unit: '头', farm: '赣南肉牛合作社', std: '《反刍动物产地检疫规程》', tests: '口蹄疫、布鲁氏菌病、结核病等规定项目及标识核验', stages: ['引种隔离', '个体标识建档', '免疫与繁育', '育肥休药', '检疫屠宰'], records: ['口蹄疫免疫', '布鲁氏菌病检测', '结核病检测', '耳标与调运档案核验'], feeds: ['反刍饲料和饲草来源核验', '兽药处方与休药期核算'] },
    { key: 'sheep', name: '羊类', emoji: '🐑', unit: '只', farm: '宁都肉羊养殖场', std: '《反刍动物产地检疫规程》', tests: '口蹄疫、小反刍兽疫、布鲁氏菌病等规定项目', stages: ['引种隔离', '群体建档', '免疫驱虫', '育肥休药', '检疫屠宰'], records: ['口蹄疫免疫', '小反刍兽疫免疫', '布鲁氏菌病检测', '群体标识与调运核验'], feeds: ['饲草料和霉变风险监测', '驱虫/治疗用药与休药期'] },
    { key: 'poultry', name: '家禽', emoji: '🐔', unit: '羽', farm: '泰和家禽合作社', std: '《家禽产地检疫规程》', tests: '高致病性禽流感、新城疫等规定项目及批次核验', stages: ['种源与批次建档', '育雏', '免疫与环境监测', '用药休药', '检疫屠宰/蛋品准出'], records: ['高致病性禽流感免疫', '新城疫免疫', '批次临床检查', '禽蛋/禽肉兽药残留抽检'], feeds: ['饲料和饮水卫生监测', '产蛋期禁限用药及休药核验'] },
    { key: 'rabbit', name: '兔类', emoji: '🐇', unit: '只', farm: '赣南肉兔基地', std: '《兔产地检疫规程》', tests: '兔病毒性出血病等规定项目及临床检查', stages: ['种兔引进', '窝批建档', '免疫与保育', '育肥休药', '检疫屠宰'], records: ['兔病毒性出血病免疫', '临床健康检查', '死亡率异常监测', '批次与来源核验'], feeds: ['颗粒料批次和霉菌毒素监测', '治疗用药与休药期'] },
    { key: 'equine', name: '马驴', emoji: '🐎', unit: '匹', farm: '区域马属动物基地', std: '《马属动物产地检疫规程》', tests: '马传染性贫血、马鼻疽等规定项目', stages: ['来源与个体建档', '隔离观察', '疫病检测', '调运申报', '检疫准出/屠宰'], records: ['马传染性贫血检测', '马鼻疽检测', '临床健康检查', '芯片/标识与调运核验'], feeds: ['草料来源与霉变监测', '治疗记录和休药期'] },
    { key: 'deer', name: '鹿类', emoji: '🦌', unit: '只', farm: '特种经济动物备案场', std: '鹿类产地监管及《鹿屠宰检疫规程》', tests: '合法来源、健康档案、临床检查及规定实验室项目', stages: ['合法来源核验', '个体标识建档', '隔离与健康监测', '调运/屠宰申报', '检疫准出'], records: ['来源许可核验', '规定疫病实验室检测', '临床健康检查', '个体标识核验'], feeds: ['饲草料来源和重金属风险监测', '兽药使用与休药期'] },
    { key: 'fish', name: '鱼类', emoji: '🐟', unit: '尾', farm: '鄱阳湖生态渔场', std: '《鱼类产地检疫规程》', tests: '规定水生动物疫病、苗种来源、用药记录、水质与批次检查', stages: ['苗种检疫', '池塘/网箱建档', '水质和病害监测', '用药停药', '捕捞检疫准出'], records: ['苗种检疫证明', '规定疫病检测', '水质监测', '兽药残留抽检'], feeds: ['水产饲料批次与投入品核验', '水产用药和停药期核算'] },
    { key: 'crustacean', name: '虾蟹', emoji: '🦐', unit: '尾', farm: '生态虾蟹养殖基地', std: '《甲壳类产地检疫规程》', tests: '白斑综合征等规定项目及苗种、用药、水质记录', stages: ['苗种检疫', '塘口建档', '水质底质监测', '病害和停药管理', '捕捞检疫准出'], records: ['苗种来源核验', '白斑综合征等检测', '水质底质监测', '药残抽检'], feeds: ['饲料与动保产品批次核验', '禁限用药和停药期核算'] },
    { key: 'shellfish', name: '贝类', emoji: '🦪', unit: '批', farm: '贝类净化养殖基地', std: '《贝类产地检疫规程》', tests: '规定疫病、产区水质、生物毒素、净化和批次记录', stages: ['苗种与海区备案', '养殖批次建档', '水质/疫病监测', '采收与净化', '检测准出'], records: ['苗种来源核验', '规定疫病检测', '贝类毒素/微生物检测', '净化批次核验'], feeds: ['养殖海区污染风险监测', '净化用水与暂养记录'] },
    { key: 'bee', name: '蜜蜂', emoji: '🐝', unit: '群', farm: '生态蜂业合作社', std: '《蜜蜂产地检疫规程》', tests: '美洲幼虫腐臭病等规定项目及蜂群临床检查', stages: ['蜂群来源建档', '转地放蜂申报', '蜂病监测', '用药停药与采蜜', '检疫调运/蜂产品准出'], records: ['美洲幼虫腐臭病检查', '蜂群临床检查', '转地放蜂路线核验', '蜂产品兽药残留抽检'], feeds: ['饲喂和蜂药批次记录', '采蜜期禁限用药核验'] },
  ];

  const literal = profiles.map((profile) => {
    const records = profile.records.map((name, index) => ({
      t: name,
      date: `0${Math.min(index + 5, 9)}-${String(8 + index * 4).padStart(2, '0')}`,
      batch: `${profile.key.toUpperCase()}-${2601 + index}`,
      vet: index === 2 ? '资质实验室/官方兽医' : '官方兽医·示例',
      done: index < 2,
      ...(index === 2 ? { cur: true } : {}),
    }));
    const feeds = profile.feeds.map((name, index) => ({
      date: `10-${15 + index * 5}`,
      act: name,
      detail: index === 0 ? '投入品批次、供应商、检测/合格证明关联上链' : '处方、剂量、对象、操作人、停药/休药截止日自动核算',
    }));
    return JSON.stringify({ ...profile, stages: profile.stages.map((name, index) => ({ name, done: index < 2, ...(index === 2 ? { cur: true } : {}) })), records, feeds });
  }).join(',');

  source = replaceBetween(source, 'const y=[', '],C=l(0),w=', `const y=[${literal}`);
  source = replaceBetween(
    source,
    'S=[{name:"主体/批次建档"',
    ',D=l(3)',
    'S=s(()=>w.value.stages),T=s(()=>w.value.records),U=s(()=>w.value.feeds),Q=s(()=>T.value.every(a=>a.done))',
  );
  source = source.replace('m(S,(a,l)=>', 'm(S.value,(a,l)=>');
  source = source.replace('l<S.length-1', 'l<S.value.length-1');
  source = source.replace('m($,(a,l)=>', 'm(U.value,(a,l)=>');
  source = source.replace(
    'function O(){var a;const l=null==(a=T.value.find(a=>a.t.includes("非洲猪瘟")))?void 0:a.done;R.value?N.value=l?"pass":"block":N.value="block"}',
    'function O(){R.value?N.value=Q.value?"pass":"block":N.value="block"}',
  );
  source = source.replace(
    '✅ 检查通过：休药期满、三针免疫齐全、非瘟阴性、耳标核对一致 → 出具《动物检疫合格证明》，准予出栏 → 定点屠宰。',
    '✅ 检查通过：休药/停药期满足、规定记录齐全、临床与实验室项目合格、批次标识一致。提交官方兽医依法出证后方可调运、屠宰或上市。',
  );
  source = source.replace(
    'R.value?"非洲猪瘟检测未完成":`兽药休药期未满（剩 ${D.value} 天）`',
    'R.value?"当前品类仍有规定检查/检测项目未完成":`休药/停药期未满（剩 ${D.value} 天）`',
  );
  source = source.replace('💉 防疫免疫档案', '💉 当前品类防疫、检测与准出清单');
  source = source.replace('官方兽医签章上链', '官方结论/资质报告验真上链');
  source = source.replace('🌽 饲料 + 兽药休药档案', '🌽 投入品、用药与休药/停药档案');
  source = source.replace('兽药休药期', '休药/停药期');
  source = source.replace('药物残留达标，允许申请出栏', '投入品和残留条件满足，允许申请检疫准出');
  source = source.replace('休药期内严禁出栏上市', '期限内严禁调运、屠宰或上市');
  source = source.replace('▶ 申请出栏检疫', '▶ 申请当前品类检疫准出');
  source = source.replace('引栏（', '建档（');
  source = source.replace('已出栏', '已准出');
  await writeFile(file, source);
}

await updateFlow();
await updateLivestock();
