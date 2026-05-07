
/**
 * src/logic/gym/gymEngine.ts
 * Logic for Gym rewards, rematches, and progress.
 */

export interface Gym {
  id: string;
  leader: string;
  rewardTM?: string;
  level?: number;
}

export const GYM_RATIOS = {
  rematchTMRateNormal: 0.03,
  rematchTMRateHard: 0.05
};

import type { GameState } from '@/types/game';

/**
 * Calculates the rewards for a gym battle.
 * @param {Gym} gym - Gym definition (id, leader, rewardTM, etc.)
 * @param {string} difficulty - 'easy' | 'normal' | 'hard'
 * @param {GameState} state - Current player state
 * @returns {any} { newInventory, extraCoins, tmDropped, newProgress }
 */
export function processGymVictory(gym: Gym, difficulty: 'easy' | 'normal' | 'hard', state: GameState): any {
  const diffMap: Record<string, number> = { easy: 1, normal: 2, hard: 3 };
  const diffValue = diffMap[difficulty] || 1;
  const isFirstTime = !state.defeatedGyms.includes(gym.id);
  
  let tmDropped = false;
  let extraCoins = 0;
  let newProgress = 0;
  const currentEntry = state.gymProgress?.[gym.id];
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
