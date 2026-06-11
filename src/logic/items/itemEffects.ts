
import { checkStoneEvolution } from '../evolutionLogic.ts';
import { TM_COMPAT, GAME_TMS } from '../../data/pokedex.ts';
import { useBuffsStore } from '@/stores/buffs';
import type { Pokemon } from '@/types/pokemon';
import type { ItemEffectResult } from '@/types/items';
import type { GameState } from '@/types/game';
import { MAX_POKEMON_LEVEL } from '@/data/constants';
import { getItemByName, getItemById } from '../../data/items.ts';


interface TMData {
  id: string
  name: string
}

/**
 * Item Effects Core Logic
 * Stateless functions to apply items to Pokémon.
 * Returns { success: boolean, message: string, resultType?: string }
 */

export const isValidTarget = (itemName: string, pokemon: Pokemon): boolean => {
  if (!pokemon) return false;
  
  // Resolve Spanish names to their English ID if necessary
  const dbItem = getItemByName(itemName) || getItemById(itemName);
  const resolvedId = dbItem ? dbItem.id : itemName;

  // Ensure the item ID exists in SHOP_ITEMS (or is a valid TM)
  const isTM = resolvedId.toLowerCase().startsWith('tm') || resolvedId.toLowerCase().startsWith('mt');
  const itemExists = isTM || !!getItemById(resolvedId);
  if (!itemExists) {
    throw new Error(`[ItemEffects] Intento de validar un objeto inexistente: ${itemName}`);
  }

  const effect = (itemEffects as Record<string, (p: Pokemon | GameState) => ItemEffectResult>)[resolvedId] || ((p: Pokemon) => getDynamicItemEffect(resolvedId, p));
  if (typeof effect !== 'function') return false;

  // Clone to avoid mutation during check
  const pClone = { ...pokemon, moves: pokemon.moves ? pokemon.moves.map(m => m ? ({ ...m }) : null) : [] } as Pokemon;
  const result = effect(pClone);
  return !!(result && result.success);
};
const pokeEffect = (fn: (p: Pokemon) => ItemEffectResult) => (p: unknown) => fn(p as Pokemon);
const stateEffect = (fn: (s: GameState) => ItemEffectResult) => (p: unknown) => fn(p as GameState);

