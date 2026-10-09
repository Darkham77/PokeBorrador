<script setup lang="ts">
/**
 * src/views/studio/AutotileStudioView.vue
 *
 * REAL CONTINENT AUTOTILE INSPECTOR & TEST BENCH
 * 100% in sync with the regional continent generator.
 * Extracts authentic 3x3 and 5x5 transition patches directly from the live continent map
 * and allows clicking on ANY individual tile to flag errors with exact coordinates.
 */

import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useRegionalContinentStudioStore } from '../stores/continentStudioStore.ts';
import {
  REAL_PATCH_CATEGORIES,
  type RealPatchCategory,
  type RealContinentPatch,
  type ResolvedPatchCell,
  type AutotileErrorReport,
  type MountainPatchSubtype
} from '../types/map/autotileStudioTypes.ts';
import {
  extractRealContinentPatches,
  extractCellNeighborhood
} from '../logic/map/realContinentPatchExtractor.ts';
import { preloadTileImages } from '../logic/map/canvasImageLoader.ts';
import AutotilePatchCard from '../components/studio/AutotilePatchCard.vue';
import AutotileReportModal from '../components/studio/AutotileReportModal.vue';

const router = useRouter();
const store = useRegionalContinentStudioStore();

const patchRadius = ref<1 | 2 | 3>(1); // 1 = 3x3, 2 = 5x5, 3 = 7x7 (default: 3x3)
const patchLimit = ref<number>(48); // default: 48 (expanded mountain inspection)
const selectedCategory = ref<RealPatchCategory>('all');
const selectedMountainSubtype = ref<MountainPatchSubtype>('all');
const showOnlyFlagged = ref<boolean>(false);
const isReportModalOpen = ref<boolean>(false);

// Map of error reports keyed by `s${seed}_x${tileX}_y${tileY}`
const errorReports = ref<Map<string, AutotileErrorReport>>(new Map());

onMounted(() => {
  if (!store.continentMap) {
    store.executeGenerationNow();
  }
});

const extractedPatches = computed<readonly RealContinentPatch[]>(() => {
  if (!store.continentMap) return [];
  return extractRealContinentPatches(
    store.continentMap,
    store.pois,
    store.pathGrid,
    store.bridgeGrid,
    store.wilderness,
    {
      radius: patchRadius.value,
      maxPerCategory: patchLimit.value,
      mountainLimit: patchLimit.value
    }
  );
});

watch(
  extractedPatches,
  async (patches) => {

    const allFilenames = new Set<string>();
    for (const p of patches) {
      if (p.instructions) {
        for (const inst of p.instructions) {
          allFilenames.add(inst.filename);
        }
      }
    }
    if (allFilenames.size > 0) {
      await preloadTileImages(allFilenames);
    }
  },
  { immediate: true }
);

const flaggedTileIds = computed<ReadonlySet<string>>(() => {
  return new Set(errorReports.value.keys());
});

const filteredPatches = computed<readonly RealContinentPatch[]>(() => {
  return extractedPatches.value.filter((patch) => {
    if (showOnlyFlagged.value) {
      const hasAnyFlagged = patch.cells.some((row) =>
        row.some((cell) => {
          const key = `s${patch.seed}_x${cell.x ?? patch.centerX}_y${cell.y ?? patch.centerY}`;
          return errorReports.value.has(key);
        })
      );
      if (!hasAnyFlagged) return false;
    }

    if (selectedCategory.value !== 'all' && patch.category !== selectedCategory.value) {
      return false;
    }

    if (selectedCategory.value === 'mountain_cliff' && selectedMountainSubtype.value !== 'all') {
      if (selectedMountainSubtype.value === 'multi_tier') {
        return patch.mountainSubtype === 'multi_tier' || (patch.maxElevationInPatch ?? 0) >= 2;
      }
      return patch.mountainSubtype === selectedMountainSubtype.value;
    }

    return true;
  });
});

const mountainSubtypeCounts = computed<Record<MountainPatchSubtype, number>>(() => {
  const counts: Record<MountainPatchSubtype, number> = {
    all: 0,
    multi_tier: 0,
    stairs: 0,
    south_wall: 0,
    corners: 0,
    base_cliff: 0
  };
  for (const p of extractedPatches.value) {
    if (p.category !== 'mountain_cliff') continue;
    counts.all++;
    if (p.mountainSubtype === 'multi_tier' || (p.maxElevationInPatch ?? 0) >= 2) {
      counts.multi_tier++;
    }
    if (p.mountainSubtype === 'stairs') {
      counts.stairs++;
    } else if (p.mountainSubtype === 'south_wall') {
      counts.south_wall++;
    } else if (p.mountainSubtype === 'corners') {
      counts.corners++;
    } else if (p.mountainSubtype === 'base_cliff') {
      counts.base_cliff++;
    }
  }
  return counts;
});

