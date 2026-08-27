import { test, describe } from 'vitest';
import assert from 'node:assert';
import {
  hashStringTo32Bit,
  createMulberry32,
  generateGaussianNormalized,
  generateGaussianPhysicalDimensionPure,
  getPhysicalDimensionTier,
  calculateInstancePhysicalData,
  getPokemonPhysicalWeight,
  getPokemonPhysicalHeight,
  DEFAULT_SPECIES_RANGE_VARIATION_FACTOR
} from '../../../src/logic/pokemon/physicalDimensionsMath.ts';
import type { Pokemon } from '../../../src/types/pokemon/pokemon.ts';

describe('Pokémon Physical Dimensions Gaussian Math & Tiers', () => {

  test('Deterministic Hash & PRNG: same seed always yields identical numbers', () => {
    const seed1 = 'poke-uid-12345-h';
    const seed2 = 'poke-uid-12345-h';
    
    const hash1 = hashStringTo32Bit(seed1);
    const hash2 = hashStringTo32Bit(seed2);
    assert.strictEqual(hash1, hash2);

    const prng1 = createMulberry32(hash1);
    const prng2 = createMulberry32(hash2);

    for (let i = 0; i < 10; i++) {
      assert.strictEqual(prng1(), prng2());
    }
  });

  test('Independence: height seed ("h") and weight seed ("w") yield different values', () => {
    const uid = 'pokemon-charizard-001';
    const heightVal = generateGaussianPhysicalDimensionPure(uid + 'h', 1.7);
    const weightVal = generateGaussianPhysicalDimensionPure(uid + 'w', 90.5);

    // Normalized ratios to base
    const ratioH = heightVal / 1.7;
    const ratioW = weightVal / 90.5;

    assert.notStrictEqual(ratioH, ratioW, 'Height and weight ratios must not be identical');
  });

  test('Bounds Enforced: values never exceed the +/- 15% range', () => {
    const base = 2.0;
    const minExpected = base * (1 - DEFAULT_SPECIES_RANGE_VARIATION_FACTOR); // 1.7
    const maxExpected = base * (1 + DEFAULT_SPECIES_RANGE_VARIATION_FACTOR); // 2.3

    for (let i = 0; i < 500; i++) {
      const val = generateGaussianPhysicalDimensionPure(`random-uid-${i}`, base);
      assert.ok(val >= minExpected, `Value ${val} should be >= ${minExpected}`);
      assert.ok(val <= maxExpected, `Value ${val} should be <= ${maxExpected}`);
    }
  });

  test('Gaussian Bell Curve Statistical Properties (N = 10,000 samples)', () => {
    const SAMPLE_COUNT = 10000;
    let sum = 0;
    let countTierM = 0;
    let countTierExtreme = 0; // XXS + XXL

    for (let i = 0; i < SAMPLE_COUNT; i++) {
      const prng = createMulberry32(i + 1000);
      const norm = generateGaussianNormalized(prng); // [0, 1) centered at 0.5
      sum += norm;

      // In Irwin-Hall n=4, [0.4, 0.6] maps roughly to tier M / central distribution
      if (norm >= 0.416 && norm <= 0.583) {
        countTierM++;
      }
      // Extremes: < 0.1 or > 0.9
      if (norm < 0.1 || norm > 0.9) {
        countTierExtreme++;
      }
    }

    const mean = sum / SAMPLE_COUNT;
    // Mean must be very close to 0.5 (within 0.01 tolerance)
    assert.ok(Math.abs(mean - 0.5) < 0.01, `Mean ${mean} should be ~0.5`);

    // Bell curve concentration: central region should contain ~50% of the distribution
    const mRatio = countTierM / SAMPLE_COUNT;
    assert.ok(mRatio > 0.40 && mRatio < 0.65, `Central tier ratio ${mRatio} should be ~50%`);

    // Extreme rarity: tails (< 0.1 or > 0.9) should be very rare (< 1% total, vs 20% in uniform distribution)
    const extremeRatio = countTierExtreme / SAMPLE_COUNT;
    assert.ok(extremeRatio < 0.01, `Extreme tier ratio ${extremeRatio} must be < 1% in Gaussian distribution`);
  });

  test('Size Tier Classification (XXS to XXL)', () => {
    const base = 100.0;
    // XXS: < -12.5% -> < 87.5
    assert.strictEqual(getPhysicalDimensionTier(85, base).id, 'XXS');
    // XS: [-12.5%, -9%) -> [87.5, 91)
    assert.strictEqual(getPhysicalDimensionTier(89, base).id, 'XS');
    // S: [-9%, -6%) -> [91, 94)
    assert.strictEqual(getPhysicalDimensionTier(92, base).id, 'S');
    // M: [-6%, +6%] -> [94, 106]
    assert.strictEqual(getPhysicalDimensionTier(100, base).id, 'M');
    assert.strictEqual(getPhysicalDimensionTier(102.6, base).id, 'M'); // +2.6% is now M
    // L: (+6%, +9%] -> (106, 109]
    assert.strictEqual(getPhysicalDimensionTier(107, base).id, 'L');
    // XL: (+9%, +12.5%] -> (109, 112.5]
    assert.strictEqual(getPhysicalDimensionTier(111, base).id, 'XL');
    // XXL: > +12.5% -> > 112.5
    assert.strictEqual(getPhysicalDimensionTier(115, base).id, 'XXL');
  });

  test('calculateInstancePhysicalData produces consistent object and tooltip format', () => {
    const mockPokemon = {
      uid: 'test-pika-uid',
      id: 'pikachu'
    } as unknown as Pokemon;

    const mockSpecies = {
      height: 0.4,
      weight: 6.0
    };

    const data = calculateInstancePhysicalData(mockPokemon, mockSpecies);
    assert.ok(data !== null);
    assert.ok(typeof data.height === 'string');
    assert.ok(typeof data.weight === 'string');
    assert.ok(data.heightTooltip.includes('• Ejemplar:'));
    assert.ok(data.heightTooltip.includes('• Promedio especie:'));
    assert.ok(data.heightTooltip.includes('• Mínimo posible:'));
    assert.ok(data.heightTooltip.includes('• Máximo posible:'));
    assert.ok(data.weightTooltip.includes('• Ejemplar:'));
    assert.ok(data.weightTooltip.includes('• Mínimo posible:'));
    assert.ok(data.weightTooltip.includes('• Máximo posible:'));
  });

  test('Explicit height / weight on Pokemon overrides calculation', () => {
    const mockPokemon = {
      uid: 'custom-pika-uid',
      id: 'pikachu',
      height: 0.8, // 100% bigger (XXL)
      weight: 3.0  // 50% lighter (XXS)
    } as unknown as Pokemon;

    const mockSpecies = {
      height: 0.4,
      weight: 6.0
    };

    const data = calculateInstancePhysicalData(mockPokemon, mockSpecies);
    assert.ok(data !== null);
    assert.strictEqual(data.height, '0.8');
    assert.strictEqual(data.weight, '3.0');
    assert.strictEqual(data.heightTier.id, 'XXL');
    assert.strictEqual(data.weightTier.id, 'XXS');
  });

  test('getPokemonPhysicalWeight and getPokemonPhysicalHeight for sorting', () => {
    const p1 = {
      uid: 'p1',
      id: 'snorlax',
      weight: 460.0,
      height: 2.1
    } as unknown as Pokemon;

    const p2 = {
      uid: 'p2',
      id: 'pichu',
      weight: 2.0,
      height: 0.3
    } as unknown as Pokemon;

    const w1 = getPokemonPhysicalWeight(p1);
    const w2 = getPokemonPhysicalWeight(p2);
    const h1 = getPokemonPhysicalHeight(p1);
    const h2 = getPokemonPhysicalHeight(p2);

    assert.strictEqual(w1, 460.0);
    assert.strictEqual(w2, 2.0);
    assert.strictEqual(h1, 2.1);
    assert.strictEqual(h2, 0.3);
    assert.ok(w1 > w2);
    assert.ok(h1 > h2);
  });

  test('filterAndSortPokemon correctly sorts by weight and height in both directions', async () => {
    const { filterAndSortPokemon } = await import('../../../src/logic/pokemon/pokemonSelectionFilter.ts');

    const heavy = { uid: 'u-heavy', id: 'snorlax', weight: 460.0, height: 2.1 } as unknown as Pokemon;
    const light = { uid: 'u-light', id: 'pichu', weight: 2.0, height: 0.3 } as unknown as Pokemon;
    const mid = { uid: 'u-mid', id: 'pikachu', weight: 6.0, height: 0.4 } as unknown as Pokemon;

    const source = [
      { pokemon: light, _source: 'team' as const, index: 0 },
      { pokemon: heavy, _source: 'team' as const, index: 1 },
      { pokemon: mid, _source: 'team' as const, index: 2 }
    ];

    // Weight Descending
    const sortedWeightDesc = filterAndSortPokemon(source, {
      searchQuery: '',
      sortBy: 'weight',
      sortOrder: 'desc',
      activeTags: []
    });
    assert.strictEqual(sortedWeightDesc[0]?.pokemon.uid, 'u-heavy');
    assert.strictEqual(sortedWeightDesc[1]?.pokemon.uid, 'u-mid');
    assert.strictEqual(sortedWeightDesc[2]?.pokemon.uid, 'u-light');

    // Weight Ascending
    const sortedWeightAsc = filterAndSortPokemon(source, {
      searchQuery: '',
      sortBy: 'weight',
      sortOrder: 'asc',
      activeTags: []
    });
    assert.strictEqual(sortedWeightAsc[0]?.pokemon.uid, 'u-light');
    assert.strictEqual(sortedWeightAsc[1]?.pokemon.uid, 'u-mid');
    assert.strictEqual(sortedWeightAsc[2]?.pokemon.uid, 'u-heavy');

    // Height Descending
    const sortedHeightDesc = filterAndSortPokemon(source, {
      searchQuery: '',
      sortBy: 'height',
      sortOrder: 'desc',
      activeTags: []
    });
    assert.strictEqual(sortedHeightDesc[0]?.pokemon.uid, 'u-heavy');
    assert.strictEqual(sortedHeightDesc[1]?.pokemon.uid, 'u-mid');
    assert.strictEqual(sortedHeightDesc[2]?.pokemon.uid, 'u-light');
  });

});
