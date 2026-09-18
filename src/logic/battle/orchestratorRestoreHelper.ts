import { cloneReactive } from '@/logic/utils/cloneUtils.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import type { BattleState, BattleStages, BattleLog } from '@/types/battle/battle'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { isMatchingUid } from './showdownUidMapper.ts'
import { initWorkerForBattle } from './orchestratorWorkerInitHelper.ts'
import { requireMapRouteId } from '@/data/world/map-assets'
import { isBattleMinigame } from './battleMinigames.ts'
import { gameBus } from '@/logic/events/gameBus'

type RestorableBattlePayload = Partial<
  BattleState & {
    playerStages: BattleStages
    enemyStages: BattleStages
    battleLogs: BattleLog[]
    inSearchPhase?: boolean
    fsmState?: string
  }
>

interface RestoredEnemyResult {
  enemyPoke: Pokemon | null
  enemyTeamIndex: number
  allEnemiesFainted: boolean
}

async function exitAndClearBattle(ctx: BattleContext, shouldSave = false): Promise<void> {
  ctx.activeBattle.value = null
  ctx.gs.state.activeBattle = null
  await ctx.fsm.transition(ctx.BATTLE_STATES.EXIT_BATTLE)
  if (shouldSave) {
    await ctx.gs.save?.(false)
  }
}

function resolveSourceTeam(ctx: BattleContext, d: RestorableBattlePayload): Pokemon[] {
  if (d.isPvP && Array.isArray(d.playerTeam) && d.playerTeam.length > 0) {
    return d.playerTeam
  }
  return ctx.gs.state.team
}

function isAvailableForBattle(p: Pokemon | null | undefined): p is Pokemon {
  return Boolean(p && p.hp > 0 && !p.onMission && !p.onDefense)
}

function pickRestoredPlayerPokemon(sourceTeam: Pokemon[], desiredIndex: number): Pokemon | null {
  const candidate = desiredIndex >= 0 && desiredIndex < sourceTeam.length ? sourceTeam[desiredIndex] : null
  if (isAvailableForBattle(candidate)) {
    return candidate
  }
  return sourceTeam.find(isAvailableForBattle) || null
}

function isRestorableSearchPhase(d: RestorableBattlePayload): boolean {
  if (d.inSearchPhase === true || d.fsmState === 'SEARCH_PHASE') {
    return true
  }
  return Boolean(d.wasSearching && !d.isTrainer && !d.isGym && !d.isPvP && d.turnCount === 0 && !d.battleHistory?.length)
}

function isHealthyEnemy(p: Pokemon | null | undefined): p is Pokemon {
  return Boolean(p && p.hp > 0 && !p.fainted)
}

function resolveEnemyFromTeam(enemyTeam: Pokemon[], desiredEnemyIndex: number): RestoredEnemyResult {
  const hasAlive = enemyTeam.some(isHealthyEnemy)
  if (!hasAlive) {
    return { enemyPoke: null, enemyTeamIndex: 0, allEnemiesFainted: true }
  }

  const candidate = desiredEnemyIndex >= 0 && desiredEnemyIndex < enemyTeam.length ? enemyTeam[desiredEnemyIndex] : null
  if (isHealthyEnemy(candidate)) {
    return { enemyPoke: candidate, enemyTeamIndex: desiredEnemyIndex, allEnemiesFainted: false }
  }

  const aliveIdx = enemyTeam.findIndex(isHealthyEnemy)
  const enemyTeamIndex = aliveIdx !== -1 ? aliveIdx : 0
  return { enemyPoke: enemyTeam[enemyTeamIndex] || null, enemyTeamIndex, allEnemiesFainted: false }
}

function resolveRestoredEnemyPokemon(d: RestorableBattlePayload): RestoredEnemyResult {
  if (d.enemyTeam && Array.isArray(d.enemyTeam) && d.enemyTeam.length > 0) {
    const desiredIndex = typeof d.enemyTeamIndex === 'number' ? d.enemyTeamIndex : -1
    return resolveEnemyFromTeam(d.enemyTeam, desiredIndex)
  }

  const candidate = d.enemy || d._initialEnemy || null
  if (isHealthyEnemy(candidate)) {
    return { enemyPoke: candidate, enemyTeamIndex: 0, allEnemiesFainted: false }
  }
  return { enemyPoke: null, enemyTeamIndex: 0, allEnemiesFainted: false }
}

function populateInitialEnemyTracking(d: RestorableBattlePayload, enemyPoke: Pokemon): void {
  if (!d._initialEnemy) {
    d._initialEnemy = cloneReactive(enemyPoke)
  }
  if (!d._initialEnemies && enemyPoke.uid) {
    d._initialEnemies = { [enemyPoke.uid]: cloneReactive(enemyPoke) }
  }
}

function populateRestoredTeamAndIndices(
  d: RestorableBattlePayload,
  playerPoke: Pokemon,
  enemyPoke: Pokemon,
  sourceTeam: Pokemon[],
  desiredIndex: number,
  enemyTeamIndex: number
): void {
  d.player = playerPoke
  d.enemy = enemyPoke
  populateInitialEnemyTracking(d, enemyPoke)
  d.playerTeam = sourceTeam

  const matchedIndex = sourceTeam.findIndex((p: Pokemon) => p && isMatchingUid(p.uid, playerPoke.uid))
  d.playerTeamIndex = matchedIndex !== -1 ? matchedIndex : (desiredIndex !== -1 ? desiredIndex : 0)
  d.enemyTeamIndex = enemyTeamIndex
  d.participants = Array.isArray(d.participants) && d.participants.length > 0 ? d.participants : [playerPoke.uid]
}

