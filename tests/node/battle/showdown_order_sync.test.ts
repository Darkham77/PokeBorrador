import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { ShowdownBattleRunner } from '../../../src/logic/battle/helpers/showdownBattleRunner.ts';
import { ShowdownBattleEngine } from '../../../src/logic/battle/engine/showdownBattleEngine.ts';
import { createShowdownBattle } from '../../../src/logic/battle/helpers/showdownBattleFactory.ts';
import { ACTIVE_SHOWDOWN_FORMAT } from '../../../src/data/system/constants.ts';

describe('Showdown Battle Choice Index Centralization', () => {
  it('guarantees single-source index advancement: explicit choice execution in ShowdownBattleEngine must not double-advance runner indices', () => {
    const battle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, [1, 2, 3, 4]);
    battle.setPlayer('p1', {
      name: 'P1',
      team: [{
        name: 'Bulbasaur', species: 'Bulbasaur', item: '', ability: 'Overgrow',
        moves: ['tackle'], nature: 'Hardy', gender: 'M', level: 50,
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
      }]
    });
    battle.setPlayer('p2', {
      name: 'P2',
      team: [{
        name: 'Charmander', species: 'Charmander', item: '', ability: 'Blaze',
        moves: ['scratch'], nature: 'Hardy', gender: 'M', level: 50,
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }
      }]
    });

    const playerChoices = ['move 1', 'move 1'];
    const enemyChoices = ['move 1', 'move 1'];
    const runner = new ShowdownBattleRunner(playerChoices, enemyChoices);

    // Turn 1
    const p1Req = battle.p1.activeRequest;
    const p2Req = battle.p2.activeRequest;
    const p1Choice = runner.resolveAndConsumeNextChoice('p1', p1Req);
    const p2Choice = runner.resolveAndConsumeNextChoice('p2', p2Req);

    // Initial check: runner index advanced to 1
    assert.strictEqual(runner.p1ChoiceIdx, 1, 'Runner P1 index should be 1 after resolveAndConsumeNextChoice');
    assert.strictEqual(runner.p2ChoiceIdx, 1, 'Runner P2 index should be 1 after resolveAndConsumeNextChoice');

    const engine = new ShowdownBattleEngine({
      mode: 'replayer',
      playerChoices,
      enemyChoices
    });
    engine.choiceIdx.set('p1', runner.p1ChoiceIdx);
    engine.choiceIdx.set('p2', runner.p2ChoiceIdx);
    (engine as unknown as { battle: typeof battle }).battle = battle;

    // Execute turn with explicit choices already resolved by runner
    engine.executeTurn({ p1Choice, p2Choice });

    // Sync indices back — fail loudly if the engine dropped a seat index that was explicitly set
    const updatedP1Idx = engine.choiceIdx.get('p1');
    const updatedP2Idx = engine.choiceIdx.get('p2');
    if (updatedP1Idx === undefined) throw new Error('[showdown_order_sync] P1 choiceIdx missing from engine after executeTurn');
    if (updatedP2Idx === undefined) throw new Error('[showdown_order_sync] P2 choiceIdx missing from engine after executeTurn');
    runner.p1ChoiceIdx = updatedP1Idx;
    runner.p2ChoiceIdx = updatedP2Idx;

    // KEY ASSERTION: Index must STILL be 1 (not double-advanced to 2!)
    assert.strictEqual(runner.p1ChoiceIdx, 1, 'Runner P1 index MUST be 1 after engine.executeTurn with explicit choice');
    assert.strictEqual(runner.p2ChoiceIdx, 1, 'Runner P2 index MUST be 2 after engine.executeTurn with explicit choice');
  });
});
