<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { useGTSStore } from '@/stores/gts'
import PokemonSelectionItem from '../modals/PokemonSelectionItem.vue'
import PokemonSelectionFilters from '@/components/modals/PokemonSelectionFilters.vue'
import MarketItemFilters from './MarketItemFilters.vue'
import MarketItemCard from './MarketItemCard.vue'
import { getPokemonTotalPower } from '@/logic/pokemon/pokemonSelectionFilter.ts'

import { GTS_ITEMS_PER_PAGE } from '@/logic/economy/market'
import type { SortOrder, ItemSortKey } from '@/types/system/game'

const game = useGameStore()
const gtsStore = useGTSStore()

const activeMode = ref<'pokemon' | 'item'>('pokemon')

// Pokémon Filters
const searchQuery = ref('')
const sortBy = ref('recent')
const sortOrder = ref('desc')
const activeTags = ref<string[]>([])
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

    <div class="main-split">
      <!-- Selector List -->
      <div class="selection-container">
        <!-- Pokémon Filters -->
        <PokemonSelectionFilters
          v-if="activeMode === 'pokemon'"
          v-model:search-query="searchQuery"
          v-model:sort-by="sortBy"
          v-model:sort-order="sortOrder"
          v-model:active-tags="activeTags"
          v-model:filter-compatible-only="filterCompatibleOnly"
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
      <div class="publish-panel">
        <div
          v-if="selection"
          class="form-container"
        >
          <div class="selected-summary">
            <span class="label">VAS A VENDER:</span>
            <span class="val">{{ selection.name }}</span>
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


          <button 
            id="gts-publish-offer-btn"
            class="btn-vicio-secondary btn-vicio-sm" 
            :disabled="gtsStore.publishing"
            @click.stop="handlePublish"
          >
            {{ gtsStore.publishing ? 'PROCESANDO...' : 'PUBLICAR OFERTA' }}
          </button>
        </div>
        <div
          v-else
          id="gts-selection-hint"
          class="selection-hint"
        >
          <div class="hint-icon">
            👈
          </div>
          <p>Selecciona un Pokémon u objeto para venderlo en el mercado mundial.</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss">
@use "@/styles/components/pokemon-selection";
</style>

<style lang="scss">
@use "@/styles/core/_mixins" as *;

.market-publish-wizard {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 0 20px 20px 0;

  .publish-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    .limit-info {
      font-size: 10px;
      color: $muted;
      font-weight: bold;
    }
  }

  .mode-selector {
    display: flex;
    background: Rgba(0, 0, 0, 0.3);
    padding: 4px;
    border-radius: 12px;
    gap: 4px;

    button {
      padding: 8px 16px;
      border: 1px solid transparent;
      background: transparent;
      color: $muted;
      @include pixelated;
      font-size: 8px;
      cursor: pointer;
      border-radius: 10px;

      &.active {
        background: Rgba(56, 189, 248, 1);
        color: $white;
        border-color: #000000;
        text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
        box-shadow: 0 0 15px Rgba(56, 189, 248, 0.3);
      }
    }
  }

  .main-split {
    flex: 1;
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 20px;
    min-height: 0;

    @include responsive(950px) {
      grid-template-columns: 1fr;
      overflow-y: auto;
      gap: 32px;
    }
  }

  .selection-container {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0; // Allow shrinking
    background: Rgba(0, 0, 0, 0.15);
    border-radius: 20px;
    border: 1px solid Rgba(255, 255, 255, 0.05);
    overflow: hidden;
  }

  .selection-list {
    flex: 1;
    padding: 12px 10px;
    overflow-x: auto; // Add horizontal scroll if cards are too wide
    overflow-y: auto;
    
    // Ensure horizontal scrollbar is visible if needed
    &::-webkit-scrollbar:horizontal {
      height: 6px;
    }
  }

  .publish-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow-y: auto;
    min-height: 0;
    padding-right: 6px;
  }

  .i-icon { font-size: 24px; }

  .publish-panel {
    background: Rgba(255, 255, 255, 0.02);
    border-radius: 24px;
    border: 1px solid Rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }


  .selection-hint {
    text-align: center;
    color: $muted;
    .hint-icon { font-size: 40px; margin-bottom: 15px; opacity: 0.2; }
    p { font-size: 13px; max-width: 200px; line-height: 1.6; }
  }

  .form-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 25px;
  }

  .selected-summary {
    text-align: center;
    .label { display: block; font-size: 9px; color: $muted; margin-bottom: 5px; }
    .val { font-size: 18px; font-weight: 900; color: var(--white); text-transform: uppercase; }
  }

  .input-group {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    width: 100% !important;

    label {
      display: block !important;
      font-size: 9px;
      @include pixelated;
      color: Rgba(56, 189, 248, 1);
      margin-bottom: 12px !important;
      text-align: center !important;
    }

    .price-input {
      width: 100% !important;
      background: var(--black);
      border: 2px solid Rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 16px;
      color: $coin-gold;
      @include pixelated;
      font-size: 16px;
      text-align: center;
      outline: none;
      box-sizing: border-box;

      /* Hide standard HTML5 up/down spin buttons */
      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        appearance: none;
        margin: 0;
      }
      &[type=number] {
        -moz-appearance: textfield;
        appearance: textfield;
      }

      &:focus { border-color: Rgba(255, 215, 0, 0.27); }
    }
  }

  .financials {
    background: Rgba(0, 0, 0, 0.2);
    border-radius: 16px;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      color: Rgba(148, 163, 184, 1);
      gap: 12px;

      span {
        white-space: nowrap;
      }

      &.total {
         border-top: 1px solid Rgba(255, 255, 255, 0.05);
         padding-top: 10px;
         margin-top: 5px;
         font-weight: bold;
         font-size: 13px;
         color: var(--white);
      }
      .neg { color: Rgba(248, 113, 113, 1); }
      .pos { color: Rgba(34, 197, 94, 1); }
    }
  }


  .empty-list { text-align: center; padding: 40px; color: $muted; font-size: 12px; }

  .market-publish-filters {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 20px;
    margin-bottom: 6px;
    
    .ps-search-row {
      flex: 1;
      margin-bottom: 0;
    }
  }

  .gts-pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    margin-top: 15px;
    padding: 10px 0;
    border-top: 1px solid Rgba(255, 255, 255, 0.05);
    @include pixelated;
    font-size: 10px;

    .page-info {
      color: var(--yellow);
    }
  }
}
</style>
