import { readdir, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const sourceDir = resolve('shuzhi-demo');
const sharedImageDir = resolve('v3.1demo/static/images/assets');
const distDir = resolve('dist');

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

const files = await walk(sourceDir);
const resources = {};

for (const file of files) {
  const key = relative(sourceDir, file).split('\\').join('/');
  let data = await readFile(file);
  if (key === 'index.html') {
    const html = data.toString('utf8').replace(
      '<head>',
      `<head>
<script>
  if (window.matchMedia('(max-width: 820px)').matches) {
    window.location.replace('app.html?v=85');
  }
</script>`,
    );
    data = Buffer.from(html);
  }
  if (key === 'app.html') {
    const html = data.toString('utf8').replace(
      '<meta charset="UTF-8" />',
      `<meta charset="UTF-8" />
    <meta name="theme-color" content="#2f8f54" />
    <meta name="description" content="数智供销 v85 手机演示版，覆盖农产品供应链、金融服务、产销对接、溯源与村社服务。" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="数智供销" />`,
    );
    data = Buffer.from(html);
  }
  resources[key] = {
    body: data.toString('base64'),
    type: mimeTypes[extname(file).toLowerCase()] ?? 'application/octet-stream',
  };
}

for (const file of await walk(sharedImageDir)) {
  const key = `static/images/assets/${relative(sharedImageDir, file).split('\\').join('/')}`;
  const data = await readFile(file);
  resources[key] = {
    body: data.toString('base64'),
    type: mimeTypes[extname(file).toLowerCase()] ?? 'application/octet-stream',
  };
}

const worker = `const resources = ${JSON.stringify(resources)};

function decode(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function resourceKey(pathname) {
  let path = decodeURIComponent(pathname).replace(/^\\/+/, '');
  if (!path || path === 'index.html') return 'index.html';
  if (path.startsWith('gonxiang-village-demo/shuzhi/')) {
    path = path.slice('gonxiang-village-demo/shuzhi/'.length);
  } else if (path.startsWith('shuzhi/')) {
    path = path.slice('shuzhi/'.length);
  }
  if (path === 'app' || path.startsWith('app/')) return 'app.html';
  return path;
}

export default {
  async fetch(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const key = resourceKey(url.pathname);
    const resource = resources[key];
    if (!resource) return new Response('Not Found', { status: 404 });

    const headers = {
      'content-type': resource.type,
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'strict-origin-when-cross-origin',
      'cache-control': key.endsWith('.html')
        ? 'no-cache, no-store, must-revalidate'
        : 'public, max-age=31536000, immutable',
    };
    return new Response(request.method === 'HEAD' ? null : decode(resource.body), { headers });
  },
};
`;

await rm(distDir, { recursive: true, force: true });
await mkdir(resolve(distDir, 'server'), { recursive: true });
await writeFile(resolve(distDir, 'server/index.js'), worker);
