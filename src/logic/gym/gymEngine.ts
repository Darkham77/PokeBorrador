
/**
 * src/logic/gym/gymEngine.ts
 * Logic for Gym rewards, rematches, and progress.
 */

import { requireGymId, type GymId } from '@/data/world/gyms';
import type { GameState } from '@/types/system/game';

export interface Gym {
  id: GymId;
  leader: string;
  rewardTM?: string;
  level?: number;
}

export const GYM_RATIOS = {
  rematchTMRateNormal: 0.03,
  rematchTMRateHard: 0.05
};

export interface GymVictoryResult {
  tmDropped: boolean;
  extraCoins: number;
  newProgress: number;
  isFirstTime: boolean;
}

/**
 * Calculates the rewards for a gym battle.
 * @param {Gym} gym - Gym definition (id, leader, rewardTM, etc.)
 * @param {string} difficulty - 'easy' | 'normal' | 'hard'
 * @param {GameState} state - Current player state
 * @returns {GymVictoryResult} { tmDropped, extraCoins, newProgress, isFirstTime }
 */
export function processGymVictory(gym: Gym, difficulty: 'easy' | 'normal' | 'hard', state: GameState): GymVictoryResult {
  const diffMap: Record<string, number> = { easy: 1, normal: 2, hard: 3 };
  const diffValue = diffMap[difficulty] || 1;
  const gymId = requireGymId(gym.id);
  const isFirstTime = !state.defeatedGyms.includes(gymId);
  
  let tmDropped = false;
  let extraCoins = 0;
  let newProgress = 0;
  const currentEntry = state.gymProgress?.[gymId];
  if (typeof currentEntry === 'number') newProgress = currentEntry;
  else if (currentEntry && typeof currentEntry === 'object') newProgress = currentEntry.attempts || 0; // Fallback to attempts or similar if it was object

  if (isFirstTime) {
    tmDropped = !!gym.rewardTM;
    newProgress = Math.max(newProgress, diffValue);
  } else {
    // Rematch logic
    extraCoins = diffValue * 150;
    
    let tmChance = 0;
    if (difficulty === 'normal') tmChance = GYM_RATIOS.rematchTMRateNormal;
    else if (difficulty === 'hard') tmChance = GYM_RATIOS.rematchTMRateHard;

    if (tmChance > 0 && Math.random() < tmChance) {
      tmDropped = !!gym.rewardTM;
    }
    
    newProgress = Math.max(newProgress, diffValue);
  }

  return {
    tmDropped,
    extraCoins,
    newProgress,
    isFirstTime
  };
}
