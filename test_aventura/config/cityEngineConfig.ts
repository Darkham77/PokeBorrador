/**
 * test_aventura/config/cityEngineConfig.ts
 *
 * Single Source of Truth for Organic City Engine configuration constants.
 * Governs settlement zoning, street layouts, micro-lot clearance, prop dimensions,
 * and procedural placement parameters.
 */

import type { UrbanBuildingType } from '../types/map/poiTypes.ts';

// --- Linear PRNG Generator Constants ---
export const CITY_RNG_PRIME = 31 as const;
export const CITY_RNG_MULT = 1664525 as const;
export const CITY_RNG_ADD = 1013904223 as const;
export const CITY_RNG_DENOM = 4294967296 as const;
export const CITY_DEFAULT_SEED = 1337 as const;

// --- BFS & Doorstep Clearance ---
export const DOOR_DOUBLE_WIDTH_THRESHOLD = 5 as const;
export const DOOR_OFFSET_SOUTH = 1 as const;
export const DOOR_OFFSET_NORTH = -1 as const;
export const DOOR_EXTRA_CLEARANCE_SOUTH = 2 as const;

export const BFS_CARDINAL_DIRS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0]
] as const;

// --- 2.5D Physical Separation Masks ---
export const CITY_LATERAL_CLEARANCE = 1 as const;
export const CITY_FRONT_CLEARANCE = 2 as const;
export const CITY_REAR_CLEARANCE = 1 as const;

// --- Micro-Lot Garden & Enclosures ---
export const GARDEN_MIN_SIZE = 3 as const;
export const GARDEN_GATE_GAP_X = 1 as const;

export interface GardenOffsetCandidate {
  readonly dx: number;
  readonly dy: number;
  readonly w: number;
  readonly h: number;
  readonly useBuildingWidth?: boolean;
}

export const GARDEN_CANDIDATES: readonly GardenOffsetCandidate[] = [
  { dx: 0, dy: 0, w: 4, h: 3 },
  { dx: 0, dy: 0, w: 3, h: 3 },
  { dx: -3, dy: 0, w: 3, h: 3 },
  { dx: -4, dy: 0, w: 4, h: 3 },
  { dx: 0, dy: -3, w: 0, h: 3, useBuildingWidth: true }
] as const;

// --- Prop Footprint Dimensions ---
export interface PropDimension {
  readonly w: number;
  readonly h: number;
}

export const PROP_DIM_FOUNTAIN: PropDimension = { w: 3, h: 3 } as const;
export const PROP_DIM_CRATES_STACK: PropDimension = { w: 3, h: 2 } as const;
export const PROP_DIM_CRATES_DOUBLE: PropDimension = { w: 2, h: 1 } as const;
export const PROP_DIM_BENCH_V: PropDimension = { w: 1, h: 2 } as const;
export const PROP_DIM_BENCH_H: PropDimension = { w: 2, h: 1 } as const;
export const PROP_DIM_STATUE: PropDimension = { w: 1, h: 2 } as const;
export const PROP_DIM_DEFAULT: PropDimension = { w: 1, h: 1 } as const;

// --- Urban Clearance & Anti-Clumping Thresholds ---
export const INTERSECTION_CLEARANCE_RADIUS = 3 as const;
export const LAMP_MIN_SPACING = 5.0 as const;

// --- Settlement Scale Classification ---
export const TOWN_COMPACT_10_WIDTH = 10 as const;
export const TOWN_COMPACT_10_HEIGHT = 10 as const;
export const TOWN_REGIONAL_MIN_SIZE = 11 as const;
export const TOWN_POND_MIN_WIDTH = 16 as const;
export const TOWN_POND_MIN_HEIGHT = 14 as const;
export const TOWN_POND_CLEARANCE_W = 6 as const;
export const TOWN_POND_CLEARANCE_H = 5 as const;

