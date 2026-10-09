/**
 * src/logic/map/routeGateBarrierEngine.ts
 *
 * Dedicated engine for route gatehouse checkpoints (route_gate):
 * - Guarantees a 100% sacred transit road corridor entering and exiting the gatehouse.
 * - Extends authentic lateral barrier fences and dense tree lines to seal the flanks.
 * - Mathematically verifies and enforces anti-bypass closure via local BFS flood-fill.
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import type { POINode } from '../../types/map/poiTypes.ts';
import type { TreePlacement, WildernessPropPlacement } from './wildernessVegetationEngine.ts';

export interface RouteGateBarrierParams {
  readonly continent: ContinentMapResult;
  readonly gate: POINode;
  readonly trees: readonly TreePlacement[];
  readonly props: readonly WildernessPropPlacement[];
  readonly pathGrid: readonly (readonly boolean[])[];
}

export interface SealRouteGateOptions {
  readonly continent: ContinentMapResult;
  readonly gate: POINode;
  readonly trees: TreePlacement[];
  readonly props: WildernessPropPlacement[];
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly blockedMask?: boolean[][];
}

function tryAddBarrierTree(
  treeX: number,
  treeY: number,
  continent: ContinentMapResult,
  trees: TreePlacement[],
  blockedMask?: boolean[][]
): void {
  const W = continent.width;
  const H = continent.height;
  const mBiome = continent.macroBiomes?.biomeGrid[treeY]?.[treeX] ?? 'temperate_meadow';
  if (mBiome === 'arid_desert' || mBiome === 'volcanic_plateau') return;

  let prefabFile = 'poke_tree_oak_clean.png';
  let treeWidth = 3;
  let treeHeight = 4;
  if (mBiome === 'mint_highland') {
    prefabFile = 'poke_tree_pine_small.png';
    treeWidth = 2;
    treeHeight = 3;
  }

  if (treeX < 0 || treeX + treeWidth > W || treeY < 0 || treeY + treeHeight > H) return;

  const canopyOverhang = treeHeight - 2;
  // Water clearance: tree sprite bounds + 1 tile margin must NOT touch water or deep water
  for (let dy = -canopyOverhang - 1; dy <= 2; dy++) {
    for (let dx = -1; dx <= treeWidth; dx++) {
      const cy = treeY + dy;
      const cx = treeX + dx;
      if (cy < 0 || cy >= H || cx < 0 || cx >= W) return;
      const t = continent.terrainMatrix[cy]?.[cx];
      if (t === 'water' || t === 'water_deep') return;
    }
  }

  // Trunk base (2 rows high) must be strictly grass at elevation 0
  for (let dy = 0; dy < 2; dy++) {
    for (let dx = 0; dx < treeWidth; dx++) {
      const cy = treeY + dy;
      const cx = treeX + dx;
      if (continent.terrainMatrix[cy]?.[cx] !== 'grass') return;
      if ((continent.heightmap[cy]?.[cx] ?? 0) !== 0) return;
      if (continent.resolvedMountain.occupiedFootCells[cy]?.[cx]) return;
      if (blockedMask?.[cy]?.[cx]) return;
    }
  }

  // Species segregation and clearance: trees must not overlap
  for (const other of trees) {
    const dx = Math.abs(treeX - other.x);
    const dy = Math.abs(treeY - other.y);
    const minW = Math.max(treeWidth, other.width);
    if (dy < 2 && dx < minW) return;
    if (dx < minW && dy < Math.max(treeHeight, other.height)) return;
    if (other.prefabFile === 'poke_tree_oak_yellow.png' && Math.hypot(treeX - other.x, treeY - other.y) < 8) {
      return;
    }
  }

  trees.push({ x: treeX, y: treeY, width: treeWidth, height: treeHeight, prefabFile });
  if (blockedMask) {
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < treeWidth; dx++) {
        blockedMask[treeY + dy]![treeX + dx] = true;
      }
    }
  }
}

function isCellAdjacentToWater(x: number, y: number, continent: ContinentMapResult): boolean {
  for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
    const nx = x + dx;
    const ny = y + dy;
    const terr = continent.terrainMatrix[ny]?.[nx];
    if (terr === 'water' || terr === 'water_deep') return true;
  }
  return false;
}

function tryAddBarrierProp(
  type: WildernessPropPlacement['type'],
  x: number,
  y: number,
  prefabFile: string,
  continent: ContinentMapResult,
  props: WildernessPropPlacement[],
  blockedMask?: boolean[][],
  allowWaterEdge = false
): boolean {
  const W = continent.width;
  const H = continent.height;
  if (x < 0 || x >= W || y < 0 || y >= H) return false;
  if (!allowWaterEdge && isCellAdjacentToWater(x, y, continent)) return false;
  if ((continent.heightmap[y]?.[x] ?? 0) > 0) return false;
  if (continent.resolvedMountain.occupiedFootCells[y]?.[x]) return false;
  if (continent.resolvedMountain.cellDetails[y]?.[x]) return false;
  const terr = continent.terrainMatrix[y]?.[x];
  if (terr === 'water' || terr === 'water_deep') return false;

  // Strict 2.5D clearance: fences must never be placed on or adjacent to stairs
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const ny = y + dy;
      const nx = x + dx;
      if (ny < 0 || ny >= H || nx < 0 || nx >= W) continue;
      const mCell = continent.resolvedMountain.cellDetails[ny]?.[nx];
      if (mCell && mCell.role.includes('stairs')) {
        return false;
      }
      if (continent.placedStairs.some((s) => s.x === nx && s.y === ny)) {
        return false;
      }
    }
  }

  // Spacing check: all props must maintain >= 2.0 distance from other props,
  // except contiguous segments of the same fence run (same row for fence_h, same col for fence_v)
  for (const p of props) {
    const isContiguousHFence = type === 'fence_h' && p.type === 'fence_h' && p.y === y && Math.abs(p.x - x) === 1;
    const isContiguousVFence = type === 'fence_v' && p.type === 'fence_v' && p.x === x && Math.abs(p.y - y) === 1;
    if (isContiguousHFence || isContiguousVFence) {
      continue;
    }
    if (Math.hypot(p.x - x, p.y - y) < 2.0) return false;
  }

  props.push({ type, x, y, prefabFile });
  if (blockedMask) blockedMask[y]![x] = true;
  return true;
}

/**
 * Checks whether a cell contains an impassable obstacle (cliff, water, tree foot, fence, building).
 */
