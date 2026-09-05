<script setup lang="ts">
import { ref, computed } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { cityMarkets, endTypeDetail } from "@/mock/citymarket";
import { promoOrgs, promoters } from "@/mock/promo";
import { useAuthStore } from "@/store/auth";
const auth = useAuthStore();
const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";

// 推荐推广组织 / 推广员（建立服务关系，费用按生效合同结算）
const orgIdx = ref(0);
const org = computed(() => promoOrgs[orgIdx.value]);
const orgPromoters = computed(() => promoters.filter((p) => p.org === org.value.name));
const pmIdx = ref(0);
function pickOrg(i: number) { orgIdx.value = i; pmIdx.value = 0; }

const types = cityMarkets[0].ends.map((e) => ({ key: e.key, name: e.name, icon: e.icon }));
const key = ref("market");
onLoad((q: any) => { if (q?.key) key.value = q.key; });
function pick(k: string) { key.value = k; uploaded.value = {}; }

const detail = computed(() => endTypeDetail[key.value]);
const berthLabel = computed(() => {
  const m: Record<string, string> = { market: "档口号 / 摊位号", store: "门牌号 / 店号", kitchen: "厂区 / 车间号", process: "厂区 / 生产线号", catering: "门店编号", army: "配送点编号", student: "食堂 / 档口号", canteen: "食堂 / 窗口号" };
  return m[key.value] || "铺号 / 门牌号";
});

// 主体资料
const form = ref({ name: "", credit: "", legal: "", phone: "" });
// 资质上传
const uploaded = ref<Record<number, boolean>>({});
function upload(i: number) { uploaded.value[i] = true; uni.showToast({ title: "已上传", icon: "success" }); }
const allUploaded = computed(() => detail.value.quals.every((_, i) => uploaded.value[i]));

// 门店 / 铺位定位
const loc = ref<{ lat: string; lng: string } | null>(null);
const addr = ref("");
const berth = ref("");
function locate() {
  if (productionBuild) return uni.showModal({ title: "需要真实定位服务", content: "正式环境门店/铺位坐标必须由系统定位并由后台校验地址、服务半径和经营主体，当前未生成临时坐标。", showCancel: false });
  // H5 预览使用临时坐标；真机应走 uni.getLocation 并由后端校验地址
  loc.value = { lat: "39.0" + (100 + Math.floor(Math.random() * 900)), lng: "117.2" + (100 + Math.floor(Math.random() * 900)) };
  uni.showToast({ title: "定位成功", icon: "success" });
}

function faceAuth() { uni.navigateTo({ url: `/pages/register/faceauth?scene=legal&name=${encodeURIComponent(form.value.legal || "")}` }); }

