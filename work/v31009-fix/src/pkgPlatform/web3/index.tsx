import Taro, { useLoad } from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import './index.css';

// —— 平台技术底座 / Web3 架构 全景展示（面向投资人 / 政府，公开可看、无守卫）——

const BADGES: string[] = ['自主可控', '国密合规', '等保三级'];

// ① 应用层 · 业务应用
const APP_CHIPS: string[] = ['便民服务', '兴农增收', '乡村治理', '社会公益', '乡风文明', '管理中心'];

// ② 能力中台 · 区块链能力服务（6 大能力）
const CAPS: { i: string; t: string; d: string }[] = [
  { i: '🔏', t: '存证', d: '资金 / 物资 / 贡献值 / 受益档案上链，不可篡改' },
  { i: '🆔', t: 'DID 去中心化身份', d: '一人一档、机构一码，实名可信、隐私自控' },
  { i: '📜', t: '智能合约', d: '自动分账 4:6 / 管理费 ≤ 毛利 12% 红线锁单 / 审批自动执行' },
  { i: '🔐', t: '隐私计算', d: '未成年信息脱敏 / 分级授权 / 可用不可见' },
  { i: '💴', t: '数币结算', d: '对接数字人民币，善款链上清分' },
  { i: '🌉', t: '跨链', d: '双链互通、资产存证跨链桥接' },
];

// ③ 双链底座
const CHAINS: { name: string; type: string; role: string; meta: string[]; tags: string[]; accent: 'green' | 'cyan' }[] = [
  { name: '长安链 ChainMaker', type: '联盟链', role: '管存证监管', meta: ['国密 SM2/SM3/SM4', '秒级确认', '监管节点可审计'], tags: ['存证', '溯源', '审批', '监管'], accent: 'green' },
  { name: 'Conflux 树图链', type: '公有链', role: '管高频交易', meta: ['6000+ TPS', '树图共识', '低 Gas'], tags: ['捐赠', '结算', '积分', '高频'], accent: 'cyan' },
];

// ④ 信创设施 · 自主可控
const INFRA_CHIPS: string[] = ['国产算力（鲲鹏 / 飞腾 / 海光）', '国密算法（SM2/SM3/SM4）', '后量子密码', '等保三级', '全栈信创'];

// 🔗 链上存证实况（演示，哈希写死）
const LEDGER: { biz: string; chain: string; hash: string; time: string }[] = [
  { biz: '社会贡献值上链', chain: '长安链', hash: '0x7a3f9c2e8b1d4a6f0c5e9b2d7f8a1c3e6b4d9f0a2c5e8b1d7f3a6c9e2b5d8f04', time: '刚刚' },
  { biz: '公益资金流水存证', chain: '长安链', hash: '0x3e8b1d7f4a2c6e9b0d5f8a1c3e7b4d9f2a6c8e1b5d0f3a7c9e2b6d4f8a1c3e70', time: '2 分钟前' },
  { biz: '体育物资溯源上链', chain: '长安链', hash: '0x9c2e5b8d1f4a7c0e3b6d9f2a5c8e1b4d7f0a3c6e9b2d5f8a1c4e7b0d3f6a9c20', time: '8 分钟前' },
  { biz: '定向捐赠交易', chain: 'Conflux', hash: '0x2d7f4a9c1e6b3d8f0a5c2e7b9d4f1a6c3e8b5d0f7a2c9e4b1d6f3a8c5e0b7d24', time: '12 分钟前' },
];

type Led = { biz: string; chain: string; hash: string; time: string };

