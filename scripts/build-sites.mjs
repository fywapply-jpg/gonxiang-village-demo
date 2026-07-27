import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const distDir = resolve('dist');
const html = await readFile(resolve(distDir, 'index.html'), 'utf8');
const worker = `const html = ${JSON.stringify(html)};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    if (url.pathname === '/favicon.ico') {
      return new Response(null, { status: 204 });
    }
    return new Response(request.method === 'HEAD' ? null : html, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=0, must-revalidate',
        'x-content-type-options': 'nosniff'
      }
    });
  }
};
`;

await mkdir(resolve(distDir, 'server'), { recursive: true });
await writeFile(resolve(distDir, 'server/index.js'), worker);
