/**
 * test_aventura/logic/map/tallGrassPlacementEngine.ts
 *
 * TALL GRASS & ENCOUNTER FIELD PLACEMENT ENGINE
 *
 * Places 3x3 to 5x5 tall grass patches in valley clearings adjacent to routes,
 * dungeon forest internal trails, and prunes isolated 1-2 cell fragments.
 */

import {
  MIN_TALL_GRASS_PATCH_SEPARATION,
  TALL_GRASS_WIDTH_MIN,
  TALL_GRASS_WIDTH_VARIANCE,
  TALL_GRASS_HEIGHT_MIN,
  TALL_GRASS_HEIGHT_VARIANCE,
  TALL_GRASS_PATH_DIST_MIN,
  TALL_GRASS_PATH_DIST_MAX,
  TALL_GRASS_SEARCH_RADIUS,
  TALL_GRASS_NOISE_SCALE,
  TALL_GRASS_MIN_DENSITY_RATIO,
  TALL_GRASS_SHUFFLE_PRIMARY_FACTOR,
  TALL_GRASS_SHUFFLE_SECONDARY_FACTOR,
  TALL_GRASS_SHUFFLE_LARGE,
  TALL_GRASS_PRUNE_MIN_NEIGHBORS,
  TALL_GRASS_PRUNE_ITERATIONS,
  TALL_GRASS_CANDIDATE_SEARCH_MARGIN_MIN,
  TALL_GRASS_CANDIDATE_SEARCH_MARGIN_MAX,
  MIN_LARGE_FOREST_DUNGEON_DIMENSION,
  FOREST_DUNGEON_TRAIL_MARGIN_RADIUS,
  FOREST_DUNGEON_TRAIL_DIST_MIN,
  FOREST_DUNGEON_TRAIL_DIST_MAX,
  FOREST_DUNGEON_TRAIL_MARGIN_NOISE_SCALE,
  FOREST_DUNGEON_TRAIL_MARGIN_NOISE_THRESHOLD
} from '../../config/wildernessConfig.ts';
import type { POINode, RouteWaypoint } from '../../types/map/poiTypes.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import type { MacroBiome } from './macroBiomeSynthesizer.ts';
import { type SimplexNoise } from './noise/simplexNoise.ts';
import type { WaterTerrainKind } from './waterAutotileEngine.ts';
import type { TallGrassPatch } from './wildernessVegetationEngine.ts';

export interface TallGrassPlacementContext {
  readonly H: number;
  readonly W: number;
  readonly continent: ContinentMapResult;
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly transitableGrid?: readonly (readonly boolean[])[];
  readonly urbanBlocked: readonly (readonly boolean[])[];
  readonly tallGrassBlocked: readonly (readonly boolean[])[];
  readonly stairBlocked: readonly (readonly boolean[])[];
  readonly prng: SimplexNoise;
  readonly targetPatches: number;
  readonly pois: readonly POINode[];
  readonly tallGrassGrid: boolean[][];
  readonly tallGrassPatches: TallGrassPatch[];
  readonly treeBlocked: boolean[][];
}

/**
 * Places procedural tall grass encounter fields.
 */
function isExcludedTallGrassBiome(biome: MacroBiome): boolean {
  return biome === 'arid_desert' || biome === 'volcanic_plateau' || biome === 'mint_highland';
}

function isExcludedTallGrassNeighborTerrain(terrain: WaterTerrainKind): boolean {
  return terrain === 'water' || terrain === 'water_deep' || terrain === 'sand';
}

const MIN_TALL_GRASS_COMPONENT_CELLS = 6 as const;
const TALL_GRASS_CARDINAL_DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1]
] as const;

