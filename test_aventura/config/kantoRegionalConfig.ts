/**
 * test_aventura/config/kantoRegionalConfig.ts
 *
 * CANONICAL KANTO REGIONAL GENERATOR CONFIGURATION & CONSTANTS (SSoT)
 * Centralizes layout coordinates, PRNG primes, terrain sculpting parameters,
 * canonical prop offsets, building footprints, and ledges for procedural Kanto.
 */

export const MAX_CANONICAL_COORD_THRESHOLD = 2500;
export const DEFAULT_ROAD_WIDTH = 2;
export const DEFAULT_TREE_DENSITY = 0.7;
export const SETTLEMENT_CLEARANCE_RADIUS_TILES = 8;

export const MIN_PLATEAU_RADIUS = 1.5;
export const PLATEAU_PADDING_TILES = 2;
export const MOUNTAIN_NOISE_FREQUENCY = 0.22;
export const MOUNTAIN_NOISE_AMPLITUDE = 0.28;
export const MOUNTAIN_DIST_THRESHOLD = 1.05;

// Hashing Constants
export const HASH_MURMUR_PRIME_X = 374761393;
export const HASH_MURMUR_PRIME_Y = 668265263;
export const HASH_MURMUR_PRIME_Z = 1274126177;
export const HASH_BIT_SHIFT_A = 13;
export const HASH_BIT_SHIFT_B = 16;
export const INT32_MASK = 0x7fffffff;

// Fallback Tile & Pixel Coordinates for Canonical Kanto Landmarks
export const KANTO_FALLBACK_NODES = {
  pallet: { tx: 39, ty: 109, px: 1250, py: 3500 },
  viridian: { tx: 39, ty: 85, px: 1250, py: 2720 },
  pewter: { tx: 39, ty: 31, px: 1250, py: 1000 },
  cerulean: { tx: 62, ty: 50, px: 2000, py: 1625 },
  billshouse: { tx: 82, ty: 23, px: 2625, py: 750 },
  rocktunnel: { tx: 85, ty: 62, px: 2720, py: 2000 },
  indigo: { tx: 23, ty: 27, px: 750, py: 875 },
  seafoam: { tx: 50, ty: 125, px: 1600, py: 4000 },
  mtmoon: { tx: 62, ty: 31, px: 2000, py: 1000 },
  vermilion: { tx: 62, ty: 97, px: 2000, py: 3125 },
  celadon: { tx: 43, ty: 74, px: 1375, py: 2375 },
  saffron: { tx: 62, ty: 74, px: 2000, py: 2375 },
  lavender: { tx: 86, ty: 74, px: 2750, py: 2375 },
  fuchsia: { tx: 62, ty: 117, px: 2000, py: 3750 },
  cinnabar: { tx: 27, ty: 125, px: 875, py: 4000 },
  powerplant: { tx: 97, ty: 50, px: 3125, py: 1625 }
} as const;

