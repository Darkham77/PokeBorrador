import { gsapSleep as sleep } from '@/logic/utils/gsapHelpers'
import { nextTick } from 'vue'

import { handleEntryAbilities } from './battleFlow.ts'
import { getMapBiomeAndTags } from './biomeHelper.ts'
import { FIRE_RED_MAPS } from '@/data/world/maps'
import { logger } from '../utils/logger.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleState, BattleStages, BattleLog, ShowdownPlayerRequest } from '@/types/battle/battle'
import type { UIStore, MapStore } from '@/types/system/stores'
import { mapToShowdownSet } from './showdownAdapter.ts'
import { mapVisualToOfficialWeather } from '../weather/weatherGenerationProvider.ts'
import { ACTIVE_GENERATION } from '../../data/system/constants.ts'
import { generateNPCInventory } from './trainerInventory.ts'
import { applyHealCheatToSide, type CheatPokemon } from './cheats.ts'

export let showdownWorker: Worker | null = null;

export async function getSimulatorState(): Promise<{ p1: unknown[]; p2: unknown[] }> {
  if (!showdownWorker) throw new Error('showdownWorker is null');
  showdownWorker.postMessage({ type: 'GET_SIMULATOR_STATE' });
  return new Promise(resolve => {
    const handler = (event: MessageEvent) => {
      const data = event.data as { type: string; payload: { p1: unknown[]; p2: unknown[] } };
      const { type, payload } = data;
      if (type === 'GET_SIMULATOR_STATE_RESPONSE') {
        showdownWorker!.removeEventListener('message', handler);
        resolve(payload);
      }
    };
    showdownWorker!.addEventListener('message', handler);
  });
}

interface WorkerSuccessPayload {
  logs: string[];
  isOver: boolean;
  winner: string | null;
  p1ForceSwitch?: boolean;
  p2ForceSwitch?: boolean;
  p1Request?: ShowdownPlayerRequest;
  p2Request?: ShowdownPlayerRequest;
  p1TeamState?: Array<{ uid: string; hp: number; maxHp: number; status: string; fainted: boolean } | null>;
  p2TeamState?: Array<{ uid: string; hp: number; maxHp: number; status: string; fainted: boolean } | null>;
  message?: string;
}

