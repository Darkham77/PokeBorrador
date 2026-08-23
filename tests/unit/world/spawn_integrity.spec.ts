import { describe, it, expect } from 'vitest';
import { FIRE_RED_MAPS } from '@/data/world/maps';
import { isBabyPokemonSpeciesId, isLegendaryPokemonSpeciesId } from '@/data/pokemon/pokedex';
import { clampLegendaryRates, getFinalGroundRates } from '@/logic/encounters/encounters';
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex';
import type { DayPhase } from '@/logic/utils/timeUtils';
import { isWeatherId, type WeatherId } from '@/logic/weather/weatherRegistry';

describe('Spawn integrity and Capping - Vitest Unit tests', () => {
  
  describe('clampLegendaryRates Unit Test', () => {
    it('should clamp legendary rate to exactly <= 1% when other rates exist', () => {
      const pool: PokemonSpeciesId[] = ['pidgey', 'rattata', 'articuno'];
      const rates = [50, 50, 50];
      
      clampLegendaryRates(pool, rates);
      
      const legendaryRate = rates[2] ?? 0;
      expect(legendaryRate).toBeLessThanOrEqual(100 / 99 + 0.0001);
      
      const sum = rates.reduce((a, b) => a + b, 0);
      const legendaryProb = legendaryRate / sum;
      expect(legendaryProb).toBeCloseTo(0.01, 4);
    });

    it('should handle pools with multiple legendaries correctly, limiting each to <= 1%', () => {
      const pool: PokemonSpeciesId[] = ['pidgey', 'articuno', 'zapdos'];
      const rates = [100, 50, 50];
      
      clampLegendaryRates(pool, rates);
      
      const rateArticuno = rates[1] ?? 0;
      const rateZapdos = rates[2] ?? 0;
      
      expect(rateArticuno).toBeLessThanOrEqual(100 / 99 + 0.0001);
      expect(rateZapdos).toBeLessThanOrEqual(100 / 99 + 0.0001);
      
      const sum = rates.reduce((a, b) => a + b, 0);
      expect(rateArticuno / sum).toBeLessThanOrEqual(0.0101);
      expect(rateZapdos / sum).toBeLessThanOrEqual(0.0101);
    });

    it('should do nothing if no legendary is in the pool', () => {
      const pool: PokemonSpeciesId[] = ['pidgey', 'rattata'];
      const rates = [50, 50];
      clampLegendaryRates(pool, rates);
      expect(rates).toEqual([50, 50]);
    });
  });

  describe('getFinalGroundRates Unit Test', () => {
    it('should correctly build and scale pool, and ensure babies are absent and legendaries capped', () => {
      const seafoam = FIRE_RED_MAPS.find(m => m.id === 'seafoam_islands');
      if (seafoam) {
        const cycle = 'day';
        const weather = 'blizzard';
        const { pool, rates } = getFinalGroundRates(seafoam, cycle, weather, []);

        pool.forEach(id => {
          expect(isBabyPokemonSpeciesId(id)).toBe(false);
        });

        const total = rates.reduce((sum, r) => sum + r, 0);
        pool.forEach((id, idx) => {
          if (isLegendaryPokemonSpeciesId(id)) {
            const rateVal = rates[idx] ?? 0;
            const prob = rateVal / total;
            expect(prob).toBeLessThanOrEqual(0.0101);
          }
        });
      }
    });
  });

  describe('FIRE_RED_MAPS Ground Spawns Verification', () => {
    it('should verify ground spawns for all maps in FIRE_RED_MAPS', () => {
      FIRE_RED_MAPS.forEach(map => {
        const cycles: DayPhase[] = ['morning', 'day', 'dusk', 'night'];
        const weathers: WeatherId[] = ['clear', 'rain', 'sun', 'snow'];

        cycles.forEach(cycle => {
          weathers.forEach(weather => {
            const { pool, rates } = getFinalGroundRates(map, cycle, weather, []);

            pool.forEach(id => {
              expect(isBabyPokemonSpeciesId(id), `Baby pokemon ${id} found in ground spawns on map ${map.name} (${map.id}) under ${cycle}/${weather}`).toBe(false);
            });

            const total = rates.reduce((sum, r) => sum + r, 0);
            pool.forEach((id, idx) => {
              if (isLegendaryPokemonSpeciesId(id)) {
                const rateVal = rates[idx] ?? 0;
                const prob = rateVal / total;
                expect(prob, `Legendary pokemon ${id} has probability ${prob} (>1%) on map ${map.name} (${map.id}) under ${cycle}/${weather}`).toBeLessThanOrEqual(0.0101);
              }
            });
          });
        });
      });
    });

    it('should verify ground spawns when excludeLegendaries is true', () => {
      FIRE_RED_MAPS.forEach(map => {
        const cycle: DayPhase = 'day';
        const weather: WeatherId = 'clear';
        const { pool } = getFinalGroundRates(map, cycle, weather, []);

        pool.forEach(id => {
          expect(isBabyPokemonSpeciesId(id)).toBe(false);
        });
      });
    });

    it('should verify ground spawns with weather-specific pool entries', () => {
      FIRE_RED_MAPS.forEach(map => {
        if (map.weather) {
          const cycles: DayPhase[] = ['morning', 'day', 'dusk', 'night'];
          Object.keys(map.weather).forEach(weatherKey => {
            if (!isWeatherId(weatherKey)) {
              throw new Error(`[spawn_integrity] Invalid weather id in map weather table: ${weatherKey}`);
            }
            cycles.forEach(cycle => {
              const { pool, rates } = getFinalGroundRates(map, cycle, weatherKey, []);

              pool.forEach(id => {
                expect(isBabyPokemonSpeciesId(id)).toBe(false);
              });

              const total = rates.reduce((sum, r) => sum + r, 0);
              pool.forEach((id, idx) => {
                if (isLegendaryPokemonSpeciesId(id)) {
                  const rateVal = rates[idx] ?? 0;
                  const prob = rateVal / total;
                  expect(prob).toBeLessThanOrEqual(0.0101);
                }
              });
            });
          });
        }
      });
    });
  });

  describe('Whitelist Compliance (ENABLED_POKEMON_IDS)', () => {
    it('debe garantizar que el 100% de los mapas estáticos en FIRE_RED_MAPS contengan solo Pokémon de la lista blanca', async () => {
      const { ENABLED_POKEMON_IDS } = await import('@/data/system/constants');
      const allowedSet = new Set(ENABLED_POKEMON_IDS);

      FIRE_RED_MAPS.forEach(map => {
        // 1. Wild ground pools per cycle
        if (map.wild) {
          Object.entries(map.wild).forEach(([cycle, pool]) => {
            (pool || []).forEach(speciesId => {
              expect(
                allowedSet.has(speciesId as never),
                `[MAP DEFINITION ERROR] Pokémon no habilitado '${speciesId}' encontrado en mapa ${map.name} (${map.id}) ciclo '${cycle}'`
              ).toBe(true);
            });
          });
        }

        // 2. Fishing pool
        if (map.fishing?.pool) {
          map.fishing.pool.forEach(speciesId => {
            expect(
              allowedSet.has(speciesId as never),
              `[MAP DEFINITION ERROR] Pokémon no habilitado '${speciesId}' encontrado en pesca de mapa ${map.name} (${map.id})`
            ).toBe(true);
          });
        }

        // 5. Weather visitors and exclusives
        if (map.weather) {
          Object.entries(map.weather).forEach(([weatherId, config]) => {
            if (config.visitors) {
              Object.keys(config.visitors).forEach(speciesId => {
                expect(
                  allowedSet.has(speciesId as never),
                  `[MAP DEFINITION ERROR] Pokémon no habilitado '${speciesId}' encontrado en visitantes de clima '${weatherId}' en mapa ${map.name} (${map.id})`
                ).toBe(true);
              });
            }

            if (config.exclusive) {
              Object.keys(config.exclusive).forEach(speciesId => {
                expect(
                  allowedSet.has(speciesId as never),
                  `[MAP DEFINITION ERROR] Pokémon no habilitado '${speciesId}' encontrado en exclusivos de clima '${weatherId}' en mapa ${map.name} (${map.id})`
                ).toBe(true);
              });
            }
          });
        }
      });
    });

    it('debe garantizar que el 100% de los spawns generados dinámicamente por getFinalGroundRates pertenezcan a la lista blanca', async () => {
      const { ENABLED_POKEMON_IDS } = await import('@/data/system/constants');
      const allowedSet = new Set(ENABLED_POKEMON_IDS);
      const cycles: DayPhase[] = ['morning', 'day', 'dusk', 'night'];
      const weathers: WeatherId[] = ['clear', 'rain', 'sun', 'snow', 'coldwave', 'thunderstorm', 'fog', 'mist', 'wind', 'heatwave', 'dust_storm', 'strong_winds'];

      FIRE_RED_MAPS.forEach(map => {
        cycles.forEach(cycle => {
          weathers.forEach(weather => {
            const { pool } = getFinalGroundRates(map, cycle, weather, []);
            pool.forEach(speciesId => {
              expect(
                allowedSet.has(speciesId as never),
                `[RUNTIME SPAWN ERROR] Pokémon '${speciesId}' generado dinámicamente en ${map.name} (${map.id}) bajo ciclo '${cycle}' y clima '${weather}' no está en ENABLED_POKEMON_IDS`
              ).toBe(true);
            });
          });
        });
      });
    });
  });
});
