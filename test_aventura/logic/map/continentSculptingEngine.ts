/**
 * src/logic/map/continentSculptingEngine.ts
 *
 * PROCEDURAL CONTINENT SCULPTING ENGINE
 *
 * Implements Rule 7: "The Continent Wraps the Graph, Not Vice Versa".
 * Synthesizes a solid, cohesive continental landmass enveloping all terrestrial nodes and routes.
 * Eliminates artificial inland ocean voids, preserves peripheral ocean waters, and guarantees
 * 100% of mainland settlements rest deeply on solid continental bedrock.
 */

import { SimplexNoise } from './noise/simplexNoise.ts';
import type { EmbeddedTopologyGraph } from '../../types/map/pokemonGraphTypes.ts';
import {
  sanitizeWaterTerrainMatrix,
  type WaterTerrainKind
} from './waterAutotileEngine.ts';
import {
  resolveMountainMapGrid,
  type MountainPalette
} from './mountainAutotileEngine.ts';
import type {
  ContinentGeneratorOptions,
  ContinentMapResult,
  SettlementExclusionZone
} from './continentGenerator.ts';
import { generateArchipelagoIslands } from './archipelagoGenerator.ts';
import { synthesizeMacroBiomes } from './macroBiomeSynthesizer.ts';
import { generateContinentalMountains } from './continentMountainEngine.ts';
import {
  generateProceduralRiverDrainage,
  type ProceduralRiverDrainageResult
} from './continent/riverHydrographyEngine.ts';
import { compileGeologicalAutotiling } from './geologicalAutotilingEngine.ts';

export interface PerimeterBeachOptions {
  readonly variableBeach?: boolean;
  readonly seed?: number;
}

const DEFAULT_BEACH_WIDTH = 3;
const DEFAULT_LAKE_COUNT = 2;
const DEFAULT_SEED = 42;
const DEFAULT_MOUNTAIN_PALETTE: MountainPalette = 'brown';

/**
 * Distributes a natural sand beach transition buffer of width `beachWidth`
 * along the perimeter separating ocean water from continental grass.
 * Preserves the strict invariant: no grass cell ever touches ocean water directly.
 */
export function distributePerimeterBeach(
  matrix: WaterTerrainKind[][],
  beachWidth = DEFAULT_BEACH_WIDTH,
  seedOrOptions?: number | PerimeterBeachOptions
): void {
  const H = matrix.length;
  const W = matrix[0]?.length ?? 0;
  const isVariable = typeof seedOrOptions === 'object' ? (seedOrOptions.variableBeach ?? false) : false;
  const seed = typeof seedOrOptions === 'number' ? seedOrOptions : (seedOrOptions?.seed ?? DEFAULT_SEED);
  const prng = isVariable ? new SimplexNoise(seed + 99) : null;

  // Precompute target beach width per cell
  const targetWidth: number[][] = Array.from({ length: H }, (_, y) =>
    Array.from({ length: W }, (_, x) => {
      if (!isVariable || !prng) return beachWidth;
      const n = prng.noise2D(x * 0.08, y * 0.08);
      const varOffset = Math.round(n * 1.5);
      return Math.max(1, Math.min(beachWidth + 1, beachWidth + varOffset));
    })
  );

  // Multi-source BFS from ocean water cells
  const dist: number[][] = Array.from({ length: H }, () => Array(W).fill(Infinity));
  const queue: { x: number; y: number; d: number }[] = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (matrix[y]![x] === 'water') {
        dist[y]![x] = 0;
        queue.push({ x, y, d: 0 });
      }
    }
  }

  const maxPossibleWidth = beachWidth + 2;
  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++]!;
    if (curr.d >= maxPossibleWidth) continue;

    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = curr.x + dx!;
      const ny = curr.y + dy!;
      if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
        if (dist[ny]![nx]! > curr.d + 1) {
          dist[ny]![nx] = curr.d + 1;
          queue.push({ x: nx, y: ny, d: curr.d + 1 });
        }
      }
    }
  }

  // Turn land within targetWidth of ocean water into sand.
  // Invariant: dist <= 1 is ALWAYS turned into sand (since targetWidth >= 1),
  // ensuring no grass cell ever touches ocean water directly.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (matrix[y]![x] === 'grass' && dist[y]![x]! <= targetWidth[y]![x]!) {
        matrix[y]![x] = 'sand';
      }
    }
  }

  // Prune isolated 1-cell grass specks stranded within the beach
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (matrix[y]![x] === 'grass') {
        const hasGrassNeighbor =
          (y > 0 && matrix[y - 1]![x] === 'grass') ||
          (y < H - 1 && matrix[y + 1]![x] === 'grass') ||
          (x > 0 && matrix[y]![x - 1] === 'grass') ||
          (x < W - 1 && matrix[y]![x + 1] === 'grass');
        if (!hasGrassNeighbor) {
          matrix[y]![x] = 'sand';
        }
      }
    }
  }
}

