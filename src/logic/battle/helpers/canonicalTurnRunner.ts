import type { BattleContext } from '@/types/battle/battleContext';
import type { ShowdownPlayerRequest } from '@/types/battle/battle';
import { executeTurnInWorker, syncTeamsFromLastWorkerState } from '../showdownWorkerClient.ts';
import { filterShowdownLogs } from '../showdownBridge.ts';
import { parseLogsWithSkip, resolvePostTurnSwitchesAndFaints } from './turnActionResolver.ts';

export interface CanonicalTurnResult {
  logs: string[];
  isOver: boolean;
  winner: string | null;
  p1Request?: ShowdownPlayerRequest;
  p2Request?: ShowdownPlayerRequest;
}

/**
 * Single Source of Truth (SSoT) for executing a battle turn in the canonical Showdown worker.
 * Unifies turn execution across PvP, PvE, Gyms, and Trainer encounters.
 */
export async function executeCanonicalTurn(
  store: BattleContext,
  p1Choice: string,
  p2Choice: string,
  p1Skip = false,
  p2Skip = false,
  onTurnResult?: (result: CanonicalTurnResult) => void
): Promise<CanonicalTurnResult> {
  const fsm = store.fsm;
  const { BATTLE_STATES, BATTLE_SUBSTATES } = store;

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.BUILD_QUEUE);
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POP_ACTION);

  const result = await executeTurnInWorker(p1Choice, p2Choice, p1Skip, p2Skip);
  const turnCount = ((store.activeBattle.value?.turnCount) || 0) + 1;

  const active = store.activeBattle.value;
  if (active) {
    active.playerRequest = result.p1Request;
    active.enemyRequest = result.p2Request;
    active.turnCount = turnCount;
  }

  if (onTurnResult) {
    onTurnResult(result as CanonicalTurnResult);
  }

  if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.isScriptedReplayMode) {
    const { ShowdownBattleRunner } = await import('./showdownBattleRunner.ts');
    ShowdownBattleRunner.advanceHistoryAfterAcceptedTurn(window.__VITE_DEBUG__);
  }

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.APPLY_MOVE);

  const filteredLogs = filterShowdownLogs(result.logs);
  await parseLogsWithSkip(store, filteredLogs, false, p2Skip);

  await syncTeamsFromLastWorkerState();

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.EVAL_HP);

  await resolvePostTurnSwitchesAndFaints(store, result);

  if (store.activeBattle.value?.over) {
    if (store.activeBattle.value.fled) {
      await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAY_ESCAPE_ANIM);
      if (store.animations?.awaitTween) {
        await store.animations.awaitTween('escape-enemy');
      }
      await store.endBattle(false, true);
    }
  }

  if (store.persistBattle) {
    store.persistBattle();
  }

  return result as CanonicalTurnResult;
}
