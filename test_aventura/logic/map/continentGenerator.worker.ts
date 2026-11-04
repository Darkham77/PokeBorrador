/**
 * test_aventura/logic/map/continentGenerator.worker.ts
 *
 * WEB WORKER FOR ASYNCHRONOUS PROCEDURAL CONTINENT GENERATION, PRESETS, HEALING & FAST A* REROUTING
 *
 * Responsibilities:
 *   1. Offloads heavy procedural pipeline (terrain, mountain autotiling, POIs, A* routing, wilderness,
 *      defect scanning, and packed binary tile compilation) from the main UI thread.
 *   2. Executes canonical Kanto/Johto preset generation and full-map Auto-Sanar off-main-thread.
 *   3. Performs targeted incident A* recalculations on POI drag-and-drop ('pointerup').
 *   4. Transfers raw RGBA preview buffers and Int32Array tile blit buffers via zero-copy Transferable.
 */

import type { HealingDomain } from '../../types/map/autotileHealingTypes.ts';
import type {
  ContinentGenerationPhase,
  PackedMapBlitPayload
} from '../../types/map/continentTypes.ts';
import type { POINode, RouteEdge } from '../../types/map/poiTypes.ts';
import { scanContinentAutotileDefects } from './autotileDefectScanner.ts';
import { healAllContinentDefects } from './autotileHealingEngine.ts';
import {
  buildZeroCopyPreviewBuffer,
  compilePackedMapBlitBuffer,
  type RegionalGenerationPipelineResult
} from './canvasTileRenderer.ts';
import {
  buildCanonicalRegionMap,
  type CanonicalPresetId
} from './continent/canonicalRegionPresets.ts';
import { generatePokemonContinentalWorld } from './continent/continentalEngine.ts';
import {
  generateContinentMap,
  type ContinentGeneratorOptions,
  type ContinentMapResult
} from './continentGenerator.ts';
import { placeRegionalPOIs, type POIPlacementOptions } from './poiPlacementEngine.ts';
import {
  generateRouteNetwork,
  type ResolvedRouteNetworkResult,
  type RouteNetworkOptions
} from './routeNetworkEngine.ts';
import { rerouteIncidentEdges } from './routePathfinding.ts';
import { computeTransitableGrid } from './transitableGridEngine.ts';
import {
  generateWildernessLayer,
  type WildernessLayerResult,
  type WildernessOptions
} from './wildernessVegetationEngine.ts';

export interface RegionalGenerationOptions
  extends ContinentGeneratorOptions, POIPlacementOptions, RouteNetworkOptions, WildernessOptions {}

export interface FullWorkerGenerationOutput {
  readonly result: RegionalGenerationPipelineResult;
  readonly detectedDefectCount: number;
  readonly packedBlit: PackedMapBlitPayload;
}

export interface HealAllWorkerJobInput {
  readonly continent: ContinentMapResult;
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly bridgeGrid?: readonly (readonly boolean[])[];
  readonly pois?: readonly POINode[];
  readonly wilderness?: WildernessLayerResult | null;
  readonly domain?: HealingDomain;
}

export interface HealAllWorkerJobOutput {
  readonly continent: ContinentMapResult;
  readonly pathGrid: readonly (readonly boolean[])[];
  readonly detectedDefectCount: number;
  readonly repairedCount: number;
  readonly rawBuffer: ArrayBuffer;
  readonly packedBlit: PackedMapBlitPayload;
}

export interface GenerateMapRequest {
  readonly type: 'GENERATE_REGIONAL_MAP';
  readonly jobId: number;
  readonly options: RegionalGenerationOptions;
}

export interface LoadCanonicalPresetRequest {
  readonly type: 'LOAD_CANONICAL_PRESET';
  readonly jobId: number;
  readonly presetId: CanonicalPresetId;
  readonly seed: number;
}