function collectTallGrassComponent(
  startX: number,
  startY: number,
  tallGrassGrid: readonly (readonly boolean[])[],
  visited: boolean[][]
): readonly { readonly x: number; readonly y: number }[] {
  const H = tallGrassGrid.length;
  const W = tallGrassGrid[0]?.length ?? 0;
  const component: { readonly x: number; readonly y: number }[] = [];
  const queue: { readonly x: number; readonly y: number }[] = [{ x: startX, y: startY }];
  visited[startY]![startX] = true;

  while (queue.length > 0) {
    const cur = queue.pop()!;
    component.push(cur);
    for (const [dx, dy] of TALL_GRASS_CARDINAL_DIRS) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx <= 0 || nx >= W - 1 || ny <= 0 || ny >= H - 1) continue;
      if (!tallGrassGrid[ny]![nx] || visited[ny]![nx]) continue;
      visited[ny]![nx] = true;
      queue.push({ x: nx, y: ny });
    }
  }
  return component;
}

function pruneSmallTallGrassComponents(
  tallGrassGrid: boolean[][],
  treeBlocked: boolean[][],
  W: number,
  H: number
): void {
  const visited: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (!tallGrassGrid[y]![x] || visited[y]![x]) continue;
      const component = collectTallGrassComponent(x, y, tallGrassGrid, visited);
      if (component.length >= MIN_TALL_GRASS_COMPONENT_CELLS) continue;
      for (const pt of component) {
        tallGrassGrid[pt.y]![pt.x] = false;
        treeBlocked[pt.y]![pt.x] = false;
      }
    }
  }
}

function computeMinDistToPath(
  x: number,
  y: number,
  pathGrid: readonly (readonly boolean[])[],
  radius: number
): number {
  let distToPath = Infinity;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (pathGrid[y + dy]?.[x + dx]) {
        const d = Math.hypot(dx, dy);
        if (d < distToPath) distToPath = d;
      }
    }
  }
  return distToPath;
}

export interface TallGrassPatchBounds {
  readonly cx0: number;
  readonly cy0: number;
  readonly pw: number;
  readonly ph: number;
}

export interface TallGrassGridBuffers {
  readonly tallGrassGrid: boolean[][];
  readonly treeBlocked: boolean[][];
}

interface ForestDungeonDimensions {
  readonly W: number;
  readonly H: number;
}

const TALL_GRASS_OVAL_CUTOFF = 1.05 as const;
const TALL_GRASS_OVAL_WARP_SCALE = 0.35 as const;
const TALL_GRASS_OVAL_WARP_AMP = 0.24 as const;

function applyTallGrassPatch(
  bounds: TallGrassPatchBounds,
  grids: TallGrassGridBuffers,
  isEligible: (x: number, y: number) => boolean,
  prng: { noise2D: (x: number, y: number) => number }
): void {
  const { cx0, cy0, pw, ph } = bounds;
  const { tallGrassGrid, treeBlocked } = grids;
  const rx = Math.max(1.2, pw * 0.5);
  const ry = Math.max(1.2, ph * 0.5);
  const midX = pw * 0.5;
  const midY = ph * 0.5;

  for (let dy = 0; dy < ph; dy++) {
    for (let dx = 0; dx < pw; dx++) {
      const cx = cx0 + dx;
      const cy = cy0 + dy;
      const normDist = Math.hypot((dx + 0.5 - midX) / rx, (dy + 0.5 - midY) / ry);
      const warp =
        prng.noise2D(cx * TALL_GRASS_OVAL_WARP_SCALE, cy * TALL_GRASS_OVAL_WARP_SCALE) *
        TALL_GRASS_OVAL_WARP_AMP;
      if (normDist + warp > TALL_GRASS_OVAL_CUTOFF) continue;
      if (isEligible(cx, cy)) {
        tallGrassGrid[cy]![cx] = true;
        treeBlocked[cy]![cx] = true;
      }
    }
  }
}

interface TrailDungeonContext {
  readonly W: number;
  readonly H: number;
  readonly trailSet: ReadonlySet<string>;
  readonly bSet: ReadonlySet<string>;
  readonly propSet: ReadonlySet<string>;
  readonly tallGrassGrid: boolean[][];
  readonly treeBlocked: boolean[][];
  readonly isCellEligibleForTallGrass: (x: number, y: number) => boolean;
  readonly prng: { noise2D: (x: number, y: number) => number };
}

