/**
 * test_aventura/config/canonicalRegionTerrainConfig.ts
 *
 * CANONICAL REGIONAL TERRAIN SCULPTING CONSTANTS (SSoT)
 * Declares all geographical coordinates, bounds, noise parameters, and
 * architectural bounds for Kanto and Johto 1:1 authentic terrain sculpting.
 */

export const KANTO_TERRAIN_CONFIG = {
  // Latitude boundaries
  MAINLAND_MIN_Y: 16,
  MAINLAND_MAX_Y: 212,

  // West coast latitudes & baseline points
  WEST_INDIGO_MAX_Y: 55,
  WEST_INDIGO_BASE_X: 22,

  WEST_GULF_MAX_Y: 118,
  WEST_GULF_SWEEP_AMPLITUDE: 14,
  WEST_GULF_SPAN_Y: 63,

  WEST_ROUTE22_MAX_Y: 126,
  WEST_ROUTE22_BASE_X: 32,

  WEST_WOODS_MAX_Y: 178,
  WEST_WOODS_BASE_X: 58,
  WEST_PALLET_SOUTH_BASE_X: 92,

  // East coast latitudes & baseline points
  EAST_CAPE_MAX_Y: 42,
  EAST_CAPE_BASE_X: 212,

  EAST_ROCK_TUNNEL_MAX_Y: 95,
  EAST_ROCK_TUNNEL_BASE_X: 236,

  EAST_LAVENDER_MAX_Y: 125,
  EAST_LAVENDER_BASE_X: 222,

  EAST_COASTAL_MAX_Y: 195,
  EAST_COASTAL_SPAN_Y: 70,
  EAST_COASTAL_TAPER: 14,
  EAST_FUCHSIA_BASE_X: 192,

  // Coastal displacement noise
  COAST_NOISE_AMPLITUDE: 6,
  COAST_NOISE_SCALE: 0.045,
  BORDER_PADDING: 14,

  // Northern ocean falloff
  NORTH_OCEAN_REF_Y: 18,
  NORTH_OCEAN_AMP: 4,
  NORTH_OCEAN_SCALE: 0.06,

  // Northwest ocean falloff
  NW_OCEAN_MAX_Y: 22,
  NW_OCEAN_MAX_X: 45,
  NW_OCEAN_CENTER_X: 45,
  NW_OCEAN_CENTER_Y: 22,
  NW_OCEAN_RADIUS: 20,

  // Cerulean Bay
  CERULEAN_BAY_MAX_Y: 42,
  CERULEAN_BAY_MAX_X: 156,
  CERULEAN_BAY_MIN_X: 84,
  CERULEAN_BAY_INNER_Y: 32,
  CERULEAN_BAY_CENTER_X: 114,
  CERULEAN_BAY_RADIUS_X: 36,
  CERULEAN_BAY_CENTER_Y: 20,
  CERULEAN_BAY_RADIUS_Y: 16,

  // Vermilion Bay
  VERMILION_BAY_MIN_Y: 172,
  VERMILION_BAY_MIN_X: 148,
  VERMILION_BAY_MAX_X: 168,
  VERMILION_BAY_LEFT_SHORE: 150,
  VERMILION_BAY_RIGHT_SHORE: 168,
  VERMILION_BAY_FREQ_LEFT: 0.12,
  VERMILION_BAY_FREQ_RIGHT: 0.1,
  VERMILION_BAY_NOISE_SCALE: 0.08,

  // Cycling Road Marine Sound
  SOUND_MIN_Y: 128,
  SOUND_MAX_Y: 182,
  SOUND_MIN_X: 84,
  SOUND_MAX_X: 102,
  SOUND_CENTER_X: 93,
  SOUND_RADIUS_X: 7,
  SOUND_CENTER_Y: 152,
  SOUND_RADIUS_Y: 24,
  SOUND_NOISE_SCALE: 0.09,
  SOUND_NOISE_WEIGHT: 0.2,
  SOUND_OUTLET_MIN_Y: 174,
  SOUND_OUTLET_MAX_X: 92,

  // South Sea & Route 21 corridors
  SOUTH_SEA_MIN_Y: 212,
  SOUTH_SEA_MIN_X: 96,
  SOUTH_SEA_MAX_X: 196,
  ROUTE21_MIN_Y: 182,
  ROUTE21_MAX_X: 86,

  // Route 23 valley corridor
  VALLEY_MIN_Y: 55,
  VALLEY_MAX_Y: 124,
  VALLEY_MIN_X: 46,
  VALLEY_MAX_X: 52,

  // Cerulean Cape peninsula
  CAPE_MIN_Y: 16,
  CAPE_MAX_Y: 40,
  CAPE_MIN_X: 160,
  CAPE_MAX_X: 212,
  CAPE_AMP: 3,
  CAPE_SCALE: 0.08,
  CAPE_START_Y: 18,
  CAPE_END_Y: 38,

  // Cinnabar Island parameters
  CINNABAR_ISLAND_X: 54,
  CINNABAR_ISLAND_Y: 220,
  CINNABAR_ISLAND_RADIUS_X: 18,
  CINNABAR_ISLAND_RADIUS_Y: 15,
  CINNABAR_ISLAND_ROUGHNESS: 0.35,
  CINNABAR_ISLAND_ANGLE: -0.1,

  CINNABAR_TOWN_MIN_Y: 214,
  CINNABAR_TOWN_MAX_Y: 228,
  CINNABAR_TOWN_MIN_X: 46,
  CINNABAR_TOWN_MAX_X: 62,

  CINNABAR_PLATEAU_MIN_Y: 214,
  CINNABAR_PLATEAU_MAX_Y: 221,
  CINNABAR_PLATEAU_MIN_X: 46,
  CINNABAR_PLATEAU_MAX_X: 60,

  CINNABAR_GROUND_MIN_Y: 222,
  CINNABAR_GROUND_MAX_Y: 228,
  CINNABAR_GROUND_MIN_X: 46,
  CINNABAR_GROUND_MAX_X: 62,

  // Seafoam Islands Archipelago
  SEAFOAM_SEED: 202,
  SEAFOAM_ISLET_1: { cx: 104, cy: 220, radius: 7 },
  SEAFOAM_ISLET_2: { cx: 118, cy: 218, radius: 8 },
  SEAFOAM_ISLET_3: { cx: 128, cy: 222, radius: 5 },

  // Cerulean River
  RIVER_SEED: 777,
  RIVER_WIDTH: 3,
  RIVER_MEANDER: 0.25,
  RIVER_POINTS: [
    { x: 184, y: 14 },
    { x: 178, y: 32 },
    { x: 182, y: 44 },
    { x: 206, y: 50 },
    { x: 220, y: 64 },
    { x: 236, y: 72 }
  ],

  // Lakes
  VIRIDIAN_POND: { x: 52, y: 126, radius: 4, roughness: 0.25, seed: 404 },
  ROUTE22_POND: { x: 38, y: 78, radius: 3, roughness: 0.25, seed: 505 },

  // Mountain spines
  NORTHERN_SPINE: [
    { x: 22, y: 26 },
    { x: 48, y: 20 },
    { x: 78, y: 18 },
    { x: 114, y: 24 },
    { x: 148, y: 26 },
    { x: 180, y: 34 },
    { x: 206, y: 68 }
  ],
  WESTERN_SPINE: [
    { x: 22, y: 26 },
    { x: 24, y: 55 },
    { x: 26, y: 85 },
    { x: 30, y: 110 }
  ],

  // Flat reserves
  FLAT_RESERVES: [
    { x1: 58, y1: 30, x2: 90, y2: 56 },
    { x1: 150, y1: 40, x2: 182, y2: 66 },
    { x1: 190, y1: 20, x2: 214, y2: 40 },
    { x1: 218, y1: 66, x2: 238, y2: 86 },
    { x1: 196, y1: 102, x2: 222, y2: 124 },
    { x1: 98, y1: 96, x2: 136, y2: 130 },
    { x1: 146, y1: 96, x2: 184, y2: 130 },
    { x1: 150, y1: 146, x2: 180, y2: 172 },
    { x1: 60, y1: 72, x2: 86, y2: 98 },
    { x1: 60, y1: 114, x2: 90, y2: 140 },
    { x1: 60, y1: 160, x2: 86, y2: 182 },
    { x1: 162, y1: 190, x2: 192, y2: 216 },
    { x1: 42, y1: 210, x2: 66, y2: 232 }
  ],

  // Mountain noise modulation
  MOUNTAIN_NOISE_SCALE: 0.065,
  MOUNTAIN_NOISE_WEIGHT: 3.2,
  NORTH_RIDGE_MAX_DIST: 8.0,
  WEST_RIDGE_MAX_DIST: 8.5,
  MASSIF_NOISE_WEIGHT: 0.15,

  INDIGO_MASSIF: { cx: 42, rx: 18, cy: 38, ry: 16 },
  MT_MOON_MASSIF: { cx: 118, rx: 18, cy: 40, ry: 14 },
  ROCK_TUNNEL_MASSIF: { cx: 208, rx: 15, cy: 74, ry: 15 },

  // Cave niches
  MT_MOON_WEST_CLIFF: { minY: 42, maxY: 44, minX: 97, maxX: 103 },
  MT_MOON_WEST_GROUND: { minY: 45, maxY: 48, minX: 96, maxX: 104 },

  MT_MOON_EAST_CLIFF: { minY: 42, maxY: 44, minX: 131, maxX: 137 },
  MT_MOON_EAST_GROUND: { minY: 45, maxY: 48, minX: 130, maxX: 138 },

  ROCK_TUNNEL_NORTH_CLIFF: { minY: 52, maxY: 55, minX: 191, maxX: 197 },
  ROCK_TUNNEL_NORTH_GROUND: { minY: 56, maxY: 59, minX: 190, maxX: 198 },

  DIGLETT_CLIFF: { minY: 151, maxY: 153, minX: 122, maxX: 134 },
  DIGLETT_GROUND: { minY: 154, maxY: 158, minX: 122, maxX: 134 },

  VICTORY_ROAD_LOWER_CLIFF: { minY: 52, maxY: 54, minX: 39, maxX: 45 },
  VICTORY_ROAD_LOWER_GROUND: { minY: 55, maxY: 59, minX: 38, maxX: 46 },

  VICTORY_ROAD_UPPER_RIDGE: { minY: 37, maxY: 40, minX: 33, maxX: 39 },
  VICTORY_ROAD_UPPER_PLATEAU: { minY: 41, maxY: 46, minX: 33, maxX: 46 },

  POWER_PLANT_CHANNEL: { minY: 65, maxY: 72, minX: 224, maxX: 229 }
} as const;

