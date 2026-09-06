<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { recordPlatformEvent } from "@/services/localApi";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

// 支持两类溯源：植物源（脐橙，默认）/ 动物源（生猪）
type TraceType = "produce" | "meat";
const type = ref<TraceType>("produce");
onLoad((q) => { if (q?.type === "meat") type.value = "meat"; });

const datasets: Record<TraceType, { traceId: string; emoji: string; name: string; batch: string; chain: any[]; recallHint: string }> = {
  produce: {
    traceId: "SP-2025-0781-GN", emoji: "🍊", name: "赣南脐橙", batch: "批次 F-0781 · 320 亩",
    recallHint: "输入批次 F-0781，系统沿链倒查：定位到④采收/⑤分拣责任主体，锁定同批次流向的锦华连锁生鲜等 6 个小端，一键通知召回、暂停销售。",
    chain: [
      { icon: "🌱", stage: "① 产地合作社", who: "赣南脐橙合作社", time: "2025-03-10", data: "地块 GN-07 · 320 亩 · 订单农业签约", hash: "0x71a2…c3" },
      { icon: "🧪", stage: "② 农资投入", who: "农资集采 · 批次核验", time: "2025-03-12", data: "良种纽荷尔 + 有机复合肥 F-0781 · 一物一码验真", hash: "0x83c4…7e", link: "/pages/agri/inputs" },
      { icon: "🌾", stage: "③ 种植过程", who: "数字种植 · 农事打卡", time: "2025 · 03-12~10-05", data: "水肥一体、生物防治、5 次农事打卡上链", hash: "0x9fd1…0a", link: "/pages/digitalfarm/index" },
      { icon: "🧺", stage: "④ 采收", who: "合作社 · 分批采收", time: "2025-10-28", data: "糖度 13.5、果径 75mm、当日预冷", hash: "0xa2b8…4d" },
      { icon: "🏭", stage: "⑤ 分拣加工", who: "产地分拣中心", time: "2025-10-29", data: "分级清洗打蜡 · 农残全项合格 ✔ 检测报告", hash: "0xb7e5…91" },
      { icon: "🏬", stage: "⑥ 枢纽集散", who: "赣州国际农产品交易中心", time: "2025-10-30", data: "电子仓单 · 大宗撮合 · 价格发现", hash: "0xc3d9…22", link: "/pages/trade/markets" },
      { icon: "🚚", stage: "⑦ 冷链配送", who: "统仓统配 · 全程温控", time: "2025-10-31", data: "0~4℃ 全程温控 GPS · 未断链", hash: "0xd4ea…5f", link: "/pages/logistics/dispatch" },
      { icon: "🏪", stage: "⑧ 小端销售", who: "锦华连锁生鲜（深圳） / 数智供社店", time: "2025-11-01", data: "到铺号签收 · 上架零售", hash: "0xe5fb…8c" },
      { icon: "🧑", stage: "⑨ 消费者验真", who: "扫码溯源 · 一码溯全程", time: "实时", data: "扫码即见全链、验真、可评价可追溯", hash: "0xf6ac…d1" },
    ],
  },
  meat: {
    traceId: "SP-2025-0663-PIG", emoji: "🐖", name: "供享黑猪肉", batch: "耳标 3701·A0663 · 育肥出栏",
    recallHint: "输入耳标 A0663 / 屠宰批次 T-1102，系统沿链倒查：定位到②防疫/⑤定点屠宰责任主体，锁定同屠宰批次流向的 6 个小端与团餐央厨，一键通知下架召回。",
    chain: [
      { icon: "🐷", stage: "① 仔猪引种", who: "牧原代养合作社 · 一畜一档", time: "2025-05-06", data: "仔猪 320 头 · 电子耳标建档 · 种源检疫合格", hash: "0x61b2…a4" },
      { icon: "💉", stage: "② 防疫免疫", who: "乡镇兽医站 · 官方兽医", time: "2025 · 05-10~09-20", data: "口蹄疫/猪瘟/蓝耳 疫苗批次上链 · 非洲猪瘟检测阴性", hash: "0x72c3…b8", link: "/pages/digitalfarm/livestock" },
      { icon: "🌽", stage: "③ 数字养殖", who: "数字养殖 · 饲喂/环控", time: "2025 · 05-06~11-01", data: "无抗饲料批次 · 环控达标 · 兽药休药期满 7 天", hash: "0x83d4…0c", link: "/pages/digitalfarm/livestock" },
      { icon: "📋", stage: "④ 出栏检疫", who: "官方兽医 · 检疫合格证", time: "2025-11-02", data: "《动物检疫合格证明》A证 · 耳标核对 · 准宰", hash: "0x94e5…1d" },
      { icon: "🔪", stage: "⑤ 定点屠宰", who: "生猪定点屠宰厂 · 两章两证", time: "2025-11-02", data: "宰前静养/宰后检验 · 加盖检疫验讫章 · 瘦肉精抽检阴性", hash: "0xa5f6…2e" },
      { icon: "🏭", stage: "⑥ 分割冷链", who: "冷鲜分割中心", time: "2025-11-03", data: "白条分割排酸 · 0~4℃ 冷鲜 · 独立编码封装", hash: "0xb6a7…3f", link: "/pages/logistics/dispatch" },
      { icon: "🏬", stage: "⑦ 枢纽集散", who: "城市农批市场 · 肉类交易区", time: "2025-11-03", data: "冷链仓单 · 检疫票随货 · 大宗分销", hash: "0xc7b8…40", link: "/pages/trade/markets" },
      { icon: "🏪", stage: "⑧ 小端销售", who: "生鲜门店 / 团餐央厨 / 机关食堂", time: "2025-11-04", data: "到店索证索票 · 明码标价上架", hash: "0xd8c9…51" },
      { icon: "🧑", stage: "⑨ 消费者验真", who: "扫码溯源 · 一码溯全程", time: "实时", data: "扫码见养殖/防疫/检疫/屠宰全链，验真可追溯", hash: "0xe9da…62" },
    ],
  },
};