export function isCellImpassable(
  x: number,
  y: number,
  continent: ContinentMapResult,
  trees: readonly TreePlacement[],
  props: readonly WildernessPropPlacement[],
  gate: POINode
): boolean {
  const W = continent.width;
  const H = continent.height;
  if (x < 0 || x >= W || y < 0 || y >= H) return true;

  // 1. Mountain cliffs / elevation / foot cells
  if ((continent.heightmap[y]?.[x] ?? 0) > 0) return true;
  if (continent.resolvedMountain.occupiedFootCells[y]?.[x]) return true;

  // 2. Water
  const t = continent.terrainMatrix[y]?.[x];
  if (t === 'water' || t === 'water_deep') return true;

  // 3. Gatehouse building footprint
  const b = gate.urbanLayout?.buildings[0];
  const bx = b ? b.x : gate.gridX + 2;
  const by = b ? b.y : gate.gridY + 1;
  const bw = b ? b.width : 6;
  const bh = b ? b.height : 7;
  if (x >= bx && x < bx + bw && y >= by && y < by + bh) return true;

  // 4. Props (fences, rocks, and urban layout props)
  if (props.some((p) => p.x === x && p.y === y)) return true;
  if (gate.urbanLayout?.props?.some((p) => p.x === x && p.y === y)) return true;

  // 5. Trees (trunk base: bottom 2 rows, center column)
  for (const tr of trees) {
    const footLeft = tr.x + Math.floor((tr.width - 1) / 2);
    const footRight = footLeft + 1;
    const footTop = tr.y + tr.height - 2;
    const footBottom = tr.y + tr.height;
    if (x >= footLeft && x <= footRight && y >= footTop && y < footBottom) return true;
  }

  return false;
}

/**
 * Runs a local BFS flood-fill to verify if a player can skirt around the gatehouse
 * through open grass from North to South without passing through the gatehouse building.
 *
 * @returns true if the gate is hermetic (no bypass possible), false if a bypass exists.
 */