export const TOWN_10_HOUSE_B_X = 6 as const;
export const TOWN_10_HOUSE_Y = 1 as const;
export const TOWN_10_STREET_X1 = 4 as const;
export const TOWN_10_STREET_X2 = 5 as const;
export const TOWN_10_STREET_Y1 = 5 as const;
export const TOWN_10_STREET_Y2 = 6 as const;
export const TOWN_8_HOUSE_OFFSET = 4 as const;
export const TOWN_8_GARDEN_SIZE = 3 as const;

export const TOWN_STARTER_RIVAL_X = 7 as const;
export const TOWN_STARTER_LAB_X = 5 as const;
export const TOWN_STARTER_LAB_Y = 6 as const;
export const TOWN_STARTER_EXTRA_OFFSET_H = 5 as const;

export const TOWN_REGIONAL_COTTAGE_X = 7 as const;
export const TOWN_REGIONAL_MART_Y = 7 as const;
export const TOWN_REGIONAL_LANDMARK_X = 5 as const;
export const TOWN_REGIONAL_LANDMARK_Y = 7 as const;
export const TOWN_REGIONAL_STREET_OFFSET = 5 as const;
export const TOWN_TOWER_MIN_H = 18 as const;
export const TOWN_TOWER_MIN_W = 16 as const;
export const TOWN_TOWER_OFFSET_W = 8 as const;
export const TOWN_TOWER_MIN_X = 10 as const;

export const METROPOLIS_MIN_WIDTH = 24 as const;
export const METROPOLIS_MIN_HEIGHT = 20 as const;
export const METROPOLIS_EXPANDED_WIDTH = 28 as const;
export const METROPOLIS_TALL_HEIGHT = 23 as const;

// --- Metropolis Zoning Offsets ---
export const METROPOLIS_AVENUE_X = 10 as const;
export const METROPOLIS_AVENUE_Y1 = 12 as const;
export const METROPOLIS_AVENUE_Y2 = 13 as const;
export const METROPOLIS_EAST_AVENUE_X = 20 as const;

export const METROPOLIS_TOWER_X_EXPANDED = 11 as const;
export const METROPOLIS_TOWER_X_DEFAULT = 10 as const;
export const METROPOLIS_GYM_X_EXPANDED = 21 as const;
export const METROPOLIS_GYM_X_DEFAULT = 20 as const;

export const METROPOLIS_CORNER_X_EXPANDED = 21 as const;
export const METROPOLIS_CORNER_X_DEFAULT = 19 as const;
export const METROPOLIS_CORNER_Y_EXPANDED = 7 as const;
export const METROPOLIS_CORNER_Y_DEFAULT = 8 as const;

export const METROPOLIS_HOUSE_A_X = 6 as const;
export const METROPOLIS_HOUSE_A_Y = 14 as const;
export const METROPOLIS_HOUSE_B_X = 6 as const;
export const METROPOLIS_HOUSE_B_Y = 19 as const;
export const METROPOLIS_HOUSE_C_X = 1 as const;
export const METROPOLIS_HOUSE_C_Y = 19 as const;

export const METROPOLIS_CONDO_X_EXPANDED = 13 as const;
export const METROPOLIS_CONDO_X_DEFAULT = 18 as const;
export const METROPOLIS_CONDO_Y = 15 as const;

export const METROPOLIS_CENTER_X_EXPANDED = 22 as const;
export const METROPOLIS_CENTER_X_DEFAULT = 12 as const;
export const METROPOLIS_CENTER_Y = 15 as const;

export const METROPOLIS_PLAZA_FOUNTAIN_OFFSET_X = 14 as const;
export const METROPOLIS_PLAZA_FOUNTAIN_OFFSET_Y = 9 as const;
export const METROPOLIS_PLAZA_RADIUS_X_MIN = 3 as const;
export const METROPOLIS_PLAZA_RADIUS_X_MAX = 5 as const;
export const METROPOLIS_PLAZA_RADIUS_Y_MIN = 2 as const;
export const METROPOLIS_PLAZA_RADIUS_Y_MAX = 4 as const;

export interface MetropolisBenchSpot {
  readonly dx: number;
  readonly dy: number;
}

