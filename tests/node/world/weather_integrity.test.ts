import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FIRE_RED_MAPS } from '../../../src/data/world/maps.ts';
import { ROUTE_WEATHER_TABLES } from '../../../src/data/world/weather-tables.ts';


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
  isMountain: [] // heatwave handled separately if needed
};

interface MapData {
  id: string;
  name: string;
  isIndoors?: boolean;
  isCave?: boolean;
  [key: string]: unknown;
}

type WeatherTable = Record<string, number>;
type CycleData = Record<string, WeatherTable>;
type SeasonData = Record<string, CycleData>;
type LandmarkWeather = Record<string, SeasonData>;

const TYPED_MAPS = FIRE_RED_MAPS as unknown as MapData[];
const TYPED_WEATHER = ROUTE_WEATHER_TABLES as unknown as LandmarkWeather;

describe('Weather Integrity & Biome Restrictions', () => {
  TYPED_MAPS.forEach(map => {
    const mapId = map.id;
    const isIndoors = !!map.isIndoors;
    const isCave = !!map.isCave;
    
    // Extract all biome tags from the map object
    const activeBiomes = Object.keys(BIOME_BANNED).filter(tag => !!map[tag]);

    const weatherData = TYPED_WEATHER[mapId];

    if (!weatherData) return;

    describe(`Map: ${mapId} (${map.name})`, () => {
      Object.entries(weatherData).forEach(([season, seasonData]) => {
        describe(`Season: ${season}`, () => {
          Object.entries(seasonData).forEach(([cycle, table]) => {
            // Landmark tables are nested by cycle (morning, day, dusk, night)
            // or sometimes they are flat (rarely in this project's structure)
            
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

            // Biome-specific restrictions
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

      // Verify that weather visitors or exclusives do not overlap with normal/native spawns of the same route
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

      // Validar las reglas climáticas de Castform específicas si la ruta tiene configurado clima
      test('Castform weather integration validation', () => {
        // 1. Castform no debe aparecer en interiores o cuevas
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
          const isExclusiveWeather = ['rain', 'storm', 'thunderstorm', 'heavy_rain', 'hail', 'blizzard', 'coldwave'].includes(weatherType);
          const isVisitorWeather = ['sun', 'intense_sun', 'snow', 'cold'].includes(weatherType);
          if (!isExclusiveWeather && !isVisitorWeather) return;

          const hasCastformInVisitors = cfg.visitors ? (
            Array.isArray(cfg.visitors) ? cfg.visitors.includes('castform') : 'castform' in cfg.visitors
          ) : false;

          const hasCastformInExclusives = cfg.exclusive ? (
            Array.isArray(cfg.exclusive) ? cfg.exclusive.includes('castform') : 'castform' in cfg.exclusive
          ) : false;

          if (isExclusiveWeather) {
            // En clima severo/lluvia Castform debe ser exclusivo obligatoriamente
            assert.ok(hasCastformInExclusives, `Castform must be present as exclusive in rain/hail weather "${weatherType}" on map ${map.id}`);
            assert.ok(!hasCastformInVisitors, `Castform must not be visitor in rain/hail weather "${weatherType}" on map ${map.id}`);
          } else if (isVisitorWeather) {
            // Verificamos si es un clima soleado y si es posible por la noche en este mapa
            let isSunnyAtNight = false;
            if (weatherType === 'sun' || weatherType === 'intense_sun') {
              const weatherData = TYPED_WEATHER[mapId];
              if (weatherData) {
                Object.values(weatherData).forEach(seasonData => {
                  const nightTable = seasonData['night'];
                  if (nightTable && nightTable?.[weatherType] !== undefined && nightTable[weatherType] > 0) {
                    isSunnyAtNight = true;
                  }
                });
              }
            }

            if (isSunnyAtNight) {
              // Si es posible de noche, Castform NO debe estar para evitar aparecer en forma soleado de noche
              assert.ok(!hasCastformInVisitors, `Castform must not be present as visitor in sunny weather "${weatherType}" because it can occur at night on map ${map.id}`);
              assert.ok(!hasCastformInExclusives, `Castform must not be present as exclusive in sunny weather "${weatherType}" because it can occur at night on map ${map.id}`);
            } else {
              // En sol/nieve normal Castform debe ser visitante obligatoriamente
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
    const mapConfigs = new Map<string, string>(); // serialized weather -> mapId

    Object.entries(ROUTE_WEATHER_TABLES).forEach(([mapId, seasonsData]) => {
      // Serialize weather config to identify identical copies
      const serialized = JSON.stringify(seasonsData);
      
      if (mapConfigs.has(serialized)) {
        const duplicateMapId = mapConfigs.get(serialized);
        assert.fail(`Map "${mapId}" has an identical weather table configuration as map "${duplicateMapId}". Weather configs must be distinct to respect atmospheric identity.`);
      }
      
      mapConfigs.set(serialized, mapId);
    });
  });
});


