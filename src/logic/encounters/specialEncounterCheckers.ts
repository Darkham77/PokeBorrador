import type { MapRouteId } from '@/data/world/map-assets'
import { requireMapRouteId } from '@/data/world/map-assets'
import type { Encounter, EncounterState, EncounterOptions } from '@/types/pokemon/encounters'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { makePokemon } from '@/logic/pokemon/pokemonFactory'
import { getGuardianData } from '@/logic/war/guardianEngine'
import { GUARDIAN_ENCOUNTER_CHANCE_PERCENT } from '@/logic/constants/gameplay'
import { isDisputePhase } from '@/logic/war/warEngine'
import { GAME_RATIOS } from '@/data/system/constants'
import { getActivePinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { requireGymId, type GymId } from '@/data/world/gyms'

export interface ViteDebugEncounterConfig {
  forceEncounterType?: string
  forceRival?: boolean
  trainerChance50?: boolean
  forceGuardian80?: boolean
  trainerChancePct?: number | null
  rivalChancePct?: number | null
  guardianChancePct?: number | null
  defenderChancePct?: number | null
}

const DEBUG_GUARDIAN_CHANCE_PERCENT = 80.0
const DEFENDER_ENCOUNTER_CHANCE = 0.20
const ENTRENATOR_DOUBLE_RIVAL_CLASS_LEVEL = 20
const ENTRENADOR_RIVAL_CHANCE_MULTIPLIER = 2

const DEBUG_MOCK_MAGIKARP_STATS = { LEVEL: 5 }
const DEBUG_MOCK_KABUTO_STATS = { LEVEL: 10 }
const DEBUG_MOCK_PIDGEY_STATS = { LEVEL: 3 }

export function checkDebugForcedEncounter(debug?: ViteDebugEncounterConfig): Encounter | null {
  if (!debug) return null

  if (debug.forceEncounterType && debug.forceEncounterType !== 'none') {
    if (debug.forceEncounterType === 'fishing') {
      const p = makePokemon('magikarp', DEBUG_MOCK_MAGIKARP_STATS.LEVEL, { bypassWhitelist: true }) as Pokemon
      p.uid = 'magikarp-fishing-debug'
      return { type: 'fishing', pokemon: p }
    }
    if (debug.forceEncounterType === 'archaeology') {
      const p = makePokemon('kabuto', DEBUG_MOCK_KABUTO_STATS.LEVEL, { bypassWhitelist: true }) as Pokemon
      p.uid = 'kabuto-archaeology-1234' // no-magic
      return { type: 'archaeology', pokemon: p }
    }
    if (debug.forceEncounterType === 'trainer') {
      return { type: 'trainer' }
    }
    if (debug.forceEncounterType === 'rival') {
      return { type: 'rival' }
    }
    if (debug.forceEncounterType === 'wild') {
      const p = makePokemon('pidgey', DEBUG_MOCK_PIDGEY_STATS.LEVEL, { bypassWhitelist: true }) as Pokemon
      p.uid = 'pidgey-wild-1234' // no-magic
      return { type: 'wild', pokemon: p }
    }
  }

  if (debug.forceRival || debug.rivalChancePct === 100) {
    return { type: 'rival' }
  }

  return null
}

export function checkRivalSpecialEncounter(
  debug: ViteDebugEncounterConfig | undefined,
  state: EncounterState,
  options: EncounterOptions
): Encounter | null {
  if (options.forceEncounter) return null

  let rivalChance = GAME_RATIOS.encounters.rival
  const hasRivalRateOverride = debug?.rivalChancePct !== undefined && debug?.rivalChancePct !== null
  if (hasRivalRateOverride) {
    rivalChance = debug!.rivalChancePct! / 100
  } else {
    const eventRivalBonus = options.eventRivalBonus || 1
    rivalChance *= eventRivalBonus

    if (state.playerClass === 'entrenador' && (state.classLevel || 1) >= ENTRENATOR_DOUBLE_RIVAL_CLASS_LEVEL) {
      const gymIds = (['pewter', 'cerulean', 'vermilion', 'celadon', 'fuchsia', 'saffron', 'cinnabar', 'viridian'] as const satisfies readonly GymId[]).map(requireGymId)
      const allGymsHard = gymIds.every(id => state.gymProgress?.[id]?.hard === true)
      if (allGymsHard) {
        rivalChance *= ENTRENADOR_RIVAL_CHANCE_MULTIPLIER
      }
    }
  }

  if (Math.random() < rivalChance) {
    return { type: 'rival' }
  }

  return null
}

export function checkDefenderSpecialEncounter(
  debug: ViteDebugEncounterConfig | undefined,
  locId: MapRouteId,
  state: EncounterState,
  options: EncounterOptions
): Encounter | null {
  if (isDisputePhase() || options.forceEncounter) return null

  const hasDefenderOverride = debug?.defenderChancePct !== undefined && debug?.defenderChancePct !== null
  const defenderChance = hasDefenderOverride ? (debug!.defenderChancePct! / 100) : DEFENDER_ENCOUNTER_CHANCE
  if (Math.random() < defenderChance && state.faction) {
    const dominance = (options.dominanceData || {})[requireMapRouteId(locId)]
    const winner = dominance?.winner || null
    if (winner && winner !== state.faction) {
      return { type: 'defender', faction: winner }
    }
  }

  return null
}

export function checkGuardianSpecialEncounter(
  debug: ViteDebugEncounterConfig | undefined,
  locId: MapRouteId,
  state: EncounterState,
  options: EncounterOptions,
  allMapIds: MapRouteId[]
): Encounter | null {
  if (options.forceEncounter) return null

  const guardian = getGuardianData(locId, allMapIds)
  if (!guardian) return null

  const hasGuardianOverride = debug?.guardianChancePct !== undefined && debug?.guardianChancePct !== null
  const guardianOverrideChance = hasGuardianOverride ? (debug!.guardianChancePct! / 100) : (debug?.forceGuardian80 ? (DEBUG_GUARDIAN_CHANCE_PERCENT / 100) : null)

  const dailyCaptures = state.dailyGuardianCaptures || (getActivePinia() ? useGameStore().dailyGuardianCaptures : [])
  const capturedToday = (dailyCaptures || []).includes(locId)

  if (capturedToday) return null

  const effectiveChance = guardianOverrideChance !== null ? guardianOverrideChance : GUARDIAN_ENCOUNTER_CHANCE_PERCENT
  if (Math.random() < effectiveChance) {
    return {
      type: 'guardian',
      pokemon: makePokemon(guardian.id, guardian.lv, { shinyMultiplier: options.shinyMultiplier }) as Pokemon,
      pts: guardian.pts
    }
  }

  return null
}
