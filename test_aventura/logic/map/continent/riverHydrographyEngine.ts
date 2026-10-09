/**
 * src/logic/map/continent/riverHydrographyEngine.ts
 *
 * GLOBAL RIVER & HYDROGRAPHY ENGINE
 *
 * Simulates organic river basins, sinusoidal meanders, freshwater lakes,
 * and automatic bridge detection when paths intersect river channels.
 */

import { SimplexNoise, fbm2D } from '../noise/simplexNoise.ts';
import type { WaterTerrainKind } from '../waterAutotileEngine.ts';
import type { SettlementExclusionZone } from '../continentGenerator.ts';

export interface RiverWaypoint {
  readonly x: number;
  readonly y: number;
}

export interface RiverSpec {
  readonly id: string; // domain-ok: dynamic river identifier
  readonly name: string; // domain-ok: human readable river name
  readonly points: readonly RiverWaypoint[];
  readonly width: number; // channel width in tiles (2-4)
  readonly meanderRoughness?: number; // 0.0 - 1.0 (default: 0.25)
}

/**
 * Carves an organic freshwater pond or lake into the terrain matrix.
 */
export function carveOrganicLake(
  matrix: WaterTerrainKind[][],
  cx: number,
  cy: number,
  radius: number,
  roughness = 0.3,
  seed = 42
): void {
  const H = matrix.length;
  const W = matrix[0]?.length ?? 0;
  const noise = new SimplexNoise(seed);
  const maxR = Math.ceil(radius * 1.6);

  const minX = Math.max(0, Math.floor(cx - maxR));
  const maxX = Math.min(W - 1, Math.ceil(cx + maxR));
  const minY = Math.max(0, Math.floor(cy - maxR));
  const maxY = Math.min(H - 1, Math.ceil(cy + maxR));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      if (dist === 0) {
        matrix[y]![x] = 'water';
        continue;
      }

      const angle = Math.atan2(dy, dx);
      const n = fbm2D(noise, Math.cos(angle) * 3.0 + 5, Math.sin(angle) * 3.0 + 5, {
        octaves: 2,
        scale: 0.4
      });
      const effectiveR = radius * (1.0 + n * roughness);

      if (dist <= effectiveR) {
        matrix[y]![x] = 'water';
      }
    }
  }
}

/**
 * Carves a meandering river channel connecting a sequence of waypoints.
 */
export function carveRiverSystem(
  matrix: WaterTerrainKind[][],
  river: RiverSpec,
  seed = 77
): void {
  const H = matrix.length;
  const W = matrix[0]?.length ?? 0;
  const noise = new SimplexNoise(seed);
  const roughness = river.meanderRoughness ?? 0.25;
  const halfWidth = river.width / 2;

  const points = river.points;
  if (points.length < 2) return;

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const steps = Math.max(2, Math.ceil(dist * 2.5));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      // Linear baseline
      const bx = p1.x + (p2.x - p1.x) * t;
      const by = p1.y + (p2.y - p1.y) * t;

      // Perpendicular normal vector for sinusoidal meander
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;

      // Meander displacement via Sine + Simplex Noise
      const sineWave = Math.sin(t * Math.PI * 3 + i) * (river.width * 0.85);
      const simplexOffset = fbm2D(noise, bx * 0.08, by * 0.08, { octaves: 2 }) * (river.width * 1.2 * roughness);
      const totalOffset = sineWave + simplexOffset;

      const riverCenterX = bx + nx * totalOffset;
      const riverCenterY = by + ny * totalOffset;

      // Carve disk along river path
      const rCeil = Math.ceil(halfWidth);
      for (let cy = -rCeil; cy <= rCeil; cy++) {
        for (let cx = -rCeil; cx <= rCeil; cx++) {
          if (Math.hypot(cx, cy) <= halfWidth + 0.2) {
            const rx = Math.round(riverCenterX + cx);
            const ry = Math.round(riverCenterY + cy);
            if (rx >= 0 && rx < W && ry >= 0 && ry < H) {
              matrix[ry]![rx] = 'water';
            }
          }
        }
      }
    }
  }
}

/**
 * Detects where pathGrid intersects river/water channels and stamps bridges.
 */
export function stampBridgesOnWaterIntersections(
  terrainMatrix: readonly (readonly WaterTerrainKind[])[],
  pathGrid: readonly (readonly boolean[])[],
  bridgeGrid: boolean[][]
): void {
  const H = terrainMatrix.length;
  const W = terrainMatrix[0]?.length ?? 0;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (pathGrid[y]?.[x] && terrainMatrix[y]?.[x] === 'water') {
        bridgeGrid[y]![x] = true;
      }
    }
  }
}

