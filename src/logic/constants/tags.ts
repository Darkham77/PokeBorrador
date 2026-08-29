
import { getItemById, isItemId, type ItemId } from '@/data/inventory/items'
import type { Pokemon } from '@/types/pokemon/pokemon'

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
  itemId?: ItemId;
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
    label: 'GENÉTICA', 
    shortLabel: 'GEN',
    icon: '🧬', 
    color: '#FF4D4D', 
    desc: 'Marcado para breeding en la guardería o crianza selectiva.' 
  },
  competitive: { 
    id: 'competitive', 
    label: 'COMPETITIVO', // spanish-ok
    shortLabel: 'COMP',
    icon: '🏆', 
    color: '#34C759', 
    desc: 'Pokémon entrenado y listo para torneos y duelos de alto nivel.' 
  },
  trade: { 
    id: 'trade', 
    label: 'INTERCAMBIO', // spanish-ok
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
  },
  hatched: {
    id: 'hatched',
    label: 'CRÍA',
    shortLabel: 'CRÍA',
    icon: '🥚',
    color: '#FF9500',
    desc: 'Pokémon nacido de un huevo.'
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
  },
  mission: { 
    id: 'mission', 
    label: 'EN MISIÓN', 
    shortLabel: 'MIS',
    icon: '🧭', 
    color: '#38BDF8', 
    desc: 'Este Pokémon está participando en una misión activa.' 
  },
  event: { 
    id: 'event', 
    label: 'EN EVENTO', 
    shortLabel: 'EVE',
    icon: '🏆', 
    color: '#F59E0B', 
    desc: 'Este Pokémon está inscrito en un concurso o evento competitivo activo.' 
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

  // 1b. Automatic: Mission
  const missionBadge = POKEMON_BADGES['mission'];
  if (pokemon.onMission && missionBadge) {
    badges.push({ ...missionBadge, isAutomatic: true })
  }

  // 1c. Automatic: Event
  const eventBadge = POKEMON_BADGES['event'];
  if (pokemon.onEvent && eventBadge) {
    badges.push({ ...eventBadge, isAutomatic: true })
  }

  // 2. Automatic: IV 31 (Perfect)
  const ivs = pokemon.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
  const iv31Badge = TAG_DEFINITIONS['iv31'];
  if (Object.values(ivs).some(v => v === 31) && iv31Badge) {
    badges.push({ ...iv31Badge, isAutomatic: true })
  }

  // 2b. Automatic: Hatched
  const hatchedBadge = TAG_DEFINITIONS['hatched'];
  if (pokemon.obtainedMethod === 'egg' && hatchedBadge) {
    badges.push({ ...hatchedBadge, isAutomatic: true })
  }

  // 3. Automatic: Held Item
  const heldItem = pokemon.heldItem || pokemon.item || null
  const itemBadge = POKEMON_BADGES['item'];
  if (heldItem && isItemId(heldItem) && itemBadge) {
    const itemData = getItemById(heldItem);

    badges.push({ 
      ...itemBadge, 
      id: 'item',
      label: itemData.name.toUpperCase(), // text-ok
      shortLabel: itemBadge.shortLabel,
      desc: itemData.desc ?? itemBadge.desc ?? '',
      isAutomatic: true,
      itemId: heldItem
    })
  }

  // 4. Manual Tags (From pokemon.tags array)
  const tags = pokemon.tags
  if (tags && Array.isArray(tags)) {
    tags.forEach((tagId: string) => {
      // Avoid duplicating iv31 or hatched if already added automatically
      // Also ignore 'box' tag as it's being deprecated/replaced
      if (tagId === 'iv31' || tagId === 'hatched' || tagId === 'box') return 
      
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
    // We skip 'iv31', 'hatched', and any other automatic-only tags in the editor
    if (def.id === 'iv31' || def.id === 'hatched') return

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
    case 'hatched':
      return tags.includes('hatched') || pokemon.obtainedMethod === 'egg'
    case 'fav':
      return tags.includes('fav') || tags.includes('favorite')
    default:
      return tags.includes(tagId)
  }
}

/**
 * Standardized helper to check if a pokemon is currently busy (mission, event, daycare, defense).
 */
export function isPokemonBusy(pokemon: Partial<Pokemon> | null | undefined): boolean {
  return Boolean(pokemon && (pokemon.onMission || pokemon.onEvent || pokemon.inDaycare || pokemon.onDefense))
}
