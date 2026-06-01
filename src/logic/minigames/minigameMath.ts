/**
 * Core mathematical formulas for game minigames (Fishing, Archaeology, etc.).
 * These functions are pure and have no side effects or framework dependencies,
 * making them fully testable via native test runners.
 */

/**
 * Calculates the total number of notes for the fishing minigame based on the encounter rarity.
 * Lower rarity means harder (rarer Pokemon), which results in fewer notes, but they scale accordingly.
 * 
 * @param rarity - The Pokemon's spawn percentage (1 to 100).
 * @returns The total number of notes to hit (integer between 5 and 22).
 */
/**
 * Calculates the total number of notes for the fishing minigame based on the encounter rarity.
 * Lower rarity means harder (rarer Pokemon), which results in more notes.
 * 
 * @param rarity - The Pokemon's spawn percentage (1 to 100).
 * @returns The total number of notes to hit (integer between 5 and 22).
 */
export function calculateFishingTotalNotes(rarity: number): number {
  const safeRarity = Math.max(1, Math.min(100, rarity));
  const diffFactor = 101 - safeRarity;
  return Math.min(22, 5 + Math.floor(diffFactor / 7));
}

/**
 * Calculates the collapse speed base duration (in milliseconds) for the outer ring.
 * Lower rarity means harder (rarer Pokemon), which results in faster collapse times (smaller duration).
 * 
 * @param rarity - The Pokemon's spawn percentage (1 to 100).
 * @returns The base duration in ms (between 380 and 1100).
 */
export function calculateFishingSpeedBase(rarity: number): number {
  const safeRarity = Math.max(1, Math.min(100, rarity));
  const diffFactor = 101 - safeRarity;
  return Math.round(Math.max(380, 1100 - (diffFactor * 7.5)) * 1.1);
}

/**
 * Calculates the hit timing window (in milliseconds) for a perfect or good catch.
 * Lower rarity means harder (rarer Pokemon), which yields a smaller hit window.
 * 
 * @param rarity - The Pokemon's spawn percentage (1 to 100).
 * @returns The size of the hit window in ms (between 100 and 190).
 */
export function calculateFishingHitWindow(rarity: number): number {
  const safeRarity = Math.max(1, Math.min(100, rarity));
  const diffFactor = 101 - safeRarity;
  return Math.max(100, 190 - (diffFactor / 1.3));
}

/**
 * Calculates the archaeology encounter chance based on environment tags.
 * 10% in caves, 5% in mountains, 0% otherwise.
 * 
 * @param isCave - True if the map is a cave.
 * @param isMountain - True if the map is a mountain.
 * @returns The encounter probability (0.0, 0.05, or 0.10).
 */
export function calculateArchaeologyEncounterRate(isCave: boolean, isMountain: boolean): number {
  if (isCave) return 0.10;
  if (isMountain) return 0.05;
  return 0.00;
}

/**
 * Calculates the fossil cloning cost based on the number of extra fossils sacrificed.
 * Formula: $3000 + $1000 * N (clamped to max 6 extra).
 * 
 * @param extraQty - Number of extra fossils (0 to 6).
 * @returns The total cost in coins.
 */
export function calculateCloningCost(extraQty: number): number {
  const safeQty = Math.max(0, Math.min(6, extraQty));
  return 3000 + 1000 * safeQty;
}

/**
 * Calculates the number of IV rerolls for cloning.
 * Base rolls: 1 + floor(extraQty / 2).
 * If extraQty is odd (1, 3, 5), there is a 50% chance of one extra roll.
 * 
 * @param extraQty - Number of extra fossils sacrificed (0 to 6).
 * @param randomSource - Optional random source for deterministic tests (returns 0.0 to 1.0).
 * @returns The total number of rolls (between 1 and 4).
 */
export function calculateCloningRerolls(extraQty: number, randomSource: () => number = Math.random): number {
  const safeQty = Math.max(0, Math.min(6, extraQty));
  const baseRolls = 1 + Math.floor(safeQty / 2);
  const isOdd = safeQty % 2 !== 0;
  if (isOdd && randomSource() < 0.5) {
    return baseRolls + 1;
  }
  return baseRolls;
}

/**
 * Calculates the shiny probability for a cloned Pokemon.
 * Base chance: 1 / 4096.
 * Multiplier: 1 + 0.25 * N (up to 2.5x with N = 6).
 * 
 * @param extraQty - Number of extra fossils sacrificed (0 to 6).
 * @returns The probability as a decimal.
 */
export function calculateCloningShinyChance(extraQty: number): number {
  const safeQty = Math.max(0, Math.min(6, extraQty));
  const multiplier = 1 + 0.25 * safeQty;
  return multiplier / 4096;
}
