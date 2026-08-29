import type { Pokemon } from '@/types/pokemon/pokemon';
import type { ItemEffectResult } from '@/types/inventory/items';
import { MAX_POKEMON_LEVEL } from '@/data/system/constants';
import {
  POTION_HEAL_HP,
  SUPER_POTION_HEAL_HP,
  HYPER_POTION_HEAL_HP,
  FRESHWATER_HEAL_HP,
  SODAPOP_HEAL_HP,
  LEMONADE_HEAL_HP,
  REVIVE_HALF_DIVISOR,
  ETHER_PP_RESTORE,
  MAX_PP_RESTORE_CAP,
  MIN_VIGOR_VAL,
  SINGLE_VIGOR_RESTORE,
  SINGLE_LEVEL_GAIN
} from '@/logic/constants/items';
import { DEFAULT_MAX_VIGOR } from '@/logic/pokemon/pokemonUtils';

import { handleVitamin, handleFeather, handleEvBerry, handleMochi, handleFreshStartMochi } from './itemEffectHandlers.ts';
import { healHp, revive, clearStatus, curaTotal, restorePP, handleStone } from './itemEffectHandlers.ts';
import { getDynamicItemEffect } from './helpers/itemEffectsHelpers.ts';
import { isValidTarget } from './helpers/itemTargetValidator.ts';
import { GLOBAL_BUFF_EFFECTS } from './helpers/itemGlobalBuffs.ts';

export { isValidTarget, healHp, clearStatus, curaTotal, restorePP, handleStone, getDynamicItemEffect };

const pokeEffect = (fn: (p: Pokemon) => ItemEffectResult) => (p: unknown) => fn(p as Pokemon);

