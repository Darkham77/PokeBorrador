<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGTSStore } from '@/stores/gts'
import type { MarketFilters } from '@/logic/economy/market'

interface Props {
  context: string // 'explore' or 'my-inventory'
}

defineProps<Props>()

const gtsStore = useGTSStore()

const isExpanded = ref(false)

import { POKEMON_TYPES } from '@/data/battle/types'

const _MARKET_TYPE_FILTERS = ['all', ...POKEMON_TYPES] as const
type MarketTypeFilter = (typeof _MARKET_TYPE_FILTERS)[number]

const filters = computed(() => gtsStore.filters)

const types = ['all', ...POKEMON_TYPES] as const satisfies readonly MarketTypeFilter[]

const categories = [
  { value: 'all', label: 'Todo' },
  { value: 'pokeballs', label: 'Pokéballs' },
  { value: 'potions', label: 'Curativos' },
  { value: 'stones', label: 'Piedras' },
  { value: 'combat_held', label: 'Combate' },
  { value: 'breeding_held', label: 'Crianza' },
  { value: 'machinery', label: 'Maquinaria' },
  { value: 'tools', label: 'Herramientas' },
  { value: 'tms', label: 'MTs' },
  { value: 'raw_material', label: 'M. Prima' },
  { value: 'refined_material', label: 'M. Refinado' },
  { value: 'component', label: 'Componente' },
  { value: 'otros', label: 'Otros' }
]

const tiers = ['all', 'S+', 'S', 'A', 'B', 'C', 'D', 'F'] as const

const setFilter = <K extends keyof MarketFilters>(key: K, value: MarketFilters[K]) => {
  gtsStore.filters[key] = value
}

const MARKET_FILTER_PRICE_MAX_LIMIT = 1000000
const MARKET_FILTER_IV_TOTAL_MAX_LIMIT = 186

const resetFilters = () => {
  gtsStore.filters = {
    mode: 'pokemon',
    search: '',
    priceMin: 0,
    priceMax: MARKET_FILTER_PRICE_MAX_LIMIT,
    tier: 'all',
    type: 'all',
    levelMin: 1,
    levelMax: 100,
    ivTotalMin: 0,
    ivTotalMax: MARKET_FILTER_IV_TOTAL_MAX_LIMIT,
    ivAny31: false,
    itemCat: 'all'
  }
}

const getTypeEmoji = (type: string) => {
  const emojis: Record<string, string> = {
    fire: '🔥', water: '💧', grass: '🌿', electric: '⚡', psychic: '🔮',
    normal: '🔘', rock: '🪨', ground: '🏜️', poison: '☣️', bug: '🐛',
    flying: '🦅', ghost: '👻', ice: '❄️', dragon: '🐲', fighting: '🥊',
    dark: '🌑', steel: '⚙️', all: '📂'
  }
  return emojis[type] || '❓'
}
</script>

