import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Battle } from '@pkmn/sim';
import { executeBattleTurn } from '../../../src/logic/battle/helpers/showdownExecutor.ts';
import { patchShowdownSpreadModify } from '../../../src/logic/battle/showdownAdapter.ts';

patchShowdownSpreadModify(() => true);

describe('Reproduction Test for lote-items-38', () => {
  it('replays lote-items-38 turn-by-turn with exact fidelity', () => {
    const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/battle/case_lote_items_38.json');
    expect(fs.existsSync(fixturePath)).toBe(true);

    const match = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    const battle = new Battle({ formatid: 'gen9customgame' as any, seed: match.seed });
    battle.setPlayer('p1', { name: 'Player', team: match.playerTeam });
    battle.setPlayer('p2', { name: 'NPC-Enemy', team: match.enemyTeam });

    battle.choose('p1', 'default');
    battle.choose('p2', 'default');

    for (let i = 0; i < match.history.length; i++) {
      const step = match.history[i];
      if (battle.ended) break;
      const turn = i + 1;

      executeBattleTurn({
        battle,
        p1Choice: step.p1Choice,
        p2Choice: step.p2Choice,
        history: match.history,
        currentStep: turn,
        certifiedHistoryStep: step
      });
    }

    expect(battle.ended).toBe(true);
  });
});
