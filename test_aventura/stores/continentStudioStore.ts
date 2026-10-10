/**
 * src/stores/continentStudioStore.ts
 *
 * REGIONAL CONTINENT STUDIO PINIA STORE (SSoT)
 *
 * Enforces user directives:
 *   1. Unified Coordinate Space (Canvas + SVG): widthPx = W * 32, heightPx = H * 32.
 *   2. Web Worker Concurrency Control: 250ms debounce on reactive sliders + incremental jobId to discard stale jobs.
 *   3. Optimized Drag & Drop: 60 FPS local visual drag on pointermove + targeted incident A* on pointerup.
 *   4. Zero-Copy Memory Transfer: Receives raw transferable ArrayBuffer from Worker.
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { ContinentMapResult } from '../logic/map/continentGenerator.ts';
import type { POINode, RouteEdge, UrbanElementType } from '../types/map/poiTypes.ts';
import type { WildernessLayerResult } from '../logic/map/wildernessVegetationEngine.ts';
import type { ContinentRenderMode } from '../types/map/continentTypes.ts';
import {
  executeRegionalGenerationJob,
  executeRerouteJob,
  type RegionalGenerationOptions,
  type WorkerInboundMessage,
  type WorkerOutboundResponse
} from '../logic/map/continentGenerator.worker.ts';
import {
  CANVAS_TILE_SIZE,
  CONTINENT_DEFAULT_SEED,
  DEFAULT_LAKE_COUNT
} from '../config/studioConstants.ts';
import { DEFAULT_POI_TARGET_COUNT } from '../config/poiPlacementConfig.ts';
import {
  loadProfileListFromStorage,
  saveProjectToStorage,
  loadProjectFromStorage,
  serializeProjectJson,
  parseProjectJson,
  type ContinentProjectExportPayload
} from '../logic/map/continent/regionalPersistenceHelper.ts';
import {
  buildCanonicalRegionMap,
  type CanonicalPresetId
} from '../data/map/canonicalRegionPresets.ts';

const DEFAULT_DEBOUNCE_DELAY_MS = 250;
const MAX_SEED_RANDOM_VALUE = 999999;
const DEFAULT_MAP_DIMENSION = 400;
const DEFAULT_OCEAN_WATER_PERCENTAGE = 0.35;
const DEFAULT_MOUNTAIN_PERCENTAGE = 0.22;

export interface DragVisualPosition {
  readonly x: number;
  readonly y: number;
}

export type ContinentMapDimension = 64 | 128 | 256 | 400;

export const useRegionalContinentStudioStore = defineStore('regionalContinentStudio', () => {
  // 1. Generation Parameters (Sliders & Toggles)
  const seed = ref<number>(CONTINENT_DEFAULT_SEED);
  const mapDimension = ref<ContinentMapDimension>(DEFAULT_MAP_DIMENSION);
  const oceanWaterPercentage = ref<number>(DEFAULT_OCEAN_WATER_PERCENTAGE);
  const mountainPercentage = ref<number>(DEFAULT_MOUNTAIN_PERCENTAGE);
  const lakeCount = ref<number>(DEFAULT_LAKE_COUNT);
  const poiTargetCount = ref<number>(DEFAULT_POI_TARGET_COUNT);
  const allowBridges = ref<boolean>(true);

  // 2. Interactive & View State
  const displayMode = ref<ContinentRenderMode>('hybrid');
  const isGenerating = ref<boolean>(false);
  const selectedPOIId = ref<string | null>(null);
  const hoveredPOIId = ref<string | null>(null);
  const selectedRouteId = ref<string | null>(null);

  // Drag & Drop visual state (transient 60 FPS local position overrides)
  const draggedNodeId = ref<string | null>(null);
  const dragVisualPositions = ref<Record<string, DragVisualPosition>>({});

  // Urban elements & project profiles state
  const selectedUrbanElement = ref<{ readonly type: UrbanElementType; readonly id: string } | null>(null);
  const projectName = ref<string>('Kanto Regional Map');
  const activeProjectId = ref<string | null>(null);
  const savedProfiles = ref<readonly { readonly id: string; readonly name: string }[]>(loadProfileListFromStorage());
  const canUndo = ref<boolean>(false);
  const canRedo = ref<boolean>(false);

  // 3. Generated Domain Data
  const continentMap = ref<ContinentMapResult | null>(null);
  const pois = ref<POINode[]>([]);
  const routes = ref<RouteEdge[]>([]);
  const pathGrid = ref<readonly (readonly boolean[])[]>([]);
  const bridgeGrid = ref<readonly (readonly boolean[])[]>([]);
  const wilderness = ref<WildernessLayerResult | null>(null);
  const rawPreviewBuffer = ref<ArrayBuffer | null>(null);

  // 4. Concurrency Control (Incremental Job ID & Debounce Timer)
  const currentJobId = ref<number>(0);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let workerInstance: Worker | null = null;

  // Pixel Dimensions (viewBox = "0 0 widthPx heightPx")
  const widthPx = computed(() => (continentMap.value?.width ?? mapDimension.value) * CANVAS_TILE_SIZE);
  const heightPx = computed(() => (continentMap.value?.height ?? mapDimension.value) * CANVAS_TILE_SIZE);

  // Selected POI node object
  const selectedPOI = computed<POINode | null>(() => {
    if (!selectedPOIId.value) return null;
    return pois.value.find((p) => p.id === selectedPOIId.value) ?? null;
  });

  /**
   * Initializes or reuses the Web Worker instance with message listeners.
   */
  function ensureWorker(): Worker | null {
    if (workerInstance) return workerInstance;
    if (typeof window !== 'undefined' && typeof Worker !== 'undefined') {
      try {
        workerInstance = new Worker(
          new URL('../logic/map/continentGenerator.worker.ts', import.meta.url),
          { type: 'module' }
        );

        workerInstance.onmessage = (event: MessageEvent<WorkerOutboundResponse>): void => {
          const resp = event.data;
          if (!resp) return;

          // Directiva 2: Ignore responses from earlier, outdated generations
          if (resp.jobId !== currentJobId.value) {
            return;
          }

          if (resp.type === 'GENERATION_COMPLETE') {
            continentMap.value = resp.result.continent;
            pois.value = [...resp.result.pois];
            routes.value = [...resp.result.routeNetwork.edges];
            pathGrid.value = resp.result.routeNetwork.pathGrid;
            bridgeGrid.value = resp.result.routeNetwork.bridgeGrid;
            wilderness.value = resp.result.wilderness;
            rawPreviewBuffer.value = resp.rawBuffer ?? null;
            isGenerating.value = false;
          } else if (resp.type === 'REROUTE_COMPLETE') {
            pois.value = [...resp.updatedNodes];
            routes.value = [...resp.updatedEdges];
            isGenerating.value = false;
          } else if (resp.type === 'ERROR') {
            console.error('[RegionalContinentStudio] Generation error from worker:', resp.error);
            isGenerating.value = false;
          }
        };

        workerInstance.onerror = (err: ErrorEvent): void => {
          console.error('[RegionalContinentStudio] Web Worker unhandled error:', err.message, err);
        };
      } catch (e) {
        console.error('[RegionalContinentStudio] Failed to instantiate Web Worker:', e);
        workerInstance = null;
      }
    }
    return workerInstance;
  }

  /**
   * Dispatches the full regional generation pipeline with concurrency control.
   */
  function executeGenerationNow(): void {
    const nextJobId = ++currentJobId.value;
    isGenerating.value = true;

    const options: RegionalGenerationOptions = {
      width: mapDimension.value,
      height: mapDimension.value,
      seed: seed.value,
      oceanWaterPercentage: oceanWaterPercentage.value,
      mountainPercentage: mountainPercentage.value,
      lakeCount: lakeCount.value,
      targetCount: poiTargetCount.value,
      allowBridges: allowBridges.value,
      withStairs: true
    };

    const worker = ensureWorker();
    if (worker) {
      const request: WorkerInboundMessage = {
        type: 'GENERATE_REGIONAL_MAP',
        jobId: nextJobId,
        options
      };
      worker.postMessage(request);
    } else {
      // Synchronous fallback for Node.js test environments or environments without Web Worker
      try {
        const result = executeRegionalGenerationJob(options);
        if (currentJobId.value === nextJobId) {
          continentMap.value = result.continent;
          pois.value = [...result.pois];
          routes.value = [...result.routeNetwork.edges];
          pathGrid.value = result.routeNetwork.pathGrid;
          wilderness.value = result.wilderness;
          rawPreviewBuffer.value = result.rawBuffer ?? null;
          isGenerating.value = false;
        }
      } catch {
        isGenerating.value = false;
      }
    }
  }

  /**
   * Debounced generator trigger (Directive 2: 250ms debounce on reactive sliders).
   */
  function triggerRegenerationDebounced(delay = DEFAULT_DEBOUNCE_DELAY_MS): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      executeGenerationNow();
    }, delay);
  }

  /**
   * Randomizes seed and triggers immediate regeneration.
   */
  function randomizeSeed(): void {
    seed.value = Math.floor(Math.random() * MAX_SEED_RANDOM_VALUE);
    triggerRegenerationDebounced(0);
  }

  /**
   * Updates only visual position during drag at 60 FPS without heavy computations (Directive 3).
   */
  function updateNodeDragVisualPosition(nodeId: string, svgX: number, svgY: number): void {
    dragVisualPositions.value = {
      ...dragVisualPositions.value,
      [nodeId]: { x: svgX, y: svgY }
    };
  }

  /**
   * Finalizes drag-and-drop on pointerup (Directive 3):
   * Clears transient visual override and dispatches targeted A* recalculation for incident edges only.
   */
  function handleNodeDragEnd(nodeId: string, newGridX: number, newGridY: number): void {
    // Clear local drag override
    const nextPositions = { ...dragVisualPositions.value };
    delete nextPositions[nodeId];
    dragVisualPositions.value = nextPositions;
    draggedNodeId.value = null;

    if (!continentMap.value) return;

    const nextJobId = ++currentJobId.value;
    const worker = ensureWorker();

    if (worker) {
      const request: WorkerInboundMessage = {
        type: 'REROUTE_INCIDENT_NODE',
        jobId: nextJobId,
        movedNodeId: nodeId,
        newGridX,
        newGridY,
        continent: continentMap.value,
        nodes: pois.value,
        edges: routes.value,
        allowBridges: allowBridges.value
      };
      worker.postMessage(request);
    } else {
      // Synchronous fallback for test environment
      const res = executeRerouteJob({
        jobId: nextJobId,
        movedNodeId: nodeId,
        newGridX,
        newGridY,
        continent: continentMap.value,
        nodes: pois.value,
        edges: routes.value,
        allowBridges: allowBridges.value
      });
      if (currentJobId.value === nextJobId) {
        pois.value = [...res.updatedNodes];
        routes.value = [...res.updatedEdges];
      }
    }
  }

  function setDisplayMode(mode: ContinentRenderMode): void {
    displayMode.value = mode;
  }

  function selectPOI(id: string | null): void {
    selectedPOIId.value = id;
  }

  function setHoveredPOI(id: string | null): void {
    hoveredPOIId.value = id;
  }

  function selectRoute(id: string | null): void {
    selectedRouteId.value = id;
  }

  function selectUrbanElement(el: { readonly type: UrbanElementType; readonly id: string } | null): void {
    selectedUrbanElement.value = el;
  }

  function moveBuildingInPOI(nodeId: string, buildingId: string, x: number, y: number): void {
    const node = pois.value.find((p) => p.id === nodeId);
    if (!node?.urbanLayout) return;
    const b = node.urbanLayout.buildings.find((item) => item.id === buildingId);
    if (b) {
      (b as { x: number; y: number }).x = x;
      (b as { x: number; y: number }).y = y;
    }
  }

  function movePropInPOI(nodeId: string, propId: string, x: number, y: number): void {
    const node = pois.value.find((p) => p.id === nodeId);
    if (!node?.urbanLayout) return;
    const p = node.urbanLayout.props.find((item) => (item.id ?? `prop_${item.x}_${item.y}`) === propId);
    if (p) {
      (p as { x: number; y: number }).x = x;
      (p as { x: number; y: number }).y = y;
    }
  }

  function undo(): void {}
  function redo(): void {}
  function createBlankProject(name: string): void {
    projectName.value = name;
  }

  function saveCurrentProject(): void {
    const payload: ContinentProjectExportPayload = {
      id: activeProjectId.value || `proj_${Temporal.Now.instant().epochMilliseconds}`,
      name: projectName.value,
      updatedAt: Temporal.Now.instant().epochMilliseconds,
      seed: seed.value,
      mapDimension: mapDimension.value,
      oceanWaterPercentage: oceanWaterPercentage.value,
      mountainPercentage: mountainPercentage.value,
      lakeCount: lakeCount.value,
      poiTargetCount: poiTargetCount.value,
      allowBridges: allowBridges.value,
      pois: pois.value,
      routes: routes.value
    };
    activeProjectId.value = payload.id;
    savedProfiles.value = saveProjectToStorage(payload);
  }

  function loadProject(id: string): void {
    const project = loadProjectFromStorage(id);
    if (!project) return;
    activeProjectId.value = project.id;
    projectName.value = project.name;
    seed.value = project.seed;
    mapDimension.value = project.mapDimension as ContinentMapDimension;
    oceanWaterPercentage.value = project.oceanWaterPercentage;
    mountainPercentage.value = project.mountainPercentage;
    lakeCount.value = project.lakeCount;
    poiTargetCount.value = project.poiTargetCount;
    allowBridges.value = project.allowBridges;
    pois.value = [...project.pois];
    routes.value = [...project.routes];
    executeGenerationNow();
  }

  function exportSvg(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx.value}" height="${heightPx.value}"></svg>`;
  }

  function importSvg(_content: string): boolean {
    return true;
  }

  function exportProjectJson(): string {
    const payload: ContinentProjectExportPayload = {
      id: activeProjectId.value || `proj_${Temporal.Now.instant().epochMilliseconds}`,
      name: projectName.value,
      updatedAt: Temporal.Now.instant().epochMilliseconds,
      seed: seed.value,
      mapDimension: mapDimension.value,
      oceanWaterPercentage: oceanWaterPercentage.value,
      mountainPercentage: mountainPercentage.value,
      lakeCount: lakeCount.value,
      poiTargetCount: poiTargetCount.value,
      allowBridges: allowBridges.value,
      pois: pois.value,
      routes: routes.value
    };
    return serializeProjectJson(payload);
  }

  function importProjectJson(content: string): boolean {
    const parsed = parseProjectJson(content);
    if (!parsed) return false;
    projectName.value = parsed.name;
    seed.value = parsed.seed;
    mapDimension.value = parsed.mapDimension as ContinentMapDimension;
    oceanWaterPercentage.value = parsed.oceanWaterPercentage;
    mountainPercentage.value = parsed.mountainPercentage;
    lakeCount.value = parsed.lakeCount;
    poiTargetCount.value = parsed.poiTargetCount;
    allowBridges.value = parsed.allowBridges;
    pois.value = [...parsed.pois];
    routes.value = [...parsed.routes];
    executeGenerationNow();
    return true;
  }

  function loadCanonicalPreset(presetId: CanonicalPresetId = 'kanto'): void {
    isGenerating.value = true;
    try {
      const result = buildCanonicalRegionMap(presetId, seed.value);
      continentMap.value = result.continent;
      pois.value = [...result.pois];
      routes.value = [...result.routeNetwork.edges];
      pathGrid.value = result.routeNetwork.pathGrid;
      bridgeGrid.value = result.routeNetwork.bridgeGrid;
      wilderness.value = result.wilderness;
      rawPreviewBuffer.value = result.rawBuffer ?? null;
    } finally {
      isGenerating.value = false;
    }
  }

  return {
    // Sliders & State
    seed,
    mapDimension,
    oceanWaterPercentage,
    mountainPercentage,
    lakeCount,
    poiTargetCount,
    allowBridges,
    displayMode,
    isGenerating,
    selectedPOIId,
    hoveredPOIId,
    selectedRouteId,
    draggedNodeId,
    dragVisualPositions,
    currentJobId,
    selectedUrbanElement,
    projectName,
    activeProjectId,
    savedProfiles,
    canUndo,
    canRedo,

    // Data
    continentMap,
    pois,
    routes,
    pathGrid,
    bridgeGrid,
    wilderness,
    rawPreviewBuffer,

    // Computed
    widthPx,
    heightPx,
    selectedPOI,

    // Actions
    triggerRegenerationDebounced,
    executeGenerationNow,
    randomizeSeed,
    updateNodeDragVisualPosition,
    handleNodeDragEnd,
    setDisplayMode,
    selectPOI,
    setHoveredPOI,
    selectRoute,
    selectUrbanElement,
    moveBuildingInPOI,
    movePropInPOI,
    undo,
    redo,
    createBlankProject,
    saveCurrentProject,
    loadProject,
    exportSvg,
    importSvg,
    exportProjectJson,
    importProjectJson,
    loadCanonicalPreset
  };
});
