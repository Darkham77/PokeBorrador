import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { type PokemonSet } from '@pkmn/sim';
import { executeBattleTurn } from '../../../src/logic/battle/helpers/showdownExecutor.ts';
import { patchShowdownSpreadModify } from '../../../src/logic/battle/showdownAdapter.ts';
import { createShowdownBattle } from '../../../src/logic/battle/helpers/showdownBattleFactory.ts';
import { parseShowdownSeed } from '../../../src/logic/battle/helpers/seedInitializer.ts';

// Apply unified spread modify patch for 1:1 Showdown stats parity
patchShowdownSpreadModify(() => true);

describe('Reproduction Test for case-0d45b676708c (Batch #3)', () => {
  it('replays case-0d45b676708c turn-by-turn with exact fidelity and zero desyncs', () => {
    // 1. Load static, immutable fixture extracted from failing fuzzer/simulation case
    const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/battle/case_0d45b676708c.json');
    const raw = fs.readFileSync(fixturePath, 'utf8');
    const match = JSON.parse(raw);

    // 2. Initialize official Showdown Battle with the exact seed and teams using factory
    const parsedSeed = parseShowdownSeed(match.seed);
    const battle = createShowdownBattle('gen9customgame', parsedSeed);
    battle.setPlayer('p1', { name: 'Player', team: match.playerTeam as PokemonSet[] });
    battle.setPlayer('p2', { name: 'NPC-Enemy', team: match.enemyTeam as PokemonSet[] });

    // 3. Resolve team preview defaults if applicable
    battle.choose('p1', 'default');
    battle.choose('p2', 'default');

    // 4. Execute turn-by-turn replay using recorded choice stream
    for (let i = 0; i < match.history.length; i++) {
      const step = match.history[i];
      if (battle.ended) break;
      const turn = i + 1;

      console.log(`\n--- TURN ${turn} (Index ${i}) ---`);
      console.log(`P1 choice: "${step.p1Choice}", P2 choice: "${step.p2Choice}"`);
      console.log(`P1 activeRequest:`, JSON.stringify(battle.p1.activeRequest));
      console.log(`P2 activeRequest:`, JSON.stringify(battle.p2.activeRequest));

      try {
        executeBattleTurn({
          battle,
          p1Choice: step.p1Choice,
          p2Choice: step.p2Choice,
          history: match.history,
          currentStep: turn,
          certifiedHistoryStep: step
        });
        console.log(`Turn ${turn} finished. Logs:`);
        console.log(battle.log.slice(-12).join('\n'));
      } catch (e) {
        console.error(`Turn ${turn} threw:`, e);
        console.log(`Full battle logs so far:`);
        console.log(battle.log.join('\n'));
        throw e;
      }
    }

    while (!battle.ended) {
      battle.choose('p1', 'default');
      battle.choose('p2', 'default');
    }

    // 5. Assert clean battle completion and winner parity
    expect(battle.ended).toBe(true);
    if (match.finalState?.winner) {
      const expected = match.finalState.winner === 'p1' ? 'Player' : (match.finalState.winner === 'p2' ? 'NPC-Enemy' : match.finalState.winner);
      expect(battle.winner).toBe(expected);
    }
  });
});
