<script setup lang="ts">
const overview = [
  { n: "22", l: "已落地", c: "#16884c" },
  { n: "8", l: "对接中", c: "#2b6cb0" },
  { n: "6", l: "上线前完成", c: "#d99a2b" },
];

// status: done 已落地 / ing 对接中 / todo 上线前完成
const groups = [
  { icon: "💰", title: "资金合规（守住金融红线）", items: [
    { t: "平台不触碰资金、不放贷、不设资金池", d: "只做信息撮合与技术服务", s: "done" },
    { t: "放款 / 结算走持牌金融机构", d: "全金融页统一标识", s: "done" },
    { t: "银行资金存管账户", d: "货款、保证金由银行存管", s: "ing" },
    { t: "持牌合作机构（银行 / 保理 / 支付）", d: "农行·邮储·农发行·持牌保理", s: "ing" },
  ]},
  { icon: "🔐", title: "数据与个人信息保护", items: [
    { t: "敏感信息单独同意、可拒绝、有替代", d: "人脸可改用短信验证码", s: "done" },
    { t: "人脸加密比对、不留存原始图像", s: "done" },
    { t: "数据不出境、等保三级", s: "ing" },
    { t: "个人信息保护影响评估（PIA）", s: "todo" },
  ]},
  { icon: "🔗", title: "区块链与存证", items: [
    { t: "关键数据存证可验真；修订保留版本、依据与授权记录", s: "done" },
    { t: "区块链信息服务备案（国家网信办）", d: "备案号公示位（待核发）", s: "todo" },
    { t: "CA 数字证书 + 可信时间戳对接", d: "现为界面示意", s: "ing" },
  ]},
  { icon: "📜", title: "电子合同 / 电子签名", items: [
    { t: "CA 实名签章 + 可信时间戳 + 上链存证", d: "符合《电子签名法》，可司法采信", s: "done" },
  ]},
  { icon: "🤝", title: "推广分销（反传销红线）", items: [
    { t: "仅一级佣金、不发展下线、不逐级返利", s: "done" },
    { t: "基于真实交易额、不收取任何入门费", s: "done" },
  ]},
  { icon: "📣", title: "广告与宣传合规", items: [
    { t: "无「国家级 / 最 / 第一」等极限词", s: "done" },
    { t: "比价「省 X%」保留可查依据", d: "全站宣传语法务终审", s: "ing" },
  ]},
  { icon: "🆘", title: "应急保供合规", items: [
    { t: "自愿备案，应急「优先参与」而非强制", s: "done" },
    { t: "参与成本由政府依法合理补偿", s: "done" },
  ]},
  { icon: "📋", title: "经营资质与专业意见", items: [
    { t: "食品经营 / 农产品质量安全 / 粮食流通等资质", s: "ing" },
    { t: "律师事务所专项合规意见", d: "正式上线前出具", s: "todo" },
  ]},
];

const label: Record<string, { t: string; c: string; bg: string }> = {
  done: { t: "✅ 已落地", c: "#16884c", bg: "#e8f5ee" },
  ing: { t: "🔵 对接中", c: "#2b6cb0", bg: "#e7f0f9" },
  todo: { t: "⏳ 上线前完成", c: "#b5791b", bg: "#fbf2e0" },
};
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🛡️ 合规公示中心</text>
      <text class="hs">依法合规 · 公开透明 · 接受监督</text>
      <view class="ov">
        <view class="o" v-for="x in overview" :key="x.l"><text class="on">{{ x.n }}</text><text class="ol">{{ x.l }}</text></view>
      </view>
    </view>

    <view class="intro">按《法律法规风险与合规测试报告》整改：<text class="em">措辞 / 开关层面已全部落地</text>，需外部对接的（银行存管、网信办备案、CA 证书、律所意见）已标注状态，<text class="em">正式上线前完成</text>。</view>

    <view class="grp" v-for="g in groups" :key="g.title">
      <view class="grp-hd"><text class="grp-ic">{{ g.icon }}</text><text class="grp-t">{{ g.title }}</text></view>
      <view class="it" v-for="(it, i) in g.items" :key="i">
        <view class="it-l">
          <text class="it-t">{{ it.t }}</text>
          <text v-if="it.d" class="it-d">{{ it.d }}</text>
        </view>
        <text class="it-s" :style="{ color: label[it.s].c, background: label[it.s].bg }">{{ label[it.s].t }}</text>
      </view>
    </view>

    <view class="disc">ℹ️ 本页为平台合规自查公示。正式证照、备案号、牌照、专业意见以监管机关核发与律所出具为准；平台坚持「不碰钱、不放贷、不承诺收益、不发展下线」四条底线。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #16884c, #0f6b3b); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 36rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.9; margin-top: 8rpx; display: block; }
.ov { display: flex; margin-top: 22rpx; }
.o { flex: 1; text-align: center; }
.on { font-size: 40rpx; font-weight: 800; display: block; }
.ol { font-size: 19rpx; opacity: 0.9; }
.intro { margin: 24rpx; padding: 20rpx; background: #fff; border-left: 8rpx solid $sg-primary; border-radius: $sg-radius; font-size: 23rpx; color: $sg-text-2; line-height: 1.7; }
.intro .em { color: $sg-primary; font-weight: 700; }
.grp { margin: 0 24rpx 16rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.grp-hd { display: flex; align-items: center; margin-bottom: 8rpx; }
.grp-ic { font-size: 34rpx; margin-right: 12rpx; }
.grp-t { font-size: 26rpx; font-weight: 800; }
.it { display: flex; align-items: flex-start; justify-content: space-between; padding: 14rpx 0; border-top: 2rpx solid $sg-bg; gap: 12rpx; }
.it-l { flex: 1; display: flex; flex-direction: column; }
.it-t { font-size: 23rpx; color: $sg-text; line-height: 1.4; }
.it-d { font-size: 19rpx; color: $sg-text-3; margin-top: 4rpx; }
.it-s { flex: none; font-size: 19rpx; font-weight: 700; padding: 6rpx 14rpx; border-radius: 999rpx; white-space: nowrap; }
.disc { margin: 8rpx 24rpx 30rpx; padding: 18rpx; background: #fff; border: 2rpx dashed $sg-border; border-radius: $sg-radius; font-size: 20rpx; color: $sg-text-3; line-height: 1.6; }
</style>
