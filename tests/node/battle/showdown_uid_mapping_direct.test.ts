import { describe, it, beforeEach, before } from 'node:test';
import assert from 'node:assert/strict';

import { Battle } from '@pkmn/sim';
import { getShowdownFormatId } from '../../../src/logic/battle/showdownAdapter.ts';

describe('Showdown Direct UID Mapping & Sync Unit Tests', () => {
  let battle: Battle;
  let injectUidsIntoRequest: any;

  before(async () => {
    // Mock self to allow importing the worker file in Node environment
    (globalThis as any).self = {
      onmessage: null,
      postMessage: () => {}
    };
    const workerModule = await import('../../../src/logic/battle/showdown.worker.ts');
    injectUidsIntoRequest = workerModule.injectUidsIntoRequest;
  });
  beforeEach(() => {
    battle = new Battle({ formatid: getShowdownFormatId() });
  });

  it('TestCase 1: Initial mapping correctness', () => {
    const p1Team = [
      { name: 'Vaporeon', species: 'Vaporeon', moves: ['hydropump'], level: 50, uid: 'vaporeon-uid' },
      { name: 'Gengar', species: 'Gengar', moves: ['shadowball'], level: 50, uid: 'gengar-uid' },
      { name: 'Eevee', species: 'Eevee', moves: ['tackle'], level: 50, uid: 'eevee-uid' }
    ];
    const p2Team = [{ name: 'Rhydon', species: 'Rhydon', moves: ['stoneedge'], level: 50, uid: 'rhydon-uid' }];

    battle.setPlayer('p1', { name: 'Player 1', team: p1Team as any });
    battle.setPlayer('p2', { name: 'Player 2', team: p2Team as any });

    // Inject UIDs on simulator instances (mirrors worker INIT_BATTLE)
    battle.p1.pokemon.forEach((pokemon, idx) => {
      if (pokemon) {
        (pokemon as any).uid = p1Team[idx]?.uid;
      }
    });

    const request = {
      side: {
        pokemon: [
          { ident: 'p1: Vaporeon', details: 'Vaporeon, L50' },
          { ident: 'p1: Gengar', details: 'Gengar, L50' },
          { ident: 'p1: Eevee', details: 'Eevee, L50' }
        ]
      }
    };

    // Run injection
    const updatedRequest = injectUidsIntoRequest(battle, 'p1', request) as any;

    assert.strictEqual(updatedRequest.side.pokemon[0].uid, 'vaporeon-uid');
    assert.strictEqual(updatedRequest.side.pokemon[1].uid, 'gengar-uid');
    assert.strictEqual(updatedRequest.side.pokemon[2].uid, 'eevee-uid');
  });

  it('TestCase 2: Reordering after switch', () => {
    const p1Team = [
      { name: 'Vaporeon', species: 'Vaporeon', moves: ['hydropump'], level: 50, uid: 'vaporeon-uid' },
      { name: 'Gengar', species: 'Gengar', moves: ['shadowball'], level: 50, uid: 'gengar-uid' },
      { name: 'Eevee', species: 'Eevee', moves: ['tackle'], level: 50, uid: 'eevee-uid' }
    ];
    const p2Team = [{ name: 'Rhydon', species: 'Rhydon', moves: ['stoneedge'], level: 50, uid: 'rhydon-uid' }];

    battle.setPlayer('p1', { name: 'Player 1', team: p1Team as any });
    battle.setPlayer('p2', { name: 'Player 2', team: p2Team as any });

    // Inject UIDs initially
    battle.p1.pokemon.forEach((pokemon, idx) => {
      if (pokemon) {
        (pokemon as any).uid = p1Team[idx]?.uid;
      }
    });

    // Execute switch Gengar (index 1) in Showdown simulator
    battle.choose('p1', 'switch 2');
    battle.choose('p2', 'move stoneedge');

    // Simulator reorders physically: Gengar is now at index 0, Vaporeon at 1, Eevee at 2
    assert.strictEqual(battle.p1.pokemon[0]?.name, 'Gengar');
    assert.strictEqual(battle.p1.pokemon[1]?.name, 'Vaporeon');

    // Simulate request generation order corresponding to current simulator order
    const request = {
      side: {
        pokemon: [
          { ident: 'p1: Gengar', details: 'Gengar, L50' },
          { ident: 'p1: Vaporeon', details: 'Vaporeon, L50' },
          { ident: 'p1: Eevee', details: 'Eevee, L50' }
        ]
      }
    };

    const updatedRequest = injectUidsIntoRequest(battle, 'p1', request) as any;

    assert.strictEqual(updatedRequest.side.pokemon[0].uid, 'gengar-uid', 'Active Gengar (now index 0) must get Gengar UID');
    assert.strictEqual(updatedRequest.side.pokemon[1].uid, 'vaporeon-uid', 'Benched Vaporeon (now index 1) must get Vaporeon UID');
    assert.strictEqual(updatedRequest.side.pokemon[2].uid, 'eevee-uid');
  });

  it('TestCase 3: Duplicate identical species mapping', () => {
    // Two identical Bulbasaurs with same moves and stats
    const p1Team = [
      { name: 'Bulbasaur', species: 'Bulbasaur', moves: ['tackle'], level: 50, uid: 'bulb-1' },
      { name: 'Bulbasaur', species: 'Bulbasaur', moves: ['tackle'], level: 50, uid: 'bulb-2' }
    ];
    const p2Team = [{ name: 'Rhydon', species: 'Rhydon', moves: ['splash'], level: 50, uid: 'rhydon-uid' }];

    battle.setPlayer('p1', { name: 'Player 1', team: p1Team as any });
    battle.setPlayer('p2', { name: 'Player 2', team: p2Team as any });

    battle.p1.pokemon.forEach((pokemon, idx) => {
      if (pokemon) {
        (pokemon as any).uid = p1Team[idx]?.uid;
      }
    });

    // Initial state: bulb-1 active, bulb-2 benched
    const request1 = {
      side: {
        pokemon: [
          { ident: 'p1: Bulbasaur', details: 'Bulbasaur, L50' },
          { ident: 'p1: Bulbasaur', details: 'Bulbasaur, L50' }
        ]
      }
    };

    const updated1 = injectUidsIntoRequest(battle, 'p1', request1) as any;
    assert.strictEqual(updated1.side.pokemon[0].uid, 'bulb-1');
    assert.strictEqual(updated1.side.pokemon[1].uid, 'bulb-2');

    // Switch to bulb-2
    battle.choose('p1', 'switch 2');
    battle.choose('p2', 'move splash');

    // Now bulb-2 is active (index 0), bulb-1 is benched (index 1)
    assert.strictEqual(battle.p1.pokemon[0]?.uid, 'bulb-2');
    assert.strictEqual(battle.p1.pokemon[1]?.uid, 'bulb-1');

    const request2 = {
      side: {
        pokemon: [
          { ident: 'p1: Bulbasaur', details: 'Bulbasaur, L50' },
          { ident: 'p1: Bulbasaur', details: 'Bulbasaur, L50' }
        ]
      }
    };

    const updated2 = injectUidsIntoRequest(battle, 'p1', request2) as any;
    assert.strictEqual(updated2.side.pokemon[0].uid, 'bulb-2');
    assert.strictEqual(updated2.side.pokemon[1].uid, 'bulb-1');
  });

  it('TestCase 4: Strict error when UID is missing', () => {
    const p1Team = [
      { name: 'Vaporeon', species: 'Vaporeon', moves: ['hydropump'], level: 50, uid: 'vaporeon-uid' }
    ];
    const p2Team = [{ name: 'Rhydon', species: 'Rhydon', moves: ['stoneedge'], level: 50, uid: 'rhydon-uid' }];

    battle.setPlayer('p1', { name: 'Player 1', team: p1Team as any });
    battle.setPlayer('p2', { name: 'Player 2', team: p2Team as any });

    // Intentionally DO NOT set uid on battle.p1.pokemon[0]

    const request = {
      side: {
        pokemon: [
          { ident: 'p1: Vaporeon', details: 'Vaporeon, L50' }
        ]
      }
    };

    assert.throws(() => {
      injectUidsIntoRequest(battle, 'p1', request);
    }, /No UID found on simulator Pokemon instance/);
  });
});
