/**
 * src/logic/map/routePathfinding.ts
 *
 * A* PATHFINDING & TRAIL ROUTING ENGINE FOR PROCEDURAL MAPS
 *
 * Modularized from routeNetworkEngine.ts to satisfy the 1000-line SRP architecture limit.
 */

import type { POINode, RouteEdge, RouteWaypoint, RouteType } from '../../types/map/poiTypes.ts';
import type { ContinentMapResult } from './continentGenerator.ts';

const LAKE_BRIDGE_STEP_COST = 1.25;
const OCEAN_BRIDGE_STEP_COST = 3.5;
export const MAX_STAIR_LINK_DISTANCE = 35;
export const MAX_CAVE_TRAIL_DISTANCE = 80;
const PATH_DISCOUNT_COST = 0.6 as const;
const SAND_TRAVERSAL_COST = 1.4 as const;
const LAND_TURN_PENALTY_COST = 0.06 as const;
const TERRESTRIAL_MEANDER_COST = 2.8 as const;
const WIDE_MAP_TERRESTRIAL_MEANDER_COST = 5.6 as const;
const WIDE_MAP_MEANDER_THRESHOLD = 300 as const;
const MEANDER_ENDPOINT_CLEARANCE = 4 as const;
const MEANDER_WAVE_X_FREQ = 0.22 as const;
const MEANDER_WAVE_Y_FREQ = 0.16 as const;
const MEANDER_WAVE_Y_AMP = 2.2 as const;
const MEANDER_TILTED_PRIMARY_FREQ = 0.17 as const;
const MEANDER_TILTED_SHEAR_FREQ = 0.06 as const;
const BRIDGE_LANDING_PENALTY_COST = 8.0 as const;
const WATER_TURN_PENALTY_COST = 50.0 as const;
const WATER_SURF_TURN_PENALTY_COST = 0.15 as const;
const WATER_SURF_MEANDER_COST = 4.5 as const;
const WATER_SURF_WAVE_PRIMARY_FREQ = 0.13 as const;
const WATER_SURF_WAVE_SECONDARY_FREQ = 0.19 as const;
const WATER_SURF_WAVE_HALF_SCALE = 0.5 as const;
const WATER_SURF_SEED_SCALE = 0.17 as const;
const WATER_SURF_SEED_MOD = 100 as const;

export interface FindPathOptions {
  readonly waterMeanderSeed?: number;
}

function isPointInsideAnyExcludedZone(
  x: number,
  y: number,
  zones: readonly {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
  }[]
): boolean {
  for (const zone of zones) {
    if (x >= zone.x1 && x <= zone.x2 && y >= zone.y1 && y <= zone.y2) {
      return true;
    }
  }
  return false;
}

const INITIAL_HEAP_CAPACITY = 4096 as const;

/** Binary min-heap backed by growable typed arrays for O(log N) A* dispatch. */
class BinaryMinHeap {
  private keys: Int32Array = new Int32Array(INITIAL_HEAP_CAPACITY);
  private priorities: Float64Array = new Float64Array(INITIAL_HEAP_CAPACITY);
  private topPriority = Infinity;
  private count = 0;

  public push(key: number, priority: number): void {
    if (this.count === this.keys.length) {
      const nextCap = this.keys.length * 2;
      const nextKeys = new Int32Array(nextCap);
      const nextPrios = new Float64Array(nextCap);
      nextKeys.set(this.keys);
      nextPrios.set(this.priorities);
      this.keys = nextKeys;
      this.priorities = nextPrios;
    }
    let idx = this.count++;
    while (idx > 0) {
      const parent = (idx - 1) >> 1;
      const parentPrio = this.priorities[parent]!;
      if (parentPrio <= priority) break;
      this.keys[idx] = this.keys[parent]!;
      this.priorities[idx] = parentPrio;
      idx = parent;
    }
    this.keys[idx] = key;
    this.priorities[idx] = priority;
  }

  public popKey(): { readonly key: number; readonly priority: number } | undefined {
    if (this.count === 0) return undefined;
    const minKey = this.keys[0]!;
    this.topPriority = this.priorities[0]!;
    this.count--;
    if (this.count > 0) {
      const lastKey = this.keys[this.count]!;
      const lastPrio = this.priorities[this.count]!;
      let idx = 0;
      const half = this.count >> 1;
      while (idx < half) {
        let child = (idx << 1) + 1;
        let childPrio = this.priorities[child]!;
        const right = child + 1;
        if (right < this.count && this.priorities[right]! < childPrio) {
          child = right;
          childPrio = this.priorities[right]!;
        }
        if (lastPrio <= childPrio) break;
        this.keys[idx] = this.keys[child]!;
        this.priorities[idx] = childPrio;
        idx = child;
      }
      this.keys[idx] = lastKey;
      this.priorities[idx] = lastPrio;
    }
    return { key: minKey, priority: this.topPriority };
  }

