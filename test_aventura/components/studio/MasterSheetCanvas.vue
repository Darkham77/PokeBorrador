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
import { gsap } from 'gsap';
import { COPY_FEEDBACK_DELAY_SEC, CANVAS_TILE_SIZE } from '../../config/studioConstants.ts';
import { PERCENT_BASE_MULTIPLIER } from '@/logic/constants/gameplay';
import type { CanonicalAssetEntry } from '../../logic/map/canonicalAssetsRegistry.ts';
import type { SheetGridLayout, SelectionRect } from '../../composables/studio/useAssetAtlas.ts';

const LABEL_TAG_HEIGHT = 14;
const LABEL_MAX_WIDTH = 80;
const LABEL_MAX_CHARS = 12;
const LABEL_TOP_MIN_OFFSET = 10;
const ZOOM_IN_FACTOR = 1.25;
const ZOOM_OUT_FACTOR = 0.8;
const MAX_CANVAS_ZOOM = 10;
const MIN_CANVAS_ZOOM = 0.5;
const ENTRY_STROKE_WIDTH = 1.5 as const;

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
const DEFAULT_MASTERSHEET_ZOOM = 2.5 as const;
const zoom = ref<number>(DEFAULT_MASTERSHEET_ZOOM);
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
    ctx.lineWidth = isCurrent ? 2 : ENTRY_STROKE_WIDTH;

    const r = entry.sourceRect;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    // Label tag
    ctx.fillStyle = isCurrent ? '#0284c7' : '#15803d';
    ctx.fillRect(r.x, Math.max(0, r.y - LABEL_TAG_HEIGHT), Math.min(r.w, LABEL_MAX_WIDTH), LABEL_TAG_HEIGHT);
    ctx.fillStyle = '#ffffff';
    ctx.font = '9px monospace';
    ctx.fillText(entry.id.slice(0, LABEL_MAX_CHARS), r.x + 2, Math.max(LABEL_TOP_MIN_OFFSET, r.y - 3));
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

  const zoomFactor = e.deltaY < 0 ? ZOOM_IN_FACTOR : ZOOM_OUT_FACTOR;
  const newZoom = Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, zoom.value * zoomFactor));

  // Zoom toward cursor
  panX.value = mouseX - (mouseX - panX.value) * (newZoom / zoom.value);
  panY.value = mouseY - (mouseY - panY.value) * (newZoom / zoom.value);
  zoom.value = newZoom;
}

function handleZoomIn(): void {
  zoom.value = Math.min(MAX_CANVAS_ZOOM, zoom.value * ZOOM_IN_FACTOR);
}

function handleZoomOut(): void {
  zoom.value = Math.max(MIN_CANVAS_ZOOM, zoom.value * ZOOM_OUT_FACTOR);
}

const zoomPercentText = computed(() => `${Math.round(zoom.value * PERCENT_BASE_MULTIPLIER)}%`);

