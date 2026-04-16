<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useInventoryStore } from '@/stores/inventoryStore'
import { useBoxFilters } from '@/composables/useBoxFilters'

// Sub-componentes
import BoxHeader from './box/BoxHeader.vue'
import BoxTabs from './box/BoxTabs.vue'
import BoxFilters from './box/BoxFilters.vue'
import BoxGrid from './box/BoxGrid.vue'

const gameStore = useGameStore()
const invStore = useInventoryStore()
const gs = computed(() => gameStore.state)

// ----- ESTADO Y FILTROS -----
const { 
  filters, 
  isFiltersOpen, 
  sortMode, 
  hasActiveFilters, 
  processedBoxList, 
  resetFilters 
} = useBoxFilters(computed(() => gs.value.box))

// Store-bound state
const currentBoxIndex = computed(() => invStore.currentBoxIndex)
const isRocketMode = computed(() => invStore.boxRocketMode)
const rocketSelection = computed(() => invStore.boxRocketSelected)

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
  invStore.switchBox(i)
}

const toggleRocketMode = () => {
  invStore.toggleBoxRocketMode()
}

const getBoxBuyCost = () => invStore.getBoxBuyCost()

const buyNewBox = () => {
  const cost = getBoxBuyCost()
  if (gs.value.boxCount >= 10) return
  if (window.confirm(`¿Querés gastar ₱${cost.toLocaleString()} para comprar la Caja ${(gs.value.boxCount || 4) + 1}?`)) {
    const res = invStore.buyNewBox()
    if (res.success) {
      if (window.notify) window.notify(`¡Compraste la Caja ${res.boxNum}!`, '💰')
    } else {
      if (window.notify) window.notify(res.msg, '❌')
    }
  }
}

const handleConfirmRocketSell = () => {
  const value = invStore.getRocketSellValue()
  const count = invStore.boxRocketSelected.length
  if (count === 0) return
  if (window.confirm(`¿Vender ${count} Pokémon por ₽${value.toLocaleString()} al Team Rocket?`)) {
    const res = invStore.doBoxRocketSell()
    if (window.notify) window.notify(`¡${res.count} Pokémon vendidos por ₽${res.value.toLocaleString()}! 🚀`, '🚀')
  }
}

const handlePokemonClick = (index) => {
  if (isRocketMode.value) {
    invStore.toggleBoxRocketSelect(index)
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
