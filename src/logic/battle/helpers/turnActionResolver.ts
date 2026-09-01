import type { BattleContext } from '@/types/battle/battleContext'
import type { CertifiedBattleGameAction } from '@/types/battle/certifiedBattleActions'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { decideEnemyMove, shouldEnemySwitch, findBestSwitchIndex, evaluateAndUseNPCItem } from '../ai/battleAI.ts'
import { ShowdownTeamResolver } from '../showdownTeamResolver.ts'
import { showdownWorker, executeTurnInWorker, syncTeamsFromLastWorkerState } from '../showdownWorkerClient.ts'
import { filterShowdownLogs, parseShowdownLogLine } from '../showdownBridge.ts'
import { requireCertifiedBagItemResponse } from './certifiedBagItemActionResolver.ts'
import { ShowdownBattleRunner } from './showdownBattleRunner.ts'
import { handleForceSwitch } from '../resolution.ts'
import { isRevivingForceSwitchRequest } from './requestHelper.ts'

function resolveEnemySwitchUid(store: BattleContext, p: Pokemon, e: Pokemon, isWild: boolean): string {
  if (isWild || !store.activeBattle.value) return '';
  const enemyTeam = store.activeBattle.value.enemyTeam;
  if (!shouldEnemySwitch(e, p, enemyTeam, store)) return '';

  const bestIdx = findBestSwitchIndex(enemyTeam || [], p, e.uid, store);
  if (!enemyTeam || bestIdx === -1) return '';
  return enemyTeam[bestIdx]?.uid || '';
}

async function resolveEnemyTurnChoice(
  store: BattleContext,
  p: Pokemon,
  e: Pokemon,
  isWild: boolean
): Promise<{ p2Choice: string; p2Skip: boolean }> {
  let p2Skip = false;
  let p2Choice = '';

  const targetUid = resolveEnemySwitchUid(store, p, e, isWild);
  if (targetUid) {
    const slot = ShowdownTeamResolver.getShowdownSlotForUid(store.activeBattle.value?.enemyRequest, targetUid);
    if (slot) {
      return { p2Choice: `switch ${slot}`, p2Skip: false };
    }
  }

  if (!isWild && await evaluateAndUseNPCItem(store, e)) {
    p2Skip = true;
    if (store.activeBattle.value) store.activeBattle.value.enemyUsedItem = true;
  }

  if (!p2Skip) {
    const enemyMove = (e.volatileCounters?.['lockedmove'] && e.volatileCounters['lockedmove'] > 0 && e.lastMove)
      ? e.lastMove
      : decideEnemyMove(e, p, store.playerStages.value, isWild, store);
    if (enemyMove) {
      p2Choice = `move ${enemyMove.id}`;
    }
  }

  return { p2Choice, p2Skip };
}

export async function runEnemyAction(store: BattleContext, bagAction?: CertifiedBattleGameAction) {
  const p = store.activeBattle.value?.player;
  const e = store.activeBattle.value?.enemy;
  if (!p || !e || e.hp <= 0) return;

  const replayDebug = typeof window !== 'undefined' ? window.__VITE_DEBUG__ : undefined;
  const isCertifiedReplay = replayDebug?.isScriptedReplayMode === true;
  const isWild = !store.activeBattle.value?.isTrainer && !store.activeBattle.value?.isGym;
  
  if (store.activeBattle.value) {
    store.activeBattle.value.playerUsedItem = true;
    store.activeBattle.value.enemyUsedItem = false;
  }

  const { p2Choice: initialP2Choice, p2Skip } = isCertifiedReplay
    ? { p2Choice: '', p2Skip: false }
    : await resolveEnemyTurnChoice(store, p, e, isWild);
  let p2Choice = initialP2Choice;

  if (showdownWorker) {
    interface ShowdownMoveRequest {
      id?: string;
      move?: string;
      disabled?: boolean;
    }
    interface ShowdownPlayerRequest {
      active?: { moves?: ShowdownMoveRequest[] }[];
    }

    const active = store.activeBattle.value;
    const enemyRequest = active?.enemyRequest as ShowdownPlayerRequest | undefined;
    const p1Choice = '';

    if (!p2Choice && p2Skip && enemyRequest?.active?.[0]?.moves) {
      const validMove = enemyRequest.active[0].moves.find((m: ShowdownMoveRequest) => !m.disabled);
      if (validMove) {
        p2Choice = `move ${validMove.id}`;
      }
    }

    if (isCertifiedReplay) {
      if (!bagAction) {
        throw new Error('[BattleTurn] A certified replay bag response requires the visible bag action context.');
      }
      if (!replayDebug) {
        throw new Error('[BattleTurn] Certified replay state disappeared before the bag response.');
      }
      p2Choice = requireCertifiedBagItemResponse(replayDebug, bagAction.itemId, bagAction.targetSlot);
    }
    
    console.debug(`[BattleTurn] [runEnemyAction] Sending choices: p1Choice: "${p1Choice}", p2Choice: "${p2Choice}", p1Skip: true, p2Skip: ${p2Skip}`);

    const result = await executeTurnInWorker(p1Choice, p2Choice, true, p2Skip, true);
    if (isCertifiedReplay) {
      if (!replayDebug) {
        throw new Error('[BattleTurn] Certified replay state disappeared before advancing the history cursor.');
      }
      ShowdownBattleRunner.advanceHistoryAfterAcceptedTurn(replayDebug);
    }
    if (active) {
      active.playerRequest = result.p1Request;
      active.enemyRequest = result.p2Request;
    }
    const filteredLogs = filterShowdownLogs(result.logs);
    await parseLogsWithSkip(store, filteredLogs, true, p2Skip);

    await syncTeamsFromLastWorkerState();

    await resolvePostTurnSwitchesAndFaints(store, result);
  }
}