function populateRestoredFieldConditions(d: RestorableBattlePayload): void {
  d.weather = d.weather || { type: 'clear', visual: 'clear', turns: -1 }
  d.initialMapWeather = d.initialMapWeather || null
  d.terrain = d.terrain || null
  d.fieldConditions = d.fieldConditions || {}
  d.playerSideConditions = d.playerSideConditions || {}
  d.enemySideConditions = d.enemySideConditions || {}
  d.pendingSlotEffects = Array.isArray(d.pendingSlotEffects) ? d.pendingSlotEffects : []
}

function populateRestoredProgressFlags(d: RestorableBattlePayload): void {
  d.turnCount = typeof d.turnCount === 'number' ? d.turnCount : 1
  d.over = false
  d.escapeAttempts = typeof d.escapeAttempts === 'number' ? d.escapeAttempts : 0

  const isSpecialLock = Boolean(d.isTrainer || d.isGym || d.isPvP || d.isGuardian)
  d.cannotEscape = isSpecialLock ? Boolean(d.cannotEscape) : false
  d.enemyInventory = d.enemyInventory ? { ...d.enemyInventory } : {}
  d.stolenResources = d.stolenResources || { money: 0, items: {} }
}

function populateRestoredEnvironmentFlags(d: RestorableBattlePayload): void {
  d.wasSearching = Boolean(d.wasSearching)
  d.isRival = Boolean(d.isRival || d.trainerArchetype === 'rival')
  d.minigame = d.minigame ?? null
  d.isCave = Boolean(d.isCave)
  d.isIndoors = Boolean(d.isIndoors)
  d.isCrystalCave = Boolean(d.isCrystalCave)
}

function populateRestoredBattleDefaults(
  d: RestorableBattlePayload,
  playerPoke: Pokemon,
  enemyPoke: Pokemon,
  sourceTeam: Pokemon[],
  desiredIndex: number,
  enemyTeamIndex: number
): void {
  populateRestoredTeamAndIndices(d, playerPoke, enemyPoke, sourceTeam, desiredIndex, enemyTeamIndex)
  populateRestoredFieldConditions(d)
  populateRestoredProgressFlags(d)
  populateRestoredEnvironmentFlags(d)
}

async function activateRestoredBattle(
  ctx: BattleContext,
  d: RestorableBattlePayload,
  playerPoke: Pokemon,
  enemyPoke: Pokemon
): Promise<void> {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  ctx.activeBattle.value = d as BattleState
  if (d.playerStages) ctx.playerStages.value = d.playerStages
  if (d.enemyStages) ctx.enemyStages.value = d.enemyStages
  if (d.battleLogs && Array.isArray(d.battleLogs)) {
    ctx.battleLogs.value = [...d.battleLogs]
  }

  ctx.isProcessing.value = true
  await ctx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
  await initWorkerForBattle(ctx, playerPoke, enemyPoke)
  ctx.isProcessing.value = false

  if (d.isPvP) {
    gameBus.emit('PVP_RECONNECT_BATTLE', d)
  }
}

/**
 * Restores a battle state from saved data upon page refresh (F5).
 * Faithfully resumes the active combat at the exact turn, HP, and log history.
 */
export async function restoreBattleState(ctx: BattleContext, battleData: unknown): Promise<void> {
  if (!battleData) {
    await exitAndClearBattle(ctx, false)
    return
  }
  const d = battleData as RestorableBattlePayload
  if (d.over) {
    await exitAndClearBattle(ctx, true)
    return
  }

  const sourceTeam = resolveSourceTeam(ctx, d)
  const desiredIndex = typeof d.playerTeamIndex === 'number' ? d.playerTeamIndex : -1
  const playerPoke = pickRestoredPlayerPokemon(sourceTeam, desiredIndex)

  if (isBattleMinigame(d) || isRestorableSearchPhase(d)) {
    await resumeSearchMode(ctx, d)
    return
  }

  if (!playerPoke) {
    await exitAndClearBattle(ctx, true)
    return
  }

  const { enemyPoke, enemyTeamIndex, allEnemiesFainted } = resolveRestoredEnemyPokemon(d)
  if (allEnemiesFainted) {
    await exitAndClearBattle(ctx, true)
    return
  }

  if (!enemyPoke) {
    if (d.wasSearching) {
      await resumeSearchMode(ctx, d)
      return
    }
    await exitAndClearBattle(ctx, true)
    return
  }

  populateRestoredBattleDefaults(d, playerPoke, enemyPoke, sourceTeam, desiredIndex, enemyTeamIndex)
  await activateRestoredBattle(ctx, d, playerPoke, enemyPoke)
}

async function resumeSearchMode(ctx: BattleContext, d: Partial<BattleState>): Promise<void> {
  const rawLoc = d.locationId || ctx.gs.state.map?.currentMap
  if (!rawLoc) {
    throw new Error('[BattleRestore] Cannot restore search phase without a valid locationId or map.currentMap')
  }
  const locId = requireMapRouteId(rawLoc)
  ctx.activeBattle.value = {
    player: null,
    enemy: null,
    playerTeamIndex: 0,
    enemyTeamIndex: 0,
    participants: [],
    locationId: locId,
    weather: { type: 'clear', visual: 'clear', turns: -1 },
    turnCount: 0,
    escapeAttempts: 0,
    over: false,
    fled: false,
    isTrainer: false,
    isGym: false,
    cannotEscape: false,
    minigame: null,
    isCave: Boolean(d.isCave),
    isIndoors: Boolean(d.isIndoors),
    isCrystalCave: Boolean(d.isCrystalCave),
    rewardsProcessed: false,
    _rewardCombatants: [],
    wasSearching: true,
  }
  const { handleBattleFlowCompletion } = await import('./searchLoop.ts')
  await handleBattleFlowCompletion(ctx, 'search')
}