function resetZoom(): void {
  zoom.value = DEFAULT_MASTERSHEET_ZOOM;
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

const runtimeDimensionsText = computed(() => `${tileWidth.value * CANVAS_TILE_SIZE} × ${tileHeight.value * CANVAS_TILE_SIZE}px`);

// JSON synthesis
const formattedSnippet = computed(() => {
  if (!props.selectedRect) return '';
  const sel = props.selectedRect;
  const tileW = tileWidth.value;
  const tileH = tileHeight.value;
  const pixelW = tileW * CANVAS_TILE_SIZE;
  const pixelH = tileH * CANVAS_TILE_SIZE;
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

const TOAST_ENTER_DURATION_SEC = 0.2;
const TOAST_LEAVE_DURATION_SEC = 0.15;
const TOAST_ENTER_OFFSET_Y = 8;

async function copySnippet(): Promise<void> {
  if (!formattedSnippet.value) return;
  try {
    await navigator.clipboard.writeText(formattedSnippet.value);
    copyFeedback.value = '✅ JSON copiado al portapapeles!';
    gsap.delayedCall(COPY_FEEDBACK_DELAY_SEC, () => {
      copyFeedback.value = null;
    });
  } catch (_e) {
    copyFeedback.value = '⚠️ No se pudo copiar automáticamente';
  }
}

function onToastEnter(el: Element, done: () => void): void {
  gsap.fromTo(el, { opacity: 0, y: TOAST_ENTER_OFFSET_Y }, { opacity: 1, y: 0, duration: TOAST_ENTER_DURATION_SEC, ease: 'power2.out', onComplete: done });
}

function onToastLeave(el: Element, done: () => void): void {
  gsap.to(el, { opacity: 0, y: TOAST_ENTER_OFFSET_Y, duration: TOAST_LEAVE_DURATION_SEC, ease: 'power2.in', onComplete: done });
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
        <span class="zoom-badge">{{ zoomPercentText }}</span>
        <button
          id="master-sheet-canvas-btn-zoomin"
          type="button"
          class="floating-btn"
          title="Acercar (+)"
          @click="handleZoomIn"
        >
          +
        </button>
        <button
          id="master-sheet-canvas-btn-zoomout"
          type="button"
          class="floating-btn"
          title="Alejar (-)"
          @click="handleZoomOut"
        >
          -
        </button>
        <button
          id="master-sheet-canvas-btn-resetzoom"
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
          <span class="hud-val highlight">{{ runtimeDimensionsText }}</span>
          <span class="hud-sub">Runtime Metatiles</span>
        </div>
      </div>

      <div class="hud-input-group">
        <input
          id="master-sheet-canvas-input-newassetid"
          v-model="newAssetId"
          type="text"
          placeholder="ID canónico (ej. poke_road_slate)"
          class="hud-input"
        >
        <select
          id="master-sheet-canvas-select-newassetcategory"
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
          id="master-sheet-canvas-input-newassetname"
          v-model="newAssetName"
          type="text"
          placeholder="Nombre descriptivo"
          class="hud-input wide"
        >
        <button
          id="master-sheet-canvas-btn-copiar-json"
          type="button"
          class="hud-copy-btn"
          @click="copySnippet"
        >
          <span class="btn-emoji">📋</span> Copiar JSON
        </button>
      </div>

      <Transition
        :css="false"
        @enter="onToastEnter"
        @leave="onToastLeave"
      >
        <div
          v-if="copyFeedback"
          class="hud-feedback-toast"
        >
          {{ copyFeedback }}
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped lang="scss">
.master-canvas-pane {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #090d16;
  overflow: hidden;
}

.canvas-viewport {
  position: relative;
  background-color: var(--slate-900);
  flex: 1;
  overflow: hidden;
  cursor: crosshair;
  user-select: none;
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
  box-shadow: var(--shadow-card);
}

.canvas-floating-controls {
  position: absolute;
  top: 16px;
  right: 16px;
  z-index: var(--z-modal-step);
  display: flex;
  align-items: center;
  gap: $spacing-sm-alt;
  padding: 4px 8px;
  border: 1px solid Rgb(255 255 255 / 12%);
  border-radius: $radius-lg;
  background: Rgb(15 23 42 / 88%);
  backdrop-filter: Blur(8px);
}

.zoom-badge {
  padding: 0 6px;
  color: var(--slate-400);
  font-family: monospace;
  font-size: var(--font-11);
  font-weight: 700;
}

.floating-btn {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid var(--slate-700);
  border-radius: $radius-md;
  background: var(--slate-800);
  color: var(--slate-50);
  font-size: var(--font-14);
  cursor: pointer;

  &:hover {
    background: var(--slate-700);
    border-color: var(--slate-600);
  }
}

.selection-hud-bar {
  z-index: calc(var(--z-map-floor) + 10);
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-md;
  padding: 10px 16px;
  background: var(--slate-900);
  border-top: 1px solid Rgb(255 255 255 / 12%);
}

.hud-coords-group {
  display: flex;
  gap: $spacing-lg;
}

.hud-cell {
  display: flex;
  flex-direction: column;
  gap: $spacing-2xs;
}

.hud-label {
  color: var(--slate-500);
  font-size: var(--font-9);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.hud-val {
  color: var(--slate-200);
  font-family: monospace;
  font-size: var(--font-13);
  font-weight: 700;

  &.highlight {
    color: var(--sky);
  }
}

.hud-sub {
  color: var(--slate-400);
  font-family: monospace;
  font-size: var(--font-10);
}

.hud-input-group {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.hud-input {
  width: 170px;
  padding: 6px 10px;
  border: 1px solid var(--slate-700);
  border-radius: $radius-md;
  background: var(--slate-800);
  color: var(--slate-50);
  font-size: var(--font-12);

  &:focus {
    outline: none;
    border-color: var(--sky);
  }

  &.wide {
    width: 200px;
  }
}

.hud-select {
  padding: 6px 8px;
  border: 1px solid var(--slate-700);
  border-radius: $radius-md;
  background: var(--slate-800);
  color: var(--slate-50);
  font-size: var(--font-12);

  &:focus {
    outline: none;
    border-color: var(--sky);
  }
}

.hud-copy-btn {
  display: flex;
  align-items: center;
  gap: $spacing-sm-alt;
  padding: 6px 14px;
  border: none;
  border-radius: $radius-md;
  background: var(--sky-dark);
  color: var(--white);
  font-size: var(--font-12);
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background: var(--sky-dark);
  }
}

.hud-feedback-toast {
  position: absolute;
  bottom: 68px;
  left: 50%;
  padding: 6px 16px;
  border-radius: $radius-md;
  background: var(--emerald-500);
  color: var(--white);
  font-size: var(--font-12);
  font-weight: 700;
  transform: Translatex(-50%);
  box-shadow: $shadow-card;
}
</style>
