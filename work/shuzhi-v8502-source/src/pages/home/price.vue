<script setup lang="ts">
import { ref } from "vue";

const view = ref<"origin" | "sales">("origin");

// 产区行情：品类 · 产区 · 规格 · 产地价 · 涨跌 · 预计收购时段
const origins = [
  { name: "赣南脐橙", zone: "江西·赣州", spec: "70-80mm 精品", price: 4.62, delta: 2.1, window: "10月—次年1月" },
  { name: "山东大白菜", zone: "山东·潍坊", spec: "净菜 2-3kg/棵", price: 0.88, delta: -3.4, window: "10月—11月" },
  { name: "云南番茄", zone: "云南·玉溪", spec: "串收 200g±", price: 3.15, delta: 1.2, window: "全年(大棚)" },
  { name: "五常稻花香米", zone: "黑龙江·五常", spec: "2025 新米", price: 6.85, delta: 0.5, window: "9月—10月" },
  { name: "洛川红富士", zone: "陕西·洛川", spec: "80# 一二级", price: 3.48, delta: -1.1, window: "9月—11月" },
  { name: "新疆巴旦木", zone: "新疆·喀什", spec: "大颗粒", price: 18.5, delta: 0.8, window: "8月—9月" },
  { name: "生猪", zone: "河南", spec: "外三元", price: 8.9, delta: 4.2, window: "全年" },
];

// 采购区行情：销区 · 品类 · 批发/到岸价 · 需求热度
const sales = [
  { region: "深圳·华南", name: "赣南脐橙", price: 5.2, heat: "旺", spec: "精品果" },
  { region: "上海·华东", name: "云南番茄", price: 3.9, heat: "稳", spec: "串收" },
  { region: "北京·华北", name: "五常稻花香米", price: 7.2, heat: "旺", spec: "新米" },
  { region: "天津·华北", name: "山东大白菜", price: 1.2, heat: "稳", spec: "净菜" },
  { region: "成都·西南", name: "洛川红富士", price: 4.0, heat: "稳", spec: "80#" },
  { region: "广州·华南", name: "生猪(白条)", price: 12.6, heat: "旺", spec: "分割" },
];
const heatColor: Record<string, string> = { 旺: "#d64541", 稳: "#16884c", 淡: "#9aa0aa" };
</script>

<template>
  <view class="sg-page">
    <view class="hero">
      <text class="ht">农产品价格指数</text>
      <text class="hs">2026-07-02 更新 · 数据来源：产地集货 + 销区批发</text>
    </view>

    <view class="tabs">
      <view class="tab" :class="{ on: view === 'origin' }" @tap="view = 'origin'">产区行情</view>
      <view class="tab" :class="{ on: view === 'sales' }" @tap="view = 'sales'">采购区行情</view>
    </view>

    <!-- 产区行情 -->
    <block v-if="view === 'origin'">
      <view class="ocard" v-for="p in origins" :key="p.name">
        <view class="oc-top">
          <view class="oc-l"><text class="oc-n">{{ p.name }}</text><text class="oc-z">📍 {{ p.zone }}</text></view>
          <view class="oc-r">
            <text class="oc-p">¥{{ p.price }}<text class="oc-u">/斤</text></text>
            <text class="oc-d" :class="p.delta >= 0 ? 'up' : 'down'">{{ p.delta >= 0 ? '▲' : '▼' }}{{ Math.abs(p.delta) }}%</text>
          </view>
        </view>
        <view class="oc-meta">
          <text class="oc-spec">规格：{{ p.spec }}</text>
          <text class="oc-win">🕑 预计收购：{{ p.window }}</text>
        </view>
      </view>
      <view class="tip">📊 产区价 + 规格 + 收购时段，支撑以销定产与产销匹配决策</view>
    </block>

    <!-- 采购区行情 -->
    <block v-else>
      <view class="row hd"><text class="s1">采购区域</text><text class="s2">品类/规格</text><text class="s3">批发价</text><text class="s4">需求</text></view>
      <view class="row" v-for="p in sales" :key="p.region">
        <text class="s1 reg">{{ p.region }}</text>
        <view class="s2"><text class="s-n">{{ p.name }}</text><text class="s-spec">{{ p.spec }}</text></view>
        <text class="s3 price">¥{{ p.price }}</text>
        <text class="s4 heat" :style="{ color: heatColor[p.heat] }">{{ p.heat }}</text>
      </view>
      <view class="tip">🛒 销区批发价 + 需求热度，帮助采购商选品选区、供应商找销路</view>
    </block>
  </view>
</template>

<style lang="scss" scoped>
.hero { background: linear-gradient(160deg, $sg-blue, #1e4f80); padding: 40rpx 28rpx; color: #fff; }
.ht { font-size: 32rpx; font-weight: 800; }
.hs { font-size: 21rpx; opacity: 0.9; margin-top: 6rpx; display: block; }
.tabs { display: flex; background: #fff; }
.tab { flex: 1; text-align: center; padding: 26rpx 0; font-size: 28rpx; color: $sg-text-2; position: relative; }
.tab.on { color: $sg-blue; font-weight: 700; }
.tab.on::after { content: ""; position: absolute; bottom: 8rpx; left: 50%; transform: translateX(-50%); width: 48rpx; height: 6rpx; border-radius: 3rpx; background: $sg-blue; }

.ocard { background: #fff; border-radius: $sg-radius-lg; box-shadow: $sg-shadow; margin: 20rpx 24rpx 0; padding: 22rpx; }
.oc-top { display: flex; align-items: center; justify-content: space-between; }
.oc-l { display: flex; flex-direction: column; }
.oc-n { font-size: 28rpx; font-weight: 700; }
.oc-z { font-size: 21rpx; color: $sg-text-3; margin-top: 4rpx; }
.oc-r { display: flex; align-items: baseline; }
.oc-p { font-size: 34rpx; font-weight: 800; color: $sg-red; }
.oc-u { font-size: 20rpx; font-weight: 400; color: $sg-text-3; }
.oc-d { font-size: 22rpx; margin-left: 12rpx; }
.oc-meta { display: flex; justify-content: space-between; margin-top: 14rpx; padding-top: 14rpx; border-top: 2rpx solid $sg-border; }
.oc-spec { font-size: 22rpx; color: $sg-text-2; }
.oc-win { font-size: 22rpx; color: $sg-blue; }
.up { color: $sg-red; }
.down { color: $sg-primary; }

.row { display: flex; align-items: center; padding: 20rpx 24rpx; background: #fff; border-bottom: 2rpx solid $sg-border; }
.row.hd text { font-size: 21rpx; color: $sg-text-3; }
.s1 { flex: 1.6; }
.s1.reg { font-size: 25rpx; font-weight: 600; }
.s2 { flex: 2; display: flex; flex-direction: column; }
.s-n { font-size: 25rpx; }
.s-spec { font-size: 20rpx; color: $sg-text-3; }
.s3 { flex: 1.2; text-align: center; }
.s3.price { font-size: 28rpx; font-weight: 700; color: $sg-red; }
.s4 { flex: 0.8; text-align: right; font-size: 26rpx; font-weight: 700; }
.tip { margin: 24rpx; font-size: 22rpx; color: $sg-text-3; line-height: 1.6; }
</style>
