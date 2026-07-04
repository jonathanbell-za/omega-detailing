import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const PORT = process.env.PORT || 8080;
const ROOT = process.env.STATIC_ROOT || '.';

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
};

async function tryServe(filePath) {
  try {
    const info = await stat(filePath);
    if (info.isFile()) {
      const content = await readFile(filePath);
      const ext = extname(filePath).toLowerCase();
      return { content, mime: MIME_TYPES[ext] || 'application/octet-stream' };
    }
    if (info.isDirectory()) {
      const indexPath = join(filePath, 'index.html');
      const content = await readFile(indexPath);
      return { content, mime: 'text/html' };
    }
  } catch {
    return null;
  }
  return null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  // Try the exact path, then as directory with index.html, then .html extension
  const filePath = join(ROOT, pathname);
  const result =
    (await tryServe(filePath)) ||
    (await tryServe(filePath + '.html')) ||
    (await tryServe(join(ROOT, '404.html')));

  if (result) {
    res.writeHead(result === (await tryServe(join(ROOT, '404.html'))) ? 404 : 200, {
      'Content-Type': result.mime,
    });
    res.end(result.content);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Static server running on port ${PORT}`);
});