export function verifyRouteGateAntiBypass(params: RouteGateBarrierParams): boolean {
  const { continent, gate, trees, props } = params;
  const W = continent.width;
  const H = continent.height;
  const isHorizontal = gate.facing === 'east' || gate.facing === 'west';

  const b = gate.urbanLayout?.buildings[0];
  const bx = b ? b.x : gate.gridX + (isHorizontal ? 1 : 2);
  const by = b ? b.y : gate.gridY + (isHorizontal ? 2 : 1);
  const bw = b ? b.width : (isHorizontal ? 8 : 6);
  const bh = b ? b.height : (isHorizontal ? 5 : 7);

  if (isHorizontal) {
    // Search window around the horizontal gatehouse (West to East)
    const lateralMargin = 25;
    const minY = Math.max(0, by - lateralMargin);
    const maxY = Math.min(H - 1, by + bh + lateralMargin);
    const westX = Math.max(0, bx - 6);
    const eastX = Math.min(W - 1, bx + bw + 6);

    // Multi-source BFS: can ANY walkable cell at west boundary reach east boundary?
    const queue: { x: number; y: number }[] = [];
    const visited = new Set<string>();

    for (let y = minY; y <= maxY; y++) {
      if (!isCellImpassable(westX, y, continent, trees, props, gate)) {
        queue.push({ x: westX, y });
        visited.add(`${westX}_${y}`);
      }
    }

    const DX = [0, 0, 1, -1] as const;
    const DY = [1, -1, 0, 0] as const;

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.x >= eastX) {
        return false;
      }

      for (let d = 0; d < 4; d++) {
        const nx = cur.x + DX[d]!;
        const ny = cur.y + DY[d]!;
        if (nx < westX || nx > eastX || ny < minY || ny > maxY) continue;

        const key = `${nx}_${ny}`;
        if (visited.has(key)) continue;

        if (isCellImpassable(nx, ny, continent, trees, props, gate)) {
          continue;
        }

        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }

    return true;
  } else {
    // Search window around the vertical gatehouse (North to South)
    const lateralMargin = 25;
    const minX = Math.max(0, bx - lateralMargin);
    const maxX = Math.min(W - 1, bx + bw + lateralMargin);
    const northY = Math.max(0, by - 6);
    const southY = Math.min(H - 1, by + bh + 6);

    // Multi-source BFS: can ANY walkable cell at north boundary reach south boundary?
    const queue: { x: number; y: number }[] = [];
    const visited = new Set<string>();

    for (let x = minX; x <= maxX; x++) {
      if (!isCellImpassable(x, northY, continent, trees, props, gate)) {
        queue.push({ x, y: northY });
        visited.add(`${x}_${northY}`);
      }
    }

    const DX = [0, 0, 1, -1] as const;
    const DY = [1, -1, 0, 0] as const;

    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (cur.y >= southY) {
        return false;
      }

      for (let d = 0; d < 4; d++) {
        const nx = cur.x + DX[d]!;
        const ny = cur.y + DY[d]!;
        if (nx < minX || nx > maxX || ny < northY || ny > southY) continue;

        const key = `${nx}_${ny}`;
        if (visited.has(key)) continue;

        if (isCellImpassable(nx, ny, continent, trees, props, gate)) {
          continue;
        }

        visited.add(key);
        queue.push({ x: nx, y: ny });
      }
    }

    return true;
  }
}

/**
 * Seals the lateral flanks of a route gatehouse with authentic GBA fences, bushes, and dense trees,
 * iteratively closing any open grass bypasses discovered by multi-source BFS flood-fill.
 */
