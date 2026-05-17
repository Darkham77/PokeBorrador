<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGTSStore } from '@/stores/gts'
import type { MarketFilters } from '@/logic/market'

interface Props {
  context: string // 'explore' or 'my-inventory'
}

defineProps<Props>()

const gtsStore = useGTSStore()

const isExpanded = ref(false)

const filters = computed(() => gtsStore.filters)

const types = [
  'all', 'fire', 'water', 'grass', 'electric', 'psychic', 'normal', 
  'rock', 'ground', 'poison', 'bug', 'flying', 'ghost', 'ice', 
  'dragon', 'fighting', 'dark', 'steel'
]

const categories = [
  'all', 'pokeballs', 'pociones', 'stones', 'held', 'booster', 'especial'
]

const tiers = ['all', 'S+', 'S', 'A', 'B', 'C', 'D', 'F']

const setFilter = <K extends keyof MarketFilters>(key: K, value: MarketFilters[K]) => {
  gtsStore.filters[key] = value
}

const resetFilters = () => {
  gtsStore.filters = {
    mode: 'pokemon',
    search: '',
    priceMin: 0,
    priceMax: 1000000,
    tier: 'all',
    type: 'all',
    levelMin: 1,
    levelMax: 100,
    ivTotalMin: 0,
    ivTotalMax: 186,
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
        class="toggle-btn"
        @click.stop="isExpanded = !isExpanded"
      >
        <span class="label">🔍 FILTROS GTS</span>
        <span class="arrow">{{ isExpanded ? '▲' : '▼' }}</span>
      </div>

      <div
        v-if="context === 'explore'"
        class="mode-switch"
      >
        <button
          :class="{ active: filters.mode === 'pokemon' }"
          @click.stop="setFilter('mode', 'pokemon')"
        >
          ⚡ Pokes
        </button>
        <button
          :class="{ active: filters.mode === 'item' }"
          @click.stop="setFilter('mode', 'item')"
        >
          🎒 Objetos
        </button>
      </div>
      <span
        v-else
        class="context-label"
      >Filtrando tu inventario</span>
    </div>

    <div class="search-row">
      <input
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
          <span>Precio 💰</span>
          <span class="range-val">₽{{ filters.priceMin.toLocaleString() }} - ₽{{ filters.priceMax === 1000000 ? 'Máx' : filters.priceMax.toLocaleString() }}</span>
        </div>
        <input
          v-model.number="gtsStore.filters.priceMin"
          type="range"
          min="0"
          max="50000"
          step="500"
          class="range-input"
        >
        <input
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
                class="type-btn"
                :class="{ active: filters.type === t }"
                @click.stop="setFilter('type', t)"
              >
                {{ getTypeEmoji(t) }}
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
              :key="c"
              class="tag-btn"
              :class="{ active: filters.itemCat === c }"
              @click.stop="setFilter('itemCat', c)"
            >
              {{ c === 'all' ? 'Todo' : c }}
            </button>
          </div>
        </div>
      </template>

      <button
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
  border: none;
  cursor: pointer;
  background: transparent;
  color: var(--gray);
  transition: all 0.2s;
}

.mode-switch button.active {
  background: var(--blue);
  color: $white;
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
  transition: border-color 0.2s;
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
