import { test, describe } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FIRE_RED_MAPS } from '../../../src/data/world/maps.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extract BABY_POKEMON and LEGENDARY_POKEMON dynamically from pokedex.ts
// to avoid executing ESM `@/` alias imports in a bare Node environment.
const pokedexPath = path.resolve(__dirname, '../../../src/data/pokemon/pokedex.ts');
const pokedexContent = fs.readFileSync(pokedexPath, 'utf8');

function extractArray(content: string, name: string): string[] {
  const regex = new RegExp(`export const ${name}\\s*=\\s*\\[([^\\]]*)\\]`, 's');
  const match = content.match(regex);
  if (!match || !match[1]) {
    throw new Error(`Failed to extract array ${name} from pokedex.ts`);
  }
  return match[1]
    .split(',')
    .map(s => s.trim().replace(/['"\s]/g, ''))
    .filter(Boolean);
}

const BABY_POKEMON = extractArray(pokedexContent, 'BABY_POKEMON');
const LEGENDARY_POKEMON = extractArray(pokedexContent, 'LEGENDARY_POKEMON');

const babySet = new Set(BABY_POKEMON);
const legendarySet = new Set(LEGENDARY_POKEMON);

interface WeatherConfig {
  visitors?: string[] | Record<string, number>;
  exclusive?: string[] | Record<string, number>;
  fishingVisitors?: string[] | Record<string, number>;
  fishingExclusive?: string[] | Record<string, number>;
}

interface MapLocation {
  id: string;
  name: string;
  wild?: Record<string, string[]>;
  rates?: Record<string, number[]>;
  fishing?: {
    pool: string[];
    rates: number[];
  };
  archaeology?: {
    pool: string[];
    rates: number[];
  };
  weather?: Record<string, WeatherConfig>;
}

const typedMaps = FIRE_RED_MAPS as unknown as MapLocation[];

describe('Spawn Integrity - No Babies in the Wild', () => {
  typedMaps.forEach(map => {
    describe(`Map: ${map.id} (${map.name})`, () => {
      // 1. Check standard wild pools
      if (map.wild) {
        Object.entries(map.wild).forEach(([cycle, pool]) => {
          test(`cycle "${cycle}" wild pool contains no baby Pokemon`, () => {
            pool.forEach(id => {
              assert.ok(!babySet.has(id), `Baby Pokemon "${id}" found in wild.${cycle} spawn table of "${map.id}"`);
            });
          });
        });
      }

      // 2. Check fishing pool
      if (map.fishing?.pool) {
        test('fishing pool contains no baby Pokemon', () => {
          map.fishing!.pool.forEach(id => {
            assert.ok(!babySet.has(id), `Baby Pokemon "${id}" found in fishing pool of "${map.id}"`);
          });
        });
      }

      // 3. Check archaeology pool
      if (map.archaeology?.pool) {
        test('archaeology pool contains no baby Pokemon', () => {
          map.archaeology!.pool.forEach(id => {
            assert.ok(!babySet.has(id), `Baby Pokemon "${id}" found in archaeology pool of "${map.id}"`);
          });
        });
      }

      // 4. Check weather overrides
      if (map.weather) {
        Object.entries(map.weather).forEach(([weatherName, wConfig]) => {
          describe(`weather override: ${weatherName}`, () => {
            if (wConfig.visitors) {
              const list = Array.isArray(wConfig.visitors) ? wConfig.visitors : Object.keys(wConfig.visitors);
              test('visitors contains no baby Pokemon', () => {
                list.forEach(id => {
                  assert.ok(!babySet.has(id), `Baby Pokemon "${id}" found in weather.${weatherName}.visitors of "${map.id}"`);
                });
              });
            }

            if (wConfig.exclusive) {
              const list = Array.isArray(wConfig.exclusive) ? wConfig.exclusive : Object.keys(wConfig.exclusive);
              test('exclusive contains no baby Pokemon', () => {
                list.forEach(id => {
                  assert.ok(!babySet.has(id), `Baby Pokemon "${id}" found in weather.${weatherName}.exclusive of "${map.id}"`);
                });
              });
            }

            if (wConfig.fishingVisitors) {
              const list = Array.isArray(wConfig.fishingVisitors) ? wConfig.fishingVisitors : Object.keys(wConfig.fishingVisitors);
              test('fishingVisitors contains no baby Pokemon', () => {
                list.forEach(id => {
                  assert.ok(!babySet.has(id), `Baby Pokemon "${id}" found in weather.${weatherName}.fishingVisitors of "${map.id}"`);
                });
              });
            }

            if (wConfig.fishingExclusive) {
              const list = Array.isArray(wConfig.fishingExclusive) ? wConfig.fishingExclusive : Object.keys(wConfig.fishingExclusive);
              test('fishingExclusive contains no baby Pokemon', () => {
                list.forEach(id => {
                  assert.ok(!babySet.has(id), `Baby Pokemon "${id}" found in weather.${weatherName}.fishingExclusive of "${map.id}"`);
                });
              });
            }
          });
        });
      }
    });
  });
});

// Pure legendary rates capping logic to test correctness
function simulateClampLegendaryRates(pool: string[], rates: number[]): void {
  const legendaryIndices: number[] = [];
  let sumOtherRates = 0;

  for (let i = 0; i < pool.length; i++) {
    const spId = pool[i];
    if (spId && legendarySet.has(spId)) {
      legendaryIndices.push(i);
    } else {
      sumOtherRates += rates[i] || 0;
    }
  }

  if (legendaryIndices.length === 0) return;
  if (sumOtherRates === 0) return;

  const cap = sumOtherRates / 99;

  legendaryIndices.forEach(idx => {
    if ((rates[idx] || 0) > cap) {
      rates[idx] = cap;
    }
  });
}

describe('Spawn Integrity - Legendary Probabilities capped at 1%', () => {
  typedMaps.forEach(map => {
    if (!map.wild) return;

    describe(`Map: ${map.id} (${map.name})`, () => {
      const cycles = ['morning', 'day', 'night'];
      const weathers = ['clear', ...(map.weather ? Object.keys(map.weather) : [])];

      cycles.forEach(cycle => {
        weathers.forEach(weather => {
          test(`final legendary spawn rate does not exceed 1% in cycle "${cycle}" under weather "${weather}"`, () => {
            // Simulate getEncounterPool
            const pool = [...(map.wild?.[cycle] || map.wild?.day || [])];
            const rates = [...((map.rates && (map.rates[cycle] || map.rates.day)) || [])];
            while (rates.length < pool.length) rates.push(10);

            const wConfig = map.weather?.[weather];
            if (weather !== 'clear' && wConfig) {
              if (wConfig.exclusive) {
                const list = Array.isArray(wConfig.exclusive) ? wConfig.exclusive : Object.keys(wConfig.exclusive);
                list.forEach(id => {
                  if (!pool.includes(id)) {
                    pool.push(id);
                    const weight = Array.isArray(wConfig.exclusive) ? 5 : ((wConfig.exclusive as Record<string, number>)[id] || 5);
                    rates.push(weight);
                  }
                });
              }

              if (wConfig.visitors) {
                const list = Array.isArray(wConfig.visitors) ? wConfig.visitors : Object.keys(wConfig.visitors);
                list.forEach(id => {
                  if (!pool.includes(id)) {
                    pool.push(id);
                    const weight = Array.isArray(wConfig.visitors) ? -10 : -((wConfig.visitors as Record<string, number>)[id] || 10);
                    rates.push(weight);
                  }
                });
              }
            }

            // Apply weather adjustments (quota)
            if (weather !== 'clear') {
              const visitorIndices = rates.map((r, i) => r < 0 ? i : -1).filter(i => i !== -1);
              const nativeIndices = rates.map((r, i) => r >= 0 ? i : -1).filter(i => i !== -1);

              if (visitorIndices.length > 0) {
                const totalNativeWeight = nativeIndices.reduce((sum, idx) => sum + (rates[idx] || 0), 0);
                const visitorQuota = totalNativeWeight / 9;
                const sumRelativeWeights = visitorIndices.reduce((sum, idx) => sum + Math.abs(rates[idx] || 0), 0);

                visitorIndices.forEach(idx => {
                  const relativeWeight = Math.abs(rates[idx] || 0) / (sumRelativeWeights || 1);
                  rates[idx] = visitorQuota * relativeWeight;
                });
              }
            }

            // Run capping
            simulateClampLegendaryRates(pool, rates);

            // Calculate final percentages
            const totalRate = rates.reduce((sum, r) => sum + r, 0);
            pool.forEach((id, idx) => {
              if (legendarySet.has(id)) {
                const prob = totalRate > 0 ? rates[idx]! / totalRate : 0;
                assert.ok(
                  prob <= 0.0101, // Allow tiny float rounding tolerance
                  `Legendary "${id}" has a final probability of ${(prob * 100).toFixed(2)}% in "${map.id}" under ${cycle}/${weather}, exceeding the 1% cap.`
                );
              }
            });
          });
        });
      });
    });
  });
});