export const itemEffects: Record<string, (p: unknown) => ItemEffectResult> = {
  // --- Healing & Status ---
  'potion': pokeEffect((p) => healHp(p, 20)),
  'super_potion': pokeEffect((p) => healHp(p, 50)),
  'hyper_potion': pokeEffect((p) => healHp(p, 200)),
  'max_potion': pokeEffect((p) => healHp(p, p.maxHp)),
  'revive': pokeEffect((p) => revive(p, Math.floor(p.maxHp / 2))),
  'revive_max': pokeEffect((p) => revive(p, p.maxHp)),
  'antidote': pokeEffect((p) => clearStatus(p, 'poison')),
  'burn_heal': pokeEffect((p) => clearStatus(p, 'burn')),
  'awakening': pokeEffect((p) => clearStatus(p, 'sleep')),
  'full_heal': pokeEffect((p) => curaTotal(p)),
  'soda_pop': pokeEffect((p) => healHp(p, 60)),
  'lemonade': pokeEffect((p) => healHp(p, 80)),

  // --- Evolutions ---
  'fire_stone': pokeEffect((p) => handleStone(p, 'Piedra Fuego')),
  'thunder_stone': pokeEffect((p) => handleStone(p, 'Piedra Trueno')),
  'water_stone': pokeEffect((p) => handleStone(p, 'Piedra Agua')),
  'leaf_stone': pokeEffect((p) => handleStone(p, 'Piedra Hoja')),
  'moon_stone': pokeEffect((p) => handleStone(p, 'Piedra Lunar')),
  'sun_stone': pokeEffect((p) => handleStone(p, 'Piedra Solar')),
  'alba_stone': pokeEffect((p) => handleStone(p, 'Piedra Alba')),
  'dusk_stone': pokeEffect((p) => handleStone(p, 'Piedra Crepúsculo')),
  'ice_stone': pokeEffect((p) => handleStone(p, 'Piedra Hielo')),
  'day_stone': pokeEffect((p) => handleStone(p, 'Piedra Día')),

  // --- PP & Stats ---
  'ether': pokeEffect((p) => restorePP(p, 10)),
  'elixir': pokeEffect((p) => restorePP(p, 10)),
  'elixir_max': pokeEffect((p) => restorePP(p, 999)),
  
  // --- Buffs / Special ---
  'rare_candy': pokeEffect((p) => {
    if (p.level >= MAX_POKEMON_LEVEL) return { success: false, message: 'Ya tiene el nivel máximo.' };
    p.exp = p.expNeeded;
    return { success: true, message: `subió al nivel ${p.level + 1}`, resultType: 'levelup' };
  }),
  'vigor_candy': pokeEffect((p) => {
    const maxVigor = 10;
    const currentVigor = Number(p.vigor || 0);
    if (currentVigor >= maxVigor) return { success: false, message: 'Vigor al máximo.' };
    p.vigor = currentVigor + 1;
    return { success: true, message: `recuperó 1 de vigor (${p.vigor}/${maxVigor})` };
  }),
  'vigor_restorer': pokeEffect((p) => {
    const maxVigor = 10;
    const currentVigor = Number(p.vigor || 0);
    if (currentVigor >= maxVigor) return { success: false, message: 'Vigor al máximo.' };
    p.vigor = maxVigor;
    return { success: true, message: `recuperó todo su vigor (${p.vigor}/${maxVigor})` };
  }),
  'move_relearner': pokeEffect((_p) => {
    return { success: true, message: 'abriendo menú de movimientos', resultType: 'relearner', deferred: true };
  }),
  'nature_patch': pokeEffect((_p) => {
    return { success: true, message: 'iniciando cambio de naturaleza', deferred: true, resultType: 'nature_patch' };
  }),
  'ability_pill': pokeEffect((_p) => {
    return { success: true, message: 'iniciando cambio de habilidad', deferred: true, resultType: 'ability_pill' };
  }),
  'pp_up': pokeEffect((_p) => {
    return { success: true, message: 'selecciona un movimiento para mejorar', deferred: true, resultType: 'pp_up' };
  }),
  'restore_all': pokeEffect((p) => {
    const hpRes = healHp(p, p.maxHp);
    const statusRes = curaTotal(p);
    if (!hpRes.success && !statusRes.success) {
      return { success: false, message: 'El HP ya está lleno y no tiene problemas de estado.' };
    }
    return { success: true, message: 'recuperó todo su HP y se curó de sus problemas de estado.' };
  }),
  'pp_max': pokeEffect((_p) => {
    return { success: true, message: 'selecciona un movimiento para maximizar sus PP', deferred: true, resultType: 'pp_max' };
  }),

  // --- Buffs Globales ---
  'fishing_rod': stateEffect((_state) => { useBuffsStore().addBuff('fishing-rod', 20 * 60, 'standard'); return { success: true, message: `activó una Caña de pescar (20 min)` }; }),
  'fishing_rod_good': stateEffect((_state) => { useBuffsStore().addBuff('fishing-rod', 40 * 60, 'good'); return { success: true, message: `activó una Caña Buena (40 min)` }; }),
  'fishing_rod_super': stateEffect((_state) => { useBuffsStore().addBuff('fishing-rod', 60 * 60, 'super'); return { success: true, message: `activó la Supercaña (60 min)` }; }),
  'pickaxe': stateEffect((_state) => { useBuffsStore().addBuff('pickaxe', 20 * 60, 'standard'); return { success: true, message: `activó un Pico de excavación (20 min)` }; }),
  'pickaxe_silver': stateEffect((_state) => { useBuffsStore().addBuff('pickaxe', 40 * 60, 'good'); return { success: true, message: `activó un Pico Bueno (40 min)` }; }),
  'pickaxe_gold': stateEffect((_state) => { useBuffsStore().addBuff('pickaxe', 60 * 60, 'super'); return { success: true, message: `activó el Superpico (60 min)` }; }),
  'brush': stateEffect((_state) => { useBuffsStore().addBuff('brush', 20 * 60, 'standard'); return { success: true, message: `activó un Pincel de excavación (20 min)` }; }),
  'brush_good': stateEffect((_state) => { useBuffsStore().addBuff('brush', 40 * 60, 'good'); return { success: true, message: `activó un Pincel Bueno (40 min)` }; }),
  'brush_super': stateEffect((_state) => { useBuffsStore().addBuff('brush', 60 * 60, 'super'); return { success: true, message: `activó el Superpincel (60 min)` }; }),
  'repel': stateEffect((_state) => { useBuffsStore().addBuff('repel', 5 * 60); return { success: true, message: `activó un Repelente (5 min)` }; }),
  'super_repel': stateEffect((_state) => { useBuffsStore().addBuff('repel', 15 * 60); return { success: true, message: `activó un Superrepelente (15 min)` }; }),
  'max_repel': stateEffect((_state) => { useBuffsStore().addBuff('repel', 30 * 60); return { success: true, message: `activó un Máximo Repelente (30 min)` }; }),
  'ticket_shiny': stateEffect((_state) => { useBuffsStore().addBuff('shiny', 60 * 60); return { success: true, message: `activó el Ticket Shiny (60 min)` }; }),
  'amulet_coin': stateEffect((_state) => { useBuffsStore().addBuff('amulet', 60 * 60); return { success: true, message: `activó la Moneda Amuleto (60 min)` }; }),
  'lucky_egg': stateEffect((_state) => { useBuffsStore().addBuff('lucky-egg', 30 * 60); return { success: true, message: `activó un Huevo Suerte (30 min)` }; }),
  'ticket_safari': stateEffect((_state) => { useBuffsStore().addBuff('safari', 30 * 60); return { success: true, message: `activó el Ticket Safari (30 min)` }; }),
  'ticket_cerulean': stateEffect((_state) => { useBuffsStore().addBuff('cerulean', 30 * 60); return { success: true, message: `activó el Ticket Cueva Celeste (30 min)` }; }),
  'ticket_articuno': stateEffect((_state) => { useBuffsStore().addBuff('articuno', 30 * 60); return { success: true, message: `activó el Ticket Articuno (30 min)` }; }),
  'ticket_mewtwo': stateEffect((_state) => { useBuffsStore().addBuff('mewtwo', 30 * 60); return { success: true, message: `activó el Ticket Mewtwo (30 min)` }; }),
  'iv_scanner': stateEffect((_state) => { useBuffsStore().addBuff('iv-scanner', 60 * 60); return { success: true, message: `activó el Escáner de IVs (60 min)` }; }),
  'incense_fire': stateEffect((_state) => { useBuffsStore().addBuff('incense', 30 * 60, 'fire'); return { success: true, message: `activó el Incienso Fuego (30 min)` }; }),
  'incense_water': stateEffect((_state) => { useBuffsStore().addBuff('incense', 30 * 60, 'water'); return { success: true, message: `activó el Incienso Agua (30 min)` }; }),
  'incense_grass': stateEffect((_state) => { useBuffsStore().addBuff('incense', 30 * 60, 'grass'); return { success: true, message: `activó el Incienso Planta (30 min)` }; }),
  'incense_normal': stateEffect((_state) => { useBuffsStore().addBuff('incense', 30 * 60, 'normal'); return { success: true, message: `activó el Incienso Normal (30 min)` }; }),
  'incense_ghost': stateEffect((_state) => { useBuffsStore().addBuff('incense', 30 * 60, 'ghost'); return { success: true, message: `activó el Incienso Fantasma (30 min)` }; }),
  'incense_psychic': stateEffect((_state) => { useBuffsStore().addBuff('incense', 30 * 60, 'psychic'); return { success: true, message: `activó el Incienso Psíquico (30 min)` }; })
};