function stampTrailMarginGrassCell(cell: RouteWaypoint, ctx: TrailDungeonContext): void {
  for (
    let dy = -FOREST_DUNGEON_TRAIL_MARGIN_RADIUS;
    dy <= FOREST_DUNGEON_TRAIL_MARGIN_RADIUS;
    dy++
  ) {
    const ny = cell.y + dy;
    if (ny < 0 || ny >= ctx.H) continue;
    for (
      let dx = -FOREST_DUNGEON_TRAIL_MARGIN_RADIUS;
      dx <= FOREST_DUNGEON_TRAIL_MARGIN_RADIUS;
      dx++
    ) {
      const nx = cell.x + dx;
      if (nx < 0 || nx >= ctx.W) continue;
      const d = Math.hypot(dx, dy);
      if (d < FOREST_DUNGEON_TRAIL_DIST_MIN || d > FOREST_DUNGEON_TRAIL_DIST_MAX) continue;
      if (
        ctx.trailSet.has(`${nx}_${ny}`) ||
        ctx.bSet.has(`${nx}_${ny}`) ||
        ctx.propSet.has(`${nx}_${ny}`)
      ) {
        continue;
      }
      if (!ctx.isCellEligibleForTallGrass(nx, ny)) continue;

      const noiseVal = ctx.prng.noise2D(
        nx * FOREST_DUNGEON_TRAIL_MARGIN_NOISE_SCALE,
        ny * FOREST_DUNGEON_TRAIL_MARGIN_NOISE_SCALE
      );
      if (noiseVal > FOREST_DUNGEON_TRAIL_MARGIN_NOISE_THRESHOLD) {
        ctx.tallGrassGrid[ny]![nx] = true;
        ctx.treeBlocked[ny]![nx] = true;
      }
    }
  }
}

function placeForestDungeonTallGrass(
  poi: POINode,
  dims: ForestDungeonDimensions,
  grids: TallGrassGridBuffers,
  isCellEligibleForTallGrass: (x: number, y: number) => boolean,
  prng: { noise2D: (x: number, y: number) => number }
): void {
  const { W, H } = dims;
  const { tallGrassGrid, treeBlocked } = grids;
  if (poi.type !== 'dungeon_forest' || !poi.urbanLayout?.internalStreets) return;
  const trailCells = poi.urbanLayout.internalStreets;
  const trailSet = new Set(trailCells.map((c) => `${c.x}_${c.y}`));
  const bSet = new Set<string>();
  if (poi.urbanLayout.buildings) {
    for (const b of poi.urbanLayout.buildings) {
      for (let dy = 0; dy < b.height; dy++) {
        for (let dx = 0; dx < b.width; dx++) {
          bSet.add(`${b.x + dx}_${b.y + dy}`);
        }
      }
    }
  }
  const propSet = new Set(poi.urbanLayout.props?.map((p) => `${p.x}_${p.y}`) ?? []);

  const fw = poi.footprint.width;
  const fh = poi.footprint.height;
  const fMidX = poi.gridX + Math.floor(fw / 2);
  const fMidY = poi.gridY + Math.floor(fh / 2);

  const clearings = [
    {
      x1: fMidX + 1,
      x2: Math.min(poi.gridX + fw - 3, fMidX + 5),
      y1: fMidY + 2,
      y2: Math.min(poi.gridY + fh - 5, fMidY + 7)
    },
    {
      x1: Math.max(poi.gridX + 3, fMidX - 6),
      x2: fMidX - 2,
      y1: Math.max(poi.gridY + 5, fMidY - 7),
      y2: fMidY - 2
    }
  ];

  for (const cl of clearings) {
    for (let y = cl.y1; y <= cl.y2; y++) {
      if (y < 0 || y >= H) continue;
      for (let x = cl.x1; x <= cl.x2; x++) {
        if (
          x >= 0 &&
          x < W &&
          !trailSet.has(`${x}_${y}`) &&
          !bSet.has(`${x}_${y}`) &&
          !propSet.has(`${x}_${y}`) &&
          isCellEligibleForTallGrass(x, y)
        ) {
          tallGrassGrid[y]![x] = true;
          treeBlocked[y]![x] = true;
        }
      }
    }
  }

  if (fw >= MIN_LARGE_FOREST_DUNGEON_DIMENSION && fh >= MIN_LARGE_FOREST_DUNGEON_DIMENSION) {
    const trailCtx: TrailDungeonContext = {
      W,
      H,
      trailSet,
      bSet,
      propSet,
      tallGrassGrid,
      treeBlocked,
      isCellEligibleForTallGrass,
      prng
    };
    for (const cell of trailCells) {
      stampTrailMarginGrassCell(cell, trailCtx);
    }
  }
}

