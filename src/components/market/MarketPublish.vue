<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { useGTSStore } from '@/stores/gts'
import { useUIStore } from '@/stores/ui'
import PokemonSelectionItem from '../modals/PokemonSelectionItem.vue'
import PokemonSelectionFilters from '@/components/modals/PokemonSelectionFilters.vue'
import MarketItemFilters from './MarketItemFilters.vue'
import MarketItemCard from './MarketItemCard.vue'
import BoxPokemonCard from '@/components/box/BoxPokemonCard.vue'
import { getAssetUrl, ASSET_TYPES } from '@/logic/services/assetService'
import { getPokemonTotalPower } from '@/logic/pokemon/pokemonSelectionFilter.ts'

import { GTS_ITEMS_PER_PAGE } from '@/logic/economy/market'
import type { SortOrder, ItemSortKey } from '@/types/system/game'
import type { PokemonTagId } from '@/logic/constants/tags'
import type { Pokemon } from '@/types/pokemon/pokemon'

const game = useGameStore()
const gtsStore = useGTSStore()
const ui = useUIStore()
const isSmallScreen = computed(() => ui.isSmallScreen)

const activeMode = ref<'pokemon' | 'item'>('pokemon')

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

import { useMarketPublishPokemon } from './useMarketPublishPokemon.ts'

const { filteredAndSortedPokemon } = useMarketPublishPokemon(
  game,
  searchQuery,
  sortBy,
  sortOrder,
  activeTags
)

import { useMarketPublishInventory } from './useMarketPublishInventory.ts'

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
watch(activeMode, () => {
  pokemonPage.value = 1
  itemPage.value = 1
})

import { useMarketPublishActions } from './useMarketPublishActions.ts'

const {
  selection,
  price,
  itemQty,
  selectItem,
  handlePublish,
  fee,
  net
} = useMarketPublishActions(gtsStore, activeMode)

const selectedPokemon = computed<Pokemon | null>(() => {
  if (activeMode.value === 'pokemon' && selection.value && 'uid' in selection.value) {
    return selection.value as Pokemon
  }
  return null
})

const itemSpriteUrl = computed<string>(() => {
  if (activeMode.value === 'item' && selection.value && 'id' in selection.value) {
    return getAssetUrl(ASSET_TYPES.ITEM, selection.value.id)
  }
  return ''
})

function handleOpenDetail() {
  if (!selectedPokemon.value) return
  const teamIdx = (game.state.team || []).findIndex(p => p?.uid === selectedPokemon.value?.uid)
  if (teamIdx !== -1) {
    ui.openPokemonDetail(selectedPokemon.value, teamIdx, 'team', { source: 'selection' })
    return
  }
  const boxIdx = (game.state.box || []).findIndex(p => p?.uid === selectedPokemon.value?.uid)
  if (boxIdx !== -1) {
    ui.openPokemonDetail(selectedPokemon.value, boxIdx, 'box', { source: 'selection' })
    return
  }
  ui.openPokemonDetail(selectedPokemon.value, -1, 'selection', { source: 'selection' })
}
</script>

