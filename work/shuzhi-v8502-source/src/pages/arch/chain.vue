<script setup lang="ts">
import { ref } from "vue";

const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
const productionBlocked = () => uni.showModal({ title: "需链上验真服务", content: "正式环境只能展示后台/链上返回的存证和验真结果，当前未生成本地结论。", showCancel: false });

const kpis = [
  { n: "8,742 万", l: "累计上链存证(笔)" },
  { n: "3.1 亿", l: "上链主体 DID" },
  { n: "126", l: "智能合约(个)" },
  { n: "42 万", l: "日均上链(笔)" },
];

// 五大可信能力
const abilities = [
  { icon: "🔗", n: "数据存证", d: "农事/合约/交易/溯源关键数据哈希上链，防篡改、可验真", use: "全链路溯源 · 溯源验真" },
  { icon: "🆔", n: "分布式身份 DID", d: "法人/管理员/农户/组织链上唯一身份，人脸活体绑定", use: "法人实名 · 管理员核验" },
  { icon: "📜", n: "智能合约", d: "订单、独立服务费、赊销代扣和项目分配按生效合同执行并留痕", use: "推广服务费 · 项目分配" },
  { icon: "🔐", n: "隐私计算", d: "数据可用不可见，多方联合风控、联合建模不泄隐私", use: "供应链金融 · 智能风控" },
  { icon: "🌉", n: "跨链互通", d: "与政务链/金融链/监管链跨链互认，数据一次上链多方可信", use: "监管报送 · 数币结算" },
];

// 分层架构
const layers = [
  { t: "应用层", d: "生产 · 流通 · 信用 · 民生 · 跨境", c: "#16884c" },
  { t: "能力中台", d: "存证 · DID · 智能合约 · 隐私计算 · 数币结算 · 跨链", c: "#2b6cb0" },
  { t: "双链底座", d: "长安链(存证监管·国密) + Conflux 树图链(交易流转·6000+TPS)", c: "#7c3aed" },
  { t: "信创设施", d: "国产算力 · 国密算法 · 后量子安全 · 等保三级", c: "#5a6270" },
];

// 实时上链流水（逐条出现）
const feed = [
  { t: "农事打卡上链", who: "范庄合作社", hash: "0x9fd1…0a" },
  { t: "订单合约存证", who: "OA-2026-0781", hash: "0x71a2…c3" },
  { t: "推广服务费分配示例", who: "江西信丰范庄村集体电商", hash: "0xc3d9…22" },
  { t: "溯源节点写入", who: "赣南脐橙 F-0781", hash: "0xb7e5…91" },
  { t: "法人人脸核验", who: "did:legal:9f38", hash: "0xd4ea…5f" },
  { t: "电子仓单登记", who: "粮食银行 GB-0087", hash: "0xe5fb…8c" },
  { t: "冷链温度存证", who: "统配车 TJ-A12", hash: "0xf6ac…d1" },
];
const shown = ref(0);
const running = ref(false);
function runFeed() { running.value = true; shown.value = 0; const t = setInterval(() => { shown.value++; if (shown.value >= feed.length) clearInterval(t); }, 460); }

