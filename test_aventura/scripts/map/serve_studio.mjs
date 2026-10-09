import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { exec } from 'node:child_process';

const PORT = 3456;
const ROOT = path.resolve('.');

const STAGED_DIR = path.resolve('scratch/map_lab/tilesets/staged');
const STAGED_MANIFEST = path.join(STAGED_DIR, 'staged_manifest.json');
const CATALOG_DIR = path.resolve('scratch/map_lab/tilesets/catalog');
const CATALOG_FILE = path.join(CATALOG_DIR, 'tiles_catalog.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = parsedUrl.pathname;

  // --- API ROUTE: GET /api/tiles/staged ---
  if (req.method === 'GET' && pathname === '/api/tiles/staged') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    if (fs.existsSync(STAGED_MANIFEST)) {
      res.end(fs.readFileSync(STAGED_MANIFEST, 'utf8'));
    } else {
      res.end(JSON.stringify([]));
    }
    return;
  }

  // --- API ROUTE: GET /api/tiles/catalog ---
  if (req.method === 'GET' && pathname === '/api/tiles/catalog') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    if (fs.existsSync(CATALOG_FILE)) {
      res.end(fs.readFileSync(CATALOG_FILE, 'utf8'));
    } else {
      res.end(JSON.stringify({ version: '1.0', updatedAt: new Date().toISOString(), tiles: {} }));
    }
    return;
  }

  // --- API ROUTE: POST /api/tiles/classify ---
  if (req.method === 'POST' && pathname === '/api/tiles/classify') {
    try {
      const body = await readRequestBody(req);
      const items = Array.isArray(body.items) ? body.items : [];

      if (!fs.existsSync(CATALOG_DIR)) fs.mkdirSync(CATALOG_DIR, { recursive: true });

      let catalog = { version: '1.0', updatedAt: new Date().toISOString(), tiles: {} };
      if (fs.existsSync(CATALOG_FILE)) {
        try {
          catalog = JSON.parse(fs.readFileSync(CATALOG_FILE, 'utf8'));
        } catch (err) {
          console.warn('[serve_studio] Failed to parse existing catalog file:', err);
        }
      }

      let stagedList = [];
      if (fs.existsSync(STAGED_MANIFEST)) {
        try {
          stagedList = JSON.parse(fs.readFileSync(STAGED_MANIFEST, 'utf8'));
        } catch (err) {
          console.warn('[serve_studio] Failed to parse staged manifest:', err);
        }
      }

      const classifiedFiles = new Set();
      let processedCount = 0;

      for (const item of items) {
        if (!item.file || !item.category || !item.subcategory || !item.id) continue;

        const srcFile = path.join(STAGED_DIR, item.file);
        if (!fs.existsSync(srcFile)) continue;

        const targetSubdir = path.join(CATALOG_DIR, item.category, item.subcategory);
        if (!fs.existsSync(targetSubdir)) fs.mkdirSync(targetSubdir, { recursive: true });

        const ext = path.extname(item.file) || '.png';
        const targetFilename = `${item.id}${ext}`;
        const targetFile = path.join(targetSubdir, targetFilename);

        fs.copyFileSync(srcFile, targetFile);
        classifiedFiles.add(item.file);

        // Store relative path from catalog root
        const relCatalogPath = `${item.category}/${item.subcategory}/${targetFilename}`;

        catalog.tiles[item.id] = {
          category: item.category,
          subcategory: item.subcategory,
          path: relCatalogPath,
          tileSize: item.tileSize || 32,
          dimensions: item.dimensions || { width: 32, height: 32, cols: 1, rows: 1 },
          collision: item.collision || (item.category === 'terrain' && item.subcategory === 'mountains' ? 'solid' : 'passable'),
          tags: item.tags || [item.category, item.subcategory]
        };

        processedCount++;
      }

      catalog.updatedAt = new Date().toISOString();
      fs.writeFileSync(CATALOG_FILE, JSON.stringify(catalog, null, 2), 'utf8');

      // Update staged manifest removing classified files
      stagedList = stagedList.filter(entry => !classifiedFiles.has(entry.file));
      fs.writeFileSync(STAGED_MANIFEST, JSON.stringify(stagedList, null, 2), 'utf8');

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: true, count: processedCount, remaining: stagedList.length }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // --- STATIC FILE SERVING ---
  let reqUrl = decodeURI(pathname);
  if (reqUrl === '/' || reqUrl === '') reqUrl = '/scratch/map_lab/tile_classifier_studio.html';

  const filePath = path.join(ROOT, reqUrl);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`File not found: ${reqUrl}`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/scratch/map_lab/tile_classifier_studio.html`;
  console.log('======================================================================');
  console.log('🗺️ POKÉ VICIO: SERVIDOR LOCAL DE TILE STUDIO & KANTO MAPS');
  console.log('======================================================================');
  console.log(`🚀 Visor de Clasificación: ${url}`);
  console.log(`🌍 Estudio Kanto World:    http://localhost:${PORT}/scratch/map_lab/kanto_world_studio.html`);
  console.log('✨ API de clasificación local activa (/api/tiles/staged, /api/tiles/classify)');
  console.log('======================================================================');
  console.log('Presiona Ctrl+C para detener el servidor.\n');

  if (process.env.NO_AUTO_OPEN !== '1') {
    const openCmd = process.platform === 'win32' ? `start ${url}` :
                    process.platform === 'darwin' ? `open ${url}` : `xdg-open ${url}`;
    exec(openCmd);
  }
});
