/**
 * src/logic/gym/gymEngine.js
 * Logic for Gym rewards, rematches, and progress.
 */

export const GYM_RATIOS = {
  rematchTMRateNormal: 0.03,
  rematchTMRateHard: 0.05
};

/**
 * Calculates the rewards for a gym battle.
 * @param {Object} gym - Gym definition (id, leader, rewardTM, etc.)
 * @param {String} difficulty - 'easy' | 'normal' | 'hard'
 * @param {Object} state - Current player state
 * @returns {Object} { newInventory, extraCoins, tmDropped, newProgress }
 */
export function processGymVictory(gym, difficulty, state) {
  const diffValue = { easy: 1, normal: 2, hard: 3 }[difficulty] || 1;
  const isFirstTime = !state.defeatedGyms.includes(gym.id);
  
  let tmDropped = false;
  let extraCoins = 0;
  let newProgress = state.gymProgress?.[gym.id] || 0;

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
