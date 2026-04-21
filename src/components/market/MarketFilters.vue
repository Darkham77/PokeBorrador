<script setup>
import { computed, ref } from 'vue'
import { useGTSStore } from '@/stores/gts'

defineProps({
  context: {
    type: String,
    required: true // 'explore' or 'my-inventory'
  }
})

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

const setFilter = (key, value) => {
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

const getTypeEmoji = (type) => {
  const emojis = {
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
        @click="isExpanded = !isExpanded"
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
          @click="setFilter('mode', 'pokemon')"
        >
          🐾 Pokes
        </button>
        <button
          :class="{ active: filters.mode === 'item' }"
          @click="setFilter('mode', 'item')"
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
              @click="setFilter('tier', t)"
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
            <button
              v-for="t in types"
              :key="t"
              class="type-btn"
              :class="{ active: filters.type === t }"
              :title="t"
              @click="setFilter('type', t)"
            >
              {{ getTypeEmoji(t) }}
            </button>
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
              @click="setFilter('itemCat', c)"
            >
              {{ c === 'all' ? 'Todo' : c }}
            </button>
          </div>
        </div>
      </template>

      <button
        class="reset-btn"
        @click="resetFilters"
      >
        Limpiar filtros
      </button>
    </div>
  </div>
</template>

<style scoped>
.market-filters {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 14px;
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
  font-family: 'Press Start 2P', monospace;
  font-size: 8px;
  color: var(--purple-light);
}

.arrow {
  color: var(--gray);
  font-size: 12px;
}

.mode-switch {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
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
  background: var(--purple);
  color: #fff;
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
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: #fff;
  font-size: 13px;
  outline: none;
}

.filter-body {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 14px;
}

.filter-group {
  margin-bottom: 15px;
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

.tags-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-btn {
  padding: 6px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: var(--gray);
  font-size: 8px;
  cursor: pointer;
  text-transform: capitalize;
}

.tag-btn.active {
  border-color: var(--purple);
  background: rgba(191, 90, 242, 0.2);
  color: #fff;
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
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

.type-btn.active {
  border-color: var(--blue);
  background: rgba(0, 122, 255, 0.2);
}

.reset-btn {
  width: 100%;
  margin-top: 15px;
  padding: 10px;
  border: none;
  color: var(--gray);
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  font-size: 11px;
  cursor: pointer;
}
</style>
