/**
 * src/logic/map/continentGenerator.worker.ts
 *
 * WEB WORKER FOR ASYNCHRONOUS PROCEDURAL CONTINENT GENERATION & FAST A* REROUTING
 *
 * Responsibilities:
 *   1. Offloads heavy procedural pipeline (terrain, mountain autotiling, POIs, A* routing, wilderness)
 *      from the main UI thread to guarantee 60 FPS slider responsiveness.
 *   2. Performs targeted incident A* recalculations on POI drag-and-drop ('pointerup') without
 *      recomputing unaffected regional routes.
 *   3. Supports Zero-Copy Memory Transfer of raw grid buffers via transferable ArrayBuffer.
 *   4. Cleanly exports execution functions for 100% testability in Node/Vitest.
 */

import {
  generateContinentMap,
  computeTransitableGrid,
  type ContinentMapResult,
  type ContinentGeneratorOptions
} from './continentGenerator.ts';
import {
  placeRegionalPOIs,
  type POIPlacementOptions
} from './poiPlacementEngine.ts';
import { generatePokemonContinentalWorld } from './continent/continentalEngine.ts';
import {
  generateRouteNetwork,
  rerouteIncidentEdges,
  type RouteNetworkOptions,
  type ResolvedRouteNetworkResult
} from './routeNetworkEngine.ts';
import {
  generateWildernessLayer,
  type WildernessOptions,
  type WildernessLayerResult
} from './wildernessVegetationEngine.ts';
import type { POINode, RouteEdge } from '../../types/map/poiTypes.ts';

export interface RegionalGenerationOptions
  extends ContinentGeneratorOptions,
    POIPlacementOptions,
    RouteNetworkOptions,
    WildernessOptions {}

export interface RegionalGenerationPipelineResult {
  readonly continent: ContinentMapResult;
  readonly pois: readonly POINode[];
  readonly routeNetwork: ResolvedRouteNetworkResult;
  readonly wilderness: WildernessLayerResult;
  readonly rawBuffer?: ArrayBuffer;
}

export interface GenerateMapRequest {
  readonly type: 'GENERATE_REGIONAL_MAP';
  readonly jobId: number;
  readonly options: RegionalGenerationOptions;
}

export interface RerouteNodeRequest {
  readonly type: 'REROUTE_INCIDENT_NODE';
  readonly jobId: number;
  readonly movedNodeId: string;
  readonly newGridX: number;
  readonly newGridY: number;
  readonly continent: ContinentMapResult;
  readonly nodes: readonly POINode[];
  readonly edges: readonly RouteEdge[];
  readonly allowBridges?: boolean;
}

export type WorkerInboundMessage = GenerateMapRequest | RerouteNodeRequest;

export interface GenerationSuccessResponse {
  readonly type: 'GENERATION_COMPLETE';
  readonly jobId: number;
  readonly result: RegionalGenerationPipelineResult;
  readonly rawBuffer?: ArrayBuffer;
}

export interface RerouteSuccessResponse {
  readonly type: 'REROUTE_COMPLETE';
  readonly jobId: number;
  readonly movedNodeId: string;
  readonly updatedNodes: readonly POINode[];
  readonly updatedEdges: readonly RouteEdge[];
}

export interface WorkerErrorResponse {
  readonly type: 'ERROR';
  readonly jobId: number;
  readonly error: string;
}

export type WorkerOutboundResponse =
  | GenerationSuccessResponse
  | RerouteSuccessResponse
  | WorkerErrorResponse;

/**
 * Encodes a compact Uint8ClampedArray RGBA preview of the continental terrain and routes
 * for zero-copy memory transfer to the main UI thread.
 */
export function buildZeroCopyPreviewBuffer(
  continent: ContinentMapResult,
  pathGrid: readonly (readonly boolean[])[]
): ArrayBuffer {
  const W = continent.width;
  const H = continent.height;
  const buffer = new Uint8ClampedArray(W * H * 4);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const t = continent.terrainMatrix[y]?.[x];
      const elev = continent.heightmap[y]?.[x] ?? 0;
      const isPath = pathGrid[y]?.[x];

      if (isPath) {
        // Dirt path: golden sand/brown (#d4a373)
        buffer[idx] = 212;
        buffer[idx + 1] = 163;
        buffer[idx + 2] = 115;
        buffer[idx + 3] = 255;
      } else if (elev > 0) {
        // Mountain rock: check geological massif palette
        const pal = continent.geologicalClusters?.paletteMatrix[y]?.[x] ?? 'brown';
        if (pal === 'gray') {
          const tone = elev === 2 ? 140 : 170;
          buffer[idx] = tone;
          buffer[idx + 1] = tone;
          buffer[idx + 2] = tone;
        } else if (pal === 'volcanic') {
          buffer[idx] = elev === 2 ? 180 : 150;
          buffer[idx + 1] = 60;
          buffer[idx + 2] = 50;
        } else {
          const tone = elev === 2 ? 140 : 163;
          buffer[idx] = tone;
          buffer[idx + 1] = Math.floor(tone * 0.7);
          buffer[idx + 2] = Math.floor(tone * 0.5);
        }
        buffer[idx + 3] = 255;
      } else if (t === 'water' || t === 'water_deep') {
        // Ocean & Lake water: deep cyan blue (#3a86c8)
        buffer[idx] = 58;
        buffer[idx + 1] = 134;
        buffer[idx + 2] = 200;
        buffer[idx + 3] = 255;
      } else if (t === 'sand') {
        // Coast beach: warm yellow (#e9d8a6)
        buffer[idx] = 233;
        buffer[idx + 1] = 216;
        buffer[idx + 2] = 166;
        buffer[idx + 3] = 255;
      } else {
        // Continental plain: check macro biome and containment buffer
        const mBiome = continent.macroBiomes?.biomeGrid[y]?.[x];
        const isBuffer = continent.macroBiomes?.transitionBufferGrid[y]?.[x];
        if (isBuffer) {
          buffer[idx] = 190;
          buffer[idx + 1] = 150;
          buffer[idx + 2] = 100;
        } else if (mBiome === 'mint_highland') {
          buffer[idx] = 112;
          buffer[idx + 1] = 200;
          buffer[idx + 2] = 160;
        } else if (mBiome === 'arid_desert') {
          buffer[idx] = 223;
          buffer[idx + 1] = 177;
          buffer[idx + 2] = 91;
        } else if (mBiome === 'volcanic_plateau') {
          buffer[idx] = 158;
          buffer[idx + 1] = 74;
          buffer[idx + 2] = 59;
        } else if (mBiome === 'viridian_forest') {
          buffer[idx] = 56;
          buffer[idx + 1] = 102;
          buffer[idx + 2] = 65;
        } else {
          buffer[idx] = 88;
          buffer[idx + 1] = 129;
          buffer[idx + 2] = 87;
        }
        buffer[idx + 3] = 255;
      }
    }
  }

  return buffer.buffer;
}

