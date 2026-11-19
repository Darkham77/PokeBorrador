/**
 * src/logic/map/routeGateBarrierEngine.ts
 *
 * Dedicated engine for route gatehouse checkpoints (route_gate):
 * - Guarantees a 100% sacred transit road corridor entering and exiting the gatehouse.
 * - Extends authentic lateral barrier fences and dense tree lines to seal the flanks.
 * - Mathematically verifies and enforces anti-bypass closure via local BFS flood-fill.
 */

import type { POINode } from '../../types/map/poiTypes.ts';
import type { ContinentMapResult } from './continentGenerator.ts';
import { isCellAdjacentToMountainStairs } from './continentMountainEngine.ts';
import { resolveNaturalBushPrefab } from './wildernessBoundarySealing.ts';
import type { TreePlacement, WildernessPropPlacement } from './wildernessVegetationEngine.ts';

export interface RouteGateBarrierParams {
  readonly continent: ContinentMapResult;
  readonly gate: POINode;
  readonly trees: readonly TreePlacement[];
  readonly props: readonly WildernessPropPlacement[];
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly pois?: readonly POINode[];
}

export interface SealRouteGateOptions {
  readonly continent: ContinentMapResult;
  readonly gate: POINode;
  readonly trees: TreePlacement[];
  readonly props: WildernessPropPlacement[];
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly blockedMask?: boolean[][];
  readonly pois?: readonly POINode[];
}

interface SacredAvenueBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

const YELLOW_OAK_MIN_DISTANCE = 8 as const;
const MIN_PROP_SPACING_DISTANCE = 2.0 as const;
const MAX_BFS_SEAL_ITERATIONS = 160 as const;
const MAX_FLANK_BARRIER_REACH = 26 as const;
const GATE_COMPACT_FENCE_WING_LEN = 3 as const;

function doesTreeOverlapCell(x: number, y: number, tr: TreePlacement, trunkOnly = false): boolean {
  const canopyOverhang = trunkOnly ? 0 : Math.max(0, tr.height - 2);
  return x >= tr.x && x < tr.x + tr.width && y >= tr.y - canopyOverhang && y <= tr.y + 1;
}

function hasBlockingPropAt(
  x: number,
  y: number,
  props?: readonly WildernessPropPlacement[],
  gate?: POINode
): boolean {
  if (props?.some((p) => p.x === x && p.y === y)) return true;
  if (gate?.urbanLayout?.props?.some((p) => p.x === x && p.y === y)) return true;
  return false;
}

export interface GateBarrierTheme {
  readonly vFencePrefab: string;
  readonly hFencePrefab: string;
  readonly vFenceType: WildernessPropPlacement['type'];
  readonly hFenceType: WildernessPropPlacement['type'];
  readonly treePrefab: string;
  readonly treeWidth: number;
  readonly treeHeight: number;
}

const GATE_BARRIER_OAK_YELLOW_THRESHOLD = 0.65 as const;
const GATE_BARRIER_WOOD_THRESHOLD = 0.35 as const;
const GATE_BARRIER_HEDGE_THRESHOLD = 0.6 as const;

function getGateBarrierTheme(gate: POINode, continent: ContinentMapResult): GateBarrierTheme {
  const mBiome = continent.macroBiomes?.biomeGrid[gate.gridY]?.[gate.gridX] ?? 'temperate_meadow';
  const seedHash = Math.abs(Math.sin((gate.gridX * 31 + gate.gridY * 17) * 0.1));

  let treePrefab = 'poke_tree_oak_clean.png';
  let treeWidth = 3;
  let treeHeight = 4;
  if (mBiome === 'mint_highland') {
    treePrefab = 'poke_tree_pine_small.png';
    treeWidth = 2;
    treeHeight = 3;
  } else if (seedHash > GATE_BARRIER_OAK_YELLOW_THRESHOLD) {
    treePrefab = 'poke_tree_oak_yellow.png';
    treeWidth = 3;
    treeHeight = 4;
  }

  // Theme selection:
  // < 0.35: Rustic wood fencing
  // 0.35..0.60: Trimmed round hedge bushes
  // >= 0.60: Ornamental white picket fencing
  if (seedHash < GATE_BARRIER_WOOD_THRESHOLD) {
    return {
      vFencePrefab: 'poke_fence_wood_v.png',
      hFencePrefab: 'poke_fence_wood_h.png',
      vFenceType: 'fence_v',
      hFenceType: 'fence_h',
      treePrefab,
      treeWidth,
      treeHeight
    };
  } else if (seedHash < GATE_BARRIER_HEDGE_THRESHOLD) {
    return {
      vFencePrefab: 'poke_bush_round.png',
      hFencePrefab: 'poke_bush_round.png',
      vFenceType: 'fence_v',
      hFenceType: 'fence_h',
      treePrefab,
      treeWidth,
      treeHeight
    };
  }

  return {
    vFencePrefab: 'poke_fence_white_v_left.png',
    hFencePrefab: 'poke_fence_white_h_mid.png',
    vFenceType: 'fence_v',
    hFenceType: 'fence_h',
    treePrefab,
    treeWidth,
    treeHeight
  };
}

