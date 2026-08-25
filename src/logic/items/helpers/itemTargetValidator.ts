import type { Pokemon } from '@/types/pokemon/pokemon';
import { MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { getItemById, requireItemId, type ItemId } from '../../../data/inventory/items.ts';
import { DEFAULT_MAX_VIGOR } from '@/logic/pokemon/pokemonUtils';
import { canHeal, canClearStatus, canRevive, canFullRestore, canRestorePP } from '../itemMath.ts';
import { handleStone } from '../itemEffectHandlers.ts';
import { EV_BERRIES, VITAMINS, FEATHERS, MOCHIS, canUseVitamin, canUseEvBerry, calculateTotalEvs } from '@/logic/pokemon/evMath.ts';
import { getDynamicItemEffect } from './itemEffectsHelpers.ts';

export const isValidTarget = (itemId: ItemId | (string & {}), pokemon: Pokemon): boolean => {
  if (!pokemon) return false;
  
  const resolvedId = requireItemId(itemId);

  const isTM = resolvedId.startsWith('tm') || resolvedId.startsWith('mt');
  let itemExists = isTM;
  if (!isTM) {
    try {
      getItemById(resolvedId);
      itemExists = true;
    } catch {
      itemExists = false;
    }
  }
  if (!itemExists) {
    throw new Error(`[ItemEffects] Intento de validar un objeto inexistente: ${itemId}`);
  }

  // 1. Curaciones / HP
  if (['potion', 'superpotion', 'hyperpotion', 'maxpotion', 'sodapop', 'freshwater', 'lemonade'].includes(resolvedId)) {
    return canHeal(pokemon);
  }

  // 2. Revivir
  if (['revive', 'revivemax'].includes(resolvedId)) {
    return canRevive(pokemon);
  }

  // 3. Cura de estados específicos
  if (resolvedId === 'antidote') return canClearStatus(pokemon, 'poison');
  if (resolvedId === 'burnheal') return canClearStatus(pokemon, 'brn');
  if (resolvedId === 'paralyzeheal') return canClearStatus(pokemon, 'par');
  if (resolvedId === 'awakening') return canClearStatus(pokemon, 'slp');
  if (resolvedId === 'iceheal') return canClearStatus(pokemon, 'frz');
  if (resolvedId === 'fullheal') return canClearStatus(pokemon, 'any');

  // 4. Cura Total / Restauración Completa
  if (['fullrestore'].includes(resolvedId)) {
    return canFullRestore(pokemon);
  }

  // 5. PP (Restauración de PP)
  if (['ether', 'elixir', 'elixirmax'].includes(resolvedId)) {
    return canRestorePP(pokemon);
  }

  // 6. Piedras Evolutivas y Objetos de Evolución
  if (['firestone', 'thunderstone', 'waterstone', 'leafstone', 'moonstone', 'sunstone', 'dawnstone', 'duskstone', 'icestone', 'shinystone', 'ovalstone', 'linkcable', 'whippeddream', 'sachet', 'deepseascale', 'deepseatooth'].includes(resolvedId)) {
    const res = handleStone(pokemon, resolvedId);
    return res.success;
  }

  // 7. Caramelos y Consumibles de Atributos
  if (resolvedId === 'rarecandy') {
    return pokemon.level < MAX_POKEMON_LEVEL;
  }
  if (resolvedId === 'vigorcandy' || resolvedId === 'vigorrestorer') {
    return Number(pokemon.vigor || 0) < DEFAULT_MAX_VIGOR;
  }

  // 8. Bayas de EVs
  if (resolvedId in EV_BERRIES) {
    const statKey = EV_BERRIES[resolvedId];
    if (statKey) {
      return canUseEvBerry(pokemon.evs, statKey, pokemon.friendship);
    }
  }

  // 9. Vitaminas, Plumas y Mochis
  if (resolvedId in VITAMINS) {
    const statKey = VITAMINS[resolvedId];
    if (statKey) {
      return canUseVitamin(pokemon.evs, statKey);
    }
  }
  if (resolvedId in FEATHERS) {
    const statKey = FEATHERS[resolvedId];
    if (statKey) {
      return canUseVitamin(pokemon.evs, statKey);
    }
  }
  if (resolvedId in MOCHIS) {
    const statKey = MOCHIS[resolvedId];
    if (statKey) {
      return canUseVitamin(pokemon.evs, statKey);
    }
  }
  if (resolvedId === 'freshstartmochi') {
    return calculateTotalEvs(pokemon.evs) > 0;
  }

  // 10. Objetos Diferidos (Menús / Selección)
  if (['moverelearner', 'naturepatch', 'abilitypill', 'ppup', 'ppmax'].includes(resolvedId)) {
    return true;
  }

  // 11. TMs / MTs dinámicas
  if (isTM) {
    const dynamicRes = getDynamicItemEffect(resolvedId, pokemon);
    return !!(dynamicRes && dynamicRes.success);
  }

  return false;
};
