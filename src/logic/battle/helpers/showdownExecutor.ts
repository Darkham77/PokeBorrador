import type { Battle } from '@pkmn/sim';
import { ShowdownBattleEngine } from '../engine/showdownBattleEngine.ts';
import { ShowdownBattleRunner } from './showdownBattleRunner.ts';
import type { FuzzerCheat } from './battleCheatManager.ts';

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
  history?: FuzzerCheat[];
  runner?: ShowdownBattleRunner | null;
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
  const engine = new ShowdownBattleEngine({
    mode: options.isFuzzerSimulation ? 'fuzzer' : 'replayer',
    playerChoices: options.runner?.choicesBySeat.get('p1'),
    enemyChoices: options.runner?.choicesBySeat.get('p2'),
    cheats: options.history
  });
  if (options.runner) {
    // Sync all seat indices from runner into the transient engine
    for (const [sid, idx] of Array.from(options.runner.choicesBySeat.keys(), id => [id, options.runner!.indicesBySeat.get(id) ?? 0] as const)) {
      engine.choiceIdx.set(sid, idx);
    }
  }
  Reflect.set(engine, 'battle', options.battle);

  const result = engine.executeTurn({
    p1Choice: options.p1Choice,
    p2Choice: options.p2Choice,
    p1Skip: options.p1Skip,
    p2Skip: options.p2Skip,
    p1Hps: options.p1Hps,
    p2Hps: options.p2Hps,
    p1Statuses: options.p1Statuses,
    p2Statuses: options.p2Statuses,
    weather: options.weather,
    ipbActive: options.isFuzzerSimulation ? true : undefined,
    certifiedHistoryStep: options.currentStep,
  });

  if (options.runner) {
    // Sync back all updated seat indices from the engine to the runner
    for (const [sid, idx] of engine.choiceIdx.entries()) {
      options.runner.indicesBySeat.set(sid, idx);
    }
  }

  return {
    p1AcceptedChoice: result.p1AcceptedChoice,
    p2AcceptedChoice: result.p2AcceptedChoice
  };
}
