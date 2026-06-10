import { useGameStore } from './game.ts';
import { SHOP_ITEMS } from '@/data/items';
import { itemEffects as ITEM_EFFECTS, getDynamicItemEffect } from '@/logic/items/itemEffects';
import { isGlobalItem } from '../logic/providers/itemProvider.ts';
import type { Pokemon } from '@/types/pokemon';

export function resolveNormalizedName(name: string): string {
  const norm = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  
  const aliases: Record<string, string> = {
    'potion': 'Poción',
    'superpotion': 'Súper Poción',
    'hyperpotion': 'Hiper Poción',
    'maxpotion': 'Poción Máxima',
    'firestone': 'Piedra Fuego',
    'waterstone': 'Piedra Agua',
    'thunderstone': 'Piedra Trueno',
    'leafstone': 'Piedra Hoja',
    'moonstone': 'Piedra Lunar',
    'sunstone': 'Piedra Solar',
    'vigorcandy': 'Caramelo de vigor',
    'repel': 'Repelente',
    'iman': 'Imán',
    'elixir': 'Elixir',
    'subidapp': 'Subida de PP',
    'mttoxico': 'MT06 Tóxico',
    'ocasoball': 'Ocaso Ball',
    'turnoball': 'Turno Ball',
    'ultraball': 'Ultra Ball',
    'masterball': 'Master Ball',
    'superball': 'Súper Ball',
    'brazalrecio': 'Brazal Recio',
    'brazalrecia': 'Brazal Recio',
    'cintorecio': 'Cinto Recio',
    'cintorecia': 'Cinto Recio',
    'pesarecia': 'Pesa Recia',
    'bandarecia': 'Banda Recia',
    'lenterecia': 'Lente Recia',
    'franjarecia': 'Franja Recia',
    'bayadeoro': 'Baya de Oro',
    'bayaoro': 'Baya de Oro',
    'piedraeterna': 'Piedra Eterna',
    'lazodestino': 'Lazo Destino',
    'caramelovigor': 'Caramelo de vigor',
    'fishingrod': 'Caña de pescar',
    'fishingrodgood': 'Caña Buena',
    'fishingrodsuper': 'Supercaña',
    'pickaxe': 'Pico de excavación',
    'pickaxesilver': 'Pico Bueno',
    'pickaxegold': 'Superpico',
    'brush': 'Pincel de excavación',
    'brushgood': 'Pincel Bueno',
    'brushsuper': 'Superpincel'
  };

  return aliases[norm] || name;
}

export function findInventoryKey(gameStore: ReturnType<typeof useGameStore>, name: string): string | null {
  const inv = gameStore.state.inventory || {};
  if (inv[name] !== undefined) return name;

  const targetOfficial = resolveNormalizedName(name);
  const targetOfficialNorm = targetOfficial.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

  for (const key of Object.keys(inv)) {
    const keyOfficial = resolveNormalizedName(key);
    const keyOfficialNorm = keyOfficial.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    if (keyOfficialNorm === targetOfficialNorm) {
      return key;
    }
  }
  return null;
}

export function isItemUsableOn(itemName: string, pokemon: Pokemon) {
  if (!pokemon) return false;
  const officialName = resolveNormalizedName(itemName);
  if (isGlobalItem(officialName)) return false;

  const item = SHOP_ITEMS.find(i => i.name === officialName);

  if (pokemon.inDaycare) {
    if (!item) return false;
    const isVigorRestorer = item.id === 'vigor_restorer' || item.id === 'vigor_candy' || item.id === 'caramelo_vigor' || item.name === 'Restaurador de Vigor' || item.name === 'Caramelo de vigor';
    const isBreedingHeld = item.cat === 'breeding';
    return !!(isVigorRestorer || isBreedingHeld);
  }

  if (item && (
    item.cat === 'held' || 
    item.type === 'held' || 
    (item.cat === 'breeding' && item.id !== 'vigor_restorer' && !item.id.includes('berry'))
  )) return true;

  const p = JSON.parse(JSON.stringify(pokemon));

  const effectFn = ITEM_EFFECTS[officialName];
  if (effectFn) {
    const res = effectFn(p);
    return res && res.success;
  }

  const dynamicRes = getDynamicItemEffect(officialName, p);
  return dynamicRes && dynamicRes.success;
}

export function consumeItem(gameStore: ReturnType<typeof useGameStore>, itemName: string) {
  const inv = gameStore.state.inventory;
  if (!inv) return;
  const actualKey = findInventoryKey(gameStore, itemName);
  if (actualKey && inv[actualKey]) {
    inv[actualKey]--;
    if (inv[actualKey] <= 0) {
      delete inv[actualKey];
    }
    gameStore.state.inventory = { ...inv };
  }
}

export function getItemTier(item: { cat?: string; sprite?: string; craftingTier?: number }): number {
  if (item.craftingTier !== undefined) return item.craftingTier;
  const cat = item.cat || 'otros';
  if (cat === 'raw_material' || item.sprite?.includes('crafting/tier0/')) return 0;
  if (cat === 'refined_material' || item.sprite?.includes('crafting/tier1/')) return 1;
  if (cat === 'component' || item.sprite?.includes('crafting/tier2/')) return 2;
  return 3;
}

export function isItemProduct(item: { name: string; cat?: string; type?: string; id?: string; sprite?: string }): boolean {
  if (getItemTier(item) === 3) return true;

  const cat = item.cat;
  const type = item.type;
  const id = item.id;

  if (
    cat === 'potions' ||
    cat === 'pokeballs' ||
    cat === 'stones' ||
    cat === 'combat_held' ||
    cat === 'breeding_held' ||
    type === 'stone' ||
    type === 'held' ||
    type === 'usable' ||
    type === 'booster' ||
    cat === 'tools' ||
    cat === 'tms'
  ) {
    return true;
  }

  const officialName = resolveNormalizedName(item.name);
  if (ITEM_EFFECTS[officialName]) return true;
  if (item.name.toLowerCase().match(/m[tt]\d+/)) return true;
  if (id?.toLowerCase().startsWith('tm')) return true;

  return false;
}

export function getAdjustedProductCategory(item: { name: string; cat?: string; id?: string }): string {
  const cat = item.cat || 'otros';

  if (!['raw_material', 'refined_material', 'component'].includes(cat)) {
    return cat;
  }

  const id = item.id || '';
  if (id.includes('stone') || item.name.toLowerCase().includes('piedra')) {
    return 'stones';
  }

  if (id.includes('root') || id.includes('revive') || item.name.toLowerCase().includes('pocion') || item.name.toLowerCase().includes('revivir')) {
    return 'potions';
  }

  return 'otros';
}
