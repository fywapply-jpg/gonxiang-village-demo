<script setup lang="ts">
import { ref, computed } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

// 乡村振兴重点帮扶县 / 脱贫县 特产
interface County {
  key: string; prov: string; name: string; full: string; icon: string;
  goods: string; cert: string; annual: number; poor: number; note: string;
}
const counties: County[] = [
  { key: "yudu", prov: "江西", name: "于都县", full: "江西省赣州市于都县", icon: "🥬",
    goods: "于都富硒蔬菜 · 赣南脐橙 · 肉鸭", cert: "脱贫地区农副产品 · 832 平台",
    annual: 8600, poor: 1240, note: "中央苏区 · 长征出发地 · 定点帮扶" },
  { key: "lixian", prov: "甘肃", name: "礼县", full: "甘肃省陇南市礼县", icon: "🍎",
    goods: "礼县苹果 · 大黄 · 花椒", cert: "脱贫地区农副产品 · 消费帮扶专馆",
    annual: 6200, poor: 980, note: "陇南山地 · 苹果之乡 · 东西部协作" },
  { key: "weining", prov: "贵州", name: "威宁县", full: "贵州省毕节市威宁彝族回族苗族自治县", icon: "🥔",
    goods: "威宁高山冷凉蔬菜 · 马铃薯 · 苹果", cert: "脱贫地区农副产品 · 832 平台",
    annual: 7400, poor: 1560, note: "乌蒙高原 · 三膜马铃薯 · 对口帮扶" },
  { key: "hetian", prov: "新疆", name: "和田", full: "新疆和田地区", icon: "🌰",
    goods: "和田红枣 · 薄皮核桃 · 玫瑰花", cert: "脱贫地区农副产品 · 援疆消费帮扶",
    annual: 9100, poor: 2080, note: "昆仑山下 · 沙漠绿洲 · 援疆协作" },
  { key: "zhenxiong", prov: "云南", name: "镇雄县", full: "云南省昭通市镇雄县", icon: "🍄",
    goods: "镇雄天麻 · 竹笋 · 乌金猪", cert: "脱贫地区农副产品 · 消费帮扶专柜",
    annual: 5300, poor: 870, note: "乌蒙深山 · 天麻之乡 · 定点帮扶" },
];
const ci = ref(0);
const county = computed(() => counties[ci.value]);

// 团体采购测算
const amount = ref(50); // 万元
const perHousehold = 0.8; // 户均帮扶收购（万元/户·年）
const draw = computed(() => Math.round(amount.value / perHousehold)); // 带动脱贫户
const shareOfAnnual = computed(() => (amount.value / county.value.annual * 100).toFixed(1)); // 占县年帮扶销比

// 采购主体（机关企事业单位团体采购）
const buyers = [
  { icon: "🏛️", n: "机关 / 国企食堂", d: "脱贫地区农产品采购不低于食堂食材 15%（预留比例）" },
  { icon: "🎁", n: "工会福利 / 节日慰问", d: "以购代捐、以买代帮，优先采购帮扶馆产品" },
  { icon: "🍱", n: "团餐 / 校餐 / 军供", d: "定向对接帮扶县合作社，稳定订单包销" },
];

// 防"假帮扶"
const guard = [
  { icon: "🔍", t: "产地真伪核验", d: "扫码溯源核验确为帮扶县产地、非贴牌冒充" },
  { icon: "💰", t: "资金真到农户", d: "按生效帮扶合同和验收回单分账，采购款经监管账户直达约定收款主体" },
  { icon: "📊", t: "成效阳光公示", d: "帮扶采购额、带动户数、户均增收上链公示、可核查" },
];

// 平台累计成效
const impact = { total: "3.86 亿", counties: 46, households: "4.82 万", income: "8600" };