const mountainSubtypeOptions: readonly { readonly id: MountainPatchSubtype; readonly label: string }[] = [
  { id: 'all', label: 'Todos los Pisos' },
  { id: 'multi_tier', label: '🏔️ Pisos Superiores (Tier 2+)' },
  { id: 'stairs', label: '🪜 Escaleras' },
  { id: 'south_wall', label: '🧗 Paredes Sur (2.5D)' },
  { id: 'corners', label: '📐 Esquinas & Quiebres' },
  { id: 'base_cliff', label: '⛰️ Piso 1 (Base)' }
];


const reportList = computed<readonly AutotileErrorReport[]>(() => {
  return Array.from(errorReports.value.values()).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
});

const flaggedCount = computed<number>(() => {
  return errorReports.value.size;
});

function handleToggleCellFlag(payload: {
  readonly patch: RealContinentPatch;
  readonly cell: ResolvedPatchCell;
}): void {
  const tileX = payload.cell.x ?? payload.patch.centerX;
  const tileY = payload.cell.y ?? payload.patch.centerY;
  const key = `s${payload.patch.seed}_x${tileX}_y${tileY}`;

  const nextMap = new Map(errorReports.value);

  if (nextMap.has(key)) {
    nextMap.delete(key);
  } else {
    const neighborhood = store.continentMap
      ? extractCellNeighborhood(store.continentMap, tileX, tileY)
      : undefined;

    const newReport: AutotileErrorReport = {
      id: key,
      seed: payload.patch.seed,
      patchCenterX: payload.patch.centerX,
      patchCenterY: payload.patch.centerY,
      tileX,
      tileY,
      category: payload.patch.category,
      currentTile: payload.cell.filename,
      layerStack: payload.cell.layerStack,
      neighborhood,
      timestamp: new Date().toISOString()
    };
    nextMap.set(key, newReport);
  }

  errorReports.value = nextMap;
}

function handleEditCellNote(payload: {
  readonly patch: RealContinentPatch;
  readonly cell: ResolvedPatchCell;
}): void {
  const tileX = payload.cell.x ?? payload.patch.centerX;
  const tileY = payload.cell.y ?? payload.patch.centerY;
  const key = `s${payload.patch.seed}_x${tileX}_y${tileY}`;

  if (!errorReports.value.has(key)) {
    handleToggleCellFlag(payload);
  } else {
    // Bring this note to the top when opened for editing
    const rep = errorReports.value.get(key);
    if (rep) {
      const nextMap = new Map(errorReports.value);
      nextMap.set(key, { ...rep, timestamp: new Date().toISOString() });
      errorReports.value = nextMap;
    }
  }
  isReportModalOpen.value = true;
}

function handleUpdateNote(id: string, note: string): void {
  const rep = errorReports.value.get(id);
  if (!rep) return;
  const nextMap = new Map(errorReports.value);
  nextMap.set(id, { ...rep, note });
  errorReports.value = nextMap;
}

function handleRemoveReport(id: string): void {
  const nextMap = new Map(errorReports.value);
  nextMap.delete(id);
  errorReports.value = nextMap;
}

function handleClearAll(): void {
  errorReports.value = new Map();
}

function randomizeSeed(): void {
  store.seed = Math.floor(Math.random() * 900000) + 1000;
  store.executeGenerationNow();
}

const categoryLabels: Record<RealPatchCategory, string> = {
  all: 'Todos los Parches',
  water_coast: '🌊 Costas y Playas',
  mountain_cliff: '⛰️ Acantilados',
  path: '🛤️ Caminos Rurales',
  macro_biome: '🌾 Macro Biomas'
};
</script>

