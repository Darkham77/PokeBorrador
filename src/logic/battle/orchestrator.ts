import { gsapSleep as sleep } from '@/logic/utils/gsapHelpers'
import { toRaw } from 'vue'
import { handleEntryAbilities } from './battleFlow.ts'
import { getMapBiomeAndTags } from './biomeHelper.ts'
import { FIRE_RED_MAPS } from '@/data/world/maps'
import { logger } from '../utils/logger.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { mapVisualToOfficialWeather } from '../weather/weatherGenerationProvider.ts'
import { requireWeatherId } from '../weather/weatherRegistry.ts'
import { ACTIVE_GENERATION } from '../../data/system/constants.ts'
import { generateNPCInventory } from './trainerInventory.ts'
import { resetActiveBattleState } from './orchestratorStateHelper.ts'
import { processRocketStealMechanics } from './orchestratorRocketHelper.ts'
import { executePokemonCallSequence } from './orchestratorCallSequence.ts'
import { requireMapRouteId } from '@/data/world/map-assets'
import { requireGymId } from '@/data/world/gyms'
import { requireNpcArchetype } from '@/logic/utils/npcSpriteRouter'
import type { NpcArchetype } from '@/logic/utils/npcSpriteRouter'
import { requireNpcSpriteId } from '@/data/pokemon/npcSpriteCatalog'
import type { NpcSpriteId } from '@/data/pokemon/npcSpriteCatalog'
import { requirePokemonSpeciesId } from '@/data/pokemon/pokedex'
import {
  showdownWorker,
  setShowdownWorker,
  getSimulatorState,
  executeTurnInWorker,
  isPlayerTrappedInWorker,
  testResetShowdownWorker
} from './showdownWorkerClient.ts';

export {
  showdownWorker,
  setShowdownWorker,
  getSimulatorState,
  executeTurnInWorker,
  isPlayerTrappedInWorker,
  testResetShowdownWorker
};


export interface BattleOptions {
  isGym?: boolean;
  gymId?: string;
  locationId?: string;
  isTrainer?: boolean;
  enemyTeam?: Pokemon[];
  trainerName?: string;
  battleOptions?: Record<string, unknown>;
  isFishing?: boolean;
  isArchaeology?: boolean;
  wasSearching?: boolean;
  isDebug?: boolean;
  over?: boolean;
  turn?: 'player' | 'enemy' | null;
  trainerSprite?: NpcSpriteId;
  trainerArchetype?: NpcArchetype;
  isRival?: boolean;
  difficulty?: string;
  rewardTM?: string;
  cannotEscape?: boolean;
  persistenceMode?: string;
  trainerQuote?: string;
}

/**
 * Orchestrates the start of a battle.
 * @param {BattleContext} ctx - The battle store context (refs, state, etc)
 */
