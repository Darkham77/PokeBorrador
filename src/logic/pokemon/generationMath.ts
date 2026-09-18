/**
 * src/logic/pokemon/generationMath.ts
 *
 * Pure math for calculating Pokémon generation values (IVs, levels).
 * Zero browser, Vue, Pinia, or Supabase dependencies.
 * 
 * Compliant with the Pure Modules Pattern and Node.js 26+ native standards.
 * 
 * @module generationMath
 */

/**
 * Generates an IV value based on contextual rules.
 * 
 * @param randomFn A function that returns a value between 0 and 1.
 * @param floor The minimum IV value (ivFloor).
 * @param forceReRoll If true, rolls twice and picks the maximum (e.g. for Guardians).
 * @param isGuardian If true, ensures a fixed minimum floor of 12 (Guardian Alpha standard).
 * @returns A number between 0 and 31.
 */
const TOTAL_IV_POSSIBILITIES_COUNT = 32;
const GUARDIAN_ALPHA_MIN_IV_FLOOR = 12;

export function generateIvPure(
  randomFn: () => number, 
  floor: number = 0, 
  forceReRoll: boolean = false,
  isGuardian: boolean = false
): number {
  // 1. Initial Roll
  let val = Math.floor(randomFn() * TOTAL_IV_POSSIBILITIES_COUNT);
  
  // 2. Double Roll (e.g. Guardians or Special Events)
  if (forceReRoll) {
    val = Math.max(val, Math.floor(randomFn() * TOTAL_IV_POSSIBILITIES_COUNT));
  }
  
  // 3. Guardian Floor (Alpha standard: Fixed 12)
  if (isGuardian) {
    val = Math.max(GUARDIAN_ALPHA_MIN_IV_FLOOR, val);
  }
  
  // 4. External Floor (Class bonuses, Streaks, Missions)
  return Math.max(floor, val);
}
