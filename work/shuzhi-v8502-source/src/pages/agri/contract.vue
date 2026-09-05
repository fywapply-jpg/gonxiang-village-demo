<script setup lang="ts">
import { ref } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

// 以销定产链路（反向：先有销路 → 再定生产）
const chain = [
  { t: "销售端下单", d: "中央厨房 / 商超 锁量锁价", icon: "🛒" },
  { t: "平台反向定产", d: "拆解订单 → 匹配产地合作社", icon: "🔁" },
  { t: "定向农资 + 标准", d: "按合同定向支付合格供应商 / 农资可选 + 下发标准", icon: "🧪" },
  { t: "标准化种植", d: "按 SOP 种植 · 数字化管理 · 上链", icon: "🌱" },
  { t: "履约收购结算", d: "保底价收购 → 结算 → 分红", icon: "💰" },
];
const started = ref(false);
const step = ref(0);

const contract = {
  no: "OA-2026-0781", crop: "赣南脐橙", area: "320 亩",
  buyer: "沪上团餐中央厨房", lockQty: "600 吨", buyPrice: "≥ 4.2 元/斤 保底",
  prepay: "38.4 万", standard: "赣南脐橙种植标准 SOP-GN-2026",
};
const inputs = [
  { name: "有机复合肥", qty: "16 吨", note: "统配直供" },
  { name: "生物农药", qty: "按标准配给", note: "残留合规" },
  { name: "水肥一体设备", qty: "320 亩覆盖", note: "预付款采购" },
];

// 收购价机制（保底 + 随行就市 + 二次分红）
const priceModel = [
  { t: "保底价", v: "≥ 4.2 元/斤", d: "按生效合同、质量等级和允许浮动量执行" },
  { t: "随行就市", v: "市场价高于保底时按市场价", d: "行情好不让农户吃亏" },
  { t: "二次分红", v: "销售溢价 30% 返还", d: "合作社按供货贡献分红" },
];

// 农事履约任务（SOP 农事日历，可打卡上链）
const tasks = ref([
  { t: "春季修剪", date: "02-20", done: true },
  { t: "花期疏花疏果 · 保果", date: "04-10", done: true },
  { t: "膨大期增施钾肥", date: "07-05", done: false, cur: true },
  { t: "病虫害生物防治", date: "07-20", done: false },
  { t: "采收 · 分级 · 交付", date: "10-15", done: false },
]);
function checkTask(t: any) {
  if (t.done) return;
  if (productionBuild) return uni.showModal({ title: "需要农事记录服务", content: "正式环境的农事打卡必须上传现场证据、定位和时间信息，经授权岗位确认后才能作为履约凭证，当前未写入打卡。", showCancel: false });
  uni.showModal({ title: "农事打卡", content: `确认完成「${t.t}」并上传现场照片？完成记录上链，作为履约凭证。`,
    confirmText: "完成打卡", success: (r) => { if (r.confirm) { t.done = true; t.cur = false; uni.showToast({ title: "已打卡上链", icon: "success" }); } } });
}

// 履约保障
const guarantee = [
  { icon: "🛡️", t: "订单农业履约险", d: "按承保范围、免赔额、查勘结果与保险条款理赔" },
  { icon: "💰", t: "履约保证措施", d: "双方对等约定额度、上限、释放条件和违约处置" },
  { icon: "📜", t: "数字化履约条款", d: "满足授权条件后执行并全程留痕；争议与法定程序优先" },
];
function loan() { uni.navigateTo({ url: "/pages/finance/apply?name=%E8%AE%A2%E5%8D%95%E8%B4%B7" }); }
function toFarm() { uni.navigateTo({ url: "/pages/digitalfarm/index" }); }
function toPreseason() { uni.navigateTo({ url: "/pages/agri/preseason" }); }
function toFutures() { uni.navigateTo({ url: "/pages/agri/futures" }); }
function toSettle() { uni.navigateTo({ url: "/pages/agri/settle" }); }

