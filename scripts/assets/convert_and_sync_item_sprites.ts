// fallow-ignore-file security-sink
/**
 * scripts/assets/convert_and_sync_item_sprites.ts
 *
 * 1. Converts all raw PNGs in `_raw-assets/public/assets/sprites/items/*.png` to WebP in `public/assets/sprites/items/*.webp`.
 * 2. Updates `src/data/inventory/items.json` so every item points to its dedicated sprite path `items/<id>`.
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=. --allow-fs-write=. scripts/assets/convert_and_sync_item_sprites.ts
 */

import fs from 'node:fs/promises';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { styleText } from 'node:util';

const RAW_ITEMS_DIR = path.resolve(process.cwd(), '_raw-assets/public/assets/sprites/items');
const PUBLIC_ITEMS_DIR = path.resolve(process.cwd(), 'public/assets/sprites/items');
const ITEMS_JSON_PATH = path.resolve(process.cwd(), 'src/data/inventory/items.json');

async function main() {
  console.log(styleText('cyan', '\n═══════════════════════════════════════════════════════'));
  console.log(styleText('cyan', '   ITEM SPRITE CONVERTER & DATABASE SYNC'));
  console.log(styleText('cyan', '═══════════════════════════════════════════════════════\n'));

  // 1. Ensure target directory exists
  await fs.mkdir(PUBLIC_ITEMS_DIR, { recursive: true });

  // 2. Read raw assets
  const files = await fs.readdir(RAW_ITEMS_DIR);
  const pngFiles = files.filter(f => f.endsWith('.png'));

  console.log(styleText('yellow', `🖼️  Convirtiendo ${pngFiles.length} sprites de items a WebP...`));

  let convertedCount = 0;
  for (const file of pngFiles) {
    const rawPath = path.join(RAW_ITEMS_DIR, file);
    const baseName = path.basename(file, '.png');
    const webpPath = path.join(PUBLIC_ITEMS_DIR, `${baseName}.webp`);

    const inputBuf = await fs.readFile(rawPath);
    await sharp(inputBuf)
      .webp({ quality: 90, lossless: true })
      .toFile(webpPath);
    convertedCount++;
  }

  console.log(styleText('green', `✅ ${convertedCount} sprites convertidos a WebP en public/assets/sprites/items/\n`));

  // 3. Update items.json
  console.log(styleText('yellow', `📦 Actualizando rutas de sprites en items.json...`));
  const rawDb = readFileSync(ITEMS_JSON_PATH, 'utf-8');
  const db = JSON.parse(rawDb) as { SHOP_ITEMS: Array<{ id: string; sprite?: string; [key: string]: unknown }> };

  let updatedCount = 0;
  let keptCount = 0;

  for (const item of db.SHOP_ITEMS) {
    const itemWebpPath = path.join(PUBLIC_ITEMS_DIR, `${item.id}.webp`);
    if (existsSync(itemWebpPath)) {
      item.sprite = `items/${item.id}`;
      updatedCount++;
    } else {
      keptCount++;
    }
  }

  writeFileSync(ITEMS_JSON_PATH, JSON.stringify(db, null, 2), 'utf-8');

  console.log(styleText('green', `✅ Base de datos items.json actualizada:`));
  console.log(`   - ${styleText('bold', String(updatedCount))} items actualizados a 'items/<id>'`);
  console.log(`   - ${styleText('gray', String(keptCount))} items conservaron su sprite de crafting/tier\n`);
  console.log(styleText('cyan', '═══════════════════════════════════════════════════════\n'));
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal: ${(err as Error).message}`));
  process.exit(1);
});
