/**
 * src/logic/map/progressionObstacleEngine.ts
 *
 * PROGRESSION OBSTACLE & HM ROADBLOCK ENGINE (PHASE 4)
 *
 * Places iconic Game Freak HM exploration roadblocks:
 *   1. Cuttable Trees (tree_cuttable.png) - Required: Badge 2 (Cascade Badge).
 *      Placed on route side clearings, alcove shortcuts, and forest fringes.
 *   2. Strength Boulders (poke_boulder_large.png) - Required: Badge 4 (Rainbow Badge).
 *      Placed near mountain canyon entrances and rock plateaus.
 *   3. Strict Anti-Softlock Guarantee:
 *      Obstacles block optional shortcuts or dead-end item clearings, never
 *      sealing off the only bidirectional path between settlements.
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import type { POINode } from '../../types/map/poiTypes.ts';

export interface ProgressionObstacleFlank {
  readonly x: number;
  readonly y: number;
  readonly prefabFile: string;
}

export interface ProgressionObstacle {
  readonly id: string;
  readonly type: 'cut_tree' | 'strength_boulder';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly prefabFile: string;
  readonly requiredGymBadge: number;
  readonly flankingProps?: readonly ProgressionObstacleFlank[];
}

export interface GenerateObstaclesOptions {
  readonly continent: ContinentMapResult;
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly pois: readonly POINode[];
  readonly seed?: number;
  readonly maxCutTrees?: number;
  readonly maxStrengthBoulders?: number;
}

const DEFAULT_SEED = 1337;
const DEFAULT_MAX_CUT_TREES = 3;
const DEFAULT_MAX_STRENGTH_BOULDERS = 2;
const MIN_OBSTACLE_SEPARATION = 45;
const CLEARANCE_MARGIN_POI = 4;

const CUT_TREE_ASSET = 'tree_cuttable.png' as const;
const STRENGTH_BOULDER_ASSET = 'poke_boulder_large.png' as const;

export function generateProgressionObstacles(
  options: GenerateObstaclesOptions
): readonly ProgressionObstacle[] {
  const {
    continent,
    pathGrid,
    pois,
    maxCutTrees = DEFAULT_MAX_CUT_TREES,
    maxStrengthBoulders = DEFAULT_MAX_STRENGTH_BOULDERS
  } = options;

  const W = continent.width;
  const H = continent.height;

  let rngSeed = (options.seed ?? DEFAULT_SEED) | 0;
  const nextRng = (): number => {
    rngSeed = (rngSeed * 1664525 + 1013904223) | 0;
    return (rngSeed >>> 0) / 4294967296;
  };

  // Exclude POI footprints and immediate doorsteps
  const excluded = Array.from({ length: H }, () => Array(W).fill(false));
  for (const poi of pois) {
    const minX = Math.max(0, poi.gridX - CLEARANCE_MARGIN_POI);
    const maxX = Math.min(W - 1, poi.gridX + poi.footprint.width + CLEARANCE_MARGIN_POI);
    const minY = Math.max(0, poi.gridY - CLEARANCE_MARGIN_POI);
    const maxY = Math.min(H - 1, poi.gridY + poi.footprint.height + CLEARANCE_MARGIN_POI);

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        excluded[y]![x] = true;
      }
    }
  }

  const isCellValidGround = (x: number, y: number): boolean => {
    if (x < 3 || x >= W - 3 || y < 3 || y >= H - 3) return false;
    if (excluded[y]![x]) return false;
    if ((continent.heightmap[y]?.[x] ?? 0) !== 0) return false;
    if (continent.terrainMatrix[y]?.[x] !== 'grass') return false;
    if (continent.resolvedMountain.occupiedFootCells[y]?.[x]) return false;
    if (continent.resolvedMountain.cellDetails[y]?.[x]) return false;

    // Strict clearance: never on or adjacent to mountain stairs
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ny = y + dy;
        const nx = x + dx;
        if (ny < 0 || ny >= H || nx < 0 || nx >= W) continue;
        const mCell = continent.resolvedMountain.cellDetails[ny]?.[nx];
        if (mCell?.role.includes('stairs')) return false;
      }
    }

    if (continent.placedStairs) {
      for (const s of continent.placedStairs) {
        if (Math.abs(s.x - x) <= 2 && Math.abs(s.y - y) <= 2) return false;
      }
    }

    // Must not be adjacent to water or deep water
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const terr = continent.terrainMatrix[y + dy]?.[x + dx];
        if (terr === 'water' || terr === 'water_deep') return false;
      }
    }
    return true;
  };

  const obstacles: ProgressionObstacle[] = [];
  const occupied = new Set<string>();

  // Collect candidate roadside cells (cells 1-3 tiles away from pathGrid)
  const candidateCells: { x: number; y: number; nearMountain: boolean }[] = [];

  for (let y = 6; y < H - 6; y++) {
    for (let x = 6; x < W - 6; x++) {
      if (!isCellValidGround(x, y)) continue;

      // Check proximity to pathGrid (distance 1 to 3 cells)
      let nearPath = false;
      for (let dy = -3; dy <= 3; dy++) {
        for (let dx = -3; dx <= 3; dx++) {
          if (pathGrid[y + dy]?.[x + dx]) {
            nearPath = true;
            break;
          }
        }
        if (nearPath) break;
      }

      if (nearPath) {
        // Proximity to mountain cliff
        let nearMtn = false;
        for (let dy = -3; dy <= 3; dy++) {
          for (let dx = -3; dx <= 3; dx++) {
            if ((continent.heightmap[y + dy]?.[x + dx] ?? 0) > 0) {
              nearMtn = true;
              break;
            }
          }
          if (nearMtn) break;
        }

        candidateCells.push({ x, y, nearMountain: nearMtn });
      }
    }
  }

  // Shuffle candidate cells
  for (let i = candidateCells.length - 1; i > 0; i--) {
    const j = Math.floor(nextRng() * (i + 1));
    const temp = candidateCells[i]!;
    candidateCells[i] = candidateCells[j]!;
    candidateCells[j] = temp;
  }

  let cutTreeCount = 0;
  let strengthCount = 0;
  const minSeparation = Math.min(MIN_OBSTACLE_SEPARATION, Math.floor(Math.min(W, H) / 4));

  for (const cand of candidateCells) {
    if (cutTreeCount >= maxCutTrees && strengthCount >= maxStrengthBoulders) break;

    const key = `${cand.x}_${cand.y}`;
    if (occupied.has(key)) continue;

    // Minimum distance from existing placed obstacles (guarantees region-wide dispersion)
    const tooClose = obstacles.some(
      (obs) => Math.hypot(obs.x - cand.x, obs.y - cand.y) < minSeparation
    );
    if (tooClose) continue;

    const isBuildingSolid = (bx: number, by: number): boolean => {
      for (const poi of pois) {
        if (poi.urbanLayout?.buildings) {
          for (const b of poi.urbanLayout.buildings) {
            if (bx >= b.x && bx < b.x + b.width && by >= b.y && by < b.y + b.height) return true;
          }
        }
      }
      return false;
    };

    const isImpassableBarrier = (bx: number, by: number): boolean => {
      if (bx < 0 || bx >= W || by < 0 || by >= H) return true;
      const mCell = continent.resolvedMountain.cellDetails[by]?.[bx];
      if (mCell?.role.includes('stairs')) return false;
      if ((continent.heightmap[by]?.[bx] ?? 0) > 0) return true;
      if (continent.resolvedMountain.occupiedFootCells[by]?.[bx]) return true;
      const terr = continent.terrainMatrix[by]?.[bx];
      if (terr === 'water' || terr === 'water_deep') return true;
      if (isBuildingSolid(bx, by)) return true;
      return false;
    };

    // Measure distance to impassable barriers in all 4 cardinal directions
    let hLeft = 1;
    while (hLeft <= 5 && !isImpassableBarrier(cand.x - hLeft, cand.y)) hLeft++;
    const hitBarrierLeft = isImpassableBarrier(cand.x - hLeft, cand.y);

    let hRight = 1;
    while (hRight <= 5 && !isImpassableBarrier(cand.x + hRight, cand.y)) hRight++;
    const hitBarrierRight = isImpassableBarrier(cand.x + hRight, cand.y);

    // Bounded laterally by West and East barriers -> vertical corridor (North-South transit)
    const isHorizontalChoke = hitBarrierLeft && hitBarrierRight && (hLeft + hRight - 1) <= 6;

    let vUp = 1;
    while (vUp <= 5 && !isImpassableBarrier(cand.x, cand.y - vUp)) vUp++;
    const hitBarrierUp = isImpassableBarrier(cand.x, cand.y - vUp);

    let vDown = 1;
    while (vDown <= 5 && !isImpassableBarrier(cand.x, cand.y + vDown)) vDown++;
    const hitBarrierDown = isImpassableBarrier(cand.x, cand.y + vDown);

    // Bounded vertically by North and South barriers -> horizontal corridor (West-East transit)
    const isVerticalChoke = hitBarrierUp && hitBarrierDown && (vUp + vDown - 1) <= 6;

    // Must be an airtight bottleneck bounded on both ends by natural barriers (never an open field)
    if (!isHorizontalChoke && !isVerticalChoke) continue;

    const chokeWidth = isHorizontalChoke ? (hLeft + hRight - 1) : (vUp + vDown - 1);

    // Guarantee placing both cut trees and strength boulders
    const isStrength = (cutTreeCount > 0 && strengthCount === 0) || (cand.nearMountain && strengthCount < maxStrengthBoulders && cutTreeCount >= 1);
    const isCut = !isStrength && cutTreeCount < maxCutTrees;
    if (!isStrength && !isCut) continue;

    // Cut Trees only block narrow chokepoints up to width 4
    if (isCut && chokeWidth > 4) continue;

    const prop = cand.nearMountain
      ? (continent.mountainPalette === 'brown' ? 'poke_boulder_brown.png' : 'poke_boulder_gray.png')
      : 'poke_fence_wood_h.png';
    const flanking: ProgressionObstacleFlank[] = [];

    if (isHorizontalChoke) {
      for (let dx = -(hLeft - 1); dx <= (hRight - 1); dx++) {
        if (dx === 0) continue;
        const fx = cand.x + dx;
        const fy = cand.y;
        if (isImpassableBarrier(fx, fy)) continue;
        flanking.push({ x: fx, y: fy, prefabFile: prop });
      }
    } else if (isVerticalChoke) {
      for (let dy = -(vUp - 1); dy <= (vDown - 1); dy++) {
        if (dy === 0) continue;
        const fx = cand.x;
        const fy = cand.y + dy;
        if (isImpassableBarrier(fx, fy)) continue;
        flanking.push({ x: fx, y: fy, prefabFile: prop });
      }
    }

    // Mathematical Anti-Bypass BFS: ensure player cannot walk around the obstacle
    const proposedBlocked = new Set<string>();
    proposedBlocked.add(`${cand.x}_${cand.y}`);
    for (const f of flanking) {
      proposedBlocked.add(`${f.x}_${f.y}`);
    }

    const isBlocked = (bx: number, by: number): boolean => {
      if (proposedBlocked.has(`${bx}_${by}`)) return true;
      return isImpassableBarrier(bx, by);
    };

    const SEARCH_RADIUS = 6;
    const canReach = (startX: number, startY: number, goalX: number, goalY: number): boolean => {
      if (isBlocked(startX, startY) || isBlocked(goalX, goalY)) return false;
      const queue: { x: number; y: number }[] = [{ x: startX, y: startY }];
      const visited = new Set<string>([`${startX}_${startY}`]); // runtime-set: Estructura o identificador procedural de aventura

      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (cur.x === goalX && cur.y === goalY) return true;

        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
          const nx = cur.x + dx;
          const ny = cur.y + dy;
          if (Math.abs(nx - cand.x) > SEARCH_RADIUS || Math.abs(ny - cand.y) > SEARCH_RADIUS) continue;
          const k = `${nx}_${ny}`;
          if (visited.has(k)) continue;
          if (isBlocked(nx, ny)) continue;

          visited.add(k);
          queue.push({ x: nx, y: ny });
        }
      }
      return false;
    };

    let hermetic = true;
    if (isVerticalChoke) {
      const startX = cand.x - 1;
      const goalX = cand.x + 1;
      if (!isBlocked(startX, cand.y) && !isBlocked(goalX, cand.y)) {
        if (canReach(startX, cand.y, goalX, cand.y)) hermetic = false;
      }
    } else if (isHorizontalChoke) {
      const startY = cand.y - 1;
      const goalY = cand.y + 1;
      if (!isBlocked(cand.x, startY) && !isBlocked(cand.x, goalY)) {
        if (canReach(cand.x, startY, cand.x, goalY)) hermetic = false;
      }
    }

    if (!hermetic) continue;

    for (const f of flanking) {
      occupied.add(`${f.x}_${f.y}`);
    }

    if (isStrength) {
      obstacles.push({
        id: `strength_boulder_${strengthCount + 1}`,
        type: 'strength_boulder',
        x: cand.x,
        y: cand.y,
        width: 1,
        height: 1,
        prefabFile: STRENGTH_BOULDER_ASSET,
        requiredGymBadge: 4,
        flankingProps: flanking
      });
      occupied.add(key);
      strengthCount++;
    } else if (isCut) {
      obstacles.push({
        id: `cut_tree_${cutTreeCount + 1}`,
        type: 'cut_tree',
        x: cand.x,
        y: cand.y,
        width: 1,
        height: 1,
        prefabFile: CUT_TREE_ASSET,
        requiredGymBadge: 2,
        flankingProps: flanking
      });
      occupied.add(key);
      cutTreeCount++;
    }
  }

  return obstacles;
}
