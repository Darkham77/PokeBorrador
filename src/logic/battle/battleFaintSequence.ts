import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleState, BattleSide } from '@/types/battle/battle'
import { findBestSwitchIndex } from './ai/battleAI.ts'
import { ShowdownTeamResolver } from './showdownTeamResolver.ts'
import { registerRewardCombatant } from './rewardsDistributor.ts'
import { syncTeamHP } from './battleStateSync.ts'
import { gameBus } from '@/logic/events/gameBus'
import { isMatchingUid } from './showdownUidMapper.ts'
import { gsapSleep } from '@/logic/utils/gsapHelpers'

const FAINT_ANIMATION_FALLBACK_DELAY_MS = 1300
const WITHDRAW_ANIMATION_FALLBACK_DELAY_MS = 800
const DEFEAT_SCREEN_DELAY_MS = 1500
const EMPTY_WAIT_STAGE_DELAY_MS = 200

interface EnemyFaintResolutionActions {
  processFaint: (ctx: BattleContext, side: BattleSide) => Promise<void>
  terminateBattle: (ctx: BattleContext, winParam: boolean, fled?: boolean) => Promise<void>
}

function getFsmStateString(state: unknown): string {
  if (typeof state === 'string') return state
  if (state && typeof state === 'object') {
    if ('value' in state && typeof (state as { value: unknown }).value === 'string') {
      return (state as { value: string }).value
    }
  }
  return ''
}

interface ReplayHistoryEntry {
  p1Choice?: string
  p2Choice?: string
  p2ForceSwitch?: boolean
  p2ActiveUid?: string
}

function findNextReplaySwitchStep(
  history: Array<ReplayHistoryEntry>,
  historyIndex: number,
  debugObj: object
): { choice: string; uid?: string } | null {
  const offset = history.slice(historyIndex).findIndex((h) => h && (h.p2Choice?.startsWith('switch ') || Boolean(h.p2ForceSwitch)))
  if (offset === -1) return null
  const nextSwitchStep = history[historyIndex + offset]
  if (!nextSwitchStep) return null
  Reflect.set(debugObj, 'replayHistoryIdx', historyIndex + offset)
  return {
    choice: nextSwitchStep.p2Choice || '',
    uid: nextSwitchStep.p2ActiveUid
  }
}

function isHealthyCombatant(p: Pokemon): boolean {
  return !p.fainted && p.hp > 0
}

function hasActiveLiveEnemy(active: BattleState): boolean {
  const team = active.enemyTeam
  if (!team) return false
  return team.some(isHealthyCombatant)
}

function validateReplayCandidateOrThrow(
  candidate: Pokemon | null,
  hasLiveEnemy: boolean,
  targetChoice: string
): void {
  if (candidate || !hasLiveEnemy) return
  if (window.__VITE_DEBUG__?.certifiedReplayWorkerEnded === true) return
  throw new Error(`[battleFaintSequence] Certified enemy replacement does not resolve to a live Pokémon. context=${JSON.stringify({ choice: targetChoice })}`)
}

function extractReplayTarget(
  debugObj: object,
  pendingEntry: { p2Choice?: string; p2ActiveUid?: string } | null
): { choice: string; uid?: string } {
  const choice = pendingEntry?.p2Choice || ''
  const uid = pendingEntry?.p2ActiveUid
  if (choice.startsWith('switch ')) {
    return { choice, uid }
  }
  const history = Reflect.get(debugObj, 'history') as Array<ReplayHistoryEntry> | undefined
  const historyIndex = Reflect.get(debugObj, 'replayHistoryIdx') as number | undefined
  if (!Array.isArray(history) || typeof historyIndex !== 'number') {
    return { choice, uid }
  }
  const nextStep = findNextReplaySwitchStep(history, historyIndex, debugObj)
  return nextStep || { choice, uid }
}

async function resolveReplayEnemyReplacement(active: BattleState): Promise<Pokemon | null> {
  const { ShowdownBattleRunner } = await import('./helpers/showdownBattleRunner.ts')
  const debugObj = window.__VITE_DEBUG__!
  const pendingEntry = ShowdownBattleRunner.requirePendingHistoryEntry(debugObj)
  const { choice, uid } = extractReplayTarget(debugObj, pendingEntry)
  const candidate = selectCandidateFromTeam(active, choice, uid)
  validateReplayCandidateOrThrow(candidate, hasActiveLiveEnemy(active), choice)
  return candidate
}

function pickCandidateByUid(team: Pokemon[], targetUid: string): Pokemon | null {
  return team.find((p: Pokemon) => isHealthyCombatant(p) && p.uid && isMatchingUid(p.uid, targetUid)) || null
}

