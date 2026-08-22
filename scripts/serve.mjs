import { access, readFile, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { createServer } from 'node:http';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requestedDirectory = process.argv[2] || 'dist';
const rootDirectory = path.resolve(projectRoot, requestedDirectory);
const port = Number(process.argv[3] || process.env.PORT || 4173);

try {
  await access(path.join(rootDirectory, 'index.html'), constants.R_OK);
} catch {
  const result = spawnSync(process.execPath, [path.join(projectRoot, 'scripts', 'build.mjs')], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env
  });
  if (result.status !== 0) process.exit(result.status || 1);
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function safePathname(value) {
  let decoded;
  try { decoded = decodeURIComponent(value); } catch { return null; }
  const normalized = path.posix.normalize(decoded).replace(/^\/+/, '');
  if (normalized.startsWith('..')) return null;
  return normalized;
}

async function resolveFile(pathname) {
  const safe = safePathname(pathname);
  if (safe === null) return null;
  const candidates = [];
  const direct = path.join(rootDirectory, safe);
  if (!safe || pathname.endsWith('/')) candidates.push(path.join(direct, 'index.html'));
  else {
    candidates.push(direct);
    if (!path.extname(safe)) candidates.push(path.join(direct, 'index.html'));
  }

  for (const candidate of candidates) {
    if (!candidate.startsWith(rootDirectory)) continue;
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch { /* try the next candidate */ }
  }
  return null;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    let filePath = await resolveFile(url.pathname);
    let statusCode = 200;
    if (!filePath) {
      filePath = path.join(rootDirectory, '404.html');
      statusCode = 404;
    }
    const data = await readFile(filePath);
    response.writeHead(statusCode, {
      'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(`Internal server error\n${error instanceof Error ? error.message : String(error)}`);
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`FIVEGRID preview: http://localhost:${port}`);
});
