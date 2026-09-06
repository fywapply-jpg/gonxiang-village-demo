<script setup lang="ts">
import { ref, computed } from "vue";
import { onShow } from "@dcloudio/uni-app";
import { useUserStore } from "@/store/user";
import { useAuthStore } from "@/store/auth";
import { submitMerchantApplication } from "@/services/localApi";
const user = useUserStore();
const auth = useAuthStore();
const productionBuild = String(import.meta.env.VITE_API_BASE || "").startsWith("https://");
onShow(() => { if (auth.legalVerified) faceDone.value = true; });

// 主体类型 —— 全部以企业法人为主
const entityTypes = [
  { key: "corp", name: "企业（有限公司）", desc: "营业执照 + 法人" },
  { key: "coop", name: "农民专业合作社", desc: "登记证 + 理事长" },
  { key: "farm", name: "家庭农场", desc: "营业执照 + 经营者" },
  { key: "individual", name: "个体工商户", desc: "营业执照 + 经营者" },
];
const entity = ref("corp");
const businessRoles = [
  { key: "supplier", name: "产地供应商", desc: "发布货源、签约履约" },
  { key: "buyer", name: "采购商", desc: "发布需求、采购验收" },
  { key: "agri", name: "农资采购方", desc: "采购种子、农药、肥料、农机" },
  { key: "station", name: "基层服务站", desc: "代办入驻与助农服务" },
] as const;
const businessRole = ref<"supplier" | "buyer" | "agri" | "station">("supplier");

const form = ref({
  name: "", credit: "", legal: "", legalId: "", addr: "", scope: "", capital: "",
});

// 资质清单
const quals = ref([
  { key: "license", name: "营业执照", req: true, done: false, note: "统一社会信用代码证照" },
  { key: "idcard", name: "法定代表人身份证", req: true, done: false, note: "正面 + 反面" },
  { key: "bank", name: "对公账户开户许可证", req: true, done: false, note: "对公账户信息" },
  { key: "food", name: "食品经营许可证", req: false, done: false, note: "涉食类目必传" },
  { key: "quality", name: "农产品质量安全合格证", req: false, done: false, note: "生鲜农产品" },
  { key: "proxy", name: "授权委托书 + 经办人身份证", req: false, done: false, note: "经办人非法人时" },
]);
const faceDone = ref(false);
const bankDone = ref(false);
const agreed = ref(false);

const step = ref(1);
const steps = ["主体信息", "资质上传", "法人实名", "提交审核"];

const reqDone = computed(() => quals.value.filter((q) => q.req).every((q) => q.done));
const infoDone = computed(() => form.value.name && form.value.credit && form.value.legal);

function upload(k: string) {
  const q = quals.value.find((x) => x.key === k);
  if (q) { q.done = !q.done; uni.showToast({ title: q.done ? "资料已暂存" : "已移除", icon: "none" }); }
}
function face() {
  uni.navigateTo({ url: `/pages/register/faceauth?scene=legal&name=${encodeURIComponent(form.value.legal || "")}` });
}
function bankVerify() {
  if (productionBuild) return uni.showModal({ title: "需要对公账户核验服务", content: "正式环境必须由合作银行或持牌支付机构完成随机小额打款/回填核验，并返回可审计凭证；当前未登记本地验证结果。", showCancel: false });
  uni.showModal({ title: "对公账户打款验证", content: "正式接入后由合作银行或持牌支付机构向对公账户打入随机小额，回填金额完成验证；当前仅登记验证意向，不代表机构已通过。", confirmText: "登记验证",
    success: (r) => { if (r.confirm) { bankDone.value = true; uni.showToast({ title: "验证意向已登记", icon: "success" }); } } });
}

function next() {
  if (step.value === 1 && !infoDone.value) return uni.showToast({ title: "请填写企业名称/信用代码/法人", icon: "none" });
  if (step.value === 2 && !reqDone.value) return uni.showToast({ title: "请上传必需资质", icon: "none" });
  if (step.value === 3 && (!faceDone.value || !bankDone.value)) return uni.showToast({ title: "请完成法人实名 + 对公验证", icon: "none" });
  step.value++;
}
function prev() { step.value--; }