function pickCandidateBySlotChoice(active: BattleState, team: Pokemon[], targetChoice: string): Pokemon | null {
  if (!targetChoice.startsWith('switch ')) return null
  const slotIdx = parseInt(targetChoice.replace('switch ', '').trim(), 10) - 1
  const reqPokemon = (active.enemyRequest as { side?: { pokemon?: Array<{ ident?: string }> } })?.side?.pokemon
  const rawIdent = reqPokemon?.[slotIdx]?.ident || ''
  const candidateUid = rawIdent.split(': ')[1] || ''
  if (!candidateUid) return null
  return pickCandidateByUid(team, candidateUid)
}

function selectCandidateFromTeam(
  active: BattleState,
  targetChoice: string,
  targetUid: string | undefined
): Pokemon | null {
  const enemyTeam = active.enemyTeam || []
  if (targetUid) {
    const candidate = pickCandidateByUid(enemyTeam, targetUid)
    if (candidate) return candidate
  }
  const slotCandidate = pickCandidateBySlotChoice(active, enemyTeam, targetChoice)
  if (slotCandidate) return slotCandidate
  return enemyTeam.find(isHealthyCombatant) || null
}

function isScriptedReplay(): boolean {
  return typeof window !== 'undefined' && Boolean(window.__VITE_DEBUG__?.isScriptedReplayMode)
}

function pickAiEnemyReplacement(
  team: Pokemon[],
  activePlayer: Pokemon,
  currentFaintedUid: string,
  ctx: BattleContext
): Pokemon | null {
  const bestIdx = findBestSwitchIndex(team, activePlayer, currentFaintedUid, ctx, 'faint_replacement')
  if (bestIdx !== -1 && team[bestIdx]) return team[bestIdx]
  return team.find((p: Pokemon) => p.hp > 0) || null
}

async function resolveNextEnemyReplacement(
  active: BattleState,
  currentFaintedUid: string,
  ctx: BattleContext
): Promise<Pokemon | null> {
  const team = active.enemyTeam
  if (!team) return null
  if (isScriptedReplay()) {
    return resolveReplayEnemyReplacement(active)
  }
  const activePlayer = active.player || team[0]
  if (!activePlayer) return null
  return pickAiEnemyReplacement(team, activePlayer, currentFaintedUid, ctx)
}

async function playWildEnemyFaintAnim(ctx: BattleContext): Promise<void> {
  if (ctx.animations?.handleFaintAnim) {
    await ctx.animations.handleFaintAnim({ side: 'enemy' })
  } else {
    await gsapSleep(FAINT_ANIMATION_FALLBACK_DELAY_MS)
  }
}

async function playTrainerEnemyWithdrawAnim(ctx: BattleContext, pokemon: Pokemon): Promise<void> {
  if (ctx.animations?.handleWithdrawRequest) {
    await ctx.animations.handleWithdrawRequest({ side: 'enemy', pokemon })
  } else {
    gameBus.emit('PLAY_WITHDRAW', { side: 'enemy' })
    await gsapSleep(WITHDRAW_ANIMATION_FALLBACK_DELAY_MS)
  }
}

function resetInitialEnemyStateIfDefeated(active: BattleState, isTr: boolean): void {
  if (!isTr || !active.enemyTeam || !active.enemyTeam.some(p => p.hp > 0)) {
    active._initialEnemy = null
    active._initialEnemies = {}
  }
}

function resetEnemyStagesOnSendOut(ctx: BattleContext): void {
  const s = ctx.enemyStages.value
  ctx.enemyStages.value = {
    atk: 0,
    def: 0,
    spa: 0,
    spd: 0,
    spe: 0,
    accuracy: 0,
    evasion: 0,
    reflect: s.reflect || 0,
    lightScreen: s.lightScreen || 0,
    safeguard: s.safeguard || 0,
    mist: s.mist || 0,
    spikes: s.spikes || 0
  }
}

function shouldAdvanceReplayEntry(entry: { p2ForceSwitch?: boolean; p1Choice?: string; p2Choice?: string } | null): boolean {
  if (!entry) return false
  if (entry.p2ForceSwitch) return true
  return entry.p1Choice === '' && Boolean(entry.p2Choice?.startsWith('switch '))
}

async function advanceReplayAfterReplacement(_active: BattleState): Promise<void> {
  if (!isScriptedReplay()) return
  const debugObj = window.__VITE_DEBUG__ as { history?: Array<{ p2ForceSwitch?: boolean; p1Choice?: string; p2Choice?: string }>; replayHistoryIdx?: number }
  const history = debugObj.history
  const idx = debugObj.replayHistoryIdx
  if (!Array.isArray(history) || typeof idx !== 'number') return

  const nextEntry = history[idx] || null
  if (shouldAdvanceReplayEntry(nextEntry)) {
    const { ShowdownBattleRunner } = await import('./helpers/showdownBattleRunner.ts')
    ShowdownBattleRunner.advanceHistoryAfterAcceptedTurn(debugObj)
  }
}

