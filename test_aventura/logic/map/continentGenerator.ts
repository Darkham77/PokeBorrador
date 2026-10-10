/**
 * src/logic/map/continentGenerator.ts
 *
 * PROCEDURAL CONTINENTAL LANDMASS & MACRO-WORLD GENERATOR
 *
 * Integrates:
 *   1. 2D Simplex FBM Noise with smooth radial falloff for natural island/continent geography.
 *   2. Biome Zoning: Open Ocean -> Contiguous Sand Beach -> Lush Continental Plain.
 *   3. Interior Features: Organic Freshwater Lakes (1-2) with rocky shores + Mountain Massifs with 2.5D depth and stairs.
 *   4. Dual Nuclear Autotilers: waterAutotileEngine + mountainAutotileEngine.
 *   5. Strict Non-Destructive Render Stacking: Base Ground -> Water/Coast -> Mountain/Cliffs/Stairs.
 */

import { SimplexNoise, fbm2DNormalized } from './noise/simplexNoise.ts';
import {
  resolveMountainMapGrid,
  type ResolvedMountainMapResult,
  type MountainPalette,
  type MountainStairLocation,
  type MountainRole
} from './mountainAutotileEngine.ts';
import {
  CONTINENT_DEFAULT_SEED,
  DEFAULT_BEACH_WIDTH,
  DEFAULT_LAKE_COUNT,
  DEFAULT_MOUNTAIN_PALETTE
} from '../../config/studioConstants.ts';
import {
  resolveWaterCoastGrid,
  sanitizeWaterTerrainMatrix,
  type WaterTerrainKind,
  type WaterTerrainMatrix,
  type ResolvedWaterMapResult
} from './waterAutotileEngine.ts';
import {
  synthesizeMacroBiomes,
  type MacroBiomeResult,
  type MacroBiome
} from './macroBiomeSynthesizer.ts';
import type { GeologicalClusterResult } from './geologicalClusterEngine.ts';
import {
  resolveMacroBiomeAutotile,
  type ResolvedMacroBiomeMapResult
} from './macroBiomeAutotileEngine.ts';
import {
  generateProceduralRiverDrainage,
  type ProceduralRiverDrainageResult
} from './continent/riverHydrographyEngine.ts';
import { generateContinentalMountains } from './continentMountainEngine.ts';

import {
  generateArchipelagoIslands,
  applyArchipelagoBeachBuffers,
  type ArchipelagoIslandSpec
} from './archipelagoGenerator.ts';

export interface SettlementExclusionZone {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly margin?: number;
}

export interface ContinentGeneratorOptions {
  readonly width?: number; // default: 64
  readonly height?: number; // default: 64
  readonly seed?: number; // default: 42
  readonly oceanWaterPercentage?: number; // default: 0.38 (38% ocean)
  readonly beachWidth?: number; // default: 3
  readonly lakeCount?: number; // default: 2
  readonly mountainPercentage?: number; // default: 0.20 (20% of landmass)
  readonly mountainPalette?: MountainPalette; // default: 'brown'
  readonly withStairs?: boolean; // default: true
  readonly maxStairsPerTier?: number; // default: 2
  readonly variableBeach?: boolean; // default: true for maps >= 80x80
  readonly macroBiomeGrid?: readonly (readonly MacroBiome[])[];
  readonly withArchipelago?: boolean; // default: true for maps >= 96x96
  readonly islandCount?: number; // default: 4 (between 3 and 5)
  readonly withRiver?: boolean; // default: true for regional maps >= 128x128
  readonly maxMountainTiers?: number; // default: 4 (1 to 4 floors allowed depending on massif mass)
  readonly settlementExclusionZones?: readonly SettlementExclusionZone[];
  readonly leaguePlateauZone?: SettlementExclusionZone;
  readonly caveLocations?: readonly { readonly x: number; readonly y: number }[];
}

