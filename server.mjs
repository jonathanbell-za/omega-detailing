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

async function resolveFile(pathname) {
  const filePath = join(ROOT, pathname);

  try {
    const info = await stat(filePath);

    // If it's a file, serve it directly
    if (info.isFile()) {
      return filePath;
    }

    // If it's a directory, look for index.html inside it
    if (info.isDirectory()) {
      const indexPath = join(filePath, 'index.html');
      await stat(indexPath); // throws if not found
      return indexPath;
    }
  } catch {
    // not found at this path
  }

  // Try appending .html
  try {
    const htmlPath = filePath + '.html';
    const info = await stat(htmlPath);
    if (info.isFile()) return htmlPath;
  } catch {
    // not found
  }

  return null;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  let resolved = await resolveFile(pathname);
  let statusCode = 200;

  if (!resolved) {
    resolved = await resolveFile('/404.html');
    statusCode = resolved ? 404 : 404;
  }

  if (resolved) {
    const ext = extname(resolved).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    const content = await readFile(resolved);
    res.writeHead(statusCode, { 'Content-Type': mime });
    res.end(content);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Static server running on port ${PORT}`);
});