export const itemEffects: Record<string, (p: unknown) => ItemEffectResult> = { // open-record
  // --- Healing & Status ---
  'potion': pokeEffect((p) => healHp(p, POTION_HEAL_HP)),
  'superpotion': pokeEffect((p) => healHp(p, SUPER_POTION_HEAL_HP)),
  'hyperpotion': pokeEffect((p) => healHp(p, HYPER_POTION_HEAL_HP)),
  'maxpotion': pokeEffect((p) => healHp(p, p.maxHp)),
  'revive': pokeEffect((p) => revive(p, Math.floor(p.maxHp / REVIVE_HALF_DIVISOR))),
  'revivemax': pokeEffect((p) => revive(p, p.maxHp)),
  'antidote': pokeEffect((p) => clearStatus(p, 'poison')),
  'burnheal': pokeEffect((p) => clearStatus(p, 'brn')),
  'paralyzeheal': pokeEffect((p) => clearStatus(p, 'par')),
  'awakening': pokeEffect((p) => clearStatus(p, 'slp')),
  'iceheal': pokeEffect((p) => clearStatus(p, 'frz')),
  'fullheal': pokeEffect((p) => curaTotal(p)),
  'sodapop': pokeEffect((p) => healHp(p, SODAPOP_HEAL_HP)),
  'freshwater': pokeEffect((p) => healHp(p, FRESHWATER_HEAL_HP)),
  'lemonade': pokeEffect((p) => healHp(p, LEMONADE_HEAL_HP)),

  // --- Evolutions ---
  'firestone': pokeEffect((p) => handleStone(p, 'firestone')),
  'thunderstone': pokeEffect((p) => handleStone(p, 'thunderstone')),
  'waterstone': pokeEffect((p) => handleStone(p, 'waterstone')),
  'leafstone': pokeEffect((p) => handleStone(p, 'leafstone')),
  'moonstone': pokeEffect((p) => handleStone(p, 'moonstone')),
  'sunstone': pokeEffect((p) => handleStone(p, 'sunstone')),
  'dawnstone': pokeEffect((p) => handleStone(p, 'dawnstone')),
  'duskstone': pokeEffect((p) => handleStone(p, 'duskstone')),
  'icestone': pokeEffect((p) => handleStone(p, 'icestone')),
  'shinystone': pokeEffect((p) => handleStone(p, 'shinystone')),
  'ovalstone': pokeEffect((p) => handleStone(p, 'ovalstone')),

  // --- New Stones & Evolutionary Usables ---
  'linkcable': pokeEffect((p) => handleStone(p, 'linkcable')),
  'whippeddream': pokeEffect((p) => handleStone(p, 'whippeddream')),
  'sachet': pokeEffect((p) => handleStone(p, 'sachet')),
  'deepseascale': pokeEffect((p) => handleStone(p, 'deepseascale')),
  'deepseatooth': pokeEffect((p) => handleStone(p, 'deepseatooth')),

  // --- PP & Stats ---
  'ether': pokeEffect((p) => restorePP(p, ETHER_PP_RESTORE)),
  'elixir': pokeEffect((p) => restorePP(p, ETHER_PP_RESTORE)), // spanish-ok
  'elixirmax': pokeEffect((p) => restorePP(p, MAX_PP_RESTORE_CAP)),
  
  // --- Buffs / Special ---
  'rarecandy': pokeEffect((p) => {
    if (p.level >= MAX_POKEMON_LEVEL) return { success: false, message: 'Ya tiene el nivel máximo.' };
    p.exp = p.expNeeded;
    return { success: true, message: `subió al nivel ${p.level + SINGLE_LEVEL_GAIN}`, resultType: 'levelup' };
  }),
  'vigorcandy': pokeEffect((p) => {
    const maxVigor = p.maxVigor || DEFAULT_MAX_VIGOR;
    const currentVigor = Number(p.vigor || MIN_VIGOR_VAL);
    if (currentVigor >= maxVigor) return { success: false, message: 'Vigor al máximo.' };
    p.vigor = currentVigor + SINGLE_VIGOR_RESTORE;
    return { success: true, message: `recuperó ${SINGLE_VIGOR_RESTORE} de vigor (${p.vigor}/${maxVigor})` };
  }),
  'vigorrestorer': pokeEffect((p) => {
    const maxVigor = p.maxVigor || DEFAULT_MAX_VIGOR;
    const currentVigor = Number(p.vigor || MIN_VIGOR_VAL);
    if (currentVigor >= maxVigor) return { success: false, message: 'Vigor al máximo.' };
    p.vigor = maxVigor;
    return { success: true, message: `recuperó todo su vigor (${p.vigor}/${maxVigor})` };
  }),
  'moverelearner': pokeEffect((_p) => {
    return { success: true, message: 'abriendo menú de movimientos', resultType: 'relearner', deferred: true };
  }),
  'naturepatch': pokeEffect((_p) => {
    return { success: true, message: 'iniciando cambio de naturaleza', deferred: true, resultType: 'nature_patch' };
  }),
  'abilitypill': pokeEffect((_p) => {
    return { success: true, message: 'iniciando cambio de habilidad', deferred: true, resultType: 'ability_pill' };
  }),
  'ppup': pokeEffect((_p) => {
    return { success: true, message: 'selecciona un movimiento para mejorar', deferred: true, resultType: 'pp_up' };
  }),
  'fullrestore': pokeEffect((p) => {
    const hpRes = healHp(p, p.maxHp);
    const statusRes = curaTotal(p);
    if (!hpRes.success && !statusRes.success) {
      return { success: false, message: 'No tendrá ningún efecto.' };
    }
    return { success: true, message: 'recuperó todo su HP y se curó de sus problemas de estado.' };
  }),
  'ppmax': pokeEffect((_p) => {
    return { success: true, message: 'selecciona un movimiento para maximizar sus PP', deferred: true, resultType: 'ppmax' };
  }),

  // --- EV Berries ---
  'pomegberry': pokeEffect((p) => handleEvBerry(p, 'hp', 'HP')),
  'kelpsyberry': pokeEffect((p) => handleEvBerry(p, 'atk', 'Ataque')),
  'qualotberry': pokeEffect((p) => handleEvBerry(p, 'def', 'Defensa')),
  'hondewberry': pokeEffect((p) => handleEvBerry(p, 'spa', 'Ataque Especial')),
  'grepaberry': pokeEffect((p) => handleEvBerry(p, 'spd', 'Defensa Especial')),
  'tamatoberry': pokeEffect((p) => handleEvBerry(p, 'spe', 'Velocidad')),

  // --- Vitamins ---
  'hpup': pokeEffect((p) => handleVitamin(p, 'hp', 'HP')),
  'protein': pokeEffect((p) => handleVitamin(p, 'atk', 'Ataque')),
  'iron': pokeEffect((p) => handleVitamin(p, 'def', 'Defensa')),
  'calcium': pokeEffect((p) => handleVitamin(p, 'spa', 'Ataque Especial')),
  'zinc': pokeEffect((p) => handleVitamin(p, 'spd', 'Defensa Especial')),
  'carbos': pokeEffect((p) => handleVitamin(p, 'spe', 'Velocidad')),

  // --- Feathers ---
  'healthfeather': pokeEffect((p) => handleFeather(p, 'hp', 'HP')),
  'musclefeather': pokeEffect((p) => handleFeather(p, 'atk', 'Ataque')),
  'resistfeather': pokeEffect((p) => handleFeather(p, 'def', 'Defensa')),
  'geniusfeather': pokeEffect((p) => handleFeather(p, 'spa', 'Ataque Especial')),
  'cleverfeather': pokeEffect((p) => handleFeather(p, 'spd', 'Defensa Especial')),
  'swiftfeather': pokeEffect((p) => handleFeather(p, 'spe', 'Velocidad')),

  // --- Mochis ---
  'healthmochi': pokeEffect((p) => handleMochi(p, 'hp', 'HP')),
  'musclemochi': pokeEffect((p) => handleMochi(p, 'atk', 'Ataque')),
  'resistmochi': pokeEffect((p) => handleMochi(p, 'def', 'Defensa')),
  'geniusmochi': pokeEffect((p) => handleMochi(p, 'spa', 'Ataque Especial')),
  'clevermochi': pokeEffect((p) => handleMochi(p, 'spd', 'Defensa Especial')),
  'swiftmochi': pokeEffect((p) => handleMochi(p, 'spe', 'Velocidad')),
  'freshstartmochi': pokeEffect((p) => handleFreshStartMochi(p)),

  // --- Buffs Globales ---
  ...GLOBAL_BUFF_EFFECTS
};
