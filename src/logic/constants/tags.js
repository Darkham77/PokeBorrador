/**
 * TAG_DEFINITIONS - The Single Source of Truth for all Pokemon classification tags.
 */
export const TAG_DEFINITIONS = {
  fav: { 
    id: 'fav', 
    label: 'FAVORITO', 
    shortLabel: 'FAV',
    icon: '⭐', 
    color: '#FFD93D', 
    desc: 'Pokémon marcado como favorito para evitar liberaciones accidentales.' 
  },
  breed: { 
    id: 'breed', 
    label: 'CRIANZA', 
    shortLabel: 'CRIA',
    icon: '❤️', 
    color: '#FF4D4D', 
    desc: 'Marcado para breeding en la guardería o crianza selectiva.' 
  },
  competitive: { 
    id: 'competitive', 
    label: 'COMPETITIVO', 
    shortLabel: 'COMP',
    icon: '🏆', 
    color: '#34C759', 
    desc: 'Pokémon entrenado y listo para torneos y duelos de alto nivel.' 
  },
  box: { 
    id: 'box', 
    label: 'CAJA', 
    shortLabel: 'CAJA',
    icon: '📦', 
    color: '#007AFF', 
    desc: 'Marcado para almacenamiento a largo plazo en el PC.' 
  },
  trade: { 
    id: 'trade', 
    label: 'INTERCAMBIO', 
    shortLabel: 'TRADE',
    icon: '🔄', 
    color: '#AF52DE', 
    desc: 'Disponible para intercambio con otros entrenadores.' 
  },
  iv31: { 
    id: 'iv31', 
    label: 'IV PERFECTO', 
    shortLabel: 'IV',
    icon: '31', 
    color: '#FFD93D', 
    desc: 'Tiene al menos una estadística con potencial individual máximo (31).' 
  }
}

// Export as array for v-for compatibility
export const POKEMON_TAGS = Object.values(TAG_DEFINITIONS)

/**
 * POKEMON_BADGES - Metadata for non-tag indicators (Shiny, Held Items, etc.)
 */
export const POKEMON_BADGES = {
  shiny: { 
    id: 'shiny', 
    label: 'VARIOPINTO', 
    shortLabel: 'SHY',
    icon: '✨', 
    color: '#FFD93D', 
    desc: 'Este Pokémon tiene una coloración especial extremadamente rara.' 
  },
  item: { 
    id: 'item', 
    label: 'OBJETO EQUIPADO', 
    shortLabel: 'ITEM',
    icon: '🎒', 
    color: '#32D74B', 
    desc: 'Este Pokémon lleva un objeto que puede tener efectos en combate.' 
  }
}

/**
 * Returns a unified array of all visual indicators for a pokemon.
 * This is the SINGLE SOURCE OF TRUTH for badge rendering.
 * @param {Object} pokemon 
 * @returns {Array} Array of badge/tag objects
 */
export function getPokemonVisualBadges(pokemon) {
  if (!pokemon) return []
  const badges = []

  // 1. Automatic: Shiny
  if (pokemon.isShiny) {
    badges.push({ ...POKEMON_BADGES.shiny, isAutomatic: true })
  }

  // 2. Automatic: IV 31 (Perfect)
  const ivs = pokemon.ivs || {}
  if (Object.values(ivs).some(v => v === 31)) {
    badges.push({ ...TAG_DEFINITIONS.iv31, isAutomatic: true })
  }

  // 3. Automatic: Held Item
  if (pokemon.heldItem || (pokemon.item && pokemon.item !== 'none')) {
    badges.push({ ...POKEMON_BADGES.item, isAutomatic: true })
  }

  // 4. Manual Tags (From pokemon.tags array)
  if (pokemon.tags && Array.isArray(pokemon.tags)) {
    pokemon.tags.forEach(tagId => {
      // Avoid duplicating iv31 if already added automatically
      if (tagId === 'iv31') return 
      
      const def = TAG_DEFINITIONS[tagId]
      if (def) badges.push({ ...def, isAutomatic: false })
    })
  }

  return badges
}

/**
 * Returns all manual tags with an 'isActive' flag.
 * Used for the tag editor/detail view.
 */
export function getPokemonEditorBadges(pokemon) {
  const pokemonTags = pokemon?.tags || []
  const badges = []

  // ONLY add manual definitions for the editor
  Object.values(TAG_DEFINITIONS).forEach(def => {
    // We skip 'iv31' and any other automatic-only tags in the editor
    if (def.id === 'iv31') return

    badges.push({
      ...def,
      desc: def.desc, // Explicitly pass description
      label: def.label,
      isActive: pokemonTags.includes(def.id),
      isLocked: false
    })
  })

  return badges
}

/**
 * Standardized helper to check if a pokemon possesses a specific tag.
 */
export const hasPokemonTag = (pokemon, tagId) => {
  if (!pokemon) return false
  const tags = pokemon.tags || []
  
  switch (tagId) {
    case 'comp':
    case 'competitive':
      return tags.includes('comp') || tags.includes('competitive')
    case 'iv31':
      return tags.includes('iv31') || Object.values(pokemon.ivs || {}).some(v => v === 31)
    case 'fav':
      return tags.includes('fav') || tags.includes('favorite')
    default:
      return tags.includes(tagId)
  }
}
