
/**
 * src/logic/pokemon/statEngine.ts
 * Centralized logic for pokemon statistics and multipliers.
 */

import { STAGE_MULT, ACC_STAGE_MULT } from '@/data/system/constants.ts'
export { STAGE_MULT, ACC_STAGE_MULT }

const MAX_STAGE_INDEX = 12;

/**
 * Get the multiplier for a stat stage (-6 to +6).
 * Index 6 is stage 0 (neutral).
 */
export function getStatMultiplier(stage: number): number {
  return STAGE_MULT[Math.max(0, Math.min(MAX_STAGE_INDEX, (stage || 0) + 6))] || 1;
}

/**
 * Get the multiplier for an accuracy/evasion stage (-6 to +6).
 */
export function getAccuracyMultiplier(stage: number): number {
  return ACC_STAGE_MULT[Math.max(0, Math.min(MAX_STAGE_INDEX, (stage || 0) + 6))] || 1;
}
