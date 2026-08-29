/**
 * src/data/inventory/items.ts
 * 
 * Wrapper to export item configurations loaded from JSON.
 */
import dbJson from './items.json' with { type: 'json' };
import type { EvolutionStoneKind, Item, ItemCategory, ItemKind, ItemTier } from '@/types/inventory/items';

const ITEM_DATA_CATEGORIES = [
  'pokeballs',
  'potions',
  'stones',
  'combat_held',
  'breeding_held',
  'raw_material',
  'refined_material',
  'component',
  'machinery',
  'tools',
  'tms',
  'otros',
] as const satisfies readonly ItemCategory[];

const ITEM_TIERS = ['common', 'rare', 'epic', 'legend'] as const satisfies readonly ItemTier[];
const ITEM_KINDS = ['held', 'usable', 'stone', 'booster'] as const satisfies readonly ItemKind[];
const EVOLUTION_STONE_KINDS = ['fire', 'water', 'thunder', 'leaf', 'moon', 'sun', 'oval'] as const satisfies readonly EvolutionStoneKind[];

const ITEM_DATA_CATEGORIES_SET: ReadonlySet<string> = new Set<string>(ITEM_DATA_CATEGORIES); // runtime-set
const ITEM_TIERS_SET: ReadonlySet<string> = new Set<string>(ITEM_TIERS); // runtime-set
const ITEM_KINDS_SET: ReadonlySet<string> = new Set<string>(ITEM_KINDS); // runtime-set
const EVOLUTION_STONE_KINDS_SET: ReadonlySet<string> = new Set<string>(EVOLUTION_STONE_KINDS); // runtime-set

function requireItemCategory(value: string): ItemCategory {
  if (ITEM_DATA_CATEGORIES_SET.has(value)) return value as ItemCategory;
  throw new Error(`[items] Invalid item category: ${value}`);
}

function requireItemTier(value: string): ItemTier {
  if (ITEM_TIERS_SET.has(value)) return value as ItemTier;
  throw new Error(`[items] Invalid item tier: ${value}`);
}

function requireItemKind(value: string): ItemKind {
  if (ITEM_KINDS_SET.has(value)) return value as ItemKind;
  throw new Error(`[items] Invalid item kind: ${value}`);
}

function requireEvolutionStoneKind(value: string): EvolutionStoneKind {
  if (EVOLUTION_STONE_KINDS_SET.has(value)) return value as EvolutionStoneKind;
  throw new Error(`[items] Invalid evolution stone kind: ${value}`);
}

export const CATEGORY_LABELS = dbJson.CATEGORY_LABELS;
export type ItemCategoryId = keyof typeof CATEGORY_LABELS;

export const MARKET_CAT_ORDER = dbJson.MARKET_CAT_ORDER;
export type MarketCategoryId = keyof typeof MARKET_CAT_ORDER;

import { ITEM_IDS, type ItemId } from './itemIds.ts';
export { ITEM_IDS, type ItemId };

const ITEM_IDS_SET: ReadonlySet<string> = new Set(ITEM_IDS); // runtime-set

export function isItemId(value: unknown): value is ItemId {
  return typeof value === 'string' && ITEM_IDS_SET.has(value);
}

const ITEMS_BY_NAME: Readonly<Record<string, ItemId>> = Object.freeze( // open-record
  Object.fromEntries(
    dbJson.SHOP_ITEMS.flatMap(item => {
      const entries: [string, ItemId][] = [];
      if (isItemId(item.id)) entries.push([item.id, item.id]);
      if (item.name && isItemId(item.id)) entries.push([item.name, item.id]);
      return entries;
    })
  )
);

export function requireItemId(value: string): ItemId {
  if (isItemId(value)) return value;
  const match = ITEMS_BY_NAME[value];
  if (match) return match;
  throw new Error(`[items] Invalid item id or name: ${value}`);
}