export function sealRouteGateFlankBarriers(options: SealRouteGateOptions): void {
  const { continent, gate, trees, props, blockedMask } = options;
  const W = continent.width;
  const H = continent.height;
  const isHorizontal = gate.facing === 'east' || gate.facing === 'west';

  const b = gate.urbanLayout?.buildings[0];
  const bx = b ? b.x : gate.gridX + (isHorizontal ? 1 : 2);
  const by = b ? b.y : gate.gridY + (isHorizontal ? 2 : 1);
  const bw = b ? b.width : (isHorizontal ? 8 : 6);
  const bh = b ? b.height : (isHorizontal ? 5 : 7);

  if (isHorizontal) {
    // ------------------------------------------------------------------------
    // HORIZONTAL ROUTE GATE (East-West transit)
    // ------------------------------------------------------------------------
    const doorY = by + bh - 2;
    const sacredMinY = doorY;
    const sacredMaxY = doorY + 1;
    const sacredMinX = Math.max(0, bx - 10);
    const sacredMaxX = Math.min(W - 1, bx + bw + 10);

    // Remove conflicting props and trees inside sacred transit avenue
    for (let i = props.length - 1; i >= 0; i--) {
      const p = props[i]!;
      if (p.x >= sacredMinX && p.x <= sacredMaxX && p.y >= sacredMinY && p.y <= sacredMaxY) {
        props.splice(i, 1);
      }
    }
    for (let i = trees.length - 1; i >= 0; i--) {
      const tr = trees[i]!;
      const footLeft = tr.x + Math.floor((tr.width - 1) / 2);
      const footRight = footLeft + 1;
      const footTop = tr.y + tr.height - 2;
      const footBottom = tr.y + tr.height - 1;
      const overlapsX = footRight >= sacredMinX && footLeft <= sacredMaxX;
      const overlapsY = footBottom >= sacredMinY && footTop <= sacredMaxY;
      if (overlapsX && overlapsY) {
        trees.splice(i, 1);
      }
    }

    // Lateral barriers run North and South from building center
    const barrierX = bx + Math.floor(bw / 2);
    const fenceRunLen = 5;

    // Raycast North Flank
    let curY = by - 1;
    let fencesPlacedNorth = 0;
    while (curY >= 0) {
      const h = continent.heightmap[curY]?.[barrierX] ?? 0;
      const t = continent.terrainMatrix[curY]?.[barrierX];
      const isFoot = continent.resolvedMountain.occupiedFootCells[curY]?.[barrierX];
      if (h > 0 || isFoot || t === 'water' || t === 'water_deep') break;

      if (fencesPlacedNorth < fenceRunLen) {
        if (!tryAddBarrierProp('fence_v', barrierX, curY, 'poke_fence_white_v_left.png', continent, props, blockedMask)) {
          if (!isCellImpassable(barrierX, curY, continent, trees, props, gate)) break;
        } else {
          fencesPlacedNorth++;
        }
      } else {
        if ((by - 1 - curY) % 3 === 0) {
          tryAddBarrierTree(barrierX - 1, curY - 3, continent, trees, blockedMask);
        }
        if (!tryAddBarrierProp('fence_v', barrierX, curY, 'poke_fence_white_v_left.png', continent, props, blockedMask)) {
          if (!isCellImpassable(barrierX, curY, continent, trees, props, gate)) break;
        }
      }
      curY--;
    }

    // Raycast South Flank
    curY = by + bh;
    let fencesPlacedSouth = 0;
    while (curY < H) {
      const h = continent.heightmap[curY]?.[barrierX] ?? 0;
      const t = continent.terrainMatrix[curY]?.[barrierX];
      const isFoot = continent.resolvedMountain.occupiedFootCells[curY]?.[barrierX];
      if (h > 0 || isFoot || t === 'water' || t === 'water_deep') break;

      if (fencesPlacedSouth < fenceRunLen) {
        if (!tryAddBarrierProp('fence_v', barrierX, curY, 'poke_fence_white_v_left.png', continent, props, blockedMask)) {
          if (!isCellImpassable(barrierX, curY, continent, trees, props, gate)) break;
        } else {
          fencesPlacedSouth++;
        }
      } else {
        if ((curY - (by + bh)) % 3 === 0) {
          tryAddBarrierTree(barrierX - 1, curY, continent, trees, blockedMask);
        }
        if (!tryAddBarrierProp('fence_v', barrierX, curY, 'poke_fence_white_v_left.png', continent, props, blockedMask)) {
          if (!isCellImpassable(barrierX, curY, continent, trees, props, gate)) break;
        }
      }
      curY++;
    }

    // Iterative Multi-Source BFS Anti-Bypass Sealing (West to East)
    const lateralMargin = 25;
    const minY = Math.max(0, by - lateralMargin);
    const maxY = Math.min(H - 1, by + bh + lateralMargin);
    const westX = Math.max(0, bx - 6);
    const eastX = Math.min(W - 1, bx + bw + 6);

    const DX = [0, 0, 1, -1] as const;
    const DY = [1, -1, 0, 0] as const;

    for (let iteration = 0; iteration < 50; iteration++) {
      const queue: { x: number; y: number }[] = [];
      const cameFrom = new Map<string, { x: number; y: number } | null>();

      for (let y = minY; y <= maxY; y++) {
        if (!isCellImpassable(westX, y, continent, trees, props, gate)) {
          queue.push({ x: westX, y });
          cameFrom.set(`${westX}_${y}`, null);
        }
      }

      let reachedEastCell: { x: number; y: number } | null = null;
      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (cur.x >= eastX) {
          reachedEastCell = cur;
          break;
        }
        for (let d = 0; d < 4; d++) {
          const nx = cur.x + DX[d]!;
          const ny = cur.y + DY[d]!;
          if (nx < westX || nx > eastX || ny < minY || ny > maxY) continue;

          const key = `${nx}_${ny}`;
          if (cameFrom.has(key)) continue;
          if (isCellImpassable(nx, ny, continent, trees, props, gate)) continue;

          cameFrom.set(key, cur);
          queue.push({ x: nx, y: ny });
        }
      }

      if (!reachedEastCell) break; // 100% Hermetic!

      // Backtrack path to find crossing coordinate near barrierX outside sacred corridor
      let curr: { x: number; y: number } | null = reachedEastCell;
      const candidates: { x: number; y: number; diff: number }[] = [];

      while (curr) {
        if (curr.y < sacredMinY || curr.y > sacredMaxY) {
          const diffX = Math.abs(curr.x - barrierX);
          candidates.push({ x: curr.x, y: curr.y, diff: diffX });
        }
        curr = cameFrom.get(`${curr.x}_${curr.y}`) ?? null;
      }

      candidates.sort((a, b) => a.diff - b.diff);
      let placed = false;
      for (const cand of candidates) {
        if (tryAddBarrierProp('fence_v', cand.x, cand.y, 'poke_fence_white_v_left.png', continent, props, blockedMask, true)) {
          placed = true;
          break;
        }
      }
      if (!placed) break;
    }
  } else {
    // ------------------------------------------------------------------------
    // VERTICAL ROUTE GATE (North-South transit)
    // ------------------------------------------------------------------------
    const sacredMinX = bx + 1;
    const sacredMaxX = bx + 4;
    const sacredMinY = Math.max(0, by - 10);
    const sacredMaxY = Math.min(H - 1, by + bh + 10);

    // Remove conflicting props and trees inside sacred transit avenue
    for (let i = props.length - 1; i >= 0; i--) {
      const p = props[i]!;
      if (p.x >= sacredMinX && p.x <= sacredMaxX && p.y >= sacredMinY && p.y <= sacredMaxY) {
        props.splice(i, 1);
      }
    }
    for (let i = trees.length - 1; i >= 0; i--) {
      const tr = trees[i]!;
      const footLeft = tr.x + Math.floor((tr.width - 1) / 2);
      const footRight = footLeft + 1;
      const footTop = tr.y + tr.height - 2;
      const footBottom = tr.y + tr.height - 1;
      const overlapsX = footRight >= sacredMinX && footLeft <= sacredMaxX;
      const overlapsY = footBottom >= sacredMinY && footTop <= sacredMaxY;
      if (overlapsX && overlapsY) {
        trees.splice(i, 1);
      }
    }

    const barrierY = by + 3;
    const fenceRunLen = 5;

    // Raycast Left Flank (West)
    let curX = bx - 1;
    let fencesPlacedLeft = 0;
    while (curX >= 0) {
      const h = continent.heightmap[barrierY]?.[curX] ?? 0;
      const t = continent.terrainMatrix[barrierY]?.[curX];
      const isFoot = continent.resolvedMountain.occupiedFootCells[barrierY]?.[curX];
      if (h > 0 || isFoot || t === 'water' || t === 'water_deep') break;

      if (fencesPlacedLeft < fenceRunLen) {
        if (!tryAddBarrierProp('fence_h', curX, barrierY, 'poke_fence_white_h_mid.png', continent, props, blockedMask)) {
          if (!isCellImpassable(curX, barrierY, continent, trees, props, gate)) break;
        } else {
          fencesPlacedLeft++;
        }
      } else {
        if ((bx - 1 - curX) % 3 === 0) {
          tryAddBarrierTree(curX - 1, barrierY - 3, continent, trees, blockedMask);
        }
        if (!tryAddBarrierProp('fence_h', curX, barrierY, 'poke_fence_white_h_mid.png', continent, props, blockedMask)) {
          if (!isCellImpassable(curX, barrierY, continent, trees, props, gate)) break;
        }
      }
      curX--;
    }

    // Raycast Right Flank (East)
    curX = bx + bw;
    let fencesPlacedRight = 0;
    while (curX < W) {
      const h = continent.heightmap[barrierY]?.[curX] ?? 0;
      const t = continent.terrainMatrix[barrierY]?.[curX];
      const isFoot = continent.resolvedMountain.occupiedFootCells[barrierY]?.[curX];
      if (h > 0 || isFoot || t === 'water' || t === 'water_deep') break;

      if (fencesPlacedRight < fenceRunLen) {
        if (!tryAddBarrierProp('fence_h', curX, barrierY, 'poke_fence_white_h_mid.png', continent, props, blockedMask)) {
          if (!isCellImpassable(curX, barrierY, continent, trees, props, gate)) break;
        } else {
          fencesPlacedRight++;
        }
      } else {
        if ((curX - (bx + bw)) % 3 === 0) {
          tryAddBarrierTree(curX, barrierY - 3, continent, trees, blockedMask);
        }
        if (!tryAddBarrierProp('fence_h', curX, barrierY, 'poke_fence_white_h_mid.png', continent, props, blockedMask)) {
          if (!isCellImpassable(curX, barrierY, continent, trees, props, gate)) break;
        }
      }
      curX++;
    }

    // Iterative Multi-Source BFS Anti-Bypass Sealing (North to South)
    const lateralMargin = 25;
    const minX = Math.max(0, bx - lateralMargin);
    const maxX = Math.min(W - 1, bx + bw + lateralMargin);
    const northY = Math.max(0, by - 6);
    const southY = Math.min(H - 1, by + bh + 6);

    const DX = [0, 0, 1, -1] as const;
    const DY = [1, -1, 0, 0] as const;

    for (let iteration = 0; iteration < 50; iteration++) {
      const queue: { x: number; y: number }[] = [];
      const cameFrom = new Map<string, { x: number; y: number } | null>();

      for (let x = minX; x <= maxX; x++) {
        if (!isCellImpassable(x, northY, continent, trees, props, gate)) {
          queue.push({ x, y: northY });
          cameFrom.set(`${x}_${northY}`, null);
        }
      }

      let reachedSouthCell: { x: number; y: number } | null = null;
      while (queue.length > 0) {
        const cur = queue.shift()!;
        if (cur.y >= southY) {
          reachedSouthCell = cur;
          break;
        }
        for (let d = 0; d < 4; d++) {
          const nx = cur.x + DX[d]!;
          const ny = cur.y + DY[d]!;
          if (nx < minX || nx > maxX || ny < northY || ny > southY) continue;

          const key = `${nx}_${ny}`;
          if (cameFrom.has(key)) continue;
          if (isCellImpassable(nx, ny, continent, trees, props, gate)) continue;

          cameFrom.set(key, cur);
          queue.push({ x: nx, y: ny });
        }
      }

      if (!reachedSouthCell) break; // 100% Hermetic!

      // Backtrack path to find crossing coordinate near barrierY outside sacred corridor
      let curr: { x: number; y: number } | null = reachedSouthCell;
      const candidates: { x: number; y: number; diff: number }[] = [];

      while (curr) {
        if (curr.x < sacredMinX || curr.x > sacredMaxX) {
          const diffY = Math.abs(curr.y - barrierY);
          candidates.push({ x: curr.x, y: curr.y, diff: diffY });
        }
        curr = cameFrom.get(`${curr.x}_${curr.y}`) ?? null;
      }

      candidates.sort((a, b) => a.diff - b.diff);
      let placed = false;
      for (const cand of candidates) {
        if (tryAddBarrierProp('fence_h', cand.x, cand.y, 'poke_fence_white_h_mid.png', continent, props, blockedMask, true)) {
          placed = true;
          break;
        }
      }
      if (!placed) break;
    }
  }

  // Sort trees so newly planted barrier trees maintain Y-sorting North to South
  trees.sort((t1, t2) => t1.y - t2.y || t1.x - t2.x);
}
