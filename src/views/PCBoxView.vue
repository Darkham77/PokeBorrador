<script setup>
import { onMounted, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBoxStore } from '@/stores/box'
import { useBoxFilters } from '@/composables/useBoxFilters'
import BoxHeader from '@/components/box/BoxHeader.vue'
import BoxTabs from '@/components/box/BoxTabs.vue'
import BoxFilters from '@/components/box/BoxFilters.vue'
import BoxGrid from '@/components/box/BoxGrid.vue'

const gameStore = useGameStore()
const boxStore = useBoxStore()
const { filters, sortMode, hasActiveFilters, displayList, resetFilters } = useBoxFilters(
  computed(() => boxStore.box),
  computed(() => boxStore.currentBoxIndex)
)

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
  <div class="pc-box-view">
    <div class="pc-container">
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

      <!-- Acciones de modo (Liberar/Rocket) -->
      <div
        v-if="boxStore.releaseMode || boxStore.rocketMode"
        class="mode-actions"
      >
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
            @click="boxStore.performMassRelease"
          >
            Confirmar Liberación
          </button>
          <button 
            v-else 
            class="btn btn-yellow" 
            :disabled="boxStore.rocketSelected.size === 0"
            @click="boxStore.performRocketSell"
          >
            Vender a Mercado Negro
          </button>
          <button
            class="btn btn-gray"
            @click="boxStore.releaseMode ? boxStore.toggleReleaseMode() : boxStore.toggleRocketMode()"
          >
            Cancelar
          </button>
        </div>
      </div>

      <div class="grid-wrapper scroll-custom">
        <BoxGrid
          :display-list="displayList"
          :is-box-empty="boxStore.box.length === 0"
          :is-rocket-mode="boxStore.rocketMode || boxStore.releaseMode"
          :rocket-selection="[... (boxStore.releaseMode ? boxStore.releaseSelected : boxStore.rocketSelected)]"
          @pokemon-click="onPokemonClick"
        />
      </div>

      <!-- Footer Buttons -->
      <div
        v-if="!boxStore.releaseMode && !boxStore.rocketMode"
        class="pc-footer"
      >
        <button
          class="footer-btn btn-release"
          @click="boxStore.toggleReleaseMode"
        >
          🌿 Liberar Pokémon
        </button>
        <button 
          v-if="gameStore.state.playerClass === 'rocket'"
          class="footer-btn btn-rocket" 
          @click="boxStore.toggleRocketMode"
        >
          🚀 Modo Rocket
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pc-box-view {
  height: 100%;
  padding: 20px;
  background: radial-gradient(circle at top right, rgba(147, 51, 234, 0.05), transparent),
              radial-gradient(circle at bottom left, rgba(59, 130, 246, 0.05), transparent);
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
  flex: 1;
  overflow-y: auto;
  padding-right: 8px;
}

.mode-actions {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  backdrop-filter: blur(10px);
}

.mode-info {
  font-family: 'Press Start 2P', monospace;
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
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.footer-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.btn-release:hover { color: var(--red); border-color: rgba(255, 59, 59, 0.3); }
.btn-rocket:hover { color: var(--yellow); border-color: rgba(255, 184, 0, 0.3); }

.text-red { color: var(--red); }
.text-yellow { color: var(--yellow); }

.btn {
  padding: 10px 16px;
  border-radius: 10px;
  border: none;
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  cursor: pointer;
}

.btn-red { background: var(--red); color: #fff; }
.btn-yellow { background: var(--yellow); color: #000; }
.btn-gray { background: rgba(255, 255, 255, 0.1); color: #fff; }

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Custom Scrollbar */
.scroll-custom::-webkit-scrollbar { width: 6px; }
.scroll-custom::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.02); }
.scroll-custom::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
.scroll-custom::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
</style>