const MIN_CONTINENTAL_WORLD_WIDTH = 400;

/**
 * Pure execution function for full regional generation pipeline.
 * Exported for 100% deterministic unit testing in Vitest.
 */
export function executeRegionalGenerationJob(
  options: RegionalGenerationOptions
): RegionalGenerationPipelineResult {
  if ((options.width ?? 0) >= MIN_CONTINENTAL_WORLD_WIDTH) {
    const worldResult = generatePokemonContinentalWorld(options);
    const edges: RouteEdge[] = worldResult.embedded.corridors.map((c) => ({
      id: c.id,
      fromNodeId: c.fromId,
      toNodeId: c.toId,
      routeType: c.kind === 'surf_route' ? 'water_crossing' : 'road',
      distance: c.pathCells.length,
      waypoints: c.waypoints,
      isWaterCrossing: c.kind === 'surf_route',
      isTransitCaveWarp: c.kind === 'wormhole_tunnel'
    }));

    const routeNetwork: ResolvedRouteNetworkResult = {
      nodes: worldResult.pois,
      edges,
      pathGrid: worldResult.pathGrid,
      bridgeGrid: worldResult.bridgeGrid
    };

    const rawBuffer = buildZeroCopyPreviewBuffer(worldResult.continent, worldResult.pathGrid);

    return {
      continent: worldResult.continent,
      pois: worldResult.pois,
      routeNetwork,
      wilderness: worldResult.wilderness,
      rawBuffer
    };
  }

  const continent = generateContinentMap(options);
  const pois = placeRegionalPOIs(continent, options);
  const routeNetwork = generateRouteNetwork(continent, pois, options);
  const transitableGrid = computeTransitableGrid(continent, routeNetwork.pathGrid, routeNetwork.bridgeGrid, pois);
  (continent as { transitableGrid?: readonly (readonly boolean[])[] }).transitableGrid = transitableGrid;
  const wilderness = generateWildernessLayer(continent, pois, routeNetwork.pathGrid, { ...options, transitableGrid });
  const rawBuffer = buildZeroCopyPreviewBuffer(continent, routeNetwork.pathGrid);

  return {
    continent,
    pois,
    routeNetwork,
    wilderness,
    rawBuffer
  };
}

/**
 * Pure execution function for localized incident A* rerouting.
 * Exported for 100% deterministic unit testing in Vitest.
 */
export function executeRerouteJob(
  req: Omit<RerouteNodeRequest, 'type'>
): {
  readonly updatedNodes: readonly POINode[];
  readonly updatedEdges: readonly RouteEdge[];
} {
  return rerouteIncidentEdges(
    req.continent,
    req.nodes,
    req.edges,
    req.movedNodeId,
    req.newGridX,
    req.newGridY,
    req.allowBridges ?? true
  );
}

// ---------------------------------------------------------------------------
interface DedicatedWorkerScope {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<WorkerInboundMessage>) => void) | null;
}

const workerScope: DedicatedWorkerScope | null =
  typeof self !== 'undefined' && typeof self.postMessage === 'function'
    ? (self as DedicatedWorkerScope)
    : null;

if (workerScope) {
  workerScope.onmessage = (event: MessageEvent<WorkerInboundMessage>): void => {
    const msg = event.data;
    if (!msg || !msg.type) return;

    try {
      if (msg.type === 'GENERATE_REGIONAL_MAP') {
        const result = executeRegionalGenerationJob(msg.options);
        const rawBuffer = result.rawBuffer;

        const response: GenerationSuccessResponse = {
          type: 'GENERATION_COMPLETE',
          jobId: msg.jobId,
          result,
          rawBuffer
        };

        if (rawBuffer) {
          workerScope.postMessage(response, [rawBuffer]);
        } else {
          workerScope.postMessage(response);
        }
      } else if (msg.type === 'REROUTE_INCIDENT_NODE') {
        const rerouteResult = executeRerouteJob(msg);
        const response: RerouteSuccessResponse = {
          type: 'REROUTE_COMPLETE',
          jobId: msg.jobId,
          movedNodeId: msg.movedNodeId,
          updatedNodes: rerouteResult.updatedNodes,
          updatedEdges: rerouteResult.updatedEdges
        };
        workerScope.postMessage(response);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorResponse: WorkerErrorResponse = {
        type: 'ERROR',
        jobId: msg.jobId,
        error: errorMessage
      };
      workerScope.postMessage(errorResponse);
    }
  };
}
