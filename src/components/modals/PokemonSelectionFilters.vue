<script setup lang="ts">
// style-inherited: styles imported in parent PokemonSelectionModal.vue

import { computed } from 'vue'
import { useUIStore } from '@/stores/ui'
import PVTooltip from '@/components/common/PVTooltip.vue'
import PokemonSortBar from '@/components/pokemon/PokemonSortBar.vue'
import PokemonTagBar from '@/components/pokemon/PokemonTagBar.vue'
import type { PokemonFilterTagId } from '@/logic/constants/tags'
import type { Pokemon } from '@/types/pokemon/pokemon'

interface Props {
  isDaycareContext?: boolean
  otherDaycarePokemon?: Pokemon | null
  compact?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isDaycareContext: false,
  otherDaycarePokemon: null,
  compact: false
})

const ui = useUIStore()
const isCompact = computed(() => props.compact || ui.isSmallScreen)

const searchQuery = defineModel<string>('searchQuery', { required: true })
const sortBy = defineModel<string>('sortBy', { required: true })
const sortOrder = defineModel<string>('sortOrder', { required: true })
const activeTags = defineModel<PokemonFilterTagId[]>('activeTags', { required: true })
const filterCompatibleOnly = defineModel<boolean>('filterCompatibleOnly', { required: true })

function clearFilters() {
  searchQuery.value = ''
  sortBy.value = 'recent'
  sortOrder.value = 'desc'
  activeTags.value = []
  filterCompatibleOnly.value = false
}
</script>

<template>
  <div
    class="filters-bar"
    :class="{ 'is-compact': isCompact }"
  >
    <div class="ps-search-row">
      <span class="emoji ps-search-icon">🔍</span>
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="Buscar por nombre o ID..."
        class="ps-search-input"
      >
      <button
        v-if="searchQuery"
        class="ps-clear-search"
        @click.stop="searchQuery = ''"
      >
        ×
      </button>
    </div>
    <PokemonSortBar
      v-model:model-value="sortBy"
      v-model:sort-direction="sortOrder"
      :compact="isCompact"
    />

    <div class="ps-tags-section">
      <div
        class="ps-tags-row-unified"
        :class="{ 'is-compact': isCompact }"
      >
        <PokemonTagBar
          v-model="activeTags"
          v-model:filter-compatible-only="filterCompatibleOnly"
          :compact="isCompact"
          :show-compatible="isDaycareContext"
          :other-daycare-pokemon="otherDaycarePokemon"
        >
          <template #prefix>
            <PVTooltip
              title="LIMPIAR FILTROS"
              description="Resetear búsqueda, orden y etiquetas."
              position="bottom"
              class="tag-tooltip-wrapper"
            >
              <button
                id="ps-clear-filters-btn"
                v-gsap-hover
                type="button"
                class="ps-clear-icon-btn"
                :class="{
                  disabled: !(activeTags.length > 0 || searchQuery || sortBy !== 'recent' || filterCompatibleOnly),
                  'is-compact': isCompact
                }"
                :disabled="!(activeTags.length > 0 || searchQuery || sortBy !== 'recent' || filterCompatibleOnly)"
                @click.stop="clearFilters"
              >
                <span class="emoji">🧹</span>
              </button>
            </PVTooltip>
          </template>
        </PokemonTagBar>
      </div>
    </div>
  </div>
</template>

