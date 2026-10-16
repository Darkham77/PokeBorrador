/**
 * test_aventura/logic/map/routeNetworkEngine.ts
 *
 * PROCEDURAL ROUTE NETWORK & A* PATHFINDING ENGINE
 *
 * Features:
 *   1. Planar Graph Construction: MST + Delaunay/k-nearest loops for 100% connected POI networks.
 *   2. 2-Cell Wide A* Pathfinding:
 *      - Trunk path merging (lower cost on existing paths).
 *      - Elevation transition channeling: strictly paths through stairs when traversing mountain tiers.
 *      - Impassable barriers: steep cliff faces, deep ocean, and non-target POI footprints.
 *      - Dynamic bridge stamping: wooden bridges across narrow water gaps (<= 6 cells).
 *   3. Synchronizable with SVG route adapters and macroscopic region maps.
 */

import type { ContinentMapResult } from './continentGenerator.ts';
import type { WaterTerrainKind } from './waterAutotileEngine.ts';
import { stampPortDockPier } from './portDockPierEngine.ts';
import type { POINode, RouteEdge, RouteWaypoint, RouteType } from '../../types/map/poiTypes.ts';
import { computeOceanGrid, findPathAStar, getBestGateway } from './routePathfinding.ts';
export { computeOceanGrid };
import { buildRouteChain } from './routeChainTopology.ts';
export { buildRouteChain };
import { traceWaterSpansAndBridges } from './routeBridgeTracer.ts';
import { connectMountainPlateauTrails } from './mountainPlateauTrailEngine.ts';
import { finalizeRouteGrids } from './routeGridFinalizer.ts';

export interface RouteNetworkOptions {
  readonly maxConnectionDistance?: number;
  readonly allowBridges?: boolean;
}

export const MAX_CANONICAL_BRIDGE_SPAN = 6 as const;
const MAX_ROUTE_GATE_DETOUR_TILES = 30 as const;
const MARITIME_POI_BRIDGE_SPAN = 12 as const;
const DEFAULT_CONNECTION_DIST_FACTOR = 0.55 as const;

export interface MaritimeRockObstacle {
  readonly x: number;
  readonly y: number;
  readonly prefabFile: string;
}

export interface ResolvedRouteNetworkResult {
  readonly nodes: readonly POINode[];
  readonly edges: readonly RouteEdge[];
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly bridgeGrid: readonly (readonly boolean[])[];
  readonly portDockBridgeKeys?: ReadonlySet<string>;
  readonly bridgeShoreLandings?: ReadonlySet<string>;
  readonly maritimeRockObstacles?: readonly MaritimeRockObstacle[];
}

interface GraphEdgeWithMeta {
  readonly fromIndex: number;
  readonly toIndex: number;
  readonly routeNumber?: number;
  readonly edgeRouteType: RouteType;
}

function spliceRouteGatesIntoChain(
  nodes: readonly POINode[],
  splicedChain: { fromIndex: number; toIndex: number; distance: number }[],
  handledStubs: Set<number>
): void {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i]!.type !== 'route_gate') continue;
    const gateNode = nodes[i]!;
    let bestEdgeIdx = -1;
    let minDetour = Infinity;

    for (let eIdx = 0; eIdx < splicedChain.length; eIdx++) {
      const e = splicedChain[eIdx]!;
      const nodeA = nodes[e.fromIndex]!;
      const nodeB = nodes[e.toIndex]!;
      const distA = Math.hypot(nodeA.gridX - gateNode.gridX, nodeA.gridY - gateNode.gridY);
      const distB = Math.hypot(nodeB.gridX - gateNode.gridX, nodeB.gridY - gateNode.gridY);
      const origDist = Math.hypot(nodeA.gridX - nodeB.gridX, nodeA.gridY - nodeB.gridY);
      const detour = distA + distB - origDist;

      if (detour < minDetour && detour < MAX_ROUTE_GATE_DETOUR_TILES) {
        minDetour = detour;
        bestEdgeIdx = eIdx;
      }
    }

    if (bestEdgeIdx !== -1) {
      const targetEdge = splicedChain[bestEdgeIdx]!;
      splicedChain.splice(
        bestEdgeIdx,
        1,
        {
          fromIndex: targetEdge.fromIndex,
          toIndex: i,
          distance: Math.hypot(
            nodes[targetEdge.fromIndex]!.gridX - gateNode.gridX,
            nodes[targetEdge.fromIndex]!.gridY - gateNode.gridY
          )
        },
        {
          fromIndex: i,
          toIndex: targetEdge.toIndex,
          distance: Math.hypot(
            gateNode.gridX - nodes[targetEdge.toIndex]!.gridX,
            gateNode.gridY - nodes[targetEdge.toIndex]!.gridY
          )
        }
      );
      handledStubs.add(i);
    }
  }
}

