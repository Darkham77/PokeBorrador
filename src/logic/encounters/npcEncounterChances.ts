import type { MapRouteId } from '@/data/world/map-assets'
import type { EncounterState, EncounterOptions } from '@/types/pokemon/encounters'
import { GAME_RATIOS } from '@/data/system/constants'
import { isDisputePhase } from '@/logic/war/warEngine'
import { getGuardianData } from '@/logic/war/guardianEngine'
import { GUARDIAN_ENCOUNTER_CHANCE_PERCENT, CRIMINALITY_DENOMINATOR_FACTOR } from '@/logic/constants/gameplay'
import { getActivePinia } from 'pinia'
import { useGameStore } from '@/stores/game'
import { GYM_IDS } from '@/data/world/gyms'

const DEBUG_TRAINER_CHANCE_PERCENT = 50.0
const CLASS_LEVEL_RIVAL_BOOST_MIN_LEVEL = 20
const FACTION_DEFENDER_ENCOUNTER_PCT = 20.0
const DEBUG_FORCED_GUARDIAN_PCT = 80.0
const ROCKET_MAX_CRIMINALITY = 100

export interface NpcChanceInfo {
  name: string
  chance: number
  type: string
  active: boolean
  details?: string
}

interface DebugEncounterOverrides {
  rivalChancePct?: number | null
  forceRival?: boolean
  defenderChancePct?: number | null
  guardianChancePct?: number | null
  forceGuardian80?: boolean
  trainerChancePct?: number | null
  trainerChance50?: boolean
}

function calculateRivalEncounterChance(
  state: EncounterState,
  options: EncounterOptions,
  debug?: DebugEncounterOverrides
): NpcChanceInfo {
  let rivalChance = GAME_RATIOS.encounters.rival
  const eventRivalBonus = options.eventRivalBonus || 1
  rivalChance *= eventRivalBonus

  if (state.playerClass === 'entrenador' && (state.classLevel || 1) >= CLASS_LEVEL_RIVAL_BOOST_MIN_LEVEL) {
    const allGymsHard = GYM_IDS.every(id => state.gymProgress?.[id]?.hard === true)
    if (allGymsHard) {
      rivalChance *= 2
    }
  }

  const hasRivalOverride = debug?.rivalChancePct !== undefined && debug?.rivalChancePct !== null ? true : !!debug?.forceRival
  const finalRivalChance = debug?.rivalChancePct !== undefined && debug?.rivalChancePct !== null
    ? debug.rivalChancePct / 100
    : (debug?.forceRival ? 1.0 : rivalChance)

  return {
    name: 'Rival',
    chance: finalRivalChance * 100,
    type: 'rival',
    active: true,
    details: hasRivalOverride ? 'Forzado por Debug' : undefined
  }
}

function calculateDefenderEncounterChance(
  locId: MapRouteId,
  state: EncounterState,
  options: EncounterOptions,
  debug?: DebugEncounterOverrides
): NpcChanceInfo {
  let hasDefender = false
  if (!isDisputePhase() && state.faction) {
    const dominance = (options.dominanceData || {})[locId]
    const winner = dominance?.winner || null
    if (winner && winner !== state.faction) {
      hasDefender = true
    }
  }
  const hasDefenderOverride = debug?.defenderChancePct !== undefined && debug?.defenderChancePct !== null
  const finalDefenderChance = hasDefenderOverride ? debug!.defenderChancePct! : (hasDefender ? FACTION_DEFENDER_ENCOUNTER_PCT : 0.0)

  return {
    name: 'Defensor de Facción',
    chance: finalDefenderChance,
    type: 'defender',
    active: hasDefender || hasDefenderOverride,
    details: hasDefenderOverride ? 'Forzado por Debug' : undefined
  }
}

