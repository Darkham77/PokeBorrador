/**
 * src/logic/map/heightmapConstraints.ts
 *
 * CANONICAL HEIGHTMAP STRUCTURAL CONSTRAINTS ENGINE
 *
 * Enforces structural integrity rules on elevation matrices to ensure every wall
 * belongs to an authentic, expansive mountain plateau with visible, walkable floor:
 *
 * 1. Footprint Rule:
 *    - Plateaus of elevation Z > 0 must span at least 6x6 logical cells.
 *    - Must contain at least a 3x3 core of interior walkable floor cells after
 *      discounting perimeter walls and rims.
 *
 * 2. Terrace Buffer Rule:
 *    - Between the foot of an upper tier cliff (e.g. south_foot of Z=2 at y+1) and the
 *      top edge of the next lower cliff (south_top of Z=1), there MUST be a minimum
 *      buffer of 3 free walkable floor cells.
 *    - Strictly prohibits stacked walls separated by 1-2 cells that visually destroy
 *      the intermediate floor.
 *
 * 3. Multi-Tier Cliffs:
 *    - When two elevation levels drop in the same sector without space for an intermediate
 *      terrace (buffer < 3), they must NOT generate as cramped slivers, but merge into a
 *      single continuous vertical cliff of double height (Z=2 directly to Z=0).
 */

import type { ElevationMatrix } from './mountainAutotileEngine.ts';

export type HeightmapConstraintViolationType =
  | 'footprint_too_small'
  | 'insufficient_walkable_core'
  | 'terrace_buffer_too_small'
  | 'stacked_walls';

export interface HeightmapConstraintViolation {
  readonly type: HeightmapConstraintViolationType;
  readonly elevation: number;
  readonly x: number;
  readonly y: number;
  readonly width?: number;
  readonly height?: number;
  readonly walkableCoreCount?: number;
  readonly bufferFound?: number;
  readonly message: string;
}

export interface HeightmapConstraintOptions {
  /** Minimum bounding dimension for any elevated plateau (default: 6) */
  readonly minFootprintDimension?: number;
  /** Minimum walkable core interior floor cells dimension (default: 3) */
  readonly minWalkableCoreDimension?: number;
  /** Minimum vertical floor buffer between upper tier foot and lower tier top (default: 3) */
  readonly minTerraceBuffer?: number;
  /** Optional callback to protect water cells from being elevated as sinkholes/craters */
  readonly isWaterCell?: (x: number, y: number) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<HeightmapConstraintOptions, 'isWaterCell'>> & { isWaterCell?: (x: number, y: number) => boolean } = {
  minFootprintDimension: 6,
  minWalkableCoreDimension: 3,
  minTerraceBuffer: 3,
  isWaterCell: undefined
};

interface ConnectedRegion {
  readonly elevation: number;
  readonly cells: readonly { readonly x: number; readonly y: number }[];
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly width: number;
  readonly height: number;
}

/**
 * Identifies connected components for each distinct elevated tier (Z >= 1).
 */
function findElevatedRegions(matrix: ElevationMatrix): readonly ConnectedRegion[] {
  const H = matrix.length;
  if (H === 0) return [];
  const W = matrix[0]?.length ?? 0;
  if (W === 0) return [];

  // Find maximum elevation
  let maxElev = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const e = matrix[y]![x]!;
      if (e > maxElev) maxElev = e;
    }
  }

  const regions: ConnectedRegion[] = [];

  // Detect components per level z >= 1
  for (let z = 1; z <= maxElev; z++) {
    const visited: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!visited[y]![x]! && (matrix[y]![x]! >= z)) {
          // Flood fill 4-way
          const cells: { x: number; y: number }[] = [];
          const queue: { x: number; y: number }[] = [{ x, y }];
          visited[y]![x] = true;

          let minX = x, maxX = x, minY = y, maxY = y;

          while (queue.length > 0) {
            const curr = queue.pop()!;
            cells.push(curr);

            if (curr.x < minX) minX = curr.x;
            if (curr.x > maxX) maxX = curr.x;
            if (curr.y < minY) minY = curr.y;
            if (curr.y > maxY) maxY = curr.y;

            const neighbors = [
              { x: curr.x + 1, y: curr.y },
              { x: curr.x - 1, y: curr.y },
              { x: curr.x, y: curr.y + 1 },
              { x: curr.x, y: curr.y - 1 }
            ];

            for (const n of neighbors) {
              if (
                n.x >= 0 && n.x < W &&
                n.y >= 0 && n.y < H &&
                !visited[n.y]![n.x]! &&
                (matrix[n.y]![n.x]! >= z)
              ) {
                visited[n.y]![n.x] = true;
                queue.push(n);
              }
            }
          }

          regions.push({
            elevation: z,
            cells,
            minX,
            maxX,
            minY,
            maxY,
            width: maxX - minX + 1,
            height: maxY - minY + 1
          });
        }
      }
    }
  }

  return regions;
}

