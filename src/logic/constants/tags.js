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
  heldItem: { 
    id: 'heldItem', 
    label: 'OBJETO EQUIPADO', 
    shortLabel: 'ITEM',
    icon: '🎒', 
    color: '#32D74B', 
    desc: 'Este Pokémon lleva un objeto que puede tener efectos en combate.' 
  }
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
