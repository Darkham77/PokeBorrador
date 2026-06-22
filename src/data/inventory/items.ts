/**
 * src/data/inventory/items.ts
 * 
 * Wrapper to export item configurations loaded from JSON.
 */
import dbJson from './items.json' with { type: 'json' };
import type { Item } from '@/types/inventory/items';

export const ITEM_CATEGORIES = dbJson.ITEM_CATEGORIES as string[];
export const CATEGORY_LABELS = dbJson.CATEGORY_LABELS as Record<string, string>;
export const MARKET_CAT_ORDER = dbJson.MARKET_CAT_ORDER as Record<string, number>;
export const MARKET_UNLOCKS = dbJson.MARKET_UNLOCKS as Record<string, string[]>;
export const SHOP_ITEMS = dbJson.SHOP_ITEMS as Item[];

export const getItemById = (id: string): Item => {
  if (!id) throw new Error("ID de objeto no proporcionado");
  const normalizedId = String(id).toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');

  const item = SHOP_ITEMS.find(i => 
    i.id === id || 
    i.id === normalizedId || 
    i.id.toLowerCase() === normalizedId || 
    i.name.toLowerCase() === id.toLowerCase() ||
    i.name.toLowerCase() === normalizedId.replace(/_/g, ' ')
  );

  // Mapa de aliases comunes para compatibilidad con tests legacy
  if (!item) {
    const aliasMap: Record<string, string> = {
      'pokeball': 'pokeball',
      'poke_ball': 'pokeball',
      'pokeball_de_prueba': 'pokeball',
      'pocion': 'potion',
      'pociones': 'potion',
      'iman': 'magnet',
      'pp_up': 'pp_up',
      'subida_pp': 'pp_up',
      'subida_de_pp': 'pp_up',
      'mt06': 'tm06',
      'mt_toxico': 'tm06',
      'mt06_toxico': 'tm06',
    };
    const aliasId = aliasMap[normalizedId] || aliasMap[id.toLowerCase()];
    if (aliasId) {
      const aliasItem = SHOP_ITEMS.find(i => i.id === aliasId);
      if (aliasItem) return aliasItem;
    }
  }

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

export const BUFF_FIELD_TO_ITEM_IDS: Record<string, string[]> = {
  repelSecs: ['repel', 'super_repel', 'max_repel'],
  luckyEggSecs: ['lucky_egg'],
  amuletCoinSecs: ['amulet_coin'],
  fishingRodSecs: ['fishing_rod', 'fishing_rod_good', 'fishing_rod_super'],
  pickaxeSecs: ['pickaxe', 'pickaxe_silver', 'pickaxe_gold'],
  brushSecs: ['brush', 'brush_good', 'brush_super'],
  shinyBoostSecs: ['ticket_shiny'],
  safariTicketSecs: ['ticket_safari'],
  ceruleanTicketSecs: ['ticket_cerulean'],
  articunoTicketSecs: ['ticket_articuno'],
  mewtwoTicketSecs: ['ticket_mewtwo'],
  ivScannerSecs: ['iv_scanner'],
  incenseSecs: [
    'incense_fire', 'incense_water', 'incense_grass', 
    'incense_normal', 'incense_ghost', 'incense_psychic'
  ]
};

export function getMaxBuffDuration(field: string): number {
  const itemIds = BUFF_FIELD_TO_ITEM_IDS[field] || [];
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