export const JOHTO_TERRAIN_CONFIG = {
  MAINLAND_MIN_Y: 16,
  MAINLAND_MAX_Y: 114,
  MAINLAND_MIN_X: 28,
  MAINLAND_MAX_X: 120,

  CIANWOOD_MIN_Y: 80,
  CIANWOOD_MAX_Y: 94,
  CIANWOOD_MIN_X: 8,
  CIANWOOD_MAX_X: 20,

  WHIRL_MIN_Y: 82,
  WHIRL_MAX_Y: 90,
  WHIRL_MIN_X: 22,
  WHIRL_MAX_X: 27,

  LAKE_RAGE_MIN_Y: 18,
  LAKE_RAGE_MAX_Y: 30,
  LAKE_RAGE_MIN_X: 78,
  LAKE_RAGE_MAX_X: 92,

  MT_SILVER_MIN_Y: 56,
  MT_SILVER_MAX_Y: 80,
  MT_SILVER_MIN_X: 102,
  MT_SILVER_MAX_X: 126,

  MT_MORTAR_MIN_Y: 38,
  MT_MORTAR_MAX_Y: 48,
  MT_MORTAR_MIN_X: 66,
  MT_MORTAR_MAX_X: 78
} as const;

export const ROUTE_WAYPOINTS_CONFIG = {
  KANTO_R19_WATER_Y: 220,
  KANTO_R19_WATER_X_OFFSET: 8,
  KANTO_R20_WATER_Y: 220,
  KANTO_R21_WATER_Y: 170,

  CYCLING_ROAD_POINTS: [
    { x: 94, y: 124 },
    { x: 94, y: 178 },
    { x: 124, y: 188 },
    { x: 154, y: 196 }
  ],

  ROUTE11_15_POINTS: [
    { x: 196, y: 160 },
    { x: 202, y: 184 }
  ],

  ROUTE3_POINTS: [
    { x: 92, y: 47 },
    { x: 100, y: 47 }
  ],

  ROUTE4_POINTS: [
    { x: 134, y: 47 },
    { x: 142, y: 48 }
  ],

  ROUTE9_10_POINTS: [
    { x: 184, y: 58 },
    { x: 194, y: 58 }
  ],

  ROUTE10_POWERPLANT_POINTS: [{ x: 212, y: 64 }],

  ROUTE10_SOUTH_POINTS: [{ x: 204, y: 92 }],

  DIGLETT_POINTS: [
    { x: 134, y: 156 },
    { x: 126, y: 156 }
  ],

  ROUTE24_25_POINTS: [
    { x: 166, y: 28 },
    { x: 192, y: 28 }
  ],

  ROUTE22_23_POINTS: [
    { x: 48, y: 124 },
    { x: 48, y: 58 },
    { x: 42, y: 58 },
    { x: 42, y: 55 }
  ],

  INDIGO_AVENUE_POINTS: [
    { x: 36, y: 42 },
    { x: 42, y: 42 },
    { x: 42, y: 37 }
  ]
} as const;
