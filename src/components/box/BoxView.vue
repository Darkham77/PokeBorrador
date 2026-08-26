<script setup lang="ts">

import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import { useBoxStore } from '@/stores/box'
import { useUIStore } from '@/stores/ui'
import { usePlayerClassStore } from '@/stores/player/playerClass'
import { useBoxFilters } from '@/composables/pokemon/useBoxFilters'
import type { Pokemon } from '@/types/pokemon/pokemon'

// Sub-componentes
import BoxHeader from './BoxHeader.vue'
import BoxTabs from './BoxTabs.vue'
import BoxFilters from './BoxFilters.vue'
import BoxGrid from './BoxGrid.vue'

const gameStore = useGameStore()
const boxStore = useBoxStore()
const uiStore = useUIStore()
const classStore = usePlayerClassStore()
const gs = computed(() => gameStore.state)

// Clase Rocket: fuente canónica reactiva
const isRocket = computed(() => classStore.playerClass === 'rocket')

// Store-bound state
const currentBoxIndex = computed(() => boxStore.currentBoxIndex)
const isRocketMode = computed(() => boxStore.boxRocketMode)
const rocketSelection = computed(() => boxStore.boxRocketSelected)

// ----- ESTADO Y FILTROS -----
const { 
  filters, 
  isFiltersOpen, 
  sortMode, 
  sortDirection,
  hasActiveFilters, 
  processedBoxList, 
  resetFilters 
} = useBoxFilters(computed(() => gs.value.box))

const maxCapacity = computed(() => (gs.value.boxCount || 4) * 50)

const displayList = computed(() => {
  const list = processedBoxList.value || []
  const isSorted = sortMode.value !== 'none'
  
  if (hasActiveFilters.value || isSorted) {
    // Already filtered or sorted list (no nulls if filtered, but let's be safe)
    return list.filter((item): item is { p: Pokemon, index: number } => item.p != null)
  } else {
    const start = currentBoxIndex.value * 50
    const slice = list.slice(start, start + 50)
    return slice.filter((item): item is { p: Pokemon, index: number } => item.p != null)
  }
})

// ----- ACCIONES -----
const switchBox = (i: number) => {
  sortMode.value = 'none'
  boxStore.switchBox(i)
}

const toggleRocketMode = () => {
  boxStore.toggleBoxRocketMode()
}

const toggleReleaseMode = () => {
  boxStore.toggleBoxReleaseMode()
}

const getBoxBuyCost = () => boxStore.getBoxBuyCost()

const MAX_PURCHASABLE_BOXES_LIMIT = 10

