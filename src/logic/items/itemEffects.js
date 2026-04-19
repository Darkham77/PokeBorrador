import { checkStoneEvolution } from '../evolutionLogic';
import { TM_COMPAT, GAME_TMS } from '../../data/pokedex';
import { useUIStore } from '@/stores/ui';
import { useGameStore } from '@/stores/game';
import { useBuffsStore } from '@/stores/buffs';
import { makePokemon } from '../pokemonFactory';

/**
 * Item Effects Core Logic
 * Stateless functions to apply items to Pokémon.
 * Returns { success: boolean, message: string, resultType?: string }
 */

export const itemEffects = {
  // --- Healing & Status ---
  'Poción': (p) => healHp(p, 20),
  'Super Poción': (p) => healHp(p, 50),
  'Hiper Poción': (p) => healHp(p, 200),
  'Poción Máxima': (p) => healHp(p, p.maxHp),
  'Revivir': (p) => revive(p, Math.floor(p.maxHp / 2)),
  'Revivir Máximo': (p) => revive(p, p.maxHp),
  'Antídoto': (p) => clearStatus(p, 'poison'),
  'Cura Quemadura': (p) => clearStatus(p, 'burn'),
  'Despertar': (p) => clearStatus(p, 'sleep'),
  'Cura Total': (p) => curaTotal(p),
  'Refresco': (p) => healHp(p, 60),
  'Limonada': (p) => healHp(p, 80),

  // --- Evolutions ---
  'Piedra Fuego': (p) => handleStone(p, 'Piedra Fuego'),
  'Piedra Trueno': (p) => handleStone(p, 'Piedra Trueno'),
  'Piedra Agua': (p) => handleStone(p, 'Piedra Agua'),
  'Piedra Hoja': (p) => handleStone(p, 'Piedra Hoja'),
  'Piedra Lunar': (p) => handleStone(p, 'Piedra Lunar'),
  'Piedra Solar': (p) => handleStone(p, 'Piedra Solar'),

  // --- PP & Stats ---
  'Éter': (p) => restorePP(p, 10),
  'Elixir Máximo': (p) => restorePP(p, 999),
  
  // --- Buffs / Special ---
  'Caramelo Raro': (p) => {
    if (p.level >= 100) return { success: false, message: 'Ya tiene el nivel máximo.' };
    return { success: true, message: `subió al nivel ${p.level + 1}`, resultType: 'levelup' };
  },
  'Caramelo de vigor': (p) => {
    const maxVigor = 10;
    const currentVigor = Number(p.vigor || 0);
    if (currentVigor >= maxVigor) return { success: false, message: 'Vigor al máximo.' };
    p.vigor = currentVigor + 1;
    return { success: true, message: `recuperó 1 de vigor (${p.vigor}/${maxVigor})` };
  },
  'Recordador de Movimientos': (_p) => {
    // This item is special as it opens a menu
    return { success: true, message: 'abriendo menú de movimientos', resultType: 'relearner', deferred: true };
  },
  'Parche de naturaleza': (_p) => {
    return { success: true, message: 'iniciando cambio de naturaleza', deferred: true, resultType: 'nature_patch' };
  },
  'Píldora de cambio de habilidad': (_p) => {
    return { success: true, message: 'iniciando cambio de habilidad', deferred: true, resultType: 'ability_pill' };
  },
  'Subida de PP': (_p) => {
    return { success: true, message: 'selecciona un movimiento para mejorar', deferred: true, resultType: 'pp_up' };
  },

  // --- Buffs Globales ---
  'Repelente': (_state) => { useBuffsStore().addBuff('repel', 5 * 60); return `activó un Repelente (5 min)`; },
  'Superrepelente': (_state) => { useBuffsStore().addBuff('repel', 15 * 60); return `activó un Superrepelente (15 min)`; },
  'Máximo Repelente': (_state) => { useBuffsStore().addBuff('repel', 30 * 60); return `activó un Máximo Repelente (30 min)`; },
  'Ticket Shiny': (_state) => { useBuffsStore().addBuff('shiny', 60 * 60); return `activó el Ticket Shiny (60 min)`; },
  'Moneda Amuleto': (_state) => { useBuffsStore().addBuff('amulet', 60 * 60); return `activó la Moneda Amuleto (60 min)`; },
  'Huevo Suerte Pequeño': (_state) => { useBuffsStore().addBuff('lucky-egg', 30 * 60); return `activó un Huevo Suerte (30 min)`; },
  'Ticket Safari': (_state) => { useBuffsStore().addBuff('safari', 30 * 60); return `activó el Ticket Safari (30 min)`; },
  'Ticket Cueva Celeste': (_state) => { useBuffsStore().addBuff('cerulean', 30 * 60); return `activó el Ticket Cueva Celeste (30 min)`; },
  'Ticket Articuno': (_state) => { useBuffsStore().addBuff('articuno', 30 * 60); return `activó el Ticket Articuno (30 min)`; },
  'Ticket Mewtwo': (_state) => { useBuffsStore().addBuff('mewtwo', 30 * 60); return `activó el Ticket Mewtwo (30 min)`; },
  'Escáner de IVs': (_state) => { useBuffsStore().addBuff('iv-scanner', 60 * 60); return `activó el Escáner de IVs (60 min)`; },
  'Incienso Fuego': (_state) => { useBuffsStore().addBuff('incense', 30 * 60, 'fire'); return `activó el Incienso Fuego (30 min)`; },
  'Incienso Agua': (_state) => { useBuffsStore().addBuff('incense', 30 * 60, 'water'); return `activó el Incienso Agua (30 min)`; },
  'Incienso Planta': (_state) => { useBuffsStore().addBuff('incense', 30 * 60, 'grass'); return `activó el Incienso Planta (30 min)`; },
  'Incienso Normal': (_state) => { useBuffsStore().addBuff('incense', 30 * 60, 'normal'); return `activó el Incienso Normal (30 min)`; },
  'Incienso Fantasma': (_state) => { useBuffsStore().addBuff('incense', 30 * 60, 'ghost'); return `activó el Incienso Fantasma (30 min)`; },
  'Incienso Psíquico': (_state) => { useBuffsStore().addBuff('incense', 30 * 60, 'psychic'); return `activó el Incienso Psíquico (30 min)`; },

  // --- Fósiles ---
  'Fósil Hélix': (state) => reviveFossilTrigger('omanyte', 'Fósil Hélix', state),
  'Fósil Domo': (state) => reviveFossilTrigger('kabuto', 'Fósil Domo', state),
  'Ámbar Viejo': (state) => reviveFossilTrigger('aerodactyl', 'Ámbar Viejo', state)
};

