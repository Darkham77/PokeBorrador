import { gsapSleep as sleep } from '@/logic/utils/gsapHelpers'
import { nextTick } from 'vue'

import { handleEntryAbilities } from './battleFlow.ts'
import { getMapBiomeAndTags } from './biomeHelper.ts'
import { FIRE_RED_MAPS } from '@/data/world/maps'
import { logger } from '../utils/logger.ts'
import { generateRandomSeed } from './battleSeedManager.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleState, BattleStages, BattleLog, ShowdownPlayerRequest } from '@/types/battle/battle'
import type { UIStore, MapStore } from '@/types/system/stores'
import { mapToShowdownSet } from './showdownAdapter.ts'
import { mapVisualToOfficialWeather } from '../weather/weatherGenerationProvider.ts'
import { ACTIVE_GENERATION } from '../../data/system/constants.ts'
import { generateNPCInventory } from './trainerInventory.ts'
import { getShowdownNickname } from './showdownUidMapper.ts'
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
  trainerSprite?: string;
  trainerArchetype?: string;
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
    battleOptions = {}, isFishing = false, isArchaeology = false, wasSearching: wasSearchingOpt = null,
    trainerSprite = undefined, trainerArchetype = undefined, isRival = false,
    difficulty = undefined, rewardTM = undefined, cannotEscape = false,
    trainerQuote = undefined
  } = options

  const { activeBiome, mapTags } = getMapBiomeAndTags(locationId)
  const tagsStr = mapTags.join(', ') || 'ninguno'
  logger.info('Orchestrator', `startBattleSequence starting... Biome: ${activeBiome} (Tags: ${tagsStr}) for location: ${locationId}`, { isTrainer, isGym, wasSearchingOpt })

  const playerPoke = ctx.gs.state.team.find((p) => p.hp > 0 && !p.onMission && !p.onDefense)
  if (!playerPoke) {
    const { useUIStore } = await import('@/stores/ui')
    ;(useUIStore() as unknown as UIStore).notify('No tienes Pokémon sanos para combatir', '❌')
    return
  }

  // Si hay un combate activo pero NO está en fase de finalización, forzamos huida.
  if (ctx.isBattleActive.value && !ctx.isFinishing.value && !ctx.activeBattle.value?.over && !ctx.isSearching.value) {
    logger.warn('BATTLE', 'Combate en curso detectado. Forzando huida del anterior.')
    await ctx.endBattle(false, true)
  }

  const wasSearching = wasSearchingOpt !== null ? wasSearchingOpt : true
  logger.info('Orchestrator', `wasSearching evaluated: ${wasSearching} (wasSearchingOpt: ${wasSearchingOpt})`)
  
  const { validatePokemon } = await import('@/logic/pokemon/pokemonFactory')
  const { useMapStore } = await import('@/stores/map')
  const mapStore = useMapStore() as unknown as MapStore
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
    ? generateNPCInventory(maxEnemyLv, difficulty as 'easy' | 'normal' | 'hard', isGym, isRival || (battleOptions.isRival as boolean), trainerArchetype || (battleOptions.trainerArchetype as string))
    : null;
  const enemyInventory = npcInvResult?.inventory;
  const enemyMoney = npcInvResult?.remainingMoney;

  ctx.activeBattle.value = {
    enemy: null, 
    player: null, 
    _initialEnemy: JSON.parse(JSON.stringify(startingEnemyPoke)) as unknown as Pokemon,
    _initialPlayer: JSON.parse(JSON.stringify(playerPoke)) as unknown as Pokemon,
    _rewardCombatants: [],
    isGym, gymId, isTrainer, enemyTeam: finalEnemyTeam, difficulty: difficulty as 'easy' | 'normal' | 'hard' | undefined, rewardTM,
    enemyInventory,
    enemyMoney,
    enemyMaxLevel: maxEnemyLv,
    trainerSprite: trainerSprite || (battleOptions.trainerSprite as string) || undefined,
    trainerArchetype: trainerArchetype || (battleOptions.trainerArchetype as string) || undefined,
    isRival: isRival || (battleOptions.isRival as boolean) || false,
    playerTeam: ctx.gs.state.team,
    trainerName, locationId,
    quote: trainerQuote || (battleOptions.quote as string) || undefined,
    isCave: FIRE_RED_MAPS.find(m => m.id === locationId)?.isCave || false,
    isIndoors: FIRE_RED_MAPS.find(m => m.id === locationId)?.isIndoors || false,
    isCrystalCave: FIRE_RED_MAPS.find(m => m.id === locationId)?.isCrystalCave || false,
    turn: 'player', turnCount: 1, over: false,
    isFishing, isArchaeology, rarity,
    wasSearching,
    cannotEscape: cannotEscape || (battleOptions.cannotEscape as boolean) || false,
    weather: { 
      type: isGym ? 'none' : mapVisualToOfficialWeather(mapStore.currentWeather, ACTIVE_GENERATION), 
      visual: isGym ? 'clear' : mapStore.currentWeather, 
      turns: -1 
    },
    playerTeamIndex: ctx.gs.state.team.indexOf(playerPoke),
    enemyTeamIndex: 0,
    participants: [playerPoke.uid], learnQueue: [], ...battleOptions,
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
    const loc = FIRE_RED_MAPS.find(l => l.id === locationId)
    if (loc && loc.fishing) {
      const pool = loc.fishing.pool
      const rates = loc.fishing.rates
      const idx = pool.indexOf(finalEnemyPoke.id)
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

    if (isFishing || isArchaeology) {
      ctx.isIntroAnimating.value = false
      if (ctx.activeBattle.value) {
        ctx.activeBattle.value.enemy = finalEnemyPoke
        ctx.activeBattle.value.isFishing = isFishing
        ctx.activeBattle.value.isArchaeology = isArchaeology
      }
      await fsm.transition(BATTLE_STATES.INITIALIZING)
      await fsm.transition(BATTLE_STATES.INITIALIZING, BATTLE_SUBSTATES.MINIGAME_CHECK)
      return
    }

    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.PREPARATION)
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.AUTO_BATTLE_CHECK)
    
    const { useUIStore } = await import('@/stores/ui')
    const uiStore = useUIStore() as unknown as UIStore
    const autoBattle = uiStore.autoBattle && !isTrainer

    if (!autoBattle) {
      await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.UPDATE_BUTTON)
    }
    
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.ENTRY_ANIM)
    if (isTrainer || isGym) {
      if (ctx.animations?.triggerTrainerEntry) {
        await ctx.animations.triggerTrainerEntry()
      }
    }
    await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.REORDER_TEAM)
    
    if (ctx.activeBattle.value?.trainerArchetype === 'policeman') {
      ctx.audio.play('siren')
    }

    if (!autoBattle) {
      await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.COMBAT_OR_FLEE)
    } else {
      await fsm.transition(BATTLE_STATES.SEARCH_PHASE, BATTLE_SUBSTATES.COMBAT_OR_FLEE)
      if (ctx.activeBattle.value) {
        ctx.activeBattle.value.enemy = finalEnemyPoke
        ctx.activeBattle.value.isFishing = isFishing
        ctx.activeBattle.value.isArchaeology = isArchaeology
      }
      const { startEncounter } = await import('./searchLoop.ts')
      await nextTick()
      await startEncounter(ctx)
      return
    }

    if (ctx.activeBattle.value) {
      ctx.activeBattle.value.enemy = finalEnemyPoke
      ctx.activeBattle.value.isFishing = isFishing
      ctx.activeBattle.value.isArchaeology = isArchaeology
    }
    return 
  }

  // Si wasSearching es false, llamamos primero a initBattleSequence (que maneja el PRELOAD_FINAL_COORDS en INITIALIZING)
  // antes de avanzar al flujo visual de FIRST_INTRO.
  logger.info('Orchestrator', 'Calling initBattleSequence...');
  await initBattleSequence(ctx, { 
    locationId, isTrainer, trainerName, isGym, gymId, wasSearching,
    initialEnemy: startingEnemyPoke,
    initialPlayer: playerPoke
  })
}

