/**
 * Taro h5 编译产物缺少 index.html 入口（从纯小程序项目编译时常见）。
 * 本脚本在 build:h5 之后自动生成：
 *   1) dist/index.html —— Taro app 入口（手机内容本体）
 *   2) dist/demo.html  —— 手机模拟器外壳（电脑浏览器里以手机竖屏样展示，演示用）
 */
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, '..', 'dist-h5');
const jsDir = path.join(dist, 'js');

if (!fs.existsSync(jsDir)) {
  console.error('[gen-h5-index] 未找到 dist/js，请先运行 taro build --type h5');
  process.exit(1);
}

const jsFiles = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
const vendor = jsFiles.filter(f => f !== 'app.js').sort();
const ordered = [...vendor, ...(jsFiles.includes('app.js') ? ['app.js'] : [])];
// 一律使用相对路径：本地、/demo/ 子目录、独立域名三种部署方式都能打开，
// 避免手机演示版被部署到子目录后仍去网站根目录找资源而白屏。
const scriptTags = ordered.map(f => `  <script src="./js/${f}"></script>`).join('\n');

const cssTag = fs.existsSync(path.join(dist, 'css', 'app.css'))
  ? '  <link rel="stylesheet" href="./css/app.css">\n'
  : '';

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,minimum-scale=1,user-scalable=no,viewport-fit=cover">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="format-detection" content="telephone=no,address=no">
  <title>供享村社</title>
${cssTag}</head>
<body>
  <div id="app"></div>
${scriptTags}
</body>
</html>
`;

fs.writeFileSync(path.join(dist, 'index.html'), html);
// 兼容历史演示链接：app.html 与 m.html 均直接进入真实应用。
fs.writeFileSync(path.join(dist, 'app.html'), html);
fs.writeFileSync(path.join(dist, 'm.html'), html);

// 手机模拟器演示外壳：电脑浏览器里以手机竖屏样展示（访问 /demo.html）
const demoHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>供享村社 · 演示</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { min-height: 100vh; background: radial-gradient(circle at 50% 30%, #f0fdf4 0%, #d1d5db 100%); display: flex; align-items: center; justify-content: center; gap: 48px; font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; flex-wrap: wrap; padding: 24px; }
  .phone { width: 390px; height: 844px; max-height: 94vh; background: #111; border-radius: 46px; padding: 13px; box-shadow: 0 26px 70px rgba(0,0,0,.4); position: relative; flex-shrink: 0; }
  .phone .notch { position: absolute; top: 13px; left: 50%; transform: translateX(-50%); width: 150px; height: 28px; background: #111; border-radius: 0 0 20px 20px; z-index: 3; }
  .phone iframe { width: 100%; height: 100%; border: none; border-radius: 34px; background: #fff; display: block; }
  .side { max-width: 260px; color: #374151; }
  .side .logo { font-size: 26px; font-weight: 800; color: #15803d; margin-bottom: 6px; }
  .side .sub { font-size: 14px; color: #6b7280; margin-bottom: 22px; }
  .side ol { font-size: 14px; line-height: 2; color: #4b5563; padding-left: 20px; }
  .side .hint { margin-top: 20px; font-size: 12px; color: #9ca3af; line-height: 1.7; background: #fff; border-radius: 10px; padding: 12px 14px; box-shadow: 0 2px 10px rgba(0,0,0,.06); }
</style>
</head>
<body>
  <div class="phone">
    <div class="notch"></div>
    <iframe src="./index.html" allow="geolocation"></iframe>
  </div>
  <div class="side">
    <div class="logo">供享村社</div>
    <div class="sub">小程序 · H5 演示版（手机模式）</div>
    <ol>
      <li>点手机里的「微信一键登录」</li>
      <li>进入首页，点遍六大板块</li>
      <li>地图页可拖拽、缩放</li>
    </ol>
    <div class="hint">📱 这是手机模拟器视图，左侧即真实手机内的样子。<br>如需真机体验，用手机连同一 WiFi 访问电脑局域网地址即可。</div>
  </div>
</body>
</html>
`;
fs.writeFileSync(path.join(dist, 'demo.html'), demoHtml);

console.log('[gen-h5-index] 已生成 index/app/m/demo 四个兼容入口，入口 JS：' + ordered.join(', '));
