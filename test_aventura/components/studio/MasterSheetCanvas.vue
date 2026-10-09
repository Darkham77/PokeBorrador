<script setup lang="ts">
/**
 * src/components/studio/assets/MasterSheetCanvas.vue
 *
 * PANEL A: INTERACTIVE MASTER SPRITESHEET CANVAS VIEWER
 *
 * Features:
 *   1. Hardware-accelerated 2D canvas with nearest-neighbor crisp scaling.
 *   2. Smooth pan & zoom (1x to 8x) with mouse wheel, buttons, and pointer drag.
 *   3. Superimposed vector boxes for all registered manifest assets (green).
 *   4. Native 16px GBA grid snapping selection tool with live HUD reporting.
 *   5. Automated JSON generator for canonical_assets_manifest.json.
 */

import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { CanonicalAssetEntry } from '../../logic/map/canonicalAssetsRegistry.ts';
import type { SheetGridLayout, SelectionRect } from '../../composables/studio/useAssetAtlas.ts';

const props = defineProps<{
  sheetUrl: string;
  sheetFilename: string;
  registeredEntries: readonly CanonicalAssetEntry[];
  selectedRect: SelectionRect | null;
  selectedAssetId: string | null;
  sheetGrid: SheetGridLayout;
  showGrid: boolean;
}>();

const emit = defineEmits<{
  (e: 'select-rect', rect: SelectionRect | null): void;
  (e: 'select-registered-entry', entry: CanonicalAssetEntry): void;
}>();

const viewportRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Pan & Zoom state
const zoom = ref<number>(2.5);
const panX = ref<number>(60);
const panY = ref<number>(60);
const isPanning = ref<boolean>(false);
const panStart = ref<{ x: number; y: number }>({ x: 0, y: 0 });

// Interactive Selection state
const isDraggingSelection = ref<boolean>(false);
const dragStartTile = ref<{ col: number; row: number }>({ col: 0, row: 0 });

// Image Cache
const sheetImage = ref<HTMLImageElement | null>(null);
const isImageLoading = ref<boolean>(false);

// Form state for manifest JSON snippet
const newAssetId = ref<string>('');
const newAssetName = ref<string>('');
const newAssetCategory = ref<string>('roads');
const copyFeedback = ref<string | null>(null);

function loadSheetImage(): void {
  if (!props.sheetUrl) return;
  isImageLoading.value = true;
  const img = new Image();
  img.src = props.sheetUrl;
  img.onload = (): void => {
    sheetImage.value = img;
    isImageLoading.value = false;
    redrawCanvas();
  };
  img.onerror = (): void => {
    isImageLoading.value = false;
  };
}

watch(() => props.sheetUrl, () => {
  loadSheetImage();
});

watch([() => props.registeredEntries, () => props.selectedRect, () => props.showGrid, () => props.sheetGrid], () => {
  redrawCanvas();
}, { deep: true });

