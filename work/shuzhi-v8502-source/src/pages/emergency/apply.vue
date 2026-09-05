<script setup lang="ts">
import { ref, computed } from "vue";

const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

const step = ref(1);
const steps = ["主体信息", "保供能力", "材料手续", "承诺签署"];

// 步骤1 主体信息（已认证企业自动带出）
const info = ref({
  name: "潍坊蔬菜产销联合体", credit: "91370700MA3M7K8Q2X", legal: "王守田",
  contact: "王守田", phone: "138****6621",
});

// 步骤2 保供能力
const cats = ["蔬菜", "水果", "粮油", "肉禽蛋", "米面"];
const pickedCats = ref<string[]>(["水果", "蔬菜"]);
const ability = ref({ reserve: "", daily: "", area: "", coldStore: false });

// 步骤3 材料手续
const docs = ref([
  { key: "license", name: "营业执照", req: true, done: false },
  { key: "food", name: "食品经营许可证", req: true, done: false },
  { key: "store", name: "仓储能力证明", req: true, done: false },
  { key: "logi", name: "配送/运力证明", req: false, done: false },
  { key: "quality", name: "质量安全承诺", req: false, done: false },
]);

const agreed = ref(false);
const submitted = ref(false);

const reqDone = computed(() => docs.value.filter((d) => d.req).every((d) => d.done));

function toggleCat(c: string) {
  const i = pickedCats.value.indexOf(c);
  if (i >= 0) pickedCats.value.splice(i, 1); else pickedCats.value.push(c);
}
function upload(k: string) {
  const d = docs.value.find((x) => x.key === k);
  if (d) { d.done = !d.done; uni.showToast({ title: d.done ? "资料已上传" : "已移除", icon: "none" }); }
}
function next() {
  if (step.value === 1 && !info.value.contact) return uni.showToast({ title: "请完善联系人", icon: "none" });
  if (step.value === 2 && (!pickedCats.value.length || !ability.value.reserve)) return uni.showToast({ title: "请填写保供品类与储备量", icon: "none" });
  if (step.value === 3 && !reqDone.value) return uni.showToast({ title: "请上传必需材料", icon: "none" });
  step.value++;
}
function prev() { step.value--; }
function submit() {
  if (productionBuild) return uni.showModal({ title: "需要后台备案", content: "正式环境的应急保供备案必须提交后台并经过资质、产能和名录审核，当前未写入备案结果。", showCancel: false });
  if (!agreed.value) return uni.showToast({ title: "请阅读并签署保供承诺书", icon: "none" });
  uni.showLoading({ title: "提交中…" });
  setTimeout(() => { uni.hideLoading(); submitted.value = true; uni.setStorageSync("bgFiled", "pending"); }, 900);
}
function finish() { uni.setStorageSync("bgFiled", "approved"); uni.navigateBack(); }
</script>