import type { ContinentCellDetails } from './geologicalAutotilingEngine.ts';
export type { ContinentCellDetails, GeologicalAutotilingPassOptions } from './geologicalAutotilingEngine.ts';
import {
  distributePerimeterBeach,
  removeOrphanTiles,
  carveInlandLakes
} from './continentSculptingEngine.ts';

export interface ContinentMapResult {
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly terrainMatrix: WaterTerrainMatrix;
  readonly heightmap: readonly (readonly number[])[];
  readonly resolvedWater: ResolvedWaterMapResult;
  readonly resolvedMountain: ResolvedMountainMapResult;
  readonly placedStairs: readonly MountainStairLocation[];
  readonly cells: readonly (readonly ContinentCellDetails[])[];
  readonly mountainPalette?: MountainPalette;
  readonly macroBiomes?: MacroBiomeResult;
  readonly resolvedMacroBiomes?: ResolvedMacroBiomeMapResult;
  readonly geologicalClusters?: GeologicalClusterResult;
  readonly archipelagoIslands?: readonly ArchipelagoIslandSpec[];
  readonly transitableGrid?: readonly (readonly boolean[])[];
  readonly riverDrainage?: ProceduralRiverDrainageResult;
}

import { CONTINENT_GEN } from '../../config/continentGenConfig.ts';

interface RadialLandmassContext {
  readonly cx: number;
  readonly cy: number;
  readonly maxRadius: number;
  readonly minDim: number;
  readonly mapScale: number;
  readonly seed: number;
  readonly noise: SimplexNoise;
}

function computeRadialLandmassCellScore(
  x: number,
  y: number,
  width: number,
  height: number,
  ctx: RadialLandmassContext
): number {
  const { cx, cy, maxRadius, minDim, mapScale, seed, noise } = ctx;
  const dx = (x - cx) / maxRadius;
  const dy = (y - cy) / maxRadius;

  const theta = Math.atan2(dy, dx);
  const lobe1 = Math.sin(CONTINENT_GEN.LOBE_1_FREQ * theta + seed * CONTINENT_GEN.LOBE_1_SEED_SCALE) * (CONTINENT_GEN.LOBE_1_AMP * mapScale);
  const lobe2 = Math.cos(CONTINENT_GEN.LOBE_2_FREQ * theta + seed * CONTINENT_GEN.LOBE_2_SEED_SCALE) * (CONTINENT_GEN.LOBE_2_AMP * mapScale);
  const lobe3 = Math.sin(CONTINENT_GEN.LOBE_3_FREQ * theta + seed * CONTINENT_GEN.LOBE_3_SEED_SCALE) * (CONTINENT_GEN.LOBE_3_AMP * mapScale);
  const angularMod = CONTINENT_GEN.ANGULAR_MOD_BASE + lobe1 + lobe2 + lobe3;

  const sWarp = Math.min(CONTINENT_GEN.WARP_MAX_SCALE, CONTINENT_GEN.WARP_SCALE_FACTOR / minDim);
  const warpX = noise.noise2D(x * sWarp + CONTINENT_GEN.WARP_X_OFFSET_X, y * sWarp + CONTINENT_GEN.WARP_X_OFFSET_Y) * (CONTINENT_GEN.WARP_AMP * mapScale);
  const warpY = noise.noise2D(x * sWarp + CONTINENT_GEN.WARP_Y_OFFSET_X, y * sWarp + CONTINENT_GEN.WARP_Y_OFFSET_Y) * (CONTINENT_GEN.WARP_AMP * mapScale);

  const pDx = dx + warpX;
  const pDy = dy + warpY;
  const pDist = Math.sqrt(pDx * pDx + pDy * pDy);

  const modulatedDist = pDist / Math.max(CONTINENT_GEN.MIN_ANGULAR_MOD, angularMod);

  const s1 = Math.min(CONTINENT_GEN.COAST_NOISE_MAX_SCALE, CONTINENT_GEN.COAST_NOISE_FACTOR / minDim);
  const coastNoise =
    noise.noise2D(x * s1, y * s1) * CONTINENT_GEN.COAST_OCTAVE_1_WEIGHT +
    noise.noise2D(x * s1 * CONTINENT_GEN.COAST_OCTAVE_2_SCALE, y * s1 * CONTINENT_GEN.COAST_OCTAVE_2_SCALE) * CONTINENT_GEN.COAST_OCTAVE_2_WEIGHT +
    noise.noise2D(x * s1 * CONTINENT_GEN.COAST_OCTAVE_3_SCALE, y * s1 * CONTINENT_GEN.COAST_OCTAVE_3_SCALE) * CONTINENT_GEN.COAST_OCTAVE_3_WEIGHT;

  const borderDist = Math.min(x, width - 1 - x, y, height - 1 - y);
  const borderDamp = borderDist <= CONTINENT_GEN.BORDER_DAMP_THRESHOLD ? Math.max(0.0, (borderDist - 1) / CONTINENT_GEN.BORDER_DAMP_THRESHOLD) : 1.0;

  const effectiveDist = Math.max(0.0, modulatedDist + coastNoise);

  let falloff = 0.0;
  if (effectiveDist < CONTINENT_GEN.FALLOFF_MAX_DIST) {
    const t = effectiveDist / CONTINENT_GEN.FALLOFF_MAX_DIST;
    falloff = (1.0 - t * t * (CONTINENT_GEN.SMOOTHSTEP_CUBIC - CONTINENT_GEN.SMOOTHSTEP_QUAD * t)) * borderDamp;
  }

  const noiseScale = Math.min(CONTINENT_GEN.FBM_MAX_SCALE, CONTINENT_GEN.FBM_SCALE_FACTOR / minDim);
  const n = fbm2DNormalized(noise, x, y, { scale: noiseScale, octaves: CONTINENT_GEN.FBM_OCTAVES });
  return (n * CONTINENT_GEN.FBM_WEIGHT + CONTINENT_GEN.FBM_BASE) * falloff;
}