function redrawCanvas(): void {
  const canvas = canvasRef.value;
  const img = sheetImage.value;
  if (!canvas || !img) return;

  if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // 1. Draw Master Sheet
  ctx.drawImage(img, 0, 0);

  // 2. Draw Parametric Grid with margin and spacing if enabled
  if (props.showGrid && props.sheetGrid.tileSize > 0) {
    const { tileSize, marginX, marginY, spacingX, spacingY } = props.sheetGrid;
    const strideX = tileSize + spacingX;
    const strideY = tileSize + spacingY;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 1;

    if (spacingX > 0 || spacingY > 0) {
      // Individual tile rectangles to make 1px separator gaps visually distinct
      for (let x = marginX; x + tileSize <= canvas.width; x += strideX) {
        for (let y = marginY; y + tileSize <= canvas.height; y += strideY) {
          ctx.strokeRect(x + 0.5, y + 0.5, tileSize, tileSize);
        }
      }
    } else {
      // Continuous grid lines
      ctx.beginPath();
      for (let x = marginX; x <= canvas.width; x += strideX) {
        ctx.moveTo(x + 0.5, marginY);
        ctx.lineTo(x + 0.5, canvas.height);
      }
      for (let y = marginY; y <= canvas.height; y += strideY) {
        ctx.moveTo(marginX, y + 0.5);
        ctx.lineTo(canvas.width, y + 0.5);
      }
      ctx.stroke();
    }
  }

  // 3. Draw Green Translucent Boxes for Registered Manifest Entries
  for (const entry of props.registeredEntries) {
    const isCurrent = props.selectedAssetId === entry.id;
    ctx.fillStyle = isCurrent ? 'rgba(56, 189, 248, 0.35)' : 'rgba(34, 197, 94, 0.22)';
    ctx.strokeStyle = isCurrent ? 'rgb(14, 165, 233)' : 'rgb(34, 197, 94)';
    ctx.lineWidth = isCurrent ? 2 : 1.5;

    const r = entry.sourceRect;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    // Label tag
    ctx.fillStyle = isCurrent ? '#0284c7' : '#15803d';
    ctx.fillRect(r.x, Math.max(0, r.y - 14), Math.min(r.w, 80), 14);
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px monospace';
    ctx.fillText(entry.id.slice(0, 12), r.x + 2, Math.max(10, r.y - 3));
  }

  // 4. Draw Active Selection Box (User Drag or Current Selection)
  const sel = props.selectedRect;
  if (sel) {
    ctx.fillStyle = 'rgba(56, 189, 248, 0.3)';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.fillRect(sel.x, sel.y, sel.w, sel.h);
    ctx.strokeRect(sel.x, sel.y, sel.w, sel.h);

    // Corner handles
    ctx.fillStyle = '#ffffff';
    const s = 4;
    ctx.fillRect(sel.x - s / 2, sel.y - s / 2, s, s);
    ctx.fillRect(sel.x + sel.w - s / 2, sel.y - s / 2, s, s);
    ctx.fillRect(sel.x - s / 2, sel.y + sel.h - s / 2, s, s);
    ctx.fillRect(sel.x + sel.w - s / 2, sel.y + sel.h - s / 2, s, s);
  }
}

// Convert client pointer coordinates to native canvas pixel coordinates
function getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
  const container = viewportRef.value;
  if (!container) return { x: 0, y: 0 };
  const rect = container.getBoundingClientRect();
  const rawX = (clientX - rect.left - panX.value) / zoom.value;
  const rawY = (clientY - rect.top - panY.value) / zoom.value;
  return {
    x: Math.max(0, Math.floor(rawX)),
    y: Math.max(0, Math.floor(rawY))
  };
}

function handlePointerDown(e: PointerEvent): void {
  // Middle click (1) or Space+LeftClick = Pan
  if (e.button === 1 || e.altKey || (e.button === 0 && e.shiftKey)) {
    isPanning.value = true;
    panStart.value = { x: e.clientX - panX.value, y: e.clientY - panY.value };
    window.addEventListener('pointermove', onPointerMovePan);
    window.addEventListener('pointerup', stopPan);
    return;
  }

  // Left click (0) = Selection tool
  if (e.button === 0) {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    const g = props.sheetGrid;
    const strideX = g.tileSize + g.spacingX;
    const strideY = g.tileSize + g.spacingY;

    // Check if clicked an existing registered entry
    const clickedEntry = props.registeredEntries.find((entry) => {
      const r = entry.sourceRect;
      return coords.x >= r.x && coords.x < r.x + r.w && coords.y >= r.y && coords.y < r.y + r.h;
    });

    if (clickedEntry && !e.ctrlKey) {
      emit('select-registered-entry', clickedEntry);
      return;
    }

    const col = Math.max(0, Math.floor((coords.x - g.marginX) / strideX));
    const row = Math.max(0, Math.floor((coords.y - g.marginY) / strideY));
    const snapX = g.marginX + col * strideX;
    const snapY = g.marginY + row * strideY;

    dragStartTile.value = { col, row };
    isDraggingSelection.value = true;

    emit('select-rect', {
      x: snapX,
      y: snapY,
      w: g.tileSize,
      h: g.tileSize
    });

    window.addEventListener('pointermove', onPointerMoveDrag);
    window.addEventListener('pointerup', stopDrag);
  }
}

