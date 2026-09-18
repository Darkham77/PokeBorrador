/**
 * tests/node/pvp/pvp_ranked_and_elo_suite.test.ts
 *
 * Consolidated Suite for PvP Ranked Mechanics, Elo Math & Season Lifecycles:
 * 1. Elo Rating Math: Expected scores, Elo delta calculation, K-factor switching, rating clamping, soft reset.
 * 2. Season Tiers & Ranked Engine: Elo tier classification, rank gap matching, team validation against rules, prize scaling.
 * 3. Seasonal Annual Themes: 12-month calendar, month wrapping, O(1) lookups, thematic reward Pokemon IV guarantees.
 * 4. Season End Resolution & Rewards Engine: Season rollover, Diamante / Maestro reward Pokemon generation, ELO soft reset.
 * 5. Personal Match History: Append, LIFO ordering, MAX cap (20 items), duplicate avoidance.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateExpectedScore,
  calculateEloDelta,
  applyEloDelta,
  calculateSoftResetElo,
  MIN_INITIAL_ELO,
} from '@/logic/pvp/eloRatingMath.ts';
import {
  getEloTier,
  isAllowedRankGap,
  validateTeamForRanked,
  normalizeRankedRules,
  RANKED_TIERS,
  getSeasonalPrizesForTier,
} from '@/logic/pvp/rankedEngine.ts';
import {
  checkAndResolveSeasonEnd,
  calculateEloSoftReset,
} from '@/logic/pvp/rankedSeasonRewardEngine.ts';
import {
  SEASONAL_THEME_IDS,
  SEASONAL_ANNUAL_THEMES,
  SEASONAL_THEMES_BY_ID,
  SEASONAL_THEMES_BY_MONTH,
  getSeasonalThemeForMonth,
  getSeasonalThemeConfig,
  isSeasonalThemeId,
  requireSeasonalThemeId,
} from '@/data/system/rankedData.ts';
import {
  isBattleCode,
  requireBattleCode,
  type BattleCode,
  appendPersonalMatchHistory,
  MAX_PERSONAL_MATCH_HISTORY,
  type PersonalPvPMatchSummary,
} from '@/types/battle/pvp.ts';
import { INITIAL_STATE } from '@/stores/gameInitialState.ts';
import type { GameState } from '@/types/system/game.ts';
import type { Pokemon } from '@/types/pokemon/pokemon.ts';

describe('PvP Ranked & Elo Suite', () => {
  describe('eloRatingMath', () => {
    describe('calculateExpectedScore', () => {
      it('returns 0.5 when both ratings are equal', () => {
        expect(calculateExpectedScore(1000, 1000)).toBeCloseTo(0.5, 4);
        expect(calculateExpectedScore(2500, 2500)).toBeCloseTo(0.5, 4);
      });

      it('returns > 0.5 when player rating is higher than opponent', () => {
        const score = calculateExpectedScore(1400, 1000);
        expect(score).toBeGreaterThan(0.5);
        expect(score).toBeCloseTo(0.909, 2);
      });

      it('returns < 0.5 when player rating is lower than opponent', () => {
        const score = calculateExpectedScore(1000, 1400);
        expect(score).toBeLessThan(0.5);
        expect(score).toBeCloseTo(0.091, 2);
      });
    });

    describe('calculateEloDelta', () => {
      it('uses K=32 for ratings below 2100 and K=16 for ratings >= 2100', () => {
        const deltaLow = calculateEloDelta(1000, 1000, true);
        expect(deltaLow).toBe(16);

        const deltaHigh = calculateEloDelta(2500, 2500, true);
        expect(deltaHigh).toBe(8);
      });

      it('awards significantly more points for defeating a higher-rated opponent (upset)', () => {
        const upsetWin = calculateEloDelta(1000, 1400, true);
        const expectedWin = calculateEloDelta(1400, 1000, true);

        expect(upsetWin).toBeGreaterThan(expectedWin);
        expect(upsetWin).toBeGreaterThanOrEqual(28);
        expect(expectedWin).toBeLessThanOrEqual(5);
      });

      it('deducts significantly fewer points when losing to a higher-rated opponent', () => {
        const underdogLoss = calculateEloDelta(1000, 1400, false);
        const favoriteLoss = calculateEloDelta(1400, 1000, false);

        expect(underdogLoss).toBeGreaterThan(favoriteLoss);
        expect(Math.abs(underdogLoss)).toBeLessThan(Math.abs(favoriteLoss));
      });
    });

    describe('applyEloDelta', () => {
      it('strictly clamps rating to MIN_INITIAL_ELO (1000) when delta is negative', () => {
        expect(applyEloDelta(1000, -16)).toBe(MIN_INITIAL_ELO);
        expect(applyEloDelta(1005, -20)).toBe(MIN_INITIAL_ELO);
      });

      it('increments rating cleanly upon positive delta', () => {
        expect(applyEloDelta(1000, 16)).toBe(1016);
        expect(applyEloDelta(1500, 25)).toBe(1525);
      });
    });

    describe('calculateSoftResetElo', () => {
      it('keeps 1000 ELO unchanged at 1000', () => {
        expect(calculateSoftResetElo(1000)).toBe(1000);
        expect(calculateSoftResetElo(900)).toBe(1000);
      });

      it('compresses higher ratings toward 1000 with (elo - 1000) / 2 + 1000', () => {
        expect(calculateSoftResetElo(1600)).toBe(1300);
        expect(calculateSoftResetElo(2100)).toBe(1550);
        expect(calculateSoftResetElo(2700)).toBe(1850);
        expect(calculateSoftResetElo(3400)).toBe(2200);
      });
    });
  });

  describe('seasonTiers & rankedEngine', () => {
    describe('getEloTier', () => {
      it('correctly classifies ratings into tiers', () => {
        expect(getEloTier(1000).name).toBe('Bronce');
        expect(getEloTier(1199).name).toBe('Bronce');
        expect(getEloTier(1200).name).toBe('Plata');
        expect(getEloTier(1599).name).toBe('Plata');
        expect(getEloTier(1600).name).toBe('Oro');
        expect(getEloTier(2099).name).toBe('Oro');
        expect(getEloTier(2100).name).toBe('Platino');
        expect(getEloTier(2699).name).toBe('Platino');
        expect(getEloTier(2700).name).toBe('Diamante');
        expect(getEloTier(3400).name).toBe('Maestro');
        expect(getEloTier(4000).name).toBe('Maestro');
        expect(RANKED_TIERS.MAESTRO.minElo).toBe(3400);
        expect(RANKED_TIERS.DIAMANTE.minElo).toBe(2700);
      });
    });

    describe('isAllowedRankGap', () => {
      it('allows matches within 1 tier difference', () => {
        expect(isAllowedRankGap(1000, 1300, 1)).toBe(true);
        expect(isAllowedRankGap(1300, 1700, 1)).toBe(true);
      });

      it('rejects matches exceeding max gap', () => {
        expect(isAllowedRankGap(1000, 1700, 1)).toBe(false);
        expect(isAllowedRankGap(1000, 3500, 1)).toBe(false);
      });
    });

    describe('validateTeamForRanked', () => {
      const rules = normalizeRankedRules({
        maxPokemon: 6,
        levelCap: 50,
        bannedPokemonIds: ['mewtwo' as any]
      });

      it('validates a compliant team', () => {
        const team: Pokemon[] = [
          { id: 'pikachu', name: 'Pikachu', level: 50, type: 'electric', hp: 100, maxHp: 100, atk: 50, def: 50, spa: 50, spd: 50, spe: 50, moves: [] } as unknown as Pokemon
        ];
        const result = validateTeamForRanked(team, rules);
        expect(result.ok).toBe(true);
      });

      it('rejects a team exceeding maxPokemon', () => {
        const team = new Array(7).fill(null).map((_, i) => ({
          id: 'pikachu', name: `Pika${i}`, level: 50, type: 'electric', hp: 100, maxHp: 100, atk: 50, def: 50, spa: 50, spd: 50, spe: 50, moves: []
        })) as unknown as Pokemon[];

        const result = validateTeamForRanked(team, rules);
        expect(result.ok).toBe(false);
        expect(result.reason).toContain('Máximo 6');
      });

      it('rejects a team with a banned pokemon', () => {
        const team: Pokemon[] = [
          { id: 'mewtwo', name: 'Mewtwo', level: 50, type: 'psychic', hp: 100, maxHp: 100, atk: 50, def: 50, spa: 50, spd: 50, spe: 50, moves: [] } as unknown as Pokemon
        ];
        const result = validateTeamForRanked(team, rules);
        expect(result.ok).toBe(false);
        expect(result.reason).toContain('está baneado');
      });

      it('rejects a pokemon exceeding levelCap', () => {
        const team: Pokemon[] = [
          { id: 'pikachu', name: 'Pikachu', level: 55, type: 'electric', hp: 100, maxHp: 100, atk: 50, def: 50, spa: 50, spd: 50, spe: 50, moves: [] } as unknown as Pokemon
        ];
        const result = validateTeamForRanked(team, rules);
        expect(result.ok).toBe(false);
        expect(result.reason).toContain('supera el nivel máximo');
      });
    });

    describe('getSeasonalPrizesForTier', () => {
      it('returns appropriate rewards scaled by tier', () => {
        const maestroPrize = getSeasonalPrizesForTier('maestro');
        expect(maestroPrize.battleCoins).toBe(500);
        expect(maestroPrize.dungeonTickets).toBeGreaterThanOrEqual(3);
        expect(maestroPrize.pokemonReward?.shiny).toBe(true);

        const diamantePrize = getSeasonalPrizesForTier('diamante');
        expect(diamantePrize.battleCoins).toBe(350);

        const broncePrize = getSeasonalPrizesForTier('bronce');
        expect(broncePrize.battleCoins).toBe(25);
      });
    });
  });

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
        expect(getSeasonalThemeForMonth(13).id).toBe('monotype_clash');
        expect(getSeasonalThemeForMonth(24).id).toBe('masters_allstars');
        expect(getSeasonalThemeForMonth(0).id).toBe('masters_allstars');
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
        expect(isBattleCode('btl-a7x9-k24')).toBe(false);
        expect(isBattleCode('BTL-SHORT')).toBe(false);
        expect(isBattleCode(null)).toBe(false);
        expect(requireBattleCode('BTL-TEST-1234')).toBe('BTL-TEST-1234' as BattleCode);
        expect(() => requireBattleCode('invalid')).toThrow('[PVP] Invalid battle code format');
      });
    });
  });

  describe('Ranked Season End Resolution & Rewards Engine', () => {
    it('correctly calculates ELO soft reset', () => {
      expect(calculateEloSoftReset(1000)).toBe(1000);
      expect(calculateEloSoftReset(1600)).toBe(1300);
      expect(calculateEloSoftReset(2800)).toBe(1900);
      expect(calculateEloSoftReset(3400)).toBe(2200);
    });

    it('returns resolved: false if season has not rolled over', () => {
      const state: GameState = {
        ...INITIAL_STATE,
        lastResolvedSeasonId: 'little_cup',
        eloRating: 2800,
        rankedMaxElo: 2800
      };

      const result = checkAndResolveSeasonEnd(state, 3);
      expect(result.resolved).toBe(false);
    });

    it('resolves season end and grants Diamante reward pokemon when rollover occurs', () => {
      const state: GameState = {
        ...INITIAL_STATE,
        lastResolvedSeasonId: 'kanto_classic',
        eloRating: 2850,
        rankedMaxElo: 2850,
        rankedRewardsClaimed: ['bronce_1000', 'plata_1200']
      };

      const result = checkAndResolveSeasonEnd(state, 3);

      expect(result.resolved).toBe(true);
      expect(result.tier).toBe('diamante');
      expect(result.rewardPokemon).not.toBeNull();
      expect(result.rewardPokemon?.isShiny).toBe(true);

      const ivValues = Object.values(result.rewardPokemon?.ivs || {});
      const maxIvsCount = ivValues.filter(v => v === 31).length;
      expect(maxIvsCount).toBeGreaterThanOrEqual(3);

      expect(state.eloRating).toBe(1925);
      expect(state.rankedMaxElo).toBe(1925);
      expect(state.rankedRewardsClaimed).toEqual([]);
      expect(state.lastResolvedSeasonId).toBe('little_cup');
      expect(state.box.length).toBeGreaterThan(0);
    });

    it('resolves season end and grants Maestro reward pokemon with 4 max IVs', () => {
      const state: GameState = {
        ...INITIAL_STATE,
        lastResolvedSeasonId: 'kanto_classic',
        eloRating: 3500,
        rankedMaxElo: 3500
      };

      const result = checkAndResolveSeasonEnd(state, 3);

      expect(result.resolved).toBe(true);
      expect(result.tier).toBe('maestro');
      expect(result.rewardPokemon).not.toBeNull();
      expect(result.rewardPokemon?.isShiny).toBe(true);

      const ivValues = Object.values(result.rewardPokemon?.ivs || {});
      const maxIvsCount = ivValues.filter(v => v === 31).length;
      expect(maxIvsCount).toBeGreaterThanOrEqual(4);

      expect(state.eloRating).toBe(2250);
    });
  });

  describe('Personal Match History Logic', () => {
    const createMockMatch = (idx: number, result: 'victory' | 'defeat' = 'victory'): PersonalPvPMatchSummary => ({
      id: `match_${idx}`,
      battleCode: requireBattleCode(`BTL-TEST-${String(idx).padStart(3, '0')}`),
      opponentId: `opp_${idx}`,
      opponentName: `Trainer ${idx}`,
      opponentAvatar: '/assets/avatars/red.png',
      format: '3v3',
      isRanked: true,
      result,
      deltaElo: result === 'victory' ? 16 : -14,
      turnsCount: 8,
      timestamp: new Date().toISOString()
    });

    it('appends a match to an empty history', () => {
      const match = createMockMatch(1);
      const history = appendPersonalMatchHistory(undefined, match);
      expect(history).toHaveLength(1);
      expect(history[0]!.id).toBe('match_1');
    });

    it('prepends new matches at the beginning (LIFO)', () => {
      let history: PersonalPvPMatchSummary[] = [];
      history = appendPersonalMatchHistory(history, createMockMatch(1));
      history = appendPersonalMatchHistory(history, createMockMatch(2));

      expect(history).toHaveLength(2);
      expect(history[0]!.id).toBe('match_2');
      expect(history[1]!.id).toBe('match_1');
    });

    it('caps history at MAX_PERSONAL_MATCH_HISTORY (20 items)', () => {
      let history: PersonalPvPMatchSummary[] = [];
      for (let i = 1; i <= 25; i++) {
        history = appendPersonalMatchHistory(history, createMockMatch(i));
      }

      expect(history).toHaveLength(MAX_PERSONAL_MATCH_HISTORY);
      expect(history[0]!.id).toBe('match_25');
      expect(history[MAX_PERSONAL_MATCH_HISTORY - 1]!.id).toBe('match_6');
    });

    it('deduplicates when appending a match with identical battleCode or id', () => {
      let history: PersonalPvPMatchSummary[] = [];
      const match1 = createMockMatch(1);
      history = appendPersonalMatchHistory(history, match1);
      history = appendPersonalMatchHistory(history, createMockMatch(2));
      history = appendPersonalMatchHistory(history, match1);

      expect(history).toHaveLength(2);
      expect(history[0]!.id).toBe('match_1');
      expect(history[1]!.id).toBe('match_2');
    });
  });
});
