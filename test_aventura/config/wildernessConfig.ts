/**
 * test_aventura/config/wildernessConfig.ts
 *
 * Single Source of Truth for Wilderness, Vegetation & Tree Placement constants.
 * Governs tall grass patch distributions, cellular automata forest consolidation,
 * tree species dimensions, and roadside prop dispersion thresholds.
 */

// --- Seeds & PRNG Offsets ---
export const WILDERNESS_DEFAULT_SEED = 42 as const;
export const WILDERNESS_PRNG_OFFSET = 555 as const;

// --- Tall Grass Patch Distribution ---
export const MIN_TALL_GRASS_PATCH_SEPARATION = 4 as const;
export const TALL_GRASS_MIN_PATCHES = 16 as const;
export const TALL_GRASS_MAX_PATCHES = 220 as const;
export const TALL_GRASS_DENSITY_DIVISOR = 450 as const;

export const TALL_GRASS_WIDTH_MIN = 4 as const;
export const TALL_GRASS_WIDTH_VARIANCE = 5 as const;
export const TALL_GRASS_HEIGHT_MIN = 3 as const;
export const TALL_GRASS_HEIGHT_VARIANCE = 4 as const;

export const TALL_GRASS_PATH_DIST_MIN = 1.0 as const;
export const TALL_GRASS_PATH_DIST_MAX = 6.0 as const;
export const TALL_GRASS_SEARCH_RADIUS = 6 as const;
export const TALL_GRASS_NOISE_SCALE = 0.12 as const;
export const TALL_GRASS_MIN_DENSITY_RATIO = 0.45 as const;

export const TALL_GRASS_SHUFFLE_PRIMARY_FACTOR = 12.34 as const;
export const TALL_GRASS_SHUFFLE_SECONDARY_FACTOR = 56.78 as const;
export const TALL_GRASS_SHUFFLE_LARGE = 100000 as const;
export const PARSE_INT_DECIMAL_RADIX = 10 as const;

export const TALL_GRASS_PRUNE_MIN_NEIGHBORS = 2 as const;
export const TALL_GRASS_PRUNE_ITERATIONS = 2 as const;
export const TALL_GRASS_CANDIDATE_SEARCH_MARGIN_MIN = 4 as const;
export const TALL_GRASS_CANDIDATE_SEARCH_MARGIN_MAX = 8 as const;

// --- Dungeon Forest Clearings & Margins ---
export const MIN_LARGE_FOREST_DUNGEON_DIMENSION = 14 as const;
export const FOREST_DUNGEON_TRAIL_MARGIN_RADIUS = 3 as const;
export const FOREST_DUNGEON_TRAIL_DIST_MIN = 1.2 as const;
export const FOREST_DUNGEON_TRAIL_DIST_MAX = 3.2 as const;
export const FOREST_DUNGEON_TRAIL_MARGIN_NOISE_SCALE = 0.35 as const;
export const FOREST_DUNGEON_TRAIL_MARGIN_NOISE_THRESHOLD = 0.4 as const;

// --- Roadside Props & Micro-Vignettes ---
export const ROUTE_GATE_PROPS_CLEARANCE_RADIUS = 16 as const;
export const ROUTE_GATE_CORRIDOR_LENGTH = 12 as const;
export const ROUTE_GATE_CORRIDOR_HALF_WIDTH = 2 as const;

export const ROADSIDE_PROP_CLEARANCE_DEFAULT = 2.0 as const;
export const ROADSIDE_SIGNPOST_CLEARANCE = 3.0 as const;
export const ROADSIDE_BOULDER_CLEARANCE = 2.5 as const;

export const CLIFF_BASE_BOULDER_NOISE_THRESHOLD = 0.38 as const;
export const CLIFF_BOULDER_NOISE_SCALE = 0.28 as const;
export const ROADSIDE_PROP_NOISE_SCALE = 0.35 as const;

// Roadside Prop Biome Noise Thresholds
export const DESERT_BOULDER_THRESHOLD = 0.55 as const;
export const VOLCANIC_BOULDER_THRESHOLD = 0.55 as const;

export const MINT_BUSH_THRESHOLD = 0.58 as const;
export const MINT_BOULDER_MIN = 0.36 as const;
export const MINT_BOULDER_MAX = 0.58 as const;

export const VIRIDIAN_BUSH_THRESHOLD = 0.5 as const;
export const VIRIDIAN_LOG_THRESHOLD = -0.52 as const;

export const MEADOW_ROUND_BUSH_THRESHOLD = 0.65 as const;
export const MEADOW_FERN_BUSH_THRESHOLD = -0.68 as const;
export const MEADOW_FLOWER_MIN = 0.46 as const;
export const MEADOW_FLOWER_MAX = 0.6 as const;

// --- Forest Canopy Cellular Automata & Grooves ---
export const GROVE_NOISE_SCALE = 0.08 as const;
export const GROVE_THRESHOLD_NEAR_PATH = -0.95 as const;
export const GROVE_THRESHOLD_DEFAULT = -0.75 as const;
export const FOREST_CA_ITERATIONS = 2 as const;
export const FOREST_CA_SURVIVE_MIN = 3 as const;
export const FOREST_CA_BORN_MIN = 5 as const;

// --- Tree Species Dimensions & Rules ---
export const PINE_WIDTH = 2 as const;
export const PINE_HEIGHT = 3 as const;
export const OAK_WIDTH = 3 as const;
export const OAK_HEIGHT = 4 as const;
export const TREE_TRUNK_HEIGHT = 2 as const;
export const TREE_SPECIES_ISOLATION_DISTANCE = 8 as const;

// Autumn Noise & Biome Transition Thresholds
export const AUTUMN_MACRO_NOISE_SCALE = 0.015 as const;
export const AUTUMN_MACRO_THRESHOLD = 0.28 as const;
export const AUTUMN_BUFFER_THRESHOLD = 0.2 as const;
export const AUTUMN_DENSE_TREE_THRESHOLD = 0.24 as const;

export const SUBTRACTIVE_WILDERNESS_BASE_THRESHOLD = -0.98 as const;
export const SUBTRACTIVE_WILDERNESS_PATH_THRESHOLD = -1.0 as const;
