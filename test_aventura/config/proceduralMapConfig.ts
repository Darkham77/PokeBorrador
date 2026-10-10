/**
 * test_aventura/config/proceduralMapConfig.ts
 *
 * PROCEDURAL MAP GENERATOR CONFIGURATION (SSoT)
 * Centralizes minimum dimensions, default probabilities, route corridor ratios,
 * and decorative scattering thresholds for proceduralMapGenerator.ts.
 */

// --- Default Dimensions & Percentages ---
export const DEFAULT_PROCEDURAL_MAP_MIN_DIMENSION = 16 as const;
export const DEFAULT_PROCEDURAL_SEED = 42 as const;
export const DEFAULT_TOWN_MIN_DIMENSION = 25 as const;
export const DEFAULT_WATER_PERCENT = 12 as const;
export const DEFAULT_MOUNTAIN_PERCENT = 10 as const;
export const DEFAULT_PROCEDURAL_FOREST_PERCENT = 20 as const;
export const DEFAULT_CITY_PROPS_DENSITY = 50 as const;
export const DEFAULT_ROUTE_PROPS_DENSITY = 40 as const;
export const STANDARD_GBA_TILE_SIZE = 16 as const;

// --- Route Corridors & Grass Accents ---
export const GRASS_ACCENT_CHANCE = 0.04 as const;
export const ROUTE_BRANCH_X_RATIO = 0.38 as const;
export const ROUTE_PATH_WIDTH_DIVISOR = 12 as const;
export const ROUTE_START_X_BASE_RATIO = 0.42 as const;
export const ROUTE_START_X_VARIANCE_RATIO = 0.25 as const;
export const ROUTE_TURN_NORTH_RATIO = 0.65 as const;
export const ROUTE_TURN_SOUTH_RATIO = 0.35 as const;
export const ROUTE_TOWN_CENTER_EXCLUSION_RATIO = 0.35 as const;

// --- Mountain Cones & Jumpable Ledges ---
export const MOUNTAIN_CONE_CELLS_DIVISOR = 15 as const;
export const MIN_INTERIOR_TREES_MAP_DIMENSION = 20 as const;
export const ROUTE_LEDGE_NORTH_RATIO = 0.35 as const;
export const ROUTE_LEDGE_SOUTH_RATIO = 0.65 as const;
export const ROUTE_LEDGE_WEST_RATIO = 0.42 as const;
export const ROUTE_LEDGE_EAST_RATIO = 0.58 as const;
export const ROUTE_LEDGE_ALT_CHANCE = 0.35 as const;

// --- Flora & Minor Props Scattering ---
export const TALL_GRASS_SKIP_CHANCE = 0.05 as const;
export const ROAD_FLOWER_CHANCE = 0.45 as const;
export const SCATTER_BUSH_CHANCE = 0.02 as const;
export const SCATTER_ROCK_CHANCE = 0.035 as const;