<template>
  <view class="sg-page">
    <view v-if="!submitted" class="steps">
      <view class="s" v-for="(s, i) in steps" :key="s">
        <view class="s-dot" :class="{ on: step >= i + 1 }">{{ step > i + 1 ? '✓' : i + 1 }}</view>
        <text class="s-t" :class="{ on: step >= i + 1 }">{{ s }}</text>
        <view v-if="i < steps.length - 1" class="s-line" :class="{ on: step > i + 1 }"></view>
      </view>
    </view>

    <block v-if="!submitted">
      <!-- 步骤1 -->
      <view v-if="step === 1" class="sg-card">
        <text class="ct">保供主体信息 <text class="ct-tip">已认证企业自动带出</text></text>
        <view class="fi"><text class="lb">企业名称</text><text class="val">{{ info.name }}</text></view>
        <view class="fi"><text class="lb">信用代码</text><text class="val">{{ info.credit }}</text></view>
        <view class="fi"><text class="lb">法定代表人</text><text class="val">{{ info.legal }}</text></view>
        <view class="fi"><text class="lb">保供联系人</text><input class="ip" v-model="info.contact" placeholder="应急联系人" /></view>
        <view class="fi"><text class="lb">联系电话</text><input class="ip" v-model="info.phone" placeholder="24h 应急电话" /></view>
      </view>

      <!-- 步骤2 -->
      <view v-if="step === 2" class="sg-card">
        <text class="ct">保供能力承诺</text>
        <text class="lb2">承诺保供品类</text>
        <view class="chips"><text v-for="c in cats" :key="c" class="chip" :class="{ on: pickedCats.includes(c) }" @tap="toggleCat(c)">{{ c }}</text></view>
        <view class="fi"><text class="lb">承诺储备量</text><input class="ip" v-model="ability.reserve" placeholder="如：200 吨" /></view>
        <view class="fi"><text class="lb">日配送能力</text><input class="ip" v-model="ability.daily" placeholder="如：30 吨/日" /></view>
        <view class="fi"><text class="lb">覆盖区域</text><input class="ip" v-model="ability.area" placeholder="如：天津全域" /></view>
        <view class="fi"><text class="lb">自有冷库</text><switch :checked="ability.coldStore" color="#c0392b" @change="ability.coldStore = !ability.coldStore" /></view>
      </view>

      <!-- 步骤3 -->
      <view v-if="step === 3" class="sg-card">
        <text class="ct">材料与手续</text>
        <text class="cs">带 * 为必传项，材料经审核并上链存证</text>
        <view class="doc" v-for="d in docs" :key="d.key" @tap="upload(d.key)">
          <text class="d-n">{{ d.name }}<text v-if="d.req" class="req"> *</text></text>
          <view class="d-btn" :class="{ done: d.done }">{{ d.done ? '✓ 已传' : '上传' }}</view>
        </view>
      </view>

      <!-- 步骤4 -->
      <view v-if="step === 4" class="sg-card">
        <text class="ct">《应急保供承诺书》</text>
        <view class="pact">
          <text class="p-l">本企业自愿加入应急保供名录，郑重承诺：</text>
          <text class="p-l">1. 应急预案启动时，优先参与保供任务；</text>
          <text class="p-l">2. 严格执行政府指导价，不囤积居奇、不哄抬价格；</text>
          <text class="p-l">3. 保证保供物资质量安全、数量足额、按时到位；</text>
          <text class="p-l">4. 服从统仓统配调度，如实报送储备与配送数据；</text>
          <text class="p-l">5. 承诺书内容上链存证，违约将取消资格并纳入信用记录。</text>
          <text class="p-l">6. 参与保供所发生的合理成本与损失，由政府依法给予合理补偿。</text>
        </view>
        <view class="agree" @tap="agreed = !agreed">
          <view class="cb" :class="{ on: agreed }">{{ agreed ? '✓' : '' }}</view>
          <text class="agree-t">本人已阅读并代表企业自愿签署上述《应急保供承诺书》</text>
        </view>
      </view>

      <view class="bar">
        <view v-if="step > 1" class="bar-btn ghost" @tap="prev">上一步</view>
        <view v-if="step < 4" class="bar-btn" @tap="next">下一步</view>
        <view v-else class="bar-btn" @tap="submit">提交备案申请</view>
      </view>
    </block>

    <!-- 审批进度 -->
    <view v-else class="done">
      <text class="d-ic">📋</text>
      <text class="d-t">保供备案申请已提交</text>
      <text class="d-no">备案编号 BG-2026-0342</text>
      <view class="appr sg-card">
        <text class="appr-t">审批进度</text>
        <view class="ap" v-for="(a, i) in ['平台受理','资质审核','产能核验','纳入保供名录']" :key="i">
          <view class="ap-dot" :class="{ on: i <= 1, doing: i === 1 }">{{ i < 1 ? '✓' : (i === 1 ? '·' : i + 1) }}</view>
          <view class="ap-line" v-if="i < 3" :class="{ on: i < 1 }"></view>
          <text class="ap-t" :class="{ on: i <= 1 }">{{ a }}</text>
        </view>
      </view>
      <text class="d-tip">预计 1-2 个工作日完成审核，结果经微信订阅消息通知；通过后自动纳入名录、上链存证</text>
      <view class="d-btn" @tap="finish">提交备案申请</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.steps { display: flex; background: #fff; padding: 30rpx 20rpx; }
.s { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }
.s-dot { width: 48rpx; height: 48rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24rpx; z-index: 2; }
.s-dot.on { background: $sg-red; }
.s-t { font-size: 20rpx; color: $sg-text-3; margin-top: 8rpx; }
.s-t.on { color: $sg-red; }
.s-line { position: absolute; top: 24rpx; left: 60%; width: 80%; height: 4rpx; background: $sg-border; z-index: 1; }
.s-line.on { background: $sg-red; }

.ct { font-size: 28rpx; font-weight: 700; display: block; }
.ct-tip { font-size: 20rpx; color: $sg-text-3; font-weight: 400; margin-left: 12rpx; }
.cs { font-size: 21rpx; color: $sg-text-3; display: block; margin: 6rpx 0 14rpx; }
.fi { display: flex; align-items: center; padding: 20rpx 0; border-top: 2rpx solid $sg-border; }
.fi:first-of-type { border-top: none; }
.lb { width: 160rpx; font-size: 26rpx; color: $sg-text-2; }
.lb2 { font-size: 25rpx; color: $sg-text-2; display: block; margin: 16rpx 0 12rpx; }
.ip { flex: 1; font-size: 26rpx; }
.val { flex: 1; font-size: 26rpx; }
.chips { display: flex; flex-wrap: wrap; }
.chip { font-size: 24rpx; padding: 10rpx 26rpx; background: $sg-bg; border-radius: 999rpx; margin: 0 14rpx 14rpx 0; }
.chip.on { background: $sg-red; color: #fff; }
.doc { display: flex; align-items: center; justify-content: space-between; padding: 22rpx 0; border-top: 2rpx solid $sg-border; }
.d-n { font-size: 26rpx; }
.req { color: $sg-red; }
.d-btn { padding: 12rpx 28rpx; border-radius: 999rpx; font-size: 24rpx; background: #fdecea; color: $sg-red; }
.d-btn.done { background: $sg-red; color: #fff; }
.pact { background: $sg-bg; border-radius: $sg-radius; padding: 20rpx; margin: 14rpx 0; }
.p-l { font-size: 23rpx; color: $sg-text-2; line-height: 1.7; display: block; }
.agree { display: flex; align-items: flex-start; }
.cb { width: 34rpx; height: 34rpx; border-radius: 50%; border: 2rpx solid $sg-text-3; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 22rpx; margin-right: 14rpx; flex-shrink: 0; margin-top: 2rpx; }
.cb.on { background: $sg-red; border-color: $sg-red; }
.agree-t { flex: 1; font-size: 22rpx; color: $sg-text-2; line-height: 1.5; }

.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; display: flex; gap: 20rpx; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.05); }
.bar-btn { flex: 1; text-align: center; padding: 24rpx 0; border-radius: 999rpx; font-size: 30rpx; font-weight: 700; background: linear-gradient(135deg, $sg-red, #b5322e); color: #fff; }
.bar-btn.ghost { flex: 0 0 34%; background: #fdecea; color: $sg-red; }

.done { display: flex; flex-direction: column; align-items: center; padding-top: 60rpx; }
.d-ic { font-size: 110rpx; }
.d-t { font-size: 32rpx; font-weight: 800; margin-top: 16rpx; }
.d-no { font-size: 24rpx; color: $sg-text-3; margin-top: 8rpx; }
.appr { width: 88%; padding: 30rpx 28rpx; }
.appr-t { font-size: 26rpx; font-weight: 700; display: block; margin-bottom: 20rpx; }
.ap { display: flex; align-items: center; position: relative; padding-bottom: 26rpx; }
.ap:last-child { padding-bottom: 0; }
.ap-dot { width: 44rpx; height: 44rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 22rpx; z-index: 2; }
.ap-dot.on { background: $sg-red; }
.ap-dot.doing { background: $sg-gold; }
.ap-line { position: absolute; left: 21rpx; top: 44rpx; height: 26rpx; width: 4rpx; background: $sg-border; }
.ap-line.on { background: $sg-red; }
.ap-t { font-size: 25rpx; color: $sg-text-3; margin-left: 18rpx; }
.ap-t.on { color: $sg-text; font-weight: 600; }
.d-tip { font-size: 22rpx; color: $sg-text-3; text-align: center; padding: 20rpx 50rpx; }
.d-btn { width: 80%; text-align: center; padding: 24rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, $sg-red, #b5322e); color: #fff; font-size: 30rpx; font-weight: 700; }
</style>
