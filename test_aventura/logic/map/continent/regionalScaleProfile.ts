/**
 * test_aventura/logic/map/continent/regionalScaleProfile.ts
 *
 * PARAMETRIC SCALE PROFILES FOR GRAPH-FIRST CONTINENTAL WORLDS (SSoT)
 *
 * Adapts Pokémon topology complexity, landmass buffer, corridor width, and
 * gatehouse counts cleanly across 128x128, 256x256, and 400x400 map sizes.
 */

const REGIONAL_SCALE_TIER_LIST = ['compact_128', 'medium_256', 'continental_400'] as const;
export type RegionalScaleTier = (typeof REGIONAL_SCALE_TIER_LIST)[number];

export interface RegionalScaleProfile {
  readonly tier: RegionalScaleTier;
  readonly gymCount: number;
  readonly minCycles: number;
  readonly maxCycles: number;
  readonly minSecondaryNodes: number;
  readonly maxSecondaryNodes: number;
  readonly corridorRadius: number;
  readonly baseLandBuffer: number;
  readonly maxLandBuffer: number;
  readonly oceanPerimeterMargin: number;
  readonly minRouteGates: number;
  readonly maxRouteGates: number;
  readonly minGateSeparation: number;
}

const COMPACT_MAX_DIM_EXCLUSIVE = 200;
const MEDIUM_MAX_DIM_EXCLUSIVE = 340;

const SCALE_PROFILES: Readonly<Record<RegionalScaleTier, RegionalScaleProfile>> = {
  compact_128: {
    tier: 'compact_128',
    gymCount: 4,
    minCycles: 1,
    maxCycles: 2,
    minSecondaryNodes: 1,
    maxSecondaryNodes: 2,
    corridorRadius: 1,
    baseLandBuffer: 8,
    maxLandBuffer: 15,
    oceanPerimeterMargin: 10,
    minRouteGates: 1,
    maxRouteGates: 2,
    minGateSeparation: 18
  },
  medium_256: {
    tier: 'medium_256',
    gymCount: 6,
    minCycles: 2,
    maxCycles: 4,
    minSecondaryNodes: 2,
    maxSecondaryNodes: 3,
    corridorRadius: 2,
    baseLandBuffer: 20,
    maxLandBuffer: 38,
    oceanPerimeterMargin: 9,
    minRouteGates: 2,
    maxRouteGates: 3,
    minGateSeparation: 22
  },
  continental_400: {
    tier: 'continental_400',
    gymCount: 8,
    minCycles: 3,
    maxCycles: 5,
    minSecondaryNodes: 2,
    maxSecondaryNodes: 6,
    corridorRadius: 2,
    baseLandBuffer: 30,
    maxLandBuffer: 55,
    oceanPerimeterMargin: 12,
    minRouteGates: 2,
    maxRouteGates: 4,
    minGateSeparation: 28
  }
};

export function resolveRegionalScaleProfile(width: number, height: number): RegionalScaleProfile {
  const minDim = Math.min(width, height);
  if (minDim < COMPACT_MAX_DIM_EXCLUSIVE) return SCALE_PROFILES.compact_128;
  if (minDim < MEDIUM_MAX_DIM_EXCLUSIVE) return SCALE_PROFILES.medium_256;
  return SCALE_PROFILES.continental_400;
}
