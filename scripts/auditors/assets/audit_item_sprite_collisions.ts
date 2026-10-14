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
import { BaseAuditor , createRuleCapabilities} from '@francogp/auditor';

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

export function checkRawAssetExistence(itemSlug: string): { exists: boolean; path?: string } {
  const possiblePaths = [
    resolve(process.cwd(), '_raw-assets/public/assets/sprites/items', `${itemSlug}.png`),
    resolve(process.cwd(), '_raw-assets/public/assets/sprites/items', `${itemSlug}.webp`),
    resolve(process.cwd(), '_raw-assets/public/assets/sprites/crafting', `${itemSlug}.png`),
    resolve(process.cwd(), '_raw-assets/public/assets/sprites/crafting/tier0', `${itemSlug}.png`),
    resolve(process.cwd(), '_raw-assets/public/assets/sprites/crafting/tier1', `${itemSlug}.png`),
    resolve(process.cwd(), '_raw-assets/public/assets/sprites/crafting/tier2', `${itemSlug}.png`),
    resolve(process.cwd(), '_raw-assets/public/assets/sprites/crafting/tier3', `${itemSlug}.png`),
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
      ruleCapabilities: createRuleCapabilities(ITEM_SPRITE_COLLISION_RULES, {
        speed: 'light',
        phase: 'normal',
        fix: 'none',
        md: false,
        ast: false,
        changedOnly: false,
        critical: false
      }),
      id: 'audit_item_sprite_collisions',
      configKey: 'assets.itemSpriteCollisions',
      defaultConfig: {
        enabled: true
      },
      criticalConfig: {},
      name: 'Item Sprite Collisions Auditor',
      description: 'Colisiones de sprites o archivos faltantes en ítems',
      icon: '🎒',
      family: 'assets',
      packageName: 'Sprites',
      ruleIds: ITEM_SPRITE_COLLISION_RULES,
      usesThirdPartyTool: false,
      ruleDescriptions: {
        'item-missing-sprite': 'Sprite de ítem no encontrado',
        'item-sprite-collision': 'Colisión en sprite de ítem'
      },
      ruleRemediations: {
        'item-missing-sprite': 'Add missing sprite file to public/assets/sprites or correct sprite path in items.json',
        'item-sprite-collision': 'Assign unique sprite assets to items sharing duplicate sprite paths'
      },
      requiredFiles: [itemsPath],
      coverage: {
        include: ['src/data/inventory/items.json']
      }
    });
    this.itemsJsonPath = itemsPath;
  }

  public override async runAudit(): Promise<void> {
    this.recordScanned('src/data/inventory/items.json');

    let shopItems: ShopItem[] = [];
    let missingSpritesCount = 0;
    this.runSubAuditorSync('item-missing-sprite', () => {
      const raw = readFileSync(this.itemsJsonPath, 'utf-8');
      const parsed = JSON.parse(raw) as { SHOP_ITEMS?: ShopItem[] };
      shopItems = parsed.SHOP_ITEMS || [];

      const missingSprites = findMissingSprites(shopItems);
      missingSpritesCount = missingSprites.length;
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
    });

    let collisionsCount = 0;
    this.runSubAuditorSync('item-sprite-collision', () => {
      const collisions = findSpriteCollisions(shopItems);
      collisionsCount = collisions.length;
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
    });

    this.context.setMetric('Items audited', shopItems.length);
    this.context.setMetric('Sprite collisions', collisionsCount);
    this.context.setMetric('Missing sprites', missingSpritesCount);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new ItemSpriteCollisionAuditor());
}
