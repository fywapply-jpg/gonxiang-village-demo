<script setup lang="ts">
import { reactive } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { traceBatch } from "@/mock";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

// 以扫码/跳转带入的溯源码为准（预览环境使用同一批脐橙数据，溯源码随扫码变化）
const b = reactive({ ...traceBatch });
onLoad((q) => { if (q && q.id) b.traceId = q.id; });

// 订单农业 + 数字种植 · 生产溯源（全程上链）
const prodTrace = {
  contract: { no: "OA-2025-0781", buyer: "锦华连锁生鲜（深圳）", seller: "赣南脐橙合作社", price: "≥ 4.2 元/斤 保底" },
  sop: "赣南脐橙种植标准 SOP-GN-2026",
  records: [
    { date: "2025-03-12", act: "播种 · 良种统供（纽荷尔）", by: "张有粮", hash: "0x71a2…c3" },
    { date: "2025-06-05", act: "灌溉补水 · 水肥一体 3h", by: "李丰收", hash: "0x83c4…7e" },
    { date: "2025-06-20", act: "生物农药防治（苦参碱·残留合规）", by: "李丰收", hash: "0x9fd1…0a" },
    { date: "2025-07-01", act: "膨大期施有机复合肥 16 吨（批次 F-0781）", by: "张有粮", hash: "0xa2b8…4d" },
    { date: "2025-10-25", act: "采收 · 分级 · 交付合作社", by: "赵满仓", hash: "0xb7e5…91" },
  ],
  iot: [["土壤墒情", "62%"], ["土壤 pH", "6.2"], ["积温", "达标"], ["农残检测", "全项合格 ✔"]],
};
function toContract() { uni.navigateTo({ url: "/pages/agri/contract" }); }
function toFarm() { uni.navigateTo({ url: "/pages/digitalfarm/index" }); }

function verify() {
  if (productionBuild) return uni.showModal({ title: "需要溯源核验服务", content: "正式环境只能展示后台/链上返回的区块和批次状态，当前未生成验真结论。", showCancel: false });
  uni.showModal({
    title: "链上存证核验 ✔", showCancel: false, confirmText: "已验真",
    content: `${b.chain.chainName}\n区块高度：${b.chain.block}\n交易哈希：${b.chain.hash}\n上链时间：${b.chain.time}\n\n数据一致，未被篡改。`,
  });
}
function poster() {
  if (productionBuild) return uni.showModal({ title: "需要后台溯源凭证", content: "正式环境的溯源海报必须由后台根据授权批次和可公开字段生成，当前未生成文件。", showCancel: false });
  uni.showToast({ title: "溯源海报已生成，可分享", icon: "none" });
}
function report() {
  if (productionBuild) return uni.showModal({ title: "需要后台举报服务", content: "正式环境的质量举报必须上传凭证、绑定批次并进入品控工单，当前未提交举报。", showCancel: false });
  uni.showModal({ title: "质量问题举报", content: "上传凭证后同步至品控部门处理，是否继续？",
    success: (r) => { if (r.confirm) uni.showToast({ title: "举报已提交", icon: "success" }); } });
}
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty"><text class="production-empty-title">暂无后台溯源档案</text><text class="production-empty-text">正式环境只展示后台或链上返回的授权批次、区块和检测证据；本地溯源案例不会混入生产数据。</text></view>
    <template v-else>
    <view class="head">
      <text class="he">{{ b.emoji }}</text>
      <view class="hi"><text class="hn">{{ b.product }}</text><text class="hb">{{ b.batch }}</text>
        <text class="hid">溯源码 {{ b.traceId }}</text></view>
    </view>

    <view class="verify sg-card" @tap="verify">
      <view class="sg-between">
        <view class="sg-row"><text class="vi">🔗</text><text class="vt">{{ b.chain.chainName }}</text></view>
        <text class="badge">✔ 已上链验真</text>
      </view>
      <view class="vgrid">
        <view class="vg"><text class="vk">区块高度</text><text class="vv">{{ b.chain.block }}</text></view>
        <view class="vg"><text class="vk">上链时间</text><text class="vv">{{ b.chain.time.slice(5) }}</text></view>
        <view class="vg full"><text class="vk">交易哈希</text><text class="vv hash">{{ b.chain.hash }}</text></view>
      </view>
      <text class="vtap">点击一键验真 ›</text>
    </view>

    <!-- 订单农业 + 数字种植 生产溯源 -->
    <view class="sg-card prod">
      <text class="pt">📑 订单农业 + 数字种植 · 生产溯源</text>
      <view class="prow link" @tap="toContract"><text class="pk">订单合约</text><text class="pv blue">{{ prodTrace.contract.no }} · {{ prodTrace.contract.seller }} → {{ prodTrace.contract.buyer }} ›</text></view>
      <view class="prow"><text class="pk">收购价</text><text class="pv">{{ prodTrace.contract.price }}</text></view>
      <view class="prow"><text class="pk">种植标准</text><text class="pv">{{ prodTrace.sop }}</text></view>

      <text class="psub">农事档案 · 打卡上链</text>
      <view class="rec" v-for="r in prodTrace.records" :key="r.hash">
        <text class="rec-d">{{ r.date }}</text>
        <view class="rec-i"><text class="rec-a">{{ r.act }}</text><text class="rec-m">打卡人 {{ r.by }} · 🔗 {{ r.hash }}</text></view>
      </view>

      <text class="psub">数字种植数据快照</text>
      <view class="iot">
        <view class="io" v-for="(x, i) in prodTrace.iot" :key="i"><text class="io-v">{{ x[1] }}</text><text class="io-k">{{ x[0] }}</text></view>
      </view>

      <view class="pbtns">
        <view class="pb" @tap="toContract">查看订单合约</view>
        <view class="pb ghost" @tap="toFarm">查看数字种植</view>
      </view>
    </view>

    <view class="timeline">
      <view class="stage" v-for="(s, i) in b.stages" :key="s.key">
        <view class="axis"><view class="node">{{ s.icon }}</view><view v-if="i < b.stages.length - 1" class="bar"></view></view>
        <view class="content">
          <text class="stt">{{ s.title }}</text>
          <view class="items">
            <view class="it" v-for="(it, j) in s.items" :key="j"><text class="ik">{{ it[0] }}</text><text class="iv">{{ it[1] }}</text></view>
          </view>
        </view>
      </view>
    </view>

    <view class="acts">
      <view class="act" @tap="poster">🖼️ 溯源海报</view>
      <view class="act warn" @tap="report">⚠️ 问题举报</view>
    </view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.head { display: flex; align-items: center; padding: 30rpx 28rpx; background: linear-gradient(160deg, $sg-primary, $sg-primary-deep); }
