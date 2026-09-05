<script setup lang="ts">
import { ref } from "vue";

// 三类党组织背书主体
const subjects = ref([
  { icon: "🌾", org: "江西省赣州市信丰县安西镇范庄村党支部", target: "农户", domain: "数智供社 B2B · 生产端", endorsed: 84, score: 82, grade: "A", dev: 1 },
  { icon: "🏘️", org: "天津市东丽区华明街道华明社区党支部", target: "社区居民 / 商户", domain: "数智供社 B2C", endorsed: 210, score: 76, grade: "B", dev: 3 },
  { icon: "🏢", org: "天津市东丽区军粮城镇产业园党支部", target: "所属职工 / 会员企业", domain: "园区 · 单位", endorsed: 56, score: 88, grade: "A", dev: 0 },
]);
const gradeColor: Record<string, string> = { A: "#16884c", B: "#d99a2b", C: "#d64541" };
function gradeInfo(g: string) { return g === "A" ? "资格正常·可自主背书" : g === "B" ? "背书受限·须上级复核" : "暂停资格·取消背书人地位"; }
function subDetail(s: any) {
  uni.showModal({ title: s.org, showCancel: false, confirmText: "知道了",
    content: `背书对象：${s.target}（${s.domain}）\n已背书 ${s.endorsed} · 背书偏差 ${s.dev}\n背书信用 ${s.score} 分 · ${s.grade} 级\n${gradeInfo(s.grade)}` });
}

// 考核指标
const kpis = [
  { n: "背书准确率", w: 30, t: "背书评级与实际履约/客户评价一致率 ≥ 90%" },
  { n: "应背尽背覆盖率", w: 15, t: "辖内符合条件对象背书覆盖 ≥ 85%" },
  { n: "履约带动", w: 20, t: "所背对象合格供货 / 守约率" },
  { n: "违规连带（反向）", w: 20, t: "所背对象违约 / 失信次数越多，扣分越重" },
  { n: "社会贡献", w: 0, t: "单独展示公共价值，不折算企业经营信用" },
];

// 奖惩
const rewards = ["事实核验标识", "适配资源推荐", "评优候选参考", "背书责任范围留痕"];
const punish = ["背书失准连带扣分", "背书受限（须上级复核后生效）", "暂停 / 取消背书资格与背书人地位", "通报批评、黑榜公示"];

// 红黑榜
const red = ["天津东丽军粮城镇产业园党支部 · 88 分 · 零偏差", "江西信丰安西镇范庄村党支部 · 82 分 · 带动增收突出"];
const black = ["某村党支部 · 58 分 · 背书资格已暂停", "某社区党支部 · 预警 · 背书偏差偏高"];
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🚩 党组织信用背书体系</text>
      <text class="hs">村 / 社区 / 企事业单位党支部背书 · 社会贡献值 · 考核与奖惩</text>
    </view>

    <view class="intro">党组织为所属对象作信用背书——<text class="em">谁背书谁担保、权责对等</text>；背书准不准、带动好不好，全部纳入<text class="em">考核奖惩</text>，背错连带、屡错失格。</view>

    <!-- 三类背书主体 -->
    <view class="sec">三类党组织背书主体</view>
    <view class="sub" v-for="s in subjects" :key="s.org" @tap="subDetail(s)">
      <text class="s-ic">{{ s.icon }}</text>
      <view class="s-i">
        <text class="s-org">{{ s.org }}</text>
        <text class="s-m">背书 {{ s.target }} · {{ s.domain }}</text>
        <text class="s-d">已背书 {{ s.endorsed }} · 偏差 {{ s.dev }}</text>
      </view>
      <view class="s-r">
        <text class="s-score">{{ s.score }}</text>
        <text class="s-grade" :style="{ background: gradeColor[s.grade] }">{{ s.grade }} 级</text>
      </view>
    </view>

    <!-- 社会贡献值背书 -->
    <view class="sec">社会贡献值背书</view>
    <view class="contrib">
      <text class="cb-t">❤️ 党组织为成员的社会贡献背书</text>
      <view class="cb-chips"><text class="cb-c">志愿服务</text><text class="cb-c">公益帮扶</text><text class="cb-c">带动增收</text><text class="cb-c">应急保供</text><text class="cb-c">乡村治理</text></view>
      <text class="cb-s">党组织可核验其职责范围内的社会贡献事实并计入个人 / 组织<text class="cb-em">贡献档案</text>；该背书不替代KYB、合同履约、质量检测或金融机构独立授信。</text>
    </view>

    <!-- 考核指标 -->
    <view class="sec">背书人考核指标</view>
    <view class="sg-card">
      <view class="kpi" v-for="k in kpis" :key="k.n">
        <view class="k-top"><text class="k-n">{{ k.n }}</text><text class="k-w">{{ k.w }}%</text></view>
        <view class="k-bar"><view class="k-fill" :style="{ width: k.w * 3 + '%' }"></view></view>
        <text class="k-t">{{ k.t }}</text>
      </view>
    </view>

    <!-- 奖惩机制 -->
    <view class="sec">奖惩机制</view>
    <view class="rp">
      <view class="rp-col reward">
        <text class="rp-t">🏆 奖（背书优秀）</text>
        <text class="rp-i" v-for="r in rewards" :key="r">＋ {{ r }}</text>
      </view>
      <view class="rp-col punish">
        <text class="rp-t">⛔ 惩（背书失准）</text>
        <text class="rp-i" v-for="p in punish" :key="p">− {{ p }}</text>
      </view>
    </view>

    <!-- 红黑榜 -->
    <view class="sec">背书考核 · 红黑榜</view>
    <view class="board">
      <view class="bd red">
        <text class="bd-t">🔴 红榜（优秀背书组织）</text>
        <text class="bd-i" v-for="r in red" :key="r">· {{ r }}</text>
      </view>
      <view class="bd black">
        <text class="bd-t">⚫ 黑榜（失格 / 预警）</text>
        <text class="bd-i" v-for="b in black" :key="b">· {{ b }}</text>
      </view>
    </view>

    <view class="tip">🔗 各级党组织背书行为、考核得分、奖惩记录全程上链存证，接受党内监督与群众监督；背书失格自动收回背书权限，同步冻结相关授信/政策待遇。</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #c0392b, #922b21); padding: 34rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; line-height: 1.5; }
