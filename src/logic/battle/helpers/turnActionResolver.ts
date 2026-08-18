import type { BattleContext } from '@/types/battle/battleContext'
import type { CertifiedBattleGameAction } from '@/types/battle/certifiedBattleActions'
import { decideEnemyMove, shouldEnemySwitch, findBestSwitchIndex, evaluateAndUseNPCItem } from '../ai/battleAI.ts'
import { executeMoveAction } from '../actions/moveExecutor.ts'

export async function runPlayerAction(store: BattleContext, moveIndex: number) {
  const p = store.activeBattle.value?.player
  if (!p) return

  const move = p.moves[moveIndex]
  if (!move) return

  await executeMoveAction(store, 'player', move)
}

export async function runEnemyAction(store: BattleContext, bagAction?: CertifiedBattleGameAction) {
  const p = store.activeBattle.value?.player
  const e = store.activeBattle.value?.enemy
  if (!p || !e || e.hp <= 0) return

  const replayDebug = typeof window !== 'undefined' ? window.__VITE_DEBUG__ : undefined
  const isCertifiedReplay = replayDebug?.isScriptedReplayMode === true
  const isWild = !store.activeBattle.value?.isTrainer && !store.activeBattle.value?.isGym
  
  if (store.activeBattle.value) {
    store.activeBattle.value.playerUsedItem = true;
    store.activeBattle.value.enemyUsedItem = false;
  }

  let p2Skip = false
  let enemyMove = null
  if (!isCertifiedReplay) {
    if (!isWild && store.activeBattle.value && shouldEnemySwitch(e, p, store.activeBattle.value.enemyTeam, store)) {
      const bestIdx = findBestSwitchIndex(store.activeBattle.value.enemyTeam || [], p, e.uid, store)
      if (store.activeBattle.value.enemyTeam && bestIdx !== -1) {
        const { executeEnemySwitch } = await import('../actions/switchActions.ts')
        await executeEnemySwitch(store, bestIdx)
        return
      }
    }
    if (!isWild && await evaluateAndUseNPCItem(store, e)) {
      p2Skip = true
      if (store.activeBattle.value) {
        store.activeBattle.value.enemyUsedItem = true
      }
    }
    enemyMove = p2Skip ? null : decideEnemyMove(e, p, store.playerStages.value, isWild, store)
    if (!p2Skip && e.volatileCounters?.['lockedmove'] && e.volatileCounters['lockedmove'] > 0 && e.lastMove) {
      enemyMove = e.lastMove
    }
  }

  const { showdownWorker, executeTurnInWorker } = await import('../showdownWorkerClient.ts')
  const { filterShowdownLogs } = await import('../showdownBridge.ts')
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
    const enemyRequest = active?.enemyRequest as ShowdownPlayerRequest | undefined;

    const p1Choice = '';

    let p2Choice = 'struggle';
    if (p2Skip && enemyRequest?.active?.[0]?.moves) {
      const validMove = enemyRequest.active[0].moves.find((m: ShowdownMoveRequest) => !m.disabled);
      if (validMove) {
        p2Choice = `move ${validMove.id}`;
      }
    } else if (!p2Skip && enemyMove) {
      p2Choice = `move ${enemyMove.id}`;
    }
    if (isCertifiedReplay) {
      if (!bagAction) {
        throw new Error('[BattleTurn] A certified replay bag response requires the visible bag action context.');
      }
      if (!replayDebug) {
        throw new Error('[BattleTurn] Certified replay state disappeared before the bag response.');
      }
      const { requireCertifiedBagItemResponse } = await import('./certifiedBagItemActionResolver.ts');
      p2Choice = requireCertifiedBagItemResponse(replayDebug, bagAction.itemId, bagAction.targetSlot);
    }
    
    console.debug(`[BattleTurn] [runEnemyAction] Sending choices: p1Choice: "${p1Choice}", p2Choice: "${p2Choice}", p1Skip: true, p2Skip: ${p2Skip}`);
    console.debug(`[BattleTurn] [runEnemyAction] PlayerRequest:`, JSON.stringify(active?.playerRequest || {}));
    console.debug(`[BattleTurn] [runEnemyAction] EnemyRequest:`, JSON.stringify(active?.enemyRequest || {}));

    const result = await executeTurnInWorker(p1Choice, p2Choice, true, p2Skip, true)
    if (isCertifiedReplay) {
      if (!replayDebug) {
        throw new Error('[BattleTurn] Certified replay state disappeared before advancing the history cursor.');
      }
      const { ShowdownBattleRunner } = await import('./showdownBattleRunner.ts')
      ShowdownBattleRunner.advanceHistoryAfterAcceptedTurn(replayDebug)
    }
    if (active) {
      active.playerRequest = result.p1Request;
      active.enemyRequest = result.p2Request;
    }
    const filteredLogs = filterShowdownLogs(result.logs);
    await parseLogsWithSkip(store, filteredLogs, true, p2Skip);

    const { syncTeamsFromLastWorkerState } = await import('../showdownWorkerClient.ts');
    await syncTeamsFromLastWorkerState();

    const { handleForceSwitch } = await import('../resolution.ts')
    const { isRevivingForceSwitchRequest } = await import('./requestHelper.ts')
    
    const p1Force = !!result.p1Request?.forceSwitch?.some((x: boolean) => !!x) && !isRevivingForceSwitchRequest(result.p1Request)
    const p2Force = !!result.p2Request?.forceSwitch?.some((x: boolean) => !!x) && !isRevivingForceSwitchRequest(result.p2Request)
    if (p1Force && p2Force) {
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

    const isPlayerStillFainted = store.activeBattle.value?.player && store.activeBattle.value.player.hp <= 0
    const isEnemyStillFainted = store.activeBattle.value?.enemy && store.activeBattle.value.enemy.hp <= 0

    if (isPlayerStillFainted || isEnemyStillFainted) {
      if (isPlayerStillFainted && isEnemyStillFainted) {
        await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
        await store.handleFaint('enemy')
        if (store.fsm.currentState.value === store.BATTLE_STATES.EXIT_BATTLE || store.activeBattle.value?.over) return
        
        if (store.activeBattle.value?.player && store.activeBattle.value.player.hp <= 0) {
          await store.fsm.transition(store.BATTLE_STATES.ACTIVE_BATTLE, store.BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
          await store.handleFaint('player')
        }
      } else if (isPlayerStillFainted) {
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

export async function parseLogsWithSkip(store: BattleContext, logs: string[], p1Skip: boolean, p2Skip: boolean) {
  let skipLogsForP1 = false;
  let skipLogsForP2 = false;
  
  const { parseShowdownLogLine } = await import('../showdownBridge.ts');
  
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

export async function resolvePostTurnSwitchesAndFaints(
  store: BattleContext,
  result: { p1Request?: { forceSwitch?: unknown[] }; p2Request?: { forceSwitch?: unknown[] }; isOver?: boolean }
) {
  const { handleForceSwitch } = await import('../resolution.ts')
  const { isRevivingForceSwitchRequest } = await import('./requestHelper.ts')
  const fsm = store.fsm
  const { BATTLE_STATES, BATTLE_SUBSTATES } = store

  const playerFainted = !store.activeBattle.value?.player || store.activeBattle.value.player.hp <= 0
  const enemyFainted = !store.activeBattle.value?.enemy || store.activeBattle.value.enemy.hp <= 0

  const p1Force = !!result.p1Request?.forceSwitch?.some((x: unknown) => Boolean(x)) && !playerFainted && !isRevivingForceSwitchRequest(result.p1Request)
  const p2Force = !!result.p2Request?.forceSwitch?.some((x: unknown) => Boolean(x)) && !enemyFainted && !isRevivingForceSwitchRequest(result.p2Request)

  if (p1Force && p2Force) {
    await handleForceSwitch(store, 'player')
    return true
  }
  if (p1Force) {
    await handleForceSwitch(store, 'player')
    return true
  }
  if (p2Force) {
    await handleForceSwitch(store, 'enemy')
    return true
  }

  if (playerFainted || enemyFainted) {
    if (playerFainted && enemyFainted) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
      await store.handleFaint('player')
    } else if (playerFainted) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ)
      await store.handleFaint('player')
    } else {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ)
      await store.handleFaint('enemy')
    }
    if (fsm.currentState.value === BATTLE_STATES.EXIT_BATTLE || store.activeBattle.value?.over) return true
  }

  if (result.isOver && store.activeBattle.value) {
    store.activeBattle.value.over = true;
  }
  return false
}
