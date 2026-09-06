import { describe, it, expect } from 'vitest';
import {
  SEASONAL_THEME_IDS,
  SEASONAL_ANNUAL_THEMES,
  SEASONAL_THEMES_BY_ID,
  SEASONAL_THEMES_BY_MONTH,
  getSeasonalThemeForMonth,
  getSeasonalThemeConfig,
  isSeasonalThemeId,
  requireSeasonalThemeId
} from '@/data/system/rankedData.ts';
import {
  isBattleCode,
  requireBattleCode,
  type BattleCode
} from '@/types/battle/pvp.ts';

describe('Seasonal Annual Themes & Replay Domain Types', () => {
  describe('12-Month Calendar Structure', () => {
    it('contains exactly 12 configured themes with unique month indices 1 to 12', () => {
      expect(SEASONAL_ANNUAL_THEMES).toHaveLength(12);
      expect(SEASONAL_THEME_IDS).toHaveLength(12);

      const months = SEASONAL_ANNUAL_THEMES.map(t => t.monthIndex);
      expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    });

    it('retrieves correct theme for each month using getSeasonalThemeForMonth', () => {
      expect(getSeasonalThemeForMonth(1).id).toBe('monotype_clash');
      expect(getSeasonalThemeForMonth(2).id).toBe('kanto_classic');
      expect(getSeasonalThemeForMonth(3).id).toBe('little_cup');
      expect(getSeasonalThemeForMonth(4).id).toBe('weather_masters');
      expect(getSeasonalThemeForMonth(5).id).toBe('dual_type_duo');
      expect(getSeasonalThemeForMonth(6).id).toBe('no_legendaries');
      expect(getSeasonalThemeForMonth(7).id).toBe('speed_warp');
      expect(getSeasonalThemeForMonth(8).id).toBe('elemental_triad');
      expect(getSeasonalThemeForMonth(9).id).toBe('johto_kanto_frontier');
      expect(getSeasonalThemeForMonth(10).id).toBe('halloween_spook');
      expect(getSeasonalThemeForMonth(11).id).toBe('titan_clash');
      expect(getSeasonalThemeForMonth(12).id).toBe('masters_allstars');
    });

    it('normalizes out-of-bounds months using modulo calendar wrapping', () => {
      expect(getSeasonalThemeForMonth(13).id).toBe('monotype_clash'); // Month 13 -> Month 1
      expect(getSeasonalThemeForMonth(24).id).toBe('masters_allstars'); // Month 24 -> Month 12
      expect(getSeasonalThemeForMonth(0).id).toBe('masters_allstars'); // Month 0 -> Month 12
    });

    it('retrieves themes by ID in O(1)', () => {
      const theme = getSeasonalThemeConfig('halloween_spook');
      expect(theme.name).toBe('Noche de Brujas');
      expect(theme.allowedTypes).toEqual(['ghost', 'dark', 'poison']);
      expect(SEASONAL_THEMES_BY_ID['halloween_spook']).toBe(theme);
      expect(SEASONAL_THEMES_BY_MONTH[10]).toBe(theme);
    });
  });

  describe('Thematic Reward Pokémon & IV Guarantees', () => {
    it('guarantees 3 max IVs for Diamante and 4 max IVs for Maestro across all 12 themes', () => {
      for (const theme of SEASONAL_ANNUAL_THEMES) {
        const { diamante, maestro } = theme.rewardPokemon;

        expect(diamante.shiny).toBe(true);
        expect(diamante.level).toBe(50);
        expect(diamante.guaranteedMaxIvs).toBe(3);

        expect(maestro.shiny).toBe(true);
        expect(maestro.level).toBe(50);
        expect(maestro.guaranteedMaxIvs).toBe(4);
      }
    });

    it('binds emblematic theme species correctly', () => {
      expect(getSeasonalThemeConfig('kanto_classic').rewardPokemon.diamante.species).toBe('squirtle');
      expect(getSeasonalThemeConfig('kanto_classic').rewardPokemon.maestro.species).toBe('blastoise');
      expect(getSeasonalThemeConfig('halloween_spook').rewardPokemon.maestro.species).toBe('gengar');
      expect(getSeasonalThemeConfig('little_cup').rewardPokemon.diamante.species).toBe('pichu');
      expect(getSeasonalThemeConfig('titan_clash').rewardPokemon.diamante.species).toBe('dratini');
    });
  });

  describe('ID & BattleCode Type Guards', () => {
    it('validates seasonal theme ids', () => {
      expect(isSeasonalThemeId('kanto_classic')).toBe(true);
      expect(isSeasonalThemeId('halloween_spook')).toBe(true);
      expect(isSeasonalThemeId('invalid_cup')).toBe(false);
      expect(isSeasonalThemeId(123)).toBe(false);
      expect(requireSeasonalThemeId('little_cup')).toBe('little_cup');
      expect(() => requireSeasonalThemeId('fake_cup')).toThrow('[PVP] Invalid seasonal theme id');
    });

    it('validates canonical BattleCode format BTL-XXXX-XXXX', () => {
      expect(isBattleCode('BTL-A7X9-K24')).toBe(true);
      expect(isBattleCode('BTL-9182-ABCD')).toBe(true);
      expect(isBattleCode('btl-a7x9-k24')).toBe(false); // must be uppercase
      expect(isBattleCode('BTL-SHORT')).toBe(false);
      expect(isBattleCode(null)).toBe(false);
      expect(requireBattleCode('BTL-TEST-1234')).toBe('BTL-TEST-1234' as BattleCode);
      expect(() => requireBattleCode('invalid')).toThrow('[PVP] Invalid battle code format');
    });
  });
});