export interface ProceduralRiverDrainageOptions {
  readonly seed?: number;
  readonly placedStairs?: readonly { x: number; y: number }[];
  readonly minLakeSize?: number;
  readonly settlementExclusionZones?: readonly SettlementExclusionZone[];
}

export interface ProceduralRiverDrainageResult {
  readonly riverCarved: boolean;
  readonly springPoint?: { x: number; y: number };
  readonly riverPath?: readonly { x: number; y: number }[];
  readonly carvedCellsCount: number;
  readonly riverGrid?: readonly (readonly boolean[])[];
}

/**
 * Procedural River Drainage Engine:
 * Simulates downhill gradient descent drainage from inland/mountain freshwater lakes to the ocean.
 * Selects the barycenter of an inland lake as a spring and traces a downhill cost-path to the nearest
 * ocean coast, carving a uniform 2-cell wide water channel with riverbed heightmap adjustment.
 * If no interior lakes exist, safely omits without error.
 */
export function generateProceduralRiverDrainage(
  terrainMatrix: WaterTerrainKind[][],
  heightmap: number[][],
  options?: ProceduralRiverDrainageOptions
): ProceduralRiverDrainageResult {
  const H = terrainMatrix.length;
  const W = terrainMatrix[0]?.length ?? 0;
  const seed = options?.seed ?? 42;
  const minLakeSize = options?.minLakeSize ?? 6;

  // Build settlement exclusion mask
  const settlementMask: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  if (options?.settlementExclusionZones) {
    for (const zone of options.settlementExclusionZones) {
      const margin = zone.margin ?? 3;
      const minX = Math.max(0, zone.x - margin);
      const maxX = Math.min(W - 1, zone.x + zone.width + margin);
      const minY = Math.max(0, zone.y - margin);
      const maxY = Math.min(H - 1, zone.y + zone.height + margin);
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          settlementMask[y]![x] = true;
        }
      }
    }
  }

  // 1. Identify all ocean water cells (cells on map border connected to open water)
  const visitedOcean: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const oceanWaterQ: { x: number; y: number }[] = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (x === 0 || x === W - 1 || y === 0 || y === H - 1) {
        if (terrainMatrix[y]![x] === 'water' || terrainMatrix[y]![x] === 'water_deep') {
          visitedOcean[y]![x] = true;
          oceanWaterQ.push({ x, y });
        }
      }
    }
  }

  let owHead = 0;
  while (owHead < oceanWaterQ.length) {
    const cur = oceanWaterQ[owHead++]!;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = cur.x + dx!;
      const ny = cur.y + dy!;
      if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
        if (!visitedOcean[ny]![nx] && (terrainMatrix[ny]![nx] === 'water' || terrainMatrix[ny]![nx] === 'water_deep')) {
          visitedOcean[ny]![nx] = true;
          oceanWaterQ.push({ x: nx, y: ny });
        }
      }
    }
  }

  // 2. Identify interior lakes (freshwater bodies not connected to the ocean border)
  const lakeVisited: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  interface LakeComponent {
    cells: { x: number; y: number }[];
    hasElevGe1: boolean;
    maxElevation: number;
  }
  const lakes: LakeComponent[] = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (terrainMatrix[y]![x] === 'water' && !visitedOcean[y]![x] && !lakeVisited[y]![x]) {
        const cells: { x: number; y: number }[] = [];
        const lq: { x: number; y: number }[] = [{ x, y }];
        lakeVisited[y]![x] = true;
        let lHead = 0;
        let hasElevGe1 = false;
        let maxElev = 0;

        while (lHead < lq.length) {
          const pt = lq[lHead++]!;
          cells.push(pt);
          const ptElev = heightmap[pt.y]?.[pt.x] ?? 0;
          if (ptElev > maxElev) maxElev = ptElev;
          if (ptElev >= 1) hasElevGe1 = true;

          for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
            const nx = pt.x + dx!;
            const ny = pt.y + dy!;
            if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
              const neighborElev = heightmap[ny]?.[nx] ?? 0;
              if (neighborElev > maxElev) maxElev = neighborElev;
              if (neighborElev >= 1) hasElevGe1 = true;

              if (!visitedOcean[ny]![nx] && !lakeVisited[ny]![nx] && terrainMatrix[ny]![nx] === 'water') {
                lakeVisited[ny]![nx] = true;
                lq.push({ x: nx, y: ny });
              }
            }
          }
        }

        if (cells.length >= minLakeSize) {
          lakes.push({ cells, hasElevGe1, maxElevation: maxElev });
        }
      }
    }
  }

  // If no interior lakes exist, safely omit the river drainage step without error
  if (lakes.length === 0) {
    return { riverCarved: false, carvedCellsCount: 0 };
  }

  // 3. Multi-source BFS to compute distance from every cell to nearest ocean water
  const distToOcean: number[][] = Array.from({ length: H }, () => Array(W).fill(Infinity));
  const distQ: { x: number; y: number; d: number }[] = [];
  for (const pt of oceanWaterQ) {
    distToOcean[pt.y]![pt.x] = 0;
    distQ.push({ x: pt.x, y: pt.y, d: 0 });
  }

  let dHead = 0;
  while (dHead < distQ.length) {
    const cur = distQ[dHead++]!;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = cur.x + dx!;
      const ny = cur.y + dy!;
      if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
        if (distToOcean[ny]![nx]! > cur.d + 1) {
          distToOcean[ny]![nx] = cur.d + 1;
          distQ.push({ x: nx, y: ny, d: cur.d + 1 });
        }
      }
    }
  }

  // 4. Select Spring (Manantial):
  // Prioritize mountain/elevation lakes (hasElevGe1 or highest maxElevation), then largest lake
  lakes.sort((a, b) => {
    if (b.hasElevGe1 !== a.hasElevGe1) return b.hasElevGe1 ? 1 : -1;
    if (b.maxElevation !== a.maxElevation) return b.maxElevation - a.maxElevation;
    return b.cells.length - a.cells.length;
  });

  const targetLake = lakes[0]!;
  const avgX = targetLake.cells.reduce((s, pt) => s + pt.x, 0) / targetLake.cells.length;
  const avgY = targetLake.cells.reduce((s, pt) => s + pt.y, 0) / targetLake.cells.length;

  let springPoint = targetLake.cells[0]!;
  let minCentroidDist = Infinity;
  for (const pt of targetLake.cells) {
    const d = Math.hypot(pt.x - avgX, pt.y - avgY);
    if (d < minCentroidDist) {
      minCentroidDist = d;
      springPoint = pt;
    }
  }

  // 4b. Avoid immediate mouth (< 35 tiles):
  // If the nearest ocean is too close (< 35 tiles), penalize that immediate coast
  // to force the river to traverse the continent towards a distant basin (East or South).
  const nearestOceanDist = distToOcean[springPoint.y]![springPoint.x]!;
  let maxOceanDist = 0;
  for (const pt of oceanWaterQ) {
    const d = Math.hypot(pt.x - springPoint.x, pt.y - springPoint.y);
    if (d > maxOceanDist) maxOceanDist = d;
  }

  const immediateThreshold = 35;
  const shouldAvoidImmediate = nearestOceanDist < immediateThreshold && maxOceanDist >= 40;

  let targetOceanCells: { x: number; y: number }[] = [];
  if (shouldAvoidImmediate) {
    const minMouthDist = Math.max(immediateThreshold, Math.min(80, maxOceanDist * 0.45));
    // Prefer South (into continental valley) or East (across continent)
    const eastSouthCandidates = oceanWaterQ.filter((p) => {
      const d = Math.hypot(p.x - springPoint.x, p.y - springPoint.y);
      return d >= minMouthDist && (p.y >= springPoint.y + 35 || p.x >= springPoint.x + 80);
    });

    if (eastSouthCandidates.length > 0) {
      targetOceanCells = eastSouthCandidates;
    } else {
      const farCandidates = oceanWaterQ.filter((p) => {
        const d = Math.hypot(p.x - springPoint.x, p.y - springPoint.y);
        return d >= minMouthDist;
      });
      targetOceanCells = farCandidates.length > 0 ? farCandidates : oceanWaterQ;
    }
  } else {
    targetOceanCells = oceanWaterQ;
  }

  // Target direction vector for lateral meandering
  const avgTx = targetOceanCells.reduce((s, p) => s + p.x, 0) / targetOceanCells.length;
  const avgTy = targetOceanCells.reduce((s, p) => s + p.y, 0) / targetOceanCells.length;
  const vDx = avgTx - springPoint.x;
  const vDy = avgTy - springPoint.y;
  const vLen = Math.hypot(vDx, vDy) || 1;
  const flowUx = vDx / vLen;
  const flowUy = vDy / vLen;
  const normalUx = -flowUy;
  const normalUy = flowUx;

  const wavePeriod = 36; // 36 tiles per complete S-curve
  const waveAmplitude = 14; // +/- 14 tiles lateral swing

  // Compute distance to target ocean basin
  const distToTargetOcean: number[][] = Array.from({ length: H }, () => Array(W).fill(Infinity));
  const isTargetOcean: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const targetQ: { x: number; y: number; d: number }[] = [];

  for (const pt of targetOceanCells) {
    distToTargetOcean[pt.y]![pt.x] = 0;
    isTargetOcean[pt.y]![pt.x] = true;
    targetQ.push({ x: pt.x, y: pt.y, d: 0 });
  }

  let tHead = 0;
  while (tHead < targetQ.length) {
    const cur = targetQ[tHead++]!;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = cur.x + dx!;
      const ny = cur.y + dy!;
      if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
        if (distToTargetOcean[ny]![nx]! > cur.d + 1) {
          distToTargetOcean[ny]![nx] = cur.d + 1;
          targetQ.push({ x: nx, y: ny, d: cur.d + 1 });
        }
      }
    }
  }

  // 5. Downhill / Oceanward Gradient Descent using A* Pathfinding
  const noise = new SimplexNoise(seed + 771);
  const cameFrom = new Map<string, { x: number; y: number }>();
  const costSoFar: number[][] = Array.from({ length: H }, () => Array(W).fill(Infinity));
  costSoFar[springPoint.y]![springPoint.x] = 0;

  // Optimized MinBinaryHeap for fast O(log N) A* node extraction
  interface PQItem {
    x: number;
    y: number;
    priority: number;
  }
  class RiverMinHeap {
    private data: PQItem[] = [];
    push(item: PQItem): void {
      this.data.push(item);
      let idx = this.data.length - 1;
      while (idx > 0) {
        const parentIdx = (idx - 1) >> 1;
        if (this.data[idx]!.priority < this.data[parentIdx]!.priority) {
          const tmp = this.data[idx]!;
          this.data[idx] = this.data[parentIdx]!;
          this.data[parentIdx] = tmp;
          idx = parentIdx;
        } else {
          break;
        }
      }
    }
    pop(): PQItem | undefined {
      if (this.data.length === 0) return undefined;
      const top = this.data[0]!;
      const bottom = this.data.pop()!;
      if (this.data.length > 0) {
        this.data[0] = bottom;
        let idx = 0;
        const len = this.data.length;
        while (true) {
          const left = (idx << 1) + 1;
          const right = left + 1;
          let smallest = idx;
          if (left < len && this.data[left]!.priority < this.data[smallest]!.priority) {
            smallest = left;
          }
          if (right < len && this.data[right]!.priority < this.data[smallest]!.priority) {
            smallest = right;
          }
          if (smallest !== idx) {
            const tmp = this.data[idx]!;
            this.data[idx] = this.data[smallest]!;
            this.data[smallest] = tmp;
            idx = smallest;
          } else {
            break;
          }
        }
      }
      return top;
    }
    get length(): number {
      return this.data.length;
    }
  }

  const pq = new RiverMinHeap();
  pq.push({
    x: springPoint.x,
    y: springPoint.y,
    priority: distToTargetOcean[springPoint.y]![springPoint.x]! * 0.85
  });

  let endNode: { x: number; y: number } | null = null;
  const stairSet = new Set(options?.placedStairs?.map((s) => `${s.x}_${s.y}`) ?? []);

  while (pq.length > 0) {
    const cur = pq.pop()!;

    // Reached target ocean or immediate shore of target ocean
    if (isTargetOcean[cur.y]![cur.x] || distToTargetOcean[cur.y]![cur.x]! <= 1) {
      endNode = cur;
      break;
    }

    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = cur.x + dx!;
      const ny = cur.y + dy!;
      if (nx < 1 || nx >= W - 1 || ny < 1 || ny >= H - 1) continue;
      if (settlementMask[ny]?.[nx]) continue;

      // Penalize immediate nearby ocean coast to force river to flow toward distant basin
      if (visitedOcean[ny]![nx] && !isTargetOcean[ny]![nx]) {
        continue;
      }

      const hCur = heightmap[cur.y]?.[cur.x] ?? 0;
      const hNext = heightmap[ny]?.[nx] ?? 0;

      let stepCost = 1.0;
      // Moving uphill is heavily penalized (gravity gradient descent)
      if (hNext > hCur) {
        stepCost += 120.0 * (hNext - hCur);
      } else if (hNext < hCur) {
        stepCost -= 0.6 * (hCur - hNext);
      }

      // Avoid mountain stairs and high massifs
      if (stairSet.has(`${nx}_${ny}`)) {
        stepCost += 800.0;
      }
      if (hNext >= 2) {
        stepCost += 35.0;
      }

      // Lateral meander sine wave + Simplex noise perturbation
      const progress = (nx - springPoint.x) * flowUx + (ny - springPoint.y) * flowUy;
      const lateral = (nx - springPoint.x) * normalUx + (ny - springPoint.y) * normalUy;
      const sinOffset = Math.sin((progress / wavePeriod) * Math.PI * 2) * waveAmplitude;
      const noiseOffset = fbm2D(noise, nx * 0.04, ny * 0.04, { octaves: 2 }) * 8.0;
      const idealLateral = sinOffset + noiseOffset;
      const lateralDev = Math.abs(lateral - idealLateral);
      stepCost += lateralDev * 0.45;

      const newCost = costSoFar[cur.y]![cur.x]! + Math.max(0.2, stepCost);
      if (newCost < costSoFar[ny]![nx]!) {
        costSoFar[ny]![nx] = newCost;
        cameFrom.set(`${nx}_${ny}`, { x: cur.x, y: cur.y });
        const priority = newCost + distToTargetOcean[ny]![nx]! * 0.85;
        pq.push({ x: nx, y: ny, priority });
      }
    }
  }

  // Graceful fallback: if distant basin was unreachable, allow any ocean
  if (!endNode && shouldAvoidImmediate) {
    const fallbackPq = new RiverMinHeap();
    const fallbackCost: number[][] = Array.from({ length: H }, () => Array(W).fill(Infinity));
    fallbackCost[springPoint.y]![springPoint.x] = 0;
    cameFrom.clear();
    fallbackPq.push({
      x: springPoint.x,
      y: springPoint.y,
      priority: distToOcean[springPoint.y]![springPoint.x]! * 1.5
    });

    while (fallbackPq.length > 0) {
      const cur = fallbackPq.pop()!;
      if (visitedOcean[cur.y]![cur.x] || distToOcean[cur.y]![cur.x]! <= 1) {
        endNode = cur;
        break;
      }
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = cur.x + dx!;
        const ny = cur.y + dy!;
        if (nx < 1 || nx >= W - 1 || ny < 1 || ny >= H - 1) continue;
        if (settlementMask[ny]?.[nx]) continue;
        const hCur = heightmap[cur.y]?.[cur.x] ?? 0;
        const hNext = heightmap[ny]?.[nx] ?? 0;
        let stepCost = 1.0;
        if (hNext > hCur) stepCost += 80.0 * (hNext - hCur);
        const newCost = fallbackCost[cur.y]![cur.x]! + Math.max(0.2, stepCost);
        if (newCost < fallbackCost[ny]![nx]!) {
          fallbackCost[ny]![nx] = newCost;
          cameFrom.set(`${nx}_${ny}`, { x: cur.x, y: cur.y });
          fallbackPq.push({ x: nx, y: ny, priority: newCost + distToOcean[ny]![nx]! * 1.5 });
        }
      }
    }
  }

  if (!endNode) {
    return { riverCarved: false, carvedCellsCount: 0 };
  }

  // Reconstruct path
  const riverPath: { x: number; y: number }[] = [];
  let currStep: { x: number; y: number } | undefined = endNode;
  while (currStep) {
    riverPath.push(currStep);
    currStep = cameFrom.get(`${currStep.x}_${currStep.y}`);
  }
  riverPath.reverse();

  // 6. Carve 2-cell wide water channel with descending riverbed heightmap
  let carvedCellsCount = 0;
  let currentRiverElev = heightmap[springPoint.y]?.[springPoint.x] ?? 0;
  const riverGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

  for (const pt of riverPath) {
    currentRiverElev = Math.min(currentRiverElev, heightmap[pt.y]?.[pt.x] ?? 0);

    // 2x2 stamp around the path waypoint guarantees uniform >= 2 cells width without 1-cell necking
    for (let dy = 0; dy <= 1; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const cx = pt.x + dx;
        const cy = pt.y + dy;
        if (cx >= 1 && cx < W - 1 && cy >= 1 && cy < H - 1) {
          if (settlementMask[cy]?.[cx]) continue;
          riverGrid[cy]![cx] = true;
          if (terrainMatrix[cy]![cx] !== 'water' && terrainMatrix[cy]![cx] !== 'water_deep') {
            terrainMatrix[cy]![cx] = 'water';
            carvedCellsCount++;
          }
          // Riverbed water level adjustment
          heightmap[cy]![cx] = Math.min(heightmap[cy]![cx]!, currentRiverElev);
        }
      }
    }
  }

  return {
    riverCarved: true,
    springPoint,
    riverPath,
    carvedCellsCount,
    riverGrid
  };
}
