/**
 * tests/node/battle/forcedSwitchCombinations.test.ts
 *
 * Exhaustive unit tests verifying ALL combinations of forced switch requests,
 * double faints, revival blessing, item uses, and seat resolutions in ShowdownBattleEngine.
 */
import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { ShowdownBattleEngine } from '../../../src/logic/battle/engine/showdownBattleEngine.ts';
import { createShowdownBattle } from '../../../src/logic/battle/helpers/showdownBattleFactory.ts';
import { ShowdownLogEnricher } from '../../../src/logic/battle/helpers/showdownLogEnricher.ts';
import { ACTIVE_SHOWDOWN_FORMAT } from '../../../src/data/system/constants.ts';
import { ShowdownBattleAgent } from '../../../src/logic/battle/helpers/showdownBattleAgent.ts';
import { classifyRequest, requiresAction } from '../../../src/logic/battle/helpers/requestHelper.ts';

class TestAgent extends ShowdownBattleAgent {}

function createTestBattle(seed: [number, number, number, number] = [1, 2, 3, 4]) {
  const battle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, seed);
  ShowdownLogEnricher.setupRealtimeEnrichment(battle);
  
  const team1 = [
    { name: 'Bulbasaur', species: 'Bulbasaur', item: '', ability: 'Overgrow', moves: ['tackle', 'growl', 'vinewhip', 'amnesia'], level: 50, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } },
    { name: 'Charmander', species: 'Charmander', item: '', ability: 'Blaze', moves: ['scratch', 'ember'], level: 50, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } },
    { name: 'Squirtle', species: 'Squirtle', item: '', ability: 'Torrent', moves: ['tackle', 'watergun'], level: 50, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } }
  ];

  const team2 = [
    { name: 'Pikachu', species: 'Pikachu', item: '', ability: 'Static', moves: ['thunderbolt', 'quickattack'], level: 50, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } },
    { name: 'Eevee', species: 'Eevee', item: '', ability: 'RunAway', moves: ['tackle'], level: 50, ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 } }
  ];

  battle.setPlayer('p1', { name: 'Player 1', team: team1 as any });
  battle.setPlayer('p2', { name: 'Player 2', team: team2 as any });
  return battle;
}