export async function startBattleSequence(ctx: BattleContext, enemyPoke: Pokemon, options: BattleOptions = {}) {
  const { 
    isGym = false, gymId = undefined, locationId = 'plains', 
    isTrainer = false, enemyTeam = undefined, trainerName = 'Entrenador',
    battleOptions = {}, isFishing = false, isArchaeology = false, wasSearching: wasSearchingOpt = options.wasSearching ?? null,
    trainerSprite = undefined, trainerArchetype = undefined, isRival = false,
    difficulty = undefined, rewardTM = undefined, cannotEscape = false,
    trainerQuote = undefined
  } = options

  const optionTrainerArchetype = typeof battleOptions.trainerArchetype === 'string'
    ? requireNpcArchetype(battleOptions.trainerArchetype)
    : undefined
  const resolvedTrainerArchetype = trainerArchetype
    ? requireNpcArchetype(trainerArchetype)
    : optionTrainerArchetype
  const resolvedLocationId = requireMapRouteId(locationId)
  const resolvedGymId = gymId ? requireGymId(gymId) : undefined
  const resolvedDifficulty = difficulty === 'easy' || difficulty === 'normal' || difficulty === 'hard'
    ? difficulty
    : undefined

  const { activeBiome, mapTags } = getMapBiomeAndTags(resolvedLocationId)
  const tagsStr = mapTags.join(', ') || 'ninguno'
  logger.info('Orchestrator', `startBattleSequence starting... Biome: ${activeBiome} (Tags: ${tagsStr}) for location: ${locationId}`, { isTrainer, isGym, wasSearchingOpt })

  const playerPoke = ctx.gs.state.team.find((p) => p.hp > 0 && !p.onMission && !p.onDefense)
  if (!playerPoke) {
    const { useUIStore } = await import('@/stores/ui')
    useUIStore().notify('No tienes Pokémon sanos para combatir', '❌')
    return
  }

  // Si hay un combate activo pero NO está en fase de finalización, forzamos huida.
  if (ctx.isBattleActive.value && !ctx.isFinishing.value && !ctx.activeBattle.value?.over && !ctx.isSearching.value) {
    logger.warn('BATTLE', 'Combate en curso detectado. Forzando huida del anterior.')
    await ctx.endBattle(false, true)
  }

  const wasSearching = wasSearchingOpt !== null ? wasSearchingOpt : false
  logger.info('Orchestrator', `wasSearching evaluated: ${wasSearching} (wasSearchingOpt: ${wasSearchingOpt})`)
  
  const { validatePokemon } = await import('@/logic/pokemon/pokemonFactory')
  const { useMapStore } = await import('@/stores/map')
  const mapStore = useMapStore()
  const finalEnemyPoke = enemyPoke
  const finalEnemyTeam = enemyTeam && enemyTeam.length > 0 ? enemyTeam : [finalEnemyPoke]
  const startingEnemyPoke = finalEnemyTeam.find(p => p && p.hp > 0) || finalEnemyPoke

  validatePokemon(playerPoke)
  finalEnemyTeam.forEach((p: Pokemon) => p && validatePokemon(p))

  // LIMPIEZA DE ESTADOS VOLÁTILES
  ctx.clearVolatileStatus(playerPoke)
  ctx.clearVolatileStatus(startingEnemyPoke)

  // Initial context values
  let rarity = 50

  const maxEnemyLv = Math.max(...finalEnemyTeam.map(p => p?.level || 1))
  const npcInvResult = (isTrainer || isGym)
    ? generateNPCInventory(maxEnemyLv, resolvedDifficulty, isGym, isRival || battleOptions.isRival === true, resolvedTrainerArchetype)
    : null;
  const enemyInventory = npcInvResult?.inventory;
  const enemyMoney = npcInvResult?.remainingMoney;

  const nestedTrainerSprite = typeof battleOptions.trainerSprite === 'string' ? battleOptions.trainerSprite : undefined;
  const resolvedTrainerSprite = trainerSprite || nestedTrainerSprite;

  ctx.activeBattle.value = {
    ...battleOptions,
    enemy: null, 
    player: null, 
    _initialEnemy: structuredClone(toRaw(startingEnemyPoke)),
    _initialPlayer: structuredClone(toRaw(playerPoke)),
    _rewardCombatants: [],
    isGym, gymId: resolvedGymId, isTrainer, enemyTeam: finalEnemyTeam, difficulty: resolvedDifficulty, rewardTM,
    enemyInventory,
    enemyMoney,
    enemyMaxLevel: maxEnemyLv,
    trainerSprite: resolvedTrainerSprite ? requireNpcSpriteId(resolvedTrainerSprite) : undefined,
    trainerArchetype: resolvedTrainerArchetype,
    isRival: isRival || battleOptions.isRival === true,
    playerTeam: ctx.gs.state.team,
    trainerName, locationId: resolvedLocationId,
    quote: trainerQuote || (battleOptions.quote as string) || undefined,
    isCave: FIRE_RED_MAPS.find(m => m.id === resolvedLocationId)?.isCave || false,
    isIndoors: FIRE_RED_MAPS.find(m => m.id === resolvedLocationId)?.isIndoors || false,
    isCrystalCave: FIRE_RED_MAPS.find(m => m.id === resolvedLocationId)?.isCrystalCave || false,
    turn: 'player', turnCount: 1, over: false,
    isFishing, isArchaeology, rarity,
    wasSearching,
    cannotEscape: cannotEscape || (battleOptions.cannotEscape as boolean) || false,
    weather: { 
      type: isGym ? requireWeatherId('none') : requireWeatherId(mapVisualToOfficialWeather(mapStore.currentWeather, ACTIVE_GENERATION)), 
      visual: isGym ? 'clear' : mapStore.currentWeather, 
      turns: -1 
    },
    playerTeamIndex: ctx.gs.state.team.indexOf(playerPoke),
    enemyTeamIndex: 0,
    participants: [playerPoke.uid], learnQueue: [],
    escapeAttempts: 0,
    playerSideConditions: {},
    enemySideConditions: {},
  }

  if (battleOptions.isDebug) {
    ctx.debugLoopPokemon.value = JSON.parse(JSON.stringify(enemyPoke)) as Pokemon
    if (!wasSearching) ctx.debugLoopPokemon.value = null
  }

  ctx.gs.registerPokedex(enemyPoke.id)
  if (isTrainer && enemyTeam) enemyTeam.forEach((p: Pokemon) => ctx.gs.registerPokedex(p.id))
  ctx.persistBattle()
  
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  ctx.isIntroAnimating.value = true

  // PROTOCOLO DE ASIENTOS
  if (ctx.activeBattle.value) {
    // Si es combate salvaje, el Pokémon enemigo ya ocupa el asiento desde el inicio.
    // Si es entrenador o gimnasio, el asiento inicia vacío hasta el envío visual (POKEMON_CALL).
    ctx.activeBattle.value.enemy = (!isTrainer && !isGym) ? finalEnemyPoke : null 
    
    const currentP = ctx.activeBattle.value.player
    const team = (ctx.gs.state.team as Pokemon[]) || []
    const firstAlive = team.find(p => p && p.hp > 0)
    if (!currentP || !firstAlive || currentP.uid !== (firstAlive?.uid)) {
      ctx.activeBattle.value.player = null
    }
  }
  
  ctx.clearLogs()

  logger.debug('Orchestrator', 'Transitions starting...');
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.RECEIVE_CONFIG)
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.APPLY_ITEM_MODIFIERS)
  
  // Weight Calculation
  await fsm.transition(BATTLE_STATES.CONTEXT_SETUP, BATTLE_SUBSTATES.WEIGHT_CALCULATION)
  if (isFishing) {
    const loc = FIRE_RED_MAPS.find(l => l.id === resolvedLocationId)
    if (loc && loc.fishing) {
      const pool = loc.fishing.pool
      const rates = loc.fishing.rates
      const enemySpeciesId = requirePokemonSpeciesId(finalEnemyPoke.id)
      const idx = pool.indexOf(enemySpeciesId)
      if (idx !== -1) {
        const totalRate = rates.reduce((a, b) => a + b, 0)
        const rateVal = rates[idx]
        rarity = ((rateVal !== undefined ? rateVal : 0) / totalRate) * 100
      }
    }
  }
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
    const handled = await processSearchPhaseSequence(ctx, finalEnemyPoke, isFishing, isArchaeology, isTrainer, isGym)
    if (handled) return
  }

  // Si wasSearching es false, llamamos primero a initBattleSequence (que maneja el PRELOAD_FINAL_COORDS en INITIALIZING)
  // antes de avanzar al flujo visual de FIRST_INTRO.
  logger.info('Orchestrator', 'Calling initBattleSequence...');
  await initBattleSequence(ctx, { 
    locationId: resolvedLocationId, isTrainer, trainerName, isGym, gymId: resolvedGymId, wasSearching,
    initialEnemy: startingEnemyPoke,
    initialPlayer: playerPoke
  })
}