export async function executeTurnInWorker(
  p1Choice: string, 
  p2Choice?: string,
  p1Skip?: boolean,
  p2Skip?: boolean
): Promise<{ logs: string[]; isOver: boolean; winner: string | null; p1ForceSwitch?: boolean; p2ForceSwitch?: boolean; p1Request?: ShowdownPlayerRequest; p2Request?: ShowdownPlayerRequest }> {
  console.log(`[DEBUG-ORCHESTRATOR] window.__VITE_DEBUG__ keys:`, typeof window !== 'undefined' && window.__VITE_DEBUG__ ? JSON.stringify(Object.keys(window.__VITE_DEBUG__)) : 'none');
  if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
    const cheatsArray = window.__VITE_DEBUG__.cheats;
    const cheatsLength = Array.isArray(cheatsArray) ? cheatsArray.length : typeof cheatsArray;
    console.log(`[DEBUG-ORCHESTRATOR] cheats type/length: ${cheatsLength}`);
    if (Array.isArray(cheatsArray)) {
      cheatsArray.forEach((c, i: number) => {
        console.log(`[DEBUG-ORCHESTRATOR] cheat #${i}: turn=${c.turn}, side=${c.side}, type=${c.type}`);
      });
    }
  }
  if (!showdownWorker) {
    throw new Error('showdownWorker is null')
  }

  let finalP2Choice = p2Choice;
  
  if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.cheats) {
    const cheats = window.__VITE_DEBUG__.cheats;
    const { useBattleStore } = await import('@/stores/battle/battle');
    const { useGameStore } = await import('@/stores/game');
    const battleStore = useBattleStore();
    const gameStore = useGameStore();
    
    if (battleStore.state) {
      const turnNum = battleStore.state.turnCount;
      console.log(`[DEBUG-ORCHESTRATOR] turnNum: ${turnNum}, cheats count: ${cheats.length}`);
      const turnCheats = cheats.filter(c => c.turn === turnNum);
      
      for (const ch of turnCheats) {
        console.log(`[ORCHESTRATOR-CHEAT] Applying cheat for turn ${turnNum}: ${ch.type} ${ch.side}`);
        showdownWorker.postMessage({
          type: 'APPLY_CHEAT',
          payload: { turn: ch.turn, side: ch.side, type: ch.type }
        });
        
        if (ch.side === 'p1') {
          if (gameStore?.state?.team) {
            applyHealCheatToSide({ pokemon: gameStore.state.team as unknown as Array<CheatPokemon | null> });
          }
          if (battleStore.state?.player) {
            battleStore.state.player.hp = battleStore.state.player.maxHp;
            battleStore.state.player.status = null;
          }
          if (battleStore.state?.playerTeam) {
            applyHealCheatToSide({ pokemon: battleStore.state.playerTeam as unknown as Array<CheatPokemon | null> });
          }
        } else {
          if (battleStore.state?.enemy) {
            battleStore.state.enemy.hp = battleStore.state.enemy.maxHp;
            battleStore.state.enemy.status = null;
          }
          if (battleStore.state?.enemyTeam) {
            applyHealCheatToSide({ pokemon: battleStore.state.enemyTeam as unknown as Array<CheatPokemon | null> });
          }
        }
      }
    }
  }

  if (p2Choice && p2Choice !== '' && !p2Skip && !p2Choice.startsWith('switch ')) {
    if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
      const debugObj = window.__VITE_DEBUG__;
      const mockChoices = debugObj.mockEnemyChoices;
      if (mockChoices) {
        const { useBattleStore } = await import('@/stores/battle/battle');
        const battleStore = useBattleStore();
        const enemyRequest = battleStore.state?.enemyRequest;
        const forceSwitch = enemyRequest?.forceSwitch;
        const isForceSwitch = (forceSwitch as unknown) === true || (Array.isArray(forceSwitch) && forceSwitch.some(x => !!x));

        let idx = debugObj.enemyChoiceIndex ?? 0;
        while (idx < mockChoices.length) {
          const choiceStr = mockChoices[idx];
          if (choiceStr === undefined) break;

           let isValid = true;
          if (isForceSwitch) {
            // ForceSwitch: only switch commands are valid
            if (!choiceStr.startsWith('switch ')) {
              isValid = false;
            } else {
              const switchSlot = parseInt(choiceStr.split(' ')[1] || '2', 10);
              const targetPoke = enemyRequest?.side?.pokemon?.[switchSlot - 1];
              if (!targetPoke || targetPoke.condition?.includes('fnt') || !!targetPoke.active) {
                isValid = false;
              }
            }
          } else {
            // Normal move: skip disabled moves and invalid switch choices
            if (choiceStr.startsWith('move ')) {
              const moveIdx = parseInt(choiceStr.split(' ')[1] || '1', 10) - 1;
              const reqMove = enemyRequest?.active?.[0]?.moves?.[moveIdx];
              if (reqMove && reqMove.disabled) {
                isValid = false;
              }
            } else if (choiceStr.startsWith('switch ')) {
              const switchSlot = parseInt(choiceStr.split(' ')[1] || '2', 10);
              const targetPoke = enemyRequest?.side?.pokemon?.[switchSlot - 1];
              const isTrapped = !!enemyRequest?.active?.[0]?.trapped;
              if (isTrapped || !targetPoke || targetPoke.condition?.includes('fnt') || !!targetPoke.active) {
                isValid = false;
              }
            }
          }

          if (isValid) {
            finalP2Choice = choiceStr;
            debugObj.enemyChoiceIndex = idx + 1;
            console.log(`[E2E-MOCK-CENTRAL] Intercepted enemy choice at index ${idx}: ${p2Choice} -> ${finalP2Choice}`);
            break;
          } else {
            console.log(`[E2E-MOCK-CENTRAL] Choice "${choiceStr}" at index ${idx} is invalid for P2 (isForceSwitch: ${isForceSwitch}). Skipping.`);
            idx++;
            debugObj.enemyChoiceIndex = idx;
          }
        }
      }
    }
  } else if (p2Choice && p2Choice.startsWith('switch ') && typeof window !== 'undefined' && window.__VITE_DEBUG__) {
    // The game resolved a switch internally (forceSwitch from faint/pivot).
    // Consume that slot so the index stays aligned with the fuzzer's choices queue.
    const debugObj = window.__VITE_DEBUG__;
    if (debugObj.mockEnemyChoices) {
      const idx = debugObj.enemyChoiceIndex ?? 0;
      console.log(`[E2E-MOCK-CENTRAL] Game-resolved switch "${p2Choice}" at index ${idx} — consuming slot without replacing.`);
      debugObj.enemyChoiceIndex = idx + 1;
    }
  }


  // Registrar elección en el historial local del combate y extraer HPs/estados reactivos para sincronizar cheats con el simulador
  let p1Hps: Record<string, number> | undefined = undefined;
  let p2Hps: Record<string, number> | undefined = undefined;
  let p1Statuses: Record<string, string> | undefined = undefined;
  let p2Statuses: Record<string, string> | undefined = undefined;

  try {
    const { useBattleStore } = await import('@/stores/battle/battle');
    const battleStore = useBattleStore();
    if (battleStore.state) {
      if (!battleStore.state.battleHistory) {
        battleStore.state.battleHistory = [];
      }
      battleStore.state.battleHistory.push({
        turnCount: battleStore.state.turnCount,
        p1Choice,
        p2Choice: finalP2Choice || 'struggle'
      });
    }

    const { useGameStore } = await import('@/stores/game');
    const gameStore = useGameStore();
    if (gameStore?.state?.team) {
      p1Hps = {};
      p1Statuses = {};
      gameStore.state.team.forEach((p: import('@/types/pokemon/pokemon').Pokemon | null) => {
        if (p && p.uid) {
          p1Hps![p.uid] = p.hp ?? 0;
          p1Statuses![p.uid] = p.status ?? '';
        }
      });
      console.log(`[ORCHESTRATOR-EXECUTE] Sending p1Hps:`, JSON.stringify(p1Hps), `p1Statuses:`, JSON.stringify(p1Statuses));
    }
    if (battleStore.state?.enemyTeam) {
      p2Hps = {};
      p2Statuses = {};
      battleStore.state.enemyTeam.forEach((p: import('@/types/pokemon/pokemon').Pokemon | null) => {
        if (p && p.uid) {
          p2Hps![p.uid] = p.hp ?? 0;
          p2Statuses![p.uid] = p.status ?? '';
        }
      });
    }
  } catch (_e) {
    // Ignorar si se ejecuta fuera de contexto de tienda
  }

  showdownWorker.postMessage({
    type: 'EXECUTE_TURN',
    payload: { p1Choice, p2Choice: finalP2Choice, p1Skip, p2Skip, p1Hps, p2Hps, p1Statuses, p2Statuses }
  })
  return new Promise((resolve, reject) => {
    const handler = async (event: MessageEvent) => {
      const data = event.data as { type: string; payload: WorkerSuccessPayload };
      const { type, payload } = data;
      if (type === 'WORKER_LOG') {
        logger.debug('ShowdownWorker', `[WORKER] ${String(payload)}`);
        return;
      }
      const worker = showdownWorker!
      if (type === 'TURN_SUCCESS') {
        console.log(`[ORCHESTRATOR-EXECUTE] Received TURN_SUCCESS. p1Request pokemon condition:`, JSON.stringify(payload.p1Request?.side?.pokemon?.map((p: Required<ShowdownPlayerRequest>['side']['pokemon'][number]) => ({ uid: p.uid, cond: p.condition }))));
        if (worker.removeEventListener) {
          worker.removeEventListener('message', handler)
        } else {
          worker.onmessage = null
        }

        // Sincronizar de forma segura las HPs de la banca de vuelta al store reactivo de la UI por índice de slot
        try {
          const { useBattleStore } = await import('@/stores/battle/battle');
          const { useGameStore } = await import('@/stores/game');
          const battleStore = useBattleStore();
          const gameStore = useGameStore();
          
          if (payload.p1TeamState && gameStore.state?.team) {
            payload.p1TeamState.forEach((monState: { uid: string; hp: number; maxHp: number; status: string; fainted: boolean } | null) => {
              if (monState && monState.uid) {
                const match = gameStore.state.team.find(p => p && p.uid === monState.uid);
                if (match) {
                  match.hp = monState.hp;
                  match.status = (monState.status === '' || monState.status.toLowerCase() === 'fnt') ? null : monState.status as Pokemon['status'];
                  if (monState.fainted || monState.hp <= 0) {
                    match.hp = 0;
                  }
                }
              }
            });
          }
          
          const enemyTeam = battleStore.state?.enemyTeam;
          if (payload.p2TeamState && enemyTeam) {
            payload.p2TeamState.forEach((monState: { uid: string; hp: number; maxHp: number; status: string; fainted: boolean } | null) => {
              if (monState && monState.uid) {
                const match = enemyTeam.find(p => p && p.uid === monState.uid);
                if (match) {
                  match.hp = monState.hp;
                  match.status = (monState.status === '' || monState.status.toLowerCase() === 'fnt') ? null : monState.status as Pokemon['status'];
                  if (monState.fainted || monState.hp <= 0) {
                    match.hp = 0;
                  }
                }
              }
            });
          }
        } catch (_e) {
          // Ignorar errores de sincronización
        }

        resolve(payload)
      } else if (type === 'ERROR' || type === 'WORKER_ERROR') {
        if (worker.removeEventListener) {
          worker.removeEventListener('message', handler)
        } else {
          worker.onmessage = null
        }

        // Generar reporte de reproducción detallado
        let reproductionReport = '';
        try {
          const { useBattleStore } = await import('@/stores/battle/battle');
          const battleStore = useBattleStore();
          const active = battleStore.state;
          if (active) {
            const reportObj = {
              seed: active.seed || [],
              p1Team: active.playerTeam?.map((p: Pokemon) => ({
                id: p.id,
                level: p.level,
                ability: p.ability,
                moves: p.moves.map((m: { id?: string } | null) => m?.id || ''),
                gender: p.gender,
                hp: p.hp,
                maxHp: p.maxHp,
                stats: { hp: p.maxHp, atk: p.atk, def: p.def, spa: p.spa, spd: p.spd, spe: p.spe }
              })) || [],
              p2Team: active.enemyTeam?.map((p: Pokemon) => ({
                id: p.id,
                level: p.level,
                ability: p.ability,
                moves: p.moves.map((m: { id?: string } | null) => m?.id || ''),
                gender: p.gender,
                hp: p.hp,
                maxHp: p.maxHp,
                stats: { hp: p.maxHp, atk: p.atk, def: p.def, spa: p.spa, spd: p.spd, spe: p.spe }
              })) || [],
              history: active.battleHistory || []
            };
            reproductionReport = `\n\n--- REPRODUCE BATTLE TEST CASE ---\nJSON Payload:\n${JSON.stringify(reportObj, null, 2)}\n----------------------------------`;
          }
        } catch (_e) {
          // Ignorar fallo al generar reporte
        }

        const errorMsg = (payload.message || '') + reproductionReport;
        const err = new Error(errorMsg);
        if (errorMsg.includes('INVALID_CHOICE')) {
          err.name = 'InvalidChoiceError';
        }
        reject(err);
      }
    }
    if (!showdownWorker) {
      reject(new Error('showdownWorker is null'));
      return;
    }
    if (showdownWorker.addEventListener) {
      showdownWorker.addEventListener('message', handler)
    } else {
      showdownWorker.onmessage = handler
    }
  })
}