export interface HealAllDefectsRequest {
  readonly type: 'HEAL_ALL_DEFECTS';
  readonly jobId: number;
  readonly input: HealAllWorkerJobInput;
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

export type WorkerInboundMessage =
  | GenerateMapRequest
  | LoadCanonicalPresetRequest
  | HealAllDefectsRequest
  | RerouteNodeRequest;

export interface GenerationProgressResponse {
  readonly type: 'GENERATION_PROGRESS';
  readonly jobId: number;
  readonly phase: ContinentGenerationPhase;
  readonly percent: number;
}

export interface GenerationSuccessResponse {
  readonly type: 'GENERATION_COMPLETE';
  readonly jobId: number;
  readonly result: RegionalGenerationPipelineResult;
  readonly rawBuffer?: ArrayBuffer;
  readonly detectedDefectCount: number;
  readonly packedBlit: PackedMapBlitPayload;
}

export interface HealAllSuccessResponse {
  readonly type: 'HEAL_ALL_COMPLETE';
  readonly jobId: number;
  readonly output: HealAllWorkerJobOutput;
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
  | GenerationProgressResponse
  | GenerationSuccessResponse
  | HealAllSuccessResponse
  | RerouteSuccessResponse
  | WorkerErrorResponse;

const MIN_CONTINENTAL_WORLD_WIDTH = 400;
const PROGRESS_PERCENT_SCULPTING = 15;
const PROGRESS_PERCENT_SCANNING = 70;
const PROGRESS_PERCENT_COMPILING_TILES = 88;

export type WorkerProgressCallback = (phase: ContinentGenerationPhase, percent: number) => void;

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
  const transitableGrid = computeTransitableGrid(
    continent,
    routeNetwork.pathGrid,
    routeNetwork.bridgeGrid,
    pois
  );
  (continent as { transitableGrid?: readonly (readonly boolean[])[] }).transitableGrid =
    transitableGrid;
  const wilderness = generateWildernessLayer(continent, pois, routeNetwork.pathGrid, {
    ...options,
    transitableGrid
  });
  const rawBuffer = buildZeroCopyPreviewBuffer(continent, routeNetwork.pathGrid);

