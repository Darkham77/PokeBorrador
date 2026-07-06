import { logger } from '../utils/logger.ts'
import type { ShowdownPlayerRequest } from '@/types/battle/battle'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { applyHealCheatToSide, type CheatPokemon } from './cheats.ts'

export let showdownWorker: Worker | null = null;
export function setShowdownWorker(worker: Worker | null) {
  showdownWorker = worker;
}

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
      gameStore.state.team.forEach((p: Pokemon | null) => {
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
      battleStore.state.enemyTeam.forEach((p: Pokemon | null) => {
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

export function testResetShowdownWorker(): void {
  if (showdownWorker) {
    showdownWorker.terminate();
    showdownWorker = null;
  }
  if (typeof window !== 'undefined') {
    const w = window as unknown as { __showdownWorker__?: { terminate: () => void } | null };
    if (w.__showdownWorker__) {
      w.__showdownWorker__.terminate();
      w.__showdownWorker__ = null;
    }
  }
}
