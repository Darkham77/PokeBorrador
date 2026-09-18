import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import { isPokemonLocked } from '@/logic/pokemon/pokemonUtils'

import type { ItemId } from '@/data/inventory/items'

export interface ShowdownMoveRequest {
  id: string
  disabled?: boolean
}

export interface ShowdownActiveRequest {
  moves?: ShowdownMoveRequest[]
}

export interface ShowdownPlayerRequest {
  active?: ShowdownActiveRequest[]
}

const CHOICE_ITEM_IDS = ['choiceband', 'choicespecs', 'choicescarf'] as const satisfies readonly ItemId[]
const CHOICE_ITEMS: ReadonlySet<string> = new Set(CHOICE_ITEM_IDS)
const COLOR_HEX_SHORT_LENGTH = 3 as const
const HEX_BYTE_SLICE_TWO = 2 as const
const HEX_BYTE_SLICE_FOUR = 4 as const
const HEX_BYTE_SLICE_SIX = 6 as const
const DEFAULT_WHITE_RGB = '255, 255, 255' as const
const HEX_RADIX = 16 as const

function isChoiceLocked(pokemon: Pokemon | null, move: Move): boolean {
  if (!pokemon?.heldItem || !CHOICE_ITEMS.has(pokemon.heldItem.toLowerCase())) {
    return false
  }
  if (!pokemon.choiceMove) return false

  const choiceLower = pokemon.choiceMove.toLowerCase()
  const moveNameLower = (move.name || '').toLowerCase()
  const moveIdLower = (move.id || '').toLowerCase()
  return moveNameLower !== choiceLower && moveIdLower !== choiceLower
}

export function isBattleMoveDisabled(
  move: Move | null,
  isProcessing: boolean,
  playerInfo: Pokemon | null,
  playerRequest: ShowdownPlayerRequest | undefined
): boolean {
  if (isProcessing) return true
  if (!move) return true
  if (move.disabled === true) return true

  // 1. Prioridad Absoluta: Consultar el request de Showdown
  if (playerRequest && playerRequest.active?.[0]?.moves) {
    const reqMoves = playerRequest.active[0].moves
    if (reqMoves.length > 0) {
      const reqMove = reqMoves.find((rm: ShowdownMoveRequest) => rm.id === move.id)
      if (reqMove) {
        return Boolean(reqMove.disabled)
      }
      return true
    }
  }

  // 2. Si el Pokémon está en estado bloqueado (lockedmove, twoturnmove, thrash)
  if (isPokemonLocked(playerInfo) && playerInfo?.lastMove) {
    if (move.id !== playerInfo.lastMove.id) {
      return true
    }
  }

  // 3. Validación de Choice Items (Choice Band, Specs, Scarf)
  if (isChoiceLocked(playerInfo, move)) {
    return true
  }

  // 4. PP agotados
  if (move.id !== 'struggle' && move.pp <= 0) {
    return true
  }

  return false
}

export function resolveWeatherAuraClass(
  hasMove: boolean,
  hasMoveModifier: boolean,
  weather: { turns?: number; visual?: string; type?: string } | null | undefined
): string | null {
  if (!hasMove || !hasMoveModifier || !weather || weather.turns === 0) return null
  const wType = (weather.visual || weather.type || '').toLowerCase()

  if (wType.includes('rain') || wType.includes('storm') || wType.includes('lluvia')) {
    return 'weather-rain'
  }
  if (wType.includes('sun') || wType.includes('heatwave') || wType.includes('sol')) {
    return 'weather-sun'
  }
  if (wType.includes('thunder') || wType.includes('tormenta')) {
    return 'weather-thunderstorm'
  }
  if (wType.includes('hail') || wType.includes('snow') || wType.includes('granizo') || wType.includes('nieve')) {
    return 'weather-hail-snow'
  }
  if (wType.includes('fog') || wType.includes('mist') || wType.includes('niebla') || wType.includes('neblina')) {
    return 'weather-fog'
  }
  return null
}

export function formatMoveName(name: string): string {
  return name.toUpperCase()
    .replace(/Ñ/g, 'ñ')
    .replace(/Á/g, 'á')
    .replace(/É/g, 'é')
    .replace(/Í/g, 'í')
    .replace(/Ó/g, 'ó')
    .replace(/Ú/g, 'ú')
}

export function hexToRgbString(hex: string | null | undefined): string {
  if (!hex) return DEFAULT_WHITE_RGB
  let h = hex.replace('#', '')
  if (h.length === COLOR_HEX_SHORT_LENGTH) {
    h = h.split('').map((c: string) => c + c).join('')
  }
  const r = parseInt(h.slice(0, HEX_BYTE_SLICE_TWO), HEX_RADIX)
  const g = parseInt(h.slice(HEX_BYTE_SLICE_TWO, HEX_BYTE_SLICE_FOUR), HEX_RADIX)
  const b = parseInt(h.slice(HEX_BYTE_SLICE_FOUR, HEX_BYTE_SLICE_SIX), HEX_RADIX)
  return `${r}, ${g}, ${b}`
}