function reviveFossilTrigger(pokemonId, itemName, state) {
  const gameStore = useGameStore();
  const uiStore = useUIStore();
  
  const p = makePokemon(pokemonId, 1);
  const result = gameStore.addPokemon(p, { notify: false });
  
  uiStore.activeFossil = { pokemon: p, sentTo: result.target, itemName };
  uiStore.isFossilRevivalOpen = true;
  return 'iniciando restauración...';
}

/**
 * Gets effect for TMs and other dynamic items not in the main list
 */
export const getDynamicItemEffect = (itemName, p) => {
  // Catch TMs (handles both TM01 and MT01 prefixes)
  const tmMatch = itemName.match(/M[Tt](\d+)/i);
  if (tmMatch) {
    const tmId = `TM${tmMatch[1]}`;
    const species = p.id;
    const compatList = TM_COMPAT[species] || [];
    if (!compatList.includes(tmId)) {
      return { success: false, message: 'Incompatible.' };
    }
    const tmData = GAME_TMS.find(t => t.id === tmId);
    if (!tmData) return { success: false, message: 'MT inválida.' };
    
    // Check if pokemon already knows the move
    if (p.moves.some(m => m.name === tmData.name)) {
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
function healHp(p, amount) {
  if (p.hp >= p.maxHp) return { success: false, message: 'HP ya está al máximo.' };
  if (p.hp <= 0) return { success: false, message: 'El Pokémon está debilitado.' };
  const prev = p.hp;
  p.hp = Math.min(p.maxHp, p.hp + amount);
  return { success: true, message: `restauró ${p.hp - prev} HP` };
}

function revive(p, amount) {
  if (p.hp > 0) return { success: false, message: 'El Pokémon no está debilitado.' };
  p.hp = amount;
  return { success: true, message: `revivió con ${p.hp} HP` };
}

function clearStatus(p, type) {
  if (p.status !== type && type !== 'any') return { success: false, message: 'No tiene ese estado.' };
  if (!p.status) return { success: false, message: 'No tiene problemas de estado.' };
  const old = p.status;
  p.status = null;
  if (old === 'sleep') p.sleepTurns = 0;
  return { success: true, message: `se curó del estado ${old}` };
}

function curaTotal(p) {
  if (!p.status && p.hp === p.maxHp) return { success: false, message: 'No tiene efecto.' };
  p.hp = p.maxHp;
  p.status = null;
  p.sleepTurns = 0;
  return { success: true, message: 'se curó completamente' };
}

function restorePP(p, amount) {
  let changed = false;
  p.moves.forEach(m => {
    const max = m.maxPP || 35; // Fallback
    if (m.pp < max) {
      m.pp = Math.min(max, m.pp + amount);
      changed = true;
    }
  });
  return changed 
    ? { success: true, message: 'recuperó PP' }
    : { success: false, message: 'Los PP ya están al máximo.' };
}

function handleStone(p, stoneName) {
  const nextId = checkStoneEvolution(p, stoneName);
  if (!nextId) return { success: false, message: 'No tiene efecto sobre este Pokémon.' };
  return { 
    success: true, 
    message: '¡Está evolucionando!', 
    resultType: 'evolution', 
    targetId: nextId 
  };
}
