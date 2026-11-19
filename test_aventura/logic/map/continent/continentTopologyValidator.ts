/**
 * test_aventura/logic/map/continent/continentTopologyValidator.ts
 *
 * PURE CONTINENTAL TOPOLOGY & BARRIER INTEGRITY VALIDATOR
 *
 * Verifies post-generation invariants across Pokémon continental regions:
 *   1. Positive reachability & route_gate doorway alignment (`pathGrid` passes through doorway).
 *   2. Negative isolation (blocking direct neighbors & route gates prevents walking around
 *      through beaches, deserts, cliffs, or city flanks to non-adjacent settlements).
 *   3. Hermetic border containment (no walkable or surfable path escapes to x=0/W-1 or y=0/H-1).
 *   4. Zero maritime rocks spawned inside inland freshwater lakes.
 *   5. Zero autotile defects across mountain, water, path, and macro-biome layers.
 */

import type { POINode, RouteEdge } from '../../../types/map/poiTypes.ts';
import type { PokemonTopologyGraph } from '../../../types/map/pokemonGraphTypes.ts';
import { floodFillGrid, type GridPoint } from '../../utils/gridBfsUtils.ts';
import { scanContinentAutotileDefects } from '../autotileDefectScanner.ts';
import type { ContinentMapResult } from '../continentGenerator.ts';
import type { MaritimeRockObstacle } from '../routeNetworkEngine.ts';
import { computeOceanGrid } from '../routePathfinding.ts';
import {
  IMPASSABLE_WILDERNESS_PROP_TYPES,
  isMountainCliffCell
} from '../wildernessBoundarySealing.ts';
import type { WildernessLayerResult } from '../wildernessVegetationEngine.ts';

const SETTLEMENT_POI_TYPES: ReadonlySet<POINode['type']> = new Set<POINode['type']>([
  'town',
  'city',
  'metropolis'
]);

const MAX_TRUNK_BLOCKED_ROWS = 2 as const;
const POI_SEAL_MARGIN_MIN_OFFSET = -2 as const;
const POI_SEAL_MARGIN_MAX_OFFSET = 1 as const;
const FENCE_PREFAB_SUBSTRING = 'fence' as const;

export interface TopologyCorridorRef {
  readonly fromId: string;
  readonly toId: string;
  readonly fromNodeId?: string;
  readonly toNodeId?: string;
  readonly kind: string;
}

export interface TopologyValidationInput {
  readonly continent: ContinentMapResult;
  readonly pois: readonly POINode[];
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly bridgeGrid: readonly (readonly boolean[])[];
  readonly wilderness: WildernessLayerResult;
  readonly maritimeRockObstacles?: readonly MaritimeRockObstacle[];
  readonly graph?: PokemonTopologyGraph;
  readonly edges?: readonly RouteEdge[];
  readonly embedded?: { readonly corridors: readonly TopologyCorridorRef[] };
}

export interface TopologyValidationReport {
  readonly ok: boolean;
  readonly autotileDefectCount: number;
  readonly borderEscapes: readonly GridPoint[];
  readonly maritimeBorderEscapes: readonly GridPoint[];
  readonly lakeMaritimeRockCoords: readonly GridPoint[];
  readonly misalignedGateIds: readonly string[];
  readonly bypassViolations: readonly string[];
  readonly disconnectedPairs: readonly string[];
}

function isWaterTile(terrain: string | undefined): boolean {
  return terrain === 'water' || terrain === 'water_deep';
}

function isBorderTile(x: number, y: number, width: number, height: number): boolean {
  return x === 0 || y === 0 || x === width - 1 || y === height - 1;
}

function createFalseGrid(width: number, height: number): boolean[][] {
  return Array.from({ length: height }, () => Array<boolean>(width).fill(false));
}

function isImpassableProp(type: string, prefabFile: string): boolean {
  return IMPASSABLE_WILDERNESS_PROP_TYPES.has(type) || prefabFile.includes(FENCE_PREFAB_SUBSTRING);
}