/**
 * Gets effect for TMs and other dynamic items not in the main list
 */
export const getDynamicItemEffect = (itemName: string, p: Pokemon): ItemEffectResult | null => {
  const tmMatch = itemName.match(/([Tt][Mm]|[Mm][Tt])(\d+)/);
  if (tmMatch) {
    const tmId = `TM${tmMatch[2]}`;
    const species = p.id;
    const compatList = (TM_COMPAT as Record<string, string[]>)[species] || [];
    if (!compatList.includes(tmId)) {
      return { success: false, message: 'Incompatible.' };
    }
    const tmData = (GAME_TMS as TMData[]).find(t => t.id === tmId);
    if (!tmData) return { success: false, message: 'MT inválida.' };
    
    // Check if pokemon already knows the move
    if (p.moves.some(m => m && m.name === tmData.name)) {
      return { success: false, message: 'Ya conoce este movimiento.' };
    }

    return { 
      success: true, 
      message: `aprenderá ${tmData.name}`, 
      deferred: true, 
      resultType: 'learn_move', 
      moveName: tmData.name 
    };
  }
  return null;
}

// Helper Functions
function healHp(p: Pokemon, amount: number): ItemEffectResult {
  const currentHp = Number(p.hp || 0);
  const maxHp = Number(p.maxHp || 0);
  const healAmount = Number(amount || 0);

  if (currentHp >= maxHp) return { success: false, message: 'HP ya está al máximo.' };
  if (currentHp <= 0) return { success: false, message: 'El Pokémon está debilitado.' };
  
  const prev = currentHp;
  p.hp = Math.min(maxHp, currentHp + healAmount);
  return { success: true, message: `restauró ${p.hp - prev} HP` };
}

