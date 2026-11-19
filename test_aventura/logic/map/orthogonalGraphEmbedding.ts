/**
 * src/logic/map/orthogonalGraphEmbedding.ts
 *
 * ORTHOGONAL SPATIAL GRAPH EMBEDDING ENGINE
 *
 * Implements Phase 2 of the Graph-First Pipeline:
 *   1. Embeds abstract Pokémon topology nodes into an orthogonal band grid.
 *   2. Places the Starter at an outer edge (dead-end) and weaves the main chain.
 *   3. Anchors the designated port city to an exterior coastal band.
 *   4. Attaches secondary stubs to adjacent grid cells of their parent.
 *   5. Traces strictly orthogonal corridors (pure H, pure V, or single right-angle L-turn).
 *   6. Wormhole tunnels bypass surface corridors (waypoints = []).
 *   7. Applies bounded organic jitter (±2-4 tiles) while preserving 100% corridor orthogonality.
 */

import {
  LARGE_MAP_THRESHOLD_TILES,
  LARGE_MAP_MARGIN_RATIO,
  STANDARD_MAP_MARGIN_RATIO,
  CLUSTER_SINE_AMPLITUDE,
  LEAGUE_LARGE_WIDTH,
  LEAGUE_NORMAL_WIDTH,
  LEAGUE_LARGE_HEIGHT,
  LEAGUE_NORMAL_HEIGHT,
  CITY_LARGE_WIDTH,
  CITY_NORMAL_WIDTH,
  CITY_LARGE_HEIGHT,
  CITY_NORMAL_HEIGHT,
  STARTER_LARGE_WIDTH,
  STARTER_NORMAL_WIDTH,
  STARTER_LARGE_HEIGHT,
  STARTER_NORMAL_HEIGHT,
  DEFAULT_LARGE_NODE_DIMENSION,
  HASH_PRIME_FACTOR,
  JOG_PRNG_FACTOR_X,
  JOG_PRNG_OFFSET,
  CORRIDOR_JOG_MIN_LENGTH,
  CORRIDOR_JOG_DIST,
  CORRIDOR_SPLIT_PRIMARY_RATIO,
  CORRIDOR_SPLIT_SECONDARY_RATIO,
  CORNER_NODE_COLLISION_PENALTY
} from '../../config/graphEmbeddingConfig.ts';
import type {
  PokemonTopologyGraph,
  TopologyGraphEdge,
  EmbeddedTopologyNode,
  EmbeddedCorridor,
  EmbeddedCorridorWaypoint,
  EmbeddedTopologyGraph,
  RegionMacroArchetype
} from '../../types/map/pokemonGraphTypes.ts';
import { createMulberry32 } from './noise/simplexNoise.ts';

// ---------------------------------------------------------------------------
// Configuration Constants
// ---------------------------------------------------------------------------

const DEFAULT_EMBEDDING_MAP_WIDTH = 400;
const DEFAULT_EMBEDDING_MAP_HEIGHT = 400;
const DEFAULT_MARGIN = 16;
const DEFAULT_NODE_SIZE = 8; // 8x8 default urban footprint
const MAX_JITTER_TILES = 3;

const createPRNG = createMulberry32;

// ---------------------------------------------------------------------------
// Grid Coordinate Interfaces
// ---------------------------------------------------------------------------

interface BandGridConfig {
  readonly cols: number;
  readonly rows: number;
  readonly colX: readonly number[];
  readonly rowY: readonly number[];
}

// ---------------------------------------------------------------------------
// Step 1: Compute Band Grid (T2.1)
// ---------------------------------------------------------------------------

const COMPACT_MAP_MAX_DIM = 200 as const;
const MEDIUM_MAP_MAX_DIM = 340 as const;
const COMPACT_STARTER_W = 10 as const;
const COMPACT_STARTER_H = 8 as const;
const COMPACT_LEAGUE_W = 14 as const;
const COMPACT_LEAGUE_H = 12 as const;
const COMPACT_SECONDARY_DIM = 8 as const;
const COMPACT_DUNGEON_DIM = 12 as const;
const COMPACT_MAX_JITTER = 1 as const;
const MEDIUM_MAX_JITTER = 2 as const;

const CITY_COMPACT_FOOTPRINTS = [
  { width: 12, height: 10 },
  { width: 13, height: 10 },
  { width: 12, height: 11 }
] as const;

