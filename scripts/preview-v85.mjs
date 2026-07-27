import { createServer } from 'node:http';
import worker from '../dist/server/index.js';

const host = process.env.V85_HOST ?? '127.0.0.1';
const port = Number(process.env.V85_PORT ?? 4173);

const server = createServer(async (req, res) => {
  const request = new Request(`http://${req.headers.host}${req.url}`, {
    method: req.method,
    headers: req.headers,
  });
  const response = await worker.fetch(request);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (!response.body) return res.end();
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
});

server.listen(port, host, () => {
  console.log(`数智供销 v85 preview: http://${host}:${port}`);
});