function sealInteriorWaterDepressions(matrix: WaterTerrainKind[][], width: number, height: number): void {
  const visitedOcean: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
  const queue: { x: number; y: number }[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
        if (matrix[y]![x] === 'water') {
          visitedOcean[y]![x] = true;
          queue.push({ x, y });
        }
      }
    }
  }

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++]!;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = curr.x + dx!;
      const ny = curr.y + dy!;
      if (
        nx >= 0 && nx < width &&
        ny >= 0 && ny < height &&
        !visitedOcean[ny]![nx] &&
        matrix[ny]![nx] === 'water'
      ) {
        visitedOcean[ny]![nx] = true;
        queue.push({ x: nx, y: ny });
      }
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (matrix[y]![x] === 'water' && !visitedOcean[y]![x]) {
        matrix[y]![x] = 'grass';
      }
    }
  }
}

/**
 * Generates an organic radial landmass mask using Simplex FBM noise and radial falloff.
 * Guarantees all 4 perimeter borders are 100% open ocean.
 */
export function generateRadialLandmassMask(
  width: number,
  height: number,
  seed: number,
  oceanRatio = CONTINENT_GEN.DEFAULT_OCEAN_RATIO
): WaterTerrainKind[][] {
  const noise = new SimplexNoise(seed);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const maxRadius = Math.min(cx, cy) * CONTINENT_GEN.RADIAL_MAX_RADIUS_FACTOR;

  const scores: number[][] = Array.from({ length: height }, () => Array(width).fill(CONTINENT_GEN.INITIAL_OCEAN_SCORE));
  const insideScores: number[] = [];

  const minDim = Math.min(width, height);
  const mapScale = Math.min(1.0, Math.max(0.0, (minDim - CONTINENT_GEN.MAP_SCALE_MIN_DIM) / CONTINENT_GEN.MAP_SCALE_DIVISOR));
  const ctx: RadialLandmassContext = { cx, cy, maxRadius, minDim, mapScale, seed, noise };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (
        x <= CONTINENT_GEN.BORDER_PADDING_MIN ||
        x >= width - CONTINENT_GEN.BORDER_PADDING_MAX_OFFSET ||
        y <= CONTINENT_GEN.BORDER_PADDING_MIN ||
        y >= height - CONTINENT_GEN.BORDER_PADDING_MAX_OFFSET
      ) {
        scores[y]![x] = CONTINENT_GEN.INITIAL_OCEAN_SCORE;
        continue;
      }

      const score = computeRadialLandmassCellScore(x, y, width, height, ctx);
      scores[y]![x] = score;

      if (score > CONTINENT_GEN.INSIDE_FALLOFF_THRESHOLD) {
        insideScores.push(score);
      }
    }
  }

  insideScores.sort((a, b) => a - b);
  const cutoffIndex = Math.floor(insideScores.length * (oceanRatio * CONTINENT_GEN.OCEAN_CUTOFF_RATIO_SCALE));
  const oceanThreshold = Math.max(CONTINENT_GEN.OCEAN_MIN_THRESHOLD, insideScores[cutoffIndex] ?? CONTINENT_GEN.OCEAN_FALLBACK_THRESHOLD);

  const matrix: WaterTerrainKind[][] = Array.from({ length: height }, () =>
    Array<WaterTerrainKind>(width).fill('water')
  );

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (scores[y]![x]! > CONTINENT_GEN.MIN_LAND_SCORE && scores[y]![x]! >= oceanThreshold) {
        matrix[y]![x] = 'grass';
      }
    }
  }

  sealInteriorWaterDepressions(matrix, width, height);

  return matrix;
}

