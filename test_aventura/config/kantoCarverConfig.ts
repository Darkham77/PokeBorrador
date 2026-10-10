/**
 * test_aventura/config/kantoCarverConfig.ts
 *
 * PROCEDURAL CARVER DIMENSIONS & URBAN ARCHETYPE CONFIGURATION (SSoT)
 * Centralizes clearing radii, mountain barrier coordinates, building footprints,
 * and procedural urban layout templates for kantoProceduralCarver.ts.
 */

export const MOUNTAIN_BLOCK_RADIUS_TILES = 11;
export const DOOR_PATH_EXTENSION_STEPS = 2;
export const CA_SMOOTH_ISOLATED_LIMIT = 2;
export const CA_SMOOTH_FILL_LIMIT = 6;
export const ARCHETYPE_COUNT = 4;
export const DEFAULT_BRIDGE_TILE_SPAN = 32;

export const CLEARING_HALF_DIMENSIONS = {
  metropolis: { halfW: 18, halfH: 15 },
  bastion: { halfW: 15, halfH: 13 },
  port: { halfW: 13, halfH: 11 },
  village: { halfW: 12, halfH: 10 }
} as const;

export const MT_MOON_FOOT_RECT = {
  minDy: -3,
  maxDy: 6,
  minDx: -10,
  maxDx: 8
} as const;

export const COASTLINE_MARGIN_CONFIG = {
  left: { base: 4, freq: 0.18, amp: 2 },
  right: { offset: 5, freq: 0.22, seedMult: 2, amp: 2 },
  top: { base: 4, freq: 0.2, seedMult: 3, amp: 2 },
  bottom: { offset: 6, freq: 0.25, amp: 2.5 }
} as const;

export const NORTHERN_BARRIER_CONFIG = {
  minGy: 1,
  maxGy: 10,
  marginX: 3,
  minPassFactor: 0.44,
  maxPassFactor: 0.52,
  baseSpineY: 4.5,
  sinFreq: 0.18,
  sinAmp: 1.5,
  noiseFreqX: 0.12,
  noiseFreqY: 0.15,
  noiseAmp: 1.6,
  distCutoff: 3.2,
  tier3Cutoff: 1.7
} as const;

export const NORTH_WEST_RIDGE_CONFIG = {
  minGy: 5,
  maxGy: 22,
  minGx: 1,
  maxGx: 9,
  baseSpineX: 4.5,
  sinFreq: 0.22,
  sinAmp: 1.6,
  noiseFreqX: 0.15,
  noiseFreqY: 0.12,
  noiseAmp: 1.5,
  distCutoff: 3.0,
  tier3Cutoff: 1.6
} as const;

export const VOLCANIC_PENINSULA_CONFIG = {
  centerFactorX: 0.82,
  centerFactorY: 0.78,
  radiusTiles: 7,
  noiseFreq: 0.18,
  noiseAmp: 1.8,
  distCutoff: 5.8,
  tier3Cutoff: 3.2
} as const;

export const URBAN_ROAD_LAYOUTS = {
  metropolis: {
    nsRoad: { minDx: -1, minDy: -7, maxDx: 0, maxDy: 12 },
    ewRoad: { minDx: -9, minDy: 3, maxDx: 8, maxDy: 4 }
  },
  bastion: {
    nsRoad: { minDx: -1, minDy: -6, maxDx: 0, maxDy: 8 },
    ewRoad: { minDx: -7, minDy: 0, maxDx: 6, maxDy: 1 }
  },
  port: {
    nsRoad: { minDx: -1, minDy: -3, maxDx: 0, maxDy: 5 },
    ewRoad: { minDx: -7, minDy: -1, maxDx: 5, maxDy: 0 }
  },
  village: {
    nsRoad: { minDx: -1, minDy: -5, maxDx: 0, maxDy: 4 },
    ewRoad: { minDx: -7, minDy: 1, maxDx: 5, maxDy: 2 }
  }
} as const;

export const BUILDING_LAYOUTS = {
  metropolis: {
    silphTower: { style: 'silph_tower', dx: -144, dy: -200, w: 288, h: 320 },
    pokecenter: { style: 'pokecenter', dx: -280, dy: 140, w: 160, h: 160 },
    pokemart: { style: 'pokemart', dx: 120, dy: 140, w: 128, h: 128 },
    houseBlue: { style: 'house_blue', dx: -280, dy: 340, w: 160, h: 160 },
    houseRed: { style: 'house_red', dx: 120, dy: 340, w: 160, h: 160 }
  },
  bastion: {
    gym: { dx: -96, dy: -180, w: 192, h: 160 },
    pokecenter: { style: 'pokecenter', dx: -260, dy: 20, w: 160, h: 160 },
    pokemart: { style: 'pokemart', dx: 100, dy: 20, w: 128, h: 128 },
    house1: { dx: -260, dy: 210, w: 160, h: 160 },
    house2: { dx: 100, dy: 210, w: 160, h: 160 }
  },
  port: {
    pokecenter: { style: 'pokecenter', dx: -240, dy: -60, w: 160, h: 160 },
    pokemart: { style: 'pokemart', dx: 90, dy: -60, w: 128, h: 128 },
    houseTeal: { style: 'house_teal_bungalow', dx: -240, dy: 130, w: 160, h: 160 },
    houseOrange: { style: 'house_orange', dx: 90, dy: 130, w: 160, h: 160 },
    boardwalk: { steps: 3, dx: -16, dy: 140, stepY: 32, w: 32, h: 32 }
  },
  village: {
    lab: { dx: -112, dy: -180, w: 224, h: 192 },
    pokecenter: { style: 'pokecenter', dx: -240, dy: 40, w: 160, h: 160 },
    houseRed: { style: 'house_red', dx: 80, dy: 40, w: 160, h: 160 }
  }
} as const;

export const TOWN_PROPS_LAYOUTS = {
  metropolis: {
    lampLeft: { dx: -48, dy: 110 },
    lampRight: { dx: 48, dy: 110 },
    flowerLeft: { dx: -16, dy: 110 },
    flowerRight: { dx: 16, dy: 110 }
  },
  bastion: {
    lampLeft: { dx: -16, dy: -16 },
    lampRight: { dx: 16, dy: 32 },
    fence: { dx: -110, dy: 64 },
    mailbox: { dx: -96, dy: 64 }
  },
  port: {
    lamp: { dx: -32, dy: 140 }
  },
  village: {
    fence: { dx: 40, dy: 210 },
    mailbox: { dx: 70, dy: 210 },
    flowerLeft: { dx: -60, dy: 210 },
    flowerRight: { dx: 120, dy: 210 }
  }
} as const;

export const RELIEF_PROPS_CONFIG = {
  icefallCave: {
    passFactorX: 0.48,
    passGy: 7,
    dx: -16,
    dy: -20,
    size: 96
  },
  victoryStairs: {
    gx: 7,
    gy: 11,
    size: 64
  },
  volcanicPeninsula: {
    centerFactorX: 0.82,
    centerFactorY: 0.78,
    shrineDx: -80,
    shrineDy: -80,
    shrineSize: 192,
    coneDx: 48,
    coneDy: -90,
    coneW: 32,
    coneH: 48
  },
  nodeLamps: {
    offsetDx: 45,
    offsetDy: 35
  }
} as const;
