<script setup lang="ts">
/**
 * src/components/map/studio/AutotilePatchCard.vue
 *
 * REAL CONTINENT TRANSITION PATCH CARD WITH PER-TILE ERROR MARKING
 * Renders a slice of the generated continent (3x3 or 5x5).
 * Allows the user to click on ANY individual tile to flag it as erroneous.
 */

import { ref, computed, watch, onMounted } from 'vue';
import { preloadTileImages, getImageCache } from '../../logic/map/canvasImageLoader.ts';
import type {
  RealContinentPatch,
  ResolvedPatchCell
} from '../../types/map/autotileStudioTypes.ts';

const props = defineProps<{
  readonly patch: RealContinentPatch;
  readonly flaggedTileIds: ReadonlySet<string>;
}>();

const emit = defineEmits<{
  (e: 'toggleCellFlag', payload: { readonly patch: RealContinentPatch; readonly cell: ResolvedPatchCell }): void;
  (e: 'editCellNote', payload: { readonly patch: RealContinentPatch; readonly cell: ResolvedPatchCell }): void;
}>();

const gridSizePx = computed(() => {
  const side = props.patch.radius * 2 + 1;
  return side * 32;
});

const categoryIcon = computed(() => {
  switch (props.patch.category) {
    case 'water_coast':
      return '🌊';
    case 'mountain_cliff':
      return '⛰️';
    case 'path':
      return '🛤️';
    case 'macro_biome':
      return '🌾';
    default:
      return '🧩';
  }
});

function getCellId(cell: ResolvedPatchCell): string {
  return `s${props.patch.seed}_x${cell.x ?? props.patch.centerX}_y${cell.y ?? props.patch.centerY}`;
}

function isCellFlagged(cell: ResolvedPatchCell): boolean {
  return props.flaggedTileIds.has(getCellId(cell));
}

const flaggedCountInPatch = computed(() => {
  let count = 0;
  for (const row of props.patch.cells) {
    for (const cell of row) {
      if (isCellFlagged(cell)) {
        count++;
      }
    }
  }
  return count;
});

function onCellClick(cell: ResolvedPatchCell): void {
  emit('toggleCellFlag', { patch: props.patch, cell });
}

function onNoteClick(event: MouseEvent): void {
  event.stopPropagation();
  // Find first flagged cell or center cell
  let targetCell = props.patch.centerCell;
  for (const row of props.patch.cells) {
    for (const cell of row) {
      if (isCellFlagged(cell)) {
        targetCell = cell;
        break;
      }
    }
  }
  emit('editCellNote', { patch: props.patch, cell: targetCell });
}

const canvasRef = ref<HTMLCanvasElement | null>(null);
const drawToken = ref(0);

async function drawPatch(): Promise<void> {
  const token = ++drawToken.value;
  const canvas = canvasRef.value;
  if (!canvas) return;

  const instructions = props.patch.instructions ?? [];
  const filenames = instructions.map((i) => i.filename);
  if (filenames.length > 0) {
    await preloadTileImages(filenames);
  }

  if (drawToken.value !== token || canvasRef.value !== canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#0a1428';
  ctx.fillRect(0, 0, gridSizePx.value, gridSizePx.value);

  const minPx = (props.patch.centerX - props.patch.radius) * 32;
  const minPy = (props.patch.centerY - props.patch.radius) * 32;
  const cache = getImageCache();

  for (const inst of instructions) {
    const img = cache.get(inst.filename);
    if (img) {
      ctx.drawImage(img, inst.px - minPx, inst.py - minPy);
    }
  }
}

onMounted(() => {
  drawPatch();
});

watch(
  () => [props.patch, gridSizePx.value],
  () => {
    drawPatch();
  },
  { deep: true }
);
</script>

<template>
  <div
    class="real-patch-card"
    :class="{ 'has-errors': flaggedCountInPatch > 0 }"
    :data-patch-id="patch.id"
  >
    <!-- Header with Coordinates and Category -->
    <div class="card-header">
      <div
        class="coord-badge"
        title="Coordenadas centrales en el mapa"
      >
        <span class="emoji-inline">{{ categoryIcon }}</span> ({{ patch.centerX }}, {{ patch.centerY }})
      </div>
      <div
        v-if="patch.category === 'mountain_cliff'"
        class="elev-badge"
        :class="{ 'high-tier': (patch.maxElevationInPatch ?? 0) >= 2 }"
        :title="patch.description"
      >
        <span v-if="patch.mountainSubtype === 'stairs'"><span class="emoji-inline">🪜</span> Escalera</span>
        <span v-else-if="(patch.maxElevationInPatch ?? 0) >= 2"><span class="emoji-inline">🏔️</span> Piso {{ patch.maxElevationInPatch }}</span>
        <span v-else><span class="emoji-inline">⛰️</span> Piso 1</span>
      </div>
      <div
        class="patch-status-badge"
        :class="{ 'error-active': flaggedCountInPatch > 0 }"
      >
        <span v-if="flaggedCountInPatch > 0"><span class="emoji-inline">⚠️</span> {{ flaggedCountInPatch }} error{{ flaggedCountInPatch > 1 ? 'es' : '' }}</span>
        <span v-else><span class="emoji-inline">⚪</span> OK</span>
      </div>
    </div>

    <!-- Title of the geographic transition -->
    <div
      class="patch-title"
      :title="patch.title"
    >
      {{ patch.title }}
    </div>

    <!-- Grid Container (96x96 for 3x3, 160x160 for 5x5) -->
    <div
      class="grid-viewport"
      :style="{
        width: `${gridSizePx}px`,
        height: `${gridSizePx}px`
      }"
    >
      <!-- Authentic 2D Canvas rendering continent graphics with multi-tile prefabs -->
      <canvas
        ref="canvasRef"
        :width="gridSizePx"
        :height="gridSizePx"
        class="patch-canvas"
      />

      <!-- Interactive transparent cell grid for hovering and flagging -->
      <div class="interactive-grid">
        <div
          v-for="(row, rIdx) in patch.cells"
          :key="`row-${rIdx}`"
          class="grid-row"
        >
          <div
            v-for="(cell, cIdx) in row"
            :key="`cell-${rIdx}-${cIdx}`"
            class="grid-cell"
            :class="{
              'center-cell': cell.isCenter,
              'is-flagged-tile': isCellFlagged(cell)
            }"
            :title="`(${cell.x}, ${cell.y}) - ${cell.filename} — Clic para marcar/desmarcar`"
            @click="onCellClick(cell)"
          >
            <!-- Center indicator ring -->
            <div
              v-if="cell.isCenter"
              class="center-focus-ring"
            />
            <!-- Red marker pin for flagged individual tile -->
            <div
              v-if="isCellFlagged(cell)"
              class="tile-flag-indicator"
            >
              <span class="emoji-inline">⚠️</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Description & Note -->
    <div class="card-footer">
      <span class="patch-hint">
        {{ flaggedCountInPatch > 0 ? `${flaggedCountInPatch} marcado(s)` : 'Clic en un tile para marcar' }}
      </span>
      <button
        v-if="flaggedCountInPatch > 0"
        type="button"
        class="note-btn has-note"
        title="Abrir reporte y notas"
        @click="onNoteClick"
      >
        <span class="emoji-inline">📝</span> Nota
      </button>
    </div>
  </div>
