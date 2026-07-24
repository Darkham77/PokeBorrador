// src/logic/battle/helpers/showdownExecutor.ts
import { mapVisualToOfficialWeather } from '../../weather/weatherGenerationProvider.ts';
import type { Battle } from '@pkmn/sim';
import type { BattleCheatManager } from './battleCheatManager.ts';
import { syncRequestConditionsWithSimulator } from '../cheats.ts';
import { classifyRequest } from './requestHelper.ts';
import { syncSidePokemon } from './showdownSyncHelper.ts';
import { ShowdownBattleRunner } from './showdownBattleRunner.ts';

export interface ShowdownExecutorOptions {
  battle: Battle;
  p1Choice: string;
  p2Choice: string;
  p1Skip?: boolean;
  p2Skip?: boolean;
  p1Hps?: Record<string, number>;
  p2Hps?: Record<string, number>;
  p1Statuses?: Record<string, string>;
  p2Statuses?: Record<string, string>;
  weather?: string;
  cheatManager: BattleCheatManager | null;
  isFuzzerSimulation?: boolean;
  currentStep?: number;
}

export interface ExecuteBattleTurnResult {
  p1AcceptedChoice: string;
  p2AcceptedChoice: string;
}

/**
 * Common executor to process a single battle turn/decision phase uniformly.
 * Handles weather sync, HP/status sync from client, pre-turn cheats,
 * choice registration, flinching skips, and post-turn cheats.
 */
