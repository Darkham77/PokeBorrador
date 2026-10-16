<script setup lang="ts">
/**
 * test_aventura/views/LocalTileStudioView.vue
 *
 * LOCAL CELL & TILE STUDIO VIEW
 * Orchestrates:
 *   - Left: StudioLayersPanel (Layer visibility, selection, grid overlays)
 *   - Center: StudioCanvasViewport (2D Hardware-accelerated canvas editor)
 *   - Right: StudioInspector (Tile metadata, collision inspector, entity editor)
 *   - Modals: StudioAssetImportModal
 */

import { ref } from 'vue';
import { gsapHover as vGsapHover } from '@/directives/gsapHover.ts';
import StudioLayersPanel from '../components/studio/StudioLayersPanel.vue';
import StudioCanvasViewport from '../components/studio/StudioCanvasViewport.vue';
import StudioInspector from '../components/studio/StudioInspector.vue';
import StudioAssetImportModal from '../components/studio/StudioAssetImportModal.vue';

const showImportModal = ref(false);
</script>

<template>
  <div class="local-tile-studio-view">
    <aside class="layers-sidebar">
      <StudioLayersPanel />
      <div class="import-action-bar">
        <button
          id="btn-import-tileset"
          v-gsap-hover="'button'"
          type="button"
          class="import-asset-btn"
          @click="showImportModal = true"
        >
          <span class="icon">📥</span> Importar Tileset
        </button>
      </div>
    </aside>

    <main class="canvas-workspace-area">
      <StudioCanvasViewport />
    </main>

    <aside class="inspector-sidebar">
      <StudioInspector />
    </aside>

    <StudioAssetImportModal v-if="showImportModal" @close="showImportModal = false" />
  </div>
</template>

<style scoped lang="scss">
.local-tile-studio-view {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  background: var(--color-background-dark, var(--slate-900));
  overflow: hidden;
}

.layers-sidebar {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 280px;
  height: 100%;
  background: Rgb(15 23 42 / 95%);
  border-right: 1px solid Rgb(255 255 255 / 10%);
  overflow-y: auto;
  flex-shrink: 0;
}

.import-action-bar {
  padding: 12px;
  border-top: 1px solid Rgb(255 255 255 / 10%);

  .import-asset-btn {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: $spacing-sm;
    width: 100%;
    padding: 8px 14px;
    border: 1px solid Rgb(56 189 248 / 40%);
    border-radius: $radius-md;
    background: Rgb(14 165 233 / 20%);
    color: var(--sky);
    font-size: var(--font-12);
    font-weight: 600;
    cursor: pointer;

    &:hover {
      background: Rgb(14 165 233 / 35%);
      border-color: var(--sky);
    }
  }
}

.canvas-workspace-area {
  position: relative;
  height: 100%;
  flex: 1;
  overflow: hidden;
}

.inspector-sidebar {
  position: relative;
  width: 320px;
  height: 100%;
  background: Rgb(15 23 42 / 95%);
  border-left: 1px solid Rgb(255 255 255 / 10%);
  overflow-y: auto;
  flex-shrink: 0;
}
</style>