function run() {
  started.value = true; step.value = 0;
  const timer = setInterval(() => {
    step.value++;
    if (step.value >= chain.length) clearInterval(timer);
  }, 500);
}
function prepay() {
  if (productionBuild) return uni.showModal({ title: "需要持牌结算服务", content: "正式环境的农资款只能按生效合同由银行/支付机构受托支付，平台不直接提交本地指令。", showCancel: false });
  uni.showModal({ title: "农资款定向支付", content: `采购方或主办银行按生效合同，将 ¥${contract.prepay} 定向支付至合格农资供应商或约定监管账户。平台仅校验条件并发送经授权指令，不垫资、不经手；生产方可选择符合标准的等效农资。`,
    confirmText: "提交指令", success: (r) => { if (r.confirm) uni.showToast({ title: "指令已提交待机构确认", icon: "success" }); } });
}
function standard() {
  uni.showModal({ title: contract.standard, showCancel: false, confirmText: "知道了",
    content: "明确品种/株行距/水肥方案/农残限值/采收标准/分级规格，全程数字化记录，提升标准化水平；具体适用标准、抽检和验收以合同及法定要求为准。" });
}
</script>

<template>
  <view class="sg-page">
    <!-- 头部 -->
    <view class="hd">
      <text class="hd-t">订单农业 · 以销定产</text>
      <text class="hd-s">先有销路，再定生产 —— 锁量锁价、农资自愿选择、标准化交付</text>
    </view>

    <!-- 跨年度预定生产入口 -->
    <view class="preseason" @tap="toPreseason">
      <text class="ps-ic">📅</text>
      <view class="ps-i"><text class="ps-t">跨年度订单农业 · 今年定明年</text><text class="ps-d">提前一季锁定明年产能 · 全流程 + 风险规避</text></view>
      <text class="ps-go">进入 ›</text>
    </view>

    <!-- 以销定产业务链路 -->
    <view class="sg-card">
      <view class="sg-between"><text class="ct">以销定产链路</text><text class="demo" @tap="run">核验链路</text></view>
      <view class="flow">
        <view class="fnode" v-for="(c, i) in chain" :key="i" :class="{ on: started && step > i }">
          <view class="fn-ic">{{ c.icon }}</view>
          <view class="fn-i"><text class="fn-t">{{ c.t }}</text><text class="fn-d">{{ c.d }}</text></view>
          <view v-if="i < chain.length - 1" class="fn-line" :class="{ on: started && step > i + 1 }"></view>
        </view>
      </view>
      <view v-if="started && step >= chain.length" class="flow-done">✅ 以销定产闭环完成：销售驱动生产，降低库存与滞销风险；不承诺零库存、零滞销</view>
    </view>

    <!-- 合约信息 -->
    <view class="sg-card">
      <text class="ct">本单合约</text>
      <view class="r"><text class="k">合约号</text><text class="v">{{ contract.no }}</text></view>
      <view class="r"><text class="k">销售方</text><text class="v">{{ contract.buyer }}</text></view>
      <view class="r"><text class="k">作物</text><text class="v">{{ contract.crop }} · {{ contract.area }}</text></view>
      <view class="r"><text class="k">锁定量</text><text class="v">{{ contract.lockQty }}</text></view>
      <view class="r"><text class="k">收购价</text><text class="v sg-price">{{ contract.buyPrice }}</text></view>
    </view>

    <!-- 农资定向支付 + 标准化 -->
    <view class="sg-card">
      <text class="ct">农资定向支付 + 自愿选择</text>
      <view class="prepay-box">
        <view class="pb-l"><text class="pb-n">¥{{ contract.prepay }}</text><text class="pb-l2">合同约定农资预算</text></view>
        <view class="pb-btns">
          <view class="pb-btn" @tap="prepay">提交定向支付指令</view>
          <view class="pb-btn ghost" @tap="standard">查看种植标准</view>
        </view>
      </view>
      <view class="inp" v-for="it in inputs" :key="it.name">
        <text class="inp-n">{{ it.name }}</text><text class="inp-q">{{ it.qty }}</text><text class="inp-t">{{ it.note }}</text>
      </view>
      <text class="std-tip">📋 下发《{{ contract.standard }}》并核验投入品合法来源；不得强制或变相强制生产主体购买指定农资或有偿服务</text>
    </view>

    <!-- 收购价机制 -->
    <view class="sg-card">
      <text class="ct">收购价机制</text>
      <view class="pm" v-for="p in priceModel" :key="p.t">
        <view class="pm-l"><text class="pm-t">{{ p.t }}</text><text class="pm-d">{{ p.d }}</text></view>
        <text class="pm-v">{{ p.v }}</text>
      </view>
      <view class="settle-btn" @tap="toSettle">💰 到期履约兑现 · 试算农户实收（保底/随行就市/减产理赔/二次分红）›</view>
    </view>

    <!-- 农事履约任务 -->
    <view class="sg-card">
      <view class="sg-between"><text class="ct">农事履约任务</text><text class="tk-hint">按 SOP · 完成打卡上链</text></view>
      <view class="task" v-for="(t, i) in tasks" :key="i" @tap="checkTask(t)">
        <view class="tk-dot" :class="{ done: t.done, cur: t.cur }">{{ t.done ? '✓' : (t.cur ? '●' : '') }}</view>
        <view class="tk-i"><text class="tk-t" :class="{ done: t.done }">{{ t.t }}</text><text class="tk-date">计划 {{ t.date }}</text></view>
        <text class="tk-st" :class="{ done: t.done, cur: t.cur }">{{ t.done ? '已完成' : (t.cur ? '去打卡' : '待办') }}</text>
      </view>
    </view>

    <!-- 履约保障 -->
    <view class="sg-card">
      <text class="ct">履约保障</text>
      <view class="gt" v-for="g in guarantee" :key="g.t">
        <text class="gt-ic">{{ g.icon }}</text>
        <view class="gt-i"><text class="gt-t">{{ g.t }}</text><text class="gt-d">{{ g.d }}</text></view>
      </view>
    </view>

    <!-- 关联入口 -->
    <view class="links">
      <view class="lk feat" @tap="toFutures"><text class="lk-ic gold">📈</text><view class="lk-i"><text class="lk-t">升级为「农产品期货年单」</text><text class="lk-d">平台撮合年度锁量锁价 · 分批交割 · 风险对冲</text></view><text class="lk-go">›</text></view>
      <view class="lk" @tap="loan"><text class="lk-ic">📑</text><view class="lk-i"><text class="lk-t">凭本合约申请订单贷</text><text class="lk-d">锁定订单预支货款</text></view><text class="lk-go">›</text></view>
      <view class="lk" @tap="toFarm"><text class="lk-ic">🌱</text><view class="lk-i"><text class="lk-t">查看本单数字种植地块</text><text class="lk-d">IoT 数据 · 农事档案 · 溯源</text></view><text class="lk-go">›</text></view>
    </view>

    <view class="tip">🔗 合约条款、农资发放、农事打卡、履约记录全程上链，作为订单贷授信与保底收购依据</view>
  </view>
