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

export {
  CORDILLERA_TIER_4_MIN_CELLS,
  MASSIF_TIER_3_MIN_CELLS,
  MASSIF_TIER_2_MIN_CELLS,
  DEFAULT_MOUNTAIN_RATIO,
  pruneOrphanCliffWalls,
  generateContinentalMountains
} from './continentMountainEngine.ts';

export {
  ARCHIPELAGO_ISLAND_ROLES,
  type ArchipelagoIslandRole,
  type ArchipelagoIslandSpec,
  generateArchipelagoIslands
} from './archipelagoGenerator.ts';
import { generateArchipelagoIslands, type ArchipelagoIslandSpec } from './archipelagoGenerator.ts';

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
export { compileGeologicalAutotiling } from './geologicalAutotilingEngine.ts';
export {
  sculptContinentFromGraph,
  distributePerimeterBeach,
  removeOrphanTiles,
  carveInlandLakes,
  type PerimeterBeachOptions
} from './continentSculptingEngine.ts';
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

const DEFAULT_WIDTH = 64;
const DEFAULT_HEIGHT = 64;
const DEFAULT_SEED = 42;
const DEFAULT_OCEAN_RATIO = 0.38;
const DEFAULT_BEACH_WIDTH = 3;
const DEFAULT_LAKE_COUNT = 2;
const DEFAULT_MOUNTAIN_PALETTE: MountainPalette = 'brown';

/**
 * Generates an organic radial landmass mask using Simplex FBM noise and radial falloff.
 * Guarantees all 4 perimeter borders are 100% open ocean.
 */
export function generateRadialLandmassMask(
  width: number,
  height: number,
  seed: number,
  oceanRatio = DEFAULT_OCEAN_RATIO
): WaterTerrainKind[][] {
  const noise = new SimplexNoise(seed);
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;
  const maxRadius = Math.min(cx, cy) * 0.94;

  const scores: number[][] = Array.from({ length: height }, () => Array(width).fill(-1.0));
  const insideScores: number[] = [];

  const minDim = Math.min(width, height);
  const mapScale = Math.min(1.0, Math.max(0.0, (minDim - 64) / 32));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x <= 1 || x >= width - 2 || y <= 1 || y >= height - 2) {
        scores[y]![x] = -1.0;
        continue;
      }

      const dx = (x - cx) / maxRadius;
      const dy = (y - cy) / maxRadius;

      // Low-frequency harmonic angular modulation: creates natural continental lobes, peninsulas and gulfs (scaled on larger maps)
      const theta = Math.atan2(dy, dx);
      const lobe1 = Math.sin(2 * theta + seed * 0.13) * (0.20 * mapScale); // 2 primary continental lobes
      const lobe2 = Math.cos(3 * theta + seed * 0.27) * (0.14 * mapScale); // 3 peninsulas / gulfs
      const lobe3 = Math.sin(5 * theta + seed * 0.41) * (0.08 * mapScale); // coastal undulations
      const angularMod = 1.0 + lobe1 + lobe2 + lobe3;

      // Low-frequency domain warping: shifts landmass organically
      const sWarp = Math.min(0.035, 2.4 / minDim);
      const warpX = noise.noise2D(x * sWarp + 13.7, y * sWarp + 31.4) * (0.16 * mapScale);
      const warpY = noise.noise2D(x * sWarp + 57.1, y * sWarp + 89.2) * (0.16 * mapScale);

      const pDx = dx + warpX;
      const pDy = dy + warpY;
      const pDist = Math.sqrt(pDx * pDx + pDy * pDy);

      // Modulated distance: shapes the macro landmass
      const modulatedDist = pDist / Math.max(0.4, angularMod);

      // 3-Octave Multifractal Simplex Noise: creates organic bays, gulfs and inlets without star/sawtooth points
      const s1 = Math.min(0.035, 2.8 / minDim);
      const coastNoise =
        noise.noise2D(x * s1, y * s1) * 0.12 +
        noise.noise2D(x * s1 * 2, y * s1 * 2) * 0.06 +
        noise.noise2D(x * s1 * 4, y * s1 * 4) * 0.03;

      // Distance factor with border protection: ensure land does not spill past maxRadius
      const borderDist = Math.min(x, width - 1 - x, y, height - 1 - y);
      const borderDamp = borderDist <= 3 ? Math.max(0.0, (borderDist - 1) / 3) : 1.0;

      const effectiveDist = Math.max(0.0, modulatedDist + coastNoise);

      let falloff = 0.0;
      if (effectiveDist < 0.96) {
        const t = effectiveDist / 0.96;
        falloff = (1.0 - t * t * (3 - 2 * t)) * borderDamp;
      }

      const noiseScale = Math.min(0.05, 3.2 / minDim);
      const n = fbm2DNormalized(noise, x, y, { scale: noiseScale, octaves: 4 });
      const score = (n * 0.6 + 0.4) * falloff;
      scores[y]![x] = score;

      if (falloff > 0.02) {
        insideScores.push(score);
      }
    }
  }

  insideScores.sort((a, b) => a - b);
  const cutoffIndex = Math.floor(insideScores.length * (oceanRatio * 0.35));
  const oceanThreshold = Math.max(0.06, insideScores[cutoffIndex] ?? 0.18);

  const matrix: WaterTerrainKind[][] = Array.from({ length: height }, () =>
    Array<WaterTerrainKind>(width).fill('water')
  );

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (scores[y]![x]! > 0.05 && scores[y]![x]! >= oceanThreshold) {
        matrix[y]![x] = 'grass';
      }
    }
  }

  // Seal interior noise depressions so they don't form artificial inland salt ponds with 3-cell beach rings
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

  return matrix;
}