function buildGraphEdgesWithGates(nodes: readonly POINode[], maxDist: number): GraphEdgeWithMeta[] {
  const graphEdges = buildRouteChain(nodes, maxDist);
  const allEdges: GraphEdgeWithMeta[] = [];
  const splicedChain = [...graphEdges.chain];
  const handledStubs = new Set<number>();

  spliceRouteGatesIntoChain(nodes, splicedChain, handledStubs);

  for (let i = 0; i < splicedChain.length; i++) {
    const e = splicedChain[i]!;
    allEdges.push({
      fromIndex: e.fromIndex,
      toIndex: e.toIndex,
      routeNumber: i + 1,
      edgeRouteType: 'road'
    });
  }

  for (const stub of graphEdges.stubs) {
    if (!handledStubs.has(stub.secondaryIndex)) {
      allEdges.push({
        fromIndex: stub.nearestPrimaryIndex,
        toIndex: stub.secondaryIndex,
        edgeRouteType: 'trail'
      });
    }
  }

  for (const loop of graphEdges.loops) {
    allEdges.push({ fromIndex: loop.fromIndex, toIndex: loop.toIndex, edgeRouteType: 'secondary' });
  }

  return allEdges;
}

interface SettlementStreetsParams {
  nodes: readonly POINode[];
  continentMap: ContinentMapResult;
  pathGrid: boolean[][];
  bridgeGrid: boolean[][];
  portDockBridgeKeys: Set<string>;
  W: number;
  H: number;
}

function stampPreExistingSettlementStreets({
  nodes,
  continentMap,
  pathGrid,
  bridgeGrid,
  portDockBridgeKeys,
  W,
  H
}: SettlementStreetsParams): void {
  for (const node of nodes) {
    if (node.type !== 'dungeon_forest' && node.urbanLayout) {
      for (const st of node.urbanLayout.internalStreets) {
        if (st.y >= 0 && st.y < H && st.x >= 0 && st.x < W) {
          pathGrid[st.y]![st.x] = true;
        }
      }
    } else if (node.type === 'port_dock') {
      stampPortDockPier({
        node,
        isWaterAt: (x, y) => continentMap.cells[y]?.[x]?.terrain === 'water',
        bridgeGrid,
        portDockBridgeKeys,
        width: W,
        height: H
      });
    }
  }
}

interface CorridorNeighborParams {
  pt: RouteWaypoint;
  isHorizontal: boolean;
  continentMap: ContinentMapResult;
  pathGrid: boolean[][];
  W: number;
  H: number;
}

