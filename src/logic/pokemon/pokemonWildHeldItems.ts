import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { ItemId } from '@/data/inventory/items';
import { GAME_RATIOS } from '@/data/system/constants';

/**
 * Probabilidades de items equipados en estado salvaje
 */
export const WILD_HELD_ITEMS: Partial<Record<PokemonSpeciesId, { common?: ItemId; rare?: ItemId }>> = {
  butterfree: { rare: 'silverpowder' },
  beedrill: { rare: 'poisonbarb' },
  pikachu: { common: 'berrybronze', rare: 'lightball' },
  meowth: { rare: 'amuletcoin' },
  abra: { rare: 'twistedspoon' },
  kadabra: { rare: 'twistedspoon' },
  machoke: { rare: 'focussash' },
  magneton: { rare: 'magnet' },
  farfetchd: { rare: 'stick' },
  shellder: { common: 'bigpearl', rare: 'pearl' },
  cloyster: { common: 'bigpearl', rare: 'pearl' },
  haunter: { rare: 'spelltag' },
  gengar: { rare: 'spelltag' },
  cubone: { rare: 'thickclub' },
  marowak: { rare: 'thickclub' },
  chansey: { rare: 'luckyegg' },
  staryu: { common: 'starpiece', rare: 'stardust' },
  starmie: { common: 'starpiece', rare: 'stardust' },
  ditto: { rare: 'metalpowder' },
  snorlax: { rare: 'leftovers' },
  dragonair: { rare: 'dragonscale' },
  dragonite: { rare: 'dragonscale' }
};

export function getWildHeldItem( // domain-ok: Open dynamic text or non-domain string payload
  id: PokemonSpeciesId,
  rates?: { commonRate: number; rareRate: number; forceHeldChance?: number }
): ItemId | null {
  const itemData = WILD_HELD_ITEMS[id];
  if (!itemData) return null;

  if (rates?.forceHeldChance && Math.random() < rates.forceHeldChance) {
    if (itemData.rare && Math.random() < 0.5) return itemData.rare;
    if (itemData.common) return itemData.common;
    if (itemData.rare) return itemData.rare;
  }

  const rand = Math.random();
  const r = rates || GAME_RATIOS.heldItems;
  if (itemData.rare && rand < r.rareRate) return itemData.rare;
  if (itemData.common && rand < r.commonRate) return itemData.common;
  return null;
}