// Mountain Plateau Sculpting Configurations
export const KANTO_PLATEAU_RANGES = {
  indigoRange: {
    base: { minX: 2, offsetTx: 5, minY: 8, maxY: 26, elev: 2 },
    peak: { offsetTxMin: -4, offsetTxMax: 4, minY: 10, maxY: 24, elev: 3 }
  },
  mtMoonMassif: {
    tier2: { offsetPwMin: 9, offsetCrMax: 8, minY: 8, offsetMmTy: -4, elev: 2 },
    tier3: { offsetPwMin: 12, offsetCrMax: 5, minY: 8, offsetMmTy: -9, elev: 3 },
    tier4: { offsetPwMin: 16, offsetCrMax: 2, minY: 9, offsetMmTy: -14, elev: 4 },
    westArm: { offsetMmMin: -13, offsetMmMax: -10, offsetMmTyMin: -4, offsetMmTyMax: 6, elev: 2 },
    southRidge: { offsetMmMin: -2, offsetCrMax: 8, offsetMmTyMin: 10, offsetMmTyMax: 13, elev: 2 }
  },
  capeCerulean: {
    tier2: { offsetCrMin: 6, offsetBhMax: 4, minY: 8, maxY: 18, elev: 2 },
    tier3: { offsetCrMin: 8, offsetBhMax: 2, minY: 10, maxY: 16, elev: 3 }
  },
  rockTunnel: {
    canyonNorth: { offsetCrMin: 9, offsetRtMax: -2, offsetCrTyMin: -6, offsetCrTyMax: -4, elev: 2 },
    canyonSouth: { offsetCrMin: 9, offsetRtMax: -3, offsetCrTyMin: 2, offsetCrTyMax: 5, elev: 2 },
    massifBase: { offsetRtMin: -4, offsetRtMax: 3, offsetRtTyMin: -12, offsetRtTyMax: 6, elev: 2 },
    massifPeak: { offsetRtMin: -2, offsetRtMax: 2, offsetRtTyMin: -8, offsetRtTyMax: 4, elev: 3 }
  },
  route22Ridge: {
    tier2: { minX: 2, offsetVnMax: -18, offsetVnTyMin: -10, offsetVnTyMax: 6, elev: 2 },
    tier3: { minX: 2, offsetVnMax: -21, offsetVnTyMin: -8, offsetVnTyMax: 4, elev: 3 }
  },
  seafoamTwins: {
    offsets: [-4, 4] as const,
    halfExtent: 2,
    elev: 2
  },
  smoothingPasses: 2,
  minNeighborThreshold: 2
} as const;

// Hydrography Sculpting Configurations
export const KANTO_HYDROGRAPHY_CONFIG = {
  protection: {
    maxElev: 2,
    mtMoonMaxX: 70,
    mtMoonMaxY: 42
  },
  southOcean: {
    offsetTy: 1,
    waveFreq: 0.25,
    waveAmp: 1.5
  },
  route21Channel: {
    startOffsetTy: 5,
    endOffsetTy: 4,
    minOffsetTx: -7,
    maxOffsetTx: -2,
    wobbleThresholdTy: 8,
    wobbleFreq: 0.35,
    wobbleAmp: 1.5,
    channelLeftOffset: -6,
    channelRightOffset: -2
  },
  easternOcean: {
    minFallbackX: 88,
    startY: 45,
    shoreWobbleFreq: 0.28,
    shoreWobbleAmp: 2.2
  },
  vermilionBay: {
    startOffsetTy: 2,
    endOffsetTy: 8,
    minOffsetTx: -5,
    maxOffsetTx: 5,
    centerOffsetTy: 4,
    radius: 3.8
  },
  ceruleanRiver: {
    minY: 14,
    offsetTxMin: -2,
    offsetTxMax: 2,
    eastBranchOffsetTx: 2,
    eastBranchFreq: 0.2,
    eastBranchAmp: 1.2,
    eastBranchCenterDy: -2,
    eastBranchHalfSpan: 1
  },
  cinnabarIsland: {
    halfDy: 5,
    halfDx: 6,
    borderMinDx: 5,
    borderMinDy: 4
  },
  seafoamIslands: {
    offsets: [-4, 4] as const,
    halfSpan: 3,
    islandRadius: 3.2,
    grassRadius: 2.2
  },
  ponds: {
    viridian: { offsetTx: -6, offsetTy: 5, radius: 2.2 },
    fuchsia: { offsetTx: -6, offsetTy: -10, radius: 3.2 },
    vermilion: { offsetTx: -12, offsetTy: -6, radius: 2.6 },
    wobbleAngleMultiplier: 3,
    wobbleAmplitude: 0.2,
    radiusPadding: 2
  }
} as const;

// Road Network Configurations
export const KANTO_ROAD_CONFIG = {
  saffronBoulevard: {
    extent: 6,
    halfWidth: 1,
    bufferSize: 2
  },
  route1Corridor: {
    startOffsetTy: 8,
    endOffsetTy: -2,
    halfWidth: 5,
    midOffsetUpper: 4,
    midOffsetLower: -2,
    eastOffset: 3,
    westOffset: -2
  },
  rasterizer: {
    minCorridorRadius: 3,
    corridorPadding: 2,
    bufferSize: 2
  }
} as const;

