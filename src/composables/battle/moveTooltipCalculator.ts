import { getEffectiveStatPure, type PurePokemon } from '@/logic/battle/battleMath'
import type { SmogonTooltipResult } from '@/logic/battle/smogonAdapter'
import type { DayPhase } from '@/logic/utils/timeUtils'

export interface TooltipStatDisplay {
  name: string
  base: number
  final: number
  stage: number
  class: string
}

/** Format @smogon/calc KO chance as Spanish text for the tooltip badge. */
export function buildKoText(ko: { chance: number | undefined; n: number }): string {
  if (!ko.n) return ''
  const { chance, n } = ko
  const koLabel = n === 1 ? 'OHKO' : n <= 4 ? `${n}HKO` : `KO en ${n} turnos`
  if (chance === 1) return `${koLabel} garantizado`
  if (chance === undefined || chance > 0) {
    const pct = chance !== undefined ? ` (${Math.round(chance * 100)}%)` : ''
    return `${koLabel} posible${pct}`
  }
  return ''
}

export function calculateAttackerStatDisplay(
  attacker: PurePokemon,
  defender: PurePokemon | null,
  isPhysical: boolean,
  isSpecial: boolean,
  playerStages: { atk?: number; spa?: number },
  weather: { type: string; turns: number } | null,
  cycle: DayPhase | undefined,
  isGym: boolean
): TooltipStatDisplay | null {
  if (!isPhysical && !isSpecial) return null
  const statKey = isPhysical ? 'atk' : 'spa'
  const stage = isPhysical ? (playerStages.atk || 0) : (playerStages.spa || 0)
  const rawVal = attacker[statKey] || 0
  const finalVal = defender
    ? getEffectiveStatPure(attacker, statKey, { [statKey]: stage }, weather, cycle, isGym)
    : rawVal

  return {
    name: isPhysical ? 'ATAQUE' : 'AT. ESP',
    base: rawVal,
    final: finalVal,
    stage,
    class: stage > 0 ? 'boosted' : (stage < 0 ? 'penalized' : '')
  }
}

export function calculateDefenderStatDisplay(
  defender: PurePokemon | null,
  isPhysical: boolean,
  isSpecial: boolean,
  enemyStages: { def?: number; spd?: number },
  weather: { type: string; turns: number } | null,
  cycle: DayPhase | undefined,
  isGym: boolean
): TooltipStatDisplay | null {
  if (!defender || (!isPhysical && !isSpecial)) return null
  const statKey = isPhysical ? 'def' : 'spd'
  const stage = isPhysical ? (enemyStages.def || 0) : (enemyStages.spd || 0)
  const rawVal = defender[statKey] || 0
  const finalVal = getEffectiveStatPure(defender, statKey, { [statKey]: stage }, weather, cycle, isGym)

  return {
    name: isPhysical ? 'DEFENSA RIVAL' : 'DEF. ESP RIVAL',
    base: rawVal,
    final: finalVal,
    stage,
    class: stage > 0 ? 'penalized' : (stage < 0 ? 'boosted' : '')
  }
}

export function buildTooltipDamageRange(smogonResult: SmogonTooltipResult | null) {
  if (!smogonResult) return null
  return {
    normalMin: smogonResult.minDmg,
    normalMax: smogonResult.maxDmg,
    normalPctMin: Math.round(smogonResult.minPercent),
    normalPctMax: Math.round(smogonResult.maxPercent),
    critMin: smogonResult.critMinDmg,
    critMax: smogonResult.critMaxDmg,
    critPctMin: Math.round(smogonResult.critMinPercent),
    critPctMax: Math.round(smogonResult.critMaxPercent),
    koChanceText: buildKoText(smogonResult.koChance),
  }
}

export function buildTooltipSpeedInfo(
  smogonResult: SmogonTooltipResult | null,
  movePriority: number
) {
  if (!smogonResult) return null
  return {
    attackerSpeed: smogonResult.attackerSpeed,
    defenderSpeed: smogonResult.defenderSpeed,
    outspeeds: smogonResult.outspeeds,
    priority: movePriority,
  }
}

export function buildTooltipTacticalInfo(smogonResult: SmogonTooltipResult | null) {
  if (!smogonResult) return null
  return {
    hasAssaultVest: smogonResult.hasAssaultVest,
    hasEviolite: smogonResult.hasEviolite,
    attackerWeight: smogonResult.attackerWeight,
    defenderWeight: smogonResult.defenderWeight,
    overrideOffensiveStat: smogonResult.overrideOffensiveStat,
    overrideDefensiveStat: smogonResult.overrideDefensiveStat,
    ignoreDefensive: smogonResult.ignoreDefensive,
    breaksProtect: smogonResult.breaksProtect,
    hasCrashDamage: smogonResult.hasCrashDamage,
    terrainReductions: smogonResult.terrainReductions,
    isLeechSeedActive: smogonResult.isLeechSeedActive,
    isForesightActive: smogonResult.isForesightActive,
    attackerTera: smogonResult.attackerTera,
    defenderTera: smogonResult.defenderTera,
  }
}