// Perimeter beach, orphan tiles, and inland lake carving extracted to continentSculptingEngine.ts
// generateContinentalMountains extracted to continentMountainEngine.ts

/**
 * Master orchestrator function generating a complete continental island or macro-map.
 */
export function generateContinentMap(options?: ContinentGeneratorOptions): ContinentMapResult {
  const W = options?.width ?? DEFAULT_WIDTH;
  const H = options?.height ?? DEFAULT_HEIGHT;
  const seed = options?.seed ?? DEFAULT_SEED;
  const oceanRatio = options?.oceanWaterPercentage ?? DEFAULT_OCEAN_RATIO;
  const beachWidth = options?.beachWidth ?? DEFAULT_BEACH_WIDTH;
  const lakeCount = options?.lakeCount ?? DEFAULT_LAKE_COUNT;

  // 1. Radial Landmass Mask
  const rawMatrix = generateRadialLandmassMask(W, H, seed, oceanRatio);

  // 2. Continuous Beach Buffer
  const variableBeach = options?.variableBeach ?? (Math.min(W, H) >= 80);
  distributePerimeterBeach(rawMatrix, beachWidth, { variableBeach, seed });

  // 3. Remove Orphan Land Patches & Keep Strictly Only the Main Continent
  removeOrphanTiles(rawMatrix, 4, true);

  // 4. Generate Maritime Archipelago (Phase 1)
  const withArchipelago = options?.withArchipelago ?? (Math.min(W, H) >= 200);
  const archipelagoIslands = withArchipelago
    ? generateArchipelagoIslands(rawMatrix, { width: W, height: H, seed, count: options?.islandCount ?? 4 })
    : [];

  // 5. Inland Freshwater Lakes (carved in interior grass plains with authentic grass shores)
  carveInlandLakes(rawMatrix, lakeCount, seed);

  // 6. Sanitize Water Matrix (Buffer >= 2)
  const sanitizedWaterMatrix = sanitizeWaterTerrainMatrix(rawMatrix);

  // Guarantee continuous beach buffer invariant for archipelago islands
  if (archipelagoIslands.length > 0) {
    for (const island of archipelagoIslands) {
      for (let iter = 0; iter < 2; iter++) {
        for (let y = Math.max(1, island.bounds.minY - 2); y <= Math.min(H - 2, island.bounds.maxY + 2); y++) {
          for (let x = Math.max(1, island.bounds.minX - 2); x <= Math.min(W - 2, island.bounds.maxX + 2); x++) {
            if (sanitizedWaterMatrix[y]![x] === 'grass') {
              const touchesWater =
                sanitizedWaterMatrix[y - 1]![x] === 'water' ||
                sanitizedWaterMatrix[y - 1]![x] === 'water_deep' ||
                sanitizedWaterMatrix[y + 1]![x] === 'water' ||
                sanitizedWaterMatrix[y + 1]![x] === 'water_deep' ||
                sanitizedWaterMatrix[y]![x - 1] === 'water' ||
                sanitizedWaterMatrix[y]![x - 1] === 'water_deep' ||
                sanitizedWaterMatrix[y]![x + 1] === 'water' ||
                sanitizedWaterMatrix[y]![x + 1] === 'water_deep';
              if (touchesWater) {
                sanitizedWaterMatrix[y]![x] = 'sand';
              }
            }
          }
        }
      }
    }
  }

  // 6. Autotile Water & Coast
  let resolvedWater = resolveWaterCoastGrid(sanitizedWaterMatrix);

  // 7. Macro Biome Synthesizer (Phase 1)
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

  // 8a. Procedural River Drainage (Downhill gradient descent from inland lake to ocean)
  const shouldDrainRiver = options?.withRiver ?? (W >= 256 && H >= 256);
  let riverDrainage: ProceduralRiverDrainageResult | undefined;
  if (shouldDrainRiver) {
    riverDrainage = generateProceduralRiverDrainage(
      sanitizedWaterMatrix,
      sanitizedHeightmap,
      { seed, placedStairs }
    );
    if (riverDrainage.riverCarved) {
      resolvedWater = resolveWaterCoastGrid(sanitizedWaterMatrix);
      // Initial resolution without stairs to find which stairs are still valid on the modified heightmap
      const unStairsResolved = resolveMountainMapGrid(sanitizedHeightmap, {
        palette: options?.mountainPalette ?? 'brown',
        paletteMatrix: geologicalClusters.paletteMatrix
      });
      const survivingStairs = placedStairs.filter((s) => {
        const cL = unStairsResolved.cellDetails[s.y]?.[s.x];
        const cR = unStairsResolved.cellDetails[s.y]?.[s.x + 1];
        return cL?.role === 'edge_south_top' && cR?.role === 'edge_south_top';
      });
      placedStairs = survivingStairs;
      // Re-resolve mountain autotiling after river carving 2-tile gorge through cliffs
      mountainResult = resolveMountainMapGrid(sanitizedHeightmap, {
        palette: options?.mountainPalette ?? 'brown',
        paletteMatrix: geologicalClusters.paletteMatrix,
        stairs: placedStairs
      });
    }
  }

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
      const terrain = sanitizedWaterMatrix[y]![x]!;
      const elev = sanitizedHeightmap[y]![x]!;
      const waterCell = resolvedWater.cellDetails[y]![x];
      const mtnCell = mountainResult.cellDetails[y]![x];
      const mBiome = macroBiomes.biomeGrid[y]?.[x];

      const layerStack: string[] = []; // no-domain: Estructura o identificador procedural de aventura

      let isWalkable = true;
      if (terrain === 'water' && waterCell?.role === 'center') {
        isWalkable = false; // Pure open water (requires Surf)
      }

      // Base ecological ground layer stack
      if (elev > 0) {
        const mtnPal = geologicalClusters?.paletteMatrix?.[y]?.[x] ?? options?.mountainPalette ?? 'brown';
        const plateauBase = mtnPal === 'gray'
          ? 'poke_cliff_gray_plateau_rock.png'
          : 'poke_cliff_brown_plateau_rock.png';
        layerStack.push(plateauBase);
      } else if (waterCell && waterCell.terrain !== 'grass') {
        for (const t of waterCell.layerStack) {
          layerStack.push(t);
        }
      } else if (terrain === 'water') {
        layerStack.push('poke_water_ocean_center.png');
      } else {
        const mCell = resolvedMacroBiomes.cellDetails[y]?.[x];
        if (mCell) {
          layerStack.push(...mCell.layerStack);
        } else {
          layerStack.push('poke_grass_plain.png');
        }
      }

      // Elevation & mountain layer stack
      let mtnRole: MountainRole | undefined;
      let isStair = false;

      if (mtnCell) {
        mtnRole = mtnCell.role;
        isStair = mtnCell.role === 'stairs_l' || mtnCell.role === 'stairs_r';

        if (elev > 0) {
          // Plateau or upper cliff: replace or overlay mountain tiles
          layerStack.push(mtnCell.primaryTile);
          if (mtnCell.overlayTiles && mtnCell.overlayTiles.length > 0) {
            layerStack.push(...mtnCell.overlayTiles);
          }
        }

        // Impassable outer edges and cliffs
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
      }

      // Check if there is a projected cliff foot from the north neighbor (y - 1)
      // Allow cliff feet to project onto lake water (for authentic sunken basin cliff faces),
      // but omit on the active 2-tile river channel so water flows freely through the gorge.
      const isRiverChannel = riverDrainage?.riverGrid?.[y]?.[x] ?? false;
      if (y > 0 && !isRiverChannel) {
        const northMtn = mountainResult.cellDetails[y - 1]![x];
        if (northMtn && northMtn.projectedFoot) {
          layerStack.push(northMtn.projectedFoot.tile);
          if (northMtn.projectedFoot.occupiesCell && terrain !== 'water') {
            isWalkable = false; // Blocked by cliff face drop on land (water is already non-walkable)
          } else if (!northMtn.projectedFoot.occupiesCell) {
            isStair = true;
            isWalkable = true;
          }
        }
      }

      cells[y]![x] = {
        x,
        y,
        terrain,
        elevation: elev,
        macroBiome: mBiome,
        mountainPalette: geologicalClusters.paletteMatrix[y]?.[x] ?? 'brown',
        waterRole: waterCell?.role,
        mountainRole: mtnRole,
        isStair,
        isWalkable,
        layerStack
      };
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

export { computeTransitableGrid } from './transitableGridEngine.ts';


