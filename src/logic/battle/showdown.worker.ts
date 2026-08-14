// fallow-ignore-file security-sink
import { Battle, Pokemon, Side, type PokemonSet, type SideID } from '@pkmn/sim';
import { statsMap, patchShowdownSpreadModify } from './showdownAdapter.ts';
import { parseToNumericSeed, formatToShowdownSeed } from './battleSeedManager.ts';
import { applyHealCheatToSide, applyStatusCheatToSide, syncRequestConditionsWithSimulator } from './cheats.ts';
import { createShowdownBattle } from './helpers/showdownBattleFactory.ts';
import { ShowdownTeamMapper } from './helpers/showdownTeamMapper.ts';
import { ShowdownLogEnricher } from './helpers/showdownLogEnricher.ts';
import { executeBattleTurn } from './helpers/showdownExecutor.ts';
import { syncSidePokemon } from './helpers/showdownSyncHelper.ts';
import { ACTIVE_SHOWDOWN_FORMAT } from '../../data/system/constants.ts';
import { resetDeterministicMathRandom } from './helpers/seedInitializer.ts';

export interface ExtendedPokemon extends Pokemon {
  uid?: string;
  faintQueued: boolean;
}


type ExtendedSide = Omit<Side, 'activeRequest' | 'pokemon'> & {
  pokemon: ExtendedPokemon[];
  activeRequest?: ShowdownRequest;
};

import type { ShowdownRequest } from './helpers/showdownTeamMapper.ts';

export interface CustomPokemonSet extends PokemonSet {
  stats?: Record<string, number>;
  uid?: string;
}

const debugLogs: string[] = []; // no-domain
function logDebug(msg: string) {
  debugLogs.push(msg);
  console.debug(msg);
}

function reportInitStage(stage: string): void {
  self.postMessage({ type: 'WORKER_LOG', payload: { message: stage } });
}

let isDeterministicSimulation = false; // singleton-ok

// Aplicar el monkey-patch unificado de spreadModify
patchShowdownSpreadModify(() => isDeterministicSimulation);

let currentBattle: Battle | null = null; // singleton-ok

export function setTestingBattle(battle: Battle | null): void {
  currentBattle = battle;
}

export function injectUidsIntoRequest(
  playerOrBattle: SideID | Battle,
  requestOrPlayer: unknown,
  request?: unknown
): ShowdownRequest | null {
  let battle: Battle | null = null;
  let player: SideID;
  let req: ShowdownRequest | null = null;

  if (playerOrBattle instanceof Battle) {
    battle = playerOrBattle;
    player = requestOrPlayer as SideID;
    req = request as ShowdownRequest;
  } else {
    battle = currentBattle;
    player = playerOrBattle;
    req = requestOrPlayer as ShowdownRequest;
  }

  return ShowdownTeamMapper.injectUidsIntoRequest(battle, player, req);
}

interface SynchronizedPokemonState {
  uid: string;
  hp: number;
  maxHp: number;
  status: string;
  fainted: boolean;
  boosts?: Record<string, number>;
  volatiles?: string[];
}

function getSideTeamState(side: ExtendedSide | null | undefined): Array<SynchronizedPokemonState | null> {
  if (!side || !Array.isArray(side.pokemon)) return [];
  return side.pokemon.map((p: ExtendedPokemon | null) => {
    if (!p) return null;
    const status = p.status || '';
    const volatiles = p.volatiles ? Object.keys(p.volatiles) : [];
    return {
      uid: p.uid || '',
      hp: p.hp,
      maxHp: p.maxhp,
      status: (status as string) === 'fnt' ? '' : status,
      fainted: !!p.fainted,
      boosts: p.boosts ? { ...p.boosts } : undefined,
      volatiles: volatiles.length > 0 ? volatiles : undefined
    };
  });
}


interface WorkerEventPayload {
  p1?: { name?: string; team: CustomPokemonSet[] };
  p2?: { name?: string; team: CustomPokemonSet[] };
  seed?: [number, number, number, number];
  p1Choice?: string;
  p2Choice?: string;
  p1Skip?: boolean;
  p2Skip?: boolean;
  p1UsedBattleItem?: boolean;
  p1Hps?: Record<string, number>;
  p2Hps?: Record<string, number>;
  p1Statuses?: Record<string, string>;
  p2Statuses?: Record<string, string>;
  weather?: string;
  debugStatus?: { side: SideID; uid: string; status: string };
  side?: SideID;
  type?: 'heal';
  cheats?: Array<{ turn: number; side: SideID; type: 'heal' }>;
  history?: Array<{ turnCount: number; p1Choice: string; p2Choice: string; battleTurn: number; p1Heal?: true; p2Heal?: true }>;
  certifiedHistoryStep?: number;
  isDeterministicSimulation?: boolean;
  isFuzzerSimulation?: boolean;
  format?: string;
}

