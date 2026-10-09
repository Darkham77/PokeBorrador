/**
 * src/logic/map/routeNetworkEngine.ts
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
import {
  resolveWaterCoastGrid,
  type ResolvedWaterMapResult,
  type WaterTerrainKind,
  BASE_GRASS_TILE
} from './waterAutotileEngine.ts';
import { sanitizePathGridWidth } from './pathAutotileEngine.ts';
import type {
  POINode,
  RouteEdge,
  RouteWaypoint,
  RouteType
} from '../../types/map/poiTypes.ts';

export interface RouteNetworkOptions {
  readonly maxConnectionDistance?: number;
  readonly allowBridges?: boolean;
}

export const MAX_CANONICAL_BRIDGE_SPAN = 6 as const;
export const CANONICAL_WATER_ROCK_OBSTACLE = 'poke_water_rocks_calm.png' as const;

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
import {
  computeOceanGrid,
  findPathAStar,
  getBestGateway,
  rerouteIncidentEdges,
  LAKE_BRIDGE_STEP_COST,
  OCEAN_BRIDGE_STEP_COST,
  MAX_STAIR_LINK_DISTANCE,
  MAX_CAVE_TRAIL_DISTANCE
} from './routePathfinding.ts';

export {
  computeOceanGrid,
  findPathAStar,
  getBestGateway,
  rerouteIncidentEdges,
  LAKE_BRIDGE_STEP_COST,
  OCEAN_BRIDGE_STEP_COST,
  MAX_STAIR_LINK_DISTANCE,
  MAX_CAVE_TRAIL_DISTANCE
};

import { buildRouteChain } from './routeChainTopology.ts';
export { buildRouteChain };

const MAX_ROUTE_GATE_DETOUR_TILES = 30 as const;
const MAX_PLATEAU_STAIR_PAIR_DISTANCE = 65 as const;

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
  const maxDist = options?.maxConnectionDistance ?? (Math.max(W, H) * 0.55);

  const pathGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const portDockBridgeKeys = new Set<string>();
  const maritimeRockObstacles: MaritimeRockObstacle[] = [];
  const isOceanGrid = computeOceanGrid(continentMap);
  const mutableTerrainMatrix = continentMap.terrainMatrix as WaterTerrainKind[][];

  const graphEdges = buildRouteChain(nodes, maxDist);
  const resolvedEdges: RouteEdge[] = [];

  // Combine all edge types into a unified processing list with route metadata
  interface GraphEdgeWithMeta {
    readonly fromIndex: number;
    readonly toIndex: number;
    readonly routeNumber?: number;
    readonly edgeRouteType: RouteType;
  }
  const allEdges: GraphEdgeWithMeta[] = [];

  // Splice route_gate checkpoints directly into the closest primary chain edges
  // so highways cleanly enter one gate and exit the other, rather than leaving dead-end stubs
  const splicedChain: { fromIndex: number; toIndex: number; distance: number }[] = [...graphEdges.chain];
  const handledStubs = new Set<number>();

  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i]!.type === 'route_gate') {
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
          { fromIndex: targetEdge.fromIndex, toIndex: i, distance: Math.hypot(nodes[targetEdge.fromIndex]!.gridX - gateNode.gridX, nodes[targetEdge.fromIndex]!.gridY - gateNode.gridY) },
          { fromIndex: i, toIndex: targetEdge.toIndex, distance: Math.hypot(gateNode.gridX - nodes[targetEdge.toIndex]!.gridX, gateNode.gridY - nodes[targetEdge.toIndex]!.gridY) }
        );
        handledStubs.add(i);
      }
    }
  }

  // Primary chain edges: numbered routes (Route 1, Route 2, ...)
  for (let i = 0; i < splicedChain.length; i++) {
    const e = splicedChain[i]!;
    allEdges.push({ fromIndex: e.fromIndex, toIndex: e.toIndex, routeNumber: i + 1, edgeRouteType: 'road' });
  }

  // Secondary stubs: trail connections to dungeons, caves, landmarks (excluding spliced gates)
  for (const stub of graphEdges.stubs) {
    if (!handledStubs.has(stub.secondaryIndex)) {
      allEdges.push({ fromIndex: stub.nearestPrimaryIndex, toIndex: stub.secondaryIndex, edgeRouteType: 'trail' });
    }
  }

  // Secondary loops: surf/bike shortcuts
  for (const loop of graphEdges.loops) {
    allEdges.push({ fromIndex: loop.fromIndex, toIndex: loop.toIndex, edgeRouteType: 'secondary' });
  }

  // Pre-calculate excluded settlement interior footprints
  const excludedZones: { id: string; x1: number; y1: number; x2: number; y2: number }[] = nodes.map((n) => ({
    id: n.id,
    x1: n.type === 'dungeon_forest' ? n.gridX : n.gridX + 1,
    y1: n.type === 'dungeon_forest' ? n.gridY : n.gridY + 1,
    x2: n.type === 'dungeon_forest' ? n.gridX + n.footprint.width - 1 : n.gridX + n.footprint.width - 2,
    y2: n.type === 'dungeon_forest' ? n.gridY + n.footprint.height - 1 : n.gridY + n.footprint.height - 2
  }));

  // Stamp pre-existing settlement internal streets onto pathGrid (excluding dungeon forests whose trails are internal)
  for (const node of nodes) {
    if (node.type !== 'dungeon_forest' && node.urbanLayout) {
      for (const st of node.urbanLayout.internalStreets) {
        if (st.y >= 0 && st.y < H && st.x >= 0 && st.x < W) {
          pathGrid[st.y]![st.x] = true;
        }
      }
    } else if (node.type === 'port_dock') {
      const facing = node.facing ?? 'south';
      const pierLength = Math.max(8, Math.max(node.footprint.width, node.footprint.height) + 2);
      if (facing === 'south') {
        const startY = node.gridY + node.footprint.height;
        const px = node.gridX + 2;
        for (let dy = 0; dy < pierLength; dy++) {
          const py = startY + dy;
          if (py >= 0 && py < H && px >= 0 && px + 2 < W) {
            if (
              continentMap.cells[py]?.[px]?.terrain === 'water' &&
              continentMap.cells[py]?.[px + 1]?.terrain === 'water' &&
              continentMap.cells[py]?.[px + 2]?.terrain === 'water'
            ) {
              bridgeGrid[py]![px] = true;
              bridgeGrid[py]![px + 1] = true;
              bridgeGrid[py]![px + 2] = true;
              portDockBridgeKeys.add(`${px}_${py}`);
              portDockBridgeKeys.add(`${px + 1}_${py}`);
              portDockBridgeKeys.add(`${px + 2}_${py}`);
            } else {
              break;
            }
          }
        }
      } else if (facing === 'north') {
        const startY = node.gridY - 1;
        const px = node.gridX + 2;
        let lastPy = startY;
        for (let dy = 0; dy < pierLength; dy++) {
          const py = startY - dy;
          if (py >= 0 && py < H && px >= 0 && px + 2 < W) {
            if (
              continentMap.cells[py]?.[px]?.terrain === 'water' &&
              continentMap.cells[py]?.[px + 1]?.terrain === 'water' &&
              continentMap.cells[py]?.[px + 2]?.terrain === 'water'
            ) {
              bridgeGrid[py]![px] = true;
              bridgeGrid[py]![px + 1] = true;
              bridgeGrid[py]![px + 2] = true;
              portDockBridgeKeys.add(`${px}_${py}`);
              portDockBridgeKeys.add(`${px + 1}_${py}`);
              portDockBridgeKeys.add(`${px + 2}_${py}`);
              lastPy = py;
            } else {
              break;
            }
          }
        }
        // T-dock landing pierhead at northern tip
        for (let r = lastPy; r <= Math.min(startY, lastPy + 1); r++) {
          for (let c = px - 2; c <= px + 4; c++) {
            if (c >= 0 && c < W && continentMap.cells[r]?.[c]?.terrain === 'water') {
              bridgeGrid[r]![c] = true;
              portDockBridgeKeys.add(`${c}_${r}`);
            }
          }
        }
      } else if (facing === 'east') {
        const startX = node.gridX + node.footprint.width;
        const py = node.gridY + 2;
        for (let dx = 0; dx < pierLength; dx++) {
          const px = startX + dx;
          if (py >= 0 && py + 2 < H && px >= 0 && px < W) {
            if (
              continentMap.cells[py]?.[px]?.terrain === 'water' &&
              continentMap.cells[py + 1]?.[px]?.terrain === 'water' &&
              continentMap.cells[py + 2]?.[px]?.terrain === 'water'
            ) {
              bridgeGrid[py]![px] = true;
              bridgeGrid[py + 1]![px] = true;
              bridgeGrid[py + 2]![px] = true;
              portDockBridgeKeys.add(`${px}_${py}`);
              portDockBridgeKeys.add(`${px}_${py + 1}`);
              portDockBridgeKeys.add(`${px}_${py + 2}`);
            } else {
              break;
            }
          }
        }
      } else if (facing === 'west') {
        const startX = node.gridX - 1;
        const py = node.gridY + 2;
        for (let dx = 0; dx < pierLength; dx++) {
          const px = startX - dx;
          if (py >= 0 && py + 2 < H && px >= 0 && px < W) {
            if (
              continentMap.cells[py]?.[px]?.terrain === 'water' &&
              continentMap.cells[py + 1]?.[px]?.terrain === 'water' &&
              continentMap.cells[py + 2]?.[px]?.terrain === 'water'
            ) {
              bridgeGrid[py]![px] = true;
              bridgeGrid[py + 1]![px] = true;
              bridgeGrid[py + 2]![px] = true;
              portDockBridgeKeys.add(`${px}_${py}`);
              portDockBridgeKeys.add(`${px}_${py + 1}`);
              portDockBridgeKeys.add(`${px}_${py + 2}`);
            } else {
              break;
            }
          }
        }
      }
    }
  }

  for (const ge of allEdges) {
    const nodeA = nodes[ge.fromIndex]!;
    const nodeB = nodes[ge.toIndex]!;

    const midBx = nodeB.gridX + Math.floor(nodeB.footprint.width / 2);
    const midBy = nodeB.gridY + Math.floor(nodeB.footprint.height / 2);
    const midAx = nodeA.gridX + Math.floor(nodeA.footprint.width / 2);
    const midAy = nodeA.gridY + Math.floor(nodeA.footprint.height / 2);

    const startPt = getBestGateway(nodeA, midBx, midBy);
    const goalPt = getBestGateway(nodeB, midAx, midAy);

    // Filter out source and target nodes from exclusion list, EXCEPT dungeon forests whose interior and walls remain impenetrable
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
      // Detect consecutive water crossings to distinguish narrow bridges (<= 4 cells) from Surf water routes
      let maxWaterRun = 0;
      let curWaterRun = 0;
      for (const pt of pathResult.path) {
        if (continentMap.cells[pt.y]![pt.x]!.terrain === 'water') {
          curWaterRun++;
          if (curWaterRun > maxWaterRun) maxWaterRun = curWaterRun;
        } else {
          curWaterRun = 0;
        }
      }

      // Maritime POIs: harbor port piers and short lake crossings (<= 12 tiles) use wooden boardwalk bridges.
      // Long open-ocean runs (> 12 tiles) become canonical Surf water routes.
      const connectsMaritimePOI =
        nodeA.type === 'water_landmark' ||
        nodeB.type === 'water_landmark' ||
        nodeA.type === 'port_dock' ||
        nodeB.type === 'port_dock';

      // Narrow crossings (<= 6 tiles) can have wooden boardwalk bridges.
      // Maritime POIs (port docks, water landmarks like lighthouses) allow boardwalk crossings up to 12 tiles.
      // Any crossing exceeding this across water is strictly a Surf water route / maritime ferry channel.
      const maxBridgeSpan = connectsMaritimePOI ? 12 : MAX_CANONICAL_BRIDGE_SPAN;
      const isSurfRoute = maxWaterRun > maxBridgeSpan;

      // Determine route type: prefer the pre-assigned edge type from chain topology,
      // but override with terrain-specific types when crossing mountains or water
      let routeType: RouteType = ge.edgeRouteType;
      if (nodeA.elevation > 0 || nodeB.elevation > 0) {
        routeType = 'mountain_pass';
      } else if (pathResult.isWaterCrossing || isSurfRoute) {
        routeType = 'water_crossing';
      }

      // 1. Process continuous water spans with multi-segment uniform 2-cell corridor width and 2x2 corner junctions
      let waterRunStart = -1;
      for (let i = 0; i <= pathResult.path.length; i++) {
        const isWater =
          i < pathResult.path.length &&
          continentMap.cells[pathResult.path[i]!.y]![pathResult.path[i]!.x]!.terrain === 'water';
        if (isWater && waterRunStart === -1) {
          waterRunStart = i;
        } else if (!isWater && waterRunStart !== -1) {
          const waterRunEnd = i - 1;
          const runLen = waterRunEnd - waterRunStart + 1;
          const waterPts: readonly RouteWaypoint[] = pathResult.path.slice(waterRunStart, waterRunEnd + 1);

          // Break waterPts into consecutive orthogonal segments (where all steps are purely horizontal or vertical)
          interface OrthoSegment {
            isHorizontal: boolean;
            pts: RouteWaypoint[];
          }
          const segments: OrthoSegment[] = [];
          if (waterPts.length === 1) {
            const pPrev = waterRunStart > 0 ? pathResult.path[waterRunStart - 1]! : waterPts[0]!;
            const pNext = waterRunEnd + 1 < pathResult.path.length ? pathResult.path[waterRunEnd + 1]! : waterPts[0]!;
            const isH = Math.abs(pNext.x - pPrev.x) >= Math.abs(pNext.y - pPrev.y);
            segments.push({ isHorizontal: isH, pts: [...waterPts] });
          } else {
            let segStart = 0;
            let curIsH = waterPts[1]!.y === waterPts[0]!.y;
            for (let si = 1; si < waterPts.length; si++) {
              const stepIsH = waterPts[si]!.y === waterPts[si - 1]!.y;
              if (stepIsH !== curIsH) {
                segments.push({
                  isHorizontal: curIsH,
                  pts: waterPts.slice(segStart, si)
                });
                segStart = si - 1; // Shared turn vertex
                curIsH = stepIsH;
              }
            }
            segments.push({
              isHorizontal: curIsH,
              pts: waterPts.slice(segStart)
            });
          }

          const isViableBridge = !isSurfRoute && runLen <= maxBridgeSpan && segments.length === 1;

          if (isViableBridge) {
            // Track companion offsets for corner 2x2 junction filling
            const segmentCompanions: { compX?: number; compY?: number }[] = [];

            for (let segIdx = 0; segIdx < segments.length; segIdx++) {
              const seg = segments[segIdx]!;
              if (seg.isHorizontal) {
                const fixedY = seg.pts[0]!.y;
                let countMinus = 0;
                let countPlus = 0;
                for (const p of seg.pts) {
                  if (fixedY - 1 >= 0 && bridgeGrid[fixedY - 1]![p.x]) countMinus++;
                  if (fixedY + 1 < H && bridgeGrid[fixedY + 1]![p.x]) countPlus++;
                }
                const minX = Math.min(...seg.pts.map((p) => p.x));
                const maxX = Math.max(...seg.pts.map((p) => p.x));

                let compY: number;
                if (countMinus > countPlus && fixedY - 1 >= 0) {
                  compY = fixedY - 1;
                } else if (countPlus > countMinus && fixedY + 1 < H) {
                  compY = fixedY + 1;
                } else {
                  const minusValidWater =
                    fixedY - 1 >= 0 &&
                    seg.pts.every((p) => continentMap.cells[fixedY - 1]?.[p.x]?.terrain === 'water');
                  const plusValidWater =
                    fixedY + 1 < H &&
                    seg.pts.every((p) => continentMap.cells[fixedY + 1]?.[p.x]?.terrain === 'water');

                  let minusLandScore = 0;
                  if (minusValidWater) {
                    if (minX - 1 >= 0 && continentMap.cells[fixedY - 1]?.[minX - 1]?.terrain !== 'water') minusLandScore++;
                    if (maxX + 1 < W && continentMap.cells[fixedY - 1]?.[maxX + 1]?.terrain !== 'water') minusLandScore++;
                  }

                  let plusLandScore = 0;
                  if (plusValidWater) {
                    if (minX - 1 >= 0 && continentMap.cells[fixedY + 1]?.[minX - 1]?.terrain !== 'water') plusLandScore++;
                    if (maxX + 1 < W && continentMap.cells[fixedY + 1]?.[maxX + 1]?.terrain !== 'water') plusLandScore++;
                  }

                  if (minusValidWater && plusValidWater) {
                    compY = plusLandScore > minusLandScore ? fixedY + 1 : (minusLandScore > plusLandScore ? fixedY - 1 : (fixedY + 1 < H ? fixedY + 1 : fixedY - 1));
                  } else if (plusValidWater) {
                    compY = fixedY + 1;
                  } else if (minusValidWater) {
                    compY = fixedY - 1;
                  } else {
                    compY = fixedY;
                  }
                }
                segmentCompanions.push({ compY });

                for (let x = minX; x <= maxX; x++) {
                  if (continentMap.cells[fixedY]?.[x]?.terrain === 'water') {
                    bridgeGrid[fixedY]![x] = true;
                  }
                  if (compY >= 0 && compY < H && continentMap.cells[compY]?.[x]?.terrain === 'water') {
                    bridgeGrid[compY]![x] = true;
                  }
                }

                // Guarantee solid 2-tile bridgehead landings at both shores
                const ensureHorizontalLanding = (landX: number): void => {
                  if (landX < 0 || landX >= W) return;
                  const cFixed = continentMap.cells[fixedY]?.[landX]?.terrain;
                  const cComp = continentMap.cells[compY]?.[landX]?.terrain;
                  const shoreTerr = (cFixed && cFixed !== 'water') ? cFixed : ((cComp && cComp !== 'water') ? cComp : 'sand');
                  for (const cy of [fixedY, compY]) {
                    if (continentMap.cells[cy]?.[landX]?.terrain === 'water') {
                      (continentMap.cells[cy]![landX]! as { terrain: string }).terrain = shoreTerr;
                      (continentMap.cells[cy]![landX]! as { isWalkable: boolean }).isWalkable = true;
                      mutableTerrainMatrix[cy]![landX] = shoreTerr;
                    }
                  }
                };
                for (const lx of [minX - 2, minX - 1, maxX + 1, maxX + 2]) {
                  ensureHorizontalLanding(lx);
                }
              } else {
                // Vertical segment
                const fixedX = seg.pts[0]!.x;
                let countMinus = 0;
                let countPlus = 0;
                for (const p of seg.pts) {
                  if (fixedX - 1 >= 0 && bridgeGrid[p.y]![fixedX - 1]) countMinus++;
                  if (fixedX + 1 < W && bridgeGrid[p.y]![fixedX + 1]) countPlus++;
                }
                const minY = Math.min(...seg.pts.map((p) => p.y));
                const maxY = Math.max(...seg.pts.map((p) => p.y));

                let compX: number;
                if (countMinus > countPlus && fixedX - 1 >= 0) {
                  compX = fixedX - 1;
                } else if (countPlus > countMinus && fixedX + 1 < W) {
                  compX = fixedX + 1;
                } else {
                  const minusValidWater =
                    fixedX - 1 >= 0 &&
                    seg.pts.every((p) => continentMap.cells[p.y]?.[fixedX - 1]?.terrain === 'water');
                  const plusValidWater =
                    fixedX + 1 < W &&
                    seg.pts.every((p) => continentMap.cells[p.y]?.[fixedX + 1]?.terrain === 'water');

                  let minusLandScore = 0;
                  if (minusValidWater) {
                    if (minY - 1 >= 0 && continentMap.cells[minY - 1]?.[fixedX - 1]?.terrain !== 'water') minusLandScore++;
                    if (maxY + 1 < H && continentMap.cells[maxY + 1]?.[fixedX - 1]?.terrain !== 'water') minusLandScore++;
                  }

                  let plusLandScore = 0;
                  if (plusValidWater) {
                    if (minY - 1 >= 0 && continentMap.cells[minY - 1]?.[fixedX + 1]?.terrain !== 'water') plusLandScore++;
                    if (maxY + 1 < H && continentMap.cells[maxY + 1]?.[fixedX + 1]?.terrain !== 'water') plusLandScore++;
                  }

                  if (minusValidWater && plusValidWater) {
                    compX = minusLandScore > plusLandScore ? fixedX - 1 : (plusLandScore > minusLandScore ? fixedX + 1 : (fixedX - 1 >= 0 ? fixedX - 1 : fixedX + 1));
                  } else if (minusValidWater) {
                    compX = fixedX - 1;
                  } else if (plusValidWater) {
                    compX = fixedX + 1;
                  } else {
                    compX = fixedX;
                  }
                }
                segmentCompanions.push({ compX });

                for (let y = minY; y <= maxY; y++) {
                  if (continentMap.cells[y]?.[fixedX]?.terrain === 'water') {
                    bridgeGrid[y]![fixedX] = true;
                  }
                  if (compX >= 0 && compX < W && continentMap.cells[y]?.[compX]?.terrain === 'water') {
                    bridgeGrid[y]![compX] = true;
                  }
                }

                // Guarantee solid 2-tile bridgehead landings at both shores
                const ensureVerticalLanding = (landY: number): void => {
                  if (landY < 0 || landY >= H) return;
                  const cFixed = continentMap.cells[landY]?.[fixedX]?.terrain;
                  const cComp = continentMap.cells[landY]?.[compX]?.terrain;
                  const shoreTerr = (cFixed && cFixed !== 'water') ? cFixed : ((cComp && cComp !== 'water') ? cComp : 'sand');
                  for (const cx of [fixedX, compX]) {
                    if (continentMap.cells[landY]?.[cx]?.terrain === 'water') {
                      (continentMap.cells[landY]![cx]! as { terrain: string }).terrain = shoreTerr;
                      (continentMap.cells[landY]![cx]! as { isWalkable: boolean }).isWalkable = true;
                      mutableTerrainMatrix[landY]![cx] = shoreTerr;
                    }
                  }
                };
                for (const ly of [minY - 2, minY - 1, maxY + 1, maxY + 2]) {
                  ensureVerticalLanding(ly);
                }
              }
            }

            // Fill 2x2 corner junctions at each turn between adjacent segments
            for (let segIdx = 0; segIdx < segments.length - 1; segIdx++) {
              const segA = segments[segIdx]!;
              const compA = segmentCompanions[segIdx]!;
              const compB = segmentCompanions[segIdx + 1]!;
              const turnPt = segA.pts[segA.pts.length - 1]!;

              const cY = compA.compY ?? compB.compY ?? turnPt.y;
              const cX = compA.compX ?? compB.compX ?? turnPt.x;

              const cornerCoords = [
                { x: turnPt.x, y: turnPt.y },
                { x: cX, y: turnPt.y },
                { x: turnPt.x, y: cY },
                { x: cX, y: cY }
              ];
              for (const pt of cornerCoords) {
                if (
                  pt.x >= 0 &&
                  pt.x < W &&
                  pt.y >= 0 &&
                  pt.y < H &&
                  continentMap.cells[pt.y]?.[pt.x]?.terrain === 'water'
                ) {
                  bridgeGrid[pt.y]![pt.x] = true;
                }
              }
            }

            // Shore Landing transitions at both ends
            const prevShore = waterRunStart > 0 ? pathResult.path[waterRunStart - 1] : null;
            if (prevShore && continentMap.cells[prevShore.y]?.[prevShore.x]?.terrain !== 'water') {
              pathGrid[prevShore.y]![prevShore.x] = true;
              const firstComp = segmentCompanions[0];
              if (firstComp?.compY !== undefined && firstComp.compY >= 0 && firstComp.compY < H) {
                if (continentMap.cells[firstComp.compY]?.[prevShore.x]?.terrain !== 'water') {
                  pathGrid[firstComp.compY]![prevShore.x] = true;
                }
              }
              if (firstComp?.compX !== undefined && firstComp.compX >= 0 && firstComp.compX < W) {
                if (continentMap.cells[prevShore.y]?.[firstComp.compX]?.terrain !== 'water') {
                  pathGrid[prevShore.y]![firstComp.compX] = true;
                }
              }
            }

            const nextShore = waterRunEnd + 1 < pathResult.path.length ? pathResult.path[waterRunEnd + 1] : null;
            if (nextShore && continentMap.cells[nextShore.y]?.[nextShore.x]?.terrain !== 'water') {
              pathGrid[nextShore.y]![nextShore.x] = true;
              const lastComp = segmentCompanions[segmentCompanions.length - 1];
              if (lastComp?.compY !== undefined && lastComp.compY >= 0 && lastComp.compY < H) {
                if (continentMap.cells[lastComp.compY]?.[nextShore.x]?.terrain !== 'water') {
                  pathGrid[lastComp.compY]![nextShore.x] = true;
                }
              }
              if (lastComp?.compX !== undefined && lastComp.compX >= 0 && lastComp.compX < W) {
                if (continentMap.cells[nextShore.y]?.[lastComp.compX]?.terrain !== 'water') {
                  pathGrid[nextShore.y]![lastComp.compX] = true;
                }
              }
            }
          } else {
            // Surf / Maritime route: place pairs of rock obstacles flanking the navigable corridor
            for (let idx = 0; idx < waterPts.length; idx += 3) {
              const pt: RouteWaypoint = waterPts[idx]!;
              const prev: RouteWaypoint = idx > 0 ? waterPts[idx - 1]! : pt;
              const next: RouteWaypoint = idx + 1 < waterPts.length ? waterPts[idx + 1]! : pt;
              const dx: number = next.x - prev.x;
              const dy: number = next.y - prev.y;
              const isH: boolean = Math.abs(dx) >= Math.abs(dy);

              const offsets: readonly { ox: number; oy: number }[] = isH ? [{ ox: 0, oy: -2 }, { ox: 0, oy: 2 }] : [{ ox: -2, oy: 0 }, { ox: 2, oy: 0 }];
              for (const off of offsets) {
                const rx: number = pt.x + off.ox;
                const ry: number = pt.y + off.oy;
                if (
                  rx >= 0 && rx < W && ry >= 0 && ry < H &&
                  continentMap.cells[ry]?.[rx]?.terrain === 'water' &&
                  !bridgeGrid[ry]?.[rx]
                ) {
                  maritimeRockObstacles.push({
                    x: rx,
                    y: ry,
                    prefabFile: CANONICAL_WATER_ROCK_OBSTACLE
                  });
                }
              }
            }
          }
          waterRunStart = -1;
        }
      }

      // 2. Stamp land paths (2-cell width strictly on land)
      for (let i = 0; i < pathResult.path.length; i++) {
        const pt = pathResult.path[i]!;

        if (continentMap.cells[pt.y]![pt.x]!.terrain !== 'water') {
          pathGrid[pt.y]![pt.x] = true;
          const prev = pathResult.path[i - 1] ?? pt;
          const next = pathResult.path[i + 1] ?? pt;
          const dx = next.x - prev.x;
          const dy = next.y - prev.y;
          const isHorizontal = Math.abs(dx) >= Math.abs(dy);

          if (isHorizontal) {
            const adjY =
              pt.y + 1 < H && continentMap.cells[pt.y + 1]![pt.x]!.terrain !== 'water'
                ? pt.y + 1
                : pt.y - 1 >= 0 && continentMap.cells[pt.y - 1]![pt.x]!.terrain !== 'water'
                  ? pt.y - 1
                  : -1;
            if (adjY !== -1) pathGrid[adjY]![pt.x] = true;
          } else {
            const adjX =
              pt.x + 1 < W && continentMap.cells[pt.y]![pt.x + 1]!.terrain !== 'water'
                ? pt.x + 1
                : pt.x - 1 >= 0 && continentMap.cells[pt.y]![pt.x - 1]!.terrain !== 'water'
                  ? pt.x - 1
                  : -1;
            if (adjX !== -1) pathGrid[pt.y]![adjX] = true;
          }
        }
      }

      // Stamp scenic single-sided fishing balconies on long bridge crossings (>= 6 water cells)
      // Exclude maritime POIs (water landmarks, lighthouses, docks) to guarantee clean approaches.
      if (!isSurfRoute && !connectsMaritimePOI) {
        let runStart = -1;
        const stampPlatformOnRun = (startIdx: number, endIdx: number): void => {
          const runLen = endIdx - startIdx + 1;
          if (runLen < 6) return;

          const midIdx = Math.floor((startIdx + endIdx) / 2);
          const p = pathResult.path[midIdx]!;
          const pPrev = pathResult.path[midIdx - 1]!;
          const isRunHorizontal = Math.abs(p.x - pPrev.x) >= Math.abs(p.y - pPrev.y);

          if (isRunHorizontal) {
            const stemY1 = p.y;
            const stemY2 = stemY1 + 1 < H && bridgeGrid[stemY1 + 1]![p.x]
              ? stemY1 + 1
              : stemY1 - 1 >= 0 && bridgeGrid[stemY1 - 1]![p.x]
                ? stemY1 - 1
                : stemY1;
            const maxY = Math.max(stemY1, stemY2);
            // Single-sided balcony on South rail if open water
            if (maxY + 1 < H && continentMap.cells[maxY + 1]?.[p.x]?.terrain === 'water') {
              bridgeGrid[maxY + 1]![p.x] = true;
            }
          } else {
            const stemX1 = p.x;
            const stemX2 = stemX1 + 1 < W && bridgeGrid[p.y]![stemX1 + 1]
              ? stemX1 + 1
              : stemX1 - 1 >= 0 && bridgeGrid[p.y]![stemX1 - 1]
                ? stemX1 - 1
                : stemX1;
            const maxX = Math.max(stemX1, stemX2);
            const minX = Math.min(stemX1, stemX2);
            // Single-sided balcony: prefer East (Route 12 style), fallback West
            if (maxX + 1 < W && continentMap.cells[p.y]?.[maxX + 1]?.terrain === 'water') {
              bridgeGrid[p.y]![maxX + 1] = true;
            } else if (minX - 1 >= 0 && continentMap.cells[p.y]?.[minX - 1]?.terrain === 'water') {
              bridgeGrid[p.y]![minX - 1] = true;
            }
          }
        };

        for (let i = 0; i < pathResult.path.length; i++) {
          const isW = continentMap.cells[pathResult.path[i]!.y]![pathResult.path[i]!.x]!.terrain === 'water';
          if (isW && runStart === -1) {
            runStart = i;
          } else if (!isW && runStart !== -1) {
            stampPlatformOnRun(runStart, i - 1);
            runStart = -1;
          }
        }
        if (runStart !== -1) {
          stampPlatformOnRun(runStart, pathResult.path.length - 1);
        }
      }

      // Ensure gateway endpoints on land receive path texture for seamless connection
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

  // 4. Connect Mountain Plateau Trails (Stairs to Road Network, Pairs of Stairs, & Cave Entrances)
  const stairs = continentMap.placedStairs;

  for (const stair of stairs) {
    // Stamp the stair's own walk corridor onto pathGrid
    for (let dy = -1; dy <= 2; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        const sy = stair.y + dy;
        const sx = stair.x + dx;
        if (sy >= 0 && sy < H && sx >= 0 && sx < W) {
          pathGrid[sy]![sx] = true;
        }
      }
    }

    // Connect lower landing (stair.y + 2) to the nearest regional trunk route on elevation 0
    const lowerX = stair.x;
    const lowerY = Math.min(H - 1, stair.y + 2);
    let nearestPathPoint: { x: number; y: number } | null = null;
    let minPathDist = Infinity;

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (pathGrid[y]![x] && (continentMap.heightmap[y]?.[x] ?? 0) === 0) {
          if (Math.abs(x - lowerX) <= 1 && Math.abs(y - lowerY) <= 1) continue;
          const d = Math.hypot(x - lowerX, y - lowerY);
          if (d < minPathDist && d <= MAX_STAIR_LINK_DISTANCE) {
            minPathDist = d;
            nearestPathPoint = { x, y };
          }
        }
      }
    }

    if (nearestPathPoint) {
      const link = findPathAStar(
        continentMap,
        lowerX,
        lowerY,
        nearestPathPoint.x,
        nearestPathPoint.y,
        pathGrid,
        false,
        []
      );
      if (link && link.path.length > 0) {
        for (const pt of link.path) {
          pathGrid[pt.y]![pt.x] = true;
        }
      }
    }
  }

  // Connect pairs of stairs across the mountain plateau
  for (let i = 0; i < stairs.length; i++) {
    for (let j = i + 1; j < stairs.length; j++) {
      const s1 = stairs[i]!;
      const s2 = stairs[j]!;
      const d = Math.hypot(s1.x - s2.x, s1.y - s2.y);
      if (d <= MAX_PLATEAU_STAIR_PAIR_DISTANCE) {
        const trail = findPathAStar(
          continentMap,
          s1.x,
          s1.y - 1,
          s2.x,
          s2.y - 1,
          pathGrid,
          false,
          []
        );
        if (trail && trail.path.length > 0) {
          for (const pt of trail.path) {
            pathGrid[pt.y]![pt.x] = true;
          }
        }
      }
    }
  }

  // Connect cave entrances to nearest stairs or road network
  for (const poi of nodes) {
    if (poi.type === 'cave_entrance') {
      const cx = poi.gridX;
      const cy = poi.gridY + 1;

      const doorElev = continentMap.heightmap[cy]?.[cx] ?? 0;

      if (doorElev > 0) {
        // Elevated cave on mountain plateau: connect to nearest upper stair landing
        let bestStair: { x: number; y: number } | null = null;
        let minD = Infinity;
        for (const st of stairs) {
          const d = Math.hypot(st.x - cx, st.y - cy);
          if (d < minD && d <= 50) {
            minD = d;
            bestStair = st;
          }
        }
        if (bestStair) {
          const caveTrail = findPathAStar(
            continentMap,
            cx,
            cy,
            bestStair.x,
            bestStair.y - 1,
            pathGrid,
            false,
            []
          );
          if (caveTrail && caveTrail.path.length > 0) {
            for (const pt of caveTrail.path) {
              pathGrid[pt.y]![pt.x] = true;
            }
          }
        }
      } else {
        // Ground-level cave entrance: connect doorstep directly to nearest existing road path or lower stair landing
        let bestTarget: { x: number; y: number } | null = null;
        let minD = Infinity;

        // Check nearest pathGrid point
        for (let r = 0; r < H; r++) {
          for (let c = 0; c < W; c++) {
            if (pathGrid[r]?.[c]) {
              const d = Math.hypot(c - cx, r - cy);
              if (d < minD && d <= MAX_CAVE_TRAIL_DISTANCE) {
                minD = d;
                bestTarget = { x: c, y: r };
              }
            }
          }
        }

        // Also check nearest lower stair landing if closer
        for (const st of stairs) {
          const d = Math.hypot(st.x - cx, (st.y + 2) - cy);
          if (d < minD && d <= MAX_CAVE_TRAIL_DISTANCE) {
            minD = d;
            bestTarget = { x: st.x, y: st.y + 2 };
          }
        }

        if (bestTarget) {
          const caveTrail = findPathAStar(
            continentMap,
            cx,
            cy,
            bestTarget.x,
            bestTarget.y,
            pathGrid,
            false,
            []
          );
          if (caveTrail && caveTrail.path.length > 0) {
            for (const pt of caveTrail.path) {
              pathGrid[pt.y]![pt.x] = true;
            }
          }
        }
      }
    }
  }

  // 5. Strictly isolate bridgeGrid to water cells only
  // Bridges must only cross open water. Dry land (grass, mountains, sand beaches)
  // must never contain bridgeGrid cells.
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (continentMap.cells[y]?.[x]?.terrain !== 'water') {
        bridgeGrid[y]![x] = false;
      }
    }
  }

  // 6. Guarantee zero dirt path tiles exist on sand across the entire regional map
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (continentMap.terrainMatrix[y]?.[x] === 'sand') {
        pathGrid[y]![x] = false;
      }
    }
  }

  // 6b. Sanitize 2-cell corridor width across all land paths (eliminating 1-cell slivers)
  const sanitizedPathGrid = sanitizePathGridWidth(pathGrid, continentMap.terrainMatrix);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (continentMap.terrainMatrix[y]?.[x] !== 'sand' && continentMap.cells[y]?.[x]?.terrain !== 'water') {
        pathGrid[y]![x] = sanitizedPathGrid[y]![x]!;
      } else {
        pathGrid[y]![x] = false;
      }
    }
  }

  // Stamp functional stair cells after width sanitization only if already connected to a route/trail
  if (continentMap.placedStairs) {
    for (const st of continentMap.placedStairs) {
      const isConnected = Boolean(
        pathGrid[st.y - 1]?.[st.x] || pathGrid[st.y - 1]?.[st.x + 1] ||
        pathGrid[st.y]?.[st.x] || pathGrid[st.y]?.[st.x + 1] ||
        pathGrid[st.y + 1]?.[st.x] || pathGrid[st.y + 1]?.[st.x + 1] ||
        pathGrid[st.y + 2]?.[st.x] || pathGrid[st.y + 2]?.[st.x + 1]
      );
      if (isConnected) {
        pathGrid[st.y]![st.x] = true;
        pathGrid[st.y]![st.x + 1] = true;
        pathGrid[st.y + 1]![st.x] = true;
        pathGrid[st.y + 1]![st.x + 1] = true;
      }
    }
  }

  // 6c. Prune orphan path fragments not connected to any POI or bridge
  const visitedPath: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
  const pathQueue: { x: number; y: number }[] = [];

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!pathGrid[y]![x]) continue;

      let nearSeed = false;
      for (const poi of nodes) {
        if (
          x >= poi.gridX - 1 &&
          x <= poi.gridX + poi.footprint.width &&
          y >= poi.gridY - 1 &&
          y <= poi.gridY + poi.footprint.height
        ) {
          nearSeed = true;
          break;
        }
      }

      if (!nearSeed) {
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          if (bridgeGrid[y + dy!]?.[x + dx!]) {
            nearSeed = true;
            break;
          }
        }
      }

      if (nearSeed) {
        visitedPath[y]![x] = true;
        pathQueue.push({ x, y });
      }
    }
  }

  let queueHead = 0;
  while (queueHead < pathQueue.length) {
    const curr = pathQueue[queueHead++]!;
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = curr.x + dx!;
      const ny = curr.y + dy!;
      if (nx >= 0 && nx < W && ny >= 0 && ny < H && pathGrid[ny]![nx] && !visitedPath[ny]![nx]) {
        visitedPath[ny]![nx] = true;
        pathQueue.push({ x: nx, y: ny });
      }
    }
  }

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (pathGrid[y]![x] && !visitedPath[y]![x]) {
        pathGrid[y]![x] = false;
      }
    }
  }

  // 6b. Prune dead-end stubs that do not terminate at gateways, stairs, or bridgeheads
  const preservedEndpoints = new Set<string>();
  for (const n of nodes) {
    for (const gw of n.gateways ?? []) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          preservedEndpoints.add(`${gw.x + dx}_${gw.y + dy}`);
        }
      }
    }
  }
  if (continentMap.placedStairs) {
    for (const st of continentMap.placedStairs) {
      for (let dy = -2; dy <= 3; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          preservedEndpoints.add(`${st.x + dx}_${st.y + dy}`);
        }
      }
    }
  }

  let prunedAny = true;
  let prunePasses = 0;
  while (prunedAny && prunePasses < 5) {
    prunedAny = false;
    prunePasses++;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!pathGrid[y]![x]) continue;
        if (preservedEndpoints.has(`${x}_${y}`)) continue;

        let neighborCount = 0;
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const nx = x + dx!;
          const ny = y + dy!;
          if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
            if (pathGrid[ny]![nx] || bridgeGrid[ny]?.[nx]) {
              neighborCount++;
            }
          }
        }

        if (neighborCount <= 1) {
          pathGrid[y]![x] = false;
          prunedAny = true;
        }
      }
    }
  }

  // 7. Re-resolve water autotile with bridgeGrid so beach landings use dry sand without foam gaps
  (continentMap as { resolvedWater: ResolvedWaterMapResult }).resolvedWater = resolveWaterCoastGrid(
    continentMap.terrainMatrix,
    bridgeGrid
  );
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const cell = continentMap.cells[y]![x]!;
      const wCell = continentMap.resolvedWater.cellDetails[y]?.[x];
      (cell as { terrain: string }).terrain = continentMap.terrainMatrix[y]![x]!;
      (cell as { waterRole: string | undefined }).waterRole = wCell?.role;
      if (wCell && wCell.terrain !== 'grass') {
        (cell as { layerStack: readonly string[] }).layerStack = [...wCell.layerStack];
      } else if (cell.terrain === 'grass') {
        (cell as { layerStack: readonly string[] }).layerStack = [BASE_GRASS_TILE];
      }
    }
  }

  // Final invariant: dirt paths strictly exist on dry land; bridges exist on water
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (continentMap.cells[y]?.[x]?.terrain === 'water') {
        pathGrid[y]![x] = false;
      }
    }
  }

  return {
    nodes,
    edges: resolvedEdges,
    pathGrid,
    bridgeGrid,
    portDockBridgeKeys,
    maritimeRockObstacles
  };
}
