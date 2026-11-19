<script setup lang="ts">
/**
 * src/views/studio/RegionalContinentStudioView.vue
 *
 * REGIONAL CONTINENT STUDIO WORKSPACE VIEW
 *
 * Orchestrates:
 *   1. Left sidebar: ContinentStudioControls with 250ms debounced sliders.
 *   2. Center viewport: Pan/zoom canvas with zero-copy buffer blitter and superimposed RegionalNetworkSvgOverlay.
 *   3. Right drawer: POIDetailDrawer for settlement architecture and route inspection.
 */

import gsap from 'gsap';
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

import ContinentStudioControls from '../components/studio/ContinentStudioControls.vue';
import POIDetailDrawer from '../components/studio/POIDetailDrawer.vue';
import RegionalBrushDock from '../components/studio/RegionalBrushDock.vue';
import RegionalNetworkSvgOverlay from '../components/studio/RegionalNetworkSvgOverlay.vue';
import RegionalStudioToolbar from '../components/studio/RegionalStudioToolbar.vue';
import RegionalUrbanSvgOverlay from '../components/studio/RegionalUrbanSvgOverlay.vue';
import {
  CAMERA_FOCUS_ANIM_SEC,
  DOCK_ANIM_SEC,
  TOUCH_RETICLE_Y_OFFSET_PX
} from '../config/brushConfig.ts';
import {
  CANVAS_TILE_SIZE,
  STUDIO_MOBILE_BREAKPOINT_PX,
  STUDIO_TILE_SIZE,
  VIEWPORT_ZOOM_IN_STEP,
  VIEWPORT_ZOOM_OUT_STEP
} from '../config/studioConstants.ts';
import { compilePackedMapBlitBuffer } from '../logic/map/canvasTileRenderer.ts';
import {
  renderPackedContinentTilemap,
  renderRegionalContinentDirtyRect
} from '../logic/map/canvasViewportBlitter.ts';
import {
  bresenhamLinePoints,
  brushSizeToRadius,
  mergeDirtyBounds
} from '../logic/utils/gridGeometryUtils.ts';
import { useRegionalContinentStudioStore } from '../stores/continentStudioStore.ts';
import type { DirtyTileBounds } from '../types/map/autotileHealingTypes.ts';
import type { GridPoint2D } from '../types/map/continentBrushTypes.ts';

const MIN_CONTINENT_STUDIO_ZOOM = 0.15;
const MOBILE_INITIAL_VIEWPORT_ZOOM = 0.35;
const DOCK_ENTER_OFFSET_Y_PX = 14;
const DOCK_ENTER_INITIAL_SCALE = 0.96;
const DOCK_LEAVE_OFFSET_Y_PX = 10;
const DOCK_LEAVE_SCALE = 0.97;
const DOCK_LEAVE_DURATION_RATIO = 0.8;
const KEYBOARD_PAN_TAP_STEP_PX = 48;
const KEYBOARD_PAN_TICK_SPEED_PX = 12;
const MAX_KEYBOARD_PAN_DELTA_RATIO = 3;

type KeyboardPanAxis = 'up' | 'down' | 'left' | 'right';

function resolveKeyboardPanAxis(lowerKey: string): KeyboardPanAxis | null {
  switch (lowerKey) {
    case 'w':
    case 'arrowup':
      return 'up';
    case 's':
    case 'arrowdown':
      return 'down';
    case 'a':
    case 'arrowleft':
      return 'left';
    case 'd':
    case 'arrowright':
      return 'right';
    default:
      return null;
  }
}

const store = useRegionalContinentStudioStore();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const viewportContainerRef = ref<HTMLDivElement | null>(null);
const isMobileControlsOpen = ref<boolean>(false);

function getInitialViewportZoom(): number {
  if (
    typeof globalThis.window !== 'undefined' &&
    globalThis.window.innerWidth > 0 &&
    globalThis.window.innerWidth <= STUDIO_MOBILE_BREAKPOINT_PX
  ) {
    return MOBILE_INITIAL_VIEWPORT_ZOOM;
  }
  return 1.0;
}

// Pan & Zoom viewport state
const zoom = ref<number>(getInitialViewportZoom());
const panX = ref<number>(0);
const panY = ref<number>(0);
const isPanning = ref<boolean>(false);
const panStart = ref<{ x: number; y: number }>({ x: 0, y: 0 });

const activePointers = new Map<number, { x: number; y: number }>();
let initialPinchDistance = 0;
let initialPinchZoom = 1.0;
let activeRenderAbort: AbortController | null = null;
let activeCameraTween: gsap.core.Tween | null = null;
let activeDockTween: gsap.core.Tween | null = null;

const transformStyle = computed(() => ({
  transform: `translate3d(${panX.value}px, ${panY.value}px, 0) scale(${zoom.value})`,
  transformOrigin: '0 0'
}));

const VIEWPORT_BUTTON_ZOOM_STEP = 1.25;

function zoomIn(): void {
  zoom.value = Math.min(4.0, zoom.value * VIEWPORT_BUTTON_ZOOM_STEP);
}

function zoomOut(): void {
  zoom.value = Math.max(MIN_CONTINENT_STUDIO_ZOOM, zoom.value / VIEWPORT_BUTTON_ZOOM_STEP);
}

let queuedDirtyBounds: DirtyTileBounds | null = null;
let pendingDirtyRafId: number | null = null;
let isBlittingDirtyRect = false;

function resetDirtyRectQueue(): void {
  queuedDirtyBounds = null;
  if (pendingDirtyRafId !== null && typeof globalThis.cancelAnimationFrame === 'function') {
    globalThis.cancelAnimationFrame(pendingDirtyRafId);
  }
  pendingDirtyRafId = null;
}