</template>

<style lang="scss" scoped>
.hd { background: linear-gradient(160deg, $sg-primary, $sg-primary-deep); padding: 36rpx 28rpx; color: #fff; }
.hd-t { font-size: 34rpx; font-weight: 800; }
.hd-s { font-size: 22rpx; opacity: 0.9; margin-top: 8rpx; display: block; }
.preseason { display: flex; align-items: center; margin: 20rpx 24rpx 0; padding: 22rpx; border-radius: $sg-radius-lg; background: linear-gradient(135deg, #fff4e0, #fff); border: 2rpx solid #f0dcae; box-shadow: $sg-shadow; }
.ps-ic { font-size: 44rpx; margin-right: 16rpx; }
.ps-i { flex: 1; display: flex; flex-direction: column; }
.ps-t { font-size: 27rpx; font-weight: 700; }
.ps-d { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }
.ps-go { font-size: 23rpx; color: #c8871f; font-weight: 600; }
.ct { font-size: 28rpx; font-weight: 700; }
.demo { font-size: 24rpx; color: $sg-primary; background: $sg-primary-light; padding: 8rpx 22rpx; border-radius: 999rpx; }
.flow { margin-top: 16rpx; }
.fnode { display: flex; align-items: flex-start; position: relative; padding-bottom: 8rpx; opacity: 0.45; transition: opacity 0.3s; }
.fnode.on { opacity: 1; }
.fn-ic { width: 60rpx; height: 60rpx; border-radius: 50%; background: $sg-primary-light; display: flex; align-items: center; justify-content: center; font-size: 30rpx; margin-right: 18rpx; z-index: 2; }
.fnode.on .fn-ic { background: $sg-primary; }
.fn-i { flex: 1; display: flex; flex-direction: column; padding-bottom: 20rpx; }
.fn-t { font-size: 26rpx; font-weight: 600; }
.fn-d { font-size: 21rpx; color: $sg-text-3; margin-top: 2rpx; }
.fn-line { position: absolute; left: 29rpx; top: 60rpx; bottom: 0; width: 4rpx; background: $sg-border; z-index: 1; }
.fn-line.on { background: $sg-primary; }
.flow-done { margin-top: 12rpx; font-size: 23rpx; color: $sg-primary; background: $sg-primary-light; padding: 16rpx; border-radius: $sg-radius; }
.r { display: flex; padding: 12rpx 0; border-top: 2rpx solid $sg-border; }
.r:first-of-type { border-top: none; }
.k { width: 120rpx; color: $sg-text-3; font-size: 26rpx; }
.v { flex: 1; font-size: 26rpx; }
.prepay-box { display: flex; align-items: center; background: $sg-gold-light; border-radius: $sg-radius; padding: 20rpx; margin: 14rpx 0; }
.pb-l { flex: 1; display: flex; flex-direction: column; }
.pb-n { font-size: 40rpx; font-weight: 800; color: $sg-gold; }
.pb-l2 { font-size: 20rpx; color: $sg-text-3; }
.pb-btns { display: flex; flex-direction: column; gap: 12rpx; }
.pb-btn { font-size: 24rpx; background: $sg-primary; color: #fff; padding: 12rpx 26rpx; border-radius: 999rpx; text-align: center; }
.pb-btn.ghost { background: #fff; color: $sg-primary; border: 2rpx solid $sg-primary; }
.inp { display: flex; align-items: center; padding: 12rpx 0; border-top: 2rpx solid $sg-border; }
.inp-n { flex: 1; font-size: 25rpx; }
.inp-q { font-size: 23rpx; color: $sg-text-2; margin: 0 16rpx; }
.inp-t { font-size: 20rpx; color: $sg-primary; }
.std-tip { font-size: 21rpx; color: $sg-text-3; margin-top: 12rpx; display: block; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }

/* 收购价机制 */
.pm { display: flex; align-items: center; justify-content: space-between; padding: 14rpx 0; border-top: 2rpx solid $sg-border; }
.pm:first-of-type { border-top: none; }
.pm-l { flex: 1; display: flex; flex-direction: column; }
.pm-t { font-size: 26rpx; font-weight: 600; }
.pm-d { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }
.pm-v { font-size: 24rpx; font-weight: 700; color: $sg-red; }
.settle-btn { margin-top: 16rpx; text-align: center; padding: 20rpx; border-radius: 999rpx; background: linear-gradient(135deg, $sg-gold, #c8871f); color: #fff; font-size: 23rpx; font-weight: 700; line-height: 1.4; }

/* 农事任务 */
.tk-hint { font-size: 20rpx; color: $sg-text-3; }
.task { display: flex; align-items: center; padding: 16rpx 0; border-top: 2rpx solid $sg-border; }
.tk-dot { width: 40rpx; height: 40rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20rpx; margin-right: 16rpx; }
.tk-dot.done { background: $sg-primary; }
.tk-dot.cur { background: $sg-gold; }
.tk-i { flex: 1; display: flex; flex-direction: column; }
.tk-t { font-size: 26rpx; font-weight: 600; }
.tk-t.done { color: $sg-text-3; text-decoration: line-through; }
.tk-date { font-size: 20rpx; color: $sg-text-3; }
.tk-st { font-size: 22rpx; color: $sg-text-3; }
.tk-st.done { color: $sg-primary; }
.tk-st.cur { color: #fff; background: $sg-gold; padding: 6rpx 18rpx; border-radius: 999rpx; }

/* 履约保障 */
.gt { display: flex; align-items: center; padding: 12rpx 0; border-top: 2rpx solid $sg-border; }
.gt:first-of-type { border-top: none; }
.gt-ic { font-size: 40rpx; margin-right: 16rpx; }
.gt-i { flex: 1; display: flex; flex-direction: column; }
.gt-t { font-size: 26rpx; font-weight: 600; }
.gt-d { font-size: 21rpx; color: $sg-text-3; margin-top: 2rpx; }

/* 关联入口 */
.links { margin: 0 24rpx; }
.lk { display: flex; align-items: center; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; margin-bottom: 16rpx; }
.lk-ic { width: 68rpx; height: 68rpx; border-radius: 20rpx; background: $sg-primary-light; display: flex; align-items: center; justify-content: center; font-size: 36rpx; margin-right: 16rpx; }
.lk-i { flex: 1; display: flex; flex-direction: column; }
.lk-t { font-size: 26rpx; font-weight: 600; }
.lk-d { font-size: 20rpx; color: $sg-text-3; margin-top: 2rpx; }
.lk-go { font-size: 32rpx; color: $sg-text-3; }
.lk.feat { background: linear-gradient(135deg, #fff8ec, #fff); border: 2rpx solid #f0e0c0; }
.lk-ic.gold { background: $sg-gold-light; }
</style>
