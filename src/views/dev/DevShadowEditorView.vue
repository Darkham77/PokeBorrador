<script setup lang="ts">
/**
 * src/views/dev/DevShadowEditorView.vue
 *
 * Developer tool for visual shadow calibration across Pokémon, NPCs, and Player sprites.
 * Available strictly in development mode (import.meta.env.DEV).
 */

import { ref, computed, onMounted, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import {
  useShadowEditor,
  DEFAULT_SPRITE_ZOOM
} from './useShadowEditor.ts';
import {
  DEFAULT_PAGE_SIZE,
  formatRatioPercent,
  formatPaginationRange,
  isRebuildProgressActive,
  resolveSaveButtonState
} from './devShadowMathHelper.ts';
import ShadowEditorCard from './components/ShadowEditorCard.vue';
import DevShadowHeaderToolbar from './components/DevShadowHeaderToolbar.vue';
import DevShadowFilterBar from './components/DevShadowFilterBar.vue';

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

const shadowWidthPercent = computed(() => formatRatioPercent(globalShadowConfig.value.widthRatio));
const shadowHeightPercent = computed(() => formatRatioPercent(globalShadowConfig.value.heightRatio));
const spriteZoomPercent = computed(() => formatRatioPercent(spriteZoom.value));
const isProgressVisible = computed(() => isRebuildProgressActive(isRebuilding.value, rebuildProgress.value));
const saveButtonState = computed(() => resolveSaveButtonState(isSaving.value, hasUnsavedChanges.value));
const paginationRangeText = computed(() => formatPaginationRange(currentPage.value, DEFAULT_PAGE_SIZE, totalEntities.value));
const canGoPrev = computed(() => currentPage.value > 1);
const canGoNext = computed(() => currentPage.value < totalPages.value);

const handleReturn = () => {
  router.push('/');
};

const handleUpdateWidthRatio = (widthRatio: number) => {
  globalShadowConfig.value = { ...globalShadowConfig.value, widthRatio };
};

const handleUpdateHeightRatio = (heightRatio: number) => {
  globalShadowConfig.value = { ...globalShadowConfig.value, heightRatio };
};

const handleUpdatePixelation = (pixelation: number) => {
  globalShadowConfig.value = { ...globalShadowConfig.value, pixelation };
};

const clearAllFilters = () => {
  searchQuery.value = '';
  onlyModified.value = false;
  selectedGen.value = 'all';
  selectedView.value = 'all';
  currentPage.value = 1;
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
    } catch { // catch-ok: SessionStorage may be unavailable or disabled in sandboxed dev environment
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
    } catch { // catch-ok: SessionStorage may be unavailable or disabled in sandboxed dev environment
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
    <DevShadowHeaderToolbar
      v-model:columns="columns"
      v-model:sprite-zoom="spriteZoom"
      :shadow-width-percent="shadowWidthPercent"
      :shadow-height-percent="shadowHeightPercent"
      :sprite-zoom-percent="spriteZoomPercent"
      :global-shadow-config="globalShadowConfig"
      :modified-count="modifiedCount"
      :is-saving="isSaving"
      :is-rebuilding="isRebuilding"
      :save-button-state="saveButtonState"
      :is-progress-visible="isProgressVisible"
      :rebuild-message="rebuildMessage"
      :rebuild-progress="rebuildProgress"
      @return="handleReturn"
      @update:width-ratio="handleUpdateWidthRatio"
      @update:height-ratio="handleUpdateHeightRatio"
      @update:pixelation="handleUpdatePixelation"
      @reset-width="resetGlobalWidthRatio"
      @reset-height="resetGlobalHeightRatio"
      @reset-pixelation="resetGlobalPixelation"
      @reset-zoom="spriteZoom = DEFAULT_SPRITE_ZOOM"
      @rebuild="rebuildDatabase"
      @download="downloadJson"
      @save="saveChanges"
    />

    <DevShadowFilterBar
      v-model:selected-category="selectedCategory"
      v-model:selected-gen="selectedGen"
      v-model:selected-gender="selectedGender"
      v-model:is-shiny="isShiny"
      v-model:selected-view="selectedView"
      v-model:only-modified="onlyModified"
      v-model:search-query="searchQuery"
      @filter-change="currentPage = 1"
    />

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
          @click="clearAllFilters"
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
        {{ paginationRangeText }}
      </div>

      <div class="pagination-controls">
        <button
          type="button"
          class="page-btn"
          :disabled="!canGoPrev"
          @click="handlePageChange(1)"
        >
          ««
        </button>
        <button
          type="button"
          class="page-btn"
          :disabled="!canGoPrev"
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
          :disabled="!canGoNext"
          @click="handlePageChange(currentPage + 1)"
        >
          Siguiente ›
        </button>
        <button
          type="button"
          class="page-btn"
          :disabled="!canGoNext"
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
