/**
 * test_aventura/config/patchExtractorConfig.ts
 *
 * REAL CONTINENT PATCH EXTRACTOR CONFIGURATION (SSoT)
 * Centralizes fallback prefab dimensions, category quotas, priority scores,
 * and sentinel bounds for realContinentPatchExtractor.ts.
 */

// --- Fallback Prefab Dimensions ---
export const FALLBACK_TALL_TREE_WIDTH = 64 as const;
export const FALLBACK_TALL_TREE_HEIGHT = 96 as const;
export const FALLBACK_STANDARD_PROP_DIMENSION = 32 as const;

// --- Category Extraction Quotas ---
export const DEFAULT_MAX_PATCHES_PER_CATEGORY = 16 as const;
export const DEFAULT_MOUNTAIN_PATCH_LIMIT = 48 as const;

// --- Mountain Subtype Priority Scoring ---
export const MOUNTAIN_STAIRS_PRIORITY = 100 as const;
export const MOUNTAIN_TERRACE_CLIFF_PRIORITY = 95 as const;
export const MOUNTAIN_DOUBLE_CLIFF_PRIORITY = 85 as const;
export const MOUNTAIN_SOUTH_WALL_HIGH_PRIORITY = 80 as const;
export const MOUNTAIN_CORNER_HIGH_PRIORITY = 75 as const;
export const MOUNTAIN_ELEVATED_PLATEAU_PRIORITY = 70 as const;
export const MOUNTAIN_SOUTH_WALL_BASE_PRIORITY = 45 as const;
export const MOUNTAIN_CORNER_BASE_PRIORITY = 40 as const;
export const MOUNTAIN_BASE_CLIFF_PRIORITY = 30 as const;

// --- Sentinel Elevation Initializers ---
export const SENTINEL_MIN_ELEVATION = 999 as const;
export const SENTINEL_MAX_ELEVATION = -999 as const;

// --- Candidate Spatial Separation ---
export const MIN_CANDIDATE_POINT_DISTANCE = 6 as const;
