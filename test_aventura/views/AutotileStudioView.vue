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

const DEFAULT_PATCH_INSPECTION_LIMIT = 48;
const RANDOM_SEED_RANGE = 900000;
const RANDOM_SEED_MIN = 1000;

const PATCH_RADIUS_OPTIONS = [
  { radius: 1, label: '3×3' },
  { radius: 2, label: '5×5 (Contexto)' },
  { radius: 3, label: '7×7 (Gran Macizo)' }
] as const;

const router = useRouter();
const store = useRegionalContinentStudioStore();

const patchRadius = ref<1 | 2 | 3>(1); // 1 = 3x3, 2 = 5x5, 3 = 7x7 (default: 3x3)
const patchLimit = ref<number>(DEFAULT_PATCH_INSPECTION_LIMIT); // default: 48 (expanded mountain inspection)
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
    (a, b) => Temporal.Instant.from(b.timestamp).epochMilliseconds - Temporal.Instant.from(a.timestamp).epochMilliseconds
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
      timestamp: Temporal.Now.instant().toString()
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
      nextMap.set(key, { ...rep, timestamp: Temporal.Now.instant().toString() });
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
  store.seed = Math.floor(Math.random() * RANDOM_SEED_RANGE) + RANDOM_SEED_MIN;
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
          id="btn-autotile-back"
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
          id="btn-autotile-randomize-seed"
          v-gsap-hover="'button'"
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
          v-for="opt in PATCH_RADIUS_OPTIONS"
          :id="`btn-radius-${opt.radius}`"
          :key="opt.radius"
          type="button"
          class="radius-btn"
          :class="{ active: patchRadius === opt.radius }"
          @click="patchRadius = opt.radius"
        >
          {{ opt.label }}
        </button>
      </div>

      <!-- Patch Count Limit Selector -->
      <div class="limit-toggle-group">
        <span class="limit-label">Mostrar:</span>
        <button
          v-for="lim in [16, 32, 48, 64, 96, 128]"
          :id="`btn-limit-${lim}`"
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
        id="btn-autotile-report"
        v-gsap-hover="'button'"
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
          :id="`btn-category-${cat}`"
          :key="cat"
          v-gsap-hover="'pill'"
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
            id="checkbox-only-flagged"
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
          :id="`btn-mountain-sub-${sub.id}`"
          :key="sub.id"
          v-gsap-hover="'pill'"
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

<style scoped lang="scss">
.autotile-studio-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  max-height: 100dvh;
  background: #090d16;
  color: var(--slate-100);
  font-family: $font-family-sans;
  overflow: hidden;
  touch-action: auto;
}

.studio-topbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-lg;
  padding: 10px 20px;
  background: var(--slate-900);
  border-bottom: 1px solid Rgb(255 255 255 / 10%);
  flex-shrink: 0;
}

.brand-section {
  display: flex;
  align-items: center;
  gap: $spacing-md;
}

.back-btn {
  padding: 6px 12px;
  border: 1px solid Rgb(255 255 255 / 15%);
  border-radius: $radius-md;
  background: Rgb(255 255 255 / 8%);
  color: var(--slate-400);
  font-size: var(--font-12);
  font-weight: 500;
  cursor: pointer;
}

.back-btn:hover {
  background: Rgb(255 255 255 / 15%);
  color: var(--white);
}

.page-title {
  margin: 0;
  color: var(--sky);
  font-size: var(--font-15);
  font-weight: 700;
}

.seed-controls {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
}

.seed-badge {
  padding: 4px 8px;
  border: 1px solid Rgb(56 189 248 / 30%);
  border-radius: $radius-md;
  background: Rgb(56 189 248 / 15%);
  color: var(--sky);
  font-family: monospace;
  font-size: var(--font-12);
  font-weight: 700;
}

.action-btn {
  padding: 6px 12px;
  border: 1px solid Rgb(255 255 255 / 20%);
  border-radius: $radius-md;
  background: Rgb(255 255 255 / 10%);
  color: var(--white);
  font-size: var(--font-12);
  font-weight: 600;
  cursor: pointer;
}

.action-btn:hover:not(:disabled) {
  background: Rgb(255 255 255 / 20%);
}

.radius-toggle-group {
  display: flex;
  padding: 2px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: $radius-md;
  background: Rgb(0 0 0 / 40%);
}

