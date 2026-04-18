import { checkStoneEvolution } from '../evolutionLogic';

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
  'Recordador de Movimientos': (p) => {
    // This item is special as it opens a menu
    return { success: true, message: 'abriendo menú de movimientos', resultType: 'relearner', deferred: true };
  },
  'Parche de naturaleza': (p, options = {}) => {
    // This is semi-deferred in legacy, but we can treat it as instant if RNG handled externally
    return { success: true, message: 'iniciando cambio de naturaleza', deferred: true };
  }
};

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
