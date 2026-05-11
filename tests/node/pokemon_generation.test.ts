import { test, describe } from 'node:test';
import assert from 'node:assert';
import { generateIvPure } from '../../src/logic/pokemon/generationMath.ts';

describe('Pokémon IV Generation Logic (Pure Math)', () => {

  test('Standard generation uses the random function correctly', () => {
    // 0.5 * 32 = 16
    const mockRandom = () => 0.5;
    const result = generateIvPure(mockRandom, 0, false, false);
    assert.strictEqual(result, 16);
  });

  test('ivFloor applies when the roll is lower', () => {
    // 0.1 * 32 = 3.2 -> 3
    const mockRandom = () => 0.1;
    const result = generateIvPure(mockRandom, 10, false, false);
    assert.strictEqual(result, 10, 'Should return the floor (10) instead of the roll (3)');
  });

  test('ivFloor does not apply when the roll is higher', () => {
    // 0.9 * 32 = 28.8 -> 28
    const mockRandom = () => 0.9;
    const result = generateIvPure(mockRandom, 10, false, false);
    assert.strictEqual(result, 28, 'Should return the roll (28) which is higher than the floor (10)');
  });

  test('Guardian Alpha standard (isGuardian) ensures a minimum of 12', () => {
    // 0.1 * 32 = 3
    const mockRandom = () => 0.1;
    // forceReRoll = true, isGuardian = true
    const result = generateIvPure(mockRandom, 0, true, true);
    assert.strictEqual(result, 12, 'Guardian must have at least 12 IVs even with bad rolls');
  });

  test('Guardian forceReRoll takes the best of two rolls', () => {
    let callCount = 0;
    const mockRandom = () => {
      callCount++;
      return callCount === 1 ? 0.1 : 0.9; // 1st roll = 3, 2nd roll = 28
    };
    
    const result = generateIvPure(mockRandom, 0, true, false);
    assert.strictEqual(result, 28, 'Should pick the highest of the two rolls');
    assert.strictEqual(callCount, 2, 'Should have called random twice');
  });

  test('Bono de Dominancia (floor = 15) overrides lower rolls', () => {
    // 0.2 * 32 = 6
    const mockRandom = () => 0.2;
    const result = generateIvPure(mockRandom, 15, false, false);
    assert.strictEqual(result, 15, 'Dominance floor (15) should override roll (6)');
  });

  test('Missions (24h floor = 15) overrides lower rolls', () => {
    const mockRandom = () => 0.4; // 0.4 * 32 = 12
    const result = generateIvPure(mockRandom, 15, false, false);
    assert.strictEqual(result, 15);
  });

});
