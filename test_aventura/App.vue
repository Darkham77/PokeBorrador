<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue';

const AdventureGraphStudioView = defineAsyncComponent(
  () => import('./views/AdventureGraphStudioView.vue')
);
const AssetAtlasInspectorView = defineAsyncComponent(
  () => import('./views/AssetAtlasInspectorView.vue')
);
const AutotileStudioView = defineAsyncComponent(() => import('./views/AutotileStudioView.vue'));
const KantoAdventureView = defineAsyncComponent(() => import('./views/KantoAdventureView.vue'));
const LocalTileStudioView = defineAsyncComponent(() => import('./views/LocalTileStudioView.vue'));
const MapStudioView = defineAsyncComponent(() => import('./views/MapStudioView.vue'));
const RegionalContinentStudioView = defineAsyncComponent(
  () => import('./views/RegionalContinentStudioView.vue')
);

type ActiveTool =
  | 'kanto'
  | 'continent'
  | 'map-studio'
  | 'graph-studio'
  | 'cell-studio'
  | 'autotile'
  | 'atlas';

const VALID_TOOLS = new Set<ActiveTool>([
  'kanto',
  'continent',
  'map-studio',
  'graph-studio',
  'cell-studio',
  'autotile',
  'atlas'
]);

function getInitialTool(): ActiveTool {
  if (typeof globalThis.location === 'undefined') return 'kanto';
  const param =
    new URLSearchParams(globalThis.location.search).get('tool') ||
    globalThis.location.hash.replace('#', '');
  return VALID_TOOLS.has(param as ActiveTool) ? (param as ActiveTool) : 'kanto';
}

const currentTool = ref<ActiveTool>(getInitialTool());

const tabs = [
  { id: 'kanto', label: '🗺️ Croquis Kanto' },
  { id: 'continent', label: '🌍 Continent Studio' },
  { id: 'map-studio', label: '📐 Continental Studio' },
  { id: 'graph-studio', label: '🕸️ Graph Studio' },
  { id: 'cell-studio', label: '🧱 Tile Editor' },
  { id: 'autotile', label: '🧩 Autotile Studio' },
  { id: 'atlas', label: '🖼️ Atlas Inspector' }
] as const;
</script>

<template>
  <div
    class="adventure-suite-container font-sans text-white h-screen w-screen overflow-hidden flex flex-col bg-slate-950"
  >
    <!-- Barra Superior de Navegación del Sandbox -->
    <header class="suite-header">
      <div class="suite-title">
        <span class="icon">🎮</span>
        <span class="title-full">POKÉ VICIO: ADVENTURE &amp; STUDIO SUITE</span>
        <span class="title-mobile">POKÉ VICIO</span>
      </div>
      <nav class="suite-tabs">
        <button
          v-for="tab in tabs"
          :id="`tab-${tab.id}`"
          :key="tab.id"
          :class="[currentTool === tab.id ? 'is-active' : 'is-inactive']"
          class="tab-btn"
          @click="currentTool = tab.id as ActiveTool"
        >
          {{ tab.label }}
        </button>
      </nav>
    </header>

    <!-- Área de Visualización -->
    <main class="suite-main">
      <KeepAlive>
        <KantoAdventureView v-if="currentTool === 'kanto'" />
        <RegionalContinentStudioView v-else-if="currentTool === 'continent'" />
        <MapStudioView v-else-if="currentTool === 'map-studio'" />
        <AdventureGraphStudioView v-else-if="currentTool === 'graph-studio'" />
        <LocalTileStudioView v-else-if="currentTool === 'cell-studio'" />
        <AutotileStudioView v-else-if="currentTool === 'autotile'" />
        <AssetAtlasInspectorView v-else-if="currentTool === 'atlas'" />
      </KeepAlive>
    </main>
  </div>
</template>

<style scoped lang="scss">
@use '@/styles/core/tools' as *;

.adventure-suite-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  user-select: none;
}

.suite-main {
  position: relative;
  min-height: 0;
  background: var(--slate-950);
  flex: 1;
  overflow: hidden;
}

.suite-header {
  z-index: calc(var(--z-modal) + 10);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: $spacing-sm;
  height: var(--header-height, 48px);
  padding: 0 12px;
  background: var(--slate-900);
  border-bottom: 1px solid var(--slate-800);
  flex-shrink: 0;
}

.suite-title {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  color: var(--yellow-400);
  font-size: var(--font-11);
  font-weight: $font-weight-black;
  letter-spacing: 0.05em;
  white-space: nowrap;
  flex-shrink: 0;

  .icon {
    font-size: var(--font-14);
  }

  .title-mobile {
    display: none;
  }

  @media (width <= 768px) {
    .title-full {
      display: none;
    }

    .title-mobile {
      display: inline;
    }
  }
}

.suite-tabs {
  display: flex;
  align-items: center;
  gap: $spacing-xs;
  max-width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  .tab-btn {
    padding: 6px 10px;
    border: 1px solid transparent;
    border-radius: $radius-md;
    font-size: var(--font-11);
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;

    &.is-active {
      background: var(--blue-600);
      color: var(--white);
      font-weight: $font-weight-bold;
      box-shadow: var(--shadow-sm);
    }

    &.is-inactive {
      background: Rgb(255 255 255 / 4%);
      color: var(--slate-400);

      &:hover {
        background: var(--slate-800);
        color: var(--white);
      }
    }
  }
}
</style>
