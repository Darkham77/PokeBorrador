/**
 * scripts/map/download_open_tilesets.mjs
 *
 * Downloads open tileset resources directly into scratch/map_lab/tilesets/inbox/
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { parseArgs, styleText } from 'node:util';

const INBOX_DIR = path.resolve('scratch/map_lab/tilesets/inbox');

// Default open tileset resources from recommended sources
const DEFAULT_RESOURCES = [
  {
    name: 'rmxp_tileset_general.png',
    url: 'https://i.imgur.com/fgrkRF2.png',
    description: 'RMXP Pokémon Essentials General Tileset'
  },
  {
    name: 'gen3_desert_snow_tileset.png',
    url: 'https://i.imgur.com/niRbB1J.png',
    description: 'Gen 3 Desert & Snow Biome Tileset'
  }
];

function printHelp() {
  console.log(`
${styleText('bold', '📥 POKÉ VICIO - OPEN TILESET DOWNLOADER')}

Uso:
  npm run map:tiles:download [opciones]
  node ./scripts/map/download_open_tilesets.mjs [opciones]

Opciones:
  --help, -h          Muestra este mensaje de ayuda
  --url=<url>         Descarga una imagen específica directamente al inbox
  --name=<filename>   Nombre de archivo destino (opcional, cuando se pasa --url)
  --all               Descarga todas las fuentes abiertas predeterminadas (por defecto)

Ejemplos:
  npm run map:tiles:download
  npm run map:tiles:download url=https://i.imgur.com/fgrkRF2.png name=custom_tiles.png
`);
}

/**
 * Downloads a single file via HTTP/HTTPS following redirects.
 */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (!redirectUrl.startsWith('http')) {
          const origin = new URL(url).origin;
          redirectUrl = origin + redirectUrl;
        }
        return downloadFile(redirectUrl, destPath).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage} from ${url}`));
      }

      const fileStream = fs.createWriteStream(destPath);
      res.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(destPath);
      });

      fileStream.on('error', (err) => {
        fs.unlink(destPath, () => {});
        reject(err);
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error(`Timeout downloading ${url}`));
    });
  });
}

async function main() {
  const { values, positionals } = parseArgs({
    options: {
      help: { type: 'boolean', short: 'h' },
      url: { type: 'string' },
      name: { type: 'string' },
      all: { type: 'boolean' }
    },
    allowPositionals: true,
    strict: false
  });

  if (values.help || positionals.includes('help')) {
    printHelp();
    process.exit(0);
  }

  // Parse key=value positional arguments (npm run convention)
  for (const pos of positionals) {
    if (pos.includes('=')) {
      const [k, v] = pos.split('=');
      if (k === 'url') values.url = v;
      if (k === 'name') values.name = v;
    }
  }

  if (!fs.existsSync(INBOX_DIR)) {
    fs.mkdirSync(INBOX_DIR, { recursive: true });
  }

  console.log(styleText('bold', '\n======================================================================'));
  console.log(styleText('bold', '📥 POKÉ VICIO: DESCARGADOR DE RECURSOS ABIERTOS DE TILESETS'));
  console.log(styleText('dim', `📁 Directorio Inbox: ${INBOX_DIR}`));
  console.log(styleText('bold', '======================================================================\n'));

  const queue = [];

  if (values.url) {
    const filename = values.name || path.basename(new URL(values.url).pathname) || 'downloaded_tileset.png';
    queue.push({
      name: filename,
      url: values.url,
      description: 'Custom URL resource'
    });
  } else {
    queue.push(...DEFAULT_RESOURCES);
  }

  let successCount = 0;
  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];
    const dest = path.join(INBOX_DIR, item.name);
    console.log(`[${i + 1}/${queue.length}] Descargando ${styleText('cyan', item.name)}...`);
    console.log(`    Fuente: ${styleText('dim', item.url)}`);

    try {
      await downloadFile(item.url, dest);
      const stat = fs.statSync(dest);
      console.log(`    ${styleText('green', '✓ Guardado exitosamente')} (${(stat.size / 1024).toFixed(1)} KB) -> ${dest}\n`);
      successCount++;
    } catch (err) {
      console.error(`    ${styleText('red', '✗ Error al descargar:')} ${err.message}\n`);
    }
  }

  console.log(styleText('bold', `✨ Completado: ${successCount}/${queue.length} tilesets listos en inbox.`));
  console.log(styleText('dim', `Siguiente paso: Ejecuta 'npm run map:tiles:extract' para segmentar los tiles.\n`));
}

main().catch(err => {
  console.error(styleText('red', `Error fatal: ${err.message}`));
  process.exit(1);
});