const ROUTE_BELT_MARGIN_CELLS = 4 as const;
const ROUTE_BELT_STEP = 2 as const;
const ROUTE_BELT_MAX_PATH_CELLS = 26 as const;
const ROUTE_BELT_MIN_SPACING = 8 as const;
const ROUTE_BELT_MIN_VALID_CELLS = 6 as const;
const ROUTE_BELT_POI_CLEARANCE = 3 as const;

function isCellEligibleForTallGrassNeighbors(
  x: number,
  y: number,
  continent: ContinentMapResult
): boolean {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const ny = y + dy;
      const nx = x + dx;
      if ((continent.heightmap[ny]?.[nx] ?? 0) > 0) return false;
      if (continent.resolvedMountain.occupiedFootCells[ny]?.[nx]) return false;
      const nTerr = continent.terrainMatrix[ny]?.[nx];
      if (nTerr && isExcludedTallGrassNeighborTerrain(nTerr)) {
        return false;
      }
    }
  }
  return true;
}

function isPointInsidePoiMargin(x: number, y: number, pois: readonly POINode[]): boolean {
  return pois.some(
    (poi) =>
      x >= poi.gridX - ROUTE_BELT_POI_CLEARANCE &&
      x <= poi.gridX + poi.footprint.width + ROUTE_BELT_POI_CLEARANCE - 1 &&
      y >= poi.gridY - ROUTE_BELT_POI_CLEARANCE &&
      y <= poi.gridY + poi.footprint.height + ROUTE_BELT_POI_CLEARANCE - 1
  );
}

function tryStampSingleBelt(
  x: number,
  y: number,
  pathGrid: readonly (readonly boolean[])[],
  tallGrassGrid: boolean[][],
  treeBlocked: boolean[][],
  isValid: (cx: number, cy: number) => boolean
): number {
  let validCount = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (isValid(x + dx, y + dy)) validCount++;
    }
  }
  if (validCount < ROUTE_BELT_MIN_VALID_CELLS) return 0;

  let pathCells = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const bx = x + dx;
      const by = y + dy;
      if (!isValid(bx, by)) continue;
      tallGrassGrid[by]![bx] = true;
      treeBlocked[by]![bx] = true;
      if (pathGrid[by]?.[bx]) pathCells++;
    }
  }
  return pathCells;
}

function stampAllRouteBelts(
  pathGrid: readonly (readonly boolean[])[],
  tallGrassGrid: boolean[][],
  treeBlocked: boolean[][],
  W: number,
  H: number,
  isValid: (cx: number, cy: number) => boolean
): void {
  let routeBeltCellsPlaced = 0;
  const placedBelts: { readonly x: number; readonly y: number }[] = [];
  for (
    let y = ROUTE_BELT_MARGIN_CELLS;
    y < H - ROUTE_BELT_MARGIN_CELLS && routeBeltCellsPlaced < ROUTE_BELT_MAX_PATH_CELLS;
    y += ROUTE_BELT_STEP
  ) {
    for (
      let x = ROUTE_BELT_MARGIN_CELLS;
      x < W - ROUTE_BELT_MARGIN_CELLS && routeBeltCellsPlaced < ROUTE_BELT_MAX_PATH_CELLS;
      x += ROUTE_BELT_STEP
    ) {
      if (!pathGrid[y]?.[x] || !isValid(x, y)) continue;
      if (placedBelts.some((b) => Math.hypot(b.x - x, b.y - y) < ROUTE_BELT_MIN_SPACING)) continue;
      const stamped = tryStampSingleBelt(x, y, pathGrid, tallGrassGrid, treeBlocked, isValid);
      if (stamped > 0) {
        placedBelts.push({ x, y });
        routeBeltCellsPlaced += stamped;
      }
    }
  }
}