function markBlockedRect(
  blocked: boolean[][],
  startX: number,
  startY: number,
  rectW: number,
  rectH: number,
  width: number,
  height: number
): void {
  const maxY = Math.min(height - 1, startY + rectH - 1);
  const maxX = Math.min(width - 1, startX + rectW - 1);
  for (let y = Math.max(0, startY); y <= maxY; y++) {
    for (let x = Math.max(0, startX); x <= maxX; x++) {
      blocked[y]![x] = true;
    }
  }
}

function buildWalkableBlockedGrid(input: TopologyValidationInput): boolean[][] {
  const { continent, pois, bridgeGrid, wilderness } = input;
  const { width, height } = continent;
  const blocked = createFalseGrid(width, height);
  const stairSet = new Set(continent.placedStairs.map((s) => `${s.x}_${s.y}`));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const terrain = continent.terrainMatrix[y]?.[x];
      if (isWaterTile(terrain) && !bridgeGrid[y]?.[x]) {
        blocked[y]![x] = true;
        continue;
      }
      if (isMountainCliffCell(continent, x, y, stairSet.has(`${x}_${y}`))) {
        blocked[y]![x] = true;
      }
    }
  }

  for (const poi of pois) {
    for (const b of poi.urbanLayout?.buildings ?? []) {
      markBlockedRect(blocked, b.x, b.y, b.width, b.height, width, height);
    }
    if (poi.type === 'route_gate') {
      // Checkpoint gatehouses have an open central 2-cell interior archway recorded in internalStreets.
      for (const st of poi.urbanLayout?.internalStreets ?? []) {
        if (st.y >= 0 && st.y < height && st.x >= 0 && st.x < width) {
          blocked[st.y]![st.x] = false;
        }
      }
    }
    for (const prop of poi.urbanLayout?.props ?? []) {
      if (
        isImpassableProp(prop.type, prop.prefabFile) &&
        prop.y >= 0 &&
        prop.y < height &&
        prop.x >= 0 &&
        prop.x < width
      ) {
        blocked[prop.y]![prop.x] = true;
      }
    }
  }

  for (const tree of wilderness.trees) {
    const trunkRows = Math.min(MAX_TRUNK_BLOCKED_ROWS, tree.height);
    markBlockedRect(blocked, tree.x, tree.y, tree.width, trunkRows, width, height);
  }

  for (const prop of wilderness.props) {
    if (
      isImpassableProp(prop.type, prop.prefabFile) &&
      prop.y >= 0 &&
      prop.y < height &&
      prop.x >= 0 &&
      prop.x < width
    ) {
      blocked[prop.y]![prop.x] = true;
    }
  }

  return blocked;
}

function findPoiWalkableSeed(
  poi: POINode,
  blocked: readonly (readonly boolean[])[],
  width: number,
  height: number
): GridPoint | null {
  for (const st of poi.urbanLayout?.internalStreets ?? []) {
    if (st.x >= 0 && st.x < width && st.y >= 0 && st.y < height && !blocked[st.y]![st.x]) {
      return { x: st.x, y: st.y };
    }
  }
  const maxY = Math.min(height - 1, poi.gridY + poi.footprint.height - 1);
  const maxX = Math.min(width - 1, poi.gridX + poi.footprint.width - 1);
  for (let y = Math.max(0, poi.gridY); y <= maxY; y++) {
    for (let x = Math.max(0, poi.gridX); x <= maxX; x++) {
      if (!blocked[y]![x]) {
        return { x, y };
      }
    }
  }
  return null;
}

