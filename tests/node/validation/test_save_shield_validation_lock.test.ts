import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { validateAndSanitize } from '../../../src/logic/auth/saveService.ts';
import { validateSaveData, type SaveDataDto } from '../../../src/logic/validation/schemas.ts';

describe('Save Shield Validation Lock & Auto-Unlock', () => {
  const validBaseSave: SaveDataDto = {
    trainer: 'Ash',
    gender: 'h',
    badges: 1,
    balls: 5,
    money: 1000,
    battleCoins: 50,
    trainerLevel: 5,
    trainerExp: 100,
    trainerExpNeeded: 200,
    inventory: { pokeball: 5, potion: 2 },
    team: [
      {
        uid: 'poke-valid-1',
        id: 'pikachu',
        species: 'pikachu',
        name: 'Pikachu',
        level: 25,
        exp: 1000,
        expNeeded: 2000,
        hp: 60,
        maxHp: 60,
        atk: 55,
        def: 40,
        spa: 50,
        spd: 50,
        spe: 90,
        type: 'electric',
        isShiny: false,
        friendship: 70,
        nature: 'hardy',
        gender: 'm',
        status: '',
        ability: 'static',
        vigor: 100,
        maxVigor: 100,
        ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        moves: [{ id: 'thunderbolt', name: 'Rayos', type: 'electric', power: 90, pp: 15, maxPP: 15 }]
      }
    ],
    box: [],
    eggs: [],
    pokedex: ['pikachu'],
    seenPokedex: ['pikachu'],
    defeatedGyms: ['pewter'],
    starterChosen: true,
    eloRating: 1000,
    pvpStats: { wins: 0, losses: 0, draws: 0 },
    rankedMaxElo: 1000,
    passiveTeamActive: false,
    daycare_mission_refreshes: 3,
    boxCount: 4,
    classLevel: 1,
    classXP: 0,
    classData: {
      captureStreak: 0,
      longestStreak: 0,
      reputation: 0,
      blackMarketSales: 0,
      criminality: 0,
      kitCaptures: 0
    },
    warCoins: 0,
    warCoinsSpent: 0,
    lastPokemonCenterHeal: 0,
    playtime: 120
  };

  it('strictly validates a compliant SaveData without errors or fallbacks', () => {
    const result = validateAndSanitize(validBaseSave);
    assert.strictEqual(result.valid, true, 'Valid save must pass validation');
    assert.strictEqual(result.error, undefined);
  });

  it('hard-locks when SaveData contains corrupted schema fields (e.g. invalid level, bad types)', () => {
    const corruptSave = JSON.parse(JSON.stringify(validBaseSave));
    // Violate level constraint (level > 100)
    corruptSave.team[0].level = 999;

    const result = validateAndSanitize(corruptSave);
    assert.strictEqual(result.valid, false, 'Corrupted data must fail validation');
    assert.ok(result.error, 'Must contain descriptive error message');
    assert.ok(result.error?.includes('level') || result.error?.includes('Error de validación'));
  });

  it('hard-locks when SaveData contains invalid IVs (>31)', () => {
    const corruptSave = JSON.parse(JSON.stringify(validBaseSave));
    corruptSave.team[0].ivs.hp = 99; // Max allowed is 31

    const result = validateAndSanitize(corruptSave);
    assert.strictEqual(result.valid, false, 'Invalid IVs must fail validation');
    assert.ok(result.error?.includes('Error de validación'));
  });

  it('hard-locks when SaveData contains invalid non-numeric types', () => {
    const corruptSave = JSON.parse(JSON.stringify(validBaseSave));
    corruptSave.money = 'MILLIONAIRE' as unknown as number; // String instead of number

    const parseRes = validateSaveData(corruptSave);
    assert.strictEqual(parseRes.success, false, 'Non-numeric field must fail schema parsing');
  });

  it('dynamically auto-unlocks when updated/fixed data restores full schema compliance', () => {
    // 1. Start with invalid data (locked state)
    const mutableSave = JSON.parse(JSON.stringify(validBaseSave));
    mutableSave.team[0].hp = 'dead' as unknown as number;

    const firstCheck = validateAndSanitize(mutableSave);
    assert.strictEqual(firstCheck.valid, false, 'Initial corrupted state must be invalid');

    // 2. Simulate application update or repair fixing the corrupt field
    mutableSave.team[0].hp = 60;

    const secondCheck = validateAndSanitize(mutableSave);
    assert.strictEqual(secondCheck.valid, true, 'Repaired state must automatically unlock');
    assert.strictEqual(secondCheck.error, undefined);
  });
});
