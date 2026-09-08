import { describe, it, expect } from 'vitest';
import { GYM_REMATCHES, isGymRematchAvailable, isGymRematchCompletedToday, recordGymRematchCompletion } from '@/data/world/gymRematches';
import type { GameState } from '@/types/system/game';
import type { GymId } from '@/data/world/gyms';

function createMockGameState(partial?: Partial<GameState>): GameState {
  return {
    defeatedGyms: [],
    gymProgress: {},
    dailyGymRematches: {},
    inventory: {},
    battleCoins: 0,
    money: 0,
    ...partial
  } as unknown as GameState;
}

describe('Daily Gym Rematches Logic & Progression', () => {
  const today = '2026-09-07';
  const yesterday = '2026-09-06';

  it('has valid rematch configurations for all 8 Kanto gyms', () => {
    const gymIds: GymId[] = ['pewter', 'cerulean', 'vermilion', 'celadon', 'fuchsia', 'saffron', 'cinnabar', 'viridian'];
    for (const id of gymIds) {
      const config = GYM_REMATCHES[id];
      expect(config).toBeDefined();
      expect(config.pokemon.length).toBe(6);
      expect(config.levels.length).toBe(6);
      // All levels must be between 70 and 85
      for (const lvl of config.levels) {
        expect(lvl).toBeGreaterThanOrEqual(70);
        expect(lvl).toBeLessThanOrEqual(85);
      }
      expect(config.rewardItems.length).toBeGreaterThan(0);
      expect(config.rewardBattleCoins).toBeGreaterThan(0);
    }
  });

  it('isGymRematchAvailable returns false if hard mode has not been defeated', () => {
    const state = createMockGameState({
      gymProgress: {
        pewter: { easy: true, normal: true, hard: false, attempts: 2 }
      }
    });

    expect(isGymRematchAvailable(state, 'pewter', today)).toBe(false);
  });

  it('isGymRematchAvailable returns true if hard mode defeated and no rematch done today', () => {
    const state = createMockGameState({
      gymProgress: {
        pewter: { easy: true, normal: true, hard: true, attempts: 3 }
      },
      dailyGymRematches: {
        pewter: yesterday
      }
    });

    expect(isGymRematchAvailable(state, 'pewter', today)).toBe(true);
    expect(isGymRematchCompletedToday(state, 'pewter', today)).toBe(false);
  });

  it('isGymRematchAvailable returns false if rematch was already completed today', () => {
    const state = createMockGameState({
      gymProgress: {
        pewter: { easy: true, normal: true, hard: true, attempts: 4 }
      },
      dailyGymRematches: {
        pewter: today
      }
    });

    expect(isGymRematchAvailable(state, 'pewter', today)).toBe(false);
    expect(isGymRematchCompletedToday(state, 'pewter', today)).toBe(true);
  });

  it('recordGymRematchCompletion records the completion date correctly', () => {
    const state = createMockGameState({
      gymProgress: {
        pewter: { easy: true, normal: true, hard: true, attempts: 3 }
      }
    });

    expect(isGymRematchAvailable(state, 'pewter', today)).toBe(true);
    recordGymRematchCompletion(state, 'pewter', today);
    expect(state.dailyGymRematches?.pewter).toBe(today);
    expect(isGymRematchAvailable(state, 'pewter', today)).toBe(false);
    expect(isGymRematchCompletedToday(state, 'pewter', today)).toBe(true);
  });
});