function resolveNaturalSingleBarrierPlug(
  continent: ContinentMapResult,
  x: number,
  y: number
): { readonly type: WildernessPropPlacement['type']; readonly prefabFile: string } {
  const mBiome = continent.macroBiomes?.biomeGrid[y]?.[x];
  const elev = continent.heightmap[y]?.[x] ?? 0;
  if (elev > 0 && (mBiome === 'arid_desert' || mBiome === 'volcanic_plateau')) {
    return { type: 'boulder', prefabFile: 'poke_rock_boulder.png' };
  }
  return {
    type: 'bush',
    prefabFile: resolveNaturalBushPrefab(mBiome, x, y)
  };
}

function tryPlugBfsLeakCandidates(
  candidates: readonly { readonly x: number; readonly y: number; readonly diff: number }[],
  targetFenceType: WildernessPropPlacement['type'],
  targetFencePrefab: string,
  continent: ContinentMapResult,
  props: WildernessPropPlacement[],
  blockedMask: boolean[][] | undefined,
  pois: readonly POINode[] | undefined,
  gate: POINode,
  trees: TreePlacement[]
): boolean {
  for (const cand of candidates) {
    if (isCellInsideOtherSettlement(cand.x, cand.y, pois, gate)) continue;
    // 1. Prefer sealing with a valid tree trunk covering the leak cell without touching fences
    for (const [tx, ty] of [
      [cand.x - 1, cand.y],
      [cand.x, cand.y],
      [cand.x - 1, cand.y - 1],
      [cand.x, cand.y - 1]
    ] as const) {
      if (tryAddBarrierTree(tx, ty, continent, trees, blockedMask, pois, gate, props)) {
        return true;
      }
    }
    // 2. Extend or start a contiguous fence line (respects dist >= 2.0 from non-matching props)
    const noTreeCanopy = !trees.some((tr) => doesTreeOverlapCell(cand.x, cand.y, tr, false));
    if (
      noTreeCanopy &&
      tryAddBarrierProp(
        targetFenceType,
        cand.x,
        cand.y,
        targetFencePrefab,
        continent,
        props,
        blockedMask,
        false,
        pois,
        gate,
        false,
        trees,
        true
      )
    ) {
      return true;
    }
    // 3. Fallback single natural plug (bush/boulder) respecting dist >= 2.0, including near stairs/cliff feet
    if (trees.some((tr) => doesTreeOverlapCell(cand.x, cand.y, tr, true))) continue;
    const plug = resolveNaturalSingleBarrierPlug(continent, cand.x, cand.y);
    if (
      tryAddBarrierProp(
        plug.type,
        cand.x,
        cand.y,
        plug.prefabFile,
        continent,
        props,
        blockedMask,
        false,
        pois,
        gate,
        false,
        trees,
        true
      )
    ) {
      return true;
    }
  }

  // 4. Bridge 1-tile pinch bottlenecks along fence axis where neighboring blockers are aligned fences, bushes, or boulders
  for (const cand of candidates) {
    if (
      tryBridgePinchWithFence(
        cand,
        targetFenceType,
        targetFencePrefab,
        continent,
        props,
        blockedMask,
        pois,
        gate,
        trees
      )
    ) {
      return true;
    }
  }

  // 5. Last-resort canopy overhang resolution: remove a single overhanging wilderness tree trapping a 1-tile pinch
  for (const cand of candidates) {
    if (isCellInsideOtherSettlement(cand.x, cand.y, pois, gate)) continue;
    const canopyBlockers = trees.filter(
      (tr) =>
        doesTreeOverlapCell(cand.x, cand.y, tr, false) &&
        !doesTreeOverlapCell(cand.x, cand.y, tr, true)
    );
    if (canopyBlockers.length !== 1) continue;
    const blockingTree = canopyBlockers[0]!;
    const treeIdx = trees.indexOf(blockingTree);
    if (treeIdx === -1) continue;
    trees.splice(treeIdx, 1);

    const pluggedAfterClear =
      tryAddBarrierProp(
        targetFenceType,
        cand.x,
        cand.y,
        targetFencePrefab,
        continent,
        props,
        blockedMask,
        false,
        pois,
        gate,
        false,
        trees,
        true
      ) ||
      tryBridgePinchWithFence(
        cand,
        targetFenceType,
        targetFencePrefab,
        continent,
        props,
        blockedMask,
        pois,
        gate,
        trees
      );
    if (pluggedAfterClear) {
      return true;
    }
    trees.splice(treeIdx, 0, blockingTree);
  }
  return false;
}