export const METROPOLIS_BENCH_SPOTS: readonly MetropolisBenchSpot[] = [
  { dx: 7, dy: 14 },
  { dx: 13, dy: 14 },
  { dx: 8, dy: 11 },
  { dx: 12, dy: 11 },
  { dx: 2, dy: 11 },
  { dx: 6, dy: 8 }
] as const;

// --- Density & Material Thresholds ---
export const URBAN_DENSITY_STONE_THRESHOLD = 0.6 as const;
export const COASTAL_WHARF_MARGIN_BOTTOM = 4 as const;
export const COASTAL_WHARF_MIN_MARGIN = 2 as const;
export const COASTAL_WHARF_NORTH_CROSS_MIN_Y = 8 as const;
export const RADIAL_PLAZA_HALF_SPAN_X = 3 as const;
export const RADIAL_PLAZA_HALF_SPAN_Y = 2 as const;

// --- Procedural Landmark Archetypes ---
export interface LandmarkArchetype {
  readonly key: string;
  readonly type: UrbanBuildingType;
}

export const CITY_LANDMARK_ARCHETYPES: readonly LandmarkArchetype[] = [
  { key: 'poke_bike_shop', type: 'bike_shop' },
  { key: 'poke_dojo', type: 'dojo' },
  { key: 'poke_fan_club', type: 'fan_club' },
  { key: 'poke_daycare', type: 'house' },
  { key: 'house_celadon_condo', type: 'condo' },
  { key: 'house_vermilion_ranch', type: 'house' },
  { key: 'poke_pokemon_tower', type: 'house' }
] as const;

// --- Sector Offsets & Dimensions ---
export const SECTOR_MIN_DIMENSION = 4 as const;
export const SECTOR_SOUTH_MARGIN = 6 as const;
export const SECTOR_EAST_MARGIN = 6 as const;
export const SECTOR_SOUTH_EXTRA_Y = 2 as const;
export const SECTOR_EAST_EXTRA_X = 2 as const;
export const AVENUE_BUFFER_WEST = 3 as const;
export const AVENUE_BUFFER_EAST = 2 as const;

export const RESIDENTIAL_TIER1_PRIMARY_HOUSE_RATIO = 0.3 as const;
export const RESIDENTIAL_TIER1_SECONDARY_HOUSE_RATIO = 0.4 as const;

// --- Benches & Lighting in Medium Cities ---
export const BENCH_TARGET_COUNT = 2 as const;
export const BENCH_OFFSET_X = 3 as const;
export const BENCH_OFFSET_Y_NEAR = 3 as const;
export const BENCH_OFFSET_Y_FAR = 4 as const;
export const SIDEWALK_AVENUE_NEGATIVE_OFFSET = 2 as const;
export const SIDEWALK_AVENUE_POSITIVE_OFFSET = 1 as const;

// --- Waterfront & Coastal Accents ---
export const WATERFRONT_HASH_X = 7 as const;
export const WATERFRONT_MOD_CRATES = 5 as const;
export const WATERFRONT_HASH_Y = 3 as const;
export const WATERFRONT_MOD_BENCH = 7 as const;

export const ISLAND_FLOWER_MAX_Y = 9 as const;
export const ISLAND_FLOWER_MAX_X = 15 as const;
export const CONTINENT_FLOWER_MAX_Y = 12 as const;
export const CONTINENT_FLOWER_MAX_X = 14 as const;

// --- Town 10 & Town 8 Prop Offsets ---
export const TOWN_10_FLOWER_A_X = 8 as const;
export const TOWN_10_FLOWER_B_Y = 8 as const;
export const TOWN_8_MAILBOX_Y = 6 as const;
export const TOWN_REGIONAL_LAB_X = 5 as const;
export const TOWN_REGIONAL_LAB_Y = 6 as const;
export const TOWN_REGIONAL_STATUE_B_X = 7 as const;
export const TOWN_REGIONAL_SIGNPOST_X = 6 as const;
export const TOWN_REGIONAL_FLOWER_X = 6 as const;
export const TOWN_REGIONAL_MAILBOX_X = 7 as const;
export const RESIDENTIAL_TIER1_HOUSE2_MARGIN = 6 as const;
export const LAMP_LEFT_MIN_HEIGHT = 8 as const;