function revive(p: Pokemon, amount: number): ItemEffectResult {
  if (p.hp > 0) return { success: false, message: 'El Pokémon no está debilitado.' };
  p.hp = amount;
  return { success: true, message: `revivió con ${p.hp} HP` };
}

function clearStatus(p: Pokemon, type: string): ItemEffectResult {
  if (p.hp <= 0) return { success: false, message: 'El Pokémon está debilitado.' };
  if (p.status !== type && type !== 'any') return { success: false, message: 'No tiene ese estado.' };
  if (!p.status) return { success: false, message: 'No tiene problemas de estado.' };
  const old = p.status;
  p.status = null;
  if (old === 'sleep') p.sleepTurns = 0;
  return { success: true, message: `se curó del estado ${old}` };
}

function curaTotal(p: Pokemon): ItemEffectResult {
  if (p.hp <= 0) return { success: false, message: 'El Pokémon está debilitado.' };
  if (!p.status && Number(p.hp) === Number(p.maxHp)) return { success: false, message: 'No tiene efecto.' };
  p.hp = Number(p.maxHp);
  p.status = null;
  p.sleepTurns = 0;
  return { success: true, message: 'se curó completamente' };
}

function restorePP(p: Pokemon, amount: number): ItemEffectResult {
  let changed = false;
  p.moves.forEach(m => {
    if (!m) return;
    const max = m.maxPP || 35; // Fallback
    if (m.pp < max) {
      m.pp = Math.min(max, (m.pp || 0) + amount);
      changed = true;
    }
  });
  return changed 
    ? { success: true, message: 'recuperó PP' }
    : { success: false, message: 'Los PP ya están al máximo.' };
}

function handleStone(p: Pokemon, stoneName: string): ItemEffectResult {
  const nextId = checkStoneEvolution(p, stoneName);
  if (!nextId) return { success: false, message: 'No tiene efecto sobre este Pokémon.' };
  return { 
    success: true, 
    message: '¡Está evolucionando!', 
    resultType: 'evolution', 
    targetId: nextId 
  };
}

