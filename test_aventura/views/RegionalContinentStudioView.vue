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

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

import ContinentStudioControls from '../components/studio/ContinentStudioControls.vue';
import POIDetailDrawer from '../components/studio/POIDetailDrawer.vue';
import RegionalNetworkSvgOverlay from '../components/studio/RegionalNetworkSvgOverlay.vue';
import RegionalStudioToolbar from '../components/studio/RegionalStudioToolbar.vue';
import RegionalUrbanSvgOverlay from '../components/studio/RegionalUrbanSvgOverlay.vue';
import {
  CANVAS_TILE_SIZE,
  STUDIO_MOBILE_BREAKPOINT_PX,
  VIEWPORT_ZOOM_IN_STEP,
  VIEWPORT_ZOOM_OUT_STEP
} from '../config/studioConstants.ts';
import { compilePackedMapBlitBuffer } from '../logic/map/canvasTileRenderer.ts';
import {
  renderPackedContinentTilemap,
  renderRegionalContinentDirtyRect
} from '../logic/map/canvasViewportBlitter.ts';
import { useRegionalContinentStudioStore } from '../stores/continentStudioStore.ts';

const MIN_CONTINENT_STUDIO_ZOOM = 0.15;
const MOBILE_INITIAL_VIEWPORT_ZOOM = 0.35;

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
    const activePackedBlit =
      store.packedBlit ??
      compilePackedMapBlitBuffer(
        continent,
        store.pois,
        store.pathGrid,
        store.bridgeGrid,
        store.wilderness
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

let suppressFullTilemapWatch = false;

watch(
  () => [store.continentMap, store.pois, store.pathGrid, store.wilderness],
  () => {
    if (suppressFullTilemapWatch) {
      suppressFullTilemapWatch = false;
      return;
    }
    renderFullTilemap();
  },
  { deep: false }
);

function handleKeyDown(e: KeyboardEvent): void {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    if (e.shiftKey) {
      store.redo();
    } else {
      store.undo();
    }
  } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
    e.preventDefault();
    store.redo();
  }
}

