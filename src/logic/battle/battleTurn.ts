import { gsapSleep as sleep } from '@/logic/utils/gsapHelpers'
import { decideEnemyMove, shouldEnemySwitch, findBestSwitchIndex, evaluateAndUseNPCItem } from './ai/battleAI.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import { logger } from '../utils/logger.ts'
import { executeMoveAction } from './actions/moveExecutor.ts'
import { updateCastformForm } from './battleFlow.ts'




/**
 * Handles the turn logic for a single move execution.
 */
export async function executeTurn(store: BattleContext, moveIndex: number) {
  const p = store.activeBattle.value?.player
  const e = store.activeBattle.value?.enemy
  if (p) {
    console.debug(`[E2E-DEBUG-TURN] executeTurn started. moveIndex: ${moveIndex}, active player: "${p.nickname || p.name}" (UID: ${p.uid}), moves: ${JSON.stringify(p.moves.map(m => m?.id))}`);
  }
  
  if (!p || !e) {
    logger.warn('BattleTurn', 'Aborting turn: Player or Enemy is null', { p, e })
    return
  }

  // Resetear banderas de uso de objetos al inicio del turno
  if (store.activeBattle.value) {
    store.activeBattle.value.playerUsedItem = false;
    store.activeBattle.value.enemyUsedItem = false;
  }

  // Transformar Castform antes de decidir y evaluar movimientos de IA
  if (store.activeBattle.value) {
    updateCastformForm(p, store.activeBattle.value.weather?.type, store.addLog)
    updateCastformForm(e, store.activeBattle.value.weather?.type, store.addLog)
  }

  const fsm = store.fsm
  const { BATTLE_STATES, BATTLE_SUBSTATES } = store

  // Thrash / lockedmove check
  if (p.volatileCounters?.['lockedmove'] && p.volatileCounters['lockedmove'] > 0 && p.lastMove) {
    const forcedIdx = p.moves.findIndex((m) => m?.id === p.lastMove?.id);
    if (forcedIdx !== -1) moveIndex = forcedIdx;
  } else if (p.thrashTurns && p.thrashTurns > 0) {
    const forcedIdx = p.moves.findIndex((m) => m?.effect === 'thrash');
    if (forcedIdx !== -1) moveIndex = forcedIdx;
  } else if (p.encoreTurns && p.encoreTurns > 0 && p.encoreMove) {
    const forcedIdx = p.moves.findIndex((m) => m?.id === p.encoreMove?.id);
    if (forcedIdx !== -1) moveIndex = forcedIdx;
  }

  // If there is only 1 move available (e.g. Rollout, Recharge, Struggle, locked move),
  // fallback moveIndex to 0 if the requested moveIndex is out of range.
  if (p.moves.length === 1 && p.moves[0]) {
    moveIndex = 0;
  }

  const isLocked = !!(p.volatileCounters?.['lockedmove'] && p.volatileCounters['lockedmove'] > 0) || 
                   !!(p.volatileCounters?.['twoturnmove'] && p.volatileCounters['twoturnmove'] > 0) || 
                   !!(p.thrashTurns && p.thrashTurns > 0) ||
                   p.moves.length === 1;
  const isStruggle = moveIndex === -1;
  const move = isStruggle ? null : p.moves[moveIndex];

  if (!isStruggle && !isLocked && move?.id !== 'recharge' && move?.id !== 'struggle') {
    if (!move || move.pp <= 0) {
      store.addLog(`¡No queda PP para ${move?.name || 'este movimiento'}!`, 'log-info', p)
      return
    }
  }

  const isWild = !store.activeBattle.value?.isTrainer && !store.activeBattle.value?.isGym
  
  // Evaluar uso de objetos por parte del enemigo en turno normal
  let p2Skip = false
  if (!isWild && await evaluateAndUseNPCItem(store, e)) {
    p2Skip = true
    if (store.activeBattle.value) {
      store.activeBattle.value.enemyUsedItem = true
    }
  }

  let eMove = p2Skip ? null : decideEnemyMove(e, p, store.enemyStages.value, isWild, store)
  if (!p2Skip && e.volatileCounters?.['lockedmove'] && e.volatileCounters['lockedmove'] > 0 && e.lastMove) {
    eMove = e.lastMove
  }

  // Importar dinámicamente dependencias asíncronas para evitar dependencias circulares
  const { showdownWorker, executeTurnInWorker } = await import('./showdownWorkerClient.ts')
  const { filterShowdownLogs } = await import('./showdownBridge.ts')

  if (showdownWorker) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.BUILD_QUEUE)
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POP_ACTION)

    if (move && move.pp > 0 && !isLocked) {
      move.pp--
    }

    const { validateAndInterceptFaintedPlayer } = await import('./resolution.ts')
    const intercepted = await validateAndInterceptFaintedPlayer(store)
    if (intercepted) return

    const active = store.activeBattle.value;
    let p1Choice = isStruggle ? 'struggle' : `move ${move?.id ?? 'struggle'}`;
    if (active?.playerRequest?.active?.[0]?.moves) {
      const activeMoves = active.playerRequest.active[0].moves;
      if (activeMoves && activeMoves.length === 1 && activeMoves[0] && activeMoves[0].id === 'recharge') {
        p1Choice = 'move recharge';
      }
    }
    let p2Choice = 'struggle';
    const enemyTeam = store.activeBattle.value?.enemyTeam;
    const wantSwitch = !isWild && shouldEnemySwitch(e, p, enemyTeam, store);
    if (wantSwitch) {
      const bestIdx = findBestSwitchIndex(enemyTeam || [], p, e.uid, store);
      if (bestIdx !== -1) {
        const { ShowdownTeamResolver } = await import('./showdownTeamResolver.ts');
        const targetMon = enemyTeam?.[bestIdx];
        if (targetMon && targetMon.uid) {
          const slot = ShowdownTeamResolver.getShowdownSlotForUid(active?.enemyRequest, targetMon.uid);
          p2Choice = `switch ${slot}`;
        }
      }
    } else {
      if (eMove) {
        p2Choice = `move ${eMove.id}`;
      }
      if (p2Skip && active?.enemyRequest?.active?.[0]?.moves) {
        const validMove = active.enemyRequest.active[0].moves.find((m: { id?: string; disabled?: boolean | string }) => !m.disabled);
        if (validMove) {
          p2Choice = `move ${validMove.id}`;
        }
      }
    }
    // Interceptar elección de enemigo si está inyectada dinámicamente en el test determinista
    if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.nextEnemyChoice) {
      if (!p2Skip) {
        p2Choice = window.__VITE_DEBUG__.nextEnemyChoice;
        console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Intercepted enemy choice via nextEnemyChoice in executeTurn: ${p2Choice}`);
        window.__VITE_DEBUG__.nextEnemyChoice = undefined;
      } else {
        console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Bypassed nextEnemyChoice interception in executeTurn because P2 is in wait state.`);
      }
    } else if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.enemyChoicesQueue?.length) {
      p2Choice = window.__VITE_DEBUG__.enemyChoicesQueue.shift() ?? p2Choice;
    }
    let p1Skip = false;
    if (p1Choice === 'pass') {
      p1Choice = '';
      p1Skip = true;
    }
    if (p2Choice === 'pass') {
      p2Choice = '';
      p2Skip = true;
    }
    const result = await executeTurnInWorker(p1Choice, p2Choice, p1Skip, p2Skip)
    logger.info('BattleTurn', 'Logs recibidos de pkms:', result.logs)

    if (active) {
      active.playerRequest = result.p1Request;
      active.enemyRequest = result.p2Request;
    }

    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.APPLY_MOVE)

    // Reproducir todos los logs del simulador asíncronamente omitiendo efectos de dummy moves.
    const filteredLogs = filterShowdownLogs(result.logs);
    await parseLogsWithSkip(store, filteredLogs, false, p2Skip);

    const { syncTeamsFromLastWorkerState } = await import('./showdownWorkerClient.ts');
    await syncTeamsFromLastWorkerState();

    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EVAL_HP)

    const { handleForceSwitch } = await import('./resolution.ts')
    
    // Las sustituciones forzadas por movimientos pivot (U-turn, Chilly Reception, etc.)
    // ocurren durante el turno y tienen prioridad sobre los debilitados de fin de turno.
    const p1Force = !!result.p1Request?.forceSwitch?.length
    const p2Force = !!result.p2Request?.forceSwitch?.length
    if (p1Force && p2Force) {
      await handleForceSwitch(store, 'enemy')
      await handleForceSwitch(store, 'player')
      return
    }
    if (p1Force) {
      await handleForceSwitch(store, 'player')
      return
    }
    if (p2Force) {
      await handleForceSwitch(store, 'enemy')
      return
    }

    const playerFainted = !store.activeBattle.value?.player || store.activeBattle.value.player.hp <= 0
    const enemyFainted = !store.activeBattle.value?.enemy || store.activeBattle.value.enemy.hp <= 0

    if (playerFainted || enemyFainted) {
      if (playerFainted && enemyFainted) {
        // En un Doble KO por daño de retroceso (recoil de Struggle), el enemigo siempre se debilita primero
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
        await store.handleFaint('enemy')
        if (fsm.currentState.value === BATTLE_STATES.EXIT_BATTLE || store.activeBattle.value?.over) return
        
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
        await store.handleFaint('player')
      } else if (playerFainted) {
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
        await store.handleFaint('player')
      } else {
        await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
        await store.handleFaint('enemy')
      }
      if (fsm.currentState.value === BATTLE_STATES.EXIT_BATTLE || store.activeBattle.value?.over) return
    }

    if (result.isOver && store.activeBattle.value) {
      store.activeBattle.value.over = true;
    }
  }

  if (store.activeBattle.value?.over) {
    if (store.activeBattle.value.fled) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAY_ESCAPE_ANIM)
      if (store.animations?.awaitTween) {
        await store.animations.awaitTween('escape-enemy')
      } else {
        await sleep(800)
      }
      await store.endBattle(false, true)
    }
    return
  }
  
  console.debug(`[BattleTurn] executeTurn finished. calling store.persistBattle`);
  if (store.persistBattle) store.persistBattle()
}