function tryBridgePinchWithFence(
  cand: { readonly x: number; readonly y: number },
  targetFenceType: WildernessPropPlacement['type'],
  targetFencePrefab: string,
  continent: ContinentMapResult,
  props: WildernessPropPlacement[],
  blockedMask: boolean[][] | undefined,
  pois: readonly POINode[] | undefined,
  gate: POINode,
  trees: readonly TreePlacement[]
): boolean {
  if (isCellInsideOtherSettlement(cand.x, cand.y, pois, gate)) return false;
  if (trees.some((tr) => doesTreeOverlapCell(cand.x, cand.y, tr, false))) return false;
  const blockingProps = props.filter(
    (p) => Math.hypot(p.x - cand.x, p.y - cand.y) < MIN_PROP_SPACING_DISTANCE
  );
  if (blockingProps.length === 0) return false;

  const convertible: WildernessPropPlacement[] = [];
  for (const blocker of blockingProps) {
    const isAligned =
      (targetFenceType === 'fence_h' &&
        blocker.y === cand.y &&
        Math.abs(blocker.x - cand.x) === 1) ||
      (targetFenceType === 'fence_v' && blocker.x === cand.x && Math.abs(blocker.y - cand.y) === 1);
    if (!isAligned) return false;
    if (blocker.type === targetFenceType) continue;
    if (blocker.type !== 'bush' && blocker.type !== 'boulder') return false;
    if (trees.some((tr) => doesTreeOverlapCell(blocker.x, blocker.y, tr, false))) return false;
    const hasConflict = props.some(
      (other) =>
        other !== blocker &&
        !(
          (targetFenceType === 'fence_h' &&
            other.type === 'fence_h' &&
            other.y === blocker.y &&
            Math.abs(other.x - blocker.x) === 1) ||
          (targetFenceType === 'fence_v' &&
            other.type === 'fence_v' &&
            other.x === blocker.x &&
            Math.abs(other.y - blocker.y) === 1)
        ) &&
        Math.hypot(other.x - blocker.x, other.y - blocker.y) < MIN_PROP_SPACING_DISTANCE
    );
    if (hasConflict) return false;
    convertible.push(blocker);
  }

  const rollback: { idx: number; prev: WildernessPropPlacement }[] = [];
  for (const blocker of convertible) {
    const idx = props.indexOf(blocker);
    rollback.push({ idx, prev: { ...blocker } });
    props[idx] = {
      type: targetFenceType,
      x: blocker.x,
      y: blocker.y,
      prefabFile: targetFencePrefab
    };
  }

  if (
    tryAddBarrierProp(
      targetFenceType,
      cand.x,
      cand.y,
      targetFencePrefab,
      continent,
      props,
      blockedMask,
      true,
      pois,
      gate,
      false,
      trees,
      true
    )
  ) {
    return true;
  }

  for (const entry of rollback) {
    props[entry.idx] = entry.prev;
  }
  return false;
}

function normalizeOrphanedBarrierFences(
  props: WildernessPropPlacement[],
  continent: ContinentMapResult
): void {
  const fenceKeys = new Set<string>();
  for (const p of props) {
    if (p.prefabFile.includes('poke_fence_')) {
      fenceKeys.add(`${p.x}_${p.y}`);
    }
  }
  for (let i = 0; i < props.length; i++) {
    const p = props[i]!;
    if (!p.prefabFile.includes('poke_fence_')) continue;
    const hasCardinalFence =
      fenceKeys.has(`${p.x - 1}_${p.y}`) ||
      fenceKeys.has(`${p.x + 1}_${p.y}`) ||
      fenceKeys.has(`${p.x}_${p.y - 1}`) ||
      fenceKeys.has(`${p.x}_${p.y + 1}`);
    if (!hasCardinalFence) {
      const hasCloseNonFenceProp = props.some(
        (other) =>
          other !== p && Math.hypot(other.x - p.x, other.y - p.y) < MIN_PROP_SPACING_DISTANCE
      );
      if (hasCloseNonFenceProp) continue;
      const replacement = resolveNaturalSingleBarrierPlug(continent, p.x, p.y);
      props[i] = {
        type: replacement.type,
        x: p.x,
        y: p.y,
        prefabFile: replacement.prefabFile
      };
    }
  }
}

function isCellInsideOtherSettlement(
  x: number,
  y: number,
  pois: readonly POINode[] | undefined,
  currentGate: POINode | undefined
): boolean {
  if (!pois) return false;
  for (const poi of pois) {
    if (poi === currentGate || poi.type === 'route_gate') continue;

    // 1. Settlement bounding box (+1 margin)
    const minX = poi.gridX - 1;
    const maxX = poi.gridX + poi.footprint.width + 1;
    const minY = poi.gridY - 1;
    const maxY = poi.gridY + poi.footprint.height + 1;
    if (x < minX || x > maxX || y < minY || y > maxY) continue;

    // Check building footprints (+1 margin for doorsteps / sidewalk)
    if (poi.urbanLayout?.buildings) {
      for (const b of poi.urbanLayout.buildings) {
        if (x >= b.x - 1 && x <= b.x + b.width && y >= b.y - 1 && y <= b.y + b.height + 1) {
          return true;
        }
      }
    }
    // Check paved plazas and internal streets
    if (poi.urbanLayout?.pavedPlazaCells?.some((p) => p.x === x && p.y === y)) {
      return true;
    }
    if (poi.urbanLayout?.internalStreets?.some((s) => s.x === x && s.y === y)) {
      return true;
    }
    // Check urban props (fountains, benches, lamps)
    if (poi.urbanLayout?.props?.some((p) => Math.abs(p.x - x) <= 1 && Math.abs(p.y - y) <= 1)) {
      return true;
    }
    // Settlement core and immediate 1-tile perimeter buffer only when POI has no granular urbanLayout
    if (
      !poi.urbanLayout &&
      x >= poi.gridX - 1 &&
      x <= poi.gridX + poi.footprint.width &&
      y >= poi.gridY - 1 &&
      y <= poi.gridY + poi.footprint.height
    ) {
      return true;
    }
  }
  return false;
}

