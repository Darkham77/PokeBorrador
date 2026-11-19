/**
 * test_aventura/stores/continentStudioStore.ts
 *
 * REGIONAL CONTINENT STUDIO PINIA STORE (SSoT)
 *
 * Enforces:
 *   1. Unified Coordinate Space (Canvas + SVG): widthPx = W * 32, heightPx = H * 32.
 *   2. Non-Blocking Multi-Threaded Pipeline: shallowRef domain state + preemptive Worker termination.
 *   3. Row Copy-on-Write + Compact DirtyRectHistoryDelta Undo/Redo without cloning full grids.
 *   4. Defect Record Retention, Domain Filtering & Camera Focus Navigation.
 *   5. Explicit `fullRenderVersion` vs `lastDirtyRectUpdate` channels eliminating watch races.
 */

import type { DisplayText } from '@francogp/auditor';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef, triggerRef } from 'vue';

import {
  DEFAULT_BRUSH_SIZE,
  MAX_FLOOD_FILL_CELLS,
  MIN_DEFECT_FOCUS_ZOOM
} from '../config/brushConfig.ts';
import { DEFAULT_POI_TARGET_COUNT } from '../config/poiPlacementConfig.ts';
import {
  CANVAS_TILE_SIZE,
  CONTINENT_DEFAULT_SEED,
  DEFAULT_LAKE_COUNT,
  DEFAULT_MOUNTAIN_PALETTE,
  STUDIO_MOBILE_BREAKPOINT_PX
} from '../config/studioConstants.ts';
import { scanContinentAutotileDefects } from '../logic/map/autotileDefectScanner.ts';
import {
  healContinentAt,
  type ContinentHealingMutationResult
} from '../logic/map/autotileHealingEngine.ts';
import { updatePreviewBufferInBounds } from '../logic/map/canvasTileRenderer.ts';
import type { CanonicalPresetId } from '../logic/map/continent/canonicalRegionPresets.ts';
import {
  DEFECT_RESCAN_MARGIN_TILES,
  applyDirtyRectHistoryDelta,
  buildSerializedManualEdits,
  captureDirtyRectHistoryDelta,
  countDefectsByDomain,
  countEditableDiffInBounds,
  createEmptyBooleanGrid,
  createManualEditTracker,
  mergeDefectRecordsInBounds,
  recordManualEditDiff,
  resetManualEditTracker,
  type ContinentEditableState
} from '../logic/map/continent/continentHistoryDelta.ts';
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
  type HealAllWorkerJobOutput,
  type RegionalGenerationOptions,
  type WorkerInboundMessage,
  type WorkerOutboundResponse
} from '../logic/map/continentGenerator.worker.ts';
import {
  applySerializedManualEditsToState,
  floodFillContinentAt,
  paintContinentCells,
  paintContinentLine,
  sampleContinentCellAt
} from '../logic/map/continentPaintEngine.ts';
import type { MicroVignette } from '../logic/map/microVignetteEngine.ts';
import type { MountainPalette } from '../logic/map/mountainAutotileEngine.ts';
import type { ProgressionObstacle } from '../logic/map/progressionObstacleEngine.ts';
import type { LedgeRun } from '../logic/map/routeLedgeEngine.ts';
import type { MaritimeRockObstacle } from '../logic/map/routeNetworkEngine.ts';
import type { WildernessLayerResult } from '../logic/map/wildernessVegetationEngine.ts';
import {
  brushSizeToRadius,
  expandDirtyBounds,
  mergeDirtyBounds
} from '../logic/utils/gridGeometryUtils.ts';
import type {
  AutotileDefectRecord,
  ContinentHealingSummary,
  DirtyTileBounds,
  HealingDomain
} from '../types/map/autotileHealingTypes.ts';
import {
  BRUSH_SIZE_OPTIONS,
  type BrushConfigState,
  type BrushMode,
  type BrushShape,
  type BrushSizeOption,
  type CameraFocusRequest,
  type ContinentPaintMutationResult,
  type DirtyRectHistoryDelta,
  type GridPoint2D,
  type MountainHealPolicy,
  type PaintSampleResult,
  type SerializedContinentManualEdits,
  type TerrainPaintTarget
} from '../types/map/continentBrushTypes.ts';
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
const MAX_HISTORY_SNAPSHOTS = 25 as const;

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

