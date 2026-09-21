import { getEffectiveStatPure, type PurePokemon } from '@/logic/battle/battleMath'
import type { PureBattleWeather } from '@/logic/battle/battleMathTypes'
import { calculateDamageForTooltip, type SmogonTooltipResult } from '@/logic/battle/smogonAdapter'
import { getDayCycle, type DayPhase } from '@/logic/utils/timeUtils'
import type { Move, Pokemon } from '@/types/pokemon/pokemon'
import { getItemName, requireItemId } from '@/data/inventory/items'
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider'
import type { BattleStages, BattleState, BattleConditionKey, BattleTimedCondition } from '@/types/battle/battle'
import { getMechanicalWeather, type WeatherMechanical } from '@/logic/weather/weatherRegistry'
import {
  calculateMovePower,
  calculateMoveAccuracy,
  calculateCritChance,
  calculateMoveEffectivenessAndDamage
} from '@/logic/battle/moveTooltipMath'

type TooltipMoveData = Partial<Pick<Move, 'cat' | 'type' | 'power' | 'acc' | 'effect' | 'priority'>>
type SideConditions = Partial<Record<BattleConditionKey, BattleTimedCondition>> | undefined

const CHOICE_ITEMS_CONFIG: Readonly<Record<string, { category?: string; boostText: string }>> = {
  choiceband: { category: 'physical', boostText: '+50% Potencia Física' },
  choicespecs: { category: 'special', boostText: '+50% Potencia Especial' },
  choicescarf: { boostText: '+50% Velocidad' }
}

function resolveChoiceBlockedModifier(
  attacker: Pokemon,
  move: Move,
  itemName: string
): { type: string; text: string } | null {
  if (attacker.choiceMove && attacker.choiceMove !== move.id) {
    const choiceMoveName = pokemonDataProvider.getMoveData(attacker.choiceMove)?.name || attacker.choiceMove
    return { type: 'penalized', text: `Bloqueado por ${itemName} (Elegiste: ${choiceMoveName}).` }
  }
  return null
}

function resolveChoiceBoostText(itemKey: string, category: string): { hasBoost: boolean; text: string; desc: string } {
  const cfg = CHOICE_ITEMS_CONFIG[itemKey]
  if (!cfg) return { hasBoost: false, text: '', desc: '' }
  const hasBoost = cfg.category !== undefined && cfg.category === category
  const desc = itemKey === 'choicescarf' ? ' (+50% Velocidad, bloqueo)' : ' (Bloqueo)'
  return { hasBoost, text: cfg.boostText, desc }
}

export function applyChoiceItemModifier(
  info: { type: string; text: string } | null,
  attacker: Pokemon,
  move: Move
): { type: string; text: string } | null {
  const itemKey = attacker.heldItem
  if (!itemKey || !(itemKey in CHOICE_ITEMS_CONFIG)) {
    return info
  }
  const itemName = getItemName(requireItemId(itemKey))
  const blocked = resolveChoiceBlockedModifier(attacker, move, itemName)
  if (blocked) return blocked

  const moveData = move.id ? pokemonDataProvider.getMoveData(move.id) : undefined
  const category = move.cat ?? moveData?.cat ?? 'physical'
  const { hasBoost, text: boostText, desc } = resolveChoiceBoostText(itemKey, category)

  if (hasBoost) {
    const fullText = `Objeto: ${itemName} (${boostText}, bloquea movimiento).`
    return info ? { ...info, text: `${info.text} | ${itemName} (${boostText}, bloqueo)` } : { type: 'boosted', text: fullText }
  }
  return info ? { ...info, text: `${info.text} | ${itemName}${desc}` } : { type: 'boosted', text: `Objeto: ${itemName}${desc}.` }
}

function resolveTooltipMoveData(move: Move) {
  const moveIdLookup = move.id || ''
  const moveData = moveIdLookup ? pokemonDataProvider.getMoveData(moveIdLookup) : undefined
  const md: TooltipMoveData = moveData ? {
    type: moveData.type,
    power: moveData.power,
    acc: moveData.acc,
    cat: moveData.cat,
    priority: moveData.priority,
    effect: moveData.effect
  } : {}
  const basePower = move.power !== undefined ? move.power : md.power || 0
  const isStatus = move.cat === 'status' || md.cat === 'status'
  const moveType = (move.type || md.type || 'normal').toLowerCase()
  const category = move.cat || md.cat || 'physical'
  const isPhysical = category === 'physical'
  const isSpecial = category === 'special'
  const priority = move.priority !== undefined ? move.priority : md.priority || 0

  return { md, basePower, isStatus, moveType, category, isPhysical, isSpecial, priority }
}