async function applyReplacementLogs(
  ctx: BattleContext,
  logs: string[]
): Promise<void> {
  const { parseShowdownLogLine, filterShowdownLogs } = await import('./showdownBridge.ts')
  const filteredLogs = filterShowdownLogs(logs)
  for (const logLine of filteredLogs) {
    await parseShowdownLogLine(ctx, logLine, filteredLogs)
  }
}

async function executeEnemyReplacementWorkerTurn(
  ctx: BattleContext,
  active: BattleState,
  nextEnemy: Pokemon,
  isCurrentActiveBattle: () => boolean
): Promise<boolean> {
  const { getShowdownWorker, executeTurnInWorker } = await import('./showdownWorkerClient.ts')
  if (!getShowdownWorker() || !active.enemyTeam) return true

  const p2Choice = `switch ${ShowdownTeamResolver.getShowdownSlotForUid(active.enemyRequest, nextEnemy.uid)}`
  const result = await executeTurnInWorker('', p2Choice, true, false)
  if (!isCurrentActiveBattle()) return false
  if (result) {
    active.playerRequest = result.p1Request
    active.enemyRequest = result.p2Request
    await applyReplacementLogs(ctx, result.logs)
    await advanceReplayAfterReplacement(active)
  }
  delete active.switchingToEnemy
  return true
}

async function sendOutNextEnemy(
  ctx: BattleContext,
  active: BattleState,
  nextEnemy: Pokemon,
  isCurrentActiveBattle: () => boolean
): Promise<boolean> {
  ctx.faintedSides.value.delete('enemy')
  active.enemy = nextEnemy
  ctx.addLog(`¡${active.trainerName || 'El entrenador'} envía a ${nextEnemy.name}!`, 'log-enemy', 'enemy_trainer')

  if (ctx.animations?.handleReleaseRequest) {
    await ctx.animations.handleReleaseRequest({ side: 'enemy', pokemon: nextEnemy })
  } else {
    gameBus.emit('PLAY_SEND_OUT', { side: 'enemy', pokemon: nextEnemy })
  }

  const cont = await executeEnemyReplacementWorkerTurn(ctx, active, nextEnemy, isCurrentActiveBattle)
  if (!cont) return false

  return nextEnemy.hp > 0
}

async function handleEnemyAllFainted(
  ctx: BattleContext,
  active: BattleState,
  actions: EnemyFaintResolutionActions
): Promise<void> {
  active.over = true
  registerRewardCombatant(active)
  active.enemy = null
  active._initialEnemy = null
  active._initialEnemies = {}
  ctx.faintedSides.value.add('enemy')
  await actions.terminateBattle(ctx, true)
}

function formatDefeatedEnemyName(pokemon: Pokemon, isTr: boolean): string {
  return isTr ? pokemon.name : `¡${pokemon.name} salvaje`
}

export async function processEnemyFaintSequence(
  ctx: BattleContext,
  pokemon: Pokemon,
  actions: EnemyFaintResolutionActions
): Promise<void> {
  const active = ctx.activeBattle.value
  if (!active) return

  registerRewardCombatant(active, pokemon)

  const { BATTLE_STATES, BATTLE_SUBSTATES, fsm } = ctx
  const isCurrentActiveBattle = () => ctx.activeBattle.value === active && getFsmStateString(fsm.currentState) === BATTLE_STATES.ACTIVE_BATTLE
  const isTr = Boolean(active.isTrainer)
  ctx.addLog(`${formatDefeatedEnemyName(pokemon, isTr)} fue derrotado!`, 'log-enemy', pokemon)

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.TYPE_CHECK)

  if (!isTr) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_DEFEAT)
    await playWildEnemyFaintAnim(ctx)
    if (!isCurrentActiveBattle()) return
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAY_ENEMY_FAINT)
  } else {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL)
    await playTrainerEnemyWithdrawAnim(ctx, pokemon)
    if (!isCurrentActiveBattle()) return
  }

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CLEANUP_MEMORY)
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT)

  pokemon.fainted = true
  pokemon.hp = 0
  syncTeamHP(ctx)

  if (isTr && ctx.animations?.playBallFadeOut) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.FADEOUT_BALL)
    await ctx.animations.playBallFadeOut('enemy')
    if (!isCurrentActiveBattle()) return
  }

  active.enemy = null
  resetInitialEnemyStateIfDefeated(active, isTr)

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CHECK_REMAINING)
  const nextEnemy = await resolveNextEnemyReplacement(active, pokemon.uid, ctx)

  if (nextEnemy) {
    await handleNextEnemySendoutSequence(ctx, active, nextEnemy, actions, isCurrentActiveBattle)
    return
  }

  await handleEnemyAllFainted(ctx, active, actions)
}

