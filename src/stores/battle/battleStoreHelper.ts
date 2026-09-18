import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine.ts'
import { createBattleUiConfig, type BattleMode, type BattleUiConfig } from '@/types/battle/battleConfig'
import type { BattleState } from '@/types/battle/battle'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import { requireWeatherId, type WeatherId } from '@/logic/weather/weatherRegistry.ts'
import { isNaturalWeatherAllowedInLocation } from '@/logic/battle/battleTeamCoordinator.ts'
import { isMapRouteId } from '@/data/world/map-assets'
import { MAPS_BY_ROUTE_ID } from '@/data/world/maps'
import { findMatchingPokemon } from '@/logic/battle/showdownUidMapper.ts'

export const ACTIVE_BATTLE_STATES: ReadonlySet<string> = new Set([
  BATTLE_STATES.CONTEXT_SETUP,
  BATTLE_STATES.ACTIVE_BATTLE,
  BATTLE_STATES.REWARDS_PHASE,
  BATTLE_STATES.LEVEL_UP_MODAL,
  BATTLE_STATES.REORDER_TEAM,
  BATTLE_STATES.FIRST_INTRO,
  BATTLE_STATES.INITIALIZING,
  BATTLE_STATES.SEARCH_PHASE,
  BATTLE_STATES.EXIT_BATTLE
])

const FAINT_SUBSTATES: ReadonlySet<string> = new Set([
  BATTLE_SUBSTATES.SWITCH_MENU,
  BATTLE_SUBSTATES.PLAYER_FAINT_SEQ,
  BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ
])

export function isFaintSubstate(sub: string | null | undefined): boolean {
  if (!sub) return false
  return FAINT_SUBSTATES.has(sub)
}

export function hasForceSwitchRequest(battle: BattleState): boolean {
  const forceSwitch = battle.playerRequest?.forceSwitch
  return Array.isArray(forceSwitch) ? forceSwitch.some(Boolean) : Boolean(forceSwitch)
}

function resolveBattleMode(b: BattleState): BattleMode {
  if (b.isPvP) return b.isRanked ? 'pvp_ranked' : 'pvp_casual'
  if (b.isGym) return 'gym'
  if (b.isTrainer) return 'trainer'
  return 'wild'
}

export function resolveBattleUiConfig(b: BattleState | null): BattleUiConfig {
  if (!b) return createBattleUiConfig('wild')
  const mode = resolveBattleMode(b)
  const isWild = !b.isTrainer && !b.isGym && !b.isPvP && !b.isGuardian
  return createBattleUiConfig(mode, {
    allowCatch: isWild,
    allowFlee: isWild,
    enableContinuousSearch: isWild && b.wasSearching !== false
  })
}

export function syncBattleMapWeather(
  battle: BattleState,
  newWeather: WeatherId | undefined,
  fallbackMapLocation?: string
): void {
  if (!battle.weather || battle.weather.turns !== -1) return
  const locId = battle.locationId || fallbackMapLocation || ''
  const mapConfig = isMapRouteId(locId) ? MAPS_BY_ROUTE_ID[locId] : null
  if (!isNaturalWeatherAllowedInLocation(locId, mapConfig, null, battle)) {
    battle.weather.type = requireWeatherId('clear')
    battle.weather.visual = 'clear'
    return
  }
  battle.weather.type = requireWeatherId(newWeather || 'clear')
  battle.weather.visual = newWeather || 'clear'
}

export function canExecuteMove(isProc: boolean, isAct: boolean, battle: BattleState | null): boolean {
  if (isProc || !isAct || !battle) return false
  return !battle.over && Boolean(battle.player && battle.enemy)
}

export function trackPlayerUsedMove(
  playerUsedMoves: string[],
  moves: ({ id?: string } | null)[] | undefined,
  moveIndex: number
): void {
  const move = moves?.[moveIndex]
  if (move?.id && !playerUsedMoves.includes(move.id)) {
    playerUsedMoves.push(move.id)
  }
}

export function syncPokemonHpEntry(
  team: Pokemon[],
  bp: { uid?: string; id?: PokemonSpeciesId; hp?: number } | undefined
): void {
  if (!bp || typeof bp.hp !== 'number') return
  const match = bp.uid ? findMatchingPokemon(bp.uid, team) : team.find(p => p && p.id === bp.id)
  if (match) {
    match.hp = bp.hp
  }
}

export function applyPendingBattleSwitches(battle: BattleState | null): void {
  if (!battle) return
  const switchingToPlayer = Reflect.get(battle, 'switchingToPlayer') as Pokemon | undefined
  if (switchingToPlayer) {
    battle.player = switchingToPlayer
    Reflect.deleteProperty(battle, 'switchingToPlayer')
  }
  const switchingToEnemy = Reflect.get(battle, 'switchingToEnemy') as Pokemon | undefined
  if (switchingToEnemy) {
    battle.enemy = switchingToEnemy
    Reflect.deleteProperty(battle, 'switchingToEnemy')
  }
}

export function shouldResetRevivedPlayerSubstate(
  sub: string | null,
  battle: BattleState,
  hasPendingForceSwitch: boolean
): boolean {
  if (sub !== BATTLE_SUBSTATES.SWITCH_MENU && sub !== BATTLE_SUBSTATES.PLAYER_FAINT_SEQ) return false
  return Boolean(battle.player && battle.player.hp > 0 && !hasPendingForceSwitch)
}

export function shouldAdvanceToWaitInput(
  battle: BattleState | null,
  state: string,
  sub: string | null
): boolean {
  if (!battle || battle.over || state !== BATTLE_STATES.ACTIVE_BATTLE) return false
  return !isFaintSubstate(sub)
}
