import { readFileSync, writeFileSync } from 'node:fs';
/**
 * scripts/tools/tag_canon_items.ts
 *
 * Adds or updates the `isCanon` boolean flag in `src/data/inventory/items.json`
 * to clearly distinguish between official Pokémon items (`isCanon: true`) and
 * project-specific custom items (crafting materials, machinery, tickets, etc. - `isCanon: false`).
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=. --allow-fs-write=. scripts/tools/tag_canon_items.ts
 */
import { resolve } from 'node:path';
import { styleText } from 'node:util';

import { isMainModule } from '@francogp/auditor';
import { Dex, toID } from '@pkmn/sim';
import { defineCommand, runMain } from 'citty';

const CANON_CATEGORY_LIST = ['pokeballs', 'stones', 'potions', 'combat_held'] as const;
type CanonCategory = (typeof CANON_CATEGORY_LIST)[number];
const CANON_CATEGORIES: ReadonlySet<CanonCategory> = new Set<CanonCategory>(CANON_CATEGORY_LIST);

const CUSTOM_CATEGORY_LIST = [
  'raw_material',
  'refined_material',
  'component',
  'machinery',
  'tools'
] as const;
type CustomCategory = (typeof CUSTOM_CATEGORY_LIST)[number];
const CUSTOM_CATEGORIES: ReadonlySet<CustomCategory> = new Set<CustomCategory>(
  CUSTOM_CATEGORY_LIST
);

const CUSTOM_ITEM_ID_LIST = [
  'ticketsafari',
  'ticketshiny',
  'ticketcerulean',
  'ticketarticuno',
  'ticketmewtwo',
  'naturepatch',
  'abilitypill',
  'vigorcandy',
  'vigorrestorer',
  'ivscanner',
  'radar',
  'pechaberrywild',
  'berrysilver',
  'berrygold',
  'berrybronze',
  'ironingot'
] as const;
type CustomItemId = (typeof CUSTOM_ITEM_ID_LIST)[number];
const CUSTOM_ITEM_IDS: ReadonlySet<CustomItemId> = new Set<CustomItemId>(CUSTOM_ITEM_ID_LIST);

const CANON_SPECIAL_ID_LIST = [
  'hpup',
  'protein',
  'iron',
  'calcium',
  'zinc',
  'carbos',
  'healthfeather',
  'musclefeather',
  'resistfeather',
  'geniusfeather',
  'cleverfeather',
  'swiftfeather',
  'prettyfeather',
  'macho_brace',
  'machobrace',
  'powerweight',
  'powerbracer',
  'powerbelt',
  'powerlens',
  'powerband',
  'poweranklet',
  'ovalstone',
  'shinystone',
  'duskstone',
  'dawnstone',
  'icestone',
  'firestone',
  'waterstone',
  'thunderstone',
  'leafstone',
  'moonstone',
  'sunstone',
  'linkcable',
  'rarecandy',
  'ppup',
  'ppmax',
  'potion',
  'superpotion',
  'hyperpotion',
  'maxpotion',
  'fullrestore',
  'revive',
  'revivemax',
  'freshwater',
  'sodapop',
  'lemonade',
  'moomoofilk',
  'energypowder',
  'energyroot',
  'healpowder',
  'revivalherb',
  'antidote',
  'burnheal',
  'iceheal',
  'awakening',
  'paralyzeheal',
  'fullheal',
  'elixir',
  'elixirmax',
  'repel',
  'superrepel',
  'maxrepel',
  'pokeball',
  'greatball',
  'ultraball',
  'masterball',
  'safari_ball',
  'safariball',
  'levelball',
  'lureball',
  'moonball',
  'friendball',
  'loveball',
  'heavyball',
  'fastball',
  'sportball',
  'premierball',
  'repeatball',
  'timerball',
  'nestball',
  'netball',
  'diveball',
  'luxuryball',
  'healball',
  'quickball',
  'duskball',
  'cherishball',
  'parkball',
  'dreamball',
  'beastball',
  'strangeball',
  'expshare',
  'cleanseetag',
  'cleansetag',
  'smokeeball',
  'smokeball',
  'destinyknot',
  'everstone',
  'abilitycapsule',
  'abilitypatch'
] as const;
type CanonSpecialId = (typeof CANON_SPECIAL_ID_LIST)[number];
const CANON_SPECIAL_IDS: ReadonlySet<CanonSpecialId> = new Set<CanonSpecialId>(
  CANON_SPECIAL_ID_LIST
);

function isCustomCategory(value: string): value is CustomCategory {
  return (CUSTOM_CATEGORIES as ReadonlySet<string>).has(value);
}

function isCustomItemId(value: string): value is CustomItemId {
  return (CUSTOM_ITEM_IDS as ReadonlySet<string>).has(value);
}

function isCanonSpecialId(value: string): value is CanonSpecialId {
  return (CANON_SPECIAL_IDS as ReadonlySet<string>).has(value);
}

function isCanonCategory(value: string): value is CanonCategory {
  return (CANON_CATEGORIES as ReadonlySet<string>).has(value);
}

interface ItemEntry {
  id: string;
  cat?: string;
  isCanon?: boolean;
  [key: string]: unknown;
}

export function tagAllItems(): { canonCount: number; customCount: number; total: number } {
  const itemsJsonPath = resolve(process.cwd(), 'src/data/inventory/items.json');
  const raw = readFileSync(itemsJsonPath, 'utf-8');
  const db = JSON.parse(raw) as { SHOP_ITEMS: ItemEntry[]; [key: string]: unknown };

  let canonCount = 0;
  let customCount = 0;

  for (const item of db.SHOP_ITEMS) {
    const id = item.id;
    const cat = item.cat || '';

    // Check if definitely custom
    if (isCustomCategory(cat) || isCustomItemId(id)) {
      item.isCanon = false;
      customCount++;
      continue;
    }

    // Check if canon TM
    if (id.startsWith('tm') || cat === 'tms') {
      item.isCanon = true;
      canonCount++;
      continue;
    }

    // Check if special canon or in Showdown Dex
    const dexItem = Dex.items.get(toID(id));
    if (dexItem.exists || isCanonSpecialId(id) || (cat && isCanonCategory(cat))) {
      item.isCanon = true;
      canonCount++;
    } else {
      item.isCanon = false;
      customCount++;
    }
  }

  writeFileSync(itemsJsonPath, JSON.stringify(db, null, 2), 'utf-8');

  console.log(styleText('cyan', '\n═══════════════════════════════════════════════════════'));
  console.log(styleText('cyan', '   ITEMS CANON / CUSTOM TAGGER'));
  console.log(styleText('cyan', '═══════════════════════════════════════════════════════\n'));
  console.log(`📦 Total Items:     ${styleText('bold', String(db.SHOP_ITEMS.length))}`);
  console.log(`✨ Canon Pokémon:   ${styleText('green', String(canonCount))}`);
  console.log(`🛠️  Custom Project:  ${styleText('yellow', String(customCount))}\n`);

  return { canonCount, customCount, total: db.SHOP_ITEMS.length };
}

export const command = defineCommand({
  meta: {
    name: 'tag-canon-items',
    description: 'Agrega o actualiza isCanon en src/data/inventory/items.json'
  },
  run() {
    tagAllItems();
  }
});
if (isMainModule(import.meta.url)) {
  void runMain(command);
}
