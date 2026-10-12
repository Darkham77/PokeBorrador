<script setup lang="ts">
/**
 * src/components/map/RegionalLocalMapModal.vue
 *
 * REGIONAL LOCAL MICRO-MAP (40x30) DETAIL & EDITING MODAL
 *
 * Provides a dedicated high-resolution local settlement maquette
 * powered by ProceduralMapViewer, scoped to the selected POI.
 */

import { computed } from 'vue';
import type { POINode } from '../../types/map/poiTypes.ts';
import { SCALE_DIMENSIONS } from '../../logic/map/nodeLocalMapGenerator.ts';
import ProceduralMapViewer from './ProceduralMapViewer.vue';

const props = defineProps<{
  poi: POINode;
  regionalSeed: number;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const localDimensions = computed(() => {
  const scale = props.poi.urbanScale ?? 'village';
  return SCALE_DIMENSIONS[scale] ?? { width: 40, height: 30 };
});

const REGIONAL_SEED_PRIME = 31;
const GRID_COORD_PRIME = 17;

const localSeed = computed(() => {
  return Math.abs(props.regionalSeed * REGIONAL_SEED_PRIME + props.poi.gridX * GRID_COORD_PRIME + props.poi.gridY);
});
</script>

<template>
  <div
    id="regional-local-map-modal-div-1"
    class="local-editor-modal-backdrop"
    @click.self="emit('close')"
  >
    <div class="local-editor-modal">
      <header class="modal-header">
        <div class="header-title">
          <span class="modal-icon">🏙️</span>
          <h3>Editor Local: {{ props.poi.name }}</h3>
          <span class="dimension-badge">{{ localDimensions.width }} × {{ localDimensions.height }}</span>
        </div>
        <button
          id="regional-local-map-modal-btn-cerrar"
          type="button"
          class="close-btn"
          title="Cerrar y volver al Continente"
          @click="emit('close')"
        >
          <span class="emoji-inline">✕</span> Cerrar
        </button>
      </header>
      <div class="modal-body">
        <ProceduralMapViewer
          :key="props.poi.id"
          :initial-seed="localSeed"
          :initial-width="localDimensions.width"
          :initial-height="localDimensions.height"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.local-editor-modal-backdrop {
  position: fixed;
  z-index: var(--z-modal);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
  background: Rgb(0 0 0 / 82%);
  inset: 0;
  backdrop-filter: Blur(8px);
}

.local-editor-modal {
  display: flex;
  flex-direction: column;
  width: 95dvw;
  max-width: 1450px;
  height: 90dvh;
  border: 1px solid Rgb(56 189 248 / 30%);
  border-radius: $radius-xl;
  background: var(--slate-900);
  overflow: hidden;
  box-shadow: var(--shadow-2xl);

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 18px;
    background: Rgb(15 23 42 / 95%);
    border-bottom: 1px solid Rgb(255 255 255 / 10%);

    .header-title {
      display: flex;
      align-items: center;
      gap: $spacing-md-alt;

      h3 {
        margin: 0;
        color: var(--slate-50);
        font-size: var(--font-16);
        font-weight: 700;
      }

      .dimension-badge {
        padding: 2px 8px;
        border: 1px solid Rgb(56 189 248 / 30%);
        border-radius: $radius-sm;
        background: Rgb(56 189 248 / 15%);
        color: var(--sky);
        font-family: monospace;
        font-size: var(--font-12);
      }
    }

    .close-btn {
      padding: 5px 12px;
      border: 1px solid Rgb(239 68 68 / 30%);
      border-radius: $radius-md;
      background: Rgb(239 68 68 / 15%);
      color: var(--red-300);
      font-size: var(--font-13);
      font-weight: 600;
      cursor: pointer;

      &:hover {
        background: Rgb(239 68 68 / 30%);
      }
    }
  }

  .modal-body {
    position: relative;
    background: var(--slate-900);
    flex: 1;
    overflow: auto;
  }
}
</style>
