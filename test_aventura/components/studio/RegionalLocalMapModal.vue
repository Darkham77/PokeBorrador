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

const localSeed = computed(() => {
  return Math.abs(props.regionalSeed * 31 + props.poi.gridX * 17 + props.poi.gridY);
});
</script>

<template>
  <div
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
  inset: 0;
  background: Rgba(0, 0, 0, 0.82);
  backdrop-filter: Blur(8px);
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.local-editor-modal {
  width: dvw;
  max-width: 1450px;
  height: dvh;
  background: #0f172a;
  border: 1px solid Rgba(56, 189, 248, 0.3);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 60px Rgba(0, 0, 0, 0.7);

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 18px;
    background: Rgba(15, 23, 42, 0.95);
    border-bottom: 1px solid Rgba(255, 255, 255, 0.1);

    .header-title {
      display: flex;
      align-items: center;
      gap: 10px;

      h3 {
        margin: 0;
        font-size: 1rem;
        color: #f8fafc;
        font-weight: 700;
      }

      .dimension-badge {
        font-size: 0.75rem;
        background: Rgba(56, 189, 248, 0.15);
        color: #38bdf8;
        border: 1px solid Rgba(56, 189, 248, 0.3);
        padding: 2px 8px;
        border-radius: 4px;
        font-family: monospace;
      }
    }

    .close-btn {
      background: Rgba(239, 68, 68, 0.15);
      border: 1px solid Rgba(239, 68, 68, 0.3);
      color: #fca5a5;
      padding: 5px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;

      &:hover {
        background: Rgba(239, 68, 68, 0.3);
      }
    }
  }

  .modal-body {
    flex: 1;
    overflow: auto;
    position: relative;
    background: #090d16;
  }
}
</style>
