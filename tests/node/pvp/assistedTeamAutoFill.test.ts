import { describe, it, expect } from 'vitest';
import {
  isPokemonLegalForTheme,
  autoFillLegalTeamForTheme
} from '@/logic/pvp/pvpTeamHelper.ts';
import { getSeasonalThemeConfig } from '@/data/system/rankedData.ts';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('Assisted Legal Team Auto-Fill', () => {
  const createTestPokemon = (
    uid: string,
    id: string,
    name: string,
    level: number,
    type: string,
    type2?: string,
    ivs: { hp: number; atk: number; def: number; spa: number; spd: number; spe: number } = { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 }
  ): Pokemon => ({
    uid,
    id,
    name,
    level,
    type,
    type2,
    ivs
  } as unknown as Pokemon);

  describe('isPokemonLegalForTheme', () => {
    it('validates banned species for kanto_classic and no_legendaries', () => {
      const kanto = getSeasonalThemeConfig('kanto_classic');
      const mewtwo = createTestPokemon('m1', 'mewtwo', 'Mewtwo', 50, 'psychic');
      const charizard = createTestPokemon('c1', 'charizard', 'Charizard', 50, 'fire', 'flying');

      expect(isPokemonLegalForTheme(mewtwo, kanto)).toBe(false);
      expect(isPokemonLegalForTheme(charizard, kanto)).toBe(true);
    });

    it('validates Little Cup stage legality (must be first stage that can evolve)', () => {
      const lc = getSeasonalThemeConfig('little_cup');
      const pichu = createTestPokemon('p1', 'pichu', 'Pichu', 5, 'electric');
      const pikachu = createTestPokemon('p2', 'pikachu', 'Pikachu', 5, 'electric');
      const raichu = createTestPokemon('p3', 'raichu', 'Raichu', 5, 'electric');
      const pinsir = createTestPokemon('p4', 'pinsir', 'Pinsir', 5, 'bug'); // cannot evolve

      expect(isPokemonLegalForTheme(pichu, lc)).toBe(true);
      expect(isPokemonLegalForTheme(pikachu, lc)).toBe(false); // has prevo (pichu)
      expect(isPokemonLegalForTheme(raichu, lc)).toBe(false); // has prevo (pikachu)
      expect(isPokemonLegalForTheme(pinsir, lc)).toBe(false); // cannot evolve
    });

    it('validates dual type requirement', () => {
      const dual = getSeasonalThemeConfig('dual_type_duo');
      const singleType = createTestPokemon('s1', 'pikachu', 'Pikachu', 50, 'electric');
      const dualType = createTestPokemon('d1', 'gengar', 'Gengar', 50, 'ghost', 'poison');

      expect(isPokemonLegalForTheme(singleType, dual)).toBe(false);
      expect(isPokemonLegalForTheme(dualType, dual)).toBe(true);
    });

    it('validates allowed types for weather masters', () => {
      const weather = getSeasonalThemeConfig('weather_masters');
      const blastoise = createTestPokemon('b1', 'blastoise', 'Blastoise', 50, 'water');
      const alakazam = createTestPokemon('a1', 'alakazam', 'Alakazam', 50, 'psychic');

      expect(isPokemonLegalForTheme(blastoise, weather)).toBe(true);
      expect(isPokemonLegalForTheme(alakazam, weather)).toBe(false);
    });
  });

  describe('autoFillLegalTeamForTheme', () => {
    it('prioritizes higher level and higher IVs among legal candidates', () => {
      const weather = getSeasonalThemeConfig('weather_masters');
      const blastoiseLv30 = createTestPokemon('b1', 'blastoise', 'Blastoise Lv30', 30, 'water');
      const charizardLv50LowIvs = createTestPokemon('c1', 'charizard', 'Charizard Lv50 Low', 50, 'fire', 'flying', { hp: 5, atk: 5, def: 5, spa: 5, spd: 5, spe: 5 });
      const venusaurLv50HighIvs = createTestPokemon('v1', 'venusaur', 'Venusaur Lv50 High', 50, 'grass', 'poison', { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 });
      const mewtwoLv100 = createTestPokemon('m1', 'mewtwo', 'Mewtwo', 100, 'psychic'); // illegal type

      const pool = [blastoiseLv30, charizardLv50LowIvs, venusaurLv50HighIvs, mewtwoLv100];
      const result = autoFillLegalTeamForTheme(pool, weather, 2);

      expect(result).toHaveLength(2);
      expect(result[0]?.uid).toBe('v1'); // highest level + highest IVs
      expect(result[1]?.uid).toBe('c1'); // level 50
    });

    it('assembles a coherent monotype team sharing a common elemental type for monotype_clash', () => {
      const monotype = getSeasonalThemeConfig('monotype_clash');
      // Fire team candidates
      const charizard = createTestPokemon('f1', 'charizard', 'Charizard', 50, 'fire', 'flying');
      const arcanine = createTestPokemon('f2', 'arcanine', 'Arcanine', 50, 'fire');
      const ninetales = createTestPokemon('f3', 'ninetales', 'Ninetales', 45, 'fire');
      // Water team candidate (only 1)
      const blastoise = createTestPokemon('w1', 'blastoise', 'Blastoise', 60, 'water');

      const pool = [blastoise, charizard, arcanine, ninetales];
      const result = autoFillLegalTeamForTheme(pool, monotype, 3);

      expect(result).toHaveLength(3);
      // Even though Blastoise has higher level (60), it cannot form a 3-member monotype team with Fire mons
      expect(result.map(p => p.uid)).toEqual(['f1', 'f2', 'f3']);
    });
  });
});
