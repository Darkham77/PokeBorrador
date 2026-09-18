/**
 * tests/node/world/world_weather_and_spawn_integrity_suite.test.ts
 *
 * Consolidated Suite for Weather Math, Climate Biome Restrictions, Unique Weather Identity, and Spawn/Legendary Integrity.
 */

import { describe, it, test } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  mulberry32,
  hashString,
  getDayCyclePure,
  getRouteWeatherPure,
  getSessionWeatherSeed,
  getWeatherAnimSeed,
  type WeatherTable,
} from '../../../src/logic/weather/weatherMath.ts';
import { FIRE_RED_MAPS } from '../../../src/data/world/maps.ts';
import { ROUTE_WEATHER_TABLES } from '../../../src/data/world/weather-tables.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Extract BABY_POKEMON and LEGENDARY_POKEMON dynamically from pokedex.ts
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

const TEST_TABLES: WeatherTable = {
  route1: {
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
  route2: {
    spring: {
      morning: { clear: 10, rain: 10 },
    },
  },
};

const BANNED_INDOORS = [
  'sun', 'intense_sun', 
  'rain', 'heavy_rain', 'storm', 'thunderstorm', 
  'snow', 'hail', 'blizzard', 
  'wind', 'strong_winds', 
  'sandstorm', 'dust_storm'
];

const BANNED_CAVES = [
  'sun', 'intense_sun', 
  'rain', 'heavy_rain', 'storm', 'thunderstorm', 
  'snow', 'hail', 'blizzard', 
  'wind', 'strong_winds',
  'sandstorm', 'dust_storm'
];

const NIGHT_BANNED = ['sun', 'intense_sun'];

const BIOME_BANNED: Record<string, string[]> = {
  isCoastal: ['sandstorm', 'dust_storm', 'snow', 'hail', 'blizzard'],
  isForest: ['sandstorm', 'dust_storm'],
  isDesert: ['rain', 'heavy_rain', 'storm', 'thunderstorm', 'snow', 'hail', 'blizzard'],
  isUrban: ['blizzard', 'dust_storm'],
  isVolcanic: ['snow', 'hail', 'blizzard', 'rain', 'heavy_rain', 'storm', 'thunderstorm'],
  isArctic: ['sun', 'intense_sun', 'heatwave'],
  isMountain: []
};

interface MapData {
  id: string;
  name: string;
  isIndoors?: boolean;
  isCave?: boolean;
  [key: string]: unknown;
}

type WeatherCycleTable = Record<string, number>;
type CycleData = Record<string, WeatherCycleTable>;
type SeasonData = Record<string, CycleData>;
type LandmarkWeather = Record<string, SeasonData>;

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

describe('World Domain: Weather & Spawn Integrity Suite', () => {
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

  describe('getDayCyclePure', () => {
    it('phase 0 → morning', () => assert.strictEqual(getDayCyclePure(0), 'morning'));
    it('phase 2 → day', () => assert.strictEqual(getDayCyclePure(2 * 3600 * 1000), 'day'));
    it('phase 4 → dusk', () => assert.strictEqual(getDayCyclePure(4 * 3600 * 1000), 'dusk'));
    it('phase 6 → night', () => assert.strictEqual(getDayCyclePure(6 * 3600 * 1000), 'night'));
    it('phase 8 (wraps) → morning', () => assert.strictEqual(getDayCyclePure(8 * 3600 * 1000), 'morning'));
  });

  describe('getRouteWeatherPure', () => {
    it('returns clear for unknown route', () => {
      assert.strictEqual(getRouteWeatherPure(TEST_TABLES, 'route3', 'spring', 0), 'clear');
    });

    it('returns clear for unknown season', () => {
      assert.strictEqual(getRouteWeatherPure(TEST_TABLES, 'route1', 'winter', 0), 'clear');
    });

    it('is deterministic for same inputs', () => {
      const a = getRouteWeatherPure(TEST_TABLES, 'route1', 'spring', 5000);
      const b = getRouteWeatherPure(TEST_TABLES, 'route1', 'spring', 5000);
      assert.strictEqual(a, b);
    });

    it('returns fog at morning for spring/route1 (100% table)', () => {
      assert.strictEqual(getRouteWeatherPure(TEST_TABLES, 'route1', 'spring', 0), 'fog');
    });

    it('returns clear at day for spring/route1', () => {
      assert.strictEqual(getRouteWeatherPure(TEST_TABLES, 'route1', 'spring', 2), 'clear');
    });

    it('returns storm at dusk for spring/route1', () => {
      assert.strictEqual(getRouteWeatherPure(TEST_TABLES, 'route1', 'spring', 4), 'storm');
    });

    it('returns heatwave at day for summer/route1', () => {
      assert.strictEqual(getRouteWeatherPure(TEST_TABLES, 'route1', 'summer', 2), 'heatwave');
    });

    it('handles bad probability tables (probabilities < 100) gracefully', () => {
      const weather = getRouteWeatherPure(TEST_TABLES, 'route2', 'spring', 0);
      assert.ok(typeof weather === 'string', 'Should return a string');
    });
  });

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

  describe('Weather Integrity & Biome Restrictions', () => {
    (FIRE_RED_MAPS as unknown as MapData[]).forEach(map => {
      const mapId = map.id;
      const isIndoors = !!map.isIndoors;
      const isCave = !!map.isCave;
      
      const activeBiomes = Object.keys(BIOME_BANNED).filter(tag => !!map[tag]);
      const weatherData = (ROUTE_WEATHER_TABLES as LandmarkWeather)[mapId];

      if (!weatherData) return;

      describe(`Map: ${mapId} (${map.name})`, () => {
        Object.entries(weatherData).forEach(([season, seasonData]) => {
          describe(`Season: ${season}`, () => {
            Object.entries(seasonData).forEach(([cycle, table]) => {
              const weatherEntries = typeof table === 'object' ? Object.entries(table) : [];
              if (weatherEntries.length === 0) return;

              test(`Cycle: ${cycle} - should sum 100%`, () => {
                const total = weatherEntries.reduce((sum, [_, prob]) => sum + (prob as number), 0);
                assert.equal(total, 100, `Weather probabilities for ${mapId} in ${season}/${cycle} must sum 100% (got ${total}%)`);
              });

              test(`Cycle: ${cycle} - night restrictions`, () => {
                if (cycle === 'night') {
                  weatherEntries.forEach(([weather, prob]) => {
                    if ((prob as number) > 0) {
                      assert.ok(!NIGHT_BANNED.includes(weather), `Banned weather "${weather}" found at Night in ${mapId}`);
                    }
                  });
                }
              });

              if (isIndoors) {
                test(`Cycle: ${cycle} - indoor restrictions`, () => {
                  weatherEntries.forEach(([weather, prob]) => {
                    if ((prob as number) > 0) {
                      assert.ok(!BANNED_INDOORS.includes(weather), `Banned weather "${weather}" found inside Indoors map ${mapId} (${season}/${cycle})`);
                    }
                  });
                });
              } else if (isCave) {
                test(`Cycle: ${cycle} - cave restrictions`, () => {
                  weatherEntries.forEach(([weather, prob]) => {
                    if ((prob as number) > 0) {
                      assert.ok(!BANNED_CAVES.includes(weather), `Banned weather "${weather}" found inside Cave map ${mapId} (${season}/${cycle})`);
                    }
                  });
                });
              }

              activeBiomes.forEach(biomeTag => {
                test(`Cycle: ${cycle} - ${biomeTag} restrictions`, () => {
                  const bannedList = BIOME_BANNED[biomeTag] || [];
                  weatherEntries.forEach(([weather, prob]) => {
                    if ((prob as number) > 0) {
                      assert.ok(!bannedList.includes(weather), `Banned weather "${weather}" for biome ${biomeTag} found in map ${mapId} (${season}/${cycle})`);
                    }
                  });
                });
              });
            });
          });
        });

        test('Weather visitors and exclusives should not overlap with native spawns', () => {
          const nativeSpawns = new Set<string>();
          
          const wild = map.wild as Record<string, string[]> | undefined;
          if (wild) {
            Object.values(wild).forEach(list => {
              if (Array.isArray(list)) list.forEach(id => nativeSpawns.add(id));
            });
          }
          
          const fishing = map.fishing as { pool?: string[] } | undefined;
          if (fishing?.pool) {
            fishing.pool.forEach(id => nativeSpawns.add(id));
          }
          
          const archaeology = map.archaeology as { pool?: string[] } | undefined;
          if (archaeology?.pool) {
            assert.ok(Array.isArray(archaeology.pool));
            archaeology.pool.forEach(id => nativeSpawns.add(id));
          }

          const weather = map.weather as Record<string, { visitors?: Record<string, number> | string[], exclusive?: Record<string, number> | string[] }> | undefined;
          if (weather) {
            Object.entries(weather).forEach(([weatherType, cfg]) => {
              if (cfg.visitors) {
                const visitors = Array.isArray(cfg.visitors) ? cfg.visitors : Object.keys(cfg.visitors);
                visitors.forEach(v => {
                  assert.ok(!nativeSpawns.has(v), `Weather visitor "${v}" under weather "${weatherType}" in map "${map.id}" is already a native spawn (wild/fishing/archaeology) on this map.`);
                });
              }
              if (cfg.exclusive) {
                const exclusives = Array.isArray(cfg.exclusive) ? cfg.exclusive : Object.keys(cfg.exclusive);
                exclusives.forEach(e => {
                  assert.ok(!nativeSpawns.has(e), `Weather exclusive "${e}" under weather "${weatherType}" in map "${map.id}" is already a native spawn (wild/fishing/archaeology) on this map.`);
                });
              }
            });
          }
        });

        test('Castform weather integration validation', () => {
          if (isIndoors || isCave) {
            const weather = map.weather as Record<string, { visitors?: Record<string, number> | string[], exclusive?: Record<string, number> | string[] }> | undefined;
            if (weather) {
              Object.entries(weather).forEach(([weatherType, cfg]) => {
                const hasCastformInVisitors = cfg.visitors ? (
                  Array.isArray(cfg.visitors) ? cfg.visitors.includes('castform') : 'castform' in cfg.visitors
                ) : false;
                const hasCastformInExclusives = cfg.exclusive ? (
                  Array.isArray(cfg.exclusive) ? cfg.exclusive.includes('castform') : 'castform' in cfg.exclusive
                ) : false;
                assert.ok(!hasCastformInVisitors, `Castform must not be present as visitor in indoors/cave map ${map.id} under weather "${weatherType}"`);
                assert.ok(!hasCastformInExclusives, `Castform must not be present as exclusive in indoors/cave map ${map.id} under weather "${weatherType}"`);
              });
            }
            return;
          }

          const weather = map.weather as Record<string, { visitors?: Record<string, number> | string[], exclusive?: Record<string, number> | string[] }> | undefined;
          if (!weather) return;

          Object.entries(weather).forEach(([weatherType, cfg]) => {
            const isExclusiveWeather = ['rain', 'storm', 'thunderstorm', 'heavy_rain', 'hail', 'blizzard'].includes(weatherType);
            const isVisitorWeather = ['sun', 'intense_sun', 'snow', 'cold'].includes(weatherType);
            if (!isExclusiveWeather && !isVisitorWeather) return;

            const hasCastformInVisitors = cfg.visitors ? (
              Array.isArray(cfg.visitors) ? cfg.visitors.includes('castform') : 'castform' in cfg.visitors
            ) : false;

            const hasCastformInExclusives = cfg.exclusive ? (
              Array.isArray(cfg.exclusive) ? cfg.exclusive.includes('castform') : 'castform' in cfg.exclusive
            ) : false;

            if (isExclusiveWeather) {
              assert.ok(hasCastformInExclusives, `Castform must be present as exclusive in rain/hail weather "${weatherType}" on map ${map.id}`);
              assert.ok(!hasCastformInVisitors, `Castform must not be visitor in rain/hail weather "${weatherType}" on map ${map.id}`);
            } else if (isVisitorWeather) {
              let isSunnyAtNight = false;
              if (weatherType === 'sun' || weatherType === 'intense_sun') {
                const weatherData = (ROUTE_WEATHER_TABLES as unknown as LandmarkWeather)[mapId];
                if (weatherData) {
                  Object.values(weatherData).forEach((seasonData) => {
                    const nightTable = (seasonData as CycleData)['night'];
                    if (nightTable && typeof nightTable === 'object' && nightTable[weatherType] !== undefined && (nightTable[weatherType] as unknown as number) > 0) {
                      isSunnyAtNight = true;
                    }
                  });
                }
              }

              if (isSunnyAtNight) {
                assert.ok(!hasCastformInVisitors, `Castform must not be present as visitor in sunny weather "${weatherType}" because it can occur at night on map ${map.id}`);
                assert.ok(!hasCastformInExclusives, `Castform must not be present as exclusive in sunny weather "${weatherType}" because it can occur at night on map ${map.id}`);
              } else {
                assert.ok(hasCastformInVisitors, `Castform must be present as visitor in sun/snow weather "${weatherType}" on map ${map.id}`);
                assert.ok(!hasCastformInExclusives, `Castform must not be exclusive in sun/snow weather "${weatherType}" on map ${map.id}`);
              }
            }
          });
        });
      });
    });
  });

  describe('Weather Tables Unique Identity Integrity', () => {
    test('should ensure that no two maps have identical weather probability configurations across all seasons and cycles', () => {
      const mapConfigs = new Map<string, string>();

      Object.entries(ROUTE_WEATHER_TABLES).forEach(([mapId, seasonsData]) => {
        const serialized = JSON.stringify(seasonsData);
        
        if (mapConfigs.has(serialized)) {
          const duplicateMapId = mapConfigs.get(serialized);
          assert.fail(`Map "${mapId}" has an identical weather table configuration as map "${duplicateMapId}". Weather configs must be distinct to respect atmospheric identity.`);
        }
        
        mapConfigs.set(serialized, mapId);
      });
    });
  });

  describe('Spawn Integrity - No Babies in the Wild', () => {
    typedMaps.forEach(map => {
      describe(`Map: ${map.id} (${map.name})`, () => {
        if (map.wild) {
          Object.entries(map.wild).forEach(([cycle, pool]) => {
            test(`cycle "${cycle}" wild pool contains no baby Pokemon`, () => {
              pool.forEach(id => {
                assert.ok(!babySet.has(id), `Baby Pokemon "${id}" found in wild.${cycle} spawn table of "${map.id}"`);
              });
            });
          });
        }

        if (map.fishing?.pool) {
          test('fishing pool contains no baby Pokemon', () => {
            map.fishing!.pool.forEach(id => {
              assert.ok(!babySet.has(id), `Baby Pokemon "${id}" found in fishing pool of "${map.id}"`);
            });
          });
        }

        if (map.archaeology?.pool) {
          test('archaeology pool contains no baby Pokemon', () => {
            map.archaeology!.pool.forEach(id => {
              assert.ok(!babySet.has(id), `Baby Pokemon "${id}" found in archaeology pool of "${map.id}"`);
            });
          });
        }

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

  describe('Spawn Integrity - Legendary Probabilities capped at 1%', () => {
    typedMaps.forEach(map => {
      if (!map.wild) return;

      describe(`Map: ${map.id} (${map.name})`, () => {
        const cycles = ['morning', 'day', 'night'];
        const weathers = ['clear', ...(map.weather ? Object.keys(map.weather) : [])];

        cycles.forEach(cycle => {
          weathers.forEach(weather => {
            test(`final legendary spawn rate does not exceed 1% in cycle "${cycle}" under weather "${weather}"`, () => {
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

              simulateClampLegendaryRates(pool, rates);

              const totalRate = rates.reduce((sum, r) => sum + r, 0);
              pool.forEach((id, idx) => {
                if (legendarySet.has(id)) {
                  const prob = totalRate > 0 ? rates[idx]! / totalRate : 0;
                  assert.ok(
                    prob <= 0.0101,
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
});
