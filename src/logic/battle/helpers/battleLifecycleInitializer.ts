import { handleEntryAbilities } from '../battleFlow.ts'
import { getMapBiomeAndTags } from '../biomeHelper.ts'
import { logger } from '../../utils/logger.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { resetActiveBattleState } from '../orchestratorStateHelper.ts'
import { processRocketStealMechanics } from '../orchestratorRocketHelper.ts'
import { initWorkerForBattle } from '../orchestratorWorkerInitHelper.ts'
import type { BattleOptions } from '../orchestrator.ts'
import { requireMapRouteId, type MapRouteId } from '@/data/world/map-assets'
import {
  runTrainerIntroSequence,
  runWildSearchIntroSequence,
  runWildGrassIntroSequence
} from './battleIntroSequencer.ts'

function resolveInitialCombatants(
  ctx: BattleContext,
  options?: Partial<BattleOptions & { initialEnemy: Pokemon | null; initialPlayer: Pokemon | null }>
): { initialPlayer: Pokemon | null; initialEnemy: Pokemon | null } {
  const initialEnemy = options?.initialEnemy || ctx.activeBattle.value?.enemy || ctx.activeBattle.value?.enemyTeam?.[0] || null
  const initialPlayer = options?.initialPlayer || ctx.activeBattle.value?.player || ctx.gs.state.team.find((p: Pokemon) => p && p.hp > 0) || ctx.gs.state.team[0] || null
  return { initialPlayer, initialEnemy }
}

function clearBattleVolatiles(ctx: BattleContext, initialEnemy: Pokemon | null): void {
  ctx.gs.state.team.forEach((p: Pokemon) => {
    if (p) ctx.clearVolatileStatus(p)
  })
  if (initialEnemy) {
    ctx.clearVolatileStatus(initialEnemy)
  }
}

async function executeIntroByMode(
  ctx: BattleContext,
  initialPlayer: Pokemon,
  initialEnemy: Pokemon,
  isTrainer: boolean,
  wasSearching: boolean,
  trainerName: string | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  battleState: any
): Promise<void> {
  const currentPlayer = ctx.activeBattle.value?.player
  const needsCall = !currentPlayer || (currentPlayer.uid !== initialPlayer.uid)

  if (isTrainer) {
    await runTrainerIntroSequence(ctx, initialPlayer, initialEnemy, wasSearching, trainerName, battleState, needsCall)
  } else if (wasSearching) {
    await runWildSearchIntroSequence(ctx, initialPlayer, initialEnemy, needsCall)
  } else {
    await runWildGrassIntroSequence(ctx, initialPlayer, initialEnemy, needsCall)
  }
}

function setupActiveBattleEnemy(
  ctx: BattleContext,
  initialEnemy: Pokemon,
  isTrainer: boolean,
  isGym: boolean,
  wasSearching: boolean
): void {
  const activeBattle = ctx.activeBattle.value
  if (!activeBattle) return

  activeBattle.enemy = (!isTrainer && !isGym) ? initialEnemy : null
  activeBattle.wasSearching = wasSearching
  if (!isTrainer && !isGym && !activeBattle.isPvP) {
    activeBattle.enemyTeam = [initialEnemy]
  }
}

async function runPreIntroTransitions(ctx: BattleContext, wasSearching: boolean): Promise<void> {
  ctx.isIntroAnimating.value = true
  if (!wasSearching) {
    await ctx.fsm.transition(ctx.BATTLE_STATES.INITIALIZING, ctx.BATTLE_SUBSTATES.PRELOAD_FINAL_COORDS)
    await ctx.fsm.transition(ctx.BATTLE_STATES.FIRST_INTRO, ctx.BATTLE_SUBSTATES.ENTRY_ANIM)
  }
}

async function applyPostIntroSetup(
  ctx: BattleContext,
  initialPlayer: Pokemon,
  initialEnemy: Pokemon,
  locationId: MapRouteId,
  isTrainer: boolean,
  isGym: boolean,
  trainerName: string | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  battleState: any
): Promise<void> {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('resize'))
  }

  ctx.attackerSide.value = null
  ctx.activeMove.value = null

  const { activeBiome, mapTags } = getMapBiomeAndTags(locationId)
  logger.info('Orchestrator', `Combat started in biome: ${activeBiome} (Tags: ${mapTags.join(', ') || 'ninguno'}) for location: ${locationId}`)

  handleEntryAbilities(initialPlayer, initialEnemy, ctx.playerStages.value, ctx.enemyStages.value, ctx.addLog, ctx.activeBattle.value?.weather?.type)

  if (isTrainer) await ctx.gs.scheduleSave()

  await processRocketStealMechanics(ctx, isTrainer, isGym, trainerName || '', battleState)
}

async function finalizeBattleInitialization(ctx: BattleContext, workerInitPromise: Promise<void>): Promise<void> {
  await workerInitPromise
  ctx.isIntroAnimating.value = false
  await ctx.fsm.transition(ctx.BATTLE_STATES.ACTIVE_BATTLE, ctx.BATTLE_SUBSTATES.WAIT_INPUT)
  if (ctx.persistBattle) ctx.persistBattle()
  ctx.isIntroAnimating.value = false
}

/**
 * Visual initialization and first turn setup.
 */
export async function initBattleSequence(
  ctx: BattleContext,
  options?: Partial<BattleOptions & { initialEnemy: Pokemon | null; initialPlayer: Pokemon | null }>
) {
  const { initialPlayer, initialEnemy } = resolveInitialCombatants(ctx, options)
  if (!initialPlayer || !initialEnemy) return

  const battleState = ctx.activeBattle.value
  if (!battleState?.locationId) {
    throw new Error('[Battle] Active battle locationId is missing during initialization')
  }
  const locationId = requireMapRouteId(battleState.locationId)
  const isTrainer = !!battleState.isTrainer
  const isGym = !!battleState.isGym
  const wasSearching = options?.wasSearching !== undefined ? !!options.wasSearching : !!battleState.wasSearching
  const trainerName = battleState.trainerName

  await resetActiveBattleState(ctx, initialPlayer, isGym)
  setupActiveBattleEnemy(ctx, initialEnemy, isTrainer, isGym, wasSearching)

  if (!wasSearching && ctx.animations?.resetAll) {
    ctx.animations.resetAll()
  }

  // Inicialización del Web Worker de Showdown en paralelo con la intro visual
  const workerInitPromise = initWorkerForBattle(ctx, initialPlayer, initialEnemy)

  clearBattleVolatiles(ctx, initialEnemy)

  await runPreIntroTransitions(ctx, wasSearching)
  await executeIntroByMode(ctx, initialPlayer, initialEnemy, isTrainer, wasSearching, trainerName, battleState)
  await ctx.fsm.transition(ctx.BATTLE_STATES.REORDER_TEAM, null)

  await applyPostIntroSetup(ctx, initialPlayer, initialEnemy, locationId, isTrainer, isGym, trainerName, battleState)
  await finalizeBattleInitialization(ctx, workerInitPromise)
}
