/**
 * ITEM MECHANICS CONSTANTS (SINGLE SOURCE OF TRUTH)
 * Centralized constant definitions for item healing amounts, multipliers, and status effects.
 */

/** HP restored by a standard Potion. */
export const POTION_HEAL_HP = 20;

/** HP restored by a Super Potion. */
export const SUPER_POTION_HEAL_HP = 50;

/** HP restored by a Hyper Potion. */
export const HYPER_POTION_HEAL_HP = 200;

/** HP restored by Fresh Water. */
export const FRESHWATER_HEAL_HP = 30;

/** HP restored by Soda Pop. */
export const SODAPOP_HEAL_HP = 60;

/** HP restored by Lemonade. */
export const LEMONADE_HEAL_HP = 80;

/** Divisor for half-HP revival (50%). */
export const REVIVE_HALF_DIVISOR = 2;

/** PP restored by an Ether or Elixir. */
export const ETHER_PP_RESTORE = 10;

/** Max PP restore value cap. */
export const MAX_PP_RESTORE_CAP = 999;

/** Percentage multiplier for percentage-based healing items (e.g. 50%). */
export const PERCENTAGE_HEAL_HALF = 0.5;

/** Price refund multiplier when selling items back to Mart (50%). */
export const ITEM_SELL_REFUND_FACTOR = 0.5;

/** Stat boost multiplier applied by X-Stat battle items (50% boost). */
export const X_STAT_BOOST_MULTIPLIER = 1.5;

/** Default duration in turns for temporary item buff effects. */
export const ITEM_BUFF_DURATION_TURNS = 5;

/** Single level gain amount for rare candy. */
export const SINGLE_LEVEL_GAIN = 1;

/** Minimum vigor value threshold. */
export const MIN_VIGOR_VAL = 0;

/** Single vigor restoration amount. */
export const SINGLE_VIGOR_RESTORE = 1;

/** Buff duration for 5 minute items in seconds. */
export const BUFF_DURATION_5_MIN_SEC = 300;

/** Buff duration for 15 minute items in seconds. */
export const BUFF_DURATION_15_MIN_SEC = 900;

/** Buff duration for 20 minute items in seconds. */
export const BUFF_DURATION_20_MIN_SEC = 1200;

/** Buff duration for 30 minute items in seconds. */
export const BUFF_DURATION_30_MIN_SEC = 1800;

/** Buff duration for 40 minute items in seconds. */
export const BUFF_DURATION_40_MIN_SEC = 2400;

/** Buff duration for 60 minute items in seconds. */
export const BUFF_DURATION_60_MIN_SEC = 3600;

// --- Duration constants in milliseconds ---
/** Duration of 1 minute in milliseconds. */
export const ONE_MINUTE_MS = 60_000;

/** Duration of 30 minutes in milliseconds (30 * 60 * 1000). */
export const BUFF_DURATION_30_MIN_MS = 1_800_000;

/** Duration of 1 hour in milliseconds (3600 * 1000). */
export const ONE_HOUR_MS = 3_600_000;

/** Duration of 24 hours in milliseconds (24 * 3600 * 1000). */
export const DURATION_24_HOURS_MS = 86_400_000;

/** Duration of 2 minutes in milliseconds (2 * 60 * 1000). */
export const TWO_MINUTES_MS = 120_000;

/** Standard pokemart item purchase prices. */
export const ITEM_PRICES: Record<string, number> = {
  potion: 200,
  antidote: 100,
  paralyzeheal: 200,
  burnheal: 250,
  awakening: 250,
  iceheal: 250,
  superpotion: 600,
  fullheal: 600,
  hyperpotion: 1500,
  revive: 2000,
  maxpotion: 2500,
  fullrestore: 5000,
  revivemax: 3000,
  pokeball: 200,
  greatball: 500,
  ultraball: 1000
};

/** Trainer Level Tiers for unlocked inventory purchases. */
export const INVENTORY_LEVEL_TIERS = {
  SUPER_TIER: 15,
  HYPER_TIER: 30,
  ULTRA_BALL_TIER: 35,
  VETERAN_TIER: 50
} as const;
