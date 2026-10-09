/**
 * scripts/map/serve_mobile_gallery.ts
 *
 * Lightweight HTTP server to serve generated map previews and mobile gallery
 * directly to phones and external devices on the local network.
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const PORT = 8088;
const DIR = path.resolve(process.cwd(), 'scratch/maps');

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.css': 'text/css',
  '.js': 'application/javascript'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url?.split('?')[0] || '/';
  if (reqPath === '/' || reqPath === '/galeria') {
    reqPath = '/galeria_continentes_mobile.html';
  }

  const filePath = path.join(DIR, decodeURIComponent(reqPath));

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404 Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  const stat = fs.statSync(filePath);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size,
    'Access-Control-Allow-Origin': '*'
  });

  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🌐 Servidor de Galería Móvil iniciado en puerto ${PORT}:`);
  console.log(`📱 En tu celular (mismo Wi-Fi): http://192.168.18.4:${PORT}/`);
  console.log(`💻 En tu PC:                    http://localhost:${PORT}/`);
  console.log(`======================================================\n`);
});
