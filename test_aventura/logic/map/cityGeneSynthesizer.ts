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

const _WATER_FEATURE_TYPES = ['none', 'pond', 'canal', 'harbor_dock'] as const;
export type WaterFeatureType = (typeof _WATER_FEATURE_TYPES)[number];

const _ELEVATION_POLICIES = ['flatten', 'multi_tier_stairs', 'cliff_perch'] as const;
export type ElevationPolicy = (typeof _ELEVATION_POLICIES)[number];

const _STREET_PATTERNS = [
  'linear_boulevard',
  'radial_plaza',
  'coastal_wharf',
  'l_enclave',
  'axial_boulevard',
  'plaza_radial',
  'l_shape',
  'dispersed_cluster'
] as const;
export type StreetPattern = (typeof _STREET_PATTERNS)[number];

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

const PRNG_CONSTANTS = {
  DEFAULT_SEED: 1337,
  MULTIPLIER: 1664525,
  INCREMENT: 1013904223,
  DIVISOR: 4294967296
} as const;

const SEED_PRIME_MULTIPLIER = 31 as const;

const VIGNETTE_AREA_LIMITS = {
  METROPOLIS_MIN_AREA: 500,
  METROPOLIS_TIER_1: 800,
  METROPOLIS_TIER_2: 650,
  CITY_MIN_AREA: 200,
  CITY_TIER_1: 350,
  CITY_TIER_2: 250,
  RURAL_TIER_1: 120
} as const;

const VIGNETTE_BUDGETS = {
  METROPOLIS_MAX: 9,
  METROPOLIS_HIGH: 8,
  METROPOLIS_BASE: 7,
  CITY_MAX: 6,
  CITY_MID: 5,
  CITY_BASE: 4,
  RURAL_HIGH: 3,
  RURAL_BASE: 2
} as const;

const GENE_PROBABILITIES = {
  CANOPY_BASE_OFFSET: 0.3,
  CANOPY_BASE_FACTOR: 0.7,
  CANOPY_DRY_FACTOR: 0.4,
  WATER_HARBOR: 0.45,
  WATER_CANAL: 0.8,
  WATER_DRY_POND: 0.3,
  ELEVATION_STAIRS: 0.6,
  ELEVATION_PERCH: 0.85,
  DENSITY_METROPOLIS: 0.8,
  DENSITY_CITY: 0.5,
  DENSITY_RURAL: 0.2,
  DENSITY_VARIANCE: 0.4,
  DENSITY_SUB: 0.2,
  PATTERN_TOWN_L: 0.6,
  PATTERN_CITY_LINEAR: 0.35,
  PATTERN_CITY_RADIAL: 0.7,
  PATTERN_METRO_RADIAL: 0.5,
  CANOPY_HIGH_THRESHOLD: 0.4,
  SHUFFLE_CENTRAL_OFFSET: 0.5
} as const;

// ---------------------------------------------------------------------------
// 2. Deterministic PRNG Helper
// ---------------------------------------------------------------------------

function createPrng(seed: number): () => number {
  let s = seed >>> 0 || PRNG_CONSTANTS.DEFAULT_SEED;
  return () => {
    s = (s * PRNG_CONSTANTS.MULTIPLIER + PRNG_CONSTANTS.INCREMENT) | 0;
    return (s >>> 0) / PRNG_CONSTANTS.DIVISOR;
  };
}

// ---------------------------------------------------------------------------
// 3. Gene Synthesizer
// ---------------------------------------------------------------------------

/**
 * Computes dynamic vignette budget based on settlement scale and footprint dimensions.
 * Large metropolises receive 6 to 9 vignettes; medium cities 4 to 6; rural towns 2 to 3.
 */
function computeVignetteBudget(
  scale: VignetteSettlementScale,
  width: number,
  height: number
): number {
  const area = width * height;
  if (scale === 'metropolis' || area >= VIGNETTE_AREA_LIMITS.METROPOLIS_MIN_AREA) {
    if (area >= VIGNETTE_AREA_LIMITS.METROPOLIS_TIER_1) return VIGNETTE_BUDGETS.METROPOLIS_MAX;
    if (area >= VIGNETTE_AREA_LIMITS.METROPOLIS_TIER_2) return VIGNETTE_BUDGETS.METROPOLIS_HIGH;
    return VIGNETTE_BUDGETS.METROPOLIS_BASE;
  }
  if (scale === 'city' || area >= VIGNETTE_AREA_LIMITS.CITY_MIN_AREA) {
    if (area >= VIGNETTE_AREA_LIMITS.CITY_TIER_1) return VIGNETTE_BUDGETS.CITY_MAX;
    if (area >= VIGNETTE_AREA_LIMITS.CITY_TIER_2) return VIGNETTE_BUDGETS.CITY_MID;
    return VIGNETTE_BUDGETS.CITY_BASE;
  }
  // Rural towns / hamlets
  if (area >= VIGNETTE_AREA_LIMITS.RURAL_TIER_1) return VIGNETTE_BUDGETS.RURAL_HIGH;
  return VIGNETTE_BUDGETS.RURAL_BASE;
}

