import { describe, it, expect } from 'vitest';
import { TRAINER_TYPES, getArchetypePool, type TrainerTypeKey } from '@/data/player/trainerTypes';
import { ENABLED_POKEMON_IDS_SET } from '@/data/system/constants';
import { Dex } from '@pkmn/sim';

describe('Dynamic Thematic Trainer Pools (O(1))', () => {
  it('should resolve a non-empty pool for every defined trainer archetype', () => {
    const keys = Object.keys(TRAINER_TYPES) as TrainerTypeKey[];
    for (const key of keys) {
      const pool = getArchetypePool(key);
      expect(pool.length, `Pool for archetype ${key} must not be empty`).toBeGreaterThan(0);
    }
  });

  it('should ensure 100% of species in all archetype pools are within ENABLED_POKEMON_IDS_SET', () => {
    const keys = Object.keys(TRAINER_TYPES) as TrainerTypeKey[];
    for (const key of keys) {
      const pool = getArchetypePool(key);
      for (const speciesId of pool) {
        expect(
          ENABLED_POKEMON_IDS_SET.has(speciesId),
          `Species ${speciesId} in ${key} must be enabled`
        ).toBe(true);
      }
    }
  });

  it('should enforce thematic type integrity for Caza Bichos (only Bug Pokémon)', () => {
    const bugPool = getArchetypePool('caza_bichos');
    expect(bugPool.length).toBeGreaterThanOrEqual(6);
    
    // All members must have 'Bug' in their Showdown types
    for (const id of bugPool) {
      const spec = Dex.species.get(id);
      expect(spec.types).toContain('Bug');
    }
  });

  it('should enforce thematic type integrity for Pescador (only Water Pokémon)', () => {
    const waterPool = getArchetypePool('pescador');
    expect(waterPool.length).toBeGreaterThanOrEqual(10);
    
    for (const id of waterPool) {
      const spec = Dex.species.get(id);
      expect(spec.types).toContain('Water');
    }
  });

  it('should enforce thematic type integrity for Luchador (only Fighting Pokémon)', () => {
    const fightPool = getArchetypePool('luchador');
    expect(fightPool.length).toBeGreaterThanOrEqual(5);
    
    for (const id of fightPool) {
      const spec = Dex.species.get(id);
      expect(spec.types).toContain('Fighting');
    }
  });

  it('should exclude legendaries like Mewtwo/Articuno from standard NPC pools', () => {
    const standardKeys = (Object.keys(TRAINER_TYPES) as TrainerTypeKey[]).filter(k => k !== 'rival');
    for (const key of standardKeys) {
      const pool = getArchetypePool(key);
      expect(pool).not.toContain('mewtwo');
      expect(pool).not.toContain('mew');
      expect(pool).not.toContain('articuno');
      expect(pool).not.toContain('zapdos');
      expect(pool).not.toContain('moltres');
    }
  });

  it('should maintain the explicit Ace pool for Rival', () => {
    const rivalPool = getArchetypePool('rival');
    expect(rivalPool).toEqual(TRAINER_TYPES['rival'].pool);
  });
});
