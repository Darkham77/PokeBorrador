<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import { useGTSStore } from '@/stores/gts'
import { SHOP_ITEMS } from '@/data/inventory/items'
import PokemonSelectionItem from '../modals/PokemonSelectionItem.vue'
import PokemonSelectionFilters from '../modals/PokemonSelectionFilters.vue'
import SortControls from '@/components/common/SortControls.vue'
import MarketItemCard from './MarketItemCard.vue'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { filterAndSortPokemon, getPokemonTotalPower } from '@/logic/pokemon/pokemonSelectionFilter.ts'

const game = useGameStore()
const gtsStore = useGTSStore()

interface InventoryItem {
  id: string
  name: string
  qty: number
  desc: string
  price: number
  tier: 'common' | 'rare' | 'epic' | 'legend'
}

const activeMode = ref<'pokemon' | 'item'>('pokemon')
const selection = ref<Pokemon | InventoryItem | null>(null)
const price = ref(1000)

// Pokémon Filters
const searchQuery = ref('')
const sortBy = ref('recent')
const sortOrder = ref('desc')
const activeTags = ref<string[]>([])
const filterCompatibleOnly = ref(false)

// Item Filters
const itemSearchQuery = ref('')
const itemSortKey = ref<'name' | 'price' | 'rarity'>('name')
const itemSortOrder = ref<'asc' | 'desc'>('asc')

const availablePokemon = computed(() => {
  const team = (game.state.team || [])
    .filter((p): p is Pokemon => p !== null && !p.onMission && !p.inDaycare && !p.onDefense)
    .map((p, i) => ({ pokemon: p, _source: 'team' as const, index: i }))
  
  const box = (game.state.box || [])
    .filter((p): p is Pokemon => p !== null && !p.onMission && !p.inDaycare && !p.onDefense)
    .map((p, i) => ({ pokemon: p, _source: 'box' as const, index: i }))
    
  return [...team, ...box]
})

const filteredAndSortedPokemon = computed(() => {
  return filterAndSortPokemon(availablePokemon.value, {
    searchQuery: searchQuery.value,
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
    activeTags: activeTags.value
  })
})

const inventory = computed<InventoryItem[]>(() => {
  return Object.entries(game.state.inventory as Record<string, number>)
    .filter(([_name, qty]) => qty > 0)
    .map(([name, qty]) => {
      const dbItem = SHOP_ITEMS.find(i => i.id === name || i.name === name)
      return {
        id: dbItem?.id ?? name.toLowerCase().replace(/\s+/g, '_'),
        name: dbItem?.name ?? name,
        qty,
        desc: dbItem?.desc ?? 'Objeto sin descripción.',
        price: dbItem?.price || 0,
        tier: (dbItem?.tier as 'common' | 'rare' | 'epic' | 'legend') || 'common'
      }
    })
})

// Calculate GTS Pricing stats mapping for active items
const gtsStatsMap = computed(() => {
  const map: Record<string, { min: number; max: number; avg: number }> = {}
  const itemListings = gtsStore.listings.filter(l => l.listing_type === 'item' && l.data)
  
  const grouped: Record<string, number[]> = {}
  for (const listing of itemListings) {
    const nameStr = listing.data.name || listing.data.id
    if (!nameStr) continue
    const itemId = String(nameStr)
    const qty = Number(listing.data.qty) || 1
    const unitPrice = listing.price / qty
    
    if (!grouped[itemId]) {
      grouped[itemId] = []
    }
    grouped[itemId].push(unitPrice)
  }
  
  for (const [itemId, prices] of Object.entries(grouped)) {
    const min = Math.min(...prices)
    const max = Math.max(...prices)
    const avg = prices.reduce((sum, p) => sum + p, 0) / prices.length
    map[itemId] = { min, max, avg }
  }
  
  return map
})

const filteredAndSortedInventory = computed(() => {
  let list = [...inventory.value]

  // Filter
  if (itemSearchQuery.value.trim()) {
    const q = itemSearchQuery.value.toLowerCase().trim()
    list = list.filter(item => item.name.toLowerCase().includes(q))
  }

  // Sort
  list.sort((a, b) => {
    let comparison = 0
    if (itemSortKey.value === 'name') {
      comparison = a.name.localeCompare(b.name)
    } else if (itemSortKey.value === 'price') {
      comparison = (a.price || 0) - (b.price || 0)
    } else if (itemSortKey.value === 'rarity') {
      const tierMap = { common: 0, rare: 1, epic: 2, legend: 3 }
      comparison = (tierMap[a.tier || 'common'] || 0) - (tierMap[b.tier || 'common'] || 0)
    }

    return itemSortOrder.value === 'asc' ? comparison : -comparison
  })

  return list
})

const itemQty = ref(1)

async function handlePublish() {
  if (!selection.value || price.value < 1) return
  
  const publishData = activeMode.value === 'item' && 'qty' in selection.value
    ? { name: selection.value.id, qty: itemQty.value }
    : selection.value
  
  const success = await gtsStore.publishListing(activeMode.value, publishData, price.value)
  if (success) {
    selection.value = null
    price.value = 1000
    itemQty.value = 1
    // Optional: emit event to parent to switch tab
  }
}

function updateSuggestedPrice() {
  if (activeMode.value === 'item' && selection.value && 'qty' in selection.value) {
    const nameStr = selection.value.id
    const shopItem = SHOP_ITEMS.find(i => i.id === nameStr || i.name === nameStr)
    if (shopItem && shopItem.price > 0) {
      price.value = Math.floor(shopItem.price * 0.5) * itemQty.value
    } else {
      price.value = 1000
    }
  } else {
    price.value = 1000
  }
}

watch(itemQty, () => {
  updateSuggestedPrice()
})

function selectItem(item: Pokemon | InventoryItem) {
  selection.value = item
  if ('qty' in item) { 
    itemQty.value = 1 
  }
  updateSuggestedPrice()
}

const fee = computed(() => Math.floor(price.value * gtsStore.MARKET_FEE))
const net = computed(() => price.value - fee.value)
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
        <div
          v-else
          class="market-publish-filters"
        >
          <div class="ps-search-row">
            <span class="ps-search-icon">🔍</span>
            <input
              v-model="itemSearchQuery"
              type="text"
              placeholder="Buscar por nombre..."
              class="ps-search-input"
            >
            <button
              v-if="itemSearchQuery"
              class="ps-clear-search"
              @click.stop="itemSearchQuery = ''"
            >
              ×
            </button>
          </div>
          <SortControls
            v-model="itemSortKey"
            v-model:sort-order="itemSortOrder"
            accent-color="var(--blue)"
          />
        </div>

        <div class="selection-list ps-vertical-list custom-scrollbar">
          <template v-if="activeMode === 'pokemon'">
            <PokemonSelectionItem 
              v-for="item in filteredAndSortedPokemon"
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
              v-for="i in filteredAndSortedInventory"
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
            class="btn-vicio-secondary btn-vicio-sm" 
            :disabled="gtsStore.publishing || gtsStore.activeMyListings.length >= gtsStore.MAX_LISTINGS"
            @click.stop="handlePublish"
          >
            {{ gtsStore.publishing ? 'PROCESANDO...' : 'PUBLICAR OFERTA' }}
          </button>
        </div>
        <div
          v-else
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
}
</style>
