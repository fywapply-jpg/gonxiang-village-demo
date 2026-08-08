import { useState } from 'react';
import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, ScrollView, Slider } from '@tarojs/components';
import './index.css';

// ── 盈亏平衡测算 ──────────────────────────────────────────────────────────────
// 口径按共富分配规则：一笔交易的毛利先计提「前置四金」35%（产业15 / 风险5 / 公益3 / 运营12），
// 平台日常的口粮 = 运营运维准备金（≤ 毛利 12% 红线）。平台不碰钱、不抽高佣，
// 所以能不能活下来，本质是「规模 × 毛利率 × 12%」能不能盖住固定成本。

const money = (yuan: number): string => {
  if (Math.abs(yuan) >= 10000) return (yuan / 10000).toFixed(1) + ' 万';
  return Math.round(yuan).toLocaleString();
};
// H5 的 weui-slider 只认触摸、鼠标拖不动，所以每项都配 −/+ 按钮，电脑上也能调
const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

export default function BreakevenPage() {
  useLoad(() => { Taro.setNavigationBarTitle({ title: '盈亏平衡测算' }); });

  const [villages, setVillages] = useState(20);       // 接入村 / 社区数
  const [households, setHouseholds] = useState(200);  // 每村活跃户
  const [spend, setSpend] = useState(300);            // 户均月消费（元）
  const [gross, setGross] = useState(20);             // 毛利率 %
  const [opRate, setOpRate] = useState(12);           // 平台运营费率 %（≤12 红线）
  const [fixedWan, setFixedWan] = useState(20);       // 月固定成本（万元）

  // —— 测算 ——
  const perVillage = households * spend;              // 每村月 GMV
  const gmv = villages * perVillage;                  // 月 GMV
  const grossProfit = gmv * (gross / 100);            // 月毛利
  const income = grossProfit * (opRate / 100);        // 平台月收入（运营金）
  const cost = fixedWan * 10000;                      // 月固定成本
  const net = income - cost;                          // 月盈亏
  const ok = net >= 0;

  // —— 盈亏平衡点 ——
  const rate = (gross / 100) * (opRate / 100);        // 平台从 GMV 里实得比例
  const beGmv = rate > 0 ? cost / rate : 0;           // 打平所需月 GMV
  const beVillages = perVillage > 0 ? Math.ceil(beGmv / perVillage) : 0; // 打平所需村数
  const gap = beVillages - villages;

  // 收入 / 成本 对比条
  const maxBar = Math.max(income, cost, 1);
  const incomePct = Math.round((income / maxBar) * 100);
  const costPct = Math.round((cost / maxBar) * 100);

  const ROWS: { k: string; label: string; val: string; hint?: string }[] = [
    { k: 'gmv', label: '月 GMV（平台总成交）', val: '¥' + money(gmv), hint: `${villages} 村 × ${households} 户 × ¥${spend}` },
    { k: 'gp', label: `月毛利（毛利率 ${gross}%）`, val: '¥' + money(grossProfit), hint: '毛利 = 成交额 − 采购成本' },
    { k: 'in', label: `平台月收入（运营金 ${opRate}%）`, val: '¥' + money(income), hint: '平台只从毛利里拿这一块当口粮' },
    { k: 'cost', label: '月固定成本', val: '−¥' + money(cost), hint: '人员 / 服务器 / 运维 / 地推' },
  ];

  return (
    <ScrollView scrollY className="page">
      <View className="bg">
        {/* hero */}
        <View className="hero">
          <Text className="hero-t">📊 盈亏平衡测算</Text>
          <Text className="hero-s">平台只拿毛利的 ≤12% 当口粮 —— 能不能活，看规模</Text>
          <View className="badges">
            {['不碰钱', '不抽高佣', '运营金 ≤ 毛利 12%', '靠规模不靠压价'].map(b => (
              <View key={b} className="badge"><Text className="badge-t">{b}</Text></View>
            ))}
          </View>
        </View>

        {/* 结论卡 */}
        <View className={`verdict ${ok ? 'good' : 'bad'}`}>
          <Text className="verdict-lb">按当前参数，平台每月</Text>
          <Text className="verdict-num">{ok ? '盈利 ' : '亏损 '}¥{money(Math.abs(net))}</Text>
          <Text className="verdict-sub">
            {ok
              ? `已越过盈亏平衡点（打平需 ${beVillages} 个村，现有 ${villages} 个）`
              : `还差 ${gap} 个村才打平（打平需 ${beVillages} 个村 / 月 GMV ¥${money(beGmv)}）`}
          </Text>
        </View>

        {/* ① 拖一拖，算一算 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text>1</Text></View>
            <Text className="sec-t">🎚️ 拖一拖，算一算</Text>
          </View>
          <Text className="sec-lead">拖动滑块，或点右边的 − / + 调参数（电脑上用 −/+），上面的结论实时跟着变。</Text>

          <View className="sl">
            <View className="sl-h"><Text className="sl-lb">接入村 / 社区数</Text>
              <View className="stepper"><Text className="step-btn" onClick={() => setVillages(clamp(villages - 5, 1, 200))}>−</Text><Text className="sl-v">{villages} 个</Text><Text className="step-btn" onClick={() => setVillages(clamp(villages + 5, 1, 200))}>＋</Text></View>
            </View>
            <Slider value={villages} min={1} max={200} step={1} activeColor="#d97706" blockSize={22} onChanging={e => setVillages(e.detail.value)} onChange={e => setVillages(e.detail.value)} />
          </View>
          <View className="sl">
            <View className="sl-h"><Text className="sl-lb">每村活跃户</Text>
              <View className="stepper"><Text className="step-btn" onClick={() => setHouseholds(clamp(households - 20, 20, 600))}>−</Text><Text className="sl-v">{households} 户</Text><Text className="step-btn" onClick={() => setHouseholds(clamp(households + 20, 20, 600))}>＋</Text></View>
            </View>
            <Slider value={households} min={20} max={600} step={10} activeColor="#d97706" blockSize={22} onChanging={e => setHouseholds(e.detail.value)} onChange={e => setHouseholds(e.detail.value)} />
          </View>
          <View className="sl">
            <View className="sl-h"><Text className="sl-lb">户均月消费</Text>
              <View className="stepper"><Text className="step-btn" onClick={() => setSpend(clamp(spend - 50, 50, 1200))}>−</Text><Text className="sl-v">¥{spend}</Text><Text className="step-btn" onClick={() => setSpend(clamp(spend + 50, 50, 1200))}>＋</Text></View>
            </View>
            <Slider value={spend} min={50} max={1200} step={10} activeColor="#d97706" blockSize={22} onChanging={e => setSpend(e.detail.value)} onChange={e => setSpend(e.detail.value)} />
          </View>
          <View className="sl">
            <View className="sl-h"><Text className="sl-lb">毛利率</Text>
              <View className="stepper"><Text className="step-btn" onClick={() => setGross(clamp(gross - 1, 5, 35))}>−</Text><Text className="sl-v">{gross}%</Text><Text className="step-btn" onClick={() => setGross(clamp(gross + 1, 5, 35))}>＋</Text></View>
            </View>
            <Slider value={gross} min={5} max={35} step={1} activeColor="#16a34a" blockSize={22} onChanging={e => setGross(e.detail.value)} onChange={e => setGross(e.detail.value)} />
          </View>
          <View className="sl">
            <View className="sl-h"><Text className="sl-lb">平台运营费率（红线 ≤ 12%）</Text>
              <View className="stepper"><Text className="step-btn" onClick={() => setOpRate(clamp(opRate - 1, 3, 12))}>−</Text><Text className="sl-v">{opRate}%</Text><Text className="step-btn" onClick={() => setOpRate(clamp(opRate + 1, 3, 12))}>＋</Text></View>
            </View>
            <Slider value={opRate} min={3} max={12} step={1} activeColor="#16a34a" blockSize={22} onChanging={e => setOpRate(e.detail.value)} onChange={e => setOpRate(e.detail.value)} />
          </View>
          <View className="sl">
            <View className="sl-h"><Text className="sl-lb">月固定成本（人员 / 服务器 / 运维）</Text>
              <View className="stepper"><Text className="step-btn" onClick={() => setFixedWan(clamp(fixedWan - 5, 2, 100))}>−</Text><Text className="sl-v">{fixedWan} 万</Text><Text className="step-btn" onClick={() => setFixedWan(clamp(fixedWan + 5, 2, 100))}>＋</Text></View>
            </View>
            <Slider value={fixedWan} min={2} max={100} step={1} activeColor="#dc2626" blockSize={22} onChanging={e => setFixedWan(e.detail.value)} onChange={e => setFixedWan(e.detail.value)} />
          </View>
        </View>

        {/* ② 钱是怎么算出来的 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text>2</Text></View>
            <Text className="sec-t">🧮 钱是怎么算出来的</Text>
          </View>
          {ROWS.map(r => (
            <View key={r.k} className="row">
              <View className="row-l">
                <Text className="row-lb">{r.label}</Text>
                {r.hint && <Text className="row-hint">{r.hint}</Text>}
              </View>
              <Text className={`row-v ${r.k === 'cost' ? 'neg' : ''}`}>{r.val}</Text>
            </View>
          ))}
          <View className="row net">
            <Text className="row-lb strong">月盈亏</Text>
            <Text className={`row-v strong ${ok ? 'pos' : 'neg'}`}>{ok ? '+' : '−'}¥{money(Math.abs(net))}</Text>
          </View>

          {/* 收入 vs 成本 */}
          <View className="bars">
            <View className="bar-row">
              <Text className="bar-lb">平台收入</Text>
              <View className="bar-track"><View className="bar-fill in" style={{ width: incomePct + '%' }} /></View>
              <Text className="bar-v">¥{money(income)}</Text>
            </View>
            <View className="bar-row">
              <Text className="bar-lb">固定成本</Text>
              <View className="bar-track"><View className="bar-fill co" style={{ width: costPct + '%' }} /></View>
              <Text className="bar-v">¥{money(cost)}</Text>
            </View>
          </View>
        </View>

        {/* ③ 盈亏平衡点 */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text>3</Text></View>
            <Text className="sec-t">🎯 盈亏平衡点</Text>
          </View>
          <View className="be">
            <View className="be-item">
              <Text className="be-num">{beVillages}</Text>
              <Text className="be-lb">个村 / 社区</Text>
            </View>
            <Text className="be-or">或</Text>
            <View className="be-item">
              <Text className="be-num">¥{money(beGmv)}</Text>
              <Text className="be-lb">月 GMV</Text>
            </View>
          </View>
          <Text className="be-note">
            按现在的毛利率 {gross}% 和运营费率 {opRate}%，平台每做 ¥100 成交，只落 ¥{(rate * 100).toFixed(2)} 当口粮。要盖住每月 {fixedWan} 万固定成本，就得做到上面这个盘子。
          </Text>
          <View className="tips">
            <Text className="tips-t">💡 想早点打平，只有四条路</Text>
            {[
              '多接村：接入数上去，摊薄固定成本（最实在）',
              '提客单：户均月消费从 ¥300 提到 ¥500，打平村数直接少四成',
              '提毛利：把好货、自营品、服务费占比提上来',
              '压成本：前期少养人、多用现成的云和小程序，别摊大摊子',
            ].map(t => <Text key={t} className="tips-i">· {t}</Text>)}
          </View>
        </View>

        {/* ④ 为什么平台赚得这么"薄" */}
        <View className="sec">
          <View className="sec-h">
            <View className="sec-no"><Text>4</Text></View>
            <Text className="sec-t">🤝 为什么平台赚得这么「薄」</Text>
          </View>
          <Text className="sec-lead">这是共富分配定死的规矩——好处先给乡亲，平台只拿该拿的那点。</Text>
          {[
            { t: '农户先拿', d: '保底收购价高于市场 5%–8%，卖货溢价再 70% 返农户 / 30% 归村集体' },
            { t: '四金先提', d: '毛利先计提 35%：产业发展 15% / 风险兜底 5% / 公益专项 3% / 运营运维 12%' },
            { t: '平台后拿', d: '日常口粮就是那 12% 运营金，管理费 ≤ 毛利 12% 是红线，写死在合约里' },
            { t: '年底再说', d: '年度可分配利润平台占 35%，但利润 < 50 万当年不分红，先保按劳分配' },
          ].map(c => (
            <View key={c.t} className="why">
              <Text className="why-t">{c.t}</Text>
              <Text className="why-d">{c.d}</Text>
            </View>
          ))}
          <Text className="why-sum">
            一句话：平台不是靠抽成活的，是靠把盘子做大、拿那一点点运营金活的。盘子小的时候一定亏，这很正常——所以前期要么控成本，要么快接村。
          </Text>
        </View>

        <Text className="foot">本页为盈亏平衡测算模型（演示示意），参数为假设值，不构成收益承诺或投资建议。实际以正式财务测算与审计为准。</Text>
      </View>
    </ScrollView>
  );
}
