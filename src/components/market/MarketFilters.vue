<script setup>
import { computed } from 'vue'
import { useGTSStore } from '@/stores/gtsStore'
import { ITEM_CATEGORIES, CATEGORY_LABELS } from '@/data/items'

const gtsStore = useGTSStore()
const filters = computed(() => gtsStore.filters)

const TYPES = ['all','fire','water','grass','electric','psychic','normal','rock','ground','poison','bug','flying','ghost','ice', 'dragon', 'fighting', 'dark', 'steel']
const TIERS = ['all','S+','S','A','B','C','D','F']
const ITEM_CATS = ['all', ...ITEM_CATEGORIES]

function setFilter(key, val) {
  gtsStore.filters[key] = val
}

function resetFilters() {
  gtsStore.filters = {
    mode: filters.value.mode,
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
    normal: '🔘', rock: '🪨', ground: '🏜️', poison: '☣️', bug: '🐞',
    flying: '🕊️', ghost: '👻', ice: '❄️', dragon: '🐲', fighting: '🥊',
    dark: '🌙', steel: '⚙️', all: '📂'
  }
  return emojis[type] || '❓'
}
</script>

<template>
  <div class="market-filters-panel">
    <div class="filter-header">
      <div class="search-wrap">
        <input 
          v-model="gtsStore.filters.search" 
          type="text" 
          :placeholder="filters.mode === 'pokemon' ? 'Buscar Pokémon...' : 'Buscar objeto...'"
          class="retro-input"
        >
      </div>
      
      <div class="mode-toggle">
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
    </div>

    <div class="filter-grid">
      <!-- Price Range -->
      <div class="filter-group full-width">
        <div class="group-label">
          <span>Precio 💰</span>
          <span class="val">₽{{ filters.priceMin.toLocaleString() }} - {{ filters.priceMax === 1000000 ? 'Máx' : '₽' + filters.priceMax.toLocaleString() }}</span>
        </div>
        <div class="range-inputs">
          <input 
            v-model.number="gtsStore.filters.priceMax"
            type="range"
            min="0"
            max="1000000" 
            step="1000"
            class="retro-range"
          >
        </div>
      </div>

      <template v-if="filters.mode === 'pokemon'">
        <!-- Tier Filter -->
        <div class="filter-group">
          <div class="group-label">
            Tier
          </div>
          <div class="btn-grid tiers">
            <button 
              v-for="t in TIERS"
              :key="t"
              :class="{ active: filters.tier === t }"
              @click="setFilter('tier', t)"
            >
              {{ t === 'all' ? 'X' : t }}
            </button>
          </div>
        </div>

        <!-- Level Range -->
        <div class="filter-group">
          <div class="group-label">
            Nivel: {{ filters.levelMin }} - {{ filters.levelMax }}
          </div>
          <div class="range-inputs dual">
            <input
              v-model.number="gtsStore.filters.levelMin"
              type="range"
              min="1"
              max="100"
              class="half"
            >
            <input
              v-model.number="gtsStore.filters.levelMax"
              type="range"
              min="1"
              max="100"
              class="half"
            >
          </div>
        </div>

        <!-- Type Filter -->
        <div class="filter-group full-width">
          <div class="group-label">
            Tipo
          </div>
          <div class="btn-grid types">
            <button 
              v-for="t in TYPES"
              :key="t"
              :class="{ active: filters.type === t }"
              :title="t"
              @click="setFilter('type', t)"
            >
              {{ getTypeEmoji(t) }}
            </button>
          </div>
        </div>

        <!-- IVs Checkbox -->
        <div class="filter-group compact">
          <label class="checkbox-label">
            <input
              v-model="gtsStore.filters.ivAny31"
              type="checkbox"
            >
            <span>Algún IV 31 ✨</span>
          </label>
        </div>
      </template>

      <template v-else>
        <!-- Item Categories -->
        <div class="filter-group full-width">
          <div class="group-label">
            Categoría
          </div>
          <div class="btn-grid categories">
            <button 
              v-for="c in ITEM_CATS"
              :key="c"
              :class="{ active: filters.itemCat === c }"
              @click="setFilter('itemCat', c)"
            >
              {{ c === 'all' ? 'Todo' : (CATEGORY_LABELS[c] || c) }}
            </button>
          </div>
        </div>
      </template>
    </div>

    <button
      class="reset-btn"
      @click="resetFilters"
    >
      LIMPIAR FILTROS
    </button>
  </div>
</template>

<style scoped lang="scss">
.market-filters-panel {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 16px;
  margin-bottom: 20px;
}

.filter-header {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  align-items: center;

  .search-wrap {
    flex: 1;
  }
}

.retro-input {
  width: 100%;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #fff;
  font-size: 13px;
  outline: none;
  &:focus { border-color: #a855f7; }
}

.mode-toggle {
  display: flex;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px;
  border-radius: 10px;
  gap: 4px;

  button {
    padding: 6px 12px;
    border: none;
    background: transparent;
    color: #64748b;
    font-size: 10px;
    font-weight: bold;
    cursor: pointer;
    border-radius: 7px;
    transition: all 0.2s;

    &.active {
      background: #a855f7;
      color: #fff;
    }
  }
}

.filter-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.filter-group {
  &.full-width { grid-column: span 2; }
  
  .group-label {
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #94a3b8;
    margin-bottom: 8px;
    font-weight: bold;
    text-transform: uppercase;
    
    .val { color: #ffd700; }
  }
}

.range-inputs {
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  &.dual { flex-direction: row; }
  
  .half { width: 50%; }
}

.btn-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  button {
    padding: 6px 10px;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.04);
    color: #94a3b8;
    font-size: 9px;
    cursor: pointer;
    transition: all 0.2s;

    &:hover { background: rgba(255, 255, 255, 0.08); }
    &.active {
      border-color: #a855f7;
      background: rgba(168, 85, 247, 0.2);
      color: #fff;
    }
  }

  &.types button {
    width: 34px;
    height: 34px;
    padding: 0;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  color: #fff;
  cursor: pointer;
  
  input { accent-color: #a855f7; }
}

.reset-btn {
  width: 100%;
  margin-top: 16px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  color: #64748b;
  font-size: 9px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover { color: #fff; background: rgba(255, 255, 255, 0.08); }
}

.retro-range {
  width: 100%;
  accent-color: #ffd700;
  cursor: pointer;
}
</style>
