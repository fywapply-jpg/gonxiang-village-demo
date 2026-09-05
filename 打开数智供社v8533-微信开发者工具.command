#!/bin/zsh
set -euo pipefail

PROJECT_DIR="/Users/fengwen/gonxiang-village-demo/work/shuzhi-v8502-source/dist/build/mp-weixin"
DEVTOOLS_APP="/Applications/wechatwebdevtools.app"

if [[ ! -f "$PROJECT_DIR/project.config.json" || ! -f "$PROJECT_DIR/app.json" ]]; then
  echo "找不到最新版小程序构建目录：$PROJECT_DIR"
  echo "请先在项目目录执行：npm run build:shuzhi-mp"
  exit 1
fi

if [[ ! -d "$DEVTOOLS_APP" ]]; then
  echo "未找到微信开发者工具：$DEVTOOLS_APP"
  exit 1
fi

echo "正在打开：数智供社 v8533"
echo "项目目录：$PROJECT_DIR"
# 先关闭旧会话，避免微信开发者工具复用失效的空白模拟器页面。
CLI="$DEVTOOLS_APP/Contents/MacOS/cli"
"$CLI" quit --lang zh >/dev/null 2>&1 || true
# 等待旧进程真正退出，否则 macOS 会把配置文件交给欢迎页而不是项目窗口。
for _ in {1..30}; do
  if ! pgrep -f "/Applications/wechatwebdevtools.app/Contents/MacOS/wechatdevtools" >/dev/null 2>&1; then break; fi
  sleep 1
done
# 直接把配置文件交给 IDE；这条路径会载入指定项目，而不是只打开最近项目列表。
open -a "$DEVTOOLS_APP" "$PROJECT_DIR/project.config.json"
echo "启动请求已发送：v8533（首次启动约需 30 秒完成模拟器初始化）"
# 首次启动可能需要几秒，后台置前显示项目窗口。
(
  for _ in {1..20}; do
    sleep 2
    if pgrep -f "/Applications/wechatwebdevtools.app/Contents/MacOS/wechatdevtools" >/dev/null 2>&1; then
      open -b com.tencent.webplusdevtools >/dev/null 2>&1 || true
    fi
  done
) >/dev/null 2>&1 &
