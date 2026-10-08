import { logger } from '../utils/logger.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import {
  showdownWorker,
  setShowdownWorker,
  getSimulatorState,
  executeTurnInWorker,
  isPlayerTrappedInWorker,
  testResetShowdownWorker
} from './showdownWorkerClient.ts';
import { initBattleSequence } from './helpers/battleLifecycleInitializer.ts';
import type { BattleOptions } from '@/types/system/stores.ts';
export type { BattleOptions };

export {
  showdownWorker,
  setShowdownWorker,
  getSimulatorState,
  executeTurnInWorker,
  isPlayerTrappedInWorker,
  testResetShowdownWorker,
  initBattleSequence
};

import {
  extractLocationAndBiome,
  extractBattleConfig,
  resolveBattleWeather,
  calculateFishingRarity,
  buildInitialBattleState,
  generateNpcInventoryForBattle
} from './orchestratorConfigHelper.ts';

import {
  validatePlayerTeamLegality,
  cleanTeamVolatileStatus,
  setupSeatsProtocol,
  checkIsDebugOrReplay,
  handleOngoingBattleConflict,
  registerEncounterPokedex,
  setupDebugLoopPokemon,
  pickActivePlayerTeam,
  resolveStartingEnemyTeam
} from './orchestratorTeamHelper.ts';

/**
 * Orchestrates the start of a battle.
 * @param {BattleContext} ctx - The battle store context (refs, state, etc)
 */
export async function startBattleSequence(ctx: BattleContext, enemyPoke: Pokemon, options: BattleOptions = {}) {
  // ATOMIC ENTRY GUARD: Immediately put FSM into CONTEXT_SETUP before any imports or setup
  if (ctx.fsm.currentState.value !== ctx.BATTLE_STATES.CONTEXT_SETUP) {
    await ctx.fsm.transition(ctx.BATTLE_STATES.CONTEXT_SETUP, ctx.BATTLE_SUBSTATES.RECEIVE_CONFIG)
  }

  const loc = extractLocationAndBiome(options, ctx.gs.state.map?.currentMap)
  const cfg = extractBattleConfig(options)

  const tagsStr = loc.mapTags.join(', ') || 'ninguno'
  logger.info('Orchestrator', `startBattleSequence starting... Biome: ${loc.activeBiome} (Tags: ${tagsStr}) for location: ${loc.resolvedLocationId}`, { isTrainer: cfg.isTrainer, isGym: cfg.isGym, wasSearchingOpt: cfg.wasSearchingOpt })

  const effectivePlayerTeam = pickActivePlayerTeam(cfg, ctx.gs.state.team)
  const playerPoke = effectivePlayerTeam.find((p: Pokemon) => p.hp > 0 && !p.onMission && !p.onDefense)
  if (!playerPoke) {
    const { useUIStore } = await import('@/stores/ui')
    useUIStore().notify('No tienes Pokémon sanos para combatir', '❌')
    return
  }

  const isDebugOrReplay = checkIsDebugOrReplay(options.isDebug)
  const isPlayerLegal = await validatePlayerTeamLegality(effectivePlayerTeam, isDebugOrReplay)
  if (!isPlayerLegal) return

  await handleOngoingBattleConflict(ctx)

  const wasSearching = cfg.wasSearchingOpt !== null ? cfg.wasSearchingOpt : false
  logger.info('Orchestrator', `wasSearching evaluated: ${wasSearching} (wasSearchingOpt: ${cfg.wasSearchingOpt})`)

  const { validatePokemon } = await import('@/logic/pokemon/pokemonFactory')
  const finalEnemyPoke = enemyPoke
  const { finalEnemyTeam, startingEnemyPoke } = resolveStartingEnemyTeam(finalEnemyPoke, cfg.enemyTeam)

  validatePokemon(playerPoke, isDebugOrReplay)
  finalEnemyTeam.forEach((p: Pokemon) => p && validatePokemon(p, isDebugOrReplay))

  cleanTeamVolatileStatus(effectivePlayerTeam, cfg.isPvP, ctx)
  cleanTeamVolatileStatus(finalEnemyTeam, cfg.isPvP, ctx)

  const maxEnemyLv = Math.max(...finalEnemyTeam.map(p => p?.level || 1))
  const npcInvResult = generateNpcInventoryForBattle(cfg, maxEnemyLv)
  const { weather } = resolveBattleWeather(options, cfg, loc)

  ctx.activeBattle.value = buildInitialBattleState({
    cfg, loc, options, playerPoke, startingEnemyPoke, finalEnemyPoke, finalEnemyTeam, effectivePlayerTeam, maxEnemyLv,
    enemyInventory: npcInvResult?.inventory,
    enemyMoney: npcInvResult?.remainingMoney,
    weather, wasSearching, ctx
  })

  setupDebugLoopPokemon(ctx, enemyPoke, cfg.battleOptions.isDebug, wasSearching)
  registerEncounterPokedex(ctx, enemyPoke, cfg)
  ctx.persistBattle()

  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  ctx.isIntroAnimating.value = true
  setupSeatsProtocol(ctx, cfg.isTrainer, cfg.isGym, finalEnemyPoke, effectivePlayerTeam)
  ctx.clearLogs()

  logger.debug('Orchestrator', 'Transitions starting...')
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.RECEIVE_CONFIG)
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.APPLY_ITEM_MODIFIERS)

  // Weight Calculation
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.WEIGHT_CALCULATION)
  const rarity = calculateFishingRarity(cfg.minigame, loc.locationMap, finalEnemyPoke)
  if (ctx.activeBattle.value) ctx.activeBattle.value.rarity = rarity

  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.INJECT_FILTERS)
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.READY_FOR_GEN)
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.VACATE_ALL_SEATS)

  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.CHECK_CONTEXT)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.ASYNC_THREAD)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.GEN_TEAMS)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.MARK_EVENT)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PRELOAD_FINAL_COORDS, 0)
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.SET_SEARCH_FLAG)
  logger.info('Orchestrator', `reached after SET_SEARCH_FLAG transition. wasSearching = ${wasSearching}`)

  if (wasSearching) {
    const { processSearchPhaseSequence } = await import('./orchestratorSearchPhaseHelper.ts')
    const handled = await processSearchPhaseSequence(ctx, finalEnemyPoke, cfg.minigame, cfg.isTrainer, cfg.isGym)
    if (handled) return
  }

  logger.info('Orchestrator', 'Calling initBattleSequence...')
  await initBattleSequence(ctx, {
    locationId: loc.resolvedLocationId,
    isTrainer: cfg.isTrainer,
    trainerName: cfg.trainerName,
    isGym: cfg.isGym,
    gymId: cfg.resolvedGymId,
    wasSearching,
    initialEnemy: startingEnemyPoke,
    initialPlayer: playerPoke
  })
}

export { restoreBattleState } from './orchestratorRestoreHelper.ts'