/**
 * Prunes isolated small islands or orphan land patches (sand/grass)
 * that have fewer than minSize connected cells, converting them to ocean water.
 */
export function removeOrphanTiles(
  matrix: WaterTerrainKind[][],
  minSize = 4,
  keepOnlyMainContinent = false
): void {
  const H = matrix.length;
  if (H === 0) return;
  const W = matrix[0]?.length ?? 0;
  if (W === 0) return;

  const visited: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const components: { x: number; y: number }[][] = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (visited[y]![x] || matrix[y]![x] === 'water' || matrix[y]![x] === 'water_deep') {
        continue;
      }

      // BFS to find connected component of land cells
      const component: { x: number; y: number }[] = [];
      const queue: { x: number; y: number }[] = [{ x, y }];
      visited[y]![x] = true;

      let head = 0;
      while (head < queue.length) {
        const curr = queue[head++]!;
        component.push(curr);

        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nx = curr.x + dx!;
          const ny = curr.y + dy!;
          if (
            nx >= 0 && nx < W &&
            ny >= 0 && ny < H &&
            !visited[ny]![nx] &&
            matrix[ny]![nx] !== 'water' &&
            matrix[ny]![nx] !== 'water_deep'
          ) {
            visited[ny]![nx] = true;
            queue.push({ x: nx, y: ny });
          }
        }
      }

      components.push(component);
    }
  }

  if (components.length === 0) return;

  // Find the largest component (the main continental landmass)
  let largestIdx = 0;
  for (let i = 1; i < components.length; i++) {
    if (components[i]!.length > components[largestIdx]!.length) {
      largestIdx = i;
    }
  }

  for (let i = 0; i < components.length; i++) {
    const comp = components[i]!;
    if (keepOnlyMainContinent) {
      if (i !== largestIdx) {
        for (const cell of comp) {
          matrix[cell.y]![cell.x] = 'water';
        }
      }
    } else if (comp.length < minSize) {
      for (const cell of comp) {
        matrix[cell.y]![cell.x] = 'water';
      }
    }
  }
}

/**
 * Carves organic inland freshwater lakes into the continental grass plain.
 * Strictly guarantees lakes have >= 4 cells clearance from the beach.
 */
