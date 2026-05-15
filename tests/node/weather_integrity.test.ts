import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { FIRE_RED_MAPS } from '../../src/data/maps.ts';
import { ROUTE_WEATHER_TABLES } from '../../src/data/weather-tables.ts';

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

describe('Weather Integrity & Biome Restrictions', () => {
  FIRE_RED_MAPS.forEach(map => {
    const mapId = map.id;
    const isIndoors = (map as any).isIndoors;
    const isCave = (map as any).isCave;
    
    // Extract all biome tags from the map object
    const activeBiomes = Object.keys(BIOME_BANNED).filter(tag => (map as any)[tag]);

    const weatherData = (ROUTE_WEATHER_TABLES as any)[mapId];

    if (!weatherData) return;

    describe(`Map: ${mapId} (${map.name})`, () => {
      Object.entries(weatherData).forEach(([season, seasonData]: [string, any]) => {
        describe(`Season: ${season}`, () => {
          Object.entries(seasonData).forEach(([cycle, table]: [string, any]) => {
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
    });
  });
});