/**
 * Validates heightmap constraints against:
 *   1. Minimum plateau footprint (6x6)
 *   2. Minimum walkable core interior floor (3x3)
 *   3. Minimum terrace buffer (3 cells) between sequential cliff drops
 */
export function validateHeightmapConstraints(
  matrix: ElevationMatrix,
  opts?: HeightmapConstraintOptions
): readonly HeightmapConstraintViolation[] {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const H = matrix.length;
  if (H === 0) return [];
  const W = matrix[0]?.length ?? 0;
  if (W === 0) return [];

  const violations: HeightmapConstraintViolation[] = [];
  const regions = findElevatedRegions(matrix);

  // 1. Footprint & Walkable Core Rules
  for (const reg of regions) {
    const minFootprint = reg.elevation >= 3
      ? Math.min(3, options.minFootprintDimension)
      : options.minFootprintDimension;

    const minCore = reg.elevation >= 3
      ? 0
      : options.minWalkableCoreDimension;

    if (reg.width < minFootprint || reg.height < minFootprint) {
      violations.push({
        type: 'footprint_too_small',
        elevation: reg.elevation,
        x: reg.minX,
        y: reg.minY,
        width: reg.width,
        height: reg.height,
        message: `Plateau tier ${reg.elevation} at (${reg.minX}, ${reg.minY}) has dimensions ${reg.width}x${reg.height}, which is smaller than the mandated minimum ${minFootprint}x${minFootprint}.`
      });
      continue;
    }

    // Check walkable core: cells where all 8 neighbors have elevation >= reg.elevation
    let walkableCoreCount = 0;
    const coreGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));

    for (const cell of reg.cells) {
      const cx = cell.x;
      const cy = cell.y;
      let isCore = true;

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= W || ny < 0 || ny >= H || (matrix[ny]![nx]! < reg.elevation)) {
            isCore = false;
            break;
          }
        }
        if (!isCore) break;
      }

      if (isCore) {
        walkableCoreCount++;
        coreGrid[cy]![cx] = true;
      }
    }

    // Check if core contains at least a req x req contiguous block
    const req = minCore;
    let hasCore = req === 0;
    for (let y = reg.minY; y <= reg.maxY - req + 1; y++) {
      for (let x = reg.minX; x <= reg.maxX - req + 1; x++) {
        let blockMatches = true;
        for (let by = 0; by < req; by++) {
          for (let bx = 0; bx < req; bx++) {
            if (!coreGrid[y + by]![x + bx]!) {
              blockMatches = false;
              break;
            }
          }
          if (!blockMatches) break;
        }
        if (blockMatches) {
          hasCore = true;
          break;
        }
      }
      if (hasCore) break;
    }

    if (!hasCore) {
      violations.push({
        type: 'insufficient_walkable_core',
        elevation: reg.elevation,
        x: reg.minX,
        y: reg.minY,
        width: reg.width,
        height: reg.height,
        walkableCoreCount,
        message: `Plateau tier ${reg.elevation} at (${reg.minX}, ${reg.minY}) does not contain a contiguous ${req}x${req} walkable floor core (only ${walkableCoreCount} core cells found).`
      });
    }
  }

  // 2. Terrace Buffer Rule (Distance between sequential south cliff drops)
  if (options.minTerraceBuffer > 0) {
    for (let x = 0; x < W; x++) {
      // Find all south cliff drops in column x: where matrix[y][x] > matrix[y+1][x]
      const drops: { yTop: number; sourceElev: number; targetElev: number; yFoot: number }[] = [];
      for (let y = 0; y < H - 1; y++) {
        const e1 = matrix[y]![x]!;
        const e2 = matrix[y + 1]![x]!;
        if (e1 > e2) {
          drops.push({
            yTop: y,
            sourceElev: e1,
            targetElev: e2,
            yFoot: y + 1
          });
        }
      }

      // Check buffer between consecutive drops in the same column
      for (let i = 0; i < drops.length - 1; i++) {
        const upperDrop = drops[i]!;
        const lowerDrop = drops[i + 1]!;

        // Walkable floor rows between upper foot and lower top:
        // upper foot occupies upperDrop.yFoot.
        // lower top is lowerDrop.yTop.
        // Floor cells count = lowerDrop.yTop - upperDrop.yFoot.
        const buffer = lowerDrop.yTop - upperDrop.yFoot;

        if (buffer < options.minTerraceBuffer) {
          violations.push({
            type: 'terrace_buffer_too_small',
            elevation: upperDrop.sourceElev,
            x,
            y: upperDrop.yTop,
            bufferFound: buffer,
            message: `Stacked walls detected at column ${x} between cliff drop at row ${upperDrop.yTop} (foot at ${upperDrop.yFoot}) and next cliff at row ${lowerDrop.yTop}. Only ${buffer} floor cell(s) between them (mandated minimum: ${options.minTerraceBuffer}).`
          });
        }
      }
    }
  }

  return violations;
}

