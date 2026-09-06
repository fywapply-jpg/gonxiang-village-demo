<script setup lang="ts">
import { ref } from "vue";
import { onLoad } from "@dcloudio/uni-app";
import { useUserStore } from "@/store/user";
import { createPurchaseDemand, submitProduct } from "@/services/localApi";

const user = useUserStore();
const productionBuild = Boolean(import.meta.env.PROD) || import.meta.env.MODE === "production";
const type = ref<"supply" | "demand">("supply");
onLoad((q) => { if (q?.type === "demand") type.value = "demand"; });

const form = ref({ name: "", cat: "水果", qty: "", price: "", spec: "", note: "",
  grade: "", moq: "", capacity: "", account: "机构监管结算", settle: "企业网银对公转账", delivery: "", destination: "", deliveryWindow: "", qualReq: "",
  acceptance: "到货24小时内验收", termDays: "30天", termStart: "验收合格次日", creditSupport: "买方授信额度", invoice: "验收后按合同开票" });
const cats = ["水果", "蔬菜", "粮油", "畜禽"];
const accounts = ["预付款30%+验收尾款", "机构监管结算", "货到/验收即付", "授信账期"];
const settles = ["企业网银对公转账", "企业数字人民币", "持牌机构监管结算"];
const termDays = ["30天", "45天", "60天"];
const termStarts = ["验收合格次日", "发票签收次日", "月度对账确认次日"];
const creditSupports = ["买方授信额度", "银行保理", "信用保险", "担保/保证金", "无增信·供方自担风险"];

// 检测报告 / 资质（供货必传）
const reports = ref<string[]>([]);
function addReport() {
  uni.chooseImage({ count: 3, success: (r: any) => { reports.value.push(...(r.tempFilePaths || [])); reports.value = reports.value.slice(0, 3); },
    fail: () => uni.showToast({ title: "已取消", icon: "none" }) });
}
function delReport(i: number) { reports.value.splice(i, 1); }

// 多图（3-7 张）
const images = ref<string[]>([]);
const MAX_IMG = 7;
function addImages() {
  uni.chooseImage({
    count: MAX_IMG - images.value.length,
    success: (r: any) => { images.value.push(...(r.tempFilePaths || [])); images.value = images.value.slice(0, MAX_IMG); },
    fail: () => uni.showToast({ title: "已取消", icon: "none" }),
  });
}
function delImage(i: number) { images.value.splice(i, 1); }

// 视频介绍
const video = ref("");
function addVideo() {
  uni.chooseVideo({
    maxDuration: 60,
    success: (r: any) => { video.value = r.tempFilePath; uni.showToast({ title: "视频已添加", icon: "success" }); },
    fail: () => uni.showToast({ title: "已取消", icon: "none" }),
  });
}
function delVideo() { video.value = ""; }

