<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
onLaunch(() => {
  console.log("数智供社 B2B 小程序 启动");
});
</script>

<style lang="scss">
/* 全局基础样式 */
page {
  background-color: $sg-bg;
  color: $sg-text;
  font-size: 28rpx;
  font-family: -apple-system, "PingFang SC", "Helvetica Neue", Helvetica, sans-serif;
  line-height: 1.5;
}

/* 大字模式：body 类由 app store 控制（H5），小程序端通过根节点 class */
.sg-elder page,
page.sg-elder {
  font-size: 32rpx;
}

view,
text {
  box-sizing: border-box;
}

/* 通用工具类 */
.sg-page {
  min-height: 100vh;
  padding-bottom: 40rpx;
}
.sg-card {
  background: $sg-card;
  border-radius: $sg-radius-lg;
  box-shadow: $sg-shadow;
  padding: 28rpx;
  margin: 24rpx;
}
.sg-row {
  display: flex;
  align-items: center;
}
.sg-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sg-muted {
  color: $sg-text-3;
  font-size: 24rpx;
}
.sg-price {
  color: $sg-red;
  font-weight: 700;
}
.sg-primary-btn {
  background: linear-gradient(135deg, $sg-primary, $sg-primary-deep);
  color: #fff;
  border-radius: 999rpx;
  text-align: center;
  font-size: 30rpx;
  padding: 22rpx 0;
  border: none;
}
.sg-ghost-btn {
  background: $sg-primary-light;
  color: $sg-primary;
  border-radius: 999rpx;
  text-align: center;
  font-size: 26rpx;
  padding: 14rpx 30rpx;
}
/* 金融合规统一标识：放款/资金业务由持牌机构办理 */
.fin-lic {
  margin: 20rpx 24rpx 30rpx;
  padding: 18rpx 20rpx;
  background: #eef6ff;
  border-left: 8rpx solid $sg-blue;
  border-radius: $sg-radius;
  font-size: 21rpx;
  color: #2b6cb0;
  line-height: 1.6;
}
</style>
