import type { BattleContext } from '@/types/battle/battleContext'
import type { CertifiedBattleGameAction } from '@/types/battle/certifiedBattleActions'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { decideEnemyMove, shouldEnemySwitch, findBestSwitchIndex, evaluateAndUseNPCItem } from '../ai/battleAI.ts'
import { ShowdownTeamResolver } from '../showdownTeamResolver.ts'
import { getShowdownWorker, executeTurnInWorker, syncTeamsFromLastWorkerState } from '../showdownWorkerClient.ts'
import { filterShowdownLogs } from '../showdownBridge.ts'
import { requireCertifiedBagItemResponse } from './certifiedBagItemActionResolver.ts'
import { ShowdownBattleRunner } from './showdownBattleRunner.ts'
import { handleForceSwitch } from '../resolution.ts'
import { isRevivingForceSwitchRequest } from './requestHelper.ts'
import { parseLogsWithSkip } from '../battleTurnLogHelper.ts'

function resolveEnemySwitchUid(store: BattleContext, p: Pokemon, e: Pokemon, isWild: boolean): string {
  if (isWild || !store.activeBattle.value) return '';
  const enemyTeam = store.activeBattle.value.enemyTeam;
  if (!shouldEnemySwitch(e, p, enemyTeam, store)) return '';

  const bestIdx = findBestSwitchIndex(enemyTeam || [], p, e.uid, store, 'counter');
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

interface ShowdownMoveRequest {
  id?: string;
  move?: string;
  disabled?: boolean;
}

interface ShowdownPlayerRequest {
  active?: { moves?: ShowdownMoveRequest[] }[];
}

function resolveFallbackEnemyMoveChoice(enemyRequest?: ShowdownPlayerRequest): string {
  if (!enemyRequest?.active?.[0]?.moves) return '';
  const validMove = enemyRequest.active[0].moves.find((m: ShowdownMoveRequest) => !m.disabled);
  return validMove?.id ? `move ${validMove.id}` : '';
}

function resolveCertifiedReplayBagResponse(
  replayDebug: NonNullable<typeof window.__VITE_DEBUG__> | undefined,
  bagAction?: CertifiedBattleGameAction
): string {
  if (!bagAction) {
    throw new Error('[BattleTurn] A certified replay bag response requires the visible bag action context.');
  }
  if (!replayDebug) {
    throw new Error('[BattleTurn] Certified replay state disappeared before the bag response.');
  }
  return requireCertifiedBagItemResponse(replayDebug, bagAction.itemId, bagAction.targetSlot);
}

interface WorkerEnemyActionOptions {
  p2Skip: boolean;
  isCertifiedReplay: boolean;
  bagAction?: CertifiedBattleGameAction;
}

async function executeWorkerEnemyAction(
  store: BattleContext,
  initialP2Choice: string,
  replayDebug: NonNullable<typeof window.__VITE_DEBUG__> | undefined,
  options: WorkerEnemyActionOptions
): Promise<void> {
  const { p2Skip, isCertifiedReplay, bagAction } = options;
  const active = store.activeBattle.value;
  const enemyRequest = active?.enemyRequest as ShowdownPlayerRequest | undefined;
  let p2Choice = initialP2Choice;

  if (!p2Choice && p2Skip) {
    p2Choice = resolveFallbackEnemyMoveChoice(enemyRequest);
  }

  if (isCertifiedReplay) {
    p2Choice = resolveCertifiedReplayBagResponse(replayDebug, bagAction);
  }

  console.debug(`[BattleTurn] [runEnemyAction] Sending choices: p1Choice: "", p2Choice: "${p2Choice}", p1Skip: true, p2Skip: ${p2Skip}`);

  const result = await executeTurnInWorker('', p2Choice, { p1Skip: true, p2Skip, p1UsedBattleItem: true });
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
  await parseLogsWithSkip(store, filteredLogs, { p1Skip: true, p2Skip });

  await syncTeamsFromLastWorkerState();

  await resolvePostTurnSwitchesAndFaints(store, result);
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

  const { p2Choice, p2Skip } = isCertifiedReplay
    ? { p2Choice: '', p2Skip: false }
    : await resolveEnemyTurnChoice(store, p, e, isWild);

  if (getShowdownWorker()) {
    await executeWorkerEnemyAction(store, p2Choice, replayDebug, { p2Skip, isCertifiedReplay, bagAction });
  }
}

interface PostTurnFaintsOptions {
  playerFainted: boolean;
  enemyFainted: boolean;
}

async function handlePostTurnFaints(store: BattleContext, options: PostTurnFaintsOptions): Promise<boolean> {
  const { playerFainted, enemyFainted } = options;
  const fsm = store.fsm;
  const { BATTLE_STATES, BATTLE_SUBSTATES } = store;

  if (playerFainted) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.PLAYER_FAINT_SEQ);
    await store.handleFaint('player');
  }
  if (enemyFainted) {
    await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.ENEMY_REPLACEMENT_SEQ);
    await store.handleFaint('enemy');
  }
  return fsm.currentState.value === BATTLE_STATES.EXIT_BATTLE || Boolean(store.activeBattle.value?.over) || playerFainted;
}

export async function resolvePostTurnSwitchesAndFaints(
  store: BattleContext,
  result: { p1Request?: { forceSwitch?: unknown[] }; p2Request?: { forceSwitch?: unknown[] }; isOver?: boolean }
) {
  if (result.isOver && store.activeBattle.value) {
    store.activeBattle.value.over = true;
  }

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
    const isFinished = await handlePostTurnFaints(store, { playerFainted, enemyFainted });
    if (isFinished) return true;
  }

  return false;
}