export function executeBattleTurn(options: ShowdownExecutorOptions): ExecuteBattleTurnResult {
  const {
    battle,
    p1Choice,
    p2Choice,
    p1Skip,
    p2Skip,
    p1Hps,
    p2Hps,
    p1Statuses,
    p2Statuses,
    weather,
    cheatManager,
    isFuzzerSimulation,
    currentStep
  } = options;

  // 1. Synchronize Weather
  if (weather) {
    const mappedWeather = mapVisualToOfficialWeather(weather, battle.gen || 5);
    const targetWeather = (mappedWeather === 'none' || mappedWeather === 'clear') ? '' : mappedWeather;
    if (battle.field.weather !== targetWeather) {
      if (!targetWeather) {
        battle.field.clearWeather();
      } else {
        battle.field.setWeather(targetWeather as import('@pkmn/sim').ID, 'debug' as const);
      }
    }
  }

  // 2. Synchronize HP and Statuses from Client/Vue store (if provided)
  if (!isFuzzerSimulation) {
    if (p1Hps && typeof p1Hps === 'object') {
      syncSidePokemon(battle.p1, p1Hps, p1Statuses);
      syncRequestConditionsWithSimulator(battle.p1 as unknown as import('../showdown.worker.ts').ExtendedSide);
    }

    if (p2Hps && typeof p2Hps === 'object') {
      syncSidePokemon(battle.p2, p2Hps, p2Statuses);
      syncRequestConditionsWithSimulator(battle.p2 as unknown as import('../showdown.worker.ts').ExtendedSide);
    }
  }

  // 3. Apply Pre-Turn Cheats
  if (cheatManager) {
    cheatManager.applyPreTurnCheats(battle, isFuzzerSimulation, currentStep);
  }

  // 4. Handle turn skip flinch bypass
  if (!isFuzzerSimulation) {
    if (p1Skip && battle.p1.active?.[0]) {
      const activeMon = battle.p1.active[0] as unknown as { addVolatile: (status: string) => void };
      if (typeof activeMon?.addVolatile === 'function') {
        activeMon.addVolatile('flinch');
      }
    }
    if (p2Skip && battle.p2.active?.[0]) {
      const activeMon = battle.p2.active[0] as unknown as { addVolatile: (status: string) => void };
      if (typeof activeMon?.addVolatile === 'function') {
        activeMon.addVolatile('flinch');
      }
    }
  }

  // 5. Register and Execute Choices
  const resolveChoice = (side: import('@pkmn/sim').Side, choice: string, isSkip: boolean): string => {
    const cleanChoice = choice.trim().toLowerCase();
    if ((cleanChoice === 'struggle' || cleanChoice === 'move struggle') && !isSkip && side?.active?.[0]) {
      const activeMon = side.active[0];
      if (activeMon?.moveSlots) {
        activeMon.moveSlots.forEach((m: { id: string; pp: number } | null) => { if (m) m.pp = 0; });
      }
      return 'default';
    }
    return choice;
  };

  const chooseOrThrow = (player: 'p1' | 'p2', choice: string): string => {
    const side = battle[player];
    const resolved = resolveChoice(side, choice, player === 'p1' ? !!p1Skip : !!p2Skip);
    console.debug(`[E2E-CHOOSE-DEBUG] Player ${player} choosing "${resolved}" (raw: "${choice}"). Active request: ${JSON.stringify(side.activeRequest)}`);
    const ok = battle.choose(player, resolved);
    if (!ok) {
      const activeName = side.active?.[0]?.name || 'none';
      const activeMoves = side.active?.[0]?.moves || [];
      const requestStr = JSON.stringify(side.activeRequest || {});
      throw new Error(`INVALID_CHOICE: Elección "${choice}" (resuelta a "${resolved}") rechazada por el simulador para ${player}. ActiveMon: ${activeName}, Simulator Moves: ${JSON.stringify(activeMoves)}, Request: ${requestStr}`);
    }
    return resolved;
  };

  const turnBeforeP1 = battle.turn;
  let p1AcceptedChoice = '';
  let p2AcceptedChoice = '';

  const choiceMap: Record<string, { choice: string; skip?: boolean }> = {
    p1: { choice: p1Choice, skip: p1Skip },
    p2: { choice: p2Choice, skip: p2Skip }
  };

  const seats = battle.sides.map(side => {
    const seatId = side.id as 'p1' | 'p2' | 'p3' | 'p4';
    const kindBefore = classifyRequest(side.activeRequest);
    const hasOtherForceSwitch = battle.sides.some(s => s.id !== seatId && classifyRequest(s.activeRequest) === 'force-switch');
    const mustAct = kindBefore !== 'none' && kindBefore !== 'wait' && (!hasOtherForceSwitch || kindBefore === 'force-switch');
    const choiceData = choiceMap[seatId] || { choice: '', skip: false };
    return { id: seatId, side, choice: choiceData.choice, skip: choiceData.skip, mustAct };
  });

  for (const seat of seats) {
    if (battle.ended) break;
    if (!seat.mustAct) continue;

    let choiceToExecute = seat.choice;

    if (!choiceToExecute && !seat.skip) {
      if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.isScriptedReplayMode) {
        const debugObj = window.__VITE_DEBUG__;
        const runner = new ShowdownBattleRunner((debugObj?.playerChoices as string[]) || [], (debugObj?.enemyChoices as string[]) || []);
        runner.p1ChoiceIdx = debugObj?.p1ChoiceIdx || 0;
        runner.p2ChoiceIdx = debugObj?.p2ChoiceIdx || 0;
        choiceToExecute = runner.resolveAndConsumeNextChoice(seat.id, seat.side.activeRequest);
        if (debugObj) {
          debugObj.p1ChoiceIdx = runner.p1ChoiceIdx;
          debugObj.p2ChoiceIdx = runner.p2ChoiceIdx;
        }
      }
    }

    if (!choiceToExecute && !seat.skip) {
      if (seat.side.activeRequest?.teamPreview) {
        choiceToExecute = 'default';
      } else {
        throw new Error(`MISSING_CHOICE: ${seat.id} requiere acción (request: ${JSON.stringify(seat.side.activeRequest)}) pero se recibió una elección vacía o undefined.`);
      }
    }

    if (choiceToExecute) {
      const accepted = chooseOrThrow(seat.id as 'p1' | 'p2', choiceToExecute);
      if (seat.id === 'p1') p1AcceptedChoice = accepted;
      else if (seat.id === 'p2') p2AcceptedChoice = accepted;
    }
  }

  // 6. Apply Post-Turn Cheats
  // EXEC-12 Fix: If post-turn cheats modify HP/status of fainted/active Pokemon,
  // clear active requests so Showdown doesn't keep a stale force-switch request.
  if (cheatManager) {
    cheatManager.applyPostTurnCheats(battle, turnBeforeP1, currentStep);
    // Refresh active requests if hp was restored from 0
    if (battle.p1 && battle.p1.activeRequest?.forceSwitch && battle.p1.active[0] && !battle.p1.active[0].fainted) {
      delete (battle.p1.activeRequest as unknown as Record<string, unknown>).forceSwitch;
    }
    if (battle.p2 && battle.p2.activeRequest?.forceSwitch && battle.p2.active[0] && !battle.p2.active[0].fainted) {
      delete (battle.p2.activeRequest as unknown as Record<string, unknown>).forceSwitch;
    }
  }

  return { p1AcceptedChoice, p2AcceptedChoice };
}
