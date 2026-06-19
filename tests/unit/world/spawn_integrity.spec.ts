import { describe, it, expect } from 'vitest';
import { FIRE_RED_MAPS } from '@/data/world/maps';
import { BABY_POKEMON, LEGENDARY_POKEMON } from '@/data/pokemon/pokedex';
import { clampLegendaryRates, getFinalGroundRates } from '@/logic/encounters/encounters';
import type { MapLocation } from '@/types/pokemon/encounters';

const babySet = new Set(BABY_POKEMON);
const legendarySet = new Set(LEGENDARY_POKEMON);

describe('Spawn integrity and Capping - Vitest Unit tests', () => {
  
  describe('clampLegendaryRates Unit Test', () => {
    it('should clamp legendary rate to exactly <= 1% when other rates exist', () => {
      const pool = ['pidgey', 'rattata', 'articuno'];
      const rates = [50, 50, 50];
      
      clampLegendaryRates(pool, rates);
      
      const legendaryRate = rates[2] ?? 0;
      expect(legendaryRate).toBeLessThanOrEqual(100 / 99 + 0.0001);
      
      const sum = rates.reduce((a, b) => a + b, 0);
      const legendaryProb = legendaryRate / sum;
      expect(legendaryProb).toBeCloseTo(0.01, 4);
    });

    it('should handle pools with multiple legendaries correctly, limiting each to <= 1%', () => {
      const pool = ['pidgey', 'articuno', 'zapdos'];
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
      const pool = ['pidgey', 'rattata'];
      const rates = [50, 50];
      clampLegendaryRates(pool, rates);
      expect(rates).toEqual([50, 50]);
    });
  });

  describe('getFinalGroundRates Unit Test', () => {
    it('should correctly build and scale pool, and ensure babies are absent and legendaries capped', () => {
      const seafoam = FIRE_RED_MAPS.find(m => m.id === 'seafoam_b4f') as unknown as MapLocation;
      if (seafoam) {
        const cycle = 'day';
        const weather = 'blizzard';
        const { pool, rates } = getFinalGroundRates(seafoam, cycle, weather, []);

        pool.forEach(id => {
          expect(babySet.has(id)).toBe(false);
        });

        const total = rates.reduce((sum, r) => sum + r, 0);
        pool.forEach((id, idx) => {
          if (legendarySet.has(id)) {
            const rateVal = rates[idx] ?? 0;
            const prob = rateVal / total;
            expect(prob).toBeLessThanOrEqual(0.0101);
          }
        });
      }
    });
  });

  describe('Integrity Test over all maps in Pokedex DB', () => {
    const typedMaps = FIRE_RED_MAPS as unknown as MapLocation[];

    it('should verify absolutely no baby Pokemon exist in any route spawn tables', () => {
      typedMaps.forEach(map => {
        if (map.wild) {
          Object.values(map.wild).forEach(pool => {
            if (pool) {
              pool.forEach(id => {
                expect(babySet.has(id)).toBe(false);
              });
            }
          });
        }
        if (map.fishing?.pool) {
          map.fishing.pool.forEach(id => {
            expect(babySet.has(id)).toBe(false);
          });
        }
        if (map.archaeology?.pool) {
          map.archaeology.pool.forEach(id => {
            expect(babySet.has(id)).toBe(false);
          });
        }
        if (map.weather) {
          Object.values(map.weather).forEach(wConfig => {
            if (wConfig) {
              const list = [
                ...(Array.isArray(wConfig.visitors) ? wConfig.visitors : Object.keys(wConfig.visitors || {})),
                ...(Array.isArray(wConfig.exclusive) ? wConfig.exclusive : Object.keys(wConfig.exclusive || {})),
                ...(Array.isArray(wConfig.fishingVisitors) ? wConfig.fishingVisitors : Object.keys(wConfig.fishingVisitors || {})),
                ...(Array.isArray(wConfig.fishingExclusive) ? wConfig.fishingExclusive : Object.keys(wConfig.fishingExclusive || {}))
              ];
              list.forEach(id => {
                expect(babySet.has(id)).toBe(false);
              });
            }
          });
        }
      });
    });

    it('should verify all spawn pools under all weathers cap legendaries to <= 1%', () => {
      typedMaps.forEach(map => {
        if (!map.wild) return;
        const cycles = ['morning', 'day', 'night'];
        const weathers = ['clear', ...(map.weather ? Object.keys(map.weather) : [])];

        cycles.forEach(cycle => {
          weathers.forEach(weather => {
            const { pool, rates } = getFinalGroundRates(map, cycle, weather, []);
            const total = rates.reduce((sum, r) => sum + r, 0);

            pool.forEach((id, idx) => {
              if (legendarySet.has(id)) {
                const rateVal = rates[idx] ?? 0;
                const prob = rateVal / total;
                expect(prob).toBeLessThanOrEqual(0.0101);
              }
            });
          });
        });
      });
    });
  });
});