interface SkipTracker {
  skipP1: boolean;
  skipP2: boolean;
}

function shouldSkipLogLine(type: string | undefined, target: string | undefined, p1Skip: boolean, p2Skip: boolean, tracker: SkipTracker): boolean {
  if (p1Skip) {
    if (type === 'move' && target?.startsWith('p1')) {
      tracker.skipP1 = true;
      return true;
    }
    if (tracker.skipP1) {
      if (type === '-damage' && target?.startsWith('p2')) return true;
      if (type === 'move' && !target?.startsWith('p1')) tracker.skipP1 = false;
    }
  }
  if (p2Skip) {
    if (type === 'move' && target?.startsWith('p2')) {
      tracker.skipP2 = true;
      return true;
    }
    if (tracker.skipP2) {
      if (type === '-damage' && target?.startsWith('p1')) return true;
      if (type === 'move' && !target?.startsWith('p2')) tracker.skipP2 = false;
    }
  }
  return false;
}

export async function parseLogsWithSkip(store: BattleContext, logs: string[], p1Skip: boolean, p2Skip: boolean) {
  const tracker: SkipTracker = { skipP1: false, skipP2: false };
  
  for (const logLine of logs) {
    const parts = logLine.split('|').map(x => x.trim());
    const type = parts[1];
    const target = parts[2];
    
    if (shouldSkipLogLine(type, target, p1Skip, p2Skip, tracker)) {
      continue;
    }
    
    await parseShowdownLogLine(store, logLine, logs);
  }
}

async function handlePostTurnFaints(store: BattleContext, playerFainted: boolean, enemyFainted: boolean): Promise<boolean> {
  const fsm = store.fsm;
  const { BATTLE_STATES, BATTLE_SUBSTATES } = store;

  if (playerFainted) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ);
    await store.handleFaint('player');
  } else if (enemyFainted) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ);
    await store.handleFaint('enemy');
  }
  return fsm.currentState.value === BATTLE_STATES.EXIT_BATTLE || Boolean(store.activeBattle.value?.over) || playerFainted;
}

export async function resolvePostTurnSwitchesAndFaints(
  store: BattleContext,
  result: { p1Request?: { forceSwitch?: unknown[] }; p2Request?: { forceSwitch?: unknown[] }; isOver?: boolean }
) {
  const playerFainted = !store.activeBattle.value?.player || store.activeBattle.value.player.hp <= 0;
  const enemyFainted = !store.activeBattle.value?.enemy || store.activeBattle.value.enemy.hp <= 0;

  const p1Force = !!result.p1Request?.forceSwitch?.some((x: unknown) => Boolean(x)) && !playerFainted && !isRevivingForceSwitchRequest(result.p1Request);
  const p2Force = !!result.p2Request?.forceSwitch?.some((x: unknown) => Boolean(x)) && !enemyFainted && !isRevivingForceSwitchRequest(result.p2Request);

  if (p1Force) {
    await handleForceSwitch(store, 'player');
    return true;
  }
  if (p2Force) {
    await handleForceSwitch(store, 'enemy');
    return true;
  }

  if (playerFainted || enemyFainted) {
    const isFinished = await handlePostTurnFaints(store, playerFainted, enemyFainted);
    if (isFinished) return true;
  }

  if (result.isOver && store.activeBattle.value) {
    store.activeBattle.value.over = true;
  }
  return false;
}
