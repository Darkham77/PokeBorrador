// fallow-ignore-file security-sink
/**
 * scripts/validate_items.ts
 * 
 * ITEM VALIDATOR SCRIPT (Node.js 26+)
 * Validates integrity of SHOP_ITEMS and HEALING_ITEMS across:
 *   - src/data/items.js            -> SHOP_ITEMS[]
 *   - src/logic/items/itemEffects.js -> HEALING_ITEMS{}
 *
 * Usage: npm run validate:items
 */

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import { setupValidation } from '../lib/validationBase.ts';

enableCompileCache();

// Runtime permission check
if (process.permission && !process.permission.has('fs.read', process.cwd())) {
  console.error(styleText('red', '\n❌ Error: Este script requiere permisos de lectura. Ejecútalo con --permission --allow-fs-read=.\n'));
  process.exit(1);
}

const SHOP_FILE   = path.resolve(process.cwd(), 'src/data/inventory/items.ts');
const BATTLE_FILE = path.resolve(process.cwd(), 'src/logic/items/itemEffects.ts');

interface ShopItem {
  id: string;
  _line: number;
  name?: string | null;
  cat?: string | null;
  sprite?: string | null;
  icon?: string | null;
  desc?: string | null;
  type?: string | null;
  price?: number | null;
  market?: boolean | null;
  [key: string]: unknown;
}

