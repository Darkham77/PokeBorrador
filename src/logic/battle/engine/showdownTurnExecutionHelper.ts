// src/logic/battle/engine/showdownTurnExecutionHelper.ts
import type { Battle, SideID } from '@pkmn/sim';
import type { TurnExecutionInput, BattleSeat, BattleCheatRecord } from './showdownSeatSyncHelper.ts';
import type { BattleCheatManager } from '../helpers/battleCheatManager.ts';
import { syncSidePokemon } from '../helpers/showdownSyncHelper.ts';
import { requiresAction, type ChoiceRequest } from '../helpers/requestHelper.ts';
import type { TurnExecutionOutput } from './showdownBattleEngine.ts';

export function syncPreTurnState(
  battle: Battle,
  input: TurnExecutionInput,
  isReplayMode: boolean,
  cheatManager: BattleCheatManager
): void {
  if (input.weather && input.weather !== 'none') {
    battle.field.setWeather(input.weather, 'debug' as const);
  }
  const isItemTurn = Boolean(input.p1UsedBattleItem || (typeof input.certifiedHistoryStep === 'object' && input.certifiedHistoryStep !== null && Reflect.get(input.certifiedHistoryStep, 'p1UsedBattleItem')));
  if (!isReplayMode || isItemTurn) {
    if (input.p1Hps && typeof input.p1Hps === 'object') {
      syncSidePokemon(battle.p1, input.p1Hps, input.p1Statuses);
    }
    if (input.p2Hps && typeof input.p2Hps === 'object') {
      syncSidePokemon(battle.p2, input.p2Hps, input.p2Statuses);
    }
  }
  if (isReplayMode) {
    cheatManager.applyPreTurnCheats(battle, true, input.certifiedHistoryStep);
  }
}

function applySingleSeatTurnChoice(
  battle: Battle,
  seat: BattleSeat,
  acceptedChoices: Map<string, string>
): void {
  if (seat.mustAct && seat.skip) {
    if (seat.side.isChoiceDone()) {
      seat.side.clearChoice();
    }
    battle.choose(seat.id as SideID, 'default');
    acceptedChoices.set(seat.id, 'default');
    return;
  }

  if (!seat.mustAct || seat.skip || !seat.choice || seat.choice === 'pass') return;
  if (!requiresAction(seat.side.activeRequest) || !seat.side.requestState) return;

  if (seat.side.isChoiceDone() || (seat.side.choice && Array.isArray(seat.side.choice.actions) && seat.side.choice.actions.length > 0)) {
    seat.side.clearChoice();
  }

  let ok: boolean;
  let chooseError: Error | null = null;
  try {
    ok = battle.choose(seat.id as SideID, seat.choice);
  } catch (err) {
    ok = false;
    chooseError = err instanceof Error ? err : new Error(String(err));
  }

  if (ok) {
    acceptedChoices.set(seat.id, seat.choice);
  } else {
    const reqStr = JSON.stringify(seat.side.activeRequest);
    const sideErr = seat.side.choice?.error;
    throw new Error(`[ShowdownBattleEngine] Elección "${seat.choice}" rechazada para ${seat.id}. Turn: ${battle.turn}. Req: ${reqStr}. Cause: ${chooseError ? chooseError.message : (sideErr || 'Invalid choice')}`);
  }
}

export function executeEnemyOnlyResponse(
  battle: Battle,
  input: TurnExecutionInput,
  appliedCheats: BattleCheatRecord[],
  resolveNextChoice: (seatId: string, req: ChoiceRequest | null | undefined, explicitChoice?: string, agent?: unknown) => string
): TurnExecutionOutput {
  const startLogIdx = Array.isArray(battle.log) ? battle.log.length : 0;
  if (input.p2Skip) {
    throw new Error('[ShowdownBattleEngine] A bag-medicine response cannot skip both sides without a certified game-action transition.');
  }
  const enemyChoice = resolveNextChoice('p2', battle.p2.activeRequest, input.p2Choice, input.p2Agent);
  if (!enemyChoice || enemyChoice === 'pass') {
    throw new Error('[ShowdownBattleEngine] A bag-medicine response requires an explicit enemy choice.');
  }
  if (!requiresAction(battle.p2.activeRequest)) {
    throw new Error('[ShowdownBattleEngine] The enemy has no actionable request for the bag-medicine response.');
  }
  if (!battle.p2.choose(enemyChoice)) {
    throw new Error(`[ShowdownBattleEngine] Enemy choice "${enemyChoice}" was rejected during a bag-medicine response.`);
  }

  const selectedAction = battle.p2.choice.actions[0];
  if (!selectedAction) {
    throw new Error('[ShowdownBattleEngine] The accepted enemy choice produced no executable action.');
  }
  battle.clearRequest();
  battle.p2.clearChoice();
  battle.queue.addChoice(selectedAction);
  const queuedAction = battle.queue.shift();
  if (!queuedAction) {
    throw new Error('[ShowdownBattleEngine] The accepted enemy choice was not queued for execution.');
  }
  battle.runAction(queuedAction);

  if (!battle.ended && !battle.requestState) {
    battle.queue.addChoice({ choice: 'residual' });
    const residualAction = battle.queue.shift();
    if (!residualAction) {
      throw new Error('[ShowdownBattleEngine] The bag-medicine response did not queue residual resolution.');
    }
    battle.runAction(residualAction);
    if (!battle.ended && !battle.requestState) {
      battle.endTurn();
      battle.midTurn = false;
      battle.queue.clear();
      battle.makeRequest('move');
    }
  }

  const turnLogs = Array.isArray(battle.log) ? battle.log.slice(startLogIdx) : [];
  return {
    p1AcceptedChoice: '',
    p2AcceptedChoice: enemyChoice,
    turnLogs,
    battleTurn: battle.turn,
    appliedCheats,
  };
}

export function runTurnSeatChoices(
  battle: Battle,
  seats: BattleSeat[],
  acceptedChoices: Map<string, string>
): void {
  const startTurn = battle.turn;
  const startReqState = battle.requestState;

  for (const seat of seats) {
    if (battle.ended) break;
    if (battle.turn !== startTurn || battle.requestState !== startReqState) break;
    applySingleSeatTurnChoice(battle, seat, acceptedChoices);
    if (battle.ended) break;
  }

  if (!battle.ended && battle.allChoicesDone()) {
    battle.commitChoices();
  }
}
