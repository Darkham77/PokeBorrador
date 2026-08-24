import { gameBus } from '@/logic/events/gameBus'
import { handleEntryAbilities } from '../battleFlow.ts'
import { getMapBiomeAndTags } from '../biomeHelper.ts'
import { logger } from '../../utils/logger.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { resetActiveBattleState } from '../orchestratorStateHelper.ts'
import { processRocketStealMechanics } from '../orchestratorRocketHelper.ts'
import { executePokemonCallSequence } from '../orchestratorCallSequence.ts'
import { initWorkerForBattle } from '../orchestratorWorkerInitHelper.ts'
import type { BattleOptions } from '../orchestrator.ts'
import { requireMapRouteId } from '@/data/world/map-assets'

/**
 * Visual initialization and first turn setup.
 */
export async function initBattleSequence(
  ctx: BattleContext,
  options: BattleOptions & { initialEnemy: Pokemon | null; initialPlayer: Pokemon | null }
) {
  const { initialEnemy, initialPlayer } = options
  if (!initialPlayer || !initialEnemy) return;
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  // Leemos TODA la configuración del combate estrictamente del estado inyectado en CONTEXT_SETUP
  const battleState = ctx.activeBattle.value
  if (!battleState?.locationId) {
    throw new Error('[Battle] Active battle locationId is missing during initialization');
  }
  const locationId = requireMapRouteId(battleState.locationId);
  const isTrainer = !!battleState?.isTrainer
  const isGym = !!battleState?.isGym
  const wasSearching = !!battleState?.wasSearching
  const trainerName = battleState?.trainerName

  await resetActiveBattleState(ctx, initialPlayer, isGym)
  if (ctx.activeBattle.value) {
    if (!isTrainer && !isGym) {
      ctx.activeBattle.value.enemy = initialEnemy
    }
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

  if (isTrainer || isGym) {
    if (wasSearching) {
      // Dialogue bubble fades out and trainer retreats in parallel during RETREAT_AND_FADEOUT
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.TRAINER_ENCOUNTER)
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.RETREAT_AND_FADEOUT)
      
      if (ctx.animations?.triggerTrainerRetreat) {
        await ctx.animations.triggerTrainerRetreat()
      }
    } else {
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.ENCOUNTER_TYPE_CHECK)
      
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.TRAINER_ENTRY)
      if (ctx.animations?.triggerTrainerEntry) {
        await ctx.animations.triggerTrainerEntry()
      }

      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.SHOW_DIALOGS)
      if (battleState?.trainerArchetype === 'policeman') {
        ctx.audio.play('siren')
      }

      if (ctx.animations?.triggerTrainerDialogs) {
        await ctx.animations.triggerTrainerDialogs()
      }

      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.TRAINER_ENCOUNTER)
      await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.RETREAT_AND_FADEOUT)
      
      if (ctx.animations?.triggerTrainerRetreat) {
        await ctx.animations.triggerTrainerRetreat()
      }
    }

    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.POKEMON_CALL)
    if (ctx.activeBattle.value) {
      ctx.activeBattle.value.enemy = initialEnemy
    }

    const enemySendOutPromise = ctx.animations?.handleReleaseRequest
      ? ctx.animations.handleReleaseRequest({ side: 'enemy', pokemon: initialEnemy })
      : Promise.resolve()
    await enemySendOutPromise

    await executePokemonCallSequence(ctx, initialPlayer, needsCall)

  } else if (wasSearching) {
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.ENCOUNTER_TYPE_CHECK)
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.WILD_ENCOUNTER)
    gameBus.emit('PLAY_CRY', { name: initialEnemy.id })
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.CHECK_BINOCULARS)
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.PARALLEL_JUMP)
    
    // Capture current (wrong-order) pokemon BEFORE overwriting activeBattle.player
    const oldPlayerBeforeSearch = needsCall ? ctx.activeBattle.value?.player ?? null : null
    const hasRealSwap = oldPlayerBeforeSearch && oldPlayerBeforeSearch.uid !== initialPlayer.uid

    if (needsCall && ctx.activeBattle.value) {
      if (hasRealSwap) ctx.exitingPlayer.value = oldPlayerBeforeSearch
      ctx.activeBattle.value.player = initialPlayer
    }

    const promises: Promise<void>[] = []
    if (ctx.animations?.triggerSearchEncounter) {
      fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.JUMP_SHADOW)
      promises.push(ctx.animations.triggerSearchEncounter())
    }

    if (needsCall && ctx.animations?.handleReleaseRequest) {
      if (hasRealSwap && ctx.animations.handleCatchRequest) {
        promises.push(ctx.animations.handleCatchRequest({ side: 'player', pokemon: oldPlayerBeforeSearch }))
      }
      promises.push(ctx.animations.handleReleaseRequest({ side: 'player', pokemon: initialPlayer }))
    }

    if (promises.length > 0) {
      await Promise.all(promises)
    }
    if (hasRealSwap) ctx.exitingPlayer.value = null
  } else {
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.ENCOUNTER_TYPE_CHECK)
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.WILD_ENTRY)
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.PARALLEL_PREP, 0)
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.BUSH_VISIBLE)
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.SILHOUETTE_MODE)

    if (ctx.activeBattle.value) {
      ctx.activeBattle.value.enemy = initialEnemy
    }

    await executePokemonCallSequence(ctx, initialPlayer, needsCall)

  }

  await fsm.transition(BATTLE_STATES.REORDER_TEAM, null)
  
  window.dispatchEvent(new Event('resize'))
  
  ctx.attackerSide.value = null
  ctx.activeMove.value = null
  
  const { activeBiome, mapTags } = getMapBiomeAndTags(locationId)
  const startMsg = isTrainer || isGym 
    ? `¡${trainerName} te desafía!` 
    : `¡Un ${initialEnemy.name} salvaje apareció!`
  
  ctx.addLog(startMsg, 'log-info', (isTrainer || isGym) ? 'enemy_trainer' : initialEnemy)
  logger.info('Orchestrator', `Combat started in biome: ${activeBiome} (Tags: ${mapTags.join(', ') || 'ninguno'}) for location: ${locationId}`)
  
  handleEntryAbilities(initialPlayer, initialEnemy, ctx.playerStages.value, ctx.enemyStages.value, ctx.addLog, ctx.activeBattle.value?.weather?.type)
  
  if (isTrainer || isGym) await ctx.gs.scheduleSave()

  await processRocketStealMechanics(ctx, isTrainer, isGym, trainerName || '', battleState)

  // Esperar a que el worker esté listo (generalmente resuelto desde antes de que termine el salto)
  await workerInitPromise

  ctx.isIntroAnimating.value = false
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
  if (ctx.persistBattle) ctx.persistBattle()
  ctx.isIntroAnimating.value = false
}