  return {
    continent,
    pois,
    routeNetwork,
    wilderness,
    rawBuffer
  };
}

function finalizeWorkerPipelineOutput(
  result: RegionalGenerationPipelineResult,
  onProgress?: WorkerProgressCallback
): FullWorkerGenerationOutput {
  onProgress?.('scanning', PROGRESS_PERCENT_SCANNING);
  const defectReport = scanContinentAutotileDefects({
    continent: result.continent,
    pathGrid: result.routeNetwork.pathGrid,
    bridgeGrid: result.routeNetwork.bridgeGrid,
    pois: result.pois
  });

  onProgress?.('compiling_tiles', PROGRESS_PERCENT_COMPILING_TILES);
  const packedBlit = compilePackedMapBlitBuffer(
    result.continent,
    result.pois,
    result.routeNetwork.pathGrid,
    result.routeNetwork.bridgeGrid,
    result.wilderness
  );

  return {
    result,
    detectedDefectCount: defectReport.totalDefects,
    packedBlit
  };
}

/**
 * Executes regional generation plus off-main-thread defect scanning and binary tile compilation.
 */
export function executeFullWorkerGeneration(
  options: RegionalGenerationOptions,
  onProgress?: WorkerProgressCallback
): FullWorkerGenerationOutput {
  onProgress?.('sculpting', PROGRESS_PERCENT_SCULPTING);
  const result = executeRegionalGenerationJob(options);
  return finalizeWorkerPipelineOutput(result, onProgress);
}

/**
 * Executes canonical preset generation ('kanto' | 'johto') off-main-thread with packed blits.
 */
export function executePresetWorkerJob(
  presetId: CanonicalPresetId,
  seed: number,
  onProgress?: WorkerProgressCallback
): FullWorkerGenerationOutput {
  onProgress?.('sculpting', PROGRESS_PERCENT_SCULPTING);
  const result = buildCanonicalRegionMap(presetId, seed);
  return finalizeWorkerPipelineOutput(result, onProgress);
}

/**
 * Executes global Auto-Sanar defect healing and recompiles packed blits off-main-thread.
 */
export function executeHealAllWorkerJob(input: HealAllWorkerJobInput): HealAllWorkerJobOutput {
  const mutation = healAllContinentDefects(input.continent, input.pathGrid, {
    domain: input.domain ?? 'auto',
    pois: input.pois,
    bridgeGrid: input.bridgeGrid
  });
  const rawBuffer = buildZeroCopyPreviewBuffer(mutation.continent, mutation.pathGrid);
  const packedBlit = compilePackedMapBlitBuffer(
    mutation.continent,
    input.pois ?? [],
    mutation.pathGrid,
    input.bridgeGrid,
    input.wilderness
  );

  return {
    continent: mutation.continent,
    pathGrid: mutation.pathGrid,
    detectedDefectCount: mutation.summary.defectsAfter,
    repairedCount: mutation.summary.repairedCount,
    rawBuffer,
    packedBlit
  };
}

/**
 * Pure execution function for localized incident A* rerouting.
 * Exported for 100% deterministic unit testing in Vitest.
 */
export function executeRerouteJob(req: Omit<RerouteNodeRequest, 'type'>): {
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

interface DedicatedWorkerScope {
  postMessage(message: WorkerOutboundResponse, transfer?: Transferable[]): void;
  onmessage: ((event: MessageEvent<WorkerInboundMessage>) => void) | null;
}

function postGenerationOutput(
  scope: DedicatedWorkerScope,
  jobId: number,
  genOut: FullWorkerGenerationOutput
): void {
  const rawBuffer = genOut.result.rawBuffer;
  const response: GenerationSuccessResponse = {
    type: 'GENERATION_COMPLETE',
    jobId,
    result: genOut.result,
    rawBuffer,
    detectedDefectCount: genOut.detectedDefectCount,
    packedBlit: genOut.packedBlit
  };
  const transfers: Transferable[] = [genOut.packedBlit.coordsBuffer];
  if (rawBuffer) {
    transfers.push(rawBuffer);
  }
  scope.postMessage(response, transfers);
}

function dispatchWorkerMessage(scope: DedicatedWorkerScope, msg: WorkerInboundMessage): void {
  const emitProgress: WorkerProgressCallback = (phase, percent) => {
    scope.postMessage({
      type: 'GENERATION_PROGRESS',
      jobId: msg.jobId,
      phase,
      percent
    });
  };

  if (msg.type === 'GENERATE_REGIONAL_MAP') {
    postGenerationOutput(scope, msg.jobId, executeFullWorkerGeneration(msg.options, emitProgress));
    return;
  }
  if (msg.type === 'LOAD_CANONICAL_PRESET') {
    postGenerationOutput(
      scope,
      msg.jobId,
      executePresetWorkerJob(msg.presetId, msg.seed, emitProgress)
    );
    return;
  }
  if (msg.type === 'HEAL_ALL_DEFECTS') {
    const output = executeHealAllWorkerJob(msg.input);
    scope.postMessage(
      {
        type: 'HEAL_ALL_COMPLETE',
        jobId: msg.jobId,
        output
      },
      [output.rawBuffer, output.packedBlit.coordsBuffer]
    );
    return;
  }
  const rerouteResult = executeRerouteJob(msg);
  scope.postMessage({
    type: 'REROUTE_COMPLETE',
    jobId: msg.jobId,
    movedNodeId: msg.movedNodeId,
    updatedNodes: rerouteResult.updatedNodes,
    updatedEdges: rerouteResult.updatedEdges
  });
}

const workerScope: DedicatedWorkerScope | null =
  typeof globalThis.self !== 'undefined' && typeof globalThis.postMessage === 'function'
    ? (globalThis as DedicatedWorkerScope)
    : null;

if (workerScope) {
  workerScope.onmessage = (event: MessageEvent<WorkerInboundMessage>): void => {
    const msg = event.data;
    if (!msg || !msg.type) return;

    try {
      dispatchWorkerMessage(workerScope, msg);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      workerScope.postMessage({
        type: 'ERROR',
        jobId: msg.jobId,
        error: errorMessage
      });
    }
  };
}
