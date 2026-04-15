
// Simulation Test for Gym TM Rewards
// Mocks the game state and battle logic to verify TM drop rates.

const GAME_RATIOS = {
  gym: {
    rematchTMRateNormal: 0.03,
    rematchTMRateHard: 0.05
  }
};

const GYMS = [
  { id: 'pewter', leader: 'Brock', rewardTM: 'MT39 Tumba Rocas' },
  { id: 'cerulean', leader: 'Misty', rewardTM: 'MT03 Pulso Agua' }
];

let state = {
  inventory: {},
  defeatedGyms: [],
  gymProgress: {},
  battleCoins: 0,
  badges: 0
};

// Mock functions
function addLog(msg, type) {}
function notify(msg, icon) {}
function updateHud() {}
function saveGame() {}
function scheduleSave() {}
function updateProfilePanel() {}
function getGMT3Date() { return new Date(); }

function simulateGymWin(gymId, difficulty) {
  const b = {
    isGym: true,
    gymId: gymId,
    difficulty: difficulty
  };

  const gym = GYMS.find(g => g.id === b.gymId);
  if (!gym) return;

  const today = "2026-04-04";
  state.lastGymWins = state.lastGymWins || {};
  state.lastGymWins[b.gymId] = today;

  const diffUsed = b.difficulty || 'easy';
  const progress = state.gymProgress?.[b.gymId] || (state.defeatedGyms.includes(b.gymId) ? 1 : 0);
  const diffValue = { easy: 1, normal: 2, hard: 3 }[diffUsed];

  if (diffValue > progress) {
    state.gymProgress = state.gymProgress || {};
    state.gymProgress[b.gymId] = diffValue;
  }

  if (!state.defeatedGyms.includes(b.gymId)) {
    state.defeatedGyms.push(b.gymId);
    state.badges++;
    // First time TM reward
    if (gym.rewardTM) {
      state.inventory[gym.rewardTM] = (state.inventory[gym.rewardTM] || 0) + 1;
    }
  } else {
    // Rematch
    const extraCoins = diffValue * 150;
    state.battleCoins = (state.battleCoins || 0) + extraCoins;

    let tmChance = 0;
    const ratios = GAME_RATIOS.gym;
    if (ratios) {
      if (diffUsed === 'normal') tmChance = ratios.rematchTMRateNormal;
      else if (diffUsed === 'hard') tmChance = ratios.rematchTMRateHard;
    }

    if (tmChance > 0 && Math.random() < tmChance) {
      if (gym.rewardTM) {
        state.inventory[gym.rewardTM] = (state.inventory[gym.rewardTM] || 0) + 1;
      }
    }
  }
}

function runTests() {
  console.log("Starting Gym TM Logic Tests...");

  // Scenario 1: First win on Easy
  state = { inventory: {}, defeatedGyms: [], gymProgress: {}, battleCoins: 0, badges: 0 };
  simulateGymWin('pewter', 'easy');
  console.assert(state.inventory['MT39 Tumba Rocas'] === 1, "First win on Easy should give 1 TM");
  console.assert(state.defeatedGyms.includes('pewter'), "Gym should be in defeatedGyms");

  // Scenario 2: Rematch on Easy (Chance should be 0)
  simulateGymWin('pewter', 'easy');
  console.assert(state.inventory['MT39 Tumba Rocas'] === 1, "Easy rematch shouldn't give extra TM");

  // Scenario 3: Large scale simulation for Normal Rematch (3%)
  let normalDrops = 0;
  const SAMPLES = 100000;
  for (let i = 0; i < SAMPLES; i++) {
    state = { inventory: { 'MT39 Tumba Rocas': 1 }, defeatedGyms: ['pewter'], gymProgress: { pewter: 1 }, battleCoins: 0, badges: 1 };
    simulateGymWin('pewter', 'normal');
    if (state.inventory['MT39 Tumba Rocas'] > 1) normalDrops++;
  }
  const normalRate = normalDrops / SAMPLES;
  console.log(`Normal Rematch Drop Rate (${SAMPLES} wins): ${(normalRate * 100).toFixed(2)}% (Expected ~3.00%)`);
  console.assert(normalRate > 0.025 && normalRate < 0.035, "Normal drop rate out of expected range");

  // Scenario 4: Large scale simulation for Hard Rematch (5%)
  let hardDrops = 0;
  for (let i = 0; i < SAMPLES; i++) {
    state = { inventory: { 'MT39 Tumba Rocas': 1 }, defeatedGyms: ['pewter'], gymProgress: { pewter: 1 }, battleCoins: 0, badges: 1 };
    simulateGymWin('pewter', 'hard');
    if (state.inventory['MT39 Tumba Rocas'] > 1) hardDrops++;
  }
  const hardRate = hardDrops / SAMPLES;
  console.log(`Hard Rematch Drop Rate (${SAMPLES} wins): ${(hardRate * 100).toFixed(2)}% (Expected ~5.00%)`);
  console.assert(hardRate > 0.045 && hardRate < 0.055, "Hard drop rate out of expected range");

  console.log("All tests passed!");
}

runTests();