function clearSacredTransitConflicts(
  props: WildernessPropPlacement[],
  trees: TreePlacement[],
  bounds: SacredAvenueBounds
): void {
  for (let i = props.length - 1; i >= 0; i--) {
    const p = props[i]!;
    if (p.x >= bounds.minX && p.x <= bounds.maxX && p.y >= bounds.minY && p.y <= bounds.maxY) {
      props.splice(i, 1);
    }
  }
  for (let i = trees.length - 1; i >= 0; i--) {
    const tr = trees[i]!;
    const left = tr.x;
    const right = tr.x + tr.width - 1;
    // Clear only physical 2-row trunk intersections; perimeter tree canopies may frame sacred avenues
    const top = tr.y;
    const bottom = tr.y + 1;
    const overlapsX = right >= bounds.minX && left <= bounds.maxX;
    const overlapsY = bottom >= bounds.minY && top <= bounds.maxY;
    if (overlapsX && overlapsY) {
      trees.splice(i, 1);
    }
  }
}

function tryAddBarrierTree(
  treeX: number,
  treeY: number,
  continent: ContinentMapResult,
  trees: TreePlacement[],
  blockedMask?: boolean[][],
  pois?: readonly POINode[],
  gate?: POINode,
  props?: readonly WildernessPropPlacement[]
): boolean {
  if (isCellInsideOtherSettlement(treeX, treeY, pois, gate)) return false;
  const W = continent.width;
  const H = continent.height;
  const mBiome = continent.macroBiomes?.biomeGrid[treeY]?.[treeX] ?? 'temperate_meadow';
  if (mBiome === 'arid_desert' || mBiome === 'volcanic_plateau') return false;

  let prefabFile = 'poke_tree_oak_clean.png';
  let treeWidth = 3;
  let treeHeight = 4;
  if (mBiome === 'mint_highland') {
    prefabFile = 'poke_tree_pine_small.png';
    treeWidth = 2;
    treeHeight = 3;
  }

  const canopyOverhang = treeHeight - 2;
  if (treeX < 0 || treeX + treeWidth > W || treeY - canopyOverhang < 0 || treeY + 2 > H) {
    return false;
  }

  // Water clearance: tree sprite bounds + 1 tile margin must NOT touch water or deep water
  for (let dy = -canopyOverhang - 1; dy <= 2; dy++) {
    for (let dx = -1; dx <= treeWidth; dx++) {
      const cy = treeY + dy;
      const cx = treeX + dx;
      if (cy < 0 || cy >= H || cx < 0 || cx >= W) return false;
      const t = continent.terrainMatrix[cy]?.[cx];
      if (t === 'water' || t === 'water_deep') return false;
    }
  }

  // Trunk base (2 rows) must be flat grass, and full trunk+canopy must avoid props/fences/blockedMask
  for (let dy = -canopyOverhang; dy < 2; dy++) {
    for (let dx = 0; dx < treeWidth; dx++) {
      const cy = treeY + dy;
      const cx = treeX + dx;
      if (continent.terrainMatrix[cy]?.[cx] !== 'grass') return false;
      if ((continent.heightmap[cy]?.[cx] ?? 0) !== 0) return false;
      if (continent.resolvedMountain.occupiedFootCells[cy]?.[cx]) return false;
      if (blockedMask?.[cy]?.[cx]) return false;
      if (hasBlockingPropAt(cx, cy, props, gate)) return false;
      if (isCellInsideOtherSettlement(cx, cy, pois, gate)) return false;
    }
  }

  // Species segregation and clearance: trees must not overlap
  for (const other of trees) {
    const dx = Math.abs(treeX - other.x);
    const dy = Math.abs(treeY - other.y);
    const minW = Math.max(treeWidth, other.width);
    if (dy < 2 && dx < minW) return false;
    if (dx < minW && dy < Math.max(treeHeight, other.height)) return false;
    if (
      other.prefabFile === 'poke_tree_oak_yellow.png' &&
      Math.hypot(treeX - other.x, treeY - other.y) < YELLOW_OAK_MIN_DISTANCE
    ) {
      return false;
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
  return true;
}

function isCellAdjacentToWater(x: number, y: number, continent: ContinentMapResult): boolean {
  for (const [dx, dy] of [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0]
  ] as const) {
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
  allowWaterEdge = false,
  pois?: readonly POINode[],
  gate?: POINode,
  _reservedUnusedFlag = false,
  trees?: readonly TreePlacement[],
  allowNearStairsAndCliffFoot = false
): boolean {
  const W = continent.width;
  const H = continent.height;
  if (x < 0 || x >= W || y < 0 || y >= H) return false;
  if (isCellInsideOtherSettlement(x, y, pois, gate)) return false;
  if (gate?.urbanLayout?.props?.some((p) => p.x === x && p.y === y)) return false;
  const isFence = type === 'fence_h' || type === 'fence_v';
  if (trees?.some((tr) => doesTreeOverlapCell(x, y, tr, !isFence))) return false;
  if (!allowWaterEdge && isCellAdjacentToWater(x, y, continent)) return false;
  if ((continent.heightmap[y]?.[x] ?? 0) > 0) return false;
  if (continent.resolvedMountain.occupiedFootCells[y]?.[x]) return false;
  const terr = continent.terrainMatrix[y]?.[x];
  if (terr === 'water' || terr === 'water_deep') return false;

  if (!allowNearStairsAndCliffFoot) {
    if (continent.resolvedMountain.cellDetails[y]?.[x]) return false;
    if (isCellAdjacentToMountainStairs(x, y, continent.resolvedMountain.cellDetails, W, H))
      return false;
    if (continent.placedStairs.some((s) => Math.abs(s.x - x) <= 1 && Math.abs(s.y - y) <= 1))
      return false;
  } else {
    // Still never plug an actual stair tile itself
    const isOnStairTile =
      continent.placedStairs.some((s) => (s.x === x || s.x + 1 === x) && s.y === y) ||
      Boolean(continent.resolvedMountain.cellDetails[y]?.[x]?.role.includes('stairs'));
    if (isOnStairTile) return false;
  }

  // Raycast & emergency props maintain >= MIN_PROP_SPACING_DISTANCE except contiguous segments of the same fence run.
  for (const p of props) {
    const isContiguousHFence =
      type === 'fence_h' && p.type === 'fence_h' && p.y === y && Math.abs(p.x - x) === 1;
    const isContiguousVFence =
      type === 'fence_v' && p.type === 'fence_v' && p.x === x && Math.abs(p.y - y) === 1;
    if (isContiguousHFence || isContiguousVFence) {
      continue;
    }
    if (Math.hypot(p.x - x, p.y - y) < MIN_PROP_SPACING_DISTANCE) return false;
  }

  props.push({ type, x, y, prefabFile });
  if (blockedMask) blockedMask[y]![x] = true;
  return true;
}

function placeFlankFenceStep(
  fenceType: WildernessPropPlacement['type'],
  x: number,
  y: number,
  prefabFile: string,
  continent: ContinentMapResult,
  props: WildernessPropPlacement[],
  blockedMask: boolean[][] | undefined,
  trees: readonly TreePlacement[],
  gate: POINode,
  pois?: readonly POINode[]
): boolean {
  if (
    tryAddBarrierProp(
      fenceType,
      x,
      y,
      prefabFile,
      continent,
      props,
      blockedMask,
      false,
      pois,
      gate,
      false,
      trees
    )
  ) {
    return true;
  }
  return isCellImpassable(x, y, continent, trees, props, gate, pois);
}

/**
 * Checks whether a cell contains an impassable obstacle (cliff, water, tree foot, fence, building).
 */
function isCellImpassable(
  x: number,
  y: number,
  continent: ContinentMapResult,
  trees: readonly TreePlacement[],
  props: readonly WildernessPropPlacement[],
  gate: POINode,
  pois?: readonly POINode[]
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

  // 5. Trees (trunk base: 2 rows starting at tr.y across tree width)
  for (const tr of trees) {
    if (x >= tr.x && x < tr.x + tr.width && y >= tr.y && y <= tr.y + 1) return true;
  }

  // 6. Other settlements: impassable obstacle for bypass BFS
  if (isCellInsideOtherSettlement(x, y, pois, gate)) return true;

  return false;
}

interface BfsBounds {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
}

export interface BfsCoord {
  x: number;
  y: number;
}

function expandBfsNeighbors(
  cur: BfsCoord,
  bounds: BfsBounds,
  cameFrom: Map<string, BfsCoord | null>,
  queue: BfsCoord[],
  continent: ContinentMapResult,
  trees: readonly TreePlacement[],
  props: readonly WildernessPropPlacement[],
  gate: POINode,
  pois?: readonly POINode[]
): void {
  const DX = [0, 0, 1, -1] as const;
  const DY = [1, -1, 0, 0] as const;
  for (let d = 0; d < 4; d++) {
    const nx = cur.x + DX[d]!;
    const ny = cur.y + DY[d]!;
    if (nx < bounds.minX || nx > bounds.maxX || ny < bounds.minY || ny > bounds.maxY) continue;

    const key = `${nx}_${ny}`;
    if (cameFrom.has(key)) continue;
    if (isCellImpassable(nx, ny, continent, trees, props, gate, pois)) continue;

    cameFrom.set(key, cur);
    queue.push({ x: nx, y: ny });
  }
}

interface GatehouseBounds {
  W: number;
  H: number;
  isHorizontal: boolean;
  bx: number;
  by: number;
  bw: number;
  bh: number;
}

function resolveGatehouseBounds(
  continent: RouteGateBarrierParams['continent'],
  gate: RouteGateBarrierParams['gate']
): GatehouseBounds {
  const W = continent.width;
  const H = continent.height;
  const isHorizontal = gate.facing === 'east' || gate.facing === 'west';

  const b = gate.urbanLayout?.buildings[0];
  const bx = b ? b.x : gate.gridX + (isHorizontal ? 1 : 2);
  const by = b ? b.y : gate.gridY + (isHorizontal ? 2 : 1);
  const bw = b ? b.width : isHorizontal ? 8 : 6;
  const bh = b ? b.height : isHorizontal ? 5 : 7;

  return { W, H, isHorizontal, bx, by, bw, bh };
}

const GATE_ANTI_BYPASS_LATERAL_MARGIN = 25 as const;
const GATE_ANTI_BYPASS_DEPTH_MARGIN = 6 as const;
const GATE_CARDINAL_DX = [0, 0, 1, -1] as const;
const GATE_CARDINAL_DY = [1, -1, 0, 0] as const;

interface GateWindowBfsConfig {
  readonly minX: number;
  readonly maxX: number;
  readonly minY: number;
  readonly maxY: number;
  readonly seeds: readonly { readonly x: number; readonly y: number }[];
  readonly reachedOppositeSide: (x: number, y: number) => boolean;
}

function canBypassGateWindow(params: RouteGateBarrierParams, cfg: GateWindowBfsConfig): boolean {
  const { continent, gate, trees, props, pois } = params;
  const queue: { x: number; y: number }[] = [];
  const visited = new Set<string>();

  for (const seed of cfg.seeds) {
    if (seed.x < cfg.minX || seed.x > cfg.maxX || seed.y < cfg.minY || seed.y > cfg.maxY) {
      continue;
    }
    if (!isCellImpassable(seed.x, seed.y, continent, trees, props, gate, pois)) {
      queue.push({ x: seed.x, y: seed.y });
      visited.add(`${seed.x}_${seed.y}`);
    }
  }

  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cfg.reachedOppositeSide(cur.x, cur.y)) {
      return true;
    }

    for (let d = 0; d < GATE_CARDINAL_DX.length; d++) {
      const nx = cur.x + GATE_CARDINAL_DX[d]!;
      const ny = cur.y + GATE_CARDINAL_DY[d]!;
      if (nx < cfg.minX || nx > cfg.maxX || ny < cfg.minY || ny > cfg.maxY) continue;

      const key = `${nx}_${ny}`;
      if (visited.has(key)) continue;
      if (isCellImpassable(nx, ny, continent, trees, props, gate, pois)) continue;

      visited.add(key);
      queue.push({ x: nx, y: ny });
    }
  }

  return false;
}