function stampCorridorWidthNeighbor({
  pt,
  isHorizontal,
  continentMap,
  pathGrid,
  W,
  H
}: CorridorNeighborParams): void {
  if (isHorizontal) {
    if (pt.y + 1 < H && continentMap.cells[pt.y + 1]![pt.x]!.terrain !== 'water') {
      pathGrid[pt.y + 1]![pt.x] = true;
    } else if (pt.y - 1 >= 0 && continentMap.cells[pt.y - 1]![pt.x]!.terrain !== 'water') {
      pathGrid[pt.y - 1]![pt.x] = true;
    }
  } else {
    if (pt.x + 1 < W && continentMap.cells[pt.y]![pt.x + 1]!.terrain !== 'water') {
      pathGrid[pt.y]![pt.x + 1] = true;
    } else if (pt.x - 1 >= 0 && continentMap.cells[pt.y]![pt.x - 1]!.terrain !== 'water') {
      pathGrid[pt.y]![pt.x - 1] = true;
    }
  }
}

function stampLandCorridors(
  path: readonly RouteWaypoint[],
  continentMap: ContinentMapResult,
  pathGrid: boolean[][],
  W: number,
  H: number
): void {
  for (let i = 0; i < path.length; i++) {
    const pt = path[i]!;
    if (continentMap.cells[pt.y]![pt.x]!.terrain !== 'water') {
      pathGrid[pt.y]![pt.x] = true;
      const prev = path[i - 1] ?? pt;
      const next = path[i + 1] ?? pt;
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const isHorizontal = Math.abs(dx) >= Math.abs(dy);
      stampCorridorWidthNeighbor({ pt, isHorizontal, continentMap, pathGrid, W, H });
    }
  }
}

interface TraceAllRouteEdgesParams {
  allEdges: readonly GraphEdgeWithMeta[];
  nodes: readonly POINode[];
  continentMap: ContinentMapResult;
  pathGrid: boolean[][];
  bridgeGrid: boolean[][];
  mutableTerrainMatrix: WaterTerrainKind[][];
  maritimeRockObstacles: MaritimeRockObstacle[];
  isOceanGrid: readonly (readonly boolean[])[];
  allowBridges: boolean;
  W: number;
  H: number;
}