</template>

<style scoped>
.real-patch-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: Rgba(15, 23, 42, 0.95);
  border: 1px solid Rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  user-select: none;
  transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 4px 12px Rgba(0, 0, 0, 0.3);
}

.real-patch-card:hover {
  border-color: Rgba(56, 189, 248, 0.5);
  box-shadow: 0 8px 20px Rgba(0, 0, 0, 0.5);
}

.real-patch-card.has-errors {
  border-color: #ef4444;
  background: Rgba(45, 18, 24, 0.95);
  box-shadow: 0 0 16px Rgba(239, 68, 68, 0.4);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.coord-badge {
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 6px;
  background: Rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  color: #38bdf8;
}

.patch-status-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  background: Rgba(255, 255, 255, 0.08);
  color: #94a3b8;
}

.patch-status-badge.error-active {
  background: #ef4444;
  color: #fff;
}

.elev-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  background: Rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid Rgba(245, 158, 11, 0.3);
}

.elev-badge.high-tier {
  background: Rgba(168, 85, 247, 0.2);
  color: #c084fc;
  border-color: Rgba(168, 85, 247, 0.4);
}

.patch-title {
  font-size: 11px;
  font-weight: 600;
  color: #f1f5f9;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  width: 100%;
}

.grid-viewport {
  position: relative;
  border: 2px solid Rgba(0, 0, 0, 0.8);
  border-radius: 4px;
  overflow: hidden;
  background: #000;
}

.patch-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  pointer-events: none;
}

.interactive-grid {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  z-index: calc(var(--z-base) + 1);
}

.grid-row {
  display: flex;
  height: 32px;
}

.grid-cell {
  position: relative;
  width: 32px;
  height: 32px;
  background: transparent;
  overflow: hidden;
  cursor: pointer;
  box-sizing: border-box;
}

.grid-cell:hover {
  outline: 2px solid #38bdf8;
  outline-offset: -2px;
  z-index: calc(var(--z-base) + 2);
}

.grid-cell.is-flagged-tile {
  outline: 2px solid #ef4444 !important;
  outline-offset: -2px;
  box-shadow: inset 0 0 8px Rgba(239, 68, 68, 0.8);
  z-index: calc(var(--z-base) + 3);
}

.center-cell {
  border: 1px dashed Rgba(255, 255, 255, 0.4);
}

.center-focus-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 6px;
  transform: Translate(-50%, -50%);
  border: 1px solid Rgba(255, 255, 255, 0.7);
  border-radius: 50%;
  pointer-events: none;
}

.tile-flag-indicator {
  position: absolute;
  top: 1px;
  right: 1px;
  font-size: 10px;
  line-height: 1;
  text-shadow: 0 0 2px #000;
  pointer-events: none;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 4px;
}

.patch-hint {
  font-size: 10px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 120px;
}

.note-btn {
  font-size: 10px;
  padding: 2px 6px;
  background: Rgba(245, 158, 11, 0.2);
  border: 1px solid #f59e0b;
  color: #fcd34d;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.note-btn:hover {
  background: Rgba(245, 158, 11, 0.35);
  color: #fff;
}
</style>