/**
 * Runs a local BFS flood-fill from the gatehouse's entrance chamber to verify
 * no player can skirt around the gate flanks to the opposite side without entering.
 *
 * @returns true if the gate is hermetic (no bypass possible), false if a bypass exists.
 */
export function verifyRouteGateAntiBypass(params: RouteGateBarrierParams): boolean {
  const { continent, gate, trees, props, pois } = params;
  const { W, H, isHorizontal, bx, by, bw, bh } = resolveGatehouseBounds(continent, gate);

  if (isHorizontal) {
    const minY = Math.max(0, by - GATE_ANTI_BYPASS_LATERAL_MARGIN);
    const maxY = Math.min(H - 1, by + bh + GATE_ANTI_BYPASS_LATERAL_MARGIN);
    const westX = Math.max(0, bx - GATE_ANTI_BYPASS_DEPTH_MARGIN);
    const eastX = Math.min(W - 1, bx + bw + GATE_ANTI_BYPASS_DEPTH_MARGIN);
    const westDoorX = Math.max(westX, bx - 1);
    const doorSeeds = [
      { x: westDoorX, y: by + bh - 2 },
      { x: westDoorX, y: by + bh - 1 }
    ].filter((pt) => !isCellImpassable(pt.x, pt.y, continent, trees, props, gate, pois));

    const seeds =
      doorSeeds.length > 0
        ? doorSeeds
        : Array.from({ length: maxY - minY + 1 }, (_, idx) => ({ x: westX, y: minY + idx }));

    return !canBypassGateWindow(params, {
      minX: westX,
      maxX: eastX,
      minY,
      maxY,
      seeds,
      reachedOppositeSide: (x) => x >= eastX
    });
  }

  const minX = Math.max(0, bx - GATE_ANTI_BYPASS_LATERAL_MARGIN);
  const maxX = Math.min(W - 1, bx + bw + GATE_ANTI_BYPASS_LATERAL_MARGIN);
  const northY = Math.max(0, by - GATE_ANTI_BYPASS_DEPTH_MARGIN);
  const southY = Math.min(H - 1, by + bh + GATE_ANTI_BYPASS_DEPTH_MARGIN);
  const northDoorY = Math.max(northY, by - 1);
  const midX = bx + Math.floor(bw / 2);
  const doorSeeds = [
    { x: midX - 1, y: northDoorY },
    { x: midX, y: northDoorY }
  ].filter((pt) => !isCellImpassable(pt.x, pt.y, continent, trees, props, gate, pois));

  const seeds =
    doorSeeds.length > 0
      ? doorSeeds
      : Array.from({ length: maxX - minX + 1 }, (_, idx) => ({ x: minX + idx, y: northY }));

  return !canBypassGateWindow(params, {
    minX,
    maxX,
    minY: northY,
    maxY: southY,
    seeds,
    reachedOppositeSide: (_, y) => y >= southY
  });
}

