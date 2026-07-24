// src/logic/battle/helpers/showdownExecutor.ts
import { mapVisualToOfficialWeather } from '../../weather/weatherGenerationProvider.ts';
import type { Battle } from '@pkmn/sim';
import type { BattleCheatManager } from './battleCheatManager.ts';
import { syncRequestConditionsWithSimulator } from '../cheats.ts';
import { requiresAction, classifyRequest } from './requestHelper.ts';
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

  const p1KindBefore = classifyRequest(battle.p1.activeRequest);
  const p2KindBefore = classifyRequest(battle.p2.activeRequest);

  const p1MustAct = p1KindBefore !== 'none' && p1KindBefore !== 'wait' && (p2KindBefore !== 'force-switch' || p1KindBefore === 'force-switch');
  const p2MustAct = p2KindBefore !== 'none' && p2KindBefore !== 'wait' && (p1KindBefore !== 'force-switch' || p2KindBefore === 'force-switch');

  const seats: Array<{ id: 'p1' | 'p2'; choice: string; skip?: boolean; mustAct: boolean }> = [
    { id: 'p1', choice: p1Choice, skip: p1Skip, mustAct: p1MustAct },
    { id: 'p2', choice: p2Choice, skip: p2Skip, mustAct: p2MustAct }
  ];

  for (const seat of seats) {
    if (battle.ended) break;
    if (!seat.mustAct) continue;

    let choiceToExecute = seat.choice;

    if (!choiceToExecute && !seat.skip) {
      if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.isScriptedReplayMode) {
        const debugObj = window.__VITE_DEBUG__;
        const runner = new ShowdownBattleRunner(debugObj?.playerChoices || [], debugObj?.enemyChoices || []);
        runner.p1ChoiceIdx = debugObj?.p1ChoiceIdx || 0;
        runner.p2ChoiceIdx = debugObj?.p2ChoiceIdx || 0;
        choiceToExecute = runner.resolveAndConsumeNextChoice(seat.id, battle[seat.id].activeRequest);
        if (debugObj) {
          debugObj.p1ChoiceIdx = runner.p1ChoiceIdx;
          debugObj.p2ChoiceIdx = runner.p2ChoiceIdx;
        }
      }
    }

    if (!choiceToExecute && !seat.skip) {
      throw new Error(`MISSING_CHOICE: ${seat.id} requiere acción (request: ${JSON.stringify(battle[seat.id].activeRequest)}) pero se recibió una elección vacía o undefined.`);
    }

    if (choiceToExecute) {
      const accepted = chooseOrThrow(seat.id, choiceToExecute);
      if (seat.id === 'p1') p1AcceptedChoice = accepted;
      else p2AcceptedChoice = accepted;
    }
  }

  // 6. Apply Post-Turn Cheats
  if (cheatManager) {
    cheatManager.applyPostTurnCheats(battle, turnBeforeP1, currentStep);
  }

  return { p1AcceptedChoice, p2AcceptedChoice };
}
