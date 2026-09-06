#!/bin/zsh
set -euo pipefail

PROJECT_DIR="/Users/fengwen/gonxiang-village-demo/work/shuzhi-v8502-source/dist/build/mp-weixin"
ROOT_DIR="/Users/fengwen/gonxiang-village-demo"
DEVTOOLS_APP="/Applications/wechatwebdevtools.app"
API_LOG="/tmp/shuzhi-v8533-local-api.log"
API_PID_FILE="/tmp/shuzhi-v8533-local-api.pid"
LAN_HOST="${VITE_API_HOST:-$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || true)}"

# 8787 可能被历史项目占用。只有返回数智供社自己的健康字段才复用，
# 否则自动选择 8788—8799，避免把小程序请求发到旧 server/index.js。
API_PORT="${VITE_API_PORT:-8787}"
is_shuzhi_api() {
  curl -fsS --max-time 2 "http://127.0.0.1:${API_PORT}/health" 2>/dev/null | \
    /usr/bin/grep -q '"platform_version":"v8533"'
}
if [[ "${VITE_API_PORT:-}" == "" ]] && ! is_shuzhi_api; then
  for candidate in {8787..8799}; do
    if ! /usr/sbin/lsof -nP -iTCP:"$candidate" -sTCP:LISTEN >/dev/null 2>&1; then
      API_PORT="$candidate"
      break
    fi
  done
fi
API_URL="http://127.0.0.1:${API_PORT}/health"

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
echo "正在按当前电脑网络地址更新小程序构建产物..."
(
  cd "$ROOT_DIR"
  VITE_API_PORT="$API_PORT" npm run build:shuzhi-mp
)
echo "项目目录：$PROJECT_DIR"
# 先确保前台点击登录、订单和后台接口有本地 BFF 可用；已运行时不重复启动。
if ! is_shuzhi_api; then
  echo "本地 API 未运行，正在启动（日志：$API_LOG）"
  (
    cd "$ROOT_DIR"
    nohup /usr/bin/env PORT="$API_PORT" node local-backend/server.mjs >"$API_LOG" 2>&1 &
    echo $! >"$API_PID_FILE"
  )
  for _ in {1..15}; do
    if is_shuzhi_api; then
      echo "本地 API 已就绪：http://127.0.0.1:${API_PORT}"
      break
    fi
    sleep 1
  done
  if ! is_shuzhi_api; then
    echo "警告：本地 API 未在 15 秒内就绪，请查看：$API_LOG"
  fi
else
  echo "本地 API 已运行：http://127.0.0.1:${API_PORT}"
fi
if [[ -n "$LAN_HOST" ]]; then
  echo "手机同 Wi-Fi 联调地址：http://$LAN_HOST:${API_PORT}"
fi
# 先关闭旧会话，避免微信开发者工具复用失效的空白模拟器页面。
CLI="$DEVTOOLS_APP/Contents/MacOS/cli"
"$CLI" quit --lang zh >/dev/null 2>&1 || true
# 等待旧进程真正退出，否则 macOS 会把配置文件交给欢迎页而不是项目窗口。
for _ in {1..30}; do
  if ! pgrep -f "/Applications/wechatwebdevtools.app/Contents/MacOS/wechatdevtools" >/dev/null 2>&1; then break; fi
  sleep 1
done
# 使用微信官方 CLI 精确载入项目，避免 macOS 将 project.config.json 当成普通文本
# 或把 IDE 带回最近项目列表；CLI 失败时再回退到配置文件打开方式。
if ! "$CLI" open --project "$PROJECT_DIR" --lang zh; then
  echo "官方 CLI 打开失败，尝试回退打开项目配置文件"
  open -a "$DEVTOOLS_APP" "$PROJECT_DIR/project.config.json"
fi
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