/**
 * Sanitizes an elevation matrix by applying the structural heightmap constraints:
 *   1. Eliminates sliver plateaus (< 6x6 footprint or < 3x3 walkable core).
 *   2. Resolves cramped intermediate terraces by merging them into double-height cliffs.
 */
/**
 * Fills interior topological depressions (sinkholes/craters) completely enclosed by higher ground.
 * Uses a boundary-seeded flood fill to identify all cells reachable from the outer world.
 * Any lower-elevation cell that cannot reach the boundary is an interior hole and is elevated.
 */
export function fillHeightmapHoles(
  matrix: number[][],
  isWaterCell?: (x: number, y: number) => boolean
): boolean {
  const H = matrix.length;
  if (H === 0) return false;
  const W = matrix[0]?.length ?? 0;
  if (W === 0) return false;

  let changed = false;

  let maxElev = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (matrix[y]![x]! > maxElev) maxElev = matrix[y]![x]!;
    }
  }

  for (let z = 1; z <= maxElev; z++) {
    const reachesEdge: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const queue: { x: number; y: number }[] = [];

    // Seed outer borders
    for (let x = 0; x < W; x++) {
      if (matrix[0]![x]! < z && !reachesEdge[0]![x]) {
        reachesEdge[0]![x] = true;
        queue.push({ x, y: 0 });
      }
      if (matrix[H - 1]![x]! < z && !reachesEdge[H - 1]![x]) {
        reachesEdge[H - 1]![x] = true;
        queue.push({ x, y: H - 1 });
      }
    }
    for (let y = 0; y < H; y++) {
      if (matrix[y]![0]! < z && !reachesEdge[y]![0]) {
        reachesEdge[y]![0] = true;
        queue.push({ x: 0, y });
      }
      if (matrix[y]![W - 1]! < z && !reachesEdge[y]![W - 1]) {
        reachesEdge[y]![W - 1] = true;
        queue.push({ x: W - 1, y });
      }
    }

    // 4-way BFS traversal
    while (queue.length > 0) {
      const curr = queue.pop()!;
      const neighbors = [
        { x: curr.x + 1, y: curr.y },
        { x: curr.x - 1, y: curr.y },
        { x: curr.x, y: curr.y + 1 },
        { x: curr.x, y: curr.y - 1 }
      ];
      for (const n of neighbors) {
        if (n.x >= 0 && n.x < W && n.y >= 0 && n.y < H) {
          if (!reachesEdge[n.y]![n.x]! && matrix[n.y]![n.x]! < z) {
            reachesEdge[n.y]![n.x] = true;
            queue.push(n);
          }
        }
      }
    }

    // Fill unreachable cavities (protecting water bodies)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (isWaterCell?.(x, y)) continue;
        if (matrix[y]![x]! < z && !reachesEdge[y]![x]) {
          matrix[y]![x] = z;
          changed = true;
        }
      }
    }
  }

  return changed;
}