.radius-btn {
  padding: 4px 10px;
  border: none;
  border-radius: $radius-sm;
  background: none;
  color: var(--slate-400);
  font-size: var(--font-11);
  font-weight: 600;
  cursor: pointer;
}

.radius-btn.active {
  background: var(--sky-dark);
  color: var(--white);
}

.limit-toggle-group {
  display: flex;
  align-items: center;
  gap: $spacing-xs-alt;
  padding: 2px 6px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: $radius-md;
  background: Rgb(0 0 0 / 40%);
}

.limit-label {
  color: var(--slate-400);
  font-size: var(--font-11);
  font-weight: 600;
  margin-right: 2px;
}

.limit-btn {
  padding: 3px 6px;
  border: none;
  border-radius: $radius-sm;
  background: none;
  color: var(--slate-400);
  font-size: var(--font-11);
  font-weight: 600;
  cursor: pointer;
}

.limit-btn:hover {
  color: var(--white);
}

.limit-btn.active {
  background: var(--sky-dark);
  color: var(--white);
}


.report-cta-btn {
  display: flex;
  align-items: center;
  gap: $spacing-sm;
  padding: 8px 16px;
  border: 1px solid Rgb(255 255 255 / 20%);
  border-radius: $radius-md;
  background: Rgb(255 255 255 / 8%);
  color: var(--white);
  font-size: var(--font-13);
  font-weight: 600;
  cursor: pointer;
}

.report-cta-btn:hover {
  background: Rgb(255 255 255 / 15%);
}

.report-cta-btn.has-errors {
  background: var(--red-600);
  border-color: var(--red-light);
}

.count-badge {
  padding: 1px 6px;
  border-radius: $radius-lg-alt;
  background: Rgb(0 0 0 / 40%);
  font-size: var(--font-11);
}

.studio-toolbar {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-lg;
  padding: 8px 20px;
  background: Rgb(15 23 42 / 60%);
  border-bottom: 1px solid Rgb(255 255 255 / 6%);
  flex-shrink: 0;
}

.category-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-sm-alt;
}

.filter-chip {
  padding: 5px 12px;
  border: 1px solid Rgb(255 255 255 / 10%);
  border-radius: $radius-xl;
  background: Rgb(255 255 255 / 5%);
  color: var(--slate-400);
  font-size: var(--font-12);
  cursor: pointer;
}

.filter-chip:hover {
  background: Rgb(255 255 255 / 12%);
  color: var(--white);
}

.filter-chip.active {
  background: Rgb(56 189 248 / 20%);
  color: var(--sky);
  font-weight: 600;
  border-color: var(--sky);
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: $spacing-sm-alt;
  color: var(--slate-300);
  font-size: var(--font-12);
  cursor: pointer;
  user-select: none;
}

.mountain-subfilter-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-md;
  padding: 8px 20px;
  background: Rgb(30 41 59 / 85%);
  border-bottom: 1px solid Rgb(245 158 11 / 25%);
  flex-shrink: 0;
}

.mountain-subfilter-label {
  color: var(--amber);
  font-size: var(--font-11);
  font-weight: 700;
}

.mountain-subfilter-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: $spacing-sm-alt;
}

.subfilter-chip {
  padding: 3px 10px;
  border: 1px solid Rgb(255 255 255 / 15%);
  border-radius: $radius-lg-alt;
  background: Rgb(255 255 255 / 6%);
  color: var(--slate-300);
  font-size: var(--font-11);
  cursor: pointer;
}

.subfilter-chip:hover {
  background: Rgb(255 255 255 / 15%);
  color: var(--white);
}

.subfilter-chip.active {
  background: Rgb(245 158 11 / 25%);
  color: var(--amber);
  font-weight: 700;
  border-color: var(--amber);
}


.patches-container {
  min-height: 0;
  padding: 16px 12px;
  flex: 1 1 0;
  overflow: hidden auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  overscroll-behavior-y: contain;
}

.patches-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: $spacing-lg;
  width: 100%;
  box-sizing: border-box;
}

.loading-state,
.no-results {
  padding: 60px 20px;
  color: var(--slate-400);
  font-size: var(--font-14);
  text-align: center;
}

.loading-spinner {
  display: block;
  font-size: var(--font-24);
  margin-bottom: 10px;
}
</style>
