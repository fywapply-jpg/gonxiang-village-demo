import { build } from 'esbuild';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';

const projectDir = resolve('.');
const appDir = resolve('shuzhi-demo');
const assetsDir = join(appDir, 'assets');
const productDir = join(appDir, 'static/products');
const sharedImageDir = resolve('v3.1demo/static/images/assets');
const outputDir = resolve('deliverables');
const outputFile = join(outputDir, '数智供销-v85-手机离线演示版.html');

const mimeTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const dataUrls = new Map();

async function addDataUrl(key, file) {
  const data = await readFile(file);
  const mime = mimeTypes[extname(file).toLowerCase()] ?? 'application/octet-stream';
  dataUrls.set(key, `data:${mime};base64,${data.toString('base64')}`);
}

for (const name of await readdir(productDir)) {
  await addDataUrl(`/static/products/${name}`, join(productDir, name));
  await addDataUrl(`/gonxiang-village-demo/shuzhi/static/products/${name}`, join(productDir, name));
}

for (const name of await readdir(sharedImageDir)) {
  await addDataUrl(`/static/images/assets/${name}`, join(sharedImageDir, name));
  await addDataUrl(`/gonxiang-village-demo/shuzhi/static/images/assets/${name}`, join(sharedImageDir, name));
}

await addDataUrl(
  '/gonxiang-village-demo/shuzhi/static/brand-logo.png',
  join(appDir, 'static/brand-logo.png'),
);
await addDataUrl('/shuzhi/static/brand-logo.png', join(appDir, 'static/brand-logo.png'));

function inlineAssetUrls(source) {
  let output = source;
  for (const [path, dataUrl] of dataUrls) {
    output = output.split(path).join(dataUrl);
  }
  return output;
}

const mainEntry = join(assetsDir, 'index-Br9j10hx.js');
const bundle = await build({
  absWorkingDir: projectDir,
  entryPoints: [mainEntry],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: ['ios15', 'chrome100'],
  write: false,
  minify: true,
  treeShaking: false,
  plugins: [{
    name: 'v85-offline-assets',
    setup(buildApi) {
      buildApi.onLoad({ filter: /\.js$/ }, async ({ path }) => {
        let contents = await readFile(path, 'utf8');
        contents = inlineAssetUrls(contents);
        if (path === mainEntry) {
          contents = contents.replace(
            'if(n&&n.length>0){document.getElementsByTagName("link");',
            'if(n&&(n=n.filter(t=>!t.endsWith(".css"))).length>0){document.getElementsByTagName("link");',
          );
        }
        return { contents, loader: 'js' };
      });
    },
  }],
});

const cssFiles = (await readdir(assetsDir))
  .filter(name => name.endsWith('.css'))
  .sort();
const css = (await Promise.all(cssFiles.map(async name => {
  const content = inlineAssetUrls(await readFile(join(assetsDir, name), 'utf8'));
  return `/* ${name} */\n${content}`;
}))).join('\n');

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width,user-scalable=no,initial-scale=1,maximum-scale=1,minimum-scale=1,viewport-fit=cover">
    <meta name="theme-color" content="#2f8f54">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="数智供销 v85">
    <meta name="description" content="数智供销 v85 手机离线演示版">
    <title>数智供销 v85 · 手机离线演示版</title>
    <style>
      html,body,#app{width:100%;min-height:100%;margin:0}
      body{-webkit-tap-highlight-color:transparent;overscroll-behavior:none}
      ${css}
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script>${bundle.outputFiles[0].text}</script>
  </body>
</html>`;

await mkdir(outputDir, { recursive: true });
await writeFile(outputFile, html);
console.log(`${basename(outputFile)} ${(Buffer.byteLength(html) / 1024 / 1024).toFixed(2)} MB`);