const canSubmit = computed(() => form.value.name && form.value.credit && form.value.legal && form.value.phone && allUploaded.value && auth.legalVerified && loc.value && addr.value && berth.value);
function submit() {
  if (productionBuild) return uni.showModal({ title: "需要后台入驻服务", content: "正式环境下游小端入驻必须提交后台并完成主体、资质、定位、服务关系和结算账户审核，当前未提交本地申请。", showCancel: false });
  if (!canSubmit.value) return uni.showToast({ title: "请完善分类、资料、法人认证、定位与铺号", icon: "none" });
  const t = types.find((x) => x.key === key.value)!;
  uni.showModal({
    title: "入驻申请已提交", showCancel: false, confirmText: "完成",
    content: `分类：${t.name}\n主体：${form.value.name}\n定位：${loc.value!.lat}, ${loc.value!.lng}\n${berthLabel.value}：${berth.value}\n推荐组织：${org.value.name}\n推广员：${orgPromoters.value[pmIdx.value]?.name || "—"}\n\n资料、铺位、服务关系将进入人工审核，通过后即可在枢纽内交易；如产生推广服务费，按独立合同、验收、发票和结算回单执行。`,
    success: () => uni.navigateBack(),
  });
}
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">🏬 下游小端 · 商户入驻</text>
      <text class="hs">自选分类 · 提交资质 · 门店/铺位精准定位 + 铺号</text>
    </view>

    <!-- ① 自选分类 -->
    <view class="sec">① 自选经营分类</view>
    <view class="types">
      <view class="ty" :class="{ on: key === t.key }" v-for="t in types" :key="t.key" @tap="pick(t.key)">
        <text class="ty-ic">{{ t.icon }}</text>
        <text class="ty-n">{{ t.name }}</text>
        <text class="ty-chk">{{ key === t.key ? '●' : '○' }}</text>
      </view>
    </view>

    <!-- ② 主体资料 -->
    <view class="sec">② 企业主体资料</view>
    <view class="sg-card">
      <view class="fi"><text class="fl">企业名称</text><input class="fin" v-model="form.name" placeholder="营业执照全称" /></view>
      <view class="fi"><text class="fl">统一社会信用代码</text><input class="fin" v-model="form.credit" placeholder="18 位" /></view>
      <view class="fi"><text class="fl">法人代表</text><input class="fin" v-model="form.legal" placeholder="法人姓名" /></view>
      <view class="fi"><text class="fl">联系电话</text><input class="fin" type="number" v-model="form.phone" placeholder="手机号" /></view>
    </view>

    <!-- ③ 按分类提交资质 -->
    <view class="sec">③ 提交所需资质（{{ detail.quals.length }} 项）</view>
    <view class="sg-card">
      <view class="ql" v-for="(q, i) in detail.quals" :key="q">
        <text class="ql-n">{{ q }}</text>
        <view class="ql-btn" :class="{ done: uploaded[i] }" @tap="upload(i)">{{ uploaded[i] ? '✓ 已上传' : '＋ 上传' }}</view>
      </view>
    </view>

    <!-- ④ 法人人脸实名（链上身份）-->
    <view class="sec">④ 法人人脸实名认证</view>
    <view class="face-card" :class="{ ok: auth.legalVerified }" @tap="faceAuth">
      <text class="face-ic">{{ auth.legalVerified ? '✅' : '🧑‍💼' }}</text>
      <view class="face-i">
        <text class="face-t">{{ auth.legalVerified ? '法人实名已通过' : '法人人脸识别认证' }}</text>
        <text class="face-s">{{ auth.legalVerified ? ('链上身份 ' + auth.legalDid) : '活体检测核验法定代表人，绑定链上身份 DID' }}</text>
      </view>
      <text class="face-go">{{ auth.legalVerified ? '重新认证' : '去认证 ›' }}</text>
    </view>

    <!-- ⑤ 门店/铺位定位 + 铺号 -->
    <view class="sec">⑤ 门店 / 铺位精准定位</view>
    <view class="sg-card">
      <view class="map" :class="{ located: loc }" @tap="locate">
        <block v-if="loc">
          <text class="map-pin">📍</text>
          <text class="map-co">{{ loc.lat }}, {{ loc.lng }}</text>
          <text class="map-re">重新定位</text>
        </block>
        <block v-else>
          <text class="map-tip">📍 点此获取门店/铺位精准定位</text>
        </block>
      </view>
      <view class="fi"><text class="fl">详细地址</text><input class="fin" v-model="addr" placeholder="市/区/街道 + 市场/楼宇名称" /></view>
      <view class="fi"><text class="fl">{{ berthLabel }}</text><input class="fin" v-model="berth" :placeholder="'如 A区-12 号'" /></view>
      <text class="berth-tip">🔎 精准到铺位，用于配送到点、溯源到摊、监管到户</text>
    </view>

    <!-- ⑥ 推荐推广组织 / 推广员 -->
    <view class="sec">⑥ 推荐推广组织 / 推广员</view>
    <view class="sg-card">
      <text class="rec-tip">由属地村 / 社区集体控股推广组织提供入驻服务，建立服务关系（负责关系维护与舆情；费用按独立合同结算）</text>
      <view class="orgs">
        <view class="ro" :class="{ on: orgIdx === i }" v-for="(o, i) in promoOrgs" :key="o.id" @tap="pickOrg(i)">
          <text class="ro-n">{{ o.name }}</text>
          <text class="ro-m">{{ o.type }} · {{ o.region }}</text>
        </view>
      </view>
      <view class="pm-row">
        <text class="pm-l">推广员</text>
        <picker :range="orgPromoters.map(p => p.name)" @change="pmIdx = Number($event.detail.value)">
          <text class="pm-v">{{ orgPromoters[pmIdx]?.name || '—' }} ▾</text>
        </picker>
      </view>
    </view>

    <view class="submit" :class="{ dis: !canSubmit }" @tap="submit">提交入驻申请（人工审核）</view>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, #2f9e5b, $sg-primary-deep); padding: 32rpx 28rpx 26rpx; color: #fff; }
