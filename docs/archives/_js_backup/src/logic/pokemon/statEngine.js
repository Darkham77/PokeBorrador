/**
 * src/logic/pokemon/statEngine.js
 * Centralized logic for pokemon statistics and multipliers.
 */

// Stat stage multipliers (2/N to N/2)
export const STAGE_MULT = [0.25, 0.28, 0.33, 0.40, 0.50, 0.66, 1, 1.5, 2, 2.5, 3, 3.5, 4];

// Accuracy/Evasion multipliers (3/N to N/3)
export const ACC_STAGE_MULT = [0.33, 0.37, 0.43, 0.50, 0.60, 0.75, 1, 1.33, 1.66, 2, 2.33, 2.66, 3];

/**
 * Get the multiplier for a stat stage (-6 to +6).
 * Index 6 is stage 0 (neutral).
 */
export function getStatMultiplier(stage) {
  return STAGE_MULT[Math.max(0, Math.min(12, (stage || 0) + 6))];
}

/**
 * Get the multiplier for an accuracy/evasion stage (-6 to +6).
 */
export function getAccuracyMultiplier(stage) {
  return ACC_STAGE_MULT[Math.max(0, Math.min(12, (stage || 0) + 6))];
}