export async function runPlayerAction(store: BattleContext, moveIndex: number) {
  const p = store.activeBattle.value?.player
  if (!p) return

  const move = p.moves[moveIndex]
  if (!move) return

  await executeMoveAction(store, 'player', move)
}

export async function runEnemyAction(store: BattleContext) {
  const p = store.activeBattle.value?.player
  const e = store.activeBattle.value?.enemy
  if (!p || !e || e.hp <= 0) return

  const isWild = !store.activeBattle.value?.isTrainer && !store.activeBattle.value?.isGym
  
  if (store.activeBattle.value) {
    store.activeBattle.value.playerUsedItem = true;
    store.activeBattle.value.enemyUsedItem = false;
  }

  if (!isWild && store.activeBattle.value && shouldEnemySwitch(e, p, store.activeBattle.value.enemyTeam, store)) {
    const bestIdx = findBestSwitchIndex(store.activeBattle.value.enemyTeam || [], p, e.uid, store)
    if (store.activeBattle.value.enemyTeam && bestIdx !== -1) {
      const { executeEnemySwitch } = await import('./actions/switchActions.ts')
      await executeEnemySwitch(store, bestIdx)
      return
    }
  }

  let p2Skip = false
  if (!isWild && await evaluateAndUseNPCItem(store, e)) {
    p2Skip = true
    if (store.activeBattle.value) {
      store.activeBattle.value.enemyUsedItem = true
    }
  }

  let enemyMove = p2Skip ? null : decideEnemyMove(e, p, store.playerStages.value, isWild, store)
  if (!p2Skip && e.volatileCounters?.['lockedmove'] && e.volatileCounters['lockedmove'] > 0 && e.lastMove) {
    enemyMove = e.lastMove
  }

  const { showdownWorker, executeTurnInWorker } = await import('./showdownWorkerClient.ts')
  const { filterShowdownLogs } = await import('./showdownBridge.ts')
  if (showdownWorker) {
    interface ShowdownMoveRequest {
      id?: string;
      move?: string;
      disabled?: boolean;
    }
    interface ShowdownActiveRequest {
      moves?: ShowdownMoveRequest[];
    }
    interface ShowdownPlayerRequest {
      active?: ShowdownActiveRequest[];
    }

    const active = store.activeBattle.value;
    const playerRequest = active?.playerRequest as ShowdownPlayerRequest | undefined;
    const enemyRequest = active?.enemyRequest as ShowdownPlayerRequest | undefined;

    let p1Choice = 'struggle';
    if (playerRequest?.active?.[0]?.moves) {
      const validMove = playerRequest.active[0].moves.find((m: ShowdownMoveRequest) => !m.disabled);
      if (validMove) {
        p1Choice = `move ${validMove.id}`;
      }
    } else if (p && p.moves && p.moves.length > 0) {
      const firstMove = p.moves[0];
      if (firstMove && firstMove.id) {
        p1Choice = `move ${firstMove.id}`;
      }
    }

    let p2Choice = 'struggle';
    if (p2Skip && enemyRequest?.active?.[0]?.moves) {
      const validMove = enemyRequest.active[0].moves.find((m: ShowdownMoveRequest) => !m.disabled);
      if (validMove) {
        p2Choice = `move ${validMove.id}`;
      }
    } else if (!p2Skip && enemyMove) {
      p2Choice = `move ${enemyMove.id}`;
    }
    // Interceptar elección de enemigo si está inyectada dinámicamente en el test determinista
    if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.nextEnemyChoice) {
      p2Choice = window.__VITE_DEBUG__.nextEnemyChoice;
      console.debug(`[E2E-MOCK-CENTRAL-DEBUG] Intercepted enemy choice via nextEnemyChoice: ${p2Choice}`);
      window.__VITE_DEBUG__.nextEnemyChoice = undefined;
    } else if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.enemyChoicesQueue?.length) {
      p2Choice = window.__VITE_DEBUG__.enemyChoicesQueue.shift() ?? p2Choice;
    }
    
    console.debug(`[BattleTurn] [runEnemyAction] Sending choices: p1Choice: "${p1Choice}", p2Choice: "${p2Choice}", p1Skip: true, p2Skip: ${p2Skip}`);
    console.debug(`[BattleTurn] [runEnemyAction] PlayerRequest:`, JSON.stringify(active?.playerRequest || {}));
    console.debug(`[BattleTurn] [runEnemyAction] EnemyRequest:`, JSON.stringify(active?.enemyRequest || {}));

    const result = await executeTurnInWorker(p1Choice, p2Choice, true, p2Skip)
    if (active) {
      active.playerRequest = result.p1Request;
      active.enemyRequest = result.p2Request;
    }
    const filteredLogs = filterShowdownLogs(result.logs);
    await parseLogsWithSkip(store, filteredLogs, true, p2Skip);

    const { syncTeamsFromLastWorkerState } = await import('./showdownWorkerClient.ts');
    await syncTeamsFromLastWorkerState();

    const { handleForceSwitch } = await import('./resolution.ts')
    
    // Las sustituciones forzadas por movimientos pivot (U-turn, Chilly Reception, etc.)
    // ocurren durante el turno y tienen prioridad sobre los debilitados de fin de turno.
    const p1Force = !!result.p1Request?.forceSwitch?.length
    const p2Force = !!result.p2Request?.forceSwitch?.length
    if (p1Force && p2Force) {
      await handleForceSwitch(store, 'enemy')
      await handleForceSwitch(store, 'player')
      return
    }
    if (p1Force) {
      await handleForceSwitch(store, 'player')
      return
    }
    if (p2Force) {
      await handleForceSwitch(store, 'enemy')
      return
    }

    const playerFainted = store.activeBattle.value?.player && store.activeBattle.value.player.hp <= 0
    const enemyFainted = store.activeBattle.value?.enemy && store.activeBattle.value.enemy.hp <= 0

    if (playerFainted || enemyFainted) {
      if (playerFainted && enemyFainted) {
        await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
        await store.handleFaint('enemy')
        if (store.fsm.currentState.value === store.BATTLE_STATES.EXIT_BATTLE || store.activeBattle.value?.over) return
        
        await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
        await store.handleFaint('player')
      } else if (playerFainted) {
        await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
        await store.handleFaint('player')
      } else {
        await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
        await store.handleFaint('enemy')
      }
      if (store.fsm.currentState.value === store.BATTLE_STATES.EXIT_BATTLE || store.activeBattle.value?.over) return
    }

    if (result.isOver && store.activeBattle.value) {
      store.activeBattle.value.over = true;
    }
  }
}