<template>
  <div class="market-publish-wizard">
    <div class="publish-header">
      <div class="mode-selector">
        <button 
          :class="{ active: activeMode === 'pokemon' }"
          @click.stop="activeMode = 'pokemon'; selection = null"
        >
          POKÉMON
        </button>
        <button 
          :class="{ active: activeMode === 'item' }"
          @click.stop="activeMode = 'item'; selection = null"
        >
          OBJETOS
        </button>
      </div>
      <p class="limit-info">
        Publicaciones: {{ gtsStore.activeMyListings.length }} / {{ gtsStore.MAX_LISTINGS }}
      </p>
    </div>

    <div
      class="main-split"
      :class="{ 'is-mobile-view': isSmallScreen }"
    >
      <!-- Selector List -->
      <div
        v-if="!isSmallScreen || !selection"
        class="selection-container"
      >
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
              :is-selected="!!(selection && 'uid' in selection && selection.uid === item.pokemon.uid)"
              :total="getPokemonTotalPower(item.pokemon)"
              auto-confirm
              @select="selectItem(item.pokemon)"
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
              :is-selected="!!(selection && 'id' in selection && selection.id === i.id)"
              :gts-stats="gtsStatsMap[i.id]"
              @select="selectItem(i)"
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
          v-if="activeMode === 'pokemon' && totalPokemonPages > 1"
          class="gts-pagination"
        >
          <button 
            class="btn-vicio-secondary btn-vicio-xs prev-page-btn" 
            :disabled="pokemonPage === 1" 
            @click="pokemonPage--"
          >
            ANTERIOR
          </button>
          <span class="page-info">PÁGINA {{ pokemonPage }} DE {{ totalPokemonPages }}</span>
          <button 
            class="btn-vicio-secondary btn-vicio-xs next-page-btn" 
            :disabled="pokemonPage === totalPokemonPages" 
            @click="pokemonPage++"
          >
            SIGUIENTE
          </button>
        </div>

        <div
          v-if="activeMode === 'item' && totalItemPages > 1"
          class="gts-pagination"
        >
          <button 
            class="btn-vicio-secondary btn-vicio-xs prev-page-btn" 
            :disabled="itemPage === 1" 
            @click="itemPage--"
          >
            ANTERIOR
          </button>
          <span class="page-info">PÁGINA {{ itemPage }} DE {{ totalItemPages }}</span>
          <button 
            class="btn-vicio-secondary btn-vicio-xs next-page-btn" 
            :disabled="itemPage === totalItemPages" 
            @click="itemPage++"
          >
            SIGUIENTE
          </button>
        </div>
      </div>

      <!-- Price & Confirm -->
      <div
        v-if="!isSmallScreen || selection"
        class="publish-panel"
      >
        <div
          v-if="selection"
          class="form-container"
        >
          <div class="selected-summary">
            <span class="label">VAS A VENDER:</span>
            
            <!-- Mini tarjeta estilo Caja para Pokémon seleccionado -->
            <div
              v-if="selectedPokemon"
              id="gts-selected-pokemon-preview"
              class="selected-pokemon-card-wrap"
              @click.stop="handleOpenDetail"
            >
              <BoxPokemonCard
                :pokemon="selectedPokemon"
                :index="0"
                :hide-stats="false"
                type-pill-size="ssm"
                class="selected-card-preview"
                @click="handleOpenDetail"
              />
              <span class="card-click-hint">
                <span class="emoji">🔍</span> Click para ver detalles
              </span>
            </div>

            <!-- Preview para Objetos -->
            <div
              v-else-if="activeMode === 'item' && selection"
              class="selected-item-preview"
            >
              <img
                v-if="itemSpriteUrl"
                :src="itemSpriteUrl"
                class="item-icon"
                alt="item"
              >
              <span class="val">{{ selection.name }}</span>
            </div>

            <span
              v-else
              class="val"
            >{{ selection.name }}</span>
          </div>

          <div
            v-if="activeMode === 'item' && selection && 'qty' in selection"
            class="input-group"
          >
            <label>CANTIDAD (MÁX: {{ selection.qty }})</label>
            <input 
              v-model.number="itemQty" 
              type="number" 
              min="1"
              :max="selection.qty"
              class="price-input"
            >
          </div>

          <div class="input-group">
            <label>PRECIO DE VENTA (₱)</label>
            <input 
              id="gts-price-input"
              v-model.number="price" 
              type="number" 
              min="1"
              class="price-input"
            >
          </div>

          <div class="financials">
            <div class="row">
              <span>Comisión GTS (5%):</span>
              <span class="neg">-₱{{ fee.toLocaleString() }}</span>
            </div>
            <div class="row total">
              <span>Tú recibes:</span>
              <span class="pos">₱{{ net.toLocaleString() }}</span>
            </div>
          </div>

          <div class="form-actions">
            <button 
              id="gts-publish-offer-btn"
              v-gsap-hover
              class="btn-vicio-secondary btn-vicio-sm" 
              :disabled="gtsStore.publishing"
              @click.stop="handlePublish"
            >
              {{ gtsStore.publishing ? 'PROCESANDO...' : 'PUBLICAR OFERTA' }}
            </button>

            <button
              v-if="isSmallScreen && selection"
              id="gts-change-selection-btn"
              v-gsap-hover
              class="btn-vicio-neutral btn-vicio-sm back-to-list-btn"
              @click.stop="selection = null"
            >
              <span class="emoji">←</span> CAMBIAR SELECCIÓN
            </button>
          </div>
        </div>
        <div
          v-else
          id="gts-selection-hint"
          class="selection-hint"
        >
          <div class="emoji hint-icon">
            👈
          </div>
          <p>Selecciona un Pokémon u objeto para venderlo en el mercado mundial.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style src="./MarketPublish.styles.scss" lang="scss"></style>