interface FlankRaycastConfig {
  readonly startX: number;
  readonly startY: number;
  readonly dx: number;
  readonly dy: number;
  readonly fenceType: WildernessPropPlacement['type'];
  readonly fencePrefab: string;
}

function tryPlantFlankTree(
  curX: number,
  curY: number,
  dx: number,
  dy: number,
  continent: ContinentMapResult,
  trees: TreePlacement[],
  blockedMask: boolean[][] | undefined,
  pois: readonly POINode[] | undefined,
  gate: POINode,
  props: readonly WildernessPropPlacement[]
): TreePlacement | null {
  const candidates: readonly (readonly [number, number])[] =
    dx !== 0
      ? dx < 0
        ? [
            [curX - 2, curY - 1],
            [curX - 1, curY - 1],
            [curX - 2, curY],
            [curX - 1, curY]
          ]
        : [
            [curX, curY - 1],
            [curX, curY]
          ]
      : dy < 0
        ? [
            [curX - 1, curY - 1],
            [curX, curY - 1]
          ]
        : [
            [curX - 1, curY],
            [curX, curY]
          ];

  for (const [tx, ty] of candidates) {
    if (!tryAddBarrierTree(tx, ty, continent, trees, blockedMask, pois, gate, props)) continue;
    const placed = trees[trees.length - 1]!;
    const coversCur =
      curX >= placed.x &&
      curX < placed.x + placed.width &&
      curY >= placed.y &&
      curY <= placed.y + 1;
    if (coversCur) return placed;
  }
  return null;
}