async function parseLogsWithSkip(store: BattleContext, logs: string[], p1Skip: boolean, p2Skip: boolean) {
  let skipLogsForP1 = false;
  let skipLogsForP2 = false;
  
  const { parseShowdownLogLine } = await import('./showdownBridge.ts');
  
  for (const logLine of logs) {
    const parts = logLine.split('|').map(x => x.trim());
    const type = parts[1];
    
    if (p1Skip) {
      if (type === 'move' && parts[2]?.startsWith('p1')) {
        skipLogsForP1 = true;
        continue;
      }
      if (skipLogsForP1) {
        if (type === '-damage' && parts[2]?.startsWith('p2')) {
          continue;
        }
        if (type === 'move' && !parts[2]?.startsWith('p1')) {
          skipLogsForP1 = false;
        }
      }
    }
    
    if (p2Skip) {
      if (type === 'move' && parts[2]?.startsWith('p2')) {
        skipLogsForP2 = true;
        continue;
      }
      if (skipLogsForP2) {
        if (type === '-damage' && parts[2]?.startsWith('p1')) {
          continue;
        }
        if (type === 'move' && !parts[2]?.startsWith('p2')) {
          skipLogsForP2 = false;
        }
      }
    }
    
    await parseShowdownLogLine(store, logLine, logs);
  }
}