onMounted(() => {
  globalThis.addEventListener('keydown', handleKeyDown);
  // Trigger initial generation if not already present
  if (!store.continentMap) {
    store.executeGenerationNow();
  } else {
    renderFullTilemap();
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
let lastHealedTileCoord: string | null = null;
const hoverBrushTile = ref<{ x: number; y: number } | null>(null);

function resolveViewportTileCoords(
  clientX: number,
  clientY: number
): { x: number; y: number } | null {
  if (!viewportContainerRef.value || !store.continentMap) return null;
  const rect = viewportContainerRef.value.getBoundingClientRect();
  const worldX = (clientX - rect.left - panX.value) / zoom.value;
  const worldY = (clientY - rect.top - panY.value) / zoom.value;
  const x = Math.floor(worldX / CANVAS_TILE_SIZE);
  const y = Math.floor(worldY / CANVAS_TILE_SIZE);
  if (x < 0 || x >= store.continentMap.width || y < 0 || y >= store.continentMap.height) {
    return null;
  }
  return { x, y };
}

function handleViewportPointerMove(e: PointerEvent): void {
  if (!store.isHealingBrushActive) {
    if (hoverBrushTile.value) hoverBrushTile.value = null;
    return;
  }
  hoverBrushTile.value = resolveViewportTileCoords(e.clientX, e.clientY);
}

async function applyHealingAt(tileX: number, tileY: number): Promise<void> {
  suppressFullTilemapWatch = true;
  const mutation = store.healTileAt(tileX, tileY);
  if (!mutation) {
    suppressFullTilemapWatch = false;
    return;
  }

  const canvas = canvasRef.value;
  if (!canvas) return;

  await renderRegionalContinentDirtyRect(canvas, mutation.continent, mutation.summary.dirtyBounds, {
    pois: store.pois,
    pathGrid: mutation.pathGrid,
    bridgeGrid: store.bridgeGrid,
    wilderness: store.wilderness
  });
}

function onHealingPointerMove(e: PointerEvent): void {
  if (!isHealingDrag) return;
  const coords = resolveViewportTileCoords(e.clientX, e.clientY);
  hoverBrushTile.value = coords;
  if (!coords) return;

  const coordKey = `${coords.x}_${coords.y}`;
  if (coordKey === lastHealedTileCoord) return;
  lastHealedTileCoord = coordKey;

  applyHealingAt(coords.x, coords.y);
}

function onHealingPointerUp(): void {
  isHealingDrag = false;
  lastHealedTileCoord = null;
  store.endHealingStroke();
  globalThis.removeEventListener('pointermove', onHealingPointerMove);
  globalThis.removeEventListener('pointerup', onHealingPointerUp);
  globalThis.removeEventListener('pointercancel', onHealingPointerUp);
}

function handlePointerDown(e: PointerEvent): void {
  // Ignore clicks on buttons, sidebar, mobile controls or interactive POI nodes
  const target = e.target as HTMLElement | null;
  if (
    target?.closest('.viewport-toolbar') ||
    target?.closest('.poi-node-item') ||
    target?.closest('.mobile-viewport-controls') ||
    target?.closest('.continent-studio-controls')
  ) {
    return;
  }

  // Intercept if Healing Brush is active on primary button or touch
  if (store.isHealingBrushActive && (e.button === 0 || e.pointerType === 'touch')) {
    const coords = resolveViewportTileCoords(e.clientX, e.clientY);
    if (coords) {
      hoverBrushTile.value = coords;
      isHealingDrag = true;
      lastHealedTileCoord = `${coords.x}_${coords.y}`;
      store.beginHealingStroke();
      applyHealingAt(coords.x, coords.y);
      globalThis.addEventListener('pointermove', onHealingPointerMove);
      globalThis.addEventListener('pointerup', onHealingPointerUp);
      globalThis.addEventListener('pointercancel', onHealingPointerUp);
      return;
    }
  }

  // Primary click (0), middle click (1), or touch
  if (e.button === 0 || e.button === 1 || e.pointerType === 'touch') {
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
}

onUnmounted(() => {
  activeRenderAbort?.abort();
  activeRenderAbort = null;
  globalThis.removeEventListener('keydown', handleKeyDown);
  stopPanning();
  onHealingPointerUp();
});

const RESET_VIEWPORT_ZOOM = 0.85;
const RESET_VIEWPORT_PAN_X = 80;
const RESET_VIEWPORT_PAN_Y = 40;

function resetView(): void {
  zoom.value = RESET_VIEWPORT_ZOOM;
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

      <!-- Transformed World Canvas + SVG Group -->
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

        <!-- Layer 4: Healing Brush Visual Reticle -->
        <div
          v-if="store.isHealingBrushActive && hoverBrushTile"
          class="healing-brush-reticle"
          :style="{
            left: `${(hoverBrushTile.x - 1) * CANVAS_TILE_SIZE}px`,
            top: `${(hoverBrushTile.y - 1) * CANVAS_TILE_SIZE}px`,
            width: `${CANVAS_TILE_SIZE * 3}px`,
            height: `${CANVAS_TILE_SIZE * 3}px`
          }"
        />
      </div>

      <!-- Non-Blocking Background Thread Progress Pill -->
      <div v-if="store.isBusy" id="viewport-async-status" class="viewport-async-pill">
        <span v-gsap-loop="{ effect: 'pulse', active: store.isBusy }" class="status-dot" />
        <span class="status-text">{{ store.statusLabel }}</span>
      </div>

      <!-- Floating Touch Viewport Controls (Bottom-Right) -->
      <aside class="mobile-viewport-controls">
        <button
          id="btn-viewport-zoom-in"
          type="button"
          class="ctrl-fab"
          aria-label="Acercar mapa"
          title="Acercar"
          @click="zoomIn"
        >
          ➕
        </button>
        <button
          id="btn-viewport-zoom-out"
          type="button"
          class="ctrl-fab"
          aria-label="Alejar mapa"
          title="Alejar"
          @click="zoomOut"
        >
          ➖
        </button>
        <button
          id="btn-viewport-reset"
          type="button"
          class="ctrl-fab"
          aria-label="Centrar vista"
          title="Centrar"
          @click="resetView"
        >
          🎯
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
          ⚙️
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
  overflow: hidden;
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

  .healing-brush-reticle {
    position: absolute;
    border: 2px dashed var(--emerald-400);
    border-radius: $radius-sm;
    background: Rgb(16 185 129 / 14%);
    box-shadow: var(--shadow-md);
    pointer-events: none;
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