function raycastFlankBarrier(
  cfg: FlankRaycastConfig,
  continent: ContinentMapResult,
  props: WildernessPropPlacement[],
  blockedMask: boolean[][] | undefined,
  trees: TreePlacement[],
  gate: POINode,
  pois?: readonly POINode[]
): void {
  const W = continent.width;
  const H = continent.height;
  let curX = cfg.startX;
  let curY = cfg.startY;
  let reachedSteps = 0;

  while (curX >= 0 && curX < W && curY >= 0 && curY < H && reachedSteps < MAX_FLANK_BARRIER_REACH) {
    if (isCellInsideOtherSettlement(curX, curY, pois, gate)) break;
    const h = continent.heightmap[curY]?.[curX] ?? 0;
    const t = continent.terrainMatrix[curY]?.[curX];
    const isFoot = continent.resolvedMountain.occupiedFootCells[curY]?.[curX];
    if (h > 0 || isFoot || t === 'water' || t === 'water_deep') break;
    if (isCellAdjacentToWater(curX, curY, continent)) break;

    if (reachedSteps < GATE_COMPACT_FENCE_WING_LEN) {
      if (
        !placeFlankFenceStep(
          cfg.fenceType,
          curX,
          curY,
          cfg.fencePrefab,
          continent,
          props,
          blockedMask,
          trees,
          gate,
          pois
        )
      ) {
        break;
      }
      reachedSteps++;
      curX += cfg.dx;
      curY += cfg.dy;
      continue;
    }

    const placedTree = tryPlantFlankTree(
      curX,
      curY,
      cfg.dx,
      cfg.dy,
      continent,
      trees,
      blockedMask,
      pois,
      gate,
      props
    );
    if (placedTree) {
      const span = cfg.dx !== 0 ? placedTree.width : 2;
      reachedSteps += span;
      curX += cfg.dx * span;
      curY += cfg.dy * span;
      continue;
    }

    if (
      placeFlankFenceStep(
        cfg.fenceType,
        curX,
        curY,
        cfg.fencePrefab,
        continent,
        props,
        blockedMask,
        trees,
        gate,
        pois
      )
    ) {
      reachedSteps++;
      curX += cfg.dx;
      curY += cfg.dy;
      continue;
    }

    const plug = resolveNaturalSingleBarrierPlug(continent, curX, curY);
    placeFlankFenceStep(
      plug.type,
      curX,
      curY,
      plug.prefabFile,
      continent,
      props,
      blockedMask,
      trees,
      gate,
      pois
    );
    reachedSteps++;
    curX += cfg.dx;
    curY += cfg.dy;
  }
}

/**
 * Seals the lateral flanks of a route gatehouse with authentic GBA fences, bushes, and dense trees,
 * iteratively closing any open grass bypasses discovered by multi-source BFS flood-fill.
 */
