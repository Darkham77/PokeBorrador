/**
 * SIMULATION & FUZZER TIMEOUT CONFIGURATION (SINGLE SOURCE OF TRUTH)
 *
 * CRITICAL RULE:
 * IT IS STRICTLY FORBIDDEN FOR ANY DEVELOPER OR AI AGENT TO MODIFY OR INFLATE THESE TIMEOUT VALUES
 * WITHOUT EXPLICIT USER APPROVAL OR UNLESS THE BATCH CONTAINS MORE THAN 150 TURNS TO SIMULATE.
 */

/** Maximum allowed time for an individual micro-action, turn step, or event reaction (Fail-Fast Rule). */
export const MAX_PER_ACTION_TIMEOUT_MS = 10000;

/** Maximum allowed total execution time for a full battle simulation suite/batch (3 Minutes statically). */
export const MAX_SUITE_TOTAL_TIMEOUT_MS = 180000;

/**
 * Calculates the suite timeout configured by parameter for a simulation:
 * - If there are turns to replay from a fuzzer (turnCount > 0), estimates the timeout based on the turn count.
 * - If there are NO pre-generated fuzzer turns to replay, uses MAX_SUITE_TOTAL_TIMEOUT_MS.
 */
export function getSuiteTimeoutForBatch(turnCount?: number): number {
  if (!turnCount || turnCount <= 0) {
    return MAX_SUITE_TOTAL_TIMEOUT_MS;
  }
  return Math.max(MAX_SUITE_TOTAL_TIMEOUT_MS, turnCount * MAX_PER_ACTION_TIMEOUT_MS);
}

/** Default timeout for UI locator click settling. */
export const MAX_UI_SETTLE_TIMEOUT_MS = 2000;

/** Default level for generated simulation mock Pokémon. */
export const MOCK_POKEMON_LEVEL = 5;

/** Default HP for generated simulation mock Pokémon. */
export const MOCK_POKEMON_HP = 20;

/** Default base stat for generated simulation mock Pokémon. */
export const MOCK_POKEMON_STAT = 10;

/** Animation speedup factor applied in Playwright battle simulations. */
export const SIMULATION_GSAP_TIME_SCALE = 100;

/** Maximum retries for resilient locator clicks in Playwright simulations. */
export const MAX_E2E_CLICK_RETRIES = 5;

/** Per-click attempt timeout in milliseconds. */
export const E2E_CLICK_TIMEOUT_MS = 1500;

/** Per-fallback focus/keypress attempt timeout in milliseconds. */
export const E2E_FALLBACK_TIMEOUT_MS = 1000;

/** Default seed value for LCG pseudo-random generator. */
export const DEFAULT_SEED_VAL = 12345;

/** Mersenne prime modulo (2^31 - 1) for LCG hashing. */
export const PRIME_MODULO_BASE = 2147483647;

/** Seed trigonometric scaling factor (10000). */
export const SEED_SCALE_MULTIPLIER = 10000;

/** Maximum Individual Value (IV) for generated simulation Pokémon (31). */
export const MAX_IV_VAL = 31;

/** Quantity of debug inventory items injected into battle simulation state (99). */
export const DEBUG_ITEM_MAX_QUANTITY = 99;

/** Default listing price for mock GTS listings. */
export const DEFAULT_MOCK_LISTING_PRICE = 1000;

/** Quantity of batch listings published directly in GTS test. */
export const GTS_BATCH_PUBLISH_LIMIT = 9;

/** Suite timeout for the complete multi-account GTS lifecycle in milliseconds (180s). */
export const GTS_SUITE_TIMEOUT_MS = 180000;

/** Initial seller money balance for GTS test setup. */
export const INITIAL_SELLER_MONEY = 100;

/** Total Pokemon count generated for seller setup in GTS test. */
export const SELLER_POKEMON_BATCH_COUNT = 12;

/** Total mock listings seeded for pagination test. */
export const MOCK_LISTINGS_POOL_SIZE = 50;

/** Initial buyer money balance for GTS test setup. */
export const INITIAL_BUYER_MONEY = 10000;

/** Expected buyer money balance after purchasing a 1000$ item (9000$). */
export const EXPECTED_BUYER_MONEY_AFTER_PURCHASE = 9000;

/** Divisor for converting milliseconds to seconds (1000). */
export const MS_TO_SECONDS_DIVISOR = 1000;

/** Index offset for Showdown bench switch slots (slot 2 = index 0). */
export const SWITCH_SLOT_INDEX_OFFSET = 2;

/** Balanced EV stat value for simulated test combatants (85). */
export const E2E_EV_BALANCED_VALUE = 85;

/** Maximum IV stat value for simulated test combatants (31). */
export const E2E_MAX_IV_VALUE = 31;

/** High dummy HP allocation for defender survival in damage comparison tests (10000 HP). */
export const HIGH_SURVIVAL_HP_CAP = 10000;

/** Default weather turn duration for damage calculation comparison (5 turns). */
export const DEFAULT_WEATHER_TURNS_COUNT = 5;

/** Rayquaza test level for search loop simulation (100). */
export const SUPER_RAYQUAZA_LEVEL = 100;

/** Rayquaza test HP value for search loop simulation (9999). */
export const SUPER_RAYQUAZA_MAX_HP = 9999;

/** Rayquaza test stat value for search loop simulation (999). */
export const SUPER_RAYQUAZA_STAT_VAL = 999;

/** Suite timeout for sequential search loop simulation (10 minutes for 10 encounters). */
export const SEARCH_LOOP_SUITE_TIMEOUT_MS = 600000;

/** Sequential battles count limit (10). */
export const E2E_SEQUENTIAL_BATTLES_COUNT_LIMIT = 10;
