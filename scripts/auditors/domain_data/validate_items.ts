/**
 * scripts/auditors/domain_data/validate_items.ts
 * 
 * ITEM VALIDATOR SCRIPT (Node.js 26+)
 * Validates integrity of SHOP_ITEMS and HEALING_ITEMS across:
 *   - src/data/inventory/items.json  -> SHOP_ITEMS[]
 *   - src/logic/items/itemEffects.ts -> HEALING_ITEMS{}
 */

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { BaseAuditor } from '../../lib/auditorBase.ts';

enableCompileCache();

const SHOP_FILE   = path.resolve(process.cwd(), 'src/data/inventory/items.json');
const BATTLE_FILE = path.resolve(process.cwd(), 'src/logic/items/itemEffects.ts');

export interface ShopItem {
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

export type ItemRuleId =
  | 'item-missing-field'
  | 'item-sprite-not-found'
  | 'item-unknown-category'
  | 'item-missing-healing-effect'
  | 'item-invalid-healing-effect'
  | 'item-missing-held-type'
  | 'item-english-desc-leak'
  | 'item-english-name-leak'
  | 'item-phantom-healing'
  | 'item-sprite-collision';

export const ITEM_RULES: readonly ItemRuleId[] = [
  'item-missing-field',
  'item-sprite-not-found',
  'item-unknown-category',
  'item-missing-healing-effect',
  'item-invalid-healing-effect',
  'item-missing-held-type',
  'item-english-desc-leak',
  'item-english-name-leak',
  'item-phantom-healing',
  'item-sprite-collision'
] as const;

export class ItemAuditor extends BaseAuditor<ItemRuleId> {
  constructor() {
    super({
      id: 'validate_items',
      name: 'Item Integrity Validator',
      description: 'Ítems faltantes, sin categoría o con efectos inválidos',
      family: 'domain_data',
      ruleIds: ITEM_RULES,
      ruleDescriptions: {
        'item-missing-field': 'Campo faltante en ítem del catálogo',
        'item-sprite-not-found': 'Sprite de ítem no encontrado en assets',
        'item-unknown-category': 'Categoría desconocida en catálogo de ítems',
        'item-missing-healing-effect': 'Efecto curativo faltante en ítem medicinal',
        'item-invalid-healing-effect': 'Efecto curativo inválido en ítem medicinal',
        'item-missing-held-type': 'Tipo de ítem equipado faltante',
        'item-english-desc-leak': 'Descripción en inglés filtrada en ítem',
        'item-english-name-leak': 'Nombre en inglés filtrado en ítem',
        'item-phantom-healing': 'Efecto curativo fantasma sin item curativo',
        'item-sprite-collision': 'Colisión de sprites en catálogo de ítems'
      },
      requiredFiles: [SHOP_FILE, BATTLE_FILE]
    });
  }

  public override async runAudit(): Promise<void> {
    this.context.logStep(1, 2, 'Loading and parsing SHOP_ITEMS and HEALING_ITEMS...');
    const battleContent = await fs.readFile(BATTLE_FILE, 'utf8');
    const jsonRaw = await fs.readFile(SHOP_FILE, 'utf8');
    const jsonData = JSON.parse(jsonRaw) as { SHOP_ITEMS?: unknown[] };
    const rawShopItems = (jsonData.SHOP_ITEMS ?? []) as Record<string, unknown>[];
    const shopItems: ShopItem[] = rawShopItems
      .filter(item => typeof item === 'object' && item !== null && typeof item['id'] === 'string')
      .map((item, idx) => ({ ...item, id: item['id'] as string, _line: idx + 1 }));

    this.filesScannedCount = shopItems.length;

    const healingItems = new Set<string>();
    const healingRegex = /^\s+'([^']+)':\s*\(?[\s\S]*?\)?\s*=>/gm;
    let m;
    while ((m = healingRegex.exec(battleContent)) !== null) {
      healingItems.add(m[1]!);
    }

    this.context.logStep(2, 2, `Validating ${shopItems.length} items for fields, categories, sprites, and parity...`);

    const MUST_BE_USABLE     = ['pociones', 'potions', 'utility', 'booster', 'stones', 'stone'];
    const MUST_NOT_BE_USABLE = ['held', 'combat_held', 'pokeballs', 'breeding', 'breeding_held', 'raw_material', 'refined_material', 'component', 'machinery', 'tms'];
    const REQUIRED_FIELDS    = ['id', 'name', 'cat', 'sprite', 'icon', 'desc', 'price'];
    const VALID_CATS         = [
      'pociones', 'potions', 'utility', 'tools', 'booster', 'especial', 'held', 'combat_held', 'pokeballs', 'stones', 'stone', 'breeding', 'breeding_held',
      'healing', 'tm', 'special', 'raw_material', 'refined_material', 'component', 'machinery', 'tms', 'otros'
    ];