export function sealRouteGateFlankBarriers(options: SealRouteGateOptions): void {
  const { continent, gate, trees, props, blockedMask, pois } = options;
  const theme = getGateBarrierTheme(gate, continent);
  const { W, H, isHorizontal, bx, by, bw, bh } = resolveGatehouseBounds(continent, gate);

  if (isHorizontal) {
    // ------------------------------------------------------------------------
    // HORIZONTAL ROUTE GATE (East-West transit)
    // ------------------------------------------------------------------------
    const doorY = by + bh - 2;
    const sacredMinY = doorY;
    const sacredMaxY = doorY + 1;
    const sacredMinX = Math.max(0, bx - 10);
    const sacredMaxX = Math.min(W - 1, bx + bw + 10);

    clearSacredTransitConflicts(props, trees, {
      minX: sacredMinX,
      maxX: sacredMaxX,
      minY: sacredMinY,
      maxY: sacredMaxY
    });

    // Lateral barriers run North and South from building center
    const barrierX = bx + Math.floor(bw / 2);

    raycastFlankBarrier(
      {
        startX: barrierX,
        startY: by - 1,
        dx: 0,
        dy: -1,
        fenceType: theme.vFenceType,
        fencePrefab: theme.vFencePrefab
      },
      continent,
      props,
      blockedMask,
      trees,
      gate,
      pois
    );

    raycastFlankBarrier(
      {
        startX: barrierX,
        startY: by + bh,
        dx: 0,
        dy: 1,
        fenceType: theme.vFenceType,
        fencePrefab: theme.vFencePrefab
      },
      continent,
      props,
      blockedMask,
      trees,
      gate,
      pois
    );

    // Iterative Multi-Source BFS Anti-Bypass Sealing (West to East)
    const lateralMargin = 25;
    const minY = Math.max(0, by - lateralMargin);
    const maxY = Math.min(H - 1, by + bh + lateralMargin);
    const westX = Math.max(0, bx - 6);
    const eastX = Math.min(W - 1, bx + bw + 6);

    for (let iteration = 0; iteration < MAX_BFS_SEAL_ITERATIONS; iteration++) {
      const queue: { x: number; y: number }[] = [];
      const cameFrom = new Map<string, { x: number; y: number } | null>();

      for (let y = minY; y <= maxY; y++) {
        if (!isCellImpassable(westX, y, continent, trees, props, gate, pois)) {
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
        expandBfsNeighbors(
          cur,
          { minX: westX, maxX: eastX, minY, maxY },
          cameFrom,
          queue,
          continent,
          trees,
          props,
          gate,
          pois
        );
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
      const placed = tryPlugBfsLeakCandidates(
        candidates,
        theme.vFenceType,
        theme.vFencePrefab,
        continent,
        props,
        blockedMask,
        pois,
        gate,
        trees
      );
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

    clearSacredTransitConflicts(props, trees, {
      minX: sacredMinX,
      maxX: sacredMaxX,
      minY: sacredMinY,
      maxY: sacredMaxY
    });

    const barrierY = by + 3;

    raycastFlankBarrier(
      {
        startX: bx - 1,
        startY: barrierY,
        dx: -1,
        dy: 0,
        fenceType: theme.hFenceType,
        fencePrefab: theme.hFencePrefab
      },
      continent,
      props,
      blockedMask,
      trees,
      gate,
      pois
    );

    raycastFlankBarrier(
      {
        startX: bx + bw,
        startY: barrierY,
        dx: 1,
        dy: 0,
        fenceType: theme.hFenceType,
        fencePrefab: theme.hFencePrefab
      },
      continent,
      props,
      blockedMask,
      trees,
      gate,
      pois
    );

    // Iterative Multi-Source BFS Anti-Bypass Sealing (North to South)
    const lateralMargin = 25;
    const minX = Math.max(0, bx - lateralMargin);
    const maxX = Math.min(W - 1, bx + bw + lateralMargin);
    const northY = Math.max(0, by - 6);
    const southY = Math.min(H - 1, by + bh + 6);

    for (let iteration = 0; iteration < MAX_BFS_SEAL_ITERATIONS; iteration++) {
      const queue: { x: number; y: number }[] = [];
      const cameFrom = new Map<string, { x: number; y: number } | null>();

      for (let x = minX; x <= maxX; x++) {
        if (!isCellImpassable(x, northY, continent, trees, props, gate, pois)) {
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
        expandBfsNeighbors(
          cur,
          { minX, maxX, minY: northY, maxY: southY },
          cameFrom,
          queue,
          continent,
          trees,
          props,
          gate,
          pois
        );
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
      const placed = tryPlugBfsLeakCandidates(
        candidates,
        theme.hFenceType,
        theme.hFencePrefab,
        continent,
        props,
        blockedMask,
        pois,
        gate,
        trees
      );
      if (!placed) break;
    }
  }

  normalizeOrphanedBarrierFences(props, continent);

  // Sort trees so newly planted barrier trees maintain Y-sorting North to South
  trees.sort((t1, t2) => t1.y - t2.y || t1.x - t2.x);
}