// Tall Grass Configurations
export const KANTO_TALL_GRASS_CONFIG = {
  route1: [
    { minDx: -6, maxDx: -2, minDy: -13, maxDy: -10 },
    { minDx: 2, maxDx: 6, minDy: -13, maxDy: -10 },
    { minDx: 1, maxDx: 6, minDy: -19, maxDy: -16 },
    { minDx: 1, maxDx: 6, minDy: -26, maxDy: -23 },
    { minDx: -6, maxDx: -2, minDy: -27, maxDy: -24 }
  ] as const,
  wildRoutes: {
    margin: 4,
    step: 2,
    seedOffset: 707,
    presenceThreshold: 0.30,
    sideThreshold: 0.65,
    sideOffsetPositive: 2,
    sideOffsetNegative: -2,
    halfSpan: 1
  }
} as const;

// Bridges Configurations
export const KANTO_BRIDGES_CONFIG = {
  nuggetBridge: { dx: -32, dy: -160, w: 64, h: 120 },
  harborPier: { dx: -32, dy: 70, w: 64, h: 110 }
} as const;

// Pewter Plaza Stone Bounds
export const PEWTER_PLAZA_BOUNDS = {
  minDy: -7,
  maxDy: 4,
  minDx: -7,
  maxDx: 5
} as const;

// Route 1 Infrastructure Offsets
export const ROUTE_1_INFRASTRUCTURE = {
  exitFenceLeft: { minDx: -6, maxDx: -2, offsetTy: -9 },
  exitFenceRight: { minDx: 2, maxDx: 6, offsetTy: -9 },
  labFence: { minDx: -6, maxDx: -2, offsetTy: 0 },
  flowerbed: { minDx: -5, maxDx: -2, minDy: 1, maxDy: 2 },
  lowerFence: { minDx: 1, maxDx: 6, offsetTy: 7 },
  mailboxes: [
    { dx: -7, dy: -3 },
    { dx: 1, dy: -3 }
  ] as const,
  signposts: [
    { dx: -6, dy: 3 },
    { dx: -1, dy: -8 }
  ] as const,
  flowers: [
    { dx: -5, dy: -14 },
    { dx: 5, dy: -18 }
  ] as const
} as const;

// Mt. Moon Infrastructure Offsets
export const MT_MOON_INFRASTRUCTURE = {
  pathWestApproach: { x0: -7, y0: 8, x1: -7, y1: 3 },
  pathCenterApproach: { x0: -7, y0: 1, x1: 0, y1: 1 },
  pathCaveApproach: { x0: 0, y0: 1, x1: 0, y1: -3 },
  caveEntrance: { dx: 0, dy: -5, w: 32, h: 64 },
  stairs: { dx: 5, dy: -4, w: 64, h: 32 },
  signpost: { dx: -1, dy: -2, w: 32, h: 32 },
  boulders: [
    { dx: -9, dy: -1, w: 32, h: 32 },
    { dx: -3, dy: 3, w: 32, h: 32 },
    { dx: 3, dy: -1, w: 32, h: 32 },
    { dx: 6, dy: 4, w: 32, h: 32 }
  ] as const
} as const;

// Canonical Route 1 obstacle tree offsets (relative to Pallet Town tile)
export const ROUTE_1_OBSTACLE_TREES = [
  { dx: -3, dy: -14 },
  { dx: -3, dy: -17 },
  { dx: 2, dy: -20 },
  { dx: 3, dy: -20 }
] as const;

// Canonical Viridian City tree offsets (relative to Viridian City tile)
export const VIRIDIAN_CITY_TREES = [
  { style: 'poke_tree_oak_clean', dx: -7, dy: -6 },
  { style: 'poke_tree_oak_clean', dx: -5, dy: -6 },
  { style: 'poke_tree_oak_clean', dx: -3, dy: -6 },
  { style: 'poke_tree_oak_clean', dx: 7, dy: 2 },
  { style: 'poke_tree_oak_clean', dx: 7, dy: -4 },
  { style: 'poke_tree_cuttable', dx: -2, dy: 1 }
] as const;