async function submit() {
  const capability = type.value === "supply" ? "supply" : "purchase";
  const action = type.value === "supply" ? "发布供货" : "发布采购";
  if (!user.ensureTradeRole(action, capability)) return;
  if (!form.value.name) return uni.showToast({ title: "请填写名称", icon: "none" });
  if (type.value === "demand" && (!form.value.destination || !form.value.deliveryWindow)) return uni.showToast({ title: "请填写收货地和交付时间", icon: "none" });
  if (type.value === "supply" && images.value.length < 3)
    return uni.showToast({ title: "供货至少上传 3 张图片", icon: "none" });
  if (form.value.account === "授信账期" && (!form.value.termDays || !form.value.termStart))
    return uni.showToast({ title: "请明确账期天数和起算点", icon: "none" });
  if (type.value === "supply") {
    uni.showLoading({ title: "提交上架审核…" });
    try {
      const result = await submitProduct({ ...(productionBuild ? {} : { merchant_id: "m-supplier" }), name: form.value.name, category: form.value.cat, price: Number.parseFloat(form.value.price) || 0, stock: Number.parseFloat(form.value.qty) || 0, spec: form.value.spec, media: [...images.value.map((url) => ({ media_type: "image", url })), ...(video.value ? [{ media_type: "video", url: video.value }] : [])] });
      uni.hideLoading();
      uni.showModal({ title: "已提交上架审核", content: `商品编号：${result.id}\n状态：后台审核中，审核通过后展示在供货大厅`, showCancel: false, success: () => uni.navigateBack() });
    } catch (e) { uni.hideLoading(); uni.showToast({ title: (e as Error).message || "提交失败", icon: "none" }); }
  } else {
    uni.showLoading({ title: "提交采购需求…" });
    try {
      const result = await createPurchaseDemand({
        ...(productionBuild ? {} : { buyer_id: "m-buyer" }),
        title: form.value.name,
        category: form.value.cat,
        qty: Number.parseFloat(form.value.qty) || 0,
        unit: "吨",
        budget_max: Number.parseFloat(form.value.price) || null,
        destination: form.value.destination,
        delivery_window: form.value.deliveryWindow,
      });
      uni.hideLoading();
      uni.showModal({ title: "采购需求已提交", content: `需求编号：${result.id}\n状态：后台审核/报价中，供货商可按真实需求报价`, showCancel: false, success: () => uni.navigateBack() });
    } catch (e) { uni.hideLoading(); uni.showToast({ title: (e as Error).message || "采购需求提交失败", icon: "none" }); }
  }
}
</script>