export async function isPlayerTrappedInWorker(): Promise<boolean> {
  if (!showdownWorker) return false
  showdownWorker.postMessage({
    type: 'CHECK_TRAPPED'
  })
  return new Promise((resolve) => {
    if (!showdownWorker) return resolve(false)
    const handler = (event: MessageEvent) => {
      const data = event.data as { type: string; payload: { trapped: boolean } };
      const { type, payload } = data;
      const worker = showdownWorker!
      if (type === 'CHECK_TRAPPED_RESPONSE') {
        if (worker.removeEventListener) {
          worker.removeEventListener('message', handler)
        } else {
          worker.onmessage = null
        }
        resolve(!!payload.trapped)
      }
    }
    if (showdownWorker.addEventListener) {
      showdownWorker.addEventListener('message', handler)
    } else {
      showdownWorker.onmessage = handler
    }
  })
}


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
  
  const { sanitizePokemon } = await import('@/logic/pokemon/pokemonFactory')
  const { useMapStore } = await import('@/stores/map')
  const mapStore = useMapStore() as unknown as MapStore
  const finalEnemyPoke = enemyPoke
  const finalEnemyTeam = enemyTeam && enemyTeam.length > 0 ? enemyTeam : [finalEnemyPoke]
  const startingEnemyPoke = finalEnemyTeam.find(p => p && p.hp > 0) || finalEnemyPoke

  sanitizePokemon(playerPoke)
  finalEnemyTeam.forEach((p: Pokemon) => p && sanitizePokemon(p))

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
    _initialEnemy: startingEnemyPoke,
    _initialPlayer: playerPoke,
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
    showdownWorker = new Worker(new URL('./showdown.worker.ts', import.meta.url), { type: 'module' });
    (window as unknown as Record<string, unknown>).__showdownWorker__ = showdownWorker;
    if (typeof window !== 'undefined' && window.__VITE_DEBUG__) {
      window.__VITE_DEBUG__.getSimulatorState = getSimulatorState;
    }
     // Generar la semilla (seed) en el cliente y guardarla para reproducibilidad de errores
     const debugSeed = (typeof window !== 'undefined' && window.__VITE_DEBUG__?.battleSeed);
     const seedArr = debugSeed || [
       Math.floor(Math.random() * 0x10000),
       Math.floor(Math.random() * 0x10000),
       Math.floor(Math.random() * 0x10000),
       Math.floor(Math.random() * 0x10000)
     ];
     if (ctx.activeBattle.value) {
       ctx.activeBattle.value.seed = seedArr;
       ctx.activeBattle.value.battleHistory = [];
     }

    // Generar el equipo ordenado del jugador para Showdown
    const playerTeamList = [...(ctx.gs.state.team || [])].filter((p): p is Pokemon => !!p);
    const initialPlayerIdx = playerTeamList.findIndex(p => p.uid === initialPlayer.uid);
    if (initialPlayerIdx > 0) {
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
      if (initialEnemyIdx > 0) {
        const [p] = enemyTeamList.splice(initialEnemyIdx, 1);
        if (p) enemyTeamList.unshift(p);
      }
    }
    const p2Team = enemyTeamList.map(p => mapToShowdownSet(p));
    const p2Hps: Record<string, number> = {};
    enemyTeamList.forEach(p => {
      if (p) p2Hps[p.uid] = p.hp;
    });
    const initialWeatherOfficial = mapVisualToOfficialWeather(battleState?.weather?.type, ACTIVE_GENERATION);
    
    const p1Statuses: Record<string, string> = {};
    playerTeamList.forEach(p => {
      if (p) p1Statuses[p.uid] = p.status || '';
    });
    const p2Statuses: Record<string, string> = {};
    enemyTeamList.forEach(p => {
      if (p) p2Statuses[p.uid] = p.status || '';
    });

    logger.info('ShowdownWorker', `Inicializando batalla en el worker con clima: ${initialWeatherOfficial}, debugSeed: ${JSON.stringify(debugSeed)}, seedArr: ${JSON.stringify(seedArr)}`);
    
    showdownWorker.postMessage({
      type: 'INIT_BATTLE',
      payload: {
        p1: { name: 'Player', team: p1Team.map((p, idx) => ({ ...p, nickname: playerTeamList[idx]?.uid?.split('-')[0], name: playerTeamList[idx]?.uid?.split('-')[0], uid: playerTeamList[idx]?.uid })) },
        p2: { name: battleState?.trainerName || 'Enemy', team: p2Team.map((p, idx) => ({ ...p, nickname: enemyTeamList[idx]?.uid?.split('-')[0], name: enemyTeamList[idx]?.uid?.split('-')[0], uid: enemyTeamList[idx]?.uid })) },
        p1Hps,
        p2Hps,
        p1Statuses,
        p2Statuses,
        weather: initialWeatherOfficial,
        seed: seedArr
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
        console.log(`[WORKER] ${responsePayload}`);
        return;
      }
      const worker = showdownWorker!
      if (responseType === 'INIT_BATTLE_SUCCESS') {
        logger.info('ShowdownWorker', 'Batalla inicializada con éxito en el worker.');
        console.log('[E2E-ORCHESTRATOR-INIT-DEBUG] responsePayload keys:', Object.keys(responsePayload || {}));
        if (responsePayload) {
          console.log('[E2E-ORCHESTRATOR-INIT-DEBUG] debugLogs type:', typeof responsePayload.debugLogs, 'isArray:', Array.isArray(responsePayload.debugLogs));
          if (responsePayload.debugLogs) {
            console.log('[E2E-ORCHESTRATOR-INIT-DEBUG] debugLogs length:', responsePayload.debugLogs.length);
            responsePayload.debugLogs.forEach((l: string) => {
              console.log(`[E2E-WORKER-BUFFERED] ${l}`);
            });
          }
        }
        if (ctx.activeBattle.value && responsePayload) {
          ctx.activeBattle.value.playerRequest = responsePayload.p1Request;
          ctx.activeBattle.value.enemyRequest = responsePayload.p2Request;
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
    if (showdownWorker.addEventListener) {
      showdownWorker.addEventListener('message', initHandler);
    } else {
      showdownWorker.onmessage = initHandler;
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

export function testResetShowdownWorker(): void {
  if (showdownWorker) {
    showdownWorker.terminate();
    showdownWorker = null;
  }
  if (typeof window !== 'undefined') {
    const w = window as unknown as Record<string, { terminate: () => void } | null>;
    if (w.__showdownWorker__) {
      w.__showdownWorker__.terminate();
      w.__showdownWorker__ = null;
    }
  }
}
