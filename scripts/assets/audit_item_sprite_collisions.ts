// fallow-ignore-file security-sink
/**
 * scripts/assets/audit_item_sprite_collisions.ts
 *
 * Scans src/data/inventory/items.json, public/assets/sprites, and _raw-assets for:
 *  - Missing/non-existent physical sprite files on disk (reported as ERRORS)
 *  - Duplicate/colliding sprite paths shared by multiple items (reported as WARNINGS)
 *  - Raw assets availability in `_raw-assets/` ready for assignment/conversion (INFO)
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=* scripts/assets/audit_item_sprite_collisions.ts
 *   node --permission --experimental-strip-types --allow-fs-read=* scripts/assets/audit_item_sprite_collisions.ts --json
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { styleText } from 'node:util';

interface ShopItem {
  id: string;
  name?: string;
  cat?: string;
  sprite?: string;
  isCanon?: boolean;
  [key: string]: unknown;
}

interface SpriteCollisionGroup {
  sprite: string;
  count: number;
  items: Array<{ id: string; name: string; cat: string; hasRawAsset: boolean; rawAssetPath?: string }>;
}

interface MissingSpriteError {
  id: string;
  name: string;
  sprite?: string;
  expectedPath: string;
  reason: 'missing_property' | 'file_not_found';
}

function checkRawAssetExistence(itemId: string): { exists: boolean; path?: string } {
  const possiblePaths = [
    resolve(process.cwd(), '_raw-assets/public/assets/sprites/items', `${itemId}.png`),
    resolve(process.cwd(), '_raw-assets/public/assets/sprites/items', `${itemId}.webp`),
    resolve(process.cwd(), '_raw-assets/public/assets/sprites/crafting', `${itemId}.png`),
    resolve(process.cwd(), '_raw-assets/public/assets/sprites/crafting/tier0', `${itemId}.png`),
    resolve(process.cwd(), '_raw-assets/public/assets/sprites/crafting/tier1', `${itemId}.png`),
    resolve(process.cwd(), '_raw-assets/public/assets/sprites/crafting/tier2', `${itemId}.png`),
    resolve(process.cwd(), '_raw-assets/public/assets/sprites/crafting/tier3', `${itemId}.png`),
  ];

  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return { exists: true, path: p };
    }
  }
  return { exists: false };
}

export function findSpriteCollisions(items: ShopItem[]): SpriteCollisionGroup[] {
  const spriteMap = new Map<string, Array<{ id: string; name: string; cat: string; hasRawAsset: boolean; rawAssetPath?: string }>>();

  for (const item of items) {
    const sprite = item.sprite?.trim() || 'NO_SPRITE';
    if (!spriteMap.has(sprite)) {
      spriteMap.set(sprite, []);
    }
    const rawCheck = checkRawAssetExistence(item.id);
    spriteMap.get(sprite)!.push({
      id: item.id,
      name: item.name ?? 'Sin nombre', // text-ok
      cat: item.cat || 'unknown',
      hasRawAsset: rawCheck.exists,
      rawAssetPath: rawCheck.path,
    });
  }

  const collisions: SpriteCollisionGroup[] = [];
  for (const [sprite, itemList] of spriteMap.entries()) {
    if (itemList.length > 1) {
      collisions.push({
        sprite,
        count: itemList.length,
        items: itemList,
      });
    }
  }

  // Sort descending by collision frequency
  collisions.sort((a, b) => b.count - a.count);
  return collisions;
}

export function findMissingSprites(items: ShopItem[]): MissingSpriteError[] {
  const missing: MissingSpriteError[] = [];

  for (const item of items) {
    const sprite = item.sprite?.trim();
    if (!sprite) {
      missing.push({
        id: item.id,
        name: item.name ?? 'Sin nombre', // text-ok
        expectedPath: '',
        reason: 'missing_property',
      });
      continue;
    }

    const physicalPath = resolve(process.cwd(), 'public/assets/sprites', `${sprite}.webp`);
    if (!existsSync(physicalPath)) {
      missing.push({
        id: item.id,
        name: item.name ?? 'Sin nombre', // text-ok
        sprite,
        expectedPath: physicalPath,
        reason: 'file_not_found',
      });
    }
  }

  return missing;
}

function printMissingSpritesReport(missingSprites: MissingSpriteError[]): void {
  if (missingSprites.length === 0) return;
  console.log(styleText('red', '─── ❌ ERRORES: SPRITES FALTANTES O NO ENCONTRADOS EN public/ ──'));
  for (const err of missingSprites) {
    if (err.reason === 'missing_property') {
      console.log(styleText('red', '❌ [MISSING_SPRITE]'), `${err.name} (${err.id}) - No tiene la propiedad 'sprite' definida.`);
    } else {
      console.log(styleText('red', '❌ [FILE_NOT_FOUND]'), `${err.name} (${err.id}) - Archivo no existe: '${err.expectedPath}'`);
    }
  }
  console.log('');
}

function printCollisionGroupsReport(collisions: SpriteCollisionGroup[]): void {
  if (collisions.length === 0) return;
  console.log(styleText('yellow', '─── ⚠️  COLISIONES DE SPRITES Y ESTADO EN _raw-assets/ ──────────'));
  for (const group of collisions) {
    const rawReadyCount = group.items.filter(i => i.hasRawAsset).length;
    console.log(
      styleText('yellow', `⚠️  [SPRITE_COLLISION] (${group.count} ítems)`),
      `Sprite actual: '${styleText('bold', group.sprite)}'`,
      styleText('gray', `[${rawReadyCount}/${group.count} listos en _raw-assets]`)
    );
    for (const item of group.items) {
      const rawStatus = item.hasRawAsset
        ? styleText('green', '📥 [RAW DISPONIBLE]')
        : styleText('gray', '⏳ [PENDIENTE]');
      console.log(`   - ${item.name} (${styleText('gray', item.id)}) [cat: ${item.cat}] ${rawStatus}`);
    }
    console.log('');
  }
}

function printHumanSummary(
  totalItems: number,
  missingSprites: MissingSpriteError[],
  collisions: SpriteCollisionGroup[],
  totalAffectedItems: number,
  totalRawReady: number
): void {
  console.log(styleText('cyan', '\n🔍 ═══════════════════════════════════════════════════════════════════'));
  console.log(styleText('cyan', '   ITEM SPRITE INTEGRITY & RAW-ASSETS CROSS-AUDITOR'));
  console.log(styleText('cyan', '   ═══════════════════════════════════════════════════════════════════\n'));

  console.log(`📦 Total Items Scanned (items.json):           ${styleText('bold', String(totalItems))}`);
  console.log(`❌ Missing Physical Sprites (public/):          ${missingSprites.length > 0 ? styleText('red', String(missingSprites.length)) : styleText('green', '0 (100% OK)')}`);
  console.log(`⚠️  Sprite Collision Groups in items.json:       ${styleText('yellow', String(collisions.length))}`);
  console.log(`🚨 Items Sharing Colliding Sprites:            ${styleText('yellow', String(totalAffectedItems))}`);
  console.log(`📥 Ready Assets in _raw-assets/ for resolution: ${styleText('green', `${totalRawReady} / ${totalAffectedItems} (${Math.round((totalRawReady / (totalAffectedItems || 1)) * 100)}%)`)}\n`);

  printMissingSpritesReport(missingSprites);
  printCollisionGroupsReport(collisions);

  console.log(styleText('cyan', '───────────────────────────────────────────────────────────────────'));
  console.log(`Resumen: ${styleText('green', `${totalRawReady} sprites ya están en _raw-assets`)}, listos para asignarse y convertirse a public/.`);
  console.log(styleText('cyan', '───────────────────────────────────────────────────────────────────\n'));
}

export function runCollisionAudit(isJsonOutput = false): {
  totalItems: number;
  totalErrors: number;
  totalCollisionGroups: number;
  totalAffectedItems: number;
  totalRawReady: number;
  missingSprites: MissingSpriteError[];
  collisions: SpriteCollisionGroup[];
} {
  const itemsJsonPath = resolve(process.cwd(), 'src/data/inventory/items.json');
  if (!existsSync(itemsJsonPath)) {
    throw new Error(`items.json not found at ${itemsJsonPath}`);
  }

  const raw = readFileSync(itemsJsonPath, 'utf-8');
  const parsed = JSON.parse(raw) as { SHOP_ITEMS?: ShopItem[] };
  const shopItems = parsed.SHOP_ITEMS || [];

  const missingSprites = findMissingSprites(shopItems);
  const collisions = findSpriteCollisions(shopItems);
  const totalAffectedItems = collisions.reduce((sum, g) => sum + g.count, 0);

  let totalRawReady = 0;
  for (const group of collisions) {
    for (const item of group.items) {
      if (item.hasRawAsset) totalRawReady++;
    }
  }

  if (isJsonOutput) {
    console.log(JSON.stringify({
      totalItems: shopItems.length,
      totalErrors: missingSprites.length,
      totalCollisionGroups: collisions.length,
      totalAffectedItems,
      totalRawReadyInRawAssets: totalRawReady,
      missingSprites,
      collisions,
    }, null, 2));
  } else {
    printHumanSummary(shopItems.length, missingSprites, collisions, totalAffectedItems, totalRawReady);
  }

  return {
    totalItems: shopItems.length,
    totalErrors: missingSprites.length,
    totalCollisionGroups: collisions.length,
    totalAffectedItems,
    totalRawReady,
    missingSprites,
    collisions,
  };
}

if (process.argv[1]?.endsWith('audit_item_sprite_collisions.ts')) {
  const isJson = process.argv.includes('--json');
  const result = runCollisionAudit(isJson);
  if (result.totalErrors > 0) {
    process.exit(1);
  }
}