export function computeBandGrid(nodeCount: number, width: number, height: number): BandGridConfig {
  const minDim = Math.min(width, height);
  const isCompact = minDim < COMPACT_MAP_MAX_DIM;
  let cols = isCompact ? 3 : 4;
  let rows = isCompact ? 3 : 4;
  while (cols * rows < nodeCount + (isCompact ? 1 : 2)) {
    if (cols <= rows) cols++;
    else rows++;
  }

  const isLarge = minDim >= LARGE_MAP_THRESHOLD_TILES;
  if (minDim >= MEDIUM_MAP_MAX_DIM) {
    cols = Math.max(5, cols);
    rows = Math.max(5, rows);
  }

  const marginRatio = isLarge || isCompact ? LARGE_MAP_MARGIN_RATIO : STANDARD_MAP_MARGIN_RATIO;
  const margin = Math.max(DEFAULT_MARGIN, Math.round(minDim * marginRatio));
  const usableWidth = Math.max(cols * 4, width - 2 * margin);
  const usableHeight = Math.max(rows * 4, height - 2 * margin);

  const colX: number[] = [];
  const rowY: number[] = [];

  if (isLarge && cols >= 4) {
    const getClusteredFraction = (i: number, n: number): number => {
      const t = i / (n - 1);
      return Math.max(0, Math.min(1, t + CLUSTER_SINE_AMPLITUDE * Math.sin(2 * Math.PI * t)));
    };
    for (let c = 0; c < cols; c++) {
      colX.push(Math.round(margin + getClusteredFraction(c, cols) * usableWidth));
    }
    for (let r = 0; r < rows; r++) {
      rowY.push(Math.round(margin + getClusteredFraction(r, rows) * usableHeight));
    }
  } else {
    const colSpacing = usableWidth / Math.max(1, cols - 1);
    const rowSpacing = usableHeight / Math.max(1, rows - 1);
    for (let c = 0; c < cols; c++) {
      colX.push(Math.round(margin + c * colSpacing));
    }
    for (let r = 0; r < rows; r++) {
      rowY.push(Math.round(margin + r * rowSpacing));
    }
  }

  return { cols, rows, colX, rowY };
}

// ---------------------------------------------------------------------------
// Step 2: Assign Nodes to Bands (T2.2 & T2.3)
// ---------------------------------------------------------------------------

interface CellCoord {
  col: number;
  row: number;
}

function cellKey(col: number, row: number): string {
  return `${col},${row}`;
}

function findNearestFreeCellOnGrid(
  currentCell: CellCoord,
  rows: number,
  cols: number,
  occupied: ReadonlySet<string>
): CellCoord {
  let bestDist = Infinity;
  let candidate: CellCoord = { col: 0, row: 0 };

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (occupied.has(cellKey(c, r))) continue;
      const dist = Math.abs(c - currentCell.col) + Math.abs(r - currentCell.row);
      if (dist < bestDist) {
        bestDist = dist;
        candidate = { col: c, row: r };
      }
    }
  }
  return candidate;
}

interface BandCandidateContext {
  readonly cand: CellCoord;
  readonly chainIndex: number;
  readonly totalChain: number;
  readonly cols: number;
  readonly rows: number;
  readonly archetype: RegionMacroArchetype | undefined;
  readonly isIsland: boolean;
  readonly isLeague: boolean;
  readonly starterCell: CellCoord;
  readonly colCounts: readonly number[];
}

const COLUMN_STACK_PENALTY = 1.4 as const;
const LEAGUE_NORTH_APEX_WEIGHT = 6.5 as const;
const LEAGUE_STARTER_SEPARATION_WEIGHT = 1.5 as const;
const LATE_CHAIN_NORTH_PULL_START = 0.45 as const;
const LATE_CHAIN_NORTH_PULL_WEIGHT = 3.2 as const;