export interface DirtyRectRenderSignal {
  readonly revision: number;
  readonly bounds: DirtyTileBounds;
}

export type ContinentMapDimension = 64 | 128 | 256 | 400;

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

function buildFullMapSummary(width: number, height: number): ContinentHealingSummary {
  return {
    targetX: Math.floor(width / 2),
    targetY: Math.floor(height / 2),
    detectedDomain: 'auto',
    targetRole: 'full_map_healed',
    dirtyBounds: {
      minX: 0,
      minY: 0,
      maxX: Math.max(0, width - 1),
      maxY: Math.max(0, height - 1)
    },
    defectsBefore: 0,
    defectsAfter: 0,
    repairedCount: 0,
    timestamp: Temporal.Now.instant().toString()
  };
}

export const useRegionalContinentStudioStore = defineStore('regionalContinentStudio', () => {
  // 1. Generation Parameters
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
  const draggedNodeId = ref<string | null>(null);
  const dragVisualPositions = ref<Record<DisplayText, DragVisualPosition>>({}); // open-record: Transient drag visual coordinates dictionary indexed by node id
  const selectedUrbanElement = ref<{ readonly type: UrbanElementType; readonly id: string } | null>(
    null
  );
  const projectName = ref<string>('Kanto Regional Map');
  const activeProjectId = ref<string | null>(null);
  const savedProfiles = ref<readonly { readonly id: string; readonly name: string }[]>(
    loadProfileListFromStorage()
  );

  // 3. Generated Domain Data (shallowRef prevents recursive Vue Proxy wrapping)
  const continentMap = shallowRef<ContinentMapResult | null>(null);
  const pois = shallowRef<POINode[]>([]);
  const routes = shallowRef<RouteEdge[]>([]);
  const pathGrid = shallowRef<readonly (readonly boolean[])[]>([]);
  const manualPathGrid = shallowRef<readonly (readonly boolean[])[]>([]);
  const bridgeGrid = shallowRef<readonly (readonly boolean[])[]>([]);
  const maritimeRockObstacles = shallowRef<readonly MaritimeRockObstacle[]>([]);
  const wilderness = shallowRef<WildernessLayerResult | null>(null);
  const ledges = shallowRef<readonly LedgeRun[]>([]);
  const progressionObstacles = shallowRef<readonly ProgressionObstacle[]>([]);
  const microVignettes = shallowRef<readonly MicroVignette[]>([]);
  const rawPreviewBuffer = shallowRef<ArrayBuffer | null>(null);
  const packedBlit = shallowRef<PackedMapBlitPayload | null>(null);

  // 4. Compact History & Creative Brush Configuration
  const undoStack = shallowRef<DirtyRectHistoryDelta[]>([]);
  const redoStack = shallowRef<DirtyRectHistoryDelta[]>([]);
  const canUndo = computed<boolean>(() => undoStack.value.length > 0);
  const canRedo = computed<boolean>(() => redoStack.value.length > 0);

  const isHealingBrushActive = ref<boolean>(false);
  const healingBrushDomain = ref<HealingDomain>('auto');
  const brushMode = ref<BrushMode>('heal');
  const brushShape = ref<BrushShape>('square');
  const brushSize = ref<BrushSizeOption>(DEFAULT_BRUSH_SIZE);
  const paintTarget = ref<TerrainPaintTarget>('terrain_water');
  const mountainPalette = ref<MountainPalette>(DEFAULT_MOUNTAIN_PALETTE);
  const mountainPolicy = ref<MountainHealPolicy>('erode');
  const autoHealOnPaint = ref<boolean>(true);
  const brushConfig = computed<BrushConfigState>(() => ({
    mode: brushMode.value,
    shape: brushShape.value,
    size: brushSize.value,
    paintTarget: paintTarget.value,
    mountainPalette: mountainPalette.value,
    mountainPolicy: mountainPolicy.value,
    autoHealOnPaint: autoHealOnPaint.value
  }));

  const lastHealedReport = ref<string | null>(null);
  const lastBrushSample = shallowRef<PaintSampleResult | null>(null);
  const lastStrokeEndPoint = ref<GridPoint2D | null>(null);

  // 5. Autotile Defect Inspector & Render Synchronization Signals
  const defectRecords = shallowRef<readonly AutotileDefectRecord[]>([]);
  const detectedDefectCount = ref<number>(0);
  const defectFilterDomain = ref<HealingDomain>('auto');
  const defectCountsByDomain = computed<Readonly<Record<HealingDomain, number>>>(() =>
    countDefectsByDomain(defectRecords.value)
  );
  const filteredDefectRecords = computed<readonly AutotileDefectRecord[]>(() =>
    defectFilterDomain.value === 'auto'
      ? defectRecords.value
      : defectRecords.value.filter((d) => d.domain === defectFilterDomain.value)
  );
  const activeDefectIndex = ref<number>(-1);
  const activeDefect = computed<AutotileDefectRecord | null>(
    () => filteredDefectRecords.value[activeDefectIndex.value] ?? null
  );
  const cameraFocusRequest = shallowRef<CameraFocusRequest | null>(null);

  const fullRenderVersion = ref<number>(0);
  const lastDirtyRectUpdate = shallowRef<DirtyRectRenderSignal | null>(null);
  let dirtyRectRevision = 0;
  let cameraFocusRevision = 0;

  let activeStrokeStartState: ContinentEditableState | null = null;
  let activeStrokeDirtyBounds: DirtyTileBounds | null = null;
  let activeStrokeChangedCount = 0;
  let activeStrokeLastSummary: ContinentHealingSummary | null = null;
  let pendingHealAllBeforeState: ContinentEditableState | null = null;
  const manualEditTracker = createManualEditTracker();
  let pendingManualMapEdits: SerializedContinentManualEdits | null = null;
  const activeElevationStrokeVisited = new Set<number>();

  // 6. Worker Concurrency Control
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

  function getCurrentEditableState(): ContinentEditableState | null {
    if (!continentMap.value) return null;
    const { width, height } = continentMap.value;
    return {
      continent: continentMap.value,
      pathGrid: pathGrid.value,
      manualPathGrid:
        manualPathGrid.value.length === height
          ? manualPathGrid.value
          : createEmptyBooleanGrid(width, height),
      bridgeGrid:
        bridgeGrid.value.length === height
          ? bridgeGrid.value
          : createEmptyBooleanGrid(width, height),
      wilderness: wilderness.value
    };
  }

  function clearStrokeState(): void {
    activeStrokeStartState = null;
    activeStrokeDirtyBounds = null;
    activeStrokeChangedCount = 0;
    activeStrokeLastSummary = null;
    activeElevationStrokeVisited.clear();
  }

  function clearHistoryStacks(): void {
    undoStack.value = [];
    redoStack.value = [];
    clearStrokeState();
    pendingHealAllBeforeState = null;
  }

  function pushDeltaToUndoStack(delta: DirtyRectHistoryDelta): void {
    const nextStack = [...undoStack.value, delta];
    undoStack.value =
      nextStack.length > MAX_HISTORY_SNAPSHOTS
        ? nextStack.slice(nextStack.length - MAX_HISTORY_SNAPSHOTS)
        : nextStack;
    redoStack.value = [];
  }

  function emitDirtyRectSignal(bounds: DirtyTileBounds): void {
    dirtyRectRevision += 1;
    lastDirtyRectUpdate.value = { revision: dirtyRectRevision, bounds };
  }

  function applyStateToStore(
    state: ContinentEditableState,
    boundsForPreview?: DirtyTileBounds
  ): void {
    packedBlit.value = null;
    continentMap.value = state.continent;
    pathGrid.value = state.pathGrid;
    manualPathGrid.value = state.manualPathGrid;
    bridgeGrid.value = state.bridgeGrid;
    wilderness.value = state.wilderness;
    if (boundsForPreview && rawPreviewBuffer.value) {
      const updatedPreview = updatePreviewBufferInBounds(
        rawPreviewBuffer.value,
        state.continent,
        state.pathGrid,
        boundsForPreview
      );
      if (updatedPreview) {
        rawPreviewBuffer.value = updatedPreview;
      }
    }
  }

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

  function clampActiveDefectSelection(): void {
    const len = filteredDefectRecords.value.length;
    if (len === 0) {
      activeDefectIndex.value = -1;
    } else if (activeDefectIndex.value >= len) {
      activeDefectIndex.value = len - 1;
    }
  }

  function refreshDetectedDefects(bounds?: DirtyTileBounds): number {
    if (!continentMap.value) {
      defectRecords.value = [];
      detectedDefectCount.value = 0;
      activeDefectIndex.value = -1;
      return 0;
    }

    if (bounds) {
      const scanBounds = expandDirtyBounds(
        bounds,
        DEFECT_RESCAN_MARGIN_TILES,
        continentMap.value.width,
        continentMap.value.height
      );
      const localReport = scanContinentAutotileDefects({
        continent: continentMap.value,
        pathGrid: pathGrid.value,
        manualPathGrid: manualPathGrid.value,
        bridgeGrid: bridgeGrid.value,
        pois: pois.value,
        bounds: scanBounds
      });
      defectRecords.value = mergeDefectRecordsInBounds(
        defectRecords.value,
        scanBounds,
        localReport.defects
      );
    } else {
      const fullReport = scanContinentAutotileDefects({
        continent: continentMap.value,
        pathGrid: pathGrid.value,
        manualPathGrid: manualPathGrid.value,
        bridgeGrid: bridgeGrid.value,
        pois: pois.value
      });
      defectRecords.value = fullReport.defects;
    }

    detectedDefectCount.value = defectRecords.value.length;
    clampActiveDefectSelection();
    return defectRecords.value.length;
  }

  function applyGenerationOutput(
    genOut: FullWorkerGenerationOutput,
    startTileRender: boolean
  ): void {
    if (startTileRender) {
      isRenderingTiles.value = true;
      statusLabel.value = `${PHASE_STATUS_LABELS.rendering} 0%`;
    }
    const cont = genOut.result.continent;
    packedBlit.value = genOut.packedBlit;
    rawPreviewBuffer.value = genOut.result.rawBuffer ?? null;
    continentMap.value = cont;
    pois.value = [...genOut.result.pois];
    routes.value = [...genOut.result.routeNetwork.edges];
    pathGrid.value = genOut.result.routeNetwork.pathGrid;
    manualPathGrid.value = createEmptyBooleanGrid(cont.width, cont.height);
    bridgeGrid.value = genOut.result.routeNetwork.bridgeGrid;
    maritimeRockObstacles.value = [...(genOut.result.routeNetwork.maritimeRockObstacles ?? [])];
    wilderness.value = genOut.result.wilderness;
    ledges.value = [...(genOut.result.ledges ?? [])];
    progressionObstacles.value = [...(genOut.result.progressionObstacles ?? [])];
    microVignettes.value = [...(genOut.result.microVignettes ?? [])];

    resetManualEditTracker(manualEditTracker);
    clearHistoryStacks();

    const editsToApply = pendingManualMapEdits;
    pendingManualMapEdits = null;
    if (editsToApply) {
      const baseState = getCurrentEditableState();
      if (baseState) {
        const applied = applySerializedManualEditsToState(
          { ...baseState, pois: pois.value },
          editsToApply
        );
        applyStateToStore(applied, applied.dirtyBounds);
        const rehydratedState = getCurrentEditableState();
        if (rehydratedState) {
          recordManualEditDiff(manualEditTracker, baseState, rehydratedState, applied.dirtyBounds);
        }
      }
    }

    if (!editsToApply && genOut.defectRecords) {
      defectRecords.value = genOut.defectRecords;
      detectedDefectCount.value = genOut.defectRecords.length;
    } else {
      refreshDetectedDefects();
    }
    activeDefectIndex.value = -1;
    lastDirtyRectUpdate.value = null;
    fullRenderVersion.value += 1;
    isGenerating.value = false;
    if (!startTileRender && !isPendingDebounce.value) {
      statusLabel.value = 'Listo';
    }
  }

  function applyHealAllResult(output: HealAllWorkerJobOutput, startTileRender: boolean): void {
    const beforeState = pendingHealAllBeforeState;
    pendingHealAllBeforeState = null;

    if (startTileRender) {
      isRenderingTiles.value = true;
      statusLabel.value = `${PHASE_STATUS_LABELS.rendering} 0%`;
    }

    packedBlit.value = output.packedBlit;
    rawPreviewBuffer.value = output.rawBuffer;
    continentMap.value = output.continent;
    pathGrid.value = output.pathGrid;
    if (output.manualPathGrid !== undefined) {
      manualPathGrid.value = output.manualPathGrid;
    }
    if (output.bridgeGrid !== undefined) {
      bridgeGrid.value = output.bridgeGrid;
    }
    if (output.wilderness !== undefined) {
      wilderness.value = output.wilderness;
    }

    if (output.defectRecords) {
      defectRecords.value = output.defectRecords;
      detectedDefectCount.value = output.defectRecords.length;
    } else {
      refreshDetectedDefects();
    }
    activeDefectIndex.value = -1;

    const afterState = getCurrentEditableState();
    if (beforeState && afterState && output.repairedCount > 0) {
      const fullBounds = buildFullMapSummary(
        output.continent.width,
        output.continent.height
      ).dirtyBounds;
      recordManualEditDiff(manualEditTracker, beforeState, afterState, fullBounds);
      pushDeltaToUndoStack(
        captureDirtyRectHistoryDelta(
          beforeState,
          afterState,
          fullBounds,
          buildFullMapSummary(output.continent.width, output.continent.height)
        )
      );
    }

    lastHealedReport.value = `Mapa sanado (-${output.repairedCount} defectos)`;
    lastDirtyRectUpdate.value = null;
    fullRenderVersion.value += 1;
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
          defectRecords: resp.defectRecords,
          packedBlit: resp.packedBlit
        },
        true
      );
      return;
    }
    if (resp.type === 'HEAL_ALL_COMPLETE') {
      applyHealAllResult(resp.output, true);
      return;
    }
    if (resp.type === 'REROUTE_COMPLETE') {
      packedBlit.value = null;
      pois.value = [...resp.updatedNodes];
      routes.value = [...resp.updatedEdges];
      fullRenderVersion.value += 1;
      isGenerating.value = false;
      statusLabel.value = 'Listo';
      return;
    }
    pendingHealAllBeforeState = null;
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
        pendingHealAllBeforeState = null;
        isGenerating.value = false;
        statusLabel.value = 'Listo';
      };
    } catch (e) {
      console.error('[RegionalContinentStudio] Failed to instantiate Web Worker:', e);
      workerInstance = null;
    }
    return workerInstance;
  }

  function beginHealingStroke(): void {
    if (!activeStrokeStartState) {
      activeStrokeStartState = getCurrentEditableState();
      activeStrokeDirtyBounds = null;
      activeStrokeChangedCount = 0;
      activeStrokeLastSummary = null;
    }
  }

  function endHealingStroke(): void {
    const startState = activeStrokeStartState;
    const endState = getCurrentEditableState();
    const bounds = activeStrokeDirtyBounds;
    const changed = activeStrokeChangedCount;
    const summary = activeStrokeLastSummary;
    clearStrokeState();

    if (!startState || !endState || !bounds || !summary) return;
    if (changed === 0 && countEditableDiffInBounds(startState, endState, bounds) === 0) {
      return;
    }

    pushDeltaToUndoStack(captureDirtyRectHistoryDelta(startState, endState, bounds, summary));
    refreshDetectedDefects(bounds);
  }

  function cancelActiveBrushStroke(): void {
    const restore = activeStrokeStartState;
    const bounds = activeStrokeDirtyBounds;
    const beforeCancel = getCurrentEditableState();
    clearStrokeState();
    if (!restore) return;

    applyStateToStore(restore, bounds ?? undefined);
    if (bounds) {
      if (beforeCancel) {
        recordManualEditDiff(manualEditTracker, beforeCancel, restore, bounds);
      }
      emitDirtyRectSignal(bounds);
      refreshDetectedDefects(bounds);
    }
  }

  function toggleHealingBrush(force?: boolean): void {
    isHealingBrushActive.value = force !== undefined ? force : !isHealingBrushActive.value;
    if (isHealingBrushActive.value && defectRecords.value.length === 0 && continentMap.value) {
      refreshDetectedDefects();
    }
  }

  function setHealingBrushDomain(domain: HealingDomain): void {
    healingBrushDomain.value = domain;
  }

  function setDefectFilterDomain(domain: HealingDomain): void {
    defectFilterDomain.value = domain;
    activeDefectIndex.value = -1;
  }

  function setBrushMode(mode: BrushMode): void {
    brushMode.value = mode;
  }

  function setBrushShape(shape: BrushShape): void {
    brushShape.value = shape;
  }

  function setBrushSize(size: BrushSizeOption): void {
    brushSize.value = size;
  }

  function stepBrushSize(delta: 1 | -1): void {
    const curIdx = BRUSH_SIZE_OPTIONS.indexOf(brushSize.value);
    const nextIdx = Math.max(0, Math.min(BRUSH_SIZE_OPTIONS.length - 1, curIdx + delta));
    brushSize.value = BRUSH_SIZE_OPTIONS[nextIdx]!;
  }

  function setPaintTarget(target: TerrainPaintTarget): void {
    paintTarget.value = target;
  }

  function setMountainPalette(palette: MountainPalette): void {
    mountainPalette.value = palette;
  }

  function setMountainPolicy(policy: MountainHealPolicy): void {
    mountainPolicy.value = policy;
  }

  function setAutoHealOnPaint(enabled: boolean): void {
    autoHealOnPaint.value = enabled;
  }

  function requestFocusOnGrid(gridX: number, gridY: number, minZoom = MIN_DEFECT_FOCUS_ZOOM): void {
    cameraFocusRevision += 1;
    cameraFocusRequest.value = {
      requestId: cameraFocusRevision,
      gridX,
      gridY,
      minZoom
    };
  }

  function selectDefectByIndex(index: number, focus = true): void {
    const list = filteredDefectRecords.value;
    if (index < 0 || index >= list.length) {
      activeDefectIndex.value = -1;
      return;
    }
    activeDefectIndex.value = index;
    const record = list[index]!;
    if (focus) {
      requestFocusOnGrid(record.x, record.y);
    }
  }

  function stepToDefect(direction: 1 | -1): void {
    const len = filteredDefectRecords.value.length;
    if (len === 0) {
      activeDefectIndex.value = -1;
      return;
    }
    const nextIdx =
      activeDefectIndex.value < 0 || activeDefectIndex.value >= len
        ? direction > 0
          ? 0
          : len - 1
        : (activeDefectIndex.value + direction + len) % len;
    selectDefectByIndex(nextIdx, true);
  }

  function commitIncrementalMutation(
    beforeState: ContinentEditableState,
    afterState: ContinentEditableState,
    dirtyBounds: DirtyTileBounds,
    changedCount: number,
    summary: ContinentHealingSummary
  ): void {
    const wildernessChanged = afterState.wilderness !== beforeState.wilderness;
    const totalModified = changedCount + (wildernessChanged ? 1 : 0);
    if (totalModified === 0) {
      return;
    }

    recordManualEditDiff(manualEditTracker, beforeState, afterState, dirtyBounds);
    applyStateToStore(afterState, dirtyBounds);
    emitDirtyRectSignal(dirtyBounds);

    if (activeStrokeStartState) {
      activeStrokeDirtyBounds = mergeDirtyBounds(activeStrokeDirtyBounds, dirtyBounds);
      activeStrokeChangedCount += totalModified;
      activeStrokeLastSummary = summary;
      return;
    }

    pushDeltaToUndoStack(
      captureDirtyRectHistoryDelta(beforeState, afterState, dirtyBounds, summary)
    );
    refreshDetectedDefects(dirtyBounds);
  }

  function applyPaintResult(
    beforeState: ContinentEditableState,
    mutation: ContinentPaintMutationResult
  ): ContinentPaintMutationResult {
    const { summary } = mutation;
    const capNotice = mutation.floodCapReached ? ` [límite ${MAX_FLOOD_FILL_CELLS}]` : '';
    lastHealedReport.value = `(${summary.targetX}, ${summary.targetY}) ${summary.targetRole} (${mutation.changedCellCount} tiles)${capNotice}`;

    const afterState: ContinentEditableState = {
      continent: mutation.continent,
      pathGrid: mutation.pathGrid,
      manualPathGrid: mutation.manualPathGrid,
      bridgeGrid: mutation.bridgeGrid,
      wilderness: mutation.wilderness
    };

    commitIncrementalMutation(
      beforeState,
      afterState,
      summary.dirtyBounds,
      mutation.changedCellCount,
      summary
    );

    return mutation;
  }

  function healTileAt(x: number, y: number): ContinentHealingMutationResult | null {
    const beforeState = getCurrentEditableState();
    if (!beforeState) return null;

    const mutation = healContinentAt(beforeState.continent, beforeState.pathGrid, x, y, {
      domain: healingBrushDomain.value,
      radius: brushSizeToRadius(brushSize.value),
      shape: brushShape.value,
      mountainPolicy: mountainPolicy.value,
      pois: pois.value,
      bridgeGrid: beforeState.bridgeGrid,
      manualPathGrid: beforeState.manualPathGrid,
      wilderness: beforeState.wilderness
    });

    const { summary } = mutation;
    lastHealedReport.value = `(${summary.targetX}, ${summary.targetY}) ${summary.targetRole} [${summary.detectedDomain}] -${summary.repairedCount}`;

    const afterState: ContinentEditableState = {
      continent: mutation.continent,
      pathGrid: mutation.pathGrid,
      manualPathGrid: mutation.manualPathGrid ?? beforeState.manualPathGrid,
      bridgeGrid: mutation.bridgeGrid ?? beforeState.bridgeGrid,
      wilderness: mutation.wilderness ?? beforeState.wilderness
    };

    commitIncrementalMutation(
      beforeState,
      afterState,
      summary.dirtyBounds,
      summary.changedCellCount ?? 0,
      summary
    );

    return mutation;
  }

  function paintAt(x: number, y: number): ContinentPaintMutationResult | null {
    const beforeState = getCurrentEditableState();
    if (!beforeState) return null;

    const isElevationStep =
      paintTarget.value === 'elevation_raise' || paintTarget.value === 'elevation_lower';
    const mutation = paintContinentCells(
      { ...beforeState, pois: pois.value },
      [{ x, y }],
      brushConfig.value,
      activeStrokeStartState && isElevationStep
        ? {
            skipFlatIndices: activeElevationStrokeVisited,
            visitedFlatIndicesOut: activeElevationStrokeVisited
          }
        : undefined
    );
    lastStrokeEndPoint.value = { x, y };
    return applyPaintResult(beforeState, mutation);
  }

  function paintLine(from: GridPoint2D, to: GridPoint2D): ContinentPaintMutationResult | null {
    const beforeState = getCurrentEditableState();
    if (!beforeState) return null;

    const mutation = paintContinentLine(
      { ...beforeState, pois: pois.value },
      from,
      to,
      brushConfig.value
    );
    lastStrokeEndPoint.value = to;
    return applyPaintResult(beforeState, mutation);
  }

  function floodFillAt(x: number, y: number): ContinentPaintMutationResult | null {
    const beforeState = getCurrentEditableState();
    if (!beforeState) return null;

    const mutation = floodFillContinentAt(
      { ...beforeState, pois: pois.value },
      x,
      y,
      brushConfig.value
    );
    lastStrokeEndPoint.value = { x, y };
    return applyPaintResult(beforeState, mutation);
  }

  function eyedropAt(x: number, y: number): PaintSampleResult | null {
    const beforeState = getCurrentEditableState();
    if (!beforeState) return null;

    const sample = sampleContinentCellAt({ ...beforeState, pois: pois.value }, x, y);
    lastBrushSample.value = sample;
    paintTarget.value = sample.recommendedTarget;
    mountainPalette.value = sample.recommendedPalette;
    lastHealedReport.value = `Muestra (${sample.x}, ${sample.y}): ${sample.description}`;
    if (brushMode.value === 'eyedropper') {
      brushMode.value = 'paint';
    }
    return sample;
  }

  function applyBrushToolAt(x: number, y: number): void {
    if (brushMode.value === 'heal') {
      healTileAt(x, y);
      return;
    }
    if (brushMode.value === 'fill') {
      floodFillAt(x, y);
      return;
    }
    if (brushMode.value === 'eyedropper') {
      eyedropAt(x, y);
      return;
    }
    paintAt(x, y);
  }

  function healEntireMapDefects(): void {
    const beforeState = getCurrentEditableState();
    if (!beforeState) return;

    pendingHealAllBeforeState = beforeState;
    clearPendingDebounce();
    resetBusyWorkerIfNeeded();

    const nextJobId = ++currentJobId.value;
    isGenerating.value = true;
    statusLabel.value = 'Sanando mapa...';

    const input = {
      continent: beforeState.continent,
      pathGrid: beforeState.pathGrid,
      manualPathGrid: beforeState.manualPathGrid,
      bridgeGrid: beforeState.bridgeGrid,
      pois: pois.value,
      wilderness: beforeState.wilderness,
      ledges: ledges.value,
      progressionObstacles: progressionObstacles.value,
      microVignettes: microVignettes.value,
      domain: 'auto' as const,
      mountainPolicy: mountainPolicy.value
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
      applyHealAllResult(out, false);
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
    pendingManualMapEdits = null;
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
    pendingManualMapEdits = null;
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
      fullRenderVersion.value += 1;
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
      fullRenderVersion.value += 1;
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
      fullRenderVersion.value += 1;
    }
  }

  function undo(): void {
    const delta = undoStack.value.at(-1);
    const current = getCurrentEditableState();
    if (!delta || !current) return;

    const restored = applyDirtyRectHistoryDelta(current, delta, 'undo', pois.value);
    redoStack.value = [...redoStack.value, delta];
    undoStack.value = undoStack.value.slice(0, -1);

    recordManualEditDiff(manualEditTracker, current, restored, delta.bounds);
    applyStateToStore(restored, delta.bounds);
    emitDirtyRectSignal(delta.bounds);
    refreshDetectedDefects(delta.bounds);
  }

  function redo(): void {
    const delta = redoStack.value.at(-1);
    const current = getCurrentEditableState();
    if (!delta || !current) return;

    const restored = applyDirtyRectHistoryDelta(current, delta, 'redo', pois.value);
    undoStack.value = [...undoStack.value, delta];
    redoStack.value = redoStack.value.slice(0, -1);

    recordManualEditDiff(manualEditTracker, current, restored, delta.bounds);
    applyStateToStore(restored, delta.bounds);
    emitDirtyRectSignal(delta.bounds);
    refreshDetectedDefects(delta.bounds);
  }

  function createBlankProject(name: string): void {
    projectName.value = name;
  }

  function buildProjectExportPayload(): ContinentProjectExportPayload {
    const manualMapEdits = buildSerializedManualEdits(manualEditTracker, getCurrentEditableState());
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
      routes: routes.value,
      ...(manualMapEdits ? { manualMapEdits } : {})
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
    pendingManualMapEdits = project.manualMapEdits ?? null;
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
    pendingManualMapEdits = null;
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
    undoStack,
    redoStack,
    canUndo,
    canRedo,
    isHealingBrushActive,
    healingBrushDomain,
    brushMode,
    brushShape,
    brushSize,
    paintTarget,
    mountainPalette,
    mountainPolicy,
    autoHealOnPaint,
    brushConfig,
    lastHealedReport,
    lastBrushSample,
    lastStrokeEndPoint,
    defectRecords,
    detectedDefectCount,
    defectFilterDomain,
    defectCountsByDomain,
    filteredDefectRecords,
    activeDefectIndex,
    activeDefect,
    cameraFocusRequest,
    fullRenderVersion,
    lastDirtyRectUpdate,

    // Data
    continentMap,
    pois,
    routes,
    pathGrid,
    manualPathGrid,
    bridgeGrid,
    maritimeRockObstacles,
    wilderness,
    ledges,
    progressionObstacles,
    microVignettes,
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
    setDefectFilterDomain,
    setBrushMode,
    setBrushShape,
    setBrushSize,
    stepBrushSize,
    setPaintTarget,
    setMountainPalette,
    setMountainPolicy,
    setAutoHealOnPaint,
    beginHealingStroke,
    endHealingStroke,
    cancelActiveBrushStroke,
    refreshDetectedDefects,
    selectDefectByIndex,
    stepToDefect,
    requestFocusOnGrid,
    healTileAt,
    paintAt,
    paintLine,
    floodFillAt,
    eyedropAt,
    applyBrushToolAt,
    healEntireMapDefects,
    beginTileRender,
    updateRenderProgress,
    finishTileRender
  };
});
