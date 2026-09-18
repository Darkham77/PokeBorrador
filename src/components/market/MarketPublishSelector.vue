<script setup lang="ts">
// style-inherited: styles imported in parent MarketPublish.vue
import { ref, computed, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { useGTSStore } from '@/stores/gts'
import PokemonSelectionItem from '../modals/PokemonSelectionItem.vue'
import PokemonSelectionFilters from '@/components/modals/PokemonSelectionFilters.vue'
import MarketItemFilters from './MarketItemFilters.vue'
import MarketItemCard from './MarketItemCard.vue'
import { getPokemonTotalPower } from '@/logic/pokemon/pokemonSelectionFilter.ts'
import { GTS_ITEMS_PER_PAGE, type MarketListingType } from '@/logic/economy/market'
import type { SortOrder, ItemSortKey } from '@/types/system/game'
import type { PokemonTagId } from '@/logic/constants/tags'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { InventoryItem } from './useMarketPublishInventory.ts'
import { useMarketPublishPokemon } from './useMarketPublishPokemon.ts'
import { useMarketPublishInventory } from './useMarketPublishInventory.ts'

interface Props {
  activeMode: MarketListingType
  selectedItemUid: string | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'select', item: Pokemon | InventoryItem): void
}>()

const game = useGameStore()
const gtsStore = useGTSStore()

// Pokémon Filters
const searchQuery = ref('')
const sortBy = ref('recent')
const sortOrder = ref('desc')
const activeTags = ref<PokemonTagId[]>([])
const filterCompatibleOnly = ref(false)

// Item Filters
const itemSearchQuery = ref('')
const itemSortKey = ref<ItemSortKey>('name')
const itemSortOrder = ref<SortOrder>('asc')

const { filteredAndSortedPokemon } = useMarketPublishPokemon(
  game,
  searchQuery,
  sortBy,
  sortOrder,
  activeTags
)

const { gtsStatsMap, filteredAndSortedInventory } = useMarketPublishInventory(
  game,
  gtsStore,
  itemSearchQuery,
  itemSortKey,
  itemSortOrder
)

const itemsPerPage = GTS_ITEMS_PER_PAGE

// Pokémon Pagination
const pokemonPage = ref(1)
const totalPokemonPages = computed(() => Math.ceil(filteredAndSortedPokemon.value.length / itemsPerPage))
const paginatedPokemon = computed(() => {
  const start = (pokemonPage.value - 1) * itemsPerPage
  return filteredAndSortedPokemon.value.slice(start, start + itemsPerPage)
})

watch(() => filteredAndSortedPokemon.value.length, () => {
  pokemonPage.value = 1
})

// Item/Inventory Pagination
const itemPage = ref(1)
const totalItemPages = computed(() => Math.ceil(filteredAndSortedInventory.value.length / itemsPerPage))
const paginatedInventory = computed(() => {
  const start = (itemPage.value - 1) * itemsPerPage
  return filteredAndSortedInventory.value.slice(start, start + itemsPerPage)
})

watch(() => filteredAndSortedInventory.value.length, () => {
  itemPage.value = 1
})

// Reset pages when changing tabs
watch(() => props.activeMode, () => {
  pokemonPage.value = 1
  itemPage.value = 1
})

const activeCurrentPage = computed(() => (props.activeMode === 'pokemon' ? pokemonPage.value : itemPage.value))
const activeTotalPages = computed(() => (props.activeMode === 'pokemon' ? totalPokemonPages.value : totalItemPages.value))

function handlePrevPage() {
  if (props.activeMode === 'pokemon') {
    if (pokemonPage.value > 1) pokemonPage.value--
  } else {
    if (itemPage.value > 1) itemPage.value--
  }
}

function handleNextPage() {
  if (props.activeMode === 'pokemon') {
    if (pokemonPage.value < totalPokemonPages.value) pokemonPage.value++
  } else {
    if (itemPage.value < totalItemPages.value) itemPage.value++
  }
}
</script>

<template>
  <div class="selection-container">
    <!-- Pokémon Filters -->
    <PokemonSelectionFilters
      v-if="activeMode === 'pokemon'"
      v-model:search-query="searchQuery"
      v-model:sort-by="sortBy"
      v-model:sort-order="sortOrder"
      v-model:active-tags="activeTags"
      v-model:filter-compatible-only="filterCompatibleOnly"
      compact
    />

    <!-- Item Filters -->
    <MarketItemFilters
      v-else
      v-model:item-search-query="itemSearchQuery"
      v-model:item-sort-key="itemSortKey"
      v-model:item-sort-order="itemSortOrder"
    />

    <div class="selection-list ps-vertical-list custom-scrollbar">
      <template v-if="activeMode === 'pokemon'">
        <PokemonSelectionItem 
          v-for="item in paginatedPokemon"
          :key="item.pokemon.uid"
          :item="item"
          :is-selected="selectedItemUid === item.pokemon.uid"
          :total="getPokemonTotalPower(item.pokemon)"
          auto-confirm
          @select="emit('select', item.pokemon)"
        />
        <div
          v-if="filteredAndSortedPokemon.length === 0"
          class="empty-list"
        >
          No tienes Pokémon que coincidan con la búsqueda.
        </div>
      </template>

      <template v-else>
        <MarketItemCard
          v-for="i in paginatedInventory"
          :key="i.id"
          :item="i"
          :is-selected="selectedItemUid === i.id"
          :gts-stats="gtsStatsMap[i.id]"
          @select="emit('select', i)"
        />
        <div
          v-if="filteredAndSortedInventory.length === 0"
          class="empty-list"
        >
          No tienes objetos que coincidan con la búsqueda.
        </div>
      </template>
    </div>

    <!-- Pagination controls -->
    <div
      v-if="activeTotalPages > 1"
      class="gts-pagination"
    >
      <button 
        class="btn-vicio-secondary btn-vicio-xs prev-page-btn" 
        :disabled="activeCurrentPage === 1" 
        @click="handlePrevPage"
      >
        ANTERIOR
      </button>
      <span class="page-info">PÁGINA {{ activeCurrentPage }} DE {{ activeTotalPages }}</span>
      <button 
        class="btn-vicio-secondary btn-vicio-xs next-page-btn" 
        :disabled="activeCurrentPage === activeTotalPages" 
        @click="handleNextPage"
      >
        SIGUIENTE
      </button>
    </div>
  </div>
</template>
