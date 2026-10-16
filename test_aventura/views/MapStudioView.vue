<script setup lang="ts">
import { ref } from 'vue';
import StudioToolbar from '../components/studio/StudioToolbar.vue';
import StudioGeographicViewport from '../components/studio/StudioGeographicViewport.vue';
import StudioConnectionsViewport from '../components/studio/StudioConnectionsViewport.vue';
import { useContinentStudioStore } from '../stores/continentStudio';

const store = useContinentStudioStore();
const geoViewportRef = ref<InstanceType<typeof StudioGeographicViewport> | null>(null);

/**
 * Exports high-resolution PNG of the continental geographic canvas.
 */
function handleExportPng(): void {
  const canvas = geoViewportRef.value?.getCanvas();
  if (!canvas) {
    alert('Por favor, selecciona la Vista Geográfica para exportar el mapa en PNG.');
    return;
  }

  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${store.activeProject.name || 'continente'}_${Temporal.Now.instant().epochMilliseconds}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
</script>

<template>
  <div class="continental-studio-container">
    <!-- Top Studio Toolbar with the 7 canonical user actions -->
    <StudioToolbar @export-png="handleExportPng" />

    <!-- Two-View Active Workspace -->
    <main class="studio-workspace">
      <!-- 1. Geographic View (2D Canvas + Autotile) -->
      <StudioGeographicViewport v-if="store.activeView === 'geographic'" ref="geoViewportRef" />

      <!-- 2. Connections View (Interactive SVG Graph) -->
      <StudioConnectionsViewport v-else-if="store.activeView === 'connections'" />
    </main>
  </div>
</template>

<style scoped lang="scss">
.continental-studio-container {
  position: relative;
  z-index: var(--z-modal-step);
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--slate-900);
  color: var(--slate-50);
  font-family: inherit;
  overflow: hidden;
}

.studio-workspace {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  flex: 1;
  overflow: hidden;
}
</style>