function scoreBandCandidateForArchetype(ctx: BandCandidateContext): number {
  const {
    cand,
    chainIndex,
    totalChain,
    cols,
    rows,
    archetype,
    isIsland,
    isLeague,
    starterCell,
    colCounts
  } = ctx;
  const midCol = (cols - 1) / 2;
  const midRow = (rows - 1) / 2;
  const progress = totalChain > 1 ? chainIndex / (totalChain - 1) : 0;
  const ARCHETYPE_WEIGHT = 4.0;
  const HORSESHOE_CENTER_PENALTY = 5.0;
  const ISLAND_EAST_BONUS = 6.0;
  const BAY_NODE_HALF_WEIGHT = 1.5;

  // Discourage tall narrow vertical chimneys that leave half the continent empty
  const colBalancePenalty = -((colCounts[cand.col] ?? 0) * COLUMN_STACK_PENALTY);
  const leagueApexBonus =
    isLeague && archetype !== 'oceanic_archipelago'
      ? -cand.row * LEAGUE_NORTH_APEX_WEIGHT +
        Math.hypot(cand.col - starterCell.col, cand.row - starterCell.row) *
          LEAGUE_STARTER_SEPARATION_WEIGHT
      : 0;

  if (archetype === 'oceanic_archipelago') {
    if (isIsland) return cand.col * ISLAND_EAST_BONUS;
    return (
      -Math.abs(cand.col - Math.max(0, midCol * 0.5)) * BAY_NODE_HALF_WEIGHT + colBalancePenalty
    );
  }
  if (archetype === 'divided_valley') {
    const diagCol = progress * (cols - 1);
    const diagRow = (1 - progress * 0.72) * (rows - 1);
    const diagColWeight = 2.6;
    const diagRowWeight = 1.6;
    const northPull =
      progress >= LATE_CHAIN_NORTH_PULL_START ? -cand.row * LATE_CHAIN_NORTH_PULL_WEIGHT * 0.65 : 0;
    return (
      -Math.abs(cand.col - diagCol) * diagColWeight -
      Math.abs(cand.row - diagRow) * diagRowWeight +
      colBalancePenalty +
      northPull +
      leagueApexBonus
    );
  }
  if (archetype === 'volcanic_horseshoe') {
    const isPerimeter =
      cand.col === 0 || cand.col === cols - 1 || cand.row === 0 || cand.row === rows - 1;
    const radialDist = Math.hypot(cand.col - midCol, cand.row - midRow);
    return (
      (isPerimeter ? ARCHETYPE_WEIGHT : -HORSESHOE_CENTER_PENALTY) + radialDist + leagueApexBonus
    );
  }
  // classic_bay: arc around central/south bay, sweeping cleanly into northern apex for the League
  const bayPenalty =
    Math.abs(cand.col - midCol) < 1 && cand.row >= Math.floor(rows / 2) ? -ARCHETYPE_WEIGHT : 0;
  const northPull =
    progress >= LATE_CHAIN_NORTH_PULL_START
      ? -cand.row * progress * LATE_CHAIN_NORTH_PULL_WEIGHT
      : 0;
  return bayPenalty + northPull + colBalancePenalty + leagueApexBonus;
}

function assignNodesToBands(
  graph: PokemonTopologyGraph,
  bandGrid: BandGridConfig,
  prng: () => number
): Map<string, CellCoord> {
  const { cols, rows } = bandGrid;
  const assignments = new Map<string, CellCoord>();
  const occupied = new Set<string>();
  const archetype = graph.macroArchetype;

  // 1. Place Starter at a peripheral cell biased by regional archetype
  const perimeterCells: CellCoord[] = [];
  for (let c = 0; c < cols; c++) {
    perimeterCells.push({ col: c, row: 0 });
    perimeterCells.push({ col: c, row: rows - 1 });
  }
  for (let r = 1; r < rows - 1; r++) {
    perimeterCells.push({ col: 0, row: r });
    perimeterCells.push({ col: cols - 1, row: r });
  }

  const starterId = graph.mainChainOrder[0]!;
  const preferredStarters =
    archetype === 'oceanic_archipelago' || archetype === 'divided_valley'
      ? perimeterCells.filter((p) => p.col === 0)
      : perimeterCells.filter((p) => p.row === rows - 1);
  const starterPool = preferredStarters.length > 0 ? preferredStarters : perimeterCells;
  const starterCell = starterPool[Math.floor(prng() * starterPool.length)]!;
  assignments.set(starterId, starterCell);
  occupied.add(cellKey(starterCell.col, starterCell.row));

  const colCounts = Array.from({ length: cols }, () => 0);
  colCounts[starterCell.col] = (colCounts[starterCell.col] ?? 0) + 1;

  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));

  // 2. Weave Main Chain sequentially across neighboring cells with archetype shaping
  let currentCell = starterCell;

  for (let i = 1; i < graph.mainChainOrder.length; i++) {
    const nodeId = graph.mainChainOrder[i]!;
    const chainNode = nodeById.get(nodeId);
    const isIslandNode = Boolean(chainNode?.isIsland);
    const isLeagueNode = chainNode?.role === 'league';

    // Candidate adjacent cells (Manhattan distance 1)
    const neighbors: CellCoord[] = [
      { col: currentCell.col + 1, row: currentCell.row },
      { col: currentCell.col - 1, row: currentCell.row },
      { col: currentCell.col, row: currentCell.row + 1 },
      { col: currentCell.col, row: currentCell.row - 1 }
    ].filter(
      (c) =>
        c.col >= 0 &&
        c.col < cols &&
        c.row >= 0 &&
        c.row < rows &&
        !occupied.has(cellKey(c.col, c.row))
    );

    let nextCell: CellCoord;

    if (neighbors.length > 0) {
      let bestScore = -Infinity;
      let chosen = neighbors[0]!;
      const ARCHETYPE_JITTER = 1.5;
      for (const cand of neighbors) {
        const score =
          scoreBandCandidateForArchetype({
            cand,
            chainIndex: i,
            totalChain: graph.mainChainOrder.length,
            cols,
            rows,
            archetype,
            isIsland: isIslandNode,
            isLeague: isLeagueNode,
            starterCell,
            colCounts
          }) +
          prng() * ARCHETYPE_JITTER;
        if (score > bestScore) {
          bestScore = score;
          chosen = cand;
        }
      }
      nextCell = chosen;
    } else {
      // Fallback: search nearest free cell on the grid
      nextCell = findNearestFreeCellOnGrid(currentCell, rows, cols, occupied);
    }

    assignments.set(nodeId, nextCell);
    occupied.add(cellKey(nextCell.col, nextCell.row));
    colCounts[nextCell.col] = (colCounts[nextCell.col] ?? 0) + 1;
    currentCell = nextCell;
  }

  // 3. Place Secondary Stub Nodes near their parent
  const mainChainSet = new Set<string>(graph.mainChainOrder);
  const secondaryNodes = graph.nodes.filter((n) => !mainChainSet.has(n.id));

  for (const node of secondaryNodes) {
    // Find parent edge
    const edge = graph.edges.find(
      (e) => (e.fromId === node.id || e.toId === node.id) && e.kind === 'branch_stub'
    );
    const parentId = edge ? (edge.fromId === node.id ? edge.toId : edge.fromId) : starterId;
    const parentCell = assignments.get(parentId) ?? starterCell;

    // Search nearest free neighbor
    const candidates: CellCoord[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!occupied.has(cellKey(c, r))) {
          candidates.push({ col: c, row: r });
        }
      }
    }

    candidates.sort((a, b) => {
      const distA = Math.abs(a.col - parentCell.col) + Math.abs(a.row - parentCell.row);
      const distB = Math.abs(b.col - parentCell.col) + Math.abs(b.row - parentCell.row);
      return distA - distB;
    });

    const stubCell = candidates[0] ?? { col: 0, row: 0 };
    assignments.set(node.id, stubCell);
    occupied.add(cellKey(stubCell.col, stubCell.row));
  }

  return assignments;
}

