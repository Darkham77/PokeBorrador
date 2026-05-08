
import { describe, it, expect } from 'vitest';
import { POKEMON_DB } from '@/data/pokemonDB';

describe('Pokemon Database Integrity', () => {
  const species = Object.entries(POKEMON_DB);

  it('should have at least the original 151 species', () => {
    expect(species.length).toBeGreaterThanOrEqual(151);
  });

  it('every species must have a valid catchRate', () => {
    species.forEach(([id, data]) => {
      expect(data.catchRate, `Pokemon "${id}" is missing catchRate`).toBeDefined();
      expect(typeof data.catchRate, `Pokemon "${id}" catchRate must be a number`).toBe('number');
      expect(data.catchRate, `Pokemon "${id}" catchRate must be between 3 and 255`).toBeGreaterThanOrEqual(3);
      expect(data.catchRate, `Pokemon "${id}" catchRate must be between 3 and 255`).toBeLessThanOrEqual(255);
    });
  });

  it('every species must have core combat stats', () => {
    const stats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
    species.forEach(([id, data]) => {
      stats.forEach(stat => {
        expect(data[stat], `Pokemon "${id}" is missing stat: ${stat}`).toBeDefined();
        expect(typeof data[stat], `Pokemon "${id}" stat ${stat} must be a number`).toBe('number');
        expect(data[stat], `Pokemon "${id}" stat ${stat} must be positive`).toBeGreaterThan(0);
      });
    });
  });

  it('every species must have a valid learnset', () => {
    species.forEach(([id, data]) => {
      expect(Array.isArray(data.learnset), `Pokemon "${id}" learnset must be an array`).toBe(true);
      expect(data.learnset.length, `Pokemon "${id}" learnset cannot be empty`).toBeGreaterThan(0);
      
      data.learnset.forEach((move, index) => {
        expect(move.lv, `Pokemon "${id}" move at index ${index} missing level`).toBeDefined();
        expect(move.name, `Pokemon "${id}" move at index ${index} missing name`).toBeDefined();
        expect(move.pp, `Pokemon "${id}" move at index ${index} missing pp`).toBeDefined();
      });
    });
  });

  it('every species ID (key) must be lowercase and consistent', () => {
    Object.keys(POKEMON_DB).forEach(id => {
      expect(id, `Pokemon ID "${id}" must be lowercase`).toBe(id.toLowerCase());
      expect(id.includes(' '), `Pokemon ID "${id}" should not contain spaces`).toBe(false);
    });
  });
});