<template>
  <div class="market-filters">
    <div class="filter-header">
      <div
        id="market-filters-toggle-btn"
        class="toggle-btn"
        @click.stop="isExpanded = !isExpanded"
      >
        <span class="label"><span class="emoji">🔍</span> FILTROS GTS</span>
        <span class="emoji arrow">{{ isExpanded ? '▲' : '▼' }}</span>
      </div>

      <div
        v-if="context === 'explore'"
        class="mode-switch"
      >
        <button
          id="market-filters-mode-pokemon-btn"
          :class="{ active: filters.mode === 'pokemon' }"
          @click.stop="setFilter('mode', 'pokemon')"
        >
          <span class="emoji">⚡</span> Pokes
        </button>
        <button
          id="market-filters-mode-item-btn"
          :class="{ active: filters.mode === 'item' }"
          @click.stop="setFilter('mode', 'item')"
        >
          <span class="emoji">🎒</span> Objetos
        </button>
      </div>
      <span
        v-else
        class="context-label"
      >Filtrando tu inventario</span>
    </div>

    <div class="search-row">
      <input
        id="market-filters-search-input"
        v-model="gtsStore.filters.search"
        type="text"
        :placeholder="filters.mode === 'pokemon' ? 'Buscar Pokémon...' : 'Buscar objetos...'"
        class="search-input"
      >
    </div>

    <div
      v-show="isExpanded"
      class="filter-body"
    >
      <!-- Price Range -->
      <div class="filter-group">
        <div class="group-header">
          <span>Precio <span class="emoji">💰</span></span>
          <span class="range-val">₽{{ filters.priceMin.toLocaleString() }} - ₽{{ filters.priceMax === 1000000 ? 'Máx' : filters.priceMax.toLocaleString() }}</span>
        </div>
        <input
          id="market-filters-price-min-input"
          v-model.number="gtsStore.filters.priceMin"
          type="range"
          min="0"
          max="50000"
          step="500"
          class="range-input"
        >
        <input
          id="market-filters-price-max-input"
          v-model.number="gtsStore.filters.priceMax"
          type="range"
          min="0"
          max="1000000"
          step="1000"
          class="range-input"
        >
      </div>

      <!-- Pokemon Specific -->
      <template v-if="filters.mode === 'pokemon'">
        <div class="filter-group">
          <div class="group-label">
            Tier
          </div>
          <div class="tags-grid">
            <button
              v-for="t in tiers"
              :id="`market-filters-tier-${t}`"
              :key="t"
              class="tag-btn"
              :class="{ active: filters.tier === t }"
              @click.stop="setFilter('tier', t)"
            >
              {{ t === 'all' ? 'X' : t }}
            </button>
          </div>
        </div>

        <div class="filter-group">
          <div class="group-label">
            Tipo
          </div>
          <div class="types-grid">
            <PVTooltip
              v-for="t in types"
              :key="t"
              :title="t.toUpperCase()"
            >
              <button
                :id="`market-filters-type-${t}`"
                class="type-btn"
                :class="{ active: filters.type === t }"
                @click.stop="setFilter('type', t)"
              >
                <span class="emoji">{{ getTypeEmoji(t) }}</span>
              </button>
            </PVTooltip>
          </div>
        </div>
      </template>

      <!-- Item Specific -->
      <template v-else>
        <div class="filter-group">
          <div class="group-label">
            Categoría
          </div>
          <div class="tags-grid">
            <button
              v-for="c in categories"
              :id="`market-filters-cat-${c.value}`"
              :key="c.value"
              class="tag-btn"
              :class="{ active: filters.itemCat === c.value }"
              @click.stop="setFilter('itemCat', c.value)"
            >
              {{ c.label }}
            </button>
          </div>
        </div>
      </template>

      <button
        id="market-filters-reset-btn"
        class="reset-btn"
        @click.stop="resetFilters"
      >
        Limpiar filtros
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/tools" as *;
.market-filters {
  background: Rgba(255, 255, 255, 0.03);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 14px;
  margin: 20px;
  margin-bottom: 16px;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.label {
  @include pixelated;
  font-size: 8px;
  color: var(--blue-light);
}

.arrow {
  color: var(--gray);
  font-size: 12px;
}

.mode-switch {
  display: flex;
  background: Rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  padding: 3px;
  gap: 4px;
}

.mode-switch button {
  padding: 4px 10px;
  font-size: 9px;
  border-radius: 7px;
  border: 1px solid transparent;
  cursor: pointer;
  background: transparent;
  color: var(--gray);
  
}

.mode-switch button.active {
  background: var(--blue);
  color: $white;
  border-color: #000000;
  text-shadow: 1px 1px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000;
}

.context-label {
  font-size: 9px;
  color: var(--gray);
  opacity: 0.6;
}

.search-row {
  margin-bottom: 12px;
}

.search-input {
  width: 100%;
  padding: 10px 14px;
  background: Rgba(0, 0, 0, 0.4);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: $white;
  font-size: 10px;
  outline: none;
  
}

.search-input:focus {
  border-color: var(--blue);
}

.filters-drawer {
  background: Rgba(0, 0, 0, 0.2);
  border: 1px solid Rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.filter-body {
  border-top: 1px solid Rgba(255, 255, 255, 0.06);
  padding-top: 14px;
}

.filter-group {
  margin-bottom: 15px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.group-header {
  font-size: 10px;
  color: var(--yellow);
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
}

.range-input {
  width: 100%;
  accent-color: var(--yellow);
  margin-bottom: 6px;
}

.group-label {
  font-size: 10px;
  color: var(--gray);
  margin-bottom: 8px;
}

.sub-label {
  font-size: 8px;
  color: var(--gray);
}

.tags-grid, .tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-btn {
  padding: 6px 10px;
  border-radius: 12px;
  border: 1px solid Rgba(255, 255, 255, 0.1);
  background: Rgba(255, 255, 255, 0.04);
  color: var(--gray);
  font-size: 8px;
  cursor: pointer;
  text-transform: capitalize;
}

.tag-btn.active {
  border-color: var(--blue);
  background: Rgba(10, 132, 255, 0.2);
  color: $white;
}

.types-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.type-btn {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  border: 1px solid Rgba(255, 255, 255, 0.06);
  background: Rgba(0, 0, 0, 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.type-btn.active {
  border-color: var(--blue);
  background: Rgba(0, 122, 255, 0.2);
}

.reset-btn {
  width: 100%;
  margin-top: 15px;
  padding: 10px;
  border: none;
  color: var(--gray);
  background: Rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  font-size: 11px;
  cursor: pointer;
}
</style>
