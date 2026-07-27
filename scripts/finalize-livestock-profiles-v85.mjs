import { readFile, writeFile } from 'node:fs/promises';

const file = 'shuzhi-demo/assets/pages-digitalfarm-livestock.Do81w_Ac.js';
let source = await readFile(file, 'utf8');

const startMarker = 'const y=[';
const endMarker = '],C=l(0),w=';
const start = source.indexOf(startMarker);
const end = source.indexOf(endMarker, start);
if (start < 0 || end < 0) throw new Error('Livestock profile array not found');

const profiles = JSON.parse(`[${source.slice(start + startMarker.length, end)}]`);
const sizes = {
  pig: [320, 152, 168],
  cattle: [86, 61, 25],
  sheep: [460, 328, 132],
  poultry: [12800, 9600, 3200],
  rabbit: [1800, 1260, 540],
  equine: [48, 39, 9],
  deer: [126, 98, 28],
  fish: [68000, 52000, 16000],
  crustacean: [120000, 86000, 34000],
  shellfish: [320, 246, 74],
  bee: [860, 690, 170],
};

for (const profile of profiles) {
  const [intake, active, released] = sizes[profile.key];
  profile.stats = { intake, active, released };
  profile.alerts = [
    {
      icon: profile.emoji,
      t: `${profile.name}规定疫病风险监测`,
      d: `依据${profile.std}，对${profile.tests}持续监测；异常自动冻结该批次`,
      level: '中',
      color: '#d99a2b',
    },
    {
      icon: '📡',
      t: `${profile.name}环境/行为指标偏离`,
      d: 'AI只负责预警并生成复核工单，不直接替代兽医、渔业技术人员或实验室结论',
      level: '低',
      color: '#2b6cb0',
    },
  ];
  const aquatic = ['fish', 'crustacean', 'shellfish'].includes(profile.key);
  const bee = profile.key === 'bee';
  profile.disposal = aquatic
    ? '异常水生动物隔离池/无害化处置点 · 隔离、采样、消毒、死亡个体处置和水体风险控制全程留痕'
    : bee
      ? '异常蜂群隔离区 · 封群、采样、蜂具消毒及依法处置全程留痕'
      : '属地病死动物无害化处理体系 · 收集、暂存、联单、转运、集中处理和保险理赔全程留痕';
}

source =
  source.slice(0, start + startMarker.length) +
  profiles.map((profile) => JSON.stringify(profile)).join(',') +
  source.slice(end);

source = source.replace(
  'w=s(()=>y[C.value]),j=320,x=168,I=152,F="100%"',
  'w=s(()=>y[C.value]),j=s(()=>w.value.stats.intake),x=s(()=>w.value.stats.released),I=s(()=>w.value.stats.active),F="100%"',
);
source = source.replace('E=[{icon:"🦠",t:"非洲猪瘟区域预警",d:"邻县发现疫点，加强消毒与检测",level:"中",color:"#d99a2b"},{icon:"🍽️",t:"3 号栏采食量下降 8%",d:"AI 行为监测异常，建议巡查",level:"中",color:"#d99a2b"}],H=2,L="县病死畜无害化处理中心",M="收集-暂存-联单-集中处理全程留痕，保险联动补贴"', 'E=s(()=>w.value.alerts),H=s(()=>w.value.disposal)');
source = source.replace('f(o(j),1)', 'f(o(j.value),1)');
source = source.replace('f(o(I),1)', 'f(o(I.value),1)');
source = source.replace('f(o(x),1)', 'f(o(x.value),1)');
source = source.replace('m(E,a=>', 'm(E.value,a=>');
source = source.replace('f("病死畜无害化处理 · "+o(H)+" 头（本月）",1)', 'f("异常个体/批次隔离与无害化处置",1)');
source = source.replace('f(o(L)+" · "+o(M),1)', 'f(o(H.value),1)');

await writeFile(file, source);