const buyNewBox = () => {
  const cost = getBoxBuyCost()
  if (gs.value.boxCount >= MAX_PURCHASABLE_BOXES_LIMIT) return
  
  uiStore.openConfirm({
    title: 'COMPRAR CAJA',
    message: `¿Querés gastar ₱${cost.toLocaleString()} para comprar la Caja ${(gs.value.boxCount || 4) + 1}?`,
    onConfirm: () => {
      const res = boxStore.buyNewBox()
      if (res.success) {
        uiStore.notify(`¡Compraste la Caja ${res.boxNum}!`, '💰')
      } else {
        uiStore.notify(res.msg || 'No se pudo comprar la caja.', '❌')
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

const handleConfirmRelease = () => {
  const count = boxStore.boxReleaseSelected.length
  if (count === 0) return
  
  uiStore.openConfirm({
    title: 'LIBERAR POKÉMON',
    message: `¿Estás seguro de que querés liberar ${count} Pokémon? Esta acción es permanente.`,
    onConfirm: () => {
      const names = boxStore.doBoxRelease()
      uiStore.notify(`¡${names.length} Pokémon liberados! 🌿`, '🌿')
    }
  })
}

const handlePokemonClick = (index: number) => {
  const pokemon = gs.value.box[index]
  if (!pokemon) return

  if (isRocketMode.value || boxStore.boxReleaseMode) {
    if (pokemon.onMission || pokemon.inDaycare || pokemon.onDefense) {
      uiStore.notify('Este Pokémon está ocupado y no puede seleccionarse.', '🔒')
      return
    }

    if (isRocketMode.value) {
      boxStore.toggleBoxRocketSelect(index)
    } else {
      boxStore.toggleBoxReleaseSelect(index)
    }
  } else {
    uiStore.open('BoxPokemonMenu', { boxIndex: index })
  }
}
</script>

<template>
  <div class="box-view">
    <BoxHeader
      :count="gs.box?.length || 0"
      :max="maxCapacity"
      :hint="isRocketMode 
        ? 'Venta en Mercado Negro activa.' 
        : 'Intercambio con equipo disponible.'"
    />

    <BoxTabs
      :box-count="gs.boxCount"
      :current-index="currentBoxIndex"
      :buy-cost="getBoxBuyCost()"
      @switch="switchBox"
      @buy="buyNewBox"
    >
      <template #extra>
        <div
          v-if="!isRocketMode && !boxStore.boxReleaseMode"
          class="mode-trigger-bar-inline"
        >
          <PVTooltip
            v-if="isRocket"
            title="MODO MERCADO NEGRO"
            description="Seleccioná Pokémon para vender por pesos al Team Rocket."
            position="top"
          >
            <button
              id="box-view-rocket-trigger-btn"
              class="rocket-trigger-btn"
              @click.stop="toggleRocketMode"
            >
              💀 MERCADO NEGRO
            </button>
          </PVTooltip>

          <PVTooltip
            title="MODO LIBERACIÓN"
            description="Seleccioná Pokémon para soltarlos permanentemente al bosque."
            position="top"
          >
            <button
              id="box-view-release-trigger-btn"
              class="release-trigger-btn"
              @click.stop="toggleReleaseMode"
            >
              ⚡ LIBERAR POKÉMON
            </button>
          </PVTooltip>
        </div>
      </template>
    </BoxTabs>
    
    <BoxFilters
      v-model:filters="filters"
      v-model:is-filters-open="isFiltersOpen"
      v-model:sort-mode="sortMode"
      v-model:sort-direction="sortDirection"
      :has-active-filters="hasActiveFilters"
      :results-count="(processedBoxList || []).length"
      @reset="resetFilters"
    />

    <!-- Barra de Acciones de Modo (Venta/Liberación) -->
    <div
      v-if="isRocketMode || boxStore.boxReleaseMode"
      class="mode-actions-bar glass-morphism"
    >
      <div class="selection-info">
        <span class="count">{{ isRocketMode ? boxStore.boxRocketSelected.length : boxStore.boxReleaseSelected.length }}</span>
        <span class="label">{{ isRocketMode ? 'PARA MERCADO NEGRO' : 'PARA LIBERAR' }}</span>
        
        <div
          v-if="isRocketMode"
          class="earnings"
        >
          <span class="currency">₽</span>
          <span class="value">{{ boxStore.getRocketSellValue().toLocaleString() }}</span>
        </div>
      </div>

      <div class="action-buttons">
        <button
          id="box-view-cancel-mode-btn"
          class="btn-cancel"
          @click.stop="isRocketMode ? toggleRocketMode() : toggleReleaseMode()"
        >
          CANCELAR
        </button>
        <button 
          v-if="isRocketMode"
          id="box-view-confirm-rocket-btn"
          class="btn-confirm-rocket" 
          :disabled="boxStore.boxRocketSelected.length === 0"
          @click.stop="handleConfirmRocketSell"
        >
          💀 VENDER LOTE
        </button>
        <button 
          v-else
          id="box-view-confirm-release-btn"
          class="btn-confirm-release" 
          :disabled="boxStore.boxReleaseSelected.length === 0"
          @click.stop="handleConfirmRelease"
        >
          ⚡ LIBERAR LOTE
        </button>
      </div>
    </div>

    <BoxGrid
      :display-list="displayList"
      :selection="isRocketMode ? rocketSelection : boxStore.boxReleaseSelected"
      :selection-type="isRocketMode ? 'rocket' : (boxStore.boxReleaseMode ? 'release' : null)"
      :is-box-empty="!gs.box || gs.box.length === 0"
      :has-active-filters="hasActiveFilters"
      @pokemon-click="handlePokemonClick"
    />
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/views/box";
@use "@/styles/core/tools" as *;

.mode-trigger-bar-inline {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rocket-trigger-btn {
  @include btn-vicio('danger', 'sm');
}

.release-trigger-btn {
  @include btn-vicio('secondary', 'sm');
}

.mode-actions-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  border-radius: 16px;
  margin: 0 12px 16px 12px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  background: Rgba(15, 23, 42, 0.8);
  box-shadow: 0 8px 32px Rgba(0, 0, 0, 0.4);

  .selection-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .count {
      font-size: 16px;
      color: var(--yellow);
      @include pixelated;
    }

    .label {
      font-size: 8px;
      color: Rgba(255, 255, 255, 0.6);
      @include pixelated;
    }

    .earnings {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-left: 12px;
      padding-left: 12px;
      border-left: 1px solid Rgba(255, 255, 255, 0.1);

      .currency { font-family: sans-serif; color: var(--green); }
      .value { color: var(--white); @include pixelated; font-size: 10px; }
    }
  }

  .action-buttons {
    display: flex;
    gap: 12px;

    .btn-cancel { @include btn-vicio('neutral', 'sm'); }
    .btn-confirm-rocket { @include btn-vicio('danger', 'sm'); }
    .btn-confirm-release { @include btn-vicio('success', 'sm'); }
  }
}

</style>

