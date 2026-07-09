import { test, describe } from 'vitest';
import assert from 'node:assert/strict';
import { updateCastformForm } from '../../../src/logic/battle/battleFlow.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';
import type { LogFn } from '../../../src/types/battle/battle.ts';

describe('Castform Forecast (Predicción) Ability Mechanics', () => {
  const mockAddLog: LogFn = () => {};

  test('should transform into Sunny Form under Sun weather', () => {
    const castform: Partial<Pokemon> = {
      id: 'castform',
      name: 'Castform',
      ability: 'Predicción',
      form: 'normal',
      type: 'normal',
      type2: undefined
    };

    updateCastformForm(castform as Pokemon, 'sun', mockAddLog);

    assert.strictEqual(castform.form, 'sunny');
    assert.strictEqual(castform.type, 'fire');
    assert.strictEqual(castform.type2, undefined);
  });

  test('should transform into Rainy Form under Rain weather', () => {
    const castform: Partial<Pokemon> = {
      id: 'castform',
      name: 'Castform',
      ability: 'Predicción',
      form: 'normal',
      type: 'normal',
      type2: undefined
    };

    updateCastformForm(castform as Pokemon, 'rain', mockAddLog);

    assert.strictEqual(castform.form, 'rainy');
    assert.strictEqual(castform.type, 'water');
  });

  test('should transform into Snowy Form under Snow or Hail weather', () => {
    const castform: Partial<Pokemon> = {
      id: 'castform',
      name: 'Castform',
      ability: 'Predicción',
      form: 'normal',
      type: 'normal',
      type2: undefined
    };

    // Test with Hail
    updateCastformForm(castform as Pokemon, 'hail', mockAddLog);
    assert.strictEqual(castform.form, 'snowy');
    assert.strictEqual(castform.type, 'ice');

    // Test with Snow
    castform.form = 'normal';
    castform.type = 'normal';
    updateCastformForm(castform as Pokemon, 'snow', mockAddLog);
    assert.strictEqual(castform.form, 'snowy');
    assert.strictEqual(castform.type, 'ice');
  });

  test('should revert to Normal Form under clear or other weather types', () => {
    const castform: Partial<Pokemon> = {
      id: 'castform',
      name: 'Castform',
      ability: 'Predicción',
      form: 'sunny',
      type: 'fire',
      type2: undefined
    };

    updateCastformForm(castform as Pokemon, 'clear', mockAddLog);

    assert.strictEqual(castform.form, 'normal');
    assert.strictEqual(castform.type, 'normal');
  });

  test('should not change form if ability is not Predicción', () => {
    const castform: Partial<Pokemon> = {
      id: 'castform',
      name: 'Castform',
      ability: 'Impás',
      form: 'normal',
      type: 'normal'
    };

    updateCastformForm(castform as Pokemon, 'sun', mockAddLog);

    assert.strictEqual(castform.form, 'normal');
    assert.strictEqual(castform.type, 'normal');
  });
});
