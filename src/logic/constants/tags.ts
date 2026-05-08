
import { getItemByName, getItemById } from '@/data/items'
import type { Pokemon } from '@/types/pokemon'

/**
 * TAG_DEFINITIONS - The Single Source of Truth for all Pokemon classification tags.
 */
export interface TagDefinition {
  id: string;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  desc: string;
  isAutomatic?: boolean;
  isActive?: boolean;
  isLocked?: boolean;
  itemId?: string;
}

export const TAG_DEFINITIONS: Record<string, TagDefinition> = {
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
export const POKEMON_BADGES: Record<string, TagDefinition> = {
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
export function getPokemonVisualBadges(pokemon: Partial<Pokemon> | null): TagDefinition[] {
  if (!pokemon) return []
  const badges: TagDefinition[] = []

  // 1. Automatic: Shiny
  const shinyBadge = POKEMON_BADGES['shiny'];
  if (pokemon.isShiny && shinyBadge) {
    badges.push({ ...shinyBadge, isAutomatic: true })
  }

  // 2. Automatic: IV 31 (Perfect)
  const ivs = pokemon.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  const iv31Badge = TAG_DEFINITIONS['iv31'];
  if (Object.values(ivs).some(v => v === 31) && iv31Badge) {
    badges.push({ ...iv31Badge, isAutomatic: true })
  }

  // 3. Automatic: Held Item
  const heldItemRaw = pokemon.heldItem || (pokemon.item && pokemon.item !== 'none' ? pokemon.item : null)
  const itemBadge = POKEMON_BADGES['item'];
  if (heldItemRaw && itemBadge) {
    // Normalizar para búsqueda: "Rare Candy" -> "rare_candy" o "Caramelo Raro" -> "Caramelo Raro"
    const normalizedId = String(heldItemRaw).toLowerCase().replace(/ /g, '_')
    const itemData = getItemById(heldItemRaw) || 
                    getItemById(normalizedId) || 
                    getItemByName(heldItemRaw) ||
                    getItemByName(heldItemRaw.charAt(0).toUpperCase() + heldItemRaw.slice(1).toLowerCase())

    badges.push({ 
      ...itemBadge, 
      id: 'item',
      label: itemData ? itemData.name.toUpperCase() : String(heldItemRaw).toUpperCase(),
      shortLabel: itemBadge.shortLabel,
      desc: itemData ? itemData.desc : itemBadge.desc,
      isAutomatic: true,
      itemId: itemData ? itemData.id : normalizedId
    })
  }

  // 4. Manual Tags (From pokemon.tags array)
  const tags = pokemon.tags
  if (tags && Array.isArray(tags)) {
    tags.forEach((tagId: string) => {
      // Avoid duplicating iv31 if already added automatically
      // Also ignore 'box' tag as it's being deprecated/replaced
      if (tagId === 'iv31' || tagId === 'box') return 
      
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
export function getPokemonEditorBadges(pokemon: Partial<Pokemon> | null): TagDefinition[] {
  const pokemonTags = pokemon?.tags || []
  const badges: TagDefinition[] = []

  // ONLY add manual definitions for the editor
  Object.values(TAG_DEFINITIONS).forEach(def => {
    // We skip 'iv31' and any other automatic-only tags in the editor
    if (def.id === 'iv31') return

    badges.push({
      ...def,
      isActive: pokemonTags.includes(def.id),
      isLocked: false
    })
  })

  return badges
}

/**
 * Standardized helper to check if a pokemon possesses a specific tag.
 */
export const hasPokemonTag = (pokemon: Partial<Pokemon> | null, tagId: string): boolean => {
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