async function flushDirtyRectQueue(): Promise<void> {
  if (isBlittingDirtyRect) return;
  isBlittingDirtyRect = true;
  try {
    while (queuedDirtyBounds) {
      const nextBounds = queuedDirtyBounds;
      queuedDirtyBounds = null;
      const canvas = canvasRef.value;
      const continent = store.continentMap;
      if (!canvas || !continent) break;

      const routeNetworkSnapshot = {
        nodes: store.pois,
        edges: store.routes,
        pathGrid: store.pathGrid,
        bridgeGrid: store.bridgeGrid,
        maritimeRockObstacles: store.maritimeRockObstacles
      };
      await renderRegionalContinentDirtyRect(canvas, continent, nextBounds, {
        pois: store.pois,
        pathGrid: store.pathGrid,
        manualPathGrid: store.manualPathGrid,
        bridgeGrid: store.bridgeGrid,
        wilderness: store.wilderness,
        ledges: store.ledges,
        progressionObstacles: store.progressionObstacles,
        microVignettes: store.microVignettes,
        routeNetwork: routeNetworkSnapshot
      });
    }
  } finally {
    isBlittingDirtyRect = false;
  }
}

function scheduleDirtyRectDrain(): void {
  if (isBlittingDirtyRect || pendingDirtyRafId !== null || !queuedDirtyBounds) return;
  if (typeof globalThis.requestAnimationFrame === 'function') {
    pendingDirtyRafId = globalThis.requestAnimationFrame(() => {
      pendingDirtyRafId = null;
      void flushDirtyRectQueue();
    });
    return;
  }
  void flushDirtyRectQueue();
}

function enqueueDirtyRectRender(bounds: DirtyTileBounds): void {
  queuedDirtyBounds = mergeDirtyBounds(queuedDirtyBounds, bounds);
  scheduleDirtyRectDrain();
}

/**
 * Progressively renders the 32x32 GBA tilemap in <= 6ms frame slices without blocking UI input.
 */
async function renderFullTilemap(): Promise<void> {
  activeRenderAbort?.abort();
  const canvas = canvasRef.value;
  const continent = store.continentMap;
  if (!canvas || !continent) {
    store.finishTileRender();
    return;
  }

  const controller = new AbortController();
  activeRenderAbort = controller;
  store.beginTileRender();

  try {
    const routeNetworkSnapshot = {
      nodes: store.pois,
      edges: store.routes,
      pathGrid: store.pathGrid,
      bridgeGrid: store.bridgeGrid,
      maritimeRockObstacles: store.maritimeRockObstacles
    };
    const activePackedBlit =
      store.packedBlit ??
      compilePackedMapBlitBuffer(
        continent,
        store.pois,
        store.pathGrid,
        store.bridgeGrid,
        store.wilderness,
        {
          manualPathGrid: store.manualPathGrid,
          ledges: store.ledges,
          progressionObstacles: store.progressionObstacles,
          microVignettes: store.microVignettes,
          routeNetwork: routeNetworkSnapshot
        }
      );

    await renderPackedContinentTilemap({
      canvas,
      continentWidth: continent.width,
      continentHeight: continent.height,
      packedBlit: activePackedBlit,
      rawPreviewBuffer: store.rawPreviewBuffer,
      signal: controller.signal,
      onProgress: (pct) => {
        if (activeRenderAbort === controller) {
          store.updateRenderProgress(pct);
        }
      }
    });
  } finally {
    if (activeRenderAbort === controller) {
      activeRenderAbort = null;
      store.finishTileRender();
    }
  }
}

let lastCenteredSignature = '';
watch(
  () => store.fullRenderVersion,
  () => {
    resetDirtyRectQueue();
    const continent = store.continentMap;
    if (continent) {
      const sig = `${continent.width}x${continent.height}:${store.projectName}`;
      if (sig !== lastCenteredSignature) {
        lastCenteredSignature = sig;
        resetView();
      }
    }
    void renderFullTilemap();
  }
);

watch(
  () => store.lastDirtyRectUpdate,
  (update) => {
    if (update) {
      enqueueDirtyRectRender(update.bounds);
    }
  }
);

watch(
  () => [store.isHealingBrushActive, store.brushMode] as const,
  ([active, mode]) => {
    if (!active || mode !== 'line') {
      lineAnchorTile.value = null;
    }
  }
);

watch(
  () => store.cameraFocusRequest,
  (req) => {
    if (!req || !viewportContainerRef.value) return;
    const rect = viewportContainerRef.value.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const targetZoom = Math.min(4.0, Math.max(zoom.value, req.minZoom));
    const worldCenterX = req.gridX * CANVAS_TILE_SIZE + STUDIO_TILE_SIZE;
    const worldCenterY = req.gridY * CANVAS_TILE_SIZE + STUDIO_TILE_SIZE;
    const targetPanX = rect.width / 2 - worldCenterX * targetZoom;
    const targetPanY = rect.height / 2 - worldCenterY * targetZoom;

    activeCameraTween?.kill();
    const proxy = { x: panX.value, y: panY.value, z: zoom.value };
    activeCameraTween = gsap.to(proxy, {
      x: targetPanX,
      y: targetPanY,
      z: targetZoom,
      duration: CAMERA_FOCUS_ANIM_SEC,
      ease: 'power2.out',
      onUpdate: () => {
        panX.value = proxy.x;
        panY.value = proxy.y;
        zoom.value = proxy.z;
      },
      onComplete: () => {
        activeCameraTween = null;
      }
    });
  }
);

