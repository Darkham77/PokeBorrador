export const MIN_INITIAL_ELO = 1000 as const;
export const ELO_K_FACTOR_DEFAULT = 32 as const;
export const ELO_K_FACTOR_HIGH = 16 as const;
export const ELO_HIGH_TIER_THRESHOLD = 2100 as const;
export const ELO_SCALE_BASE = 10 as const;
export const ELO_SCALE_DIVISOR = 400 as const;
export const ELO_SOFT_RESET_DIVISOR = 2 as const;

/**
 * Calculates the expected probability of victory for player A against opponent B.
 * Formula: E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 */
export function calculateExpectedScore(playerElo: number, opponentElo: number): number {
  const pElo = Number(playerElo) || MIN_INITIAL_ELO;
  const oElo = Number(opponentElo) || MIN_INITIAL_ELO;
  return 1 / (1 + Math.pow(ELO_SCALE_BASE, (oElo - pElo) / ELO_SCALE_DIVISOR));
}

/**
 * Computes the ELO points change (delta) for a match result.
 * Positive delta for victory, negative delta for defeat.
 */
export function calculateEloDelta(
  playerElo: number,
  opponentElo: number,
  won: boolean,
  customKFactor?: number
): number {
  const pElo = Number(playerElo) || MIN_INITIAL_ELO;
  const k = customKFactor ?? (pElo >= ELO_HIGH_TIER_THRESHOLD ? ELO_K_FACTOR_HIGH : ELO_K_FACTOR_DEFAULT);
  const expected = calculateExpectedScore(playerElo, opponentElo);
  const actual = won ? 1 : 0;
  return Math.round(k * (actual - expected));
}

/**
 * Applies an ELO delta guaranteeing the rating never descends below MIN_INITIAL_ELO (1000).
 */
export function applyEloDelta(currentElo: number, delta: number): number {
  const safeCurrent = Math.max(MIN_INITIAL_ELO, Number(currentElo) || MIN_INITIAL_ELO);
  return Math.max(MIN_INITIAL_ELO, safeCurrent + delta);
}

/**
 * Calculates the proportional soft reset ELO at the end of a monthly season.
 * Formula: Math.floor(max(1000, 1000 + (currentElo - 1000) / 2))
 */
export function calculateSoftResetElo(currentElo: number): number {
  const safeCurrent = Math.max(MIN_INITIAL_ELO, Number(currentElo) || MIN_INITIAL_ELO);
  return Math.floor(Math.max(MIN_INITIAL_ELO, MIN_INITIAL_ELO + (safeCurrent - MIN_INITIAL_ELO) / ELO_SOFT_RESET_DIVISOR));
}