function onPointerMovePan(e: PointerEvent): void {
  if (!isPanning.value) return;
  panX.value = e.clientX - panStart.value.x;
  panY.value = e.clientY - panStart.value.y;
}

function stopPan(): void {
  isPanning.value = false;
  window.removeEventListener('pointermove', onPointerMovePan);
  window.removeEventListener('pointerup', stopPan);
}

function onPointerMoveDrag(e: PointerEvent): void {
  if (!isDraggingSelection.value) return;
  const coords = getCanvasCoords(e.clientX, e.clientY);
  const g = props.sheetGrid;
  const strideX = g.tileSize + g.spacingX;
  const strideY = g.tileSize + g.spacingY;

  const currentCol = Math.max(0, Math.floor((coords.x - g.marginX) / strideX));
  const currentRow = Math.max(0, Math.floor((coords.y - g.marginY) / strideY));

  const minCol = Math.min(dragStartTile.value.col, currentCol);
  const maxCol = Math.max(dragStartTile.value.col, currentCol);
  const minRow = Math.min(dragStartTile.value.row, currentRow);
  const maxRow = Math.max(dragStartTile.value.row, currentRow);

  const numCols = maxCol - minCol + 1;
  const numRows = maxRow - minRow + 1;

  const snapX = g.marginX + minCol * strideX;
  const snapY = g.marginY + minRow * strideY;
  const snapW = numCols * g.tileSize + (numCols - 1) * g.spacingX;
  const snapH = numRows * g.tileSize + (numRows - 1) * g.spacingY;

  emit('select-rect', {
    x: snapX,
    y: snapY,
    w: snapW,
    h: snapH
  });
}

function stopDrag(): void {
  isDraggingSelection.value = false;
  window.removeEventListener('pointermove', onPointerMoveDrag);
  window.removeEventListener('pointerup', stopDrag);
}

function handleWheel(e: WheelEvent): void {
  e.preventDefault();
  const container = viewportRef.value;
  if (!container) return;
  const rect = container.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const zoomFactor = e.deltaY < 0 ? 1.25 : 0.8;
  const newZoom = Math.min(10, Math.max(0.5, zoom.value * zoomFactor));

  // Zoom toward cursor
  panX.value = mouseX - (mouseX - panX.value) * (newZoom / zoom.value);
  panY.value = mouseY - (mouseY - panY.value) * (newZoom / zoom.value);
  zoom.value = newZoom;
}

function resetZoom(): void {
  zoom.value = 2.5;
  panX.value = 60;
  panY.value = 60;
}

/**
 * Public Camera API: Centers camera smoothly on a given rectangle.
 */
function centerOnRect(rect: SelectionRect): void {
  const container = viewportRef.value;
  if (!container) return;
  const cw = container.clientWidth;
  const ch = container.clientHeight;

  zoom.value = 4.0;
  panX.value = Math.round(cw / 2 - (rect.x + rect.w / 2) * zoom.value);
  panY.value = Math.round(ch / 2 - (rect.y + rect.h / 2) * zoom.value);
  redrawCanvas();
}

defineExpose({
  centerOnRect,
  resetZoom
});

// Computed tile coordinates and dimensions from sheetGrid
const tileCol = computed(() => {
  if (!props.selectedRect) return 0;
  const strideX = props.sheetGrid.tileSize + props.sheetGrid.spacingX;
  return Math.max(0, Math.floor((props.selectedRect.x - props.sheetGrid.marginX) / strideX));
});

const tileRow = computed(() => {
  if (!props.selectedRect) return 0;
  const strideY = props.sheetGrid.tileSize + props.sheetGrid.spacingY;
  return Math.max(0, Math.floor((props.selectedRect.y - props.sheetGrid.marginY) / strideY));
});

const tileWidth = computed(() => {
  if (!props.selectedRect) return 1;
  const strideX = props.sheetGrid.tileSize + props.sheetGrid.spacingX;
  return Math.max(1, Math.round((props.selectedRect.w + props.sheetGrid.spacingX) / strideX));
});