function traceAllRouteEdges({
  allEdges,
  nodes,
  continentMap,
  pathGrid,
  bridgeGrid,
  mutableTerrainMatrix,
  maritimeRockObstacles,
  isOceanGrid,
  allowBridges,
  W,
  H
}: TraceAllRouteEdgesParams): RouteEdge[] {
  const resolvedEdges: RouteEdge[] = [];
  const excludedZones = nodes.map((n) => ({
    id: n.id,
    x1: n.type === 'dungeon_forest' ? n.gridX : n.gridX + 1,
    y1: n.type === 'dungeon_forest' ? n.gridY : n.gridY + 1,
    x2:
      n.type === 'dungeon_forest'
        ? n.gridX + n.footprint.width - 1
        : n.gridX + n.footprint.width - 2,
    y2:
      n.type === 'dungeon_forest'
        ? n.gridY + n.footprint.height - 1
        : n.gridY + n.footprint.height - 2
  }));

  for (const ge of allEdges) {
    const nodeA = nodes[ge.fromIndex]!;
    const nodeB = nodes[ge.toIndex]!;

    const midBx = nodeB.gridX + Math.floor(nodeB.footprint.width / 2);
    const midBy = nodeB.gridY + Math.floor(nodeB.footprint.height / 2);
    const midAx = nodeA.gridX + Math.floor(nodeA.footprint.width / 2);
    const midAy = nodeA.gridY + Math.floor(nodeA.footprint.height / 2);

    const startPt = getBestGateway(nodeA, midBx, midBy);
    const goalPt = getBestGateway(nodeB, midAx, midAy);

    const activeExclusions = excludedZones.filter((z) => {
      if (z.id === nodeA.id) return nodeA.type === 'dungeon_forest';
      if (z.id === nodeB.id) return nodeB.type === 'dungeon_forest';
      return true;
    });

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
      let maxWaterRun = 0;
      let curWaterRun = 0;
      for (const pt of pathResult.path) {
        if (continentMap.cells[pt.y]![pt.x]!.terrain !== 'water') {
          curWaterRun = 0;
          continue;
        }
        curWaterRun++;
        if (curWaterRun > maxWaterRun) maxWaterRun = curWaterRun;
      }

      const connectsMaritimePOI =
        nodeA.type === 'water_landmark' ||
        nodeB.type === 'water_landmark' ||
        nodeA.type === 'port_dock' ||
        nodeB.type === 'port_dock';

      const maxBridgeSpan = connectsMaritimePOI
        ? MARITIME_POI_BRIDGE_SPAN
        : MAX_CANONICAL_BRIDGE_SPAN;
      const isSurfRoute = maxWaterRun > maxBridgeSpan;

      let routeType: RouteType = ge.edgeRouteType;
      if (nodeA.elevation > 0 || nodeB.elevation > 0) {
        routeType = 'mountain_pass';
      } else if (pathResult.isWaterCrossing || isSurfRoute) {
        routeType = 'water_crossing';
      }

      traceWaterSpansAndBridges({
        path: pathResult.path,
        continentMap,
        bridgeGrid,
        pathGrid,
        mutableTerrainMatrix,
        maritimeRockObstacles,
        isSurfRoute,
        maxBridgeSpan,
        connectsMaritimePOI,
        W,
        H
      });

      stampLandCorridors(pathResult.path, continentMap, pathGrid, W, H);

      if (continentMap.cells[startPt.y]?.[startPt.x]?.terrain !== 'water') {
        pathGrid[startPt.y]![startPt.x] = true;
      }
      if (continentMap.cells[goalPt.y]?.[goalPt.x]?.terrain !== 'water') {
        pathGrid[goalPt.y]![goalPt.x] = true;
      }

      resolvedEdges.push({
        id: `route_${nodeA.id}_to_${nodeB.id}`,
        fromNodeId: nodeA.id,
        toNodeId: nodeB.id,
        routeType,
        distance: pathResult.path.length,
        waypoints: pathResult.path,
        isWaterCrossing: pathResult.isWaterCrossing,
        routeNumber: ge.routeNumber
      });
    }
  }

  return resolvedEdges;
}

/**
 * Main entry point for generating the complete regional route network.
 */
export function generateRouteNetwork(
  continentMap: ContinentMapResult,
  nodes: readonly POINode[],
  options?: RouteNetworkOptions
): ResolvedRouteNetworkResult {
  const W = continentMap.width;
  const H = continentMap.height;
  const allowBridges = options?.allowBridges ?? true;
  const maxDist = options?.maxConnectionDistance ?? Math.max(W, H) * DEFAULT_CONNECTION_DIST_FACTOR;

  const pathGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const portDockBridgeKeys = new Set<string>();
  const maritimeRockObstacles: MaritimeRockObstacle[] = [];
  const isOceanGrid = computeOceanGrid(continentMap);
  const mutableTerrainMatrix = continentMap.terrainMatrix as WaterTerrainKind[][];

  const allEdges = buildGraphEdgesWithGates(nodes, maxDist);

  stampPreExistingSettlementStreets({
    nodes,
    continentMap,
    pathGrid,
    bridgeGrid,
    portDockBridgeKeys,
    W,
    H
  });

  const resolvedEdges = traceAllRouteEdges({
    allEdges,
    nodes,
    continentMap,
    pathGrid,
    bridgeGrid,
    mutableTerrainMatrix,
    maritimeRockObstacles,
    isOceanGrid,
    allowBridges,
    W,
    H
  });

  connectMountainPlateauTrails({
    continentMap,
    pathGrid,
    nodes,
    W,
    H
  });

  finalizeRouteGrids({
    continentMap,
    pathGrid,
    bridgeGrid,
    nodes,
    W,
    H
  });

  return {
    nodes,
    edges: resolvedEdges,
    pathGrid,
    bridgeGrid,
    portDockBridgeKeys,
    maritimeRockObstacles
  };
}
