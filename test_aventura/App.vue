<script setup lang="ts">
import { ref } from 'vue'
import KantoAdventureView from './views/KantoAdventureView.vue'
import RegionalContinentStudioView from './views/RegionalContinentStudioView.vue'
import MapStudioView from './views/MapStudioView.vue'
import AutotileStudioView from './views/AutotileStudioView.vue'
import AssetAtlasInspectorView from './views/AssetAtlasInspectorView.vue'

type ActiveTool = 'kanto' | 'continent' | 'map-studio' | 'autotile' | 'atlas'
const currentTool = ref<ActiveTool>('kanto')

const tabs = [
  { id: 'kanto', label: '🗺️ Croquis Kanto' },
  { id: 'continent', label: '🌍 Continent Studio' },
  { id: 'map-studio', label: '📐 Map Studio' },
  { id: 'autotile', label: '🧩 Autotile Studio' },
  { id: 'atlas', label: '🖼️ Atlas Inspector' }
] as const
</script>

<template>
  <div class="adventure-suite-container font-sans text-white h-screen w-screen overflow-hidden flex flex-col bg-slate-950">
    <!-- Barra Superior de Navegación del Sandbox -->
    <header class="h-12 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-50">
      <div class="font-black text-xs tracking-wider text-yellow-400 flex items-center gap-2">
        <span class="text-base">🎮</span> POKÉ VICIO: ADVENTURE &amp; STUDIO SUITE
      </div>
      <div class="flex items-center gap-1.5">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="[
            currentTool === tab.id
              ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          ]"
          class="px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer border border-transparent hover:border-slate-700"
          @click="currentTool = tab.id as ActiveTool"
        >
          {{ tab.label }}
        </button>
      </div>
    </header>

    <!-- Área de Visualización -->
    <main class="flex-1 relative overflow-hidden bg-slate-950">
      <KeepAlive>
        <KantoAdventureView v-if="currentTool === 'kanto'" />
        <RegionalContinentStudioView v-else-if="currentTool === 'continent'" />
        <MapStudioView v-else-if="currentTool === 'map-studio'" />
        <AutotileStudioView v-else-if="currentTool === 'autotile'" />
        <AssetAtlasInspectorView v-else-if="currentTool === 'atlas'" />
      </KeepAlive>
    </main>
  </div>
</template>

<style scoped>
.adventure-suite-container {
  user-select: none;
}
</style>
