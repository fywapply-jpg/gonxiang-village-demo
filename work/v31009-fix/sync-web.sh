#!/bin/bash
# 一键把 v3.1 同步到公网演示（v3 已冻结存档，v3.1 继续迭代）
# 用法：bash /Users/fengwen/gonxiang-miniapp-v3.1/sync-web.sh "本次更新说明"
set -e
V31=/Users/fengwen/gonxiang-miniapp-v3.1
WEB=/Users/fengwen/gonxiang-village-demo
echo "① 构建 H5…"
cd "$V31" && npm run build:h5 2>&1 | tail -1
echo "② 复制到公网目录 v3.1demo…"
cp -R "$V31/dist-h5/." "$WEB/v3.1demo/"
echo "③ 提交并推送…"
cd "$WEB"
git config http.postBuffer 524288000
git add v3.1demo
git commit -m "deploy: 同步 v3.1 到公网 ${1:-更新}" || echo "（无改动，跳过提交）"
git push origin main
echo "✓ v3.1 公网已同步完成"