function buildFieldConditionsList(
  playerSC: SideConditions,
  enemySC: SideConditions,
  terrain: string | null | undefined
): string[] {
  const list: string[] = [] // no-domain: Non-domain utility collection or data structure
  if (playerSC?.reflect) list.push('Reflect (↓ daño físico enemigo)')
  if (playerSC?.lightscreen) list.push('Pantalla de Luz (↓ daño esp. enemigo)')
  if (playerSC?.auroraveil) list.push('Aurora Velo (↓ todo daño enemigo)')
  if (playerSC?.tailwind) list.push('Viento Afín (↑ Velocidad)')
  if (enemySC?.reflect) list.push('Reflect rival (↓ tu daño físico)')
  if (enemySC?.lightscreen) list.push('Pantalla rival (↓ tu daño esp.)')
  if (enemySC?.auroraveil) list.push('Aurora Velo rival (↓ todo tu daño)')
  if (terrain) list.push(`Terreno: ${terrain}`)
  return list
}

function resolveTooltipSmogonCalc(
  attacker: Pokemon,
  defender: Pokemon | null,
  move: Move,
  isStatus: boolean,
  basePower: number,
  isGym: boolean,
  battleState: BattleState | null | undefined,
  playerStages: Partial<BattleStages>,
  enemyStages: Partial<BattleStages>
) {
  if (isStatus || !defender || basePower <= 0) {
    return null
  }
  const rawWeather = isGym ? null : battleState?.weather ?? null
  const weather = rawWeather ? { type: rawWeather.type, turns: rawWeather.turns } : null

  return calculateDamageForTooltip(
    attacker,
    defender,
    move,
    {
      weather,
      terrain: battleState?.terrain,
      playerSideConditions: battleState?.playerSideConditions,
      enemySideConditions: battleState?.enemySideConditions,
      isGym,
    },
    playerStages,
    enemyStages
  )
}

interface TooltipPowerModifier {
  label: string
  mult: number
}

interface TooltipPowerInput {
  base: number
  final: number | string
  list: TooltipPowerModifier[]
  class: string
}

function formatTooltipPower(power: TooltipPowerInput, isStatus: boolean) {
  const isZeroOrStatus = isStatus || power.base === 0
  return {
    ...power,
    final: isZeroOrStatus ? '-' : power.final,
    class: isZeroOrStatus ? '' : power.class
  }
}

const DEFAULT_TOOLTIP_STAGES = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }

