/**
 * tests/unit/gym.spec.js
 * Unit tests for Gym TM Rewards and Progress logic.
 */
import { describe, it, expect } from 'vitest';
import { processGymVictory, GYM_RATIOS } from '@/logic/gym/gymEngine';

describe('Gym Engine', () => {
  const mockGym = { id: 'pewter', leader: 'Brock', rewardTM: 'MT39 Tumba Rocas' };

  it('should give TM on first victory (Easy)', () => {
    const state = { defeatedGyms: [], gymProgress: {} };
    const result = processGymVictory(mockGym, 'easy', state);
    
    expect(result.tmDropped).toBe(true);
    expect(result.isFirstTime).toBe(true);
    expect(result.newProgress).toBe(1);
  });

  it('should not give TM on Easy rematch', () => {
    const state = { defeatedGyms: ['pewter'], gymProgress: { pewter: 1 } };
    const result = processGymVictory(mockGym, 'easy', state);
    
    expect(result.tmDropped).toBe(false);
    expect(result.isFirstTime).toBe(false);
    expect(result.extraCoins).toBe(150);
  });

  it('should validate Normal rematch drop rate (~3%)', () => {
    const state = { defeatedGyms: ['pewter'], gymProgress: { pewter: 1 } };
    let drops = 0;
    const SAMPLES = 10000; // Reduced for speed in tests, but enough for statistical check
    
    for (let i = 0; i < SAMPLES; i++) {
      if (processGymVictory(mockGym, 'normal', state).tmDropped) drops++;
    }
    
    const rate = drops / SAMPLES;
    // Allow small variance (expected 0.03)
    expect(rate).toBeGreaterThan(0.02);
    expect(rate).toBeLessThan(0.04);
  });

  it('should validate Hard rematch drop rate (~5%)', () => {
    const state = { defeatedGyms: ['pewter'], gymProgress: { pewter: 1 } };
    let drops = 0;
    const SAMPLES = 10000;
    
    for (let i = 0; i < SAMPLES; i++) {
      if (processGymVictory(mockGym, 'hard', state).tmDropped) drops++;
    }
    
    const rate = drops / SAMPLES;
    // Allow small variance (expected 0.05)
    expect(rate).toBeGreaterThan(0.04);
    expect(rate).toBeLessThan(0.06);
  });
});
