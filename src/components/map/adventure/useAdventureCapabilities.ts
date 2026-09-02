import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { isItemId } from '@/data/inventory/items'
import { requirePokemonMoveId, type PokemonMoveId } from '@/data/battle/moves'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { MapNode } from './adventureMapData'

export interface NodePassResult {
  canPass: boolean
  blockReason?: string // domain-ok
}

export type MoCapabilityKey = 'CUT' | 'FLY' | 'SURF' | 'LEAGUE'

export const MO_BADGE_REQUIREMENTS: Record<MoCapabilityKey, number> = {
  CUT: 2,
  FLY: 3,
  SURF: 5,
  LEAGUE: 8
}

export const MO_MOVE_IDS: Record<Exclude<MoCapabilityKey, 'LEAGUE'>, PokemonMoveId> = {
  CUT: requirePokemonMoveId('cut'),
  FLY: requirePokemonMoveId('fly'),
  SURF: requirePokemonMoveId('surf')
}

export function useAdventureCapabilities() {
  const gameStore = useGameStore()

  const teamMoves = computed<Set<PokemonMoveId>>(() => {
    const moves = new Set<PokemonMoveId>()
    const team = gameStore.state.team || []
    for (const poke of team) {
      if (poke && Array.isArray(poke.moves)) {
        for (const m of poke.moves) {
          if (m && m.id) moves.add(m.id)
        }
      }
    }
    return moves
  })

  const badges = computed(() => gameStore.state.badges || 0)

  const hasCut = computed(() => {
    return teamMoves.value.has(MO_MOVE_IDS.CUT) && badges.value >= MO_BADGE_REQUIREMENTS.CUT
  })

  const hasFly = computed(() => {
    return teamMoves.value.has(MO_MOVE_IDS.FLY) && badges.value >= MO_BADGE_REQUIREMENTS.FLY
  })

  const hasSurf = computed(() => {
    return teamMoves.value.has(MO_MOVE_IDS.SURF) && badges.value >= MO_BADGE_REQUIREMENTS.SURF
  })

  const hasFlute = computed(() => {
    const inv = gameStore.state.inventory || {}
    const FLUTE_IDS = ['pokeflute', 'flute', 'poke_flute', 'flauta'] as const
    return FLUTE_IDS.some(id => isItemId(id) && Boolean(inv[id]))
  })

  const hasBicycle = computed(() => {
    const inv = gameStore.state.inventory || {}
    const BIKE_IDS = ['bicycle', 'bike', 'bicicleta'] as const
    return BIKE_IDS.some(id => isItemId(id) && Boolean(inv[id]))
  })

  const hasAllBadges = computed(() => {
    return badges.value >= MO_BADGE_REQUIREMENTS.LEAGUE
  })

  const followerPokemon = computed(() => {
    const team = gameStore.state.team || []
    return team[0] || null
  })

  const followerSpeciesId = computed<PokemonSpeciesId | null>(() => {
    return followerPokemon.value?.species || null
  })

  const playerCapabilitiesRecord = computed<Record<string, boolean>>(() => { // open-record
    return {
      'Corte': hasCut.value,
      'Surf': hasSurf.value,
      'Vuelo': hasFly.value,
      'Flauta': hasFlute.value,
      'Medallas': hasAllBadges.value,
      'Bicicleta': hasBicycle.value
    }
  })

  function checkNodePass(node: MapNode | undefined | null): NodePassResult {
    if (!node) return { canPass: false, blockReason: 'Nodo desconocido' }
    if (!node.requiresMO) return { canPass: true }

    const req = node.requiresMO
    const isUnlocked = playerCapabilitiesRecord.value[req] ?? false

    if (!isUnlocked) {
      let customReason = node.blockMsg
      if (!customReason) {
        if (req === 'Corte') customReason = 'Necesitas un Pokémon en tu equipo que sepa Corte y la Medalla Cascada.'
        else if (req === 'Surf') customReason = 'El agua es profunda. Necesitas un Pokémon con Surf y la Medalla Alma.'
        else if (req === 'Vuelo') customReason = 'Necesitas un Pokémon con Vuelo y la Medalla Trueno.'
        else if (req === 'Flauta') customReason = 'Un Pokémon dormido bloquea el camino. Necesitas una Flauta Pokémon.'
        else if (req === 'Medallas') customReason = '¡Alto ahí! Necesitas las 8 Medallas de Gimnasio para pasar a la Liga.'
        else customReason = `Requiere ${req} para continuar.`
      }
      return { canPass: false, blockReason: customReason }
    }

    return { canPass: true }
  }

  return {
    badges,
    hasCut,
    hasFly,
    hasSurf,
    hasFlute,
    hasBicycle,
    hasAllBadges,
    followerPokemon,
    followerSpeciesId,
    playerCapabilitiesRecord,
    checkNodePass
  }
}
