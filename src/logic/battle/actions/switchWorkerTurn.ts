import type { BattleContext } from '@/types/battle/battleContext'
import type { BattleSide, ShowdownPlayerRequest, BattleStages } from '@/types/battle/battle'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'
import { ShowdownTeamResolver } from '../showdownTeamResolver.ts'

interface SwitchTurnChoices {
  p1Choice: string
  p2Choice: string
  p1Skip: boolean
  p2Skip: boolean
}

interface DebugResolvedChoices extends SwitchTurnChoices {
  earlyReturn?: boolean
}

async function validateWorkerAndTransition(ctx: BattleContext): Promise<void> {
  const { fsm, BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const { getShowdownWorker } = await import('../showdownWorkerClient.ts')
  const worker = getShowdownWorker()
  if (!worker) {
    throw new Error('[switchAction] Showdown Web Worker is not available to process switch turn.')
  }

  console.debug('[switchAction] transitioning FSM to BUILD_QUEUE...')
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.BUILD_QUEUE)
  console.debug('[switchAction] transitioning FSM to POP_ACTION...')
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POP_ACTION)
}

function resolveEnemyReactionMove(
  enemy: Pokemon,
  player: Pokemon,
  playerStages: BattleStages,
  isWild: boolean,
  ctx: BattleContext,
  decideMoveFn: (enemy: Pokemon, player: Pokemon, stages: BattleStages, isWild?: boolean, store?: BattleContext) => Move | null
): Move | null {
  const isLocked = (enemy.volatileCounters?.['lockedmove'] ?? 0) > 0
  if (isLocked && enemy.lastMove) {
    return enemy.lastMove
  }
  return decideMoveFn(enemy, player, playerStages, isWild, ctx)
}

async function resolveInitialSwitchChoices(
  ctx: BattleContext,
  active: NonNullable<BattleContext['activeBattle']['value']>,
  newPokeUid: string,
  side: BattleSide
): Promise<{ p1Choice: string; p2Choice: string }> {
  console.debug('[switchAction] resolving slot...')
  const req = side === 'player' ? active.playerRequest : active.enemyRequest
  const slot = ShowdownTeamResolver.getShowdownSlotForUid(req, newPokeUid)
  const isWild = !active.isTrainer && !active.isGym

  if (side === 'player' && active.enemy && active.player) {
    const { decideEnemyMove } = await import('../ai/battleAI.ts')
    const { computeP2Choice } = await import('../battleTurnChoiceHelper.ts')
    const stages = (ctx.playerStages?.value ?? {}) as BattleStages
    const eMove = resolveEnemyReactionMove(
      active.enemy,
      active.player,
      stages,
      isWild,
      ctx,
      decideEnemyMove
    )
    const p2Choice = await computeP2Choice(ctx, active.player, active.enemy, isWild, false, eMove)
    return {
      p1Choice: `switch ${slot}`,
      p2Choice
    }
  }

  return {
    p1Choice: '',
    p2Choice: `switch ${slot}`
  }
}

async function resolveReplayChoices(
  debugObj: unknown,
  initial: SwitchTurnChoices,
  side: BattleSide
): Promise<DebugResolvedChoices> {
  if (typeof debugObj !== 'object' || debugObj === null) {
    return initial
  }
  const { ShowdownBattleRunner } = await import('../helpers/showdownBattleRunner.ts')
  const certifiedP1Choice = ShowdownBattleRunner.requireHistoryChoice(debugObj, 'p1')
  const certifiedP2Choice = ShowdownBattleRunner.requireHistoryChoice(debugObj, 'p2')
  const historyIdx = Reflect.get(debugObj, 'replayHistoryIdx')
  console.debug(`[switchWorkerTurn] side=${side}, idx=${historyIdx}, certifiedP1Choice="${certifiedP1Choice}", certifiedP2Choice="${certifiedP2Choice}"`)

  if (side === 'player' && !certifiedP1Choice.startsWith('switch ')) {
    console.debug(`[switchWorkerTurn] Certified player choice is not a switch (${certifiedP1Choice}) at idx=${historyIdx}. Replacement was already processed in Showdown worker.`)
    return { ...initial, earlyReturn: true }
  }
  if (side === 'enemy' && !certifiedP2Choice.startsWith('switch ')) {
    console.debug(`[switchWorkerTurn] Certified enemy choice is not a switch (${certifiedP2Choice}). Replacement was already processed in Showdown worker.`)
    return { ...initial, earlyReturn: true }
  }
  return {
    p1Choice: certifiedP1Choice,
    p2Choice: certifiedP2Choice,
    p1Skip: certifiedP1Choice === '',
    p2Skip: certifiedP2Choice === ''
  }
}