const TERRAIN_SAMPLE_OFFSET = -2;
const TERRAIN_SAMPLE_MARGIN = 2;

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
    combinedSeed = (combinedSeed * SEED_PRIME_MULTIPLIER + node.id.charCodeAt(i)) | 0;
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
    for (let dy = TERRAIN_SAMPLE_OFFSET; dy <= H + TERRAIN_SAMPLE_MARGIN; dy++) {
      for (let dx = TERRAIN_SAMPLE_OFFSET; dx <= W + TERRAIN_SAMPLE_MARGIN; dx++) {
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
  const canopyIntegration = hasVegetation
    ? GENE_PROBABILITIES.CANOPY_BASE_OFFSET + canopyRoll * GENE_PROBABILITIES.CANOPY_BASE_FACTOR
    : canopyRoll * GENE_PROBABILITIES.CANOPY_DRY_FACTOR;

  // Water feature: coastal/river can roll dock/canal; even dry town has 30% roll for inner pond
  let waterFeatureType: WaterFeatureType = 'none';
  const waterRoll = prng();
  if (hasWater) {
    if (waterRoll < GENE_PROBABILITIES.WATER_HARBOR) waterFeatureType = 'harbor_dock';
    else if (waterRoll < GENE_PROBABILITIES.WATER_CANAL) waterFeatureType = 'canal';
    else waterFeatureType = 'pond';
  } else if (waterRoll < GENE_PROBABILITIES.WATER_DRY_POND) {
    waterFeatureType = 'pond';
  }

  // Elevation policy: multi_tier_stairs gives 2.5D terraces with stone stairs
  let elevationPolicy: ElevationPolicy = 'flatten';
  const elevRoll = prng();
  if (hasElevation) {
    if (elevRoll < GENE_PROBABILITIES.ELEVATION_STAIRS) elevationPolicy = 'multi_tier_stairs';
    else if (elevRoll < GENE_PROBABILITIES.ELEVATION_PERCH) elevationPolicy = 'cliff_perch';
    else elevationPolicy = 'flatten';
  }

  // Urban density: towns lean rural (0.1..0.4), metropolis leans paved (0.7..1.0)
  const baseDensity =
    scale === 'metropolis'
      ? GENE_PROBABILITIES.DENSITY_METROPOLIS
      : scale === 'city'
        ? GENE_PROBABILITIES.DENSITY_CITY
        : GENE_PROBABILITIES.DENSITY_RURAL;
  const urbanDensity = Math.min(
    1.0,
    Math.max(
      0.0,
      baseDensity + (prng() * GENE_PROBABILITIES.DENSITY_VARIANCE - GENE_PROBABILITIES.DENSITY_SUB)
    )
  );

  // Street morphology: align strictly with canonical procedural archetypes
  const patternRoll = prng();
  let streetPattern: StreetPattern;
  if (
    node.hasPort ||
    node.terrainPreference === 'coast_water' ||
    waterFeatureType === 'harbor_dock' ||
    (hasWater &&
      (/port|carmin|vermilion|dock|wharf/i.test(node.id) ||
        /port|carmin|vermilion|dock|wharf/i.test(node.name)))
  ) {
    streetPattern = 'coastal_wharf';
  } else if (scale === 'town') {
    streetPattern =
      patternRoll < GENE_PROBABILITIES.PATTERN_TOWN_L ? 'l_enclave' : 'linear_boulevard';
  } else if (scale === 'city') {
    if (patternRoll < GENE_PROBABILITIES.PATTERN_CITY_LINEAR) streetPattern = 'linear_boulevard';
    else if (patternRoll < GENE_PROBABILITIES.PATTERN_CITY_RADIAL) streetPattern = 'radial_plaza';
    else streetPattern = 'l_enclave';
  } else {
    streetPattern =
      patternRoll < GENE_PROBABILITIES.PATTERN_METRO_RADIAL ? 'radial_plaza' : 'linear_boulevard';
  }

  // 4. Compute Vignette Budget and Select Diverse Vignettes
  const vignetteBudget = computeVignetteBudget(scale, W, H);
  const compatible = getCompatibleVignettes(scale, {
    hasWater: waterFeatureType !== 'none',
    hasElevation: elevationPolicy !== 'flatten',
    hasVegetation: canopyIntegration > GENE_PROBABILITIES.CANOPY_HIGH_THRESHOLD
  });

  // Shuffle and pick distinct vignettes up to budget
  const shuffled = [...compatible].sort(() => prng() - GENE_PROBABILITIES.SHUFFLE_CENTRAL_OFFSET);
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