.ht { font-size: 34rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.92; margin-top: 8rpx; display: block; }
.sec { font-size: 28rpx; font-weight: 700; padding: 24rpx 28rpx 12rpx; }
.types { display: flex; flex-wrap: wrap; gap: 16rpx; padding: 0 24rpx; }
.ty { width: calc((100% - 32rpx) / 3); box-sizing: border-box; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 18rpx 8rpx; display: flex; flex-direction: column; align-items: center; border: 3rpx solid transparent; position: relative; }
.ty.on { border-color: $sg-primary; background: $sg-primary-light; }
.ty-ic { font-size: 38rpx; }
.ty-n { font-size: 21rpx; font-weight: 600; margin-top: 6rpx; text-align: center; }
.ty-chk { position: absolute; top: 8rpx; right: 10rpx; font-size: 20rpx; color: $sg-primary; }
.sg-card { margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 8rpx 24rpx; }
.fi { display: flex; align-items: center; padding: 20rpx 0; border-top: 2rpx solid $sg-border; }
.fi:first-child { border-top: none; }
.fl { width: 220rpx; font-size: 25rpx; color: $sg-text-2; }
.fin { flex: 1; font-size: 26rpx; }
.ql { display: flex; align-items: center; justify-content: space-between; padding: 18rpx 0; border-top: 2rpx solid $sg-border; }
.ql:first-child { border-top: none; }
.ql-n { flex: 1; font-size: 24rpx; }
.ql-btn { font-size: 22rpx; color: $sg-primary; background: $sg-primary-light; padding: 10rpx 22rpx; border-radius: 999rpx; }
.ql-btn.done { color: #fff; background: $sg-primary; }
.map { height: 200rpx; border-radius: $sg-radius; background: repeating-linear-gradient(45deg, #eef4f0, #eef4f0 16rpx, #e6efe9 16rpx, #e6efe9 32rpx); display: flex; flex-direction: column; align-items: center; justify-content: center; margin: 16rpx 0; }
.map.located { background: linear-gradient(135deg, #e4f3ea, #d3ecdd); }
.map-tip { font-size: 24rpx; color: $sg-primary; }
.map-pin { font-size: 44rpx; }
.map-co { font-size: 24rpx; font-weight: 700; color: $sg-primary-deep; margin-top: 4rpx; }
.map-re { font-size: 20rpx; color: $sg-text-3; margin-top: 4rpx; }
.berth-tip { font-size: 20rpx; color: $sg-text-3; padding: 8rpx 0 16rpx; display: block; }
.face-card { display: flex; align-items: center; margin: 0 24rpx; background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; padding: 22rpx; border: 2rpx solid transparent; }
.face-card.ok { border-color: $sg-primary; background: $sg-primary-light; }
.face-ic { font-size: 44rpx; margin-right: 16rpx; }
.face-i { flex: 1; display: flex; flex-direction: column; }
.face-t { font-size: 26rpx; font-weight: 700; }
.face-s { font-size: 19rpx; color: $sg-text-3; margin-top: 4rpx; }
.face-go { font-size: 23rpx; color: $sg-primary; }
.rec-tip { font-size: 20rpx; color: $sg-text-3; line-height: 1.5; display: block; padding: 4rpx 0 12rpx; }
.orgs { display: flex; flex-direction: column; gap: 12rpx; }
.ro { border: 3rpx solid $sg-border; border-radius: $sg-radius; padding: 16rpx 18rpx; display: flex; flex-direction: column; }
.ro.on { border-color: $sg-primary; background: $sg-primary-light; }
.ro-n { font-size: 24rpx; font-weight: 700; }
.ro-m { font-size: 19rpx; color: $sg-text-3; margin-top: 4rpx; }
.pm-row { display: flex; align-items: center; justify-content: space-between; margin-top: 16rpx; padding-top: 16rpx; border-top: 2rpx solid $sg-border; }
.pm-l { font-size: 24rpx; color: $sg-text-2; }
.pm-v { font-size: 24rpx; color: $sg-primary; font-weight: 600; background: $sg-primary-light; padding: 8rpx 20rpx; border-radius: 999rpx; }
.submit { margin: 30rpx 24rpx; text-align: center; padding: 26rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; font-size: 28rpx; font-weight: 700; box-shadow: 0 8rpx 20rpx rgba(15,107,59,0.3); }
.submit.dis { background: $sg-border; color: $sg-text-3; box-shadow: none; }
</style>
