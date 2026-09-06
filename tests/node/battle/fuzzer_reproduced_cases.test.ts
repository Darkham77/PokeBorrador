import { describe, it, expect } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Battle, type ID } from '@pkmn/sim';
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

function replayViaShowdownBattleRunner(caseId: string, expectedTurns: number) {
  const fixturePath = path.resolve(process.cwd(), `tests/fixtures/battle/case_${caseId}.json`);
  assert.ok(fs.existsSync(fixturePath), `Fixture ${caseId} must exist`);

  const match: CertifiedBattleCase = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  assert.strictEqual(match.id, `case-${caseId}`);
  assert.strictEqual(match.history.length, expectedTurns);

  statsMap.clear();
  ShowdownTeamMapper.populateStatsMap(match.playerTeam as unknown as CustomPokemonSet[]);
  ShowdownTeamMapper.populateStatsMap(match.enemyTeam as unknown as CustomPokemonSet[]);

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
    assert.ok(res, `Turn ${turnsExecuted} execution result must be defined`);
  }

  assert.strictEqual(turnsExecuted, expectedTurns, `All ${expectedTurns} turns must execute deterministically`);
  assert.strictEqual(battle.ended, true, 'Battle must reach terminal state');
}

function replayViaDirectBattle(fixtureName: string) {
  const fixturePath = path.resolve(process.cwd(), `tests/fixtures/battle/${fixtureName}.json`);
  const raw = fs.readFileSync(fixturePath, 'utf8');
  const match = JSON.parse(raw);

  const battle = new Battle({ formatid: 'gen9customgame' as ID, seed: match.seed });
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
}

describe('Fuzzer Certified Reproduced Cases Suite', () => {
  describe('Direct Battle Replays', () => {
    it('replays case-068de4c4f38f turn-by-turn with exact fidelity', () => {
      replayViaDirectBattle('case_068de4c4f38f');
    });

    it('replays case-531effe1eb31 turn-by-turn with exact fidelity', () => {
      replayViaDirectBattle('case_531effe1eb31');
    });
  });

  describe('ShowdownBattleRunner Certified Replays', () => {
    it('replays case-0c9c49792e14 (22 turns)', () => {
      replayViaShowdownBattleRunner('0c9c49792e14', 22);
    });

    it('replays case-156836a086d4 (22 turns)', () => {
      replayViaShowdownBattleRunner('156836a086d4', 22);
    });

    it('replays case-2aa5ab635183 (104 turns)', () => {
      replayViaShowdownBattleRunner('2aa5ab635183', 104);
    });

    it('replays case-2b4f1e440640 (108 turns)', () => {
      replayViaShowdownBattleRunner('2b4f1e440640', 108);
    });

    it('replays case-363190e9e238 (94 turns)', () => {
      replayViaShowdownBattleRunner('363190e9e238', 94);
    });

    it('replays case-3bfe04e1cf53 (68 turns)', () => {
      replayViaShowdownBattleRunner('3bfe04e1cf53', 68);
    });

    it('replays case-7a14452288a5 (67 turns)', () => {
      replayViaShowdownBattleRunner('7a14452288a5', 67);
    });

    it('replays case-8b72ec9e5b96 (67 turns)', () => {
      replayViaShowdownBattleRunner('8b72ec9e5b96', 67);
    });

    it('replays case-cd1e6f637e07 (108 turns)', () => {
      replayViaShowdownBattleRunner('cd1e6f637e07', 108);
    });
  });
});
