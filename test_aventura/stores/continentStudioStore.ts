import type { DisplayText } from '@francogp/auditor';
/**
 * test_aventura/stores/continentStudioStore.ts
 *
 * REGIONAL CONTINENT STUDIO PINIA STORE (SSoT)
 *
 * Enforces:
 *   1. Unified Coordinate Space (Canvas + SVG): widthPx = W * 32, heightPx = H * 32.
 *   2. Non-Blocking Multi-Threaded Pipeline: shallowRef domain state + preemptive Worker termination.
 *   3. Optimized Drag & Drop: 60 FPS local visual drag on pointermove + targeted incident A* on pointerup.
 *   4. Zero-Copy Memory Transfer: Receives transferable rawPreviewBuffer + Int32Array PackedMapBlitPayload.
 */
import { defineStore } from 'pinia';
import { computed, ref, shallowRef, triggerRef } from 'vue';

import { DEFAULT_POI_TARGET_COUNT } from '../config/poiPlacementConfig.ts';
import {
  CANVAS_TILE_SIZE,
  CONTINENT_DEFAULT_SEED,
  DEFAULT_LAKE_COUNT,
  STUDIO_MOBILE_BREAKPOINT_PX
} from '../config/studioConstants.ts';
import { scanContinentAutotileDefects } from '../logic/map/autotileDefectScanner.ts';
import {
  healContinentAt,
  type ContinentHealingMutationResult
} from '../logic/map/autotileHealingEngine.ts';
import type { CanonicalPresetId } from '../logic/map/continent/canonicalRegionPresets.ts';
import {
  loadProfileListFromStorage,
  loadProjectFromStorage,
  parseProjectJson,
  saveProjectToStorage,
  serializeProjectJson,
  type ContinentProjectExportPayload
} from '../logic/map/continent/regionalPersistenceHelper.ts';
import type { ContinentMapResult } from '../logic/map/continentGenerator.ts';
import {
  executeFullWorkerGeneration,
  executeHealAllWorkerJob,
  executePresetWorkerJob,
  executeRerouteJob,
  type FullWorkerGenerationOutput,
  type RegionalGenerationOptions,
  type WorkerInboundMessage,
  type WorkerOutboundResponse
} from '../logic/map/continentGenerator.worker.ts';
import type { WildernessLayerResult } from '../logic/map/wildernessVegetationEngine.ts';
import type { HealingDomain } from '../types/map/autotileHealingTypes.ts';
import type {
  ContinentGenerationPhase,
  ContinentRenderMode,
  PackedMapBlitPayload
} from '../types/map/continentTypes.ts';
import type { POINode, RouteEdge, UrbanElementType } from '../types/map/poiTypes.ts';

const DEFAULT_DEBOUNCE_DELAY_MS = 250;
const MAX_SEED_RANDOM_VALUE = 999999;
const DEFAULT_MAP_DIMENSION = 400;
const MOBILE_DEFAULT_MAP_DIMENSION = 128;
const DEFAULT_OCEAN_WATER_PERCENTAGE = 0.35;
const DEFAULT_MOUNTAIN_PERCENTAGE = 0.22;
const MAX_HISTORY_SNAPSHOTS = 20 as const;

const PHASE_STATUS_LABELS: Readonly<Record<ContinentGenerationPhase, string>> = {
  sculpting: 'Esculpiendo',
  routing: 'Trazando rutas',
  scanning: 'Analizando tiles',
  compiling_tiles: 'Preparando capas',
  rendering: 'Pintando'
};

export interface DragVisualPosition {
  readonly x: number;
  readonly y: number;
}

export type ContinentMapDimension = 64 | 128 | 256 | 400;

interface HealingHistorySnapshot {
  readonly continent: ContinentMapResult;
  readonly pathGrid: readonly (readonly boolean[])[];
}

function getInitialMapDimension(): ContinentMapDimension {
  if (
    typeof globalThis.window !== 'undefined' &&
    globalThis.window.innerWidth > 0 &&
    globalThis.window.innerWidth <= STUDIO_MOBILE_BREAKPOINT_PX
  ) {
    return MOBILE_DEFAULT_MAP_DIMENSION;
  }
  return DEFAULT_MAP_DIMENSION;
}

