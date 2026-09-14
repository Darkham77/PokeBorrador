/**
 * scripts/auditors/assets/audit_item_sprite_collisions.ts
 *
 * Scans src/data/inventory/items.json, public/assets/sprites, and _raw-assets for:
 *  - Missing/non-existent physical sprite files on disk (reported as ERRORS)
 *  - Duplicate/colliding sprite paths shared by multiple items (reported as WARNINGS)
 *  - Raw assets availability in `_raw-assets/` ready for assignment/conversion (INFO)
 */

import { readFileSync, existsSync } from 'node:fs';
import path, { resolve } from 'node:path';
import { enableCompileCache } from 'node:module';
import { BaseAuditor } from '../../lib/auditorBase.ts';

enableCompileCache();

export interface ShopItem {
  id: string;
  name?: string;
  cat?: string;
  sprite?: string;
  isCanon?: boolean;
  [key: string]: unknown;
}

export interface SpriteCollisionGroup {
  sprite: string;
  count: number;
  items: Array<{ id: string; name: string; cat: string; hasRawAsset: boolean; rawAssetPath?: string }>;
}

export type MissingSpriteReason = 'missing_property' | 'file_not_found';

export interface MissingSpriteError {
  id: string;
  name: string;
  sprite?: string;
  expectedPath: string;
  reason: MissingSpriteReason;
}

export function checkRawAssetExistence(itemId: string): { exists: boolean; path?: string } {
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

export type ItemSpriteCollisionRuleId =
  | 'item-missing-sprite'
  | 'item-sprite-collision';

export const ITEM_SPRITE_COLLISION_RULES: readonly ItemSpriteCollisionRuleId[] = [
  'item-missing-sprite',
  'item-sprite-collision'
] as const;

export class ItemSpriteCollisionAuditor extends BaseAuditor<ItemSpriteCollisionRuleId> {
  private readonly itemsJsonPath: string;

  constructor() {
    const itemsPath = resolve(process.cwd(), 'src/data/inventory/items.json');
    super({
      id: 'audit_item_sprite_collisions',
      name: 'Item Sprite Collisions Auditor',
      description: 'Colisiones de sprites o archivos faltantes en ítems',
      family: 'assets',
      ruleIds: ITEM_SPRITE_COLLISION_RULES,
      ruleDescriptions: {
        'item-missing-sprite': 'Sprite de ítem no encontrado en assets',
        'item-sprite-collision': 'Colisión o solapamiento en sprite de ítem'
      },
      requiredFiles: [itemsPath]
    });
    this.itemsJsonPath = itemsPath;
  }

  public override async runAudit(): Promise<void> {
    this.context.logStep(1, 2, 'Reading inventory item catalog...');
    const raw = readFileSync(this.itemsJsonPath, 'utf-8');
    const parsed = JSON.parse(raw) as { SHOP_ITEMS?: ShopItem[] };
    const shopItems = parsed.SHOP_ITEMS || [];
    this.filesScannedCount = shopItems.length;

    this.context.logStep(2, 2, `Auditing ${shopItems.length} items for missing sprites and collisions...`);
    const missingSprites = findMissingSprites(shopItems);
    const collisions = findSpriteCollisions(shopItems);

    for (const err of missingSprites) {
      if (err.reason === 'missing_property') {
        this.addViolation({
          ruleId: 'item-missing-sprite',
          severity: 'error',
          file: 'src/data/inventory/items.json',
          line: 1,
          message: `${err.name} (${err.id}) - Missing 'sprite' property.`,
          context: err.id
        });
      } else {
        this.addViolation({
          ruleId: 'item-missing-sprite',
          severity: 'error',
          file: 'src/data/inventory/items.json',
          line: 1,
          message: `${err.name} (${err.id}) - Physical sprite file not found: '${err.expectedPath}'`,
          context: err.sprite || 'unknown'
        });
      }
    }

    for (const group of collisions) {
      const itemNames = group.items.map(i => i.id).join(', ');
      this.addViolation({
        ruleId: 'item-sprite-collision',
        severity: 'warning',
        file: 'src/data/inventory/items.json',
        line: 1,
        message: `Sprite '${group.sprite}' reused by ${group.count} items (${itemNames}).`,
        context: group.sprite
      });
    }

    this.context.setMetric('Items audited', shopItems.length);
    this.context.setMetric('Sprite collisions', collisions.length);
    this.context.setMetric('Missing sprites', missingSprites.length);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new ItemSpriteCollisionAuditor());
}
