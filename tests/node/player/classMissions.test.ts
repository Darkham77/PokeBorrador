/**
 * tests/node/player/classMissions.test.ts
 *
 * VITEST (vite-node) — node environment
 *
 * Verifies player class missions launch/collect parameters and self-healing stuck pokemon recovery.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';

import { healStuckMissions } from '../../../src/logic/player/missionRecovery.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

describe('Player Class Missions Integrity & Self-Healing', () => {

  it('healStuckMissions should release pokemon stuck onMission when no activeMission is present', () => {
    const team = [
      { uid: 'poke1', name: 'Bulbasaur', onMission: true } as unknown as Pokemon
    ];
    const box = [
      { uid: 'poke2', name: 'Charmander', onMission: true } as unknown as Pokemon,
      { uid: 'poke3', name: 'Squirtle', onMission: false } as unknown as Pokemon
    ];
    const activeMission = null;

    const fixedAny = healStuckMissions(team, box, activeMission);

    // Verify both poke1 and poke2 are self-healed (onMission = false)
    assert.strictEqual(team[0]?.onMission, false);
    assert.strictEqual(box[0]?.onMission, false);
    assert.strictEqual(box[1]?.onMission, false);
    assert.strictEqual(fixedAny, true, 'Should return true indicating changes were made');
  });

  it('healStuckMissions should NOT release pokemon currently active on a class mission', () => {
    const team = [
      { uid: 'active-poke', name: 'Bulbasaur', onMission: true } as unknown as Pokemon
    ];
    const box = [
      { uid: 'stuck-poke', name: 'Charmander', onMission: true } as unknown as Pokemon
    ];
    const activeMission = {
      id: 'mission_6h',
      targetPokemonUid: 'active-poke'
    };

    const fixedAny = healStuckMissions(team, box, activeMission);

    // Verify active-poke remains onMission: true, but stuck-poke is released
    assert.strictEqual(team[0]?.onMission, true);
    assert.strictEqual(box[0]?.onMission, false);
    assert.strictEqual(fixedAny, true);
  });

  it('healStuckMissions should resolve stuck pokemon using targetPokemonIdx if targetPokemonUid is not stored', () => {
    const team: Pokemon[] = [];
    const box = [
      { uid: 'active-idx-poke', name: 'Charmander', onMission: true } as unknown as Pokemon,
      { uid: 'stuck-poke', name: 'Squirtle', onMission: true } as unknown as Pokemon
    ];
    const activeMission = {
      id: 'mission_6h',
      targetPokemonIdx: 0 // Index 0 is active-idx-poke
    };

    const fixedAny = healStuckMissions(team, box, activeMission);

    // Index 0 should remain on mission, but index 1 is stuck and should be healed
    assert.strictEqual(box[0]?.onMission, true);
    assert.strictEqual(box[1]?.onMission, false);
    assert.strictEqual(fixedAny, true);
  });

});
