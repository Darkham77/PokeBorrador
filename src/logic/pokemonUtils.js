/**
 * Configuración de Tiers basada en la suma total de IVs.
 * Usada para visualización en Box, Pokedex y Equipo.
 */
export const BOX_TIER_CONFIG = {
  'S+': { min: 186, max: 186, color: '#FFD700', bg: 'rgba(255,215,0,0.18)', label: 'S+' },
  'S': { min: 168, max: 185, color: '#FFB800', bg: 'rgba(255,184,0,0.14)', label: 'S' },
  'A': { min: 140, max: 167, color: '#6BCB77', bg: 'rgba(107,203,119,0.14)', label: 'A' },
  'B': { min: 112, max: 139, color: '#3B8BFF', bg: 'rgba(59,139,255,0.14)', label: 'B' },
  'C': { min: 84, max: 111, color: '#C77DFF', bg: 'rgba(199,125,255,0.14)', label: 'C' },
  'D': { min: 56, max: 83, color: '#FF9632', bg: 'rgba(255,150,50,0.14)', label: 'D' },
  'F': { min: 0, max: 55, color: '#FF3B3B', bg: 'rgba(255,59,59,0.14)', label: 'F' },
}

/**
 * Calcula el Tier de un Pokémon basado en sus IVs.
 * @param {Object} p - Objeto Pokémon
 * @returns {Object} Información del Tier (tier, total, color, bg, label)
 */
export const getPokemonTier = (p) => {
  if (!p) return { tier: 'F', total: 0, ...BOX_TIER_CONFIG['F'] }
  const ivs = p.ivs || {}
  const total = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)
  
  for (const [tier, cfg] of Object.entries(BOX_TIER_CONFIG)) {
    if (total >= cfg.min && total <= cfg.max) return { tier, total, ...cfg }
  }
  
  return { tier: 'F', total, ...BOX_TIER_CONFIG['F'] }
}

/**
 * Genera la URL del sprite usando el sistema de PokeAPI o el motor legacy.
 */
export const getSpriteUrl = (id, isShiny) => {
  if (typeof window !== 'undefined' && typeof window.getSpriteUrl === 'function') {
    return window.getSpriteUrl(id, isShiny)
  }
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon${isShiny ? '/shiny' : ''}/${id}.png`
}