// ---------------------------------------------------------------------------
// Step 3: Apply Organic Jitter & Determine Node Dimensions (T2.4)
// ---------------------------------------------------------------------------

const CITY_LARGE_FOOTPRINTS = [
  { width: CITY_LARGE_WIDTH, height: CITY_LARGE_HEIGHT },
  { width: 24, height: 16 },
  { width: 20, height: 20 },
  { width: 18, height: 20 },
  { width: 24, height: 18 }
] as const;

const CITY_NORMAL_FOOTPRINTS = [
  { width: CITY_NORMAL_WIDTH, height: CITY_NORMAL_HEIGHT },
  { width: 18, height: 14 },
  { width: 16, height: 16 },
  { width: 18, height: 16 }
] as const;

const RECENTER_MARGIN_RATIO = 0.08 as const;
const MIN_RECENTER_MARGIN_TILES = 12 as const;

function embedNodes(
  graph: PokemonTopologyGraph,
  bandGrid: BandGridConfig,
  assignments: Map<string, CellCoord>,
  prng: () => number,
  mapWidth: number,
  mapHeight: number
): EmbeddedTopologyNode[] {
  const result: EmbeddedTopologyNode[] = [];
  const minDim = Math.min(mapWidth, mapHeight);
  const isCompact = minDim < COMPACT_MAP_MAX_DIM;
  const isLarge = minDim >= MEDIUM_MAP_MAX_DIM;
  const jitterLimit = isCompact
    ? COMPACT_MAX_JITTER
    : isLarge
      ? MAX_JITTER_TILES
      : MEDIUM_MAX_JITTER;

  for (const node of graph.nodes) {
    const cell = assignments.get(node.id) ?? { col: 0, row: 0 };
    const baseCenterX = bandGrid.colX[cell.col]!;
    const baseCenterY = bandGrid.rowY[cell.row]!;

    // Bounded deterministic jitter
    const jx = Math.round((prng() * 2 - 1) * jitterLimit);
    const jy = Math.round((prng() * 2 - 1) * jitterLimit);

    const centerX = baseCenterX + jx;
    const centerY = baseCenterY + jy;

    let width: number = isCompact ? COMPACT_SECONDARY_DIM : DEFAULT_NODE_SIZE;
    let height: number = isCompact ? COMPACT_SECONDARY_DIM : DEFAULT_NODE_SIZE;

    if (node.role === 'league') {
      width = isCompact ? COMPACT_LEAGUE_W : isLarge ? LEAGUE_LARGE_WIDTH : LEAGUE_NORMAL_WIDTH;
      height = isCompact ? COMPACT_LEAGUE_H : isLarge ? LEAGUE_LARGE_HEIGHT : LEAGUE_NORMAL_HEIGHT;
    } else if (node.role === 'gym_city' || node.role === 'port_city') {
      const variants = isCompact
        ? CITY_COMPACT_FOOTPRINTS
        : isLarge
          ? CITY_LARGE_FOOTPRINTS
          : CITY_NORMAL_FOOTPRINTS;
      const variant =
        variants[(hashId(node.id) + Math.floor(prng() * variants.length)) % variants.length]!;
      width = variant.width;
      height = variant.height;
    } else if (node.role === 'starter') {
      width = isCompact ? COMPACT_STARTER_W : isLarge ? STARTER_LARGE_WIDTH : STARTER_NORMAL_WIDTH;
      height = isCompact
        ? COMPACT_STARTER_H
        : isLarge
          ? STARTER_LARGE_HEIGHT
          : STARTER_NORMAL_HEIGHT;
    } else if (isCompact && node.role === 'secondary_dungeon') {
      width = COMPACT_DUNGEON_DIM;
      height = COMPACT_DUNGEON_DIM;
    } else if (isLarge) {
      width = DEFAULT_LARGE_NODE_DIMENSION;
      height = DEFAULT_LARGE_NODE_DIMENSION;
    }

    const gridX = Math.round(centerX - width / 2);
    const gridY = Math.round(centerY - height / 2);

    result.push({
      ...node,
      gridX,
      gridY,
      width,
      height,
      centerX,
      centerY,
      bandCol: cell.col,
      bandRow: cell.row
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// Step 4: Trace Orthogonal Corridors (T2.5)
// ---------------------------------------------------------------------------

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = Math.trunc(h * HASH_PRIME_FACTOR + id.charCodeAt(i));
  }
  return Math.abs(h);
}

function rasterizeOrthogonalSegment(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  jogSeed?: number,
  forbiddenBoxes?: readonly { minX: number; maxX: number; minY: number; maxY: number }[]
): EmbeddedCorridorWaypoint[] {
  const cells: EmbeddedCorridorWaypoint[] = [];

  if (x1 === x2) {
    // Pure vertical
    const len = Math.abs(y2 - y1);
    const step = y1 <= y2 ? 1 : -1;

    // Introduce an organic GBA step-jog for long stretches (>= 36 tiles)
    if (len >= CORRIDOR_JOG_MIN_LENGTH && jogSeed !== undefined) {
      const prngVal = Math.sin(jogSeed * JOG_PRNG_FACTOR_X + JOG_PRNG_OFFSET);
      const preferredDir = prngVal > 0 ? 1 : -1;
      const jogDist = CORRIDOR_JOG_DIST * preferredDir;

      const ySplit1 = Math.round(y1 + step * Math.floor(len * CORRIDOR_SPLIT_PRIMARY_RATIO));
      const ySplit2 = Math.round(y1 + step * Math.floor(len * CORRIDOR_SPLIT_SECONDARY_RATIO));
      const targetX = x1 + jogDist;

      const collides = forbiddenBoxes?.some(
        (b) =>
          targetX >= b.minX &&
          targetX <= b.maxX &&
          Math.min(ySplit1, ySplit2) <= b.maxY &&
          Math.max(ySplit1, ySplit2) >= b.minY
      );

      if (!collides) {
        for (let y = y1; step > 0 ? y <= ySplit1 : y >= ySplit1; y += step) {
          cells.push({ x: x1, y });
        }
        const xStep = targetX >= x1 ? 1 : -1;
        for (let x = x1 + xStep; xStep > 0 ? x <= targetX : x >= targetX; x += xStep) {
          cells.push({ x, y: ySplit1 });
        }
        for (let y = ySplit1 + step; step > 0 ? y <= ySplit2 : y >= ySplit2; y += step) {
          cells.push({ x: targetX, y });
        }
        const bStep = x1 >= targetX ? 1 : -1;
        for (let x = targetX + bStep; bStep > 0 ? x <= x1 : x >= x1; x += bStep) {
          cells.push({ x, y: ySplit2 });
        }
        for (let y = ySplit2 + step; step > 0 ? y <= y2 : y >= y2; y += step) {
          cells.push({ x: x1, y });
        }
        return cells;
      }
    }

    for (let y = y1; step > 0 ? y <= y2 : y >= y2; y += step) {
      cells.push({ x: x1, y });
    }
    return cells;
  } else if (y1 === y2) {
    // Pure horizontal
    const len = Math.abs(x2 - x1);
    const step = x1 <= x2 ? 1 : -1;

    // Introduce an organic GBA step-jog for long stretches (>= 36 tiles)
    if (len >= CORRIDOR_JOG_MIN_LENGTH && jogSeed !== undefined) {
      const prngVal = Math.sin(jogSeed * JOG_PRNG_FACTOR_X + JOG_PRNG_OFFSET);
      const preferredDir = prngVal > 0 ? 1 : -1;
      const jogDist = CORRIDOR_JOG_DIST * preferredDir;

      const xSplit1 = Math.round(x1 + step * Math.floor(len * CORRIDOR_SPLIT_PRIMARY_RATIO));
      const xSplit2 = Math.round(x1 + step * Math.floor(len * CORRIDOR_SPLIT_SECONDARY_RATIO));
      const targetY = y1 + jogDist;

      const collides = forbiddenBoxes?.some(
        (b) =>
          targetY >= b.minY &&
          targetY <= b.maxY &&
          Math.min(xSplit1, xSplit2) <= b.maxX &&
          Math.max(xSplit1, xSplit2) >= b.minX
      );

      if (!collides) {
        for (let x = x1; step > 0 ? x <= xSplit1 : x >= xSplit1; x += step) {
          cells.push({ x, y: y1 });
        }
        const yStep = targetY >= y1 ? 1 : -1;
        for (let y = y1 + yStep; yStep > 0 ? y <= targetY : y >= targetY; y += yStep) {
          cells.push({ x: xSplit1, y });
        }
        for (let x = xSplit1 + step; step > 0 ? x <= xSplit2 : x >= xSplit2; x += step) {
          cells.push({ x, y: targetY });
        }
        const bStep = y1 >= targetY ? 1 : -1;
        for (let y = targetY + bStep; bStep > 0 ? y <= y1 : y >= y1; y += bStep) {
          cells.push({ x: xSplit2, y });
        }
        for (let x = xSplit2 + step; step > 0 ? x <= x2 : x >= x2; x += step) {
          cells.push({ x, y: y1 });
        }
        return cells;
      }
    }

    for (let x = x1; step > 0 ? x <= x2 : x >= x2; x += step) {
      cells.push({ x, y: y1 });
    }
    return cells;
  }

  return cells;
}

function traceCorridor(
  edge: TopologyGraphEdge,
  nodeMap: Map<string, EmbeddedTopologyNode>,
  allNodes: readonly EmbeddedTopologyNode[]
): EmbeddedCorridor {
  // Wormhole tunnels do not have surface corridors
  if (edge.kind === 'wormhole_tunnel') {
    return {
      id: edge.id,
      fromId: edge.fromId,
      toId: edge.toId,
      kind: edge.kind,
      barrier: edge.barrier,
      waypoints: [],
      pathCells: [],
      tunnelPairId: edge.tunnelPairId
    };
  }

  const fromNode = nodeMap.get(edge.fromId)!;
  const toNode = nodeMap.get(edge.toId)!;

  const x1 = fromNode.centerX;
  const y1 = fromNode.centerY;
  const x2 = toNode.centerX;
  const y2 = toNode.centerY;

  const forbiddenBoxes = allNodes
    .filter((n) => n.id !== fromNode.id && n.id !== toNode.id)
    .map((n) => ({
      minX: n.gridX - 2,
      maxX: n.gridX + n.width + 2,
      minY: n.gridY - 2,
      maxY: n.gridY + n.height + 2
    }));

  const jogBase = hashId(edge.id);

  // Case 1: Pure horizontal corridor
  if (y1 === y2) {
    const waypoints: EmbeddedCorridorWaypoint[] = [
      { x: x1, y: y1 },
      { x: x2, y: y2 }
    ];
    const pathCells = rasterizeOrthogonalSegment(x1, y1, x2, y2, jogBase, forbiddenBoxes);
    return {
      id: edge.id,
      fromId: edge.fromId,
      toId: edge.toId,
      kind: edge.kind,
      barrier: edge.barrier,
      waypoints,
      pathCells
    };
  }

  // Case 2: Pure vertical corridor
  if (x1 === x2) {
    const waypoints: EmbeddedCorridorWaypoint[] = [
      { x: x1, y: y1 },
      { x: x2, y: y2 }
    ];
    const pathCells = rasterizeOrthogonalSegment(x1, y1, x2, y2, jogBase, forbiddenBoxes);
    return {
      id: edge.id,
      fromId: edge.fromId,
      toId: edge.toId,
      kind: edge.kind,
      barrier: edge.barrier,
      waypoints,
      pathCells
    };
  }

  // Case 3: L-Turn corridor (Right angle at corner)
  // Option A: (x1, y1) -> (x1, y2) -> (x2, y2)
  // Option B: (x1, y1) -> (x2, y1) -> (x2, y2)
  const cornerA: EmbeddedCorridorWaypoint = { x: x1, y: y2 };
  const cornerB: EmbeddedCorridorWaypoint = { x: x2, y: y1 };

  // Evaluate which corner option collides less with other nodes
  function countNodeCollisions(corner: EmbeddedCorridorWaypoint): number {
    let count = 0;
    for (const n of allNodes) {
      if (n.id === fromNode.id || n.id === toNode.id) continue;
      // Check if corner falls inside node's bounding footprint
      if (
        corner.x >= n.gridX &&
        corner.x < n.gridX + n.width &&
        corner.y >= n.gridY &&
        corner.y < n.gridY + n.height
      ) {
        count += CORNER_NODE_COLLISION_PENALTY;
      }
    }
    return count;
  }

  const chosenCorner =
    countNodeCollisions(cornerA) <= countNodeCollisions(cornerB) ? cornerA : cornerB;

  const waypoints: EmbeddedCorridorWaypoint[] = [{ x: x1, y: y1 }, chosenCorner, { x: x2, y: y2 }];

  // Rasterize two orthogonal segments
  const seg1 = rasterizeOrthogonalSegment(
    x1,
    y1,
    chosenCorner.x,
    chosenCorner.y,
    jogBase + 1,
    forbiddenBoxes
  );
  const seg2 = rasterizeOrthogonalSegment(
    chosenCorner.x,
    chosenCorner.y,
    x2,
    y2,
    jogBase + 2,
    forbiddenBoxes
  );

  // Combine cells avoiding duplicate corner
  const pathCells: EmbeddedCorridorWaypoint[] = [...seg1];
  for (let i = 1; i < seg2.length; i++) {
    pathCells.push(seg2[i]!);
  }

  return {
    id: edge.id,
    fromId: edge.fromId,
    toId: edge.toId,
    kind: edge.kind,
    barrier: edge.barrier,
    waypoints,
    pathCells
  };
}

// ---------------------------------------------------------------------------
// Step 5: Public API: Embed Pokémon Topology Graph (T2.1 - T2.5)
// ---------------------------------------------------------------------------

export interface OrthogonalEmbeddingOptions {
  readonly width?: number; // default: 128
  readonly height?: number; // default: 128
  readonly seed?: number;
}

function recenterEmbeddedNodes(
  nodes: readonly EmbeddedTopologyNode[],
  width: number,
  height: number
): readonly EmbeddedTopologyNode[] {
  if (nodes.length === 0) return nodes;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    if (n.gridX < minX) minX = n.gridX;
    if (n.gridX + n.width > maxX) maxX = n.gridX + n.width;
    if (n.gridY < minY) minY = n.gridY;
    if (n.gridY + n.height > maxY) maxY = n.gridY + n.height;
  }

  const outerMargin = Math.max(
    MIN_RECENTER_MARGIN_TILES,
    Math.round(Math.min(width, height) * RECENTER_MARGIN_RATIO)
  );
  const desiredShiftX = Math.round(width / 2 - (minX + maxX) / 2);
  const desiredShiftY = Math.round(height / 2 - (minY + maxY) / 2);

  const minShiftX = outerMargin - minX;
  const maxShiftX = width - outerMargin - maxX;
  const minShiftY = outerMargin - minY;
  const maxShiftY = height - outerMargin - maxY;

  const shiftX =
    minShiftX <= maxShiftX
      ? Math.max(minShiftX, Math.min(maxShiftX, desiredShiftX))
      : Math.max(-minX, Math.min(width - maxX, desiredShiftX));
  const shiftY =
    minShiftY <= maxShiftY
      ? Math.max(minShiftY, Math.min(maxShiftY, desiredShiftY))
      : Math.max(-minY, Math.min(height - maxY, desiredShiftY));
  if (shiftX === 0 && shiftY === 0) return nodes;

  return nodes.map((n) => ({
    ...n,
    gridX: n.gridX + shiftX,
    gridY: n.gridY + shiftY,
    centerX: n.centerX + shiftX,
    centerY: n.centerY + shiftY
  }));
}

export function embedPokemonTopology(
  graph: PokemonTopologyGraph,
  options?: OrthogonalEmbeddingOptions
): EmbeddedTopologyGraph {
  const width = options?.width ?? DEFAULT_EMBEDDING_MAP_WIDTH;
  const height = options?.height ?? DEFAULT_EMBEDDING_MAP_HEIGHT;
  const seed = options?.seed ?? graph.seed;
  const prng = createPRNG(seed);

  // 1. Compute orthogonal band grid
  const bandGrid = computeBandGrid(graph.nodes.length, width, height);

  // 2. Assign nodes to grid bands
  const assignments = assignNodesToBands(graph, bandGrid, prng);

  // 3. Calculate spatial footprints, vary city dimensions, and balance centering across canvas
  const rawNodes = embedNodes(graph, bandGrid, assignments, prng, width, height);
  const embeddedNodes = recenterEmbeddedNodes(rawNodes, width, height);
  const nodeMap = new Map<string, EmbeddedTopologyNode>();
  for (const n of embeddedNodes) nodeMap.set(n.id, n);

  // 4. Trace orthogonal corridors
  const corridors: EmbeddedCorridor[] = [];
  for (const edge of graph.edges) {
    corridors.push(traceCorridor(edge, nodeMap, embeddedNodes));
  }

  return {
    width,
    height,
    nodes: embeddedNodes,
    corridors,
    mainChainOrder: graph.mainChainOrder,
    macroArchetype: graph.macroArchetype,
    gridCols: bandGrid.cols,
    gridRows: bandGrid.rows,
    seed
  };
}

// ---------------------------------------------------------------------------
// Validation Helper (T2.6)
// ---------------------------------------------------------------------------

export interface EmbeddingValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
}

