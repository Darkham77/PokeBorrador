/**
 * scripts/assets/organize_item_sprites_by_tier.ts
 *
 * Places each downloaded item sprite into its exact crafting/tierX folder
 * based on item.craftingTier (tier0, tier1, tier2, tier3).
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-addons --allow-fs-read=. --allow-fs-write=. scripts/assets/organize_item_sprites_by_tier.ts
 */

import fs from 'node:fs/promises';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { styleText } from 'node:util';

const RAW_BASE = path.resolve(process.cwd(), '_raw-assets/public/assets/sprites');
const RAW_ITEMS_DIR = path.join(RAW_BASE, 'items');
const PUBLIC_BASE = path.resolve(process.cwd(), 'public/assets/sprites');
const PUBLIC_ITEMS_DIR = path.join(PUBLIC_BASE, 'items');
const ITEMS_JSON_PATH = path.resolve(process.cwd(), 'src/data/inventory/items.json');

async function main() {
  console.log(styleText('cyan', '\n═══════════════════════════════════════════════════════'));
  console.log(styleText('cyan', '   REUBICACIÓN DE SPRITES A CRAFTING/TIER[0-3]'));
  console.log(styleText('cyan', '═══════════════════════════════════════════════════════\n'));

  // Ensure crafting tier directories exist
  for (let t = 0; t <= 3; t++) {
    await fs.mkdir(path.join(RAW_BASE, 'crafting', `tier${t}`), { recursive: true });
    await fs.mkdir(path.join(PUBLIC_BASE, 'crafting', `tier${t}`), { recursive: true });
  }

  const rawDb = readFileSync(ITEMS_JSON_PATH, 'utf-8');
  const db = JSON.parse(rawDb) as { SHOP_ITEMS: Array<{ id: string; craftingTier?: number; sprite?: string; [key: string]: unknown }> };

  let movedRaw = 0;
  let convertedWebp = 0;
  let updatedJson = 0;

  for (const item of db.SHOP_ITEMS) {
    const tier = item.craftingTier ?? 3;
    const tierFolder = `crafting/tier${tier}`;
    const targetRawPath = path.join(RAW_BASE, tierFolder, `${item.id}.png`);
    const targetWebpPath = path.join(PUBLIC_BASE, tierFolder, `${item.id}.webp`);

    // Check if sprite exists in items/ (raw or converted)
    const sourceRawPath = path.join(RAW_ITEMS_DIR, `${item.id}.png`);
    const sourceWebpPath = path.join(PUBLIC_ITEMS_DIR, `${item.id}.webp`);

    if (existsSync(sourceRawPath)) {
      const buf = await fs.readFile(sourceRawPath);
      await fs.writeFile(targetRawPath, buf);
      movedRaw++;

      // Convert to WebP in target tier directory
      await sharp(buf)
        .webp({ quality: 90, lossless: true })
        .toFile(targetWebpPath);
      convertedWebp++;
    } else if (existsSync(sourceWebpPath) && !existsSync(targetWebpPath)) {
      const buf = await fs.readFile(sourceWebpPath);
      await fs.writeFile(targetWebpPath, buf);
      convertedWebp++;
    }

    // Set canonical sprite path in items.json
    if (existsSync(targetWebpPath) || existsSync(targetRawPath)) {
      item.sprite = `${tierFolder}/${item.id}`;
      updatedJson++;
    } else if (!item.sprite) {
      item.sprite = `${tierFolder}/${item.id}`;
    }
  }

  // Save updated items.json
  writeFileSync(ITEMS_JSON_PATH, JSON.stringify(db, null, 2), 'utf-8');

  // Clean up temporary items/ directory
  if (existsSync(RAW_ITEMS_DIR)) {
    await fs.rm(RAW_ITEMS_DIR, { recursive: true, force: true });
  }
  if (existsSync(PUBLIC_ITEMS_DIR)) {
    await fs.rm(PUBLIC_ITEMS_DIR, { recursive: true, force: true });
  }

  console.log(styleText('green', `✅ Reubicación y conversión completada con éxito:`));
  console.log(`   - ${styleText('bold', String(movedRaw))} archivos RAW ubicados en _raw-assets/public/assets/sprites/crafting/tier[0-3]/`);
  console.log(`   - ${styleText('bold', String(convertedWebp))} archivos WebP generados en public/assets/sprites/crafting/tier[0-3]/`);
  console.log(`   - ${styleText('bold', String(updatedJson))} ítems actualizados en items.json a 'crafting/tierX/<id>'`);
  console.log(`   - Carpeta temporal 'items/' eliminada correctamente.\n`);
  console.log(styleText('cyan', '═══════════════════════════════════════════════════════\n'));
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal: ${(err as Error).message}`));
  process.exit(1);
});