function collectAdjacencyMap(
  pois: readonly POINode[],
  graph?: PokemonTopologyGraph,
  edges?: readonly RouteEdge[],
  embedded?: { readonly corridors: readonly TopologyCorridorRef[] }
): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const poi of pois) {
    adj.set(poi.id, new Set<string>());
  }
  if (edges && edges.length > 0) {
    for (const edge of edges) {
      if (edge.isWaterCrossing || edge.isTransitCaveWarp) continue;
      adj.get(edge.fromNodeId)?.add(edge.toNodeId);
      adj.get(edge.toNodeId)?.add(edge.fromNodeId);
    }
    return adj;
  }
  if (embedded?.corridors) {
    for (const corridor of embedded.corridors) {
      if (corridor.kind === 'surf_route' || corridor.kind === 'wormhole_tunnel') continue;
      const fromId = corridor.fromNodeId ?? corridor.fromId;
      const toId = corridor.toNodeId ?? corridor.toId;
      adj.get(fromId)?.add(toId);
      adj.get(toId)?.add(fromId);
    }
    return adj;
  }
  if (graph) {
    for (const edge of graph.edges) {
      if (edge.kind === 'surf_route' || edge.kind === 'wormhole_tunnel') continue;
      adj.get(edge.fromId)?.add(edge.toId);
      adj.get(edge.toId)?.add(edge.fromId);
    }
  }
  return adj;
}

function collectDirectNonGateNeighbors(
  startPoiId: string,
  poiById: ReadonlyMap<string, POINode>,
  adj: ReadonlyMap<string, ReadonlySet<string>>
): Set<string> {
  const directNeighbors = new Set<string>();
  const visitedGates = new Set<string>([startPoiId]);

  for (const nbId of adj.get(startPoiId) ?? []) {
    const nbPoi = poiById.get(nbId);
    if (!nbPoi) continue;
    if (nbPoi.type === 'route_gate') {
      visitedGates.add(nbId);
      for (const beyondId of adj.get(nbId) ?? []) {
        if (!visitedGates.has(beyondId)) {
          directNeighbors.add(beyondId);
        }
      }
    } else {
      directNeighbors.add(nbId);
    }
  }

  return directNeighbors;
}

function collectBorderPointsFromVisited(
  visited: readonly (readonly boolean[])[],
  width: number,
  height: number
): GridPoint[] {
  const escapes: GridPoint[] = [];
  for (let x = 0; x < width; x++) {
    if (visited[0]![x]) escapes.push({ x, y: 0 });
    if (height > 1 && visited[height - 1]![x]) escapes.push({ x, y: height - 1 });
  }
  for (let y = 1; y < height - 1; y++) {
    if (visited[y]![0]) escapes.push({ x: 0, y });
    if (width > 1 && visited[y]![width - 1]) escapes.push({ x: width - 1, y });
  }
  return escapes;
}

function checkPositiveReachability(
  settlementPois: readonly POINode[],
  blocked: readonly (readonly boolean[])[],
  adj: ReadonlyMap<string, ReadonlySet<string>>,
  width: number,
  height: number
): string[] {
  const disconnectedPairs: string[] = [];
  const poiById = new Map<string, POINode>(settlementPois.map((p) => [p.id, p]));
  const seedByPoi = new Map<string, GridPoint>();
  for (const poi of settlementPois) {
    const pt = findPoiWalkableSeed(poi, blocked, width, height);
    if (pt) seedByPoi.set(poi.id, pt);
  }

  for (const [fromId, neighbors] of adj.entries()) {
    const fromPoi = poiById.get(fromId);
    const fromSeed = seedByPoi.get(fromId);
    if (!fromPoi || !fromSeed) continue;

    const visited = createFalseGrid(width, height);
    visited[fromSeed.y]![fromSeed.x] = true;
    floodFillGrid([fromSeed], visited, width, height, (nx, ny) => !blocked[ny]![nx]);

    for (const toId of neighbors) {
      if (fromId >= toId) continue;
      const toSeed = seedByPoi.get(toId);
      if (toSeed && !visited[toSeed.y]![toSeed.x]) {
        disconnectedPairs.push(`${fromId}!->${toId}`);
      }
    }
  }

  return disconnectedPairs;
}

