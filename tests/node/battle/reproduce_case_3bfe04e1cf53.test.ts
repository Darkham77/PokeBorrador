import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { CertifiedBattleCase } from '../../../scripts/e2e/fuzzer/generators/fuzzer_team_generator.ts';
import { statsMap, patchShowdownSpreadModify } from '../../../src/logic/battle/showdownAdapter.ts';
import { createShowdownBattle } from '../../../src/logic/battle/helpers/showdownBattleFactory.ts';
import { ShowdownTeamMapper, type CustomPokemonSet } from '../../../src/logic/battle/helpers/showdownTeamMapper.ts';
import { ShowdownLogEnricher } from '../../../src/logic/battle/helpers/showdownLogEnricher.ts';
import { ShowdownBattleRunner } from '../../../src/logic/battle/helpers/showdownBattleRunner.ts';
import { executeBattleTurn } from '../../../src/logic/battle/helpers/showdownExecutor.ts';
import { ACTIVE_SHOWDOWN_FORMAT } from '../../../src/data/system/constants.ts';
import { resetDeterministicMathRandom } from '../../../src/logic/battle/helpers/seedInitializer.ts';

patchShowdownSpreadModify(() => true);

describe('Reproduce Fuzzer Case 3bfe04e1cf53', () => {
  it('correctly executes all 68 turns deterministically in Showdown', () => {
    const fixturePath = path.resolve(process.cwd(), 'tests/fixtures/battle/case_3bfe04e1cf53.json');
    assert.ok(fs.existsSync(fixturePath), 'Fixture must exist');

    const match: CertifiedBattleCase = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    assert.strictEqual(match.id, 'case-3bfe04e1cf53');
    assert.strictEqual(match.history.length, 68);

    statsMap.clear();
    ShowdownTeamMapper.populateStatsMap(match.playerTeam as CustomPokemonSet[]);
    ShowdownTeamMapper.populateStatsMap(match.enemyTeam as CustomPokemonSet[]);

    resetDeterministicMathRandom();
    const battle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, match.seed);
    ShowdownLogEnricher.setupRealtimeEnrichment(battle);

    battle.setPlayer('p1', { name: 'Player', team: match.playerTeam });
    battle.setPlayer('p2', { name: 'NPC-Enemy', team: match.enemyTeam });

    match.playerTeam.forEach((p, idx: number) => {
      const simMon = battle.p1.pokemon[idx];
      if (simMon && Reflect.get(p, 'uid')) Reflect.set(simMon, 'uid', Reflect.get(p, 'uid'));
    });
    match.enemyTeam.forEach((e, idx: number) => {
      const simMon = battle.p2.pokemon[idx];
      if (simMon && Reflect.get(e, 'uid')) Reflect.set(simMon, 'uid', Reflect.get(e, 'uid'));
    });

    ShowdownLogEnricher.enrichRetroactiveLeads(battle);

    let turnsExecuted = 0;
    for (let historyIndex = 0; historyIndex < match.history.length; historyIndex++) {
      const step = ShowdownBattleRunner.requireHistoryEntry(match.history, historyIndex);
      if (battle.ended) break;
      turnsExecuted++;

      const res = executeBattleTurn({
        battle,
        p1Choice: step.p1Choice,
        p2Choice: step.p2Choice,
        history: match.history,
        currentStep: turnsExecuted,
        certifiedHistoryStep: step,
      });

      
      if (turnsExecuted >= 42 && turnsExecuted <= 45) {
        console.log(`=== TURN ${turnsExecuted} (step: P1=${step.p1Choice} P2=${step.p2Choice}) ===`, battle.log.slice(-12));
      }
      assert.ok(res,
 `Turn ${turnsExecuted} execution result must be defined`);
    }

    assert.strictEqual(turnsExecuted, 68, 'All 68 turns must execute deterministically');
    assert.strictEqual(battle.ended, true, 'Battle must reach terminal state');
  });
});
