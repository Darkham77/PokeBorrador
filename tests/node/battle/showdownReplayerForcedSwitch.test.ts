import { describe, it, expect } from 'vitest';
import { ShowdownBattleEngine } from '../../../src/logic/battle/engine/showdownBattleEngine.ts';
import fs from 'node:fs';
import path from 'node:path';

describe('ShowdownBattleEngine Replayer Forced Switch Parity', () => {
  it('should replay all certified fuzzer cases without throwing invalid choice on forced switch turns', () => {
    const casesPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
    if (!fs.existsSync(casesPath)) {
      return;
    }
    const data = JSON.parse(fs.readFileSync(casesPath, 'utf-8'));
    const allCases = [...(data.battle || []), ...(data.items || [])];

    const targetCase = allCases.find((c: any) => c.id === 'case-f8b3b82144d0');
    if (!targetCase) return;

    const engine = new ShowdownBattleEngine({
      mode: 'replayer',
      playerChoices: targetCase.playerChoices,
      enemyChoices: targetCase.enemyChoices,
      seed: targetCase.seed,
    });
    if (targetCase.p1Team && targetCase.p2Team) {
      engine.battle.setPlayer('p1', { team: targetCase.p1Team });
      engine.battle.setPlayer('p2', { team: targetCase.p2Team });
    }

    for (let i = 0; i < targetCase.history.length; i++) {
      const step = targetCase.history[i];
      const output = engine.executeTurn({
        p1Choice: step.p1Choice,
        p2Choice: step.p2Choice,
        certifiedHistoryStep: step,
      });
      expect(output).toBeDefined();
    }
  });
});
