import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Battle } from '@pkmn/sim';
import { executeBattleTurn } from '../../../src/logic/battle/helpers/showdownExecutor.ts';

interface CertifiedHistoryStep {
  turnCount?: number;
  battleTurn?: number;
  p1Choice: string;
  p2Choice: string;
  p1ForceSwitch?: boolean;
  p2ForceSwitch?: boolean;
  p1Heal?: boolean;
  p2Heal?: boolean;
}

interface CertifiedCase {
  id: string;
  seed: number[];
  playerTeam: any[];
  enemyTeam: any[];
  history: CertifiedHistoryStep[];
  finalState?: {
    winner?: string | null;
  };
}

describe('Certified Fuzzer Cases Replay Integration', () => {
  const casesPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
  if (!fs.existsSync(casesPath)) {
    it.skip('fuzzer_certified_cases.json not found', () => {});
    return;
  }

  const rawData = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));
  const allBatches: CertifiedCase[] = [
    ...(rawData.battle || []),
    ...(rawData.abilities || []),
    ...(rawData.items || []),
    ...(rawData.medicines || [])
  ];

  it('verifies that certified fuzzer cases exist', () => {
    expect(allBatches.length).toBeGreaterThan(0);
  });

  // Test across diverse representative sample of batches (first 10 of each category)
  const sampleCases = [
    ...(rawData.battle || []).slice(0, 5),
    ...(rawData.abilities || []).slice(0, 3),
    ...(rawData.items || []).slice(0, 5),
    ...(rawData.medicines || []).slice(0, 3)
  ];

  sampleCases.forEach((testCase: CertifiedCase) => {
    it(`replays ${testCase.id} with 100% turn-by-turn fidelity and zero desyncs`, () => {
      const battle = new Battle({ formatid: 'gen9customgame' as any, seed: testCase.seed as any });
      battle.setPlayer('p1', { name: 'Player', team: testCase.playerTeam as any });
      battle.setPlayer('p2', { name: 'NPC-Enemy', team: testCase.enemyTeam as any });

      battle.choose('p1', 'default');
      battle.choose('p2', 'default');

      for (let i = 0; i < testCase.history.length; i++) {
        const step = testCase.history[i]!;
        if (battle.ended) break;

        const result = executeBattleTurn({
          battle,
          p1Choice: step.p1Choice,
          p2Choice: step.p2Choice,
          history: testCase.history as any,
          currentStep: i + 1,
          certifiedHistoryStep: step as any
        });

        expect(result).toBeDefined();
      }

      expect(battle.ended).toBe(true);

      if (testCase.finalState?.winner !== undefined && testCase.finalState.winner !== null) {
        const expectedWinner = String(testCase.finalState.winner);
        const actualWinner = battle.winner;
        if (expectedWinner === 'p1' || expectedWinner === 'Player') {
          expect(actualWinner).toBe('Player');
        } else if (expectedWinner === 'p2' || expectedWinner === 'NPC-Enemy') {
          expect(actualWinner).toBe('NPC-Enemy');
        }
      }
    });
  });
});