export const useRegionalContinentStudioStore = defineStore('regionalContinentStudio', () => {
  // 1. Generation Parameters (Sliders & Toggles)
  const seed = ref<number>(CONTINENT_DEFAULT_SEED);
  const mapDimension = ref<ContinentMapDimension>(getInitialMapDimension());
  const oceanWaterPercentage = ref<number>(DEFAULT_OCEAN_WATER_PERCENTAGE);
  const mountainPercentage = ref<number>(DEFAULT_MOUNTAIN_PERCENTAGE);
  const lakeCount = ref<number>(DEFAULT_LAKE_COUNT);
  const poiTargetCount = ref<number>(DEFAULT_POI_TARGET_COUNT);
  const allowBridges = ref<boolean>(true);

  // 2. Interactive & Async Progress State
  const displayMode = ref<ContinentRenderMode>('hybrid');
  const isGenerating = ref<boolean>(false);
  const isRenderingTiles = ref<boolean>(false);
  const isPendingDebounce = ref<boolean>(false);
  const generationPhase = ref<ContinentGenerationPhase>('sculpting');
  const generationProgressPercent = ref<number>(0);
  const statusLabel = ref<string>('Listo');
  const isBusy = computed<boolean>(
    () => isPendingDebounce.value || isGenerating.value || isRenderingTiles.value
  );

  const selectedPOIId = ref<string | null>(null);
  const hoveredPOIId = ref<string | null>(null);
  const selectedRouteId = ref<string | null>(null);

  // Drag & Drop visual state (transient 60 FPS local position overrides)
  const draggedNodeId = ref<string | null>(null);
  const dragVisualPositions = ref<Record<DisplayText, DragVisualPosition>>({}); // open-record: Transient drag visual coordinates dictionary indexed by node id

  // Urban elements & project profiles state
  const selectedUrbanElement = ref<{ readonly type: UrbanElementType; readonly id: string } | null>(
    null
  );
  const projectName = ref<string>('Kanto Regional Map');
  const activeProjectId = ref<string | null>(null);
  const savedProfiles = ref<readonly { readonly id: string; readonly name: string }[]>(
    loadProfileListFromStorage()
  );

  // 3. Generated Domain Data (shallowRef prevents recursive Vue Proxy wrapping over ~700k nodes)
  const continentMap = shallowRef<ContinentMapResult | null>(null);
  const pois = shallowRef<POINode[]>([]);
  const routes = shallowRef<RouteEdge[]>([]);
  const pathGrid = shallowRef<readonly (readonly boolean[])[]>([]);
  const bridgeGrid = shallowRef<readonly (readonly boolean[])[]>([]);
  const wilderness = shallowRef<WildernessLayerResult | null>(null);
  const rawPreviewBuffer = shallowRef<ArrayBuffer | null>(null);
  const packedBlit = shallowRef<PackedMapBlitPayload | null>(null);

  // 4. Healing Brush & History State
  const undoStack = shallowRef<HealingHistorySnapshot[]>([]);
  const redoStack = shallowRef<HealingHistorySnapshot[]>([]);
  const canUndo = computed<boolean>(() => undoStack.value.length > 0);
  const canRedo = computed<boolean>(() => redoStack.value.length > 0);

  const isHealingBrushActive = ref<boolean>(false);
  const healingBrushDomain = ref<HealingDomain>('auto');
  const lastHealedReport = ref<string | null>(null);
  const detectedDefectCount = ref<number>(0);
  let activeStrokeSnapshotSaved = false;

  // 5. Concurrency Control (Incremental Job ID & Debounce Timer)
  const currentJobId = ref<number>(0);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let workerInstance: Worker | null = null;

  const widthPx = computed(
    () => (continentMap.value?.width ?? mapDimension.value) * CANVAS_TILE_SIZE
  );
  const heightPx = computed(
    () => (continentMap.value?.height ?? mapDimension.value) * CANVAS_TILE_SIZE
  );

  const selectedPOI = computed<POINode | null>(() => {
    if (!selectedPOIId.value) return null;
    return pois.value.find((p) => p.id === selectedPOIId.value) ?? null;
  });

  function clearPendingDebounce(): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    isPendingDebounce.value = false;
  }

  function resetBusyWorkerIfNeeded(): void {
    if (isGenerating.value && workerInstance) {
      workerInstance.terminate();
      workerInstance = null;
    }
  }

  function clearHistoryStacks(): void {
    undoStack.value = [];
    redoStack.value = [];
    activeStrokeSnapshotSaved = false;
  }

  function updateRenderProgress(percent: number): void {
    generationPhase.value = 'rendering';
    generationProgressPercent.value = percent;
    statusLabel.value = `${PHASE_STATUS_LABELS.rendering} ${percent}%`;
  }

  function beginTileRender(): void {
    isRenderingTiles.value = true;
    updateRenderProgress(0);
  }

  function finishTileRender(): void {
    isRenderingTiles.value = false;
    if (!isGenerating.value && !isPendingDebounce.value) {
      statusLabel.value = 'Listo';
    }
  }

  function refreshDetectedDefects(): number {
    if (!continentMap.value) {
      detectedDefectCount.value = 0;
      return 0;
    }
    const report = scanContinentAutotileDefects({
      continent: continentMap.value,
      pathGrid: pathGrid.value,
      bridgeGrid: bridgeGrid.value,
      pois: pois.value
    });
    detectedDefectCount.value = report.totalDefects;
    return report.totalDefects;
  }

  function applyGenerationOutput(
    genOut: FullWorkerGenerationOutput,
    startTileRender: boolean
  ): void {
    if (startTileRender) {
      isRenderingTiles.value = true;
      statusLabel.value = `${PHASE_STATUS_LABELS.rendering} 0%`;
    }
    packedBlit.value = genOut.packedBlit;
    rawPreviewBuffer.value = genOut.result.rawBuffer ?? null;
    continentMap.value = genOut.result.continent;
    pois.value = [...genOut.result.pois];
    routes.value = [...genOut.result.routeNetwork.edges];
    pathGrid.value = genOut.result.routeNetwork.pathGrid;
    bridgeGrid.value = genOut.result.routeNetwork.bridgeGrid;
    wilderness.value = genOut.result.wilderness;
    detectedDefectCount.value = genOut.detectedDefectCount;
    clearHistoryStacks();
    isGenerating.value = false;
    if (!startTileRender && !isPendingDebounce.value) {
      statusLabel.value = 'Listo';
    }
  }

  function handleWorkerResponse(resp: WorkerOutboundResponse): void {
    if (resp.jobId !== currentJobId.value) return;

    if (resp.type === 'GENERATION_PROGRESS') {
      generationPhase.value = resp.phase;
      generationProgressPercent.value = resp.percent;
      statusLabel.value = `${PHASE_STATUS_LABELS[resp.phase]} ${resp.percent}%`;
      return;
    }
    if (resp.type === 'GENERATION_COMPLETE') {
      applyGenerationOutput(
        {
          result: resp.result,
          detectedDefectCount: resp.detectedDefectCount,
          packedBlit: resp.packedBlit
        },
        true
      );
      return;
    }
    if (resp.type === 'HEAL_ALL_COMPLETE') {
      isRenderingTiles.value = true;
      statusLabel.value = `${PHASE_STATUS_LABELS.rendering} 0%`;
      packedBlit.value = resp.output.packedBlit;
      rawPreviewBuffer.value = resp.output.rawBuffer;
      continentMap.value = resp.output.continent;
      pathGrid.value = resp.output.pathGrid;
      detectedDefectCount.value = resp.output.detectedDefectCount;
      lastHealedReport.value = `Mapa sanado (-${resp.output.repairedCount} defectos)`;
      isGenerating.value = false;
      return;
    }
    if (resp.type === 'REROUTE_COMPLETE') {
      packedBlit.value = null;
      pois.value = [...resp.updatedNodes];
      routes.value = [...resp.updatedEdges];
      isGenerating.value = false;
      statusLabel.value = 'Listo';
      return;
    }
    console.error('[RegionalContinentStudio] Generation error from worker:', resp.error);
    isGenerating.value = false;
    statusLabel.value = 'Listo';
  }

  function ensureWorker(): Worker | null {
    if (workerInstance) return workerInstance;
    if (typeof globalThis.window === 'undefined' || typeof Worker === 'undefined') {
      return null;
    }
    try {
      workerInstance = new Worker(
        new URL('../logic/map/continentGenerator.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerInstance.onmessage = (event: MessageEvent<WorkerOutboundResponse>): void => {
        if (event.data) {
          handleWorkerResponse(event.data);
        }
      };
      workerInstance.onerror = (err: ErrorEvent): void => {
        console.error('[RegionalContinentStudio] Web Worker unhandled error:', err.message, err);
        isGenerating.value = false;
        statusLabel.value = 'Listo';
      };
    } catch (e) {
      console.error('[RegionalContinentStudio] Failed to instantiate Web Worker:', e);
      workerInstance = null;
    }
    return workerInstance;
  }

  function pushHistorySnapshot(): void {
    if (!continentMap.value) return;
    const nextStack = [
      ...undoStack.value,
      {
        continent: continentMap.value,
        pathGrid: pathGrid.value
      }
    ];
    undoStack.value =
      nextStack.length > MAX_HISTORY_SNAPSHOTS
        ? nextStack.slice(nextStack.length - MAX_HISTORY_SNAPSHOTS)
        : nextStack;
    redoStack.value = [];
  }

  function beginHealingStroke(): void {
    if (!activeStrokeSnapshotSaved) {
      pushHistorySnapshot();
      activeStrokeSnapshotSaved = true;
    }
  }

  function endHealingStroke(): void {
    if (activeStrokeSnapshotSaved) {
      activeStrokeSnapshotSaved = false;
      refreshDetectedDefects();
    }
  }

  function toggleHealingBrush(): void {
    isHealingBrushActive.value = !isHealingBrushActive.value;
    if (isHealingBrushActive.value && detectedDefectCount.value === 0 && continentMap.value) {
      refreshDetectedDefects();
    }
  }

  function setHealingBrushDomain(domain: HealingDomain): void {
    healingBrushDomain.value = domain;
  }

  function healTileAt(x: number, y: number): ContinentHealingMutationResult | null {
    if (!continentMap.value) return null;
    if (!activeStrokeSnapshotSaved) {
      pushHistorySnapshot();
    }
    const mutation = healContinentAt(continentMap.value, pathGrid.value, x, y, {
      domain: healingBrushDomain.value,
      pois: pois.value,
      bridgeGrid: bridgeGrid.value
    });
    packedBlit.value = null;
    continentMap.value = mutation.continent;
    pathGrid.value = mutation.pathGrid;
    const { summary } = mutation;
    lastHealedReport.value = `(${summary.targetX}, ${summary.targetY}) ${summary.targetRole} [${summary.detectedDomain}] -${summary.repairedCount}`;
    if (!activeStrokeSnapshotSaved) {
      refreshDetectedDefects();
    }
    return mutation;
  }

  function healEntireMapDefects(): void {
    if (!continentMap.value) return;
    pushHistorySnapshot();
    clearPendingDebounce();
    resetBusyWorkerIfNeeded();

    const nextJobId = ++currentJobId.value;
    isGenerating.value = true;
    statusLabel.value = 'Sanando mapa...';

    const input = {
      continent: continentMap.value,
      pathGrid: pathGrid.value,
      bridgeGrid: bridgeGrid.value,
      pois: pois.value,
      wilderness: wilderness.value,
      domain: healingBrushDomain.value
    };

    const worker = ensureWorker();
    if (worker) {
      const request: WorkerInboundMessage = {
        type: 'HEAL_ALL_DEFECTS',
        jobId: nextJobId,
        input
      };
      worker.postMessage(request);
      return;
    }

    const out = executeHealAllWorkerJob(input);
    if (currentJobId.value === nextJobId) {
      packedBlit.value = out.packedBlit;
      rawPreviewBuffer.value = out.rawBuffer;
      continentMap.value = out.continent;
      pathGrid.value = out.pathGrid;
      detectedDefectCount.value = out.detectedDefectCount;
      lastHealedReport.value = `Mapa sanado (-${out.repairedCount} defectos)`;
      isGenerating.value = false;
      statusLabel.value = 'Listo';
    }
  }

  function executeGenerationNow(): void {
    clearPendingDebounce();
    resetBusyWorkerIfNeeded();

    const nextJobId = ++currentJobId.value;
    isGenerating.value = true;
    generationPhase.value = 'sculpting';
    generationProgressPercent.value = 0;
    statusLabel.value = `${PHASE_STATUS_LABELS.sculpting}...`;

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
      return;
    }

    try {
      const genOut = executeFullWorkerGeneration(options);
      if (currentJobId.value === nextJobId) {
        applyGenerationOutput(genOut, false);
      }
    } catch {
      isGenerating.value = false;
      statusLabel.value = 'Listo';
    }
  }

  function triggerRegenerationDebounced(delay = DEFAULT_DEBOUNCE_DELAY_MS): void {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    isPendingDebounce.value = true;
    statusLabel.value = 'Preparando...';
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      isPendingDebounce.value = false;
      executeGenerationNow();
    }, delay);
  }

  function randomizeSeed(): void {
    seed.value = Math.floor(Math.random() * MAX_SEED_RANDOM_VALUE);
    triggerRegenerationDebounced(0);
  }

  function updateNodeDragVisualPosition(nodeId: string, svgX: number, svgY: number): void {
    dragVisualPositions.value = {
      ...dragVisualPositions.value,
      [nodeId]: { x: svgX, y: svgY }
    };
  }

  function handleNodeDragEnd(nodeId: string, newGridX: number, newGridY: number): void {
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
      return;
    }

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
      packedBlit.value = null;
      pois.value = [...res.updatedNodes];
      routes.value = [...res.updatedEdges];
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

  function selectUrbanElement(
    el: { readonly type: UrbanElementType; readonly id: string } | null
  ): void {
    selectedUrbanElement.value = el;
  }

  function moveBuildingInPOI(nodeId: string, buildingId: string, x: number, y: number): void {
    const node = pois.value.find((p) => p.id === nodeId);
    if (!node?.urbanLayout) return;
    const b = node.urbanLayout.buildings.find((item) => item.id === buildingId);
    if (b) {
      (b as { x: number; y: number }).x = x;
      (b as { x: number; y: number }).y = y;
      packedBlit.value = null;
      triggerRef(pois);
    }
  }

  function movePropInPOI(nodeId: string, propId: string, x: number, y: number): void {
    const node = pois.value.find((p) => p.id === nodeId);
    if (!node?.urbanLayout) return;
    const p = node.urbanLayout.props.find(
      (item) => (item.id ?? `prop_${item.x}_${item.y}`) === propId
    );
    if (p) {
      (p as { x: number; y: number }).x = x;
      (p as { x: number; y: number }).y = y;
      packedBlit.value = null;
      triggerRef(pois);
    }
  }

  function undo(): void {
    const prev = undoStack.value.at(-1);
    if (!prev || !continentMap.value) return;
    redoStack.value = [
      ...redoStack.value,
      { continent: continentMap.value, pathGrid: pathGrid.value }
    ];
    undoStack.value = undoStack.value.slice(0, -1);
    packedBlit.value = null;
    continentMap.value = prev.continent;
    pathGrid.value = prev.pathGrid;
    refreshDetectedDefects();
  }

  function redo(): void {
    const next = redoStack.value.at(-1);
    if (!next || !continentMap.value) return;
    undoStack.value = [
      ...undoStack.value,
      { continent: continentMap.value, pathGrid: pathGrid.value }
    ];
    redoStack.value = redoStack.value.slice(0, -1);
    packedBlit.value = null;
    continentMap.value = next.continent;
    pathGrid.value = next.pathGrid;
    refreshDetectedDefects();
  }

  function createBlankProject(name: string): void {
    projectName.value = name;
  }

  function buildProjectExportPayload(): ContinentProjectExportPayload {
    return {
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
  }

  function saveCurrentProject(): void {
    const payload = buildProjectExportPayload();
    activeProjectId.value = payload.id;
    savedProfiles.value = saveProjectToStorage(payload);
  }

  function applyImportedProjectSettings(project: ContinentProjectExportPayload): void {
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

  function loadProject(id: string): void {
    const project = loadProjectFromStorage(id);
    if (!project) return;
    activeProjectId.value = project.id;
    applyImportedProjectSettings(project);
  }

  function exportSvg(): string {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx.value}" height="${heightPx.value}"></svg>`;
  }

  function importSvg(_content: string): boolean {
    return true;
  }

  function exportProjectJson(): string {
    return serializeProjectJson(buildProjectExportPayload());
  }

  function importProjectJson(content: string): boolean {
    const parsed = parseProjectJson(content);
    if (!parsed) return false;
    applyImportedProjectSettings(parsed);
    return true;
  }

  function loadCanonicalPreset(presetId: CanonicalPresetId = 'kanto'): void {
    clearPendingDebounce();
    resetBusyWorkerIfNeeded();

    const nextJobId = ++currentJobId.value;
    isGenerating.value = true;
    generationPhase.value = 'sculpting';
    generationProgressPercent.value = 0;
    statusLabel.value = `${PHASE_STATUS_LABELS.sculpting}...`;

    const worker = ensureWorker();
    if (worker) {
      const request: WorkerInboundMessage = {
        type: 'LOAD_CANONICAL_PRESET',
        jobId: nextJobId,
        presetId,
        seed: seed.value
      };
      worker.postMessage(request);
      return;
    }

    try {
      const genOut = executePresetWorkerJob(presetId, seed.value);
      if (currentJobId.value === nextJobId) {
        applyGenerationOutput(genOut, false);
      }
    } finally {
      if (currentJobId.value === nextJobId) {
        isGenerating.value = false;
      }
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
    isRenderingTiles,
    isBusy,
    generationPhase,
    generationProgressPercent,
    statusLabel,
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
    isHealingBrushActive,
    healingBrushDomain,
    lastHealedReport,
    detectedDefectCount,

    // Data
    continentMap,
    pois,
    routes,
    pathGrid,
    bridgeGrid,
    wilderness,
    rawPreviewBuffer,
    packedBlit,

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
    loadCanonicalPreset,
    toggleHealingBrush,
    setHealingBrushDomain,
    beginHealingStroke,
    endHealingStroke,
    refreshDetectedDefects,
    healTileAt,
    healEntireMapDefects,
    beginTileRender,
    updateRenderProgress,
    finishTileRender
  };
});