const isShiftKeyDown = ref<boolean>(false);
const activePanAxes = new Set<KeyboardPanAxis>();
let isKeyboardPanTickerAttached = false;
let lastViewportPointer: { x: number; y: number; pointerType?: string } | null = null;

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

function refreshHoverBrushFromLastPointer(): void {
  if (!store.isHealingBrushActive || !lastViewportPointer || isHealingDrag) return;
  hoverBrushTile.value = resolveViewportTileCoords(
    lastViewportPointer.x,
    lastViewportPointer.y,
    lastViewportPointer.pointerType
  );
}

function applyKeyboardPanStep(stepPx: number): void {
  let dx = 0;
  let dy = 0;
  if (activePanAxes.has('left')) dx += stepPx;
  if (activePanAxes.has('right')) dx -= stepPx;
  if (activePanAxes.has('up')) dy += stepPx;
  if (activePanAxes.has('down')) dy -= stepPx;
  if (dx === 0 && dy === 0) return;

  activeCameraTween?.kill();
  activeCameraTween = null;
  panX.value += dx;
  panY.value += dy;
  refreshHoverBrushFromLastPointer();
}

function stopKeyboardPanTicker(): void {
  if (!isKeyboardPanTickerAttached) return;
  isKeyboardPanTickerAttached = false;
  gsap.ticker.remove(onKeyboardPanTick);
}

function onKeyboardPanTick(): void {
  if (activePanAxes.size === 0) {
    stopKeyboardPanTicker();
    return;
  }
  const ratio = Math.min(MAX_KEYBOARD_PAN_DELTA_RATIO, gsap.ticker.deltaRatio(60) || 1);
  applyKeyboardPanStep(KEYBOARD_PAN_TICK_SPEED_PX * ratio);
}

function startKeyboardPanTicker(): void {
  if (isKeyboardPanTickerAttached) return;
  isKeyboardPanTickerAttached = true;
  gsap.ticker.add(onKeyboardPanTick);
}

function clearKeyboardPanState(): void {
  activePanAxes.clear();
  stopKeyboardPanTicker();
}

function handleKeyDown(e: KeyboardEvent): void {
  isShiftKeyDown.value = e.shiftKey;

  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) {
      store.redo();
    } else {
      store.undo();
    }
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    store.redo();
    return;
  }

  if (isEditableKeyboardTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) {
    return;
  }

  if (e.key === 'Escape' && lineAnchorTile.value) {
    e.preventDefault();
    onHealingPointerCancel();
    return;
  }

  const lower = e.key.toLowerCase();
  const panAxis = resolveKeyboardPanAxis(lower);
  if (panAxis) {
    e.preventDefault();
    const isNewPress = !activePanAxes.has(panAxis);
    activePanAxes.add(panAxis);
    if (isNewPress) {
      applyKeyboardPanStep(KEYBOARD_PAN_TAP_STEP_PX);
    }
    startKeyboardPanTicker();
    return;
  }

  if (lower === 'b') {
    e.preventDefault();
    store.toggleHealingBrush();
    return;
  }

  if (!store.isHealingBrushActive) return;
  if (e.key === '[') {
    e.preventDefault();
    store.stepBrushSize(-1);
  } else if (e.key === ']') {
    e.preventDefault();
    store.stepBrushSize(1);
  }
}

function handleKeyUp(e: KeyboardEvent): void {
  isShiftKeyDown.value = e.shiftKey;
  const panAxis = resolveKeyboardPanAxis(e.key.toLowerCase());
  if (panAxis) {
    activePanAxes.delete(panAxis);
    if (activePanAxes.size === 0) {
      stopKeyboardPanTicker();
    }
  }
}

function handleWindowBlur(): void {
  isShiftKeyDown.value = false;
  clearKeyboardPanState();
}

function beforeDockEnter(el: Element): void {
  gsap.set(el, { opacity: 0, y: DOCK_ENTER_OFFSET_Y_PX, scale: DOCK_ENTER_INITIAL_SCALE });
}

function onDockEnter(el: Element, done: () => void): void {
  activeDockTween?.kill();
  activeDockTween = gsap.to(el, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: DOCK_ANIM_SEC,
    ease: 'power2.out',
    onComplete: () => {
      activeDockTween = null;
      done();
    }
  });
}

function onDockLeave(el: Element, done: () => void): void {
  activeDockTween?.kill();
  activeDockTween = gsap.to(el, {
    opacity: 0,
    y: DOCK_LEAVE_OFFSET_Y_PX,
    scale: DOCK_LEAVE_SCALE,
    duration: DOCK_ANIM_SEC * DOCK_LEAVE_DURATION_RATIO,
    ease: 'power2.in',
    onComplete: () => {
      activeDockTween = null;
      done();
    }
  });
}

onMounted(() => {
  globalThis.addEventListener('keydown', handleKeyDown);
  globalThis.addEventListener('keyup', handleKeyUp);
  globalThis.addEventListener('blur', handleWindowBlur);
  // Trigger initial generation if not already present
  if (!store.continentMap) {
    store.executeGenerationNow();
  } else {
    void renderFullTilemap();
  }
});

// Viewport Mouse Wheel Zooming
function handleWheel(e: WheelEvent): void {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? VIEWPORT_ZOOM_IN_STEP : VIEWPORT_ZOOM_OUT_STEP;
  const nextZoom = Math.max(MIN_CONTINENT_STUDIO_ZOOM, Math.min(4.0, zoom.value * zoomFactor));

  if (!viewportContainerRef.value) return;
  const rect = viewportContainerRef.value.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  panX.value = mouseX - (mouseX - panX.value) * (nextZoom / zoom.value);
  panY.value = mouseY - (mouseY - panY.value) * (nextZoom / zoom.value);
  zoom.value = nextZoom;
}

