/**
 * test_aventura/config/poiPlacementConfig.ts
 *
 * POI PLACEMENT & REGIONAL SETTLEMENT CONFIGURATION (SSoT)
 * Centralizes thresholds, PRNG parameters, gateway offsets, settlement spacing,
 * and terrain scoring constants for poiPlacementEngine.ts.
 */

// --- Default Placement Parameters & PRNG LCG ---
export const DEFAULT_POI_TARGET_COUNT = 18 as const;
export const DEFAULT_POI_SEED = 42 as const;
export const POI_LCG_MULTIPLIER = 1664525 as const;
export const POI_LCG_INCREMENT = 1013904223 as const;
export const POI_LCG_DIVISOR = 4294967296 as const;

// --- Gateways & Avenue Alignment ---
export const METROPOLIS_GATEWAY_OFFSET = 10 as const;
export const CITY_GATEWAY_X = 7 as const;
export const CITY_GATEWAY_Y = 6 as const;

// --- Pokémon League Plateau & Massif Climax ---
export const REGIONAL_MIN_SCALE_LEAGUE = 64 as const;
export const LEAGUE_SEARCH_MAX_Y_RATIO = 0.38 as const;
export const LEAGUE_SEARCH_CENTER_Y_RATIO = 0.20 as const;
export const LEAGUE_ELEVATION_SCORE_WEIGHT = 10 as const;
export const LEAGUE_PLATEAU_HEIGHT_OFFSET = 12 as const;
export const LEAGUE_STAIRS_PRUNE_RADIUS = 30 as const;

// --- Archipelago & Cinnabar Island Footprint ---
export const CINNABAR_ISLAND_FOOTPRINT_WIDTH = 14 as const;
export const CINNABAR_ISLAND_FOOTPRINT_HEIGHT = 12 as const;

// --- Settlement Distances & Compact Thresholds ---
export const COMPACT_MAP_THRESHOLD = 64 as const;
export const COMPACT_METROPOLIS_MIN_DIST = 8 as const;
export const COMPACT_CITY_MIN_DIST = 6 as const;
export const COMPACT_TOWN_MIN_DIST = 4 as const;
export const COMPACT_DEFAULT_MIN_DIST = 3 as const;

export const STANDARD_METROPOLIS_MIN_DIST = 16 as const;
export const STANDARD_CITY_MIN_DIST = 12 as const;
export const STANDARD_TOWN_MIN_DIST = 7 as const;
export const STANDARD_DEFAULT_MIN_DIST = 5 as const;

export interface FootprintDimension {
  readonly w: number;
  readonly h: number;
}

export const METROPOLIS_FALLBACK_SIZES: readonly FootprintDimension[] = [
  { w: 22, h: 20 },
  { w: 20, h: 18 },
  { w: 18, h: 16 }
] as const;

// --- Dungeon Forests Footprints & Layout ---
export const FOREST_CANDIDATE_SIZES_MASSIVE: readonly FootprintDimension[] = [
  { w: 26, h: 34 },
  { w: 24, h: 30 },
  { w: 20, h: 26 },
  { w: 16, h: 16 }
] as const;

export const FOREST_CANDIDATE_SIZES_LARGE: readonly FootprintDimension[] = [
  { w: 20, h: 26 },
  { w: 16, h: 16 }
] as const;

export const COMPACT_MIN_FOREST_DIST = 4 as const;
export const STANDARD_MIN_FOREST_DIST = 8 as const;
export const FOREST_URBAN_LAYOUT_MIN_WIDTH = 16 as const;
export const FOREST_URBAN_LAYOUT_MIN_HEIGHT = 16 as const;

// --- Cave Entrances Distances ---
export const COMPACT_MIN_CAVE_DIST = 4 as const;
export const STANDARD_MIN_CAVE_DIST = 8 as const;

// --- Water Landmarks & Shore Search Limits ---
export const LAKE_SHORE_SEARCH_MAX_RADIUS = 10 as const;
export const COASTAL_SHORE_SEARCH_MAX_RADIUS = 16 as const;
export const COMPACT_MIN_LANDMARK_DIST = 6 as const;
export const STANDARD_MIN_LANDMARK_DIST = 8 as const;
export const WATER_LANDMARK_MAX_DIST_CLAMP = 24 as const;
export const WATER_LANDMARK_SCORE_BONUS = 1000 as const;

// --- Additional Spacing & Search Margins ---
export const DEFAULT_MIN_SETTLEMENT_DISTANCE = 6 as const;
export const LEAGUE_SEARCH_MARGIN = 6 as const;
export const CAVE_SEARCH_MARGIN_BOTTOM_RIGHT = 6 as const;
export const GATE_MIN_DISTANCE_TO_SETTLEMENT = 8 as const;
export const FALLBACK_MIN_DISTANCE_COMPACT = 4 as const;
export const FALLBACK_MIN_DISTANCE_DEFAULT = 8 as const;
