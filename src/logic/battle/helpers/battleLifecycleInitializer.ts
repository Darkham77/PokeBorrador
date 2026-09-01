import { handleEntryAbilities } from '../battleFlow.ts'
import { getMapBiomeAndTags } from '../biomeHelper.ts'
import { logger } from '../../utils/logger.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { resetActiveBattleState } from '../orchestratorStateHelper.ts'
import { processRocketStealMechanics } from '../orchestratorRocketHelper.ts'
import { initWorkerForBattle } from '../orchestratorWorkerInitHelper.ts'
import type { BattleOptions } from '../orchestrator.ts'
import { requireMapRouteId } from '@/data/world/map-assets'
import {
  runTrainerIntroSequence,
  runWildSearchIntroSequence,
  runWildGrassIntroSequence
} from './battleIntroSequencer.ts'

/**
 * Visual initialization and first turn setup.
 */
export async function initBattleSequence(
  ctx: BattleContext,
  options?: Partial<BattleOptions & { initialEnemy: Pokemon | null; initialPlayer: Pokemon | null }>
) {
  const initialEnemy = options?.initialEnemy || ctx.activeBattle.value?.enemy || ctx.activeBattle.value?.enemyTeam?.[0] || null
  const initialPlayer = options?.initialPlayer || ctx.activeBattle.value?.player || ctx.gs.state.team.find((p: Pokemon) => p && p.hp > 0) || ctx.gs.state.team[0] || null
  if (!initialPlayer || !initialEnemy) return
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  const battleState = ctx.activeBattle.value
  if (!battleState?.locationId) {
    throw new Error('[Battle] Active battle locationId is missing during initialization')
  }
  const locationId = requireMapRouteId(battleState.locationId)
  const isTrainer = !!battleState?.isTrainer
  const isGym = !!battleState?.isGym
  const wasSearching = options?.wasSearching !== undefined ? !!options.wasSearching : !!battleState?.wasSearching
  const trainerName = battleState?.trainerName

  await resetActiveBattleState(ctx, initialPlayer, isGym)
  if (ctx.activeBattle.value) {
    ctx.activeBattle.value.enemy = initialEnemy
    ctx.activeBattle.value.wasSearching = wasSearching
  }
  if (!wasSearching && ctx.animations?.resetAll) {
    ctx.animations.resetAll()
  }

  // Inicialización del Web Worker de Showdown en paralelo con la intro visual
  const workerInitPromise = initWorkerForBattle(ctx, initialPlayer, initialEnemy)

  // Clear volatile status on all player team members and the initial enemy
  ctx.gs.state.team.forEach((p: Pokemon) => {
    if (p) ctx.clearVolatileStatus(p)
  })
  if (initialEnemy) {
    ctx.clearVolatileStatus(initialEnemy)
  }

  ctx.isIntroAnimating.value = true
  if (!wasSearching) {
    await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PRELOAD_FINAL_COORDS)
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.ENTRY_ANIM)
  }

  const currentPlayer = ctx.activeBattle.value?.player
  const needsCall = !currentPlayer || (currentPlayer.uid !== initialPlayer.uid)

  if (isTrainer) {
    await runTrainerIntroSequence(ctx, initialPlayer, initialEnemy, wasSearching, trainerName, battleState, needsCall)
  } else if (wasSearching) {
    await runWildSearchIntroSequence(ctx, initialPlayer, initialEnemy, needsCall)
  } else {
    await runWildGrassIntroSequence(ctx, initialPlayer, initialEnemy, needsCall)
  }

  await fsm.transition(BATTLE_STATES.REORDER_TEAM, null)
  
  window.dispatchEvent(new Event('resize'))
  
  ctx.attackerSide.value = null
  ctx.activeMove.value = null
  
  const { activeBiome, mapTags } = getMapBiomeAndTags(locationId)
  logger.info('Orchestrator', `Combat started in biome: ${activeBiome} (Tags: ${mapTags.join(', ') || 'ninguno'}) for location: ${locationId}`)
  
  handleEntryAbilities(initialPlayer, initialEnemy, ctx.playerStages.value, ctx.enemyStages.value, ctx.addLog, ctx.activeBattle.value?.weather?.type)
  
  if (isTrainer) await ctx.gs.scheduleSave()

  await processRocketStealMechanics(ctx, isTrainer, isGym, trainerName || '', battleState)

  // Esperar a que el worker esté listo (generalmente resuelto desde antes de que termine el salto)
  await workerInitPromise

  ctx.isIntroAnimating.value = false
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
  if (ctx.persistBattle) ctx.persistBattle()
  ctx.isIntroAnimating.value = false
}
