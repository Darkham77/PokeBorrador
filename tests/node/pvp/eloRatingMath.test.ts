import { describe, it, expect } from 'vitest';
import {
  calculateExpectedScore,
  calculateEloDelta,
  applyEloDelta,
  calculateSoftResetElo,
  MIN_INITIAL_ELO
} from '@/logic/pvp/eloRatingMath';

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
      expect(deltaLow).toBe(16); // 32 * (1 - 0.5) = 16

      const deltaHigh = calculateEloDelta(2500, 2500, true);
      expect(deltaHigh).toBe(8); // 16 * (1 - 0.5) = 8
    });

    it('awards significantly more points for defeating a higher-rated opponent (upset)', () => {
      const upsetWin = calculateEloDelta(1000, 1400, true); // underdog wins
      const expectedWin = calculateEloDelta(1400, 1000, true); // favorite wins
      
      expect(upsetWin).toBeGreaterThan(expectedWin);
      expect(upsetWin).toBeGreaterThanOrEqual(28);
      expect(expectedWin).toBeLessThanOrEqual(5);
    });

    it('deducts significantly fewer points when losing to a higher-rated opponent', () => {
      const underdogLoss = calculateEloDelta(1000, 1400, false);
      const favoriteLoss = calculateEloDelta(1400, 1000, false);

      expect(underdogLoss).toBeGreaterThan(favoriteLoss); // underdogLoss is e.g. -3 vs favoriteLoss e.g. -29
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
      // 1600 (Oro) -> 1300 (Plata)
      expect(calculateSoftResetElo(1600)).toBe(1300);

      // 2100 (Platino) -> 1550 (Plata alta)
      expect(calculateSoftResetElo(2100)).toBe(1550);

      // 2700 (Diamante) -> 1850 (Oro)
      expect(calculateSoftResetElo(2700)).toBe(1850);

      // 3400 (Maestro) -> 2200 (Platino)
      expect(calculateSoftResetElo(3400)).toBe(2200);
    });
  });
});
