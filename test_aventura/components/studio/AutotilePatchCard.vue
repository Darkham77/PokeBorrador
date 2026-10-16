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
import { CANVAS_TILE_SIZE } from '../../config/studioConstants.ts';
import type { RealContinentPatch, ResolvedPatchCell } from '../../types/map/autotileStudioTypes.ts';

const props = defineProps<{
  readonly patch: RealContinentPatch;
  readonly flaggedTileIds: ReadonlySet<string>;
}>();

const emit = defineEmits<{
  (
    e: 'toggleCellFlag',
    payload: { readonly patch: RealContinentPatch; readonly cell: ResolvedPatchCell }
  ): void;
  (
    e: 'editCellNote',
    payload: { readonly patch: RealContinentPatch; readonly cell: ResolvedPatchCell }
  ): void;
}>();

const gridSizePx = computed(() => {
  const side = props.patch.radius * 2 + 1;
  return side * CANVAS_TILE_SIZE;
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

const HIGH_TIER_ELEVATION_THRESHOLD = 2;
const isHighTierElevation = computed(
  () => (props.patch.maxElevationInPatch ?? 0) >= HIGH_TIER_ELEVATION_THRESHOLD
);

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

  const minPx = (props.patch.centerX - props.patch.radius) * CANVAS_TILE_SIZE;
  const minPy = (props.patch.centerY - props.patch.radius) * CANVAS_TILE_SIZE;
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
    v-gsap-hover
    class="real-patch-card"
    :class="{ 'has-errors': flaggedCountInPatch > 0 }"
    :data-patch-id="patch.id"
  >
    <!-- Header with Coordinates and Category -->
    <div class="card-header">
      <div class="coord-badge" title="Coordenadas centrales en el mapa">
        <span class="emoji-inline">{{ categoryIcon }}</span> ({{ patch.centerX }},
        {{ patch.centerY }})
      </div>
      <div
        v-if="patch.category === 'mountain_cliff'"
        class="elev-badge"
        :class="{ 'high-tier': isHighTierElevation }"
        :title="patch.description"
      >
        <span v-if="patch.mountainSubtype === 'stairs'"
          ><span class="emoji-inline">🪜</span> Escalera</span
        >
        <span v-else-if="isHighTierElevation"
          ><span class="emoji-inline">🏔️</span> Piso {{ patch.maxElevationInPatch }}</span
        >
        <span v-else><span class="emoji-inline">⛰️</span> Piso 1</span>
      </div>
      <div class="patch-status-badge" :class="{ 'error-active': flaggedCountInPatch > 0 }">
        <span v-if="flaggedCountInPatch > 0"
          ><span class="emoji-inline">⚠️</span> {{ flaggedCountInPatch }} error{{
            flaggedCountInPatch > 1 ? 'es' : ''
          }}</span
        >
        <span v-else><span class="emoji-inline">⚪</span> OK</span>
      </div>
    </div>

    <!-- Title of the geographic transition -->
    <div class="patch-title" :title="patch.title">
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
      <canvas ref="canvasRef" :width="gridSizePx" :height="gridSizePx" class="patch-canvas" />

      <!-- Interactive transparent cell grid for hovering and flagging -->
      <div class="interactive-grid">
        <div v-for="(row, rIdx) in patch.cells" :key="`row-${rIdx}`" class="grid-row">
          <div
            v-for="(cell, cIdx) in row"
            id="autotile-patch-card-div-cellclick"
            :key="`cell-${rIdx}-${cIdx}`"
            class="grid-cell"
            :class="{
              'center-cell': cell.isCenter,
              'is-flagged-tile': isCellFlagged(cell)
            }"
            :title="`(${cell.x}, ${cell.y}) - ${cell.filename} — Clic para marcar/desmarcar`"
            role="button"
            tabindex="0"
            @click="onCellClick(cell)"
          >
            <!-- Center indicator ring -->
            <div v-if="cell.isCenter" class="center-focus-ring" />
            <!-- Red marker pin for flagged individual tile -->
            <div v-if="isCellFlagged(cell)" class="tile-flag-indicator">
              <span class="emoji-inline">⚠️</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer Description & Note -->
    <div class="card-footer">
      <span class="patch-hint">
        {{
          flaggedCountInPatch > 0
            ? `${flaggedCountInPatch} marcado(s)`
            : 'Clic en un tile para marcar'
        }}
      </span>
      <button
        v-if="flaggedCountInPatch > 0"
        id="autotile-patch-card-btn-nota"
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

<style scoped lang="scss">
.real-patch-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: $spacing-sm;
  padding: 10px;
  border: 1px solid Rgb(255 255 255 / 12%);
  border-radius: $radius-lg-alt;
  background: Rgb(15 23 42 / 95%);
  user-select: none;
  box-shadow: $shadow-card-subtle;
}

