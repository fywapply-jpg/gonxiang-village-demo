<script setup lang="ts">
import { ref } from "vue";
import { onShow } from "@dcloudio/uni-app";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

const filed = ref(false);        // 是否已完成保供备案
const emergency = ref(false);    // 应急响应是否激活

onShow(() => { filed.value = uni.getStorageSync("bgFiled") === "approved"; });

const items = [
  { name: "潍坊大白菜", emoji: "🥬", qty: "储备 300 吨", area: "山东·潍坊", note: "统仓统配，48h 直达销区" },
  { name: "寿光番茄", emoji: "🍅", qty: "储备 80 吨", area: "山东·寿光", note: "保供绿色通道" },
  { name: "内蒙古土豆", emoji: "🥔", qty: "储备 500 吨", area: "内蒙·乌兰察布", note: "耐储保供品种" },
];

const flow = [
  { t: "自愿提交备案申请", d: "企业按意愿申请成为保供单位" },
  { t: "资质与产能核验", d: "核验营业执照、品类、储备与配送能力" },
  { t: "签署保供承诺书", d: "承诺应急时优先响应、平价保供" },
  { t: "纳入保供名录", d: "上链存证，享补贴/优先调度/运力保障" },
  { t: "应急一键激活", d: "预案启动，已备案企业自动优先参与" },
];

const principles = [
  "自愿加入：平时自主申请备案，不强制",
  "应急优先：预案启动后，已备案企业须优先参与保供任务",
  "平价保供：执行政府指导价，不得囤积居奇、哄抬价格",
  "政策保障：享保供补贴、绿色通道、优先冷链运力",
];

