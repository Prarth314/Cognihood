// Test-only static server reproduces production security headers and rewrites.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist');
const config = JSON.parse(await readFile('vercel.json', 'utf8'));
const headers = config.headers.find(item => item.source === '/(.*)').headers;
const contentTypes = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.wasm':'application/wasm', '.png':'image/png', '.woff2':'font/woff2' };
createServer(async (request, response) => {
  try {
    for (const {key,value} of headers) response.setHeader(key,value);
    let name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (name === '/app' || name.startsWith('/app/')) { name='/app/index.html'; response.setHeader('Cache-Control','private, no-store'); }
    else if (['/','/mission','/how-it-works','/hardware','/login'].includes(name)) name = name === '/' ? '/index.html' : `${name}/index.html`;
    const file = path.resolve(root, `.${name}`);
    if (!file.startsWith(root + path.sep) || !(await stat(file)).isFile()) { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type',contentTypes[path.extname(file)] ?? 'application/octet-stream');
    response.end(await readFile(file));
  } catch { response.writeHead(404); response.end(); }
}).listen(4175,'127.0.0.1');