const tileHeight = computed(() => {
  if (!props.selectedRect) return 1;
  const strideY = props.sheetGrid.tileSize + props.sheetGrid.spacingY;
  return Math.max(1, Math.round((props.selectedRect.h + props.sheetGrid.spacingY) / strideY));
});

// JSON synthesis
const formattedSnippet = computed(() => {
  if (!props.selectedRect) return '';
  const sel = props.selectedRect;
  const tileW = tileWidth.value;
  const tileH = tileHeight.value;
  const pixelW = tileW * 32;
  const pixelH = tileH * 32;
  const id = newAssetId.value.trim() || 'custom_asset_id';
  const cat = newAssetCategory.value;
  const name = newAssetName.value.trim() || 'Canonical GBA Asset';

  const row = Array(tileW).fill(cat === 'roads' || cat === 'curbs' ? 0 : 1);
  const collisionMask = Array(tileH).fill(row);

  const obj = {
    id,
    category: cat,
    name,
    sourceImage: props.sheetFilename,
    sourceRect: { x: sel.x, y: sel.y, w: sel.w, h: sel.h },
    tileDimensions: { w: tileW, h: tileH },
    pixelDimensions: { w: pixelW, h: pixelH },
    collisionMask,
    runtimePath: `canon/${cat}/${id}.png`,
    alphaKey: 'transparent'
  };

  return JSON.stringify(obj, null, 2);
});

async function copySnippet(): Promise<void> {
  if (!formattedSnippet.value) return;
  try {
    await navigator.clipboard.writeText(formattedSnippet.value);
    copyFeedback.value = '✅ JSON copiado al portapapeles!';
    setTimeout(() => {
      copyFeedback.value = null;
    }, 2500);
  } catch (_e) {
    copyFeedback.value = '⚠️ No se pudo copiar automáticamente';
  }
}

onMounted(() => {
  loadSheetImage();
});

onUnmounted(() => {
  stopPan();
  stopDrag();
});
</script>

<template>
  <div class="master-canvas-pane">
    <!-- Viewport Container -->
    <div
      ref="viewportRef"
      class="canvas-viewport"
      @wheel="handleWheel"
      @pointerdown="handlePointerDown"
    >
      <div
        class="canvas-transform-layer"
        :style="{
          transform: `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`,
          transformOrigin: '0 0'
        }"
      >
        <canvas
          ref="canvasRef"
          class="master-sheet-canvas"
        />
      </div>

      <!-- Quick Canvas Overlay Controls -->
      <div class="canvas-floating-controls">
        <span class="zoom-badge">{{ Math.round(zoom * 100) }}%</span>
        <button
          type="button"
          class="floating-btn"
          title="Acercar (+)"
          @click="zoom = Math.min(10, zoom * 1.3)"
        >
          +
        </button>
        <button
          type="button"
          class="floating-btn"
          title="Alejar (-)"
          @click="zoom = Math.max(0.5, zoom * 0.77)"
        >
          -
        </button>
        <button
          type="button"
          class="floating-btn"
          title="Centrar vista"
          @click="resetZoom"
        >
          <span class="emoji-inline">⛶</span>
        </button>
      </div>
    </div>

    <!-- Bottom Inspector HUD & JSON Copier Bar -->
    <div
      v-if="selectedRect"
      class="selection-hud-bar"
    >
      <div class="hud-coords-group">
        <div class="hud-cell">
          <span class="hud-label">Origen (X, Y)</span>
          <span class="hud-val">{{ selectedRect.x }}px, {{ selectedRect.y }}px</span>
          <span class="hud-sub">(Col {{ tileCol }}, Fila {{ tileRow }})</span>
        </div>
        <div class="hud-cell">
          <span class="hud-label">Dimensiones GBA</span>
          <span class="hud-val">{{ selectedRect.w }} × {{ selectedRect.h }}px</span>
          <span class="hud-sub">({{ tileWidth }} × {{ tileHeight }} baldosas)</span>
        </div>
        <div class="hud-cell">
          <span class="hud-label">Escala Juego (2x)</span>
          <span class="hud-val highlight">{{ tileWidth * 32 }} × {{ tileHeight * 32 }}px</span>
          <span class="hud-sub">Runtime Metatiles</span>
        </div>
      </div>

      <div class="hud-input-group">
        <input
          v-model="newAssetId"
          type="text"
          placeholder="ID canónico (ej. poke_road_slate)"
          class="hud-input"
        >
        <select
          v-model="newAssetCategory"
          class="hud-select"
        >
          <option value="roads">
            roads
          </option>
          <option value="curbs">
            curbs
          </option>
          <option value="buildings">
            buildings
          </option>
          <option value="props">
            props
          </option>
          <option value="terrain">
            terrain
          </option>
        </select>
        <input
          v-model="newAssetName"
          type="text"
          placeholder="Nombre descriptivo"
          class="hud-input wide"
        >
        <button
          type="button"
          class="hud-copy-btn"
          @click="copySnippet"
        >
          <span class="btn-emoji">📋</span> Copiar JSON
        </button>
      </div>

      <div
        v-if="copyFeedback"
        class="hud-feedback-toast"
      >
        {{ copyFeedback }}
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.master-canvas-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background: #090d16;
  position: relative;
  overflow: hidden;
}

