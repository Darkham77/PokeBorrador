/**
 * src/composables/adventure/helpers/adventureSimulationConstants.ts
 * 
 * Shared constants and utility identifiers for adventure map simulations.
 */

import type { AdventureNodeId } from '../../../../test aventura/kantoGraph.ts'

export const CANVAS_W = 6400
export const CANVAS_H = 4400
export const CARD_W = 320
export const CARD_H = 220

export const GLOW_MARKER_BASE_SCALE = 1
export const GLOW_MARKER_BASE_OPACITY = 0.8
export const GLOW_MARKER_PULSE_SCALE = 2
export const GLOW_MARKER_PULSE_OPACITY = 0.1
export const GLOW_MARKER_PULSE_DURATION_SEC = 0.8

export const POKEMON_CENTER_NODES = [
  'route2',          // Ciudad Verde / Plateada
  'route4',          // Centro Mt. Moon
  'route5',          // Ciudad Celeste
  'route6',          // Ciudad Carmín
  'route7',          // Ciudad Azulona
  'pokemon_tower',   // Pueblo Lavanda
  'safari_zone',     // Ciudad Fucsia
  'mansion',         // Isla Canela
  'route10',         // Centro Túnel Roca
  'route23'          // Meseta Añil
] as const satisfies readonly AdventureNodeId[]

export type PokemonCenterNodeId = (typeof POKEMON_CENTER_NODES)[number]

export function isPokemonCenterNodeId(value: AdventureNodeId): value is PokemonCenterNodeId {
  return (POKEMON_CENTER_NODES as readonly AdventureNodeId[]).includes(value)
}

export const MO_LABELS: Record<string, string> = {
  surf: '🌊 Surf',
  cut: '✂️ Corte',
  strength: '💪 Fuerza',
  flash: '💡 Flash',
  rock_smash: '🪨 G.Roca',
  waterfall: '🌊 Cascada',
  fly: '🕊️ Vuelo',
}