function checkLandBordersAndBypasses(
  input: TopologyValidationInput,
  blocked: readonly (readonly boolean[])[],
  adj: ReadonlyMap<string, ReadonlySet<string>>
): { readonly borderEscapes: GridPoint[]; readonly bypassViolations: string[] } {
  const { continent, pois } = input;
  const { width, height } = continent;
  const settlementPois = pois.filter((p) => SETTLEMENT_POI_TYPES.has(p.type));
  if (settlementPois.length === 0) {
    return { borderEscapes: [], bypassViolations: [] };
  }

  const poiById = new Map<string, POINode>(pois.map((p) => [p.id, p]));
  const borderEscapeSet = new Map<string, GridPoint>();
  const bypassViolations: string[] = [];

  for (const startPoi of settlementPois) {
    const startSeed = findPoiWalkableSeed(startPoi, blocked, width, height);
    if (!startSeed) {
      bypassViolations.push(`${startPoi.id}_no_walkable_seed`);
      continue;
    }

    const directNeighbors = collectDirectNonGateNeighbors(startPoi.id, poiById, adj);
    const sealedBlocked = blocked.map((row) => [...row]);
    for (const poi of pois) {
      if (!directNeighbors.has(poi.id) && poi.type !== 'route_gate') continue;
      markBlockedRect(
        sealedBlocked,
        poi.gridX + POI_SEAL_MARGIN_MIN_OFFSET,
        poi.gridY + POI_SEAL_MARGIN_MIN_OFFSET,
        poi.footprint.width + POI_SEAL_MARGIN_MAX_OFFSET - POI_SEAL_MARGIN_MIN_OFFSET + 1,
        poi.footprint.height + POI_SEAL_MARGIN_MAX_OFFSET - POI_SEAL_MARGIN_MIN_OFFSET + 1,
        width,
        height
      );
    }

    const visited = createFalseGrid(width, height);
    visited[startSeed.y]![startSeed.x] = true;
    floodFillGrid([startSeed], visited, width, height, (nx, ny) => !sealedBlocked[ny]![nx]);

    for (const pt of collectBorderPointsFromVisited(visited, width, height)) {
      borderEscapeSet.set(`${pt.x}_${pt.y}`, pt);
    }

    for (const otherPoi of settlementPois) {
      if (otherPoi.id === startPoi.id || directNeighbors.has(otherPoi.id)) continue;
      const otherSeed = findPoiWalkableSeed(otherPoi, blocked, width, height);
      if (otherSeed && visited[otherSeed.y]![otherSeed.x]) {
        bypassViolations.push(`${startPoi.id}->${otherPoi.id}`);
      }
    }
  }

  return {
    borderEscapes: [...borderEscapeSet.values()],
    bypassViolations
  };
}

function collectCoastalSurfSeeds(
  continent: ContinentMapResult,
  oceanMask: readonly (readonly boolean[])[],
  rockSet: ReadonlySet<string>
): GridPoint[] {
  const { width, height, terrainMatrix } = continent;
  const seeds: GridPoint[] = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (!oceanMask[y]?.[x] || terrainMatrix[y]?.[x] !== 'water' || rockSet.has(`${x}_${y}`)) {
        continue;
      }
      const touchesLand =
        !isWaterTile(terrainMatrix[y - 1]?.[x]) ||
        !isWaterTile(terrainMatrix[y + 1]?.[x]) ||
        !isWaterTile(terrainMatrix[y]?.[x - 1]) ||
        !isWaterTile(terrainMatrix[y]?.[x + 1]);
      if (touchesLand) {
        seeds.push({ x, y });
      }
    }
  }

  return seeds;
}

