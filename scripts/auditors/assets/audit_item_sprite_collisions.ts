/**
 * scripts/auditors/assets/audit_item_sprite_collisions.ts
 *
 * Scans src/data/inventory/items.json, public/assets/sprites, and _raw-assets for:
 *  - Missing/non-existent physical sprite files on disk (reported as ERRORS)
 *  - Duplicate/colliding sprite paths shared by multiple items (reported as WARNINGS)
 *  - Raw assets availability in `_raw-assets/` ready for assignment/conversion (INFO)
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=* scripts/auditors/assets/audit_item_sprite_collisions.ts
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { setupValidation } from '../../lib/validationBase.ts';

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

export type MissingSpriteReason = 'missing_property' | 'file_not_found';

interface MissingSpriteError {
  id: string;
  name: string;
  sprite?: string;
  expectedPath: string;
  reason: MissingSpriteReason;
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
      name: item.name ?? 'Sin nombre', // text-ok: UI text display localization string
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
        name: item.name ?? 'Sin nombre', // text-ok: UI text display localization string
        expectedPath: '',
        reason: 'missing_property',
      });
      continue;
    }

    const physicalPath = resolve(process.cwd(), 'public/assets/sprites', `${sprite}.webp`);
    if (!existsSync(physicalPath)) {
      missing.push({
        id: item.id,
        name: item.name ?? 'Sin nombre', // text-ok: UI text display localization string
        sprite,
        expectedPath: physicalPath,
        reason: 'file_not_found',
      });
    }
  }

  return missing;
}

async function main() {
  const itemsJsonPath = resolve(process.cwd(), 'src/data/inventory/items.json');
  const validator = setupValidation({
    title: 'ITEM SPRITE COLLISIONS AUDITOR',
    family: 'assets',
    requiredFiles: [itemsJsonPath]
  });

  await validator.checkFiles();

  const raw = readFileSync(itemsJsonPath, 'utf-8');
  const parsed = JSON.parse(raw) as { SHOP_ITEMS?: ShopItem[] };
  const shopItems = parsed.SHOP_ITEMS || [];

  const missingSprites = findMissingSprites(shopItems);
  const collisions = findSpriteCollisions(shopItems);

  const errors: string[] = []; // no-domain: Non-domain utility collection or data structure
  const warnings: string[] = []; // no-domain: Non-domain utility collection or data structure

  for (const err of missingSprites) {
    if (err.reason === 'missing_property') {
      errors.push(`[MISSING_SPRITE] ${err.name} (${err.id}) - No tiene la propiedad 'sprite' definida.`);
    } else {
      errors.push(`[FILE_NOT_FOUND] ${err.name} (${err.id}) - Archivo no existe: '${err.expectedPath}'`);
    }
  }

  for (const group of collisions) {
    const itemNames = group.items.map(i => i.id).join(', ');
    warnings.push(`[SPRITE_COLLISION] Sprite '${group.sprite}' es reutilizado por ${group.count} ítems (${itemNames}).`);
  }

  await validator.finish(
    {
      'Ítems auditados': shopItems.length,
      'Colisiones de sprite': collisions.length
    },
    errors,
    warnings
  );
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('audit_item_sprite_collisions.ts')) {
  main().catch(err => {
    console.error(`💥 Error fatal: ${(err as Error).message}`);
    process.exit(1);
  });
}