function resolveTooltipStages(
  playerStages: Partial<BattleStages> | null | undefined,
  enemyStages: Partial<BattleStages> | null | undefined,
  isPhysical: boolean
) {
  const playerStageFull = playerStages ?? DEFAULT_TOOLTIP_STAGES
  const enemyStageFull = enemyStages ?? DEFAULT_TOOLTIP_STAGES
  const playerStagesEff = playerStageFull.atk !== undefined ? { atk: isPhysical ? playerStageFull.atk : playerStageFull.spa } : null
  const enemyStagesEff = enemyStageFull.def !== undefined ? { def: isPhysical ? enemyStageFull.def : enemyStageFull.spd } : null

  return { playerStageFull, enemyStageFull, playerStagesEff, enemyStagesEff }
}


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
  playerStages: Partial<BattleStages> | undefined,
  weather: PureBattleWeather | null,
  cycle: DayPhase | undefined,
  isGym: boolean
): TooltipStatDisplay | null {
  if (!isPhysical && !isSpecial) return null
  const statKey = isPhysical ? 'atk' : 'spa'
  const stages = playerStages ?? {}
  const stage = isPhysical ? (stages.atk || 0) : (stages.spa || 0)
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

function calculateDefenderStatDisplay(
  defender: PurePokemon | null,
  isPhysical: boolean,
  isSpecial: boolean,
  enemyStages: Partial<BattleStages> | undefined,
  weather: PureBattleWeather | null,
  cycle: DayPhase | undefined,
  isGym: boolean
): TooltipStatDisplay | null {
  if (!defender || (!isPhysical && !isSpecial)) return null
  const statKey = isPhysical ? 'def' : 'spd'
  const stages = enemyStages ?? {}
  const stage = isPhysical ? (stages.def || 0) : (stages.spd || 0)
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

function buildTooltipTacticalInfo(smogonResult: SmogonTooltipResult | null) {
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

export interface TooltipBattleContext {
  attacker: Pokemon
  defender: Pokemon | null
  isGym: boolean
  weather: PureBattleWeather | null
  mechWeather: WeatherMechanical
  cycle: DayPhase
  weatherInfo: PureBattleWeather | null
}

export function createTooltipBattleContext(
  battleState: BattleState | null | undefined,
  playerInfo: Pokemon | null | undefined
): TooltipBattleContext | null {
  const attacker = playerInfo ?? battleState?.player ?? null
  if (!attacker) return null

  const defender = battleState?.enemy ?? null
  const isGym = Boolean(battleState?.isGym)
  const rawWeather = isGym ? null : battleState?.weather ?? null
  const weather: PureBattleWeather | null = rawWeather ? { type: rawWeather.type as PureBattleWeather['type'], turns: rawWeather.turns } : null
  const mechWeather = getMechanicalWeather(weather?.type)
  const cycle = getDayCycle()

  return { attacker, defender, isGym, weather, mechWeather, cycle, weatherInfo: weather }
}

export function computeMoveActiveDetails(
  move: Move,
  ctx: TooltipBattleContext,
  battleState: BattleState | null | undefined,
  playerStages: Partial<BattleStages> | undefined,
  enemyStages: Partial<BattleStages> | undefined
) {
  const { attacker, defender, isGym, weather, mechWeather, cycle, weatherInfo } = ctx
  const { md, basePower, isStatus, moveType, isPhysical, isSpecial, priority } = resolveTooltipMoveData(move)

  const power = calculateMovePower(
    move,
    attacker as PurePokemon,
    defender as PurePokemon | null,
    mechWeather,
    cycle,
    basePower,
    moveType
  )

  const accuracy = calculateMoveAccuracy(
    move,
    weather,
    mechWeather,
    cycle,
    move.acc ?? md.acc ?? 0,
    playerStages?.acc ?? 0,
    enemyStages?.eva ?? 0
  )

  const critChance = calculateCritChance(
    attacker as PurePokemon,
    defender as PurePokemon | null
  )

  const { playerStageFull, enemyStageFull, playerStagesEff, enemyStagesEff } = resolveTooltipStages(
    playerStages,
    enemyStages,
    isPhysical
  )

  const { effectiveness } = calculateMoveEffectivenessAndDamage(
    move,
    md,
    attacker as PurePokemon,
    defender as PurePokemon | null,
    weather,
    cycle,
    basePower,
    playerStagesEff,
    enemyStagesEff
  )

  const smogonResult = resolveTooltipSmogonCalc(
    attacker,
    defender,
    move,
    isStatus,
    basePower,
    isGym,
    battleState ?? undefined,
    playerStageFull,
    enemyStageFull
  )

  return {
    isStatus,
    power: formatTooltipPower(power, isStatus),
    accuracy,
    effectiveness,
    critChance,
    damageRange: buildTooltipDamageRange(smogonResult),
    attackerStat: calculateAttackerStatDisplay(attacker as PurePokemon, defender as PurePokemon | null, isPhysical, isSpecial, playerStages, weatherInfo, cycle, isGym),
    defenderStat: calculateDefenderStatDisplay(defender as PurePokemon | null, isPhysical, isSpecial, enemyStages, weatherInfo, cycle, isGym),
    recovery: smogonResult?.recovery ?? null,
    recoil: smogonResult?.recoil ?? null,
    fieldConditions: buildFieldConditionsList(battleState?.playerSideConditions, battleState?.enemySideConditions, battleState?.terrain),
    smogonDesc: smogonResult?.smogonDesc ?? '',
    speedInfo: buildTooltipSpeedInfo(smogonResult, priority),
    tacticalInfo: buildTooltipTacticalInfo(smogonResult),
  }
}
