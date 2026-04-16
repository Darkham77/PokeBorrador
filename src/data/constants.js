/**
 * CENTRALIZED GAME RATIOS & CHANCES
 * This file contains all the percentage chances and rates 
 * for the different mechanics of the game.
 */
export const GAME_RATIOS = {
  // --- Shiny ---
  // Shiny encounter rate. 2000 means 1 in 2000 chance.
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
    trainerRepel: 0.30        // 30% chance for trainer encounter when Repel is active (guaranteed encounter logic)
  },

  // --- Battle ---
  battle: {
    catchFormulaParams: {
      catchBaseMultiplier: 1.0, // A multiplier applied to the catch rate.
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

// ── Stat stage multipliers (2/N to N/2) ─────────────────────────
// Index 6 = stage 0 (neutral)
export const STAGE_MULT = [0.25, 0.28, 0.33, 0.40, 0.50, 0.66, 1, 1.5, 2, 2.5, 3, 3.5, 4];

// ── Accuracy/Evasion multipliers (3/N to N/3) ───────────────────
export const ACC_STAGE_MULT = [0.33, 0.37, 0.43, 0.50, 0.60, 0.75, 1, 1.33, 1.66, 2, 2.33, 2.66, 3];
