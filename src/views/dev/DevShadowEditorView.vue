<script setup lang="ts">
/**
 * src/views/dev/DevShadowEditorView.vue
 *
 * Developer tool for visual shadow calibration across Pokémon, NPCs, and Player sprites.
 * Available strictly in development mode (import.meta.env.DEV).
 */

import { ref, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import {
  useShadowEditor,
  DEFAULT_SPRITE_ZOOM,
  MIN_SPRITE_ZOOM,
  MAX_SPRITE_ZOOM,
  SPRITE_ZOOM_STEP
} from './useShadowEditor';
import {
  MIN_SHADOW_WIDTH_RATIO,
  MAX_SHADOW_WIDTH_RATIO,
  SHADOW_WIDTH_RATIO_STEP,
  MIN_SHADOW_HEIGHT_RATIO,
  MAX_SHADOW_HEIGHT_RATIO,
  SHADOW_HEIGHT_RATIO_STEP,
  MIN_SHADOW_PIXELATION,
  MAX_SHADOW_PIXELATION,
  SHADOW_PIXELATION_STEP
} from '@/types/pokemon/spriteShadows';
import ShadowEditorCard from './components/ShadowEditorCard.vue';

const router = useRouter();
const mainScrollRef = ref<HTMLElement | null>(null);

const {
  hasUnsavedChanges,
  modifiedCount,
  isLoading,
  isSaving,
  isRebuilding,
  rebuildProgress,
  rebuildMessage,
  toastMessage,
  selectedCategory,
  selectedView,
  selectedGen,
  selectedGender,
  isShiny,
  searchQuery,
  onlyModified,
  columns,
  spriteZoom,
  globalShadowConfig,
  resetGlobalWidthRatio,
  resetGlobalHeightRatio,
  resetGlobalPixelation,
  currentPage,
  totalEntities,
  totalPages,
  pagedEntities,
  setEntityOverride,
  resetEntityOverride,
  getEffectiveOverride,
  isInheritedFromBase,
  saveChanges,
  rebuildDatabase,
  downloadJson
} = useShadowEditor();

import type { GenderName } from '@pkmn/types';

const COLUMN_OPTIONS = [2, 3, 4, 5, 6, 8] as const;
const VIEW_OPTIONS = [
  { label: 'Todas (Intercalado)', value: 'all' as const },
  { label: 'Solo Frente', value: 'front' as const },
  { label: 'Solo Espalda', value: 'back' as const }
];
const GENERATION_OPTIONS = [
  { label: 'Todas', value: 'all' as const },
  { label: 'Gen 1', value: 1 },
  { label: 'Gen 2', value: 2 },
  { label: 'Gen 3', value: 3 },
  { label: 'Gen 4', value: 4 },
  { label: 'Gen 5', value: 5 },
  { label: 'Gen 6', value: 6 },
  { label: 'Gen 7', value: 7 },
  { label: 'Gen 8', value: 8 },
  { label: 'Gen 9', value: 9 }
];

const GENDER_OPTIONS: readonly { label: string; value: 'all' | Extract<GenderName, 'M' | 'F'> }[] = [
  { label: 'Todos', value: 'all' },
  { label: '♂ Macho (M) / Base', value: 'M' },
  { label: '♀ Hembra (F)', value: 'F' }
];

const handleReturn = () => {
  router.push('/');
};

const handlePageChange = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
    if (mainScrollRef.value) {
      mainScrollRef.value.scrollTo({ top: 0, behavior: 'instant' });
    }
  }
};

const handleMainScroll = () => {
  if (mainScrollRef.value && typeof sessionStorage !== 'undefined') {
    try {
      sessionStorage.setItem('dev_shadow_scroll_top', String(mainScrollRef.value.scrollTop));
    } catch {
      // sessionStorage unavailable
    }
  }
};

const restoreScroll = () => {
  if (mainScrollRef.value && typeof sessionStorage !== 'undefined') {
    try {
      const saved = sessionStorage.getItem('dev_shadow_scroll_top');
      if (saved !== null) {
        const top = parseFloat(saved);
        if (!isNaN(top) && top > 0) {
          mainScrollRef.value.scrollTop = top;
        }
      }
    } catch {
      // sessionStorage unavailable
    }
  }
};

