import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Battle } from '@pkmn/sim';
import { executeBattleTurn } from '../../src/logic/battle/helpers/showdownExecutor.ts';

describe('Replay Parity Test', () => {
  it('replays first certified cases cleanly with zero desyncs', () => {
    const casesPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
    if (!fs.existsSync(casesPath)) return;
    const raw = fs.readFileSync(casesPath, 'utf8');
    const data = JSON.parse(raw);
    const matches = data.battle.slice(0, 3);

    for (const match of matches) {
      const battle = new Battle({ formatid: 'gen9customgame' as any, seed: match.seed });
      battle.setPlayer('p1', { name: 'Player', team: match.playerTeam });
      battle.setPlayer('p2', { name: 'NPC-Enemy', team: match.enemyTeam });

      battle.choose('p1', 'default');
      battle.choose('p2', 'default');

      for (let i = 0; i < match.history.length; i++) {
        const step = match.history[i];
        if (battle.ended) break;

        executeBattleTurn({
          battle,
          p1Choice: step.p1Choice,
          p2Choice: step.p2Choice,
          history: match.history,
          currentStep: i + 1,
          certifiedHistoryStep: step
        });
      }

      expect(battle.ended).toBe(true);
    }
  });
});