async function handleNextEnemySendoutSequence(
  ctx: BattleContext,
  active: BattleState,
  nextEnemy: Pokemon,
  actions: EnemyFaintResolutionActions,
  isCurrentActiveBattle: () => boolean
): Promise<void> {
  const { BATTLE_STATES, BATTLE_SUBSTATES, fsm } = ctx
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.STABILIZE_STAGE)
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EMPTY_WAIT)
  await gsapSleep(EMPTY_WAIT_STAGE_DELAY_MS)
  if (!isCurrentActiveBattle()) return

  resetEnemyStagesOnSendOut(ctx)

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.AI_NEXT_PICK)
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SELECT_COUNTER)
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.NEXT_PICK_TYPE)
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_CALL)
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.RENDER_BALL)
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.OCCUPY_SEAT)

  const enemyAlive = await sendOutNextEnemy(ctx, active, nextEnemy, isCurrentActiveBattle)
  if (!enemyAlive) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
    await actions.processFaint(ctx, 'enemy')
    return
  }

  if (!isCurrentActiveBattle()) return
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
}

export interface PlayerFaintResolutionActions {
  terminateBattle: (ctx: BattleContext, winParam: boolean, fled?: boolean) => Promise<void>
}

function isEnemyFaintedAndBattleEnds(active: BattleState): boolean {
  if (active.over) return true
  const isWild = !active.isTrainer && !active.isGym && !active.isPvP
  const enemyHasHealthy = Boolean(active.enemyTeam?.some((p: Pokemon) => p && p.hp > 0))
  const enemyIsDown = !active.enemy || active.enemy.hp <= 0
  return enemyIsDown && (isWild || !enemyHasHealthy)
}

function activatePlayerSwitchPrompt(ctx: BattleContext): void {
  ctx.addLog('¡Elige a tu próximo Pokémon!', 'log-info', 'player')
  ctx.faintedSides.value.delete('player')
  ctx.uiStore.isBattleSwitchForced = true
  ctx.isProcessing.value = false
  ctx.isIntroAnimating.value = false
}

export async function processPlayerFaintSequence(
  ctx: BattleContext,
  pokemon: Pokemon | null,
  actions: PlayerFaintResolutionActions
): Promise<void> {
  const active = ctx.activeBattle.value
  if (!active) return

  const { BATTLE_STATES, BATTLE_SUBSTATES, fsm } = ctx
  const pokeName = pokemon?.name || active?._lastActivePlayer?.name || 'Tu Pokémon'
  ctx.addLog(`¡${pokeName} se ha debilitado!`, 'log-player', pokemon || undefined)

  if (pokemon) {
    const { applyFriendshipDelta } = await import('@/logic/pokemon/friendshipLogic')
    applyFriendshipDelta(pokemon, -1, ctx.addLog)
  }

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.RECALL_FLOW)
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL)
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.RENDER_BALL)
  if (ctx.animations?.handleFaintAnim) {
    await ctx.animations.handleFaintAnim({ side: 'player', isFaint: true })
  } else {
    await gsapSleep(FAINT_ANIMATION_FALLBACK_DELAY_MS)
  }

  syncTeamHP(ctx)
  if (active) active._lastActivePlayer = pokemon

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT)
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.FADEOUT_BALL)
  if (ctx.animations?.playBallFadeOut) {
    await ctx.animations.playBallFadeOut('player')
  }
  active.player = null

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.CHECK_TEAM)
  const team = (ctx.gs.state?.team && ctx.gs.state.team.length > 0)
    ? ctx.gs.state.team
    : (active.playerTeam || [])
  const nextPoke = team.find((p: Pokemon) => p && p.hp > 0 && !p.fainted)

  if (!nextPoke) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ALL_FAINTED)
    active.over = true
    ctx.addLog('¡No te quedan Pokémon sanos!', 'log-error', 'player')
    await gsapSleep(DEFEAT_SCREEN_DELAY_MS)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.DEFEAT_SCREEN)
    await actions.terminateBattle(ctx, false)
    return
  }

  if (isEnemyFaintedAndBattleEnds(active)) {
    ctx.faintedSides.value.delete('player')
    active.over = true
    await actions.terminateBattle(ctx, true)
    return
  }

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.HAS_HEALTHY)
  activatePlayerSwitchPrompt(ctx)
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SWITCH_MENU)
}
