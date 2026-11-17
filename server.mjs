import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const args = process.argv.slice(2);
const argValue = (name, fallback) => {
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : fallback;
};
const port = Number(argValue('--port', process.env.PORT || 7100));
const host = argValue('--host', '0.0.0.0');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const relative = normalize(pathname).replace(/^([/\\])+/, '');
  let file = join(root, relative || 'index.html');
  if (!file.startsWith(root)) { res.writeHead(403); res.end('Forbidden'); return; }
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404); res.end('Not found'); return; }
  const extension = extname(file).toLowerCase();
  const headers = { 'Content-Type': mime[extension] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' };
  if (req.method === 'HEAD') { res.writeHead(200, headers); res.end(); return; }
  if (extension === '.mp3') {
    const size = statSync(file).size;
    headers['Accept-Ranges'] = 'bytes';
    const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
    if (match) {
      let start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2] || 0));
      let end = match[1] ? (match[2] ? Number(match[2]) : size - 1) : size - 1;
      end = Math.min(end, size - 1);
      if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start > end || start >= size) {
        res.writeHead(416, { ...headers, 'Content-Range': `bytes */${size}` }); res.end(); return;
      }
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
      createReadStream(file, { start, end }).pipe(res); return;
    }
    headers['Content-Length'] = size;
  }
  res.writeHead(200, headers);
  createReadStream(file).pipe(res);
});
server.listen(port, host, () => console.log(`Meme Music Lab: http://localhost:${port}/`));
