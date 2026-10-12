<script setup lang="ts">
/**
 * test_aventura/views/AdventureGraphStudioView.vue
 *
 * ADVENTURE GRAPH & MULTI-REGION WORLD STUDIO VIEW
 * Orchestrates:
 *   - Center: StudioAdventureGraphViewport (2D Pan/Zoom canvas with autotiling & stamping)
 *   - Right: StudioAdventureGraphInspector (Inspector controls for nodes, biomes and structures)
 */

import StudioAdventureGraphViewport from '../components/studio/StudioAdventureGraphViewport.vue';
import StudioAdventureGraphInspector from '../components/studio/StudioAdventureGraphInspector.vue';
import StudioTileCatalogDrawer from '../components/studio/StudioTileCatalogDrawer.vue';
import StudioConfirmModal from '../components/studio/StudioConfirmModal.vue';
</script>

<template>
  <div class="adventure-graph-studio-view">
    <main class="graph-workspace-area">
      <StudioAdventureGraphViewport />
      <StudioTileCatalogDrawer />
    </main>
    <aside class="graph-inspector-sidebar">
      <StudioAdventureGraphInspector />
    </aside>
    <StudioConfirmModal />
  </div>
</template>

<style scoped lang="scss">
.adventure-graph-studio-view {
  position: relative;
  display: flex;
  width: 100%;
  height: 100%;
  background: var(--color-background-dark, var(--slate-900));
  overflow: hidden;
}

.graph-workspace-area {
  position: relative;
  height: 100%;
  flex: 1;
  overflow: hidden;
}

.graph-inspector-sidebar {
  position: relative;
  width: 360px;
  height: 100%;
  background: Rgb(15 23 42 / 95%);
  border-left: 1px solid Rgb(255 255 255 / 10%);
  overflow-y: auto;
  flex-shrink: 0;
}
</style>
