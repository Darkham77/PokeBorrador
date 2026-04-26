<script setup>
import { onMounted, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBoxStore } from '@/stores/box'
import { useBattleStore } from '@/stores/battle'
import { useUIStore } from '@/stores/ui'
import { useBoxFilters } from '@/composables/useBoxFilters'
import BoxHeader from '@/components/box/BoxHeader.vue'
import BoxTabs from '@/components/box/BoxTabs.vue'
import BoxFilters from '@/components/box/BoxFilters.vue'
import BoxGrid from '@/components/box/BoxGrid.vue'

const gameStore = useGameStore()
const boxStore = useBoxStore()
const uiStore = useUIStore()
const battleStore = useBattleStore()
const { filters, sortMode, hasActiveFilters, displayList, resetFilters } = useBoxFilters(
  computed(() => boxStore.box),
  computed(() => boxStore.currentBoxIndex)
)

const isPerformanceMode = computed(() => {
  return uiStore.isAnyBlockingModalOpen || battleStore.isBattleActive || uiStore.isDebugPerformanceMode
})

onMounted(() => {
  // Inicialización si es necesario
})

// Acciones
const onPokemonClick = (index) => {
  if (boxStore.releaseMode || boxStore.rocketMode) {
    boxStore.toggleSelection(index)
  } else {
    // Abrir menú de pokemon (será implementado en la siguiente fase)
    console.log('Pokemon click:', index)
  }
}
</script>

<template>
  <div :class="['pc-box-view', { 'performance-mode': isPerformanceMode }]">
    <div class="pc-container">
      <template v-if="!isPerformanceMode">
        <BoxHeader 
          :count="boxStore.box.length" 
          :max="boxStore.boxCapacity" 
        />

        <BoxTabs
          :current-index="boxStore.currentBoxIndex"
          :count="boxStore.boxCount"
          @switch="boxStore.switchBox"
          @buy="boxStore.buyNewBox"
        />

        <BoxFilters
          v-model:filters="filters"
          v-model:sort-mode="sortMode"
          :has-active="hasActiveFilters"
          :results-count="displayList.length"
          @reset="resetFilters"
        />
      </template>

      <!-- Acciones de modo (Liberar/Rocket) -->
      <div
        v-if="(boxStore.releaseMode || boxStore.rocketMode) && !isPerformanceMode"
        class="mode-actions"
      >
        ... (rest of the code)
        <div class="mode-info">
          <span
            v-if="boxStore.releaseMode"
            class="text-red"
          >
            MODO LIBERACIÓN: {{ boxStore.releaseSelected.size }} seleccionados
          </span>
          <span
            v-else
            class="text-yellow"
          >
            MODO ROCKET: {{ boxStore.rocketSelected.size }} seleccionados
          </span>
        </div>
        <div class="mode-buttons">
          <button 
            v-if="boxStore.releaseMode" 
            class="btn btn-red" 
            :disabled="boxStore.releaseSelected.size === 0"
            @click.stop="boxStore.performMassRelease"
          >
            Confirmar Liberación
          </button>
          <button 
            v-else 
            class="btn btn-yellow" 
            :disabled="boxStore.rocketSelected.size === 0"
            @click.stop="boxStore.performRocketSell"
          >
            Vender a Mercado Negro
          </button>
          <button
            class="btn btn-gray"
            @click.stop="boxStore.releaseMode ? boxStore.toggleReleaseMode() : boxStore.toggleRocketMode()"
          >
            Cancelar
          </button>
        </div>
      </div>

      <div class="grid-wrapper">
        <BoxGrid
          :display-list="displayList"
          :is-box-empty="boxStore.box.length === 0"
          :is-rocket-mode="boxStore.rocketMode || boxStore.releaseMode"
          :rocket-selection="[... (boxStore.releaseMode ? boxStore.releaseSelected : boxStore.rocketSelected)]"
          :is-performance-mode="isPerformanceMode"
          @pokemon-click="onPokemonClick"
        />
      </div>

      <!-- Footer Buttons -->
      <div
        v-if="!boxStore.releaseMode && !boxStore.rocketMode && !isPerformanceMode"
        class="pc-footer"
      >
        <button
          class="footer-btn btn-release"
          @click.stop="boxStore.toggleReleaseMode"
        >
          🌿 Liberar Pokémon
        </button>
        <button 
          v-if="gameStore.state.playerClass === 'rocket'"
          class="footer-btn btn-rocket" 
          @click.stop="boxStore.toggleRocketMode"
        >
          🚀 Modo Rocket
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;

.pc-box-view {
  padding: 0;
  background: radial-gradient(circle at top right, Rgba(147, 51, 234, 0.05), transparent),
              radial-gradient(circle at bottom left, Rgba(59, 130, 246, 0.05), transparent);
  display: flex;
  justify-content: center;
}

.pc-container {
  width: 100%;
  max-width: 900px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.grid-wrapper {
  padding-right: 8px;
  @include gpu-layer;
}

.mode-actions {
  background: Rgba(0, 0, 0, 0.3);
  border: 1px solid Rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  @include gpu-layer;
}

.mode-info {
  @include pixelated;
  font-size: 10px;
}

.mode-buttons {
  display: flex;
  gap: 12px;
}

.pc-footer {
  display: flex;
  gap: 16px;
  justify-content: center;
  margin-top: auto;
  padding-top: 16px;
}

.footer-btn {
  padding: 12px 24px;
  border-radius: 12px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  background: Rgba(255, 255, 255, 0.05);
  color: var(--white);
  @include pixelated;
  font-size: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.footer-btn:hover {
  background: Rgba(255, 255, 255, 0.1);
  transform: TranslateY(-2px);
}

.btn-release:hover { color: var(--red); border-color: Rgba(239, 68, 68, 0.3); }
.btn-rocket:hover { color: var(--yellow); border-color: Rgba(255, 184, 0, 0.3); box-shadow: 0 0 0 1px Rgba(255, 184, 0, 0.3); }

.text-red { color: var(--red); }
.text-yellow { color: var(--yellow); }

.btn {
  padding: 10px 16px;
  border-radius: 10px;
  border: none;
  @include pixelated;
  font-size: 8px;
  cursor: pointer;
}

.btn-red { background: var(--red); color: var(--white); }
.btn-yellow { background: var(--yellow); color: var(--black); }
.btn-gray { background: Rgba(255, 255, 255, 0.1); color: var(--white); }

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
