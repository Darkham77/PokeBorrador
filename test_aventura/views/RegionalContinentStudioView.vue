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
import { useRegionalContinentStudioStore } from '../stores/continentStudioStore.ts';
import { renderRegionalContinentTilemap } from '../logic/map/canvasViewportBlitter.ts';
import ContinentStudioControls from '../components/studio/ContinentStudioControls.vue';
import RegionalStudioToolbar from '../components/studio/RegionalStudioToolbar.vue';
import RegionalNetworkSvgOverlay from '../components/studio/RegionalNetworkSvgOverlay.vue';
import RegionalUrbanSvgOverlay from '../components/studio/RegionalUrbanSvgOverlay.vue';
import POIDetailDrawer from '../components/studio/POIDetailDrawer.vue';
import { VIEWPORT_ZOOM_IN_STEP, VIEWPORT_ZOOM_OUT_STEP } from '../config/studioConstants.ts';

const MIN_CONTINENT_STUDIO_ZOOM = 0.15;

const store = useRegionalContinentStudioStore();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const viewportContainerRef = ref<HTMLDivElement | null>(null);
const isRenderingTiles = ref<boolean>(false);

// Pan & Zoom viewport state
const zoom = ref<number>(1.0);
const panX = ref<number>(0);
const panY = ref<number>(0);
const isPanning = ref<boolean>(false);
const panStart = ref<{ x: number; y: number }>({ x: 0, y: 0 });

const transformStyle = computed(() => ({
  transform: `translate3d(${panX.value}px, ${panY.value}px, 0) scale(${zoom.value})`,
  transformOrigin: '0 0'
}));

/**
 * Renders the full 32x32 native GBA tilemap onto the canvas.
 */
async function renderFullTilemap(): Promise<void> {
  const canvas = canvasRef.value;
  if (!canvas || !store.continentMap) return;

  isRenderingTiles.value = true;
  try {
    await renderRegionalContinentTilemap(
      canvas,
      store.continentMap,
      store.pois,
      store.pathGrid,
      store.bridgeGrid,
      store.wilderness
    );
  } finally {
    isRenderingTiles.value = false;
  }
}

watch(
  () => [store.continentMap, store.pois, store.pathGrid, store.wilderness],
  () => {
    renderFullTilemap();
  },
  { deep: false }
);

onMounted(() => {
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

// Viewport Pan & Drag Controller (Window-level PointerEvents)
function onWindowPointerMove(e: PointerEvent): void {
  if (!isPanning.value) return;
  panX.value = e.clientX - panStart.value.x;
  panY.value = e.clientY - panStart.value.y;
}

function stopPanning(): void {
  if (!isPanning.value) return;
  isPanning.value = false;
  window.removeEventListener('pointermove', onWindowPointerMove);
  window.removeEventListener('pointerup', stopPanning);
  window.removeEventListener('pointercancel', stopPanning);
}

function handlePointerDown(e: PointerEvent): void {
  // Ignore clicks on buttons, sidebar or interactive POI nodes
  const target = e.target as HTMLElement | null;
  if (target?.closest('.viewport-toolbar') || target?.closest('.poi-node-item')) {
    return;
  }

  // Primary click (0) or middle click (1)
  if (e.button === 0 || e.button === 1) {
    isPanning.value = true;
    panStart.value = { x: e.clientX - panX.value, y: e.clientY - panY.value };
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerup', stopPanning);
    window.addEventListener('pointercancel', stopPanning);
  }
}

onUnmounted(() => {
  stopPanning();
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
    <!-- Left Reactive Controls Sidebar -->
    <ContinentStudioControls />

    <!-- Center Workspace Viewport -->
    <main
      ref="viewportContainerRef"
      class="studio-viewport-container"
      @wheel="handleWheel"
      @pointerdown="handlePointerDown"
    >
      <!-- Floating Top Bar -->
      <RegionalStudioToolbar
        :is-rendering-tiles="isRenderingTiles"
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
          :width="store.widthPx"
          :height="store.heightPx"
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
      </div>
    </main>

    <!-- Right Selected POI Drawer -->
    <POIDetailDrawer />
  </div>
</template>

<style scoped lang="scss">
.regional-studio-container {
  position: relative;
  display: flex;
  width: 100dvw;
  height: 100dvh;
  background: var(--slate-900);
  color: var(--slate-50);
  overflow: hidden;
  user-select: none;
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
}
</style>