/**
 * Rectifies jagged diagonals, 1-cell notches, and short wall segments.
 * Enforces a minimum continuous straight run-length of >= 3 tiles for all cardinal drops.
 */
export function rectifyHeightmap(
  matrix: number[][],
  isWaterCell?: (x: number, y: number) => boolean
): boolean {
  const H = matrix.length;
  if (H === 0) return false;
  const W = matrix[0]?.length ?? 0;
  if (W === 0) return false;

  let anyChanged = false;

  let maxElev = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (matrix[y]![x]! > maxElev) maxElev = matrix[y]![x]!;
    }
  }

  // Pass 1: Cellular Automata Majority Smoothing (fill 1-cell notches, prune isolated tips)
  for (let iter = 0; iter < 3; iter++) {
    let passChanged = false;
    for (let z = 1; z <= maxElev; z++) {
      for (let y = 1; y < H - 1; y++) {
        for (let x = 1; x < W - 1; x++) {
          if (isWaterCell?.(x, y)) continue;
          const val = matrix[y]![x]!;
          const nN = matrix[y - 1]![x]! >= z ? 1 : 0;
          const nS = matrix[y + 1]![x]! >= z ? 1 : 0;
          const nW = matrix[y]![x - 1]! >= z ? 1 : 0;
          const nE = matrix[y]![x + 1]! >= z ? 1 : 0;
          const count = nN + nS + nW + nE;

          if (val < z && count >= 3) {
            matrix[y]![x] = z;
            passChanged = true;
            anyChanged = true;
          } else if (val === z && count <= 1) {
            matrix[y]![x] = z - 1;
            passChanged = true;
            anyChanged = true;
          }
        }
      }
    }
    if (!passChanged) break;
  }

  // Pass 2: Enforce minimum South Wall run-length >= 3 (>= 2 for apex summits Z >= 4)
  for (let z = 1; z <= maxElev; z++) {
    const minRun = z >= 4 ? 2 : 3;
    for (let y = 1; y < H - 2; y++) {
      let runStart = -1;
      for (let x = 0; x < W; x++) {
        const isSouthDrop = matrix[y]![x]! >= z && matrix[y + 1]![x]! < z;
        if (isSouthDrop) {
          if (runStart === -1) runStart = x;
        } else {
          if (runStart !== -1) {
            const len = x - runStart;
            if (len < minRun) {
              for (let k = runStart; k < x; k++) {
                if (matrix[y]![k]! === z) {
                  matrix[y]![k] = matrix[y + 1]![k]!;
                  anyChanged = true;
                }
              }
            }
            runStart = -1;
          }
        }
      }
      if (runStart !== -1 && (W - runStart) < minRun) {
        for (let k = runStart; k < W; k++) {
          if (matrix[y]![k]! === z) {
            matrix[y]![k] = matrix[y + 1]![k]!;
            anyChanged = true;
          }
        }
      }
    }
  }

  return anyChanged;
}

/**
 * Sanitizes an elevation matrix in-place or returning a new matrix:
 *   1. Phase 1: Fills all interior sinkholes / craters (topological cavity filling).
 *   2. Phase 2: Rectifies jagged diagonals and enforces minimum wall run-length >= 3.
 *   3. Phase 3: Enforces minimum plateau footprint (>= 6x6) and walkable core (>= 3x3).
 *   4. Phase 4: Prunes 1-tile thin pinches and merges cramped terraces (< 3 buffer).
 */