// Perimeter beach, orphan tiles, and inland lake carving extracted to continentSculptingEngine.ts
// generateContinentalMountains extracted to continentMountainEngine.ts

/**
 * Master orchestrator function generating a complete continental island or macro-map.
 */
export function generateContinentMap(options?: ContinentGeneratorOptions): ContinentMapResult {
  const W = options?.width ?? CONTINENT_GEN.DEFAULT_WIDTH;
  const H = options?.height ?? CONTINENT_GEN.DEFAULT_HEIGHT;
  const seed = options?.seed ?? CONTINENT_DEFAULT_SEED;
  const oceanRatio = options?.oceanWaterPercentage ?? CONTINENT_GEN.DEFAULT_OCEAN_RATIO;
  const beachWidth = options?.beachWidth ?? DEFAULT_BEACH_WIDTH;
  const lakeCount = options?.lakeCount ?? DEFAULT_LAKE_COUNT;

  // 1. Radial Landmass Mask
  const rawMatrix = generateRadialLandmassMask(W, H, seed, oceanRatio);

  // 2. Continuous Beach Buffer
  const variableBeach = options?.variableBeach ?? (Math.min(W, H) >= CONTINENT_GEN.VARIABLE_BEACH_MIN_DIM);
  distributePerimeterBeach(rawMatrix, beachWidth, { variableBeach, seed });

  // 3. Remove Orphan Land Patches & Keep Strictly Only the Main Continent
  removeOrphanTiles(rawMatrix, CONTINENT_GEN.ORPHAN_ISLAND_MIN_CELLS, true);

  // 4. Generate Maritime Archipelago (Phase 1)
  const withArchipelago = options?.withArchipelago ?? (Math.min(W, H) >= CONTINENT_GEN.ARCHIPELAGO_MIN_DIM);
  const archipelagoIslands = withArchipelago
    ? generateArchipelagoIslands(rawMatrix, { width: W, height: H, seed, count: options?.islandCount ?? CONTINENT_GEN.DEFAULT_ISLAND_COUNT })
    : [];

  // 5. Inland Freshwater Lakes (carved in interior grass plains with authentic grass shores)
  carveInlandLakes(rawMatrix, lakeCount, seed);

  // 6. Sanitize Water Matrix (Buffer >= 2)
  const sanitizedWaterMatrix = sanitizeWaterTerrainMatrix(rawMatrix);

  // Guarantee continuous beach buffer invariant for archipelago islands
  if (archipelagoIslands.length > 0) {
    applyArchipelagoBeachBuffers(
      sanitizedWaterMatrix,
      archipelagoIslands,
      W,
      H,
      CONTINENT_GEN.ISLAND_BEACH_ITERATIONS,
      CONTINENT_GEN.ISLAND_BOUNDS_PADDING
    );
  }

  // 6. Macro Biome Synthesizer (Phase 1)
  const macroBiomes = synthesizeMacroBiomes({
    width: W,
    height: H,
    seed,
    terrainMatrix: sanitizedWaterMatrix
  });

  // 8. Continental Mountains & Stairs (Phase 2 Geological Clusterer)
  const continentalMountains = generateContinentalMountains(
    sanitizedWaterMatrix,
    { ...options, width: W, height: H, seed, macroBiomeGrid: macroBiomes.biomeGrid, withStairs: options?.withStairs ?? true }
  );
  const { sanitizedHeightmap, geologicalClusters } = continentalMountains;
  let { placedStairs, mountainResult } = continentalMountains;

interface RiverDrainageStepParams {
  readonly W: number;
  readonly H: number;
  readonly seed: number;
  readonly withRiver?: boolean;
  readonly mountainPalette?: MountainPalette;
  readonly sanitizedWaterMatrix: WaterTerrainKind[][];
  readonly sanitizedHeightmap: number[][];
  readonly geologicalClusters: ReturnType<typeof generateContinentalMountains>['geologicalClusters'];
  placedStairs: ReturnType<typeof generateContinentalMountains>['placedStairs'];
  mountainResult: ReturnType<typeof generateContinentalMountains>['mountainResult'];
}

function applyProceduralRiverDrainageStep(params: RiverDrainageStepParams): {
  readonly resolvedWater: ReturnType<typeof resolveWaterCoastGrid>;
  readonly placedStairs: ReturnType<typeof generateContinentalMountains>['placedStairs'];
  readonly mountainResult: ReturnType<typeof generateContinentalMountains>['mountainResult'];
  readonly riverDrainage?: ProceduralRiverDrainageResult;
} {
  const { W, H, seed, withRiver, mountainPalette, sanitizedWaterMatrix, sanitizedHeightmap, geologicalClusters } = params;
  let { placedStairs, mountainResult } = params;
  let resolvedWater = resolveWaterCoastGrid(sanitizedWaterMatrix);

  const shouldDrainRiver = withRiver ?? (W >= CONTINENT_GEN.RIVER_MIN_DIMENSION && H >= CONTINENT_GEN.RIVER_MIN_DIMENSION);
  let riverDrainage: ProceduralRiverDrainageResult | undefined;

  if (shouldDrainRiver) {
    riverDrainage = generateProceduralRiverDrainage(
      sanitizedWaterMatrix,
      sanitizedHeightmap,
      { seed, placedStairs }
    );
    if (riverDrainage.riverCarved) {
      resolvedWater = resolveWaterCoastGrid(sanitizedWaterMatrix);
      const unStairsResolved = resolveMountainMapGrid(sanitizedHeightmap, {
        palette: mountainPalette ?? 'brown',
        paletteMatrix: geologicalClusters.paletteMatrix
      });
      placedStairs = placedStairs.filter((s) => {
        const cL = unStairsResolved.cellDetails[s.y]?.[s.x];
        const cR = unStairsResolved.cellDetails[s.y]?.[s.x + 1];
        return cL?.role === 'edge_south_top' && cR?.role === 'edge_south_top';
      });
      mountainResult = resolveMountainMapGrid(sanitizedHeightmap, {
        palette: mountainPalette ?? 'brown',
        paletteMatrix: geologicalClusters.paletteMatrix,
        stairs: placedStairs
      });
    }
  }

  return { resolvedWater, placedStairs, mountainResult, riverDrainage };
}

interface CellCompositionParams {
  readonly x: number;
  readonly y: number;
  readonly terrain: WaterTerrainKind;
  readonly elev: number;
  readonly waterCell?: ResolvedWaterCell;
  readonly mtnCell?: ReturnType<typeof resolveMountainMapGrid>['cellDetails'][number][number];
  readonly mBiome?: MacroBiomeType;
  readonly resolvedMacroBiomes: ReturnType<typeof resolveMacroBiomeAutotile>;
  readonly geologicalClusters: ReturnType<typeof generateContinentalMountains>['geologicalClusters'];
  readonly mountainPalette?: MountainPalette;
  readonly mountainResult: ReturnType<typeof generateContinentalMountains>['mountainResult'];
  readonly riverDrainage?: ProceduralRiverDrainageResult;
}

function pushBaseGroundLayer(
  layerStack: string[],
  elev: number,
  terrain: WaterTerrainKind,
  waterCell: ResolvedWaterCell | undefined,
  mCell: ResolvedMacroBiomeCell | undefined,
  mtnPal: MountainPalette
): void {
  if (elev > 0) {
    layerStack.push(mtnPal === 'gray' ? 'poke_cliff_gray_plateau_rock.png' : 'poke_cliff_brown_plateau_rock.png');
    return;
  }
  if (waterCell && waterCell.terrain !== 'grass') {
    layerStack.push(...waterCell.layerStack);
    return;
  }
  if (terrain === 'water') {
    layerStack.push('poke_water_ocean_center.png');
    return;
  }
  if (mCell) {
    layerStack.push(...mCell.layerStack);
    return;
  }
  layerStack.push('poke_grass_plain.png');
}

function applyMountainCellProperties(
  layerStack: string[],
  mtnCell: ReturnType<typeof resolveMountainMapGrid>['cellDetails'][number][number] | undefined,
  elev: number,
  initialWalkable: boolean
): { readonly mtnRole?: MountainRole; readonly isStair: boolean; readonly isWalkable: boolean } {
  if (!mtnCell) {
    return { mtnRole: undefined, isStair: false, isWalkable: initialWalkable };
  }

  const mtnRole = mtnCell.role;
  const isStair = mtnCell.role === 'stairs_l' || mtnCell.role === 'stairs_r';

  if (elev > 0) {
    layerStack.push(mtnCell.primaryTile);
    if (mtnCell.overlayTiles && mtnCell.overlayTiles.length > 0) {
      layerStack.push(...mtnCell.overlayTiles);
    }
  }

  let isWalkable = initialWalkable;
  if (
    mtnCell.role === 'peak_isolated' ||
    mtnCell.role.startsWith('edge_') ||
    mtnCell.role.startsWith('corner_outer_')
  ) {
    isWalkable = false;
  }

  if (isStair) {
    isWalkable = true;
  }

  return { mtnRole, isStair, isWalkable };
}

function applyProjectedNorthCliffFoot(
  layerStack: string[],
  northMtn: ReturnType<typeof resolveMountainMapGrid>['cellDetails'][number][number] | undefined,
  isRiverChannel: boolean,
  terrain: WaterTerrainKind,
  currentWalkable: boolean,
  currentStair: boolean
): { readonly isWalkable: boolean; readonly isStair: boolean } {
  if (isRiverChannel || !northMtn?.projectedFoot) {
    return { isWalkable: currentWalkable, isStair: currentStair };
  }

  layerStack.push(northMtn.projectedFoot.tile);
  if (northMtn.projectedFoot.occupiesCell && terrain !== 'water') {
    return { isWalkable: false, isStair: currentStair };
  }
  if (!northMtn.projectedFoot.occupiesCell) {
    return { isWalkable: true, isStair: true };
  }
  return { isWalkable: currentWalkable, isStair: currentStair };
}

function composeContinentCell(params: CellCompositionParams): ContinentCellDetails {
  const {
    x, y, terrain, elev, waterCell, mtnCell, mBiome,
    resolvedMacroBiomes, geologicalClusters, mountainPalette,
    mountainResult, riverDrainage
  } = params;

  const layerStack: string[] = []; // domain-ok: composite procedural tile layer stack
  const mtnPal = geologicalClusters?.paletteMatrix?.[y]?.[x] ?? mountainPalette ?? 'brown';
  const mCell = resolvedMacroBiomes.cellDetails[y]?.[x];

  pushBaseGroundLayer(layerStack, elev, terrain, waterCell, mCell, mtnPal);

  const initialWalkable = !(terrain === 'water' && waterCell?.role === 'center');
  const mtnProps = applyMountainCellProperties(layerStack, mtnCell, elev, initialWalkable);

  const isRiverChannel = riverDrainage?.riverGrid?.[y]?.[x] ?? false;
  const northMtn = y > 0 ? mountainResult.cellDetails[y - 1]![x] : undefined;
  const footProps = applyProjectedNorthCliffFoot(layerStack, northMtn, isRiverChannel, terrain, mtnProps.isWalkable, mtnProps.isStair);

  return {
    x,
    y,
    terrain,
    elevation: elev,
    macroBiome: mBiome,
    mountainPalette: mtnPal,
    waterRole: waterCell?.role,
    mountainRole: mtnProps.mtnRole,
    isStair: footProps.isStair,
    isWalkable: footProps.isWalkable,
    layerStack
  };
}

  // 8a. Procedural River Drainage & Post-Processing
  const riverDrainageResult = applyProceduralRiverDrainageStep({
    W,
    H,
    seed,
    withRiver: options?.withRiver,
    mountainPalette: options?.mountainPalette,
    sanitizedWaterMatrix,
    sanitizedHeightmap,
    geologicalClusters,
    placedStairs,
    mountainResult
  });
  const { resolvedWater, riverDrainage } = riverDrainageResult;
  placedStairs = riverDrainageResult.placedStairs;
  mountainResult = riverDrainageResult.mountainResult;

  // 8b. Autotile Macro Biome regions against plain meadow
  const resolvedMacroBiomes = resolveMacroBiomeAutotile(
    macroBiomes.biomeGrid,
    sanitizedWaterMatrix,
    sanitizedHeightmap
  );

  // 9. Compose Unified Map with Strict Non-Destructive Layer Stacking
  const cells: ContinentCellDetails[][] = Array.from({ length: H }, () => Array(W));

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      cells[y]![x] = composeContinentCell({
        x,
        y,
        terrain: sanitizedWaterMatrix[y]![x]!,
        elev: sanitizedHeightmap[y]![x]!,
        waterCell: resolvedWater.cellDetails[y]![x],
        mtnCell: mountainResult.cellDetails[y]![x],
        mBiome: macroBiomes.biomeGrid[y]?.[x],
        resolvedMacroBiomes,
        geologicalClusters,
        mountainPalette: options?.mountainPalette,
        mountainResult,
        riverDrainage
      });
    }
  }

  return {
    width: W,
    height: H,
    seed,
    terrainMatrix: sanitizedWaterMatrix,
    heightmap: sanitizedHeightmap,
    resolvedWater,
    resolvedMountain: mountainResult,
    placedStairs,
    cells,
    mountainPalette: options?.mountainPalette ?? DEFAULT_MOUNTAIN_PALETTE,
    macroBiomes,
    resolvedMacroBiomes,
    geologicalClusters,
    archipelagoIslands,
    riverDrainage
  };
}