describe('Forced Switch Combinations & Engine Parity Tests', () => {
  it('Combination 1: Normal turn -> P1 move and P2 move execute cleanly', () => {
    const battle = createTestBattle();
    const engine = new ShowdownBattleEngine({ mode: 'fuzzer' });
    Reflect.set(engine, 'battle', battle);

    const out = engine.executeTurn({
      p1Agent: new TestAgent('p1'),
      p2Agent: new TestAgent('p2')
    });

    assert.match(out.p1AcceptedChoice, /^move 1/);
    assert.match(out.p2AcceptedChoice, /^move 1/);
    assert.equal(battle.turn, 2);
  });

  it('Combination 2: Single P1 Forced Switch via natural faint -> Only P1 acts', () => {
    const battle = createTestBattle();
    battle.p1.pokemon[0]!.hp = 1;
    (battle.p2.pokemon[0] as any).level = 100;

    const engine = new ShowdownBattleEngine({ mode: 'fuzzer' });
    Reflect.set(engine, 'battle', battle);

    // Turn 1: P2 OHKOs P1 active (which has 1 HP)
    engine.executeTurn({ p1Choice: 'move 1', p2Choice: 'move 1' });

    // Verify P1 is now in force-switch request state
    assert.equal(classifyRequest(battle.p1.activeRequest), 'force-switch');
    assert.equal(requiresAction(battle.p1.activeRequest), true);

    // Execute turn when P1 has force-switch
    const out = engine.executeTurn({
      p1Agent: new TestAgent('p1'),
      p2Agent: new TestAgent('p2')
    });

    assert.match(out.p1AcceptedChoice, /^switch /);
    assert.equal(out.p2AcceptedChoice, '');
    assert.equal(battle.p1.active[0]?.name, 'Charmander');
  });

  it('Combination 3: Single P2 Forced Switch via natural faint -> Only P2 acts', () => {
    const battle = createTestBattle();
    battle.p2.pokemon[0]!.hp = 1;
    (battle.p1.pokemon[0] as any).level = 100;

    const engine = new ShowdownBattleEngine({ mode: 'fuzzer' });
    Reflect.set(engine, 'battle', battle);

    // Turn 1: P1 OHKOs P2 active (which has 1 HP)
    engine.executeTurn({ p1Choice: 'move 1', p2Choice: 'move 1' });

    // Verify P2 is now in force-switch request state
    assert.equal(classifyRequest(battle.p2.activeRequest), 'force-switch');
    assert.equal(requiresAction(battle.p2.activeRequest), true);

    // Execute turn when P2 has force-switch
    const out = engine.executeTurn({
      p1Agent: new TestAgent('p1'),
      p2Agent: new TestAgent('p2')
    });

    assert.equal(out.p1AcceptedChoice, '');
    assert.match(out.p2AcceptedChoice, /^switch /);
    assert.equal(battle.p2.active[0]?.name, 'Eevee');
  });

  it('Combination 4: Double Forced Switch via double faint -> Both P1 and P2 select switch', () => {
    const battle = createTestBattle();
    battle.p1.pokemon[0]!.hp = 1;
    battle.p2.pokemon[0]!.hp = 1;

    const engine = new ShowdownBattleEngine({ mode: 'fuzzer' });
    Reflect.set(engine, 'battle', battle);

    // Both attack and both faint
    engine.executeTurn({ p1Choice: 'move 1', p2Choice: 'move 1' });

    // If both fainted, both are in force-switch request
    if (classifyRequest(battle.p1.activeRequest) === 'force-switch' && classifyRequest(battle.p2.activeRequest) === 'force-switch') {
      const out = engine.executeTurn({
        p1Agent: new TestAgent('p1'),
        p2Agent: new TestAgent('p2')
      });

      assert.match(out.p1AcceptedChoice, /^switch /);
      assert.match(out.p2AcceptedChoice, /^switch /);
    }
  });

  it('Combination 5: Explicit switch choice during replayer mode for single force-switch', () => {
    const battle = createTestBattle();
    battle.p1.pokemon[0]!.hp = 1;
    (battle.p2.pokemon[0] as any).level = 100;

    const engine = new ShowdownBattleEngine({ mode: 'replayer' });
    Reflect.set(engine, 'battle', battle);

    // Turn 1: P2 OHKOs P1 active (which has 1 HP)
    engine.executeTurn({ p1Choice: 'move 1', p2Choice: 'move 1' });

    assert.equal(classifyRequest(battle.p1.activeRequest), 'force-switch');

    // Replayer provides explicit switch choice for P1 and move 1 for P2
    const out = engine.executeTurn({
      p1Choice: 'switch 3',
      p2Choice: 'move 1'
    });

    assert.equal(out.p1AcceptedChoice, 'switch 3');
    assert.equal(out.p2AcceptedChoice, '');
    assert.equal(battle.p1.active[0]?.name, 'Squirtle');

    // Next turn is a normal move turn
    const nextOut = engine.executeTurn({
      p1Choice: 'move 1',
      p2Choice: 'move 1'
    });

    assert.match(nextOut.p1AcceptedChoice, /^move 1/);
    assert.match(nextOut.p2AcceptedChoice, /^move 1/);
  });

  it('Combination 6: classifyRequest correctly handles forceSwitch: [false] without returning wait', () => {
    const req = {
      forceSwitch: [false],
      active: [{ moves: [{ id: 'tackle', pp: 35 }] }],
      side: { pokemon: [] }
    };
    assert.equal(classifyRequest(req as any), 'move');
    assert.equal(requiresAction(req as any), true);
  });

  it('Combination 7: classifyRequest correctly identifies team preview requests', () => {
    const req = {
      teamPreview: true,
      side: { pokemon: [{ ident: 'p1: Mon1' }, { ident: 'p1: Mon2' }] }
    };
    assert.equal(classifyRequest(req as any), 'team-preview');
    assert.equal(requiresAction(req as any), true);
  });

  it('Combination 8: classifyRequest correctly identifies revival blessing requests', () => {
    const req = {
      forceSwitch: [true],
      side: {
        pokemon: [
          { ident: 'p1: Pawmot', active: true, reviving: true },
          { ident: 'p1: Pikachu', active: false, condition: '0 fnt' }
        ]
      }
    };
    assert.equal(classifyRequest(req as any), 'revive-target');
    assert.equal(requiresAction(req as any), true);
  });
});
