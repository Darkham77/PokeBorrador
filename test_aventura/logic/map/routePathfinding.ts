/**
 * src/logic/map/routePathfinding.ts
 *
 * A* PATHFINDING & TRAIL ROUTING ENGINE FOR PROCEDURAL MAPS
 *
 * Modularized from routeNetworkEngine.ts to satisfy the 1000-line SRP architecture limit.
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import type {
  POINode,
  RouteEdge,
  RouteWaypoint,
  RouteType
} from '../../types/map/poiTypes.ts';

export const LAKE_BRIDGE_STEP_COST = 1.25;
export const OCEAN_BRIDGE_STEP_COST = 3.5;
export const MAX_STAIR_LINK_DISTANCE = 35;
export const MAX_CAVE_TRAIL_DISTANCE = 80;

interface PriorityQueueItem {
  readonly x: number;
  readonly y: number;
  readonly priority: number;
}

class MinPriorityQueue {
  private readonly items: PriorityQueueItem[] = [];

  push(item: PriorityQueueItem): void {
    this.items.push(item);
    this.items.sort((a, b) => a.priority - b.priority);
  }

  pop(): PriorityQueueItem | undefined {
    return this.items.shift();
  }

  get length(): number {
    return this.items.length;
  }
}

export function computeOceanGrid(continentMap: ContinentMapResult): boolean[][] {
  const W = continentMap.width;
  const H = continentMap.height;
  const isOcean: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const queue: { x: number; y: number }[] = [];

  for (let x = 0; x < W; x++) {
    if (continentMap.cells[0]?.[x]?.terrain === 'water') {
      isOcean[0]![x] = true;
      queue.push({ x, y: 0 });
    }
    if (continentMap.cells[H - 1]?.[x]?.terrain === 'water') {
      isOcean[H - 1]![x] = true;
      queue.push({ x, y: H - 1 });
    }
  }
  for (let y = 0; y < H; y++) {
    if (continentMap.cells[y]?.[0]?.terrain === 'water' && !isOcean[y]![0]) {
      isOcean[y]![0] = true;
      queue.push({ x: 0, y });
    }
    if (continentMap.cells[y]?.[W - 1]?.terrain === 'water' && !isOcean[y]![W - 1]) {
      isOcean[y]![W - 1] = true;
      queue.push({ x: W - 1, y });
    }
  }

  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++]!;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = curr.x + dx!;
      const ny = curr.y + dy!;
      if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
        if (!isOcean[ny]![nx] && continentMap.cells[ny]![nx]!.terrain === 'water') {
          isOcean[ny]![nx] = true;
          queue.push({ x: nx, y: ny });
        }
      }
    }
  }

  return isOcean;
}

/**
 * Executes A* pathfinding between two points on the continent grid.
 * Respects stairs, cliffs, buildings, and water bodies.
 */