interface WorkerEventData {
  type: string;
  payload: WorkerEventPayload;
}

self.onmessage = (event: MessageEvent<WorkerEventData>) => {
  const { type, payload } = event.data;

  try {
    switch (type) {
      case 'INIT_BATTLE': {
        debugLogs.length = 0;
        reportInitStage('received');
        isDeterministicSimulation = !!payload.isDeterministicSimulation;
        logDebug(`[E2E-WORKER-DEBUG] INIT_BATTLE received. payload.isDeterministicSimulation: ${payload.isDeterministicSimulation}, module isDeterministicSimulation set to: ${isDeterministicSimulation}`);
        const { p1, p2 } = payload;
        if (!p1 || !p2) {
          throw new Error('INIT_BATTLE payload must contain p1 and p2');
        }

        logDebug(`[E2E-WORKER-DEBUG] P1 Team moves: ${JSON.stringify(p1.team.map((p: CustomPokemonSet) => ({ name: p.name, moves: p.moves })))}`);
        logDebug(`[E2E-WORKER-DEBUG] P2 Team moves: ${JSON.stringify(p2.team.map((p: CustomPokemonSet) => ({ name: p.name, moves: p.moves })))}`);
        
        logDebug(`[E2E-WORKER-DEBUG] init Battle.prototype.spreadModify type is: ${typeof Battle.prototype.spreadModify}`);
        logDebug(`[E2E-WORKER-DEBUG] spreadModify code: ${Battle.prototype.spreadModify.toString()}`);
        logDebug(`[E2E-WORKER-DEBUG] init statsMap size is: ${statsMap.size}`);
        
                // Cache stats by nickname/short-uid prefix to survive Showdown's set parsing
        statsMap.clear();
        ShowdownTeamMapper.populateStatsMap(p1.team);
        ShowdownTeamMapper.populateStatsMap(p2.team);
        
        logDebug(`[E2E-WORKER-DEBUG] statsMap populated. Size: ${statsMap.size}, Keys: ${JSON.stringify(Array.from(statsMap.keys()))}`);
        lastLogIndex = 0;

        const seedVal = parseToNumericSeed(payload.seed);
        const seedStr = formatToShowdownSeed(seedVal);
        console.debug(`[E2E-SEED-WORKER-DEBUG] Initializing Battle with seedVal: ${JSON.stringify(seedVal)} and seedStr: "${seedStr}"`);

        const battleInstance = createShowdownBattle(payload.format || ACTIVE_SHOWDOWN_FORMAT, seedStr);
        currentBattle = battleInstance;

        // Intercept and enrich logs in real-time
        ShowdownLogEnricher.setupRealtimeEnrichment(battleInstance);

        // Configure players (this automatically triggers the battle in pkmn/sim)
        reportInitStage('before-p1-set-player');
        battleInstance.setPlayer('p1', { name: p1.name || 'Player 1', team: p1.team });
        reportInitStage('after-p1-set-player');
        resetDeterministicMathRandom();
        battleInstance.setPlayer('p2', { name: p2.name || 'Player 2', team: p2.team });
        reportInitStage('after-p2-set-player');

        // Associate UIDs of sets to the simulator instances using direct slot index
        if (Array.isArray(p1.team)) {
          battleInstance.p1.pokemon.forEach((pokemon, idx) => {
            if (pokemon) {
              const set = p1.team[idx];
              if (set && set.uid) {
                Reflect.set(pokemon, 'uid', set.uid);
              }
            }
          });
        }
        if (Array.isArray(p2.team)) {
          battleInstance.p2.pokemon.forEach((pokemon, idx) => {
            if (pokemon) {
              const set = p2.team[idx];
              if (set && set.uid) {
                Reflect.set(pokemon, 'uid', set.uid);
              }
            }
          });
        }

        // Enrich initial lead switches retrospectively
        ShowdownLogEnricher.enrichRetroactiveLeads(battleInstance);

        // Sincronizar HP iniciales de todo el equipo
        if (payload.p1Hps && typeof payload.p1Hps === 'object') {
          syncSidePokemon(currentBattle.p1, payload.p1Hps, payload.p1Statuses);
        }
        if (payload.p2Hps && typeof payload.p2Hps === 'object') {
          syncSidePokemon(currentBattle.p2, payload.p2Hps, payload.p2Statuses);
        }

        if (payload.weather && payload.weather !== 'none') {
          currentBattle.field.setWeather(payload.weather, 'debug' as const);
        }

        syncRequestConditionsWithSimulator(currentBattle.p1 as ExtendedSide);
        syncRequestConditionsWithSimulator(currentBattle.p2 as ExtendedSide);

        // Enviar logs iniciales de inicio de combate junto con los requests iniciales
        const initLogs = getNewLogs();
        self.postMessage({ 
          type: 'INIT_BATTLE_SUCCESS', 
          payload: { 
            logs: initLogs,
            p1Request: injectUidsIntoRequest('p1', currentBattle.p1.activeRequest),
            p2Request: injectUidsIntoRequest('p2', currentBattle.p2.activeRequest),
            p1TeamState: getSideTeamState(currentBattle.p1 as ExtendedSide),
            p2TeamState: getSideTeamState(currentBattle.p2 as ExtendedSide),
            debugLogs
          } 
        });
        break;
      }

      case 'APPLY_CHEATS': {
        if (!currentBattle) throw new Error('currentBattle is null');
        const battle = currentBattle;
        const { cheats } = payload;
        if (cheats && Array.isArray(cheats)) {
          cheats.forEach(c => {
            const side = c.side === 'p1' ? battle.p1 : battle.p2;
            applyHealCheatToSide(side);
            
            // Emitir logs de curación oficiales en Showdown para que la UI se entere y actualice visualmente
            side.pokemon.forEach(p => {
              if (p) {
                battle.add('-heal', p, `${p.hp}/${p.maxhp}`);
              }
            });

            syncRequestConditionsWithSimulator(side);
          });
        }
        self.postMessage({
          type: 'APPLY_CHEATS_DONE',
          payload: {
            p1Request: injectUidsIntoRequest('p1', battle.p1.activeRequest),
            p2Request: injectUidsIntoRequest('p2', battle.p2.activeRequest),
            p1TeamState: getSideTeamState(battle.p1 as ExtendedSide),
            p2TeamState: getSideTeamState(battle.p2 as ExtendedSide)
          }
        });
        break;
      }

      case 'APPLY_DEBUG_STATUS': {
        if (!currentBattle) throw new Error('currentBattle is null');
        const debugStatus = payload.debugStatus;
        if (!debugStatus) throw new Error('APPLY_DEBUG_STATUS requires debugStatus payload');
        const side = debugStatus.side === 'p1' ? currentBattle.p1 : currentBattle.p2;
        applyStatusCheatToSide(side, debugStatus.uid, debugStatus.status);
        syncRequestConditionsWithSimulator(side);
        self.postMessage({
          type: 'APPLY_DEBUG_STATUS_DONE',
          payload: {
            p1Request: injectUidsIntoRequest('p1', currentBattle.p1.activeRequest),
            p2Request: injectUidsIntoRequest('p2', currentBattle.p2.activeRequest),
            p1TeamState: getSideTeamState(currentBattle.p1 as ExtendedSide),
            p2TeamState: getSideTeamState(currentBattle.p2 as ExtendedSide)
          }
        });
        break;
      }

      case 'EXECUTE_TURN': {
        if (!currentBattle) throw new Error('currentBattle is null');
        const battle = currentBattle;
        const { p1Choice, p2Choice, p1Skip, p2Skip, p1UsedBattleItem, p1Hps, p2Hps, p1Statuses, p2Statuses, history, certifiedHistoryStep } = payload;

        const result = executeBattleTurn({
          battle,
          p1Choice: p1Choice || '',
          p2Choice: p2Choice || '',
          p1Skip: !!p1Skip,
          p2Skip: !!p2Skip,
          p1UsedBattleItem: !!p1UsedBattleItem,
          p1Hps,
          p2Hps,
          p1Statuses,
          p2Statuses,
          history,
          currentStep: certifiedHistoryStep,
          // Every worker turn is a replay submission. Fuzzer generation runs
          // directly through ShowdownBattleEngine; enabling generation IPB
          // here would mutate PP/HP beyond the certified history.
          isFuzzerSimulation: false
        });

        // NOTE: syncSidePokemon is intentionally NOT called here after executeBattleTurn.
        // The pre-turn HP sync already runs inside engine.executeTurn (via p1Hps/p2Hps inputs)
        // BEFORE the choices are resolved. Calling it POST-TURN would overwrite the damage
        // computed by Showdown (e.g. Sturdy at 1 HP reset back to full HP), corrupting the
        // p2Request condition sent to the client and causing infinite AI cycling loops.
        syncRequestConditionsWithSimulator(battle.p1);
        syncRequestConditionsWithSimulator(battle.p2);

        const turnLogs = getNewLogs();
        if (p2Skip) {
          turnLogs.unshift('|turnStart|p2Skip=true');
        } else {
          turnLogs.unshift('|turnStart|p2Skip=false');
        }
        const isOver = battle.ended;
        const winner = battle.winner;
        const p1ForceSwitch = !!(battle.p1.activeRequest?.forceSwitch?.[0]);
        const p2ForceSwitch = !!(battle.p2.activeRequest?.forceSwitch?.[0]);

        self.postMessage({ 
          type: 'TURN_SUCCESS', 
          payload: { 
            logs: turnLogs,
            isOver,
            winner,
            p1ForceSwitch,
            p2ForceSwitch,
            p1Request: injectUidsIntoRequest('p1', battle.p1.activeRequest),
            p2Request: injectUidsIntoRequest('p2', battle.p2.activeRequest),
            p1TeamState: getSideTeamState(battle.p1 as ExtendedSide),
            p2TeamState: getSideTeamState(battle.p2 as ExtendedSide),
            p1ActionConsumed: result.p1AcceptedChoice !== '',
            p2ActionConsumed: result.p2AcceptedChoice !== ''
          } 
        });
        break;
      }



      case 'CHECK_TRAPPED': {
        const activeReq = currentBattle?.p1?.activeRequest as { active?: Array<{ trapped?: boolean; maybeTrapped?: boolean } | null> } | undefined; // domain-ok
        const trapped = !!(activeReq?.active?.[0]?.trapped || activeReq?.active?.[0]?.maybeTrapped);
        self.postMessage({
          type: 'CHECK_TRAPPED_RESPONSE',
          payload: { trapped }
        });
        break;
      }

      case 'GET_SIMULATOR_STATE': {
        const p1State = currentBattle ? currentBattle.p1.pokemon.map(p => ({
          uid: (p as ExtendedPokemon).uid || p.name,
          hp: p.hp,
          maxhp: p.maxhp,
          status: p.status,
          fainted: p.fainted
        })) : [];
        const p2State = currentBattle ? currentBattle.p2.pokemon.map(p => ({
          uid: (p as ExtendedPokemon).uid || p.name,
          hp: p.hp,
          maxhp: p.maxhp,
          status: p.status,
          fainted: p.fainted
        })) : [];
        self.postMessage({
          type: 'GET_SIMULATOR_STATE_RESPONSE',
          payload: { p1: p1State, p2: p2State }
        });
        break;
      }

      case 'WIN_BATTLE': {
        if (currentBattle && !currentBattle.ended) {
          const side = payload.side || 'p1';
          currentBattle.win(side);
          console.debug(`[Showdown Worker] Batalla declarada terminada por comando de victoria (${side}).`);
        }
        currentBattle = null;
        statsMap.clear();
        break;
      }

      case 'FORCED_END_BATTLE': {
        if (currentBattle) {
          currentBattle.ended = true;
          console.debug(`[Showdown Worker] Batalla forzosamente finalizada por debug/huida.`);
        }
        currentBattle = null;
        statsMap.clear();
        break;
      }

      default:
        console.warn(`[Showdown Worker] Evento desconocido: ${type}`);
    }
  } catch (error) {
    const errorMsg = (error as Error).message;
    const errorStack = (error as Error).stack || '';
    console.error('[Showdown Worker] CRITICAL ERROR IN WORKER:', error);
    self.postMessage({ 
      type: 'ERROR', 
      payload: { 
        message: `${errorMsg}\nStack: ${errorStack}\nPayload: ${JSON.stringify(payload || {})}` 
      } 
    });
  }
};

let lastLogIndex = 0; // singleton-ok

function getNewLogs(): string[] {
  if (!currentBattle) return [];
  // En Gen 3 obtenemos el log acumulado y devolvemos la porción nueva del turno
  const allLogs = currentBattle.log;
  const newLogs = allLogs.slice(lastLogIndex);
  lastLogIndex = allLogs.length;
  return newLogs;
}