function validateMaritimeBarrierAndLakes(input: TopologyValidationInput): {
  readonly maritimeBorderEscapes: GridPoint[];
  readonly lakeMaritimeRockCoords: GridPoint[];
} {
  const { continent, maritimeRockObstacles = [] } = input;
  const { width, height, terrainMatrix } = continent;
  const oceanMask = computeOceanGrid(continent);

  const lakeMaritimeRockCoords: GridPoint[] = [];
  const rockSet = new Set<string>();
  for (const rock of maritimeRockObstacles) {
    rockSet.add(`${rock.x}_${rock.y}`);
    if (
      rock.y >= 0 &&
      rock.y < height &&
      rock.x >= 0 &&
      rock.x < width &&
      !oceanMask[rock.y]![rock.x]
    ) {
      lakeMaritimeRockCoords.push({ x: rock.x, y: rock.y });
    }
  }

  const surfSeeds = collectCoastalSurfSeeds(continent, oceanMask, rockSet);
  if (surfSeeds.length === 0) {
    return { maritimeBorderEscapes: [], lakeMaritimeRockCoords };
  }

  const visited = createFalseGrid(width, height);
  const validSeeds: GridPoint[] = [];
  for (const seed of surfSeeds) {
    if (!visited[seed.y]![seed.x] && !isBorderTile(seed.x, seed.y, width, height)) {
      visited[seed.y]![seed.x] = true;
      validSeeds.push(seed);
    }
  }

  floodFillGrid(
    validSeeds,
    visited,
    width,
    height,
    (nx, ny) => terrainMatrix[ny]?.[nx] === 'water' && !rockSet.has(`${nx}_${ny}`)
  );

  return {
    maritimeBorderEscapes: collectBorderPointsFromVisited(visited, width, height),
    lakeMaritimeRockCoords
  };
}

function findMisalignedGateIds(
  pois: readonly POINode[],
  pathGrid: readonly (readonly boolean[])[]
): string[] {
  const misaligned: string[] = [];
  for (const poi of pois) {
    if (poi.type !== 'route_gate') continue;
    const streets = poi.urbanLayout?.internalStreets ?? [];
    const hasPathThroughDoor = streets.some((st) => Boolean(pathGrid[st.y]?.[st.x]));
    if (streets.length === 0 || !hasPathThroughDoor) {
      misaligned.push(poi.id);
    }
  }
  return misaligned;
}

/**
 * Evaluates full topological, maritime, and autotile invariants for a generated continent.
 */
export function validateContinentalWorldTopology(
  input: TopologyValidationInput
): TopologyValidationReport {
  const blocked = buildWalkableBlockedGrid(input);
  const adj = collectAdjacencyMap(input.pois, input.graph, input.edges, input.embedded);
  const settlementPois = input.pois.filter((p) => SETTLEMENT_POI_TYPES.has(p.type));
  const disconnectedPairs = checkPositiveReachability(
    settlementPois,
    blocked,
    adj,
    input.continent.width,
    input.continent.height
  );
  const { borderEscapes, bypassViolations } = checkLandBordersAndBypasses(input, blocked, adj);
  const { maritimeBorderEscapes, lakeMaritimeRockCoords } = validateMaritimeBarrierAndLakes(input);
  const misalignedGateIds = findMisalignedGateIds(input.pois, input.pathGrid);

  const scan = scanContinentAutotileDefects({
    continent: input.continent,
    pathGrid: input.pathGrid,
    bridgeGrid: input.bridgeGrid,
    pois: input.pois
  });

  const ok =
    scan.totalDefects === 0 &&
    borderEscapes.length === 0 &&
    maritimeBorderEscapes.length === 0 &&
    lakeMaritimeRockCoords.length === 0 &&
    misalignedGateIds.length === 0 &&
    bypassViolations.length === 0 &&
    disconnectedPairs.length === 0;

  return {
    ok,
    autotileDefectCount: scan.totalDefects,
    borderEscapes,
    maritimeBorderEscapes,
    lakeMaritimeRockCoords,
    misalignedGateIds,
    bypassViolations,
    disconnectedPairs
  };
}
