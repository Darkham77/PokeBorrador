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
  return Math.max(380, 1100 - (diffFactor * 7.5));
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
