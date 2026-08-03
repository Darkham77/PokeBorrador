import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { ShowdownBattleEngine } from '../../../src/logic/battle/engine/showdownBattleEngine.ts';
import { ShowdownBattleRunner } from '../../../src/logic/battle/helpers/showdownBattleRunner.ts';
import type { FuzzerCheat } from '../../../src/logic/battle/helpers/battleCheatManager.ts';
import { createShowdownBattle } from '../../../src/logic/battle/helpers/showdownBattleFactory.ts';
import { ShowdownLogEnricher } from '../../../src/logic/battle/helpers/showdownLogEnricher.ts';
import { ACTIVE_SHOWDOWN_FORMAT } from '../../../src/data/system/constants.ts';

const LOW_HP = 1;
const CERTIFIED_HEAL_TURN = 2;
const CERTIFIED_SEED = [1, 2, 3, 4];

function createReplayEngine(cheats?: FuzzerCheat[]): ShowdownBattleEngine {
  const engine = new ShowdownBattleEngine({ mode: 'replayer', cheats });
  const battle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, CERTIFIED_SEED);
  ShowdownLogEnricher.setupRealtimeEnrichment(battle);
  battle.setPlayer('p1', { name: 'P1', team: [{ name: 'Bulbasaur', species: 'Bulbasaur', item: '', ability: 'Overgrow', moves: ['tackle'], nature: 'Hardy', gender: 'M', level: 50, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } }] });
  battle.setPlayer('p2', { name: 'P2', team: [{ name: 'Blissey', species: 'Blissey', item: '', ability: 'NaturalCure', moves: ['splash'], nature: 'Hardy', gender: 'M', level: 100, evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 0, spe: 0 }, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } }] });
  Object.defineProperty(engine, 'battle', { value: battle });
  return engine;
}

describe('ShowdownBattleEngine strict fail-loud integrity', () => {
  it('does not apply unrecorded IPB healing during a certified replay', () => {
    const engine = createReplayEngine();
    const active = engine.battle.p1.active[0];
    assert.ok(active, 'P1 active Pokémon must exist');
    active.hp = LOW_HP;

    engine.executeTurn({ p1Choice: 'move 1', p2Choice: 'move 1' });

    assert.equal(active.hp, LOW_HP, 'A replay may only heal when its certified history records that heal');
  });

  it('applies a replay heal only when the certified history records its battle turn', () => {
    const engine = createReplayEngine([{ battleTurn: CERTIFIED_HEAL_TURN, p1Heal: true }]);
    const active = engine.battle.p1.active[0];
    assert.ok(active, 'P1 active Pokémon must exist');
    active.hp = LOW_HP;

    const output = engine.executeTurn({ p1Choice: 'move 1', p2Choice: 'move 1' });

    assert.equal(output.battleTurn, CERTIFIED_HEAL_TURN, 'The replay must use the battle turn persisted by the fuzzer');
    assert.equal(active.hp, active.maxhp, 'A recorded replay heal must restore the same state recorded by the fuzzer');
  });

  it('throws when a certified choice stream is exhausted for a required request', () => {
    const runner = new ShowdownBattleRunner([], []);

    assert.throws(
      () => runner.resolveAndConsumeNextChoice('p1', { active: [{}] }),
      /Required certified choice/
    );
  });

  it('does not consume a certified choice while previewing a visual switch', () => {
    const runner = new ShowdownBattleRunner(['move 1'], ['switch 2']);
    const request = { forceSwitch: [true] };

    assert.equal(runner.peekNextChoice('p2', request), 'switch 2');
    assert.equal(runner.p2ChoiceIdx, 0, 'A visual preview must not advance P2');
    assert.equal(runner.resolveAndConsumeNextChoice('p2', request), 'switch 2');
    assert.equal(runner.p2ChoiceIdx, 1, 'Only the Showdown submission may advance P2');
  });

  it('throws an explicit error when a choice is rejected instead of applying silent fallbacks', () => {
    const battle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, [1, 2, 3, 4]);
    battle.setPlayer('p1', { name: 'P1', team: [{ name: 'Bulbasaur', species: 'Bulbasaur', item: '', ability: 'Overgrow', moves: ['tackle'], nature: 'Hardy', gender: 'M', level: 50, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } }] });
    battle.setPlayer('p2', { name: 'P2', team: [{ name: 'Charmander', species: 'Charmander', item: '', ability: 'Blaze', moves: ['scratch'], nature: 'Hardy', gender: 'M', level: 50, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } }] });
    const engine = new ShowdownBattleEngine({ mode: 'fuzzer' });
    (engine as unknown as { battle: typeof battle }).battle = battle;

    assert.throws(
      () => {
        engine.executeTurn({
          p1Choice: 'switch 2',
          p2Choice: 'move 1',
        });
      },
      (err: Error) => {
        return err.message.includes('[ShowdownBattleEngine]') && err.message.includes('rechazada');
      }
    );
  });

  it('does not crash commitChoices when p1Skip=true and p1 pokemon is still alive (move request)', () => {
    // Regression: manually pushing { choice: 'pass' } into side.choice.actions bypasses
    // Showdown's isChoiceDone() check and causes "Not all choices done" on commitChoices().
    // The fix uses battle.choose(seatId, 'default') via the official API instead.
    const engine = createReplayEngine();
    assert.doesNotThrow(() => {
      engine.executeTurn({ p1Choice: 'move 1', p2Choice: 'move 1', p1Skip: true });
    }, 'executeTurn with p1Skip=true must not throw Not all choices done');
  });
});