const ds = computed(() => datasets[type.value]);
const chain = computed(() => ds.value.chain);
const isMeat = computed(() => type.value === "meat");

const cur = ref(0);
const running = ref(false);
function run() { void recordPlatformEvent("trace", "PLAY_FULL_CHAIN", { type: type.value, trace_id: ds.value.traceId }).catch(() => {}); running.value = true; cur.value = 0; const t = setInterval(() => { cur.value++; if (cur.value >= chain.value.length) clearInterval(t); }, 420); }

function nodeTap(n: any) {
  if (n.link) return uni.navigateTo({ url: n.link });
  uni.showModal({ title: n.stage, showCancel: false, confirmText: "知道了", content: `主体：${n.who}\n时间：${n.time}\n${n.data}\n🔗 链上哈希 ${n.hash}` });
}
function switchType(t: TraceType) { type.value = t; running.value = false; cur.value = 0; }

function verify() {
  if (productionBuild) return uni.showModal({ title: "需要溯源核验服务", content: "正式环境的区块、检测、物流和召回状态必须由后台及链上服务返回，当前未生成验真结论。", showCancel: false });
  void recordPlatformEvent("trace", "VERIFY_TRACE", { type: type.value, trace_id: ds.value.traceId }).catch(() => {});
  uni.showModal({ title: "链上存证核验 ✔", showCancel: false, confirmText: "已验真",
    content: `长安链 ChainMaker\n区块高度：#3,182,940\n溯源码：${ds.value.traceId}\n上链时间：2025-11-05 06:12\n\n全链 9 节点数据一致、未被篡改。` });
}
function recall() {
  if (productionBuild) return uni.showModal({ title: "需要后台召回服务", content: "正式环境的召回指令必须绑定批次、责任主体、库存流向和审核岗位，并由后台下发，当前未执行召回。", showCancel: false });
  uni.showModal({ title: "责任倒查 · 一键召回", confirmText: "发起召回", content: ds.value.recallHint,
    success: (r) => { if (r.confirm) { void recordPlatformEvent("trace", "INITIATE_RECALL", { type: type.value, trace_id: ds.value.traceId }).catch(() => {}); uni.showToast({ title: "召回指令已下发", icon: "none" }); } } });
}
function report() {
  if (productionBuild) return uni.showModal({ title: "需要后台溯源凭证", content: "正式环境的溯源海报必须由后台根据授权批次和可公开字段生成，当前未生成文件。", showCancel: false });
  uni.showToast({ title: "溯源海报已生成，可分享", icon: "none" });
}
function toCert() { uni.navigateTo({ url: "/pages/cert/index" }); }
</script>

