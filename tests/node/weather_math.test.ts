/**
 * tests/node/weather_math.test.ts
 *
 * NATIVE NODE.JS TEST (Node.js 26+)
 *
 * Tests pure weather and day-cycle math from src/logic/weather/weatherMath.ts.
 * Zero mocks required — all data is passed inline.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  mulberry32,
  hashString,
  getDayCyclePure,
  getRouteWeatherPure,
  getSessionWeatherSeed,
  getWeatherAnimSeed,
  type WeatherTable,
} from '../../src/logic/weather/weatherMath.ts';

// ── Inline test data (replaces vi.mock('@/data/weather-tables')) ──────────────

const TEST_TABLES: WeatherTable = {
  test_route: {
    spring: {
      morning: { fog: 100 },
      day:     { clear: 100 },
      dusk:    { storm: 100 },
      night:   { clear: 100 },
    },
    summer: {
      morning: { clear: 100 },
      day:     { heatwave: 100 },
      dusk:    { clear: 100 },
      night:   { clear: 100 },
    },
  },
  bad_route: {
    spring: {
      morning: { clear: 10, rain: 10 }, // doesn't sum to 100
    },
  },
};

// ── mulberry32 ────────────────────────────────────────────────────────────────

describe('mulberry32 PRNG', () => {
  it('should generate deterministic values from the same seed', () => {
    const prng1 = mulberry32(12345);
    const prng2 = mulberry32(12345);
    assert.strictEqual(prng1(), prng2());
    assert.strictEqual(prng1(), prng2());
  });

  it('should generate values in [0, 1)', () => {
    const prng = mulberry32(9999);
    for (let i = 0; i < 200; i++) {
      const val = prng();
      assert.ok(val >= 0 && val < 1, `Expected [0,1) but got ${val}`);
    }
  });

  it('different seeds should produce different sequences', () => {
    assert.notStrictEqual(mulberry32(1)(), mulberry32(2)());
  });
});

// ── hashString ────────────────────────────────────────────────────────────────

describe('hashString', () => {
  it('should be deterministic', () => {
    assert.strictEqual(hashString('route1'), hashString('route1'));
  });

  it('different inputs produce different hashes', () => {
    assert.notStrictEqual(hashString('route1'), hashString('route2'));
  });

  it('returns an unsigned 32-bit number', () => {
    const h = hashString('test');
    assert.ok(h >= 0 && h <= 4294967295);
  });
});

// ── getDayCyclePure ───────────────────────────────────────────────────────────

describe('getDayCyclePure', () => {
  // epoch 0 = 1970-01-01T00:00:00Z → totalHours=0 → phase 0 → morning
  it('phase 0 → morning', () => assert.strictEqual(getDayCyclePure(0), 'morning'));
  // 2h epoch → phase 2 → day
  it('phase 2 → day', () => assert.strictEqual(getDayCyclePure(2 * 3600 * 1000), 'day'));
  // 4h → phase 4 → dusk
  it('phase 4 → dusk', () => assert.strictEqual(getDayCyclePure(4 * 3600 * 1000), 'dusk'));
  // 6h → phase 6 → night
  it('phase 6 → night', () => assert.strictEqual(getDayCyclePure(6 * 3600 * 1000), 'night'));
  // 8h → wraps back to morning
  it('phase 8 (wraps) → morning', () => assert.strictEqual(getDayCyclePure(8 * 3600 * 1000), 'morning'));
});

// ── getRouteWeatherPure ───────────────────────────────────────────────────────

describe('getRouteWeatherPure', () => {
  it('returns clear for unknown route', () => {
    assert.strictEqual(getRouteWeatherPure(TEST_TABLES, 'unknown_route', 'spring', 0), 'clear');
  });

  it('returns clear for unknown season', () => {
    assert.strictEqual(getRouteWeatherPure(TEST_TABLES, 'test_route', 'winter', 0), 'clear');
  });

  it('is deterministic for same inputs', () => {
    const a = getRouteWeatherPure(TEST_TABLES, 'test_route', 'spring', 5000);
    const b = getRouteWeatherPure(TEST_TABLES, 'test_route', 'spring', 5000);
    assert.strictEqual(a, b);
  });

  it('returns fog at morning for spring/test_route (100% table)', () => {
    // epochHour=0 → phase 0 → morning
    assert.strictEqual(getRouteWeatherPure(TEST_TABLES, 'test_route', 'spring', 0), 'fog');
  });

  it('returns clear at day for spring/test_route', () => {
    // epochHour=2 → phase 2 → day
    assert.strictEqual(getRouteWeatherPure(TEST_TABLES, 'test_route', 'spring', 2), 'clear');
  });

  it('returns storm at dusk for spring/test_route', () => {
    // epochHour=4 → phase 4 → dusk
    assert.strictEqual(getRouteWeatherPure(TEST_TABLES, 'test_route', 'spring', 4), 'storm');
  });

  it('returns heatwave at day for summer/test_route', () => {
    // epochHour=2 → phase 2 → day
    assert.strictEqual(getRouteWeatherPure(TEST_TABLES, 'test_route', 'summer', 2), 'heatwave');
  });

  it('handles bad probability tables (probabilities < 100) gracefully', () => {
    const weather = getRouteWeatherPure(TEST_TABLES, 'bad_route', 'spring', 0);
    assert.ok(typeof weather === 'string', 'Should return a string');
  });
});

// ── getWeatherAnimSeed & getSessionWeatherSeed ───────────────────────────────

describe('getWeatherAnimSeed & getSessionWeatherSeed', () => {
  it('getSessionWeatherSeed returns a numeric seed', () => {
    const seed = getSessionWeatherSeed();
    assert.strictEqual(typeof seed, 'number');
    assert.ok(seed >= 0 && seed <= 1000);
  });

  it('getWeatherAnimSeed returns a value between 0 and 1', () => {
    const seed = getWeatherAnimSeed('route1');
    assert.ok(seed >= 0 && seed <= 1);
  });

  it('getWeatherAnimSeed is deterministic for same route', () => {
    const seed1 = getWeatherAnimSeed('route1');
    const seed2 = getWeatherAnimSeed('route1');
    assert.strictEqual(seed1, seed2);
  });

  it('getWeatherAnimSeed is different for different routes', () => {
    const seed1 = getWeatherAnimSeed('route1');
    const seed2 = getWeatherAnimSeed('route2');
    assert.notStrictEqual(seed1, seed2);
  });
});