  public get length(): number {
    return this.count;
  }
}

function isOceanWaterTerrain(terrain: string | undefined): boolean {
  return terrain === 'water' || terrain === 'water_deep';
}

export function computeOceanGrid(continentMap: ContinentMapResult): boolean[][] {
  const W = continentMap.width;
  const H = continentMap.height;
  const isOcean: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const queue: { x: number; y: number }[] = [];

  for (let x = 0; x < W; x++) {
    if (isOceanWaterTerrain(continentMap.cells[0]?.[x]?.terrain)) {
      isOcean[0]![x] = true;
      queue.push({ x, y: 0 });
    }
    if (isOceanWaterTerrain(continentMap.cells[H - 1]?.[x]?.terrain)) {
      isOcean[H - 1]![x] = true;
      queue.push({ x, y: H - 1 });
    }
  }
  for (let y = 0; y < H; y++) {
    if (isOceanWaterTerrain(continentMap.cells[y]?.[0]?.terrain) && !isOcean[y]![0]) {
      isOcean[y]![0] = true;
      queue.push({ x: 0, y });
    }
    if (isOceanWaterTerrain(continentMap.cells[y]?.[W - 1]?.terrain) && !isOcean[y]![W - 1]) {
      isOcean[y]![W - 1] = true;
      queue.push({ x: W - 1, y });
    }
  }

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++]!;
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0]
    ]) {
      const nx = curr.x + dx!;
      const ny = curr.y + dy!;
      if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
        if (!isOcean[ny]![nx] && isOceanWaterTerrain(continentMap.cells[ny]?.[nx]?.terrain)) {
          isOcean[ny]![nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  return isOcean;
}

function computeTerrestrialMeanderCost(
  nx: number,
  ny: number,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  mapWidth: number,
  cell: ContinentMapResult['cells'][number][number],
  alreadyCarved: boolean
): number {
  if (alreadyCarved) return PATH_DISCOUNT_COST;
  if (cell.terrain !== 'grass' && cell.terrain !== 'sand') return 1.0;

  const cost = cell.terrain === 'sand' ? SAND_TRAVERSAL_COST : 1.0;
  if (cell.elevation !== 0 || cell.isStair) return cost;

  const endDist = Math.min(
    Math.abs(nx - startX) + Math.abs(ny - startY),
    Math.abs(nx - goalX) + Math.abs(ny - goalY)
  );
  if (endDist <= MEANDER_ENDPOINT_CLEARANCE) return cost;

  if (mapWidth >= WIDE_MAP_MEANDER_THRESHOLD) {
    const tiltedU = nx * MEANDER_TILTED_PRIMARY_FREQ + ny * MEANDER_TILTED_SHEAR_FREQ;
    const tiltedV = ny * MEANDER_TILTED_PRIMARY_FREQ - nx * MEANDER_TILTED_SHEAR_FREQ;
    const hillElevation = Math.max(0, Math.sin(tiltedU) * Math.sin(tiltedV));
    return cost + hillElevation * WIDE_MAP_TERRESTRIAL_MEANDER_COST;
  }

  const ridgeWave = Math.sin(
    nx * MEANDER_WAVE_X_FREQ + Math.cos(ny * MEANDER_WAVE_Y_FREQ) * MEANDER_WAVE_Y_AMP
  );
  return cost + Math.abs(ridgeWave) * TERRESTRIAL_MEANDER_COST;
}

/**
 * Executes A* pathfinding between two points on the continent grid.
 * Respects stairs, cliffs, buildings, and water bodies.
 */
function computeWaterSurfMeanderCost(
  nx: number,
  ny: number,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  waterMeanderSeed: number
): number {
  const distStart = Math.abs(nx - startX) + Math.abs(ny - startY);
  const distGoal = Math.abs(nx - goalX) + Math.abs(ny - goalY);
  if (distStart <= MEANDER_ENDPOINT_CLEARANCE || distGoal <= MEANDER_ENDPOINT_CLEARANCE) {
    return 0;
  }
  const phase = (waterMeanderSeed % WATER_SURF_SEED_MOD) * WATER_SURF_SEED_SCALE;
  const rawWave =
    Math.sin(nx * WATER_SURF_WAVE_PRIMARY_FREQ + ny * WATER_SURF_WAVE_SECONDARY_FREQ + phase) +
    Math.cos(ny * WATER_SURF_WAVE_PRIMARY_FREQ - nx * WATER_SURF_WAVE_SECONDARY_FREQ + phase);
  const waveRidge = rawWave * WATER_SURF_WAVE_HALF_SCALE + 1.0;
  return waveRidge * WATER_SURF_MEANDER_COST;
}

export function findPathAStar(
  continentMap: ContinentMapResult,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  pathGrid: boolean[][],
  allowBridges: boolean,
  excludedNodeZones: readonly {
    readonly x1: number;
    readonly y1: number;
    readonly x2: number;
    readonly y2: number;
  }[],
  isOceanGrid?: readonly (readonly boolean[])[],
  allowSand = true,
  foreignPathBlocked?: readonly (readonly boolean[])[],
  foreignPathExemptRadius: number = FOREIGN_PATH_GATEWAY_EXEMPT_RADIUS,
  options?: FindPathOptions
): { path: RouteWaypoint[]; isWaterCrossing: boolean } | null {
  const W = continentMap.width;
  const H = continentMap.height;

  const totalCells = W * H;
  const key = (x: number, y: number): number => y * W + x;

  const gScore = new Float64Array(totalCells).fill(Infinity);
  const bestF = new Float64Array(totalCells).fill(Infinity);
  const cameFrom = new Int32Array(totalCells).fill(-1);

  const startKey = key(startX, startY);
  const goalKey = key(goalX, goalY);
  gScore[startKey] = 0;

  const openSet = new BinaryMinHeap();
  const startPrio = Math.hypot(startX - goalX, startY - goalY);
  bestF[startKey] = startPrio;
  openSet.push(startKey, startPrio);

  let reachedGoal = false;
  let hasWaterCrossing = false;

  while (openSet.length > 0) {
    const popped = openSet.popKey()!;
    const currKey = popped.key;
    if (popped.priority > bestF[currKey]!) continue;

    if (currKey === goalKey) {
      reachedGoal = true;
      break;
    }

    const currX = currKey % W;
    const currY = Math.floor(currKey / W);
    const currG = gScore[currKey]!;
    const prevKey = cameFrom[currKey]!;

    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0]
    ] as const) {
      const nx = currX + dx;
      const ny = currY + dy;

      if (nx < 1 || nx >= W - 1 || ny < 1 || ny >= H - 1) continue;

      // Check if target is inside an excluded settlement core (exempting exact start or goal endpoints)
      if (
        !(nx === goalX && ny === goalY) &&
        !(nx === startX && ny === startY) &&
        isPointInsideAnyExcludedZone(nx, ny, excludedNodeZones)
      ) {
        continue;
      }

      if (foreignPathBlocked?.[ny]?.[nx]) {
        const nearStart = Math.abs(nx - startX) + Math.abs(ny - startY) <= foreignPathExemptRadius;
        const nearGoal = Math.abs(nx - goalX) + Math.abs(ny - goalY) <= foreignPathExemptRadius;
        if (!nearStart && !nearGoal) {
          continue;
        }
      }

      const cell = continentMap.cells[ny]![nx]!;
      const curCell = continentMap.cells[currY]![currX]!;

      if (!allowSand && cell.terrain === 'sand') {
        continue;
      }

      // Traversing already existing path encourages merging into trunk routes;
      // uncarved flat terrain receives a gentle meander bias away from endpoints so long routes curve organically
      let cost = computeTerrestrialMeanderCost(
        nx,
        ny,
        startX,
        startY,
        goalX,
        goalY,
        W,
        cell,
        Boolean(pathGrid[ny]![nx])
      );

      // Check elevation difference and stairs
      const elevDiff = Math.abs(cell.elevation - curCell.elevation);
      if (elevDiff > 0) {
        // Can only cross elevation change if one of the cells is a stair!
        const isStairStep = cell.isStair || curCell.isStair;
        if (!isStairStep) {
          continue; // Blocked: cannot walk directly through steep cliff walls
        }
        cost = 1.0; // Moving up/down stairs has normal cost
      } else if (!cell.isWalkable && !cell.isStair) {
        // Blocked by cliff foot or steep mountain edge
        if (cell.terrain !== 'water' || !allowBridges) {
          continue;
        }
        const isLake = isOceanGrid ? !isOceanGrid[ny]?.[nx] : false;
        cost = isLake ? LAKE_BRIDGE_STEP_COST : OCEAN_BRIDGE_STEP_COST; // Inland lake bridges are scenic and cost-effective vs long land detours!
        if (options?.waterMeanderSeed !== undefined) {
          cost += computeWaterSurfMeanderCost(
            nx,
            ny,
            startX,
            startY,
            goalX,
            goalY,
            options.waterMeanderSeed
          );
        }
        hasWaterCrossing = true;
      }

      // Entering or exiting water represents building bridge landings / abutments
      if ((curCell.terrain === 'water') !== (cell.terrain === 'water')) {
        cost += BRIDGE_LANDING_PENALTY_COST;
      }

      // Penalize direction changes to favor straight orthogonal corridors over jagged staircase diagonals
      if (prevKey !== -1) {
        const prevX = prevKey % W;
        const prevY = Math.floor(prevKey / W);
        const prevDx = currX - prevX;
        const prevDy = currY - prevY;
        if (prevDx !== dx || prevDy !== dy) {
          const waterTurnPenalty =
            options?.waterMeanderSeed !== undefined
              ? WATER_SURF_TURN_PENALTY_COST
              : WATER_TURN_PENALTY_COST;
          // STRICT RECTILINEAR INVARIANT for bridges; gentle smooth turns for meandering Surf channels
          cost +=
            curCell.terrain === 'water' || cell.terrain === 'water'
              ? waterTurnPenalty
              : LAND_TURN_PENALTY_COST;
        }
      }

      const tentG = currG + cost;
      const neighborKey = key(nx, ny);

      if (tentG < gScore[neighborKey]!) {
        cameFrom[neighborKey] = currKey;
        gScore[neighborKey] = tentG;
        const hDist = Math.abs(nx - goalX) + Math.abs(ny - goalY);
        const fScore = tentG + hDist * 1.001;
        if (fScore < bestF[neighborKey]!) {
          bestF[neighborKey] = fScore;
        }
        openSet.push(neighborKey, fScore);
      }
    }
  }

  if (!reachedGoal) return null;

  // Reconstruct path
  const path: RouteWaypoint[] = [];
  let reconKey = goalKey;

  while (reconKey !== -1) {
    const cy = Math.floor(reconKey / W);
    const cx = reconKey % W;
    path.push({ x: cx, y: cy });
    if (reconKey === startKey) break;
    reconKey = cameFrom[reconKey] ?? -1;
  }
  path.reverse();

  return { path, isWaterCrossing: hasWaterCrossing };
}