<template>
  <view class="sg-page">
    <view class="hint">
      {{ type === 'supply' ? '发布供货信息，采购商可直接询盘下单' : '发布采购需求，供应商可一键报价' }}
    </view>
    <view class="sg-card">
      <view class="fi"><text class="lb">{{ type === 'supply' ? '货品名称' : '采购品名' }}</text>
        <input class="ip" v-model="form.name" placeholder="如：赣南脐橙 特级" /></view>
      <view class="fi"><text class="lb">品类</text>
        <view class="chips"><text v-for="c in cats" :key="c" class="chip" :class="{ on: form.cat === c }" @tap="form.cat = c">{{ c }}</text></view>
      </view>
      <view class="fi"><text class="lb">{{ type === 'supply' ? '供货量' : '采购量' }}</text>
        <input class="ip" v-model="form.qty" placeholder="如：120 吨" /></view>
      <view class="fi"><text class="lb">{{ type === 'supply' ? '价格' : '预算' }}</text>
        <input class="ip" v-model="form.price" placeholder="如：4.6 元/斤" /></view>
      <view class="fi"><text class="lb">规格</text>
        <input class="ip" v-model="form.spec" placeholder="如：70-80mm 精品果" /></view>
      <view class="fi col"><text class="lb">备注</text>
        <textarea class="ta" v-model="form.note" placeholder="供货周期、付款方式、质检说明等" /></view>
    </view>

    <!-- B2B 交易条款 -->
    <view class="sg-card">
      <text class="ct">{{ type === 'supply' ? 'B2B 供货条款' : 'B2B 采购条款' }}</text>
      <view class="fi"><text class="lb">规格分级</text>
        <input class="ip" v-model="form.grade" :placeholder="type === 'supply' ? '如：一级 / 特级 / 国标二等' : '如：需一级及以上'" /></view>
      <view class="fi"><text class="lb">起订量</text>
        <input class="ip" v-model="form.moq" placeholder="如：500 kg / 1 吨起订" /></view>
      <view v-if="type === 'supply'" class="fi"><text class="lb">供货产能</text>
        <input class="ip" v-model="form.capacity" placeholder="如：日供 20 吨 / 年产 5000 吨" /></view>
      <view v-if="type !== 'supply'" class="fi"><text class="lb">收货地点</text>
        <input class="ip" v-model="form.destination" placeholder="如：武汉市洪山区中央厨房" /></view>
      <view v-if="type !== 'supply'" class="fi"><text class="lb">交付时间</text>
        <input class="ip" v-model="form.deliveryWindow" placeholder="如：2026-09-08 08:00—12:00" /></view>
      <view class="fi"><text class="lb">结算模型</text>
        <view class="chips"><text v-for="a in accounts" :key="a" class="chip" :class="{ on: form.account === a }" @tap="form.account = a">{{ a }}</text></view>
      </view>
      <view class="fi"><text class="lb">结算方式</text>
        <view class="chips"><text v-for="s in settles" :key="s" class="chip" :class="{ on: form.settle === s }" @tap="form.settle = s">{{ s }}</text></view>
      </view>
      <view class="fi"><text class="lb">验收时限</text>
        <input class="ip" v-model="form.acceptance" placeholder="如：到货24小时内完成验收和异议" /></view>
      <view class="fi"><text class="lb">发票节点</text>
        <input class="ip" v-model="form.invoice" placeholder="如：验收后按合同开具发票" /></view>
      <template v-if="form.account === '授信账期'">
        <view class="term-box">
          <text class="term-title">账期必须形成完整信用条件</text>
          <view class="fi"><text class="lb">准确天数</text>
            <view class="chips"><text v-for="d in termDays" :key="d" class="chip" :class="{ on: form.termDays === d }" @tap="form.termDays = d">{{ d }}</text></view>
          </view>
          <view class="fi"><text class="lb">起算事件</text>
            <view class="chips"><text v-for="s in termStarts" :key="s" class="chip" :class="{ on: form.termStart === s }" @tap="form.termStart = s">{{ s }}</text></view>
          </view>
          <view class="fi"><text class="lb">信用保障</text>
            <view class="chips"><text v-for="s in creditSupports" :key="s" class="chip" :class="{ on: form.creditSupport === s }" @tap="form.creditSupport = s">{{ s }}</text></view>
          </view>
          <text class="term-note">还需在合同写明：授信额度、具体到期日、逾期责任、争议款处理、是否允许保理及债权转让通知。平台只核验条件，不放贷、不承诺回款。</text>
        </view>
      </template>
      <view v-if="type === 'demand'" class="fi col"><text class="lb">资质要求</text>
        <textarea class="ta" v-model="form.qualReq" placeholder="如：需食品生产许可证、A级溯源、军供/校餐资质等" /></view>
    </view>

    <!-- 检测报告 / 资质（供货必传）-->
    <view v-if="type === 'supply'" class="sg-card">
      <view class="sg-between"><text class="ct">检测报告 / 资质</text><text class="ct-tip">农残 / 质检报告 · 建议上传</text></view>
      <view class="grid">
        <view class="cell" v-for="(img, i) in reports" :key="i">
          <image class="cimg" :src="img" mode="aspectFill" />
          <text class="del" @tap.stop="delReport(i)">×</text>
        </view>
        <view v-if="reports.length < 3" class="cell add" @tap="addReport">
          <text class="add-ic">📄</text><text class="add-t">{{ reports.length }}/3</text>
        </view>
      </view>
    </view>

    <!-- 商品图片：3-7 张 -->
    <view class="sg-card">
      <view class="sg-between"><text class="ct">商品图片</text><text class="ct-tip">3-7 张 · 首图为主图 · 建议实拍</text></view>
      <view class="grid">
        <view class="cell" v-for="(img, i) in images" :key="i">
          <image class="cimg" :src="img" mode="aspectFill" />
          <text v-if="i === 0" class="main">主图</text>
          <text class="del" @tap.stop="delImage(i)">×</text>
        </view>
        <view v-if="images.length < MAX_IMG" class="cell add" @tap="addImages">
          <text class="add-ic">＋</text><text class="add-t">{{ images.length }}/{{ MAX_IMG }}</text>
        </view>
      </view>
    </view>

    <!-- 视频介绍 -->
    <view class="sg-card">
      <view class="sg-between"><text class="ct">视频介绍</text><text class="ct-tip">≤ 60 秒 · 产地/加工/包装实拍</text></view>
      <view v-if="!video" class="video-add" @tap="addVideo">
        <text class="va-ic">🎬</text><text class="va-t">上传产品介绍视频</text>
      </view>
      <view v-else class="video-added">
        <video class="vplayer" :src="video" controls></video>
        <text class="vdel" @tap="delVideo">删除视频</text>
      </view>
    </view>

    <view class="tip">🔒 发布信息中的价格、付款与账期是交易意向，不等于平台担保；经双方确认并写入CA合同后生效。图片/视频经内容安全审核后展示。</view>
    <view class="submit" @tap="submit">确认发布</view>
  </view>