// Viewport Pan, Pinch & Drag Controller
function onWindowPointerMove(e: PointerEvent): void {
  if (activePointers.has(e.pointerId)) {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  }

  if (activePointers.size === 2 && initialPinchDistance > 0) {
    const pts = Array.from(activePointers.values());
    const p1 = pts[0];
    const p2 = pts[1];
    if (p1 && p2) {
      const currentDistance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      const factor = currentDistance / initialPinchDistance;
      zoom.value = Math.max(MIN_CONTINENT_STUDIO_ZOOM, Math.min(4.0, initialPinchZoom * factor));
    }
  } else if (isPanning.value && activePointers.size === 1) {
    panX.value = e.clientX - panStart.value.x;
    panY.value = e.clientY - panStart.value.y;
  }
}

function onWindowPointerUp(e: PointerEvent): void {
  activePointers.delete(e.pointerId);

  if (activePointers.size === 1) {
    const remaining = Array.from(activePointers.values())[0];
    if (remaining) {
      isPanning.value = true;
      panStart.value = { x: remaining.x - panX.value, y: remaining.y - panY.value };
    }
  } else if (activePointers.size === 0) {
    isPanning.value = false;
    initialPinchDistance = 0;
    globalThis.removeEventListener('pointermove', onWindowPointerMove);
    globalThis.removeEventListener('pointerup', onWindowPointerUp);
    globalThis.removeEventListener('pointercancel', onWindowPointerUp);
  }
}

function stopPanning(): void {
  isPanning.value = false;
  activePointers.clear();
  initialPinchDistance = 0;
  globalThis.removeEventListener('pointermove', onWindowPointerMove);
  globalThis.removeEventListener('pointerup', onWindowPointerUp);
  globalThis.removeEventListener('pointercancel', onWindowPointerUp);
}

let isHealingDrag = false;
let lastDraggedTile: GridPoint2D | null = null;
let activeBrushPointer: { readonly pointerId: number; x: number; y: number } | null = null;
const hoverBrushTile = ref<GridPoint2D | null>(null);
const lineAnchorTile = ref<GridPoint2D | null>(null);

