// Local server for development and the browser tests: serves the static files and runs
// the /api functions the same way Vercel does. Data goes to .data/ unless a Blob token is set.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2] || process.env.PORT || 5300);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };

http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const name = url.pathname.slice(5).replace(/[^\w-]/g, '');
      const mod = await import(pathToFileURL(path.join(root, 'api', `${name}.js`)).href);
      req.query = Object.fromEntries(url.searchParams);
      return await mod.default(req, res);
    }
    let file = path.join(root, decodeURIComponent(url.pathname));
    if (!file.startsWith(root)) throw Object.assign(new Error('bad path'), { code: 'ENOENT' });
    if (url.pathname === '/' || !path.extname(file)) file = path.join(root, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch (err) {
    res.writeHead(err.code === 'ENOENT' || err.code === 'ERR_MODULE_NOT_FOUND' ? 404 : 500, { 'Content-Type': 'text/plain' });
    res.end(err.code === 'ENOENT' ? 'Not found' : String(err));
  }
}).listen(port, () => console.log(`Quizzy on http://localhost:${port}`));