function calculateGuardianEncounterChance(
  locId: MapRouteId,
  state: EncounterState,
  allMapIds: readonly MapRouteId[],
  debug?: DebugEncounterOverrides
): NpcChanceInfo {
  const guardian = getGuardianData(locId, allMapIds)
  let hasGuardian = false
  if (guardian) {
    const dailyCaptures = state.dailyGuardianCaptures || (getActivePinia() ? useGameStore().dailyGuardianCaptures : [])
    const capturedToday = (dailyCaptures || []).includes(locId)
    if (!capturedToday) {
      hasGuardian = true
    }
  }
  const hasGuardianOverride = debug?.guardianChancePct !== undefined && debug?.guardianChancePct !== null ? true : (hasGuardian && !!debug?.forceGuardian80)
  const finalGuardianChance = debug?.guardianChancePct !== undefined && debug?.guardianChancePct !== null
    ? debug.guardianChancePct
    : (debug?.forceGuardian80 ? DEBUG_FORCED_GUARDIAN_PCT : (hasGuardian ? GUARDIAN_ENCOUNTER_CHANCE_PERCENT * 100 : 0.0))

  return {
    name: 'Guardián (Alfa)',
    chance: finalGuardianChance,
    type: 'guardian',
    active: hasGuardian || hasGuardianOverride,
    details: hasGuardianOverride ? 'Forzado por Debug' : undefined
  }
}

function calculateTrainerOrPoliceEncounterChance(
  state: EncounterState,
  options: EncounterOptions,
  debug?: DebugEncounterOverrides
): NpcChanceInfo {
  const repelActive = (state.repelSecs || 0) > 0
  const trainerBonus = options.eventTrainerBonus || 1
  const criminality = state.classData?.criminality || 0
  const isRocketMaxCrim = state.playerClass === 'rocket' && criminality >= ROCKET_MAX_CRIMINALITY

  const hasTrainerOverride = debug?.trainerChancePct !== undefined && debug?.trainerChancePct !== null ? true : !!debug?.trainerChance50
  let baseTrainerChance = 0
  if (debug?.trainerChancePct !== undefined && debug?.trainerChancePct !== null) {
    baseTrainerChance = debug.trainerChancePct
  } else if (repelActive) {
    baseTrainerChance = GAME_RATIOS.encounters.trainerRepel * 100
  } else if (debug?.trainerChance50) {
    baseTrainerChance = DEBUG_TRAINER_CHANCE_PERCENT
  } else {
    baseTrainerChance = isRocketMaxCrim
      ? (criminality / CRIMINALITY_DENOMINATOR_FACTOR) * trainerBonus
      : Math.min(state.trainerChance || GAME_RATIOS.encounters.trainerBase, GAME_RATIOS.encounters.trainerMax) * trainerBonus
  }

  if (isRocketMaxCrim) {
    return {
      name: 'Oficial de Policía',
      chance: baseTrainerChance,
      type: 'police',
      active: true,
      details: hasTrainerOverride ? 'Forzado por Debug' : (repelActive ? 'Repelente' : `Crim: ${criminality}`) // spanish-ok: UI Spanish text localization label
    }
  }

  return {
    name: 'Entrenador Común',
    chance: baseTrainerChance,
    type: 'trainer',
    active: true,
    details: hasTrainerOverride ? 'Forzado por Debug' : (repelActive ? 'Repelente' : undefined) // spanish-ok: UI Spanish text localization label
  }
}

export function getNpcEncounterChances(
  locId: MapRouteId,
  state: EncounterState,
  options: EncounterOptions = {},
  allMapIds: readonly MapRouteId[]
): NpcChanceInfo[] {
  const win = typeof window !== 'undefined' ? window as Window & { __VITE_DEBUG__?: DebugEncounterOverrides } : undefined
  const debug = win?.__VITE_DEBUG__

  return [
    calculateRivalEncounterChance(state, options, debug),
    calculateDefenderEncounterChance(locId, state, options, debug),
    calculateGuardianEncounterChance(locId, state, allMapIds, debug),
    calculateTrainerOrPoliceEncounterChance(state, options, debug)
  ]
}