function nav(url: string) { uni.navigateTo({ url }); }
function order() {
  if (productionBuild) return uni.showModal({ title: "需后台采购需求", content: "正式环境消费帮扶采购意向必须绑定采购主体、预算、帮扶产地核验和审批凭证；当前未提交本地意向。", showCancel: false });
  uni.showModal({
    title: "团体采购 · 消费帮扶", confirmText: "提交采购意向",
    content: `帮扶县：${county.value.full}\n采购金额：¥${amount.value} 万\n预计带动脱贫户：约 ${draw.value} 户\n户均增收：约 ¥${(perHousehold * 10000).toLocaleString()}\n\n采购款经监管账户按生效合同、验收和结算回单分账；比例以项目台账为准，成效上链公示、可核查。`,
    success: (r) => { if (r.confirm) uni.showToast({ title: "采购意向已提交", icon: "success" }); },
  });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🤝 消费帮扶 · 乡村振兴</text>
      <text class="hs">供销社是消费帮扶主渠道——把脱贫地区、乡村振兴重点帮扶县的好货，直供机关企事业单位。以购代捐、以买代帮，带动脱贫户稳定增收。</text>
    </view>

    <!-- 采购主体政策 -->
    <view class="sec">谁来买 · 帮扶采购政策</view>
    <view class="buyers">
      <view class="by" v-for="b in buyers" :key="b.n">
        <text class="by-ic">{{ b.icon }}</text>
        <view class="by-i"><text class="by-n">{{ b.n }}</text><text class="by-d">{{ b.d }}</text></view>
      </view>
    </view>

    <!-- 帮扶县 -->
    <view class="sec">帮扶县 · 一县一馆</view>
    <scroll-view scroll-x class="counties">
      <view class="ct" :class="{ on: ci === i }" v-for="(c, i) in counties" :key="c.key" @tap="ci = i">
        <text class="ct-ic">{{ c.icon }}</text>
        <text class="ct-n">{{ c.prov }}·{{ c.name }}</text>
      </view>
    </scroll-view>

    <view class="county">
      <view class="cy-hd"><text class="cy-ic">{{ county.icon }}</text><view class="cy-hi"><text class="cy-n">{{ county.full }}</text><text class="cy-note">{{ county.note }}</text></view></view>
      <view class="cy-goods">🧺 {{ county.goods }}</view>
      <view class="cy-tags"><text class="cy-tag">{{ county.cert }}</text></view>
      <view class="cy-stat">
        <view class="cs"><text class="cs-v">{{ (county.annual / 10000).toFixed(2) }} 亿</text><text class="cs-l">年帮扶销售额</text></view>
        <view class="cs"><text class="cs-v">{{ county.poor }} 户</text><text class="cs-l">带动脱贫户</text></view>
      </view>
    </view>

    <!-- 团体采购测算 -->
    <view class="sec">团体采购 · 助农成效测算</view>
    <view class="calc">
      <view class="cl-in"><text class="cl-l">本单团体采购金额（万元）</text><input class="cl-input" type="number" v-model.number="amount" /></view>
      <view class="cl-out">
        <view class="co"><text class="co-v red">{{ draw }} 户</text><text class="co-l">带动脱贫户</text></view>
        <view class="co"><text class="co-v gold">¥8,000</text><text class="co-l">户均增收/年</text></view>
        <view class="co"><text class="co-v green">{{ shareOfAnnual }}%</text><text class="co-l">占该县年帮扶销</text></view>
      </view>
      <text class="cl-note">💡 按户均帮扶收购 ¥8,000/户·年 测算：一笔 ¥{{ amount }} 万采购，就能让约 {{ draw }} 户脱贫户手里的农产品卖出去、有稳定进账。</text>
      <view class="cl-btn" @tap="order">提交团体采购意向 · 直达 {{ county.name }} 合作社</view>
    </view>

    <!-- 防假帮扶 -->
    <view class="sec">真帮扶 · 防"假帮扶"</view>
    <view class="guard">
      <view class="gd" v-for="g in guard" :key="g.t">
        <text class="gd-ic">{{ g.icon }}</text>
        <view class="gd-i"><text class="gd-t">{{ g.t }}</text><text class="gd-d">{{ g.d }}</text></view>
      </view>
    </view>

    <!-- 平台累计成效 -->
    <view class="impact">
      <text class="im-t">📊 平台消费帮扶累计成效</text>
      <view class="im-row">
        <view class="im"><text class="im-v">¥{{ impact.total }}</text><text class="im-l">帮扶采购额</text></view>
        <view class="im"><text class="im-v">{{ impact.counties }} 个</text><text class="im-l">覆盖帮扶县</text></view>
        <view class="im"><text class="im-v">{{ impact.households }}</text><text class="im-l">带动脱贫户</text></view>
        <view class="im"><text class="im-v">¥{{ impact.income }}</text><text class="im-l">户均增收</text></view>
      </view>
    </view>

    <!-- 关联 -->
    <view class="links">
      <view class="lk" @tap="nav('/pages/trace/fullchain')"><text class="lk-ic">🔍</text><view class="lk-i"><text class="lk-t">帮扶产品全链路溯源</text><text class="lk-d">扫码核验确为帮扶县产地、资金真到农户</text></view><text class="lk-go">›</text></view>
      <view class="lk" @tap="nav('/pages/alliance/index')"><text class="lk-ic">🤝</text><view class="lk-i"><text class="lk-t">采购款分账 · 按合同执行</text><text class="lk-d">合同、验收、发票与结算回单齐全后，按项目台账分账</text></view><text class="lk-go">›</text></view>
      <view class="lk" @tap="nav('/pages/cert/index')"><text class="lk-ic">🏅</text><view class="lk-i"><text class="lk-t">脱贫地区农副产品认证</text><text class="lk-d">832 平台 / 消费帮扶专馆 认定证书</text></view><text class="lk-go">›</text></view>
    </view>

    <view class="tip">🔗 消费帮扶是供销社的政治责任与主业担当:机关企事业单位食堂预留比例采购、工会福利以购代帮,把脱贫地区和乡村振兴重点帮扶县的农产品稳定包销出去。全程扫码溯源防"贴牌假帮扶"、共赢分账保证钱真到脱贫户、成效上链阳光公示——让每一笔采购都真金白银带动增收、巩固脱贫成果。</view>
  </view>
</template>

<style lang="scss" scoped>
.sg-page { padding-bottom: 40rpx; }
.hero { background: linear-gradient(160deg, #c0392b, #96271b); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.95; margin-top: 8rpx; display: block; line-height: 1.6; }
.sec { font-size: 28rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.buyers { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 8rpx 22rpx; }
.by { display: flex; align-items: flex-start; padding: 14rpx 0; border-top: 2rpx solid $sg-bg; }
.by:first-child { border-top: none; }
.by-ic { font-size: 36rpx; margin-right: 14rpx; flex: none; }
.by-i { flex: 1; display: flex; flex-direction: column; }
.by-n { font-size: 25rpx; font-weight: 700; }
.by-d { font-size: 20rpx; color: $sg-text-2; margin-top: 3rpx; line-height: 1.5; }
.counties { white-space: nowrap; padding: 0 24rpx; }
.ct { display: inline-flex; flex-direction: column; align-items: center; background: #fff; border-radius: $sg-radius; box-shadow: $sg-shadow; padding: 16rpx 22rpx; margin-right: 14rpx; border: 3rpx solid transparent; }
.ct.on { border-color: #c0392b; background: #fdeceb; }
.ct-ic { font-size: 38rpx; }
.ct-n { font-size: 21rpx; font-weight: 700; margin-top: 4rpx; }
.county { margin: 16rpx 24rpx 0; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.cy-hd { display: flex; align-items: center; }
.cy-ic { font-size: 48rpx; margin-right: 14rpx; }
.cy-hi { flex: 1; display: flex; flex-direction: column; }
.cy-n { font-size: 25rpx; font-weight: 800; line-height: 1.35; }
.cy-note { font-size: 19rpx; color: $sg-text-3; margin-top: 3rpx; }
.cy-goods { font-size: 23rpx; font-weight: 600; margin: 14rpx 0 8rpx; }
.cy-tags { display: flex; flex-wrap: wrap; gap: 10rpx; }
.cy-tag { font-size: 19rpx; color: #c0392b; background: #fdeceb; padding: 4rpx 14rpx; border-radius: 999rpx; }
.cy-stat { display: flex; margin-top: 14rpx; padding-top: 14rpx; border-top: 2rpx solid $sg-bg; }
.cs { flex: 1; display: flex; flex-direction: column; align-items: center; }
.cs-v { font-size: 28rpx; font-weight: 800; color: #c0392b; }
.cs-l { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; }
.calc { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.cl-in { display: flex; flex-direction: column; }
.cl-l { font-size: 22rpx; color: $sg-text-3; }
.cl-input { font-size: 40rpx; font-weight: 800; color: $sg-text; margin-top: 6rpx; border-bottom: 2rpx solid $sg-border; padding-bottom: 6rpx; }
.cl-out { display: flex; margin: 18rpx 0 12rpx; }
.co { flex: 1; display: flex; flex-direction: column; align-items: center; }
.co-v { font-size: 30rpx; font-weight: 800; }
.co-v.red { color: #c0392b; }
.co-v.gold { color: #d99a2b; }
.co-v.green { color: #16884c; }
.co-l { font-size: 18rpx; color: $sg-text-3; margin-top: 3rpx; }
.cl-note { display: block; font-size: 20rpx; color: $sg-text-2; background: #fdeceb; border-radius: $sg-radius; padding: 14rpx 16rpx; line-height: 1.6; }
.cl-btn { margin-top: 14rpx; text-align: center; padding: 22rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, #c0392b, #96271b); color: #fff; font-size: 25rpx; font-weight: 700; }
.guard { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 8rpx 22rpx; }
.gd { display: flex; align-items: flex-start; padding: 14rpx 0; border-top: 2rpx solid $sg-bg; }
.gd:first-child { border-top: none; }
.gd-ic { font-size: 34rpx; margin-right: 14rpx; flex: none; }
.gd-i { flex: 1; display: flex; flex-direction: column; }
.gd-t { font-size: 24rpx; font-weight: 700; }
.gd-d { font-size: 19rpx; color: $sg-text-2; margin-top: 3rpx; line-height: 1.5; }
.impact { margin: 20rpx 24rpx 0; background: linear-gradient(135deg, #fdeceb, #fff); border: 2rpx solid #f2cdc8; border-radius: $sg-radius-lg; padding: 22rpx; }
.im-t { font-size: 24rpx; font-weight: 700; display: block; margin-bottom: 14rpx; }
.im-row { display: flex; }
.im { flex: 1; display: flex; flex-direction: column; align-items: center; }
.im-v { font-size: 26rpx; font-weight: 800; color: #c0392b; }
.im-l { font-size: 18rpx; color: $sg-text-3; margin-top: 3rpx; text-align: center; }
.links { margin: 20rpx 24rpx 0; }
.lk { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; margin-bottom: 12rpx; }
.lk-ic { width: 64rpx; height: 64rpx; border-radius: 18rpx; background: #fdeceb; display: flex; align-items: center; justify-content: center; font-size: 34rpx; margin-right: 14rpx; flex: none; }
.lk-i { flex: 1; display: flex; flex-direction: column; }
.lk-t { font-size: 25rpx; font-weight: 700; }
.lk-d { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; }
.lk-go { font-size: 30rpx; color: $sg-text-3; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
</style>
