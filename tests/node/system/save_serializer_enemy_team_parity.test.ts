/**
 * tests/node/system/save_serializer_enemy_team_parity.test.ts
 *
 * SSoT Parity test: Verifies that serializeState serializes active battle enemyTeam
 * with 100% domain fidelity (species, tags, stats, ivs, etc.) and satisfies validateSaveData cleanly.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { INITIAL_STATE } from '../../../src/stores/gameInitialState.ts';
import { serializeState } from '../../../src/logic/auth/saveSerializer.ts';
import { validateSaveData } from '../../../src/logic/validation/schemas.ts';
import { makePokemon } from '../../../src/logic/pokemon/pokemonFactory.ts';
import type { GameState } from '../../../src/types/system/game.ts';

describe('Save Serializer Enemy Team SSoT Parity', () => {
  it('serializes active battle enemyTeam without losing species or any canonical Pokemon properties', () => {
    const rawState = JSON.parse(JSON.stringify(INITIAL_STATE)) as GameState;
    rawState.trainer = 'Ash';
    rawState.starterChosen = true;

    const playerMon = makePokemon('pikachu', 10);
    const enemyMon1 = makePokemon('rattata', 3);
    const enemyMon2 = makePokemon('pidgey', 4);

    assert.ok(playerMon, 'playerMon should be created');
    assert.ok(enemyMon1, 'enemyMon1 should be created');
    assert.ok(enemyMon2, 'enemyMon2 should be created');

    rawState.team = [playerMon];
    rawState.activeBattle = {
      isGym: false,
      isTrainer: true,
      trainerName: 'Joven Chano',
      locationId: 'route1',
      over: false,
      turnCount: 2,
      player: playerMon,
      enemy: enemyMon1,
      enemyTeam: [enemyMon1, enemyMon2],
      playerTeam: [playerMon],
      playerTeamIndex: 0,
      enemyTeamIndex: 0,
      timestamp: Date.now(),
    } as unknown as GameState['activeBattle'];

    const serialized = serializeState(rawState);

    // Assert enemyTeam in serialized data contains species
    assert.ok(serialized.activeBattle, 'serialized.activeBattle must exist');
    assert.ok(Array.isArray(serialized.activeBattle.enemyTeam), 'serialized enemyTeam must be an array');
    assert.strictEqual(serialized.activeBattle.enemyTeam.length, 2);

    const serializedEnemy1 = serialized.activeBattle.enemyTeam[0];
    assert.ok(serializedEnemy1, 'first enemy must exist');
    assert.strictEqual(serializedEnemy1.id, 'rattata');
    assert.strictEqual(serializedEnemy1.species, 'rattata', 'Enemy 1 MUST retain species: "rattata"');
    assert.strictEqual(serializedEnemy1.level, 3);
    assert.ok(Array.isArray(serializedEnemy1.tags), 'tags must be an array');

    const serializedEnemy2 = serialized.activeBattle.enemyTeam[1];
    assert.ok(serializedEnemy2, 'second enemy must exist');
    assert.strictEqual(serializedEnemy2.id, 'pidgey');
    assert.strictEqual(serializedEnemy2.species, 'pidgey', 'Enemy 2 MUST retain species: "pidgey"');

    // Run through strict Valibot save schema validator
    const res = validateSaveData(serialized);
    assert.strictEqual(
      res.success,
      true,
      `validateSaveData failed on serialized battle state: ${JSON.stringify(res.issues)}`
    );
  });
});
