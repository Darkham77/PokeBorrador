import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { Battle } from '@pkmn/sim';
import { executeBattleTurn } from '../../../src/logic/battle/helpers/showdownExecutor.ts';
import { patchShowdownSpreadModify } from '../../../src/logic/battle/showdownAdapter.ts';

patchShowdownSpreadModify(() => true);

describe('Reproduction Test for case-531effe1eb31', () => {
  it('replays case-531effe1eb31 turn-by-turn with exact fidelity', () => {
    const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/battle/case_531effe1eb31.json');
    const raw = fs.readFileSync(fixturePath, 'utf8');
    const match = JSON.parse(raw);

    const battle = new Battle({ formatid: 'gen9customgame' as any, seed: match.seed });
    battle.setPlayer('p1', { name: 'Player', team: match.playerTeam });
    battle.setPlayer('p2', { name: 'NPC-Enemy', team: match.enemyTeam });

    battle.choose('p1', 'default');
    battle.choose('p2', 'default');

    for (let i = 0; i < match.history.length; i++) {
      const step = match.history[i];
      if (battle.ended) break;
      const turn = i + 1;

      if (turn >= 22 && turn <= 26) {
        console.log(`\n[STEP ${turn}] p1ReqState=${battle.p1.requestState}, p2ReqState=${battle.p2.requestState}`);
        console.log(`[STEP ${turn}] P2 Mon 0: name=${battle.p2.pokemon[0]?.name}, hp=${battle.p2.pokemon[0]?.hp}/${battle.p2.pokemon[0]?.maxhp}, fainted=${battle.p2.pokemon[0]?.fainted}`);
        console.log(`[STEP ${turn}] step:`, JSON.stringify(step));
      }

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