function file() { uni.navigateTo({ url: "/pages/emergency/apply" }); }
function subsidy() { uni.navigateTo({ url: "/pages/emergency/subsidy" }); }
function task() { uni.navigateTo({ url: "/pages/emergency/task" }); }
function toggleEmergency() {
  if (productionBuild) return uni.showModal({ title: "需后台应急指挥权限", content: "正式环境启动或解除应急响应必须由授权指挥岗位操作，并写入预案、时间和审计记录；当前未切换本地状态。", showCancel: false });
  emergency.value = !emergency.value;
  uni.showToast({ title: emergency.value ? "应急响应已激活" : "应急响应已解除", icon: "none" });
}
function join(n: string) {
  if (productionBuild) return uni.showModal({ title: "需后台保供调度", content: `「${n}」对接申请必须校验备案主体、产能、运力和指导价；当前未提交本地申请。`, showCancel: false });
  uni.showModal({ title: "应急保供对接", content: `参与「${n}」保供调度？将由供销体系统一撮合配送。`,
    confirmText: "一键对接", success: (r) => { if (r.confirm) uni.showToast({ title: "对接申请已提交", icon: "success" }); } });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero" :class="{ active: emergency }">
      <text class="ht">{{ emergency ? "🔴 应急响应中" : "🆘 应急保供专区" }}</text>
      <text class="hs">政策保供 · 统仓统配 · 平价直供 · 全国一张网调度</text>
      <view class="toggle" @tap="toggleEmergency">{{ emergency ? "解除应急响应" : "启动应急核验" }}</view>
    </view>

    <!-- 我的保供备案 -->
    <view class="sg-card filing" :class="{ done: filed }">
      <block v-if="!filed">
        <view class="fl-top"><text class="fl-t">自愿参与保供备案</text><text class="fl-tag">未备案</text></view>
        <text class="fl-s">企业自愿申请成为保供单位，享补贴、绿色通道与优先运力；应急时按承诺优先参与，参与成本由政府依法合理补偿。</text>
        <view class="fl-btn" @tap="file">去备案申请</view>
      </block>
      <block v-else>
        <view class="fl-top"><text class="fl-t">✔ 已备案保供单位</text><text class="fl-tag ok">已备案</text></view>
        <view class="fl-rows">
          <view class="fr"><text class="fk">备案编号</text><text class="fv">BG-2026-0781</text></view>
          <view class="fr"><text class="fk">承诺品类</text><text class="fv">果蔬 / 粮油</text></view>
          <view class="fr"><text class="fk">承诺储备</text><text class="fv">≥ 200 吨 · 日配 30 吨</text></view>
          <view class="fr"><text class="fk">响应等级</text><text class="fv">一级 · 优先响应</text></view>
        </view>
        <text class="fl-chain">🔗 保供承诺书已上链存证</text>
        <view class="fl-acts">
          <view class="fl-act" @tap="file">查看/变更备案</view>
          <view class="fl-act primary" @tap="subsidy">保供补贴申领</view>
        </view>
      </block>
    </view>

    <!-- 应急激活后：已备案企业自动优先参与 -->
    <view v-if="emergency && filed" class="task">
      <view class="tk-top"><text class="tk-t">📋 本次应急保供任务</text><text class="tk-badge">自动参与</text></view>
      <text class="tk-d">依据保供承诺，您已被自动纳入本次保供任务，无需申请、优先参与。</text>
      <view class="tk-rows">
        <view class="tkr"><text class="tkk">任务</text><text class="tkv">销区蔬菜保供 · 调拨 50 吨</text></view>
        <view class="tkr"><text class="tkk">时限</text><text class="tkv">48 小时内到位</text></view>
        <view class="tkr"><text class="tkk">价格</text><text class="tkv">政府指导价 · 保供补贴</text></view>
      </view>
      <view class="tk-btn" @tap="task">查看征召令 · 接单调拨</view>
    </view>
    <view v-else-if="emergency && !filed" class="hint-file">
      ⚠️ 应急响应中。您尚未备案，无法自动参与保供任务，可先完成自愿备案。
    </view>

    <!-- 备案与响应流程 -->
    <view class="sec">备案与响应流程</view>
    <view class="sg-card">
      <view class="step" v-for="(s, i) in flow" :key="i">
        <view class="s-no">{{ i + 1 }}</view>
        <view class="s-i"><text class="s-t">{{ s.t }}</text><text class="s-d">{{ s.d }}</text></view>
      </view>
    </view>

    <!-- 合规原则 -->
    <view class="sec">保供合规原则</view>
    <view class="sg-card">
      <view class="pr" v-for="(p, i) in principles" :key="i"><text class="pr-dot">✔</text><text class="pr-t">{{ p }}</text></view>
    </view>

    <!-- 保供储备物资 -->
    <view class="sec">保供储备物资</view>
    <view class="card" v-for="it in items" :key="it.name">
      <text class="e">{{ it.emoji }}</text>
      <view class="body">
        <text class="nm">{{ it.name }}</text>
        <text class="meta">{{ it.area }} · {{ it.qty }}</text>
        <text class="note">{{ it.note }}</text>
      </view>
      <view class="btn" @tap="join(it.name)">一键对接</view>
    </view>
    <view class="tip">应急保供订单享绿色通道、优先冷链运力与保供补贴</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, $sg-red, #b5322e); padding: 40rpx 28rpx 30rpx; color: #fff; }
.hero.active { background: linear-gradient(160deg, #e0342f, #8f1e1a); }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 22rpx; opacity: 0.9; margin-top: 6rpx; display: block; }
.toggle { margin-top: 20rpx; display: inline-block; background: rgba(255,255,255,0.2); padding: 12rpx 28rpx; border-radius: 999rpx; font-size: 23rpx; }

.filing { border: 2rpx solid #f0dcae; background: linear-gradient(135deg, #fff8ec, #fff); }
.filing.done { border-color: #bfe9d4; background: linear-gradient(135deg, #eafaf0, #fff); }
.fl-top { display: flex; align-items: center; justify-content: space-between; }
.fl-t { font-size: 28rpx; font-weight: 700; }
.fl-tag { font-size: 20rpx; color: #fff; background: $sg-text-3; padding: 2rpx 14rpx; border-radius: 999rpx; }
.fl-tag.ok { background: $sg-primary; }
.fl-s { font-size: 22rpx; color: $sg-text-2; margin: 12rpx 0 16rpx; display: block; line-height: 1.5; }
.fl-btn { text-align: center; padding: 20rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, $sg-red, #b5322e); color: #fff; font-size: 28rpx; font-weight: 700; }
.fl-rows { margin: 12rpx 0 8rpx; }
.fr { display: flex; padding: 8rpx 0; }
.fk { width: 140rpx; font-size: 23rpx; color: $sg-text-3; }
.fv { flex: 1; font-size: 24rpx; font-weight: 600; }
.fl-chain { font-size: 21rpx; color: $sg-blue; }
.fl-acts { display: flex; gap: 16rpx; margin-top: 16rpx; }
.fl-act { flex: 1; text-align: center; padding: 16rpx 0; border-radius: 999rpx; font-size: 25rpx; font-weight: 600; background: #eafaf0; color: $sg-primary; }
.fl-act.primary { background: linear-gradient(135deg, $sg-red, #b5322e); color: #fff; }

.task { margin: 20rpx 24rpx 0; background: linear-gradient(135deg, #fff0ef, #fff); border: 2rpx solid #f3c9c5; border-radius: $sg-radius-lg; padding: 24rpx; }
.tk-top { display: flex; align-items: center; justify-content: space-between; }
.tk-t { font-size: 28rpx; font-weight: 700; color: $sg-red; }
.tk-badge { font-size: 20rpx; color: #fff; background: $sg-red; padding: 3rpx 16rpx; border-radius: 999rpx; }
.tk-d { font-size: 22rpx; color: $sg-text-2; margin: 12rpx 0; display: block; line-height: 1.5; }
.tk-rows { margin-bottom: 16rpx; }
.tkr { display: flex; padding: 6rpx 0; }
.tkk { width: 100rpx; font-size: 22rpx; color: $sg-text-3; }
.tkv { flex: 1; font-size: 24rpx; }
.tk-btn { text-align: center; padding: 20rpx 0; border-radius: 999rpx; background: $sg-red; color: #fff; font-size: 28rpx; font-weight: 700; }
.hint-file { margin: 20rpx 24rpx 0; background: $sg-gold-light; color: #a8791b; font-size: 23rpx; padding: 18rpx 20rpx; border-radius: $sg-radius; }

.sec { padding: 26rpx 28rpx 12rpx; font-size: 28rpx; font-weight: 700; }
.step { display: flex; align-items: flex-start; padding: 12rpx 0; border-bottom: 2rpx solid $sg-border; }
.step:last-child { border-bottom: none; }
.s-no { width: 40rpx; height: 40rpx; border-radius: 50%; background: $sg-red; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 700; margin-right: 16rpx; flex-shrink: 0; }
.s-i { flex: 1; display: flex; flex-direction: column; }
.s-t { font-size: 25rpx; font-weight: 600; }
.s-d { font-size: 21rpx; color: $sg-text-3; margin-top: 2rpx; }
.pr { display: flex; align-items: flex-start; padding: 8rpx 0; }
.pr-dot { color: $sg-primary; margin-right: 12rpx; font-weight: 700; }
.pr-t { flex: 1; font-size: 24rpx; color: $sg-text-2; line-height: 1.5; }

.card { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 0 24rpx 16rpx; padding: 24rpx; }
.e { width: 100rpx; height: 100rpx; border-radius: $sg-radius; background: $sg-primary-light; display: flex; align-items: center; justify-content: center; font-size: 56rpx; margin-right: 20rpx; }
.body { flex: 1; display: flex; flex-direction: column; }
.nm { font-size: 28rpx; font-weight: 700; }
.meta { font-size: 22rpx; color: $sg-text-3; margin: 4rpx 0; }
.note { font-size: 22rpx; color: $sg-primary; }
.btn { padding: 16rpx 28rpx; background: $sg-red; color: #fff; border-radius: 999rpx; font-size: 26rpx; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; }
</style>
