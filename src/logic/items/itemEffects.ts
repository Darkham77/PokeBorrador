import { useBuffsStore } from '@/stores/battle/buffs';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { ItemEffectResult } from '@/types/inventory/items';
import type { GameState } from '@/types/system/game';
import { MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { getItemById, requireItemId, type ItemId } from '../../data/inventory/items.ts';
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
  BUFF_DURATION_5_MIN_SEC,
  BUFF_DURATION_15_MIN_SEC,
  BUFF_DURATION_20_MIN_SEC,
  BUFF_DURATION_30_MIN_SEC,
  BUFF_DURATION_40_MIN_SEC,
  BUFF_DURATION_60_MIN_SEC,
  MIN_VIGOR_VAL,
  SINGLE_VIGOR_RESTORE,
  SINGLE_LEVEL_GAIN
} from '@/logic/constants/items';
import { DEFAULT_MAX_VIGOR } from '@/logic/pokemon/pokemonUtils';

import { canHeal, canClearStatus, canRevive, canFullRestore, canRestorePP } from './itemMath.ts';

export const isValidTarget = (itemId: ItemId | string, pokemon: Pokemon): boolean => {
  if (!pokemon) return false;
  
  const resolvedId = requireItemId(itemId);

  // Ensure the item ID exists in SHOP_ITEMS (or is a valid TM)
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
  if (resolvedId === 'antidote') return canClearStatus(pokemon, 'psn');
  if (resolvedId === 'burnheal') return canClearStatus(pokemon, 'brn');
  if (resolvedId === 'paralyzeheal') return canClearStatus(pokemon, 'par');
  if (resolvedId === 'awakening') return canClearStatus(pokemon, 'slp');
  if (resolvedId === 'iceheal') return canClearStatus(pokemon, 'frz');
  if (resolvedId === 'fullheal') return canClearStatus(pokemon, 'any');

  // 4. Cura Total / Restauración Completa (HP o Estado)
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

  // 8. Objetos Diferidos (Menús / Selección)
  if (['moverelearner', 'naturepatch', 'abilitypill', 'ppup', 'ppmax'].includes(resolvedId)) {
    return true;
  }

  // 9. TMs / MTs dinámicas
  if (isTM) {
    const dynamicRes = getDynamicItemEffect(resolvedId, pokemon);
    return !!(dynamicRes && dynamicRes.success);
  }

  // Si no coincide con ninguna categoría anterior, no es aplicable a un Pokémon objetivo
  return false;
};
const pokeEffect = (fn: (p: Pokemon) => ItemEffectResult) => (p: unknown) => fn(p as Pokemon);
const stateEffect = (fn: (s: GameState) => ItemEffectResult) => (p: unknown) => fn(p as GameState);

