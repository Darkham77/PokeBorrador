import type { Pokemon } from '@/types/pokemon/pokemon';
import { MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { getItemById, requireItemId, type ItemId } from '../../../data/inventory/items.ts';
import { DEFAULT_MAX_VIGOR } from '@/logic/pokemon/pokemonUtils';
import { canHeal, canClearStatus, canRevive, canFullRestore, canRestorePP } from '../itemMath.ts';
import { handleStone } from '../itemEffectHandlers.ts';
import { EV_BERRIES, VITAMINS, FEATHERS, MOCHIS, canUseVitamin, canUseEvBerry, calculateTotalEvs } from '@/logic/pokemon/evMath.ts';
import { getDynamicItemEffect } from './itemEffectsHelpers.ts';

const EVOLUTION_STONES = [
  'firestone', 'thunderstone', 'waterstone', 'leafstone', 'moonstone',
  'sunstone', 'dawnstone', 'duskstone', 'icestone', 'shinystone',
  'ovalstone', 'linkcable', 'whippeddream', 'sachet', 'deepseascale', 'deepseatooth'
] as const satisfies readonly ItemId[];
const EVOLUTION_STONES_SET: ReadonlySet<string> = new Set(EVOLUTION_STONES); // runtime-set: Fast O(1) membership lookup set

const STATIC_TARGET_VALIDATORS: Partial<Record<ItemId, (p: Pokemon) => boolean>> = {
  potion: canHeal,
  superpotion: canHeal,
  hyperpotion: canHeal,
  maxpotion: canHeal,
  sodapop: canHeal,
  freshwater: canHeal,
  lemonade: canHeal,

  revive: canRevive,
  revivemax: canRevive,

  antidote: (p) => canClearStatus(p, 'poison'),
  burnheal: (p) => canClearStatus(p, 'brn'),
  paralyzeheal: (p) => canClearStatus(p, 'par'),
  awakening: (p) => canClearStatus(p, 'slp'),
  iceheal: (p) => canClearStatus(p, 'frz'),
  fullheal: (p) => canClearStatus(p, 'any'),

  fullrestore: canFullRestore,

  ether: canRestorePP,
  elixir: canRestorePP,
  elixirmax: canRestorePP,

  rarecandy: (p) => p.level < MAX_POKEMON_LEVEL,
  vigorcandy: (p) => Number(p.vigor || 0) < DEFAULT_MAX_VIGOR,
  vigorrestorer: (p) => Number(p.vigor || 0) < DEFAULT_MAX_VIGOR,

  freshstartmochi: (p) => calculateTotalEvs(p.evs) > 0,

  moverelearner: () => true,
  naturepatch: () => true,
  abilitypill: () => true,
  ppup: () => true,
  ppmax: () => true,
};

function verifyItemExists(resolvedId: ItemId, isTM: boolean, rawInput: string): boolean {
  if (isTM) return true;
  try {
    getItemById(resolvedId);
    return true;
  } catch {
    throw new Error(`[ItemEffects] Intento de validar un objeto inexistente: ${rawInput}`);
  }
}

function validateEvTarget(resolvedId: ItemId, pokemon: Pokemon): boolean | null {
  const berryStatKey = EV_BERRIES[resolvedId];
  if (berryStatKey) {
    return canUseEvBerry(pokemon.evs, berryStatKey, pokemon.friendship);
  }
  const vitaminStatKey = VITAMINS[resolvedId];
  if (vitaminStatKey) {
    return canUseVitamin(pokemon.evs, vitaminStatKey);
  }
  const featherStatKey = FEATHERS[resolvedId];
  if (featherStatKey) {
    return canUseVitamin(pokemon.evs, featherStatKey);
  }
  const mochiStatKey = MOCHIS[resolvedId];
  if (mochiStatKey) {
    return canUseVitamin(pokemon.evs, mochiStatKey);
  }
  return null;
}

function validateEvolutionTarget(resolvedId: ItemId, pokemon: Pokemon): boolean | null {
  if (EVOLUTION_STONES_SET.has(resolvedId)) {
    return handleStone(pokemon, resolvedId).success;
  }
  return null;
}

function validateTmOrHeldTarget(resolvedId: ItemId, pokemon: Pokemon, isTM: boolean, itemExists: boolean): boolean {
  if (isTM) {
    const dynamicRes = getDynamicItemEffect(resolvedId, pokemon);
    return !!(dynamicRes && dynamicRes.success);
  }
  if (itemExists) {
    const itemData = getItemById(resolvedId);
    if (itemData && (itemData.cat === 'combat_held' || (itemData.cat === 'breeding_held' && itemData.id !== 'vigorrestorer' && !itemData.id.includes('berry')))) {
      return true;
    }
  }
  return false;
}

export const isValidTarget = (itemId: ItemId | (string & {}), pokemon: Pokemon): boolean => {
  if (!pokemon) return false;
  const resolvedId = requireItemId(itemId);
  const isTM = resolvedId.startsWith('tm') || resolvedId.startsWith('mt');
  const itemExists = verifyItemExists(resolvedId, isTM, itemId);

  const staticValidator = STATIC_TARGET_VALIDATORS[resolvedId];
  if (staticValidator) return staticValidator(pokemon);

  const stoneResult = validateEvolutionTarget(resolvedId, pokemon);
  if (stoneResult !== null) return stoneResult;

  const evResult = validateEvTarget(resolvedId, pokemon);
  if (evResult !== null) return evResult;

  return validateTmOrHeldTarget(resolvedId, pokemon, isTM, itemExists);
};