export default function Web3Page() {
  useLoad(() => {
    Taro.setNavigationBarTitle({ title: '区块链技术底座' });
  });

  const viewLed = (l: Led) => {
    Taro.showModal({
      title: '🔗 链上存证详情',
      content: `业务：${l.biz}\n上链：${l.chain}\n交易哈希：\n${l.hash}\n时间：${l.time}\n\n该记录已上链存证、不可篡改（演示示意）。`,
      showCancel: false,
      confirmText: '知道了',
    });
  };

  return (
    <ScrollView scrollY className="page">
      <View className="bg">
        {/* hero */}
        <View className="hero">
          <Text className="hero-t">⛓ 区块链技术底座</Text>
          <Text className="hero-s">自主可控 · 双链协同 · 国密合规的 Web3 数字基础设施</Text>
          <View className="badges">
            {BADGES.map(b => (
              <View key={b} className="badge"><Text className="badge-t">{b}</Text></View>
            ))}
          </View>
        </View>

        <Text className="conn">▼</Text>

        {/* ① 应用层 · 业务应用 */}
        <View className="layer">
          <View className="layer-h">
            <View className="layer-no ac-cyan"><Text>1</Text></View>
            <View className="layer-hb">
              <Text className="layer-tag tx-cyan">应用层</Text>
              <Text className="layer-t">业务应用</Text>
            </View>
          </View>
          <Text className="layer-d">全域业务统一调用底层区块链能力</Text>
          <View className="chips">
            {APP_CHIPS.map(c => (<View key={c} className="chip"><Text className="chip-t">{c}</Text></View>))}
          </View>
        </View>

        <Text className="conn">▼</Text>

        {/* ② 能力中台 · 区块链能力服务 */}
        <View className="layer">
          <View className="layer-h">
            <View className="layer-no ac-purple"><Text>2</Text></View>
            <View className="layer-hb">
              <Text className="layer-tag tx-purple">能力中台</Text>
              <Text className="layer-t">区块链能力服务</Text>
            </View>
          </View>
          <Text className="layer-d">六大链上能力统一封装，业务按需调用</Text>
          <View className="caps">
            {CAPS.map(c => (
              <View key={c.t} className="cap">
                <Text className="cap-i">{c.i}</Text>
                <Text className="cap-t">{c.t}</Text>
                <Text className="cap-d">{c.d}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text className="conn">▼</Text>

        {/* ③ 双链底座 */}
        <View className="layer">
          <View className="layer-h">
            <View className="layer-no ac-green"><Text>3</Text></View>
            <View className="layer-hb">
              <Text className="layer-tag tx-green">双链底座</Text>
              <Text className="layer-t">长安链 + Conflux</Text>
            </View>
          </View>
          <Text className="layer-d">联盟链 + 公有链，双链分工协同</Text>
          <View className="chains">
            {CHAINS.map(ch => (
              <View key={ch.name} className={`chain ${ch.accent === 'cyan' ? 'c-cyan' : ''}`}>
                <View className="chain-h">
                  <Text className="chain-n">{ch.name}</Text>
                  <View className={`chain-badge ${ch.accent === 'cyan' ? 'ac-cyan' : 'ac-green'}`}><Text>{ch.type}</Text></View>
                </View>
                <Text className="chain-role">· {ch.role}</Text>
                <View className="chain-meta">
                  {ch.meta.map(m => (<Text key={m} className="meta-i">{m}</Text>))}
                </View>
                <View className="chain-tags">
                  {ch.tags.map(t => (<Text key={t} className={`ctag ${ch.accent === 'cyan' ? 't-cyan' : 't-green'}`}>{t}</Text>))}
                </View>
              </View>
            ))}
          </View>
          <View className="chain-sync">
            <Text className="chain-sync-t">🔗 双链协同：低频高价值上长安链存证，高频交易上 Conflux，跨链桥互通。</Text>
          </View>
        </View>

        <Text className="conn">▼</Text>

        {/* ④ 信创设施 · 自主可控 */}
        <View className="layer">
          <View className="layer-h">
            <View className="layer-no ac-cyan"><Text>4</Text></View>
            <View className="layer-hb">
              <Text className="layer-tag tx-cyan">信创设施</Text>
              <Text className="layer-t">自主可控</Text>
            </View>
          </View>
          <Text className="layer-d">从芯片算力到密码算法，全栈国产自主可控</Text>
          <View className="chips">
            {INFRA_CHIPS.map(c => (<View key={c} className="chip"><Text className="chip-t">{c}</Text></View>))}
          </View>
        </View>

        {/* 🔗 链上存证实况（演示） */}
        <View className="ledger">
          <View className="ledger-h">
            <Text className="ledger-t">🔗 链上存证实况</Text>
            <View className="live"><View className="live-dot" /><Text className="live-t">演示</Text></View>
          </View>
          {LEDGER.map(l => (
            <View key={l.hash} className="led" onClick={() => viewLed(l)}>
              <View className="led-h">
                <Text className="led-biz">{l.biz}</Text>
                <Text className={`led-chain ${l.chain === 'Conflux' ? 'lc-cyan' : 'lc-green'}`}>{l.chain}</Text>
              </View>
              <Text className="led-hash">{l.hash}</Text>
              <View className="led-f">
                <Text className="led-time">{l.time}</Text>
                <Text className="led-view">查看详情 ›</Text>
              </View>
            </View>
          ))}
        </View>

        <Text className="foot">演示示意，展示平台技术架构与合规能力；实际部署对接长安链 / Conflux 主网及信创环境。</Text>
      </View>
    </ScrollView>
  );
}
