export const STUDIO_MAX_HISTORY_STEPS = 30;

/** Default seed for continental landmass generation. */
export const CONTINENT_DEFAULT_SEED = 42;

/** Default seed for micro-vignette, obstacle, and route ledge generation. */
export const DECORATION_DEFAULT_SEED = 1337;

/** Default mountain palette used in procedural elevation sculptors. */
export const DEFAULT_MOUNTAIN_PALETTE = 'brown' as const;

/** Default beach sand perimeter width in tiles. */
export const DEFAULT_BEACH_WIDTH = 3;

/** Default lake count for inland water generation. */
export const DEFAULT_LAKE_COUNT = 2;

/** Delay in seconds before resetting copy-to-clipboard button state. */
export const COPY_FEEDBACK_DELAY_SEC = 2.5;

/** Canonical tile size in pixels for canvas map rendering. */
export const CANVAS_TILE_SIZE = 32;

/** Canonical tile size in pixels for studio canvas viewports and tile processors. */
export const STUDIO_TILE_SIZE = 16;
export const TILE_CENTER_OFFSET = 8 as const;

/** Default debounce timeout in ms for interactive slider inputs. */
export const SLIDER_DEBOUNCE_DELAY_MS = 250;

/** Maximum boundary for random procedural seeds. */
export const MAX_RANDOM_SEED = 999999;

/** Zoom-in multiplier step for interactive viewports. */
export const VIEWPORT_ZOOM_IN_STEP = 1.15;

/** Zoom-out multiplier step for interactive viewports. */
export const VIEWPORT_ZOOM_OUT_STEP = 0.85;

/** Minimum zoom factor clamp for interactive viewports. */
export const MIN_VIEWPORT_ZOOM = 0.15;

/** Maximum zoom factor clamp for interactive viewports. */
export const MAX_VIEWPORT_ZOOM = 3.0;

/** Default width fallback in pixels for custom placed prefabs. */
export const DEFAULT_PREFAB_FALLBACK_WIDTH = 80;

/** Default height fallback in pixels for custom placed prefabs. */
export const DEFAULT_PREFAB_FALLBACK_HEIGHT = 60;

/** Default urban clearance radius in pixels around settlements. */
export const DEFAULT_URBAN_CLEARANCE_RADIUS_PX = 250;

/** Minimum plaza clearance radius in pixels for urban maquettes. */
export const MIN_PLAZA_CLEARANCE_RADIUS_PX = 260;

/** Additional clearance margin in pixels around civic plazas. */
export const PLAZA_MARGIN_CLEARANCE_PX = 20;

/** Default structure bounding size in pixels. */
export const DEFAULT_STRUCTURE_PX_SIZE = 128;

/** Maximum search radius in tiles for spiral building placement. */
export const MAX_PLACEMENT_SPIRAL_SEARCH_RADIUS = 12;

/** Default forest coverage percentage across wild biomes. */
export const DEFAULT_FOREST_PERCENT = 25;

/** Minimum forest density multiplier clamp. */
export const MIN_FOREST_DENSITY_MULTIPLIER = 0.1;

/** Coordinate scaling factor between node positions and canvas coordinates. */
export const WORLD_COORDINATE_SCALE_FACTOR = 2.5;

/** Plaza radius in tiles for metropolis settlements. */
export const METROPOLIS_PLAZA_RADIUS_TILES = 2;

/** Plaza radius in tiles for city settlements. */
export const CITY_PLAZA_RADIUS_TILES = 1;

/** Maximum buildable elevation layer before cliffs prevent structures. */
export const MAX_BUILDABLE_ELEVATION = 2;

/** Base tree spawn probability threshold. */
export const TREE_SPAWN_BASE_THRESHOLD = 0.60;

/** Probability threshold separating pine trees from oak trees. */
export const PINE_TREE_THRESHOLD = 0.4;

/** Clearance perimeter in tiles around roads and water where trees cannot spawn. */
export const TREE_CLEARANCE_RADIUS_TILES = 2;

/** PRNG Prime X multiplier for procedural hash distribution. */
export const HASH_PRIME_X = 374761393;

/** PRNG Prime Y multiplier for procedural hash distribution. */
export const HASH_PRIME_Y = 668265263;

/** PRNG Seed Prime multiplier for procedural hash distribution. */
export const HASH_SEED_PRIME = 91;

/** LCG Prime X multiplier for vegetation styling. */
export const LCG_PRIME_X = 1234567;

/** LCG Prime Y multiplier for vegetation styling. */
export const LCG_PRIME_Y = 7654321;

/** Divisor for normalizing 32-bit unsigned PRNG integers to [0, 1). */
export const UINT32_DIVISOR = 4294967296;

/** Inner rendering dimension in pixels for a 9-slice subtile preview. */
export const SUBTILE_INNER_SIZE = 14;