// Canonical Snorlax & landmark prop placements
export const CANONICAL_PROP_OFFSETS = {
  route12Snorlax: { dx: -10, dy: 40 },
  route16Snorlax: { dx: 30, dy: -10 },
  vermilionCutTree: { dx: -120, dy: 25 },
  streetLampLeft: { dx: -50, dy: -10 },
  streetLampRight: { dx: 50, dy: -10 }
} as const;

// Viridian Forest framing bounds
export const VIRIDIAN_FOREST_FRAMING = {
  minDy: -120,
  maxDy: 120,
  minDx: -100,
  maxDx: 100,
  stepPx: 32
} as const;

// Biome latitude transition parameters
export const BIOME_LATITUDE_TRANSITION = {
  centerGy: 36,
  divisor: 10,
  noiseFreq: 0.12,
  noiseAmp: 0.8,
  alpineThreshold: 0.1,
  seedOffset: 101,
  cliffBufferHoriz: 2,
  cliffBufferVert: 2
} as const;

// Canonical Settlement Building Footprints & Door Offsets
export const KANTO_CANONICAL_BUILDINGS = {
  pallet: [
    { style: 'house_red', dxTiles: -5, dyTiles: -4, w: 160, h: 160, door: { x: 2, y: 4 } },
    { style: 'house_blue', dxTiles: 2, dyTiles: -4, w: 160, h: 160, door: { x: 2, y: 4 } },
    { style: 'lab_oak', dxTiles: -1, dyTiles: 2, w: 224, h: 192, door: { x: 3, y: 5 } }
  ],
  viridian: [
    { style: 'gym', dxTiles: 3, dyTiles: -8, w: 192, h: 160, door: { x: 3, y: 5 } },
    { style: 'house_green', dxTiles: -6, dyTiles: -8, w: 160, h: 160, door: { x: 1, y: 5 } },
    { style: 'house_green', dxTiles: 3, dyTiles: -2, w: 160, h: 160, door: { x: 1, y: 5 } },
    { style: 'pokecenter', dxTiles: -6, dyTiles: 2, w: 160, h: 160, door: { x: 2, y: 5 } },
    { style: 'pokemart', dxTiles: 3, dyTiles: 4, w: 128, h: 128, door: { x: 2, y: 4 } }
  ],
  pewter: [
    { style: 'house_pewter_slate', dx: -220, dy: -220, w: 160, h: 160, door: { x: 1, y: 4 } },
    { style: 'mansion_school', dx: -40, dy: -200, w: 224, h: 256, door: { x: 3, y: 7 } },
    { style: 'gym_gold', dx: -160, dy: -30, w: 192, h: 160, door: { x: 3, y: 5 } },
    { style: 'pokecenter', dx: 50, dy: -40, w: 160, h: 160, door: { x: 2, y: 5 } },
    { style: 'pokemart', dx: -140, dy: 80, w: 128, h: 128, door: { x: 2, y: 4 } },
    { style: 'house_pewter_slate', dx: 60, dy: 80, w: 160, h: 160, door: { x: 1, y: 4 } }
  ],
  route2Gatehouse: { dx: -80, w: 160, h: 160, door: { x: 2, y: 4 } },
  mtMoonPokecenter: { dxTiles: -7, dyTiles: 1, w: 160, h: 160, door: { x: 2, y: 5 } },
  cerulean: [
    { style: 'gym', dx: -160, dy: -60, w: 192, h: 160, door: { x: 3, y: 5 } },
    { style: 'pokecenter', dx: 50, dy: -60, w: 160, h: 160, door: { x: 2, y: 5 } },
    { style: 'pokemart', dx: 50, dy: 60, w: 128, h: 128, door: { x: 2, y: 4 } }
  ],
  saffron: [
    { style: 'silph_tower', dx: -144, dy: -160, w: 288, h: 320, door: { x: 4, y: 10 } },
    { style: 'gym_gold', dx: 160, dy: -160, w: 192, h: 160, door: { x: 3, y: 5 } },
    { style: 'gym', dx: 160, dy: 40, w: 192, h: 160, door: { x: 3, y: 5 } },
    { style: 'pokecenter', dx: -320, dy: -160, w: 160, h: 160, door: { x: 2, y: 5 } },
    { style: 'pokemart', dx: -320, dy: 40, w: 128, h: 128, door: { x: 2, y: 4 } },
    { style: 'gatehouse_route', dx: -80, dy: -360, w: 160, h: 160, door: { x: 2, y: 4 } },
    { style: 'gatehouse_route', dx: -80, dy: 240, w: 160, h: 160, door: { x: 2, y: 4 } },
    { style: 'gatehouse_route', dx: 360, dy: -60, w: 160, h: 160, door: { x: 2, y: 4 } },
    { style: 'gatehouse_route', dx: -520, dy: -60, w: 160, h: 160, door: { x: 2, y: 4 } }
  ],
  celadon: [
    { style: 'game_corner', dx: -220, dy: -80, w: 224, h: 160, door: { x: 3, y: 5 } },
    { style: 'pokecenter', dx: 80, dy: -80, w: 160, h: 160, door: { x: 2, y: 5 } },
    { style: 'gym', dx: -220, dy: 100, w: 192, h: 160, door: { x: 3, y: 5 } },
    { style: 'gatehouse_route', dx: -420, dy: -60, w: 160, h: 160, door: { x: 2, y: 4 } }
  ],
  vermilion: [
    { style: 'gym', dx: -160, dy: 80, w: 192, h: 160, door: { x: 3, y: 5 } },
    { style: 'pokecenter', dx: 60, dy: -80, w: 160, h: 160, door: { x: 2, y: 5 } },
    { style: 'pokemart', dx: -150, dy: -80, w: 128, h: 128, door: { x: 2, y: 4 } }
  ],
  lavender: [
    { style: 'pokecenter', dx: -120, dy: -50, w: 160, h: 160, door: { x: 2, y: 5 } },
    { style: 'silph_tower', dx: 40, dy: -90, w: 288, h: 320, door: { x: 4, y: 10 } }
  ],
  fuchsia: [
    { style: 'gym', dx: -160, dy: -40, w: 192, h: 160, door: { x: 3, y: 5 } },
    { style: 'pokecenter', dx: 50, dy: -40, w: 160, h: 160, door: { x: 2, y: 5 } },
    { style: 'pokemart', dx: 50, dy: 60, w: 128, h: 128, door: { x: 2, y: 4 } }
  ],
  cinnabar: [
    { style: 'gym', dx: 40, dy: -80, w: 192, h: 160, door: { x: 3, y: 5 } },
    { style: 'pokecenter', dx: -110, dy: 20, w: 160, h: 160, door: { x: 2, y: 5 } }
  ],
  powerplant: { dx: -100, dy: -60, w: 320, h: 208, door: { x: 5, y: 6 } },
  billshouse: { dx: -50, dy: -50, w: 160, h: 160, door: { x: 1, y: 5 } },
  league: { dx: -160, dy: -80, w: 512, h: 208, door: { x: 8, y: 6 } }
} as const;

// Canonical Route 1 & Route 4 Ledges Offsets
export const KANTO_LEDGES_OFFSETS = {
  route1: [
    { dy: -11, dx0: -6, dx1: -3 },
    { dy: -11, dx0: 2, dx1: 6 },
    { dy: -16, dx0: -6, dx1: 0 },
    { dy: -22, dx0: 1, dx1: 6 },
    { dy: -27, dx0: -6, dx1: -2 }
  ],
  route4: [
    { dy: 2, dx0: -4, dx1: -1 },
    { dy: 5, dx0: -4, dx1: 1 },
    { dy: 5, dx0: 4, dx1: 10 },
    { dy: 8, dx0: 3, dx1: 10 }
  ]
} as const;