<template>
  <view class="sg-page">
    <view v-if="productionBuild" class="production-empty"><text class="production-empty-title">暂无后台溯源批次</text><text class="production-empty-text">正式环境只展示后台及链上返回的批次、检测、物流和召回证据；本地全链案例不会混入生产数据。</text></view>
    <template v-else>
    <view class="hero">
      <view class="h-top">
        <text class="he">{{ ds.emoji }}</text>
        <view class="hi"><text class="hn">{{ ds.name }} · 全链路溯源</text><text class="hb">{{ ds.batch }}</text><text class="hid">溯源码 {{ ds.traceId }}</text></view>
      </view>
      <text class="hs">一码溯全程 · {{ isMeat ? '从种苗到餐桌 · 养殖·防疫·检疫·屠宰全上链' : '从田头到餐桌 9 大环节全部上链' }}</text>
      <!-- 植物源 / 动物源 切换 -->
      <view class="tt">
        <text class="tt-b" :class="{ on: !isMeat }" @tap="switchType('produce')">🍊 植物源</text>
        <text class="tt-b" :class="{ on: isMeat }" @tap="switchType('meat')">🐖 动物源</text>
      </view>
    </view>

    <!-- 链上验真 -->
    <view class="verify" @tap="verify">
      <view class="v-l"><text class="v-ic">🔗</text><view class="v-i"><text class="v-t">长安链 ChainMaker · 已上链验真</text><text class="v-s">区块 #3,182,940 · 全链 9 节点未篡改</text></view></view>
      <text class="v-go">一键验真 ›</text>
    </view>

    <!-- 全链路时间轴 -->
    <view class="sec-row"><text class="sec">全链路 9 环节</text><text class="demo" @tap="run">查看流转</text></view>
    <view class="chain">
      <view class="node" v-for="(n, i) in chain" :key="i" :class="{ on: running ? cur > i : true }" @tap="nodeTap(n)">
        <view class="n-axis"><view class="n-dot" :class="{ on: running ? cur > i : true }">{{ n.icon }}</view><view v-if="i < chain.length - 1" class="n-line" :class="{ on: running ? cur > i + 1 : true }"></view></view>
        <view class="n-i">
          <view class="n-row"><text class="n-stage">{{ n.stage }}</text><text class="n-time">{{ n.time }}</text></view>
          <text class="n-who">{{ n.who }}</text>
          <text class="n-data">{{ n.data }}</text>
          <text class="n-hash">🔗 {{ n.hash }}<text v-if="n.link" class="n-link"> · 点开查看 ›</text></text>
        </view>
      </view>
    </view>

    <!-- 责任倒查 -->
    <view class="recall" @tap="recall">
      <text class="rc-ic">🛡️</text>
      <view class="rc-i"><text class="rc-t">责任倒查 · 一键召回</text><text class="rc-s">按{{ isMeat ? '耳标/屠宰批次' : '批次' }}沿链倒查责任主体，锁定流向、精准召回</text></view>
      <text class="rc-go">发起 ›</text>
    </view>

    <view class="acts">
      <view class="act" @tap="report">🖼️ 溯源海报</view>
      <view class="act" @tap="toCert">🏅 品质认证</view>
    </view>

    <view class="tip">🔗 {{ isMeat ? '一畜一码耳标、防疫免疫、检疫合格证、定点屠宰两章两证、冷链温控——每一环由官方兽医/屠宰厂/合作社上链存证，一码贯通「怎么养→打什么疫苗→谁检疫→哪宰的→卖给谁」，病害可倒查、可召回。' : '农资投入、农事打卡、检测报告、冷链温控、到铺号签收——每一环由对应主体上链存证，一码贯通「种什么→施什么→怎么运→卖给谁」，出问题可倒查、可召回。' }}</view>
    </template>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #2b6cb0, #1e4e8c); padding: 30rpx 28rpx 24rpx; color: #fff; }