function verify() {
  if (productionBuild) return productionBlocked();
  uni.showModal({ title: "存证验真", confirmText: "验真",
    content: "输入交易哈希 0xc3d9…22\n链：长安链 ChainMaker · 区块 #3,182,940\n内容：推广服务费分配示例记录\n结果：✔ 数据一致、未被篡改、时间戳可信。" });
}
function contract() {
  uni.showModal({ title: "智能合约 · 自动执行", showCancel: false, confirmText: "知道了",
    content: "示例：推广佣金规则\n触发：小端产生且已验收推广服务费\n执行：按约定平台4:组织6分账 → 组织实发按考核系数调整 → 约定份额进入集体分红\n须经授权、验收和银行执行；争议可暂停、申诉并依法更正，且不得与货款或其他服务费重复提取。" });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🛡️ 可信数字底座</text>
      <text class="hs">国家自主可控 · 双链协同 · 全平台数据上链存证</text>
      <view class="kpis">
        <view class="k" v-for="x in kpis" :key="x.l"><text class="kn">{{ x.n }}</text><text class="kl">{{ x.l }}</text></view>
      </view>
    </view>

    <view class="intro">前面所有板块说的「存证 / 哈希 / DID / 数字化履约规则」，都跑在这套底座上——<text class="em">关键数据可验证、可追溯、可验真，修订保留版本和授权记录</text>。</view>

    <!-- 分层架构 -->
    <view class="sec">技术架构 · 四层</view>
    <view class="layers">
      <view class="layer" v-for="(l, i) in layers" :key="l.t" :style="{ background: l.c }">
        <text class="ly-t">{{ l.t }}</text>
        <text class="ly-d">{{ l.d }}</text>
        <text v-if="i < layers.length - 1" class="ly-down">↓</text>
      </view>
    </view>

    <!-- 五大可信能力 -->
    <view class="sec">五大可信能力</view>
    <view class="ab" v-for="a in abilities" :key="a.n" @tap="a.n === '智能合约' ? contract() : verify()">
      <text class="ab-ic">{{ a.icon }}</text>
      <view class="ab-i">
        <text class="ab-n">{{ a.n }}</text>
        <text class="ab-d">{{ a.d }}</text>
        <text class="ab-u">🔌 应用：{{ a.use }}</text>
      </view>
    </view>

    <!-- 实时上链流水 -->
    <view class="sec-row"><text class="sec">实时上链存证流水</text><text class="demo" @tap="runFeed">查看流水</text></view>
    <view class="feed">
      <view class="fd" v-for="(f, i) in feed" :key="i" :class="{ on: running ? shown > i : true }">
        <view class="fd-dot"></view>
        <view class="fd-i"><text class="fd-t">{{ f.t }}</text><text class="fd-w">{{ f.who }}</text></view>
        <text class="fd-h">🔗 {{ f.hash }}</text>
      </view>
    </view>

    <!-- 自主可控 -->
    <view class="auto">
      <text class="au-t">🇨🇳 国家自主可控</text>
      <view class="au-chips"><text class="au-c">国密算法 SM2/3/4</text><text class="au-c">信创软硬件</text><text class="au-c">等保三级</text><text class="au-c">后量子安全</text><text class="au-c">数据不出境</text></view>
    </view>

    <view class="verify-btn" @tap="verify">🔍 输入哈希 · 一键存证验真</view>
    <view class="tip">🔗 底座采用「长安链 + Conflux 树图链」双链协同：长安链管存证与监管（国密）、树图链管高频交易流转（6000+ TPS）。全部国产自主、数据不出境，为生产-流通-信用-民生全链提供可信支撑。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #3b2a6b, #241640); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 36rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.9; margin-top: 8rpx; display: block; }
.kpis { display: flex; flex-wrap: wrap; margin-top: 20rpx; }
.k { width: 50%; text-align: center; padding: 10rpx 0; }
.kn { font-size: 30rpx; font-weight: 800; display: block; color: #c4b0ff; }
.kl { font-size: 19rpx; opacity: 0.85; }
.intro { margin: 24rpx; padding: 20rpx; background: #fff; border-left: 8rpx solid #7c3aed; border-radius: $sg-radius; font-size: 24rpx; color: $sg-text-2; line-height: 1.7; }
.intro .em { color: #7c3aed; font-weight: 700; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 24rpx; }
.demo { font-size: 24rpx; color: #7c3aed; background: #f0e9fe; padding: 8rpx 22rpx; border-radius: 999rpx; }
.layers { padding: 0 24rpx; }
.layer { border-radius: $sg-radius; padding: 18rpx 22rpx; margin-bottom: 26rpx; position: relative; }
.ly-t { font-size: 25rpx; font-weight: 800; color: #fff; }
.ly-d { font-size: 19rpx; color: rgba(255,255,255,0.85); margin-top: 4rpx; display: block; line-height: 1.4; }
.ly-down { position: absolute; bottom: -24rpx; left: 50%; transform: translateX(-50%); font-size: 24rpx; color: $sg-text-3; z-index: 1; }
.ab { display: flex; margin: 0 24rpx 14rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; }
.ab-ic { font-size: 44rpx; margin-right: 14rpx; }
.ab-i { flex: 1; display: flex; flex-direction: column; }
.ab-n { font-size: 26rpx; font-weight: 800; }
.ab-d { font-size: 20rpx; color: $sg-text-2; margin-top: 4rpx; line-height: 1.45; }
.ab-u { font-size: 19rpx; color: #7c3aed; margin-top: 6rpx; }
.feed { margin: 0 24rpx; background: #1a1030; border-radius: $sg-radius-lg; padding: 20rpx 22rpx; }
.fd { display: flex; align-items: center; padding: 12rpx 0; opacity: 0.25; transition: opacity 0.3s; }
.fd.on { opacity: 1; }
.fd-dot { width: 14rpx; height: 14rpx; border-radius: 50%; background: #7fe3a8; margin-right: 14rpx; flex-shrink: 0; box-shadow: 0 0 12rpx #7fe3a8; }
.fd-i { flex: 1; display: flex; flex-direction: column; }
.fd-t { font-size: 22rpx; color: #ece7fb; font-weight: 600; }
.fd-w { font-size: 18rpx; color: #9d8fc4; margin-top: 2rpx; }
.fd-h { font-size: 18rpx; color: #7fe3a8; font-family: Menlo, monospace; }
.auto { margin: 20rpx 24rpx 0; background: linear-gradient(135deg, #fdecec, #fff); border: 2rpx solid #f3c6c6; border-radius: $sg-radius-lg; padding: 22rpx; }
.au-t { font-size: 26rpx; font-weight: 800; color: #c0392b; }
.au-chips { display: flex; flex-wrap: wrap; gap: 10rpx; margin-top: 12rpx; }
.au-c { font-size: 20rpx; color: #c0392b; background: #fff; border: 2rpx solid #f3c6c6; padding: 6rpx 14rpx; border-radius: 999rpx; }
.verify-btn { margin: 20rpx 24rpx 0; text-align: center; padding: 24rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #7c3aed, #5b21b6); color: #fff; font-size: 26rpx; font-weight: 700; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
</style>