const FOREIGN_PATH_GATEWAY_EXEMPT_RADIUS = 2 as const;
const PORT_HARBOR_SOUTH_EXCLUSION_ROWS = 3 as const;
const GATEWAY_CENTER_BLEND_WEIGHT = 0.75 as const;
const GATEWAY_TARGET_BLEND_WEIGHT = 0.25 as const;

/**
 * Picks the best perimeter gateway facing the target coordinate.
 */
function extractConnectedStreetComponent(
  startPt: { readonly x: number; readonly y: number },
  pointByKey: ReadonlyMap<string, { readonly x: number; readonly y: number }>,
  visited: Set<string>
): { readonly x: number; readonly y: number }[] {
  const comp: { readonly x: number; readonly y: number }[] = [startPt];
  for (let i = 0; i < comp.length; i++) {
    const cur = comp[i]!;
    for (const [dx, dy] of [
      [0, 1],
      [0, -1],
      [1, 0],
      [-1, 0]
    ] as const) {
      const nk = `${cur.x + dx}_${cur.y + dy}`;
      const nb = pointByKey.get(nk);
      if (nb && !visited.has(nk)) {
        visited.add(nk);
        comp.push(nb);
      }
    }
  }
  return comp;
}

function pickConnectedStreetGateway(
  node: POINode,
  targetX: number,
  targetY: number,
  maxStreetY?: number
): { x: number; y: number } | null {
  const streets = node.urbanLayout?.internalStreets;
  if (!streets || streets.length === 0) return null;

  const buildings = node.urbanLayout?.buildings ?? [];
  const valid = streets.filter(
    (s) =>
      !buildings.some(
        (b) => s.x >= b.x && s.x < b.x + b.width && s.y >= b.y && s.y < b.y + b.height
      )
  );
  if (valid.length === 0) return null;

  const pointByKey = new Map<string, { readonly x: number; readonly y: number }>();
  for (const pt of valid) {
    pointByKey.set(`${pt.x}_${pt.y}`, pt);
  }

  const visited = new Set<string>();
  let mainComponent: { readonly x: number; readonly y: number }[] = [];
  for (const seedPt of valid) {
    const sk = `${seedPt.x}_${seedPt.y}`;
    if (visited.has(sk)) continue;
    visited.add(sk);
    const comp = extractConnectedStreetComponent(seedPt, pointByKey, visited);
    if (comp.length > mainComponent.length) {
      mainComponent = comp;
    }
  }

  const filtered =
    maxStreetY !== undefined ? mainComponent.filter((pt) => pt.y <= maxStreetY) : mainComponent;
  const pool = filtered.length > 0 ? filtered : mainComponent;

  const centerX = node.gridX + Math.floor(node.footprint.width / 2);
  const centerY = node.gridY + Math.floor(node.footprint.height / 2);
  const clampedTargetX = Math.max(
    node.gridX,
    Math.min(node.gridX + node.footprint.width - 1, targetX)
  );
  const clampedTargetY = Math.max(
    node.gridY,
    Math.min(node.gridY + node.footprint.height - 1, targetY)
  );
  const anchorX =
    centerX * GATEWAY_CENTER_BLEND_WEIGHT + clampedTargetX * GATEWAY_TARGET_BLEND_WEIGHT;
  const anchorY =
    centerY * GATEWAY_CENTER_BLEND_WEIGHT + clampedTargetY * GATEWAY_TARGET_BLEND_WEIGHT;

  let best = pool[0]!;
  let bestDist = Infinity;
  for (const pt of pool) {
    const dist = Math.hypot(pt.x - anchorX, pt.y - anchorY);
    if (dist < bestDist) {
      bestDist = dist;
      best = pt;
    }
  }
  return { x: best.x, y: best.y };
}