.h-top { display: flex; align-items: center; }
.he { font-size: 80rpx; margin-right: 18rpx; }
.hi { display: flex; flex-direction: column; }
.hn { font-size: 32rpx; font-weight: 800; }
.hb { font-size: 22rpx; opacity: 0.9; margin: 4rpx 0; }
.hid { font-size: 20rpx; opacity: 0.75; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 14rpx; display: block; }
.tt { display: flex; gap: 14rpx; margin-top: 16rpx; }
.tt-b { flex: 1; text-align: center; padding: 12rpx 0; border-radius: 999rpx; background: rgba(255,255,255,0.18); font-size: 23rpx; font-weight: 700; color: rgba(255,255,255,0.9); }
.tt-b.on { background: #fff; color: #1e4e8c; }
.verify { display: flex; align-items: center; justify-content: space-between; margin: 20rpx 24rpx 0; padding: 20rpx 22rpx; background: linear-gradient(135deg, #eef6ff, #fff); border: 2rpx solid #d6e8fb; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; }
.v-l { display: flex; align-items: center; flex: 1; }
.v-ic { font-size: 40rpx; margin-right: 14rpx; }
.v-i { display: flex; flex-direction: column; }
.v-t { font-size: 25rpx; font-weight: 700; color: $sg-blue; }
.v-s { font-size: 19rpx; color: $sg-text-3; margin-top: 4rpx; }
.v-go { font-size: 22rpx; color: $sg-blue; }
.sec { font-size: 30rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.sec-row { display: flex; align-items: center; justify-content: space-between; padding-right: 24rpx; }
.demo { font-size: 24rpx; color: $sg-blue; background: #e7f0f9; padding: 8rpx 22rpx; border-radius: 999rpx; }
.chain { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 24rpx 22rpx; }
.node { display: flex; opacity: 0.45; transition: opacity 0.3s; }
.node.on { opacity: 1; }
.n-axis { display: flex; flex-direction: column; align-items: center; margin-right: 18rpx; }
.n-dot { width: 60rpx; height: 60rpx; border-radius: 50%; background: $sg-bg; display: flex; align-items: center; justify-content: center; font-size: 32rpx; }
.n-dot.on { background: #e7f0f9; }
.n-line { flex: 1; width: 4rpx; background: $sg-border; min-height: 20rpx; margin: 4rpx 0; }
.n-line.on { background: $sg-blue; }
.n-i { flex: 1; display: flex; flex-direction: column; padding-bottom: 24rpx; }
.n-row { display: flex; align-items: baseline; justify-content: space-between; }
.n-stage { font-size: 26rpx; font-weight: 700; color: $sg-blue; }
.n-time { font-size: 19rpx; color: $sg-text-3; }
.n-who { font-size: 23rpx; font-weight: 600; margin-top: 4rpx; }
.n-data { font-size: 20rpx; color: $sg-text-2; margin-top: 4rpx; line-height: 1.4; }
.n-hash { font-size: 19rpx; color: $sg-blue; margin-top: 6rpx; }
.n-link { color: #c8871f; }
.recall { display: flex; align-items: center; margin: 20rpx 24rpx 0; padding: 22rpx; background: linear-gradient(135deg, #fdecec, #fff); border: 2rpx solid #f3c6c6; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; }
.rc-ic { font-size: 42rpx; margin-right: 14rpx; }
.rc-i { flex: 1; display: flex; flex-direction: column; }
.rc-t { font-size: 26rpx; font-weight: 800; color: #c0392b; }
.rc-s { font-size: 19rpx; color: $sg-text-3; margin-top: 4rpx; }
.rc-go { font-size: 23rpx; color: #c0392b; }
.acts { display: flex; gap: 20rpx; margin: 20rpx 24rpx 0; }
.act { flex: 1; text-align: center; padding: 22rpx 0; background: #fff; border-radius: 999rpx; box-shadow: $sg-shadow; font-size: 25rpx; font-weight: 600; color: $sg-blue; }
.tip { margin: 20rpx 24rpx 30rpx; font-size: 21rpx; color: $sg-text-3; line-height: 1.6; }
</style>