.canvas-viewport {
  flex: 1;
  position: relative;
  overflow: hidden;
  cursor: crosshair;
  user-select: none;
  background-color: #0d1117;
  background-image: 
    linear-gradient(45deg, #131924 25%, transparent 25%),
    linear-gradient(-45deg, #131924 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #131924 75%),
    linear-gradient(-45deg, transparent 75%, #131924 75%);
  background-size: 24px 24px;
  background-position: 0 0, 0 12px, 12px -12px, -12px 0;
}

.canvas-transform-layer {
  position: absolute;
  top: 0;
  left: 0;
  will-change: transform;
}

.master-sheet-canvas {
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  box-shadow: 0 12px 40px Rgba(0, 0, 0, 0.7);
}

.canvas-floating-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  background: Rgba(15, 23, 42, 0.88);
  backdrop-filter: Blur(8px);
  border: 1px solid Rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 4px 8px;
  z-index: var(--z-modal-step);
}

.zoom-badge {
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  padding: 0 6px;
  font-family: monospace;
}

.floating-btn {
  width: 28px;
  height: 28px;
  background: #1e293b;
  border: 1px solid #334155;
  color: #f8fafc;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;

  &:hover {
    background: #334155;
    border-color: #475569;
  }
}

.selection-hud-bar {
  background: #0f172a;
  border-top: 1px solid Rgba(255, 255, 255, 0.12);
  padding: 10px 16px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  z-index: calc(var(--z-map-floor) + 10);
}

.hud-coords-group {
  display: flex;
  gap: 16px;
}

.hud-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.hud-label {
  font-size: 9px;
  text-transform: uppercase;
  color: #64748b;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.hud-val {
  font-size: 13px;
  font-weight: 700;
  color: #e2e8f0;
  font-family: monospace;

  &.highlight {
    color: #38bdf8;
  }
}

.hud-sub {
  font-size: 10px;
  color: #94a3b8;
  font-family: monospace;
}

.hud-input-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hud-input {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 12px;
  color: #f8fafc;
  width: 170px;

  &.wide {
    width: 200px;
  }

  &:focus {
    outline: none;
    border-color: #38bdf8;
  }
}

.hud-select {
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 6px;
  padding: 6px 8px;
  font-size: 12px;
  color: #f8fafc;

  &:focus {
    outline: none;
    border-color: #38bdf8;
  }
}

.hud-copy-btn {
  background: #0284c7;
  color: #ffffff;
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: background 0.15s ease;

  &:hover {
    background: #0369a1;
  }
}

.hud-feedback-toast {
  position: absolute;
  bottom: 68px;
  left: 50%;
  transform: Translatex(-50%);
  background: #10b981;
  color: #ffffff;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 4px 12px Rgba(0, 0, 0, 0.4);
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: Translate(-50%, 8px); }
  to { opacity: 1; transform: Translate(-50%, 0); }
}
</style>
