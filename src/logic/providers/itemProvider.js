import { SHOP_ITEMS } from '@/data/items';

/**
 * Proveedor Central de Lógica de Objetos
 * Migrado de public/js/11_battle_ui.js
 */

export const ITEM_EFFECTS = {
  // ── Pociones ─────────────────────────────────────────────────────────────
  'Poción': (p) => {
    if (p.hp >= p.maxHp) return null;
    const prev = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + 20);
    return `restauró ${p.hp - prev} HP`;
  },
  'Super Poción': (p) => {
    if (p.hp >= p.maxHp) return null;
    const prev = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + 50);
    return `restauró ${p.hp - prev} HP`;
  },
  'Hiper Poción': (p) => {
    if (p.hp >= p.maxHp) return null;
    const prev = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + 200);
    return `restauró ${p.hp - prev} HP`;
  },
  'Poción Máxima': (p) => {
    if (p.hp >= p.maxHp) return null;
    p.hp = p.maxHp;
    return `restauró todo el HP`;
  },
  'Restaurar Todo': (p) => {
    if (p.hp >= p.maxHp && !p.status) return null;
    p.hp = p.maxHp;
    p.status = null;
    return `restauró salud y estados`;
  },

  // ── Revivir ──────────────────────────────────────────────────────────────
  'Revivir': (p) => {
    if (p.hp > 0) return null;
    p.hp = Math.floor(p.maxHp / 2);
    return `revivió con mitad de HP`;
  },
  'Revivir Máximo': (p) => {
    if (p.hp > 0) return null;
    p.hp = p.maxHp;
    return `revivió con HP máximo`;
  },

  // ── Estados ──────────────────────────────────────────────────────────────
  'Antídoto': (p) => {
    if (p.status !== 'poison') return null;
    p.status = null;
    return `fue curado del veneno`;
  },
  'Cura Quemadura': (p) => {
    if (p.status !== 'burn') return null;
    p.status = null;
    return `fue curado de quemaduras`;
  },
  'Despertar': (p) => {
    if (p.status !== 'sleep') return null;
    p.status = null;
    return `se despertó`;
  },
  'Cura Total': (p) => {
    if (!p.status) return null;
    p.status = null;
    return `fue curado de todos sus estados`;
  },

  // ── PP ───────────────────────────────────────────────────────────────────
  'Éter': (p) => {
    let recovered = false;
    p.moves.forEach(m => {
      const max = m.maxPP || 35;
      if (m.pp < max) {
        m.pp = Math.min(max, m.pp + 10);
        recovered = true;
      }
    });
    return recovered ? `recuperó PP` : null;
  },
  'Elixir Máximo': (p) => {
    p.moves.forEach(m => {
      m.pp = m.maxPP || 35;
    });
    return `recuperó todos los PP`;
  },

  // ── Especiales ───────────────────────────────────────────────────────────
  'Caramelo Raro': (p) => {
    if (p.level >= 100) return null;
    // La lógica de subida de nivel real se maneja en el store, 
    // aquí solo validamos y devolvemos el mensaje
    return `subió de nivel`;
  },

  // ── Boosters Globales (Reciben state) ───────────────────────────────────
  'Repelente': (s) => {
    s.repelSecs = (s.repelSecs || 0) + 600;
    return 'activó Repelente (10m)';
  },
  'Superrepelente': (s) => {
    s.repelSecs = (s.repelSecs || 0) + 1200;
    return 'activó Superrepelente (20m)';
  },
  'Máximo Repelente': (s) => {
    s.repelSecs = (s.repelSecs || 0) + 1800;
    return 'activó Máximo Repelente (30m)';
  },
  'Huevo Suerte Pequeño': (s) => {
    s.luckyEggSecs = (s.luckyEggSecs || 0) + 1800;
    return 'activó Huevo Suerte (30m)';
  }
};

/**
 * Intenta usar un objeto sobre un Pokémon.
 * @returns {string|null} Resultado del uso o null si no tuvo efecto.
 */
export function useItemOnPokemon(itemName, pokemon) {
  const effectFn = ITEM_EFFECTS[itemName];
  if (!effectFn) return null;
  
  return effectFn(pokemon);
}

/**
 * Verifica si un objeto es de uso global (ej: Repelente).
 */
export function isGlobalItem(itemName) {
  const globalItems = [
    'Repelente', 'Superrepelente', 'Máximo Repelente',
    'Huevo Suerte Pequeño', 'Ticket Shiny', 'Moneda Amuleto'
  ];
  return globalItems.includes(itemName);
}
