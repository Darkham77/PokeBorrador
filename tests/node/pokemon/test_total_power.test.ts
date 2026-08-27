import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { calculateEvBonusIvs, EVS_PER_STAT_POINT } from '@/logic/pokemon/evMath';
import { calculateTotalPower } from '@/logic/pokemon/pokemonUtils';
import { filterAndSortPokemon, getPokemonTotalPower } from '@/logic/pokemon/pokemonSelectionFilter';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('Total Power (TOT / TOTAL) & EV Bonus IV Calculation', () => {
  it('EVS_PER_STAT_POINT constant is 4', () => {
    assert.strictEqual(EVS_PER_STAT_POINT, 4);
  });

  describe('calculateEvBonusIvs', () => {
    it('returns 0 when EVs are null, undefined or empty', () => {
      assert.strictEqual(calculateEvBonusIvs(null), 0);
      assert.strictEqual(calculateEvBonusIvs(undefined), 0);
      assert.strictEqual(calculateEvBonusIvs({}), 0);
      assert.strictEqual(calculateEvBonusIvs({ hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }), 0);
    });

    it('calculates floor(ev / 4) per stat and sums them up', () => {
      // 3 HP -> 0, 7 Atk -> 1, 8 Def -> 2, 0 SpA -> 0, 252 SpD -> 63, 255 Spe -> 63
      const evs = { hp: 3, atk: 7, def: 8, spa: 0, spd: 252, spe: 255 };
      const expected = 0 + 1 + 2 + 0 + 63 + 63; // 129
      assert.strictEqual(calculateEvBonusIvs(evs), expected);
    });

    it('yields exactly 127 IV-equivalent points for a standard 252/252/4 spread', () => {
      const competitiveEvs = { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 };
      assert.strictEqual(calculateEvBonusIvs(competitiveEvs), 127);
    });
  });

  describe('calculateTotalPower', () => {
    it('returns 0 for null/undefined pokemon', () => {
      assert.strictEqual(calculateTotalPower(null as unknown as Pokemon), 0);
      assert.strictEqual(calculateTotalPower(undefined as unknown as Pokemon), 0);
    });

    it('computes BST + Total IVs + EV Bonus IVs correctly for Pikachu', () => {
      // Pikachu BST: HP 35 + Atk 55 + Def 40 + SpA 50 + SpD 50 + Spe 90 = 320
      const untrainedPikachu: Pokemon = {
        uid: 'pika-untrained',
        id: 'pikachu',
        species: 'pikachu',
        name: 'Pikachu',
        level: 50,
        hp: 100,
        maxHp: 100,
        type: 'Electric',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, // 186
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
      } as unknown as Pokemon;

      const trainedPikachu: Pokemon = {
        uid: 'pika-trained',
        id: 'pikachu',
        species: 'pikachu',
        name: 'Pikachu',
        level: 50,
        hp: 100,
        maxHp: 100,
        type: 'Electric',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 }, // 186
        evs: { hp: 4, atk: 252, def: 0, spa: 0, spd: 0, spe: 252 } // 127
      } as unknown as Pokemon;

      const untrainedScore = calculateTotalPower(untrainedPikachu);
      const trainedScore = calculateTotalPower(trainedPikachu);

      assert.strictEqual(untrainedScore, 320 + 186); // 506
      assert.strictEqual(trainedScore, 320 + 186 + 127); // 633
      assert.ok(trainedScore > untrainedScore);
      assert.strictEqual(trainedScore - untrainedScore, 127);
    });

    it('getPokemonTotalPower delegates to calculateTotalPower', () => {
      const poke: Pokemon = {
        uid: 'pika-1',
        id: 'pikachu',
        species: 'pikachu',
        name: 'Pikachu',
        level: 50,
        ivs: { hp: 10, atk: 10, def: 10, spa: 10, spd: 10, spe: 10 },
        evs: { hp: 40, atk: 40, def: 0, spa: 0, spd: 0, spe: 0 }
      } as unknown as Pokemon;

      assert.strictEqual(getPokemonTotalPower(poke), calculateTotalPower(poke));
    });
  });

  describe('filterAndSortPokemon - TOT Sorting with EVs', () => {
    it('ranks trained pokemon higher than untrained pokemon when sorting by TOT in desc order', () => {
      const untrained: Pokemon = {
        uid: 'u-1',
        id: 'pikachu',
        species: 'pikachu',
        name: 'Pikachu',
        level: 50,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
      } as unknown as Pokemon;

      const trained: Pokemon = {
        uid: 'u-2',
        id: 'pikachu',
        species: 'pikachu',
        name: 'Pikachu',
        level: 50,
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4 }
      } as unknown as Pokemon;

      const list = [
        { pokemon: untrained, _source: 'team' as const, index: 0 },
        { pokemon: trained, _source: 'team' as const, index: 1 }
      ];

      const sorted = filterAndSortPokemon(list, {
        searchQuery: '',
        sortBy: 'TOT',
        sortOrder: 'desc',
        activeTags: []
      });

      assert.strictEqual(sorted[0]?.pokemon.uid, 'u-2'); // Trained is first
      assert.strictEqual(sorted[1]?.pokemon.uid, 'u-1'); // Untrained is second
    });
  });
});
