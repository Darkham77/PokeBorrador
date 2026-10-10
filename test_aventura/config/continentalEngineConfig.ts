/**
 * test_aventura/config/continentalEngineConfig.ts
 *
 * CONTINENTAL ENGINE CONFIGURATION (SSoT)
 * Centralizes world dimensions, cave snap radius, exclusion paddings,
 * and harbor beach dimensions for continentalEngine.ts.
 */

// --- Default World Dimensions ---
export const DEFAULT_CONTINENTAL_WORLD_WIDTH = 400 as const;
export const DEFAULT_CONTINENTAL_WORLD_HEIGHT = 400 as const;

// --- POI Placement & Search Radii ---
export const CAVE_SNAP_SEARCH_RADIUS = 16 as const;
export const ISLAND_SEED_OFFSET = 777 as const;
export const ARCHETYPE_PRIME_X = 31 as const;
export const ARCHETYPE_PRIME_Y = 17 as const;
export const MIN_DISTANCE_BETWEEN_CAVES = 15 as const;

// --- Corridor Routing Exclusion Zones ---
export const ROUTE_GATE_EXCLUSION_PADDING_X = 12 as const;
export const PORT_DOCK_EXCLUSION_PADDING_X = 10 as const;
export const PORT_DOCK_EXCLUSION_PADDING_BOTTOM = 15 as const;

// --- Coastal Beach & Harbor Padding ---
export const HARBOR_BEACH_PADDING_WEST = 12 as const;
export const HARBOR_BEACH_PADDING_EAST = 16 as const;
export const HARBOR_BEACH_PADDING_SOUTH = 16 as const;