/**
 * Visual initialization and first turn setup.
 */
export async function initBattleSequence(ctx: BattleContext, options: BattleOptions & { initialEnemy: Pokemon | null, initialPlayer: Pokemon | null }) {
  const { initialEnemy, initialPlayer } = options
  if (!initialPlayer || !initialEnemy) return;
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  // Leemos TODA la configuración del combate estrictamente del estado inyectado en CONTEXT_SETUP
  const battleState = ctx.activeBattle.value
  const locationId = battleState?.locationId || 'plains'
  const isTrainer = !!battleState?.isTrainer
  const isGym = !!battleState?.isGym
  const wasSearching = !!battleState?.wasSearching
  const trainerName = battleState?.trainerName

  await resetActiveBattleState(ctx, initialPlayer, isGym)

  // Inicialización del Web Worker de Showdown
  const { initWorkerForBattle } = await import('./orchestratorWorkerInitHelper.ts')
  await initWorkerForBattle(ctx, initialPlayer, initialEnemy)

  // Clear volatile status on all player team members and the initial enemy
  ctx.gs.state.team.forEach((p: Pokemon) => {
    if (p) ctx.clearVolatileStatus(p)
  })
  if (initialEnemy) {
    ctx.clearVolatileStatus(initialEnemy)
  }

  ctx.isIntroAnimating.value = true
  await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.PRELOAD_FINAL_COORDS)

  // Si wasSearching es false, transicionamos explícitamente a FIRST_INTRO en la máquina de estados 
  // para cumplir con la secuencia jerárquica del manual antes de ejecutar animaciones
  if (!wasSearching) {
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.ENTRY_ANIM)
  }

  // Esperar a que la vista (BattleArenaView) se monte y registre las funciones de animación
  for (let i = 0; i < 40; i++) {
    if (ctx.animations) break
    await sleep(50)
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
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.CHECK_BINOCULARS)
    await fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.PARALLEL_JUMP)
    
    const inventoryBinoculars = ctx.gs.state.inventory['binoculars'] || 0
    const hasBinoculars = ctx.debugBinoculars.value || (inventoryBinoculars > 0)
    
    // Capture current (wrong-order) pokemon BEFORE overwriting activeBattle.player
    const oldPlayerBeforeSearch = needsCall ? ctx.activeBattle.value?.player ?? null : null
    const hasRealSwap = oldPlayerBeforeSearch && oldPlayerBeforeSearch.uid !== initialPlayer.uid

    if (needsCall && ctx.activeBattle.value) {
      if (hasRealSwap) ctx.exitingPlayer.value = oldPlayerBeforeSearch
      ctx.activeBattle.value.player = initialPlayer
    }

    const promises: Promise<void>[] = []
    if (!hasBinoculars) {
      if (ctx.animations?.triggerSearchEncounter) {
        fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.JUMP_SHADOW)
        promises.push(ctx.animations.triggerSearchEncounter())
      } else {
        promises.push(fsm.transition(BATTLE_STATES.FIRST_INTRO, BATTLE_SUBSTATES.REVEAL_COLORS, 0))
      }
    }

    if (needsCall && ctx.animations?.handleReleaseRequest) {
      // Run recall of wrong-order pokemon + sendout of correct pokemon in parallel
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

  // Esperar a que el worker inicialice y asigne el request inicial con elecciones válidas (máximo 5 segundos)
  for (let i = 0; i < 100 && !(ctx.activeBattle.value?.playerRequest?.active || ctx.activeBattle.value?.playerRequest?.forceSwitch); i++) {
    await sleep(50);
  }

  ctx.isIntroAnimating.value = false
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
  ctx.isIntroAnimating.value = false
}

export { restoreBattleState } from './orchestratorRestoreHelper.ts'