async function main() {
  const validator = setupValidation({
    title: 'ITEM INTEGRITY VALIDATOR',
    requiredFiles: [SHOP_FILE, BATTLE_FILE]
  });

  await validator.checkFiles();

  const battleContent = await fs.readFile(BATTLE_FILE, 'utf8');


  // ─── 1. Load SHOP_ITEMS directly from the JSON source ────────────────────────
  // items.ts re-exports from items.json — parsing the .ts as text yields 0 entries.
  const JSON_FILE = path.resolve(process.cwd(), 'src/data/inventory/items.json');
  if (!existsSync(JSON_FILE)) {
    console.error(styleText('red', `\n❌ Error: items.json not found at ${JSON_FILE}\n`));
    process.exit(1);
  }
  const jsonRaw = await fs.readFile(JSON_FILE, 'utf8');
  const jsonData = JSON.parse(jsonRaw) as { SHOP_ITEMS?: unknown[] };
  const rawShopItems = (jsonData.SHOP_ITEMS ?? []) as Record<string, unknown>[]; // open-record
  const shopItems: ShopItem[] = rawShopItems
    .filter(item => typeof item === 'object' && item !== null && typeof item['id'] === 'string')
    .map((item, idx) => ({ ...item, id: item['id'] as string, _line: idx + 1 }));

  // ─── 2. Extract HEALING_ITEMS keys ───────────────────────────────────────────
  const healingItems = new Set<string>();
  const healingRegex = /^\s+'([^']+)':\s*\(?[\s\S]*?\)?\s*=>/gm;
  let m;
  while ((m = healingRegex.exec(battleContent)) !== null) {
    healingItems.add(m[1]!);
  }

  // ─── Run validations ──────────────────────────────────────────────────────────
  const errors: string[]   = []; // no-domain
  const warnings: string[] = []; // no-domain

  const MUST_BE_USABLE     = ['pociones', 'potions', 'utility', 'booster', 'stones', 'stone']; // no-domain
  const MUST_NOT_BE_USABLE = ['held', 'combat_held', 'pokeballs', 'breeding', 'breeding_held', 'raw_material', 'refined_material', 'component', 'machinery', 'tms']; // no-domain
  const REQUIRED_FIELDS    = ['id', 'name', 'cat', 'sprite', 'icon', 'desc', 'price']; // no-domain
  const VALID_CATS         = [ // no-domain
    'pociones', 'potions', 'utility', 'tools', 'booster', 'especial', 'held', 'combat_held', 'pokeballs', 'stones', 'stone', 'breeding', 'breeding_held',
    'healing', 'tm', 'special', 'raw_material', 'refined_material', 'component', 'machinery', 'tms', 'otros'
  ];

  shopItems.forEach(item => {
    const tag = `[${item.name || item.id} (line ~${item._line})]`;

    REQUIRED_FIELDS.forEach(f => {
      const val = item[f];
      if (val == null || val === '') {
        errors.push(`${tag} Missing required field: '${f}'`);
      }
    });
    
    if (item.sprite) {
      const physicalPath = path.resolve(process.cwd(), 'public/assets/sprites', `${item.sprite}.webp`);
      if (!existsSync(physicalPath)) {
        errors.push(`${tag} Sprite file does not exist: '${physicalPath}'`);
      }
    }

    if (item.cat && !VALID_CATS.includes(item.cat)) {
      errors.push(`${tag} Unknown category: '${item.cat}'`);
    }

    if (item.cat && MUST_BE_USABLE.includes(item.cat) && item.id && !healingItems.has(item.id)) {
      if (!item.name?.startsWith('MT')) {
        errors.push(`${tag} cat='${item.cat}' but '${item.id}' has no entry in HEALING_ITEMS.`);
      }
    }

    if (item.cat && MUST_NOT_BE_USABLE.includes(item.cat) && item.id && healingItems.has(item.id)) {
      // 'Restaurador de Vigor' (vigorrestorer) is a breeding item that is explicitly usable to restore vigor
      // EV-reducing berries are held items that are explicitly usable from bag to reduce EVs and raise friendship
      const ALLOWED_USABLE_HELD = ['vigorrestorer', 'pomegberry', 'kelpsyberry', 'qualotberry', 'hondewberry', 'grepaberry', 'tamatoberry']; // no-domain
      if (!ALLOWED_USABLE_HELD.includes(item.id)) {
        errors.push(`${tag} cat='${item.cat}' should NOT be in HEALING_ITEMS.`);
      }
    }

    if ((item.cat === 'held' || item.cat === 'combat_held') && item.type !== 'held') {
      errors.push(`${tag} cat='${item.cat}' but missing 'type: held'.`);
    }

    // ─── 2.1 Spanish Localization Audit ─────────────────────────────────────────
    if (item.desc) {
      const FORBIDDEN_DESC_PATTERNS = [ // no-domain
        /\bholder('s)?\b/i,
        /\braises?\b/i,
        /\blowers?\b/i,
        /\bboosts?\b/i,
        /\bincreases?\b/i,
        /\bsingle use\b/i,
        /\battacks?\b/i,
        /\bcannot\b/i,
        /\bheals?\b/i,
        /\bprevents?\b/i,
        /\bused for\b/i,
        /\bevolves?\b/i,
        /\bif held by\b/i,
        /\bgains?\b/i,
        /\baccuracy\b/i,
        /\bhalves\b/i,
        /\bphysical attacks?\b/i,
        /\bspecial attacks?\b/i,
        /\bmoves last\b/i,
        /\bjudgment is\b/i,
        /\bwhen held\b/i,
        /\bis (calculated|raised|lowered)\b/i,
        /\bno competitive use\b/i,
        /\bchanges its forme\b/i,
      ];
      for (const pattern of FORBIDDEN_DESC_PATTERNS) {
        if (pattern.test(item.desc)) {
          errors.push(`${tag} LEAK DETECTADO en 'desc' (patrón en inglés: ${pattern}): "${item.desc}"`);
          break;
        }
      }
    }

    if (item.name) {
      const FORBIDDEN_NAME_PATTERNS = [ // no-domain
        /\b(Berry|Sweet|Plate|Orb|Specs|Vest|Herb|Policy|Drive|Memory|Mirror|Feather|Cap|Incense|Belt|Glasses)\b/i
      ];
      for (const pattern of FORBIDDEN_NAME_PATTERNS) {
        if (pattern.test(item.name)) {
          errors.push(`${tag} LEAK DETECTADO en 'name' (nombre en inglés: ${pattern}): "${item.name}"`);
          break;
        }
      }
    }

    // TMs are handled dynamically in getDynamicItemEffect, so they don't need to be in the main object
    if (item.name?.startsWith('MT')) return;
  });
  
  const shopItemIds = new Set(shopItems.map(i => i.id));

  healingItems.forEach(id => {
    if (id.startsWith('MT')) return;
    if (!shopItemIds.has(id)) {
      warnings.push(`[PHANTOM] '${id}' is in HEALING_ITEMS but has NO entry in SHOP_ITEMS.`);
    }
  });

  // ─── 3. Detect Sprite Collisions (Shared duplicate sprites) ──────────────────
  const spriteToItems = new Map<string, string[]>();
  shopItems.forEach(item => {
    const sprite = item.sprite?.trim();
    if (!sprite) return;
    if (!spriteToItems.has(sprite)) {
      spriteToItems.set(sprite, []);
    }
    spriteToItems.get(sprite)!.push(item.id);
  });

  for (const [sprite, ids] of spriteToItems.entries()) {
    if (ids.length > 1) {
      warnings.push(`[SPRITE_COLLISION] Sprite '${sprite}' is reused by ${ids.length} items (${ids.join(', ')}).`);
    }
  }

  await validator.finish(
    {
      'SHOP_ITEMS scanned': shopItems.length,
      'HEALING_ITEMS scanned': healingItems.size
    },
    errors,
    warnings
  );
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Fatal error: ${(err as Error).message}`));
  process.exit(1);
});