const submitted = ref(false);
const applicationId = ref("");
async function submit() {
  if (!agreed.value) return uni.showToast({ title: "请阅读并同意入驻协议", icon: "none" });
  uni.showLoading({ title: "提交审核中…" });
  try {
    const result = await submitMerchantApplication({
      entity_type: entity.value,
      business_role: businessRole.value,
      name: form.value.name,
      credit_code: form.value.credit,
      legal_name: form.value.legal,
      legal_id_masked: form.value.legalId ? `****************${form.value.legalId.slice(-2)}` : "",
      address: form.value.addr,
      scope: form.value.scope,
      capital: form.value.capital,
      documents: quals.value.filter((q) => q.done).map((q) => q.name),
    });
    applicationId.value = result.id;
    uni.hideLoading();
    submitted.value = true;
    user.submitCert(form.value.name || "新入驻企业");
  } catch (e) {
    uni.hideLoading();
    uni.showToast({ title: (e as Error).message || "提交失败", icon: "none" });
  }
}
function finish() { uni.switchTab({ url: "/pages/mine/index" }); }
</script>

<template>
  <view class="sg-page">
    <!-- 步骤条 -->
    <view v-if="!submitted" class="steps">
      <view class="s" v-for="(s, i) in steps" :key="s">
        <view class="s-dot" :class="{ on: step >= i + 1 }">{{ step > i + 1 ? '✓' : i + 1 }}</view>
        <text class="s-t" :class="{ on: step >= i + 1 }">{{ s }}</text>
        <view v-if="i < steps.length - 1" class="s-line" :class="{ on: step > i + 1 }"></view>
      </view>
    </view>

    <block v-if="!submitted">
      <!-- 步骤1 主体信息 -->
      <block v-if="step === 1">
        <view class="sg-card">
          <text class="ct">经营主体类型（以企业法人为主）</text>
          <view class="types">
            <view class="type" :class="{ on: entity === t.key }" v-for="t in entityTypes" :key="t.key" @tap="entity = t.key">
              <text class="ty-n">{{ t.name }}</text><text class="ty-d">{{ t.desc }}</text>
            </view>
          </view>
          <text class="ct role-title">经营角色（审核通过后决定可用功能）</text>
          <view class="types">
            <view class="type" :class="{ on: businessRole === r.key }" v-for="r in businessRoles" :key="r.key" @tap="businessRole = r.key">
              <text class="ty-n">{{ r.name }}</text><text class="ty-d">{{ r.desc }}</text>
            </view>
          </view>
        </view>
        <view class="sg-card">
          <text class="ct">企业工商信息</text>
          <view class="fi"><text class="lb">企业名称</text><input class="ip" v-model="form.name" placeholder="营业执照全称" /></view>
          <view class="fi"><text class="lb">信用代码</text><input class="ip" v-model="form.credit" placeholder="统一社会信用代码（18位）" /></view>
          <view class="fi"><text class="lb">法定代表人</text><input class="ip" v-model="form.legal" placeholder="法人姓名" /></view>
          <view class="fi"><text class="lb">法人身份证</text><input class="ip" v-model="form.legalId" placeholder="法人身份证号" /></view>
          <view class="fi"><text class="lb">注册地址</text><input class="ip" v-model="form.addr" placeholder="营业执照住所" /></view>
          <view class="fi"><text class="lb">经营范围</text><input class="ip" v-model="form.scope" placeholder="如：农产品收购、销售" /></view>
          <view class="fi"><text class="lb">注册资本</text><input class="ip" v-model="form.capital" placeholder="万元" /></view>
        </view>
      </block>

      <!-- 步骤2 资质上传 -->
      <block v-if="step === 2">
        <view class="sg-card">
          <text class="ct">上传企业资质</text>
          <text class="cs">必需项完成后方可提交；带 ★ 为按类目必传</text>
          <view class="qual" v-for="q in quals" :key="q.key" @tap="upload(q.key)">
            <view class="q-l">
              <text class="q-n">{{ q.name }}<text v-if="q.req" class="req"> *必需</text><text v-else class="opt"> ★选填</text></text>
              <text class="q-note">{{ q.note }}</text>
            </view>
            <view class="q-btn" :class="{ done: q.done }">{{ q.done ? '✓ 已传' : '上传' }}</view>
          </view>
        </view>
      </block>

      <!-- 步骤3 法人实名 -->
      <block v-if="step === 3">
        <view class="sg-card verify" @tap="face">
          <text class="v-ic">🧑‍💼</text>
          <view class="v-i"><text class="v-t">法定代表人实名核身</text><text class="v-s">微信 / 公安人脸核验法人身份</text></view>
          <text class="v-badge" :class="{ ok: faceDone }">{{ faceDone ? '✔ 已认证' : '去认证' }}</text>
        </view>
        <view class="sg-card verify" @tap="bankVerify">
          <text class="v-ic">🏦</text>
          <view class="v-i"><text class="v-t">对公账户验证</text><text class="v-s">对公打款验证，确保资金账户真实</text></view>
          <text class="v-badge" :class="{ ok: bankDone }">{{ bankDone ? '✔ 已验证' : '去验证' }}</text>
        </view>
        <view class="tip">🔒 资料经国密加密传输，仅用于平台准入审核（数据可用不可见）</view>
      </block>

      <!-- 步骤4 提交审核 -->
      <block v-if="step === 4">
        <view class="sg-card">
          <text class="ct">信息核对</text>
          <view class="r"><text class="k">主体类型</text><text class="v">{{ entityTypes.find(t=>t.key===entity)?.name }}</text></view>
          <view class="r"><text class="k">经营角色</text><text class="v">{{ businessRoles.find(t=>t.key===businessRole)?.name }}</text></view>
          <view class="r"><text class="k">企业名称</text><text class="v">{{ form.name || '—' }}</text></view>
          <view class="r"><text class="k">信用代码</text><text class="v">{{ form.credit || '—' }}</text></view>
          <view class="r"><text class="k">法定代表人</text><text class="v">{{ form.legal || '—' }} ✔ 已实名</text></view>
          <view class="r"><text class="k">已传资质</text><text class="v">{{ quals.filter(q=>q.done).length }} 项</text></view>
        </view>
        <view class="agree" @tap="agreed = !agreed">
          <view class="cb" :class="{ on: agreed }">{{ agreed ? '✓' : '' }}</view>
          <text class="agree-t">我承诺所提交资质真实有效，同意《平台入驻协议》《商户经营规范》，接受平台与监管审核</text>
        </view>
      </block>

      <!-- 底部操作 -->
      <view class="bar">
        <view v-if="step > 1" class="bar-btn ghost" @tap="prev">上一步</view>
        <view v-if="step < 4" class="bar-btn" @tap="next">下一步</view>
        <view v-else class="bar-btn" @tap="submit">提交审核</view>
      </view>
    </block>

    <!-- 提交结果 -->
    <view v-else class="done">
      <text class="d-ic">🎉</text>
      <text class="d-t">入驻申请已提交</text>
      <text class="d-s">申请编号：{{ applicationId }} · 等待后台审核</text>
      <view class="flow sg-card">
        <view class="fs"><view class="fd on">✓</view><text>资料提交</text></view>
        <view class="fl on"></view>
        <view class="fs"><view class="fd doing">·</view><text>平台审核中</text></view>
        <view class="fl"></view>
        <view class="fs"><view class="fd">🔗</view><text>DID 链上确权</text></view>
      </view>
      <text class="d-tip">审核通过后自动生成企业 DID 链上身份，即可发布供货 / 采购与申请金融服务</text>
      <view class="d-btn" @tap="finish">返回首页</view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.steps { display: flex; background: #fff; padding: 30rpx 20rpx; }
.s { flex: 1; display: flex; flex-direction: column; align-items: center; position: relative; }
.s-dot { width: 48rpx; height: 48rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 24rpx; z-index: 2; }
.s-dot.on { background: $sg-primary; }
.s-t { font-size: 20rpx; color: $sg-text-3; margin-top: 8rpx; }
.s-t.on { color: $sg-primary; }
.s-line { position: absolute; top: 24rpx; left: 60%; width: 80%; height: 4rpx; background: $sg-border; z-index: 1; }
.s-line.on { background: $sg-primary; }

.ct { font-size: 28rpx; font-weight: 700; display: block; }
.cs { font-size: 21rpx; color: $sg-text-3; display: block; margin: 6rpx 0 14rpx; }

.types { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16rpx; margin-top: 16rpx; }
.role-title { margin-top: 28rpx; }
.type { width: auto; min-width: 0; box-sizing: border-box; border: 3rpx solid $sg-border; border-radius: $sg-radius; padding: 18rpx; display: flex; flex-direction: column; }
.type.on { border-color: $sg-primary; background: $sg-primary-light; }
.ty-n { font-size: 25rpx; font-weight: 600; }
.ty-d { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }

.fi { display: flex; align-items: center; padding: 20rpx 0; border-top: 2rpx solid $sg-border; }
.fi:first-of-type { border-top: none; }
.lb { width: 170rpx; font-size: 26rpx; color: $sg-text-2; }
.ip { flex: 1; font-size: 26rpx; }

.qual { display: flex; align-items: center; padding: 22rpx 0; border-top: 2rpx solid $sg-border; }
.q-l { flex: 1; display: flex; flex-direction: column; }
.q-n { font-size: 27rpx; font-weight: 600; }
.req { font-size: 20rpx; color: $sg-red; }
.opt { font-size: 20rpx; color: $sg-gold; }
.q-note { font-size: 21rpx; color: $sg-text-3; margin-top: 4rpx; }
.q-btn { padding: 12rpx 28rpx; border-radius: 999rpx; font-size: 24rpx; background: $sg-primary-light; color: $sg-primary; }
.q-btn.done { background: $sg-primary; color: #fff; }

.verify { display: flex; align-items: center; }
.v-ic { font-size: 52rpx; margin-right: 18rpx; }
.v-i { flex: 1; display: flex; flex-direction: column; }
.v-t { font-size: 28rpx; font-weight: 600; }
.v-s { font-size: 21rpx; color: $sg-text-3; margin-top: 4rpx; }
.v-badge { font-size: 24rpx; color: $sg-primary; background: $sg-primary-light; padding: 10rpx 24rpx; border-radius: 999rpx; }
.v-badge.ok { background: $sg-primary; color: #fff; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; }

.r { display: flex; padding: 14rpx 0; border-top: 2rpx solid $sg-border; }
.r:first-of-type { border-top: none; }
.k { width: 160rpx; color: $sg-text-3; font-size: 26rpx; }
.v { flex: 1; font-size: 26rpx; }

.agree { display: flex; align-items: flex-start; margin: 24rpx; }
.cb { width: 34rpx; height: 34rpx; border-radius: 50%; border: 2rpx solid $sg-text-3; display: flex; align-items: center; justify-content: center; font-size: 22rpx; color: #fff; margin-right: 14rpx; flex-shrink: 0; margin-top: 2rpx; }
.cb.on { background: $sg-primary; border-color: $sg-primary; }
.agree-t { flex: 1; font-size: 21rpx; color: $sg-text-3; line-height: 1.5; }

.bar { position: fixed; left: 0; right: 0; bottom: 0; background: #fff; display: flex; gap: 20rpx; padding: 18rpx 24rpx calc(18rpx + env(safe-area-inset-bottom)); box-shadow: 0 -4rpx 20rpx rgba(0,0,0,0.05); }
.bar-btn { flex: 1; text-align: center; padding: 24rpx 0; border-radius: 999rpx; font-size: 30rpx; font-weight: 700; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; }
.bar-btn.ghost { flex: 0 0 34%; background: $sg-primary-light; color: $sg-primary; }

.done { display: flex; flex-direction: column; align-items: center; padding-top: 70rpx; }
.d-ic { font-size: 120rpx; }
.d-t { font-size: 34rpx; font-weight: 800; margin-top: 16rpx; }
.d-s { font-size: 23rpx; color: $sg-text-3; margin-top: 10rpx; text-align: center; padding: 0 60rpx; }
.flow { display: flex; align-items: center; width: 88%; padding: 30rpx; }
.fs { display: flex; flex-direction: column; align-items: center; font-size: 21rpx; color: $sg-text-3; }
.fd { width: 48rpx; height: 48rpx; border-radius: 50%; background: $sg-border; color: #fff; display: flex; align-items: center; justify-content: center; margin-bottom: 8rpx; }
.fd.on { background: $sg-primary; }
.fd.doing { background: $sg-gold; }
.fl { flex: 1; height: 4rpx; background: $sg-border; margin: 0 6rpx 26rpx; }
.fl.on { background: $sg-primary; }
.d-tip { font-size: 22rpx; color: $sg-text-3; text-align: center; padding: 16rpx 50rpx; }
.d-btn { margin: 20rpx 24rpx; width: 80%; text-align: center; padding: 24rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; font-size: 30rpx; font-weight: 700; }
</style>