interface LinePreviewPixels {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

const linePreviewCoords = computed<LinePreviewPixels | null>(() => {
  if (!store.isHealingBrushActive || !hoverBrushTile.value) return null;
  let start: GridPoint2D | null = null;
  if (lineAnchorTile.value) {
    start = lineAnchorTile.value;
  } else if (
    isShiftKeyDown.value &&
    store.lastStrokeEndPoint &&
    (store.brushMode === 'paint' || store.brushMode === 'line')
  ) {
    start = store.lastStrokeEndPoint;
  }
  if (!start) return null;
  return {
    x1: start.x * CANVAS_TILE_SIZE + STUDIO_TILE_SIZE,
    y1: start.y * CANVAS_TILE_SIZE + STUDIO_TILE_SIZE,
    x2: hoverBrushTile.value.x * CANVAS_TILE_SIZE + STUDIO_TILE_SIZE,
    y2: hoverBrushTile.value.y * CANVAS_TILE_SIZE + STUDIO_TILE_SIZE
  };
});

interface ReticleBoxStyle {
  readonly left?: string;
  readonly top?: string;
  readonly width?: string;
  readonly height?: string;
}

const reticleRadius = computed<number>(() => brushSizeToRadius(store.brushSize));
const reticleStyle = computed<ReticleBoxStyle>(() => {
  const tile = hoverBrushTile.value;
  if (!tile) return {};
  const r = reticleRadius.value;
  return {
    left: `${(tile.x - r) * CANVAS_TILE_SIZE}px`,
    top: `${(tile.y - r) * CANVAS_TILE_SIZE}px`,
    width: `${store.brushSize * CANVAS_TILE_SIZE}px`,
    height: `${store.brushSize * CANVAS_TILE_SIZE}px`
  };
});

const lineAnchorStyle = computed<ReticleBoxStyle>(() => {
  const tile = lineAnchorTile.value;
  if (!tile) return {};
  const r = reticleRadius.value;
  return {
    left: `${(tile.x - r) * CANVAS_TILE_SIZE}px`,
    top: `${(tile.y - r) * CANVAS_TILE_SIZE}px`,
    width: `${store.brushSize * CANVAS_TILE_SIZE}px`,
    height: `${store.brushSize * CANVAS_TILE_SIZE}px`
  };
});

watch([() => store.brushMode, () => store.paintTarget, () => store.isHealingBrushActive], () => {
  if (lineAnchorTile.value) {
    lineAnchorTile.value = null;
  }
});

function resolveViewportTileCoords(
  clientX: number,
  clientY: number,
  pointerType?: string
): GridPoint2D | null {
  if (!viewportContainerRef.value || !store.continentMap) return null;
  const rect = viewportContainerRef.value.getBoundingClientRect();
  const adjustedClientY = pointerType === 'touch' ? clientY - TOUCH_RETICLE_Y_OFFSET_PX : clientY;
  const worldX = (clientX - rect.left - panX.value) / zoom.value;
  const worldY = (adjustedClientY - rect.top - panY.value) / zoom.value;
  const x = Math.floor(worldX / CANVAS_TILE_SIZE);
  const y = Math.floor(worldY / CANVAS_TILE_SIZE);
  if (x < 0 || x >= store.continentMap.width || y < 0 || y >= store.continentMap.height) {
    return null;
  }
  return { x, y };
}

function handleViewportPointerMove(e: PointerEvent): void {
  lastViewportPointer = { x: e.clientX, y: e.clientY, pointerType: e.pointerType };
  if (!store.isHealingBrushActive) {
    if (hoverBrushTile.value) hoverBrushTile.value = null;
    return;
  }
  if (!isHealingDrag) {
    hoverBrushTile.value = resolveViewportTileCoords(e.clientX, e.clientY, e.pointerType);
  }
}

function applyBrushStrokeSegment(from: GridPoint2D | null, to: GridPoint2D): void {
  if (!from || (from.x === to.x && from.y === to.y)) {
    store.applyBrushToolAt(to.x, to.y);
  } else {
    const pts = bresenhamLinePoints(from.x, from.y, to.x, to.y);
    for (let i = 1; i < pts.length; i++) {
      const pt = pts[i]!;
      store.applyBrushToolAt(pt.x, pt.y);
    }
  }
  lastDraggedTile = to;
  if (store.brushMode !== 'heal' && store.brushMode !== 'eyedropper') {
    store.lastStrokeEndPoint = to;
  }
}

function detachBrushWindowListeners(): void {
  globalThis.removeEventListener('pointermove', onHealingPointerMove);
  globalThis.removeEventListener('pointerup', onHealingPointerUp);
  globalThis.removeEventListener('pointercancel', onHealingPointerCancel);
}

function cancelBrushDragAndStartPinch(secondEvent: PointerEvent): void {
  const firstPointer = activeBrushPointer;
  detachBrushWindowListeners();
  isHealingDrag = false;
  lastDraggedTile = null;
  lineAnchorTile.value = null;
  activeBrushPointer = null;
  store.cancelActiveBrushStroke();

  if (!firstPointer) return;
  activePointers.clear();
  activePointers.set(firstPointer.pointerId, { x: firstPointer.x, y: firstPointer.y });
  activePointers.set(secondEvent.pointerId, { x: secondEvent.clientX, y: secondEvent.clientY });
  isPanning.value = false;
  initialPinchDistance = Math.hypot(
    secondEvent.clientX - firstPointer.x,
    secondEvent.clientY - firstPointer.y
  );
  initialPinchZoom = zoom.value;
  globalThis.addEventListener('pointermove', onWindowPointerMove);
  globalThis.addEventListener('pointerup', onWindowPointerUp);
  globalThis.addEventListener('pointercancel', onWindowPointerUp);
}

function onHealingPointerMove(e: PointerEvent): void {
  if (!isHealingDrag || (activeBrushPointer && e.pointerId !== activeBrushPointer.pointerId)) {
    return;
  }
  activeBrushPointer = { pointerId: e.pointerId, x: e.clientX, y: e.clientY };
  const coords = resolveViewportTileCoords(e.clientX, e.clientY, e.pointerType);
  hoverBrushTile.value = coords;
  if (!coords) return;

  if (lineAnchorTile.value) {
    return;
  }

  if (lastDraggedTile && lastDraggedTile.x === coords.x && lastDraggedTile.y === coords.y) {
    return;
  }
  applyBrushStrokeSegment(lastDraggedTile, coords);
}

function onHealingPointerUp(): void {
  if (lineAnchorTile.value) {
    const start = lineAnchorTile.value;
    const end = hoverBrushTile.value ?? start;
    isHealingDrag = false;
    lastDraggedTile = null;
    activeBrushPointer = null;
    detachBrushWindowListeners();
    if (start.x !== end.x || start.y !== end.y) {
      lineAnchorTile.value = null;
      store.paintLine(start, end);
    }
    return;
  }

  isHealingDrag = false;
  lastDraggedTile = null;
  activeBrushPointer = null;
  store.endHealingStroke();
  detachBrushWindowListeners();
}

function onHealingPointerCancel(): void {
  isHealingDrag = false;
  lastDraggedTile = null;
  lineAnchorTile.value = null;
  activeBrushPointer = null;
  store.cancelActiveBrushStroke();
  detachBrushWindowListeners();
}

function shouldIgnoreViewportPointerDown(target: HTMLElement | null): boolean {
  return Boolean(
    target?.closest('.viewport-toolbar') ||
    target?.closest('.poi-node-item') ||
    (!store.isHealingBrushActive && target?.closest('.defect-marker-item')) ||
    target?.closest('.regional-brush-dock') ||
    target?.closest('.mobile-viewport-controls') ||
    target?.closest('.continent-studio-controls')
  );
}

function startViewportPanOrPinch(e: PointerEvent): void {
  activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

  if (activePointers.size === 1) {
    isPanning.value = true;
    panStart.value = { x: e.clientX - panX.value, y: e.clientY - panY.value };
  } else if (activePointers.size === 2) {
    isPanning.value = false;
    const pts = Array.from(activePointers.values());
    const p1 = pts[0];
    const p2 = pts[1];
    if (p1 && p2) {
      initialPinchDistance = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      initialPinchZoom = zoom.value;
    }
  }

  globalThis.addEventListener('pointermove', onWindowPointerMove);
  globalThis.addEventListener('pointerup', onWindowPointerUp);
  globalThis.addEventListener('pointercancel', onWindowPointerUp);
}

function attachBrushWindowListeners(): void {
  globalThis.addEventListener('pointermove', onHealingPointerMove);
  globalThis.addEventListener('pointerup', onHealingPointerUp);
  globalThis.addEventListener('pointercancel', onHealingPointerCancel);
}

function handleActiveBrushPointerDown(e: PointerEvent, coords: GridPoint2D): void {
  hoverBrushTile.value = coords;

  if (e.altKey || store.brushMode === 'eyedropper') {
    store.eyedropAt(coords.x, coords.y);
    return;
  }

  if (store.brushMode === 'fill') {
    store.floodFillAt(coords.x, coords.y);
    return;
  }

  if (
    e.shiftKey &&
    store.lastStrokeEndPoint &&
    (store.brushMode === 'paint' || store.brushMode === 'line')
  ) {
    store.paintLine(store.lastStrokeEndPoint, coords);
    return;
  }

  if (store.brushMode === 'line') {
    if (lineAnchorTile.value) {
      const start = lineAnchorTile.value;
      lineAnchorTile.value = null;
      isHealingDrag = false;
      lastDraggedTile = null;
      activeBrushPointer = null;
      detachBrushWindowListeners();
      store.paintLine(start, coords);
      return;
    }
    lineAnchorTile.value = coords;
    isHealingDrag = true;
    lastDraggedTile = null;
    activeBrushPointer = { pointerId: e.pointerId, x: e.clientX, y: e.clientY };
    attachBrushWindowListeners();
    return;
  }

  isHealingDrag = true;
  lastDraggedTile = null;
  activeBrushPointer = { pointerId: e.pointerId, x: e.clientX, y: e.clientY };
  store.beginHealingStroke();
  applyBrushStrokeSegment(null, coords);
  attachBrushWindowListeners();
}

function handlePointerDown(e: PointerEvent): void {
  if (
    isHealingDrag &&
    e.pointerType === 'touch' &&
    activeBrushPointer &&
    e.pointerId !== activeBrushPointer.pointerId
  ) {
    cancelBrushDragAndStartPinch(e);
    return;
  }

  if (shouldIgnoreViewportPointerDown(e.target as HTMLElement | null)) {
    return;
  }

  if (store.isHealingBrushActive && (e.button === 0 || e.pointerType === 'touch')) {
    const coords = resolveViewportTileCoords(e.clientX, e.clientY, e.pointerType);
    if (coords) {
      handleActiveBrushPointerDown(e, coords);
      return;
    }
  }

  // Primary click (0), middle click (1), or touch pan/pinch
  if (e.button === 0 || e.button === 1 || e.pointerType === 'touch') {
    startViewportPanOrPinch(e);
  }
}

onUnmounted(() => {
  activeRenderAbort?.abort();
  activeRenderAbort = null;
  activeCameraTween?.kill();
  activeCameraTween = null;
  activeDockTween?.kill();
  activeDockTween = null;
  clearKeyboardPanState();
  resetDirtyRectQueue();
  globalThis.removeEventListener('keydown', handleKeyDown);
  globalThis.removeEventListener('keyup', handleKeyUp);
  globalThis.removeEventListener('blur', handleWindowBlur);
  stopPanning();
  onHealingPointerCancel();
});

const RESET_VIEWPORT_ZOOM = 0.85;
const RESET_VIEWPORT_PAN_X = 80;
const RESET_VIEWPORT_PAN_Y = 40;

function resetView(): void {
  const z = RESET_VIEWPORT_ZOOM;
  zoom.value = z;
  const container = viewportContainerRef.value;
  const continent = store.continentMap;
  if (container && continent) {
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      panX.value = Math.round(rect.width / 2 - (continent.width * CANVAS_TILE_SIZE * z) / 2);
      panY.value = Math.round(rect.height / 2 - (continent.height * CANVAS_TILE_SIZE * z) / 2);
      return;
    }
  }
  panX.value = RESET_VIEWPORT_PAN_X;
  panY.value = RESET_VIEWPORT_PAN_Y;
}

