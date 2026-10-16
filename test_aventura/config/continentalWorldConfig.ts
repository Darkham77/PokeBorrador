/**
 * test_aventura/config/continentalWorldConfig.ts
 *
 * CONTINENTAL WORLD GENERATOR CONFIGURATION & CONSTANTS (SSoT)
 * Centralizes noise parameters, domain warping coefficients, PRNG hashes,
 * urban maquette placement, and road rasterization thresholds.
 */

import type { UrbanScale } from '../types/map/continentTypes.ts';

export const MULBERRY32_CONFIG = {
  stateIncrement: 0x6d2b79f5,
  shift15: 15,
  shift7: 7,
  mult61: 61,
  shift14: 14,
  divisor: 4294967296
} as const;

export const CONTINENTAL_SEED_OFFSETS = {
  prng: 3131,
  moist: 4040,
  ridge: 8080,
  coastal: 1212,
  urbanScatter: 9090,
  roadNoise: 42
} as const;

export const CONTINENTAL_ISLAND_TEMPLATES = [
  { baseX: 0.65, baseY: -0.6, baseR: 0.16, rVariance: 0.06, coordJitter: 0.2, centerOffset: 0.5 },
  { baseX: -0.65, baseY: 0.55, baseR: 0.15, rVariance: 0.05, coordJitter: 0.2, centerOffset: 0.5 },
  { baseX: 0.6, baseY: 0.62, baseR: 0.15, rVariance: 0.05, coordJitter: 0.2, centerOffset: 0.5 }
] as const;

export const CONTINENTAL_NOISE_CONFIG = {
  waterBaseThreshold: 0.28,
  waterThresholdOffsetPercent: 22,
  waterThresholdScaleFactor: 0.25,
  percentDivisor: 100,
  normCenterOffset: 0.5,
  normScale: 2,
  warpOffset: { x: 123, y: 456 },
  warpFbm: { octaves: 3, scale: 0.03, persistence: 0.55 },
  warpMultiplier: 0.42,
  boxFalloffWeightX: 0.95,
  boxFalloffWeightY: 0.9,
  distFalloffMax: 1.0,
  coastOffset: 80,
  coastFbm: { octaves: 4, scale: 0.05, persistence: 0.5 },
  bayOffset: 300,
  bayFbm: { octaves: 2, scale: 0.025, persistence: 0.5 },
  bayPenaltyThreshold: -0.2,
  bayPenaltyOffset: 0.2,
  bayPenaltyMultiplier: 1.5,
  coastWeight: 0.35,
  islandInfluenceFactor: 0.75,
  outerEdgeMarginMin: 1,
  outerEdgeMarginMaxOffset: 2,
  ridgeFbm: { octaves: 4, scale: 0.038, persistence: 0.55 },
  mountainBaseThreshold: 0.86,
  mountainFactor: 0.15,
  mountainWaterClearance: 0.1,
  moistOffset: 200,
  moistFbm: { octaves: 3, scale: 0.045, persistence: 0.55 },
  forestBaseThreshold: 0.1,
  forestPercentOffset: 25,
  forestFactor: 0.25
} as const;

export const CONTINENTAL_URBAN_SCATTER_CONFIG = {
  defaultTargetCount: 12,
  minDistancePx: 380,
  maxAttempts: 1500,
  edgeMarginRatio: 0.1,
  innerSpreadRatio: 0.8,
  relaxationAttemptThreshold: 400,
  clearanceDistInitial: 2,
  clearanceDistRelaxed: 1,
  farm: {
    tMultiplier: 60,
    tBase: 20,
    wMultiplier: 60,
    wBase: 10,
    mMetropolis: 80,
    mDefault: 20,
    fMultiplier: 50
  }
} as const;

export const CONTINENTAL_ROAD_NETWORK_CONFIG = {
  cycleChordDivisor: 2.5,
  maxChordWeightPx: 950,
  shortSegmentThreshold: 8,
  minSegmentLength: 1,
  waypointDivisor: 4,
  minWaypoints: 8,
  noiseScale: 0.15,
  displacementMultiplier: 3.5,
  maxMountainPerpShifts: 4,
  catmullRomStepsPerSegment: 6,
  nearCityRadiusTiles: 5,
  defaultRoadWidth: 2
} as const;

export interface MaquetteBuildingTemplate {
  readonly style: string;
  readonly dx: number;
  readonly dy: number;
  readonly w: number;
  readonly h: number;
  readonly door?: { readonly x: number; readonly y: number };
  readonly houseSlot?: { readonly offset: number; readonly fallback: string };
}

export interface MaquettePropTemplate {
  readonly style: string;
  readonly dx: number;
  readonly dy: number;
}

export const CONTINENTAL_MAQUETTE_LAYOUTS: Record<
  UrbanScale,
  {
    readonly buildings: readonly MaquetteBuildingTemplate[];
    readonly props: readonly MaquettePropTemplate[];
  }
