/**
 * src/logic/map/cityGeneSynthesizer.ts
 *
 * PROCEDURAL CITY GENE SYNTHESIZER
 *
 * Implements Phase 2 of the Heterogeneous City Engine:
 * Evaluates node context (scale, biome, elevation, water) and rolls continuous
 * procedural genes to ensure extreme visual variety across seeds and settlements.
 *
 * Strict Domain-Type-First governance:
 *   - Continuous degree-of-freedom vectors derived from deterministic Mulberry32.
 *   - Dynamic vignette budget allocation (2 to 10) scaling with settlement hierarchy.
 */

import type { POINode } from '../../types/map/poiTypes.ts';
import type { SettlementTerrainContext } from './cityLayoutEngine.ts';
import {
  type CityVignetteType,
  type VignetteSettlementScale,
  getCompatibleVignettes
} from './cityVignetteRegistry.ts';

// ---------------------------------------------------------------------------
// 1. Gene Contracts
// ---------------------------------------------------------------------------

export const WATER_FEATURE_TYPES = ['none', 'pond', 'canal', 'harbor_dock'] as const;
export type WaterFeatureType = (typeof WATER_FEATURE_TYPES)[number];

export const ELEVATION_POLICIES = ['flatten', 'multi_tier_stairs', 'cliff_perch'] as const;
export type ElevationPolicy = (typeof ELEVATION_POLICIES)[number];

export const STREET_PATTERNS = [
  'linear_boulevard',
  'radial_plaza',
  'coastal_wharf',
  'l_enclave',
  'axial_boulevard',
  'plaza_radial',
  'l_shape',
  'dispersed_cluster'
] as const;
export type StreetPattern = (typeof STREET_PATTERNS)[number];

export interface CityProceduralGenes {
  /** 0.0 = clear-cut / clean ground, 1.0 = deep woods with trees around houses */
  readonly canopyIntegration: number;
  /** Water body configuration */
  readonly waterFeatureType: WaterFeatureType;
  /** How topography elevation differences are handled */
  readonly elevationPolicy: ElevationPolicy;
  /** 0.0 = rustic grass and dirt trails, 1.0 = paved plazas, sidewalks, curbs */
  readonly urbanDensity: number;
  /** Primary street network morphology */
  readonly streetPattern: StreetPattern;
  /** Number of dynamic vignettes to assemble (2 to 10) */
  readonly vignetteBudget: number;
  /** Selected distinct vignettes for this settlement */
  readonly selectedVignettes: readonly CityVignetteType[];
}

// ---------------------------------------------------------------------------
// 2. Deterministic PRNG Helper
// ---------------------------------------------------------------------------

