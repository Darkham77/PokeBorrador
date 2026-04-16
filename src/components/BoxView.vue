<script setup>
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBoxFilters } from '@/composables/useBoxFilters'

// Sub-componentes
import BoxHeader from './box/BoxHeader.vue'
import BoxTabs from './box/BoxTabs.vue'
import BoxFilters from './box/BoxFilters.vue'
import BoxGrid from './box/BoxGrid.vue'

const gameStore = useGameStore()
const gs = computed(() => gameStore.state)

// ----- ESTADO Y FILTROS -----
const currentBoxIndex = ref(0)
const { 
  filters, 
  isFiltersOpen, 
  sortMode, 
  hasActiveFilters, 
  processedBoxList, 
  resetFilters 
} = useBoxFilters(computed(() => gs.value.box))

// Bridge al estado global (Legacy <-> Vue)
const uiState = computed(() => gameStore.state.uiSelection)
const isRocketMode = computed(() => uiState.value?.teamRocketMode || uiState.value?.boxRocketMode || false)
const rocketSelection = computed(() => uiState.value?.boxRocketSelected || [])

const maxCapacity = computed(() => (gs.value.boxCount || 4) * 50)

const displayList = computed(() => {
  if (hasActiveFilters.value || sortMode.value !== 'none') {
    return processedBoxList.value
  } else {
    const start = currentBoxIndex.value * 50
    const end = start + 50
    return processedBoxList.value.filter(item => item.index >= start && item.index < end)
  }
})

// ----- ACCIONES -----
const switchBox = (i) => {
  currentBoxIndex.value = i
  if (uiState.value) {
    uiState.value.boxRocketMode = false
    uiState.value.boxRocketSelected = []
  }
}

const toggleRocketMode = () => {
  if (typeof window.toggleBoxRocketMode === 'function') {
    window.toggleBoxRocketMode()
  }
}

const getBoxBuyCost = () => {
  const count = gs.value.boxCount || 4
  if (count < 4) return 500000
  if (count === 4) return 500000
  if (count === 5) return 1000000
  return 1000000 * Math.pow(2, count - 5)
}

const buyNewBox = () => {
  const cost = getBoxBuyCost()
  if (gs.value.boxCount >= 10) return
  if (window.confirm(`¿Querés gastar ₱${cost.toLocaleString()} para comprar la Caja ${(gs.value.boxCount || 4) + 1}?`)) {
    if (typeof window.buyNewBox === 'function') window.buyNewBox()
  }
}

const handleConfirmRocketSell = () => {
  if (rocketSelection.value.length === 0) return
  if (typeof window.confirmBoxRocketSell === 'function') window.confirmBoxRocketSell()
}

const handlePokemonClick = (index) => {
  if (isRocketMode.value) {
    if (typeof window.toggleBoxRocketSelect === 'function') window.toggleBoxRocketSelect(index)
  } else {
    if (typeof window.openBoxPokemonMenu === 'function') window.openBoxPokemonMenu(index)
  }
}
</script>

<template>
  <div class="team-section">
    <BoxHeader
      :player-class="gs.playerClass"
      :is-rocket-mode="isRocketMode"
      @toggle-rocket="toggleRocketMode"
      @confirm-rocket="handleConfirmRocketSell"
      @cancel-rocket="toggleRocketMode"
    />

    <div class="box-meta">
      {{ gs.box?.length || 0 }}/{{ maxCapacity }} Pokémon
    </div>

    <BoxTabs
      :box-count="gs.boxCount"
      :current-index="currentBoxIndex"
      :buy-cost="getBoxBuyCost()"
      @switch="switchBox"
      @buy="buyNewBox"
    />

    <!-- HINTS -->
    <div
      v-if="isRocketMode"
      class="hint-banner rocket-hint"
    >
      ⚠️ Seleccioná los Pokémon que querés vender al Mercado Negro (₱ + Crimen).
    </div>
    <div
      v-else
      class="hint-banner normal-hint"
    >
      Tocá un Pokémon para intercambiarlo con uno de tu equipo activo.
    </div>

    <BoxFilters
      v-model:filters="filters"
      v-model:is-filters-open="isFiltersOpen"
      v-model:sort-mode="sortMode"
      :has-active-filters="hasActiveFilters"
      :results-count="processedBoxList.length"
      @reset="resetFilters"
    />

    <BoxGrid
      :display-list="displayList"
      :rocket-selection="rocketSelection"
      :is-rocket-mode="isRocketMode"
      :is-box-empty="!gs.box || gs.box.length === 0"
      @pokemon-click="handlePokemonClick"
    />
  </div>
</template>

<style scoped>
.box-meta {
  font-size: 11px;
  color: var(--gray);
  margin-bottom: 8px;
}

.hint-banner {
  font-size: 11px;
  margin-bottom: 12px;
  border-radius: 10px;
  padding: 10px 14px;
}

.rocket-hint {
  color: #ef4444;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.normal-hint {
  font-size: 12px;
  color: var(--gray);
}
</style>