</template>

<style lang="scss" scoped>
.hint { margin: 24rpx; font-size: 24rpx; color: $sg-text-2; }
.fi { padding: 20rpx 0; border-bottom: 2rpx solid $sg-border; display: flex; align-items: center; }
.fi.col { flex-direction: column; align-items: stretch; }
.lb { width: 150rpx; font-size: 27rpx; color: $sg-text-2; }
.ip { flex: 1; font-size: 27rpx; }
.chips { flex: 1; display: flex; flex-wrap: wrap; gap: 10rpx; }
.chip { font-size: 22rpx; padding: 8rpx 18rpx; background: $sg-bg; border-radius: 999rpx; }
.chip.on { background: $sg-primary; color: #fff; }
.term-box { margin: 16rpx 0; padding: 18rpx; border-radius: $sg-radius; background: #fff8e8; border: 2rpx solid #f0dcae; }
.term-title { display: block; font-size: 25rpx; font-weight: 800; color: #9a6410; }
.term-note { display: block; margin-top: 14rpx; color: #7b6949; font-size: 20rpx; line-height: 1.55; }
.ta { width: 100%; height: 140rpx; margin-top: 12rpx; font-size: 26rpx; background: $sg-bg; border-radius: $sg-radius; padding: 16rpx; }
.ct { font-size: 28rpx; font-weight: 700; }
.ct-tip { font-size: 20rpx; color: $sg-text-3; }
.grid { display: flex; flex-wrap: wrap; margin-top: 16rpx; }
.cell { position: relative; width: 150rpx; height: 150rpx; margin: 0 16rpx 16rpx 0; border-radius: 12rpx; overflow: hidden; }
.cimg { width: 100%; height: 100%; display: block; background: $sg-bg; }
.main { position: absolute; left: 0; bottom: 0; background: rgba(22,136,76,0.85); color: #fff; font-size: 18rpx; padding: 2rpx 12rpx; border-radius: 0 8rpx 0 0; }
.del { position: absolute; top: 0; right: 0; width: 36rpx; height: 36rpx; background: rgba(0,0,0,0.5); color: #fff; font-size: 26rpx; text-align: center; line-height: 34rpx; border-radius: 0 0 0 12rpx; }
.cell.add { display: flex; flex-direction: column; align-items: center; justify-content: center; border: 2rpx dashed $sg-border; background: $sg-bg; }
.add-ic { font-size: 48rpx; color: $sg-text-3; }
.add-t { font-size: 20rpx; color: $sg-text-3; }
.video-add { margin-top: 16rpx; padding: 44rpx; border: 2rpx dashed $sg-border; border-radius: $sg-radius; display: flex; flex-direction: column; align-items: center; background: $sg-bg; }
.va-ic { font-size: 56rpx; }
.va-t { font-size: 24rpx; color: $sg-text-3; margin-top: 10rpx; }
.video-added { margin-top: 16rpx; }
.vplayer { width: 100%; height: 340rpx; border-radius: $sg-radius; }
.vdel { display: inline-block; margin-top: 12rpx; font-size: 22rpx; color: $sg-red; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; }
.submit { margin: 20rpx 24rpx 60rpx; text-align: center; padding: 26rpx 0; border-radius: 999rpx; background: linear-gradient(135deg, $sg-primary, $sg-primary-deep); color: #fff; font-size: 30rpx; font-weight: 700; }
</style>