    shopItems.forEach(item => {
      const tag = `[${item.name || item.id} (line ~${item._line})]`;

      REQUIRED_FIELDS.forEach(f => {
        const val = item[f];
        if (val == null || val === '') {
          this.addViolation({
            ruleId: 'item-missing-field',
            severity: 'error',
            file: 'src/data/inventory/items.json',
            line: item._line,
            message: `${tag} Missing required field: '${f}'`,
            context: `${item.id}.${f}`
          });
        }
      });

      if (item.sprite) {
        const physicalPath = path.resolve(process.cwd(), 'public/assets/sprites', `${item.sprite}.webp`);
        if (!existsSync(physicalPath)) {
          this.addViolation({
            ruleId: 'item-sprite-not-found',
            severity: 'error',
            file: 'src/data/inventory/items.json',
            line: item._line,
            message: `${tag} Sprite file does not exist: '${physicalPath}'`,
            context: item.sprite
          });
        }
      }

      if (item.cat && !VALID_CATS.includes(item.cat)) {
        this.addViolation({
          ruleId: 'item-unknown-category',
          severity: 'error',
          file: 'src/data/inventory/items.json',
          line: item._line,
          message: `${tag} Unknown category: '${item.cat}'`,
          context: item.cat
        });
      }

      if (item.cat && MUST_BE_USABLE.includes(item.cat) && item.id && !healingItems.has(item.id)) {
        if (!item.name?.startsWith('MT')) {
          this.addViolation({
            ruleId: 'item-missing-healing-effect',
            severity: 'error',
            file: 'src/data/inventory/items.json',
            line: item._line,
            message: `${tag} cat='${item.cat}' but '${item.id}' has no entry in HEALING_ITEMS.`,
            context: item.id
          });
        }
      }

      if (item.cat && MUST_NOT_BE_USABLE.includes(item.cat) && item.id && healingItems.has(item.id)) {
        const ALLOWED_USABLE_HELD = ['vigorrestorer', 'pomegberry', 'kelpsyberry', 'qualotberry', 'hondewberry', 'grepaberry', 'tamatoberry'];
        if (!ALLOWED_USABLE_HELD.includes(item.id)) {
          this.addViolation({
            ruleId: 'item-invalid-healing-effect',
            severity: 'error',
            file: 'src/data/inventory/items.json',
            line: item._line,
            message: `${tag} cat='${item.cat}' should NOT be in HEALING_ITEMS.`,
            context: item.id
          });
        }
      }

      if ((item.cat === 'held' || item.cat === 'combat_held') && item.type !== 'held') {
        this.addViolation({
          ruleId: 'item-missing-held-type',
          severity: 'error',
          file: 'src/data/inventory/items.json',
          line: item._line,
          message: `${tag} cat='${item.cat}' but missing 'type: held'.`,
          context: item.id
        });
      }

      if (item.desc) {
        const FORBIDDEN_DESC_PATTERNS = [
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
            this.addViolation({
              ruleId: 'item-english-desc-leak',
              severity: 'error',
              file: 'src/data/inventory/items.json',
              line: item._line,
              message: `${tag} LEAK DETECTADO en 'desc' (patrón en inglés: ${pattern}): "${item.desc}"`,
              context: item.desc
            });
            break;
          }
        }
      }

      if (item.name) {
        const FORBIDDEN_NAME_PATTERNS = [
          /\b(Berry|Sweet|Plate|Orb|Specs|Vest|Herb|Policy|Drive|Memory|Mirror|Feather|Cap|Incense|Belt|Glasses)\b/i
        ];
        for (const pattern of FORBIDDEN_NAME_PATTERNS) {
          if (pattern.test(item.name)) {
            this.addViolation({
              ruleId: 'item-english-name-leak',
              severity: 'error',
              file: 'src/data/inventory/items.json',
              line: item._line,
              message: `${tag} LEAK DETECTADO en 'name' (nombre en inglés: ${pattern}): "${item.name}"`,
              context: item.name
            });
            break;
          }
        }
      }
    });

    const shopItemIds = new Set(shopItems.map(i => i.id));

    healingItems.forEach(id => {
      if (id.startsWith('MT')) return;
      if (!shopItemIds.has(id)) {
        this.addViolation({
          ruleId: 'item-phantom-healing',
          severity: 'warning',
          file: 'src/logic/items/itemEffects.ts',
          line: 1,
          message: `[PHANTOM] '${id}' is in HEALING_ITEMS but has NO entry in SHOP_ITEMS.`,
          context: id
        });
      }
    });

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
        this.addViolation({
          ruleId: 'item-sprite-collision',
          severity: 'warning',
          file: 'src/data/inventory/items.json',
          line: 1,
          message: `Sprite '${sprite}' is reused by ${ids.length} items (${ids.join(', ')}).`,
          context: sprite
        });
      }
    }

    this.context.setMetric('SHOP_ITEMS scanned', shopItems.length);
    this.context.setMetric('HEALING_ITEMS scanned', healingItems.size);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new ItemAuditor());
}