export function sanitizeHeightmapMatrix(
  matrix: ElevationMatrix,
  opts?: HeightmapConstraintOptions
): number[][] {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const H = matrix.length;
  if (H === 0) return [];
  const W = matrix[0]?.length ?? 0;
  if (W === 0) return [];

  // Deep clone
  const sanitized: number[][] = matrix.map(row => [...row]);

  // Phase 1: Topological Sinkhole Filling (protecting water bodies)
  fillHeightmapHoles(sanitized, options.isWaterCell);

  // Phase 2: Orthogonal Rectification (protecting water bodies)
  rectifyHeightmap(sanitized, options.isWaterCell);

  let changed = true;
  let iterations = 0;
  const MAX_ITERATIONS = 10;

  while (changed && iterations < MAX_ITERATIONS) {
    changed = false;
    iterations++;

    let iterMaxElev = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (sanitized[y]![x]! > iterMaxElev) iterMaxElev = sanitized[y]![x]!;
      }
    }

    // Step 1: Remove small plateaus
    const regions = findElevatedRegions(sanitized);
    for (const reg of regions) {
      const minFootprint = reg.elevation >= 3
        ? Math.min(3, options.minFootprintDimension)
        : options.minFootprintDimension;

      const minCore = reg.elevation >= 3
        ? 0
        : options.minWalkableCoreDimension;

      if (reg.width < minFootprint || reg.height < minFootprint) {
        for (const cell of reg.cells) {
          sanitized[cell.y]![cell.x] = reg.elevation - 1;
        }
        changed = true;
        continue;
      }

      // Check core
      const coreGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
      for (const cell of reg.cells) {
        let isCore = true;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = cell.x + dx;
            const ny = cell.y + dy;
            if (nx < 0 || nx >= W || ny < 0 || ny >= H || (sanitized[ny]![nx]! < reg.elevation)) {
              isCore = false;
              break;
            }
          }
          if (!isCore) break;
        }
        if (isCore) coreGrid[cell.y]![cell.x] = true;
      }

      const req = minCore;
      let hasCore = req === 0;
      for (let y = reg.minY; y <= reg.maxY - req + 1; y++) {
        for (let x = reg.minX; x <= reg.maxX - req + 1; x++) {
          let blockMatches = true;
          for (let by = 0; by < req; by++) {
            for (let bx = 0; bx < req; bx++) {
              if (!coreGrid[y + by]![x + bx]!) {
                blockMatches = false;
                break;
              }
            }
            if (!blockMatches) break;
          }
          if (blockMatches) {
            hasCore = true;
            break;
          }
        }
        if (hasCore) break;
      }

      if (!hasCore) {
        for (const cell of reg.cells) {
          sanitized[cell.y]![cell.x] = reg.elevation - 1;
        }
        changed = true;
      }
    }

    // Step 1b: Prune 1-tile thin pinches / whiskers (cells with width 1 or height 1)
    for (let z = iterMaxElev; z >= 1; z--) {
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (sanitized[y]![x]! === z) {
            const hasN = y > 0 && sanitized[y - 1]![x]! >= z;
            const hasS = y < H - 1 && sanitized[y + 1]![x]! >= z;
            const hasW = x > 0 && sanitized[y]![x - 1]! >= z;
            const hasE = x < W - 1 && sanitized[y]![x + 1]! >= z;

            const isThinPinch = (!hasW && !hasE) || (!hasN && !hasS);
            if (isThinPinch) {
              sanitized[y]![x] = z - 1;
              changed = true;
            }
          }
        }
      }
    }

    // Step 2: Merge cramped terraces into double-height multi-tier cliffs (Rule 3)
    if (options.minTerraceBuffer > 0) {
      for (let x = 0; x < W; x++) {
        for (let y = 0; y < H - 1; y++) {
          const e1 = sanitized[y]![x]!;
          const e2 = sanitized[y + 1]![x]!;
          if (e1 > e2) {
            const yFoot = y + 1;
            // Look ahead for next drop in column x
            for (let yNext = yFoot; yNext < Math.min(H - 1, yFoot + options.minTerraceBuffer + 2); yNext++) {
              if (sanitized[yNext]![x]! > sanitized[yNext + 1]![x]!) {
                const buffer = yNext - yFoot;
                if (buffer < options.minTerraceBuffer) {
                  // Merge: eliminate intermediate terrace, creating a direct multi-tier cliff
                  for (let k = yFoot; k <= yNext; k++) {
                    sanitized[k]![x] = sanitized[yNext + 1]![x]!;
                  }
                  changed = true;
                  break;
                }
              }
            }
          }
        }
      }
    }

    // Step 3: Zero Direct Drops > 1 Demotion (enforces smooth terracing without drops > 1)
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const curElev = sanitized[y]![x]!;
        if (curElev <= 1) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
          const nx = x + dx;
          const ny = y + dy;
          const nElev = (nx >= 0 && nx < W && ny >= 0 && ny < H) ? sanitized[ny]![nx]! : 0;
          if (curElev - nElev > 1) {
            sanitized[y]![x] = nElev + 1;
            changed = true;
          }
        }
      }
    }
  }

  return sanitized;
}
