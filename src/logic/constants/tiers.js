/**
 * Configuration for Pokemon IV Tiers (S+ to F)
 * Used in Box and Display Cards to visualize genetic potential.
 */
export const BOX_TIER_CONFIG = {
  'S+': { min: 186, max: 186, color: '#FFD700', bg: 'rgba(255,215,0,0.25)', label: 'S+' },
  'S': { min: 168, max: 185, color: '#FFB800', bg: 'rgba(255,184,0,0.18)', label: 'S' },
  'A': { min: 140, max: 167, color: '#6BCB77', bg: 'rgba(107,203,119,0.18)', label: 'A' },
  'B': { min: 112, max: 139, color: '#3B8BFF', bg: 'rgba(59,139,255,0.18)', label: 'B' },
  'C': { min: 84, max: 111, color: '#C77DFF', bg: 'rgba(199,125,255,0.18)', label: 'C' },
  'D': { min: 56, max: 83, color: '#FF9632', bg: 'rgba(255,150,50,0.18)', label: 'D' },
  'F': { min: 0, max: 55, color: '#FF3B3B', bg: 'rgba(255,59,59,0.18)', label: 'F' },
}

/**
 * Calculates the tier of a pokemon based on its IVs
 * @param {Object} pokemon 
 * @returns {Object} Tier info including color, bg, and label
 */
export function getPokemonTier(pokemon) {
  const ivs = pokemon.ivs || {}
  const total = (ivs.hp || 0) + (ivs.atk || 0) + (ivs.def || 0) + 
                (ivs.spa || 0) + (ivs.spd || 0) + (ivs.spe || 0)
  
  for (const [tier, cfg] of Object.entries(BOX_TIER_CONFIG)) {
    if (total >= cfg.min && total <= cfg.max) return { tier, total, ...cfg }
  }
  return { tier: 'F', total, ...BOX_TIER_CONFIG['F'] }
}
