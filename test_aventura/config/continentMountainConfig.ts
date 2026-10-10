/**
 * test_aventura/config/continentMountainConfig.ts
 *
 * CONTINENT MOUNTAIN ENGINE CONFIGURATION (SSoT)
 * Centralizes noise seed offsets, ridge scales, valley suppression factors,
 * quantile clamps, and League plateau dimensional constants for continentMountainEngine.ts.
 */

// --- Noise Seed Offsets ---
export const MOUNTAIN_NOISE_PRIMARY_SEED_OFFSET = 777 as const;
export const MOUNTAIN_NOISE_SECONDARY_SEED_OFFSET = 888 as const;
export const VALLEY_NOISE_SEED_OFFSET = 999 as const;

// --- Scale & Modulation Constants ---
export const MAX_MOUNTAIN_SCALE = 0.035 as const;
export const MIN_MOUNTAIN_SCALE = 0.022 as const;
export const RIDGE_AMPLITUDE_MULTIPLIER = 1.25 as const;
export const RIDGE_PRIMARY_WEIGHT = 0.85 as const;
export const RIDGE_SECONDARY_WEIGHT = 0.15 as const;

// --- Valley Suppression Factors ---
export const VALLEY_CENTER_SCALE_RATIO = 0.45 as const;
export const VALLEY_SUPP_RADIUS_LARGE = 0.35 as const;
export const VALLEY_SUPP_RADIUS_SMALL = 0.20 as const;
export const VALLEY_SECONDARY_SUPPRESSION_FACTOR = 0.50 as const;

// --- Quantile & Tier Thresholds ---
export const MIN_MOUNTAIN_PERCENT_CLAMP = 0.12 as const;
export const TIER_2_MOUNTAIN_COUNT_RATIO = 0.35 as const;
export const TIER_2_MIN_DELTA = 0.08 as const;
export const TIER_2_FALLBACK_DELTA = 0.15 as const;

// --- League Massif & Plateau Dimensions ---
export const LEAGUE_MASSIF_HEIGHT = 18 as const;
export const LEAGUE_PLATEAU_MIN_HEIGHT = 10 as const;

// --- Lake Relief & Mountain Clearance ---
export const LAKE_RIM_THRESHOLD_RATIO = 0.85 as const;
export const MAX_MOUNTAIN_CLEARANCE_DISTANCE = 15 as const;