async function executePokemonCallSequence(
  ctx: BattleContext,
  initialPlayer: Pokemon,
  needsCall: boolean
) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  const fsm = ctx.fsm

  if (needsCall && ctx.activeBattle.value) {
    const oldPoke = ctx.activeBattle.value.player
    if (oldPoke && oldPoke.uid !== initialPlayer.uid) {
      ctx.exitingPlayer.value = oldPoke
    }
    
    ctx.activeBattle.value.player = initialPlayer
    
    const withdrawPromise = oldPoke && oldPoke.uid !== initialPlayer.uid && ctx.animations?.handleCatchRequest
      ? ctx.animations.handleCatchRequest({ side: 'player', pokemon: oldPoke })
      : Promise.resolve()
      
    const sendOutPromise = ctx.animations?.handleReleaseRequest
      ? ctx.animations.handleReleaseRequest({ side: 'player', pokemon: initialPlayer })
      : Promise.resolve()
      
    await Promise.all([withdrawPromise, sendOutPromise])
    await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_CALL)
    ctx.exitingPlayer.value = null
  }
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

  // Reset activeBattle state fields if reusing object
  if (ctx.activeBattle.value) {
    const { useMapStore } = await import('@/stores/map')
    const mapStore = useMapStore() as unknown as MapStore
    ctx.activeBattle.value.weather = { 
      type: isGym ? 'none' : mapVisualToOfficialWeather(mapStore.currentWeather, ACTIVE_GENERATION), 
      visual: isGym ? 'clear' : mapStore.currentWeather, 
      turns: -1 
    }
    ctx.activeBattle.value.over = false
    ctx.activeBattle.value.turnCount = 1
    ctx.activeBattle.value.turn = 'player'
    ctx.activeBattle.value.isCapture = false
    ctx.activeBattle.value.escapeAttempts = 0
    ctx.activeBattle.value.participants = [initialPlayer.uid]
    ctx.activeBattle.value.lastDamage = undefined
    ctx.activeBattle.value.enemyUsedItem = false
    ctx.activeBattle.value.futureSightTurns = undefined
    ctx.activeBattle.value.futureSightTarget = null
    ctx.activeBattle.value.isFishing = false
    ctx.activeBattle.value.isArchaeology = false
    ctx.activeBattle.value.rewardsProcessed = false
    ctx.activeBattle.value._rewardCombatants = []
    ctx.activeBattle.value.playerSideConditions = {}
    ctx.activeBattle.value.enemySideConditions = {}
  }

  // Reset stage variables, fainted sides and logs to prevent state leakages
  ctx.playerStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }
  ctx.enemyStages.value = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 }
  ctx.faintedSides.value.clear()
  ctx.clearLogs()

  // Inicialización del Web Worker de Showdown
  if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
    if (showdownWorker) {
      showdownWorker.terminate();
    }
    const workerInstance = new Worker(new URL('./showdown.worker.ts', import.meta.url), { type: 'module' });
    setShowdownWorker(workerInstance);
    (window as unknown as Record<string, unknown>).__showdownWorker__ = workerInstance;
    if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
      window.__VITE_DEBUG__.getSimulatorState = getSimulatorState;
    }
      // Generar la semilla (seed) en el cliente y guardarla para reproducibilidad de errores
      let debugSeed: number[] | null = null;
      if (typeof window !== 'undefined') {
        debugSeed = window.__VITE_DEBUG__?.battleSeed ?? null;
        console.debug(`[E2E-SEED-ORCHESTRATOR-DEBUG] Read seed directly from window: ${JSON.stringify(debugSeed)}`);
      }
      const seedArr = debugSeed || generateRandomSeed();
     if (ctx.activeBattle.value) {
       ctx.activeBattle.value.seed = seedArr;
       ctx.activeBattle.value.battleHistory = [];
     }

    // Generar el equipo ordenado del jugador para Showdown
    const playerTeamList = [...(ctx.gs.state.team || [])].filter((p): p is Pokemon => !!p);
    const initialPlayerIdx = playerTeamList.findIndex(p => p.uid === initialPlayer.uid);
    // Para simulaciones E2E, NO reordenar el equipo físico inicial para mantener el orden exacto del fuzzer offline
    if (initialPlayerIdx > 0 && !debugSeed) {
      const [p] = playerTeamList.splice(initialPlayerIdx, 1);
      if (p) playerTeamList.unshift(p);
    }
    const p1Team = playerTeamList.map(p => mapToShowdownSet(p));
    const p1Hps: Record<string, number> = {};
    playerTeamList.forEach(p => {
      if (p) p1Hps[p.uid] = p.hp;
    });
    const enemyTeamList = [...(battleState?.enemyTeam || (initialEnemy ? [initialEnemy] : []))].filter((p): p is Pokemon => !!p);
    if (initialEnemy) {
      const initialEnemyIdx = enemyTeamList.findIndex(p => p.uid === initialEnemy.uid);
      if (initialEnemyIdx > 0 && !debugSeed) {
        const [p] = enemyTeamList.splice(initialEnemyIdx, 1);
        if (p) enemyTeamList.unshift(p);
      }
    }
    const p2Team = enemyTeamList.map(p => mapToShowdownSet(p));
    const p2Hps: Record<string, number> = {};
    enemyTeamList.forEach(p => {
      if (p) p2Hps[p.uid] = p.hp;
    });
    const initialWeatherOfficial = battleState?.weather?.type || 'none';
    
    const p1Statuses: Record<string, string> = {};
    playerTeamList.forEach(p => {
      if (p) p1Statuses[p.uid] = p.status || '';
    });
    const p2Statuses: Record<string, string> = {};
    enemyTeamList.forEach(p => {
      if (p) p2Statuses[p.uid] = p.status || '';
    });

    console.warn(`[E2E-SEED-DEBUG] Inicializando batalla en el worker con clima: ${initialWeatherOfficial}, debugSeed: ${JSON.stringify(debugSeed)}, seedArr: ${JSON.stringify(seedArr)}`);
    
    const worker = showdownWorker!;
    worker.postMessage({
      type: 'INIT_BATTLE',
      payload: {
        p1: { name: 'Player', team: p1Team.map((p, idx) => ({ ...p, nickname: getShowdownNickname(playerTeamList[idx]?.uid || ''), name: getShowdownNickname(playerTeamList[idx]?.uid || ''), uid: playerTeamList[idx]?.uid })) },
        p2: { name: battleState?.trainerName || 'Enemy', team: p2Team.map((p, idx) => ({ ...p, nickname: getShowdownNickname(enemyTeamList[idx]?.uid || ''), name: getShowdownNickname(enemyTeamList[idx]?.uid || ''), uid: enemyTeamList[idx]?.uid })) },
        p1Hps,
        p2Hps,
        p1Statuses,
        p2Statuses,
        weather: initialWeatherOfficial,
        seed: seedArr,
        isE2eSimulation: !!(typeof window !== 'undefined' && window.__VITE_DEBUG__ && window.__VITE_DEBUG__.isE2eSimulation)
      }
    });

    const initHandler = async (e: MessageEvent) => {
      const data = e.data as {
        type: string;
        payload?: {
          debugLogs?: string[];
          p1Request?: ShowdownPlayerRequest;
          p2Request?: ShowdownPlayerRequest;
          message?: string;
        };
      };
      const { type: responseType, payload: responsePayload } = data;
      if (responseType === 'WORKER_LOG') {
        console.debug(`[WORKER] ${responsePayload}`);
        return;
      }
      const worker = showdownWorker!
      if (responseType === 'INIT_BATTLE_SUCCESS') {
        logger.info('ShowdownWorker', 'Batalla inicializada con éxito en el worker.');
        console.debug('[E2E-ORCHESTRATOR-INIT-DEBUG] responsePayload keys:', Object.keys(responsePayload || {}));
        if (responsePayload) {
          console.debug('[E2E-ORCHESTRATOR-INIT-DEBUG] debugLogs type:', typeof responsePayload.debugLogs, 'isArray:', Array.isArray(responsePayload.debugLogs));
          if (responsePayload.debugLogs) {
            console.debug('[E2E-ORCHESTRATOR-INIT-DEBUG] debugLogs length:', responsePayload.debugLogs.length);
            responsePayload.debugLogs.forEach((l: string) => {
              console.debug(`[E2E-WORKER-BUFFERED] ${l}`);
            });
          }
        }
        if (ctx.activeBattle.value && responsePayload) {
          ctx.activeBattle.value.playerRequest = responsePayload.p1Request;
          ctx.activeBattle.value.enemyRequest = responsePayload.p2Request;
        }
        if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
          window.__VITE_DEBUG__.p1ChoiceIdx = 0;
          window.__VITE_DEBUG__.p2ChoiceIdx = 0;
        }
        if (worker.removeEventListener) {
          worker.removeEventListener('message', initHandler);
        } else {
          worker.onmessage = null;
        }
      } else if (responseType === 'ERROR') {
        const errorText = responsePayload?.message || 'Error desconocido';
        logger.error('ShowdownWorker', `Error del simulador al inicializar batalla: ${errorText}`);
        if (worker.removeEventListener) {
          worker.removeEventListener('message', initHandler);
        } else {
          worker.onmessage = null;
        }
        const { useErrorStore } = await import('@/stores/errorStore');
        useErrorStore().setError(new Error(errorText), { 
          type: 'Simulator Initialization Error', 
          source: 'ShowdownWorker INIT_BATTLE' 
        });
      }
    };
    if (worker.addEventListener) {
      worker.addEventListener('message', initHandler);
    } else {
      worker.onmessage = initHandler;
    }
  }

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
  
  ctx.addLog(startMsg, 'log-info', initialEnemy)
  logger.info('Orchestrator', `Combat started in biome: ${activeBiome} (Tags: ${mapTags.join(', ') || 'ninguno'}) for location: ${locationId}`)
  
  handleEntryAbilities(initialPlayer, initialEnemy, ctx.playerStages.value, ctx.enemyStages.value, ctx.addLog, ctx.activeBattle.value?.weather?.type)
  
  if (isTrainer || isGym) await ctx.gs.scheduleSave()

  // Team Rocket: Robo Rápido
  // Team Rocket: Robo Rápido
  if (ctx.gs.state.playerClass === 'rocket' && isTrainer && !isGym) {
    const { calculateQuickStealChance, calculateMaxNpcRobberyLimit } = await import('@/logic/player/classMath');
    const level = ctx.classStore.classLevel;
    const stealChance = calculateQuickStealChance(level);
    if (Math.random() < stealChance) {
      const maxLimit = calculateMaxNpcRobberyLimit(level);
      const enemyInv = ctx.activeBattle.value?.enemyInventory || {};
      const { getItemById } = await import('@/data/inventory/items');

      const availableItems = Object.keys(enemyInv).filter(k => (enemyInv[k] || 0) > 0);
      if (availableItems.length > 0) {
        let stolenTotalCost = 0;
        const stolenItemsList: { id: string; qty: number; name: string }[] = [];

        // Mezclar para aleatoriedad
        const shuffled = [...availableItems].sort(() => Math.random() - 0.5);
        for (const itemId of shuffled) {
          if (stolenTotalCost >= maxLimit) break;

          let itemDef = null;
          try {
            itemDef = getItemById(itemId);
          } catch {
            continue;
          }
          const itemPrice = itemDef?.price || 100;
          const availableQty = enemyInv[itemId] || 0;

          const remainingBudget = maxLimit - stolenTotalCost;
          const maxQtyToSteal = Math.floor(remainingBudget / itemPrice);

          if (maxQtyToSteal >= 1 && availableQty > 0) {
            const qtyAllowed = Math.min(availableQty, maxQtyToSteal);
            const qtyToSteal = Math.floor(Math.random() * qtyAllowed) + 1;

            // Decrementar del inventario del NPC
            enemyInv[itemId] = availableQty - qtyToSteal;
            if (enemyInv[itemId] <= 0) {
              delete enemyInv[itemId];
            }

            // Agregar al inventario del jugador
            if (!ctx.gs.state.inventory) ctx.gs.state.inventory = {};
            ctx.gs.state.inventory[itemId] = (ctx.gs.state.inventory[itemId] || 0) + qtyToSteal;

            stolenTotalCost += qtyToSteal * itemPrice;
            stolenItemsList.push({ id: itemId, qty: qtyToSteal, name: itemDef?.name || itemId });
          }
        }

        if (stolenItemsList.length > 0) {
          ctx.classStore.addCriminality(10);

          const itemsText = stolenItemsList.map(item => `${item.name} x${item.qty}`).join(', ');
          ctx.addLog(`¡Robo Rápido exitoso! Le robaste ${itemsText} a tu oponente.`, 'log-success', 'player');
          ctx.uiStore.notify(`¡Robaste ${itemsText}! (+10 criminalidad)`, '🏴‍☠️');
          ctx.audio.play('steal');
        }
      }
    }
  }

  // Team Rocket ENEMIGO: Robo al jugador
  if (isTrainer && !isGym && battleState?.trainerSprite) {
    const { classifyNpcArchetype } = await import('@/logic/utils/npcSpriteRouter');
    const npcArchetype = classifyNpcArchetype(battleState.trainerSprite || trainerName || '');
    if (npcArchetype === 'rocket') {
      const enemyTeam = ctx.activeBattle.value?.enemyTeam || [];
      const avgLevel = enemyTeam.length > 0 
        ? Math.round(enemyTeam.reduce((acc, pl) => acc + (pl.level || 5), 0) / enemyTeam.length)
        : 5;
      
      const { calculateQuickStealChance, calculateMaxNpcRobberyLimit } = await import('@/logic/player/classMath');
      const stealChance = calculateQuickStealChance(avgLevel); // Utiliza el mismo rango de probabilidad (15-30%)
      if (Math.random() < stealChance) {
        const maxLimit = calculateMaxNpcRobberyLimit(avgLevel);
        const playerInventory = ctx.gs.state.inventory || {};
        
        const { getItemById } = await import('@/data/inventory/items');
        
        const availableItems = Object.keys(playerInventory).filter(k => {
          if ((playerInventory[k] || 0) <= 0) return false;
          try {
            const itemDef = getItemById(k);
            return itemDef && (itemDef.cat === 'potions' || itemDef.cat === 'pokeballs');
          } catch {
            return false;
          }
        });
        
        const itemsLimit = maxLimit * 0.5;
        let stolenTotalCost = 0;
        const stolenItems: Record<string, number> = {};
        
        if (availableItems.length > 0) {
          const shuffledItems = [...availableItems].sort(() => Math.random() - 0.5);
          for (const itemId of shuffledItems) {
            if (stolenTotalCost >= itemsLimit) break;
            
            let itemDef = null;
            try {
              itemDef = getItemById(itemId);
            } catch {
              continue;
            }
            const itemPrice = itemDef?.price || 100;
            const availableQty = playerInventory[itemId] || 0;
            
            const remainingItemsBudget = itemsLimit - stolenTotalCost;
            const maxQtyToStealBasedOnBudget = Math.floor(remainingItemsBudget / itemPrice);
            
            if (maxQtyToStealBasedOnBudget >= 1 && availableQty > 0) {
              const maxQtyAllowed = Math.min(availableQty, maxQtyToStealBasedOnBudget);
              const qtyToSteal = Math.floor(Math.random() * maxQtyAllowed) + 1;
              
              playerInventory[itemId] = availableQty - qtyToSteal;
              stolenItems[itemId] = (stolenItems[itemId] || 0) + qtyToSteal;
              stolenTotalCost += qtyToSteal * itemPrice;
              // Agregar al inventario del NPC para que pueda usarlo
              if (ctx.activeBattle.value) {
                if (!ctx.activeBattle.value.enemyInventory) {
                  ctx.activeBattle.value.enemyInventory = {};
                }
                ctx.activeBattle.value.enemyInventory[itemId] = (ctx.activeBattle.value.enemyInventory[itemId] || 0) + qtyToSteal;
              }
            }
          }
        }
        
        const remainingLimit = maxLimit - stolenTotalCost;
        const playerMoney = ctx.gs.state.money || 0;
        const moneyToSteal = Math.min(playerMoney, remainingLimit);
        
        if (moneyToSteal > 0) {
          ctx.gs.state.money = playerMoney - moneyToSteal;
          stolenTotalCost += moneyToSteal;
        }
        
        if (stolenTotalCost > 0) {
          if (ctx.activeBattle.value) {
            ctx.activeBattle.value.stolenResources = {
              money: moneyToSteal,
              items: stolenItems
            };
          }
          
          ctx.addLog(`¡El Team Rocket te ha emboscado! Te robaron recursos por valor de ₽${stolenTotalCost.toLocaleString()}.`, 'log-error', 'enemy');
          
          if (moneyToSteal > 0) {
            ctx.uiStore.notify(`¡Te robaron ₽${moneyToSteal}!`, '💸');
          }
          
          for (const [itemId, qty] of Object.entries(stolenItems)) {
            let itemDef = null;
            try {
              itemDef = getItemById(itemId);
            } catch {
              // usar el ID directamente
            }
            const displayName = itemDef?.name || itemId;
            ctx.uiStore.notify(`¡Te robaron ${qty}x ${displayName}!`, '🎒');
          }
          
          ctx.audio.play('steal');
        }
      }
    }
  }

  // Esperar a que el worker inicialice y asigne el request inicial con elecciones válidas (máximo 5 segundos)
  for (let i = 0; i < 100 && !(ctx.activeBattle.value?.playerRequest?.active || ctx.activeBattle.value?.playerRequest?.forceSwitch); i++) {
    await sleep(50);
  }

  ctx.isIntroAnimating.value = false
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.WAIT_INPUT)
  ctx.isIntroAnimating.value = false
}

/**
 * Restores a battle state from saved data.
 */
export function restoreBattleState(ctx: BattleContext, battleData: unknown) {
  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx
  if (!battleData) {
    ctx.activeBattle.value = null
    ctx.fsm.transition(BATTLE_STATES.EXIT_BATTLE)
    return
  }
  const d = battleData as Partial<BattleState & { playerStages: BattleStages, enemyStages: BattleStages, battleLogs: BattleLog[] }>;
  ctx.activeBattle.value = d as BattleState
  if (d.playerStages) ctx.playerStages.value = d.playerStages
  if (d.enemyStages) ctx.enemyStages.value = d.enemyStages
  if (d.battleLogs) ctx.battleLogs.value = d.battleLogs
  
  ctx.fsm.transition(!d.over ? BATTLE_STATES.ACTIVE_BATTLE : BATTLE_STATES.EXIT_BATTLE, !d.over ? BATTLE_SUBSTATES.WAIT_INPUT : undefined)
}


