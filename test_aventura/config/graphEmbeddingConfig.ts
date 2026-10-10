/**
 * test_aventura/config/graphEmbeddingConfig.ts
 *
 * ORTHOGONAL GRAPH EMBEDDING CONFIGURATION (SSoT)
 * Centralizes layout thresholds, node footprint dimensions by role,
 * corridor jog constants, and routing penalty factors for orthogonalGraphEmbedding.ts.
 */

// --- Band Grid & Clustered Layout ---
export const LARGE_MAP_THRESHOLD_TILES = 256 as const;
export const LARGE_MAP_MARGIN_RATIO = 0.15 as const;
export const STANDARD_MAP_MARGIN_RATIO = 0.08 as const;
export const CLUSTER_SINE_AMPLITUDE = 0.08 as const;
export const LARGE_GRID_X_THRESHOLD = 200 as const;

// --- Node Footprint Dimensions by Settlement Role ---
export const LEAGUE_LARGE_WIDTH = 28 as const;
export const LEAGUE_NORMAL_WIDTH = 22 as const;
export const LEAGUE_LARGE_HEIGHT = 24 as const;
export const LEAGUE_NORMAL_HEIGHT = 20 as const;

export const CITY_LARGE_WIDTH = 22 as const;
export const CITY_NORMAL_WIDTH = 16 as const;
export const CITY_LARGE_HEIGHT = 18 as const;
export const CITY_NORMAL_HEIGHT = 14 as const;

export const STARTER_LARGE_WIDTH = 16 as const;
export const STARTER_NORMAL_WIDTH = 12 as const;
export const STARTER_LARGE_HEIGHT = 14 as const;
export const STARTER_NORMAL_HEIGHT = 12 as const;

export const DEFAULT_LARGE_NODE_DIMENSION = 10 as const;

// --- Hashing & PRNG Factors ---
export const HASH_PRIME_FACTOR = 31 as const;
export const JOG_PRNG_FACTOR_X = 12.9898 as const;
export const JOG_PRNG_OFFSET = 78.233 as const;

// --- Corridor Step-Jogs & Penalties ---
export const CORRIDOR_JOG_MIN_LENGTH = 36 as const;
export const CORRIDOR_JOG_DIST = 4 as const;
export const CORRIDOR_SPLIT_PRIMARY_RATIO = 0.35 as const;
export const CORRIDOR_SPLIT_SECONDARY_RATIO = 0.65 as const;
export const CORNER_NODE_COLLISION_PENALTY = 10 as const;