> = {
  metropolis: {
    buildings: [
      { style: 'silph_tower', dx: -144, dy: -260, w: 288, h: 320, door: { x: 4, y: 9 } },
      { style: 'gym_gold', dx: -240, dy: 80, w: 192, h: 160, door: { x: 3, y: 4 } },
      { style: 'pokecenter', dx: 80, dy: 80, w: 160, h: 160, door: { x: 2, y: 4 } },
      { style: 'pokemart', dx: 80, dy: -100, w: 128, h: 128, door: { x: 2, y: 3 } },
      {
        style: 'house_blue',
        dx: -240,
        dy: -100,
        w: 160,
        h: 160,
        door: { x: 2, y: 4 },
        houseSlot: { offset: 1, fallback: 'house_blue' }
      },
      {
        style: 'house_red',
        dx: -80,
        dy: 260,
        w: 160,
        h: 160,
        door: { x: 2, y: 4 },
        houseSlot: { offset: 2, fallback: 'house_red' }
      }
    ],
    props: [
      { style: 'poke_street_lamp', dx: -60, dy: -20 },
      { style: 'poke_street_lamp', dx: 35, dy: -20 },
      { style: 'poke_bench', dx: -30, dy: 45 },
      { style: 'poke_bench', dx: 15, dy: 45 },
      { style: 'poke_flowers_red', dx: -50, dy: 15 },
      { style: 'poke_flowers_red', dx: 35, dy: 15 }
    ]
  },
  city: {
    buildings: [
      { style: 'gym', dx: -180, dy: -90, w: 192, h: 160, door: { x: 3, y: 4 } },
      { style: 'pokecenter', dx: 30, dy: -90, w: 160, h: 160, door: { x: 2, y: 4 } },
      { style: 'pokemart', dx: 50, dy: 90, w: 128, h: 128, door: { x: 2, y: 3 } },
      {
        style: 'house_green',
        dx: -170,
        dy: 90,
        w: 160,
        h: 160,
        door: { x: 2, y: 4 },
        houseSlot: { offset: 0, fallback: 'house_green' }
      }
    ],
    props: [
      { style: 'poke_street_lamp', dx: -10, dy: -20 },
      { style: 'poke_street_lamp', dx: -10, dy: 30 },
      { style: 'poke_mailbox', dx: -95, dy: 45 },
      { style: 'poke_flowers_red', dx: 5, dy: -20 }
    ]
  },
  town: {
    buildings: [
      { style: 'pokecenter', dx: -170, dy: -80, w: 160, h: 160, door: { x: 2, y: 4 } },
      { style: 'pokemart', dx: 40, dy: -80, w: 128, h: 128, door: { x: 2, y: 3 } },
      { style: 'house_blue', dx: -170, dy: 100, w: 160, h: 160, door: { x: 2, y: 4 } },
      {
        style: 'house_orange',
        dx: 40,
        dy: 100,
        w: 160,
        h: 160,
        door: { x: 2, y: 4 },
        houseSlot: { offset: 3, fallback: 'house_orange' }
      }
    ],
    props: [
      { style: 'poke_street_lamp', dx: -5, dy: -20 },
      { style: 'poke_flowers_red', dx: -85, dy: -10 },
      { style: 'poke_flowers_red', dx: 85, dy: -10 }
    ]
  },
  village: {
    buildings: [
      { style: 'pokecenter', dx: -170, dy: -80, w: 160, h: 160, door: { x: 2, y: 4 } },
      { style: 'house_red', dx: 30, dy: -80, w: 160, h: 160, door: { x: 2, y: 4 } },
      {
        style: 'cottage',
        dx: -70,
        dy: 100,
        w: 160,
        h: 160,
        door: { x: 2, y: 4 },
        houseSlot: { offset: 4, fallback: 'cottage' }
      }
    ],
    props: [
      { style: 'poke_fence_picket', dx: 5, dy: -30 },
      { style: 'poke_mailbox', dx: -85, dy: -30 },
      { style: 'poke_flowers_red', dx: -10, dy: 10 }
    ]
  },
  hamlet: {
    buildings: [
      { style: 'house_red', dx: -170, dy: -100, w: 160, h: 160, door: { x: 2, y: 4 } },
      { style: 'house_blue', dx: 30, dy: -100, w: 160, h: 160, door: { x: 2, y: 4 } },
      { style: 'lab_oak', dx: -112, dy: 80, w: 224, h: 192, door: { x: 3, y: 5 } }
    ],
    props: [
      { style: 'poke_mailbox', dx: -85, dy: -45 },
      { style: 'poke_mailbox', dx: 10, dy: -45 },
      { style: 'poke_flowers_red', dx: -35, dy: 10 }
    ]
  }
};

export interface ContinentalMaquetteConfig {
  readonly plazaSize: {
    readonly default: number;
    readonly metropolis: number;
    readonly city: number;
  };
  readonly hashMultipliers: {
    readonly x: number;
    readonly y: number;
    readonly seed: number;
  };
  readonly sidewalkMaxSteps: number;
}

export const CONTINENTAL_MAQUETTE_CONFIG: ContinentalMaquetteConfig = {
  plazaSize: {
    default: 64,
    metropolis: 128,
    city: 96
  },
  hashMultipliers: {
    x: 31,
    y: 57,
    seed: 101
  },
  sidewalkMaxSteps: 2
};

export interface ContinentalPipelineDefaults {
  readonly treeDensity: number;
  readonly roadWidth: number;
  readonly waterPercent: number;
  readonly mountainPercent: number;
  readonly forestPercent: number;
  readonly cityCount: number;
  readonly defaultSeed: number;
}

export const CONTINENTAL_PIPELINE_DEFAULTS: ContinentalPipelineDefaults = {
  treeDensity: 0.7,
  roadWidth: 2,
  waterPercent: 22,
  mountainPercent: 12,
  forestPercent: 25,
  cityCount: 12,
  defaultSeed: 42
};