function exportPng(): void {
  const canvas = canvasRef.value;
  if (!canvas) return;
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `region_${store.seed}_${Temporal.Now.instant().epochMilliseconds}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
</script>

<template>
  <div class="regional-studio-container">
    <!-- Backdrop overlay on mobile when controls drawer is open -->
    <button
      v-if="isMobileControlsOpen"
      id="backdrop-mobile-controls"
      type="button"
      class="mobile-backdrop"
      aria-label="Cerrar panel de controles"
      @click="isMobileControlsOpen = false"
    />

    <!-- Left Reactive Controls Sidebar -->
    <ContinentStudioControls
      :class="{ 'is-mobile-open': isMobileControlsOpen }"
      @close="isMobileControlsOpen = false"
    />

    <!-- Center Workspace Viewport -->
    <main
      ref="viewportContainerRef"
      class="studio-viewport-container"
      :class="{ 'is-healing-active': store.isHealingBrushActive }"
      @wheel="handleWheel"
      @pointerdown="handlePointerDown"
      @pointermove="handleViewportPointerMove"
      @pointerleave="hoverBrushTile = null"
    >
      <!-- Floating Top Bar -->
      <RegionalStudioToolbar
        :is-rendering-tiles="store.isRenderingTiles"
        @reset-view="resetView"
        @export-png="exportPng"
      />

      <!-- Transformed World Canvas + SVG Stage (isolated overflow: clip prevents focus scrollTop drift) -->
      <div class="viewport-world-stage">
        <div class="transformed-world-layer" :style="transformStyle">
          <!-- Layer 1: Pixelated Raster Terrain Canvas -->
          <canvas
            v-show="store.displayMode !== 'pokégear'"
            id="canvas-continent-terrain"
            ref="canvasRef"
            class="world-terrain-canvas"
            :class="{ 'is-healing-active': store.isHealingBrushActive }"
            :style="{
              width: `${store.widthPx}px`,
              height: `${store.heightPx}px`
            }"
          />

          <!-- Layer 2: Superimposed Interactive SVG Route & POI Network Overlay -->
          <RegionalNetworkSvgOverlay
            class="world-svg-overlay"
            :style="{
              width: `${store.widthPx}px`,
              height: `${store.heightPx}px`
            }"
          />

          <!-- Layer 3: Interactive SVG Urban Architecture & Prop Placement Overlay -->
          <RegionalUrbanSvgOverlay />

          <!-- Layer 4: Brush Line Preview & Visual Reticle -->
          <svg
            aria-hidden="true"
            v-if="linePreviewCoords"
            class="brush-line-preview-svg"
            :viewBox="`0 0 ${store.widthPx} ${store.heightPx}`"
            :style="{
              width: `${store.widthPx}px`,
              height: `${store.heightPx}px`
            }"
          >
            <line
              :x1="linePreviewCoords.x1"
              :y1="linePreviewCoords.y1"
              :x2="linePreviewCoords.x2"
              :y2="linePreviewCoords.y2"
              :stroke-width="store.brushSize * CANVAS_TILE_SIZE"
              class="brush-line-preview-band"
            />
            <line
              :x1="linePreviewCoords.x1"
              :y1="linePreviewCoords.y1"
              :x2="linePreviewCoords.x2"
              :y2="linePreviewCoords.y2"
              class="brush-line-preview-stroke"
            />
          </svg>

          <div
            v-if="store.isHealingBrushActive && lineAnchorTile"
            id="line-anchor-reticle"
            class="healing-brush-anchor-reticle"
            :class="{ 'is-circle': store.brushShape === 'circle' }"
            :style="lineAnchorStyle"
          >
            <span class="anchor-badge">📍 1</span>
          </div>

          <div
            v-if="store.isHealingBrushActive && hoverBrushTile"
            class="healing-brush-reticle"
            :class="{
              'is-circle': store.brushShape === 'circle',
              'is-paint': store.brushMode !== 'heal' && store.brushMode !== 'eyedropper',
              'is-eyedropper': store.brushMode === 'eyedropper'
            }"
            :style="reticleStyle"
          />
        </div>
      </div>

      <!-- Step-by-Step Banner when Line Mode is Active -->
      <div
        v-if="store.isHealingBrushActive && store.brushMode === 'line'"
        id="line-mode-hud-banner"
        class="line-mode-hud-banner"
        :class="{ 'has-anchor': Boolean(lineAnchorTile) }"
        @pointerdown.stop
      >
        <template v-if="lineAnchorTile">
          <span class="emoji-inline">📍</span>
          <span>
            <strong>Punto 1 fijado ({{ lineAnchorTile.x }}, {{ lineAnchorTile.y }}):</strong>
            Ahora haz clic en el <strong>Punto 2</strong> sobre el mapa para trazar la línea.
          </span>
          <button
            id="btn-cancel-line-anchor"
            type="button"
            class="line-cancel-btn"
            @click="onHealingPointerCancel"
          >
            Cancelar (Esc)
          </button>
        </template>
        <template v-else>
          <span class="emoji-inline">📏</span>
          <span>
            <strong>Modo Línea:</strong> Haz clic en el mapa para marcar el
            <strong>Punto 1</strong> y luego clic en el <strong>Punto 2</strong> (o mantén apretado
            y arrastra).
          </span>
        </template>
      </div>

      <!-- Contextual Floating Brush Studio Dock -->
      <Transition
        :css="false"
        @before-enter="beforeDockEnter"
        @enter="onDockEnter"
        @leave="onDockLeave"
      >
        <RegionalBrushDock v-if="store.isHealingBrushActive" />
      </Transition>

      <!-- Non-Blocking Background Thread Progress Pill -->
      <div v-if="store.isBusy" id="viewport-async-status" class="viewport-async-pill">
        <span v-gsap-loop="{ effect: 'pulse', active: store.isBusy }" class="status-dot" />
        <span class="status-text">{{ store.statusLabel }}</span>
      </div>

      <!-- Floating Touch Viewport Controls (Bottom-Right) -->
      <aside class="mobile-viewport-controls">
        <button
          id="btn-viewport-toggle-brush"
          type="button"
          class="ctrl-fab fab-brush"
          :class="{ active: store.isHealingBrushActive }"
          aria-label="Alternar taller de pincel"
          title="Taller de Pincel (B)"
          @click="store.toggleHealingBrush()"
        >
          <span class="emoji-inline">🎨</span>
        </button>
        <button
          id="btn-viewport-zoom-in"
          type="button"
          class="ctrl-fab"
          aria-label="Acercar mapa"
          title="Acercar"
          @click="zoomIn"
        >
          <span class="emoji-inline">➕</span>
        </button>
        <button
          id="btn-viewport-zoom-out"
          type="button"
          class="ctrl-fab"
          aria-label="Alejar mapa"
          title="Alejar"
          @click="zoomOut"
        >
          <span class="emoji-inline">➖</span>
        </button>
        <button
          id="btn-viewport-reset"
          type="button"
          class="ctrl-fab"
          aria-label="Centrar vista"
          title="Centrar"
          @click="resetView"
        >
          <span class="emoji-inline">🎯</span>
        </button>
        <button
          id="btn-toggle-mobile-controls"
          type="button"
          class="ctrl-fab fab-highlight"
          :class="{ active: isMobileControlsOpen }"
          aria-label="Ajustar parámetros del continente"
          title="Parámetros"
          @click="isMobileControlsOpen = !isMobileControlsOpen"
        >
          <span class="emoji-inline">⚙️</span>
        </button>
      </aside>
    </main>

    <!-- Right Selected POI Drawer -->
    <POIDetailDrawer />
  </div>
</template>

<style scoped lang="scss">
.regional-studio-container {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  background: var(--slate-900);
  color: var(--slate-50);
  overflow: hidden;
  user-select: none;
}

.mobile-backdrop {
  display: none;

  @media (width <= 768px) {
    position: fixed;
    z-index: calc(var(--z-modal) - 1);
    display: block;
    padding: 0;
    border: none;
    background: Rgb(0 0 0 / 60%);
    inset: 0;
    backdrop-filter: Blur(2px);
    cursor: pointer;
  }
}

.mobile-viewport-controls {
  position: absolute;
  right: calc(16px + env(safe-area-inset-right, 0px));
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  z-index: calc(var(--z-map-floor) + 15);
  display: flex;
  flex-direction: column;
  gap: $spacing-sm;

  .ctrl-fab {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 42px;
    height: 42px;
    border: 1px solid Rgb(255 255 255 / 20%);
    border-radius: $radius-full;
    background: Rgb(15 23 42 / 90%);
    color: var(--white);
    font-size: var(--font-16);
    cursor: pointer;
    box-shadow: var(--shadow-md);
    backdrop-filter: Blur(8px);

    &:active {
      background: Rgb(30 41 59 / 100%);
      transform: Scale(0.92);
    }

    &.fab-brush {
      border-color: Rgb(16 185 129 / 45%);

      &.active {
        background: Rgb(16 185 129 / 32%);
        color: var(--emerald-400);
        border-color: var(--emerald-400);
      }
    }

    &.fab-highlight {
      background: var(--sky-dark);
      border-color: var(--sky);
      box-shadow: var(--shadow-lg);

      &.active {
        background: var(--amber);
        border-color: var(--amber-300);
      }
    }
  }

  @media (width >= 769px) {
    .fab-brush,
    .fab-highlight {
      display: none;
    }
  }
}

.studio-viewport-container {
  position: relative;
  height: 100%;
  background: radial-gradient(circle at center, var(--slate-900) 0%, var(--slate-900) 100%);
  flex: 1;
  overflow: clip;
  cursor: grab;
  user-select: none;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }

  &.is-healing-active {
    cursor: crosshair;

    &:active {
      cursor: crosshair;
    }
  }
}

.viewport-world-stage {
  position: absolute;
  overflow: clip;
  inset: 0;
  pointer-events: none;
}

.transformed-world-layer {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;

  .world-terrain-canvas {
    position: absolute;
    top: 0;
    left: 0;
    image-rendering: crisp-edges;
    image-rendering: pixelated;
    pointer-events: none;
  }

  .world-svg-overlay {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;
  }

  .brush-line-preview-svg {
    position: absolute;
    top: 0;
    left: 0;
    pointer-events: none;

    .brush-line-preview-band {
      opacity: 0.28;
      stroke: var(--sky);
      stroke-linecap: square;
    }

    .brush-line-preview-stroke {
      opacity: 0.95;
      stroke: var(--amber);
      stroke-width: 6;
      stroke-linecap: round;
      stroke-dasharray: 12 8;
    }
  }

  .healing-brush-anchor-reticle {
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    border: 3px solid var(--amber);
    border-radius: $radius-sm;
    background: Rgb(251 191 36 / 28%);
    box-shadow: var(--shadow-md);
    pointer-events: none;

    &.is-circle {
      border-radius: $radius-full;
    }

    .anchor-badge {
      padding: 2px 6px;
      border-radius: $radius-full;
      background: var(--slate-900);
      color: var(--amber);
      font-size: var(--font-11);
      font-weight: $font-weight-bold;
      transform: Translatey(-110%);
      white-space: nowrap;
    }
  }

  .healing-brush-reticle {
    position: absolute;
    border: 2px dashed var(--emerald-400);
    border-radius: $radius-sm;
    background: Rgb(16 185 129 / 14%);
    box-shadow: var(--shadow-md);
    pointer-events: none;

    &.is-paint {
      background: Rgb(56 189 248 / 16%);
      border-color: var(--sky);
    }

    &.is-eyedropper {
      background: Rgb(251 191 36 / 16%);
      border-color: var(--amber);
    }

    &.is-circle {
      border-radius: $radius-full;
    }
  }
}

.line-mode-hud-banner {
  position: absolute;
  top: 64px;
  left: 50%;
  z-index: calc(var(--z-map-floor) + 18);
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: $spacing-xs $spacing-md;
  border: 1px solid Rgb(56 189 248 / 55%);
  border-radius: $radius-full;
  background: Rgb(15 23 42 / 94%);
  color: var(--slate-50);
  font-size: var(--font-11);
  transform: Translatex(-50%);
  box-shadow: var(--shadow-lg);
  backdrop-filter: Blur(8px);

  &.has-anchor {
    background: Rgb(30 41 59 / 96%);
    border-color: var(--amber);
  }

  .line-cancel-btn {
    padding: 2px $spacing-xs;
    border: 1px solid Rgb(251 191 36 / 55%);
    border-radius: $radius-sm;
    background: Rgb(251 191 36 / 18%);
    color: var(--amber);
    font-size: var(--font-10);
    font-weight: $font-weight-bold;
    cursor: pointer;
  }
}

.viewport-async-pill {
  position: absolute;
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  left: calc(16px + env(safe-area-inset-left, 0px));
  z-index: calc(var(--z-map-floor) + 15);
  display: inline-flex;
  align-items: center;
  gap: $spacing-xs;
  padding: 6px 12px;
  border: 1px solid Rgb(56 189 248 / 45%);
  border-radius: $radius-full;
  background: Rgb(15 23 42 / 90%);
  color: var(--slate-50);
  font-size: var(--font-11);
  font-weight: $font-weight-bold;
  box-shadow: var(--shadow-md);
  backdrop-filter: Blur(8px);
  pointer-events: none;

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: $radius-full;
    background: var(--sky);
    flex-shrink: 0;
  }
}
</style>