.he { font-size: 100rpx; margin-right: 20rpx; }
.hi { display: flex; flex-direction: column; color: #fff; }
.hn { font-size: 34rpx; font-weight: 800; }
.hb { font-size: 24rpx; opacity: 0.9; margin: 4rpx 0; }
.hid { font-size: 22rpx; opacity: 0.75; }
.verify { background: linear-gradient(135deg, #eef6ff, #fff); border: 2rpx solid #d6e8fb; }
.vi { margin-right: 8rpx; }
.vt { font-size: 27rpx; font-weight: 700; color: $sg-blue; }
.badge { font-size: 22rpx; color: #fff; background: $sg-primary; padding: 4rpx 14rpx; border-radius: 999rpx; }
.vgrid { display: flex; flex-wrap: wrap; margin-top: 16rpx; }
.vg { width: 50%; margin-bottom: 12rpx; display: flex; flex-direction: column; }
.vg.full { width: 100%; }
.vk { font-size: 22rpx; color: $sg-text-3; }
.vv { font-size: 26rpx; font-weight: 600; }
.vv.hash { font-size: 22rpx; color: $sg-blue; word-break: break-all; }
.vtap { font-size: 22rpx; color: $sg-blue; margin-top: 8rpx; display: block; }
.timeline { margin: 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 30rpx 24rpx; }
.stage { display: flex; }
.axis { display: flex; flex-direction: column; align-items: center; margin-right: 24rpx; }
.node { width: 72rpx; height: 72rpx; border-radius: 50%; background: $sg-primary-light; display: flex; align-items: center; justify-content: center; font-size: 38rpx; }
.bar { flex: 1; width: 4rpx; background: $sg-border; margin: 6rpx 0; }
.content { flex: 1; padding-bottom: 30rpx; }
.stt { font-size: 28rpx; font-weight: 700; color: $sg-primary; }
.items { margin-top: 10rpx; }
.it { display: flex; padding: 8rpx 0; }
.ik { width: 160rpx; color: $sg-text-3; font-size: 24rpx; }
.iv { flex: 1; font-size: 24rpx; }
.acts { display: flex; gap: 20rpx; margin: 0 24rpx; }
.act { flex: 1; text-align: center; padding: 24rpx 0; background: #fff; border-radius: 999rpx; box-shadow: $sg-shadow; font-size: 27rpx; font-weight: 600; color: $sg-primary; }
.act.warn { color: $sg-red; }

/* 生产溯源 */
.prod { border: 2rpx solid #d6e8fb; }
.pt { font-size: 27rpx; font-weight: 700; color: $sg-blue; display: block; margin-bottom: 12rpx; }
.prow { display: flex; padding: 12rpx 0; border-top: 2rpx solid $sg-border; }
.prow:first-of-type { border-top: none; }
.pk { width: 130rpx; font-size: 24rpx; color: $sg-text-3; }
.pv { flex: 1; font-size: 24rpx; }
.pv.blue { color: $sg-blue; font-weight: 600; }
.psub { display: block; font-size: 23rpx; font-weight: 700; margin: 18rpx 0 8rpx; }
.rec { display: flex; padding: 10rpx 0; border-top: 2rpx solid $sg-border; }
.rec-d { width: 90rpx; font-size: 22rpx; color: $sg-text-3; }
.rec-i { flex: 1; display: flex; flex-direction: column; }
.rec-a { font-size: 24rpx; font-weight: 600; }
.rec-m { font-size: 20rpx; color: $sg-blue; margin-top: 2rpx; }
.iot { display: flex; flex-wrap: wrap; }
.io { width: 25%; display: flex; flex-direction: column; align-items: center; padding: 12rpx 0; }
.io-v { font-size: 27rpx; font-weight: 800; color: $sg-primary; }
.io-k { font-size: 19rpx; color: $sg-text-3; margin-top: 2rpx; }
.pbtns { display: flex; gap: 20rpx; margin-top: 16rpx; }
.pb { flex: 1; text-align: center; padding: 18rpx 0; border-radius: 999rpx; font-size: 25rpx; font-weight: 600; background: $sg-blue; color: #fff; }
.pb.ghost { background: $sg-primary-light; color: $sg-primary; }
</style>
