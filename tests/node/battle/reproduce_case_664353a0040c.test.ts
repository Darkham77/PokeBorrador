import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ShowdownBattleEngine } from '../../../src/logic/battle/engine/showdownBattleEngine.ts';
import { createShowdownBattle } from '../../../src/logic/battle/helpers/showdownBattleFactory.ts';
import { parseToNumericSeed, formatToShowdownSeed } from '../../../src/logic/battle/battleSeedManager.ts';
import { resetDeterministicMathRandom } from '../../../src/logic/battle/helpers/seedInitializer.ts';
import { ShowdownTeamMapper, type CustomPokemonSet } from '../../../src/logic/battle/helpers/showdownTeamMapper.ts';
import { patchShowdownSpreadModify } from '../../../src/logic/battle/showdownAdapter.ts';
import type { CertifiedBattleCase } from '../../../scripts/e2e/fuzzer/generators/fuzzer_team_generator.ts';

describe('Reproduce Fuzzer Case 664353a0040c (Lote #20)', () => {
  const casesPath = path.resolve(__dirname, '../../../scripts/e2e/results/fuzzer_certified_cases.json');
  const allCases: { battle: CertifiedBattleCase[] } = JSON.parse(fs.readFileSync(casesPath, 'utf8'));
  const c20 = allCases.battle.find(c => c.id === 'case-664353a0040c') || allCases.battle[19]!;

  it('replays all 86 certified turns of case-664353a0040c in node simulator', () => {
    patchShowdownSpreadModify(() => true);
    ShowdownTeamMapper.populateStatsMap(c20.playerTeam as unknown as CustomPokemonSet[]);
    ShowdownTeamMapper.populateStatsMap(c20.enemyTeam as unknown as CustomPokemonSet[]);

    const seedStr = formatToShowdownSeed(parseToNumericSeed(c20.seed));
    const battle = createShowdownBattle('gen9customgame', seedStr);
    resetDeterministicMathRandom();
    battle.setPlayer('p1', { name: 'Player', team: c20.playerTeam });
    battle.setPlayer('p2', { name: 'Opponent', team: c20.enemyTeam });

    battle.p1.pokemon.forEach((pokemon, idx) => {
      if (pokemon && c20.playerTeam[idx]?.uid) Reflect.set(pokemon, 'uid', c20.playerTeam[idx].uid);
    });
    battle.p2.pokemon.forEach((pokemon, idx) => {
      if (pokemon && c20.enemyTeam[idx]?.uid) Reflect.set(pokemon, 'uid', c20.enemyTeam[idx].uid);
    });

    const engine = new ShowdownBattleEngine({
      mode: 'replayer',
      seed: c20.seed,
      playerChoices: c20.playerChoices,
      enemyChoices: c20.enemyChoices,
      history: c20.history
    });
    Reflect.set(engine, 'battle', battle);

    for (let step = 0; step < c20.history.length; step++) {
      const h = c20.history[step]!;
      const p1Choice = h.p1Choice;
      const p2Choice = h.p2Choice;

      const res = engine.executeTurn({
        p1Choice: p1Choice || undefined,
        p2Choice: p2Choice || undefined,
        p1Skip: !p1Choice,
        p2Skip: !p2Choice,
        certifiedHistoryStep: h
      });

      expect(res).toBeDefined();
    }

    expect(battle.turn).toBeGreaterThanOrEqual(70);
  });
});