function createPrng(seed: number): () => number {
  let s = (seed >>> 0) || 1337;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return (s >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// 3. Gene Synthesizer
// ---------------------------------------------------------------------------

/**
 * Computes dynamic vignette budget based on settlement scale and footprint dimensions.
 * Large metropolises receive 6 to 9 vignettes; medium cities 4 to 6; rural towns 2 to 3.
 */
export function computeVignetteBudget(
  scale: VignetteSettlementScale,
  width: number,
  height: number
): number {
  const area = width * height;
  if (scale === 'metropolis' || area >= 500) {
    if (area >= 800) return 9;
    if (area >= 650) return 8;
    return 7;
  }
  if (scale === 'city' || area >= 200) {
    if (area >= 350) return 6;
    if (area >= 250) return 5;
    return 4;
  }
  // Rural towns / hamlets
  if (area >= 120) return 3;
  return 2;
}

/**
 * Analyzes local environmental context and synthesizes continuous procedural genes.
 */
export function synthesizeCityGenes(
  node: POINode,
  rngSeed: number,
  context?: SettlementTerrainContext
): CityProceduralGenes {
  // Combine rngSeed with node id for deterministic per-settlement PRNG
  let combinedSeed = rngSeed;
  for (let i = 0; i < node.id.length; i++) {
    combinedSeed = (combinedSeed * 31 + node.id.charCodeAt(i)) | 0;
  }
  const prng = createPrng(combinedSeed);

  const W = node.footprint.width;
  const H = node.footprint.height;

  // 1. Determine Scale
  const scale: VignetteSettlementScale =
    node.type === 'metropolis' ? 'metropolis' : node.type === 'city' ? 'city' : 'town';

  // 2. Detect Environmental Context from Terrain
  let hasWater = false;
  let hasElevation = false;
  let hasVegetation = false;

  if (context?.terrainMatrix) {
    for (let dy = -2; dy <= H + 2; dy++) {
      for (let dx = -2; dx <= W + 2; dx++) {
        const gx = node.gridX + dx;
        const gy = node.gridY + dy;
        const t = context.terrainMatrix[gy]?.[gx];
        if (t === 'water' || t === 'water_deep') hasWater = true;
      }
    }
  }

  if (context?.heightmap) {
    const baseElev = context.heightmap[node.gridY]?.[node.gridX] ?? 0;
    for (let dy = 0; dy < H; dy += 2) {
      for (let dx = 0; dx < W; dx += 2) {
        const gx = node.gridX + dx;
        const gy = node.gridY + dy;
        const elev = context.heightmap[gy]?.[gx] ?? baseElev;
        if (elev !== baseElev) hasElevation = true;
      }
    }
  }

  // Check role preferences
  if (node.terrainPreference === 'coast_water' || node.type === 'port_dock') {
    hasWater = true;
  }
  if (node.terrainPreference === 'mountain_wall' || node.terrainPreference === 'mountain_plateau') {
    hasElevation = true;
  }
  if (node.terrainPreference === 'forest_clearing') {
    hasVegetation = true;
  }

  // 3. Roll Procedural Genes with Genuine Freedom
  // Even in forest, seed can roll clean-cut vs tree-canopy settlement
  const canopyRoll = prng();
  const canopyIntegration = hasVegetation ? 0.3 + canopyRoll * 0.7 : canopyRoll * 0.4;

  // Water feature: coastal/river can roll dock/canal; even dry town has 30% roll for inner pond
  let waterFeatureType: WaterFeatureType = 'none';
  const waterRoll = prng();
  if (hasWater) {
    if (waterRoll < 0.45) waterFeatureType = 'harbor_dock';
    else if (waterRoll < 0.80) waterFeatureType = 'canal';
    else waterFeatureType = 'pond';
  } else if (waterRoll < 0.30) {
    waterFeatureType = 'pond';
  }

  // Elevation policy: multi_tier_stairs gives 2.5D terraces with stone stairs
  let elevationPolicy: ElevationPolicy = 'flatten';
  const elevRoll = prng();
  if (hasElevation) {
    if (elevRoll < 0.60) elevationPolicy = 'multi_tier_stairs';
    else if (elevRoll < 0.85) elevationPolicy = 'cliff_perch';
    else elevationPolicy = 'flatten';
  }

  // Urban density: towns lean rural (0.1..0.4), metropolis leans paved (0.7..1.0)
  const baseDensity = scale === 'metropolis' ? 0.8 : scale === 'city' ? 0.5 : 0.2;
  const urbanDensity = Math.min(1.0, Math.max(0.0, baseDensity + (prng() * 0.4 - 0.2)));

  // Street morphology: align strictly with canonical procedural archetypes
  const patternRoll = prng();
  let streetPattern: StreetPattern = 'linear_boulevard';
  if (
    node.hasPort ||
    node.terrainPreference === 'coast_water' ||
    waterFeatureType === 'harbor_dock' ||
    (hasWater && (/port|carmin|vermilion|dock|wharf/i.test(node.id) || /port|carmin|vermilion|dock|wharf/i.test(node.name)))
  ) {
    streetPattern = 'coastal_wharf';
  } else if (scale === 'town') {
    streetPattern = patternRoll < 0.60 ? 'l_enclave' : 'linear_boulevard';
  } else if (scale === 'city') {
    if (patternRoll < 0.35) streetPattern = 'linear_boulevard';
    else if (patternRoll < 0.70) streetPattern = 'radial_plaza';
    else streetPattern = 'l_enclave';
  } else {
    streetPattern = patternRoll < 0.50 ? 'radial_plaza' : 'linear_boulevard';
  }

  // 4. Compute Vignette Budget and Select Diverse Vignettes
  const vignetteBudget = computeVignetteBudget(scale, W, H);
  const compatible = getCompatibleVignettes(scale, {
    hasWater: waterFeatureType !== 'none',
    hasElevation: elevationPolicy !== 'flatten',
    hasVegetation: canopyIntegration > 0.4
  });

  // Shuffle and pick distinct vignettes up to budget
  const shuffled = [...compatible].sort(() => prng() - 0.5);
  const selectedVignettes = shuffled.slice(0, vignetteBudget).map((v) => v.id);

  return {
    canopyIntegration,
    waterFeatureType,
    elevationPolicy,
    urbanDensity,
    streetPattern,
    vignetteBudget,
    selectedVignettes
  };
}