export const getBestGateway = (
  node: POINode,
  targetX: number,
  targetY: number
): { x: number; y: number } => {
  if (node.type === 'cave_entrance') {
    return { x: node.gridX, y: node.gridY + 2 };
  }
  if (node.type === 'pokemon_league') {
    // Connect approach routes directly to the southern foot of the monumental central staircase
    const midX = node.gridX + Math.floor(node.footprint.width / 2);
    // Monumental stair is at y = node.gridY + plateauH - 1, and foot is at y + 2
    const plateauH = Math.max(10, node.footprint.height - 12);
    const stairFootY = node.gridY + plateauH + 1;
    return {
      x: midX,
      y: Math.min(node.gridY + node.footprint.height, stairFootY)
    };
  }
  if (node.type === 'route_gate') {
    const midX = node.gridX + Math.floor(node.footprint.width / 2);
    const midY = node.gridY + Math.floor(node.footprint.height / 2);
    return targetY <= midY
      ? { x: midX, y: Math.max(0, node.gridY - 1) }
      : { x: midX, y: node.gridY + node.footprint.height };
  }
  if (node.type === 'port_dock') {
    const facing = node.facing ?? 'south';
    if (facing === 'south') {
      return { x: node.gridX + 3, y: Math.max(0, node.gridY - 1) };
    }
    if (facing === 'north') {
      return { x: node.gridX + 3, y: node.gridY + node.footprint.height };
    }
    if (facing === 'east') {
      return { x: Math.max(0, node.gridX - 1), y: node.gridY + 3 };
    }
    return { x: node.gridX + node.footprint.width, y: node.gridY + 3 };
  }
  if (node.hasPort) {
    // Port cities have a marine harbor to the south; land routes enter via North, West, or East
    const portStreetGw = pickConnectedStreetGateway(
      node,
      targetX,
      targetY,
      node.gridY + node.footprint.height - PORT_HARBOR_SOUTH_EXCLUSION_ROWS
    );
    if (portStreetGw) return portStreetGw;
    const midX = node.gridX + Math.floor(node.footprint.width / 2);
    const midY = node.gridY + Math.floor(node.footprint.height / 2);
    if (targetY < node.gridY && Math.abs(targetX - midX) <= node.footprint.width) {
      return { x: midX, y: node.gridY };
    }
    if (targetX <= midX) {
      return { x: node.gridX, y: midY };
    }
    return { x: node.gridX + node.footprint.width - 1, y: midY };
  }
  if (node.gateways && node.gateways.length > 0) {
    let bestGw = node.gateways[0]!;
    let bestDist = Infinity;
    for (const gw of node.gateways) {
      const d = Math.hypot(gw.x - targetX, gw.y - targetY);
      if (d < bestDist) {
        bestDist = d;
        bestGw = gw;
      }
    }
    return { x: bestGw.x, y: bestGw.y };
  }
  const streetGw = pickConnectedStreetGateway(node, targetX, targetY);
  if (streetGw) return streetGw;
  return {
    x: node.gridX + Math.floor(node.footprint.width / 2),
    y: node.gridY + Math.floor(node.footprint.height / 2)
  };
};