export function findPathAStar(
  continentMap: ContinentMapResult,
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  pathGrid: boolean[][],
  allowBridges: boolean,
  excludedNodeZones: { x1: number; y1: number; x2: number; y2: number }[],
  isOceanGrid?: readonly (readonly boolean[])[]
): { path: RouteWaypoint[]; isWaterCrossing: boolean } | null {
  const W = continentMap.width;
  const H = continentMap.height;

  const key = (x: number, y: number): number => y * W + x;

  const gScore = new Map<number, number>();
  const cameFrom = new Map<number, number>();

  const startKey = key(startX, startY);
  gScore.set(startKey, 0);

  const openSet = new MinPriorityQueue();
  openSet.push({ x: startX, y: startY, priority: Math.hypot(startX - goalX, startY - goalY) });

  let reachedGoal = false;
  let hasWaterCrossing = false;

  while (openSet.length > 0) {
    const curr = openSet.pop()!;
    if (curr.x === goalX && curr.y === goalY) {
      reachedGoal = true;
      break;
    }

    const currG = gScore.get(key(curr.x, curr.y)) ?? Infinity;

    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = curr.x + dx!;
      const ny = curr.y + dy!;

      if (nx < 1 || nx >= W - 1 || ny < 1 || ny >= H - 1) continue;

      // Check if target is inside an excluded settlement core (exempting exact start or goal endpoints)
      let inExcluded = false;
      if (!(nx === goalX && ny === goalY) && !(nx === startX && ny === startY)) {
        for (const zone of excludedNodeZones) {
          if (nx >= zone.x1 && nx <= zone.x2 && ny >= zone.y1 && ny <= zone.y2) {
            inExcluded = true;
            break;
          }
        }
      }
      if (inExcluded) continue;

      const cell = continentMap.cells[ny]![nx]!;
      const curCell = continentMap.cells[curr.y]![curr.x]!;

      // Determine step cost
      let cost = 1.0;

      // Traversing already existing path encourages merging into trunk routes
      if (pathGrid[ny]![nx]) {
        cost = 0.6;
      } else if (cell.terrain === 'sand') {
        cost = 1.4;
      }

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
        if (cell.terrain === 'water') {
          if (!allowBridges) continue;
          const isLake = isOceanGrid ? !isOceanGrid[ny]?.[nx] : false;
          cost = isLake ? LAKE_BRIDGE_STEP_COST : OCEAN_BRIDGE_STEP_COST; // Inland lake bridges are scenic and cost-effective vs long land detours!
          hasWaterCrossing = true;
        } else {
          continue; // Impassable wall
        }
      }

      // Entering or exiting water represents building bridge landings / abutments
      if ((curCell.terrain === 'water') !== (cell.terrain === 'water')) {
        cost += 8.0;
      }

      // Penalize direction changes to favor straight orthogonal corridors over jagged staircase diagonals
      const prevKey = cameFrom.get(key(curr.x, curr.y));
      if (prevKey !== undefined) {
        const prevX = prevKey % W;
        const prevY = Math.floor(prevKey / W);
        const prevDx = curr.x - prevX;
        const prevDy = curr.y - prevY;
        if (prevDx !== dx || prevDy !== dy) {
          // STRICT RECTILINEAR INVARIANT: Turning while on water is heavily penalized (Mandates 1 & 5)
          if (curCell.terrain === 'water' || cell.terrain === 'water') {
            cost += 50.0;
          } else {
            cost += 0.45;
          }
        }
      }

      const tentG = currG + cost;
      const neighborKey = key(nx, ny);

      if (tentG < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, key(curr.x, curr.y));
        gScore.set(neighborKey, tentG);
        const hDist = Math.abs(nx - goalX) + Math.abs(ny - goalY);
        const fScore = tentG + hDist * 1.001;
        openSet.push({ x: nx, y: ny, priority: fScore });
      }
    }
  }

  if (!reachedGoal) return null;

  // Reconstruct path
  const path: RouteWaypoint[] = [];
  let currKey: number | undefined = key(goalX, goalY);

  while (currKey !== undefined) {
    const cy = Math.floor(currKey / W);
    const cx = currKey % W;
    path.unshift({ x: cx, y: cy });
    if (cx === startX && cy === startY) break;
    currKey = cameFrom.get(currKey);
  }

  return { path, isWaterCrossing: hasWaterCrossing };
}

/**
 * Picks the best perimeter gateway facing the target coordinate.
 */
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
    // Port cities have a marine harbor to the south; land routes must enter via West, East, or North
    const midX = node.gridX + Math.floor(node.footprint.width / 2);
    const midY = node.gridY + Math.floor(node.footprint.height / 2);
    if (targetX <= midX) {
      return { x: node.gridX, y: midY };
    }
    if (targetX > midX) {
      return { x: node.gridX + node.footprint.width - 1, y: midY };
    }
    return { x: midX, y: node.gridY };
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

    const activeExclusions = excludedZones.filter(
      (z) => z.id !== nodeA.id && z.id !== nodeB.id
    );

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
