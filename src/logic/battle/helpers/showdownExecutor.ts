import type { Battle } from '@pkmn/sim';
import type { BattleCheatManager } from './battleCheatManager.ts';
import { ShowdownBattleEngine } from '../engine/showdownBattleEngine.ts';
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
  cheatsArray?: Array<{ turn: number; side: 'p1' | 'p2'; type: 'heal' }> | null;
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
    cheats: options.cheatsArray ? options.cheatsArray : undefined
  });
  (engine as unknown as { battle: Battle }).battle = options.battle;

  const result = engine.executeTurn({
    p1Choice: options.p1Choice,
    p2Choice: options.p2Choice,
    p1Skip: options.p1Skip,
    p2Skip: options.p2Skip
  });

  return {
    p1AcceptedChoice: result.p1AcceptedChoice,
    p2AcceptedChoice: result.p2AcceptedChoice
  };
}