.real-patch-card:hover {
  border-color: Rgb(56 189 248 / 50%);
  box-shadow: var(--shadow-card);
}

.real-patch-card.has-errors {
  background: Rgb(45 18 24 / 95%);
  border-color: var(--red-light);
  box-shadow: var(--shadow-glow-amber-lg);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.coord-badge {
  padding: 2px 6px;
  border-radius: $radius-sm;
  background: Rgb(255 255 255 / 8%);
  color: var(--sky);
  font-family: monospace;
  font-size: var(--font-11);
  font-weight: 700;
}

.patch-status-badge {
  padding: 2px 6px;
  border-radius: $radius-sm;
  background: Rgb(255 255 255 / 8%);
  color: var(--slate-400);
  font-size: var(--font-10);
  font-weight: 600;
}

.patch-status-badge.error-active {
  background: var(--red-light);
  color: var(--white);
}

.elev-badge {
  padding: 2px 6px;
  border: 1px solid Rgb(245 158 11 / 30%);
  border-radius: $radius-sm;
  background: Rgb(245 158 11 / 15%);
  color: var(--amber);
  font-size: var(--font-10);
  font-weight: 700;
}

.elev-badge.high-tier {
  background: Rgb(168 85 247 / 20%);
  color: var(--purple-400);
  border-color: Rgb(168 85 247 / 40%);
}

.patch-title {
  width: 100%;
  max-width: 100%;
  color: var(--slate-100);
  font-size: var(--font-11);
  font-weight: 600;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grid-viewport {
  position: relative;
  border: 2px solid Rgb(0 0 0 / 80%);
  border-radius: $radius-sm;
  background: var(--black);
  overflow: hidden;
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
  z-index: calc(var(--z-base) + 1);
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
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
  z-index: calc(var(--z-base) + 2);
  outline: 2px solid #38bdf8;
  outline-offset: -2px;
}

.grid-cell.is-flagged-tile {
  z-index: calc(var(--z-base) + 3);
  outline: 2px solid #ef4444 !important;
  outline-offset: -2px;
  box-shadow: var(--shadow-card);
}

.center-cell {
  border: 1px dashed Rgb(255 255 255 / 40%);
}

.center-focus-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 6px;
  height: 6px;
  border: 1px solid Rgb(255 255 255 / 70%);
  border-radius: 50%;
  transform: Translate(-50%, -50%);
  pointer-events: none;
}

.tile-flag-indicator {
  position: absolute;
  top: 1px;
  right: 1px;
  font-size: var(--font-10);
  line-height: 1;
  text-shadow: 0 0 2px #000;
  pointer-events: none;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-xs;
  width: 100%;
}

.patch-hint {
  max-width: 120px;
  color: var(--slate-500);
  font-size: var(--font-10);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note-btn {
  padding: 2px 6px;
  border: 1px solid var(--amber-dark);
  border-radius: $radius-sm;
  background: Rgb(245 158 11 / 20%);
  color: var(--amber-300);
  font-size: var(--font-10);
  cursor: pointer;
  white-space: nowrap;
}

.note-btn:hover {
  background: Rgb(245 158 11 / 35%);
  color: var(--white);
}
</style>