.intro { margin: 24rpx; padding: 20rpx; background: #fff; border-left: 8rpx solid #c0392b; border-radius: $sg-radius; font-size: 24rpx; color: $sg-text-2; line-height: 1.7; }
.intro .em { color: #c0392b; font-weight: 700; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.sub { display: flex; align-items: center; margin: 0 24rpx 12rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 20rpx; }
.s-ic { font-size: 44rpx; margin-right: 14rpx; }
.s-i { flex: 1; display: flex; flex-direction: column; }
.s-org { font-size: 27rpx; font-weight: 800; }
.s-m { font-size: 20rpx; color: $sg-text-2; margin-top: 4rpx; }
.s-d { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; }
.s-r { text-align: right; display: flex; flex-direction: column; align-items: flex-end; }
.s-score { font-size: 34rpx; font-weight: 800; color: $sg-primary-deep; }
.s-grade { font-size: 19rpx; color: #fff; padding: 2rpx 12rpx; border-radius: 999rpx; margin-top: 4rpx; font-weight: 700; }
.contrib { margin: 0 24rpx; background: linear-gradient(135deg, #fdeceb, #fff); border: 2rpx solid #f3c9c5; border-radius: $sg-radius-lg; padding: 22rpx; }
.cb-t { font-size: 25rpx; font-weight: 800; color: #c0392b; }
.cb-chips { display: flex; flex-wrap: wrap; gap: 10rpx; margin: 12rpx 0; }
.cb-c { font-size: 20rpx; color: #c0392b; background: #fff; border: 2rpx solid #f3c9c5; padding: 5rpx 14rpx; border-radius: 999rpx; }
.cb-s { font-size: 21rpx; color: $sg-text-2; line-height: 1.6; display: block; }
.cb-em { color: #c0392b; font-weight: 700; }
.sg-card { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; }
.kpi { padding: 12rpx 0; border-top: 2rpx solid $sg-bg; }
.kpi:first-child { border-top: none; }
.k-top { display: flex; justify-content: space-between; align-items: baseline; }
.k-n { font-size: 24rpx; font-weight: 600; }
.k-w { font-size: 21rpx; color: #c0392b; font-weight: 700; }
.k-bar { height: 12rpx; background: $sg-bg; border-radius: 999rpx; margin: 8rpx 0; overflow: hidden; }
.k-fill { height: 100%; background: linear-gradient(90deg, #e05a4e, #c0392b); border-radius: 999rpx; }
.k-t { font-size: 19rpx; color: $sg-text-3; }
.rp { display: flex; gap: 14rpx; margin: 0 24rpx; }
.rp-col { flex: 1; border-radius: $sg-radius-lg; padding: 18rpx; }
.rp-col.reward { background: $sg-primary-light; }
.rp-col.punish { background: #fdeceb; }
.rp-t { font-size: 23rpx; font-weight: 800; display: block; margin-bottom: 8rpx; }
.rp-col.reward .rp-t { color: $sg-primary-deep; }
.rp-col.punish .rp-t { color: #c0392b; }
.rp-i { font-size: 19rpx; color: $sg-text-2; display: block; margin: 5rpx 0; line-height: 1.4; }
.board { margin: 0 24rpx; }
.bd { border-radius: $sg-radius-lg; padding: 18rpx 20rpx; margin-bottom: 12rpx; }
.bd.red { background: #fff3f2; border: 2rpx solid #f5c6c2; }
.bd.black { background: #f1f2f4; border: 2rpx solid #dcdfe4; }
.bd-t { font-size: 23rpx; font-weight: 800; display: block; margin-bottom: 6rpx; }
.bd.red .bd-t { color: #c0392b; }
.bd.black .bd-t { color: #3a4250; }
.bd-i { font-size: 21rpx; color: $sg-text-2; display: block; margin: 4rpx 0; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
</style>