export function carveInlandLakes(
  matrix: WaterTerrainKind[][],
  lakeCount = DEFAULT_LAKE_COUNT,
  seed = DEFAULT_SEED
): void {
  const H = matrix.length;
  const W = matrix[0]?.length ?? 0;
  if (lakeCount <= 0) return;

  const noise = new SimplexNoise(seed + 101);

  const isLargeMap = Math.min(W, H) >= 96;
  const maxClearanceSearch = isLargeMap ? 14 : 6;
  const minClearanceReq = isLargeMap ? 9.5 : 5.0;
  const radius = isLargeMap ? 7.5 : 3.5;
  const searchExtent = Math.ceil(radius) + 2;
  const minLakeDist = isLargeMap ? 24 : 16;
  const noiseScale = isLargeMap ? 1.2 : 0.8;

  // Compute clearance from sand / ocean
  const clearance: number[][] = Array.from({ length: H }, () => Array(W).fill(0));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (matrix[y]![x] !== 'grass') continue;
      let minD = Infinity;
      for (let dy = -maxClearanceSearch; dy <= maxClearanceSearch; dy++) {
        for (let dx = -maxClearanceSearch; dx <= maxClearanceSearch; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H || matrix[ny]![nx] !== 'grass') {
            const d = Math.sqrt(dx * dx + dy * dy);
            if (d < minD) minD = d;
          }
        }
      }
      clearance[y]![x] = minD;
    }
  }

  // Find candidate centroids for lakes
  const candidates: { x: number; y: number; score: number }[] = [];
  for (let y = 8; y < H - 8; y++) {
    for (let x = 8; x < W - 8; x++) {
      if (clearance[y]![x]! >= minClearanceReq) {
        const n = noise.noise2D(x * 0.1, y * 0.1);
        candidates.push({ x, y, score: clearance[y]![x]! + n * 2.0 });
      }
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  const placedLakes: { x: number; y: number }[] = [];
  for (const cand of candidates) {
    if (placedLakes.length >= lakeCount) break;

    // Minimum distance between multiple lakes
    const tooClose = placedLakes.some(
      (l) => Math.hypot(l.x - cand.x, l.y - cand.y) < minLakeDist
    );
    if (tooClose) continue;

    placedLakes.push(cand);

    // Carve organic lake blob
    for (let dy = -searchExtent; dy <= searchExtent; dy++) {
      for (let dx = -searchExtent; dx <= searchExtent; dx++) {
        const lx = cand.x + dx;
        const ly = cand.y + dy;
        if (lx < 0 || lx >= W || ly < 0 || ly >= H) continue;

        const d = Math.hypot(dx, dy);
        const perturbation = noise.noise2D(lx * 0.25, ly * 0.25) * noiseScale;
        if (d + perturbation <= radius && matrix[ly]![lx] === 'grass') {
          matrix[ly]![lx] = 'water';
        }
      }
    }
  }
}

/**
 * Synthesizes a solid, cohesive continental landmass enveloping all terrestrial nodes and routes.
 * Eliminates artificial inland ocean voids, preserves peripheral ocean waters, and guarantees
 * 100% of mainland settlements rest deeply on solid continental bedrock.
 */
export function generateGraphEnvelopeLandmass(
  embedded: EmbeddedTopologyGraph,
  W: number,
  H: number,
  seed: number,
  _oceanRatio: number
): WaterTerrainKind[][] {
  const prng = new SimplexNoise(seed);
  const matrix: WaterTerrainKind[][] = Array.from({ length: H }, () =>
    Array<WaterTerrainKind>(W).fill('water')
  );

  // 1. Identify designated coastal port gym city (or southernmost gym city)
  const MIN_SOUTHERN_PORT_GRID_Y = 180;
  const gymCandidates = embedded.nodes.filter((n) => n.role === 'gym_city' || n.role === 'port_city');
  let designatedPortNode = gymCandidates.find((n) => n.hasPort || n.role === 'port_city');
  if (!designatedPortNode || designatedPortNode.gridY < MIN_SOUTHERN_PORT_GRID_Y) {
    let maxGridY = -1;
    for (const cand of gymCandidates) {
      if (cand.gridY > maxGridY) {
        maxGridY = cand.gridY;
        designatedPortNode = cand;
      }
    }
  }

  // Ensure exactly the designated coastal port node has hasPort = true
  if (designatedPortNode) {
    for (const n of embedded.nodes) {
      (n as { hasPort?: boolean }).hasPort = (n.id === designatedPortNode.id);
    }
  }

  // Mark surf route marine corridors where terrestrial land envelope BFS cannot expand
  const surfWaterMask: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  for (const corridor of embedded.corridors) {
    if (corridor.kind !== 'surf_route') continue;
    for (const pt of corridor.pathCells) {
      // Perturb radius with simplex noise for natural organic coastal straits
      const n = prng.noise2D(pt.x * 0.05, pt.y * 0.05);
      const rad = Math.max(8, Math.round(14 + n * 4.0));
      for (let dy = -rad; dy <= rad; dy++) {
        for (let dx = -rad; dx <= rad; dx++) {
          if (dx * dx + dy * dy <= rad * rad) {
            const wx = pt.x + dx;
            const wy = pt.y + dy;
            if (wx >= 0 && wx < W && wy >= 0 && wy < H) {
              // Protect terminal node footprints and their immediate disembarkation shorelines (margin = 4)
              const nearNode = embedded.nodes.some((node) => {
                const nodeMargin = 4;
                return (
                  wx >= node.gridX - nodeMargin &&
                  wx < node.gridX + node.width + nodeMargin &&
                  wy >= node.gridY - nodeMargin &&
                  wy < node.gridY + node.height + nodeMargin
                );
              });
              if (!nearNode) {
                surfWaterMask[wy]![wx] = true;
              }
            }
          }
        }
      }
    }
  }

  // Carve marine harbor channel south of designated coastal port city directly into open ocean
  if (designatedPortNode) {
    const harborMinX = Math.max(1, designatedPortNode.gridX - 2);
    const harborMaxX = Math.min(W - 2, designatedPortNode.gridX + designatedPortNode.width + 2);
    const harborMinY = designatedPortNode.gridY + designatedPortNode.height;
    for (let y = harborMinY; y < H; y++) {
      for (let x = harborMinX; x <= harborMaxX; x++) {
        surfWaterMask[y]![x] = true;
      }
    }
  }

  // 2. Multi-source BFS from all terrestrial nodes and non-surf corridors
  const dist: number[][] = Array.from({ length: H }, () => Array(W).fill(Infinity));
  const queue: { x: number; y: number; d: number }[] = [];

  // Seed terrestrial nodes with full footprint (excluding surfWaterMask harbor bay)
  for (const node of embedded.nodes) {
    for (let y = Math.max(0, node.gridY); y < Math.min(H, node.gridY + node.height); y++) {
      for (let x = Math.max(0, node.gridX); x < Math.min(W, node.gridX + node.width); x++) {
        if (!surfWaterMask[y]![x] && dist[y]![x] === Infinity) {
          dist[y]![x] = 0;
          queue.push({ x, y, d: 0 });
        }
      }
    }
  }

  // Seed terrestrial corridors (non-surf, non-wormhole)
  for (const corridor of embedded.corridors) {
    if (corridor.kind === 'surf_route' || corridor.kind === 'wormhole_tunnel') continue;
    for (const cell of corridor.pathCells) {
      if (cell.x >= 0 && cell.x < W && cell.y >= 0 && cell.y < H) {
        if (!surfWaterMask[cell.y]![cell.x] && dist[cell.y]![cell.x] === Infinity) {
          dist[cell.y]![cell.x] = 0;
          queue.push({ x: cell.x, y: cell.y, d: 0 });
        }
      }
    }
  }

  // Multi-source BFS outwards to compute continuous network proximity
  const maxBuffer = 55;
  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++]!;
    if (curr.d >= maxBuffer) continue;

    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = curr.x + dx!;
      const ny = curr.y + dy!;
      if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
        if (surfWaterMask[ny]![nx]) continue;
        if (dist[ny]![nx]! > curr.d + 1) {
          dist[ny]![nx] = curr.d + 1;
          queue.push({ x: nx, y: ny, d: curr.d + 1 });
        }
      }
    }
  }

  // Base continental radius buffer: 28 tiles around network (bridges 50-60 tile inter-city gaps cleanly)
  const baseBuffer = 28;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      // Guaranteed perimeter ocean margin or protected surf water corridor
      if (x < 8 || x >= W - 8 || y < 8 || y >= H - 8 || surfWaterMask[y]![x]) {
        matrix[y]![x] = 'water';
        continue;
      }

      const d = dist[y]![x]!;
      if (d === Infinity) continue;

      // Multi-octave Simplex noise for organic fractal coastlines
      const n1 = prng.noise2D(x * 0.025, y * 0.025) * 8.5;
      const n2 = prng.noise2D(x * 0.07, y * 0.07) * 4.0;
      const threshold = baseBuffer + n1 + n2;

      if (d <= threshold) {
        matrix[y]![x] = 'grass';
      }
    }
  }

  // 2. Seal Interior Holes: Flood-fill outer ocean from all 4 borders
  // Any water cell NOT reachable from the outer border ocean is an interior depression: convert to grass!
  const visitedOcean: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const oceanQueue: { x: number; y: number }[] = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x === 0 || x === W - 1 || y === 0 || y === H - 1) {
        if (matrix[y]![x] === 'water') {
          visitedOcean[y]![x] = true;
          oceanQueue.push({ x, y });
        }
      }
    }
  }

  let oHead = 0;
  while (oHead < oceanQueue.length) {
    const curr = oceanQueue[oHead++]!;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = curr.x + dx!;
      const ny = curr.y + dy!;
      if (
        nx >= 0 && nx < W &&
        ny >= 0 && ny < H &&
        !visitedOcean[ny]![nx] &&
        matrix[ny]![nx] === 'water'
      ) {
        visitedOcean[ny]![nx] = true;
        oceanQueue.push({ x: nx, y: ny });
      }
    }
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (matrix[y]![x] === 'water' && !visitedOcean[y]![x]) {
        matrix[y]![x] = 'grass';
      }
    }
  }

  return matrix;
}