export function rerouteIncidentEdges(
  continentMap: ContinentMapResult,
  nodes: readonly POINode[],
  edges: readonly RouteEdge[],
  movedNodeId: string,
  newGridX: number,
  newGridY: number,
  allowBridges = true
): {
  readonly updatedNodes: readonly POINode[];
  readonly updatedEdges: readonly RouteEdge[];
} {
  const targetNode = nodes.find((n) => n.id === movedNodeId);
  if (!targetNode) {
    return { updatedNodes: nodes, updatedEdges: edges };
  }

  const dx = newGridX - targetNode.gridX;
  const dy = newGridY - targetNode.gridY;

  // Clone target node with updated coordinates and translated gateways
  const updatedGateways = targetNode.gateways?.map((gw) => ({
    ...gw,
    x: gw.x + dx,
    y: gw.y + dy
  }));

  const updatedTargetNode: POINode = {
    ...targetNode,
    gridX: newGridX,
    gridY: newGridY,
    gateways: updatedGateways
  };

  const updatedNodes = nodes.map((n) => (n.id === movedNodeId ? updatedTargetNode : n));

  const excludedZones = updatedNodes.map((n) => ({
    id: n.id,
    x1: n.gridX + 1,
    y1: n.gridY + 1,
    x2: n.gridX + n.footprint.width - 2,
    y2: n.gridY + n.footprint.height - 2
  }));

  const pathGrid: boolean[][] = Array.from({ length: continentMap.height }, () =>
    Array(continentMap.width).fill(false)
  );
  const isOceanGrid = computeOceanGrid(continentMap);

  const updatedEdges: RouteEdge[] = [];

  for (const edge of edges) {
    const isIncident = edge.fromNodeId === movedNodeId || edge.toNodeId === movedNodeId;
    if (!isIncident) {
      updatedEdges.push(edge);
      continue;
    }

    const nodeA = updatedNodes.find((n) => n.id === edge.fromNodeId);
    const nodeB = updatedNodes.find((n) => n.id === edge.toNodeId);

    if (!nodeA || !nodeB) {
      updatedEdges.push(edge);
      continue;
    }

    const midBx = nodeB.gridX + Math.floor(nodeB.footprint.width / 2);
    const midBy = nodeB.gridY + Math.floor(nodeB.footprint.height / 2);
    const midAx = nodeA.gridX + Math.floor(nodeA.footprint.width / 2);
    const midAy = nodeA.gridY + Math.floor(nodeA.footprint.height / 2);

    const startPt = getBestGateway(nodeA, midBx, midBy);
    const goalPt = getBestGateway(nodeB, midAx, midAy);

    const activeExclusions = excludedZones.filter((z) => z.id !== nodeA.id && z.id !== nodeB.id);

    const pathResult = findPathAStar(
      continentMap,
      startPt.x,
      startPt.y,
      goalPt.x,
      goalPt.y,
      pathGrid,
      allowBridges,
      activeExclusions,
      isOceanGrid
    );

    if (pathResult && pathResult.path.length > 0) {
      let routeType: RouteType = 'road';
      if (nodeA.elevation > 0 || nodeB.elevation > 0) {
        routeType = 'mountain_pass';
      } else if (pathResult.isWaterCrossing) {
        routeType = 'water_crossing';
      }

      updatedEdges.push({
        ...edge,
        routeType,
        distance: pathResult.path.length,
        waypoints: pathResult.path,
        isWaterCrossing: pathResult.isWaterCrossing
      });
    } else {
      updatedEdges.push(edge);
    }
  }

  return {
    updatedNodes,
    updatedEdges
  };
}