export function validateEmbeddedGraphInvariants(
  embedded: EmbeddedTopologyGraph
): EmbeddingValidationResult {
  const errors: string[] = [];

  // 1. All nodes within map bounds
  for (const n of embedded.nodes) {
    if (n.gridX < 0 || n.gridX + n.width > embedded.width) {
      errors.push(`Node ${n.id} exceeds horizontal bounds: [${n.gridX}, ${n.gridX + n.width}]`);
    }
    if (n.gridY < 0 || n.gridY + n.height > embedded.height) {
      errors.push(`Node ${n.id} exceeds vertical bounds: [${n.gridY}, ${n.gridY + n.height}]`);
    }
  }

  // 2. No node overlap
  for (let i = 0; i < embedded.nodes.length; i++) {
    for (let j = i + 1; j < embedded.nodes.length; j++) {
      const a = embedded.nodes[i]!;
      const b = embedded.nodes[j]!;

      const overlapX = a.gridX < b.gridX + b.width && a.gridX + a.width > b.gridX;
      const overlapY = a.gridY < b.gridY + b.height && a.gridY + a.height > b.gridY;

      if (overlapX && overlapY) {
        errors.push(`Nodes ${a.id} and ${b.id} overlap spatially`);
      }
    }
  }

  // 3. Strict corridor orthogonality (Rule 3: each segment is pure horizontal or pure vertical)
  for (const corridor of embedded.corridors) {
    if (corridor.kind === 'wormhole_tunnel') {
      if (corridor.waypoints.length !== 0) {
        errors.push(`Wormhole corridor ${corridor.id} must have 0 surface waypoints`);
      }
      continue;
    }

    if (corridor.waypoints.length < 2) {
      errors.push(`Corridor ${corridor.id} has fewer than 2 waypoints`);
      continue;
    }

    for (let i = 0; i < corridor.waypoints.length - 1; i++) {
      const p1 = corridor.waypoints[i]!;
      const p2 = corridor.waypoints[i + 1]!;

      const isHorizontal = p1.y === p2.y && p1.x !== p2.x;
      const isVertical = p1.x === p2.x && p1.y !== p2.y;

      if (!isHorizontal && !isVertical) {
        errors.push(
          `Corridor ${corridor.id} segment ${i} is diagonal: (${p1.x},${p1.y}) to (${p2.x},${p2.y})`
        );
      }
    }

    // Check 4-connected path continuity
    for (let i = 0; i < corridor.pathCells.length - 1; i++) {
      const c1 = corridor.pathCells[i]!;
      const c2 = corridor.pathCells[i + 1]!;
      const manhattan = Math.abs(c1.x - c2.x) + Math.abs(c1.y - c2.y);
      if (manhattan !== 1) {
        errors.push(
          `Corridor ${corridor.id} has broken 4-connectivity between cell ${i} and ${i + 1}`
        );
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}
