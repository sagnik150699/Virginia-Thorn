'use strict';
// A tiny static file server for the website in public/, with no dependencies.
// Used by `npm run serve` (scripts/serve.js) and by the browser smoke test in scripts/check.js.
//
// It copies the parts of Firebase Hosting that matter when previewing:
//   - "/" serves index.html, and "/bio" serves bio.html (Firebase's cleanUrls setting)
//   - an unknown address gets 404.html with status 404
//   - files whose name starts with a dot are never served (Firebase does not deploy them)
//   - Range requests work, so the audio players can seek (python -m http.server cannot do this)
// It listens on 127.0.0.1 only, so nothing outside this computer can reach it.

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
};

function contentType(file) {
  return MIME_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

// Turns the path part of a URL into a file inside root, or null.
// Never returns anything outside root, whatever the URL contains.
function findFile(root, urlPath) {
  let rel;
  try {
    rel = decodeURIComponent(urlPath);
  } catch {
    return null; // badly encoded address
  }
  if (rel.includes('\0') || rel.includes('\\')) return null;

  const candidates = [];
  if (rel.endsWith('/')) {
    candidates.push(rel + 'index.html');
  } else {
    candidates.push(rel);
    // Clean URLs: "/bio" means bio.html
    if (!path.posix.extname(rel)) candidates.push(rel + '.html', rel + '/index.html');
  }

  for (const candidate of candidates) {
    const file = path.resolve(root, '.' + path.posix.normalize('/' + candidate));
    if (file !== root && !file.startsWith(root + path.sep)) continue; // outside public/: refuse
    if (path.basename(file).startsWith('.')) continue; // dot-files are never deployed
    let stat;
    try {
      stat = fs.statSync(file);
    } catch {
      continue;
    }
    if (stat.isFile()) return { file, stat };
  }
  return null;
}

// Sends one file, or the requested byte range of it (audio players ask for ranges when seeking).
function sendFile(req, res, { file, stat }, status) {
  const headers = {
    'Content-Type': contentType(file),
    'Cache-Control': 'no-store', // always show the latest edit when previewing
    'X-Content-Type-Options': 'nosniff',
    'Accept-Ranges': 'bytes',
  };
  let start = 0;
  let end = stat.size - 1;

  const range = status === 200 ? req.headers.range : undefined;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    let valid = Boolean(m && (m[1] || m[2]));
    if (valid) {
      if (m[1]) {
        start = Number(m[1]);
        if (m[2]) end = Math.min(Number(m[2]), stat.size - 1);
      } else {
        start = Math.max(stat.size - Number(m[2]), 0); // "bytes=-500" means the last 500 bytes
      }
      valid = start <= end && start < stat.size;
    }
    if (!valid) {
      res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
      res.end();
      return 416;
    }
    status = 206;
    headers['Content-Range'] = `bytes ${start}-${end}/${stat.size}`;
  }

  headers['Content-Length'] = stat.size === 0 ? 0 : end - start + 1;
  res.writeHead(status, headers);
  if (req.method === 'HEAD' || stat.size === 0) {
    res.end();
  } else {
    const stream = fs.createReadStream(file, { start, end });
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  }
  return status;
}

function makeHandler(root, onRequest) {
  return (req, res) => {
    let status;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      status = 405;
      res.writeHead(status, { Allow: 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method not allowed\n');
    } else {
      const urlPath = new URL(req.url, 'http://localhost').pathname;
      const found = findFile(root, urlPath);
      if (found) {
        status = sendFile(req, res, found, 200);
      } else {
        // Like Firebase: unknown addresses get the site's own 404 page
        const notFoundPage = findFile(root, '/404.html');
        if (notFoundPage) {
          status = sendFile(req, res, notFoundPage, 404);
        } else {
          status = 404;
          res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not found\n');
        }
      }
    }
    if (onRequest) onRequest(req, status);
  };
}

// Starts the server. Port 0 means "any free port".
// Resolves to { url, port, close() }; close() also drops open keep-alive connections.
function startServer({ root, host = '127.0.0.1', port = 0, onRequest } = {}) {
  const absRoot = path.resolve(root);
  const server = http.createServer(makeHandler(absRoot, onRequest));
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => {
      server.off('error', reject);
      const actualPort = server.address().port;
      resolve({
        server,
        port: actualPort,
        url: `http://${host}:${actualPort}/`,
        close: () =>
          new Promise((done) => {
            if (server.closeAllConnections) server.closeAllConnections();
            server.close(() => done());
          }),
      });
    });
  });
}

module.exports = { startServer, findFile, MIME_TYPES };
