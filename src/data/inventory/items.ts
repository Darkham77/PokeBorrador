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

function requireItemCategory(value: string): ItemCategory {
  const category = ITEM_DATA_CATEGORIES.find(candidate => candidate === value);
  if (category) return category;
  throw new Error(`[items] Invalid item category: ${value}`);
}

function requireItemTier(value: string): ItemTier {
  const tier = ITEM_TIERS.find(candidate => candidate === value);
  if (tier) return tier;
  throw new Error(`[items] Invalid item tier: ${value}`);
}

function requireItemKind(value: string): ItemKind {
  const kind = ITEM_KINDS.find(candidate => candidate === value);
  if (kind) return kind;
  throw new Error(`[items] Invalid item kind: ${value}`);
}

function requireEvolutionStoneKind(value: string): EvolutionStoneKind {
  const kind = EVOLUTION_STONE_KINDS.find(candidate => candidate === value);
  if (kind) return kind;
  throw new Error(`[items] Invalid evolution stone kind: ${value}`);
}

export const CATEGORY_LABELS = dbJson.CATEGORY_LABELS;
export type ItemCategoryId = keyof typeof CATEGORY_LABELS;

export const MARKET_CAT_ORDER = dbJson.MARKET_CAT_ORDER;
export type MarketCategoryId = keyof typeof MARKET_CAT_ORDER;

export const SHOP_ITEMS = dbJson.SHOP_ITEMS.map((item): Item => {
  const { type: rawKind, ...itemData } = item;
  return {
    ...itemData,
    cat: requireItemCategory(item.cat),
    tier: item.tier ? requireItemTier(item.tier) : undefined,
    kind: rawKind ? requireItemKind(rawKind) : undefined,
    stoneType: item.stoneType ? requireEvolutionStoneKind(item.stoneType) : undefined,
  };
});
export type ShopItemData = (typeof SHOP_ITEMS)[number];
export type ItemId = (typeof dbJson.SHOP_ITEMS)[number]['id'];

export function isItemId(value: string): value is ItemId {
  return SHOP_ITEMS.some(item => item.id === value);
}

export function requireItemId(value: string): ItemId {
  if (isItemId(value)) return value;
  const match = SHOP_ITEMS.find(item => item.name === value);
  if (match) return match.id;
  throw new Error(`[items] Invalid item id or name: ${value}`);
}

export const getItemById = (id: string): ShopItemData => {
  if (!id) throw new Error("ID de objeto no proporcionado");

  const item = SHOP_ITEMS.find(i => i.id === id);

  if (!item) {
    throw new Error(`Objeto no encontrado por ID: ${id}`);
  }
  return item;
};

export const getItemName = (id: string): string => {
  try {
    const item = getItemById(id);
    return item.name;
  } catch {
    return id;
  }
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

  const matchingItems = SHOP_ITEMS.filter(item => item.id && itemIds.includes(item.id));
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