<template>
  <div class="autotile-studio-view">
    <!-- Top Bar Navigation & Engine Selector -->
    <header class="studio-topbar">
      <div class="brand-section">
        <button
          type="button"
          class="back-btn"
          title="Volver a Continent Studio"
          @click="router.push('/studio/continent')"
        >
          <span class="emoji-inline">←</span> Continent Studio
        </button>
        <h1 class="page-title">
          Inspector de Parches Reales del Continente
        </h1>
      </div>

      <!-- Seed Controls -->
      <div class="seed-controls">
        <span class="seed-badge">Semilla: #{{ store.seed }}</span>
        <button
          type="button"
          class="action-btn"
          title="Generar nueva región con semilla aleatoria"
          :disabled="store.isGenerating"
          @click="randomizeSeed"
        >
          <span class="emoji-inline">🎲</span> Nueva Semilla
        </button>
      </div>

      <!-- Patch Radius Selector (3x3 vs 5x5 vs 7x7) -->
      <div class="radius-toggle-group">
        <button
          type="button"
          class="radius-btn"
          :class="{ active: patchRadius === 1 }"
          @click="patchRadius = 1"
        >
          3×3
        </button>
        <button
          type="button"
          class="radius-btn"
          :class="{ active: patchRadius === 2 }"
          @click="patchRadius = 2"
        >
          5×5 (Contexto)
        </button>
        <button
          type="button"
          class="radius-btn"
          :class="{ active: patchRadius === 3 }"
          @click="patchRadius = 3"
        >
          7×7 (Gran Macizo)
        </button>
      </div>

      <!-- Patch Count Limit Selector -->
      <div class="limit-toggle-group">
        <span class="limit-label">Mostrar:</span>
        <button
          v-for="lim in [16, 32, 48, 64, 96, 128]"
          :key="lim"
          type="button"
          class="limit-btn"
          :class="{ active: patchLimit === lim }"
          @click="patchLimit = lim"
        >
          {{ lim }}
        </button>
      </div>

      <!-- Report Button -->
      <button
        type="button"
        class="report-cta-btn"
        :class="{ 'has-errors': flaggedCount > 0 }"
        @click="isReportModalOpen = true"
      >
        <span><span class="emoji-inline">📋</span> Reporte</span>
        <span class="count-badge">{{ flaggedCount }} tile{{ flaggedCount === 1 ? '' : 's' }}</span>
      </button>
    </header>

    <!-- Filter & Category Toolbar -->
    <div class="studio-toolbar">
      <div class="category-filters">
        <button
          v-for="cat in REAL_PATCH_CATEGORIES"
          :key="cat"
          type="button"
          class="filter-chip"
          :class="{ active: selectedCategory === cat }"
          @click="selectedCategory = cat"
        >
          {{ categoryLabels[cat] }}
        </button>
      </div>

      <div class="toolbar-toggles">
        <label class="toggle-label">
          <input
            v-model="showOnlyFlagged"
            type="checkbox"
            class="toggle-checkbox"
          >
          <span>Solo parches con errores ({{ flaggedCount }})</span>
        </label>
      </div>
    </div>

    <!-- Mountain Sub-Filter Toolbar (Appears when Acantilados is selected) -->
    <div
      v-if="selectedCategory === 'mountain_cliff'"
      class="mountain-subfilter-toolbar"
    >
      <div class="mountain-subfilter-label">
        <span>Filtro de Pisos y Desniveles:</span>
      </div>
      <div class="mountain-subfilter-chips">
        <button
          v-for="sub in mountainSubtypeOptions"
          :key="sub.id"
          type="button"
          class="subfilter-chip"
          :class="{ active: selectedMountainSubtype === sub.id }"
          @click="selectedMountainSubtype = sub.id"
        >
          {{ sub.label }} ({{ mountainSubtypeCounts[sub.id] }})
        </button>
      </div>
    </div>


    <!-- Main Grid of Real Patches -->
    <main class="patches-container">
      <div
        v-if="store.isGenerating"
        class="loading-state"
      >
        <span class="loading-spinner emoji-inline">⏳</span>
        <span>Generando continente y extrayendo transiciones reales...</span>
      </div>

      <div
        v-else-if="filteredPatches.length === 0"
        class="no-results"
      >
        No se encontraron parches con los filtros seleccionados en esta semilla.
      </div>

      <div
        v-else
        class="patches-grid"
      >
        <AutotilePatchCard
          v-for="patch in filteredPatches"
          :key="patch.id"
          :patch="patch"
          :flagged-tile-ids="flaggedTileIds"
          @toggle-cell-flag="handleToggleCellFlag"
          @edit-cell-note="handleEditCellNote"
        />
      </div>
    </main>

    <!-- Error Report Modal -->
    <AutotileReportModal
      :is-open="isReportModalOpen"
      :reports="reportList"
      @close="isReportModalOpen = false"
      @clear-all="handleClearAll"
      @remove-report="handleRemoveReport"
      @update-note="handleUpdateNote"
    />
  </div>
</template>

<style scoped>
.autotile-studio-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100dvh;
  min-height: 0;
  background: #090d16;
  color: #f1f5f9;
  font-family: system-ui, -apple-system, sans-serif;
  overflow: hidden;
  touch-action: auto;
}