function resolveMockEnemyChoice(initialP2Choice: string, p2Skip: boolean): string {
  if (typeof window === 'undefined') {
    return initialP2Choice
  }

  const debug = window.__VITE_DEBUG__
  if (debug?.nextEnemyChoice) {
    if (!p2Skip) {
      const choice = debug.nextEnemyChoice
      console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Intercepted enemy choice via nextEnemyChoice in switchAction: ${choice}`)
      debug.nextEnemyChoice = undefined
      return choice
    }
    console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Bypassed nextEnemyChoice interception in switchAction because P2 is in wait state.`)
    return initialP2Choice
  }

  if (debug?.enemyChoicesQueue?.length) {
    const queuedChoice = debug.enemyChoicesQueue.shift()
    if (queuedChoice) {
      console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Intercepted enemy choice via queue in switchAction: ${queuedChoice}`)
      return queuedChoice
    }
  }

  return initialP2Choice
}

async function resolveDebugOrReplayChoices(
  initial: SwitchTurnChoices,
  side: BattleSide
): Promise<DebugResolvedChoices> {
  if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.isScriptedReplayMode) {
    return resolveReplayChoices(window.__VITE_DEBUG__, initial, side)
  }

  return {
    ...initial,
    p2Choice: resolveMockEnemyChoice(initial.p2Choice, initial.p2Skip)
  }
}

function normalizePassChoices(choices: SwitchTurnChoices): SwitchTurnChoices {
  let { p1Choice, p2Choice, p1Skip, p2Skip } = choices
  if (p1Choice === 'pass') {
    p1Choice = ''
    p1Skip = true
  }
  if (p2Choice === 'pass') {
    p2Choice = ''
    p2Skip = true
  }
  return { p1Choice, p2Choice, p1Skip, p2Skip }
}

function rollbackOnSwitchFailure(
  ctx: BattleContext,
  oldPoke: { uid: string } | null,
  side: BattleSide
): void {
  const active = ctx.activeBattle.value
  if (!oldPoke || !active) return
  if (side === 'player') {
    active.player = oldPoke as Pokemon
    const oldIndex = (ctx.gs.state.team || []).findIndex(p => p?.uid === oldPoke.uid)
    if (oldIndex !== -1) {
      active.playerTeamIndex = oldIndex
    }
  } else {
    active.enemy = oldPoke as Pokemon
  }
}

async function executeWorkerTurnWithRollback(
  ctx: BattleContext,
  choices: SwitchTurnChoices,
  oldPoke: { uid: string } | null,
  side: BattleSide
) {
  try {
    const { executeTurnInWorker } = await import('../showdownWorkerClient.ts')
    console.debug('[switchAction] calling executeTurnInWorker...', choices)
    const result = await executeTurnInWorker(choices.p1Choice, choices.p2Choice, choices.p1Skip, choices.p2Skip)
    if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.isScriptedReplayMode) {
      const { ShowdownBattleRunner } = await import('../helpers/showdownBattleRunner.ts')
      ShowdownBattleRunner.advanceHistoryAfterAcceptedTurn(window.__VITE_DEBUG__)
    }
    console.debug(`[E2E-DEBUG-SWITCH-RESULT] logs: ${JSON.stringify(result.logs)}`)
    return result
  } catch (error) {
    console.error('[switchAction] executeTurnInWorker thrown:', error)
    rollbackOnSwitchFailure(ctx, oldPoke, side)
    ctx.persistBattle()
    throw error
  }
}

async function applyTurnLogsAndSync(
  ctx: BattleContext,
  active: NonNullable<BattleContext['activeBattle']['value']>,
  result: { logs: string[]; p1Request?: ShowdownPlayerRequest; p2Request?: ShowdownPlayerRequest },
  newPoke: { uid: string },
  side: BattleSide
): Promise<void> {
  const { fsm, BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.APPLY_MOVE)

  active.playerRequest = result.p1Request
  active.enemyRequest = result.p2Request

  const propKey = side === 'player' ? 'switchingToPlayer' : 'switchingToEnemy'
  Reflect.set(active, propKey, newPoke)

  const { parseShowdownLogLine, filterShowdownLogs } = await import('../showdownBridge.ts')
  const filteredLogs = filterShowdownLogs(result.logs)
  for (const logLine of filteredLogs) {
    await parseShowdownLogLine(ctx, logLine, filteredLogs)
  }

  const { syncTeamsFromLastWorkerState } = await import('../showdownWorkerClient.ts')
  await syncTeamsFromLastWorkerState()
  Reflect.deleteProperty(active, propKey)
}

async function resolveEnemyFaint(ctx: BattleContext, enemyHp: number | undefined): Promise<boolean> {
  if (enemyHp === undefined || enemyHp > 0) return false
  const { processFaint } = await import('../resolution.ts')
  await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
  await processFaint(ctx, 'enemy')
  return true
}

async function resolvePlayerFaint(ctx: BattleContext, playerHp: number | undefined): Promise<boolean> {
  if (playerHp === undefined || playerHp > 0) return false
  if (ctx.activeBattle.value?.over) return false
  const { processFaint } = await import('../resolution.ts')
  await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
  await processFaint(ctx, 'player')
  return true
}

async function handleFaintResolution(
  ctx: BattleContext,
  active: NonNullable<BattleContext['activeBattle']['value']>
): Promise<boolean> {
  const enemyFainted = await resolveEnemyFaint(ctx, active.enemy?.hp)
  const playerFainted = await resolvePlayerFaint(ctx, active.player?.hp)
  return enemyFainted || playerFainted
}

async function handleEscapeResolution(
  ctx: BattleContext,
  active: NonNullable<BattleContext['activeBattle']['value']>
): Promise<void> {
  if (!active.over || !active.fled) {
    return
  }
  await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.PLAY_ESCAPE_ANIM)
  if (ctx.animations?.awaitTween) {
    await ctx.animations.awaitTween('escape-enemy')
  }
  await ctx.endBattle(false, true)
}

async function handlePostSwitchResolution(
  ctx: BattleContext
): Promise<void> {
  const { fsm, BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EVAL_HP)

  const active = ctx.activeBattle.value
  if (!active) return

  const handledFaint = await handleFaintResolution(ctx, active)
  if (handledFaint) {
    return
  }

  await handleEscapeResolution(ctx, active)
}

async function resolvePlayerOrEnemyChoices(
  ctx: BattleContext,
  active: NonNullable<BattleContext['activeBattle']['value']>,
  newPokeUid: string,
  side: BattleSide
): Promise<DebugResolvedChoices> {
  const initial = await resolveInitialSwitchChoices(ctx, active, newPokeUid, side)
  const isPlayer = side === 'player'
  return resolveDebugOrReplayChoices(
    { ...initial, p1Skip: !isPlayer, p2Skip: false },
    side
  )
}

export async function processNonForcedSwitchWorkerTurn(
  ctx: BattleContext,
  newPoke: { uid: string },
  oldPoke: { uid: string } | null,
  side: BattleSide = 'player'
): Promise<void> {
  await validateWorkerAndTransition(ctx)

  const active = ctx.activeBattle.value
  if (!active?.enemy || !active?.player) {
    console.warn('[switchAction] activeBattle or participants are null!')
    await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.WAIT_INPUT)
    return
  }

  const choices = await resolvePlayerOrEnemyChoices(ctx, active, newPoke.uid, side)
  if (choices.earlyReturn) {
    return
  }

  const normalized = normalizePassChoices(choices)
  const result = await executeWorkerTurnWithRollback(ctx, normalized, oldPoke, side)
  await applyTurnLogsAndSync(ctx, active, result, newPoke, side)
  await handlePostSwitchResolution(ctx)
}
