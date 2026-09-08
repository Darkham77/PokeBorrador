import { describe, it, expect } from 'vitest';
import { checkAndResolveSeasonEnd, calculateEloSoftReset } from '@/logic/pvp/rankedSeasonRewardEngine';
import { INITIAL_STATE } from '@/stores/gameInitialState';
import type { GameState } from '@/types/system/game';

describe('Ranked Season End Resolution & Rewards Engine', () => {
  it('correctly calculates ELO soft reset', () => {
    expect(calculateEloSoftReset(1000)).toBe(1000);
    expect(calculateEloSoftReset(1600)).toBe(1300); // (600)*0.5 + 1000 = 1300
    expect(calculateEloSoftReset(2800)).toBe(1900); // (1800)*0.5 + 1000 = 1900
    expect(calculateEloSoftReset(3400)).toBe(2200); // (2400)*0.5 + 1000 = 2200
  });

  it('returns resolved: false if season has not rolled over', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      lastResolvedSeasonId: 'little_cup',
      eloRating: 2800,
      rankedMaxElo: 2800
    };

    // Month 3 is little_cup
    const result = checkAndResolveSeasonEnd(state, 3);
    expect(result.resolved).toBe(false);
  });

  it('resolves season end and grants Diamante reward pokemon when rollover occurs', () => {
    const state: GameState = {
      ...INITIAL_STATE,
      lastResolvedSeasonId: 'kanto_classic', // month 2
      eloRating: 2850,
      rankedMaxElo: 2850,
      rankedRewardsClaimed: ['bronce_1000', 'plata_1200']
    };

    // Roll over to month 3 (little_cup)
    const result = checkAndResolveSeasonEnd(state, 3);

    expect(result.resolved).toBe(true);
    expect(result.tier).toBe('diamante');
    expect(result.rewardPokemon).not.toBeNull();
    expect(result.rewardPokemon?.isShiny).toBe(true);
    
    // Check at least 3 IVs are 31
    const ivValues = Object.values(result.rewardPokemon?.ivs || {});
    const maxIvsCount = ivValues.filter(v => v === 31).length;
    expect(maxIvsCount).toBeGreaterThanOrEqual(3);

    // ELO soft reset: (2850 - 1000) * 0.5 + 1000 = 1925
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

    // ELO soft reset: (3500 - 1000) * 0.5 + 1000 = 2250
    expect(state.eloRating).toBe(2250);
  });
});