.studio-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 20px;
  background: #0f172a;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.1);
  gap: 16px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.brand-section {
  display: flex;
  align-items: center;
  gap: 12px;
}

.back-btn {
  background: Rgba(255, 255, 255, 0.08);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  color: #94a3b8;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  font-weight: 500;
}

.back-btn:hover {
  background: Rgba(255, 255, 255, 0.15);
  color: #fff;
}

.page-title {
  font-size: 15px;
  font-weight: 700;
  margin: 0;
  color: #38bdf8;
}

.seed-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.seed-badge {
  font-family: monospace;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 8px;
  background: Rgba(56, 189, 248, 0.15);
  color: #38bdf8;
  border: 1px solid Rgba(56, 189, 248, 0.3);
  border-radius: 6px;
}

.action-btn {
  background: Rgba(255, 255, 255, 0.1);
  border: 1px solid Rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 12px;
  cursor: pointer;
  font-weight: 600;
  transition: background 0.15s ease;
}

.action-btn:hover:not(:disabled) {
  background: Rgba(255, 255, 255, 0.2);
}

.radius-toggle-group {
  display: flex;
  background: Rgba(0, 0, 0, 0.4);
  border-radius: 6px;
  padding: 2px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
}

.radius-btn {
  padding: 4px 10px;
  background: none;
  border: none;
  border-radius: 4px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.radius-btn.active {
  background: #0284c7;
  color: #fff;
}

.limit-toggle-group {
  display: flex;
  align-items: center;
  background: Rgba(0, 0, 0, 0.4);
  border-radius: 6px;
  padding: 2px 6px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  gap: 3px;
}

.limit-label {
  font-size: 11px;
  color: #94a3b8;
  font-weight: 600;
  margin-right: 2px;
}

.limit-btn {
  padding: 3px 6px;
  background: none;
  border: none;
  border-radius: 4px;
  color: #94a3b8;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
}

.limit-btn:hover {
  color: #fff;
}

.limit-btn.active {
  background: #0284c7;
  color: #fff;
}


.report-cta-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: Rgba(255, 255, 255, 0.08);
  border: 1px solid Rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease;
}

.report-cta-btn:hover {
  background: Rgba(255, 255, 255, 0.15);
}

.report-cta-btn.has-errors {
  background: #dc2626;
  border-color: #ef4444;
}

.count-badge {
  background: Rgba(0, 0, 0, 0.4);
  padding: 1px 6px;
  border-radius: 10px;
  font-size: 11px;
}

.studio-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 20px;
  background: Rgba(15, 23, 42, 0.6);
  border-bottom: 1px solid Rgba(255, 255, 255, 0.06);
  gap: 16px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.category-filters {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-chip {
  padding: 5px 12px;
  border-radius: 12px;
  background: Rgba(255, 255, 255, 0.05);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-chip:hover {
  background: Rgba(255, 255, 255, 0.12);
  color: #fff;
}

.filter-chip.active {
  background: Rgba(56, 189, 248, 0.2);
  border-color: #38bdf8;
  color: #38bdf8;
  font-weight: 600;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #cbd5e1;
  cursor: pointer;
  user-select: none;
}

.mountain-subfilter-toolbar {
  display: flex;
  align-items: center;
  padding: 8px 20px;
  background: Rgba(30, 41, 59, 0.85);
  border-bottom: 1px solid Rgba(245, 158, 11, 0.25);
  gap: 12px;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.mountain-subfilter-label {
  font-size: 11px;
  font-weight: 700;
  color: #fbbf24;
}

.mountain-subfilter-chips {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.subfilter-chip {
  padding: 3px 10px;
  border-radius: 10px;
  background: Rgba(255, 255, 255, 0.06);
  border: 1px solid Rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.subfilter-chip:hover {
  background: Rgba(255, 255, 255, 0.15);
  color: #fff;
}

.subfilter-chip.active {
  background: Rgba(245, 158, 11, 0.25);
  border-color: #fbbf24;
  color: #fbbf24;
  font-weight: 700;
}


.patches-container {
  flex: 1 1 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  overscroll-behavior-y: contain;
  padding: 16px 12px;
}

.patches-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  justify-content: center;
  width: 100%;
  box-sizing: border-box;
}

.loading-state,
.no-results {
  text-align: center;
  padding: 60px 20px;
  color: #94a3b8;
  font-size: 14px;
}

.loading-spinner {
  font-size: 24px;
  display: block;
  margin-bottom: 10px;
}
</style>