export function placeTallGrassPatches(ctx: TallGrassPlacementContext): void {
  const {
    H,
    W,
    continent,
    pathGrid,
    transitableGrid,
    urbanBlocked,
    tallGrassBlocked,
    stairBlocked,
    prng,
    targetPatches,
    pois,
    tallGrassGrid,
    tallGrassPatches,
    treeBlocked
  } = ctx;

  const pathNeighbors: { x: number; y: number }[] = [];

  const isCellEligibleForTallGrass = (cx: number, cy: number): boolean => {
    if (cx < 2 || cx >= W - 2 || cy < 2 || cy >= H - 2) return false;
    if (pathGrid[cy]?.[cx]) return false;
    if (transitableGrid && !transitableGrid[cy]?.[cx]) return false;
    if (continent.terrainMatrix[cy]?.[cx] !== 'grass') return false;
    if ((continent.heightmap[cy]?.[cx] ?? 0) !== 0) return false;
    if (continent.resolvedMountain.occupiedFootCells[cy]?.[cx]) return false;
    if (urbanBlocked[cy]?.[cx] || tallGrassBlocked[cy]?.[cx] || stairBlocked[cy]?.[cx])
      return false;

    const mBiome = continent.macroBiomes?.biomeGrid[cy]?.[cx];
    if (mBiome && isExcludedTallGrassBiome(mBiome)) return false;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ny = cy + dy;
        const nx = cx + dx;
        if (ny >= 0 && ny < H && nx >= 0 && nx < W) {
          if ((continent.heightmap[ny]?.[nx] ?? 0) > 0) return false;
          if (continent.resolvedMountain.occupiedFootCells[ny]?.[nx]) return false;
          const terr = continent.terrainMatrix[ny]?.[nx];
          if (terr && isExcludedTallGrassNeighborTerrain(terr)) return false;
        }
      }
    }

    return true;
  };

  // Find candidate spots that are 1-5 cells away from a path, on flat grass (elevation 0)
  for (
    let y = TALL_GRASS_CANDIDATE_SEARCH_MARGIN_MIN;
    y < H - TALL_GRASS_CANDIDATE_SEARCH_MARGIN_MAX;
    y++
  ) {
    for (
      let x = TALL_GRASS_CANDIDATE_SEARCH_MARGIN_MIN;
      x < W - TALL_GRASS_CANDIDATE_SEARCH_MARGIN_MAX;
      x++
    ) {
      if (!isCellEligibleForTallGrass(x, y)) continue;

      const distToPath = computeMinDistToPath(x, y, pathGrid, TALL_GRASS_SEARCH_RADIUS);
      if (distToPath >= TALL_GRASS_PATH_DIST_MIN && distToPath <= TALL_GRASS_PATH_DIST_MAX) {
        pathNeighbors.push({ x, y });
      }
    }
  }

  // Uniform spatial Fisher-Yates shuffle of candidate centroids across the entire continent
  for (let i = pathNeighbors.length - 1; i > 0; i--) {
    const j =
      Math.abs(
        Math.floor(
          prng.noise2D(
            i * TALL_GRASS_SHUFFLE_PRIMARY_FACTOR,
            i * TALL_GRASS_SHUFFLE_SECONDARY_FACTOR
          ) * TALL_GRASS_SHUFFLE_LARGE
        )
      ) %
      (i + 1);
    const temp = pathNeighbors[i]!;
    pathNeighbors[i] = pathNeighbors[j]!;
    pathNeighbors[j] = temp;
  }

  let placedPatchCount = 0;

  for (const cand of pathNeighbors) {
    if (placedPatchCount >= targetPatches) break;

    const tooClose = tallGrassPatches.some(
      (p) => Math.hypot(p.x - cand.x, p.y - cand.y) < MIN_TALL_GRASS_PATCH_SEPARATION
    );
    if (tooClose) continue;

    const pw =
      TALL_GRASS_WIDTH_MIN +
      (Math.abs(
        Math.floor(
          prng.noise2D(cand.x * TALL_GRASS_NOISE_SCALE, cand.y * TALL_GRASS_NOISE_SCALE) *
            TALL_GRASS_WIDTH_VARIANCE
        )
      ) %
        TALL_GRASS_WIDTH_VARIANCE);
    const ph =
      TALL_GRASS_HEIGHT_MIN +
      (Math.abs(
        Math.floor(
          prng.noise2D(cand.y * TALL_GRASS_NOISE_SCALE, cand.x * TALL_GRASS_NOISE_SCALE) *
            TALL_GRASS_HEIGHT_VARIANCE
        )
      ) %
        TALL_GRASS_HEIGHT_VARIANCE);

    let validCellCount = 0;
    for (let dy = 0; dy < ph; dy++) {
      for (let dx = 0; dx < pw; dx++) {
        const cx = cand.x + dx;
        const cy = cand.y + dy;
        if (isCellEligibleForTallGrass(cx, cy)) {
          validCellCount++;
        }
      }
    }

    if (validCellCount >= Math.floor(pw * ph * TALL_GRASS_MIN_DENSITY_RATIO)) {
      tallGrassPatches.push({ x: cand.x, y: cand.y, width: pw, height: ph });
      applyTallGrassPatch(
        { cx0: cand.x, cy0: cand.y, pw, ph },
        { tallGrassGrid, treeBlocked },
        isCellEligibleForTallGrass,
        prng
      );
      placedPatchCount++;
    }
  }

  for (const poi of pois) {
    placeForestDungeonTallGrass(
      poi,
      { W, H },
      { tallGrassGrid, treeBlocked },
      isCellEligibleForTallGrass,
      prng
    );
  }

  // Stamp periodic Pokémon-style tall-grass encounter belts across long wilderness route stretches
  const isRouteBeltCellValid = (x: number, y: number): boolean => {
    if (x < 3 || x >= W - 3 || y < 3 || y >= H - 3) return false;
    if (continent.terrainMatrix[y]?.[x] !== 'grass') return false;
    if ((continent.heightmap[y]?.[x] ?? 0) !== 0) return false;
    if (continent.resolvedMountain.occupiedFootCells[y]?.[x]) return false;
    if (urbanBlocked[y]?.[x] || tallGrassBlocked[y]?.[x] || stairBlocked[y]?.[x]) return false;
    const mBiome = continent.macroBiomes?.biomeGrid[y]?.[x];
    if (mBiome && isExcludedTallGrassBiome(mBiome)) return false;
    return (
      isCellEligibleForTallGrassNeighbors(x, y, continent) && !isPointInsidePoiMargin(x, y, pois)
    );
  };

  stampAllRouteBelts(pathGrid, tallGrassGrid, treeBlocked, W, H, isRouteBeltCellValid);

  // Prune any isolated 1-cell or 2-cell tips and any connected tall-grass sliver < 6 cells
  for (let iter = 0; iter < TALL_GRASS_PRUNE_ITERATIONS; iter++) {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (!tallGrassGrid[y]![x]) continue;
        let neighbors = 0;
        if (tallGrassGrid[y - 1]![x]) neighbors++;
        if (tallGrassGrid[y + 1]![x]) neighbors++;
        if (tallGrassGrid[y]![x - 1]) neighbors++;
        if (tallGrassGrid[y]![x + 1]) neighbors++;
        if (neighbors < TALL_GRASS_PRUNE_MIN_NEIGHBORS) {
          tallGrassGrid[y]![x] = false;
        }
      }
    }
  }
  pruneSmallTallGrassComponents(tallGrassGrid, treeBlocked, W, H);
}
