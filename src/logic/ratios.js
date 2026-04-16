/**
 * CENTRALIZED GAME RATIOS & CHANCES
 * 
 * This module contains all balance constants for mechanics like
 * Shiny rates, encounter probabilities, catch formulas, etc.
 */

export const GAME_RATIOS = {
  // --- Shiny ---
  // Shiny encounter rate. 3000 means 1 in 3000 chance.
  shinyRate: 3000,

  // --- Encounters ---
  encounters: {
    rival: 0.001,              // 0.1% chance for a Rival encounter on any map
    fishing: 0.10,            // 10% chance for a fishing encounter when on a map with water
    legendaryArticuno: 0.01,  // 1% chance to encounter Articuno in Seafoam Islands if ticket is active
    legendaryMewtwo: 0.001,    // 0.1% chance to encounter Mewtwo in Cerulean Cave if ticket is active

    // Trainer normal encounters
    trainerBase: 5,           // Base % chance for trainer encounter (increases with pity timer)
    trainerMax: 20,           // Maximum % chance for trainer encounter (pity limit)
    trainerIncrement: 5,      // % added to trainer chance every 2 minutes

    // Trainer guaranteed encounters (Repel)
    trainerRepel: 0.30        // 30% chance for trainer encounter when Repel is active
  },

  // --- Battle ---
  battle: {
    catchFormulaParams: {
      catchBaseMultiplier: 1.0,
    }
  },
  
  // --- Gym ---
  gym: {
    rematchTMRateNormal: 0.03, // 3% chance for TM on Normal rematch
    rematchTMRateHard: 0.05    // 5% chance for TM on Hard rematch
  },

  // --- Held Items ---
  heldItems: {
    commonRate: 0.50,         // 50% chance for common wild held item
    rareRate: 0.05            // 5% chance for rare wild held item
  }
};