export const SHOP_ITEMS = dbJson.SHOP_ITEMS.map((item): Item => {
  const { type: rawKind, ...itemData } = item;
  return {
    ...itemData,
    id: requireItemId(item.id),
    cat: requireItemCategory(item.cat),
    tier: item.tier ? requireItemTier(item.tier) : undefined,
    kind: rawKind ? requireItemKind(rawKind) : undefined,
    stoneType: item.stoneType ? requireEvolutionStoneKind(item.stoneType) : undefined,
  };
});
export type ShopItemData = (typeof SHOP_ITEMS)[number];

export const ITEMS_BY_ID: Record<ItemId, Item> = Object.freeze(
  Object.fromEntries(SHOP_ITEMS.map(item => [item.id, item])) as Record<ItemId, Item>
);

export const BC_SHOP_ITEMS: readonly ShopItemData[] = Object.freeze(
  SHOP_ITEMS.filter(i => i.showInBCShop === true && (i.bcPrice || 0) > 0)
);

export const getItemById = (id: string): ShopItemData => {
  if (!id) throw new Error("ID de objeto no proporcionado");

  const cleanId = requireItemId(id);
  const item = ITEMS_BY_ID[cleanId];

  if (!item) {
    throw new Error(`[items] Objeto no encontrado por ID o nombre: "${id}"`);
  }
  return item;
};

export const getItemName = (id: string): string => {
  return getItemById(id).name;
};


export const BUFF_FIELDS = [
  'repelSecs',
  'luckyEggSecs',
  'amuletCoinSecs',
  'fishingRodSecs',
  'pickaxeSecs',
  'brushSecs',
  'shinyBoostSecs',
  'safariTicketSecs',
  'ceruleanTicketSecs',
  'articunoTicketSecs',
  'mewtwoTicketSecs',
  'ivScannerSecs',
  'incenseSecs',
] as const;
export type BuffField = (typeof BUFF_FIELDS)[number];

export const BUFF_FIELD_TO_ITEM_IDS: Record<BuffField, readonly ItemId[]> = {
  repelSecs: ['repel', 'superrepel', 'maxrepel'],
  luckyEggSecs: ['luckyegg'],
  amuletCoinSecs: ['amuletcoin'],
  fishingRodSecs: ['fishingrod', 'fishingrodgood', 'fishingrodsuper'],
  pickaxeSecs: ['pickaxe', 'pickaxesilver', 'pickaxegold'],
  brushSecs: ['brush', 'brushgood', 'brushsuper'],
  shinyBoostSecs: ['ticketshiny'],
  safariTicketSecs: ['ticketsafari'],
  ceruleanTicketSecs: ['ticketcerulean'],
  articunoTicketSecs: ['ticketarticuno'],
  mewtwoTicketSecs: ['ticketmewtwo'],
  ivScannerSecs: ['ivscanner'],
  incenseSecs: [
    'incensefire', 'incensewater', 'incensegrass',
    'incensenormal', 'incenseghost', 'incensepsychic'
  ]
};

export function getMaxBuffDuration(field: BuffField): number {
  const itemIds = BUFF_FIELD_TO_ITEM_IDS[field];
  let maxAllowedSecs = 3600;

  const matchingItems = itemIds.map(id => ITEMS_BY_ID[id]).filter((item): item is Item => !!item);
  if (matchingItems.length > 0) {
    const maxItemDuration = Math.max(...matchingItems.map(item => {
      if (!item.desc) return 1800;
      const hourMatch = item.desc.match(/(\d+)\s*hora/i);
      if (hourMatch) return parseInt(hourMatch[1] || '0', 10) * 3600;
      const minMatch = item.desc.match(/(\d+)\s*min/i);
      return minMatch ? parseInt(minMatch[1] || '0', 10) * 60 : 1800;
    }));
    if (maxItemDuration > 0) {
      maxAllowedSecs = maxItemDuration;
    }
  }
  return maxAllowedSecs;
}
