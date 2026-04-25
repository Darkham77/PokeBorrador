<script setup>
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBoxStore } from '@/stores/box'
import { useUIStore } from '@/stores/ui'
import { useBoxFilters } from '@/composables/useBoxFilters'

// Sub-componentes
import BoxHeader from './box/BoxHeader.vue'
import BoxTabs from './box/BoxTabs.vue'
import BoxFilters from './box/BoxFilters.vue'
import BoxGrid from './box/BoxGrid.vue'
import BoxPokemonMenu from './box/BoxPokemonMenu.vue'

const gameStore = useGameStore()
const boxStore = useBoxStore()
const uiStore = useUIStore()
const gs = computed(() => gameStore.state)

// Store-bound state
const currentBoxIndex = computed(() => boxStore.currentBoxIndex)
const isRocketMode = computed(() => boxStore.boxRocketMode)
const rocketSelection = computed(() => boxStore.boxRocketSelected)
const isBoxMenuOpen = computed(() => uiStore.isBoxMenuOpen)
const selectedBoxIndex = computed(() => uiStore.selectedBoxIndex)

// ----- ESTADO Y FILTROS -----
const { 
  filters, 
  isFiltersOpen, 
  sortMode, 
  sortDirection,
  hasActiveFilters, 
  processedBoxList, 
  resetFilters 
} = useBoxFilters(computed(() => gs.value.box), currentBoxIndex)

const maxCapacity = computed(() => (gs.value.boxCount || 4) * 50)

const displayList = computed(() => {
  const list = processedBoxList.value || []
  
  if (hasActiveFilters.value) {
    return list // Show all matches when searching/filtering
  } else {
    const start = currentBoxIndex.value * 50
    return list.slice(start, start + 50)
  }
})

// ----- ACCIONES -----
const switchBox = (i) => {
  boxStore.switchBox(i)
}

const toggleRocketMode = () => {
  boxStore.toggleBoxRocketMode()
}

const getBoxBuyCost = () => boxStore.getBoxBuyCost()

const buyNewBox = () => {
  const cost = getBoxBuyCost()
  if (gs.value.boxCount >= 10) return
  
  uiStore.openConfirm({
    title: 'COMPRAR CAJA',
    message: `¿Querés gastar ₱${cost.toLocaleString()} para comprar la Caja ${(gs.value.boxCount || 4) + 1}?`,
    onConfirm: () => {
      const res = boxStore.buyNewBox()
      if (res.success) {
        uiStore.notify(`¡Compraste la Caja ${res.boxNum}!`, '💰')
      } else {
        uiStore.notify(res.msg, '❌')
      }
    }
  })
}

const handleConfirmRocketSell = () => {
  const value = boxStore.getRocketSellValue()
  const count = boxStore.boxRocketSelected.length
  if (count === 0) return
  
  uiStore.openConfirm({
    title: 'VENDER AL TEAM ROCKET',
    message: `¿Vender ${count} Pokémon por ₽${value.toLocaleString()} al Team Rocket?`,
    onConfirm: () => {
      const res = boxStore.doBoxRocketSell()
      uiStore.notify(`¡${res.count} Pokémon vendidos por ₽${res.value.toLocaleString()}! 🚀`, '🚀')
    }
  })
}

const handlePokemonClick = (index) => {
  if (isRocketMode.value) {
    boxStore.toggleBoxRocketSelect(index)
  } else {
    uiStore.selectedBoxIndex = index
    uiStore.isBoxMenuOpen = true
  }
}
</script>

<template>
  <div class="box-view">
    <BoxHeader
      :player-class="gs.playerClass"
      :is-rocket-mode="isRocketMode"
      :count="gs.box?.length || 0"
      :max="maxCapacity"
      :hint="isRocketMode 
        ? 'Venta en Mercado Negro activa.' 
        : 'Intercambio con equipo disponible.'"
      @toggle-rocket="toggleRocketMode"
      @confirm-rocket="handleConfirmRocketSell"
      @cancel-rocket="toggleRocketMode"
    />

    <BoxTabs
      :box-count="gs.boxCount"
      :current-index="currentBoxIndex"
      :buy-cost="getBoxBuyCost()"
      @switch="switchBox"
      @buy="buyNewBox"
    />

    <BoxFilters
      v-model:filters="filters"
      v-model:is-filters-open="isFiltersOpen"
      v-model:sort-mode="sortMode"
      v-model:sort-direction="sortDirection"
      :has-active-filters="hasActiveFilters"
      :results-count="(processedBoxList || []).length"
      @reset="resetFilters"
    />

    <BoxGrid
      :display-list="displayList"
      :rocket-selection="rocketSelection"
      :is-rocket-mode="isRocketMode"
      :is-box-empty="!gs.box || gs.box.length === 0"
      :has-active-filters="hasActiveFilters"
      @pokemon-click="handlePokemonClick"
    />

    <BoxPokemonMenu
      v-if="isBoxMenuOpen"
      :show="isBoxMenuOpen"
      :box-index="selectedBoxIndex"
      @close="uiStore.isBoxMenuOpen = false"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/views/box";
</style>

