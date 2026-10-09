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
import { useRouter } from 'vue-router';
import { useRegionalContinentStudioStore } from '../stores/continentStudioStore.ts';
import { renderRegionalContinentTilemap } from '../logic/map/canvasTileRenderer.ts';
import ContinentStudioControls from '../components/studio/ContinentStudioControls.vue';
import RegionalNetworkSvgOverlay from '../components/studio/RegionalNetworkSvgOverlay.vue';
import POIDetailDrawer from '../components/studio/POIDetailDrawer.vue';

const router = useRouter();
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
  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
  const nextZoom = Math.max(0.15, Math.min(4.0, zoom.value * zoomFactor));

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
      <nav class="viewport-toolbar">
        <div class="region-meta">
          <span class="region-title">Región #{{ store.seed }}</span>
          <span class="region-size">{{ store.mapDimension }} × {{ store.mapDimension }} tiles</span>
          <span
            v-if="isRenderingTiles || store.isGenerating"
            class="rendering-indicator"
          >
            <span class="icon">⏳</span> Renderizando GBA 32×32...
          </span>
        </div>
        <div class="tool-actions">
          <button
            type="button"
            class="tool-btn"
            title="Auditoría Visual de Autotiling 3x3"
            @click="router.push('/studio/autotile')"
          >
            <span class="btn-emoji">🧩</span> Autotile Studio
          </button>
          <button
            type="button"
            class="tool-btn"
            title="Inspeccionar Spritesheets y Assets Canónicos"
            @click="router.push('/studio/assets')"
          >
            <span class="btn-emoji">🎨</span> Asset Inspector
          </button>
          <button
            type="button"
            class="tool-btn"
            title="Centrar y resetear vista"
            @click="resetView"
          >
            <span class="btn-emoji">⛶</span> Centrar
          </button>
          <button
            type="button"
            class="tool-btn primary"
            title="Descargar PNG"
            @click="exportPng"
          >
            <span class="btn-emoji">💾</span> Exportar PNG
          </button>
        </div>
      </nav>

      <!-- Transformed World Canvas + SVG Group -->
      <div
        class="transformed-world-layer"
        :style="transformStyle"
      >
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
      </div>
    </main>

    <!-- Right Selected POI Drawer -->
    <POIDetailDrawer />
  </div>
</template>

<style scoped lang="scss">
.regional-studio-container {
  display: flex;
  width: 100dvw;
  height: 100dvh;
  overflow: hidden;
  background: #090d16;
  color: #f8fafc;
  position: relative;
  user-select: none;
}

.studio-viewport-container {
  flex: 1;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: radial-gradient(circle at center, #0f172a 0%, #060911 100%);
  cursor: grab;
  user-select: none;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }
}

.viewport-toolbar {
  position: absolute;
  top: 16px;
  left: 20px;
  background: Rgba(15, 23, 42, 0.85);
  backdrop-filter: Blur(8px);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 6px 14px;
  display: flex;
  align-items: center;
  gap: 20px;
  z-index: calc(var(--z-map-floor) + 5);
  box-shadow: 0 4px 12px Rgba(0, 0, 0, 0.3);

  .region-meta {
    display: flex;
    align-items: center;
    gap: 8px;

    .region-title {
      font-weight: 700;
      color: #38bdf8;
      font-size: 0.9rem;
    }

    .region-size {
      font-size: 0.75rem;
      color: #94a3b8;
      background: Rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
      font-family: monospace;
    }

    .rendering-indicator {
      font-size: 0.72rem;
      color: #38bdf8;
      background: Rgba(56, 189, 248, 0.15);
      border: 1px solid Rgba(56, 189, 248, 0.3);
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 600;
    }
  }

  .tool-actions {
    display: flex;
    gap: 8px;

    .tool-btn {
      background: Rgba(255, 255, 255, 0.08);
      border: 1px solid Rgba(255, 255, 255, 0.15);
      color: #f8fafc;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: Rgba(255, 255, 255, 0.18);
      }

      &.primary {
        background: #0284c7;
        border-color: #38bdf8;

        &:hover {
          background: #0369a1;
        }
      }
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
}
</style>