export function sculptContinentFromGraph(
  embedded: EmbeddedTopologyGraph,
  options?: ContinentGeneratorOptions
): ContinentMapResult {
  const W = embedded.width;
  const H = embedded.height;
  const seed = options?.seed ?? embedded.seed;
  const beachWidth = options?.beachWidth ?? DEFAULT_BEACH_WIDTH;
  const lakeCount = options?.lakeCount ?? DEFAULT_LAKE_COUNT;

  // 1. Generate solid, organic continental landmass wrapping the entire graph
  const oceanRatio = options?.oceanWaterPercentage ?? 0.32;
  const rawMatrix = generateGraphEnvelopeLandmass(embedded, W, H, seed, oceanRatio);

  // Guarantee all nodes remain on solid land with comfortable buffer
  for (const node of embedded.nodes) {
    const pad = 4;
    const isPort = (node.hasPort || node.role === 'port_city');
    const padSouth = isPort ? 0 : pad;
    for (let y = Math.max(2, node.gridY - pad); y < Math.min(H - 2, node.gridY + node.height + padSouth); y++) {
      for (let x = Math.max(2, node.gridX - pad); x < Math.min(W - 2, node.gridX + node.width + pad); x++) {
        rawMatrix[y]![x] = 'grass';
      }
    }
  }

  // Guarantee all terrestrial (non-surf) corridor pathCells remain on solid land
  for (const corridor of embedded.corridors) {
    if (corridor.kind === 'surf_route' || corridor.kind === 'wormhole_tunnel') continue;
    for (const cell of corridor.pathCells) {
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const cy = cell.y + dy;
          const cx = cell.x + dx;
          if (cx >= 2 && cx < W - 2 && cy >= 2 && cy < H - 2) {
            rawMatrix[cy]![cx] = 'grass';
          }
        }
      }
    }
  }

  // Guarantee all nodes remain on solid land
  for (const node of embedded.nodes) {
    for (let y = Math.max(1, node.gridY); y < Math.min(H - 1, node.gridY + node.height); y++) {
      for (let x = Math.max(1, node.gridX); x < Math.min(W - 1, node.gridX + node.width); x++) {
        rawMatrix[y]![x] = 'grass';
      }
    }
  }

  // Guarantee all non-surf corridor pathCells remain on solid land
  for (const corridor of embedded.corridors) {
    if (corridor.kind === 'surf_route' || corridor.kind === 'wormhole_tunnel') continue;
    for (const cell of corridor.pathCells) {
      if (cell.x >= 1 && cell.x < W - 1 && cell.y >= 1 && cell.y < H - 1) {
        rawMatrix[cell.y]![cell.x] = 'grass';
      }
    }
  }

  // 3. Continuous Beach Buffer
  const variableBeach = options?.variableBeach ?? (Math.min(W, H) >= 80);
  distributePerimeterBeach(rawMatrix, beachWidth, { variableBeach, seed });

  // 4. Remove orphan tiles < 4 cells, allow multi-island/bay geography
  removeOrphanTiles(rawMatrix, 4, false);

  // 4b. Generate Maritime Archipelago (Pillar 1)
  const withArchipelago = options?.withArchipelago ?? (Math.min(W, H) >= 200);
  const archipelagoIslands = withArchipelago
    ? generateArchipelagoIslands(rawMatrix, { width: W, height: H, seed, count: options?.islandCount ?? 4 })
    : [];

  // 5. Inland Freshwater Lakes in open spaces
  carveInlandLakes(rawMatrix, lakeCount, seed);

  // 6. Sanitize Water Matrix
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

  // Guarantee outer perimeter remains 100% ocean water
  for (let x = 0; x < W; x++) {
    sanitizedWaterMatrix[0]![x] = 'water';
    sanitizedWaterMatrix[H - 1]![x] = 'water';
  }
  for (let y = 0; y < H; y++) {
    sanitizedWaterMatrix[y]![0] = 'water';
    sanitizedWaterMatrix[y]![W - 1] = 'water';
  }

  // Re-ensure non-surf corridors and nodes are transitable grass (coastal ports preserve beaches)
  for (const node of embedded.nodes) {
    if (node.role === 'port_city' || node.hasPort) continue;
    for (let y = Math.max(1, node.gridY - 2); y < Math.min(H - 1, node.gridY + node.height + 2); y++) {
      for (let x = Math.max(1, node.gridX - 2); x < Math.min(W - 1, node.gridX + node.width + 2); x++) {
        if (sanitizedWaterMatrix[y]![x] !== 'water_deep') {
          sanitizedWaterMatrix[y]![x] = 'grass';
        }
      }
    }
  }

  for (const corridor of embedded.corridors) {
    if (corridor.kind === 'surf_route' || corridor.kind === 'wormhole_tunnel') continue;
    for (const cell of corridor.pathCells) {
      if (cell.x >= 1 && cell.x < W - 1 && cell.y >= 1 && cell.y < H - 1) {
        if (sanitizedWaterMatrix[cell.y]![cell.x] === 'water' || sanitizedWaterMatrix[cell.y]![cell.x] === 'water_deep') {
          sanitizedWaterMatrix[cell.y]![cell.x] = 'grass';
        }
      }
    }
  }

  // 8. Macro Biome Synthesizer
  const macroBiomes = synthesizeMacroBiomes({
    width: W,
    height: H,
    seed,
    terrainMatrix: sanitizedWaterMatrix
  });

  // 9. Continental Mountains & Stairs
  const settlementExclusionZones: SettlementExclusionZone[] = [];
  let leaguePlateauZone: SettlementExclusionZone | undefined;
  const caveLocations: { x: number; y: number }[] = [];

  for (const node of embedded.nodes) {
    if (node.role === 'league') {
      leaguePlateauZone = {
        x: node.gridX,
        y: node.gridY,
        width: node.width,
        height: node.height,
        margin: 4
      };
    } else if (node.role === 'secondary_cave') {
      caveLocations.push({
        x: node.gridX + Math.floor(node.width / 2),
        y: node.gridY + Math.floor(node.height / 2)
      });
    } else {
      settlementExclusionZones.push({
        x: node.gridX,
        y: node.gridY,
        width: node.width,
        height: node.height,
        margin: 3
      });
    }
  }

  const continentalMountains = generateContinentalMountains(
    sanitizedWaterMatrix,
    {
      ...options,
      width: W,
      height: H,
      seed,
      macroBiomeGrid: macroBiomes.biomeGrid,
      settlementExclusionZones,
      leaguePlateauZone,
      caveLocations,
      withStairs: options?.withStairs ?? true
    }
  );
  const { sanitizedHeightmap, geologicalClusters } = continentalMountains;
  let { placedStairs } = continentalMountains;

  // 9b. Procedural River Drainage (Downhill gradient descent from inland lake to ocean)
  const shouldDrainRiver = options?.withRiver ?? (W >= 128 && H >= 128);
  let riverDrainage: ProceduralRiverDrainageResult | undefined;
  if (shouldDrainRiver) {
    riverDrainage = generateProceduralRiverDrainage(
      sanitizedWaterMatrix,
      sanitizedHeightmap,
      {
        seed,
        placedStairs,
        settlementExclusionZones: [
          ...settlementExclusionZones,
          ...(leaguePlateauZone ? [leaguePlateauZone] : [])
        ]
      }
    );
    if (riverDrainage.riverCarved) {
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
    }
  }

  // 10. Unified Geological Autotiling Pass
  const geoPass = compileGeologicalAutotiling(
    sanitizedWaterMatrix,
    sanitizedHeightmap,
    macroBiomes,
    {
      seed,
      mountainPalette: options?.mountainPalette ?? DEFAULT_MOUNTAIN_PALETTE,
      paletteMatrix: geologicalClusters.paletteMatrix,
      placedStairs,
      riverDrainage
    }
  );

  return {
    width: W,
    height: H,
    seed,
    terrainMatrix: geoPass.sanitizedWaterMatrix,
    heightmap: sanitizedHeightmap,
    resolvedWater: geoPass.resolvedWater,
    resolvedMountain: geoPass.resolvedMountain,
    placedStairs,
    cells: geoPass.cells,
    mountainPalette: options?.mountainPalette ?? DEFAULT_MOUNTAIN_PALETTE,
    macroBiomes,
    resolvedMacroBiomes: geoPass.resolvedMacroBiomes,
    geologicalClusters,
    archipelagoIslands,
    riverDrainage
  };
}