onMounted(() => {
  nextTick(() => {
    restoreScroll();
  });
});
</script>

<template>
  <div class="dev-shadow-editor-view">
    <!-- Top Header & Action Toolbar -->
    <header class="editor-header">
      <div class="header-left">
        <button
          type="button"
          class="action-button btn-back"
          @click="handleReturn"
        >
          <span class="emoji">←</span> Volver al Juego
        </button>
        <div class="header-title-box">
          <h1 class="header-title">
            CALIBRADOR DE SOMBRAS (DEV)
          </h1>
          <span class="header-subtitle">
            Ajuste de pies (feetX, feetY) y elevación de vuelo precalculados
          </span>
        </div>
      </div>

      <div class="header-right">
        <!-- Density / Columns selector -->
        <div class="zoom-controls">
          <span class="zoom-label">Columnas: {{ columns }}</span>
          <div class="zoom-buttons">
            <button
              v-for="col in COLUMN_OPTIONS"
              :key="col"
              type="button"
              class="zoom-btn"
              :class="{ 'is-active': columns === col }"
              @click="columns = col"
            >
              {{ col }}
            </button>
          </div>
        </div>

        <!-- Global Shadow Visual Controls (Ancho, Alto, Pixelado) -->
        <div class="global-shadow-toolbar">
          <div
            class="shadow-slider-box"
            title="Ajustar relación de ancho de la sombra base"
          >
            <span class="shadow-slider-label">Sombra Ancho: {{ Math.round(globalShadowConfig.widthRatio * 100) }}%</span>
            <input
              v-model.number="globalShadowConfig.widthRatio"
              type="range"
              class="shadow-range-slider"
              :min="MIN_SHADOW_WIDTH_RATIO"
              :max="MAX_SHADOW_WIDTH_RATIO"
              :step="SHADOW_WIDTH_RATIO_STEP"
            >
            <button
              type="button"
              class="shadow-reset-btn"
              title="Restablecer ancho al 100%"
              @click="resetGlobalWidthRatio"
            >
              <span class="emoji">↺</span>
            </button>
          </div>

          <div
            class="shadow-slider-box"
            title="Ajustar relación de alto/aspect ratio de la sombra base"
          >
            <span class="shadow-slider-label">Sombra Alto: {{ Math.round(globalShadowConfig.heightRatio * 100) }}%</span>
            <input
              v-model.number="globalShadowConfig.heightRatio"
              type="range"
              class="shadow-range-slider"
              :min="MIN_SHADOW_HEIGHT_RATIO"
              :max="MAX_SHADOW_HEIGHT_RATIO"
              :step="SHADOW_HEIGHT_RATIO_STEP"
            >
            <button
              type="button"
              class="shadow-reset-btn"
              title="Restablecer alto al 28%"
              @click="resetGlobalHeightRatio"
            >
              <span class="emoji">↺</span>
            </button>
          </div>

          <div
            class="shadow-slider-box"
            title="Ajustar qué tan pixelada se ve la sombra (resolución del canvas)"
          >
            <span class="shadow-slider-label">Pixelado: {{ globalShadowConfig.pixelation }}px</span>
            <input
              v-model.number="globalShadowConfig.pixelation"
              type="range"
              class="shadow-range-slider"
              :min="MIN_SHADOW_PIXELATION"
              :max="MAX_SHADOW_PIXELATION"
              :step="SHADOW_PIXELATION_STEP"
            >
            <button
              type="button"
              class="shadow-reset-btn"
              title="Restablecer pixelado a 14px"
              @click="resetGlobalPixelation"
            >
              <span class="emoji">↺</span>
            </button>
          </div>
        </div>

        <!-- Sprite & Shadow Zoom Slider -->
        <div class="sprite-zoom-slider-box">
          <span class="zoom-slider-label">Zoom: {{ Math.round(spriteZoom * 100) }}%</span>
          <input
            v-model.number="spriteZoom"
            type="range"
            class="zoom-range-slider"
            :min="MIN_SPRITE_ZOOM"
            :max="MAX_SPRITE_ZOOM"
            :step="SPRITE_ZOOM_STEP"
            title="Ajustar zoom de sprites y sombras para edición detallada"
          >
          <button
            type="button"
            class="zoom-reset-btn"
            title="Restablecer zoom a 200%"
            @click="spriteZoom = DEFAULT_SPRITE_ZOOM"
          >
            <span class="emoji">↺</span>
          </button>
        </div>

        <!-- Overrides Counter Badge -->
        <div
          class="modified-counter"
          :class="{ 'has-modifications': modifiedCount > 0 }"
        >
          {{ modifiedCount }} overrides
        </div>

        <!-- Recompile BD Button -->
        <button
          type="button"
          class="action-button btn-rebuild"
          :disabled="isSaving || isRebuilding"
          title="Recompilar pokemonFeetDatabase.json y gritos en disco"
          @click="rebuildDatabase"
        >
          <span v-if="isRebuilding"><span class="emoji">⚙️</span> Compilando...</span>
          <span v-else><span class="emoji">⚡</span> Recompilar BD</span>
        </button>

        <!-- JSON Download Button -->
        <button
          type="button"
          class="action-button btn-download"
          title="Descargar spriteShadowOverrides.json localmente"
          @click="downloadJson"
        >
          <span class="emoji">📥</span> Descargar JSON
        </button>

        <!-- Save Button -->
        <button
          type="button"
          class="action-button btn-save"
          :class="{ 'has-unsaved': hasUnsavedChanges }"
          :disabled="isSaving || isRebuilding"
          @click="saveChanges"
        >
          <span v-if="isSaving"><span class="emoji">⏳</span> Guardando...</span>
          <span v-else-if="hasUnsavedChanges"><span class="emoji">💾</span> Guardar Cambios *</span>
          <span v-else><span class="emoji">✅</span> Guardado</span>
        </button>
      </div>
    </header>

    <!-- Real-time DB Rebuild Progress Banner (SSE) -->
    <div
      v-if="isRebuilding || (rebuildProgress > 0 && rebuildProgress < 100)"
      class="rebuild-progress-banner"
    >
      <div class="progress-meta">
        <span class="progress-status-msg">
          <span class="pulse-dot" /> {{ rebuildMessage }}
        </span>
        <span class="progress-percent-val">{{ rebuildProgress }}%</span>
      </div>
      <div class="progress-track-bg">
        <div
          class="progress-fill-bar"
          :style="{ width: `${rebuildProgress}%` }"
        />
      </div>
    </div>

    <!-- Secondary Filter Toolbar -->
    <nav class="filter-toolbar">
      <!-- Category Tabs -->
      <div class="category-tabs">
        <button
          type="button"
          class="tab-btn"
          :class="{ 'is-active': selectedCategory === 'pokemon' }"
          @click="selectedCategory = 'pokemon'; currentPage = 1;"
        >
          Pokémon
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ 'is-active': selectedCategory === 'npc' }"
          @click="selectedCategory = 'npc'; currentPage = 1;"
        >
          NPCs
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ 'is-active': selectedCategory === 'trainer' }"
          @click="selectedCategory = 'trainer'; currentPage = 1;"
        >
          Jugadores / Clases
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ 'is-active': selectedCategory === 'all' }"
          @click="selectedCategory = 'all'; currentPage = 1;"
        >
          Todos
        </button>
      </div>

      <!-- Contextual Filters Row -->
      <div class="sub-filters">
        <!-- Pokémon Generations (Only if pokemon) -->
        <div
          v-if="selectedCategory === 'pokemon'"
          class="gen-filter-group"
        >
          <label class="filter-label">Gen:</label>
          <select
            v-model="selectedGen"
            class="filter-select"
            @change="currentPage = 1"
          >
            <option
              v-for="opt in GENERATION_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Pokémon Gender Filter (Only if pokemon) -->
        <div
          v-if="selectedCategory === 'pokemon'"
          class="gen-filter-group"
        >
          <label class="filter-label">Género:</label>
          <select
            v-model="selectedGender"
            class="filter-select"
            @change="currentPage = 1"
          >
            <option
              v-for="opt in GENDER_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Shiny Switch (Pokémon) -->
        <label
          v-if="selectedCategory === 'pokemon'"
          class="checkbox-label"
        >
          <input
            v-model="isShiny"
            type="checkbox"
            class="filter-checkbox"
          >
          <span><span class="emoji">✨</span> Shiny</span>
        </label>

        <!-- View Filter (All Intercalated / Front Only / Back Only) -->
        <div class="gen-filter-group">
          <label class="filter-label">Vista:</label>
          <select
            v-model="selectedView"
            class="filter-select"
            @change="currentPage = 1"
          >
            <option
              v-for="opt in VIEW_OPTIONS"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Only Modified Switch -->
        <label class="checkbox-label">
          <input
            v-model="onlyModified"
            type="checkbox"
            class="filter-checkbox"
            @change="currentPage = 1"
          >
          <span>Solo Modificados</span>
        </label>

        <!-- Search Input -->
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Buscar por nombre o archivo..."
            @input="currentPage = 1"
          >
          <button
            v-if="searchQuery"
            type="button"
            class="search-clear-btn"
            @click="searchQuery = ''; currentPage = 1;"
          >
            <span class="emoji">✕</span>
          </button>
        </div>
      </div>
    </nav>

    <!-- Main Content Area -->
    <main
      ref="mainScrollRef"
      class="editor-main"
      @scroll.passive="handleMainScroll"
    >
      <!-- Loading State -->
      <div
        v-if="isLoading"
        class="state-message"
      >
        <div class="spinner" />
        <p>Cargando catálogo de sprites y sombras...</p>
      </div>

      <!-- Empty State -->
      <div
        v-else-if="pagedEntities.length === 0"
        class="state-message"
      >
        <p class="empty-title">
          No se encontraron entidades con los filtros actuales.
        </p>
        <button
          type="button"
          class="action-button btn-back"
          @click="searchQuery = ''; onlyModified = false; selectedGen = 'all'; selectedView = 'all';"
        >
          Limpiar Filtros
        </button>
      </div>

      <!-- Entities Grid -->
      <div
        v-else
        class="entities-grid"
        :style="{ '--grid-columns': columns }"
      >
        <ShadowEditorCard
          v-for="entity in pagedEntities"
          :key="entity.key"
          :entity="entity"
          :override="getEffectiveOverride(entity.key)"
          :is-inherited="isInheritedFromBase(entity.key)"
          :is-shiny="isShiny"
          :zoom="spriteZoom"
          :shadow-config="globalShadowConfig"
          @update-override="setEntityOverride"
          @reset-override="resetEntityOverride"
        />
      </div>
    </main>

    <!-- Pagination Footer -->
    <footer
      v-if="!isLoading && totalEntities > 0"
      class="editor-footer"
    >
      <div class="pagination-info">
        Mostrando {{ (currentPage - 1) * 50 + 1 }} - {{ Math.min(currentPage * 50, totalEntities) }} de {{ totalEntities }} entidades
      </div>

      <div class="pagination-controls">
        <button
          type="button"
          class="page-btn"
          :disabled="currentPage <= 1"
          @click="handlePageChange(1)"
        >
          ««
        </button>
        <button
          type="button"
          class="page-btn"
          :disabled="currentPage <= 1"
          @click="handlePageChange(currentPage - 1)"
        >
          ‹ Anterior
        </button>

        <span class="page-indicator">
          Página {{ currentPage }} de {{ totalPages }}
        </span>

        <button
          type="button"
          class="page-btn"
          :disabled="currentPage >= totalPages"
          @click="handlePageChange(currentPage + 1)"
        >
          Siguiente ›
        </button>
        <button
          type="button"
          class="page-btn"
          :disabled="currentPage >= totalPages"
          @click="handlePageChange(totalPages)"
        >
          »»
        </button>
      </div>
    </footer>

    <!-- Toast Notification Banner -->
    <div
      v-if="toastMessage"
      class="toast-banner"
    >
      {{ toastMessage }}
    </div>
  </div>
</template>

<style scoped lang="scss" src="@/styles/views/_dev-shadow-editor.scss"></style>