export const itemEffects: Record<string, (p: unknown) => ItemEffectResult> = { // open-record
  // --- Healing & Status ---
  'potion': pokeEffect((p) => healHp(p, POTION_HEAL_HP)),
  'superpotion': pokeEffect((p) => healHp(p, SUPER_POTION_HEAL_HP)),
  'hyperpotion': pokeEffect((p) => healHp(p, HYPER_POTION_HEAL_HP)),
  'maxpotion': pokeEffect((p) => healHp(p, p.maxHp)),
  'revive': pokeEffect((p) => revive(p, Math.floor(p.maxHp / REVIVE_HALF_DIVISOR))),
  'revivemax': pokeEffect((p) => revive(p, p.maxHp)),
  'antidote': pokeEffect((p) => clearStatus(p, 'psn')),
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
  'elixir': pokeEffect((p) => restorePP(p, ETHER_PP_RESTORE)),
  'elixirmax': pokeEffect((p) => restorePP(p, MAX_PP_RESTORE_CAP)),
  
  // --- Buffs / Special ---
  'rarecandy': pokeEffect((p) => {
    if (p.level >= MAX_POKEMON_LEVEL) return { success: false, message: 'Ya tiene el nivel máximo.' };
    p.exp = p.expNeeded;
    return { success: true, message: `subió al nivel ${p.level + SINGLE_LEVEL_GAIN}`, resultType: 'levelup' };
  }),
  'vigorcandy': pokeEffect((p) => {
    const maxVigor = DEFAULT_MAX_VIGOR;
    const currentVigor = Number(p.vigor || MIN_VIGOR_VAL);
    if (currentVigor >= maxVigor) return { success: false, message: 'Vigor al máximo.' };
    p.vigor = currentVigor + SINGLE_VIGOR_RESTORE;
    return { success: true, message: `recuperó ${SINGLE_VIGOR_RESTORE} de vigor (${p.vigor}/${maxVigor})` };
  }),
  'vigorrestorer': pokeEffect((p) => {
    const maxVigor = DEFAULT_MAX_VIGOR;
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

  // --- Buffs Globales ---
  'fishingrod': stateEffect((_state) => { useBuffsStore().addBuff('fishing-rod', BUFF_DURATION_20_MIN_SEC, 'standard'); return { success: true, message: `activó una Caña de pescar (20 min)` }; }), // magic-ok
  'fishingrodgood': stateEffect((_state) => { useBuffsStore().addBuff('fishing-rod', BUFF_DURATION_40_MIN_SEC, 'good'); return { success: true, message: `activó una Caña Buena (40 min)` }; }), // magic-ok
  'fishingrodsuper': stateEffect((_state) => { useBuffsStore().addBuff('fishing-rod', BUFF_DURATION_60_MIN_SEC, 'super'); return { success: true, message: `activó la Supercaña (60 min)` }; }), // magic-ok
  'pickaxe': stateEffect((_state) => { useBuffsStore().addBuff('pickaxe', BUFF_DURATION_20_MIN_SEC, 'standard'); return { success: true, message: `activó un Pico de excavación (20 min)` }; }), // magic-ok
  'pickaxesilver': stateEffect((_state) => { useBuffsStore().addBuff('pickaxe', BUFF_DURATION_40_MIN_SEC, 'good'); return { success: true, message: `activó un Pico Bueno (40 min)` }; }), // magic-ok
  'pickaxegold': stateEffect((_state) => { useBuffsStore().addBuff('pickaxe', BUFF_DURATION_60_MIN_SEC, 'super'); return { success: true, message: `activó el Superpico (60 min)` }; }), // magic-ok
  'brush': stateEffect((_state) => { useBuffsStore().addBuff('brush', BUFF_DURATION_20_MIN_SEC, 'standard'); return { success: true, message: `activó un Pincel de excavación (20 min)` }; }), // magic-ok
  'brushgood': stateEffect((_state) => { useBuffsStore().addBuff('brush', BUFF_DURATION_40_MIN_SEC, 'good'); return { success: true, message: `activó un Pincel Bueno (40 min)` }; }), // magic-ok
  'brushsuper': stateEffect((_state) => { useBuffsStore().addBuff('brush', BUFF_DURATION_60_MIN_SEC, 'super'); return { success: true, message: `activó el Superpincel (60 min)` }; }), // magic-ok
  'repel': stateEffect((_state) => { useBuffsStore().addBuff('repel', BUFF_DURATION_5_MIN_SEC); return { success: true, message: `activó un Repelente (5 min)` }; }), // magic-ok
  'superrepel': stateEffect((_state) => { useBuffsStore().addBuff('repel', BUFF_DURATION_15_MIN_SEC); return { success: true, message: `activó un Superrepelente (15 min)` }; }), // magic-ok
  'maxrepel': stateEffect((_state) => { useBuffsStore().addBuff('repel', BUFF_DURATION_30_MIN_SEC); return { success: true, message: `activó un Máximo Repelente (30 min)` }; }), // magic-ok
  'ticketshiny': stateEffect((_state) => { useBuffsStore().addBuff('shiny', BUFF_DURATION_60_MIN_SEC); return { success: true, message: `activó el Ticket Shiny (60 min)` }; }), // magic-ok
  'amuletcoin': stateEffect((_state) => { useBuffsStore().addBuff('amulet', BUFF_DURATION_60_MIN_SEC); return { success: true, message: `activó la Moneda Amuleto (60 min)` }; }), // magic-ok
  'luckyegg': stateEffect((_state) => { useBuffsStore().addBuff('lucky-egg', BUFF_DURATION_30_MIN_SEC); return { success: true, message: `activó un Huevo Suerte (30 min)` }; }), // magic-ok
  'ticketsafari': stateEffect((_state) => { useBuffsStore().addBuff('safari', BUFF_DURATION_30_MIN_SEC); return { success: true, message: `activó el Ticket Safari (30 min)` }; }), // magic-ok
  'ticketcerulean': stateEffect((_state) => { useBuffsStore().addBuff('cerulean', BUFF_DURATION_30_MIN_SEC); return { success: true, message: `activó el Ticket Cueva Celeste (30 min)` }; }), // magic-ok
  'ticketarticuno': stateEffect((_state) => { useBuffsStore().addBuff('articuno', BUFF_DURATION_30_MIN_SEC); return { success: true, message: `activó el Ticket Articuno (30 min)` }; }), // magic-ok
  'ticketmewtwo': stateEffect((_state) => { useBuffsStore().addBuff('mewtwo', BUFF_DURATION_30_MIN_SEC); return { success: true, message: `activó el Ticket Mewtwo (30 min)` }; }), // magic-ok
  'ivscanner': stateEffect((_state) => { useBuffsStore().addBuff('iv-scanner', BUFF_DURATION_60_MIN_SEC); return { success: true, message: `activó el Escáner de IVs (60 min)` }; }), // magic-ok
  'incensefire': stateEffect((_state) => { useBuffsStore().addBuff('incense', BUFF_DURATION_30_MIN_SEC, 'fire'); return { success: true, message: `activó el Incienso Fuego (30 min)` }; }), // magic-ok
  'incensewater': stateEffect((_state) => { useBuffsStore().addBuff('incense', BUFF_DURATION_30_MIN_SEC, 'water'); return { success: true, message: `activó el Incienso Agua (30 min)` }; }), // magic-ok
  'incensegrass': stateEffect((_state) => { useBuffsStore().addBuff('incense', BUFF_DURATION_30_MIN_SEC, 'grass'); return { success: true, message: `activó el Incienso Planta (30 min)` }; }), // magic-ok
  'incensenormal': stateEffect((_state) => { useBuffsStore().addBuff('incense', BUFF_DURATION_30_MIN_SEC, 'normal'); return { success: true, message: `activó el Incienso Normal (30 min)` }; }), // magic-ok
  'incenseghost': stateEffect((_state) => { useBuffsStore().addBuff('incense', BUFF_DURATION_30_MIN_SEC, 'ghost'); return { success: true, message: `activó el Incienso Fantasma (30 min)` }; }), // magic-ok
  'incensepsychic': stateEffect((_state) => { useBuffsStore().addBuff('incense', BUFF_DURATION_30_MIN_SEC, 'psychic'); return { success: true, message: `activó el Incienso Psíquico (30 min)` }; }), // magic-ok
};

import { healHp, revive, clearStatus, curaTotal, restorePP, handleStone } from './itemEffectHandlers.ts';
import { getDynamicItemEffect } from './helpers/itemEffectsHelpers.ts';

export { healHp, clearStatus, curaTotal, restorePP, handleStone, getDynamicItemEffect };

