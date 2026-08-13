import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Battle } from '@pkmn/sim';
import { executeBattleTurn } from '../../../src/logic/battle/helpers/showdownExecutor.ts';
import { patchShowdownSpreadModify } from '../../../src/logic/battle/showdownAdapter.ts';

// Apply unified spread modify patch for 1:1 Showdown stats parity
patchShowdownSpreadModify(() => true);

describe('Reproduction Test for <CASE_ID>', () => {
  it('replays <CASE_ID> turn-by-turn with exact fidelity and zero desyncs', () => {
    // 1. Load static, immutable fixture extracted from failing fuzzer/simulation case
    const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/battle/<CASE_FIXTURE>.json');
    const raw = fs.readFileSync(fixturePath, 'utf8');
    const match = JSON.parse(raw);

    // 2. Initialize official Showdown Battle with the exact seed and teams
    const battle = new Battle({ formatid: 'gen9customgame' as any, seed: match.seed });
    battle.setPlayer('p1', { name: 'Player', team: match.playerTeam });
    battle.setPlayer('p2', { name: 'NPC-Enemy', team: match.enemyTeam });

    // 3. Resolve team preview defaults if applicable
    battle.choose('p1', 'default');
    battle.choose('p2', 'default');

    // 4. Execute turn-by-turn replay using recorded choice stream
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

    // 5. Assert clean battle completion and winner parity
    expect(battle.ended).toBe(true);
    if (match.finalState?.winner) {
      const expected = match.finalState.winner === 'p1' ? 'Player' : (match.finalState.winner === 'p2' ? 'NPC-Enemy' : match.finalState.winner);
      expect(battle.winner).toBe(expected);
    }
  });
});
